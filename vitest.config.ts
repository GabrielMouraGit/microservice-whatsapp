import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@config", replacement: path.resolve(__dirname, "config") },
      {
        find: "@application",
        replacement: path.resolve(__dirname, "src/application"),
      },
      {
        find: "@interfaces",
        replacement: path.resolve(__dirname, "src/interfaces"),
      },
      { find: "@", replacement: path.resolve(__dirname, "src") },
    ],
  },
});
