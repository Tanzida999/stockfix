import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({
  beforeLoad: ({ context }) => {
    const { role, roles } = context as { role?: string; roles?: string[] };
    const all = roles ?? (role ? [role] : []);
    if (!all.includes("admin")) {
      throw redirect({ to: "/dashboard/homeowner" });
    }
  },
  component: () => <Outlet />,
});
