"use client";

import { useState } from "react";
import { useTestCaseStore } from "@/store/testcase-store";
import { TestCaseCard } from "./testcase-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadCSV } from "@/lib/csv-export";
import { downloadJSON } from "@/lib/json-export";
import { TestCase, ModelConfig } from "@/lib/schemas";
import { FileJson, FileSpreadsheet, Plus, Sparkles, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TestCaseListProps {
  issueKey?: string;
  onGenerateMore?: (config: ModelConfig) => Promise<void>;
}

export function TestCaseList({ issueKey, onGenerateMore }: TestCaseListProps) {
  const { testCases, addTestCase, clearTestCases } = useTestCaseStore();
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const handleAddTestCase = () => {
    const newTestCase: TestCase = {
      id: `TC-${Date.now()}`,
      title: "New Test Case",
      preconditions: "",
      steps: [
        {
          id: `step-${Date.now()}`,
          action: "",
          expectedResult: "",
        },
      ],
      priority: "medium",
      requirementIds: [],
    };
    addTestCase(newTestCase);
  };

  const handleExportCSV = () => {
    const filename = issueKey 
      ? `test-cases-${issueKey}-${Date.now()}.csv`
      : `test-cases-${Date.now()}.csv`;
    downloadCSV(testCases, filename);
  };

  const handleExportJSON = () => {
    const filename = issueKey
      ? `test-cases-${issueKey}-${Date.now()}.json`
      : `test-cases-${Date.now()}.json`;
    downloadJSON(testCases, filename);
  };

  const handleGenerateMore = async () => {
    if (!onGenerateMore) {
      toast.error("Generate function not available");
      return;
    }

    setIsGeneratingMore(true);
    try {
      await onGenerateMore({});
    } catch (error) {
      // Error is already handled in the parent component
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleClear = () => {
    setShowClearDialog(true);
  };

  const handleConfirmClear = () => {
    clearTestCases();
    setShowClearDialog(false);
    toast.success("All test cases cleared");
  };

  if (testCases.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Generated Test Cases</CardTitle>
              <CardDescription>
                {testCases.length} test case{testCases.length !== 1 ? "s" : ""} generated
                {issueKey && ` for ${issueKey}`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAddTestCase}>
                <Plus className="h-4 w-4 mr-1" />
                Add Test Case
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                <FileJson className="h-4 w-4 mr-1" />
                Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Review and edit the generated test cases below. You can reorder steps, add/remove steps,
            change priorities, and export to CSV or JSON when ready.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {testCases.map((testCase) => (
          <TestCaseCard key={testCase.id} testCase={testCase} />
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Need more test cases?
            </p>
            <div className="flex gap-2 justify-center">
              {onGenerateMore && (
                <Button 
                  variant="default" 
                  onClick={handleGenerateMore}
                  disabled={isGeneratingMore}
                >
                  {isGeneratingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate More Test Cases
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={handleAddTestCase}>
                <Plus className="h-4 w-4 mr-2" />
                Add Manual Test Case
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Test Cases?</DialogTitle>
            <DialogDescription>
              This will permanently remove all {testCases.length} test case{testCases.length !== 1 ? "s" : ""}. 
              This action cannot be undone. Make sure you've exported your test cases if you need them later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmClear}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

