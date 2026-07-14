import { NextResponse } from "next/server";
import {
  verifyMixLockReportEnvelope,
  type MixLockReportEnvelope,
} from "@/src/core/reporting";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let envelope: MixLockReportEnvelope;
  try {
    envelope = await request.json() as MixLockReportEnvelope;
  } catch {
    return NextResponse.json(
      { status: "INVALID_REPORT_ENVELOPE", valid: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (
    envelope?.schemaVersion !== "ARBE_MIXLOCK_REPORT_ENVELOPE_V1" ||
    envelope?.integrityMethod !== "SHA256_CANONICAL_JSON" ||
    !envelope.report ||
    typeof envelope.reportSha256 !== "string"
  ) {
    return NextResponse.json(
      { status: "INVALID_REPORT_ENVELOPE", valid: false, error: "Envelope structure is invalid." },
      { status: 400 },
    );
  }

  const valid = verifyMixLockReportEnvelope(envelope);
  return NextResponse.json({
    status: valid ? "MIXLOCK_REPORT_INTEGRITY_VALID" : "MIXLOCK_REPORT_INTEGRITY_FAILED",
    valid,
    reportId: envelope.report.reportId,
    reportSha256: envelope.reportSha256,
  }, { status: valid ? 200 : 422 });
}
