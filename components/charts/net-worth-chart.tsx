"use client";

import {
  AreaChart,
  Area,
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

interface Props {
  projections: YearlyProjection[];
  retirementAge: number;
}

const fmt = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1000
    ? `$${(v / 1000).toFixed(0)}K`
    : `$${v.toFixed(0)}`;

export function NetWorthChart({ projections, retirementAge }: Props) {
  const data = projections.map((p) => ({
    age: p.age,
    "401k / IRA": Math.round(p.k401Balance + p.iraBalance),
    "Roth": Math.round(p.rothBalance),
    "Taxable": Math.round(p.taxableBalance),
    "HSA": Math.round(p.hsaBalance),
    ...(p.homeEquity > 0 ? { "Home Equity": Math.round(p.homeEquity) } : {}),
    ...(p.balance529 > 0 ? { "529": Math.round(p.balance529) } : {}),
  }));

  const hasHomeEquity = projections.some((p) => p.homeEquity > 0);
  const has529 = projections.some((p) => p.balance529 > 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <defs>
          {["#6366f1", "#22c55e", "#f59e0b", "#06b6d4", "#a78bfa", "#fb923c"].map((color, i) => (
            <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
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
          formatter={(v) => [formatCurrency(Number(v)), ""]}
          labelFormatter={(age) => `Age ${age}`}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine
          x={retirementAge}
          stroke="#ef4444"
          strokeDasharray="4 4"
          label={{ value: "Retire", fill: "#ef4444", fontSize: 11 }}
        />
        {[
          { key: "401k / IRA", color: "#6366f1" },
          { key: "Roth", color: "#22c55e" },
          { key: "Taxable", color: "#f59e0b" },
          { key: "HSA", color: "#06b6d4" },
          ...(hasHomeEquity ? [{ key: "Home Equity", color: "#a78bfa" }] : []),
          ...(has529 ? [{ key: "529", color: "#fb923c" }] : []),
        ].map(({ key, color }, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stackId="1"
            stroke={color}
            fill={`url(#grad${i})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
