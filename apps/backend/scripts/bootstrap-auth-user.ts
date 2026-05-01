import bcrypt from "bcrypt";
import pg from "pg";

const { Pool } = pg;
const SALT_ROUNDS = 10;

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

function validatePassword(password: string): void {
  if (
    password.length < 12 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      "BOOTSTRAP_USER_PASSWORD does not satisfy the production password policy",
    );
  }
}

async function main(): Promise<void> {
  const databaseUrl = readRequiredEnv("DATABASE_URL");
  const email = normalizeEmail(readRequiredEnv("BOOTSTRAP_USER_EMAIL"));
  const password = readRequiredEnv("BOOTSTRAP_USER_PASSWORD");

  validatePassword(password);

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await client.query<{
      id: string;
      email: string;
      account_status: string;
    }>(
      `
        INSERT INTO public.users (
          email,
          password_hash,
          account_status,
          mfa_enabled,
          created_at,
          updated_at
        )
        VALUES ($1, $2, 'active', false, now(), now())
        ON CONFLICT (email) DO UPDATE
        SET
          password_hash = EXCLUDED.password_hash,
          account_status = 'active',
          mfa_enabled = false,
          updated_at = now()
        RETURNING id, email, account_status
      `,
      [email, passwordHash],
    );

    await client.query("COMMIT");

    const user = result.rows[0];
    process.stdout.write(
      JSON.stringify(
        {
          success: true,
          email: user?.email ?? email,
          userId: user?.id ?? null,
          accountStatus: user?.account_status ?? null,
        },
        null,
        2,
      ),
    );
    process.stdout.write("\n");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Failed to bootstrap auth user: ${message}\n`);
  process.exitCode = 1;
});
