export type RoundType = "city" | "landmark" | "national_park" | "county" | "state_capital" | "state";

export interface Round {
  id: number;
  type: RoundType;
  clue: string;
  answer: string;
  lat: number;
  lng: number;
  /** [minLng, minLat, maxLng, maxLat] bounding box — used for state rounds */
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
  hitState?: boolean; // true when guess landed inside the correct state boundary
}

export type GameMode = "daily" | "quiz";

export type GamePhase = "idle" | "guessing" | "result" | "complete";
