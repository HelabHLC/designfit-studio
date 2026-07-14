#!/usr/bin/env python3
"""Verified one-way ingestion of the ARBE Atlas Master PKL.

Security boundary:
- Never load an untrusted pickle.
- Verify SHA-256 before pandas.read_pickle().
- Validate the canonical 13,283 x 114 schema.
- Export only non-executable runtime formats.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

import pandas as pd

EXPECTED_SHA256 = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"
EXPECTED_ROWS = 13283
EXPECTED_COLUMNS = 114
REFERENCE_PATTERN = re.compile(r"^H\d{3}_L\d{3}_C\d{3}$")
SPECTRAL_COLUMNS = [f"R_{wavelength}" for wavelength in range(380, 731, 10)]
REQUIRED_COLUMNS = [
    "reference",
    "atlas_identity_valid",
    "lambda_v2_method",
    "source_atlas",
    "source_cxf",
    "H",
    "L",
    "C",
    "lab_L",
    "lab_a",
    "lab_b",
    "lambda_v2_nm",
    *SPECTRAL_COLUMNS,
]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_frame(frame: pd.DataFrame) -> dict[str, object]:
    errors: list[str] = []

    if frame.shape != (EXPECTED_ROWS, EXPECTED_COLUMNS):
        errors.append(
            f"Expected {(EXPECTED_ROWS, EXPECTED_COLUMNS)}, got {frame.shape}."
        )

    missing = [column for column in REQUIRED_COLUMNS if column not in frame.columns]
    if missing:
        errors.append(f"Missing required columns: {missing}")

    if "reference" in frame.columns:
        references = frame["reference"].astype(str)
        invalid = references[~references.str.match(REFERENCE_PATTERN)]
        if not invalid.empty:
            errors.append(f"Invalid reference identifiers: {len(invalid)}")
        if references.duplicated().any():
            errors.append(f"Duplicate reference identifiers: {int(references.duplicated().sum())}")

    if "atlas_identity_valid" in frame.columns and not bool(frame["atlas_identity_valid"].all()):
        errors.append("atlas_identity_valid contains false values.")

    for column in SPECTRAL_COLUMNS:
        if column in frame.columns:
            series = pd.to_numeric(frame[column], errors="coerce")
            if series.isna().any():
                errors.append(f"Non-numeric spectral values in {column}.")
            if ((series < 0) | (series > 1)).any():
                errors.append(f"Reflectance outside 0..1 in {column}.")

    if errors:
        raise ValueError("Master PKL validation failed:\n- " + "\n- ".join(errors))

    return {
        "rows": int(frame.shape[0]),
        "columns": int(frame.shape[1]),
        "reference_count": int(frame["reference"].nunique()),
        "spectral_columns": len(SPECTRAL_COLUMNS),
        "spectral_min": float(frame[SPECTRAL_COLUMNS].min().min()),
        "spectral_max": float(frame[SPECTRAL_COLUMNS].max().max()),
        "lambda_v2_method_values": sorted(frame["lambda_v2_method"].dropna().astype(str).unique().tolist()),
        "source_atlas_values": sorted(frame["source_atlas"].dropna().astype(str).unique().tolist()),
        "source_cxf_values": sorted(frame["source_cxf"].dropna().astype(str).unique().tolist()),
    }


def export_runtime(frame: pd.DataFrame, output_dir: Path) -> dict[str, str]:
    output_dir.mkdir(parents=True, exist_ok=True)

    parquet_path = output_dir / "arbe-atlas-master-v2-illumext.parquet"
    schema_path = output_dir / "arbe-atlas-master-v2-illumext.schema.json"

    frame.to_parquet(parquet_path, index=False, compression="zstd")

    schema = {
        "datasetId": "arbe-atlas-master-active-v2-illumext",
        "recordCount": int(frame.shape[0]),
        "columnCount": int(frame.shape[1]),
        "columns": [
            {"name": name, "dtype": str(dtype)}
            for name, dtype in frame.dtypes.items()
        ],
    }
    schema_path.write_text(json.dumps(schema, indent=2), encoding="utf-8")

    return {
        "parquet": str(parquet_path),
        "parquetSha256": sha256_file(parquet_path),
        "schema": str(schema_path),
        "schemaSha256": sha256_file(schema_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--expected-sha256", default=EXPECTED_SHA256)
    args = parser.parse_args()

    actual_sha256 = sha256_file(args.source)
    if actual_sha256 != args.expected_sha256:
        raise SystemExit(
            f"SHA-256 mismatch: expected {args.expected_sha256}, got {actual_sha256}"
        )

    # Safe only after checksum verification against the trusted manifest.
    frame = pd.read_pickle(args.source)
    validation = validate_frame(frame)
    exports = export_runtime(frame, args.output_dir)

    report = {
        "source": str(args.source),
        "sourceSha256": actual_sha256,
        "validation": validation,
        "exports": exports,
    }
    report_path = args.output_dir / "ingestion-report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
