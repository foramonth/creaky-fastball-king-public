# v54.8: the demo build saves progress under 'pitchqwop.demo.*', the release build under 'pitchqwop.*'.
# Both files are opened from the same folder (same file:// storage), like a tester would.
import asyncio
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
KEYS = "Object.keys(localStorage).filter(k => k.startsWith('pitchqwop.')).sort()"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        ctx = await b.new_context(); pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(ROOT_URL + 'pitcher.html'); await pg.wait_for_timeout(400)
        await pg.evaluate("localStorage.clear()")
        await pg.click('#intro [data-demo="k"]')                       # a demo sulk: counts as a try in the demo build
        await pg.wait_for_function("state==='result'", timeout=30000, polling=20)
        demo_keys = await pg.evaluate(KEYS); demo_tries = await pg.evaluate("localStorage.getItem('pitchqwop.demo.tries')")
        await pg.goto(ROOT_URL + 'pitcher_release.html'); await pg.wait_for_timeout(400)
        rel_tries = await pg.evaluate("tries"); rel_titles = await pg.evaluate("titles.size")
        print('demo keys', demo_keys, 'demo tries', demo_tries)
        print('release sees tries', rel_tries, 'titles', rel_titles, 'errors', errs)
        good = demo_tries == '1' and rel_tries == 0 and rel_titles == 0 and not any(k in demo_keys for k in ['pitchqwop.tries', 'pitchqwop.titles', 'pitchqwop.best']) and not errs
        print('RESULT', 'PASS' if good else 'FAIL'); await b.close()
asyncio.run(main())
