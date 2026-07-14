import { NextResponse } from "next/server";
import { runReferenceGateway, type ReferenceRequest } from "@/src/core/reference-gateway";
import { getMasterRepository } from "@/src/server/master-repository-provider";

export const runtime = "nodejs";

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : undefined;
}

function parseRequest(value: unknown): ReferenceRequest | undefined {
  const item = objectRecord(value);
  if (!item || typeof item.kind !== "string") return undefined;

  if (item.kind === "REFERENCE" || item.kind === "HEX" || item.kind === "DESCRIPTION") {
    return typeof item.value === "string"
      ? { kind: item.kind, value: item.value }
      : undefined;
  }

  if (item.kind === "LAB") {
    const lab = objectRecord(item.value);
    if (!lab) return undefined;
    const l = lab.l;
    const a = lab.a;
    const b = lab.b;
    return typeof l === "number" && typeof a === "number" && typeof b === "number"
      ? { kind: "LAB", value: { l, a, b } }
      : undefined;
  }

  if (item.kind === "EXTERNAL_STANDARD") {
    return typeof item.system === "string" && typeof item.value === "string"
      ? { kind: "EXTERNAL_STANDARD", system: item.system, value: item.value }
      : undefined;
  }

  if (item.kind === "IMAGE") {
    return typeof item.assetId === "string"
      ? { kind: "IMAGE", assetId: item.assetId }
      : undefined;
  }

  return undefined;
}

export async function POST(httpRequest: Request) {
  let body: unknown;
  try {
    body = await httpRequest.json();
  } catch {
    return NextResponse.json(
      { status: "INVALID_REFERENCE_GATEWAY_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const record = objectRecord(body);
  const request = parseRequest(record?.request);
  if (!request) {
    return NextResponse.json(
      { status: "INVALID_REFERENCE_GATEWAY_REQUEST", error: "A supported request object is required." },
      { status: 400 },
    );
  }

  try {
    const repository = await getMasterRepository();
    const result = await runReferenceGateway(repository, request);
    const manifest = await repository.getManifest();
    return NextResponse.json({
      ...result,
      source: "MASTER_RUNTIME",
      dataset: {
        datasetId: manifest.datasetId,
        sha256: manifest.sha256,
        status: manifest.status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "INVALID_REFERENCE_GATEWAY_REQUEST",
        error: error instanceof Error ? error.message : "Unable to process Reference Gateway request.",
      },
      { status: 400 },
    );
  }
}
