const SESSION_TTL = 60 * 60 * 24; // 24 hours
const REMEMBER_TTL = 60 * 60 * 24 * 7; // 7 days

function getCloudflareEnv(): Record<string, unknown> | null {
  try {
    const key = Symbol.for("tanstack-start:event-storage");
    const store = (globalThis as any)[key]?.getStore?.();
    const event: any = store?.h3Event;
    return event?.req?.runtime?.cloudflare?.env ?? null;
  } catch {
    return null;
  }
}

export function getKV(): any | null {
  const env = getCloudflareEnv();
  if (!env) return null;
  return env.fitmentor_sessions ?? null;
}

export async function deriveKey(sid: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return sid;
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
    return sid;
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
    return newSid;
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
