import { sql } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const roles = pgTable('roles', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
})

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  roleId: integer('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'restrict' })
    .default(1),
  emailVerified: boolean('email_verified').notNull().default(false),
  verificationToken: text('verification_token'),
  verificationExpires: timestamp('verification_expires', { withTimezone: true }),
  resetToken: text('reset_token'),
  resetExpires: timestamp('reset_expires', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  adminId: uuid('admin_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  targetId: uuid('target_id'),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const friendRequests = pgTable('friend_requests', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  fromUserId: uuid('from_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  toUserId: uuid('to_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const friends = pgTable('friends', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  friendId: uuid('friend_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  type: text('type').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const conversationMembers = pgTable('conversation_members', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  clearedAt: timestamp('cleared_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const files = pgTable('files', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  uploadedBy: uuid('uploaded_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  originalName: text('original_name').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  text: text('text'),
  fileId: uuid('file_id').references(() => files.id, { onDelete: 'set null' }),
  replyTo: uuid('reply_to').references(() => messages.id, { onDelete: 'set null' }),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const messageReads = pgTable(
  'message_reads',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueRead: uniqueIndex('message_reads_unique').on(
      table.messageId,
      table.userId
    ),
  })
)
