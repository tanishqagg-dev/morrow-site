# Morrow download and trial flow

The production homepage is `published-home/index.html`. The export preservation script injects only the public billing base and public Supabase key into its meta tags. `catalog.js` reads the current Personal monthly plan and trial flag. Failed or incomplete catalog responses advertise no trial and show no invented price. The original yellow flood, GSAP scenes, Netlify form and `/subscribe` link remain.

`/download?start=1` starts the reviewed DMG once per browser session. The installer remains public; account access is checked after installation. A manual retry, ZIP fallback and both manifest checksums remain available. The guide uses Finder and welcome-screen mini UIs with the real Morrow character.

`/subscribe` embeds Clerk SignUp and SignIn with hash routing, Morrow appearance, and a return URL that retains desktop, invite and period parameters. Google and email availability are controlled by the Clerk instance settings. The site cannot enable a social connection through appearance props.

Trials require confirmed enabled flags from the catalog and customer snapshot, eligible customer, Personal monthly billing, and no coupon or GSTIN discount. Coupon checkout and business GSTIN checkout remain paid paths. The user reviews a prepared checkout first; its fixed server date is shown before bank authorization. The second button reuses that subscription rather than creating another. `TRIAL_NOT_AVAILABLE` switches to an explicit paid Subscribe action, never an automatic charge. `TRIAL_CHECKOUT_EXPIRED` discards the prepared checkout and offers a fresh review, with a short message.

## Backend fields

- Catalog: `betaInviteRequired`, `trial.enabled`, `trial.days`.
- Snapshot request: optional `desktopRequestId` for installation eligibility. Response: `trial.enabled`, `trial.days`, `trial.eligible`, `trial.reason`.
- Subscriptions: `trial_ends_at`, `paid_until`, `access_source: "trial"`, `status: "trialing" | "trial_canceled"` alongside existing statuses.
- Checkout input: `trial`, `desktopRequestId` alongside existing fields.
- Checkout reply: `trialEndsAt` and `amountPaise`, as returned by the backend helper's `action.mjs`. `chargeAmountPaise` is also accepted. Missing trial data means trials are off. The first-charge date is never calculated in the browser.
- First-charge dates display in Asia/Kolkata. Current paid term end is used as the next renewal date, matching the existing account contract.
- Authorizing checkout alone does not unlock access. The browser polls server snapshots. Future `paid_until` and an entitled seat allow desktop approval, including trials and canceled trials with remaining access.

Razorpay's current subscription FAQ describes a ₹5 card/UPI verification payment that is auto-refunded. The trial screen links to that source: https://razorpay.com/docs/payments/subscriptions/faqs/ . It is separate from the subscription charge.

## Local QA

Run these from the site worktree in separate terminals:

```sh
npm run dev -- --port 4391
node scripts/qa-site-server.mjs
node scripts/qa-site.mjs
```

The QA server serves the actual published homepage and proxies Next dev routes. Billing responses and the Razorpay callback are intercepted by Playwright. `?qa=` provides a synthetic identity only in development; the dynamic fixture import and query branch are eliminated from production builds. The local export server (`node scripts/qa-export-server.mjs`) listens on 4392 and applies the exported CSP.

No production account, subscription, payment, cancellation or desktop approval is created by this audit.

Screenshots and `audit.json` are saved in `../qa/site/`, at 1440 × 900 and 390 × 900 viewports. The full audit covers 68 states, with 8 additional desktop-trial captures and 4 real Clerk auth captures (80 screenshots total). No horizontal overflow or uncaught page errors were found in the fixture audit. Full-page images include trial on/off, auto-download and checksum disclosures, loading, Clerk timeout, account error and retry, server invitation, trial review, exact charge date, bank confirmation, success, ineligible paid fallback, empty catalog, trialing, canceled trial, paid, expired, trial cancellation, checkout expiry/restart, desktop approval and invoices. `QA_DESKTOP_ONLY=1 node scripts/qa-site.mjs` verifies installation eligibility propagation, distinct checkout and desktop request IDs, and exactly one desktop approval after trial entitlement. Embedded Clerk SignUp and SignIn were also inspected at both widths, including Google/email and focus styles. Production Clerk keys require their allowed origin; `qa-clerk.mjs` routes that origin to locally built code for a read-only signed-out inspection.

This verifies website behavior with billing fixtures. It does not prove a live UPI mandate, charge or backend entitlement grant. No deploy or push is part of this work.
