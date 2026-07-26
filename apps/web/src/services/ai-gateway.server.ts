export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function getAI(): any | null {
  try {
    const key = Symbol.for("tanstack-start:event-storage");
    const store = (globalThis as any)[key]?.getStore?.();
    const event: any = store?.h3Event;
    return event?.req?.runtime?.cloudflare?.env?.AI ?? null;
  } catch {
    return null;
  }
}

function getKV(): any | null {
  try {
    const key = Symbol.for("tanstack-start:event-storage");
    const store = (globalThis as any)[key]?.getStore?.();
    const event: any = store?.h3Event;
    return event?.req?.runtime?.cloudflare?.env?.fitmentor_sessions ?? null;
  } catch {
    return null;
  }
}

// Total AI token pool shared across all users
const TOTAL_AI_POOL = 10_000;

// Tier percentages of the total pool
const TIER_PERCENTAGE: Record<string, number> = {
  free: 0.5,    // 5,000 tokens/day
  pro: 0.7,     // 7,000 tokens/day
  premium: 1.0, // 10,000 tokens/day
};

function getTierLimit(tier: string): number {
  return Math.floor(TOTAL_AI_POOL * (TIER_PERCENTAGE[tier] ?? TIER_PERCENTAGE.free));
}

export async function chatCompletion(opts: {
  model?: string;
  messages: ChatMessage[];
  userId?: string;
  tier?: string;
}): Promise<string> {
  const kv = getKV();
  if (kv && opts.userId) {
    const date = new Date().toISOString().slice(0, 10);
    const userLimit = getTierLimit(opts.tier ?? "free");

    // Check global cap
    const globalKey = `quota:ai:global:${date}`;
    const globalCurrent = parseInt((await kv.get(globalKey)) || "0", 10);
    if (globalCurrent >= TOTAL_AI_POOL) {
      throw new Error("AI daily limit reached for all users — try again tomorrow.");
    }

    // Check per-user cap based on tier
    const userKey = `quota:ai:user:${opts.userId}:${date}`;
    const userCurrent = parseInt((await kv.get(userKey)) || "0", 10);
    if (userCurrent >= userLimit) {
      throw new Error(
        `AI daily limit reached for your ${opts.tier ?? "free"} plan — ` +
        `${userCurrent}/${userLimit} tokens used today.`,
      );
    }
  }

  const ai = getAI();
  if (!ai) throw new Error("AI unavailable — deploy to Cloudflare Workers.");

  try {
    const response = await ai.run(
      opts.model ?? "@cf/meta/llama-4-scout-17b-16e-instruct",
      {
        messages: opts.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      },
      {
        gateway: {
          id: "fitmentor-ai-gateway",
          skipCache: false,
        },
      },
    );

    if (kv && opts.userId) {
      const date = new Date().toISOString().slice(0, 10);
      // Increment global counter
      const globalKey = `quota:ai:global:${date}`;
      const globalCurrent = parseInt((await kv.get(globalKey)) || "0", 10);
      await kv.put(globalKey, String(globalCurrent + 1), { expirationTtl: 86400 });
      // Increment per-user counter
      const userKey = `quota:ai:user:${opts.userId}:${date}`;
      const userCurrent = parseInt((await kv.get(userKey)) || "0", 10);
      await kv.put(userKey, String(userCurrent + 1), { expirationTtl: 86400 });
    }

    return response?.choices?.[0]?.message?.content ?? response?.response ?? "";
  } catch (err: any) {
    const msg = err?.message ?? "";
    if (msg.includes("429") || msg.includes("rate")) {
      throw new Error("AI is busy right now — please try again in a moment.");
    }
    throw new Error(`AI request failed: ${msg.slice(0, 200)}`);
  }
}
