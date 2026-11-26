import asyncio
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        for W,H in [(1024,768),(1280,720),(1440,900)]:
            pg = await b.new_page(viewport={'width':W,'height':H}); await pg.goto(ROOT_URL + 'pitcher.html'); await pg.wait_for_timeout(500)
            await pg.click('#startBtn'); await pg.wait_for_timeout(600)
            r = await pg.evaluate("""(() => { const g = id => { const e = document.getElementById(id).getBoundingClientRect(); return [Math.round(e.left), Math.round(e.top), Math.round(e.right), Math.round(e.bottom)]; };
              return {keys: g('keys'), stat: g('stat'), gun: g('gun'), logo: g('logo'), restart: g('restartBtn'), mute: g('muteBtn')}; })()""")
            print(W, r); await pg.screenshot(path=f'k_{W}.png'); await pg.close()
        await b.close()
asyncio.run(main())
