export type ModeId =
  | 'walk'
  | 'bicycle'
  | 'bike_own'
  | 'bike_hail'
  | 'rickshaw'
  | 'cng'
  | 'car_own'
  | 'car_hail'
  | 'bus'
  | 'metro';

export type CostConfidence = 'official' | 'estimated' | 'crowdsourced';

export interface Point {
  lat: number;
  lng: number;
}

export interface Leg {
  mode: ModeId;
  mode_label: string;
  mode_label_bn: string;
  icon: string;
  from_name: string;
  to_name: string;
  from_point: Point;
  to_point: Point;
  distance_km: number;
  duration_min: number;
  wait_min: number;
  cost_bdt: number;
  cost_source: string;
  geometry: number[][];
}

export interface Itinerary {
  id: string;
  label: 'fastest' | 'best_value' | 'cheapest' | 'most_comfortable' | null;
  kind: 'direct' | 'multimodal';
  cost_bdt: number;
  duration_min: number;
  transfers: number;
  generalized_cost: number;
  savings_vs_fastest: number;
  minutes_vs_fastest: number;
  comfort: number;
  comfort_label: 'Comfortable' | 'Decent' | 'Rough' | 'Punishing';
  worst_leg: string | null;
  cost_confidence: CostConfidence;
  summary: string;
  legs: Leg[];
}

export interface PlanResult {
  origin: { name: string; lat: number; lng: number };
  destination: { name: string; lat: number; lng: number };
  vot_bdt_per_min: number;
  itineraries: Itinerary[];
  pareto_front: Itinerary[];
  considered: number;
  cost_confidence: CostConfidence;
  geometry_source: 'osrm' | 'estimate';
  disclaimer: string;
  cached?: boolean;
  parsed_query?: ParsedQuery;
}

export interface ParsedQuery {
  origin_text: string | null;
  destination_text: string | null;
  vot_bdt_per_min: number | null;
  comfort_bdt_per_min: number | null;
  max_duration_min: number | null;
  max_cost_bdt: number | null;
  modes: string[];
  avoid: string[];
  language: string | null;
  confidence: number;
  source: 'gemini' | 'heuristic';
}

export interface ParsedTrip {
  mode: ModeId | null;
  origin_text: string | null;
  dest_text: string | null;
  fare_paid: number | null;
  duration_min: number | null;
  conditions: string | null;
  confidence: number;
  source: 'gemini' | 'heuristic';
}

export interface Place {
  id: number;
  name: string;
  lat: number;
  lng: number;
  source: 'landmark' | 'photon' | 'nominatim' | string;
}

export interface PlanRequestBody {
  origin_text?: string;
  destination_text?: string;
  origin?: Point;
  destination?: Point;
  vot_bdt_per_min?: number;
  comfort_bdt_per_min?: number;
  modes?: string[];
  owns?: string[];
  avoid?: string[];
  surge?: number;
  max_duration_min?: number | null;
  max_cost_bdt?: number | null;
}
