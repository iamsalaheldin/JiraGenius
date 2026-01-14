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
import { Loader2, AlertCircle, CheckCircle2, Edit2, Save, X, Upload, FileText, Trash2, Search, Link2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const issueKeySchema = z.object({
  issueKey: z.string().min(1, "Issue key is required").regex(/^[A-Z]+-\d+$/i, "Invalid issue key format (e.g., PROJ-123)"),
});

type IssueKeyForm = z.infer<typeof issueKeySchema>;

interface IssueFetcherProps {
  onIssueFetched: (issue: ParsedIssue) => void;
  onContentChange?: (description: string, acceptanceCriteria: string) => void;
  onFileContentChange?: (content: string, files?: Array<{ filename: string; content: string }>) => void;
  onConfluenceContentChange?: (content: string, title?: string, images?: Array<{ base64: string; mimeType: string; filename?: string }>) => void;
  savedDescription?: string;
  savedAcceptanceCriteria?: string;
  savedConfluenceContent?: string;
  savedConfluenceTitle?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "success" | "error";
  error?: string;
  content?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [".pdf", ".docx", ".txt"];

export function IssueFetcher({ 
  onIssueFetched, 
  onContentChange,
  onFileContentChange,
  onConfluenceContentChange,
  savedDescription,
  savedAcceptanceCriteria,
  savedConfluenceContent,
  savedConfluenceTitle
}: IssueFetcherProps) {
  const { credentials } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedIssue, setFetchedIssue] = useState<ParsedIssue | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [confluenceUrl, setConfluenceUrl] = useState("");
  const [confluenceContent, setConfluenceContent] = useState("");
  const [confluenceTitle, setConfluenceTitle] = useState("");
  const [isFetchingConfluence, setIsFetchingConfluence] = useState(false);
  const [isEditingConfluence, setIsEditingConfluence] = useState(false);
  const [confluenceError, setConfluenceError] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editedFileContent, setEditedFileContent] = useState<string>("");
  const [expandedFiles, setExpandedFiles] = useState<boolean>(true);
  const [expandedConfluence, setExpandedConfluence] = useState<boolean>(true);

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

  // Restore Confluence content from parent when a new issue is fetched
  useEffect(() => {
    if (fetchedIssue && savedConfluenceContent !== undefined && savedConfluenceContent.trim().length > 0) {
      // Only restore if local state is empty (to avoid overwriting user edits or existing content)
      if (!confluenceContent || confluenceContent.trim().length === 0) {
        setConfluenceContent(savedConfluenceContent);
        if (savedConfluenceTitle) {
          setConfluenceTitle(savedConfluenceTitle);
        }
        // Also restore the URL if we can extract it from the title or if it's available
        // (Note: We don't have the URL in saved state, so we'll leave it empty)
      }
    }
  }, [fetchedIssue, savedConfluenceContent, savedConfluenceTitle, confluenceContent]);

  // Automatically update combined content whenever uploadedFiles or confluenceContent changes
  useEffect(() => {
    if (!onFileContentChange) return;

    const allFileContent = uploadedFiles
      .filter((f) => f.status === "success" && f.content)
      .map((f) => `--- File: ${f.name} ---\n${f.content}\n`)
      .join("\n\n");
    
    const combinedContent = [allFileContent, confluenceContent].filter(Boolean).join("\n\n--- Confluence Page ---\n\n");
    
    const fileData = uploadedFiles
      .filter((f) => f.status === "success" && f.content)
      .map((f) => ({ filename: f.name, content: f.content || "" }));
    onFileContentChange(combinedContent, fileData);
  }, [uploadedFiles, confluenceContent, onFileContentChange]);

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
      // Clear uploaded files when fetching new issue
      setUploadedFiles([]);
      // Restore Confluence content from parent if it exists (user may have fetched it before)
      if (savedConfluenceContent && savedConfluenceContent.trim().length > 0) {
        setConfluenceContent(savedConfluenceContent);
        if (savedConfluenceTitle) {
          setConfluenceTitle(savedConfluenceTitle);
        }
      }
      // Don't call onFileContentChange("") here - let the useEffect handle it
      // The useEffect will automatically update the combined content with just Confluence content
      // (since files are now empty but Confluence content is preserved)
      onIssueFetched(result.issue);
      setError(null);
      
      // Show success message with image count if applicable
      if (result.issue.images && result.issue.images.length > 0) {
        toast.success(`Fetched issue with ${result.issue.images.length} image(s)`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch issue");
      setFetchedIssue(null);
    } finally {
      setIsLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const fileName = file.name.toLowerCase();
    const isValidType = ALLOWED_FILE_TYPES.some((ext) => fileName.endsWith(ext));
    
    if (!isValidType) {
      return `Invalid file type. Only ${ALLOWED_FILE_TYPES.join(", ")} files are allowed.`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10MB limit.`;
    }
    
    return null;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];
    const filesToUpload: File[] = [];

    // Validate all files first
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationError = validateFile(file);
      
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`);
        continue;
      }

      const fileId = `${Date.now()}-${i}-${file.name}`;
      newFiles.push({
        id: fileId,
        name: file.name,
        size: file.size,
        status: "uploading",
      });
      filesToUpload.push(file);
    }

    if (newFiles.length === 0) return;

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Upload files
    try {
      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/files/extract", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Update all files with error
        setUploadedFiles((prev) =>
          prev.map((f) =>
            newFiles.some((nf) => nf.id === f.id)
              ? { ...f, status: "error" as const, error: result.error || "Failed to extract text" }
              : f
          )
        );
        toast.error(result.error || "Failed to extract text from files");
        return;
      }

      // Update files with success status and content
      let updatedFiles: UploadedFile[] = [];
      setUploadedFiles((prev) => {
        updatedFiles = prev.map((f) => {
          const extractedFile = result.files?.find(
            (ef: { filename: string }) => ef.filename === f.name
          );
          if (extractedFile) {
            return {
              ...f,
              status: "success" as const,
              content: extractedFile.content,
            };
          }
          return f;
        });
        return updatedFiles;
      });

      const allFileContent = updatedFiles
        .filter((f) => f.status === "success" && f.content)
        .map((f) => `--- File: ${f.name} ---\n${f.content}\n`)
        .join("\n\n");
      
      const combinedContent = [allFileContent, confluenceContent].filter(Boolean).join("\n\n--- Confluence Page ---\n\n");
      
      if (onFileContentChange) {
        const fileData = updatedFiles
          .filter((f) => f.status === "success" && f.content)
          .map((f) => ({ filename: f.name, content: f.content || "" }));
        onFileContentChange(combinedContent, fileData);
      }

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err: string) => toast.warning(err));
      } else {
        toast.success(`Successfully extracted text from ${result.files?.length || 0} file(s)`);
      }
    } catch (err) {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          newFiles.some((nf) => nf.id === f.id)
            ? {
                ...f,
                status: "error" as const,
                error: err instanceof Error ? err.message : "Upload failed",
              }
            : f
        )
      );
      toast.error("Failed to upload files");
    }
  };

  const handleRemoveFile = (fileId: string) => {
    let remainingFiles: UploadedFile[] = [];
    setUploadedFiles((prev) => {
      remainingFiles = prev.filter((f) => f.id !== fileId);
      return remainingFiles;
    });

    // Update combined content - do this outside state updater to avoid React warning
    const fileContent = remainingFiles
      .filter((f) => f.status === "success" && f.content)
      .map((f) => `--- File: ${f.name} ---\n${f.content}\n`)
      .join("\n\n");
    // Combine with Confluence content
    const combinedContent = [fileContent, confluenceContent].filter(Boolean).join("\n\n--- Confluence Page ---\n\n");
    if (onFileContentChange) {
      const fileData = remainingFiles
        .filter((f) => f.status === "success" && f.content)
        .map((f) => ({ filename: f.name, content: f.content || "" }));
      onFileContentChange(combinedContent, fileData);
    }
    
    // Clear editing state if the file being removed is being edited
    if (editingFileId === fileId) {
      setEditingFileId(null);
      setEditedFileContent("");
    }
  };

  const handleStartEditFile = (fileId: string, content: string) => {
    setEditingFileId(fileId);
    setEditedFileContent(content);
  };

  const handleCancelEditFile = () => {
    setEditingFileId(null);
    setEditedFileContent("");
  };

  const handleSaveFileContent = (fileId: string) => {
    setUploadedFiles((prev) => {
      return prev.map((f) => {
        if (f.id === fileId) {
          return {
            ...f,
            content: editedFileContent,
          };
        }
        return f;
      });
    });
    setEditingFileId(null);
    setEditedFileContent("");
    toast.success("File content updated");
  };

  const handleFetchConfluence = async () => {
    if (!credentials) {
      setConfluenceError("Not authenticated. Please log in first.");
      return;
    }

    if (!confluenceUrl.trim()) {
      setConfluenceError("Please enter a Confluence page URL");
      return;
    }

    setIsFetchingConfluence(true);
    setConfluenceError(null);

    try {
      const response = await fetch("/api/confluence/page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: confluenceUrl.trim(),
          auth: credentials,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error || `Failed to fetch Confluence page (HTTP ${response.status})`;
        console.error("[Confluence] Fetch error:", errorMsg, result);
        setConfluenceError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      
      if (!result.page) {
        const errorMsg = "No page data received from server";
        console.error("[Confluence] No page data:", result);
        setConfluenceError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      if (!result.page.content || result.page.content.trim().length === 0) {
        const errorMsg = "Page content is empty";
        setConfluenceError(errorMsg);
        toast.warning(errorMsg);
        return;
      }
      
      setConfluenceTitle(result.page.title);
      setConfluenceContent(result.page.content);
      setIsEditingConfluence(false);
      setConfluenceError(null);
      
      const fileContent = uploadedFiles
        .filter((f) => f.status === "success" && f.content)
        .map((f) => `--- File: ${f.name} ---\n${f.content}\n`)
        .join("\n\n");
      const combinedContent = [fileContent, result.page.content].filter(Boolean).join("\n\n--- Confluence Page ---\n\n");
      
      if (onFileContentChange) {
        const fileData = uploadedFiles
          .filter((f) => f.status === "success" && f.content)
          .map((f) => ({ filename: f.name, content: f.content || "" }));
        onFileContentChange(combinedContent, fileData);
      }
      if (onConfluenceContentChange) {
        // Pass title, content, and images
        onConfluenceContentChange(result.page.content, result.page.title, result.page.images);
      }
      
      // Show success message with image count if applicable
      const imageCount = result.page.images?.length || 0;
      toast.success(`Successfully fetched Confluence page: ${result.page.title}${imageCount > 0 ? ` (${imageCount} image(s))` : ''}`);
    } catch (err) {
      setConfluenceError(err instanceof Error ? err.message : "Failed to fetch Confluence page");
      toast.error("Failed to fetch Confluence page");
    } finally {
      setIsFetchingConfluence(false);
    }
  };

  const handleConfluenceContentSave = () => {
    // Combine with file content
    const fileContent = uploadedFiles
      .filter((f) => f.status === "success" && f.content)
      .map((f) => `--- File: ${f.name} ---\n${f.content}\n`)
      .join("\n\n");
    const combinedContent = [fileContent, confluenceContent].filter(Boolean).join("\n\n--- Confluence Page ---\n\n");
    
    if (onFileContentChange) {
      const fileData = uploadedFiles
        .filter((f) => f.status === "success" && f.content)
        .map((f) => ({ filename: f.name, content: f.content || "" }));
      onFileContentChange(combinedContent, fileData);
    }
    if (onConfluenceContentChange) {
      // Note: When editing, we don't have access to the original images
      // So we pass undefined to keep existing images
      onConfluenceContentChange(confluenceContent, confluenceTitle, undefined);
    }
    setIsEditingConfluence(false);
    toast.success("Confluence content updated");
  };

  const handleRemoveConfluence = () => {
    setConfluenceUrl("");
    setConfluenceContent("");
    setConfluenceTitle("");
    setConfluenceError(null);
    
    // Update combined content (only file content now)
    const fileContent = uploadedFiles
      .filter((f) => f.status === "success" && f.content)
      .map((f) => `--- File: ${f.name} ---\n${f.content}\n`)
      .join("\n\n");
    
    if (onFileContentChange) {
      const fileData = uploadedFiles
        .filter((f) => f.status === "success" && f.content)
        .map((f) => ({ filename: f.name, content: f.content || "" }));
      onFileContentChange(fileContent, fileData);
    }
    if (onConfluenceContentChange) {
      onConfluenceContentChange("", undefined, []);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <Card className="glass hover-lift shadow-layered border-border/50 animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
            <Search className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Fetch Jira User Story</CardTitle>
            <CardDescription className="mt-1">
              Enter a Jira issue key to fetch the user story details
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="issueKey" className="text-sm font-medium">Issue Key</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="issueKey"
                  placeholder="e.g., PROJ-123"
                  {...register("issueKey")}
                  disabled={isLoading}
                  className="uppercase pl-10 transition-all focus:ring-2 focus:ring-primary/50 focus:shadow-glow"
                />
              </div>
              {errors.issueKey && (
                <p className="text-sm text-destructive animate-fade-in">{errors.issueKey.message}</p>
              )}
            </div>
            <div className="flex items-end">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="hover-lift shadow-glow hover:shadow-glow-accent transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Fetch Issue
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="animate-fade-in border-destructive/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {fetchedIssue && (
            <Alert className="glass border-green-500/20 bg-green-500/5 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-600 dark:text-green-400">
                Issue fetched successfully! You can now generate test cases.
              </AlertDescription>
            </Alert>
          )}
        </form>

        {fetchedIssue && (
          <div className="mt-6 space-y-6 border-t border-border/50 pt-6 animate-slide-up">
            <div className="glass rounded-xl p-6 border border-border/50">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-bold text-xl text-gradient">{fetchedIssue.key}</h3>
                    {fetchedIssue.issueType && (
                      <Badge variant="secondary" className="shadow-sm">{fetchedIssue.issueType}</Badge>
                    )}
                    {fetchedIssue.status && (
                      <Badge variant="outline" className="shadow-sm">{fetchedIssue.status}</Badge>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-foreground">{fetchedIssue.summary}</p>
                </div>
              </div>
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

            {/* File Upload Section */}
            <div className="mt-6 space-y-4 border-t border-border/50 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Additional Context Files</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload PDF, DOCX, or TXT files to provide additional context (max 10MB per file)
                    </p>
                  </div>
                </div>
                {uploadedFiles.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedFiles(!expandedFiles)}
                    className="hover-lift"
                  >
                    {expandedFiles ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>

              {/* File Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  isDragging
                    ? "border-primary bg-primary/10 shadow-glow scale-[1.02]"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"
                }`}
              >
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-primary">Click to upload</span>
                    <span className="text-sm text-muted-foreground"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOCX, TXT up to 10MB each
                  </p>
                </label>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && expandedFiles && (
                <div className="space-y-3 mt-4 animate-slide-up">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Uploaded Files ({uploadedFiles.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 glass rounded-lg border border-border/50 hover-lift group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            file.status === "success" 
                              ? "bg-green-500/20 text-green-500" 
                              : file.status === "error"
                              ? "bg-red-500/20 text-red-500"
                              : "bg-primary/20 text-primary"
                          }`}>
                            {file.status === "uploading" ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : file.status === "success" ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <FileText className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>{(file.size / 1024).toFixed(2)} KB</span>
                              {file.status === "uploading" && (
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                  Uploading...
                                </span>
                              )}
                              {file.status === "success" && (
                                <span className="flex items-center gap-1 text-green-500">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Extracted
                                </span>
                              )}
                              {file.status === "error" && (
                                <span className="flex items-center gap-1 text-red-500">
                                  <AlertCircle className="h-3 w-3" />
                                  Error
                                </span>
                              )}
                            </p>
                            {file.error && (
                              <p className="text-xs text-red-500 mt-1 animate-fade-in">{file.error}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(file.id)}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Content Preview */}
              {uploadedFiles.some((f) => f.status === "success" && f.content) && (
                <div className="mt-6 space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold">Extracted Content Preview</h4>
                      <p className="text-xs text-muted-foreground">
                        Preview and edit extracted content from uploaded files
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="bg-muted rounded-md border p-4 max-h-64 overflow-y-auto">
                      <div className="space-y-4 text-sm font-mono whitespace-pre-wrap break-words">
                        {uploadedFiles
                          .filter((f) => f.status === "success" && f.content)
                          .map((file) => (
                            <div key={file.id} className="space-y-2">
                              <div className="flex items-center justify-between border-b pb-1">
                                <div className="font-semibold text-primary">
                                  {file.name}
                                </div>
                                {editingFileId === file.id ? (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={handleCancelEditFile}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveFileContent(file.id)}
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStartEditFile(file.id, file.content || "")}
                                  >
                                    <Edit2 className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                )}
                              </div>
                              {editingFileId === file.id ? (
                                <Textarea
                                  value={editedFileContent}
                                  onChange={(e) => setEditedFileContent(e.target.value)}
                                  className="text-xs font-mono min-h-32"
                                  placeholder="Edit file content..."
                                />
                              ) : (
                                <div className="text-xs text-muted-foreground pl-2">
                                  {file.content}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confluence Page Section */}
            <div className="mt-6 space-y-4 border-t border-border/50 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <Link2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Confluence Page</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter a Confluence page URL to include its content as additional context
                    </p>
                  </div>
                </div>
                {confluenceContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedConfluence(!expandedConfluence)}
                    className="hover-lift"
                  >
                    {expandedConfluence ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>

              {/* Confluence URL Input */}
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="confluenceUrl">Confluence Page URL</Label>
                  <Input
                    id="confluenceUrl"
                    placeholder="https://domain.atlassian.net/wiki/spaces/SPACE/pages/123456/Page+Title"
                    value={confluenceUrl}
                    onChange={(e) => setConfluenceUrl(e.target.value)}
                    disabled={isFetchingConfluence}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isFetchingConfluence) {
                        handleFetchConfluence();
                      }
                    }}
                  />
                  {confluenceError && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{confluenceError}</AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleFetchConfluence}
                    disabled={isFetchingConfluence || !confluenceUrl.trim()}
                    className="hover-lift shadow-glow hover:shadow-glow-accent transition-all"
                  >
                    {isFetchingConfluence ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Link2 className="mr-2 h-4 w-4" />
                        Fetch Page
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Fetched Confluence Content */}
              {confluenceContent && expandedConfluence && (
                <div className="space-y-4 animate-slide-up">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold">Page Content</h4>
                      {confluenceTitle && (
                        <p className="text-xs text-muted-foreground">{confluenceTitle}</p>
                      )}
                    </div>
                    {!isEditingConfluence && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingConfluence(true)}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveConfluence}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditingConfluence ? (
                    <>
                      <Textarea
                        value={confluenceContent}
                        onChange={(e) => setConfluenceContent(e.target.value)}
                        placeholder="Confluence page content..."
                        className="min-h-48 font-mono text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditingConfluence(false);
                            // Reset to fetched content if needed
                            // For now, keep edited content
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleConfluenceContentSave}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-muted rounded-md border p-4 max-h-64 overflow-y-auto">
                      <div className="whitespace-pre-wrap text-sm font-mono break-words">
                        {confluenceContent || (
                          <span className="text-muted-foreground italic">No content available</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

