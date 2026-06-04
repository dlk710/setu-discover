const scheduleTime = process.env.PHASE2_SCHEDULE_TIME || "06:00";
const immediate = process.env.PHASE2_RUN_IMMEDIATE === "true" || process.argv.includes("--now");

function nextDelayMs(time) {
  const [hour = "6", minute = "0"] = time.split(":");
  const next = new Date();
  next.setHours(Number(hour), Number(minute), 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next.getTime() - Date.now();
}

async function runOnce() {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/run-phase2-local.mjs", "scheduled"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function scheduleNext() {
  const delay = nextDelayMs(scheduleTime);
  const nextAt = new Date(Date.now() + delay);
  console.log(`Next Phase 2 ingestion run scheduled for ${nextAt.toLocaleString()}.`);
  setTimeout(async () => {
    await runOnce();
    void scheduleNext();
  }, delay);
}

if (immediate) {
  await runOnce();
}

void scheduleNext();
