import {expect,it} from 'vitest';
import * as profile from '../lib/invoice-profile';
it('DOC-4b prefills only the saved recipient name and never the account label',()=>{
 expect(profile.invoiceRecipientFromAccount({name:'Personal account'})).toBe('');
 expect(profile.invoiceRecipientFromAccount({name:'Personal account',invoice_recipient_name:'अनन्या शर्मा'})).toBe('अनन्या शर्मा');
});
it('DOC-4b trims recipient names and validates the contract length',()=>{
 expect(profile.invoiceRecipientNameForCheckout('  Ananya Sharma  ')).toBe('Ananya Sharma');
 for(const name of ['', ' ', 'A', 'a'.repeat(161)])expect(()=>profile.invoiceRecipientNameForCheckout(name)).toThrow('name');
 expect(profile.invoiceRecipientNameForCheckout('a'.repeat(160))).toHaveLength(160);
});
