-- BREAKAPP Round 094 — Security & Analytics Hardening
-- --------------------------------------------------------------
-- 1) جداول جديدة: breakapp_devices (M5.02) + breakapp_audit_logs (M5.05).
-- 2) indexes على الأعمدة الساخنة (M5.07).
-- 3) UNIQUE على (project_id, user_id) في breakapp_project_members
--    لإغلاق المسألة المفتوحة من جولة 093.
-- لا يمس هذا الملف أي بنية قائمة؛ فقط يضيف جداول وindexes وقيد uniqueness.

-- ---------- Devices ---------------------------------------------
CREATE TABLE IF NOT EXISTS "breakapp_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "device_hash" text NOT NULL,
  "first_seen" timestamp DEFAULT now() NOT NULL,
  "last_seen" timestamp DEFAULT now() NOT NULL,
  "revoked_at" timestamp
);

-- ---------- Audit logs ------------------------------------------
CREATE TABLE IF NOT EXISTS "breakapp_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL,
  "project_id" text NOT NULL,
  "action" text NOT NULL,
  "resource" text NOT NULL,
  "resource_id" text,
  "method" text NOT NULL,
  "path" text NOT NULL,
  "status_code" integer NOT NULL,
  "ip" text NOT NULL,
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ---------- Hot-path indexes (M5.07) ----------------------------
CREATE INDEX IF NOT EXISTS "idx_breakapp_orders_session" ON "breakapp_orders"("session_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_orders_user" ON "breakapp_orders"("user_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_orders_status" ON "breakapp_orders"("status");
CREATE INDEX IF NOT EXISTS "idx_breakapp_order_items_order" ON "breakapp_order_items"("order_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_order_items_menu" ON "breakapp_order_items"("menu_item_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_vendors_location" ON "breakapp_vendors"("lat", "lng");
CREATE INDEX IF NOT EXISTS "idx_breakapp_menu_items_vendor" ON "breakapp_menu_items"("vendor_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_sessions_project" ON "breakapp_sessions"("project_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_runner_locations_runner" ON "breakapp_runner_locations"("runner_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_audit_logs_user" ON "breakapp_audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_breakapp_audit_logs_created" ON "breakapp_audit_logs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_breakapp_devices_user" ON "breakapp_devices"("user_id");

-- ---------- Uniqueness ------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_breakapp_project_members"
  ON "breakapp_project_members"("project_id", "user_id");
