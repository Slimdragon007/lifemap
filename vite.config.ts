import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

declare const process: {
  env: Record<string, string | undefined>;
};

const githubPagesRepository = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  base:
    process.env.GITHUB_ACTIONS === "true" && githubPagesRepository
      ? `/${githubPagesRepository}/`
      : "/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts"
  }
});
