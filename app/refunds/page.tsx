import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { siteConfig } from "@/lib/site-config";
import styles from "@/components/MorrowWebsite.module.css";

export const metadata: Metadata = { title: "Refunds and cancellation", description: "Morrow's seven-day first-payment refund policy and how to cancel renewal." };
export default function RefundsPage() {
  return <div className={styles.site}><SiteHeader /><main id="main-content" className="subpage-main privacy-page">
    <header><h1>Refunds and cancellation</h1><p>Effective 30 September 2026. Applies to the Morrow private paid beta, sold by {siteConfig.company.legalName} under the Aestrum brand.</p></header>
    <div className="privacy-content">
      <section><h2>Your first 7 days</h2><p>Request a full refund within 7 days (168 hours) of your first successful Morrow subscription payment. The refund covers the full amount paid, including GST. You do not need to give a reason. This window applies to your first payment, not each renewal.</p></section>
      <section><h2>How to request a refund</h2><p>Email <a href={`mailto:${siteConfig.supportEmail}?subject=Morrow%20refund%20request`}>{siteConfig.supportEmail}</a> from your Morrow account email. Include the payment ID shown on your receipt and the payment date. Never send your card details, password, CVV, OTP or UPI PIN. The time you send the request determines whether it is within the window.</p><p>After verifying eligibility, we initiate the refund through Razorpay to the original payment method. We also cancel renewal. Access ends when the full refund is processed. Bank processing time varies; we send the refund reference so you can track it.</p></section>
      <section><h2>Cancel future payments</h2><p>Sign in at <a href="/subscribe">Your Morrow account</a>, open Manage subscription, then choose Cancel subscription and confirm Cancel renewal. Do this before the next renewal. You keep access until the end of the paid period. Uninstalling Morrow does not stop renewal.</p></section>
      <section><h2>After the refund window</h2><p>We do not normally refund renewal charges or unused time when you cancel after the first-payment window. Contact us about duplicate charges, an incorrect charge, or paid access that we cannot provide. Nothing in this policy removes rights provided by applicable consumer law.</p></section>
      <section><h2>Digital delivery</h2><p>Morrow is software. There is no shipping charge or physical delivery. Paid access starts when the server confirms your payment. If confirmation is delayed, keep the payment-status page open or contact support; do not pay again. The Mac app and your account must use the same sign-in.</p></section>
    </div></main><SiteFooter /></div>;
}
