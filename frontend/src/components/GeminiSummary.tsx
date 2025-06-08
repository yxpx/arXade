"use client";

import { Button } from "@tremor/react";
import { ShineCard } from "./ui/shine-card";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';

interface GeminiSummaryProps {
  summary: string;
  query: string;
  isLoading?: boolean;
  error?: string | null;
}

export default function GeminiSummary({ summary, query, isLoading = false, error = null }: GeminiSummaryProps) {
  // If summary contains "we couldn't generate", it's an error from the backend
  const hasError = error || summary.toLowerCase().includes("we couldn't generate");
  
  // Format the query for display - remove any "with" phrases that might be technical instructions
  const displayQuery = query
    .split(' with ')
    .filter((part, idx) => idx === 0 || !part.includes('/'))
    .join(' with ')
    .trim();

  return (
    <ShineCard className="h-[500px] flex flex-col">
      <h2 className="text-xl font-semibold text-white mb-3">
        AI Summary: {displayQuery}
      </h2>
      
      {isLoading ? (
        <div className="flex flex-col space-y-2 animate-pulse flex-grow">
          <div className="h-4 bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6"></div>
          <div className="h-4 bg-gray-700 rounded w-4/6"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        </div>
      ) : hasError ? (
        <div className="text-gray-300 mb-4 flex-grow">
          <p className="text-amber-400 mb-2">
            Sorry, we couldn't generate a summary for this query.
          </p>
          <p className="text-sm opacity-75">
            Please try another search term or try again later.
          </p>
        </div>
      ) : (
        <div className="text-gray-300 mb-4 prose prose-invert prose-sm max-w-none flex-grow">
          <ReactMarkdown>
            {summary}
          </ReactMarkdown>
        </div>
      )}
      
      <div className="flex justify-end items-center mt-auto pt-3">
        {!isLoading && !hasError && (
          <Link href={`/research?q=${encodeURIComponent(query)}`}>
            <Button
              color="blue"
              variant="secondary"
              size="sm"
              className="rounded-xl"
            >
              Deep Research
            </Button>
          </Link>
        )}
      </div>
    </ShineCard>
  );
} 