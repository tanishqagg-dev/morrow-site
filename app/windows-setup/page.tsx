import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Buildings, CheckCircle, Laptop } from "@phosphor-icons/react/dist/ssr";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Windows setup",
  description: "Plain-language setup help for the private Morrow Windows pilot.",
};

export default function WindowsSetupPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="subpage-main privacy-page windows-setup-page">
        <header>
          <h1>Install Morrow on a Windows work laptop.</h1>
          <p>Start with your Morrow account. The right installation route depends on whether your company manages the computer.</p>
        </header>

        <aside className="pilot-notice" aria-labelledby="pilot-note-title">
          <CheckCircle aria-hidden="true" weight="duotone" />
          <div>
            <h2 id="pilot-note-title">Private pilot note</h2>
            <p>Until trusted Windows signing is complete, the assisted pilot is handed over privately by Morrow support with a SHA-256 that must match the separate authenticated build record.</p>
          </div>
        </aside>

        <div className="privacy-content windows-setup-content">
          <section>
            <h2><Buildings aria-hidden="true" weight="duotone" />Company-managed laptop</h2>
            <div>
              <p>Send the private pilot package to your IT administrator. They can review the exact build and deploy it through the company&apos;s approved app-management system.</p>
              <p>Do not change Smart App Control, Defender, SmartScreen, or company security policy.</p>
            </div>
          </section>

          <section>
            <h2><Laptop aria-hidden="true" weight="duotone" />Personal or unmanaged laptop</h2>
            <div>
              <p>A subscription does not make an unsigned installer trusted. Install only the private package supplied by Morrow support after its SHA-256 matches the separate authenticated build record.</p>
              <p>If Windows blocks the app without its normal continue option, stop and contact Morrow support.</p>
              <p>Never turn off Smart App Control just to install Morrow.</p>
            </div>
          </section>

          <section>
            <h2>After installation</h2>
            <ol>
              <li>Open Morrow and sign in with the account you subscribed with.</li>
              <li>Complete the official ChatGPT browser sign-in.</li>
              <li>Allow microphone access when Windows asks.</li>
              <li>Speak your first request. Morrow never asks for an OpenAI API key.</li>
            </ol>
          </section>
        </div>

        <div className="windows-setup-actions">
          <Link className="button button-primary" href="/subscribe">
            Manage subscription
            <ArrowRight aria-hidden="true" weight="bold" />
          </Link>
          <a className="button button-secondary" href={siteConfig.supportUrl} target="_blank" rel="noreferrer">
            Contact Morrow support
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
