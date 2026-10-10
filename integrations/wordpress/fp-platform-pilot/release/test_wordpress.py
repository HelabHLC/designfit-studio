#!/usr/bin/env python3
"""Disposable native WordPress/MySQL acceptance. Never point at a real site."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.dont_write_bytecode = True
from build_release import ROOT, SLUG, build_release, make_zip


def literal(value):
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wp-root', required=True)
    parser.add_argument('--report-dir', required=True)
    parser.add_argument('--php', default='php')
    args = parser.parse_args()
    wp = Path(args.wp_root).resolve()
    report = Path(args.report_dir).resolve()
    if (wp / 'wp-config.php').exists() or not (wp / 'wp-load.php').is_file():
        raise ValueError('Requires a fresh WordPress checkout without wp-config.php')
    ref = subprocess.check_output(['git', '-C', str(wp), 'rev-parse', 'HEAD'], text=True).strip()
    assert ref == '160387b7312c9407c7fe4b1d3dd2055206749a34', 'Expected WordPress 7.1.2 source commit'
    assert os.environ.get('FP_TEST_DB_HOST') in ('127.0.0.1:3306', 'localhost'), 'Local test database only'
    report.mkdir(parents=True, exist_ok=False)
    package = build_release(report / 'package')
    old_source = ROOT.parent / 'source-recovery/live-2026-10-09/source'
    baseline = report / 'baseline-test-only.zip'
    make_zip(baseline, {str(p.relative_to(old_source)):p.read_bytes() for p in old_source.rglob('*') if p.is_file()})
    config = "<?php\n"
    values = {'DB_NAME':'arbe_fp_acceptance', 'DB_USER':os.environ.get('FP_TEST_DB_USER', 'root'),
              'DB_PASSWORD':os.environ.get('FP_TEST_DB_PASSWORD', ''),
              'DB_HOST':os.environ['FP_TEST_DB_HOST'], 'DB_CHARSET':'utf8mb4', 'DB_COLLATE':'',
              'WP_HOME':'http://127.0.0.1:8765', 'WP_SITEURL':'http://127.0.0.1:8765',
              'FS_METHOD':'direct', 'WP_ENVIRONMENT_TYPE':'local', 'WP_DEBUG_LOG':str(report/'debug.log')}
    for key, value in values.items():
        config += f"define('{key}', {literal(value)});\n"
    config += "define('ARBE_FP_ISOLATED_ACCEPTANCE', true);\ndefine('WP_DEBUG', true);\n"
    config += "define('WP_DEBUG_DISPLAY', false);\ndefine('WP_HTTP_BLOCK_EXTERNAL', true);\n"
    config += "define('DISABLE_WP_CRON', true);\ndefine('AUTOMATIC_UPDATER_DISABLED', true);\n"
    config += "define('WP_DISABLE_FATAL_ERROR_HANDLER', true);\n"
    config += "$table_prefix = 'fptest_';\n"
    config += "if (!defined('ABSPATH')) define('ABSPATH', __DIR__ . '/');\nrequire_once ABSPATH . 'wp-settings.php';\n"
    (wp/'wp-config.php').write_text(config)
    mu = wp/'wp-content/mu-plugins'
    mu.mkdir(exist_ok=True)
    shutil.copyfile(ROOT/'tests/guard.php', mu/'fp-acceptance-guard.php')
    env = dict(os.environ, FP_WP_ROOT=str(wp), FP_REPORT_DIR=str(report),
               FP_BASELINE_ZIP=str(baseline), FP_RELEASE_ZIP=str(package))
    def phase(name):
        try:
            subprocess.run([args.php, str(ROOT/'tests/wordpress.php')],
                           env=dict(env, FP_ACCEPTANCE_PHASE=name), check=True)
        except subprocess.CalledProcessError:
            debug = report/'debug.log'
            if debug.exists():
                print(debug.read_text(), flush=True)
            raise
    for name in ['install','baseline','upgrade','accept','reactivate']:
        phase(name)

    # Real anonymous HTTP requests traverse WordPress's public router and pages.
    http_checks = []
    def request(path, expected):
        try:
            with urllib.request.urlopen('http://127.0.0.1:8765' + path, timeout=60) as response:
                status, body = response.status, response.read().decode()
        except urllib.error.HTTPError as error:
            status, body = error.code, error.read().decode()
        assert status == expected, (path, status, body[:300])
        http_checks.append({'path':path, 'status':status})
        return body
    with (report/'http-server.log').open('w') as log:
        server = subprocess.Popen([args.php, '-S', '127.0.0.1:8765', '-t', str(wp)],
                                  env=dict(env, FP_ACCEPTANCE_PHASE='http'), stdout=log, stderr=log)
        try:
            for _ in range(50):
                if server.poll() is not None:
                    raise RuntimeError('PHP test HTTP server stopped')
                try:
                    urllib.request.urlopen('http://127.0.0.1:8765/wp-includes/css/dashicons.min.css', timeout=1).close()
                    break
                except OSError:
                    time.sleep(0.1)
            valid = ['H055_L060_C085', 'FP:H055_L060_C085', 'FP::H055_L060_C085::SYNTHETIC']
            for color in valid:
                for route in ['solve','spectral-search','certificate']:
                    query = urllib.parse.urlencode({'rest_route':'/arbe/v1/'+route,'color':color,'adaptive':0,'max_candidates':3,'max_components':2,'step':25,'top':3})
                    data = json.loads(request('/index.php?'+query, 200))
                    assert (data['reference']['fp_color_id'] if route=='certificate' else data['fp_color']['id']) == 'H055_L060_C085'
            for color in ['FP::H55_L060_C085::X','H055_FP:L060_C085','FP::H999_L999_C999::X']:
                data = json.loads(request('/index.php?'+urllib.parse.urlencode({'rest_route':'/arbe/v1/solve','color':color}), 404))
                assert data['code'] == 'arbe_color_not_found'
            data = json.loads(request('/index.php?rest_route=/arbe/v1/solve&color%5B%5D=H055_L060_C085', 404))
            assert data['code'] == 'arbe_color_not_found'
            pages = json.loads((report/'fixture-state.json').read_text())['pages']
            for tag, page in pages.items():
                for color in [valid[-1], 'FP::H55_L060_C085::X']:
                    body = request('/?'+urllib.parse.urlencode({'page_id':page,'fp_color':color}), 200)
                    assert ('H055_L060_C085' in body) if color==valid[-1] else ('FP-Color not found' in body)
                    (report/(tag+('-valid.html' if color==valid[-1] else '-invalid.html'))).write_text(body)
        finally:
            server.terminate()
            server.wait(timeout=15)
    (report/'http.json').write_text(json.dumps({'status':'PASS','requests':http_checks}, indent=2)+'\n')
    print(f'PASS: {len(http_checks)} real anonymous WordPress HTTP requests')
    # Rollback uses the preserved source only in this throwaway fixture, not as
    # a claim that it replaces the production host-side backup requirement.
    phase('rollback')
    phase('rollback-check')
    (wp/'wp-config.php').write_text(config.replace("$table_prefix = 'fptest_';", "$table_prefix = 'fpfresh_';"))
    phase('fresh')
    debug = report/'debug.log'
    if debug.exists() and debug.read_text().strip():
        raise RuntimeError('WordPress debug log is nonempty: '+debug.read_text()[:2000])
    phases = {name:json.loads((report/(name+'.json')).read_text())
              for name in ['install','baseline','upgrade','accept','reactivate','rollback','rollback-check','fresh']}
    summary = {'status':'PASS','wordpress_commit':ref,'wordpress_version':'7.1.2',
               'php':phases['accept']['php'],'database':phases['accept']['database'],
               'phase_assertions':sum(p['assertions'] for p in phases.values()),
               'http_requests':len(http_checks),'protected_tables':8,'phases':phases,
               'scope':'Real WordPress on a disposable synthetic database; no production/site-plugin-stack acceptance; FP payload not authenticated'}
    (report/'acceptance.json').write_text(json.dumps(summary, indent=2)+'\n')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
