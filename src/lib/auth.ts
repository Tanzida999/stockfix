import { supabase, type AppRole } from "./supabase";

export async function fetchPrimaryRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error || !data || data.length === 0) return null;
  const roles = data.map((r) => r.role as AppRole);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("trade")) return "trade";
  return "homeowner";
}

export function dashboardPathFor(role: AppRole | null): string {
  if (role === "trade") return "/dashboard/trade";
  return "/dashboard/homeowner";
}
