-- BREAKAPP migration — إضافة جداول تشغيلية معزولة عن users/projects الأساسية
-- مكتوب يدوياً لتجنب drift بين schema.ts (uuid) وsnapshot القديم (varchar).
-- لا يمس أي جدول موجود. كل شيء جديد بادئته `breakapp_`.

CREATE TABLE IF NOT EXISTS "breakapp_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "director_user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "breakapp_project_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL,
  "joined_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "breakapp_project_members_project_fk"
    FOREIGN KEY ("project_id") REFERENCES "breakapp_projects"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "breakapp_vendors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "is_mobile" boolean DEFAULT false NOT NULL,
  "lat" real,
  "lng" real,
  "owner_user_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "breakapp_menu_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "vendor_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "price" integer,
  "available" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  CONSTRAINT "breakapp_menu_items_vendor_fk"
    FOREIGN KEY ("vendor_id") REFERENCES "breakapp_vendors"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "breakapp_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "director_user_id" text NOT NULL,
  "lat" real NOT NULL,
  "lng" real NOT NULL,
  "starts_at" timestamp DEFAULT now() NOT NULL,
  "ends_at" timestamp,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "breakapp_sessions_project_fk"
    FOREIGN KEY ("project_id") REFERENCES "breakapp_projects"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "breakapp_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "vendor_id" uuid NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "breakapp_orders_session_fk"
    FOREIGN KEY ("session_id") REFERENCES "breakapp_sessions"("id") ON DELETE CASCADE,
  CONSTRAINT "breakapp_orders_vendor_fk"
    FOREIGN KEY ("vendor_id") REFERENCES "breakapp_vendors"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "breakapp_order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "menu_item_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  CONSTRAINT "breakapp_order_items_order_fk"
    FOREIGN KEY ("order_id") REFERENCES "breakapp_orders"("id") ON DELETE CASCADE,
  CONSTRAINT "breakapp_order_items_menu_item_fk"
    FOREIGN KEY ("menu_item_id") REFERENCES "breakapp_menu_items"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "breakapp_order_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "vendor_id" uuid NOT NULL,
  "runner_id" text,
  "total_items" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "breakapp_order_batches_session_fk"
    FOREIGN KEY ("session_id") REFERENCES "breakapp_sessions"("id") ON DELETE CASCADE,
  CONSTRAINT "breakapp_order_batches_vendor_fk"
    FOREIGN KEY ("vendor_id") REFERENCES "breakapp_vendors"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "breakapp_runner_locations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "runner_id" text NOT NULL,
  "session_id" uuid,
  "lat" real NOT NULL,
  "lng" real NOT NULL,
  "accuracy" real,
  "recorded_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "breakapp_runner_locations_session_fk"
    FOREIGN KEY ("session_id") REFERENCES "breakapp_sessions"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "breakapp_invite_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "role" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_by" text NOT NULL,
  "qr_payload" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "breakapp_invite_tokens_project_fk"
    FOREIGN KEY ("project_id") REFERENCES "breakapp_projects"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "breakapp_refresh_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "project_id" uuid NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "breakapp_refresh_tokens_project_fk"
    FOREIGN KEY ("project_id") REFERENCES "breakapp_projects"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_breakapp_project_members_project" ON "breakapp_project_members"("project_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_project_members_user" ON "breakapp_project_members"("user_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_menu_items_vendor" ON "breakapp_menu_items"("vendor_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_sessions_project" ON "breakapp_sessions"("project_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_sessions_status" ON "breakapp_sessions"("status");
CREATE INDEX IF NOT EXISTS "idx_breakapp_orders_session" ON "breakapp_orders"("session_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_orders_vendor" ON "breakapp_orders"("vendor_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_orders_user" ON "breakapp_orders"("user_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_orders_status" ON "breakapp_orders"("status");
CREATE INDEX IF NOT EXISTS "idx_breakapp_order_items_order" ON "breakapp_order_items"("order_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_order_batches_session" ON "breakapp_order_batches"("session_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_runner_locations_runner" ON "breakapp_runner_locations"("runner_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_runner_locations_session" ON "breakapp_runner_locations"("session_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_runner_locations_recorded" ON "breakapp_runner_locations"("recorded_at");
CREATE INDEX IF NOT EXISTS "idx_breakapp_invite_tokens_project" ON "breakapp_invite_tokens"("project_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_refresh_tokens_user" ON "breakapp_refresh_tokens"("user_id");
