import Link from "next/link";
import { Card, Field } from "@listingforge/ui";

export default function ResetPage() {
  return (
    <main className="shell">
      <Card>
        <h1>Reset password</h1>
        <Field label="Email"><input type="email" placeholder="you@example.com" /></Field>
        <p className="muted">Configure Supabase Auth SMTP before production email delivery.</p>
        <Link href="/login">Back to login</Link>
      </Card>
    </main>
  );
}
