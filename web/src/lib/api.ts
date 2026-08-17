import type { ParsedTrip, Place, PlanRequestBody, PlanResult } from './types';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(`Cannot reach the planner at ${API_BASE}. Is the backend running?`, 0);
  }

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = (await res.json())?.detail;
    } catch {
      detail = res.statusText;
    }
    const message =
      typeof detail === 'string'
        ? detail
        : (detail as { message?: string } | undefined)?.message ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  plan: (body: PlanRequestBody) =>
    request<PlanResult>('/v1/plan', { method: 'POST', body: JSON.stringify(body) }),

  planNatural: (text: string) =>
    request<PlanResult>('/v1/plan/natural', { method: 'POST', body: JSON.stringify({ text }) }),

  places: (q?: string) => request<Place[]>(`/v1/places${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  parseTrip: (text: string) =>
    request<ParsedTrip>('/v1/trips/parse', { method: 'POST', body: JSON.stringify({ text }) }),

  logTrip: (text: string) =>
    request<{ stored: boolean; reason?: string; parsed: ParsedTrip }>('/v1/trips/log-text', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  health: () =>
    request<{ status: string; postgres: boolean; redis: boolean; gemini: boolean }>('/health'),
};

export const taka = (n: number) => `৳${Math.round(n).toLocaleString('en-US')}`;

export const minutes = (n: number) => {
  const m = Math.round(n);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};
