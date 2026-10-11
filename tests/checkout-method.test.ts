import {describe,it,expect} from 'vitest';
import {checkoutMethods, checkoutMethodConfig} from '../lib/checkout-method';
describe('RZP-10 MONEY-01 checkout methods',()=>{
 it('offers only reviewed introductory methods and never defaults an empty offer to UPI',()=>{
  expect(checkoutMethods({duration:'first_cycle',paymentMethods:['card']})).toEqual(['card']);
  expect(checkoutMethods({duration:'first_cycle'})).toEqual([]);
  expect(checkoutMethods(null)).toEqual(['upi','card']);
 });
 it('restricts Checkout to the chosen server method without default blocks',()=>{
  for(const method of ['upi','card'] as const){
   const config=checkoutMethodConfig(method);
   expect(config.display.blocks.selected.instruments).toEqual([{method}]);
   expect(config.display.preferences.show_default_blocks).toBe(false);
   expect(config.display.sequence).toEqual(['block.selected']);
  }
 });
 it('refuses a reply that omits or changes the chosen method',()=>{
  expect(()=>checkoutMethodConfig(undefined)).toThrow();
  expect(()=>checkoutMethodConfig('card','upi')).toThrow();
 });
});
