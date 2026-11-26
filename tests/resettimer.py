# v54.8: pressing Space right after a hand-delivery / 2nd-base delivery must not run that pitch's delayed lines
# (they used to crash on release.type and overwrite the "아무 조작 키나 눌러 시작" prompt).
import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
F = sys.argv[1] if len(sys.argv) > 1 else 'pitcher.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        ok = True
        for demo, typ in [('h', 'handoff'), ('b', 'second')]:
            pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(ROOT_URL + F); await pg.wait_for_timeout(500)
            await pg.click(f'#intro [data-demo="{demo}"]')
            await pg.wait_for_function(f"state==='landed' && release && release.type==='{typ}'", timeout=30000, polling=5)
            await pg.keyboard.press('Space'); await pg.wait_for_timeout(1500)
            msg = await pg.evaluate("document.getElementById('msg').textContent")
            st = await pg.evaluate('state')
            good = st == 'ready' and msg == '아무 조작 키나 눌러 시작' and not errs
            ok &= good
            print(demo, typ, 'state', st, 'msg', repr(msg), 'errors', errs, 'OK' if good else 'FAIL')
            await pg.close()
        await b.close()
        print('RESULT', 'PASS' if ok else 'FAIL')
asyncio.run(main())
