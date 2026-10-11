import {describe,it,expect} from 'vitest';
import {quantityChangeEligibility} from '../lib/subscription-quantity';
describe('RZP-04 verified subscription method',()=>{
  it('allows only authenticated or active cards',()=>{
    for(const status of ['authenticated','active']) expect(quantityChangeEligibility({payment_method:'card',status})).toBe('allowed');
    for(const status of ['created','pending','halted','paused','trialing','cancelled']) expect(quantityChangeEligibility({payment_method:'card',status})).toBe('state');
  });
  it('rejects UPI and eNACH even when checkout preferred card',()=>{
    for(const payment_method of ['upi','enach','netbanking']) expect(quantityChangeEligibility({payment_method,status:'active'})).toBe('unsupported');
  });
  it('fails closed for unknown or absent method evidence',()=>{
    for(const payment_method of [undefined,null,'unknown']) expect(quantityChangeEligibility({payment_method,status:'active'})).toBe('unknown');
  });
});
