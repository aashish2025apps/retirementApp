"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { YearlyProjection } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export interface ScenarioSeries {
  name: string;
  color: string;
  projections: YearlyProjection[];
}

interface Props {
  series: ScenarioSeries[];
  retirementAge?: number;
}

const fmt = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1000
    ? `$${(v / 1000).toFixed(0)}K`
    : `$${v.toFixed(0)}`;

export function ScenarioLineChart({ series, retirementAge }: Props) {
  // Merge all projections by age
  const allAges = Array.from(
    new Set(series.flatMap((s) => s.projections.map((p) => p.age)))
  ).sort((a, b) => a - b);

  const data = allAges.map((age) => {
    const row: Record<string, number> = { age };
    for (const s of series) {
      const p = s.projections.find((p) => p.age === age);
      row[s.name] = p ? Math.round(p.totalAssets) : 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="age"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          label={{ value: "Age", position: "insideBottom", offset: -2, fontSize: 11 }}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <Tooltip
          formatter={(v, name) => [formatCurrency(Number(v)), name]}
          labelFormatter={(age) => `Age ${age}`}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {retirementAge && (
          <ReferenceLine
            x={retirementAge}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: "Retire", fill: "#ef4444", fontSize: 11 }}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
