import { createFileRoute } from "@tanstack/react-router";

// Public server route (bypasses site auth). Sends an email to the trade
// notifying them of a new lead. Requires RESEND_API_KEY env var.
// Uses the Supabase publishable/anon key to look up the trade's contact_email
// via the public "published" RLS policy — no service role needed.

type NotifyBody = {
  leadId?: string;
};

export const Route = createFileRoute("/api/public/notify-lead")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const resendKey = process.env.RESEND_API_KEY;
        const supabaseUrl =
          process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const supabaseKey =
          process.env.SUPABASE_PUBLISHABLE_KEY ??
          process.env.SUPABASE_ANON_KEY ??
          process.env.VITE_SUPABASE_ANON_KEY;

        if (!resendKey) {
          return Response.json(
            { ok: false, error: "RESEND_API_KEY not configured" },
            { status: 500 },
          );
        }
        if (!supabaseUrl || !supabaseKey) {
          return Response.json(
            { ok: false, error: "Supabase env not configured" },
            { status: 500 },
          );
        }

        let body: NotifyBody;
        try {
          body = (await request.json()) as NotifyBody;
        } catch {
          return Response.json(
            { ok: false, error: "Invalid JSON body" },
            { status: 400 },
          );
        }
        if (!body.leadId || typeof body.leadId !== "string") {
          return Response.json(
            { ok: false, error: "leadId required" },
            { status: 400 },
          );
        }

        // Fetch lead using anon key (public INSERT policy doesn't allow SELECT,
        // so we use a service role key if provided, otherwise fall back to
        // reading via the trade's published profile only).
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const readKey = serviceKey ?? supabaseKey;

        const leadRes = await fetch(
          `${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(body.leadId)}&select=*`,
          {
            headers: {
              apikey: readKey,
              Authorization: `Bearer ${readKey}`,
            },
          },
        );
        if (!leadRes.ok) {
          const text = await leadRes.text();
          return Response.json(
            { ok: false, error: `Lead lookup failed [${leadRes.status}]: ${text}` },
            { status: 502 },
          );
        }
        const leads = (await leadRes.json()) as Array<{
          id: string;
          trade_user_id: string;
          homeowner_name: string;
          homeowner_phone: string;
          homeowner_email: string;
          message: string | null;
        }>;
        const lead = leads[0];
        if (!lead) {
          return Response.json(
            { ok: false, error: "Lead not found (service role key may be required to read leads)" },
            { status: 404 },
          );
        }

        const profRes = await fetch(
          `${supabaseUrl}/rest/v1/trade_profiles?user_id=eq.${encodeURIComponent(lead.trade_user_id)}&select=business_name,contact_email`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          },
        );
        const profiles = (await profRes.json().catch(() => [])) as Array<{
          business_name: string | null;
          contact_email: string | null;
        }>;
        const profile = profiles[0];
        const to = profile?.contact_email;
        if (!to) {
          return Response.json(
            { ok: false, error: "Trade has no contact_email on profile" },
            { status: 422 },
          );
        }

        const businessName = profile?.business_name || "your Stockfix profile";
        const msgHtml = lead.message
          ? `<p><strong>Message:</strong><br/>${escapeHtml(lead.message)}</p>`
          : "";

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Stockfix <onboarding@resend.dev>",
            to: [to],
            subject: `New lead for ${businessName}`,
            html: `
              <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto">
                <h2 style="color:#b04a1a">You've got a new lead on Stockfix</h2>
                <p>A homeowner just requested a callback from ${escapeHtml(businessName)}.</p>
                <div style="background:#faf6f2;border:1px solid #eee;border-radius:8px;padding:16px;margin:16px 0">
                  <p><strong>Name:</strong> ${escapeHtml(lead.homeowner_name)}</p>
                  <p><strong>Phone:</strong> ${escapeHtml(lead.homeowner_phone)}</p>
                  <p><strong>Email:</strong> ${escapeHtml(lead.homeowner_email)}</p>
                  ${msgHtml}
                </div>
                <p style="color:#666;font-size:12px">Log in to your Stockfix dashboard to manage this lead.</p>
              </div>
            `,
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error("Resend send failed:", emailRes.status, errText);
          return Response.json(
            { ok: false, error: `Resend failed [${emailRes.status}]` },
            { status: 502 },
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
