# v54.9: a backward throw in 투구 교실 must not reveal any of the backward conditions (nothing in the lesson counts).
# The form check is forced to "backward, all four conditions met" so the old leak would show up every time.
import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
F = sys.argv[1] if len(sys.argv) > 1 else 'pitcher_release.html'
JS = """() => {
  tutStart(); tutEnter(5); down.KeyK = true; down.KeyL = true;
  revealed = new Set([1]);
  const real = formNow; formNow = () => { const f = real(); f.vx = -Math.abs(f.vx) - 5; f.r = f.r.map(() => true); return f; };
  try { doRelease('clean', 0); } finally { formNow = real; }
  return {tut: !!tut, revealed: [...revealed], type: release && release.type};
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(ROOT_URL + F); await pg.wait_for_timeout(400)
        r = await pg.evaluate(JS)
        print(r, 'errors', errs)
        print('RESULT', 'PASS' if r['tut'] and r['revealed'] == [1] and not errs else 'FAIL'); await b.close()
asyncio.run(main())
