"use client";

import { useState } from "react";
import { DonutChart, Title, Legend } from "@tremor/react";
import { ShineCard } from "./ui/shine-card";

interface PieChartProps {
  data: {
    category: string;
    count: number;
  }[];
  title?: string;
  onSliceClick: (category: string) => void;
}

export default function PieChart({ data, title = "Papers by Category", onSliceClick }: PieChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    onSliceClick(category);
  };

  // Add colors for categories
  const valueFormatter = (number: number) => `${number} Papers`;

  if (!data || data.length === 0) {
    return (
      <ShineCard>
        <Title className="text-white mb-4">{title}</Title>
        <div className="h-40 flex items-center justify-center text-gray-400">
          No category data available
        </div>
      </ShineCard>
    );
  }

  return (
    <ShineCard>
      <Title className="text-white mb-4">{title}</Title>
      <DonutChart
        data={data}
        category="count"
        index="category"
        valueFormatter={valueFormatter}
        colors={["blue", "sky", "indigo", "violet", "purple", "fuchsia"]}
        showAnimation={true}
        onValueChange={(v) => v && handleCategoryClick(v.category)}
        className="mt-6 h-40"
      />
      <Legend
        categories={data.map((item) => item.category)}
        colors={["blue", "sky", "indigo", "violet", "purple", "fuchsia"]}
        className="mt-3 text-white"
      />
    </ShineCard>
  );
} 