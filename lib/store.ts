"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScenarioData } from "@/lib/types";
import { getBlankScenarioData } from "@/lib/calculations/engine";

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
  // tracks whether this browser session has loaded data for the signed-in user
  loadedUserId: string | null;
  setActiveScenario: (id: string) => void;
  setScenarioList: (list: ScenarioMeta[]) => void;
  updateScenarioData: (data: Partial<ScenarioData>) => void;
  resetToDefault: () => void;
  markClean: () => void;
  initForUser: (userId: string) => void;
}

export const useRetirementStore = create<RetirementStore>()(
  persist(
    (set, get) => ({
      activeScenarioId: null,
      scenarioList: [],
      scenarioData: getBlankScenarioData(),
      isDirty: false,
      loadedUserId: null,
      setActiveScenario: (id) => set({ activeScenarioId: id }),
      setScenarioList: (list) => set({ scenarioList: list }),
      updateScenarioData: (data) =>
        set((state) => ({
          scenarioData: { ...state.scenarioData, ...data },
          isDirty: true,
        })),
      resetToDefault: () =>
        set({ scenarioData: getBlankScenarioData(), isDirty: false }),
      markClean: () => set({ isDirty: false }),
      // Call this on sign-in. If it's a different user, wipe local state.
      initForUser: (userId: string) => {
        if (get().loadedUserId !== userId) {
          set({
            scenarioData: getBlankScenarioData(),
            activeScenarioId: null,
            scenarioList: [],
            isDirty: false,
            loadedUserId: userId,
          });
        }
      },
    }),
    {
      name: "retirement-store",
      version: 3,
      partialize: (state) => ({
        scenarioData: state.scenarioData,
        activeScenarioId: state.activeScenarioId,
        loadedUserId: state.loadedUserId,
      }),
      migrate: (persisted: unknown) => {
        const state = persisted as {
          scenarioData?: { windfalls?: { items?: unknown[] } };
          loadedUserId?: string | null;
        };
        // Ensure loadedUserId exists after migration
        if (!("loadedUserId" in state)) {
          (state as Record<string, unknown>).loadedUserId = null;
        }
        if (state?.scenarioData?.windfalls?.items) {
          state.scenarioData.windfalls.items = state.scenarioData.windfalls.items.map(
            (w: unknown) => {
              const wf = w as Record<string, unknown>;
              if (!wf.exchangeFund) {
                const slices = (wf.slices as Record<string, unknown>[] | undefined) ?? [];
                const ef = slices.find((s) => s.strategy === "exchange-fund");
                const sd = slices.find((s) => s.strategy === "sell-diversify");
                const hc = slices.find((s) => s.strategy === "hold-cash");
                return {
                  id: wf.id, name: wf.name, age: wf.age,
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
