import { type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Wrench } from "lucide-react";
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
import { supabase } from "@/lib/supabase";

export type NavItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type Props = {
  role: "Homeowner" | "Trade";
  userName: string;
  navItems: NavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  children: ReactNode;
};

export function DashboardLayout({
  role,
  userName,
  navItems,
  activeKey,
  onNavigate,
  children,
}: Props) {
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const initials =
    userName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

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
                <div className="truncate text-xs text-muted-foreground">{role}</div>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={activeKey === item.key}
                        onClick={() => onNavigate(item.key)}
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
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium leading-tight">{userName}</div>
                <div className="text-xs text-muted-foreground leading-tight">{role}</div>
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
