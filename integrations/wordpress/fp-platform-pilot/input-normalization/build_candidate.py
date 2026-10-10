#!/usr/bin/env python3
"""Build a pinned, offline review candidate; never patch the archived source."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / 'source-recovery/live-2026-10-09/source'
REPO = ROOT.parents[3]
CHANGED = {'includes/color-query.php', 'includes/shortcodes.php',
           'includes/solver.php', 'includes/spectral-search.php'}


def inventory(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(root.rglob('*')) if p.is_file()}


def build(output):
    output = Path(output).resolve()
    # Only a new external scratch directory may receive the candidate.
    if output == REPO or REPO in output.parents or output.exists():
        raise ValueError('Output must be a new directory outside the repository')
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    if inventory(SOURCE.parent) != manifest['archive_files']:
        raise ValueError('Archived capture differs from the pinned baseline')
    if inventory(SOURCE) != manifest['baseline_files']:
        raise ValueError('Archived source differs from the pinned baseline')
    patch = ROOT / 'fp-reference-input.patch'
    if hashlib.sha256(patch.read_bytes()).hexdigest() != manifest['patch_sha256']:
        raise ValueError('Patch checksum mismatch')
    changed = {p for p in manifest['baseline_files'].keys() | manifest['candidate_files'].keys()
               if manifest['baseline_files'].get(p) != manifest['candidate_files'].get(p)}
    if changed != CHANGED:
        raise ValueError('Unexpected runtime patch scope')
    shutil.copytree(SOURCE, output)
    command = ['patch', '--directory', str(output), '--strip=1', '--batch', '--fuzz=0',
               '--input', str(patch)]
    subprocess.run(command + ['--dry-run'], check=True)
    subprocess.run(command, check=True)
    if inventory(output) != manifest['candidate_files']:
        raise ValueError('Candidate inventory/checksum mismatch')
    if inventory(SOURCE.parent) != manifest['archive_files']:
        raise ValueError('Archived capture changed during candidate preparation')
    print('PASS: pinned baseline; exactly 3 modified PHP files + 1 shared helper; candidate hashes')
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    build(parser.parse_args().output)
