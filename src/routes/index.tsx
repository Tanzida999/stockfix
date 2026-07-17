import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  Wrench,
  Zap,
  Flame,
  Home,
  Hammer,
  PaintRoller,
  ShieldCheck,
  BadgeCheck,
  MessageSquareHeart,
  MapPin,
  Search,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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
        content: "Every trade properly checked — Gas Safe, NICEIC, insurance and Companies House verified.",
      },
    ],
  }),
  component: Landing,
});

const liveCategories = [
  { slug: "plumber", label: "Plumber", icon: Wrench },
  { slug: "electrician", label: "Electrician", icon: Zap },
  { slug: "gas-heating-engineer", label: "Gas / Heating Engineer", icon: Flame },
];

const comingSoonCategories = [
  { slug: "roofer", label: "Roofer", icon: Home },
  { slug: "carpenter", label: "Carpenter", icon: Hammer },
  { slug: "painter", label: "Painter", icon: PaintRoller },
];

function Landing() {
  return (
    <div className="min-h-screen bg-[oklch(0.985_0.01_75)] text-foreground">
      <Header />
      <main>
        <Hero />
        <PopularTrades />
        <TrustSection />
        <HowItWorks />
        <TradeRecruitment />
      </main>
      <Footer />
    </div>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <a href="/" className={cn("flex items-center gap-2", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-md bg-[oklch(0.62_0.16_45)] text-white shadow-sm">
        <Wrench className="h-4 w-4" />
      </span>
      <span className="text-lg font-bold tracking-tight">Stockfix</span>
    </a>
  );
}

function Header() {
  const links = [
    { href: "/search", label: "Find a trade" },
    { href: "/signup?role=trade", label: "List your business" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-foreground/80 hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/login"
            className="text-sm font-medium text-foreground/80 hover:text-foreground"
          >
            Log in
          </a>
          <Button
            asChild
            className="bg-[oklch(0.62_0.16_45)] text-white hover:bg-[oklch(0.56_0.16_45)]"
          >
            <a href="/signup">Sign up</a>
          </Button>
        </nav>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="mt-8 flex flex-col gap-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                Log in
              </a>
              <Button
                asChild
                className="mt-2 bg-[oklch(0.62_0.16_45)] text-white hover:bg-[oklch(0.56_0.16_45)]"
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

function Hero() {
  const [category, setCategory] = useState("plumber");
  const [postcode, setPostcode] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (postcode.trim()) params.set("postcode", postcode.trim());
    window.location.href = `/search?${params.toString()}`;
  };

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 600px at 20% -10%, oklch(0.94 0.06 55) 0%, transparent 60%), linear-gradient(180deg, oklch(0.98 0.02 70) 0%, oklch(0.99 0.005 70) 100%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Find local tradespeople{" "}
            <span className="text-[oklch(0.55_0.17_40)]">you can trust</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Every business on Stockfix is verified before it's listed — checked
            against official registers, not self-declared.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-black/5 bg-white p-3 shadow-xl shadow-[oklch(0.55_0.17_40_/_0.08)] sm:mt-10 sm:p-4"
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] sm:gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-input px-3 sm:border-0 sm:border-r sm:border-input sm:rounded-none sm:pr-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 w-full border-0 bg-transparent px-0 shadow-none focus:ring-0 focus-visible:ring-0">
                  <SelectValue placeholder="What do you need?" />
                </SelectTrigger>
                <SelectContent>
                  {liveCategories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-input px-3 sm:border-0 sm:rounded-none">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="Postcode"
                className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                aria-label="Postcode"
              />
            </div>

            <Button
              type="submit"
              className="h-11 gap-2 bg-[oklch(0.62_0.16_45)] px-6 text-white hover:bg-[oklch(0.56_0.16_45)] sm:h-auto"
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

function PopularTrades() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="mb-8 flex flex-col gap-2 sm:mb-10">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Popular trades</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Pick a category to see verified local tradespeople.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {liveCategories.map((c) => (
          <a
            key={c.slug}
            href={`/search?category=${c.slug}`}
            className="group flex flex-col items-center gap-3 rounded-xl border border-black/5 bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[oklch(0.62_0.16_45_/_0.4)] hover:shadow-md"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[oklch(0.96_0.04_60)] text-[oklch(0.55_0.17_40)] transition group-hover:bg-[oklch(0.92_0.07_55)]">
              <c.icon className="h-6 w-6" />
            </span>
            <span className="text-sm font-semibold">{c.label}</span>
          </a>
        ))}
        {comingSoonCategories.map((c) => (
          <div
            key={c.slug}
            className="relative flex cursor-not-allowed flex-col items-center gap-3 rounded-xl border border-dashed border-black/10 bg-white/60 p-5 text-center"
            aria-disabled
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <c.icon className="h-6 w-6" />
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              {c.label}
            </span>
            <span className="rounded-full bg-[oklch(0.95_0.03_75)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[oklch(0.5_0.1_60)]">
              Coming soon
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustSection() {
  const items = [
    {
      icon: BadgeCheck,
      title: "Checked against official registers",
      body: "Gas Safe, NICEIC and Companies House verified — not self-declared.",
    },
    {
      icon: ShieldCheck,
      title: "Insurance verified",
      body: "Public liability insurance confirmed before a business is listed.",
    },
    {
      icon: MessageSquareHeart,
      title: "Real reviews only",
      body: "From genuine customers who actually hired the trade, moderated by us.",
    },
    {
      icon: MapPin,
      title: "Local and accountable",
      body: "We know the trades we list. If something goes wrong, we care.",
    },
  ];

  return (
    <section className="border-y border-black/5 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Every trade, properly checked
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Trust isn't a badge. It's what we do before a business ever
            appears on Stockfix.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-xl border border-black/5 bg-[oklch(0.99_0.005_70)] p-5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[oklch(0.62_0.16_45)] text-white">
                <it.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{it.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: 1, title: "Search for the trade you need", body: "Pick a category and enter your postcode." },
    { n: 2, title: "Compare verified profiles and reviews", body: "See who's checked, insured and highly rated nearby." },
    { n: 3, title: "Get in touch or request a quote", body: "Message directly or ask for a quote — no middleman." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="relative rounded-xl border border-black/5 bg-white p-6 shadow-sm">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[oklch(0.62_0.16_45)] text-base font-bold text-white">
              {s.n}
            </span>
            <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TradeRecruitment() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.32 0.06 45) 0%, oklch(0.4 0.09 40) 100%)",
      }}
    >
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 text-white sm:px-6 sm:py-24 md:grid-cols-[minmax(0,1.4fr)_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-white/70">
            Are you a tradesperson?
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Join a directory that puts trusted trades first.
          </h2>
          <ul className="mt-6 space-y-2 text-white/90">
            <li className="flex gap-2"><BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[oklch(0.9_0.12_75)]" /> Free to list — no charge until it brings you work.</li>
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[oklch(0.9_0.12_75)]" /> Every member verified — you compete on quality, not noise.</li>
            <li className="flex gap-2"><MessageSquareHeart className="mt-0.5 h-5 w-5 shrink-0 text-[oklch(0.9_0.12_75)]" /> Real customers, direct enquiries, no lead-selling games.</li>
          </ul>
        </div>
        <div className="md:justify-self-end">
          <Button
            asChild
            size="lg"
            className="h-12 bg-white px-6 text-[oklch(0.4_0.12_40)] hover:bg-white/90"
          >
            <a href="/signup?role=trade">List your business</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            A directory of verified local tradespeople. Honest, checked, and
            close to home.
          </p>
        </div>
        <FooterCol title="For homeowners" links={[
          { href: "/search", label: "Find a trade" },
          { href: "/signup", label: "Create an account" },
          { href: "/login", label: "Log in" },
        ]} />
        <FooterCol title="For trades" links={[
          { href: "/signup?role=trade", label: "List your business" },
          { href: "/login", label: "Trade log in" },
        ]} />
        <FooterCol title="Company" links={[
          { href: "#", label: "Privacy" },
          { href: "#", label: "Terms" },
          { href: "#", label: "Contact" },
        ]} />
      </div>
      <div className="border-t border-black/5">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
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
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
