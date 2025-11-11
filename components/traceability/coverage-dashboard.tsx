"use client";

import { useTestCaseStore } from "@/store/testcase-store";
import { useTraceabilityStore } from "@/store/traceability-store";
import { getCoverageSummary, analyzeCoverage } from "@/lib/coverage-analyzer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, FileText, ListChecks, Globe, Database } from "lucide-react";
import { Requirement } from "@/lib/schemas";

export function CoverageDashboard() {
  const { testCases } = useTestCaseStore();
  const { requirements } = useTraceabilityStore();

  if (requirements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Coverage Analysis</CardTitle>
          <CardDescription>
            No requirements extracted yet. Requirements will be extracted automatically when you fetch a user story, upload files, or fetch a Confluence page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const summary = getCoverageSummary(testCases, requirements);
  const analysis = analyzeCoverage(testCases, requirements);

  const getSourceIcon = (source: Requirement["source"]) => {
    switch (source) {
      case "user_story":
        return <FileText className="h-4 w-4" />;
      case "acceptance_criteria":
        return <ListChecks className="h-4 w-4" />;
      case "file":
        return <Database className="h-4 w-4" />;
      case "confluence":
        return <Globe className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (source: Requirement["source"]) => {
    switch (source) {
      case "user_story":
        return "User Story";
      case "acceptance_criteria":
        return "Acceptance Criteria";
      case "file":
        return "Files";
      case "confluence":
        return "Confluence";
    }
  };

  const getCategoryLabel = (category: Requirement["category"]) => {
    switch (category) {
      case "functional":
        return "Functional";
      case "non-functional":
        return "Non-Functional";
      case "api":
        return "API";
      case "flow":
        return "Flow";
      case "edge_case":
        return "Edge Case";
    }
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Overall Coverage Card */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage Overview</CardTitle>
          <CardDescription>
            Test case coverage of extracted requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Requirements</p>
              <p className="text-3xl font-bold">{summary.totalRequirements}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Covered</p>
              <p className="text-3xl font-bold text-green-600">{summary.coveredRequirements}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Uncovered</p>
              <p className="text-3xl font-bold text-red-600">{summary.uncoveredRequirements}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Coverage</p>
              <p className={`text-3xl font-bold ${getCoverageColor(summary.coveragePercentage)}`}>
                {summary.coveragePercentage}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage by Source */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage by Source</CardTitle>
          <CardDescription>
            Requirements coverage broken down by source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(summary.requirementsBySource).map(([source, data]) => {
              if (data.total === 0) return null;
              return (
                <div key={source} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(source as Requirement["source"])}
                      <span className="font-medium">{getSourceLabel(source as Requirement["source"])}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {data.covered}/{data.total}
                      </span>
                      <Badge variant={data.percentage >= 80 ? "default" : data.percentage >= 50 ? "secondary" : "destructive"}>
                        {data.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        data.percentage >= 80
                          ? "bg-green-600"
                          : data.percentage >= 50
                          ? "bg-yellow-600"
                          : "bg-red-600"
                      }`}
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Coverage by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage by Category</CardTitle>
          <CardDescription>
            Requirements coverage broken down by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(summary.requirementsByCategory).map(([category, data]) => {
              if (data.total === 0) return null;
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{getCategoryLabel(category as Requirement["category"])}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {data.covered}/{data.total}
                      </span>
                      <Badge variant={data.percentage >= 80 ? "default" : data.percentage >= 50 ? "secondary" : "destructive"}>
                        {data.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        data.percentage >= 80
                          ? "bg-green-600"
                          : data.percentage >= 50
                          ? "bg-yellow-600"
                          : "bg-red-600"
                      }`}
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Uncovered Requirements */}
      {analysis.uncoveredRequirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uncovered Requirements</CardTitle>
            <CardDescription>
              {analysis.uncoveredRequirements.length} requirement{analysis.uncoveredRequirements.length !== 1 ? "s" : ""} without test case coverage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {analysis.uncoveredRequirements.map((req) => (
                <Alert key={req.id} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {getSourceLabel(req.source)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryLabel(req.category)}
                          </Badge>
                          <Badge variant={req.priority === "high" ? "destructive" : req.priority === "medium" ? "default" : "secondary"} className="text-xs">
                            {req.priority}
                          </Badge>
                        </div>
                        <p className="text-sm">{req.text}</p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Requirements Covered */}
      {analysis.uncoveredRequirements.length === 0 && summary.totalRequirements > 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Excellent! All {summary.totalRequirements} requirement{summary.totalRequirements !== 1 ? "s are" : " is"} covered by test cases.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

