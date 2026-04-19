"use client";

import { useEffect, useState } from "react";
import { useRetirementStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, FolderOpen, Trash2, Star } from "lucide-react";
import type { ScenarioData } from "@/lib/types";

interface ScenarioMeta {
  id: string;
  name: string;
  isDefault: boolean;
  updatedAt: string;
}

export default function SavedPlansPage() {
  const { scenarioData, updateScenarioData, setActiveScenario, setScenarioList, scenarioList, activeScenarioId, markClean } = useRetirementStore();
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((data) => setScenarioList(data))
      .catch(console.error);
  }, [setScenarioList]);

  async function createScenario() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, data: scenarioData }),
      });
      const created = await res.json();
      setScenarioList([created, ...scenarioList]);
      setActiveScenario(created.id);
      markClean();
      setNewName("");
    } finally {
      setLoading(false);
    }
  }

  async function loadScenario(id: string) {
    const res = await fetch(`/api/scenarios/${id}`);
    const scenario = await res.json();
    updateScenarioData({
      profile: scenario.profile,
      income: scenario.income,
      accounts: scenario.accounts,
      spending: scenario.spending,
      assumptions: scenario.assumptions,
      socialSecurity: scenario.socialSecurity ?? undefined,
      debts: scenario.debts ?? undefined,
      education: scenario.education ?? undefined,
      rothConversion: scenario.rothConversion ?? undefined,
      windfalls: scenario.windfalls ?? undefined,
    } as Partial<ScenarioData>);
    setActiveScenario(id);
    markClean();
  }

  async function deleteScenario(id: string) {
    await fetch(`/api/scenarios/${id}`, { method: "DELETE" });
    setScenarioList(scenarioList.filter((s) => s.id !== id));
    if (activeScenarioId === id) setActiveScenario("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saved Plans</h1>
        <p className="text-muted-foreground">Save and switch between different retirement scenarios</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Save current plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder='e.g. "Retire at 60", "Aggressive savings"'
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createScenario()}
            />
            <Button onClick={createScenario} disabled={loading || !newName.trim()} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {scenarioList.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <FolderOpen className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p className="text-sm">No saved plans yet. Save your current plan above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scenarioList.map((s: ScenarioMeta) => (
            <Card key={s.id} className={activeScenarioId === s.id ? "border-primary" : ""}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{s.name}</p>
                    {s.isDefault && <Badge variant="secondary"><Star className="mr-1 h-3 w-3" />Default</Badge>}
                    {activeScenarioId === s.id && <Badge>Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Updated {new Date(s.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={activeScenarioId === s.id ? "default" : "outline"}
                  onClick={() => loadScenario(s.id)}
                >
                  {activeScenarioId === s.id ? "Active" : "Load"}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => deleteScenario(s.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
