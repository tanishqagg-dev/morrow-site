import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the Morrow team for billing, support and privacy requests.",
};

const email = siteConfig.supportEmail;

const team = [
  { name: "Tanishq Aggarwal", role: "Cofounder, product and design" },
  { name: "Harsh Jain", role: "Cofounder, software and AI" },
  { name: "Moksh Sindhwani", role: "Cofounder, operations and partnerships" },
  { name: "Varun Joshi", role: "Cofounder, training and adoption" },
];

export default function ContactPage() {
  return (
    <div className="document-site">
      <SiteHeader />
      <main id="main-content" className="subpage-main privacy-page">
        <header>
          <h1>Contact</h1>
          <p>Write to <a href={`mailto:${email}`}>{email}</a> for support, beta access, privacy questions or account deletion. A person on the team reads every email.</p>
        </header>
        <div className="privacy-content">
          <section>
            <h2>Company</h2>
            <p>{siteConfig.company.name}<br />{siteConfig.company.legalName} ({siteConfig.company.businessType})<br />{siteConfig.company.address}<br />GSTIN: {siteConfig.company.gstin}<br /><a href="https://aestrum.in/" target="_blank" rel="noopener noreferrer">aestrum.in</a></p>
          </section>
          <section>
            <h2>The team</h2>
            <ul>
              {team.map((person) => <li key={person.name}><strong>{person.name}</strong>, {person.role}</li>)}
            </ul>
          </section>
          <section>
            <h2>Get Morrow</h2>
            <p><a href="/download?start=1">Download for Mac</a>, then open Morrow to create your account. Your plan and any invitation requirement appear during checkout.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
