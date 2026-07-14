import { NextResponse } from "next/server";
import {
  solveSecondRecipe,
  type MixLockPigmentInput,
  type SecondRecipeSolverOptions,
} from "@/src/core/mixlock";
import { getMasterRepository } from "@/src/server/master-repository-provider";

export const runtime = "nodejs";

type ParsedRequest = {
  readonly targetReference: string;
  readonly scissoredTargetSpectrum: {
    readonly wavelengthsNm: number[];
    readonly reflectance: number[];
  };
  readonly pigments: MixLockPigmentInput[];
  readonly options: SecondRecipeSolverOptions;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFiniteNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isFiniteNumber);
}

function parseSpectrum(value: unknown): { wavelengthsNm: number[]; reflectance: number[] } | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const wavelengthsNm = record["wavelengthsNm"];
  const reflectance = record["reflectance"];
  if (!isFiniteNumberArray(wavelengthsNm) || !isFiniteNumberArray(reflectance)) return undefined;
  return { wavelengthsNm, reflectance };
}

function parsePigment(value: unknown): MixLockPigmentInput | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const id = record["id"];
  const weight = record["weight"];
  const spectrum = parseSpectrum(record["spectrum"]);
  if (typeof id !== "string" || !isFiniteNumber(weight) || !spectrum) return undefined;
  return { id, weight, spectrum };
}

function parseOptionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return isFiniteNumber(value) ? value : undefined;
}

function parseRequest(value: unknown): ParsedRequest | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const body = value as Record<string, unknown>;
  const targetReference = body["targetReference"];
  const scissoredTargetSpectrum = parseSpectrum(body["scissoredTargetSpectrum"]);
  const pigmentValues = body["pigments"];
  if (typeof targetReference !== "string" || !scissoredTargetSpectrum || !Array.isArray(pigmentValues)) {
    return undefined;
  }

  const pigments: MixLockPigmentInput[] = [];
  for (const value of pigmentValues) {
    const pigment = parsePigment(value);
    if (!pigment) return undefined;
    pigments.push(pigment);
  }

  const rawOptionsValue = body["options"];
  const rawOptions: Record<string, unknown> =
    rawOptionsValue !== null && typeof rawOptionsValue === "object"
      ? (rawOptionsValue as Record<string, unknown>)
      : {};
  const initialStep = parseOptionalNumber(rawOptions, "initialStep");
  const minimumStep = parseOptionalNumber(rawOptions, "minimumStep");
  const maxPassesPerStep = parseOptionalNumber(rawOptions, "maxPassesPerStep");
  const options: SecondRecipeSolverOptions = {
    ...(initialStep !== undefined ? { initialStep } : {}),
    ...(minimumStep !== undefined ? { minimumStep } : {}),
    ...(maxPassesPerStep !== undefined ? { maxPassesPerStep } : {}),
  };

  return { targetReference, scissoredTargetSpectrum, pigments, options };
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { status: "INVALID_SECOND_RECIPE_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = parseRequest(rawBody);
  if (!parsed) {
    return NextResponse.json(
      {
        status: "INVALID_SECOND_RECIPE_REQUEST",
        error: "targetReference, scissoredTargetSpectrum and a valid pigments array are required.",
      },
      { status: 400 },
    );
  }

  try {
    const repository = await getMasterRepository();
    const evidence = await solveSecondRecipe(
      repository,
      parsed.targetReference,
      parsed.scissoredTargetSpectrum,
      parsed.pigments,
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
        status: "INVALID_SECOND_RECIPE_REQUEST",
        error: error instanceof Error ? error.message : "Second recipe solver failed.",
      },
      { status: 400 },
    );
  }
}
