import assert from "node:assert/strict";
import test from "node:test";
import type { ReferenceGatewayResult } from "./types";
import { createReferenceGatewayEvidenceChain } from "./evidence-chain";
import { createReferenceGatewayRuntimeTrace } from "./runtime-trace";

const result: ReferenceGatewayResult = {
  status: "REFERENCE_BOUND",
  request: { kind: "HEX", value: "#336699", identityRule: "REQUEST_ONLY" },
  boundReference: "H250_L050_C030",
  candidates: [{ rank: 1, reference: "H250_L050_C030", distance: 1.2, method: "CIE76" }],
  bindingMethod: "HEX_SRGB_TO_LAB_D50_CIE76_MASTER_SEARCH",
  conversionEvidence: {
    sourceSpace: "SRGB_IEC61966_2_1",
    destinationSpace: "CIELAB_D50",
    lab: { l: 42, a: -2, b: -24 },
    method: "SRGB_IEC61966_2_1_TO_LAB_D50_BRADFORD",
  },
  availableActions: ["REFERENCE", "MIXLOCK", "PALETTE", "PIGMENTS", "REPORT"],
  claimBoundary: "Request is not an ARBE identity.",
  limitations: ["No production approval."],
};

test("creates a deterministic ordered runtime trace from evidence", () => {
  const chain = createReferenceGatewayEvidenceChain(result);
  const left = createReferenceGatewayRuntimeTrace(chain);
  const right = createReferenceGatewayRuntimeTrace(chain);
  assert.deepEqual(left, right);
  assert.equal(left.sourceEvidenceSha256, chain.integrity.payloadSha256);
  assert.deepEqual(left.entries.map((entry) => entry.sequence), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(left.entries.map((entry) => entry.stage), [
    "REQUEST",
    "NORMALIZATION",
    "TRANSFORMATION",
    "SEARCH",
    "OUTCOME",
    "GOVERNANCE",
  ]);
  assert.equal(left.terminalStatus, "REFERENCE_BOUND");
  assert.equal(left.boundReference, "H250_L050_C030");
});

test("omits transformation stage when evidence has no conversion", () => {
  const direct = createReferenceGatewayEvidenceChain({
    ...result,
    request: { kind: "REFERENCE", value: "H250_L050_C030", identityRule: "REQUEST_ONLY" },
    bindingMethod: "DIRECT_REFERENCE",
    conversionEvidence: undefined,
    candidates: [{ rank: 1, reference: "H250_L050_C030", method: "DIRECT_REFERENCE" }],
  });
  const trace = createReferenceGatewayRuntimeTrace(direct);
  assert.equal(trace.entries.some((entry) => entry.stage === "TRANSFORMATION"), false);
});

test("returns deeply frozen trace objects", () => {
  const trace = createReferenceGatewayRuntimeTrace(createReferenceGatewayEvidenceChain(result));
  assert.equal(Object.isFrozen(trace), true);
  assert.equal(Object.isFrozen(trace.entries), true);
  assert.equal(Object.isFrozen(trace.entries[0]), true);
});
