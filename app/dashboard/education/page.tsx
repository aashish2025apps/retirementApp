"use client";

import { useRetirementStore } from "@/lib/store";
import { SectionForm, FieldGroup } from "@/components/forms/section-form";
import { CurrencyField, AgeField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, GraduationCap } from "lucide-react";
import type { Child, Education } from "@/lib/types";

const COLLEGE_COSTS: Record<Child["collegeType"], number> = {
  "public-in-state": 28000,
  "public-out-of-state": 45000,
  private: 65000,
};

const COLLEGE_LABELS: Record<Child["collegeType"], string> = {
  "public-in-state": "Public – In State",
  "public-out-of-state": "Public – Out of State",
  private: "Private University",
};

const EDUCATION_INFLATION = 0.05;
const RETURN_529 = 0.06;

function project529(balance: number, monthly: number, years: number): number {
  let b = balance;
  for (let y = 0; y < years; y++) {
    b = b * (1 + RETURN_529) + monthly * 12;
  }
  return b;
}

function projectedCollegeCost(type: Child["collegeType"], yearsUntil: number, yearsOfCollege: number): number {
  const annualBase = COLLEGE_COSTS[type];
  let total = 0;
  for (let y = 0; y < yearsOfCollege; y++) {
    total += annualBase * Math.pow(1 + EDUCATION_INFLATION, yearsUntil + y);
  }
  return total;
}

export default function EducationPage() {
  const { scenarioData, updateScenarioData } = useRetirementStore();
  const education: Education = scenarioData.education ?? { children: [] };
  const { profile } = scenarioData;

  function update(children: Child[]) {
    updateScenarioData({ education: { children } });
  }

  function addChild() {
    const newChild: Child = {
      id: crypto.randomUUID(),
      name: "",
      currentAge: 5,
      collegeStartAge: 18,
      collegeType: "public-in-state",
      balance529: 0,
      monthlyContribution529: 200,
      yearsOfCollege: 4,
    };
    update([...education.children, newChild]);
  }

  function updateChild(id: string, patch: Partial<Child>) {
    update(education.children.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeChild(id: string) {
    update(education.children.filter((c) => c.id !== id));
  }

  const totalMonthly529 = education.children.reduce((s, c) => s + c.monthlyContribution529, 0);
  const totalCurrent529 = education.children.reduce((s, c) => s + c.balance529, 0);

  return (
    <SectionForm
      title="Education Planning"
      description="Model 529 savings and projected college costs for each child."
    >
      <FieldGroup label="Children">
        {education.children.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
            <GraduationCap className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No children added yet.
          </div>
        ) : (
          <div className="space-y-4">
            {education.children.map((child) => {
              const yearsUntilCollege = Math.max(0, child.collegeStartAge - child.currentAge);
              const yearsUntilCollegeFromUser = Math.max(
                0,
                child.collegeStartAge - child.currentAge
              );
              const projected529 = project529(
                child.balance529,
                child.monthlyContribution529,
                yearsUntilCollegeFromUser
              );
              const totalCost = projectedCollegeCost(
                child.collegeType,
                yearsUntilCollegeFromUser,
                child.yearsOfCollege
              );
              const coveragePct = totalCost > 0 ? Math.min(100, (projected529 / totalCost) * 100) : 100;
              const gap = Math.max(0, totalCost - projected529);
              const enrollYear = new Date().getFullYear() + yearsUntilCollege;

              return (
                <Card key={child.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-7 text-sm font-medium border-0 p-0 bg-transparent focus-visible:ring-0 w-40"
                        value={child.name}
                        onChange={(e) => updateChild(child.id, { name: e.target.value })}
                        placeholder="Child's name (optional)"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeChild(child.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AgeField
                        label="Child's current age"
                        value={child.currentAge}
                        onChange={(v) => updateChild(child.id, { currentAge: v })}
                        min={0}
                        max={22}
                      />
                      <AgeField
                        label="College start age"
                        value={child.collegeStartAge}
                        onChange={(v) => updateChild(child.id, { collegeStartAge: v })}
                        min={16}
                        max={25}
                        hint={`Enrolls in ${enrollYear} (${yearsUntilCollege} yrs)`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">College type</Label>
                      <Select
                        value={child.collegeType}
                        onValueChange={(v) =>
                          updateChild(child.id, { collegeType: v as Child["collegeType"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(COLLEGE_LABELS) as Child["collegeType"][]).map((k) => (
                            <SelectItem key={k} value={k}>
                              {COLLEGE_LABELS[k]} — {formatCurrency(COLLEGE_COSTS[k])}/yr today
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">
                        Years of college: <strong>{child.yearsOfCollege}</strong>
                      </Label>
                      <Slider
                        min={2}
                        max={6}
                        step={1}
                        value={[child.yearsOfCollege]}
                        onValueChange={(v) =>
                          updateChild(child.id, { yearsOfCollege: Array.isArray(v) ? v[0] : (v as number) })
                        }
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>2 yrs (associate)</span>
                        <span>4 yrs (bachelor's)</span>
                        <span>6 yrs (grad)</span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <CurrencyField
                        label="Current 529 balance"
                        value={child.balance529}
                        onChange={(v) => updateChild(child.id, { balance529: v })}
                      />
                      <CurrencyField
                        label="Monthly 529 contribution"
                        value={child.monthlyContribution529}
                        onChange={(v) => updateChild(child.id, { monthlyContribution529: v })}
                      />
                    </div>

                    {/* Projection summary */}
                    <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Projected total cost at enrollment</span>
                        <span className="font-medium">{formatCurrency(totalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">529 projected at enrollment</span>
                        <span className="font-medium text-green-600">{formatCurrency(projected529)}</span>
                      </div>
                      {gap > 0 ? (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Funding gap</span>
                          <span className="font-medium text-orange-500">{formatCurrency(gap)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Surplus</span>
                          <span className="font-medium text-green-600">{formatCurrency(Math.abs(gap))}</span>
                        </div>
                      )}
                      {/* Coverage bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>529 coverage</span>
                          <span>{Math.round(coveragePct)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${coveragePct >= 100 ? "bg-green-500" : coveragePct >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(100, coveragePct)}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        529 grows at 6%/yr · College costs inflate at 5%/yr · Funding gap comes from taxable investments
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Button variant="outline" className="gap-2" onClick={addChild}>
          <Plus className="h-4 w-4" />
          Add child
        </Button>
      </FieldGroup>

      {education.children.length > 0 && (
        <div className="rounded-lg bg-muted/50 p-4 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Total 529 balances</p>
            <p className="font-semibold mt-0.5">{formatCurrency(totalCurrent529)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total monthly contributions</p>
            <p className="font-semibold mt-0.5">{formatCurrency(totalMonthly529)}/mo</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Children</p>
            <p className="font-semibold mt-0.5">{education.children.length}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        Any college funding gap beyond 529 savings is modeled as a draw on taxable investments
        (or added to retirement withdrawal if costs fall in retirement). 529 contributions reduce
        the cash available for other investments — adjust your Goals spending to reflect this.
      </div>
    </SectionForm>
  );
}
