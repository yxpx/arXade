// API client for backend communication

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

// Validate API key at startup (development only)
if (!API_KEY && process.env.NODE_ENV === 'development') {
  console.error('CRITICAL: NEXT_PUBLIC_API_KEY environment variable is not set!');
  console.error('Add NEXT_PUBLIC_API_KEY=your-api-key to your .env file');
}

export interface SearchResult {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  primary_category: string;
  date: string;
  score: number;
  arxiv_id: string;
  pdf_url: string;
  _id?: string; // Optional for compatibility
}

export interface GeminiSummary {
  summary: string;
  error?: string;
}

export const searchPapers = async (query: string, limit: number = 50): Promise<SearchResult[]> => {
  try {
    // Ensure API key is available
    if (!API_KEY) {
      throw new Error('API key not configured. Check NEXT_PUBLIC_API_KEY environment variable.');
    }
    
    const response = await fetch(`${API_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Search API error: ${response.status} - ${errorText}`);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching papers:', error);
    return [];
  }
};

export const getGeminiSummary = async (query: string): Promise<GeminiSummary> => {
  try {
    // Ensure API key is available
    if (!API_KEY) {
      throw new Error('API key not configured. Check NEXT_PUBLIC_API_KEY environment variable.');
    }
    
    const response = await fetch(`${API_URL}/gemini-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Summary API error: ${response.status} - ${errorText}`);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting Gemini summary:', error);
    return { summary: 'Unable to generate summary at this time.' };
  }
}; 