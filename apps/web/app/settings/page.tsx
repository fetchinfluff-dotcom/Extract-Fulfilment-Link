import Link from "next/link";
import { Card, Field } from "@listingforge/ui";

export default function SettingsPage() {
  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand">Settings</div>
        <Link href="/dashboard">Dashboard</Link>
      </nav>
      <Card>
        <h1>Brand profile</h1>
        <div className="grid two">
          <Field label="Store name"><input defaultValue="Demo Store" /></Field>
          <Field label="Tone"><input defaultValue="Clear, helpful, conservative" /></Field>
          <Field label="Preferred phrases"><input placeholder="Durable, compact, practical" /></Field>
          <Field label="Prohibited phrases"><input defaultValue="guaranteed, #1, miracle, cure" /></Field>
          <Field label="Shipping copy"><textarea placeholder="Merchant-provided shipping policy only." /></Field>
          <Field label="Returns / guarantee copy"><textarea placeholder="Leave blank unless verified by the merchant." /></Field>
        </div>
        <p className="muted">Local MVP shows the profile form; persistence moves into Supabase-backed brand profiles next.</p>
      </Card>
    </main>
  );
}
