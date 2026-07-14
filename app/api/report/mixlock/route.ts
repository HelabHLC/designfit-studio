import { NextResponse } from "next/server";
import type { FinalMixLockEvidence } from "@/src/core/mixlock";
import {
  buildMixLockReport,
  type MixLockReportAuditContext,
  type MixLockReportRequestContext,
} from "@/src/core/reporting";

export const runtime = "nodejs";

type RequestBody = {
  readonly evidence?: unknown;
  readonly request?: unknown;
  readonly audit?: unknown;
};

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : undefined;
}

function parseRequest(value: unknown): MixLockReportRequestContext | undefined {
  const item = objectRecord(value);
  if (!item || typeof item.type !== "string" || typeof item.value !== "string") return undefined;
  return { type: item.type, value: item.value };
}

function parseAudit(value: unknown): MixLockReportAuditContext | undefined {
  const item = objectRecord(value);
  if (!item) return undefined;
  const reportId = item.reportId;
  const generatedAt = item.generatedAt;
  const runtimeVersion = item.runtimeVersion;
  const runtimeCommit = item.runtimeCommit;
  const datasetId = item.datasetId;
  const datasetSha256 = item.datasetSha256;
  if (
    typeof reportId !== "string" ||
    typeof generatedAt !== "string" ||
    typeof runtimeVersion !== "string" ||
    typeof runtimeCommit !== "string" ||
    typeof datasetId !== "string" ||
    typeof datasetSha256 !== "string"
  ) return undefined;
  return {
    reportId,
    generatedAt,
    runtimeVersion,
    runtimeCommit,
    datasetId,
    datasetSha256,
  };
}

export async function POST(httpRequest: Request) {
  let body: RequestBody;
  try {
    body = await httpRequest.json() as RequestBody;
  } catch {
    return NextResponse.json(
      { status: "INVALID_MIXLOCK_REPORT_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const evidenceRecord = objectRecord(body.evidence);
  const request = parseRequest(body.request);
  const audit = parseAudit(body.audit);
  if (!evidenceRecord || !request || !audit) {
    return NextResponse.json(
      {
        status: "INVALID_MIXLOCK_REPORT_REQUEST",
        error: "Complete evidence, request and audit objects are required.",
      },
      { status: 400 },
    );
  }

  try {
    const report = buildMixLockReport(
      evidenceRecord as unknown as FinalMixLockEvidence,
      request,
      audit,
    );
    return NextResponse.json({ status: "MIXLOCK_REPORT_READY", report });
  } catch (error) {
    return NextResponse.json(
      {
        status: "MIXLOCK_REPORT_EVIDENCE_INCOMPLETE",
        error: error instanceof Error ? error.message : "Unable to build MixLock report.",
      },
      { status: 422 },
    );
  }
}
