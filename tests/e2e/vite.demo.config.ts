import { defineConfig, mergeConfig } from "vite";
import baseConfig from "../../vite.config";

// Demo-mode dev server for E2E: identical to the app's Vite config but reads
// env from tests/e2e/env-demo (which has no VITE_SUPABASE_* vars), so the app
// falls back to the "Login as Alex Kim" demo login. `--envDir` is config-only
// (not a CLI flag), hence this thin wrapper config.
export default mergeConfig(
  baseConfig,
  defineConfig({
    envDir: "tests/e2e/env-demo",
  }),
);
