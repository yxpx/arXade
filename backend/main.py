"""
arXade Backend API

A FastAPI-based backend service for arXiv paper discovery using vector embeddings
and AI-powered suggestions. Designed for deployment on Google Cloud Run.

Features:
- Vector similarity search using MongoDB Atlas
- AI-powered summaries using Google Gemini
- Deep research analysis capabilities
- Optimized for serverless deployment

Author: arXade Team
"""

from fastapi import FastAPI, HTTPException, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import pymongo
from pymongo.mongo_client import MongoClient
import google.generativeai as genai
import numpy as np
from dotenv import load_dotenv
import os
import logging
import time
from pathlib import Path

# ============================================================================
# CONFIGURATION AND LOGGING SETUP
# ============================================================================

# Configure structured logging for Cloud Run
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "service": "arxade-backend", "message": "%(message)s"}',
    datefmt='%Y-%m-%dT%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Load environment variables - support both local .env and Cloud Run environment
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    logger.info("Loaded environment variables from .env file")
else:
    logger.info("Using Cloud Run environment variables")

# ============================================================================
# ENVIRONMENT VARIABLES AND CONFIGURATION
# ============================================================================

# MongoDB Atlas configuration
MONGODB_URI = os.environ.get("MONGODB_URI")
DB_NAME = os.environ.get("MONGODB_DB_NAME", "mydb")
COLLECTION_NAME = os.environ.get("MONGODB_COLLECTION", "col1")

# Google Gemini API configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# API protection key (generate a random one for production)
API_KEY = os.environ.get("API_KEY", "dev-key-change-in-production")

# Validate required environment variables
if not MONGODB_URI:
    logger.error("MONGODB_URI environment variable is required")
    raise ValueError("MONGODB_URI environment variable is required")

if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY environment variable is required")
    raise ValueError("GEMINI_API_KEY environment variable is required")

if not API_KEY or API_KEY == "dev-key-change-in-production":
    logger.warning("Using default API_KEY - change this in production!")

# Configure Gemini API
genai.configure(api_key=GEMINI_API_KEY)

# Embedding model configuration for arXiv papers
EMBEDDING_MODEL = 'models/text-embedding-004'
EMBEDDING_TASK_QUERY = "RETRIEVAL_QUERY"

# ============================================================================
# DATABASE CONNECTION WITH RETRY LOGIC
# ============================================================================

def create_mongodb_client():
    """
    Create MongoDB client with proper error handling and connection pooling
    optimized for Cloud Run's stateless nature.
    """
    try:
        # Configure MongoDB client for Cloud Run deployment
        mongo_client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=10000,         # 10 second connection timeout
            maxPoolSize=10,                 # Connection pool size
            retryWrites=True,               # Enable retry writes
            w="majority"                    # Write concern for consistency
        )
        
        # Test the connection
        mongo_client.admin.command('ping')
        logger.info("Successfully connected to MongoDB Atlas")
        return mongo_client
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

# Initialize MongoDB client and database references
mongo_client = create_mongodb_client()
db = mongo_client[DB_NAME]
collection = db[COLLECTION_NAME]

# ============================================================================
# FASTAPI APPLICATION SETUP
# ============================================================================

# Initialize FastAPI with proper metadata for Cloud Run
app = FastAPI(
    title="arXade API",
    description="AI-powered arXiv paper discovery and analysis service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ============================================================================
# MIDDLEWARE CONFIGURATION FOR CLOUD RUN
# ============================================================================

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure specific origins in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Security middleware for Cloud Run
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure specific hosts in production
)

# ============================================================================
# PYDANTIC MODELS FOR REQUEST/RESPONSE VALIDATION
# ============================================================================

class SearchQuery(BaseModel):
    """Model for paper search requests"""
    query: str = Field(..., min_length=1, max_length=500, description="Search query for arXiv papers")
    limit: int = Field(default=50, ge=1, le=100, description="Maximum number of results to return")

class SummaryRequest(BaseModel):
    """Model for AI summary generation requests"""
    query: str = Field(..., min_length=1, max_length=500, description="Topic for summary generation")
    papers: Optional[List[Dict[str, Any]]] = Field(default=None, description="Optional list of papers for context")

class HealthResponse(BaseModel):
    """Model for health check response"""
    status: str
    timestamp: str
    version: str

# ============================================================================
# AUTHENTICATION AND SECURITY
# ============================================================================

async def verify_api_key(x_api_key: str = Header(alias="X-API-Key")):
    """
    Verify API key from request headers for basic authentication.
    
    Args:
        x_api_key: API key from X-API-Key header
        
    Raises:
        HTTPException: If API key is missing or invalid
        
    Returns:
        str: The validated API key
    """
    if not x_api_key:
        logger.warning("API request without API key")
        raise HTTPException(
            status_code=401, 
            detail="API key required. Please include X-API-Key header."
        )
    
    if x_api_key != API_KEY:
        logger.warning(f"Invalid API key attempt: {x_api_key[:10]}...")
        raise HTTPException(
            status_code=401, 
            detail="Invalid API key."
        )
    
    return x_api_key

# ============================================================================
# UTILITY FUNCTIONS FOR EMBEDDINGS
# ============================================================================

def create_int8_embedding(float_embedding: List[float]) -> List[int]:
    """
    Quantizes a float embedding vector to int8 for efficient storage in MongoDB.
    
    Args:
        float_embedding: List of float values from Gemini embedding model
        
    Returns:
        List of int8 values suitable for MongoDB vector search
    """
    clamped_embedding = np.clip(np.array(float_embedding), -1.0, 1.0)
    quantized = np.round(clamped_embedding * 127.0).astype(np.int8).tolist()
    return quantized

def get_query_embedding(query_text: str) -> Optional[List[int]]:
    """
    Generates an int8 embedding for a given query text using Google Gemini.
    
    Args:
        query_text: The search query to embed
        
    Returns:
        List of int8 embedding values or None if generation fails
    """
    try:
        response = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=query_text,
            task_type=EMBEDDING_TASK_QUERY
        )
        embedding_float = response["embedding"]
        embedding_int8 = create_int8_embedding(embedding_float)
        logger.info(f"Generated embedding for query: {query_text[:50]}...")
        return embedding_int8
    except Exception as e:
        logger.error(f"Error generating embedding for query '{query_text}': {e}")
        return None

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint for basic API information"""
    return {
        "message": "Welcome to arXade API",
        "service": "arXiv Paper Discovery Service",
        "version": "1.0.0"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint for Cloud Run monitoring and load balancing.
    Tests database connectivity and service status.
    """
    try:
        # Test MongoDB connection
        mongo_client.admin.command('ping')
        
        return HealthResponse(
            status="healthy",
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            version="1.0.0"
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@app.post("/search")
async def search_papers(
    search_query: SearchQuery, 
    request: Request,
    api_key: str = Depends(verify_api_key)
):
    """
    Search for arXiv papers using vector similarity search.
    
    This endpoint:
    1. Generates embeddings for the search query using Gemini
    2. Performs vector search against MongoDB Atlas vector index
    3. Returns ranked results with metadata and similarity scores
    
    Args:
        search_query: SearchQuery model containing query and limit
        
    Returns:
        List of paper documents with similarity scores
    """
    start_time = time.time()
    logger.info(f"Search request from {request.client.host}: '{search_query.query}' (limit: {search_query.limit})")
    
    try:
        # Validate MongoDB connection
        try:
            mongo_client.admin.command('ping')
        except Exception as mongo_error:
            logger.error(f"MongoDB connection error: {mongo_error}")
            raise HTTPException(
                status_code=503, 
                detail="Database temporarily unavailable. Please try again shortly."
            )
        
        # Generate vector embedding for the search query
        query_embedding = get_query_embedding(search_query.query)
        
        if not query_embedding:
            logger.error(f"Failed to generate embedding for query: {search_query.query}")
            raise HTTPException(
                status_code=500, 
                detail="Failed to process search query. Please try again."
            )
        
        # Define priority categories for arXiv CS papers
        priority_categories = ["cs.cv", "cs.lg", "cs.cl", "cs.ai", "cs.ne", "cs.ro"]
        
        # MongoDB aggregation pipeline for vector search with categorization
        pipeline = [
            {
                # Vector similarity search using MongoDB Atlas Search
                '$vectorSearch': {
                    'index': 'vector_index', 
                    'path': 'embedding_int8', 
                    'queryVector': query_embedding, 
                    'numCandidates': min(500, search_query.limit * 10),  # Optimize candidates
                    'limit': search_query.limit
                }
            },
            {
                # Normalize categories to array format
                '$addFields': {
                    'categoryArray': {
                        '$cond': {
                            'if': {'$isArray': '$categories'},
                            'then': '$categories',
                            'else': [{'$toString': '$categories'}]
                        }
                    }
                }
            },
            {
                # Determine primary category based on priority order
                '$addFields': {
                    'primary_category': {
                        '$let': {
                            'vars': {
                                'matchedCategories': {
                                    '$filter': {
                                        'input': priority_categories,
                                        'as': 'priority',
                                        'cond': {
                                            '$in': ['$$priority', '$categoryArray']
                                        }
                                    }
                                }
                            },
                            'in': {
                                '$cond': {
                                    'if': {'$gt': [{'$size': '$$matchedCategories'}, 0]},
                                    'then': {'$arrayElemAt': ['$$matchedCategories', 0]},
                                    'else': {'$arrayElemAt': ['$categoryArray', 0]}
                                }
                            }
                        }
                    }
                }
            },
            {
                # Project final result fields
                '$project': {
                    '_id': 0, 
                    'id': 1, 
                    'title': 1, 
                    'abstract': 1, 
                    'authors': 1,
                    'date': '$update_date',
                    'categories': '$categoryArray',
                    'primary_category': 1,
                    'arxiv_id': '$id',
                    'pdf_url': {'$concat': ['https://arxiv.org/pdf/', '$id', '.pdf']},
                    'score': {'$meta': 'vectorSearchScore'}
                }
            }
        ]
        
        # Execute the search pipeline
        logger.info("Executing MongoDB vector search aggregation")
        results = list(collection.aggregate(pipeline))
        
        # Log search performance metrics
        execution_time = time.time() - start_time
        logger.info(f"Search completed: {len(results)} papers found in {execution_time:.2f}s")
        
        return results
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in search_papers: {e}")
        raise HTTPException(
            status_code=500, 
            detail="An unexpected error occurred. Please try again later."
        )

@app.post("/gemini-summary")
async def get_gemini_summary(
    request: SummaryRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Generate AI-powered summary using Google Gemini 2.0 Flash.
    
    This endpoint creates contextual summaries about research topics,
    optionally using provided papers as additional context.
    
    Args:
        request: SummaryRequest containing query and optional papers
        
    Returns:
        Dictionary containing the generated summary
    """
    start_time = time.time()
    logger.info(f"Summary generation request for: {request.query}")
    
    try:
        # Prepare paper context if provided
        papers_context = ""
        if request.papers:
            top_papers = request.papers[:10]  # Use top 10 for context
            papers_context = "Here are the top relevant papers:\n\n"
            
            for i, paper in enumerate(top_papers, 1):
                title = paper.get("title", "Untitled")
                abstract = paper.get("abstract", "No abstract available")
                
                # Limit abstract length for efficient token usage
                if abstract and len(abstract) > 300:
                    abstract = abstract[:300] + "..."
                    
                papers_context += f"Paper {i}: {title}\nAbstract: {abstract}\n\n"
            
            logger.info(f"Using {len(top_papers)} papers as context for summary")
        
        # Import Gemini client
        from google import genai
        from google.genai import types
        
        # Initialize Gemini client
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        
        # Craft comprehensive prompt for academic summary
        prompt = f"""You are an AI research assistant helping users understand academic topics.

Topic: {request.query}

{papers_context if papers_context else ""}

Based on the query and the papers above (if available), provide a concise but complete summary about {request.query} in 1-2 well-structured paragraphs.
Cover the core concepts, key developments, and important applications.

Format your response as plain text with no markdown formatting:
- Do NOT use **bold** or *italics*
- Use standard LaTeX notation for mathematical formulas (e.g., $E=mc^2$ or $\\nabla \\cdot \\vec{{F}} = 0$)
- Write in flowing paragraphs without special formatting
- Mathematical expressions should flow inline with the text

Write a complete summary that ends naturally without being cut off. Keep it concise but comprehensive. Use academic but accessible language.
"""
        
        # Prepare content for Gemini API
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)],
            ),
        ]
        
        # Configure generation parameters optimized for summaries
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="text/plain",
            max_output_tokens=800,  # Sufficient for 1-2 complete paragraphs
            temperature=0.3,         # Lower temperature for more focused summaries
        )
        
        # Generate summary using Gemini 2.0 Flash
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=generate_content_config,
        )
        
        # Process and return response
        if response and hasattr(response, 'text'):
            summary = response.text.strip()
            execution_time = time.time() - start_time
            logger.info(f"Summary generated successfully in {execution_time:.2f}s")
            return {"summary": summary}
        else:
            logger.error("No valid response from Gemini API")
            return {
                "summary": f"We couldn't generate a summary for '{request.query}' at this time. Please try again later."
            }
            
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(f"Error in summary generation after {execution_time:.2f}s: {e}")
        return {
            "summary": f"We couldn't generate a summary for '{request.query}' at this time. Please try again later.",
            "error": str(e)
        }

@app.post("/deep-research")
async def get_deep_research(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """
    Generate comprehensive deep research analysis using Google Gemini.
    
    This endpoint provides extensive academic analysis including paper summaries,
    theoretical foundations, technical deep dives, and future research directions.
    
    Args:
        request: Dictionary containing query, context, and instructions
        
    Returns:
        Dictionary containing the comprehensive analysis
    """
    start_time = time.time()
    query = request.get("query", "")
    context = request.get("context", "")
    instructions = request.get("instructions", "")
    
    logger.info(f"Deep research analysis request for: {query}")
    
    try:
        # Import Gemini client
        from google import genai
        from google.genai import types
        
        # Initialize Gemini client
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        
        # Create comprehensive research prompt
        prompt = f"""You are an expert AI research analyst. {instructions}

Query: {query}

Research Papers Context:
{context}

Please provide a comprehensive, well-structured analysis following this format:

## Paper Summaries
First, provide a concise summary of the key points, abstracts, and conclusions for each of the top 10 papers provided in the context. For each paper, include:
- Main contribution/findings
- Key methodology or approach
- Important conclusions or implications
- Notable technical details

## Comprehensive Research Analysis

Provide an extensive original analysis that goes beyond summarizing the papers. This should be the largest section and include:

### Theoretical Foundations
- Explain the underlying theoretical principles and mathematical frameworks
- Discuss how current work builds upon or challenges existing theories
- Provide original insights into the conceptual landscape

### Technical Deep Dive
- Analyze methodological innovations and their implications
- Compare and contrast different approaches with technical detail
- Identify patterns, trends, and gaps in current research methodologies
- Discuss computational complexity, scalability, and practical considerations

### Cross-Paper Synthesis
- Draw connections between different research directions
- Identify emerging themes and research trajectories
- Discuss conflicting findings and potential reconciliations
- Highlight synergies between different approaches

### Future Research Directions
- Propose novel research questions based on current limitations
- Suggest potential methodological improvements
- Identify promising interdisciplinary connections
- Discuss real-world applications and implementation challenges

### Critical Assessment
- Evaluate the strengths and limitations of current approaches
- Discuss reproducibility and validation concerns
- Assess the broader impact on the field
- Provide balanced perspectives on controversial aspects

Make this analysis substantial, original, and demonstrate deep expertise in the field. Use mathematical notation where appropriate and provide detailed technical explanations."""
        
        # Prepare content for Gemini API
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)],
            ),
        ]
        
        # Configure generation for comprehensive analysis
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="text/plain",
            max_output_tokens=20000,  # Large token limit for comprehensive analysis
            temperature=0.4,          # Slightly higher for more creative insights
        )
        
        # Generate deep research analysis
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=generate_content_config,
        )
        
        # Process and return response
        if response and hasattr(response, 'text'):
            analysis = response.text.strip()
            execution_time = time.time() - start_time
            logger.info(f"Deep research analysis completed in {execution_time:.2f}s")
            return {"analysis": analysis}
        else:
            logger.error("No response from Gemini API for deep research")
            return {"error": "Failed to generate analysis"}
            
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(f"Error in deep research analysis after {execution_time:.2f}s: {e}")
        return {"error": str(e)}

# ============================================================================
# APPLICATION STARTUP AND SHUTDOWN EVENTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize services and log startup information"""
    logger.info("arXade Backend API starting up...")
    logger.info(f"Connected to MongoDB database: {DB_NAME}")
    logger.info(f"Using collection: {COLLECTION_NAME}")
    logger.info("Startup completed successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    logger.info("arXade Backend API shutting down...")
    try:
        mongo_client.close()
        logger.info("MongoDB connection closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")
    logger.info("Shutdown completed")

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting arXade API server in development mode")
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=int(os.environ.get("PORT", 8000)),  # Use Cloud Run PORT env var
        reload=True,
        log_level="info"
    )