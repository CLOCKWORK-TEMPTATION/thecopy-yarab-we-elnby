import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  real,
} from "drizzle-orm/pg-core";

// ==========================================
// Users & Authentication
// ==========================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  authVerifierHash: text("auth_verifier_hash"),
  kdfSalt: text("kdf_salt"),
  accountStatus: text("account_status").default("active"),
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  mfaSecret: text("mfa_secret"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recoveryArtifacts = pgTable("recovery_artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  encryptedRecoveryArtifact: text("encrypted_recovery_artifact").notNull(),
  iv: text("iv").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==========================================
// Projects, Scenes, Characters, Shots
// ==========================================

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  scriptContent: text("script_content"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scenes = pgTable("scenes", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sceneNumber: integer("scene_number").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  timeOfDay: text("time_of_day").notNull(),
  characters: jsonb("characters").$type<string[]>().default([]).notNull(),
  description: text("description"),
  shotCount: integer("shot_count").default(0).notNull(),
  status: text("status").default("planned"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const characters = pgTable("characters", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  appearances: integer("appearances").default(0).notNull(),
  consistencyStatus: text("consistency_status").default("good"),
  lastSeen: text("last_seen"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shots = pgTable("shots", {
  id: uuid("id").defaultRandom().primaryKey(),
  sceneId: uuid("scene_id")
    .notNull()
    .references(() => scenes.id, { onDelete: "cascade" }),
  shotNumber: integer("shot_number").notNull(),
  shotType: text("shot_type").notNull(),
  cameraAngle: text("camera_angle").notNull(),
  cameraMovement: text("camera_movement").notNull(),
  lighting: text("lighting").notNull(),
  aiSuggestion: text("ai_suggestion"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// ActorAI Analytics
// ==========================================

export const actoraiAnalytics = pgTable("actorai_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id"),
  category: text("category")
    .$type<"voice" | "webcam" | "memorization">()
    .notNull(),
  payload: jsonb("payload")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  metadata: jsonb("metadata")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// Breakdown System
// ==========================================

export const breakdownJobs = pgTable("breakdown_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  sceneId: uuid("scene_id").references(() => scenes.id, {
    onDelete: "set null",
  }),
  jobType: text("job_type"),
  status: text("status").default("pending").notNull(),
  progress: integer("progress").default(0),
  totalScenes: integer("total_scenes").default(0),
  reportId: uuid("report_id").references(() => breakdownReports.id, {
    onDelete: "set null",
  }),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const breakdownReports = pgTable("breakdown_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  summary: text("summary"),
  totalScenes: integer("total_scenes").default(0),
  totalPages: integer("total_pages").default(0),
  totalEstimatedShootDays: integer("total_estimated_shoot_days"),
  warnings: jsonb("warnings").$type<string[]>().default([]),
  reportData: jsonb("report_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sceneBreakdowns = pgTable("scene_breakdowns", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => breakdownReports.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sceneId: uuid("scene_id").references(() => scenes.id, {
    onDelete: "cascade",
  }),
  sceneNumber: integer("scene_number").notNull(),
  header: text("header"),
  content: text("content"),
  headerData: jsonb("header_data"),
  analysis: jsonb("analysis"),
  scenarios: jsonb("scenarios"),
  elements: jsonb("elements"),
  stats: jsonb("stats"),
  source: text("source"),
  status: text("status"),
  warnings: jsonb("warnings").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sceneHeaderMetadata = pgTable("scene_header_metadata", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").references(() => breakdownReports.id, {
    onDelete: "cascade",
  }),
  sceneBreakdownId: uuid("scene_breakdown_id").references(
    () => sceneBreakdowns.id,
    { onDelete: "cascade" },
  ),
  sceneId: uuid("scene_id")
    .notNull()
    .references(() => scenes.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  rawHeader: text("raw_header"),
  sceneType: text("scene_type"),
  location: text("location"),
  timeOfDay: text("time_of_day"),
  pageCount: integer("page_count"),
  storyDay: text("story_day"),
  headerData: jsonb("header_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shootingSchedules = pgTable("shooting_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => breakdownReports.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  location: text("location"),
  timeOfDay: text("time_of_day"),
  sceneIds: jsonb("scene_ids").$type<string[]>(),
  estimatedHours: real("estimated_hours"),
  totalPages: integer("total_pages"),
  payload: jsonb("payload"),
  scheduleData: jsonb("schedule_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const breakdownExports = pgTable("breakdown_exports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => breakdownReports.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  format: text("format").notNull(),
  payload: text("payload"),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// StyleIST - Costume Design System
// ==========================================

export const costumeDesigns = pgTable("costume_designs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lookTitle: text("look_title").notNull(),
  dramaticDescription: text("dramatic_description"),
  breakdown: jsonb("breakdown").$type<Record<string, string>>().default({}),
  rationale: jsonb("rationale").$type<string[]>().default([]),
  productionNotes: jsonb("production_notes")
    .$type<Record<string, string>>()
    .default({}),
  imagePrompt: text("image_prompt"),
  conceptArtUrl: text("concept_art_url"),
  realWeather: jsonb("real_weather")
    .$type<Record<string, unknown>>()
    .default({}),
  brief: jsonb("brief").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wardrobeItems = pgTable("wardrobe_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category"),
  fabric: text("fabric"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sceneCostumes = pgTable("scene_costumes", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sceneId: uuid("scene_id")
    .notNull()
    .references(() => scenes.id, { onDelete: "cascade" }),
  costumeDesignId: uuid("costume_design_id").references(
    () => costumeDesigns.id,
  ),
  wardrobeItemId: uuid("wardrobe_item_id").references(() => wardrobeItems.id),
  characterId: uuid("character_id").references(() => characters.id),
  isContinuous: boolean("is_continuous").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// BREAKAPP - On-Set Logistics
// ==========================================
// كل جداول هذا القسم مستقلة عن جداول users/projects الرئيسية
// لأن مستخدمي BREAKAPP يُعرّفون عبر QR token (uuid حر) لا عبر users.id.
// لذلك لا نستخدم FK نحو users — بل نخزن user_id كنص حر (breakapp-native).

export const breakappProjects = pgTable("breakapp_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  directorUserId: text("director_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const breakappProjectMembers = pgTable("breakapp_project_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => breakappProjects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role")
    .$type<"director" | "crew" | "runner" | "vendor" | "admin">()
    .notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const breakappVendors = pgTable("breakapp_vendors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  isMobile: boolean("is_mobile").default(false).notNull(),
  lat: real("lat"),
  lng: real("lng"),
  ownerUserId: text("owner_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const breakappMenuItems = pgTable("breakapp_menu_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => breakappVendors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price"),
  available: boolean("available").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const breakappSessions = pgTable("breakapp_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => breakappProjects.id, { onDelete: "cascade" }),
  directorUserId: text("director_user_id").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  endsAt: timestamp("ends_at"),
  status: text("status")
    .$type<"active" | "ended" | "cancelled">()
    .default("active")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const breakappOrders = pgTable("breakapp_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => breakappSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => breakappVendors.id, { onDelete: "restrict" }),
  status: text("status")
    .$type<"pending" | "processing" | "completed" | "cancelled">()
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const breakappOrderItems = pgTable("breakapp_order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => breakappOrders.id, { onDelete: "cascade" }),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => breakappMenuItems.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
});

export const breakappOrderBatches = pgTable("breakapp_order_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => breakappSessions.id, { onDelete: "cascade" }),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => breakappVendors.id, { onDelete: "restrict" }),
  runnerId: text("runner_id"),
  totalItems: integer("total_items").default(0).notNull(),
  status: text("status")
    .$type<"pending" | "in-progress" | "completed" | "cancelled">()
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const breakappRunnerLocations = pgTable("breakapp_runner_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  runnerId: text("runner_id").notNull(),
  sessionId: uuid("session_id").references(() => breakappSessions.id, {
    onDelete: "set null",
  }),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  accuracy: real("accuracy"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export const breakappInviteTokens = pgTable("breakapp_invite_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => breakappProjects.id, { onDelete: "cascade" }),
  role: text("role")
    .$type<"director" | "crew" | "runner" | "vendor" | "admin">()
    .notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdBy: text("created_by").notNull(),
  qrPayload: text("qr_payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Refresh tokens لمستخدمي BREAKAPP — منفصل عن refreshTokens الأساسي
// لأن user_id هنا نص حر قادم من QR، لا uuid مُقيّد بـ users.id.
export const breakappRefreshTokens = pgTable("breakapp_refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => breakappProjects.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ربط الأجهزة بالمستخدمين — جولة 094 M5.02
// كل قيد يمثّل جهازاً فريداً (device_hash) يخص مستخدم BREAKAPP معيّن.
// أول تسجيل دخول يثبت الجهاز. أي device_hash مختلف بعد ذلك = 403.
export const breakappDevices = pgTable("breakapp_devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  deviceHash: text("device_hash").notNull(),
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
});

// سجل التدقيق — جولة 094 M5.05
// يُكتب بعد إنهاء الاستجابة (res.on('finish')) لـ writes الناجحة فقط.
export const breakappAuditLogs = pgTable("breakapp_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  projectId: text("project_id").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  method: text("method").notNull(),
  path: text("path").notNull(),
  statusCode: integer("status_code").notNull(),
  ip: text("ip").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BreakappProject = typeof breakappProjects.$inferSelect;
export type NewBreakappProject = typeof breakappProjects.$inferInsert;
export type BreakappVendor = typeof breakappVendors.$inferSelect;
export type NewBreakappVendor = typeof breakappVendors.$inferInsert;
export type BreakappMenuItem = typeof breakappMenuItems.$inferSelect;
export type NewBreakappMenuItem = typeof breakappMenuItems.$inferInsert;
export type BreakappSession = typeof breakappSessions.$inferSelect;
export type NewBreakappSession = typeof breakappSessions.$inferInsert;
export type BreakappOrder = typeof breakappOrders.$inferSelect;
export type NewBreakappOrder = typeof breakappOrders.$inferInsert;
export type BreakappOrderItem = typeof breakappOrderItems.$inferSelect;
export type NewBreakappOrderItem = typeof breakappOrderItems.$inferInsert;
export type BreakappOrderBatch = typeof breakappOrderBatches.$inferSelect;
export type NewBreakappOrderBatch = typeof breakappOrderBatches.$inferInsert;
export type BreakappRunnerLocation =
  typeof breakappRunnerLocations.$inferSelect;
export type NewBreakappRunnerLocation =
  typeof breakappRunnerLocations.$inferInsert;
export type BreakappInviteToken = typeof breakappInviteTokens.$inferSelect;
export type NewBreakappInviteToken = typeof breakappInviteTokens.$inferInsert;
export type BreakappRefreshToken = typeof breakappRefreshTokens.$inferSelect;
export type NewBreakappRefreshToken = typeof breakappRefreshTokens.$inferInsert;
export type BreakappProjectMember = typeof breakappProjectMembers.$inferSelect;
export type NewBreakappProjectMember =
  typeof breakappProjectMembers.$inferInsert;
export type BreakappDevice = typeof breakappDevices.$inferSelect;
export type NewBreakappDevice = typeof breakappDevices.$inferInsert;
export type BreakappAuditLog = typeof breakappAuditLogs.$inferSelect;
export type NewBreakappAuditLog = typeof breakappAuditLogs.$inferInsert;
