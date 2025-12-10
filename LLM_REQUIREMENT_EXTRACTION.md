# LLM-Based Requirement Extraction

## Overview

The system now uses **AI (Claude Sonnet 4.5 / Gemini / OpenAI)** to intelligently extract requirements instead of simple regex patterns.

## How It Works

### 1. Content Sources
The LLM analyzes **4 different sources**:
- ✅ **User Story Description**
- ✅ **Acceptance Criteria**
- ✅ **Uploaded Files** (PDF, DOCX, TXT)
- ✅ **Confluence Pages**

### 2. Extraction Process

```
User clicks "Extract Requirements"
         ↓
Frontend calls /api/requirements/extract
         ↓
API sends all content to LLM with extraction prompt
         ↓
LLM analyzes and extracts atomic requirements
         ↓
Returns structured JSON with requirements
         ↓
Requirements displayed in UI
```

### 3. LLM Prompt Instructions

The LLM is instructed to:

✅ **Extract ATOMIC requirements** - Break down complex statements into individual testable items
✅ **Be GRANULAR** - Each requirement should test ONE specific thing
✅ **Identify SOURCE** - Track which source each requirement came from
✅ **Categorize** - functional, api, flow, edge_case, non-functional
✅ **Prioritize** - high, medium, low based on importance
✅ **Extract EVERYTHING testable** - Including implicit requirements

### 4. Example

**Input (User Story):**
```
User uploads Excel file and data is imported into database and SMS notification is sent
```

**Output (Extracted Requirements):**
```json
[
  {
    "id": "REQ-PROJ-123-USER_STORY-1",
    "text": "User can upload an Excel file",
    "source": "user_story",
    "category": "functional",
    "priority": "high"
  },
  {
    "id": "REQ-PROJ-123-USER_STORY-2",
    "text": "Uploaded data is imported into database",
    "source": "user_story",
    "category": "functional",
    "priority": "high"
  },
  {
    "id": "REQ-PROJ-123-USER_STORY-3",
    "text": "SMS notification is sent after successful import",
    "source": "user_story",
    "category": "functional",
    "priority": "medium"
  }
]
```

## Key Benefits

### ✅ More Accurate
- Understands context and semantics
- Identifies implicit requirements
- Better at breaking down complex statements

### ✅ More Comprehensive
- Extracts edge cases and error scenarios
- Identifies integration points
- Recognizes security and performance requirements

### ✅ More Consistent
- Uniform extraction across all sources
- Proper categorization
- Appropriate priority assignment

### ✅ Language Agnostic
- Works with any language
- Understands technical jargon
- Handles various documentation styles

## Files Changed

### New Files:
1. `lib/llm-requirement-extractor.ts` - LLM-based extraction logic
2. `app/api/requirements/extract/route.ts` - API endpoint for extraction
3. `LLM_REQUIREMENT_EXTRACTION.md` - This documentation

### Modified Files:
1. `lib/requirement-extractor.ts` - Added `extractAllRequirementsWithLLM()` function
2. `app/page.tsx` - Updated to use async LLM extraction

## Configuration

Uses the same LLM configuration as test case generation:

```env
# .env.local
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
```

## Usage

1. **Fetch Jira Issue** - Get user story and acceptance criteria
2. **Upload Files** (optional) - Add specification documents
3. **Fetch Confluence** (optional) - Add technical documentation
4. **Click "Extract Requirements"** - AI analyzes all content
5. **Review Requirements** - Edit, add, or remove as needed
6. **Generate Test Cases** - Each requirement gets its own test case

## Cost Considerations

- LLM extraction is called **once per issue** (not per test case generation)
- Uses lower temperature (0.2) for consistent results
- Extraction typically costs less than test case generation
- Can be cached/reused if content doesn't change

## Fallback

The old regex-based extraction (`extractAllRequirements()`) is still available but marked as deprecated. It can be used as a fallback if LLM extraction fails.

---

**Status:** ✅ Implemented and Ready to Use

