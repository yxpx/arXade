"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ShineCard } from "./ui/shine-card";
import LatexRenderer from "./LatexRenderer";
import { SearchResult } from "../lib/api";
import React from "react";

interface DeepResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  papers: SearchResult[];
}

interface DeepResearchCache {
  [query: string]: {
    content: string;
    timestamp: number;
  };
}

// Enhanced component to handle mixed markdown and LaTeX content
function ContentRenderer({ content }: { content: string }) {
  // First, find and preserve block LaTeX formulas
  const [processedContent, blockFormulas] = React.useMemo(() => {
    const formulas: string[] = [];
    // Remove any format indicators like "markdown", "```markdown", etc. at the beginning and end
    let processed = content.replace(/^(```)?markdown\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    
    // Extract block LaTeX formulas ($$...$$) and replace with placeholders
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      const placeholder = `__BLOCK_LATEX_${formulas.length}__`;
      formulas.push(formula.trim());
      return placeholder;
    });
    
    return [processed, formulas];
  }, [content]);

  // Process inline markdown formatting within text
  const processInlineFormatting = (text: string) => {
    // Handle **bold** text
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={i} className="text-white font-semibold">
            <LatexRenderer content={part.slice(2, -2)} />
          </strong>
        );
      } else {
        return <LatexRenderer key={i} content={part} />;
      }
    });
  };

  const processLine = (line: string, index: number) => {
    const trimmedLine = line.trim();
    
    // Check if this line is a block LaTeX placeholder
    const blockLatexMatch = trimmedLine.match(/^__BLOCK_LATEX_(\d+)__$/);
    if (blockLatexMatch) {
      const formulaIndex = parseInt(blockLatexMatch[1]);
      const formula = blockFormulas[formulaIndex];
      if (formula) {
        return (
          <div key={index} className="my-6">
            <LatexRenderer content={`$$${formula}$$`} />
          </div>
        );
      }
    }
    
    // Handle different markdown elements
    if (trimmedLine.startsWith('# ')) {
      return (
        <h1 key={index} className="text-3xl font-bold text-white mb-6 mt-8">
          {processInlineFormatting(trimmedLine.substring(2))}
        </h1>
      );
    } else if (trimmedLine.startsWith('## ')) {
      return (
        <h2 key={index} className="text-2xl font-semibold text-white mb-4 mt-6">
          {processInlineFormatting(trimmedLine.substring(3))}
        </h2>
      );
    } else if (trimmedLine.startsWith('### ')) {
      return (
        <h3 key={index} className="text-xl font-medium text-white mb-3 mt-4">
          {processInlineFormatting(trimmedLine.substring(4))}
        </h3>
      );
    } else if (trimmedLine.startsWith('- ')) {
      return (
        <div key={index} className="text-gray-300 mb-2 ml-6 flex items-start">
          <span className="mr-2">•</span>
          <div className="flex-1">
            {processInlineFormatting(trimmedLine.substring(2))}
          </div>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      // Handle numbered lists
      const numberMatch = trimmedLine.match(/^(\d+)\.\s(.*)$/);
      if (numberMatch) {
        return (
          <div key={index} className="text-gray-300 mb-2 ml-6 flex items-start">
            <span className="mr-2 text-blue-400 font-semibold">{numberMatch[1]}.</span>
            <div className="flex-1">
              {processInlineFormatting(numberMatch[2])}
            </div>
          </div>
        );
      }
    } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.length > 4) {
      // Handle standalone bold lines
      return (
        <div key={index} className="text-white font-semibold mb-2">
          <LatexRenderer content={trimmedLine.slice(2, -2)} />
        </div>
      );
    } else if (trimmedLine === '---') {
      return <hr key={index} className="border-gray-600 my-6" />;
    } else if (trimmedLine.length > 0) {
      // Handle regular paragraphs with potential inline formatting
      return (
        <div key={index} className="text-gray-300 mb-4 leading-relaxed break-words">
          {processInlineFormatting(trimmedLine)}
        </div>
      );
    } else {
      return <div key={index} className="mb-2"></div>;
    }
  };

  // Split content into lines and process each one
  const lines = processedContent.split('\n');
  const processedContentElements = lines.map((line, index) => processLine(line, index));

  return (
    <div className="max-w-none break-words overflow-wrap-anywhere">
      {processedContentElements}
    </div>
  );
}

export default function DeepResearchModal({ isOpen, onClose, query, papers }: DeepResearchModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<DeepResearchCache>({});

  // Check cache first, then generate content
  useEffect(() => {
    if (!isOpen || !query) return;

    // Check if we have cached content for this query
    const cached = cache[query];
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) { // 30 minutes cache
      setContent(cached.content);
      return;
    }

    // Generate new content
    generateDeepResearch();
  }, [isOpen, query, papers]);

  const generateDeepResearch = async () => {
    if (!query || !papers.length) return;

    setIsLoading(true);
    setError(null);

    try {
      // Create comprehensive context from papers
      const papersContext = papers.slice(0, 15).map((paper, i) => {
        const abstract = paper.abstract ? 
          (paper.abstract.length > 500 ? paper.abstract.substring(0, 500) + "..." : paper.abstract) 
          : "No abstract available";
        
        return `**Paper ${i + 1}**: ${paper.title}
**Authors**: ${Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors || "Unknown"}
**Category**: ${paper.primary_category}
**Date**: ${paper.date}
**Abstract**: ${abstract}
**arXiv ID**: ${paper.arxiv_id}`;
      }).join("\n\n");

      // Top 10 papers summary for the prompt
      const topPapersSummary = papers.slice(0, 10).map((paper, i) => {
        const abstract = paper.abstract || "No abstract available";
        return `${i + 1}. **${paper.title}** (${paper.date})
   - **Authors**: ${Array.isArray(paper.authors) ? paper.authors.slice(0, 3).join(", ") : paper.authors}
   - **Key Focus**: ${abstract.substring(0, 200)}...
   - **Category**: ${paper.primary_category}`;
      }).join("\n");

      // Comprehensive research prompt
      const prompt = {
        query: `Deep Research Analysis: ${query}`,
        context: papersContext,
        instructions: `You are a distinguished AI research scientist and professor. Create a comprehensive, mathematically rigorous analysis on "${query}".

FORMATTING REQUIREMENTS:
- Use academic language with proper mathematical notation
- Use LaTeX extensively for mathematical expressions: $inline$ or $$block$$
- Include formal definitions, theorems, and mathematical formulations
- Provide quantitative analysis where possible
- Use rigorous academic terminology
- Structure content with clear mathematical foundations

ANALYSIS STRUCTURE:

# Deep Research Analysis: ${query}

## Executive Summary
Provide a comprehensive overview of the mathematical foundations and theoretical underpinnings of "${query}". Include key mathematical formulations and their significance.

## Mathematical Foundations & Formal Definitions

### Core Theoretical Framework
- Provide formal mathematical definitions with LaTeX notation
- Present fundamental equations and their derivations
- Include complexity analysis using Big O notation: $O(n)$, $O(n^2)$, etc.
- Mathematical properties and constraints

### Key Mathematical Formulations
Present the essential mathematical models, including:
- Loss functions: $\\mathcal{L}(\\theta) = \\frac{1}{n}\\sum_{i=1}^{n} \\ell(f(x_i; \\theta), y_i)$
- Optimization objectives with gradients: $\\nabla_{\\theta} \\mathcal{L}(\\theta)$
- Convergence criteria and theoretical bounds
- Probabilistic formulations when applicable

## State-of-the-Art Methodologies

### Leading Algorithmic Approaches
For each major approach, provide:
- Mathematical formulation of the algorithm
- Theoretical complexity analysis
- Performance bounds and convergence guarantees
- Comparative analysis with quantitative metrics

### Performance Analysis & Benchmarks
- Present quantitative results with statistical significance
- Include mathematical performance metrics
- Theoretical vs. empirical performance bounds
- Scalability analysis with mathematical modeling

## Advanced Technical Analysis

### Algorithmic Innovations
- Mathematical description of novel algorithms
- Theoretical improvements with formal proofs or citations
- Computational complexity comparisons
- Mathematical analysis of algorithmic properties

### Optimization Techniques
Detail mathematical optimization methods:
- Gradient-based methods: $\\theta_{t+1} = \\theta_t - \\eta \\nabla \\mathcal{L}(\\theta_t)$
- Second-order methods and Hessian analysis
- Regularization techniques with mathematical formulations
- Convergence analysis and stability guarantees

## Research Frontiers & Open Problems

### Current Mathematical Challenges
- Unsolved theoretical problems with mathematical formulation
- Computational complexity barriers
- Mathematical conjectures and open questions
- Theoretical limitations with formal analysis

### Emerging Mathematical Frameworks
- Novel mathematical models and their properties
- Theoretical extensions and generalizations
- Mathematical tools from other fields being applied
- Rigorous analysis of new approaches

## Quantitative Research Trends

### Statistical Analysis of Research Progress
- Mathematical trends in performance improvements
- Quantitative analysis of research output
- Statistical significance of reported improvements
- Mathematical modeling of research trajectory

### Future Mathematical Directions
- Theoretical extensions with mathematical foundations
- Promising mathematical frameworks for future work
- Computational challenges requiring mathematical solutions
- Interdisciplinary mathematical approaches

## Formal Recommendations

### For Theoretical Researchers
- Mathematical problems requiring formal analysis
- Theoretical gaps needing rigorous treatment
- Mathematical tools and frameworks to master
- Formal verification and proof techniques

### For Applied Researchers
- Mathematical foundations essential for implementation
- Quantitative evaluation methodologies
- Statistical analysis requirements
- Mathematical modeling best practices

---

**Mathematical Analysis based on ${papers.length} peer-reviewed research papers**

Emphasize mathematical rigor throughout. Include specific mathematical formulations from the provided papers. Present theoretical analysis with proper mathematical notation. Focus on quantitative insights and formal mathematical treatment of the subject matter.

**Research Papers Context:**
${papersContext}`
      };

      // Call the backend API for deep research
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/deep-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompt),
      });

      if (!response.ok) {
        throw new Error('Failed to generate deep research analysis');
      }

      const data = await response.json();
      const analysisContent = data.analysis || "Analysis could not be generated at this time.";

      // Cache the result
      const newCache = {
        ...cache,
        [query]: {
          content: analysisContent,
          timestamp: Date.now()
        }
      };
      setCache(newCache);
      setContent(analysisContent);

    } catch (err) {
      console.error('Error generating deep research:', err);
      setError("Failed to generate deep research analysis. Please try again.");
      
      // Fallback content based on papers
      const fallbackContent = generateFallbackContent();
      setContent(fallbackContent);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackContent = () => {
    const topPapers = papers.slice(0, 10);
    const categories = [...new Set(papers.map(p => p.primary_category))];
    const years = [...new Set(papers.map(p => new Date(p.date).getFullYear()))].sort((a, b) => b - a);

    return `# Deep Research Analysis: ${query}

## Overview
This analysis is based on ${papers.length} research papers related to "${query}". The research spans ${years.length} years (${Math.min(...years)} - ${Math.max(...years)}) and covers ${categories.length} primary categories: ${categories.join(", ")}.

## Key Research Areas
${categories.map(cat => `- **${cat}**: ${papers.filter(p => p.primary_category === cat).length} papers`).join("\n")}

## Recent Developments
The most recent papers (${years.slice(0, 3).join(", ")}) show active research in this domain with ${papers.filter(p => new Date(p.date).getFullYear() >= years[0]).length} papers published in the last few years.

## Notable Papers
${topPapers.map((paper, i) => `
### ${i + 1}. ${paper.title}
**Authors**: ${Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors}
**Date**: ${paper.date}
**Category**: ${paper.primary_category}

${paper.abstract ? paper.abstract.substring(0, 300) + "..." : "No abstract available"}

[View Paper](${paper.pdf_url})
`).join("\n")}

## Research Trends
Based on the collected papers, key trends in "${query}" include:
- Active development across multiple research institutions
- Focus on ${categories.slice(0, 3).join(", ")} domains
- Continuous innovation with ${papers.filter(p => new Date(p.date).getFullYear() >= new Date().getFullYear() - 1).length} recent publications

*This analysis was generated from the available research papers. For more detailed insights, please refer to the individual papers.*`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[90vh] flex flex-col">
        <ShineCard className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h2 className="text-2xl font-bold text-white">
              Deep Research: {query}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-300">Generating comprehensive research analysis...</p>
                  <p className="text-sm text-gray-500 mt-2">Analyzing {papers.length} papers</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={generateDeepResearch}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Retry Analysis
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar">
                <div className="max-w-full break-words overflow-wrap-anywhere">
                  <ContentRenderer content={content} />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-800 p-4 text-center text-sm text-gray-500">
            Analysis based on {papers.length} research papers • Generated at {new Date().toLocaleString()}
          </div>
        </ShineCard>
      </div>
    </div>
  );
} 