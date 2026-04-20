import type { UiMessage } from "./types";

const SID_KEY = "gameshop-chatbot:sessionId";
const MSG_KEY = "gameshop-chatbot:messages";

// Returns a stable per-browser UUID, created on first use
export function getSessionId(): string {
  let id = localStorage.getItem(SID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SID_KEY, id);
  }
  return id;
}

// Restores chat history so the widget survives reloads
export function loadMessages(): UiMessage[] {
  try {
    const raw = localStorage.getItem(MSG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMessages(messages: UiMessage[]): void {
  localStorage.setItem(MSG_KEY, JSON.stringify(messages));
}
