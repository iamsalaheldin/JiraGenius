# Multi-User Setup Guide

## How Authentication Works

The Jira Genius is designed for **multi-user environments** where different users need to authenticate with their own Jira credentials.

## Architecture

### What's Shared (Server-Side)
- **LLM API Key**: Configured in `.env.local` on the server
- All users share the same LLM provider (Claude/Gemini/OpenAI)

### What's Individual (Client-Side)
- **Jira Credentials**: Each user enters their own credentials
- Stored in browser localStorage (per user, per browser)
- Never shared between users

## Setup Instructions

### 1. Administrator Setup (One Time)

As the application administrator, you only need to configure the LLM provider:

```bash
# Copy the environment template
cp .env.example .env.local

# Edit .env.local
nano .env.local
```

In `.env.local`, configure ONLY the LLM settings:

```env
# Jira Configuration - LEAVE EMPTY
# Each user will provide their own credentials via the UI
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=

# LLM Configuration - SET THIS
LLM_PROVIDER=anthropic

# LLM API Key - SET THIS
ANTHROPIC_API_KEY=your-actual-anthropic-api-key
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
GEMINI_API_KEY=
OPENAI_API_KEY=
```

Then start the application:

```bash
npm run dev
# or for production
npm run build
npm start
```

### 2. User Instructions (Each User)

Share these instructions with each user:

#### Step 1: Generate Your Jira API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **"Create API token"**
3. Give it a descriptive label (e.g., "Jira Genius")
4. Copy the generated token (you won't be able to see it again!)

#### Step 2: Access the Application

1. Open the application URL (e.g., `http://localhost:3000`)
2. You'll see a welcome page with a **"Connect to Jira"** button
3. Click the button to open the login modal

#### Step 3: Enter Your Credentials

In the login modal, enter:
- **Jira Base URL**: Your company's Jira instance (e.g., `https://yourcompany.atlassian.net`)
- **Email**: Your Atlassian account email
- **API Token**: The token you generated in Step 1

#### Step 4: Start Using the Tool

Once authenticated:
- Your credentials are saved in your browser's localStorage
- You'll remain logged in until you click "Logout" or clear browser data
- You can now fetch Jira issues and generate test cases

## How It Works

### Authentication Flow

```
┌─────────────┐
│   User A    │───> Opens app ──> Not authenticated ──> Login Modal
└─────────────┘                         │
                                        ▼
                              Enters User A's credentials
                                        │
                                        ▼
                        ┌────────────────────────────────┐
                        │ Validates against Jira API     │
                        │ (calls /rest/api/3/myself)     │
                        └────────────────────────────────┘
                                        │
                                        ▼
                          Credentials stored in User A's
                          browser localStorage
                                        │
                                        ▼
                          User A can access Jira issues
                          using their own permissions


┌─────────────┐
│   User B    │───> Opens app ──> Not authenticated ──> Login Modal
└─────────────┘                         │
                                        ▼
                              Enters User B's credentials
                                        │
                                        ▼
                          Credentials stored in User B's
                          browser localStorage
                                        │
                                        ▼
                          User B can access Jira issues
                          using their own permissions
```

### Test Case Generation Flow

```
User's Browser                 Your Server              External APIs
─────────────────              ─────────────            ──────────────
                               
1. Fetch Jira Issue
   │
   ├──[User's Creds]──────────────>│
   │                               │
   │                               ├──[User's Creds]─────────>│
   │                               │                           │ Jira API
   │                               │<─────[Issue Data]─────────│
   │                               │
   │<──────[Issue Data]────────────│
   │

2. Generate Test Cases
   │
   ├──[Issue Data]─────────────────>│
   │                               │
   │                               ├──[Prompt + Server's LLM Key]──>│
   │                               │                                 │ Claude/
   │                               │<──────[Generated Tests]─────────│ Gemini/
   │                               │                                 │ OpenAI
   │<──[Generated Tests]───────────│
   │

3. Edit & Export
   │
   └──[All local in browser]
```

## Security Considerations

### Current Implementation

✅ **Good:**
- Each user uses their own Jira credentials
- Jira credentials never stored on the server
- LLM API key protected on server-side

⚠️ **Limitations:**
- Credentials stored in browser localStorage (vulnerable to XSS)
- No server-side session management
- Suitable for internal/trusted environments

### For Production

For production deployment, consider implementing:

1. **Session-based authentication** with httpOnly cookies
2. **OAuth 2.0** for Jira (no password/token handling)
3. **Encryption** of localStorage data

See `SECURITY.md` for detailed implementation guides.

## User Management

### Adding New Users

No action needed! Users can self-serve:
1. Share the application URL
2. Each user creates their own Jira API token
3. They log in with their own credentials

### Removing User Access

Users can revoke their own access:
1. **In the app**: Click "Logout" to clear local credentials
2. **In Jira**: Revoke the API token from [Atlassian Security Settings](https://id.atlassian.com/manage-profile/security/api-tokens)

### Monitoring Usage

Currently, the application includes:
- Server-side logging for test case generation
- Rate limiting (10 requests per minute per IP)
- No user tracking or analytics

## Troubleshooting

### User Can't Log In

Check:
- ✅ Jira Base URL is correct (no trailing slash)
- ✅ Email is the Atlassian account email (not username)
- ✅ API token was copied correctly (no extra spaces)
- ✅ User has access to the Jira instance

### User Keeps Getting Logged Out

Check:
- ✅ Browser is not in incognito/private mode
- ✅ Browser allows localStorage
- ✅ No browser extensions blocking storage
- ✅ Jira API token hasn't been revoked

### Different Users See Each Other's Data

This **shouldn't happen** because:
- Each browser has separate localStorage
- No data is shared between users on the server

If this occurs:
- Users may be on the same browser/profile
- They should use different browser profiles or clear browser data

## Deployment Recommendations

### Internal Network
- Deploy on internal server
- Users access via company network
- No additional authentication needed (rely on Jira tokens)

### Public Internet
- Implement OAuth 2.0 (see `SECURITY.md`)
- Add application-level authentication
- Use HTTPS (required for secure cookies)
- Consider rate limiting per user

### Cloud Platforms

**Vercel/Netlify:**
```bash
# Set only the LLM API key in environment variables
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
LLM_PROVIDER=anthropic

# Leave Jira variables empty
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
```

**Docker:**
```dockerfile
# In your Dockerfile, only include LLM env vars
ENV LLM_PROVIDER=anthropic
ENV ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
ENV ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
```

## FAQ

**Q: Can I pre-configure Jira credentials for all users?**
A: No, by design. Each user should use their own credentials for proper Jira permissions and audit trails.

**Q: Can different users have different LLM providers?**
A: Not currently. All users share the server-configured LLM provider. This could be added as a feature.

**Q: Where are generated test cases stored?**
A: In the user's browser localStorage. They're not sent to or stored on the server.

**Q: How much does it cost to run?**
A: Only the LLM API costs (based on usage). The application itself is free and open-source.

**Q: Can users export their test cases?**
A: Yes! Users can export to CSV (Excel-compatible) or JSON at any time.

---

**Questions?** Check `README.md` and `SECURITY.md` for more details.

