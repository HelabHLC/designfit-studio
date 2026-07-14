import { NextResponse } from "next/server";
import { runLambdaV2MasterSuite } from "@/src/core/lambda-v2";
import { getMasterRepository } from "@/src/server/master-repository-provider";

export const runtime = "nodejs";

type RequestBody = {
  readonly toleranceNm?: unknown;
  readonly maxReferences?: unknown;
};

export async function POST(request: Request) {
  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { status: "INVALID_LAMBDA_V2_MASTER_SUITE_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const options = {
    toleranceNm: typeof body.toleranceNm === "number" ? body.toleranceNm : undefined,
    maxReferences: typeof body.maxReferences === "number" ? body.maxReferences : undefined,
  };

  try {
    const repository = await getMasterRepository();
    const result = await runLambdaV2MasterSuite(repository, options);
    const manifest = await repository.getManifest();
    return NextResponse.json({
      ...result,
      source: "MASTER_RUNTIME",
      dataset: { datasetId: manifest.datasetId, sha256: manifest.sha256, status: manifest.status },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "INVALID_LAMBDA_V2_MASTER_SUITE_REQUEST",
        error: error instanceof Error ? error.message : "Unable to run the lambda_V2 master suite.",
      },
      { status: 400 },
    );
  }
}
