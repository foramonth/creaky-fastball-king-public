// ---------- drawing ----------
function W2S(x, y){ return [W/2 + (x - cam.x)*cam.z + shX, gy() - y*cam.z + shY]; }
let shX = 0, shY = 0;
const gy = () => H*0.82;
function worldT(){ ctx.setTransform(DPR*cam.z, 0, 0, -DPR*cam.z, DPR*(W/2 - cam.x*cam.z + shX), DPR*(gy() + shY)); }
function screenT(){ ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
function viewX(){ return [cam.x - (W/2 + 40)/cam.z, cam.x + (W/2 + 40)/cam.z]; }
function hash(n){ n = Math.sin(n*127.1)*43758.5453; return n - Math.floor(n); }

function draw(){
  shX = shake ? (Math.random()-0.5)*shake*18 : 0; shY = shake ? (Math.random()-0.5)*shake*18 : 0;
  screenT();
  // sky
  const alt = ball && !ball.held ? Math.max(0, ball.y) : 0;
  const space = Math.min(1, Math.max(0, (alt - 120)/400));
  const sky = ctx.createLinearGradient(0, 0, 0, gy());
  sky.addColorStop(0, mix('#7ec3e6', '#0b1030', space)); sky.addColorStop(1, mix('#d8eef5', '#2a2f5a', space));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  if (space > 0){ ctx.fillStyle = `rgba(255,255,255,${space})`; for (let i = 0; i < 80; i++) ctx.fillRect(hash(i)*W, hash(i+99)*gy()*0.9, 2, 2); }
  // clouds (parallax)
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 8; i++){
    const px = ((hash(i)*W*2 - cam.x*cam.z*0.05) % (W*2) + W*2) % (W*2) - W*0.3;
    const py = 40 + hash(i+7)*gy()*0.45, s = 30 + hash(i+3)*40;
    ctx.beginPath(); ctx.ellipse(px, py, s*1.6, s*0.5, 0, 0, 7); ctx.ellipse(px+s*0.6, py-s*0.3, s*0.8, s*0.45, 0, 0, 7); ctx.fill();
  }
  // far backdrop (parallax, screen space): a ballpark grandstand while we're in the park, the town outside it
  drawBackdrop(space);
  worldT();
  const [vl, vr] = viewX();
  // ground
  ctx.fillStyle = '#5c9a3e'; ctx.fillRect(vl, -1e5, vr - vl, 1e5);
  drawFieldBand();   // infield, foul line, mowing bands, seen at a slant
  ctx.fillStyle = '#fff'; ctx.fillRect(-0.3, -0.02, 0.6, 0.04); // rubber
  ctx.fillRect(CX + 0.6, -0.02, 0.43, 0.04); // plate
  // beyond the park
  ctx.fillStyle = '#8b8f94'; ctx.fillRect(160, -1e5, 1e6, 1e5);
  drawStands(WALL, 160, 1, vl, vr);
  // ---- behind the pitcher: 2nd base, centre field, back wall, scoreboard ----
  drawSecondBase();
  drawFacilities(vl, vr);
  ctx.fillStyle = '#8b8f94'; ctx.fillRect(-1e6, -1e5, 1e6 - 142, 1e5);
  drawStands(BWALL, -142, -1, vl, vr);
  drawFielder(); drawSecondBaseman();
  drawDust();
  drawVAds();
  // trail
  if (ball && ball.trail.length){
    for (const t of ball.trail){
      t.life -= (ball.mega||ball.rmega) ? 0.004 : 0.012;
      if (t.life <= 0) continue;
      ctx.fillStyle = (ball.mega||ball.rmega) ? `rgba(255,${120 + Math.floor(120*t.life)},40,${t.life*0.8})` : `rgba(255,255,255,${t.life*0.5})`;
      const rb = Math.max(0.037, 4/cam.z)*1.6, r = (ball.mega||ball.rmega) ? rb*(0.3 + t.life*1.5) : 0.03 + 2/cam.z;   // about ball-sized at the ball, tapering behind
      ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, 7); ctx.fill();
    }
  }
  drawCatcher();
  drawCapOnMound();
  drawPitcher();
  drawBall();
  // particles
  for (const p of fx){
    p.vy -= G*0.016; p.x += p.vx*0.016; p.y += p.vy*0.016; p.life -= 0.012;
    if (p.y < 0){ p.y = 0; p.vy *= -0.3; p.vx *= 0.8; }
    if (p.life > 0){ ctx.fillStyle = p.c; ctx.globalAlpha = p.life; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 1.5/cam.z, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  }
  fx = fx.filter(p => p.life > 0);

  // ---- screen space overlays ----
  screenT();
  drawMarkers(vl, vr);
  drawFacilityLabels(vl, vr);
  drawSigns(vl, vr);
  screenAdShown = drawScreenAds();
  { const [bx, by] = W2S(-141, 38.6); /* SCOREBOARD_Y: inside the frame drawStands puts on the back roof */ if (cam.z > 3 && bx > -200 && bx < W + 200){ ctx.textAlign = 'center'; ctx.fillStyle = '#f2b632'; ctx.font = `400 ${Math.min(40, cam.z*2.6)}px "CFK Display"`; ctx.fillText('삐걱 구장', bx, by); ctx.fillStyle = '#9fe08a'; ctx.font = `700 ${Math.min(22, cam.z*1.5)}px "CFK Sans"`; ctx.fillText('오늘의 투수: 상태 미상', bx, by + Math.min(34, cam.z*2.2)); } }
  drawJointTags();
  if (speech) drawSpeech();
  if (ball && (ball.mega||ball.rmega) && !ball.held && !ball.landed) speedLines();
  if (state === 'windup' && ball.held && !onScreen(CX)) arrowTo('포수 →  ' + (CX - P[I.pelvis].x).toFixed(1) + 'm');
  if (slowmo && !slowmo.fired){
    const k = Math.min(1, slowmo.t/0.25);
    const vg = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.25, W/2, H/2, Math.max(W,H)*0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(10,8,20,${0.65*k})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000'; const bh = H*0.1*k; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5*Math.sin(slowmo.t*10)})`; ctx.font = '900 20px "CFK Sans", sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('SLOW ▶▶', W - 20, H - bh/2 + 7);
  }
  if (cutFade > 0){ ctx.fillStyle = `rgba(20,18,30,${Math.min(1, cutFade/0.28)*0.85})`; ctx.fillRect(0, 0, W, H); cutFade -= 1/60; }
  if (flash){ ctx.fillStyle = `rgba(255,250,220,${flash*0.8})`; ctx.fillRect(0, 0, W, H); }
}
function onScreen(x){ const [sx] = W2S(x, 0); return sx > 0 && sx < W; }
function mix(a, b, t){
  const pa = [1,3,5].map(i => parseInt(a.substr(i,2),16)), pb = [1,3,5].map(i => parseInt(b.substr(i,2),16));
  return 'rgb(' + pa.map((v,i) => Math.round(v + (pb[i]-v)*t)).join(',') + ')';
}
function drawMarkers(vl, vr){
  const steps = [1,2,5,10,20,50,100,200,500,1000,2000];
  let st = steps.find(s => s*cam.z >= 90) || 5000;
  ctx.font = '700 12px "CFK Sans", sans-serif'; ctx.textAlign = 'center';
  for (let x = Math.ceil(vl/st)*st; x <= vr; x += st){
    const [sx, sy] = W2S(x, 0);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(sx - 1, sy, 2, 10);
    ctx.fillStyle = 'rgba(20,30,20,.75)'; ctx.fillText(x + 'm', sx, sy + 24);
  }
  // catcher label
  const [cx, cy] = W2S(CX, 0);
  if (cx > -50 && cx < W + 50 && cam.z > 15){ ctx.fillStyle = '#fff'; ctx.font = '700 11px "CFK Sans"'; ctx.fillText('홈플레이트 18.44m', cx + 0.8*cam.z, cy + 40); }
}
const SIGNS = [[BWALL, '외야 담장 (뒤쪽)'], [-20.4, '2루'], [WALL, '담장 122m'], [6000, '도 경계?!'], [-4000, '도 경계 (반대편)']];
function drawSigns(vl, vr){
  for (const [x, t] of SIGNS){
    if (x < vl - 50 || x > vr + 50) continue;
    const [sx, sy] = W2S(x, (x === WALL || x === BWALL) ? STAND_WALL_TOP : 0);
    const h = Math.max(26, Math.min(70, 3*cam.z));
    ctx.fillStyle = '#5a4630'; ctx.fillRect(sx - 2, sy - h, 4, h);
    ctx.font = '900 15px "CFK Sans", sans-serif'; ctx.textAlign = 'center';
    const w = ctx.measureText(t).width + 16;
    ctx.fillStyle = '#fbf6ea'; ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx - w/2, sy - h - 24, w, 24, 5) : ctx.rect(sx - w/2, sy - h - 24, w, 24); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1d1a16'; ctx.fillText(t, sx, sy - h - 7);
  }
}
function arrowTo(t){
  ctx.font = '900 16px "CFK Sans", sans-serif'; ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(29,26,22,.7)'; const w = ctx.measureText(t).width + 18;
  ctx.fillRect(W - w - 10, gy() - 70, w, 28); ctx.fillStyle = '#fff'; ctx.fillText(t, W - 19, gy() - 50);
}
function speedLines(){
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++){
    const y = Math.random()*H, x = Math.random()*W, l = 60 + Math.random()*140;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - l, y + l*0.2); ctx.stroke();
  }
}
function drawMicCaption(s, side){
  const name = {c: '포수', f: '외야수', s: '2루수', p: '투수'}[s.who] || '투수', arrow = side < 0 ? '◀' : side > 0 ? '▶' : '▲';
  ctx.save(); screenT();
  ctx.font = '900 13px "CFK Sans", sans-serif'; const tagW = ctx.measureText('현장 마이크').width + 18;
  ctx.font = '900 16px "CFK Sans", sans-serif'; const nameTxt = side < 0 ? `${arrow} ${name}` : `${name} ${arrow}`, nameW = ctx.measureText(nameTxt).width + 20;
  ctx.font = '700 17px "CFK Sans", sans-serif'; const txtW = ctx.measureText(s.text).width + 26;
  const h = 40, w = tagW + nameW + txtW, x1 = W - 24, x0 = x1 - w, y0 = H - 168;
  const slide = Math.min(1, (s.age || 0)*6), dx = (1 - slide)*40;                                   // slides in from the right
  ctx.globalAlpha = slide; ctx.translate(dx, 0);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x0 + 4, y0 + 4, w, h);                             // the same hard shadow as the other lower-thirds
  ctx.fillStyle = '#d9412b'; ctx.fillRect(x0, y0, tagW, h);
  ctx.fillStyle = '#1f2a9a'; ctx.fillRect(x0 + tagW, y0, nameW, h);
  ctx.fillStyle = '#fffdf6'; ctx.fillRect(x0 + tagW + nameW, y0, txtW, h);
  ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = 2.5; ctx.strokeRect(x0, y0, w, h);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 13px "CFK Sans", sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('현장 마이크', x0 + tagW/2, y0 + h/2 + 1);
  ctx.font = '900 16px "CFK Sans", sans-serif'; ctx.fillStyle = '#ffd21a'; ctx.fillText(nameTxt, x0 + tagW + nameW/2, y0 + h/2 + 1);
  ctx.font = '700 17px "CFK Sans", sans-serif'; ctx.fillStyle = '#1d1a16'; ctx.fillText(s.text, x0 + tagW + nameW + txtW/2, y0 + h/2 + 1);
  ctx.restore();
}
function drawSpeech(){
  const s = speech;
  let x, y;
  if (s.who === 'c'){ [x, y] = W2S(catcher.x, catcher.y + 1.4); }
  else if (s.who === 'f'){ [x, y] = W2S(FX, 2.4); }
  else if (s.who === 's'){ const sc = Math.max(1, 40/(cam.z*1.8)); [x, y] = W2S(SB, 2.4*sc); }
  else { [x, y] = W2S(P[I.head].x, P[I.head].y + 0.35); }
  // the speaker has left the picture: the line goes out as a broadcast caption from the field mic, an arrow toward them
  if (x < 24 || x > W - 24 || y < 0 || y > H + 40) return drawMicCaption(s, x < 24 ? -1 : x > W - 24 ? 1 : 0);
  ctx.font = '700 15px "CFK Sans", sans-serif'; ctx.textAlign = 'center';
  const w = ctx.measureText(s.text).width + 20;
  x = Math.max(w/2 + 12, Math.min(W - w/2 - 12, x)); y = Math.max(215, Math.min(H - 40, y));   // keep bubbles on screen, below the HUD panels
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w/2, y - 30, w, 28, 12) : ctx.rect(x - w/2, y - 30, w, 28); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 6, y - 3); ctx.lineTo(x, y + 8); ctx.lineTo(x + 6, y - 3); ctx.fill();
  ctx.fillStyle = '#1d1a16'; ctx.fillText(s.text, x, y - 11);
}

function limb(a, b, w, col, outline=true){
  if (outline){ ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = w + 0.035; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}
// a whole limb drawn as one piece: every outline first, then every fill, so no seam line shows at the knee/elbow
function limbChain(segs){
  for (const [a, b, w] of segs){ ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = w + 0.035; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (const [a, b, w, col] of segs){ ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
}
function lerpP(a, b, t){ return {x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t}; }
function drawLeg(pel, knee, ank, toe, back){
  const pants = C_(back ? '#d6d0c4' : '#f6f2e8'), sock = C_(back ? '#18213a' : '#26345a');   // C_: robot palette in 투구 교실
  const mid = lerpP(knee, ank, 0.35);
  ctx.lineCap = 'round';
  limbChain([[pel, knee, 0.17, pants], [knee, mid, 0.14, pants], [mid, ank, 0.12, sock], [ank, toe, 0.09, '#141414']]);
}
function drawSecondBase(){   // (no dugout any more) — just the 2nd-base cut-out behind the mound
    ctx.fillStyle = '#fff'; ctx.fillRect(-20.6, 0, 0.4, 0.08);
}

// ---------- the world outside the park ----------
function rr(x, y, w, h, c){ ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function drawFacilitiesOrig(vl, vr){   // the original look, still used for the far-off landmarks (ferris wheel, airport, other ballpark)
  for (const f of FAC){
    const [x, w, h, kind, col] = f, x0 = x - w/2, x1 = x + w/2;
    if (x1 < vl || x0 > vr) continue;
    const detail = cam.z*Math.min(w, 10) > 18;
    if (kind === 'water'){
      rr(x0, -1e5, w, 1e5 + 0.05, col);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < w; i += 6) ctx.fillRect(x0 + i, -0.25, 3, 0.08);
      if (w < 100){ rr(x0 - 2, 3, w + 4, 0.8, '#8b8f94'); for (let i = 0; i <= w; i += w/5) rr(x0 + i - 0.4, 0, 0.8, 3, '#6d7177'); }
      continue;
    }
    if (kind === 'cars'){
      for (let i = 0; i < w; i += 4.2){ const c = ['#d9412b','#3d7ab8','#f4f1ea','#26345a','#f2b632'][Math.floor(hash(i + x)*5)];
        rr(x0 + i, 0.3, 3.6, 1.0, c); rr(x0 + i + 0.7, 1.3, 2.0, 0.6, c); rr(x0 + i + 0.5, 0, 0.7, 0.5, '#1d1a16'); rr(x0 + i + 2.4, 0, 0.7, 0.5, '#1d1a16'); }
      continue;
    }
    if (kind === 'mountain'){
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x - w*0.1, h); ctx.lineTo(x + w*0.1, h*0.8); ctx.lineTo(x1, 0); ctx.fill();
      ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.moveTo(x - w*0.1 - h*0.12, h*0.85); ctx.lineTo(x - w*0.1, h); ctx.lineTo(x - w*0.1 + h*0.12, h*0.88); ctx.fill();
      continue;
    }
    if (kind === 'ferris'){
      const r = h/2 - 1, cy = r + 3;
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.4, 2/cam.z);
      ctx.beginPath(); ctx.arc(x, cy, r, 0, 7); ctx.stroke();
      for (let i = 0; i < 12; i++){ const a = i/12*Math.PI*2 + now*0.05; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + Math.cos(a)*r, cy + Math.sin(a)*r); ctx.stroke();
        rr(x + Math.cos(a)*r - 1.2, cy + Math.sin(a)*r - 2.4, 2.4, 2.2, ['#f2b632','#3d7ab8','#d9412b','#2f9e6a'][i % 4]); }
      ctx.beginPath(); ctx.moveTo(x - r*0.6, 0); ctx.lineTo(x, cy); ctx.lineTo(x + r*0.6, 0); ctx.stroke();
      rr(x0, 0, w*0.25, 4, '#e98ab0'); rr(x1 - w*0.25, 0, w*0.25, 6, '#7fd0ff');
      continue;
    }
    if (kind === 'airport'){
      rr(x0, 0, w, h*0.45, col); rr(x0, h*0.45, w, 0.8, '#4b5263');
      if (detail) for (let i = 2; i < w - 2; i += 4) rr(x0 + i, h*0.12, 2.6, h*0.22, '#9fc6dd');
      rr(x1 - 14, 0, 5, h, '#cfc6b8'); rr(x1 - 16, h, 9, 3.5, '#9fc6dd');
      // a plane waiting to leave
      const px = x0 - 30; rr(px, 2, 26, 3, '#f4f1ea'); rr(px + 9, 2.5, 8, 0.9, '#d9412b');
      ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.moveTo(px, 5); ctx.lineTo(px - 2, 10); ctx.lineTo(px + 4, 5); ctx.fill();
      continue;
    }
    if (kind === 'stadium'){
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, h*0.3); ctx.lineTo(x0 + w*0.3, h); ctx.lineTo(x1 - w*0.3, h); ctx.lineTo(x1, h*0.3); ctx.lineTo(x1, 0); ctx.fill();
      rr(x0 + 4, h, 0.8, 14, '#ddd'); rr(x0 + 1, h + 14, 7, 3, '#fff8c8'); rr(x1 - 5, h, 0.8, 14, '#ddd'); rr(x1 - 8, h + 14, 7, 3, '#fff8c8');
      continue;
    }
    // buildings: shop / apt / station
    const towers = kind === 'apt' ? 3 : 1, tw = w/towers;
    for (let t = 0; t < towers; t++){
      const bx = x0 + t*tw + (towers > 1 ? 1.5 : 0), bw = tw - (towers > 1 ? 3 : 0), bh = kind === 'apt' ? h*(0.8 + 0.2*hash(t + x)) : h;
      rr(bx, 0, bw, bh, col);
      rr(bx - 0.2, bh - 0.4, bw + 0.4, 0.5, 'rgba(0,0,0,.25)');
      if (detail){
        const rows = Math.max(1, Math.floor((bh - (kind === 'shop' ? 3.2 : 1.5))/2.6)), cols = Math.max(1, Math.floor(bw/2.4));
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
          const lit = hash(r*13 + c*7 + x) > 0.45;
          rr(bx + 0.6 + c*(bw - 1.2)/cols, 2.6 + r*2.6, (bw - 1.2)/cols - 0.6, 1.4, lit ? '#fff3b0' : 'rgba(20,30,50,.45)');
        }
        if (kind !== 'apt') rr(x - 0.9, 0, 1.8, 2.2, 'rgba(20,20,20,.6)');                         // door
      }
      if (kind === 'shop') { rr(bx + 0.4, bh - 2.3, bw - 0.8, 1.5, '#fbf6ea'); rr(bx + 0.4, bh - 2.3, bw - 0.8, 0.25, col); }  // signboard
      if (kind === 'station'){ ctx.fillStyle = '#2f6fd0'; ctx.beginPath(); ctx.arc(x, bh + 2.2, 1.8, 0, 7); ctx.fill(); }
    }
  }
}
function drawFacilityLabels(vl, vr){
  if (cam.z < 0.25) return;
  ctx.textAlign = 'center';
  for (const f of FAC){
    const [x, w, h, kind, , label] = f;
    if (x + w/2 < vl || x - w/2 > vr) continue;
    const top = kind === 'shop' ? h - 1.55 : kind === 'water' || kind === 'cars' ? 4.5 : kind === 'ferris' ? h + 3.5 : kind === 'station' ? h + 4.6 : h + 2;
    const [sx, sy] = W2S(x, top);
    const fs = Math.max(11, Math.min(18, cam.z*1.1));
    ctx.font = `900 ${fs}px "CFK Sans", sans-serif`;
    if (kind === 'shop' && cam.z*w > ctx.measureText(label).width + 6){ ctx.fillStyle = '#1d1a16'; ctx.fillText(label, sx, sy + fs*0.35); continue; }
    const tw = ctx.measureText(label).width + 12;
    ctx.fillStyle = 'rgba(251,246,234,.92)'; ctx.fillRect(sx - tw/2, sy - fs - 4, tw, fs + 8);
    ctx.fillStyle = '#1d1a16'; ctx.fillText(label, sx, sy - 3);
  }
}
function drawCapOnMound(){
  if (!(ball && ball.rmega && !ball.held)) return;
  ctx.fillStyle = '#1f2a44'; ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = 0.025;
  ctx.beginPath(); ctx.arc(0.1, 0, 0.13, 0, Math.PI); ctx.fill(); ctx.stroke(); ctx.fillRect(0.2, 0, 0.16, 0.035);
}
// fielders (2nd baseman, outfielder) drawn the way the pitcher is: shoulders at the top of the torso, two-piece arms that
// bend at the elbow (solved so the hand lands exactly where it has to — the 2nd baseman's mitt is where the ball goes),
// pants, socks and shoes, a face. Local coordinates in metres, facing +x; face = -1 mirrors him.
function armIK(S, T, l1, l2){                                         // two-bone reach: the elbow bends downward
  const dx = T.x - S.x, dy = T.y - S.y, d = Math.min(l1 + l2 - 1e-3, Math.max(0.05, Math.hypot(dx, dy))), a = Math.atan2(dy, dx);
  const A = Math.acos(Math.max(-1, Math.min(1, (l1*l1 + d*d - l2*l2)/(2*l1*d))));
  const e1 = {x: S.x + l1*Math.cos(a + A), y: S.y + l1*Math.sin(a + A)}, e2 = {x: S.x + l1*Math.cos(a - A), y: S.y + l1*Math.sin(a - A)};
  const E = e1.y < e2.y ? e1 : e2, H = {x: S.x + Math.cos(a)*d, y: S.y + Math.sin(a)*d};
  return [E, H];
}
function drawFieldman(x0, sc, face, pose){
  const U = '#f6f2e8', U2 = '#d6d0c4', SOCK = '#26345a', SOCK2 = '#18213a', SKIN = '#f1c39b', OUTL = '#1d1a16';
  const sq = pose.squat || 0, hip = {x: 0, y: 0.92 - sq}, nk = {x: 0, y: 1.48 - sq*0.8}, hd = {x: 0.01, y: 1.71 - sq*0.8};
  ctx.save(); ctx.translate(x0, 0); ctx.scale(sc*face, sc); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const leg = (foot, knee, back) => { const kn = {x: knee, y: 0.48 - sq*0.5}, ank = {x: foot, y: 0.06}, toe = {x: foot + 0.2, y: 0.02}, mid = lerpP(kn, ank, 0.35);
    limbChain([[hip, kn, 0.17, back ? U2 : U], [kn, mid, 0.14, back ? U2 : U], [mid, ank, 0.12, back ? SOCK2 : SOCK], [ank, toe, 0.09, '#141414']]); };
  const arm = (S, T, sleeve, glove) => { const [E, Hh] = armIK(S, T, 0.29, 0.27);
    limbChain([[S, E, 0.11, sleeve], [E, Hh, 0.09, SKIN]]);
    if (glove) drawFieldGlove(Hh.x, Hh.y, Math.atan2(Hh.y - E.y, Hh.x - E.x) + 0.25, 0.34);   // the hand inside, the glove running on
    else { ctx.fillStyle = SKIN; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.arc(Hh.x, Hh.y, 0.05, 0, 7); ctx.fill(); ctx.stroke(); } };
  const shB = {x: -0.04, y: nk.y - 0.07}, shF = {x: 0.04, y: nk.y - 0.07};
  arm(shB, pose.bare, U2, false);                                     // the far arm, behind him
  leg(-0.2 + (pose.stance || 0)*-0.06, -0.08 - sq*0.1, true); 
  limb(hip, nk, 0.32, U);                                             // torso, belt
  { ctx.save(); ctx.translate(0, (hip.y + nk.y)/2); ctx.fillStyle = SOCK; ctx.fillRect(-0.16, -0.27, 0.32, 0.05); ctx.restore(); }
  leg(0.24 + (pose.stance || 0)*0.06, 0.14 + sq*0.15, false);
  // head: skin, cap with the brim toward where he looks, an eye, a mouth
  ctx.save(); ctx.translate(hd.x, hd.y); ctx.rotate(pose.lookUp ? 0.35 : pose.flinch ? -0.25 : 0);
  ctx.fillStyle = SKIN; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.025; ctx.beginPath(); ctx.arc(0, 0, 0.13, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1f2a44'; ctx.beginPath(); ctx.arc(0, 0.02, 0.135, 0, Math.PI); ctx.fill(); ctx.stroke(); ctx.fillRect(0.02, 0.015, 0.17, 0.035);
  ctx.fillStyle = OUTL; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.018;
  if (pose.flinch){ ctx.beginPath(); ctx.moveTo(0.04, -0.01); ctx.lineTo(0.08, -0.03); ctx.lineTo(0.04, -0.05); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0.065, pose.lookUp ? -0.02 : -0.03, 0.02, 0, 7); ctx.fill(); }
  ctx.lineWidth = 0.015; ctx.beginPath(); if (pose.flinch || pose.lookUp) ctx.arc(0.075, -0.085, 0.02, 0, 7); else { ctx.moveTo(0.045, -0.085); ctx.lineTo(0.1, -0.08); } ctx.stroke();
  ctx.restore();
  arm(shF, pose.glove, U, true);                                      // the glove arm, in front
  ctx.restore();
}
// a fielder's glove seen from the side, the way it really sits on the hand: the hand goes in through the wrist opening at
// the back, the long padded body runs on along the forearm to the finger tips, the laced web stands up in front.
// (hx, hy) is where the hand is, ang the forearm direction, u the glove length in metres. Local x = along the fingers.
function drawFieldGlove(hx, hy, ang, u){
  const LEA = '#8a5428', DARK = '#5e3818', HOLE = '#2b190b', LACE = '#e3bd85', GOLD = '#e8b84a', OUTL = '#1d1a16';
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.scale(u, u); ctx.translate(-0.12, -0.36); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // web: an H-web of leather straps spanning from the thumb tip to the index tip, behind the body
  ctx.fillStyle = HOLE; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(0.4, 0.8); ctx.quadraticCurveTo(0.68, 0.9, 0.97, 0.8); ctx.lineTo(0.96, 0.56); ctx.lineTo(0.5, 0.52); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = LEA; ctx.lineWidth = 0.025;
  for (const x of [0.58, 0.72, 0.86]){ ctx.beginPath(); ctx.roundRect(x - 0.045, 0.53, 0.09, 0.32, 0.03); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.roundRect(0.48, 0.64, 0.48, 0.08, 0.03); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = LACE; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(0.44, 0.76); ctx.lineTo(0.95, 0.77); ctx.stroke();
  // the body: wrist opening at the back, rounded heel underneath, the finger end curling up in front, the thumb rising behind the web
  ctx.fillStyle = LEA; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.04;
  ctx.beginPath(); ctx.moveTo(0.02, 0.24);
  ctx.quadraticCurveTo(0.08, -0.02, 0.42, -0.04);                // heel
  ctx.quadraticCurveTo(0.9, -0.02, 1.04, 0.3);                   // under the fingers
  ctx.quadraticCurveTo(1.12, 0.62, 1.0, 0.82);                   // the finger end curls up
  ctx.quadraticCurveTo(0.93, 0.9, 0.9, 0.74);                    // index tip
  ctx.quadraticCurveTo(0.84, 0.58, 0.6, 0.56);                   // top edge under the web
  ctx.quadraticCurveTo(0.5, 0.56, 0.47, 0.66);
  ctx.quadraticCurveTo(0.44, 0.88, 0.36, 0.84);                  // thumb tip
  ctx.quadraticCurveTo(0.26, 0.8, 0.22, 0.62);
  ctx.quadraticCurveTo(0.04, 0.62, 0.0, 0.44); ctx.closePath(); ctx.fill(); ctx.stroke();
  // finger stalls: binding lines running to the tips, laced at the ends
  ctx.strokeStyle = DARK; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(0.36, 0.12); ctx.quadraticCurveTo(0.8, 0.08, 1.02, 0.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.46, 0.3); ctx.quadraticCurveTo(0.8, 0.3, 0.98, 0.62); ctx.stroke();
  ctx.strokeStyle = LACE; ctx.lineWidth = 0.025;
  for (const [x, y] of [[1.03, 0.3], [1.07, 0.42], [1.07, 0.55], [1.04, 0.68], [0.98, 0.8]]){ ctx.beginPath(); ctx.moveTo(x - 0.045, y - 0.01); ctx.lineTo(x + 0.035, y + 0.02); ctx.stroke(); }
  // wrist opening with its rolled binding, a stitched gold swoosh on the back, stitching along the thumb
  ctx.fillStyle = HOLE; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.ellipse(0.12, 0.38, 0.08, 0.13, -0.2, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = DARK; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.ellipse(0.12, 0.38, 0.11, 0.16, -0.2, 0, 7); ctx.stroke();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0.26, 0.2); ctx.quadraticCurveTo(0.42, 0.4, 0.62, 0.42); ctx.stroke();
  ctx.setLineDash([0.03, 0.03]); ctx.lineWidth = 0.015; ctx.beginPath(); ctx.moveTo(0.27, 0.6); ctx.quadraticCurveTo(0.36, 0.78, 0.42, 0.7); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}
function drawFielder(){
  const f = fielder; if (!f) return;
  const sc = Math.max(1, 40/(cam.z*1.8)), look = f.look > 0;
  // waiting in the outfield, hands on knees; once a ball sails over, he turns round and reaches up for it (hopelessly)
  drawFieldman(FX, sc, look ? -1 : 1, look ? {glove: {x: 0.32, y: 1.98}, bare: {x: 0.16, y: 1.7}, lookUp: true}
                                         : {glove: {x: 0.3, y: 0.95}, bare: {x: 0.22, y: 0.82}, squat: 0.06, stance: 1});
}
function drawSecondBaseman(){   // plays in, mitt out once the pitcher heads his way
  const f = fielder; if (!f) return;
  const sc = Math.max(1, 40/(cam.z*1.8)), reach = f.sb > 0, duck = f.duck && !reach;
  // the mitt goes exactly where sbGlove() puts the ball: (SB + 0.55*sc, 1.25*sc)
  const pose = reach ? {glove: {x: 0.4, y: 1.16}, bare: {x: 0.2, y: 1.05}}
             : duck ? {glove: {x: 0.12, y: 1.82}, bare: {x: -0.06, y: 1.8}, squat: 0.18, flinch: true}
             : {glove: {x: 0.3, y: 0.92}, bare: {x: 0.2, y: 0.82}, squat: 0.08, stance: 1};
  drawFieldman(SB, sc, 1, pose);
}
// robot palette for 투구 교실 (a recolour, not a canvas filter: filters are slow on weaker PCs)
const ROBO_COL = {'#f6f2e8':'#d3dbe6', '#d6d0c4':'#9aa6b8', '#f1c39b':'#b9c6d6', '#e9785f':'#7fd0ff', '#d9412b':'#3a7bd5', '#7a4a22':'#56606e', '#3a2a1a':'#3b4452', '#26345a':'#2c3a55', '#1f2a44':'#2c3a55', '#18213a':'#232e45'};
function C_(c){ return tut ? (ROBO_COL[c] || c) : c; }
function drawRobotStand(){        // 투구 교실: the pole the robot is bolted to
  const pl = P[I.pelvis];
  ctx.save(); ctx.fillStyle = '#5b6573'; ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = 0.03;
  ctx.fillRect(pl.x - 0.45, 0, 0.9, 0.12); ctx.strokeRect(pl.x - 0.45, 0, 0.9, 0.12);
  ctx.lineCap = 'butt'; ctx.lineWidth = 0.11; ctx.beginPath(); ctx.moveTo(pl.x, 0.1); ctx.lineTo(pl.x, pl.y - 0.05); ctx.stroke();
  ctx.strokeStyle = '#9aa4b2'; ctx.lineWidth = 0.07; ctx.beginPath(); ctx.moveTo(pl.x, 0.1); ctx.lineTo(pl.x, pl.y - 0.05); ctx.stroke();
  ctx.restore();
}
function drawRobotBits(){         // antenna and joint bolts on top of the usual body
  const h = P[I.head];
  ctx.save(); ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = 0.03; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(h.x - 0.02, h.y + 0.14); ctx.lineTo(h.x - 0.08, h.y + 0.42); ctx.stroke();
  ctx.fillStyle = (performance.now() % 1000) < 500 ? '#e01010' : '#ff8a8a'; ctx.beginPath(); ctx.arc(h.x - 0.08, h.y + 0.45, 0.05, 0, 7); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawPitcher(){
  if (tut){
    if (ROBOT_PIN) drawRobotStand();
    drawPitcherCore();
    drawRobotBits(); return;
  }
  drawPitcherCore();
}
function drawPitcherCore(){
  ctx.save();
  if (ball && ball.pin){ const pl = P[I.pelvis], sc = Math.max(1, 80/(cam.z*1.8)); ctx.translate(pl.x, pl.y); ctx.scale(sc, sc); ctx.translate(-pl.x, -pl.y); }
  drawPitcherBody();
  if (jointTags || tut) drawJointDots();
  ctx.restore();
}
// '관절 표시': a yellow dot on every joint the keys can move (shoulder, elbows, hands, hip, knees, ankles)
const DOT_JOINTS = [I.neck, I.relb, I.rhand, I.gelb, I.pelvis, I.lknee, I.bknee, I.lank, I.bank];
function drawJointDots(){
  const r = Math.max(0.045, 4.5/cam.z);
  ctx.save(); ctx.fillStyle = '#ffd21a'; ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = Math.max(0.02, 1.6/cam.z);
  for (const j of DOT_JOINTS){ const p = P[j]; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
function drawPitcherBody(){
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const p = P, pel = p[I.pelvis], nk = p[I.neck], hd = p[I.head];
  // glove arm (behind)
  limbChain([[nk, p[I.gelb], 0.11, C_('#d6d0c4')], [p[I.gelb], p[I.ghand], 0.095, C_('#d6d0c4')]]);
  ctx.fillStyle = C_('#7a4a22'); ctx.strokeStyle = C_('#1d1a16'); ctx.lineWidth = 0.025;
  ctx.beginPath(); ctx.arc(p[I.ghand].x, p[I.ghand].y, 0.09, 0, 7); ctx.fill(); ctx.stroke();
  drawLeg(pel, p[I.bknee], p[I.bank], p[I.btoe], true);
  // torso
  limb(pel, nk, 0.32, C_('#f6f2e8'));
  // pinstripes / number
  const tAng = Math.atan2(nk.y - pel.y, nk.x - pel.x);
  ctx.save(); ctx.translate((pel.x+nk.x)/2, (pel.y+nk.y)/2); ctx.rotate(tAng - Math.PI/2);
  ctx.fillStyle = C_('#26345a'); ctx.fillRect(-0.16, -0.27, 0.32, 0.05); // belt
  ctx.scale(1, -1); ctx.font = '900 0.2px "CFK Sans"'; ctx.textAlign = 'center'; ctx.fillStyle = C_('#d9412b'); ctx.fillText('0', 0, 0.06);
  ctx.restore();
  drawLeg(pel, p[I.lknee], p[I.lank], p[I.ltoe], false);
  // head
  const strain = ['KeyQ','KeyA','KeyW','KeyS','KeyE','KeyD','KeyU','KeyJ','KeyK','KeyL'].filter(c => down[c]).length;
  ctx.save(); ctx.translate(hd.x, hd.y); ctx.rotate(Math.atan2(hd.y - nk.y, hd.x - nk.x) - Math.PI/2);
  const red = Math.min(1, strain/6);
  ctx.fillStyle = mix(C_('#f1c39b'), C_('#e9785f'), red*0.7); ctx.strokeStyle = C_('#1d1a16'); ctx.lineWidth = 0.025;
  ctx.beginPath(); ctx.arc(0, 0, 0.13, 0, 7); ctx.fill(); ctx.stroke();
  // cap (stays on the mound if he gets dragged away)
  if (!(ball && ball.rmega && !ball.held)){
    ctx.fillStyle = C_('#1f2a44');
    ctx.beginPath(); ctx.arc(0, 0.02, 0.135, 0, Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillRect(0.02, 0.015, 0.17, 0.035);
  } else { ctx.fillStyle = C_('#3a2a1a'); for (let i = -2; i <= 2; i++){ ctx.fillRect(i*0.04 - 0.01, 0.1, 0.02, 0.07); } }
  // face
  ctx.fillStyle = C_('#1d1a16');
  if (body.fallen){ ctx.lineWidth = 0.018; ctx.beginPath(); ctx.moveTo(0.04,-0.01); ctx.lineTo(0.09,-0.05); ctx.moveTo(0.09,-0.01); ctx.lineTo(0.04,-0.05); ctx.stroke(); }
  else if (strain >= 3){ ctx.lineWidth = 0.018; ctx.beginPath(); ctx.moveTo(0.04,-0.01); ctx.lineTo(0.08,-0.03); ctx.lineTo(0.04,-0.05); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0.065, -0.03, 0.02, 0, 7); ctx.fill(); }
  ctx.lineWidth = 0.015; ctx.beginPath();
  if (strain >= 3){ ctx.moveTo(0.04, -0.085); ctx.lineTo(0.1, -0.08); } else { ctx.arc(0.07, -0.07, 0.025, -0.3, -Math.PI+0.3, true); }
  ctx.stroke();
  if (strain >= 5){ ctx.fillStyle = C_('#7fd0ff'); ctx.beginPath(); ctx.arc(-0.12, 0.05 - (now*0.5 % 0.2), 0.025, 0, 7); ctx.fill(); }
  ctx.restore();
  if (release && release.type === 'sulk'){
    ctx.save(); ctx.translate(hd.x, hd.y + 0.32); ctx.strokeStyle = C_('#1d1a16'); ctx.lineWidth = 0.025; ctx.beginPath();
    for (let i = 0; i <= 40; i++){ const a = i/40*Math.PI*6, r = 0.05 + i/40*0.06; const x = Math.cos(a)*r*1.4, y = Math.sin(a)*r*0.7; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  // throwing arm (front)
  limbChain([[nk, p[I.relb], 0.115, C_('#f6f2e8')], [p[I.relb], p[I.rhand], 0.095, C_('#f1c39b')]]);
  ctx.fillStyle = C_('#f1c39b'); ctx.strokeStyle = C_('#1d1a16'); ctx.lineWidth = 0.022;
  ctx.beginPath(); ctx.arc(p[I.rhand].x, p[I.rhand].y, 0.055, 0, 7); ctx.fill(); ctx.stroke();
  // fingers: two little sticks, closed when pressed
  const fa = Math.atan2(p[I.rhand].y - p[I.relb].y, p[I.rhand].x - p[I.relb].x);
  [['KeyK', 0.5], ['KeyL', -0.1]].forEach(([k, o]) => {
    const open = down[k] ? 0.2 : 1.1, a = fa + o*(down[k] ? 0.6 : 1) + (o > 0 ? open : -open)*0.6;
    const h = p[I.rhand], e = {x: h.x + Math.cos(a)*0.09, y: h.y + Math.sin(a)*0.09};
    limb(h, e, 0.028, down[k] ? C_('#e9a07a') : C_('#f1c39b'));
  });
}
function drawBall(){
  if (!ball) return;
  let x, y;
  if (ball.held){ const h = P[I.rhand], e = P[I.relb], d = Math.hypot(h.x-e.x, h.y-e.y)||1; x = h.x + (h.x-e.x)/d*0.05; y = h.y + (h.y-e.y)/d*0.05; ball.x = x; ball.y = y; }
  else { x = ball.x; y = ball.y; }
  const r = Math.max(0.037, 4/cam.z) * ((ball.mega||ball.rmega) && !ball.held ? 1.6 : 1);
  if ((ball.mega||ball.rmega) && !ball.held && !ball.landed){
    ctx.fillStyle = 'rgba(255,170,40,.45)'; ctx.beginPath(); ctx.arc(x, y, r*3.2, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = r*0.25;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#d9412b'; ctx.lineWidth = r*0.18;
  ctx.beginPath(); ctx.arc(x + Math.cos(ball.rot)*r*0.9, y + Math.sin(ball.rot)*r*0.9, r*0.7, ball.rot + 2.2, ball.rot + 4.1); ctx.stroke();
  ctx.beginPath(); ctx.arc(x - Math.cos(ball.rot)*r*0.9, y - Math.sin(ball.rot)*r*0.9, r*0.7, ball.rot - 0.9, ball.rot + 0.9); ctx.stroke();
}
// the catcher's mitt seen from the side, as he holds it out to the pitcher: the pocket faces the pitcher (-x), so we see the
// mitt's back and its thick laced rim edge-on, the thumb bulging at the bottom front, the hand going in at the lower back.
// (mx, my) is the pocket — where mittPos() puts the ball. tilt turns the pocket upward (radians).
const CMITT_HAND = [0.13, -0.12];
function catcherMittHand(mx, my, tilt){ const c = Math.cos(tilt), s = Math.sin(tilt), [x, y] = CMITT_HAND; return {x: mx + x*c + y*s, y: my - x*s + y*c}; }
function drawCatcherMitt(mx, my, tilt){
  const LEA = '#8a5428', DARK = '#5e3818', ROLL = '#a3672f', HOLE = '#2b190b', LACE = '#e3bd85', OUTL = '#1d1a16';
  ctx.save(); ctx.translate(mx, my); ctx.scale(-1, 1); ctx.rotate(tilt); ctx.lineJoin = 'round'; ctx.lineCap = 'round';   // local +x = toward the pitcher
  // the shell: a fat pillow, round at the back, nearly flat at the face
  ctx.fillStyle = LEA; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.014;
  ctx.beginPath(); ctx.moveTo(-0.03, 0.175);
  ctx.bezierCurveTo(-0.12, 0.2, -0.2, 0.12, -0.21, 0.0);
  ctx.bezierCurveTo(-0.215, -0.1, -0.17, -0.16, -0.1, -0.175);
  ctx.bezierCurveTo(-0.04, -0.19, 0.04, -0.16, 0.035, -0.1);          // thumb, bulging forward at the bottom
  ctx.bezierCurveTo(0.03, -0.06, 0.005, -0.05, 0.008, -0.02);
  ctx.bezierCurveTo(0.012, 0.06, 0.01, 0.14, -0.03, 0.175); ctx.closePath(); ctx.fill(); ctx.stroke();
  // finger stalls on the back, the thumb seam
  ctx.strokeStyle = DARK; ctx.lineWidth = 0.01;
  ctx.beginPath(); ctx.moveTo(-0.07, 0.17); ctx.quadraticCurveTo(-0.13, 0.05, -0.11, -0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.13, 0.15); ctx.quadraticCurveTo(-0.19, 0.04, -0.16, -0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.05, -0.08); ctx.quadraticCurveTo(-0.0, -0.06, 0.02, -0.1); ctx.stroke();
  // the face: a sliver of the dark pocket, the rolled rim round it, laces looping over the roll
  ctx.fillStyle = HOLE; ctx.beginPath(); ctx.ellipse(0.0, 0.06, 0.018, 0.1, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = OUTL; ctx.lineWidth = 0.042; ctx.beginPath(); ctx.moveTo(-0.035, 0.16); ctx.quadraticCurveTo(0.03, 0.1, 0.014, -0.03); ctx.stroke();
  ctx.strokeStyle = ROLL; ctx.lineWidth = 0.028; ctx.beginPath(); ctx.moveTo(-0.035, 0.16); ctx.quadraticCurveTo(0.03, 0.1, 0.014, -0.03); ctx.stroke();
  ctx.strokeStyle = LACE; ctx.lineWidth = 0.007;
  for (let t = 0.08; t < 0.95; t += 0.14){ const x = (1-t)*(1-t)*-0.035 + 2*t*(1-t)*0.03 + t*t*0.014, y = (1-t)*(1-t)*0.16 + 2*t*(1-t)*0.1 + t*t*-0.03;
    ctx.beginPath(); ctx.moveTo(x - 0.016, y - 0.008); ctx.lineTo(x + 0.016, y + 0.01); ctx.stroke(); }
  // web laces showing over the top between thumb and fingers
  ctx.strokeStyle = LACE; ctx.lineWidth = 0.007; ctx.beginPath(); ctx.moveTo(0.022, -0.075); ctx.lineTo(0.04, -0.06); ctx.moveTo(0.026, -0.11); ctx.lineTo(0.045, -0.1); ctx.stroke();
  // wrist opening and strap at the lower back, where the hand goes in
  ctx.fillStyle = DARK; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.01;
  ctx.beginPath(); ctx.roundRect(-0.19, -0.16, 0.1, 0.05, 0.015); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d9412b'; ctx.fillRect(-0.165, -0.145, 0.03, 0.02);
  ctx.fillStyle = HOLE; ctx.beginPath(); ctx.ellipse(-0.13, -0.12, 0.03, 0.02, 0.4, 0, 7); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawCatcher(){
  const c = catcher; if (!c) return;
  const sc = Math.max(1, 50/(cam.z*1.3));
  let cx = c.x, cy = c.y;
  if (c.mode === 'carried'){ cx = ball.x - 0.5*sc; cy = ball.y - 0.9*sc; }
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
  const crouch = c.mode === 'idle' || c.mode === 'idleAfter' || c.mode === 'dodge' || c.mode === 'caught';
  if (crouch) { ctx.translate(0.3, 0); ctx.rotate(c.mode === 'dodge' || c.mode === 'idleAfter' ? -Math.min(1.3, c.rot) : 0); ctx.translate(-0.3, 0); }
  else { ctx.translate(0, 0.6); ctx.rotate(c.rot); ctx.translate(0, -0.6); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const flying = !crouch, scared = c.mode === 'dodge' || c.mode === 'idleAfter';
  const PANT = '#8e95a3', PANT2 = '#a4abb8', JER = '#26345a', JER2 = '#1f2a44', GEAR = '#3d4d78', GEAR2 = '#2e3b60', SKIN = '#f1c39b', OUTL = '#1d1a16', SHOE = '#141414';
  const Q = (x, y) => ({x, y}), C = s => limbChain(s.map(([x1,y1,x2,y2,w,col]) => [Q(x1,y1), Q(x2,y2), w, col]));
  // legs (crouched, facing -x): pants, then shin guards with a knee cap, then shoes pointing at the pitcher
  const shin = (k, a, col) => { C([[k.x,k.y,a.x,a.y,0.16,col]]); ctx.fillStyle = col; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.022;
    ctx.beginPath(); ctx.arc(k.x, k.y, 0.085, 0, 7); ctx.fill(); ctx.stroke(); };
  const shoe = (a, d) => C([[a.x, a.y, a.x + d*0.2, a.y - 0.03, 0.1, SHOE]]);
  if (flying){ C([[0.05,0.45,0.35,0.15,0.17,PANT]]); shin(Q(0.35,0.15), Q(0.55,0.0), GEAR2); shoe(Q(0.55,0.0), 1);
               C([[-0.05,0.45,-0.2,0.05,0.17,PANT]]); shin(Q(-0.2,0.05), Q(-0.1,-0.3), GEAR); shoe(Q(-0.1,-0.3), -1); }
  else { C([[0.08,0.5,-0.18,0.42,0.18,PANT]]); shin(Q(-0.18,0.42), Q(-0.08,0.03), GEAR2); shoe(Q(-0.06,0.03), -1);
         C([[0.18,0.5,-0.05,0.4,0.18,PANT2]]); shin(Q(-0.05,0.4), Q(0.05,0.03), GEAR); shoe(Q(0.07,0.03), -1); }
  // the throwing arm, tucked behind (catchers hide the bare hand from foul tips) — or flailing up when scared
  const shB = Q(0.06, 0.9), shF = Q(-0.04, 0.9);
  const arm = (S, T, sleeve) => { const [E, Hh] = armIK(S, T, 0.27, 0.25); limbChain([[S, E, 0.1, sleeve], [E, Hh, 0.085, SKIN]]); return Hh; };
  const bh = arm(shB, scared ? Q(0.2, 1.45) : flying ? Q(-0.1, 1.35) : Q(0.24, 0.62), JER2);
  ctx.fillStyle = SKIN; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.arc(bh.x, bh.y, 0.048, 0, 7); ctx.fill(); ctx.stroke();
  // torso: jersey with the chest protector over the front
  limb(Q(0.12,0.5), Q(0.0,1.0), 0.36, JER);
  ctx.fillStyle = GEAR; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.022;
  ctx.beginPath(); ctx.moveTo(-0.15, 0.97); ctx.lineTo(-0.02, 0.99); ctx.lineTo(0.0, 0.58); ctx.quadraticCurveTo(-0.08, 0.52, -0.15, 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = GEAR2; ctx.lineWidth = 0.015; for (const y of [0.7, 0.8, 0.9]){ ctx.beginPath(); ctx.moveTo(-0.13, y); ctx.lineTo(-0.02, y + 0.01); ctx.stroke(); }
  // head, in profile toward the pitcher (-x): a hard helmet shell worn backwards (bigger than the head, ear guard, vents,
  // brim at the back), the mask as its own object strapped on in front — padded frame against the face, a cage of bars
  // standing out past the nose and under the chin, a throat guard hanging below. Only a sliver of face shows through the bars.
  ctx.save(); ctx.translate(-0.03, 1.15); ctx.rotate(scared ? 0.3 : 0);
  const SHELL = '#2c3a63', SHELL2 = '#1f2a44', CAGE = '#3a3f47', PAD = '#17191d';
  ctx.fillStyle = SKIN; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.022; ctx.beginPath(); ctx.arc(0, -0.01, 0.13, 0, 7); ctx.fill(); ctx.stroke();   // head
  // the helmet shell: covers the crown and the back, its rim cut away round the ear
  ctx.fillStyle = SHELL; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.022;
  ctx.beginPath(); ctx.moveTo(-0.1, 0.1);
  ctx.bezierCurveTo(-0.07, 0.19, 0.08, 0.2, 0.14, 0.1);
  ctx.bezierCurveTo(0.18, 0.03, 0.17, -0.06, 0.12, -0.1);
  ctx.lineTo(0.06, -0.08); ctx.quadraticCurveTo(0.0, -0.08, -0.01, -0.0);     // round the ear
  ctx.quadraticCurveTo(-0.04, 0.06, -0.1, 0.06); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = SHELL2; ctx.beginPath(); ctx.moveTo(0.12, -0.1); ctx.lineTo(0.2, -0.12); ctx.lineTo(0.2, -0.08); ctx.lineTo(0.15, -0.06); ctx.closePath(); ctx.fill(); ctx.stroke();   // brim, at the back
  ctx.strokeStyle = SHELL2; ctx.lineWidth = 0.018; ctx.beginPath(); ctx.moveTo(-0.06, 0.15); ctx.bezierCurveTo(0.0, 0.2, 0.1, 0.17, 0.15, 0.05); ctx.stroke();   // ridge
  ctx.fillStyle = SHELL2; for (const [x, y] of [[0.05, 0.12], [0.1, 0.07]]){ ctx.beginPath(); ctx.ellipse(x, y, 0.016, 0.01, -0.6, 0, 7); ctx.fill(); }      // vents
  ctx.fillStyle = SHELL2; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.016; ctx.beginPath(); ctx.arc(0.035, -0.035, 0.035, 0, 7); ctx.fill(); ctx.stroke();   // ear guard
  // the eye, glimpsed between the bars
  ctx.fillStyle = OUTL; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.014;
  if (scared){ ctx.beginPath(); ctx.moveTo(-0.06, 0.035); ctx.lineTo(-0.09, 0.02); ctx.lineTo(-0.06, 0.005); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(-0.075, 0.02, 0.016, 0, 7); ctx.fill(); }
  // straps round the back of the helmet
  ctx.strokeStyle = PAD; ctx.lineWidth = 0.016;
  ctx.beginPath(); ctx.moveTo(-0.09, 0.11); ctx.quadraticCurveTo(0.04, 0.15, 0.15, 0.08); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.1, -0.1); ctx.quadraticCurveTo(0.02, -0.12, 0.08, -0.08); ctx.stroke();
  // the mask: padding against the face, then the cage standing out in front
  ctx.strokeStyle = PAD; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(-0.09, 0.13); ctx.quadraticCurveTo(-0.13, 0.0, -0.1, -0.15); ctx.stroke();
  ctx.strokeStyle = OUTL; ctx.lineWidth = 0.042; ctx.beginPath(); ctx.moveTo(-0.1, 0.14); ctx.bezierCurveTo(-0.2, 0.13, -0.24, 0.0, -0.21, -0.1); ctx.quadraticCurveTo(-0.18, -0.19, -0.09, -0.18); ctx.stroke();
  ctx.strokeStyle = CAGE; ctx.lineWidth = 0.026; ctx.beginPath(); ctx.moveTo(-0.1, 0.14); ctx.bezierCurveTo(-0.2, 0.13, -0.24, 0.0, -0.21, -0.1); ctx.quadraticCurveTo(-0.18, -0.19, -0.09, -0.18); ctx.stroke();
  ctx.strokeStyle = CAGE; ctx.lineWidth = 0.016;
  for (const [y, x0] of [[0.07, -0.205], [0.0, -0.222], [-0.07, -0.222], [-0.13, -0.195]]){ ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(-0.105, y + 0.005); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-0.16, 0.12); ctx.quadraticCurveTo(-0.17, 0.0, -0.15, -0.17); ctx.stroke();
  ctx.fillStyle = CAGE; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.014;                                   // throat guard
  ctx.beginPath(); ctx.moveTo(-0.15, -0.17); ctx.lineTo(-0.1, -0.27); ctx.lineTo(-0.06, -0.25); ctx.lineTo(-0.09, -0.17); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  // the mitt arm: same mitt spot as before (mittPos() puts the ball there)
  const mx = flying ? 0.45 : -0.4, my = flying ? 1.4 : 0.75;
  const mtilt = flying ? 0.6 : 0.1;
  arm(shF, catcherMittHand(mx, my, mtilt), JER);
  drawCatcherMitt(mx, my, mtilt);
  if (scared){   // "!!" pops up over his head wherever the fall has taken it (upright, not tipped over with him)
    const a = -Math.min(1.3, c.rot), hx = -0.33, hy = 1.15, px = 0.3 + hx*Math.cos(a) - hy*Math.sin(a), py = hx*Math.sin(a) + hy*Math.cos(a);
    ctx.restore(); ctx.save(); ctx.fillStyle = '#d9412b'; ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = 0.05*sc; ctx.lineJoin = 'round';
    ctx.font = `900 ${0.4*sc}px "CFK Sans"`; ctx.textAlign = 'center'; ctx.translate(cx + px*sc, cy + (py + 0.42)*sc); ctx.scale(1, -1); ctx.strokeText('!!', 0, 0); ctx.fillText('!!', 0, 0); }
  ctx.restore();
}


// ---------- backdrop ----------
// Painted once into offscreen tiles (thousands of crowd dots would be too many per frame), then scrolled.
const BD = {key: '', stad: null, town: null, TW: 1200, BH: 340};
function bdTile(paint){
  const c = document.createElement('canvas'); c.width = BD.TW*DPR; c.height = BD.BH*DPR;
  const g = c.getContext('2d'); g.scale(DPR, DPR); paint(g, BD.TW, BD.BH); return c;
}
// ---------- ballpark mock: grandstand tile, the field seen at a slant, bleachers in cross-section ----------
// Flat colours only (no shading); depth comes from layering and distance haze.
const CROWD_MIX = ['#d9412b','#f4f1ea','#1f2a44','#f2b632','#3d7ab8','#e7837a','#2f6b3a','#ffffff','#7a4a2a'];
function crowdRows(g, x0, x1, yTop, yBot, gapTop, gapBot, sc, seed){
  // rows get closer together toward the top (farther away); sections every 150px: mixed / home red / nearly empty / mixed
  let y = yBot, row = 0;
  while (y > yTop){
    const gap = gapBot + (gapTop - gapBot)*(yBot - y)/(yBot - yTop), s = sc*(0.75 + 0.25*(y - yTop)/(yBot - yTop));
    for (let x = x0 + (row % 2)*2.3*s; x < x1; x += 4.8*s){
      const sec = Math.floor((x + seed*37)/150) % 4, inAisle = ((x + seed*37) % 150) < 9;
      if (inAisle) continue;
      const h = hash(x*3.7 + row*11.3 + seed), empty = sec === 2 ? h < 0.9 : h < 0.12;
      if (empty){ g.fillStyle = '#4f87b4'; g.beginPath(); g.roundRect(x - 1.6*s, y - 2.2*s, 3.2*s, 2.6*s, 0.8*s); g.fill(); continue; }
      const c = sec === 1 ? (h < 0.75 ? '#d9412b' : '#f4f1ea') : CROWD_MIX[Math.floor(hash(x*1.9 + row*5.3 + seed)*CROWD_MIX.length)];
      g.fillStyle = c; g.beginPath(); g.ellipse(x, y - 1.2*s, 2.1*s, 1.9*s, 0, Math.PI, 0); g.fill();       // shoulders
      g.fillStyle = ['#f1c39b', '#d9a679', '#7a4a2a', '#f1c39b'][Math.floor(h*4)]; g.beginPath(); g.arc(x, y - 4*s, 1.35*s, 0, 7); g.fill();   // head
      if (hash(x + row*7 + seed) < 0.12){ g.fillStyle = ['#1f2a44', '#d9412b', '#f2b632'][Math.floor(h*3)]; g.beginPath(); g.arc(x, y - 4.6*s, 1.4*s, Math.PI, 0); g.fill(); }   // caps
      if (sec === 1 && hash(x*5 + row) < 0.06){ g.strokeStyle = '#f4f1ea'; g.lineWidth = 0.8*s; g.beginPath(); g.moveTo(x + 1.5*s, y - 3*s); g.lineTo(x + 2.5*s, y - 8*s); g.stroke();   // a waved towel
        g.fillStyle = '#d9412b'; g.fillRect(x + 2.5*s, y - 10*s, 4*s, 3*s); }
    }
    y -= gap; row++;
  }
}
function paintStadium(g, TW, BH){
  const wallTop = BH - 30, lowTop = BH - 132, concBot = lowTop, concTop = BH - 146, ribTop = BH - 160, upTop = BH - 246, roofBot = upTop - 2, roofTop = upTop - 16;
  // roof: a long cantilever, its underside a truss, light banks standing on the edge
  g.fillStyle = '#4f5b67'; g.fillRect(0, roofTop, TW, roofBot - roofTop);
  g.strokeStyle = '#6d7a86'; g.lineWidth = 1.2; g.beginPath(); for (let x = 0, s = 0; x <= TW; x += 12, s ^= 1) g.lineTo(x, s ? roofTop + 2 : roofBot - 1); g.stroke();
  g.fillStyle = '#3e4853'; g.fillRect(0, roofTop - 3, TW, 3);
  for (const lx of [150, 450, 750, 1050]){
    g.strokeStyle = '#56616b'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx - 14, roofTop - 3); g.lineTo(lx - 6, roofTop - 22); g.moveTo(lx + 14, roofTop - 3); g.lineTo(lx + 6, roofTop - 22); g.stroke();
    g.fillStyle = '#3e4853'; g.fillRect(lx - 30, roofTop - 46, 60, 26);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++){ g.fillStyle = '#fffbe0'; g.beginPath(); g.arc(lx - 25 + i*10, roofTop - 41 + j*8, 3.2, 0, 7); g.fill(); }
  }
  // upper deck
  g.fillStyle = '#8a98a5'; g.fillRect(0, upTop, TW, ribTop - upTop);
  crowdRows(g, 0, TW, upTop + 6, ribTop - 2, 4.6, 6, 0.78, 1);
  // fascia: an LED ribbon board running the length of the upper deck
  g.fillStyle = '#16191d'; g.fillRect(0, ribTop, TW, 14);
  g.fillStyle = '#ffb21a'; g.font = '700 10px "CFK Sans", sans-serif'; g.textAlign = 'left';
  const rib = 'SBC 삐걱방송   ·   오늘 관중 1,204명 (추정)   ·   9회 전 퇴근 금지   ·   치킨은 반반   ·   ';
  for (let x = 4; x < TW; x += g.measureText(rib).width) g.fillText(rib, x, ribTop + 10.5);
  // concourse between the decks: dark, with the backs of people walking about, and a rail
  g.fillStyle = '#2f3640'; g.fillRect(0, concTop, TW, concBot - concTop);
  for (let x = 6; x < TW; x += 23){ if (hash(x*2.3) < 0.45){ g.fillStyle = CROWD_MIX[Math.floor(hash(x)*CROWD_MIX.length)]; g.beginPath(); g.ellipse(x, concBot - 2, 2, 4, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#d9a679'; g.beginPath(); g.arc(x, concBot - 7, 1.6, 0, 7); g.fill(); } }
  g.strokeStyle = '#9aa7b2'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, concBot - 4); g.lineTo(TW, concBot - 4); g.stroke();
  for (let x = 0; x < TW; x += 16){ g.beginPath(); g.moveTo(x, concBot - 4); g.lineTo(x, concBot); g.stroke(); }
  // lower bowl
  g.fillStyle = '#7c8b98'; g.fillRect(0, lowTop, TW, wallTop - lowTop);
  for (let x = 0; x < TW; x += 150){ g.fillStyle = '#a7b3bd'; g.fillRect(x, lowTop, 9, wallTop - lowTop);                        // aisle stairs
    g.strokeStyle = '#8f9ba6'; g.lineWidth = 0.6; for (let y = lowTop + 3; y < wallTop; y += 4){ g.beginPath(); g.moveTo(x, y); g.lineTo(x + 9, y); g.stroke(); }
    g.fillStyle = '#1f2a44'; g.fillRect(x - 3, lowTop + 2, 15, 8); g.fillStyle = '#f4f1ea'; g.font = '700 6px "CFK Sans", sans-serif'; g.textAlign = 'center'; g.fillText(String(101 + x/150), x + 4.5, lowTop + 8); }
  crowdRows(g, 0, TW, lowTop + 8, wallTop - 4, 6, 9, 1.05, 2);
  // distance haze: higher and farther = paler
  const hz = g.createLinearGradient(0, roofTop - 50, 0, wallTop);
  hz.addColorStop(0, 'rgba(214,236,244,.55)'); hz.addColorStop(0.55, 'rgba(214,236,244,.32)'); hz.addColorStop(1, 'rgba(214,236,244,.12)');
  g.fillStyle = hz; g.fillRect(0, roofTop - 50, TW, wallTop - roofTop + 50);
  // field-level wall with padding and boards, and a dugout cut into it
  g.fillStyle = '#2f6b3a'; g.fillRect(0, wallTop, TW, 30);
  g.fillStyle = '#f2b632'; g.fillRect(0, wallTop, TW, 2);
  const boards = ['#7a4a2a', '#f2b632', '#3d7ab8', '#d9412b', '#f4f1ea', '#2f9e6a'];
  for (let i = 0; i < 6; i++){ const ax = 10 + i*200; if (ax > 700 && ax < 980) continue;
    g.fillStyle = '#1d1f22'; g.fillRect(ax - 2, wallTop + 6, 176, 18); g.fillStyle = boards[i]; g.fillRect(ax, wallTop + 8, 172, 14); }
  { const dx = 760, dw = 200;                                                                  // dugout: roof slab, dark inside, rail, players watching (one asleep)
    g.fillStyle = '#1b1e22'; g.fillRect(dx, wallTop + 4, dw, 26);
    const heads = [[dx + 30, '#1f2a44'], [dx + 62, '#1f2a44'], [dx + 95, '#1f2a44'], [dx + 128, '#1f2a44'], [dx + 165, '#1f2a44']];
    for (const [hx, cap] of heads){ g.fillStyle = '#f4f1ea'; g.beginPath(); g.ellipse(hx, wallTop + 30, 6, 7, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#f1c39b'; g.beginPath(); g.arc(hx, wallTop + 18, 3.6, 0, 7); g.fill(); g.fillStyle = cap; g.beginPath(); g.arc(hx, wallTop + 17, 3.8, Math.PI, 0); g.fill(); g.fillRect(hx, wallTop + 16, 5, 1.6); }
    g.fillStyle = '#f4f1ea'; g.font = '700 7px "CFK Sans", sans-serif'; g.textAlign = 'left'; g.fillText('z z Z', dx + 134, wallTop + 11);
    g.strokeStyle = '#c9cdd2'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(dx + 2, wallTop + 22); g.lineTo(dx + dw - 2, wallTop + 22); g.stroke();
    g.fillStyle = '#2f6b3a'; g.beginPath(); g.roundRect(dx - 6, wallTop - 1, dw + 12, 7, 3); g.fill();
    g.fillStyle = '#f2b632'; g.font = '900 6px "CFK Sans", sans-serif'; g.textAlign = 'center'; g.fillText('삐 걱  이 글 스', dx + dw/2, wallTop + 4.6); }
}

// the field seen at a slant: everything below the ground line is drawn in screen space,
// with metres toward the viewer squeezed into the band under the ground line
function drawFieldBand(){
  const G = gy() + shY, Hb = H - G; if (Hb < 6) return;
  const X = xg => W2S(xg, 0)[0], Y = lat => G + Hb*(lat/(lat + 9)), Pt = (xg, lat) => [X(xg), Y(lat)];
  const xl = Math.max(-5, X(BWALL)), xr = Math.min(W + 5, X(WALL)); if (xr <= xl) return;
  screenT();   // (no clip: everything below is already kept between the two walls, and clipping a full-screen band is slow)
  // mowing bands, wider toward the viewer
  for (let k = 0, l0 = 0; l0 < 400; k++){ const l1 = l0 + 3 + k*k*0.6; if (k % 2){ ctx.fillStyle = '#65a547'; ctx.fillRect(xl, Y(l0), xr - xl, Y(l1) - Y(l0)); } l0 = l1; }
  const poly = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
  const circ = (xg, lat, r, col, n = 28) => poly(Array.from({length: n}, (_, i) => { const a = i/n*Math.PI*2; return Pt(xg + Math.cos(a)*r, Math.max(0, lat + Math.sin(a)*r)); }), col);
  const DIRT = '#c99a63', FIRST = [-0.96, 19.4], ARC = 29, CXg = CX;
  // infield dirt: from 1st base out along the arc to behind 2nd base
  const arc = []; for (let a = 108; a <= 180; a += 4){ const r = a*Math.PI/180; arc.push(Pt(Math.cos(r)*ARC, Math.sin(r)*ARC)); }
  poly([Pt(...FIRST), Pt(-9.1, 27.5), ...arc, Pt(-20.4, 0)], DIRT);
  // base paths, the mound, home plate circle, the cut-out around 1st base
  ctx.strokeStyle = DIRT; ctx.lineWidth = Math.max(2, Y(19.4) - Y(18.4)); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(...Pt(CXg, 0)); ctx.lineTo(...Pt(...FIRST)); ctx.stroke();
  // the mound and the home-plate circle are drawn a little deeper than true perspective so they read as dirt patches up close
  const oval = (xg, r, k, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(X(xg), G, Math.abs(X(xg + r) - X(xg)), Math.max(6, Y(r*k) - G), 0, 0, Math.PI); ctx.fill(); };
  oval(0, 2.74, 3.4, DIRT); oval(CXg, 4.0, 2.6, DIRT); circ(FIRST[0], FIRST[1], 2.7, DIRT);
  ctx.strokeStyle = '#b8884f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(X(0), G, Math.abs(X(2.74) - X(0)), Math.max(6, Y(2.74*3.4) - G), 0, 0, Math.PI); ctx.stroke();   // mound rim
  oval(0, 1.0, 2.2, '#d4ab78');                                                                   // the raised crown around the rubber
  // chalk: the 1st-base foul line running at the viewer, the batter's box, the bag
  ctx.strokeStyle = '#f4f1ea'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(...Pt(CXg, 0)); ctx.lineTo(...Pt(Math.max(BWALL + 5, CXg - 140), CXg - Math.max(BWALL + 5, CXg - 140))); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); const bx = [CXg - 0.6, CXg + 1.2], blat = [0.9, 2.1]; ctx.moveTo(...Pt(bx[0], blat[0])); ctx.lineTo(...Pt(bx[1], blat[0])); ctx.lineTo(...Pt(bx[1], blat[1])); ctx.lineTo(...Pt(bx[0], blat[1])); ctx.closePath(); ctx.stroke();
  poly([Pt(FIRST[0] - 0.4, FIRST[1]), Pt(FIRST[0], FIRST[1] - 0.4), Pt(FIRST[0] + 0.4, FIRST[1]), Pt(FIRST[0], FIRST[1] + 0.4)], '#ffffff');
  // warning tracks in front of both walls
  ctx.fillStyle = DIRT; ctx.fillRect(X(WALL - 4.5), G, X(WALL) - X(WALL - 4.5), Hb); ctx.fillRect(X(BWALL), G, X(BWALL + 4.5) - X(BWALL), Hb);
  ctx.lineCap = 'butt'; worldT();
}


// bleachers, drawn on the landing slope the physics uses (surf(): 3.2m at the wall, rising 0.62m per metre), so a ball
// or a catcher that comes down in the stands lands on the seats you see. One deck with a cross-aisle; the seats are a band
// along the slope with the concrete frame (two levels of exit arches) underneath, a press box and roof on top.
// dir = +1 past the 122m wall, -1 behind the pitcher.
function drawStands(x0, x1, dir, vl, vr){
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1); if (hi < vl || lo > vr) return;
  const X = d => x0 + dir*d, span = Math.abs(x1 - x0), detail = cam.z > 3.2, fine = cam.z > 6;
  const slope = d => STAND_WALL_TOP + (d - 1)*STAND_RISE,   // = surf(), so things land on the seats you see
        D0 = 1.4, DD = 0.85, TOPD = span - 3.2, BAND = 7, AISLE_ROW = 19;
  const rows = []; for (let d = D0; d < TOPD; d += DD) rows.push(d);
  const rect = (da, db, ya, yb, col) => { ctx.fillStyle = col; ctx.fillRect(Math.min(X(da), X(db)), ya, Math.abs(X(db) - X(da)), yb - ya); };
  const line = (pts, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach(([d, y], i) => i ? ctx.lineTo(X(d), y) : ctx.moveTo(X(d), y)); ctx.stroke(); };
  const top = slope(TOPD);
  // concrete frame: the stepped profile down to the ground, the press box and back wall at the top
  ctx.fillStyle = '#6b7484'; ctx.beginPath(); ctx.moveTo(X(1), 0); ctx.lineTo(X(1), STAND_WALL_TOP);
  for (const d of rows){ ctx.lineTo(X(d), slope(d)); ctx.lineTo(X(d + DD), slope(d)); }
  ctx.lineTo(X(TOPD), top); ctx.lineTo(X(span), top); ctx.lineTo(X(span), 0); ctx.closePath(); ctx.fill();
  // under the seats: the stand's insides, floor by floor — shops and gates at ground level, a concourse above,
  // offices higher up; a floor only appears where the slope leaves room for it (more floors toward the back)
  const underTop = d => slope(d - BAND) - 0.3, BAY = 3.6, FL = 3.8, firstBay = 9;
  const txt = (s, d, y, size, col, bold = 900) => { if (cam.z < 10) return; ctx.save();   /* signs are unreadable (and costly) from far off */  ctx.translate(X(d), y); ctx.scale(1, -1); ctx.font = `${bold} ${size}px "CFK Sans", sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.fillText(s, 0, 0); ctx.restore(); };
  const shops = [['치킨', '#d9412b'], ['맥주', '#f2b632'], ['매표소', '#3d7ab8'], ['핫도그', '#e98ab0'], ['기념품', '#2f9e6a'], ['GATE 3', '#1f2a44'], ['떡볶이', '#d9412b'], ['화장실', '#5aaed6'], ['번데기', '#7a4a2a']];
  for (let lvl = 0, y0 = 0; lvl < 4; lvl++, y0 += FL){
    for (let b = 0, d = firstBay; d + BAY < span - 0.8; b++, d += BAY){
      if (underTop(d) < y0 + FL - 0.2) continue;                                                   // no headroom here
      const k = hash(b*7.3 + lvl*31 + Math.abs(x0)), mid = d + BAY/2;
      rect(d + 0.25, d + BAY - 0.25, y0 + 0.3, y0 + FL - 0.5, '#2c323b');                         // the bay's dark inside
      if (cam.z < 10){ rect(d + 0.5, d + BAY - 0.5, y0 + 1.0, y0 + 2.5, lvl === 0 ? '#ffe7a8' : hash(b*9 + lvl) < 0.6 ? '#d9c79a' : '#4a5566'); rect(d, d + BAY, y0 + FL - 0.45, y0 + FL - 0.2, '#8a96a3'); continue; }   // from far off: just the lights
      if (lvl === 0){                                                                              // ground floor: shop fronts and a gate
        const [name, col] = shops[(b + (dir < 0 ? 4 : 0)) % shops.length];
        if (name.startsWith('GATE')){ for (let t = 0; t < 3; t++) rect(d + 0.8 + t*0.8, d + 1.0 + t*0.8, y0 + 0.3, y0 + 1.2, '#9aa7b2'); }
        else { rect(d + 0.4, d + BAY - 0.4, y0 + 1.1, y0 + 2.6, '#ffe7a8'); rect(d + 0.4, d + BAY - 0.4, y0 + 0.3, y0 + 1.1, '#8a6a48'); }   // lit shop, counter
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(X(d + 0.25), y0 + 2.9);                    // scalloped awning
        for (let s = 0; s <= 6; s++){ const ax = d + 0.25 + s*(BAY - 0.5)/6; ctx.quadraticCurveTo(X(ax - (BAY - 0.5)/12), y0 + 2.55, X(ax), y0 + 2.9); }
        ctx.lineTo(X(d + BAY - 0.25), y0 + 3.3); ctx.lineTo(X(d + 0.25), y0 + 3.3); ctx.fill();
        if (detail) txt(name, mid, y0 + 2.95, 0.42, '#fff');
        if (fine && !name.startsWith('GATE') && name !== '화장실') for (let q = 0; q < 2 + Math.floor(k*3); q++){   // a queue
          const qx = X(d + BAY - 0.7 - q*0.55), c = CROWD_MIX[Math.floor(hash(b + q*3 + lvl)*CROWD_MIX.length)];
          ctx.strokeStyle = c; ctx.lineWidth = 0.34; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(qx, y0 + 0.4); ctx.lineTo(qx, y0 + 1.3); ctx.stroke();
          ctx.fillStyle = '#d9a679'; ctx.beginPath(); ctx.arc(qx, y0 + 1.55, 0.17, 0, 7); ctx.fill(); }
      } else if (lvl === 1){                                                                       // concourse: people walking, the odd team banner
        if (fine) for (let q = 0; q < 3; q++){ if (hash(b*5 + q) < 0.35) continue; const qx = X(d + 0.6 + q*1.1), c = CROWD_MIX[Math.floor(hash(b*3 + q)*CROWD_MIX.length)];
          ctx.strokeStyle = c; ctx.lineWidth = 0.34; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(qx, y0 + 0.4); ctx.lineTo(qx, y0 + 1.3); ctx.stroke();
          ctx.fillStyle = '#d9a679'; ctx.beginPath(); ctx.arc(qx, y0 + 1.55, 0.17, 0, 7); ctx.fill(); }
        if (k < 0.45){ rect(mid - 0.7, mid + 0.7, y0 + 1.7, y0 + FL - 0.5, b % 2 ? '#d9412b' : '#1f2a44');   // hanging banner
          if (detail) txt(b % 2 ? '삐걱' : 'SBC', mid, y0 + 2.6, 0.38, '#f4f1ea'); }
        if (k > 0.8){ rect(d + 0.5, d + 1.4, y0 + 1.4, y0 + 2.4, '#16191d'); rect(d + 0.6, d + 1.3, y0 + 1.5, y0 + 2.3, '#3d7ab8'); }   // a TV showing the game
      } else {                                                                                     // offices and boxes: lit windows
        for (let w = 0; w < 3; w++){ const wd = d + 0.45 + w*1.05; rect(wd, wd + 0.85, y0 + 1.0, y0 + 2.6, hash(b*9 + w + lvl*5) < 0.6 ? '#ffe7a8' : '#4a5566'); }
        if (detail && lvl === 2 && b % 3 === 1) txt('스카이박스 (창고)', mid, y0 + 3.0, 0.32, '#c9cdd2', 700);
      }
      rect(d, d + BAY, y0 + FL - 0.45, y0 + FL - 0.2, '#8a96a3');                                  // floor slab above
      if (lvl > 0){ ctx.strokeStyle = '#c9cdd2'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(X(d + 0.25), y0 + 1.1); ctx.lineTo(X(d + BAY - 0.25), y0 + 1.1); ctx.stroke(); }   // rail along the open side
    }
  }
  for (let d = firstBay; d < span - 0.6; d += BAY) rect(d - 0.2, d + 0.25, 0, Math.max(0, underTop(d + 0.1)), '#565e6c');   // columns
  { ctx.strokeStyle = '#4a515e'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(X(BAND + 1.4), slope(1.4) - 0.3); ctx.lineTo(X(TOPD), underTop(TOPD)); ctx.stroke(); }   // the raking beam under the seats
  rect(TOPD, span, top, top + 3.4, '#4a515e'); rect(TOPD + 0.4, span - 0.4, top + 1, top + 2.6, '#bcd6e6');   // press box with its window…
  if (detail){ ctx.fillStyle = '#1f2a44'; ctx.beginPath(); ctx.arc(X(TOPD + 1.4), top + 1.7, 0.25, 0, 7); ctx.fill(); ctx.fillRect(Math.min(X(TOPD + 1.15), X(TOPD + 1.65)), top + 1, 0.5, 0.6);   // …and somebody in it
    ctx.save(); ctx.translate(X((TOPD + span)/2), top + 2.95); ctx.scale(1, -1); ctx.fillStyle = '#ffb21a'; ctx.font = '900 0.55px "CFK Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SBC 중계석', 0, 0); ctx.restore(); }
  // the seats: every row filled for BAND metres back from its front edge, batched by colour (thousands of people otherwise)
  const paths = {}, pathOf = c => paths[c] || (paths[c] = new Path2D()), base = ['#4f87b4', '#3f7fb0'];
  for (let i = rows.length - 1; i >= 0; i--){
    if (i === AISLE_ROW) continue;
    const da = rows[i], db = Math.min(TOPD, da + BAND), y = slope(da), seed = Math.abs(x0);   // (positive: % on a negative number stays negative)
    pathOf('#3f7fb0').rect(Math.min(X(da), X(db)), y - 0.08, Math.abs(X(db) - X(da)), 0.14);      // seat backs
    if (!fine){ for (let d = da; d < db; d += 2.4){ pathOf(CROWD_MIX[Math.floor(hash(d*3.1 + i*7.7 + seed)*CROWD_MIX.length)]).rect(Math.min(X(d), X(Math.min(db, d + 2.4))), y + 0.06, Math.abs(X(Math.min(db, d + 2.4)) - X(d)), 0.42); } continue; }
    for (let d = da + 0.25; d < db - 0.2; d += 0.48){
      const k = d*7.31 + i*13.7 + seed, h = hash(k); if (((d + seed) % 7) < 0.8) continue;     // aisle
      const px = X(d), home = Math.floor((d + seed*3)/9) % 3 === 1;
      if (h < 0.1){ pathOf('#4f87b4').rect(px - 0.18, y + 0.06, 0.36, 0.3); continue; }
      const c = home ? (h < 0.8 ? '#d9412b' : '#f4f1ea') : CROWD_MIX[Math.floor(hash(k*2)*CROWD_MIX.length)];
      const sh = pathOf(c); sh.moveTo(px + 0.24, y + 0.12); sh.ellipse(px, y + 0.12, 0.24, 0.26, 0, 0, Math.PI);
      const hd = pathOf(['#f1c39b', '#d9a679', '#7a4a2a', '#f1c39b'][Math.floor(hash(k*3)*4)]); hd.moveTo(px + 0.16, y + 0.5); hd.arc(px, y + 0.5, 0.16, 0, 7);
      if (hash(k*5) < 0.15){ const cp = pathOf(['#1f2a44', '#d9412b', '#f2b632'][Math.floor(h*3)] + ' '); cp.moveTo(px + 0.17, y + 0.56); cp.arc(px, y + 0.56, 0.17, 0, Math.PI); }
      if (home && hash(k*7) < 0.08){ pathOf('#f4f1ea  ').rect(px + 0.12, y + 0.4, 0.06, 0.65); pathOf('#d9412b  ').rect(px + 0.25, y + 0.85, 0.4, 0.25); }
    }
  }
  for (const k of Object.keys(paths).sort((p, q) => (base.includes(q) - base.includes(p)) || (p.length - q.length))){ ctx.fillStyle = k.trim(); ctx.fill(paths[k]); }
  // cross-aisle: a railed walkway half way up, an LED ribbon on the riser behind it
  { const da = rows[AISLE_ROW], y = slope(da); rect(da, da + DD, y - 0.1, y + 0.05, '#9aa7b2');
    line([[da - 0.1, y + 0.95], [da + DD, y + 0.95]], '#c9cdd2', 0.06);
    rect(da + DD - 0.05, da + DD + 0.05, y, slope(da + DD), '#16191d'); rect(da + DD, Math.min(TOPD, da + BAND), slope(da + DD) - 0.62, slope(da + DD) - 0.08, '#16191d');
    rect(da + DD + 0.2, Math.min(TOPD, da + BAND) - 0.2, slope(da + DD) - 0.5, slope(da + DD) - 0.22, '#ffb21a'); }
  // aisle stairs with a handrail, a rail along the top of the seats
  for (let d = (7 - x0 % 7 + 7) % 7; d < TOPD; d += 7){
    if (d < D0) continue; const y0 = Math.max(3.0, slope(d - BAND) - 0.2), y1 = slope(d) + 0.55;
    rect(d, d + 0.8, y0, y1, '#a7b3bd');
    if (cam.z > 10){ for (let y = y0 + 0.27; y < y1; y += 0.27) line([[d, y], [d + 0.8, y]], '#8f9ba6', 0.04); line([[d + 0.4, y0 + 0.9], [d + 0.4, y1 + 0.6]], '#d4dae0', 0.05); }
  }
  line(rows.map(d => [d, slope(d) + 1.0]).concat([[TOPD, top + 1.0]]), 'rgba(201,205,210,.7)', 0.05);
  line([[1.1, 3.2], [1.1, 4.1]], '#c9cdd2', 0.06);
  // roof: cantilevered from the back over the top third of the seats, truss underneath, light bank on top
  const R0 = top + 4.6, rf = TOPD - 12;
  ctx.fillStyle = '#4f5b67'; ctx.beginPath(); ctx.moveTo(X(span), R0 + 1.4); ctx.lineTo(X(rf), R0); ctx.lineTo(X(rf), R0 + 1); ctx.lineTo(X(span), R0 + 2.8); ctx.fill();
  line(Array.from({length: Math.ceil((span - rf)/1.2) + 1}, (_, k) => { const d = Math.min(span, rf + k*1.2); return [d, k % 2 ? R0 + (d - rf)*0.07 : R0 - 0.9 + (d - rf)*0.1]; }), '#6d7a86', 0.12);
  rect(span - 0.6, span, 0, R0 + 2.8, '#3e4652');
  { const lx = X(span - 6), lb = R0 + 3.8; ctx.fillStyle = '#3e4853'; ctx.fillRect(lx - 3, lb, 6, 2.6); line([[span - 7.2, lb - 1.4], [span - 6.6, lb]], '#56616b', 0.2); line([[span - 4.8, lb - 1.4], [span - 5.4, lb]], '#56616b', 0.2);
    if (detail) for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++){ ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(lx - 2.4 + i*1.2, lb + 0.6 + j*1.2, 0.4, 0, 7); ctx.fill(); } }
  if (dir < 0){ const sb = R0 + 3.9; ctx.fillStyle = '#3e4652'; ctx.fillRect(-146, R0 + 1.9, 0.6, 3); ctx.fillRect(-136.6, R0 + 1.9, 0.6, 3);   // scoreboard frame behind the pitcher (its words: SCOREBOARD_Y)
    ctx.fillStyle = '#1d1a16'; ctx.fillRect(-151, sb, 20, 8.5); ctx.fillStyle = '#2b2b2b'; ctx.fillRect(-150.4, sb + 0.6, 18.8, 7.3); ctx.fillStyle = '#f2b632'; ctx.fillRect(-151, sb + 8.5, 20, 0.35); }
  // the wall (padded, yellow home-run line) and the foul pole with its mesh fin
  rect(0, 1, 0, 3.2, '#2f6b3a'); rect(0, 1, 3.0, 3.2, '#f2b632');
  { const px = X(0.5), ph = R0 + 6; ctx.fillStyle = '#f2b632'; ctx.fillRect(px - 0.15, 0, 0.3, ph);
    ctx.strokeStyle = 'rgba(242,182,50,.7)'; ctx.lineWidth = 0.05; for (let y = 8; y <= ph - 1; y += 1.5){ ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px - dir*0.9, y); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(px - dir*0.9, 8); ctx.lineTo(px - dir*0.9, ph - 1); ctx.stroke(); }
}

function drawBackdrop(space){
  const key = W + 'x' + H + '@' + DPR + (document.fonts && document.fonts.status);
  if (BD.key !== key){ BD.key = key; BD.stad = bdTile(paintStadium); BD.town = bdTile(paintTown); }
  // the grandstand only spans the ballpark itself (back stands -142m … outfield stands 160m); the town is outside
  const yb = gy() - BD.BH + 2;
  const sl = Math.max(-10, Math.min(W + 10, W2S(-142, 0)[0])), sr = Math.max(-10, Math.min(W + 10, W2S(160, 0)[0]));
  const layer = (img, par, x0, x1) => {
    if (x1 <= x0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, H); ctx.clip();
    const off = ((cam.x*cam.z*par) % BD.TW + BD.TW) % BD.TW;
    for (let x = -off; x < W; x += BD.TW) if (x + BD.TW > x0 && x < x1) ctx.drawImage(img, x, yb, BD.TW, BD.BH);
    ctx.restore();
  };
  layer(BD.stad, 0.03, sl, sr);
  layer(BD.town, 0.02, -10, sl);
  layer(BD.town, 0.02, sr, W + 10);
  if (space > 0){ const gr = ctx.createLinearGradient(0, yb - 120, 0, yb + 30);   // fade in from the sky, no hard line
    gr.addColorStop(0, 'rgba(11,16,48,0)'); gr.addColorStop(1, `rgba(11,16,48,${space*0.85})`);
    ctx.fillStyle = gr; ctx.fillRect(0, yb - 120, W, 150); ctx.fillStyle = `rgba(11,16,48,${space*0.85})`; ctx.fillRect(0, yb + 30, W, BD.BH - 30); }
}

// virtual ads: composited on the grass. Anchored to a spot on the field, sized like a broadcast graphic.
let vlabelOn = null, screenAdShown = false;
function drawVAds(){
  const t = performance.now()/1000;
  let shown = false;
  screenT();
  if (readyAd){
    const c = adCanvas(readyAd);
    const w = Math.min(W*0.34, 470, 2.5*cam.z)*700/600, h = w*280/700;
    const [sx, sy] = W2S(1.75, 0);
    if (c && w >= 60 && sx < W && sx + w > 0){
      if (readyAdState.t0 == null) readyAdState.t0 = t + readyAdState.delay;   // waits for the player and the caster first
      const a = adAlpha(t - readyAdState.t0);
      if (a > 0){ ctx.globalAlpha = a; ctx.drawImage(c, sx, sy - h*266/280, w, h); ctx.globalAlpha = 1; shown = true; }
    }
  }
  worldT();
  shown = shown || screenAdShown;
  if (shown !== vlabelOn){ vlabelOn = shown; $('vlabel').style.display = shown ? '' : 'none'; }
}
// pop-up virtual ads during a flight: on the picture, not on the ground
function drawScreenAds(){
  if (!screenAds || state === 'result'){ if (screenAds && state === 'result') screenAds = null; return false; }
  const t = performance.now()/1000, cyc = 0.8 + 3.6 + 0.8 + 0.5, age = t - screenAds.t0;
  if (age < 0) return false;
  const i = Math.floor(age/cyc);
  if (i >= screenAds.list.length){ screenAds = null; return false; }   // the whole list plays once, then it's over
  const ad = screenAds.list[i], k = age - i*cyc;
  const c = adCanvas(ad, false); if (!c) return false;
  const a = k < 0.8 ? k/0.8 : k < 4.4 ? 1 : Math.max(0, 1 - (k - 4.4)/0.8);
  if (a <= 0) return false;
  const w = Math.min(W*0.27, 400)*700/600, h = w*280/700;
  const pop = k < 0.8 ? 1 + 0.06*Math.sin(k/0.8*Math.PI) : 1;              // a little "boing" as it lands on the screen
  // bottom-right corner, sharing a baseline with the caster's caption on the left
  const base = H - (document.body.classList.contains('bar2') ? 58 : document.body.classList.contains('bar1') ? 46 : 22);
  const x = W - w - 6, y = base - h*0.93 + (1 - Math.min(1, k/0.8))*18;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x + w/2, y + h/2); ctx.scale(pop, pop); ctx.rotate(-0.02);
  ctx.drawImage(c, -w/2, -h/2, w, h); ctx.restore();
  return true;
}

// little dust puffs where feet slam into the dirt (render-side only; reads positions, changes nothing)
let dust = [], footPrev = {};
function drawDust(){
  if (P) for (const k of ['ltoe', 'btoe', 'lank', 'bank']){
    const q = P[I[k]], py = footPrev[k];
    if (py !== undefined && py > 0.07 && q.y <= 0.03 && Math.abs(q.x) < 30)
      for (let i = 0; i < 8; i++) dust.push({x: q.x + (Math.random() - 0.5)*0.25, y: 0.03, vx: (Math.random() - 0.5)*1.6, vy: 0.3 + Math.random()*0.5, r: 0.07 + Math.random()*0.07, life: 1});
    footPrev[k] = q.y;
  }
  for (const d of dust){
    d.x += d.vx/60; d.y += d.vy/60; d.vx *= 0.94; d.vy *= 0.92; d.r += 0.004; d.life -= 1/40;
    if (d.life > 0){ ctx.fillStyle = `rgba(196,150,96,${d.life*0.85})`; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill(); }
  }
  dust = dust.filter(d => d.life > 0);
}


// which joint each key moves: shown in 투구 교실, and in the game when '관절 표시' is on
function drawJointTags(){
  if (!(jointTags || (tut && (tut.phase === 'learn' || tut.slow))) || !ball || !ball.held || !(state === 'windup' || state === 'ready')) return;
  const by = {};
  const add = (j, t) => { (by[j] = by[j] || []).push(t); };
  if (down.KeyK && down.KeyL) add(I.rhand, 'K·L · 공 쥐기'); else for (const k of ['KeyK','KeyL']) if (down[k]) add(I.rhand, JOINT_KEYS[k][1]);
  for (const k of ['KeyQ','KeyA','KeyW','KeyS','KeyE','KeyD','KeyU','KeyJ']) if (down[k]) add(JOINT_KEYS[k][0], JOINT_KEYS[k][1]);
  const goal = tut && tut.phase === 'learn' ? TUT_STEPS[tut.step].j : null;
  if (goal != null && !by[goal]) by[goal] = [];
  ctx.save(); screenT(); const t = performance.now()/1000;
  const side = {[I.lknee]: [1, 0.3], [I.bknee]: [-1, 0.3], [I.neck]: [1, -0.9], [I.relb]: [-1, -0.9], [I.rhand]: [-1, 0.6]};
  for (const j in by){
    const p = P[j], [sx, sy] = W2S(p.x, p.y), isGoal = +j === goal, r = Math.max(16, Math.min(30, cam.z*0.16));
    ctx.strokeStyle = isGoal ? '#ffd21a' : 'rgba(255,210,26,.85)'; ctx.lineWidth = isGoal ? 4 : 3;
    ctx.setLineDash([9, 6]); ctx.lineDashOffset = -t*30; ctx.beginPath(); ctx.arc(sx, sy, r + (isGoal ? 3*Math.sin(t*5) : 0), 0, 7); ctx.stroke(); ctx.setLineDash([]);
    const labs = by[j].length ? by[j] : [];
    if (!labs.length) continue;
    const [dx, dy] = side[j] || [1, 0], txt = labs.join('  /  ');
    ctx.font = '700 14px "CFK Sans", sans-serif'; const w = ctx.measureText(txt).width + 20;
    let lx = dx > 0 ? sx + r + 10 : sx - r - 10 - w; const ly = sy + dy*r - 14;
    lx = Math.max(8, Math.min(W - w - 8, lx));
    ctx.fillStyle = 'rgba(15,22,48,.9)'; ctx.fillRect(lx, ly, w, 28);
    ctx.fillStyle = '#ffd21a'; ctx.textAlign = 'left'; ctx.fillText(txt, lx + 10, ly + 19);
  }
  ctx.restore();
}

// ---------- the neighbourhood beyond the walls: a 동네, not a bar chart ----------
const twave = (x, TW, n, a, ph = 0) => Math.cos((x/TW*n + ph)*Math.PI*2)*a;
function paintTown(g, TW, BH){
  // far ridge and a nearer hill (the 뒷산), then a far row of apartment blocks, then the street in front
  g.fillStyle = '#c3d3d8'; g.beginPath(); g.moveTo(0, BH); for (let x = 0; x <= TW; x += 10) g.lineTo(x, BH - 205 + twave(x, TW, 2, 26) + twave(x, TW, 7, 7, 0.3)); g.lineTo(TW, BH); g.fill();
  g.fillStyle = '#b2c7c9'; g.beginPath(); g.moveTo(0, BH); for (let x = 0; x <= TW; x += 10) g.lineTo(x, BH - 150 + twave(x, TW, 3, 20, 0.5) + twave(x, TW, 11, 5)); g.lineTo(TW, BH); g.fill();
  for (let x = 6; x < TW; x += 9){ const top = BH - 150 + twave(x, TW, 3, 20, 0.5) + twave(x, TW, 11, 5); g.fillStyle = 'rgba(140,170,160,.45)'; g.beginPath(); g.arc(x, top + 4, 5 + hash(x)*3, 0, 7); g.fill(); }   // trees on the ridge
  // far apartment blocks: pale, with balcony stripes and a painted block number
  for (let x = 20, i = 0; x < TW - 60; i++){
    const w = 44 + hash(i*3.1)*20, h = 95 + hash(i*5.7)*60;
    if (hash(i*9.2) < 0.75){
      g.fillStyle = '#b9c9cf'; g.fillRect(x, BH - h - 40, w, h + 40);
      g.fillStyle = 'rgba(255,255,255,.35)'; for (let y = BH - h - 34; y < BH - 40; y += 7) g.fillRect(x + 3, y, w - 6, 1.4);
      g.fillStyle = 'rgba(120,140,150,.7)'; g.font = '700 8px "CFK Sans", sans-serif'; g.textAlign = 'center'; g.fillText(`${101 + i}동`, x + w/2, BH - h - 31);
      g.fillStyle = '#a9bcc3'; g.fillRect(x + w/2 - 6, BH - h - 47, 12, 7);                          // rooftop machine room
    }
    x += w + 18 + hash(i*7.7)*40;
  }
  // the street: low shops with clutter of signboards, villas with rooftop tanks, a 목욕탕 chimney
  const signs = ['치킨', '노래방', '약국', '부동산', '반찬', '미용실', '분식', '세탁', 'PC', '당구'], sc = ['#d9412b', '#f2b632', '#2f9e6a', '#3d7ab8', '#e98ab0', '#7a4a2a'];
  for (let x = 0, i = 0; x < TW - 20; i++){
    const kind = Math.floor(hash(i*4.7)*4), w = 34 + Math.floor(hash(i*7.1)*30);
    const wall = ['#d7d0c2', '#cfc6b4', '#c9b8a2', '#dcd6ca'][i % 4];
    if (kind === 3){ g.fillStyle = '#9fb8a8'; for (let k = 0; k < 2; k++){ g.beginPath(); g.arc(x + 10 + k*14, BH - 28, 11 + hash(i + k)*4, 0, 7); g.fill(); } g.fillStyle = '#8a7a66'; g.fillRect(x + 15, BH - 20, 3, 20); x += w; continue; }
    const floors = kind === 1 ? 4 : 2 + (i % 2), h = floors*13 + 6, y = BH - h;
    g.fillStyle = wall; g.fillRect(x + 2, y, w - 4, h);
    g.fillStyle = 'rgba(70,90,110,.55)'; for (let f = 1; f < floors; f++) for (let wx = x + 6; wx < x + w - 10; wx += 9) g.fillRect(wx, BH - 6 - f*13 - 9, 5, 6);   // windows
    g.fillStyle = 'rgba(160,200,220,.8)'; g.fillRect(x + 4, BH - 12, w - 8, 10);                    // shop glass
    const sg = sc[Math.floor(hash(i*2.9)*sc.length)]; g.fillStyle = sg; g.fillRect(x + 3, BH - 19, w - 6, 6);   // signboard
    g.fillStyle = '#fff'; g.font = '700 5px "CFK Sans", sans-serif'; g.textAlign = 'center'; g.fillText(signs[i % signs.length], x + w/2, BH - 14.3);
    if (hash(i*6.1) < 0.6){ g.fillStyle = sc[(i + 2) % sc.length]; g.fillRect(x + w - 9, y + 4, 5, 20); }   // a vertical sign sticking out
    if (kind === 1){ g.fillStyle = '#c4cdd2'; g.beginPath(); g.ellipse(x + w/2, y - 4, 7, 4, 0, 0, 7); g.fill(); g.fillRect(x + w/2 - 7, y - 4, 14, 4); }   // rooftop water tank
    if (kind === 2 && i % 3 === 0){ g.fillStyle = '#b8aa98'; g.beginPath(); g.moveTo(x + w - 14, y); g.lineTo(x + w - 12, y - 62); g.lineTo(x + w - 7, y - 62); g.lineTo(x + w - 5, y); g.fill();
      g.fillStyle = '#d9412b'; g.font = '700 7px "CFK Sans", sans-serif'; g.fillText('♨', x + w - 9.5, y - 46); }
    x += w;
  }
  // utility poles with sagging, tangled wires
  const poles = [30, 270, 510, 750, 990];
  for (const p of poles){ g.strokeStyle = '#7d8f99'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(p, BH); g.lineTo(p, BH - 100); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.moveTo(p - 11, BH - 92); g.lineTo(p + 11, BH - 92); g.moveTo(p - 8, BH - 84); g.lineTo(p + 8, BH - 84); g.stroke();
    g.fillStyle = '#7d8f99'; g.fillRect(p + 3, BH - 76, 6, 8); }                                    // transformer
  g.lineWidth = 0.7; g.strokeStyle = '#6f818b';
  for (let k = 0; k < poles.length; k++){ const a = poles[k], b = k + 1 < poles.length ? poles[k + 1] : TW + poles[0];
    for (const [dy, sag] of [[-92, 18], [-90, 24], [-84, 15], [-84, 21]]){ for (const off of [-9, 9]){ g.beginPath(); g.moveTo(a + off, BH + dy); g.quadraticCurveTo((a + b)/2, BH + dy + sag, b + off, BH + dy); g.stroke(); } } }
}
// the facilities a ball can land at: same places and sizes, drawn like actual buildings
function drawFacilities(vl, vr){
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const RR = (x, y, w, h, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); };
  for (const f of FAC){
    const [x, w, h, kind, col] = f, x0 = x - w/2, x1 = x + w/2;
    if (x1 < vl || x0 > vr) continue;
    const detail = cam.z*Math.min(w, 10) > 18;
    if (kind === 'water'){
      R(x0, -1e5, w, 1e5 + 0.05, col);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.08; for (let i = 0; i < w; i += 6){ ctx.beginPath(); ctx.moveTo(x0 + i, -0.2); ctx.quadraticCurveTo(x0 + i + 1.5, -0.05, x0 + i + 3, -0.2); ctx.stroke(); }
      if (w < 100){ R(x0 - 2, 3, w + 4, 0.8, '#8b8f94'); for (let i = 0; i <= w; i += w/5) R(x0 + i - 0.4, 0, 0.8, 3, '#6d7177');
        ctx.strokeStyle = '#6d7177'; ctx.lineWidth = 0.15; for (let i = 0; i < w; i += w/5){ ctx.beginPath(); ctx.moveTo(x0 + i, 3); ctx.quadraticCurveTo(x0 + i + w/10, 1.6, x0 + i + w/5, 3); ctx.stroke(); } }   // bridge arches
      continue;
    }
    if (kind === 'cars'){
      for (let i = 0; i < w; i += 4.2){ const c = ['#d9412b','#3d7ab8','#f4f1ea','#26345a','#f2b632','#9aa3ad'][Math.floor(hash(i + x)*6)], cx = x0 + i;
        R(cx - 0.3, 0, 0.12, 0.05, '#f4f1ea');                                                       // parking line
        RR(cx + 0.1, 0.35, 3.5, 0.75, 0.25, c); RR(cx + 0.75, 1.0, 2.0, 0.65, 0.3, c);                  // body, cabin
        R(cx + 0.95, 1.12, 0.75, 0.42, '#bcd6e6'); R(cx + 1.8, 1.12, 0.75, 0.42, '#bcd6e6');            // windows
        for (const wx of [cx + 0.9, cx + 2.9]){ ctx.fillStyle = '#1d1a16'; ctx.beginPath(); ctx.arc(wx, 0.34, 0.34, 0, 7); ctx.fill(); ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.arc(wx, 0.34, 0.14, 0, 7); ctx.fill(); } }
      continue;
    }
    if (kind === 'mountain'){
      const ridge = s => { ctx.beginPath(); ctx.moveTo(x0, 0); for (let k = 0; k <= 40; k++){ const t = k/40, px = x0 + w*t, peak = Math.pow(Math.sin(Math.PI*t), 1.3);
        ctx.lineTo(px, h*s*peak*(0.85 + 0.15*Math.sin(t*37 + s*5)) ); } ctx.lineTo(x1, 0); ctx.fill(); };
      ctx.fillStyle = '#7f9a70'; ridge(1); ctx.fillStyle = col; ridge(0.7);
      ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.moveTo(x - h*0.16, h*0.86); ctx.lineTo(x, h*0.99); ctx.lineTo(x + h*0.14, h*0.84); ctx.lineTo(x + h*0.05, h*0.88); ctx.lineTo(x - h*0.05, h*0.83); ctx.fill();
      continue;
    }
    if (kind === 'ferris' || kind === 'airport' || kind === 'stadium'){ drawFacilityOld(f); continue; }
    if (kind === 'apt'){                                                                             // 아파트: towers with balconies, block numbers, rooftop machine rooms
      for (let t = 0; t < 3; t++){ const tw = w/3, bx = x0 + t*tw + 1.5, bw = tw - 3, bh = h*(0.8 + 0.2*hash(t + x));
        R(bx, 0, bw, bh, col); R(bx + bw*0.3, bh, bw*0.4, 2.2, '#b9b0a2'); R(bx - 0.3, bh - 0.4, bw + 0.6, 0.5, '#a39a8c');
        if (detail) for (let y = 2.4; y < bh - 1.5; y += 2.7){ R(bx + 0.5, y, bw - 1, 1.4, 'rgba(120,150,170,.55)'); R(bx + 0.5, y - 0.1, bw - 1, 0.45, '#f4f1ea');   // glass + balcony rail
          if (hash(y + t*7 + x) < 0.25) R(bx + 1 + hash(y*3 + t)*(bw - 3), y + 0.35, 1.2, 0.9, ['#e98ab0', '#f2b632', '#9fd0a0'][Math.floor(hash(y + t)*3)]); }   // laundry, plants
        ctx.save(); ctx.translate(bx + bw/2, bh - 2.2); ctx.scale(1, -1); ctx.fillStyle = '#8a8274'; ctx.font = '900 1.6px "CFK Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${(x < 0 ? 201 : 101) + t}동`, 0, 0); ctx.restore(); }
      continue;
    }
    if (kind === 'station'){                                                                         // 역/터미널: arched glass canopy over a low hall
      R(x0, 0, w, h*0.7, col); ctx.fillStyle = '#9fc6dd'; ctx.beginPath(); ctx.ellipse(x, h*0.7, w*0.42, h*0.5, 0, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = '#6d7177'; ctx.lineWidth = 0.15; for (let i = -4; i <= 4; i++){ ctx.beginPath(); ctx.moveTo(x, h*0.7); ctx.lineTo(x + Math.sin(i/5*1.4)*w*0.42, h*0.7 + Math.cos(i/5*1.4)*h*0.5); ctx.stroke(); }
      if (detail) for (let i = 1.5; i < w - 2; i += 3) R(x0 + i, 0, 2.2, h*0.45, 'rgba(160,200,220,.85)');
      ctx.fillStyle = '#2f6fd0'; ctx.beginPath(); ctx.arc(x, h + 2.2, 1.8, 0, 7); ctx.fill();
      continue;
    }
    // shop: a 2-3 storey 근생 building, the shop on the ground floor with an awning and its signboard
    const wall = ['#e9e1d3', '#d8d2c6', '#cfc3b0', '#e2d6c3', '#c9a58a'][Math.floor(hash(x)*5)];
    R(x0, 0, w, h, wall); R(x0 - 0.2, h - 0.4, w + 0.4, 0.5, 'rgba(0,0,0,.2)');
    R(x0 + 0.4, 0, w - 0.8, 2.3, 'rgba(150,195,220,.9)'); R(x - 0.8, 0, 1.6, 2.1, 'rgba(40,50,60,.55)');   // shop glass, door
    if (detail){ for (let i = x0 + 2.4; i < x1 - 1; i += 2.4) R(i, 0, 0.12, 2.3, '#6d7177');
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0 + 0.2, 2.9); for (let i = 0; i <= 8; i++){ const ax = x0 + 0.2 + i*(w - 0.4)/8; ctx.quadraticCurveTo(ax - (w - 0.4)/16, 2.25, ax, 2.9); } ctx.lineTo(x1 - 0.2, 3.3); ctx.lineTo(x0 + 0.2, 3.3); ctx.fill();   // scalloped awning
      for (let y = 3.6; y < h - 2.6; y += 2.5) for (let i = x0 + 1; i < x1 - 2; i += 2.6){ R(i, y, 1.8, 1.4, '#6d7177'); R(i + 0.12, y + 0.12, 1.56, 1.16, hash(i + y*3 + x) > 0.45 ? '#fff3b0' : 'rgba(120,150,170,.8)'); }
      R(x1 - 1.6, 1, 0.4, 0.15, '#6d7177'); RR(x1 - 1.4, h*0.35, 1.0, h*0.45, 0.3, col);           // vertical sign
      R(x0 + 1, h, 1.6, 0.9, '#b9b3a8'); R(x0 + 3, h, 0.12, 1.6, '#7d8f99'); }                          // AC unit, antenna
    RR(x0 + 0.4, h - 2.3, w - 0.8, 1.5, 0.3, '#fbf6ea'); R(x0 + 0.4, h - 2.3, w - 0.8, 0.25, col);       // signboard (its words come from drawFacilityLabels)
  }
}

function drawFacilityOld(f){ drawFacilitiesOrig(f[0] - f[1]/2, f[0] + f[1]/2); }
