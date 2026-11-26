import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
INIT = """(() => { let T = 0; const q = []; performance.now = () => T;
  window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
  window.__step = n => { for (let i = 0; i < n; i++){ T += 1000/60; const c = q.splice(0); c.forEach(f => f(T)); } }; })();"""
RUN = """(([seq]) => { const key = (c, d) => dispatchEvent(new KeyboardEvent(d ? 'keydown' : 'keyup', {code: c, bubbles: true}));
  const out = [];
  for (const [pre, hold, extra] of seq){
    key('Escape', true); key('Escape', false); __step(5);
    key('KeyK', true); key('KeyL', true); __step(pre);
    for (const k of extra) key(k, true); __step(hold);
    key('KeyK', false); key('KeyL', false); __step(8); for (const k of extra) key(k, false);
    let f = 0; while (state !== 'result' && f < 3000){ __step(1); f++; }
    out.push(Math.round(parseFloat(document.getElementById('rDist').textContent)));
  } return out; })"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        seq = [[pre, hold, extra] for extra in (['KeyE'], ['KeyE','KeyQ'], ['KeyE','KeyU'], ['KeyE','KeyJ'], ['KeyE','KeyQ','KeyJ']) for pre in (3, 20) for hold in (6, 10, 14, 18, 22, 28, 36)]
        for f in sys.argv[1:]:
            pg = await b.new_page(); await pg.add_init_script(INIT); await pg.goto(ROOT_URL + f); await pg.wait_for_timeout(300)
            await pg.evaluate("document.getElementById('startBtn').click()")
            r = await pg.evaluate(RUN, [seq]); print(f, r, 'fwd>5:', sum(x > 5 for x in r), '/', len(r))
        await b.close()
if __name__ == '__main__': asyncio.run(main())   # titlestats.py imports INIT from here
