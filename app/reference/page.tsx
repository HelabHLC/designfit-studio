const stages = [
  ["Request", "Image, HEX, RGB, Lab, name or description."],
  ["Candidate", "One or more atlas references ranked with method and provenance."],
  ["Evidence", "Reference rank, spectral comparison, recipe and scissor evidence when available."],
  ["Verdict", "A strict lock, warning, risk or not-final status."],
];

export default function ReferencePage() {
  return (
    <main className="content-page shell">
      <header><p className="eyebrow">Reference</p><h1>Turn a colour idea into an auditable identity.</h1><p className="hero-copy">ARBE Core separates a useful candidate from a validated reference lock.</p></header>
      <div className="prose">
        {stages.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}
        <section><h2>Canonical rule</h2><p>Only references matching <code>Hxxx_Lxxx_Cxxx</code> are ARBE colour identities. Similarity alone is not approval.</p></section>
      </div>
    </main>
  );
}
