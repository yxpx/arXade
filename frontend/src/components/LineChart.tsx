"use client";

import { useState } from "react";
import { Title, LineChart as TremorLineChart } from "@tremor/react";
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

  const handleYearClick = (year: number) => {
    setSelectedYear(year);
    onPointClick(year);
  };

  const valueFormatter = (number: number) => `${number} Papers`;

  if (!data || data.length === 0) {
    return (
      <ShineCard>
        <Title className="text-white mb-4">{title}</Title>
        <div className="h-40 flex items-center justify-center text-gray-400">
          No year data available
        </div>
      </ShineCard>
    );
  }

  return (
    <ShineCard>
      <Title className="text-white mb-4">{title}</Title>
      <TremorLineChart
        data={data}
        index="year"
        categories={["count"]}
        colors={["blue"]}
        valueFormatter={valueFormatter}
        onValueChange={(v) => v && handleYearClick(Number(v.year))}
        showAnimation={true}
        showLegend={false}
        className="h-40 mt-4"
      />
    </ShineCard>
  );
} 