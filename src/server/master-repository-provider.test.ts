import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";
import {
  getMasterRepository,
  resetMasterRepositoryForTests,
} from "./master-repository-provider";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);

async function withFixture(run: () => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "arbe-master-provider-"));
  const payloadPath = join(directory, "master.jsonl.gz");
  const manifestPath = join(directory, "master.manifest.json");
  const record = {
    reference: "H180_L050_C040",
    atlasIdentityValid: true,
    lambdaV2Method: "Brent",
    sourceAtlas: "HLC Colour Atlas XL",
    sourceCxf: "fixture",
    lab: { l: 50, a: 12, b: -8 },
    spectrum: {
      wavelengthsNm,
      reflectance: wavelengthsNm.map((_, index) => 0.2 + index / 100),
    },
  };
  const payload = gzipSync(`${JSON.stringify(record)}\n`);
  const manifest = {
    datasetId: "fixture-runtime-master",
    title: "Fixture runtime master",
    fileName: "master.jsonl.gz",
    format: "application/x-ndjson+gzip",
    sha256: createHash("sha256").update(payload).digest("hex"),
    sizeBytes: payload.byteLength,
    recordCount: 1,
    identityField: "reference",
    spectralGridNm: [...wavelengthsNm],
    status: "VERIFIED",
  };

  await Promise.all([
    writeFile(payloadPath, payload),
    writeFile(manifestPath, JSON.stringify(manifest), "utf8"),
  ]);

  process.env.ARBE_MASTER_RUNTIME_PATH = payloadPath;
  process.env.ARBE_MASTER_MANIFEST_PATH = manifestPath;
  resetMasterRepositoryForTests();

  try {
    await run();
  } finally {
    resetMasterRepositoryForTests();
    delete process.env.ARBE_MASTER_RUNTIME_PATH;
    delete process.env.ARBE_MASTER_MANIFEST_PATH;
    await rm(directory, { recursive: true, force: true });
  }
}

test("loads and caches the configured verified master repository", async () => {
  await withFixture(async () => {
    const first = await getMasterRepository();
    const second = await getMasterRepository();

    assert.equal(first, second);
    assert.equal(
      (await first.findByReference("H180_L050_C040"))?.reference,
      "H180_L050_C040",
    );
  });
});

test("fails closed when deployment paths are missing", async () => {
  delete process.env.ARBE_MASTER_RUNTIME_PATH;
  delete process.env.ARBE_MASTER_MANIFEST_PATH;
  resetMasterRepositoryForTests();

  await assert.rejects(getMasterRepository(), /ARBE_MASTER_RUNTIME_PATH is required/);
});
