import { randomUUID } from "crypto";
import type { GameState, PlotHook, SpanishLevel, Duration } from "@shared/schema";
import { durationToTurns } from "@shared/schema";

export interface GameSession {
  sessionId: string;
  spanishLevel: SpanishLevel;
  duration: Duration;
  plots?: PlotHook[];
  gameState?: GameState;
  createdAt: number;
}

export interface IStorage {
  createSession(spanishLevel: SpanishLevel, duration: Duration): Promise<GameSession>;
  getSession(sessionId: string): Promise<GameSession | undefined>;
  updateSession(sessionId: string, updates: Partial<GameSession>): Promise<GameSession | undefined>;
  deleteSession(sessionId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, GameSession>;

  constructor() {
    this.sessions = new Map();
  }

  async createSession(spanishLevel: SpanishLevel, duration: Duration): Promise<GameSession> {
    const sessionId = randomUUID();
    const session: GameSession = {
      sessionId,
      spanishLevel,
      duration,
      createdAt: Date.now(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<GameSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async updateSession(sessionId: string, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    const updated = { ...session, ...updates };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}

export const storage = new MemStorage();
