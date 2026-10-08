import { licensingFunctionsBase } from "./supabase-browser";
import { z } from "zod";

export type BillingPlan = {
  id: string; code: string; name: string; audience: "personal" | "company";
  period: "monthly" | "yearly"; amountPaise: number; currency: "INR";
  minimumQuantity: number; chargeAmountPaise?: number; gstDiscountAvailable?: boolean;
};

const billingCatalogSchema = z.object({
  mode: z.enum(["test", "live"]),
  plans: z.array(z.object({
    id: z.string().min(1), code: z.string().min(1), name: z.string().min(1),
    audience: z.enum(["personal", "company"]), period: z.enum(["monthly", "yearly"]),
    amountPaise: z.number().int().nonnegative(), currency: z.literal("INR"),
    minimumQuantity: z.number().int().positive(),
    chargeAmountPaise: z.number().int().nonnegative().optional(),
    gstDiscountAvailable: z.boolean().optional(),
  })),
});

export function parseBillingCatalog(value: unknown): { plans: BillingPlan[]; mode: "test" | "live" } {
  const result = billingCatalogSchema.safeParse(value);
  if (!result.success) throw new Error("Morrow's plan service returned an unreadable response. Try again later.");
  return result.data;
}

export function parsePendingPayment(value: unknown): { desktopRequest: string } | null {
  const result = z.object({ desktopRequest: z.union([z.literal(""), z.uuidv4()]) }).safeParse(value);
  return result.success ? result.data : null;
}

export type BillingAccount = {
  id: string; kind: "personal" | "company"; name: string; billing_email: string;
  owner_user_id: string; created_at: string;
};

export type BillingSubscription = {
  id: string; account_id: string; plan_id: string; razorpay_subscription_id: string | null;
  access_source?: "payment" | "admin_coupon";
  status: string; quantity: number; scheduled_quantity: number | null;
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
  accounts: BillingAccount[]; subscriptions: BillingSubscription[];
  seats: BillingSeat[]; payments: BillingPayment[];
};

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
    const result = await response.json().catch(() => null);
    if (controller.signal.aborted) throw new Error("Request timed out.");
    if (!response.ok) throw new Error(result?.error?.message || "Morrow billing could not complete this request.");
    if (result === null || typeof result !== "object") throw new Error("Morrow billing returned an unreadable response. Refresh your subscription to check its status.");
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
