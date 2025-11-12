import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/server/__tests__/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
