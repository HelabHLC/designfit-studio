import { assertAtlasId } from "./atlas-id";
import type { ReferenceRepository } from "./repository";
import type { Reference, ReferenceExplanation } from "./types";

export class ReferenceNotFoundError extends Error {
  constructor(atlasId: string) {
    super(`Reference not found: ${atlasId}`);
    this.name = "ReferenceNotFoundError";
  }
}

export class ReferenceEngine {
  constructor(private readonly repository: ReferenceRepository) {}

  async search(atlasId: string): Promise<Reference | undefined> {
    assertAtlasId(atlasId);
    return this.repository.findByAtlasId(atlasId);
  }

  async require(atlasId: string): Promise<Reference> {
    const reference = await this.search(atlasId);
    if (!reference) {
      throw new ReferenceNotFoundError(atlasId);
    }
    return reference;
  }

  async explain(atlasId: string): Promise<ReferenceExplanation> {
    const reference = await this.require(atlasId);
    const limitations: string[] = [];

    if (!reference.lab) limitations.push("No Lab communication value available.");
    if (!reference.spectrum) limitations.push("No measured spectrum available.");
    if (reference.evidence !== "VALIDATED") {
      limitations.push(`Reference evidence is ${reference.evidence}, not VALIDATED.`);
    }

    return {
      atlasId: reference.atlasId,
      status:
        reference.evidence === "VALIDATED"
          ? "REFERENCE_LOCKED"
          : "REFERENCE_CANDIDATE",
      evidence: reference.evidence,
      source: reference.source,
      hasLab: Boolean(reference.lab),
      hasSpectrum: Boolean(reference.spectrum),
      limitations,
    };
  }
}
