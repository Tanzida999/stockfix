import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Loader2, SearchX, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LeadContactModal } from "@/components/lead-contact-modal";

type SearchParams = { category: string; postcode: string };

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    category: typeof search.category === "string" ? search.category : "",
    postcode: typeof search.postcode === "string" ? search.postcode : "",
  }),
  head: () => ({
    meta: [
      { title: "Search verified trades — Stockfix" },
      {
        name: "description",
        content: "Find verified local tradespeople by category and postcode.",
      },
    ],
  }),
  component: SearchPage,
});

type Result = {
  user_id: string;
  business_name: string | null;
  bio: string | null;
  phone: string | null;
  portfolio_image_urls: string[];
  is_verified: boolean;
  categories: { name: string; slug: string }[];
  areas: string[];
};

function SearchPage() {
  const { category, postcode } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [contactTarget, setContactTarget] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const catRes = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("slug", category)
        .maybeSingle();
      if (cancelled) return;
      const cat = catRes.data as { id: string; name: string; slug: string } | null;
      setCategoryName(cat?.name ?? null);
      setCategoryId(cat?.id ?? null);

      if (!cat || !postcode) {
        setResults([]);
        setLoading(false);
        return;
      }

      const tpcRes = await supabase
        .from("trade_profile_categories")
        .select("trade_user_id")
        .eq("category_id", cat.id);
      if (cancelled) return;
      const catIds = new Set(
        ((tpcRes.data as { trade_user_id: string }[] | null) ?? []).map(
          (r) => r.trade_user_id,
        ),
      );

      const tpaRes = await supabase
        .from("trade_profile_areas")
        .select("trade_user_id")
        .eq("outward_code", postcode);
      if (cancelled) return;
      const areaIds = new Set(
        ((tpaRes.data as { trade_user_id: string }[] | null) ?? []).map(
          (r) => r.trade_user_id,
        ),
      );

      const ids = Array.from(catIds).filter((id) => areaIds.has(id));
      if (ids.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      const profilesRes = await supabase
        .from("trade_profiles")
        .select(
          "user_id, business_name, bio, phone, portfolio_image_urls, published",
        )
        .in("user_id", ids)
        .eq("published", true);
      if (cancelled) return;
      const profiles =
        (profilesRes.data as Omit<Result, "categories" | "areas">[] | null) ?? [];

      if (profiles.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      const profileIds = profiles.map((p) => p.user_id);
      const [catsRes, areasRes] = await Promise.all([
        supabase
          .from("trade_profile_categories")
          .select("trade_user_id, categories(name, slug)")
          .in("trade_user_id", profileIds),
        supabase
          .from("trade_profile_areas")
          .select("trade_user_id, outward_code")
          .in("trade_user_id", profileIds),
      ]);
      if (cancelled) return;

      const catsByUser = new Map<string, { name: string; slug: string }[]>();
      for (const row of (catsRes.data as
        | {
            trade_user_id: string;
            categories: { name: string; slug: string } | null;
          }[]
        | null) ?? []) {
        if (!row.categories) continue;
        const arr = catsByUser.get(row.trade_user_id) ?? [];
        arr.push(row.categories);
        catsByUser.set(row.trade_user_id, arr);
      }
      const areasByUser = new Map<string, string[]>();
      for (const row of (areasRes.data as
        | { trade_user_id: string; outward_code: string }[]
        | null) ?? []) {
        const arr = areasByUser.get(row.trade_user_id) ?? [];
        arr.push(row.outward_code);
        areasByUser.set(row.trade_user_id, arr);
      }

      setResults(
        profiles.map((p) => ({
          ...p,
          categories: catsByUser.get(p.user_id) ?? [],
          areas: areasByUser.get(p.user_id) ?? [],
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [category, postcode]);

  const label = categoryName ?? category;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-1">Back</span>
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold sm:text-xl">
              {label ? `${label} in ${postcode || "your area"}` : "Search"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Showing verified trades who cover this postcode district.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {loading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </div>
        ) : !category || !postcode ? (
          <EmptyMessage
            title="Add a category and postcode"
            description="Head back to the homepage and pick a trade plus your postcode to search."
          />
        ) : results.length === 0 ? (
          <EmptyMessage
            title={`No trades found in ${postcode}${
              categoryName ? ` for ${categoryName}s` : ""
            } yet`}
            description="We're still onboarding trades in your area. Check back soon — every listing is verified before it appears."
          />
        ) : (
          <div className="grid gap-4">
            {results.map((r) => (
              <Card
                key={r.user_id}
                className="transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold">
                        {r.business_name || "Unnamed business"}
                      </h2>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {r.categories.map((c) => (
                          <Badge key={c.slug} variant="secondary">
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                      {r.bio && (
                        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                          {r.bio}
                        </p>
                      )}
                      <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>Covers: {r.areas.join(", ") || "—"}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Button
                        onClick={() => setContactTarget(r)}
                        className="w-full sm:w-auto"
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Request a callback
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {contactTarget && (
        <LeadContactModal
          open={contactTarget !== null}
          onOpenChange={(o) => {
            if (!o) setContactTarget(null);
          }}
          tradeUserId={contactTarget.user_id}
          tradeName={contactTarget.business_name || "this trade"}
          categoryId={categoryId}
        />
      )}
    </div>
  );
}

function EmptyMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
          <SearchX className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <Button asChild className="mt-2">
          <Link to="/">Back to homepage</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
