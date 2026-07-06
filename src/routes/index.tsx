import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Droplet, Dumbbell, Sparkles, TrendingUp, Apple, ChevronRight, Plus } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { loadProfile, calcTargets, GOAL_LABEL, type Profile } from "@/lib/profile";
import { ensureToday, computeStreak, saveLog, type DailyLog } from "@/lib/habits";
import { generateWorkoutPlan } from "@/lib/workouts";
import { Progress } from "@/components/ui/progress";
import logoImg from "@/assets/logo-v2.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitMentor AI — Home" },
      { name: "description", content: "Your personalized fitness dashboard." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const p = loadProfile();
    if (!p) {
      navigate({ to: "/onboarding" });
      return;
    }
    setProfile(p);
    setLog(ensureToday());
    setStreak(computeStreak());
    const onChange = () => {
      setProfile(loadProfile());
      setLog(ensureToday());
      setStreak(computeStreak());
    };
    window.addEventListener("fitmentor:logs", onChange);
    window.addEventListener("fitmentor:profile", onChange);
    return () => {
      window.removeEventListener("fitmentor:logs", onChange);
      window.removeEventListener("fitmentor:profile", onChange);
    };
  }, [navigate]);

  if (!profile || !log) {
    return (
      <MobileShell>
        <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Loading…</div>
      </MobileShell>
    );
  }

  const t = calcTargets(profile);
  const plan = generateWorkoutPlan(profile);
  const todayIdx = new Date().getDay() % plan.length;
  const todays = plan[todayIdx];

  return (
    <MobileShell>
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-14 pb-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span suppressHydrationWarning>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
            </span>
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Hey, <span className="text-gradient">{profile.name.split(" ")[0]}</span>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {GOAL_LABEL[profile.goal]} • {profile.daysPerWeek}x/week
          </p>
        </div>
        <Link
          to="/profile"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-card/70 backdrop-blur-xl overflow-hidden"
        >
          <img src={logoImg} alt="FitMentor AI" className="h-9 w-9 object-contain" />
        </Link>
      </div>

      {/* HERO — Today's session */}
      <Link to="/workouts" className="mx-5 mt-4 block">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 p-6 shadow-card">
          <div className="absolute inset-0 bg-gradient-hero opacity-95" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-accent/30 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
                Today's Session
              </p>
            </div>
            <h3 className="mt-2 text-2xl font-bold leading-tight text-primary-foreground">
              {todays.title}
            </h3>
            <p className="mt-1 text-sm text-primary-foreground/80">{todays.focus}</p>
            <div className="mt-5 flex items-center gap-4 text-xs text-primary-foreground/90">
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                <Dumbbell className="h-3.5 w-3.5" /> {todays.exercises.length} moves
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                ⏱ ~45 min
              </span>
              <span className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                <ChevronRight className="h-4 w-4 text-primary-foreground" />
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Streak + stats row */}
      <div className="mx-5 mt-4 grid grid-cols-3 gap-2.5">
        <div className="col-span-1 flex flex-col justify-between rounded-2xl border border-accent/30 bg-card/70 p-3 backdrop-blur-xl">
          <Flame className="h-5 w-5 text-accent" />
          <div>
            <p className="text-2xl font-bold leading-none">{streak}</p>
            <p className="text-[10px] text-muted-foreground">day streak</p>
          </div>
        </div>
        <StatCard label="kcal" value={t.calories} />
        <StatCard label="protein g" value={t.protein} highlight />
      </div>

      {/* Daily habits */}
      <div className="mx-5 mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Today's habits</h2>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">tap +</span>
        </div>
        <div className="space-y-2.5">
          <HabitRow
            icon={<Droplet className="h-4 w-4" />}
            label="Water"
            value={`${log.water} / 10 glasses`}
            pct={Math.min(100, (log.water / 10) * 100)}
            onAdd={() => saveLog({ ...log, water: log.water + 1 })}
          />
          <HabitRow
            icon={<Apple className="h-4 w-4" />}
            label="Protein"
            value={`${log.proteinG} / ${t.protein} g`}
            pct={Math.min(100, (log.proteinG / t.protein) * 100)}
            onAdd={() => saveLog({ ...log, proteinG: log.proteinG + 20 })}
          />
          <HabitRow
            icon={<Dumbbell className="h-4 w-4" />}
            label="Workout"
            value={log.workoutDone ? "Done ✓" : "Not yet"}
            pct={log.workoutDone ? 100 : 0}
            onAdd={() => saveLog({ ...log, workoutDone: !log.workoutDone })}
            done={log.workoutDone}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="mx-5 mt-6 grid grid-cols-2 gap-3">
        <QuickAction to="/coach" icon={<Sparkles className="h-5 w-5" />} label="Ask Coach" sub="AI trainer" />
        <QuickAction to="/progress" icon={<TrendingUp className="h-5 w-5" />} label="Progress" sub="Your stats" />
      </div>
    </MobileShell>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border p-3 backdrop-blur-xl ${
        highlight
          ? "border-primary/40 bg-primary/15"
          : "border-white/10 bg-card/70"
      }`}
    >
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold leading-none ${highlight ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function HabitRow({ icon, label, value, pct, onAdd, done }: { icon: React.ReactNode; label: string; value: string; pct: number; onAdd: () => void; done?: boolean }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-3.5 backdrop-blur-xl transition hover:border-primary/30">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            done ? "bg-gradient-hero text-primary-foreground shadow-glow" : "bg-secondary text-primary"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">{value}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition active:scale-90"
          aria-label={`Add ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <Progress value={pct} className="mt-3 h-1.5" />
    </div>
  );
}

function QuickAction({ to, icon, label, sub }: { to: string; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur-xl transition hover:border-primary/40"
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/15 blur-2xl transition group-hover:bg-primary/30" />
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
        {icon}
      </div>
      <p className="relative mt-3 text-sm font-semibold">{label}</p>
      <p className="relative text-xs text-muted-foreground">{sub}</p>
    </Link>
  );
}
