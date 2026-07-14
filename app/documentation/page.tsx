import Link from "next/link";

export default function DocumentationPage() {
  return (
    <main className="content-page shell">
      <header>
        <p className="eyebrow">Documentation</p>
        <h1>The ARBE foundation</h1>
        <p className="hero-copy">A public introduction to the reference rules, evidence boundaries and current implementation layers.</p>
      </header>
      <div className="prose">
        <section><h2>Identity rule</h2><p>Only canonical references matching <code>Hxxx_Lxxx_Cxxx</code> are treated as ARBE colour identities. Lab, HEX, RGB, names, images and descriptions remain requests or communication values.</p></section>
        <section><h2>Evidence rule</h2><p>A candidate is not a lock. A colour difference is not a root-cause diagnosis. A computed mixture is not production approval. Every status must expose its evidence and its limits.</p></section>
        <section><h2>Reference foundation</h2><p>The HLC Colour Atlas XL is preserved with publisher, version, source and licence metadata. ARBE does not relabel third-party reference data as ARBE-owned.</p></section>
        <section><h2>Scientific definition</h2><p>The normative λ*_V2 definition remains in the independent <a className="text-link" href="https://github.com/HelabHLC/arbe-lambda">arbe-lambda repository</a>. DesignFit Studio is an implementation layer.</p></section>
        <section><h2>Continue</h2><p><Link className="text-link" href="/architecture">Review the architecture →</Link></p></section>
      </div>
    </main>
  );
}
