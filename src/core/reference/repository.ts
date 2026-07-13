import type { Reference } from "./types";

export interface ReferenceRepository {
  findByAtlasId(atlasId: string): Promise<Reference | undefined>;
  list(): Promise<readonly Reference[]>;
}

export class InMemoryReferenceRepository implements ReferenceRepository {
  private readonly byAtlasId: ReadonlyMap<string, Reference>;

  constructor(references: readonly Reference[]) {
    this.byAtlasId = new Map(
      references.map((reference) => [reference.atlasId, reference]),
    );
  }

  async findByAtlasId(atlasId: string): Promise<Reference | undefined> {
    return this.byAtlasId.get(atlasId);
  }

  async list(): Promise<readonly Reference[]> {
    return [...this.byAtlasId.values()];
  }
}
