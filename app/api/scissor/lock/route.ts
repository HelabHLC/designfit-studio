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

function optionalFiniteNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return isFiniteNumber(value) ? value : undefined;
}

function parseRequestBody(value: unknown): ParsedRequest | undefined {
  if (value === null || typeof value !== "object") return undefined;

  const body = value as Record<string, unknown>;
  const spectrumValue = body["candidateSpectrum"];
  if (spectrumValue === null || typeof spectrumValue !== "object") return undefined;

  const spectrum = spectrumValue as Record<string, unknown>;
  const targetReference = body["targetReference"];
  const wavelengthsNm = spectrum["wavelengthsNm"];
  const reflectance = spectrum["reflectance"];
  const allowedLambdaDriftNm = body["allowedLambdaDriftNm"];

  if (
    typeof targetReference !== "string" ||
    !isFiniteNumberArray(wavelengthsNm) ||
    !isFiniteNumberArray(reflectance) ||
    !isFiniteNumber(allowedLambdaDriftNm)
  ) {
    return undefined;
  }

  const rawOptionsValue = body["options"];
  const rawOptions: Record<string, unknown> =
    rawOptionsValue !== null && typeof rawOptionsValue === "object"
      ? (rawOptionsValue as Record<string, unknown>)
      : {};

  const epsilon = optionalFiniteNumber(rawOptions, "epsilon");
  const smoothSigmaBands = optionalFiniteNumber(rawOptions, "smoothSigmaBands");
  const smoothRadius = optionalFiniteNumber(rawOptions, "smoothRadius");

  const options: ScissorLockPipelineOptions = { allowedLambdaDriftNm };
  if (epsilon !== undefined) options.epsilon = epsilon;
  if (smoothSigmaBands !== undefined) options.smoothSigmaBands = smoothSigmaBands;
  if (smoothRadius !== undefined) options.smoothRadius = smoothRadius;

  return { targetReference, wavelengthsNm, reflectance, options };
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
