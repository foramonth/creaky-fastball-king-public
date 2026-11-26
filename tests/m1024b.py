import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
SEL = """(() => { const R = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
  return {wrapH: document.getElementById('result').scrollHeight, photo: R('.photo'), quote: R('.aside.quote'), ticker: R('#tickerBar'), booth: R('#booth'), bubble: R('#bubble'), again: R('#againBtn'), board: R('#result .board'), review: R('#result .review')}; })()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        for f, demo in [('pitcher_release.html', None), ('pitcher.html', 'DEMO_B'), ('pitcher.html', 'DEMO_F')]:
            for W, H in [(1024, 768), (1024, 640)]:
                pg = await b.new_page(viewport={'width':W,'height':H})
                await pg.goto(ROOT_URL + f); await pg.wait_for_timeout(500)
                if demo:
                    await pg.click('#startBtn'); await pg.wait_for_timeout(300); await pg.evaluate(f"startDemo({demo})")
                else:
                    await pg.keyboard.press('Space'); await pg.wait_for_timeout(300)
                    for k in ['KeyK','KeyL','KeyQ']: await pg.keyboard.down(k)
                    await pg.wait_for_timeout(500); await pg.keyboard.down('KeyE'); await pg.wait_for_timeout(300)
                    for k in ['KeyK','KeyL','KeyQ','KeyE']: await pg.keyboard.up(k)
                for _ in range(900):
                    if await pg.evaluate("state==='result'"): break
                    await pg.wait_for_timeout(30)
                await pg.wait_for_timeout(1500)
                print(f, demo, W, H, await pg.evaluate(SEL))
                await pg.screenshot(path=f'm2_{demo or "rel"}_{H}.png'); await pg.close()
        await b.close()
asyncio.run(main())
