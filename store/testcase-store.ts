import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TestCase, TestStep } from "@/lib/schemas";

interface TestCaseState {
  testCases: TestCase[];
  currentIssueKey: string | null;
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
}

type TestCaseStore = TestCaseState & TestCaseActions;

export const useTestCaseStore = create<TestCaseStore>()(
  persist(
    (set, get) => ({
      // State
      testCases: [],
      currentIssueKey: null,

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
        });
      },
    }),
    {
      name: "test-case-storage",
      partialize: (state) => ({
        testCases: state.testCases,
        currentIssueKey: state.currentIssueKey,
      }),
    }
  )
);

