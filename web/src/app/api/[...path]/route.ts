import { NextRequest } from 'next/server';

/**
 * Runtime proxy to FastAPI, so the whole app lives on one origin: one domain,
 * one certificate, no CORS.
 *
 * This is a route handler rather than a next.config rewrite because rewrite
 * destinations are resolved at BUILD time — the built image would hardcode
 * whatever API_ORIGIN was set during `next build`. Read here, it stays a
 * genuine runtime setting, so the same image runs in compose and in prod.
 */

const API_ORIGIN = () => process.env.API_ORIGIN ?? 'http://localhost:8000';

export const dynamic = 'force-dynamic';

async function proxy(req: NextRequest, path: string[]) {
  const url = new URL(`${API_ORIGIN()}/${path.join('/')}`);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('accept', req.headers.get('accept') ?? 'application/json');

  const method = req.method;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.text();

  try {
    const res = await fetch(url, { method, headers, body, cache: 'no-store' });
    return new Response(res.body, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return Response.json(
      { detail: `Planner unreachable at ${API_ORIGIN()}. Is the API running?` },
      { status: 502 },
    );
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
