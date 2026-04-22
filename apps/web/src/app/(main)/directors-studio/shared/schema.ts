import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = {
  username: string;
  password: string;
};
export type User = typeof users.$inferSelect;

export const projects = pgTable("projects", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  scriptContent: text("script_content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const baseInsertProjectSchema = createInsertSchema(projects, {
  title: (schema) => schema.min(1, "Title is required"),
  scriptContent: (schema) => schema.optional(),
});

export const insertProjectSchema =
  baseInsertProjectSchema as unknown as z.ZodType<any>;

export type InsertProject = typeof projects.$inferInsert;
export type Project = typeof projects.$inferSelect;

export const scenes = pgTable("scenes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  projectId: varchar("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sceneNumber: integer("scene_number").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  timeOfDay: text("time_of_day").notNull(),
  characters: text("characters").array().notNull(),
  description: text("description"),
  shotCount: integer("shot_count").notNull().default(0),
  status: text("status").notNull().default("planned"),
});

const baseInsertSceneSchema = createInsertSchema(scenes, {
  projectId: (schema) => schema,
  sceneNumber: (schema) => schema,
  title: (schema) => schema,
  location: (schema) => schema,
  timeOfDay: (schema) => schema,
  characters: (schema) => schema,
  description: (schema) => schema.optional(),
});

export const insertSceneSchema =
  baseInsertSceneSchema as unknown as z.ZodType<any>;

export type InsertScene = typeof scenes.$inferInsert;
export type Scene = typeof scenes.$inferSelect;

export const characters = pgTable("characters", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  projectId: varchar("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  appearances: integer("appearances").notNull().default(0),
  consistencyStatus: text("consistency_status").notNull().default("good"),
  lastSeen: text("last_seen"),
  notes: text("notes"),
});

const baseInsertCharacterSchema = createInsertSchema(characters, {
  projectId: (schema) => schema,
  name: (schema) => schema,
  notes: (schema) => schema.optional(),
});

export const insertCharacterSchema =
  baseInsertCharacterSchema as unknown as z.ZodType<any>;

export type InsertCharacter = typeof characters.$inferInsert;
export type Character = typeof characters.$inferSelect;

export const shots = pgTable("shots", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sceneId: varchar("scene_id")
    .notNull()
    .references(() => scenes.id, { onDelete: "cascade" }),
  shotNumber: integer("shot_number").notNull(),
  shotType: text("shot_type").notNull(),
  cameraAngle: text("camera_angle").notNull(),
  cameraMovement: text("camera_movement").notNull(),
  lighting: text("lighting").notNull(),
  aiSuggestion: text("ai_suggestion"),
});

const baseInsertShotSchema = createInsertSchema(shots, {
  sceneId: (schema) => schema,
  shotNumber: (schema) => schema,
  shotType: (schema) => schema,
  cameraAngle: (schema) => schema,
  cameraMovement: (schema) => schema,
  lighting: (schema) => schema,
  aiSuggestion: (schema) => schema.optional(),
});

export const insertShotSchema =
  baseInsertShotSchema as unknown as z.ZodType<any>;

export type InsertShot = typeof shots.$inferInsert;
export type Shot = typeof shots.$inferSelect;
