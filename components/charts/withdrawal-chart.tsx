"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { YearlyProjection } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const fmt = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1000
    ? `$${(v / 1000).toFixed(0)}K`
    : `$${v.toFixed(0)}`;

export function WithdrawalChart({ projections }: { projections: YearlyProjection[] }) {
  const data = projections.map((p) => ({
    age: p.age,
    Portfolio: Math.round(p.totalAssets),
    Withdrawal: Math.round(p.withdrawal),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="withdrawalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="age"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
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
        <Area
          type="monotone"
          dataKey="Portfolio"
          stroke="#6366f1"
          fill="url(#portfolioGrad)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="Withdrawal"
          stroke="#ef4444"
          fill="url(#withdrawalGrad)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
