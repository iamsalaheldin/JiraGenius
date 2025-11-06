/**
 * Server-side Jira API functions
 * These functions can only be called from API routes (server-side)
 * as they use Node.js APIs like Buffer
 */

import { JiraAuth, JiraIssueSchema, ParsedIssue } from "./schemas";
import { adfToPlainText, extractAcceptanceCriteria } from "./adf-converter";

/**
 * Create authorization header for Jira API (server-side only)
 */
export function createAuthHeader(email: string, token: string): string {
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

/**
 * Fetch a Jira issue by key (server-side only)
 */
export async function fetchIssueServer(
  issueKey: string,
  auth: JiraAuth
): Promise<{ issue?: ParsedIssue; error?: string }> {
  try {
    // Remove trailing slash from baseUrl
    const cleanUrl = auth.baseUrl.replace(/\/$/, "");
    
    const response = await fetch(
      `${cleanUrl}/rest/api/3/issue/${issueKey}`,
      {
        method: "GET",
        headers: {
          "Authorization": createAuthHeader(auth.email, auth.apiToken),
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { error: "Issue not found" };
      }
      if (response.status === 401) {
        return { error: "Unauthorized - please check your credentials" };
      }
      return { error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    
    // Validate response with Zod
    const validationResult = JiraIssueSchema.safeParse(data);
    if (!validationResult.success) {
      console.error("Jira issue validation error:", validationResult.error);
      return { error: "Invalid issue data received from Jira" };
    }

    const issue = validationResult.data;
    
    // Parse the issue
    const parsedIssue = parseJiraIssue(issue);
    
    return { issue: parsedIssue };
  } catch (error) {
    console.error("Jira fetch issue error:", error);
    return { 
      error: error instanceof Error ? error.message : "Failed to fetch issue" 
    };
  }
}

/**
 * Parse Jira issue data into a simplified format
 */
function parseJiraIssue(issue: any): ParsedIssue {
  // Convert description from ADF to plain text
  let description = "";
  if (issue.fields.description) {
    description = adfToPlainText(issue.fields.description);
  }
  
  // Try to extract acceptance criteria from description
  const acceptanceCriteria = extractAcceptanceCriteria(description);
  
  return {
    key: issue.key,
    summary: issue.fields.summary,
    description,
    acceptanceCriteria: acceptanceCriteria || undefined,
    issueType: issue.fields.issuetype?.name,
    status: issue.fields.status?.name,
  };
}

