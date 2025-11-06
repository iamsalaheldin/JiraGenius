import { z } from "zod";

// Test Step Schema
export const TestStepSchema = z.object({
  id: z.string(),
  action: z.string().min(1, "Action is required"),
  expectedResult: z.string().min(1, "Expected result is required"),
});

export type TestStep = z.infer<typeof TestStepSchema>;

// Test Case Schema
export const TestCaseSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  preconditions: z.string().optional().default(""),
  steps: z.array(TestStepSchema).min(1, "At least one step is required"),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
});

export type TestCase = z.infer<typeof TestCaseSchema>;

// Model Configuration Schema
export const ModelConfigSchema = z.object({});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// Generate Request Schema
export const GenerateRequestSchema = z.object({
  issueKey: z.string().min(1, "Issue key is required"),
  storyTitle: z.string().min(1, "Story title is required"),
  description: z.string().min(1, "Description is required"),
  acceptanceCriteria: z.string().optional().default(""),
  additionalContext: z.string().optional().default(""),
  modelConfig: ModelConfigSchema.optional().default({}),
  existingTestCases: z.array(TestCaseSchema).optional(),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

// Jira Auth Schema
export const JiraAuthSchema = z.object({
  baseUrl: z.string().url("Invalid Jira URL"),
  email: z.string().email("Invalid email address"),
  apiToken: z.string().min(1, "API token is required"),
});

export type JiraAuth = z.infer<typeof JiraAuthSchema>;

// Jira Issue Schema (for API response)
export const JiraIssueSchema = z.object({
  key: z.string(),
  fields: z.object({
    summary: z.string(),
    description: z.any(), // ADF format
    issuetype: z.object({
      name: z.string(),
    }).optional(),
    status: z.object({
      name: z.string(),
    }).optional(),
  }),
});

export type JiraIssue = z.infer<typeof JiraIssueSchema>;

// Parsed Issue Schema (after ADF conversion)
export const ParsedIssueSchema = z.object({
  key: z.string(),
  summary: z.string(),
  description: z.string(),
  acceptanceCriteria: z.string().optional(),
  issueType: z.string().optional(),
  status: z.string().optional(),
});

export type ParsedIssue = z.infer<typeof ParsedIssueSchema>;

