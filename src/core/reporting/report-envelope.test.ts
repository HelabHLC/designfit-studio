import assert from "node:assert/strict";
import test from "node:test";
import { demoMixLockReport } from "./demo-report";
import {
  canonicalizeMixLockReport,
  createMixLockReportEnvelope,
  verifyMixLockReportEnvelope,
} from "./report-envelope";

test("creates a deterministic SHA-256 envelope", () => {
  const first = createMixLockReportEnvelope(demoMixLockReport);
  const second = createMixLockReportEnvelope(demoMixLockReport);
  assert.equal(first.integrity.payloadSha256, second.integrity.payloadSha256);
  assert.match(first.integrity.payloadSha256, /^[a-f0-9]{64}$/);
  assert.equal(verifyMixLockReportEnvelope(first), true);
});

test("canonicalization is independent of object key insertion order", () => {
  const reordered = {
    ...demoMixLockReport,
    request: {
      identityRule: demoMixLockReport.request.identityRule,
      value: demoMixLockReport.request.value,
      type: demoMixLockReport.request.type,
    },
  };
  assert.equal(
    canonicalizeMixLockReport(reordered),
    canonicalizeMixLockReport(demoMixLockReport),
  );
});

test("detects a modified report payload", () => {
  const envelope = createMixLockReportEnvelope(demoMixLockReport);
  const modified = {
    ...envelope,
    report: {
      ...envelope.report,
      targetReference: "H000_L000_C000",
    },
  };
  assert.equal(verifyMixLockReportEnvelope(modified), false);
});
