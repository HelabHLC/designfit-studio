#!/usr/bin/env python3
"""Offline baseline + candidate checks. Requires Python 3, PHP 8.1+ and patch."""
import argparse
from pathlib import Path
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
from build_candidate import ROOT, build


def run(*args):
    subprocess.run([str(a) for a in args], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--php', default='php', help='PHP CLI executable')
    args = parser.parse_args()
    recovery = ROOT.parent / 'source-recovery'
    run('python3', recovery / 'verify_live_capture.py')
    run(args.php, '-n', recovery / 'tests/fp_code_regression.php')
    with tempfile.TemporaryDirectory(prefix='arbe-fp-input-') as temp:
        candidate = build(Path(temp) / 'candidate')
        files = sorted(candidate.rglob('*.php')) + sorted((ROOT / 'tests').rglob('*.php'))
        for path in files:
            result = subprocess.run([args.php, '-n', '-l', str(path)], capture_output=True, text=True)
            if result.returncode:
                raise RuntimeError(result.stdout + result.stderr)
        print(f'PASS: PHP lint for {len(files)} candidate/test files', flush=True)
        # Test both include orders; requiring either module provides the parser
        # without top-level WordPress calls or duplicate function declarations.
        for order in [('solver.php', 'spectral-search.php'), ('spectral-search.php', 'solver.php')]:
            code = ("define('ABSPATH', '/offline/');"
                    "require $argv[1]; require $argv[2];"
                    "if (arbe_fp_parse_color_query('FP::H055_L060_C085::X') !== 'H055_L060_C085') exit(1);")
            run(args.php, '-n', '-r', code, candidate / 'includes' / order[0], candidate / 'includes' / order[1])
        print('PASS: independent module loading in both orders', flush=True)
        run(args.php, '-n', ROOT / 'tests/input_paths.php', candidate)
    run('python3', recovery / 'verify_live_capture.py')
    print('PASS: offline regression; archived capture unchanged; no deployment')


if __name__ == '__main__':
    main()
