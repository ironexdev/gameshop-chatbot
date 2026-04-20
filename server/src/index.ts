import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

type Platform = "PC" | "PS5" | "Xbox" | "Switch";

type Game = {
  id: string;
  title: string;
  platform: Platform[];
  genre: string;
  mood: string[];
  price_czk: number;
  stock: number;
  release_date: string;
  description: string;
};

type Order = {
  order_id: string;
  email: string;
  status: "created" | "paid" | "shipped" | "delivered" | "cancelled";
  items: Array<{ game_id: string; title: string; qty: number; price_czk: number }>;
  total_czk: number;
  tracking_number: string | null;
  created_at: string;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../../data");

// Load fixture "database" once at startup
const games: Game[] = JSON.parse(readFileSync(resolve(dataDir, "games.json"), "utf8"));
const orders: Order[] = JSON.parse(readFileSync(resolve(dataDir, "orders.json"), "utf8"));

const server = new Server(
  { name: "gameshop-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const tools = [
  {
    name: "search_games",
    description:
      "Hledá hry v katalogu. Filtry jsou volitelné a kombinují se přes AND. Vrací max 10 výsledků.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Case-insensitive substring v názvu nebo popisu.",
        },
        platform: {
          type: "string",
          enum: ["PC", "PS5", "Xbox", "Switch"],
          description: "Platforma hry.",
        },
        genre: { type: "string", description: "Žánr, case-insensitive přesná shoda." },
        mood: {
          type: "array",
          items: { type: "string" },
          description:
            "Nálady/atmosféra hry (např. 'relaxing', 'dark', 'epic'). Hra musí odpovídat VŠEM zadaným náladám (AND), case-insensitive shoda proti poli mood.",
        },
        max_price_czk: { type: "number", description: "Maximální cena v Kč." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_game",
    description: "Vrátí detail konkrétní hry podle ID.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_order",
    description:
      "Vrátí objednávku jen pokud odpovídá dvojice order_id a email. Oba parametry jsou povinné.",
    inputSchema: {
      type: "object",
      properties: {
        order_id: { type: "string" },
        email: { type: "string" },
      },
      required: ["order_id", "email"],
      additionalProperties: false,
    },
  },
];

// Advertises the tool catalog to any MCP client
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

// Dispatches one tool invocation and returns a JSON text payload
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  if (name === "search_games") {
    const q = typeof a.query === "string" ? a.query.toLowerCase() : undefined;
    const platform = typeof a.platform === "string" ? (a.platform as Platform) : undefined;
    const genre = typeof a.genre === "string" ? a.genre.toLowerCase() : undefined;
    const moods = Array.isArray(a.mood)
      ? a.mood.filter((m): m is string => typeof m === "string").map((m) => m.toLowerCase())
      : undefined;
    const maxPrice = typeof a.max_price_czk === "number" ? a.max_price_czk : undefined;

    const matches = games
      .filter((g) => {
        if (q && !g.title.toLowerCase().includes(q) && !g.description.toLowerCase().includes(q))
          return false;
        if (platform && !g.platform.includes(platform)) return false;
        if (genre && g.genre.toLowerCase() !== genre) return false;
        if (moods && moods.length > 0) {
          const gameMoods = g.mood.map((m) => m.toLowerCase());
          if (!moods.every((m) => gameMoods.includes(m))) return false;
        }
        if (maxPrice !== undefined && g.price_czk > maxPrice) return false;
        return true;
      })
      .slice(0, 10);

    return {
      content: [{ type: "text", text: JSON.stringify({ results: matches }) }],
    };
  }

  if (name === "get_game") {
    const id = typeof a.id === "string" ? a.id : "";
    const game = games.find((g) => g.id === id);
    return {
      content: [
        { type: "text", text: JSON.stringify(game ?? { error: "not_found" }) },
      ],
    };
  }

  if (name === "get_order") {
    // Auth gate: both fields must match, no partial lookup allowed
    const orderId = typeof a.order_id === "string" ? a.order_id.trim() : "";
    const email = typeof a.email === "string" ? a.email.trim().toLowerCase() : "";
    if (!orderId || !email) {
      return {
        content: [
          { type: "text", text: JSON.stringify({ error: "not_found_or_unauthorized" }) },
        ],
      };
    }
    const order = orders.find(
      (o) => o.order_id === orderId && o.email.toLowerCase() === email
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(order ?? { error: "not_found_or_unauthorized" }),
        },
      ],
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify({ error: "unknown_tool" }) }],
    isError: true,
  };
});

// Parent speaks to this process via stdin/stdout pipes
const transport = new StdioServerTransport();
await server.connect(transport);
