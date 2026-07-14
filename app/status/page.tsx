const milestones = [
  ["Reference core", "Implemented", "Canonical identity validation, evidence types and explicit candidate-versus-lock handling."],
  ["Atlas repository", "Implemented", "Versioned reference ingestion, strict validation and candidate search foundation."],
  ["Master ingestion", "Implemented", "Checksum-locked offline PKL ingestion and verified non-executable runtime export."],
  ["Data governance", "Implemented", "OPEN_REFERENCE, ARBE_MEASURED and RESTRICTED_INTERNAL publication boundaries."],
  ["ARBE.org public layer", "In progress", "Public landing page, documentation, glossary, architecture and status."],
  ["Runtime AtlasFit", "Next", "Server-side loading of the verified master export and the first live application search."],
  ["MixLock and Scissor", "Foundation", "Core spectral and Kubelka–Munk primitives exist; validated production workflows remain under development."],
  ["ARBE Measured v0.1", "Prepared", "Protocol, 36-sample acquisition set and PB29 pilot structure await real measurement data."],
];

export default function StatusPage() {
  return (
    <main className="content-page shell">
      <header><p className="eyebrow">Project status</p><h1>Beyond the idea phase.</h1><p className="hero-copy">The platform has a tested reference and data foundation. It is not yet a finished public production service.</p></header>
      <div className="status-grid">
        <div className="status-item"><strong>13,283</strong><span>validated master references</span></div>
        <div className="status-item"><strong>36</strong><span>spectral bands, 380–730 nm</span></div>
        <div className="status-item"><strong>0</strong><span>invalid or duplicate master IDs</span></div>
      </div>
      <div className="prose" style={{ marginTop: 60 }}>
        {milestones.map(([title, state, text]) => <section key={title}><p className="eyebrow">{state}</p><h2>{title}</h2><p>{text}</p></section>)}
        <section><h2>Claim boundary</h2><p>This page reports implementation progress. It does not claim production approval, certification or universal material feasibility.</p></section>
      </div>
    </main>
  );
}
