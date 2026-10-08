import Link from "next/link";

type SiteHeaderProps = {
  activePage?: "activate";
};

export function SiteHeader({ activePage }: SiteHeaderProps) {
  const activationActive = activePage === "activate";

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand-lockup" href="/" aria-label="Morrow home">
          <img src="/morrow/wordmark.png" alt="morrow" width="138" height="46" style={{objectFit: "contain"}} />
        </a>
        <nav className="main-nav" aria-label="Primary navigation">
          <a href="/#features">Experience</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#how-it-works">How it works</a>
          <Link href="/privacy">Privacy</Link>
          <Link href="/activate" aria-current={activationActive ? "page" : undefined}>Your account</Link>
        </nav>
        {activationActive ? (
          <a className="button button-quiet" href="/#beta">Join the beta</a>
        ) : (
          <a className="button button-quiet" href="/#beta">Join the beta</a>
        )}
      </div>
    </header>
  );
}
