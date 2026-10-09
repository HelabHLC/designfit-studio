#!/usr/bin/env python3
"""Verify the read-only connector receipt, reconstructed files and checksums.

Hashes authenticate these saved exports, NOT unobserved raw server bytes.
No WordPress access or third-party dependencies are used.
"""
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent / 'live-2026-10-09'


def reconstruct(record):
    result = record['result']
    assert result['status'] == 'fulfilled', record['path']
    value = result['value']
    assert not value.get('isError', False), record['path']
    assert len(value['content']) == 1
    text = value['content'][0]['text']
    match = re.search(r'Lines (\d+)-(\d+) of (\d+)\n```\n([\s\S]*)\n```$', text)
    assert match, record['path']
    first, last, total = map(int, match.group(1, 2, 3))
    assert first == 1 and last == total, record['path']
    lines = match[4].split('\n')
    assert len(lines) == total, record['path']
    source = []
    for expected, line in enumerate(lines, 1):
        number, body = line.split('\t', 1)
        assert int(number) == expected, record['path']
        source.append(body)
    # No trimming or automatic terminal newline: the final empty line, if
    # returned by the provider, is retained. Original CRLF/LF is not attested.
    return '\n'.join(source).encode('utf-8')


def main():
    capture = json.loads((ROOT / 'capture.json').read_text())
    manifest = json.loads((ROOT / 'MANIFEST.json').read_text())
    inventory = capture['inventory']['content'][0]['text']
    expected = set(re.findall(r'  plugins/arbe-fp-structural-solver/(.+?) \(', inventory))
    actual = {r['path'] for r in capture['records']}
    saved = {str(p.relative_to(ROOT / 'source')) for p in (ROOT / 'source').rglob('*') if p.is_file()}
    assert len(actual) == len(capture['records']) == 20
    assert actual == expected == saved
    indexed = {f['path']: f for f in manifest['files']}
    assert set(indexed) == actual
    for record in capture['records']:
        path = record['path']
        data = reconstruct(record)
        assert data == (ROOT / 'source' / path).read_bytes(), path
        assert hashlib.sha256(data).hexdigest() == indexed[path]['export_sha256'], path
        assert len(data) == indexed[path]['export_bytes'], path
    comparison = json.loads((ROOT / 'COMPARISON.json').read_text())
    for entry in comparison['comparisons']:
        old = ROOT.parent / entry['repository_path_relative_to_source_recovery']
        new = ROOT / 'source' / entry['live_path']
        assert hashlib.sha256(old.read_bytes()).hexdigest() == entry['repository_sha256']
        assert hashlib.sha256(new.read_bytes()).hexdigest() == entry['live_export_sha256']
        assert (old.read_bytes() == new.read_bytes()) == entry['identical_export_bytes']
    for line in (ROOT / 'SHA256SUMS.txt').read_text().splitlines():
        digest, name = line.split('  ', 1)
        assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name
    print('PASS: 20 complete source views, receipt reconstruction, manifest, repository comparison and SHA-256 checks')


if __name__ == '__main__':
    main()
