"use client";

import Link from "next/link";

const QUIZZES = [
  { id: "states", label: "States", emoji: "🗺️" },
  { id: "national-parks", label: "National Parks", emoji: "🏔️" },
  { id: "monuments", label: "Monuments", emoji: "🗽" },
  { id: "universities", label: "Universities", emoji: "🎓" },
  { id: "state-capitals", label: "State Capitals", emoji: "🏛️" },
];

export default function QuizMenu() {
  return (
    <div className="flex gap-2">
      {QUIZZES.map((q) => (
        <Link
          key={q.id}
          href={`/quiz/${q.id}`}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors text-sm text-white shrink-0"
        >
          <span>{q.emoji}</span>
          <span>{q.label}</span>
        </Link>
      ))}
    </div>
  );
}
