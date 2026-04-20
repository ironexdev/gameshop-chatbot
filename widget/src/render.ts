import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function renderMarkdown(text: string, parent: HTMLElement): void {
  const html = marked.parse(text, { async: false }) as string;
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
  parent.innerHTML = clean;
}
