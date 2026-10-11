"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise, ArrowRight, CheckCircle, CreditCard, Receipt, UsersThree } from "@phosphor-icons/react";
import { billingRequest, rupees } from "@/lib/billing";
import styles from "./BillingAdmin.module.css";

type Plan = {
  id: string; code: string; name: string; audience: "personal" | "company";
  period: "monthly" | "yearly"; amount_paise: number; minimum_quantity: number;
  total_amount_paise?: number | null; charge_amount_paise?: number; coupon_only?: boolean; razorpay_plan_id: string | null; status: "draft" | "published" | "archived";
};
type Account = { id: string; kind: string; name: string; billing_email: string; created_at: string };
type Subscription = { id: string; account_id: string; plan_id: string; access_source?: string; status: string; quantity: number; paid_until: string | null; cancel_at_period_end: boolean };
type Payment = { id: string; subscription_id: string; razorpay_payment_id: string; amount_paise: number; status: string; paid_at: string };
type Refund = { id: string; payment_id: string; amount_paise: number; status: string; reason: string; created_at: string };
type Seat = { id: string; account_id: string; email: string; license_id: string | null };
type Audit = { id: number; occurred_at: string; actor_user_id: string | null; actor_customer_id: string | null; action: string; subject_id: string | null };
type Coupon = { id: string; code: string; base_plan_id: string; discount_plan_id: string | null; access_days?: number | null; first_charge_paise?: number | null; active: boolean; expires_at: string; max_redemptions: number; redemptions: number };
type Snapshot = { role: "owner" | "operator" | "auditor"; gateway: { mode: "test" | "live"; apiConfigured: boolean; webhookConfigured: boolean }; coupons?: Coupon[]; plans: Plan[]; accounts: Account[]; subscriptions: Subscription[]; payments: Payment[]; refunds: Refund[]; seats: Seat[]; audit: Audit[] };
type Tab = "overview" | "plans" | "coupons" | "customers" | "payments" | "audit";

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Not available";
}

function errorText(error: unknown) { return error instanceof Error ? error.message : "Could not complete the action."; }

export function BillingAdmin({ token }: { token: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponBase, setCouponBase] = useState("");
  const [couponKind, setCouponKind] = useState<"discount" | "access">("discount");
  const [accessDays, setAccessDays] = useState(30);
  const [couponPrice, setCouponPrice] = useState("");
  const [couponRemote, setCouponRemote] = useState("");
  const [couponExpiry, setCouponExpiry] = useState("");
  const [couponLimit, setCouponLimit] = useState(100);
  const [planId, setPlanId] = useState("");
  const [planName, setPlanName] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [audience, setAudience] = useState<"personal" | "company">("personal");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [price, setPrice] = useState("");
  const [minimumQuantity, setMinimumQuantity] = useState(1);
  const [remotePlanId, setRemotePlanId] = useState("");
  const [publish, setPublish] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [recoveryRequestId, setRecoveryRequestId] = useState("");
  const [recoverySubscriptionId, setRecoverySubscriptionId] = useState("");

  const activeToken = useRef(token);
  activeToken.current = token;
  const refreshSequence = useRef(0);
  const actionLock = useRef<object | null>(null);
  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const stillCurrent = () => token === activeToken.current && sequence === refreshSequence.current;
    try {
      const next = await billingRequest<Snapshot>("billing-admin", { action: "snapshot" }, token);
      if (stillCurrent()) setSnapshot(next);
    } catch (caught) { if (stillCurrent()) throw caught; }
  }, [token]);

  useEffect(() => {
    activeToken.current = token;
    actionLock.current = null;
    setSnapshot(null); setBusy(""); setError(""); setNotice("");
    void refresh().catch((caught) => { if (activeToken.current === token) setError(errorText(caught)); });
    return () => { activeToken.current = ""; };
  }, [token, refresh]);

  const run = async (name: string, task: (stillCurrent: () => boolean) => Promise<void>) => {
    if (actionLock.current || token !== activeToken.current) return;
    const lock = {};
    actionLock.current = lock;
    const stillCurrent = () => token === activeToken.current && actionLock.current === lock;
    setBusy(name); setError(""); setNotice("");
    try { await task(stillCurrent); }
    catch (caught) { if (stillCurrent()) setError(errorText(caught)); }
    finally {
      if (stillCurrent()) setBusy("");
      if (actionLock.current === lock) actionLock.current = null;
    }
  };

  const subscriptions = snapshot?.subscriptions || [];
  const activeSubscriptions = subscriptions.filter((item) => item.paid_until && new Date(item.paid_until).getTime() > Date.now());
  const committedMonthly = useMemo(() => activeSubscriptions.reduce((total, subscription) => {
    if (subscription.access_source === "admin_coupon") return total;
    const plan = snapshot?.plans.find((item) => item.id === subscription.plan_id);
    return total + (plan ? Math.round(plan.amount_paise * subscription.quantity / (plan.period === "yearly" ? 12 : 1)) : 0);
  }, 0), [activeSubscriptions, snapshot]);

  const choosePlan = (plan: Plan) => {
    setPlanId(plan.id); setPlanCode(plan.code); setPlanName(plan.name);
    setAudience(plan.audience); setPeriod(plan.period); setPrice(String(plan.amount_paise / 100));
    setMinimumQuantity(plan.minimum_quantity); setRemotePlanId(plan.razorpay_plan_id || "");
    setPublish(plan.status === "published"); setTab("plans");
    document.getElementById("billing-plan-editor")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const savePlan = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run("plan", async (stillCurrent) => {
      await billingRequest("billing-admin", { action: "save_plan", id: planId || undefined,
        code: planCode, name: planName, audience, period, amountPaise: Math.round(Number(price) * 100),
        minimumQuantity, razorpayPlanId: remotePlanId || null, publish,
        totalAmountPaise: snapshot?.plans.find(plan => plan.id === planId)?.total_amount_paise ?? null,
      }, token);
      if (!stillCurrent()) return;
      await refresh();
      if (stillCurrent()) setNotice(publish ? "Plan published after Razorpay validation." : "Plan saved as a draft or archived.");
    });
  };

  const createCoupon = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run("coupon", async (stillCurrent) => {
      await billingRequest("billing-admin", { action: couponKind === "access" ? "create_access_coupon" : "create_coupon", code: couponCode, basePlanId: couponBase, accessDays: couponKind === "access" ? accessDays : undefined,
        amountPaise: Math.round(Number(couponPrice) * 100), razorpayPlanId: couponRemote,
        expiresAt: new Date(couponExpiry).toISOString(), maxRedemptions: couponLimit }, token);
      if (!stillCurrent()) return;
      await refresh();
      if (!stillCurrent()) return;
      setCouponCode(""); setNotice(couponKind === "access" ? `Admin coupon created. Access expires ${accessDays} days after redemption.` : "Coupon created. Its recurring price was verified with Razorpay.");
    });
  };
  const disableCoupon = (id: string) => {
    void run("coupon", async (stillCurrent) => {
      await billingRequest("billing-admin", { action: "disable_coupon", id }, token);
      if (!stillCurrent()) return;
      await refresh();
      if (stillCurrent()) setNotice("Coupon closed to new reservations. Existing subscriptions keep their price.");
    });
  };

  const refund = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (actionLock.current) return;
    const payment = snapshot?.payments.find((item) => item.id === paymentId);
    if (!payment) return;
    const amountPaise = Math.round(Number(refundAmount) * 100);
    if (!window.confirm(`Issue a ${rupees(amountPaise)} refund for ${payment.razorpay_payment_id}?`)) return;
    void run("refund", async (stillCurrent) => {
      await billingRequest("billing-admin", { action: "refund", paymentId, refundAmountPaise: amountPaise, reason: refundReason }, token);
      if (!stillCurrent()) return;
      await refresh();
      if (!stillCurrent()) return;
      setRefundReason(""); setNotice("Refund request sent to Razorpay. Check its status below.");
    });
  };

  const cancelCustomer = (subscription: Subscription, accountName: string) => {
    if (actionLock.current) return;
    if (!window.confirm(`Cancel the next renewal for ${accountName}? Paid access continues through the current term.`)) return;
    void run(`cancel-${subscription.id}`, async (stillCurrent) => {
      await billingRequest("billing-admin", { action: "cancel_customer", subscriptionId: subscription.id }, token);
      if (!stillCurrent()) return;
      await refresh();
      if (stillCurrent()) setNotice(`Renewal cancellation scheduled for ${accountName}.`);
    });
  };

  const recoverCheckout = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (snapshot?.role !== "owner" || busy) return;
    void run("recover-checkout", async (stillCurrent) => {
      await billingRequest("billing-admin", { action: "recover_checkout",
        requestId: recoveryRequestId.trim(), razorpaySubscriptionId: recoverySubscriptionId.trim(),
      }, token);
      if (!stillCurrent()) return;
      await refresh();
      if (!stillCurrent()) return;
      setRecoveryRequestId(""); setRecoverySubscriptionId("");
      setNotice("Existing checkout recovered. Payment and access still require verification. No new charge was created.");
    });
  };

  return <section className={styles.admin} aria-labelledby="billing-admin-title">
    <div className={styles.masthead}><div><p>MORROW / BILLING</p><h2 id="billing-admin-title">Access, money, people.</h2></div>
      <button onClick={() => void refresh().catch((caught) => setError(errorText(caught)))}><ArrowClockwise /> Refresh</button></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <nav className={styles.tabs} aria-label="Billing administration">{(["overview", "plans", "coupons", "customers", "payments", "audit"] as const).map((item) =>
      <button key={item} aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)}>{item}</button>)}</nav>

    {!snapshot ? <p className={styles.loading}>Loading billing records…</p> : <>
      {tab === "overview" && <div className={styles.overview}>
        <div className={styles.stats}>
          <div><UsersThree /><small>PAID ACCOUNTS</small><strong>{new Set(activeSubscriptions.map((item) => item.account_id)).size}</strong></div>
          <div><CheckCircle /><small>PAID SEATS</small><strong>{activeSubscriptions.reduce((sum, item) => sum + item.quantity, 0)}</strong></div>
          <div><CreditCard /><small>MONTHLY RUN RATE</small><strong>{rupees(committedMonthly)}</strong></div>
          <div><Receipt /><small>CAPTURED PAYMENTS</small><strong>{snapshot.payments.length}</strong></div>
        </div>
        <div className={styles.overviewNote}><h3>Connection state</h3><p>Razorpay {snapshot.gateway.mode.toUpperCase()} mode · API {snapshot.gateway.apiConfigured ? "connected" : "not configured"} · webhook secret {snapshot.gateway.webhookConfigured ? "set" : "missing"}. Draft plans cannot take payment. Verified payments update subscription access automatically.</p>
          <button onClick={() => setTab("plans")}>Review plans <ArrowRight /></button></div>
        <div className={styles.recent}><h3>Recent subscriptions</h3>{subscriptions.slice(0, 8).map((item) => {
          const account = snapshot.accounts.find((entry) => entry.id === item.account_id);
          return <div key={item.id}><span>{account?.name || "Unknown account"}</span><strong>{item.quantity} seats</strong><small>{item.status} · paid to {date(item.paid_until)}</small></div>;
        })}</div>
      </div>}

      {tab === "coupons" && <div className={styles.workspace}>
        <div className={styles.ledger}><h3>Coupons</h3><p>Discount coupons set a recurring price. Admin access coupons grant a fixed term without payment. One use per customer; all grants are audited.</p>
          {(snapshot.coupons || []).map((coupon) => <div className={styles.planEntry} key={coupon.id}>
            <span><strong>{coupon.code}</strong><small>{coupon.first_charge_paise ? `${rupees(coupon.first_charge_paise)} first month, then standard renewal` : coupon.access_days ? `${coupon.access_days} days free access` : `${rupees(snapshot.plans.find((plan) => plan.id === coupon.discount_plan_id)?.amount_paise || 0)} per billing period`} · expires {date(coupon.expires_at)}</small></span>
            <span>{coupon.redemptions}/{coupon.max_redemptions} reserved</span>
            {snapshot.role === "owner" && coupon.active ? <button disabled={Boolean(busy)} onClick={() => disableCoupon(coupon.id)}>Disable</button> : <span>{coupon.active ? "Enabled" : "Disabled"}</span>}
          </div>)}
        </div>
        {snapshot.role === "owner" && <form className={styles.editor} onSubmit={createCoupon}>
          <h3>Create a coupon</h3><label>Coupon type<select value={couponKind} onChange={(event) => { setCouponKind(event.target.value as "discount" | "access"); setCouponBase(""); }}><option value="discount">Recurring discount</option><option value="access">Free access for a fixed term</option></select></label><p>{couponKind === "access" ? "Grant full Morrow access for a fixed number of days. No payment or automatic renewal. Each customer can redeem the code once." : "Create the discounted Razorpay plan with the base price plus 18% GST as its total amount. Do not add GST again in Razorpay. The price applies to every renewal."}</p>
          <label>Code<input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} pattern="[A-Z0-9][A-Z0-9_-]{2,31}" required maxLength={32} /></label>
          <label>Base plan<select value={couponBase} onChange={(event) => setCouponBase(event.target.value)} required><option value="">{couponKind === "access" ? "Choose a personal plan" : "Choose a published plan"}</option>{snapshot.plans.filter((plan) => !plan.coupon_only && (couponKind === "access" ? plan.audience === "personal" && plan.status !== "archived" : plan.status === "published")).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.period} · {rupees(plan.amount_paise)}</option>)}</select></label>
          {couponKind === "access" ? <label>Access days after redemption<input type="number" min="1" max="366" value={accessDays} onChange={(event) => setAccessDays(Number(event.target.value))} required /></label> : <><label>Discounted price per seat, INR before GST<input type="number" min="1" step="0.01" value={couponPrice} onChange={(event) => setCouponPrice(event.target.value)} required /></label>
          <label>Discounted Razorpay plan ID<input value={couponRemote} onChange={(event) => setCouponRemote(event.target.value)} pattern="plan_[A-Za-z0-9]{8,32}" required /></label></>}
          <label>Redeem before, your local time<input type="datetime-local" value={couponExpiry} onChange={(event) => setCouponExpiry(event.target.value)} required /></label>
          <label>Maximum reservations<input type="number" min="1" max="100000" value={couponLimit} onChange={(event) => setCouponLimit(Number(event.target.value))} required /></label>
          <button disabled={Boolean(busy)} type="submit">{busy === "coupon" ? "Verifying…" : "Verify and create coupon"}</button>
        </form>}
      </div>}

      {tab === "plans" && <div className={styles.workspace}>
        <div className={styles.ledger}><div className={styles.tableHead}><h3>Plans</h3><span>{snapshot.plans.length} versions</span></div>
          {snapshot.plans.filter((plan) => !plan.coupon_only).map((plan) => <button className={styles.planEntry} key={plan.id} onClick={() => choosePlan(plan)}>
            <span><strong>{plan.name}</strong><small>{plan.code} · {plan.audience} · {plan.period}</small></span>
            <strong>{rupees(plan.amount_paise)}</strong><span className={styles.status} data-state={plan.status}>{plan.status}</span><ArrowRight />
          </button>)}</div>
        {snapshot.role === "owner" && <form className={styles.editor} id="billing-plan-editor" onSubmit={savePlan}>
          <p>PLAN EDITOR</p><h3>{planId ? "Edit this plan" : "Create a plan"}</h3>
          <label>Plan name<input value={planName} onChange={(event) => setPlanName(event.target.value)} required minLength={3} maxLength={80} /></label>
          <label>Internal code<input value={planCode} onChange={(event) => setPlanCode(event.target.value)} required pattern="[a-z][a-z0-9_]{2,39}" /></label>
          <div className={styles.twoFields}><label>Audience<select value={audience} onChange={(event) => { const next = event.target.value as "personal" | "company"; setAudience(next); setMinimumQuantity(next === "company" ? 2 : 1); }}><option value="personal">Personal</option><option value="company">Company</option></select></label>
            <label>Period<select value={period} onChange={(event) => setPeriod(event.target.value as "monthly" | "yearly")}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label></div>
          <div className={styles.twoFields}><label>Price in INR<input type="number" min="1" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /></label>
            <label>Minimum seats<input type="number" min={audience === "company" ? 2 : 1} max={audience === "company" ? 100 : 1} value={minimumQuantity} onChange={(event) => setMinimumQuantity(Number(event.target.value))} required /></label></div>
          <label>Razorpay plan ID<input value={remotePlanId} onChange={(event) => setRemotePlanId(event.target.value)} placeholder="plan_…" /></label>
          <label className={styles.checkbox}><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} /> Publish after verifying the Razorpay plan</label>
          <p className={styles.help}>A published price is locked. Create a new plan version for price changes. GST is added by the payment setup.</p>
          <button className={styles.saveButton} disabled={busy === "plan"} type="submit">{busy === "plan" ? "Saving…" : "Save plan"} <ArrowRight /></button>
        </form>}
      </div>}

      {tab === "customers" && <div className={styles.ledger}><div className={styles.tableHead}><h3>Customers and seats</h3><span>{snapshot.accounts.length} accounts</span></div>
        {snapshot.accounts.map((account) => {
          const subs = snapshot.subscriptions.filter((item) => item.account_id === account.id);
          const current = subs.find((item) => !["cancelled", "completed", "expired"].includes(item.status)) || subs[0];
          const assigned = snapshot.seats.filter((item) => item.account_id === account.id);
          return <div className={styles.customer} key={account.id}><div><strong>{account.name}</strong><span>{account.billing_email}</span><small>{account.kind} · joined {date(account.created_at)}</small></div>
            <div><strong>{assigned.length} assigned</strong><span>{current?.quantity || 0} purchased seats</span></div>
            <div><strong>{current?.status || "No subscription"}</strong><span>Paid through {date(current?.paid_until || null)}</span>
              {current?.cancel_at_period_end && <small>Renewal cancelled</small>}
              {snapshot.role === "owner" && current && !current.cancel_at_period_end && !["cancelled", "completed", "expired"].includes(current.status) &&
                <button type="button" disabled={Boolean(busy)} onClick={() => cancelCustomer(current, account.name)}>Cancel renewal</button>}
            </div></div>;
        })}
        {snapshot.accounts.length === 0 && <p className={styles.empty}>No customer accounts yet.</p>}
        {snapshot.role === "owner" && <form className={styles.editor} onSubmit={recoverCheckout}>
          <h3>Recover an existing checkout</h3>
          <p className={styles.help}>Use this only after a checkout creation timeout. Copy the local request ID from the checkout record and the existing subscription ID from Razorpay. The server verifies their account, plan and quantity match. This does not create a subscription, charge a customer or grant paid access.</p>
          <label>Local checkout request ID<input value={recoveryRequestId} onChange={(event) => setRecoveryRequestId(event.target.value)} required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" maxLength={36} autoComplete="off" /></label>
          <label>Existing Razorpay subscription ID<input value={recoverySubscriptionId} onChange={(event) => setRecoverySubscriptionId(event.target.value)} required pattern="sub_[A-Za-z0-9]{8,32}" maxLength={36} autoComplete="off" /></label>
          <button type="submit" disabled={Boolean(busy)}>{busy === "recover-checkout" ? "Verifying checkout…" : "Verify and recover existing checkout"}</button>
        </form>}
      </div>}

      {tab === "payments" && <div className={styles.workspace}>
        <div className={styles.ledger}><div className={styles.tableHead}><h3>Payments and refunds</h3><span>{snapshot.payments.length} captured</span></div>
          {snapshot.payments.map((payment) => {
            const sub = snapshot.subscriptions.find((item) => item.id === payment.subscription_id);
            const account = snapshot.accounts.find((item) => item.id === sub?.account_id);
            return <button className={styles.payment} key={payment.id} onClick={() => { setPaymentId(payment.id); setRefundAmount(String(payment.amount_paise / 100)); }}>
              <div><strong>{account?.name || "Unknown account"}</strong><small>{payment.razorpay_payment_id} · {date(payment.paid_at)}</small></div><strong>{rupees(payment.amount_paise)}</strong><span>{payment.status}</span>
            </button>;
          })}
          <div className={styles.tableHead}><h3>Refund history</h3><span>{snapshot.refunds.length}</span></div>
          {snapshot.refunds.map((refund) => <div className={styles.refund} key={refund.id}><span>{date(refund.created_at)}</span><strong>{rupees(refund.amount_paise)}</strong><small>{refund.status} · {refund.reason}</small></div>)}
          {snapshot.payments.length === 0 && <p className={styles.empty}>No captured payments yet.</p>}
        </div>
        {snapshot.role === "owner" && <form className={styles.editor} onSubmit={refund}><p>REFUND DESK</p><h3>Issue a refund</h3><p className={styles.help}>Select a captured payment. Refunds are sent to Razorpay and recorded in the audit log.</p>
          <label>Payment<select value={paymentId} onChange={(event) => { setPaymentId(event.target.value); const next = snapshot.payments.find((item) => item.id === event.target.value); setRefundAmount(next ? String(next.amount_paise / 100) : ""); }} required><option value="">Select payment</option>{snapshot.payments.map((item) => <option key={item.id} value={item.id}>{item.razorpay_payment_id} · {rupees(item.amount_paise)}</option>)}</select></label>
          <label>Amount in INR<input type="number" min="0.01" step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} required /></label>
          <label>Reason<textarea value={refundReason} onChange={(event) => setRefundReason(event.target.value)} minLength={3} maxLength={240} required placeholder="Why is this being refunded?" /></label>
          <button className={styles.saveButton} disabled={busy === "refund"} type="submit">{busy === "refund" ? "Sending…" : "Review and refund"} <ArrowRight /></button>
        </form>}
      </div>}

      {tab === "audit" && <div className={styles.ledger}><div className={styles.tableHead}><h3>Billing activity</h3><span>Latest 100 events</span></div>
        {snapshot.audit.map((event) => <div className={styles.audit} key={event.id}><time>{date(event.occurred_at)}</time><strong>{event.action.replaceAll("_", " ")}</strong><span>{event.actor_customer_id ? "Customer" : event.actor_user_id ? "Operator" : "System"} · {event.subject_id || "No subject"}</span></div>)}
        {snapshot.audit.length === 0 && <p className={styles.empty}>No billing activity yet.</p>}
      </div>}
    </>}
  </section>;
}
