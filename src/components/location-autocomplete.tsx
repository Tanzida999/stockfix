import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type LocationSuggestion = {
  id: string;
  label: string;
  sublabel?: string;
  outcode: string;
};

type Props = {
  /** Current outward code (e.g. "M15") */
  value: string;
  onSelect: (outcode: string, label: string) => void;
  /** Human label to show in the field, if known */
  displayValue?: string;
  id?: string;
};

async function fetchPostcodeSuggestions(q: string): Promise<LocationSuggestion[]> {
  const res = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(q)}/autocomplete`,
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { result: string[] | null };
  const seen = new Set<string>();
  const out: LocationSuggestion[] = [];
  for (const pc of json.result ?? []) {
    const outcode = pc.split(" ")[0]?.toUpperCase();
    if (!outcode || seen.has(outcode)) continue;
    seen.add(outcode);
    out.push({
      id: `pc-${outcode}`,
      label: outcode,
      sublabel: `Postcode district (e.g. ${pc})`,
      outcode,
    });
  }
  return out.slice(0, 5);
}

async function fetchPlaceSuggestions(q: string): Promise<LocationSuggestion[]> {
  const res = await fetch(
    `https://api.postcodes.io/places?q=${encodeURIComponent(q)}&limit=8`,
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    result:
      | {
          code: string;
          name_1: string;
          outcode: string;
          local_type: string | null;
          county_unitary: string | null;
          district_borough: string | null;
          region: string | null;
        }[]
      | null;
  };
  return (json.result ?? [])
    .filter((p) => p.outcode)
    .map((p) => ({
      id: `place-${p.code}`,
      label: p.name_1,
      sublabel: [
        p.local_type,
        p.district_borough ?? p.county_unitary ?? p.region,
        p.outcode,
      ]
        .filter(Boolean)
        .join(" · "),
      outcode: p.outcode.toUpperCase(),
    }));
}

export function LocationAutocomplete({
  value,
  onSelect,
  displayValue,
  id = "location",
}: Props) {
  const [query, setQuery] = useState(displayValue ?? value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const skipNextFetch = useRef(false);

  // Keep the field in sync when the value is set externally (URL, geolocation).
  useEffect(() => {
    if (displayValue !== undefined) {
      skipNextFetch.current = true;
      setQuery(displayValue);
    }
  }, [displayValue]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const looksLikePostcode = /^[a-z]{1,2}\d/i.test(q);
      const [pcs, places] = await Promise.all([
        looksLikePostcode ? fetchPostcodeSuggestions(q) : Promise.resolve([]),
        fetchPlaceSuggestions(q),
      ]);
      if (cancelled) return;
      const merged: LocationSuggestion[] = [];
      const seen = new Set<string>();
      for (const s of [...pcs, ...places]) {
        const key = `${s.label}|${s.outcode}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(s);
      }
      setSuggestions(merged.slice(0, 8));
      setHighlight(0);
      setLoading(false);
      setOpen(true);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function choose(s: LocationSuggestion) {
    skipNextFetch.current = true;
    setQuery(s.label);
    setOpen(false);
    setSuggestions([]);
    setError(null);
    onSelect(s.outcode, s.label);
  }

  async function useMyLocation() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.postcodes.io/postcodes?lon=${longitude}&lat=${latitude}&limit=1&radius=2000`,
          );
          const json = (await res.json()) as {
            result: { outcode: string; admin_district: string | null }[] | null;
          };
          const hit = json.result?.[0];
          if (!hit) {
            setError("We couldn't find a UK area for your location.");
            return;
          }
          skipNextFetch.current = true;
          setQuery(hit.outcode);
          setOpen(false);
          onSelect(hit.outcode.toUpperCase(), hit.admin_district ?? hit.outcode);
        } catch {
          setError("Something went wrong looking up your area.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError("We couldn't get your location. Check browser permissions.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const showList = open && (loading || suggestions.length > 0);
  const hint = useMemo(
    () => (value ? `Searching in ${value}` : "Postcode, street or town"),
    [value],
  );

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onKeyDown={(e) => {
              if (!showList) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter") {
                const s = suggestions[highlight];
                if (s) {
                  e.preventDefault();
                  choose(s);
                }
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Postcode, street or town"
            autoComplete="off"
            role="combobox"
            aria-expanded={showList}
            aria-autocomplete="list"
            className="pl-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={useMyLocation}
          disabled={locating}
          title="Use my location"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">Use my location</span>
        </Button>
      </div>

      {error ? (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}

      {showList && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md"
        >
          {loading && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>
          ) : (
            suggestions.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => choose(s)}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${
                    i === highlight ? "bg-accent" : ""
                  }`}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.label}</span>
                    {s.sublabel && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.sublabel}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
