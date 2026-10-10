"use client";
// Imported only in development. Production eliminates this branch and its query flag.
import { CheckoutUnavailable } from './CheckoutUnavailable';
import { BillingPortalContent } from './BillingPortal';
export function BillingDevFixture({ state }: { state: string }) {
  if (state === "closed") return <CheckoutUnavailable />;
  return <BillingPortalContent identity={{ loaded: state !== 'loading', userId: 'qa-user', email: 'qa@example.test',
    getToken: async () => 'qa-session', openSignIn: () => {}, signOut: async () => {} }} />;
}
