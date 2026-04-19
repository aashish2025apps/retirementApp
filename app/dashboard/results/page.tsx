"use client";

import { useRetirementStore } from "@/lib/store";
import { runProjection } from "@/lib/calculations/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { WithdrawalChart } from "@/components/charts/withdrawal-chart";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  Target,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";

function ScoreGrade(score: number) {
  if (score >= 90) return { grade: "A+", color: "text-green-500", label: "Excellent" };
  if (score >= 80) return { grade: "A", color: "text-green-500", label: "On Track" };
  if (score >= 70) return { grade: "B", color: "text-yellow-500", label: "Good" };
  if (score >= 60) return { grade: "C", color: "text-yellow-500", label: "Fair" };
  if (score >= 40) return { grade: "D", color: "text-orange-500", label: "Needs Work" };
  return { grade: "F", color: "text-red-500", label: "At Risk" };
}

export default function ResultsPage() {
  const { scenarioData } = useRetirementStore();
  const result = runProjection(scenarioData);
  const gradeInfo = ScoreGrade(result.readinessScore);
  const { profile } = scenarioData;

  const retirementProjections = result.projections.filter((p) => p.isRetired);
  const annualPortfolioWithdrawal = Math.max(0, result.annualRetirementIncome - result.annualSsIncome);
  const safeWithdrawalRate =
    result.projectedRetirementAssets > 0
      ? (annualPortfolioWithdrawal / result.projectedRetirementAssets) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Results</h1>
        <p className="text-muted-foreground">Your complete retirement projection</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" />
              Readiness Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <p className={`text-4xl font-bold ${gradeInfo.color}`}>{result.readinessScore}</p>
              <Badge variant="outline" className={gradeInfo.color}>{gradeInfo.grade} · {gradeInfo.label}</Badge>
            </div>
            <Progress value={result.readinessScore} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Portfolio Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-4xl font-bold ${result.successRate >= 80 ? "text-green-500" : result.successRate >= 60 ? "text-yellow-500" : "text-red-500"}`}>
              {result.successRate}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              estimated probability portfolio survives to age {profile.lifeExpectancy}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Retirement Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{formatCurrency(result.projectedRetirementAssets)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              at age {profile.retirementAge} · {safeWithdrawalRate.toFixed(1)}% withdrawal rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Retirement Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">Age {result.retirementAge}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.yearsInRetirement} years in retirement
              {result.shortfallAge && ` · portfolio depleted at ${result.shortfallAge}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {result.shortfallAge && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
          <CardContent className="flex items-start gap-3 pt-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">Portfolio Shortfall Detected</p>
              <p className="text-sm text-red-600 dark:text-red-500">
                At current savings and spending rates, your portfolio may run out at age {result.shortfallAge}.
                Consider increasing contributions, reducing retirement spending, or retiring later.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {safeWithdrawalRate > 4 && safeWithdrawalRate <= 6 && !result.shortfallAge && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardContent className="flex items-start gap-3 pt-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-700 dark:text-yellow-400">Withdrawal Rate Above 4%</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                Your withdrawal rate of {safeWithdrawalRate.toFixed(1)}% is above the commonly recommended 4%.
                This is still manageable but may increase portfolio depletion risk in poor market conditions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {safeWithdrawalRate <= 4 && !result.shortfallAge && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="flex items-start gap-3 pt-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Strong Retirement Plan</p>
              <p className="text-sm text-green-600 dark:text-green-500">
                Your withdrawal rate of {safeWithdrawalRate.toFixed(1)}% is at or below 4% — historically
                sustainable across nearly all 30-year market scenarios.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Net worth chart */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <NetWorthChart projections={result.projections} retirementAge={result.retirementAge} />
        </CardContent>
      </Card>

      {/* Withdrawal chart */}
      {retirementProjections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Retirement Portfolio Balance</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <WithdrawalChart projections={retirementProjections} />
          </CardContent>
        </Card>
      )}

      {/* Key metrics table */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {[
              { label: "Years until retirement", value: `${profile.retirementAge - profile.currentAge} years` },
              { label: "Years in retirement", value: `${result.yearsInRetirement} years` },
              { label: "Projected retirement assets", value: formatCurrency(result.projectedRetirementAssets) },
              { label: "Annual retirement spending", value: formatCurrency(result.annualRetirementIncome) },
              ...(result.annualSsIncome > 0
                ? [
                    { label: "Social Security income / yr", value: formatCurrency(result.annualSsIncome) },
                    { label: "Portfolio draw needed / yr", value: formatCurrency(annualPortfolioWithdrawal) },
                  ]
                : [{ label: "Monthly retirement income needed", value: formatCurrency(result.annualRetirementIncome / 12) }]),
              { label: "Withdrawal rate at retirement", value: `${safeWithdrawalRate.toFixed(2)}%` },
              { label: "Target nest egg (25× rule)", value: formatCurrency(annualPortfolioWithdrawal * 25) },
              {
                label: "Funding ratio",
                value: `${Math.min(999, Math.round((result.projectedRetirementAssets / (annualPortfolioWithdrawal * 25 || 1)) * 100))}%`,
              },
            ].map((row) => (
              <div key={row.label} className="flex justify-between py-3 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong>Disclaimer:</strong> These projections are for educational purposes only and are not financial advice.
        Returns are not guaranteed. Past performance does not predict future results. Consult a qualified
        financial advisor before making investment decisions.
      </div>
    </div>
  );
}
