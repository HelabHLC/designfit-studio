import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryReferenceRepository,
  ReferenceEngine,
  ReferenceNotFoundError,
  isAtlasId,
} from "./index";

const repository = new InMemoryReferenceRepository([
  {
    id: "ref-001",
    atlasId: "H005_L085_C010",
    label: "Atlas sample",
    lab: { l: 85, a: 4, b: 1 },
    evidence: "PROXY",
    source: "HLC Colour Atlas XL reference layer",
    version: "0.1",
  },
]);

const engine = new ReferenceEngine(repository);

test("validates canonical atlas identifiers", () => {
  assert.equal(isAtlasId("H005_L085_C010"), true);
  assert.equal(isAtlasId("#E8CED3"), false);
});

test("returns a structured reference explanation", async () => {
  const explanation = await engine.explain("H005_L085_C010");

  assert.equal(explanation.status, "REFERENCE_CANDIDATE");
  assert.equal(explanation.hasLab, true);
  assert.equal(explanation.hasSpectrum, false);
  assert.ok(explanation.limitations.length > 0);
});

test("rejects missing references", async () => {
  await assert.rejects(
    () => engine.require("H000_L000_C000"),
    ReferenceNotFoundError,
  );
});
