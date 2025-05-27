"use client";

import { FaGithub } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchQuery(query);
    
    // Simulate loading delay for now
    setTimeout(() => setIsLoading(false), 1000);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/results?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 1000);
    }
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
      <main className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-6">
            <div className="text-gray-400">
              Searching for "{searchParams.get('q')}"...
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-gray-900 rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-800 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-800 rounded w-1/2 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-800 rounded"></div>
                  <div className="h-3 bg-gray-800 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-800 rounded w-4/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Results content (placeholder for now)
          <div className="space-y-6">
            <div className="text-gray-400">
              Found results for "{searchParams.get('q')}"
            </div>
            
            {/* Placeholder results */}
            {[...Array(2)].map((_, i) => (
              <article key={i} className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Sample arXiv Paper Title {i + 1}
                </h2>
                <div className="text-sm text-gray-400 mb-3">
                  Authors: Sample Author 1, Sample Author 2 • Published: 2024-01-{String(i + 1).padStart(2, '0')}
                </div>
                <p className="text-gray-300 mb-4">
                  This is a placeholder abstract for an arXiv paper.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="bg-blue-600 text-white px-2 py-1 rounded">
                    Computer Science
                  </span>
                  <span className="text-gray-400">
                    arXiv:2024.{String(1000 + i).padStart(4, '0')}
                  </span>
                  <Link 
                    href="#" 
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View PDF
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Loading fallback component
function ResultsLoading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-gray-400">Loading search results...</div>
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