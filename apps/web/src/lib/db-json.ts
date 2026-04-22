/**
 * طبقة بيانات JSON محلية — بديل مؤقت لقاعدة بيانات حقيقية
 *
 * تستخدم ملف JSON على القرص لحفظ البيانات بين الطلبات.
 * مصممة للاستبدال بسهولة بـ Drizzle/Prisma لاحقاً.
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/** أنواع البيانات المخزنة */
export interface DbProject {
  id: string;
  title: string;
  scriptContent: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbScene {
  id: string;
  projectId: string;
  sceneNumber: number;
  title: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  description: string | null;
  shotCount: number;
  status: string;
}

export interface DbCharacter {
  id: string;
  projectId: string;
  name: string;
  appearances: number;
  consistencyStatus: string;
  lastSeen: string | null;
  notes: string | null;
}

export interface DbShot {
  id: string;
  sceneId: string;
  shotNumber: number;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  lighting: string;
  aiSuggestion: string | null;
}

export interface Database {
  projects: DbProject[];
  scenes: DbScene[];
  characters: DbCharacter[];
  shots: DbShot[];
}

const DB_DIR = join(process.cwd(), ".data");
const DB_PATH = join(DB_DIR, "directors-studio.json");

const EMPTY_DB: Database = {
  projects: [],
  scenes: [],
  characters: [],
  shots: [],
};

/**
 * قراءة قاعدة البيانات من الملف
 * ينشئ الملف إذا لم يكن موجوداً
 */
export async function getDb(): Promise<Database> {
  try {
    if (!existsSync(DB_PATH)) {
      await mkdir(DB_DIR, { recursive: true });
      await writeFile(DB_PATH, JSON.stringify(EMPTY_DB, null, 2), "utf-8");
      return structuredClone(EMPTY_DB);
    }
    const raw = await readFile(DB_PATH, "utf-8");
    return JSON.parse(raw) as Database;
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

/**
 * حفظ قاعدة البيانات إلى الملف
 */
export async function saveDb(db: Database): Promise<void> {
  await mkdir(DB_DIR, { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}
