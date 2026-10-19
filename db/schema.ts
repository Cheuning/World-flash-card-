import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', { id: text('id').primaryKey(), kind: text('kind').notNull(), data: text('data').notNull(), createdAt: text('created_at').notNull() });
export const revisions = sqliteTable('revisions', { id: integer('id').primaryKey(), version: integer('version').notNull() });
