import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  RuntimeMasterRepository,
  type MasterRepository,
  type RuntimeMasterManifest,
} from "../core/master";

const PAYLOAD_ENV = "ARBE_MASTER_RUNTIME_PATH";
const MANIFEST_ENV = "ARBE_MASTER_MANIFEST_PATH";

let repositoryPromise: Promise<MasterRepository> | undefined;

function requiredPath(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for the ARBE Master runtime repository.`);
  }
  return resolve(value);
}

function parseManifest(value: string): RuntimeMasterManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("ARBE Master runtime manifest is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("ARBE Master runtime manifest must be a JSON object.");
  }

  return parsed as RuntimeMasterManifest;
}

async function loadRepository(): Promise<MasterRepository> {
  const payloadPath = requiredPath(PAYLOAD_ENV);
  const manifestPath = requiredPath(MANIFEST_ENV);
  const [payload, manifestText] = await Promise.all([
    readFile(payloadPath),
    readFile(manifestPath, "utf8"),
  ]);

  const repository = RuntimeMasterRepository.fromGzipJsonl(
    payload,
    parseManifest(manifestText),
  );
  await repository.verifySource();
  return repository;
}

export function getMasterRepository(): Promise<MasterRepository> {
  repositoryPromise ??= loadRepository().catch((error) => {
    repositoryPromise = undefined;
    throw error;
  });
  return repositoryPromise;
}

export function resetMasterRepositoryForTests(): void {
  repositoryPromise = undefined;
}
