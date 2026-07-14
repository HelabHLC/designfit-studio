# Work Package 01 — MixLock Report Integrity

Every completed MixLock report can now be wrapped in a deterministic integrity envelope.

```text
MixLock report model
→ canonical JSON with recursively sorted object keys
→ SHA-256
→ ARBE_MIXLOCK_REPORT_ENVELOPE_V1
```

`POST /api/report/mixlock` returns the report envelope. `POST /api/report/mixlock/verify` recomputes the digest and reports whether the report content still matches the recorded SHA-256.

The integrity digest detects content changes. It is not a digital signature, identity proof, timestamp authority or production approval. A future signed-report layer may sign this deterministic digest using a protected server-side key and documented key rotation policy.
