import { Suspense } from "react";
import puzzles from "@/data/daily-puzzles.json";
import type { Puzzle } from "@/lib/types";
import GameEngine from "@/components/GameEngine";
import QuizMenu from "@/components/QuizMenu";

function getTodaysPuzzle(): Puzzle {
  const today = new Date().toISOString().slice(0, 10);
  const data = puzzles as Record<string, Puzzle>;
  return data[today] ?? data[Object.keys(data)[0]];
}

export default function HomePage() {
  const puzzle = getTodaysPuzzle();

  return (
    <main className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Quiz topic strip — compact on mobile */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border-b border-gray-800 overflow-x-auto scrollbar-none">
        <span className="text-xs text-gray-500 uppercase tracking-widest shrink-0 hidden sm:inline">Quizzes</span>
        <QuizMenu />
      </div>

      {/* Game */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<LoadingScreen />}>
          <GameEngine puzzle={puzzle} mode="daily" />
        </Suspense>
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <div className="flex-1 flex items-center justify-center text-gray-400">
      Loading puzzle…
    </div>
  );
}
