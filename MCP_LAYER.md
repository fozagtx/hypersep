# MCP Layer — Hypersep

Embedded MCP server is live at `POST /api/mcp` (JSON-RPC 2.0) and `GET /api/mcp`
for discovery. Tools exposed:

- `hypersep_quote` — ranked routes with cost breakdown (reuses `/api/quote` logic)
- `hypersep_deployments` — contract addresses from `deployments.json`
- `hypersep_status` — engine health

## Test it locally

```bash
curl -s http://localhost:3000/api/mcp | jq
curl -s -X POST http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq
curl -s -X POST http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"hypersep_status","arguments":{}}}' | jq
```

## Claude Code usage

```bash
claude mcp add --transport http hypersep http://localhost:3000/api/mcp
```

(Use a public HTTPS URL in production; localhost only works on the same machine.)

## Adding OAuth / "Connected apps" (full blueprint)

The embedded endpoint above is **unauthenticated** (read-only tools). To let users
sign in and connect Claude Code / ChatGPT / etc. with scoped access, port the
`agenthuman-ux` blueprint (`src/mcp-kit/`) into Next.js:

1. Database: add Postgres (or reuse) and run the blueprint migrations
   (`migrations/0001_*.sql` … `0004_*.sql`). Add `src/db/client.ts` equivalent
   as a lib module.
2. OAuth routes as Next.js route handlers under `/app/api/...`:
   - `/.well-known/oauth-protected-resource/mcp`
   - `/.well-known/oauth-authorization-server`
   - `/register`, `/authorize`, `/token`, `/revoke`, `/connect`, `/connections`
3. Consent + connections pages as React server components (reuse `page()` shell
   tokens from `src/mcp-kit/html.ts`).
4. Mount tool registration in `/app/api/mcp/route.ts` behind `toolContext(db, authInfo, scope)`.
5. Branding/scopes in `lib/mcp/branding.ts` and `lib/mcp/scopes.ts`.

Given the blueprint is Express-based, the cleanest path is to run it as a
separate service (`mcp.yourdomain.com`) sharing the Hypersep database, and keep
this embedded `/api/mcp` for anonymous/public tools. See the blueprint README
"Deploy" section.

## Design tokens (from blueprint)

Extracted from `src/mcp-kit/html.ts` `:root`:

| Token | Light | Dark |
|---|---|---|
| --bg | #f6f4ef | #121212 |
| --panel/card | #ffffff | #1c1c1c |
| --border/line | #e4e0d8 | #2e2e2e |
| --text/ink | #151515 | #f2f2f2 |
| --muted | #666666 | #a0a0a0 |
| --accent | #4054d6 | #4054d6 |
| font | system-ui, 15px/1.5 | system-ui |

Applied to `app/globals.css` (light default + dark via `prefers-color-scheme`).
