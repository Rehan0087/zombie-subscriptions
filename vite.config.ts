/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Production builds may not talk to any server (see .kiro/steering/privacy.md).
// Build-only, because the dev server needs a WebSocket for hot reload.
const noNetworkCsp: Plugin = {
  name: "no-network-csp",
  apply: "build",
  transformIndexHtml: () => [
    {
      tag: "meta",
      attrs: {
        "http-equiv": "Content-Security-Policy",
        content: "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'",
      },
      injectTo: "head-prepend",
    },
  ],
};

// Served from https://rehan0087.github.io/zombie-subscriptions/
export default defineConfig({
  base: "/zombie-subscriptions/",
  plugins: [react(), noNetworkCsp],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
