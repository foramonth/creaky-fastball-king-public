import asyncio
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1280,'height':720}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(ROOT_URL + 'pitcher.html'); await pg.wait_for_timeout(600)
        for k in ['k','l','l','f','r','s','h']:
            await pg.click(f'#{"intro" if k=="k" else "result"} [data-demo="{k}"]')
            acc=False
            for _ in range(400):
                if await pg.evaluate("!!(release && release.accident)"): acc=True
                if await pg.evaluate("state==='result'"): break
                await pg.wait_for_timeout(50)
            print(k, await pg.evaluate("JSON.stringify({type: release && release.type, fallen: release && release.fallen, title: document.getElementById('rTitle').textContent})"), 'accident', acc)
        print(errs); await b.close()
asyncio.run(main())
