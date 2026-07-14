import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMetamerismGate } from "./evaluate";

const thresholds = { warningDeltaE00: 1, riskDeltaE00: 2 };

test("classifies low, warning and risk from maximum multi-illuminant Delta E00", () => {
  const low = evaluateMetamerismGate(
    "H075_L080_C100",
    true,
    [
      { illuminant: "D50", deltaE00: 0.2 },
      { illuminant: "D65", deltaE00: 0.8 },
    ],
    thresholds,
  );
  assert.equal(low.status, "REFERENCE_LOCKED_METAMERISM_LOW");

  const warning = evaluateMetamerismGate(
    "H075_L080_C100",
    true,
    [
      { illuminant: "D50", deltaE00: 0.2 },
      { illuminant: "A", deltaE00: 1.4 },
    ],
    thresholds,
  );
  assert.equal(warning.status, "REFERENCE_LOCKED_METAMERISM_WARNING");

  const risk = evaluateMetamerismGate(
    "H075_L080_C100",
    true,
    [
      { illuminant: "D50", deltaE00: 0.2 },
      { illuminant: "F11", deltaE00: 2.4 },
    ],
    thresholds,
  );
  assert.equal(risk.status, "REFERENCE_LOCKED_METAMERISM_RISK");
  assert.equal(risk.maximumIlluminant, "F11");
});

test("refuses to qualify evidence without a prior reference lock", () => {
  const result = evaluateMetamerismGate(
    "H075_L080_C100",
    false,
    [
      { illuminant: "D50", deltaE00: 0.1 },
      { illuminant: "D65", deltaE00: 0.2 },
    ],
    thresholds,
  );
  assert.equal(result.status, "METAMERISM_INVALID");
  assert.equal(result.verdict, "NOT_FINAL");
});

test("requires ordered thresholds and distinct illuminants", () => {
  assert.throws(
    () =>
      evaluateMetamerismGate(
        "H075_L080_C100",
        true,
        [
          { illuminant: "D50", deltaE00: 0.1 },
          { illuminant: "D50", deltaE00: 0.2 },
        ],
        thresholds,
      ),
    /Duplicate illuminant/,
  );
  assert.throws(
    () =>
      evaluateMetamerismGate(
        "H075_L080_C100",
        true,
        [
          { illuminant: "D50", deltaE00: 0.1 },
          { illuminant: "D65", deltaE00: 0.2 },
        ],
        { warningDeltaE00: 2, riskDeltaE00: 1 },
      ),
    /strictly ordered/,
  );
});
