/**
 * Server-side Confluence API functions
 * These functions can only be called from API routes (server-side)
 * as they use Node.js APIs like Buffer
 */

import { JiraAuth } from "./schemas";
import { adfToPlainText } from "./adf-converter";
import { createAuthHeader } from "./jira-server";

/**
 * Extract image URLs and attachment references from Confluence HTML
 */
function extractImages(html: string, baseUrl: string): ConfluenceImage[] {
  const images: ConfluenceImage[] = [];
  
  // Extract ac:image with ri:attachment
  const imageMatches = html.matchAll(/<ac:image[^>]*>[\s\S]*?<ri:attachment[^>]*ri:filename="([^"]*)"[^>]*\/>[\s\S]*?<\/ac:image>/gi);
  for (const match of imageMatches) {
    const filename = match[1];
    // Confluence attachment URL format: /wiki/download/attachments/{pageId}/{filename}
    // We'll need the pageId to construct the full URL, but we can extract it from context
    images.push({
      filename,
      url: `${baseUrl}/wiki/download/attachments/{pageId}/${encodeURIComponent(filename)}`,
    });
  }
  
  // Extract standalone ri:attachment references
  const attachmentMatches = html.matchAll(/<ri:attachment[^>]*ri:filename="([^"]*)"[^>]*\/>/gi);
  for (const match of attachmentMatches) {
    const filename = match[1];
    if (!images.some(img => img.filename === filename)) {
      images.push({
        filename,
        url: `${baseUrl}/wiki/download/attachments/{pageId}/${encodeURIComponent(filename)}`,
      });
    }
  }
  
  return images;
}

/**
 * Fetch an image from Confluence and convert to base64
 */
async function fetchImageAsBase64(
  imageUrl: string,
  auth: JiraAuth
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl, {
      method: "GET",
      headers: {
        "Authorization": createAuthHeader(auth.email, auth.apiToken),
      },
    });

    if (!response.ok) {
      console.warn(`[Confluence] Failed to fetch image: ${imageUrl} (${response.status})`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    
    // Determine MIME type from response or file extension
    const contentType = response.headers.get("content-type") || "image/png";
    
    return {
      base64,
      mimeType: contentType,
    };
  } catch (error) {
    console.error(`[Confluence] Error fetching image ${imageUrl}:`, error);
    return null;
  }
}

/**
 * Convert HTML string to plain text
 * Strips HTML tags and converts HTML entities to readable text
 */
function htmlToPlainText(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  let text = html;

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "...")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // Handle Confluence-specific tags first
  // Images and attachments
  text = text.replace(/<ac:image[^>]*>[\s\S]*?<\/ac:image>/gi, "[Image]");
  text = text.replace(/<ri:attachment[^>]*ri:filename="([^"]*)"[^>]*>/gi, "[Attachment: $1]");
  
  // Code blocks
  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
  
  // Strong/Bold
  text = text.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, "**$2**");
  
  // Emphasis/Italic
  text = text.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, "*$2*");
  
  // Links
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)");
  
  // Headings - preserve hierarchy
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n");
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n");
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n");
  text = text.replace(/<h[4-6][^>]*>(.*?)<\/h[4-6]>/gi, "\n#### $1\n");
  
  // Lists
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, "\n• $1");
  text = text.replace(/<ol[^>]*>/gi, "\n");
  text = text.replace(/<\/ol>/gi, "\n");
  text = text.replace(/<ul[^>]*>/gi, "\n");
  text = text.replace(/<\/ul>/gi, "\n");
  
  // Tables
  text = text.replace(/<table[^>]*>/gi, "\n");
  text = text.replace(/<\/table>/gi, "\n");
  text = text.replace(/<tr[^>]*>/gi, "\n");
  text = text.replace(/<\/tr>/gi, "");
  text = text.replace(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi, "| $1 ");
  text = text.replace(/<thead[^>]*>/gi, "");
  text = text.replace(/<\/thead>/gi, "");
  text = text.replace(/<tbody[^>]*>/gi, "");
  text = text.replace(/<\/tbody>/gi, "");
  
  // Replace block-level elements with newlines
  text = text
    .replace(/<\/?(p|div|section|article|header|footer|nav|aside|main|blockquote|pre)[^>]*>/gi, "\n")
    .replace(/<\/?(br|hr)[^>]*>/gi, "\n");

  // Remove all remaining HTML/XML tags (including Confluence-specific ones)
  text = text.replace(/<[^>]+>/g, "");

  // Clean up whitespace
  text = text
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Multiple newlines to double newline
    .replace(/[ \t]+/g, " ") // Multiple spaces to single space
    .replace(/\n /g, "\n") // Remove leading spaces after newlines
    .replace(/ \n/g, "\n") // Remove trailing spaces before newlines
    .trim();

  return text;
}

export interface ConfluenceImage {
  url: string;
  filename?: string;
  base64?: string;
  mimeType?: string;
}

export interface ConfluencePage {
  title: string;
  content: string;
  images?: ConfluenceImage[];
}

/**
 * Parse Confluence URL to extract page ID
 * Supports formats like:
 * - https://domain.atlassian.net/wiki/spaces/SPACE/pages/123456/Page+Title
 * - https://domain.atlassian.net/wiki/spaces/SPACE/pages/123456
 */
export function parseConfluenceUrl(url: string): { pageId: string; baseUrl: string } | null {
  try {
    const urlObj = new URL(url);
    
    // Extract base URL (domain)
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    
    // Match pattern: /wiki/spaces/{spaceKey}/pages/{pageId}
    const match = urlObj.pathname.match(/\/wiki\/spaces\/[^/]+\/pages\/(\d+)/);
    
    if (!match || !match[1]) {
      return null;
    }
    
    return {
      pageId: match[1],
      baseUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a Confluence page by ID (server-side only)
 */
export async function fetchConfluencePageServer(
  pageId: string,
  baseUrl: string,
  auth: JiraAuth
): Promise<{ page?: ConfluencePage; error?: string }> {
  try {
    // Remove trailing slash from baseUrl
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    
    // Confluence API endpoint
    // Try to get both storage (ADF) and view (HTML) formats for maximum compatibility
    const response = await fetch(
      `${cleanBaseUrl}/wiki/rest/api/content/${pageId}?expand=body.storage,body.view`,
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
        return { error: "Confluence page not found" };
      }
      if (response.status === 401) {
        return { error: "Unauthorized - please check your credentials" };
      }
      if (response.status === 403) {
        return { error: "Forbidden - you may not have access to this page" };
      }
      return { error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    
    // Extract title and body
    const title = data.title || "Untitled Page";
    const actualPageId = data.id || pageId; // Use page ID from response if available
    
    // Try body.storage first (ADF format), then body.view (HTML), then body.storage.value
    let bodyContent = data.body?.storage;
    let isHtml = false;
    let htmlContent = "";
    
    // If body.storage is an object with a 'value' property, use that
    if (bodyContent && typeof bodyContent === 'object' && 'value' in bodyContent) {
      const storageValue = bodyContent.value;
      // Check if it's HTML (starts with <) or ADF (is an object with type property)
      if (typeof storageValue === 'string' && storageValue.trim().startsWith('<')) {
        isHtml = true;
        bodyContent = storageValue;
        htmlContent = storageValue;
      } else {
        bodyContent = storageValue;
      }
    }
    
    // If still no content or it's not HTML yet, try body.view
    if (!bodyContent || (typeof bodyContent === 'object' && !isHtml)) {
      const viewContent = data.body?.view;
      if (viewContent) {
        if (typeof viewContent === 'object' && 'value' in viewContent) {
          const viewValue = viewContent.value;
          if (typeof viewValue === 'string' && viewValue.trim().startsWith('<')) {
            isHtml = true;
            bodyContent = viewValue;
            htmlContent = viewValue;
          } else {
            bodyContent = viewValue;
          }
        } else if (typeof viewContent === 'string' && viewContent.trim().startsWith('<')) {
          isHtml = true;
          bodyContent = viewContent;
          htmlContent = viewContent;
        } else {
          bodyContent = viewContent;
        }
      }
    }
    
    if (!bodyContent) {
      console.error("Confluence page body structure:", JSON.stringify(data.body, null, 2));
      return { error: "Page content not available. The page may be empty or use an unsupported format." };
    }
    
    // Convert to plain text
    let content: string;
    if (isHtml || (typeof bodyContent === 'string' && bodyContent.trim().startsWith('<'))) {
      // It's HTML, convert to plain text
      console.log("[Confluence] Detected HTML content, converting to plain text");
      htmlContent = typeof bodyContent === 'string' ? bodyContent : JSON.stringify(bodyContent);
      content = htmlToPlainText(htmlContent);
    } else if (typeof bodyContent === 'string') {
      // It's already a string (might be plain text or HTML)
      if (bodyContent.trim().startsWith('<')) {
        htmlContent = bodyContent;
        isHtml = true;
        content = htmlToPlainText(bodyContent);
      } else {
        content = bodyContent;
      }
    } else {
      // It's likely ADF format (JSON object)
      console.log("[Confluence] Detected ADF content, converting to plain text");
      content = adfToPlainText(bodyContent);
    }
    
    if (!content || content.trim().length === 0) {
      return { error: "Page content is empty" };
    }
    
    // Extract and fetch images from Confluence page
    const fetchedImages: ConfluenceImage[] = [];
    
    console.log(`[Confluence] HTML content available: ${!!htmlContent}, isHtml: ${isHtml}, content length: ${htmlContent.length}`);
    
    if (htmlContent && isHtml) {
      // Extract image references from HTML
      const imageRefs = extractImages(htmlContent, cleanBaseUrl);
      
      if (imageRefs.length > 0) {
        console.log(`[Confluence] Found ${imageRefs.length} image(s) in page ${actualPageId}`);
        
        // Replace {pageId} placeholder with actual page ID
        for (const imageRef of imageRefs) {
          const imageUrl = imageRef.url.replace('{pageId}', actualPageId);
          
          // Fetch the image
          const imageData = await fetchImageAsBase64(imageUrl, auth);
          if (imageData) {
            fetchedImages.push({
              url: imageUrl,
              filename: imageRef.filename,
              base64: imageData.base64,
              mimeType: imageData.mimeType,
            });
            console.log(`[Confluence] Successfully fetched image: ${imageRef.filename}`);
          } else {
            console.warn(`[Confluence] Failed to fetch image: ${imageRef.filename}`);
          }
        }
      }
    }
    
    return {
      page: {
        title,
        content,
        images: fetchedImages.length > 0 ? fetchedImages : undefined,
      },
    };
  } catch (error) {
    console.error("Confluence fetch page error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    return {
      error: `Failed to fetch Confluence page: ${errorMessage}`,
    };
  }
}

