import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery")) {
      setMode("update");
    }
  }, []);

  async function requestReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) setError(err.message);
    else setMsg("Check your email for the reset link.");
  }

  async function updatePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) setError(err.message);
    else setMsg("Password updated. You can now log in.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <form
        onSubmit={mode === "request" ? requestReset : updatePassword}
        className="w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-semibold">
          {mode === "request" ? "Reset password" : "Set new password"}
        </h1>

        {mode === "request" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">New password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Working..." : mode === "request" ? "Send reset link" : "Update password"}
        </button>

        <p className="text-sm text-muted-foreground text-center">
          <Link to="/login" className="hover:underline">
            Back to log in
          </Link>
        </p>
      </form>
    </div>
  );
}
