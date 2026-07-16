# Runtime Intelligence Report Binding v1

WP07.3 binds `ARBE_RUNTIME_INTELLIGENCE_RESULT_V1` into a deterministic, reference-bound SHA-256 report.

The report preserves the HLC target, runtime status, optional stop location, all four stage records, completed and skipped stage counts, prohibited claims and limitations.

Both ready and stopped runs can be documented. A stopped run remains stopped evidence and is never represented as a successful or approved result.

The binding detects payload changes and internal count or status inconsistencies. Integrity proves payload consistency only; it does not validate upstream measurement quality or scientific validity.

Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity. The report does not certify spectral or visual equivalence, confirm root cause, approve a recipe or grant production release.
