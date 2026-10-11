import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {expect,it,vi} from 'vitest';
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {SignInAgainStep} from '../components/SignInAgainStep';
import {SignInAgainRequired,BillingError} from '../lib/billing';
import {readSignInIntent,makeSignInIntent,signInIntentUrl,isImmediateSignInRepeat} from '../lib/sign-in-intent';
const source=readFileSync(new URL('../components/BillingPortal.tsx',import.meta.url),'utf8');
function execute(start:string,end:string,suffix:string,bindings:Record<string,unknown>){const begin=source.indexOf(start);const js=ts.transpileModule(source.slice(begin,source.indexOf(end,begin))+suffix,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;return new Function(...Object.keys(bindings),js)(...Object.values(bindings));}
const intent={body:{action:'cancel' as const,subscriptionId:'subscription'},accountId:'account',userId:'user'};
it('launch returning intent opens cancellation confirmation without a mutation',()=>{
 const setConfirmCancel=vi.fn(),setSignInStep=vi.fn(),setSelectedAccountId=vi.fn(),mutate=vi.fn();const url=signInIntentUrl('/subscribe',{...intent,attemptedAt:Date.now()});const returnedIntent={current:null};
 const begin=source.indexOf('  useEffect(() => {',source.indexOf('const returnedIntent ='));
 const effect=ts.transpileModule(source.slice(begin,source.indexOf('  const clearSignInIntent',begin)),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const bindings={signedIn:true,snapshot:{accounts:[{id:'account'}]},readSignInIntent,window:{location:{search:new URL(url,'https://morrow.test').search}},returnedIntent,identity:{userId:'user'},setSelectedAccountId,setManageAccount:vi.fn(),setConfirmCancel,setSeats:vi.fn(),setSeatEmail:vi.fn(),setSignInStep,useEffect:(fn:()=>void)=>fn(),mutate};
 new Function(...Object.keys(bindings),effect)(...Object.values(bindings));
 expect(setConfirmCancel).toHaveBeenCalledWith(true);expect(setSelectedAccountId).toHaveBeenCalledWith('account');expect(setSignInStep).toHaveBeenCalledWith({intent:{...intent,attemptedAt:expect.any(Number)},mode:'confirm'});expect(mutate).not.toHaveBeenCalled();
});
it('launch sensitive cancel creates the sign-in step and an immediate repeat creates support',async()=>{
 const mutate=vi.fn().mockRejectedValue(new SignInAgainRequired()),setSignInStep=vi.fn(),returnedIntent:{current:typeof intent & {attemptedAt?:number}|null}={current:null};const action=execute('  const sensitiveMutation =','  const signIn =','\nreturn sensitiveMutation;',{activeUserId:{current:'user'},identityRef:{current:{sensitiveMutation:mutate}},selectedAccountRef:{current:'account'},SignInAgainRequired,makeSignInIntent,returnedIntent,setSignInStep,isImmediateSignInRepeat,isReverificationHint:()=>false});
 await expect(action(intent.body)).rejects.toBeInstanceOf(SignInAgainRequired);expect(setSignInStep.mock.lastCall?.[0]).toMatchObject({intent,mode:'sign-in'});returnedIntent.current={...intent,attemptedAt:Date.now()};await expect(action(intent.body)).rejects.toBeInstanceOf(SignInAgainRequired);expect(setSignInStep.mock.lastCall?.[0]).toMatchObject({mode:'support'});
});
it('launch support step offers Try again and contact without another sign-in button',()=>{
 const html=renderToStaticMarkup(createElement(SignInAgainStep,{intent,mode:'support',busy:false,onSignIn(){},onConfirm(){},onDismiss(){}}));expect(html).toContain('Try again');expect(html).toContain('Contact support');expect(html).not.toContain('>Sign in again<');
});
it('launch DEVICE_CODE_REQUIRED restores code entry with the backend message',async()=>{
 const message='Enter the code shown in Morrow. Download the latest Morrow if your Mac shows no code.';const setDesktopDetails=vi.fn(),setDesktopProblem=vi.fn(),setCodeReset=vi.fn();const approve=execute('  const approveDesktop =','  const connectAfterPayment =','\nreturn approveDesktop;', {desktopDetails:{id:'request',codeRequired:false},connectionLock:{current:false},activeUserId:{current:'user'},setDesktopConnecting:vi.fn(),setDesktopProblem,approveDesktopRequest:vi.fn().mockRejectedValue(new BillingError(message,'DEVICE_CODE_REQUIRED')),BillingError,setDesktopDetails,setCodeReset,authToken:vi.fn(),sensitiveMutation:vi.fn(),billingRequest:vi.fn(),returnedIntent:{current:null}});
 await approve({id:'seat'},'');expect(setDesktopDetails.mock.calls[0][0]({codeRequired:false})).toMatchObject({codeRequired:true});expect(setDesktopProblem).toHaveBeenCalledWith(message);expect(setCodeReset).toHaveBeenCalledOnce();
});
it('launch sign-in-again button signs out through Clerk with the intent redirect',async()=>{
 const signOut=vi.fn(),window={location:{href:'https://morrow.test/subscribe'}};
 const action=execute('  const signInAgain =','  const confirmReturnedAction =','\nreturn signInAgain;', {signInStep:{intent,mode:'sign-in'},identity:{signOut},signInIntentUrl,window,run:(_name:string,fn:()=>Promise<void>)=>fn()});
 await action();expect(signOut).toHaveBeenCalledOnce();const redirect=signOut.mock.calls[0][0];expect(readSignInIntent(new URL(redirect,'https://morrow.test').search)).toMatchObject({...intent,attemptedAt:expect.any(Number)});expect(redirect).toContain('#sign-in');
});
