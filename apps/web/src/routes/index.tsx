import { createFileRoute, Link } from "@tanstack/react-router";
import { Dumbbell, Brain, Apple, TrendingUp, ChevronRight, ArrowRight } from "lucide-react";
import logoImg from "@/assets/logo-v2.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitMentor AI — Your Pocket Fitness Coach" },
      {
        name: "description",
        content:
          "AI-powered fitness coach for Indian beginners. Personalized workouts, affordable meal plans, and progress tracking.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-mesh" />

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <img src={logoImg} alt="FitMentor AI" className="h-9 w-9 object-contain" />
          <span className="text-lg font-bold tracking-tight">FitMentor AI</span>
        </div>
        <Link
          to="/signin"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-95"
        >
          Get Started
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative px-5 pt-16 pb-20 text-center">
        <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -left-20 top-20 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative mx-auto max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            🇮🇳 Built for Indian beginners
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Your Pocket{" "}
            <span className="text-gradient">Fitness Coach</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            AI-powered workouts, affordable Indian meal plans, and a coach that
            knows your name — all in your pocket.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to="/signin"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 active:scale-95"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-muted-foreground">
              Sign in with Discord • Free to start
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative px-5 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight">
          Everything you need
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm text-muted-foreground">
          Built for students and gym newbies who want results without the confusion.
        </p>
        <div className="mx-auto mt-10 grid max-w-md grid-cols-2 gap-4">
          <FeatureCard
            icon={<Brain className="h-5 w-5" />}
            title="AI Coach"
            desc="Chat with a trainer that learns your limits."
          />
          <FeatureCard
            icon={<Dumbbell className="h-5 w-5" />}
            title="Workout Plans"
            desc="Personalized routines for your schedule."
          />
          <FeatureCard
            icon={<Apple className="h-5 w-5" />}
            title="Indian Meals"
            desc="Affordable dal, rice, and egg-based plans."
          />
          <FeatureCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Progress"
            desc="Track streaks, weight, and habits daily."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="relative px-5 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight">
          How it works
        </h2>
        <div className="mx-auto mt-10 max-w-md space-y-6">
          <Step n={1} title="Set up your profile" desc="Age, weight, goal, diet — takes 30 seconds." />
          <Step n={2} title="Get your plan" desc="AI builds workouts and meals around you." />
          <Step n={3} title="Track & improve" desc="Log habits, watch your streak grow." />
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-5 py-16 text-center">
        <div className="mx-auto max-w-sm overflow-hidden rounded-3xl border border-white/10 p-8 shadow-card">
          <div className="absolute inset-0 bg-gradient-hero opacity-10" />
          <div className="relative">
            <h2 className="text-2xl font-bold">Ready to start?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with Discord and get your custom plan in 30 seconds.
            </p>
            <Link
              to="/signin"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 active:scale-95"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-5 py-8 text-center text-xs text-muted-foreground">
        <p>FitMentor AI — Built in India 🇮🇳</p>
        <div className="mt-3 flex justify-center gap-4">
          <Link to="/signup" className="hover:text-foreground transition">
            Get Started
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-5 backdrop-blur-xl transition hover:border-primary/30">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
        {icon}
      </div>
      <h3 className="relative mt-3 text-sm font-bold">{title}</h3>
      <p className="relative mt-1 text-xs text-muted-foreground leading-relaxed">
        {desc}
      </p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-hero text-sm font-bold text-primary-foreground shadow-glow">
        {n}
      </div>
      <div className="pt-1.5">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
