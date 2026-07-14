import { NextResponse } from "next/server";
import { runSpectralScissorPipeline } from "@/src/core/scissor";
import { getMasterRepository } from "@/src/server/master-repository-provider";

export const runtime = "nodejs";

type RequestBody = {
  readonly targetReference?: unknown;
  readonly candidateSpectrum?: {
    readonly wavelengthsNm?: unknown;
    readonly reflectance?: unknown;
  };
  readonly options?: {
    readonly epsilon?: unknown;
    readonly smoothSigmaBands?: unknown;
    readonly smoothRadius?: unknown;
  };
};

function numberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item));
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ status: "INVALID_SCISSOR_REQUEST", error: "Request body must be valid JSON." }, { status: 400 });
  }

  const targetReference = body.targetReference;
  const spectrum = body.candidateSpectrum;
  if (
    typeof targetReference !== "string" ||
    !spectrum ||
    !numberArray(spectrum.wavelengthsNm) ||
    !numberArray(spectrum.reflectance)
  ) {
    return NextResponse.json(
      { status: "INVALID_SCISSOR_REQUEST", error: "targetReference and numeric candidateSpectrum arrays are required." },
      { status: 400 },
    );
  }

  const options = body.options ?? {};
  const resolvedOptions = {
    epsilon: typeof options.epsilon === "number" ? options.epsilon : undefined,
    smoothSigmaBands: typeof options.smoothSigmaBands === "number" ? options.smoothSigmaBands : undefined,
    smoothRadius: typeof options.smoothRadius === "number" ? options.smoothRadius : undefined,
  };

  try {
    const repository = await getMasterRepository();
    const evidence = await runSpectralScissorPipeline(
      repository,
      targetReference,
      { wavelengthsNm: spectrum.wavelengthsNm, reflectance: spectrum.reflectance },
      resolvedOptions,
    );
    const manifest = await repository.getManifest();
    return NextResponse.json({
      ...evidence,
      source: "MASTER_RUNTIME",
      dataset: { datasetId: manifest.datasetId, sha256: manifest.sha256, status: manifest.status },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "INVALID_SCISSOR_REQUEST",
        error: error instanceof Error ? error.message : "Unable to run the Scissor pipeline.",
      },
      { status: 400 },
    );
  }
}
