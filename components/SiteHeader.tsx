import Link from "next/link";
import type { ReactNode } from "react";
import { HeaderDownload } from "./HeaderDownload";

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
        {activePage === "download" ? <a className="button button-quiet" href="/subscribe?view=subscription">Your account</a> : <HeaderDownload />}
        </> : <div className="account-header-control">{accountControl}</div>}
      </div>
    </header>
  );
}
