"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Title } from "@tremor/react";
import { SearchResult } from "../lib/api";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { FaExternalLinkAlt } from "react-icons/fa";
import { ShineCard } from "./ui/shine-card";
import LatexRenderer from "./LatexRenderer";
import AuthorName from "./AuthorName";

interface PaperCarouselProps {
  papers: SearchResult[];
  title?: string;
}

export default function PaperCarousel({ papers, title = "Relevant Papers" }: PaperCarouselProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const papersPerPage = 2; // Changed from 3 to 2 papers per page
  const totalPages = Math.ceil(papers.length / papersPerPage);

  // Mouse move effect for shine
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll('.shine-card');
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        (card as HTMLElement).style.setProperty('--x', `${x}px`);
        (card as HTMLElement).style.setProperty('--y', `${y}px`);
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

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

  // Helper function to format authors for display
  const formatAuthors = (authors: string[] | string | undefined) => {
    if (!authors) return 'Unknown';
    
    let authorText = '';
    
    if (Array.isArray(authors)) {
      // Take first two authors at most
      const displayAuthors = authors.slice(0, 2);
      authorText = displayAuthors.join(', ');
      
      // Add "et al" if there are more than 2 authors
      if (authors.length > 2) {
        authorText += ' et al.';
      }
    } else {
      authorText = typeof authors === 'string' ? authors : 'Unknown';
    }
    
    // Truncate if too long
    if (authorText.length > 30) {
      authorText = authorText.substring(0, 30) + '...';
    }
    
    return authorText;
  };

  // Helper function to truncate abstract
  const formatAbstract = (abstract: string | undefined) => {
    if (!abstract) return '';
    return abstract.length > 120 ? abstract.substring(0, 120) + '...' : abstract;
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => (prev === totalPages - 1 ? 0 : prev + 1));
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => (prev === 0 ? totalPages - 1 : prev - 1));
  };

  // Get current papers to display
  const currentPapers = papers.slice(
    currentPage * papersPerPage,
    (currentPage + 1) * papersPerPage
  );

  return (
    <ShineCard className="h-[500px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <Title className="text-white">{title}</Title>
        <div className="text-gray-400 text-sm">
          {papers.length > 0 ? `${currentPage * papersPerPage + 1}-${Math.min((currentPage + 1) * papersPerPage, papers.length)} of ${papers.length}` : '0 papers'}
        </div>
      </div>
      
      {papers.length === 0 ? (
        <div className="text-gray-400 text-center py-4 h-full flex items-center justify-center flex-grow">
          No papers found
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 mb-4 flex-grow">
            {currentPapers.map((paper) => (
              <article 
                key={getPaperKey(paper)} 
                className="bg-gray-800 rounded-xl p-4 transition-all duration-200 hover:bg-gray-750 hover:shadow-xl border border-white/5 flex flex-col"
              >
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
                  <LatexRenderer content={paper.title} />
                </h3>
                <div className="text-sm text-gray-400 mb-2 flex flex-wrap items-center gap-2">
                  <span><AuthorName name={formatAuthors(paper.authors)} /></span>
                  <span>•</span>
                  <span>{formatDate(paper.date)}</span>
                </div>
                <p className="text-gray-300 mb-3 line-clamp-2 text-sm">
                  <LatexRenderer content={formatAbstract(paper.abstract)} />
                </p>
                <div className="flex items-center justify-between gap-3 text-sm flex-wrap mt-auto">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded-xl text-xs">
                      {paper.primary_category}
                    </span>
                    <span className="text-gray-400 text-xs">
                      arXiv:{paper.arxiv_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">
                      Score: {typeof paper.score === 'number' ? paper.score.toFixed(2) : paper.score}
                    </span>
                    <Link 
                      href={paper.pdf_url} 
                      target="_blank"
                      className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs"
                    >
                      <FaExternalLinkAlt size={10} />
                      PDF
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-800">
            <button
              onClick={goToPrevPage}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={papers.length <= papersPerPage}
            >
              <FiChevronLeft /> Previous
            </button>
            <div className="text-gray-400 text-sm">
              Page {currentPage + 1} of {totalPages}
            </div>
            <button
              onClick={goToNextPage}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={papers.length <= papersPerPage}
            >
              Next <FiChevronRight />
            </button>
          </div>
        </>
      )}
    </ShineCard>
  );
} 