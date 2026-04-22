const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

const START_PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

function checkPort(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          resolve(false);
        } else {
          resolve(false);
        }
      })
      .once("listening", () => {
        tester.close(() => resolve(true));
      })
      .listen(port, HOST);
  });
}

async function findOpenPort(start) {
  let port = start;
  // Try up to 50 ports ahead
  for (let i = 0; i < 50; i++) {
    /* eslint-disable no-await-in-loop */
    const free = await checkPort(port);
    if (free) return port;
    port += 1;
  }
  throw new Error("No open port found");
}

async function run() {
  const port = await findOpenPort(START_PORT);
  // Resolve Next.js CLI JS entry to avoid .cmd spawning issues on Windows
  const nextCli = require.resolve("next/dist/bin/next");
  console.log(`[dev] Starting Next.js on port ${port}...`);
  const child = spawn(
    process.execPath,
    [nextCli, "dev", "-p", String(port), "-H", HOST],
    {
      stdio: "inherit",
      env: { ...process.env, PORT: String(port), HOST },
    }
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}

run().catch((err) => {
  console.error("[dev] Failed to start:", err);
  process.exit(1);
});
