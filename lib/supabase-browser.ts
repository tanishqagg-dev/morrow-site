"use client";

import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

function isAllowedProtocol(url: URL) {
  return url.protocol === "https:"
    || (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1"));
}

export function validatedLicensingFunctionsBase(rawBase: string, rawSupabaseUrl: string) {
  if (!rawBase || !rawSupabaseUrl) return "";
  let base: URL;
  let supabase: URL;
  try {
    base = new URL(rawBase);
    supabase = new URL(rawSupabaseUrl);
  } catch {
    return "";
  }
  if (
    !isAllowedProtocol(base)
    || !isAllowedProtocol(supabase)
    || base.origin !== supabase.origin
    || base.username !== ""
    || base.password !== ""
    || supabase.username !== ""
    || supabase.password !== ""
    || (supabase.pathname !== "/" && supabase.pathname !== "")
    || supabase.search !== ""
    || supabase.hash !== ""
    || base.search !== ""
    || base.hash !== ""
    || base.pathname.replace(/\/$/, "") !== "/functions/v1"
  ) return "";
  return `${base.origin}/functions/v1`;
}

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (!url || !publishableKey) return null;
  if (!browserClient) {
    browserClient = createClient(url, publishableKey, {
      auth: {
        persistSession: typeof window !== "undefined",
        storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

export function licensingFunctionsBase() {
  return validatedLicensingFunctionsBase(
    process.env.NEXT_PUBLIC_LICENSE_API_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  );
}
