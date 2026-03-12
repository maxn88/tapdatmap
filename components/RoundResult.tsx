"use client";

import type { GuessResult } from "@/lib/types";
import { formatDistance } from "@/lib/geo";
import { distanceColor as scoreColor } from "@/lib/scoring";

interface Props {
  result: GuessResult;
  roundNumber: number;
  totalRounds: number;
  onNext: () => void;
}

export default function RoundResult({ result, roundNumber, totalRounds, onNext }: Props) {
  const isLast = roundNumber === totalRounds;
  const colorClass = scoreColor(result.distanceMiles);

  return (
    <div className="flex flex-col gap-2 p-3 md:gap-5 md:p-5 animate-fade-in">
      {/* Score + state hit — one row on mobile */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-3xl md:text-5xl font-black text-white tabular-nums">
            {result.score.toLocaleString()}
          </span>
          <span className="text-gray-400 text-xs ml-1">pts</span>
        </div>
        {result.hitState && (
          <span className="text-green-400 text-xs font-semibold bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
            Inside! Full pts
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="bg-gray-800 rounded-xl p-2.5 md:p-4 flex flex-col gap-1.5 md:gap-2">
        <div className="flex items-center justify-between text-xs md:text-sm">
          <span className="text-gray-400">Distance</span>
          <span className={`font-bold ${result.hitState ? "text-green-400" : colorClass}`}>
            {result.hitState ? "Inside!" : formatDistance(result.distanceMiles)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs md:text-sm">
          <span className="text-gray-400">Answer</span>
          <span className="text-white font-semibold text-right max-w-[160px] truncate">
            {result.round.answer}
          </span>
        </div>
        {/* Distance bar — hidden on mobile */}
        {!result.hitState && <DistanceBar miles={result.distanceMiles} className="hidden md:block" />}
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        className="w-full py-2 md:py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 transition-all text-gray-900 font-bold text-sm md:text-base"
      >
        {isLast ? "See Results" : "Next Round →"}
      </button>
    </div>
  );
}

function DistanceBar({ miles, className = "" }: { miles: number; className?: string }) {
  const MAX = 3000;
  const pct = Math.min(100, (miles / MAX) * 100);
  const color =
    miles < 50 ? "bg-green-400" : miles < 200 ? "bg-yellow-400" : miles < 500 ? "bg-orange-400" : "bg-red-400";

  return (
    <div className={className}>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>0 mi</span>
        <span>3,000 mi</span>
      </div>
      <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
