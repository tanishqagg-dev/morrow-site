import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Morrow reads, what stays on your Mac, what goes to OpenAI, what reaches Aestrum, and how to delete your account.",
};

const email = siteConfig.supportEmail;

export default function PrivacyPage() {
  return (
    <div className="document-site">
      <SiteHeader />
      <main id="main-content" className="subpage-main privacy-page">
        <header>
          <h1>Privacy policy</h1>
          <p>Morrow runs on your Mac. Its AI runs through your own ChatGPT account, so the AI part is not local. This page says exactly what goes where.</p>
          <p className="privacy-meta">Effective 30 September 2026 · Private beta</p>
        </header>
        <div className="privacy-content">
          <section>
            <h2>Who we are</h2>
            <p>Morrow is an Aestrum product operated by {siteConfig.company.legalName}, at {siteConfig.company.address}. Questions about this policy or your data go to <a href={`mailto:${email}`}>{email}</a>. Morrow is independent and is not affiliated with or endorsed by OpenAI.</p>
          </section>
          <section>
            <h2>What Morrow reads</h2>
            <ul>
              <li>Your voice, while you talk to Morrow. The wake word is recognised on your Mac.</li>
              <li>Files in the work folder you choose, and any file you drop in or pick. The default work folder is Documents/Aestrum. Morrow's changes stay inside that folder unless you switch on Full access.</li>
              <li>Screen context from Morrow Island, only for the sources you leave on: the window title, selected text, text on screen, up to 6,000 characters of clipboard text, and a temporary screenshot. Each one has its own switch.</li>
              <li>Screenshots of apps you ask Morrow to operate, if you give it permission to use your computer.</li>
            </ul>
          </section>
          <section>
            <h2>What stays on your Mac</h2>
            <ul>
              <li>Conversation history and transcripts</li>
              <li>An encrypted search index of your conversations. Its key is kept in the macOS Keychain.</li>
              <li>Your profile, preferences and trusted app choices</li>
              <li>Files Morrow creates, saved in your work folder</li>
              <li>Your ChatGPT sign-in, stored in Morrow's private folder on your Mac. It is never sent to Aestrum.</li>
            </ul>
          </section>
          <section>
            <h2>What goes to OpenAI</h2>
            <p>Morrow uses Codex with the ChatGPT account you sign in with. To answer a request, your voice audio, your request and the context it needs go to OpenAI. That context can include file contents, screen text and screenshots. OpenAI handles that data under its own terms and privacy policy, and your account's data controls decide whether it can be used for training. Personal and business plans have different defaults. <a href="https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan" target="_blank" rel="noreferrer">OpenAI explains the rules for each plan here.</a></p>
          </section>
          <section>
            <h2>What goes to Aestrum</h2>
            <ul>
              <li>Your account: email address, profile information supplied by your sign-in provider, and account ID. Apple or Google sign-in, when available, is handled through Clerk. Using Apple Hide My Email can create a different account from a Google login; use the same sign-in method across devices.</li>
              <li>Billing records: subscription and payment IDs, amounts, payment status, refunds and billing email. Razorpay collects payment credentials; Morrow does not receive your full card number, CVV or UPI PIN.</li>
              <li>Your beta access status, plus an install ID and app version so the Mac app can check that access. Our server keeps a hashed install ID and a hashed IP address to stop abuse.</li>
              <li>Waitlist and demo requests: your name, email and message, sent through Netlify Forms.</li>
              <li>iPhone and Apple Watch messages, when those apps launch. They are encrypted on your Mac before they leave it. Our relay stores only the encrypted message, a device name and a key fingerprint, and deletes messages after 24 hours.</li>
            </ul>
            <p>Your ChatGPT sign-in is never sent to Aestrum. We do not automatically receive your conversations or files. A support report you choose to send can contain private work in its screenshot or description. The website and the Mac app have no advertising trackers.</p>
          </section>
          <section>
            <h2>Services we use</h2>
            <p>Clerk runs sign-in. Supabase hosts our database and the device relay. Netlify hosts this website and receives form submissions. Razorpay handles paid subscriptions, payment authentication, refunds and fraud prevention. OpenAI runs the AI through your own account.</p>
          </section>
          <section>
            <h2>Storage, cookies and transfers</h2>
            <p>When you choose Report a problem, Morrow prepares app/version, platform and connection diagnostics and a preview image of its own window. You can remove the image and review the report before sending. Reports can include private content visible in that image or entered in your description. We associate submitted reports with your signed-in Morrow account and restrict access to authorized support operators. Screenshot access expires after 30 days; stored screenshots are removed by an hourly cleanup. Investigation notes, report details and account-deletion requests are retained while needed to resolve the issue and meet applicable obligations. Reports do not collect passwords, access tokens, raw conversation logs or files automatically.</p>
            <p>For a business invoice, we collect your registered business name, GSTIN, billing address and PIN code. Our billing team uses them to issue an invoice after a successful payment. Eligible plans may offer a Morrow-funded discount when you provide valid GSTIN details. Checkout shows any discount and the total before payment.</p>
            <p>We use necessary cookies and browser storage for Clerk sign-in and to resume checkout. Our service providers may process account and payment data outside India under their own privacy terms. We use these records to provide access, handle billing, support customers and prevent abuse. We do not sell personal data.</p>
          </section>
          <section>
            <h2>Your controls</h2>
            <p>macOS decides whether Morrow can use the microphone, see the screen or control apps. Morrow's access mode decides how far file and command actions can reach and when it asks first. You can switch off each Island context source, delete single conversations, and sign out of ChatGPT from Settings.</p>
          </section>
          <section id="delete">
            <h2>Deleting your account</h2>
            <p>Use Delete account in Settings → Account &amp; plan, or email <a href={`mailto:${email}?subject=Delete%20my%20Morrow%20account`}>{email}</a> from the address on your account and ask us to delete it. We verify the request, stop renewal and process account deletion within 30 days, then confirm by email. We retain transaction, tax and fraud-prevention records where required by law. Those records are restricted to those purposes. If a refund is due, we process it before closing the billing record.</p>
            <p>Deleting your web account does not delete local files. To remove Morrow's local data, quit the app and remove its folder at ~/Library/Application Support/com.skills4u.jarvis. Back up anything you need first. Your work folder contains your documents; delete it only if you want to delete those files too. Data OpenAI has already processed follows OpenAI's controls for your ChatGPT account.</p>
          </section>
          <section>
            <h2>Changes</h2>
            <p>If this policy changes, we update the date above. If a change affects data you've already given us, we'll email you first.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
