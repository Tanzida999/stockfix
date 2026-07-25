import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Clock, Loader2, Search, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type Mode = "service" | "company";

type LiveCategory = { id: string; name: string; slug: string };

export type ServiceOption = {
  id: string;
  parent_id: string | null;
  label: string;
  slug: string;
  sort_order: number;
};

const STORAGE_KEY = "stockfix.recentSearches.v1";
export const LAST_POSTCODE_KEY = "stockfix.lastPostcode.v1";
const MAX_RECENT = 6;

type RecentStore = Record<Mode, string[]>;

function readRecent(): RecentStore {
  if (typeof window === "undefined") return { service: [], company: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { service: [], company: [] };
    const parsed = JSON.parse(raw) as Partial<RecentStore>;
    return {
      service: Array.isArray(parsed.service) ? parsed.service.slice(0, MAX_RECENT) : [],
      company: Array.isArray(parsed.company) ? parsed.company.slice(0, MAX_RECENT) : [],
    };
  } catch {
    return { service: [], company: [] };
  }
}

function writeRecent(store: RecentStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function readLastPostcode(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(LAST_POSTCODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function SearchEntryModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>("service");
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<RecentStore>({ service: [], company: [] });
  const [categories, setCategories] = useState<LiveCategory[]>([]);

  // Drill-down state
  const [category, setCategory] = useState<LiveCategory | null>(null);
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  // Chain of selected options, deepest last.
  const [path, setPath] = useState<ServiceOption[]>([]);

  useEffect(() => {
    if (open) {
      setRecent(readRecent());
      setQuery("");
      resetDrilldown();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setCategories((data as LiveCategory[] | null) ?? []);
      });
  }, []);

  function resetDrilldown() {
    setCategory(null);
    setOptions([]);
    setPath([]);
  }

  const currentRecent = recent[mode];

  function persistRecent(next: string[]) {
    const updated = { ...recent, [mode]: next };
    setRecent(updated);
    writeRecent(updated);
  }

  function pushRecent(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [
      trimmed,
      ...currentRecent.filter((t) => t.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, MAX_RECENT);
    persistRecent(next);
  }

  function removeRecent(term: string) {
    persistRecent(currentRecent.filter((t) => t !== term));
  }

  function clearRecent() {
    persistRecent([]);
  }

  function navigate(params: URLSearchParams) {
    const saved = readLastPostcode();
    if (saved) {
      params.set("postcode", saved);
      params.set("pcsaved", "1");
    }
    onOpenChange(false);
    window.location.href = `/search?${params.toString()}`;
  }

  function finish(term: string, slug?: string, job?: string) {
    pushRecent(term);
    const params = new URLSearchParams();
    if (mode === "service") {
      if (slug) params.set("category", slug);
      else params.set("q", term);
      if (job) params.set("job", job);
    } else {
      params.set("company", term);
    }
    navigate(params);
  }

  async function startDrilldown(cat: LiveCategory) {
    setCategory(cat);
    setPath([]);
    setLoadingOptions(true);
    const { data } = await supabase
      .from("service_options")
      .select("id, parent_id, label, slug, sort_order")
      .eq("category_id", cat.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const rows = (data as ServiceOption[] | null) ?? [];
    setOptions(rows);
    setLoadingOptions(false);
    if (rows.length === 0) {
      // No configured tree for this category — go straight to results.
      finish(cat.name, cat.slug);
    }
  }

  function matchCategory(term: string): LiveCategory | undefined {
    const t = term.trim().toLowerCase();
    if (!t) return undefined;
    return categories.find(
      (c) =>
        c.name.toLowerCase() === t ||
        c.slug === t ||
        c.name.toLowerCase().startsWith(t) ||
        // "Plumber" typed vs "Plumbers" category etc.
        c.name.toLowerCase().replace(/s$/, "") === t.replace(/s$/, ""),
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    if (mode === "service") {
      const match = matchCategory(term);
      if (match) {
        void startDrilldown(match);
        return;
      }
    }
    finish(term);
  }

  function selectOption(opt: ServiceOption) {
    const children = options.filter((o) => o.parent_id === opt.id);
    const nextPath = [...path, opt];
    if (children.length > 0) {
      setPath(nextPath);
      return;
    }
    // Final level — submit.
    if (!category) return;
    const job = [category.name, ...nextPath.map((o) => o.label)].join(" > ");
    finish(category.name, category.slug, job);
  }

  const currentParentId = path.length ? path[path.length - 1].id : null;
  const currentOptions = useMemo(
    () => options.filter((o) => o.parent_id === currentParentId),
    [options, currentParentId],
  );

  const heading = useMemo(() => {
    if (!category) return "";
    if (path.length === 0)
      return `What do you need a ${category.name.toLowerCase()} to help with?`;
    if (path.length === 1) return "What does your job involve?";
    return `What does your ${path[path.length - 1].label.toLowerCase()} job involve?`;
  }, [category, path]);

  const inDrilldown = category !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0 sm:rounded-2xl" aria-describedby={undefined}>
        {/* Tabs */}
        <div className="flex items-center justify-between border-b px-5 pt-5 pb-4">
          <div className="inline-flex rounded-full bg-muted p-1 text-sm">
            {(["service", "company"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  resetDrilldown();
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 font-medium capitalize transition",
                  mode === m
                    ? "bg-foreground text-background shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {inDrilldown ? (
          <div className="px-5 pt-5 pb-6">
            <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
            {loadingOptions ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading options…
              </div>
            ) : (
              <ul className="mt-4 divide-y rounded-xl border">
                {currentOptions.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => selectOption(o)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium transition hover:bg-muted"
                    >
                      <span className="flex-1">{o.label}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {path.length > 0 && (
              <button
                type="button"
                onClick={() => setPath((p) => p.slice(0, -1))}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
          </div>
        ) : (
          <div className="px-5 pt-5 pb-6">
            <h2 className="text-xl font-semibold tracking-tight">
              {mode === "service" ? "Describe your project or problem" : "Search for a company"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "service"
                ? "Be as descriptive as you'd like"
                : "Type the business name you're looking for"}
            </p>

            <form onSubmit={handleSubmit} className="mt-4">
              <label className="flex items-center gap-3 rounded-2xl border border-input bg-background px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    mode === "service"
                      ? "e.g. plumber, leaking radiator, rewire kitchen…"
                      : "e.g. Stockfix Plumbing Ltd"
                  }
                  className="h-8 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
                />
              </label>
            </form>

            {/* Recent */}
            {currentRecent.length > 0 && (
              <section className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent searches
                  </h3>
                  <button
                    type="button"
                    onClick={clearRecent}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </button>
                </div>
                <ul className="divide-y">
                  {currentRecent.map((term) => (
                    <li key={term} className="group flex items-center gap-3 py-2">
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => {
                          const match = mode === "service" ? matchCategory(term) : undefined;
                          if (match) void startDrilldown(match);
                          else finish(term);
                        }}
                        className="flex-1 truncate text-left text-sm hover:text-foreground"
                      >
                        {term}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRecent(term)}
                        className="rounded-full p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                        aria-label={`Remove ${term}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Popular */}
            {mode === "service" && categories.length > 0 && (
              <section className="mt-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Popular searches
                </h3>
                <ul className="divide-y">
                  {categories.slice(0, 6).map((c) => (
                    <li key={c.slug}>
                      <button
                        type="button"
                        onClick={() => void startDrilldown(c)}
                        className="flex w-full items-center gap-3 py-2.5 text-left text-sm hover:text-foreground"
                      >
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{c.name}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {mode === "company" && currentRecent.length === 0 && (
              <p className="mt-6 text-sm text-muted-foreground">
                Start typing a business name to search verified companies on Stockfix.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
