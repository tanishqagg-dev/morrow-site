import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Buildings, CheckCircle, Laptop } from "@phosphor-icons/react/dist/ssr";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { siteConfig } from "@/lib/site-config";
import windowsRelease from "@/lib/windows-release.json";

export const metadata: Metadata = {
  title: "Windows setup",
  description: "Install Morrow on Windows 10 or 11, and what to do if Windows warns about the installer.",
};

export default function WindowsSetupPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="subpage-main privacy-page windows-setup-page">
        <header>
          <h1>Install Morrow on Windows.</h1>
          <p>Morrow runs on Windows 10 and 11, 64-bit. Download the setup, run it, then sign in with your Morrow account.</p>
        </header>

        <aside className="pilot-notice" aria-labelledby="pilot-note-title">
          <CheckCircle aria-hidden="true" weight="duotone" />
          <div>
            <h2 id="pilot-note-title">The installer isn&apos;t code-signed yet</h2>
            <p>Windows may show &quot;Windows protected your PC&quot; before Morrow Setup runs. Choose More info, check that the file is Morrow-Setup-{windowsRelease.version}.exe, then choose Run anyway.</p>
            <details>
              <summary>Verify your download</summary>
              <code style={{ overflowWrap: "anywhere" }}>SHA-256 {windowsRelease.sha256}</code>
            </details>
          </div>
        </aside>

        <div className="privacy-content windows-setup-content">
          <section>
            <h2><Laptop aria-hidden="true" weight="duotone" />Personal or unmanaged laptop</h2>
            <div>
              <p>Download Morrow Setup {windowsRelease.version} and open it. When setup finishes, open Morrow from the Start menu.</p>
              <p>If Windows blocks the app without a Run anyway option, Smart App Control is on. Never turn off Smart App Control just to install Morrow. Contact support instead.</p>
            </div>
          </section>

          <section>
            <h2><Buildings aria-hidden="true" weight="duotone" />Company-managed laptop</h2>
            <div>
              <p>Send the download link and SHA-256 above to your IT administrator. They can review the exact build and deploy it through the company&apos;s approved app-management system.</p>
              <p>Do not change Smart App Control, Defender, SmartScreen, or company security policy.</p>
            </div>
          </section>

          <section>
            <h2>After installation</h2>
            <ol>
              <li>Open Morrow and enter the invitation code you received.</li>
              <li>Sign in and pay ₹2,999/month + 18% GST through Razorpay.</li>
              <li>Complete the official ChatGPT browser sign-in.</li>
              <li>Allow microphone access when Windows asks, then speak your first request. Morrow never asks for an OpenAI API key.</li>
            </ol>
          </section>
        </div>

        <div className="windows-setup-actions">
          <a className="button button-primary" href={windowsRelease.downloadUrl} download>
            Download Morrow for Windows
            <ArrowRight aria-hidden="true" weight="bold" />
          </a>
          <Link className="button button-secondary" href="/subscribe">
            Manage subscription
          </Link>
          <a className="button button-secondary" href={`mailto:${siteConfig.supportEmail}`}>
            Contact support
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
