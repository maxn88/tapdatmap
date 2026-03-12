"use client";

import type { GuessResult } from "@/lib/types";
import { formatDistance } from "@/lib/geo";
import { scoreLabel, maxPossibleScore } from "@/lib/scoring";

interface Props {
  results: GuessResult[];
  totalScore: number;
  mode: "daily" | "quiz";
  onRestart: () => void;
}

export default function ShareCard({ results, totalScore, mode, onRestart }: Props) {
  const label = scoreLabel(totalScore);
  const pct = Math.round((totalScore / maxPossibleScore()) * 100);

  const shareText = buildShareText(results, totalScore, label);

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: "TapDatMap", text: shareText });
    } else {
      navigator.clipboard.writeText(shareText).then(() => alert("Copied to clipboard!"));
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-3xl font-black text-white">
          Tap<span className="text-yellow-400">Dat</span>Map
        </div>
        <div className="text-gray-400 text-sm mt-1">
          {mode === "daily" ? "Daily Puzzle" : "Quiz Complete"}
        </div>
      </div>

      {/* Total score */}
      <div className="text-center bg-gray-800 rounded-xl p-5">
        <div className="text-6xl font-black text-white tabular-nums">
          {totalScore.toLocaleString()}
        </div>
        <div className="text-gray-400 mt-1">out of {maxPossibleScore().toLocaleString()}</div>
        <div className="mt-2 text-xl font-bold text-yellow-400">{label}</div>
        <div className="mt-1 text-sm text-gray-500">{pct}% accuracy</div>
      </div>

      {/* Round breakdown */}
      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <div key={r.roundNumber} className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              R{r.roundNumber} · {r.round.answer}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">{formatDistance(r.distanceMiles)}</span>
              <span className="text-white font-semibold tabular-nums w-16 text-right">
                +{r.score.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Score bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className="flex-1 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 transition-all text-gray-900 font-bold"
        >
          Share Results
        </button>
        {mode === "quiz" && (
          <button
            onClick={onRestart}
            className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-95 transition-all text-white font-bold"
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}

function buildShareText(results: GuessResult[], total: number, label: string): string {
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const lines = [`TapDatMap — ${today}`, `Score: ${total.toLocaleString()} (${label})`, ""];
  const emojis = results.map((r) => {
    if (r.distanceMiles < 50) return "🟩";
    if (r.distanceMiles < 200) return "🟨";
    if (r.distanceMiles < 500) return "🟧";
    return "🟥";
  });
  lines.push(emojis.join(""));
  lines.push("tapdatmap.com");
  return lines.join("\n");
}
