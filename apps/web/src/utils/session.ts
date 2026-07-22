// ponytail: only access KV where available, no-op gracefully in dev/SSR

export interface SessionData {
  sub: string;
  email: string;
  name: string;
  provider: string;
}

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
const REMEMBER_TTL = 60 * 60 * 24 * 30; // 30 days

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

function getKV(): any | null {
  const env = getCloudflareEnv();
  if (!env) return null;
  return env.fitmentor_sessions ?? null;
}

export async function createSession(data: SessionData): Promise<string | null> {
  const kv = getKV();
  if (!kv) return null;
  const sid = `sess_${crypto.randomUUID()}`;
  const rememberToken = `rem_${crypto.randomUUID()}`;
  try {
    await kv.put(sid, JSON.stringify({ ...data, rememberToken, createdAt: Date.now() }), {
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
    const raw = await kv.get(sid);
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
    const raw = await kv.get(sid);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const rememberToken = data.rememberToken;
    if (!rememberToken) return null;
    const remRaw = await kv.get(`remember:${rememberToken}`);
    if (!remRaw) return null;
    const remData = JSON.parse(remRaw);
    const newSid = `sess_${crypto.randomUUID()}`;
    await kv.put(newSid, JSON.stringify({ ...remData, rememberToken, createdAt: Date.now() }), {
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
    await kv.delete(sid);
  } catch {
    // ignore
  }
}

export async function deleteRememberToken(rememberToken: string): Promise<void> {
  const kv = getKV();
  if (!kv) return;
  try {
    await kv.delete(`remember:${rememberToken}`);
  } catch {
    // ignore
  }
}
