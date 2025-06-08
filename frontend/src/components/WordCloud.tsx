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
}

export default function WordCloudChart({ width, height, words, title = "Common Terms in Abstracts" }: WordCloudProps) {
  // We need to exclude common words
  const commonWords = new Set([
    "the", "and", "to", "of", "a", "in", "is", "that", "it", "with", "as", "for", 
    "on", "was", "be", "by", "at", "this", "an", "which", "are", "from", "or", "have", "has",
    "we", "our", "can", "been", "not", "their", "they", "these", "such", "were", "its"
  ]);
  
  // Filter out common words and ensure we have words to display
  const filteredWords = words && words.length > 0 
    ? words.filter(w => !commonWords.has(w.text.toLowerCase()))
    : [];
    
  if (!filteredWords.length) {
    return (
      <ShineCard className="w-full">
        <Title className="text-white mb-4">{title}</Title>
        <div className="w-full h-[250px] flex items-center justify-center text-gray-400">
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
    range: [12, 32],
  });

  const fontSizeSetter = (datum: WordData) => fontScale(datum.value);

  const colors = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#0ea5e9", "#0284c7"];
  const getColor = (d: WordData, i: number) => colors[i % colors.length];

  const renderWordCloud = (width: number, height: number) => (
    <Wordcloud
      words={filteredWords}
      width={width}
      height={height - 70} // Subtract header height
      fontSize={fontSizeSetter}
      font={"Impact"}
      padding={2}
      spiral="rectangular"
      rotate={0}
      random={() => 0.5}
    >
      {(cloudWords: any[]) =>
        cloudWords.map((w: any, i: number) => (
          <Text
            key={w.text}
            fill={colors[i % colors.length]}
            textAnchor="middle"
            transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
            fontSize={w.size}
            fontFamily={w.font}
          >
            {w.text}
          </Text>
        ))
      }
    </Wordcloud>
  );

  return (
    <ShineCard className="w-full">
      <Title className="text-white mb-4">{title}</Title>
      <div className="w-full h-[250px] flex items-center justify-center">
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