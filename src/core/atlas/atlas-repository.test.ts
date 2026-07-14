import assert from "node:assert/strict";
import test from "node:test";

import { importAtlasCsv, InMemoryAtlasRepository } from "./index";

const csv = `atlasId;L;a;b;hex;name
H000_L095_C000;95;0;0;#F0F0F0;Neutral 95
H005_L085_C010;85;4;1;#E8CED3;Soft rose`;

const metadata = {
  datasetId: "hlc-colour-atlas-xl",
  title: "HLC Colour Atlas XL",
  version: "fixture-0.1",
  source: "Test fixture modelled on the open reference layer",
  license: "Fixture only — not the complete released atlas dataset",
};

test("imports canonical atlas records with metadata", () => {
  const dataset = importAtlasCsv(csv, { metadata });
  assert.equal(dataset.metadata.recordCount, 2);
  assert.equal(dataset.records[1].atlasId, "H005_L085_C010");
  assert.deepEqual(dataset.records[1].lab, { l: 85, a: 4, b: 1 });
});

test("registers a versioned dataset and searches exact atlas IDs", async () => {
  const repository = new InMemoryAtlasRepository();
  const dataset = importAtlasCsv(csv, { metadata });
  await repository.register(dataset);

  const result = await repository.findByAtlasId(
    "H005_L085_C010",
    "hlc-colour-atlas-xl",
  );

  assert.equal(result?.record.hex, "#E8CED3");
  assert.equal(result?.dataset.version, "fixture-0.1");
});

test("rejects duplicate atlas identifiers", () => {
  const duplicateCsv = `${csv}\nH005_L085_C010;85;4;1;#E8CED3;Duplicate`;
  assert.throws(() => importAtlasCsv(duplicateCsv, { metadata }), /Duplicate atlasId/);
});
