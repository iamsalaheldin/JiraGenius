"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TestCase, TestCaseSchema, TestStep } from "@/lib/schemas";
import { useTestCaseStore } from "@/store/testcase-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Edit2,
  Save,
  X,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface TestCaseCardProps {
  testCase: TestCase;
  issueKey?: string | null;
}

export function TestCaseCard({ testCase, issueKey }: TestCaseCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const {
    updateTestCase,
    deleteTestCase,
    reorderSteps,
    addStep,
    updateStep,
    deleteStep,
    toggleTestCaseSelection,
    isTestCaseSelected,
  } = useTestCaseStore();
  
  const isSelected = isTestCaseSelected(testCase.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.input<typeof TestCaseSchema>>({
    resolver: zodResolver(TestCaseSchema),
    defaultValues: testCase,
  });

  const onSave = (data: z.input<typeof TestCaseSchema>) => {
    updateTestCase(testCase.id, data as TestCase);
    setIsEditing(false);
    reset(data);
  };

  const onCancel = () => {
    setIsEditing(false);
    reset(testCase);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this test case?")) {
      deleteTestCase(testCase.id);
    }
  };

  const handleAddStep = () => {
    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      action: "",
      expectedResult: "",
    };
    addStep(testCase.id, newStep);
  };

  const handleDeleteStep = (stepId: string) => {
    if (testCase.steps.length <= 1) {
      alert("Cannot delete the last step. A test case must have at least one step.");
      return;
    }
    if (confirm("Are you sure you want to delete this step?")) {
      deleteStep(testCase.id, stepId);
    }
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < testCase.steps.length) {
      reorderSteps(testCase.id, index, newIndex);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };


  if (!isEditing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleTestCaseSelection(testCase.id)}
                  className="h-4 w-4 rounded border-gray-300"
                  onClick={(e) => e.stopPropagation()}
                />
                <Badge variant="outline">{testCase.id}</Badge>
                <Badge variant={getPriorityColor(testCase.priority)}>
                  {testCase.priority || "medium"}
                </Badge>
              </div>
              <CardTitle className="text-lg">{testCase.title}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {testCase.preconditions && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Preconditions:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {testCase.preconditions}
              </p>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-sm mb-2">Test Steps:</h4>
            <div className="space-y-3">
              {testCase.steps.map((step, index) => (
                <div key={step.id} className="border-l-2 border-primary pl-3">
                  <div className="text-sm">
                    <span className="font-medium">Step {index + 1}: </span>
                    {step.action}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium">Expected: </span>
                    {step.expectedResult}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">Edit Test Case</CardTitle>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handleSubmit(onSave)}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`title-${testCase.id}`}>Title</Label>
            <Input
              id={`title-${testCase.id}`}
              {...register("title")}
              placeholder="Test case title"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`preconditions-${testCase.id}`}>Preconditions</Label>
            <Textarea
              id={`preconditions-${testCase.id}`}
              {...register("preconditions")}
              placeholder="Prerequisites for this test case"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`priority-${testCase.id}`}>Priority</Label>
            <Select
              defaultValue={testCase.priority || "medium"}
              onValueChange={(value) =>
                updateTestCase(testCase.id, { priority: value as "low" | "medium" | "high" })
              }
            >
              <SelectTrigger id={`priority-${testCase.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Test Steps</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddStep}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            </div>

            {testCase.steps.map((step, index) => (
              <div key={step.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Step {index + 1}</span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveStep(index, "up")}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveStep(index, "down")}
                      disabled={index === testCase.steps.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStep(step.id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={testCase.steps.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Action"
                    value={step.action}
                    onChange={(e) =>
                      updateStep(testCase.id, step.id, { action: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Expected Result"
                    value={step.expectedResult}
                    onChange={(e) =>
                      updateStep(testCase.id, step.id, { expectedResult: e.target.value })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

