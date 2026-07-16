# Runtime Intelligence Orchestrator v1

WP07.2 executes the fixed WP07.1 stage contract and produces `ARBE_RUNTIME_INTELLIGENCE_RESULT_V1`.

Required Reference Gateway and Spectral Intelligence evidence stop the runtime when missing or invalid. Recipe Intelligence is conditional; a non-execution or invalid recipe package is always recorded as `SKIPPED_WITH_EVIDENCE`.

A successful run ends at `READY_FOR_REPORT_BINDING`. This status means only that the runtime evidence can be integrity-bound in the next reporting stage.

Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity. The orchestrator does not create scientific evidence, identify root cause, certify equivalence, approve recipes or grant production release.
