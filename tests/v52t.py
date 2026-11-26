import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1440,'height':900}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(ROOT_URL + 'pitcher.html'); await pg.wait_for_timeout(500)
        await pg.click('#startBtn'); await pg.wait_for_timeout(300)
        await pg.evaluate('startDemo(DEMO_B)'); shots=0; said=False
        for i in range(900):
            st = await pg.evaluate("[state, P[I.pelvis].x, fielder.sb, speech && speech.who, release && release.type]")
            if st[2]==1 and shots==0: await pg.wait_for_timeout(300); await pg.screenshot(path='v52_a.png'); shots=1
            if st[0]=='landed' and shots==1: await pg.wait_for_timeout(1200); await pg.screenshot(path='v52_b.png'); shots=2
            if st[0]=='result': break
            await pg.wait_for_timeout(15)
        await pg.wait_for_timeout(800); await pg.screenshot(path='v52_c.png')
        print(await pg.evaluate("[document.getElementById('rTitle').textContent, document.getElementById('rDist').textContent, document.getElementById('rCatcher').textContent, document.getElementById('rReviewLine').textContent, [...document.querySelectorAll('#rGrid div')].map(d=>d.textContent).join(' / ')]"))
        print(errs); await b.close()
asyncio.run(main())
