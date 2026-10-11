import { licensingFunctionsBase } from "./supabase-browser";
import type { InvoiceProfile } from "./invoice-profile";
import { z } from "zod";

export type BillingPlan = {
  id: string; code: string; name: string; audience: "personal" | "company";
  period: "monthly" | "yearly"; amountPaise: number; currency: "INR";
  minimumQuantity: number; chargeAmountPaise?: number; gstDiscountAvailable?: boolean;
};

export type BillingTrial = { enabled: boolean; days: number; eligible?: boolean; reason?: null | "used" | "subscribed" | "disabled" };
const trialSchema = z.object({ enabled: z.boolean(), days: z.number().int().min(1).max(30),
  eligible: z.boolean().optional(), reason: z.enum(["used", "subscribed", "disabled"]).nullable().optional() });
const trialOff = { enabled: false, days: 7 };

const billingCatalogSchema = z.object({
  mode: z.enum(["test", "live"]),
  betaInviteRequired: z.boolean().optional().default(false),
  trial: trialSchema.optional().catch(undefined),
  plans: z.array(z.object({
    id: z.string().min(1), code: z.string().min(1), name: z.string().min(1),
    audience: z.enum(["personal", "company"]), period: z.enum(["monthly", "yearly"]),
    amountPaise: z.number().int().nonnegative(), currency: z.literal("INR"),
    minimumQuantity: z.number().int().positive(),
    chargeAmountPaise: z.number().int().nonnegative().optional(),
    gstDiscountAvailable: z.boolean().optional(),
  })),
});

export function parseBillingCatalog(value: unknown): { plans: BillingPlan[]; mode: "test" | "live"; betaInviteRequired: boolean; trial: BillingTrial } {
  const result = billingCatalogSchema.safeParse(value);
  if (!result.success) throw new Error("Morrow's plan service returned an unreadable response. Try again later.");
  return { ...result.data, trial: result.data.trial ?? trialOff };
}

export type PendingPayment = { desktopRequest: string; subscriptionId?: string; startedAt?: number; requestId?: string; userId?: string; expiresAt?: number };
export function parsePendingPayment(value: unknown): PendingPayment | null {
  const result = z.object({ desktopRequest: z.union([z.literal(""), z.uuidv4()]),
    subscriptionId: z.string().min(1).max(128).optional(),
    requestId: z.uuidv4().optional(), userId: z.string().min(1).max(128).optional(),
    expiresAt: z.number().finite().positive().optional(),
    startedAt: z.number().finite().nonnegative().max(Date.now()).optional(),
  }).safeParse(value);
  return result.success ? result.data : null;
}

export function clearPendingAuthorizations(storage: Pick<Storage, "length" | "key" | "removeItem">, userId: string) {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key?.startsWith(`morrow:payment-pending:${userId}:`)) keys.push(key);
  }
  keys.forEach(key => storage.removeItem(key));
}

export type BillingAccount = {
  id: string; kind: "personal" | "company"; name: string; billing_email: string;
  owner_user_id: string; created_at: string; invoice_profile?: InvoiceProfile | null; invoice_recipient_name?: string | null;
};

const subscriptionStatusSchema = z.enum(["creating", "created", "authenticated", "active", "pending", "halted", "paused", "cancelled", "completed", "expired", "trialing", "trial_canceled", "unknown"]).catch("unknown");
export type BillingSubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type BillingSubscription = {
  id: string; account_id: string; plan_id: string; razorpay_subscription_id: string | null;
  access_source?: "payment" | "admin_coupon" | "trial";
  trial_ends_at?: string | null;
  payment_method?: string | null;
  payment_method_source?: "captured_payment" | "provider_fetch";
  payment_method_payment_id?: string | null;
  payment_method_verified_at?: string | null;
  status: BillingSubscriptionStatus; quantity: number; scheduled_quantity: number | null;
  paid_until: string | null; cancel_at_period_end: boolean;
  plan: { name: string; period: string; amount_paise: number; charge_amount_paise?: number };
};

export type BillingSeat = {
  id: string; account_id: string; email: string; hasLicense: boolean;
  licenseId: string | null; licenseStatus: string | null; expiresAt: string | null;
};

export type BillingPayment = {
  id: string; subscription_id: string; razorpay_payment_id: string;
  amount_paise: number; currency: string; status: string; paid_at: string;
};

export type BillingSnapshot = {
  betaInviteRequired?: boolean;
  trial?: BillingTrial;
  accounts: BillingAccount[]; subscriptions: BillingSubscription[];
  seats: BillingSeat[]; payments: BillingPayment[];
};

export const checkoutReplySchema = z.object({
  subscriptionId: z.string().min(1), keyId: z.string().min(1), email: z.string(), name: z.string(),
  paymentMethod: z.enum(["upi", "card"]).optional(),
  trialEndsAt: z.iso.datetime({ offset: true }).nullable().optional().default(null),
  trialAuthorizationExpiresAt: z.iso.datetime({ offset: true }).nullable().optional().default(null),
  chargeAmountPaise: z.number().int().nonnegative().optional(),
  amountPaise: z.number().int().nonnegative().optional(),
});
export type CheckoutReply = z.infer<typeof checkoutReplySchema>;
export function parseCheckoutReply(value: unknown): CheckoutReply {
  const result = checkoutReplySchema.safeParse(value);
  if (!result.success) throw new Error("Checkout returned unreadable billing details. Check your account before trying again.");
  return result.data;
}
export function parseBillingSnapshot(value: unknown): BillingSnapshot {
  const result = z.object({ accounts: z.array(z.any()), seats: z.array(z.any()), payments: z.array(z.any()),
    subscriptions: z.array(z.object({ status: subscriptionStatusSchema, trial_ends_at: z.iso.datetime({ offset: true }).nullable().optional().catch(null),
      access_source: z.enum(["payment", "admin_coupon", "trial"]).optional() }).passthrough()),
    betaInviteRequired: z.boolean().optional().default(false), trial: trialSchema.optional().catch(undefined),
  }).safeParse(value);
  if (!result.success) throw new Error("Your account returned unreadable billing details. Try refreshing your account.");
  return { ...result.data, trial: result.data.trial ?? trialOff } as BillingSnapshot;
}
export function isReverificationHint(value: unknown): boolean {
  const hint = value as { clerk_error?: { type?: string; reason?: string } } | null;
  return hint?.clerk_error?.type === "forbidden" && hint.clerk_error.reason === "reverification-error";
}
export class BillingError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

export function paidSeatForAccount(snapshot: BillingSnapshot, accountId: string, email: string | null, now = Date.now()) {
  const paid = snapshot.subscriptions.some((subscription) => subscription.account_id === accountId
    && subscription.paid_until && Date.parse(subscription.paid_until) > now);
  if (!paid || !email) return undefined;
  return snapshot.seats.find((seat) => seat.account_id === accountId
    && seat.email.toLowerCase() === email.toLowerCase() && seat.licenseStatus !== "revoked");
}

export function rupees(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: paise % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(paise / 100);
}

export async function billingRequest<T>(functionName: string, body?: object, token?: string): Promise<T> {
  const base = licensingFunctionsBase();
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (!base || !apikey) throw new Error("Morrow billing is not connected on this site yet.");
  const controller = new AbortController();
  // Snapshot recovery can make several bounded gateway calls. Allow those to finish.
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(`${base}/${functionName}`, {
      method: body ? "POST" : "GET",
      headers: { apikey, ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (response.ok && functionName === "billing-customer" && (body as {action?: string; format?: string})?.action === "invoices" && (body as {format?: string})?.format === "html") {
      if (!response.headers.get("content-type")?.toLowerCase().startsWith("text/html")) throw new Error("The printable document returned an unreadable response. Try again.");
      const html = await response.text();
      if (controller.signal.aborted) throw new Error("Request timed out.");
      return html as T;
    }
    const result = await response.json().catch(() => null);
    if (controller.signal.aborted) throw new Error("Request timed out.");
    if (response.status === 403 && isReverificationHint(result)) return result as T;
    if (!response.ok) throw new BillingError(result?.error?.message || "Morrow billing could not complete this request.", result?.error?.code);
    if (result === null || typeof result !== "object") throw new Error("Morrow billing returned an unreadable response. Refresh your subscription to check its status.");
    if (functionName === "billing-customer" && (body as { action?: string })?.action === "snapshot") return parseBillingSnapshot(result) as T;
    return result as T;
  } catch (error) {
    // Never replay a mutation automatically: the server may have completed it.
    if (controller.signal.aborted) throw new Error("Billing is taking too long. Refresh your subscription to check its status before trying another payment.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

type RazorpayCheckout = {
  open(): void;
  on(event: string, callback: (value: unknown) => void): void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

let checkoutScript: Promise<void> | null = null;
export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScript) return checkoutScript;
  checkoutScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    const finish = (error?: Error) => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) { script.remove(); reject(error); }
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error("Razorpay checkout took too long to load. Check your connection and retry.")), 20_000);
    script.onload = () => finish(window.Razorpay ? undefined : new Error("Razorpay checkout did not load."));
    script.onerror = () => finish(new Error("Razorpay checkout could not be loaded. Check your connection and retry."));
    document.head.appendChild(script);
  }).catch((error) => { checkoutScript = null; throw error; });
  return checkoutScript;
}

export function billingQuote(basePaise: number, quantity = 1, chargePaise?: number) {
  const base = basePaise * quantity;
  const total = (chargePaise ?? basePaise + Math.round(basePaise * 18 / 100)) * quantity;
  return { base, gst: total - base, total };
}

// The backend introductory amount is the inclusive total for the whole subscription.
export function firstPaymentQuote(total: number) {
  const gst = Math.round(total * 18 / 118);
  return { base: total - gst, gst, total };
}
