import { NextResponse } from "next/server";
import {
  verifyMixLockReportEnvelope,
  type MixLockReportEnvelope,
} from "@/src/core/reporting";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let envelope: unknown;
  try {
    envelope = await request.json();
  } catch {
    return NextResponse.json(
      { status: "INVALID_MIXLOCK_REPORT_ENVELOPE", verified: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (envelope === null || typeof envelope !== "object") {
    return NextResponse.json(
      { status: "INVALID_MIXLOCK_REPORT_ENVELOPE", verified: false, error: "A report envelope object is required." },
      { status: 400 },
    );
  }

  try {
    const verified = verifyMixLockReportEnvelope(envelope as MixLockReportEnvelope);
    return NextResponse.json({
      status: verified ? "MIXLOCK_REPORT_INTEGRITY_VERIFIED" : "MIXLOCK_REPORT_INTEGRITY_FAILED",
      verified,
    }, { status: verified ? 200 : 422 });
  } catch (error) {
    return NextResponse.json(
      {
        status: "MIXLOCK_REPORT_INTEGRITY_FAILED",
        verified: false,
        error: error instanceof Error ? error.message : "Unable to verify report envelope.",
      },
      { status: 422 },
    );
  }
}
