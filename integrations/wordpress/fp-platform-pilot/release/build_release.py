#!/usr/bin/env python3
"""Build a deterministic, installable FP Platform release candidate offline."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / 'input-normalization'))
from build_candidate import build

VERSION = '5.2.1-rc1'
SLUG = 'arbe-fp-structural-solver'
ZIP_NAME = f'arbe-fp-platform-{VERSION}.zip'
BASELINE = '6ab35fc498591e2b06e952fa92224537348976b1'
PARSER_COMMIT = 'f549028b470b78f68905830a2759524b57c70df2'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def make_zip(path, files):
    # Stored members and fixed metadata avoid zlib/version/timestamp variance.
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_STORED) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(f'{SLUG}/{name}', (2026, 10, 10, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)


def build_release(output):
    output = Path(output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='arbe-fp-release-') as temp:
        candidate = build(Path(temp) / 'source')
        patch = ROOT / 'release-entry.patch'
        command = ['patch', '--directory', str(candidate), '--strip=1', '--batch',
                   '--fuzz=0', '--input', str(patch)]
        subprocess.run(command + ['--dry-run'], check=True)
        subprocess.run(command, check=True)
        files = {str(p.relative_to(candidate)): p.read_bytes()
                 for p in sorted(candidate.rglob('*')) if p.is_file()}
        entry = files['arbe-fp-structural-solver.php'].decode()
        assert f' * Version: {VERSION}' in entry
        assert f"define('ARBE_FP_SOLVER_VERSION', '{VERSION}');" in entry
        assert "define('ARBE_FP_SCHEMA_VERSION', '5.2.0');" in entry
        files['readme.txt'] = (ROOT / 'plugin-readme.txt').read_bytes()
        manifest = {
            'name': 'ARBE FP Platform', 'version': VERSION, 'schema_version': '5.2.0',
            'status': 'RELEASE_CANDIDATE_NOT_PRODUCTION_APPROVED',
            'package': ZIP_NAME, 'plugin_file': f'{SLUG}/arbe-fp-structural-solver.php',
            'baseline_commit': BASELINE, 'parser_proposal_commit': PARSER_COMMIT,
            'integrity_boundary': 'Saved UTF-8/LF source views; not attested server bytes',
            'payload_validation': 'NOT_PERFORMED',
            'release_entry_patch_sha256': sha(patch.read_bytes()),
            'parser_patch_sha256': sha((ROOT.parent / 'input-normalization/fp-reference-input.patch').read_bytes()),
            'files_sha256': {name: sha(data) for name, data in sorted(files.items())
                             if name != 'release-manifest.json'},
        }
        files['release-manifest.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
        package = output / ZIP_NAME
        make_zip(package, files)
        with zipfile.ZipFile(package) as archive:
            assert len(archive.namelist()) == len(set(archive.namelist())) == 22
            assert archive.testzip() is None
            for name, data in files.items():
                assert archive.read(f'{SLUG}/{name}') == data
        external = {
            **{k: v for k, v in manifest.items() if k != 'files_sha256'},
            'package_sha256': sha(package.read_bytes()),
            'files_sha256': {name: sha(data) for name, data in sorted(files.items())},
        }
        (output / 'package-manifest.json').write_text(json.dumps(external, indent=2) + '\n')
        sums = ''.join(f'{sha((output/name).read_bytes())}  {name}\n'
                       for name in [ZIP_NAME, 'package-manifest.json'])
        (output / 'SHA256SUMS.txt').write_text(sums)
        print(f'PASS: {ZIP_NAME}; 22 verified files; SHA-256 {external["package_sha256"]}')
        return package


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    build_release(parser.parse_args().output)
