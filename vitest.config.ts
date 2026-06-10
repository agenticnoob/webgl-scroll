import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@webgl-scroll/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      "@webgl-scroll/effects": new URL("./packages/effects/src/index.ts", import.meta.url).pathname,
      "@webgl-scroll/react": new URL("./packages/react/src/index.ts", import.meta.url).pathname
    }
  },
  test: {
    environment: "jsdom",
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx"],
    setupFiles: ["./test/setup.ts"]
  }
});
