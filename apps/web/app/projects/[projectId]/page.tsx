"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Card } from "@listingforge/ui";

type ProjectPayload = {
  id: string;
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

  useEffect(() => {
    const id = params.projectId;
    setProjectId(id);
    fetch(`/api/projects/${id}`)
      .then((response) => response.json())
      .then((payload: ProjectPayload) => {
        setProject(payload);
        setHtml(payload.html);
      });
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

  if (!project) return <main className="shell"><Card>Loading project...</Card></main>;

  return (
    <main className="shell">
      <nav className="nav">
        <div>
          <div className="brand">{project.listing.selectedTitle}</div>
          <p className="muted">{project.source.canonicalUrl}</p>
        </div>
        <div className="timeline">
          <a className="lf-button secondary" href={`/api/projects/${project.id}/export/html`}>HTML</a>
          <a className="lf-button secondary" href={`/api/projects/${project.id}/export/json`}>JSON</a>
          <a className="lf-button secondary" href={`/api/projects/${project.id}/export/csv`}>CSV</a>
        </div>
      </nav>
      <section className="three-pane">
        <Card>
          <h2>Source facts</h2>
          {project.source.facts.map((fact) => (
            <p key={fact.factId}><Badge tone="good">{fact.field}</Badge> {String(fact.value)}</p>
          ))}
          <h3>Media</h3>
          {project.source.media.map((media) => <p key={media.url}><Badge tone="warn">{media.licenseStatus}</Badge> {media.url}</p>)}
          {project.source.warnings.map((warning) => <p className="lf-badge lf-badge-warn" key={warning}>{warning}</p>)}
        </Card>
        <Card>
          <h2>Editor</h2>
          <textarea aria-label="Sanitized HTML editor" value={html} onChange={(event) => setHtml(event.target.value)} />
          <p><button className="lf-button" onClick={saveHtml}>Save sanitized HTML</button> {saved ? <span className="muted">Saved {saved}</span> : null}</p>
          <div className="preview" dangerouslySetInnerHTML={{ __html: project.html }} />
        </Card>
        <Card>
          <h2>Pricing</h2>
          <p>Landed cost: ${project.pricing.landedCost}</p>
          <p>Suggested: ${project.pricing.lowPrice} - ${project.pricing.recommendedPrice} - ${project.pricing.highPrice}</p>
          <p>Break-even ROAS: {project.pricing.breakEvenRoas}</p>
          <h2>SEO</h2>
          <p>{project.listing.seo.metaTitle}</p>
          <p className="muted">{project.listing.seo.metaDescription}</p>
          <h2>Compliance</h2>
          {project.listing.compliance.warnings.map((warning) => <p key={warning}><Badge tone="warn">Needs review</Badge> {warning}</p>)}
        </Card>
      </section>
    </main>
  );
}
