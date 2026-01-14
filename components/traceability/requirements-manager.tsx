"use client";

import { useState } from "react";
import { useTraceabilityStore } from "@/store/traceability-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit2, Trash2, Plus, Save, X, CheckCircle2, AlertCircle, Search, Filter, FileText } from "lucide-react";
import { Requirement } from "@/lib/schemas";
import { toast } from "sonner";

export function RequirementsManager() {
  const { requirements, addRequirements, updateRequirement, deleteRequirement } = useTraceabilityStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editedRequirement, setEditedRequirement] = useState<Partial<Requirement> | null>(null);
  const [newRequirement, setNewRequirement] = useState<Partial<Requirement>>({
    source: "user_story",
    category: "functional",
    priority: "medium",
    text: "",
    sourceId: "manual",
  });
  const [filterSource, setFilterSource] = useState<Requirement["source"] | "all">("all");
  const [filterCategory, setFilterCategory] = useState<Requirement["category"] | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter requirements
  const filteredRequirements = requirements.filter((req) => {
    if (filterSource !== "all" && req.source !== filterSource) return false;
    if (filterCategory !== "all" && req.category !== filterCategory) return false;
    if (searchTerm && !req.text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getSourceLabel = (source: Requirement["source"]) => {
    switch (source) {
      case "user_story":
        return "User Story";
      case "acceptance_criteria":
        return "Acceptance Criteria";
      case "file":
        return "File";
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

  const handleStartEdit = (req: Requirement) => {
    setEditingId(req.id);
    setEditedRequirement({ ...req });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedRequirement(null);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editedRequirement) return;

    if (!editedRequirement.text || editedRequirement.text.trim().length === 0) {
      toast.error("Requirement text cannot be empty");
      return;
    }

    updateRequirement(editingId, editedRequirement);
    setEditingId(null);
    setEditedRequirement(null);
    toast.success("Requirement updated successfully");
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this requirement?")) {
      deleteRequirement(id);
      toast.success("Requirement deleted");
    }
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewRequirement({
      source: "user_story",
      category: "functional",
      priority: "medium",
      text: "",
      sourceId: "manual",
    });
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewRequirement({
      source: "user_story",
      category: "functional",
      priority: "medium",
      text: "",
      sourceId: "manual",
    });
  };

  const handleSaveAdd = () => {
    if (!newRequirement.text || newRequirement.text.trim().length === 0) {
      toast.error("Requirement text cannot be empty");
      return;
    }

    const requirement: Requirement = {
      id: `REQ-MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: newRequirement.source || "user_story",
      sourceId: newRequirement.sourceId || "manual",
      text: newRequirement.text.trim(),
      category: newRequirement.category || "functional",
      priority: newRequirement.priority || "medium",
    };

    addRequirements([requirement]);
    setIsAdding(false);
    setNewRequirement({
      source: "user_story",
      category: "functional",
      priority: "medium",
      text: "",
      sourceId: "manual",
    });
    toast.success("Requirement added successfully");
  };

  if (requirements.length === 0 && !isAdding) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
          <CardDescription>
            No requirements extracted yet. Requirements will be extracted automatically when you fetch a user story, upload files, or fetch a Confluence page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleStartAdd} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Requirement Manually
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass shadow-layered border-border/50 animate-fade-in">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">Requirements</CardTitle>
              <CardDescription className="mt-1">
                Review and manage extracted requirements. Edit, add, or delete requirements before generating test cases.
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={handleStartAdd} 
            variant="outline" 
            size="sm"
            className="hover-lift shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Requirement
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          {requirements.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b">
              <div className="space-y-2">
                <Label htmlFor="search-req">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-req"
                    placeholder="Search requirements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-source">Filter by Source</Label>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Select component value type */}
                <Select value={filterSource} onValueChange={(v) => setFilterSource(v as any)}>
                  <SelectTrigger id="filter-source">
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
                <Label htmlFor="filter-category">Filter by Category</Label>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Select component value type */}
                <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as any)}>
                  <SelectTrigger id="filter-category">
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
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterSource("all");
                    setFilterCategory("all");
                    setSearchTerm("");
                  }}
                  className="w-full"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {/* Add New Requirement Form */}
          {isAdding && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Add New Requirement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-text">Requirement Text *</Label>
                  <Textarea
                    id="new-text"
                    value={newRequirement.text || ""}
                    onChange={(e) => setNewRequirement({ ...newRequirement, text: e.target.value })}
                    placeholder="Enter requirement description..."
                    className="min-h-24"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-source">Source</Label>
                    <Select
                      value={newRequirement.source || "user_story"}
                      onValueChange={(v) => setNewRequirement({ ...newRequirement, source: v as Requirement["source"] })}
                    >
                      <SelectTrigger id="new-source">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user_story">User Story</SelectItem>
                        <SelectItem value="acceptance_criteria">Acceptance Criteria</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                        <SelectItem value="confluence">Confluence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-category">Category</Label>
                    <Select
                      value={newRequirement.category || "functional"}
                      onValueChange={(v) => setNewRequirement({ ...newRequirement, category: v as Requirement["category"] })}
                    >
                      <SelectTrigger id="new-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="functional">Functional</SelectItem>
                        <SelectItem value="non-functional">Non-Functional</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="flow">Flow</SelectItem>
                        <SelectItem value="edge_case">Edge Case</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-priority">Priority</Label>
                    <Select
                      value={newRequirement.priority || "medium"}
                      onValueChange={(v) => setNewRequirement({ ...newRequirement, priority: v as Requirement["priority"] })}
                    >
                      <SelectTrigger id="new-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleCancelAdd}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAdd}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Requirement
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Requirements List */}
          <div className="space-y-3">
            {filteredRequirements.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No requirements match the current filters. {requirements.length > 0 && "Try adjusting your search or filter criteria."}
                </AlertDescription>
              </Alert>
            ) : (
              filteredRequirements.map((req) => (
              <Card 
                key={req.id} 
                className={`glass hover-lift border-border/50 transition-all ${
                  editingId === req.id ? "border-primary shadow-layered-lg" : ""
                }`}
              >
                <CardContent className="pt-6">
                  {editingId === req.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`edit-text-${req.id}`}>Requirement Text *</Label>
                        <Textarea
                          id={`edit-text-${req.id}`}
                          value={editedRequirement?.text || ""}
                          onChange={(e) => setEditedRequirement({ ...editedRequirement, text: e.target.value })}
                          className="min-h-24"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`edit-source-${req.id}`}>Source</Label>
                          <Select
                            value={editedRequirement?.source || req.source}
                            onValueChange={(v) => setEditedRequirement({ ...editedRequirement, source: v as Requirement["source"] })}
                          >
                            <SelectTrigger id={`edit-source-${req.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user_story">User Story</SelectItem>
                              <SelectItem value="acceptance_criteria">Acceptance Criteria</SelectItem>
                              <SelectItem value="file">File</SelectItem>
                              <SelectItem value="confluence">Confluence</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-category-${req.id}`}>Category</Label>
                          <Select
                            value={editedRequirement?.category || req.category}
                            onValueChange={(v) => setEditedRequirement({ ...editedRequirement, category: v as Requirement["category"] })}
                          >
                            <SelectTrigger id={`edit-category-${req.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="functional">Functional</SelectItem>
                              <SelectItem value="non-functional">Non-Functional</SelectItem>
                              <SelectItem value="api">API</SelectItem>
                              <SelectItem value="flow">Flow</SelectItem>
                              <SelectItem value="edge_case">Edge Case</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-priority-${req.id}`}>Priority</Label>
                          <Select
                            value={editedRequirement?.priority || req.priority}
                            onValueChange={(v) => setEditedRequirement({ ...editedRequirement, priority: v as Requirement["priority"] })}
                          >
                            <SelectTrigger id={`edit-priority-${req.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={handleCancelEdit}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{getSourceLabel(req.source)}</Badge>
                            <Badge variant="secondary">{getCategoryLabel(req.category)}</Badge>
                            <Badge
                              variant={req.priority === "high" ? "destructive" : req.priority === "medium" ? "default" : "secondary"}
                            >
                              {req.priority}
                            </Badge>
                            {req.sourceId !== "manual" && (
                              <span className="text-xs text-muted-foreground">ID: {req.id}</span>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{req.text}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(req)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(req.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              ))
            )}
          </div>

          {/* Summary */}
          {requirements.length > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>{requirements.length}</strong> total requirement{requirements.length !== 1 ? "s" : ""}
                {filteredRequirements.length !== requirements.length && (
                  <span className="ml-2">
                    ({filteredRequirements.length} shown)
                  </span>
                )}
                {" "}ready for test case generation.
                {requirements.filter(r => r.sourceId === "manual").length > 0 && (
                  <span className="ml-2">
                    ({requirements.filter(r => r.sourceId === "manual").length} manually added)
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

