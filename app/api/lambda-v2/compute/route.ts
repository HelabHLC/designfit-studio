import { NextResponse } from "next/server";
import { computeLambdaV2 } from "@/src/core/lambda-v2";

export const runtime = "nodejs";

type RequestBody = {
  readonly spectrum?: {
    readonly wavelengthsNm?: unknown;
    readonly reflectance?: unknown;
  };
  readonly toleranceNm?: unknown;
  readonly maxIterations?: unknown;
};

function numberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item));
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ status: "INVALID_LAMBDA_V2_REQUEST", error: "Request body must be valid JSON." }, { status: 400 });
  }

  const input = body.spectrum;
  if (!input || !numberArray(input.wavelengthsNm) || !numberArray(input.reflectance)) {
    return NextResponse.json(
      { status: "INVALID_LAMBDA_V2_REQUEST", error: "Numeric spectrum arrays are required." },
      { status: 400 },
    );
  }

  try {
    const result = computeLambdaV2(
      { wavelengthsNm: input.wavelengthsNm, reflectance: input.reflectance },
      typeof body.toleranceNm === "number" ? body.toleranceNm : undefined,
      typeof body.maxIterations === "number" ? body.maxIterations : undefined,
    );
    return NextResponse.json({
      ...result,
      limitations: [
        "A computed descriptor is not globally conformant until the frozen multi-reference suite passes.",
        "This descriptor does not establish a Reference Lock or production approval.",
      ],
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "INVALID_LAMBDA_V2_REQUEST",
        error: error instanceof Error ? error.message : "Unable to compute lambda_V2.",
      },
      { status: 400 },
    );
  }
}
