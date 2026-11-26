# v54.23: link previews. The page carries Open Graph tags pointing at site/og.jpg (1200x630) on the web copy, says
# noindex (kept out of search) and robots.txt lets preview bots in (so they can read the tags at all).
import os, re, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h = open(os.path.join(ROOT, 'pitcher_release.html'), encoding='utf-8').read()
head = h[:h.index('<style>')]
need = {'og:title', 'og:description', 'og:image', 'og:url', 'twitter:card'}
have = set(re.findall(r'(?:property|name)="((?:og|twitter):[a-z:_]+)"', head))
img = re.search(r'property="og:image" content="([^"]+)"', head).group(1)
size = Image.open(os.path.join(ROOT, 'site', os.path.basename(img))).size
robots = open(os.path.join(ROOT, 'site', 'robots.txt')).read()
ok = need <= have and size == (1200, 630) and 'noindex' in head and 'Disallow: /' not in robots
print('tags', sorted(have), 'image', img, size, 'noindex' in head, 'robots allows', 'Disallow: /' not in robots)
print('RESULT', 'PASS' if ok else 'FAIL')
