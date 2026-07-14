# Legacy CGATS parser review

## Source reviewed

Legacy plugin: `arbe-lambda-spectral-atlas` version 12.8.

Relevant file:

```text
plugins/arbe-lambda-spectral-atlas/includes/parser.php
```

The legacy parser:

1. locates the first `BEGIN_DATA` marker;
2. reads until `END_DATA`;
3. splits each row first by tab and then by generic whitespace;
4. requires at least 37 columns;
5. treats the first value as the sample key;
6. converts all remaining values with PHP `floatval`;
7. accepts a row only when exactly 36 values remain;
8. stores results in a JSON object keyed by sample name.

## Strengths of the legacy implementation

- small and operationally simple;
- tolerant of tab- or whitespace-separated rows;
- produces a fast lookup cache for the WordPress viewer;
- implicitly expects the official 36-band atlas shape.

## Material weaknesses

The parser does not validate:

- `BEGIN_DATA_FORMAT` / `END_DATA_FORMAT`;
- `NUMBER_OF_FIELDS`;
- `NUMBER_OF_SETS`;
- field names or wavelength order;
- canonical `Hxxx_Lxxx_Cxxx` identities;
- duplicate sample identities;
- non-numeric input, because `floatval` silently converts malformed strings;
- reflectance range `0..1`;
- source version, checksum, licence, illuminant or observer;
- incomplete datasets, beyond skipping malformed individual rows.

Duplicate sample names silently overwrite previous values in the JSON index. Invalid rows are silently skipped. That behavior is useful for a display cache but unsuitable for an authoritative reference import.

## Decision

The legacy PHP parser will not be ported verbatim.

The TypeScript importer remains the authoritative ingestion boundary because it is fail-fast, version-aware and evidence-preserving. Compatibility retained from the legacy parser is limited to whitespace-delimited data rows and the official 36-band spectral shape.

## Hardening added after review

The TypeScript importer now additionally checks:

- CGATS block ordering;
- exactly one data-format field line;
- consistency of `NUMBER_OF_FIELDS`;
- duplicate wavelength fields;
- strictly increasing wavelength order.

Existing checks already cover:

- canonical atlas identities;
- duplicate atlas identities;
- numeric reflectance values;
- reflectance range `0..1`;
- declared and expected record counts;
- provenance metadata and dataset versioning.

## Claim boundary

Passing the importer establishes structural dataset conformance only. It does not prove that a spectrum is measured, physically realizable, production-approved or suitable for a final Reference Lock.
