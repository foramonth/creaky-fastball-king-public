# v54.16: the 경기 소식 ticker must stay on the bottom edge of the screen while the result card is scrolled
# (it used to sit inside the blurred overlay, so 'fixed' meant 'fixed to the overlay' and it scrolled up with it),
# and opening the 칭호 도감 must not leave the 도감 hidden under it.
import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
F = sys.argv[1] if len(sys.argv) > 1 else 'pitcher.html'
RECT = "s => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; }"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        ok = True
        for W, H in [(1920, 920), (1280, 720), (1440, 900)]:
            pg = await b.new_page(viewport={'width': W, 'height': H}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(ROOT_URL + F); await pg.wait_for_timeout(600)
            await pg.click('#intro [data-demo="f"]'); await pg.wait_for_function("state === 'result'", timeout=60000, polling=50); await pg.wait_for_timeout(600)
            await pg.evaluate("document.getElementById('dexBtn').click()"); await pg.wait_for_timeout(900)
            tk, dex = await pg.evaluate(RECT, '#tickerBar'), await pg.evaluate(RECT, '#dexBox')
            good = tk[1] == H and dex[1] <= tk[0] + 1 and not errs
            ok &= good; print(W, H, 'ticker', tk, 'dex', dex, 'errors', errs, 'OK' if good else 'FAIL'); await pg.close()
        print('RESULT', 'PASS' if ok else 'FAIL'); await b.close()
asyncio.run(main())
