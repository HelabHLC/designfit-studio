const inputs = [
  ["Image", "Begin with a photograph, artwork, product image or visual reference."],
  ["Moodboard", "Collect atmosphere, material, light and colour direction before fixing identity."],
  ["Prompt", "Describe intent, context, audience, material character and desired emotional effect."],
  ["Palette", "Start from an existing palette while keeping every external value classified as a request."],
];

export default function CreatePage() {
  return (
    <main className="content-page shell">
      <header>
        <p className="eyebrow">Create</p>
        <h1>Start with the idea, not the measurement.</h1>
        <p className="hero-copy">
          DesignFit Studio gives designers a free creative entry point. ARBE Core
          becomes active when a colour direction is selected for reference binding.
        </p>
      </header>
      <div className="card-grid">
        {inputs.map(([title, text]) => (
          <article className="card" key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="prose" style={{ marginTop: 60 }}>
        <section>
          <h2>Creative boundary</h2>
          <p>
            Generated images, extracted HEX values, Lab coordinates, colour names and
            visual descriptions remain creative requests. They do not become ARBE
            colour identities until they are bound to a canonical atlas reference.
          </p>
        </section>
      </div>
    </main>
  );
}
