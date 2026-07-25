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

const DAILY_AI_LIMIT = 8000;

export async function chatCompletion(opts: {
  model?: string;
  messages: ChatMessage[];
  userId?: string;
}): Promise<string> {
  const kv = getKV();
  if (kv && opts.userId) {
    const date = new Date().toISOString().slice(0, 10);
    const key = `quota:ai:global:${date}`;
    const current = parseInt((await kv.get(key)) || "0", 10);
    if (current >= DAILY_AI_LIMIT) {
      throw new Error("AI daily limit reached — try again tomorrow.");
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
      const key = `quota:ai:global:${new Date().toISOString().slice(0, 10)}`;
      const current = parseInt((await kv.get(key)) || "0", 10);
      await kv.put(key, String(current + 1));
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
