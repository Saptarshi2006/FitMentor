import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { loadProfile, calcTargets, GOAL_LABEL, clearProfile, type Profile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Crown, LogOut, Sparkles } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "You — FitMentor" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [p, setP] = useState<Profile | null>(null);
  const nav = useNavigate();
  useEffect(() => { setP(loadProfile()); }, []);
  if (!p) {
    return (
      <MobileShell>
        <div className="p-8 text-center">
          <Button onClick={() => nav({ to: "/onboarding" })}>Set up profile</Button>
        </div>
      </MobileShell>
    );
  }
  const t = calcTargets(p);
  return (
    <MobileShell>
      <div className="px-5 pt-12">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-hero text-2xl font-bold text-primary-foreground shadow-glow">
            {p.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{p.name}</h1>
            <p className="text-sm text-muted-foreground">{GOAL_LABEL[p.goal]} • {p.experience}</p>
          </div>
        </div>
      </div>

      <div className="mx-5 mt-6 rounded-2xl border border-accent/40 bg-gradient-card p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-accent" />
          <p className="font-bold">Go Premium</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Unlock unlimited AI coach, advanced meal plans, and form analyzer.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <PlanCard name="Premium" price="₹99" sub="/month" features={["Unlimited Coach", "Custom meals", "Analytics"]} />
          <PlanCard name="Pro" price="₹299" sub="/month" features={["+ Form analyzer", "+ Photo macros", "+ Reports"]} accent />
        </div>
      </div>

      <div className="mx-5 mt-6 rounded-2xl border border-border/60 bg-card p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Your targets</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Stat label="Calories" value={`${t.calories} kcal`} />
          <Stat label="Protein" value={`${t.protein} g`} />
          <Stat label="Carbs" value={`${t.carbs} g`} />
          <Stat label="Fat" value={`${t.fat} g`} />
        </div>
      </div>

      <div className="mx-5 mt-4 rounded-2xl border border-border/60 bg-card p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Stats</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Stat label="Age" value={`${p.age} yrs`} />
          <Stat label="Height" value={`${p.heightCm} cm`} />
          <Stat label="Weight" value={`${p.weightKg} kg`} />
          <Stat label="Train" value={`${p.daysPerWeek}x ${p.place}`} />
          <Stat label="Diet" value={p.diet} />
          <Stat label="Budget" value={`₹${p.budgetPerDay}/day`} />
        </div>
      </div>

      <div className="mx-5 mt-6 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => nav({ to: "/onboarding" })}>
          <Sparkles className="mr-2 h-4 w-4" /> Edit profile
        </Button>
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => { clearProfile(); nav({ to: "/onboarding" }); }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </MobileShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold capitalize">{value}</p>
    </div>
  );
}

function PlanCard({ name, price, sub, features, accent }: { name: string; price: string; sub: string; features: string[]; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "border-accent bg-accent/10" : "border-border/60 bg-card/60"}`}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{name}</p>
      <p className="mt-1"><span className="text-2xl font-bold">{price}</span><span className="text-xs text-muted-foreground">{sub}</span></p>
      <ul className="mt-2 space-y-1">
        {features.map((f) => <li key={f} className="text-[11px] text-muted-foreground">• {f}</li>)}
      </ul>
    </div>
  );
}