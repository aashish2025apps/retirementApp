"use client";

import { useRetirementStore } from "@/lib/store";
import { SectionForm, FieldGroup } from "@/components/forms/section-form";
import { PercentField } from "@/components/forms/field";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export default function AssumptionsPage() {
  const { scenarioData, updateScenarioData } = useRetirementStore();
  const { assumptions } = scenarioData;

  function update(key: string, value: unknown) {
    updateScenarioData({ assumptions: { ...assumptions, [key]: value } });
  }

  return (
    <SectionForm
      title="Assumptions"
      description="Market and economic assumptions used in projections. Adjust to match your expectations."
    >
      <FieldGroup label="Investment Returns">
        <PercentField
          label="Expected stock return (annual)"
          value={assumptions.stockReturnRate}
          onChange={(v) => update("stockReturnRate", v)}
          hint="Historical US stock market average: ~7% real, ~10% nominal"
          step={0.5}
        />
        <PercentField
          label="Expected bond return (annual)"
          value={assumptions.bondReturnRate}
          onChange={(v) => update("bondReturnRate", v)}
          hint="Historical bond average: ~3-4%"
          step={0.5}
        />
      </FieldGroup>

      <FieldGroup label="Asset Allocation">
        <div className="space-y-3">
          <Label>Stock allocation: {assumptions.stockAllocation}% stocks / {100 - assumptions.stockAllocation}% bonds</Label>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[assumptions.stockAllocation]}
            onValueChange={(vals) => update("stockAllocation", Array.isArray(vals) ? vals[0] : vals)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>100% bonds</span>
            <span>100% stocks</span>
          </div>
          <p className="text-xs text-muted-foreground">
            The calculator automatically adjusts your allocation as you approach retirement (glide path).
          </p>
        </div>
      </FieldGroup>

      <FieldGroup label="Inflation">
        <PercentField
          label="General inflation rate"
          value={assumptions.inflationRate}
          onChange={(v) => update("inflationRate", v)}
          hint="Historical US average: ~3%. Your retirement spending grows at this rate."
          step={0.25}
        />
      </FieldGroup>

      <FieldGroup label="Tax Estimate">
        <PercentField
          label="Effective income tax rate (pre-retirement)"
          value={assumptions.effectiveTaxRate}
          onChange={(v) => update("effectiveTaxRate", v)}
          hint="Your combined federal + state effective tax rate on earned income"
          step={1}
        />
      </FieldGroup>

      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Note:</strong> These are simplified assumptions for MVP projections.
          Full tax modeling with federal brackets, FICA, capital gains, RMDs, and all 50-state brackets
          will be available in the next update.
        </p>
      </div>
    </SectionForm>
  );
}
