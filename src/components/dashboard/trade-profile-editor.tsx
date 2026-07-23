import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload, X, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type Category = { id: string; name: string; slug: string };
type District = { outward_code: string; town: string };
type TradeProfile = {
  user_id: string;
  business_name: string | null;
  bio: string | null;
  phone: string | null;
  contact_email: string | null;
  portfolio_image_urls: string[];
  published: boolean;
};

const BUCKET = "portfolio";

export function TradeProfileEditor({
  userId,
  defaultContactEmail,
}: {
  userId: string;
  defaultContactEmail?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "ok"; message: string }
    | { kind: "err"; message: string }
  >({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [published, setPublished] = useState(false);

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());
  const [areaCodes, setAreaCodes] = useState<Set<string>>(new Set());
  const [districtFilter, setDistrictFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [profileRes, categoriesRes, districtsRes, tpcRes, tpaRes] =
        await Promise.all([
          supabase
            .from("trade_profiles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("categories")
            .select("id, name, slug")
            .eq("is_active", true)
            .order("sort_order"),
          supabase
            .from("postcode_districts")
            .select("outward_code, town")
            .order("outward_code"),
          supabase
            .from("trade_profile_categories")
            .select("category_id")
            .eq("trade_user_id", userId),
          supabase
            .from("trade_profile_areas")
            .select("outward_code")
            .eq("trade_user_id", userId),
        ]);
      if (cancelled) return;
      const profile = profileRes.data as TradeProfile | null;
      if (profile) {
        setBusinessName(profile.business_name ?? "");
        setBio(profile.bio ?? "");
        setPhone(profile.phone ?? "");
        setContactEmail(profile.contact_email ?? defaultContactEmail ?? "");
        setPortfolio(profile.portfolio_image_urls ?? []);
        setPublished(profile.published);
      } else if (defaultContactEmail) {
        setContactEmail(defaultContactEmail);
      }
      if (categoriesRes.data) setAllCategories(categoriesRes.data as Category[]);
      if (districtsRes.data) setAllDistricts(districtsRes.data as District[]);
      if (tpcRes.data)
        setCategoryIds(
          new Set((tpcRes.data as { category_id: string }[]).map((r) => r.category_id)),
        );
      if (tpaRes.data)
        setAreaCodes(
          new Set((tpaRes.data as { outward_code: string }[]).map((r) => r.outward_code)),
        );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const filteredDistricts = useMemo(() => {
    const q = districtFilter.trim().toLowerCase();
    if (!q) return allDistricts;
    return allDistricts.filter(
      (d) =>
        d.outward_code.toLowerCase().includes(q) ||
        d.town.toLowerCase().includes(q),
    );
  }, [allDistricts, districtFilter]);

  function toggleSet<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setStatus({ kind: "idle" });
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) {
        setStatus({ kind: "err", message: `Upload failed: ${error.message}` });
        continue;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    if (uploaded.length) setPortfolio((p) => [...p, ...uploaded]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(url: string) {
    setPortfolio((p) => p.filter((u) => u !== url));
  }

  async function save(nextPublished?: boolean) {
    setSaving(true);
    setStatus({ kind: "idle" });
    const publishedValue = nextPublished ?? published;

    const upsert = await supabase.from("trade_profiles").upsert(
      {
        user_id: userId,
        business_name: businessName.trim() || null,
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        portfolio_image_urls: portfolio,
        published: publishedValue,
      },
      { onConflict: "user_id" },
    );
    if (upsert.error) {
      setSaving(false);
      setStatus({ kind: "err", message: upsert.error.message });
      return;
    }

    // Replace categories
    const delCat = await supabase
      .from("trade_profile_categories")
      .delete()
      .eq("trade_user_id", userId);
    if (delCat.error) {
      setSaving(false);
      setStatus({ kind: "err", message: delCat.error.message });
      return;
    }
    if (categoryIds.size > 0) {
      const insCat = await supabase.from("trade_profile_categories").insert(
        Array.from(categoryIds).map((id) => ({
          trade_user_id: userId,
          category_id: id,
        })),
      );
      if (insCat.error) {
        setSaving(false);
        setStatus({ kind: "err", message: insCat.error.message });
        return;
      }
    }

    // Replace areas
    const delArea = await supabase
      .from("trade_profile_areas")
      .delete()
      .eq("trade_user_id", userId);
    if (delArea.error) {
      setSaving(false);
      setStatus({ kind: "err", message: delArea.error.message });
      return;
    }
    if (areaCodes.size > 0) {
      const insArea = await supabase.from("trade_profile_areas").insert(
        Array.from(areaCodes).map((code) => ({
          trade_user_id: userId,
          outward_code: code,
        })),
      );
      if (insArea.error) {
        setSaving(false);
        setStatus({ kind: "err", message: insArea.error.message });
        return;
      }
    }

    setPublished(publishedValue);
    setSaving(false);
    setStatus({
      kind: "ok",
      message: publishedValue
        ? "Profile saved and published."
        : "Profile saved as draft.",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your profile…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {status.kind === "ok" && (
        <Alert className="border-emerald-500/40 bg-emerald-500/5">
          <Check className="h-4 w-4" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}
      {status.kind === "err" && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Publish status</h3>
              <p className="text-sm text-muted-foreground">
                {published
                  ? "Your profile is live and visible to homeowners."
                  : "Your profile is a draft — not visible in search yet."}
              </p>
            </div>
            <Badge variant={published ? "default" : "secondary"}>
              {published ? "Published" : "Draft"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h3 className="text-base font-semibold">Business details</h3>
          <div className="grid gap-2">
            <Label htmlFor="business_name">Business name</Label>
            <Input
              id="business_name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Smith & Sons Plumbing"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 07123 456789"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell homeowners about your business, experience, and what you do."
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Portfolio images</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Upload</span>
            </Button>
          </div>
          {portfolio.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No images yet. Upload photos of your work to help homeowners choose you.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {portfolio.map((url) => (
                <div
                  key={url}
                  className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                >
                  <img
                    src={url}
                    alt="Portfolio"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h3 className="text-base font-semibold">Services you offer</h3>
            <p className="text-sm text-muted-foreground">
              Choose all categories that apply to your business.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {allCategories.map((c) => {
              const checked = categoryIds.has(c.id);
              return (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() =>
                      setCategoryIds((s) => toggleSet(s, c.id))
                    }
                  />
                  <span className="text-sm font-medium">{c.name}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">Areas you cover</h3>
              <p className="text-sm text-muted-foreground">
                Select the postcode districts you'll travel to.
              </p>
            </div>
            <Badge variant="secondary">{areaCodes.size} selected</Badge>
          </div>
          <Input
            placeholder="Filter by postcode or town…"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
          />
          <div className="max-h-72 overflow-y-auto rounded-md border">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDistricts.map((d) => {
                const checked = areaCodes.has(d.outward_code);
                return (
                  <label
                    key={d.outward_code}
                    className="flex cursor-pointer items-center gap-3 border-b border-r p-2.5 last:border-b-0 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        setAreaCodes((s) => toggleSet(s, d.outward_code))
                      }
                    />
                    <span className="text-sm">
                      <span className="font-medium">{d.outward_code}</span>{" "}
                      <span className="text-muted-foreground">{d.town}</span>
                    </span>
                  </label>
                );
              })}
              {filteredDistricts.length === 0 && (
                <p className="col-span-full p-4 text-sm text-muted-foreground">
                  No matching postcodes.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={() => save(false)}
          disabled={saving || uploading}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span className={saving ? "ml-2" : ""}>Save as draft</span>
        </Button>
        <Button onClick={() => save(true)} disabled={saving || uploading}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span className={saving ? "ml-2" : ""}>
            {published ? "Save & keep published" : "Publish profile"}
          </span>
        </Button>
      </div>
    </div>
  );
}
