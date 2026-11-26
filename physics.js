// PHYSICS-START
const G = 9.8, DT = 1/240, SUB = 4, ITER = 10, DAMP = 0.9985;
const I = {head:0, neck:1, pelvis:2, lknee:3, lank:4, ltoe:5, bknee:6, bank:7, btoe:8, relb:9, rhand:10, gelb:11, ghand:12};
const FEET = new Set([4,5,7,8]);
const TUNE = {
  legK: 1400, legD: 45, legT: 520,       // pressed leg muscles
  hipK: 800, hipD: 35, hipT: 380,        // relaxed hip
  kneeK: 1000, kneeD: 35, kneeT: 520,    // relaxed knee
  elbK: 70, elbD: 3, elbT: 70,
  shT: 95,                               // raw shoulder torque
  gyroW: 9.0, gyroZ: 1.0, gyroT: 520,    // "core strength" cheat
  limW: 45, comK: 14, comD: 4
};
let P = [], BONES = [], MUS = {}, body = {};

function mk(x,y,m){ return {x, y, px:x, py:y, sx:x, m}; }
function wrap(a){ while(a > Math.PI) a -= 2*Math.PI; while(a < -Math.PI) a += 2*Math.PI; return a; }
function relAng(a,b,c){ return wrap(Math.atan2(c.y-b.y, c.x-b.x) - Math.atan2(b.y-a.y, b.x-a.x)); }

function initBody(){
  P = [
    mk(0.03,1.70,5),            // head
    mk(0.00,1.46,15),           // neck / chest
    mk(0.00,0.93,15),           // pelvis
    mk(0.11,0.47,4), mk(0.12,0.0,2), mk(0.34,0.0,1),     // lead leg (knee, ankle, toe)
    mk(-0.11,0.47,4), mk(-0.13,0.0,2), mk(0.07,0.0,1),   // back / pivot leg
    mk(-0.05,1.18,2), mk(0.00,0.92,1.2),                 // throwing arm (elbow, hand)
    mk(0.05,1.18,2), mk(0.10,0.93,1.6)                   // glove arm
  ];
  const pairs = [[0,1],[1,2],[2,3],[3,4],[4,5],[3,5],[2,6],[6,7],[7,8],[6,8],[1,9],[9,10],[1,11],[11,12]];
  BONES = pairs.map(([a,b]) => ({a, b, len: Math.hypot(P[a].x-P[b].x, P[a].y-P[b].y)}));
  const adj = P.map(() => []);
  for (const [a,b] of pairs){ adj[a].push(b); adj[b].push(a); }
  function side(start, block){
    const seen = new Set([start]), q = [start];
    while (q.length){ const n = q.pop(); for (const m of adj[n]) if (m !== block && !seen.has(m)){ seen.add(m); q.push(m); } }
    return [...seen];
  }
  function mus(a,b,c){
    const C = side(c, b); const A = P.map((_,i)=>i).filter(i => i !== b && !C.includes(i));
    return {a, b, c, A, C};
  }
  MUS = {
    lhip: mus(1,2,3), lknee: mus(2,3,4),
    bhip: mus(1,2,6), bknee: mus(2,6,7),
    rsh: mus(2,1,9), relb: mus(1,9,10),
    gsh: mus(2,1,11), gelb: mus(1,11,12),
    neck: mus(2,1,0)
  };
  body = { fallen:false, t:0 };
}

function vel(p){ return [(p.x-p.px)/DT, (p.y-p.py)/DT]; }
function segOmega(p, q){ // angular velocity of vector p->q
  const rx = q.x-p.x, ry = q.y-p.y, vp = vel(p), vq = vel(q);
  return (rx*(vq[1]-vp[1]) - ry*(vq[0]-vp[0])) / (rx*rx+ry*ry+1e-9);
}
function inertia(list, b){ let s = 0; for (const i of list){ const p = P[i]; s += p.m*((p.x-b.x)**2 + (p.y-b.y)**2); } return s + 1e-4; }
function spin(list, b, dw){ // add angular velocity dw about point b
  for (const i of list){ const p = P[i]; const rx = p.x-b.x, ry = p.y-b.y; p.px += ry*dw*DT; p.py -= rx*dw*DT; }
}
function torque(m, tau){
  const b = P[m.b], Ia = inertia(m.A, b), Ic = inertia(m.C, b);
  spin(m.C, b, tau*DT/Ic); if (!pinnedBase()) spin(m.A, b, -tau*DT/Ia);
}
// 투구 교실 robot: bolted to its stand, so the stand takes every muscle's push-back (a fixed-base robot)
function pinnedBase(){ return typeof ROBOT_PIN !== 'undefined' && !!ROBOT_PIN; }
function pd(m, target, kp, kd, tmax, freqForm){
  const a = P[m.a], b = P[m.b], c = P[m.c];
  const err = wrap(target - relAng(a,b,c));
  const relw = segOmega(b,c) - segOmega(a,b);
  const Ia = inertia(m.A, b), Ic = inertia(m.C, b), Ie = Ia*Ic/(Ia+Ic);
  if (freqForm){ const w = kp; kp = Ie*w*w; kd = Ie*2*w; }
  kd = Math.min(kd, 0.6*Ie/DT);
  let tau = kp*err - kd*relw;
  if (tau > tmax) tau = tmax; else if (tau < -tmax) tau = -tmax;
  spin(m.C, b, tau*DT/Ic); if (!pinnedBase()) spin(m.A, b, -tau*DT/Ia);
}
function limit(m, lo, hi){
  const mid = (lo+hi)/2, r = mid + wrap(relAng(P[m.a], P[m.b], P[m.c]) - mid);
  if (r < lo) pd(m, lo, TUNE.limW, 0, 4000, true); else if (r > hi) pd(m, hi, TUNE.limW, 0, 4000, true);
}

// input: {lf, lb, bf, bb, shF, shB, elB, elE}
function step(inp){
  body.t += DT;
  const T = TUNE;
  const leg = (hip, knee, fwd, back) => {
    if (fwd){ pd(hip, 1.8, T.legK, T.legD, T.legT); pd(knee, -1.7, T.legK*0.6, T.legD*0.6, T.legT*0.6); }
    else if (back){ pd(hip, -0.8, T.legK, T.legD, T.legT); pd(knee, -0.05, T.legK, T.legD, T.legT); }
    else { pd(hip, 0.0, T.hipK, T.hipD, T.hipT); pd(knee, -0.1, T.kneeK, T.kneeD, T.kneeT); }
  };
  leg(MUS.lhip, MUS.lknee, inp.lf, inp.lb);
  leg(MUS.bhip, MUS.bknee, inp.bf, inp.bb);
  if (inp.shF) torque(MUS.rsh, -T.shT);
  if (inp.shB) torque(MUS.rsh,  T.shT);
  if (!inp.shF && !inp.shB){ torque(MUS.rsh, -segOmega(P[1], P[9])*0.6); }
  // holding U (bend the elbow) alone used to windmill the whole arm: the elbow's push-back piled up as spin.
  // Once U has been held for 0.4s with the shoulder not driven, the shoulder brakes that spin, so the elbow simply folds.
  // (a short U flick still swings the arm as before: that's a real technique. Only a long hold gets braked.)
  body.elbT = inp.elB ? (body.elbT || 0) + DT : 0;
  if (inp.elB && body.elbT > 0.4 && !inp.shF && !inp.shB && !pinnedBase()) spin(MUS.rsh.C, P[1], -segOmega(P[1], P[9])*0.12);
  if (pinnedBase()){   // robot shoulders hold still unless E/D drive them (a servo, not a free hinge)
    if (!inp.shF && !inp.shB) spin(MUS.rsh.C, P[1], -segOmega(P[1], P[9])*0.35);
    spin(MUS.gsh.C, P[1], -segOmega(P[1], P[11])*0.35);
  }
  if (inp.elB) pd(MUS.relb, 2.5, T.elbK, T.elbD, T.elbT);
  else if (inp.elE) pd(MUS.relb, 0.0, T.elbK, T.elbD, T.elbT);
  else pd(MUS.relb, 0.4, 3, 0.3, 8);
  pd(MUS.gelb, 1.1, 3, 0.3, 6);
  torque(MUS.gsh, -segOmega(P[1], P[11])*0.4);
  pd(MUS.neck, 0, 150, 6, 80);
  limit(MUS.lknee, -2.7, 0.0); limit(MUS.bknee, -2.7, 0.0);
  limit(MUS.lhip, -1.1, 2.4); limit(MUS.bhip, -1.1, 2.4);
  limit(MUS.relb, -0.05, 2.7); limit(MUS.gelb, -0.05, 2.6);
  limit(MUS.neck, -0.7, 0.7);

  // "core strength": keep the torso upright-ish while a foot is planted
  const neck = P[I.neck], pel = P[I.pelvis], head = P[I.head];
  let sx = 0, n = 0; for (const i of [4,5,7,8]) if (P[i].y < 0.02){ sx += P[i].x; n++; }
  const pin = typeof ROBOT_PIN !== 'undefined' ? ROBOT_PIN : null;   // 투구 교실 robot: bolted to its stand
  if (!pin && (head.y < 0.8 || pel.y < 0.42)) body.fallen = true;
  body.grounded = n > 0;
  if (n > 0 && !body.fallen && !pin){   // the bolted robot needs no balance help: it would only spin its arms
    const ang = Math.atan2(neck.y-pel.y, neck.x-pel.x);
    const err = wrap(Math.PI/2 - ang);
    const w = segOmega(pel, neck);
    const up = [0,1,9,10,11,12], Iu = inertia(up, pel);
    let tau = Iu*(T.gyroW*T.gyroW*err - 2*T.gyroZ*T.gyroW*w);
    tau = Math.max(-T.gyroT, Math.min(T.gyroT, tau));
    spin(up, pel, tau*DT/Iu);
    let cx = 0, cvx = 0, M = 0; for (const p of P){ cx += p.x*p.m; cvx += (p.x-p.px)/DT*p.m; M += p.m; } cx /= M; cvx /= M;
    const ax = (sx/n - cx)*T.comK - cvx*T.comD;
    for (const i of [0,1,2,9,10,11,12]) P[i].px -= ax*DT*DT;
  }

  const damp = pin ? DAMP*0.985 : DAMP;   // the robot moves like a servo: no free spinning
  for (const p of P){
    const vx = (p.x-p.px)*damp, vy = (p.y-p.py)*damp;
    p.px = p.x; p.py = p.y; p.sx = p.x; p.x += vx; p.y += vy - G*DT*DT;
  }
  for (let it = 0; it < ITER; it++){
    for (const bn of BONES){
      const a = P[bn.a], b = P[bn.b];
      const dx = b.x-a.x, dy = b.y-a.y, d = Math.hypot(dx,dy) || 1e-6;
      const diff = (d - bn.len)/d, wa = 1/a.m, wb = 1/b.m, s = diff/(wa+wb);
      a.x += dx*s*wa; a.y += dy*s*wa; b.x -= dx*s*wb; b.y -= dy*s*wb;
    }
    for (let i = 0; i < P.length; i++){ const p = P[i];
      if (p.y < 0){ p.y = 0; const f = FEET.has(i) ? 0.5 : 0.15; p.x += (p.sx - p.x)*f; }
    }
    if (pin) for (const [i, x, y] of pin){ P[i].x = x; P[i].y = y; }
  }
  if (pin) for (const [i, x, y] of pin){ P[i].px = x; P[i].py = y; }
  for (const p of P) if (p.y <= 0.0005 && p.py > p.y) p.py = p.y;
}
// PHYSICS-END
if (typeof module !== 'undefined') module.exports = { initBody, step, get P(){return P;}, I, body:()=>body, DT, TUNE };
