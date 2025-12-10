# Jira Genius

AI-powered test case generation for Jira user stories using Next.js 15 and Claude Sonnet 4.5 (or Gemini/OpenAI).

## Features

### Core Capabilities
- 🔐 **Jira Integration**: Authenticate using API tokens and fetch user stories directly from Jira
- 🤖 **AI-Powered Generation**: Generate comprehensive test cases using Claude Sonnet 4.5, Gemini, or OpenAI
- ✏️ **Inline Editing**: Edit test cases, reorder steps, and customize priorities
- 📤 **Export Options**: Export test cases as CSV (Excel-compatible) or JSON for use in your test management tools
- 🎨 **Modern UI**: Built with Next.js 15, TypeScript, Tailwind CSS, and ShadCN UI
- 💾 **Session Persistence**: Test cases are saved in browser storage during your session

### Dual Workflow Support
- 🔄 **Jira-Based Workflow**: Traditional workflow starting with Jira user stories
- 📄 **Standalone Content Workflow**: Generate test cases from files and Confluence pages without Jira issues
- 🎯 **Full Feature Parity**: Both workflows support all features (requirements extraction, coverage, traceability)

### Content Sources
- 📄 **File Upload & Extraction**: Upload PDF, DOCX, TXT files and extract requirements from their content
- 📚 **Confluence Integration**: Fetch and extract content from Confluence pages (including images) to enhance test case generation
- 🔍 **Multi-Source Analysis**: Combine Jira issues, files, and Confluence pages for comprehensive test coverage

### Requirements & Traceability
- 🤖 **AI-Powered Requirement Extraction**: LLM-based extraction that breaks down complex statements into atomic, testable requirements
- 🔗 **Automatic Requirement Extraction**: Extract requirements from user stories, acceptance criteria, files, and Confluence pages
- 📊 **Coverage Dashboard**: Visualize requirement coverage metrics, identify gaps, and analyze coverage by source and category
- 🔄 **Traceability Matrix**: Interactive matrix showing which test cases cover which requirements with manual linking support
- 🎯 **Auto-Linking**: Intelligent semantic matching automatically links test cases to relevant requirements

### Test Case Management
- 🔄 **Generate More**: Generate additional test cases with different configurations
- ➕ **Manual Test Cases**: Add custom test cases manually
- 🧹 **Clear All**: Remove all test cases with confirmation dialog
- 📝 **Step Management**: Add, remove, reorder, and edit test steps with intuitive controls

### Multi-User Support
- 🤝 **Multi-User Architecture**: Each user authenticates with their own Jira credentials (see [MULTI_USER_SETUP.md](MULTI_USER_SETUP.md))
- 🔒 **Secure Storage**: User credentials stored in browser localStorage (per-user isolation)

## Recent Changes

### Latest Features (2024)

#### 🆕 Standalone Content Upload Flow
- **Generate test cases without Jira issues**: Upload files or fetch Confluence pages directly to generate test cases
- **Dual workflow support**: Choose between Jira-based or standalone content workflows
- **Full feature parity**: All features (requirements extraction, coverage analysis, traceability) work in both modes
- **Flexible starting point**: Start testing before Jira issues are created or work with existing documentation

#### 🤖 AI-Powered Requirement Extraction
- **LLM-based extraction**: Uses Claude Sonnet 4.5, Gemini, or OpenAI to intelligently extract requirements
- **Multi-source analysis**: Extracts requirements from user stories, acceptance criteria, uploaded files, and Confluence pages
- **Atomic requirements**: Breaks down complex statements into individual testable items
- **Smart categorization**: Automatically categorizes requirements (functional, API, flow, edge case, non-functional)
- **Priority assignment**: AI assigns priority levels (high, medium, low) based on importance

#### 📊 Enhanced Requirements Traceability
- **Automatic requirement extraction**: AI analyzes all content sources and extracts testable requirements
- **Coverage Dashboard**: Visual metrics showing requirement coverage by source and category
- **Traceability Matrix**: Interactive matrix showing which test cases cover which requirements
- **Auto-linking**: Intelligent semantic matching automatically links test cases to requirements
- **Gap analysis**: Identifies uncovered requirements to ensure comprehensive test coverage

#### 🔄 Improved Workflow
- **Side-by-side options**: After authentication, choose between "Fetch Jira User Story" or "Upload Content Directly"
- **Unified experience**: Both workflows follow the same consistent user experience
- **Enhanced file management**: Better file upload UI with drag-and-drop, preview, and content editing
- **Confluence integration**: Fetch Confluence pages by URL with automatic content extraction and image support
- **Multi-User Architecture**: Each user authenticates with their own Jira credentials (see [MULTI_USER_SETUP.md](MULTI_USER_SETUP.md))
- **Enhanced Export**: CSV and JSON exports include requirement traceability data and coverage metrics

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

**Note**: Jira authentication is required even for standalone mode (used for Confluence access if needed).

### Step 2: Choose Your Workflow

After authentication, you'll see two options side-by-side:

#### Option A: Jira-Based Workflow (Traditional)

**Step 2A.1: Fetch a User Story**
1. Enter a Jira issue key (e.g., `PROJ-123`) in the "Fetch Jira User Story" section
2. Click "Fetch Issue"
3. The story details will be displayed, including description and acceptance criteria
4. Optionally edit the description or acceptance criteria inline

**Step 2A.2: Add Additional Context (Optional)**
- **Upload Files**: Click "Upload Files" and select PDF, DOCX, or TXT files
- **Fetch Confluence Page**: Click "Fetch Confluence Page" and paste a Confluence URL
- Content from both sources is automatically included in test case generation

#### Option B: Standalone Content Workflow (New)

**Step 2B.1: Upload Content Directly**
1. Use the "Upload Content Directly" card (shown alongside Jira option)
2. **Upload Files**: Drag-and-drop or select PDF, DOCX, or TXT files
   - Files are automatically processed and text is extracted
   - You can preview and edit extracted content
   - Multiple files are supported
3. **Fetch Confluence Page**: Paste a Confluence page URL
   - Page content is fetched and displayed
   - Images from Confluence pages are automatically extracted
   - Content can be edited before generation

**Benefits of Standalone Mode:**
- ✅ Generate test cases before Jira issues are created
- ✅ Work with existing documentation and specifications
- ✅ Test documentation-driven development workflows
- ✅ Full feature parity with Jira-based workflow

### Step 3: Extract Requirements (Recommended)

**AI-Powered Requirement Extraction:**
1. After adding content (Jira issue, files, or Confluence pages), click **"Coverage & Traceability"**
2. The AI automatically analyzes all content sources and extracts requirements:
   - **User story description** (Jira mode)
   - **Acceptance criteria** (Jira mode)
   - **Uploaded files** (both modes)
   - **Confluence pages** (both modes)
3. Requirements are automatically:
   - Broken down into atomic, testable items
   - Categorized (functional, API, flow, edge case, non-functional)
   - Prioritized (high, medium, low)
   - Tagged with their source
4. Review and edit requirements in the Requirements Manager:
   - Add, edit, or delete requirements
   - Adjust categories and priorities
   - Merge or split requirements as needed

**Why Extract Requirements?**
- ✅ Ensures comprehensive test coverage
- ✅ Identifies gaps in test cases
- ✅ Enables traceability between requirements and test cases
- ✅ Provides coverage metrics and analysis

### Step 4: Generate Test Cases

1. Configure generation options:
   - **Detail Level**: Choose between "Concise" (faster) or "Detailed" (comprehensive)
   - **Count**: Select 3-7 test cases to generate
2. Click **"Generate Test Cases"**
3. Wait 10-30 seconds for the AI to generate test cases
4. If requirements were extracted, test cases are automatically linked to relevant requirements

### Step 5: Review and Edit

1. Review the generated test cases
2. Click the edit icon (✏️) to modify any test case:
   - Edit title, preconditions, and priority
   - Add, remove, or reorder test steps
   - View and manage linked requirements
3. Use the up/down arrows to reorder steps
4. Change priorities (Low, Medium, High)
5. Click "Save" when done editing

**Additional Actions:**
- **Add Manual Test Cases**: Click "Add Test Case" to create custom test cases
- **Generate More**: Click "Generate More Test Cases" to add additional scenarios
- **Delete**: Remove individual test cases or clear all with confirmation

### Step 6: Analyze Coverage

1. Click **"Coverage & Traceability"** to view the Coverage Dashboard:
   - **Total requirements** and coverage percentage
   - **Coverage by source**: user story, acceptance criteria, files, Confluence
   - **Coverage by category**: functional, API, flow, edge case, etc.
   - **Uncovered requirements**: Requirements not yet covered by test cases
2. Toggle to **Traceability Matrix** view:
   - See which test cases cover which requirements
   - Manually link/unlink test cases to requirements
   - Filter by source, category, or coverage status
   - Export traceability matrix as CSV

**Coverage Benefits:**
- ✅ Identify gaps in test coverage
- ✅ Ensure all requirements are tested
- ✅ Track requirement-to-test-case relationships
- ✅ Generate coverage reports for stakeholders

### Step 7: Export Test Cases

1. **Export CSV**: Click **"Export CSV"** for Excel-compatible format
   - Includes UTF-8 BOM for proper Excel encoding
   - All test steps and metadata included
   - Requirement IDs included for traceability
   - Filename: `test-cases-ISSUE-KEY-TIMESTAMP.csv`

2. **Export JSON**: Click **"Export JSON"** for structured data format
   - Pretty-printed for readability
   - Complete test case structure preserved
   - Requirement links included
   - Filename: `test-cases-ISSUE-KEY-TIMESTAMP.json`

**Additional Exports:**
- **Traceability Matrix CSV**: Export requirement-to-test-case mappings
- **Coverage Report JSON**: Export detailed coverage metrics and analysis

**Note**: Exported files can be imported into test management tools (Jira Xray, TestRail, qTest, etc.) or used for documentation purposes.

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
