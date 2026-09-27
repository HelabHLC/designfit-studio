#!/usr/bin/env python3
"""Prepare one reviewed FP Platform reference-curve pilot from the reconciled atlas.

This utility does not connect to WordPress or write to its database.  A colour
must already be registered in the FP Platform master before its built-in curve
CSV importer can accept the generated file.
"""

import argparse
import csv
import hashlib
import json
from pathlib import Path

import pandas as pd


WAVELENGTHS = tuple(range(380, 731, 10))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(source: Path, reference: str, output: Path) -> dict:
    frame = pd.read_pickle(source)
    if len(frame) != 13283 or frame.reference.nunique() != len(frame):
        raise ValueError("Unexpected atlas size or duplicate reference IDs")
    selected = frame.loc[frame.reference.eq(reference)]
    if len(selected) != 1:
        raise ValueError("Reference must occur exactly once in the atlas")
    row = selected.iloc[0]
    if not (row.atlas_identity_valid and row.cxf_present and row.cxf_spectrum_exact_match_bin):
        raise ValueError("Atlas identity or CXF spectrum has not been verified")
    if row.spectrum_grid_nm != "380-730 step 10":
        raise ValueError("Unexpected spectral grid")
    curve = [float(row[f"R_{w}"]) for w in WAVELENGTHS]
    if not all(0 <= v <= 1 for v in curve):
        raise ValueError("Remission outside 0..1")
    output.mkdir(parents=True, exist_ok=True)
    curve_path = output / f"{reference}_reference_curves.csv"
    with curve_path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.writer(stream)
        writer.writerow(("fp_color_id", "wavelength_nm", "remission"))
        writer.writerows((reference, wavelength, format(value, ".10g"))
                         for wavelength, value in zip(WAVELENGTHS, curve))
    manifest = {
        "reference": reference,
        "source_pickle_sha256": sha256(source),
        "source_cxf": row.source_cxf,
        "grid": row.spectrum_grid_nm,
        "curve_points": len(curve),
        "csv_sha256": sha256(curve_path),
        "hex": row.hex,
        "rgb": row.rgb,
        "lab": [float(row.lab_L), float(row.lab_a), float(row.lab_b)],
        "status": "pilot data; pigment rankings are not validated formulas",
    }
    (output / f"{reference}_pilot_manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Reviewed reconciled source pickle")
    parser.add_argument("reference", help="Exact Hxxx_Lxxx_Cxxx ID")
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.reference, args.output), indent=2))
