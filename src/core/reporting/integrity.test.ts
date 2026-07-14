import assert from "node:assert/strict";
import test from "node:test";
import { demoMixLockReport } from "./demo-report";
import {
  canonicalReportJson,
  createMixLockReportEnvelope,
  verifyMixLockReportEnvelope,
} from "./integrity";

test("creates a deterministic SHA-256 report envelope", () => {
  const first = createMixLockReportEnvelope(demoMixLockReport);
  const second = createMixLockReportEnvelope({ ...demoMixLockReport });
  assert.equal(first.reportSha256, second.reportSha256);
  assert.match(first.reportSha256, /^[a-f0-9]{64}$/);
  assert.equal(verifyMixLockReportEnvelope(first), true);
});

test("canonical JSON is stable across object key order", () => {
  const reordered = {
    ...demoMixLockReport,
    request: {
      value: demoMixLockReport.request.value,
      identityRule: demoMixLockReport.request.identityRule,
      type: demoMixLockReport.request.type,
    },
  };
  assert.equal(canonicalReportJson(demoMixLockReport), canonicalReportJson(reordered));
});

test("detects a modified report", () => {
  const envelope = createMixLockReportEnvelope(demoMixLockReport);
  const modified = {
    ...envelope,
    report: { ...envelope.report, targetReference: "H000_L000_C000" },
  };
  assert.equal(verifyMixLockReportEnvelope(modified), false);
});
