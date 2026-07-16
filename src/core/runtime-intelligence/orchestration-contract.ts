export type RuntimeStageId = "REFERENCE_GATEWAY" | "SPECTRAL_INTELLIGENCE" | "RECIPE_INTELLIGENCE" | "RUNTIME_REPORT_BINDING";

export interface RuntimeStageContract {
  readonly stageId: RuntimeStageId;
  readonly requirement: "REQUIRED" | "CONDITIONAL";
  readonly inputSchema: string;
  readonly outputSchema: string;
  readonly failureMode: "STOP" | "SKIP_WITH_EVIDENCE";
}

export interface RuntimeIntelligenceOrchestrationContract {
  readonly schemaVersion: "ARBE_RUNTIME_INTELLIGENCE_ORCHESTRATION_CONTRACT_V1";
  readonly identityRule: "ONLY_HLC_REFERENCE_IS_ARBE_IDENTITY";
  readonly stages: readonly RuntimeStageContract[];
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

export function createRuntimeIntelligenceOrchestrationContract(): RuntimeIntelligenceOrchestrationContract {
  return freeze({
    schemaVersion: "ARBE_RUNTIME_INTELLIGENCE_ORCHESTRATION_CONTRACT_V1",
    identityRule: "ONLY_HLC_REFERENCE_IS_ARBE_IDENTITY",
    stages: [
      { stageId: "REFERENCE_GATEWAY", requirement: "REQUIRED", inputSchema: "ARBE_REFERENCE_REQUEST_V1", outputSchema: "ARBE_REFERENCE_GATEWAY_EVIDENCE_REPORT_V1", failureMode: "STOP" },
      { stageId: "SPECTRAL_INTELLIGENCE", requirement: "REQUIRED", inputSchema: "ARBE_REFERENCE_GATEWAY_EVIDENCE_REPORT_V1", outputSchema: "ARBE_SPECTRAL_INTELLIGENCE_EVIDENCE_PACKAGE_V1", failureMode: "STOP" },
      { stageId: "RECIPE_INTELLIGENCE", requirement: "CONDITIONAL", inputSchema: "ARBE_SPECTRAL_INTELLIGENCE_EVIDENCE_PACKAGE_V1", outputSchema: "ARBE_RECIPE_INTELLIGENCE_EVIDENCE_PACKAGE_V1", failureMode: "SKIP_WITH_EVIDENCE" },
      { stageId: "RUNTIME_REPORT_BINDING", requirement: "REQUIRED", inputSchema: "ARBE_RUNTIME_INTELLIGENCE_RESULT_V1", outputSchema: "ARBE_RUNTIME_INTELLIGENCE_REPORT_BINDING_V1", failureMode: "STOP" },
    ],
    prohibitedClaims: ["REFERENCE_INVENTED", "VISUAL_IDENTITY_CERTIFIED", "SPECTRAL_EQUIVALENCE_CERTIFIED", "ROOT_CAUSE_CONFIRMED", "RECIPE_APPROVED", "PRODUCTION_RELEASE_GRANTED"],
    claimBoundary: "This contract defines runtime sequencing and evidence requirements only. It does not create scientific evidence, certify equivalence, confirm root cause, approve a recipe or grant production release.",
    limitations: [
      "Only Hxxx_Lxxx_Cxxx is an ARBE identity; all external colour descriptions remain requests.",
      "External standards require authoritative or licensed binding data.",
      "A skipped conditional stage must remain explicit runtime evidence.",
      "Runtime sequencing does not validate upstream measurement quality.",
    ],
  });
}

export function validateRuntimeIntelligenceOrchestrationContract(contract: RuntimeIntelligenceOrchestrationContract): boolean {
  const order: readonly RuntimeStageId[] = ["REFERENCE_GATEWAY", "SPECTRAL_INTELLIGENCE", "RECIPE_INTELLIGENCE", "RUNTIME_REPORT_BINDING"];
  return contract.schemaVersion === "ARBE_RUNTIME_INTELLIGENCE_ORCHESTRATION_CONTRACT_V1" &&
    contract.identityRule === "ONLY_HLC_REFERENCE_IS_ARBE_IDENTITY" &&
    contract.stages.length === 4 &&
    contract.stages.every((stage, index) => stage.stageId === order[index]) &&
    contract.stages[0].failureMode === "STOP" &&
    contract.stages[1].failureMode === "STOP" &&
    contract.stages[2].requirement === "CONDITIONAL" &&
    contract.stages[2].failureMode === "SKIP_WITH_EVIDENCE" &&
    contract.stages[3].failureMode === "STOP" &&
    contract.prohibitedClaims.includes("RECIPE_APPROVED") &&
    contract.prohibitedClaims.includes("PRODUCTION_RELEASE_GRANTED");
}
