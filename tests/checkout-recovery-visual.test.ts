import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {CheckoutRecovery} from '../components/CheckoutRecovery';
const css=readFileSync(new URL('../components/SubscriptionFlow.module.css',import.meta.url),'utf8');
describe('checkout recovery visual hierarchy',()=>{
 it('keeps the primary recovery action distinct from quiet actions',()=>{
  const html=renderToStaticMarkup(createElement(CheckoutRecovery,{state:'failed',busy:false,canResume:true,onResume(){},onChangePlan(){},onRefresh(){}}));
  expect(html).toContain('checkoutRecovery');expect(css).toMatch(/\.checkoutRecovery \.primary\s*\{[^}]*background:\s*#111/);
 });
 it('separates recovery from the plan and allows mobile actions to wrap',()=>{
  expect(css).toMatch(/\.checkoutRecovery\s*\{[^}]*margin:\s*0 0 32px/);
  expect(css).toMatch(/\.checkoutActions\s*\{[^}]*flex-wrap:\s*wrap/);
 });
});
it('gives blocked Resume one clear next step without telling the customer to resume',()=>{
 const html=renderToStaticMarkup(createElement(CheckoutRecovery,{state:'closed',busy:false,canResume:false,onResume(){},onChangePlan(){},onRefresh(){}}));
 expect(html).not.toContain('Resume this checkout');
 expect(html).toMatch(/<button class="[^"]*primary[^"]*"[^>]*>Change plan<\/button>/);
});
