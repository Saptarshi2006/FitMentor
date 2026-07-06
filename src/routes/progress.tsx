import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { last7, ensureToday, saveLog, computeStreak, type DailyLog } from "@/lib/habits";
import { loadProfile, calcTargets } from "@/lib/profile";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Flame, TrendingUp, Weight, Crosshair } from "lucide-react";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress — FitMentor" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [streak, setStreak] = useState(0);
  const [weight, setWeight] = useState("");
  const profile = loadProfile();

  useEffect(() => {
    setLogs(last7());
    setStreak(computeStreak());
  }, []);

  const targets = profile ? calcTargets(profile) : null;
  const weightSeries = logs.map((l) => ({ d: l.date.slice(5), w: l.weightKg ?? null }));
  const proteinSeries = logs.map((l) => ({ d: l.date.slice(5), p: l.proteinG }));

  const logToday = () => {
    const log = ensureToday();
    saveLog({ ...log, weightKg: Number(weight) });
    setLogs(last7());
    setWeight("");
  };

  return (
    <MobileShell>
      <div className="px-5 pt-14">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Tracking</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Progress</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Last 7 days at a glance.</p>
      </div>

      <div className="mx-5 mt-5 grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-card/70 p-4 backdrop-blur-xl">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent/10 blur-2xl" />
          <Flame className="relative h-5 w-5 text-accent" />
          <p className="relative mt-2 text-2xl font-bold leading-none">{streak}</p>
          <p className="relative mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Day streak</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/70 p-4 backdrop-blur-xl">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
          <TrendingUp className="relative h-5 w-5 text-primary" />
          <p className="relative mt-2 text-2xl font-bold leading-none">{logs.filter((l) => l.workoutDone).length}</p>
          <p className="relative mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Workouts this week</p>
        </div>
      </div>

      <div className="relative mx-5 mt-5 overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur-xl">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-2">
          <Weight className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Weight</p>
        </div>
        <p className="relative mt-0.5 text-xs text-muted-foreground">Log it daily, same time.</p>
        <div className="relative mt-3 flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            placeholder={profile ? `${profile.weightKg} kg` : "kg"}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="bg-secondary/40 border-white/10"
          />
          <Button onClick={logToday} disabled={!weight} className="bg-gradient-hero text-primary-foreground shadow-glow px-6">Log</Button>
        </div>
        <div className="relative mt-3 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightSeries}>
              <XAxis dataKey="d" fontSize={10} stroke="oklch(0.7 0.02 250)" />
              <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="w" stroke="oklch(0.86 0.22 135)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="relative mx-5 mt-4 overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur-xl">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold">Protein intake</p>
        </div>
        {targets && <p className="relative mt-0.5 text-xs text-muted-foreground">Target: {targets.protein}g/day</p>}
        <div className="relative mt-3 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={proteinSeries}>
              <XAxis dataKey="d" fontSize={10} stroke="oklch(0.7 0.02 250)" />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Bar dataKey="p" fill="oklch(0.62 0.22 275)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </MobileShell>
  );
}
