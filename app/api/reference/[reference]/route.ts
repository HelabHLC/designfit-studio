import { NextResponse } from "next/server";
import { getMasterRepository } from "../../../../src/server/master-repository-provider";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;
const LIMITATIONS = [
  "No recipe validation performed.",
  "No Spectral Scissor performed.",
  "No Metamerism Gate performed.",
  "Not a production approval.",
] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ reference: string }> },
) {
  const { reference } = await context.params;

  if (!REFERENCE_PATTERN.test(reference)) {
    return NextResponse.json(
      {
        status: "INVALID_REFERENCE_REQUEST",
        reference,
        required_pattern: "Hxxx_Lxxx_Cxxx",
        limitations: LIMITATIONS,
      },
      { status: 400 },
    );
  }

  try {
    const repository = await getMasterRepository();
    const record = await repository.findByReference(reference);

    if (!record) {
      return NextResponse.json(
        {
          status: "REFERENCE_NOT_FOUND",
          reference,
          source: "MASTER_RUNTIME",
          limitations: LIMITATIONS,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "REFERENCE_FOUND",
      reference: record.reference,
      source: "MASTER_RUNTIME",
      dataset: await repository.getManifest(),
      lab: record.lab,
      spectrum: record.spectrum,
      lambda_v2_nm: record.lambdaV2Nm ?? null,
      lambda_ee_nm: record.lambdaEeNm ?? null,
      delta_lambda_nm: record.deltaLambdaNm ?? null,
      sigma_star_nm: record.sigmaStarNm ?? null,
      limitations: LIMITATIONS,
    });
  } catch (error) {
    console.error("ARBE Master runtime lookup failed", error);
    return NextResponse.json(
      {
        status: "MASTER_RUNTIME_UNAVAILABLE",
        reference,
        limitations: LIMITATIONS,
      },
      { status: 503 },
    );
  }
}
