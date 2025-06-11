# arXade

AI-powered arXiv paper discovery using semantic search and intelligent summaries.

## Features

**Intelligent Search**
- Vector embeddings for semantic paper discovery
- Search by concepts rather than keywords
- Relevance scoring based on paper content

**AI Summaries**
- Gemini AI generates research summaries
- Contextual recommendations for related work
- Deep research analysis for paper collections

**Data Visualization**
- Word clouds from paper abstracts
- Category distribution charts
- Timeline views of research trends
- Interactive filtering and exploration

## Dataset

This project uses the **arXiv CS Embeddings (Gemini-004-int8)** dataset:
[https://www.kaggle.com/datasets/yxpx237/arxiv-cs-embeddings-gemini-004-int8](https://www.kaggle.com/datasets/yxpx237/arxiv-cs-embeddings-gemini-004-int8)

## Tech Stack

```
Frontend     │ Next.js, TypeScript, Tailwind CSS
Backend      │ FastAPI, MongoDB Atlas, Vector Search  
AI           │ Google Gemini API
Charts       │ Recharts, Visx, Tremor
Deployment   │ Docker, Google Cloud Run
```

## Local Development

```bash
# Clone the repository
git clone https://github.com/yxpx/arXade.git
cd arXade

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI, Gemini API key, etc.

# Start both frontend and backend
docker-compose up
```

This runs both services automatically:
- Frontend at http://localhost:3000
- Backend API at http://localhost:8000

## Requirements

- Docker and Docker Compose
- MongoDB Atlas account
- Google Gemini API key

## Project Structure

```
arXade/
├── frontend/          # Next.js application
├── backend/           # FastAPI server
├── data/              # Embedding generation scripts
└── docker-compose.yml # Development environment
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
