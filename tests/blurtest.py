import asyncio
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = await b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(ROOT_URL + 'pitcher_release.html'); await pg.wait_for_timeout(300); kb=pg.keyboard
        await kb.press('Space'); await pg.wait_for_timeout(200)
        await kb.down('KeyK'); await kb.down('KeyL'); await kb.down('KeyE'); await pg.wait_for_timeout(300)
        t0 = await pg.evaluate('timeLeft')
        await pg.evaluate("dispatchEvent(new Event('blur'))"); await pg.wait_for_timeout(1500)
        print('during blur:', await pg.evaluate("[state, ball.held, paused, +timeLeft.toFixed(2), document.getElementById('msg').textContent]"), 't0', round(t0,2))
        await kb.up('KeyK'); await kb.up('KeyL'); await kb.up('KeyE')
        await pg.evaluate("dispatchEvent(new Event('focus'))"); await pg.wait_for_timeout(300)
        print('after focus:', await pg.evaluate("[state, ball.held, paused, +grip.toFixed(2)]"))
        await kb.down('KeyK'); await kb.down('KeyL'); await kb.down('KeyE'); await pg.wait_for_timeout(300); await kb.up('KeyK'); await kb.up('KeyL'); await pg.wait_for_timeout(200)
        print('rethrow:', await pg.evaluate("[state, ball.held, release && release.type]"), errs); await b.close()
asyncio.run(main())
