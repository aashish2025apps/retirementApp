"use client";

import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRetirementStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Save, Menu } from "lucide-react";
import { useState } from "react";

export function Header({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const { isDirty, activeScenarioId } = useRetirementStore();
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!activeScenarioId || !isDirty) return;
    setSaving(true);
    try {
      const { scenarioData } = useRetirementStore.getState();
      await fetch(`/api/scenarios/${activeScenarioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scenarioData),
      });
      useRetirementStore.getState().markClean();
    } finally {
      setSaving(false);
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-3">
        <button
          className="flex lg:hidden"
          onClick={onMobileMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        {isDirty && activeScenarioId && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        )}
        <ThemeToggle />
        <UserButton />
      </div>
    </header>
  );
}
