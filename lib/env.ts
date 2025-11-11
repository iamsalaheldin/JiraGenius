import { z } from "zod";

// Helper to transform empty strings to undefined
const optionalString = z.string().transform(val => val || undefined).optional();

const envSchema = z.object({
  // Jira credentials are now passed from the client, not from env vars
  // These are kept for backward compatibility but transformed to truly optional
  JIRA_BASE_URL: optionalString,
  JIRA_EMAIL: optionalString,
  JIRA_API_TOKEN: optionalString,
  // LLM provider configuration
  LLM_PROVIDER: z.enum(["gemini", "openai", "anthropic"]).default("gemini"),
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: optionalString, // Optional: specify Gemini model name (e.g., "gemini-pro", "models/gemini-pro")
  OPENAI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

// Validate environment variables on server side
export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  
  return parsed.data;
}

// Get LLM API key based on provider
export function getLLMApiKey(provider?: string): string | undefined {
  const env = validateEnv();
  const selectedProvider = provider || env.LLM_PROVIDER;
  
  switch (selectedProvider) {
    case "gemini":
      return env.GEMINI_API_KEY;
    case "openai":
      return env.OPENAI_API_KEY;
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
    default:
      return undefined;
  }
}

