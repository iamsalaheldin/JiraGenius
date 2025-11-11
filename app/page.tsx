"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useTestCaseStore } from "@/store/testcase-store";
import { useTraceabilityStore } from "@/store/traceability-store";
import { LoginModal } from "@/components/auth/login-modal";
import { IssueFetcher } from "@/components/issue-fetcher";
import { GenerationControls } from "@/components/testcase/generation-controls";
import { TestCaseList } from "@/components/testcase/testcase-list";
import { CoverageDashboard } from "@/components/traceability/coverage-dashboard";
import { TraceabilityMatrix } from "@/components/traceability/traceability-matrix";
import { RequirementsManager } from "@/components/traceability/requirements-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ParsedIssue, ModelConfig } from "@/lib/schemas";
import { LogOut, Github, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { extractAllRequirements } from "@/lib/requirement-extractor";
import { autoLinkTestCasesToRequirements } from "@/lib/coverage-analyzer";

export default function Home() {
  const { isAuthenticated, logout, user } = useAuthStore();
  const { setTestCases, testCases, updateTestCase } = useTestCaseStore();
  const { setRequirements, requirements } = useTraceabilityStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<ParsedIssue | null>(null);
  const [editedDescription, setEditedDescription] = useState<string>("");
  const [editedAcceptanceCriteria, setEditedAcceptanceCriteria] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [confluenceContent, setConfluenceContent] = useState<string>("");
  const [confluenceTitle, setConfluenceTitle] = useState<string>("");
  const [confluenceImages, setConfluenceImages] = useState<Array<{ base64: string; mimeType: string; filename?: string }>>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ filename: string; content: string }>>([]);
  const [showTraceability, setShowTraceability] = useState(false);
  const [showCoverageAndTraceability, setShowCoverageAndTraceability] = useState(false);

  const handleIssueFetched = (issue: ParsedIssue) => {
    setCurrentIssue(issue);
    // Initialize edited values with fetched values
    setEditedDescription(issue.description || "");
    setEditedAcceptanceCriteria(issue.acceptanceCriteria || "");
    // Clear file content when a new issue is fetched
    setFileContent("");
    setUploadedFiles([]);
    // Clear Confluence content when a new issue is fetched
    setConfluenceContent("");
    setConfluenceTitle("");
    setConfluenceImages([]);
    // Clear previous test cases when a new issue is fetched
    setTestCases([], issue.key);
    // Reset coverage and traceability view when new issue is fetched
    setShowCoverageAndTraceability(false);
    setShowTraceability(false);
    // Don't extract requirements automatically - wait for user to click the button
  };

  const handleContentChange = (description: string, acceptanceCriteria: string) => {
    setEditedDescription(description);
    setEditedAcceptanceCriteria(acceptanceCriteria);
    // Reset coverage view when content changes - user needs to re-extract
    setShowCoverageAndTraceability(false);
    toast.success("Content updated successfully");
  };

  const handleFileContentChange = (content: string, files?: Array<{ filename: string; content: string }>) => {
    // Content already includes Confluence content if present (combined in IssueFetcher)
    console.log("[FileContentChange] Received content length:", content.length);
    console.log("[FileContentChange] Content preview:", content.substring(0, 200));
    setFileContent(content);
    if (files) {
      setUploadedFiles(files);
      // Reset coverage view when files change - user needs to re-extract
      setShowCoverageAndTraceability(false);
    }
  };

  const handleConfluenceContentChange = (content: string, title?: string, images?: Array<{ base64: string; mimeType: string; filename?: string }>) => {
    setConfluenceContent(content);
    if (title) {
      setConfluenceTitle(title);
    }
    if (images) {
      setConfluenceImages(images);
    }
    // Combine with file content
    const fileOnlyContent = fileContent.split("\n\n--- Confluence Page ---\n\n")[0] || fileContent;
    const combinedContent = [fileOnlyContent, content].filter(Boolean).join("\n\n--- Confluence Page ---\n\n");
    setFileContent(combinedContent);
    // Reset coverage view when Confluence content changes - user needs to re-extract
    setShowCoverageAndTraceability(false);
  };

  // Handle Coverage & Traceability button click
  const handleShowCoverageAndTraceability = () => {
    if (!currentIssue) {
      toast.error("Please fetch a Jira issue first");
      return;
    }

    // Extract requirements from all current content
    extractRequirementsForIssue(
      currentIssue,
      uploadedFiles,
      confluenceContent ? { title: confluenceTitle, content: confluenceContent } : undefined
    );

    // Show the sections
    setShowCoverageAndTraceability(true);
    toast.success("Requirements extracted. Review and manage them below.");
  };

  // Extract requirements from all sources
  const extractRequirementsForIssue = (
    issue: ParsedIssue,
    files: Array<{ filename: string; content: string }>,
    confluence?: { title: string; content: string }
  ) => {
    const extractedRequirements = extractAllRequirements({
      description: editedDescription || issue.description,
      acceptanceCriteria: editedAcceptanceCriteria || issue.acceptanceCriteria,
      fileContents: files,
      confluenceContent: confluence,
      issueKey: issue.key,
    });
    setRequirements(extractedRequirements, issue.key);
  };

  const handleGenerate = async (config: ModelConfig, append: boolean = false) => {
    if (!currentIssue) {
      toast.error("Please fetch a Jira issue first");
      return;
    }

    // Get requirements from store (use the current/edited requirements, don't re-extract)
    const { requirements: currentRequirements } = useTraceabilityStore.getState();
    
    // Only extract requirements if none exist (first time generation)
    // Otherwise, use the existing requirements (which may have been edited by the user)
    if (currentRequirements.length === 0) {
      console.log("[Generate] No requirements found, extracting from content...");
      extractRequirementsForIssue(
        currentIssue,
        uploadedFiles,
        confluenceContent ? { title: confluenceTitle, content: confluenceContent } : undefined
      );
      // Get fresh requirements after extraction
      const { requirements: freshRequirements } = useTraceabilityStore.getState();
      console.log("[Generate] Extracted requirements:", freshRequirements.length);
    } else {
      console.log("[Generate] Using existing requirements from store (may include user edits):", currentRequirements.length);
    }

    // Get the latest file content from state (includes both file content and Confluence content)
    const additionalContext = fileContent || "";
    console.log("[Generate] Current fileContent state length:", fileContent.length);
    console.log("[Generate] Additional context length:", additionalContext.length);
    console.log("[Generate] Additional context preview:", additionalContext.substring(0, 500));
    
    // Check if Confluence content is included
    const hasConfluenceContent = additionalContext.includes("--- Confluence Page ---");
    console.log("[Generate] Contains Confluence content:", hasConfluenceContent);
    
    if (!additionalContext) {
      console.warn("[Generate] WARNING: additionalContext is empty! File content may not have been set.");
    } else if (hasConfluenceContent) {
      const confluencePart = additionalContext.split("--- Confluence Page ---")[1] || "";
      console.log("[Generate] Confluence content length in additionalContext:", confluencePart.length);
    }

    // Get final requirements from store (either newly extracted or existing edited ones)
    const { requirements: finalRequirements } = useTraceabilityStore.getState();
    console.log("[Generate] Requirements to send to LLM:", finalRequirements.length);
    console.log("[Generate] Requirements:", finalRequirements.map(r => ({ id: r.id, text: r.text.substring(0, 50) })));

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issueKey: currentIssue.key,
          storyTitle: currentIssue.summary,
          description: editedDescription,
          acceptanceCriteria: editedAcceptanceCriteria,
          additionalContext: additionalContext,
          images: confluenceImages.length > 0 ? confluenceImages : undefined,
          modelConfig: config,
          existingTestCases: append ? testCases : undefined,
          requirements: finalRequirements.length > 0 ? finalRequirements : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate test cases");
      }

      // Auto-link requirements to test cases (use fresh requirements from store)
      const { requirements: freshRequirements } = useTraceabilityStore.getState();
      const linkedTestCases = autoLinkTestCasesToRequirements(result.testCases, freshRequirements);
      
      // Count how many requirements were linked
      const totalLinkedRequirements = linkedTestCases.reduce((sum, tc) => sum + (tc.requirementIds?.length || 0), 0);
      
      if (append) {
        const { appendTestCases } = useTestCaseStore.getState();
        appendTestCases(linkedTestCases);
        toast.success(
          `Successfully generated ${linkedTestCases.length} additional test cases! ${totalLinkedRequirements > 0 ? `Auto-linked to ${totalLinkedRequirements} requirement(s).` : ''}`
        );
      } else {
        setTestCases(linkedTestCases, currentIssue.key);
        toast.success(
          `Successfully generated ${linkedTestCases.length} test cases! ${totalLinkedRequirements > 0 ? `Auto-linked to ${totalLinkedRequirements} requirement(s).` : ''}`
        );
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
            onFileContentChange={handleFileContentChange}
            onConfluenceContentChange={handleConfluenceContentChange}
            savedDescription={editedDescription}
            savedAcceptanceCriteria={editedAcceptanceCriteria}
          />
        </section>

        {/* Step 1.5: Coverage & Traceability Button */}
        {currentIssue && !showCoverageAndTraceability && (
          <section>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Ready to Analyze Coverage?</h3>
                    <p className="text-sm text-muted-foreground">
                      After finalizing your user story, additional files, and Confluence page content, click below to extract requirements and view coverage analysis.
                    </p>
                  </div>
                  <Button
                    onClick={handleShowCoverageAndTraceability}
                    size="lg"
                    className="w-full md:w-auto"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Coverage & Traceability
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Step 1.6: Review and Manage Requirements */}
        {currentIssue && showCoverageAndTraceability && (
          <section>
            <RequirementsManager />
          </section>
        )}

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

        {/* Step 4: Coverage Dashboard and Traceability */}
        {currentIssue && showCoverageAndTraceability && (
          <section>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Coverage & Traceability</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Re-extract requirements
                      extractRequirementsForIssue(
                        currentIssue,
                        uploadedFiles,
                        confluenceContent ? { title: confluenceTitle, content: confluenceContent } : undefined
                      );
                      toast.success("Requirements refreshed");
                    }}
                  >
                    Refresh Requirements
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowTraceability(!showTraceability)}
                  >
                    {showTraceability ? "Hide" : "Show"} Traceability Matrix
                  </Button>
                </div>
              </div>
              {requirements.length > 0 ? (
                <>
                  <CoverageDashboard />
                  {showTraceability && <TraceabilityMatrix />}
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No requirements found. Please check your user story, files, or Confluence page content.
                  </AlertDescription>
                </Alert>
              )}
            </div>
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
