import type { MasterRepository } from "../master";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

export interface LambdaV2DescriptorEvidence {
  readonly reference: string;
  readonly lambdaV2Nm: number;
  readonly method: string;
  readonly implementationId: string;
  readonly implementationVersion: string;
}

export interface LambdaV2ConformanceOptions {
  readonly toleranceNm?: number;
}

export interface LambdaV2ConformanceResult {
  readonly status:
    | "LAMBDA_V2_CONFORMANT"
    | "LAMBDA_V2_NONCONFORMANT"
    | "LAMBDA_V2_REFERENCE_UNAVAILABLE"
    | "LAMBDA_V2_INVALID";
  readonly reference: string;
  readonly expectedLambdaV2Nm?: number;
  readonly observedLambdaV2Nm?: number;
  readonly absoluteErrorNm?: number;
  readonly toleranceNm: number;
  readonly expectedMethod?: string;
  readonly observedMethod?: string;
  readonly implementationId?: string;
  readonly implementationVersion?: string;
  readonly limitations: readonly string[];
}

export async function validateLambdaV2Conformance(
  repository: MasterRepository,
  evidence: LambdaV2DescriptorEvidence,
  options: LambdaV2ConformanceOptions = {},
): Promise<LambdaV2ConformanceResult> {
  const toleranceNm = options.toleranceNm ?? 1e-6;
  const limitations = [
    "This gate validates descriptor output against the verified Master runtime.",
    "It does not implement or infer the canonical lambda_V2 algorithm.",
    "Conformance of one reference does not establish conformance across the full atlas.",
    "Not a production approval.",
  ] as const;

  const invalid =
    !REFERENCE_PATTERN.test(evidence.reference) ||
    !Number.isFinite(evidence.lambdaV2Nm) ||
    !evidence.method.trim() ||
    !evidence.implementationId.trim() ||
    !evidence.implementationVersion.trim() ||
    !Number.isFinite(toleranceNm) ||
    toleranceNm < 0;

  if (invalid) {
    return {
      status: "LAMBDA_V2_INVALID",
      reference: evidence.reference,
      observedLambdaV2Nm: evidence.lambdaV2Nm,
      toleranceNm,
      observedMethod: evidence.method,
      implementationId: evidence.implementationId,
      implementationVersion: evidence.implementationVersion,
      limitations,
    };
  }

  const record = await repository.findByReference(evidence.reference);
  if (!record || record.lambdaV2Nm === undefined) {
    return {
      status: "LAMBDA_V2_REFERENCE_UNAVAILABLE",
      reference: evidence.reference,
      observedLambdaV2Nm: evidence.lambdaV2Nm,
      toleranceNm,
      observedMethod: evidence.method,
      implementationId: evidence.implementationId,
      implementationVersion: evidence.implementationVersion,
      limitations,
    };
  }

  const absoluteErrorNm = Math.abs(record.lambdaV2Nm - evidence.lambdaV2Nm);
  const methodMatches = evidence.method === record.lambdaV2Method;
  const conformant = absoluteErrorNm <= toleranceNm && methodMatches;

  return {
    status: conformant ? "LAMBDA_V2_CONFORMANT" : "LAMBDA_V2_NONCONFORMANT",
    reference: evidence.reference,
    expectedLambdaV2Nm: record.lambdaV2Nm,
    observedLambdaV2Nm: evidence.lambdaV2Nm,
    absoluteErrorNm,
    toleranceNm,
    expectedMethod: record.lambdaV2Method,
    observedMethod: evidence.method,
    implementationId: evidence.implementationId,
    implementationVersion: evidence.implementationVersion,
    limitations,
  };
}
