import { NextResponse } from "next/server";
import puzzles from "@/data/daily-puzzles.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" }); // YYYY-MM-DD in Central time
  const data = puzzles as Record<string, unknown>;

  const puzzle = data[today];

  if (!puzzle) {
    // Fallback: return the first available puzzle
    const firstKey = Object.keys(data)[0];
    return NextResponse.json(data[firstKey]);
  }

  return NextResponse.json(puzzle);
}
