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
    <div className="flex flex-col gap-5 p-5 animate-fade-in">
      {/* Score */}
      <div className="text-center">
        <div className="text-5xl font-black text-white tabular-nums">
          {result.score.toLocaleString()}
        </div>
        <div className="text-gray-400 text-sm mt-1">points</div>
      </div>

      {/* State hit banner */}
      {result.hitState && (
        <div className="bg-green-500/20 border border-green-500/40 rounded-xl px-4 py-2 text-center text-green-400 font-semibold text-sm">
          Inside the state! Full points!
        </div>
      )}

      {/* Distance */}
      <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">
            {result.hitState ? "Distance from centroid" : "Distance"}
          </span>
          <span className={`font-bold text-lg ${result.hitState ? "text-green-400" : colorClass}`}>
            {result.hitState ? "Inside!" : formatDistance(result.distanceMiles)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Correct Answer</span>
          <span className="text-white font-semibold text-sm text-right max-w-[160px]">
            {result.round.answer}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Multiplier</span>
          <span className="text-yellow-400 font-bold">{result.roundNumber}x</span>
        </div>
      </div>

      {/* Distance bar — hidden for perfect state hits */}
      {!result.hitState && <DistanceBar miles={result.distanceMiles} />}

      {/* Next button */}
      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 transition-all text-gray-900 font-bold text-base"
      >
        {isLast ? "See Results" : `Next Round →`}
      </button>
    </div>
  );
}

function DistanceBar({ miles }: { miles: number }) {
  // Max scale: 3000 miles (roughly coast-to-coast US)
  const MAX = 3000;
  const pct = Math.min(100, (miles / MAX) * 100);
  const color =
    miles < 50
      ? "bg-green-400"
      : miles < 200
      ? "bg-yellow-400"
      : miles < 500
      ? "bg-orange-400"
      : "bg-red-400";

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>0 mi</span>
        <span>3,000 mi</span>
      </div>
      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
