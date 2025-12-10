/**
 * Server-side Jira API functions
 * These functions can only be called from API routes (server-side)
 * as they use Node.js APIs like Buffer
 */

import { JiraAuth, JiraIssueSchema, ParsedIssue, ImageData } from "./schemas";
import { adfToPlainText, extractAcceptanceCriteria } from "./adf-converter";

/**
 * Create authorization header for Jira API (server-side only)
 */
export function createAuthHeader(email: string, token: string): string {
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

/**
 * Fetch a Jira attachment and convert to base64 (server-side only)
 */
async function fetchJiraAttachmentAsBase64(
  attachmentUrl: string,
  auth: JiraAuth
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(attachmentUrl, {
      method: "GET",
      headers: {
        "Authorization": createAuthHeader(auth.email, auth.apiToken),
      },
    });

    if (!response.ok) {
      console.warn(`[Jira] Failed to fetch attachment: ${attachmentUrl} (${response.status})`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    
    // Determine MIME type from response or default to image/png
    const contentType = response.headers.get("content-type") || "image/png";
    
    return {
      base64,
      mimeType: contentType,
    };
  } catch (error) {
    console.error(`[Jira] Error fetching attachment ${attachmentUrl}:`, error);
    return null;
  }
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
    
    // Include attachment expansion to fetch attachments
    const response = await fetch(
      `${cleanUrl}/rest/api/3/issue/${issueKey}?expand=attachment`,
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
    const parsedIssue = await parseJiraIssue(issue, auth);
    
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
async function parseJiraIssue(issue: any, auth: JiraAuth): Promise<ParsedIssue> {
  // Convert description from ADF to plain text
  let description = "";
  if (issue.fields.description) {
    description = adfToPlainText(issue.fields.description);
  }
  
  // Try to extract acceptance criteria from description
  const acceptanceCriteria = extractAcceptanceCriteria(description);
  
  // Extract and fetch image attachments
  const images: ImageData[] = [];
  const attachments = issue.fields.attachment || [];
  
  // Filter for image attachments
  const imageAttachments = attachments.filter((att: any) => 
    att.mimeType && att.mimeType.startsWith('image/')
  );
  
  if (imageAttachments.length > 0) {
    console.log(`[Jira] Found ${imageAttachments.length} image attachment(s) for issue ${issue.key}`);
    
    // Fetch each image
    for (const att of imageAttachments) {
      const imageData = await fetchJiraAttachmentAsBase64(att.content, auth);
      if (imageData) {
        images.push({
          base64: imageData.base64,
          mimeType: imageData.mimeType,
          filename: att.filename,
        });
        console.log(`[Jira] Successfully fetched image: ${att.filename}`);
      } else {
        console.warn(`[Jira] Failed to fetch image: ${att.filename}`);
      }
    }
  }
  
  return {
    key: issue.key,
    summary: issue.fields.summary,
    description,
    acceptanceCriteria: acceptanceCriteria || undefined,
    issueType: issue.fields.issuetype?.name,
    status: issue.fields.status?.name,
    images: images.length > 0 ? images : undefined,
  };
}

