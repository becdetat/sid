# Sid

An extremely basic, self-hosted expense tracker.

## Development

### Prerequisites

- **Node.js 20** (LTS). Use [nvm-windows](https://github.com/coreybutler/nvm-windows) or [nvm](https://github.com/nvm-sh/nvm) to manage versions.

  > **Node 24 is not supported** — `better-sqlite3` requires native compilation and does not yet have pre-built binaries for Node 24. Switch to Node 20 before installing:
  > ```
  > nvm install 20
  > nvm use 20
  > ```

- npm 10+

### Setup

```bash
npm install
npm run dev
```

Starts the Vite dev server on `http://localhost:5173` and the Express API on `http://localhost:3000` concurrently. API requests from the client are proxied to the server via `/api`.

The SQLite database (`sid.db`) is created automatically on first server start.

### Testing

```bash
npm test                    # run all tests (client + server)
npm run test -w client      # vitest (frontend)
npm run test:watch -w client  # vitest watch mode
npm run test -w server      # tap (backend)
```

### Linting and formatting

```bash
npm run lint      # ESLint across client and server
npm run format    # Prettier across client and server
```

---

## Self-hosting with Docker

```bash
cd docker/
cp .env.example .env
# edit .env as needed
mkdir data
docker compose up -d
```

The app will be available at `http://localhost:3000`.

## Releasing a new version

Pushing a Git tag triggers the GitHub Actions workflow, which builds and publishes multi-platform Docker images (`linux/amd64`, `linux/arm64`) to GHCR.

```bash
git tag v<major>.<minor>.<patch>
git push origin v<major>.<minor>.<patch>
```

Monitor progress in the **Actions** tab on GitHub. The workflow publishes two image tags: `latest` and the version tag (e.g. `v1.2.0`).
