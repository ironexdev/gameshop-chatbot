import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export type McpTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type McpHandle = {
  client: Client;
  tools: McpTool[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<string>;
  stop: () => Promise<void>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));

// Spawns the MCP server subprocess and opens a stdio client to it
export async function startMcp(): Promise<McpHandle> {
  const serverEntry = resolve(__dirname, "../../server/dist/index.js");

  // Use the same Node binary that runs this process
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
  });

  const client = new Client(
    { name: "gameshop-client", version: "0.1.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  // Fetch tool catalog once; reused for every Anthropic call
  const list = await client.listTools();
  const tools: McpTool[] = list.tools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    input_schema: (t.inputSchema ?? { type: "object", properties: {} }) as Record<string, unknown>,
  }));

  // Invokes one tool and flattens the response to a single string
  async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const result = await client.callTool({ name, arguments: args });
    const content = (result.content ?? []) as Array<{ type: string; text?: string }>;
    const text = content
      .filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text!)
      .join("\n");
    return text || JSON.stringify(result);
  }

  async function stop(): Promise<void> {
    try {
      await client.close();
    } catch {
      // ignore
    }
  }

  return { client, tools, callTool, stop };
}
