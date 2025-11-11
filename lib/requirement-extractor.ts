/**
 * Requirement Extraction Module
 * Extracts requirements from user stories, acceptance criteria, files, and Confluence pages
 */

export type RequirementSource = "user_story" | "acceptance_criteria" | "file" | "confluence";
export type RequirementCategory = "functional" | "non-functional" | "api" | "flow" | "edge_case";
export type RequirementPriority = "low" | "medium" | "high";

export interface Requirement {
  id: string;
  source: RequirementSource;
  sourceId: string; // Reference to source (e.g., filename, AC index)
  text: string;
  category: RequirementCategory;
  priority: RequirementPriority;
}

/**
 * Extract requirements from user story description
 */
export function extractRequirementsFromDescription(
  description: string,
  issueKey: string
): Requirement[] {
  if (!description || !description.trim()) {
    return [];
  }

  const requirements: Requirement[] = [];
  let reqIndex = 0;

  // Pattern 1: Bullet points and numbered lists
  const listPatterns = [
    /^[\s]*[-*•]\s+(.+)$/gm, // Bullet points
    /^[\s]*\d+[.)]\s+(.+)$/gm, // Numbered lists
  ];

  for (const pattern of listPatterns) {
    const matches = description.matchAll(pattern);
    for (const match of matches) {
      const text = match[1]?.trim();
      if (text && text.length > 10) { // Minimum length to be considered a requirement
        requirements.push({
          id: `REQ-${issueKey}-DESC-${++reqIndex}`,
          source: "user_story",
          sourceId: `description`,
          text,
          category: categorizeRequirement(text),
          priority: determinePriority(text),
        });
      }
    }
  }

  // Pattern 2: "Must", "Should", "Shall" statements
  const requirementPatterns = [
    /(?:^|\n)[\s]*(?:must|should|shall|needs? to|requires?|has to)\s+([^.!?\n]+[.!?])/gim,
  ];

  for (const pattern of requirementPatterns) {
    const matches = description.matchAll(pattern);
    for (const match of matches) {
      const text = match[1]?.trim();
      if (text && text.length > 10 && !requirements.some(r => r.text === text)) {
        requirements.push({
          id: `REQ-${issueKey}-DESC-${++reqIndex}`,
          source: "user_story",
          sourceId: `description`,
          text,
          category: categorizeRequirement(text),
          priority: determinePriority(text),
        });
      }
    }
  }

  // Pattern 3: User flows and scenarios
  const flowPatterns = [
    /(?:user|when|if)\s+(?:can|could|should|must)\s+([^.!?\n]+[.!?])/gim,
    /(?:scenario|flow|process):\s*([^.!?\n]+[.!?])/gim,
  ];

  for (const pattern of flowPatterns) {
    const matches = description.matchAll(pattern);
    for (const match of matches) {
      const text = match[1]?.trim();
      if (text && text.length > 10 && !requirements.some(r => r.text === text)) {
        requirements.push({
          id: `REQ-${issueKey}-DESC-${++reqIndex}`,
          source: "user_story",
          sourceId: `description`,
          text,
          category: "flow",
          priority: determinePriority(text),
        });
      }
    }
  }

  // If no structured requirements found, extract key sentences
  if (requirements.length === 0) {
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 20);
    sentences.slice(0, 5).forEach((sentence, idx) => {
      requirements.push({
        id: `REQ-${issueKey}-DESC-${++reqIndex}`,
        source: "user_story",
        sourceId: `description`,
        text: sentence.trim(),
        category: categorizeRequirement(sentence),
        priority: "medium",
      });
    });
  }

  return requirements;
}

/**
 * Extract requirements from acceptance criteria
 */
export function extractRequirementsFromAcceptanceCriteria(
  acceptanceCriteria: string,
  issueKey: string
): Requirement[] {
  if (!acceptanceCriteria || !acceptanceCriteria.trim()) {
    return [];
  }

  const requirements: Requirement[] = [];
  let reqIndex = 0;

  // Split by common delimiters
  const criteriaItems = acceptanceCriteria
    .split(/\n|;|(?=\d+[.)])/)
    .map(item => item.trim())
    .filter(item => item.length > 10);

  criteriaItems.forEach((item, index) => {
    // Remove common prefixes
    const cleaned = item
      .replace(/^[-*•\d+.)]\s*/, '')
      .replace(/^(?:given|when|then|and|but)\s+/i, '')
      .trim();

    if (cleaned.length > 10) {
      requirements.push({
        id: `REQ-${issueKey}-AC-${index + 1}`,
        source: "acceptance_criteria",
        sourceId: `ac-${index + 1}`,
        text: cleaned,
        category: categorizeRequirement(cleaned),
        priority: determinePriority(cleaned),
      });
    }
  });

  return requirements;
}

/**
 * Extract requirements from file content
 */
export function extractRequirementsFromFile(
  content: string,
  filename: string,
  issueKey: string
): Requirement[] {
  if (!content || !content.trim()) {
    return [];
  }

  const requirements: Requirement[] = [];
  let reqIndex = 0;

  // Pattern 1: API endpoints
  const apiPatterns = [
    /(?:GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-{}]+)/gi,
    /(?:endpoint|api|route):\s*([\/\w\-{}]+)/gi,
  ];

  for (const pattern of apiPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const endpoint = match[1]?.trim();
      if (endpoint && !requirements.some(r => r.text.includes(endpoint))) {
        requirements.push({
          id: `REQ-${issueKey}-FILE-${filename}-API-${++reqIndex}`,
          source: "file",
          sourceId: filename,
          text: `API endpoint: ${endpoint}`,
          category: "api",
          priority: "high",
        });
      }
    }
  }

  // Pattern 2: Requirements sections
  const reqSectionPatterns = [
    /(?:requirement|specification|feature):\s*([^.!?\n]+[.!?])/gim,
    /(?:must|should|shall)\s+([^.!?\n]+[.!?])/gim,
  ];

  for (const pattern of reqSectionPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const text = match[1]?.trim();
      if (text && text.length > 10 && !requirements.some(r => r.text === text)) {
        requirements.push({
          id: `REQ-${issueKey}-FILE-${filename}-${++reqIndex}`,
          source: "file",
          sourceId: filename,
          text,
          category: categorizeRequirement(text),
          priority: determinePriority(text),
        });
      }
    }
  }

  // Pattern 3: Bullet points and lists
  const listPatterns = [
    /^[\s]*[-*•]\s+(.+)$/gm,
    /^[\s]*\d+[.)]\s+(.+)$/gm,
  ];

  for (const pattern of listPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const text = match[1]?.trim();
      if (text && text.length > 15 && !requirements.some(r => r.text === text)) {
        requirements.push({
          id: `REQ-${issueKey}-FILE-${filename}-${++reqIndex}`,
          source: "file",
          sourceId: filename,
          text,
          category: categorizeRequirement(text),
          priority: determinePriority(text),
        });
      }
    }
  }

  // Pattern 4: Error conditions
  const errorPatterns = [
    /(?:error|exception|failure|invalid|invalid|should fail|must fail):\s*([^.!?\n]+[.!?])/gim,
  ];

  for (const pattern of errorPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const text = match[1]?.trim();
      if (text && text.length > 10 && !requirements.some(r => r.text === text)) {
        requirements.push({
          id: `REQ-${issueKey}-FILE-${filename}-ERR-${++reqIndex}`,
          source: "file",
          sourceId: filename,
          text,
          category: "edge_case",
          priority: "medium",
        });
      }
    }
  }

  return requirements;
}

/**
 * Extract requirements from Confluence page content
 */
export function extractRequirementsFromConfluence(
  content: string,
  pageTitle: string,
  issueKey: string
): Requirement[] {
  if (!content || !content.trim()) {
    return [];
  }

  const requirements: Requirement[] = [];
  let reqIndex = 0;

  // Use same patterns as file extraction, but mark as Confluence source
  const fileReqs = extractRequirementsFromFile(content, pageTitle, issueKey);
  
  // Convert file requirements to Confluence requirements
  fileReqs.forEach((req, idx) => {
    requirements.push({
      ...req,
      id: `REQ-${issueKey}-CONF-${++reqIndex}`,
      source: "confluence",
      sourceId: pageTitle,
    });
  });

  // Additional Confluence-specific patterns
  // Pattern: Integration flows
  const flowPatterns = [
    /(?:integration|flow|process|workflow):\s*([^.!?\n]+[.!?])/gim,
  ];

  for (const pattern of flowPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const text = match[1]?.trim();
      if (text && text.length > 10 && !requirements.some(r => r.text === text)) {
        requirements.push({
          id: `REQ-${issueKey}-CONF-FLOW-${++reqIndex}`,
          source: "confluence",
          sourceId: pageTitle,
          text,
          category: "flow",
          priority: "high",
        });
      }
    }
  }

  return requirements;
}

/**
 * Categorize a requirement based on its text content
 */
function categorizeRequirement(text: string): RequirementCategory {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("api") || lowerText.includes("endpoint") || lowerText.includes("http") || lowerText.includes("rest")) {
    return "api";
  }

  if (lowerText.includes("flow") || lowerText.includes("process") || lowerText.includes("workflow") || lowerText.includes("scenario")) {
    return "flow";
  }

  if (lowerText.includes("error") || lowerText.includes("exception") || lowerText.includes("invalid") || lowerText.includes("edge case") || lowerText.includes("boundary")) {
    return "edge_case";
  }

  if (lowerText.includes("performance") || lowerText.includes("security") || lowerText.includes("scalability") || lowerText.includes("availability")) {
    return "non-functional";
  }

  return "functional";
}

/**
 * Determine priority based on text content
 */
function determinePriority(text: string): RequirementPriority {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("must") || lowerText.includes("critical") || lowerText.includes("essential") || lowerText.includes("required")) {
    return "high";
  }

  if (lowerText.includes("should") || lowerText.includes("important") || lowerText.includes("recommended")) {
    return "medium";
  }

  if (lowerText.includes("could") || lowerText.includes("nice to have") || lowerText.includes("optional")) {
    return "low";
  }

  return "medium";
}

/**
 * Extract all requirements from combined context
 */
export function extractAllRequirements(params: {
  description?: string;
  acceptanceCriteria?: string;
  fileContents?: Array<{ filename: string; content: string }>;
  confluenceContent?: { title: string; content: string };
  issueKey: string;
}): Requirement[] {
  const allRequirements: Requirement[] = [];

  if (params.description) {
    allRequirements.push(...extractRequirementsFromDescription(params.description, params.issueKey));
  }

  if (params.acceptanceCriteria) {
    allRequirements.push(...extractRequirementsFromAcceptanceCriteria(params.acceptanceCriteria, params.issueKey));
  }

  if (params.fileContents) {
    params.fileContents.forEach(file => {
      allRequirements.push(...extractRequirementsFromFile(file.content, file.filename, params.issueKey));
    });
  }

  if (params.confluenceContent) {
    allRequirements.push(...extractRequirementsFromConfluence(
      params.confluenceContent.content,
      params.confluenceContent.title,
      params.issueKey
    ));
  }

  return allRequirements;
}

