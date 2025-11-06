import { TestCase } from "./schemas";

/**
 * Export test cases to JSON format with pretty printing
 */
export function exportToJSON(testCases: TestCase[]): string {
  return JSON.stringify(testCases, null, 2);
}

/**
 * Trigger browser download of JSON file
 */
export function downloadJSON(testCases: TestCase[], filename: string = "test-cases.json"): void {
  const jsonContent = exportToJSON(testCases);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
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

