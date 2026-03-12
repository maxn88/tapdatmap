"use client";

import type { Round, RoundType } from "@/lib/types";

const TYPE_LABELS: Record<RoundType, string> = {
  city: "City",
  landmark: "Landmark",
  national_park: "National Park",
  county: "County",
  state_capital: "State Capital",
  state: "State",
};

const TYPE_EMOJI: Record<RoundType, string> = {
  city: "🏙️",
  landmark: "🗿",
  national_park: "🏔️",
  county: "📍",
  state_capital: "🏛️",
  state: "🗺️",
};

interface Props {
  round: Round;
  roundNumber: number;
  totalRounds: number;
}

export default function CluePanel({ round, roundNumber, totalRounds }: Props) {
  const multiplier = roundNumber;

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Round indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Round {roundNumber} / {totalRounds}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-bold">
          {multiplier}x
        </span>
      </div>

      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{TYPE_EMOJI[round.type]}</span>
        <span className="text-sm font-semibold text-gray-300 bg-gray-800 px-2 py-0.5 rounded">
          {TYPE_LABELS[round.type]}
        </span>
      </div>

      {/* Clue */}
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-white text-base leading-relaxed">{round.clue}</p>
      </div>

      {/* Scoring hint */}
      <div className="text-xs text-gray-500 leading-relaxed">
        Up to <span className="text-yellow-400 font-semibold">{(1000 * multiplier).toLocaleString()} pts</span> — closer
        means more points. This round has a{" "}
        <span className="text-yellow-400 font-semibold">{multiplier}x multiplier</span>.
      </div>
    </div>
  );
}
