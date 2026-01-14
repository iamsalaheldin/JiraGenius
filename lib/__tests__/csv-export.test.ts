import { describe, it, expect } from "vitest";
import { exportToCSV } from "../csv-export";
import { TestCase } from "../schemas";

describe("exportToCSV", () => {
  const sampleTestCase: TestCase = {
    id: "TC-1",
    title: "Test login functionality",
    preconditions: "User has valid credentials",
    steps: [
      {
        id: "step-1",
        action: "Navigate to login page",
        expectedResult: "Login page is displayed",
      },
      {
        id: "step-2",
        action: "Enter username and password",
        expectedResult: "Credentials are accepted",
      },
    ],
    priority: "high",
  };

  it("should export test cases to CSV format", () => {
    const csv = exportToCSV([sampleTestCase]);
    expect(csv).toContain("ID,Title,Preconditions,Steps,Priority");
    expect(csv).toContain("TC-1");
    expect(csv).toContain("Test login functionality");
  });

  it("should include UTF-8 BOM", () => {
    const csv = exportToCSV([sampleTestCase]);
    expect(csv.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
  });

  it("should handle commas in fields by escaping", () => {
    const testCase: TestCase = {
      ...sampleTestCase,
      title: "Test login, logout, and session",
    };
    const csv = exportToCSV([testCase]);
    expect(csv).toContain('"Test login, logout, and session"');
  });

  it("should handle quotes in fields by doubling them", () => {
    const testCase: TestCase = {
      ...sampleTestCase,
      title: 'Test "special" login',
    };
    const csv = exportToCSV([testCase]);
    expect(csv).toContain('"Test ""special"" login"');
  });

  it("should handle newlines in fields", () => {
    const testCase: TestCase = {
      ...sampleTestCase,
      preconditions: "Line 1\nLine 2",
    };
    const csv = exportToCSV([testCase]);
    expect(csv).toContain('"Line 1\nLine 2"');
  });

  it("should format steps with numbering and expected results", () => {
    const csv = exportToCSV([sampleTestCase]);
    expect(csv).toContain("1. Navigate to login page");
    expect(csv).toContain("Expected: Login page is displayed");
    expect(csv).toContain("2. Enter username and password");
    expect(csv).toContain("Expected: Credentials are accepted");
  });

  it("should handle multiple test cases", () => {
    const testCase2: TestCase = {
      id: "TC-2",
      title: "Test logout",
      preconditions: "User is logged in",
      steps: [
        {
          id: "step-1",
          action: "Click logout button",
          expectedResult: "User is logged out",
        },
      ],
      priority: "medium",
    };
    const csv = exportToCSV([sampleTestCase, testCase2]);
    expect(csv).toContain("TC-1");
    expect(csv).toContain("TC-2");
    expect(csv).toContain("Test login functionality");
    expect(csv).toContain("Test logout");
  });

  it("should handle empty preconditions", () => {
    const testCase: TestCase = {
      ...sampleTestCase,
      preconditions: "",
    };
    const csv = exportToCSV([testCase]);
    expect(csv).toContain("TC-1,");
  });

  it("should handle test case with medium priority", () => {
    const testCase: TestCase = {
      id: "TC-1",
      title: "Test case",
      preconditions: "",
      priority: "medium",
      steps: [
        {
          id: "step-1",
          action: "Do something",
          expectedResult: "Something happens",
        },
      ],
    };
    const csv = exportToCSV([testCase]);
    expect(csv).toContain("medium");
  });

  it("should handle empty test cases array", () => {
    const csv = exportToCSV([]);
    expect(csv).toContain("ID,Title,Preconditions,Steps,Priority");
    expect(csv.split("\n").length).toBe(1); // Only header
  });

  it("should separate steps with double newlines", () => {
    const csv = exportToCSV([sampleTestCase]);
    expect(csv).toContain("\n\n2. ");
  });
});

