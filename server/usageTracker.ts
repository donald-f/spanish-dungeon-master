import { usageTracking } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

const MONTHLY_TURN_LIMIT = 1600;

function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

async function getOrCreateUsageRecord(): Promise<{ year: number; month: number; turnsUsed: number }> {
  const { year, month } = getCurrentYearMonth();
  
  const [existing] = await db.select()
    .from(usageTracking)
    .where(and(eq(usageTracking.year, year), eq(usageTracking.month, month)));
  
  if (existing) {
    return existing;
  }
  
  await db.insert(usageTracking).values({
    year,
    month,
    turnsUsed: 0,
  });
  
  return { year, month, turnsUsed: 0 };
}

export async function getTurnsUsed(): Promise<number> {
  const record = await getOrCreateUsageRecord();
  return record.turnsUsed;
}

export async function getTurnsRemaining(): Promise<number> {
  return MONTHLY_TURN_LIMIT - await getTurnsUsed();
}

export async function canPlayTurns(turnsNeeded: number): Promise<boolean> {
  return (await getTurnsRemaining()) >= turnsNeeded;
}

export async function incrementTurnCount(count: number = 1): Promise<void> {
  const { year, month } = getCurrentYearMonth();
  const record = await getOrCreateUsageRecord();
  
  await db.update(usageTracking)
    .set({ turnsUsed: record.turnsUsed + count })
    .where(and(eq(usageTracking.year, year), eq(usageTracking.month, month)));
}

export function getMonthlyLimit(): number {
  return MONTHLY_TURN_LIMIT;
}

export async function getUsageStats(): Promise<{ used: number; remaining: number; limit: number; monthYear: string }> {
  const record = await getOrCreateUsageRecord();
  const monthYear = `${record.year}-${String(record.month).padStart(2, "0")}`;
  return {
    used: record.turnsUsed,
    remaining: MONTHLY_TURN_LIMIT - record.turnsUsed,
    limit: MONTHLY_TURN_LIMIT,
    monthYear,
  };
}
