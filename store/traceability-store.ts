import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Requirement } from "@/lib/schemas";

interface TraceabilityState {
  requirements: Requirement[];
  currentIssueKey: string | null;
}

interface TraceabilityActions {
  setRequirements: (requirements: Requirement[], issueKey?: string) => void;
  addRequirements: (requirements: Requirement[]) => void;
  updateRequirement: (id: string, updates: Partial<Requirement>) => void;
  deleteRequirement: (id: string) => void;
  clearRequirements: () => void;
  getRequirementsBySource: (source: Requirement["source"]) => Requirement[];
  getRequirementsByCategory: (category: Requirement["category"]) => Requirement[];
  getCoveredRequirements: (testCaseRequirementIds: string[]) => Requirement[];
  getUncoveredRequirements: (testCaseRequirementIds: string[]) => Requirement[];
  calculateCoverageMetrics: (testCaseRequirementIds: string[]) => {
    total: number;
    covered: number;
    uncovered: number;
    coveragePercentage: number;
    bySource: Record<Requirement["source"], { total: number; covered: number }>;
    byCategory: Record<Requirement["category"], { total: number; covered: number }>;
  };
}

type TraceabilityStore = TraceabilityState & TraceabilityActions;

export const useTraceabilityStore = create<TraceabilityStore>()(
  persist(
    (set, get) => ({
      // State
      requirements: [],
      currentIssueKey: null,

      // Actions
      setRequirements: (requirements: Requirement[], issueKey?: string) => {
        set({
          requirements,
          currentIssueKey: issueKey || null,
        });
      },

      addRequirements: (requirements: Requirement[]) => {
        set((state) => {
          // Avoid duplicates by checking ID
          const existingIds = new Set(state.requirements.map(r => r.id));
          const newRequirements = requirements.filter(r => !existingIds.has(r.id));
          return {
            requirements: [...state.requirements, ...newRequirements],
          };
        });
      },

      updateRequirement: (id: string, updates: Partial<Requirement>) => {
        set((state) => ({
          requirements: state.requirements.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      deleteRequirement: (id: string) => {
        set((state) => ({
          requirements: state.requirements.filter((r) => r.id !== id),
        }));
      },

      clearRequirements: () => {
        set({
          requirements: [],
          currentIssueKey: null,
        });
      },

      getRequirementsBySource: (source: Requirement["source"]) => {
        return get().requirements.filter((r) => r.source === source);
      },

      getRequirementsByCategory: (category: Requirement["category"]) => {
        return get().requirements.filter((r) => r.category === category);
      },

      getCoveredRequirements: (testCaseRequirementIds: string[]) => {
        const requirementIds = new Set(testCaseRequirementIds);
        return get().requirements.filter((r) => requirementIds.has(r.id));
      },

      getUncoveredRequirements: (testCaseRequirementIds: string[]) => {
        const requirementIds = new Set(testCaseRequirementIds);
        return get().requirements.filter((r) => !requirementIds.has(r.id));
      },

      calculateCoverageMetrics: (testCaseRequirementIds: string[]) => {
        const state = get();
        const requirementIds = new Set(testCaseRequirementIds);
        const total = state.requirements.length;
        const covered = state.requirements.filter((r) => requirementIds.has(r.id)).length;
        const uncovered = total - covered;
        const coveragePercentage = total > 0 ? Math.round((covered / total) * 100) : 0;

        // Calculate by source
        const bySource: Record<Requirement["source"], { total: number; covered: number }> = {
          user_story: { total: 0, covered: 0 },
          acceptance_criteria: { total: 0, covered: 0 },
          file: { total: 0, covered: 0 },
          confluence: { total: 0, covered: 0 },
        };

        state.requirements.forEach((r) => {
          bySource[r.source].total++;
          if (requirementIds.has(r.id)) {
            bySource[r.source].covered++;
          }
        });

        // Calculate by category
        const byCategory: Record<Requirement["category"], { total: number; covered: number }> = {
          functional: { total: 0, covered: 0 },
          "non-functional": { total: 0, covered: 0 },
          api: { total: 0, covered: 0 },
          flow: { total: 0, covered: 0 },
          edge_case: { total: 0, covered: 0 },
        };

        state.requirements.forEach((r) => {
          byCategory[r.category].total++;
          if (requirementIds.has(r.id)) {
            byCategory[r.category].covered++;
          }
        });

        return {
          total,
          covered,
          uncovered,
          coveragePercentage,
          bySource,
          byCategory,
        };
      },
    }),
    {
      name: "traceability-storage",
      partialize: (state) => ({
        requirements: state.requirements,
        currentIssueKey: state.currentIssueKey,
      }),
    }
  )
);

