"use client";
// Imported only in development. Production eliminates this branch and its query flag.
import {billingRequest} from '../lib/billing';
import { useEffect } from 'react';
import { CheckoutUnavailable } from './CheckoutUnavailable';
import { BillingPortalContent } from './BillingPortal';
export function BillingDevFixture({ state }: { state: string }) {
  useEffect(() => { document.documentElement.dataset.morrowQaReady = state; return () => { delete document.documentElement.dataset.morrowQaReady; }; }, [state]);
  if (state === "closed") return <CheckoutUnavailable />;
  return <BillingPortalContent identity={{ loaded: state !== 'loading', userId: 'qa-user', email: 'qa@example.test',
    getToken: async () => 'qa-session',
    // Synthetic identity only; production eliminates the entire fixture.
    sensitiveMutation: async (body,expectedUserId) => {if(expectedUserId!=='qa-user')throw new Error('Fixture account changed');return billingRequest('billing-customer',body,'qa-session');}, openSignIn: () => {}, signOut: async () => {} }} />;
}
