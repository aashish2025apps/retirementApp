"use client";

import { useRetirementStore } from "@/lib/store";
import { SectionForm, FieldGroup } from "@/components/forms/section-form";
import { CurrencyField, PercentField, AgeField } from "@/components/forms/field";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import type { Debts, Mortgage, OtherDebt } from "@/lib/types";

const DEFAULT_DEBTS: Debts = {
  hasMortgage: false,
  mortgage: {
    homeValue: 500000,
    remainingBalance: 350000,
    monthlyPayment: 2200,
    interestRate: 6.5,
    remainingYears: 27,
    homeAppreciationRate: 3,
  },
  otherDebts: [],
};

function payoffYears(balance: number, annualRatePct: number, monthlyPayment: number): number {
  if (balance <= 0 || monthlyPayment <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return Math.ceil(balance / monthlyPayment);
  const minPayment = balance * r;
  if (monthlyPayment <= minPayment) return Infinity;
  return Math.ceil(Math.log(monthlyPayment / (monthlyPayment - balance * r)) / Math.log(1 + r));
}

function totalInterestRemaining(balance: number, annualRatePct: number, monthlyPayment: number): number {
  const months = payoffYears(balance, annualRatePct, monthlyPayment);
  if (!isFinite(months)) return 0;
  return Math.max(0, monthlyPayment * months - balance);
}

export default function DebtsPage() {
  const { scenarioData, updateScenarioData } = useRetirementStore();
  const debts = scenarioData.debts ?? DEFAULT_DEBTS;

  function update(patch: Partial<Debts>) {
    updateScenarioData({ debts: { ...debts, ...patch } });
  }

  function updateMortgage(patch: Partial<Mortgage>) {
    update({ mortgage: { ...debts.mortgage, ...patch } });
  }

  function addDebt() {
    const newDebt: OtherDebt = {
      id: crypto.randomUUID(),
      name: "New Loan",
      balance: 10000,
      monthlyPayment: 300,
      interestRate: 6,
    };
    update({ otherDebts: [...debts.otherDebts, newDebt] });
  }

  function updateDebt(id: string, patch: Partial<OtherDebt>) {
    update({
      otherDebts: debts.otherDebts.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });
  }

  function removeDebt(id: string) {
    update({ otherDebts: debts.otherDebts.filter((d) => d.id !== id) });
  }

  const m = debts.mortgage;
  const mortgageEquity = debts.hasMortgage ? Math.max(0, m.homeValue - m.remainingBalance) : 0;
  const mortgagePayoffMonths = debts.hasMortgage
    ? payoffYears(m.remainingBalance, m.interestRate, m.monthlyPayment)
    : 0;
  const mortgageInterestLeft = debts.hasMortgage
    ? totalInterestRemaining(m.remainingBalance, m.interestRate, m.monthlyPayment)
    : 0;

  const totalOtherDebt = debts.otherDebts.reduce((s, d) => s + d.balance, 0);
  const totalMonthlyDebt =
    (debts.hasMortgage ? m.monthlyPayment : 0) +
    debts.otherDebts.reduce((s, d) => s + d.monthlyPayment, 0);

  return (
    <SectionForm
      title="Debts"
      description="Track your mortgage and other debts. Home equity is added to your net worth projections."
    >
      {/* Mortgage */}
      <FieldGroup label="Mortgage">
        <div className="flex items-center justify-between">
          <Label htmlFor="has-mortgage">I have a mortgage</Label>
          <Switch
            id="has-mortgage"
            checked={debts.hasMortgage}
            onCheckedChange={(v) => update({ hasMortgage: v })}
          />
        </div>

        {debts.hasMortgage && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <CurrencyField
                label="Current home value"
                value={m.homeValue}
                onChange={(v) => updateMortgage({ homeValue: v })}
              />
              <CurrencyField
                label="Remaining mortgage balance"
                value={m.remainingBalance}
                onChange={(v) => updateMortgage({ remainingBalance: v })}
              />
              <CurrencyField
                label="Monthly payment (P&I)"
                value={m.monthlyPayment}
                onChange={(v) => updateMortgage({ monthlyPayment: v })}
                hint="Principal & interest only, not escrow"
              />
              <PercentField
                label="Interest rate"
                value={m.interestRate}
                onChange={(v) => updateMortgage({ interestRate: v })}
                step={0.125}
              />
              <AgeField
                label="Years remaining on loan"
                value={m.remainingYears}
                onChange={(v) => updateMortgage({ remainingYears: v })}
                min={1}
                max={30}
              />
              <PercentField
                label="Home appreciation rate"
                value={m.homeAppreciationRate}
                onChange={(v) => updateMortgage({ homeAppreciationRate: v })}
                hint="Historical average: ~3%/yr"
                step={0.25}
              />
            </div>

            <Card className="bg-muted/40 border-0">
              <CardContent className="pt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Current equity</p>
                  <p className="font-semibold text-base mt-0.5">{formatCurrency(mortgageEquity)}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.homeValue > 0 ? Math.round((mortgageEquity / m.homeValue) * 100) : 0}% of home value
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Payoff in</p>
                  <p className="font-semibold text-base mt-0.5">
                    {isFinite(mortgagePayoffMonths)
                      ? `${Math.ceil(mortgagePayoffMonths / 12)} yrs`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isFinite(mortgagePayoffMonths)
                      ? `~${new Date().getFullYear() + Math.ceil(mortgagePayoffMonths / 12)}`
                      : "payment too low"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Interest remaining</p>
                  <p className="font-semibold text-base mt-0.5">{formatCurrency(mortgageInterestLeft)}</p>
                  <p className="text-xs text-muted-foreground">over loan life</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </FieldGroup>

      <Separator />

      {/* Other debts */}
      <FieldGroup label="Other Debts">
        <p className="text-sm text-muted-foreground">
          Car loans, student loans, credit cards, personal loans.
        </p>

        {debts.otherDebts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No other debts added.
          </div>
        ) : (
          <div className="space-y-4">
            {debts.otherDebts.map((debt) => {
              const payoffMonths = payoffYears(debt.balance, debt.interestRate, debt.monthlyPayment);
              return (
                <Card key={debt.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-7 text-sm font-medium border-0 p-0 bg-transparent focus-visible:ring-0 w-40"
                        value={debt.name}
                        onChange={(e) => updateDebt(debt.id, { name: e.target.value })}
                        placeholder="Debt name"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeDebt(debt.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-3">
                    <CurrencyField
                      label="Balance"
                      value={debt.balance}
                      onChange={(v) => updateDebt(debt.id, { balance: v })}
                    />
                    <CurrencyField
                      label="Monthly payment"
                      value={debt.monthlyPayment}
                      onChange={(v) => updateDebt(debt.id, { monthlyPayment: v })}
                    />
                    <PercentField
                      label="Interest rate"
                      value={debt.interestRate}
                      onChange={(v) => updateDebt(debt.id, { interestRate: v })}
                      step={0.25}
                    />
                    <div className="sm:col-span-3 text-xs text-muted-foreground">
                      {isFinite(payoffMonths)
                        ? `Paid off in ~${Math.ceil(payoffMonths / 12)} yrs (${new Date().getFullYear() + Math.ceil(payoffMonths / 12)}) · ${formatCurrency(totalInterestRemaining(debt.balance, debt.interestRate, debt.monthlyPayment))} interest`
                        : "Monthly payment too low to pay off"}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Button variant="outline" className="gap-2" onClick={addDebt}>
          <Plus className="h-4 w-4" />
          Add debt
        </Button>
      </FieldGroup>

      {/* Summary */}
      {(debts.hasMortgage || debts.otherDebts.length > 0) && (
        <Card className="bg-muted/40 border-0">
          <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Total monthly debt</p>
              <p className="font-semibold mt-0.5">{formatCurrency(totalMonthlyDebt)}/mo</p>
            </div>
            {debts.hasMortgage && (
              <div>
                <p className="text-xs text-muted-foreground">Home equity</p>
                <p className="font-semibold mt-0.5">{formatCurrency(mortgageEquity)}</p>
              </div>
            )}
            {debts.otherDebts.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Other debt balance</p>
                <p className="font-semibold mt-0.5">{formatCurrency(totalOtherDebt)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Net worth impact</p>
              <p className="font-semibold mt-0.5 text-green-600">
                +{formatCurrency(mortgageEquity - totalOtherDebt)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        Home equity and other debt balances are tracked year-by-year in projections. Your retirement spending
        budget (set in Goals) should already include your mortgage payment if you plan to still be paying it
        in retirement.
      </div>
    </SectionForm>
  );
}
