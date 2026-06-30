import Link from "next/link";
import { Badge, Card } from "@listingforge/ui";

export default function DashboardPage() {
  return (
    <main className="app-frame">
      <aside className="side-nav">
        <div className="brand">ListingForge</div>
        <p className="muted">SaaS dropshipping</p>
        <nav className="grid stack-top">
          <Link className="active" href="/dashboard">Dashboard</Link>
          <Link href="/new">New product</Link>
          <Link href="/settings">Settings</Link>
        </nav>
      </aside>
      <section className="shell">
        <nav className="nav">
          <div>
            <div className="brand">Demo workspace</div>
            <p className="muted">Import, review, edit, and export product listings.</p>
          </div>
          <div className="timeline">
            <Link className="lf-button secondary" href="/settings">Settings</Link>
            <Link className="lf-button" href="/new">New product</Link>
          </div>
        </nav>
        <div className="stat-grid">
          <Card className="stat-card"><span><span className="muted">Projects</span><strong>1</strong></span><Badge tone="good">Ready</Badge></Card>
          <Card className="stat-card"><span><span className="muted">Supplier</span><strong>AliExpress</strong></span><Badge tone="neutral">Live</Badge></Card>
          <Card className="stat-card"><span><span className="muted">Trial credits</span><strong>3</strong></span><Badge tone="neutral">MVP</Badge></Card>
          <Card className="stat-card"><span><span className="muted">Warnings</span><strong>Review</strong></span><Badge tone="warn">Manual</Badge></Card>
        </div>
        <div className="grid two">
          <Card>
            <h2>Recent projects</h2>
            <p className="muted">Import a supplier product to review extraction, pricing, generation, editor, and export.</p>
            <Link className="lf-button secondary" href="/new">Start import</Link>
          </Card>
          <Card>
            <h2>Usage</h2>
            <Badge tone="neutral">3 trial credits</Badge>
            <p className="muted">Credits are charged only after successful generation in production ledger flow.</p>
          </Card>
        </div>
      </section>
    </main>
  );
}
