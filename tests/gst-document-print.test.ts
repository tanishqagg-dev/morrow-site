import {afterEach,describe,expect,it,vi} from 'vitest';
import {printGstDocument} from '../lib/billing-documents';
import type {GstDocument} from '../lib/billing-documents';
afterEach(()=>vi.unstubAllGlobals());
const document={id:'doc-test',subscriptionId:'sub-test',status:'issued',printable:true} as GstDocument;
function fixture(){
 const popup={opener:'old',closed:false,document:{title:'',body:{textContent:''}},location:{href:'about:blank',replace:vi.fn(function(this:any,url:string){this.href=url;})},close:vi.fn(),focus:vi.fn(),print:vi.fn(),onload:null as null|(()=>void)};
 const open=vi.fn(()=>popup);vi.stubGlobal('window',{open});
 const createObjectURL=vi.fn((_blob:Blob)=> 'blob:https://site.example/document-test');const revokeObjectURL=vi.fn();vi.stubGlobal('URL',{createObjectURL,revokeObjectURL});
 return {popup,open,createObjectURL,revokeObjectURL};
}
describe('MONEY-06 private document print window',()=>{
 it('reserves a window on click and displays CSP-protected Unicode HTML with no opener',async()=>{
  const f=fixture();let resolve!:(html:string)=>void;const load=vi.fn(()=>new Promise<string>(done=>{resolve=done;}));
  const task=printGstDocument(document,load);expect(f.open).toHaveBeenCalledOnce();expect(f.popup.opener).toBeNull();expect(f.popup.document.body.textContent).toContain('Preparing');
  resolve('<!doctype html><html><head></head><body>अनन्या</body></html>');await task;
  const blob=f.createObjectURL.mock.calls[0][0] as unknown as Blob;expect(await blob.text()).toContain('अनन्या');expect(await blob.text()).toContain('Content-Security-Policy');expect(await blob.text()).toContain("default-src 'none'");
  expect(f.popup.print).not.toHaveBeenCalled();f.popup.onload!();expect(f.popup.print).toHaveBeenCalledOnce();expect(f.revokeObjectURL).toHaveBeenCalledOnce();
 });
 it.each(['not_configured','billing_details_required'])('never fetches or opens %s',async status=>{
  const f=fixture();const load=vi.fn();await expect(printGstDocument({...document,status} as GstDocument,load)).rejects.toThrow('not ready');expect(load).not.toHaveBeenCalled();expect(f.open).not.toHaveBeenCalled();
 });
 it('does not start a fetch when popups are blocked',async()=>{
  const f=fixture();f.open.mockReturnValue(null as any);const load=vi.fn();await expect(printGstDocument(document,load)).rejects.toThrow('Allow pop-ups');expect(load).not.toHaveBeenCalled();
 });
 it('closes the empty window on fetch failure or account change without exposing another account document',async()=>{
  for(const changed of [false,true]){
   const f=fixture();let current=true;const load=vi.fn(async()=>{if(!changed)throw new Error('Offline');current=false;return '<html><head></head><body>Private</body></html>';});
   await expect(printGstDocument(document,load,()=>current)).rejects.toThrow();expect(f.popup.close).toHaveBeenCalledOnce();expect(f.createObjectURL).not.toHaveBeenCalled();
  }
 });
});
