const SESSION_TTL = 60 * 60 * 24; // 24 hours
const REMEMBER_TTL = 60 * 60 * 24 * 7; // 7 days
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days — signed token lifetime

function getCloudflareEnv(): Record<string, unknown> | null {
  try {
    const key = Symbol.for("tanstack-start:event-storage");
    const store = (globalThis as any)[key]?.getStore?.();
    const event: any = store?.h3Event;
    const fromAls = event?.req?.runtime?.cloudflare?.env;
    if (fromAls) return fromAls;
  } catch {}
  return (globalThis as any).__cf_env ?? null;
}

export function getKV(): any | null {
  const env = getCloudflareEnv();
  if (!env) return null;
  return env.fitmentor_sessions ?? null;
}

function getSecret(): string {
  // Try process.env first (works in local dev / Node)
  const fromProcess = process.env.SESSION_SECRET;
  if (fromProcess) return fromProcess;
  // Fall back to Cloudflare env binding (works in Workers runtime)
  const cfEnv = getCloudflareEnv() as Record<string, string> | null;
  const fromCf = cfEnv?.SESSION_SECRET;
  if (fromCf) return fromCf;
  throw new Error("SESSION_SECRET not set");
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(data, secret);
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export async function deriveKey(sid: string): Promise<string> {
  let secret: string | undefined;
  try {
    secret = getSecret();
  } catch {
    return sid;
  }
  const data = new TextEncoder().encode(sid + secret);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface SessionData {
  sub: string;
  email: string;
  name: string;
  provider: string;
}

// --- Signed token helpers ---
// Cookie format: base64url(payload).hex(hmac)
// Payload: { sid, exp }

function base64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): ArrayBuffer {
  const pad = str.replace(/-/g, "+").replace(/_/g, "=");
  const bin = atob(pad);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function createSignedToken(sid: string): Promise<string> {
  try {
    const secret = getSecret();
    const payload = JSON.stringify({ sid, exp: Math.floor(Date.now() / 1000) + TOKEN_MAX_AGE });
    const payloadB64 = base64urlEncode(new TextEncoder().encode(payload).buffer);
    const sig = await hmacSign(payloadB64, secret);
    return `${payloadB64}.${sig}`;
  } catch {
    // SESSION_SECRET not set — return raw sid (insecure, but backward compatible)
    return sid;
  }
}

async function verifySignedToken(token: string): Promise<string | null> {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return token; // legacy raw sid
    const payloadB64 = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const secret = getSecret();
    if (!(await hmacVerify(payloadB64, sig, secret))) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)));
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.sid !== "string") return null;
    return payload.sid;
  } catch {
    return null;
  }
}

/**
 * Extract the raw session ID from any cookie value.
 * Accepts both signed tokens (new format) and raw session IDs (legacy).
 */
export async function extractSessionId(cookieValue: string): Promise<string | null> {
  if (!cookieValue) return null;
  // New format: base64.hmac
  if (cookieValue.includes(".")) {
    return verifySignedToken(cookieValue);
  }
  // Legacy raw sid
  return cookieValue;
}

export async function createSession(data: SessionData): Promise<string | null> {
  const kv = getKV();
  if (!kv) return null;
  const sid = `sess_${crypto.randomUUID()}`;
  const rememberToken = `rem_${crypto.randomUUID()}`;
  try {
    const key = await deriveKey(sid);
    await kv.put(key, JSON.stringify({ ...data, rememberToken, createdAt: Date.now() }), {
      expirationTtl: SESSION_TTL,
    });
    await kv.put(`remember:${rememberToken}`, JSON.stringify({ sub: data.sub, email: data.email, name: data.name, provider: data.provider }), {
      expirationTtl: REMEMBER_TTL,
    });
    // Return a signed token instead of raw sid
    return createSignedToken(sid);
  } catch {
    return null;
  }
}

export async function getSession(sid: string): Promise<(SessionData & { rememberToken: string }) | null> {
  const kv = getKV();
  if (!kv) return null;
  try {
    const key = await deriveKey(sid);
    const raw = await kv.get(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { sub: data.sub, email: data.email, name: data.name, provider: data.provider, rememberToken: data.rememberToken };
  } catch {
    return null;
  }
}

export async function renewSession(sid: string): Promise<string | null> {
  const kv = getKV();
  if (!kv) return null;
  try {
    const key = await deriveKey(sid);
    const raw = await kv.get(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const rememberToken = data.rememberToken;
    if (!rememberToken) return null;
    const remRaw = await kv.get(`remember:${rememberToken}`);
    if (!remRaw) return null;
    const remData = JSON.parse(remRaw);
    const newSid = `sess_${crypto.randomUUID()}`;
    const newKey = await deriveKey(newSid);
    await kv.put(newKey, JSON.stringify({ ...remData, rememberToken, createdAt: Date.now() }), {
      expirationTtl: SESSION_TTL,
    });
    return createSignedToken(newSid);
  } catch {
    return null;
  }
}

export async function deleteSession(sid: string): Promise<void> {
  const kv = getKV();
  if (!kv) return;
  try {
    const key = await deriveKey(sid);
    await kv.delete(key);
  } catch {
  }
}

export async function deleteRememberToken(rememberToken: string): Promise<void> {
  const kv = getKV();
  if (!kv) return;
  try {
    await kv.delete(`remember:${rememberToken}`);
  } catch {
  }
}
