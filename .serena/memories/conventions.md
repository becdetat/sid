# Conventions

## Formatting

- **Indent**: 4 spaces, never tabs
- **Semicolons**: always

## Function declarations

- Top-level and component-level: prefer `function` keyword declarations
- Callbacks, inline handlers, short expressions: arrow functions OK

```ts
// correct
function formatCents(cents: number): string { ... }
export default function Dashboard() { ... }

// wrong at top-level
const formatCents = (cents: number): string => { ... };
```

## Client patterns

- All API calls via **axios** (never `fetch`)
- **React Query** for server state (caching, loading/error); plain `useState`/`useEffect` for local UI state only
- **React Router** for all navigation
- Errors surfaced via **sonner toasts** — never inline error messages or `alert()`

## Server patterns

- Route handlers in `server/src/<domain>/` folders
- Soft-deletes only — set `deleted_at`, never `DELETE` rows
- Amounts always in signed integer cents

## Testing

- All new features require tests
- All behaviour-touching changes must update/extend existing tests
- Server tests use in-memory SQLite (`DATABASE_PATH=:memory:`)
- Client tests use vitest + Testing Library + happy-dom
