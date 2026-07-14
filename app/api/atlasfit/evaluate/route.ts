import { NextResponse } from "next/server";
import { evaluateAtlasFit } from "@/src/core/atlasfit";
import { getMasterRepository } from "@/src/server/master-repository-provider";

export const runtime = "nodejs";

type AtlasFitRequest = {
  readonly targetReference?: unknown;
  readonly candidateSpectrum?: {
    readonly wavelengthsNm?: unknown;
    readonly reflectance?: unknown;
  };
};

export async function POST(request: Request) {
  let body: AtlasFitRequest;
  try {
    body = (await request.json()) as AtlasFitRequest;
  } catch {
    return NextResponse.json(
      { status: "INVALID_ATLASFIT_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (typeof body.targetReference !== "string") {
    return NextResponse.json(
      { status: "INVALID_ATLASFIT_REQUEST", error: "targetReference must be a string." },
      { status: 400 },
    );
  }

  const spectrum = body.candidateSpectrum;
  if (
    !spectrum ||
    !Array.isArray(spectrum.wavelengthsNm) ||
    !Array.isArray(spectrum.reflectance)
  ) {
    return NextResponse.json(
      {
        status: "INVALID_ATLASFIT_REQUEST",
        error: "candidateSpectrum.wavelengthsNm and reflectance must be arrays.",
      },
      { status: 400 },
    );
  }

  try {
    const repository = await getMasterRepository();
    const evidence = await evaluateAtlasFit(repository, body.targetReference, {
      wavelengthsNm: spectrum.wavelengthsNm as number[],
      reflectance: spectrum.reflectance as number[],
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
    });
  } catch (error) {
    if (error instanceof Error && /Target reference|Candidate spectrum|reflectance/.test(error.message)) {
      return NextResponse.json(
        { status: "INVALID_ATLASFIT_REQUEST", error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        status: "MASTER_RUNTIME_UNAVAILABLE",
        error: "The verified ARBE Master runtime repository is unavailable.",
      },
      { status: 503 },
    );
  }
}
