import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeReferenceGatewayEvidence,
  createReferenceGatewayEvidenceChain,
  verifyReferenceGatewayEvidenceChain,
} from "./evidence-chain";
import type { ReferenceGatewayResult } from "./types";

const result: ReferenceGatewayResult = {
  status: "REFERENCE_BOUND",
  request: { kind: "HEX", value: "#336699", identityRule: "REQUEST_ONLY" },
  boundReference: "H250_L040_C030",
  candidates: [
    { rank: 1, reference: "H250_L040_C030", distance: 1.25, method: "CIE76" },
    { rank: 2, reference: "H250_L045_C030", distance: 4.5, method: "CIE76" },
  ],
  bindingMethod: "HEX_SRGB_TO_LAB_D50_CIE76_MASTER_SEARCH",
  conversionEvidence: {
    sourceSpace: "SRGB_IEC61966_2_1",
    destinationSpace: "CIELAB_D50",
    lab: { l: 41.52, a: -4.57, b: -33.49 },
    method: "SRGB_IEC61966_2_1_TO_LAB_D50_BRADFORD",
  },
  availableActions: ["REFERENCE", "MIXLOCK", "PALETTE", "PIGMENTS", "REPORT"],
  claimBoundary: "Request binding only; no spectral or production approval.",
  limitations: ["CIE76 routing does not replace spectral validation."],
};

test("creates a deterministic ordered evidence chain", () => {
  const first = createReferenceGatewayEvidenceChain(result);
  const second = createReferenceGatewayEvidenceChain(result);

  assert.equal(first.integrity.payloadSha256, second.integrity.payloadSha256);
  assert.deepEqual(first.payload.steps.map((step) => step.sequence), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(first.payload.steps.map((step) => step.kind), [
    "REQUEST_ACCEPTED",
    "REQUEST_NORMALIZED",
    "COLORSPACE_TRANSFORMED",
    "MASTER_CANDIDATES_RANKED",
    "REFERENCE_OUTCOME_RECORDED",
    "CLAIM_BOUNDARY_RECORDED",
  ]);
  assert.equal(first.payload.outcome.boundReference, "H250_L040_C030");
  assert.equal(verifyReferenceGatewayEvidenceChain(first), true);
});

test("canonicalization is independent of object key insertion order", () => {
  const chain = createReferenceGatewayEvidenceChain(result);
  const reordered = {
    limitations: chain.payload.limitations,
    claimBoundary: chain.payload.claimBoundary,
    outcome: chain.payload.outcome,
    steps: chain.payload.steps,
    requestKind: chain.payload.requestKind,
    schemaVersion: chain.payload.schemaVersion,
  } as const;

  assert.equal(
    canonicalizeReferenceGatewayEvidence(chain.payload),
    canonicalizeReferenceGatewayEvidence(reordered),
  );
});

test("detects payload tampering", () => {
  const chain = createReferenceGatewayEvidenceChain(result);
  const tampered = structuredClone(chain);
  (tampered.payload.outcome as { boundReference?: string }).boundReference = "H000_L000_C000";

  assert.equal(verifyReferenceGatewayEvidenceChain(tampered), false);
});

test("deep-freezes the produced evidence chain", () => {
  const chain = createReferenceGatewayEvidenceChain(result);
  assert.equal(Object.isFrozen(chain), true);
  assert.equal(Object.isFrozen(chain.payload), true);
  assert.equal(Object.isFrozen(chain.payload.steps), true);
  assert.equal(Object.isFrozen(chain.payload.steps[0]), true);
});
