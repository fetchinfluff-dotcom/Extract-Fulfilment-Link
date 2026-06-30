"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Card, Field } from "@listingforge/ui";

export default function NewProjectPage() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("https://www.aliexpress.com/item/1005008809640384.html");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceUrl, targetCountry: "US", targetLanguage: "en", currency: "USD" })
    });
    const payload = await response.json() as { id?: string; error?: { message: string } };
    setLoading(false);
    if (!response.ok || !payload.id) {
      setError(payload.error?.message ?? "Could not create project.");
      return;
    }
    router.push(`/projects/${payload.id}`);
  }

  return (
    <main className="shell">
      <nav className="nav">
        <div>
          <div className="brand">New product</div>
          <p className="muted">Paste a permitted supplier link and build a reviewable draft.</p>
        </div>
        <a className="lf-button secondary" href="/dashboard">Dashboard</a>
      </nav>
      <section className="workspace-card">
        <div className="timeline">
          {["Validate URL", "Extract source data", "Calculate price", "Generate draft", "Prepare preview"].map((stage) => <span className="lf-badge lf-badge-neutral" key={stage}>{stage}</span>)}
        </div>
        <div className="grid two stack-top">
          <Card>
            <h1>Fast import</h1>
            <p className="muted">ListingForge keeps source facts, media links, pricing, and compliance notes attached to the project.</p>
            <Field label="Supplier URL">
              <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
            </Field>
            {error ? <p className="lf-badge lf-badge-bad">{error}</p> : null}
            <p><button className="lf-button" disabled={loading} onClick={submit}>{loading ? "Generating..." : "Generate draft"}</button></p>
          </Card>
          <Card>
            <h2>What happens next</h2>
            <p><Badge tone="good">Source</Badge> Product data and images are extracted with provenance.</p>
            <p><Badge tone="neutral">Pricing</Badge> The landed cost feeds a suggested selling range.</p>
            <p><Badge tone="warn">Review</Badge> Claims, media rights, and unsupported social proof stay visible.</p>
          </Card>
        </div>
      </section>
    </main>
  );
}
