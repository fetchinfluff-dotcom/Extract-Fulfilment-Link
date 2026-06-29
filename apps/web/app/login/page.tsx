import Link from "next/link";
import { Card, Field } from "@listingforge/ui";

export default function LoginPage() {
  return (
    <main className="shell">
      <div className="nav"><Link href="/">ListingForge</Link></div>
      <Card>
        <h1>Login or sign up</h1>
        <p className="muted">Supabase Auth is the production path. Local MVP uses a demo workspace so the vertical slice runs without hosted credentials.</p>
        <div className="grid">
          <Field label="Email"><input type="email" placeholder="you@example.com" /></Field>
          <Field label="Password"><input type="password" placeholder="Password" /></Field>
          <Link className="lf-button" href="/dashboard">Continue as demo user</Link>
          <Link href="/reset">Reset password</Link>
        </div>
      </Card>
    </main>
  );
}
