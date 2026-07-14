import { NextResponse } from "next/server";
import { runSpectralScissorLockPipeline } from "@/src/core/scissor";
import { getMasterRepository } from "@/src/server/master-repository-provider";

export const runtime = "nodejs";

type RequestBody = {
  readonly targetReference?: unknown;
  readonly candidateSpectrum?: {
    readonly wavelengthsNm?: unknown;
    readonly reflectance?: unknown;
  };
  readonly allowedLambdaDriftNm?: unknown;
  readonly options?: {
    readonly epsilon?: unknown;
    readonly smoothSigmaBands?: unknown;
    readonly smoothRadius?: unknown;
  };
};

function numberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(
    (item) => typeof item === "number" && Number.isFinite(item),
  );
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { status: "INVALID_SCISSOR_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const spectrum = body.candidateSpectrum;
  if (
    typeof body.targetReference !== "string" ||
    !spectrum ||
    !numberArray(spectrum.wavelengthsNm) ||
    !numberArray(spectrum.reflectance) ||
    typeof body.allowedLambdaDriftNm !== "number" ||
    !Number.isFinite(body.allowedLambdaDriftNm)
  ) {
    return NextResponse.json(
      {
        status: "INVALID_SCISSOR_REQUEST",
        error: "targetReference, candidateSpectrum and allowedLambdaDriftNm are required.",
      },
      { status: 400 },
    );
  }

  const targetReference = body.targetReference;
  const wavelengthsNm = spectrum.wavelengthsNm;
  const reflectance = spectrum.reflectance;
  const allowedLambdaDriftNm = body.allowedLambdaDriftNm;
  const options = body.options ?? {};

  try {
    const repository = await getMasterRepository();
    const evidence = await runSpectralScissorLockPipeline(
      repository,
      targetReference,
      { wavelengthsNm, reflectance },
      {
        allowedLambdaDriftNm,
        ...(typeof options.epsilon === "number" ? { epsilon: options.epsilon } : {}),
        ...(typeof options.smoothSigmaBands === "number"
          ? { smoothSigmaBands: options.smoothSigmaBands }
          : {}),
        ...(typeof options.smoothRadius === "number"
          ? { smoothRadius: options.smoothRadius }
          : {}),
      },
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
    return NextResponse.json(
      {
        status: "INVALID_SCISSOR_REQUEST",
        error: error instanceof Error ? error.message : "Unable to run Scissor lock evaluation.",
      },
      { status: 400 },
    );
  }
}
