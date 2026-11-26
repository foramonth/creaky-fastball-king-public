import asyncio
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width':1280,'height':720}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(ROOT_URL + 'pitcher.html'); await pg.wait_for_timeout(400)
        await pg.click('#startBtn'); await pg.wait_for_timeout(300)
        await pg.keyboard.press('KeyM'); await pg.wait_for_timeout(200)
        print('after M', await pg.evaluate("[muted, OUT && OUT.gain.value, document.getElementById('muteBtn').textContent, state]"))
        await pg.reload(); await pg.wait_for_timeout(400)
        print('after reload', await pg.evaluate("[muted, document.getElementById('muteBtn').textContent]"))
        await pg.click('#startBtn'); await pg.wait_for_timeout(200); await pg.click('#muteBtn'); await pg.wait_for_timeout(200)
        print('after click', await pg.evaluate("[muted, OUT && OUT.gain.value]"))
        await pg.screenshot(path='mute.png', clip={'x':0,'y':0,'width':420,'height':170})
        print(errs); await b.close()
asyncio.run(main())
