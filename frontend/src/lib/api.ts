// API client for backend communication

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    console.log(`Searching for: ${query} with limit: ${limit}`);
    const response = await fetch(`${API_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Search results:', data);
    return data;
  } catch (error) {
    console.error('Error searching papers:', error);
    return [];
  }
};

export const getGeminiSummary = async (query: string): Promise<GeminiSummary> => {
  try {
    console.log(`Getting summary for: ${query}`);
    const response = await fetch(`${API_URL}/gemini-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Summary result:', data);
    return data;
  } catch (error) {
    console.error('Error getting Gemini summary:', error);
    return { summary: 'Unable to generate summary at this time.' };
  }
}; 