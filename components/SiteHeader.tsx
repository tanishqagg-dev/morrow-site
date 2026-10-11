import Link from "next/link";
import type { ReactNode } from "react";

type SiteHeaderProps = {
  accountControl?: ReactNode;
  activePage?: "activate" | "subscribe" | "download";
};

export function SiteHeader({ activePage, accountControl }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand-lockup" href="/" aria-label="Morrow home">
          <img src="/morrow/wordmark.png" alt="morrow" width="138" height="46" style={{objectFit: "contain"}} />
        </a>
        {accountControl === undefined ? <><nav className="main-nav" aria-label="Primary navigation">
          <a href="/download">Download</a>
          <Link href="/contact">Help</Link>
          {activePage !== "download" && <Link href="/subscribe" aria-current={activePage === "subscribe" ? "page" : undefined}>Your account</Link>}
        </nav>
        <a className={`button ${activePage === "download" ? "button-quiet" : "button-primary"}`} href={activePage === "download" ? "/subscribe?view=subscription" : "/download?start=1"}>{activePage === "download" ? "Your account" : "Download for Mac"}</a>
        </> : <div className="account-header-control">{accountControl}</div>}
      </div>
    </header>
  );
}
