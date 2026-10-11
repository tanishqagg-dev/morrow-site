export type InvoiceDetails = { businessName: string; gstin: string; address: string; stateCode: string; postalCode: string };
export type InvoiceProfile = { kind: "consumer"; stateCode: string } | ({ kind: "business" } & InvoiceDetails);
// Current GST state codes: https://docs.ewaybillgst.gov.in/apidocs/state-code.html
export const gstStates = [
  ["01", "Jammu and Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"], ["04", "Chandigarh"],
  ["05", "Uttarakhand"], ["06", "Haryana"], ["07", "Delhi"], ["08", "Rajasthan"], ["09", "Uttar Pradesh"],
  ["10", "Bihar"], ["11", "Sikkim"], ["12", "Arunachal Pradesh"], ["13", "Nagaland"], ["14", "Manipur"],
  ["15", "Mizoram"], ["16", "Tripura"], ["17", "Meghalaya"], ["18", "Assam"], ["19", "West Bengal"],
  ["20", "Jharkhand"], ["21", "Odisha"], ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"], ["24", "Gujarat"],
  ["26", "Dadra and Nagar Haveli and Daman and Diu"], ["27", "Maharashtra"], ["29", "Karnataka"], ["30", "Goa"],
  ["31", "Lakshadweep"], ["32", "Kerala"], ["33", "Tamil Nadu"], ["34", "Puducherry"],
  ["35", "Andaman and Nicobar Islands"], ["36", "Telangana"], ["37", "Andhra Pradesh"], ["38", "Ladakh"], ["97", "Other Territory"],
] as const;
const empty = (): InvoiceDetails => ({ businessName: "", gstin: "", address: "", stateCode: "", postalCode: "" });
export function invoiceFormFromProfile(profile?: Partial<InvoiceProfile> | null) {
  const businessInvoice = profile?.kind === "business" || (!profile?.kind && Boolean((profile as Partial<InvoiceDetails>)?.gstin));
  const details = { ...empty(), ...profile } as InvoiceDetails;
  // Consumer profiles never restore business details.
  return { businessInvoice, details: businessInvoice ? details : { ...empty(), stateCode: profile?.stateCode || "" } };
}
export function invoiceProfileForCheckout(business: boolean, details: Partial<InvoiceDetails>): InvoiceProfile {
  if (!gstStates.some(([code]) => code === details.stateCode)) throw new Error("Choose your state before continuing to checkout.");
  if (!business) return { kind: "consumer", stateCode: details.stateCode! };
  if (!details.gstin || details.gstin.slice(0, 2) !== details.stateCode) throw new Error("Your state must match the first two digits of your GSTIN.");
  if (!details.businessName?.trim() || !details.address?.trim() || !/^[0-9]{6}$/.test(details.postalCode || "")) throw new Error("Complete your business name, billing address and six-digit PIN code.");
  return { kind: "business", ...empty(), ...details };
}

export function invoiceRecipientFromAccount(account?: {invoice_recipient_name?: string | null; name?: string} | null) {
  return account?.invoice_recipient_name?.trim() || "";
}
export function invoiceRecipientNameForCheckout(value: string) {
  const name = value.trim();
  if (name.length < 2 || name.length > 160) throw new Error("Enter your name using 2 to 160 characters.");
  return name;
}
