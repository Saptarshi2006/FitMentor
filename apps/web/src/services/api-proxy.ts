import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { resolveSessionFromToken } from "@/utils/session";

const SESSION_COOKIE = "fitmentor_session";
const API_URL = process.env.API_URL || "https://16-112-132-239.sslip.io";

function authHeaders(sub: string, email?: string): Record<string, string> {
  const apiKey = process.env.API_SHARED_SECRET;
  const h: Record<string, string> = {
    "X-Api-Key": apiKey ?? "",
    "X-User-Id": sub,
    "Content-Type": "application/json",
  };
  if (email) h["X-User-Email"] = email;
  return h;
}

async function resolveSession(): Promise<{ sub: string; email: string } | null> {
  const raw = getCookie(SESSION_COOKIE);
  if (!raw) return null;
  return resolveSessionFromToken(raw);
}

export const proxyGraphQL = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { query: string; variables?: Record<string, unknown> })
  .handler(async ({ data }) => {
    const session = await resolveSession();
    if (!session) return { errors: [{ message: "Unauthorized" }] };

    const res = await fetch(`${API_URL}/graphql`, {
      method: "POST",
      headers: authHeaders(session.sub, session.email),
      body: JSON.stringify(data),
    });
    return await res.json();
  });

export const proxyCheckout = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { tier: string })
  .handler(async ({ data }) => {
    const session = await resolveSession();
    if (!session) return { error: "not authenticated" };

    const tier = data.tier;
    if (tier !== "premium" && tier !== "pro") return { error: "Invalid tier" };

    const res = await fetch(`${API_URL}/v1/subscriptions/checkout`, {
      method: "POST",
      headers: authHeaders(session.sub),
      body: JSON.stringify({ tier }),
    });
    return await res.json();
  });

export const proxyMealPlan = createServerFn({ method: "GET" }).handler(async () => {
  const session = await resolveSession();
  if (!session) return { error: "not authenticated" };
  const res = await fetch(`${API_URL}/v1/meal/today`, { method: "GET", headers: authHeaders(session.sub) });
  if (!res.ok) return { error: "meal plan not found" };
  return await res.json();
});

export const proxyWorkoutPlan = createServerFn({ method: "GET" }).handler(async () => {
  const session = await resolveSession();
  if (!session) return { error: "not authenticated" };
  const res = await fetch(`${API_URL}/v1/workout/today`, { method: "GET", headers: authHeaders(session.sub) });
  if (!res.ok) return { error: "workout plan not found" };
  return await res.json();
});

export const proxyToolAdvice = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { path: string })
  .handler(async ({ data }) => {
    const session = await resolveSession();
    if (!session) return { tips: [] };
    const res = await fetch(`${API_URL}${data.path}`, { method: "GET", headers: authHeaders(session.sub) });
    if (!res.ok) return { tips: [] };
    const json = await res.json();
    const plan = json?.data?.plan ?? [];
    return { tips: Array.isArray(plan) ? plan : [] };
  });
