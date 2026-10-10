# ARBE FP H055 Pilot Importer

This administrator-only plugin imports exactly one atlas reference, H055_L060_C085, and its 36 CXF-derived remission values from the bundled reviewed CSV. It checks the runtime master row, its own CSV SHA-256, the wavelength grid, the existing FP master, and transactional InnoDB tables before writing. The import is triggered manually from Tools > ARBE FP H055 Pilot and stops if the reference already exists.

The current FP Platform pigment library contains demo/not-validated candidate spectra. A ranking after this pilot import is experimental and not a measured formula or production approval. Do not treat this plugin as a general master importer. After verifying the one-reference test, deactivate the importer while keeping the imported reference in the FP Platform.

Source and licence attribution: see data/RELEASE_NOTICE.md. The source pickle is not bundled.
