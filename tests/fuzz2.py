import asyncio, json, sys
from playwright.async_api import async_playwright
from _env import ROOT_URL, CHROME
FILE = sys.argv[1]; GAMES = int(sys.argv[2]); SEED = int(sys.argv[3])
INIT = """
(() => { let T = 0; const q = [];
  performance.now = () => T;
  window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
  window.__step = n => { for (let i = 0; i < n; i++){ T += 1000/60; const c = q.splice(0); c.forEach(f => f(T)); } };
})();"""
FUZZ = """
(([games, seed]) => {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const KEYS = ['KeyQ','KeyA','KeyW','KeyS','KeyE','KeyD','KeyU','KeyJ','KeyK','KeyL'];
  const key = (code, down) => dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {code, bubbles: true}));
  const out = {games: 0, types: {}, tiers: {}, errors: [], stuck: 0, nan: 0, maxFrames: 0, stuckInfo: []};
  const finite = () => P.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)) && Number.isFinite(ball.x) && Number.isFinite(ball.y) && Number.isFinite(cam.x) && Number.isFinite(cam.z);
  document.getElementById('startBtn').click();
  for (let g = 0; g < games; g++){
    const held = new Set(); let f = 0, done = false;
    const mode = rnd();          // 0-.6 random mashing, .6-.8 rhythmic walking, .8-1 quick grab/release
    if (mode < 0.9){ key('KeyK', true); key('KeyL', true); held.add('KeyK'); held.add('KeyL'); }
    const gaitA = [KEYS[Math.floor(rnd()*6)], KEYS[Math.floor(rnd()*8)]], gaitB = [KEYS[Math.floor(rnd()*6)], KEYS[Math.floor(rnd()*8)]], per = 12 + Math.floor(rnd()*14);
    const quickUp = mode >= 0.8 ? 10 + Math.floor(rnd()*40) : -1;   // pick the let-go frame once (re-rolling it every frame could skip it)
    while (!done && f < 4200){
      if (mode < 0.6){
        if (rnd() < 0.12){ const k = KEYS[Math.floor(rnd() * (rnd() < 0.15 ? 10 : 8))]; const d = !held.has(k); key(k, d); d ? held.add(k) : held.delete(k); }
      } else if (mode < 0.8){
        if (f % per === 0){ const nx = (f / per) % 2 ? gaitB : gaitA; for (const k of [...held]) if (k !== 'KeyK' && k !== 'KeyL' && !nx.includes(k)){ key(k, false); held.delete(k); }
          for (const k of nx) if (!held.has(k)){ key(k, true); held.add(k); } }
        if (f > 900 && rnd() < 0.01){ key('KeyK', false); key('KeyL', false); held.delete('KeyK'); held.delete('KeyL'); }
      } else {
        if (f === 2){ key('KeyK', true); key('KeyL', true); } if (f === quickUp){ key('KeyK', false); key('KeyL', false); }
      }
      if (rnd() < 0.0004){ key('Escape', true); key('Escape', false); out.esc = (out.esc || 0) + 1;
        held.clear(); key('KeyK', false); key('KeyL', false); __step(2); key('KeyK', true); key('KeyL', true); held.add('KeyK'); held.add('KeyL'); }
      if (rnd() < 0.0003) { dispatchEvent(new Event('blur')); dispatchEvent(new Event('focus')); }
      __step(1); f++;
      if (!finite()){ out.nan++; out.stuckInfo.push({g, f, state, why: 'nan'}); break; }
      if (state === 'result'){
        done = true; const r = release; out.types[r.type] = (out.types[r.type] || 0) + 1; if (r.mega || r.rmega){ const k = (r.mega ? 'F' : 'R') + r.tier; out.megas = out.megas || {}; out.megas[k] = (out.megas[k] || 0) + 1; }
        const dd = parseFloat(document.getElementById('rDist').textContent); out.d = out.d || []; out.d.push(Math.round(dd)); const t = document.getElementById('rTitle').textContent; out.tiers[t] = (out.tiers[t] || 0) + 1;
        if (!/m$/.test(document.getElementById('rDist').textContent) || /NaN|undefined/.test(document.getElementById('result').innerText)) out.errors.push({g, text: document.getElementById('result').innerText.slice(0, 200)});
      }
    }
    if (!done && f >= 4200){ out.stuck++; out.stuckInfo.push({g, state, held: [...held], running, chord: chord.length, chordEnd: Math.round(chordEnd - performance.now()), down: Object.keys(down).filter(k => down[k]), idle: Math.round(performance.now() - lastInputAt), vis: frameVisible, hidden: document.hidden, mode: +mode.toFixed(2)}); }
    out.maxFrames = Math.max(out.maxFrames, f);
    for (const k of held) key(k, false);
    key('Escape', true); key('Escape', false); __step(3);
    if (Object.values(down).some(Boolean)) out.errors.push({g, why: 'keys still down after reset', keys: Object.keys(down).filter(k => down[k])});
    if (state !== 'ready') out.errors.push({g, why: 'not ready after reset', state});
    out.games++;
  }
  return out;
})
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width':480,'height':320}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.add_init_script(INIT)
        await pg.goto(f'{ROOT_URL}{FILE}'); await pg.wait_for_timeout(300)
        r = await pg.evaluate(FUZZ, [GAMES, SEED])
        d=sorted(r.pop('d',[])); r['dist']={'n':len(d),'fwd>5':sum(x>5 for x in d),'back<-5':sum(x<-5 for x in d),'near':sum(-5<=x<=5 for x in d),'median':d[len(d)//2] if d else None}; r.pop('tiers',None); r['pageErrors'] = errs[:5]; r['pageErrorCount'] = len(errs)
        print(json.dumps(r, ensure_ascii=False, indent=1))
        await b.close()
asyncio.run(main())
