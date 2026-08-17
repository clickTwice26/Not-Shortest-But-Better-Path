"""Gemini at the edges (PLAN.md §7).

Two jobs only: turn messy code-mixed Bengali-Latin text into structured fields.
It never plans a route, never estimates a fare, never emits coordinates — those
are deterministic and Gemini would hallucinate them confidently.

Without an API key everything falls back to a keyword heuristic so the demo
still runs.
"""

from __future__ import annotations

import json
import logging
import re

import httpx

from .config import settings
from .modes import MODES

log = logging.getLogger(__name__)

API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models"

QUERY_SCHEMA = {
    "type": "object",
    "properties": {
        "origin_text": {"type": "string"},
        "destination_text": {"type": "string"},
        "priority": {"type": "string", "enum": ["cheapest", "balanced", "fastest"]},
        "max_duration_min": {"type": "number"},
        "max_cost_bdt": {"type": "number"},
        "modes": {"type": "array", "items": {"type": "string"}},
        "language": {"type": "string"},
        "confidence": {"type": "number"},
    },
    "required": ["origin_text", "destination_text", "priority", "confidence"],
}

TRIP_SCHEMA = {
    "type": "object",
    "properties": {
        "mode": {"type": "string", "enum": list(MODES.keys())},
        "origin_text": {"type": "string"},
        "dest_text": {"type": "string"},
        "fare_paid": {"type": "number"},
        "duration_min": {"type": "number"},
        "conditions": {"type": "string"},
        "confidence": {"type": "number"},
    },
    "required": ["mode", "fare_paid", "confidence"],
}

QUERY_PROMPT = """You parse journey requests for a Dhaka transport app.
Input is code-mixed Bengali-Latin ("Banglish"), Bengali script, or English.

Extract the origin and destination as the user wrote them — do NOT translate
place names, normalise spelling, or invent coordinates.

priority: "cheapest" if they mention saving money (taka bachate, sasta, kom
khoroch), "fastest" if they mention hurry (taratari, joldi, late), else
"balanced".
Set max_duration_min / max_cost_bdt only when an explicit number is given.
confidence is 0-1 for how sure you are about origin and destination.

Input: {text}"""

TRIP_PROMPT = """You extract a completed trip from a Dhaka commuter's note.
Input is code-mixed Bengali-Latin ("Banglish"), Bengali script, or English.

mode mapping: cng/সিএনজি -> cng, rickshaw/rikshaw/রিকশা -> rickshaw,
bus/বাস -> bus, metro/মেট্রো/mrt -> metro, pathao bike/uber moto/bike -> bike_hail,
uber car/car/cab -> car_hail, hete/walk -> walk.

fare_paid is the taka actually paid. Do NOT guess it if absent — omit instead.
conditions: short note like "heavy_traffic", "rain", "night", "bargained" when
the text implies it.

Input: {text}"""


async def _generate(prompt: str, schema: dict) -> dict | None:
    if not settings.gemini_api_key:
        return None

    url = f"{API_ROOT}/{settings.gemini_model}:generateContent"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema,
            "temperature": 0.0,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                url, json=body, headers={"x-goog-api-key": settings.gemini_api_key}
            )
            resp.raise_for_status()
            data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except Exception as exc:  # noqa: BLE001 - always degrade to heuristic
        log.warning("gemini call failed (%s); falling back to heuristic", exc)
        return None


# ---------------------------------------------------------------------------
# Heuristics — the no-API-key path
# ---------------------------------------------------------------------------

_SEPARATORS = [
    " theke ", " thke ", " hote ", " থেকে ", " from ", " to ", " jabo ", " jete ",
    " -> ", " => ", " > ",
]
_CHEAP_WORDS = ("bachate", "bachai", "sasta", "shasta", "kom", "cheap", "budget", "savings", "সস্তা", "কম")
_FAST_WORDS = ("taratari", "joldi", "fast", "quick", "hurry", "late", "urgent", "তাড়াতাড়ি", "জলদি")

_MODE_WORDS = {
    "cng": ("cng", "সিএনজি", "auto"),
    "rickshaw": ("rickshaw", "riksha", "rikshaw", "রিকশা", "রিক্সা"),
    "bus": ("bus", "বাস"),
    "metro": ("metro", "mrt", "মেট্রো", "metrorail"),
    "bike_hail": ("pathao", "bike", "moto", "বাইক"),
    "car_hail": ("uber", "car", "cab", "গাড়ি"),
    "walk": ("hete", "walk", "হেঁটে"),
}


def _split_od(text: str) -> tuple[str | None, str | None]:
    low = f" {text.lower()} "
    for sep in _SEPARATORS:
        if sep in low:
            left, _, right = low.partition(sep)
            left = re.split(r"[,;]", left)[-1].strip()
            right = re.split(r"[,;]", right)[0].strip()
            right = re.sub(
                r"\b(jabo|jete|jaite|chai|jabo|যাব|যেতে)\b.*$", "", right
            ).strip()
            if left and right:
                return left, right
    return None, None


def heuristic_query(text: str) -> dict:
    low = text.lower()
    origin, dest = _split_od(text)

    if any(w in low for w in _CHEAP_WORDS):
        priority = "cheapest"
    elif any(w in low for w in _FAST_WORDS):
        priority = "fastest"
    else:
        priority = "balanced"

    max_duration = None
    m = re.search(r"(\d{1,3})\s*(min|minute|mins|মিনিট)", low)
    if m:
        max_duration = float(m.group(1))

    max_cost = None
    m = re.search(r"(?:taka|tk|৳|bdt)\s*(\d{2,4})|(\d{2,4})\s*(?:taka|tk|৳|bdt)", low)
    if m:
        max_cost = float(m.group(1) or m.group(2))

    modes = [mid for mid, words in _MODE_WORDS.items() if any(w in low for w in words)]

    return {
        "origin_text": origin,
        "destination_text": dest,
        "priority": priority,
        "max_duration_min": max_duration,
        "max_cost_bdt": max_cost,
        "modes": modes,
        "language": "banglish" if origin and origin != origin.encode("ascii", "ignore").decode() else "auto",
        "confidence": 0.55 if origin and dest else 0.2,
    }


def heuristic_trip(text: str) -> dict:
    low = text.lower()
    origin, dest = _split_od(text)

    mode = None
    for mid, words in _MODE_WORDS.items():
        if any(w in low for w in words):
            mode = mid
            break

    fare = None
    m = re.search(r"(\d{2,4})\s*(?:taka|tk|৳|bdt|nilo|nilo\.|dilam|lagse|laglo)?", low)
    if m:
        fare = float(m.group(1))

    conditions = None
    if any(w in low for w in ("jam", "traffic", "জ্যাম")):
        conditions = "heavy_traffic"
    elif any(w in low for w in ("brishti", "rain", "বৃষ্টি")):
        conditions = "rain"
    elif any(w in low for w in ("rat", "night", "রাত")):
        conditions = "night"

    return {
        "mode": mode,
        "origin_text": origin,
        "dest_text": dest,
        "fare_paid": fare,
        "duration_min": None,
        "conditions": conditions,
        "confidence": 0.45 if mode and fare else 0.15,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

PRIORITY_VOT = {"cheapest": 0.5, "balanced": 2.0, "fastest": 6.0}


async def parse_query(text: str) -> dict:
    result = await _generate(QUERY_PROMPT.format(text=text), QUERY_SCHEMA)
    source = "gemini"
    if result is None:
        result = heuristic_query(text)
        source = "heuristic"

    priority = result.get("priority") or "balanced"
    return {
        "origin_text": result.get("origin_text"),
        "destination_text": result.get("destination_text"),
        "vot_bdt_per_min": PRIORITY_VOT.get(priority, 2.0),
        "max_duration_min": result.get("max_duration_min"),
        "max_cost_bdt": result.get("max_cost_bdt"),
        "modes": result.get("modes") or [],
        "language": result.get("language"),
        "confidence": float(result.get("confidence") or 0.0),
        "source": source,
    }


async def parse_trip(text: str) -> dict:
    result = await _generate(TRIP_PROMPT.format(text=text), TRIP_SCHEMA)
    source = "gemini"
    if result is None:
        result = heuristic_trip(text)
        source = "heuristic"

    return {
        "mode": result.get("mode"),
        "origin_text": result.get("origin_text"),
        "dest_text": result.get("dest_text"),
        "fare_paid": result.get("fare_paid"),
        "duration_min": result.get("duration_min"),
        "conditions": result.get("conditions"),
        "confidence": float(result.get("confidence") or 0.0),
        "source": source,
    }
