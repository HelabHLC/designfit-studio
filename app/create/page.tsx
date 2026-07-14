const inputs = ["Image", "Moodboard", "Prompt", "Existing palette", "Material sample", "Measured colour request"];

export default function CreatePage() {
  return (
    <main className="content-page shell">
      <header>
        <p className="eyebrow">Create</p>
        <h1>Start with intent, not with a constraint.</h1>
        <p className="hero-copy">ARBE DesignFit Studio begins where designers begin: with inspiration, atmosphere, form, material and colour relationships.</p>
      </header>
      <div className="prose">
        <section><h2>Creative inputs</h2><div className="chip-row">{inputs.map((input) => <span className="chip" key={input}>{input}</span>)}</div></section>
        <section><h2>What the system may derive</h2><p>Dominant colour requests, palette structure, contrast, hierarchy, mood and material cues. These are exploratory outputs, not final ARBE identities.</p></section>
        <section><h2>Gate to reference</h2><p>When a designer chooses to validate a colour direction, the request moves to ARBE Core for canonical atlas binding and evidence generation.</p></section>
      </div>
    </main>
  );
}
