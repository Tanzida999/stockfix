import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  Heart,
  Star,
  Search,
} from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/dashboard/dashboard-layout";
import {
  EmptyState,
  PageHeader,
  Section,
  StatCard,
} from "@/components/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard/homeowner")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role === "trade") throw redirect({ to: "/dashboard/trade" });
  },
  component: HomeownerDashboard,
});

const navItems: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "jobs", label: "My Jobs", icon: Briefcase },
  { key: "saved", label: "Saved Trades", icon: Heart },
  { key: "reviews", label: "My Reviews", icon: Star },
];

function HomeownerDashboard() {
  const { user } = Route.useRouteContext() as {
    user: { email?: string; user_metadata?: { full_name?: string } };
  };
  const name =
    user.user_metadata?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "there";
  const [active, setActive] = useState("overview");

  return (
    <DashboardLayout
      role="Homeowner"
      userName={name}
      navItems={navItems}
      activeKey={active}
      onNavigate={setActive}
    >
      {active === "overview" && (
        <>
          <PageHeader
            title={`Welcome back, ${name}`}
            description="Here's what's happening with your projects."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Active job requests" value={0} hint="No open jobs" icon={Briefcase} />
            <StatCard title="Saved trades" value={0} hint="Nothing saved yet" icon={Heart} />
            <StatCard title="Reviews written" value={0} hint="Share your experience" icon={Star} />
          </div>
          <Card className="mt-6 border-primary/20 bg-primary/5 transition hover:shadow-md">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold">Find a verified trade near you</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search by category and postcode — every trade is properly checked before it's listed.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link to="/">
                  <Search className="mr-2 h-4 w-4" /> Search trades
                </Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {active === "jobs" && (
        <>
          <PageHeader title="My Jobs" description="Jobs you've posted and their status." />
          <Section title="Your job requests">
            <EmptyState
              icon={Briefcase}
              title="You haven't posted any jobs yet"
              description="Job posting is coming soon. In the meantime, search for trades and request a callback directly."
            />
          </Section>
        </>
      )}

      {active === "saved" && (
        <>
          <PageHeader title="Saved Trades" description="Trades you've bookmarked for later." />
          <Section title="Your saved list">
            <EmptyState
              icon={Heart}
              title="You haven't saved any trades yet"
              description="Save trades you like so you can quickly reach out when the time comes."
            />
          </Section>
        </>
      )}

      {active === "reviews" && (
        <>
          <PageHeader title="My Reviews" description="Reviews you've written for trades." />
          <Section title="Your reviews">
            <EmptyState
              icon={Star}
              title="You haven't written any reviews yet"
              description="After a completed job, share your experience to help other homeowners."
            />
          </Section>
        </>
      )}
    </DashboardLayout>
  );
}
