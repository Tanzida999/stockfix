import { useState, type FormEvent } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

const URGENCY_OPTIONS = [
  { value: "emergency", label: "Emergency — ASAP" },
  { value: "urgent", label: "Within a few days" },
  { value: "soon", label: "Within 2 weeks" },
  { value: "flexible", label: "I'm flexible" },
] as const;

type Props = {
  tradeUserId: string;
  tradeName: string;
  categoryId?: string | null;
  postcode?: string;
  initialDescription?: string;
  onCancel: () => void;
};

export function InlineQuoteForm({
  tradeUserId,
  tradeName,
  categoryId,
  postcode = "",
  initialDescription = "",
  onCancel,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [jobDescription, setJobDescription] = useState(initialDescription);
  const [urgency, setUrgency] = useState<string>("soon");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !phone.trim() || !email.trim() || !jobDescription.trim()) {
      setError("Please fill in the job description and your contact details.");
      return;
    }
    setSubmitting(true);

    const message = [
      `Job: ${jobDescription.trim()}`,
      postcode ? `Postcode: ${postcode.toUpperCase()}` : null,
      `Urgency: ${
        URGENCY_OPTIONS.find((u) => u.value === urgency)?.label ?? urgency
      }`,
    ]
      .filter(Boolean)
      .join("\n");

    const { data, error: insertErr } = await supabase
      .from("leads")
      .insert({
        trade_user_id: tradeUserId,
        category_id: categoryId ?? null,
        homeowner_name: name.trim(),
        homeowner_phone: phone.trim(),
        homeowner_email: email.trim(),
        message,
      })
      .select("id")
      .single();

    if (insertErr || !data) {
      setSubmitting(false);
      setError(insertErr?.message ?? "Something went wrong. Please try again.");
      return;
    }

    fetch("/api/public/notify-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: data.id }),
    }).catch((err) => console.warn("notify-lead failed:", err));

    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
          <Check className="h-4 w-4" />
        </span>
        <div>
          <p className="font-medium">Quote request sent</p>
          <p className="text-muted-foreground">
            {tradeName} has your details and will be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-lg border bg-muted/40 p-4"
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`job-${tradeUserId}`}>What do you need doing?</Label>
        <Textarea
          id={`job-${tradeUserId}`}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={3}
          placeholder="e.g. Replace a leaking radiator valve in the front room."
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`urgency-${tradeUserId}`}>Urgency</Label>
          <Select value={urgency} onValueChange={setUrgency}>
            <SelectTrigger id={`urgency-${tradeUserId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {URGENCY_OPTIONS.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`name-${tradeUserId}`}>Your name</Label>
          <Input
            id={`name-${tradeUserId}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`phone-${tradeUserId}`}>Phone</Label>
          <Input
            id={`phone-${tradeUserId}`}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`email-${tradeUserId}`}>Email</Label>
          <Input
            id={`email-${tradeUserId}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send request
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
