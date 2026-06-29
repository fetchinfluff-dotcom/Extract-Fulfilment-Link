import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@listingforge/adapters": r("./packages/adapters/src/index.ts"),
      "@listingforge/ai": r("./packages/ai/src/index.ts"),
      "@listingforge/config": r("./packages/config/src/index.ts"),
      "@listingforge/html": r("./packages/html/src/index.ts"),
      "@listingforge/pricing": r("./packages/pricing/src/index.ts"),
      "@listingforge/schemas": r("./packages/schemas/src/index.ts"),
      "@listingforge/security": r("./packages/security/src/index.ts")
    }
  },
  test: {
    include: ["packages/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node"
  }
});
