import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { siteConfig } from "@/lib/site-config";
import styles from "@/components/MorrowWebsite.module.css";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for using the Morrow private beta.",
};

const email = siteConfig.supportEmail;

export default function TermsPage() {
  return (
    <div className={styles.site}>
      <SiteHeader />
      <main id="main-content" className="subpage-main privacy-page">
        <header>
          <h1>Terms of service</h1>
          <p>These terms cover the Morrow private beta. By installing or using Morrow, you agree to them.</p>
          <p className="privacy-meta">Effective 30 September 2026 · Private beta</p>
        </header>
        <div className="privacy-content">
          <section>
            <h2>Who you're dealing with</h2>
            <p>Morrow is an Aestrum product sold by {siteConfig.company.legalName}, a proprietorship registered at {siteConfig.company.address}. GSTIN: {siteConfig.company.gstin}. Contact us at <a href={`mailto:${email}`}>{email}</a>.</p>
          </section>
          <section>
            <h2>It's a beta</h2>
            <p>Morrow is unfinished software. Features can change or have bugs. Keep backups and review its work. A beta invitation lets you subscribe; it does not give you free access. If we end the paid beta, we stop future renewals and refund the unused part of your paid period.</p>
          </section>
          <section>
            <h2>Check the work</h2>
            <p>Morrow uses AI, and AI makes mistakes. Review files, messages and actions before you rely on them or send them to anyone. You choose Morrow's access mode and the macOS permissions it gets, and you're responsible for what it does on your Mac with that access. Start with limited access.</p>
          </section>
          <section>
            <h2>Your ChatGPT account</h2>
            <p>Morrow runs on the ChatGPT account you sign in with. OpenAI's terms and usage policies govern that account, including its usage limits and how OpenAI handles your data. Morrow is not affiliated with or endorsed by OpenAI.</p>
          </section>
          <section>
            <h2>Price</h2>
            <p>The current plan and applicable GST are shown before you authorize checkout. Existing subscriptions keep their agreed price. Checkout shows the full amount and billing period before you pay. Your separate ChatGPT subscription is not included. Razorpay processes payments and recurring mandates. Your Morrow subscription renews until cancelled; we tell you before a price change applies.</p>
          </section>
          <section>
            <h2>Delivery and cancellation</h2>
            <p>This is a digital service; there is no physical shipping. Access activates after our server confirms payment. Install Morrow on a supported Mac and sign in with the same account. If you started checkout in the Mac app, it continues automatically after confirmation. If access does not appear, contact support instead of paying twice.</p>
            <p>Cancel from <a href="/subscribe">Manage subscription</a> before your next renewal. Cancellation stops future renewals and keeps access through your paid period. Deleting the app does not cancel a subscription. See our <a href="/refunds">refund and cancellation policy</a>.</p>
          </section>
          <section>
            <h2>Refunds</h2>
            <p>Request a full refund within 7 days of your first payment. The refund includes GST and goes to your original payment method. The policy explains how to request it and what happens to access.</p>
          </section>
          <section>
            <h2>Fair use</h2>
            <p>Don't use Morrow to break the law, harm other people, get into systems or accounts you don't have permission to use, or get around OpenAI's usage policies. Don't resell beta access or share your signed-in account. Invitations are issued by our team; the shared invitation code does not replace a personal account or payment.</p>
          </section>
          <section>
            <h2>Ending access</h2>
            <p>You can stop using Morrow and ask us to delete your account at any time. We may suspend access for abuse or a breach of these terms, and will explain the reason where possible. Your statutory rights and any refund owed remain unaffected. Your files stay on your Mac either way.</p>
          </section>
          <section>
            <h2>Liability</h2>
            <p>To the extent the law allows, Aestrum isn't liable for indirect or consequential losses, or for lost data or files, from using the beta. Nothing in these terms limits rights that consumer law gives you.</p>
          </section>
          <section>
            <h2>Law</h2>
            <p>Indian law governs these terms. Any mandatory consumer protections and your right to use the appropriate consumer forum remain unaffected. If we change these terms, we update the date above and tell beta users by email.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
