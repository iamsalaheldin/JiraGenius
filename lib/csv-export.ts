import { TestCase } from "./schemas";

/**
 * Export test cases to CSV format with UTF-8 BOM for Excel compatibility
 */
export function exportToCSV(testCases: TestCase[]): string {
  // UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  
  // CSV Headers
  const headers = ["ID", "Title", "Preconditions", "Steps", "Priority"];
  
  // Build CSV rows
  const rows = testCases.map((testCase) => {
    const steps = testCase.steps
      .map((step, index) => 
        `${index + 1}. ${step.action}\nExpected: ${step.expectedResult}`
      )
      .join("\n\n");
    
    return [
      escapeCSVField(testCase.id),
      escapeCSVField(testCase.title),
      escapeCSVField(testCase.preconditions || ""),
      escapeCSVField(steps),
      escapeCSVField(testCase.priority || "medium"),
    ];
  });
  
  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");
  
  return BOM + csvContent;
}

/**
 * Escape a field for CSV format
 * - Wrap in quotes if contains comma, newline, or quote
 * - Escape quotes by doubling them
 */
function escapeCSVField(field: string): string {
  // Convert to string and handle null/undefined
  const value = field == null ? "" : String(field);
  
  // Check if field needs quoting
  const needsQuoting = value.includes(",") || 
                       value.includes("\n") || 
                       value.includes("\r") || 
                       value.includes('"');
  
  if (needsQuoting) {
    // Escape quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return value;
}

/**
 * Trigger browser download of CSV file
 */
export function downloadCSV(testCases: TestCase[], filename: string = "test-cases.csv"): void {
  const csvContent = exportToCSV(testCases);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

