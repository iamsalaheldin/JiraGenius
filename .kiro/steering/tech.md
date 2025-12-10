# Tech Stack

## Framework & Language

- **Next.js 16** (App Router with Turbopack)
- **React 19.2**
- **TypeScript 5** (strict mode enabled)
- **Node.js 18+** required

## Styling & UI

- **Tailwind CSS v4** with PostCSS
- **ShadCN UI** components (Radix UI primitives)
- **Lucide React** for icons
- **next-themes** for dark mode support
- Custom animations and gradients via Tailwind

## State Management

- **Zustand** with persist middleware for:
  - Auth state (localStorage)
  - Test case state (localStorage)
  - Traceability/requirements state (localStorage)

## Form Handling & Validation

- **React Hook Form** for form management
- **Zod** for schema validation and type safety
- All API payloads validated with Zod schemas

## LLM Integration

- `@anthropic-ai/sdk` - Claude Sonnet 4.5 (default)
- `@google/generative-ai` - Gemini
- `openai` - OpenAI SDK
- Vision support for image analysis (Claude, OpenAI)

## File Processing

- **Mammoth** - DOCX text extraction
- **pdf-extraction** - PDF text extraction
- Custom ADF (Atlassian Document Format) parser for Jira/Confluence content

## Testing

- **Vitest** - Unit test runner
- **React Testing Library** - Component testing
- **jsdom** - DOM environment for tests
- **@testing-library/jest-dom** - Custom matchers

## Common Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm start            # Start production server
```

### Testing
```bash
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode
```

### Linting
```bash
npm run lint         # Run ESLint
```

## Environment Variables

Required in `.env.local`:

```env
# LLM Provider (required)
LLM_PROVIDER=anthropic  # Options: anthropic, gemini, openai

# LLM API Keys (set the one matching your provider)
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929  # Optional
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash  # Optional
OPENAI_API_KEY=your-key

# Jira Config (leave empty - users provide via UI)
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
```

## Build System

- **Turbopack** for fast development builds
- **Next.js compiler** for production optimization
- **PostCSS** for Tailwind CSS processing
- Path aliases: `@/*` maps to project root
