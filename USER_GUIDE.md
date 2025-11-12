# Jira Test Case Generator - User Guide

A comprehensive guide to using the Jira Test Case Generator to create, edit, and export AI-powered test cases.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Fetching User Stories](#fetching-user-stories)
4. [Generating Test Cases](#generating-test-cases)
5. [Editing Test Cases](#editing-test-cases)
6. [Exporting Test Cases](#exporting-test-cases)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- ✅ Access to a Jira instance
- ✅ A Jira API token (see [Authentication](#authentication) section)
- ✅ An LLM API key (configured by your administrator)

### First Time Setup

1. **Open the Application**: Navigate to the application URL (provided by your administrator)

2. **Check Authentication Status**: Look for the "Connect to Jira" button in the top-right corner

3. **Prepare Your Jira Credentials**: 
   - Your Jira base URL (e.g., `https://company.atlassian.net`)
   - Your Atlassian account email
   - Your Jira API token

---

## Authentication

### Step 1: Generate a Jira API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **"Create API token"**
3. Give it a descriptive name (e.g., "Test Case Generator")
4. Click **"Create"**
5. **Copy the token immediately** - you won't be able to see it again!

⚠️ **Important**: Store your API token securely. If you lose it, you'll need to create a new one.

### Step 2: Connect to Jira

1. Click the **"Connect to Jira"** button in the application
2. Fill in the authentication form:
   - **Jira Base URL**: Your Jira instance URL (without trailing slash)
     - ✅ Correct: `https://company.atlassian.net`
     - ❌ Incorrect: `https://company.atlassian.net/`
   - **Email**: Your Atlassian account email address
   - **API Token**: Paste the token you generated
3. Click **"Connect"**

### Step 3: Verify Connection

- ✅ **Success**: You'll see your email displayed and the button changes to "Connected"
- ❌ **Error**: Check the error message:
  - "Invalid credentials" → Verify your email and API token
  - "Network error" → Check your internet connection and Jira URL
  - "Jira instance not accessible" → Verify the URL is correct

### Managing Your Connection

- **Reconnect**: Click "Connect to Jira" again to update credentials
- **Disconnect**: Your credentials are stored in browser localStorage (cleared when you clear browser data)

---

## Fetching User Stories

### Step 1: Enter Issue Key

1. In the **"Fetch Jira User Story"** section, enter a Jira issue key
   - Format: `PROJECT-KEY-NUMBER` (e.g., `PROJ-123`, `FKSA-1911`)
2. Click **"Fetch Issue"**

### Step 2: Review Fetched Content

The application will display:

- **Issue Key**: The Jira issue identifier
- **Summary**: The issue title
- **Description**: Full issue description (converted from ADF format)
- **Acceptance Criteria**: Extracted acceptance criteria (if available)
- **Issue Type**: Type of issue (Story, Task, etc.)
- **Status**: Current status of the issue

### Step 3: Verify Content Quality

Before generating test cases, ensure:

- ✅ Description is clear and complete
- ✅ Acceptance criteria are present (if applicable)
- ✅ The issue is a user story or has testable requirements

**Tip**: If the description is too brief or missing acceptance criteria, consider updating it in Jira first for better test case generation.

### Troubleshooting Fetch Issues

| Error | Solution |
|-------|----------|
| "Issue not found" | Verify the issue key is correct and you have access to it |
| "Authentication required" | Reconnect to Jira with valid credentials |
| "Invalid issue key format" | Use format: `PROJECT-KEY-NUMBER` (e.g., `PROJ-123`) |

---

## Generating Test Cases

### Step 1: Configure Generation Settings

Before generating, configure these options:

#### Detail Level
- **Concise**: Faster generation, shorter test cases (recommended for quick iterations)
- **Detailed**: More comprehensive test cases with extensive steps (recommended for complex features)

#### Test Case Count
- **3-7 test cases**: Select based on complexity
  - **3**: Simple features, single user flows
  - **5**: Standard features, multiple scenarios
  - **7**: Complex features, comprehensive coverage

**Recommendation**: Start with 5 test cases and "Concise" detail level for best results.

### Step 2: Generate Test Cases

1. Click **"Generate Test Cases"**
2. Wait for generation (typically 10-30 seconds)
3. A progress indicator will show the generation status

### Step 3: Review Generated Test Cases

After generation, you'll see:

- **Test Case Cards**: Each card shows:
  - Test case ID
  - Title
  - Priority (Low, Medium, High)
  - Preconditions (if any)
  - Test steps with actions and expected results

### Understanding Generated Test Cases

**Test Case Structure**:
- **Title**: Descriptive name of what is being tested
- **Preconditions**: Prerequisites that must be met before testing
- **Steps**: Sequential actions with expected results
- **Priority**: Importance level (can be edited)

**Common Test Case Types Generated**:
- ✅ Happy path scenarios
- ✅ Edge cases
- ✅ Error handling
- ✅ Validation tests
- ✅ Integration scenarios

### Generating Additional Test Cases

1. Scroll to the bottom of the test case list
2. Click **"Generate More Test Cases"**
3. The AI will generate additional test cases based on the same user story
4. New test cases are added to your existing list

**Tip**: Use "Generate More" to explore different test scenarios or increase coverage.

---

## Editing Test Cases

### Editing a Single Test Case

1. Click the **Edit icon** (✏️) on any test case card
2. The card expands into edit mode
3. Make your changes:
   - **Title**: Modify the test case name
   - **Preconditions**: Add or edit prerequisites
   - **Priority**: Change priority level
   - **Steps**: Edit individual steps

### Managing Test Steps

#### Editing a Step
1. In edit mode, find the step you want to modify
2. Edit the **Action** field (what to do)
3. Edit the **Expected Result** field (what should happen)

#### Adding a Step
1. Click **"Add Step"** button
2. Fill in the Action and Expected Result fields
3. The step is automatically added

#### Deleting a Step
1. Click the **Trash icon** (🗑️) on the step
2. Confirm deletion
3. **Note**: At least one step must remain

#### Reordering Steps
1. Use the **Up arrow** (↑) to move a step earlier
2. Use the **Down arrow** (↓) to move a step later
3. Steps are reordered immediately

### Saving Changes

1. Click **"Save"** to apply your changes
2. Click **"Cancel"** to discard changes

### Adding Manual Test Cases

1. Click **"Add Test Case"** button in the header
2. A new empty test case is created
3. Edit it immediately to add:
   - Title
   - Preconditions
   - Steps
   - Priority

**Use Case**: Add test cases that the AI might have missed or custom scenarios specific to your workflow.

### Deleting Test Cases

1. Click the **Trash icon** (🗑️) on a test case card
2. Confirm deletion
3. The test case is permanently removed

### Clearing All Test Cases

1. Click **"Clear"** button in the header
2. Confirm in the dialog
3. **Warning**: This action cannot be undone!

**Tip**: Export your test cases before clearing if you might need them later.

---

## Exporting Test Cases

### Export Options

The application supports two export formats:

1. **CSV Export**: Excel-compatible format
2. **JSON Export**: Structured data format

### Exporting to CSV

#### When to Use CSV
- ✅ Importing into Excel for review
- ✅ Sharing with stakeholders
- ✅ Importing into test management tools that support CSV
- ✅ Creating reports and documentation

#### Steps to Export CSV

1. Click **"Export CSV"** button in the header
2. File downloads automatically
3. Filename format: `test-cases-ISSUE-KEY-TIMESTAMP.csv`

#### CSV Format Details

**Columns**:
- **ID**: Test case identifier
- **Title**: Test case name
- **Preconditions**: Prerequisites
- **Steps**: All steps formatted as "Step N. Action\nExpected: Result"
- **Priority**: Low, Medium, or High
- **Requirement IDs**: Associated requirement identifiers (if any)

**Excel Compatibility**:
- ✅ UTF-8 BOM included for proper character encoding
- ✅ Special characters properly escaped
- ✅ Opens correctly in Microsoft Excel, Google Sheets, and LibreOffice

#### Opening CSV in Excel

1. Open Excel
2. Go to **Data** → **Get Data** → **From File** → **From Text/CSV**
3. Select your exported CSV file
4. Ensure encoding is set to **UTF-8**
5. Click **Load**

### Exporting to JSON

#### When to Use JSON
- ✅ Programmatic processing
- ✅ Integration with other tools via API
- ✅ Version control and tracking
- ✅ Data analysis and reporting

#### Steps to Export JSON

1. Click **"Export JSON"** button in the header
2. File downloads automatically
3. Filename format: `test-cases-ISSUE-KEY-TIMESTAMP.json`

#### JSON Format Details

**Structure**:
```json
[
  {
    "id": "TC-1234567890",
    "title": "Test Case Title",
    "preconditions": "Preconditions text",
    "steps": [
      {
        "id": "step-1234567890",
        "action": "Action description",
        "expectedResult": "Expected result"
      }
    ],
    "priority": "medium",
    "requirementIds": []
  }
]
```

**Features**:
- ✅ Pretty-printed for readability
- ✅ Complete test case structure preserved
- ✅ Valid JSON format
- ✅ Can be parsed by any JSON parser

### Using Exported Files

#### Importing into Test Management Tools

**Jira Xray**:
1. Export as CSV
2. Use Xray's import functionality
3. Map columns to Xray fields

**TestRail**:
1. Export as CSV
2. Use TestRail's CSV import feature
3. Map test case fields accordingly

**qTest**:
1. Export as JSON
2. Use qTest API or import functionality
3. Transform JSON to qTest format if needed

**Custom Tools**:
- CSV: Parse using any CSV library
- JSON: Parse using any JSON parser
- Both formats are well-structured for automation

---

## Best Practices

### For Better Test Case Generation

1. **Complete User Stories**: Ensure Jira user stories have:
   - Clear, detailed descriptions
   - Well-defined acceptance criteria
   - Relevant context and background

2. **Optimal Generation Settings**:
   - Start with "Concise" and 5 test cases
   - Adjust based on results
   - Use "Detailed" for complex features

3. **Iterative Approach**:
   - Generate initial set
   - Review and edit
   - Generate more if needed
   - Refine until satisfied

### For Editing Test Cases

1. **Clear Step Descriptions**:
   - Use action verbs (Click, Enter, Verify)
   - Be specific about what to do
   - Include expected results clearly

2. **Logical Step Order**:
   - Steps should flow logically
   - Each step should build on previous ones
   - Use reorder feature to optimize sequence

3. **Appropriate Priorities**:
   - **High**: Critical functionality, core features
   - **Medium**: Important features, common scenarios
   - **Low**: Edge cases, nice-to-have validations

### For Exporting

1. **Review Before Export**:
   - Check all test cases are complete
   - Verify steps are in correct order
   - Ensure priorities are set appropriately

2. **Organize Exports**:
   - Use meaningful filenames (includes issue key and timestamp)
   - Store exports in organized folders
   - Keep track of exported versions

3. **Version Control**:
   - Export before major edits
   - Export after significant changes
   - Maintain export history for reference

### Workflow Recommendations

**Recommended Workflow**:
1. ✅ Fetch user story from Jira
2. ✅ Generate initial test cases (5, Concise)
3. ✅ Review and edit test cases
4. ✅ Generate more if coverage is insufficient
5. ✅ Final review and refinement
6. ✅ Export to CSV or JSON
7. ✅ Import into test management tool

**Time-Saving Tips**:
- Use "Generate More" instead of regenerating from scratch
- Edit in batches (all titles, then all steps)
- Export frequently to avoid data loss

---

## Troubleshooting

### Authentication Issues

**Problem**: "Invalid credentials" error

**Solutions**:
1. Verify your Jira base URL doesn't have a trailing slash
2. Ensure you're using your Atlassian account email (not username)
3. Generate a fresh API token
4. Check that your Jira instance is accessible

**Problem**: Connection works but can't fetch issues

**Solutions**:
1. Verify you have access to the specific Jira project
2. Check that the issue key format is correct
3. Ensure your API token has necessary permissions

### Generation Issues

**Problem**: Test case generation fails or times out

**Solutions**:
1. Try "Concise" detail level (faster)
2. Reduce test case count (3 instead of 7)
3. Check your internet connection
4. Verify LLM API key is configured (contact administrator)

**Problem**: Generated test cases are incomplete or incorrect

**Solutions**:
1. Ensure user story has clear description and acceptance criteria
2. Try "Detailed" detail level for more comprehensive results
3. Generate more test cases to get additional scenarios
4. Edit generated test cases to refine them

**Problem**: Generated JSON is invalid

**Solutions**:
1. This is rare but can happen with certain LLM providers
2. Try a different LLM provider (if available)
3. Use "Concise" detail level
4. Contact administrator if issue persists

### Export Issues

**Problem**: CSV doesn't open correctly in Excel

**Solutions**:
1. Ensure Excel is set to UTF-8 encoding when importing
2. Try opening in Google Sheets or LibreOffice
3. Use JSON export as alternative
4. Check that special characters are properly displayed

**Problem**: Exported file is empty or corrupted

**Solutions**:
1. Ensure you have test cases before exporting
2. Check browser download settings
3. Try exporting again
4. Clear browser cache if issue persists

### UI Issues

**Problem**: Test cases don't appear after generation

**Solutions**:
1. Refresh the page (test cases are stored in browser storage)
2. Check browser console for errors
3. Ensure JavaScript is enabled
4. Try a different browser

**Problem**: Changes are lost after page refresh

**Solutions**:
1. Test cases are stored in browser localStorage
2. Export before closing browser to preserve work
3. Don't clear browser data if you want to keep test cases
4. Consider exporting frequently as backup

---

## FAQ

### General Questions

**Q: Do I need to be connected to Jira to use the tool?**
A: You need Jira connection to fetch user stories, but you can add manual test cases without Jira connection.

**Q: Can I use this without a Jira account?**
A: You can add manual test cases, but fetching user stories requires Jira authentication.

**Q: Are my test cases saved automatically?**
A: Yes, test cases are saved in your browser's localStorage. However, export them for backup.

**Q: Can I work offline?**
A: You can edit existing test cases offline, but generation and Jira fetching require internet connection.

### Generation Questions

**Q: How many test cases should I generate?**
A: Start with 5 test cases. Generate more if you need additional coverage.

**Q: What's the difference between "Concise" and "Detailed"?**
A: Concise generates shorter, faster test cases. Detailed generates more comprehensive test cases with extensive steps.

**Q: Can I regenerate test cases?**
A: Use "Generate More" to add additional test cases. You can delete and regenerate if needed.

**Q: How accurate are AI-generated test cases?**
A: AI-generated test cases are a starting point. Always review and edit them to match your specific requirements.

### Export Questions

**Q: Which format should I use: CSV or JSON?**
A: Use CSV for Excel/Sheets or general sharing. Use JSON for programmatic processing or tool integration.

**Q: Can I import exported files back into the tool?**
A: Currently, import functionality is not available. This is a planned feature.

**Q: Do exported files include all test case data?**
A: Yes, both CSV and JSON include all test case information: title, preconditions, steps, and priority.

**Q: Can I customize the export format?**
A: Currently, standard CSV and JSON formats are available. Custom templates are a planned feature.

### Editing Questions

**Q: Can I undo changes?**
A: Click "Cancel" before saving to discard changes. After saving, changes cannot be undone.

**Q: Is there a limit to the number of steps per test case?**
A: No hard limit, but keep steps reasonable for maintainability (typically 5-15 steps).

**Q: Can I copy test cases?**
A: Currently, you can manually recreate similar test cases. Copy/paste functionality is a planned feature.

**Q: How do I reorder multiple steps quickly?**
A: Use the up/down arrows on each step. Steps are reordered one at a time.

### Technical Questions

**Q: Which browsers are supported?**
A: Modern browsers (Chrome, Firefox, Safari, Edge) with JavaScript enabled.

**Q: Is my data sent to external services?**
A: Test case generation uses LLM APIs. Jira credentials are only sent to your Jira instance. See privacy policy for details.

**Q: Can I use this in a corporate environment?**
A: Yes, but ensure compliance with your organization's data policies regarding API usage and data storage.

**Q: Is there an API I can use?**
A: Currently, the application is web-based only. API access is a potential future feature.

---

## Getting Help

### Support Resources

- **Documentation**: Check this guide and the main README.md
- **Issues**: Report bugs or request features through your organization's support channel
- **Administrator**: Contact your system administrator for:
  - LLM API key configuration
  - Jira access issues
  - System configuration questions

### Reporting Issues

When reporting issues, please include:
- Browser and version
- Steps to reproduce
- Error messages (if any)
- Screenshots (if helpful)

---

## Quick Reference

### Keyboard Shortcuts

Currently, the application uses mouse/touch interactions. Keyboard shortcuts are a planned feature.

### Common Actions

| Action | Location |
|--------|----------|
| Connect to Jira | Top-right "Connect to Jira" button |
| Fetch Issue | "Fetch Jira User Story" section |
| Generate Test Cases | "Generate Test Cases" button |
| Edit Test Case | Edit icon (✏️) on test case card |
| Add Step | "Add Step" button in edit mode |
| Delete Test Case | Trash icon (🗑️) on test case card |
| Export CSV | "Export CSV" button in header |
| Export JSON | "Export JSON" button in header |
| Clear All | "Clear" button in header |

### File Formats

**CSV Format**:
- Encoding: UTF-8 with BOM
- Delimiter: Comma
- Quote: Double quotes
- Newline: LF

**JSON Format**:
- Encoding: UTF-8
- Format: Pretty-printed
- Structure: Array of test case objects

---

**Last Updated**: 2024
**Version**: 1.0

For the latest updates and changes, refer to the main README.md file.

