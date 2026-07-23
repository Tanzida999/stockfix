import { useCallback, useEffect, useState } from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { Loader2, ShieldCheck, ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CREDENTIAL_LABELS,
  type CredentialType,
} from "@/components/dashboard/credentials-manager";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role !== "admin") {
      throw redirect({ to: "/dashboard/homeowner" });
    }
  },
  component: AdminPage,
});

type PendingCred = {
  id: string;
  trade_user_id: string;
  credential_type: CredentialType;
  register_number: string | null;
  document_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  business_name: string | null;
};

function AdminPage() {
  const [rows, setRows] = useState<PendingCred[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: credErr } = await supabase
      .from("trade_credentials")
      .select(
        "id, trade_user_id, credential_type, register_number, document_url, status, admin_notes, created_at",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (credErr) {
      setError(credErr.message);
      setLoading(false);
      return;
    }
    const creds = (data as Omit<PendingCred, "business_name">[] | null) ?? [];
    let profiles: { user_id: string; business_name: string | null }[] = [];
    if (creds.length > 0) {
      const ids = Array.from(new Set(creds.map((c) => c.trade_user_id)));
      const { data: pData } = await supabase
        .from("trade_profiles")
        .select("user_id, business_name")
        .in("user_id", ids);
      profiles = (pData as typeof profiles | null) ?? [];
    }
    const nameByUser = new Map(profiles.map((p) => [p.user_id, p.business_name]));
    setRows(
      creds.map((c) => ({
        ...c,
        business_name: nameByUser.get(c.trade_user_id) ?? null,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/trade">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-1">Back</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold sm:text-xl">Admin — Verification queue</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 sm:py-10">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Couldn't load queue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing pending. All submitted credentials have been reviewed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <ReviewRow key={r.id} row={r} onDone={load} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ReviewRow({ row, onDone }: { row: PendingCred; onDone: () => void }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!row.document_url) return;
      const { data } = await supabase.storage
        .from("credentials")
        .createSignedUrl(row.document_url, 60 * 10);
      if (data?.signedUrl) setSignedUrl(data.signedUrl);
    })();
  }, [row.document_url]);

  async function decide(status: "approved" | "rejected") {
    setBusy(true);
    setErr(null);
    const { error } = await supabase
      .from("trade_credentials")
      .update({
        status,
        admin_notes: notes.trim() || null,
      })
      .eq("id", row.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onDone();
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">
                {row.business_name || "Unnamed business"}
              </h3>
              <Badge variant="secondary">
                {CREDENTIAL_LABELS[row.credential_type]}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Register #{row.register_number ?? "—"} · Submitted{" "}
              {new Date(row.created_at).toLocaleDateString()}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              user_id: {row.trade_user_id}
            </p>
          </div>
          {signedUrl ? (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View document <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : row.document_url ? (
            <span className="text-xs text-muted-foreground">Loading document…</span>
          ) : (
            <span className="text-xs text-muted-foreground">No document</span>
          )}
        </div>

        {err && (
          <Alert variant="destructive">
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}

        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Reviewer notes (shown to trade if rejected)"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            disabled={busy}
            onClick={() => decide("approved")}
          >
            Approve
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => decide("rejected")}
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
