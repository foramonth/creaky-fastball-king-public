import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
SEL = ['#booth', '.aside.quote', '#rSpon', '#result .btnrow', '#tickerBar', '.photo', '.review', '.board', '#rTitle']
JS = """(sels) => { const out = {}; for (const s of sels){ const e = document.querySelector(s); if (!e) continue; const cs = getComputedStyle(e);
  const vis = cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && !(s === '#booth' && !document.getElementById('bubble').classList.contains('show'));
  const r = e.getBoundingClientRect(); if (vis && r.width > 0) out[s] = [r.left, r.top, r.right, r.bottom]; } return out; }"""
def inter(a, b): return min(a[2], b[2]) - max(a[0], b[0]) > 2 and min(a[3], b[3]) - max(a[1], b[1]) > 2
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        for W,H in [(1920,919),(1280,720),(1440,900)]:
            pg = await b.new_page(viewport={'width':W,'height':H}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(f'{ROOT_URL}{sys.argv[1]}'); await pg.wait_for_timeout(600)
            await pg.evaluate("document.querySelectorAll('[data-demo]').forEach(e => e.style.display='none')")   # release layout
            first = True
            for k in ['f','r','s','h','b','k','l']:
                await pg.evaluate(f"document.querySelector('#{'intro' if first else 'result'} [data-demo={k}]').click()"); first=False
                for _ in range(500):
                    if await pg.evaluate("state==='result'"): break
                    await pg.wait_for_timeout(40)
                await pg.wait_for_timeout(500)
                rs = await pg.evaluate(JS, SEL)
                bad = [(x, y) for i, x in enumerate(rs) for y in list(rs)[i+1:] if inter(rs[x], rs[y]) and {x,y} != {'.photo','#rSpon'}]
                over = [x for x in rs if rs[x][3] > H + 1 or rs[x][2] > W + 1]
                print(W, k, 'overlaps:', bad, 'offscreen:', over)
                if k in ('f','l'): await pg.screenshot(path=f'ov_{W}_{k}.png')
            print(errs); await pg.close()
        await b.close()
asyncio.run(main())
