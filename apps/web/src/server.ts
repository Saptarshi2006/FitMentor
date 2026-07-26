import "./utils/error-capture";

import { consumeLastCapturedError } from "./utils/error-capture";
import { renderErrorPage } from "./utils/error-page";
import { deriveKey, extractSessionId, getKV } from "./utils/session";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function parseCookie(cookie: string | null, name: string): string | null {
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=") || null;
  }
  return null;
}

const API_URL = process.env.API_URL || "https://16-112-132-239.sslip.io";

// Cache the KV binding per-request using a WeakMap
const kvCache = new WeakMap<Request, any>();

function getKvForRequest(request: Request): any {
  if (kvCache.has(request)) return kvCache.get(request);
  // Try request.runtime.cloudflare.env (set by Nitro augmentReq)
  const fromReq = (request as any).runtime?.cloudflare?.env?.fitmentor_sessions;
  if (fromReq) { kvCache.set(request, fromReq); return fromReq; }
  // Try __cf_env
  const fromGlobal = (globalThis as any).__cf_env?.fitmentor_sessions;
  if (fromGlobal) { kvCache.set(request, fromGlobal); return fromGlobal; }
  // Try getKV() (ALS-based, works in server functions)
  const fromAls = getKV();
  if (fromAls) { kvCache.set(request, fromAls); return fromAls; }
  return null;
}

async function getUserSub(request: Request): Promise<string | null> {
  const raw = parseCookie(request.headers.get("cookie"), "fitmentor_session");
  if (!raw) return null;
  try {
    const kv = getKvForRequest(request);
    if (!kv) return null;
    const sid = await extractSessionId(raw);
    if (!sid) return null;
    const key = await deriveKey(sid);
    const data = await kv.get(key);
    if (!data) return null;
    return JSON.parse(data).sub ?? null;
  } catch {
    return null;
  }
}

async function getUserSession(request: Request): Promise<{ sub: string; email: string } | null> {
  const raw = parseCookie(request.headers.get("cookie"), "fitmentor_session");
  if (!raw) return null;
  try {
    const kv = getKvForRequest(request);
    if (!kv) return null;
    const sid = await extractSessionId(raw);
    if (!sid) return null;
    const key = await deriveKey(sid);
    const data = await kv.get(key);
    if (!data) {
      const rawFallback = await kv.get(sid);
      if (rawFallback) {
        const parsed = JSON.parse(rawFallback);
        await kv.put(key, rawFallback, { expirationTtl: 86400 });
        await kv.delete(sid);
        return { sub: parsed.sub ?? null, email: parsed.email ?? "" };
      }
      return null;
    }
    const session = JSON.parse(data);
    return { sub: session.sub ?? null, email: session.email ?? "" };
  } catch {
    return null;
  }
}

async function handleMealPlan(request: Request): Promise<Response> {
  try {
    const sub = await getUserSub(request);
    if (!sub) return new Response(JSON.stringify({ error: "not authenticated" }), { status: 401, headers: { "content-type": "application/json" } });
    const apiKey = process.env.API_SHARED_SECRET;
    const headers: Record<string, string> = { "X-Api-Key": apiKey ?? "", "X-User-Id": sub, "Content-Type": "application/json" };
    const res = await fetch(`${API_URL}/v1/meal/today`, { method: "GET", headers });
    if (!res.ok) return new Response(JSON.stringify({ error: "meal plan not found" }), { status: 404, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify(await res.json()), { headers: { "content-type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

async function handleWorkoutPlan(request: Request): Promise<Response> {
  try {
    const sub = await getUserSub(request);
    if (!sub) return new Response(JSON.stringify({ error: "not authenticated" }), { status: 401, headers: { "content-type": "application/json" } });
    const apiKey = process.env.API_SHARED_SECRET;
    const headers: Record<string, string> = { "X-Api-Key": apiKey ?? "", "X-User-Id": sub, "Content-Type": "application/json" };
    const res = await fetch(`${API_URL}/v1/workout/today`, { method: "GET", headers });
    if (!res.ok) return new Response(JSON.stringify({ error: "workout plan not found" }), { status: 404, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify(await res.json()), { headers: { "content-type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

async function proxyGetAdvice(request: Request, apiPath: string): Promise<Response> {
  try {
    const sub = await getUserSub(request);
    if (!sub) return new Response(JSON.stringify({ error: "not authenticated" }), { status: 401, headers: { "content-type": "application/json" } });
    const apiKey = process.env.API_SHARED_SECRET;
    const headers: Record<string, string> = { "X-Api-Key": apiKey ?? "", "X-User-Id": sub, "Content-Type": "application/json" };
    const res = await fetch(`${API_URL}${apiPath}`, { method: "GET", headers });
    if (!res.ok) return new Response(JSON.stringify({ tips: [] }), { headers: { "content-type": "application/json" } });
    const json = await res.json();
    const plan = json?.data?.plan ?? [];
    return new Response(JSON.stringify({ tips: Array.isArray(plan) ? plan : [] }), { headers: { "content-type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ tips: [] }), { headers: { "content-type": "application/json" } });
  }
}

async function handleGraphQL(request: Request): Promise<Response> {
  try {
    const session = await getUserSession(request);
    if (!session || !session.sub) {
      return new Response(JSON.stringify({ errors: [{ message: "Unauthorized" }] }), { status: 401, headers: { "content-type": "application/json" } });
    }
    const apiKey = process.env.API_SHARED_SECRET;
    if (!apiKey) return new Response(JSON.stringify({ errors: [{ message: "Unauthorized" }] }), { status: 401, headers: { "content-type": "application/json" } });
    const body = await request.text();
    const res = await fetch(`${API_URL}/graphql`, {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "X-User-Id": session.sub, "X-User-Email": session.email, "Content-Type": "application/json" },
      body,
    });
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { "content-type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ errors: [{ message: e?.message ?? "Internal error" }] }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

async function handleValidateSession(request: Request): Promise<Response> {
  try {
    const kv = getKvForRequest(request);
    if (!kv) return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
    const raw = parseCookie(request.headers.get("cookie"), "fitmentor_session");
    if (!raw) return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
    const sid = await extractSessionId(raw);
    if (!sid) return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
    const key = await deriveKey(sid);
    const data = await kv.get(key);
    if (!data) return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
    const session = JSON.parse(data);
    return new Response(JSON.stringify({ sub: session.sub, email: session.email, name: session.name }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response("{}", { status: 500, headers: { "content-type": "application/json" } });
  }
}

async function handleCheckout(request: Request): Promise<Response> {
  try {
    const sub = await getUserSub(request);
    if (!sub) return new Response(JSON.stringify({ error: "not authenticated" }), { status: 401, headers: { "content-type": "application/json" } });
    const body = await request.json().catch(() => ({}));
    const tier = body.tier;
    if (tier !== "premium" && tier !== "pro") return new Response(JSON.stringify({ error: "Invalid tier" }), { status: 400, headers: { "content-type": "application/json" } });
    const apiKey = process.env.API_SHARED_SECRET;
    const headers: Record<string, string> = { "X-Api-Key": apiKey ?? "", "X-User-Id": sub, "Content-Type": "application/json" };
    const res = await fetch(`${API_URL}/v1/subscriptions/checkout`, { method: "POST", headers, body: JSON.stringify({ tier }) });
    return new Response(JSON.stringify(await res.json()), { headers: { "content-type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/graphql" && request.method === "POST") return await handleGraphQL(request);
      if (url.pathname === "/api/validate-session" && request.method === "GET") return await handleValidateSession(request);
      if (url.pathname === "/api/meal-plan" && request.method === "POST") return await handleMealPlan(request);
      if (url.pathname === "/api/workout-plan" && request.method === "POST") return await handleWorkoutPlan(request);
      if (url.pathname === "/api/tools/injury" && request.method === "GET") return await proxyGetAdvice(request, "/v1/tools/injury-advice");
      if (url.pathname === "/api/tools/bmi-advice" && request.method === "GET") return await proxyGetAdvice(request, "/v1/tools/bmi-advice");
      if (url.pathname === "/api/tools/sleep-advice" && request.method === "GET") return await proxyGetAdvice(request, "/v1/tools/sleep-advice");
      if (url.pathname === "/api/tools/form-analyze" && request.method === "GET") return await proxyGetAdvice(request, "/v1/tools/form-advice");
      if (url.pathname === "/api/checkout" && request.method === "POST") return await handleCheckout(request);

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
