#!/usr/bin/env python3
"""Check reproducible ZIP bytes and run the input regression on the packaged PHP."""
import argparse
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

sys.dont_write_bytecode = True
from build_release import ROOT, SLUG, build_release


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--php', default='php')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='arbe-fp-package-test-') as temp:
        temp = Path(temp)
        first = build_release(temp / 'first')
        second = build_release(temp / 'second')
        assert first.read_bytes() == second.read_bytes(), 'Non-reproducible ZIP'
        with zipfile.ZipFile(first) as archive:
            archive.extractall(temp / 'unpacked')
        source = temp / 'unpacked' / SLUG
        for file in source.rglob('*.php'):
            subprocess.run([args.php, '-n', '-l', str(file)], check=True, capture_output=True)
        subprocess.run([args.php, '-n', str(ROOT.parent / 'input-normalization/tests/input_paths.php'), str(source)], check=True)
        print('PASS: identical repeat-build ZIP; packaged PHP lint and input regression')


if __name__ == '__main__':
    main()
