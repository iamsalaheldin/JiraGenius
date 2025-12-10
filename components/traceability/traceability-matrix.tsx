"use client";

import { useState, useMemo } from "react";
import { useTestCaseStore } from "@/store/testcase-store";
import { useTraceabilityStore } from "@/store/traceability-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, AlertCircle, Filter, Search, Download } from "lucide-react";
import { Requirement } from "@/lib/schemas";
import { downloadTraceabilityMatrix } from "@/lib/traceability-export";

export function TraceabilityMatrix() {
  const { testCases, updateTestCase } = useTestCaseStore();
  const { requirements } = useTraceabilityStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<Requirement["source"] | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<Requirement["category"] | "all">("all");
  const [coverageFilter, setCoverageFilter] = useState<"all" | "covered" | "uncovered">("all");

  // Filter requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      // Search filter
      if (searchTerm && !req.text.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Source filter
      if (sourceFilter !== "all" && req.source !== sourceFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && req.category !== categoryFilter) {
        return false;
      }

      // Coverage filter
      if (coverageFilter !== "all") {
        const allRequirementIds = new Set<string>();
        testCases.forEach(tc => {
          if (tc.requirementIds) {
            tc.requirementIds.forEach(id => allRequirementIds.add(id));
          }
        });
        const isCovered = allRequirementIds.has(req.id);
        if (coverageFilter === "covered" && !isCovered) return false;
        if (coverageFilter === "uncovered" && isCovered) return false;
      }

      return true;
    });
  }, [requirements, searchTerm, sourceFilter, categoryFilter, coverageFilter, testCases]);

  // Get all requirement IDs covered by test cases
  const coveredRequirementIds = useMemo(() => {
    const ids = new Set<string>();
    testCases.forEach(tc => {
      if (tc.requirementIds) {
        tc.requirementIds.forEach(id => ids.add(id));
      }
    });
    return ids;
  }, [testCases]);

  const toggleRequirementLink = (requirementId: string, testCaseId: string) => {
    const testCase = testCases.find(tc => tc.id === testCaseId);
    if (!testCase) return;

    const currentRequirementIds = testCase.requirementIds || [];
    const isLinked = currentRequirementIds.includes(requirementId);

    const newRequirementIds = isLinked
      ? currentRequirementIds.filter(id => id !== requirementId)
      : [...currentRequirementIds, requirementId];

    updateTestCase(testCaseId, { requirementIds: newRequirementIds });
  };

  const getSourceLabel = (source: Requirement["source"]) => {
    switch (source) {
      case "user_story":
        return "User Story";
      case "acceptance_criteria":
        return "AC";
      case "file":
        return "File";
      case "confluence":
        return "Confluence";
    }
  };

  const getCategoryLabel = (category: Requirement["category"]) => {
    switch (category) {
      case "functional":
        return "Func";
      case "non-functional":
        return "Non-Func";
      case "api":
        return "API";
      case "flow":
        return "Flow";
      case "edge_case":
        return "Edge";
    }
  };

  const handleExport = () => {
    downloadTraceabilityMatrix(requirements, testCases);
  };

  if (requirements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Traceability Matrix</CardTitle>
          <CardDescription>
            No requirements extracted yet. Requirements will be extracted automatically when you fetch a user story, upload files, or fetch a Confluence page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (testCases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Traceability Matrix</CardTitle>
          <CardDescription>
            No test cases generated yet. Generate test cases to see the traceability matrix.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="glass shadow-layered border-border/50 animate-fade-in">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">Traceability Matrix</CardTitle>
              <CardDescription className="mt-1">
                Map requirements to test cases. Click cells to link/unlink requirements and test cases.
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            className="hover-lift shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Matrix
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">Search Requirements</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 transition-all focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-filter">Source</Label>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
                <SelectTrigger id="source-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="user_story">User Story</SelectItem>
                  <SelectItem value="acceptance_criteria">Acceptance Criteria</SelectItem>
                  <SelectItem value="file">Files</SelectItem>
                  <SelectItem value="confluence">Confluence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-filter">Category</Label>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                <SelectTrigger id="category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="non-functional">Non-Functional</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="flow">Flow</SelectItem>
                  <SelectItem value="edge_case">Edge Case</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverage-filter">Coverage</Label>
              <Select value={coverageFilter} onValueChange={(v) => setCoverageFilter(v as any)}>
                <SelectTrigger id="coverage-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="covered">Covered</SelectItem>
                  <SelectItem value="uncovered">Uncovered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="border border-border/50 rounded-lg overflow-auto max-h-[600px] shadow-sm">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 glass-strong z-10 border-b border-border/50">
              <tr>
                <th className="border-r border-border/50 p-3 text-left font-semibold min-w-[300px] sticky left-0 glass-strong z-20">
                  Requirement
                </th>
                {testCases.map((tc) => (
                  <th
                    key={tc.id}
                    className="border-r border-border/50 p-3 text-center font-semibold min-w-[150px] max-w-[150px] last:border-r-0"
                    title={tc.title}
                  >
                    <div className="truncate font-mono text-xs">{tc.id}</div>
                    <div className="text-xs text-muted-foreground truncate mt-1">{tc.title}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRequirements.length === 0 ? (
                <tr>
                  <td colSpan={testCases.length + 1} className="border border-border/50 p-8 text-center text-muted-foreground">
                    No requirements match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRequirements.map((req, index) => {
                  const isCovered = coveredRequirementIds.has(req.id);
                  return (
                    <tr 
                      key={req.id} 
                      className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-card' : 'bg-muted/10'}`}
                    >
                      <td className="border-r border-border/50 p-3 sticky left-0 glass z-10">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {getSourceLabel(req.source)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryLabel(req.category)}
                            </Badge>
                            <Badge
                              variant={req.priority === "high" ? "destructive" : req.priority === "medium" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {req.priority}
                            </Badge>
                            {isCovered ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <p className="text-sm">{req.text}</p>
                          <p className="text-xs text-muted-foreground">ID: {req.id}</p>
                        </div>
                      </td>
                      {testCases.map((tc) => {
                        const isLinked = (tc.requirementIds || []).includes(req.id);
                        return (
                          <td
                            key={`${req.id}-${tc.id}`}
                            className="border-r border-border/50 p-3 text-center cursor-pointer hover:bg-primary/10 transition-all last:border-r-0 group/cell"
                            onClick={() => toggleRequirementLink(req.id, tc.id)}
                            title={isLinked ? "Click to unlink" : "Click to link"}
                          >
                            {isLinked ? (
                              <div className="flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-green-500 group-hover/cell:scale-110 transition-transform" />
                              </div>
                            ) : (
                              <div className="h-6 w-6 border-2 border-dashed border-muted-foreground/30 rounded mx-auto group-hover/cell:border-primary/50 transition-colors" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Linked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-dashed border-muted-foreground/30 rounded" />
            <span>Not Linked</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

