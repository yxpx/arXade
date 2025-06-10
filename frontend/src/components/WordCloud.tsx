"use client";

import React from "react";
import { Text } from "@visx/text";
import { scaleLog } from "@visx/scale";
import { Wordcloud } from "@visx/wordcloud";
import { Title } from "@tremor/react";
import { ParentSize } from "@visx/responsive";
import { ShineCard } from "./ui/shine-card";

interface WordData {
  text: string;
  value: number;
}

// Add visx Wordcloud Word type
interface Word {
  text: string;
  size: number;
  font: string;
  rotate: number;
  x: number;
  y: number;
}

interface WordCloudProps {
  width?: number;
  height?: number;
  words: WordData[];
  title?: string;
  onWordClick?: (word: string) => void;
}

export default function WordCloudChart({ width, height, words, title = "Common Terms in Abstracts", onWordClick }: WordCloudProps) {
  // Comprehensive stop words filter (synchronized with results page)
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
    // Additional common words
    'also', 'may', 'might', 'must', 'shall', 'now', 'mine', 'theirs', 'onto', 
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
    'conclusion', 'conclusions', 'experimental', 'experiments', 'experiment', 'dataset', 
    'datasets', 'baseline', 'baselines', 'benchmark', 'benchmarks', 'evaluation', 
    'evaluations', 'comparison', 'comparisons', 'performance', 'effectiveness', 
    'efficiency', 'improvement', 'improvements', 'enhancement', 'enhancements'
  ]);
  
  // Filter out stop words and low-value terms
  const filteredWords = words && words.length > 0 
    ? words
        .filter(w => !stopWords.has(w.text.toLowerCase()))
        .filter(w => w.text.length > 3) // Remove short words
        .filter(w => w.value > 1) // Remove words that appear only once
    : [];
    
  if (!filteredWords.length) {
    return (
      <ShineCard className="w-full">
        <div className="text-white mb-4 text-xl font-semibold">{title}</div>
        <div className="w-full h-[350px] flex items-center justify-center text-gray-400">
          No word cloud data available
        </div>
      </ShineCard>
    );
  }
  
  // Ensure we have valid domain for scale
  const minValue = Math.min(...filteredWords.map(w => w.value));
  const maxValue = Math.max(...filteredWords.map(w => w.value));
  
  const fontScale = scaleLog({
    domain: [minValue, maxValue],
    range: [14, 36], // Slightly larger font sizes for better visibility
  });

  const fontSizeSetter = (datum: WordData) => fontScale(datum.value);

  const colors = [
    "#3b82f6", "#60a5fa", "#06b6d4", "#8b5cf6", "#a855f7", "#d946ef", 
    "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981",
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e"
  ];

  const handleWordClick = (word: string) => {
    if (onWordClick) {
      onWordClick(word);
    }
  };

  const renderWordCloud = (width: number, height: number) => {
    const cloudWidth = Math.min(width - 40, 800); // Add padding and max width
    const cloudHeight = height - 70;
    
    return (
      <div className="flex justify-center items-center w-full h-full">
        <Wordcloud
          words={filteredWords}
          width={cloudWidth}
          height={cloudHeight}
          fontSize={fontSizeSetter}
          font={"Arial Black"}
          padding={4} // Slightly more padding between words
          spiral="archimedean" // Better spiral algorithm for centering
          rotate={0}
          random={() => 0.5} // Better random seed for consistent positioning
        >
          {(cloudWords: any[]) =>
            cloudWords.map((w: any, i: number) => (
              <Text
                key={w.text}
                fill={colors[i % colors.length]}
                textAnchor="middle"
                transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                fontSize={w.size}
                fontFamily="Arial Black"
                fontWeight="900"
                style={{ 
                  textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  filter: 'brightness(1.1)'
                }}
                className="hover:opacity-70 hover:drop-shadow-lg"
                onClick={() => handleWordClick(w.text)}
              >
                {w.text}
              </Text>
            ))
          }
        </Wordcloud>
      </div>
    );
  };

  return (
    <ShineCard className="w-full">
      <div className="text-white mb-4 text-xl font-semibold">{title}</div>
      <div className="w-full h-[400px] flex items-center justify-center bg-gradient-to-br from-gray-950/60 to-gray-900/40 rounded-lg border border-gray-700/30">
        {width && height ? (
          renderWordCloud(width, height)
        ) : (
          <ParentSize>
            {({ width, height }) => renderWordCloud(width, height)}
          </ParentSize>
        )}
      </div>
    </ShineCard>
  );
} 