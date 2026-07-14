import type { MasterRecord, MasterRepository } from "../master";
import { computeLambdaV2 } from "./compute";

export interface LambdaV2MasterSuiteOptions {
  readonly toleranceNm?: number;
  readonly maxReferences?: number;
}

export interface LambdaV2MasterSuiteCase {
  readonly reference: string;
  readonly expectedLambdaV2Nm: number;
  readonly observedLambdaV2Nm: number;
  readonly absoluteErrorNm: number;
  readonly expectedMethod: string;
  readonly observedMethod: "Brent";
  readonly conformant: boolean;
}

export interface LambdaV2MasterSuiteResult {
  readonly status:
    | "LAMBDA_V2_MASTER_SUITE_CONFORMANT"
    | "LAMBDA_V2_MASTER_SUITE_NONCONFORMANT"
    | "LAMBDA_V2_MASTER_SUITE_UNAVAILABLE";
  readonly coverage: "FULL_MASTER" | "DETERMINISTIC_STRATIFIED_SAMPLE";
  readonly totalMasterRecords: number;
  readonly eligibleMasterRecords: number;
  readonly testedReferences: number;
  readonly conformantReferences: number;
  readonly nonconformantReferences: number;
  readonly maximumAbsoluteErrorNm?: number;
  readonly meanAbsoluteErrorNm?: number;
  readonly toleranceNm: number;
  readonly implementationId: "ARBE_LAMBDA_V2_BRENT_RUNTIME";
  readonly implementationVersion: "1.0.0";
  readonly cases: readonly LambdaV2MasterSuiteCase[];
  readonly limitations: readonly string[];
}

function selectDeterministic(records: readonly MasterRecord[], limit: number): readonly MasterRecord[] {
  if (limit >= records.length) return records;
  if (limit === 1) return [records[0]];
  const selected: MasterRecord[] = [];
  for (let index = 0; index < limit; index += 1) {
    const position = Math.round((index * (records.length - 1)) / (limit - 1));
    selected.push(records[position]);
  }
  return selected;
}

export async function runLambdaV2MasterSuite(
  repository: MasterRepository,
  options: LambdaV2MasterSuiteOptions = {},
): Promise<LambdaV2MasterSuiteResult> {
  const toleranceNm = options.toleranceNm ?? 1e-6;
  const maxReferences = options.maxReferences ?? 256;
  if (!Number.isFinite(toleranceNm) || toleranceNm < 0) {
    throw new Error("toleranceNm must be finite and greater than or equal to zero.");
  }
  if (!Number.isInteger(maxReferences) || maxReferences < 1) {
    throw new Error("maxReferences must be an integer greater than zero.");
  }

  const all = [...(await repository.listRecords())].sort((left, right) =>
    left.reference.localeCompare(right.reference),
  );
  const eligible = all.filter(
    (record) => record.lambdaV2Nm !== undefined && record.lambdaV2Method.trim().length > 0,
  );
  const limitations = [
    "The suite compares runtime output only with lambda_V2 values already present in the verified Master runtime.",
    "A stratified sample is evidence for the tested references only; global conformance requires FULL_MASTER coverage.",
    "Conformance does not constitute production approval.",
  ] as const;

  if (eligible.length === 0) {
    return {
      status: "LAMBDA_V2_MASTER_SUITE_UNAVAILABLE",
      coverage: "DETERMINISTIC_STRATIFIED_SAMPLE",
      totalMasterRecords: all.length,
      eligibleMasterRecords: 0,
      testedReferences: 0,
      conformantReferences: 0,
      nonconformantReferences: 0,
      toleranceNm,
      implementationId: "ARBE_LAMBDA_V2_BRENT_RUNTIME",
      implementationVersion: "1.0.0",
      cases: [],
      limitations,
    };
  }

  const selected = selectDeterministic(eligible, Math.min(maxReferences, eligible.length));
  const cases = selected.map((record): LambdaV2MasterSuiteCase => {
    const observed = computeLambdaV2(record.spectrum);
    const expected = record.lambdaV2Nm!;
    const absoluteErrorNm = Math.abs(observed.lambdaV2Nm - expected);
    const conformant =
      absoluteErrorNm <= toleranceNm && observed.method === record.lambdaV2Method;
    return {
      reference: record.reference,
      expectedLambdaV2Nm: expected,
      observedLambdaV2Nm: observed.lambdaV2Nm,
      absoluteErrorNm,
      expectedMethod: record.lambdaV2Method,
      observedMethod: observed.method,
      conformant,
    };
  });
  const errors = cases.map((item) => item.absoluteErrorNm);
  const conformantReferences = cases.filter((item) => item.conformant).length;
  const nonconformantReferences = cases.length - conformantReferences;

  return {
    status:
      nonconformantReferences === 0
        ? "LAMBDA_V2_MASTER_SUITE_CONFORMANT"
        : "LAMBDA_V2_MASTER_SUITE_NONCONFORMANT",
    coverage: cases.length === eligible.length ? "FULL_MASTER" : "DETERMINISTIC_STRATIFIED_SAMPLE",
    totalMasterRecords: all.length,
    eligibleMasterRecords: eligible.length,
    testedReferences: cases.length,
    conformantReferences,
    nonconformantReferences,
    maximumAbsoluteErrorNm: Math.max(...errors),
    meanAbsoluteErrorNm: errors.reduce((sum, value) => sum + value, 0) / errors.length,
    toleranceNm,
    implementationId: "ARBE_LAMBDA_V2_BRENT_RUNTIME",
    implementationVersion: "1.0.0",
    cases,
    limitations,
  };
}
