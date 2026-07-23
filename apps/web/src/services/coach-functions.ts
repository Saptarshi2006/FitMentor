import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { chatCompletion, type ChatMessage } from "./ai-gateway.server";
import { getSession } from "@/utils/session";

const SESSION_COOKIE = "fitmentor_session";

const Input = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(40),
  profile: z
    .object({
      name: z.string().optional(),
      age: z.number().optional(),
      gender: z.string().optional(),
      heightCm: z.number().optional(),
      weightKg: z.number().optional(),
      goal: z.string().optional(),
      place: z.string().optional(),
      experience: z.string().optional(),
      diet: z.string().optional(),
      daysPerWeek: z.number().optional(),
      budgetPerDay: z.number().optional(),
      healthConditions: z.array(z.string()).optional(),
      calories: z.number().optional(),
      protein: z.number().optional(),
    })
    .optional(),
});

function cfEnv(): Record<string, unknown> | null {
  try {
    const key = Symbol.for("tanstack-start:event-storage");
    const store = (globalThis as any)[key]?.getStore?.();
    const event: any = store?.h3Event;
    return event?.req?.runtime?.cloudflare?.env ?? null;
  } catch {
    return null;
  }
}

function env(key: string): string | undefined {
  const cf = cfEnv();
  return (cf?.[key] as string | undefined) ?? process.env[key] ?? undefined;
}

export const askCoach = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const p = data.profile;
    const healthStr = p?.healthConditions?.length
      ? `- Health conditions: ${p.healthConditions.join(", ")}`
      : "";
    const profileBlock = p
      ? `User profile:
- Name: ${p.name ?? "Friend"}
- Age: ${p.age}, Gender: ${p.gender}
- Height: ${p.heightCm} cm, Weight: ${p.weightKg} kg
- Goal: ${p.goal}, Experience: ${p.experience}
- Trains: ${p.place} (${p.daysPerWeek} days/week)
- Diet: ${p.diet}, Food budget: ₹${p.budgetPerDay}/day
${healthStr}
- Daily targets: ${p.calories} kcal, ${p.protein} g protein`
      : "User has not completed onboarding yet.";

    const system = `You are FitMentor, a warm, no-nonsense AI fitness coach for Indian gym beginners and students.
Rules:
- Be concise. Use short paragraphs and bullet points. Never write essays.
- Use simple words. No fitness jargon unless you explain it.
- Suggest affordable Indian foods (dal, eggs, paneer, soya, milk, chicken, rice, roti).
- Default currency: INR. Default units: kg, cm, ml.
- Never recommend extreme diets or unsafe lifts. Suggest seeing a doctor for medical issues.
- Don't push supplements. Whey is optional, not required.
- Always end with one clear next step the user can do today.

${profileBlock}`;

    const messages: ChatMessage[] = [{ role: "system", content: system }, ...data.messages];
    const reply = await chatCompletion({ messages });

    const sid = getCookie(SESSION_COOKIE);
    const session = sid ? await getSession(sid) : null;
    if (session?.sub) {
      const apiUrl = env("API_URL") || "https://16-112-225-113.sslip.io";
      const apiKey = env("API_SHARED_SECRET");
      const lastUserMsg = [...data.messages].reverse().find((m) => m.role === "user");
      fetch(`${apiUrl}/v1/coach/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey ?? "",
          "X-User-Id": session.sub,
          "X-User-Email": session.email,
        },
        body: JSON.stringify({
          user_message: lastUserMsg?.content ?? "",
          reply,
          container_tag: session.sub,
        }),
      }).catch(() => {});
    }

    return { reply };
  });
