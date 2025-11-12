/**
 * X-Ray Cloud API client functions
 * Server-side only - uses Node.js APIs like Buffer
 */

import { JiraAuth, TestCase } from "./schemas";
import { createAuthHeader } from "./jira-server";

export interface XRayTestStep {
  index: number;
  action: string;
  data?: string;
  result: string;
}

export interface XRayUploadResult {
  testCaseId: string;
  status: "uploaded" | "skipped" | "failed";
  testKey?: string; // e.g., "TEST-123"
  error?: string;
}

/**
 * Check if a test case with the same title already exists in the project
 */
export async function checkTestExists(
  title: string,
  projectKey: string,
  auth: JiraAuth
): Promise<{ exists: boolean; testKey?: string; error?: string }> {
  try {
    const cleanUrl = auth.baseUrl.replace(/\/$/, "");
    
    // Escape the title for JQL query
    const escapedTitle = title.replace(/"/g, '\\"');
    
    // Search for test cases with matching title in the project
    const jql = `project = ${projectKey} AND summary ~ "${escapedTitle}" AND issuetype = Test`;
    const encodedJql = encodeURIComponent(jql);
    
    const response = await fetch(
      `${cleanUrl}/rest/api/3/search?jql=${encodedJql}&maxResults=1`,
      {
        method: "GET",
        headers: {
          Authorization: createAuthHeader(auth.email, auth.apiToken),
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      // If search fails, assume test doesn't exist and proceed
      if (response.status === 400) {
        // Invalid JQL or project - log but don't fail
        console.warn("JQL search failed, proceeding with upload:", await response.text());
        return { exists: false };
      }
      return {
        exists: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    if (data.issues && data.issues.length > 0) {
      // Found a matching test case
      return {
        exists: true,
        testKey: data.issues[0].key,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error("Error checking for existing test:", error);
    // On error, assume test doesn't exist and proceed
    return {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extract project key from issue key (e.g., "PROJ-123" -> "PROJ")
 */
function extractProjectKey(issueKey: string): string {
  const match = issueKey.match(/^([A-Z]+)/);
  return match ? match[1] : issueKey.split("-")[0];
}

/**
 * Convert test steps to X-Ray format
 * X-Ray Cloud uses a custom field for test steps
 * The exact field ID varies, but we'll try to use the standard format
 */
function convertStepsToXRayFormat(steps: TestCase["steps"]): XRayTestStep[] {
  return steps.map((step, index) => ({
    index: index + 1,
    action: step.action,
    result: step.expectedResult,
  }));
}

/**
 * Create a test issue in Jira with X-Ray format
 * Attempts to discover the test steps field and include steps in the initial creation
 */
export async function createTest(
  testCase: TestCase,
  projectKey: string,
  auth: JiraAuth,
  labels?: string[]
): Promise<{ testKey?: string; error?: string }> {
  try {
    const cleanUrl = auth.baseUrl.replace(/\/$/, "");
    
    // Try to discover the test steps field BEFORE creating the issue
    const testStepsFieldId = await discoverTestStepsFieldIdFromCreateMeta(projectKey, auth);
    
    // Build description with preconditions and steps (as fallback)
    let description = "";
    if (testCase.preconditions) {
      description += `*Preconditions:*\n${testCase.preconditions}\n\n`;
    }
    
    description += `*Test Steps:*\n`;
    testCase.steps.forEach((step, index) => {
      description += `${index + 1}. *Action:* ${step.action}\n`;
      description += `   *Expected Result:* ${step.expectedResult}\n\n`;
    });

    // Map priority to Jira priority names
    const priorityMap: Record<string, string> = {
      low: "Lowest",
      medium: "Medium",
      high: "Highest",
    };
    const jiraPriority = priorityMap[testCase.priority || "medium"] || "Medium";

    // Convert steps to Xray format
    // Xray expects: { action, data, result } format (not index, step, etc.)
    const xraySteps = testCase.steps.map((step) => ({
      action: step.action,
      data: "", // Test data is optional
      result: step.expectedResult,
    }));

    // Create test issue payload
    const payload: any = {
      fields: {
        project: {
          key: projectKey,
        },
        summary: testCase.title,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: description,
                },
              ],
            },
          ],
        },
        issuetype: {
          name: "Test",
        },
        priority: {
          name: jiraPriority,
        },
      },
    };

    // Add test steps to the payload if we found the field
    if (testStepsFieldId) {
      payload.fields[testStepsFieldId] = xraySteps;
      console.log(`Including test steps in creation payload using field: ${testStepsFieldId}`);
    }

    // Add labels if provided
    if (labels && labels.length > 0) {
      payload.fields.labels = labels;
    }

    const response = await fetch(`${cleanUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: createAuthHeader(auth.email, auth.apiToken),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.errorMessages && errorData.errorMessages.length > 0) {
          errorMessage = errorData.errorMessages.join("; ");
        } else if (errorData.errors) {
          errorMessage = Object.entries(errorData.errors)
            .map(([key, value]) => `${key}: ${value}`)
            .join("; ");
        }
      } catch {
        // If parsing fails, use the raw error text
        errorMessage = errorText || errorMessage;
      }

      // Check if it's an X-Ray not installed error
      if (errorMessage.includes("Test") && errorMessage.includes("issuetype")) {
        return {
          error: "X-Ray is not installed or 'Test' issue type is not available. Please ensure X-Ray is installed in your Jira instance.",
        };
      }

      return { error: errorMessage };
    }

    const data = await response.json();
    
    // If we didn't include steps in creation, try to add them now
    if (data.key && !testStepsFieldId) {
      console.log("Test steps field not found in create metadata, attempting to add steps after creation...");
      await addTestStepsToXRay(data.key, testCase.steps, auth).catch((err) => {
        // Log but don't fail - steps are already in description
        console.warn("Failed to add X-Ray test steps field:", err);
      });
    } else if (data.key && testStepsFieldId) {
      console.log(`Test created with steps included in field ${testStepsFieldId}`);
    }

    return { testKey: data.key };
  } catch (error) {
    console.error("Error creating test:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error creating test",
    };
  }
}

/**
 * Discover X-Ray test steps custom field ID from create metadata
 * This is called BEFORE creating the issue to include steps in the initial payload
 */
async function discoverTestStepsFieldIdFromCreateMeta(
  projectKey: string,
  auth: JiraAuth
): Promise<string | null> {
  try {
    const cleanUrl = auth.baseUrl.replace(/\/$/, "");
    
    // Get create metadata for Test issue type
    const response = await fetch(
      `${cleanUrl}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&issuetypeNames=Test&expand=projects.issuetypes.fields`,
      {
        method: "GET",
        headers: {
          Authorization: createAuthHeader(auth.email, auth.apiToken),
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn("Failed to get create metadata, will try alternative discovery");
      return null;
    }

    const data = await response.json();
    
    // Navigate through the metadata structure
    if (data.projects && data.projects.length > 0) {
      const project = data.projects[0];
      if (project.issuetypes && project.issuetypes.length > 0) {
        const testIssueType = project.issuetypes.find((it: any) => it.name === "Test");
        if (testIssueType && testIssueType.fields) {
          const fields = testIssueType.fields;
          
          // Look for test steps field by name
          for (const [fieldKey, fieldData] of Object.entries(fields)) {
            const field = fieldData as any;
            const fieldName = (field.name || "").toLowerCase();
            const fieldSchema = field.schema || {};
            const fieldType = fieldSchema.type || "";
            
            // Check if this looks like a test steps field
            if (
              (fieldName.includes("test step") ||
                fieldName.includes("step") ||
                (fieldName.includes("xray") && fieldName.includes("step")) ||
                fieldName === "steps") &&
              (fieldType === "array" || fieldKey.startsWith("customfield_"))
            ) {
              console.log(`Found test steps field: ${fieldKey} (${field.name})`);
              return fieldKey;
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.warn("Error discovering test steps field from create metadata:", error);
    return null;
  }
}

/**
 * Discover X-Ray test steps custom field ID from existing issue
 * Used when updating an existing test issue
 */
async function discoverTestStepsFieldId(
  testKey: string,
  auth: JiraAuth
): Promise<string | null> {
  try {
    const cleanUrl = auth.baseUrl.replace(/\/$/, "");
    
    // Get the issue edit metadata to see all editable fields
    const editResponse = await fetch(
      `${cleanUrl}/rest/api/3/issue/${testKey}/editmeta`,
      {
        method: "GET",
        headers: {
          Authorization: createAuthHeader(auth.email, auth.apiToken),
          Accept: "application/json",
        },
      }
    );

    if (editResponse.ok) {
      const editData = await editResponse.json();
      const fields = editData.fields || {};
      
      // Look for array or object fields that might be test steps
      for (const [fieldKey, fieldData] of Object.entries(fields)) {
        const field = fieldData as any;
        const fieldName = (field.name || "").toLowerCase();
        const fieldType = field.schema?.type || "";
        
        if (
          (fieldName.includes("test step") ||
            fieldName.includes("step") ||
            (fieldName.includes("xray") && fieldName.includes("step")) ||
            fieldName === "steps") &&
          (fieldType === "array" || fieldKey.startsWith("customfield_"))
        ) {
          console.log(`Found test steps field: ${fieldKey} (${field.name})`);
          return fieldKey;
        }
      }
    }

    // Fallback: try to get issue with names expanded
    const response = await fetch(
      `${cleanUrl}/rest/api/3/issue/${testKey}?expand=names`,
      {
        method: "GET",
        headers: {
          Authorization: createAuthHeader(auth.email, auth.apiToken),
          Accept: "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const fieldNames = data.names || {};
      const testStepFieldKeys = Object.keys(fieldNames).filter((key) => {
        const fieldName = fieldNames[key].toLowerCase();
        return (
          fieldName.includes("test step") ||
          fieldName.includes("step") ||
          (fieldName.includes("xray") && fieldName.includes("step")) ||
          fieldName === "steps"
        );
      });

      if (testStepFieldKeys.length > 0) {
        console.log(`Found test steps field: ${testStepFieldKeys[0]} (${fieldNames[testStepFieldKeys[0]]})`);
        return testStepFieldKeys[0];
      }
    }

    return null;
  } catch (error) {
    console.warn("Error discovering test steps field:", error);
    return null;
  }
}

/**
 * Attempt to add test steps to X-Ray custom field
 * This function discovers the field ID and updates the test issue with steps
 * 
 * Note: Xray Cloud also provides a REST API endpoint (/rest/raven/1.0/api/test) for creating
 * tests with steps, but this implementation uses the standard Jira API with custom fields
 * for broader compatibility across Xray versions.
 */
async function addTestStepsToXRay(
  testKey: string,
  steps: TestCase["steps"],
  auth: JiraAuth
): Promise<void> {
  try {
    const cleanUrl = auth.baseUrl.replace(/\/$/, "");
    
    // Discover the test steps field ID
    const fieldId = await discoverTestStepsFieldId(testKey, auth);
    
    if (!fieldId) {
      console.warn(`Could not discover test steps field for ${testKey}. Steps will only be in description.`);
      return;
    }

    // Convert steps to Xray format
    // Xray expects: { action, data, result } format (not index, step, etc.)
    const xraySteps = steps.map((step) => ({
      action: step.action,
      data: "", // Test data is optional in Xray format
      result: step.expectedResult,
    }));

    // Update the test issue with test steps
    // Try the standard format first
    const updatePayload: any = {
      fields: {
        [fieldId]: xraySteps,
      },
    };

    let response = await fetch(`${cleanUrl}/rest/api/3/issue/${testKey}`, {
      method: "PUT",
      headers: {
        Authorization: createAuthHeader(auth.email, auth.apiToken),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
    });

    // If the standard format fails, try alternative formats
    if (!response.ok) {
      // Try with steps wrapped in a different structure (some Xray versions use this)
      const altPayload: any = {
        fields: {
          [fieldId]: {
            steps: xraySteps,
          },
        },
      };

      response = await fetch(`${cleanUrl}/rest/api/3/issue/${testKey}`, {
        method: "PUT",
        headers: {
          Authorization: createAuthHeader(auth.email, auth.apiToken),
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(altPayload),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Failed to update test steps field ${fieldId} for ${testKey}:`, errorText);
      console.warn(`Attempted payload:`, JSON.stringify(updatePayload, null, 2));
      // Don't throw - steps are already in description
      return;
    }

    console.log(`Successfully added ${xraySteps.length} test steps to ${testKey} using field ${fieldId}`);
  } catch (error) {
    console.warn("Error adding test steps to Xray field:", error);
    // Don't throw - steps are already in description as fallback
  }
}

/**
 * Get available issue link types from Jira
 */
async function getIssueLinkTypes(auth: JiraAuth): Promise<string[]> {
  try {
    const cleanUrl = auth.baseUrl.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/rest/api/3/issueLinkType`, {
      method: "GET",
      headers: {
        Authorization: createAuthHeader(auth.email, auth.apiToken),
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.issueLinkTypes && Array.isArray(data.issueLinkTypes)) {
        const linkTypes = data.issueLinkTypes.map((linkType: any) => linkType.name || linkType.id);
        console.log(`Available link types in Jira: ${linkTypes.join(", ")}`);
        return linkTypes;
      }
    } else {
      console.warn(`Failed to fetch issue link types: HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn("Failed to fetch issue link types:", error);
  }
  return [];
}

/**
 * Try to create an issue link with a specific link type
 * For Xray, the correct direction is typically:
 * - "Tests" link: test (outward) -> story (inward) means "test tests story"
 * - "is tested by" link: story (outward) -> test (inward) means "story is tested by test"
 * Both should work, but "is tested by" is more semantically correct for Xray Test details
 */
async function tryCreateLink(
  testKey: string,
  storyKey: string,
  linkTypeName: string,
  auth: JiraAuth
): Promise<{ success: boolean; error?: string }> {
  const cleanUrl = auth.baseUrl.replace(/\/$/, "");
  
  // Determine the correct direction based on link type name
  // For Xray to show tests in Test details, we need story -> test direction
  const linkTypeLower = linkTypeName.toLowerCase();
  
  // Priority order: try the most semantically correct direction first
  const attempts = [];
  
  if (linkTypeLower.includes("tested by") || linkTypeLower === "is tested by") {
    // "is tested by": story (outward) -> test (inward) = story is tested by test
    // This is the preferred direction for Xray Test Coverage
    attempts.push({
      type: { name: linkTypeName },
      inwardIssue: { key: testKey },
      outwardIssue: { key: storyKey },
    });
  } else if (linkTypeLower === "tests") {
    // "Tests": test (outward) -> story (inward) = test tests story
    // Try test -> story first (standard direction)
    attempts.push({
      type: { name: linkTypeName },
      inwardIssue: { key: storyKey },
      outwardIssue: { key: testKey },
    });
    // Also try reverse direction (some Xray configs use this)
    attempts.push({
      type: { name: linkTypeName },
      inwardIssue: { key: testKey },
      outwardIssue: { key: storyKey },
    });
  } else if (linkTypeLower === "covers") {
    // "Covers": test (outward) -> story (inward) = test covers requirement
    attempts.push({
      type: { name: linkTypeName },
      inwardIssue: { key: storyKey },
      outwardIssue: { key: testKey },
    });
    // Also try reverse
    attempts.push({
      type: { name: linkTypeName },
      inwardIssue: { key: testKey },
      outwardIssue: { key: storyKey },
    });
  } else {
    // For other link types (like "Relates"), try both directions
    attempts.push(
      {
        // Story -> Test
        type: { name: linkTypeName },
        inwardIssue: { key: testKey },
        outwardIssue: { key: storyKey },
      },
      {
        // Test -> Story
        type: { name: linkTypeName },
        inwardIssue: { key: storyKey },
        outwardIssue: { key: testKey },
      }
    );
  }

  for (const payload of attempts) {
    try {
      const response = await fetch(`${cleanUrl}/rest/api/3/issueLink`, {
        method: "POST",
        headers: {
          Authorization: createAuthHeader(auth.email, auth.apiToken),
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return { success: true };
      }

      // If link already exists, that's okay
      if (response.status === 400) {
        const errorText = await response.text();
        if (
          errorText.includes("already exists") ||
          errorText.includes("duplicate") ||
          errorText.includes("A link with")
        ) {
          return { success: true }; // Link already exists, treat as success
        }
      }
    } catch (error) {
      // Continue to next attempt
      continue;
    }
  }

  return { success: false, error: `Failed to create link with type "${linkTypeName}"` };
}

/**
 * Link a test case to a user story
 * Tries multiple link types in order of preference
 */
export async function linkTestToStory(
  testKey: string,
  storyKey: string,
  auth: JiraAuth
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanUrl = auth.baseUrl.replace(/\/$/, "");
    
    // Get available link types
    const availableLinkTypes = await getIssueLinkTypes(auth);
    
    // Priority order of link types to try
    // For Xray Test Coverage section, we need specific link types:
    // - "Tests" or "is tested by" for requirement-test relationships
    // - "Covers" is also used in some Xray configurations
    // The direction matters: story (outward) -> test (inward) with "is tested by" 
    // OR test (outward) -> story (inward) with "Tests"
    const linkTypesToTry = [
      "is tested by",     // X-Ray: story is tested by test (for Test Coverage)
      "Tests",           // X-Ray: test tests the story (for Test Coverage)
      "Covers",          // X-Ray: test covers requirement (alternative)
      "Relates",         // Standard Jira link type (fallback, won't show in Test Coverage)
    ];

    // Filter to only try link types that exist (if we got the list)
    const linkTypes = availableLinkTypes.length > 0
      ? linkTypesToTry.filter(lt => 
          availableLinkTypes.some(alt => 
            alt.toLowerCase() === lt.toLowerCase() ||
            alt.toLowerCase().includes("test")
          )
        ).concat(["Relates"]) // Always include Relates as fallback
      : linkTypesToTry;

    // Remove duplicates while preserving order
    const uniqueLinkTypes = Array.from(new Set(linkTypes));

    // Try each link type
    for (const linkType of uniqueLinkTypes) {
      console.log(`Attempting to link ${testKey} to ${storyKey} using link type "${linkType}"...`);
      const result = await tryCreateLink(testKey, storyKey, linkType, auth);
      if (result.success) {
        console.log(`✓ Successfully linked ${testKey} to ${storyKey} using link type "${linkType}"`);
        console.log(`  This link should make the test appear in the Test Coverage section of ${storyKey}`);
        return { success: true };
      } else {
        console.warn(`✗ Failed to link using "${linkType}": ${result.error || "Unknown error"}`);
      }
    }

    // If all link types failed, try with "Relates" as last resort
    const relatesResult = await tryCreateLink(testKey, storyKey, "Relates", auth);
    if (relatesResult.success) {
      console.log(`Successfully linked ${testKey} to ${storyKey} using "Relates" link type`);
      return { success: true };
    }

    // If everything failed, return the last error
    return {
      success: false,
      error: `Failed to link test to story. Tried link types: ${uniqueLinkTypes.join(", ")}. Please check if X-Ray is properly configured or if custom link types are required.`,
    };
  } catch (error) {
    console.error("Error linking test to story:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error linking test",
    };
  }
}

/**
 * Upload a test case to Jira X-Ray
 * This is the main function that orchestrates the upload process
 */
export async function uploadTestCaseToXRay(
  testCase: TestCase,
  storyKey: string,
  auth: JiraAuth,
  options?: {
    skipDuplicates?: boolean;
    labels?: string[];
  }
): Promise<XRayUploadResult> {
  const projectKey = extractProjectKey(storyKey);
  const skipDuplicates = options?.skipDuplicates ?? true;

  // Check for duplicates if enabled
  if (skipDuplicates) {
    const duplicateCheck = await checkTestExists(testCase.title, projectKey, auth);
    if (duplicateCheck.exists && duplicateCheck.testKey) {
      return {
        testCaseId: testCase.id,
        status: "skipped",
        testKey: duplicateCheck.testKey,
        error: "Test case with this title already exists",
      };
    }
  }

  // Create the test issue
  const createResult = await createTest(
    testCase,
    projectKey,
    auth,
    options?.labels || ["ai-generated"]
  );

  if (createResult.error) {
    return {
      testCaseId: testCase.id,
      status: "failed",
      error: createResult.error,
    };
  }

  if (!createResult.testKey) {
    return {
      testCaseId: testCase.id,
      status: "failed",
      error: "Test was created but no key was returned",
    };
  }

  // Link test to story
  const linkResult = await linkTestToStory(createResult.testKey, storyKey, auth);
  
  if (!linkResult.success) {
    // Test was created but linking failed
    console.error(`Test ${createResult.testKey} created but linking to ${storyKey} failed:`, linkResult.error);
    console.error(`Note: For tests to appear in Test Coverage, they must be linked with the correct link type.`);
    console.error(`Please check your Xray configuration and ensure the user story (${storyKey}) is recognized as a requirement.`);
    // Return as uploaded but with error message so user knows linking failed
    return {
      testCaseId: testCase.id,
      status: "uploaded",
      testKey: createResult.testKey,
      error: `Test created successfully, but linking to story failed: ${linkResult.error}. You may need to manually link ${createResult.testKey} to ${storyKey} using the correct link type for Test Coverage.`,
    };
  }
  
  console.log(`Successfully created and linked test ${createResult.testKey} to story ${storyKey}`);
  console.log(`The test should now appear in the Test Coverage section of ${storyKey}`);
  console.log(`Note: If the test doesn't appear in Test Coverage, ensure ${storyKey} is recognized as a requirement by Xray.`);

  return {
    testCaseId: testCase.id,
    status: "uploaded",
    testKey: createResult.testKey,
  };
}

