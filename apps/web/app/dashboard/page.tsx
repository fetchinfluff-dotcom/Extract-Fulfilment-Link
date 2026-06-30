import Link from "next/link";
import { Badge, Card } from "@listingforge/ui";

export default function DashboardPage() {
  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand">Demo workspace</div>
        <div className="timeline">
          <Link href="/settings">Settings</Link>
          <Link className="lf-button" href="/new">New product</Link>
        </div>
      </nav>
      <div className="grid two">
        <Card>
          <h2>Recent projects</h2>
          <p className="muted">Import a supplier product to review extraction, pricing, generation, editor, and export.</p>
          <Link href="/new">Start import</Link>
        </Card>
        <Card>
          <h2>Usage</h2>
          <Badge tone="neutral">3 trial credits</Badge>
          <p className="muted">Credits are charged only after successful generation in production ledger flow.</p>
        </Card>
      </div>
    </main>
  );
}
