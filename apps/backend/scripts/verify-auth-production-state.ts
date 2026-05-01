import pg from "pg";

const { Pool } = pg;

const REQUIRED_DATABASE_SCHEMA: Record<string, string[]> = {
  users: [
    "id",
    "email",
    "password_hash",
    "auth_verifier_hash",
    "kdf_salt",
    "account_status",
    "mfa_enabled",
    "created_at",
    "updated_at",
  ],
  refresh_tokens: ["id", "user_id", "token", "expires_at", "created_at"],
  recovery_artifacts: [
    "id",
    "user_id",
    "encrypted_recovery_artifact",
    "iv",
    "created_at",
  ],
  app_persistence_records: [
    "id",
    "app_id",
    "scope",
    "record_key",
    "payload",
    "created_at",
    "updated_at",
  ],
};

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getMissingSchema(
  rows: Array<{ table_name: string; column_name: string }>,
): Record<string, string[]> {
  const actualSchema = new Map<string, Set<string>>();

  for (const row of rows) {
    const columns = actualSchema.get(row.table_name) ?? new Set<string>();
    columns.add(row.column_name);
    actualSchema.set(row.table_name, columns);
  }

  const missing: Record<string, string[]> = {};

  for (const [tableName, requiredColumns] of Object.entries(
    REQUIRED_DATABASE_SCHEMA,
  )) {
    const actualColumns = actualSchema.get(tableName);

    if (!actualColumns) {
      missing[tableName] = ["<table>"];
      continue;
    }

    const missingColumns = requiredColumns.filter(
      (columnName) => !actualColumns.has(columnName),
    );

    if (missingColumns.length > 0) {
      missing[tableName] = missingColumns;
    }
  }

  return missing;
}

async function main(): Promise<void> {
  const databaseUrl = readRequiredEnv("DATABASE_URL");
  const email = normalizeEmail(readRequiredEnv("VERIFY_USER_EMAIL"));
  const tableNames = Object.keys(REQUIRED_DATABASE_SCHEMA);

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });

  try {
    const schemaResult = await pool.query<{
      table_name: string;
      column_name: string;
    }>(
      `
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
      `,
      [tableNames],
    );

    const userResult = await pool.query<{
      id: string;
      account_status: string;
      mfa_enabled: boolean;
    }>(
      `
        SELECT id, account_status, mfa_enabled
        FROM public.users
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    );

    const missing = getMissingSchema(schemaResult.rows);
    const user = userResult.rows[0] ?? null;
    const isHealthy =
      Object.keys(missing).length === 0 &&
      userResult.rowCount === 1 &&
      user?.account_status === "active";

    process.stdout.write(
      JSON.stringify(
        {
          success: isHealthy,
          missing,
          userCount: userResult.rowCount,
          accountStatus: user?.account_status ?? null,
          mfaEnabled: user?.mfa_enabled ?? null,
        },
        null,
        2,
      ),
    );
    process.stdout.write("\n");

    if (!isHealthy) {
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Failed to verify auth production state: ${message}\n`);
  process.exitCode = 1;
});
