"use client";

import { useRef, useCallback, useEffect } from "react";
import Map, {
  Layer,
  Source,
  Marker,
  type MapRef,
  type MapMouseEvent,
} from "react-map-gl/mapbox-legacy";
import "mapbox-gl/dist/mapbox-gl.css";
import { bbox } from "@turf/turf";
import type { Boundary } from "@/lib/boundaries";
import type { Round } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;
const defaultZoom = () => (isMobile() ? 1.8 : 2.3);
const defaultCenter = (): [number, number] => isMobile() ? [-96, 38] : [-95, 47];


interface GuessPin {
  lat: number;
  lng: number;
}

interface Props {
  round: Round | null;
  phase: "guessing" | "result" | "idle" | "complete";
  onGuess: (lat: number, lng: number) => void;
  guessPin: GuessPin | null;
  boundary: Boundary | null;
  boundaryTarget?: [number, number];
}

export default function Map3D({ round, phase, onGuess, guessPin, boundary, boundaryTarget }: Props) {
  const mapRef = useRef<MapRef>(null);

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (phase !== "guessing") return;
      onGuess(e.lngLat.lat, e.lngLat.lng);
    },
    [phase, onGuess]
  );

  // Fly to correct answer when result is shown
  useEffect(() => {
    if (phase === "result" && round && mapRef.current) {
      if (boundary) {
        const [west, south, east, north] = bbox(boundary);
        // A boundary spanning the antimeridian has a wide conventional bounding box.
        if (east - west < 180) {
          mapRef.current.fitBounds([[west, south], [east, north]], {
            padding: 35, maxZoom: 9, pitch: 0, duration: 1200,
          });
          return;
        }
      }
      mapRef.current.flyTo({
        center: [round.lng, round.lat],
        zoom: boundary ? 3 : 5,
        pitch: 45,
        duration: 1200,
      });
    }
    if (phase === "guessing") {
      mapRef.current?.flyTo({
        center: defaultCenter(),
        zoom: defaultZoom(),
        pitch: 0,
        bearing: 0,
        duration: 800,
      });
    }
  }, [phase, round, boundary]);

  // Arc GeoJSON between guess and answer
  const target = boundary ? boundaryTarget : round && ([round.lng, round.lat] as const);
  const arcGeoJson =
    phase === "result" && guessPin && target
      ? buildArc(guessPin.lng, guessPin.lat, target[0], target[1])
      : null;

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: defaultCenter()[0],
          latitude: defaultCenter()[1],
          zoom: defaultZoom(),
          pitch: 0,
          bearing: 0,
        }}
        minZoom={1.5}
        maxZoom={12}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        terrain={{ source: "mapbox-dem", exaggeration: 1.5 }}
        cursor={phase === "guessing" ? "crosshair" : "default"}
        onClick={handleClick}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Terrain DEM source */}
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />

        {/* Sky layer for atmosphere */}
        <Layer
          id="sky"
          type="sky"
          paint={
            {
              "sky-type": "atmosphere",
              "sky-atmosphere-sun": [0, 90],
              "sky-atmosphere-sun-intensity": 15,
            } as object
          }
        />

        {phase === "result" && boundary && (
          <Source id="answer-boundary" type="geojson" data={boundary}>
            <Layer id="answer-fill" type="fill" paint={{ "fill-color": "#22c55e", "fill-opacity": 0.2 }} />
            <Layer id="answer-outline" type="line" paint={{ "line-color": "#4ade80", "line-width": 3 }} />
          </Source>
        )}

        {/* Arc line between guess and correct answer */}
        {arcGeoJson && (
          <Source id="arc" type="geojson" data={arcGeoJson}>
            <Layer
              id="arc-line"
              type="line"
              paint={{
                "line-color": "#facc15",
                "line-width": 2,
                "line-opacity": 0.9,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        )}

        {/* Guess pin */}
        {guessPin && (
          <Marker longitude={guessPin.lng} latitude={guessPin.lat}>
            <div className="flex flex-col items-center -translate-y-full">
              <div className="w-4 h-4 rounded-full bg-blue-400 border-2 border-white shadow-lg" />
              <div className="w-0.5 h-4 bg-blue-400" />
            </div>
          </Marker>
        )}

        {/* Correct answer marker (shown in result phase) */}
        {phase === "result" && round && !boundary && (
          <Marker longitude={round.lng} latitude={round.lat}>
            <div className="flex flex-col items-center -translate-y-full">
              <div className="px-2 py-0.5 rounded text-xs font-bold bg-green-500 text-white shadow mb-1 whitespace-nowrap">
                {round.answer}
              </div>
              <div className="w-4 h-4 rounded-full bg-green-400 border-2 border-white shadow-lg animate-pulse" />
              <div className="w-0.5 h-4 bg-green-400" />
            </div>
          </Marker>
        )}
      </Map>

      {/* Crosshair hint */}
      {phase === "guessing" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1.5 rounded-full pointer-events-none">
          Click anywhere on the map to place your guess
        </div>
      )}
    </div>
  );
}

/** Build a curved arc GeoJSON between two points */
function buildArc(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
  steps = 50
): GeoJSON.Feature<GeoJSON.LineString> {
  const coords: [number, number][] = [];
  const longitudeChange = ((lng2 - lng1 + 180) % 360 + 360) % 360 - 180;
  const curvature = Math.min(3, Math.hypot(longitudeChange, lat2 - lat1) / 6);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lng = lng1 + longitudeChange * t;
    const lat = lat1 + (lat2 - lat1) * t;
    const arc = Math.sin(Math.PI * t) * curvature;
    coords.push([lng, lat + arc]);
  }
  return {
    type: "Feature",
    geometry: { type: "LineString", coordinates: coords },
    properties: {},
  };
}
