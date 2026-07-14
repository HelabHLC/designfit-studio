const layers = [
  ["1. Scientific Foundation", "ARBE λ*_V2, deterministic reference methods, reproducibility, publications and the public arbe-lambda repository."],
  ["2. ARBE Core", "Reference Engine, Atlas Repository, AtlasFit, MixLock, Spectral Scissor, Metamerism Gate, spectral metrics and data governance."],
  ["3. Application layer", "ARBE DesignFit Studio and future applications orchestrate reference lookup, evidence generation and claim-safe responses without redefining the core."],
  ["4. Runtime data layer", "Checksum-locked, non-executable exports are loaded by trusted server infrastructure. Browser code never deserializes pickle files."],
  ["5. Controlled source layer", "Original vendor packages, ARBE Master PKL, raw measurements and restricted research libraries remain outside the public application repository."],
];

export default function ArchitecturePage() {
  return (
    <main className="content-page shell">
      <header>
        <p className="eyebrow">ARBE λ* Platform Architecture</p>
        <h1>Separation is a scientific control.</h1>
        <p className="hero-copy">Scientific definitions, reference logic, applications and controlled spectral data are deliberately isolated from one another.</p>
      </header>
      <div className="prose">
        {layers.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}
        <section><h2>Repository roles</h2><p><code>arbe-lambda</code> is the normative scientific reference. <code>designfit-studio</code> contains ARBE Core implementation, controlled runtime integration and ARBE DesignFit Studio.</p></section>
      </div>
    </main>
  );
}
