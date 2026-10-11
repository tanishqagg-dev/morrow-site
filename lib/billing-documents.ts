export type GstDocument = {
  id: string; subscriptionId: string; kind: "tax_invoice" | "credit_note";
  status: "issued" | "not_configured" | "billing_details_required" | "failed";
  errorCode: "GST_DOCUMENT_FAILED" | null;
  number: string | null; issuedOn: string; issuedAt: string | null;
  amountPaise: number; currency: "INR"; amountInWords: string; paidAt: string; paymentId: string;
  buyer: {kind: "consumer" | "business"; name: string | null; stateCode?: string; stateName: string | null;
    gstin?: string; businessName?: string; address?: string; postalCode?: string};
  supplier: {legalName: string; gstin: string; address: string; stateCode: string; stateName: string; sacCode: string; gstRateBps: number} | null;
  printable: boolean; url: null; description: string; quantity: number;
  placeOfSupply?: {stateCode: string; stateName: string}; sacCode?: string; gstRateBps?: number; reverseCharge?: false;
  listPricePaise?: number; discountPaise?: number; taxableValuePaise?: number; cgstPaise?: number; sgstPaise?: number; igstPaise?: number;
  refundId?: string; refundReason?: string; originalInvoiceNumber?: string; originalInvoiceDate?: string;
};
export type GatewayReceipt = {id: string; number: string | null; status: string; amountPaise: number; paidAt: string | null; url: string | null};
export type BillingDocumentsReply = {invoices: GstDocument[]; receipts: GatewayReceipt[]; receiptsStatus: "available" | "unavailable"};

export async function printGstDocument(document: GstDocument, loadHtml: () => Promise<string>, isCurrent = () => true) {
  if (document.status !== "issued" || !document.printable) throw new Error("This document is not ready to print. Contact support if you need help.");
  if (!isCurrent()) throw new Error("Your account changed. Load your documents again.");
  // Reserve synchronously in the click handler, before fetching the private HTML.
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Allow pop-ups for this site, then choose Print or save as PDF again.");
  popup.opener = null;
  let url: string | null = null;
  try {
    popup.document.title = "Morrow document";
    popup.document.body.textContent = "Preparing your document…";
    const html = await loadHtml();
    if (!isCurrent() || popup.closed) throw new Error("Your account changed or the document window closed. Load your documents again.");
    if (!/<head(?:\s[^>]*)?>/i.test(html)) throw new Error("The printable document could not be read. Try again.");
    // Blob navigation does not preserve the server's CSP response header.
    const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">';
    const protectedHtml = html.replace(/<head(?:\s[^>]*)?>/i, head => head + csp);
    url = URL.createObjectURL(new Blob([protectedHtml], {type: "text/html;charset=utf-8"}));
    const objectUrl = url;
    popup.onload = () => {
      if (popup.location.href !== objectUrl) return;
      if (!isCurrent()) { popup.close(); URL.revokeObjectURL(objectUrl); return; }
      popup.focus(); popup.print(); URL.revokeObjectURL(objectUrl);
      popup.onload = null;
    };
    popup.location.replace(objectUrl);
  } catch (error) {
    if (url) URL.revokeObjectURL(url);
    popup.close(); throw error;
  }
}
