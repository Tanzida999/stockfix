import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://zfajnnutqzxbxzavvaqp.supabase.co";

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYWpubnV0cXp4Ynh6YXZ2YXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyODkwODEsImV4cCI6MjA5OTg2NTA4MX0.06dtMa8EVEZHTsO7ba15PU1pAS26os9afWumY9qxrNQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type AppRole = "homeowner" | "trade" | "admin";
