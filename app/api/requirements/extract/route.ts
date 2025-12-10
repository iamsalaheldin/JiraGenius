import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractAllRequirementsWithLLM } from "@/lib/requirement-extractor";
import { getLLMApiKey } from "@/lib/env";

// Validation schema for extraction request
const ExtractRequestSchema = z.object({
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  fileContents: z.array(
    z.object({
      filename: z.string(),
      content: z.string(),
    })
  ).optional(),
  confluenceContent: z.object({
    title: z.string(),
    content: z.string(),
  }).optional(),
  issueKey: z.string().optional().default("STANDALONE"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = ExtractRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const provider = process.env.LLM_PROVIDER || "anthropic";

    // Get API key for the selected provider
    const apiKey = getLLMApiKey(provider);
    if (!apiKey) {
      console.error(`[API] No API key found for provider: ${provider}`);
      return NextResponse.json(
        { error: `LLM API key not configured for provider: ${provider}` },
        { status: 500 }
      );
    }

    console.log(`[API] Extracting requirements for issue: ${data.issueKey}`);
    console.log(`[API] Using provider: ${provider}`);
    console.log(`[API] Sources: Description=${!!data.description}, AC=${!!data.acceptanceCriteria}, Files=${data.fileContents?.length || 0}, Confluence=${!!data.confluenceContent}`);

    // Extract requirements using LLM
    const requirements = await extractAllRequirementsWithLLM({
      description: data.description,
      acceptanceCriteria: data.acceptanceCriteria,
      fileContents: data.fileContents,
      confluenceContent: data.confluenceContent,
      issueKey: data.issueKey,
      llmApiKey: apiKey,
      llmProvider: provider,
    });

    console.log(`[API] Successfully extracted ${requirements.length} requirements`);

    return NextResponse.json({
      requirements,
      provider,
      count: requirements.length,
    });
  } catch (error) {
    console.error("[API] Requirement extraction error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

