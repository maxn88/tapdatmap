import { booleanPointInPolygon, nearestPointOnLine, point, polygonToLine } from "@turf/turf";
import type { MultiPolygon, Polygon } from "geojson";
import boundaryIds from "../data/boundary-ids.json";
import { calculateRoundScore, MAX_POINTS_PER_ROUND } from "./scoring";
import type { Round, RoundType } from "./types";

export type Boundary = Polygon | MultiPolygon;

export function boundaryKind(type: RoundType): "place" | "county" | "state" | null {
  switch (type) {
    case "city":
    case "capital":
    case "state_capital":
      return "place";
    case "county":
    case "state":
      return type;
    default:
      return null;
  }
}

export async function loadBoundary(round: Round): Promise<Boundary | null> {
  const kind = boundaryKind(round.type);
  if (!kind) return null;
  const key = `${kind}:${round.answer}` as keyof typeof boundaryIds;
  const id = boundaryIds[key];
  if (!id) throw new Error(`Missing boundary for ${round.answer}`);
  const response = await fetch(`/boundaries/${id}.json`);
  if (!response.ok) throw new Error(`Unable to load Census boundary ${id}`);
  const geometry = await response.json();
  if (geometry?.type !== "Polygon" && geometry?.type !== "MultiPolygon") {
    throw new Error(`Invalid Census boundary ${id}`);
  }
  return geometry;
}

export function scoreBoundary(
  lat: number,
  lng: number,
  boundary: Boundary,
  roundNumber: number,
) {
  const normalizedLng = ((lng + 180) % 360 + 360) % 360 - 180;
  const guess = point([normalizedLng, lat]);
  const hitBoundary = booleanPointInPolygon(guess, boundary) ||
    (normalizedLng === -180 && booleanPointInPolygon([180, lat], boundary));
  const maxScore = MAX_POINTS_PER_ROUND * roundNumber;
  if (hitBoundary) {
    return { hitBoundary, distanceMiles: 0, score: maxScore };
  }

  const outlines = polygonToLine(boundary);
  const lines = outlines.type === "FeatureCollection" ? outlines.features : [outlines];
  let distanceMiles = Infinity;
  let nearestBoundaryPoint: [number, number] | undefined;
  for (const line of lines) {
    const nearest = nearestPointOnLine(line, guess, { units: "miles" });
    const distance = nearest.properties.pointDistance ?? nearest.properties.dist;
    if (distance < distanceMiles) {
      distanceMiles = distance;
      const [longitude, latitude] = nearest.geometry.coordinates;
      nearestBoundaryPoint = [longitude, latitude];
    }
  }
  if (!nearestBoundaryPoint) throw new Error("Boundary has no usable outline");

  return {
    hitBoundary,
    distanceMiles,
    score: Math.min(maxScore - 1, calculateRoundScore(distanceMiles, roundNumber)),
    nearestBoundaryPoint,
  };
}
