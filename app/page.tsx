"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useTestCaseStore } from "@/store/testcase-store";
import { useTraceabilityStore } from "@/store/traceability-store";
import { LoginModal } from "@/components/auth/login-modal";
import { IssueFetcher } from "@/components/issue-fetcher";
import { StandaloneContentFetcher } from "@/components/standalone-content-fetcher";
import { GenerationControls } from "@/components/testcase/generation-controls";
import { TestCaseList } from "@/components/testcase/testcase-list";
import { CoverageDashboard } from "@/components/traceability/coverage-dashboard";
import { TraceabilityMatrix } from "@/components/traceability/traceability-matrix";
import { RequirementsManager } from "@/components/traceability/requirements-manager";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ParsedIssue, ModelConfig } from "@/lib/schemas";
import { LogOut, CheckCircle2, AlertCircle, Edit2, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
// Requirements are now extracted via API endpoint (/api/requirements/extract)
import { autoLinkTestCasesToRequirements } from "@/lib/coverage-analyzer";

export default function Home() {
  const { isAuthenticated, logout, user } = useAuthStore();
  const { setTestCases, testCases, updateTestCase } = useTestCaseStore();
  const { setRequirements, requirements } = useTraceabilityStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<ParsedIssue | null>(null);
  const [editedDescription, setEditedDescription] = useState<string>("");
  const [editedAcceptanceCriteria, setEditedAcceptanceCriteria] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileContent, setFileContent] = useState<string>("");
  const [confluenceContent, setConfluenceContent] = useState<string>("");
  const [confluenceTitle, setConfluenceTitle] = useState<string>("");
  const [confluenceImages, setConfluenceImages] = useState<Array<{ base64: string; mimeType: string; filename?: string }>>([]);
  const [jiraImages, setJiraImages] = useState<Array<{ base64: string; mimeType: string; filename?: string }>>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ filename: string; content: string }>>([]);
  const [showTraceability, setShowTraceability] = useState(false);
  const [showCoverageAndTraceability, setShowCoverageAndTraceability] = useState(false);
  
  // Standalone mode state
  const [standaloneMode, setStandaloneMode] = useState(false);
  const [standaloneFileContent, setStandaloneFileContent] = useState("");
  const [standaloneConfluenceContent, setStandaloneConfluenceContent] = useState("");
  const [standaloneConfluenceTitle, setStandaloneConfluenceTitle] = useState("");
  const [standaloneUploadedFiles, setStandaloneUploadedFiles] = useState<Array<{ filename: string; content: string }>>([]);

  // Debug: Track Confluence content state changes
  useEffect(() => {
    console.log("[Confluence State] State changed:", {
      confluenceContentLength: confluenceContent?.length || 0,
      confluenceTitle: confluenceTitle || "NO TITLE",
      hasContent: confluenceContent && confluenceContent.trim().length > 0,
    });
  }, [confluenceContent, confluenceTitle]);

  // Check if there's any content available to proceed with test case generation
  const hasContent = currentIssue || 
                     standaloneMode || 
                     confluenceContent.trim().length > 0 || 
                     standaloneConfluenceContent.trim().length > 0 ||
                     uploadedFiles.length > 0 || 
                     standaloneUploadedFiles.length > 0;

  const handleIssueFetched = (issue: ParsedIssue) => {
    setCurrentIssue(issue);
    // Initialize edited values with fetched values
    setEditedDescription(issue.description || "");
    setEditedAcceptanceCriteria(issue.acceptanceCriteria || "");
    // Extract images from Jira issue
    setJiraImages(issue.images || []);
    // Clear file content when a new issue is fetched (but preserve Confluence content)
    setFileContent("");
    setUploadedFiles([]);
    // Preserve Confluence content when a new issue is fetched - user may have fetched it before
    // Don't clear: setConfluenceContent("");
    // Don't clear: setConfluenceTitle("");
    // Don't clear: setConfluenceImages([]);
    // Clear previous test cases when a new issue is fetched
    setTestCases([], issue.key);
    // Reset coverage and traceability view when new issue is fetched
    setShowCoverageAndTraceability(false);
    setShowTraceability(false);
    // Disable standalone mode when Jira issue is fetched
    setStandaloneMode(false);
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
    console.log("[handleConfluenceContentChange] Called with:", {
      contentLength: content?.length || 0,
      title: title || "NO TITLE",
      hasImages: !!images && images.length > 0,
    });
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
    console.log("[handleConfluenceContentChange] State updated - confluenceContent should now be set");
  };

  const handleStandaloneContentChange = useCallback((content: {
    fileContent: string;
    confluenceContent: string;
    confluenceTitle: string;
    uploadedFiles: Array<{ filename: string; content: string }>;
  }) => {
    setStandaloneFileContent(content.fileContent);
    setStandaloneConfluenceContent(content.confluenceContent);
    setStandaloneConfluenceTitle(content.confluenceTitle);
    setStandaloneUploadedFiles(content.uploadedFiles);
    // Only enable standalone mode if there are actual uploaded files
    // Don't enable it just for Confluence content - users should be able to use both components
    if (content.uploadedFiles && content.uploadedFiles.length > 0) {
      setStandaloneMode(true);
    }
  }, []);

  // Handle Coverage & Traceability button click
  const handleShowCoverageAndTraceability = async () => {
    // Check if there's any content available
    if (!hasContent) {
      toast.error("Please fetch a Jira issue, upload content, or fetch a Confluence page first");
      return;
    }

    if (standaloneMode) {
      // Standalone mode: extract from standalone content
      await extractRequirementsForStandalone();
    } else if (currentIssue) {
      // Jira mode: extract from issue content
      // Check both confluenceContent (from IssueFetcher) and standaloneConfluenceContent (from StandaloneContentFetcher)
      const confluenceToPass = (confluenceContent && confluenceContent.trim().length > 0)
        ? { title: confluenceTitle || "Confluence Page", content: confluenceContent }
        : (standaloneConfluenceContent && standaloneConfluenceContent.trim().length > 0)
          ? { title: standaloneConfluenceTitle || "Confluence Page", content: standaloneConfluenceContent }
          : undefined;
      
      await extractRequirementsForIssue(
        currentIssue,
        uploadedFiles,
        confluenceToPass
      );
    } else {
      // No Jira issue but we have Confluence content or files from IssueFetcher
      // Extract requirements from available content
      const confluenceToUse = confluenceContent || standaloneConfluenceContent;
      const confluenceTitleToUse = confluenceTitle || standaloneConfluenceTitle;
      const filesToUse = uploadedFiles.length > 0 ? uploadedFiles : standaloneUploadedFiles;
      
      if (confluenceToUse || filesToUse.length > 0) {
        await extractRequirementsForStandalone(confluenceToUse, confluenceTitleToUse, filesToUse);
      }
    }

    // Show the sections
    setShowCoverageAndTraceability(true);
  };

  // Extract requirements from all sources
  const extractRequirementsForIssue = async (
    issue: ParsedIssue,
    files: Array<{ filename: string; content: string }>,
    confluence?: { title: string; content: string }
  ) => {
    try {
      setIsExtracting(true);
      toast.info("Extracting requirements using AI...");
      
      // Debug: Log state values before processing
      console.log("[Extract Requirements] Initial state check:", {
        confluenceContentState: confluenceContent ? `Length: ${confluenceContent.length}` : "EMPTY",
        confluenceTitleState: confluenceTitle || "EMPTY",
        standaloneConfluenceContentState: standaloneConfluenceContent ? `Length: ${standaloneConfluenceContent.length}` : "EMPTY",
        standaloneConfluenceTitleState: standaloneConfluenceTitle || "EMPTY",
        confluenceParam: confluence ? `Title: ${confluence.title}, Content length: ${confluence.content?.length || 0}` : "UNDEFINED",
      });
      
      // Always prioritize current state for Confluence content if available, fallback to parameter
      // Check both confluenceContent (from IssueFetcher) and standaloneConfluenceContent (from StandaloneContentFetcher)
      const hasConfluenceInState = confluenceContent && confluenceContent.trim().length > 0;
      const hasStandaloneConfluence = standaloneConfluenceContent && standaloneConfluenceContent.trim().length > 0;
      const hasConfluenceInParam = confluence && confluence.content && confluence.content.trim().length > 0;
      
      // Use state if available (prioritize IssueFetcher's confluenceContent, then standalone, then parameter)
      const confluenceToUse = hasConfluenceInState
        ? { 
            title: confluenceTitle || "Confluence Page",  // Use default if title missing
            content: confluenceContent 
          }
        : hasStandaloneConfluence
          ? {
              title: standaloneConfluenceTitle || "Confluence Page",
              content: standaloneConfluenceContent
            }
          : hasConfluenceInParam
            ? confluence
            : undefined;
      
      // Critical debug: Log what we found
      if (!confluenceToUse) {
        console.warn("[Extract Requirements] WARNING: No Confluence content found!", {
          stateHasContent: hasConfluenceInState,
          stateContentLength: confluenceContent?.length || 0,
          standaloneHasContent: hasStandaloneConfluence,
          standaloneContentLength: standaloneConfluenceContent?.length || 0,
          paramHasContent: hasConfluenceInParam,
          paramContentLength: confluence?.content?.length || 0,
        });
      }
      
      const requestBody: {
        description?: string;
        acceptanceCriteria?: string;
        fileContents?: Array<{ filename: string; content: string }>;
        confluenceContent?: { title: string; content: string };
        issueKey: string;
      } = {
        description: editedDescription || issue.description,
        acceptanceCriteria: editedAcceptanceCriteria || issue.acceptanceCriteria,
        fileContents: files,
        issueKey: issue.key,
      };
      
      // Only include confluenceContent if it has actual content
      if (confluenceToUse && confluenceToUse.content && confluenceToUse.content.trim().length > 0) {
        requestBody.confluenceContent = confluenceToUse;
      }
      
      // Enhanced logging to debug
      console.log("[Extract Requirements] State check:", {
        confluenceContentExists: !!confluenceContent,
        confluenceContentLength: confluenceContent?.length || 0,
        confluenceTitleExists: !!confluenceTitle,
        confluenceTitle: confluenceTitle || "N/A",
        hasConfluenceInState,
        confluenceToUse: confluenceToUse ? "YES" : "NO",
      });
      
      console.log("[Extract Requirements] Request payload:", {
        hasDescription: !!requestBody.description,
        hasAcceptanceCriteria: !!requestBody.acceptanceCriteria,
        fileCount: requestBody.fileContents?.length || 0,
        hasConfluence: !!requestBody.confluenceContent,
        confluenceTitle: requestBody.confluenceContent?.title || "N/A",
        confluenceContentLength: requestBody.confluenceContent?.content?.length || 0,
        confluenceContentPreview: requestBody.confluenceContent?.content?.substring(0, 100) || "N/A",
      });
      
      // Log the actual JSON that will be sent
      const requestBodyJson = JSON.stringify(requestBody);
      console.log("[Extract Requirements] Final JSON payload:", requestBodyJson.substring(0, 500) + "...");
      console.log("[Extract Requirements] JSON includes confluenceContent:", requestBodyJson.includes("confluenceContent"));
      
      // Call API to extract requirements using LLM
      const response = await fetch("/api/requirements/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBodyJson,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract requirements");
      }

      const data = await response.json();
      setRequirements(data.requirements, issue.key);
      toast.success(`Extracted ${data.requirements.length} requirements using AI`);
    } catch (error) {
      console.error("Error extracting requirements:", error);
      toast.error(error instanceof Error ? error.message : "Failed to extract requirements");
    } finally {
      setIsExtracting(false);
    }
  };

  // Extract requirements from standalone content (no Jira issue)
  const extractRequirementsForStandalone = async (
    confluenceContentOverride?: string,
    confluenceTitleOverride?: string,
    filesOverride?: Array<{ filename: string; content: string }>
  ) => {
    try {
      setIsExtracting(true);
      toast.info("Extracting requirements using AI...");
      
      // Use provided overrides or fall back to standalone state
      const confluenceToUse = confluenceContentOverride || standaloneConfluenceContent;
      const confluenceTitleToUse = confluenceTitleOverride || standaloneConfluenceTitle;
      const filesToUse = filesOverride || standaloneUploadedFiles;
      
      const requestBody = {
        description: undefined,
        acceptanceCriteria: undefined,
        fileContents: filesToUse,
        confluenceContent: confluenceToUse ? { 
          title: confluenceTitleToUse, 
          content: confluenceToUse 
        } : undefined,
        issueKey: "STANDALONE",
      };
      
      console.log("[Extract Requirements - Standalone] Request payload:", {
        fileCount: requestBody.fileContents?.length || 0,
        hasConfluence: !!requestBody.confluenceContent,
        confluenceTitle: requestBody.confluenceContent?.title || "N/A",
        confluenceContentLength: requestBody.confluenceContent?.content?.length || 0,
      });
      
      // Call API to extract requirements using LLM
      const response = await fetch("/api/requirements/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract requirements");
      }

      const data = await response.json();
      setRequirements(data.requirements, "STANDALONE");
      toast.success(`Extracted ${data.requirements.length} requirements using AI`);
    } catch (error) {
      console.error("Error extracting requirements:", error);
      toast.error(error instanceof Error ? error.message : "Failed to extract requirements");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async (config: ModelConfig, append: boolean = false) => {
    // Check if there's any content available
    if (!hasContent) {
      toast.error("Please fetch a Jira issue, upload content, or fetch a Confluence page first");
      return;
    }

    // Get requirements from store (use the current/edited requirements, don't re-extract)
    const { requirements: currentRequirements } = useTraceabilityStore.getState();
    
    // Only extract requirements if none exist (first time generation)
    // Otherwise, use the existing requirements (which may have been edited by the user)
    if (currentRequirements.length === 0) {
      console.log("[Generate] No requirements found, extracting from content using LLM...");
      if (standaloneMode) {
        await extractRequirementsForStandalone();
      } else if (currentIssue) {
        await extractRequirementsForIssue(
          currentIssue,
          uploadedFiles,
          confluenceContent ? { title: confluenceTitle, content: confluenceContent } : undefined
        );
      } else {
        // No Jira issue but we have Confluence content or files
        const confluenceToUse = confluenceContent || standaloneConfluenceContent;
        const confluenceTitleToUse = confluenceTitle || standaloneConfluenceTitle;
        const filesToUse = uploadedFiles.length > 0 ? uploadedFiles : standaloneUploadedFiles;
        
        if (confluenceToUse || filesToUse.length > 0) {
          await extractRequirementsForStandalone(confluenceToUse, confluenceTitleToUse, filesToUse);
        }
      }
      // Get fresh requirements after extraction
      const { requirements: freshRequirements } = useTraceabilityStore.getState();
      console.log("[Generate] Extracted requirements using LLM:", freshRequirements.length);
    } else {
      console.log("[Generate] Using existing requirements from store (may include user edits):", currentRequirements.length);
    }

    // Get the appropriate content based on mode
    // If no Jira issue, use standalone content or content from IssueFetcher (Confluence/files)
    let additionalContext: string;
    let issueKey: string;
    let storyTitle: string;
    let description: string;
    let acceptanceCriteria: string;
    
    if (standaloneMode) {
      additionalContext = standaloneFileContent;
      issueKey = "STANDALONE";
      storyTitle = "Test Cases from Uploaded Content";
      description = "";
      acceptanceCriteria = "";
    } else if (currentIssue) {
      additionalContext = fileContent || "";
      issueKey = currentIssue.key;
      storyTitle = currentIssue.summary || "";
      description = editedDescription;
      acceptanceCriteria = editedAcceptanceCriteria;
    } else {
      // No Jira issue but we have Confluence content or files from IssueFetcher
      // Combine Confluence content and files
      const confluenceToUse = confluenceContent || standaloneConfluenceContent;
      const filesToUse = uploadedFiles.length > 0 ? uploadedFiles : standaloneUploadedFiles;
      const fileContentStr = filesToUse.map(f => `--- File: ${f.filename} ---\n${f.content}\n`).join("\n\n");
      additionalContext = [fileContentStr, confluenceToUse].filter(Boolean).join("\n\n--- Confluence Page ---\n\n");
      issueKey = "STANDALONE";
      storyTitle = confluenceTitle || standaloneConfluenceTitle || "Test Cases from Content";
      description = "";
      acceptanceCriteria = "";
    }
    
    console.log("[Generate] Mode:", standaloneMode ? "Standalone" : "Jira");
    console.log("[Generate] Additional context length:", additionalContext.length);
    console.log("[Generate] Additional context preview:", additionalContext.substring(0, 500));
    
    // Check if Confluence content is included
    const hasConfluenceContent = additionalContext.includes("--- Confluence Page ---");
    console.log("[Generate] Contains Confluence content:", hasConfluenceContent);
    
    if (!additionalContext && !description) {
      console.warn("[Generate] WARNING: No content provided for generation!");
      toast.error("Please provide content (Jira issue, files, or Confluence page) to generate test cases");
      return;
    }

    // Get final requirements from store (either newly extracted or existing edited ones)
    const { requirements: finalRequirements } = useTraceabilityStore.getState();
    console.log("[Generate] Requirements to send to LLM:", finalRequirements.length);
    console.log("[Generate] Requirements:", finalRequirements.map(r => ({ id: r.id, text: r.text.substring(0, 50) })));

    try {
      // Combine Jira and Confluence images
      // Include images from all sources (Jira, Confluence from IssueFetcher, or Confluence from StandaloneContentFetcher)
      const allImages = [...jiraImages, ...confluenceImages].length > 0 
        ? [...jiraImages, ...confluenceImages] 
        : undefined;
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issueKey,
          storyTitle,
          description,
          acceptanceCriteria,
          additionalContext,
          images: allImages,
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
        setTestCases(linkedTestCases, issueKey);
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
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 dark:bg-dot-pattern relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-animated opacity-5 dark:opacity-10 -z-10" />
          
          {/* Landing Page Header */}
          <header className="absolute top-0 right-0 p-4 z-50">
            <ThemeToggle />
          </header>
          
          <div className="container mx-auto px-4 py-16 relative z-10">
            {/* Hero Section */}
            <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 mb-4">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">AI-Powered Test Generation</span>
                </div>
                <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
                  <span className="text-gradient-purple">Jira Genius</span>
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                  Transform your Jira user stories into comprehensive test cases with AI-powered automation
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-8 text-lg h-12 shadow-glow hover:shadow-glow-accent transition-all"
                  onClick={() => setShowLoginModal(true)}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Connect to Jira
                </Button>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="max-w-6xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: CheckCircle2,
                  title: "Jira Integration",
                  description: "Fetch user stories directly from Jira with seamless authentication",
                  color: "from-blue-500 to-cyan-500"
                },
                {
                  icon: Sparkles,
                  title: "AI-Powered",
                  description: "Generate comprehensive test cases using Gemini, OpenAI, or Anthropic",
                  color: "from-purple-500 to-pink-500"
                },
                {
                  icon: Edit2,
                  title: "Easy Editing",
                  description: "Edit and customize test cases with intuitive inline editing",
                  color: "from-green-500 to-emerald-500"
                },
                {
                  icon: FileText,
                  title: "Export Options",
                  description: "Export to CSV or JSON formats for easy integration",
                  color: "from-orange-500 to-red-500"
                }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={index}
                    className="glass hover-lift border-border/50 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardContent className="p-6 space-y-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 dark:bg-dot-pattern">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-animated opacity-5 dark:opacity-10 -z-10 pointer-events-none" />
      
      {/* Header */}
      <header className="border-b glass-strong sticky top-0 z-50 shadow-layered">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-gradient">Jira Genius</h1>
              </div>
              {user && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-border/50">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-slow" />
                  <p className="text-sm text-muted-foreground">
                    {user.displayName || user.emailAddress}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" onClick={handleLogout} className="hover-lift">
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Step 1: Choose Starting Point or Show Active Section */}
        <section className="space-y-6">
          {/* Show heading only when both options are visible */}
          {!currentIssue && !standaloneMode && (
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Choose Your Starting Point</h2>
              <p className="text-muted-foreground">
                Fetch a Jira issue or upload content directly to generate test cases
              </p>
            </div>
          )}

          <div className={`grid ${!currentIssue && !standaloneMode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
            {/* Option 1: Fetch Jira Issue - Always render but hide when in standalone mode only */}
            {!standaloneMode && (
              <div className="space-y-4">
                <IssueFetcher 
                  onIssueFetched={handleIssueFetched}
                  onContentChange={handleContentChange}
                  onFileContentChange={handleFileContentChange}
                  onConfluenceContentChange={handleConfluenceContentChange}
                  savedDescription={editedDescription}
                  savedAcceptanceCriteria={editedAcceptanceCriteria}
                  savedConfluenceContent={confluenceContent || standaloneConfluenceContent}
                  savedConfluenceTitle={confluenceTitle || standaloneConfluenceTitle}
                />
              </div>
            )}

            {/* Option 2: Upload Content Directly - Show when no issue is fetched */}
            {!currentIssue && (
              <div className="space-y-4">
                <StandaloneContentFetcher 
                  onContentChange={handleStandaloneContentChange}
                />
              </div>
            )}
          </div>
        </section>

        {/* Step 1.5: Coverage & Traceability Button */}
        {hasContent && !showCoverageAndTraceability && (
          <section>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Ready to Analyze Coverage?</h3>
                    <p className="text-sm text-muted-foreground">
                      {standaloneMode 
                        ? "After finalizing your files and Confluence page content, click below to extract requirements and view coverage analysis."
                        : "After finalizing your user story, additional files, and Confluence page content, click below to extract requirements and view coverage analysis."
                      }
                    </p>
                  </div>
                  <Button
                    onClick={handleShowCoverageAndTraceability}
                    size="lg"
                    className="w-full md:w-auto"
                    disabled={isExtracting}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {isExtracting ? "Extracting Requirements..." : "Coverage & Traceability"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Step 1.6: Review and Manage Requirements */}
        {hasContent && showCoverageAndTraceability && (
          <section>
            <RequirementsManager />
          </section>
        )}

        {/* Step 2: Generate Test Cases */}
        {hasContent && (
          <section>
            {/* Image Count Indicator */}
            {!standaloneMode && (jiraImages.length > 0 || confluenceImages.length > 0) && (
              <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <strong>{jiraImages.length + confluenceImages.length} image(s)</strong> will be analyzed by Claude Sonnet for visual test case generation
                  {jiraImages.length > 0 && ` (${jiraImages.length} from Jira)`}
                  {confluenceImages.length > 0 && ` (${confluenceImages.length} from Confluence)`}
                </AlertDescription>
              </Alert>
            )}
            
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
              issueKey={standaloneMode ? "STANDALONE" : currentIssue?.key}
              onGenerateMore={(config) => handleGenerate(config, true)}
            />
          </section>
        )}

        {/* Step 4: Coverage Dashboard and Traceability */}
        {hasContent && showCoverageAndTraceability && (
          <section>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Coverage & Traceability</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      // Re-extract requirements using LLM
                      if (standaloneMode) {
                        await extractRequirementsForStandalone();
                      } else if (currentIssue) {
                        await extractRequirementsForIssue(
                          currentIssue,
                          uploadedFiles,
                          confluenceContent ? { title: confluenceTitle, content: confluenceContent } : undefined
                        );
                      } else {
                        // No Jira issue but we have Confluence content or files
                        const confluenceToUse = confluenceContent || standaloneConfluenceContent;
                        const confluenceTitleToUse = confluenceTitle || standaloneConfluenceTitle;
                        const filesToUse = uploadedFiles.length > 0 ? uploadedFiles : standaloneUploadedFiles;
                        
                        if (confluenceToUse || filesToUse.length > 0) {
                          await extractRequirementsForStandalone(confluenceToUse, confluenceTitleToUse, filesToUse);
                        }
                      }
                    }}
                    disabled={isExtracting}
                  >
                    {isExtracting ? "Extracting..." : "Refresh Requirements"}
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
                    {standaloneMode 
                      ? "No requirements found. Please check your uploaded files or Confluence page content."
                      : "No requirements found. Please check your user story, files, or Confluence page content."
                    }
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!currentIssue && !standaloneMode && testCases.length === 0 && (
          <div className="text-center py-20 space-y-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Ready to get started?</h2>
              <p className="text-muted-foreground max-w-md mx-auto text-lg">
                Fetch a Jira user story or upload content directly to begin generating AI-powered test cases.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t glass mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Built with Next.js, TypeScript, and AI • Powered by{" "}
            <span className="text-primary font-medium">{process.env.NEXT_PUBLIC_LLM_PROVIDER || "Claude"}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
