# Morrow website

Customer-facing Morrow pages, subscription accounts, activation preflight, Windows setup help, privacy, open-source notice, and an MFA-protected operator console.

The staged subscription model, Clerk sign-in, Razorpay UPI AutoPay setup, GST requirements, and test-to-live checklist are in [Account and billing flow](docs/CLERK_RAZORPAY_ACCOUNT_FLOW.md).

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Quality gates:

```bash
npm run test
npm run typecheck
npm run build
```

## Public configuration

The customer experience has one licensing-functions base URL. There is no
public or build-time DMG URL:

- `NEXT_PUBLIC_LICENSE_API_URL`: Supabase Edge Functions base, normally `https://<project>.supabase.co/functions/v1`.
- `NEXT_PUBLIC_JARVIS_VERSION`: customer-facing pilot version.
- `NEXT_PUBLIC_SUPPORT_URL`: Skills4U support or company page.
- `NEXT_PUBLIC_SUPPORT_EMAIL`: optional support email.

Operator authentication uses Supabase Auth with public browser credentials:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The publishable key is designed for browser use. Never add an `sb_secret_` key to this project or to Netlify variables exposed to the site.

`JARVIS_SITE_ORIGIN` is retained as the migration-safe environment name. It sets the canonical public origin for metadata and should point to the Aestrum production domain.

## Licensing integration

The website does not create a second licensing database. It uses the Edge Functions and schema in the [desktop repository’s Supabase directory](https://github.com/tanishqagg-dev/jarvis-by-skills4u/tree/main/supabase).

The operator console signs in through Supabase Auth, stores the session in `sessionStorage`, requires a verified TOTP session at AAL2, and sends that access token to:

- `operator-issue-code`
- `operator-list-licenses`
- `operator-revoke-license`
- `operator-reset-device`

The `/activate` page calls `check-license` directly from the visitor's browser at the configured functions base. This preserves the visitor IP for the Edge Function's IP and code/IP rate limits instead of collapsing every request onto a shared website-server address. Add the production and preview origins to `JARVIS_ALLOWED_ORIGINS` before deploying. Expected request and response:

```json
{ "activationCode": "J4U-XXXXX-XXXXX-XXXXX-XXXXX" }
```

```json
{
  "eligible": true,
  "status": "recognized",
  "message": "Code recognized. Your private Aestrum installer is ready.",
  "downloadUrl": "https://PROJECT.supabase.co/storage/v1/object/sign/jarvis-releases/macos/aarch64/Jarvis-0.3.0.dmg?token=...",
  "downloadExpiresAt": 1800000180
}
```

The browser sends only `activationCode`; it does not send a name, email, or
other customer PII. A recognized code receives a private Supabase Storage URL
for the exact enabled DMG lasting no more than five minutes. Invalid, revoked,
expired, or release-unavailable codes receive no URL.

Operator MFA must also be enforced inside the operator Edge Functions. The UI gate protects the normal console path, but it is not a substitute for rejecting AAL1 JWTs in the service.

This preflight must never bind a device. Device binding remains the responsibility of the native app through `activate-license`.

Follow [licensing setup](https://github.com/tanishqagg-dev/jarvis-by-skills4u/blob/main/docs/licensing/README.md) to deploy migrations, functions, signing keys, and operator roles.

## Download hosting

The download-first beta uses `/download` and a public, versioned GitHub release
asset in `tanishqagg-dev/morrow-releases`. Installation is free; the native app still requires an active paid
account. The reviewed filename, byte count and SHA-256 are recorded in
`lib/mac-release.json`. Before building, `scripts/prepare-mac-download.mjs`
checks the exact artifact and restricts its download URL to the matching release.
Set `MORROW_MAC_INSTALLER` to require verification of a local notarized, stapled DMG.
Locally it defaults to `../output/morrow-paid-beta/release/`. Website CI without
that file verifies the public GitHub asset's upload digest, size, tag and URL
against the same manifest. Altered bytes or mismatched published metadata fail
the build. Never commit the DMG or signing keys.

Supabase rejected files larger than 50 MB, and the Netlify-hosted DMG repeatedly
returned incomplete transfers. GitHub Releases hosts the installer; Netlify hosts
the website and its download button. The separate entitlement-protected updater
archive remains unpublished. Do not claim automatic updates are available until
the private release archive and metadata have been staged and enabled.

## Netlify deployment

1. Use the existing `morrow-aestrum` Netlify project, connected to `tanishqagg-dev/morrow-site`, with `main` as the production branch and the repository root as the base directory.
2. Keep the build command as `npm run build` and publish directory as `out`. [`netlify.toml`](./netlify.toml) records the same settings.
3. Add the variables above for Deploy Previews and Production. Use the exact deploy origin for `JARVIS_SITE_ORIGIN`.
4. Deploy the static Next.js export. The build writes environment-pinned security headers into the export, so no serverless website runtime or legacy Next.js adapter is needed.
5. Add the deployed origin to `JARVIS_ALLOWED_ORIGINS` for the Supabase Edge Functions.
6. Verify `/`, `/subscribe`, `/activate`, `/windows-setup`, `/privacy`, `/open-source`, and `/operator`.
7. Confirm `/operator` returns `X-Robots-Tag: noindex, nofollow, noarchive`.

The response headers include a restrictive Content Security Policy. Supabase and licensing origins are added to `connect-src` from the public environment variables at build time.

## GPL and source delivery

The public site includes an open-source notice linking the upstream GPL-3.0 project. Every distributed pilot build must also include its applicable license notices and complete corresponding source, or a compliant written source offer. The website copy is not a substitute for release-package compliance review.

## Shared website repository

Live site: https://morrow.aestrum.in. Netlify builds `main` with `npm run build` and publishes `out`. Push website changes here. Desktop and backend development remains in `tanishqagg-dev/jarvis-by-skills4u`. Environment files and Netlify state stay outside Git.
