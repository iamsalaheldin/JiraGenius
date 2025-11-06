import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { TestCase, TestCaseSchema, ModelConfig } from "./schemas";
import { z } from "zod";

export interface GenerateTestCasesParams {
  storyTitle: string;
  description: string;
  acceptanceCriteria?: string;
  additionalContext?: string;
  modelConfig: ModelConfig;
  provider?: string;
  existingTestCases?: TestCase[];
}

interface LLMResponse {
  testCases?: TestCase[];
  error?: string;
}

/**
 * Generate test cases using the configured LLM
 */
export async function generateTestCases(
  params: GenerateTestCasesParams,
  apiKey: string
): Promise<LLMResponse> {
  const provider = params.provider || process.env.LLM_PROVIDER || "gemini";
  
  console.log(`[LLM] Generating test cases using ${provider}`);
  
  const prompt = buildPrompt(params);
  
  try {
    let responseText: string;
    
    switch (provider) {
      case "gemini":
        responseText = await callGemini(prompt, apiKey, params.modelConfig);
        break;
      case "openai":
        responseText = await callOpenAI(prompt, apiKey, params.modelConfig);
        break;
      case "anthropic":
        responseText = await callAnthropic(prompt, apiKey, params.modelConfig);
        break;
      default:
        return { error: `Unknown LLM provider: ${provider}` };
    }
    
    // Parse and validate the response
    const result = await parseAndValidateResponse(responseText);
    
    if (result.error) {
      console.log("[LLM] First attempt failed, retrying with reformatting instruction");
      // Retry once with a reformatting instruction
      const retryPrompt = `${prompt}\n\nYour previous response was not valid JSON. Please ensure you return ONLY valid JSON matching the schema, with no additional text or markdown formatting.`;
      
      try {
        let retryResponse: string;
        switch (provider) {
          case "gemini":
            retryResponse = await callGemini(retryPrompt, apiKey, params.modelConfig);
            break;
          case "openai":
            retryResponse = await callOpenAI(retryPrompt, apiKey, params.modelConfig);
            break;
          case "anthropic":
            retryResponse = await callAnthropic(retryPrompt, apiKey, params.modelConfig);
            break;
          default:
            return { error: `Unknown LLM provider: ${provider}` };
        }
        
        const retryResult = await parseAndValidateResponse(retryResponse);
        if (retryResult.error) {
          return { error: `Failed to generate valid test cases after retry: ${retryResult.error}` };
        }
        return { testCases: retryResult.testCases };
      } catch (retryError) {
        console.error("[LLM] Retry error:", retryError);
        return { error: "Failed to generate valid test cases after retry" };
      }
    }
    
    return { testCases: result.testCases };
  } catch (error) {
    console.error("[LLM] Generation error:", error);
    return { error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Build the prompt for test case generation
 */
function buildPrompt(params: GenerateTestCasesParams): string {
  const { storyTitle, description, acceptanceCriteria, additionalContext, existingTestCases } = params;
  
  const existingTestCasesSection = existingTestCases && existingTestCases.length > 0
    ? `\n\nIMPORTANT: The following test cases have already been generated. Please generate ADDITIONAL test cases that are DIFFERENT from these existing ones. Focus on scenarios that haven't been covered yet:\n\n${JSON.stringify(existingTestCases, null, 2)}\n\nGenerate NEW test cases that complement the existing ones. Do not duplicate or repeat the existing test cases.`
    : "";
  
  const additionalContextSection = additionalContext && additionalContext.trim()
    ? `\n\nAdditional Context from Attached Files:\n${additionalContext}\n\nUse this additional context to better understand the requirements, technical specifications, or related documentation that may help in creating more comprehensive and accurate test cases.`
    : "";
  
  return `You are a QA engineer creating structured test cases for a user story.

User Story: ${storyTitle}

Description:
${description}

${acceptanceCriteria ? `Acceptance Criteria:\n${acceptanceCriteria}\n` : ""}${additionalContextSection}${existingTestCasesSection}

Analyze the user story thoroughly and generate comprehensive test cases that cover all possible scenarios. Create detailed test cases with multiple steps and thorough validation for:
- Happy path scenarios
- Edge cases and boundary conditions
- Error conditions and negative test cases
- All acceptance criteria
- Any implicit requirements or dependencies

Return your response as a valid JSON array matching this exact schema:

{
  "testCases": [
    {
      "id": "string (e.g., 'TC-1', 'TC-2', etc.)",
      "title": "string (clear, descriptive test case title)",
      "preconditions": "string (optional, can be empty string)",
      "steps": [
        {
          "id": "string (e.g., 'step-1', 'step-2', etc.)",
          "action": "string (the action to perform)",
          "expectedResult": "string (the expected outcome)"
        }
      ],
      "priority": "low" | "medium" | "high"
    }
  ]
}

Important:
- Return ONLY valid JSON, no markdown code blocks or additional text
- Generate comprehensive test cases covering ALL possible scenarios for the user story
- Determine the appropriate number of test cases based on the complexity and requirements
- Each test case must have at least 1 step with clear actions and expected results
- Ensure all IDs are unique${existingTestCases && existingTestCases.length > 0 ? " and different from existing test case IDs" : ""}
- Make test cases specific, detailed, and thorough
- Include preconditions where applicable
- Set appropriate priority levels (low, medium, high) based on test case importance
- Generate as many test cases as needed to ensure complete coverage of all scenarios${existingTestCases && existingTestCases.length > 0 ? "\n- Focus on generating NEW test cases that cover different scenarios than the existing ones" : ""}`;
}

/**
 * Call Google Gemini API
 */
async function callGemini(
  prompt: string,
  apiKey: string,
  config: ModelConfig
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  });
  
  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  prompt: string,
  apiKey: string,
  config: ModelConfig
): Promise<string> {
  const openai = new OpenAI({ apiKey });
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a QA engineer. Return responses as valid JSON only, without markdown formatting."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 4096,
  });
  
  return completion.choices[0]?.message?.content || "";
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(
  prompt: string,
  apiKey: string,
  config: ModelConfig
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
  });
  
  const content = message.content[0];
  if (content.type === "text") {
    return content.text;
  }
  
  return "";
}

/**
 * Parse and validate the LLM response
 */
async function parseAndValidateResponse(responseText: string): Promise<LLMResponse> {
  try {
    // Clean up the response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    
    // Remove markdown code blocks
    const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleanedResponse = codeBlockMatch[1].trim();
    }
    
    // Parse JSON
    const parsed = JSON.parse(cleanedResponse);
    
    // Handle both direct array and object with testCases property
    const testCasesArray = Array.isArray(parsed) ? parsed : parsed.testCases;
    
    if (!testCasesArray) {
      return { error: "Response does not contain testCases array" };
    }
    
    // Validate each test case
    const TestCasesArraySchema = z.array(TestCaseSchema);
    const validation = TestCasesArraySchema.safeParse(testCasesArray);
    
    if (!validation.success) {
      console.error("[LLM] Validation error:", validation.error.flatten());
      return { error: "Invalid test case format: " + JSON.stringify(validation.error.flatten().fieldErrors) };
    }
    
    return { testCases: validation.data };
  } catch (error) {
    console.error("[LLM] Parse error:", error);
    return { error: error instanceof Error ? error.message : "Failed to parse response" };
  }
}

