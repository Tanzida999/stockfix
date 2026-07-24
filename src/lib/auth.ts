import { supabase, type AppRole } from "./supabase";

const PRIORITY: AppRole[] = ["admin", "trade", "homeowner"];

export async function fetchAllRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error || !data) return [];
  const roles = data.map((r) => r.role as AppRole);
  return PRIORITY.filter((r) => roles.includes(r));
}

export async function fetchPrimaryRole(userId: string): Promise<AppRole | null> {
  const roles = await fetchAllRoles(userId);
  return roles[0] ?? null;
}

export function dashboardPathFor(role: AppRole | null): string {
  if (role === "admin") return "/dashboard/admin";
  if (role === "trade") return "/dashboard/trade";
  return "/dashboard/homeowner";
}
