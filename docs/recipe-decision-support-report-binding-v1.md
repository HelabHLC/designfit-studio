# Recipe Decision Support Report Binding v1

WP06.7 binds Recipe Decision Support v1 into a deterministic SHA-256 protected report.

The report preserves the HLC target reference, portfolio status, first candidate in review order, candidate count, full decision-support payload and next action.

Validation requires contiguous ranks, unique candidate IDs and consistency between the primary candidate and rank one.

The report records workflow guidance only. It does not certify equivalence, approve a formulation, establish an optimum or grant production release.

Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity.
