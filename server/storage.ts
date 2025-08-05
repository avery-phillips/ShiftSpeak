import { 
  type User, 
  type InsertUser,
  type TranscriptionSession,
  type InsertTranscriptionSession,
  type TranscriptionEntry,
  type InsertTranscriptionEntry,
  type UserSettings,
  type InsertUserSettings
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Transcription sessions
  createSession(session: InsertTranscriptionSession): Promise<TranscriptionSession>;
  getSession(id: string): Promise<TranscriptionSession | undefined>;
  getUserSessions(userId: string): Promise<TranscriptionSession[]>;
  updateSession(id: string, updates: Partial<TranscriptionSession>): Promise<TranscriptionSession | undefined>;

  // Transcription entries
  addTranscriptionEntry(entry: InsertTranscriptionEntry): Promise<TranscriptionEntry>;
  getSessionEntries(sessionId: string): Promise<TranscriptionEntry[]>;
  
  // User settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  updateUserSettings(userId: string, settings: InsertUserSettings): Promise<UserSettings>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, TranscriptionSession>;
  private entries: Map<string, TranscriptionEntry>;
  private userSettings: Map<string, UserSettings>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.entries = new Map();
    this.userSettings = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createSession(insertSession: InsertTranscriptionSession): Promise<TranscriptionSession> {
    const id = randomUUID();
    const now = new Date();
    const session: TranscriptionSession = {
      id,
      createdAt: now,
      updatedAt: now,
      title: insertSession.title || null,
      status: insertSession.status || null,
      userId: insertSession.userId || null,
      sourceLanguage: insertSession.sourceLanguage || null,
      targetLanguage: insertSession.targetLanguage || null,
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: string): Promise<TranscriptionSession | undefined> {
    return this.sessions.get(id);
  }

  async getUserSessions(userId: string): Promise<TranscriptionSession[]> {
    return Array.from(this.sessions.values()).filter(
      (session) => session.userId === userId
    );
  }

  async updateSession(id: string, updates: Partial<TranscriptionSession>): Promise<TranscriptionSession | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates, updatedAt: new Date() };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async addTranscriptionEntry(insertEntry: InsertTranscriptionEntry): Promise<TranscriptionEntry> {
    const id = randomUUID();
    const entry: TranscriptionEntry = {
      id,
      createdAt: new Date(),
      sessionId: insertEntry.sessionId,
      originalText: insertEntry.originalText,
      translatedText: insertEntry.translatedText || null,
      speakerLabel: insertEntry.speakerLabel || null,
      timestamp: insertEntry.timestamp,
      confidence: insertEntry.confidence || null,
    };
    this.entries.set(id, entry);
    console.log(`📝 Added entry ${id} to session ${insertEntry.sessionId}. Total entries: ${this.entries.size}`);
    return entry;
  }

  async getSessionEntries(sessionId: string): Promise<TranscriptionEntry[]> {
    const entries = Array.from(this.entries.values())
      .filter((entry) => entry.sessionId === sessionId)
      .sort((a, b) => a.timestamp - b.timestamp);
    console.log(`📋 Getting entries for session ${sessionId}. Found: ${entries.length} entries. Total in storage: ${this.entries.size}`);
    console.log(`📋 All entries in storage:`, Array.from(this.entries.values()).map(e => ({ id: e.id, sessionId: e.sessionId, text: e.originalText.substring(0, 50) })));
    return entries;
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    return Array.from(this.userSettings.values()).find(
      (settings) => settings.userId === userId
    );
  }

  async updateUserSettings(userId: string, insertSettings: InsertUserSettings): Promise<UserSettings> {
    const existing = await this.getUserSettings(userId);
    const now = new Date();
    
    if (existing) {
      const updated: UserSettings = {
        ...existing,
        ...insertSettings,
        updatedAt: now,
      };
      this.userSettings.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const settings: UserSettings = {
        ...insertSettings,
        id,
        createdAt: now,
        updatedAt: now,
      };
      this.userSettings.set(id, settings);
      return settings;
    }
  }
}

export const storage = new MemStorage();
