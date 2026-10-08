import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>morrow</strong>
        <p>Make room for tomorrow.</p>
      </div>
      <div className="footer-links">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/refunds">Refunds</Link>
        <Link href="/contact">Contact</Link>
        <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>
        <Link href="/open-source">Open source</Link>
      </div>
      <p className="footer-note">Made by {siteConfig.company.name}, {siteConfig.company.city}, {siteConfig.company.country}. Morrow is independent and not affiliated with or endorsed by OpenAI. Private legacy builds also support 64-bit Windows 10 or 11 PCs.</p>
    </footer>
  );
}
