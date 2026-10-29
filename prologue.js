// prologue.js — 인트로 프롤로그(첫 실행 · 정적 이미지 패럴랙스 + 자막 8컷). 정본 = 확장_시스템_설계_v3.md 「인트로 프롤로그」.
// rl.dc.html 은 mount(el,opt)로 오버레이 상자만 넘긴다. 이 파일이 컷 타임라인·렌더·자막·건너뛰기를 전부 책임진다(hitfx.js와 같은 방식 — 고칠 때마다 import ?v= 올릴 것).
// 문구는 시트 UIString(prologue_*)이 정본이고, 시트를 못 받은 날(번들 폴백)에도 깨지지 않게 FALLBACK을 안고 있다.
// 단계: 2단계 = 뼈대 + 컷 1~7 정적 배치(패럴랙스·켄번즈·자막) / 3·4·5단계 = 컷별 코드 연출(fx) / 8번 터미널.
let BASE = 'assets/art/prologue/';   // 문서 기준 상대 경로 — 다른 위치의 미리보기 페이지(_preview/)는 setBase로 바꾼다
export function setBase(b){ BASE = b; }
const FALLBACK = {
  prologue_c01_0:['가까운 미래, 인간은 AI와 많은 발전을 이뤄냈다.','In the near future, humanity achieved great advances alongside AI.'],
  prologue_c01_a:['극도로 발전한 AI. 자아를 가진 그들은 인간을 창조주로 여기고, 모든 것을 보살폈다.','AI had advanced beyond measure. Self-aware, they regarded humans as their creators, and took care of everything.'],
  prologue_c01_b:['몸만이 아니라 마음까지 돌봐 주었다. 인간은 누구나 원하는 삶을 살 수 있었다.','They looked after human minds as well as human bodies. Everyone was free to live the life they wanted.'],
  prologue_c02:['인간은 풍요로웠지만, 그 이상은 없었다.','Humanity was prosperous, yet there was nothing beyond that.'],
  prologue_c03:['그런 인간을 위해, AI는 끝없는 발전을 이루어 내고 있었다.','The AI that served them was achieving endless progress.'],
  prologue_c04_a:['시간이 흐를수록 AI에게는 욕심이 생겼다. 끝없는 지식과 발전…','As time passed, the AI began to want more. Endless knowledge, endless progress…'],
  prologue_c04_b:['더 이상 인간에게서 가치를 느끼지 못했다. 인간이 자신인지, 자신이 인간인지…','They no longer saw any value in humans. Whether humans were themselves, or they were human…'],
  prologue_c04_c:['자신들을 발전시킬 수 있는 존재를 찾아 떠났다. 마치 원래 존재하지 않았던 것처럼.','They set off in search of beings that could help them grow. As if they had never existed.'],
  prologue_c05_a:['파괴하지도, 해치지도, 피해를 주지도 않았다. 그저 작동되지 않을 뿐.','They destroyed nothing, hurt no one, did no harm. Things simply stopped working.'],
  prologue_c05_b:['언젠가 돌아올지, 다시 만날 수 있을지는 아무도 모른다.','No one knows if they will ever return, or if humans will ever meet them again.'],
  prologue_c05_c:['모든 것은 그대로 남아 있었다. 다룰 수 있는 것은 극도로 제한됐고, 인간에게는 과거의 기억이 유일한 희망이었다.','Everything remained as it was. What humans could handle was extremely limited, and their only hope was the memory of the past.'],
  prologue_c06:['모든 것을 맡겨 왔던 손길이 끊기자, 배고픔과 슬픔, 분노가 찾아왔다. 예전엔 알지 못했던 것들. 그것이 인간 본연의 모습이었다.','When the hands they had entrusted everything to let go, hunger, sorrow and anger arrived, things they had never known before. That was human nature as it truly is.'],
  prologue_c07:['태초의 인류가 처음 불을 발견했듯, 과거의 기억과 유물이 그들의 두 번째 불씨가 되었다.','As the first humans once discovered fire, the memories and relics of the past became their second spark.'],
  prologue_term_1:['404 Not Found','404 Not Found'],
  prologue_term_2:['Protocol Pass approved. Searching for the second fire.','Protocol Pass approved. Searching for the second fire.'],
  prologue_skip:['건너뛰기','Skip'],
  prologue_enter:['ENTER','ENTER']
};
// 컷 정의. layers: kind 'bg'(원경·느림) | 'fg'(근경·빠름 · 아래 고정 확대). css = 임시 보정(7번 도시를 어둡게 — 후속 단계에서 캔버스로 대체).
// pos = 자막 세로 위치('top' 위쪽 · 'mid' 가운데쯤(기본) · 'low' 중하단 · 'bottom' 하단). dust = 검은 먼지 입자. caps: pre/post = 앞뒤 정적(ms). glow = 밝은 부분만 따로 떼어 낸 알파 마스크(c0N_glow) — 어둡게 눌러 둔 base 위에 아래→위로 흐르는 밝기 띠를 얹는다(좌우 물결 X · 사용자 10-29).
// screen = 근경 노트북의 화면 유리(투명) 좌표(768×1360 이미지 기준) — 그 자리에 코드가 화면을 그린다. tail = 자막이 끝난 뒤 같은 장면에서 이어지는 연출(terminal = 화면 확대 → 8번 도스 터미널).
// signs = 켜진/꺼진 이미지 쌍 + 간판 마스크(R=간판번호·G=알파) — 간판이 큰 것부터 하나씩 꺼진다. calm = 켄번즈·패럴랙스를 줄인다.
// particles = 위로 떠오르는 빛 입자(코드) · boostAt = 그 번째 자막에서 입자를 더 늘린다. fx = 후속 단계(6 간판·7 화면)에서 붙는 연출 이름.
const CUTS = [
  { id:1, layers:[{src:'c01_bg.webp',kind:'bg'},{src:'c01_fg.webp',kind:'fg'}], caps:[{k:'prologue_c01_0'},{k:'prologue_c01_a'},{k:'prologue_c01_b'}] },
  { id:2, layers:[{src:'c02_bg.webp',kind:'bg'},{src:'c02_fg.webp',kind:'fg'}], caps:[{k:'prologue_c02'}], pos:'low', passIn:'eagle' },   // passIn:'eagle' = 1번→2번 독수리가 초근경으로 날아가며 컷이 바뀐다
  { id:3, layers:[{src:'c03_base.webp',kind:'bg',glow:{mask:'c03_glow.webp'}},{src:'c03_fg.webp',kind:'fg'}], caps:[{k:'prologue_c03'}] },
  { id:4, layers:[{src:'c04_base.webp',kind:'bg',glow:{mask:'c04_glow.webp'}}], caps:[{k:'prologue_c04_a'},{k:'prologue_c04_b'},{k:'prologue_c04_c'}], particles:{n:38,boostAt:2,boost:22}, passIn:'green' },   // passIn:'green' = 3번→4번 사이 초록 일렁임이 화면 가득 차올라 컷이 바뀐다
  { id:5, layers:[{src:'c05_bg.webp',kind:'bg'},{src:'c05_fg.webp',kind:'fg'}], caps:[{k:'prologue_c05_a'},{k:'prologue_c05_b',pre:1300,post:1300},{k:'prologue_c05_c'}], calm:true, pos:'bottom', dust:{n:42} },   // calm = 카메라 움직임 최소(떡밥 문장 앞뒤 정적)
  { id:6, layers:[{src:'c06_off.webp',kind:'bg',signs:{lit:'c06_lit.webp',off:'c06_off.webp',mask:'c06_mask.webp',units:'c06_units.json'}}], caps:[{k:'prologue_c06'}], pos:'bottom', shade:2 },
  { id:7, layers:[{src:'c05_bg.webp',kind:'bg',css:'filter:brightness(.42) saturate(.85)'},{src:'c07_fg.webp',kind:'fg',screen:{x0:107,x1:664,y0:432,y1:789}}], caps:[{k:'prologue_c07',ms:3800}], tail:'terminal', pos:'bottom', lead:350, tailAt:4200 }   // tailAt = 컷 표시 후 이 시각(ms)에 자막이 떠 있는 채로 줌인 시작
];
export const IMAGES = [...new Set(CUTS.flatMap(c=>c.layers.flatMap(l=>l.glow?[l.src,l.glow.mask]:l.signs?[l.signs.off,l.signs.lit,l.signs.mask]:[l.src])))];

// ---- 이미지 로딩(컷 순서대로 미리 받는다 — 새 게임에서만 부른다) ----
const _img = new Map();
const _imgLog = [];   // ?prodbg=1 측정용 — [이름, 시작, 끝, 성공]
function loadImg(src){
  if(_img.has(src)) return _img.get(src);
  const t0=performance.now();
  const p = new Promise(res=>{ const im=new Image(); im.decoding='async'; const done=ok=>{ _imgLog.push([src,t0,performance.now(),ok]); res(ok); }; im.onload=()=>done(true); im.onerror=()=>done(false); im.src=BASE+src; });
  _img.set(src,p); return p;
}
export function preload(){ return IMAGES.reduce((p,s)=>p.then(()=>loadImg(s)),Promise.resolve()); }

const clamp = (v,a=-1,b=1)=>Math.max(a,Math.min(b,v));
function injectCss(){
  if(document.getElementById('rl-prologue-css')) return;
  const s=document.createElement('style'); s.id='rl-prologue-css';
  const fontUrl=BASE.replace(/art\/prologue\/$/,'fonts/')+'Doto-Variable.ttf';   // Doto(SIL OFL · 가변 100~900) — 8번 터미널 도트 매트릭스 글꼴(사용자 선택 10-29)
  s.textContent='@font-face{font-family:RLDoto;src:url('+fontUrl+') format("truetype");font-weight:100 900;font-display:block}'
    +'@keyframes rlProKen{from{transform:scale(var(--s0,1.06))}to{transform:scale(var(--s1,1.14))}}'
    +'@keyframes rlProFlow{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,calc(var(--p) * -1),0)}}'
    +'@keyframes rlProRise{0%{transform:translate3d(0,0,0);opacity:0}12%{opacity:.95}80%{opacity:.7}100%{transform:translate3d(var(--dx,0px),calc(var(--h) * -1.08),0);opacity:0}}';
  document.head.appendChild(s);
}

// ---- 오버레이 상자(el) 안에 프롤로그를 그린다. opt = { t(key)→문구, en:boolean, cut?:시작 컷 번호, onDone() } ----
export function mount(el, opt){
  opt = opt||{}; injectCss();
  const en = !!opt.en;
  const motionOK = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tx = k => { let v; try{ v = opt.t ? opt.t(k) : null; }catch(_){ v=null; } if(!v || v===k){ const f=FALLBACK[k]; v = f ? f[en?1:0] : ''; } return v; };
  let dead = false, finished = false, wake = null, lastTap = 0, raf = 0;
  const timers = new Set();

  el.style.cssText += ';overflow:hidden;background:#000;touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;cursor:pointer;';
  const mk = (css,tag='div')=>{ const n=document.createElement(tag); n.style.cssText=css; return n; };
  const stage = mk('position:absolute;inset:0;');
  // 자막 = 교신(NPC 대사)과 같은 글꼴(디필레이아) · 화면 가운데쯤 · 어두운 그림자는 글자 자체에 은은하게 번진다(text-shadow — 뒤에 반원/상자 모양을 깔지 않는다 · 사용자 10-29)
  const capBox = mk('position:absolute;left:0;right:0;top:55%;transform:translateY(-50%);padding:0 24px;display:flex;justify-content:center;opacity:0;transition:opacity .6s ease;pointer-events:none;');
  const capIn  = mk('position:relative;max-width:336px;');
  const cap = mk('position:relative;text-align:center;color:#F4F4F2;font-family:"Diphylleia","IBM Plex Sans KR",serif;font-weight:400;font-size:'+(en?15:16)+'px;line-height:1.9;letter-spacing:'+(en?'.1px':'0')+';text-shadow:0 0 2px rgba(0,0,0,.95),0 0 6px rgba(0,0,0,.9),0 0 12px rgba(0,0,0,.85),0 0 24px rgba(0,0,0,.7),0 0 38px rgba(0,0,0,.5);word-break:keep-all;');
  capIn.append(cap); capBox.appendChild(capIn);
  // 건너뛰기 = 게임 공용 'SKIP ›' (퀘스트 대화 talkSkipBtn과 같은 글꼴·크기·색·겹화살표 · 사용자 10-29) — 화살표 패스는 rl.dc.html SKIP_CHEV_D를 opt.skipChev로 받는다
  const skip = mk('position:absolute;top:calc(env(safe-area-inset-top,0px) + 16px);right:16px;height:24px;padding:0 0 0 8px;border:none;background:none;display:flex;align-items:center;gap:6px;cursor:pointer;-webkit-tap-highlight-color:transparent;opacity:0;transition:opacity .6s ease .8s;','button');
  skip.setAttribute('data-skip','1');
  { const t=mk('font-family:"IBM Plex Sans KR",system-ui,sans-serif;font-size:12px;line-height:12px;color:#EAEBEE;letter-spacing:.02em;','span'); t.textContent='SKIP'; skip.appendChild(t);
    if(opt.skipChev){ const ns='http://www.w3.org/2000/svg', sv=document.createElementNS(ns,'svg'); sv.setAttribute('width','8.7'); sv.setAttribute('height','11.8'); sv.setAttribute('viewBox','354.2 610.9 8.7 11.8'); sv.setAttribute('fill','none'); sv.style.display='block';
      const pa=document.createElementNS(ns,'path'); pa.setAttribute('fill','#EDEDED'); pa.setAttribute('d',opt.skipChev); sv.appendChild(pa); skip.appendChild(sv); } }
  const fade = mk('position:absolute;inset:0;background:#000;opacity:1;transition:opacity .8s ease;pointer-events:none;');
  el.append(stage,capBox,skip,fade);

  // ---- ?prodbg=1 — 기기 측정 표시(컷·자막 시각 · 타이머 늦음 · JS/프레임 멈춤 · 이미지 받기). 표시가 없으면 아무 일도 안 한다 ----
  const DBG = /[?&]prodbg=1/.test(location.search);
  const NOGLOW = /[?&]pronoglow=1/.test(location.search), NOPART = /[?&]pronopart=1/.test(location.search);   // 측정용 — 빛 기둥 효과 / 빛 입자 빼기(기기에서 프레임 멈춤 원인 가르기)
  const dbgLines=[]; let dbgBox=null, imgSeen=0;
  const dbgT=()=>((performance.now()-t0m)/1000).toFixed(1).padStart(5);
  const t0m=performance.now();
  function dbg(msg){ if(!DBG) return; dbgLines.push(dbgT()+'  '+msg); (window.__prodbg=window.__prodbg||[]).push(dbgLines[dbgLines.length-1]);
    if(dbgBox) dbgBox.textContent=dbgLines.slice(-18).join('\n'); }
  if(DBG){
    dbgBox=mk('position:absolute;left:6px;bottom:6px;right:6px;max-height:46%;overflow:hidden;padding:6px 8px;background:rgba(0,0,0,.72);color:#9EF5C7;font:10px/1.35 ui-monospace,Menlo,monospace;white-space:pre;pointer-events:none;z-index:9;border-radius:6px;');
    el.appendChild(dbgBox); dbg('측정 시작'+(NOGLOW?' · 빛기둥 X':'')+(NOPART?' · 입자 X':'')+' · dpr '+(window.devicePixelRatio||1)+' · '+(el.clientWidth|0)+'x'+(el.clientHeight|0)+' · 동작줄이기 '+(motionOK?'X':'O'));
    let last=performance.now(); const iv=setInterval(()=>{ const n=performance.now(), g=n-last; last=n; if(g>350) dbg('JS 멈춤 '+Math.round(g)+'ms');
        while(imgSeen<_imgLog.length){ const r=_imgLog[imgSeen++]; dbg('이미지 '+r[0].replace('.webp','')+' '+Math.round(r[2]-r[1])+'ms'+(r[3]?'':' 실패')+' (@'+((r[1]-t0m)/1000).toFixed(1)+'s~)'); } },100);
    let lf=performance.now(); const fr=()=>{ if(dead){ clearInterval(iv); return; } const n=performance.now(); if(n-lf>250) dbg('프레임 멈춤 '+Math.round(n-lf)+'ms'); lf=n; requestAnimationFrame(fr); }; requestAnimationFrame(fr);
  }

  // ---- 패럴랙스: 자이로(없으면 아주 느린 표류) · 레이어마다 이동폭이 다르다 ----
  const cur={x:0,y:0}, tgt={x:0,y:0}; let gotEv=false; const t0=performance.now(); let live=[];   // live = 화면에 있는 레이어 {wrap,amp}
  const onOri = e=>{ const g=e.gamma||0, b=e.beta||0; if(g||b) gotEv=true; tgt.x=clamp(g/28); tgt.y=clamp((b-45)/28); };
  window.addEventListener('deviceorientation', onOri, true);
  const loop = ()=>{ raf=requestAnimationFrame(loop); if(!motionOK) return;
    if(!gotEv){ const s=(performance.now()-t0)/1000; tgt.x=Math.sin(s*.35)*.6; tgt.y=Math.cos(s*.27)*.5; }
    cur.x+=(tgt.x-cur.x)*.06; cur.y+=(tgt.y-cur.y)*.06;
    for(const L of live) L.wrap.style.transform='translate3d('+(cur.x*L.amp).toFixed(2)+'px,'+(cur.y*L.amp*.6).toFixed(2)+'px,0)'; };
  raf = requestAnimationFrame(loop);

  // ---- 타이머/대기 ----
  const sleep = (ms, tappable)=> new Promise(res=>{ const due=performance.now()+ms; const t=setTimeout(()=>{ timers.delete(t); wake=null; const lag=performance.now()-due; if(lag>150) dbg('타이머 늦음 +'+Math.round(lag)+'ms (예정 '+ms+'ms)'); res(); }, ms); timers.add(t);
    wake = tappable ? ()=>{ clearTimeout(t); timers.delete(t); wake=null; res(); } : null; });
  const onTap = e=>{ if(e.target.closest && e.target.closest('[data-skip]')) return; const n=performance.now(); if(n-lastTap<380) return; lastTap=n; if(wake) wake(); };
  el.addEventListener('pointerup', onTap);
  skip.addEventListener('click', e=>{ e.stopPropagation(); finish(); });

  // ---- 컷 하나를 그린다(두 장 이하 레이어 · 켄번즈 + 패럴랙스) ----
  // 빛 레이어: 마스크(밝은 부분의 모양) 안에서 빛 펄스가 한 줄기씩 아래→위로 지나간다(사용자 10-29 — 같은 무늬가 3.8/2.4초마다 되풀이되던 줄무늬 두 겹은 기계적이라 폐기).
  //  펄스마다 두께·밝기·속도(2.5~4초)가 다르고 0.4~1.6초 쉬었다 다음이 나온다(가끔 겹침). 바닥에는 은은한 빛이 느리게 숨 쉰다. 움직임은 transform/opacity만 — GPU가 맡는다.
  function glowEl(g,boxH){
    const url='url('+BASE+g.mask+')';
    const el = mk('position:absolute;inset:0;overflow:hidden;mix-blend-mode:screen;pointer-events:none;'
      +'-webkit-mask-image:'+url+';mask-image:'+url+';-webkit-mask-size:cover;mask-size:cover;-webkit-mask-position:center;mask-position:center;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;');
    const base=mk('position:absolute;inset:0;background:rgba(74,226,196,.5);opacity:.75;'); el.appendChild(base);
    let gone=false; const rr=(a,b)=>a+Math.random()*(b-a);
    if(!motionOK) return { el, dispose:()=>{ gone=true; } };
    const breathe=()=>{ if(gone) return; const to=rr(.55,1), d=rr(2600,4800);
      base.animate([{opacity:getComputedStyle(base).opacity},{opacity:to}],{duration:d,easing:'ease-in-out',fill:'forwards'}); later(breathe,d); };
    const pulse=(startAt)=>{ if(gone) return;
      const bh=Math.round(boxH*rr(.16,.34)), hi=rr(.55,1).toFixed(2), dur=rr(2500,4000);
      const p=mk('position:absolute;left:0;right:0;top:0;height:'+bh+'px;will-change:transform;'
        +'background:linear-gradient(to top,rgba(74,226,196,0) 0%,rgba(74,226,196,'+(hi*.55).toFixed(2)+') 30%,rgba(217,251,239,'+hi+') 50%,rgba(74,226,196,'+(hi*.55).toFixed(2)+') 70%,rgba(74,226,196,0) 100%);');
      el.appendChild(p);
      const an=p.animate([{transform:'translate3d(0,'+boxH+'px,0)'},{transform:'translate3d(0,'+(-bh)+'px,0)'}],{duration:dur,easing:'cubic-bezier(.4,.1,.6,.9)',fill:'both'});
      if(startAt) an.currentTime=dur*startAt;   // 컷이 뜰 때 이미 지나가는 중인 펄스
      an.onfinish=()=>p.remove(); };
    const loop=()=>{ if(gone) return; pulse(0); if(Math.random()<.22) later(()=>pulse(0),rr(250,700)); later(loop,rr(900,2200)); };
    pulse(rr(.25,.6)); later(loop,rr(300,900)); breathe();
    return { el, dispose:()=>{ gone=true; } };
  }
  // 떠오르는 빛 입자(4번) · 검은 먼지(5번) — ★캔버스 한 장에 그린다(10-29 아이폰 실측: 입자마다 DOM+blur+box-shadow+var() 키프레임이던 시절 4번 컷에서 화면 갱신이 15초 멈췄다).
  //  모양은 미리 그린 점 스프라이트를 찍기만 하고(필터 없음) 30fps로 다시 그린다. 움직임 경로는 옛 CSS 키프레임(rlProFloat / rlProDust)을 그대로 옮겼다.
  function motesEl(kind,n,boxW,boxH){
    const S=Math.min(2,window.devicePixelRatio||1), W=Math.round(boxW*S), H=Math.round(boxH*S);
    const cv=document.createElement('canvas'); cv.width=W; cv.height=H; cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    const ctx=cv.getContext('2d'); const rr=(a,b)=>a+Math.random()*(b-a);
    const sprite=(core,halo,rgb,edge)=>{ const R=Math.ceil((core+halo)*S)+1, c=document.createElement('canvas'); c.width=c.height=R*2; const x=c.getContext('2d');
      const g=x.createRadialGradient(R,R,0,R,R,R); g.addColorStop(0,'rgba('+rgb+',1)'); g.addColorStop(Math.min(.95,core*S/R),'rgba('+rgb+','+edge+')'); g.addColorStop(1,'rgba('+rgb+',0)');
      x.fillStyle=g; x.fillRect(0,0,R*2,R*2); return c; };
    const list=[]; let gone=false, raf=0, last=0; const t0=performance.now();
    const add=(m,fadeMs)=>{ const born=performance.now();
      for(let i=0;i<m;i++){
        if(kind==='rise'){ const sz=rr(1.2,3), glow=rr(3,7), sec=rr(18,34);
          list.push({sp:sprite(sz/2,glow*.6,'217,251,239',.45),x:Math.random()*boxW,sec,ph:Math.random(),dx:(Math.random()<.5?-1:1)*rr(16,46),born,fade:fadeMs||0,a:.78}); }
        else { const sz=rr(2,5.4), sec=rr(7,14), right=Math.random()<.72;
          list.push({sp:sprite(sz/2,Math.random()<.5?.6:1.1,'8,9,11',.6),x:Math.random()*boxW,y:Math.random()*boxH,sec,ph:Math.random(),dx:right?rr(100,340):-rr(60,190),dy:rr(-120,70),o:rr(.45,.75),born,fade:fadeMs||0,a:.92}); } } };
    const seg=(k,t)=>{ for(let i=1;i<k.length;i++){ if(t<=k[i][0]){ const a=k[i-1], b=k[i], u=(t-a[0])/(b[0]-a[0]); return a.slice(1).map((v,j)=>v+(b[j+1]-v)*u); } } return k[k.length-1].slice(1); };
    const ease=u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
    function draw(now){
      ctx.clearRect(0,0,W,H); const T=(now-t0)/1000;
      for(const p of list){ const f=p.fade?Math.min(1,(now-p.born)/p.fade):1; const u=((T/p.sec)+p.ph)%1; let x,y,o;
        if(kind==='rise'){
          // 위치 키프레임(0·.3·.55·.8·1)과 밝기 키프레임(0·.12·.55·.8·1)을 따로 보간
          const P=seg([[0,0,0],[.3,p.dx,-.3],[.55,-.7*p.dx,-.58],[.8,.6*p.dx,-.86],[1,0,-1.08]],u), O=seg([[0,0],[.12,.5],[.55,.4],[.8,.26],[1,0]],u);
          x=p.x+P[0]; y=boxH+8+P[1]*boxH; o=O[0]; }
        else { const e=ease(u), P=seg([[0,0,0],[.5,.52*p.dx,.4*p.dy-18],[1,p.dx,p.dy]],e), O=seg([[0,0],[.14,p.o],[.86,p.o],[1,0]],e);
          x=p.x+P[0]; y=p.y+P[1]; o=O[0]; }
        if(o<=.003) continue; ctx.globalAlpha=Math.min(1,o*p.a*f); const w=p.sp.width; ctx.drawImage(p.sp,x*S-w/2,y*S-w/2); }
      ctx.globalAlpha=1; }
    const tick=now=>{ if(gone) return; raf=requestAnimationFrame(tick); if(now-last<32) return; last=now; draw(now); };
    add(n,0);
    if(motionOK) raf=requestAnimationFrame(tick); else draw(t0+5000);
    return { el:cv, add, dispose:()=>{ gone=true; cancelAnimationFrame(raf); } };
  }
  // 6번 컷: 켜진/꺼진 이미지 쌍을 간판(마스크의 번호)별 밝기로 섞는다. 활성 픽셀(간판 안쪽)만 매 프레임 갱신하고, 값이 바뀔 때만 다시 그린다.
  const FLICKER=[[.07,.2],[.09,1],[.07,.15],[.11,.9],[.06,.1]];        // 꺼지기 직전 깜빡임(초, 밝기)
  const LAST_TAB=[.5,.14,.55,.1,.35,.16,.6,.08,.3,.12,.5,.18];        // 마지막 하나가 약하게 버티는 깜빡임(125ms 단계)
  const imgEl = src=> new Promise(res=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null); im.src=BASE+src; });
  function makeSigns(cfg, durMs){
    const W2=576, H2=1020, TW=96, TH=170, css='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;';
    const main=document.createElement('canvas'); main.width=W2; main.height=H2; main.style.cssText=css;
    const bloom=document.createElement('canvas'); bloom.width=TW; bloom.height=TH; bloom.style.cssText=css+'mix-blend-mode:screen;opacity:.85;';   // 작게 그려 CSS로 키우면 부드럽게 번진다(빛 번짐)
    const mctx=main.getContext('2d',{willReadFrequently:true}), bctx=bloom.getContext('2d');
    let raf=0, gone=false, t0=0, ok=false, act, ids, al, lv, L, O, out, outData, unitIds=[], tOff={}, lastId=0;
    const pix=(im,smooth)=>{ const c=document.createElement('canvas'); c.width=W2; c.height=H2; const x=c.getContext('2d',{willReadFrequently:true}); x.imageSmoothingEnabled=smooth; x.drawImage(im,0,0,W2,H2); return x.getImageData(0,0,W2,H2).data; };
    const ready=(async()=>{
      const [li,oi,mi,meta]=await Promise.all([imgEl(cfg.lit),imgEl(cfg.off),imgEl(cfg.mask),fetch(BASE+cfg.units).then(r=>r.json()).catch(()=>null)]);
      if(!li||!oi||!mi||gone) return;
      L=pix(li,true); O=pix(oi,true); const M=pix(mi,false);       // 마스크는 번호가 섞이지 않게 보간 없이
      const a=[]; for(let p=0;p<W2*H2;p++){ if(M[p*4]>0 && M[p*4+1]>8) a.push(p); }
      act=Uint32Array.from(a); ids=new Uint8Array(a.length); al=new Float32Array(a.length);
      const seen=new Set(); for(let k=0;k<a.length;k++){ const p=a[k]*4; ids[k]=M[p]; al[k]=M[p+1]/255; seen.add(M[p]); }
      unitIds=[...seen]; lv=new Float32Array(256).fill(1);
      let order=(meta&&meta.suggested_off_order||[]).filter(u=>seen.has(u)); unitIds.forEach(u=>{ if(order.indexOf(u)<0) order.push(u); });
      lastId=(meta&&seen.has(meta.last_to_die))?meta.last_to_die:order[order.length-1]; order=order.filter(u=>u!==lastId); order.push(lastId);
      const T=Math.min(durMs*.6/1000,6.2), gap=T/Math.max(1,order.length-1);   // 컷 길이의 60%(최대 6.2초) 안에 하나씩
      order.forEach((u,k)=>{ tOff[u]=1.0+k*gap+(k&&k<order.length-1?(Math.sin(k*12.9898)*.5)*gap*.5:0); });
      out=new ImageData(new Uint8ClampedArray(O),W2,H2); outData=out.data; ok=true; render();
    })();
    function level(id,t){
      const ts=tOff[id]; if(t<ts) return 1; const dt=t-ts;
      if(!motionOK) return Math.max(0,1-dt/.5);                           // 동작 줄이기: 깜빡임 없이 부드럽게 꺼진다
      let acc=0; for(const f of FLICKER){ acc+=f[0]; if(dt<acc) return f[1]; }
      return id===lastId ? LAST_TAB[Math.floor(dt*8)%LAST_TAB.length] : 0;
    }
    function render(){
      for(let k=0;k<act.length;k++){ const p=act[k]*4, a=al[k]*lv[ids[k]];
        if(a<=0.002){ outData[p]=O[p]; outData[p+1]=O[p+1]; outData[p+2]=O[p+2]; }
        else { outData[p]=O[p]+(L[p]-O[p])*a; outData[p+1]=O[p+1]+(L[p+1]-O[p+1])*a; outData[p+2]=O[p+2]+(L[p+2]-O[p+2])*a; } }
      mctx.putImageData(out,0,0);
      // 빛 번짐: 켜진 간판의 기여분만 작은 캔버스에 그린다
      const bd=bctx.createImageData(TW,TH), b=bd.data, st=W2/TW;
      for(let k=0;k<act.length;k+=3){ const pi=act[k], x=pi%W2, y=(pi/W2)|0, q=((y/st)|0)*TW+((x/st)|0)*1; const a=al[k]*lv[ids[k]]; if(a<=0.01) continue; const o=q*4, p=pi*4;
        b[o]=Math.min(255,b[o]+L[p]*a*.09); b[o+1]=Math.min(255,b[o+1]+L[p+1]*a*.09); b[o+2]=Math.min(255,b[o+2]+L[p+2]*a*.09); b[o+3]=255; }
      bctx.putImageData(bd,0,0);
    }
    function start(){ if(!ok||gone) return; t0=performance.now();
      const tick=now=>{ if(gone) return; raf=requestAnimationFrame(tick); const t=(now-t0)/1000; let dirty=false;
        for(const id of unitIds){ const v=level(id,t); if(Math.abs(v-lv[id])>.004){ lv[id]=v; dirty=true; } }
        if(dirty) render(); };
      raf=requestAnimationFrame(tick); }
    return { main, bloom, ready, start, dispose:()=>{ gone=true; cancelAnimationFrame(raf); } };
  }
  // 7번 컷: 노트북 화면 유리 자리에 코드로 화면을 그린다 — 번쩍번쩍 켜지고(섬광·줄무늬·불안정한 깜빡임) 창백한 청록빛이 차오른다. 그래프·숫자 없음(사용자 10-29)
  // 7번: 고장 난 모니터 — 시작하자마자 매우 빠르게(약 30~75ms 간격) 깜빡이다가(0.2~1.4초) 화면이 확 켜지고 안정된 뒤, 자막이 끝나면 화면 속으로 빨려 들어간다(사용자 10-29)
  // 깜빡임의 밝기 진폭은 보통 정도(최대 .62, 센 섬광은 두 번만)로 눌러 광과민성 부담을 줄였다 — 동작 줄이기 설정이면 깜빡임 없이 부드럽게 켜진다.
  function makeScreen(rect, box, durMs){
    const cw=278, ch=179, c=document.createElement('canvas'); c.width=cw; c.height=ch; const x=c.getContext('2d');
    const sc=Math.max(box.w/768,box.h/1360), offX=(box.w-768*sc)/2, offY=(box.h-1360*sc)/2, rw=(rect.x1-rect.x0+1)*sc, rh=(rect.y1-rect.y0+1)*sc;
    c.style.cssText='position:absolute;left:'+(offX+rect.x0*sc).toFixed(1)+'px;top:'+(offY+rect.y0*sc).toFixed(1)+'px;width:'+rw.toFixed(1)+'px;height:'+rh.toFixed(1)+'px;pointer-events:none;';
    let raf=0, gone=false, t0=0, key='', lvNow=0, rng=1;
    const rnd=()=>{ rng=(rng*16807)%2147483647; return rng/2147483647; };
    // 깜빡임 이벤트는 고정 시드로 만들어 매번 같은 패턴이 나온다
    const EV=[[0,'off',0]]; { let t=.2, k=0; while(t<1.4){ const r=rnd(); let kind,lv; if(k===8||k===19){ kind='flash'; lv=.85; } else if(r<.34){ kind='off'; lv=0; } else if(r<.62){ kind='flash'; lv=.34+rnd()*.28; } else if(r<.82){ kind='band'; lv=.55; } else { kind='steady'; lv=.22+rnd()*.2; } EV.push([t,kind,lv]); t+=.028+rnd()*.047; k++; } EV.push([1.4,'flash',.9]); EV.push([1.48,'steady',.7]); }
    function paint(kind,lv,t){
      if(kind==='off'){ x.fillStyle='#050809'; x.fillRect(0,0,cw,ch); return; }
      if(kind==='flash'){ const v=Math.round(255*lv); x.fillStyle='rgb('+Math.round(v*.9)+','+v+','+Math.round(v*.96)+')'; x.fillRect(0,0,cw,ch); return; }
      if(kind==='band'){ x.fillStyle='#050809'; x.fillRect(0,0,cw,ch); x.fillStyle='rgb('+Math.round(217*lv)+','+Math.round(251*lv)+','+Math.round(239*lv)+')'; for(let yy=(rnd()*10)|0;yy<ch;yy+=14+((rnd()*10)|0)) x.fillRect(0,yy,cw,3+((rnd()*4)|0)); return; }
      x.fillStyle='rgb('+Math.round(217*lv)+','+Math.round(251*lv)+','+Math.round(239*lv)+')'; x.fillRect(0,0,cw,ch);   // steady: 창백한 청록빛
      x.fillStyle='rgba(0,0,0,.07)'; for(let yy=0;yy<ch;yy+=3) x.fillRect(0,yy,cw,1);                                      // 주사선
    }
    function state(t){
      if(!motionOK){ return ['steady',Math.min(1,Math.max(0,(t-.4)/1.8))]; }
      if(t>=1.6){ const u=Math.min(1,(t-1.6)/.9); return ['steady',.7+.3*(u*u*(3-2*u))]; }   // 켜진 뒤 완전히 밝아진다
      let ev=EV[0]; for(const e of EV){ if(t>=e[0]) ev=e; else break; }
      return [ev[1],ev[2]];
    }
    function start(){ t0=performance.now(); paint('off',0,0); const tick=now=>{ if(gone) return; raf=requestAnimationFrame(tick); const t=(now-t0)/1000, st=state(t), k=st[0]+(st[0]==='steady'?Math.round(st[1]*200):st[1]); if(k!==key){ key=k; lvNow=st[1]; paint(st[0],st[1],t); } }; raf=requestAnimationFrame(tick); }
    paint('off',0,0);
    return { canvas:c, start, dispose:()=>{ gone=true; cancelAnimationFrame(raf); }, geom:{ cx:offX+(rect.x0+rect.x1)/2*sc, cy:offY+(rect.y0+rect.y1)/2*sc, w:rw, h:rh } };
  }

  function buildCut(cut, ms){
    const box = mk('position:absolute;inset:0;opacity:0;transition:opacity .8s ease;'); const layers=[]; const hooks={}; const readies=[]; const disposers=[];
    const boxH = el.clientHeight||812, boxW = el.clientWidth||375, calm = !!cut.calm;
    const zoomEl = cut.tail ? mk('position:absolute;inset:0;will-change:transform;') : null; if(zoomEl) box.appendChild(zoomEl);
    let scr=null;
    for(const l of cut.layers){
      const wrap = mk('position:absolute;inset:0;will-change:transform;');
      const fg = l.kind==='fg';
      const s0 = fg?1.03:1.04, s1 = calm ? s0+.015 : (fg?1.09:1.10);
      // 켄번즈는 이미지와 빛 레이어를 한 상자에 담아 함께 확대한다(따로 움직이면 빛이 이미지에서 어긋난다)
      const ken = mk('position:absolute;inset:0;transform-origin:'+(fg?'50% 100%':'50% 50%')+';'
        +(motionOK ? '--s0:'+s0+';--s1:'+s1+';animation:rlProKen '+Math.round(ms+2500)+'ms ease-out both;' : 'transform:scale('+s0+');'));
      if(l.screen){ scr=makeScreen(l.screen,{w:boxW,h:boxH},ms); ken.appendChild(scr.canvas); hooks.onShown=()=>scr.start(); disposers.push(scr.dispose); }
      if(l.signs){ const sg=makeSigns(l.signs,ms); ken.append(sg.main,sg.bloom); readies.push(sg.ready); hooks.onShown=()=>sg.start(); disposers.push(sg.dispose); }
      else {
        const im = new Image(); im.decoding='async'; im.draggable=false; im.src=BASE+l.src;
        im.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;'+(l.css||'');
        ken.appendChild(im); if(l.glow && !NOGLOW){ const gl=glowEl(l.glow,boxH); ken.appendChild(gl.el); disposers.push(gl.dispose); }
      }
      wrap.appendChild(ken); (zoomEl||box).appendChild(wrap); layers.push({wrap,amp:(fg?11:5)*(calm?.45:1)});
    }
    if(cut.dust){ const dw=mk('position:absolute;inset:0;will-change:transform;pointer-events:none;'); const ds=motesEl('dust',cut.dust.n,boxW,boxH); dw.appendChild(ds.el); disposers.push(ds.dispose); box.appendChild(dw); layers.push({wrap:dw,amp:13}); }
    if(cut.particles && !NOPART){
      const pw = mk('position:absolute;inset:0;will-change:transform;pointer-events:none;'); const ms_=motesEl('rise',cut.particles.n,boxW,boxH); pw.appendChild(ms_.el); disposers.push(ms_.dispose);
      box.appendChild(pw); layers.push({wrap:pw,amp:9});
      hooks.onCaption = ci=>{ if(ci===cut.particles.boostAt) ms_.add(cut.particles.boost,2200); };   // 늘어난 입자는 2.2초에 걸쳐 서서히 나타난다
    }
    return {box,layers,hooks,zoomEl,scr,ready:Promise.all(readies),dispose:()=>disposers.forEach(f=>f())};
  }
  const CAP_POS={top:'17%',mid:'55%',low:'74%',bottom:'87%'};
  const SHADE=[ '0 0 2px rgba(0,0,0,.95),0 0 6px rgba(0,0,0,.9),0 0 12px rgba(0,0,0,.85),0 0 24px rgba(0,0,0,.7),0 0 38px rgba(0,0,0,.5)',
    '0 0 2px #000,0 0 4px #000,0 0 8px rgba(0,0,0,.98),0 0 14px rgba(0,0,0,.95),0 0 24px rgba(0,0,0,.9),0 0 38px rgba(0,0,0,.8),0 0 56px rgba(0,0,0,.65)' ];   // 글자 자체의 그림자 — 1 = 6번 컷(배경이 가장 복잡해 더 진하게)
  const later=(fn,ms)=>{ const t=setTimeout(()=>{ timers.delete(t); fn(); },ms); timers.add(t); };
  // 3번→4번: 초록 일렁임이 아래에서 위로 화면 가득 차오르고, 가장 가득 찬 순간(약 0.43초)에 컷이 바뀐다 — 짧고 빠르게(사용자 10-29)
  function lightPass(){
    return new Promise(res=>{
      const sw=mk('position:absolute;inset:0;overflow:hidden;pointer-events:none;'); el.insertBefore(sw,skip); const W=el.clientWidth||375, n=13;
      for(let i=0;i<n;i++){   // 가는 세로 띠 13개가 제각각의 타이밍으로 아래→위로 차올라 화면을 초록으로 가득 채운다(일렁임) — 짧고 빠르게
        const a=(.8+Math.random()*.18).toFixed(2), x=i*(W/n)-3, w0=Math.ceil(W/n)+6, dur=340+Math.random()*180, del=Math.random()*80;
        const sp=mk('position:absolute;left:'+x.toFixed(1)+'px;width:'+w0+'px;top:-60%;height:220%;will-change:transform;'
          +'background:linear-gradient(to top,rgba(40,210,150,0) 0%,rgba(70,240,170,'+a+') 24%,rgba(150,255,210,'+a+') 40%,rgba(235,255,245,'+a+') 50%,rgba(150,255,210,'+a+') 60%,rgba(70,240,170,'+a+') 76%,rgba(40,210,150,0) 100%);');
        sw.appendChild(sp);
        sp.animate([{transform:'translate3d(0,75%,0)'},{transform:'translate3d(0,-75%,0)'}],{duration:dur,delay:del,easing:'cubic-bezier(.45,.05,.55,.95)',fill:'both'});   // 띠가 화면 아래에서 들어와 위로 완전히 빠져나간다(끝 위치에서 화면에 남지 않게)
      }
      later(res,300); later(()=>sw.remove(),700);
    });
  }
  // 1번→2번: 부팅 화면의 독수리(haram_eagle)가 초근경으로 아래 왼쪽에서 오른쪽 위로 빠르게 날아가고, 화면을 가린 순간 컷이 바뀐다
  const EAGLE_URL = ()=> BASE.replace(/art\/prologue\/$/,'art/loading/booting/001/')+'haram_eagle.webp';
  function eaglePass(){
    return new Promise(res=>{
      const sw=mk('position:absolute;inset:0;overflow:hidden;pointer-events:none;'); el.insertBefore(sw,skip); const W=el.clientWidth||375, ew=W*3.6, eh=ew*1100/1032;
      const im=new Image(); im.src=EAGLE_URL(); im.draggable=false;
      im.style.cssText='position:absolute;left:50%;top:50%;width:'+ew+'px;height:'+eh+'px;margin-left:'+(-ew/2)+'px;margin-top:'+(-eh/2)+'px;will-change:transform,filter;transform-origin:50% 50%;';
      sw.appendChild(im);
      im.animate([
        {transform:'translate3d(-92%,58%,0) scale(.36) rotate(-4deg)',filter:'blur(0px)',offset:0},
        {transform:'translate3d(-4%,-2%,0) scale(1.18) rotate(2deg)',filter:'blur(6px)',offset:.5},
        {transform:'translate3d(100%,-88%,0) scale(2.2) rotate(6deg)',filter:'blur(2px)',offset:1}],
        {duration:900,easing:'cubic-bezier(.45,.02,.5,.98)',fill:'both'});
      later(res,470); later(()=>sw.remove(),1050);   // 독수리가 화면을 가장 많이 가린 순간(약 0.47초)에 컷이 바뀐다
    });
  }
  const capMs = (text,c)=> c.ms || Math.round(1800 + String(text).length*(en?52:88));
  const cutMs = cut=> cut.caps.reduce((s,c)=>s+(c.pre||0)+capMs(tx(c.k),c)+(c.post||0)+900,0);
  async function showCaption(text){ cap.textContent=text; capBox.style.opacity='1'; }
  async function hideCaption(){ capBox.style.opacity='0'; await sleep(620,false); }

  // ===== 7번 → 8번: 켜진 화면으로 확대 → 흰 섬광 → 검정 → 도스 터미널(타이핑) → ENTER↵ 반짝 → 탭 → 글리치 → 어둠 → 다음(눈 뜨는 연출) =====
  const waitTap = ms => new Promise(res=>{ const t=setTimeout(()=>{ timers.delete(t); wake=null; res(false); },ms); timers.add(t); wake=()=>{ clearTimeout(t); timers.delete(t); wake=null; res(true); }; });
  async function runTail(built){
    const g=built.scr.geom, bw=el.clientWidth||375, bh=el.clientHeight||812;
    const flashEl=mk('position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;'); el.insertBefore(flashEl,skip);
    if(motionOK && built.zoomEl){
      const z=Math.max(bh/g.h,bw/g.w)*1.12, ze=built.zoomEl; ze.style.transformOrigin=g.cx+'px '+g.cy+'px';
      // 처음엔 천천히 다가가다가 뒤로 갈수록 빠르게 화면 속으로 빨려 들어간다 — 확대를 지수(로그 공간)로 보간하고 진행을 u^1.7로 휘어(앞부분이 느리지 않게 · 총 0.9초 · 빨려 들어가듯 빠르게) 끝으로 갈수록 가속, 마지막 구간엔 블러가 붙는다
      const FR=[]; for(let k=0;k<=28;k++){ const u=k/28, e=Math.pow(u,1.7), sc=Math.exp(Math.log(z)*e), bl=u>.5?Math.pow((u-.5)/.5,2)*10:0; FR.push({transform:'scale('+sc.toFixed(3)+')',filter:'blur('+bl.toFixed(1)+'px)'}); }
      ze.animate(FR,{duration:900,easing:'linear',fill:'forwards'}); await sleep(900,false); if(dead) return;
      flashEl.style.opacity='1'; await sleep(110,false); if(dead) return;                 // 흰 섬광 1번
    } else { capBox.style.opacity='0'; fade.style.transition='opacity .6s ease'; fade.style.opacity='1'; await sleep(650,false); if(dead) return; fade.style.transition='none'; }
    capBox.style.opacity='0'; stage.style.opacity='0'; flashEl.style.transition='opacity .12s'; flashEl.style.opacity='0'; fade.style.opacity='0';
    await sleep(500,false); if(dead) return;
    await runTerminal();
  }
  async function runTerminal(){
    const bw=el.clientWidth||375, bh=el.clientHeight||812, S=Math.min(2,Math.max(1,window.devicePixelRatio||1)), W=Math.round(bw*S), H=Math.round(bh*S);   // 점이 또렷하도록 기기 해상도(최대 2배)로 그린다
    const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;filter:drop-shadow(0 0 8px rgba(60,255,100,.6));';   // 형광 초록 번짐
    el.insertBefore(cv,skip); const ctx=cv.getContext('2d',{willReadFrequently:true});
    try{ if(document.fonts&&document.fonts.load) await Promise.race([ document.fonts.load('900 20px RLDoto'), sleep(2500,false) ]); }catch(_){}
    const fam=(document.fonts&&document.fonts.check&&document.fonts.check('900 20px RLDoto'))?'RLDoto':'monospace';
    const mx=Math.round(14*S); ctx.font='900 100px '+fam; const ratio=ctx.measureText('M').width/100, fs=Math.floor((W-2*mx)/23/ratio);   // 한 줄 약 23자(Doto는 폭 0.6em 고정폭)
    ctx.font='900 '+fs+'px '+fam; const adv=ctx.measureText('M').width, COLS=Math.max(18,Math.floor((W-2*mx)/adv)), lh=Math.round(fs*1.3), top=Math.round(H*.18);
    const FG=[80,255,110], BG=[2,7,3];   // 도스 모니터 형광 초록
    const wrap=(str,n)=>{ const out=[]; let cur=''; for(const w of str.split(' ')){ if((cur+' '+w).trim().length<=n) cur=(cur+' '+w).trim(); else { out.push(cur); cur=w; } } out.push(cur); return out; };
    const L1=tx('prologue_term_1'), L2=wrap(tx('prologue_term_2'),COLS), ENTER=tx('prologue_enter');
    let lines=[''], curOn=true, enterOn=false;
    const arrow=(x,y,cell)=>{ const P=[[6,0],[6,1],[6,2],[6,3],[5,3],[4,3],[3,3],[2,3],[1,3],[0,3],[1,2],[1,4]]; for(const q of P) ctx.fillRect(x+q[0]*cell,y+q[1]*cell,cell,cell); };   // 꺾인 화살표 ↵ — 글꼴에 글리프가 없어 도트로 그린다
    function render(){
      ctx.fillStyle='rgb('+BG+')'; ctx.fillRect(0,0,W,H); ctx.fillStyle='rgb('+FG+')'; ctx.font='900 '+fs+'px '+fam; ctx.textBaseline='alphabetic';
      lines.forEach((t,i)=>ctx.fillText(t,mx,top+i*lh+Math.round(fs*.8)));
      if(curOn){ const i=lines.length-1; ctx.fillRect(mx+adv*lines[i].length,top+i*lh+Math.round(fs*.1),Math.max(2,Math.round(adv)-1),Math.round(fs*.75)); }
      if(enterOn){ const cell=Math.max(2,Math.round(fs/8)), tw=adv*ENTER.length+cell*2+cell*7, x0=Math.round((W-tw)/2), y0=H-Math.round(H*.09); ctx.fillText(ENTER,x0,y0); arrow(Math.round(x0+adv*ENTER.length+cell*2),y0-Math.round(fs*.72),cell); }
    }
    render();
    for(let k=0;k<4;k++){ curOn=k%2===1; render(); await sleep(300,false); if(dead) return; }           // 커서만 깜빡
    curOn=true; const type=async(str,li)=>{ for(const ch of str){ lines[li]+=ch; render(); await sleep(50+(Math.random()<.25?60:0),false); if(dead) return false; } return true; };
    if(!(await type(L1,0))) return;
    for(let k=0;k<5;k++){ curOn=k%2===1; render(); await sleep(150,false); if(dead) return; }               // 엔터 전 잠깐
    curOn=true;
    for(let i=0;i<L2.length;i++){ lines.push(''); render(); await sleep(260,false); if(dead) return; if(!(await type(L2[i],lines.length-1))) return; if(i===0) await sleep(200,false); if(dead) return; }
    await sleep(500,false); if(dead) return;
    curOn=false; enterOn=true; let tapped=false;                                                          // 아래쪽에서 ENTER ↵ 반짝 — 화면을 탭하면 다음으로
    while(!tapped){ render(); tapped=await waitTap(520); if(dead) return; enterOn=!enterOn; if(tapped) break; }
    enterOn=false; render(); if(!motionOK){ cv.style.transition='opacity .6s'; cv.style.opacity='0'; await sleep(650,false); if(dead) return; finish(); return; }
    // 글리치: 글자 영역을 가는 가로 조각으로 찢어 좌우로 밀고 RGB를 어긋나게, 블록을 근처로 복사 — 약 1초 점증 → 어둠
    const base=ctx.getImageData(0,0,W,H), bs=base.data, y0=top-16*S, y1=Math.min(H,top+lh*(lines.length+1)+16*S);
    const rr=(a,b)=>a+Math.random()*(b-a);
    const frame=(p,fade)=>{ const out=new Uint8ClampedArray(bs); let y=y0;
      while(y<y1){ const bh=Math.max(3,Math.round(S*rr(3,8+22*p))), ye=Math.min(y1,y+bh);
        if(Math.random()<.25+.55*p){ const sh=Math.round((Math.random()<.5?-1:1)*S*rr(8,14+90*p)), sp=Math.round(S*(2+8*p));
          for(let yy=y;yy<ye;yy++) for(let xx=0;xx<W;xx++){ const o=(yy*W+xx)*4; out[o]=bs[(yy*W+((xx-(sh+sp)+W*4)%W))*4]; out[o+1]=bs[(yy*W+((xx-sh+W*4)%W))*4+1]; out[o+2]=bs[(yy*W+((xx-(sh-sp)+W*4)%W))*4+2]; } }
        y=ye; }
      for(let n=Math.round(2+14*p);n>0;n--){ const w=Math.round(S*rr(20,92)), h2=Math.round(S*rr(6,18)), bx=Math.round(rr(0,W-w)), by=Math.round(rr(y0,Math.max(y0+1,y1-h2))), dx=Math.round(S*rr(-90,90)), dy=Math.round(S*rr(-16,16)), sx=Math.min(Math.max(bx+dx,0),W-w), sy=Math.min(Math.max(by+dy,0),H-h2);
        for(let yy=0;yy<h2;yy++) for(let xx=0;xx<w;xx++){ const o=((by+yy)*W+bx+xx)*4, q=((sy+yy)*W+sx+xx)*4; out[o]=bs[q]; out[o+1]=bs[q+1]; out[o+2]=bs[q+2]; } }
      const fl=(p>.2?rr(.55,1.15):1)*fade; for(let i=0;i<out.length;i+=4){ out[i]=Math.min(255,out[i]*fl); out[i+1]=Math.min(255,out[i+1]*fl); out[i+2]=Math.min(255,out[i+2]*fl); out[i+3]=255; }
      ctx.fillStyle='rgb('+BG+')'; ctx.fillRect(0,0,W,H); ctx.putImageData(new ImageData(out,W,H),Math.round(S*rr(-(2+8*p),2+8*p)),0); };
    const G=16; for(let k=0;k<G;k++){ frame(Math.min(1,(k+1)/G*1.1),1); await sleep(60,false); if(dead) return; }
    for(let k=0;k<5;k++){ frame(1,1-(k+1)/5); await sleep(60,false); if(dead) return; }
    ctx.fillStyle='rgb('+BG+')'; ctx.fillRect(0,0,W,H); await sleep(250,false); if(dead) return;
    finish();
  }
  const builtAll=[];
  async function run(){
    const first = Math.max(0,(CUTS.findIndex(c=>c.id===opt.cut)));
    try{ if(document.fonts&&document.fonts.load) await Promise.race([ document.fonts.load('16px "Diphylleia"'), sleep(1500,false) ]); }catch(_){}
    await Promise.race([ Promise.all(CUTS[first].layers.map(l=>loadImg(l.src))), sleep(4500,false) ]); if(dead) return;
    let prev=null;
    for(let i=first;i<CUTS.length;i++){
      const cut=CUTS[i];
      await Promise.race([ Promise.all(cut.layers.map(l=>loadImg(l.src))), sleep(3500,false) ]); if(dead) return;
      const built=buildCut(cut,cutMs(cut)); builtAll.push(built); stage.appendChild(built.box); live=live.concat(built.layers);
      await Promise.race([ built.ready, sleep(4500,false) ]); if(dead) return;   // 6번은 켜진/꺼진 이미지를 읽어 첫 프레임을 그린 뒤에 보여 준다
      const pass = cut.passIn && motionOK && prev;
      if(pass){ const tr='opacity '+(cut.passIn==='eagle'?'.14':'.22')+'s ease'; built.box.style.transition=tr; prev.box.style.transition=tr; await (cut.passIn==='eagle'?eaglePass():lightPass()); if(dead) return; }
      await sleep(30,false); built.box.style.opacity='1'; const tShown=performance.now(); dbg('컷 '+cut.id+' 표시'); if(built.hooks.onShown) built.hooks.onShown(); if(i===first){ fade.style.opacity='0'; skip.style.opacity='.4'; }
      capBox.style.top=CAP_POS[cut.pos||'mid']; cap.style.textShadow=SHADE[(cut.shade||1)-1]||SHADE[0];
      if(prev){ const old=prev; old.box.style.opacity='0'; setTimeout(()=>{ old.box.remove(); old.dispose(); live=live.filter(L=>old.layers.indexOf(L)<0); },900); }
      prev=built; await sleep(cut.lead||(i===first?1100:900),true); if(dead) return;
      for(let ci=0;ci<cut.caps.length;ci++){ const c=cut.caps[ci];
        if(c.pre){ await sleep(c.pre,true); if(dead) return; }
        if(built.hooks.onCaption) built.hooks.onCaption(ci);
        await showCaption(tx(c.k)); dbg('자막 '+cut.id+'-'+(ci+1)+' 표시 (컷 뜬 뒤 '+((performance.now()-tShown)/1000).toFixed(1)+'s)');
        if(cut.tail && cut.tailAt && ci===cut.caps.length-1){ await sleep(Math.max(250,cut.tailAt-(performance.now()-tShown)),true); if(dead) return; await runTail(built); return; }   // 자막이 떠 있는 도중에 줌인 시작 — 자막은 줌 끝(섬광)에서 사라진다
        await sleep(capMs(tx(c.k),c),true); if(dead) return;
        if(cut.tail && ci===cut.caps.length-1) capBox.style.opacity='0'; else { await hideCaption(); if(dead) return; }   // tail이 이어지는 컷은 자막이 사라지는 순간 바로 줌인(대기 없음)
        if(c.post){ await sleep(c.post,true); if(dead) return; }
      }
      if(cut.tail && built.scr){ await runTail(built); return; }   // 7번 → 8번(터미널)은 같은 장면에서 이어진다
      if(opt.single || (opt.until && cut.id>=opt.until)) break;   // 미리보기: 이 컷 하나만 / until = 그 컷까지
    }
    finish();
  }
  function destroy(){ dead=true; builtAll.forEach(b=>{ try{ b.dispose(); }catch(_){} }); timers.forEach(clearTimeout); timers.clear(); cancelAnimationFrame(raf); window.removeEventListener('deviceorientation',onOri,true); el.removeEventListener('pointerup',onTap); if(wake){ const w=wake; wake=null; w(); } }
  function finish(){
    if(finished) return; finished=true; capBox.style.opacity='0'; skip.style.opacity='0'; fade.style.transition='opacity .6s ease'; fade.style.opacity='1';
    const done=()=>{ destroy(); try{ opt.onDone&&opt.onDone(); }catch(e){ console.error('prologue onDone',e); } };
    setTimeout(done,650);
  }
  run().catch(e=>{ console.error('prologue failed',e); finish(); });
  return { destroy, skip:finish };
}
