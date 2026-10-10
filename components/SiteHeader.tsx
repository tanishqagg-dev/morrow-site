import Link from "next/link";

type SiteHeaderProps = {
  activePage?: "activate" | "subscribe";
};

export function SiteHeader({ activePage }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand-lockup" href="/" aria-label="Morrow home">
          <img src="/morrow/wordmark.png" alt="morrow" width="138" height="46" style={{objectFit: "contain"}} />
        </a>
        <nav className="main-nav" aria-label="Primary navigation">
          <a href="/#say-it">Experience</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#film">How it works</a>
          <Link href="/privacy">Privacy</Link>
          <Link href="/subscribe" aria-current={activePage === "subscribe" ? "page" : undefined}>Your account</Link>
        </nav>
        <a className="button button-quiet" href="/download?start=1">Download for Mac</a>
      </div>
    </header>
  );
}
