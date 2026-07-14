# ARBE Measured v0.1 — Measurement Protocol

## Purpose

Create a small, legally clear and scientifically documented spectral library of real artist colours for AtlasFit, MixLock and Spectral Scissor validation.

## Initial scope

Target 24–48 physical colour samples. Prefer a balanced starter set:

- whites and blacks;
- warm and cool yellows;
- orange and red families;
- violets and blues;
- greens;
- earth colours;
- selected transparent and opaque colours.

The first release should prioritize documentation quality over collection size.

## Required sample metadata

Each physical sample must record:

- `sample_id` — immutable ARBE measurement identifier;
- manufacturer;
- product line;
- product name;
- article or colour number;
- pigment index, when declared by the manufacturer;
- batch or lot number, when available;
- binder or medium;
- substrate;
- substrate preparation;
- application method;
- nominal wet-film or dry-film thickness, when known;
- dilution or medium ratio;
- number of coats;
- drying or curing time;
- measurement date;
- operator;
- instrument manufacturer and model;
- instrument serial number, when available;
- geometry and aperture;
- calibration reference and calibration time;
- spectral range and interval;
- measurement mode, including SCI/SCE where applicable;
- number of repeated measurements;
- raw source-file checksum.

## Spectral output

Canonical ARBE runtime grid:

```text
380, 390, 400, …, 730 nm
```

Exactly 36 reflectance values are required. Reflectance must be numeric and within `0..1`.

The original instrument export must be retained unchanged. Any resampling must be documented as a derived transformation and must not overwrite the raw data.

## Replicates

Minimum recommendation:

- three measurements at separate positions per drawdown;
- report mean spectrum;
- retain all individual spectra;
- record per-wavelength standard deviation;
- flag visible inhomogeneity or surface defects.

## Identity rule

A manufacturer name, product name, pigment index, Lab value, RGB value or HEX value is not an ARBE colour identity.

AtlasFit may bind a measured spectrum to an `Hxxx_Lxxx_Cxxx` reference as a derived result. That binding does not replace the physical sample identity and must include method, version, score and evidence status.

## Data classification

ARBE-created measurements are classified `ARBE_MEASURED` only when:

1. ARBE owns or controls the measurement record;
2. the raw source is retained;
3. provenance is complete;
4. publication rights are confirmed;
5. the dataset passes QA.

## QA gate

A record fails publication when any of the following applies:

- missing immutable sample ID;
- missing source checksum;
- invalid or incomplete spectral grid;
- reflectance outside `0..1`;
- duplicate sample identity;
- missing instrument or geometry information;
- unclear redistribution rights;
- undocumented processing or resampling.

## Release artefacts

Each public dataset release should contain:

- machine-readable spectra;
- schema;
- dataset manifest;
- measurement protocol version;
- checksums;
- licence;
- change log;
- QA report;
- optional AtlasFit bindings as derived data.

## Claim boundary

ARBE Measured v0.1 is a measurement library, not a manufacturer certification, production approval or guarantee of batch invariance. Physical paints may change across batches, substrates, application methods and ageing conditions.
