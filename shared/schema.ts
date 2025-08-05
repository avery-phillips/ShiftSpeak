import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const transcriptionSessions = pgTable("transcription_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  title: text("title"),
  sourceLanguage: text("source_language").default("auto"),
  targetLanguage: text("target_language").default("english"),
  status: text("status").default("active"), // active, paused, completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transcriptionEntries = pgTable("transcription_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => transcriptionSessions.id),
  originalText: text("original_text").notNull(),
  translatedText: text("translated_text"),
  speakerLabel: text("speaker_label"),
  timestamp: integer("timestamp").notNull(), // milliseconds
  confidence: integer("confidence"), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  settings: jsonb("settings").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTranscriptionSessionSchema = createInsertSchema(transcriptionSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTranscriptionEntrySchema = createInsertSchema(transcriptionEntries).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type TranscriptionSession = typeof transcriptionSessions.$inferSelect;
export type InsertTranscriptionSession = z.infer<typeof insertTranscriptionSessionSchema>;
export type TranscriptionEntry = typeof transcriptionEntries.$inferSelect;
export type InsertTranscriptionEntry = z.infer<typeof insertTranscriptionEntrySchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
