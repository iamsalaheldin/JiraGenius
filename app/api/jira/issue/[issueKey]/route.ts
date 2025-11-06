import { NextRequest, NextResponse } from "next/server";
import { JiraAuthSchema } from "@/lib/schemas";
import { fetchIssueServer } from "@/lib/jira-server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ issueKey: string }> }
) {
  try {
    const params = await context.params;
    const { issueKey } = params;
    const body = await request.json();

    // Validate auth credentials from request body
    const authValidation = JiraAuthSchema.safeParse(body.auth);
    if (!authValidation.success) {
      return NextResponse.json(
        { error: "Invalid authentication credentials", details: authValidation.error.flatten() },
        { status: 400 }
      );
    }

    const auth = authValidation.data;

    // Fetch the issue
    const result = await fetchIssueServer(issueKey, auth);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes("not found") ? 404 : 400 }
      );
    }

    return NextResponse.json({ issue: result.issue });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

