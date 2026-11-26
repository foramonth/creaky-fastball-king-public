# v54.21: the page carries a Content Security Policy that forbids any network access. Play through the intro, a full
# demo pitch to the result screen, the title book and the mute toggle, and make sure the policy never had to block
# anything (a violation would mean the game itself tried to load something the policy forbids).
import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
INIT = "window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));"
async def wait_result(pg, secs):   # (no wait_for_function: under the policy it would need eval)
    for _ in range(secs*10):
        if await pg.evaluate("state === 'result'"): return
        await pg.wait_for_timeout(100)
    raise TimeoutError('no result screen')
async def run(b, f, demo):
    ctx = await b.new_context(bypass_csp=False); pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); await pg.add_init_script(INIT)
    await pg.goto(ROOT_URL + f); await pg.wait_for_timeout(600)
    has = await pg.evaluate("!!document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]')")
    if demo:
        await pg.click('#intro [data-demo="f"]'); await wait_result(pg, 90)
        await pg.click('#dexBtn'); await pg.keyboard.press('KeyM'); await pg.keyboard.press('KeyM')
    else:
        await pg.click('#startBtn'); await pg.wait_for_timeout(300)
        for k in ('KeyK', 'KeyL', 'KeyQ', 'KeyW'): await pg.keyboard.down(k)
        await pg.wait_for_timeout(700)
        for k in ('KeyQ', 'KeyW', 'KeyK', 'KeyL'): await pg.keyboard.up(k)
        await wait_result(pg, 60)
    await pg.wait_for_timeout(800); v = await pg.evaluate("window.__csp"); await ctx.close()
    print(f, 'policy present', has, 'violations', v, 'errors', errs); return has and not v and not errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        ok = await run(b, 'pitcher.html', True) and await run(b, 'pitcher_release.html', False)
        print('RESULT', 'PASS' if ok else 'FAIL'); await b.close()
asyncio.run(main())
