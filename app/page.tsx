import Link from "next/link";

const journey = [
  ["01", "Create", "Begin with an image, moodboard, prompt or existing palette. Creative intent stays open before reference binding begins."],
  ["02", "Explore", "Review dominant colours, atmosphere, contrast, material cues and palette relationships without mistaking appearance for identity."],
  ["03", "Reference", "Bind colour requests to canonical HLC references and expose candidate, lock and evidence status through ARBE Core."],
  ["04", "Produce", "Carry validated references into pigment, material, measurement and production workflows with explicit limits."],
];

const layers = [
  ["DesignFit Studio", "The creative workspace where ideas become palettes and colour requests."],
  ["ARBE Core", "Reference Engine, Atlas Repository, AtlasFit, MixLock, Spectral Scissor and Metamerism Gate."],
  ["Evidence", "Traceable reference, curve, material and validation records that distinguish a candidate from a final lock."],
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header shell">
        <Link className="brand" href="/" aria-label="ARBE lambda star home">
          ARBE <span>λ*</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/create">Create</Link>
          <Link href="/reference">Reference</Link>
          <Link href="/materials">Materials</Link>
          <Link href="/technology">Technology</Link>
          <Link href="/platform">Platform</Link>
          <Link href="/status">Status</Link>
        </nav>
      </header>

      <section className="hero shell">
        <p className="eyebrow">The Creative Reference Platform for Spectral Colour Intelligence</p>
        <h1>Create without limits. Validate with evidence.</h1>
        <p className="hero-copy">
          ARBE λ* connects creative colour intent with canonical reference identity,
          spectral evidence and material-aware validation. Design begins freely in
          ARBE DesignFit Studio; ARBE Core then makes every reference claim explicit.
        </p>
        <div className="actions">
          <Link className="button primary" href="/create">Enter the creative workflow</Link>
          <Link className="button secondary" href="/reference">See how reference works</Link>
        </div>
      </section>

      <section className="statement shell">
        <p><strong>The designer creates. The reference guides. The curve decides.</strong></p>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <p className="eyebrow">From inspiration to production</p>
          <h2>A creative journey with a scientific gate.</h2>
        </div>
        <div className="journey-grid">
          {journey.map(([number, title, text]) => (
            <article className="journey-card" key={title}>
              <span>{number}</span><h3>{title}</h3><p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <p className="eyebrow">Platform layers</p>
          <h2>Creative freedom above. Audit discipline below.</h2>
        </div>
        <div className="card-grid three">
          {layers.map(([title, text]) => <article className="card" key={title}><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="section split shell">
        <div><p className="eyebrow">Identity rule</p><h2>A colour request is not yet a colour identity.</h2></div>
        <div><p>Images, HEX, RGB, Lab values, names and descriptions can begin the workflow. Only a canonical <code>Hxxx_Lxxx_Cxxx</code> reference can become an ARBE colour identity, and only the required evidence can qualify a reference lock.</p></div>
      </section>

      <footer className="site-footer shell">
        <p>ARBE DesignFit Studio — Creative Workspace powered by ARBE λ*</p>
        <p>Design freely. Reference precisely. Produce confidently.</p>
      </footer>
    </main>
  );
}
