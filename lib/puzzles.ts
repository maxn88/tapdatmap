import puzzles from "@/data/daily-puzzles.json";
import type { Puzzle } from "@/lib/types";

const PUZZLE_TIME_ZONE = "America/Chicago";

function getPuzzleEntries(): [string, Puzzle][] {
  return Object.entries(puzzles as Record<string, Puzzle>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
}

export function getPuzzleDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PUZZLE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getDailyPuzzle(date = new Date()): Puzzle {
  const entries = getPuzzleEntries();
  const todayKey = getPuzzleDateKey(date);

  const exactMatch = entries.find(([key]) => key === todayKey);
  if (exactMatch) {
    return exactMatch[1];
  }

  const nearestPrevious = [...entries].reverse().find(([key]) => key <= todayKey);
  if (nearestPrevious) {
    return nearestPrevious[1];
  }

  return entries[entries.length - 1][1];
}
