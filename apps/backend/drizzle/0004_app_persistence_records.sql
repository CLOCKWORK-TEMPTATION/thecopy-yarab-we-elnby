-- Unified app persistence for application-level durable state.
-- This table replaces per-app JSON state files as the primary store.

CREATE TABLE IF NOT EXISTS "app_persistence_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "app_id" text NOT NULL,
  "scope" text DEFAULT 'global' NOT NULL,
  "record_key" text DEFAULT 'state' NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_persistence_records_unique"
  ON "app_persistence_records" ("app_id", "scope", "record_key");
