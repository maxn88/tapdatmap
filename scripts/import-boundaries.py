"""Build TapDatMap's boundary assets from U.S. Census TIGERweb (2026 vintage)."""

from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from itertools import batched
from pathlib import Path
import json
import re
import time
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/"
LAYERS = {
    "state": "State_County/MapServer/0",
    "county": "State_County/MapServer/1",
    "place": "Places_CouSub_ConCity_SubMCD/MapServer/4",
    "cdp": "Places_CouSub_ConCity_SubMCD/MapServer/5",
}
FIPS = dict(token.split(":") for token in (
    "AL:01 AK:02 AZ:04 AR:05 CA:06 CO:08 CT:09 DE:10 DC:11 FL:12 GA:13 HI:15 ID:16 IL:17 IN:18 "
    "IA:19 KS:20 KY:21 LA:22 ME:23 MD:24 MA:25 MI:26 MN:27 MS:28 MO:29 MT:30 NE:31 NV:32 NH:33 "
    "NJ:34 NM:35 NY:36 NC:37 ND:38 OH:39 OK:40 OR:41 PA:42 RI:44 SC:45 SD:46 TN:47 TX:48 UT:49 "
    "VT:50 VA:51 WA:53 WV:54 WI:55 WY:56"
).split())
PLACE_IDS = {
    "Honolulu, HI": ("cdp", "1571550"),  # Urban Honolulu census-designated place
    "Indianapolis, IN": ("place", "1836003"),  # Indianapolis city (balance)
    "Louisville, KY": ("place", "2148006"),  # Louisville/Jefferson metro government (balance)
    "Nashville, TN": ("place", "4752006"),  # Nashville-Davidson metro government (balance)
}
PLACE_NAMES = {
    "Boise, ID": "Boise City",
    "Saint Paul, MN": "St. Paul",
    "New York County (Manhattan), NY": "New York",
}


def rounds():
    data = ROOT / "data"
    for puzzle in json.loads((data / "daily-puzzles.json").read_text()).values():
        yield from puzzle["rounds"]
    for quiz in sorted((data / "quizzes").glob("*.json")):
        yield from json.loads(quiz.read_text())["rounds"]


def lookup(kind, answer):
    if kind == "state":
        return kind, f"BASENAME = {quoted(answer)}"
    name, state = answer.rsplit(", ", 1)
    if kind == "place" and answer in PLACE_IDS:
        layer, geoid = PLACE_IDS[answer]
        return layer, f"GEOID = '{geoid}'"
    basename = PLACE_NAMES.get(answer, re.sub(r" County$", "", name) if kind == "county" else name)
    return kind, f"STATE = '{FIPS[state]}' AND BASENAME = {quoted(basename)}"


def quoted(value):
    return "'" + value.replace("'", "''") + "'"


def query(layer, where, geometry=False):
    fields = {
        "where": where,
        "outFields": "GEOID,NAME,BASENAME,STATE",
        "returnGeometry": str(geometry).lower(),
        "f": "geojson" if geometry else "json",
    }
    if geometry:
        fields.update(outSR=4326, geometryPrecision=5, maxAllowableOffset=0.00008)
    url = SOURCE + LAYERS[layer] + "/query?" + urlencode(fields)
    for attempt in range(3):
        try:
            with urlopen(url, timeout=55) as response:
                payload = json.load(response)
            if payload.get("error") or payload.get("exceededTransferLimit"):
                raise ValueError((layer, where, payload.get("error") or "truncated response"))
            return payload["features"]
        except (OSError, ValueError):
            if attempt == 2:
                raise
            time.sleep(1 + attempt)


def metadata(job):
    layer, clauses = job
    features = [f["attributes"] for f in query(layer, " OR ".join(f"({c})" for c in clauses))]
    matched = {}
    issues = []
    for clause in clauses:
        expected = dict(re.findall(r"(GEOID|STATE|BASENAME) = '((?:[^']|'')*)'", clause))
        ids = {f["GEOID"] for f in features
               if all(f[key] == value.replace("''", "'") for key, value in expected.items())}
        if len(ids) != 1:
            issues.append((layer, clause, sorted(ids)))
        else:
            matched[(layer, clause)] = ids.pop()
    return matched, issues


def geometries(job):
    layer, ids = job
    features = query(layer, f"GEOID IN ({','.join(quoted(geoid) for geoid in ids)})", geometry=True)
    if {f["properties"]["GEOID"] for f in features} != set(ids):
        raise ValueError((layer, ids, "incomplete geometries"))
    result = {}
    for feature in features:
        geoid = feature["properties"]["GEOID"]
        geometry = feature["geometry"]
        if geometry["type"] not in ("Polygon", "MultiPolygon") or not geometry["coordinates"]:
            raise ValueError((layer, geoid, "unexpected geometry"))
        result[geoid] = geometry
    return result


def main():
    round_kinds = {"city": "place", "capital": "place", "state_capital": "place", "state": "state", "county": "county"}
    keys = sorted({(round_kinds[r["type"]], r["answer"]) for r in rounds() if r["type"] in round_kinds})
    tasks = {key: lookup(*key) for key in keys}
    unique_tasks = list(dict.fromkeys(tasks.values()))
    with ThreadPoolExecutor(max_workers=8) as pool:
        grouped = defaultdict(list)
        for layer, clause in unique_tasks:
            grouped[layer].append(clause)
        metadata_jobs = [(layer, clauses) for layer, names in grouped.items() for clauses in batched(names, 12)]
        identities = {}
        missing = []
        for matched, issues in pool.map(metadata, metadata_jobs):
            identities.update(matched)
            missing.extend(issues)
        if missing:
            raise ValueError(f"Unresolved or ambiguous Census labels: {missing}")
        layers = defaultdict(set)
        manifest = {}
        for (kind, answer), task in tasks.items():
            geoid = identities[task]
            layers[task[0]].add(geoid)
            manifest[f"{kind}:{answer}"] = geoid

        jobs = [(layer, ids) for layer, ids_set in layers.items()
                for ids in batched(sorted(ids_set), 4 if layer == "state" else 12)]
        shapes = {}
        for results in pool.map(geometries, jobs):
            shapes.update(results)

    destination = ROOT / "public" / "boundaries"
    destination.mkdir(parents=True, exist_ok=True)
    for geoid, shape in sorted(shapes.items()):
        (destination / f"{geoid}.json").write_text(json.dumps(shape, separators=(",", ":")) + "\n")
    (ROOT / "data" / "boundary-ids.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Resolved {len(manifest)} area labels to {len(shapes)} Census boundaries.")


if __name__ == "__main__":
    main()
