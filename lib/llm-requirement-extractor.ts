/**
 * LLM-Based Requirement Extraction Module
 * Uses Claude/Gemini/OpenAI to intelligently extract requirements from content
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Requirement } from "./requirement-extractor";

// Zod schema for LLM requirement extraction response
const RequirementExtractionSchema = z.object({
  requirements: z.array(
    z.object({
      text: z.string(),
      source: z.enum(["user_story", "acceptance_criteria", "file", "confluence"]),
      sourceId: z.string(),
      category: z.enum(["functional", "non-functional", "api", "flow", "edge_case"]),
      priority: z.enum(["low", "medium", "high"]),
    })
  ),
});

interface ExtractionParams {
  description?: string;
  acceptanceCriteria?: string;
  fileContents?: Array<{ filename: string; content: string }>;
  confluenceContent?: { title: string; content: string };
  issueKey: string;
  apiKey: string;
  provider?: string;
}

/**
 * Build prompt for LLM requirement extraction
 */
function buildExtractionPrompt(params: ExtractionParams): string {
  const sources: string[] = [];

  if (params.description) {
    sources.push(`
=== USER STORY DESCRIPTION ===
${params.description}
`);
  }

  if (params.acceptanceCriteria) {
    sources.push(`
=== ACCEPTANCE CRITERIA ===
${params.acceptanceCriteria}
`);
  }

  if (params.fileContents && params.fileContents.length > 0) {
    params.fileContents.forEach((file) => {
      sources.push(`
=== FILE: ${file.filename} ===
${file.content}
`);
    });
  }

  if (params.confluenceContent) {
    sources.push(`
=== CONFLUENCE PAGE: ${params.confluenceContent.title} ===
${params.confluenceContent.content}
`);
  }

  return `You are a QA analyst extracting individual testable requirements from user story documentation.

CONTENT TO ANALYZE:
${sources.join("\n")}

YOUR TASK:
Analyze the content above and extract EVERY SINGLE individual requirement, test condition, or testable scenario. Each requirement should be:
- A SPECIFIC, ATOMIC, TESTABLE statement
- INDEPENDENT from other requirements
- CLEAR and UNAMBIGUOUS
- ONE single thing to test/verify

EXTRACTION RULES:
1. **BE GRANULAR**: Break down complex statements into individual atomic requirements
   - BAD: "User uploads file and data is imported and SMS is sent" (3 requirements bundled)
   - GOOD: 
     * "User can upload an Excel file"
     * "Uploaded data is imported into the system"
     * "SMS notification is sent after successful import"

2. **EXTRACT EVERYTHING TESTABLE**:
   - Functional behaviors
   - API endpoints and their expected responses
   - User interface interactions
   - Data validation rules
   - Error handling scenarios
   - Edge cases and boundary conditions
   - System responses and feedback
   - Integration points
   - Performance expectations
   - Security requirements

3. **SOURCE IDENTIFICATION**:
   - "user_story" for requirements from USER STORY DESCRIPTION
   - "acceptance_criteria" for requirements from ACCEPTANCE CRITERIA
   - "file" for requirements from uploaded files (use filename as sourceId)
   - "confluence" for requirements from Confluence pages (use page title as sourceId)

4. **CATEGORIZATION**:
   - "functional": Normal feature/behavior requirements
   - "api": API endpoints, HTTP methods, request/response formats
   - "flow": User flows, processes, workflows, integrations
   - "edge_case": Error handling, validation, boundary conditions
   - "non-functional": Performance, security, scalability, availability

5. **PRIORITY**:
   - "high": Must have, critical, essential, core functionality
   - "medium": Should have, important, recommended (default)
   - "low": Nice to have, optional, could have

6. **IMPORTANT**: 
   - DO NOT combine multiple requirements into one
   - Extract implicit requirements (e.g., if upload is mentioned, extraction is implied)
   - Include negative test scenarios (invalid inputs, error cases)
   - Keep the exact wording from the source when possible
   - Each requirement should be independently testable

Return your response as valid JSON matching this schema:

{
  "requirements": [
    {
      "text": "Clear, specific requirement statement",
      "source": "user_story" | "acceptance_criteria" | "file" | "confluence",
      "sourceId": "description" | "acceptance_criteria" | "filename" | "page_title",
      "category": "functional" | "non-functional" | "api" | "flow" | "edge_case",
      "priority": "low" | "medium" | "high"
    }
  ]
}

CRITICAL: Return ONLY valid JSON, no markdown code blocks or additional text. Extract as many individual atomic requirements as possible - aim for granularity and completeness.`;
}

/**
 * Extract requirements using LLM
 */
export async function extractRequirementsWithLLM(
  params: ExtractionParams
): Promise<Requirement[]> {
  const provider = params.provider || process.env.LLM_PROVIDER || "anthropic";
  const prompt = buildExtractionPrompt(params);

  console.log(`[LLM Requirement Extraction] Using provider: ${provider}`);

  try {
    let responseText: string;

    switch (provider) {
      case "gemini":
        responseText = await callGeminiForExtraction(prompt, params.apiKey);
        break;
      case "openai":
        responseText = await callOpenAIForExtraction(prompt, params.apiKey);
        break;
      case "anthropic":
        responseText = await callAnthropicForExtraction(prompt, params.apiKey);
        break;
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }

    // Parse and validate response
    const parsed = parseExtractionResponse(responseText);
    
    // Convert to Requirement[] format with generated IDs
    const requirements: Requirement[] = parsed.requirements.map((req, index) => ({
      id: `REQ-${params.issueKey}-${req.source.toUpperCase()}-${index + 1}`,
      source: req.source,
      sourceId: req.sourceId,
      text: req.text,
      category: req.category,
      priority: req.priority,
    }));

    console.log(`[LLM Requirement Extraction] Extracted ${requirements.length} requirements`);
    
    return requirements;
  } catch (error) {
    console.error("[LLM Requirement Extraction] Error:", error);
    throw new Error(
      `Failed to extract requirements: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Call Gemini for requirement extraction
 */
async function callGeminiForExtraction(
  prompt: string,
  apiKey: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const env = process.env;
  const modelName = env.GEMINI_MODEL || "gemini-2.5-flash";

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2, // Lower temperature for more consistent extraction
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 16000, // Increased for large Confluence content
    },
  });

  console.log(`[Gemini Extraction] Using model: ${modelName}`);

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

/**
 * Call OpenAI for requirement extraction
 */
async function callOpenAIForExtraction(
  prompt: string,
  apiKey: string
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a QA analyst. Extract individual atomic requirements from documentation. Return responses as valid JSON only, without markdown formatting.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
    max_tokens: 16000, // Increased for large Confluence content
  });

  return completion.choices[0]?.message?.content || "";
}

/**
 * Call Anthropic Claude for requirement extraction
 */
async function callAnthropicForExtraction(
  prompt: string,
  apiKey: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const env = process.env;
  const modelName = env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

  console.log(`[Anthropic Extraction] Using model: ${modelName}`);

  const message = await anthropic.messages.create({
    model: modelName,
    max_tokens: 16000, // Increased for large Confluence content
    temperature: 0.2, // Lower temperature for more consistent extraction
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseContent = message.content[0];
  if (responseContent.type === "text") {
    return responseContent.text;
  }

  return "";
}

/**
 * Parse and validate LLM extraction response
 */
function parseExtractionResponse(responseText: string): z.infer<typeof RequirementExtractionSchema> {
  // Clean the response (remove markdown code blocks if present)
  let cleaned = responseText.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  // Try to find JSON in the response
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  try {
    const parsed = JSON.parse(cleaned);
    const validated = RequirementExtractionSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error("[LLM Extraction] Parse error:", error);
    console.error("[LLM Extraction] Response length:", responseText.length);
    console.error("[LLM Extraction] Response (first 500 chars):", responseText.substring(0, 500));
    console.error("[LLM Extraction] Response (last 500 chars):", responseText.substring(Math.max(0, responseText.length - 500)));
    
    // Try to salvage partial valid JSON by finding the last complete requirement
    try {
      console.log("[LLM Extraction] Attempting to salvage partial response...");
      const salvaged = salvagePartialJSON(cleaned);
      if (salvaged && salvaged.requirements.length > 0) {
        console.log(`[LLM Extraction] Successfully salvaged ${salvaged.requirements.length} requirements from partial response`);
        return salvaged;
      }
    } catch (salvageError) {
      console.error("[LLM Extraction] Could not salvage partial response:", salvageError);
    }
    
    throw new Error(`Failed to parse LLM extraction response: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Attempt to salvage valid requirements from truncated/malformed JSON
 */
function salvagePartialJSON(json: string): z.infer<typeof RequirementExtractionSchema> | null {
  try {
    // Find the requirements array
    const requirementsMatch = json.match(/"requirements"\s*:\s*\[/);
    if (!requirementsMatch) {
      return null;
    }

    const arrayStart = requirementsMatch.index! + requirementsMatch[0].length;
    const content = json.substring(arrayStart);
    
    const requirements: any[] = [];
    let depth = 0;
    let currentObj = "";
    let inString = false;
    let escape = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (escape) {
        currentObj += char;
        escape = false;
        continue;
      }
      
      if (char === "\\") {
        escape = true;
        currentObj += char;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        currentObj += char;
        continue;
      }
      
      if (!inString) {
        if (char === "{") {
          if (depth === 0) {
            currentObj = "{";
          } else {
            currentObj += char;
          }
          depth++;
        } else if (char === "}") {
          currentObj += char;
          depth--;
          
          if (depth === 0) {
            // Try to parse this complete object
            try {
              const obj = JSON.parse(currentObj);
              if (obj.text && obj.source && obj.category && obj.priority) {
                requirements.push(obj);
              }
            } catch (e) {
              // Skip invalid object
            }
            currentObj = "";
          }
        } else if (depth > 0) {
          currentObj += char;
        }
      } else {
        currentObj += char;
      }
    }
    
    if (requirements.length > 0) {
      const result = { requirements };
      const validated = RequirementExtractionSchema.parse(result);
      return validated;
    }
    
    return null;
  } catch (error) {
    console.error("[Salvage] Error:", error);
    return null;
  }
}

