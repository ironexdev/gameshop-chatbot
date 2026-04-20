# Architecture

Three npm workspaces under one repo. One Node process at runtime; it spawns the MCP server as a child over stdio.

**Workspaces:**

- `server/` - MCP server (stdio transport).
- `client/` - HTTP backend **and** the MCP client that talks to the server.
- `widget/` - browser bundle (vanilla TS, Shadow DOM) loaded by the demo page.

**Key files:**

- `server/src/index.ts` - MCP server. Registers the three tools (`search_games`, `get_game`, `get_order`) and handles `ListTools` / `CallTool` requests. Reads `data/games.json` and `data/orders.json` at boot. The `get_order` gate (both `order_id` + `email` must match) lives here, not in the prompt.
- `client/src/mcp.ts` - MCP client. `startMcp()` spawns the compiled server binary, opens a `Client` over `StdioClientTransport`, fetches the tool list, and exposes `callTool(name, args)`.
- `client/src/chat.ts` - Anthropic tool-use loop. This is the bridge. It calls `anthropic.messages.create` with the MCP tool list translated to Anthropic's schema, and on `stop_reason === "tool_use"` it invokes `mcp.callTool(...)` for each `tool_use` block, wraps the result as a `tool_result`, and loops back. Capped at 8 iterations.
- `client/src/sessions.ts` - in-memory `Map<sessionId, messages[]>`. Lost on restart.
- `client/src/index.ts` - `node:http` server. Routes: `GET /` → `demo/index.html`, `GET /widget.js` → `widget/dist/widget.js`, `POST /chat` → runs the chat loop, `GET /health`. Loads `.env` at boot. Spawns MCP once and keeps it alive for the process lifetime.
- `widget/src/widget.ts` - mounts a `<div>` + Shadow DOM at `document.body`, renders pill → card UI, owns state (open/pending/messages), persists `sessionId` + history in `localStorage`.
- `widget/src/render.ts` - `marked` + `DOMPurify` render pipeline for bot messages. User messages stay plain text.
- `widget/src/api.ts` - `fetch` to `POST /chat`.
- `widget/src/styles.ts` - CSS as a template string, injected into the shadow root (no global leakage).

**Request flow (one user message):**

1. Widget `POST /chat` with `{ sessionId, message }`.
2. `client/src/index.ts` hands it to `runChat()` in `chat.ts`.
3. `runChat` appends the user message to the session transcript and calls `anthropic.messages.create({ tools, messages, ... })`.
4. If Claude returns `tool_use`, the loop calls `mcp.callTool(name, input)` → stdio JSON-RPC → `server/src/index.ts` `CallToolRequestSchema` handler → result back.
5. Loop feeds the `tool_result` back to Claude as another turn. Repeats until `stop_reason === "end_turn"`.
6. Final assistant text is returned as `{ reply }`. The widget renders it through marked + DOMPurify into the bot bubble.

**Trust boundaries:**

- The MCP server is the only thing that reads the data files. The LLM cannot enumerate orders - there is no `list_orders` tool, and `get_order` rejects any mismatched `(order_id, email)` pair with `not_found_or_unauthorized` without revealing which field was wrong.
- Bot output is sanitized by DOMPurify before it hits the DOM. User input is rendered via `textContent`. Links are forced to `target="_blank" rel="noopener noreferrer"`.

## Diagram

![GameShop chatbot architecture diagram](../demo/gameshop_chatbot_diagram.svg)

> Source: [`gameshop_chatbot_diagram.drawio`](./gameshop_chatbot_diagram.drawio) (edit at [app.diagrams.net](https://app.diagrams.net/)).
