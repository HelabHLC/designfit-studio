import Link from "next/link";

const platformAreas = [
  {
    title: "Scientific Foundation",
    text: "ARBE λ*_V2, deterministic reference methods, reproducibility and the public arbe-lambda repository.",
  },
  {
    title: "ARBE Core",
    text: "Reference Engine, Atlas Repository, AtlasFit, MixLock, Spectral Scissor, Metamerism Gate and ARBE Measured.",
  },
  {
    title: "Applications",
    text: "ARBE DesignFit Studio, ARIA, Master Palette Coach, APIs and future domain-specific applications.",
  },
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header shell">
        <Link className="brand" href="/" aria-label="ARBE lambda star home">
          ARBE <span>λ*</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/documentation">Documentation</Link>
          <Link href="/glossary">Glossary</Link>
          <Link href="/architecture">Architecture</Link>
          <Link href="/status">Status</Link>
        </nav>
      </header>

      <section className="hero shell">
        <p className="eyebrow">The Reference Platform for Spectral Colour Intelligence</p>
        <h1>From colour request to defensible reference.</h1>
        <p className="hero-copy">
          ARBE λ* is an open, traceable platform for atlas-bound colour identity,
          spectral comparison, pigment-aware formulation and evidence-based
          validation. Applications are built on the platform; they do not redefine
          its scientific foundation.
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
          <strong>Colour is communication. Reference is evidence.</strong> External
          Lab, HEX, RGB, brand colours, images and descriptions are requests. A
          canonical atlas reference is the identity used by the system.
        </p>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <p className="eyebrow">Platform structure</p>
          <h2>One scientific foundation. One reference core. Many applications.</h2>
        </div>
        <div className="card-grid">
          {platformAreas.map((area) => (
            <article className="card" key={area.title}>
              <h3>{area.title}</h3>
              <p>{area.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section split shell">
        <div>
          <p className="eyebrow">Scientific reference</p>
          <h2>ARBE λ*_V2 remains independently specified.</h2>
        </div>
        <div>
          <p>
            The normative ARBE λ*_V2 definition and deterministic reference work
            remain in the public <code>arbe-lambda</code> repository. ARBE DesignFit
            Studio implements that reference; it does not silently redefine it.
          </p>
          <a className="text-link" href="https://github.com/HelabHLC/arbe-lambda">
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
        <p>ARBE λ* development preview</p>
        <p>Evidence before claims. Provenance before publication.</p>
      </footer>
    </main>
  );
}
