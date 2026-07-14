const layers = [
  ["1. Public knowledge layer", "ARBE.org pages, terminology, specifications, provenance statements and public project status."],
  ["2. Application layer", "Server-side services that orchestrate reference lookup, candidate search, evidence generation and claim-safe responses."],
  ["3. Domain core", "Reference Engine, Atlas Repository, spectral metrics, Kubelka–Munk primitives, data governance and measurement validation."],
  ["4. Runtime data layer", "Checksum-locked, non-executable exports loaded by trusted server infrastructure. Browser code never deserializes pickle files."],
  ["5. Controlled source layer", "Original vendor packages, ARBE Master PKL, raw measurements and restricted research libraries stored outside the public application repository."],
];

export default function ArchitecturePage() {
  return (
    <main className="content-page shell">
      <header><p className="eyebrow">Architecture</p><h1>Separation is a scientific control.</h1><p className="hero-copy">Public documentation, executable logic and controlled spectral data are deliberately isolated from one another.</p></header>
      <div className="prose">
        {layers.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}
        <section><h2>Repository roles</h2><p><code>arbe-lambda</code> is the normative scientific reference. <code>designfit-studio</code> is the ARBE.org application and controlled runtime integration layer.</p></section>
      </div>
    </main>
  );
}
