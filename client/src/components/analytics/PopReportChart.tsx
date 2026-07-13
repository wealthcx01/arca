/**
 * Population distribution bar chart (uses recharts — simple bar chart, not financial).
 */

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface PopData {
  grade: string;
  population: number;
  grading_company: string;
}

interface PopReportChartProps {
  data: PopData[];
}

export function PopReportChart({ data }: PopReportChartProps) {
  if (data.length === 0) return null;

  // Group by company
  const companies = [...new Set(data.map((d) => d.grading_company))];

  const chartData = data
    .sort((a, b) => Number(b.grade) - Number(a.grade))
    .map((d) => ({
      name: `${d.grading_company} ${d.grade}`,
      population: d.population,
    }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} />
        <Tooltip
          contentStyle={{
            fontSize: 11,
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
          }}
        />
        <Bar dataKey="population" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
