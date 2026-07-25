import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  SearchX,
  Phone,
  ShieldCheck,
  Star,
  FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadContactModal, type LeadMode } from "@/components/lead-contact-modal";

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
  rating: number | null;
  review_count: number;
};

type SortKey = "rating" | "reviewed" | "proximity";
type MinRating = "any" | "3" | "4" | "4.5";

function SearchPage() {
  const { category, postcode } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [allCategories, setAllCategories] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [contactTarget, setContactTarget] = useState<{
    result: Result;
    mode: LeadMode;
  } | null>(null);

  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [minRating, setMinRating] = useState<MinRating>("any");
  const [categoryFilter, setCategoryFilter] = useState<string>(category);

  useEffect(() => setCategoryFilter(category), [category]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, slug")
      .order("name")
      .then(({ data }) => {
        setAllCategories(
          (data as { id: string; name: string; slug: string }[] | null) ?? [],
        );
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const activeCategory = categoryFilter || category;
      const catRes = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("slug", activeCategory)
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
          "user_id, business_name, bio, phone, portfolio_image_urls, is_verified, published",
        )
        .in("user_id", ids)
        .eq("published", true)
        .eq("is_verified", true);
      if (cancelled) return;
      const profiles =
        (profilesRes.data as Omit<
          Result,
          "categories" | "areas" | "rating" | "review_count"
        >[] | null) ?? [];

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
          rating: null,
          review_count: 0,
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [category, postcode, categoryFilter]);

  const label = categoryName ?? categoryFilter;

  const displayed = useMemo(() => {
    let list = [...results];
    if (minRating !== "any") {
      const threshold = parseFloat(minRating);
      list = list.filter((r) => (r.rating ?? 0) >= threshold);
    }
    list.sort((a, b) => {
      if (sortBy === "rating") {
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      if (sortBy === "reviewed") {
        return b.review_count - a.review_count;
      }
      // proximity: exact postcode match first, then alphabetical area
      const aExact = a.areas.includes(postcode) ? 0 : 1;
      const bExact = b.areas.includes(postcode) ? 0 : 1;
      return aExact - bExact;
    });
    return list;
  }, [results, minRating, sortBy, postcode]);

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
        {/* Filter / sort bar */}
        <Card className="mb-4">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Category
              </label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Minimum rating
              </label>
              <Select
                value={minRating}
                onValueChange={(v) => setMinRating(v as MinRating)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any rating</SelectItem>
                  <SelectItem value="3">3+ stars</SelectItem>
                  <SelectItem value="4">4+ stars</SelectItem>
                  <SelectItem value="4.5">4.5+ stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Sort by
              </label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Rating (high to low)</SelectItem>
                  <SelectItem value="reviewed">Most reviewed</SelectItem>
                  <SelectItem value="proximity">Postcode proximity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </div>
        ) : !categoryFilter || !postcode ? (
          <EmptyMessage
            title="Add a category and postcode"
            description="Head back to the homepage and pick a trade plus your postcode to search."
          />
        ) : displayed.length === 0 ? (
          <EmptyMessage
            title={`No trades found in ${postcode}${
              categoryName ? ` for ${categoryName}s` : ""
            } yet`}
            description="Try loosening the filters, or check back soon — every listing is verified before it appears."
          />
        ) : (
          <div className="grid gap-4">
            {displayed.map((r) => (
              <ResultCard
                key={r.user_id}
                r={r}
                onCallback={() => setContactTarget({ result: r, mode: "callback" })}
                onQuote={() => setContactTarget({ result: r, mode: "quote" })}
              />
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
          tradeUserId={contactTarget.result.user_id}
          tradeName={contactTarget.result.business_name || "this trade"}
          categoryId={categoryId}
          mode={contactTarget.mode}
          defaultPostcode={postcode}
        />
      )}
    </div>
  );
}

function ResultCard({
  r,
  onCallback,
  onQuote,
}: {
  r: Result;
  onCallback: () => void;
  onQuote: () => void;
}) {
  const thumbs = r.portfolio_image_urls.slice(0, 4);
  return (
    <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold">
                {r.business_name || "Unnamed business"}
              </h2>
              {r.is_verified && (
                <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-2 text-sm">
              {r.review_count > 0 && r.rating !== null ? (
                <>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < Math.round(r.rating ?? 0) ? "fill-current" : ""
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{r.rating?.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({r.review_count} review{r.review_count === 1 ? "" : "s"})
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  New on Stockfix — no reviews yet
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.categories.map((c) => (
                <Badge key={c.slug} variant="secondary">
                  {c.name}
                </Badge>
              ))}
            </div>

            {r.bio && (
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                {r.bio}
              </p>
            )}

            {thumbs.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-hidden">
                {thumbs.map((src, i) => (
                  <div
                    key={i}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted sm:h-20 sm:w-20"
                  >
                    <img
                      src={src}
                      alt={`${r.business_name ?? "Trade"} portfolio ${i + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Covers: {r.areas.join(", ") || "—"}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:w-44">
            <Button onClick={onQuote} className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Request a quote
            </Button>
            <Button onClick={onCallback} variant="outline" className="w-full">
              <Phone className="mr-2 h-4 w-4" />
              Request callback
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
