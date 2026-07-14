import Link from "next/link";

const journey = [
  ["01", "Inspiration", "Begin with an image, moodboard, prompt or material idea."],
  ["02", "Create", "Explore colour direction, atmosphere, harmony and visual intent."],
  ["03", "Reference", "Bind selected colours to canonical atlas identities through ARBE Core."],
  ["04", "Materials", "Evaluate pigment, substrate and material candidates with explicit provenance."],
  ["05", "Produce", "Validate curve evidence, metamerism status and reference-lock readiness."],
];

const principles = [
  "The designer creates.",
  "The reference guides.",
  "The recipe is the candidate.",
  "The curve decides.",
  "The reference lock makes it valid.",
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
          <Link href="/platform">Platform</Link>
          <Link href="/status">Status</Link>
        </nav>
      </header>

      <section className="hero shell">
        <p className="eyebrow">The Creative Reference Platform for Spectral Colour Intelligence</p>
        <h1>Create without limits. Validate with evidence.</h1>
        <p className="hero-copy">
          ARBE DesignFit Studio is the creative workspace of the ARBE λ* Platform.
          It connects inspiration and design intent with atlas identity, spectral
          evidence, material candidates and controlled production decisions.
        </p>
        <div className="actions">
          <Link className="button primary" href="/create">Start with an idea</Link>
          <Link className="button secondary" href="/platform">Explore the platform</Link>
        </div>
      </section>

      <section className="statement shell">
        <p><strong>Design freely. Reference precisely. Produce confidently.</strong></p>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <p className="eyebrow">The designer journey</p>
          <h2>From inspiration to defensible colour decisions.</h2>
        </div>
        <div className="journey-grid">
          {journey.map(([number, title, text]) => (
            <article className="journey-card" key={title}>
              <span>{number}</span><h3>{title}</h3><p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section split shell">
        <div><p className="eyebrow">Creative workspace</p><h2>DesignFit Studio begins with the designer.</h2></div>
        <div><p>Images, moodboards, palettes, light, materials and atmosphere form the creative input. ARBE Core works behind the workspace to preserve identity, provenance and evidence without interrupting creative exploration.</p><Link className="text-link" href="/create">Explore the creative workflow →</Link></div>
      </section>

      <section className="section split shell">
        <div><p className="eyebrow">Reference discipline</p><h2>Creativity is not approval.</h2></div>
        <div className="principle-list">{principles.map((principle) => <p key={principle}>{principle}</p>)}</div>
      </section>

      <footer className="site-footer shell">
        <p>ARBE DesignFit Studio — Creative Workspace powered by ARBE λ*</p>
        <p>Evidence before claims. Provenance before publication.</p>
      </footer>
    </main>
  );
}
