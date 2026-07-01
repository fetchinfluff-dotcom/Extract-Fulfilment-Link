import Link from "next/link";
import { Badge, Card } from "@listingforge/ui";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ListingForge";

export default function HomePage() {
  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand">{appName}</div>
        <div className="timeline">
          <Link href="/login">Login</Link>
          <Link className="lf-button secondary" href="/dashboard">Dashboard</Link>
        </div>
      </nav>
      <section className="hero hero-grid">
        <div>
          <Badge tone="good">Schema-validated product-page builder</Badge>
          <h1>Turn a supplier link into a <span className="gradient-text">programmable listing workspace</span>.</h1>
          <p>
            Extract product facts, inspect media, calculate landed cost, and generate editable SEO/AIEO HTML with compliance checks attached to every draft.
          </p>
          <div className="timeline">
            <Link className="lf-button" href="/new">Start product import</Link>
            <Link className="lf-button secondary" href="/dashboard">Open workspace</Link>
          </div>
        </div>
        <div className="code-window">
          <div className="code-window-header">
            <div className="window-dots"><span /><span /><span /></div>
            <span className="code-label">listing_pipeline.ts</span>
          </div>
          <div className="pipeline">
            <div className="pipeline-step">
              <small><span>01 validate_source_url</span><span>LOCKED</span></small>
              <div className="code-line">https://aliexpress.com/item/100500...</div>
            </div>
            <div className="pipeline-step">
              <small><span>02 extract_product_graph</span><span className="signal-dot">READY</span></small>
              <p className="muted">Title, images, item cost, shipping quote, attributes, and warnings stay visible before generation.</p>
            </div>
            <div className="pipeline-step hot">
              <small><span>03 render_sales_page_html</span><span>EXPORT</span></small>
              <p>Conversion-focused description, scenario blocks, alt text, sanitized HTML, JSON, and CSV outputs.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="supplier-strip">
        {["AliExpress live parser", "CJ adapter-ready", "QKSource adapter-ready", "Manual review fallback"].map((item) => <div className="supplier-pill" key={item}>{item}</div>)}
      </section>
      <section className="workspace-card stack-top">
        <div className="grid two">
          <Card>
            <Badge tone="neutral">Extract</Badge>
            <h2>Source facts first</h2>
            <p className="muted">Supplier data is treated as untrusted input, normalized, and kept separate from generated copy.</p>
          </Card>
          <Card>
            <Badge tone="neutral">Generate</Badge>
            <h2>Structured output, not loose AI text</h2>
            <p className="muted">The app renders sanitized storefront HTML from schema-validated listing data.</p>
          </Card>
        </div>
      </section>
      <section className="grid two stack-top">
        {["Facts and provenance", "SSRF-safe URL intake", "Schema-validated AI", "Sanitized HTML export"].map((item) => (
          <Card key={item}>
            <h2>{item}</h2>
            <p className="muted">Built into the runnable MVP path.</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
