import { setTimeout as delay } from "node:timers/promises";

import pg from "pg";

const { Client } = pg;

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const databaseUrl = process.env.DATABASE_URL;
const waitSeconds = parsePositiveInteger(process.env.DB_READY_WAIT_SECONDS, 60);
const pollMs = parsePositiveInteger(process.env.DB_READY_POLL_MS, 1000);
const deadline = Date.now() + waitSeconds * 1000;

if (!databaseUrl) {
  console.error("DATABASE_URL is required before waiting for database readiness.");
  process.exit(1);
}

let attempt = 0;
let lastErrorMessage = "unknown error";

while (Date.now() <= deadline) {
  attempt += 1;
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: Math.min(pollMs, 5000),
  });

  try {
    await client.connect();
    await client.query("select 1");
    await client.end();
    console.log(`Database is ready after ${attempt} attempt(s).`);
    process.exit(0);
  } catch (error) {
    lastErrorMessage = error instanceof Error ? error.message : String(error);

    try {
      await client.end();
    } catch {
      // Ignore cleanup failures while polling a database that is not ready yet.
    }

    if (Date.now() > deadline) {
      break;
    }

    console.log(
      `Database is not ready yet; retrying in ${pollMs}ms. attempt=${attempt}`,
    );
    await delay(pollMs);
  }
}

console.error(
  `Database was not ready after ${waitSeconds}s. last_error=${lastErrorMessage}`,
);
process.exit(1);
