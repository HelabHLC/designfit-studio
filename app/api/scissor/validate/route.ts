import { NextResponse } from "next/server";
import { validateSpectralScissor } from "@/src/core/scissor";
import { getMasterRepository } from "@/src/server/master-repository-provider";

export const runtime = "nodejs";

type RequestBody = {
  readonly targetReference?: unknown;
  readonly correctedTargetCurve?: {
    readonly wavelengthsNm?: unknown;
    readonly reflectance?: unknown;
  };
  readonly crossingsBefore?: unknown;
  readonly crossingsAfter?: unknown;
  readonly nearestAfterCorrection?: unknown;
  readonly deltaDeltaLambdaNm?: unknown;
  readonly allowedLambdaDriftNm?: unknown;
};

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { status: "SCISSOR_INVALID", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const curve = body.correctedTargetCurve;
  if (
    typeof body.targetReference !== "string" ||
    typeof body.nearestAfterCorrection !== "string" ||
    typeof body.crossingsBefore !== "number" ||
    typeof body.crossingsAfter !== "number" ||
    typeof body.deltaDeltaLambdaNm !== "number" ||
    typeof body.allowedLambdaDriftNm !== "number" ||
    !curve ||
    !Array.isArray(curve.wavelengthsNm) ||
    !Array.isArray(curve.reflectance)
  ) {
    return NextResponse.json(
      { status: "SCISSOR_INVALID", error: "Required Scissor evidence fields are missing." },
      { status: 400 },
    );
  }

  try {
    const repository = await getMasterRepository();
    const evidence = await validateSpectralScissor(repository, {
      targetReference: body.targetReference,
      correctedTargetCurve: {
        wavelengthsNm: curve.wavelengthsNm as number[],
        reflectance: curve.reflectance as number[],
      },
      crossingsBefore: body.crossingsBefore,
      crossingsAfter: body.crossingsAfter,
      nearestAfterCorrection: body.nearestAfterCorrection,
      deltaDeltaLambdaNm: body.deltaDeltaLambdaNm,
      allowedLambdaDriftNm: body.allowedLambdaDriftNm,
    });
    const manifest = await repository.getManifest();

    return NextResponse.json({
      ...evidence,
      source: "MASTER_RUNTIME",
      dataset: {
        datasetId: manifest.datasetId,
        sha256: manifest.sha256,
        status: manifest.status,
      },
      verdict: evidence.status,
    });
  } catch {
    return NextResponse.json(
      {
        status: "MASTER_RUNTIME_UNAVAILABLE",
        error: "The verified ARBE Master runtime repository is unavailable.",
      },
      { status: 503 },
    );
  }
}
