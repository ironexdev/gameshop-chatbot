# gameshop-chatbot

Proof-of-concept web chatbot for a fictional game e-shop. Floating widget, Czech AI assistant that searches a local game catalog and looks up orders - via a local **MCP server** and **Anthropic's Claude API**.

## TLDR - Just Run it

**Step 1.** Create your `.env` (manual, one-time):

```bash
cp .env.example .env
# then open .env and paste your ANTHROPIC_API_KEY
```

**Step 2.** Install, build, and start (one command):

```bash
npm start
```

Open http://localhost:3000. Click the purple pill bottom-right.

## Disclaimer - this is a PoC

Not production-ready. Before exposing anything like this publicly, at minimum:

- **Rate limiting & abuse controls** - per-IP and per-session request caps; daily token/cost budget per session; cut off runaway tool-use loops.
- **Auth / bot protection** - CAPTCHA or signed widget tokens so `/chat` cannot be hit headlessly at scale; origin allowlist for the widget.
- **Real persistence** - orders/games in a DB (Postgres, etc.), not JSON files; sessions in Redis, not an in-memory `Map` that dies on restart.
- **Real order auth** - `order_id` + `email` is security-by-obscurity. Use signed magic links, logged-in customer accounts, or one-time codes.
- **Prompt-injection hardening** - treat every tool output and user message as untrusted; never let tool output control the next tool call without validation; log suspicious turns.
- **Input/output limits** - cap message length, message count per session, and response size; strip/escape anything reflected into HTML (already via DOMPurify, but review).
- **Secrets & transport** - `ANTHROPIC_API_KEY` via a secret manager, not `.env` on disk; HTTPS only; tighten CORS from `*` to the actual host origin.
- **Observability** - structured logs, request IDs, metrics (latency, tool-call counts, token usage, error rate), alerting on cost spikes and 5xx rates.
- **Reliability** - timeouts and retries around Anthropic and MCP calls; circuit breaker when upstream is degraded; graceful shutdown that drains in-flight chats.
- **Compliance** - GDPR: privacy notice, data retention policy, right-to-erasure for chat history; log scrubbing for PII (emails, order IDs).
- **Tests & CI** - unit tests for the tool gate and chat loop, an integration test against a stubbed Anthropic, lint/typecheck/build gates.
- **Deployment** - containerize, run behind a reverse proxy, health/readiness probes, pinned model version with a rollout plan when it changes.

## What is this?

- **server/** - MCP server (stdio). Tools: `search_games`, `get_game`, `get_order`.
- **client/** - raw `node:http` backend. Spawns the MCP server, runs the Anthropic tool-use loop, serves the demo page and widget bundle.
- **widget/** - vanilla TS chat widget bundled with tsup. Mounts in Shadow DOM. No framework.
- **data/** - `games.json` (15 titles) and `orders.json` (5 orders). This is the "database".
- **demo/** - single HTML page that loads the widget.

The `get_order` tool requires both `order_id` AND `email`. The gate is in the tool code, not the prompt - the LLM can't bypass it.

## What you need

- **Node.js 20+**. Check with `node -v`.
- An **Anthropic API key**. Get one at https://console.anthropic.com/.

## Environment

`.env` (required, no fallback):

```
ANTHROPIC_API_KEY=sk-ant-...
MODEL=claude-sonnet-4-6
PORT=3000
```

## Try it

With the server running, click the pill, then:

- "doporuč mi RPG na PS5 pod 1500 Kč" → tool-filtered search.
- "kde je moje objednávka #48210" → bot asks for email.
- "jan.novak@email.cz" → order status returned.
- "ukaž mi všechny objednávky" → refused.
- Wrong email for `#48210` → "nenašla", without saying which field was wrong.

## Poke at the MCP server alone

```bash
npm run build
npx @modelcontextprotocol/inspector node server/dist/index.js
```

## Rebuild after changes

```bash
npm run build                # all workspaces
npm run build -w @gameshop/widget   # just the widget
```

Node runs compiled `dist/` files - rebuild after any `.ts` edit.

## Change the model

Edit `MODEL` in `.env` and restart. No rebuild needed; `.env` is read at startup.

## Troubleshooting

- **`Missing env var: ANTHROPIC_API_KEY`** - step 1 skipped. Fill `.env`.
- **`Cannot find module '.../server/dist/index.js'`** - run `npm run build`.
- **Widget changes not showing** - rebuild the widget, hard-refresh the browser.
- **`Error: 401`** from Anthropic - API key wrong or expired.

## Architecture

See [docs/architecture.md](docs/architecture.md).