import { useEffect, useState, useCallback } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  LayoutDashboard,
  UserCircle,
  Inbox,
  Star,
  AlertCircle,
  TrendingUp,
  Loader2,
  Mail,
  Phone,
  MessageSquare,
  ShieldCheck,
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TradeProfileEditor } from "@/components/dashboard/trade-profile-editor";
import { CredentialsManager } from "@/components/dashboard/credentials-manager";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/dashboard/trade")({
  beforeLoad: ({ context }) => {
    const { role, roles } = context as { role?: string; roles?: string[] };
    const all = roles ?? (role ? [role] : []);
    if (!all.includes("trade") && !all.includes("admin") && all.length > 0) {
      throw redirect({ to: "/dashboard/homeowner" });
    }
  },
  component: TradeDashboard,
});

const navItems: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "profile", label: "My Profile", icon: UserCircle },
  { key: "verification", label: "Verification", icon: ShieldCheck },
  { key: "leads", label: "Leads", icon: Inbox },
  { key: "reviews", label: "Reviews", icon: Star },
];

type LeadStatus = "new" | "contacted" | "closed";
type Lead = {
  id: string;
  homeowner_name: string;
  homeowner_phone: string;
  homeowner_email: string;
  message: string | null;
  status: LeadStatus;
  created_at: string;
};

function TradeDashboard() {
  const { user, roles } = Route.useRouteContext() as {
    user: { id: string; email?: string; user_metadata?: { full_name?: string } };
    roles?: import("@/lib/supabase").AppRole[];
  };
  const name =
    user.user_metadata?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "there";
  const [active, setActive] = useState("overview");
  const [profile, setProfile] = useState<{ published: boolean; is_verified: boolean } | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const { data } = await supabase
      .from("trade_profiles")
      .select("published, is_verified")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile(((data as { published: boolean; is_verified: boolean } | null)) ?? null);
  }, [user.id]);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("id, homeowner_name, homeowner_phone, homeowner_email, message, status, created_at")
      .eq("trade_user_id", user.id)
      .order("created_at", { ascending: false });
    setLeads((data as Lead[] | null) ?? []);
    setLeadsLoading(false);
  }, [user.id]);

  useEffect(() => {
    loadProfile();
    loadLeads();
  }, [loadProfile, loadLeads]);

  async function updateStatus(id: string, status: LeadStatus) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    await supabase.from("leads").update({ status }).eq("id", id);
  }

  const newLeadCount = leads.filter((l) => l.status === "new").length;
  const profilePublished = profile?.published ?? false;
  const profileIncomplete = profilePublished === false;

  return (
    <DashboardLayout
      role="Trade"
      currentRole="trade"
      availableRoles={roles ?? []}
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
                  Homeowners can only find you once your business profile is published.
                </span>
                <Button size="sm" className="shrink-0" onClick={() => setActive("profile")}>
                  Complete profile
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="New leads"
              value={newLeadCount}
              hint={newLeadCount > 0 ? "Awaiting your response" : "None right now"}
              icon={Inbox}
            />
            <StatCard
              title="Profile status"
              value={
                profilePublished === null
                  ? "…"
                  : profilePublished
                    ? "Published"
                    : "Incomplete"
              }
              hint={profilePublished ? "Live on Stockfix" : "Finish setup"}
              icon={UserCircle}
            />
            <StatCard title="Average rating" value="—" hint="No ratings yet" icon={Star} />
            <StatCard title="Total reviews" value={0} hint="From past clients" icon={TrendingUp} />
          </div>
        </>
      )}

      {active === "profile" && (
        <>
          <PageHeader
            title="My Profile"
            description="Your public business profile. Homeowners see this once you publish."
          />
          <TradeProfileEditor userId={user.id} defaultContactEmail={user.email} />
        </>
      )}

      {active === "verification" && (
        <>
          <PageHeader
            title="Verification"
            description="Submit your trade credentials so we can verify your business. Verified trades earn a badge shown to homeowners."
          />
          <CredentialsManager userId={user.id} />
        </>
      )}


      {active === "leads" && (
        <>
          <PageHeader
            title="Leads"
            description="Job requests from homeowners in your area."
          />
          <Section title="Incoming leads">
            {leadsLoading ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading leads…
              </div>
            ) : leads.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No leads yet"
                description={
                  profilePublished
                    ? "Homeowners searching your area will land here when they contact you."
                    : "Publish your profile to start receiving job requests from homeowners."
                }
                actionLabel={!profilePublished ? "Complete profile" : undefined}
                onAction={!profilePublished ? () => setActive("profile") : undefined}
              />
            ) : (
              <div className="grid gap-3">
                {leads.map((l) => (
                  <LeadCard key={l.id} lead={l} onStatusChange={updateStatus} />
                ))}
              </div>
            )}
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

function LeadCard({
  lead,
  onStatusChange,
}: {
  lead: Lead;
  onStatusChange: (id: string, status: LeadStatus) => void;
}) {
  const created = new Date(lead.created_at);
  const statusVariant =
    lead.status === "new"
      ? "default"
      : lead.status === "contacted"
        ? "secondary"
        : "outline";
  return (
    <Card className="transition hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{lead.homeowner_name}</h3>
              <Badge variant={statusVariant} className="capitalize">
                {lead.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {created.toLocaleDateString()} · {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="mt-2 grid gap-1 text-sm">
              <a
                href={`tel:${lead.homeowner_phone}`}
                className="flex items-center gap-2 text-foreground/80 hover:text-foreground"
              >
                <Phone className="h-3.5 w-3.5" /> {lead.homeowner_phone}
              </a>
              <a
                href={`mailto:${lead.homeowner_email}`}
                className="flex items-center gap-2 text-foreground/80 hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5" /> {lead.homeowner_email}
              </a>
            </div>
            {lead.message && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="whitespace-pre-wrap">{lead.message}</p>
              </div>
            )}
          </div>
          <div className="shrink-0">
            <Select
              value={lead.status}
              onValueChange={(v) => onStatusChange(lead.id, v as LeadStatus)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
