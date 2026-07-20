import assert from "node:assert/strict";
import test from "node:test";

import { qualifyFeasibility } from "./qualification-engine";
import { createProductionQualificationEvidencePackage } from "./production-qualification-evidence-package";
import { verifyProductionQualificationEvidencePackage } from "./production-qualification-evidence-verifier";
import { createProductionQualificationReport } from "./production-qualification-report";

function qualification(reverse = false) {
  const evidence = [
    { evidenceId: "ev.reference", evidenceType: "SPECTRAL_REFERENCE" as const, source: "HLC Atlas", referenceId: "hlc.h030_l060_c040" },
    { evidenceId: "ev.recipe", evidenceType: "RECIPE_PREDICTION" as const, source: "synthetic prediction" },
    { evidenceId: "ev.fastness", evidenceType: "FASTNESS_PREDICTION" as const, source: "synthetic prediction" },
  ];
  const criteria = [
    { criterionId: "colour-tolerance", title: "Colour tolerance", required: true, result: "PASS" as const, evidenceIds: ["ev.recipe", "ev.reference"] },
    { criterionId: "fastness", title: "Fastness", required: true, result: "PASS" as const, evidenceIds: ["ev.fastness"] },
  ];
  return qualifyFeasibility({
    qualificationId: "qual.h030.textile.01",
    referenceId: "hlc.h030_l060_c040",
    context: {
      materialSystem: "polyester textile",
      substrate: "woven polyester",
      colorantSystem: "disperse dyes",
      processRoute: "high-temperature exhaust dyeing",
      illuminants: reverse ? ["A", "D65"] : ["D65", "A"],
      toleranceDeltaE00: 1,
      requiredFastness: { washing: "4", light: "6" },
    },
    evidence: reverse ? [...evidence].reverse() : evidence,
    criteria: reverse ? [...criteria].reverse() : criteria,
  });
}

test("builds and independently verifies a deterministic WP14.1 package", () => {
  const first = createProductionQualificationEvidencePackage(qualification());
  const second = createProductionQualificationEvidencePackage(qualification());
  const verification = verifyProductionQualificationEvidencePackage(first);

  assert.equal(first.schemaVersion, "ARBE_PRODUCTION_QUALIFICATION_EVIDENCE_PACKAGE_V1");
  assert.equal(first.packageSha256, second.packageSha256);
  assert.equal(first.payload.artifacts.length, 7);
  assert.equal(verification.status, "VERIFIED");
  assert.equal(verification.failedFindingCount, 0);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.payload.artifacts), true);
});

test("rejects malformed non-package input", () => {
  const verification = verifyProductionQualificationEvidencePackage({ schemaVersion: "WRONG" });
  assert.equal(verification.status, "REJECTED");
  assert.deepEqual(verification.findings.map((item) => item.checkId), ["SCHEMA"]);
});

test("detects report and package tampering", () => {
  const tampered = structuredClone(createProductionQualificationEvidencePackage(qualification())) as any;
  tampered.payload.report.headline = "Tampered production claim";
  const verification = verifyProductionQualificationEvidencePackage(tampered);

  assert.equal(verification.status, "REJECTED");
  assert.equal(verification.findings.find((item) => item.checkId === "PACKAGE_INTEGRITY")?.status, "FAIL");
  assert.equal(verification.findings.find((item) => item.checkId === "REPORT_INTEGRITY")?.status, "FAIL");
});

test("detects artifact manifest tampering even when package hash is stale", () => {
  const tampered = structuredClone(createProductionQualificationEvidencePackage(qualification())) as any;
  tampered.payload.artifacts[0].sha256 = "0".repeat(64);
  const verification = verifyProductionQualificationEvidencePackage(tampered);

  assert.equal(verification.status, "REJECTED");
  assert.equal(verification.findings.find((item) => item.checkId === "ARTIFACT_MANIFEST")?.status, "FAIL");
});

test("is reproducible across semantically equivalent input order", () => {
  const forward = createProductionQualificationEvidencePackage(qualification(false));
  const reversed = createProductionQualificationEvidencePackage(qualification(true));
  assert.equal(forward.packageSha256, reversed.packageSha256);
  assert.deepEqual(forward.payload.artifacts, reversed.payload.artifacts);
});

test("preserves the WP13 report contract and hash", () => {
  const source = qualification();
  const report = createProductionQualificationReport(source);
  const packageValue = createProductionQualificationEvidencePackage(source);

  assert.equal(packageValue.payload.report.schemaVersion, "ARBE_PRODUCTION_QUALIFICATION_REPORT_V1");
  assert.equal(packageValue.payload.reportSha256, report.reportSha256);
  assert.equal(packageValue.payload.qualificationFingerprint, report.qualificationFingerprint);
  assert.match(packageValue.payload.report.claimBoundary, /does not redefine colour identity/);
});
