"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SectionForm({ title, description, children }: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      <Card>
        <CardContent className="pt-6 space-y-5">{children}</CardContent>
      </Card>
    </div>
  );
}

export function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
