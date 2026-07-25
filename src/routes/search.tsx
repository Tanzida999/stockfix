import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  SearchX,
  ShieldCheck,
  Star,
  ChevronDown,
  FileText,
  ClipboardList,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LocationAutocomplete } from "@/components/location-autocomplete";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineQuoteForm } from "@/components/inline-quote-form";
import { SearchEntryModal, LAST_POSTCODE_KEY } from "@/components/search-entry-modal";

type SearchParams = {
  category: string;
  postcode: string;
  job: string;
  pcsaved: string;
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    category: typeof search.category === "string" ? search.category : "",
    postcode: typeof search.postcode === "string" ? search.postcode : "",
    job: typeof search.job === "string" ? search.job : "",
    pcsaved: typeof search.pcsaved === "string" ? search.pcsaved : "",
  }),
  head: () => ({
    meta: [
      { title: "Search verified trades — Stockfix" },
      {
        name: "description",
        content: "Find verified local tradespeople by category and postcode.",
      },
      { property: "og:title", content: "Search verified trades — Stockfix" },
      {
        property: "og:description",
        content: "Find verified local tradespeople by category and postcode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

type SortKey = "relevant" | "rating" | "reviewed";
type MinRating = "any" | "3" | "4" | "4.5";

function SearchPage() {
  const { category, postcode, job, pcsaved } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });

  // Live inputs — selecting a location resolves straight to an outward code.
  const [categoryInput, setCategoryInput] = useState(category);
  const [debouncedPostcode, setDebouncedPostcode] = useState(postcode);
  const [locationLabel, setLocationLabel] = useState(postcode);


  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [allCategories, setAllCategories] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [openQuoteFor, setOpenQuoteFor] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortKey>("relevant");
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [showPostcodeNotice, setShowPostcodeNotice] = useState(pcsaved === "1");
  const [minRating, setMinRating] = useState<MinRating>("any");

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

  function handleLocationSelect(outcode: string, label: string) {
    setDebouncedPostcode(outcode.toUpperCase());
    setLocationLabel(label);
    setShowPostcodeNotice(false);
    try {
      window.localStorage.setItem(LAST_POSTCODE_KEY, outcode.toUpperCase());
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!debouncedPostcode) return;
    try {
      window.localStorage.setItem(LAST_POSTCODE_KEY, debouncedPostcode.toUpperCase());
    } catch {
      /* ignore */
    }
  }, [debouncedPostcode]);


  // Keep the URL in sync (replace, so back button isn't flooded).
  useEffect(() => {
    if (categoryInput === category && debouncedPostcode === postcode) return;
    navigate({
      search: { category: categoryInput, postcode: debouncedPostcode, job, pcsaved },
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryInput, debouncedPostcode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const activeCategory = categoryInput;
      const activePostcode = debouncedPostcode;

      if (!activeCategory) {
        setResults([]);
        setCategoryId(null);
        setCategoryName(null);
        setLoading(false);
        return;
      }

      const catRes = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("slug", activeCategory)
        .maybeSingle();
      if (cancelled) return;
      const cat = catRes.data as { id: string; name: string; slug: string } | null;
      setCategoryName(cat?.name ?? null);
      setCategoryId(cat?.id ?? null);

      if (!cat) {
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

      let ids = Array.from(catIds);
      if (activePostcode) {
        const tpaRes = await supabase
          .from("trade_profile_areas")
          .select("trade_user_id")
          .eq("outward_code", activePostcode);
        if (cancelled) return;
        const areaIds = new Set(
          ((tpaRes.data as { trade_user_id: string }[] | null) ?? []).map(
            (r) => r.trade_user_id,
          ),
        );
        ids = ids.filter((id) => areaIds.has(id));
      }

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
  }, [categoryInput, debouncedPostcode]);

  const displayed = useMemo(() => {
    let list = [...results];
    if (minRating !== "any") {
      const threshold = parseFloat(minRating);
      list = list.filter((r) => (r.rating ?? 0) >= threshold);
    }
    list.sort((a, b) => {
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "reviewed") return b.review_count - a.review_count;
      const aExact = a.areas.includes(debouncedPostcode) ? 0 : 1;
      const bExact = b.areas.includes(debouncedPostcode) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
    return list;
  }, [results, minRating, sortBy, debouncedPostcode]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Back</span>
              </Link>
            </Button>
            <h1 className="truncate text-base font-semibold sm:text-lg">
              Find a verified trade
            </h1>
          </div>

          {/* Live search inputs */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Trade</Label>
              <Select value={categoryInput} onValueChange={setCategoryInput}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a trade" />
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
              <Label htmlFor="pc" className="text-xs text-muted-foreground">
                Location
              </Label>
              <LocationAutocomplete
                id="pc"
                value={debouncedPostcode}
                displayValue={locationLabel}
                onSelect={handleLocationSelect}
              />
            </div>

          </div>

          {/* Compact sort / filter row */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-xs text-muted-foreground">
              {loading
                ? "Searching…"
                : `${displayed.length} ${
                    displayed.length === 1 ? "trade" : "trades"
                  } found`}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Select
                value={minRating}
                onValueChange={(v) => setMinRating(v as MinRating)}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any rating</SelectItem>
                  <SelectItem value="3">3+ stars</SelectItem>
                  <SelectItem value="4">4+ stars</SelectItem>
                  <SelectItem value="4.5">4.5+ stars</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevant">Most relevant</SelectItem>
                  <SelectItem value="rating">Highest rated</SelectItem>
                  <SelectItem value="reviewed">Most reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {showPostcodeNotice && debouncedPostcode && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border bg-background p-3 text-sm shadow-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="flex-1">
              Postcode used from your last search. Make sure it&apos;s where the
              project&apos;s needed!
            </p>
            <button
              type="button"
              onClick={() => setShowPostcodeNotice(false)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Describe your job</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {job
                    ? job
                    : "Answer a few quick questions and we'll match you with verified local trades."}
                </p>
              </div>
            </div>
            <Button className="shrink-0" onClick={() => setDrilldownOpen(true)}>
              Request quotes
            </Button>
          </CardContent>
        </Card>

        <SearchEntryModal open={drilldownOpen} onOpenChange={setDrilldownOpen} />

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </div>
        ) : !categoryInput || !debouncedPostcode ? (
          <EmptyMessage
            title="Pick a trade and postcode"
            description="Choose a trade and type your postcode district above — results update as you go."
          />
        ) : displayed.length === 0 ? (
          <EmptyMessage
            title={`No trades found in ${debouncedPostcode}${
              categoryName ? ` for ${categoryName}s` : ""
            } yet`}
            description="Try loosening the filters or a nearby postcode district — every listing is verified before it appears."
          />
        ) : (
          <div className="grid gap-4">
            {displayed.map((r) => (
              <ResultCard
                key={r.user_id}
                r={r}
                categoryId={categoryId}
                postcode={debouncedPostcode}
                job={job}
                expanded={openQuoteFor === r.user_id}
                onToggle={() =>
                  setOpenQuoteFor((cur) => (cur === r.user_id ? null : r.user_id))
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ResultCard({
  r,
  categoryId,
  postcode,
  job,
  expanded,
  onToggle,
}: {
  r: Result;
  categoryId: string | null;
  postcode: string;
  job: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="transition hover:shadow-md">
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

            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Covers: {r.areas.join(", ") || "—"}</span>
            </div>
          </div>

          <div className="shrink-0 sm:w-48">
            <Button
              onClick={onToggle}
              variant={expanded ? "outline" : "default"}
              className="w-full"
              aria-expanded={expanded}
            >
              <FileText className="mr-2 h-4 w-4" />
              Request a quote
              <ChevronDown
                className={`ml-2 h-4 w-4 transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4">
            <InlineQuoteForm
              tradeUserId={r.user_id}
              tradeName={r.business_name || "this trade"}
              categoryId={categoryId}
              postcode={postcode}
              initialDescription={job}
              onCancel={onToggle}
            />
          </div>
        )}
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
      </CardContent>
    </Card>
  );
}
