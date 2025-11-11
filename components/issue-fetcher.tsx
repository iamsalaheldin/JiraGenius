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
import { Loader2, AlertCircle, CheckCircle2, Edit2, Save, X, Upload, FileText, Trash2 } from "lucide-react";
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
  savedAcceptanceCriteria 
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

  // Automatically update combined content whenever uploadedFiles or confluenceContent changes
  useEffect(() => {
    if (!onFileContentChange) return;

    // Combine all files' content
    const allFileContent = uploadedFiles
      .filter((f) => f.status === "success" && f.content)
      .map((f) => `--- File: ${f.name} ---\n${f.content}\n`)
      .join("\n\n");
    
    // Combine with Confluence content
    const combinedContent = [allFileContent, confluenceContent].filter(Boolean).join("\n\n--- Confluence Page ---\n\n");
    
    console.log("[IssueFetcher] useEffect: Updating combined content");
    console.log("[IssueFetcher] useEffect: Files count:", uploadedFiles.length);
    console.log("[IssueFetcher] useEffect: Files with content:", uploadedFiles.filter(f => f.status === "success" && f.content).length);
    console.log("[IssueFetcher] useEffect: File content length:", allFileContent.length);
    console.log("[IssueFetcher] useEffect: Confluence content length:", confluenceContent.length);
    console.log("[IssueFetcher] useEffect: Combined content length:", combinedContent.length);
    console.log("[IssueFetcher] useEffect: Combined content preview:", combinedContent.substring(0, 300));
    
    const fileData = uploadedFiles
      .filter((f) => f.status === "success" && f.content)
      .map((f) => ({ filename: f.name, content: f.content || "" }));
    onFileContentChange(combinedContent, fileData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFiles, confluenceContent]);

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
      if (onFileContentChange) {
        onFileContentChange("");
      }
      // Clear Confluence content when fetching new issue
      setConfluenceUrl("");
      setConfluenceContent("");
      setConfluenceTitle("");
      if (onConfluenceContentChange) {
        onConfluenceContentChange("");
      }
      onIssueFetched(result.issue);
      setError(null);
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

      // Combine ALL files' content (including existing ones) - do this outside state updater
      const allFileContent = updatedFiles
        .filter((f) => f.status === "success" && f.content)
        .map((f) => `--- File: ${f.name} ---\n${f.content}\n`)
        .join("\n\n");
      
      // Combine with Confluence content
      const combinedContent = [allFileContent, confluenceContent].filter(Boolean).join("\n\n--- Confluence Page ---\n\n");
      
      console.log("[IssueFetcher] Total uploaded files:", updatedFiles.length);
      console.log("[IssueFetcher] Files with content:", updatedFiles.filter(f => f.status === "success" && f.content).length);
      console.log("[IssueFetcher] All file content length:", allFileContent.length);
      console.log("[IssueFetcher] Combined content length:", combinedContent.length);
      console.log("[IssueFetcher] Combined content preview:", combinedContent.substring(0, 200));
      
      // Call the callback with the combined content - outside state updater to avoid React warning
      if (onFileContentChange) {
        console.log("[IssueFetcher] Calling onFileContentChange with content length:", combinedContent.length);
        const fileData = updatedFiles
          .filter((f) => f.status === "success" && f.content)
          .map((f) => ({ filename: f.name, content: f.content || "" }));
        onFileContentChange(combinedContent, fileData);
      } else {
        console.warn("[IssueFetcher] WARNING: onFileContentChange callback is not provided!");
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

      console.log("[Confluence] Fetched page:", result.page.title, "Content length:", result.page.content?.length);
      
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
      
      // Combine with file content
      const fileContent = uploadedFiles
        .filter((f) => f.status === "success" && f.content)
        .map((f) => `--- File: ${f.name} ---\n${f.content}\n`)
        .join("\n\n");
      const combinedContent = [fileContent, result.page.content].filter(Boolean).join("\n\n--- Confluence Page ---\n\n");
      
      console.log("[Confluence] Combined content length:", combinedContent.length);
      
      if (onFileContentChange) {
        const fileData = uploadedFiles
          .filter((f) => f.status === "success" && f.content)
          .map((f) => ({ filename: f.name, content: f.content || "" }));
        onFileContentChange(combinedContent, fileData);
      }
      if (onConfluenceContentChange) {
        // Pass title and content, skip images
        onConfluenceContentChange(result.page.content, result.page.title, undefined);
      }
      
      toast.success(`Successfully fetched Confluence page: ${result.page.title}`);
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

            {/* File Upload Section */}
            <div className="mt-6 space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Additional Context Files</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload PDF, DOCX, or TXT files to provide additional context for test case generation (max 10MB per file)
                  </p>
                </div>
              </div>

              {/* File Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
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
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium text-primary">Click to upload</span>
                    <span className="text-sm text-muted-foreground"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOCX, TXT up to 10MB each
                  </p>
                </label>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Uploaded Files:</h4>
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-md"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
                              {file.status === "uploading" && (
                                <span className="ml-2">• Uploading...</span>
                              )}
                              {file.status === "success" && (
                                <span className="ml-2 text-green-600">• Extracted</span>
                              )}
                              {file.status === "error" && (
                                <span className="ml-2 text-red-600">• Error</span>
                              )}
                            </p>
                            {file.error && (
                              <p className="text-xs text-red-600 mt-1">{file.error}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(file.id)}
                          className="flex-shrink-0"
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
            <div className="mt-6 space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Confluence Page</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter a Confluence page URL to include its content as additional context for test case generation
                  </p>
                </div>
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
                  >
                    {isFetchingConfluence ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      "Fetch Page"
                    )}
                  </Button>
                </div>
              </div>

              {/* Fetched Confluence Content */}
              {confluenceContent && (
                <div className="space-y-4">
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

