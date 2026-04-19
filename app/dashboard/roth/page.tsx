"use client";

import { useMemo } from "react";
import { useRetirementStore } from "@/lib/store";
import { runProjection } from "@/lib/calculations/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CurrencyField, AgeField } from "@/components/forms/field";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { RothConversion, RothStrategyMode } from "@/lib/types";

const DEFAULT_RC: RothConversion = {
  strategy: "none",
  targetBracketRate: 22,
  fixedAnnualAmount: 20000,
  startAge: 65,
  endAge: 72,
};

const fmt = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;

function StrategyButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-lg border px-4 py-3 text-sm text-left transition-colors w-full",
        active
          ? "border-primary bg-primary/5 font-medium"
          : "border-border hover:border-primary/50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function RothPage() {
  const { scenarioData, updateScenarioData } = useRetirementStore();
  const rc = scenarioData.rothConversion ?? DEFAULT_RC;
  const { profile } = scenarioData;

  function update(patch: Partial<RothConversion>) {
    updateScenarioData({ rothConversion: { ...rc, ...patch } });
  }

  // Run two projections: with and without conversions
  const baseData = useMemo(
    () => ({ ...scenarioData, rothConversion: { ...rc, strategy: "none" as RothStrategyMode } }),
    [scenarioData, rc]
  );
  const convData = scenarioData;

  const baseResult = useMemo(() => runProjection(baseData), [baseData]);
  const convResult = useMemo(() => runProjection(convData), [convData]);

  const hasConversion = rc.strategy !== "none";

  // Chart data: retirement years only
  const chartData = useMemo(() => {
    const ages = baseResult.projections
      .filter((p) => p.isRetired)
      .map((p) => p.age);

    return ages.map((age) => {
      const b = baseResult.projections.find((p) => p.age === age)!;
      const c = convResult.projections.find((p) => p.age === age)!;
      return {
        age,
        "Trad (base)": Math.round(b.k401Balance + b.iraBalance),
        "Roth (base)": Math.round(b.rothBalance),
        ...(hasConversion
          ? {
              "Trad (conv)": Math.round(c.k401Balance + c.iraBalance),
              "Roth (conv)": Math.round(c.rothBalance),
            }
          : {}),
      };
    });
  }, [baseResult, convResult, hasConversion]);

  // Conversion window years for the schedule table
  const convYears = useMemo(
    () =>
      convResult.projections.filter(
        (p) => p.isRetired && p.age >= rc.startAge && p.age <= rc.endAge + 3
      ),
    [convResult, rc]
  );

  // Summary stats
  const retAge = profile.retirementAge;
  const convWindowEnd = Math.min(72, profile.lifeExpectancy - 1);
  const windowYears = Math.max(0, convWindowEnd - retAge);

  const totalConverted = convResult.projections.reduce((s, p) => s + p.rothConversionAmount, 0);
  const totalTaxPaid = convResult.projections.reduce((s, p) => s + p.conversionTaxCost, 0);

  const baseRothAtEnd = baseResult.projections.at(-1)?.rothBalance ?? 0;
  const convRothAtEnd = convResult.projections.at(-1)?.rothBalance ?? 0;
  const baseTradAtEnd = baseResult.projections.at(-1);
  const convTradAtEnd = convResult.projections.at(-1);
  const baseTradFinal = (baseTradAtEnd?.k401Balance ?? 0) + (baseTradAtEnd?.iraBalance ?? 0);
  const convTradFinal = (convTradAtEnd?.k401Balance ?? 0) + (convTradAtEnd?.iraBalance ?? 0);

  // Estimated lifetime tax savings (rough: traditional balance taxed at effective rate vs Roth tax-free)
  const tradTaxSavings = (baseTradFinal - convTradFinal) * (profile.lifeExpectancy - 73 > 0 ? 0.22 : 0);
  const rothGain = convRothAtEnd - baseRothAtEnd;
  const lifetimeBenefit = rothGain - totalTaxPaid;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Roth Conversion Planner</h1>
        <p className="text-muted-foreground">
          Convert traditional IRA/401k funds to Roth during low-income years to reduce lifetime taxes.
        </p>
      </div>

      {/* Conversion window timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Conversion Window</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              {[
                { label: `Retire`, age: retAge, color: "bg-blue-500" },
                {
                  label: `SS`,
                  age: scenarioData.socialSecurity?.claimingAge ?? 67,
                  color: "bg-green-500",
                },
                { label: `RMDs`, age: 73, color: "bg-orange-500" },
                { label: `End`, age: profile.lifeExpectancy, color: "bg-gray-400" },
              ].map(({ label, age, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{age}</span>
                </div>
              ))}
            </div>

            {/* Visual timeline */}
            <div className="relative h-10 rounded-full bg-muted overflow-hidden">
              {(() => {
                const span = profile.lifeExpectancy - retAge;
                const ssStart = scenarioData.socialSecurity?.claimingAge ?? 67;
                const rmdStart = 73;
                const windowLeft = ((rc.startAge - retAge) / span) * 100;
                const windowWidth = ((Math.min(rc.endAge, 72) - rc.startAge) / span) * 100;

                return (
                  <>
                    {hasConversion && (
                      <div
                        className="absolute h-full bg-primary/20 border-x-2 border-primary"
                        style={{ left: `${Math.max(0, windowLeft)}%`, width: `${Math.max(0, windowWidth)}%` }}
                      />
                    )}
                    {[
                      { age: retAge, color: "bg-blue-500", label: retAge },
                      { age: ssStart, color: "bg-green-500", label: ssStart },
                      { age: rmdStart, color: "bg-orange-500", label: rmdStart },
                    ].map(({ age, color, label }) => (
                      <div
                        key={age}
                        className={`absolute top-0 flex flex-col items-center`}
                        style={{ left: `${((age - retAge) / span) * 100}%` }}
                      >
                        <div className={`h-10 w-0.5 ${color}`} />
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>

            <p className="text-sm text-muted-foreground">
              {windowYears > 0
                ? `The optimal conversion window is typically ages ${retAge}–72 — after income drops at retirement and before RMDs force taxable withdrawals at 73.`
                : `You retire at ${retAge}, which is at or after the RMD age (73). Conversion opportunities may be limited.`}
              {windowYears > 0 && (
                <span className="ml-1 font-medium text-foreground">
                  You have a {windowYears}-year window.
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Strategy config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <StrategyButton
                label="No conversions (baseline)"
                active={rc.strategy === "none"}
                onClick={() => update({ strategy: "none" })}
              />
              <StrategyButton
                label="Bracket fill — convert up to a target tax bracket each year"
                active={rc.strategy === "bracket-fill"}
                onClick={() => update({ strategy: "bracket-fill" })}
              />
              <StrategyButton
                label="Fixed amount — convert a set dollar amount each year"
                active={rc.strategy === "fixed-amount"}
                onClick={() => update({ strategy: "fixed-amount" })}
              />
            </div>

            {rc.strategy === "bracket-fill" && (
              <div className="space-y-1.5">
                <Label className="text-sm">Fill up to the:</Label>
                <div className="flex gap-2">
                  {([12, 22, 24] as const).map((rate) => (
                    <button
                      key={rate}
                      onClick={() => update({ targetBracketRate: rate })}
                      className={[
                        "flex-1 rounded-md border py-2 text-sm transition-colors",
                        rc.targetBracketRate === rate
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50",
                      ].join(" ")}
                    >
                      {rate}% bracket
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  22% bracket is most common — low enough to be meaningful, high enough to convert significant amounts.
                </p>
              </div>
            )}

            {rc.strategy === "fixed-amount" && (
              <CurrencyField
                label="Annual conversion amount"
                value={rc.fixedAnnualAmount}
                onChange={(v) => update({ fixedAnnualAmount: v })}
                hint="Typical range: $10,000–$50,000/yr"
              />
            )}

            {rc.strategy !== "none" && (
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <Label className="text-sm">
                    Conversion window: ages <strong>{rc.startAge}</strong> – <strong>{rc.endAge}</strong>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <AgeField
                      label="Start age"
                      value={rc.startAge}
                      onChange={(v) => update({ startAge: Math.min(v, rc.endAge - 1) })}
                      min={Math.max(profile.retirementAge, 50)}
                      max={72}
                    />
                    <AgeField
                      label="End age"
                      value={rc.endAge}
                      onChange={(v) => update({ endAge: Math.max(v, rc.startAge + 1) })}
                      min={rc.startAge + 1}
                      max={75}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Impact summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Projected Impact
              {!hasConversion && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — select a strategy to see impact
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                label: "Readiness score",
                base: `${baseResult.readinessScore}/100`,
                conv: `${convResult.readinessScore}/100`,
                better: convResult.readinessScore >= baseResult.readinessScore,
              },
              {
                label: "Traditional balance at end",
                base: formatCurrency(baseTradFinal),
                conv: formatCurrency(convTradFinal),
                better: convTradFinal <= baseTradFinal,
              },
              {
                label: "Roth balance at end",
                base: formatCurrency(baseRothAtEnd),
                conv: formatCurrency(convRothAtEnd),
                better: convRothAtEnd >= baseRothAtEnd,
              },
              {
                label: "Total net worth at end",
                base: formatCurrency(baseResult.projections.at(-1)?.totalAssets ?? 0),
                conv: formatCurrency(convResult.projections.at(-1)?.totalAssets ?? 0),
                better:
                  (convResult.projections.at(-1)?.totalAssets ?? 0) >=
                  (baseResult.projections.at(-1)?.totalAssets ?? 0),
              },
            ].map(({ label, base, conv, better }) => (
              <div
                key={label}
                className="grid grid-cols-3 items-center gap-2 py-2 text-sm border-b last:border-0"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="text-center font-medium text-muted-foreground">{base}</span>
                <span
                  className={[
                    "text-center font-medium",
                    hasConversion ? (better ? "text-green-600" : "text-orange-500") : "text-muted-foreground",
                  ].join(" ")}
                >
                  {hasConversion ? conv : "—"}
                </span>
              </div>
            ))}

            {hasConversion && totalConverted > 0 && (
              <div className="rounded-lg bg-primary/5 p-3 space-y-1 text-sm mt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total converted</span>
                  <span className="font-medium">{formatCurrency(totalConverted)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxes paid upfront</span>
                  <span className="font-medium">{formatCurrency(totalTaxPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Roth growth gained</span>
                  <span className={`font-medium ${lifetimeBenefit >= 0 ? "text-green-600" : "text-orange-500"}`}>
                    {lifetimeBenefit >= 0 ? "+" : ""}{formatCurrency(lifetimeBenefit)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
              <span />
              <span className="text-center">No conversion</span>
              <span className="text-center text-primary">With conversion</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traditional vs Roth chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Traditional vs Roth Balances in Retirement</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
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
                labelFormatter={(a) => `Age ${a}`}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine x={73} stroke="#f59e0b" strokeDasharray="4 4"
                label={{ value: "RMDs", fill: "#f59e0b", fontSize: 10 }} />
              <Line type="monotone" dataKey="Trad (base)" stroke="#ef4444" strokeWidth={1.5}
                strokeDasharray="5 3" dot={false} />
              <Line type="monotone" dataKey="Roth (base)" stroke="#6366f1" strokeWidth={1.5}
                strokeDasharray="5 3" dot={false} />
              {hasConversion && (
                <>
                  <Line type="monotone" dataKey="Trad (conv)" stroke="#ef4444" strokeWidth={2.5}
                    dot={false} />
                  <Line type="monotone" dataKey="Roth (conv)" stroke="#6366f1" strokeWidth={2.5}
                    dot={false} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Year-by-year conversion table */}
      {hasConversion && convYears.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion Schedule</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                  <th className="py-2 text-left font-semibold">Age</th>
                  <th className="py-2 text-right font-semibold">SS Income</th>
                  <th className="py-2 text-right font-semibold">RMD</th>
                  <th className="py-2 text-right font-semibold">Conversion</th>
                  <th className="py-2 text-right font-semibold">Tax Cost</th>
                  <th className="py-2 text-right font-semibold">Trad Balance</th>
                  <th className="py-2 text-right font-semibold">Roth Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {convYears.map((p) => (
                  <tr
                    key={p.age}
                    className={[
                      "hover:bg-muted/30 transition-colors",
                      p.age >= rc.startAge && p.age <= rc.endAge && p.rothConversionAmount > 0
                        ? "bg-primary/3"
                        : "",
                    ].join(" ")}
                  >
                    <td className="py-2.5 font-medium">
                      {p.age}
                      {p.age === 73 && (
                        <Badge variant="outline" className="ml-2 text-xs text-orange-500 border-orange-300">
                          RMDs start
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {p.ssIncome > 0 ? formatCurrency(p.ssIncome) : "—"}
                    </td>
                    <td className="py-2.5 text-right text-orange-500">
                      {p.rmdAmount > 0 ? formatCurrency(p.rmdAmount) : "—"}
                    </td>
                    <td className="py-2.5 text-right text-primary font-medium">
                      {p.rothConversionAmount > 0 ? formatCurrency(p.rothConversionAmount) : "—"}
                    </td>
                    <td className="py-2.5 text-right text-red-500">
                      {p.conversionTaxCost > 0 ? formatCurrency(p.conversionTaxCost) : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      {formatCurrency(p.k401Balance + p.iraBalance)}
                    </td>
                    <td className="py-2.5 text-right">
                      {formatCurrency(p.rothBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">How this works:</strong> Conversions move money from tax-deferred accounts
        to Roth. You pay income tax on the converted amount now, but future growth and withdrawals are
        tax-free. Tax costs are paid from your taxable account. RMDs (age 73+) use the IRS Uniform
        Lifetime Table. Bracket calculations use 2024 rates, inflation-indexed at 2%/yr.
      </div>
    </div>
  );
}
