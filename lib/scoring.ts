export const MAX_POINTS_PER_ROUND = 1000;
export const DISTANCE_SCALE = 3; // points lost per mile

export function calculateRoundScore(distanceMiles: number, round: number): number {
  const multiplier = round; // rounds 1–5 → 1x–5x
  const raw = Math.max(0, MAX_POINTS_PER_ROUND - distanceMiles / DISTANCE_SCALE);
  return Math.round(raw * multiplier);
}

export function maxPossibleScore(): number {
  // sum of 1000 * (1+2+3+4+5) = 15,000
  return MAX_POINTS_PER_ROUND * 15;
}

/** Returns a label based on score percentage */
export function scoreLabel(total: number): string {
  const pct = total / maxPossibleScore();
  if (pct >= 0.95) return "Perfect!";
  if (pct >= 0.80) return "Excellent";
  if (pct >= 0.60) return "Good";
  if (pct >= 0.40) return "Fair";
  return "Keep Practicing";
}

/** Returns a color class based on distance */
export function distanceColor(miles: number): string {
  if (miles < 50) return "text-green-400";
  if (miles < 200) return "text-yellow-400";
  if (miles < 500) return "text-orange-400";
  return "text-red-400";
}
