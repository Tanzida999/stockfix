import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import {
  Wrench,
  Zap,
  Flame,
  Home,
  Hammer,
  PaintRoller,
  ShieldCheck,
  BadgeCheck,
  FileCheck2,
  Search,
  Menu,
  UserRound,
  ArrowRight,
  ClipboardList,
  MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { SearchEntryModal } from "@/components/search-entry-modal";
import heroTrade from "@/assets/hero-trade.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stockfix — Find local tradespeople you can trust" },
      {
        name: "description",
        content:
          "Stockfix is a directory of verified local tradespeople. Every business is checked against official registers and insurance before it's listed.",
      },
      { property: "og:title", content: "Stockfix — Find local tradespeople you can trust" },
      {
        property: "og:description",
        content:
          "Every trade properly checked — Gas Safe, NICEIC, insurance and Companies House verified.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

type LiveCategory = {
  slug: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  wrench: Wrench,
  zap: Zap,
  flame: Flame,
};

const comingSoonCategories: LiveCategory[] = [
  { slug: "roofer", label: "Roofer", icon: Home },
  { slug: "carpenter", label: "Carpenter", icon: Hammer },
  { slug: "painter", label: "Painter", icon: PaintRoller },
];

const BRAND = "oklch(0.62 0.16 45)";
const BRAND_DEEP = "oklch(0.42 0.13 40)";

function Landing() {
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("categories")
      .select("name, slug, icon, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setCategories(
          data.map((c: { name: string; slug: string; icon: string | null }) => ({
            slug: c.slug,
            label: c.name,
            icon: (c.icon && iconMap[c.icon]) || Wrench,
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[oklch(0.985_0.01_75)] text-foreground">
      <Header />
      <main>
        <Hero onOpenSearch={() => setModalOpen(true)} />
        <CategoryPills
          categories={[...categories, ...comingSoonCategories]}
          liveSlugs={new Set(categories.map((c) => c.slug))}
        />
        <HowItWorks onOpenSearch={() => setModalOpen(true)} />
      </main>
      <Footer />
      <SearchEntryModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function Logo({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "onBrand";
}) {
  return (
    <Link to="/" className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "grid h-8 w-8 place-items-center rounded-md shadow-sm",
          tone === "onBrand" ? "bg-white text-[oklch(0.55_0.17_40)]" : "text-white",
        )}
        style={tone === "onBrand" ? undefined : { backgroundColor: BRAND }}
      >
        <Wrench className="h-4 w-4" />
      </span>
      <span
        className={cn(
          "text-lg font-bold tracking-tight",
          tone === "onBrand" && "text-white",
        )}
      >
        Stockfix
      </span>
    </Link>
  );
}

function AudienceToggle({ className }: { className?: string }) {
  // Static toggle: /  = Homeowners view (default). /signup?role=trade = Trades landing target.
  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-black/10 bg-white/70 p-1 shadow-sm backdrop-blur",
        className,
      )}
    >
      <Link
        to="/"
        className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background sm:text-sm"
      >
        Homeowners
      </Link>
      <a
        href="/signup?role=trade"
        className="rounded-full px-4 py-1.5 text-xs font-semibold text-foreground/70 hover:text-foreground sm:text-sm"
      >
        For Trades
      </a>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6">
        <Logo />

        <div className="hidden justify-center md:flex">
          <AudienceToggle />
        </div>

        <nav className="hidden items-center gap-2 justify-self-end md:flex">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <a href="/login" aria-label="Log in to your account">
              <UserRound className="h-4 w-4" />
              <span>Log in</span>
            </a>
          </Button>
          <Button
            asChild
            size="sm"
            className="text-white hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            <a href="/signup">Sign up</a>
          </Button>
        </nav>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="justify-self-end md:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="mt-8 flex flex-col gap-2">
              <AudienceToggle className="self-start" />
              <a
                href="/search"
                className="mt-4 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                Find a trade
              </a>
              <a
                href="/signup?role=trade"
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                List your business
              </a>
              <a
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                Log in
              </a>
              <Button
                asChild
                className="mt-2 text-white hover:opacity-90"
                style={{ backgroundColor: BRAND }}
              >
                <a href="/signup">Sign up</a>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function Hero({ onOpenSearch }: { onOpenSearch: () => void }) {
  const badges = [
    { icon: BadgeCheck, label: "100% verified trades" },
    { icon: ShieldCheck, label: "Insurance checked" },
    { icon: FileCheck2, label: "Gas Safe & NICEIC confirmed" },
  ];

  return (
    <section
      className="relative overflow-hidden text-white"
      style={{
        background: `linear-gradient(135deg, ${BRAND_DEEP} 0%, ${BRAND} 100%)`,
      }}
    >
      {/* Warm ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            "radial-gradient(900px 500px at 85% 20%, oklch(0.95 0.09 70 / 0.25) 0%, transparent 60%), radial-gradient(700px 400px at 10% 90%, oklch(0.98 0.04 80 / 0.15) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-center md:gap-8 md:pt-20 md:pb-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            Every trade verified before it's listed
          </span>

          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Find a trade you can{" "}
            <span className="text-[oklch(0.94_0.11_85)]">actually trust</span>.
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            Local, checked and insured tradespeople — one search away.
          </p>

          {/* Single search trigger */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="group mt-7 flex w-full max-w-xl items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-2xl shadow-black/20 transition hover:shadow-black/30 sm:p-3.5"
            aria-label="Open search"
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white"
              style={{ backgroundColor: BRAND }}
            >
              <Search className="h-5 w-5" />
            </span>
            <span className="flex-1 truncate text-sm text-muted-foreground sm:text-base">
              What do you need doing today?
            </span>
            <span
              className="hidden shrink-0 items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm sm:inline-flex"
              style={{ backgroundColor: BRAND }}
            >
              Search
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>

          {/* Trust pills */}
          <ul className="mt-6 flex flex-wrap gap-2">
            {badges.map((b) => (
              <li
                key={b.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur"
              >
                <b.icon className="h-3.5 w-3.5" />
                {b.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Hero image */}
        <div className="relative hidden md:block">
          <div
            aria-hidden
            className="absolute -inset-6 rounded-[2rem] bg-white/10 blur-2xl"
          />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/20 shadow-2xl shadow-black/40">
            <img
              src={heroTrade}
              alt="A verified Stockfix tradesperson ready for work in a British home"
              width={1024}
              height={1280}
              className="h-full w-full object-cover"
            />
            {/* Floating verified card */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl bg-white/95 p-3 text-foreground shadow-lg backdrop-blur">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-white">
                <BadgeCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold">Verified & insured</p>
                <p className="text-xs text-muted-foreground">
                  Checked against Gas Safe, NICEIC & Companies House
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryPills({
  categories,
  liveSlugs,
}: {
  categories: LiveCategory[];
  liveSlugs: Set<string>;
}) {
  return (
    <section className="border-b border-black/5 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Popular trades
          </h2>
          <a
            href="/search"
            className="text-xs font-semibold text-[oklch(0.55_0.17_40)] hover:underline"
          >
            Browse all
          </a>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-2 sm:flex-wrap sm:gap-2.5">
            {categories.map((c) => {
              const live = liveSlugs.has(c.slug);
              const Wrapper: React.ElementType = live ? "a" : "div";
              const wrapperProps = live
                ? { href: `/search?category=${c.slug}` }
                : { "aria-disabled": true as const };
              return (
                <li key={c.slug}>
                  <Wrapper
                    {...wrapperProps}
                    className={cn(
                      "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                      live
                        ? "border-black/10 bg-white text-foreground hover:-translate-y-0.5 hover:border-[oklch(0.62_0.16_45_/_0.5)] hover:shadow-md"
                        : "cursor-not-allowed border-dashed border-black/10 bg-muted/50 text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-full",
                        live
                          ? "bg-[oklch(0.96_0.04_60)] text-[oklch(0.55_0.17_40)] group-hover:bg-[oklch(0.92_0.07_55)]"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <c.icon className="h-3.5 w-3.5" />
                    </span>
                    <span>{c.label}</span>
                    {!live && (
                      <span className="rounded-full bg-[oklch(0.95_0.03_75)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.5_0.1_60)]">
                        Soon
                      </span>
                    )}
                  </Wrapper>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ onOpenSearch }: { onOpenSearch: () => void }) {
  const steps = [
    {
      n: 1,
      icon: Search,
      title: "Search",
      body: "Tell us what you need and where — takes a few seconds.",
    },
    {
      n: 2,
      icon: ClipboardList,
      title: "Compare verified trades",
      body: "Every profile is checked against official registers, not self-declared.",
    },
    {
      n: 3,
      icon: MessagesSquare,
      title: "Get quotes",
      body: "Request quotes or a callback directly — no middleman, no lead-selling.",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="mb-10 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            How Stockfix works
          </h2>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Three steps between you and a trade you can trust.
          </p>
        </div>
        <Button
          onClick={onOpenSearch}
          className="text-white hover:opacity-90"
          style={{ backgroundColor: BRAND }}
        >
          <Search className="mr-2 h-4 w-4" />
          Start a search
        </Button>
      </div>

      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="relative rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-10 w-10 place-items-center rounded-full text-white"
                style={{ backgroundColor: BRAND }}
              >
                <s.icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                Step {s.n}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Footer() {
  return (
    <footer
      className="text-white"
      style={{
        background: `linear-gradient(135deg, ${BRAND_DEEP} 0%, oklch(0.28 0.05 40) 100%)`,
      }}
    >
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <Logo tone="onBrand" />
          <p className="mt-3 max-w-xs text-sm text-white/75">
            A directory of verified local tradespeople. Honest, checked, and
            close to home.
          </p>
        </div>
        <FooterCol
          title="For homeowners"
          links={[
            { href: "/search", label: "Find a trade" },
            { href: "/signup", label: "Create an account" },
            { href: "/login", label: "Log in" },
          ]}
        />
        <FooterCol
          title="For trades"
          links={[
            { href: "/signup?role=trade", label: "List your business" },
            { href: "/login", label: "Trade log in" },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { href: "#", label: "Privacy" },
            { href: "#", label: "Terms" },
            { href: "#", label: "Contact" },
          ]}
        />
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/60 sm:px-6">
          © {new Date().getFullYear()} Stockfix. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="text-sm text-white/70 transition hover:text-white"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
