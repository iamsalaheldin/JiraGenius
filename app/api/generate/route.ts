import { NextRequest, NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schemas";
import { generateTestCases } from "@/lib/llm-client";
import { getLLMApiKey } from "@/lib/env";

// Simple in-memory rate limiting (for MVP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate request
    const validation = GenerateRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Invalid request data", 
          details: validation.error.flatten().fieldErrors 
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

    console.log(`[API] Generating test cases for issue: ${data.issueKey}`);
    console.log(`[API] Using provider: ${provider}`);
    console.log(`[API] Config:`, data.modelConfig);

    console.log(`[API] Requirements provided: ${data.requirements?.length || 0}`);

    // Generate test cases
    const result = await generateTestCases(
      {
        storyTitle: data.storyTitle,
        description: data.description,
        acceptanceCriteria: data.acceptanceCriteria,
        additionalContext: data.additionalContext,
        images: data.images,
        modelConfig: data.modelConfig,
        provider,
        existingTestCases: data.existingTestCases,
        requirements: data.requirements,
      },
      apiKey
    );

    if (result.error) {
      console.error(`[API] Generation error:`, result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    console.log(`[API] Successfully generated ${result.testCases?.length || 0} test cases`);
    
    return NextResponse.json({ 
      testCases: result.testCases,
      provider,
    });
  } catch (error) {
    console.error("[API] Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

