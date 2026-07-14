# Image → Palette foundation

This module is the first executable step of the ARBE DesignFit creative workflow.

## Input

Decoded RGBA pixel data supplied by a trusted image-decoding layer.

## Output

A deterministic palette candidate containing RGB, HEX, pixel population and proportional share.

## Method

`DETERMINISTIC_MEDIAN_CUT_V1`

The method is deterministic and dependency-free. Transparent pixels can be excluded by an alpha threshold.

## Claim boundary

The extracted palette is a visual communication result only. It is not an ARBE colour identity, spectral measurement, material recipe, Reference Lock or production approval.

Every swatch has status:

`PALETTE_CANDIDATE`

The next controlled stage converts a selected palette swatch into a colour request and routes it to the Master Repository candidate search. Only a canonical `Hxxx_Lxxx_Cxxx` reference can become an ARBE identity.

## Deliberately excluded

- browser or server image decoding;
- colour-profile interpretation;
- RGB-to-Lab conversion;
- Atlas candidate search;
- recipe solving;
- Spectral Scissor;
- Metamerism Gate;
- Reference Lock.
