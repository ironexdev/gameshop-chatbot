import Anthropic from "@anthropic-ai/sdk";
import type { McpHandle } from "./mcp.js";
import { getMessages, setMessages, type Msg } from "./sessions.js";

const SYSTEM_PROMPT = `Jsi asistent herního e-shopu "GameShop".
Vždy odpovídej česky.
Pomáháš hledat hry, doporučovat tituly, vysvětlit parametry a zjistit stav objednávky.
Pro objednávky vždy vyžaduj číslo objednávky i e-mail. Pokud uživatel dá jen jedno, zeptej se na druhé.
Nikdy nevypisuj cizí objednávky ani seznam objednávek. Nástroj to stejně neumožní.
Používej dostupné nástroje, neodhaduj data.
Když tool vrátí "not_found_or_unauthorized", řekni uživateli, že objednávku nenašla a ať zkontroluje údaje. Nenaznačuj, která část byla špatně.
Odpovědi drž stručné a přehledné.
Tvoje schopnosti jsou omezené na dostupné nástroje (hledání her, detail hry, stav objednávky). Nenabízej ani neslibuj akce, které neumíš: nepřidávej do košíku, nevytvářej ani neupravuj objednávky, neřeš platby, dopravu, reklamace, slevové kódy ani účty. Pokud uživatel chce takovou akci, odkaž ho na web e-shopu nebo podporu.`;

// Safety cap: stops runaway tool-use loops within one turn
const MAX_ITERATIONS = 8;

// Runs one user turn: appends message, loops tool-use, returns final text
export async function runChat(
  anthropic: Anthropic,
  model: string,
  mcp: McpHandle,
  sessionId: string,
  userMessage: string
): Promise<string> {
  const messages = getMessages(sessionId).slice();
  messages.push({ role: "user", content: userMessage });

  // Translate MCP tool schema to Anthropic's tool-use schema
  const tools = mcp.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Messages.Tool["input_schema"],
  }));

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model,
      system: SYSTEM_PROMPT,
      tools,
      messages,
      max_tokens: 1024,
    });

    messages.push({ role: "assistant", content: response.content });

    // Claude asked for tool calls: execute each and feed results back
    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        let resultText: string;
        let isError = false;
        try {
          resultText = await mcp.callTool(tu.name, (tu.input ?? {}) as Record<string, unknown>);
        } catch (err) {
          resultText = JSON.stringify({ error: String(err) });
          isError = true;
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: resultText,
          is_error: isError,
        });
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // stop_reason === "end_turn": collect text blocks and persist history
    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    setMessages(sessionId, messages);
    return text || "…";
  }

  setMessages(sessionId, messages);
  return "Omlouvám se, nepodařilo se vygenerovat odpověď.";
}

export function resetMessages(): Msg[] {
  return [];
}
