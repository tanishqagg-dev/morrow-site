import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {SubscriptionRecoveryGuidance} from '../components/SubscriptionRecoveryGuidance';
describe('RZP-05 subscription recovery guidance', () => {
 it.each([
  ['pending','Razorpay will retry','payment failure email'],
  ['halted','Automatic debits have stopped','Previously unpaid invoices'],
  ['paused','resume it in the same UPI app','cannot resume it for you'],
 ])('explains %s and supported customer recovery', (status, provider, customer) => {
  const html = renderToStaticMarkup(createElement(SubscriptionRecoveryGuidance,{status, hasPaidAccess:false}));
  expect(html).toContain(provider);expect(html).toContain(customer);
  expect(html).toContain('Morrow');expect(html).toContain('Contact support');
  expect(html).not.toContain('href="https://');expect(html).not.toContain('Choose a plan');
 });
 it('keeps current paid access honest while recovery is pending', () => {
  const html = renderToStaticMarkup(createElement(SubscriptionRecoveryGuidance,{status:'pending',hasPaidAccess:true}));
  expect(html).toContain('until the access date');
 });
 it('does not present another subscription as recovery or a false next-charge date', () => {
  const source=readFileSync(new URL('../components/BillingPortal.tsx',import.meta.url),'utf8');
  expect(source).toContain('!subscriptionNeedsRecovery');
  expect(source).toContain('subscriptionNeedsRecovery ? "Access until"');
 });
});
