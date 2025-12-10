# Product Overview

Jira Genius is an AI-powered test case generation tool for Jira user stories. It helps QA engineers automatically generate comprehensive test cases using LLM providers (Claude, Gemini, or OpenAI).

## Core Features

- **Jira Integration**: Fetch user stories directly from Jira using API token authentication
- **AI Test Generation**: Generate test cases with configurable detail levels (concise/detailed) and counts (3-7)
- **Multi-Source Requirements**: Extract requirements from user stories, uploaded files (PDF/DOCX/TXT), and Confluence pages
- **Requirements Traceability**: Automatic requirement extraction, coverage analysis, and traceability matrix
- **Test Case Management**: Inline editing, reordering steps, priority assignment, and CRUD operations
- **Export Options**: CSV (Excel-compatible with UTF-8 BOM) and JSON formats with traceability data
- **Multi-User Support**: Each user authenticates with their own Jira credentials stored in browser localStorage

## LLM Providers

- **Anthropic Claude Sonnet 4.5** (default) - Best for vision/image analysis
- **Google Gemini** (gemini-2.5-flash)
- **OpenAI** (GPT-4o-mini)

Provider is configured via `LLM_PROVIDER` environment variable. API keys are server-side only.

## Security Model

- **Development/MVP**: Jira credentials stored in browser localStorage (per-user)
- **Production**: Should implement OAuth 2.0 or session-based authentication (see SECURITY.md)
- **LLM API Keys**: Server-side only, never exposed to client

## Key User Flows

1. User authenticates with Jira credentials
2. Fetch Jira issue OR upload content directly (standalone mode)
3. Optionally upload files or fetch Confluence pages for additional context
4. Extract requirements using AI (optional but recommended)
5. Generate test cases with AI (auto-links to requirements)
6. Edit/manage test cases inline
7. Export to CSV/JSON with traceability data
