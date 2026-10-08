import type { Metadata } from "next";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Open source notice",
  description: "Open source and source-availability notice for Aestrum.",
};

export default function OpenSourcePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="subpage-main privacy-page">
        <header>
          <h1>Open source notice.</h1>
          <p>Aestrum is built on open source software, including the original Jarvis Codex project licensed under GNU GPL v3.</p>
        </header>
        <div className="privacy-content">
          <section>
            <h2>Original project</h2>
            <div>
              <p>The upstream source and license are available on GitHub.</p>
              <a className="text-link" href="https://github.com/Big-Guan/jarvis-codex" target="_blank" rel="noreferrer">
                View upstream source <ArrowSquareOut aria-hidden="true" />
              </a>
            </div>
          </section>
          <section>
            <h2>Corresponding source</h2>
            <p>Pilot recipients receive the applicable source and license notices with their distribution. If your copy did not include them, contact Skills4U and quote the version shown in Aestrum Settings.</p>
          </section>
          <section>
            <h2>Commercial services</h2>
            <p>Skills4U activation, onboarding, support, release signing, and hosted services are separate from OpenAI. ChatGPT and Codex are trademarks of OpenAI.</p>
          </section>
          <section>
            <h2>Request help</h2>
            <div>
              <p>Use the Skills4U company page for pilot support or a source request.</p>
              <a className="text-link" href={siteConfig.supportUrl} target="_blank" rel="noreferrer">
                Contact Skills4U <ArrowSquareOut aria-hidden="true" />
              </a>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
