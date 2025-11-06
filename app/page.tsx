"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useTestCaseStore } from "@/store/testcase-store";
import { LoginModal } from "@/components/auth/login-modal";
import { IssueFetcher } from "@/components/issue-fetcher";
import { GenerationControls } from "@/components/testcase/generation-controls";
import { TestCaseList } from "@/components/testcase/testcase-list";
import { Button } from "@/components/ui/button";
import { ParsedIssue, ModelConfig } from "@/lib/schemas";
import { LogOut, Github } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const { isAuthenticated, logout, user } = useAuthStore();
  const { setTestCases, testCases } = useTestCaseStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<ParsedIssue | null>(null);
  const [editedDescription, setEditedDescription] = useState<string>("");
  const [editedAcceptanceCriteria, setEditedAcceptanceCriteria] = useState<string>("");

  const handleIssueFetched = (issue: ParsedIssue) => {
    setCurrentIssue(issue);
    // Initialize edited values with fetched values
    setEditedDescription(issue.description || "");
    setEditedAcceptanceCriteria(issue.acceptanceCriteria || "");
    // Clear previous test cases when a new issue is fetched
    setTestCases([], issue.key);
  };

  const handleContentChange = (description: string, acceptanceCriteria: string) => {
    setEditedDescription(description);
    setEditedAcceptanceCriteria(acceptanceCriteria);
    toast.success("Content updated successfully");
  };

  const handleGenerate = async (config: ModelConfig, append: boolean = false) => {
    if (!currentIssue) {
      toast.error("Please fetch a Jira issue first");
      return;
    }

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issueKey: currentIssue.key,
          storyTitle: currentIssue.summary,
          description: editedDescription || currentIssue.description,
          acceptanceCriteria: editedAcceptanceCriteria || currentIssue.acceptanceCriteria || "",
          modelConfig: config,
          existingTestCases: append ? testCases : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate test cases");
      }

      if (append) {
        const { appendTestCases } = useTestCaseStore.getState();
        appendTestCases(result.testCases);
        toast.success(`Successfully generated ${result.testCases.length} additional test cases!`);
      } else {
        setTestCases(result.testCases, currentIssue.key);
        toast.success(`Successfully generated ${result.testCases.length} test cases!`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate test cases";
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentIssue(null);
    setTestCases([]);
    toast.info("Logged out successfully");
  };

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl font-bold tracking-tight">
                  Jira Test Case Generator
                </h1>
                <p className="text-xl text-muted-foreground">
                  AI-powered test case generation for your Jira user stories
                </p>
              </div>

              <div className="bg-card border rounded-lg p-8 space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Features</h2>
                  <ul className="text-left space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>Fetch user stories directly from Jira</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>Generate comprehensive test cases using AI (Gemini, OpenAI, or Anthropic)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>Edit and customize test cases with inline editing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>Export to CSV or JSON formats</span>
                    </li>
                  </ul>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => setShowLoginModal(true)}
                >
                  Connect to Jira
                </Button>
              </div>

              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Github className="h-4 w-4" />
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>

        <LoginModal
          open={showLoginModal}
          onOpenChange={setShowLoginModal}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Jira Test Case Generator</h1>
              {user && (
                <p className="text-sm text-muted-foreground">
                  Welcome, {user.displayName || user.emailAddress}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Step 1: Fetch Issue */}
        <section>
          <IssueFetcher 
            onIssueFetched={handleIssueFetched}
            onContentChange={handleContentChange}
            savedDescription={editedDescription}
            savedAcceptanceCriteria={editedAcceptanceCriteria}
          />
        </section>

        {/* Step 2: Generate Test Cases */}
        {currentIssue && (
          <section>
            <GenerationControls
              onGenerate={handleGenerate}
              disabled={false}
            />
          </section>
        )}

        {/* Step 3: Display and Edit Test Cases */}
        {testCases.length > 0 && (
          <section>
            <TestCaseList 
              issueKey={currentIssue?.key}
              onGenerateMore={(config) => handleGenerate(config, true)}
            />
          </section>
        )}

        {/* Empty State */}
        {!currentIssue && testCases.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl">🚀</div>
            <h2 className="text-2xl font-semibold">Ready to get started?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Fetch a Jira user story above to begin generating AI-powered test cases.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Built with Next.js, TypeScript, and AI • Powered by{" "}
            {process.env.NEXT_PUBLIC_LLM_PROVIDER || "Gemini"}
          </p>
        </div>
      </footer>
    </div>
  );
}
