"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScenarioData } from "@/lib/types";
import { getDefaultScenarioData } from "@/lib/calculations/engine";

interface ScenarioMeta {
  id: string;
  name: string;
  isDefault: boolean;
  updatedAt: string;
}

interface RetirementStore {
  activeScenarioId: string | null;
  scenarioList: ScenarioMeta[];
  scenarioData: ScenarioData;
  isDirty: boolean;
  setActiveScenario: (id: string) => void;
  setScenarioList: (list: ScenarioMeta[]) => void;
  updateScenarioData: (data: Partial<ScenarioData>) => void;
  resetToDefault: () => void;
  markClean: () => void;
}

export const useRetirementStore = create<RetirementStore>()(
  persist(
    (set) => ({
      activeScenarioId: null,
      scenarioList: [],
      scenarioData: getDefaultScenarioData(),
      isDirty: false,
      setActiveScenario: (id) => set({ activeScenarioId: id }),
      setScenarioList: (list) => set({ scenarioList: list }),
      updateScenarioData: (data) =>
        set((state) => ({
          scenarioData: { ...state.scenarioData, ...data },
          isDirty: true,
        })),
      resetToDefault: () =>
        set({ scenarioData: getDefaultScenarioData(), isDirty: false }),
      markClean: () => set({ isDirty: false }),
    }),
    {
      name: "retirement-store",
      version: 2,
      partialize: (state) => ({
        scenarioData: state.scenarioData,
        activeScenarioId: state.activeScenarioId,
      }),
      migrate: (persisted: unknown) => {
        const state = persisted as { scenarioData?: { windfalls?: { items?: unknown[] } } };
        if (state?.scenarioData?.windfalls?.items) {
          state.scenarioData.windfalls.items = state.scenarioData.windfalls.items.map(
            (w: unknown) => {
              const wf = w as Record<string, unknown>;
              // Old shape had slices[]; new shape has exchangeFund / sellDiversify / holdCash
              if (!wf.exchangeFund) {
                const slices = (wf.slices as Record<string, unknown>[] | undefined) ?? [];
                const ef = slices.find((s) => s.strategy === "exchange-fund");
                const sd = slices.find((s) => s.strategy === "sell-diversify");
                const hc = slices.find((s) => s.strategy === "hold-cash");
                return {
                  id: wf.id,
                  name: wf.name,
                  age: wf.age,
                  exchangeFund: ef
                    ? { amount: ef.amount, costBasisPct: ef.costBasisPct, ltcgRatePct: ef.ltcgRatePct, lockupYears: ef.lockupYears ?? 7 }
                    : { amount: 0, costBasisPct: 0, ltcgRatePct: 23.8, lockupYears: 7 },
                  sellDiversify: sd
                    ? { amount: sd.amount, costBasisPct: sd.costBasisPct, ltcgRatePct: sd.ltcgRatePct, targetAccount: sd.targetAccount ?? "taxable" }
                    : { amount: 0, costBasisPct: 0, ltcgRatePct: 23.8, targetAccount: "taxable" },
                  holdCash: typeof (hc?.amount) === "number" ? hc.amount as number : 0,
                };
              }
              return wf;
            }
          );
        }
        return state;
      },
    }
  )
);
