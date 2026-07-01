"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Card } from "@listingforge/ui";

type ProjectPayload = {
  id: string;
  createdAt: string;
  source: {
    sourceTitle: string;
    canonicalUrl: string;
    variants: Array<{ id: string; title: string; itemCost: number }>;
    media: Array<{ url: string; licenseStatus: string }>;
    facts: Array<{ factId: string; field: string; value: unknown; confidence: number }>;
    warnings: string[];
  };
  pricing: {
    landedCost: number;
    lowPrice: number;
    recommendedPrice: number;
    highPrice: number;
    breakEvenRoas: number;
    warnings: string[];
  };
  listing: {
    selectedTitle: string;
    subtitle: string;
    heroBenefits: string[];
    seo: { metaTitle: string; metaDescription: string; handle: string };
    compliance: { warnings: string[]; unsupportedClaims: string[]; humanReviewRequired: boolean };
  };
  html: string;
};

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [html, setHtml] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const id = params.projectId;
    setProjectId(id);
    fetch(`/api/projects/${id}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message ?? "Project could not be loaded.");
        return payload as ProjectPayload;
      })
      .then((payload: ProjectPayload) => {
        setProject(payload);
        setHtml(payload.html);
      })
      .catch((loadError: Error) => setError(loadError.message));
  }, [params.projectId]);

  async function saveHtml() {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ html })
    });
    const payload = await response.json() as ProjectPayload;
    setProject(payload);
    setHtml(payload.html);
    setSaved(new Date().toLocaleTimeString());
  }

  if (error) return <main className="shell"><Card><h1>Project unavailable</h1><p className="muted">{error}</p><Link className="lf-button secondary" href="/dashboard">Back to dashboard</Link></Card></main>;
  if (!project) return <main className="shell"><div className="code-window"><div className="code-window-header"><div className="window-dots"><span /><span /><span /></div><span className="code-label">loading_project.json</span></div><div className="pipeline"><div className="pipeline-step"><small><span>fetch.project</span><span className="signal-dot">loading</span></small><p className="muted">Loading project workspace...</p></div></div></div></main>;

  return (
    <main className="app-frame">
      <aside className="side-nav">
        <div className="brand">ListingForge</div>
        <p className="muted">Product editor runtime</p>
        <nav className="grid stack-top">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/new">New product</Link>
          <Link className="active" href={`/projects/${project.id}`}>Editor</Link>
          <Link href="/settings">Settings</Link>
        </nav>
      </aside>
      <section className="shell">
        <nav className="nav">
          <div>
            <div className="brand">{project.listing.selectedTitle}</div>
            <p className="muted"><span className="signal-dot">saved</span> {project.source.canonicalUrl}</p>
          </div>
          <div className="timeline">
            <a className="lf-button secondary" href={`/api/projects/${project.id}/export/html`}>HTML</a>
            <a className="lf-button secondary" href={`/api/projects/${project.id}/export/json`}>JSON</a>
            <a className="lf-button secondary" href={`/api/projects/${project.id}/export/csv`}>CSV</a>
          </div>
        </nav>
        <div className="stat-grid">
          <Card className="stat-card"><span><span className="muted">Facts</span><strong>{project.source.facts.length}</strong></span><Badge tone="good">Source</Badge></Card>
          <Card className="stat-card"><span><span className="muted">Media</span><strong>{project.source.media.length}</strong></span><Badge tone="neutral">Links</Badge></Card>
          <Card className="stat-card"><span><span className="muted">Suggested</span><strong>${project.pricing.recommendedPrice}</strong></span><Badge tone="neutral">Price</Badge></Card>
          <Card className="stat-card"><span><span className="muted">Review</span><strong>{project.listing.compliance.humanReviewRequired ? "Yes" : "No"}</strong></span><Badge tone={project.listing.compliance.humanReviewRequired ? "warn" : "good"}>Compliance</Badge></Card>
        </div>
        <section className="three-pane editor-shell">
          <Card>
            <h2>Source facts</h2>
            {project.source.facts.map((fact) => (
              <p key={fact.factId}><Badge tone="good">{fact.field}</Badge> {String(fact.value)}</p>
            ))}
            <h3>Media</h3>
            <div className="media-actions">
              {project.source.media.map((media, index) => (
                <a className="lf-button secondary" href={media.url} target="_blank" rel="noreferrer" key={media.url}>
                  image_{index + 1}.asset - {media.licenseStatus}
                </a>
              ))}
            </div>
            {project.source.warnings.map((warning) => <p className="lf-badge lf-badge-warn" key={warning}>{warning}</p>)}
          </Card>
          <Card>
            <h2>HTML editor</h2>
            <p className="muted">Sanitized storefront HTML. Save writes the active generated version.</p>
            <textarea aria-label="Sanitized HTML editor" value={html} onChange={(event) => setHtml(event.target.value)} />
            <p><button className="lf-button" onClick={saveHtml}>Save sanitized HTML</button> {saved ? <span className="muted">Saved {saved}</span> : null}</p>
            <div className="preview" dangerouslySetInnerHTML={{ __html: project.html }} />
          </Card>
          <Card>
            <h2>Pricing</h2>
            <div className="pipeline">
              <div className="pipeline-step"><small><span>landed_cost</span><span>${project.pricing.landedCost}</span></small><p className="muted">Item cost plus detected shipping.</p></div>
              <div className="pipeline-step hot"><small><span>suggested_range</span><span>${project.pricing.lowPrice} - ${project.pricing.highPrice}</span></small><p>Recommended: ${project.pricing.recommendedPrice}</p></div>
              <div className="pipeline-step"><small><span>break_even_roas</span><span>{project.pricing.breakEvenRoas}</span></small><p className="muted">Estimate only, not a profit guarantee.</p></div>
            </div>
            <h2>SEO</h2>
            <p>{project.listing.seo.metaTitle}</p>
            <p className="muted">{project.listing.seo.metaDescription}</p>
            <h2>Compliance</h2>
            <div className="status-log">
              <p><Badge tone="good">Ready</Badge> Project generated and saved</p>
              <p><Badge tone="good">Source</Badge> {project.source.facts.length} facts extracted</p>
              <p><Badge tone="good">Media</Badge> {project.source.media.length} supplier media links found</p>
              <p><Badge tone={project.listing.compliance.humanReviewRequired ? "warn" : "good"}>{project.listing.compliance.humanReviewRequired ? "Review" : "OK"}</Badge> Human review {project.listing.compliance.humanReviewRequired ? "required" : "not required"}</p>
              <p className="muted">Created {new Date(project.createdAt).toLocaleString()}</p>
            </div>
            {project.listing.compliance.warnings.map((warning) => <p key={warning}><Badge tone="warn">Needs review</Badge> {warning}</p>)}
          </Card>
        </section>
      </section>
    </main>
  );
}
