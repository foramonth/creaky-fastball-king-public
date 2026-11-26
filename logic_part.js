// ================= GAME =================
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize(){ DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W*DPR; cv.height = H*DPR; }
addEventListener('resize', resize); resize();

const $ = id => document.getElementById(id);
const pick = a => a[Math.floor(Math.random()*a.length)];
const SB = -10.5;   // the 2nd baseman, playing in (he'd like to go home too)
const CX = 18.44, TIME_LIMIT = 20, ARM = 1.35, WALL = 122, BWALL = -104, FX = -80;
const KEYMAP = {KeyQ:'lf', KeyA:'lb', KeyW:'bf', KeyS:'bb', KeyE:'shF', KeyD:'shB', KeyU:'elB', KeyJ:'elE', KeyK:'idx', KeyL:'mid'};
const down = {};
let cutFade = 0, keysPh = 0, lastTick = 0;
const lampEls = [...document.querySelectorAll('#lamps span')];
let state = 'intro', grip = 1, timeLeft = TIME_LIMIT, firstUp = null, bothDownAt = -1, now = 0;
let ball, catcher, fielder, cam, hist, release, fx, best = null, shake = 0, flash = 0, landedAt = 0, speech = null, creakT = 0;
let bodyUsed = false, paused = false, walkSaid = {}, revealed = new Set([1]), elbowHist = [], armRot = 0, prevArm = null, release_speed = 0, camBoost = 0, slowmo = null, lastForm = null, bestF, bestR, lastPerfect, missShown, demo = null, tries = 0, titles = new Set();
// 투구 교실 (tutorial) + joint tags + bonus-title trackers
// Saved progress (best / tries / titles / revealed / first sulk). The demo build keeps its own copy so recorded
// demo pitches never leak into a player's real record: build_release.py switches this to 'pitchqwop.'.
// (Settings — mute, joint dots — stay shared under 'pitchqwop.'.)
const SAVE_NS = 'pitchqwop.demo.';
// Per-pitch timers: a delayed line or sound that belongs to one pitch. reset() bumps pitchId, so anything still
// pending from the previous pitch is dropped instead of talking over the next one (or reading a release that's gone).
let pitchId = 0;
function later(fn, ms){ const id = pitchId; return setTimeout(() => { if (id === pitchId) fn(); }, ms); }
let tut = null, ROBOT_PIN = null, jointTags = false, wuAt = 0, armNet = 0, prevArmS = null, flamT = 0, flamMax = 0, tierStreak = [];
try { jointTags = localStorage.getItem('pitchqwop.joints') === '1'; } catch(e){}
const JOINT_KEYS = {KeyQ:[I.lknee,'Q · 앞다리 들기'], KeyA:[I.lknee,'A · 앞다리 뒤로 차기'], KeyW:[I.bknee,'W · 축발 앞으로'], KeyS:[I.bknee,'S · 축발 뒤로 차기'],
  KeyE:[I.neck,'E · 팔 앞으로 돌리기'], KeyD:[I.neck,'D · 팔 뒤로 돌리기'], KeyU:[I.relb,'U · 팔꿈치 접기'], KeyJ:[I.relb,'J · 팔꿈치 펴기'], KeyK:[I.rhand,'K · 공 쥐기'], KeyL:[I.rhand,'L · 공 쥐기']};
function save(){ if (tut) return; try { if (Number.isFinite(best)) localStorage.setItem(SAVE_NS + 'best', String(best)); localStorage.setItem(SAVE_NS + 'tries', String(tries)); localStorage.setItem(SAVE_NS + 'titles', JSON.stringify([...titles])); localStorage.setItem(SAVE_NS + 'rev', JSON.stringify([...revealed])); } catch(e){} }

// ---------- words ----------
const TXT = {
  strain: ['끄으응','삐걱','허리가…','이게 맞나','어깨야 미안','다리가 말을 안 들어','관절에서 소리 남','아 쥐 날 것 같아','왼쪽이 어느 쪽이더라'],
  throwF: ['흡','에잇','읏차','…던졌나?','나간 거 맞지?','후…'],
  slip: ['어…?','아 손에 땀이','공이 알아서 갔어요','저 아직 안 던졌는데'],
  fall: ['아야','바닥 시원하다','여기서 던져도 되나요','잠깐만 누워 있을게요','중력 이겼다… 아니 졌다'],
  dodge: ['히익!','아 깜짝이야','저 안 받아요','계약서에 없는 공','오지 마','산재 처리 되나요?!','공 말고 월급을 보내주세요','퇴근 시간 지났는데요'],
  fielderLook: ['?','내 쪽으로 왜…','저 투수 맞아요?','어… 어?'],
  tips: [
    '팁: K·L을 계속 누르세요. 안 그러면 공이 조기 은퇴합니다.',
    '팁: E만 누르면 팔이 풍차가 됩니다. 풍차는 투구를 못 합니다.',
    '팁: 투수가 공중으로 튀어 오르는 건 버그가 아닙니다. 아마도요.',
    '팁: 놓는 타이밍이 전부입니다. 나머지도 전부입니다.',
    '팁: 멀리 던지는 사람이 이깁니다. 그게 전부입니다. 아마도요.',
    '팁: 뒤로 던지면 감점입니다. 대체로요.',
    '팁: 넘어져도 투구는 계속됩니다. 존엄은 안 계속됩니다.',
    '팁: 검지(K)를 먼저 떼면 공이 뚝 떨어집니다. 이 투수의 자존감처럼.',
    '팁: 중지(L)를 먼저 떼면 백스핀. 공이 조금 더 버팁니다. 투수보다 낫네요.',
    '팁: 왼손이 몸을 돌리고 오른손이 공을 놓습니다. 두 손이 서로 모르는 사이라는 게 문제입니다.',
    '팁: 결과 화면의 “아까운 순간”을 보세요. 보고 나면 더 화납니다.',
    '팁: 뒤쪽 담장 너머에 국밥집이 있다는 소문이 있습니다. 확인한 사람은 없습니다.',
    '팁: 친구가 더 멀리 던졌다면, 친구가 뭔가 알고 있는 겁니다.'
  ],
  ready: ['해설: 네, 투수 마운드에 올라왔습니다. 일단 서 있긴 하네요.', '해설: 오늘 컨디션은… 서 있는 걸 보니 괜찮은 편입니다.', '해설: 투수가 공 쥐는 법을 기억해 내는 중입니다.', '해설: 관중석이 조용합니다. 기대를 안 하는 거죠.'],
  start: ['해설: 시작했습니다. 시작…한 거 맞죠?', '해설: 움직입니다! 의도한 건지는 모르겠습니다.', '해설: 와인드업… 이라고 불러도 될까요.'],
  fallC: ['해설: 아, 넘어졌습니다. 근데 아직 경기 중입니다.', '해설: 눕는 것도 투구폼의 일부일 수 있습니다. 아마요.', '해설: 투수가 잔디와 교감하고 있습니다.'],
  relF: ['해설: 던졌습니다! …아마도요.', '해설: 공이 손을 떠났습니다. 떠나긴 했어요.', '해설: 네, 공이 갑니다. 어디로 가는지는 공도 모릅니다.'],
  relB: ['해설: 공이 뒤로 갑니다. 중견수가 당황합니다.', '해설: 방향은 자유입니다. 규칙상으로는 아니지만요.', '해설: 포수가 손을 흔듭니다. 저 여기 있어요, 하고요.'],
  relSlip: ['해설: 공이… 그냥 떨어졌습니다. 투수가 놀랐습니다. 저도 놀랐습니다.', '해설: 손가락 힘이 바닥났습니다. 의지도 바닥났습니다.'],
  mega: '해설: 이, 이게 뭡니까!! 포수가!! 포수가 같이 날아갑니다!!',
  rmega: '해설: 투수가… 공을 따라갑니다. 이건 투구입니까, 이민입니까.',
  strike: '해설: 놀랍게도 스트라이크 존을 통과했습니다. 포수는 피했지만요.',
  escape: ['해설: 나가는 문은 아직 한참 더 가셔야 할 텐데요.', '해설: 출구는 반대편… 아니, 그쪽도 아닙니다.', '해설: 퇴근하기엔 경기장이 너무 넓습니다.', '해설: 투수, 퇴근 시도 실패입니다. 내일 다시 도전하시죠.'],
  miss: ['방금… 방금 그 순간이었는데', '지금이었어요. 아, 지나갔어요', '…놓쳤다. 완벽했는데'],
};
const TITLES = [
  ['drop',    '공 떨굼',        ['공은 투수 발밑에서 조용히 쉬고 있다.', '공: “저 여기 있어요.”', '던진 게 아니라 놓친 거다. 둘은 다르다.']],
  ['self',    '셀프 수비',      ['마운드 앞 땅볼. 본인이 가서 주우면 된다.', '공이 잠깐 산책 나갔다 왔다.', '투수 앞 땅볼… 을 투수가 던졌다.']],
  ['short',   '포수까지도 못 감', ['포수가 일어나서 공을 주우러 걸어왔다.', '18.44m는 생각보다 멀다. 오늘 알았다.', '포수: “괜찮아요, 제가 갈게요.”']],
  ['infield', '내야 플라이',    ['포수는 피했다. 2루수도 피했다. 다들 피했다.', '높이 떴다. 그게 전부다.', '방향은 맞았다. 그 외에는 모르겠다.']],
  ['outfield','외야 직행',      ['중견수가 “이거 투구 맞아요?”라고 물었다.', '외야수 전향 상담이 접수되었습니다.', '포수 머리 위로 지나갔다. 포수는 고개도 안 들었다.']],
  ['arm',     '강견 (근데 투수)', ['외야수로 전향을 진지하게 고려하자.', '구단주가 처음으로 박수를 쳤다. 한 번.', '어깨는 훌륭하다. 나머지가 문제다.']],
  ['stands',  '관중석 착지',    ['누군가 기념구를 얻었다. 투구로.', '관중: “홈런인가요?” 아닙니다. 투구입니다.', '맥주 컵 하나가 희생됐다.']],
  ['out',     '장외 투구',      ['공이 경기장을 떠났다. 투수도 떠나고 싶다.', '공이 먼저 퇴근했다.', '이 기록은 공식 기록에 남지 않는다. 너무 이상해서.']],
  ['back',    '역주행 투수',    ['공은 중견수 쪽으로 갔다. 중견수가 당황했다.', '뒤로 던졌다. 앞은 어디였을까.', '방향 감각도 삐걱거린다.']],
  ['balk',    '보크 장인',      ['20초 동안 아무것도 결정하지 못했다.', '생각이 너무 많은 투수.', '심판이 시계를 세 번 봤다.']],
  ['slip',    '땀 많은 손',     []],
  ['lying',   '누워서 던짐',    []],
  ['strike',  '사실 스트라이크', []],
  ['mega',    '포수 홈런',      []],
  ['rmega',   '투수 자진 납치',  []],
  ['serious', '승부에 진지함',   []],
  ['textbook','10점짜리 스트라이크', []],
  ['deliver', '직접 배달',      ['공은 한 번도 날지 않았다. 그래도 18.44m. 포수는 정중하게 받았다.', '퀵서비스보다 빠른 직접 배달. 심판은 판정을 포기했다.']],
  ['airmail', '날아서 직배송',   ['투수가 하늘을 날아 포수에게 공을 배달했다. 로켓 배송보다 빨랐다.', '착지는 엉망이었지만 배송은 정확했다. 18.44m.']],
  ['second',  '2루 직배송',    ['공은 앞이 아니라 뒤로 배달됐다. 2루수가 정중하게 받았다.', '마운드에서 2루까지 당일 배송. 포수는 아직 기다리고 있다.', '2루수가 공을 수령했다. 반품 문의가 접수되었다.']],
  ['sulk',    '삐짐',          ['공을 쥐었다가 그냥 놨다. 오늘은 그럴 기분이 아니었다.', '투수가 삐졌다. 이유는 아무도 모른다. 본인도 모른다.', '“나 안 해.” 프로 정신이 잠시 외출 중이다.']],
  ['escape',  '퇴근 실패',      ['투수가 뒤로 걸어 나가려 했지만, 출구는 아직 한참 멀었다.', '퇴근하기엔 경기장이 너무 넓었다.', '투수는 오늘도 퇴근하지 못했다.']],
  // throwing-style titles: picked up alongside the main one
  ['over',    '오버핸드',      [], '팔을 위에서 내리꽂기'],
  ['three',   '쓰리쿼터',      [], '위와 옆의 사이 어딘가'],
  ['side',    '사이드암',      [], '팔은 옆으로, 마음은 앞으로'],
  ['under',   '언더핸드',      [], '아래에서 위로 퍼 올리기'],
  ['sub',     '잠수함 투구',    [], '손이 땅을 스치듯'],
  ['heli',    '헬리콥터 투구',  [], '돌리고, 돌리고, 또 돌리고'],
  ['flamingo','플라밍고',      [], '한 발로도 충분합니다'],
  ['quick',   '0.5초 컷',      [], '생각은 사치'],
  ['buzzer',  '버저비터',      [], '마감은 마감 직전에'],
  ['split',   '다리 찢기',      [], '유연함도 실력입니다'],
  ['kneel',   '무릎 꿇고 투구',  [], '공손하게 던지기'],
  ['upside',  '거꾸로 투구',    [], '세상이 뒤집혔습니다'],
  ['vtol',    '수직 이착륙',    [], '올라간 공은 내려옵니다'],
  ['almost',  '배달 미완료',    [], '조금만 더 굴렀으면'],
  ['streak',  '한 우물',       [], '꾸준함은 재능입니다'],
];
const CATCHER = {
  idle: ['빨리 던져요… 저 6시 퇴근이에요', '몇 시에 끝나요?', '오늘 칼퇴 가능할까', '무릎 아파…', '사인 내기 귀찮다', '아무 데나 던지세요. 진짜로요', '미트 무거워…', '저녁 뭐 먹지', '오늘 반차 쓴 줄 알았는데', '이거 연장 근무예요?', '하품 나온다', '집에 고양이 밥 줘야 되는데'],
  approach: ['…왜 오세요?', '오지 마세요, 저 퇴근 준비 중이에요', '공은 던지는 거예요, 들고 오는 게 아니라', '설마 직접 주려고요?'],
  handoff: ['아… 네… 감사합니다?', '택배 왔네요… 반품 되나요?', '이제 집에 가도 되죠?', '수령 확인… 사인은 안 할게요'],
  strike: ['…잡았다? 내가?', '잡아버렸네… 야근 확정이네', '이런 거 하면 내일도 나와야 되잖아요', '손 아파… 산재 맞죠?'],
  launch: {1: ['어, 어? 퇴근길이 이쪽이었나', '어어어 저 아직 출근 안 찍었는데', '집 방향 맞나요?!'],
           2: ['으아악 이대로 집까지 가주세요', '이거 출장비 나와요?!', '으아아 택시보다 빠르다'],
           3: ['으아아아 저 퇴근할래요', '으아아아 사직서 낼게요', '엄마아아아']},
  landed: ['…여기서 집 가까운가요?', '조퇴 처리해 주세요', '오늘 일 다 했다', '…여기 와이파이 되나요?', '이대로 퇴근하겠습니다'],
  sulk: ['저도 안 해요', '오 잘됐다, 저도 퇴근할게요', '그럼 저도 오늘 여기까지'],
  timeout: ['…저 그냥 집에 갈게요', '시간 끝났죠? 수고하셨습니다', '야간 수당은 없나요'],
  second: {approach: ['…왜 오세요?', '저 2루수예요, 포수 아니에요', '설마 저한테 주시려고요?', '뒤로 오시면 안 되는데…', '포수는 저쪽이에요, 저쪽!', '어… 저 지금 퇴근 준비 중인데', '감독님, 이거 제 일 맞아요?'],
           got: ['…반품 되나요?', '이거 제가 어떻게 해요?', '저 사인 안 했어요', '이제 2루 비워도 되죠?', '이걸로 아웃 하나 쳐 주나요?', '…따뜻하네요, 공이', '포수한테 전해 드릴까요? 아니요, 저도 퇴근할래요'],
           pass: ['어, 어?!', '히익! 저 2루수예요!', '왜 저한테 던져요?!', '수비 위치 바꿔야 하나…', '그쪽 아니에요!'],
           almost: ['거의 다 왔는데…', '조금만 더 오시지…', '아깝다, 받아 드릴 수 있었는데']},
  pitcherLeaves: ['어? 저 사람 먼저 퇴근하네', '나도 데려가요!', '치사하다 혼자 가고'],
  short: ['굴러오면 줍겠습니다… 아니 안 줍겠습니다', '거기까지는 안 갈래요', '공이 저를 피하네요. 좋아요'],
};
const TMAP = Object.fromEntries(TITLES.map(t => [t[0], t]));
// saved progress (loaded after TITLES exists, so unknown entries can be dropped)
try {
  const b = parseFloat(localStorage.getItem(SAVE_NS + 'best')); if (Number.isFinite(b)) best = b;   // ignore 'null' / garbage
  tries = parseInt(localStorage.getItem(SAVE_NS + 'tries') || '0', 10) || 0;
  titles = new Set(JSON.parse(localStorage.getItem(SAVE_NS + 'titles') || '[]').filter(id => TITLES.some(t => t[0] === id)));
  JSON.parse(localStorage.getItem(SAVE_NS + 'rev') || '[1]').forEach(i => { if (i === 0 || i === 1 || i === 2 || i === 3) revealed.add(i); });
} catch(e){}

// ---------- audio ----------
let AC = null, OUT = null, muted = false;
try { muted = localStorage.getItem('pitchqwop.mute') === '1'; } catch(e){}
function audioInit(){
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch(e){ AC = null; }
  if (AC && !OUT){ OUT = AC.createGain(); OUT.gain.value = muted ? 0 : 1; OUT.connect(AC.destination); }
  if (AC) sfxInit();                      // (before the crowd: its murmur sends into the reverb)
  if (AC && !crowdBed) startCrowd();
  if (AC) musicStart();
}
let crowdBed = null, noiseBuf = null;
function getNoise(){
  if (noiseBuf) return noiseBuf;
  const n = AC.sampleRate*3; noiseBuf = AC.createBuffer(1, n, AC.sampleRate); const ch = noiseBuf.getChannelData(0);
  let b = 0; for (let i = 0; i < n; i++){ b = 0.97*b + 0.03*(Math.random()*2 - 1); ch[i] = b*6; }   // soft, pinkish
  return noiseBuf;
}
const CROWD_BASE = 0.13;
// ================= ballpark sound, take 2: voices instead of beeps =================
// Every human sound here is a voice: a buzzing source (the vocal folds) through two or three resonances (the mouth
// shaping a vowel, "formants"). One voice is a person; hundreds of short ones at random are a crowd.
// Event stings use the stadium organ (as real ballparks do) instead of square-wave beeps.
const SND_VOWEL = {a: [800, 1250, 2600], o: [480, 850, 2500], u: [340, 760, 2400], e: [520, 1850, 2500], i: [310, 2200, 2900], eo: [600, 1000, 2500]};
const SND = {walla: null, wallaNext: 0, wallaTimer: null, creak: null};
function sndVoice(t, f0, vowel, dur, v, pan, dest, glide = 1){       // one person saying one vowel
  const F = SND_VOWEL[vowel] || SND_VOWEL.a, o = AC.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0*glide, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.05, dur*0.3)); g.gain.setTargetAtTime(0.0001, t + dur*0.6, dur*0.15);
  for (const [k, q, a] of [[0, 6, 1], [1, 8, 0.7], [2, 10, 0.25]]){
    const f = AC.createBiquadFilter(), fg = AC.createGain(); f.type = 'bandpass'; f.frequency.value = F[k]*(0.95 + Math.random()*0.1); f.Q.value = q; fg.gain.value = a;
    o.connect(f).connect(fg).connect(g);
  }
  let node = g; if (pan && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = pan; node = g.connect(p); }
  node.connect(dest); o.start(t); o.stop(t + dur + 0.6);
}
function sndPhrase(syl, pan, dest){   // one person saying a few syllables: one voice whose formants move from vowel to vowel
  // (one set of nodes per phrase instead of per syllable — the murmur makes ~55 of these a second)
  const t0 = syl[0][0], last = syl[syl.length - 1], o = AC.createOscillator(), g = AC.createGain(); o.type = 'sawtooth';
  g.gain.setValueAtTime(0.0001, t0);
  const fs = [[6, 1], [8, 0.7], [10, 0.25]].map(([q, a]) => { const f = AC.createBiquadFilter(), fg = AC.createGain(); f.type = 'bandpass'; f.Q.value = q; fg.gain.value = a;
    o.connect(f).connect(fg).connect(g); return f; });
  syl.forEach(([st, f0, vowel, dur, v, glide], n) => {
    const F = SND_VOWEL[vowel] || SND_VOWEL.a;
    o.frequency.setValueAtTime(f0, st); o.frequency.linearRampToValueAtTime(f0*glide, st + dur);
    fs.forEach((f, k) => { const fk = F[k]*(0.95 + Math.random()*0.1); if (n) f.frequency.setTargetAtTime(fk, st - 0.012, 0.01); else f.frequency.setValueAtTime(fk, t0); });
    g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(v, st + Math.min(0.05, dur*0.3)); g.gain.setTargetAtTime(0.0001, st + dur*0.6, dur*0.15);
  });
  let node = g; if (pan && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = pan; node = g.connect(p); }
  node.connect(dest); o.start(t0); o.stop(last[0] + last[3] + 0.6);
}
function sndVowelBanks(vowels, n, dest){   // a crowd shouting the same vowel shares formant filters: n spots across the stands per vowel
  const banks = {}; for (const vw of vowels){ banks[vw] = []; const F = SND_VOWEL[vw] || SND_VOWEL.a;
    for (let i = 0; i < n; i++){ const inp = AC.createGain(), out = AC.createGain();
      if (AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = ((i + 0.5)/n*2 - 1)*0.85; out.connect(p).connect(dest); } else out.connect(dest);
      [[0, 6, 1], [1, 8, 0.7], [2, 10, 0.25]].forEach(([k, q, a]) => { const f = AC.createBiquadFilter(), fg = AC.createGain(); f.type = 'bandpass';
        f.frequency.value = F[k]*(0.95 + Math.random()*0.1); f.Q.value = q; fg.gain.value = a; inp.connect(f).connect(fg).connect(out); });
      banks[vw].push(inp); } }
  return (vw, pan) => { const b = banks[vw]; return b[Math.max(0, Math.min(b.length - 1, Math.floor((pan/0.9 + 1)/2*b.length)))]; };
}
function sndCrowdVoice(t, f0, dur, v, bank, glide = 1){   // one voice in a shouting crowd: just its pitch and loudness, into a shared bank
  const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0*glide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.05, dur*0.3)); g.gain.setTargetAtTime(0.0001, t + dur*0.6, dur*0.15);
  o.connect(g).connect(bank); o.start(t); o.stop(t + dur + 0.6);
}
function sndClapBanks(dest){   // applause: a handful of hand-sizes (bandpass) shared by every clap
  const fs = []; for (let i = 0; i < 6; i++){ const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + (i + Math.random())*150; f.Q.value = 1.2; f.connect(dest); fs.push(f); }
  return (t, v) => { const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = getNoise();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    s.connect(g).connect(fs[Math.floor(Math.random()*fs.length)]); s.start(t, Math.random()*2); s.stop(t + 0.05); };
}
function sndClap(t, v, dest){                                        // one pair of hands
  const s = AC.createBufferSource(); s.buffer = getNoise(); const f = AC.createBiquadFilter(), g = AC.createGain();
  f.type = 'bandpass'; f.frequency.value = 900 + Math.random()*900; f.Q.value = 1.2;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  s.connect(f).connect(g).connect(dest); s.start(t, Math.random()*2); s.stop(t + 0.05);
}
function sndWhistle(t, v, dest){                                     // a fan's two-finger whistle: up, hold, down, with breath
  const o = AC.createOscillator(), g = AC.createGain(), b = 2400 + Math.random()*500, d = 0.5 + Math.random()*0.5;
  o.frequency.setValueAtTime(b*0.8, t); o.frequency.linearRampToValueAtTime(b*1.15, t + 0.12); o.frequency.setValueAtTime(b*1.15, t + d*0.7); o.frequency.linearRampToValueAtTime(b*0.85, t + d);
  const vib = AC.createOscillator(), vg = AC.createGain(); vib.frequency.value = 7; vg.gain.value = b*0.012; vib.connect(vg).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.05); g.gain.setValueAtTime(v, t + d*0.8); g.gain.linearRampToValueAtTime(0.0001, t + d);
  const br = AC.createBufferSource(); br.buffer = getNoise(); const bf = AC.createBiquadFilter(), bg = AC.createGain(); bf.type = 'bandpass'; bf.frequency.value = b; bf.Q.value = 3; bg.gain.value = 0.6;
  br.connect(bf).connect(bg).connect(g); o.connect(g).connect(dest);
  o.start(t); o.stop(t + d + 0.05); vib.start(t); vib.stop(t + d + 0.05); br.start(t, Math.random()*2); br.stop(t + d + 0.05);
}
// the crowd's murmur: lots of people talking over each other all over the stands — short phrases, each with its own
// rise and fall, overlapping into a 웅성웅성. Scheduled a little ahead, like the organ.
function sndWalla(from, to, density = 55, v = 0.21){
  const vs = Object.keys(SND_VOWEL);
  for (let t = Math.max(from, SND.wallaNext); t < to; t += -Math.log(1 - Math.random())/density){
    const male = Math.random() < 0.6, f0 = (male ? 110 : 205)*(0.85 + Math.random()*0.35), syl = 2 + Math.floor(Math.random()*5);
    const pan = (Math.random()*2 - 1)*0.85, loud = v*(0.3 + Math.random()*0.9), dest = SND.walla || crowdBed || OUT;
    const ph = [];
    for (let k = 0, st = t; k < syl; k++){                                       // one phrase: pitch drifts down, the last syllable trails
      const dur = 0.09 + Math.random()*0.08 + (k === syl - 1 ? 0.06 : 0), fk = f0*(1.08 - 0.12*k/syl)*(1 + (Math.random() - 0.5)*0.12);
      ph.push([st, fk, vs[Math.floor(Math.random()*vs.length)], dur, loud*(k === 0 ? 1.1 : 0.85), 0.92 + Math.random()*0.14]);
      st += dur + 0.03 + Math.random()*0.05;
    }
    sndPhrase(ph, pan, dest);
    SND.wallaNext = t;
  }
}
function startCrowd(){
  // a quieter version of the old hiss underneath (distance, wind) and, on top, people actually talking
  crowdBed = AC.createGain(); crowdBed.gain.value = CROWD_BASE; crowdBed.connect(OUT);
  for (const [f, q, v, pan, rate] of [[380, 0.7, 0.25, -0.35, 0.13], [1050, 0.9, 0.15, 0.35, 0.19]]){
    const src = AC.createBufferSource(); src.buffer = getNoise(); src.loop = true; src.playbackRate.value = 0.9 + Math.random()*0.2;
    const bp_ = AC.createBiquadFilter(); bp_.type = 'bandpass'; bp_.frequency.value = f; bp_.Q.value = q;
    const g = AC.createGain(); g.gain.value = v;
    const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = rate; lg.gain.value = v*0.35; lfo.connect(lg).connect(g.gain); lfo.start();
    let node = src.connect(bp_).connect(g);
    if (AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = pan; node = node.connect(p); }
    node.connect(crowdBed); src.start(AC.currentTime + Math.random()*2);
  }
  SND.walla = AC.createGain(); SND.walla.gain.value = 0.85; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2100;   // far away: muffled
  const swell = AC.createOscillator(), sg = AC.createGain(); swell.frequency.value = 0.07; sg.gain.value = 0.22; swell.connect(sg).connect(SND.walla.gain); swell.start();   // the murmur rises and falls
  SND.walla.connect(lp).connect(crowdBed); if (SFX.rev){ const rs = AC.createGain(); rs.gain.value = 0.6; SND.walla.connect(rs).connect(SFX.rev); }
  SND.wallaNext = AC.currentTime;
  if (!SND.wallaTimer) SND.wallaTimer = setInterval(() => { if (AC && SND.walla && AC.state === 'running') sndWalla(AC.currentTime, AC.currentTime + 0.4); }, 150);
}
function cheer(amount = 1){                                          // a roar: a swell of shouted "와~", applause, whistles
  if (!AC) return; const t = AC.currentTime, d = 1.4 + amount*1.6, dest = OUT;
  const roar = AC.createGain(); roar.gain.setValueAtTime(0.0001, t); roar.gain.exponentialRampToValueAtTime(1, t + 0.3); roar.gain.setValueAtTime(1, t + d*0.45); roar.gain.exponentialRampToValueAtTime(0.0001, t + d);
  roar.connect(dest); if (SFX.rev){ const rs = AC.createGain(); rs.gain.value = 0.5; roar.connect(rs).connect(SFX.rev); }
  const n = Math.round(26*amount + 10);
  const trim = AC.createGain(); trim.gain.value = 0.86; trim.connect(roar);   // v54.18: shared banks came out ~1.3 dB hotter; keep the old level
  const bank = sndVowelBanks(['a', 'o'], 4, trim), clap = sndClapBanks(trim);
  for (let i = 0; i < n; i++){ const s = t + Math.random()*0.35, male = Math.random() < 0.6;
    sndCrowdVoice(s, (male ? 150 : 280)*(0.85 + Math.random()*0.4), d*(0.5 + Math.random()*0.45), 0.0045*(0.5 + Math.random()), bank(Math.random() < 0.7 ? 'a' : 'o', (Math.random()*2 - 1)*0.9), 1.05 + Math.random()*0.15); }
  const claps = Math.round(60*amount*d); for (let i = 0; i < claps; i++) clap(t + 0.15 + Math.random()*d*0.85, 0.018*(0.3 + Math.random())*Math.min(1.2, amount + 0.3));
  for (let i = 0; i < Math.round(amount*2.5); i++) sndWhistle(t + 0.3 + Math.random()*d*0.5, 0.006, roar);
}
function crowdVoice(from, to, d, v = 0.05){                          // "오오~" (rising) / "우~" (falling): many voices on one vowel
  if (!AC) return; const t = AC.currentTime, rising = to > from, vowel = rising ? 'o' : 'u', g = AC.createGain();
  g.gain.value = 1; g.connect(OUT); if (SFX.rev){ const rs = AC.createGain(); rs.gain.value = 0.4; g.connect(rs).connect(SFX.rev); }
  const bank = sndVowelBanks([vowel], 4, g);
  for (let i = 0; i < 22; i++){ const k = 0.8 + Math.random()*0.5, male = Math.random() < 0.6;
    sndCrowdVoice(t + Math.random()*0.2, (male ? from*0.62 : from*1.15)*k, d*(0.75 + Math.random()*0.3), v*1.1*(0.6 + Math.random()*0.8), bank(vowel, (Math.random()*2 - 1)*0.8), (to/from)*(0.95 + Math.random()*0.1)); }
}
function babble(mood){                                               // the caster: an excited, up-front voice over the PA (unintelligible, but clearly a person talking)
  if (!AC) return; const t = AC.currentTime, base = (mood === 'shock' ? 245 : mood === 'sigh' ? 150 : 190)*(0.9 + Math.random()*0.22);
  if (!SND.pa){                                                      // broadcast chain: trim the rumble, lift the 'presence' band, even it out
    SND.pa = AC.createGain(); SND.pa.gain.value = 1;
    const hp = AC.createBiquadFilter(), pres = AC.createBiquadFilter(), lp = AC.createBiquadFilter(), comp = AC.createDynamicsCompressor();
    hp.type = 'highpass'; hp.frequency.value = 200; pres.type = 'peaking'; pres.frequency.value = 2800; pres.Q.value = 0.9; pres.gain.value = 7;
    lp.type = 'lowpass'; lp.frequency.value = 5200; comp.threshold.value = -26; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.12;
    SND.pa.connect(hp).connect(pres).connect(lp).connect(comp).connect(OUT);
    if (SFX.rev){ const rs = AC.createGain(); rs.gain.value = 0.1; comp.connect(rs).connect(SFX.rev); }
  }
  const stress = Math.random() < 0.25, up = mood === 'sigh' ? 0.9 : mood === 'shock' ? 1.2 : 1.1;   // excited: syllables lift at the end
  if (Math.random() < 0.5){ const s = AC.createBufferSource(); s.buffer = getNoise(); const f = AC.createBiquadFilter(), g = AC.createGain();   // a consonant: s / t / k
    f.type = 'bandpass'; f.frequency.value = [5200, 3000, 1800][Math.floor(Math.random()*3)]; f.Q.value = 1.4; g.gain.setValueAtTime(0.014, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
    s.connect(f).connect(g).connect(SND.pa); s.start(t, Math.random()*2); s.stop(t + 0.04); }
  const vs = ['a', 'eo', 'o', 'a', 'e', 'i', 'a', 'eo', 'u'];
  sndVoice(t + 0.018, base*(stress ? 1.15 : 1), vs[Math.floor(Math.random()*vs.length)], stress ? 0.11 : 0.082, stress ? 0.05 : 0.034, 0, SND.pa, up*(0.97 + Math.random()*0.08));
}
// stings for the big moments, played by the house brass band (straight to the speakers, so they are not ducked with the music)
function stingBus(){ if (SND.sting) return SND.sting; const b = AC.createGain(); b.gain.value = 1; b.connect(OUT);
  if (SFX.rev){ const r = AC.createGain(); r.gain.value = 0.35; b.connect(r).connect(SFX.rev); } return SND.sting = b; }
function sndSting(kind){
  if (!AC || !OUT) return; const t = AC.currentTime + 0.02, d = stingBus();
  const tp = (notes, v = 0.06) => { for (const [dt, m, len] of notes) horn('tpt', t + dt, m, len, v, 0.1, d); };
  const tb = (notes, v = 0.035) => { for (const [dt, m, len] of notes) horn('tbn', t + dt, m, len, v, -0.15, d); };
  if (kind === 'strike'){ tp([[0, 72, 0.1], [0.11, 76, 0.1], [0.22, 79, 0.34]]); tb([[0.22, 67, 0.34], [0.22, 64, 0.34]]); }
  else if (kind === 'homer'){ tp([[0, 67, 0.13], [0.15, 72, 0.13], [0.3, 76, 0.13], [0.45, 79, 0.28], [0.8, 76, 0.13], [0.95, 79, 0.7]], 0.065); tb([[0.95, 72, 0.7], [0.95, 67, 0.7]], 0.04); horn('tuba', t + 0.95, 48, 0.7, 0.09, 0, d); }
  else if (kind === 'good'){ tp([[0, 72, 0.12], [0.14, 79, 0.36]], 0.045); tb([[0.14, 76, 0.36]], 0.03); }
  else if (kind === 'meh'){ tp([[0, 67, 0.14], [0.16, 64, 0.32]], 0.035); }
  else if (kind === 'deliver'){ tp([[0, 72, 0.12], [0.13, 76, 0.26]], 0.045); }
}
// the 응원단: the big cheering drum, 막대풍선 thundersticks and the stand chanting "삐-걱! 삐-걱! 최강 삐-걱!",
// started on the band's next beat so the two never fight over the tempo. A crowd sound, so it is not ducked with the music.
const CHANT = {bus: null, nextAt: 0};
function chantBus(){ if (CHANT.bus) return CHANT.bus; const b = AC.createGain(); b.gain.value = 0.25; b.connect(OUT);
  if (SFX.rev){ const r = AC.createGain(); r.gain.value = 0.5; b.connect(r).connect(SFX.rev); } return CHANT.bus = b; }
function chantDrum(t, v){ const d = chantBus(), o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); o.connect(g).connect(d); o.start(t); o.stop(t + 0.6);
  const s = AC.createBufferSource(); s.buffer = getNoise(); const f = AC.createBiquadFilter(), sg = AC.createGain(); f.type = 'lowpass'; f.frequency.value = 900;
  sg.gain.setValueAtTime(v*0.6, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); s.connect(f).connect(sg).connect(d); s.start(t, Math.random()*2); s.stop(t + 0.1); }
function chantSticks(t, v){ const d = chantBus();
  for (let i = 0; i < 18; i++){ const s = AC.createBufferSource(); s.buffer = getNoise(); const f = AC.createBiquadFilter(), g = AC.createGain(), tt = Math.max(AC.currentTime, t + (Math.random() - 0.5)*0.03);
    f.type = 'bandpass'; f.frequency.value = 700 + Math.random()*500; f.Q.value = 3; g.gain.setValueAtTime(v*(0.5 + Math.random()*0.5), tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.05);
    s.connect(f).connect(g).connect(d); s.start(tt, Math.random()*2); s.stop(tt + 0.06); } }
function crowdChant(){
  if (!AC || !OUT || !SFX.bus) return; const d = chantBus(), sp = 60/(ORG.bpm || 138);
  const t0 = ORG.gain && ORG.next > AC.currentTime + 0.05 ? ORG.next : AC.currentTime + 0.1;
  for (let b = 0; b < 8; b++){ chantDrum(t0 + b*sp, b % 4 === 0 ? 0.55 : 0.4); chantSticks(t0 + b*sp, 0.09); chantSticks(t0 + (b + 0.5)*sp, 0.05); }
  for (const [b, vowel, len, pitch] of [[0, 'i', 0.5, 1.15], [1, 'eo', 0.35, 1.0], [2, 'i', 0.5, 1.15], [3, 'eo', 0.35, 1.0], [4, 'e', 0.3, 1.1], [4.5, 'a', 0.3, 1.2], [5, 'i', 0.5, 1.15], [6, 'eo', 0.5, 1.0]])
    for (let i = 0; i < 34; i++){ const male = Math.random() < 0.55;
      crowdShoutOne(t0 + b*sp + (Math.random() - 0.3)*0.05, (male ? 150 : 270)*pitch*(0.9 + Math.random()*0.2), vowel, len*sp*2*(0.85 + Math.random()*0.3), 0.016*(0.5 + Math.random()*0.7), (Math.random()*2 - 1)*0.9, d); }
  for (let k = 0; k < 6; k++) chantDrum(t0 + (7 + k/6)*sp, 0.25 + k*0.04);
}
function sndBlock(hi){                                               // a wood block for the hurry tick-tock (a stadium clock, not a beeper)
  if (!AC) return; const t = AC.currentTime, f = hi ? 1700 : 1250, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(f*1.08, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.02);
  g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); o.connect(g).connect(OUT); o.start(t); o.stop(t + 0.09);
  const s = AC.createBufferSource(); s.buffer = getNoise(); const bf = AC.createBiquadFilter(), bg = AC.createGain(); bf.type = 'bandpass'; bf.frequency.value = f*2; bf.Q.value = 2;
  bg.gain.setValueAtTime(0.04, t); bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.015); s.connect(bf).connect(bg).connect(OUT); s.start(t, Math.random()*2); s.stop(t + 0.03);
}
// the creak in "삐걱": stick-slip friction (a joint rubbing in bursts) ringing a few wooden/bony resonances
function sndCreak(){
  if (!AC || !SFX.bus) return;
  if (!SND.creak) SND.creak = Array.from({length: 5}, () => bake(0.3, (d, sr, n) => {
    let t = 0.01, rate = 28 + Math.random()*20; const imp = new Float32Array(n);
    while (t < 0.26){ const i = Math.floor(t*sr); if (i < n) imp[i] += 0.6 + Math.random()*0.6; rate *= 1.04 + Math.random()*0.06; t += 1/rate*(0.8 + Math.random()*0.4); }
    const R = [[430 + Math.random()*120, 55], [1050 + Math.random()*200, 80], [2300 + Math.random()*400, 120]];
    for (const [f, k] of R){ const w = 6.2832*f/sr, dec = Math.exp(-k/sr); let y1 = 0, y2 = 0; const c = 2*dec*Math.cos(w);
      for (let i = 0; i < n; i++){ const y = imp[i] + c*y1 - dec*dec*y2; y2 = y1; y1 = y; d[i] += y*(f < 1000 ? 1 : 0.5); } }
    for (let i = 0; i < n; i++) d[i] *= Math.min(1, i/(sr*0.01))*Math.min(1, (n - i)/(sr*0.04));
  }));
  const s = AC.createBufferSource(); s.buffer = SND.creak[Math.floor(Math.random()*SND.creak.length)]; s.playbackRate.value = 0.85 + Math.random()*0.3;
  const g = AC.createGain(); g.gain.value = 0.011; s.connect(g).connect(SFX.bus); s.start();
}
const ooh = () => crowdVoice(190, 330, 1.7, 0.035);   // anticipation
const groan = () => crowdVoice(170, 105, 1.3, 0.04);  // disappointment
function tone(f, d, type='square', v=0.06, f2){
  if (!AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t+d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t+d);
  o.connect(g).connect(OUT); o.start(t); o.stop(t+d+0.02);
}
function noise(d, v=0.15, freq=1200){
  if (!AC) return; const t = AC.currentTime, n = Math.floor(AC.sampleRate*d), buf = AC.createBuffer(1, n, AC.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random()*2-1)*(1-i/n);
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = v;
  s.connect(f).connect(g).connect(OUT); s.start(t);
}


// ---------- physical sound effects (SFX) ----------
// Synth beeps stay for the show (crowd, commentator, jingles). Things that physically move or hit get their own
// short one-shot samples, baked once at start-up from noise and damped resonances (no network, no files),
// layered 2-3 at a time, scaled by speed, and run through their own bus with a limiter.
const SFX = {bus: null, rev: null, bank: {}, last: {}, live: {}};
function sfxInit(){
  if (!AC || SFX.bus) return;
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 6; comp.ratio.value = 8; comp.attack.value = 0.002; comp.release.value = 0.15;
  SFX.bus = AC.createGain(); SFX.bus.gain.value = 0.85;                       // SFX master volume
  SFX.bus.connect(comp).connect(OUT);
  // a small concrete-stadium reverb for the big hits only
  const n = Math.floor(AC.sampleRate*0.9), ir = AC.createBuffer(2, n, AC.sampleRate);
  for (let c = 0; c < 2; c++){ const d = ir.getChannelData(c); for (let i = 0; i < n; i++){ const t = i/AC.sampleRate; d[i] = (Math.random()*2 - 1)*Math.exp(-t*6.5)*(t < 0.012 ? t/0.012 : 1); } }
  SFX.rev = AC.createConvolver(); SFX.rev.buffer = ir;
  const rg = AC.createGain(); rg.gain.value = 0.35; SFX.rev.connect(rg).connect(SFX.bus);
  bakeSfx(); bakeSfx2();
}
// --- baking helpers: everything is rendered into plain buffers once ---
function bake(dur, fn){
  const sr = AC.sampleRate, n = Math.max(1, Math.floor(sr*dur)), b = AC.createBuffer(1, n, sr), d = b.getChannelData(0);
  fn(d, sr, n); let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
  if (pk > 0) for (let i = 0; i < n; i++) d[i] *= 0.9/pk;                      // normalise; loudness is set at play time
  return b;
}
function onePole(d, a){ let y = 0; for (let i = 0; i < d.length; i++){ y += a*(d[i] - y); d[i] = y; } }   // simple low-pass
function hiPass(d, a){ let y = 0, x0 = 0; for (let i = 0; i < d.length; i++){ const x = d[i]; y = a*(y + x - x0); x0 = x; d[i] = y; } }
function bp(d, sr, f, q){   // biquad band-pass, in place
  const w = 2*Math.PI*f/sr, al = Math.sin(w)/(2*q), a0 = 1 + al, b0 = al/a0, b2 = -al/a0, a1 = -2*Math.cos(w)/a0, a2 = (1 - al)/a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < d.length; i++){ const x = d[i], y = b0*x + b2*x2 - a1*y1 - a2*y2; x2 = x1; x1 = x; y2 = y1; y1 = y; d[i] = y; }
}
function modes(d, sr, list){   // damped resonances: [freq, decay/s, amp]
  for (const [f, k, a] of list){ const ph = Math.random()*6.28; for (let i = 0; i < d.length; i++){ const t = i/sr; d[i] += a*Math.sin(6.2832*f*t + ph)*Math.exp(-k*t); } }
}
function bakeSfx(){
  const B = SFX.bank, R = Math.random;
  // 1) release: the ball leaving the fingers (a dry skin/leather tick) …
  B.tick = [0, 1, 2].map(() => bake(0.06, (d, sr) => {
    for (let i = 0; i < d.length; i++){ const t = i/sr; d[i] = (R()*2 - 1)*Math.exp(-t*(160 + R()*40)); }
    bp(d, sr, 2600 + R()*900, 1.2);
    modes(d, sr, [[820 + R()*120, 70, 0.25], [1500 + R()*200, 90, 0.12]]);
  }));
  //    … and the air it cuts through (band-limited noise; pitch rides on playback rate)
  B.whoosh = [0, 1].map(() => bake(0.42, (d, sr, n) => {
    for (let i = 0; i < n; i++) d[i] = R()*2 - 1;
    const tmp = Float32Array.from(d); bp(d, sr, 1500, 0.9); bp(tmp, sr, 3400, 1.4);
    for (let i = 0; i < n; i++){ const x = i/n, env = Math.pow(Math.sin(Math.PI*Math.min(1, x*1.15)), 1.6)*(1 - x*0.35); d[i] = (d[i] + tmp[i]*0.5)*env; }
  }));
  // 2) catch: a leather mitt "pop" — transient + hollow pocket resonance + body thump
  B.pop = [0, 1, 2].map(() => bake(0.22, (d, sr) => {
    for (let i = 0; i < d.length; i++){ const t = i/sr; d[i] = (R()*2 - 1)*Math.exp(-t*220)*0.9; }
    bp(d, sr, 1900 + R()*500, 0.9);
    modes(d, sr, [[210 + R()*30, 38, 0.9], [340 + R()*40, 55, 0.55], [560 + R()*60, 80, 0.3], [95 + R()*10, 30, 0.7]]);
  }));
  B.leather = [0, 1].map(() => bake(0.16, (d, sr) => {                         // the glove squeezing shut
    for (let i = 0; i < d.length; i++){ const t = i/sr; d[i] = (R()*2 - 1)*(t < 0.02 ? t/0.02 : Math.exp(-(t - 0.02)*30))*(0.6 + 0.4*Math.sin(t*900)); }
    bp(d, sr, 900, 2.5);
  }));
  B.sub = [bake(0.45, (d, sr) => { for (let i = 0; i < d.length; i++){ const t = i/sr, f = 70*Math.exp(-t*2.2) + 38; d[i] = Math.sin(6.2832*f*t)*Math.exp(-t*7)*(t < 0.004 ? t/0.004 : 1); } })];
}
function bakeSfx2(){
  const B = SFX.bank, R = Math.random;
  // ground: dirt / grass / hard (stands, street) / water
  B.dirt = [0, 1, 2].map(() => bake(0.22, (d, sr) => {
    for (let i = 0; i < d.length; i++){ const t = i/sr; d[i] = (R()*2 - 1)*Math.exp(-t*40)*(R() < 0.25 ? 1.6 : 0.6); }   // grit
    onePole(d, 0.18);
    modes(d, sr, [[95 + R()*20, 28, 1.1], [160 + R()*30, 45, 0.5]]);
  }));
  B.grass = [0, 1].map(() => bake(0.18, (d, sr) => {
    for (let i = 0; i < d.length; i++){ const t = i/sr; d[i] = (R()*2 - 1)*Math.exp(-t*55)*0.5; }
    onePole(d, 0.08);
    modes(d, sr, [[80 + R()*15, 35, 1.0], [130, 60, 0.3]]);
  }));
  B.hard = [0, 1, 2].map(() => bake(0.25, (d, sr) => {
    for (let i = 0; i < d.length; i++){ const t = i/sr; d[i] = (R()*2 - 1)*Math.exp(-t*400); }
    hiPass(d, 0.6);
    modes(d, sr, [[1150 + R()*200, 45, 0.5], [1900 + R()*300, 60, 0.3], [2900 + R()*300, 90, 0.2], [420 + R()*60, 30, 0.35]]);
  }));
  B.splash = [0, 1].map(() => bake(0.9, (d, sr, n) => {
    for (let i = 0; i < n; i++){ const t = i/sr; d[i] = (R()*2 - 1)*(t < 0.015 ? t/0.015 : Math.exp(-(t - 0.015)*5.5)); }
    bp(d, sr, 1300, 0.6);
    for (let k = 0; k < 9; k++){                                                  // a few bubbles: short rising blips
      const t0 = 0.05 + R()*0.6, f0 = 380 + R()*700, len = 0.025 + R()*0.04;
      for (let i = Math.floor(t0*sr); i < Math.min(n, (t0 + len)*sr); i++){ const t = i/sr - t0; d[i] += 0.5*Math.sin(6.2832*(f0*t + f0*1.5*t*t/len))*Math.exp(-t*60); }
    }
  }));
  // falling over: shoe scuff, body thud, and the gear arriving late
  B.scuff = [0, 1].map(() => bake(0.24, (d, sr, n) => {
    for (let i = 0; i < n; i++){ const x = i/n; d[i] = (R()*2 - 1)*Math.sin(Math.PI*x)*(0.6 + 0.4*Math.sin(i/sr*170*6.28)); }
    bp(d, sr, 2600, 0.8);
  }));
  B.body = [0, 1].map(() => bake(0.45, (d, sr) => {
    for (let i = 0; i < d.length; i++){ const t = i/sr; d[i] = (R()*2 - 1)*Math.exp(-t*25)*0.7; }
    onePole(d, 0.1);
    modes(d, sr, [[58 + R()*8, 14, 1.4], [110 + R()*15, 30, 0.6], [240, 60, 0.2]]);
  }));
  B.clatter = [0, 1, 2].map(() => bake(0.12, (d, sr) => {
    for (let i = 0; i < d.length; i++){ const t = i/sr; d[i] = (R()*2 - 1)*Math.exp(-t*160)*0.6; }
    bp(d, sr, 1200 + R()*600, 1.5);
    modes(d, sr, [[300 + R()*120, 70, 0.6]]);
  }));
  // the big launch: a crack plus a falling sub boom
  B.crack = [bake(0.35, (d, sr) => { for (let i = 0; i < d.length; i++){ const t = i/sr; d[i] = (R()*2 - 1)*Math.exp(-t*30)*(1 + 2*Math.exp(-t*300)); } hiPass(d, 0.92); })];
  B.boom = [bake(1.4, (d, sr) => {
    let ph = 0; for (let i = 0; i < d.length; i++){ const t = i/sr, f = 30 + 90*Math.exp(-t*4); ph += 6.2832*f/sr; d[i] = Math.sin(ph)*Math.exp(-t*2.6)*(t < 0.006 ? t/0.006 : 1); }
  })];
}
function surfaceAt(x){
  if (inWater(x)) return 'water';
  if (x > 158 || x < -142) return 'hard';                       // stands and the street outside
  if (x > WALL && x <= 158) return 'hard';                      // outfield seats
  if (Math.abs(x) < 2.8 || Math.abs(x - CX) < 4.2 || (x > 24 && x < 30)) return 'dirt';
  return 'grass';
}
function sfxGround(x, vy){                // vy: impact speed (m/s, positive)
  const s = surfaceAt(x), k = Math.max(0, Math.min(1.5, vy/18));
  if (k < 0.04) return;
  const pan = Math.max(-0.6, Math.min(0.6, (x - cam.x)*cam.z/(W || 1)));
  if (s === 'water') return sfx('splash', {v: 0.5 + 0.4*Math.min(1, k), cool: 0.4, max: 1, pan});
  sfx(s, {v: (0.2 + 0.55*Math.min(1, k))*({dirt: 1, grass: 1.5, hard: 1.15})[s], rate: s === 'hard' ? 0.9 + 0.25*Math.min(1, k) : 1.05 - 0.1*Math.min(1, k), cool: 0.07, max: 2, pan, rev: s === 'hard' && k > 0.6 ? 0.15 : 0});
}
function sfxFall(){
  sfx('scuff', {v: 0.3});
  sfx('body', {v: 0.65, at: 0.11});
  sfx('clatter', {v: 0.25, at: 0.3, rate: 1.1, cool: 0});
  sfx('clatter', {v: 0.18, at: 0.44, rate: 0.85, cool: 0});
}
function duckCrowd(sec){                  // a beat of silence before the roar
  if (!AC || !crowdBed) return; const g = crowdBed.gain, t = AC.currentTime;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.002, t + 0.06); g.setValueAtTime(0.002, t + sec); g.linearRampToValueAtTime(CROWD_BASE, t + sec + 0.5);
}
function sfxLaunch(tier){
  const k = [0, 0.55, 0.8, 1][tier];
  sfx('crack', {v: 0.5*k + 0.2, rev: 0.4});
  sfx('boom', {v: 0.75*k + 0.15, rev: 0.3});
  sfx('pop', {v: 0.8, rate: 0.8, cool: 0});
  duckCrowd(0.55);
}
// --- play: one layer of a sound, with rate/volume/pan, a per-name cooldown and a cap on how many play at once ---
function sfx(name, {v = 0.5, rate = 1, at = 0, pan = 0, rev = 0, cool = 0.03, max = 3} = {}){
  if (!AC || !SFX.bus) return;
  const set = SFX.bank[name]; if (!set) return;
  const t = AC.currentTime + at;
  if (t - (SFX.last[name] ?? -9) < cool) return;
  if ((SFX.live[name] || 0) >= max) return;
  SFX.last[name] = t; SFX.live[name] = (SFX.live[name] || 0) + 1;
  const s = AC.createBufferSource(); s.buffer = set[Math.floor(Math.random()*set.length)];
  s.playbackRate.value = rate*(0.96 + Math.random()*0.08);
  const g = AC.createGain(); g.gain.value = Math.min(1, v);
  let node = s.connect(g);
  if (pan && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); node = node.connect(p); }
  node.connect(SFX.bus);
  if (rev > 0 && SFX.rev){ const rg = AC.createGain(); rg.gain.value = rev; node.connect(rg).connect(SFX.rev); }
  s.onended = () => { SFX.live[name]--; };
  s.start(t);
}
// --- events ---
function sfxRelease(speed, type){      // speed in m/s of the hand
  const k = Math.max(0, Math.min(1, speed/32));
  sfx('tick', {v: type === 'slip' ? 0.15 : 0.18 + 0.2*k, rate: 0.9 + 0.35*k});
  if (type !== 'slip' && type !== 'timeout' && k > 0.15) sfx('whoosh', {v: 0.12 + 0.45*k*k, rate: 0.75 + 0.6*k, at: 0.012});
}
function sfxCatch(speed){              // speed in m/s of the ball at the mitt
  const k = Math.max(0, Math.min(1.4, speed/35));
  sfx('pop', {v: 0.5 + 0.45*Math.min(1, k), rate: 1.06 - 0.12*Math.min(1, k), rev: k > 0.8 ? 0.25*k : 0, pan: 0.25});
  sfx('leather', {v: 0.2 + 0.15*k, at: 0.03, pan: 0.25});
  if (k > 0.8) sfx('sub', {v: 0.4*Math.min(1.3, k), rev: 0.15, pan: 0.15});   // only a real fastball gets the low end
}

// ---------- setup ----------
function reset(){
  pitchId++; CHANT.nextAt = performance.now() + 3500;   // the 응원단 starts up again a few seconds into the wait   // drop every later() still pending from the last pitch
  releaseAll(); demo = null; slowmo = null; paused = false; walkSaid = {}; bodyUsed = false;
  initBody();
  grip = 1; timeLeft = TIME_LIMIT; firstUp = null; bothDownAt = -1;
  ball = {x:0, y:0, vx:0, vy:0, spin:0, rot:0, held:true, landed:false, trail:[], mega:false, rmega:false, maxY:0, strike:false};
  catcher = {x:CX, y:0, vx:0, vy:0, rot:0, mode:'idle', t:0};
  fielder = {look:0, said:false, sb:0};
  { const z0 = Math.min(H/4.3, W/7.5) || 200;                // snap straight back to the mound: no long pan home
    if (cam && Math.abs(cam.x - 1) > 8) cutFade = 0.28;
    cam = {x: P[I.pelvis].x + 0.9, z: z0}; }
  hist = []; elbowHist = []; armRot = 0; prevArm = null; armNet = 0; prevArmS = null; flamT = 0; flamMax = 0; release = null; fx = []; shake = 0; flash = 0; speech = null; lastForm = null;
  bestF = {n:0, t:0}; bestR = {n:0, t:0}; lastPerfect = null; missShown = false;
  state = (state === 'intro') ? 'intro' : 'ready';
  $('result').classList.add('hidden'); $('dexBox').classList.add('hidden');
  $('dist').style.opacity = 0; document.body.classList.remove('flying');
  hideBars(); placeReadyAd(); snap = null; screenAdsLast = null; keysPh = 0;
  if (tut) return tutAfterReset();
  if (state === 'ready'){ showMsg('아무 조작 키나 눌러 시작', 99); $('tip').textContent = pick(TXT.tips); $('tip').style.opacity = 1; comment(readyLine(), 4); }
}

function readyLine(){ return pick(TXT.ready); }
let msgTimer = 0, subTimer = 0;
function showMsg(t, dur=1.4){ $('msg').textContent = t; $('msg').style.opacity = t ? 1 : 0; msgTimer = dur; }
let typeTimer = null;
function comment(t, dur=3, mood='', robo=false){
  if (tut && tut.mic && !robo) return;          // 투구 교실 throw: the robot has the mic
  const txt = t.replace(/^해설:\s*/, ''), booth = $('booth'), el = $('subTxt');
  booth.className = mood; booth.classList.add('talking'); $('bubble').classList.add('show');
  clearInterval(typeTimer); let i = 0; el.textContent = '';
  typeTimer = setInterval(() => {
    i++; el.textContent = txt.slice(0, i);
    const ch = txt[i-1]; if (i % 2 === 1 && ch && !/[\s.,!?…~“”()]/.test(ch)) babble(mood);
    if (i >= txt.length){ clearInterval(typeTimer); booth.classList.remove('talking'); }
  }, 40);
  subTimer = dur + txt.length*0.04 + 0.6;
}
function say(text, dur=1.2, who='p'){ speech = {text, t:dur, who, age: 0}; }
function robotSay(text, dur=3){ speech = null; comment(text, dur, '', true); }   // the robot talks from the caster's seat

// ---------- input ----------
function releaseAll(){ chord = []; for (const k of Object.keys(down)) if (down[k]) press(k, false, true); }
function press(code, isDown, fromDemo){
  if (code === 'KeyG' && isDown && !fromDemo){ toggleJoints(); return; }
  if (code === 'KeyT' && isDown && state === 'intro' && !$('intro').classList.contains('hidden')){ tutStart(); return; }
  if (tut && isDown && (code === 'Escape' || code === 'Space') && !fromDemo){ if (tut.phase === 'end' && code === 'Space') tutExit(true); else if (code === 'Escape') tutExit(false); return; }
  if (tut && isDown && !fromDemo) tut.pressed.add(code);
  if ((code === 'Space' || code === 'Escape') && isDown && state !== 'intro'){ reset(); keepGrip(); return; }   // 다시 = Space (Esc kept as a quiet alias)
  if (code === 'Escape') return;
  if (code === 'Enter' && isDown && state === 'result'){ reset(); return; }
  if ((code === 'Space' || code === 'Enter') && isDown && state === 'intro' && !$('startBtn').classList.contains('hidden')){ $('startBtn').click(); return; }
  if (demo && !fromDemo) return;
  if (!(code in KEYMAP)) return;
  if (tut && tut.phase === 'learn' && tut.step < 4 && isDown && !fromDemo && code !== tutKeyNow()){ tutLockedKey(code); return; }
  if (tut && tut.phase === 'learn' && tut.step === 4 && isDown && !fromDemo && code !== 'KeyK' && code !== 'KeyL'){ tutLockedKey(code); return; }
  const was = !!down[code];
  if (was === isDown) return;
  down[code] = isDown;
  if (isDown && code !== 'KeyK' && code !== 'KeyL') bodyUsed = true;
  document.querySelectorAll(`[data-k="${code}"]`).forEach(el => el.classList.toggle('on', isDown));
  if (state === 'ready' && isDown){
    state = 'windup'; wuAt = now; $('tip').style.opacity = 0;
    if (fromDemo) showMsg(tut && tut.slow ? '▶ 느린 화면 · 로봇 시범 투구' : '시범 투구 (자동 재생)', tut && tut.slow ? 99 : 1.3); else showMsg('', 0);
    comment(pick(TXT.start), 2.5);
  }
  if ((code === 'KeyK' || code === 'KeyL') && state === 'windup' && ball.held && !(tut && tut.step < 5)){
    const j = !!down.KeyK, k = !!down.KeyL;
    if (isDown && j && k){ bothDownAt = now; firstUp = null; }
    if (!isDown){
      if ((code === 'KeyK' ? k : j)){ if (bothDownAt >= 0) firstUp = {key: code, t: now}; }
      else {
        if (firstUp && now - firstUp.t < 0.03) doRelease('clean', 0);
        else if (firstUp && now - firstUp.t < 0.45) doRelease(firstUp.key === 'KeyK' ? 'top' : 'back', now - firstUp.t);
        else if (bothDownAt >= 0 && !firstUp) doRelease('clean', 0);
        else if (bothDownAt >= 0) doRelease('drag', now - firstUp.t);
      }
    }
  }
}
// Human hands never hit four keys at exactly the same instant. Key changes that arrive within
// CHORD_MS of the first one are gathered and applied together, so a slightly ragged chord
// counts as one move. Every key goes through the same queue, so the rhythm between moves is kept.
const CHORD_MS = 50;
let chord = [], chordEnd = 0;
function queueKey(code, isDown){
  if (!(code in KEYMAP)) return press(code, isDown);          // Esc / Space / Enter act at once
  if (!chord.length) chordEnd = performance.now() + CHORD_MS;
  chord.push([code, isDown]);
}
function flushChord(force){
  if (chord.length && (force || performance.now() >= chordEnd)){ const c = chord; chord = []; c.forEach(([k, d]) => press(k, d)); }
}
// Physically held keys. A restart wipes the game's key state, but fingers already resting on the
// grip keys (K/L) are still holding the ball: carry that over so the next release actually throws.
const phys = {};
function keepGrip(){
  if (demo) return;
  for (const k of ['KeyK', 'KeyL']) if (phys[k]){ down[k] = true; document.querySelectorAll(`[data-k="${k}"]`).forEach(el => el.classList.add('on')); }
  if (phys.KeyK && phys.KeyL) bothDownAt = now;
}
addEventListener('keydown', e => { phys[e.code] = true; });
addEventListener('keyup', e => { delete phys[e.code]; });
addEventListener('blur', () => { for (const k in phys) delete phys[k]; });
addEventListener('keydown', e => { if (e.code in KEYMAP || e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') e.preventDefault(); if (!e.repeat) queueKey(e.code, true); });
addEventListener('keyup', e => queueKey(e.code, false));
addEventListener('blur', () => {
  flushChord(true);
  if (state === 'windup' && ball.held){
    // Alt+Tab with the ball in hand used to "let go" of K/L and count as a throw. Instead: pause, and quietly drop the grip
    // keys without releasing, so on return the player has to grab the ball again (K+L) before the hand gives up.
    paused = true;
    for (const k of ['KeyK', 'KeyL']) if (down[k]){ down[k] = false; document.querySelectorAll(`[data-k="${k}"]`).forEach(el => el.classList.remove('on')); }
    bothDownAt = -1; firstUp = null;
    showMsg('중계 일시 중단', 99); $('tip').textContent = '돌아오면 공을 다시 쥐세요 (K+L)'; $('tip').style.opacity = 1;
  }
  Object.keys(down).forEach(k => press(k, false));
});
addEventListener('focus', () => { if (paused){ paused = false; showMsg('중계 재개', 1.2); $('tip').style.opacity = 0; } });

// DEMO-START — everything down to DEMO-END is cut out of the release build by build_release.py
// recorded inputs that are known to work (sim-time seconds)
const DEMO_F = [[0,'KeyK',1],[0,'KeyL',1],[0.3,'KeyQ',1],[0.75,'KeyQ',0],[0.75,'KeyA',1],[0.75,'KeyS',1],[0.75,'KeyE',1],[0.75,'KeyJ',1],
  [1.08,'KeyK',0],[1.08,'KeyL',0],[1.35,'KeyA',0],[1.35,'KeyS',0],[1.35,'KeyE',0],[1.35,'KeyJ',0]];
// same pitch with one ingredient missing: lands a smaller catcher launch (found by sweeping the timings)
const demoVar = (rel, drop, aDel) => DEMO_F.filter(([t,k]) => k !== drop).map(([t,k,v]) => [(k === 'KeyK' || k === 'KeyL') && v === 0 ? rel : (k === 'KeyA' && v === 1 ? t + aDel : t), k, v]);
const DEMO_F1 = demoVar(1.09, 'KeyQ', 0.15), DEMO_F2 = demoVar(1.09, '', 0.25);
const DEMO_R = [[0,'KeyK',1],[0,'KeyL',1],[0.3,'KeyQ',1],[0.5,'KeyS',1],[0.5,'KeyD',1],[0.5,'KeyU',1],
  [RELT_R,'KeyK',0],[RELT_R,'KeyL',0],[1.1,'KeyQ',0],[1.1,'KeyS',0],[1.1,'KeyD',0],[1.1,'KeyU',0]];
const DEMO_S = [[0,'KeyK',1],[0,'KeyL',1],[0.3,'KeyQ',1],[0.3,'KeyS',1],[0.3,'KeyU',1],[0.55,'KeyS',0],[0.55,'KeyU',0],
  [RELT_S,'KeyK',0],[RELT_S,'KeyL',0],[0.9,'KeyQ',0]];
function gaitSeq(a, b, p, T){
  const seq = [[0,'KeyK',1],[0,'KeyL',1]]; let cur = null;
  for (let i = 0, t = 0; t < T; i++, t += p){
    const nx = i % 2 ? b : a, tt = Math.round(t*1e4)/1e4;
    if (cur) cur.filter(k => !nx.includes(k)).forEach(k => seq.push([tt, k, 0]));
    nx.filter(k => !cur || !cur.includes(k)).forEach(k => seq.push([tt, k, 1]));
    cur = nx;
  }
  return seq;
}
function sfxTest(){   // dev only: hear each new sound, slow then fast
  audioInit(); const seq = [() => sfxRelease(8, 'clean'), () => sfxRelease(20, 'clean'), () => sfxRelease(32, 'clean'),
    () => sfxCatch(4), () => sfxCatch(20), () => sfxCatch(36), () => sfxCatch(75),
    () => sfxGround(1, 8), () => sfxGround(60, 12), () => sfxGround(200, 14), () => sfxGround(770, 10), () => sfxFall(), () => sfxLaunch(3)];
  seq.forEach((f, i) => setTimeout(f, 300 + i*900)); showMsg('효과음 테스트: 릴리스 → 포구 → 흙·잔디·바닥·물 → 넘어짐 → 발사', 12);
}
const DEMO_H = gaitSeq(['KeyW','KeyA'], ['KeyS','KeyQ'], 0.3, 19);
const DEMO_B = gaitSeq(['KeyA','KeyW'], ['KeyQ'], 0.45, 19);   // shuffles backwards to the 2nd baseman
const DEMO_K = [[0,'KeyK',1],[0,'KeyL',1],[0.25,'KeyK',0],[0.25,'KeyL',0]];                       // sulk: grab and let go, body untouched
const DEMO_L = [[0,'KeyK',1],[0,'KeyL',1],[0,'KeyQ',1],[0,'KeyS',1],[0,'KeyD',1],                       // lie down, then let go
                [2.2,'KeyQ',0],[2.2,'KeyS',0],[2.2,'KeyD',0],[2.6,'KeyK',0],[2.6,'KeyL',0]];
function startDemo(seq){
  audioInit(); releaseAll();
  $('intro').classList.add('hidden'); if (state === 'intro') state = 'ready';
  reset(); demo = {t:0, i:0, seq};
}
document.querySelectorAll('[data-demo]').forEach(b => b.onclick = () => (b.dataset.demo === 'x' ? sfxTest() : startDemo({f: DEMO_F, f1: DEMO_F1, f2: DEMO_F2, r: DEMO_R, s: DEMO_S, h: DEMO_H, b: DEMO_B, k: DEMO_K, l: DEMO_L}[b.dataset.demo])));
const SHOW_DEMOS = true;   // 개발용 시범 버튼. 완성 후 false로 바꾸면 전부 사라짐
function refreshDemos(){
  document.querySelectorAll('[data-demo]').forEach(b => b.classList.toggle('hidden', !SHOW_DEMOS));
}
refreshDemos();
// DEMO-END
$('startBtn').onclick = () => { audioInit(); $('intro').classList.add('hidden'); state = 'ready'; reset(); };
$('againBtn').onclick = () => { audioInit(); reset(); };
// ---------- 투구 교실 (tutorial) ----------
// The robot is bolted to a stand (ROBOT_PIN holds its pelvis and chest in place) so nothing the player presses can knock it over.
// Nothing here counts: no tries, no best, no titles. The finale is a recorded pitch (catcher into the stands, ★ tier).
let ROBO_V = 34;   // robot release speed (m/s): a long fly ball into the outfield, short of the wall
const ROBO_SEQ = [[0,'KeyK',1],[0,'KeyL',1],[0.9,'KeyA',1],[0.75,'KeyS',1],[0.75,'KeyE',1],[0.75,'KeyJ',1],[1.09,'KeyK',0],[1.09,'KeyL',0],[1.35,'KeyA',0],[1.35,'KeyS',0],[1.35,'KeyE',0],[1.35,'KeyJ',0]];
const K_ = k => `<span class="key">${k}</span>`;
// step 6 suggestions: examples only, never required (the lesson shouldn't crown one 'correct' key)
const TUT_WAYS = [
  ['풍차 투구', `${K_('E')}로 팔을 돌리다 놓기`], ['와인드업', `${K_('Q')}로 다리 들고 → ${K_('A')}${K_('S')} 내딛으며 ${K_('E')} → 놓기`],
  ['역풍차', `${K_('D')}로 팔을 반대로 돌리다 놓기`], ['팔꿈치 채찍', `${K_('U')}로 접었다가 ${K_('J')}로 펴면서 놓기`],
  ['디딤 투구', `${K_('S')}로 축발을 밀면서 ${K_('E')} → 놓기`]];
const TUT_BODY = ['KeyQ','KeyA','KeyW','KeyS','KeyE','KeyD','KeyU','KeyJ'];
const SLOT_TALK = {over:'오버핸드가 나왔네요! 위에서 내리꽂았습니다.', three:'쓰리쿼터가 나왔네요! 교과서 같은 각도입니다.', side:'사이드암이 나왔네요! 옆으로 휘둘렀습니다.',
  under:'언더핸드가 나왔네요! 아래에서 퍼 올렸습니다.', sub:'잠수함 투구가 나왔네요! 손이 땅을 스쳤습니다.'};
const TUT_STEPS = [
  // steps 1-4 teach one key at a time: ① the first key alone, then ② let go of it and hold the other one alone
  // (the two keys of a joint pull opposite ways, so holding both just makes them fight and you see nothing)
  {n:'앞다리', j:I.lknee, msg:`앞다리: ① ${K_('Q')} 꾹 → <b>들기</b> &nbsp;② ${K_('A')} 꾹 → <b>뒤로 차기</b> <small>(한 번에 한 키씩)</small>`,
   todo:[['KeyQ','① Q만 꾹 누르고 있기'],['KeyA','② Q를 떼고 A만 꾹 누르고 있기']],
   hi:'Q만 꾹 누르고 있어 보세요. 누르는 동안 앞다리가 들리고, 떼면 내려옵니다. 삐빅.', next:'좋아요. 이제 Q를 떼고, A만 꾹 눌러 보세요. 삐빅.',
   ok:'좋습니다. 투구는 앞다리를 들었다가 내딛으며 시작합니다.'},
  {n:'축발', j:I.bknee, msg:`축발(뒷다리): ① ${K_('W')} 꾹 → <b>앞으로</b> &nbsp;② ${K_('S')} 꾹 → <b>뒤로 차서 밀기</b> <small>(한 번에 한 키씩)</small>`,
   todo:[['KeyW','① W만 꾹 누르고 있기'],['KeyS','② W를 떼고 S만 꾹 누르고 있기']],
   hi:'이번엔 뒷다리입니다. W만 꾹 누르고 있어 보세요.', next:'좋아요. 이제 W를 떼고, S만 꾹 눌러 보세요. 삐빅.',
   ok:'축발로 땅을 밀어야 공에 힘이 실립니다.'},
  {n:'어깨', j:I.neck, msg:`어깨: ① ${K_('E')} 꾹 → <b>던지는 방향으로 돌기</b> &nbsp;② ${K_('D')} 꾹 → <b>반대로 돌기</b> <small>(한 번에 한 키씩)</small>`,
   todo:[['KeyE','① E만 꾹 누르고 있기'],['KeyD','② E를 떼고 D만 꾹 누르고 있기']],
   hi:'어깨입니다. E만 꾹 누르고 있어 보세요. 팔이 뒤에서 위로, 다시 앞으로 돕니다.', next:'좋아요. 이제 E를 떼고, D만 꾹 눌러 보세요. 삐빅.',
   ok:'던지는 힘은 대부분 E에서 나옵니다. 너무 오래 돌리면 헬리콥터가 됩니다. 삐빅.'},
  {n:'팔꿈치', j:I.relb, msg:`팔꿈치: ① ${K_('U')} 꾹 → <b>접기</b> &nbsp;② ${K_('J')} 꾹 → <b>펴기</b> <small>(놓는 순간 펴져 있으면 공이 멀리 가요)</small>`,
   todo:[['KeyU','① U만 꾹 누르고 있기'],['KeyJ','② U를 떼고 J만 꾹 누르고 있기']],
   hi:'팔꿈치입니다. 오른손 U만 꾹 누르고 있어 보세요.', next:'좋아요. 이제 U를 떼고, J만 꾹 눌러 보세요. 삐빅.',
   ok:'몸 쓰는 법은 다 배웠습니다. 이제 공을 쥐어 봅시다.'},
  {n:'공 쥐기', j:I.rhand, msg:`${K_('K')}${K_('L')}를 <b>같이 꾹 누르고, 계속 누르고 있으세요.</b> 경기에서는 이걸 <b>가장 먼저</b> 해야 해요. 안 쥐고 몸부터 움직이면 손에 땀이 나서 공이 빠집니다.`,
   todo:[['grip','K+L 같이 꾹 누르고 있기 (1초)']],
   hi:'K와 L, 손가락 두 개로 공을 쥡니다. 같이 꾹 누르고 떼지 마세요.', ok:'좋아요, 그대로 떼지 마세요! 바로 던져 봅시다.'},
  {n:'던지기', j:null, msg:`이제 <b>원하는 투구폼으로</b> 던져 보세요. K·L을 쥔 채로 <b>몸 키를 하나 이상</b> 움직이다가, K·L을 같이 떼는 순간 공이 나갑니다.`,
   todo:[['body','몸 키 하나 이상 움직이기'],['throw','K·L을 떼서 던지기']],
   hi:'이제 자유롭게 던져 보세요. 어떤 키를 써도 괜찮습니다. 같은 키라도 놓는 순간에 따라 매번 다르게 날아가요. 삐빅.', ok:''},
  {n:'완성', j:null, msg:'수고하셨습니다! 마지막으로 <b>제대로 던진 투구</b>를 보여 드릴게요.', todo:[['show','로봇 시범 투구 · <b>자동 투구라서 최고 기록과 칭호에는 들어가지 않습니다</b>']],
   hi:'잘 던지면 이렇게 됩니다. 삐빅.', ok:''},
];
function tutStart(){
  audioInit(); releaseAll(); $('intro').classList.add('hidden');
  tut = {step: 0, phase: 'learn', pressed: new Set(), held: new Set(), hs: {}, gripT: 0, doneAt: null, thrown: false, thrownAt: null};
  document.body.classList.add('tut'); state = 'ready'; reset();
  tutMic(true);                        // the whole lesson is voiced by the robot from the caster's seat
  tutEnter(0);
}
function tutAfterReset(){             // reset() lands here while the lesson is on: put the robot back to work
  if (tut.phase === 'learn'){ state = 'windup'; wuAt = now; }
  showMsg('', 0); $('tip').style.opacity = 0; readyAd = null; screenAds = null;
  ROBOT_PIN = tut.phase === 'learn' ? [[I.pelvis, P[I.pelvis].x, P[I.pelvis].y + 0.1], [I.neck, P[I.neck].x, P[I.neck].y + 0.1]] : null;   // lifted 10cm: feet hang free over the stand's base plate
  for (const k of ['KeyK', 'KeyL']) if (phys[k]) down[k] = true;
}
function tutEnter(i){
  tut.step = i; tut.pressed = new Set(); tut.held = new Set(); tut.hs = {}; tut.bothSaidAt = null; tut.lockSaidAt = null; tut.gripT = 0; tut.gripAt = null; tut.doneAt = null; tut.thrown = false;
  const st = TUT_STEPS[i];
  if (i === 5){ tut.bodyOk = false; tut.bs = {}; tut.thrownAt = null;
    if (!tut.ways){ const pool = TUT_WAYS.slice().sort(() => Math.random() - 0.5); tut.ways = pool.slice(0, 3); } }
  if (i === 5 && down.KeyK && down.KeyL){ bothDownAt = now; firstUp = null; }   // the grip carried over from step 5 counts: letting go now throws
  if (i === 6){
    tut.phase = 'finale'; tut.demoOn = false; robotSay('거치대 해제. 이번엔 제가 던져 볼게요. 느린 화면으로 보여 드릴 테니 제 몸을 잘 보세요. 삐빅.', 3);   // stays bolted until the reset below
    // start the recording straight after a fresh reset, exactly like a demo, so the pitch plays out the same every time
    setTimeout(() => { if (tut && tut.phase === 'finale'){ releaseAll(); reset(); robotSay('K·L로 공을 쥐고 → A·S로 두 다리를 버티고 → E로 팔을 돌리면서 J로 팔꿈치를 펴고 → 놓습니다!', 6); showMsg('▶ 느린 화면 · 로봇 시범 투구', 99);
      demo = {t: 0, i: 0, seq: ROBO_SEQ}; tut.demoOn = true; tut.slow = true; } }, 3200);
  } else robotSay((i === 0 ? '안녕하세요, 강사 삐걱로보 T-1입니다. 저는 거치대에 볼트로 고정돼 있어서 절대 안 넘어져요. ' : '') + st.hi, 99);
  tutPanel();
}
function tutChecks(){
  const st = TUT_STEPS[tut.step];
  return st.todo.map(([id]) => id === 'grip' ? tut.gripT >= 1 : id === 'throw' ? tut.thrown : id === 'body' ? !!tut.bodyOk : id === 'show' ? false : tut.held.has(id));
}
function tutKeyNow(){                                             // steps 1-4: the key whose turn it is (① first key, then ② second)
  const [[ka], [kb]] = TUT_STEPS[tut.step].todo; return tut.held.has(ka) ? kb : ka;
}
function tutLockedKey(code){                                      // a key that isn't this step's: nothing moves; say which one is
  if (tut.lockSaidAt && now - tut.lockSaidAt < 4) return; tut.lockSaidAt = now;
  // say what the big key says right now: press it, let it go, or keep holding it
  if (tut.step === 4){ robotSay(tut.doneAt != null ? 'K와 L은 떼지 말고 그대로 쥐고 있어요. 삐빅.' : '지금은 K와 L만 같이 꾹 눌러 보세요. 삐빅.', 2.4); return; }
  const [[ka], [kb]] = TUT_STEPS[tut.step].todo, cur = tutKeyNow(), rel = tutReleaseKey();
  robotSay(rel ? `지금은 ${rel.slice(3)}를 떼 보세요. 삐빅.` : cur === ka ? `지금은 ${ka.slice(3)}만 꾹 눌러 보세요. 삐빅.` : down[ka] ? `${ka.slice(3)}를 떼고 ${kb.slice(3)}만 꾹 눌러 보세요. 삐빅.` : `지금은 ${kb.slice(3)}만 꾹 눌러 보세요. 삐빅.`, 2.4);
}
function tutKeyShow(){                                            // the big key(s): which one, pressed or not, how long so far
  const el = $('tutKey'), cap1 = $('tutKeyCap1'), cap2 = $('tutKeyCap2');
  const two = tut && tut.step === 4, rel = tut && tut.step < 4 && tutReleaseKey();
  if (!tut || tut.phase !== 'learn' || tut.step > 4 || (tut.doneAt != null && !two && !rel)){ el.classList.add('hidden'); return; }
  el.classList.remove('hidden'); el.classList.toggle('two', two); el.classList.remove('down');
  let bar = 0, lab = '', release = false, keep = false;
  if (two){                                                        // 5. 공 쥐기: K and L together, held one second, and then kept held
    $('tutKeyL').textContent = 'K'; $('tutKeyL2').textContent = 'L';
    cap1.classList.toggle('on', !!down.KeyK); cap2.classList.toggle('on', !!down.KeyL);
    keep = tut.doneAt != null; bar = keep ? 1 : Math.min(1, tut.gripT || 0);
    lab = keep ? '<b>떼지 말고</b> 그대로 계속 쥐고 있기' : '<b>K+L</b> 같이 꾹 누르고 있기';
  } else {
    const [[ka], [kb]] = TUT_STEPS[tut.step].todo, cur = tutKeyNow(), letGo = rel || (cur !== ka && down[ka] ? ka : null);
    const k = letGo || cur, held = tut.hs[cur] != null ? Math.min(1, (now - tut.hs[cur])/0.5) : 0;
    $('tutKeyL').textContent = k.slice(3); cap1.classList.toggle('on', !!down[k] && !letGo);
    release = !!letGo; bar = letGo ? 1 : held;
    lab = letGo ? `${letGo === kb ? '② ' : ''}<b>${letGo.slice(3)}</b> 떼기` : `${cur === ka ? '①' : '②'} <b>${cur.slice(3)}</b> 꾹 누르고 있기`;
  }
  el.classList.toggle('release', release); el.classList.toggle('keep', keep);
  $('tutKeyLab').innerHTML = lab; $('tutKeyBar').style.width = (bar*100) + '%';
  if (document.body.classList.contains('tutkey-top')){ const r = $('tutPanel').getBoundingClientRect(); el.style.left = (r.left + r.width/2 - 60) + 'px'; el.style.top = (r.bottom + 14) + 'px'; }
  else { const [x, y] = W2S(P[I.pelvis].x + 1.1, P[I.pelvis].y + 0.6); el.style.left = x + 'px'; el.style.top = (y - 60) + 'px'; }
}
function tutReleaseKey(){                                         // ② is done but its key is still down: the step waits for it to come up
  const [, [kb]] = TUT_STEPS[tut.step].todo; return tut.held.has(kb) && down[kb] ? kb : null;
}
function tutTick(dt){
  if (tut.phase !== 'learn') return;
  if (down.KeyK && down.KeyL){ if (tut.gripAt == null) tut.gripAt = now; tut.gripT = now - tut.gripAt; } else { tut.gripAt = null; if (tut.step === 4 && tut.doneAt == null) tut.gripT = 0; }
  tut.hs = tut.hs || {};
  if (tut.step < 4){                                               // steps 1-4: ① first key alone, then ② the other key alone
    const [[ka], [kb]] = TUT_STEPS[tut.step].todo, cur = tut.held.has(ka) ? kb : ka, other = cur === ka ? kb : ka;
    if (down[ka] && down[kb]){                                     // both at once: doesn't count; ask for one at a time (not too often)
      tut.hs[cur] = null;
      if (!tut.bothSaidAt || now - tut.bothSaidAt > 4){ tut.bothSaidAt = now;
        robotSay(cur === ka ? `같이 누르지 말고 따로 눌러 보세요. 지금은 ${ka.slice(3)}만 꾹. 삐빅.`
                            : `같이 누르지 말고 따로요. ${ka.slice(3)}를 떼고 ${kb.slice(3)}만 꾹 눌러 보세요. 삐빅.`, 2.6); }
    } else if (down[cur] && !down[other] && !tut.held.has(cur)){                         // "꾹 누르고 있기" = that key alone, held for half a second
      if (tut.hs[cur] == null) tut.hs[cur] = now;
      if (now - tut.hs[cur] >= 0.5){ tut.held.add(cur); tut.hs[cur] = null; robotSay(cur === ka ? TUT_STEPS[tut.step].next : `좋아요. 이제 ${kb.slice(3)}를 떼 보세요. 삐빅.`, 2.6); }
    } else { if (tut.hs[cur] != null && !down[cur] && now - tut.hs[cur] < 0.5 && (!tut.lockSaidAt || now - tut.lockSaidAt > 4)){ tut.lockSaidAt = now; robotSay('조금 더 길게 꾹 눌러 보세요. 삐빅.', 2.2); }
      tut.hs[cur] = null; }
  } else for (const k of ['KeyQ','KeyA','KeyW','KeyS','KeyE','KeyD','KeyU','KeyJ']){   // later steps: any body key held half a second
    if (down[k]){ if (tut.hs[k] == null) tut.hs[k] = now; if (now - tut.hs[k] >= 0.5) tut.held.add(k); } else tut.hs[k] = null; }
  if (tut.step === 5 && ball.held){                                // a body key held 0.25s+ while gripping counts as "making a form"
    tut.bs = tut.bs || {};
    for (const k of TUT_BODY){ if (down[k] && down.KeyK && down.KeyL){ if (tut.bs[k] == null) tut.bs[k] = now; if (now - tut.bs[k] >= 0.25) tut.bodyOk = true; } else tut.bs[k] = null; }
  }
  if (tut.step === 5 && !ball.held && tut.thrownAt == null){
    tut.thrownAt = now;
    if (!tut.bodyOk){ tut.retry = true; robotSay('몸 키를 하나 이상 움직인 뒤 K·L을 떼어 보세요. 어떤 키든 괜찮아요. 공은 제가 다시 쥘게요. 삐빅.', 2.4); }
    else {                                                         // name what came out: the same keys rarely give the same pitch twice
      tut.thrown = true; tutPanel();
      const ex = release && release.extra, fwd = release && Math.abs(release.ang) < 90;
      robotSay(!fwd ? '공이 뒤로 갔네요. 원래 다 그래요. 놓는 순간을 조금만 바꿔 보세요. 삐빅.'
        : ex && ex.slot ? SLOT_TALK[ex.slot] + ' 삐빅.' : '공이 발밑으로 떨어졌네요. 그래도 던진 건 던진 겁니다. 삐빅.', 2.4);
    }
  }
  if (tut.thrownAt != null && now - tut.thrownAt > (tut.retry ? 2.6 : 4.2)){   // a good throw: time to watch it land and hear the robot on it; a retry nudge stays short
    tut.thrownAt = null;
    if (tut.retry){ tut.retry = false; releaseAll(); reset(); tutEnter(5); return; }   // try the throw again with a fresh grip
    tutEnter(6); return;
  }
  tutKeyShow();
  const c = tutChecks();
  const key = String(c) + !!(down.KeyK && down.KeyL);
  if (key !== tut.lastC){ tut.lastC = key; tutPanel(); }
  if (tut.step < 5 && c.every(Boolean) && tut.doneAt == null && !(tut.step < 4 && tutReleaseKey())){ tut.doneAt = now; robotSay(TUT_STEPS[tut.step].ok, 2.6); sfx('pop', {v: 0.35, rate: 1.5}); tutPanel(); }
  if (tut.doneAt != null && now - tut.doneAt > (tut.step === 4 ? 1.2 : 2.4)) tutEnter(tut.step + 1);   // grip flows straight into the throw
}
function tutThrown(){
  state = 'tutwait';
  if (tut.phase === 'finale' && !tut.demoOn) return;      // that was the player's ball landing, not the robot's pitch
  if (tut.phase === 'finale'){ tut.phase = 'end'; tutPanel(); robotSay(`${ball.x.toFixed(0)}m! 잘 던지면 공이 이만큼 날아갑니다. 더 잘 던지면… 그건 직접 확인하세요. 이제 여러분 차례입니다. 삐빅.`, 99); }
  // during the lesson the result isn't shown: tutTick moves on to the robot's pitch by itself
}
function tutMic(on){                 // swap the lower-third speaker: caster <-> robot
  if (tut) tut.mic = on; document.body.classList.toggle('robomic', on);
  document.querySelector('#bubble .who').innerHTML = on ? '강사 <em>삐걱로보 T-1</em>' : '해설 <em>박덜컹</em> (신입)';
}
function tutExit(toGame){
  $('tutKey').classList.add('hidden');
  tutMic(false); tut = null; ROBOT_PIN = null; demo = null; releaseAll(); document.body.classList.remove('tut'); $('tutPanel').classList.add('hidden');
  if (toGame){ state = 'ready'; reset(); }
  else { state = 'intro'; reset(); $('intro').classList.remove('hidden'); }
}
function tutPanel(){
  const el = $('tutPanel'); el.classList.remove('hidden');
  if (tut.phase === 'end'){
    el.innerHTML = `<div class="hd"><span class="tag">SBC 삐걱방송 · 투구 교실</span><span>강사: 삐걱로보 T-1</span></div>
      <div class="steps">${TUT_STEPS.map((s, i) => `<span class="done">✔ ${i + 1}. ${s.n}</span>`).join('')}</div>
      <div class="msg">투구 교실 수료! 이제 진짜 마운드에 오를 차례입니다.</div>
      <div class="btns"><button class="btn" id="tutGo">마운드에 오르기 (Space)</button><button class="btn ghost small" id="tutAgain">투구 교실 다시</button><button class="btn ghost small" id="tutOut">처음 화면 (Esc)</button></div>`;
    $('tutGo').onclick = () => tutExit(true); $('tutAgain').onclick = () => { tutExit(false); tutStart(); }; $('tutOut').onclick = () => tutExit(false);
    return;
  }
  const st = TUT_STEPS[tut.step], c = tutChecks();
  el.innerHTML = `<div class="hd"><span class="tag">SBC 삐걱방송 · 투구 교실</span><span>강사: 삐걱로보 T-1</span></div>
    <div class="steps">${TUT_STEPS.map((s, i) => `<span class="${i < tut.step ? 'done' : i === tut.step ? 'now' : ''}">${i < tut.step ? '✔ ' : ''}${i + 1}. ${s.n}</span>`).join('')}</div>
    <div class="msg">${st.msg}</div>${tut.step === 5 && tut.ways ? `<div class="ways">예를 들면 · ${tut.ways.map(([n, how]) => `<span><b>${n}</b> ${how}</span>`).join('')}</div>` : ''}
    <div class="todo">${tut.step === 5 && !tut.thrown && !(down.KeyK && down.KeyL) ? '<b>먼저 K+L을 다시 꾹 쥐세요</b> · ' : ''}${tut.step < 6 ? '해 볼 것: ' : ''}${st.todo.map(([id, t], i) => tut.step < 6 ? `<span class="${c[i] ? 'ok' : tut.step < 4 && i > 0 && !c[i - 1] ? 'wait' : ''}">${t} ${c[i] ? '✔' : '☐'}</span>` : t).join(' · ')}</div>
    <div class="ft"><span>Esc 투구 교실 나가기</span><span>${tut.step < 4 ? '키는 누르고 있는 동안만 움직이고, 떼면 제자리로 돌아와요' : tut.step === 4 ? '이 단계에서는 손을 떼도 공이 안 나가요' : tut.step === 5 ? '지금부터는 K·L을 떼면 진짜 던집니다' : ''}</span></div>`;
}
function toggleJoints(){
  jointTags = !jointTags; try { localStorage.setItem('pitchqwop.joints', jointTags ? '1' : '0'); } catch(e){}
  const b = $('jointBtn'); if (b){ b.textContent = jointTags ? '🦴 관절 표시 켜짐 (G)' : '🦴 관절 표시 (G)'; b.classList.toggle('on', jointTags); }
}
$('jointBtn').onclick = e => { e.currentTarget.blur(); toggleJoints(); };
jointTags = !jointTags; toggleJoints();            // paint the button in the saved state
$('tutBtn').onclick = () => tutStart();

$('restartBtn').onclick = e => { e.currentTarget.blur(); audioInit(); if (state !== 'intro') reset(); };

function inputs(){
  const o = {}; for (const c in KEYMAP) o[KEYMAP[c]] = !!down[c];
  if (state === 'result' || state === 'intro' || state === 'special') for (const k in o) o[k] = false;
  return o;
}

// ---------- form check ----------
function formNow(){
  const h = P[I.rhand], nk = P[I.neck], pel = P[I.pelvis];
  const vx = (h.x-h.px)/DT, vy = (h.y-h.py)/DT, v = Math.hypot(vx, vy), ang = Math.atan2(vy, vx)*180/Math.PI;
  const stride = P[I.lank].x - P[I.bank].x;
  const tilt = Math.atan2(nk.x - pel.x, nk.y - pel.y)*180/Math.PI;   // + forward, - leaning back
  const lift = P[I.lank].y, headY = P[I.head].y;
  const f = [vx > 0 && ang >= 22 && ang <= 55, v >= 18, stride >= 0.6 && lift < 0.12, headY > 1.2 && !body.fallen];
  const r = [vx < 0 && ang >= 125 && ang <= 158, v >= 18, tilt <= -30, headY > 0.9 && lift >= 0.2];
  // "is this an actual pitching motion?" — no score effect, only praise
  const elbowNow = elbowHist.length ? elbowHist[elbowHist.length-1] : 0, elbowMax = elbowHist.length ? Math.max(...elbowHist) : 0;
  const so = {tilt, headY, fallen: body.fallen, elbowMax, elbowNow, vx, ang, v, stride, lift, front: h.x - nk.x, turns: armRot/(Math.PI*2)};
  const s = seriousScore(so);
  return {f, r, s, so, fAll: f.every(Boolean), rAll: r.every(Boolean), v, vx, vy, ang, stride, tilt, lift, headY, elbowMax, elbowNow, armTurns: armRot/(Math.PI*2)};
}

const cl01 = x => Math.max(0, Math.min(1, x));
// 0~10 "how much does this look like real pitching" — praise only, no distance effect
function seriousScore(o){
  const tilt = (o.fallen || o.headY <= 1.1) ? 0 : (o.tilt < 12 ? cl01(o.tilt/12) : o.tilt <= 50 ? 1 : cl01((70 - o.tilt)/20));
  const elb = (cl01(o.elbowMax/60) + (o.elbowNow <= 35 ? 1 : cl01((70 - o.elbowNow)/35)))/2;
  const low = o.vx <= 0 ? 0 : (o.ang >= -15 && o.ang <= 12 ? 1 : o.ang > 12 ? cl01((40 - o.ang)/28) : cl01((o.ang + 45)/30)) * cl01(o.v/8);
  const str = cl01(o.stride/0.8) * (o.lift < 0.12 ? 1 : 0.5);
  const fr = cl01((o.front + 0.3)/0.4);
  const wm = o.turns <= 1.1 ? 1 : cl01((2.5 - o.turns)/1.4);
  const parts = [tilt, elb, low, str, fr, wm], w = [2, 2, 2, 1.5, 1, 1.5];
  const total = parts.reduce((a, p, i) => a + p*w[i], 0);
  return {total, pts: Math.floor(total + 0.05), parts, low};
}
const SERIOUS_NUDGE = [
  o => o.tilt < 12 ? '상체가 너무 꼿꼿했어요.' : '상체를 너무 숙였어요. 절하는 줄 알았습니다.',
  o => o.elbowMax < 60 ? '팔꿈치를 한 번 접었다 펴야 하는데요.' : '팔꿈치를 끝까지 못 폈어요.',
  o => o.ang > 12 ? '공이 너무 떴어요. 포수는 저 아래 있습니다.' : '공을 땅에 꽂으셨네요.',
  o => '보폭이 좁아요. 한 발 더, 아니 반 발 더.',
  o => '공을 너무 뒤에서 놨어요. 조금 더 앞에서.',
  o => '팔을 너무 많이 돌렸어요. 풍차는 투구가 아닙니다.',
];
const SERIOUS_LINE = {
  10: '해설: 10점! 10점짜리 스트라이크입니다! …우리 게임에 어울리는 인재가 아닌 것 같은데요?',
  9: '해설: 9점! 폼은 거의 완벽했는데… 긴장해서 힘이 너무 들어갔어요.',
  8: '해설: 8점. 너, 승부에 진지하구나?',
  7: '해설: 7점. 어? 투수 같았어요. 잠깐이지만요.',
  6: '해설: 6점. 투수… 지망생 정도는 되겠네요.',
  5: '해설: 5점. 반은 투수, 반은 삐걱.',
  4: '해설: 4점. 투구폼이라는 걸 어디서 들어보긴 하셨군요.',
  3: '해설: 3점. …방금 그거 진지하게 던지신 거 맞죠?',
};
// ---------- release ----------
const REL_NAME = {airmail:'날아와서 직접 전달', sulk:'그냥 놓음 (삐짐)', handoff:'손으로 직접 전달', second:'뒤로 걸어가서 2루수에게 전달', clean:'깔끔한 동시 놓기', top:'검지 먼저 (탑스핀)', back:'중지 먼저 (백스핀)', drag:'질질 끌린 놓기', slip:'손에서 미끄러짐', timeout:'시간 초과 (보크)'};
function releaseExtras(type){
  const nk = P[I.neck], h = P[I.rhand], pl = P[I.pelvis], hd = P[I.head], live = type !== 'slip' && type !== 'timeout';
  const slotAng = Math.atan2(h.y - nk.y, Math.max(0.01, h.x - nk.x))*180/Math.PI;
  const slot = !live || body.fallen || h.x - nk.x < 0.05 ? null : h.y < 0.45 ? 'sub' : slotAng >= 55 ? 'over' : slotAng >= 25 ? 'three' : slotAng >= -12 ? 'side' : 'under';
  const b = [];
  if (live && Math.abs(armNet)/(2*Math.PI) >= 10) b.push('heli');
  if (live && flamMax >= 1.0) b.push('flamingo');   // the body rarely holds one leg up past ~1.5s, so 1s is 'rare but possible'
  if (live && now - wuAt < 1.0) b.push('quick');
  if (live && timeLeft < 0.3) b.push('buzzer');
  if (live && Math.abs(P[I.lank].x - P[I.bank].x) >= 1.5) b.push('split');
  if (live && !body.fallen && (P[I.lknee].y < 0.1 || P[I.bknee].y < 0.1)) b.push('kneel');
  if (live && hd.y < pl.y - 0.3) b.push('upside');
  return {slot, slotAng, bonus: b, turns: Math.abs(armNet)/(2*Math.PI), hp: hd.y - pl.y, fallen: body.fallen};
}
function doRelease(type, gap){
  if (!ball.held) return;
  snapRelease();
  if (!tut && type !== 'slip' && type !== 'timeout' && !bodyUsed && bothDownAt >= 0 && now - bothDownAt < 0.6) return startSulk();
  const f = formNow();
  const ok = type !== 'slip' && type !== 'timeout';
  // tier 3 (all four) keeps the generous ~0.09s grace window; tiers 1-2 only look at the last ~0.025s
  const bestOf = key => hist.reduce((b, h, i) => ((h[key] === 4 || i >= hist.length - 6) &&
    (h[key] > (b ? b[key] : 1) || (b && h[key] === b[key] && h.v > b.v))) ? h : b, null);
  const hf = ok ? bestOf('fn') : null, hr = ok ? bestOf('rn') : null;
  const tF = hf ? hf.fn - 1 : 0, tR = hr ? hr.rn - 1 : 0;           // 2 conditions = tier 1 ... 4 = tier 3
  let megaF = tF >= 1 && tF >= tR && !tut, megaR = !megaF && tR >= 1 && !tut;   // 투구 교실: no catcher launches, no slow-mo, just the ball
  let tier = megaF ? tF : megaR ? tR : 0, bestH = megaF ? hf : megaR ? hr : null;
  const sBestH = hist.reduce((b, h) => (!b || h.s.total > b.s.total) ? h : b, null) || {s: f.s, so: f.so};
  const serious = (ok && sBestH.s.low > 0) ? sBestH : null;           // only forward, low-ish throws get judged
  const pts = serious ? serious.s.pts : 0;
  const strike10 = ok && pts >= 10 && Math.max(tF, tR) < 3 && !tut;   // a perfect serious pitch beats tiers 1-2
  if (strike10){ megaF = megaR = false; tier = 0; bestH = null; startScreenAds(SERIOUS_ADS, 1.1); }
  let mult = ARM, spin = 0;
  if (type === 'clean') spin = 90;
  if (type === 'back') spin = Math.min(260, 90 + gap*700);
  if (type === 'top') spin = -Math.min(260, 40 + gap*700);
  if (type === 'drag'){ mult *= 0.7; spin = (Math.random()-0.5)*200; }
  if (type === 'slip'){ mult *= 0.45; spin = (Math.random()-0.5)*120; }
  if (type === 'timeout'){ mult = 0.2; }
  if (f.vx > 0) mult *= 1 + 0.1*f.f.filter(Boolean).length;
  let vx = f.vx*mult, vy = f.vy*mult;
  if (tut && tut.phase === 'finale'){ const a = 34*Math.PI/180; vx = Math.cos(a)*ROBO_V; vy = Math.sin(a)*ROBO_V; spin = 90; }   // the robot's pitch: always the same long fly ball
  sfxRelease(f.v, type);
  if (megaF || megaR){
    const sp = Math.max(bestH.v*ARM*MEGA_FACT[tier], MEGA_FLOOR[tier]), a = bestH.ang*Math.PI/180;
    ball.megaV = [Math.cos(a)*sp, Math.sin(a)*sp];
    vx = Math.cos(a)*sp/3; vy = Math.sin(a)*sp/3;   // leaves the hand normally; boosted when slow-mo ends
    if (megaR) spin = -Math.abs(spin || 90);   // backspin for a ball going the other way
  }
  release_speed = Math.hypot(...(ball.megaV || [vx, vy]));
  if (megaR && !tut) bestH.rr.forEach((ok, i) => { if (ok) revealed.add(i); });   // reveal only what was actually found
  ball.tier = tier;
  ball.held = false; ball.vx = vx; ball.vy = vy; ball.spin = spin; ball.mega = megaF; ball.rmega = megaR;
  ball.x = P[I.rhand].x; ball.y = P[I.rhand].y;
  if (!tut){ tries++; save(); }
  if (strike10){ ball.homing = true; ball.megaV = null; release_speed = 36; }
  release = {type, gap, f, form: f, tier, checks: bestH ? (megaF ? bestH.ff : bestH.rr) : null, pts, serious, strike10, speed: release_speed, ang: Math.atan2(vy,vx)*180/Math.PI, fallen: body.fallen, mega: megaF, rmega: megaR, t: now,
             bestF: {...bestF}, bestR: {...bestR}, x0: ball.x, extra: releaseExtras(type)};
  state = 'flight';
  if (strike10){
    slowmo = {t:0, dur:1.6, kind:'s', fired:false}; ooh();
    showMsg('…!', 1.4); say('(진지)', 1.6);
    comment('해설: 어… 이 폼… 지금 진짜 투수처럼…', 1.2, 'shock');
    tone(55, 0.2, 'sine', 0.3); later(() => tone(55, 0.2, 'sine', 0.3), 420); later(() => tone(55, 0.25, 'sine', 0.3), 840);
  } else if (megaF || megaR){
    // dramatic slow motion first, the launch effects fire when it ends
    // tier 1 goes off almost at once, tier 2 gets a short slow-mo, tier 3 the full show
    slowmo = {t:0, dur: megaF ? [0, 0.9, 1.2, 1.7][tier] : [0, 0.15, 0.8, 1.6][tier], kind: megaF ? 'f' : 'r', fired:false};
    if (megaF){
      if (tier >= 2) ooh();
      say('흡…!', 1.2); comment('해설: 투수가 공을 던졌고!', 1.6, 'shock');
    } else if (tier >= 2){
      ooh(); showMsg(megaF ? '…어?' : '…응?', 1.2); say('…!', 1.2);
      comment(tier === 3 ? (megaF ? '해설: 어? 어어? 잠깐만요, 이 폼은…' : '해설: 어? 저 자세는… 설마요…') : '해설: 어? 어어?', 1.0, 'shock');
    }
    tone(55, 0.2, 'sine', 0.3);
    if (tier === 3){ later(() => tone(55, 0.2, 'sine', 0.3), 420); later(() => tone(55, 0.25, 'sine', 0.3), 840); }
    tone(180, 1.6, 'sine', 0.04, 900);
  } else {

    if (type === 'slip'){ showMsg('공이 손에서 빠졌다', 1.4); say(pick(TXT.slip)); comment(pick(TXT.relSlip), 3, 'sigh'); }
    else if (type === 'timeout'){ showMsg('보크! 시간 초과', 1.6); say('…생각이 너무 많았다', 1.6); }
    else {
      if (body.fallen) say('누운 채로 발사');
      else if (pts >= 7) say('(진지)', 1.2);
      else say(pick(TXT.throwF), 0.8);
      if (pts >= 8){
        let line = SERIOUS_LINE[pts];
        if (pts <= 9){
          const weakest = serious.s.parts.reduce((bi, p, i, arr) => p < arr[bi] ? i : bi, 0);
          line += ' ' + SERIOUS_NUDGE[weakest](serious.so);
        }
        comment(line, 4.5, 'shock');
      }
      else comment(pick(vx < 0 ? TXT.relB : TXT.relF), 3);
      // reveal backward conditions the player has stumbled into
      if (vx < 0 && !tut) f.r.forEach((ok, i) => { if (ok) revealed.add(i); });   // 투구 교실 throws reveal nothing
    }
  }
}

// ---------- walking: hand-delivery ----------
function walkCheck(){
  const px = P[I.pelvis].x;
  if (px > CX - 7 && !walkSaid.c){ walkSaid.c = true; say(pick(CATCHER.approach), 1.8, 'c'); comment('해설: 어? 투수가… 걸어갑니다? 포수 쪽으로요?', 3, 'shock'); }
  if (px < -6.5 && !walkSaid.b){ walkSaid.b = true; fielder.sb = 1; comment('해설: 어? 투수가… 뒤로 걸어갑니다? 2루수 쪽으로요?', 3, 'shock'); say(pick(CATCHER.second.approach), 1.8, 's'); later(() => say(pick(CATCHER.pitcherLeaves), 2, 'c'), 2000); }
  if ((P[I.rhand].x < SB + 1.0 || px < SB + 1.3) && P[I.rhand].y < 2.6) return startSpecial('second');   // reached the 2nd baseman: hand it over
  const low = P[I.pelvis].y < 1.2;   // must actually be on the ground, not flying past
  if ((P[I.rhand].x > CX - 1.0 || px > CX - 1.3) && P[I.rhand].y < 2.6) startSpecial(low ? 'handoff' : 'airmail');
}
function startSulk(){
  const f = formNow();
  if (!tut){ tries++; save(); }
  release = {type: 'sulk', f, form: f, speed: 0, ang: 0, fallen: body.fallen, pts: 0, t: now, bestF: {...bestF}, bestR: {...bestR}};
  ball.held = false; ball.vx = 0; ball.vy = 0; ball.spin = 0; ball.sulk = true;
  state = 'flight';
  noise(0.08, 0.08, 600);
  say('나 안 해.', 2.0); later(groan, 600); later(() => { if (release && release.type === 'sulk') say(pick(CATCHER.sulk), 2.2, 'c'); }, 2100);
  showMsg('…삐짐', 1.6);
  release.accident = true; snapRelease();
  later(() => { if (release && release.type === 'sulk') startAccident('sulk'); }, 450);
}
function startSpecial(kind){
  snapRelease(); startScreenAds(kind === 'second' ? SECOND_ADS : HANDOFF_ADS, 0.8);
  const f = formNow();
  if (!tut){ tries++; save(); }
  release = {type: kind, f, form: f, speed: 0, ang: 0, fallen: body.fallen, pts: 0, t: now, bestF: {...bestF}, bestR: {...bestR}};
  state = 'special'; demo = null; releaseAll();
  ball.held = false; ball.handoff = {t:0, x0: ball.x, y0: ball.y, sb: kind === 'second'};      // handoff / airmail / 2nd base: walk the ball over
  say('여기요.', 1.5);
  sndSting('deliver');
}

const MEGA_FACT = [0, 1.6, 2.2, 3.0], MEGA_FLOOR = [0, 40, 55, 0];   // tier 1 always clears the 122m wall
const MEGA_MSG = {f: ['', '포수가 날아간다!', '!! 포수 발사 !!', '!!!!! 완벽한 폼 !!!!!'], r: ['', '투수 딸려감!', '!! 투수 자진 납치 !!', '!!!!! 학다리 림보 투구 !!!!!']};
const MEGA_LINE = {
  f: ['', '해설: 어? 포수가… 공에 실려 갑니다?!', '해설: 포수가 날아갑니다!! 높이, 높이 떠오릅니다!!'],
  r: ['', '해설: 어… 투수가 공을 안 놓고 따라가네요?', '해설: 투수가 날아갑니다!! 본인 공을 따라서요!!'],
};
function fireMega(){
  slowmo.fired = true;
  if (slowmo.kind === 'f'){                      // cut: the ball arrives at the catcher, THEN he goes flying
    const [mx, my] = mittPos();
    ball.approach = {t: 0}; ball.x = mx - 11; ball.y = my + 0.6; ball.trail = [];
    cam.x = CX - 1.4; cam.z = Math.min(H/4.3, W/7.5)*1.15;   // hard cut, no pan
    noise(0.35, 0.2, 3000); tone(1400, 0.35, 'sine', 0.04, 500);
    return;
  }
  if (slowmo.kind !== 's'){ sfxLaunch(ball.tier || 3); later(() => cheer([1.2, 0.6, 0.9, 1.2][ball.tier || 3]), 550); }
  if (slowmo.kind === 's'){ tone(400, 0.4, 'sine', 0.06, 900); comment('해설: 들어갑니다… 들어갑니다…!', 2, 'shock'); return; }
  ball.vx = ball.megaV[0]; ball.vy = ball.megaV[1]; ball.megaV = null;
  const tier = ball.tier || 3, k = [0, 0.45, 0.75, 1][tier];
  shake = 1.2*k; flash = k;
  if (slowmo.kind === 'f'){
    tone(300, 1.6*k, 'sine', 0.06, 2400*k);
    showMsg(MEGA_MSG.f[tier], 1.8); say(['', '어, 어?', '으랴앗!', '으랴아아앗!!!'][tier], 1.5);
    comment(tier === 3 ? TXT.mega : MEGA_LINE.f[tier], 4, 'shock');
    catcher.mode = 'leap'; catcher.t = 0; catcher.x0 = catcher.x;
  } else {
    tone(2400*k, 1.6*k, 'sine', 0.06, 300);
    showMsg(MEGA_MSG.r[tier], 1.8); say(['', '어? 어어?', '왜 나까지', '어어어 왜 나까지'][tier], 2.5);
    comment(tier === 3 ? TXT.rmega : MEGA_LINE.r[tier], 4.5, 'shock');
    body.fallen = true; ball.pin = true;
    showNews('투수, 본인이 던진 공을 따라 뒤로 비행 중');
    startScreenAds(BACK_ADS);
    later(() => { if (ball.rmega && state !== 'ready') say('…어디 가세요?', 2, 'c'); }, 1200);
  }
}
// ball reaches the mitt -> short freeze -> catcher is carried off with it
function catcherImpact(){
  const tier = ball.tier || 3, k = [0, 0.45, 0.75, 1][tier];
  ball.approach = null; ball.hold = [0, 0.18, 0.22, 0.3][tier];
  catcher.mode = 'caught'; catcher.t = 0;
  shake = 1.2*k + 0.3; flash = k; sfxCatch(30 + 15*tier);
  showMsg(tier === 1 ? '퍽!' : tier === 2 ? '퍼억!!' : '콰앙!!!', 0.6);
}
function predictLanding(){
  let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy; const km = 0.00055*ball.spin;
  for (let i = 0; i < 400000; i++){
    vx += (-km*vy)*DT; vy += (km*vx - G)*DT; x += vx*DT; y += vy*DT;
    if (vx > 0 && x >= WALL && x - vx*DT < WALL && y < STAND_WALL_TOP) return WALL;   // would hit the wall
    if (y <= surf(x)) return x;
  }
  return x;
}
// home-run calls, parodying the flavour of KBO broadcasts (not anyone's exact words)
const HR = {
  launch: {
    1: ['해설: 어? 포수가… 공에 실려 갑니다?!', '해설: 포수가 뜹니다? 포수가 왜 뜹니까?', '해설: 높이 뜬 공… 아니 높이 뜬 포수!'],
    2: ['해설: 포수가 날아갑니다!! 높이, 높이 떠오릅니다!!', '해설: 잘 맞았습니다!! 포수가 잘 맞았습니다!!', '해설: 쭉쭉 뻗어갑니다!! 포수도 쭉쭉 뻗어갑니다!!']
  },
  stands: [
    '해설: 포수! 잡을 수 없는 곳에 떨어집니다!',
    '해설: 뒤로, 뒤로~ 담장 앞… 아니 넘어갑니다! 관중석!',
    '해설: 포수… 먹혔습니다! 아, 아닙니다! 관중석에 꽂힙니다!',
    '해설: 관중석에서 포수를 받아냅니다! 오늘의 기념품은 포수입니다!',
    '해설: 포수 홈런! 기록원이 펜을 내려놓습니다!',
    '해설: 넘어갔습니다! 공도! 포수도!',
  ],
  out: [
    '해설: 포수!!!! 담장!!!! 넘어갑니다!!!!',
    '해설: 포수, 담장 밖에서 뵙겠습니다!!!!',
    '해설: 장외! 장외! 포수가 주차장으로 향합니다!!',
    '해설: 이 포수는!!! 이제 경기장에 없습니다!!!',
    '해설: 굿바이!!! 굿바이 포수!!!',
    '해설: 넘어갔습니다!!! …포수가요!!!',
    '해설: 하늘 높이! 담장 너머로! 포수의 퇴근길이 열립니다!!',
    '해설: ♪ 날아라~ 우리 포수~ 담장 너머로~ ♪',
  ],
  outBig: [
    '해설: 이건 홈런이 아닙니다!!! 발사입니다!!!',
    '해설: 포수가!!! 대기권을!!! 향합니다!!!',
    '해설: 담장이 아니라 지도 밖으로 넘어갑니다!!!',
    '해설: 역사적인 장면입니다!!! 교과서에는… 안 실립니다!!!',
  ],
  after: {
    stands: ['해설: 포수가 관중과 하이파이브를 합니다. 본인 의지는 아닙니다.', '해설: 관중석에서 포수를 돌려달라는 요청이 들어왔습니다.', '해설: 포수, 맥주 한 잔을 엎었습니다.'],
    out: ['해설: …포수 연락 두절입니다.', '해설: 방금 들어온 소식입니다. 포수가 국밥집에서 목격됐습니다.', '해설: 이 홈런은 투수 기록입니까, 포수 기록입니까.', '해설: 포수의 귀가를 기원합니다.'],
  },
};
function homeRunCall(){
  ball.hrCalled = true;
  const out = ball.predX >= 158, big = (ball.tier || 3) === 3;
  if (!out && ball.predX <= WALL) return;
  showMsg(out ? '포수 장외 홈런!!' : '포수 홈런!', 2.4); cheer(out ? 1.4 : 1.0);
  sndSting('homer');
  const line = pick(out ? (big && Math.random() < 0.6 ? HR.outBig : HR.out) : HR.stands);
  const myBall = ball;
  if (Math.random() < 0.12){                 // now and then: the broadcaster lets the moment breathe first
    comment('해설: ……', 1.2, 'shock');
    later(() => { if (ball === myBall) comment(line, 4.5, 'shock'); }, 1300);
  } else comment(line, 4.5, 'shock');
  if (Math.random() < 0.55)                  // and sometimes a dry follow-up once the dust settles
    later(() => { if (ball !== myBall || state === 'ready') return;
      const p = out ? placeName(ball.predX) : null;
      comment(p && Math.random() < 0.5 ? `해설: 방금 들어온 소식입니다. 포수가 ${p.name}${p.kind === 'water' ? '에서 헤엄치는 게' : ' 앞에서'} 목격됐습니다.` : pick(out ? HR.after.out : HR.after.stands), 4, 'sigh'); }, 4200);
}
function catcherLaunch(){
  const tier = ball.tier || 3, k = [0, 0.45, 0.75, 1][tier];
  ball.hold = 0; ball.vx = ball.megaV[0]; ball.vy = ball.megaV[1]; ball.megaV = null; camBoost = 1.2;
  ball.predX = predictLanding(); ball.hrCalled = false;
  showNews(ball.predX >= 158 ? '포수, 공을 받은 채 담장 밖으로 비행 중' : ball.predX > WALL ? '포수, 공과 함께 관중석으로 이동 중' : '포수, 공에 실려 외야 방면으로 이동 중');
  startScreenAds(FLY_ADS);
  catcher.mode = 'carried'; catcher.t = 0;
  sfxLaunch(tier); later(() => cheer([1.2, 0.6, 0.9, 1.2][tier]), 550);
  tone(300, 1.6*k, 'sine', 0.06, 2400*k);
  showMsg(MEGA_MSG.f[tier], 1.8);
  say(pick(CATCHER.launch[tier]), 2.5, 'c');
  comment(tier === 3 ? TXT.mega : pick(HR.launch[tier]), 4, 'shock');
}
function timeScale(){
  if (tut && tut.slow) return 0.3;   // 투구 교실 시범: the same simulation steps, played back slower (the robot's ball lands in the same place)
  if (!slowmo) return 1;
  if (!slowmo.fired) return 0.03;
  return 1;
}

// ---------- what lies beyond the walls: [centre x, width, height, kind, colour, name] ----------
const FAC = [
  [180, 34, 1.6, 'cars', '', '주차장'],
  [235, 10, 6, 'shop', '#3d7ab8', '편의점'],
  [290, 12, 7, 'shop', '#f2b632', '치킨집'],
  [350, 15, 7, 'shop', '#8a5428', '국밥집 (24시)'],
  [420, 12, 10, 'shop', '#d9412b', '노래방'],
  [490, 12, 8, 'shop', '#26345a', 'PC방'],
  [560, 10, 6, 'shop', '#e98ab0', '분식집'],
  [640, 10, 6, 'shop', '#5aaed6', '세탁소'],
  [770, 70, 0, 'water', '#3d7ab8', '한강 (아마도)'],
  [920, 44, 48, 'apt', '#cfc6b8', '아파트 단지'],
  [1060, 20, 12, 'shop', '#c97b4a', '찜질방'],
  [1220, 32, 9, 'station', '#6d7177', '지하철역'],
  [1420, 16, 8, 'shop', '#1f2a44', '야구용품점'],
  [1680, 44, 46, 'ferris', '#d9412b', '놀이공원'],
  [2050, 46, 10, 'shop', '#2f6b3a', '고속도로 휴게소'],
  [2600, 140, 22, 'airport', '#e8e2d4', '공항'],
  [3400, 300, 0, 'water', '#2a5fa0', '바다 (?)'],
  [4500, 400, 160, 'mountain', '#5b7a4a', '산'],
  [-185, 30, 1.6, 'cars', '', '반대편 주차장'],
  [-250, 12, 7, 'shop', '#f2b632', '치킨집 2호점'],
  [-320, 15, 7, 'shop', '#8a5428', '국밥집 (본점)'],
  [-430, 10, 6, 'shop', '#2f9e6a', '편의점 (경쟁사)'],
  [-560, 12, 9, 'shop', '#b9b3a8', '동네 의원'],
  [-760, 40, 44, 'apt', '#d8cfc0', '아파트 2단지'],
  [-1050, 34, 9, 'station', '#6d7177', '버스터미널'],
  [-1500, 80, 26, 'stadium', '#4b5263', '다른 구장'],
  [-2600, 140, 22, 'airport', '#e8e2d4', '공항 (반대편)'],
];
function inWater(x){ return FAC.some(f => f[3] === 'water' && Math.abs(x - f[0]) < f[1]/2); }
function placeName(x){   // what's near a landing spot outside the park
  if (x < 158 && x > -142) return null;
  let best = null, bd = 1e9;
  for (const f of FAC){ const dd = Math.max(0, Math.abs(x - f[0]) - f[1]/2); if (dd < bd){ bd = dd; best = f; } }
  if (!best || bd > 60) return null;
  return {name: best[5], kind: best[3], near: bd > 0};
}

// ---------- surfaces ----------
// The bleachers' landing slope. drawStands() paints its seats from these same two numbers, so what you see is where
// things land; change them and home-run distances change (a physics change: see CLAUDE.md).
const STAND_WALL_TOP = 3.2, STAND_RISE = 0.62;   // wall height = first row (m); rise per metre back from the wall
function surf(x){
  if (x >= 0){
    if (x < WALL) return 0;
    if (x < WALL+1) return STAND_WALL_TOP;
    if (x < 158) return STAND_WALL_TOP + (x-WALL-1)*STAND_RISE;
    return 0;
  }
  if (x > BWALL) return 0;
  if (x > BWALL-1) return STAND_WALL_TOP;
  if (x > -140) return STAND_WALL_TOP + (BWALL-1-x)*STAND_RISE;
  return 0;
}

// ---------- update ----------
let acc = 0, last = performance.now();
// ---- stop everything (drawing AND sound) whenever the game can't be seen ----
// document.hidden only covers the whole browser tab. Inside Claude the game lives in a frame that can be
// closed, hidden or scrolled away while the tab stays visible, so we also watch the frame itself.
let running = true, frameVisible = true, lastFrameAt = performance.now(), audioParked = false;
function parkAudio(){ if (AC && AC.state === 'running'){ try { AC.suspend(); } catch(e){} audioParked = true; } }
function unparkAudio(){ if (AC && audioParked && AC.state === 'suspended'){ try { AC.resume(); } catch(e){} } audioParked = false; }
function canRun(){ return !document.hidden && frameVisible; }
function wake(){ dozing = false; if (canRun() && !running){ running = true; last = performance.now(); acc = 0; requestAnimationFrame(frame); } }
if ('IntersectionObserver' in window){
  new IntersectionObserver(es => { frameVisible = es[es.length - 1].isIntersecting; if (frameVisible) wake(); else parkAudio(); })
    .observe(document.documentElement);
}
// if the browser stops giving us frames (frame closed / display:none), silence the sound too
// (but a screen that is merely idle — drawing paused on purpose — keeps its crowd and organ going)
let dozing = false;
setInterval(() => { if (performance.now() - lastFrameAt > 700 && !(dozing && canRun())) parkAudio(); }, 400);
document.addEventListener('visibilitychange', () => { if (document.hidden) parkAudio(); else { if (dozing) unparkAudio(); wake(); } });
// Leaving the page closes the audio. Everything tied to that AudioContext goes with it, including the per-sound
// cooldown clock (SFX.last) and play counts (SFX.live): a new context starts its clock at 0, so stale values
// would mute every effect after coming back. Back/forward-cache restores re-open the audio on the next key press.
let audioWanted = false;
addEventListener('pagehide', () => { audioWanted = audioWanted || !!AC; try { AC && AC.close(); } catch(e){} AC = null; OUT = null; crowdBed = null; noiseBuf = null;
  SFX.bus = null; SFX.rev = null; SFX.bank = {}; SFX.last = {}; SFX.live = {}; ORG.gain = null;
  SND.walla = null; SND.pa = null; SND.sting = null; SND.creak = null; SND.wallaNext = 0; CHANT.bus = null;
  if (SND.wallaTimer){ clearInterval(SND.wallaTimer); SND.wallaTimer = null; } });   // startCrowd() makes a new one on return
addEventListener('keydown', () => { if (audioWanted && !AC){ audioWanted = false; audioInit(); } }, {capture: true});
// ---- sleep when idle: a game sitting on its title or result screen should cost nothing ----
let lastInputAt = performance.now(), resultAt = 0;
function shouldSleep(){
  if (demo || (slowmo && !slowmo.fired) || speech || adsBusy()) return false;
  const t = performance.now(), idle = t - lastInputAt;
  if (state === 'intro') return idle > 1500;
  if (state === 'result') return t - resultAt > 2000 && idle > 2000 && subTimer <= 0;   // let the caster finish his sentence
  if (state === 'ready') return idle > 8000 && subTimer <= 0;
  return false;
}
function poke(){ lastInputAt = performance.now(); wake(); }
['keydown', 'keyup', 'pointerdown', 'wheel'].forEach(ev => addEventListener(ev, poke, {capture: true, passive: true}));
addEventListener('resize', wake);
function frame(t){
  lastFrameAt = performance.now();
  if (!canRun()){ running = false; parkAudio(); return; }
  if (audioParked) unparkAudio();
  flushChord(false);
  let dt = Math.min(0.05, (t - last)/1000); last = t; acc += paused ? 0 : dt*timeScale();
  let n = 0;
  while (acc >= DT && n < 12){
    if (demo){
      const S = demo.seq;
      while (demo.i < S.length && S[demo.i][0] <= demo.t + 1e-9){ const d = S[demo.i++]; press(d[1], !!d[2], true); }
      if (demo){ demo.t += DT; if (demo.i >= S.length || state === 'result') { demo = null; releaseAll(); } }
    }
    step(inputs());
    acc -= DT; n++; now += DT;
    if (state === 'windup' && ball.held) walkCheck();
    if (state === 'windup' && ball.held){
      { const arm = Math.atan2(P[I.relb].y-P[I.neck].y, P[I.relb].x-P[I.neck].x);
        if (prevArm !== null) armRot += Math.abs(wrap(arm - prevArm)); prevArm = arm;
        { const a2 = Math.atan2(P[I.rhand].y-P[I.neck].y, P[I.rhand].x-P[I.neck].x); if (prevArmS !== null) armNet += wrap(a2 - prevArmS); prevArmS = a2; }   // signed: wobble cancels out
        if (P[I.lank].y > 0.3 && (P[I.bank].y < 0.03 || P[I.btoe].y < 0.03) && !body.fallen){ flamT += DT; flamMax = Math.max(flamMax, flamT); } else flamT = 0;
        elbowHist.push(relAng(P[I.neck], P[I.relb], P[I.rhand])*180/Math.PI); if (elbowHist.length > 144) elbowHist.shift(); }
      const f = formNow(); lastForm = f;
      hist.push({fa: f.fAll, ra: f.rAll, fn: f.f[0] ? f.f.filter(Boolean).length : 0, rn: f.r[0] ? f.r.filter(Boolean).length : 0, ff: f.f, rr: f.r, v: f.v, ang: f.ang, s: f.s, so: f.so}); if (hist.length > 22) hist.shift();
      const nf = f.f.filter(Boolean).length, nr = f.r.filter(Boolean).length;
      if (nf >= bestF.n) bestF = {n:nf, t:now};
      if (nr >= bestR.n) bestR = {n:nr, t:now};
      if (f.fAll || f.rAll) lastPerfect = now;
    }
    if (!ball.held){
      const steps = (ball.mega || ball.rmega) && !ball.landed && !ball.megaV ? 2 : 1;
      for (let s = 0; s < steps; s++) ballStep();
      if (ball.pin) pinPitcher(); else if (ball.perch) perchPitcher();
    }
    catcherStep(DT);
  }
  if (!paused) update(dt);
  draw();
  if (shouldSleep()){ running = false; dozing = true; return; }   // nothing is happening: stop redrawing until the next input
  requestAnimationFrame(frame);
}
// Presentation only, never gameplay: runs once the result (distance, titles) is already decided, and moves the pitcher's
// points onto the stands' slope because the physics floor is y = 0 everywhere. Anything that would simulate or replay the
// body after landing (replays, ghosts, walking about in the stands) must not rely on these points as physics.
function perchPitcher(){   // after the result is decided: the stands' slope works as a floor for the pitcher's body
  for (const p of P){ const f = surf(p.x); if (f > 0.5 && p.y < f){ p.y = f; p.py = Math.max(p.py, f); p.px = p.x - (p.x - p.px)*0.5; } }
}
function pinPitcher(){
  const sc = Math.max(1, 80/(cam.z*1.8)), pel = P[I.pelvis], dx = (ball.x + 0.9*sc) - pel.x, dy = (ball.y - 0.55*sc) - pel.y;
  for (const p of P){ p.x += dx; p.px += dx; p.sx += dx; p.y += dy; p.py += dy; }
}

function update(dt){
  if (slowmo && !slowmo.fired){ slowmo.t += dt; if (slowmo.t >= slowmo.dur) fireMega(); }
  if (msgTimer > 0){ msgTimer -= dt; if (msgTimer <= 0) $('msg').style.opacity = 0; }
  if (subTimer > 0){ subTimer -= dt; if (subTimer <= 0){ $('bubble').classList.remove('show'); $('booth').className = ''; } }
  if (speech){ speech.t -= dt; speech.age = (speech.age || 0) + dt; if (speech.t <= 0) speech = null; }
  shake = Math.max(0, shake - dt*1.2); flash = Math.max(0, flash - dt*2.5);
  const j = !!down.KeyK, k = !!down.KeyL;
  if (tut && tut.slow && release && now - release.t > 0.5){ tut.slow = false; showMsg('', 0); }   // slow motion ends after the follow-through
  if (tut) tutTick(dt);
  if (state === 'windup' && ball.held){
    if (tut){ timeLeft = TIME_LIMIT; if (tut.phase === 'learn') grip = 1; }
    timeLeft -= dt;
    if (j && k) grip = Math.min(1, grip + dt*1.4);
    else if (j || k) grip -= dt*0.28;
    else grip -= dt*0.75;
    if (grip <= 0){ grip = 0; doRelease('slip', 0); }
    else if (timeLeft <= 0){
      timeLeft = 0; const esc = P[I.pelvis].x < -4;
      doRelease('timeout', 0); groan();
      if (esc){ release.escape = true; release.toSB = Math.max(0.1, Math.min(P[I.rhand].x - (SB + 1.0), P[I.pelvis].x - (SB + 1.3)));
        showMsg('퇴근 실패', 1.8); say('…아직도 경기장이네', 2, 'p');
        comment(release.toSB < 3 ? `해설: 아깝습니다! 2루수까지 ${release.toSB.toFixed(1)}m 남았었어요!` : pick(TXT.escape), 4.5, 'sigh');
        if (release.toSB < 3) later(() => say(pick(CATCHER.second.almost), 2, 's'), 1400); }
      else later(() => say(pick(CATCHER.timeout), 2.2, 'c'), 900);
    }
    creakT -= dt;
    const busy = ['KeyQ','KeyA','KeyW','KeyS','KeyE','KeyD','KeyU','KeyJ'].filter(c => down[c]).length;
    if (busy && creakT <= 0){ sndCreak(); creakT = 0.18 + Math.random()*0.3; }
    if (busy >= 3 && !speech && Math.random() < dt*0.8) say(pick(TXT.strain), 1.0);
    else if (!speech && Math.random() < dt*0.07) say(pick(CATCHER.idle), 2.4, 'c');   // the catcher mutters while waiting
    if (body.fallen && !ball.fellSaid){ ball.fellSaid = true; groan(); showMsg('넘어짐!', 1.2); say(pick(TXT.fall), 1.4); comment(pick(TXT.fallC), 3, 'sigh'); sfxFall(); }
    // "you just missed it"
    if (lastPerfect !== null && !missShown && ball.held && now - lastPerfect > 0.13){
      missShown = true; showMsg(pick(TXT.miss), 1.1); crowdVoice(200, 150, 0.9, 0.02);   // a small "아~" from the stands
    }
  }
  if (state === 'windup' && grip < 0.35 && ball.held) $('stGrip').parentElement.classList.add('warn'); else $('stGrip').parentElement.classList.remove('warn');
  // HUD
  $('stTitle').textContent = {intro:'준비', ready:'준비 (아직 괜찮음)', windup: '투구 중… 아마도', special: '…뭐 하세요?', flight:'날아가는 중', landed:'착지', result:'결과'}[state] || '';
  $('stTime').textContent = timeLeft.toFixed(1);
  $('stGrip').style.width = (grip*100) + '%';
  $('stGripTxt').textContent = grip < 0.35 && state === 'windup' ? '땀 남 ' + Math.round(grip*100) + '%' : Math.round(grip*100) + '%';
  musicDuck();
  { const live = (state === 'ready' || state === 'windup') && ball.held, f = live ? formNow().f : null;
    lampEls.forEach((s, i) => s.classList.toggle('on', !!(f && bodyUsed && f[i])));   // dark until the first body key
    const hurry = live && timeLeft <= 5 && timeLeft > 0;
    document.body.classList.toggle('hurry', hurry);
    ORG.bpm = hurry ? 138 + (5 - timeLeft)*8 : 138;   // up to ~178bpm: the band speeds up
    if (hurry){ const s = Math.ceil(timeLeft); $('hurryTxt').textContent = `중계 종료 ${s}초 전 · 투수는 아직 공을 들고 있습니다`;
      if (s <= 2 && s !== lastTick){ lastTick = s; sndBlock(s === 1); } }   // tick-tock on a wood block
    else lastTick = 0; }
  { const ph = (state === 'ready' || state === 'windup') && ball.held ? (down.KeyK && down.KeyL ? 2 : 1) : 3;
    if (ph !== keysPh){ keysPh = ph; const k = $('keys'); k.className = 'ph' + ph; void k.offsetWidth; k.classList.add('flash');
      $('keysT').textContent = ph === 1 ? '▶ ① 먼저 공을 쥐세요: K + L 꾹 (계속 누르고 있기)' : ph === 2 ? '▶ ② 몸을 움직이세요 · K·L을 떼는 순간 던집니다' : '▶ 투구 끝 · Space로 다시'; } }
  setLED($('stSpd'), String(Math.min(999, Math.round((lastForm ? lastForm.v : 0)*3.6*ARM))).padStart(3, ' '), 40);
  $('stBest').textContent = best === null ? '-' : best.toFixed(1) + ' m';
  $('stTries').textContent = tries + '번';

  if (ball.rmega && !ball.held && fielder.look === 0 && Math.abs(ball.x - FX) < 30){ fielder.look = 1; say(pick(TXT.fielderLook), 1.6, 'f'); }
  if (!ball.held && !ball.caught && !ball.handoff && ball.vx < -1 && !fielder.sbSaid && Math.abs(ball.x - SB) < 3 && ball.y < 6){ fielder.sbSaid = true; fielder.duck = 1; say(pick(CATCHER.second.pass), 1.6, 's'); }
  if (!ball.held && !ball.rmega && ball.vx < 0 && !fielder.said && Math.abs(ball.x - FX) < 12){ fielder.said = true; fielder.look = 1; say(pick(TXT.fielderLook), 1.4, 'f'); }

  if ((state === 'ready' || state === 'result') && !tut && !paused && AC && performance.now() > CHANT.nextAt){ crowdChant(); CHANT.nextAt = performance.now() + 16000 + Math.random()*9000; }
  if (state === 'landed' && release && !release.accident && !tut && lyingEnd(release)) startAccident('fall');
  if (state === 'landed'){
    const wait = release && release.accident ? 3.0 : (ball.mega || ball.rmega) ? 2.2 : release && (release.strike10 || release.type === 'handoff' || release.type === 'airmail' || release.type === 'second') ? 3.4 : (ball.caught || ball.sulk) ? 2.0 : 1.0;
    if (now - landedAt > wait){
      // don't make anyone watch a long roll: finish it instantly (same physics, so the score is unchanged)
      for (let i = 0; i < 240*20 && ball.landed && !ball.rest && !ball.caught; i++) ballStep();
      if (!ball.rest && !ball.caught){ ball.vx = 0; ball.vy = 0; ball.rest = true; }
      if (tut) tutThrown(); else showResult();
    }
  }
  // camera
  const z0 = Math.min(H/4.3, W/7.5);
  let tx, tz;
  if (state === 'ready' || state === 'windup' || state === 'intro' || (state === 'special' && !ball.handoff) || (ball && ball.sulk) || (release && release.accident)){
    tx = P[I.pelvis].x + 0.9; tz = z0;
    if (fielder && fielder.sb && state === 'windup' && P[I.pelvis].x < -2) tx = Math.min(tx, (P[I.pelvis].x + SB)/2 + 0.6);   // walking back: keep the 2nd baseman in the picture
  } else {
    const bx = ball.x, by = Math.max(0, ball.y);
    tz = Math.min(z0, (H*0.62)/(by + 2.2), (W*0.8)/(Math.abs(ball.vx)*0.9 + 5));
    // ordinary (non-mega) flights: don't shrink the players into specks — but never lose a high pop-up off the top
    if (!ball.mega && !ball.rmega && !ball.approach && state === 'flight'){
      const lead = by + Math.max(0, ball.vy)*0.9;                       // where it's heading, not just where it is (the camera lags)
      const fitZ = (gy() - 90)/(lead + 1.5), floorZ = z0*0.45;      // zoom that just fits the ball / smallest we'd like to go
      tz = fitZ >= floorZ ? Math.max(Math.min(tz, fitZ), floorZ)       // ball fits: apply the floor
                          : fitZ;                                       // ball would leave the top: pull out just enough
    }
    if (state !== 'flight'){
      tz = Math.min(z0, (ball.mega || ball.rmega) ? H*0.55/6 : z0*0.7);
      // landed up in the stands: the camera can't tilt, so zoom out until the ball (and whoever came with it) is in the picture
      const topY = Math.max(0, ball.y, ball.mega && catcher ? catcher.y + 1.4 : 0, ball.rmega ? P[I.head].y : 0);
      tz = Math.min(tz, (gy() - 110)/(topY + 3));
      if (ball.rmega){ const px = P[I.pelvis].x; tx = (bx + px)/2; tz = Math.min(tz, (W*0.8)/(Math.abs(bx - px) + 6)); }   // keep the pitcher in too
    }
    tx = bx + (state === 'flight' ? ball.vx*0.12 + (ball.mega || ball.rmega ? 0 : Math.sign(ball.vx)*1.8) : 0);   // room ahead of the ball
    if (state === 'flight' && Math.abs(bx) < 6 && Math.abs(ball.vx) < 8) tx = (bx + P[I.pelvis].x)/2 + 1;
    // ordinary flights: if the ball and the pitcher both fit, keep the pitcher in the picture too (ball wins otherwise)
    if (state === 'flight' && !ball.mega && !ball.rmega && !ball.approach){
      const half = W/(2*tz), px = P[I.pelvis].x, mB = 1.5, mP = 1.2;
      const lo = Math.max(bx + mB, px + mP) - half, hi = Math.min(bx - mB, px - mP) + half;
      if (lo <= hi) tx = Math.min(Math.max(tx, lo), hi);
    }
  }
  if (slowmo && !slowmo.fired){ tx = (ball.x + P[I.pelvis].x)/2; tz = z0*1.45; }
  if (ball.approach || ball.hold > 0){ tx = CX - 1.4; tz = z0*1.15; }
  const boost = camBoost > 0; camBoost = Math.max(0, camBoost - dt);   // right after launch the camera must catch up fast
  if (tut && (tut.phase === 'learn' || (tut.phase === 'finale' && !tut.demoOn) || tut.slow)){ tx = P[I.pelvis].x + 0.9; tz = z0; }   // stay on the robot until its own ball is away   // the lesson's throw: stay on the robot, not the ball
  if (tut && tut.phase === 'end'){ tx = ball.x - 3; tz = z0*0.3; }   // 투구 교실 ending: show where the robot's ball came down   // 투구 교실 ending: show the catcher sitting in the stands
  const hold = state === 'result' ? 0 : 1;   // the picture behind the result card stays put
  const nearTop = state === 'flight' && ball && !ball.held && W2S(ball.x, ball.y)[1] < 110;   // about to leave the picture: catch up
  cam.z += (tz - cam.z)*(boost ? 0.3 : nearTop ? 0.25 : state === 'flight' ? 0.08 : 0.06)*hold;
  cam.x += (tx - cam.x)*(boost ? 0.55 : state === 'flight' ? 0.2 : 0.08)*hold;
  if (!ball.held){
    $('dist').style.opacity = 1; document.body.classList.add('flying');
    const d = ball.caught ? ball.landX : ball.x;
    const bk = ball.rmega || (release && release.type === 'second');
    setLED($('distLed'), (bk ? Math.abs(d) : d).toFixed(1), 30);
    $('dist').querySelector('.lab').textContent = bk ? '비거리 (뒤로)' : '비거리';
  }
}

function sbGlove(){ const sc = Math.max(1, 40/(cam.z*1.8)); return [SB + 0.55*sc, 1.25*sc]; }
function mittPos(){ const sc = Math.max(1, 50/(cam.z*1.3)); return [catcher.x - 0.4*sc, catcher.y + 0.75*sc]; }
function ballStep(){
  const b = ball;
  if (b.caught){ [b.x, b.y] = b.sbHeld ? sbGlove() : mittPos(); return; }
  if (b.approach){
    const [mx, my] = mittPos(), dx = mx - b.x, dy = my - b.y, d = Math.hypot(dx, dy), sp = 40;
    b.approach.t += DT;
    if (b.approach.t > 0.12){                     // a beat on the empty catcher first, then the ball streaks in
      if (d < sp*DT + 0.05){ b.x = mx; b.y = my; catcherImpact(); return; }
      b.vx = dx/d*sp; b.vy = dy/d*sp; b.x += b.vx*DT; b.y += b.vy*DT; b.rot += 0.4;
      b.trail.push({x: b.x, y: b.y, life: 1});
    }
    return;
  }
  if (b.hold > 0){ [b.x, b.y] = mittPos(); b.hold -= DT; if (b.hold <= 0) catcherLaunch(); return; }
  if (b.handoff){
    const h = b.handoff; h.t += DT;
    const k = Math.min(1, h.t/0.9), e = k*k*(3 - 2*k), [mx, my] = h.sb ? sbGlove() : mittPos();
    b.x = h.x0 + (mx - h.x0)*e; b.y = h.y0 + (my - h.y0)*e + Math.sin(e*Math.PI)*0.25; b.rot += 0.05;
    if (k >= 1 && h.sb){
      b.handoff = null; b.caught = true; b.landed = true; b.landX = SB; landedAt = now; state = 'landed'; b.sbHeld = true;
      fielder.sb = 2; sfxCatch(4); later(() => cheer(0.5), 300);
      later(() => showMsg('…2루 송구?', 1.8), 200);
      later(() => comment('해설: 아! 투수가 2루수에게 공을 직접 건넸어요! 송구인가요, 택배인가요?', 5, 'shock'), 350);
      later(() => say(pick(CATCHER.second.got), 2.2, 's'), 900);
      return;
    }
    if (k >= 1){
      b.handoff = null; b.caught = true; b.landed = true; b.landX = CX; landedAt = now; state = 'landed';
      catcher.mode = 'caught'; catcher.t = 0; sfxCatch(4); later(() => cheer(0.7), 300);
      later(() => showMsg('…스트라이크?', 1.8), 200);
      later(() => comment(release.type === 'airmail' ? '해설: 아! 투수가 날아와서 공을 직배송했어요! 이것도 스트라이크 맞나요?' : '해설: 아! 투수가 포수에게 공을 직접 전달했어요! 이것도 스트라이크 맞나요?', 5, 'shock'), 350);
      later(() => say(pick(CATCHER.handoff), 2.2, 'c'), 900);
    }
    return;
  }
  if (b.homing){
    const [mx, my] = mittPos(), dx = mx - b.x, dy = my - b.y, d = Math.hypot(dx, dy);
    const sp = slowmo && !slowmo.fired ? 12 : 36;           // creeps during slow-mo, then a rope
    if (d < sp*DT + 0.05){
      b.caught = true; b.homing = false; b.landed = true; b.landX = CX; b.strike = true; landedAt = now; state = 'landed';
      catcher.mode = 'caught'; catcher.t = 0;
      shake = 0.5; flash = 0.5; sfxCatch(sp);
      later(() => { showMsg('스트라이크!!', 2); sndSting('strike'); }, 250);
      later(() => comment(SERIOUS_LINE[10], 5, 'shock'), 500);
      later(() => say(pick(CATCHER.strike), 2.2, 'c'), 900);
      return;
    }
    // slight drop on the way, so it reads as a pitch, not a laser
    const k = Math.min(1, b.x / CX);
    b.vx = dx/d*sp; b.vy = dy/d*sp + Math.sin(k*Math.PI)*1.5;
    b.x += b.vx*DT; b.y += b.vy*DT; b.rot += 0.3; b.maxY = Math.max(b.maxY, b.y);
    if (Math.random() < 0.6) b.trail.push({x:b.x, y:b.y, life:1});
    return;
  }
  if (b.landed){                                   // bounce, then roll until it stops; the resting spot is the score
    if (b.rest) return;
    const ox = b.x;
    b.vy -= G*DT; b.x += b.vx*DT; b.y += b.vy*DT; b.rot += b.vx*DT*8;
    if (ox < WALL && b.x >= WALL && b.y < STAND_WALL_TOP){ b.x = WALL - 0.01; b.vx *= -0.3; }
    if (ox > BWALL && b.x <= BWALL && b.y < STAND_WALL_TOP){ b.x = BWALL + 0.01; b.vx *= -0.3; }
    const s = surf(b.x);
    if (b.y < s){
      b.y = s;
      if (inWater(b.x)){ if (!b.splashed){ b.splashed = true; sfxGround(b.x, Math.max(6, Math.abs(b.vy))); } b.vx = 0; b.vy = 0; b.rest = true; return; }
      if (Math.abs(b.vy) > 1.2){ sfxGround(b.x, Math.abs(b.vy)); b.vy = -b.vy*0.35; b.vx *= 0.8; } else { b.vy = 0; b.vx *= 0.993; }
    }
    if (Math.abs(b.vx) < 0.05 && b.vy === 0){ b.vx = 0; b.rest = true; }
    return;
  }
  const big = b.mega || b.rmega;
  const v = Math.hypot(b.vx, b.vy);
  const kd = big ? 0 : 0.0045, km = 0.00055*b.spin;
  b.vx += (-kd*v*b.vx - km*b.vy)*DT;
  b.vy += (-kd*v*b.vy + km*b.vx - G)*DT;
  const ox = b.x;
  b.x += b.vx*DT; b.y += b.vy*DT; b.rot += b.spin*DT*0.5 + 0.2;
  b.maxY = Math.max(b.maxY, b.y);
  if (Math.random() < (big ? 1 : 0.35)) b.trail.push({x:b.x, y:b.y, life:1});
  if (b.trail.length > 160) b.trail.shift();
  if (b.mega && !b.hrCalled && b.predX !== undefined && b.x >= WALL) homeRunCall();
  if (ox < WALL && b.x >= WALL && b.y < STAND_WALL_TOP){ sfx('hard', {v: 0.6, rate: 0.7, rev: 0.2}); b.x = WALL - 0.01; b.vx *= -0.35; }
  if (ox > BWALL && b.x <= BWALL && b.y < STAND_WALL_TOP){ sfx('hard', {v: 0.6, rate: 0.7, rev: 0.2}); b.x = BWALL + 0.01; b.vx *= -0.35; }
  if (!big && ox < CX && b.x >= CX && b.y >= 0.45 && b.y <= 1.1){
    b.strike = true; cheer(0.4); showMsg('스트라이크!', 1.3); comment(TXT.strike, 3.5, 'shock'); sndSting('strike');
  }
  if (!big && !b.homing && catcher.mode === 'idle' && Math.abs(b.x - CX) < 0.6 && b.y < 1.5){
    catcher.mode = 'dodge'; catcher.t = 0; sfx('whoosh', {v: 0.35, rate: 1.4}); say(pick(TXT.dodge), 1.0, 'c');
  }
  const s = surf(b.x);
  if (b.y <= s){
    const vyIn = b.vy; b.y = s; b.landed = true; b.landX = b.x; landedAt = now; state = 'landed';
    if (!big && b.x > 3 && b.x < CX - 2 && Math.random() < 0.5) later(() => say(pick(CATCHER.short), 2, 'c'), 500);
    if (big) cheer(1.4); else if (b.x >= 80) cheer(0.8); else if (b.x >= 40) cheer(0.35); else if (b.x < 1 && !b.sulk) groan();
    b.vy = -b.vy*0.25; b.vx *= 0.25; if (big){ b.vy = Math.min(b.vy, 8); b.vx = Math.max(-10, Math.min(b.vx, 10)); }
    for (let i = 0; i < (big ? 80 : 18); i++) fx.push({x:b.x, y:s, vx:(Math.random()-0.5)*(big?30:4), vy:Math.random()*(big?25:3), life:1, c: big ? (Math.random()<.5?'#f2b632':'#d9412b') : '#b98e5a', r: big ? 0.6 : 0.08});
    if (big){ const k = [0, 0.5, 0.8, 1][b.tier || 3]; shake = 1.5*k; flash = 0.8*k; noise(1.4*k, 0.4*k, 250); tone(60, 1, 'sawtooth', 0.12*k, 30); sfx('body', {v: 0.8*k, rate: 0.8, rev: 0.3}); }
    if (!inWater(b.x)) sfxGround(b.x, Math.abs(vyIn));
    if (b.pin){ // let the pitcher go, he tumbles
      b.pin = false;
      for (const p of P){ p.px = p.x + 6*DT; p.py = p.y - 3*DT; }
      if (surf(b.x) > 0.5) b.perch = true;   // landed in the stands: he tumbles onto the seats, not through them
    }
  }
}

function catcherStep(dt){
  const c = catcher; c.t += dt;
  if (c.mode === 'dodge'){ c.rot = Math.min(1.3, c.t*6); c.x = CX + Math.min(0.6, c.t*3); if (c.t > 2.5) c.mode = 'idleAfter'; }
  else if (c.mode === 'leap'){
    const k = Math.min(1, c.t/0.35), e = k*k*(3-2*k);
    const tx = ball.x - 0.5, ty = ball.y - 0.4;
    c.x = c.x0 + (tx - c.x0)*e; c.y = Math.max(0, ty*e); c.rot += dt*8;
    if (k >= 1){ c.mode = 'carried'; say(pick(CATCHER.launch[3]), 3, 'c'); }
  } else if (c.mode === 'carried'){
    if (!ball.landed){ c.x = ball.x - 0.55; c.y = ball.y - 0.45; c.rot += dt*14; }
    else { c.mode = 'thrown'; c.vx = 7; c.vy = 6; c.x = ball.x - 1; c.y = Math.max(ball.y, 0.5); later(() => { if (catcher === c) say(pick(CATCHER.landed), 2.5, 'c'); }, 1300); }
  } else if (c.mode === 'thrown'){
    c.vy -= G*dt; c.x += c.vx*dt; c.y += c.vy*dt; c.rot += c.vx*dt*1.5;
    const s = surf(c.x);
    if (c.y < s){ c.y = s; c.vy = Math.abs(c.vy) > 2 ? -c.vy*0.4 : 0; c.vx *= 0.7; if (Math.abs(c.vx) < 0.5){ c.vx = 0; c.mode = 'down'; } }
  }
}

// ---------- result ----------
function tierOf(d, r){
  if (r.mega) return 'mega'; if (r.rmega) return 'rmega'; if (r.strike10) return 'textbook';
  if (r.type === 'sulk') return 'sulk';
  if (r.type === 'second') return 'second'; if (r.type === 'handoff') return 'deliver'; if (r.type === 'airmail') return 'airmail'; 
  if (r.type === 'timeout') return r.escape ? 'escape' : 'balk';
  if (d < 0) return 'back';
  if (d < 1) return 'drop'; if (d < 10) return 'self'; if (d < CX) return 'short';
  if (d < 40) return 'infield'; if (d < 80) return 'outfield'; if (d < WALL) return 'arm';
  if (d < 158) return 'stands'; return 'out';
}
function chipsHTML(names, oks, vals){
  return names.map((n,i) => `<span class="${oks[i] ? 'ok' : ''}">${oks[i] ? '✓' : '✗'} ${n} <em>${vals[i]}</em></span>`).join('');
}
function showResult(){
  state = 'result'; resultAt = performance.now();
  const r = release, d = ball.caught ? ball.landX : ball.x, f = r.f, carry = ball.landX, roll = d - carry;
  const back = r.rmega || r.type === 'second', score = back ? Math.abs(d) : d;
  const tier = tierOf(d, r);
  const got = [tier];
  const special = r.type === 'handoff' || r.type === 'airmail' || r.type === 'sulk' || r.type === 'second';
  if (r.fallen && !r.rmega && !r.strike10 && !special && !r.escape) got.push('lying');
  if (r.type === 'slip') got.push('slip');
  if (ball.strike) got.push('strike');
  const pts = r.pts;
  if (pts >= 8) got.push('serious');
  const ex = r.extra || {bonus: []}, live = r.type !== 'slip' && r.type !== 'timeout' && !special;
  if (live && ex.slot && d >= 10 && !r.rmega) got.push(ex.slot);                     // a real throw: name the arm slot
  if (!special) got.push(...ex.bonus);
  if (live && ball.maxY >= 4 && Math.abs((ball.landX ?? d) - r.x0) <= ball.maxY) got.push('vtol');   // a steep throw: comes down closer than it went up (~1.5% of random throws)
  if (live && !ball.caught && d >= CX - 3 && d <= CX - 0.2) got.push('almost');   // stops within 3m of the catcher (~1%)
  tierStreak.push(tier); if (tierStreak.length > 3) tierStreak.shift();
  if (tierStreak.length === 3 && tierStreak.every(t => t === tier)) got.push('streak');
  const fresh = got.filter(id => !titles.has(id));
  got.forEach(id => titles.add(id));
  let comment_ = TMAP[tier][2].length ? pick(TMAP[tier][2]) : '';
  if (tier === 'mega' && r.tier < 3 && d > WALL) comment_ = d >= 158
      ? `포수가 공을 받은 채 담장 밖으로 날아갔다. ${Math.round(catcher.x)}m 지점에서 발견됐다. 퇴근 의사를 밝혔다.`
      : `포수가 공을 받은 채 관중석에 떨어졌다. 한 관중이 포수를 기념품으로 챙기려 했다.`;
  else if (tier === 'mega' && r.tier < 3) comment_ = r.tier === 1 ? `포수가 공에 딸려 갔다. 본인 의지는 아니었다. ${Math.round(catcher.x)}m 지점에서 발견됐다.` : `포수가 공과 함께 날아갔다. ${Math.round(catcher.x)}m 지점에서 발견됐다. 아직 얼떨떨하다.`;
  else if (tier === 'mega') comment_ = `완벽한 폼이 우연히 완성됐다. 포수는 담장 너머 ${Math.round(catcher.x)}m 지점에서 발견됐다. 퇴근 의사를 밝혔다.`;
  if (tier === 'rmega' && r.tier < 3) comment_ = `투수가 공을 따라 뒤로 날아갔다. ${Math.round(Math.abs(P[I.pelvis].x))}m 뒤에서 발견됐다. ` + (r.tier === 1 ? '조금 날았다.' : '꽤 날았다.');
  else if (tier === 'rmega') comment_ = `투수가 공을 따라갔다. 마운드에는 모자만 남았다. 투수는 ${Math.round(Math.abs(P[I.pelvis].x))}m 뒤에서 발견됐고, 표정은 평온했다.`;
  if (r.fallen && !r.rmega && !r.strike10 && !special && !r.escape) comment_ += ' 참고로 누운 채로 던졌다.';
  const place = placeName(d);
  if (place && place.kind === 'water') comment_ += ` 공은 ${place.name}에 빠졌다. 굴러갈 수가 없었다.`;
  else if (place && Math.random() < 0.6) comment_ += ` 공은 ${place.name} 앞에 멈춰 섰다.`;
  if (tier === 'escape' && r.toSB != null) comment_ += ` 2루수까지는 ${r.toSB.toFixed(1)}m 남아 있었다.`;
  if (r.type === 'slip') comment_ += ' (공이 미끄러졌다. 본인은 땀 탓이라고 주장 중.)';
  if (ball.strike) comment_ += ' 그리고 놀랍게도 스트라이크였다. 아무도 신경 안 썼다.';
  if (tier === 'textbook') comment_ = '정확히 18.44m. 이 게임 역사상 가장 정확한 기록이다. 포수가 처음으로 공을 잡았다. 본인이 제일 놀랐다.';
  else if (pts >= 8) comment_ += ' 투구폼만큼은 진지했다. 너, 승부에 진지하구나?';
  if (pts >= 7 && pts < 10 && d >= 0 && d < 30) comment_ += ' (진지할수록 공이 안 날아가는 건 이 게임의 오래된 비밀이다.)';
  const megaName = r.mega ? (d >= 158 ? '포수 장외 홈런' : d > WALL ? '포수 홈런' : '포수 납치범') : TMAP[tier][1];
  $('rTitle').textContent = megaName + ((r.mega || r.rmega) ? ' ' + '★'.repeat(r.tier) + '☆'.repeat(3 - r.tier) : '');
  $('rTry').textContent = `경기 결과 · ${tries}번째 투구`;
  $('rDist').textContent = (back ? '← ' : '') + score.toFixed(1) + ' m';
  setLED($('rDistLed'), score.toFixed(1), 64);
  $('rUnit').textContent = back ? 'm ←' : 'm';
  $('rComment').textContent = comment_;
  { const news = comment_.split(/(?<=[.!?)])\s+/).filter(Boolean).map(s => s.replace(/\.$/, ''));
    const line = news.join('  ·  ') + '  ·  ' + `삐걱 구장 ${tries}번째 투구`;
    $('ticker').innerHTML = `<span>${line}</span><span style="padding-left:80px">${line}</span><span style="padding-left:80px"></span>`;
    $('tickerLbl').textContent = (r.mega || r.rmega || ball.strike) ? '긴급 속보' : '경기 소식'; }
  const deg = a => Math.round(a) + '°', A = (r.mega || r.rmega) ? r.ang : f.ang;
  $('rChecksF').innerHTML = chipsHTML(['발사각 22~55°','팔 스윙 18m/s','스트라이드 0.6m (착지)','중심 유지'], r.mega ? r.checks : f.f,
    [deg(A), f.v.toFixed(1), f.stride.toFixed(2) + 'm' + (f.lift >= 0.12 ? ' 공중' : ''), '머리 ' + f.headY.toFixed(2) + 'm']);
  const RN = ['뒤로 125~158°','팔 스윙 18m/s','림보 30°↑','학다리 20cm↑'];
  $('rChecksR').innerHTML = chipsHTML(RN.map((n,i) => revealed.has(i) ? n : '???'), r.rmega ? r.checks : f.r,
    [deg(A), f.v.toFixed(1), Math.round(-f.tilt) + '°', Math.round(f.lift*100) + 'cm'].map((v,i) => revealed.has(i) ? v : ''));
  $('rSerious').textContent = pts >= 8 ? `진지함 ${pts}점 ${'★'.repeat(pts)}` : '';
  { let sp = $('rSpd'); if (!sp){ const box = document.createElement('div'); box.className = 'spd'; box.innerHTML = '<small>구속</small><div class="led" id="rSpd"></div><span>km/h</span>'; $('rUnit').after(box); sp = $('rSpd'); }
    setLED(sp, String(Math.min(999, Math.round(r.speed*3.6))).padStart(3, ' '), 34); }
  const rows = [['최고 높이', ball.maxY.toFixed(1) + ' m']];
  if (!ball.caught && Math.abs(roll) >= 0.1) { const rv = r.rmega ? -roll : roll; rows.push(['굴러간 거리', (rv > 0 ? '+' : '') + rv.toFixed(1) + ' m']); }
  if (place) rows.push(['착지', place.kind === 'water' ? place.name + ' (풍덩)' : place.name + (place.near ? ' 근처' : '')]);
  rows.push(['놓은 방식', REL_NAME[r.type]]);
  if (live && ex.slot && !r.rmega) rows.push(['투구 폼', TMAP[ex.slot][1]]);
  $('rGrid').innerHTML = rows.map(([a,b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
  let bmsg;
  if (best === null || score > best){ bmsg = best === null ? '첫 기록. 축하합니다(?)' : `🎉 최고 기록 갱신! (이전 ${best.toFixed(1)} m)`; best = score; }
  else bmsg = `최고 기록 ${best.toFixed(1)} m · ${(best - score).toFixed(1)} m 모자람`;
  $('rBest').textContent = bmsg;
  $('rFresh').innerHTML = fresh.length ? '새 칭호 획득: ' + fresh.map(id => `<b>${TMAP[id][1]}</b>`).join(', ') : '';
  $('rDex').innerHTML = `<div class="dexh">칭호 도감 ${titles.size}/${TITLES.length} <small style="font-weight:700;color:#9a6a10">· <b>???<small>?</small></b>에 마우스를 올리면 힌트가 보여요</small></div>` +
    TITLES.map(([id, name, , hint]) => `<span class="${titles.has(id) ? 'got' : ''}${fresh.includes(id) ? ' new' : ''}"${hint ? ` title="힌트 · ${hint}"` : ''}>${titles.has(id) ? name : hint ? '???<small>?</small>' : '???'}</span>`).join('');
  $('dexBtn').textContent = `칭호 도감 ${titles.size}/${TITLES.length}`;
  const rv = review(r);
  $('rReviewLine').textContent = rv.line;
  $('rReviewBar').innerHTML = rv.bar ? barHTML(rv.bar) : '';
  $('rReviewSub').textContent = rv.sub || '';
  { let first = false; if (r.type === 'sulk'){ try { first = !localStorage.getItem(SAVE_NS + 'sulked'); localStorage.setItem(SAVE_NS + 'sulked', '1'); } catch(e){} }
    $('rFirstTip').innerHTML = first ? '처음이라 알려드려요 · K·L을 쥔 채로 <b>몸부터 움직여 보세요</b> (Q·W·E 같은 왼손 키). 아무것도 안 하고 놓으면 투수가 삐집니다.' : '';
    $('againBtn').textContent = first ? '바로 다시 (Space)' : '한 번 더 (Space)'; }
  drawPhoto(r, rv.cap);
  $('rCatcher').textContent = catcherAdvice(r);
  const sp = (r.mega || r.rmega || r.strike10) ? screenAdsLast : null;
  $('rSpon').innerHTML = sp ? `<small>오늘의 경기 협찬</small>이 ${r.rmega ? '비행' : r.strike10 ? '스트라이크' : '홈런'}은 <b>${sp.brand}</b>${(sp.brand.charCodeAt(sp.brand.length - 1) - 0xAC00) % 28 ? '이' : '가'} 함께했습니다` : '';
  save(); refreshDemos();   // DEMO-LINE (build_release.py drops this call)
  $('result').classList.remove('hidden');
  sndSting((r.mega || r.rmega || r.strike10) ? 'good' : 'meh');
}


// ================= SBC 삐걱방송: low-budget local-cable broadcast package =================
// ---- seven-segment digits (second-hand stadium speed gun) ----
const SEG7 = {'0':'abcdef','1':'bc','2':'abged','3':'abgcd','4':'fgbc','5':'afgcd','6':'afgedc','7':'abc','8':'abcdefg','9':'abcdfg','-':'g',' ':''};
function ledHTML(str, h){
  const w = h*0.55, t = h*0.13, on = '#ff3b2f', off = '#1e0605';
  let html = '';
  for (const ch of str){
    if (ch === '.'){ html += `<svg width="${t*1.4}" height="${h}"><rect x="0" y="${h - t}" width="${t}" height="${t}" fill="${on}"/></svg>`; continue; }
    const s = SEG7[ch] ?? '', P_ = {a:[t, 0, w-2*t, t], g:[t, h/2 - t/2, w-2*t, t], d:[t, h - t, w-2*t, t], f:[0, t, t, h/2 - 1.5*t], b:[w - t, t, t, h/2 - 1.5*t], e:[0, h/2 + t/2, t, h/2 - 1.5*t], c:[w - t, h/2 + t/2, t, h/2 - 1.5*t]};
    html += `<svg width="${w}" height="${h}">` + Object.entries(P_).map(([k, [x, y, ww, hh]]) => `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" rx="${t*0.3}" fill="${s.includes(k) ? on : off}"/>`).join('') + '</svg>';
  }
  return html;
}
function setLED(el, str, h){ const key = str + '|' + h; if (el._led === key) return; el._led = key; el.innerHTML = ledHTML(str, h); el.style.gap = (h*0.08) + 'px'; }

// ---- bottom bars: on-air notice / breaking news ----
function showNotice(t){ $('noticeTxt').textContent = t; $('notice').classList.remove('hidden'); $('news').classList.add('hidden'); document.body.classList.add('bar1'); document.body.classList.remove('bar2'); }
function showNews(t){ $('newsTxt').textContent = t; $('news').classList.remove('hidden'); $('notice').classList.add('hidden'); document.body.classList.add('bar2'); document.body.classList.remove('bar1'); }
function hideBars(){ $('notice').classList.add('hidden'); $('news').classList.add('hidden'); document.body.classList.remove('bar1', 'bar2'); }

// ---- "broadcast trouble" endings: lying on the mound / sulking ----
function lyingEnd(r){
  return r.fallen && !r.mega && !r.rmega && !r.strike10 && !r.escape && !ball.caught &&
         r.type !== 'handoff' && r.type !== 'airmail' && r.type !== 'sulk' && r.type !== 'second';
}
function startAccident(kind){
  release.accident = true; landedAt = now;
  showNotice('잠시 중계에 차질이 있었습니다');
  readyAd = kind === 'sulk' ? pickSulkAd() : AD_FALL; readyAdState = {t0: null, delay: 1.8};
  comment(kind === 'sulk' ? '해설: 아 삐졌어요! 고독한 가을 야구 향기를 벌써 맡나 봐요!' : '해설: 아 누워버렸어요! 마운드가 편한가봐요!', 4.5, 'sigh');
}

// ---- virtual ads (가상광고): composited onto the field, like the real thing ----
// Each ad is laid out on a 560 x 280 board whose ground line is y = 266. Art is plain SVG; words are drawn with the page fonts.
const AF = `font-family="CFK Sans" font-weight="900"`;   // (words are lifted out of the SVG and painted with the web font, see artWords)
const ART = {
  pas: `<svg xmlns="http://www.w3.org/2000/svg" width="270" height="200" viewBox="0 0 270 200"><g transform="translate(0,20)"><rect x="8" y="10" width="134" height="150" rx="10" fill="#fff" stroke="#0b1f6b" stroke-width="5"/><rect x="8" y="10" width="134" height="44" rx="10" fill="#1d4fd8"/><rect x="8" y="40" width="134" height="14" fill="#1d4fd8"/><text x="75" y="42" text-anchor="middle" ${AF} font-size="24" fill="#fff">삐걱파스</text><path d="M8 120 L142 92 L142 112 L8 140 Z" fill="#ff8a00"/><circle cx="75" cy="86" r="22" fill="#e9f2ff" stroke="#1d4fd8" stroke-width="4"/><text x="75" y="94" text-anchor="middle" ${AF} font-size="20" fill="#1d4fd8">쿨</text><text x="75" y="152" text-anchor="middle" ${AF} font-size="12" fill="#0b1f6b">관절·근육·자존심</text></g><g transform="translate(160,-30)"><path d="M30 120 L18 70" stroke="#0b1f6b" stroke-width="7" stroke-linecap="round"/><circle cx="16" cy="64" r="8" fill="#fff" stroke="#0b1f6b" stroke-width="4"/><path d="M82 125 L98 150" stroke="#0b1f6b" stroke-width="7" stroke-linecap="round"/><rect x="22" y="60" width="66" height="120" rx="14" fill="#fff4e6" stroke="#0b1f6b" stroke-width="5"/><rect x="30" y="96" width="50" height="46" rx="6" fill="#ffd9b0" stroke="#e8a060" stroke-width="2"/><circle cx="44" cy="80" r="4" fill="#0b1f6b"/><circle cx="66" cy="80" r="4" fill="#0b1f6b"/><path d="M46 88 Q55 96 64 88" fill="none" stroke="#0b1f6b" stroke-width="3" stroke-linecap="round"/><path d="M40 180 L36 222 M70 180 L74 222 M24 222 L42 222 M68 222 L86 222" stroke="#0b1f6b" stroke-width="7" stroke-linecap="round"/></g></svg>`,
  chicken: `<svg xmlns="http://www.w3.org/2000/svg" width="230" height="180" viewBox="0 0 230 180"><path d="M20 90 L210 90 L190 170 L40 170 Z" fill="#c8102e" stroke="#3a1d00" stroke-width="5"/><path d="M20 90 L210 90" stroke="#fff" stroke-width="6" stroke-dasharray="14 10"/><path d="M115 90 L115 170" stroke="#3a1d00" stroke-width="4"/><g stroke="#3a1d00" stroke-width="4"><ellipse cx="70" cy="70" rx="40" ry="28" fill="#e8a33a"/><ellipse cx="160" cy="70" rx="40" ry="28" fill="#b8231a"/></g><rect x="58" y="24" width="12" height="34" rx="6" fill="#fff4dc" stroke="#3a1d00" stroke-width="4"/><rect x="160" y="22" width="12" height="34" rx="6" fill="#fff4dc" stroke="#3a1d00" stroke-width="4"/><text x="70" y="140" text-anchor="middle" ${AF} font-size="22" fill="#fff">후라이드</text><text x="160" y="140" text-anchor="middle" ${AF} font-size="22" fill="#fff">양념</text></svg>`,
  vita: `<svg xmlns="http://www.w3.org/2000/svg" width="190" height="210" viewBox="0 0 190 210"><rect x="45" y="10" width="100" height="36" rx="8" fill="#f2b632" stroke="#3a1d00" stroke-width="5"/><rect x="25" y="44" width="140" height="160" rx="22" fill="#fff" stroke="#3a1d00" stroke-width="5"/><rect x="25" y="88" width="140" height="70" fill="#d9412b"/><text x="95" y="122" text-anchor="middle" ${AF} font-size="24" fill="#fff">직구왕</text><text x="95" y="148" text-anchor="middle" ${AF} font-size="14" fill="#fff">관절 영양제 · 90정</text><text x="95" y="186" text-anchor="middle" ${AF} font-size="12" fill="#3a1d00">※ 효과는 개인차가 큽니다</text></svg>`,
  job: `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><rect x="98" y="120" width="12" height="96" fill="#8a5a3a" stroke="#3a1d00" stroke-width="4"/><rect x="10" y="10" width="200" height="130" rx="6" fill="#fffbe8" stroke="#3a1d00" stroke-width="5"/><text x="110" y="50" text-anchor="middle" ${AF} font-size="28" fill="#c8102e">포수 급구</text><text x="110" y="80" text-anchor="middle" ${AF} font-size="15" fill="#3a1d00">· 날아가도 괜찮은 분</text><text x="110" y="102" text-anchor="middle" ${AF} font-size="15" fill="#3a1d00">· 퇴근 시간 미정</text><text x="110" y="126" text-anchor="middle" ${AF} font-size="14" fill="#1d4fd8">문의: 삐걱 구단</text></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><path d="M100 10 L180 40 L172 120 Q160 170 100 192 Q40 170 28 120 L20 40 Z" fill="#1f8a5b" stroke="#3a1d00" stroke-width="6"/><path d="M100 30 L160 52 L154 116 Q144 154 100 172 Q56 154 46 116 L40 52 Z" fill="#fff"/><circle cx="100" cy="96" r="24" fill="#fff" stroke="#1f8a5b" stroke-width="6"/><path d="M86 88 Q100 100 114 88" fill="none" stroke="#d9412b" stroke-width="4"/><path d="M84 104 Q100 92 116 104" fill="none" stroke="#d9412b" stroke-width="4"/><text x="100" y="148" text-anchor="middle" ${AF} font-size="18" fill="#1f8a5b">보장 OK</text></svg>`,
  taxi: `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="150" viewBox="0 0 250 150"><rect x="100" y="8" width="56" height="20" rx="4" fill="#fff" stroke="#3a1d00" stroke-width="4"/><text x="128" y="24" text-anchor="middle" ${AF} font-size="13" fill="#3a1d00">퇴근</text><path d="M30 70 L70 28 L180 28 L220 70 Z" fill="#ffd21a" stroke="#3a1d00" stroke-width="5"/><rect x="10" y="68" width="230" height="52" rx="12" fill="#ffd21a" stroke="#3a1d00" stroke-width="5"/><path d="M78 34 L78 66 M172 34 L172 66 M125 34 L125 66" stroke="#3a1d00" stroke-width="4"/><rect x="84" y="36" width="34" height="28" fill="#bfe3ff"/><rect x="131" y="36" width="34" height="28" fill="#bfe3ff"/><rect x="10" y="86" width="230" height="10" fill="#111"/><circle cx="62" cy="122" r="18" fill="#2b2b2b" stroke="#3a1d00" stroke-width="5"/><circle cx="190" cy="122" r="18" fill="#2b2b2b" stroke="#3a1d00" stroke-width="5"/></svg>`,
  bed: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="150" viewBox="0 0 260 150"><rect x="10" y="20" width="22" height="110" rx="6" fill="#8a5a3a" stroke="#3a1d00" stroke-width="4"/><rect x="228" y="60" width="22" height="70" rx="6" fill="#8a5a3a" stroke="#3a1d00" stroke-width="4"/><rect x="22" y="78" width="220" height="34" rx="8" fill="#fff" stroke="#3a1d00" stroke-width="4"/><rect x="22" y="104" width="220" height="16" fill="#8a5a3a" stroke="#3a1d00" stroke-width="4"/><ellipse cx="66" cy="72" rx="34" ry="14" fill="#f2e8ff" stroke="#3a1d00" stroke-width="4"/><path d="M90 70 Q160 40 236 74 L236 86 L90 86 Z" fill="#b48ae0" stroke="#3a1d00" stroke-width="4"/><text x="160" y="40" ${AF} font-size="26" fill="#7a3db8" stroke="#fff" stroke-width="5" paint-order="stroke">Zzz…</text></svg>`,
  gukbap: `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="210" viewBox="0 0 250 210"><path d="M70 40 Q60 20 74 6 M110 40 Q100 18 116 4 M150 40 Q140 20 154 6" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".9"/><ellipse cx="125" cy="70" rx="110" ry="24" fill="#f6d9a8" stroke="#3a1d00" stroke-width="5"/><ellipse cx="125" cy="70" rx="96" ry="16" fill="#fff3dc"/><g fill="#5aa832"><circle cx="90" cy="68" r="5"/><circle cx="140" cy="64" r="5"/><circle cx="160" cy="74" r="4"/><circle cx="110" cy="76" r="4"/></g><path d="M15 70 Q30 170 125 172 Q220 170 235 70" fill="#2b2b2b" stroke="#3a1d00" stroke-width="5"/><text x="125" y="135" text-anchor="middle" ${AF} font-size="30" fill="#ffd21a">24시</text><rect x="70" y="172" width="110" height="18" rx="4" fill="#c0392b" stroke="#3a1d00" stroke-width="4"/></svg>`,
  plane: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="150" viewBox="0 0 260 150"><path d="M20 80 Q20 60 60 60 L200 60 Q240 62 248 80 Q240 98 200 100 L60 100 Q20 100 20 80 Z" fill="#fff" stroke="#0b1f6b" stroke-width="5"/><path d="M110 64 L150 10 L172 10 L150 64 Z M110 96 L150 146 L172 146 L150 96 Z" fill="#1d4fd8" stroke="#0b1f6b" stroke-width="5"/><path d="M30 62 L14 30 L36 30 L58 62 Z" fill="#1d4fd8" stroke="#0b1f6b" stroke-width="5"/><g fill="#bfe3ff" stroke="#0b1f6b" stroke-width="2"><circle cx="190" cy="78" r="6"/><circle cx="170" cy="78" r="6"/><circle cx="90" cy="78" r="6"/><circle cx="70" cy="78" r="6"/></g><rect x="100" y="88" width="80" height="6" fill="#e01010"/></svg>`,
  box: `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="170" viewBox="0 0 240 170"><path d="M30 70 Q-10 40 10 20 Q40 40 60 70 Z" fill="#fff" stroke="#3a1d00" stroke-width="5"/><path d="M190 70 Q250 40 230 20 Q200 40 180 70 Z" fill="#fff" stroke="#3a1d00" stroke-width="5"/><rect x="50" y="60" width="140" height="100" rx="6" fill="#c98a4a" stroke="#3a1d00" stroke-width="5"/><path d="M50 92 L190 92" stroke="#3a1d00" stroke-width="4"/><rect x="105" y="60" width="30" height="32" fill="#e8c27a" stroke="#3a1d00" stroke-width="4"/><text x="120" y="135" text-anchor="middle" ${AF} font-size="20" fill="#3a1d00">당일 착지</text></svg>`,
  mat: `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="110" viewBox="0 0 250 110"><rect x="10" y="40" width="230" height="60" rx="18" fill="#ff8a00" stroke="#3a1d00" stroke-width="5"/><rect x="10" y="40" width="230" height="22" rx="11" fill="#ffc266" stroke="#3a1d00" stroke-width="5"/><path d="M60 52 L60 96 M125 52 L125 96 M190 52 L190 96" stroke="#3a1d00" stroke-width="3" opacity=".5"/><path d="M125 6 L125 30 M112 18 L125 32 L138 18" fill="none" stroke="#e01010" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><text x="125" y="86" text-anchor="middle" ${AF} font-size="20" fill="#3a1d00">여기 착지</text></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="230" height="200" viewBox="0 0 230 200"><rect x="10" y="10" width="210" height="180" rx="12" fill="#e9f4ff" stroke="#0b1f6b" stroke-width="5"/><circle cx="70" cy="80" r="30" fill="#ffd21a" stroke="#e08a00" stroke-width="5"/><g stroke="#e08a00" stroke-width="5" stroke-linecap="round"><path d="M70 30v-12M70 142v-12M20 80H8M132 80h-12M35 45l-8-8M105 115l8 8M105 45l8-8M35 115l-8 8"/></g><g transform="translate(150 70) rotate(-25)"><ellipse cx="0" cy="0" rx="26" ry="12" fill="#26345a" stroke="#0b1f6b" stroke-width="3"/><circle cx="24" cy="-6" r="10" fill="#1f2a44" stroke="#0b1f6b" stroke-width="3"/><circle cx="-26" cy="4" r="8" fill="#8a5428" stroke="#0b1f6b" stroke-width="3"/></g><text x="115" y="170" text-anchor="middle" ${AF} font-size="22" fill="#0b1f6b">맑음 · 가끔 포수</text></svg>`,
  house: `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="190" viewBox="0 0 220 190"><path d="M20 90 L110 20 L200 90 Z" fill="#d9412b" stroke="#3a1d00" stroke-width="5" stroke-linejoin="round"/><rect x="40" y="88" width="140" height="92" fill="#fff4dc" stroke="#3a1d00" stroke-width="5"/><rect x="96" y="124" width="30" height="56" fill="#8a5a3a" stroke="#3a1d00" stroke-width="4"/><rect x="56" y="108" width="28" height="26" fill="#bfe3ff" stroke="#3a1d00" stroke-width="4"/><rect x="138" y="108" width="28" height="26" fill="#bfe3ff" stroke="#3a1d00" stroke-width="4"/><rect x="120" y="30" width="96" height="30" rx="4" fill="#ffd21a" stroke="#3a1d00" stroke-width="4"/><text x="168" y="52" text-anchor="middle" ${AF} font-size="17" fill="#3a1d00">포세권!</text></svg>`,
  balloon: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="250" viewBox="0 0 200 250"><path d="M100 10 C 30 10, 20 100, 70 150 L130 150 C 180 100, 170 10, 100 10 Z" fill="#ff8a00" stroke="#3a1d00" stroke-width="5"/><path d="M100 10 C 85 30, 85 120, 100 150 Z" fill="#ffd21a"/><path d="M100 10 C 70 30, 70 120, 85 150 M100 10 C 130 30, 130 120, 115 150" fill="none" stroke="#3a1d00" stroke-width="4"/><path d="M75 150 L80 195 M125 150 L120 195" stroke="#3a1d00" stroke-width="4"/><rect x="72" y="192" width="56" height="40" rx="6" fill="#a0642e" stroke="#3a1d00" stroke-width="5"/><circle cx="100" cy="186" r="10" fill="#1f2a44" stroke="#3a1d00" stroke-width="3"/></svg>`,
  pin: `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="210" viewBox="0 0 240 210"><rect x="10" y="40" width="220" height="150" rx="16" fill="#2b2b2b" stroke="#111" stroke-width="5"/><rect x="22" y="52" width="196" height="126" rx="8" fill="#d8f0c8"/><path d="M30 150 Q80 120 120 140 T 210 90" fill="none" stroke="#fff" stroke-width="12"/><path d="M30 150 Q80 120 120 140 T 210 90" fill="none" stroke="#1d4fd8" stroke-width="6" stroke-dasharray="10 8"/><path d="M150 20 C 130 20, 122 40, 132 56 L150 84 L168 56 C 178 40, 170 20, 150 20 Z" fill="#e01010" stroke="#3a1d00" stroke-width="4"/><circle cx="150" cy="40" r="8" fill="#fff"/><text x="120" y="172" text-anchor="middle" ${AF} font-size="16" fill="#0b1f6b">경로를 재탐색합니다</text></svg>`,
  lost: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="230" viewBox="0 0 200 230"><rect x="10" y="10" width="180" height="210" fill="#fffbe8" stroke="#3a1d00" stroke-width="5" transform="rotate(3 100 115)"/><rect x="80" y="2" width="40" height="18" fill="#f0dc96" transform="rotate(-4 100 10)"/><text x="100" y="52" text-anchor="middle" ${AF} font-size="30" fill="#e01010">찾습니다</text><rect x="50" y="66" width="100" height="80" fill="#cfd6ea" stroke="#3a1d00" stroke-width="3"/><circle cx="100" cy="98" r="20" fill="#1f2a44"/><rect x="74" y="118" width="52" height="28" rx="8" fill="#26345a"/><text x="100" y="172" text-anchor="middle" ${AF} font-size="15" fill="#3a1d00">포수 · 1명 · 날아감</text><text x="100" y="196" text-anchor="middle" ${AF} font-size="13" fill="#1d4fd8">사례: 국밥 1그릇</text></svg>`,
  cross: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" fill="#fff" stroke="#1f8a5b" stroke-width="8"/><path d="M80 40 H120 V80 H160 V120 H120 V160 H80 V120 H40 V80 H80 Z" fill="#1f8a5b" stroke="#0b4a30" stroke-width="5"/><rect x="120" y="140" width="72" height="42" rx="20" fill="#fff4e6" stroke="#3a1d00" stroke-width="4" transform="rotate(-20 156 161)"/></svg>`,
  glove: `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="210" viewBox="0 0 220 210"><path d="M40 190 L40 90 Q40 60 60 60 L60 30 Q60 14 76 14 Q92 14 92 30 L92 22 Q92 6 108 6 Q124 6 124 22 L124 30 Q124 16 140 16 Q156 16 156 32 L156 70 Q172 58 188 70 Q200 82 186 100 L150 160 L150 190 Z" fill="#b5652b" stroke="#3a1d00" stroke-width="6" stroke-linejoin="round"/><path d="M76 60 V100 M108 50 V100 M140 60 V100" stroke="#3a1d00" stroke-width="4"/><circle cx="96" cy="140" r="26" fill="#fff" stroke="#3a1d00" stroke-width="5"/><path d="M80 128 Q96 140 80 152 M112 128 Q96 140 112 152" stroke="#e01010" stroke-width="3" fill="none"/></svg>`,
};
// [slogan lines, brand, colour, brand outline, art, art x, art y (top), art scale]
const mkAd = (slogan, brand, color, art, ax, ay, opt={}) => ({slogan, brand, color, art, ax, ay, stroke: opt.stroke || '#fff', size: opt.size || 84, sc: opt.sc || 1});
const READY_ADS = [
  mkAd(['던지기 전', '한 장 척!'], '삐걱파스', '#1d4fd8', 'pas', 300, 70),
  mkAd(['한 마리로', '두 가지 맛'], '치킨은반반', '#c8102e', 'chicken', 440, 90, {size: 80}),
  mkAd(['어깨가', '삐걱일 땐'], '관절엔직구왕', '#d9412b', 'vita', 455, 60, {size: 66}),
  mkAd(['날아가도', '괜찮으신 분'], '포수구함', '#1d4fd8', 'job', 340, 56),
  mkAd(['투구 중 사고도', '든든하게'], '삐걱손보', '#1f8a5b', 'shield', 350, 70),
  mkAd(['경기 끝나면', '바로 퇴근'], '퇴근택시', '#ffd21a', 'taxi', 330, 120, {stroke: '#3a1d00'}),
];
const AD_FALL = mkAd(['마운드보다', '편안한'], '삐걱침대', '#7a3db8', 'bed', 330, 120);
Object.assign(ART, {
  icecream: `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="230" viewBox="0 0 180 230"><path d="M50 110 L90 222 L130 110 Z" fill="#e8b46a" stroke="#3a1d00" stroke-width="5" stroke-linejoin="round"/><path d="M62 130 L118 130 M70 155 L110 155 M78 180 L102 180" stroke="#b8843a" stroke-width="4"/><circle cx="90" cy="70" r="42" fill="#ffb3c8" stroke="#3a1d00" stroke-width="5"/><circle cx="62" cy="100" r="26" fill="#fff4dc" stroke="#3a1d00" stroke-width="5"/><circle cx="118" cy="100" r="26" fill="#8a5428" stroke="#3a1d00" stroke-width="5"/><circle cx="76" cy="62" r="4" fill="#3a1d00"/><circle cx="104" cy="62" r="4" fill="#3a1d00"/><path d="M80 82 Q90 76 100 82" fill="none" stroke="#3a1d00" stroke-width="4" stroke-linecap="round"/><path d="M68 50 L82 56 M112 50 L98 56" stroke="#3a1d00" stroke-width="4" stroke-linecap="round"/></svg>`,
  karaoke: `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><rect x="10" y="20" width="200" height="120" rx="10" fill="#2b2b2b" stroke="#111" stroke-width="5"/><rect x="22" y="32" width="176" height="96" rx="4" fill="#3a2a6b"/><text x="110" y="74" text-anchor="middle" ${AF} font-size="20" fill="#ffd21a">나 안 해 ♪</text><text x="110" y="106" text-anchor="middle" ${AF} font-size="15" fill="#fff">(작사·작곡: 투수)</text><path d="M150 210 L170 150" stroke="#3a1d00" stroke-width="10" stroke-linecap="round"/><circle cx="174" cy="140" r="20" fill="#9aa1ae" stroke="#3a1d00" stroke-width="5"/><text x="48" y="178" ${AF} font-size="30" fill="#e01010">98점</text></svg>`,
  pillow: `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="170" viewBox="0 0 240 170"><path d="M20 50 Q10 20 50 26 Q120 10 190 26 Q230 20 220 50 Q232 90 220 130 Q230 160 190 152 Q120 166 50 152 Q10 160 20 130 Q8 90 20 50 Z" fill="#f2e8ff" stroke="#3a1d00" stroke-width="5"/><path d="M80 80 L100 90 M160 80 L140 90" stroke="#3a1d00" stroke-width="5" stroke-linecap="round"/><path d="M100 118 Q120 108 140 118" fill="none" stroke="#3a1d00" stroke-width="5" stroke-linecap="round"/><path d="M196 30 Q206 14 216 30 Q206 44 196 30" fill="#7fd0ff" stroke="#3a1d00" stroke-width="3"/></svg>`,
  ticket: `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="160" viewBox="0 0 250 160"><path d="M10 30 H240 V62 Q222 80 240 98 V130 H10 V98 Q28 80 10 62 Z" fill="#ffd21a" stroke="#3a1d00" stroke-width="5" stroke-linejoin="round"/><path d="M180 34 V126" stroke="#3a1d00" stroke-width="4" stroke-dasharray="8 6"/><text x="95" y="74" text-anchor="middle" ${AF} font-size="22" fill="#c8102e">가을야구</text><text x="95" y="106" text-anchor="middle" ${AF} font-size="16" fill="#3a1d00">관람권 · 혼자석</text><text x="210" y="88" text-anchor="middle" ${AF} font-size="16" fill="#3a1d00">1매</text></svg>`,
});
const SULK_ADS = [
  mkAd(['삐져도', '맛있는'], '삐걱국밥', '#c0392b', 'gukbap', 350, 60),
  mkAd(['삐진 마음엔', '달달한 한 스쿱'], '삐걱아이스크림', '#e2588a', 'icecream', 480, 40, {size: 62}),
  mkAd(['혼자 부르기 좋은 노래', '"나 안 해"'], '삐걱노래방', '#7a3db8', 'karaoke', 450, 40, {size: 70}),
  mkAd(['삐졌을 땐', '얼굴 묻을 곳이 필요해'], '삐걱베개', '#7a3db8', 'pillow', 450, 90),
  mkAd(['고독한 가을 야구', '혼자석 예매 중'], '삐걱예매', '#c8102e', 'ticket', 430, 100),
];
let lastSulkAd = null;
function pickSulkAd(){ const pool = SULK_ADS.filter(a => a !== lastSulkAd); return lastSulkAd = pool[Math.floor(Math.random()*pool.length)]; }
const FLY_ADS = [
  mkAd(['비행기보다', '포수가 먼저 도착'], '삐걱항공', '#1d4fd8', 'plane', 420, 100),
  mkAd(['날아가는 속도로', '포수가 오늘 출발'], '삐걱택배', '#c98a4a', 'box', 420, 90, {stroke: '#3a1d00'}),
  mkAd(['포수가 날아와도', '착지는 푹신하게'], '삐걱매트', '#ff8a00', 'mat', 420, 150),
  mkAd(['포수가 날아서 퇴근?', '택시가 더 빨라요'], '퇴근택시', '#ffd21a', 'taxi', 430, 120, {stroke: '#3a1d00'}),
  mkAd(['오늘의 날씨', '맑음, 가끔 포수'], '삐걱날씨', '#1d9bd8', 'sun', 430, 70),
  mkAd(['포수가 착지한 곳', '거기가 포세권'], '삐걱부동산', '#d9412b', 'house', 440, 80, {size: 70}),
  mkAd(['포수와 함께하는', '하늘 위 시내 투어'], '삐걱관광', '#ff8a00', 'balloon', 450, 20),
  mkAd(['포수가 경로를 이탈했습니다', '재탐색 중…'], '삐걱내비', '#1d4fd8', 'pin', 430, 60),
  mkAd(['날아간 포수를', '찾습니다'], '분실물센터', '#e01010', 'lost', 440, 50, {size: 70}),
  mkAd(['포수가 착지했다면', '다음 목적지는 여기'], '삐걱정형외과', '#1f8a5b', 'cross', 450, 70, {size: 70}),
  mkAd(['날아간 포수 대신', '공 받아 주실 분'], '포수구함', '#1d4fd8', 'job', 400, 56),
];
Object.assign(ART, {
  truck: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="170" viewBox="0 0 260 170"><rect x="10" y="30" width="150" height="100" rx="6" fill="#fff" stroke="#3a1d00" stroke-width="5"/><text x="85" y="76" text-anchor="middle" ${AF} font-size="24" fill="#d9412b">삐걱</text><text x="85" y="106" text-anchor="middle" ${AF} font-size="18" fill="#3a1d00">이삿짐</text><path d="M160 60 L210 60 L245 95 L245 130 L160 130 Z" fill="#1d4fd8" stroke="#3a1d00" stroke-width="5" stroke-linejoin="round"/><path d="M172 70 L205 70 L230 95 L172 95 Z" fill="#bfe3ff" stroke="#3a1d00" stroke-width="3"/><circle cx="55" cy="138" r="18" fill="#2b2b2b" stroke="#3a1d00" stroke-width="5"/><circle cx="205" cy="138" r="18" fill="#2b2b2b" stroke="#3a1d00" stroke-width="5"/></svg>`,
  camera: `<svg xmlns="http://www.w3.org/2000/svg" width="230" height="190" viewBox="0 0 230 190"><rect x="10" y="20" width="210" height="150" rx="14" fill="#2b2b2b" stroke="#111" stroke-width="5"/><rect x="22" y="32" width="186" height="126" rx="6" fill="#9fc8a8"/><path d="M40 150 L90 70 M190 150 L140 70" stroke="#ffd21a" stroke-width="6"/><path d="M60 120 H170" stroke="#e01010" stroke-width="5"/><path d="M75 96 H155" stroke="#ffd21a" stroke-width="5"/><g transform="translate(115 70) rotate(-20)"><ellipse rx="22" ry="10" fill="#f6f2e8" stroke="#111" stroke-width="3"/><circle cx="20" cy="-6" r="8" fill="#1f2a44" stroke="#111" stroke-width="3"/></g><text x="115" y="54" text-anchor="middle" ${AF} font-size="15" fill="#e01010">삐— 삐— 삐—</text></svg>`,
  roadsign: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="230" viewBox="0 0 200 230"><rect x="94" y="120" width="12" height="104" fill="#9aa1ae" stroke="#3a1d00" stroke-width="4"/><circle cx="100" cy="88" r="80" fill="#fff" stroke="#e01010" stroke-width="16"/><path d="M150 88 H70 M92 64 L66 88 L92 112" fill="none" stroke="#111" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><path d="M44 40 L156 136" stroke="#e01010" stroke-width="14" stroke-linecap="round"/><text x="100" y="160" text-anchor="middle" ${AF} font-size="14" fill="#111"> </text></svg>`,
  suitcase: `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="210" viewBox="0 0 210 210"><path d="M75 40 V16 H135 V40" fill="none" stroke="#3a1d00" stroke-width="8" stroke-linejoin="round"/><rect x="20" y="40" width="170" height="150" rx="16" fill="#ff8a00" stroke="#3a1d00" stroke-width="5"/><path d="M20 90 H190 M20 140 H190" stroke="#3a1d00" stroke-width="4" opacity=".5"/><rect x="40" y="60" width="64" height="40" rx="6" fill="#fff" stroke="#3a1d00" stroke-width="3" transform="rotate(-8 72 80)"/><text x="72" y="86" text-anchor="middle" ${AF} font-size="15" fill="#1d4fd8" transform="rotate(-8 72 80)">반대편</text><circle cx="150" cy="120" r="18" fill="#fff" stroke="#3a1d00" stroke-width="3"/><text x="150" y="126" text-anchor="middle" ${AF} font-size="16" fill="#e01010">✈</text><circle cx="50" cy="198" r="8" fill="#2b2b2b"/><circle cx="160" cy="198" r="8" fill="#2b2b2b"/></svg>`,
  cap: `<svg xmlns="http://www.w3.org/2000/svg" width="230" height="180" viewBox="0 0 230 180"><path d="M20 160 Q115 120 210 160 Z" fill="#c99a63" stroke="#3a1d00" stroke-width="5"/><path d="M60 128 Q60 60 115 58 Q170 60 170 128 Z" fill="#1f2a44" stroke="#3a1d00" stroke-width="5"/><path d="M165 120 Q210 118 222 132 L168 136 Z" fill="#1f2a44" stroke="#3a1d00" stroke-width="5"/><circle cx="115" cy="94" r="14" fill="#d9412b"/><path d="M90 30 Q100 10 115 24 M128 22 Q140 6 150 28" fill="none" stroke="#7fd0ff" stroke-width="5" stroke-linecap="round"/><text x="115" y="18" text-anchor="middle" ${AF} font-size="14" fill="#3a1d00">두고 감</text></svg>`,
});
Object.assign(ART, {
  scooter: `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="170" viewBox="0 0 250 170"><rect x="130" y="30" width="80" height="62" rx="6" fill="#d9412b" stroke="#3a1d00" stroke-width="5"/><text x="170" y="68" text-anchor="middle" ${AF} font-size="17" fill="#fff">배달</text><path d="M40 120 L90 120 L110 92 L210 92 L220 120" fill="none" stroke="#3a1d00" stroke-width="7" stroke-linejoin="round"/><path d="M60 120 L40 60 L20 58" fill="none" stroke="#3a1d00" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="132" r="22" fill="#2b2b2b" stroke="#3a1d00" stroke-width="5"/><circle cx="200" cy="132" r="22" fill="#2b2b2b" stroke="#3a1d00" stroke-width="5"/><circle cx="50" cy="132" r="8" fill="#9aa1ae"/><circle cx="200" cy="132" r="8" fill="#9aa1ae"/></svg>`,
  shoe: `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><path d="M20 110 L30 50 Q60 40 90 60 L140 80 Q200 90 220 110 L220 128 L20 128 Z" fill="#fff" stroke="#3a1d00" stroke-width="5" stroke-linejoin="round"/><rect x="20" y="118" width="200" height="18" rx="6" fill="#d9412b" stroke="#3a1d00" stroke-width="5"/><path d="M70 66 L90 90 M88 72 L108 94 M106 78 L124 98" stroke="#1d4fd8" stroke-width="5" stroke-linecap="round"/><path d="M150 40 Q170 20 190 40 M170 18 L176 4" fill="none" stroke="#7fd0ff" stroke-width="5" stroke-linecap="round"/></svg>`,
  stamp: `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="210" viewBox="0 0 210 210"><rect x="20" y="30" width="170" height="150" rx="6" fill="#fffbe8" stroke="#3a1d00" stroke-width="5"/><path d="M40 70 H170 M40 100 H170 M40 130 H120" stroke="#9aa1ae" stroke-width="5"/><g transform="rotate(-14 130 130)"><rect x="80" y="100" width="110" height="56" rx="8" fill="none" stroke="#e01010" stroke-width="7"/><text x="135" y="140" text-anchor="middle" ${AF} font-size="26" fill="#e01010">수령 완료</text></g></svg>`,
  tie: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="230" viewBox="0 0 200 230"><path d="M40 20 L100 50 L160 20 L170 60 L100 70 L30 60 Z" fill="#fff" stroke="#3a1d00" stroke-width="5" stroke-linejoin="round"/><path d="M88 66 L112 66 L120 84 L110 92 L140 200 L100 224 L60 200 L90 92 L80 84 Z" fill="#1d4fd8" stroke="#3a1d00" stroke-width="5" stroke-linejoin="round"/><path d="M76 120 L132 104 M70 150 L138 134 M66 180 L140 164" stroke="#ffd21a" stroke-width="6"/></svg>`,
  ruler: `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="150" viewBox="0 0 250 150"><rect x="10" y="50" width="230" height="56" rx="6" fill="#ffd21a" stroke="#3a1d00" stroke-width="5"/><g stroke="#3a1d00" stroke-width="4"><path d="M30 50v20M50 50v12M70 50v20M90 50v12M110 50v20M130 50v12M150 50v20M170 50v12M190 50v20M210 50v12"/></g><text x="125" y="96" text-anchor="middle" ${AF} font-size="22" fill="#3a1d00">18.44 m</text><path d="M200 20 L218 38 L240 6" fill="none" stroke="#1f8a5b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  textbook: `<svg xmlns="http://www.w3.org/2000/svg" width="230" height="200" viewBox="0 0 230 200"><path d="M115 40 Q70 20 20 30 L20 170 Q70 160 115 180 Q160 160 210 170 L210 30 Q160 20 115 40 Z" fill="#fff" stroke="#3a1d00" stroke-width="5" stroke-linejoin="round"/><path d="M115 40 V180" stroke="#3a1d00" stroke-width="5"/><path d="M40 70 H95 M40 95 H95 M40 120 H85 M135 70 H190 M135 95 H190 M135 120 H180" stroke="#9aa1ae" stroke-width="5"/><circle cx="168" cy="150" r="16" fill="#e01010"/><text x="168" y="157" text-anchor="middle" ${AF} font-size="18" fill="#fff">✓</text></svg>`,
});
const HANDOFF_ADS = [
  mkAd(['던지지 말고', '직접 갖다 드립니다'], '삐걱퀵', '#d9412b', 'scooter', 420, 80),
  mkAd(['투수도 걸어서 배달하는', '튼튼한 운동화'], '삐걱워킹화', '#1d4fd8', 'shoe', 440, 90, {size: 70}),
  mkAd(['스트라이크도', '등기로 보내세요'], '삐걱우체국', '#e01010', 'stamp', 450, 50, {size: 70}),
];
const SECOND_ADS = [
  mkAd(['마운드에서 2루까지', '당일 직배송'], '삐걱택배', '#8a5428', 'box', 450, 60, {size: 72}),
  mkAd(['송구가 무서우면', '손으로 건네세요'], '삐걱글러브', '#b5652b', 'glove', 450, 50, {size: 72}),
  mkAd(['2루수도 받아주는', '친절 배송'], '삐걱퀵', '#d9412b', 'scooter', 430, 80, {size: 76}),
  mkAd(['뒤로 걷기 전용', '후진 운동화'], '삐걱워킹화', '#1d4fd8', 'shoe', 440, 90, {size: 72}),
  mkAd(['2루행 소포', '반송은 안 됩니다'], '삐걱우체국', '#e01010', 'stamp', 450, 50, {size: 72}),
  mkAd(['2루수까지', '남은 거리 1m'], '후방카메라', '#1d4fd8', 'camera', 450, 70, {size: 72}),
  mkAd(['후진 중 2루수 주의', '공은 손으로만'], '삐걱교통공단', '#e01010', 'roadsign', 470, 40, {size: 60}),
];
const SERIOUS_ADS = [
  mkAd(['진지한 투수를 위한', '진지한 정장'], '삐걱양복점', '#1d4fd8', 'tie', 460, 40, {size: 70}),
  mkAd(['18.44m도', '정확하게'], '삐걱줄자', '#e0a000', 'ruler', 430, 110, {stroke: '#3a1d00'}),
  mkAd(['교과서에 실릴', '그 투구'], '삐걱교과서', '#1f8a5b', 'textbook', 440, 60, {size: 70}),
];
const BACK_ADS = [
  mkAd(['투수가 짐도 없이', '반대로 이사 중?'], '삐걱이삿짐', '#d9412b', 'truck', 440, 80, {size: 70}),
  mkAd(['투수가 뒤로 갈 땐', '삐— 삐— 삐—'], '후방카메라', '#1d4fd8', 'camera', 450, 70, {size: 70}),
  mkAd(['투수 역주행 주의', '마운드는 앞에 있습니다'], '삐걱교통공단', '#e01010', 'roadsign', 470, 40, {size: 62}),
  mkAd(['투수도 떠나는', '반대편 여행'], '삐걱여행사', '#ff8a00', 'suitcase', 450, 50),
  mkAd(['모자는 마운드에', '투수는 하늘에'], '모자보관소', '#1f2a44', 'cap', 440, 90, {size: 70}),
];
const ART_IMG = {};
// An SVG drawn as an image can't see the page's web fonts, so its <text> would fall back to whatever the OS has.
// Pull every <text> out (with its position, size, colour, anchor and any translate/rotate around it) and paint it on the canvas instead.
const ART_WORDS = {};
function artWords(svg){
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml'), out = [];
  const tf = el => { const m = []; for (let e = el; e && e.getAttribute; e = e.parentNode){ const t = e.getAttribute('transform'); if (t) m.unshift(t); } return m; };
  doc.querySelectorAll('text').forEach(t => {
    if (!t.textContent.trim()) { t.remove(); return; }
    out.push({s: t.textContent, x: +t.getAttribute('x') || 0, y: +t.getAttribute('y') || 0, size: +t.getAttribute('font-size') || 16,
              fill: t.getAttribute('fill') || '#000', stroke: t.getAttribute('stroke'), sw: +t.getAttribute('stroke-width') || 0,
              anchor: t.getAttribute('text-anchor') || 'start', tf: tf(t)});
    t.remove();
  });
  return {words: out, svg: new XMLSerializer().serializeToString(doc)};
}
function applyTf(g, list, sc){
  for (const t of list){
    for (const [, fn, args] of t.matchAll(/(translate|rotate)\(([^)]*)\)/g)){
      const v = args.split(/[ ,]+/).filter(Boolean).map(Number);
      if (fn === 'translate') g.translate(v[0]*sc, (v[1] || 0)*sc);
      else { const [a, cx = 0, cy = 0] = v; g.translate(cx*sc, cy*sc); g.rotate(a*Math.PI/180); g.translate(-cx*sc, -cy*sc); }
    }
  }
}
for (const [k, raw] of Object.entries(ART)){
  const {words, svg} = artWords(raw); ART_WORDS[k] = words;
  const im = new Image(); im.onload = () => { ART_IMG[k] = im; for (const a of [...READY_ADS, ...FLY_ADS, ...BACK_ADS, ...HANDOFF_ADS, ...SECOND_ADS, ...SERIOUS_ADS, AD_FALL, ...SULK_ADS]) if (a.art === k) a.cv = a.cvs = null; };
  im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
let adFontsOk = false;
function adCanvas(ad, shadow = true){
  const key = shadow ? 'cv' : 'cvs';
  if (ad[key]) return ad[key];
  const img = ART_IMG[ad.art]; if (!img || !adFontsOk) return null;
  const S = 2, c = document.createElement('canvas'); c.width = 700*S; c.height = 280*S;
  const g = c.getContext('2d'); g.scale(S, S); g.lineJoin = 'round';
  // soft contact shadow so it sits on the grass
  if (shadow){ g.fillStyle = 'rgba(20,40,10,.28)'; g.beginPath(); g.ellipse(290, 266, 270, 9, 0, 0, 7); g.fill(); }
  g.drawImage(img, ad.ax, ad.ay, img.width*ad.sc, img.height*ad.sc);
  for (const w of ART_WORDS[ad.art] || []){
    g.save(); g.translate(ad.ax, ad.ay); applyTf(g, w.tf, ad.sc);
    g.font = `900 ${w.size*ad.sc}px "CFK Sans", sans-serif`; g.textAlign = w.anchor === 'middle' ? 'center' : w.anchor === 'end' ? 'right' : 'left'; g.textBaseline = 'alphabetic';
    if (w.stroke && w.sw){ g.lineWidth = w.sw*ad.sc*2; g.strokeStyle = w.stroke; g.lineJoin = 'round'; g.strokeText(w.s, w.x*ad.sc, w.y*ad.sc); }
    g.fillStyle = w.fill; g.fillText(w.s, w.x*ad.sc, w.y*ad.sc); g.restore();
  }
  // slogan: white with a navy outline
  g.font = `900 ${ad.slogan[0].length > 11 || (ad.slogan[1] || '').length > 11 ? 30 : 36}px "CFK Sans", sans-serif`; g.textBaseline = 'alphabetic';
  { let fs = parseInt(g.font, 10); const widest = () => Math.max(...ad.slogan.map(s => g.measureText(s).width));
    while (fs > 22 && widest() > ad.ax + 40){ fs -= 2; g.font = `900 ${fs}px "CFK Sans", sans-serif`; } }
  ad.slogan.forEach((s, i) => { const y = 62 + i*40; g.lineWidth = 10; g.strokeStyle = '#0b1f6b'; g.strokeText(s, 4, y); g.fillStyle = '#fff'; g.fillText(s, 4, y); });
  // brand: big, loud, outlined, a drop shadow the station is proud of
  let size = ad.size;
  g.font = `400 ${size}px "CFK Display", "CFK Sans", sans-serif`;
  while (size > 40 && g.measureText(ad.brand).width > ad.ax - 12){ size -= 2; g.font = `400 ${size}px "CFK Display", "CFK Sans", sans-serif`; }
  const by = 120 + size*0.88;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(ad.brand, 4, by + 5);
  g.lineWidth = 12; g.strokeStyle = ad.stroke; g.strokeText(ad.brand, 0, by);
  g.fillStyle = ad.color; g.fillText(ad.brand, 0, by);
  ad[key] = c; return c;
}
// Ground ads wait their turn: player first, then the caster, then the ad (slow fade in, hold, slow fade out).
const AD_IN = 1.2, AD_LIFE = 4.5, AD_OUT = 1.2;
let readyAd = null, readyAdState = {t0: null, delay: 2.8}, lastReadyAd = null;
function placeReadyAd(){
  const pool = READY_ADS.filter(a => a !== lastReadyAd);
  readyAd = lastReadyAd = pool[Math.floor(Math.random()*pool.length)]; readyAdState = {t0: null, delay: 2.8};
  screenAds = null;
}
function adAlpha(age){ return age < 0 ? 0 : age < AD_IN ? age/AD_IN : age < AD_IN + AD_LIFE ? 1 : Math.max(0, 1 - (age - AD_IN - AD_LIFE)/AD_OUT); }
// While something flies, the ads don't stand on the ground: they pop up on the broadcast picture, one after another.
let screenAds = null, lastScreen = [], screenAdsLast = null;
function startScreenAds(pool, delay = 1.6){
  const list = pool.filter(a => !lastScreen.includes(a)).sort(() => Math.random() - 0.5).slice(0, 4);
  lastScreen = list.slice(0, 2);
  screenAds = {list, t0: performance.now()/1000 + delay}; screenAdsLast = list[0];   // after the breaking-news bar and the caster's first words
}
function adsBusy(){
  const t = performance.now()/1000;
  if (screenAds) return true;
  return !!(readyAd && (readyAdState.t0 == null || t - readyAdState.t0 < AD_IN + AD_LIFE + AD_OUT));
}

// ---- the decisive moment: a still of the release, with a telestrator circle ----
let snap = null;
function snapRelease(){
  try {
    if (jointTags){ jointTags = false; draw(); jointTags = true; }   // the photo shows the pitch, not the key labels
    const c = document.createElement('canvas'), k = 0.5;
    c.width = Math.round(cv.width*k); c.height = Math.round(cv.height*k);
    c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height);
    const [hx, hy] = W2S(P[I.rhand].x, P[I.rhand].y), [px, py] = W2S(P[I.pelvis].x, P[I.pelvis].y);
    snap = {c, k: k*DPR, hx, hy, px, py, z: cam.z};
  } catch(e){ snap = null; }
}
const SNAP_LABEL = {clean:'여기서 놓음', top:'여기서 놓음', back:'여기서 놓음', drag:'여기서 질질 놓음', slip:'여기서 미끄러짐', timeout:'끝까지 안 놓음', sulk:'여기서 삐짐', handoff:'여기서 건넴', second:'여기서 건넴', airmail:'여기서 건넴'};
function drawPhoto(r, cap){
  const pc = $('rPhoto'), g = pc.getContext('2d');
  g.fillStyle = '#bcd'; g.fillRect(0, 0, pc.width, pc.height);
  if (!snap){ $('rPhotoCap').textContent = cap; return; }
  const cw = Math.max(260, Math.min(W*0.8, snap.z*5.2)), ch = cw*pc.height/pc.width;
  let cx = (snap.hx + snap.px)/2, cy = (snap.hy + snap.py)/2 - ch*0.05;
  cx = Math.max(cw/2, Math.min(W - cw/2, cx)); cy = Math.max(ch/2, Math.min(H - ch/2, cy));
  const sx = (cx - cw/2)*snap.k, sy = (cy - ch/2)*snap.k;
  g.drawImage(snap.c, sx, sy, cw*snap.k, ch*snap.k, 0, 0, pc.width, pc.height);
  // telestrator: a wobbly hand-drawn circle around the hand, an arrow and a note
  const f = pc.width/cw, hx = (snap.hx - (cx - cw/2))*f, hy = (snap.hy - (cy - ch/2))*f, R = 34;
  g.strokeStyle = '#ffe600'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); for (let i = 0; i <= 44; i++){ const a = i/40*Math.PI*2 - 0.6, rr = R*(1 + 0.08*Math.sin(i*1.7)); const x = hx + Math.cos(a)*rr*1.15, y = hy + Math.sin(a)*rr; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  const right = hx < pc.width*0.6, tx = hx + (right ? 70 : -70), ty = hy + (hy < pc.height*0.5 ? 70 : -60);
  g.beginPath(); g.moveTo(hx + (right ? R : -R), hy + (ty > hy ? R*0.6 : -R*0.6)); g.lineTo(tx, ty); g.stroke();
  g.font = '900 30px "CFK Sans", sans-serif'; g.textAlign = right ? 'left' : 'right'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = '#000'; g.strokeText(SNAP_LABEL[r.type] || '여기서 놓음', tx + (right ? 6 : -6), ty);
  g.fillStyle = '#fff'; g.fillText(SNAP_LABEL[r.type] || '여기서 놓음', tx + (right ? 6 : -6), ty);
  $('rPhotoCap').textContent = cap;
}

// ---- 투구 복기: one cause, one picture, nothing else ----
function barHTML(b){
  const p = v => Math.max(0, Math.min(100, (v - b.min)/(b.max - b.min)*100));
  const g0 = Math.min(p(b.good[0]), p(b.good[1])), g1 = Math.max(p(b.good[0]), p(b.good[1])), m = p(b.val);
  return `<div class="tlab"><b style="left:${Math.max(9, Math.min(91, m))}%">이번 투구 ▼</b></div>
    <div class="tbar"><div class="ok" style="left:${g0}%;width:${g1 - g0}%"><i>${b.goodLbl}</i></div><div class="mk" style="left:${m}%"></div></div>
    <div class="tlab"><span style="left:0">${b.left}</span><span style="right:0">${b.right}</span></div>`;
}
function review(r){
  const f = r.f, out = {line: '', bar: null, sub: '', cap: '▲ 공이 손을 떠난 순간.'};
  if (r.escape){ out.line = `2루수까지 ${r.toSB.toFixed(1)}m 남았습니다. 출구는 그보다 한참 멀고요.`; out.cap = '▲ 퇴근을 결심한 순간.'; return out; }
  if (r.strike10){ out.line = '완벽하게 진지한 투구였습니다. 거리는… 18.44m입니다.'; return out; }
  if (r.type === 'second'){ out.line = '앞이 아니라 뒤로 갖다줬습니다. 2루수도 당황했습니다.'; out.cap = '▲ 2루수에게 건네는 순간.'; return out; }
  if (r.type === 'handoff' || r.type === 'airmail'){ out.line = '던지지 않고 직접 갖다줬습니다. 규칙상 문제는… 아마 없습니다.'; out.cap = '▲ 공을 건네는 순간.'; return out; }
  if (r.type === 'sulk'){ out.line = '공을 쥐었다가 바로 놓았습니다. 몸은 한 번도 안 움직였어요.'; out.sub = '몸부터 움직여 보는 건 어떨까요.'; out.cap = '▲ 투구 의지가 사라진 순간.'; return out; }
  if (r.mega || r.rmega){
    const n = r.tier + 1, dir = r.mega ? '앞으로' : '뒤로';
    out.line = n >= 4 ? `${dir} 조건 4개가 전부 맞았습니다. 포수에게는 미안합니다.` : `${dir} 조건이 ${n}개 맞았습니다. 하나 더 맞으면 더 멀리 갑니다.`;
    out.cap = '▲ 무언가 맞아떨어진 순간.'; return out;
  }
  if (r.type === 'timeout'){ out.line = '20초 동안 공을 놓지 않았습니다.'; out.cap = '▲ 시간이 다 된 순간. 공은 아직 손에 있었다.'; return out; }
  if (r.type === 'slip'){ out.line = '손가락 힘이 빠져 공이 미끄러졌습니다.'; out.sub = 'K·L을 둘 다 꾹 누르고 있어야 버팁니다.'; out.cap = '▲ 공이 땀에 미끄러진 순간.'; return out; }
  if (r.type === 'drag'){
    out.line = '두 손가락을 따로따로 놓았습니다.';
    out.bar = {min: 0, max: 450, good: [0, 30], val: (r.gap || 0)*1000, left: '동시에 놓음', right: '질질 끌림', goodLbl: '깔끔'};
    out.cap = '▲ 손가락이 서로 상의하지 않은 순간.'; return out;
  }
  const ang = f.ang;
  if (!f.f[0]){
    if (ang > 90){ out.line = '공이 뒤로 날아갔습니다. 놓는 순간 팔이 아직 뒤에 있었어요.'; out.cap = '▲ 팔이 아직 뒤를 향하고 있었다.'; }
    else if (ang < -90){ out.line = '너무 늦게 놓아서 공이 뒤쪽 땅으로 향했습니다.'; out.cap = '▲ 팔이 한 바퀴를 거의 다 돈 뒤였다.'; }
    else if (ang > 55){ out.line = '팔이 다 돌기도 전에 공을 놓았습니다.'; out.cap = '▲ 팔은 아직 위를 향하고 있었다.'; }
    else { out.line = '너무 늦게 놓아서 공이 땅으로 향했습니다.'; out.cap = '▲ 팔은 이미 땅을 향하고 있었다.'; }
    out.bar = {min: 160, max: -60, good: [55, 22], val: ang < -90 ? -60 : Math.max(-60, Math.min(160, ang)), left: '팔 휘두르기 시작', right: '다 돌았음', goodLbl: '놓기 좋은 구간'};
  } else if (!f.f[1]){
    out.line = '팔이 충분히 빠르게 휘둘러지지 않았습니다.';
    out.bar = {min: 0, max: 30, good: [18, 30], val: Math.min(30, f.v), left: '느릿', right: '빠름', goodLbl: '이 정도는 돼야'};
  } else if (!f.f[2]){
    out.line = f.lift >= 0.12 ? '앞발이 공중에 뜬 채로 던졌습니다.' : '앞다리를 충분히 내딛지 않았습니다.';
    out.bar = {min: 0, max: 1, good: [0.6, 1], val: Math.min(1, f.stride), left: '제자리', right: '성큼', goodLbl: '내딛기 충분'};
  } else if (!f.f[3]){
    out.line = '몸이 무너진 채로 던졌습니다.';
    out.bar = {min: 0, max: 1.8, good: [1.2, 1.8], val: Math.max(0, Math.min(1.8, f.headY)), left: '누움', right: '꼿꼿', goodLbl: '버티기'};
  } else out.line = '이번 폼은 좋았습니다. 이 느낌 그대로 한 번 더.';
  const b = [r.bestF, r.bestR].sort((a, c) => c.n - a.n || c.t - a.t)[0], ago = Math.max(0, r.t - b.t);
  if (b.n === 4) out.sub = `조건 4개가 전부 맞았던 순간이 놓기 ${ago.toFixed(2)}초 전에 있었습니다. 그때 놨어야 했어요.`;
  else if (b.n === 3) out.sub = `조건 3개가 맞았던 순간이 놓기 ${ago.toFixed(2)}초 전에 있었습니다. 하나만 더 맞았으면…`;
  return out;
}
$('dexBtn').onclick = () => { const b = $('dexBox'); b.classList.toggle('hidden'); if (!b.classList.contains('hidden')) b.scrollIntoView({block: 'nearest', behavior: 'smooth'}); };

// phones and tablets get a notice first (the CSS only shows it on touch-only screens): where to play, and a way through for
// a tablet with a keyboard attached (the game itself needs the keyboard; touch does nothing)
{
  const u = $('mobileNoteUrl'); if (u) u.textContent = location.href;
  const c = $('mobileNoteCopy');
  if (c) c.onclick = () => { const ok = () => { c.textContent = '복사했어요'; }; try { navigator.clipboard.writeText(location.href).then(ok, () => {}); } catch(e){} };
  const p = $('mobileNotePeek'); if (p) p.onclick = () => $('mobileNote').classList.add('gone');
}

// web fonts arrive in unicode-range slices and canvas text never requests one: ask for every glyph we paint
{
  const ads = [...READY_ADS, ...FLY_ADS, ...BACK_ADS, ...HANDOFF_ADS, ...SECOND_ADS, ...SERIOUS_ADS, AD_FALL, ...SULK_ADS];
  const show = ads.map(a => a.brand).join('') + '0123456789m.';
  const body = ads.map(a => a.slogan.join('')).join('') + Object.values(SNAP_LABEL).join('') + FAC.map(f => f[5]).join('') +
               '삐걱 구장오늘의 투수: 상태 미상담장외야뒤쪽2루도경계반대편포수→SLOW▶';
  const words = Object.values(ART_WORDS).flat().map(w => w.s).join('');
  const flush = () => { for (const a of ads) a.cv = a.cvs = null; try { BD.key = ''; } catch(e){} };   // repaint every cached canvas
  // the page stays hidden (html.fontwait) until the embedded fonts are decoded, so nothing is ever laid out in a stand-in
  // font and then jumps; if they never come (a broken build, an old browser), show the page anyway
  const reveal = () => document.documentElement.classList.remove('fontwait');
  const done = () => { adFontsOk = true; flush(); reveal(); };
  setTimeout(reveal, 2500);
  if (document.fonts && document.fonts.load){
    Promise.all([document.fonts.load('400 84px "CFK Display"', show), document.fonts.load('900 36px "CFK Sans"', body + words),
                 document.fonts.load('700 12px "CFK Sans"', body)]).then(done, done);
    setTimeout(() => { if (!adFontsOk) done(); }, 3000);      // offline: draw with what we have now…
    document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', flush);   // …and repaint if a font turns up later
  } else done();
}

// The catcher wants to go home, so his advice is honest: a better throw sends him further, i.e. closer to home.
function catcherAdvice(r){
  const f = r.f, P_ = a => pick(a);
  if (r.escape) return P_(['출구는 반대쪽이에요. 아, 저도 같이 갈게요.', '퇴근하시는 거면 저도 데려가 주세요.']);
  if (r.strike10) return P_(['공을 잡아버렸네요… 이러면 경기가 계속되잖아요. 다음엔 저를 날려 주세요.', '완벽한 스트라이크네요. 근데 저는 아직 퇴근을 못 했어요.']);
  if (r.type === 'second') return P_(['저 여기 앞에 있어요. 2루수 말고 저한테 주세요.', '반대쪽이에요! 저한테 던져 주셔야 저도 퇴근하죠.']);
  if (r.type === 'handoff' || r.type === 'airmail') return P_(['갖다주시니 편하긴 한데요, 던져서 저를 집 쪽으로 보내 주시면 더 좋겠어요.', '걸어오실 시간에 던지셨으면 저 벌써 집이었어요.']);
  if (r.type === 'sulk') return P_(['삐지지 마시고 몸부터 움직여 봐요. 끝나야 저도 집에 가죠.', 'K·L 잡고 다리부터 움직여 보세요. 저 기다리다 잠들 것 같아요.']);
  if (r.rmega) return P_(['투수님이 날아가시면 저는 퇴근을 못 해요. 앞으로 던져 주세요.', '반대로 던지시면 저 말고 투수님이 퇴근하시잖아요. 그건 반칙이에요.']);
  if (r.mega){
    const n = r.tier + 1;
    return n >= 4 ? P_(['이번엔 집 근처까지 왔어요. 다음엔 현관 앞까지 부탁해요.', '완벽했어요. 이대로면 내일 출근도 날아서 하겠네요.'])
                  : `조건 ${n}개였대요. 하나만 더 맞추면 저 더 멀리 날아가요. 그럼 집이 더 가까워지고요.`;
  }
  if (r.type === 'timeout') return '20초 안에만 놓아 주세요. 놓기만 하면 저 퇴근할 수 있어요.';
  if (r.type === 'slip') return 'K·L 꾹 잡고 계세요. 공 떨어지면 줍는 건 저라서요.';
  if (r.type === 'drag') return 'K랑 L을 동시에 떼 보세요. 공이 깔끔하게 나가야 제가 빨리 날아가죠.';
  const ang = f.ang, b = [r.bestF, r.bestR].sort((a, c) => c.n - a.n || c.t - a.t)[0], ago = Math.max(0, r.t - b.t);
  if (b.n >= 3) return `${ago.toFixed(2)}초만 일찍 놓으셨으면 저 지금쯤 집이었어요.`;
  if (!f.f[0]){
    if (ang > 90 || ang < -90) return '공이 뒤로 갔어요. 앞으로 던져 주셔야 제가 날아서 퇴근하죠.';
    if (ang > 55) return '팔을 끝까지 돌리고 놓아 주세요. 그래야 공이 앞으로 가고, 저도 집 쪽으로 가요.';
    return '조금만 일찍 놓아 주세요. 공이 땅에 박히면 줍는 건 저예요.';
  }
  if (!f.f[1]) return '팔을 더 세게 휘둘러 주세요. 공이 빨라야 제가 멀리 날아가고, 퇴근도 빨라져요.';
  if (!f.f[2]) return f.lift >= 0.12 ? '앞발을 땅에 딛고 던져 보세요. 발이 붙어야 힘이 실리고, 저도 멀리 가요.' : '앞다리를 쭉 내디뎌 보세요. 성큼 디딜수록 저는 집에 가까워져요.';
  if (!f.f[3]) return '좀 서서 던져 주세요. 누워서 던지시면 저도 눕고 싶어져요.';
  return '폼은 좋았어요. 이대로 몇 번만 더 하면 저 진짜 집에 갈 수 있겠어요.';
}

// ---- mute (M key or the speaker button); remembered between visits ----
function setMute(m){
  muted = m; try { localStorage.setItem('pitchqwop.mute', m ? '1' : '0'); } catch(e){}
  if (AC && OUT) OUT.gain.setTargetAtTime(m ? 0 : 1, AC.currentTime, 0.03);
  const b = $('muteBtn'); if (b){ b.textContent = m ? '🔇 소리 꺼짐 (M)' : '🔊 소리 (M)'; b.classList.toggle('off', m); }
}
addEventListener('keydown', e => { if (e.code === 'KeyM' && !e.repeat){ e.preventDefault(); audioInit(); setMute(!muted); } });
$('muteBtn').onclick = e => { e.currentTarget.blur(); audioInit(); setMute(!muted); };
setMute(muted);

// ================= stadium music: SBC's cheer song (original tune) played by the house brass band =================
// Acoustic instruments only — trumpets, trombones, tuba, marching snare and bass drum, cymbal, glockenspiel —
// with the crowd joining in ("헤이!", "삐-걱!", 짝짝 짝짝짝). Built once as a list of events per beat, then
// scheduled a little ahead of time so the tempo can change (it speeds up when time is running out) and the
// whole band ducks under the flights. Everything goes through ORG.gain, so mute and ducking still work.
const ORG = {gain: null, next: 0, beat: 0, timer: null, bpm: 138, level: 0.36, duck: 1, song: null, bus: null, room: null};
const mhz = m => 440*Math.pow(2, (m - 69)/12);
function bandBusOf(){                                                // band → glue compressor → music fader (ORG.gain), plus a big concrete room
  if (ORG.bus) return ORG.bus;
  const b = AC.createGain(), c = AC.createDynamicsCompressor(); c.threshold.value = -16; c.ratio.value = 3; c.attack.value = 0.008; c.release.value = 0.25;
  b.connect(c).connect(ORG.gain);
  const n = Math.floor(AC.sampleRate*2.4), ir = AC.createBuffer(2, n, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++){ const d = ir.getChannelData(ch); for (let i = 0; i < n; i++){ const t = i/AC.sampleRate; d[i] = (Math.random()*2 - 1)*Math.exp(-t*2.6)*(t < 0.03 ? t/0.03 : 1)*(t > 0.06 ? 1 : 0.4); } }
  ORG.room = AC.createConvolver(); ORG.room.buffer = ir; const rg = AC.createGain(); rg.gain.value = 0.55; ORG.room.connect(rg).connect(ORG.gain);
  const s = AC.createGain(); s.gain.value = 0.45; b.connect(s).connect(ORG.room);
  return ORG.bus = b;
}
const bandOut = (n, pan = 0) => { let x = n; if (pan && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = pan; x = n.connect(p); } x.connect(bandBusOf()); };
// a brass player: buzzing lips (saw + a little square), a bell that opens with loudness, a pitch scoop at the start, breath, late vibrato
function horn(kind, t, m, len, v, pan = 0, dest = null){
  const S = {tpt: {cut: 3600, open: 1.6, a: 0.025, scoop: -35, breath: 0.05}, tbn: {cut: 1700, open: 1.8, a: 0.045, scoop: -25, breath: 0.03}, tuba: {cut: 650, open: 1.5, a: 0.03, scoop: -15, breath: 0.02}}[kind];
  const f0 = mhz(m), g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.9;
  lp.frequency.setValueAtTime(S.cut*0.4, t); lp.frequency.linearRampToValueAtTime(S.cut*S.open, t + S.a*1.5); lp.frequency.setTargetAtTime(S.cut, t + S.a*2, 0.1);
  const vib = AC.createOscillator(), vg = AC.createGain(); vib.frequency.value = 5.2; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(len > 0.4 ? f0*0.006 : 0, t + Math.min(len, 0.45)); vib.connect(vg);
  for (const [type, mul, a] of [['sawtooth', 1, 1], ['square', 1, 0.25], ['sawtooth', 1.003, 0.5]]){
    const o = AC.createOscillator(), og = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0*mul*Math.pow(2, S.scoop/1200), t); o.frequency.exponentialRampToValueAtTime(f0*mul, t + 0.05);
    vg.connect(o.frequency); og.gain.value = a*0.3; o.connect(og).connect(lp); o.start(t); o.stop(t + len + 0.25); }
  const br = AC.createBufferSource(); br.buffer = getNoise(); const bf = AC.createBiquadFilter(), bg = AC.createGain(); bf.type = 'bandpass'; bf.frequency.value = f0*3; bf.Q.value = 1;
  bg.gain.setValueAtTime(S.breath, t); bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); br.connect(bf).connect(bg).connect(g); br.start(t, Math.random()*2); br.stop(t + 0.1);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + S.a); g.gain.setTargetAtTime(v*0.8, t + S.a, 0.1); g.gain.setValueAtTime(v*0.8, t + Math.max(S.a, len - 0.04)); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.06);
  lp.connect(g); if (dest){ let x = g; if (pan && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = pan; x = g.connect(p); } x.connect(dest); } else bandOut(g, pan); vib.start(t); vib.stop(t + len + 0.25);
}
function glock(t, m, v){ const f = mhz(m), g = AC.createGain(); g.gain.value = v;
  for (const [mul, a, d] of [[1, 1, 1.4], [2.76, 0.35, 0.5], [5.4, 0.15, 0.2]]){ const o = AC.createOscillator(), og = AC.createGain(); o.frequency.value = f*mul; og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(og).connect(g); o.start(t); o.stop(t + d + 0.05); }
  bandOut(g, 0.3); }
function marchSnare(t, v){ const s = AC.createBufferSource(); s.buffer = getNoise(); const f = AC.createBiquadFilter(), g = AC.createGain(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.8;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11); s.connect(f).connect(g); bandOut(g, -0.15);
  const o = AC.createOscillator(), og = AC.createGain(); o.frequency.setValueAtTime(380, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.03); og.gain.setValueAtTime(v*0.6, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); o.connect(og); bandOut(og, -0.15);
  s.start(t, Math.random()*2); s.stop(t + 0.14); o.start(t); o.stop(t + 0.07); }
function marchBass(t, v){ const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.2);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g); bandOut(g); o.start(t); o.stop(t + 0.55);
  const s = AC.createBufferSource(); s.buffer = getNoise(); const f = AC.createBiquadFilter(), sg = AC.createGain(); f.type = 'lowpass'; f.frequency.value = 600; sg.gain.setValueAtTime(v*0.5, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(f).connect(sg); bandOut(sg); s.start(t, Math.random()*2); s.stop(t + 0.07); }
function cymbal(t, v, len = 1.4){ const g = AC.createGain(), hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
  for (const f of [527, 803, 842, 948, 1174, 1690]){ const o = AC.createOscillator(); o.type = 'square'; o.frequency.value = f*1.9; o.connect(hp); o.start(t); o.stop(t + len); }
  const s = AC.createBufferSource(); s.buffer = getNoise(); const sg = AC.createGain(); sg.gain.value = 0.6; s.connect(sg).connect(hp); s.start(t, Math.random()*2); s.stop(t + len);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); hp.connect(g); bandOut(g, 0.35); }
// the crowd joining in: one voice is a buzz through vowel resonances (formants); dozens at once are a stand shouting
const CROWD_VOWEL = {a: [800, 1250, 2600], e: [520, 1850, 2500], i: [310, 2200, 2900], eo: [600, 1000, 2500]};
function crowdShoutOne(t, f0, vowel, dur, v, pan, dest){
  const F = CROWD_VOWEL[vowel], o = AC.createOscillator(), g = AC.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0*(0.98 + Math.random()*0.04), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.05, dur*0.3)); g.gain.setTargetAtTime(0.0001, t + dur*0.6, dur*0.15);
  for (const [k, q, a] of [[0, 6, 1], [1, 8, 0.7], [2, 10, 0.25]]){ const f = AC.createBiquadFilter(), fg = AC.createGain(); f.type = 'bandpass'; f.frequency.value = F[k]*(0.95 + Math.random()*0.1); f.Q.value = q; fg.gain.value = a; o.connect(f).connect(fg).connect(g); }
  let n = g; if (AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = pan; n = g.connect(p); } n.connect(dest); o.start(t); o.stop(t + dur + 0.6);
}
function crowdShout(t, vowel, dur, pitch, v){ const dest = bandBusOf();
  for (let i = 0; i < 34; i++){ const male = Math.random() < 0.55; crowdShoutOne(t + (Math.random() - 0.3)*0.05, (male ? 150 : 270)*pitch*(0.9 + Math.random()*0.2), vowel, dur*(0.85 + Math.random()*0.3), v*(0.5 + Math.random()*0.7), (Math.random()*2 - 1)*0.9, dest); } }
function crowdClap(t, v){ const dest = bandBusOf();
  for (let i = 0; i < 26; i++){ const s = AC.createBufferSource(); s.buffer = getNoise(); const f = AC.createBiquadFilter(), g = AC.createGain(), tt = t + (Math.random() - 0.4)*0.025;
    f.type = 'bandpass'; f.frequency.value = 900 + Math.random()*900; f.Q.value = 1.2; g.gain.setValueAtTime(v*(0.5 + Math.random()*0.6), tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.03);
    s.connect(f).connect(g).connect(dest); s.start(Math.max(0, tt), Math.random()*2); s.stop(Math.max(0, tt) + 0.05); } }

// ---- the song: an 8-beat drum cadence once, then a 64-beat loop: tune · call & response · tune again (glock + trombones) · second tune ----
function musicBuild(){
  const intro = Array.from({length: 8}, () => []), loop = Array.from({length: 64}, () => []);
  const at = (arr, beat, fn) => { const b = Math.floor(beat + 1e-6); arr[b % arr.length].push([beat - b, fn]); };   // fn(t, secondsPerBeat)
  for (const b of [0, 0.25, 0.5, 1, 1.25, 1.5, 2, 2.25, 2.5, 2.75, 3, 4, 4.25, 4.5, 5, 5.25, 5.5, 6, 6.5, 7]) at(intro, b, t => marchSnare(t, b % 1 === 0 ? 0.32 : 0.2));
  for (const b of [0, 2, 4, 6]) at(intro, b, t => marchBass(t, 0.5)); at(intro, 7, t => cymbal(t, 0.05, 0.9));
  const TUNE = [[0, 77, 1], [1, 74, 0.5], [1.5, 77, 0.5], [2, 79, 0.5], [2.5, 77, 0.5], [3, 74, 1], [4, 75, 1], [5, 72, 0.5], [5.5, 75, 0.5], [6, 77, 1.5],
    [8, 74, 0.5], [8.5, 77, 0.5], [9, 82, 1], [10, 81, 0.5], [10.5, 79, 0.5], [11, 77, 1], [12, 79, 0.5], [12.5, 75, 0.5], [13, 72, 0.5], [13.5, 74, 0.5], [14, 70, 1.5]];
  const TUNE2 = [[0, 70, 1], [1, 74, 0.5], [1.5, 75, 0.5], [2, 77, 1], [3, 75, 1], [4, 74, 1], [5, 72, 0.5], [5.5, 74, 0.5], [6, 70, 2],
    [8, 72, 1], [9, 75, 0.5], [9.5, 77, 0.5], [10, 79, 1], [11, 77, 1], [12, 75, 0.5], [12.5, 74, 0.5], [13, 72, 0.5], [13.5, 69, 0.5], [14, 70, 1.5]];
  const CH1 = [[58, [62, 65, 70]], [58, [62, 65, 70]], [60, [63, 67, 70]], [53, [63, 65, 69]], [58, [62, 65, 70]], [51, [63, 67, 70]], [53, [63, 65, 69]], [58, [62, 65, 70]]];   // B♭ B♭ Cm F7 | B♭ E♭ F7 B♭
  const CH2 = [[51, [63, 67, 70]], [51, [63, 67, 70]], [58, [62, 65, 70]], [58, [62, 65, 70]], [60, [63, 67, 70]], [60, [63, 67, 70]], [53, [63, 65, 69]], [53, [63, 65, 69]]];   // E♭ | B♭ | Cm | F7
  const groove = (o, chords) => {
    chords.forEach(([root, tones], k) => { const b = o + k*2;
      at(loop, b, (t, sp) => { for (const n of tones) horn('tbn', t, n - 12, 2*sp*0.92, 0.035, -0.2); horn('tuba', t, root - 24, sp*0.45, 0.11); });
      at(loop, b + 1, (t, sp) => horn('tuba', t, root - 24 + (k % 2 ? 5 : 7), sp*0.45, 0.09)); at(loop, b + 1.5, (t, sp) => horn('tuba', t, root - 24 + (k % 2 ? 7 : 4), sp*0.3, 0.07)); });
    for (let b = 0; b < 16; b++){ at(loop, o + b, t => marchBass(t, b % 2 ? 0.25 : 0.45)); if (b % 2) at(loop, o + b, t => marchSnare(t, 0.3)); else at(loop, o + b + 0.5, t => marchSnare(t, 0.1)); }
    at(loop, o, t => cymbal(t, 0.06)); };
  // A: the tune on trumpets, the glock doubling its opening, "헤이!" at the end
  for (const [b, m, l] of TUNE){ at(loop, b, (t, sp) => horn('tpt', t, m, l*sp*0.88, 0.085, 0.15)); if (b < 4) at(loop, b, t => glock(t, m + 12, 0.03)); }
  groove(0, CH1); at(loop, 15, (t, sp) => crowdShout(t, 'e', 0.3, 1.25, 0.02));
  // B: call and response — the band calls, the crowd answers "삐-걱!", then claps "짝짝 짝짝짝" over a held chord
  for (const q of [16, 24]){
    for (const [b, m] of [[0, 70], [0.5, 77], [1, 82]]) at(loop, q + b, (t, sp) => { horn('tpt', t, m, sp*0.4, 0.09, 0.15); horn('tbn', t, m - 12, sp*0.4, 0.05, -0.2); });
    at(loop, q, (t, sp) => { horn('tuba', t, 46, sp*0.5, 0.12); marchBass(t, 0.5); }); at(loop, q + 1, t => { marchBass(t, 0.4); cymbal(t, 0.04, 0.6); });
    at(loop, q + 2, (t, sp) => { crowdShout(t, 'i', sp*0.6, 1.15, 0.018); marchBass(t, 0.5); }); at(loop, q + 3, (t, sp) => { crowdShout(t, 'eo', sp*0.8, 1.0, 0.018); marchBass(t, 0.5); });
    for (const b of [4, 4.5, 5.5, 6, 6.5]) at(loop, q + b, t => { crowdClap(t, 0.15); marchSnare(t, 0.26); });
    for (const b of [5, 6, 7]) at(loop, q + b, t => marchBass(t, 0.42));
    at(loop, q + 4, (t, sp) => { marchBass(t, 0.42); for (const n of [62, 65, 70]) horn('tbn', t, n - 12, 3*sp*0.95, 0.04, -0.2); horn('tuba', t, 46, sp*0.45, 0.1); });
    at(loop, q + 5.5, (t, sp) => horn('tuba', t, 53, sp*0.45, 0.09)); at(loop, q + 6.5, (t, sp) => horn('tuba', t, 46, sp*0.45, 0.09));
    for (const [b, m] of [[7, 81], [7.5, 82]]) at(loop, q + b, (t, sp) => { horn('tpt', t, m, sp*0.45, 0.09, 0.15); horn('tbn', t, m - 12, sp*0.45, 0.05, -0.2); });
    at(loop, q + 7.5, t => { glock(t, 94, 0.04); cymbal(t, 0.04, 0.7); }); }
  // A': the tune again, trombones doubling it an octave down and the glock all the way through
  for (const [b, m, l] of TUNE){ at(loop, 32 + b, (t, sp) => { horn('tpt', t, m, l*sp*0.88, 0.08, 0.15); horn('tbn', t, m - 12, l*sp*0.88, 0.035, -0.25); glock(t, m + 12, 0.022); }); }
  groove(32, CH1); at(loop, 47, (t, sp) => crowdShout(t, 'e', 0.3, 1.25, 0.02));
  // C: a second tune, sung by the trombones, trumpets punching off-beat chords, a snare fill into the top
  for (const [b, m, l] of TUNE2) at(loop, 48 + b, (t, sp) => horn('tbn', t, m - 12, l*sp*0.88, 0.07, -0.1));
  CH2.forEach(([root, tones], k) => { for (const off of [0.5, 1.5]) at(loop, 48 + k*2 + off, (t, sp) => { for (const n of tones) horn('tpt', t, n + 12, sp*0.22, 0.03, 0.25); }); });
  groove(48, CH2);
  for (const b of [15, 15.25, 15.5, 15.75]) at(loop, 48 + b, t => marchSnare(t, 0.22));
  return {intro, loop};
}
function musicSchedule(from, to){
  const spb = 60/ORG.bpm, S = ORG.song || (ORG.song = musicBuild());
  if (ORG.next < from - 0.1) ORG.next = from + 0.05;   // woke up after a pause: skip ahead, don't burst the missed beats
  while (ORG.next < to){
    const t = Math.max(ORG.next, from), events = ORG.beat < 8 ? S.intro[ORG.beat] : S.loop[(ORG.beat - 8) % 64];
    for (const [off, fn] of events) fn(t + off*spb, spb);
    ORG.next += spb; ORG.beat++;
  }
}
function musicStart(){
  if (!AC || ORG.gain) return;
  ORG.gain = AC.createGain(); ORG.gain.gain.value = ORG.level; ORG.gain.connect(OUT); ORG.bus = null; ORG.room = null;
  ORG.next = AC.currentTime + 0.2; ORG.beat = 0;
  if (!ORG.timer) ORG.timer = setInterval(() => { if (AC && ORG.gain && AC.state === 'running') musicSchedule(AC.currentTime, AC.currentTime + 0.4); }, 120);
}
function musicDuck(){                              // softer under flights, cut-scenes and big calls
  if (!AC || !ORG.gain) return;
  const d = (state === 'flight' || (slowmo && !slowmo.fired) || (ball && (ball.approach || ball.hold))) ? 0.35 : 1;
  if (d !== ORG.duck){ ORG.duck = d; ORG.gain.gain.setTargetAtTime(ORG.level*d, AC.currentTime, 0.25); }
}
