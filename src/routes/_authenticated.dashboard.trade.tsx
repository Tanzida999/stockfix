import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  LayoutDashboard,
  UserCircle,
  Inbox,
  Star,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/dashboard/dashboard-layout";
import {
  EmptyState,
  PageHeader,
  Section,
  StatCard,
} from "@/components/dashboard/dashboard-primitives";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TradeProfileEditor } from "@/components/dashboard/trade-profile-editor";

export const Route = createFileRoute("/_authenticated/dashboard/trade")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role !== "trade" && role !== "admin") {
      throw redirect({ to: "/dashboard/homeowner" });
    }
  },
  component: TradeDashboard,
});

const navItems: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "profile", label: "My Profile", icon: UserCircle },
  { key: "leads", label: "Leads", icon: Inbox },
  { key: "reviews", label: "Reviews", icon: Star },
];

function TradeDashboard() {
  const { user } = Route.useRouteContext() as {
    user: { email?: string; user_metadata?: { full_name?: string } };
  };
  const name =
    user.user_metadata?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "there";
  const [active, setActive] = useState("overview");
  const profileIncomplete = true;

  return (
    <DashboardLayout
      role="Trade"
      userName={name}
      navItems={navItems}
      activeKey={active}
      onNavigate={setActive}
    >
      {active === "overview" && (
        <>
          <PageHeader
            title={`Welcome back, ${name}`}
            description="Here's your business at a glance."
          />

          {profileIncomplete && (
            <Alert className="mb-6 border-primary/30 bg-primary/5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Complete your profile to start receiving leads</AlertTitle>
              <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-muted-foreground">
                  Homeowners can only find you once your business profile is set up.
                </span>
                <Button size="sm" className="shrink-0">
                  Complete profile
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="New leads" value={0} hint="Awaiting your response" icon={Inbox} />
            <StatCard title="Profile status" value="Incomplete" hint="Finish setup" icon={UserCircle} />
            <StatCard title="Average rating" value="—" hint="No ratings yet" icon={Star} />
            <StatCard title="Total reviews" value={0} hint="From past clients" icon={TrendingUp} />
          </div>
        </>
      )}

      {active === "profile" && (
        <>
          <PageHeader title="My Profile" description="Your public business profile." />
          <Section title="Business profile">
            <EmptyState
              icon={UserCircle}
              title="Set up your business profile"
              description="Add your business details, services, and coverage area so homeowners can find you. We'll build this out in a later step."
              actionLabel="Set up profile"
            />
          </Section>
        </>
      )}

      {active === "leads" && (
        <>
          <PageHeader title="Leads" description="Job requests from homeowners in your area." />
          <Section title="Incoming leads">
            <EmptyState
              icon={Inbox}
              title="No leads yet"
              description="Complete your profile to start receiving job requests from homeowners."
              actionLabel="Complete profile"
            />
          </Section>
        </>
      )}

      {active === "reviews" && (
        <>
          <PageHeader title="Reviews" description="What homeowners are saying about your work." />
          <Section title="Your reviews">
            <EmptyState
              icon={Star}
              title="No reviews yet"
              description="Reviews will appear here once homeowners rate your completed jobs."
            />
          </Section>
        </>
      )}
    </DashboardLayout>
  );
}
