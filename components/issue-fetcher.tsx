"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/auth-store";
import { ParsedIssue } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const issueKeySchema = z.object({
  issueKey: z.string().min(1, "Issue key is required").regex(/^[A-Z]+-\d+$/i, "Invalid issue key format (e.g., PROJ-123)"),
});

type IssueKeyForm = z.infer<typeof issueKeySchema>;

interface IssueFetcherProps {
  onIssueFetched: (issue: ParsedIssue) => void;
}

export function IssueFetcher({ onIssueFetched }: IssueFetcherProps) {
  const { credentials } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedIssue, setFetchedIssue] = useState<ParsedIssue | null>(null);

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

            {fetchedIssue.description && (
              <div>
                <h4 className="font-semibold mb-2">Description:</h4>
                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                  {fetchedIssue.description}
                </div>
              </div>
            )}

            {fetchedIssue.acceptanceCriteria && (
              <div>
                <h4 className="font-semibold mb-2">Acceptance Criteria:</h4>
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md whitespace-pre-wrap text-sm">
                  {fetchedIssue.acceptanceCriteria}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

