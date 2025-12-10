# Jira Genius

AI-powered test case generation for Jira user stories using Next.js 15 and Claude Sonnet 4.5 (or Gemini/OpenAI).

## Features

- 🔐 **Jira Integration**: Authenticate using API tokens and fetch user stories directly from Jira
- 🤖 **AI-Powered Generation**: Generate comprehensive test cases using Claude Sonnet 4.5, Gemini, or OpenAI
- ✏️ **Inline Editing**: Edit test cases, reorder steps, and customize priorities
- 📤 **Export Options**: Export test cases as CSV (Excel-compatible) or JSON for use in your test management tools
- 🎨 **Modern UI**: Built with Next.js 15, TypeScript, Tailwind CSS, and ShadCN UI
- 💾 **Session Persistence**: Test cases are saved in browser storage during your session
- 🔄 **Generate More**: Generate additional test cases with different configurations
- ➕ **Manual Test Cases**: Add custom test cases manually
- 🧹 **Clear All**: Remove all test cases with confirmation dialog
- 📄 **File Upload & Extraction**: Upload PDF, DOCX, TXT files and extract requirements from their content
- 📚 **Confluence Integration**: Fetch and extract content from Confluence pages to enhance test case generation
- 🔗 **Requirements Traceability**: Automatically extract requirements from user stories, files, and Confluence pages
- 📊 **Coverage Dashboard**: Visualize requirement coverage metrics and identify gaps
- 🔄 **Traceability Matrix**: View and manage links between test cases and requirements
- 🤝 **Multi-User Support**: Each user authenticates with their own Jira credentials (see [MULTI_USER_SETUP.md](MULTI_USER_SETUP.md))

## Recent Changes

### Latest Features
- **Requirements Traceability System**: Automatic extraction and management of requirements from multiple sources
- **File Upload Support**: Upload and extract text from PDF, DOCX, and TXT files to enhance test case generation
- **Confluence Integration**: Fetch Confluence pages by URL and extract content for comprehensive test coverage
- **Coverage Analysis**: Visual dashboard showing requirement coverage metrics and gaps
- **Traceability Matrix**: Interactive matrix showing which test cases cover which requirements
- **Auto-Linking**: Intelligent semantic matching to automatically link test cases to requirements
- **Multi-User Architecture**: Support for multiple users with individual Jira authentication
- **Enhanced Export**: Improved CSV and JSON export formats with requirement traceability data

## Prerequisites

- **Node.js**: Version 18 or higher
- **Jira Account**: With API token access
- **LLM API Key**: Anthropic Claude (default), Google Gemini, or OpenAI API key

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd jira-test-generator
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure the LLM provider:

```env
# Jira Configuration - LEAVE EMPTY (users will enter via login UI)
# Each user will provide their own Jira credentials when they log in
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=

# LLM Configuration (REQUIRED)
LLM_PROVIDER=anthropic  # Options: anthropic, gemini, openai

# LLM API Keys - Set the one matching your LLM_PROVIDER (REQUIRED)
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929  # Optional: specify model (default: claude-sonnet-4-5-20250929)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash  # Optional: specify model (default: gemini-2.5-flash)
OPENAI_API_KEY=your-openai-api-key
```

**Important:** 
- ✅ **Jira credentials**: Leave empty - each user enters their own credentials via the login UI
- ✅ **LLM API Key**: Set in `.env.local` - this is shared across all users

### 3. Get Your LLM API Key

#### Anthropic API Key (Default - Claude Sonnet 4.5)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create a new API key
3. Copy the key to `ANTHROPIC_API_KEY` in `.env.local`
4. Optionally set `ANTHROPIC_MODEL` to use a different Claude model

#### Gemini API Key (Alternative)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key to `GEMINI_API_KEY` in `.env.local`
4. Set `LLM_PROVIDER=gemini`

#### OpenAI API Key (Alternative)

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key to `OPENAI_API_KEY` in `.env.local`
4. Set `LLM_PROVIDER=openai`

### 4. User Instructions for Jira Authentication

**Each user** will need to:

1. Generate their own Jira API token from [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. When they open the application, click "Connect to Jira"
3. Enter their:
   - Jira Base URL (e.g., `https://company.atlassian.net`)
   - Email address (their Atlassian account email)
   - API Token (the token they generated)
4. Their credentials are stored in their browser's localStorage for convenience

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build for Production

```bash
npm run build
npm start
```

## Documentation

- 📖 **[User Guide](USER_GUIDE.md)**: Comprehensive step-by-step guide for using the application
- 👥 **[Multi-User Setup Guide](MULTI_USER_SETUP.md)**: Instructions for deploying in multi-user environments
- 🔒 **[Security Guide](SECURITY.md)**: Security considerations and OAuth implementation guide
- 📚 **This README**: Setup, configuration, and technical documentation

## Usage

For detailed usage instructions, see the [User Guide](USER_GUIDE.md). Quick start below:

### Step 1: Authenticate

1. Click "Connect to Jira" on the home page
2. Enter your Jira Base URL, Email, and API Token
3. Click "Connect" to validate your credentials

### Step 2: Fetch a User Story

1. Enter a Jira issue key (e.g., `PROJ-123`) in the "Fetch Jira User Story" section
2. Click "Fetch Issue"
3. The story details will be displayed, including description and acceptance criteria
4. Optionally edit the description or acceptance criteria inline

### Step 2.5: Add Additional Context (Optional)

**Upload Files:**
1. Click "Upload Files" in the issue fetcher section
2. Select PDF, DOCX, or TXT files containing requirements or specifications
3. Files are automatically processed and text is extracted
4. Content is included in test case generation

**Fetch Confluence Page:**
1. Click "Fetch Confluence Page" in the issue fetcher section
2. Paste a Confluence page URL (e.g., `https://company.atlassian.net/wiki/spaces/SPACE/pages/123456/...`)
3. The page content is fetched and included in test case generation

### Step 2.6: Extract Requirements (Optional)

1. After adding files or Confluence content, click "Coverage & Traceability"
2. Requirements are automatically extracted from:
   - User story description
   - Acceptance criteria
   - Uploaded files
   - Confluence pages
3. Review and edit requirements in the Requirements Manager
4. Requirements are categorized (functional, API, flow, edge case, etc.) and prioritized

### Step 3: Generate Test Cases

1. Configure generation options:
   - **Detail Level**: Choose between "Concise" or "Detailed" test cases
   - **Count**: Select 3-7 test cases to generate
2. Click "Generate Test Cases"
3. Wait 10-30 seconds for the AI to generate test cases

### Step 4: Review and Edit

1. Review the generated test cases
2. Click the edit icon (✏️) to modify any test case
3. Add/remove steps using the "+" and trash icons
4. Reorder steps using the up/down arrows
5. Change priorities (Low, Medium, High)
6. View linked requirements (if requirements were extracted)
7. Click "Save" when done editing

### Step 5: Analyze Coverage (If Requirements Extracted)

1. View the Coverage Dashboard to see:
   - Total requirements and coverage percentage
   - Coverage by source (user story, acceptance criteria, files, Confluence)
   - Coverage by category (functional, API, flow, etc.)
   - Uncovered requirements
2. Toggle the Traceability Matrix to see:
   - Which test cases cover which requirements
   - Manually link/unlink test cases to requirements
   - Filter by source, category, or coverage status
3. Export traceability matrix as CSV if needed

### Step 6: Export Test Cases

1. Click **"Export CSV"** to download test cases in Excel-compatible CSV format
   - Includes UTF-8 BOM for proper Excel encoding
   - All test steps and metadata are included
   - Filename includes issue key and timestamp
2. Click **"Export JSON"** to download test cases in JSON format
   - Pretty-printed for readability
   - Complete test case structure preserved
   - Filename includes issue key and timestamp

**Note**: Exported files can be imported into your test management tools (Jira Xray, TestRail, qTest, etc.) or used for documentation purposes. The CSV export includes requirement IDs for traceability.

**Additional Exports:**
- **Traceability Matrix CSV**: Export the full traceability matrix showing requirement-to-test-case mappings
- **Coverage Report JSON**: Export detailed coverage metrics and analysis

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Tests cover:
- ADF (Atlassian Document Format) to plain text conversion
- CSV export with special character handling
- Zod schema validation
- Edge cases and error handling

## Security Considerations

⚠️ **IMPORTANT**: This MVP stores authentication credentials in browser localStorage for development convenience.

### Current Implementation

- Jira credentials are stored in localStorage
- Credentials persist across browser sessions
- API tokens are sent to the Next.js server for Jira API calls
- LLM API keys are kept server-side only (never exposed to client)

### For Production Use

You should implement one of the following:

1. **Session-based Authentication**: Use httpOnly cookies with server-side session storage
2. **OAuth 2.0**: Implement Jira OAuth flow (see SECURITY.md for guidance)
3. **Credential Encryption**: Encrypt credentials before storing in localStorage

See `SECURITY.md` for detailed security recommendations and OAuth implementation guide.

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: ShadCN UI
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **LLM Integration**: Anthropic Claude / Google Gemini / OpenAI SDKs
- **File Processing**: Mammoth (DOCX), PDF extraction libraries
- **Confluence Integration**: Custom Confluence API client with ADF/HTML parsing

### Project Structure

```
├── app/
│   ├── api/
│   │   ├── confluence/page/route.ts   # Confluence page fetching endpoint
│   │   ├── files/extract/route.ts    # File text extraction endpoint
│   │   ├── generate/route.ts         # Test case generation endpoint
│   │   ├── jira/
│   │   │   ├── auth/validate/route.ts # Jira authentication validation
│   │   │   ├── issue/[issueKey]/route.ts  # Jira issue proxy endpoint
│   │   │   └── xray/upload/route.ts  # Jira Xray upload endpoint
│   ├── layout.tsx                    # Root layout with providers
│   └── page.tsx                      # Main dashboard
├── components/
│   ├── auth/
│   │   ├── login-modal.tsx          # Authentication modal
│   │   └── auth-provider.tsx        # Auth context provider
│   ├── testcase/
│   │   ├── generation-controls.tsx  # Test case generation controls
│   │   ├── testcase-card.tsx        # Individual test case editor
│   │   └── testcase-list.tsx        # Test case list with export buttons
│   ├── traceability/
│   │   ├── coverage-dashboard.tsx   # Coverage metrics dashboard
│   │   ├── requirements-manager.tsx  # Requirements management UI
│   │   └── traceability-matrix.tsx   # Traceability matrix view
│   ├── issue-fetcher.tsx            # Jira issue fetcher with file/Confluence support
│   └── ui/                           # ShadCN UI components
├── lib/
│   ├── adf-converter.ts             # ADF to plain text converter
│   ├── confluence-server.ts        # Confluence API integration
│   ├── coverage-analyzer.ts         # Requirement coverage analysis
│   ├── csv-export.ts                 # CSV export utility (Excel-compatible)
│   ├── json-export.ts               # JSON export utility
│   ├── jira-client.ts                # Jira API client
│   ├── jira-server.ts               # Server-side Jira utilities
│   ├── llm-client.ts                 # LLM integration (Claude/Gemini/OpenAI)
│   ├── requirement-extractor.ts     # Requirement extraction from multiple sources
│   ├── schemas.ts                    # Zod validation schemas
│   ├── traceability-export.ts       # Traceability matrix export
│   ├── xray-client.ts               # Jira Xray integration
│   └── __tests__/                   # Unit tests
├── store/
│   ├── auth-store.ts                 # Authentication state
│   ├── testcase-store.ts            # Test case state management
│   └── traceability-store.ts        # Requirements and traceability state
└── .env.example                      # Environment variables template
```

## Troubleshooting

### "Invalid credentials" error

- Verify your Jira base URL doesn't have a trailing slash
- Ensure you're using your Atlassian account email (not username)
- Generate a fresh API token from Atlassian
- Check that your Jira instance is accessible

### "LLM API key not configured" error

- Verify the API key is set in `.env.local`
- Restart the dev server after changing environment variables
- Check that `LLM_PROVIDER` matches your configured API key

### Test case generation fails or returns invalid JSON

- Try a different LLM provider (some are more reliable for structured output)
- Use "Concise" detail level for faster, more reliable results
- Ensure your user story has clear description and acceptance criteria
- Check that uploaded files were successfully processed (look for file status indicators)
- Verify Confluence page URL is accessible and content was fetched

### File upload fails or extraction returns empty content

- Ensure file format is supported (PDF, DOCX, TXT)
- Check file size (very large files may timeout)
- Verify file is not password-protected or corrupted
- For PDFs, ensure text is selectable (not scanned images)

### Confluence page fetch fails

- Verify the Confluence URL format is correct
- Ensure you have access to the Confluence space
- Check that your Jira credentials have Confluence access
- Some Confluence instances may require additional permissions

### CSV export doesn't open correctly in Excel

- The export includes UTF-8 BOM for Excel compatibility
- Try importing as UTF-8 encoded CSV in Excel
- Use "Export JSON" as an alternative

## Export Formats

### CSV Format
- **Excel Compatible**: Includes UTF-8 BOM for proper character encoding
- **Columns**: ID, Title, Preconditions, Steps, Priority, Requirement IDs
- **Steps Format**: Numbered steps with actions and expected results
- **Special Characters**: Properly escaped for CSV compatibility
- **Requirement Traceability**: Includes linked requirement IDs for each test case

### JSON Format
- **Structure**: Complete test case objects with all metadata
- **Pretty Printed**: Human-readable formatting
- **Schema**: Validates against Zod schemas for consistency
- **Requirement Links**: Includes requirementIds array for traceability

### Traceability Matrix CSV
- **Format**: Requirements as rows, test cases as columns
- **Coverage Indicators**: Checkmarks (✓) show which requirements are covered by which test cases
- **Metadata**: Includes requirement source, category, and priority

### Coverage Report JSON
- **Metrics**: Total, covered, and uncovered requirement counts
- **Breakdown**: Coverage by source and category
- **Details**: Full requirement and test case mappings

All formats include timestamps and issue keys in filenames for easy organization.

## Advanced Configuration

### Model Selection

You can specify which models to use by setting environment variables:

#### Anthropic Model (Default Provider)

```env
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929  # Default
# or
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

#### Gemini Model (Alternative Provider)

```env
GEMINI_MODEL=gemini-2.5-flash  # Default
# or
GEMINI_MODEL=gemini-pro
```

### Multi-User Deployment

For multi-user environments, see the [Multi-User Setup Guide](MULTI_USER_SETUP.md) for detailed instructions on:
- Setting up shared LLM API keys
- User authentication flow
- Deployment recommendations
- Security considerations

## Future Enhancements

Potential features for future development:

1. **OAuth 2.0 Integration**: Replace API token authentication with OAuth flow
2. **Batch Export**: Export multiple test case sets at once
3. **Custom Templates**: Define custom export formats
4. **Test Case Import**: Import test cases from CSV/JSON files
5. **Image Analysis**: Enhanced image processing from Confluence pages for visual requirements
6. **Batch Processing**: Process multiple Jira issues at once

See `SECURITY.md` for OAuth implementation guidance.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section above

---

Built with ❤️ using Next.js, TypeScript, and AI
