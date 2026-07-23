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
import { supabase } from "@/lib/supabase";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeUserId: string;
  tradeName: string;
  categoryId?: string | null;
};

export function LeadContactModal({
  open,
  onOpenChange,
  tradeUserId,
  tradeName,
  categoryId,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
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
    setSubmitting(true);
    const { data, error: insertErr } = await supabase
      .from("leads")
      .insert({
        trade_user_id: tradeUserId,
        category_id: categoryId ?? null,
        homeowner_name: name.trim(),
        homeowner_phone: phone.trim(),
        homeowner_email: email.trim(),
        message: message.trim() || null,
      })
      .select("id")
      .single();
    if (insertErr || !data) {
      setSubmitting(false);
      setError(insertErr?.message ?? "Something went wrong. Please try again.");
      return;
    }
    // Fire-and-log notification (don't block the confirmation).
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
              <DialogTitle className="text-center">Request sent</DialogTitle>
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
              <DialogTitle>Request a callback from {tradeName}</DialogTitle>
              <DialogDescription>
                Share your contact details and we'll pass them straight to the trade.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3">
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
                Send request
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
