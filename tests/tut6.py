import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
F = sys.argv[1] if len(sys.argv) > 1 else 'pitcher.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1440,'height':900}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(ROOT_URL + F); await pg.wait_for_timeout(600)
        kb = pg.keyboard
        await kb.press('KeyT'); await pg.wait_for_timeout(400)
        await pg.evaluate("tutEnter(4)"); await pg.wait_for_timeout(200)
        await kb.down('KeyK'); await kb.down('KeyL'); await pg.wait_for_timeout(2600)
        print('step6', await pg.evaluate("[tut.step, document.querySelector('#tutPanel .ways') && document.querySelector('#tutPanel .ways').textContent]"))
        await pg.screenshot(path='t6_panel.png')
        # 1) let go without any body key -> retry
        await kb.up('KeyK'); await kb.up('KeyL'); await pg.wait_for_timeout(600)
        print('no body keys', await pg.evaluate("[tut.step, tut.thrown, tut.retry, document.getElementById('subTxt').textContent.slice(0,30), state]"))
        await pg.wait_for_timeout(2600)
        print('after retry', await pg.evaluate("[tut.step, tut.phase, state, ball.held, !!ROBOT_PIN, tut.bodyOk]"))
        # 2) tap a body key too briefly (0.1s) -> still not enough
        await kb.down('KeyK'); await kb.down('KeyL'); await pg.wait_for_timeout(300)
        await kb.down('KeyU'); await pg.wait_for_timeout(100); await kb.up('KeyU'); await pg.wait_for_timeout(100)
        print('U tap 0.1s ok?', await pg.evaluate("tut.bodyOk"))
        # 3) D held 0.4s (not E) then release -> pass, robot names the result
        await kb.down('KeyD'); await pg.wait_for_timeout(400); await kb.up('KeyK'); await kb.up('KeyL'); await pg.wait_for_timeout(150); await kb.up('KeyD')
        await pg.wait_for_timeout(900)
        print('D throw', await pg.evaluate("[tut.step, tut.thrown, tut.bodyOk, document.getElementById('subTxt').textContent, release.extra && release.extra.slot, Math.round(release.ang)]"))
        for _ in range(300):
            if await pg.evaluate("tut.phase === 'end'"): break
            await pg.wait_for_timeout(50)
        print('end', await pg.evaluate("[tut.phase, Math.round(ball.x)]"), errs)
        await b.close()
asyncio.run(main())
