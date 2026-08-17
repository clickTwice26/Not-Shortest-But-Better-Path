from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class Point(BaseModel):
    lat: float
    lng: float


class PlanRequestBody(BaseModel):
    origin: Point | None = None
    destination: Point | None = None
    origin_text: str | None = None
    destination_text: str | None = None

    departure_time: datetime | None = None
    vot_bdt_per_min: float = Field(default=2.0, ge=0.0, le=20.0)
    modes: list[str] = Field(default_factory=list)
    owns: list[str] = Field(default_factory=list)
    surge: float = Field(default=1.0, ge=1.0, le=3.0)
    max_duration_min: float | None = None
    max_cost_bdt: float | None = None


class PlaceOut(BaseModel):
    id: int
    name: str
    lat: float
    lng: float


class StationOut(BaseModel):
    id: int
    code: str
    name: str
    name_bn: str
    lat: float
    lng: float
    chainage_km: float
    sequence: int
    parkable_modes: list[str]
    has_car_parking: bool


class TripLogBody(BaseModel):
    """Structured submission. Prefer /v1/trips/parse for free text."""

    mode: str
    fare_paid: float
    origin_text: str | None = None
    dest_text: str | None = None
    origin: Point | None = None
    destination: Point | None = None
    duration_min: int | None = None
    occurred_at: datetime | None = None
    raw_text: str | None = None
    notes: str | None = None


class ParseTextBody(BaseModel):
    text: str


class ParsedQuery(BaseModel):
    origin_text: str | None = None
    destination_text: str | None = None
    vot_bdt_per_min: float | None = None
    max_duration_min: float | None = None
    max_cost_bdt: float | None = None
    modes: list[str] = Field(default_factory=list)
    language: str | None = None
    confidence: float = 0.0
    source: str = "heuristic"


class ParsedTrip(BaseModel):
    mode: str | None = None
    origin_text: str | None = None
    dest_text: str | None = None
    fare_paid: float | None = None
    duration_min: int | None = None
    conditions: str | None = None
    confidence: float = 0.0
    source: str = "heuristic"
