import asyncio
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1280,'height':720}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(ROOT_URL + 'pitcher.html'); await pg.wait_for_timeout(600)
        await pg.click('#startBtn'); await pg.wait_for_timeout(300); kb=pg.keyboard
        for trial in range(3):
            await kb.down('KeyK'); await kb.down('KeyL'); await kb.down('KeyQ'); await kb.down('KeyS'); await kb.down('KeyD')
            for _ in range(60):
                await pg.wait_for_timeout(100)
                if await pg.evaluate("body.fallen && P[I.head].y < 0.6"): break
            for k in ['KeyQ','KeyS','KeyD']: await kb.up(k)
            await pg.wait_for_timeout(400); await kb.up('KeyK'); await kb.up('KeyL')
            seen=None
            for _ in range(80):
                st = await pg.evaluate("[state, !!(release&&release.accident)]")
                if st[1] and not seen: seen=True; await pg.wait_for_timeout(1200); await pg.screenshot(path=f'fall_{trial}.png')
                if st[0]=='result': break
                await pg.wait_for_timeout(100)
            print(await pg.evaluate("JSON.stringify({t:release.type, fallen:release.fallen, mega:release.mega, rmega:release.rmega, s10:release.strike10, acc:release.accident, caught:ball.caught, title:document.getElementById('rTitle').textContent})"))
            await kb.press('Space'); await pg.wait_for_timeout(400)
        print(errs); await b.close()
asyncio.run(main())
