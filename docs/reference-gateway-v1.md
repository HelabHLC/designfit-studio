# ARBE λ* Reference Gateway v1

The Reference Gateway is the universal request boundary of the ARBE λ* Platform.

## Core rule

Every submitted value is a request first. Only a resolved `Hxxx_Lxxx_Cxxx` Master Runtime reference is an ARBE identity.

```text
request
→ normalization
→ supported binding adapter
→ ranked Master candidates
→ bound ARBE reference
```

## Initial executable adapters

### Direct ARBE reference

A syntactically valid `Hxxx_Lxxx_Cxxx` request is checked against the active Master Runtime. Existence produces `REFERENCE_BOUND`; absence produces `REFERENCE_NOT_FOUND`.

### Lab request

A finite Lab request is routed against Master Runtime communication values using deterministic CIE76 ranking. The nearest record is returned as the initial binding together with the top five candidates.

This is candidate routing, not spectral AtlasFit validation. MixLock, Spectral Scissor and the Metamerism Gate remain separate downstream actions.

## Normalized but deliberately unbound

The following request kinds are accepted and normalized, but v1 does not invent a reference for them:

- HEX;
- image asset ID;
- free-text description;
- external standards such as Pantone, RAL or NCS.

They return `REQUEST_NORMALIZED_BINDING_UNAVAILABLE` until an authoritative conversion or measurement adapter is available. External standard names are requests only and imply no bundled, licensed or certified third-party dataset.

## Endpoint

```http
POST /api/reference-gateway
```

Example Lab request:

```json
{
  "request": {
    "kind": "LAB",
    "value": { "l": 50, "a": -20, "b": -20 }
  }
}
```

## Claim boundary

A Gateway result documents deterministic request-to-reference binding under the stated Master Runtime and method. It does not create colour identity, certify equivalence, perform MixLock or issue production approval.
