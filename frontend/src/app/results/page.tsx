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
import DeepResearchModal from "@/components/DeepResearchModal";
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

  // Deep Research Modal state
  const [deepResearchOpen, setDeepResearchOpen] = useState(false);

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
      
      if (papers && papers.length > 0) {
        setResults(papers);
        
        // Fetch summary only if we have paper results
        setSummaryLoading(true);
        try {
          const summaryData = await getGeminiSummary(query);
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
    if (!results || !results.length) {
      return [];
    }
    
    // Define our priority categories
    const priorityCategories = [
      "cs.CV", "cs.cv", 
      "cs.LG", "cs.lg", 
      "cs.CL", "cs.cl", 
      "cs.AI", "cs.ai", 
      "cs.NE", "cs.ne", 
      "cs.RO", "cs.ro"
    ];
    const categoryCount: Record<string, number> = {};
    
    // Define our standard categories
    const standardCategories = ["cs.CV", "cs.LG", "cs.CL", "cs.AI", "cs.NE", "cs.RO"];
    
    // Initialize all categories with zero count
    standardCategories.forEach(cat => {
      categoryCount[cat] = 0;
    });
    
    // Count all papers in their respective categories
    results.forEach(paper => {
      // Get all categories from the paper
      const paperCategories = [];
      
      // Add categories from the categories array
      if (paper.categories && Array.isArray(paper.categories)) {
        paperCategories.push(...paper.categories);
      }
      
      // Add primary category if it exists and is not already in the array
      if (paper.primary_category && !paperCategories.includes(paper.primary_category)) {
        paperCategories.push(paper.primary_category);
      }
      
      // Check if any of the paper's categories match our standard categories
      let matched = false;
      
      // Check each standard category in order
      for (const standardCat of standardCategories) {
        // Look for an exact match (case-sensitive)
        if (paperCategories.includes(standardCat)) {
          categoryCount[standardCat] += 1;
          matched = true;
          break; // Only count in the first matching category
        }
      }
      
      // If no exact match was found, try case-insensitive matching
      if (!matched) {
        for (const standardCat of standardCategories) {
          const lowerStandardCat = standardCat.toLowerCase();
          
          // Check if any paper category matches this standard category (case-insensitive)
          const matchFound = paperCategories.some(paperCat => 
            paperCat.toLowerCase() === lowerStandardCat
          );
          
          if (matchFound) {
            categoryCount[standardCat] += 1;
            matched = true;
            break; // Only count in the first matching category
          }
        }
      }
      
      // If still no match, try prefix matching
      if (!matched) {
        for (const standardCat of standardCategories) {
          const matchFound = paperCategories.some(paperCat => 
            paperCat.toLowerCase().startsWith(standardCat.toLowerCase())
          );
          
          if (matchFound) {
            categoryCount[standardCat] += 1;
            matched = true;
            break;
          }
        }
      }
      
      // Log unmatched papers in development only
      if (!matched && process.env.NODE_ENV === 'development') {
        console.warn(`Paper ${paper.id || paper.arxiv_id} could not be categorized:`, paperCategories);
      }
    });
    
    // Convert to chart data format
    const result = Object.entries(categoryCount)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({
        category,
        count
      }));
    
    return result;
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

  // Handle word click in word cloud - trigger new search in new tab
  const handleWordClick = (word: string) => {
    // Open search in new tab
    const newUrl = `/results?q=${encodeURIComponent(word)}`;
    window.open(newUrl, '_blank');
  };

  // Generate data for word cloud
  const getWordCloudData = () => {
    if (!results || !results.length) return [];
    
    const wordCount: Record<string, number> = {};
    
    // Comprehensive list of stop words to exclude
    const stopWords = new Set([
      // Extended comprehensive English stop words
      'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 
      "aren't", 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 
      'both', 'but', 'by', "can't", 'cannot', 'could', "couldn't", 'did', "didn't", 'do', 
      'does', "doesn't", 'doing', "don't", 'down', 'during', 'each', 'few', 'for', 'from', 
      'further', 'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", 
      "he'll", "he's", 'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 
      'how', "how's", 'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is', "isn't", 
      'it', "it's", 'its', 'itself', "let's", 'me', 'more', 'most', "mustn't", 'my', 'myself', 
      'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 
      'ours', 'ourselves', 'out', 'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", 
      "she's", 'should', "shouldn't", 'so', 'some', 'such', 'than', 'that', "that's", 'the', 
      'their', 'theirs', 'them', 'themselves', 'then', 'there', "there's", 'these', 'they', 
      "they'd", "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too', 
      'under', 'until', 'up', 'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", 
      "we've", 'were', "weren't", 'what', "what's", 'when', "when's", 'where', "where's", 
      'which', 'while', 'who', "who's", 'whom', 'why', "why's", 'with', "won't", 'would', 
      "wouldn't", 'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself', 
      'yourselves',
      // Additional common words that were in the original list
      'also', 'each', 'may', 'might', 'must', 'shall', 'now', 'mine', 'theirs', 'onto', 
      'among', 'within', 'without', 'since', 'although', 'though', 'however', 'therefore', 
      'thus', 'hence', 'moreover', 'furthermore', 'nevertheless', 'nonetheless', 'otherwise',
      // Academic filler words
      'paper', 'study', 'research', 'approach', 'method', 'technique', 'analysis', 'work',
      'show', 'shows', 'shown', 'demonstrate', 'demonstrates', 'demonstrated', 'present',
      'presents', 'presented', 'propose', 'proposes', 'proposed', 'introduce', 'introduces',
      'introduced', 'describe', 'describes', 'described', 'discuss', 'discusses', 'discussed',
      'investigate', 'investigates', 'investigated', 'examine', 'examines', 'examined',
      'evaluate', 'evaluates', 'evaluated', 'consider', 'considers', 'considered',
      'develop', 'develops', 'developed', 'provide', 'provides', 'provided', 'obtain',
      'obtains', 'obtained', 'achieve', 'achieves', 'achieved', 'result', 'results',
      'conclusion', 'conclusions', 'finding', 'findings', 'observation', 'observations',
      'experimental', 'experiments', 'experiment', 'dataset', 'datasets', 'baseline',
      'baselines', 'benchmark', 'benchmarks', 'evaluation', 'evaluations', 'comparison',
      'comparisons', 'performance', 'effectiveness', 'efficiency', 'improvement',
      'improvements', 'enhancement', 'enhancements'
    ]);
    
    // Technical terms we want to prioritize
    const technicalTerms = new Set([
      'neural', 'network', 'networks', 'deep', 'learning', 'machine', 'algorithm', 'algorithms',
      'model', 'models', 'training', 'optimization', 'gradient', 'attention', 'transformer',
      'convolution', 'convolutional', 'recurrent', 'lstm', 'gru', 'bert', 'gpt', 'encoder',
      'decoder', 'classification', 'regression', 'clustering', 'supervised', 'unsupervised',
      'reinforcement', 'data', 'feature', 'features', 'embedding', 'embeddings', 'vector',
      'vectors', 'matrix', 'tensor', 'architecture', 'framework', 'loss', 'function',
      'activation', 'layer', 'layers', 'parameter', 'parameters', 'weight', 'weights',
      'bias', 'regularization', 'dropout', 'batch', 'normalization', 'backpropagation',
      'inference', 'prediction', 'accuracy', 'precision', 'recall', 'score', 'metric',
      'metrics', 'computational', 'complexity', 'scalability', 'robustness', 'generalization'
    ]);
    
    results.forEach(paper => {
      if (!paper.abstract) return;
      
      // Extract both individual words and bigrams (two-word phrases)
      const text = paper.abstract.toLowerCase();
      
      // Clean and split into words
      const words = text
        .replace(/[^\w\s-]/g, ' ') // Keep hyphens for compound terms
        .split(/\s+/)
        .filter(word => word.length > 2);
      
      // Process individual words
      words.forEach(word => {
        // Clean word
        const cleanWord = word.replace(/^[-]+|[-]+$/g, ''); // Remove leading/trailing hyphens
        
        if (cleanWord.length > 3 && !stopWords.has(cleanWord)) {
          // Give extra weight to technical terms
          const weight = technicalTerms.has(cleanWord) ? 2 : 1;
          wordCount[cleanWord] = (wordCount[cleanWord] || 0) + weight;
        }
      });
      
      // Process bigrams (two-word phrases) for better context
      for (let i = 0; i < words.length - 1; i++) {
        const word1 = words[i].replace(/^[-]+|[-]+$/g, '');
        const word2 = words[i + 1].replace(/^[-]+|[-]+$/g, '');
        
        if (word1.length > 2 && word2.length > 2 && 
            !stopWords.has(word1) && !stopWords.has(word2)) {
          const bigram = `${word1} ${word2}`;
          
          // Only include bigrams that contain at least one technical term
          if (technicalTerms.has(word1) || technicalTerms.has(word2)) {
            wordCount[bigram] = (wordCount[bigram] || 0) + 1;
          }
        }
      }
      
      // Also include paper title words with higher weight
      if (paper.title) {
        const titleWords = paper.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 3 && !stopWords.has(word));
        
        titleWords.forEach(word => {
          const cleanWord = word.replace(/^[-]+|[-]+$/g, '');
          if (cleanWord.length > 3 && !stopWords.has(cleanWord)) {
            wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 3; // Higher weight for title words
          }
        });
      }
    });
    
    // Filter and sort results
    return Object.entries(wordCount)
      .filter(([text, value]) => value >= 2) // Only include terms that appear at least twice
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 80); // Increased from 50 to 80 words
  };

  // Handle category click in pie chart
  const handleCategoryClick = (category: string) => {
    console.log("Category clicked:", category);
    
    if (!category) {
      console.error("No category provided to handleCategoryClick");
      return;
    }
    
    // Filter papers that have this category either as primary or in their categories array
    const filtered = results.filter(paper => {
      // Get all categories from the paper
      const paperCategories = [];
      
      // Add categories from the categories array
      if (paper.categories && Array.isArray(paper.categories)) {
        paperCategories.push(...paper.categories);
      }
      
      // Add primary category if it exists and is not already in the array
      if (paper.primary_category && !paperCategories.includes(paper.primary_category)) {
        paperCategories.push(paper.primary_category);
      }
      
      // Check for exact match first
      if (paperCategories.includes(category)) {
        return true;
      }
      
      // Then try case-insensitive match
      const lowerCategory = category.toLowerCase();
      if (paperCategories.some(cat => cat.toLowerCase() === lowerCategory)) {
        return true;
      }
      
      // Finally try prefix match
      if (paperCategories.some(cat => cat.toLowerCase().startsWith(lowerCategory))) {
        return true;
      }
      
      return false;
    });
    

    
    // Get the proper label for this category
    const categoryLabel = {
      "cs.CV": "Computer Vision",
      "cs.LG": "Machine Learning",
      "cs.CL": "Computation & Language",
      "cs.AI": "Artificial Intelligence",
      "cs.NE": "Neural & Evolutionary",
      "cs.RO": "Robotics"
    }[category] || category;
    
    // Always show the filtered papers, even if empty
    setFilteredPapers(filtered);
    setModalTitle(`${filtered.length} Papers in ${categoryLabel}`);
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

  const handleDeepResearchClick = () => {
    setDeepResearchOpen(true);
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
                className="w-full px-5 py-3 bg-black/60 backdrop-blur-md border border-gray-700 text-white focus:outline-none focus:border-gray-500 transition-all duration-300 placeholder-gray-400 rounded-full"
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
                papers={results}
                onDeepResearchClick={handleDeepResearchClick}
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
                  onWordClick={handleWordClick}
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

      {/* Deep Research Modal */}
      <DeepResearchModal
        isOpen={deepResearchOpen}
        onClose={() => setDeepResearchOpen(false)}
        query={searchParams.get('q') || ''}
        papers={results}
      />
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