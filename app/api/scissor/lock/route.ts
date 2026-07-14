import { NextResponse } from "next/server";
import {
  runSpectralScissorLockPipeline,
  type ScissorLockPipelineOptions,
} from "@/src/core/scissor";
import { getMasterRepository } from "@/src/server/master-repository-provider";

export const runtime = "nodejs";

type ParsedRequest = {
  readonly targetReference: string;
  readonly wavelengthsNm: number[];
  readonly reflectance: number[];
  readonly options: ScissorLockPipelineOptions;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFiniteNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isFiniteNumber);
}

function parseRequestBody(value: unknown): ParsedRequest | undefined {
  if (!value || typeof value !== "object") return undefined;
  const body = value as Record<string, unknown>;
  const spectrumValue = body.candidateSpectrum;
  if (!spectrumValue || typeof spectrumValue !== "object") return undefined;
  const spectrum = spectrumValue as Record<string, unknown>;

  const targetReferenceValue = body.targetReference;
  const wavelengthsValue = spectrum.wavelengthsNm;
  const reflectanceValue = spectrum.reflectance;
  const allowedLambdaDriftValue = body.allowedLambdaDriftNm;

  if (
    typeof targetReferenceValue !== "string" ||
    !isFiniteNumberArray(wavelengthsValue) ||
    !isFiniteNumberArray(reflectanceValue) ||
    !isFiniteNumber(allowedLambdaDriftValue)
  ) {
    return undefined;
  }

  const rawOptions =
    body.options && typeof body.options === "object"
      ? (body.options as Record<string, unknown>)
      : {};
  const options: ScissorLockPipelineOptions = {
    allowedLambdaDriftNm: allowedLambdaDriftValue,
    ...(isFiniteNumber(rawOptions.epsilon) ? { epsilon: rawOptions.epsilon } : {}),
    ...(isFiniteNumber(rawOptions.smoothSigmaBands)
      ? { smoothSigmaBands: rawOptions.smoothSigmaBands }
      : {}),
    ...(isFiniteNumber(rawOptions.smoothRadius)
      ? { smoothRadius: rawOptions.smoothRadius }
      : {}),
  };

  return {
    targetReference: targetReferenceValue,
    wavelengthsNm: wavelengthsValue,
    reflectance: reflectanceValue,
    options,
  };
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { status: "INVALID_SCISSOR_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = parseRequestBody(rawBody);
  if (!parsed) {
    return NextResponse.json(
      {
        status: "INVALID_SCISSOR_REQUEST",
        error: "targetReference, candidateSpectrum and allowedLambdaDriftNm are required.",
      },
      { status: 400 },
    );
  }

  try {
    const repository = await getMasterRepository();
    const evidence = await runSpectralScissorLockPipeline(
      repository,
      parsed.targetReference,
      {
        wavelengthsNm: parsed.wavelengthsNm,
        reflectance: parsed.reflectance,
      },
      parsed.options,
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
