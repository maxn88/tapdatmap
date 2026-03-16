import { notFound } from "next/navigation";
import { readFileSync } from "fs";
import { join } from "path";
import type { Quiz } from "@/lib/types";
import GameEngine from "@/components/GameEngine";

interface Props {
  params: Promise<{ topic: string }>;
}

const ROUNDS_PER_GAME = 5;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getQuiz(topic: string): Quiz | null {
  try {
    const filePath = join(process.cwd(), "data", "quizzes", `${topic}.json`);
    const raw = readFileSync(filePath, "utf-8");
    const quiz = JSON.parse(raw) as Quiz;
    const picked = shuffle(quiz.rounds).slice(0, ROUNDS_PER_GAME).map((r, i) => ({ ...r, id: i + 1 }));
    return { ...quiz, rounds: picked };
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
