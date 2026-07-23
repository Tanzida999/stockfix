import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Upload, ShieldCheck, Clock, XCircle, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BUCKET = "credentials";

export type CredentialType =
  | "gas_safe"
  | "niceic"
  | "public_liability_insurance"
  | "company_registration";

export type CredentialStatus = "pending" | "approved" | "rejected";

export const CREDENTIAL_LABELS: Record<CredentialType, string> = {
  gas_safe: "Gas Safe",
  niceic: "NICEIC",
  public_liability_insurance: "Public liability insurance",
  company_registration: "Company registration",
};

type Credential = {
  id: string;
  credential_type: CredentialType;
  register_number: string | null;
  document_url: string | null;
  status: CredentialStatus;
  admin_notes: string | null;
  created_at: string;
};

export function CredentialsManager({ userId }: { userId: string }) {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [type, setType] = useState<CredentialType>("gas_safe");
  const [registerNumber, setRegisterNumber] = useState("");
  const [docPath, setDocPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trade_credentials")
      .select("id, credential_type, register_number, document_url, status, admin_notes, created_at")
      .eq("trade_user_id", userId)
      .order("created_at", { ascending: false });
    setCreds((data as Credential[] | null) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    setError(null);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) {
      setError(`Upload failed: ${upErr.message}`);
      setUploading(false);
      return;
    }
    setDocPath(path);
    setUploading(false);
  }

  async function submit() {
    if (!docPath) {
      setError("Please upload a document.");
      return;
    }
    if (!registerNumber.trim()) {
      setError("Please enter your register number.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: insErr } = await supabase.from("trade_credentials").insert({
      trade_user_id: userId,
      credential_type: type,
      register_number: registerNumber.trim(),
      document_url: docPath,
    });
    if (insErr) {
      setError(insErr.message);
      setSubmitting(false);
      return;
    }
    setRegisterNumber("");
    setDocPath(null);
    if (fileRef.current) fileRef.current.value = "";
    setSubmitting(false);
    await load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h3 className="text-base font-semibold">Submit a credential</h3>
            <p className="text-sm text-muted-foreground">
              Upload proof of your registration or insurance. An admin will review
              and approve within a few working days.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Couldn't submit</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label>Credential type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CredentialType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CREDENTIAL_LABELS) as CredentialType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {CREDENTIAL_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="register_number">Register number</Label>
            <Input
              id="register_number"
              value={registerNumber}
              onChange={(e) => setRegisterNumber(e.target.value)}
              placeholder="e.g. 123456"
            />
          </div>

          <div className="grid gap-2">
            <Label>Document (PDF or image)</Label>
            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="ml-2">
                  {docPath ? "Replace document" : "Upload document"}
                </span>
              </Button>
              {docPath && (
                <span className="truncate text-xs text-muted-foreground">
                  Uploaded ✓
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting || uploading}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className={submitting ? "ml-2" : ""}>Submit for review</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h3 className="text-base font-semibold">Your submitted credentials</h3>
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : creds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven't submitted any credentials yet.
            </p>
          ) : (
            <div className="grid gap-3">
              {creds.map((c) => (
                <CredentialRow key={c.id} c={c} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CredentialRow({ c }: { c: Credential }) {
  const StatusIcon =
    c.status === "approved" ? ShieldCheck : c.status === "rejected" ? XCircle : Clock;
  const variant =
    c.status === "approved"
      ? "default"
      : c.status === "rejected"
        ? "destructive"
        : "secondary";
  return (
    <div className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{CREDENTIAL_LABELS[c.credential_type]}</span>
          {c.register_number && (
            <span className="text-xs text-muted-foreground">
              #{c.register_number}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Submitted {new Date(c.created_at).toLocaleDateString()}
        </p>
        {c.status === "rejected" && c.admin_notes && (
          <p className="mt-2 text-sm text-destructive">
            Reviewer notes: {c.admin_notes}
          </p>
        )}
      </div>
      <Badge variant={variant} className="shrink-0 capitalize">
        <StatusIcon className="mr-1 h-3 w-3" />
        {c.status}
      </Badge>
    </div>
  );
}
