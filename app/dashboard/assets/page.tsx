"use client";

import { useRetirementStore } from "@/lib/store";
import { SectionForm, FieldGroup } from "@/components/forms/section-form";
import { CurrencyField, PercentField } from "@/components/forms/field";

export default function AssetsPage() {
  const { scenarioData, updateScenarioData } = useRetirementStore();
  const { accounts, profile } = scenarioData;

  function update(key: string, value: unknown) {
    updateScenarioData({ accounts: { ...accounts, [key]: value } });
  }

  return (
    <SectionForm
      title="Assets & Contributions"
      description="Current balances and annual contribution amounts for all investment accounts."
    >
      <FieldGroup label="401k / 403b / 457">
        <CurrencyField
          label="Current balance"
          value={accounts.k401Balance}
          onChange={(v) => update("k401Balance", v)}
        />
        <CurrencyField
          label="Annual contribution (your portion)"
          value={accounts.k401Contribution}
          onChange={(v) => update("k401Contribution", v)}
          hint="2025 limit: $23,500 ($31,000 if age 50+)"
        />
        <PercentField
          label="Employer match %"
          value={accounts.employerMatchPercent}
          onChange={(v) => update("employerMatchPercent", v)}
          hint="e.g. 50 means employer matches 50 cents per dollar you contribute"
        />
        <PercentField
          label="Employer match limit (% of salary)"
          value={accounts.employerMatchLimit}
          onChange={(v) => update("employerMatchLimit", v)}
          hint="e.g. 6 means match applies to first 6% of salary you contribute"
        />
      </FieldGroup>

      <FieldGroup label="Roth IRA / Roth 401k">
        <CurrencyField
          label="Current Roth balance"
          value={accounts.rothBalance}
          onChange={(v) => update("rothBalance", v)}
        />
        <CurrencyField
          label="Annual Roth contribution"
          value={accounts.rothContribution}
          onChange={(v) => update("rothContribution", v)}
          hint="2025 IRA limit: $7,000 ($8,000 if age 50+)"
        />
      </FieldGroup>

      <FieldGroup label="Traditional IRA">
        <CurrencyField
          label="Current IRA balance"
          value={accounts.iraBalance}
          onChange={(v) => update("iraBalance", v)}
        />
        <CurrencyField
          label="Annual IRA contribution"
          value={accounts.iraContribution}
          onChange={(v) => update("iraContribution", v)}
        />
      </FieldGroup>

      <FieldGroup label="Taxable Brokerage">
        <CurrencyField
          label="Current taxable balance"
          value={accounts.taxableBalance}
          onChange={(v) => update("taxableBalance", v)}
        />
        <CurrencyField
          label="Annual taxable contribution"
          value={accounts.taxableContribution}
          onChange={(v) => update("taxableContribution", v)}
          hint="After-tax dollars invested in a brokerage account"
        />
      </FieldGroup>

      <FieldGroup label="Health Savings Account (HSA)">
        <CurrencyField
          label="Current HSA balance"
          value={accounts.hsaBalance}
          onChange={(v) => update("hsaBalance", v)}
        />
        <CurrencyField
          label="Annual HSA contribution"
          value={accounts.hsaContribution}
          onChange={(v) => update("hsaContribution", v)}
          hint="2025 limits: $4,300 (self) / $8,550 (family)"
        />
      </FieldGroup>

      {profile.hasSpouse && (
        <FieldGroup label="Spouse Accounts">
          <CurrencyField
            label="Spouse 401k balance"
            value={accounts.spouseK401Balance}
            onChange={(v) => update("spouseK401Balance", v)}
          />
          <CurrencyField
            label="Spouse 401k contribution"
            value={accounts.spouseK401Contribution}
            onChange={(v) => update("spouseK401Contribution", v)}
          />
          <CurrencyField
            label="Spouse Roth balance"
            value={accounts.spouseRothBalance}
            onChange={(v) => update("spouseRothBalance", v)}
          />
          <CurrencyField
            label="Spouse Roth contribution"
            value={accounts.spouseRothContribution}
            onChange={(v) => update("spouseRothContribution", v)}
          />
          <CurrencyField
            label="Spouse IRA balance"
            value={accounts.spouseIraBalance}
            onChange={(v) => update("spouseIraBalance", v)}
          />
          <CurrencyField
            label="Spouse IRA contribution"
            value={accounts.spouseIraContribution}
            onChange={(v) => update("spouseIraContribution", v)}
          />
        </FieldGroup>
      )}
    </SectionForm>
  );
}
