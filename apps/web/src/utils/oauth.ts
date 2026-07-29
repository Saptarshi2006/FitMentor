import { createServerFn } from "@tanstack/react-start";
import { getCookie, setResponseHeader } from "@tanstack/react-start/server";
import { getSession, createSession, deleteSession, renewSession, deleteRememberToken, extractSessionId, resolveSessionFromToken, getCloudflareEnv } from "@/utils/session";
import { useState, useEffect } from "react";

interface DiscordUser {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
}

const SESSION_COOKIE = "fitmentor_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const COOKIE_FLAGS = `Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`;

function setSessionCookie(sid: string) {
  setResponseHeader("Set-Cookie", `${SESSION_COOKIE}=${sid}; ${COOKIE_FLAGS}`);
}

function clearSessionCookie() {
  setResponseHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

export const checkSession = createServerFn({ method: "GET" }).handler(async () => {
  const raw = getCookie(SESSION_COOKIE);
  if (raw) {
    // Try signed token first (no KV needed)
    const ip = getClientIp();
    const session = await resolveSessionFromToken(raw, ip);
    if (session) return { ok: true } as const;
    // Legacy: try raw sid with KV
    const sid = await extractSessionId(raw);
    if (sid) {
      const kvSession = await getSession(sid);
      if (kvSession) return { ok: true } as const;
      const newSid = await renewSession(sid);
      if (newSid) {
        setSessionCookie(newSid);
        return { ok: true } as const;
      }
    }
  }

  return { ok: false } as const;
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const raw = getCookie(SESSION_COOKIE);
  if (!raw) return null;
  const ip = getClientIp();
  const session = await resolveSessionFromToken(raw, ip);
  if (session) return session;
  // Legacy: try raw sid with KV
  const sid = await extractSessionId(raw);
  if (!sid) return null;
  const kvSession = await getSession(sid);
  if (!kvSession) return null;
  return { sub: kvSession.sub, email: kvSession.email };
});

export function useAuth() {
  const [user, setUser] = useState<{ sub: string; email: string } | null>(null);
  useEffect(() => {
    getCurrentUser().then((u) => setUser(u));
  }, []);
  return user;
}

export const getDiscordAuthUrl = createServerFn({ method: "GET" })
  .validator((d?: { mode?: string }) => d ?? {})
  .handler(async (ctx) => {
    const clientId = process.env.DISCORD_CLIENT_ID || (getCloudflareEnv() as any)?.DISCORD_CLIENT_ID || "";
    const appUrl = process.env.APP_URL || "https://fitmentor-7lx.pages.dev";
    const redirectUri = `${appUrl}/auth/discord/callback`;
    const url = new URL("https://discord.com/api/oauth2/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify email");
    if (ctx.data.mode) {
      url.searchParams.set("state", ctx.data.mode);
    }
    return url.toString();
  });

const discordCodec = (d: { code: string; state?: string }) => d;

function getClientIp(): string {
  try {
    const key = Symbol.for("tanstack-start:event-storage");
    const store = (globalThis as any)[key]?.getStore?.();
    const event: any = store?.h3Event;
    const headers = event?.req?.headers;
    if (!headers) return "";
    return headers["cf-connecting-ip"]
      || (headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || headers["x-real-ip"]
      || "";
  } catch {
    return "";
  }
}

function getApiKey(): string {
  // Try process.env first (works in local dev / Node)
  const fromProcess = process.env.API_SHARED_SECRET;
  if (fromProcess) return fromProcess;
  // Fall back to Cloudflare env binding
  try {
    const key = Symbol.for("tanstack-start:event-storage");
    const store = (globalThis as any)[key]?.getStore?.();
    const event: any = store?.h3Event;
    const cfEnv = event?.context?.cloudflare?.env ?? event?.context?.env ?? event?.req?.runtime?.cloudflare?.env;
    if (cfEnv?.API_SHARED_SECRET) return cfEnv.API_SHARED_SECRET as string;
  } catch {}
  const fromGlobal = (globalThis as any).__cf_env?.API_SHARED_SECRET;
  if (fromGlobal) return fromGlobal as string;
  return "";
}

async function checkUserExists(sub: string): Promise<boolean> {
  const cfEnv = getCloudflareEnv() as Record<string, string> | null;
  const apiUrl = process.env.API_URL || cfEnv?.API_URL || "";
  const apiKey = getApiKey();
  if (!apiKey) return false;
  try {
    const res = await fetch(`${apiUrl}/v1/user/exists`, {
      headers: {
        "X-Api-Key": apiKey,
        "X-User-Id": sub,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.exists === true;
  } catch {
    return false;
  }
}

async function syncUser(sub: string, email: string, name: string): Promise<boolean> {
  const cfEnv = getCloudflareEnv() as Record<string, string> | null;
  const apiUrl = process.env.API_URL || cfEnv?.API_URL || "";
  const apiKey = getApiKey();
  if (!apiKey) return false;
  try {
    const res = await fetch(`${apiUrl}/v1/user/sync`, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cf_sub: sub, email, name }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const exchangeDiscordCode = createServerFn({ method: "POST" })
  .validator(discordCodec)
  .handler(async (ctx) => {
    const { code, state } = ctx.data;

    const cfEnv = getCloudflareEnv() as Record<string, string> | null;
    const clientId = process.env.DISCORD_CLIENT_ID || cfEnv?.DISCORD_CLIENT_ID || "";
    const clientSecret = process.env.DISCORD_CLIENT_SECRET || cfEnv?.DISCORD_CLIENT_SECRET || "";
    const appUrl = process.env.APP_URL || cfEnv?.APP_URL || "https://fitmentor-7lx.pages.dev";
    const redirectUri = `${appUrl}/auth/discord/callback`;

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) return { ok: false, error: "token_exchange_failed" } as const;
    const tokenData = await tokenRes.json();

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) return { ok: false, error: "userinfo_failed" } as const;
    const discordUser: DiscordUser = await userRes.json();

    const sub = `discord:${discordUser.id}`;
    const email = discordUser.email || `${discordUser.username}@discord`;

    // Check if user already exists in the database
    const userExists = await checkUserExists(sub);
    const mode = state || "signin"; // "signup" or "signin"

    if (userExists && mode === "signup") {
      return { ok: false, error: "user_exists" } as const;
    }
    if (!userExists && mode === "signin") {
      return { ok: false, error: "user_not_found" } as const;
    }

    // On signup, sync user to the database first
    if (mode === "signup" && !userExists) {
      await syncUser(sub, email, discordUser.username);
    }

    const ip = getClientIp();
    const sid = await createSession({
      sub,
      email,
      name: discordUser.username,
      provider: "discord",
      ip,
    });
    if (!sid) return { ok: false, error: "session_create_failed" } as const;

    setSessionCookie(sid);

    return {
      ok: true,
      user: { sub, email, name: discordUser.username, provider: "discord" },
      userExists,
    } as const;
  });

export function logout() {
  window.location.href = "/";
}

export const clearSession = createServerFn({ method: "POST" }).handler(async () => {
  const raw = getCookie(SESSION_COOKIE);
  if (raw) {
    const sid = await extractSessionId(raw);
    if (sid) {
      const session = await getSession(sid);
      if (session?.rememberToken) await deleteRememberToken(session.rememberToken);
      await deleteSession(sid);
    }
  }
  clearSessionCookie();
  return { ok: true } as const;
});

export const forgetDevice = createServerFn({ method: "POST" }).handler(async () => {
  const raw = getCookie(SESSION_COOKIE);
  if (raw) {
    const sid = await extractSessionId(raw);
    if (sid) {
      const session = await getSession(sid);
      if (session?.rememberToken) await deleteRememberToken(session.rememberToken);
      await deleteSession(sid);
    }
  }
  clearSessionCookie();
  return { ok: true } as const;
});
