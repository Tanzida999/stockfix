import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Clock, Search, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type Mode = "service" | "company";

type PopularItem = { label: string; slug?: string };

const STORAGE_KEY = "stockfix.recentSearches.v1";
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
  const [popularServices, setPopularServices] = useState<PopularItem[]>([]);

  useEffect(() => {
    if (open) {
      setRecent(readRecent());
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("name, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(6)
      .then(({ data }) => {
        if (!data) return;
        setPopularServices(
          (data as { name: string; slug: string }[]).map((c) => ({
            label: c.name,
            slug: c.slug,
          })),
        );
      });
  }, []);

  const popular: PopularItem[] = useMemo(() => {
    if (mode === "service") return popularServices;
    // Company mode: no known company list yet — surface friendly suggestions.
    return [];
  }, [mode, popularServices]);

  const currentRecent = recent[mode];

  function persistRecent(next: string[]) {
    const updated = { ...recent, [mode]: next };
    setRecent(updated);
    writeRecent(updated);
  }

  function pushRecent(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...currentRecent.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(
      0,
      MAX_RECENT,
    );
    persistRecent(next);
  }

  function removeRecent(term: string) {
    persistRecent(currentRecent.filter((t) => t !== term));
  }

  function clearRecent() {
    persistRecent([]);
  }

  function goTo(term: string, slug?: string) {
    pushRecent(term);
    onOpenChange(false);
    const params = new URLSearchParams();
    if (mode === "service") {
      if (slug) params.set("category", slug);
      else params.set("q", term);
    } else {
      params.set("company", term);
    }
    window.location.href = `/search?${params.toString()}`;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    // Try to match a popular service slug when in service mode.
    const match =
      mode === "service"
        ? popularServices.find((p) => p.label.toLowerCase() === term.toLowerCase())
        : undefined;
    goTo(term, match?.slug);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl gap-0 p-0 sm:rounded-2xl"
        aria-describedby={undefined}
      >
        {/* Tabs */}
        <div className="flex items-center justify-between border-b px-5 pt-5 pb-4">
          <div className="inline-flex rounded-full bg-muted p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("service")}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium transition",
                mode === "service"
                  ? "bg-foreground text-background shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Service
            </button>
            <button
              type="button"
              onClick={() => setMode("company")}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium transition",
                mode === "company"
                  ? "bg-foreground text-background shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Company
            </button>
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

        <div className="px-5 pt-5 pb-6">
          <h2 className="text-xl font-semibold tracking-tight">
            {mode === "service"
              ? "Describe your project or problem"
              : "Search for a company"}
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
                    ? "e.g. leaking radiator, rewire kitchen…"
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
                      onClick={() => goTo(term)}
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
          {popular.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Popular searches
              </h3>
              <ul className="divide-y">
                {popular.map((p) => (
                  <li key={p.label}>
                    <button
                      type="button"
                      onClick={() => goTo(p.label, p.slug)}
                      className="flex w-full items-center gap-3 py-2 text-left text-sm hover:text-foreground"
                    >
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{p.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {mode === "company" && popular.length === 0 && currentRecent.length === 0 && (
            <p className="mt-6 text-sm text-muted-foreground">
              Start typing a business name to search verified companies on Stockfix.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
