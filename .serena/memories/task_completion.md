# Task Completion Checklist

Run all of these from the repo root before considering a task done:

```sh
npm run build        # must pass (tsc + vite for client; tsc for server)
npm run test         # must pass (vitest + tap)
npm run lint         # must pass (eslint on both workspaces)
npm run format       # apply prettier formatting
```

Policy:
- Failing builds or tests must be fixed before done
- ESLint and Prettier must pass
- New features require new tests; behaviour changes require updated tests
