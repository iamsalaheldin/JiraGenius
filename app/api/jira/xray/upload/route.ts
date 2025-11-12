import { NextRequest, NextResponse } from "next/server";
import { JiraAuthSchema, TestCaseSchema } from "@/lib/schemas";
import { uploadTestCaseToXRay, XRayUploadResult } from "@/lib/xray-client";

/**
 * Upload test cases to Jira X-Ray
 * POST /api/jira/xray/upload
 * 
 * Request body:
 * {
 *   auth: JiraAuth,
 *   issueKey: string, // The user story key
 *   testCaseIds: string[], // Array of test case IDs to upload
 *   testCases: TestCase[], // Array of test case objects
 *   options?: {
 *     skipDuplicates?: boolean,
 *     labels?: string[]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate auth credentials
    const authValidation = JiraAuthSchema.safeParse(body.auth);
    if (!authValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid authentication credentials",
          details: authValidation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const auth = authValidation.data;

    // Validate issue key
    if (!body.issueKey || typeof body.issueKey !== "string") {
      return NextResponse.json(
        { error: "issueKey is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate test cases
    if (!body.testCases || !Array.isArray(body.testCases) || body.testCases.length === 0) {
      return NextResponse.json(
        { error: "testCases is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate each test case
    const testCases = [];
    for (const tc of body.testCases) {
      const validation = TestCaseSchema.safeParse(tc);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: `Invalid test case: ${validation.error.flatten().fieldErrors}`,
            testCaseId: tc.id,
          },
          { status: 400 }
        );
      }
      testCases.push(validation.data);
    }

    // Extract options
    const options = {
      skipDuplicates: body.options?.skipDuplicates ?? true,
      labels: body.options?.labels || ["ai-generated"],
    };

    // Upload each test case
    const results: XRayUploadResult[] = [];
    
    for (const testCase of testCases) {
      try {
        const result = await uploadTestCaseToXRay(
          testCase,
          body.issueKey,
          auth,
          options
        );
        results.push(result);
      } catch (error) {
        // Handle unexpected errors
        results.push({
          testCaseId: testCase.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        uploaded: results.filter((r) => r.status === "uploaded").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        failed: results.filter((r) => r.status === "failed").length,
      },
    });
  } catch (error) {
    console.error("X-Ray upload API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

