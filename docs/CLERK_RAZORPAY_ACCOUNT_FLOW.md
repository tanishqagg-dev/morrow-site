# Clerk accounts and Razorpay subscriptions

Clerk owns sign-in, profile details, verified email, and account security. The website uses Clerk's UserButton and UserProfile controls. Both expose a Subscription link to `/subscribe?view=subscription`.

Razorpay owns checkout, recurring mandates, charges, and cancellation. This integration does not use Clerk Billing or pretend Razorpay subscriptions are native Clerk subscriptions. The server authenticates each request with Clerk and links it to the existing billing account. Payment access remains in the billing database, not editable Clerk user metadata.

## Payment reliability

- Browser checkout success alone never unlocks access. Signed Razorpay events or server-side reconciliation of a captured payment and paid invoice update the entitlement.
- The existing database deduplicates events and payment IDs. Checkout reservations prevent a timed-out gateway call from silently creating another subscription.
- Missing payment events can be recovered when the customer refreshes their subscription. Recovery verifies account ownership, invoice, payment, amount, currency, and period.
- The browser aborts billing requests after 90 seconds, including a stalled response body. It does not automatically replay mutations. The timeout message asks the customer to check their subscription before another payment attempt.
- Razorpay's checkout script has a 20-second loading limit. Concurrent callers share one load. Failed loads remove their script and permit a fresh attempt.
- Unreadable successful HTTP responses are errors, not successful confirmations.
- Account styling no longer applies the custom sign-out button style to Clerk's nested controls.

## Verification on 2026-10-01

- Website suite: 67 tests passed, including new transport and script recovery tests.
- Website TypeScript check passed.
- Supabase suite: 119 tests passed, including lifecycle, deduplication, refunds, Clerk authentication, and reconciliation tests.
- Local `/subscribe` returned HTTP 200 and opened the real Clerk sign-in modal in development mode.
- Signed-in Clerk profile/menu interaction and an actual Razorpay test payment still require an authenticated browser session. These changes have not been deployed or verified with a live UPI mandate.

UPI AutoPay availability depends on Razorpay enabling it for the merchant and subscription configuration. No real charge was made during this change.
