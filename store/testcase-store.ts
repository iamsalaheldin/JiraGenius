import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TestCase, TestStep } from "@/lib/schemas";

export type UploadStatus = "pending" | "uploading" | "uploaded" | "skipped" | "failed";

export interface TestCaseUploadStatus {
  uploadStatus: UploadStatus;
  jiraTestKey: string | null;
  uploadError: string | null;
}

interface TestCaseState {
  testCases: TestCase[];
  currentIssueKey: string | null;
  uploadStatuses: Record<string, TestCaseUploadStatus>;
  selectedTestCases: Set<string>;
}

interface TestCaseActions {
  setTestCases: (cases: TestCase[], issueKey?: string) => void;
  appendTestCases: (cases: TestCase[]) => void;
  addTestCase: (testCase: TestCase) => void;
  updateTestCase: (id: string, updates: Partial<TestCase>) => void;
  deleteTestCase: (id: string) => void;
  reorderSteps: (caseId: string, fromIndex: number, toIndex: number) => void;
  addStep: (caseId: string, step: TestStep) => void;
  updateStep: (caseId: string, stepId: string, updates: Partial<TestStep>) => void;
  deleteStep: (caseId: string, stepId: string) => void;
  clearTestCases: () => void;
  // Upload status actions
  setUploadStatus: (
    id: string,
    status: UploadStatus,
    testKey?: string | null,
    error?: string | null
  ) => void;
  clearUploadStatuses: () => void;
  // Selection actions
  toggleTestCaseSelection: (id: string) => void;
  selectAllTestCases: () => void;
  deselectAllTestCases: () => void;
  isTestCaseSelected: (id: string) => boolean;
}

type TestCaseStore = TestCaseState & TestCaseActions;

export const useTestCaseStore = create<TestCaseStore>()(
  persist(
    (set, get) => ({
      // State
      testCases: [],
      currentIssueKey: null,
      uploadStatuses: {},
      selectedTestCases: new Set<string>(),

      // Actions
      setTestCases: (cases: TestCase[], issueKey?: string) => {
        set({
          testCases: cases,
          currentIssueKey: issueKey || null,
        });
      },

      appendTestCases: (cases: TestCase[]) => {
        set((state) => ({
          testCases: [...state.testCases, ...cases],
        }));
      },

      addTestCase: (testCase: TestCase) => {
        set((state) => ({
          testCases: [...state.testCases, testCase],
        }));
      },

      updateTestCase: (id: string, updates: Partial<TestCase>) => {
        set((state) => ({
          testCases: state.testCases.map((tc) =>
            tc.id === id ? { ...tc, ...updates } : tc
          ),
        }));
      },

      deleteTestCase: (id: string) => {
        set((state) => ({
          testCases: state.testCases.filter((tc) => tc.id !== id),
        }));
      },

      reorderSteps: (caseId: string, fromIndex: number, toIndex: number) => {
        set((state) => ({
          testCases: state.testCases.map((tc) => {
            if (tc.id !== caseId) return tc;

            const newSteps = [...tc.steps];
            const [removed] = newSteps.splice(fromIndex, 1);
            newSteps.splice(toIndex, 0, removed);

            return { ...tc, steps: newSteps };
          }),
        }));
      },

      addStep: (caseId: string, step: TestStep) => {
        set((state) => ({
          testCases: state.testCases.map((tc) => {
            if (tc.id !== caseId) return tc;
            return { ...tc, steps: [...tc.steps, step] };
          }),
        }));
      },

      updateStep: (caseId: string, stepId: string, updates: Partial<TestStep>) => {
        set((state) => ({
          testCases: state.testCases.map((tc) => {
            if (tc.id !== caseId) return tc;

            return {
              ...tc,
              steps: tc.steps.map((step) =>
                step.id === stepId ? { ...step, ...updates } : step
              ),
            };
          }),
        }));
      },

      deleteStep: (caseId: string, stepId: string) => {
        set((state) => ({
          testCases: state.testCases.map((tc) => {
            if (tc.id !== caseId) return tc;

            // Don't allow deleting the last step
            if (tc.steps.length <= 1) return tc;

            return {
              ...tc,
              steps: tc.steps.filter((step) => step.id !== stepId),
            };
          }),
        }));
      },

      clearTestCases: () => {
        set({
          testCases: [],
          currentIssueKey: null,
          uploadStatuses: {},
          selectedTestCases: new Set<string>(),
        });
      },

      // Upload status actions
      setUploadStatus: (
        id: string,
        status: UploadStatus,
        testKey?: string | null,
        error?: string | null
      ) => {
        set((state) => ({
          uploadStatuses: {
            ...state.uploadStatuses,
            [id]: {
              uploadStatus: status,
              jiraTestKey: testKey ?? null,
              uploadError: error ?? null,
            },
          },
        }));
      },

      clearUploadStatuses: () => {
        set({ uploadStatuses: {} });
      },

      // Selection actions
      toggleTestCaseSelection: (id: string) => {
        set((state) => {
          const currentSet: Set<string> = state.selectedTestCases instanceof Set 
            ? state.selectedTestCases 
            : new Set<string>(Array.isArray(state.selectedTestCases) ? state.selectedTestCases : []);
          const newSelected = new Set<string>(currentSet);
          if (newSelected.has(id)) {
            newSelected.delete(id);
          } else {
            newSelected.add(id);
          }
          return { selectedTestCases: newSelected };
        });
      },

      selectAllTestCases: () => {
        set((state) => ({
          selectedTestCases: new Set(state.testCases.map((tc) => tc.id)),
        }));
      },

      deselectAllTestCases: () => {
        set({ selectedTestCases: new Set<string>() });
      },

      isTestCaseSelected: (id: string) => {
        const selected = get().selectedTestCases;
        const selectedSet: Set<string> = selected instanceof Set 
          ? selected 
          : new Set<string>(Array.isArray(selected) ? selected : []);
        return selectedSet.has(id);
      },
    }),
    {
      name: "test-case-storage",
      partialize: (state) => ({
        testCases: state.testCases,
        currentIssueKey: state.currentIssueKey,
        // Note: uploadStatuses and selectedTestCases are not persisted
        // They are session-only state
      }),
    }
  )
);

