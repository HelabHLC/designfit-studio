import { NextResponse } from "next/server";
import { findMasterCandidates } from "@/src/core/master";
import { getMasterRepository } from "@/src/server/master-repository-provider";

export const runtime = "nodejs";

type CandidateRequest = {
  readonly lab?: { readonly l?: unknown; readonly a?: unknown; readonly b?: unknown };
  readonly limit?: unknown;
};

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function POST(request: Request) {
  let body: CandidateRequest;
  try {
    body = (await request.json()) as CandidateRequest;
  } catch {
    return NextResponse.json(
      { status: "INVALID_CANDIDATE_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const lab = body.lab;
  if (!lab || !finiteNumber(lab.l) || !finiteNumber(lab.a) || !finiteNumber(lab.b)) {
    return NextResponse.json(
      { status: "INVALID_CANDIDATE_REQUEST", error: "lab.l, lab.a and lab.b must be finite numbers." },
      { status: 400 },
    );
  }

  const limit = body.limit === undefined ? 10 : body.limit;
  if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 50) {
    return NextResponse.json(
      { status: "INVALID_CANDIDATE_REQUEST", error: "limit must be an integer from 1 to 50." },
      { status: 400 },
    );
  }

  try {
    const repository = await getMasterRepository();
    const candidates = await findMasterCandidates(
      repository,
      { l: lab.l, a: lab.a, b: lab.b },
      { limit: limit as number },
    );
    const manifest = await repository.getManifest();

    return NextResponse.json({
      status: "REFERENCE_CANDIDATES_FOUND",
      request: { lab: { l: lab.l, a: lab.a, b: lab.b }, limit },
      method: "CIE76",
      source: "MASTER_RUNTIME",
      dataset: { datasetId: manifest.datasetId, sha256: manifest.sha256, status: manifest.status },
      candidates: candidates.map((candidate) => ({
        rank: candidate.rank,
        reference: candidate.reference,
        lab: candidate.lab,
        distance: candidate.distance,
        lambdaV2Nm: candidate.record.lambdaV2Nm ?? null,
        lambdaEeNm: candidate.record.lambdaEeNm ?? null,
        deltaLambdaNm: candidate.record.deltaLambdaNm ?? null,
      })),
      verdict: "REFERENCE_CANDIDATE",
      limitations: [
        "CIE76 ranking is a candidate prefilter, not a Reference Lock.",
        "No recipe validation performed.",
        "No Spectral Scissor performed.",
        "No Metamerism Gate performed.",
        "Not a production approval.",
      ],
    });
  } catch {
    return NextResponse.json(
      {
        status: "MASTER_RUNTIME_UNAVAILABLE",
        error: "The verified ARBE Master runtime repository is unavailable.",
      },
      { status: 503 },
    );
  }
}
