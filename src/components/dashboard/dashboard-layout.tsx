import { type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Wrench, ShieldCheck } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import type { AppRole } from "@/lib/supabase";
import { dashboardPathFor } from "@/lib/auth";

export type NavItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type DashboardRoleLabel = "Homeowner" | "Trade" | "Admin";

const ROLE_TO_LABEL: Record<AppRole, DashboardRoleLabel> = {
  homeowner: "Homeowner",
  trade: "Trade",
  admin: "Admin",
};

type Props = {
  role: DashboardRoleLabel;
  currentRole?: AppRole;
  availableRoles?: AppRole[];
  userName: string;
  navItems: NavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  children: ReactNode;
};

export function DashboardLayout({
  role,
  currentRole,
  availableRoles = [],
  userName,
  navItems,
  activeKey,
  onNavigate,
  children,
}: Props) {
  const navigate = useNavigate();
  const isAdmin = availableRoles.includes("admin");
  const hasMultipleRoles = availableRoles.length > 1;
  const activeRoleValue: AppRole =
    currentRole ??
    (role === "Admin" ? "admin" : role === "Trade" ? "trade" : "homeowner");

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const showAdminNav = isAdmin && activeRoleValue !== "admin";
  const mergedNav: NavItem[] = showAdminNav
    ? [
        ...navItems,
        { key: "__admin__", label: "Admin", icon: ShieldCheck },
      ]
    : navItems;

  function handleNav(key: string) {
    if (key === "__admin__") {
      navigate({ to: "/dashboard/admin" });
      return;
    }
    onNavigate(key);
  }

  function handleRoleSwitch(next: string) {
    const target = next as AppRole;
    if (target === activeRoleValue) return;
    navigate({ to: dashboardPathFor(target) });
  }

  const initials =
    userName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const roleSwitcher = hasMultipleRoles ? (
    <Select value={activeRoleValue} onValueChange={handleRoleSwitch}>
      <SelectTrigger
        className="h-7 w-auto min-w-0 gap-1.5 rounded-full border-transparent bg-secondary px-3 py-0 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 focus:ring-0 focus:ring-offset-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-70"
        aria-label="Switch dashboard view"
      >
        <SelectValue placeholder={`${role} view`} />
      </SelectTrigger>
      <SelectContent align="start">
        {availableRoles.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_TO_LABEL[r]} dashboard
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                <Wrench className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">Stockfix</div>
                {hasMultipleRoles ? (
                  <div className="mt-1">{roleSwitcher}</div>
                ) : (
                  <div className="truncate text-xs text-muted-foreground">{role} view</div>
                )}
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mergedNav.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={activeKey === item.key}
                        onClick={() => handleNav(item.key)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur sm:px-6">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <div className="hidden h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground sm:grid">
                <Wrench className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold sm:text-base">Stockfix</span>
            </div>
            {hasMultipleRoles ? (
              <div className="ml-2">{roleSwitcher}</div>
            ) : (
              <Badge variant="secondary" className="ml-2 hidden sm:inline-flex">
                {role} view
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium leading-tight">{userName}</div>
                <div className="text-xs text-muted-foreground leading-tight">
                  Viewing: {role}
                </div>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
