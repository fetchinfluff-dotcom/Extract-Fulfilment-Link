import Link from "next/link";
import { Card, Field } from "@listingforge/ui";
import { resetPasswordAction } from "./actions";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="shell">
      <Card>
        <h1>Reset password</h1>
        {params.error ? <p className="lf-badge lf-badge-bad">{params.error}</p> : null}
        <form className="grid" action={resetPasswordAction}>
          <Field label="Email"><input name="email" type="email" required placeholder="you@example.com" /></Field>
          <button className="lf-button" type="submit">Send reset link</button>
        </form>
        <p className="muted">Password reset delivery uses the configured Supabase Auth email settings.</p>
        <Link href="/login">Back to login</Link>
      </Card>
    </main>
  );
}
