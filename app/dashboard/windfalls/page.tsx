"use client";

import { useMemo } from "react";
import { useRetirementStore } from "@/lib/store";
import { runProjection } from "@/lib/calculations/engine";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyField, AgeField, PercentField } from "@/components/forms/field";
import { ScenarioLineChart } from "@/components/charts/scenario-line-chart";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Banknote, ChevronRight } from "lucide-react";
import type {
  Windfall,
  ExchangeFundAlloc,
  SellDiversifyAlloc,
  WindfallTargetAccount,
} from "@/lib/types";

const LTCG_RATES = [
  { label: "0%", value: 0 },
  { label: "15%", value: 15 },
  { label: "20%", value: 20 },
  { label: "23.8% (20% + NIIT)", value: 23.8 },
];

const TARGET_ACCOUNT_LABELS: Record<WindfallTargetAccount, string> = {
  taxable: "Taxable brokerage",
  roth: "Roth IRA",
  ira: "Traditional IRA",
};

function defaultWindfall(currentAge: number, retirementAge: number): Windfall {
  return {
    id: crypto.randomUUID(),
    name: "New Windfall",
    age: Math.max(currentAge + 1, retirementAge - 5),
    exchangeFund: { amount: 0, costBasisPct: 0, ltcgRatePct: 23.8, lockupYears: 7 },
    sellDiversify: { amount: 0, costBasisPct: 0, ltcgRatePct: 23.8, targetAccount: "taxable" },
    holdCash: 0,
  };
}

function SectionHeader({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="mb-3">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ExchangeFundSection({
  ef,
  windfallAge,
  returnRate,
  onChange,
}: {
  ef: ExchangeFundAlloc;
  windfallAge: number;
  returnRate: number;
  onChange: (patch: Partial<ExchangeFundAlloc>) => void;
}) {
  const gain = ef.amount * (1 - ef.costBasisPct / 100);
  const exitAge = windfallAge + ef.lockupYears;
  const exitValue = ef.amount * Math.pow(1 + returnRate, ef.lockupYears);
  const exitTax = Math.max(0, exitValue - ef.amount * ef.costBasisPct / 100) * ef.ltcgRatePct / 100;
  const exitNet = exitValue - exitTax;

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
      <SectionHeader
        label="Exchange Fund"
        hint="Defer capital gains by contributing appreciated assets to a partnership. Gains are taxed only at exit."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <CurrencyField
          label="Amount to contribute"
          value={ef.amount}
          onChange={(v) => onChange({ amount: v })}
        />
        <PercentField
          label="Cost basis (% of amount)"
          value={ef.costBasisPct}
          onChange={(v) => onChange({ costBasisPct: Math.min(100, Math.max(0, v)) })}
          hint={`Basis: ${formatCurrency(ef.amount * ef.costBasisPct / 100)} · Gain: ${formatCurrency(gain)}`}
          step={1}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm">Lock-up period</Label>
          <div className="relative">
            <Input
              type="number"
              min={1}
              max={30}
              value={ef.lockupYears}
              onChange={(e) => onChange({ lockupYears: Number(e.target.value) })}
              className="pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              yrs
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Exits at your age {exitAge}</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">LTCG rate at exit</Label>
          <Select
            value={String(ef.ltcgRatePct)}
            onValueChange={(v) => onChange({ ltcgRatePct: Number(v) })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LTCG_RATES.map((r) => (
                <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {ef.amount > 0 && (
        <div className="rounded-md bg-background border p-3 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contributed at age {windfallAge}</span>
            <span className="font-medium">{formatCurrency(ef.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Est. value at exit (age {exitAge}, {ef.lockupYears} yrs @ {(returnRate * 100).toFixed(1)}%)
            </span>
            <span className="font-medium">{formatCurrency(exitValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">LTCG tax at exit ({ef.ltcgRatePct}%)</span>
            <span className="font-medium text-red-500">−{formatCurrency(exitTax)}</span>
          </div>
          <div className="flex justify-between border-t pt-1.5 mt-1">
            <span className="font-medium">Net to taxable at age {exitAge}</span>
            <span className="font-semibold text-green-600">{formatCurrency(exitNet)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <span>Tax deferred for {ef.lockupYears} years</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-primary font-medium">
              saves ~{formatCurrency(exitTax * 0.04 * ef.lockupYears)} in foregone investment returns on taxes
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SellDiversifySection({
  sd,
  onChange,
}: {
  sd: SellDiversifyAlloc;
  onChange: (patch: Partial<SellDiversifyAlloc>) => void;
}) {
  const gain = sd.amount * (1 - sd.costBasisPct / 100);
  const tax = gain * sd.ltcgRatePct / 100;
  const afterTax = sd.amount - tax;

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
      <SectionHeader
        label="Sell & Diversify"
        hint="Sell appreciated assets, pay capital gains tax now, and reinvest the after-tax proceeds."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <CurrencyField
          label="Amount to sell"
          value={sd.amount}
          onChange={(v) => onChange({ amount: v })}
        />
        <PercentField
          label="Cost basis (% of amount)"
          value={sd.costBasisPct}
          onChange={(v) => onChange({ costBasisPct: Math.min(100, Math.max(0, v)) })}
          hint={`Basis: ${formatCurrency(sd.amount * sd.costBasisPct / 100)} · Gain: ${formatCurrency(gain)}`}
          step={1}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm">LTCG rate</Label>
          <Select
            value={String(sd.ltcgRatePct)}
            onValueChange={(v) => onChange({ ltcgRatePct: Number(v) })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LTCG_RATES.map((r) => (
                <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Invest after-tax proceeds into</Label>
          <Select
            value={sd.targetAccount}
            onValueChange={(v) => onChange({ targetAccount: v as WindfallTargetAccount })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(TARGET_ACCOUNT_LABELS) as [WindfallTargetAccount, string][]).map(
                ([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      {sd.amount > 0 && (
        <div className="rounded-md bg-background border p-3 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gross proceeds</span>
            <span className="font-medium">{formatCurrency(sd.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              LTCG tax ({sd.ltcgRatePct}% on {formatCurrency(gain)})
            </span>
            <span className="font-medium text-red-500">−{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between border-t pt-1.5 mt-1">
            <span className="font-medium">Net → {TARGET_ACCOUNT_LABELS[sd.targetAccount]}</span>
            <span className="font-semibold text-green-600">{formatCurrency(afterTax)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function HoldCashSection({
  amount,
  onChange,
}: {
  amount: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
      <SectionHeader
        label="Hold as Cash"
        hint="Keep as cash or liquid assets. No immediate tax event — added directly to your taxable account."
      />
      <CurrencyField
        label="Amount to hold"
        value={amount}
        onChange={onChange}
      />
      {amount > 0 && (
        <div className="rounded-md bg-background border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Added to taxable account immediately</span>
            <span className="font-semibold text-green-600">{formatCurrency(amount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WindfallsPage() {
  const { scenarioData, updateScenarioData } = useRetirementStore();
  const windfalls = scenarioData.windfalls ?? { items: [] };
  const { profile, assumptions } = scenarioData;

  const returnRate =
    (assumptions.stockAllocation / 100) * (assumptions.stockReturnRate / 100) +
    ((100 - assumptions.stockAllocation) / 100) * (assumptions.bondReturnRate / 100);

  function updateItems(items: Windfall[]) {
    updateScenarioData({ windfalls: { items } });
  }

  function addWindfall() {
    updateItems([...windfalls.items, defaultWindfall(profile.currentAge, profile.retirementAge)]);
  }

  function updateWindfall(id: string, patch: Partial<Windfall>) {
    updateItems(windfalls.items.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  function removeWindfall(id: string) {
    updateItems(windfalls.items.filter((w) => w.id !== id));
  }

  const baseData = useMemo(
    () => ({ ...scenarioData, windfalls: { items: [] as Windfall[] } }),
    [scenarioData]
  );
  const baseResult = useMemo(() => runProjection(baseData), [baseData]);
  const fullResult = useMemo(() => runProjection(scenarioData), [scenarioData]);

  const hasWindfalls = windfalls.items.length > 0;

  const comparisonSeries = [
    { name: "Without windfalls", color: "#94a3b8", projections: baseResult.projections },
    ...(hasWindfalls
      ? [{ name: "With windfalls", color: "#6366f1", projections: fullResult.projections }]
      : []),
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Future Income & Windfalls</h1>
        <p className="text-muted-foreground">
          Model one-time income events — business sales, inheritances, equity — and choose how each dollar is invested.
        </p>
      </div>

      {windfalls.items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-14 text-center">
          <Banknote className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No windfalls added yet.</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={addWindfall}>
            <Plus className="h-4 w-4" />
            Add windfall
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {windfalls.items.map((w) => {
            const totalGross = w.exchangeFund.amount + w.sellDiversify.amount + w.holdCash;
            const sellTax =
              w.sellDiversify.amount *
              (1 - w.sellDiversify.costBasisPct / 100) *
              (w.sellDiversify.ltcgRatePct / 100);
            const deferred = w.exchangeFund.amount;
            const netNow = totalGross - sellTax - deferred;

            return (
              <Card key={w.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Event name</Label>
                        <Input
                          value={w.name}
                          onChange={(e) => updateWindfall(w.id, { name: e.target.value })}
                          placeholder="e.g. Business sale, Inheritance"
                        />
                      </div>
                      <AgeField
                        label="Your age when received"
                        value={w.age}
                        onChange={(v) => updateWindfall(w.id, { age: v })}
                        min={profile.currentAge}
                        max={profile.lifeExpectancy}
                        hint={`Year ${new Date().getFullYear() + (w.age - profile.currentAge)}`}
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="mt-5 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeWindfall(w.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Allocation — set an amount for each strategy (use 0 to skip)
                  </p>

                  <ExchangeFundSection
                    ef={w.exchangeFund}
                    windfallAge={w.age}
                    returnRate={returnRate}
                    onChange={(patch) =>
                      updateWindfall(w.id, { exchangeFund: { ...w.exchangeFund, ...patch } })
                    }
                  />

                  <SellDiversifySection
                    sd={w.sellDiversify}
                    onChange={(patch) =>
                      updateWindfall(w.id, { sellDiversify: { ...w.sellDiversify, ...patch } })
                    }
                  />

                  <HoldCashSection
                    amount={w.holdCash}
                    onChange={(v) => updateWindfall(w.id, { holdCash: v })}
                  />

                  {/* Windfall summary */}
                  <div className="rounded-lg bg-muted/40 p-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm border-t mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Total gross</p>
                      <p className="font-semibold mt-0.5">{formatCurrency(totalGross)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tax at age {w.age}</p>
                      <p className="font-semibold mt-0.5 text-red-500">
                        {sellTax > 0 ? `−${formatCurrency(sellTax)}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Exchange fund (deferred)</p>
                      <p className="font-semibold mt-0.5 text-blue-500">
                        {deferred > 0 ? formatCurrency(deferred) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Net into portfolio now</p>
                      <p className="font-semibold mt-0.5 text-green-600">{formatCurrency(netNow)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Button variant="outline" className="gap-2" onClick={addWindfall}>
            <Plus className="h-4 w-4" />
            Add another windfall
          </Button>
        </div>
      )}

      {hasWindfalls && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="font-semibold">Net Worth Impact</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-8 rounded-full bg-slate-400" />
                  <span className="text-muted-foreground">Without</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-8 rounded-full bg-indigo-500" />
                  <span className="text-muted-foreground">With windfalls</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ScenarioLineChart series={comparisonSeries} retirementAge={profile.retirementAge} />
          </CardContent>
        </Card>
      )}

      {hasWindfalls && (
        <div className="rounded-lg bg-muted/50 p-4 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Total windfall gross</p>
            <p className="font-semibold mt-0.5">
              {formatCurrency(
                windfalls.items.reduce(
                  (s, w) => s + w.exchangeFund.amount + w.sellDiversify.amount + w.holdCash,
                  0
                )
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net worth at retirement (with)</p>
            <p className="font-semibold mt-0.5">
              {formatCurrency(
                fullResult.projections.find((p) => p.age === profile.retirementAge)?.netWorth ?? 0
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net worth at retirement (without)</p>
            <p className="font-semibold mt-0.5">
              {formatCurrency(
                baseResult.projections.find((p) => p.age === profile.retirementAge)?.netWorth ?? 0
              )}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Exchange fund:</strong> Defers capital gains by contributing
        appreciated assets to a partnership. Lock-up periods are typically 7+ years. At exit, the full
        gain from original basis is taxable at LTCG rates. Projected growth uses your portfolio return
        assumption ({(returnRate * 100).toFixed(1)}%/yr). Consult a tax advisor before executing.
      </div>
    </div>
  );
}
