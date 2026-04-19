"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface CurrencyFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  min?: number;
  max?: number;
}

export function CurrencyField({ label, value, onChange, hint, min = 0, max }: CurrencyFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
        <Input
          type="number"
          className="pl-7"
          value={value || ""}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </Field>
  );
}

interface PercentFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function PercentField({ label, value, onChange, hint, min = 0, max = 100, step = 0.1 }: PercentFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <Input
          type="number"
          className="pr-7"
          value={value || ""}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
      </div>
    </Field>
  );
}

interface AgeFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  min?: number;
  max?: number;
}

export function AgeField({ label, value, onChange, hint, min = 18, max = 100 }: AgeFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        value={value || ""}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}
