import { randomUUID } from "crypto";
import type { GameState, PlotHook, SpanishLevel, Duration } from "@shared/schema";
import { gameSessions } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface GameSession {
  sessionId: string;
  spanishLevel: SpanishLevel;
  duration: Duration;
  plots?: PlotHook[];
  gameState?: GameState;
  createdAt: number;
  ended?: boolean;
}

export interface IStorage {
  createSession(spanishLevel: SpanishLevel, duration: Duration): Promise<GameSession>;
  getSession(sessionId: string): Promise<GameSession | undefined>;
  updateSession(sessionId: string, updates: Partial<GameSession>): Promise<GameSession | undefined>;
  deleteSession(sessionId: string): Promise<void>;
}

function applySchemaDefaults(state: any): GameState {
  return {
    sessionId: state.sessionId ?? "",
    spanishLevel: state.spanishLevel ?? "A2",
    duration: state.duration ?? "corta",
    targetTurns: state.targetTurns ?? 12,
    turnIndex: state.turnIndex ?? 0,
    progreso: state.progreso ?? 0,
    tension: state.tension ?? 0,
    plot: state.plot ?? { id: "", titulo: "", descripcion: "" },
    inventory: state.inventory ?? { items: [], pistas: [] },
    resumenMemoria: state.resumenMemoria ?? "",
    history: state.history ?? [],
    currentOptions: state.currentOptions ?? [],
    permitirTextoLibre: state.permitirTextoLibre ?? false,
    permitirPreguntas: state.permitirPreguntas ?? true,
    currentNarracion: state.currentNarracion ?? "",
    currentPista: state.currentPista,
    gameEnded: state.gameEnded ?? false,
    salud: state.salud ?? 100,
    estadoAfectos: state.estadoAfectos ?? [],
    banderas: state.banderas ?? [],
    learningLog: state.learningLog ?? [],
    currentPeligro: state.currentPeligro,
    currentConsecuencia: state.currentConsecuencia,
    gameOverRazon: state.gameOverRazon,
    finalRazon: state.finalRazon,
    resumenAprendizajes: state.resumenAprendizajes,
  };
}

function dbRowToSession(row: typeof gameSessions.$inferSelect): GameSession {
  const state = row.state as any;
  return {
    sessionId: row.id,
    spanishLevel: state?.spanishLevel ?? "A2",
    duration: state?.duration ?? "corta",
    plots: state?.plots,
    gameState: state?.gameState ? applySchemaDefaults(state.gameState) : undefined,
    createdAt: row.createdAt.getTime(),
    ended: row.ended,
  };
}

export class DatabaseStorage implements IStorage {
  async createSession(spanishLevel: SpanishLevel, duration: Duration): Promise<GameSession> {
    const sessionId = randomUUID();
    const now = new Date();
    
    const state = {
      spanishLevel,
      duration,
    };
    
    await db.insert(gameSessions).values({
      id: sessionId,
      state,
      createdAt: now,
      updatedAt: now,
    });
    
    return {
      sessionId,
      spanishLevel,
      duration,
      createdAt: now.getTime(),
    };
  }

  async getSession(sessionId: string): Promise<GameSession | undefined> {
    const [row] = await db.select().from(gameSessions).where(eq(gameSessions.id, sessionId));
    if (!row) return undefined;
    return dbRowToSession(row);
  }

  async updateSession(sessionId: string, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    const existing = await this.getSession(sessionId);
    if (!existing) return undefined;
    
    const newState = {
      spanishLevel: updates.spanishLevel ?? existing.spanishLevel,
      duration: updates.duration ?? existing.duration,
      plots: updates.plots ?? existing.plots,
      gameState: updates.gameState ?? existing.gameState,
      ended: updates.ended ?? existing.ended ?? false,
    };
    
    await db.update(gameSessions)
      .set({ 
        state: newState,
        ended: newState.ended,
        updatedAt: new Date(),
      })
      .where(eq(gameSessions.id, sessionId));
    
    return {
      ...existing,
      ...updates,
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(gameSessions).where(eq(gameSessions.id, sessionId));
  }
}

export const storage = new DatabaseStorage();
