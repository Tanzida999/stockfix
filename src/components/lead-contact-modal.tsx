import { useState, type FormEvent } from "react";
import { Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export type LeadMode = "callback" | "quote";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeUserId: string;
  tradeName: string;
  categoryId?: string | null;
  mode?: LeadMode;
  defaultPostcode?: string;
};

const URGENCY_OPTIONS = [
  { value: "emergency", label: "Emergency — ASAP" },
  { value: "urgent", label: "Within a few days" },
  { value: "soon", label: "Within 2 weeks" },
  { value: "flexible", label: "I'm flexible" },
] as const;

export function LeadContactModal({
  open,
  onOpenChange,
  tradeUserId,
  tradeName,
  categoryId,
  mode = "callback",
  defaultPostcode = "",
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [postcode, setPostcode] = useState(defaultPostcode);
  const [urgency, setUrgency] = useState<string>("soon");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isQuote = mode === "quote";

  function reset() {
    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
    setJobDescription("");
    setPostcode(defaultPostcode);
    setUrgency("soon");
    setError(null);
    setDone(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setError("Please fill in your name, phone and email.");
      return;
    }
    if (isQuote && (!jobDescription.trim() || !postcode.trim())) {
      setError("Please describe the job and add your postcode.");
      return;
    }
    setSubmitting(true);

    const finalMessage = isQuote
      ? [
          `Job: ${jobDescription.trim()}`,
          `Postcode: ${postcode.trim().toUpperCase()}`,
          `Urgency: ${
            URGENCY_OPTIONS.find((u) => u.value === urgency)?.label ?? urgency
          }`,
        ].join("\n")
      : message.trim() || null;

    const { data, error: insertErr } = await supabase
      .from("leads")
      .insert({
        trade_user_id: tradeUserId,
        category_id: categoryId ?? null,
        homeowner_name: name.trim(),
        homeowner_phone: phone.trim(),
        homeowner_email: email.trim(),
        message: finalMessage,
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

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {done ? (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center">
                {isQuote ? "Quote request sent" : "Request sent"}
              </DialogTitle>
              <DialogDescription className="text-center">
                We've passed your details to {tradeName}. They'll be in touch soon.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>
                {isQuote
                  ? `Request a quote from ${tradeName}`
                  : `Request a callback from ${tradeName}`}
              </DialogTitle>
              <DialogDescription>
                {isQuote
                  ? "Tell us about the job and how quickly you need it done."
                  : "Share your contact details and we'll pass them straight to the trade."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3">
              {isQuote && (
                <>
                  <div className="grid gap-1.5">
                    <Label htmlFor="lead-job">Job description</Label>
                    <Textarea
                      id="lead-job"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={4}
                      placeholder="e.g. Replace a leaking radiator valve in the front room."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="lead-postcode">Postcode</Label>
                      <Input
                        id="lead-postcode"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                        autoComplete="postal-code"
                        required
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="lead-urgency">Urgency</Label>
                      <Select value={urgency} onValueChange={setUrgency}>
                        <SelectTrigger id="lead-urgency">
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
                  </div>
                </>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="lead-name">Your name</Label>
                <Input
                  id="lead-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="lead-phone">Phone</Label>
                  <Input
                    id="lead-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="lead-email">Email</Label>
                  <Input
                    id="lead-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              {!isQuote && (
                <div className="grid gap-1.5">
                  <Label htmlFor="lead-message">What do you need? (optional)</Label>
                  <Textarea
                    id="lead-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Briefly describe the job."
                  />
                </div>
              )}
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isQuote ? "Send quote request" : "Send request"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
