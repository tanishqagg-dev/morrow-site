import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {seatQuantityForQuote} from '../lib/seat-quote-limit';
describe('MONEY-05 server seat ceiling',()=>{
 it('caps quantities at the server limit rather than a hardcoded 100',()=>{
  expect(seatQuantityForQuote('100',2,7)).toBe(7);expect(seatQuantityForQuote('1',2,7)).toBe(2);expect(seatQuantityForQuote('4.9',2,7)).toBe(4);
 });
 it('refuses unknown or unusable quote limits',()=>{
  expect(()=>seatQuantityForQuote('8',2,undefined)).toThrow();expect(()=>seatQuantityForQuote('8',2,1)).toThrow();
 });
 it('uses quote maximumQuantity for both purchase and next-cycle seat inputs',()=>{
  const source=readFileSync(new URL('../components/BillingPortal.tsx',import.meta.url),'utf8');
  expect((source.match(/max=\{maximumQuantity\}/g)||[]).length).toBe(2);expect(source).not.toContain('Math.min(100, Number(event.target.value)');
 });
});
