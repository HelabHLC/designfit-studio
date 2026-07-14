# ARBE λ* Platform Beta — Work Package 01 runtime binding

This increment converts completed `FinalMixLockEvidence` into the user-facing `MixLockReportModel`.

## Binding flow

```text
runFinalMixLock evidence
→ mandatory completeness check
→ request context
→ runtime and dataset audit context
→ MixLockReportModel
→ deterministic confidence
```

The builder refuses to create a completed report unless all mandatory final stages are present:

- Spectral Scissor correction evidence;
- structural λ*_V2 / λEE / delta-lambda evidence;
- second recipe and AtlasFit result;
- Metamerism Gate result;
- resolved nearest Master reference and target rank.

## Endpoint

```http
POST /api/report/mixlock
```

The endpoint accepts:

- `evidence`: the completed `FinalMixLockEvidence` object;
- `request`: the original user-request description, retained as request-only data;
- `audit`: report ID, timestamp, runtime commit and verified dataset provenance.

It returns:

```text
MIXLOCK_REPORT_READY
```

or, when mandatory evidence is missing:

```text
MIXLOCK_REPORT_EVIDENCE_INCOMPLETE
```

## Claim boundary

The report documents the supplied runtime evidence. It does not upgrade an incomplete workflow into a final lock, does not infer missing measurements and does not constitute production approval or certification.
