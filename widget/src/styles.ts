export function buildStyles(primary: string): string {
  return `
:host { all: initial; }
* { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }

.root {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483647;
  color: #111;
}

.pill {
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${primary};
  color: #fff;
  padding: 12px 18px;
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  cursor: pointer;
  border: none;
  font-size: 15px;
  font-weight: 600;
}
.pill:hover { filter: brightness(1.05); }
.pill .dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #22c55e; box-shadow: 0 0 0 2px rgba(255,255,255,0.4);
}

.card {
  width: 360px;
  height: 560px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
}
.avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: ${primary};
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; overflow: hidden;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.title { font-weight: 700; font-size: 15px; }
.status {
  font-size: 12px; color: #666;
  display: flex; align-items: center; gap: 6px;
}
.status .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
.spacer { flex: 1; }
.close {
  background: none; border: none; font-size: 22px; cursor: pointer;
  color: #666; line-height: 1; padding: 4px 8px;
}
.close:hover { color: #111; }

.body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fafafa;
}

.msg {
  max-width: 80%;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: anywhere;
}
.msg.bot { background: #F3F4F6; color: #111; align-self: flex-start; border-bottom-left-radius: 4px; }
.msg.user { background: ${primary}; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; white-space: pre-wrap; }
.msg > *:first-child { margin-top: 0; }
.msg > *:last-child { margin-bottom: 0; }
.msg p { margin: 4px 0; }
.msg strong { font-weight: 700; }
.msg em { font-style: italic; }
.msg ul, .msg ol { margin: 4px 0; padding-left: 20px; }
.msg li { margin: 2px 0; }
.msg h1, .msg h2, .msg h3, .msg h4 { margin: 6px 0 4px; font-weight: 700; line-height: 1.25; }
.msg h1 { font-size: 17px; }
.msg h2 { font-size: 15px; }
.msg h3, .msg h4 { font-size: 14px; }
.msg hr { border: none; border-top: 1px solid rgba(0,0,0,0.15); margin: 8px 0; }
.msg blockquote {
  margin: 4px 0; padding: 2px 10px;
  border-left: 3px solid rgba(0,0,0,0.2); color: inherit; opacity: 0.85;
}
.msg a { color: inherit; text-decoration: underline; }
.msg code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  background: rgba(0,0,0,0.06);
  padding: 1px 5px;
  border-radius: 4px;
}
.msg pre {
  background: rgba(0,0,0,0.06);
  padding: 8px 10px;
  border-radius: 8px;
  margin: 6px 0;
  overflow-x: auto;
}
.msg pre code { background: transparent; padding: 0; font-size: 12.5px; }
.msg.user code, .msg.user pre { background: rgba(255,255,255,0.18); }
.msg table {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  font-size: 13px;
  margin: 6px 0;
}
.msg th, .msg td {
  border: 1px solid rgba(0,0,0,0.15);
  padding: 4px 8px;
  text-align: left;
  vertical-align: top;
  white-space: nowrap;
}
.msg th { background: rgba(0,0,0,0.04); font-weight: 600; }
.msg.user th, .msg.user td { border-color: rgba(255,255,255,0.35); }
.msg.user th { background: rgba(255,255,255,0.12); }

.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.chip {
  background: #fff;
  border: 1px solid ${primary};
  color: ${primary};
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
}
.chip:hover { background: ${primary}; color: #fff; }

.typing {
  display: inline-flex; gap: 4px; padding: 10px 12px;
  background: #F3F4F6; border-radius: 14px; align-self: flex-start;
}
.typing span {
  width: 6px; height: 6px; background: #999; border-radius: 50%;
  animation: blink 1.2s infinite ease-in-out;
}
.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.9); }
  40% { opacity: 1; transform: scale(1); }
}

.operator-wrap { display: flex; justify-content: center; margin: 8px 0 4px; }
.operator {
  background: ${primary};
  color: #fff; border: none;
  padding: 8px 16px; border-radius: 999px;
  font-size: 13px; font-weight: 600; cursor: pointer;
}

.toast {
  background: #111; color: #fff;
  padding: 8px 12px; border-radius: 8px;
  font-size: 13px; align-self: center;
}

.composer {
  border-top: 1px solid #eee;
  padding: 10px 12px;
  display: flex; align-items: flex-end; gap: 8px;
  background: #fff;
}
.textarea {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 14px;
  padding: 8px 12px;
  font-size: 14px;
  resize: none;
  outline: none;
  line-height: 1.4;
  max-height: 72px;
  min-height: 36px;
  font-family: inherit;
}
.textarea:focus { border-color: ${primary}; }
.send {
  background: ${primary};
  color: #fff; border: none;
  width: 36px; height: 36px; border-radius: 50%;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.send:disabled { opacity: 0.5; cursor: not-allowed; }
.send svg { width: 16px; height: 16px; }

.hidden { display: none !important; }
`;
}
