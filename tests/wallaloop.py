# v54.29: the crowd murmur is baked once into two seamless loops and then just played back, so it no longer loads the
# audio thread with dozens of live voices (that overload crackled and cut the sound when a cheer and a crash piled on).
# Checks: the loops get baked, the live scheduler then stops making voices, and nothing errors.
import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
F = sys.argv[1] if len(sys.argv) > 1 else 'pitcher_release.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(ROOT_URL + F); await pg.wait_for_timeout(500); await pg.click('#startBtn')
        on = False
        for _ in range(120):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("SND.loopOn"): on = True; break
        bufs = await pg.evaluate("WALLA_LOOP.bufs ? WALLA_LOOP.bufs.map(b => Math.round(b.duration*10)/10) : null")
        await pg.wait_for_timeout(2500)        # the live voices fade out over 2s
        await pg.evaluate("(() => { window.__w = 0; const o = sndPhrase; sndPhrase = function(){ window.__w++; return o.apply(this, arguments); }; })()")
        await pg.wait_for_timeout(1500)
        live = await pg.evaluate("window.__w")
        print('loop on', on, 'loops', bufs, 'live voices in 1.5s after', live, 'errors', errs)
        print('RESULT', 'PASS' if on and bufs and len(bufs) == 2 and live == 0 and not errs else 'FAIL'); await b.close()
asyncio.run(main())
