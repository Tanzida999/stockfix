import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { fetchAllRoles } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    const roles = await fetchAllRoles(data.user.id);
    const role = roles[0] ?? null;
    return { user: data.user, role, roles };
  },
  component: () => <Outlet />,
});
