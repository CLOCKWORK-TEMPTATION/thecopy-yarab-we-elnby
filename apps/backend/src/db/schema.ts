import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  real,
} from 'drizzle-orm/pg-core';

// ==========================================
// Users & Authentication
// ==========================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  authVerifierHash: text('auth_verifier_hash'),
  kdfSalt: text('kdf_salt'),
  accountStatus: text('account_status').default('active'),
  mfaEnabled: boolean('mfa_enabled').default(false).notNull(),
  mfaSecret: text('mfa_secret'),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const recoveryArtifacts = pgTable('recovery_artifacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  encryptedRecoveryArtifact: text('encrypted_recovery_artifact').notNull(),
  iv: text('iv').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==========================================
// Projects, Scenes, Characters, Shots
// ==========================================

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  scriptContent: text('script_content'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const scenes = pgTable('scenes', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sceneNumber: integer('scene_number').notNull(),
  title: text('title').notNull(),
  location: text('location').notNull(),
  timeOfDay: text('time_of_day').notNull(),
  characters: jsonb('characters').$type<string[]>().default([]).notNull(),
  description: text('description'),
  shotCount: integer('shot_count').default(0).notNull(),
  status: text('status').default('planned'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const characters = pgTable('characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  appearances: integer('appearances').default(0).notNull(),
  consistencyStatus: text('consistency_status').default('good'),
  lastSeen: text('last_seen'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const shots = pgTable('shots', {
  id: uuid('id').defaultRandom().primaryKey(),
  sceneId: uuid('scene_id')
    .notNull()
    .references(() => scenes.id, { onDelete: 'cascade' }),
  shotNumber: integer('shot_number').notNull(),
  shotType: text('shot_type').notNull(),
  cameraAngle: text('camera_angle').notNull(),
  cameraMovement: text('camera_movement').notNull(),
  lighting: text('lighting').notNull(),
  aiSuggestion: text('ai_suggestion'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// ActorAI Analytics
// ==========================================

export const actoraiAnalytics = pgTable('actorai_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id'),
  category: text('category').$type<'voice' | 'webcam' | 'memorization'>().notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// Breakdown System
// ==========================================

export const breakdownJobs = pgTable('breakdown_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id')
    .references(() => scenes.id, { onDelete: 'set null' }),
  jobType: text('job_type'),
  status: text('status').default('pending').notNull(),
  progress: integer('progress').default(0),
  totalScenes: integer('total_scenes').default(0),
  reportId: uuid('report_id')
    .references(() => breakdownReports.id, { onDelete: 'set null' }),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const breakdownReports = pgTable('breakdown_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),
  summary: text('summary'),
  totalScenes: integer('total_scenes').default(0),
  totalPages: integer('total_pages').default(0),
  totalEstimatedShootDays: integer('total_estimated_shoot_days'),
  warnings: jsonb('warnings').$type<string[]>().default([]),
  reportData: jsonb('report_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sceneBreakdowns = pgTable('scene_breakdowns', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id')
    .notNull()
    .references(() => breakdownReports.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id')
    .references(() => scenes.id, { onDelete: 'cascade' }),
  sceneNumber: integer('scene_number').notNull(),
  header: text('header'),
  content: text('content'),
  headerData: jsonb('header_data'),
  analysis: jsonb('analysis'),
  scenarios: jsonb('scenarios'),
  elements: jsonb('elements'),
  stats: jsonb('stats'),
  source: text('source'),
  status: text('status'),
  warnings: jsonb('warnings').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sceneHeaderMetadata = pgTable('scene_header_metadata', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id')
    .references(() => breakdownReports.id, { onDelete: 'cascade' }),
  sceneBreakdownId: uuid('scene_breakdown_id')
    .references(() => sceneBreakdowns.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id')
    .notNull()
    .references(() => scenes.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' }),
  rawHeader: text('raw_header'),
  sceneType: text('scene_type'),
  location: text('location'),
  timeOfDay: text('time_of_day'),
  pageCount: integer('page_count'),
  storyDay: text('story_day'),
  headerData: jsonb('header_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const shootingSchedules = pgTable('shooting_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id')
    .notNull()
    .references(() => breakdownReports.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  location: text('location'),
  timeOfDay: text('time_of_day'),
  sceneIds: jsonb('scene_ids').$type<string[]>(),
  estimatedHours: real('estimated_hours'),
  totalPages: integer('total_pages'),
  payload: jsonb('payload'),
  scheduleData: jsonb('schedule_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const breakdownExports = pgTable('breakdown_exports', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id')
    .notNull()
    .references(() => breakdownReports.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' }),
  format: text('format').notNull(),
  payload: text('payload'),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// StyleIST - Costume Design System
// ==========================================

export const costumeDesigns = pgTable('costume_designs', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  lookTitle: text('look_title').notNull(),
  dramaticDescription: text('dramatic_description'),
  breakdown: jsonb('breakdown').$type<Record<string, string>>().default({}),
  rationale: jsonb('rationale').$type<string[]>().default([]),
  productionNotes: jsonb('production_notes').$type<Record<string, string>>().default({}),
  imagePrompt: text('image_prompt'),
  conceptArtUrl: text('concept_art_url'),
  realWeather: jsonb('real_weather').$type<Record<string, unknown>>().default({}),
  brief: jsonb('brief').$type<Record<string, string>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const wardrobeItems = pgTable('wardrobe_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  imageUrl: text('image_url').notNull(),
  category: text('category'),
  fabric: text('fabric'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sceneCostumes = pgTable('scene_costumes', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id')
    .notNull()
    .references(() => scenes.id, { onDelete: 'cascade' }),
  costumeDesignId: uuid('costume_design_id').references(() => costumeDesigns.id),
  wardrobeItemId: uuid('wardrobe_item_id').references(() => wardrobeItems.id),
  characterId: uuid('character_id').references(() => characters.id),
  isContinuous: boolean('is_continuous').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
