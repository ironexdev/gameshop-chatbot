import { sendChat } from "./api";
import { renderMarkdown } from "./render";
import { buildStyles } from "./styles";
import { getSessionId, loadMessages, saveMessages } from "./storage";
import type { ChatbotOptions, UiMessage } from "./types";

const STR = {
  chat: "Chat",
  online: "Jsme online",
  close: "Zavřít",
  placeholder: "Napište zprávu…",
  send: "Odeslat",
  operator: "Spojit s operátorem",
  operatorToast: "Operátor není v této demo verzi dostupný.",
  error: "Něco se pokazilo, zkus to prosím znovu.",
};

const DEFAULTS = {
  storeName: "GameShop",
  primaryColor: "#8B5CF6",
  greeting: "Ahoj! S čím ti můžu pomoct?",
  quickActions: ["Sledovat zásilku", "Reklamace", "Doporučit hru"],
};

let mounted = false;

export function init(options: ChatbotOptions): void {
  if (mounted) return;
  if (!options || !options.endpoint) throw new Error("Chatbot.init: endpoint is required");
  mounted = true;

  const opts = {
    endpoint: options.endpoint,
    storeName: options.storeName ?? DEFAULTS.storeName,
    avatarUrl: options.avatarUrl,
    primaryColor: options.primaryColor ?? DEFAULTS.primaryColor,
    greeting: options.greeting ?? DEFAULTS.greeting,
    quickActions: options.quickActions ?? DEFAULTS.quickActions,
  };

  const host = document.createElement("div");
  host.id = "gameshop-chatbot-host";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = buildStyles(opts.primaryColor);
  shadow.appendChild(style);

  const root = document.createElement("div");
  root.className = "root";
  shadow.appendChild(root);

  const state = {
    open: false,
    pending: false,
    hasInteracted: false,
    sessionId: getSessionId(),
    messages: loadMessages() as UiMessage[],
  };

  if (state.messages.length > 0) state.hasInteracted = true;

  const pill = document.createElement("button");
  pill.className = "pill";
  pill.innerHTML = `<span class="dot"></span><span>${escape(opts.storeName)}</span>`;
  pill.addEventListener("click", () => setOpen(true));
  root.appendChild(pill);

  const card = document.createElement("div");
  card.className = "card hidden";
  root.appendChild(card);

  const header = document.createElement("div");
  header.className = "header";
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  if (opts.avatarUrl) {
    const img = document.createElement("img");
    img.src = opts.avatarUrl;
    img.alt = "";
    avatar.appendChild(img);
  } else {
    avatar.textContent = opts.storeName.charAt(0).toUpperCase();
  }
  const titleWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "title";
  title.textContent = opts.storeName;
  const status = document.createElement("div");
  status.className = "status";
  const sdot = document.createElement("span");
  sdot.className = "dot";
  status.appendChild(sdot);
  status.appendChild(document.createTextNode(STR.online));
  titleWrap.appendChild(title);
  titleWrap.appendChild(status);
  const spacer = document.createElement("div");
  spacer.className = "spacer";
  const closeBtn = document.createElement("button");
  closeBtn.className = "close";
  closeBtn.setAttribute("aria-label", STR.close);
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => setOpen(false));
  header.appendChild(avatar);
  header.appendChild(titleWrap);
  header.appendChild(spacer);
  header.appendChild(closeBtn);
  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "body";
  card.appendChild(body);

  const composer = document.createElement("div");
  composer.className = "composer";
  const textarea = document.createElement("textarea");
  textarea.className = "textarea";
  textarea.rows = 1;
  textarea.placeholder = STR.placeholder;
  const sendBtn = document.createElement("button");
  sendBtn.className = "send";
  sendBtn.setAttribute("aria-label", STR.send);
  sendBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/></svg>';
  composer.appendChild(textarea);
  composer.appendChild(sendBtn);
  card.appendChild(composer);

  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 72) + "px";
  });
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });
  sendBtn.addEventListener("click", submit);

  render();

  function setOpen(open: boolean): void {
    state.open = open;
    if (open) {
      pill.classList.add("hidden");
      card.classList.remove("hidden");
      setTimeout(() => textarea.focus(), 0);
    } else {
      card.classList.add("hidden");
      pill.classList.remove("hidden");
    }
  }

  function render(): void {
    body.innerHTML = "";

    const greetBubble = document.createElement("div");
    greetBubble.className = "msg bot";
    renderMarkdown(opts.greeting, greetBubble);
    body.appendChild(greetBubble);

    if (!state.hasInteracted && opts.quickActions.length > 0) {
      const chips = document.createElement("div");
      chips.className = "chips";
      for (const action of opts.quickActions) {
        const chip = document.createElement("button");
        chip.className = "chip";
        chip.type = "button";
        chip.textContent = action;
        chip.addEventListener("click", () => {
          textarea.value = action;
          submit();
        });
        chips.appendChild(chip);
      }
      body.appendChild(chips);
    }

    for (const msg of state.messages) {
      const el = document.createElement("div");
      el.className = "msg " + (msg.role === "user" ? "user" : "bot");
      if (msg.role === "bot") {
        renderMarkdown(msg.text, el);
      } else {
        el.textContent = msg.text;
      }
      body.appendChild(el);
    }

    if (state.pending) {
      const t = document.createElement("div");
      t.className = "typing";
      t.innerHTML = "<span></span><span></span><span></span>";
      body.appendChild(t);
    }

    const opWrap = document.createElement("div");
    opWrap.className = "operator-wrap";
    const opBtn = document.createElement("button");
    opBtn.className = "operator";
    opBtn.type = "button";
    opBtn.textContent = STR.operator;
    opBtn.addEventListener("click", () => {
      const existing = body.querySelector(".toast");
      if (existing) existing.remove();
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.textContent = STR.operatorToast;
      body.appendChild(toast);
      body.scrollTop = body.scrollHeight;
      setTimeout(() => toast.remove(), 3500);
    });
    opWrap.appendChild(opBtn);
    body.appendChild(opWrap);

    body.scrollTop = body.scrollHeight;
    sendBtn.disabled = state.pending;
  }

  async function submit(): Promise<void> {
    if (state.pending) return;
    const text = textarea.value.trim();
    if (!text) return;
    textarea.value = "";
    textarea.style.height = "auto";

    state.hasInteracted = true;
    state.messages.push({ role: "user", text });
    saveMessages(state.messages);
    state.pending = true;
    render();

    try {
      const reply = await sendChat(opts.endpoint, state.sessionId, text);
      state.messages.push({ role: "bot", text: reply });
    } catch (err) {
      console.error("[chatbot] send failed", err);
      state.messages.push({ role: "bot", text: STR.error });
    } finally {
      state.pending = false;
      saveMessages(state.messages);
      render();
    }
  }

  function escape(s: string): string {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
    );
  }
}
