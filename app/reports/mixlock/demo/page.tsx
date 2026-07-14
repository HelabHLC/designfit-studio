import Link from "next/link";
import { demoMixLockReport as report } from "@/src/core/reporting/demo-report";

function Percent({ value }: { value: number }) {
  return <>{(value * 100).toFixed(1)}%</>;
}

export default function MixLockReportDemoPage() {
  const locked = report.finalVerdict === "FINAL_REFERENCE_LOCK";

  return (
    <main className="report-page">
      <header className="site-header shell report-nav">
        <Link className="brand" href="/">ARBE <span>λ*</span></Link>
        <nav aria-label="Report navigation">
          <Link href="/">Platform</Link>
          <a href="#audit">Audit</a>
          <button type="button" onClick={undefined} className="print-button">Print / PDF</button>
        </nav>
      </header>

      <article className="report-shell">
        <section className="report-cover">
          <p className="eyebrow">ARBE λ* Platform Beta · Work Package 01</p>
          <h1>MixLock Report</h1>
          <p className="report-subtitle">Deterministic reference-validation record</p>
          <div className={`verdict-panel ${locked ? "is-locked" : "is-unlocked"}`}>
            <span>Final verdict</span>
            <strong>{locked ? "REFERENCE LOCKED" : "NOT FINAL"}</strong>
            <p>{report.finalStatus}</p>
          </div>
          <div className="report-meta-grid">
            <div><span>Target reference</span><strong>{report.targetReference}</strong></div>
            <div><span>Decision confidence</span><strong>{report.confidence}</strong></div>
            <div><span>Metamerism</span><strong>{report.metamerism.classification}</strong></div>
            <div><span>Report ID</span><strong>{report.reportId}</strong></div>
          </div>
        </section>

        <section className="report-section">
          <div className="report-section-heading"><span>01</span><div><p className="eyebrow">Request and binding</p><h2>Request is not identity.</h2></div></div>
          <div className="report-two-column">
            <div className="report-card"><span>User request</span><strong>{report.request.type}</strong><p>{report.request.value}</p><small>{report.request.identityRule}</small></div>
            <div className="report-card accent-card"><span>Bound ARBE reference</span><strong>{report.targetReference}</strong><p>Nearest Master reference: {report.reference.nearestReference}</p><small>Target rank {report.reference.targetRank}</small></div>
          </div>
        </section>

        <section className="report-section">
          <div className="report-section-heading"><span>02</span><div><p className="eyebrow">Candidate space</p><h2>Recipe 1 → correction → Recipe 2</h2></div></div>
          <div className="recipe-flow">
            <div className="recipe-block"><h3>Initial candidate</h3>{report.recipe1.map((item) => <p key={item.pigmentId}><span>{item.pigmentId}</span><strong><Percent value={item.weight} /></strong></p>)}</div>
            <div className="flow-arrow">→</div>
            <div className="recipe-block scissor-block"><h3>Spectral Scissor</h3><p><span>Crossings</span><strong>{report.scissor.crossingsBefore} → {report.scissor.crossingsAfter}</strong></p><p><span>Structural drift</span><strong>{report.scissor.driftStatus}</strong></p></div>
            <div className="flow-arrow">→</div>
            <div className="recipe-block"><h3>Second recipe</h3>{report.recipe2.map((item) => <p key={item.pigmentId}><span>{item.pigmentId}</span><strong><Percent value={item.weight} /></strong></p>)}</div>
          </div>
        </section>

        <section className="report-section">
          <div className="report-section-heading"><span>03</span><div><p className="eyebrow">Structural evidence</p><h2>The curve decides.</h2></div></div>
          <div className="metric-grid">
            <div><span>λ*_V2</span><strong>{report.scissor.lambdaV2Nm.toFixed(2)} nm</strong></div>
            <div><span>λEE</span><strong>{report.scissor.lambdaEeNm.toFixed(2)} nm</strong></div>
            <div><span>Δλ*</span><strong>{report.scissor.deltaLambdaNm.toFixed(2)} nm</strong></div>
            <div><span>Master Δλ*</span><strong>{report.scissor.masterDeltaLambdaNm.toFixed(2)} nm</strong></div>
            <div className="metric-emphasis"><span>ΔΔλ*</span><strong>{report.scissor.deltaDeltaLambdaNm.toFixed(2)} nm</strong></div>
            <div className="metric-emphasis"><span>Status</span><strong>{report.scissor.driftStatus}</strong></div>
          </div>
        </section>

        <section className="report-section">
          <div className="report-section-heading"><span>04</span><div><p className="eyebrow">Metamerism Gate</p><h2>Reference lock under documented light evidence.</h2></div></div>
          <div className="metamerism-table" role="table" aria-label="Metamerism evaluations">
            <div className="table-row table-head" role="row"><span>Illuminant</span><span>ΔE00</span><span>Classification</span></div>
            {report.metamerism.evaluations.map((item) => <div className="table-row" role="row" key={item.illuminant}><strong>{item.illuminant}</strong><span>{item.deltaE00.toFixed(2)}</span><span>{item.deltaE00 === report.metamerism.maximumDeltaE00 ? "Maximum" : "Within set"}</span></div>)}
          </div>
          <p className="report-note">Maximum observed ΔE00: <strong>{report.metamerism.maximumDeltaE00.toFixed(2)}</strong> under <strong>{report.metamerism.maximumIlluminant}</strong>. Classification: <strong>{report.metamerism.classification}</strong>.</p>
        </section>

        <section className="report-section final-section">
          <p className="eyebrow">Final decision</p>
          <h2>{locked ? "REFERENCE VALIDATION PASSED" : "REFERENCE VALIDATION NOT FINAL"}</h2>
          <p>The result documents reference binding within the stated ARBE λ* runtime, dataset and evidence boundaries.</p>
          <div className="decision-grid"><div><span>Identity</span><strong>{locked ? "VALID" : "NOT FINAL"}</strong></div><div><span>MixLock</span><strong>{locked ? "PASSED" : "UNLOCKED"}</strong></div><div><span>Production approval</span><strong>NO</strong></div><div><span>Reference validation</span><strong>{locked ? "YES" : "NO"}</strong></div></div>
        </section>

        <section className="report-section" id="audit">
          <div className="report-section-heading"><span>05</span><div><p className="eyebrow">Audit trail</p><h2>Reproducible provenance.</h2></div></div>
          <dl className="audit-list">
            <div><dt>Runtime</dt><dd>{report.audit.runtimeVersion}</dd></div>
            <div><dt>Runtime commit</dt><dd><code>{report.audit.runtimeCommit}</code></dd></div>
            <div><dt>Dataset</dt><dd>{report.audit.datasetId}</dd></div>
            <div><dt>Dataset SHA-256</dt><dd><code>{report.audit.datasetSha256}</code></dd></div>
            <div><dt>λ*_V2 method</dt><dd>{report.audit.lambdaV2Method}</dd></div>
            <div><dt>Generated</dt><dd>{report.generatedAt}</dd></div>
          </dl>
          <div className="claim-boundary"><strong>Claim boundary</strong>{report.limitations.map((item) => <p key={item}>{item}</p>)}</div>
        </section>
      </article>
    </main>
  );
}
