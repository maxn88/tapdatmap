"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Puzzle, Quiz, GuessResult, GamePhase } from "@/lib/types";
import { distanceMiles, distanceToNearestBboxEdge, reverseGeocodeState } from "@/lib/geo";
import { calculateRoundScore, MAX_POINTS_PER_ROUND } from "@/lib/scoring";
import RoundResult from "./RoundResult";
import ShareCard from "./ShareCard";
import CluePanel from "./CluePanel";

const Map3D = dynamic(() => import("./Map3D"), { ssr: false });

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Props {
  puzzle: Puzzle | Quiz;
  mode: "daily" | "quiz";
}

export default function GameEngine({ puzzle, mode }: Props) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("guessing");
  const [guessPin, setGuessPin] = useState<{ lat: number; lng: number } | null>(null);
  const [results, setResults] = useState<GuessResult[]>([]);

  const currentRound = puzzle.rounds[roundIndex];
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);

  const handleGuess = useCallback(
    async (lat: number, lng: number) => {
      if (phase !== "guessing") return;
      setGuessPin({ lat, lng });

      const roundNumber = roundIndex + 1;
      let dist: number;
      let hitState = false;
      let score: number;

      if (currentRound.type === "state") {
        // Check if the guess lands inside the correct state via reverse geocoding
        const guessedState = await reverseGeocodeState(lat, lng, MAPBOX_TOKEN);
        hitState = guessedState?.toLowerCase() === currentRound.answer.toLowerCase();

        if (hitState) {
          score = MAX_POINTS_PER_ROUND * roundNumber;
          dist = 0;
        } else {
          // Distance from nearest point on the state's bounding box edge
          dist = currentRound.bbox
            ? distanceToNearestBboxEdge(lat, lng, currentRound.bbox)
            : distanceMiles(lat, lng, currentRound.lat, currentRound.lng);
          score = calculateRoundScore(dist, roundNumber);
        }
      } else {
        dist = distanceMiles(lat, lng, currentRound.lat, currentRound.lng);
        score = calculateRoundScore(dist, roundNumber);
      }

      setResults((prev) => [
        ...prev,
        {
          round: currentRound,
          guessLat: lat,
          guessLng: lng,
          distanceMiles: dist,
          score,
          roundNumber,
          hitState,
        },
      ]);
      setPhase("result");
    },
    [phase, currentRound, roundIndex]
  );

  const handleNext = useCallback(() => {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= puzzle.rounds.length) {
      setPhase("complete");
    } else {
      setRoundIndex(nextIndex);
      setGuessPin(null);
      setPhase("guessing");
    }
  }, [roundIndex, puzzle.rounds.length]);

  const handleRestart = useCallback(() => {
    setRoundIndex(0);
    setPhase("guessing");
    setGuessPin(null);
    setResults([]);
  }, []);

  if (phase === "complete") {
    return (
      <div className="flex flex-col h-screen bg-gray-950">
        <Header title={puzzle.title} score={totalScore} roundIndex={roundIndex} total={puzzle.rounds.length} />
        <div className="flex-1 flex items-center justify-center p-4">
          <ShareCard results={results} totalScore={totalScore} mode={mode} onRestart={handleRestart} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <Header
        title={puzzle.title}
        score={totalScore}
        roundIndex={roundIndex}
        total={puzzle.rounds.length}
      />

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Map — takes all remaining space on mobile */}
        <div className="flex-1 md:flex-1 relative min-h-0">
          <Map3D
            round={currentRound}
            phase={phase as "guessing" | "result" | "idle" | "complete"}
            onGuess={handleGuess}
            guessPin={guessPin}
          />
        </div>

        {/* Panel — fixed compact height on mobile, sidebar on desktop */}
        <div className="h-[45vh] md:h-auto md:flex-none md:w-72 flex flex-col bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 overflow-y-auto shrink-0">
          {phase === "guessing" && (
            <CluePanel
              round={currentRound}
              roundNumber={roundIndex + 1}
              totalRounds={puzzle.rounds.length}
            />
          )}
          {phase === "result" && results.length > 0 && (
            <RoundResult
              result={results[results.length - 1]}
              roundNumber={roundIndex + 1}
              totalRounds={puzzle.rounds.length}
              onNext={handleNext}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Header({
  title,
  score,
  roundIndex,
  total,
}: {
  title: string;
  score: number;
  roundIndex: number;
  total: number;
}) {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-2">
        <span className="text-base font-black tracking-tight text-white">
          Tap<span className="text-yellow-400">Dat</span>Map
        </span>
        <span className="text-xs text-gray-400 hidden sm:inline">{title}</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < roundIndex
                  ? "bg-green-400"
                  : i === roundIndex
                  ? "bg-yellow-400"
                  : "bg-gray-700"
              }`}
            />
          ))}
        </div>
        <div className="text-white font-bold tabular-nums">
          {score.toLocaleString()} <span className="text-gray-400 font-normal text-sm">pts</span>
        </div>
      </div>
    </header>
  );
}
