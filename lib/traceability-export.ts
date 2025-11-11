/**
 * Traceability Matrix Export
 * Export traceability matrix to CSV format
 */

import { Requirement, TestCase } from "./schemas";

/**
 * Export traceability matrix to CSV
 */
export function downloadTraceabilityMatrix(
  requirements: Requirement[],
  testCases: TestCase[]
): void {
  // Create CSV header
  const headers = ["Requirement ID", "Source", "Category", "Priority", "Requirement Text", ...testCases.map(tc => tc.id)];
  const rows: string[][] = [headers];

  // Create rows for each requirement
  requirements.forEach((req) => {
    const row: string[] = [
      req.id,
      req.source,
      req.category,
      req.priority,
      `"${req.text.replace(/"/g, '""')}"`, // Escape quotes in CSV
    ];

    // Add coverage indicators for each test case
    testCases.forEach((tc) => {
      const isLinked = (tc.requirementIds || []).includes(req.id);
      row.push(isLinked ? "✓" : "");
    });

    rows.push(row);
  });

  // Convert to CSV string
  const csvContent = rows.map(row => row.join(",")).join("\n");

  // Add BOM for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `traceability-matrix-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export coverage report to JSON
 */
export function exportCoverageReport(
  requirements: Requirement[],
  testCases: TestCase[],
  metrics: {
    total: number;
    covered: number;
    uncovered: number;
    coveragePercentage: number;
    bySource: Record<string, { total: number; covered: number }>;
    byCategory: Record<string, { total: number; covered: number }>;
  }
): string {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalRequirements: metrics.total,
      coveredRequirements: metrics.covered,
      uncoveredRequirements: metrics.uncovered,
      coveragePercentage: metrics.coveragePercentage,
    },
    bySource: metrics.bySource,
    byCategory: metrics.byCategory,
    requirements: requirements.map(req => ({
      id: req.id,
      source: req.source,
      category: req.category,
      priority: req.priority,
      text: req.text,
      coveredBy: testCases
        .filter(tc => (tc.requirementIds || []).includes(req.id))
        .map(tc => tc.id),
    })),
    testCases: testCases.map(tc => ({
      id: tc.id,
      title: tc.title,
      priority: tc.priority,
      coversRequirements: tc.requirementIds || [],
    })),
  };

  return JSON.stringify(report, null, 2);
}

