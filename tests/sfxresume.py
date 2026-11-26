# v54.9: after the page is hidden (pagehide closes the audio) and shown again from the back/forward cache,
# the next key press must bring the sound back, and effects must not stay muted by the old context's cooldown clock.
import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
F = sys.argv[1] if len(sys.argv) > 1 else 'pitcher_release.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(ROOT_URL + F); await pg.wait_for_timeout(400)
        await pg.click('#startBtn'); await pg.wait_for_timeout(2500)          # audio on, its clock runs ~2.5s
        await pg.evaluate("sfx('pop', {v: 0.1})")                             # leaves SFX.last.pop near the old clock
        await pg.evaluate("dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})); dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}))")
        gone = await pg.evaluate("AC === null")
        await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(300)        # a plain game key, no button
        back = await pg.evaluate("!!AC && !!SFX.bus")
        await pg.evaluate("sfx('pop', {v: 0.1})")
        played = await pg.evaluate("(SFX.live.pop || 0) > 0")
        # v54.18: the crowd murmur must be scheduled again on the new context (and only by one timer)
        await pg.evaluate("window.__walla = 0; const o = sndWalla; sndWalla = function(){ window.__walla++; return o.apply(this, arguments); }")
        await pg.wait_for_timeout(1000)
        murmur = await pg.evaluate("window.__walla >= 4 && window.__walla <= 9 && SND.wallaNext > 0")
        print('closed on pagehide', gone, 'audio back after a key', back, 'effect plays', played, 'murmur back', murmur, 'errors', errs)
        print('RESULT', 'PASS' if gone and back and played and murmur and not errs else 'FAIL'); await b.close()
asyncio.run(main())
