"use client";

import { useRetirementStore } from "@/lib/store";
import { FieldGroup } from "@/components/forms/section-form";
import { CurrencyField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import type { CurrentExpenses } from "@/lib/types";

const EXPENSE_CATEGORIES: { key: keyof CurrentExpenses; label: string; hint?: string }[] = [
  { key: "housing", label: "Housing", hint: "Rent or mortgage payment (P&I + escrow)" },
  { key: "transportation", label: "Transportation", hint: "Car payment, gas, insurance, transit" },
  { key: "food", label: "Food & dining", hint: "Groceries, restaurants, coffee" },
  { key: "utilities", label: "Utilities & bills", hint: "Electric, water, internet, phone" },
  { key: "insurance", label: "Insurance", hint: "Health, life, disability (not in paycheck)" },
  { key: "healthcare", label: "Healthcare", hint: "Out-of-pocket medical, dental, prescriptions" },
  { key: "childcare", label: "Childcare & kids", hint: "Daycare, school, activities, allowance" },
  { key: "entertainment", label: "Entertainment", hint: "Streaming, gym, hobbies, subscriptions" },
  { key: "travel", label: "Travel & vacation", hint: "Flights, hotels, annual vacations" },
  { key: "other", label: "Other", hint: "Clothing, personal care, gifts, miscellaneous" },
];

const DEFAULT_EXPENSES: CurrentExpenses = {
  housing: 0,
  transportation: 0,
  food: 0,
  utilities: 0,
  insurance: 0,
  healthcare: 0,
  childcare: 0,
  entertainment: 0,
  travel: 0,
  other: 0,
};

export default function GoalsPage() {
  const { scenarioData, updateScenarioData } = useRetirementStore();
  const { spending, income, accounts, assumptions } = scenarioData;
  const expenses = spending.currentExpenses ?? DEFAULT_EXPENSES;

  function updateExpense(key: keyof CurrentExpenses, value: number) {
    updateScenarioData({
      spending: {
        ...spending,
        currentExpenses: { ...expenses, [key]: value },
      },
    });
  }

  function updateBudget(monthlyBudget: number) {
    updateScenarioData({ spending: { ...spending, monthlyBudget } });
  }

  // ── Cash flow calculations ──────────────────────────────────────────────────
  const totalExpenses = Object.values(expenses).reduce((s, v) => s + v, 0);

  const monthlyGross = (income.annualSalary + income.spouseAnnualSalary + income.bonusAmount) / 12;
  const monthlyTax = monthlyGross * (assumptions.effectiveTaxRate / 100);
  const monthlyNetIncome = monthlyGross - monthlyTax;

  // Monthly savings contributions (annualized → monthly)
  const annualContributions =
    accounts.k401Contribution +
    accounts.rothContribution +
    accounts.iraContribution +
    accounts.taxableContribution +
    accounts.hsaContribution +
    accounts.spouseK401Contribution +
    accounts.spouseRothContribution +
    accounts.spouseIraContribution;
  const monthlySavings = annualContributions / 12;

  const surplus = monthlyNetIncome - monthlySavings - totalExpenses;
  const savingsRate = monthlyNetIncome > 0 ? (monthlySavings / monthlyNetIncome) * 100 : 0;
  const expenseRate = monthlyNetIncome > 0 ? (totalExpenses / monthlyNetIncome) * 100 : 0;

  // ── Retirement goal ─────────────────────────────────────────────────────────
  const annualBudget = spending.monthlyBudget * 12;
  const targetNestEgg = annualBudget * 25;
  const replacementRate =
    totalExpenses > 0 ? Math.round((spending.monthlyBudget / totalExpenses) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Goals & Expenses</h1>
        <p className="text-muted-foreground">
          Track your current monthly spending and set your retirement income target.
        </p>
      </div>

      {/* ── Current expenses ── */}
      <Card>
        <CardHeader>
          <CardTitle>Current Monthly Expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FieldGroup label="Expense Categories">
            <div className="grid gap-4 sm:grid-cols-2">
              {EXPENSE_CATEGORIES.map(({ key, label, hint }) => (
                <CurrencyField
                  key={key}
                  label={label}
                  value={expenses[key]}
                  onChange={(v) => updateExpense(key, v)}
                  hint={hint}
                />
              ))}
            </div>
          </FieldGroup>

          {/* Total */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="font-medium">Total monthly expenses</span>
            <span className="text-xl font-bold">{formatCurrency(totalExpenses)}/mo</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Cash flow summary ── */}
      {monthlyNetIncome > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Cash Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Gross income</span>
                <span>{formatCurrency(monthlyGross)}/mo</span>
              </div>
              <div className="flex justify-between py-1 text-muted-foreground">
                <span>Taxes (~{assumptions.effectiveTaxRate}%)</span>
                <span className="text-red-500">−{formatCurrency(monthlyTax)}</span>
              </div>
              <div className="flex justify-between py-1 font-medium border-t pt-2">
                <span>Net take-home</span>
                <span>{formatCurrency(monthlyNetIncome)}/mo</span>
              </div>

              <Separator />

              <div className="flex justify-between py-1 text-muted-foreground">
                <span>Retirement savings</span>
                <span className="text-blue-500">−{formatCurrency(monthlySavings)}</span>
              </div>
              {totalExpenses > 0 && (
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Monthly expenses</span>
                  <span className="text-orange-500">−{formatCurrency(totalExpenses)}</span>
                </div>
              )}

              <Separator />

              <div
                className={[
                  "flex justify-between py-2 font-semibold text-base rounded-lg px-3",
                  surplus >= 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20",
                ].join(" ")}
              >
                <span className={surplus >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                  {surplus >= 0 ? "Monthly surplus" : "Monthly deficit"}
                </span>
                <span className={surplus >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                  {surplus >= 0 ? "+" : "−"}{formatCurrency(Math.abs(surplus))}/mo
                </span>
              </div>
            </div>

            {/* Surplus/deficit indicator */}
            {surplus < 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-red-700 dark:text-red-400">
                  Your savings contributions and expenses exceed your take-home pay by{" "}
                  <strong>{formatCurrency(Math.abs(surplus))}/mo</strong>. Consider reducing
                  contributions or expenses to make your plan sustainable.
                </p>
              </div>
            )}
            {surplus >= 0 && monthlySavings > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <p className="text-green-700 dark:text-green-400">
                  Saving <strong>{savingsRate.toFixed(0)}%</strong> of take-home pay with a{" "}
                  <strong>{formatCurrency(surplus)}/mo</strong> surplus — your plan is cash-flow
                  positive.
                </p>
              </div>
            )}

            {/* Allocation bar */}
            {monthlyNetIncome > 0 && (monthlySavings > 0 || totalExpenses > 0) && (
              <div className="space-y-1.5">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100, savingsRate)}%` }}
                    title={`Savings ${savingsRate.toFixed(0)}%`}
                  />
                  <div
                    className="bg-orange-400 transition-all"
                    style={{ width: `${Math.min(100, expenseRate)}%` }}
                    title={`Expenses ${expenseRate.toFixed(0)}%`}
                  />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-3 rounded-sm bg-blue-500" />
                    Savings {savingsRate.toFixed(0)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-3 rounded-sm bg-orange-400" />
                    Expenses {expenseRate.toFixed(0)}%
                  </span>
                  {surplus >= 0 && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-3 rounded-sm bg-muted-foreground/30" />
                      Surplus {Math.max(0, 100 - savingsRate - expenseRate).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Retirement goal ── */}
      <Card>
        <CardHeader>
          <CardTitle>Retirement Spending Goal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <CurrencyField
            label="Target monthly spending in retirement (today's dollars)"
            value={spending.monthlyBudget}
            onChange={updateBudget}
            hint="The calculator adjusts this for inflation over time"
          />

          {totalExpenses > 0 && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-sm">
              <div>
                <p className="font-medium">Use current expenses as baseline</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sets retirement goal to {formatCurrency(totalExpenses)}/mo ({replacementRate > 0 ? `100%` : "—"} replacement)
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0"
                onClick={() => updateBudget(totalExpenses)}
              >
                Apply
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {totalExpenses > 0 && spending.monthlyBudget !== totalExpenses && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-sm">
              <div>
                <p className="font-medium">Use 80% of current expenses</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Common rule of thumb — {formatCurrency(totalExpenses * 0.8)}/mo (no mortgage, lower commute costs)
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0"
                onClick={() => updateBudget(Math.round(totalExpenses * 0.8))}
              >
                Apply
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Annual retirement spending</span>
              <span className="font-medium">{formatCurrency(annualBudget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target nest egg (25× rule)</span>
              <span className="font-medium">{formatCurrency(targetNestEgg)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Safe withdrawal rate</span>
              <span className="font-medium">4.0%</span>
            </div>
            {totalExpenses > 0 && (
              <div className="flex justify-between border-t pt-2 mt-1">
                <span className="text-muted-foreground">Income replacement ratio</span>
                <span className={`font-medium ${replacementRate >= 70 ? "text-green-600" : "text-orange-500"}`}>
                  {replacementRate}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
