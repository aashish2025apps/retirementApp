"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction } from "lucide-react";

export default function HealthcarePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Healthcare</h1>
        <p className="text-muted-foreground">Medical costs, Medicare bridge, and long-term care</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            Coming in Phase 2
            <Badge variant="secondary">Planned</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>This section will include:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Current employer health insurance premium</li>
            <li>ACA marketplace bridge costs before Medicare (ages 60–65)</li>
            <li>Medicare Parts A, B, D, and Medigap premiums</li>
            <li>Out-of-pocket costs and dental/vision</li>
            <li>Long-term care insurance modeling</li>
            <li>HSA-funded medical expense strategy</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
