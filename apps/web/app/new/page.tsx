"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Field } from "@listingforge/ui";

export default function NewProjectPage() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("https://mock.listingforge.local/products/collapsible-lamp");
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
      <h1>New product wizard</h1>
      <div className="timeline">
        {["Validate URL", "Extract fixture", "Calculate price", "Generate draft", "Prepare preview"].map((stage) => <span className="lf-badge lf-badge-neutral" key={stage}>{stage}</span>)}
      </div>
      <Card>
        <Field label="Supplier URL">
          <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
        </Field>
        {error ? <p className="lf-badge lf-badge-bad">{error}</p> : null}
        <p><button className="lf-button" disabled={loading} onClick={submit}>{loading ? "Generating..." : "Generate draft"}</button></p>
      </Card>
    </main>
  );
}
