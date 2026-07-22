import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { exchangeDiscordCode } from "@/utils/oauth";

export const Route = createFileRoute("/auth/discord/callback")({
  head: () => ({ meta: [{ title: "Signing in — FitMentor" }] }),
  component: DiscordCallback,
});

function DiscordCallback() {
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      setError("No authorization code received from Discord");
      return;
    }
    const state = params.get("state") || "";
    exchangeDiscordCode({ data: { code, state } }).then((result) => {
      if (result.ok) {
        window.location.href = "/dashboard";
      } else if (result.error === "user_exists") {
        setError("An account already exists with this Discord account");
      } else {
        setError(result.error || "Authentication failed");
      }
    });
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-foreground">Sign in failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Please{" "}
            <a href="/signin" className="underline font-medium hover:text-foreground">
              sign in
            </a>{" "}
            instead.
          </p>
          <a
            href="/signin"
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        Signing you in…
      </div>
    </div>
  );
}
