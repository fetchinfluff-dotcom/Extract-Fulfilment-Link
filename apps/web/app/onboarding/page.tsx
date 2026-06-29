import Link from "next/link";
import { Card, Field } from "@listingforge/ui";

export default function OnboardingPage() {
  return (
    <main className="shell">
      <h1>Onboarding</h1>
      <div className="grid two">
        <Card><Field label="Default market"><select defaultValue="US"><option>US</option><option>UK</option><option>CA</option><option>AU</option></select></Field></Card>
        <Card><Field label="Brand tone"><input defaultValue="Clear, helpful, conservative" /></Field></Card>
      </div>
      <p><Link className="lf-button" href="/new">Import first product</Link></p>
    </main>
  );
}
