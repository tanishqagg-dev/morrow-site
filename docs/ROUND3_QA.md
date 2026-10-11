Round 3 changes cover the site routes and account flow. The separately owned published-home directory was not edited.

The reference captures are in ../qa/references/pages-*.png. The measured observations and automation limits are in ../qa/references/pages-NOTES.md, linked from the shared NOTES.md. OpenAI pages showed Cloudflare verification. Wispr's download route redirected to its account form. Clerk's real sign-in screen loaded after a longer wait. None of their assets or logos were copied.

The page evidence is in ../qa/round3/pages/. index.html links viewport and full-page images. audit-final.json consolidates the responsive state checks. Each state was captured at 1440×900 and 390×844, in ordinary and reduced motion. Keyboard focus has two additional captures. review/ contains contact sheets used to inspect the complete set. The installation launch screen is an unchanged real Morrow app capture from the supplied round 2 assets.

Billing responses, authorization completion, download bytes, cancellation and invoice rows were mocked in Playwright. These checks cover trial on/off, invitations, account loading and timeout, unavailable catalog, trial review, bank confirmation, success, trialing/canceled/paid/expired accounts, invoices, team seats, coupon UPI/card, business invoice fields, expired checkout restart, unconfirmed cancellation and bounded payment recovery. They do not prove live payment collection or entitlement delivery on a physical Mac.

The actual Clerk SDK forms were inspected without submitting credentials. Its read-only environment/client requests used the canonical production Origin and Referer in the QA browser because the configured live key rejects localhost. All page assets stayed local. The current Clerk configuration exposed email/password forms; social and legal-consent controls were absent. The appearance rules also cover those controls when enabled.

The API contract is unchanged. Trial dates and amounts still come from checkout/catalog responses; authorization expiry uses trialAuthorizationExpiresAt with the existing 25-minute fallback. Pending confirmation remains tied to a subscription and bounded by its saved timestamp. Cancellation verification errors preserve active access. No reminder step was invented.

During visual review, optional plan fields moved below the main action, the SDK's default button shadow was removed with an explicit override, the empty-catalog price stopped implying a zero first charge, and introductory coupons gained a first-payment label. A provider callback during open no longer re-locks checkout; its executable regression test uses the real startCheckout function.

Final visual correction: shared headers have an explicit 80px inner height on desktop and 72px on mobile, with flex shrinking disabled. This keeps the logo and account control centered on long forms as well as short states.

The production/ screenshots show the final static export at both widths: download and the real Clerk form. The production query `?qa=trial` still requires Clerk authentication; the development state fixture is stripped. Font, help-video and real-app-screen asset requests returned HTTP 200.

Validation: npm test passed all 160 tests in 26 suites. npm run typecheck passed. npm run build exported all 15 pages, including the existing published-home preservation checks. mono_check passed app/ and components/ with zero errors and warnings. The consolidated responsive audit contains 254 viewport captures plus their full-page companions, with no horizontal overflow or uncaught page errors. Static export checks confirmed the font, help-video and real-app-screen assets resolve; development fixtures are absent from the production JavaScript. No deployment or push was performed.
