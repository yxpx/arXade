"use client";

import { useState } from "react";
import { LineChart as RechartLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ShineCard } from "./ui/shine-card";

interface LineChartProps {
  data: {
    year: number;
    count: number;
  }[];
  title?: string;
  onPointClick: (year: number) => void;
}

export default function LineChart({ data, title = "Papers by Year", onPointClick }: LineChartProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const handleYearClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const year = data.activePayload[0].payload.year;
      setSelectedYear(year);
      onPointClick(year);
    }
  };

  if (!data || data.length === 0) {
    return (
      <ShineCard>
        <div className="text-white mb-4 text-xl font-semibold">{title}</div>
        <div className="h-60 flex items-center justify-center text-gray-400">
          No year data available
        </div>
      </ShineCard>
    );
  }

  // Calculate total papers
  const totalPapers = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <ShineCard className="h-[500px] flex flex-col">
      <div className="text-white mb-4 text-xl font-semibold">{title}</div>
      <div className="text-center text-gray-300 mb-2">{totalPapers} Papers Total</div>
      
      <div className="flex-1 min-h-0 px-4">
        <ResponsiveContainer width="100%" height="85%">
          <RechartLineChart
            data={data}
            margin={{
              top: 20,
              right: 20,
              left: 10,
              bottom: 20,
            }}
            onClick={handleYearClick}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="year" 
              stroke="#9CA3AF"
              fontSize={11}
              tickMargin={8}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={11}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#fff'
              }}
              formatter={(value: number) => [`${value} Papers`, 'Count']}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#1e40af' }}
            />
          </RechartLineChart>
        </ResponsiveContainer>
      </div>
    </ShineCard>
  );
} 