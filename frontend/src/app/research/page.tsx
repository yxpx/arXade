"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FiSearch, FiArrowLeft } from "react-icons/fi";
import { ShineCard } from "@/components/ui/shine-card";

export default function ResearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchQuery = searchParams.get("q");
    if (searchQuery) {
      setQuery(searchQuery);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/research?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold font-[family-name:var(--font-playfair)] select-none cursor-pointer">
              arXade
            </Link>
          </div>
          
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-5 py-3 bg-transparent border border-gray-300 rounded-full focus:outline-none focus:shadow-[0_0_3px_rgba(255,255,255,0.1)] text-white"
                placeholder="Explore research topics..."
              />
              <button 
                type="submit"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors cursor-pointer"
              >
                <FiSearch className="w-4 h-4" />
              </button>
            </div>
          </form>
          
          <div className="flex items-center gap-4">
            <Link 
              href={`/results?q=${encodeURIComponent(query)}`}
              className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>Back to Results</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Deep Research: {query}</h1>
          
          <p className="text-gray-400">
            This page will be expanded with more in-depth research tools and visualization options.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ShineCard>
              <h2 className="text-xl font-semibold mb-3">Advanced Analysis</h2>
              <p className="text-gray-300">
                Detailed analysis of research trends, relationships between papers, and key contributors in this field will be shown here.
              </p>
            </ShineCard>
            
            <ShineCard>
              <h2 className="text-xl font-semibold mb-3">Related Topics</h2>
              <p className="text-gray-300">
                Discover related research areas and interdisciplinary connections to expand your exploration.
              </p>
            </ShineCard>
          </div>
        </div>
      </main>
    </div>
  );
} 