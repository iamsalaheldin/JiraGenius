/**
 * Validate Jira credentials by calling our backend API
 * This avoids CORS issues and browser limitations with Buffer API
 */
export async function validateAuth(
  baseUrl: string,
  email: string,
  token: string
): Promise<{ valid: boolean; user?: any; error?: string }> {
  try {
    const response = await fetch("/api/jira/auth/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        baseUrl,
        email,
        apiToken: token,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { 
        valid: false, 
        error: data.error || "Authentication failed" 
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Jira auth validation error:", error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : "Network error" 
    };
  }
}


