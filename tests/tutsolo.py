# 투구 교실 1~4단계는 한 키씩 (v54.24), 지금 누를 키를 크게 보여 주고 다른 키는 잠가요 (v54.25):
#  - ① 차례에 다른 키(W)를 누르면 안 움직이고 "Q만" 안내
#  - Q를 짧게(0.3초) 떼면 체크 안 되고 "길게" 안내
#  - Q를 0.5초 넘게 누르면 ① 체크, 누른 채면 큰 키가 "Q 떼기"
#  - Q를 떼고 A만 누르면 ② 체크, A를 떼야 단계 완료 (v54.26)
#  - ② '떼기' 상태에서 다른 키를 누르면 'A를 떼 보세요' 안내 (v54.27, 예전엔 'A만 꾹')
#  - 5. 공 쥐기: K·L 큰 키 두 개, 다른 키 잠금, 1초 뒤 '떼지 말고' (v54.26)
import asyncio, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
F = sys.argv[1] if len(sys.argv) > 1 else 'pitcher_release.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(ROOT_URL + F); await pg.wait_for_timeout(700)
        await pg.keyboard.press('KeyT'); await pg.wait_for_timeout(1200)
        bub = "document.getElementById('bubble').textContent"
        shown = await pg.evaluate("!document.getElementById('tutKey').classList.contains('hidden') && document.getElementById('tutKeyL').textContent === 'Q'")
        await pg.keyboard.down('KeyW'); await pg.wait_for_timeout(1000)
        locked = await pg.evaluate(f"!down.KeyW && {bub}.includes('Q만')")
        await pg.keyboard.up('KeyW'); await pg.wait_for_timeout(4100)          # let the hint cool down
        await pg.keyboard.down('KeyQ'); await pg.wait_for_timeout(300); await pg.keyboard.up('KeyQ'); await pg.wait_for_timeout(1200)   # the caster box types its line out
        short = await pg.evaluate(f"!tut.held.has('KeyQ') && {bub}.includes('길게')")
        await pg.keyboard.down('KeyQ'); await pg.wait_for_timeout(800)
        letgo = await pg.evaluate("tut.held.has('KeyQ') && document.getElementById('tutKeyLab').textContent.includes('떼기')")
        await pg.keyboard.up('KeyQ'); await pg.wait_for_timeout(300)
        akey = await pg.evaluate("document.getElementById('tutKeyL').textContent === 'A'")
        await pg.keyboard.down('KeyA'); await pg.wait_for_timeout(800)
        waits = await pg.evaluate("tut.held.has('KeyA') && tut.doneAt == null && document.getElementById('tutKeyLab').textContent.includes('A 떼기')")   # v54.26: ② ends by letting go too
        await pg.wait_for_timeout(3000); await pg.keyboard.down('KeyW'); await pg.wait_for_timeout(1000)                     # v54.27: another key now -> "A를 떼", not "A만 꾹"
        relhint = await pg.evaluate("!down.KeyW && document.getElementById('bubble').textContent.includes('A를 떼')"); await pg.keyboard.up('KeyW')
        await pg.keyboard.up('KeyA'); await pg.wait_for_timeout(300)
        done = await pg.evaluate("tut.doneAt != null")
        # v54.26: 5. 공 쥐기 gets the big keys too — K and L, each shown pressed on its own; other keys locked; after 1s "떼지 말고"
        await pg.evaluate("releaseAll(); tutEnter(4)"); await pg.wait_for_timeout(300)
        await pg.keyboard.down('KeyK'); await pg.wait_for_timeout(200)
        two = await pg.evaluate("document.getElementById('tutKey').classList.contains('two') && document.getElementById('tutKeyCap1').classList.contains('on') && !document.getElementById('tutKeyCap2').classList.contains('on')")
        await pg.keyboard.down('KeyE'); await pg.wait_for_timeout(200)
        glock = await pg.evaluate("!down.KeyE"); await pg.keyboard.up('KeyE')
        await pg.keyboard.down('KeyL'); await pg.wait_for_timeout(1300)
        keep = await pg.evaluate("document.getElementById('tutKeyLab').textContent.includes('떼지 말고')")
        await pg.keyboard.up('KeyK'); await pg.keyboard.up('KeyL')
        print('big key Q', shown, 'other key locked + hint', locked, 'short tap: no tick + hint', short, 'Q ticks, then "떼기"', letgo, 'big key A', akey,
              '② waits for A to come up', waits, 'other key then: "A를 떼" hint', relhint, 'then completes', done, 'grip: K and L caps', two, 'grip: other keys locked', glock, 'grip: "떼지 말고"', keep, 'errors', errs)
        print('RESULT', 'PASS' if all([shown, locked, short, letgo, akey, waits, relhint, done, two, glock, keep]) and not errs else 'FAIL'); await b.close()
asyncio.run(main())
