import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ topic: string }> }
) {
  const { topic } = await params;
  try {
    const filePath = join(process.cwd(), "data", "quizzes", `${topic}.json`);
    const raw = readFileSync(filePath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }
}
