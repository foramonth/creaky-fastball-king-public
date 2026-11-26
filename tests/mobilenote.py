# v54.22: touch-only screens (phones, tablets) get a "this broadcast is keyboard-only" notice over everything; a desktop
# never sees it. The notice shows the page's address, and "키보드를 연결했어요 · 계속하기" closes it (a tablet with a keyboard).
import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
F = sys.argv[1] if len(sys.argv) > 1 else 'pitcher_release.html'
async def check(p, b, dev):
    opts = dict(p.devices[dev]) if dev else {'viewport': {'width': 1280, 'height': 720}}; opts.pop('default_browser_type', None)
    ctx = await b.new_context(**opts); pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(ROOT_URL + F); await pg.wait_for_timeout(700)
    shown = await pg.evaluate("getComputedStyle(document.getElementById('mobileNote')).display !== 'none'")
    url = await pg.evaluate("document.getElementById('mobileNoteUrl').textContent === location.href")
    fits = closed = None
    if shown:
        fits = await pg.evaluate("(() => { const r = document.querySelector('#mobileNote .card').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; })()")
        await pg.click('#mobileNotePeek'); await pg.wait_for_timeout(200)
        closed = await pg.evaluate("getComputedStyle(document.getElementById('mobileNote')).display === 'none'")
    await ctx.close(); print(dev or 'desktop', 'shown', shown, 'url', url, 'fits', fits, 'closes', closed, 'errors', errs)
    return (shown and url and fits and closed and not errs) if dev else (not shown and not errs)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        ok = all([await check(p, b, d) for d in ('iPhone 13', 'iPhone 13 landscape', 'Pixel 7', 'iPad Pro 11', None)])
        print('RESULT', 'PASS' if ok else 'FAIL'); await b.close()
asyncio.run(main())
