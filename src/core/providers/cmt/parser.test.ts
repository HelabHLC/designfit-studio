import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePublication } from "../../data-governance/spectral-data-policy";
import { CmtRsImportError, importCmtRsDataset } from "./parser";

function row(name: string, values: readonly number[]): string {
  return `"${name}"\t${values.join("\t")}`;
}

const valuesA = Array.from({ length: 36 }, (_, index) => (index + 1) / 100);
const valuesB = Array.from({ length: 36 }, (_, index) => (index + 2) / 100);

const options = {
  datasetId: "cmt:test-paints",
  title: "CMT test fixture",
  version: "1",
  sourceFileName: "test-paints.rs",
} as const;

test("imports deterministic 36-band CMT .rs records", () => {
  const source = `${row("001 Sample A", valuesA)}\r\n${row("002 Sample B", valuesB)}\r\n`;
  const first = importCmtRsDataset(source, options);
  const second = importCmtRsDataset(source, options);

  assert.equal(first.records.length, 2);
  assert.equal(first.provenance.recordCount, 2);
  assert.equal(first.provenance.dataClass, "RESTRICTED_INTERNAL");
  assert.equal(first.provenance.redistributionConfirmed, false);
  assert.deepEqual(first.provenance.wavelengthsNm, [
    380, 390, 400, 410, 420, 430, 440, 450, 460, 470, 480, 490,
    500, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610,
    620, 630, 640, 650, 660, 670, 680, 690, 700, 710, 720, 730,
  ]);
  assert.deepEqual(first.records[0].reflectance, valuesA);
  assert.equal(first.provenance.sourceSha256, second.provenance.sourceSha256);
  assert.equal(first.records[0].recordId, second.records[0].recordId);
});

test("blocks publication because redistribution is not confirmed", () => {
  const dataset = importCmtRsDataset(row("001 Sample A", valuesA), options);
  const decision = evaluatePublication(dataset.provenance);

  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /must not be published or redistributed/i);
});

test("rejects rows with an unexpected number of spectral values", () => {
  assert.throws(
    () => importCmtRsDataset(row("001 Sample A", valuesA.slice(0, 35)), options),
    (error: unknown) =>
      error instanceof CmtRsImportError &&
      error.sourceRow === 1 &&
      /expected 36/i.test(error.message),
  );
});

test("rejects reflectance outside 0..1", () => {
  const invalid = [...valuesA];
  invalid[12] = 1.01;

  assert.throws(
    () => importCmtRsDataset(row("001 Sample A", invalid), options),
    /outside 0\.\.1/i,
  );
});

test("rejects duplicate sample names", () => {
  const source = `${row("Duplicate", valuesA)}\n${row("Duplicate", valuesB)}\n`;
  assert.throws(() => importCmtRsDataset(source, options), /duplicate sample name/i);
});
