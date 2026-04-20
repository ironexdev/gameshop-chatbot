import { defineConfig } from "tsup";

export default defineConfig({
  entry: { widget: "src/index.ts" },
  format: ["iife", "esm"],
  globalName: "Chatbot",
  target: "es2020",
  platform: "browser",
  dts: true,
  clean: true,
  minify: false,
  sourcemap: false,
  outExtension({ format }) {
    if (format === "iife") return { js: ".js" };
    return { js: ".mjs" };
  },
});
