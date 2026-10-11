import {afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('../lib/supabase-browser',()=>({licensingFunctionsBase:()=> 'https://billing.example/functions/v1'}));
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('MONEY-06 authenticated GST HTML',()=>{
 it('fetches HTML through a bearer POST without a token in the URL',async()=>{
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','public-test-key');
  const html='<!doctype html><html><head><title>Invoice</title></head><body>अनन्या</body></html>';
  const fetch=vi.fn().mockResolvedValue(new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}}));vi.stubGlobal('fetch',fetch);
  const {billingRequest}=await import('../lib/billing');
  const body={action:'invoices',subscriptionId:'sub-test',documentId:'document-test',format:'html'};
  await expect(billingRequest<string>('billing-customer',body,'test-session-token')).resolves.toBe(html);
  expect(fetch).toHaveBeenCalledWith('https://billing.example/functions/v1/billing-customer',expect.objectContaining({method:'POST',cache:'no-store',body:JSON.stringify(body),headers:expect.objectContaining({Authorization:'Bearer test-session-token'})}));
 });
 it.each([[404,'INVOICE_NOT_FOUND'],[503,'GST_INVOICE_NOT_CONFIGURED']])('keeps the %s server error for unprintable documents',async(status,code)=>{
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','public-test-key');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:{code,message:'Document unavailable'}},{status})));
  const {billingRequest}=await import('../lib/billing');
  await expect(billingRequest('billing-customer',{action:'invoices',format:'html'},'test-token')).rejects.toMatchObject({code});
 });
});
