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
    <div className="flex flex-col justify-center items-center min-h-screen py-12 px-4">
      {/* Header with project name */}
      <div className="mb-12">
        <h1 className="text-8xl font-bold tracking-tight font-[family-name:var(--font-playfair)] text-white select-none cursor-default">
          arXade
        </h1>
      </div>

      {/* Main content with search bar - centered */}
      <div className="w-full max-w-xl px-4">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-6 py-4 bg-transparent border border-gray-300 rounded-full focus:outline-none focus:shadow-[0_0_5px_rgba(255,255,255,0.15)] text-white text-lg font-light transition-all duration-300"
            placeholder="Search arXiv papers..."
          />
          <button 
            type="submit"
            className="absolute right-6 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors cursor-pointer"
          >
            <FiSearch className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Footer with GitHub link */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
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
  );
}
