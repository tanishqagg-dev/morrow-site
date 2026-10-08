import { fileURLToPath } from "node:url";

export const REQUIRED_PUBLIC_VARIABLES = Object.freeze([
  "JARVIS_SITE_ORIGIN",
  "NEXT_PUBLIC_LICENSE_API_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLERK_FRONTEND_API_URL",
]);

function exactHttpsOrigin(value) {
  if (typeof value !== "string" || value === "") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || (url.pathname !== "" && url.pathname !== "/")
      || url.search
      || url.hash
      || url.origin !== value
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function exactSupabaseOrigin(value) {
  const origin = exactHttpsOrigin(value);
  if (!origin) return null;
  const url = new URL(origin);
  return /^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) ? origin : null;
}

export function validateProductionEnvironment(environment = process.env) {
  if (environment.NETLIFY !== "true" || environment.CONTEXT !== "production") {
    return { enforced: false };
  }

  const checkoutEnabled = environment.NEXT_PUBLIC_CHECKOUT_ENABLED !== "false";
  const missing = REQUIRED_PUBLIC_VARIABLES.filter((name) => {
    if (!checkoutEnabled && name.includes("CLERK")) return false;
    const value = environment[name];
    return typeof value !== "string" || value.trim() === "";
  });
  if (missing.length > 0) {
    throw new Error(`Refusing production deploy: missing ${missing.join(", ")}.`);
  }

  const siteOrigin = exactHttpsOrigin(environment.JARVIS_SITE_ORIGIN);
  const supabaseOrigin = exactSupabaseOrigin(environment.NEXT_PUBLIC_SUPABASE_URL);
  const functionsBase = environment.NEXT_PUBLIC_LICENSE_API_URL;
  const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const clerkOrigin = exactHttpsOrigin(environment.NEXT_PUBLIC_CLERK_FRONTEND_API_URL);
  const invalid = [];

  if (!siteOrigin) invalid.push("JARVIS_SITE_ORIGIN");
  if (!supabaseOrigin) invalid.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseOrigin || functionsBase !== `${supabaseOrigin}/functions/v1`) {
    invalid.push("NEXT_PUBLIC_LICENSE_API_URL");
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]{20,512}$/.test(publishableKey)) {
    invalid.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  if (checkoutEnabled && !/^pk_live_[A-Za-z0-9+/_-]{20,512}={0,2}$/.test(environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "")) {
    invalid.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }
  if (checkoutEnabled && !clerkOrigin) invalid.push("NEXT_PUBLIC_CLERK_FRONTEND_API_URL");
  if (!checkoutEnabled && (environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || environment.NEXT_PUBLIC_CLERK_FRONTEND_API_URL)) {
    invalid.push("CLERK_MUST_BE_EMPTY_WHEN_CHECKOUT_DISABLED");
  }
  if (invalid.length > 0) {
    throw new Error(`Refusing production deploy: invalid ${[...new Set(invalid)].join(", ")}.`);
  }

  return { enforced: true, siteOrigin, supabaseOrigin, clerkOrigin };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    validateProductionEnvironment();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
