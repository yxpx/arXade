"use client";

import { useState } from "react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ShineCard } from "./ui/shine-card";

interface PieChartProps {
  data: {
    category: string;
    count: number;
  }[];
  title?: string;
  onSliceClick: (category: string) => void;
}

// Define category labels
const categoryLabels: Record<string, string> = {
  "cs.CV": "Computer Vision",
  "cs.LG": "Machine Learning",
  "cs.CL": "Computation & Language",
  "cs.AI": "Artificial Intelligence",
  "cs.NE": "Neural & Evolutionary",
  "cs.RO": "Robotics",
  "other": "Other Categories",
};

const COLORS = ["#3b82f6", "#06b6d4", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef"];

export default function PieChart({ data, title = "Papers by Category", onSliceClick }: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <ShineCard>
        <div className="text-white mb-4 text-xl font-semibold">{title}</div>
        <div className="h-60 flex items-center justify-center text-gray-400">
          No category data available
        </div>
      </ShineCard>
    );
  }

  // Format data for display
  const formattedData = data.map((item, index) => ({
    category: item.category,
    count: item.count,
    name: categoryLabels[item.category] || item.category,
    color: COLORS[index % COLORS.length],
  }));

  // Filter out 0 count items for the pie chart display only
  const pieChartData = formattedData.filter(item => item.count > 0);

  // Calculate total papers
  const totalPapers = data.reduce((sum, item) => sum + item.count, 0);

  const handleClick = (data: any) => {
    if (data && data.category) {
      onSliceClick(data.category);
    }
  };

  return (
    <ShineCard className="h-[500px] flex flex-col">
      <div className="text-white mb-4 text-xl font-semibold">{title}</div>
      <div className="text-center text-gray-300 mb-2">{totalPapers} Papers Total</div>
      
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="60%">
          <RechartsPieChart>
            <Pie
              data={pieChartData.length > 0 ? pieChartData : [{ category: 'no-data', count: 1, name: 'No Data', color: '#374151' }]}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              fill="#8884d8"
              dataKey="count"
              onClick={handleClick}
            >
              {(pieChartData.length > 0 ? pieChartData : [{ color: '#374151' }]).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} Papers`, 'Count']}
              labelFormatter={(label) => categoryLabels[label] || label}
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#fff'
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
        
        <div className="mt-4 grid grid-cols-2 gap-2">
          {formattedData.map((item, i) => (
            <div 
              key={i} 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80"
              onClick={() => onSliceClick(item.category)}
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-300">
                {categoryLabels[item.category] || item.category} ({item.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </ShineCard>
  );
} 