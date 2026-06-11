# Tech Stack

## Client (`/client`)

- **Runtime**: Browser
- **Framework**: React 19
- **Build**: Vite 8, `@vitejs/plugin-react`
- **Language**: TypeScript ~6.0
- **Styling**: TailwindCSS 4 (via `@tailwindcss/vite`)
- **HTTP**: axios (never use `fetch` directly)
- **Server state**: `@tanstack/react-query` v5
- **Routing**: `react-router-dom` v7
- **Charts**: `recharts`
- **Toasts**: `sonner`
- **Drag-and-drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Testing**: vitest + `@testing-library/react` + happy-dom
- **Lint**: ESLint 9 + typescript-eslint + eslint-plugin-react-hooks + eslint-plugin-react-refresh + eslint-config-prettier

## Server (`/server`)

- **Runtime**: Node.js
- **Framework**: Express 4
- **Language**: TypeScript 5.6
- **Database**: SQLite via `better-sqlite3`
- **Dev runner**: `tsx watch` (no compile step in dev)
- **Scheduling**: `node-cron`
- **File uploads**: `multer`
- **Zip**: `adm-zip`
- **Testing**: `tap` (node-tap) v18; test files named `*.test.ts`; `cross-env DATABASE_PATH=:memory:` for in-memory DB
- **Lint**: ESLint 9 + typescript-eslint + eslint-config-prettier

## Root

- **Package manager**: npm workspaces
- **Formatter**: Prettier 3
- **Task runner**: `concurrently` for parallel workspace scripts
