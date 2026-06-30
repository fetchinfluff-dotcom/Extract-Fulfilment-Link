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
      <section className="hero">
        <Badge tone="good">Source-supported drafts</Badge>
        <h1>Turn a supplier link into a product-page draft you can trust.</h1>
        <p>
          Extract product facts, organize usable media, calculate a pricing range, and generate editable SEO-ready product content without fake reviews or unsupported claims.
        </p>
        <div className="timeline">
          <Link className="lf-button" href="/new">Start product import</Link>
          <Link className="lf-button secondary" href="/dashboard">View workspace</Link>
        </div>
      </section>
      <section className="workspace-card">
        <div className="grid two">
          <Card>
            <Badge tone="neutral">1. Source</Badge>
            <h2>Paste a supplier URL</h2>
            <p className="muted">AliExpress links are validated, extracted, and stored with provenance.</p>
          </Card>
          <Card>
            <Badge tone="neutral">2. Forge</Badge>
            <h2>Generate editable content</h2>
            <p className="muted">Pricing, SEO, media, compliance notes, and HTML exports stay in one workspace.</p>
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
