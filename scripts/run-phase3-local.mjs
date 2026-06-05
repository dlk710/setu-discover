import { readFile } from "node:fs/promises";

async function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const content = await readFile(file, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const [key, ...rest] = trimmed.split("=");
        if (!process.env[key]) {
          process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      // Local env files are optional in hosted environments.
    }
  }
}

await loadLocalEnv();

const baseUrl = (process.env.DISCOVER_URL || "http://localhost:3004").replace(/\/$/, "");
const token = process.env.PHASE2_RUN_TOKEN;
const mode = process.argv[2] || process.env.PHASE3_RUN_MODE || "agentic";

if (!token) {
  console.error("PHASE2_RUN_TOKEN is required for local Phase 3 runs.");
  process.exit(1);
}

const response = await fetch(`${baseUrl}/api/agent/run`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-discover-run-token": token,
  },
  body: JSON.stringify({ mode }),
});

const payload = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error(payload.error || `Phase 3 agent failed with HTTP ${response.status}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      id: payload.run?.id,
      status: payload.run?.status,
      pagesChecked: payload.run?.pages_checked,
      pagesDiscovered: payload.run?.pages_discovered,
      eventsUpserted: payload.run?.events_upserted,
      interruptions: payload.run?.interruptions,
      retries: payload.run?.retries,
      error: payload.run?.error,
    },
    null,
    2,
  ),
);
