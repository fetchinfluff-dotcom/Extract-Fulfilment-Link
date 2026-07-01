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
        <p className="muted">SaaS dropshipping compiler</p>
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
            <p className="muted"><span className="signal-dot">connected</span> Import, review, edit, and export product listings.</p>
          </div>
          <div className="timeline">
            <Link className="lf-button secondary" href="/settings">Settings</Link>
            {context?.authenticated ? <form action={signOutAction}><button className="lf-button secondary" type="submit">Log out</button></form> : <Link className="lf-button secondary" href="/login">Login</Link>}
            <Link className="lf-button" href="/new">New product</Link>
          </div>
        </nav>
        <div className="stat-grid">
          <Card className="stat-card"><span><span className="muted">Projects</span><strong>{projects.length}</strong></span><Badge tone="good">Ready</Badge></Card>
          <Card className="stat-card"><span><span className="muted">Supplier</span><strong>Ali</strong></span><Badge tone="neutral">Live</Badge></Card>
          <Card className="stat-card"><span><span className="muted">Parser</span><strong>mtop</strong></span><Badge tone="good">HTTP</Badge></Card>
          <Card className="stat-card"><span><span className="muted">Review</span><strong>claim</strong></span><Badge tone="warn">Manual</Badge></Card>
        </div>
        <div className="grid two">
          <Card className="terminal-panel">
            <h2>Recent projects</h2>
            {projects.length ? projects.map((project) => (
              <p key={project.id}>
                <Badge tone="good">{project.source.platform}</Badge>{" "}
                <Link href={`/projects/${project.id}`}>{project.listing.selectedTitle}</Link>
              </p>
            )) : <p className="muted">No compiled listings yet. Start with one supplier URL and the project will appear here with source provenance attached.</p>}
            <Link className="lf-button secondary" href="/new">Start import</Link>
          </Card>
          <div className="code-window">
            <div className="code-window-header">
              <div className="window-dots"><span /><span /><span /></div>
              <span className="code-label">workspace_status.json</span>
            </div>
            <div className="pipeline">
              <div className="pipeline-step"><small><span>auth.workspace</span><span>{context?.authenticated ? "scoped" : "demo"}</span></small><p className="muted">Project reads and writes are tied to the active workspace.</p></div>
              <div className="pipeline-step"><small><span>exports</span><span>html/json/csv</span></small><p className="muted">Sanitized exports are available from the editor page.</p></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
