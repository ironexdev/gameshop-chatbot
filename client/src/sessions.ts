import type Anthropic from "@anthropic-ai/sdk";

export type Msg = Anthropic.MessageParam;

const store = new Map<string, Msg[]>();

export function getMessages(sessionId: string): Msg[] {
  let msgs = store.get(sessionId);
  if (!msgs) {
    msgs = [];
    store.set(sessionId, msgs);
  }
  return msgs;
}

export function setMessages(sessionId: string, messages: Msg[]): void {
  store.set(sessionId, messages);
}
