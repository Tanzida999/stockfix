import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/dashboard/homeowner")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role === "trade") throw redirect({ to: "/dashboard/trade" });
  },
  component: HomeownerDashboard,
});

function HomeownerDashboard() {
  const navigate = useNavigate();
  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center space-y-4">
        <h1 className="text-3xl font-semibold">Homeowner dashboard</h1>
        <p className="text-sm text-muted-foreground">Placeholder — Increment 1.</p>
        <button
          onClick={logout}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
