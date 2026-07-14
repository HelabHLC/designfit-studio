const layers = [
  ["Creative Workspace", "ARBE DesignFit Studio begins with inspiration, design intent, palette exploration, light and material ideas."],
  ["ARBE Core", "Reference Engine, Atlas Repository, AtlasFit, MixLock, Spectral Scissor, Metamerism Gate and ARBE Measured."],
  ["Scientific Foundation", "ARBE λ*_V2 remains normatively specified and reproducible in the public arbe-lambda repository."],
  ["Applications", "ARIA, Master Palette Coach, APIs, SDKs and future domain-specific workspaces use the same reference discipline."],
];

export default function PlatformPage() {
  return (
    <main className="content-page shell">
      <header>
        <p className="eyebrow">Platform</p>
        <h1>Where design meets evidence.</h1>
        <p className="hero-copy">
          ARBE λ* connects creative exploration with a controlled reference and
          validation system. Applications use the platform; they do not redefine its
          scientific rules.
        </p>
      </header>
      <div className="prose">
        {layers.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        <section>
          <h2>Operating principle</h2>
          <p>
            The designer creates. The reference guides. The recipe is the candidate.
            The curve decides. The reference lock makes it valid. The metamerism gate
            qualifies the lock.
          </p>
        </section>
      </div>
    </main>
  );
}
