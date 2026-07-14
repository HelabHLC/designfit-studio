import Link from "next/link";

const capabilities = [
  {
    title: "Reference Engine",
    text: "Binds colour requests to canonical HLC atlas identities instead of treating RGB, HEX or names as final colour identities.",
  },
  {
    title: "AtlasFit",
    text: "Ranks atlas candidates, preserves provenance and separates a useful candidate from a validated reference lock.",
  },
  {
    title: "Spectral evaluation",
    text: "Compares reflectance structure, balance, asymmetry and curve behaviour rather than reducing every decision to one distance number.",
  },
  {
    title: "MixLock",
    text: "Develops pigment-aware mixture evidence with explicit model limits, traceable inputs and independent validation.",
  },
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header shell">
        <Link className="brand" href="/" aria-label="ARBE.org home">
          ARBE<span>.org</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/documentation">Documentation</Link>
          <Link href="/glossary">Glossary</Link>
          <Link href="/architecture">Architecture</Link>
          <Link href="/status">Status</Link>
        </nav>
      </header>

      <section className="hero shell">
        <p className="eyebrow">Reference-bound spectral colour intelligence</p>
        <h1>From colour request to defensible reference.</h1>
        <p className="hero-copy">
          ARBE is building an open, traceable framework for atlas-bound colour
          decisions, spectral comparison and pigment-aware formulation. The
          platform distinguishes communication values from colour identity and
          evidence from approval.
        </p>
        <div className="actions">
          <Link className="button primary" href="/documentation">
            Read the foundation
          </Link>
          <Link className="button secondary" href="/status">
            View project status
          </Link>
        </div>
      </section>

      <section className="statement shell">
        <p>
          <strong>ARBE does not invent colour identity.</strong> External Lab,
          HEX, RGB, brand colours, images and descriptions are requests. A
          canonical atlas reference is the identity used by the system.
        </p>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <p className="eyebrow">Core capabilities</p>
          <h2>A layered system, not a single score.</h2>
        </div>
        <div className="card-grid">
          {capabilities.map((capability) => (
            <article className="card" key={capability.title}>
              <h3>{capability.title}</h3>
              <p>{capability.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section split shell">
        <div>
          <p className="eyebrow">Scientific reference</p>
          <h2>λ*_V2 remains independently specified.</h2>
        </div>
        <div>
          <p>
            The normative λ*_V2 definition and deterministic reference work
            remain in the public <code>arbe-lambda</code> repository. ARBE.org
            and DesignFit Studio implement that reference; they do not silently
            redefine it.
          </p>
          <a
            className="text-link"
            href="https://github.com/HelabHLC/arbe-lambda"
          >
            Open the scientific repository →
          </a>
        </div>
      </section>

      <section className="section split shell">
        <div>
          <p className="eyebrow">Data boundary</p>
          <h2>Public code. Controlled data.</h2>
        </div>
        <div className="data-classes">
          <p><strong>OPEN_REFERENCE</strong> — confirmed public reference data.</p>
          <p><strong>ARBE_MEASURED</strong> — measurements created under the ARBE protocol.</p>
          <p><strong>RESTRICTED_INTERNAL</strong> — research data that must not be redistributed.</p>
        </div>
      </section>

      <footer className="site-footer shell">
        <p>ARBE.org development preview</p>
        <p>Evidence before claims. Provenance before publication.</p>
      </footer>
    </main>
  );
}
