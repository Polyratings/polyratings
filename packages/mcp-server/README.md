# @polyratings/mcp-server

Local MCP server that exposes public read-only tools over the Polyratings backend, with optional admin moderation tools for authenticated moderators.

## Setup

- Ensure you have Node.js installed (same version used for other packages).
- From the repo root, run `npm install` to install dependencies.

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `POLYRATINGS_BACKEND_URL` | Yes | URL of the Polyratings backend, e.g. `https://api-prod.polyratings.org` |
| `POLYRATINGS_ADMIN_TOKEN` | No | JWT for admin tools. See [Admin Authentication](#admin-authentication). |

## Running

**Dev mode** (tsx, hot reload):

```bash
POLYRATINGS_BACKEND_URL=https://api-prod.polyratings.org npm run dev
```

**Build and run:**

```bash
npm run build
POLYRATINGS_BACKEND_URL=https://api-prod.polyratings.org npm run start
```

## Cursor Integration

Add to `.cursor/mcp.json` in the repo root:

```json
{
  "mcpServers": {
    "polyratings": {
      "command": "npx",
      "args": ["tsx", "packages/mcp-server/src/index.ts"],
      "env": {
        "POLYRATINGS_BACKEND_URL": "https://api-prod.polyratings.org",
        "POLYRATINGS_ADMIN_TOKEN": "<your-jwt-here>"
      }
    }
  }
}
```

Restart Cursor after editing the config.

## Admin Authentication

Admin tools require a JWT. **Do not pass credentials through the AI.** Instead, obtain a token yourself and provide it as an environment variable.

### 1. Get a token

Run the helper script from this package directory:

```bash
./scripts/get-token.sh
```

It will prompt for your username and password, call the backend's login endpoint, and print a JWT (valid for 2 hours).

### 2. Configure the token

Paste the token into your `.cursor/mcp.json` as `POLYRATINGS_ADMIN_TOKEN`, or export it in your shell:

```bash
export POLYRATINGS_ADMIN_TOKEN="eyJhbGci..."
npm run dev
```

### 3. Refresh when expired

Tokens expire after 2 hours. Re-run `./scripts/get-token.sh` and update your config. The MCP server reads the env var on each admin tool call, so you can update it without restarting (if exported in the shell).

## Tools

### Public tools

- `polyratings_list_professors` – Search professors with optional name/department filters.
- `polyratings_get_professor` – Fetch a single professor's full record by ID.
- `polyratings_get_professors` – Batch fetch multiple professors by ID.
- `polyratings_get_professor_ratings` – Get ratings for a professor, optionally filtered by course.

### Admin tools (require `POLYRATINGS_ADMIN_TOKEN`)

- `polyratings_admin_get_pending_professors` – List pending professors awaiting approval.
- `polyratings_admin_get_bulk_keys` – List keys for a bulk-key group.
- `polyratings_admin_get_bulk_values` – Read values for keys in a bulk-key group.
- `polyratings_admin_list_reported_ratings` – View currently reported ratings with professor/rating context.
- `polyratings_admin_keep_reported_rating` – Keep a rating by clearing its report.
- `polyratings_admin_remove_reported_rating` – Remove a reported rating and clear its report.
