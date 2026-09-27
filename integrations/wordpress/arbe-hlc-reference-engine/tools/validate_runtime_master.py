#!/usr/bin/env python3
"""Validate the packaged runtime CSV before a WordPress release."""

import csv
import hashlib
import math
import re
import sys
from pathlib import Path

CSV = Path(__file__).resolve().parents[1] / "data/runtime-master-v1.csv"
EXPECTED_ROWS = 13283
REFERENCE = re.compile(r"H\d{3}_L\d{3}_C\d{3}")
HEX = re.compile(r"#[0-9A-Fa-f]{6}")


def main() -> None:
    seen = set()
    with CSV.open(newline="", encoding="utf-8") as handle:
        rows = csv.DictReader(handle)
        for line, row in enumerate(rows, 2):
            ref = row["reference"]
            assert REFERENCE.fullmatch(ref), (line, "invalid reference", ref)
            assert ref not in seen, (line, "duplicate reference", ref)
            seen.add(ref)
            assert row["lambda_v2_method"] == "Brent", (line, "method")
            assert row["atlas_identity_valid"] == "True", (line, "identity")
            assert HEX.fullmatch(row["hex"]), (line, "hex")
            rgb = [int(n) for n in re.findall(r"\d+", row["rgb"])]
            assert len(rgb) == 3 and all(0 <= n <= 255 for n in rgb), (line, "rgb")
            assert row["hex"].upper() == "#{:02X}{:02X}{:02X}".format(*rgb), (line, "rgb/hex mismatch")
            values = [float(row[key]) for key in (
                "lab_L", "lab_a", "lab_b", "lambda_v2_nm", "lambda_ee_nm",
                "delta_lambda_nm", "mu2_nm2", "sigma_star_nm", "mu3_nm3"
            )]
            assert all(math.isfinite(value) for value in values), (line, "nonfinite")
            assert 380 <= values[3] <= 730 and 380 <= values[4] <= 730, (line, "wavelength")
            assert abs((values[3] - values[4]) - values[5]) <= 0.00011, (line, "delta lambda")
    assert len(seen) == EXPECTED_ROWS, ("row count", len(seen))
    digest = hashlib.sha256(CSV.read_bytes()).hexdigest()
    print(f"PASS: {len(seen)} unique references, runtime CSV SHA-256 {digest}")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, ValueError, KeyError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)
