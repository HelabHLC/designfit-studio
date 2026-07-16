# Structural Cause Indicator Report Binding v1

WP05.8 binds a verified Reference Gateway Evidence Report to Structural Cause Indicators v1 for the same existing ARBE identity.

## Bound content

- Gateway report integrity digest;
- decision and evidence digests;
- target `Hxxx_Lxxx_Cxxx` reference;
- indicator status and counts;
- unchanged structural indicators;
- unchanged investigation candidates;
- unchanged `INVESTIGATION_CANDIDATE_NOT_ROOT_CAUSE` boundary;
- canonical JSON v1 SHA-256 integrity digest.

## Integrity rules

The binding is rejected when the Gateway report fails integrity verification, no ARBE reference is bound, the target references differ, or any investigation candidate loses its mandatory not-root-cause boundary.

Verification recomputes the canonical payload digest and checks indicator counts, status, target reference and candidate boundaries.

## Deliberate boundary

The report records investigation directions. It does not establish root cause, identify a pigment, substrate, coating, process fault or measurement fault, assign probabilities, certify equivalence, approve a recipe or grant production release.
