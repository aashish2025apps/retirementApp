"use client";

import { useMemo } from "react";
import { useRetirementStore } from "@/lib/store";
import { SectionForm, FieldGroup } from "@/components/forms/section-form";
import { CurrencyField } from "@/components/forms/field";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { SocialSecurity } from "@/lib/types";

const SS_FRA = 67;

function getAdjustmentFactor(claimingAge: number): number {
  const monthsDiff = Math.round((claimingAge - SS_FRA) * 12);
  if (monthsDiff >= 0) {
    return 1 + Math.min(monthsDiff / 12, 3) * 0.08;
  }
  const earlyMonths = Math.abs(monthsDiff);
  const first36 = Math.min(earlyMonths, 36);
  const remaining = Math.max(0, earlyMonths - 36);
  return 1 - (first36 * (5 / 900) + remaining * (5 / 1200));
}

function breakEvenAge(monthlyAtFRA: number, claimingAge: number): number | null {
  if (claimingAge === SS_FRA || monthlyAtFRA === 0) return null;
  const factor = getAdjustmentFactor(claimingAge);
  const adjustedMonthly = monthlyAtFRA * factor;
  const fraMonthly = monthlyAtFRA;
  const monthlyDiff = fraMonthly - adjustedMonthly; // monthly gain from waiting to FRA
  if (monthlyDiff <= 0) return null; // claiming later — no break-even vs FRA in early direction
  // Months of "extra" payments before FRA vs benefit delta after
  const extraMonthsBefore = (SS_FRA - claimingAge) * 12;
  const extraIncome = adjustedMonthly * extraMonthsBefore;
  // months until cumulative FRA approach catches up
  const catchUpMonths = extraIncome / monthlyDiff;
  return Math.round(SS_FRA + catchUpMonths / 12);
}

const DEFAULT_SS: SocialSecurity = {
  monthlyBenefitAtFRA: 0,
  claimingAge: 67,
  hasSpouseBenefit: false,
  spouseMonthlyBenefitAtFRA: 0,
  spouseClaimingAge: 67,
};

export default function SocialSecurityPage() {
  const { scenarioData, updateScenarioData } = useRetirementStore();
  const ss = scenarioData.socialSecurity ?? DEFAULT_SS;
  const { profile } = scenarioData;

  function update(patch: Partial<SocialSecurity>) {
    updateScenarioData({ socialSecurity: { ...ss, ...patch } });
  }

  const userFactor = getAdjustmentFactor(ss.claimingAge);
  const userAdjustedMonthly = ss.monthlyBenefitAtFRA * userFactor;
  const userAnnual = userAdjustedMonthly * 12;

  const spouseFactor = getAdjustmentFactor(ss.spouseClaimingAge);
  const spouseAdjustedMonthly = ss.spouseMonthlyBenefitAtFRA * spouseFactor;

  const breakEven = useMemo(
    () => breakEvenAge(ss.monthlyBenefitAtFRA, ss.claimingAge),
    [ss.monthlyBenefitAtFRA, ss.claimingAge]
  );

  const totalAnnualSs = (userAnnual + (ss.hasSpouseBenefit ? spouseAdjustedMonthly * 12 : 0));

  return (
    <SectionForm
      title="Social Security"
      description="Enter your estimated Social Security benefits to improve projection accuracy."
    >
      <FieldGroup label="Your Benefit">
        <CurrencyField
          label="Estimated monthly benefit at Full Retirement Age (67)"
          value={ss.monthlyBenefitAtFRA}
          onChange={(v) => update({ monthlyBenefitAtFRA: v })}
          hint="Find your personalized estimate at ssa.gov/myaccount"
        />

        <div className="space-y-3">
          <Label>
            Claiming age: {ss.claimingAge}
            {ss.claimingAge < SS_FRA && (
              <span className="ml-2 text-sm font-normal text-orange-500">
                early — {((1 - userFactor) * 100).toFixed(1)}% reduction
              </span>
            )}
            {ss.claimingAge > SS_FRA && (
              <span className="ml-2 text-sm font-normal text-green-500">
                delayed — +{((userFactor - 1) * 100).toFixed(1)}% bonus
              </span>
            )}
            {ss.claimingAge === SS_FRA && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                Full Retirement Age
              </span>
            )}
          </Label>
          <Slider
            min={62}
            max={70}
            step={1}
            value={[ss.claimingAge]}
            onValueChange={(vals) =>
              update({ claimingAge: Array.isArray(vals) ? vals[0] : (vals as number) })
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>62 (early)</span>
            <span>67 (FRA)</span>
            <span>70 (max)</span>
          </div>
        </div>

        {ss.monthlyBenefitAtFRA > 0 && (
          <div className="rounded-lg bg-muted/50 p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adjusted monthly benefit</span>
              <span className="font-medium">{formatCurrency(userAdjustedMonthly)}/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Annual benefit</span>
              <span className="font-medium">{formatCurrency(userAnnual)}/yr</span>
            </div>
          </div>
        )}
      </FieldGroup>

      {profile.hasSpouse && (
        <FieldGroup label="Spouse Benefit">
          <div className="flex items-center justify-between">
            <Label htmlFor="spouse-ss">Include spouse Social Security</Label>
            <Switch
              id="spouse-ss"
              checked={ss.hasSpouseBenefit}
              onCheckedChange={(v) => update({ hasSpouseBenefit: v })}
            />
          </div>

          {ss.hasSpouseBenefit && (
            <>
              <CurrencyField
                label="Spouse estimated monthly benefit at FRA"
                value={ss.spouseMonthlyBenefitAtFRA}
                onChange={(v) => update({ spouseMonthlyBenefitAtFRA: v })}
                hint="Enter 0 to use the spousal benefit (50% of your PIA)"
              />
              <div className="space-y-3">
                <Label>
                  Spouse claiming age: {ss.spouseClaimingAge}
                  {ss.spouseClaimingAge < SS_FRA && (
                    <span className="ml-2 text-sm font-normal text-orange-500">
                      early — {((1 - spouseFactor) * 100).toFixed(1)}% reduction
                    </span>
                  )}
                  {ss.spouseClaimingAge > SS_FRA && (
                    <span className="ml-2 text-sm font-normal text-green-500">
                      delayed — +{((spouseFactor - 1) * 100).toFixed(1)}% bonus
                    </span>
                  )}
                </Label>
                <Slider
                  min={62}
                  max={70}
                  step={1}
                  value={[ss.spouseClaimingAge]}
                  onValueChange={(vals) =>
                    update({ spouseClaimingAge: Array.isArray(vals) ? vals[0] : (vals as number) })
                  }
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>62 (early)</span>
                  <span>67 (FRA)</span>
                  <span>70 (max)</span>
                </div>
              </div>
            </>
          )}
        </FieldGroup>
      )}

      {ss.monthlyBenefitAtFRA > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Break-even Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {ss.claimingAge < SS_FRA && breakEven !== null && (
              <p>
                Claiming at <strong>{ss.claimingAge}</strong> gives you more total income until age{" "}
                <strong>{breakEven}</strong>. After that, waiting to <strong>{SS_FRA}</strong> would
                have paid more. If you expect to live past {breakEven}, delaying may be worth it.
              </p>
            )}
            {ss.claimingAge > SS_FRA && (
              <p>
                Delaying to <strong>{ss.claimingAge}</strong> means receiving {((userFactor - 1) * 100).toFixed(0)}% more per
                month for life. The break-even vs claiming at {SS_FRA} is typically around age 79–80.
              </p>
            )}
            {ss.claimingAge === SS_FRA && (
              <p>
                Claiming at your Full Retirement Age (67) is a common choice. Delaying to 70 increases
                your benefit by 24% permanently. Claiming at 62 reduces it by 30%.
              </p>
            )}
            {totalAnnualSs > 0 && (
              <div className="rounded-md bg-primary/5 p-3 flex justify-between font-medium">
                <span>Total annual SS income at retirement</span>
                <span className="text-primary">{formatCurrency(totalAnnualSs)}/yr</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        SS benefits are inflation-adjusted at 2.5% COLA in projections. Benefits may be partially taxable
        at higher incomes (up to 85% taxable). Full tax modeling coming in a future update.
      </div>
    </SectionForm>
  );
}
