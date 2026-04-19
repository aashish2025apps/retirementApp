"use client";

import { useRetirementStore } from "@/lib/store";
import { SectionForm, FieldGroup } from "@/components/forms/section-form";
import { CurrencyField, PercentField } from "@/components/forms/field";

export default function IncomePage() {
  const { scenarioData, updateScenarioData } = useRetirementStore();
  const { income, profile } = scenarioData;

  function update(key: string, value: unknown) {
    updateScenarioData({ income: { ...income, [key]: value } });
  }

  return (
    <SectionForm
      title="Income"
      description="Your current household income. Used to calculate savings capacity and taxes."
    >
      <FieldGroup label="Your Income">
        <CurrencyField
          label="Annual salary / W2 income"
          value={income.annualSalary}
          onChange={(v) => update("annualSalary", v)}
          hint="Your gross annual compensation before taxes"
        />
        <PercentField
          label="Expected annual raise"
          value={income.annualRaise}
          onChange={(v) => update("annualRaise", v)}
          hint="Typical salary growth per year (3% is a common assumption)"
          step={0.5}
        />
        <CurrencyField
          label="Annual bonus"
          value={income.bonusAmount}
          onChange={(v) => update("bonusAmount", v)}
          hint="Expected annual bonus or other one-time income"
        />
      </FieldGroup>

      {profile.hasSpouse && (
        <FieldGroup label="Spouse / Partner Income">
          <CurrencyField
            label="Spouse annual salary"
            value={income.spouseAnnualSalary}
            onChange={(v) => update("spouseAnnualSalary", v)}
          />
          <PercentField
            label="Spouse expected annual raise"
            value={income.spouseAnnualRaise}
            onChange={(v) => update("spouseAnnualRaise", v)}
            step={0.5}
          />
        </FieldGroup>
      )}
    </SectionForm>
  );
}
