# Spectral Intelligence Report Binding v1

WP05.2 binds a verified Reference Gateway Evidence Report to a Spectral Intelligence Summary for the same existing ARBE reference.

## Flow

```text
Reference Gateway Evidence Report
            +
Spectral Intelligence Summary
            │
            ▼
Spectral Intelligence Report Binding v1
```

The binding is created only when the Gateway report contains a bound ARBE reference and the spectral evidence targets exactly that same `Hxxx_Lxxx_Cxxx` identity.

## Included links

- Gateway report SHA-256;
- Decision Object SHA-256;
- Evidence Chain SHA-256;
- target ARBE reference;
- spectral overall status;
- completed and required evidence domains;
- complete Spectral Intelligence Summary;
- report-level SHA-256 integrity.

## Deliberate boundary

The binding records and integrity-protects the relationship between Gateway and spectral evidence. It does not infer pigment or substrate root cause, approve a recipe, certify a match or grant production release.

Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity.
