import { describe, it, expect } from "vitest";
import {
  TestStepSchema,
  TestCaseSchema,
  ModelConfigSchema,
  GenerateRequestSchema,
  JiraAuthSchema,
} from "../schemas";

describe("TestStepSchema", () => {
  it("should validate a valid test step", () => {
    const validStep = {
      id: "step-1",
      action: "Click button",
      expectedResult: "Button is clicked",
    };
    const result = TestStepSchema.safeParse(validStep);
    expect(result.success).toBe(true);
  });

  it("should reject step with empty action", () => {
    const invalidStep = {
      id: "step-1",
      action: "",
      expectedResult: "Something",
    };
    const result = TestStepSchema.safeParse(invalidStep);
    expect(result.success).toBe(false);
  });

  it("should reject step with empty expected result", () => {
    const invalidStep = {
      id: "step-1",
      action: "Do something",
      expectedResult: "",
    };
    const result = TestStepSchema.safeParse(invalidStep);
    expect(result.success).toBe(false);
  });

  it("should reject step without id", () => {
    const invalidStep = {
      action: "Click button",
      expectedResult: "Button is clicked",
    };
    const result = TestStepSchema.safeParse(invalidStep);
    expect(result.success).toBe(false);
  });
});

describe("TestCaseSchema", () => {
  it("should validate a valid test case", () => {
    const validTestCase = {
      id: "TC-1",
      title: "Test something",
      preconditions: "Setup complete",
      steps: [
        {
          id: "step-1",
          action: "Do action",
          expectedResult: "Result occurs",
        },
      ],
      priority: "high",
    };
    const result = TestCaseSchema.safeParse(validTestCase);
    expect(result.success).toBe(true);
  });

  it("should apply default values", () => {
    const minimalTestCase = {
      id: "TC-1",
      title: "Test",
      steps: [
        {
          id: "step-1",
          action: "Action",
          expectedResult: "Result",
        },
      ],
    };
    const result = TestCaseSchema.parse(minimalTestCase);
    expect(result.preconditions).toBe("");
    expect(result.priority).toBe("medium");
  });

  it("should reject test case without steps", () => {
    const invalidTestCase = {
      id: "TC-1",
      title: "Test",
      steps: [],
    };
    const result = TestCaseSchema.safeParse(invalidTestCase);
    expect(result.success).toBe(false);
  });

  it("should reject test case with invalid priority", () => {
    const invalidTestCase = {
      id: "TC-1",
      title: "Test",
      steps: [
        {
          id: "step-1",
          action: "Action",
          expectedResult: "Result",
        },
      ],
      priority: "urgent",
    };
    const result = TestCaseSchema.safeParse(invalidTestCase);
    expect(result.success).toBe(false);
  });

  it("should reject test case without title", () => {
    const invalidTestCase = {
      id: "TC-1",
      title: "",
      steps: [
        {
          id: "step-1",
          action: "Action",
          expectedResult: "Result",
        },
      ],
    };
    const result = TestCaseSchema.safeParse(invalidTestCase);
    expect(result.success).toBe(false);
  });
});

describe("ModelConfigSchema", () => {
  it("should validate empty model config", () => {
    const validConfig = {};
    const result = ModelConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it("should accept empty object", () => {
    const result = ModelConfigSchema.parse({});
    expect(result).toEqual({});
  });

  it("should accept config with extra fields (ignored)", () => {
    const configWithExtra = {
      extraField: "value",
    };
    const result = ModelConfigSchema.safeParse(configWithExtra);
    // Empty schema will strip extra fields
    expect(result.success).toBe(true);
  });
});

describe("GenerateRequestSchema", () => {
  it("should validate valid generate request", () => {
    const validRequest = {
      issueKey: "PROJ-123",
      storyTitle: "User story title",
      description: "Description text",
      acceptanceCriteria: "AC text",
      modelConfig: {},
    };
    const result = GenerateRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it("should apply default values", () => {
    const minimalRequest = {
      issueKey: "PROJ-123",
      storyTitle: "Title",
      description: "Description",
    };
    const result = GenerateRequestSchema.parse(minimalRequest);
    expect(result.acceptanceCriteria).toBe("");
    expect(result.modelConfig).toEqual({});
  });

  it("should reject request without issue key", () => {
    const invalidRequest = {
      issueKey: "",
      storyTitle: "Title",
      description: "Description",
    };
    const result = GenerateRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it("should reject request without story title", () => {
    const invalidRequest = {
      issueKey: "PROJ-123",
      storyTitle: "",
      description: "Description",
    };
    const result = GenerateRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it("should reject request without description", () => {
    const invalidRequest = {
      issueKey: "PROJ-123",
      storyTitle: "Title",
      description: "",
    };
    const result = GenerateRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

describe("JiraAuthSchema", () => {
  it("should validate valid Jira auth", () => {
    const validAuth = {
      baseUrl: "https://company.atlassian.net",
      email: "user@example.com",
      apiToken: "token123",
    };
    const result = JiraAuthSchema.safeParse(validAuth);
    expect(result.success).toBe(true);
  });

  it("should reject invalid URL", () => {
    const invalidAuth = {
      baseUrl: "not-a-url",
      email: "user@example.com",
      apiToken: "token123",
    };
    const result = JiraAuthSchema.safeParse(invalidAuth);
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const invalidAuth = {
      baseUrl: "https://company.atlassian.net",
      email: "not-an-email",
      apiToken: "token123",
    };
    const result = JiraAuthSchema.safeParse(invalidAuth);
    expect(result.success).toBe(false);
  });

  it("should reject empty API token", () => {
    const invalidAuth = {
      baseUrl: "https://company.atlassian.net",
      email: "user@example.com",
      apiToken: "",
    };
    const result = JiraAuthSchema.safeParse(invalidAuth);
    expect(result.success).toBe(false);
  });
});

