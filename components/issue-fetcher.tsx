"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/auth-store";
import { ParsedIssue } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2, Edit2, Save, X } from "lucide-react";

const issueKeySchema = z.object({
  issueKey: z.string().min(1, "Issue key is required").regex(/^[A-Z]+-\d+$/i, "Invalid issue key format (e.g., PROJ-123)"),
});

type IssueKeyForm = z.infer<typeof issueKeySchema>;

interface IssueFetcherProps {
  onIssueFetched: (issue: ParsedIssue) => void;
  onContentChange?: (description: string, acceptanceCriteria: string) => void;
  savedDescription?: string;
  savedAcceptanceCriteria?: string;
}

export function IssueFetcher({ 
  onIssueFetched, 
  onContentChange,
  savedDescription,
  savedAcceptanceCriteria 
}: IssueFetcherProps) {
  const { credentials } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedIssue, setFetchedIssue] = useState<ParsedIssue | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");

  // Sync with saved values when they change externally
  useEffect(() => {
    if (fetchedIssue && (savedDescription !== undefined || savedAcceptanceCriteria !== undefined)) {
      if (savedDescription !== undefined) {
        setDescription(savedDescription);
      }
      if (savedAcceptanceCriteria !== undefined) {
        setAcceptanceCriteria(savedAcceptanceCriteria);
      }
    }
  }, [savedDescription, savedAcceptanceCriteria, fetchedIssue]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IssueKeyForm>({
    resolver: zodResolver(issueKeySchema),
  });

  const onSubmit = async (data: IssueKeyForm) => {
    if (!credentials) {
      setError("Not authenticated. Please log in first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jira/issue/${data.issueKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ auth: credentials }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to fetch issue");
        setFetchedIssue(null);
        return;
      }

      setFetchedIssue(result.issue);
      // Initialize edited values with fetched values or saved values
      const initialDesc = savedDescription !== undefined ? savedDescription : (result.issue.description || "");
      const initialAC = savedAcceptanceCriteria !== undefined ? savedAcceptanceCriteria : (result.issue.acceptanceCriteria || "");
      setDescription(initialDesc);
      setAcceptanceCriteria(initialAC);
      onIssueFetched(result.issue);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch issue");
      setFetchedIssue(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fetch Jira User Story</CardTitle>
        <CardDescription>
          Enter a Jira issue key to fetch the user story details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="issueKey">Issue Key</Label>
              <Input
                id="issueKey"
                placeholder="e.g., PROJ-123"
                {...register("issueKey")}
                disabled={isLoading}
                className="uppercase"
              />
              {errors.issueKey && (
                <p className="text-sm text-red-500">{errors.issueKey.message}</p>
              )}
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  "Fetch Issue"
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {fetchedIssue && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Issue fetched successfully! You can now generate test cases.
              </AlertDescription>
            </Alert>
          )}
        </form>

        {fetchedIssue && (
          <div className="mt-6 space-y-4 border-t pt-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{fetchedIssue.key}</h3>
                {fetchedIssue.issueType && (
                  <Badge variant="secondary">{fetchedIssue.issueType}</Badge>
                )}
                {fetchedIssue.status && (
                  <Badge variant="outline">{fetchedIssue.status}</Badge>
                )}
              </div>
              <p className="text-xl font-medium">{fetchedIssue.summary}</p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Content Details</h3>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Description Section */}
              <div>
                <Label htmlFor="description" className="font-semibold mb-2 block">Description:</Label>
                {isEditing ? (
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter issue description..."
                    className="min-h-32 font-mono text-sm"
                  />
                ) : (
                  <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm min-h-32">
                    {description || <span className="text-muted-foreground italic">No description provided</span>}
                  </div>
                )}
              </div>

              {/* Acceptance Criteria Section */}
              <div>
                <Label htmlFor="acceptanceCriteria" className="font-semibold mb-2 block">Acceptance Criteria:</Label>
                {isEditing ? (
                  <Textarea
                    id="acceptanceCriteria"
                    value={acceptanceCriteria}
                    onChange={(e) => setAcceptanceCriteria(e.target.value)}
                    placeholder="Enter acceptance criteria..."
                    className="min-h-32 font-mono text-sm"
                  />
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md whitespace-pre-wrap text-sm min-h-32">
                    {acceptanceCriteria || <span className="text-muted-foreground italic">No acceptance criteria provided</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Edit Controls */}
            {isEditing && (
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset to saved values or original fetched values
                    const resetDesc = savedDescription !== undefined ? savedDescription : (fetchedIssue?.description || "");
                    const resetAC = savedAcceptanceCriteria !== undefined ? savedAcceptanceCriteria : (fetchedIssue?.acceptanceCriteria || "");
                    setDescription(resetDesc);
                    setAcceptanceCriteria(resetAC);
                    setIsEditing(false);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (onContentChange) {
                      onContentChange(description, acceptanceCriteria);
                    }
                    setIsEditing(false);
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

