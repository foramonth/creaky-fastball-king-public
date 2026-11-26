# v54.20: fonts are embedded (cut to the game's own text), so the page makes no network request at all, shows the same
# lettering offline, and is only revealed once the fonts are ready (html.fontwait), with a timeout so it can't hang.
import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
F = sys.argv[1] if len(sys.argv) > 1 else 'pitcher_release.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        ctx = await b.new_context(); pg = await ctx.new_page(); ext = []; errs = []
        async def gate(r):                                   # no network: anything not file:/data: is recorded and refused
            if r.request.url.startswith(('file:', 'data:')): await r.continue_()
            else: ext.append(r.request.url[:80]); await r.abort()
        await ctx.route('**/*', gate)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(ROOT_URL + F); await pg.wait_for_timeout(600)
        shown = await pg.evaluate("!document.documentElement.classList.contains('fontwait')")
        faces = await pg.evaluate("[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/\"/g, '') + ' ' + f.weight).sort()")
        # the lettering really uses the embedded face: the title font measures differently from the fallback
        differs = await pg.evaluate("""(() => { const c = document.createElement('canvas').getContext('2d');
            c.font = '400 40px "CFK Display", monospace'; const a = c.measureText('삐걱삐걱 직구왕').width;
            c.font = '400 40px monospace'; const b = c.measureText('삐걱삐걱 직구왕').width; return Math.abs(a - b) > 1; })()""")
        need = {'CFK Sans 400', 'CFK Sans 700', 'CFK Sans 900', 'CFK Display 400'}
        ok = shown and need <= set(faces) and differs and not ext and not errs
        print('revealed', shown, 'faces', faces, 'embedded face used', differs, 'external requests', ext, 'errors', errs)
        print('RESULT', 'PASS' if ok else 'FAIL'); await b.close()
asyncio.run(main())
