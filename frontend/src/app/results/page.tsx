"use client";

import { FaGithub } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { searchPapers, getGeminiSummary, SearchResult } from "@/lib/api";
import GeminiSummary from "@/components/GeminiSummary";
import PaperCarousel from "@/components/PaperCarousel";
import PieChart from "@/components/PieChart";
import LineChart from "@/components/LineChart";
import WordCloudChart from "@/components/WordCloud";
import FilterModal from "@/components/FilterModal";
import dynamic from "next/dynamic";

// Dynamically import ParentSize to avoid SSR issues
const ParentSize = dynamic(
  () => import('@visx/responsive').then((mod) => mod.ParentSize),
  { ssr: false }
);

// Define ParentSize render props interface
interface ParentSizeProps {
  width: number;
  height: number;
  top?: number;
  left?: number;
  ref?: React.RefObject<HTMLDivElement>;
  children: (dimensions: { width: number; height: number }) => React.ReactNode;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  // State for modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [filteredPapers, setFilteredPapers] = useState<SearchResult[]>([]);

  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchQuery(query);
    
    if (query) {
      fetchSearchResults(query);
    } else {
      setIsLoading(false);
    }
  }, [searchParams]);

  const fetchSearchResults = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setSummaryLoading(false);
    setSummaryError(null);
    try {
      // Fetch data from backend
      const papers = await searchPapers(query);
      console.log("Search results received:", papers);
      
      if (papers && papers.length > 0) {
        setResults(papers);
        
        // Fetch summary only if we have paper results
        setSummaryLoading(true);
        try {
          const summaryData = await getGeminiSummary(query);
          console.log("Summary received:", summaryData);
          setSummary(summaryData.summary);
          
          // Check if summary contains error message
          if (summaryData.error || 
              summaryData.summary.toLowerCase().includes("we couldn't generate") ||
              summaryData.summary.toLowerCase().includes("unable to generate")) {
            setSummaryError("Failed to generate summary");
          }
        } catch (summaryError) {
          console.error("Error fetching summary:", summaryError);
          setSummary("Unable to generate a summary at this time. Please try again later.");
          setSummaryError("Error fetching summary");
        } finally {
          setSummaryLoading(false);
        }
      } else {
        setResults([]);
        setError("No papers found matching your query. Please try a different search term.");
      }
    } catch (error) {
      console.error("Error fetching search results:", error);
      setError("An error occurred while searching. Please try again later.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/results?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Generate data for pie chart - group by primary category
  const getCategoryData = () => {
    if (!results || !results.length) return [];
    
    const categoryCount: Record<string, number> = {};
    
    results.forEach(paper => {
      if (!paper.primary_category) return;
      
      const category = paper.primary_category;
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Limit to top 5 categories
  };

  // Generate data for line chart - group by year
  const getYearData = () => {
    if (!results || !results.length) return [];
    
    const yearCount: Record<number, number> = {};
    
    results.forEach(paper => {
      if (!paper.date) return;
      
      try {
        const year = new Date(paper.date).getFullYear();
        if (year && !isNaN(year)) {
          yearCount[year] = (yearCount[year] || 0) + 1;
        }
      } catch (e) {
        console.error("Error processing date:", paper.date, e);
      }
    });
    
    return Object.entries(yearCount)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);
  };

  // Generate data for word cloud
  const getWordCloudData = () => {
    if (!results || !results.length) return [];
    
    const wordCount: Record<string, number> = {};
    
    // Common words to exclude
    const stopWords = new Set([
      'the', 'and', 'to', 'of', 'a', 'in', 'is', 'that', 'it', 'with', 'as', 'for', 
      'on', 'was', 'be', 'by', 'at', 'this', 'an', 'which', 'are', 'from', 'or', 'have', 'has',
      'we', 'our', 'can', 'been', 'not', 'their', 'they', 'these', 'such', 'were', 'its'
    ]);
    
    results.forEach(paper => {
      if (!paper.abstract) return;
      
      const words = paper.abstract
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));
      
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
    });
    
    return Object.entries(wordCount)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 100); // Limit to top 100 words
  };

  // Handle category click in pie chart
  const handleCategoryClick = (category: string) => {
    const filtered = results.filter(paper => paper.primary_category === category);
    setFilteredPapers(filtered);
    setModalTitle(`Papers in ${category}`);
    setModalOpen(true);
  };

  // Handle year click in line chart
  const handleYearClick = (year: number) => {
    const filtered = results.filter(paper => {
      try {
        const paperYear = new Date(paper.date).getFullYear();
        return !isNaN(paperYear) && paperYear === year;
      } catch (e) {
        return false;
      }
    });
    setFilteredPapers(filtered);
    setModalTitle(`Papers from ${year}`);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 py-4 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-3 items-center">
          {/* Left section */}
          <div className="flex items-center gap-4 justify-start">
            <Link href="/" className="text-2xl font-bold font-[family-name:var(--font-playfair)] select-none cursor-pointer">
              arXade
            </Link>
          </div>
          
          {/* Center section - Search bar */}
          <div className="flex justify-center">
            <form onSubmit={handleSearch} className="relative w-full max-w-lg">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 bg-transparent border border-gray-300 rounded-full focus:outline-none focus:shadow-[0_0_3px_rgba(255,255,255,0.1)] text-white"
              />
              <button 
                type="submit"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors cursor-pointer"
              >
                <FiSearch className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right section */}
          <div className="flex justify-end">
            <Link 
              href="https://github.com/yxpx/arXade" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300 transition-colors cursor-pointer"
            >
              <FaGithub className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-6">
            <div className="text-gray-400">
              Searching for "{searchParams.get('q')}"...
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 rounded-lg bg-gray-900 animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : error ? (
          // Error message
          <div className="p-6 bg-red-900/20 border border-red-800 rounded-lg text-white">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p>{error}</p>
          </div>
        ) : (
          // Results grid
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* AI Summary */}
              <GeminiSummary
                query={searchParams.get('q') || ''}
                summary={summary}
                isLoading={summaryLoading}
                error={summaryError}
              />
              
              {/* Paper List */}
              <PaperCarousel papers={results} />
              
              {/* Category Pie Chart */}
              <PieChart 
                data={getCategoryData()} 
                title="Papers by Category"
                onSliceClick={handleCategoryClick}
              />
              
              {/* Year Line Chart */}
              <LineChart 
                data={getYearData()} 
                title="Papers by Year"
                onPointClick={handleYearClick}
              />
              
              {/* Word Cloud */}
              <div className="col-span-1 md:col-span-2">
                <WordCloudChart 
                  words={getWordCloudData()} 
                  title="Common Terms in Abstracts"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Filter Modal */}
      <FilterModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
      >
        <PaperCarousel papers={filteredPapers} title={modalTitle} />
      </FilterModal>
    </div>
  );
}

function ResultsLoading() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-2xl font-bold mb-8 animate-pulse">Loading results...</div>
      </div>
    </div>
  );
}

export default function Results() {
  return (
    <Suspense fallback={<ResultsLoading />}>
      <ResultsContent />
    </Suspense>
  );
} 