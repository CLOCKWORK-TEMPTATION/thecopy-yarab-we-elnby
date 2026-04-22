/**
 * Migration Script - تشفير البيانات الحالية
 * Encrypt Existing Data Migration
 */

import { db } from '../db';
import { projects } from '../db/schema';
import { encryptedDocuments } from '../db/zkSchema';
import * as crypto from 'crypto';
import * as readline from 'readline';

const MIGRATION_VERSION = 1;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 600000;

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function confirm(question: string): Promise<boolean> {
  const rl = createInterface();
  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

function encrypt(
  content: string,
  key: Buffer
): { ciphertext: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(content, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

async function createBackup() {
  console.log('📦 Creating backup...');

  try {
    const allProjects = await db.select().from(projects);

    const backupData = {
      version: MIGRATION_VERSION,
      timestamp: new Date().toISOString(),
      projects: allProjects,
    };

    const fs = await import('fs/promises');
    const backupPath = `./backup-projects-${Date.now()}.json`;

    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

    console.log(`✅ Backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

async function migrateProject(
  project: typeof projects.$inferSelect,
  masterKey: Buffer
) {
  if (!project.scriptContent) {
    console.log(`⏭️  Skipping project ${project.id} (no content)`);
    return;
  }

  try {
    const { ciphertext, iv, authTag } = encrypt(project.scriptContent, masterKey);

    const dek = crypto.randomBytes(KEY_LENGTH);
    const dekIv = crypto.randomBytes(IV_LENGTH);
    const dekCipher = crypto.createCipheriv(ALGORITHM, masterKey, dekIv);
    const wrappedDEK =
      dekCipher.update(dek, undefined, 'base64') + dekCipher.final('base64');
    const dekAuthTag = dekCipher.getAuthTag();

    await db.insert(encryptedDocuments).values({
      id: project.id,
      userId: project.userId!,
      ciphertext,
      iv,
      authTag,
      wrappedDEK,
      wrappedDEKiv: dekIv.toString('base64'),
      version: 1,
      ciphertextSize: ciphertext.length,
      createdAt: project.createdAt,
      lastModified: project.updatedAt,
    });

    console.log(`✅ Migrated project: ${project.id}`);
  } catch (error) {
    console.error(`❌ Failed to migrate project ${project.id}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🔐 Zero-Knowledge Migration Script');
  console.log('==================================\n');

  console.log('⚠️  WARNING: This will encrypt all existing projects.');
  console.log('⚠️  Make sure you have a backup before proceeding.\n');

  const shouldContinue = await confirm('Do you want to continue?');
  if (!shouldContinue) {
    console.log('Migration cancelled.');
    process.exit(0);
  }

  const backupPath = await createBackup();

  const rl = createInterface();
  const masterPassword = await new Promise<string>((resolve) => {
    rl.question('Enter master encryption password: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  if (!masterPassword || masterPassword.length < 12) {
    console.error('❌ Password must be at least 12 characters');
    process.exit(1);
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const masterKey = deriveKey(masterPassword, salt);

  console.log('\n🔄 Starting migration...\n');

  try {
    const allProjects = await db.select().from(projects);
    console.log(`Found ${allProjects.length} projects to migrate\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const project of allProjects) {
      try {
        await migrateProject(project, masterKey);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   💾 Backup: ${backupPath}`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as runMigration, createBackup };
