const terms = [
  ["Atlas identity", "A canonical HLC reference in the form Hxxx_Lxxx_Cxxx."],
  ["AtlasFit", "The process of routing an external request to ranked atlas candidates while preserving provenance and method details."],
  ["Reference Lock", "A validated binding to an atlas identity. A nearest candidate alone is not a lock."],
  ["λ*_V2", "A deterministic spectral balance parameter defined over measured reflectance from 380 to 730 nm using Brent root-finding."],
  ["Spectral Scissor", "A structural comparison and validation layer for identifying curve disagreement that a single colour-difference value can conceal."],
  ["MixLock", "A pigment-aware formulation workflow that reports model assumptions, recipe evidence and validation status."],
  ["OPEN_REFERENCE", "Data with confirmed rights for public storage and redistribution."],
  ["ARBE_MEASURED", "Spectral measurements created under the documented ARBE measurement protocol."],
  ["RESTRICTED_INTERNAL", "Research data that may be analysed internally but must not be published or redistributed."],
];

export default function GlossaryPage() {
  return (
    <main className="content-page shell">
      <header><p className="eyebrow">Glossary</p><h1>Terms with explicit boundaries</h1><p className="hero-copy">ARBE terminology is designed to prevent candidates, communication values and model results from being presented as validated identity or approval.</p></header>
      <div className="prose">
        {terms.map(([term, definition]) => <section key={term}><h2>{term}</h2><p>{definition}</p></section>)}
      </div>
    </main>
  );
}
