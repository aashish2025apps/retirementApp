"use client";

import { useRetirementStore } from "@/lib/store";
import { SectionForm, FieldGroup } from "@/components/forms/section-form";
import { AgeField, Field } from "@/components/forms/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { US_STATES } from "@/lib/constants/states";

export default function ProfilePage() {
  const { scenarioData, updateScenarioData } = useRetirementStore();
  const { profile } = scenarioData;

  function update(key: string, value: unknown) {
    updateScenarioData({ profile: { ...profile, [key]: value } });
  }

  return (
    <SectionForm title="Profile" description="Basic personal information used across all calculations.">
      <FieldGroup label="Personal">
        <AgeField
          label="Current age"
          value={profile.currentAge}
          onChange={(v) => update("currentAge", v)}
          min={18}
          max={80}
        />
        <AgeField
          label="Target retirement age"
          value={profile.retirementAge}
          onChange={(v) => update("retirementAge", v)}
          min={profile.currentAge + 1}
          max={80}
        />
        <AgeField
          label="Life expectancy"
          value={profile.lifeExpectancy}
          onChange={(v) => update("lifeExpectancy", v)}
          min={profile.retirementAge + 1}
          max={110}
          hint="Planning conservatively to 90+ is recommended"
        />
      </FieldGroup>

      <FieldGroup label="Tax Profile">
        <Field label="Filing status">
          <Select
            value={profile.filingStatus}
            onValueChange={(v) => update("filingStatus", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="married">Married filing jointly</SelectItem>
              <SelectItem value="hoh">Head of household</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="State of residence">
          <Select value={profile.state} onValueChange={(v) => update("state", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {US_STATES.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      <FieldGroup label="Spouse / Partner">
        <div className="flex items-center gap-3">
          <Switch
            id="hasSpouse"
            checked={profile.hasSpouse}
            onCheckedChange={(v) => update("hasSpouse", v)}
          />
          <Label htmlFor="hasSpouse">Include spouse / partner</Label>
        </div>

        {profile.hasSpouse && (
          <>
            <AgeField
              label="Spouse current age"
              value={profile.spouseAge ?? 35}
              onChange={(v) => update("spouseAge", v)}
              min={18}
              max={80}
            />
            <AgeField
              label="Spouse retirement age"
              value={profile.spouseRetirementAge ?? 65}
              onChange={(v) => update("spouseRetirementAge", v)}
              min={(profile.spouseAge ?? 35) + 1}
              max={80}
            />
          </>
        )}
      </FieldGroup>
    </SectionForm>
  );
}
