// hitfx.js — 전투 타격 파티클 오버레이 (2026-10-15 위젯 확정판 이식)
// 기존 DOM/CSS 타격 연출(숫자·플래시·흔들림·크리 노랑) 위에 얹는 순수 장식 레이어다. 게임 상태를 읽거나 바꾸지 않는다.
// 화면 전체에 pointer-events:none 캔버스 한 장(body 직속 · 가상DOM 밖). 입자가 없으면 rAF를 멈춘다.
//   분류 0=기계(스파크·금속 파편·연기) / 1=유기체(짐승·인간: 먼지·알갱이) / 2=감염체(회녹색 가스·포자·투명 방울)
//   단계 0/1/2 = 경/중/강 (한 방 비중 기준 — rl.dc.html setCombatFx의 tier와 같은 값을 넘긴다)
// 사용: const hfx = await import('./hitfx.js?v=..'); hfx.init(); hfx.burst({x,y,type,tier,dx,dy});
let cv=null, cx=null, W=0, H=0, dpr=1, raf=0, last=0, ready=false;
let sparks=[], smoke=[], deb=[], hits=[], drops=[], grit=[];
let SMS=null;                 // 연기 스프라이트 {m,d,g} — 한가한 시간에 만든다(준비 전엔 연기만 생략)
const SPD=0.62, SZ=0.7;       // 범위를 좁힌 확정값(속도 62% · 크기 70%)
export let scale=1;           // 전체 크기 배율(필요하면 조정) — 0이면 끔
export function setScale(v){ scale=Math.max(0,+v||0); }

const rnd=(a,b)=>a+Math.random()*(b-a);
const gauss=()=>(Math.random()+Math.random()+Math.random()-1.5)/1.5;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const rgb=(c,a)=>'rgba('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+','+a+')';
function heatCol(h){ let t; if(h>0.75){t=(h-0.75)/0.25;return mix([255,205,110],[255,250,235],t);} if(h>0.45){t=(h-0.45)/0.3;return mix([255,130,40],[255,205,110],t);} t=Math.max(0,h/0.45); return mix([150,35,15],[255,130,40],t); }
function glowSprite(c){ const o=document.createElement('canvas'); o.width=o.height=64; const g=o.getContext('2d'); const r=g.createRadialGradient(32,32,0,32,32,32); r.addColorStop(0,'rgba('+c+',1)'); r.addColorStop(0.22,'rgba('+c+',0.5)'); r.addColorStop(0.55,'rgba('+c+',0.12)'); r.addColorStop(1,'rgba('+c+',0)'); g.fillStyle=r; g.fillRect(0,0,64,64); return o; }
let GW=null,GO=null,GY=null,GL=null,GP=null;
function glowC(sp,px,py,r,a){ cx.globalAlpha=a; cx.drawImage(sp,px-r,py-r,r*2,r*2); cx.globalAlpha=1; }
// 값 노이즈 / fbm (연기 스프라이트·드리프트용)
const hash=(i,j)=>{ const n=Math.sin(i*127.1+j*311.7)*43758.5453; return n-Math.floor(n); };
function vn(px,py){ const xi=Math.floor(px),yi=Math.floor(py),xf=px-xi,yf=py-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf); const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(px,py){ let s=0,a=0.5; for(let o=0;o<4;o++){ s+=a*vn(px,py); px*=2; py*=2; a*=0.5; } return s; }
function smokeSprite(off,b){
  const S=96, o=document.createElement('canvas'); o.width=o.height=S; const g=o.getContext('2d');
  const im=g.createImageData(S,S), fl=new Float32Array(S*S), fo=new Float32Array(S*S);
  for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const dx=(i-S/2)/(S/2),dy=(j-S/2)/(S/2),d=Math.sqrt(dx*dx+dy*dy); fo[j*S+i]=Math.pow(Math.max(0,1-d),1.15); const qx=i/S*2.6+off,qy=j/S*2.6+off*1.7,wx=fbm(qx+5.2,qy+1.3),wy=fbm(qx+8.1,qy+4.7); fl[j*S+i]=fbm(qx+wx*1.4,qy+wy*1.4); }
  for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const v=fl[j*S+i], a=clamp(v*1.7-0.38,0,1)*fo[j*S+i], i0=Math.max(0,i-2),j0=Math.max(0,j-2),i1=Math.min(S-1,i+2),j1=Math.min(S-1,j+2), sh=0.78+(fl[j0*S+i0]-fl[j1*S+i1])*2.4, m=clamp(sh*(0.6+0.7*v),0.15,1.6), k=(j*S+i)*4; im.data[k]=Math.min(255,b[0]*m); im.data[k+1]=Math.min(255,b[1]*m); im.data[k+2]=Math.min(255,b[2]*m); im.data[k+3]=a*255; }
  g.putImageData(im,0,0); return o;
}
const set3=b=>[smokeSprite(0,b),smokeSprite(7.3,b),smokeSprite(14.9,b)];

// 기계 단계별 계수 / 유기체·감염체 단계별 계수(위젯 확정값)
const MF=[0.35,0.7,1.05], MV=[0.55,0.8,1.05], MZ=[0.6,0.8,1.05];
const TI=[{sz:0.85,v:0.85,fl:0.7},{sz:1,v:1,fl:1},{sz:1.3,v:1.25,fl:1.4}];
const RA=[0.3,0.3,0.3], RC=['255,225,170','235,225,205','205,220,190'];
// 2026-10-16 가시성 보강: 유기체 먼지·알갱이는 밝은 모래색, 감염체 먼지·포자는 보라
const TAN=[[226,206,170],[198,174,138],[244,232,206]], PUR=[[190,150,235],[168,128,218],[214,184,248]], GOO=['#a5c986','#93bb74','#b3d194'];

export function init(){
  if(ready||typeof document==='undefined') return; ready=true;
  GW=glowSprite('255,255,255'); GO=glowSprite('255,140,45'); GY=glowSprite('255,215,130'); GL=glowSprite('225,240,205'); GP=glowSprite('175,115,255');
  const idle=window.requestIdleCallback||(f=>setTimeout(f,400));
  // 스프라이트는 한 번에 하나씩(긴 작업 방지) — 부팅 직후 프레임을 막지 않게 한가할 때 만든다.
  const sets={}; const jobs=[['m',[100,98,95]],['d',[182,156,120]],['g',[196,146,244]]];
  const next=()=>{ const j=jobs.shift(); if(!j){ SMS=sets; return; } try{ sets[j[0]]=set3(j[1]); }catch(_){ } idle(next,{timeout:4000}); };
  idle(next,{timeout:4000});
}
function ensureCanvas(){
  if(cv) return true; if(typeof document==='undefined'||!document.body) return false;
  cv=document.createElement('canvas'); cv.setAttribute('aria-hidden','true');
  cv.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:45;';
  document.body.appendChild(cv); cx=cv.getContext('2d'); fit();
  window.addEventListener('resize',fit);
  return !!cx;
}
function fit(){ if(!cv) return; dpr=Math.min(window.devicePixelRatio||1,2); W=window.innerWidth; H=window.innerHeight; cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }

function addSpark(px,py,vx,vy,life,w,delay,split){ sparks.push({x:px,y:py,vx,vy,age:-delay,life,w,split,sa:split?life*rnd(0.3,0.6):0,did:false}); }
function puff(px,py,vx,vy,delay,life,s0,s1,a0,spr,lit,dr,fade){ smoke.push({x:px,y:py,vx,vy,age:-delay,life,s0,s1,rot:rnd(0,6.283),vr:rnd(-0.8,0.8),spr,a0,lit,dr,fade:fade||1.3}); }   // fade = 사라지는 곡선 지수(작을수록 오래 짙게 남는다)
function gooDrop(px,py,a,s,r,c,life){ drops.push({x:px,y:py,vx:Math.cos(a)*s,vy:Math.sin(a)*s,age:0,life,r,c,buoy:rnd(-170,-40),asp:rnd(0.65,1.55),wob:rnd(-4,4),shp:[[rnd(0.1,0.32),rnd(0,6.28)],[rnd(0.08,0.24),rnd(0,6.28)],[rnd(0.04,0.16),rnd(0,6.28)]]}); }
function shard(px,py,a,s,pts,life,vr,o){ o=o||{}; deb.push({x:px,y:py,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,age:-Math.random()*0.04,life,rot:rnd(0,6.283),vr,fl:rnd(0,6),vf:rnd(-9,9),pts,g:o.g||1300,dr:o.dr||1.1,c1:o.c1||'#4d5058',c2:o.c2||'#2c2e33',rc:o.rc||'255,175,95'}); }   // 기본 = 기계 금속 파편 · 유기체 부서진 조각은 o로 색·중력을 바꾼다
function poly(r0){ const n=4+(Math.random()*2|0), pts=[]; for(let k=0;k<n;k++){ const ak=k/n*6.283+rnd(-0.3,0.3); pts.push([Math.cos(ak)*r0*rnd(0.5,1),Math.sin(ak)*r0*rnd(0.5,1)]); } return pts; }

// 한 번의 타격 — x,y = 화면(뷰포트) 좌표 / type 0·1·2 / tier 0·1·2 / dx,dy = 타격 방향(단위벡터, 없으면 무작위)
export function burst(o){
  if(!(scale>0)) return; if(!ensureCanvas()) return; if(!GW) init();
  const type=o.type|0, tier=clamp(o.tier|0,0,2), hx=o.x, hy=o.y, T=TI[tier];
  let dx=o.dx, dy=o.dy; if(dx==null||dy==null){ const sg=Math.random()<0.5?1:-1, ang=rnd(0.35,1.1); dx=Math.cos(ang)*sg; dy=Math.sin(ang); }
  hits.push({x:hx,y:hy,t:0,ty:type,ti:tier,T});
  const cen=Math.atan2(dy,dx); let i,k,a,s,n,pts;
  if(type===0){
    const NS=[14,40,80][tier],NH=[2,6,11][tier],NM=[1,3,5][tier],mv=MV[tier]*SPD,mz=MZ[tier];
    for(i=0;i<NS;i++){ const wide=Math.random()<0.28; a=wide?rnd(0,6.283):cen+gauss()*0.42; s=(wide?rnd(120,520):rnd(450,1500)*Math.pow(Math.random(),0.5))*mv; addSpark(hx+rnd(-3,3),hy+rnd(-3,3),Math.cos(a)*s,Math.sin(a)*s-60*SPD,rnd(0.22,0.6)*(wide?0.8:1)*(0.75+0.25*tier/2),rnd(1.3,2.7)*mz,Math.random()*0.05,Math.random()<0.16); }
    for(i=0;i<NH;i++){ n=4+(Math.random()*2|0); pts=[]; const r0=rnd(2.5,5.5)*mz; for(k=0;k<n;k++){ const ak=k/n*6.283+rnd(-0.3,0.3); pts.push([Math.cos(ak)*r0*rnd(0.5,1),Math.sin(ak)*r0*rnd(0.5,1)]); } shard(hx,hy,cen+rnd(-1.4,1.4),rnd(160,720)*mv,pts,rnd(0.7,1.1),rnd(-14,14)); }
    if(SMS) for(i=0;i<NM;i++) puff(hx+rnd(-6,6),hy+rnd(-6,6),(rnd(-25,25)+dx*30)*SPD,rnd(-30,-8),Math.random()*0.15,rnd(0.8,1.3),rnd(8,13),rnd(36,70)*mz*SZ,0.3,SMS.m[i%3],GO,1.6);
  }else if(type===1){
    // 유기체(짐승·인간): 밝은 모래색 먼지 덩어리 + 부서지는 알갱이·파편 · 제안 A(알갱이 반짝임)·B(낙하 잔먼지) 포함
    const ND=[14,22,32][tier],NG=[90,150,230][tier],NC=[4,8,14][tier],NF=[20,34,54][tier];
    if(SMS) for(i=0;i<ND;i++){ const om=Math.random()<0.45; a=om?rnd(0,6.283):cen+gauss()*0.8; s=(om?rnd(60,240):rnd(220,520))*SPD; puff(hx+rnd(-8,8),hy+rnd(-8,8),Math.cos(a)*s,Math.sin(a)*s-20,Math.random()*0.08,rnd(0.8,1.5),rnd(10,18)*SZ,rnd(54,110)*T.sz*SZ,0.42,SMS.d[i%3],null,3.2); }
    for(i=0;i<NG;i++){ const z=rnd(0.45,1.5), om2=Math.random()<0.4; a=om2?rnd(0,6.283):cen+gauss()*0.9; s=rnd(120,700)*z*T.v*SPD; grit.push({x:hx+rnd(-4,4),y:hy+rnd(-4,4),vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,age:-Math.random()*0.04,life:rnd(0.3,0.85),z,c:TAN[i%3],flo:false,lt:Math.random()<0.28}); }
    for(i=0;i<NC;i++) shard(hx,hy,cen+rnd(-1.5,1.5),rnd(120,520)*T.v*SPD,poly(rnd(2,4.6)*T.sz),rnd(0.6,1.1),rnd(-12,12),{g:1100,dr:1.2,c1:'#a59780',c2:'#6f6656',rc:'255,240,218'});
    for(i=0;i<NF;i++) grit.push({x:hx+rnd(-20,20),y:hy+rnd(-14,14),vx:rnd(-40,40)*SPD,vy:rnd(-20,30),age:-rnd(0.12,0.5),life:rnd(0.8,1.5),z:rnd(0.45,0.95),c:TAN[i%3],flo:true,fall:true,pa:0.7,lt:false});
  }else{
    // 감염체: 자욱한 보라 스모그(짙게·오래 남음) + 보라 포자 + 투명 방울 · 제안 C(포자 보라 빛) 포함
    const NGa=[11,17,26][tier],NGr=[36,60,96][tier],NGo=[3,4,6][tier];
    if(SMS) for(i=0;i<NGa;i++){ const om3=Math.random()<0.5; a=om3?rnd(0,6.283):cen+gauss()*0.9; s=(om3?rnd(30,140):rnd(120,340))*SPD; puff(hx+rnd(-10,10),hy+rnd(-8,8),Math.cos(a)*s,Math.sin(a)*s-30,Math.random()*0.12,rnd(1.3,2.3),rnd(14,22)*SZ,rnd(64,128)*T.sz*SZ,0.8,SMS.g[i%3],null,2.0,0.8); }
    for(i=0;i<NGr;i++){ const z3=rnd(0.45,1.45), om4=Math.random()<0.45; a=om4?rnd(0,6.283):cen+gauss()*1.0; s=rnd(80,520)*z3*T.v*SPD; grit.push({x:hx+rnd(-6,6),y:hy+rnd(-6,6),vx:Math.cos(a)*s,vy:Math.sin(a)*s-50*SPD,age:-Math.random()*0.06,life:rnd(0.7,1.8),z:z3,c:PUR[i%3],flo:true,pa:0.82,glow:true}); }
    for(i=0;i<NGo;i++) gooDrop(hx,hy,cen+gauss()*0.8,rnd(110,430)*T.v*SPD,(1.5+Math.pow(Math.random(),1.5)*2.2)*T.sz*0.9,GOO[i%3],rnd(1.0,1.6));
  }
  if(!raf){ last=performance.now(); raf=requestAnimationFrame(loop); }
}

function step(dt){
  let i,p,k;
  for(i=0;i<hits.length;i++) hits[i].t+=dt; hits=hits.filter(h=>h.t<1.0);
  for(i=0;i<sparks.length;i++){ p=sparks[i]; p.age+=dt; if(p.age<0) continue; const d=Math.exp(-2.3*dt); p.vx*=d; p.vy*=d; p.vy+=1000*dt; p.vx+=(Math.random()-0.5)*700*dt*SPD; p.vy+=(Math.random()-0.5)*700*dt*SPD; p.x+=p.vx*dt; p.y+=p.vy*dt;
    if(p.split&&!p.did&&p.age>p.sa){ p.did=true; for(k=0;k<3;k++){ const a=Math.random()*6.283, s=rnd(120,340)*SPD; addSpark(p.x,p.y,p.vx*0.25+Math.cos(a)*s,p.vy*0.25+Math.sin(a)*s,rnd(0.14,0.28),1,0,false); } } }
  sparks=sparks.filter(q=>q.age<q.life);
  for(i=0;i<deb.length;i++){ p=deb[i]; p.age+=dt; if(p.age<0) continue; p.vy+=p.g*dt; const dd=Math.exp(-p.dr*dt); p.vx*=dd; p.vy*=dd; p.x+=p.vx*dt; p.y+=p.vy*dt; p.rot+=p.vr*dt; p.fl+=p.vf*dt; }
  deb=deb.filter(q=>q.age<q.life);
  for(i=0;i<smoke.length;i++){ p=smoke[i]; p.age+=dt; if(p.age<0) continue; const sd=Math.exp(-p.dr*dt); p.vx=p.vx*sd+(vn(p.x*0.02,p.age*1.5)-0.5)*90*dt*SPD; p.vy=p.vy*sd-14*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.rot+=p.vr*dt; }
  smoke=smoke.filter(q=>q.age<q.life);
  for(i=0;i<drops.length;i++){ p=drops[i]; p.age+=dt; const tt=clamp(p.age/0.3,0,1), acc=260*(1-tt)+p.buoy*tt, dfg=Math.exp(-1.5*dt); p.vx=p.vx*dfg+(vn(p.x*0.03,p.age*1.2)-0.5)*130*dt*SPD; p.vy=p.vy*dfg+acc*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; }
  drops=drops.filter(q=>q.age<q.life);
  for(i=0;i<grit.length;i++){ p=grit[i]; p.age+=dt; if(p.age<0) continue;
    if(p.flo){ const g2=Math.exp(-1.9*dt); p.vx=p.vx*g2+(vn(p.x*0.03,p.age*1.4)-0.5)*300*dt*SPD; p.vy=p.vy*g2+((vn(p.y*0.03,p.age*1.4+7)-0.5)*260*SPD+(p.fall?70*p.z:-18*p.z))*dt; }
    else { const g1=Math.exp(-3.2*dt); p.vx=p.vx*g1+(Math.random()-0.5)*200*dt*SPD; p.vy=p.vy*g1+(300*p.z+(Math.random()-0.5)*200)*dt; }
    p.x+=p.vx*dt; p.y+=p.vy*dt; }
  grit=grit.filter(q=>q.age<q.life);
}
function streak(px,py,vx,vy,k,w,col,a){ const sp=Math.sqrt(vx*vx+vy*vy)+0.001, ux=vx/sp, uy=vy/sp, tx=px-vx*k, tY=py-vy*k, nx=-uy*w/2, ny=ux*w/2; cx.fillStyle=rgb(col,a); cx.beginPath(); cx.moveTo(px+nx,py+ny); cx.lineTo(tx,tY); cx.lineTo(px-nx,py-ny); cx.closePath(); cx.fill(); }
function blobPath(p,rr,sx,sy,sc){ const sh=p.age*p.wob; cx.beginPath(); for(let j=0;j<=18;j++){ const th=j/18*6.2832; let R=1; for(let m=0;m<3;m++) R+=p.shp[m][0]*Math.cos((m+2)*th+p.shp[m][1]+sh); const xx=Math.cos(th)*rr*R*sx*sc, yy=Math.sin(th)*rr*R*sy*sc; if(j) cx.lineTo(xx,yy); else cx.moveTo(xx,yy); } cx.closePath(); }

function render(){
  cx.setTransform(dpr,0,0,dpr,0,0); cx.clearRect(0,0,W,H);   // 좌표는 뷰포트 px 그대로 — scale은 입자 크기 배율에만 쓴다
  let i,p,k;
  if(SMS){
    for(i=0;i<smoke.length;i++){ p=smoke[i]; if(p.age<0) continue; const u=p.age/p.life, al=Math.min(1,p.a0*Math.pow(1-u,p.fade)*Math.min(1,p.age/0.06)), sz=(p.s0+(p.s1-p.s0)*Math.sqrt(u))*scale;
      cx.save(); cx.globalAlpha=al; cx.translate(p.x,p.y); cx.rotate(p.rot); cx.drawImage(p.spr,-sz,-sz,sz*2,sz*2); cx.restore();
      if(p.lit&&u<0.35){ cx.globalCompositeOperation='lighter'; glowC(p.lit,p.x,p.y,sz*0.85,0.18*(1-u/0.35)); cx.globalCompositeOperation='source-over'; } }
  }
  for(i=0;i<grit.length;i++){ p=grit[i]; if(p.age<0) continue; const ug=p.age/p.life;
    if(p.flo){ const fa=Math.min(1,p.age/0.08)*(p.pa||0.62)*(1-ug*ug); cx.fillStyle=rgb(p.c,fa); cx.beginPath(); cx.arc(p.x,p.y,p.z*1.05*scale,0,6.283); cx.fill(); }
    else { const ga=0.62*(1-ug*ug); streak(p.x,p.y,p.vx,p.vy,0.012,p.z*1.2*scale,p.c,ga); cx.fillStyle=rgb(p.c,ga); cx.beginPath(); cx.arc(p.x,p.y,p.z*0.8*scale,0,6.283); cx.fill(); } }
  for(i=0;i<deb.length;i++){ p=deb[i]; if(p.age<0) continue; const u2=p.age/p.life, al2=u2>0.7?1-(u2-0.7)/0.3:1, lit=Math.max(0,1-p.age/0.45);
    for(let g=1;g>=0;g--){ cx.save(); cx.globalAlpha=al2*(g?0.28:1); cx.translate(p.x-p.vx*0.012*g,p.y-p.vy*0.012*g); cx.rotate(p.rot); const cf=Math.cos(p.fl); cx.scale(scale,scale*(cf*0.9+0.1*(cf<0?-1:1)));
      cx.beginPath(); cx.moveTo(p.pts[0][0],p.pts[0][1]); for(k=1;k<p.pts.length;k++) cx.lineTo(p.pts[k][0],p.pts[k][1]); cx.closePath();
      cx.fillStyle=cf>0?p.c1:p.c2; cx.fill(); cx.strokeStyle='rgba('+p.rc+','+(0.9*lit+0.14)+')'; cx.lineWidth=1; cx.stroke(); cx.restore(); } }
  cx.globalCompositeOperation='lighter';
  for(i=0;i<sparks.length;i++){ p=sparks[i]; if(p.age<0) continue; const hh=1-p.age/p.life, col=heatCol(hh), fl=hh<0.5?0.7+0.3*Math.random():1, k2=0.034/SPD*0.8;
    streak(p.x,p.y,p.vx,p.vy,k2*1.1,p.w*scale,col,0.55*fl);
    streak(p.x,p.y,p.vx,p.vy,k2*0.55,p.w*0.5*scale,mix(col,[255,255,255],0.6),0.9*fl);
    glowC(GO,p.x,p.y,p.w*5*scale,0.5*hh*fl); }
  cx.globalCompositeOperation='source-over';
  // 감염체 방울 — 합쳐지지 않고 투명하게(알파 .28) + 테두리·하이라이트로 유리알처럼
  for(i=0;i<drops.length;i++){ p=drops[i]; const ud=p.age/p.life, shr=ud>0.7?Math.max(0,1-(ud-0.7)/0.3):1, rr=p.r*1.3*shr*scale; if(rr<0.4) continue;
    const spd=Math.hypot(p.vx,p.vy), stre=1+Math.min(spd/380,3.2), ang2=Math.atan2(p.vy,p.vx), bsx=stre*p.asp, bsy=0.9/Math.sqrt(p.asp);
    cx.save(); cx.translate(p.x,p.y); cx.rotate(ang2);
    cx.globalAlpha=0.28; cx.fillStyle=p.c; blobPath(p,rr,bsx,bsy,1); cx.fill(); cx.globalAlpha=1;
    if(shr>0.3){ cx.strokeStyle='rgba(60,90,40,0.28)'; cx.lineWidth=0.7; blobPath(p,rr,bsx,bsy,1); cx.stroke(); cx.fillStyle='rgba(225,245,190,0.1)'; blobPath(p,rr,bsx,bsy,0.62); cx.fill();
      cx.fillStyle='rgba(250,255,235,0.55)'; cx.beginPath(); cx.ellipse(-bsx*rr*0.3,-bsy*rr*0.38,bsx*rr*0.26,bsy*rr*0.2,0,0,6.283); cx.fill(); }
    cx.restore(); }
  cx.globalCompositeOperation='lighter';
  for(i=0;i<grit.length;i++){ p=grit[i]; if(p.age<0) continue; const ugs=p.age/p.life;
    if(p.lt&&p.age<0.14) glowC(GW,p.x,p.y,p.z*5.5*scale,0.5*(1-p.age/0.14));
    if(p.glow) glowC(GP,p.x,p.y,p.z*6*scale,0.3*Math.min(1,p.age/0.08)*(1-ugs*ugs)); }
  for(i=0;i<hits.length;i++){ const h=hits[i], t=h.t, ht=h.ty, fl2=ht===0?MF[h.ti]:h.T.fl;
    if(ht===0){ const f1=Math.max(0,1-t/0.08); glowC(GW,h.x,h.y,64*fl2*SZ*scale,f1); const f2=Math.max(0,1-t/0.2); glowC(GY,h.x,h.y,150*fl2*SZ*scale,0.75*f2*f2); glowC(GO,h.x,h.y,230*fl2*SZ*scale,0.3*f2); }
    else { const b1=Math.max(0,1-t/0.06); glowC(ht===2?GL:GW,h.x,h.y,34*fl2*SZ*scale,0.7*b1); }
    const pr=t/0.26; if(pr<1){ const R=(60+40*fl2)*SZ*scale*(1-Math.pow(1-pr,3)); cx.strokeStyle='rgba('+RC[ht]+','+(RA[ht]*(1-pr))+')'; cx.lineWidth=1.6*(1-pr)+0.5; cx.beginPath(); cx.arc(h.x,h.y,R,0,6.283); cx.stroke(); } }
  cx.globalCompositeOperation='source-over';
}
function loop(t){
  const rd=Math.min((t-last)/1000,0.05); last=t;
  try{ step(rd); render(); }catch(e){ sparks=[];smoke=[];deb=[];hits=[];drops=[];grit=[]; }   // 장식 레이어가 전투를 깨지 않게
  const busy=sparks.length||smoke.length||deb.length||hits.length||drops.length||grit.length;
  if(busy) raf=requestAnimationFrame(loop); else { raf=0; if(cx) cx.clearRect(0,0,cv.width,cv.height); }
}
