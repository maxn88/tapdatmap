"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { Puzzle, Quiz, GuessResult, GamePhase } from "@/lib/types";
import { distanceMiles } from "@/lib/geo";
import { loadBoundary, scoreBoundary, type Boundary } from "@/lib/boundaries";
import { calculateRoundScore } from "@/lib/scoring";
import RoundResult from "./RoundResult";
import ShareCard from "./ShareCard";
import CluePanel from "./CluePanel";

const Map3D = dynamic(() => import("./Map3D"), { ssr: false });

interface Props {
  puzzle: Puzzle | Quiz;
  mode: "daily" | "quiz";
}

export default function GameEngine({ puzzle, mode }: Props) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("guessing");
  const [guessPin, setGuessPin] = useState<{ lat: number; lng: number } | null>(null);
  const [results, setResults] = useState<GuessResult[]>([]);
  const [boundary, setBoundary] = useState<Boundary | null>(null);
  const [boundaryTarget, setBoundaryTarget] = useState<[number, number]>();
  const [guessError, setGuessError] = useState(false);
  const guessLockedRef = useRef(false);

  const currentRound = puzzle.rounds[roundIndex];
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);

  const handleGuess = useCallback(
    async (lat: number, lng: number) => {
      if (phase !== "guessing" || guessLockedRef.current) return;
      guessLockedRef.current = true;
      setGuessPin({ lat, lng });
      setGuessError(false);

      try {
        const roundNumber = roundIndex + 1;
        const boundary = await loadBoundary(currentRound);
        const distance = boundary ? 0 : distanceMiles(lat, lng, currentRound.lat, currentRound.lng);
        const result = boundary
          ? scoreBoundary(lat, lng, boundary, roundNumber)
          : { distanceMiles: distance, score: calculateRoundScore(distance, roundNumber) };
        setBoundary(boundary);
        setBoundaryTarget("nearestBoundaryPoint" in result ? result.nearestBoundaryPoint : undefined);

        setResults((prev) => [
          ...prev,
          {
            round: currentRound,
            guessLat: lat,
            guessLng: lng,
            ...result,
            roundNumber,
          },
        ]);
        setPhase("result");
      } catch (error) {
        guessLockedRef.current = false;
        setGuessPin(null);
        setGuessError(true);
        console.error("Failed to score guess", error);
      }
    },
    [phase, currentRound, roundIndex]
  );

  const handleNext = useCallback(() => {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= puzzle.rounds.length) {
      setPhase("complete");
    } else {
      guessLockedRef.current = false;
      setRoundIndex(nextIndex);
      setGuessPin(null);
      setPhase("guessing");
    }
  }, [roundIndex, puzzle.rounds.length]);

  const handleRestart = useCallback(() => {
    guessLockedRef.current = false;
    setRoundIndex(0);
    setPhase("guessing");
    setGuessPin(null);
    setResults([]);
  }, []);

  if (phase === "complete") {
    return (
      <div className="flex flex-col h-screen bg-gray-950">
        <Header title={puzzle.title} score={totalScore} roundIndex={roundIndex} total={puzzle.rounds.length} />
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4">
            <ShareCard results={results} totalScore={totalScore} mode={mode} onRestart={handleRestart} />
          </div>
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
            boundary={phase === "result" ? boundary : null}
            boundaryTarget={boundaryTarget}
          />
        </div>

        {/* Panel — fixed compact height on mobile, sidebar on desktop */}
        <div className="h-[45vh] md:h-auto md:flex-none md:w-72 flex flex-col bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 overflow-y-auto shrink-0">
          {guessError && (
            <p className="px-3 pt-3 text-sm text-amber-300" role="status">
              Couldn’t check that guess. Tap the map to try again.
            </p>
          )}
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
