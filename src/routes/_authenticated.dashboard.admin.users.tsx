import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Loader2, LayoutDashboard, Users, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AppRole } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DashboardLayout,
  type NavItem,
} from "@/components/dashboard/dashboard-layout";
import { PageHeader } from "@/components/dashboard/dashboard-primitives";

export const Route = createFileRoute("/_authenticated/dashboard/admin/users")({
  beforeLoad: ({ context }) => {
    const { role, roles } = context as { role?: string; roles?: string[] };
    const all = roles ?? (role ? [role] : []);
    if (!all.includes("admin")) {
      throw redirect({ to: "/dashboard/homeowner" });
    }
  },
  component: AdminUsersPage,
});

const navItems: NavItem[] = [
  { key: "queue", label: "Verification queue", icon: LayoutDashboard },
  { key: "users", label: "Manage users", icon: Users },
];

const ALL_ROLES: AppRole[] = ["homeowner", "trade", "admin"];

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: AppRole[];
  created_at: string;
};

function AdminUsersPage() {
  const navigate = useNavigate();
  const { user, roles } = Route.useRouteContext() as {
    user: { id: string; email?: string; user_metadata?: { full_name?: string } };
    roles?: AppRole[];
  };
  const name =
    user.user_metadata?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Admin";

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingRevoke, setPendingRevoke] = useState<{
    userId: string;
    role: AppRole;
    label: string;
  } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc("admin_list_users");
    if (rpcErr) {
      setError(rpcErr.message);
      setLoading(false);
      return;
    }
    setRows((data as UserRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.full_name ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  async function logAudit(
    targetUserId: string,
    action: "grant_role" | "revoke_role",
    role: AppRole,
  ) {
    await supabase.from("admin_audit_log").insert({
      actor_user_id: user.id,
      target_user_id: targetUserId,
      action,
      role,
    });
  }

  async function grantRole(targetUserId: string, role: AppRole) {
    const key = `${targetUserId}:${role}:grant`;
    setBusyKey(key);
    setError(null);
    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: targetUserId, role });
    if (insErr) {
      setError(insErr.message);
      setBusyKey(null);
      return;
    }
    await logAudit(targetUserId, "grant_role", role);
    setBusyKey(null);
    load();
  }

  async function revokeRole(targetUserId: string, role: AppRole) {
    const key = `${targetUserId}:${role}:revoke`;
    setBusyKey(key);
    setError(null);
    const { error: delErr } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId)
      .eq("role", role);
    if (delErr) {
      setError(delErr.message);
      setBusyKey(null);
      return;
    }
    await logAudit(targetUserId, "revoke_role", role);
    setBusyKey(null);
    load();
  }

  function requestRevoke(row: UserRow, role: AppRole) {
    if (role === "admin" && row.id === user.id) return;
    if (role === "admin") {
      setPendingRevoke({
        userId: row.id,
        role,
        label: row.email ?? row.full_name ?? row.id,
      });
      return;
    }
    revokeRole(row.id, role);
  }

  return (
    <DashboardLayout
      role="Admin"
      currentRole="admin"
      availableRoles={roles ?? []}
      userName={name}
      navItems={navItems}
      activeKey="users"
      onNavigate={(key) => {
        if (key === "queue") navigate({ to: "/dashboard/admin" });
      }}
    >
      <PageHeader
        title="Manage users"
        description="Grant or revoke roles. Every change is recorded in the audit log."
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or name"
            className="pl-8"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No users match your search.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const isSelf = r.id === user.id;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.email ?? "—"}
                          {isSelf && (
                            <Badge variant="outline" className="ml-2">
                              You
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{r.full_name ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {r.roles.length === 0 ? (
                              <span className="text-xs text-muted-foreground">
                                None
                              </span>
                            ) : (
                              r.roles.map((role) => (
                                <Badge key={role} variant="secondary">
                                  {role}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {ALL_ROLES.map((role) => {
                              const has = r.roles.includes(role);
                              const disableSelfAdminRevoke =
                                has && role === "admin" && isSelf;
                              const key = `${r.id}:${role}:${
                                has ? "revoke" : "grant"
                              }`;
                              const busy = busyKey === key;
                              return (
                                <Button
                                  key={role}
                                  size="sm"
                                  variant={has ? "outline" : "secondary"}
                                  disabled={busy || disableSelfAdminRevoke}
                                  onClick={() =>
                                    has
                                      ? requestRevoke(r, role)
                                      : grantRole(r.id, role)
                                  }
                                  title={
                                    disableSelfAdminRevoke
                                      ? "You can't remove your own admin role here"
                                      : undefined
                                  }
                                >
                                  {busy && (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  )}
                                  {has ? `Remove ${role}` : `+ ${role}`}
                                </Button>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove admin role?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to remove the <strong>admin</strong> role from{" "}
              <strong>{pendingRevoke?.label}</strong>. They will immediately lose
              access to admin tools. This action is recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRevoke) {
                  revokeRole(pendingRevoke.userId, pendingRevoke.role);
                  setPendingRevoke(null);
                }
              }}
            >
              Remove admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
