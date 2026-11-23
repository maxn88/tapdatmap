export type RoundType = "city" | "landmark" | "national_park" | "county" | "state_capital" | "state" | "capital" | "monument" | "university";

export interface Round {
  id: number;
  type: RoundType;
  clue: string;
  answer: string;
  lat: number;
  lng: number;
  /** [minLng, minLat, maxLng, maxLat] legacy state bounding box */
  bbox?: [number, number, number, number];
}

export interface Puzzle {
  puzzleNumber: number;
  title: string;
  rounds: Round[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  emoji: string;
  rounds: Round[];
}

export interface GuessResult {
  round: Round;
  guessLat: number;
  guessLng: number;
  distanceMiles: number;
  score: number;
  roundNumber: number;
  hitBoundary?: boolean;
}

export type GameMode = "daily" | "quiz";

export type GamePhase = "idle" | "guessing" | "result" | "complete";
