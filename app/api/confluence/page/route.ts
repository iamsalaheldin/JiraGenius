import { NextRequest, NextResponse } from "next/server";
import { JiraAuthSchema } from "@/lib/schemas";
import { parseConfluenceUrl, fetchConfluencePageServer } from "@/lib/confluence-server";
import { z } from "zod";

const ConfluencePageRequestSchema = z.object({
  url: z.string().url("Invalid URL format"),
  auth: JiraAuthSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = ConfluencePageRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { url, auth } = validation.data;

    // Parse URL to extract page ID
    const parsed = parseConfluenceUrl(url);
    if (!parsed) {
      console.error("Failed to parse Confluence URL:", url);
      return NextResponse.json(
        { error: "Invalid Confluence URL format. Expected format: https://domain.atlassian.net/wiki/spaces/SPACE/pages/123456/..." },
        { status: 400 }
      );
    }

    const { pageId, baseUrl } = parsed;
    console.log(`[Confluence API] Fetching page ${pageId} from ${baseUrl}`);

    // Fetch the page
    const result = await fetchConfluencePageServer(pageId, baseUrl, auth);
    
    if (result.error) {
      console.error(`[Confluence API] Error fetching page: ${result.error}`);
    } else {
      console.log(`[Confluence API] Successfully fetched page: ${result.page?.title}`);
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes("not found") ? 404 : result.error.includes("Unauthorized") || result.error.includes("Forbidden") ? 401 : 400 }
      );
    }

    return NextResponse.json({ page: result.page });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

