import { TestCase } from "./schemas";
import { JiraAuth } from "./schemas";

// Jira user object from the API
export interface JiraUser {
  displayName?: string;
  emailAddress?: string;
  accountId?: string;
  avatarUrls?: Record<string, string>;
  active?: boolean;
}

/**
 * Validate Jira credentials by calling our backend API
 * This avoids CORS issues and browser limitations with Buffer API
 */
export async function validateAuth(
  baseUrl: string,
  email: string,
  token: string
): Promise<{ valid: boolean; user?: JiraUser; error?: string }> {
  try {
    const response = await fetch("/api/jira/auth/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        baseUrl,
        email,
        apiToken: token,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { 
        valid: false, 
        error: data.error || "Authentication failed" 
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Jira auth validation error:", error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : "Network error" 
    };
  }
}

export interface UploadTestCasesResult {
  testCaseId: string;
  status: "uploaded" | "skipped" | "failed";
  testKey?: string;
  error?: string;
}

export interface UploadTestCasesResponse {
  success: boolean;
  results: UploadTestCasesResult[];
  summary: {
    total: number;
    uploaded: number;
    skipped: number;
    failed: number;
  };
  error?: string;
}

/**
 * Upload test cases to Jira X-Ray
 * Client-side function that calls the upload API
 */
export async function uploadTestCasesToJira(
  testCases: TestCase[],
  issueKey: string,
  auth: JiraAuth,
  options?: {
    skipDuplicates?: boolean;
    labels?: string[];
  }
): Promise<UploadTestCasesResponse> {
  try {
    const response = await fetch("/api/jira/xray/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth,
        issueKey,
        testCases,
        options: options || {
          skipDuplicates: true,
          labels: ["ai-generated"],
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return {
        success: false,
        results: [],
        summary: { total: 0, uploaded: 0, skipped: 0, failed: 0 },
        error: errorData.error || "Upload failed",
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Upload test cases error:", error);
    return {
      success: false,
      results: [],
      summary: { total: 0, uploaded: 0, skipped: 0, failed: 0 },
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}


