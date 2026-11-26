# Demo / test build: physics + logic + draw poured into template2.html -> pitcher.html (with the demo buttons).
# Usage: python3 build.py [RELT_R] [RELT_S]   (defaults match the release build: 0.79 0.69)
import os, sys, subprocess, shutil
ROOT = os.path.dirname(os.path.abspath(__file__))

def rd(n): return open(os.path.join(ROOT, n), encoding='utf-8').read()

def check_js(html_path):
    """Everything shares one global script: a duplicated top-level name is a SyntaxError and the page goes blank.
    Catch that at build time with `node --check` (skipped with a warning if node isn't installed)."""
    if not shutil.which('node'): print('warning: node not found, skipping syntax check'); return
    h = open(html_path, encoding='utf-8').read()
    js = h[h.index('<script>') + len('<script>'):h.rindex('</script>')]
    tmp = html_path + '.check.js'
    open(tmp, 'w', encoding='utf-8').write(js)
    try:
        r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
        if r.returncode: sys.exit(f'SYNTAX ERROR in {os.path.basename(html_path)}:\n{r.stderr}')
    finally: os.remove(tmp)

def build(relt_r='0.79', relt_s='0.69'):
    t = rd('template2.html'); p = rd('physics.js')
    phys = p[p.index('// PHYSICS-START'):p.index('// PHYSICS-END') + len('// PHYSICS-END')]
    logic = rd('logic_part.js').replace('RELT_R', relt_r).replace('RELT_S', relt_s)
    for slot in ('/*PHYSICS*/', '/*LOGIC*/', '/*DRAW*/', '/*FONTS*/'): assert t.count(slot) == 1, slot
    from fontpack import font_css                     # the fonts, cut to the game's own text, inlined (no Google Fonts)
    t = t.replace('/*FONTS*/', font_css())
    t = t.replace('/*PHYSICS*/', phys).replace('/*LOGIC*/', logic).replace('/*DRAW*/', rd('draw_part.js'))
    out = os.path.join(ROOT, 'pitcher.html')
    open(out, 'w', encoding='utf-8').write(t)
    check_js(out)
    print('ok pitcher.html', len(t))
    return out

if __name__ == '__main__':
    build(*sys.argv[1:3])
