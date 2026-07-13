import assert from "node:assert/strict";
import test from "node:test";

import { findAtlasCandidates } from "./candidate-search";
import type { AtlasDataset } from "./types";

const dataset: AtlasDataset = {
  metadata: {
    datasetId: "fixture",
    title: "Atlas candidate fixture",
    version: "test",
    source: "test fixture",
    recordCount: 3,
  },
  records: [
    {
      atlasId: "H005_L085_C010",
      lab: { l: 85, a: 9.961946981, b: 0.871557427 },
    },
    {
      atlasId: "H010_L085_C010",
      lab: { l: 85, a: 9.84807753, b: 1.736481777 },
    },
    {
      atlasId: "H000_L085_C000",
      lab: { l: 85, a: 0, b: 0 },
    },
  ],
};

test("returns an exact atlas identity first", () => {
  const candidates = findAtlasCandidates(
    dataset,
    { l: 85, a: 9.961946981, b: 0.871557427 },
    { limit: 2 },
  );

  assert.equal(candidates.length, 2);
  assert.equal(candidates[0]?.record.atlasId, "H005_L085_C010");
  assert.equal(candidates[0]?.distance, 0);
  assert.equal(candidates[0]?.method, "CIE76");
  assert.equal(candidates[1]?.record.atlasId, "H010_L085_C010");
});

test("rejects an invalid candidate limit", () => {
  assert.throws(
    () => findAtlasCandidates(dataset, { l: 50, a: 0, b: 0 }, { limit: 0 }),
    /positive integer/,
  );
});
