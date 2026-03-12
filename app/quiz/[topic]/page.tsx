import { notFound } from "next/navigation";
import { readFileSync } from "fs";
import { join } from "path";
import type { Quiz } from "@/lib/types";
import GameEngine from "@/components/GameEngine";

interface Props {
  params: Promise<{ topic: string }>;
}

function getQuiz(topic: string): Quiz | null {
  try {
    const filePath = join(process.cwd(), "data", "quizzes", `${topic}.json`);
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Quiz;
  } catch {
    return null;
  }
}

export default async function QuizPage({ params }: Props) {
  const { topic } = await params;
  const quiz = getQuiz(topic);
  if (!quiz) notFound();

  return (
    <main className="h-screen bg-gray-950 text-white">
      <GameEngine puzzle={quiz} mode="quiz" />
    </main>
  );
}
