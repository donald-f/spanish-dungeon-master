import * as fs from "fs";
import * as path from "path";

const USAGE_FILE = path.join(process.cwd(), "usage_data.json");

const MONTHLY_TURN_LIMIT = 1600;

interface UsageData {
  totalTurns: number;
  monthYear: string;
}

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function loadUsageData(): UsageData {
  try {
    if (fs.existsSync(USAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(USAGE_FILE, "utf-8"));
      if (data.monthYear === getCurrentMonthYear()) {
        return data;
      }
    }
  } catch (error) {
    console.error("Error loading usage data:", error);
  }
  return { totalTurns: 0, monthYear: getCurrentMonthYear() };
}

function saveUsageData(data: UsageData): void {
  try {
    fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving usage data:", error);
  }
}

export function getTurnsUsed(): number {
  const data = loadUsageData();
  return data.totalTurns;
}

export function getTurnsRemaining(): number {
  return MONTHLY_TURN_LIMIT - getTurnsUsed();
}

export function canPlayTurns(turnsNeeded: number): boolean {
  return getTurnsRemaining() >= turnsNeeded;
}

export function incrementTurnCount(count: number = 1): void {
  const data = loadUsageData();
  data.totalTurns += count;
  saveUsageData(data);
}

export function getMonthlyLimit(): number {
  return MONTHLY_TURN_LIMIT;
}

export function getUsageStats(): { used: number; remaining: number; limit: number; monthYear: string } {
  const data = loadUsageData();
  return {
    used: data.totalTurns,
    remaining: MONTHLY_TURN_LIMIT - data.totalTurns,
    limit: MONTHLY_TURN_LIMIT,
    monthYear: data.monthYear,
  };
}
