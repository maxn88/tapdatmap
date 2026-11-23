"""Build TapDatMap park polygons from the NPS Land Resources Division."""

from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from itertools import batched
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
import json
import re
import time

ROOT = Path(__file__).resolve().parents[1]
QUERY = ("https://services1.arcgis.com/fBc8EJBxQRMcHlei/ArcGIS/rest/services/"
         "NPS_Land_Resources_Division_Boundary_and_Tract_Data_Service/FeatureServer/2/query")
# These clues ask for the protected site as a whole. Individual buildings,
# natural features, and markers keep their location pins.
AREA_LANDMARKS = {
    "Chaco Culture National Historical Park, NM",
    "Devil's Tower National Monument, WY",
    "Gettysburg National Military Park, PA",
    "Golden Spike National Historic Site, UT",
    "Little Bighorn Battlefield, MT",
    "Muir Woods National Monument, CA",
}
OFFICIAL_NAMES = {
    "Golden Spike National Historic Site": "Golden Spike National Historical Park",
    "Little Bighorn Battlefield": "Little Bighorn Battlefield National Monument",
    "New River Gorge National Park": "New River Gorge National Park and Preserve",
    # The legislated park boundary includes the three partner state parks.
    "Redwood National and State Parks": "Redwood National Park",
}


def query(where, geometry=False):
    params = dict(
        where=where,
        outFields="UNIT_CODE,UNIT_NAME",
        returnGeometry="true" if geometry else "false",
        f="geojson" if geometry else "json",
    )
    if geometry:
        params.update(outSR=4326, geometryPrecision=5, maxAllowableOffset=0.00008)
    else:
        params["returnDistinctValues"] = "true"
    for attempt in range(3):
        try:
            with urlopen(f"{QUERY}?{urlencode(params)}", timeout=55) as response:
                payload = json.load(response)
            if payload.get("error") or payload.get("exceededTransferLimit"):
                raise ValueError(payload.get("error") or "Truncated NPS response")
            return payload["features"]
        except (OSError, ValueError):
            if attempt == 2:
                raise
            time.sleep(1 + attempt)


def normalized(name):
    return re.sub(r"[^a-z0-9]", "", name.casefold())


def quoted(value):
    return "'" + value.replace("'", "''") + "'"


def geometry_batch(units):
    where = " OR ".join(
        f"(UNIT_CODE = {quoted(code)} AND UNIT_NAME = {quoted(name)})"
        for code, name in units
    )
    polygons = defaultdict(list)
    for feature in query(where, geometry=True):
        properties = feature["properties"]
        geometry = feature["geometry"]
        if not geometry or geometry["type"] not in ("Polygon", "MultiPolygon"):
            raise ValueError(f"Unexpected NPS geometry for {properties}")
        parts = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        polygons[(properties["UNIT_CODE"], properties["UNIT_NAME"])].extend(parts)
    if set(polygons) != set(units):
        raise ValueError(f"Missing NPS geometry: {set(units) - set(polygons)}")
    return polygons


def main():
    data = ROOT / "data"
    daily = json.loads((data / "daily-puzzles.json").read_text())
    topics = [json.loads(path.read_text()) for path in (data / "quizzes").glob("*.json")]
    answers = {
        round_["answer"] for puzzle in (*daily.values(), *topics) for round_ in puzzle["rounds"]
        if round_["type"] == "national_park" or round_["answer"] in AREA_LANDMARKS
    }
    units = defaultdict(set)
    for feature in query("1=1"):
        properties = feature["attributes"]
        unit_name, code = properties["UNIT_NAME"], properties["UNIT_CODE"]
        if unit_name and code:
            units[normalized(unit_name)].add((code, unit_name))
    selected = {}
    for answer in sorted(answers):
        name = answer.rsplit(", ", 1)[0]
        matches = units[normalized(OFFICIAL_NAMES.get(name, name))]
        if len(matches) != 1:
            raise ValueError(f"Cannot uniquely match {answer}: {sorted(matches)}")
        selected[answer] = next(iter(matches))
    with ThreadPoolExecutor(max_workers=6) as pool:
        boundaries = {
            key: polygons for batch in pool.map(geometry_batch, batched(sorted(set(selected.values())), 8))
            for key, polygons in batch.items()
        }

    directory = ROOT / "public" / "boundaries"
    directory.mkdir(parents=True, exist_ok=True)
    manifest = {answer: f"nps-{code.lower()}" for answer, (code, _) in selected.items()}
    if len(set(manifest.values())) != len(boundaries):
        raise ValueError("Multiple park areas share an NPS code. Define separate IDs.")
    for (code, _), polygons in sorted(boundaries.items()):
        geometry = {"type": "MultiPolygon", "coordinates": polygons}
        (directory / f"nps-{code.lower()}.json").write_text(json.dumps(geometry, separators=(",", ":")) + "\n")
    (data / "park-boundary-ids.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Resolved {len(manifest)} quiz answers to {len(boundaries)} NPS boundaries.")


if __name__ == "__main__":
    main()
