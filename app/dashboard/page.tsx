"use client";

import Link from "next/link";
import { useRetirementStore } from "@/lib/store";
import { runProjection } from "@/lib/calculations/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import {
  TrendingUp,
  Target,
  Calendar,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const sections = [
  { href: "/dashboard/profile", label: "Profile", key: "profile" },
  { href: "/dashboard/income", label: "Income", key: "income" },
  { href: "/dashboard/assets", label: "Assets", key: "accounts" },
  { href: "/dashboard/goals", label: "Goals", key: "spending" },
  { href: "/dashboard/assumptions", label: "Assumptions", key: "assumptions" },
];

export default function DashboardHome() {
  const { scenarioData } = useRetirementStore();
  const result = runProjection(scenarioData);

  const scoreColor =
    result.readinessScore >= 80
      ? "text-green-500"
      : result.readinessScore >= 60
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your retirement overview</p>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Readiness Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${scoreColor}`}>{result.readinessScore}/100</p>
            <Progress value={result.readinessScore} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{result.successRate}%</p>
            <p className="mt-1 text-xs text-muted-foreground">portfolio survives to {scenarioData.profile.lifeExpectancy}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Retirement Assets</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(result.projectedRetirementAssets)}</p>
            <p className="mt-1 text-xs text-muted-foreground">at age {scenarioData.profile.retirementAge}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Retire At</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">Age {result.retirementAge}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.retirementAge - scenarioData.profile.currentAge} years from now
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Net worth chart */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Projection</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <NetWorthChart projections={result.projections} retirementAge={result.retirementAge} />
        </CardContent>
      </Card>

      {/* Setup checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((s) => {
              const data = scenarioData[s.key as keyof typeof scenarioData];
              const hasData = data && Object.keys(data).length > 0;
              return (
                <Link key={s.href} href={s.href}>
                  <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    {hasData ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm font-medium">{s.label}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Link href="/dashboard/results">
          <Button className="gap-2">
            View full analysis
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
