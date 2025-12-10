# Security Guide

This document outlines security considerations for the Jira Genius and provides guidance for implementing more secure authentication methods.

## Current Security Model (MVP)

### Authentication Storage

The current implementation uses **browser localStorage** to store Jira credentials for development convenience. While this is acceptable for local development and testing, it has security implications:

**Risks:**
- Credentials persist indefinitely in browser storage
- Vulnerable to XSS attacks if malicious scripts are injected
- Accessible via browser developer tools
- No server-side session management

**Current Flow:**
1. User enters Jira credentials in login modal
2. Credentials validated via `/rest/api/3/myself` endpoint
3. Credentials stored in localStorage via Zustand persist middleware
4. Client sends credentials to Next.js API routes for Jira operations
5. Next.js API routes use credentials to call Jira API

### LLM API Keys

**Protected:** LLM API keys (Gemini, OpenAI, Anthropic) are kept server-side only:
- Stored in `.env.local` (never committed to version control)
- Only accessible to Next.js API routes
- Never exposed to client-side JavaScript
- Used only in `/app/api/generate/route.ts`

This is the correct approach and should be maintained.

## Security Best Practices

### For Local Development

If using this tool locally on your own machine:

1. **Use dedicated API tokens**: Create Jira API tokens specifically for this tool
2. **Revoke when done**: Delete tokens after use from [Atlassian Security Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
3. **Keep .env.local private**: Never commit or share this file
4. **Use HTTPS**: Always access Jira over HTTPS (enforced by Atlassian)

### For Production Deployment

⚠️ **DO NOT deploy to production with localStorage authentication**

Implement one of these secure alternatives:

## Production Security Options

### Option 1: Session-Based Authentication (Recommended for Internal Tools)

Store credentials server-side with httpOnly cookies.

#### Implementation Steps:

1. **Install session management library:**

```bash
npm install iron-session
```

2. **Update `/app/api/auth/login/route.ts` (new file):**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { validateAuth } from "@/lib/jira-client";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { baseUrl, email, apiToken } = body;
  
  // Validate credentials
  const result = await validateAuth(baseUrl, email, apiToken);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  
  // Create session
  const session = await getIronSession(cookies(), {
    password: process.env.SESSION_SECRET!,
    cookieName: "jira_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
    },
  });
  
  session.user = { baseUrl, email, apiToken };
  await session.save();
  
  return NextResponse.json({ success: true, user: result.user });
}
```

3. **Add session middleware to API routes:**

Check session in `/app/api/jira/issue/[issueKey]/route.ts` and `/app/api/generate/route.ts`

4. **Update `store/auth-store.ts`:**

Remove localStorage persistence, fetch credentials from session endpoint

5. **Add `.env.local` variable:**

```env
SESSION_SECRET=your-secret-key-at-least-32-characters-long
```

### Option 2: OAuth 2.0 (Recommended for Public Tools)

Implement Jira OAuth 2.0 flow for user authorization without handling passwords.

#### Prerequisites:

1. Register your app in [Atlassian Developer Console](https://developer.atlassian.com/console)
2. Configure OAuth 2.0 (3LO) with callback URL
3. Note your Client ID and Client Secret

#### Implementation Steps:

1. **Add OAuth environment variables:**

```env
JIRA_OAUTH_CLIENT_ID=your-client-id
JIRA_OAUTH_CLIENT_SECRET=your-client-secret
JIRA_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

2. **Create OAuth flow endpoints:**

`/app/api/auth/authorize/route.ts`:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const authUrl = new URL("https://auth.atlassian.com/authorize");
  authUrl.searchParams.set("audience", "api.atlassian.com");
  authUrl.searchParams.set("client_id", process.env.JIRA_OAUTH_CLIENT_ID!);
  authUrl.searchParams.set("scope", "read:jira-work write:jira-work");
  authUrl.searchParams.set("redirect_uri", process.env.JIRA_OAUTH_REDIRECT_URI!);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("prompt", "consent");
  
  return NextResponse.redirect(authUrl.toString());
}
```

`/app/api/auth/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  
  if (!code) {
    return NextResponse.redirect("/error");
  }
  
  // Exchange code for access token
  const tokenResponse = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.JIRA_OAUTH_CLIENT_ID,
      client_secret: process.env.JIRA_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: process.env.JIRA_OAUTH_REDIRECT_URI,
    }),
  });
  
  const tokens = await tokenResponse.json();
  
  // Store tokens in session (see Option 1)
  // Redirect to dashboard
  
  return NextResponse.redirect("/");
}
```

3. **Update `lib/jira-client.ts`:**

Replace Basic Auth header with Bearer token:

```typescript
headers: {
  "Authorization": `Bearer ${accessToken}`,
  "Accept": "application/json",
}
```

4. **Handle token refresh:**

OAuth tokens expire. Implement refresh token flow to get new access tokens.

5. **Update UI:**

Replace manual credential input with "Sign in with Atlassian" button that redirects to `/api/auth/authorize`

### Option 3: Backend Proxy (For Enterprise)

Run a separate backend service that handles all Jira authentication:

1. Backend service stores Jira credentials securely
2. Frontend authenticates users separately (e.g., SSO)
3. Frontend calls backend API which proxies to Jira
4. No Jira credentials ever touch the frontend

## Environment Variable Protection

### Development

- Use `.env.local` for secrets (gitignored by default)
- Never commit `.env.local` to version control
- Use `.env.example` for documentation only

### Production

Use your deployment platform's secret management:

- **Vercel**: Use Environment Variables in project settings
- **Netlify**: Use Environment Variables in site settings
- **AWS**: Use AWS Secrets Manager or Parameter Store
- **Docker**: Use Docker secrets or Kubernetes secrets

## Rate Limiting

The current implementation includes basic in-memory rate limiting for the LLM generation endpoint:

```typescript
// In app/api/generate/route.ts
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute
```

For production, implement:

1. **Redis-based rate limiting** for multi-instance deployments
2. **Per-user rate limits** instead of per-IP
3. **Gradual backoff** for repeated violations
4. **API key quotas** for LLM usage tracking

## Data Privacy

### User Data

- Test cases stored in browser localStorage (client-side only)
- No test case data sent to servers except during generation
- Clear localStorage to delete all local data

### Jira Data

- Fetched issue data displayed but not persistently stored
- Issue content sent to LLM for test case generation
- Consider data sensitivity before using external LLM APIs

### LLM Privacy

⚠️ **Be aware:** When using external LLM APIs (Gemini, OpenAI, Anthropic):

- Your Jira issue data is sent to the LLM provider
- Review provider's data handling policies
- For sensitive data, consider:
  - Self-hosted LLM options
  - On-premises deployment
  - Data anonymization before generation

## CORS and CSP

For production deployment, configure:

1. **CORS**: Restrict API access to your domain
2. **Content Security Policy**: Prevent XSS attacks
3. **HTTPS**: Enforce HTTPS in production

Add to `next.config.js`:

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://yourdomain.com" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
        ],
      },
    ];
  },
};
```

## Security Checklist

Before deploying to production:

- [ ] Replace localStorage authentication with session or OAuth
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS (required for secure cookies)
- [ ] Implement proper session management
- [ ] Set up rate limiting with persistent storage
- [ ] Configure CORS and CSP headers
- [ ] Review LLM data privacy implications
- [ ] Set up monitoring and logging (without logging secrets)
- [ ] Implement token refresh for OAuth
- [ ] Add session timeout and logout functionality
- [ ] Test authentication edge cases
- [ ] Conduct security audit

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email security concerns to: [your-security-email]
3. Include detailed description and reproduction steps
4. Allow reasonable time for fix before public disclosure

## Additional Resources

- [Atlassian OAuth 2.0 Guide](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Iron Session Documentation](https://github.com/vvo/iron-session)

---

**Remember:** Security is an ongoing process. Regular audits and updates are essential for maintaining a secure application.

