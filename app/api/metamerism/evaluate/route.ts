import { NextResponse } from "next/server";
import {
  evaluateMetamerismGate,
  type IlluminantDeltaEvidence,
} from "@/src/core/metamerism";

export const runtime = "nodejs";

type ParsedRequest = {
  readonly targetReference: string;
  readonly referenceLocked: boolean;
  readonly evaluations: IlluminantDeltaEvidence[];
  readonly warningDeltaE00: number;
  readonly riskDeltaE00: number;
};

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseRequest(value: unknown): ParsedRequest | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const body = value as Record<string, unknown>;
  const targetReference = body["targetReference"];
  const referenceLocked = body["referenceLocked"];
  const warningDeltaE00 = body["warningDeltaE00"];
  const riskDeltaE00 = body["riskDeltaE00"];
  const evaluationsValue = body["evaluations"];

  if (
    typeof targetReference !== "string" ||
    typeof referenceLocked !== "boolean" ||
    !finiteNumber(warningDeltaE00) ||
    !finiteNumber(riskDeltaE00) ||
    !Array.isArray(evaluationsValue)
  ) {
    return undefined;
  }

  const evaluations: IlluminantDeltaEvidence[] = [];
  for (const itemValue of evaluationsValue) {
    if (itemValue === null || typeof itemValue !== "object") return undefined;
    const item = itemValue as Record<string, unknown>;
    const illuminant = item["illuminant"];
    const deltaE00 = item["deltaE00"];
    if (typeof illuminant !== "string" || !finiteNumber(deltaE00)) return undefined;
    evaluations.push({ illuminant, deltaE00 });
  }

  return {
    targetReference,
    referenceLocked,
    evaluations,
    warningDeltaE00,
    riskDeltaE00,
  };
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { status: "INVALID_METAMERISM_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = parseRequest(rawBody);
  if (!parsed) {
    return NextResponse.json(
      {
        status: "INVALID_METAMERISM_REQUEST",
        error: "targetReference, referenceLocked, evaluations and thresholds are required.",
      },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      evaluateMetamerismGate(
        parsed.targetReference,
        parsed.referenceLocked,
        parsed.evaluations,
        {
          warningDeltaE00: parsed.warningDeltaE00,
          riskDeltaE00: parsed.riskDeltaE00,
        },
      ),
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "INVALID_METAMERISM_REQUEST",
        error: error instanceof Error ? error.message : "Unable to evaluate metamerism evidence.",
      },
      { status: 400 },
    );
  }
}
