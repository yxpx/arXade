from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pymongo
from pymongo.mongo_client import MongoClient
import google.generativeai as genai
import numpy as np
from dotenv import load_dotenv
import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# MongoDB configuration
MONGODB_URI = os.environ["MONGODB_URI"]
DB_NAME = os.environ.get("MONGODB_DB_NAME", "mydb")
COLLECTION_NAME = os.environ.get("MONGODB_COLLECTION", "col1")

# Gemini API configuration
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
genai.configure(api_key=GEMINI_API_KEY)

# Embedding model configuration
EMBEDDING_MODEL = 'models/text-embedding-004'
EMBEDDING_TASK_QUERY = "RETRIEVAL_QUERY"

# Initialize MongoDB client
try:
    mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    # Ping the server to verify connection
    mongo_client.admin.command('ping')
    logger.info("Successfully connected to MongoDB")
    db = mongo_client[DB_NAME]
    collection = db[COLLECTION_NAME]
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    # We'll continue and handle connection failures in the endpoints

app = FastAPI(title="arXade API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchQuery(BaseModel):
    query: str
    limit: int = 50

class SummaryRequest(BaseModel):
    query: str
    papers: Optional[List[Dict[str, Any]]] = None

def create_int8_embedding(float_embedding: List[float]) -> List[int]:
    """Quantizes a float embedding vector to int8."""
    clamped_embedding = np.clip(np.array(float_embedding), -1.0, 1.0)
    quantized = np.round(clamped_embedding * 127.0).astype(np.int8).tolist()
    return quantized

def get_query_embedding(query_text: str) -> list[int] | None:
    """
    Generates an int8 embedding for a given query text using Gemini.
    """
    try:
        response = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=query_text,
            task_type=EMBEDDING_TASK_QUERY
        )
        embedding_float = response["embedding"]
        embedding_int8 = create_int8_embedding(embedding_float)
        return embedding_int8
    except Exception as e:
        logger.error(f"Error generating embedding for query '{query_text}': {e}")
        return None

@app.get("/")
async def root():
    return {"message": "Welcome to arXade API"}

@app.post("/search")
async def search_papers(search_query: SearchQuery):
    try:
        logger.info(f"Searching for: {search_query.query} with limit {search_query.limit}")
        
        # Check MongoDB connection
        try:
            mongo_client.admin.command('ping')
        except Exception as mongo_error:
            logger.error(f"MongoDB connection error: {mongo_error}")
            raise HTTPException(status_code=500, detail="Database connection error. Please try again later.")
        
        # Generate vector embedding for the query
        query_embedding = get_query_embedding(search_query.query)
        
        if not query_embedding:
            logger.error(f"Failed to generate embedding for query: {search_query.query}")
            raise HTTPException(status_code=500, detail="Failed to generate embedding for search query")
        
        # Priority order of categories
        priority_categories = ["cs.cv", "cs.lg", "cs.cl", "cs.ai", "cs.ne", "cs.ro"]
        
        # Create vector search pipeline
        pipeline = [
            {
                '$vectorSearch': {
                    'index': 'vector_index', 
                    'path': 'embedding_int8', 
                    'queryVector': query_embedding, 
                    'numCandidates': 500, 
                    'limit': search_query.limit
                }
            },
            {
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
                    'pdf_url': { '$concat': ['https://arxiv.org/pdf/', '$id', '.pdf'] },
                    'score': { '$meta': 'vectorSearchScore' }
                }
            }
        ]
        
        # Execute the pipeline
        logger.info("Executing MongoDB aggregation pipeline")
        results = list(collection.aggregate(pipeline))
        logger.info(f"Found {len(results)} papers matching the query")
        
        return results
    except Exception as e:
        logger.error(f"Error in search_papers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/gemini-summary")
async def get_gemini_summary(request: SummaryRequest):
    try:
        logger.info(f"Generating summary for query: {request.query}")
        
        # Use the provided papers or take the first 10 if more are provided
        top_papers = []
        if request.papers:
            # Take the top 10 papers from the provided list (they're already ranked by relevance)
            top_papers = request.papers[:10]
            logger.info(f"Using {len(top_papers)} provided papers for summary context")
        
        # Create a context from the top papers
        papers_context = ""
        if top_papers:
            papers_context = "Here are the top relevant papers:\n\n"
            for i, paper in enumerate(top_papers, 1):
                title = paper.get("title", "Untitled")
                abstract = paper.get("abstract", "No abstract available")
                # Limit abstract length for context
                if abstract and len(abstract) > 300:
                    abstract = abstract[:300] + "..."
                papers_context += f"Paper {i}: {title}\nAbstract: {abstract}\n\n"
        
        # Use the Client approach from google-genai as shown in the example
        from google import genai
        from google.genai import types
        
        # Create a client with the API key
        client = genai.Client(
            api_key=os.environ.get("GEMINI_API_KEY"),
        )
        
        # Use gemini-2.0-flash model as requested
        model = "gemini-2.0-flash"
        
        # Create content with the prompt - including paper context
        prompt = f"""You are an AI research assistant helping users understand academic topics.

Topic: {request.query}

{papers_context if papers_context else ""}

Based on the query and the papers above (if available), provide a concise summary about {request.query} in 2-3 well-structured paragraphs.
Cover the core concepts, key developments, and important applications.

Format your response as plain text with no markdown formatting:
- Do NOT use **bold** or *italics*
- Use standard LaTeX notation for mathematical formulas (e.g., $E=mc^2$ or $\\nabla \\cdot \\vec{{F}} = 0$)
- Write in flowing paragraphs without special formatting
- Mathematical expressions should flow inline with the text

Keep your response between 1300 characters. Use academic but accessible language.
"""
        
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)],
            ),
        ]
        
        # Set up the generation config
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="text/plain",
            max_output_tokens=650,  # Increased token count for more substantial response
        )
        
        # Generate content (non-streaming for API response)
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )
        
        # Return the response text, truncating if necessary
        if response and hasattr(response, 'text'):
            summary = response.text.strip()
            # Truncate to max 1300 characters
            if len(summary) > 1300:
                summary = summary[:1297] + "..."
            return {"summary": summary}
        else:
            return {"summary": f"We couldn't generate a summary for '{request.query}' at this time. Please try again later."}
            
    except Exception as e:
        logger.error(f"Error in get_gemini_summary: {e}")
        return {"summary": f"We couldn't generate a summary for '{request.query}' at this time. Please try again later.", "error": str(e)}

@app.post("/deep-research")
async def get_deep_research(request: dict):
    try:
        query = request.get("query", "")
        context = request.get("context", "")
        instructions = request.get("instructions", "")
        
        logger.info(f"Generating deep research analysis for: {query}")
        
        # Use the Client approach from google-genai
        from google import genai
        from google.genai import types
        
        # Create a client with the API key
        client = genai.Client(
            api_key=os.environ.get("GEMINI_API_KEY"),
        )
        
        # Use gemini-2.0-flash model
        model = "gemini-2.0-flash"
        
        # Create comprehensive prompt
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
        
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)],
            ),
        ]
        
        # Set up the generation config for longer content
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="text/plain",
            max_output_tokens=20000,  # Significantly increased for comprehensive analysis with paper summaries
        )
        
        # Generate content
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )
        
        if response and hasattr(response, 'text'):
            analysis = response.text.strip()
            return {"analysis": analysis}
        else:
            logger.error("No response from Gemini API")
            return {"error": "Failed to generate analysis"}
            
    except Exception as e:
        logger.error(f"Error in deep research analysis: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting arXade API server")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)