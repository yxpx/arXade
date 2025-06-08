"use client";

import Link from "next/link";
import { Card, Title } from "@tremor/react";
import { SearchResult } from "../lib/api";
import LatexRenderer from "./LatexRenderer";
import AuthorName from "./AuthorName";

interface PaperListProps {
  papers: SearchResult[];
}

export default function PaperList({ papers }: PaperListProps) {
  // Helper function to format date
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch (e) {
      console.error('Error formatting date:', dateStr, e);
      return dateStr; // Return the original string if parsing fails
    }
  };

  // Helper function to get a unique key for each paper
  const getPaperKey = (paper: SearchResult) => {
    return paper._id || paper.id || paper.arxiv_id || Math.random().toString();
  };
  
  // Helper function to format authors
  const formatAuthors = (authors: string[] | string | undefined) => {
    if (!authors) return 'Unknown';
    
    if (Array.isArray(authors)) {
      return authors.join(', ');
    }
    
    return typeof authors === 'string' ? authors : 'Unknown';
  };

  return (
    <Card className="bg-gray-900 border-none shadow-lg overflow-auto max-h-[calc(100%-2rem)]">
      <Title className="text-white mb-4">Relevant Papers</Title>
      
      <div className="space-y-4">
        {papers.length === 0 ? (
          <div className="text-gray-400 text-center py-4">No papers found</div>
        ) : (
          papers.map((paper) => (
            <article key={getPaperKey(paper)} className="border-b border-gray-800 pb-4 last:border-0 flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
                <LatexRenderer content={paper.title} />
              </h3>
              <div className="text-sm text-gray-400 mb-2">
                <AuthorName name={formatAuthors(paper.authors)} /> • {formatDate(paper.date)}
              </div>
              <p className="text-gray-300 mb-3 line-clamp-2">
                <LatexRenderer content={paper.abstract || ''} />
              </p>
              <div className="flex items-center gap-3 text-sm flex-wrap mt-auto">
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                  {paper.primary_category}
                </span>
                <span className="text-gray-400 text-xs">
                  arXiv:{paper.arxiv_id}
                </span>
                <Link 
                  href={paper.pdf_url} 
                  target="_blank"
                  className="text-blue-400 hover:text-blue-300 transition-colors text-xs"
                >
                  View PDF
                </Link>
                <span className="text-gray-400 ml-auto text-xs">
                  Score: {typeof paper.score === 'number' ? paper.score.toFixed(2) : paper.score}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </Card>
  );
} 