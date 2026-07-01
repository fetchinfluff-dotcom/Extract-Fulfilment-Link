import Link from "next/link";
import { Card, Field } from "@listingforge/ui";
import { signInAction, signOutAction, signUpAction } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const params = await searchParams;
  return (
    <main className="shell">
      <div className="nav"><Link href="/">ListingForge</Link></div>
      <Card>
        <h1>Login or sign up</h1>
        <p className="muted">Use your ListingForge account to keep projects separated by workspace.</p>
        {params.error ? <p className="lf-badge lf-badge-bad">{params.error}</p> : null}
        {params.notice ? <p className="lf-badge lf-badge-good">{params.notice}</p> : null}
        <form className="grid" action={signInAction}>
          <Field label="Email"><input name="email" type="email" required placeholder="you@example.com" /></Field>
          <Field label="Password"><input name="password" type="password" required minLength={6} placeholder="Password" /></Field>
          <button className="lf-button" type="submit">Login</button>
          <button className="lf-button secondary" formAction={signUpAction}>Create account</button>
          <Link href="/reset">Reset password</Link>
        </form>
        <form action={signOutAction} className="stack-top">
          <button className="lf-button secondary" type="submit">Log out on this device</button>
        </form>
      </Card>
    </main>
  );
}
