# Release build: same game, with every trace of the demo recordings removed.
# Usage: python3 build_release.py            -> pitcher.html (demo) + pitcher_release.html (release)
#        python3 build_release.py 54.8       -> also copies them to dist/creaky-fastball-king-v54.8(-demo).html
#                                               and the release build to site/index.html (the Vercel copy)
import os, re, sys, shutil
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
from build import build, check_js
build('0.79', '0.69')
t = open(os.path.join(ROOT, 'pitcher.html'), encoding='utf-8').read()

# 1) the demo buttons in the HTML
t = re.sub(r'\n\s*<button class="btn ghost small" data-demo="[a-z0-9]+">[^<]*</button>', '', t)
# 2) the demo block in the logic, between its markers
assert t.count('// DEMO-START') == 1 and t.count('// DEMO-END') == 1, 'DEMO-START / DEMO-END markers missing or duplicated'
a = t.index('// DEMO-START'); b = t.index('// DEMO-END\n') + len('// DEMO-END\n')
t = t[:a] + t[b:]
# 3) the one stray call outside the block
line = ' refreshDemos();   // DEMO-LINE (build_release.py drops this call)'
assert t.count(line) == 1, 'DEMO-LINE call not found'
t = t.replace(line, '')
# 4) release keeps the player's real saved progress
ns = "const SAVE_NS = 'pitchqwop.demo.';"
assert t.count(ns) == 1, 'SAVE_NS line not found'
t = t.replace(ns, "const SAVE_NS = 'pitchqwop.';")

LEAKS = ['DEMO_', 'data-demo', 'gaitSeq', 'startDemo', 'refreshDemos', 'demoVar', 'sfxTest', 'SHOW_DEMOS',
         '효과음 테스트', 'DEMO-START', 'DEMO-END', 'DEMO-LINE', 'pitchqwop.demo.']
left = [w for w in LEAKS if w in t]
assert not left, f'demo code left in the release build: {left}'
assert 'ROBO_SEQ' in t, 'ROBO_SEQ (투구 교실 시범) must stay in the release build'
out = os.path.join(ROOT, 'pitcher_release.html')
open(out, 'w', encoding='utf-8').write(t)
check_js(out)
print('ok pitcher_release.html', len(t))

if len(sys.argv) > 1:
    v = sys.argv[1].lstrip('v'); d = os.path.join(ROOT, 'dist'); os.makedirs(d, exist_ok=True)
    shutil.copy(out, os.path.join(d, f'creaky-fastball-king-v{v}.html'))
    shutil.copy(os.path.join(ROOT, 'pitcher.html'), os.path.join(d, f'creaky-fastball-king-v{v}-demo.html'))
    print(f'dist/creaky-fastball-king-v{v}.html + dist/creaky-fastball-king-v{v}-demo.html')
    # the web copy (Vercel serves site/ as is, on push): always the release build of the version just made
    sd = os.path.join(ROOT, 'site'); os.makedirs(sd, exist_ok=True)
    shutil.copy(out, os.path.join(sd, 'index.html'))
    print(f'site/index.html = v{v} release (goes live on Vercel when pushed)')
