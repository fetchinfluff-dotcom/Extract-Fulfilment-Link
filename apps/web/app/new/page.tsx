"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Card, Field } from "@listingforge/ui";

export default function NewProjectPage() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("https://www.aliexpress.com/item/1005008809640384.html");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(message: string) {
    setLogs((items) => [...items, `${new Date().toLocaleTimeString()} ${message}`]);
  }

  async function submit() {
    setLoading(true);
    setError("");
    setLogs([]);
    const timers = [
      window.setTimeout(() => addLog("Validated source URL and domain allowlist."), 150),
      window.setTimeout(() => addLog("Extracting product title, price, media, and page facts."), 1200),
      window.setTimeout(() => addLog("Calculating landed cost and suggested selling range."), 3500),
      window.setTimeout(() => addLog("Generating compliant sales-page description modules."), 7000),
      window.setTimeout(() => addLog("Rendering sanitized HTML and checking quality gate."), 14000),
      window.setTimeout(() => addLog("Saving project data and preparing editor preview."), 24000)
    ];
    try {
      addLog("Starting product import.");
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceUrl, targetCountry: "US", targetLanguage: "en", currency: "USD" })
      });
      const payload = await response.json() as { id?: string; error?: { message: string } };
      if (!response.ok || !payload.id) {
        const message = payload.error?.message ?? "Could not create project.";
        setError(message);
        addLog(`Stopped: ${message}`);
        return;
      }
      addLog("Project ready. Opening editor.");
      router.push(`/projects/${payload.id}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Network request failed.";
      setError(message);
      addLog(`Stopped: ${message}`);
    } finally {
      timers.forEach(window.clearTimeout);
      setLoading(false);
    }
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
            {logs.length ? (
              <div className="process-log" aria-live="polite">
                {logs.map((item) => <p key={item}>{item}</p>)}
              </div>
            ) : null}
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
