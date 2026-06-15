import { spawn } from "node:child_process";

const processes = [
  spawn(
    "npx",
    ["wrangler", "dev", "--config", "worker/wrangler.jsonc", "--port", "8787"],
    {
      stdio: "inherit",
    },
  ),
  spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "0.0.0.0", "--port", "5173"],
    {
      stdio: "inherit",
    },
  ),
];

function shutdown(signal) {
  for (const child of processes) {
    child.kill(signal);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shutdown(signal);
  });
}

for (const child of processes) {
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      shutdown("SIGTERM");
      process.exit(code);
    }

    if (signal) {
      shutdown(signal);
    }
  });
}
