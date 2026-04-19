"use client";

import { useEffect, useMemo, useState } from "react";
import { useRetirementStore } from "@/lib/store";
import { runProjection } from "@/lib/calculations/engine";
import { ScenarioLineChart, type ScenarioSeries } from "@/components/charts/scenario-line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { ScenarioData, ProjectionResult } from "@/lib/types";

const SERIES_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#06b6d4", "#ec4899"];

interface LoadedScenario {
  id: string;
  name: string;
  data: ScenarioData;
  result: ProjectionResult;
}

function MetricRow({ label, base, modified }: { label: string; base: string; modified: string }) {
  return (
    <div className="grid grid-cols-3 items-center gap-4 py-2.5 text-sm border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-center">{base}</span>
      <span className="font-medium text-center text-primary">{modified}</span>
    </div>
  );
}

export default function ScenariosPage() {
  const { scenarioData, scenarioList } = useRetirementStore();

  // ── What-if state ──────────────────────────────────────────────────────────
  const [retirementAgeOffset, setRetirementAgeOffset] = useState(0);
  const [spendingPct, setSpendingPct] = useState(100);
  const [savingsOffset, setSavingsOffset] = useState(0); // $/month
  const [returnOffset, setReturnOffset] = useState(0);   // %

  const baseResult = useMemo(() => runProjection(scenarioData), [scenarioData]);

  const whatIfData = useMemo<ScenarioData>(() => ({
    ...scenarioData,
    profile: {
      ...scenarioData.profile,
      retirementAge: scenarioData.profile.retirementAge + retirementAgeOffset,
    },
    spending: {
      ...scenarioData.spending,
      monthlyBudget: scenarioData.spending.monthlyBudget * (spendingPct / 100),
    },
    accounts: {
      ...scenarioData.accounts,
      k401Contribution: Math.max(0, scenarioData.accounts.k401Contribution + savingsOffset * 12),
    },
    assumptions: {
      ...scenarioData.assumptions,
      stockReturnRate: scenarioData.assumptions.stockReturnRate + returnOffset,
    },
  }), [scenarioData, retirementAgeOffset, spendingPct, savingsOffset, returnOffset]);

  const whatIfResult = useMemo(() => runProjection(whatIfData), [whatIfData]);

  const isModified = retirementAgeOffset !== 0 || spendingPct !== 100 || savingsOffset !== 0 || returnOffset !== 0;

  const whatIfSeries: ScenarioSeries[] = [
    { name: "Base", color: "#6366f1", projections: baseResult.projections },
    ...(isModified ? [{ name: "Modified", color: "#f59e0b", projections: whatIfResult.projections }] : []),
  ];

  // ── Saved plan comparison ──────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadedScenarios, setLoadedScenarios] = useState<Map<string, LoadedScenario>>(new Map());
  const [loading, setLoading] = useState<string | null>(null);

  // Fetch scenarios list on mount
  useEffect(() => {
    // scenarioList is already loaded by the store
  }, []);

  async function toggleScenario(id: string, name: string) {
    if (selectedIds.has(id)) {
      setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      return;
    }
    if (selectedIds.size >= 4) return; // cap at 4 for readability
    setLoading(id);
    try {
      const res = await fetch(`/api/scenarios/${id}`);
      const scenario = await res.json();
      const data: ScenarioData = {
        profile: scenario.profile,
        income: scenario.income,
        accounts: scenario.accounts,
        spending: scenario.spending,
        assumptions: scenario.assumptions,
        socialSecurity: scenario.socialSecurity ?? undefined,
      };
      const result = runProjection(data);
      setLoadedScenarios((prev) => new Map(prev).set(id, { id, name, data, result }));
      setSelectedIds((prev) => new Set([...prev, id]));
    } finally {
      setLoading(null);
    }
  }

  const selectedScenarios = Array.from(selectedIds)
    .map((id) => loadedScenarios.get(id))
    .filter(Boolean) as LoadedScenario[];

  const comparisonSeries: ScenarioSeries[] = selectedScenarios.map((s, i) => ({
    name: s.name,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
    projections: s.result.projections,
  }));

  const safeWithdrawalBase =
    baseResult.projectedRetirementAssets > 0
      ? ((baseResult.annualRetirementIncome - baseResult.annualSsIncome) / baseResult.projectedRetirementAssets * 100).toFixed(1)
      : "—";
  const safeWithdrawalModified =
    whatIfResult.projectedRetirementAssets > 0
      ? ((whatIfResult.annualRetirementIncome - whatIfResult.annualSsIncome) / whatIfResult.projectedRetirementAssets * 100).toFixed(1)
      : "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Scenario Comparison</h1>
        <p className="text-muted-foreground">Explore what-if changes and compare saved plans</p>
      </div>

      {/* ── What-if ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">What-If Analysis</h2>
        <p className="text-sm text-muted-foreground">
          Adjust sliders to see how changes affect your current scenario in real time.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Sliders card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Adjust Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>
                  Retirement age:{" "}
                  <strong>
                    {scenarioData.profile.retirementAge + retirementAgeOffset}
                  </strong>
                  {retirementAgeOffset !== 0 && (
                    <span className={`ml-2 text-sm ${retirementAgeOffset > 0 ? "text-orange-500" : "text-green-500"}`}>
                      {retirementAgeOffset > 0 ? `+${retirementAgeOffset}` : retirementAgeOffset} yrs
                    </span>
                  )}
                </Label>
                <Slider
                  min={-5}
                  max={10}
                  step={1}
                  value={[retirementAgeOffset]}
                  onValueChange={(v) => setRetirementAgeOffset(Array.isArray(v) ? v[0] : (v as number))}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 yrs earlier</span>
                  <span>10 yrs later</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Monthly spending:{" "}
                  <strong>{formatCurrency(scenarioData.spending.monthlyBudget * spendingPct / 100)}/mo</strong>
                  {spendingPct !== 100 && (
                    <span className={`ml-2 text-sm ${spendingPct > 100 ? "text-orange-500" : "text-green-500"}`}>
                      {spendingPct > 100 ? "+" : ""}{spendingPct - 100}%
                    </span>
                  )}
                </Label>
                <Slider
                  min={60}
                  max={150}
                  step={5}
                  value={[spendingPct]}
                  onValueChange={(v) => setSpendingPct(Array.isArray(v) ? v[0] : (v as number))}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>−40% (frugal)</span>
                  <span>+50% (lavish)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Extra 401k savings:{" "}
                  <strong>
                    {savingsOffset > 0 ? "+" : ""}{savingsOffset === 0 ? "none" : formatCurrency(savingsOffset) + "/mo"}
                  </strong>
                </Label>
                <Slider
                  min={-500}
                  max={1000}
                  step={100}
                  value={[savingsOffset]}
                  onValueChange={(v) => setSavingsOffset(Array.isArray(v) ? v[0] : (v as number))}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>−$500/mo</span>
                  <span>+$1,000/mo</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Stock return assumption:{" "}
                  <strong>
                    {scenarioData.assumptions.stockReturnRate + returnOffset}%
                  </strong>
                  {returnOffset !== 0 && (
                    <span className={`ml-2 text-sm ${returnOffset < 0 ? "text-orange-500" : "text-green-500"}`}>
                      {returnOffset > 0 ? "+" : ""}{returnOffset}%
                    </span>
                  )}
                </Label>
                <Slider
                  min={-3}
                  max={3}
                  step={0.5}
                  value={[returnOffset]}
                  onValueChange={(v) => setReturnOffset(Array.isArray(v) ? v[0] : (v as number))}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Pessimistic (−3%)</span>
                  <span>Optimistic (+3%)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics comparison card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                <span>Metric</span>
                <span className="text-center">Base</span>
                <span className="text-center text-primary">Modified</span>
              </div>
              <MetricRow
                label="Readiness score"
                base={`${baseResult.readinessScore}/100`}
                modified={`${whatIfResult.readinessScore}/100`}
              />
              <MetricRow
                label="Success rate"
                base={`${baseResult.successRate}%`}
                modified={`${whatIfResult.successRate}%`}
              />
              <MetricRow
                label="Retirement assets"
                base={formatCurrency(baseResult.projectedRetirementAssets)}
                modified={formatCurrency(whatIfResult.projectedRetirementAssets)}
              />
              <MetricRow
                label="Retirement age"
                base={`Age ${baseResult.retirementAge}`}
                modified={`Age ${whatIfResult.retirementAge}`}
              />
              <MetricRow
                label="Withdrawal rate"
                base={`${safeWithdrawalBase}%`}
                modified={`${safeWithdrawalModified}%`}
              />
              <MetricRow
                label="Shortfall age"
                base={baseResult.shortfallAge ? `Age ${baseResult.shortfallAge}` : "None"}
                modified={whatIfResult.shortfallAge ? `Age ${whatIfResult.shortfallAge}` : "None"}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Net Worth Over Time
              {!isModified && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — adjust sliders above to see the modified scenario
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ScenarioLineChart series={whatIfSeries} retirementAge={baseResult.retirementAge} />
          </CardContent>
        </Card>
      </div>

      {/* ── Saved plan comparison ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Compare Saved Plans</h2>
        <p className="text-sm text-muted-foreground">
          Select up to 4 saved plans to compare side by side.
        </p>

        {scenarioList.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
            No saved plans yet. Save a plan from the{" "}
            <a href="/dashboard/saved-plans" className="underline text-primary">
              Saved Plans
            </a>{" "}
            page to compare here.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {scenarioList.map((s) => {
                const isSelected = selectedIds.has(s.id);
                const isLoading = loading === s.id;
                const disabled = !isSelected && selectedIds.size >= 4;
                return (
                  <button
                    key={s.id}
                    onClick={() => !disabled && !isLoading && toggleScenario(s.id, s.name)}
                    className={[
                      "rounded-full border px-4 py-1.5 text-sm transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50",
                      disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                    ].join(" ")}
                  >
                    {isLoading ? "Loading…" : s.name}
                    {s.isDefault && <span className="ml-1 opacity-60">★</span>}
                  </button>
                );
              })}
            </div>

            {selectedScenarios.length >= 2 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Net Worth Over Time</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ScenarioLineChart series={comparisonSeries} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Metrics Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="grid text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide"
                      style={{ gridTemplateColumns: `1fr repeat(${selectedScenarios.length}, 1fr)` }}
                    >
                      <span>Metric</span>
                      {selectedScenarios.map((s, i) => (
                        <span key={s.id} className="text-center" style={{ color: SERIES_COLORS[i] }}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                    {[
                      {
                        label: "Readiness score",
                        fn: (r: ProjectionResult) => `${r.readinessScore}/100`,
                      },
                      {
                        label: "Success rate",
                        fn: (r: ProjectionResult) => `${r.successRate}%`,
                      },
                      {
                        label: "Retirement assets",
                        fn: (r: ProjectionResult) => formatCurrency(r.projectedRetirementAssets),
                      },
                      {
                        label: "Retire at age",
                        fn: (r: ProjectionResult) => `${r.retirementAge}`,
                      },
                      {
                        label: "SS income/yr",
                        fn: (r: ProjectionResult) =>
                          r.annualSsIncome > 0 ? formatCurrency(r.annualSsIncome) : "—",
                      },
                      {
                        label: "Shortfall age",
                        fn: (r: ProjectionResult) =>
                          r.shortfallAge ? `Age ${r.shortfallAge}` : "None",
                      },
                    ].map(({ label, fn }) => (
                      <div
                        key={label}
                        className="grid items-center gap-4 py-2.5 text-sm border-b last:border-0"
                        style={{ gridTemplateColumns: `1fr repeat(${selectedScenarios.length}, 1fr)` }}
                      >
                        <span className="text-muted-foreground">{label}</span>
                        {selectedScenarios.map((s) => (
                          <span key={s.id} className="text-center font-medium">
                            {fn(s.result)}
                          </span>
                        ))}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : selectedScenarios.length === 1 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Select one more plan to start comparing.
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
