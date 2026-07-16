import {
  createRuntimeIntelligenceOrchestrationContract,
  validateRuntimeIntelligenceOrchestrationContract,
} from "./orchestration-contract";

export type RuntimeEvidenceStatus = "VALID" | "INVALID" | "MISSING";
export type RuntimeStageExecutionStatus = "COMPLETED" | "STOPPED" | "SKIPPED_WITH_EVIDENCE" | "NOT_RUN" | "READY_FOR_BINDING";

export interface RuntimeEvidenceInput {
  readonly status: RuntimeEvidenceStatus;
  readonly evidenceId?: string;
  readonly reason?: string;
}

export interface RuntimeIntelligenceOrchestratorInput {
  readonly targetReference: string;
  readonly referenceGateway: RuntimeEvidenceInput;
  readonly spectralIntelligence: RuntimeEvidenceInput;
  readonly recipeIntelligence: {
    readonly requested: boolean;
    readonly evidence?: RuntimeEvidenceInput;
    readonly skipReason?: string;
  };
}

export interface RuntimeStageExecution {
  readonly stageId: "REFERENCE_GATEWAY" | "SPECTRAL_INTELLIGENCE" | "RECIPE_INTELLIGENCE" | "RUNTIME_REPORT_BINDING";
  readonly status: RuntimeStageExecutionStatus;
  readonly evidenceId?: string;
  readonly reason: string;
}

export interface RuntimeIntelligenceResult {
  readonly schemaVersion: "ARBE_RUNTIME_INTELLIGENCE_RESULT_V1";
  readonly targetReference: string;
  readonly overallStatus: "READY_FOR_REPORT_BINDING" | "STOPPED_BY_REQUIRED_STAGE";
  readonly stoppedAt?: "REFERENCE_GATEWAY" | "SPECTRAL_INTELLIGENCE";
  readonly stages: readonly RuntimeStageExecution[];
  readonly prohibitedClaims: readonly string[];
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function completed(stageId: RuntimeStageExecution["stageId"], input: RuntimeEvidenceInput): RuntimeStageExecution {
  return { stageId, status: "COMPLETED", evidenceId: input.evidenceId, reason: "Verified stage evidence supplied." };
}

function stopped(stageId: "REFERENCE_GATEWAY" | "SPECTRAL_INTELLIGENCE", input: RuntimeEvidenceInput): RuntimeStageExecution {
  return { stageId, status: "STOPPED", evidenceId: input.evidenceId, reason: input.reason?.trim() || `Required evidence status is ${input.status}.` };
}

export function orchestrateRuntimeIntelligence(input: RuntimeIntelligenceOrchestratorInput): RuntimeIntelligenceResult {
  const contract = createRuntimeIntelligenceOrchestrationContract();
  if (!validateRuntimeIntelligenceOrchestrationContract(contract)) throw new Error("Runtime orchestration contract validation failed.");
  if (!/^H\d{3}_L\d{3}_C\d{3}$/.test(input.targetReference)) throw new Error("Runtime target reference must match Hxxx_Lxxx_Cxxx.");

  const stages: RuntimeStageExecution[] = [];
  if (input.referenceGateway.status !== "VALID") {
    stages.push(stopped("REFERENCE_GATEWAY", input.referenceGateway));
    stages.push({ stageId: "SPECTRAL_INTELLIGENCE", status: "NOT_RUN", reason: "Reference Gateway did not complete." });
    stages.push({ stageId: "RECIPE_INTELLIGENCE", status: "NOT_RUN", reason: "Reference Gateway did not complete." });
    stages.push({ stageId: "RUNTIME_REPORT_BINDING", status: "NOT_RUN", reason: "Runtime stopped before a bindable result existed." });
    return freeze({ schemaVersion: "ARBE_RUNTIME_INTELLIGENCE_RESULT_V1", targetReference: input.targetReference, overallStatus: "STOPPED_BY_REQUIRED_STAGE", stoppedAt: "REFERENCE_GATEWAY", stages, prohibitedClaims: contract.prohibitedClaims, claimBoundary: contract.claimBoundary, limitations: contract.limitations });
  }
  stages.push(completed("REFERENCE_GATEWAY", input.referenceGateway));

  if (input.spectralIntelligence.status !== "VALID") {
    stages.push(stopped("SPECTRAL_INTELLIGENCE", input.spectralIntelligence));
    stages.push({ stageId: "RECIPE_INTELLIGENCE", status: "NOT_RUN", reason: "Spectral Intelligence did not complete." });
    stages.push({ stageId: "RUNTIME_REPORT_BINDING", status: "NOT_RUN", reason: "Runtime stopped before a bindable result existed." });
    return freeze({ schemaVersion: "ARBE_RUNTIME_INTELLIGENCE_RESULT_V1", targetReference: input.targetReference, overallStatus: "STOPPED_BY_REQUIRED_STAGE", stoppedAt: "SPECTRAL_INTELLIGENCE", stages, prohibitedClaims: contract.prohibitedClaims, claimBoundary: contract.claimBoundary, limitations: contract.limitations });
  }
  stages.push(completed("SPECTRAL_INTELLIGENCE", input.spectralIntelligence));

  const recipe = input.recipeIntelligence;
  if (!recipe.requested) {
    const reason = recipe.skipReason?.trim();
    if (!reason) throw new Error("A non-requested Recipe Intelligence stage requires explicit skip evidence.");
    stages.push({ stageId: "RECIPE_INTELLIGENCE", status: "SKIPPED_WITH_EVIDENCE", reason });
  } else if (recipe.evidence?.status === "VALID") {
    stages.push(completed("RECIPE_INTELLIGENCE", recipe.evidence));
  } else {
    const evidence = recipe.evidence;
    stages.push({ stageId: "RECIPE_INTELLIGENCE", status: "SKIPPED_WITH_EVIDENCE", evidenceId: evidence?.evidenceId, reason: evidence?.reason?.trim() || `Requested Recipe Intelligence evidence is ${evidence?.status ?? "MISSING"}.` });
  }

  stages.push({ stageId: "RUNTIME_REPORT_BINDING", status: "READY_FOR_BINDING", reason: "Runtime evidence is ready for integrity-bound report creation." });
  return freeze({ schemaVersion: "ARBE_RUNTIME_INTELLIGENCE_RESULT_V1", targetReference: input.targetReference, overallStatus: "READY_FOR_REPORT_BINDING", stages, prohibitedClaims: contract.prohibitedClaims, claimBoundary: contract.claimBoundary, limitations: [...contract.limitations, "READY_FOR_REPORT_BINDING is not recipe approval or production release."] });
}
