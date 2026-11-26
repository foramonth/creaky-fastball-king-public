# Build both files, then run every regression test and print one PASS/FAIL line each.
#   python3 tests/run_all.py            full run (about 15-20 minutes)
#   python3 tests/run_all.py --ui       layout only: overlap / off-screen checks + the tutorial flow (about 5 minutes)
#   python3 tests/run_all.py --quick    physics compare + demos + the v54.8+ bug checks + a short fuzz (about 7 minutes)
#   python3 tests/run_all.py cmp fuzz   only the named tests
# Full output of each test goes to tests/logs/<name>.log. Exit code is 1 if anything failed.
import json, os, re, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
BASE = 'baseline/creaky-fastball-king-v54.7-demo.html'   # physics reference (see CLAUDE.md before changing it)
CMP_EXPECT = 31                                          # fwd>5 out of 70 on the reference

def last(out): return out.strip().splitlines()[-1] if out.strip() else ''

def chk_cmp(out):
    rows = re.findall(r'^(\S+) (\[[^\]]*\]) fwd>5: (\d+) / 70$', out, re.M)
    if len(rows) != 3: return 'expected 3 result lines'
    lists = {r[1] for r in rows}
    if len(lists) != 1: return 'physics differ: ' + '; '.join(f'{r[0]} fwd>5={r[2]}' for r in rows)
    if int(rows[0][2]) != CMP_EXPECT: return f'fwd>5 is {rows[0][2]}, expected {CMP_EXPECT}'
def chk_demo2(out):
    need = ['삐짐', '셀프 수비', '포수 장외 홈런 ★★★', '투수 자진 납치 ★★★', '10점짜리 스트라이크', '직접 배달']
    miss = [t for t in need if t not in out]
    if miss: return 'missing: ' + ', '.join(miss)
    if last(out) != '[]': return 'page errors: ' + last(out)
def chk_v52t(out):
    if '2루 직배송' not in out: return '2루 직배송 not reached'
    if last(out) != '[]': return 'page errors: ' + last(out)
def chk_result(out): return None if 'RESULT PASS' in out else 'see log'
def chk_ov(out):
    bad = [l for l in out.splitlines() if 'overlaps:' in l and not l.endswith('overlaps: [] offscreen: []')]
    errs = [l for l in out.splitlines() if l.startswith('[') and l != '[]']
    if bad: return f'{len(bad)} layouts overlap / go off screen'
    if errs: return 'page errors: ' + errs[0]
def chk_noerr(out): return None if last(out).endswith('[]') else 'page errors: ' + last(out)
def chk_fuzz(out):
    try: r = json.loads(out)
    except Exception: return 'no JSON output'
    probs = [f'{k}={r[k]}' for k in ('pageErrorCount', 'stuck', 'nan') if r.get(k)]
    if r.get('errors'): probs.append(f"errors={len(r['errors'])} ({r['errors'][0]})")
    if probs: return ', '.join(probs)

FULL = [
    ('cmp',        ['cmp.py', BASE, 'pitcher.html', 'pitcher_release.html'], chk_cmp),
    ('demo2',      ['demo2.py'], chk_demo2),
    ('v52t',       ['v52t.py'], chk_v52t),
    ('resettimer', ['resettimer.py'], chk_result),
    ('savens',     ['savens.py'], chk_result),
    ('tutreveal',  ['tutreveal.py'], chk_result),
    ('sfxresume',  ['sfxresume.py'], chk_result),
    ('tickerpin',  ['tickerpin.py'], chk_result),
    ('fontembed',  ['fontembed.py'], chk_result),
    ('cspcheck',   ['cspcheck.py'], chk_result),
    ('mobilenote', ['mobilenote.py'], chk_result),
    ('ogmeta',     ['ogmeta.py'], chk_result),
    ('ov',         ['ov.py', 'pitcher.html'], chk_ov),
    ('k1024',      ['k1024.py'], None),
    ('m1024b',     ['m1024b.py'], None),
    ('tuttest2',   ['tuttest2.py'], chk_noerr),
    ('tuttest3',   ['tuttest3.py'], chk_noerr),
    ('tut6',       ['tut6.py'], chk_noerr),
    ('tutsolo',    ['tutsolo.py'], chk_result),
    ('falltest',   ['falltest.py'], chk_noerr),   # real-time: the title it prints may vary, only errors count
    ('blurtest',   ['blurtest.py'], chk_noerr),
    ('mutetest',   ['mutetest.py'], chk_noerr),
    ('fuzz',       ['fuzz2.py', 'pitcher_release.html', '150', '7'], chk_fuzz),
]
QUICK = ['cmp', 'demo2', 'resettimer', 'savens', 'tutreveal', 'sfxresume', 'fuzz']
UI = ['ov', 'k1024', 'm1024b', 'tuttest3', 'tickerpin', 'fontembed', 'cspcheck', 'mobilenote', 'ogmeta']

def main():
    args = sys.argv[1:]; quick = '--quick' in args; ui = '--ui' in args; names = [a for a in args if not a.startswith('-')]
    pick = names or (QUICK if quick else UI if ui else None)
    tests = [t for t in FULL if pick is None or t[0] in pick]
    if quick: tests = [(n, (a[:2] + ['40', '7'] if n == 'fuzz' else a), c) for n, a, c in tests]
    print('build ...', flush=True)
    b = subprocess.run([sys.executable, os.path.join(ROOT, 'build_release.py')], capture_output=True, text=True)
    if b.returncode: print('BUILD FAILED\n' + b.stdout + b.stderr); sys.exit(1)
    print(b.stdout.strip())
    os.makedirs(os.path.join(HERE, 'logs'), exist_ok=True)
    failed = 0
    for name, argv, check in tests:
        t0 = time.time()
        try:
            r = subprocess.run([sys.executable, argv[0], *argv[1:]], cwd=HERE, capture_output=True, text=True, timeout=1200)
            out, rc = r.stdout + r.stderr, r.returncode
        except subprocess.TimeoutExpired: out, rc = 'TIMEOUT', -1
        open(os.path.join(HERE, 'logs', name + '.log'), 'w', encoding='utf-8').write(out)
        why = ('exit code %d' % rc) if rc else ('Traceback' if 'Traceback' in out else (check(r.stdout) if check else None))
        failed += bool(why)
        print(f"{'PASS' if not why else 'FAIL'}  {name:<11} {time.time() - t0:5.0f}s" + (f'  {why}' if why else ''), flush=True)
    print(f'\n{len(tests) - failed}/{len(tests)} passed' + ('' if not failed else '  (logs: tests/logs/)'))
    sys.exit(1 if failed else 0)

if __name__ == '__main__': main()
