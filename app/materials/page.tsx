const materialLayers = [
  ["Material candidate", "A named pigment, paint, ink, textile, coating or substrate proposed for evaluation."],
  ["Provenance", "Manufacturer, product line, batch, source, licence status and measurement conditions."],
  ["Spectral evidence", "Measured or modelled reflectance with explicit grid, geometry, substrate and method limits."],
  ["Validation", "AtlasFit, Spectral Scissor and metamerism evidence reported separately from creative intent."],
];

export default function MaterialsPage() {
  return (
    <main className="content-page shell">
      <header>
        <p className="eyebrow">Materials</p>
        <h1>Move from colour intention to material evidence.</h1>
        <p className="hero-copy">
          ARBE λ* does not treat a colour name or recipe suggestion as physical proof.
          Material candidates remain provisional until their provenance and curve
          evidence are available.
        </p>
      </header>
      <div className="prose">
        {materialLayers.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        <section>
          <h2>Data boundary</h2>
          <p>
            Third-party pigment and material libraries remain local or restricted
            unless redistribution rights are explicit. Public application code must
            not imply ownership, certification or bundled access.
          </p>
        </section>
      </div>
    </main>
  );
}
