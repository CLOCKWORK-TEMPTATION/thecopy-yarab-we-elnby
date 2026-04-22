import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from './schema';

// ==========================================
// Zero-Knowledge Encrypted Documents
// ==========================================

export const encryptedDocuments = pgTable('encrypted_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ciphertext: text('ciphertext').notNull(),
  iv: text('iv').notNull(),
  authTag: text('auth_tag').notNull(),
  wrappedDEK: text('wrapped_dek').notNull(),
  wrappedDEKiv: text('wrapped_dek_iv').notNull(),
  version: integer('version').notNull(),
  ciphertextSize: integer('ciphertext_size'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastModified: timestamp('last_modified').defaultNow().notNull(),
});
