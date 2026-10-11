import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Thanks",
  description: "Your Morrow request arrived.",
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <div className="document-site">
      <SiteHeader />
      <main id="main-content" className="subpage-main privacy-page empty-page">
        <header>
          <h1>Got it. Thanks.</h1>
          <p>Your request reached the Morrow team. We'll email you from {siteConfig.supportEmail}, usually within a few days.</p>
          <p><a href="/">Back to Morrow</a></p>
        </header>
      </main>
      <SiteFooter />
    </div>
  );
}
