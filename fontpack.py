# Embedded fonts: cut the original font files in fonts/ down to just the characters the game writes, and return a
# <style> block of @font-face rules with the cut fonts inlined as data: URIs. Only the cut fonts go into the built HTML;
# the originals stay in fonts/ (with their licences).
#
# Licences (SIL Open Font License 1.1, see fonts/OFL-*.txt):
#  - Noto Sans KR: Copyright 2014-2021 Adobe, with Reserved Font Name 'Source'.
#  - Black Han Sans: Copyright 2015 The Black Han Sans Project Authors, no Reserved Font Name.
# A subset is a "Modified Version" under the OFL. The name 'Source' is never used, and the cut fonts are renamed anyway
# ("CFK Sans", "CFK Display") so they can't be mistaken for the originals. Each licence's full text and copyright line
# travel inside the HTML, next to the font they cover (OFL condition 2).
import base64, hashlib, io, os, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(ROOT, 'fonts')
CACHE = os.path.join(ROOT, '.fontcache')
SOURCES = ('template2.html', 'logic_part.js', 'draw_part.js')

# family name in the game -> (source file, [weights], licence file)
FACES = {
    'CFK Sans':    ('NotoSansKR[wght].ttf', [400, 700, 900], 'OFL-NotoSansKR.txt'),
    'CFK Display': ('BlackHanSans-Regular.ttf', [400], 'OFL-BlackHanSans.txt'),
}

def charset():
    """Every non-control character in the game's source (all its text is written there), plus printable ASCII."""
    s = ''.join(open(os.path.join(ROOT, n), encoding='utf-8').read() for n in SOURCES)
    cs = {c for c in s if ord(c) >= 0x20} | {chr(c) for c in range(0x20, 0x7f)} | set('…·→←↑↓▶◀▲▼★☆♪「」『』“”‘’')
    return ''.join(sorted(cs))

def cut(src, weight, family, chars):
    try: import fontTools, brotli   # noqa: F401  (brotli: woff2 compression)
    except ImportError: sys.exit('fontpack: needs fonttools and brotli  ->  pip install fonttools brotli')
    from fontTools.ttLib import TTFont
    from fontTools import subset
    f = TTFont(os.path.join(FONTS, src))
    if 'fvar' in f:                                   # the variable font: pin it at one weight first
        from fontTools.varLib import instancer
        f = instancer.instantiateVariableFont(f, {'wght': weight})
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']; opt.name_IDs = ['*']; opt.notdef_outline = True
    sub = subset.Subsetter(opt); sub.populate(text=chars); sub.subset(f)
    style = {400: 'Regular', 700: 'Bold', 900: 'Black'}[weight]
    names = f['name']
    for rec in list(names.names):                     # rename: a cut font must not pass for the original
        if rec.nameID in (1, 16): rec.string = family
        elif rec.nameID in (2, 17): rec.string = style
        elif rec.nameID == 4: rec.string = f'{family} {style}'
        elif rec.nameID == 6: rec.string = (family + '-' + style).replace(' ', '')
        elif rec.nameID in (3, 25): names.removeNames(nameID=rec.nameID)
    names.setName(f'{family} {style}; subset of the original for Creaky Fastball King', 3, 3, 1, 0x409)
    buf = io.BytesIO(); f.flavor = 'woff2'; f.save(buf); return buf.getvalue()

def font_css():
    chars = charset()
    key = hashlib.sha1((chars + '|' + '|'.join(f'{k}{v}' for k, v in sorted(FACES.items())) + '|' +
                        '|'.join(str(os.path.getsize(os.path.join(FONTS, v[0]))) for v in FACES.values())).encode()).hexdigest()[:16]
    os.makedirs(CACHE, exist_ok=True); cached = os.path.join(CACHE, key + '.css')
    if os.path.exists(cached): return open(cached, encoding='utf-8').read()
    parts = []
    for family, (src, weights, lic) in FACES.items():
        text = open(os.path.join(FONTS, lic), encoding='utf-8').read().replace('*/', '* /')
        parts.append(f'/* {family}: subset of {src}\n{text}\n*/')
        for w in weights:
            data = base64.b64encode(cut(src, w, family, chars)).decode()
            parts.append(f"@font-face{{font-family:'{family}';font-weight:{w};font-style:normal;font-display:block;"
                         f"src:url(data:font/woff2;base64,{data}) format('woff2');}}")
    css = '\n'.join(parts)
    for old in os.listdir(CACHE): os.remove(os.path.join(CACHE, old))
    open(cached, 'w', encoding='utf-8').write(css); return css

if __name__ == '__main__':
    css = font_css(); print('chars', len(charset()), 'css bytes', len(css))
