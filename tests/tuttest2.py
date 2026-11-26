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
        await kb.press('KeyT'); await pg.wait_for_timeout(800)
        st = lambda: pg.evaluate("[tut && tut.step, tut && tut.phase, state, ball.held, String(tutChecks())]")
        # tap Q quickly: should NOT count
        await kb.down('KeyQ'); await pg.wait_for_timeout(150); await kb.up('KeyQ'); await pg.wait_for_timeout(300)
        print('tap Q', await st())
        await kb.down('KeyQ'); await pg.wait_for_timeout(700); await pg.screenshot(path='t2_q.png'); await kb.up('KeyQ')
        print('hold Q', await st())
        await kb.down('KeyA'); await pg.wait_for_timeout(700); await kb.up('KeyA'); await pg.wait_for_timeout(2700)
        print('-> step', await st())
        for a,c in [('KeyW','KeyS'),('KeyE','KeyD'),('KeyU','KeyJ')]:
            await kb.down(a); await pg.wait_for_timeout(700); await kb.up(a); await kb.down(c); await pg.wait_for_timeout(700); await kb.up(c); await pg.wait_for_timeout(2700)
            print('-> step', await st())
        # grip: let go early, then hold
        await kb.down('KeyK'); await kb.down('KeyL'); await pg.wait_for_timeout(400); await kb.up('KeyK'); await kb.up('KeyL'); await pg.wait_for_timeout(300)
        print('grip let go early (ball stays, not done)', await st())
        await kb.down('KeyK'); await kb.down('KeyL'); await pg.wait_for_timeout(2500)
        print('grip held -> throw step while still holding', await st()); await pg.screenshot(path='t2_throw.png')
        await kb.down('KeyE'); await pg.wait_for_timeout(350); await kb.up('KeyK'); await kb.up('KeyL'); await pg.wait_for_timeout(500); await kb.up('KeyE')
        print('just thrown', await st(), await pg.evaluate("[cam.x.toFixed(1), P[I.pelvis].x.toFixed(1), ball.x.toFixed(1)]")); await pg.screenshot(path='t2_after.png')
        for _ in range(200):
            s_ = await st()
            if s_[1] == 'end': break
            await pg.wait_for_timeout(50)
        print('end', s_)
        print(errs); await b.close()
asyncio.run(main())
