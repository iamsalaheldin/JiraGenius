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
  onFileContentChange?: (content: string) => void;
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
      // Clear uploaded files when fetching new issue
      setUploadedFiles([]);
      if (onFileContentChange) {
        onFileContentChange("");
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
      const extractedContent: string[] = [];
      setUploadedFiles((prev) =>
        prev.map((f) => {
          const extractedFile = result.files?.find(
            (ef: { filename: string }) => ef.filename === f.name
          );
          if (extractedFile) {
            extractedContent.push(`--- File: ${f.name} ---\n${extractedFile.content}\n`);
            return {
              ...f,
              status: "success" as const,
              content: extractedFile.content,
            };
          }
          return f;
        })
      );

      // Combine all extracted content
      const combinedContent = extractedContent.join("\n\n");
      if (onFileContentChange) {
        onFileContentChange(combinedContent);
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
    setUploadedFiles((prev) => {
      const remaining = prev.filter((f) => f.id !== fileId);
      // Update combined content
      const combinedContent = remaining
        .filter((f) => f.status === "success" && f.content)
        .map((f) => `--- File: ${f.name} ---\n${f.content}\n`)
        .join("\n\n");
      if (onFileContentChange) {
        onFileContentChange(combinedContent);
      }
      return remaining;
    });
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
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

