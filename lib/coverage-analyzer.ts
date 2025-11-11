/**
 * Coverage Analysis Service
 * Analyzes test case coverage of requirements and provides metrics
 */

import { Requirement, TestCase } from "./schemas";

/**
 * Calculate text similarity between two strings (simple Jaccard similarity)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Find requirements that might be covered by a test case based on semantic similarity
 */
export function findMatchingRequirements(
  testCase: TestCase,
  requirements: Requirement[],
  similarityThreshold: number = 0.2
): Requirement[] {
  // Build comprehensive test case text for matching
  const testCaseText = `${testCase.title} ${testCase.preconditions} ${testCase.steps.map(s => `${s.action} ${s.expectedResult}`).join(" ")}`.toLowerCase();
  
  // Extract key terms from test case
  const testCaseWords = new Set(
    testCaseText
      .split(/\W+/)
      .filter(w => w.length > 3) // Only meaningful words
      .map(w => w.toLowerCase())
  );
  
  return requirements
    .map(req => {
      const reqText = req.text.toLowerCase();
      const reqWords = new Set(
        reqText
          .split(/\W+/)
          .filter(w => w.length > 3)
          .map(w => w.toLowerCase())
      );
      
      // Calculate multiple similarity metrics
      const jaccardSimilarity = calculateTextSimilarity(testCaseText, reqText);
      
      // Check for keyword overlap
      const commonWords = [...testCaseWords].filter(w => reqWords.has(w));
      const keywordOverlap = commonWords.length / Math.max(testCaseWords.size, reqWords.size, 1);
      
      // Check for exact phrase matches (important keywords)
      const importantKeywords = [...testCaseWords].filter(w => 
        w.length > 4 && reqText.includes(w)
      );
      const keywordMatchScore = importantKeywords.length * 0.1;
      
      // Combined similarity score
      const combinedSimilarity = Math.max(
        jaccardSimilarity,
        keywordOverlap * 0.8,
        keywordMatchScore
      );
      
      return {
        requirement: req,
        similarity: combinedSimilarity,
        keywordMatches: importantKeywords.length,
      };
    })
    .filter(item => item.similarity >= similarityThreshold || item.keywordMatches >= 2)
    .sort((a, b) => {
      // Sort by similarity first, then by keyword matches
      if (Math.abs(a.similarity - b.similarity) > 0.1) {
        return b.similarity - a.similarity;
      }
      return b.keywordMatches - a.keywordMatches;
    })
    .map(item => item.requirement);
}

/**
 * Automatically link test cases to requirements based on semantic matching
 */
export function autoLinkTestCasesToRequirements(
  testCases: TestCase[],
  requirements: Requirement[]
): TestCase[] {
  if (requirements.length === 0) {
    return testCases; // No requirements to link
  }

  return testCases.map(testCase => {
    // Get existing requirement IDs (if any from LLM)
    const existingRequirementIds = new Set(testCase.requirementIds || []);
    
    // If LLM already linked requirements, we still check for additional matches
    // but prioritize the LLM's choices
    const matchingRequirements = findMatchingRequirements(testCase, requirements, 0.15);
    
    // Filter out requirements that are already linked
    const unmatchedRequirements = matchingRequirements.filter(r => !existingRequirementIds.has(r.id));
    
    // If LLM didn't link any requirements, link top 5 most similar
    // If LLM linked some, only add 2-3 additional ones to avoid over-linking
    const maxAdditionalLinks = existingRequirementIds.size > 0 ? 3 : 5;
    const newRequirementIds = unmatchedRequirements
      .slice(0, maxAdditionalLinks)
      .map(r => r.id);
    
    // Combine existing (from LLM) and new (from auto-linking) requirement IDs
    const allRequirementIds = [
      ...Array.from(existingRequirementIds),
      ...newRequirementIds,
    ];

    return {
      ...testCase,
      requirementIds: allRequirementIds,
    };
  });
}

/**
 * Analyze coverage for all test cases
 */
export function analyzeCoverage(testCases: TestCase[], requirements: Requirement[]): {
  metrics: {
    total: number;
    covered: number;
    uncovered: number;
    coveragePercentage: number;
    bySource: Record<Requirement["source"], { total: number; covered: number }>;
    byCategory: Record<Requirement["category"], { total: number; covered: number }>;
  };
  uncoveredRequirements: Requirement[];
  suggestions: Array<{
    requirement: Requirement;
    suggestedTestCases: TestCase[];
  }>;
} {
  const allRequirementIds = new Set<string>();
  
  // Collect all requirement IDs from test cases
  testCases.forEach(tc => {
    if (tc.requirementIds) {
      tc.requirementIds.forEach(id => allRequirementIds.add(id));
    }
  });

  const requirementIds = Array.from(allRequirementIds);
  
  // Calculate metrics
  const total = requirements.length;
  const covered = requirements.filter((r) => allRequirementIds.has(r.id)).length;
  const uncovered = total - covered;
  const coveragePercentage = total > 0 ? Math.round((covered / total) * 100) : 0;

  // Calculate by source
  const bySource: Record<Requirement["source"], { total: number; covered: number }> = {
    user_story: { total: 0, covered: 0 },
    acceptance_criteria: { total: 0, covered: 0 },
    file: { total: 0, covered: 0 },
    confluence: { total: 0, covered: 0 },
  };

  requirements.forEach((r) => {
    bySource[r.source].total++;
    if (allRequirementIds.has(r.id)) {
      bySource[r.source].covered++;
    }
  });

  // Calculate by category
  const byCategory: Record<Requirement["category"], { total: number; covered: number }> = {
    functional: { total: 0, covered: 0 },
    "non-functional": { total: 0, covered: 0 },
    api: { total: 0, covered: 0 },
    flow: { total: 0, covered: 0 },
    edge_case: { total: 0, covered: 0 },
  };

  requirements.forEach((r) => {
    byCategory[r.category].total++;
    if (allRequirementIds.has(r.id)) {
      byCategory[r.category].covered++;
    }
  });

  const metrics = {
    total,
    covered,
    uncovered,
    coveragePercentage,
    bySource,
    byCategory,
  };

  const uncoveredRequirements = requirements.filter((r) => !allRequirementIds.has(r.id));

  // Generate suggestions for uncovered requirements
  const suggestions = uncoveredRequirements.map(req => {
    // Find test cases that might cover this requirement
    const matchingTestCases = testCases
      .map(tc => ({
        testCase: tc,
        similarity: calculateTextSimilarity(
          req.text.toLowerCase(),
          `${tc.title} ${tc.preconditions} ${tc.steps.map(s => `${s.action} ${s.expectedResult}`).join(" ")}`.toLowerCase()
        ),
      }))
      .filter(item => item.similarity >= 0.2)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(item => item.testCase);

    return {
      requirement: req,
      suggestedTestCases: matchingTestCases,
    };
  });

  return {
    metrics,
    uncoveredRequirements,
    suggestions,
  };
}

/**
 * Get coverage summary for display
 */
export function getCoverageSummary(testCases: TestCase[], requirements: Requirement[]): {
  totalRequirements: number;
  coveredRequirements: number;
  uncoveredRequirements: number;
  coveragePercentage: number;
  requirementsBySource: Record<string, { total: number; covered: number; percentage: number }>;
  requirementsByCategory: Record<string, { total: number; covered: number; percentage: number }>;
} {
  const analysis = analyzeCoverage(testCases, requirements);
  const { metrics } = analysis;

  const requirementsBySource: Record<string, { total: number; covered: number; percentage: number }> = {};
  Object.entries(metrics.bySource).forEach(([source, data]) => {
    requirementsBySource[source] = {
      total: data.total,
      covered: data.covered,
      percentage: data.total > 0 ? Math.round((data.covered / data.total) * 100) : 0,
    };
  });

  const requirementsByCategory: Record<string, { total: number; covered: number; percentage: number }> = {};
  Object.entries(metrics.byCategory).forEach(([category, data]) => {
    requirementsByCategory[category] = {
      total: data.total,
      covered: data.covered,
      percentage: data.total > 0 ? Math.round((data.covered / data.total) * 100) : 0,
    };
  });

  return {
    totalRequirements: metrics.total,
    coveredRequirements: metrics.covered,
    uncoveredRequirements: metrics.uncovered,
    coveragePercentage: metrics.coveragePercentage,
    requirementsBySource,
    requirementsByCategory,
  };
}

