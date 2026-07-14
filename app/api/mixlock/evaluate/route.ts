import { NextResponse } from "next/server";
import { evaluateMixLockCandidate, type MixLockPigmentInput } from "@/src/core/mixlock";
import { getMasterRepository } from "@/src/server/master-repository-provider";

export const runtime = "nodejs";

type RequestBody = {
  readonly targetReference?: unknown;
  readonly pigments?: unknown;
};

function isPigment(value: unknown): value is MixLockPigmentInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const spectrum = item.spectrum as Record<string, unknown> | undefined;
  return (
    typeof item.id === "string" &&
    typeof item.weight === "number" &&
    !!spectrum &&
    Array.isArray(spectrum.wavelengthsNm) &&
    Array.isArray(spectrum.reflectance)
  );
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { status: "INVALID_MIXLOCK_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (typeof body.targetReference !== "string" || !Array.isArray(body.pigments) || !body.pigments.every(isPigment)) {
    return NextResponse.json(
      {
        status: "INVALID_MIXLOCK_REQUEST",
        error: "targetReference and a valid pigments array are required.",
      },
      { status: 400 },
    );
  }

  try {
    const repository = await getMasterRepository();
    const evidence = await evaluateMixLockCandidate(
      repository,
      body.targetReference,
      body.pigments,
    );
    const manifest = await repository.getManifest();

    return NextResponse.json({
      ...evidence,
      source: "MASTER_RUNTIME",
      dataset: {
        datasetId: manifest.datasetId,
        sha256: manifest.sha256,
        status: manifest.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MixLock evaluation failed.";
    if (message.includes("required") || message.includes("must") || message.includes("weight")) {
      return NextResponse.json(
        { status: "INVALID_MIXLOCK_REQUEST", error: message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { status: "MIXLOCK_RUNTIME_UNAVAILABLE", error: "MixLock evaluation is unavailable." },
      { status: 503 },
    );
  }
}
