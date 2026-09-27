# Runtime data boundary

The live WordPress plugin uses `runtime-master-v1.csv`, but that derived
dataset is intentionally absent from this public source review. Its
redistribution rights, upstream composition and immutable release manifest
must be resolved before a public data release.

The supplied candidate archive was validated locally as 13,283 unique
references with CSV SHA-256
`9baa2cdfe75e3489fc94bc92377f5b0509f2f5688a279d92c1201559757f7fd4`.
This digest describes the runtime CSV, not the frozen PKL master.

To run the WordPress importer in a controlled installation, place an
authorized copy at `data/runtime-master-v1.csv` and run
`python tools/validate_runtime_master.py` before import.
