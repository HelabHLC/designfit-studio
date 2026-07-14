# MixLock Report integrity envelope

ARBE λ* Platform Beta Work Package 01 now emits a deterministic integrity envelope alongside the human-readable report model.

## Purpose

The envelope detects accidental or unauthorized modification of a generated report payload after creation.

```text
runtime evidence
→ MixLock report model
→ canonical JSON
→ SHA-256
→ report envelope
```

## Envelope

```json
{
  "schemaVersion": "ARBE_MIXLOCK_REPORT_ENVELOPE_V1",
  "report": {},
  "integrity": {
    "algorithm": "SHA-256",
    "canonicalization": "ARBE_CANONICAL_JSON_V1",
    "payloadSha256": "..."
  }
}
```

`ARBE_CANONICAL_JSON_V1` sorts object keys recursively, preserves array order, excludes undefined object properties and rejects non-finite numbers.

## Endpoints

`POST /api/report/mixlock` returns both the report and its integrity envelope.

`POST /api/report/mixlock/verify` recomputes the canonical payload digest and returns either:

- `MIXLOCK_REPORT_INTEGRITY_VERIFIED`
- `MIXLOCK_REPORT_INTEGRITY_FAILED`

## Boundary

A SHA-256 envelope is an integrity check, not an identity signature. It does not prove who created the report and does not replace a future server-side signing key, immutable persistence layer or trusted timestamp. It does not imply production approval or certification.
