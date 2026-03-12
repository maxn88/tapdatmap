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
}

export default function Map3D({ round, phase, onGuess, guessPin }: Props) {
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
      mapRef.current.flyTo({
        center: [round.lng, round.lat],
        zoom: 5,
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
  }, [phase, round]);

  // Arc GeoJSON between guess and answer
  const arcGeoJson =
    phase === "result" && guessPin && round
      ? buildArc(guessPin.lng, guessPin.lat, round.lng, round.lat)
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
        {phase === "result" && round && (
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
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lng = lng1 + (lng2 - lng1) * t;
    const lat = lat1 + (lat2 - lat1) * t;
    const arc = Math.sin(Math.PI * t) * 3;
    coords.push([lng, lat + arc]);
  }
  return {
    type: "Feature",
    geometry: { type: "LineString", coordinates: coords },
    properties: {},
  };
}
