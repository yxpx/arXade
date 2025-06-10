"use client";

import { FaGithub } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/results?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div 
      className="h-screen w-screen relative bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: 'url(/bgimg2.jpg)' }}
    >
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-center items-center text-center z-10 transform -translate-y-23">
        {/* Header with project name */}
        <div className="mb-12">
          <h1 className="text-8xl font-bold tracking-tight font-[family-name:var(--font-playfair)] select-none cursor-default text-white" 
              style={{ 
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
              }}>
            arXade
          </h1>
        </div>

        {/* Main content with search bar - moved up using transform */}
        <div className="w-full max-w-xl px-4 pointer-events-auto transform -translate-y-2">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 bg-black/60 backdrop-blur-md border border-gray-700 text-white text-lg font-light rounded-full focus:outline-none focus:border-gray-500 transition-all duration-300 placeholder-gray-400"
              placeholder="Search papers, topics, or keywords..."
            />
            <button 
              type="submit"
              className="absolute right-6 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors cursor-pointer"
            >
              <FiSearch className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer with GitHub link - outside transformed container */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto z-20">
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 transition-all duration-300 hover:bg-black/50 hover:border-white/20">
          <Link 
            href="https://github.com/yxpx/arXade" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors text-sm cursor-pointer"
          >
            <FaGithub className="w-4 h-4" />
            <span>View on GitHub</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
