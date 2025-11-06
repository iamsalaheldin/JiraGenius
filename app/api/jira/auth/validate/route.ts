import { NextRequest, NextResponse } from "next/server";
import { JiraAuthSchema } from "@/lib/schemas";

/**
 * Server-side validation of Jira credentials
 * This runs on the backend to avoid CORS issues and use Node.js APIs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate auth credentials
    const authValidation = JiraAuthSchema.safeParse(body);
    if (!authValidation.success) {
      return NextResponse.json(
        { 
          valid: false, 
          error: "Invalid request data", 
          details: authValidation.error.flatten() 
        },
        { status: 400 }
      );
    }

    const { baseUrl, email, apiToken } = authValidation.data;

    // Remove trailing slash from baseUrl
    const cleanUrl = baseUrl.replace(/\/$/, "");

    // Create Basic Auth header using Node.js Buffer API (only available server-side)
    const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;

    // Call Jira API to validate credentials
    const response = await fetch(`${cleanUrl}/rest/api/3/myself`, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { valid: false, error: "Invalid credentials" },
          { status: 200 } // Return 200 with valid: false
        );
      }
      return NextResponse.json(
        { 
          valid: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        },
        { status: 200 }
      );
    }

    const user = await response.json();
    return NextResponse.json({ valid: true, user });
  } catch (error) {
    console.error("Jira auth validation error:", error);
    return NextResponse.json(
      { 
        valid: false, 
        error: error instanceof Error ? error.message : "Network error" 
      },
      { status: 500 }
    );
  }
}

