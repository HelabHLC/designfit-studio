import assert from "node:assert/strict";
import test from "node:test";
import fixture from "../../../fixtures/mixlock-kb-v0.5/H075_L080_C100.acceptance.json";
import manifest from "../../../fixtures/mixlock-kb-v0.5/manifest.json";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

test("registers the no-data KB archive with immutable source provenance", () => {
  assert.equal(manifest.kbVersion, "0.5");
  assert.equal(manifest.sourceArchive.rawDataIncluded, false);
  assert.match(manifest.sourceArchive.sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.masterAtlas.recordCount, 13283);
  assert.equal(manifest.masterAtlas.redistributed, false);
  assert.equal(manifest.candidateSpace.redistributed, false);
});

test("accepts only a canonical ARBE identity in the golden fixture", () => {
  assert.match(fixture.reference, REFERENCE_PATTERN);
  assert.equal(fixture.baselinePigmentsLock.atlasBinding, fixture.reference);
  assert.equal(fixture.scissorProbe.targetAfterCorrection, fixture.reference);
  assert.equal(fixture.scissoredTargetCurveMix.atlasBinding, fixture.reference);
});

test("freezes the baseline reference lock and metamerism verdict", () => {
  const baseline = fixture.baselinePigmentsLock;
  assert.equal(baseline.nearestReference, fixture.reference);
  assert.equal(baseline.targetRank, 1);
  assert.equal(baseline.lockStatus, "REFERENCE_LOCKED");
  assert.equal(baseline.finalVerdict, "REFERENCE_LOCKED_METAMERISM_LOW");
  assert.equal(baseline.metamerismGateStatus, baseline.finalVerdict);
});

test("freezes the v0.4 Scissor probe as unlocked at the default 5 nm gate", () => {
  const scissor = fixture.scissorProbe;
  assert.equal(scissor.crossingsBefore, 8);
  assert.equal(scissor.crossingsAfterV04, 0);
  assert.equal(scissor.nearestAfterCorrection, fixture.reference);
  assert.equal(scissor.driftStatus, "WATCH");
  assert.ok(Math.abs(scissor.deltaDeltaLambdaNm) > scissor.defaultAllowedLambdaDriftNm);
  assert.equal(scissor.scissorStatusDefaultGate, "SCISSOR_UNLOCKED");
});

test("freezes the second recipe result without overstating final production approval", () => {
  const second = fixture.scissoredTargetCurveMix;
  assert.equal(second.nearestReference, fixture.reference);
  assert.equal(second.targetRank, 1);
  assert.equal(second.lockStatus, "REFERENCE_LOCKED");
  assert.equal(second.finalVerdict, "REFERENCE_LOCKED_METAMERISM_WARNING");
  assert.equal(second.metamerismGateStatus, second.finalVerdict);
  assert.equal(second.candidateVsScissorTargetCrossings, 4);
});
