# ARBE Measured v0.1 — Pilot Measurement: Ultramarine PB29

## Status

Pilot acquisition specification. This document does not contain measured spectral values and must not be treated as evidence of a completed measurement.

## Objective

Use one commercially available single-pigment Ultramarine Blue (PB29) as the first end-to-end ARBE Measured record. The pilot validates:

- sample preparation;
- measurement provenance;
- repeatability;
- 380–730 nm / 10 nm export;
- raw-file checksum retention;
- AtlasFit binding;
- MixLock and Spectral Scissor compatibility;
- publication-gate behaviour.

## Required product criteria

Select a product that:

- declares PB29 as the only colouring pigment;
- has an identifiable manufacturer, product line and article number;
- has a recorded batch or lot number where available;
- is not mixed with white, black or another chromatic pigment;
- is commercially obtainable again for a later repeat measurement.

Product naming is metadata only. It is never an ARBE colour identity.

## Specimen plan

Prepare at least three independent drawdowns from the same tube or container.

Recommended pilot specimen:

- substrate: optical-brightener-free white drawdown card or another fully documented stable substrate;
- application: fixed-gap applicator where available;
- wet-film thickness: record the actual applicator gap;
- dilution: none unless required by the chosen application process;
- drying: minimum 7 days under recorded ambient conditions;
- backing during measurement: record white, black or instrument-defined backing;
- sample area: large enough for three non-overlapping measurement positions.

Do not combine measurements from different batches into one record.

## Measurement plan

For each prepared specimen:

1. Calibrate the instrument according to the manufacturer procedure.
2. Record instrument model, serial number, firmware/software version and geometry.
3. Measure at least three non-overlapping positions.
4. Retain every raw measurement file without modification.
5. Export spectral reflectance at 380, 390, …, 730 nm.
6. Compute a SHA-256 checksum for every retained raw file.
7. Record temperature, relative humidity, date and operator.

The accepted ARBE record should contain either:

- the explicitly documented arithmetic mean of the valid repeats; or
- the individual repeats plus a deterministic aggregation rule.

## Acceptance checks

The pilot passes only when:

- the record ID follows `ARBE-MEASURED-YYYY-NNNN`;
- the data class is `ARBE_MEASURED`;
- all required provenance fields are present;
- at least three repeats are retained;
- all 36 reflectance values are finite and within 0..1;
- the wavelength grid is exactly 380–730 nm in 10 nm steps;
- raw-file SHA-256 values are present;
- repeatability limits are reported, not hidden;
- AtlasFit produces ranked atlas candidates;
- any Reference Lock claim is supported by the configured lock rules;
- the publication gate passes only after rights and provenance are confirmed.

## Repeatability report

Report at minimum:

- mean spectrum;
- per-wavelength standard deviation;
- maximum per-wavelength range;
- Lab(D50/2°) for each repeat and for the mean;
- pairwise ΔE00 between repeats;
- any excluded measurement and the exclusion reason.

No universal repeatability threshold is asserted in this pilot document. Thresholds must be adopted only after instrument-specific evidence and multiple real sample runs.

## AtlasFit and identity boundary

The physical product remains an external material sample. AtlasFit may bind its measured appearance to one or more `Hxxx_Lxxx_Cxxx` candidates.

The following are distinct:

- product identity;
- pigment declaration PB29;
- measured spectrum;
- nearest atlas candidate;
- validated Reference Lock.

They must never be collapsed into one claim.

## Pilot record identifier

Reserve:

`ARBE-MEASURED-2026-0001`

This identifier remains provisional until the actual measurement package passes validation.

## Required output package

```text
ARBE-MEASURED-2026-0001/
├── record.json
├── spectra/
│   ├── repeat-01.csv
│   ├── repeat-02.csv
│   ├── repeat-03.csv
│   └── mean.csv
├── raw/
│   └── original instrument exports
├── images/
│   ├── product-label.jpg
│   ├── batch-label.jpg
│   └── prepared-specimen.jpg
├── checksums.sha256
└── validation-report.json
```

Images may be retained privately when public redistribution is not cleared.

## Completion condition

This pilot is complete only after a real PB29 sample has been prepared, measured and validated. Placeholder spectra, manufacturer screen values, RGB values and legacy `.rs` curves do not qualify as ARBE Measured evidence.
