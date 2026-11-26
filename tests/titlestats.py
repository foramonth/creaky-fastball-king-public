import asyncio, random, json, collections
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
from cmp import INIT
RUN = """((seqs) => seqs.map(seq => { dispatchEvent(new KeyboardEvent('keydown',{code:'Escape'})); __step(3);
  startDemo(seq); let g = 0; while (state !== 'result' && g < 3000){ __step(1); g++; }
  const got = [...document.querySelectorAll('#rDex span.new')].map(s => s.textContent);
  return [document.getElementById('rTitle').textContent, release && release.extra, +((ball.caught ? ball.landX : ball.x)).toFixed(1), flamMax, ball.maxY||0, ball.landX ?? null, release.x0, !!ball.caught, release.type]; }))"""
K = ['KeyQ','KeyA','KeyW','KeyS','KeyE','KeyD','KeyU','KeyJ']
def rnd(seed):
    r = random.Random(seed); seq = [[0,'KeyK',1],[0,'KeyL',1]]; t = 0.1; held=set()
    rel = r.uniform(0.4, 6)
    while t < rel:
        k = r.choice(K)
        if k in held: seq.append([round(t,3),k,0]); held.discard(k)
        else: seq.append([round(t,3),k,1]); held.add(k)
        t += r.uniform(0.05, 0.6)
    seq += [[round(rel,3),'KeyK',0],[round(rel,3),'KeyL',0]]
    seq += [[round(rel+0.3,3),k,0] for k in held]
    return sorted(seq, key=lambda a: a[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':320,'height':200}); await pg.add_init_script(INIT); await pg.goto(ROOT_URL + 'pitcher.html'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.getElementById('startBtn').click()")
        res=[]
        for i in range(0, 160, 20):
            res += await pg.evaluate(RUN, [rnd(i+j) for j in range(20)])
        slot = collections.Counter(); bonus = collections.Counter(); n=0
        for title, ex, d in res:
            if not ex: continue
            n+=1
            if ex['slot'] and d >= 15: slot[ex['slot']] += 1
            for x in ex['bonus']: bonus[x] += 1
        print('throws', len(res), 'with extra', n)
        print('slot (d>=15)', dict(slot), ' d>=15 count', sum(1 for _,e,d in res if e and d>=15))
        print('bonus', dict(bonus))
        print('slot all', collections.Counter(e['slot'] for _,e,d in res if e))
        await b.close()
if __name__ == "__main__": asyncio.run(main())

async def dist():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':320,'height':200}); await pg.add_init_script(INIT); await pg.goto(ROOT_URL + 'pitcher.html'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.getElementById('startBtn').click()")
        res=[]
        for i in range(0, 160, 20): res += await pg.evaluate(RUN, [rnd(i+j) for j in range(20)])
        tu = sorted(e['turns'] for _,e,d in res); print('turns pct', [round(tu[int(len(tu)*q)],1) for q in (0.5,0.7,0.8,0.9,0.95)])
        up = [e for _,e,d in res if e['hp'] < 0]; print('upside', len(up), 'fallen among', sum(e['fallen'] for e in up), 'hp<-0.3', sum(e['hp']<-0.3 for e in up))
        await b.close()

async def flam():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':320,'height':200}); await pg.add_init_script(INIT); await pg.goto(ROOT_URL + 'pitcher.html'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.getElementById('startBtn').click()")
        res=[]
        for i in range(0, 200, 20): res += await pg.evaluate(RUN, [rnd(i+j) for j in range(20)])
        fm = sorted(r[3] for r in res); n = len(fm)
        print('flamMax pct', [round(fm[int(n*q)],2) for q in (0.5,0.8,0.9,0.95,0.98)], 'max', round(fm[-1],2))
        for th in (0.8, 1.0, 1.2, 1.5): print(th, sum(x >= th for x in fm), '/', n)
        await b.close()

async def vt():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':320,'height':200}); await pg.add_init_script(INIT); await pg.goto(ROOT_URL + 'pitcher.html'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.getElementById('startBtn').click()")
        res=[]
        for i in range(0, 200, 20): res += await pg.evaluate(RUN, [rnd(1000+i+j) for j in range(20)])
        n=len(res); print('n', n)
        for H, k in [(3,1.0),(3,2.0),(4,1.0),(4,1.5),(5,1.0),(3,3.0)]:
            c = sum(1 for r in res if r[4] >= H and r[5] is not None and abs(r[5]-r[6]) <= k*r[4] and r[8] not in ('slip','timeout'))
            print('vtol H>=',H,'R<=',k,'H:', c)
        for lo in (1.2, 2, 3, 4):
            c = sum(1 for r in res if not r[7] and r[2] >= 18.44-lo and r[2] <= 18.24 and r[8] not in ('slip','timeout'))
            print('almost within', lo, ':', c)
        print('rest x in 10..18.4:', sorted(r[2] for r in res if 10 <= r[2] <= 18.4))
        await b.close()
