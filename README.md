# Jira Test Case Generator

AI-powered test case generation for Jira user stories using Next.js 15 and Google Gemini (or OpenAI/Anthropic).

## Features

- 🔐 **Jira Integration**: Authenticate using API tokens and fetch user stories directly from Jira
- 🤖 **AI-Powered Generation**: Generate comprehensive test cases using Gemini, OpenAI, or Anthropic
- ✏️ **Inline Editing**: Edit test cases, reorder steps, and customize priorities
- 📤 **Export Options**: Export test cases as CSV (Excel-compatible) or JSON for use in your test management tools
- 🎨 **Modern UI**: Built with Next.js 15, TypeScript, Tailwind CSS, and ShadCN UI
- 💾 **Session Persistence**: Test cases are saved in browser storage during your session
- 🔄 **Generate More**: Generate additional test cases with different configurations
- ➕ **Manual Test Cases**: Add custom test cases manually
- 🧹 **Clear All**: Remove all test cases with confirmation dialog

## Recent Changes

### Current Version Focus
- **Export-First Approach**: The application now focuses on generating and exporting test cases
- **CSV/JSON Export**: Primary workflow is to generate, edit, and export test cases for use in external tools
- **Removed Features**: Jira Xray upload functionality has been removed to simplify the workflow
- **Enhanced Export**: Improved CSV and JSON export formats with better formatting and metadata

## Prerequisites

- **Node.js**: Version 18 or higher
- **Jira Account**: With API token access
- **LLM API Key**: Google Gemini (default), OpenAI, or Anthropic API key

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
LLM_PROVIDER=gemini  # Options: gemini, openai, anthropic

# LLM API Keys - Set the one matching your LLM_PROVIDER (REQUIRED)
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

**Important:** 
- ✅ **Jira credentials**: Leave empty - each user enters their own credentials via the login UI
- ✅ **LLM API Key**: Set in `.env.local` - this is shared across all users

### 3. Get Your LLM API Key

#### Gemini API Key (Default)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key to `GEMINI_API_KEY` in `.env.local`

#### OpenAI API Key (Alternative)

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key to `OPENAI_API_KEY` in `.env.local`
4. Set `LLM_PROVIDER=openai`

#### Anthropic API Key (Alternative)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create a new API key
3. Copy the key to `ANTHROPIC_API_KEY` in `.env.local`
4. Set `LLM_PROVIDER=anthropic`

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
6. Click "Save" when done editing

### Step 5: Export Test Cases

1. Click **"Export CSV"** to download test cases in Excel-compatible CSV format
   - Includes UTF-8 BOM for proper Excel encoding
   - All test steps and metadata are included
   - Filename includes issue key and timestamp
2. Click **"Export JSON"** to download test cases in JSON format
   - Pretty-printed for readability
   - Complete test case structure preserved
   - Filename includes issue key and timestamp

**Note**: Exported files can be imported into your test management tools (Jira Xray, TestRail, qTest, etc.) or used for documentation purposes.

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
- **LLM Integration**: Google Gemini / OpenAI / Anthropic SDKs

### Project Structure

```
├── app/
│   ├── api/
│   │   ├── generate/route.ts          # Test case generation endpoint
│   │   └── jira/issue/[issueKey]/route.ts  # Jira proxy endpoint
│   ├── layout.tsx                     # Root layout with providers
│   └── page.tsx                       # Main dashboard
├── components/
│   ├── auth/
│   │   ├── login-modal.tsx           # Authentication modal
│   │   └── auth-provider.tsx         # Auth context provider
│   ├── testcase/
│   │   ├── testcase-card.tsx         # Individual test case editor
│   │   └── testcase-list.tsx         # Test case list with export buttons
│   ├── issue-fetcher.tsx             # Jira issue fetcher
│   └── ui/                           # ShadCN UI components
├── lib/
│   ├── adf-converter.ts              # ADF to plain text converter
│   ├── csv-export.ts                 # CSV export utility (Excel-compatible)
│   ├── json-export.ts                # JSON export utility
│   ├── jira-client.ts                # Jira API client
│   ├── jira-server.ts                # Server-side Jira utilities
│   ├── llm-client.ts                 # LLM integration
│   ├── schemas.ts                    # Zod validation schemas
│   └── __tests__/                    # Unit tests
├── store/
│   ├── auth-store.ts                 # Authentication state
│   └── testcase-store.ts             # Test case state management
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

### JSON Format
- **Structure**: Complete test case objects with all metadata
- **Pretty Printed**: Human-readable formatting
- **Schema**: Validates against Zod schemas for consistency

Both formats include timestamps and issue keys in filenames for easy organization.

## Future Enhancements

Potential features for future development:

1. **OAuth 2.0 Integration**: Replace API token authentication with OAuth flow
2. **Batch Export**: Export multiple test case sets at once
3. **Custom Templates**: Define custom export formats
4. **Test Case Import**: Import test cases from CSV/JSON files
5. **Requirements Traceability**: Link test cases to requirements and generate traceability matrices

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
