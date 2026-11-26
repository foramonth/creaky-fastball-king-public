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
        await kb.press('KeyT'); await pg.wait_for_timeout(500)
        await pg.evaluate("tutEnter(4)"); await pg.wait_for_timeout(200)
        await kb.down('KeyK'); await kb.down('KeyL'); await pg.wait_for_timeout(2500)
        print('throw step', await pg.evaluate("[tut.step, tut.mic, document.body.classList.contains('robomic'), document.querySelector('#bubble .who').textContent, document.getElementById('subTxt').textContent]"))
        await pg.screenshot(path='t3_mic.png')
        await kb.down('KeyE'); await pg.wait_for_timeout(350); await kb.up('KeyK'); await kb.up('KeyL'); await pg.wait_for_timeout(200); await kb.up('KeyE')
        low = 9; fell = False
        for _ in range(110):
            r = await pg.evaluate("[tut.step, tut.phase, body.fallen, P[I.pelvis].y, !!ROBOT_PIN, tut.demoOn]")
            low = min(low, r[3]); fell = fell or r[2]
            if r[1] == 'finale' and not r[5]:
                # the player's ball landing right now must NOT skip the robot pitch
                await pg.evaluate("tutThrown()")
            await pg.wait_for_timeout(30)
        print('hand-over: fell', fell, 'lowest pelvis', round(low, 2), await pg.evaluate("[tut.phase, tut.demoOn]"))
        for _ in range(300):
            r = await pg.evaluate("[tut.phase, state]")
            if r[0] == 'end': break
            await pg.wait_for_timeout(50)
        await pg.wait_for_timeout(2500); await pg.screenshot(path='t3_end.png')
        print('end', r, await pg.evaluate("[Math.round(ball.x), document.getElementById('subTxt').textContent]"))
        await kb.press('Escape'); await pg.wait_for_timeout(300)
        print('after exit', await pg.evaluate("[document.body.classList.contains('robomic'), document.querySelector('#bubble .who').textContent]"))
        print(errs); await b.close()
asyncio.run(main())
