import { NextResponse } from "next/server";
import { getDailyPuzzle } from "@/lib/puzzles";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getDailyPuzzle());
}
