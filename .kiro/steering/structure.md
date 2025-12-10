# Project Structure

## Directory Organization

```
jira-genius/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (server-side)
│   │   ├── confluence/    # Confluence integration endpoints
│   │   ├── files/         # File upload/extraction endpoints
│   │   ├── generate/      # Test case generation endpoint
│   │   ├── jira/          # Jira API proxy endpoints
│   │   └── requirements/  # Requirement extraction endpoints
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main dashboard (client component)
│   └── globals.css        # Global styles and Tailwind
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── testcase/         # Test case management UI
│   ├── traceability/     # Requirements & coverage UI
│   ├── ui/               # ShadCN UI primitives
│   └── *.tsx             # Shared components
├── lib/                   # Utility libraries
│   ├── __tests__/        # Unit tests
│   ├── *-client.ts       # API clients (Jira, LLM, Xray)
│   ├── *-server.ts       # Server-side utilities
│   ├── *-export.ts       # Export utilities (CSV, JSON)
│   ├── schemas.ts        # Zod schemas
│   └── utils.ts          # Shared utilities
├── store/                 # Zustand state stores
│   ├── auth-store.ts
│   ├── testcase-store.ts
│   └── traceability-store.ts
├── public/                # Static assets
└── .env.local            # Environment variables (not committed)
```

## Key Architectural Patterns

### API Routes (Server-Side)

All API routes are in `app/api/` and follow Next.js App Router conventions:
- Each route is a `route.ts` file with HTTP method exports (GET, POST, etc.)
- Use `NextRequest` and `NextResponse` for request/response handling
- Validate inputs with Zod schemas
- Handle errors with try-catch and return appropriate status codes

Example structure:
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate with Zod
    // Process request
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### Client Components

All interactive components use `"use client"` directive:
- State management with Zustand stores
- Form handling with React Hook Form + Zod
- Toast notifications with Sonner
- ShadCN UI components for consistent styling

### State Management

Three main Zustand stores with localStorage persistence:
- **auth-store**: User credentials, authentication state
- **testcase-store**: Test cases, upload statuses, selections
- **traceability-store**: Requirements, coverage metrics, traceability links

### Styling Conventions

- Use Tailwind utility classes
- Custom animations defined in `globals.css`
- Glass morphism effects: `glass`, `glass-strong`
- Hover effects: `hover-lift`, `hover-glow`
- Gradients: `text-gradient`, `bg-gradient-animated`
- Consistent spacing with Tailwind scale

### Type Safety

- All schemas defined in `lib/schemas.ts` using Zod
- TypeScript strict mode enabled
- Infer types from Zod schemas: `z.infer<typeof Schema>`
- No `any` types - use proper typing or `unknown`

### Testing

Tests located in `lib/__tests__/`:
- Unit tests for utilities (ADF converter, CSV export, schemas)
- Use Vitest + React Testing Library
- Mock external dependencies
- Test edge cases and error handling

## File Naming Conventions

- **Components**: `kebab-case.tsx` (e.g., `testcase-card.tsx`)
- **API Routes**: `route.ts` in feature folders
- **Utilities**: `kebab-case.ts` (e.g., `llm-client.ts`)
- **Stores**: `feature-store.ts` (e.g., `auth-store.ts`)
- **Tests**: `filename.test.ts` matching source file

## Import Patterns

Use path aliases for cleaner imports:
```typescript
import { Component } from "@/components/ui/component";
import { useStore } from "@/store/feature-store";
import { utility } from "@/lib/utility";
```

## Component Organization

- Keep components focused and single-responsibility
- Extract reusable UI into `components/ui/`
- Feature-specific components in feature folders
- Shared components at `components/` root
- Use composition over prop drilling

## API Client Pattern

Separate client-side and server-side utilities:
- `*-client.ts`: Browser-safe, no server-only APIs
- `*-server.ts`: Server-only, can use Node.js APIs
- Never import server utilities in client components
