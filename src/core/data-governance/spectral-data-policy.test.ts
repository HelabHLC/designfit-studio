import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePublication } from "./spectral-data-policy";

const base = {
  datasetId: "example",
  title: "Example",
  version: "0.1",
  sourceName: "example.dat",
  recordCount: 1,
  wavelengthsNm: [380, 390, 400],
  sourceSha256: "0".repeat(64),
} as const;

test("blocks restricted internal datasets", () => {
  const decision = evaluatePublication({
    ...base,
    dataClass: "RESTRICTED_INTERNAL",
    redistributionConfirmed: false,
  });

  assert.equal(decision.allowed, false);
});

test("blocks open data without confirmed redistribution rights", () => {
  const decision = evaluatePublication({
    ...base,
    dataClass: "OPEN_REFERENCE",
    licenceId: "CC-BY-4.0",
    redistributionConfirmed: false,
  });

  assert.equal(decision.allowed, false);
});

test("allows confirmed ARBE-measured data", () => {
  const decision = evaluatePublication({
    ...base,
    dataClass: "ARBE_MEASURED",
    redistributionConfirmed: true,
    measurementOwner: "ARBE",
    licenceId: "TBD",
  });

  assert.equal(decision.allowed, true);
});
