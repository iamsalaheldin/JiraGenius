import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { TestCase, TestCaseSchema, ModelConfig, Requirement, ImageData } from "./schemas";
import { z } from "zod";

export interface GenerateTestCasesParams {
  storyTitle: string;
  description: string;
  acceptanceCriteria?: string;
  additionalContext?: string;
  images?: ImageData[];
  modelConfig: ModelConfig;
  provider?: string;
  existingTestCases?: TestCase[];
  requirements?: Requirement[];
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
  const provider = params.provider || process.env.LLM_PROVIDER || "anthropic";
  
  console.log(`[LLM] Generating test cases using ${provider}`);
  
  const prompt = buildPrompt(params);
  
  try {
    let responseText: string;
    
    switch (provider) {
      case "gemini":
        responseText = await callGemini(prompt, apiKey, params.modelConfig, params.images);
        break;
      case "openai":
        responseText = await callOpenAI(prompt, apiKey, params.modelConfig, params.images);
        break;
      case "anthropic":
        responseText = await callAnthropic(prompt, apiKey, params.modelConfig, params.images);
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
              retryResponse = await callGemini(retryPrompt, apiKey, params.modelConfig, params.images);
              break;
            case "openai":
              retryResponse = await callOpenAI(retryPrompt, apiKey, params.modelConfig, params.images);
              break;
            case "anthropic":
              retryResponse = await callAnthropic(retryPrompt, apiKey, params.modelConfig, params.images);
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
  const { storyTitle, description, acceptanceCriteria, additionalContext, existingTestCases, requirements } = params;
  
  const existingTestCasesSection = existingTestCases && existingTestCases.length > 0
    ? `\n\nIMPORTANT: The following test cases have already been generated. Please generate ADDITIONAL test cases that are DIFFERENT from these existing ones. Focus on scenarios that haven't been covered yet:\n\n${JSON.stringify(existingTestCases, null, 2)}\n\nGenerate NEW test cases that complement the existing ones. Do not duplicate or repeat the existing test cases.`
    : "";

  const requirementsSection = requirements && requirements.length > 0
    ? `\n\n⚠️ CRITICAL REQUIREMENTS TO COVER:\n\nThe following requirements have been extracted and MUST be covered by the generated test cases. You must generate AT LEAST ${requirements.length} test cases to ensure complete test coverage. Each requirement may need multiple test cases to cover all aspects (positive, negative, edge cases, data flow, etc.):\n\n${requirements.map((req, idx) => {
        const sourceLabel = req.source === "user_story" ? "User Story" 
          : req.source === "acceptance_criteria" ? "Acceptance Criteria"
          : req.source === "file" ? "File"
          : "Confluence";
        return `${idx + 1}. [${req.id}] (${sourceLabel} - ${req.category} - ${req.priority} priority)\n   ${req.text}`;
      }).join("\n\n")}\n\n🎯 MANDATORY RULES FOR TEST CASE GENERATION:\n\n1. ONE REQUIREMENT PER TEST CASE (STRICTLY ENFORCED):\n   - Each test case MUST validate ONLY ONE requirement - no exceptions\n   - The requirementIds array MUST contain EXACTLY ONE requirement ID (e.g., ["REQ-123"])\n   - DO NOT combine multiple requirements into a single test case\n   - DO NOT create test cases that validate multiple requirements simultaneously\n   - A single requirement may need MULTIPLE test cases to comprehensively cover all scenarios (positive, negative, edge cases, data flow, etc.)\n   - Each test case for a requirement should focus on a different aspect or scenario, but all should validate the same requirement\n   - Ensure ALL requirements are covered - each requirement must have at least one test case\n\n2. TEST CASE INDEPENDENCE (CRITICAL):\n   - Each test case MUST be completely independent and self-contained\n   - Test cases MUST NOT depend on the execution or results of other test cases\n   - Preconditions MUST NOT reference other test cases (e.g., "After TC-1 is executed")\n   - Preconditions should only describe system state, not test execution dependencies\n   - Each test case MUST be executable in isolation without requiring other test cases to run first\n   - Test cases can share common preconditions (like "User is logged in"), but must not depend on each other's execution\n\n3. SINGLE SCOPE PER TEST CASE:\n   - Each test case MUST have ONE clear, focused scope\n   - The test case title and steps MUST focus on validating a single, specific aspect\n   - Avoid creating test cases that test multiple features or behaviors\n   - If a requirement has multiple aspects, create separate test cases for each aspect, each linked to the same requirement ID\n\n4. COVERAGE REQUIREMENTS:\n   - Generate AT LEAST ${requirements.length} test cases (minimum one per requirement)\n   - Each requirement should have comprehensive coverage through multiple test cases when needed\n   - Prioritize test cases based on requirement priority (high priority requirements need high priority test cases)\n   - Each test case must thoroughly validate its assigned requirement\n\n`
    : "";
  
  const independenceSection = requirements && requirements.length > 0
    ? `\n\n🔒 TEST CASE INDEPENDENCE REQUIREMENTS:\n\nEach test case you generate MUST be:\n- **Self-contained**: Can be executed independently without relying on other test cases\n- **Isolated**: Does not assume that another test case has already run\n- **Complete**: Contains all necessary preconditions within itself (not referencing other test cases)\n- **Focused**: Validates only ONE requirement with a single, clear scope\n\nBAD EXAMPLE (DO NOT DO THIS):\n- Test Case 1: "Create user account"\n- Test Case 2: "Login with user created in Test Case 1" ❌ (depends on Test Case 1)\n\nGOOD EXAMPLE (DO THIS):\n- Test Case 1: "Create user account" (precondition: none, validates requirement REQ-1)\n- Test Case 2: "Login with valid credentials" (precondition: "User account exists in system", validates requirement REQ-2) ✅ (independent)\n\nRemember: Preconditions describe SYSTEM STATE, not TEST EXECUTION DEPENDENCIES.\n\n`
    : "";

  // Check for data dictionary in additionalContext
  const hasDataDictionary = additionalContext && (
    additionalContext.toLowerCase().includes("data dictionary") ||
    additionalContext.toLowerCase().includes("field definition") ||
    additionalContext.toLowerCase().includes("validation rule") ||
    additionalContext.match(/\b(field|column|attribute|property)\s*(name|type|format|validation|required|optional)/i) !== null ||
    additionalContext.match(/\b(data\s*type|format|pattern|constraint|rule)\s*:/i) !== null
  );

  const comprehensiveGuidelinesSection = `\n\n📋 COMPREHENSIVE TEST CASE GENERATION GUIDELINES:\n\nGenerate test cases following these guidelines to ensure thorough coverage:\n\n1. SEPARATE TEST CONDITIONS:\n   - Create separate test cases for each test condition\n   - Never combine multiple test conditions in a single test case\n   - Each test case should focus on verifying exactly ONE condition or scenario\n   - If a requirement has multiple conditions, create separate test cases for each condition (all linked to the same requirement ID)\n\n${hasDataDictionary ? `2. DATA DICTIONARY COVERAGE:\n   - A data dictionary has been detected in the provided context\n   - Create test cases for EVERY item/field in the dictionary\n   - For each data field, create tests that verify:\n     * Valid inputs are accepted\n     * Invalid inputs are rejected with appropriate messages\n     * Required fields cannot be empty\n     * Optional fields can be left empty\n     * Field-specific validations work as expected\n   - Each field validation should be a separate test case\n   - Link test cases to the relevant requirement ID(s)\n\n` : `2. DATA DICTIONARY COVERAGE:\n   - If a data dictionary is provided in the context, create test cases for EVERY item in the dictionary\n   - For each data field, create tests that verify:\n     * Valid inputs are accepted\n     * Invalid inputs are rejected with appropriate messages\n     * Required fields cannot be empty\n     * Optional fields can be left empty\n     * Field-specific validations work as expected\n   - Each field validation should be a separate test case\n\n`}3. POSITIVE TEST CASES:\n   - Verify the core functionality works as expected under normal conditions\n   - Include at least 3-5 positive test cases that validate primary user flows\n   - Cover all acceptance criteria with at least one positive test case\n   - Test each valid input scenario separately\n   - Each positive test case should validate ONE requirement\n   - Create separate test cases for different positive scenarios (e.g., different valid inputs)\n\n4. NEGATIVE TEST CASES:\n   - Include scenarios where inputs are invalid, missing, or unexpected\n   - Create SEPARATE test cases for each type of invalid input\n   - Test error handling and validation mechanisms\n   - Verify appropriate error messages are displayed when failures occur\n   - Include at least 3-5 negative test cases\n   - Each negative test case should validate ONE requirement\n   - Create separate test cases for different error scenarios (e.g., invalid format, missing required field, out of range)\n\n5. EDGE CASES:\n   - Test boundary conditions (min/max values, empty sets, etc.)\n   - Include scenarios with unexpected user behavior\n   - Test performance under special circumstances (e.g., large data sets)\n   - Include at least 2-3 edge cases\n   - Create separate test cases for each boundary condition\n   - Each edge case test should validate ONE requirement\n   - Examples: minimum value, maximum value, empty string, null value, special characters\n\n6. DATA FLOW TESTING:\n   - Verify how data moves through the system from input to storage and output\n   - Create test cases that track data through the entire system workflow\n   - Verify data integrity is maintained throughout the process\n   - Test data transformations between different system components\n   - Test data persistence and retrieval operations\n   - Include at least 3-4 data flow test cases\n   - Each data flow test case should validate ONE requirement\n   - Create separate test cases for different data flow paths\n\n7. INTEGRATION POINTS:\n   - Test how the feature interacts with other components or systems\n   - Verify data flow between integrated components\n   - Include at least 1-2 integration test cases if applicable\n   - Each integration test case should validate ONE requirement\n   - Create separate test cases for different integration scenarios\n\nIMPORTANT NOTES:\n- All test cases must still follow the independence and single-scope rules\n- Each test case validates ONE requirement (indicated by requirementIds array)\n- A requirement can have multiple test cases covering different aspects (positive, negative, edge, data flow, etc.)\n- Ensure comprehensive coverage by applying all applicable guideline categories to each requirement\n`;
  
  const additionalContextSection = additionalContext && additionalContext.trim()
    ? (() => {
        // Check if Confluence content is present
        const hasConfluenceContent = additionalContext.includes("--- Confluence Page ---");
        const confluenceInstruction = hasConfluenceContent
          ? `\n\n⚠️ CRITICAL: The following section contains IMPORTANT information from a Confluence page that MUST be used to create test cases. This Confluence content contains detailed specifications, API documentation, integration flows, or technical requirements that are ESSENTIAL for comprehensive test case generation.\n\n`
          : "";
        
        return `\n\n${confluenceInstruction}Additional Context from Attached Files and Confluence Pages:\n${additionalContext}\n\n${hasConfluenceContent 
          ? `IMPORTANT INSTRUCTIONS FOR CONFLUENCE CONTENT:\n- You MUST analyze the Confluence page content above and create test cases that specifically cover the scenarios, APIs, flows, and requirements described in it\n- The Confluence content may contain:\n  * API endpoints and request/response formats\n  * Integration flows and process steps\n  * Technical specifications and requirements\n  * Error handling scenarios\n  * Data validation rules\n- Create test cases that validate these Confluence specifications\n- If the content mentions "[Image]" or "[Attachment: filename]", these refer to images or attachments in the original Confluence page that are described in the text content\n- DO NOT ignore the Confluence content - it contains critical information for test case generation\n\n`
          : `Use this additional context to better understand the requirements, technical specifications, or related documentation that may help in creating more comprehensive and accurate test cases. Note: If the content mentions "[Image]" or "[Attachment: filename]", these refer to images or attachments in the original Confluence page that are described in the text content.\n\n`}`;
      })()
    : "";
  
  return `You are a QA engineer creating structured test cases for a user story.

User Story: ${storyTitle}

Description:
${description}

${acceptanceCriteria ? `Acceptance Criteria:\n${acceptanceCriteria}\n` : ""}${requirementsSection}${independenceSection}${comprehensiveGuidelinesSection}${additionalContextSection}${existingTestCasesSection}

Analyze the user story thoroughly${additionalContext && additionalContext.includes("--- Confluence Page ---") ? " AND the Confluence page content" : ""}${requirements && requirements.length > 0 ? " AND the requirements listed above" : ""} and generate comprehensive test cases following the COMPREHENSIVE TEST CASE GENERATION GUIDELINES provided above.

Apply the guidelines to ensure complete coverage:
- Follow the "Separate Test Conditions" guideline - create separate test cases for each condition
${hasDataDictionary ? "- Apply the \"Data Dictionary Coverage\" guideline - create test cases for every field detected in the data dictionary\n" : ""}- Apply the "Positive Test Cases" guideline - include at least 3-5 positive test cases covering primary user flows
- Apply the "Negative Test Cases" guideline - include at least 3-5 negative test cases for invalid inputs and error scenarios
- Apply the "Edge Cases" guideline - include at least 2-3 edge cases testing boundary conditions
- Apply the "Data Flow Testing" guideline - include at least 3-4 test cases tracking data through the system
- Apply the "Integration Points" guideline - include at least 1-2 integration test cases if applicable
- Cover all acceptance criteria${requirements && requirements.length > 0 ? "\n- **ALL requirements listed above (CRITICAL - each requirement must have at least one test case, and may need multiple to cover all guideline categories)**" : ""}
- Cover any implicit requirements or dependencies${additionalContext && additionalContext.includes("--- Confluence Page ---") ? "\n- **ALL scenarios, APIs, flows, and requirements described in the Confluence page content above**" : ""}

Remember: Each test case must validate ONE requirement, but a requirement can have multiple test cases covering different aspects (positive, negative, edge cases, data flow, etc.).

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
      "priority": "low" | "medium" | "high",
      "requirementIds": "array of strings (optional, can be empty array [])"
    }
  ]
}

Important:
- Return ONLY valid JSON, no markdown code blocks or additional text${requirements && requirements.length > 0 ? `\n- **MANDATORY: Generate AT LEAST ${requirements.length} test cases (minimum one per requirement, but may need more to cover all guideline categories)**` : "\n- Determine the appropriate number of test cases based on the complexity and requirements, following the Comprehensive Test Case Generation Guidelines"}
- Follow the COMPREHENSIVE TEST CASE GENERATION GUIDELINES provided above to ensure thorough coverage
- Each test case must have at least 1 step with clear actions and expected results
- Ensure all IDs are unique${existingTestCases && existingTestCases.length > 0 ? " and different from existing test case IDs" : ""}
- Make test cases specific, detailed, and thorough
- Include preconditions where applicable (but preconditions must describe system state, not test execution dependencies)
- Set appropriate priority levels (low, medium, high) based on test case importance${requirements && requirements.length > 0 ? "\n- **MANDATORY: Each test case MUST validate ONLY ONE requirement**\n- **MANDATORY: The requirementIds array MUST contain EXACTLY ONE requirement ID (e.g., [\"REQ-123\"])**\n- **MANDATORY: DO NOT bundle multiple requirements into a single test case**\n- **MANDATORY: Each test case MUST be independent and executable in isolation**\n- **MANDATORY: Test cases MUST NOT depend on each other's execution**\n- **MANDATORY: Each test case MUST have a single, focused scope**\n- **MANDATORY: Apply all applicable guideline categories (positive, negative, edge cases, data flow, integration) to ensure comprehensive coverage**" : "\n- Generate as many test cases as needed to ensure complete coverage of all scenarios, following the Comprehensive Test Case Generation Guidelines"}${existingTestCases && existingTestCases.length > 0 ? "\n- Focus on generating NEW test cases that cover different scenarios than the existing ones" : ""}
- The requirementIds field should contain exactly ONE requirement ID that the test case validates. If no requirements are provided, it can be an empty array [].`;
}

/**
 * Call Google Gemini API
 */
async function callGemini(
  prompt: string,
  apiKey: string,
  config: ModelConfig,
  images?: ImageData[]
): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Get model name from environment variable if specified, otherwise use gemini-2.5-flash
    const env = process.env;
    const modelName = env.GEMINI_MODEL || "gemini-2.5-flash"; // Default to gemini-2.5-flash
    
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        // No maxOutputTokens limit - use model's maximum capacity
      },
    });
    
    console.log(`[Gemini] Using model: ${modelName}`);
  
  // If no images, just pass the prompt as a string
  if (!images || images.length === 0) {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }
  
  // Build content array with images and text
  // Each part must be either text OR inlineData, not both
  const contentParts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
  
  // Add images first
  for (const image of images) {
    contentParts.push({
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType,
      },
    });
  }
  
  // Add text prompt as a separate part
  contentParts.push({ text: prompt });
  
    const result = await model.generateContent(contentParts);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("[Gemini] API Error:", error);
    if (error instanceof Error) {
      // Provide more helpful error messages
      if (error.message.includes("500")) {
        throw new Error("Gemini API internal error. This might be due to invalid content format or model issues. Please try again.");
      }
      if (error.message.includes("404") && error.message.includes("model")) {
        // If model not found, suggest checking available models or using a different provider
        const suggestion = images && images.length > 0
          ? "The vision model may not be available with your API key. Try using OpenAI or Anthropic providers which have better vision support, or check your Gemini API key permissions."
          : "The model may not be available with your API key. Try using 'gemini-pro' or check your API key permissions at https://aistudio.google.com/app/apikey";
        throw new Error(`Gemini model not found: ${error.message}. ${suggestion}`);
      }
      if (error.message.includes("model")) {
        throw new Error(`Gemini model error: ${error.message}. Please check if the model name is correct.`);
      }
      throw new Error(`Gemini API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  prompt: string,
  apiKey: string,
  config: ModelConfig,
  images?: ImageData[]
): Promise<string> {
  const openai = new OpenAI({ apiKey });
  
  // Build content array with text and images
  const content: Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }> = [];
  
  // Add images first if available
  if (images && images.length > 0) {
    for (const image of images) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${image.mimeType};base64,${image.base64}`,
        },
      });
    }
  }
  
  // Add text prompt
  content.push({
    type: "text",
    text: prompt,
  });
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a QA engineer. Return responses as valid JSON only, without markdown formatting."
      },
      {
        role: "user",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- OpenAI SDK accepts mixed content array
        content: content as any,
      }
    ],
    temperature: 0.3,
    // No max_tokens limit - use model's maximum capacity
  });
  
  return completion.choices[0]?.message?.content || "";
}

/**
 * Call Anthropic Claude API with streaming support for long responses
 */
async function callAnthropic(
  prompt: string,
  apiKey: string,
  config: ModelConfig,
  images?: ImageData[]
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  
  // Get model name from environment variable if specified, otherwise use claude-sonnet-4-5-20250929
  const env = process.env;
  const modelName = env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929"; // Default to claude-sonnet-4-5-20250929
  
  console.log(`[Anthropic] Using model: ${modelName}`);
  
  // Build content array with text and images
  const content: Array<{ type: "text" | "image"; text?: string; source?: { type: string; media_type: string; data: string } }> = [];
  
  // Add images first if available
  if (images && images.length > 0) {
    for (const image of images) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mimeType,
          data: image.base64,
        },
      });
    }
  }
  
  // Add text prompt
  content.push({
    type: "text",
    text: prompt,
  });
  
  // Use streaming to handle long responses (required for operations > 10 minutes)
  let fullResponse = "";
  
  const stream = anthropic.messages.stream({
    model: modelName,
    max_tokens: 64000, // Maximum allowed for Claude Sonnet 4.5 (required parameter)
    temperature: 0.3,
    messages: [
      {
        role: "user",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Anthropic SDK accepts mixed content array
        content: content as any,
      }
    ],
  });
  
  // Collect all text chunks from the stream
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullResponse += event.delta.text;
    }
  }
  
  return fullResponse;
}

/**
 * Extract JSON from markdown code blocks and other text
 */
function extractJSON(text: string): string {
  let cleaned = text.trim();
  
  // Remove markdown code blocks - handle multiple patterns
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  
  // Remove any remaining backticks at start/end
  cleaned = cleaned.replace(/^`+/g, '');
  cleaned = cleaned.replace(/`+$/g, '');
  cleaned = cleaned.trim();
  
  // Try to find JSON object/array boundaries
  // Look for the first { or [ and try to find matching closing brace/bracket
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  let startPos = -1;
  let endPos = -1;
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    // Object format - find matching closing brace
    startPos = firstBrace;
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = firstBrace; i < cleaned.length; i++) {
      const char = cleaned[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') depth++;
        if (char === '}') {
          depth--;
          if (depth === 0) {
            endPos = i;
            break;
          }
        }
      }
    }
  } else if (firstBracket !== -1) {
    // Array format - find matching closing bracket
    startPos = firstBracket;
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = firstBracket; i < cleaned.length; i++) {
      const char = cleaned[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '[') depth++;
        if (char === ']') {
          depth--;
          if (depth === 0) {
            endPos = i;
            break;
          }
        }
      }
    }
  }
  
  if (startPos !== -1 && endPos !== -1) {
    return cleaned.substring(startPos, endPos + 1);
  }
  
  // Fallback: use simple substring method
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  
  if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    return cleaned.substring(firstBracket, lastBracket + 1);
  }
  
  return cleaned;
}

/**
 * Extract valid test cases from truncated or malformed JSON
 */
function extractValidTestCases(json: string): TestCase[] | null {
  try {
    const testCases: TestCase[] = [];
    
    // Strategy: Find the testCases array and extract complete objects from it
    // Look for the testCases array
    const arrayStart = json.indexOf('"testCases"');
    if (arrayStart === -1) {
      // Try without quotes
      const altStart = json.indexOf('testCases');
      if (altStart === -1) {
        return null;
      }
    }
    
    // Find the opening bracket of the array
    const searchStart = arrayStart !== -1 ? arrayStart : json.indexOf('testCases');
    const afterLabel = json.substring(searchStart);
    const bracketStart = afterLabel.indexOf('[');
    
    if (bracketStart === -1) {
      return null;
    }
    
    const arrayContent = afterLabel.substring(bracketStart + 1);
    
    // Extract complete test case objects from the array
    // We need to track brace/bracket depth to find complete objects
    let braceCount = 0;
    let bracketCount = 0; // For nested arrays (steps)
    let currentObj = '';
    let inString = false;
    let escapeNext = false;
    let objStartPos = -1;
    
    for (let i = 0; i < arrayContent.length; i++) {
      const char = arrayContent[i];
      
      if (escapeNext) {
        escapeNext = false;
        if (objStartPos !== -1) currentObj += char;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        if (objStartPos !== -1) currentObj += char;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        if (objStartPos !== -1) currentObj += char;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          if (braceCount === 0) {
            // Start of a new object
            objStartPos = i;
            currentObj = '{';
          } else {
            currentObj += char;
          }
          braceCount++;
        } else if (char === '}') {
          currentObj += char;
          braceCount--;
          
          if (braceCount === 0 && bracketCount === 0) {
            // We have a complete test case object
            try {
              const obj = JSON.parse(currentObj);
              if (obj.id && obj.title && obj.priority) {
                // Ensure required fields exist
                if (!obj.steps || !Array.isArray(obj.steps)) {
                  obj.steps = [];
                }
                if (obj.preconditions === undefined || obj.preconditions === null) {
                  obj.preconditions = "";
                }
                testCases.push(obj as TestCase);
              }
            } catch {
              // Skip invalid object, but continue trying
            }
            currentObj = '';
            objStartPos = -1;
          }
        } else if (char === '[') {
          bracketCount++;
          if (objStartPos !== -1) currentObj += char;
        } else if (char === ']') {
          bracketCount--;
          if (objStartPos !== -1) currentObj += char;
        } else if (objStartPos !== -1) {
          currentObj += char;
        }
      } else {
        // Inside a string
        if (objStartPos !== -1) currentObj += char;
      }
    }
    
    // If we have an incomplete object at the end, try to close it and parse
    if (currentObj && braceCount > 0) {
      // Try to close the incomplete object
      while (braceCount > 0) {
        currentObj += '}';
        braceCount--;
      }
      while (bracketCount > 0) {
        currentObj += ']';
        bracketCount--;
      }
      
      try {
        const obj = JSON.parse(currentObj);
        if (obj.id && obj.title && obj.priority) {
          if (!obj.steps || !Array.isArray(obj.steps)) {
            obj.steps = [];
          }
          if (obj.preconditions === undefined || obj.preconditions === null) {
            obj.preconditions = "";
          }
          testCases.push(obj as TestCase);
        }
      } catch {
        // Last object was too incomplete
      }
    }
    
    return testCases.length > 0 ? testCases : null;
  } catch (e) {
    console.error("[LLM] Error extracting test cases:", e);
    return null;
  }
}

/**
 * Attempt to repair common JSON issues and handle truncation
 */
function repairJSON(json: string): string {
  let repaired = json.trim();
  
  // Track state while parsing
  let inString = false;
  let escapeNext = false;
  let lastValidPos = -1;
  let braceDepth = 0;
  let bracketDepth = 0;
  
  // First pass: find where we are in the JSON structure
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        if (braceDepth === 0 && bracketDepth === 0) {
          lastValidPos = i;
        }
      } else if (char === '[') {
        bracketDepth++;
      } else if (char === ']') {
        bracketDepth--;
        if (braceDepth === 0 && bracketDepth === 0) {
          lastValidPos = i;
        }
      }
    }
  }
  
  // If we're in a string at the end, try to close it intelligently
  if (inString) {
    // Find a safe place to close the string
    // Look backwards from the end for common patterns
    const lastQuote = repaired.lastIndexOf('"');
    if (lastQuote !== -1) {
      // Check if we're in a value (after a colon)
      const beforeQuote = repaired.substring(Math.max(0, lastQuote - 50), lastQuote);
      if (beforeQuote.includes(':') && !beforeQuote.match(/:\s*"[^"]*$/)) {
        // We're likely in a string value, close it
        repaired = repaired.substring(0, repaired.length) + '"';
        inString = false;
      }
    } else {
      // No quote found, we're definitely in an unclosed string
      // Try to find where the string should end
      const lastColon = repaired.lastIndexOf(':');
      if (lastColon !== -1) {
        // We're probably in a value, close the string
        repaired += '"';
        inString = false;
      }
    }
  }
  
  // If we're still in a string, try a different approach
  if (inString) {
    // Remove everything after the last complete object/array
    if (lastValidPos > 0) {
      repaired = repaired.substring(0, lastValidPos + 1);
    } else {
      // Desperate: just close the string
      repaired += '"';
    }
  }
  
  // Now try to close incomplete structures
  // Count braces and brackets properly (ignoring those in strings)
  braceDepth = 0;
  bracketDepth = 0;
  inString = false;
  escapeNext = false;
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;
    }
  }
  
  // Remove trailing commas before closing structures
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  repaired = repaired.replace(/,\s*$/, ''); // Remove trailing comma at end
  
  // Close incomplete structures
  // Close objects first (they're nested inside arrays)
  while (braceDepth > 0) {
    repaired += '}';
    braceDepth--;
  }
  
  // Then close arrays
  while (bracketDepth > 0) {
    repaired += ']';
    bracketDepth--;
  }
  
  // Final cleanup: remove any trailing incomplete structures
  // If we end with incomplete JSON, try to find the last complete test case
  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    // If still invalid, try to extract valid portion
    // Look for the last complete test case object
    const testCaseMatches = repaired.match(/\{"id"\s*:\s*"[^"]+",[^}]*"priority"\s*:\s*"[^"]+"\s*\}/g);
    if (testCaseMatches && testCaseMatches.length > 0) {
      // Reconstruct with only complete test cases
      const testCasesStr = testCaseMatches.map(m => m.trim()).join(',\n    ');
      return `{\n  "testCases": [\n    ${testCasesStr}\n  ]\n}`;
    }
  }
  
  return repaired;
}

/**
 * Parse and validate the LLM response
 */
async function parseAndValidateResponse(responseText: string): Promise<LLMResponse> {
  try {
    if (!responseText || !responseText.trim()) {
      console.error("[LLM] Empty response received");
      return { error: "Empty response from LLM" };
    }
    
    // Extract JSON from the response
    const cleanedResponse = extractJSON(responseText);
    
    if (!cleanedResponse) {
      console.error("[LLM] Empty response after cleaning. Original:", responseText.substring(0, 200));
      return { error: "Empty response after cleaning" };
    }
    
    // Log cleaned response for debugging (first 500 chars)
    if (cleanedResponse.length > 500) {
      console.log("[LLM] Cleaned response preview:", cleanedResponse.substring(0, 500) + "...");
    } else {
      console.log("[LLM] Cleaned response:", cleanedResponse);
    }
    
    // Try parsing the JSON
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON.parse returns unknown, but we validate with Zod
    let parsed: any;
    try {
      parsed = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // If parsing fails, try to repair the JSON
      console.log("[LLM] Initial parse failed, attempting to repair JSON...");
      const repaired = repairJSON(cleanedResponse);
      
      try {
        parsed = JSON.parse(repaired);
        console.log("[LLM] Successfully repaired and parsed JSON");
      } catch {
        // If repair also fails, try to extract valid test cases as a last resort
        console.log("[LLM] Repair failed, attempting to extract valid test cases from partial JSON...");
        const extracted = extractValidTestCases(cleanedResponse);
        
        if (extracted && extracted.length > 0) {
          console.log(`[LLM] Successfully extracted ${extracted.length} valid test cases from truncated response`);
          parsed = { testCases: extracted };
        } else {
          // If extraction also fails, log detailed error info
          const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
          const errorPos = errorMsg.match(/position (\d+)/);
          
          if (errorPos) {
            const pos = parseInt(errorPos[1]);
            const start = Math.max(0, pos - 100);
            const end = Math.min(cleanedResponse.length, pos + 100);
            console.error("[LLM] Parse error at position", pos);
            console.error("[LLM] Context around error:", cleanedResponse.substring(start, end));
          }
          
          console.error("[LLM] Parse error:", parseError);
          console.error("[LLM] Original response (first 1000 chars):", responseText.substring(0, 1000));
          return { 
            error: `Failed to parse JSON: ${errorMsg}. The response may be truncated or malformed.` 
          };
        }
      }
    }
    
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
    console.error("[LLM] Original response (first 1000 chars):", responseText.substring(0, 1000));
    return { error: error instanceof Error ? error.message : "Failed to parse response" };
  }
}

