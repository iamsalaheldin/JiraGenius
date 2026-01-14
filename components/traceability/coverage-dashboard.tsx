"use client";

import { useTestCaseStore } from "@/store/testcase-store";
import { useTraceabilityStore } from "@/store/traceability-store";
import { getCoverageSummary, analyzeCoverage } from "@/lib/coverage-analyzer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, FileText, ListChecks, Globe, Database } from "lucide-react";
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

  // Calculate progress ring circumference
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const coverageOffset = circumference - (summary.coveragePercentage / 100) * circumference;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overall Coverage Card */}
      <Card className="glass shadow-layered border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">Coverage Overview</CardTitle>
              <CardDescription className="mt-1">
                Test case coverage of extracted requirements
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Requirements */}
            <div className="glass rounded-xl p-6 border border-border/50 hover-lift">
              <p className="text-sm text-muted-foreground mb-2">Total Requirements</p>
              <p className="text-4xl font-bold text-foreground">{summary.totalRequirements}</p>
            </div>
            
            {/* Covered */}
            <div className="glass rounded-xl p-6 border border-green-500/20 bg-green-500/5 hover-lift">
              <p className="text-sm text-muted-foreground mb-2">Covered</p>
              <p className="text-4xl font-bold text-green-500">{summary.coveredRequirements}</p>
            </div>
            
            {/* Uncovered */}
            <div className="glass rounded-xl p-6 border border-red-500/20 bg-red-500/5 hover-lift">
              <p className="text-sm text-muted-foreground mb-2">Uncovered</p>
              <p className="text-4xl font-bold text-red-500">{summary.uncoveredRequirements}</p>
            </div>
            
            {/* Coverage Percentage with Progress Ring */}
            <div className="glass rounded-xl p-6 border border-border/50 hover-lift flex flex-col items-center justify-center gap-2">
              <p className="text-sm text-muted-foreground">Coverage</p>
              <div className="relative inline-flex items-center justify-center">
                <svg className="progress-ring w-28 h-28" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted opacity-20"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={coverageOffset}
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ${
                      summary.coveragePercentage >= 80
                        ? "text-green-500"
                        : summary.coveragePercentage >= 50
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className={`text-3xl font-bold ${getCoverageColor(summary.coveragePercentage)}`}>
                    {summary.coveragePercentage}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage by Source */}
      <Card className="glass shadow-layered border-border/50">
        <CardHeader>
          <CardTitle className="text-xl">Coverage by Source</CardTitle>
          <CardDescription>
            Requirements coverage broken down by source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(summary.requirementsBySource).map(([source, data]) => {
              if (data.total === 0) return null;
              return (
                <div key={source} className="glass rounded-lg p-4 border border-border/50 hover-lift space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        {getSourceIcon(source as Requirement["source"])}
                      </div>
                      <span className="font-semibold">{getSourceLabel(source as Requirement["source"])}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {data.covered}/{data.total}
                      </span>
                      <Badge 
                        variant={data.percentage >= 80 ? "default" : data.percentage >= 50 ? "secondary" : "destructive"}
                        className="shadow-sm"
                      >
                        {data.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-1000 ${
                        data.percentage >= 80
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : data.percentage >= 50
                          ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                          : "bg-gradient-to-r from-red-500 to-orange-500"
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
      <Card className="glass shadow-layered border-border/50">
        <CardHeader>
          <CardTitle className="text-xl">Coverage by Category</CardTitle>
          <CardDescription>
            Requirements coverage broken down by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(summary.requirementsByCategory).map(([category, data]) => {
              if (data.total === 0) return null;
              return (
                <div key={category} className="glass rounded-lg p-4 border border-border/50 hover-lift space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{getCategoryLabel(category as Requirement["category"])}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {data.covered}/{data.total}
                      </span>
                      <Badge 
                        variant={data.percentage >= 80 ? "default" : data.percentage >= 50 ? "secondary" : "destructive"}
                        className="shadow-sm"
                      >
                        {data.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-1000 ${
                        data.percentage >= 80
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : data.percentage >= 50
                          ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                          : "bg-gradient-to-r from-red-500 to-orange-500"
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
        <Card className="glass shadow-layered border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-xl">Uncovered Requirements</CardTitle>
                <CardDescription>
                  {analysis.uncoveredRequirements.length} requirement{analysis.uncoveredRequirements.length !== 1 ? "s" : ""} without test case coverage
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {analysis.uncoveredRequirements.map((req) => (
                <Alert 
                  key={req.id} 
                  variant="destructive" 
                  className="glass border-red-500/20 bg-red-500/5 animate-fade-in"
                >
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="text-xs shadow-sm">
                            {getSourceLabel(req.source)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs shadow-sm">
                            {getCategoryLabel(req.category)}
                          </Badge>
                          <Badge 
                            variant={req.priority === "high" ? "destructive" : req.priority === "medium" ? "default" : "secondary"} 
                            className="text-xs shadow-sm"
                          >
                            {req.priority}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">{req.text}</p>
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
        <Alert className="glass border-green-500/20 bg-green-500/5 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-600 dark:text-green-400 font-semibold">
            Excellent! All {summary.totalRequirements} requirement{summary.totalRequirements !== 1 ? "s are" : " is"} covered by test cases.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

