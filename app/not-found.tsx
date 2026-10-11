import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
export default function NotFound() {
  return <div className="document-site"><SiteHeader /><main id="main-content" className="subpage-main empty-page">
    <img src="/morrow/mark-small.png" alt="" width="72" height="72" />
    <h1>This page isn't here.</h1><p>The link may have changed. You can head back to Morrow.</p>
    <a className="button button-primary" href="/">Back to Morrow</a>
  </main><SiteFooter /></div>;
}
