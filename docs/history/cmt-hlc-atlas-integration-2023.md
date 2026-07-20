# CMT and HLC Colour Atlas XL Integration — Historical Evidence (2023)

## Purpose

This document records historical evidence that the HLC Colour Atlas XL was integrated into the Color Mixing Tools (CMT) ecosystem as an operational spectral reference, not merely as a display or naming library.

## Source record

- **Date:** 6 January 2023
- **Sender:** Prof. Zsolt Miklos Kovacs Vajna, University of Brescia
- **Recipient:** Norbert Woiwod
- **Source type:** Private project correspondence
- **Evidence status:** First-party historical correspondence retained by the recipient

The original email remains in the recipient's private archive. The sender's direct email address is intentionally omitted from this public record.

## Relevant statement

The correspondence states that the HLC Colour Atlas XL database had been added to CMT and was planned for inclusion in the next recompiled release. It also describes the contemporaneous RPaintPro implementation:

> “You can move your pointer on an image and see real-time the coordinates with the HLC Colour Atlas XL entries. You can also select an Atlas entry on the ‘colors’ page and have the mixing recipe on the ‘mixing’ page.”

## What the evidence establishes

The email directly supports the following statements:

1. The HLC Colour Atlas XL database was integrated into CMT.
2. Atlas entries were available as operational colour references.
3. Image colours could be compared with HLC Colour Atlas XL entries in real time.
4. An Atlas entry could be selected as a target colour.
5. The mixing workflow could generate a mixing recipe for the selected Atlas entry.

A technically precise summary is therefore:

> After integration of the HLC Colour Atlas XL database into CMT, individual Atlas entries could be selected as target colours and processed by the mixing workflow to generate mixing recipes from the available spectral colour databases.

## Interpretation boundary

This evidence establishes computational integration and recipe generation. It does **not** by itself establish universal industrial reproducibility.

A generated spectral mixing recipe remains dependent on the applicable material and production system, including factors such as:

- pigment set,
- binder or vehicle,
- substrate,
- concentration model,
- layer thickness,
- scattering and absorption behaviour,
- measurement geometry,
- process tolerances.

Accordingly, ARBE distinguishes between:

- **colour identity** — the reference spectral target,
- **computational mixability** — the ability to process the target within a spectral mixing engine,
- **production feasibility** — evidence that a target can be reproduced within a defined industrial system.

## Relevance to ARBE DesignFit Studio

This correspondence documents an important part of the technical lineage behind the current provider architecture:

```text
HLC Colour Atlas XL spectral entries
                │
                ▼
        CMT / .rs ecosystem
                │
                ▼
   spectral target and recipe workflow
                │
                ▼
ARBE provenance, validation and decision layers
```

ARBE does not claim invention of spectral mixing or of the underlying colour-conversion methods. Its contribution is the deterministic and auditable decision architecture built around spectral sources, including provenance, integrity verification, evidence chains, feasibility binding, validation and explainable decisions.

## Governance note

This record is historical documentation only. It does not alter dataset licensing or redistribution rights. Use of CMT datasets remains subject to the separate permission record in:

`docs/legal/permissions/cmt-data-permission.md`
