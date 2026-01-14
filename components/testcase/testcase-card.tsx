"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TestCase, TestStep } from "@/lib/schemas";
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
} from "lucide-react";

// Partial schema for form validation (steps are managed separately)
const TestCaseFormSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  preconditions: z.string().optional().default(""),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
});

interface TestCaseCardProps {
  testCase: TestCase;
  issueKey?: string | null;
}

export function TestCaseCard({ testCase }: TestCaseCardProps) {
  const [isEditing, setIsEditing] = useState(false);
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
  } = useForm<z.input<typeof TestCaseFormSchema>>({
    resolver: zodResolver(TestCaseFormSchema),
    defaultValues: {
      id: testCase.id,
      title: testCase.title,
      preconditions: testCase.preconditions || "",
      priority: testCase.priority || "medium",
    },
  });

  const onSave = (data: z.input<typeof TestCaseFormSchema>) => {
    // Validate that steps have content (since steps are managed outside the form)
    const hasEmptySteps = testCase.steps.some(
      step => !step.action.trim() || !step.expectedResult.trim()
    );
    
    if (hasEmptySteps) {
      alert("Please fill in all step actions and expected results before saving.");
      return;
    }
    
    // Update with form data (title, preconditions) and keep current steps from store
    updateTestCase(testCase.id, {
      title: data.title,
      preconditions: data.preconditions,
      priority: data.priority,
      steps: testCase.steps, // Use current steps from store
    });
    setIsEditing(false);
    reset(data);
  };

  const onCancel = () => {
    setIsEditing(false);
    reset({
      id: testCase.id,
      title: testCase.title,
      preconditions: testCase.preconditions || "",
      priority: testCase.priority || "medium",
    });
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

  const getPriorityGradient = (priority?: string) => {
    switch (priority) {
      case "high":
        return "from-red-500 to-orange-500";
      case "medium":
        return "from-yellow-500 to-amber-500";
      case "low":
        return "from-green-500 to-emerald-500";
      default:
        return "from-primary to-accent";
    }
  };


  if (!isEditing) {
    return (
      <Card className="glass hover-lift shadow-layered border-border/50 animate-fade-in group">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleTestCaseSelection(testCase.id)}
                  className="h-4 w-4 rounded border-border cursor-pointer accent-primary"
                  onClick={(e) => e.stopPropagation()}
                />
                <Badge variant="outline" className="font-mono text-xs">{testCase.id}</Badge>
                <Badge 
                  variant={getPriorityColor(testCase.priority)}
                  className={`bg-gradient-to-r ${getPriorityGradient(testCase.priority)} text-white border-0 shadow-sm`}
                >
                  {testCase.priority || "medium"}
                </Badge>
                {testCase.requirementIds && testCase.requirementIds.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {testCase.requirementIds.length} requirement{testCase.requirementIds.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                {testCase.title}
              </CardTitle>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="hover-lift"
                title="Edit test case"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 hover-lift"
                title="Delete test case"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {testCase.preconditions && (
            <div className="glass rounded-lg p-4 border border-border/50">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Preconditions:
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {testCase.preconditions}
              </p>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Test Steps:
            </h4>
            <div className="space-y-3">
              {testCase.steps.map((step, index) => (
                <div 
                  key={step.id} 
                  className="relative border-l-2 border-primary/50 pl-4 py-2 rounded-r-lg glass hover:border-primary transition-colors group/step"
                >
                  <div className="absolute -left-2 top-3 w-4 h-4 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">{index + 1}</span>
                  </div>
                  <div className="text-sm mb-2">
                    <span className="font-semibold text-foreground">Action: </span>
                    <span className="text-muted-foreground">{step.action}</span>
                  </div>
                  <div className="text-sm text-muted-foreground pl-4 border-l-2 border-accent/30">
                    <span className="font-semibold text-foreground">Expected: </span>
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
    <Card className="glass border-primary/50 shadow-layered-lg animate-slide-up">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <Edit2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <CardTitle className="text-lg font-bold">Edit Test Case</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSubmit(onSave)}
              className="hover-lift shadow-glow"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCancel}
              className="hover-lift"
            >
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
              <div key={step.id} className="border border-border/50 rounded-lg p-4 space-y-3 glass hover-lift group/step">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-sm">Step {index + 1}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover/step:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveStep(index, "up")}
                      disabled={index === 0}
                      className="hover-lift"
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveStep(index, "down")}
                      disabled={index === testCase.steps.length - 1}
                      className="hover-lift"
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStep(step.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 hover-lift"
                      disabled={testCase.steps.length <= 1}
                      title="Delete step"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Action</Label>
                    <Input
                      placeholder="Enter the action to perform..."
                      value={step.action}
                      onChange={(e) =>
                        updateStep(testCase.id, step.id, { action: e.target.value })
                      }
                      className="transition-all focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Expected Result</Label>
                    <Input
                      placeholder="Enter the expected result..."
                      value={step.expectedResult}
                      onChange={(e) =>
                        updateStep(testCase.id, step.id, { expectedResult: e.target.value })
                      }
                      className="transition-all focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

