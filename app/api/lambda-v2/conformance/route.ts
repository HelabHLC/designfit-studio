import { NextResponse } from "next/server";
import { validateLambdaV2Conformance } from "@/src/core/lambda-v2";
import { getMasterRepository } from "@/src/server/master-repository-provider";

export const runtime = "nodejs";

type RequestBody = {
  readonly reference?: unknown;
  readonly lambdaV2Nm?: unknown;
  readonly method?: unknown;
  readonly implementationId?: unknown;
  readonly implementationVersion?: unknown;
  readonly toleranceNm?: unknown;
};

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { status: "LAMBDA_V2_INVALID", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (
    typeof body.reference !== "string" ||
    typeof body.lambdaV2Nm !== "number" ||
    typeof body.method !== "string" ||
    typeof body.implementationId !== "string" ||
    typeof body.implementationVersion !== "string"
  ) {
    return NextResponse.json(
      {
        status: "LAMBDA_V2_INVALID",
        error: "reference, lambdaV2Nm, method, implementationId and implementationVersion are required.",
      },
      { status: 400 },
    );
  }

  try {
    const repository = await getMasterRepository();
    const result = await validateLambdaV2Conformance(
      repository,
      {
        reference: body.reference,
        lambdaV2Nm: body.lambdaV2Nm,
        method: body.method,
        implementationId: body.implementationId,
        implementationVersion: body.implementationVersion,
      },
      {
        toleranceNm: typeof body.toleranceNm === "number" ? body.toleranceNm : undefined,
      },
    );
    const manifest = await repository.getManifest();
    return NextResponse.json({
      ...result,
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
        status: "LAMBDA_V2_INVALID",
        error: error instanceof Error ? error.message : "Unable to validate lambda_V2 evidence.",
      },
      { status: 400 },
    );
  }
}
