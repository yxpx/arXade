# arXade - AI-Powered arXiv Paper Discovery

arXade is a hackathon project that revolutionizes arXiv paper discovery by building an intelligent search engine that leverages vector embeddings and AI-powered tailored suggestions.

## Features

- **Next.js Frontend**: Modern, responsive UI with Tailwind CSS
- **Python FastAPI Backend**: RESTful API with MongoDB integration
- **Gemini AI Integration**: Get intelligent summaries and insights
- **Vector Search**: Find semantically similar papers
- **Data Visualization**: Explore papers through intuitive charts and wordclouds

## Project Structure

- `/frontend` - Next.js 13+ App Router application
- `/backend` - FastAPI application with MongoDB and Gemini API integrations
- `.env` - Environment variables (add to .gitignore for production)

## Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- MongoDB Atlas account
- Gemini API key

### Environment Variables

Create a `.env` file in the root directory with:

```
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/arxade
MONGODB_DB_NAME=arxade
MONGODB_COLLECTION=papers

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running the Application

#### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Deployment

This project is designed to be deployed on Google Cloud Run, with MongoDB Atlas as the vector database.

## License

MIT
