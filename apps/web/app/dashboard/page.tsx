import Link from "next/link";
import { headers } from "next/headers";
import { Badge, Card } from "@listingforge/ui";
import { listDemoProjects } from "../../lib/demo-store";
import { resolveRequestContext } from "../../lib/auth";
import { signOutAction } from "../login/actions";

export default async function DashboardPage() {
  const headerStore = await headers();
  const request = new Request("https://listingforge.local/dashboard", { headers: { cookie: headerStore.get("cookie") ?? "" } });
  const context = await resolveRequestContext(request).catch(() => null);
  const projects = context ? await listDemoProjects(context) : [];
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
            <div className="brand">{context?.authenticated ? "Workspace" : "Demo workspace"}</div>
            <p className="muted">Import, review, edit, and export product listings.</p>
          </div>
          <div className="timeline">
            <Link className="lf-button secondary" href="/settings">Settings</Link>
            {context?.authenticated ? <form action={signOutAction}><button className="lf-button secondary" type="submit">Log out</button></form> : <Link className="lf-button secondary" href="/login">Login</Link>}
            <Link className="lf-button" href="/new">New product</Link>
          </div>
        </nav>
        <div className="stat-grid">
          <Card className="stat-card"><span><span className="muted">Projects</span><strong>{projects.length}</strong></span><Badge tone="good">Ready</Badge></Card>
          <Card className="stat-card"><span><span className="muted">Supplier</span><strong>AliExpress</strong></span><Badge tone="neutral">Live</Badge></Card>
          <Card className="stat-card"><span><span className="muted">Trial credits</span><strong>3</strong></span><Badge tone="neutral">MVP</Badge></Card>
          <Card className="stat-card"><span><span className="muted">Warnings</span><strong>Review</strong></span><Badge tone="warn">Manual</Badge></Card>
        </div>
        <div className="grid two">
          <Card>
            <h2>Recent projects</h2>
            {projects.length ? projects.map((project) => (
              <p key={project.id}>
                <Badge tone="good">{project.source.platform}</Badge>{" "}
                <Link href={`/projects/${project.id}`}>{project.listing.selectedTitle}</Link>
              </p>
            )) : <p className="muted">Import a supplier product to review extraction, pricing, generation, editor, and export.</p>}
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
