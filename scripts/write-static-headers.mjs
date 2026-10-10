import nextEnv from "@next/env";
import { lstat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function safeConnectOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const allowedProtocol = url.protocol === "https:" || (url.protocol === "http:" && loopback);
    if (
      !allowedProtocol
      || url.username
      || url.password
      || !["", "/", "/functions/v1", "/functions/v1/"].includes(url.pathname)
      || url.search
      || url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function renderNetlifyHeaders(environment = process.env) {
  const clerkOrigin = safeConnectOrigin(environment.NEXT_PUBLIC_CLERK_FRONTEND_API_URL);
  const connectOrigins = Array.from(new Set([
    "'self'",
    safeConnectOrigin(environment.NEXT_PUBLIC_SUPABASE_URL),
    safeConnectOrigin(environment.NEXT_PUBLIC_LICENSE_API_URL),
    clerkOrigin,
  ].filter(Boolean)));
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self' https://*.razorpay.com",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com ${clerkOrigin || ""} https://challenges.cloudflare.com https://*.protect.clerk.com`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.com https://*.razorpay.com https://*.razorpay.in",
    `connect-src ${connectOrigins.join(" ")} https://*.protect.clerk.com:* https://*.razorpay.com https://*.razorpay.in`,
    "frame-src https://challenges.cloudflare.com https://*.protect.clerk.com https://*.razorpay.com https://*.razorpay.in",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
  ].join("; ");

  return `/*
  Content-Security-Policy: ${contentSecurityPolicy}
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), geolocation=(), microphone=(), usb=()

/
  Cache-Control: no-cache, no-store, must-revalidate

/activate
  Cache-Control: no-cache, no-store, must-revalidate

/subscribe
  Cache-Control: no-cache, no-store, must-revalidate

/open-source
  Cache-Control: no-cache, no-store, must-revalidate

/privacy
  Cache-Control: no-cache, no-store, must-revalidate

/operator
  Cache-Control: no-cache, no-store, must-revalidate
  X-Robots-Tag: noindex, nofollow, noarchive

/operator/*
  X-Robots-Tag: noindex, nofollow, noarchive
`;
}

async function main() {
  const websiteDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  nextEnv.loadEnvConfig(websiteDirectory);
  const outputDirectory = resolve(websiteDirectory, "out");
  const headersPath = resolve(outputDirectory, "_headers");
  if (dirname(outputDirectory) !== websiteDirectory || dirname(headersPath) !== outputDirectory) {
    throw new Error("Refusing to write static headers outside the website export directory.");
  }
  const output = await lstat(outputDirectory);
  if (!output.isDirectory() || output.isSymbolicLink()) {
    throw new Error("The website export directory is missing or unsafe.");
  }
  await writeFile(headersPath, renderNetlifyHeaders(), { encoding: "utf8", flag: "wx" });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
