import {afterEach,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {DesktopConsent} from '../components/DesktopConsent';
import {approveDesktopRequest,type DesktopRequest} from '../lib/desktop-consent';
import {billingRequest} from '../lib/billing';
import {signInIntentUrl,readSignInIntent,signInIntentVerb,isImmediateSignInRepeat} from '../lib/sign-in-intent';
import {trialPriceLine} from '../lib/trial-price';
vi.mock('../lib/supabase-browser',()=>({licensingFunctionsBase:()=> 'https://billing.example/functions/v1'}));
const request:DesktopRequest={id:'request',status:'pending',deviceName:'My Mac',deviceModel:null,appVersion:'0.3.14',requestedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),seatInUse:null};
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('launch sign_in_again rejects before Clerk can intercept the hint',async()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','public-test-key');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({sign_in_again:true,clerk_error:{type:'forbidden',reason:'reverification-error'},error:{code:'REVERIFICATION_REQUIRED'}},{status:403})));
 await expect(billingRequest('billing-customer',{action:'cancel'},'test-token')).rejects.toMatchObject({code:'SIGN_IN_AGAIN_REQUIRED'});
});
it('launch redirect restores the exact action for confirmation without carrying a pairing code',()=>{
 const intent={body:{action:'cancel',subscriptionId:'sub-local'},accountId:'account',userId:'user',attemptedAt:Date.now()};
 const url=signInIntentUrl('https://morrow.test/subscribe?desktop=request',intent);expect(readSignInIntent(new URL(url,'https://morrow.test').search)).toEqual(intent);expect(url).toContain('#sign-in');expect(signInIntentVerb(intent.body)).toBe('cancel');
 expect(signInIntentUrl('/subscribe',{...intent,body:{action:'approve_desktop',requestId:'request',seatId:'seat',replaceInstallationId:'mac',userCode:'K7M4QX'}})).not.toContain('K7M4QX');
});
it('launch immediate sign-in repeat shows support instead of another sign-out loop',()=>{
 expect(isImmediateSignInRepeat({attemptedAt:Date.now()})).toBe(true);expect(isImmediateSignInRepeat({attemptedAt:Date.now()-121000})).toBe(false);
});
it.each([true,undefined])('launch desktop codeRequired %s keeps code entry',codeRequired=>{
 const html=renderToStaticMarkup(createElement(DesktopConsent,{request:{...request,codeRequired},busy:false,canConnect:true,now:Date.now(),onConnect(){},onForget(){}}));expect(html).toContain('Code character 1');expect(html).toMatch(/disabled="">Connect this Mac/);
});
it('launch desktop codeRequired false hides boxes and omits userCode',async()=>{
 const legacy={...request,codeRequired:false};const html=renderToStaticMarkup(createElement(DesktopConsent,{request:legacy,busy:false,canConnect:true,now:Date.now(),onConnect(){},onForget(){}}));expect(html).not.toContain('Code character');expect(html).not.toMatch(/disabled="">Connect this Mac/);const send=vi.fn();await approveDesktopRequest(legacy,'seat','',send);expect(send).toHaveBeenCalledWith({action:'approve_desktop',requestId:'request',seatId:'seat'});
});
it('launch catalog trial price works before details and a quote replaces it',()=>{
 expect(trialPriceLine({amountPaise:299900,chargeAmountPaise:353882,period:'monthly'},null)).toBe('₹2,999 + GST (₹3,538.82) per month after the trial');
 expect(trialPriceLine({amountPaise:299900,chargeAmountPaise:353882,period:'monthly'},{baseAmountPaise:10000,amountPaise:11800,period:'monthly'})).toBe('₹100 + GST (₹118) per month after the trial');expect(trialPriceLine(null,null)).toBe('Price unavailable');
});
it('launch homepage requests demos only while preserving Netlify registration',()=>{
 for(const path of ['published-home/index.html','public/__forms.html']){const html=readFileSync(new URL('../'+path,import.meta.url),'utf8');expect(html).toContain('name="morrow-beta"');expect(html).toContain('name="request"');expect(html).toContain('value="Book a demo"');expect(html).not.toContain('Join the beta');}
 const html=readFileSync(new URL('../published-home/index.html',import.meta.url),'utf8');expect(html).toContain('Want a walkthrough? Book a demo.');expect(html).not.toContain('Beta &amp; demos');expect(html).toContain("We'll reply by email to set a time.");
});
