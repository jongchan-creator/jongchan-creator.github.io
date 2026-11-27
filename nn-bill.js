/* ══════════════════════════════════════════════════════════════════════════
   nn-bill.js — 날개 달린 지폐 · 누르면 터지는 축포                (2026-11-27 v1)
   ──────────────────────────────────────────────────────────────────────────
   예전 (index.html 안 인라인 스크립트 · 오푸스 초기 모델)
     · 지폐를 누르면 그 자리에서 그냥 사라지고, 동그란 점 12~38개 · 잔불 3~8개를
       DOM 조각(div + 빛 그림자)으로 만들어 4칸짜리 키프레임으로 날렸다.
       움직임이 꺾은선이라 딱딱했고, '지폐가 터졌다'기보다 '점이 튀는' 느낌이었다.
   지금
     · 지폐가 진짜로 찢어져 흩어진다 — 지폐 그림을 10조각(찢긴 가장자리)으로 나눠,
       종이처럼 앞뒤로 뒤집히며 공기 저항을 받아 하늘하늘 떨어진다
       (납작할 때는 천천히, 옆으로 설 때는 빨리 — 뒷면은 살짝 어둡게).
     · 두 날개는 깃털이 되어 떨어져 나가 낙엽처럼 좌우로 흔들리며 천천히 내려간다.
     · 금빛 먼지는 꼬리를 끌며 퍼졌다가 공기 저항에 멈칫, 반짝이며 사라진다.
     · 부드러운 빛 번짐 · 얇은 충격파 고리 · 네 갈래 반짝임.
     · 수치가 클수록 크게 — +5% 이상이면 작은 지폐가 분수처럼 솟았다 떨어지고(돈비),
       +20% 이상이면 주변에서 작은 폭죽이 한 번 더 터진다. +15% · +25% 고리는 그대로.
     · 숫자(▲ +12.34%)는 0.00 부터 빠르게 올라가 멈출 때 살짝 고동친다.
       글꼴 · 크기(13px) · 소수점만 크게 · 머물다 스르륵 사라지는 것은 그대로.
     · 전부 캔버스 한 장에 그린다 — 터지는 동안만 있고 끝나면 지운다. DOM 조각을 수십 개씩
       만들지 않고, 빛 점 · 반짝임 · 깃털은 미리 한 번 그려 둔 그림을 찍기만 한다(매 프레임
       흐림 계산 없음). 화면이 버벅이면(프레임이 늦으면) 꼬리 · 번짐을 저절로 줄인다.
     · 비행: 날개와 지폐가 한 몸으로 날갯짓에 맞춰 오르내린다(내려칠 때 살짝 떠오름) —
       네 번 치고 잠깐 활공. 눌러 맞히기 쉽게 보이지 않는 손잡이를 조금 넓혔다.
       마우스를 올리면 뒤에 은은한 금빛.
   그대로: 8~15초마다 한 장 · 실물 지폐 그림 랜덤($100 / ₩50,000) · 그림이 안 오면 SVG 지폐 ·
           설정 › 화면 › '날아다니는 지폐' 스위치(nn_bill_off_v1) · '움직임 줄이기' 설정이면 쉼
   시험용: window.__nnBill.burst(x, y, v) · .spawn() · .stat
   ══════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__nnBill) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){ window.__nnBill = { off:true }; return; }

  /* ── 실물 지폐 그림 (랜덤: $100 / ₩50,000) ── */
  var BILLS = ['https://i.postimg.cc/hj83h8vH/daunlodeu.jpg','https://i.postimg.cc/dV7HGcDx/daunlodeu-(1).jpg'];
  var PRE = BILLS.map(function(u){ var p = new Image(); p.src = u; return p; });

  /* ── 모양 — CSS 는 여기서 넣는다 (nn-style.css 의 예전 규칙 위에 덮어쓴다) ── */
  var EZ = 'cubic-bezier(.45,.02,.35,1)';
  var CSS = [
    /* 보이지 않는 손잡이 — 움직이는 작은 지폐를 맞히기 쉽게 */
    '.fly-money::after{content:"";position:absolute;left:-12px;right:-12px;top:-15px;bottom:-15px;border-radius:26px}',
    /* 몸통(날개 + 지폐) 한 덩어리 — 날갯짓에 맞춰 오르내린다 */
    '.fly-money .fm-body{position:relative;display:flex;align-items:center;animation:fmBob 3.1s linear infinite;animation-delay:var(--fmd,0s);will-change:transform}',
    '.fly-money .fm-body>.fm-img{animation:none}',
    '.fly-money .fm-body>.fmwL{animation:fmFlapL3 3.1s linear infinite;animation-delay:var(--fmd,0s)}',
    '.fly-money .fm-body>.fmwR{animation:fmFlapR3 3.1s linear infinite;animation-delay:var(--fmd,0s)}',
    /* 마우스를 올리면 뒤에 은은한 금빛 */
    '.fly-money .fm-body::before{content:"";position:absolute;left:50%;top:50%;width:92px;height:52px;margin:-26px 0 0 -46px;border-radius:50%;pointer-events:none;',
    '  background:radial-gradient(closest-side,rgba(255,226,160,.30),rgba(255,226,160,.10) 58%,rgba(255,226,160,0));opacity:0;transition:opacity .3s ease}',
    '@media (hover:hover){.fly-money:hover .fm-body::before{opacity:1}}',
    /* 날갯짓 — 네 번 치고(0~80%) 잠깐 활공(80~100%). 한 번 칠 때 45% 지점이 가장 아래 */
    '@keyframes fmFlapL3{',
    '  0%,20%,40%,60%{transform:rotate(6deg);animation-timing-function:'+EZ+'}',
    '  9%,29%,49%,69%{transform:rotate(-24deg);animation-timing-function:'+EZ+'}',
    '  80%{transform:rotate(6deg);animation-timing-function:cubic-bezier(.3,0,.25,1)}',
    '  87%{transform:rotate(-5deg);animation-timing-function:cubic-bezier(.45,0,.55,1)}',
    '  94%{transform:rotate(-2deg);animation-timing-function:'+EZ+'}',
    '  100%{transform:rotate(6deg)}}',
    '@keyframes fmFlapR3{',
    '  0%,20%,40%,60%{transform:rotate(-6deg);animation-timing-function:'+EZ+'}',
    '  9%,29%,49%,69%{transform:rotate(24deg);animation-timing-function:'+EZ+'}',
    '  80%{transform:rotate(-6deg);animation-timing-function:cubic-bezier(.3,0,.25,1)}',
    '  87%{transform:rotate(5deg);animation-timing-function:cubic-bezier(.45,0,.55,1)}',
    '  94%{transform:rotate(2deg);animation-timing-function:'+EZ+'}',
    '  100%{transform:rotate(-6deg)}}',
    /* 몸통 — 내려칠 때 떠오르고 들어 올릴 때 가라앉는다 · 활공하며 살짝 내려앉음 */
    '@keyframes fmBob{',
    '  0%,20%,40%,60%{transform:translateY(.7px);animation-timing-function:cubic-bezier(.33,0,.4,1)}',
    '  9%,29%,49%,69%{transform:translateY(-1.2px);animation-timing-function:cubic-bezier(.33,0,.5,1)}',
    '  80%{transform:translateY(.2px);animation-timing-function:cubic-bezier(.4,0,.6,1)}',
    '  94%{transform:translateY(1.5px);animation-timing-function:cubic-bezier(.4,0,.6,1)}',
    '  100%{transform:translateY(.7px)}}',
    /* 숫자 — 안쪽 글자만 멈출 때 살짝 고동 */
    '.mkt-pop .mp-in{display:inline-block;transform-origin:50% 60%}',
    /* 뒤에서 반짝이는 것이 많아도 숫자가 또렷하게 — 초록 빛은 그대로, 글자 둘레에만 얇은 어둠 */
    '.mkt-pop{text-shadow:0 0 2px rgba(0,0,0,.85),0 1px 3px rgba(0,0,0,.7),0 0 7px rgba(62,240,140,.85),0 0 18px rgba(62,240,140,.4)}',
    '.fm-burst{position:fixed;pointer-events:none;z-index:99991;contain:strict}'
  ].join('\n');
  (function(){ if (document.getElementById('nnBillCss')) return; var s = document.createElement('style'); s.id = 'nnBillCss'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); })();

  var layer = document.createElement('div'); layer.id = 'flyLayer'; document.body.appendChild(layer);

  /* ── 날개 (SVG · 예전 그대로) ── */
  var WING_D = 'M20 10 C15.5 2.8 7 .5 2 4.2 C2.6 6.1 4.1 7.3 5.9 7.9 L5.1 9.7 C7.1 10 9 9.6 10.4 8.9 L9.8 11.3 C12 11.4 13.8 10.8 15.2 9.9 L15 12.1 C17 11.9 18.7 11.1 20 10 Z';
  var VEIN_D = 'M20 10 C15.8 5.2 9.5 3.4 4.6 5.2';
  var WING_DEF = '<defs><linearGradient id="fmgW2" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#f6efdc"/><stop offset="1" stop-color="#dcc9a0"/></linearGradient></defs>';
  var WING_BODY = '<path d="'+WING_D+'" fill="url(#fmgW2)" opacity=".96"/><path d="'+VEIN_D+'" fill="none" stroke="rgba(210,190,140,.6)" stroke-width=".5"/>';
  var WING_L = '<svg class="fmwL" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">'+WING_DEF+WING_BODY+'</svg>';
  var WING_R = '<svg class="fmwR" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">'+WING_DEF+'<g transform="translate(20 0) scale(-1 1)">'+WING_BODY+'</g></svg>';

  /* 그림이 안 올 때 쓰는 SVG 지폐 (예전 그대로) */
  var SVG = '<svg width="48" height="23" viewBox="0 0 54 26" xmlns="http://www.w3.org/2000/svg">'
    +'<defs>'
    +'<linearGradient id="fmgN" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#39835a"/><stop offset=".45" stop-color="#23603f"/><stop offset="1" stop-color="#143c28"/></linearGradient>'
    +'<linearGradient id="fmgW" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#f6efdc"/><stop offset="1" stop-color="#dcc9a0"/></linearGradient>'
    +'<radialGradient id="fmgO" cx=".5" cy=".42" r=".65"><stop offset="0" stop-color="#e9f2e6" stop-opacity=".26"/><stop offset="1" stop-color="#0c2418" stop-opacity=".5"/></radialGradient>'
    +'</defs>'
    +'<g class="fmw fmw-l"><path d="M20 9 C15.5 1.8 7 -0.5 2 3.2 C2.6 5.1 4.1 6.3 5.9 6.9 L5.1 8.7 C7.1 9 9 8.6 10.4 7.9 L9.8 10.3 C12 10.4 13.8 9.8 15.2 8.9 L15 11.1 C17 10.9 18.7 10.1 20 9 Z" fill="url(#fmgW)" opacity=".96"/><path d="M20 9 C15.8 4.2 9.5 2.4 4.6 4.2" fill="none" stroke="rgba(210,190,140,.6)" stroke-width=".45"/><path d="M19.4 9.2 C15.6 6.4 11 5.6 7.2 6.4" fill="none" stroke="rgba(210,190,140,.4)" stroke-width=".4"/></g>'
    +'<g transform="translate(54 0) scale(-1 1)"><g class="fmw fmw-l"><path d="M20 9 C15.5 1.8 7 -0.5 2 3.2 C2.6 5.1 4.1 6.3 5.9 6.9 L5.1 8.7 C7.1 9 9 8.6 10.4 7.9 L9.8 10.3 C12 10.4 13.8 9.8 15.2 8.9 L15 11.1 C17 10.9 18.7 10.1 20 9 Z" fill="url(#fmgW)" opacity=".96"/><path d="M20 9 C15.8 4.2 9.5 2.4 4.6 4.2" fill="none" stroke="rgba(210,190,140,.6)" stroke-width=".45"/><path d="M19.4 9.2 C15.6 6.4 11 5.6 7.2 6.4" fill="none" stroke="rgba(210,190,140,.4)" stroke-width=".4"/></g></g>'
    +'<g class="fm-note">'
    +'<rect x="14" y="6.5" width="26" height="14" rx="1.2" fill="url(#fmgN)" stroke="#0a2416" stroke-width=".5"/>'
    +'<rect x="15.3" y="7.8" width="23.4" height="11.4" rx=".7" fill="none" stroke="rgba(236,220,170,.68)" stroke-width=".4"/>'
    +'<rect x="16.1" y="8.6" width="21.8" height="9.8" rx=".5" fill="none" stroke="rgba(236,220,170,.3)" stroke-width=".3"/>'
    +'<line x1="16.5" y1="10.4" x2="21.5" y2="10.4" stroke="rgba(220,240,220,.16)" stroke-width=".35"/>'
    +'<line x1="16.5" y1="16.6" x2="21.5" y2="16.6" stroke="rgba(220,240,220,.16)" stroke-width=".35"/>'
    +'<line x1="32.5" y1="10.4" x2="37.5" y2="10.4" stroke="rgba(220,240,220,.16)" stroke-width=".35"/>'
    +'<line x1="32.5" y1="16.6" x2="37.5" y2="16.6" stroke="rgba(220,240,220,.16)" stroke-width=".35"/>'
    +'<ellipse cx="27" cy="13.5" rx="4.3" ry="4.7" fill="url(#fmgO)" stroke="rgba(236,220,170,.75)" stroke-width=".42"/>'
    +'<ellipse cx="27" cy="13.5" rx="3.4" ry="3.8" fill="none" stroke="rgba(236,220,170,.25)" stroke-width=".3"/>'
    +'<text x="27" y="15.7" text-anchor="middle" font-family="Georgia,serif" font-size="6" font-weight="700" fill="#eef7ea" opacity=".92">$</text>'
    +'<text x="17.4" y="10" font-family="Georgia,serif" font-size="2.7" font-weight="700" fill="rgba(238,247,234,.85)">100</text>'
    +'<text x="33.3" y="18.6" font-family="Georgia,serif" font-size="2.7" font-weight="700" fill="rgba(238,247,234,.85)">100</text>'
    +'</g></svg>';

  function rand(a,b){ return a+Math.random()*(b-a); }
  function clamp01(x){ return x<0?0:(x>1?1:x); }
  function smooth(x){ x=clamp01(x); return x*x*(3-2*x); }
  var TAU = Math.PI*2;
  var LOW = !!((navigator.hardwareConcurrency && navigator.hardwareConcurrency<=2) || (navigator.deviceMemory && navigator.deviceMemory<=2));
  var STAT = { bursts:0, frames:0, sumMs:0, maxMs:0, lite:false, last:null };

  /* ══════════ 비행 (동선은 예전 그대로: 한쪽에서 들어와 완만한 S자로 가로질러 반대편으로) ══════════ */
  var current=null, timer=null, paused=false;

  /* Catmull-Rom 스플라인 샘플링 → 부드러운 활공 */
  function crSample(pts, per){
    var out=[];
    for(var s=0;s<pts.length-1;s++){
      var p0=pts[Math.max(0,s-1)], p1=pts[s], p2=pts[s+1], p3=pts[Math.min(pts.length-1,s+2)];
      for(var k=0;k<per;k++){ var t=k/per, t2=t*t, t3=t2*t;
        out.push([
          0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
          0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)
        ]);
      }
    }
    out.push(pts[pts.length-1].slice());
    return out;
  }

  function isOff(){ var off=false; try{ off=document.documentElement.classList.contains('nn-bill-off') || localStorage.getItem('nn_bill_off_v1')==='1'; }catch(e){} return off; }

  function spawn(){
    /* 설정 › 화면 › '날아다니는 지폐' 를 끄면 쉰다 (개선제안 V-5) */
    if(paused || current || isOff()){ schedule(); return; }
    var W=innerWidth, H=innerHeight, m=70;
    var el=document.createElement('div'); el.className='fly-money';
    el.style.setProperty('--fmd', (-Math.random()*3.1).toFixed(2)+'s');   /* 날갯짓 박자는 장마다 다르게 */
    el.innerHTML='<div class="fm-body">'+WING_L+'<img class="fm-img" src="'+BILLS[Math.floor(Math.random()*BILLS.length)]+'" alt="" draggable="false">'+WING_R+'</div>';
    var im=el.querySelector('.fm-img'); if(im){ im.onerror=function(){ el.innerHTML=SVG; }; }
    layer.appendChild(el); current=el;

    var fromLeft=Math.random()<0.5;
    var y0=rand(H*0.14,H*0.72), y1=rand(H*0.14,H*0.72);
    var entry=[fromLeft?-m:W+m, y0], exit=[fromLeft?W+m:-m, y1];
    var n=4, amp=rand(90,190), ph=rand(0,TAU), way=[entry];
    for(var k=1;k<=n;k++){ var t=k/(n+1);
      way.push([entry[0]+(exit[0]-entry[0])*t,
                Math.max(H*0.08, Math.min(H*0.86, entry[1]+(exit[1]-entry[1])*t + Math.sin(ph+t*Math.PI*rand(1.6,2.3))*amp*(1-t*0.25)))]);
    }
    way.push(exit);
    var pts=crSample(way,14), frames=[];
    for(var q=0;q<pts.length;q++){
      var dx=(pts[Math.min(pts.length-1,q+1)][0]-pts[Math.max(0,q-1)][0]);
      var dy=(pts[Math.min(pts.length-1,q+1)][1]-pts[Math.max(0,q-1)][1]);
      var rot=Math.max(-13,Math.min(13, Math.atan2(dy,Math.abs(dx))*57.3*0.32 * (dx<0?-1:1) ));
      frames.push({transform:'translate('+pts[q][0].toFixed(1)+'px,'+pts[q][1].toFixed(1)+'px) translate(-31px,-10px) rotate('+rot.toFixed(1)+'deg)', offset:q/(pts.length-1)});
    }
    var anim=el.animate(frames,{duration:rand(16000,22000),easing:'linear'});
    anim.onfinish=function(){ finish(); };
    el.addEventListener('pointerdown',function(ev){
      if(el.__d || (ev.button && ev.button>0)) return;
      ev.stopPropagation(); ev.preventDefault();
      var snap=snapshot(el);          /* 사라지기 전에 자리 · 기울기 · 날개를 읽어 둔다 */
      try{ anim.cancel(); }catch(e){}
      finish();
      burst(snap);
    });
    function finish(){ if(el.__d) return; el.__d=1; el.remove(); current=null; schedule(); }
  }

  function schedule(){ clearTimeout(timer); timer=setTimeout(spawn, rand(8000,15000)); }

  function angleOf(node){
    try{ var m=getComputedStyle(node).transform, mm=/matrix\(([^)]+)\)/.exec(m||''); if(mm){ var a=mm[1].split(','); return Math.atan2(parseFloat(a[1]),parseFloat(a[0])); } }catch(e){}
    return 0;
  }
  /* 누른 순간의 지폐 — 가운데 · 기울기 · 크기 · 그림 · 두 날개 */
  function snapshot(el){
    var r=el.getBoundingClientRect(), s={ x:r.left+r.width/2, y:r.top+r.height/2, ang:angleOf(el), img:null, bw:24, bh:12.4, wings:[] };
    var im=el.querySelector('.fm-img');
    if(im && im.complete && im.naturalWidth>0){
      var ir=im.getBoundingClientRect();
      s.x=ir.left+ir.width/2; s.y=ir.top+ir.height/2; s.img=im;
      s.bw=im.offsetWidth||41; s.bh=im.offsetHeight||Math.round(s.bw*im.naturalHeight/im.naturalWidth);
    }
    var ws=[[el.querySelector('.fmwL'),-1],[el.querySelector('.fmwR'),1]];
    for(var i=0;i<2;i++){
      var w=ws[i][0], side=ws[i][1];
      if(w){ var q=w.getBoundingClientRect(); s.wings.push({ x:q.left+q.width/2, y:q.top+q.height/2, side:side, a:s.ang+angleOf(w) }); }
      else s.wings.push({ x:s.x+side*(s.bw/2+5), y:s.y-1, side:side, a:s.ang });
    }
    return s;
  }

  /* ══════════ 터지는 효과 ══════════ */

  function mk(w,h){ var c=document.createElement('canvas'); c.width=Math.max(1,Math.ceil(w)); c.height=Math.max(1,Math.ceil(h)); return c; }

  /* 미리 한 번 그려 두는 그림 — 빛 점 4색 · 네 갈래 반짝임 */
  var RGB={ gold:'255,204,118', cream:'255,234,192', white:'255,247,230', green:'118,234,168' };
  var SPR=null;
  function glowDot(rgb){
    var c=mk(64,64), g=c.getContext('2d'), gr=g.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,'rgba(255,255,255,1)');
    gr.addColorStop(.12,'rgba('+rgb+',1)');
    gr.addColorStop(.3,'rgba('+rgb+',.42)');
    gr.addColorStop(.62,'rgba('+rgb+',.1)');
    gr.addColorStop(1,'rgba('+rgb+',0)');
    g.fillStyle=gr; g.fillRect(0,0,64,64); return c;
  }
  function starSprite(){
    var S=128, h=S/2, c=mk(S,S), g=c.getContext('2d');
    var gr=g.createRadialGradient(h,h,0,h,h,h);
    gr.addColorStop(0,'rgba(255,246,222,.85)'); gr.addColorStop(.14,'rgba(255,222,156,.32)'); gr.addColorStop(.4,'rgba(255,206,130,.08)'); gr.addColorStop(1,'rgba(255,200,120,0)');
    g.fillStyle=gr; g.fillRect(0,0,S,S);
    g.translate(h,h);
    function ray(R,w){ g.beginPath(); g.moveTo(0,-R); g.quadraticCurveTo(w,-w,R,0); g.quadraticCurveTo(w,w,0,R); g.quadraticCurveTo(-w,w,-R,0); g.quadraticCurveTo(-w,-w,0,-R); g.closePath(); g.fill(); }
    g.fillStyle='rgba(255,250,236,1)'; ray(h*0.94,h*0.06);
    g.rotate(Math.PI/4); g.fillStyle='rgba(255,236,190,.75)'; ray(h*0.42,h*0.05);
    return c;
  }
  function sprites(){
    if(!SPR) SPR={ gold:glowDot(RGB.gold), cream:glowDot(RGB.cream), white:glowDot(RGB.white), green:glowDot(RGB.green), star:starSprite() };
    return SPR;
  }

  /* 깃털 — 날개 모양 그대로 (그림자는 그릴 때 한 번만) */
  var FEA={};
  function featherSprite(dpr){
    if(FEA[dpr]) return FEA[dpr];
    var sc=0.85*dpr, pad=6*dpr, w=20*sc+pad*2, h=20*sc+pad*2, c=mk(w,h), g=c.getContext('2d');
    g.translate(pad,pad); g.scale(sc,sc);
    if(window.Path2D){
      var gr=g.createLinearGradient(0,0,18,20); gr.addColorStop(0,'#ffffff'); gr.addColorStop(.5,'#f6efdc'); gr.addColorStop(1,'#dcc9a0');
      g.shadowColor='rgba(0,0,0,.4)'; g.shadowBlur=3*dpr; g.shadowOffsetY=1.3*dpr;
      g.globalAlpha=.97; g.fillStyle=gr; g.fill(new Path2D(WING_D));
      g.shadowColor='rgba(0,0,0,0)'; g.globalAlpha=1;
      g.lineWidth=.5; g.strokeStyle='rgba(210,190,140,.6)'; g.stroke(new Path2D(VEIN_D));
    }
    FEA[dpr]={ cv:c, w:w/dpr, h:h/dpr, cx:(pad+11*sc)/dpr, cy:(pad+7*sc)/dpr };
    return FEA[dpr];
  }

  /* 그림이 없을 때 쓰는 지폐 (SVG 지폐와 같은 색) */
  var PROC=null;
  function procBill(){
    if(PROC) return PROC;
    var c=mk(96,50), g=c.getContext('2d');
    var gr=g.createLinearGradient(0,0,96,50); gr.addColorStop(0,'#39835a'); gr.addColorStop(.45,'#23603f'); gr.addColorStop(1,'#143c28');
    g.fillStyle=gr; g.fillRect(0,0,96,50);
    g.strokeStyle='rgba(236,220,170,.68)'; g.lineWidth=1.4; g.strokeRect(4.5,4.5,87,41);
    g.strokeStyle='rgba(236,220,170,.3)'; g.lineWidth=1; g.strokeRect(7.5,7.5,81,35);
    g.beginPath(); if(g.ellipse) g.ellipse(48,25,12.5,14.5,0,0,TAU); else g.arc(48,25,13.5,0,TAU);
    g.fillStyle='rgba(233,242,230,.2)'; g.fill(); g.strokeStyle='rgba(236,220,170,.75)'; g.lineWidth=1.1; g.stroke();
    g.fillStyle='#eef7ea'; g.textAlign='center'; g.textBaseline='middle'; g.font='700 19px Georgia,serif'; g.fillText('$',48,26.5);
    g.font='700 8px Georgia,serif'; g.textAlign='left'; g.fillText('100',11,14); g.textAlign='right'; g.fillText('100',85,37);
    PROC=c; return c;
  }
  function billSource(img){
    if(img && img.complete && img.naturalWidth>0) return { src:img, nw:img.naturalWidth, nh:img.naturalHeight };
    var p=procBill(); return { src:p, nw:p.width, nh:p.height };
  }

  /* 찢긴 사각형 — 잘린 쪽(안쪽 변)만 들쭉날쭉, 원래 지폐 가장자리는 곧게 */
  function tornPts(w,h,L,R,T,B){
    var J=.55, st=2.1, pts=[[0,0]], n, i;
    if(T){ n=Math.max(2,Math.round(w/st)); for(i=1;i<n;i++) pts.push([w*i/n, rand(-J,J)]); }
    pts.push([w,0]);
    if(R){ n=Math.max(2,Math.round(h/st)); for(i=1;i<n;i++) pts.push([w+rand(-J,J), h*i/n]); }
    pts.push([w,h]);
    if(B){ n=Math.max(2,Math.round(w/st)); for(i=n-1;i>0;i--) pts.push([w*i/n, h+rand(-J,J)]); }
    pts.push([0,h]);
    if(L){ n=Math.max(2,Math.round(h/st)); for(i=n-1;i>0;i--) pts.push([rand(-J,J), h*i/n]); }
    return pts;
  }
  function trace(g,pts){ g.beginPath(); g.moveTo(pts[0][0],pts[0][1]); for(var i=1;i<pts.length;i++) g.lineTo(pts[i][0],pts[i][1]); g.closePath(); }

  /* 지폐를 5 × 2 조각으로 — 조각마다 그림 한 장 + 같은 모양의 그늘 한 장 */
  function cutPieces(s, dpr, src){
    var cols=5, rows=2, W=s.bw, H=s.bh, xs=[0], ys=[0], out=[], i, j;
    for(i=1;i<cols;i++) xs.push(W*i/cols+rand(-W*.045,W*.045)); xs.push(W);
    for(j=1;j<rows;j++) ys.push(H*j/rows+rand(-H*.1,H*.1)); ys.push(H);
    for(j=0;j<rows;j++) for(i=0;i<cols;i++){
      var x0=xs[i], x1=xs[i+1], y0=ys[j], y1=ys[j+1], pw=x1-x0, ph=y1-y0, pad=1.5, cw=pw+pad*2, chh=ph+pad*2;
      var pts=tornPts(pw,ph,i>0,i<cols-1,j>0,j<rows-1);
      var cv=mk(cw*dpr,chh*dpr), g=cv.getContext('2d'), dk=mk(cw*dpr,chh*dpr), gd=dk.getContext('2d');
      g.scale(dpr,dpr); g.translate(pad,pad);
      trace(g,pts); g.save(); g.clip();
      try{ g.drawImage(src.src, x0/W*src.nw, y0/H*src.nh, pw/W*src.nw, ph/H*src.nh, 0, 0, pw, ph); }catch(e){ g.fillStyle='#23603f'; g.fillRect(0,0,pw,ph); }
      g.restore();
      trace(g,pts); g.lineWidth=.45; g.strokeStyle='rgba(255,247,228,.5)'; g.stroke();
      gd.scale(dpr,dpr); gd.translate(pad,pad); trace(gd,pts); gd.fillStyle='#000'; gd.fill();
      out.push({ cv:cv, dk:dk, w:cw, h:chh, lx:(x0+x1)/2-W/2, ly:(y0+y1)/2-H/2 });
    }
    return out;
  }
  function rrect(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.lineTo(x+w-r,y); g.quadraticCurveTo(x+w,y,x+w,y+r); g.lineTo(x+w,y+h-r); g.quadraticCurveTo(x+w,y+h,x+w-r,y+h); g.lineTo(x+r,y+h); g.quadraticCurveTo(x,y+h,x,y+h-r); g.lineTo(x,y+r); g.quadraticCurveTo(x,y,x+r,y); g.closePath(); }
  /* 돈비용 작은 지폐 한 장 */
  function miniSprite(src,w,h,dpr){
    var pad=1, cw=w+pad*2, chh=h+pad*2, c=mk(cw*dpr,chh*dpr), g=c.getContext('2d'), dk=mk(cw*dpr,chh*dpr), gd=dk.getContext('2d');
    g.scale(dpr,dpr); g.translate(pad,pad);
    rrect(g,0,0,w,h,1.3); g.save(); g.clip();
    try{ g.drawImage(src.src,0,0,src.nw,src.nh,0,0,w,h); }catch(e){ g.fillStyle='#23603f'; g.fillRect(0,0,w,h); }
    g.restore(); rrect(g,0,0,w,h,1.3); g.lineWidth=.5; g.strokeStyle='rgba(255,248,230,.35)'; g.stroke();
    gd.scale(dpr,dpr); gd.translate(pad,pad); rrect(gd,0,0,w,h,1.3); gd.fillStyle='#000'; gd.fill();
    return { cv:c, dk:dk, w:cw, h:chh };
  }

  function radial(g,x,y,r,a){
    if(r<=.5 || a<=.004) return;
    var gr=g.createRadialGradient(x,y,0,x,y,r);
    gr.addColorStop(0,'rgba(255,250,238,'+a.toFixed(3)+')');
    gr.addColorStop(.2,'rgba(255,230,172,'+(a*.62).toFixed(3)+')');
    gr.addColorStop(.5,'rgba(255,200,120,'+(a*.18).toFixed(3)+')');
    gr.addColorStop(1,'rgba(255,190,100,0)');
    g.fillStyle=gr; g.fillRect(x-r,y-r,r*2,r*2);
  }
  function halo(g,x,y,r,a,green){
    if(r<=.5 || a<=.004) return;
    var gr=g.createRadialGradient(x,y,r*.12,x,y,r);
    gr.addColorStop(0,'rgba(255,214,140,'+a.toFixed(3)+')');
    gr.addColorStop(.5,'rgba('+(green?'150,226,180':'255,200,120')+','+(a*.35).toFixed(3)+')');
    gr.addColorStop(1,'rgba(255,190,110,0)');
    g.fillStyle=gr; g.fillRect(x-r,y-r,r*2,r*2);
  }

  /* 숫자 — 0.00 에서 빠르게 올라가 멈출 때 살짝 고동 · 머물다 스르륵 (글꼴 · 13px · 소수점만 크게 그대로) */
  function popNumber(x,y,v,big){
    var el=document.createElement('div'); el.className='mkt-pop';
    el.innerHTML='<span class="mp-in"></span>';
    var inn=el.firstChild;
    function txt(n){ return '▲ +'+n.toFixed(2).replace('.','<span class="dp">.</span>')+'%'; }
    inn.innerHTML=txt(0);
    el.style.left=x+'px'; el.style.top=y+'px';
    layer.appendChild(el);
    /* 터지는 빛 한가운데에 묻히지 않게 먼저 위로 쑥 올라선 뒤, 천천히 떠오르며 머물다 사라진다 */
    el.animate([
      {transform:'translate(-50%,calc(-50% - 4px)) scale(.82)', opacity:0, easing:'cubic-bezier(.16,.84,.3,1)'},
      {transform:'translate(-50%,calc(-50% - 40px)) scale(1.04)', opacity:1, offset:.09, easing:'cubic-bezier(.3,.6,.4,1)'},
      {transform:'translate(-50%,calc(-50% - 46px)) scale(1)', opacity:1, offset:.18},
      {transform:'translate(-50%,calc(-50% - 58px)) scale(1)', opacity:1, offset:.62, easing:'ease-in-out'},
      {transform:'translate(-50%,calc(-50% - 66px)) scale(1)', opacity:.8, offset:.8, easing:'cubic-bezier(.4,0,.7,1)'},
      {transform:'translate(-50%,calc(-50% - 80px)) scale(1)', opacity:0}
    ],{duration:3300}).onfinish=function(){ el.remove(); };
    var t0=performance.now(), D=620+big*300, last='';
    function step(now){
      var k=Math.max(0,Math.min(1,(now-t0)/D)), e=k>=1?1:1-Math.pow(2,-10*k), n=v*e, s=n.toFixed(2);   /* 첫 rAF 시각이 만든 시각보다 앞설 수 있다 — "-0.00" 이 되지 않게 */
      if(s!==last){ last=s; inn.innerHTML=txt(n); }
      if(k<1) requestAnimationFrame(step);
      else if(inn.animate) inn.animate([{transform:'scale(1)'},{transform:'scale(1.13)',offset:.32},{transform:'scale(1)'}],{duration:360,easing:'cubic-bezier(.3,.7,.4,1)'});
    }
    requestAnimationFrame(step);
  }

  var active=[];
  function burst(s, vForce){
    var v=(typeof vForce==='number' && isFinite(vForce)) ? vForce : 0.01+32.13*Math.pow(Math.random(),2.7);   /* 낮은 수치일수록 자주: +0.01% ~ +32.14% */
    v=Math.max(0.01,Math.min(32.14,v));
    var big=v/32.14;
    STAT.bursts++; STAT.last={ v:+v.toFixed(2), x:Math.round(s.x), y:Math.round(s.y) };
    popNumber(s.x,s.y,v,big);

    var dpr=Math.min(LOW?1.5:2, window.devicePixelRatio||1);
    var CW=Math.round(460+300*big), CH=Math.round(600+300*big), ox=CW/2, oy=Math.round(CH*.42);
    var cv=document.createElement('canvas'); cv.className='fm-burst'; cv.setAttribute('aria-hidden','true');
    cv.width=Math.round(CW*dpr); cv.height=Math.round(CH*dpr);
    cv.style.left=(s.x-ox).toFixed(1)+'px'; cv.style.top=(s.y-oy).toFixed(1)+'px'; cv.style.width=CW+'px'; cv.style.height=CH+'px';
    var g=null; try{ g=cv.getContext('2d'); }catch(e){}
    if(!g) return;
    layer.appendChild(cv);

    var S=sprites(), src=billSource(s.img), F=featherSprite(dpr), lite=LOW, k, n;
    var ca=Math.cos(s.ang), sa=Math.sin(s.ang);

    /* ① 지폐 조각 — 처음엔 지폐 자리 그대로 맞물려 있다가 가운데서 바깥으로 흩어진다 */
    var pieces=cutPieces(s,dpr,src).map(function(q){
      var rx=q.lx*ca-q.ly*sa, ry=q.lx*sa+q.ly*ca, d=Math.sqrt(rx*rx+ry*ry)||1, sp=rand(55,140)*(.85+big*.6);
      return { cv:q.cv, dk:q.dk, w:q.w, h:q.h, x:ox+rx, y:oy+ry,
               vx:rx/d*sp+rand(-28,28), vy:ry/d*sp*.8-rand(70,135)*(.8+big*.45),
               rot:s.ang, spin:rand(-6.5,6.5), fl:rand(-.25,.25), fr:rand(5,10)*(Math.random()<.5?-1:1),
               k0:1.3, k1:3.5, sa:rand(150,300), sf:rand(4,7.5), sp:rand(0,TAU), life:rand(1.9,2.6)+big*.5, d:0 };
    });
    /* ② 깃털 — 양옆으로 떨어져 나가 낙엽처럼 흔들리며 내려간다 */
    var feathers=s.wings.map(function(w){
      return { side:w.side, x:ox+(w.x-s.x), y:oy+(w.y-s.y), vx:w.side*rand(75,125)*(.9+big*.35), vy:-rand(55,105)*(.9+big*.3),
               rot:w.a, spin:w.side*rand(1.4,2.8), A:rand(11,19), om:rand(3.1,4.1), ph:rand(0,TAU), B:rand(.32,.52), life:rand(2.6,3.2)+big*.3 };
    });
    /* ③ 금빛 먼지 — 꼬리를 끌며 퍼졌다가 멈칫, 반짝이며 사라짐 + 오래 남는 고운 먼지 */
    var sparks=[], COLS=['gold','gold','cream','cream','white','green'];
    n=Math.round((26+50*big)*(lite?.6:1));
    for(k=0;k<n;k++){
      var an=rand(0,TAU), sp2=(70+280*Math.pow(Math.random(),.8))*(.75+.55*big);
      sparks.push({ x:ox, y:oy, vx:Math.cos(an)*sp2, vy:Math.sin(an)*sp2*.9-rand(10,55), k:rand(2.2,3.4), gr:rand(120,210),
                    life:rand(.65,1.35)+big*.45, sz:rand(1.3,2.5)*(.9+big*.35), c:COLS[(Math.random()*COLS.length)|0], tw:rand(0,TAU), d:Math.random()<.25?rand(0,.06):0, m:0 });
    }
    n=Math.round((6+12*big)*(lite?.6:1));
    for(k=0;k<n;k++){
      var an2=rand(0,TAU), sp3=rand(15,70);
      sparks.push({ x:ox+rand(-6,6), y:oy+rand(-4,4), vx:Math.cos(an2)*sp3, vy:Math.sin(an2)*sp3-rand(5,25), k:1.2, gr:24,
                    life:rand(1.5,2.4), sz:rand(.9,1.6), c:Math.random()<.7?'cream':'gold', tw:rand(0,TAU), d:rand(.08,.3), m:1 });
    }
    /* ④ 네 갈래 반짝임 */
    var glints=[]; n=Math.max(1,3+Math.round(7*big)-(lite?2:0));
    for(k=0;k<n;k++){ var r0=rand(8,40+50*big), a0=rand(0,TAU); glints.push({ x:ox+Math.cos(a0)*r0, y:oy+Math.sin(a0)*r0*.85, d:rand(.03,.5), life:rand(.36,.62), sz:rand(10,18)*(.9+.5*big), rot:rand(0,1.57), spin:rand(-1.2,1.2) }); }
    /* ⑤ 돈비 (+5% 이상) — 작은 지폐가 분수처럼 솟았다가 하늘하늘 */
    var minis=[]; n=v<5?0:Math.min(6,Math.round(big*6.5));
    if(n){
      var MS=miniSprite(src,s.bw*.68,s.bh*.68,dpr);
      for(k=0;k<n;k++){ var am=-Math.PI/2+(k%2?1:-1)*rand(.35,1.15), spm=rand(170,290)*(.85+.3*big);   /* 좌우로 갈라 솟는다 — 숫자 바로 위로는 덜 지나가게 */
        minis.push({ cv:MS.cv, dk:MS.dk, w:MS.w, h:MS.h, sc:rand(.78,1), x:ox+rand(-4,4), y:oy+rand(-3,3), vx:Math.cos(am)*spm, vy:Math.sin(am)*spm,
                     rot:rand(-.6,.6), spin:rand(-4,4), fl:rand(0,3.14), fr:rand(3.5,6.5)*(Math.random()<.5?-1:1),
                     k0:1.1, k1:2.8, sa:rand(110,220), sf:rand(2.5,4), sp:rand(0,TAU), d:rand(.02,.14), life:rand(2.5,3.1), mini:1 }); }
    }
    /* ⑥ +20% 이상 — 둘레에서 작은 폭죽이 한 번 더 */
    var crackles=[]; n=v<20?0:Math.max(1,Math.round((big-.55)*10));
    for(k=0;k<n;k++){ var ac=rand(0,TAU), rc=rand(40,95)*(.8+big*.4); crackles.push({ x:ox+Math.cos(ac)*rc, y:oy+Math.sin(ac)*rc*.8-rand(10,40), d:rand(.22,.62), done:false }); }
    /* ⑦ 빛 · 고리 — 고리는 늘 하나(+15% 부터는 그 고리가 금색으로 커짐), +25% 초록 고리 하나 더 */
    var flashes=[{ x:ox, y:oy, t0:0, r:44+60*big, dur:.46, a:.95 }], HR=110+90*big, sc0=.7+big*1.6;
    var rings=[ v>=15 ? { r0:8, r1:Math.max(36*sc0,52+52*big), dur:.66, w0:1.4, w1:.3, c:'238,220,170', a0:.7, d:0 }
                      : { r0:6, r1:52+52*big, dur:.55, w0:1.6, w1:.35, c:'255,232,182', a0:.62, d:0 } ];
    if(v>=25) rings.push({ r0:10, r1:46*sc0, dur:.86, w0:1.2, w1:.3, c:'120,235,175', a0:.55, d:.11 });

    var B={ dead:false, raf:0 }, t=0, last=0, fc=0, slow=0;
    active.push(B);
    STAT.last.n={ pieces:pieces.length, feathers:feathers.length, sparks:sparks.length, glints:glints.length, minis:minis.length, crackles:crackles.length, rings:rings.length, img:!!(s.img), w:CW, h:CH, dpr:dpr };

    function paper(p, dt){
      var pt=t-p.d; if(pt<0) return true; if(pt>p.life) return false;
      var c=Math.cos(p.fl), ac=c<0?-c:c, kk=p.k0+(p.k1-p.k0)*ac, ex=Math.exp(-kk*dt);   /* 납작할수록 공기 저항이 크다 */
      p.vx=p.vx*ex+Math.sin(pt*p.sf+p.sp)*p.sa*dt;
      p.vy=p.vy*ex+300*dt;
      p.x+=p.vx*dt; p.y+=p.vy*dt;
      p.rot+=p.spin*dt; p.spin*=Math.exp(-.8*dt);
      p.fl+=p.fr*dt*(1.35-.7*ac);                                                        /* 옆으로 설 때는 휙, 납작할 때는 천천히 */
      var a=pt<p.life*.66?1:1-smooth((pt-p.life*.66)/(p.life*.34));
      if(p.mini && pt<.08) a*=pt/.08;
      if(a<=.01) return true;
      var cs=Math.cos(p.rot), sn=Math.sin(p.rot), sc=p.sc||1, sy=c;
      g.setTransform(dpr*cs*sc, dpr*sn*sc, -dpr*sn*sc*sy, dpr*cs*sc*sy, dpr*p.x, dpr*p.y);
      g.globalAlpha=a; g.drawImage(p.cv,-p.w/2,-p.h/2,p.w,p.h);
      var sh=(1-ac)*.34+(c<0?.16:0);                                                     /* 옆으로 설수록 · 뒷면일수록 어둡게 */
      if(sh>.03){ g.globalAlpha=a*sh; g.drawImage(p.dk,-p.w/2,-p.h/2,p.w,p.h); }
      return true;
    }
    function feather(f, dt){
      if(t>f.life) return false;
      var ex=Math.exp(-3*dt);
      f.vx*=ex; f.vy=f.vy*ex+110*dt;
      f.x+=f.vx*dt; f.y+=f.vy*dt;
      f.spin+=(-f.rot*6-f.spin*2.6)*dt; f.rot+=f.spin*dt;                                 /* 처음 돌던 힘이 잦아들며 수평으로 */
      var ramp=smooth(t/.75), th=f.om*t+f.ph, sw=Math.sin(th);
      var X=f.x+f.A*ramp*sw, Y=f.y-.38*f.A*ramp*sw*sw, R=f.rot+f.B*ramp*Math.cos(th);       /* 낙엽 궤적: 양끝에서 살짝 떠오름 */
      var a=t<f.life*.5?1:1-smooth((t-f.life*.5)/(f.life*.5));
      if(a<=.01) return true;
      var cs=Math.cos(R), sn=Math.sin(R), mx=f.side>0?-1:1;
      g.setTransform(dpr*cs*mx, dpr*sn*mx, -dpr*sn, dpr*cs, dpr*X, dpr*Y);
      g.globalAlpha=a; g.drawImage(F.cv,-F.cx,-F.cy,F.w,F.h);
      return true;
    }

    function frame(now){
      if(B.dead) return;
      var t0p=performance.now();
      var dt=last?Math.max(0,Math.min(.034,(now-last)/1000)):0; if(now>last) last=now; t+=dt; fc++;   /* 첫 rAF 시각이 누른 시각보다 앞설 수 있다 — 거꾸로 가지 않게 */
      if(fc>3 && fc<=15){ if(dt>.028) slow++; if(fc===15 && slow>=7) lite=true; }   /* 버벅이는 화면이면 가볍게 */
      var alive=false, i;
      g.setTransform(1,0,0,1,0,0); g.globalAlpha=1; g.globalCompositeOperation='source-over';
      g.clearRect(0,0,cv.width,cv.height);

      /* 빛 — 번짐 · 잔광 · 고리 */
      g.globalCompositeOperation='lighter'; g.setTransform(dpr,0,0,dpr,0,0);
      for(i=0;i<flashes.length;i++){ var f=flashes[i], ft=t-f.t0; if(ft>f.dur) continue; alive=true; var q=ft/f.dur; radial(g,f.x,f.y,f.r*(.22+.78*(1-Math.pow(1-q,3))),f.a*Math.pow(1-q,1.6)); }
      if(t<.95){ alive=true; if(!lite){ var qh=t/.95; halo(g,ox,oy,30+(HR-30)*(1-(1-qh)*(1-qh)),.2*(1-qh)*(1-qh),big>.45); } }
      g.lineCap='round';
      for(i=0;i<rings.length;i++){ var rg=rings[i], rt=t-rg.d; if(rt<0){ alive=true; continue; } if(rt>rg.dur) continue; alive=true;
        var q2=rt/rg.dur, e2=1-Math.pow(1-q2,4); g.globalAlpha=1;
        g.beginPath(); g.arc(ox,oy,rg.r0+(rg.r1-rg.r0)*e2,0,TAU); g.lineWidth=rg.w0+(rg.w1-rg.w0)*q2;
        g.strokeStyle='rgba('+rg.c+','+(rg.a0*(1-q2)*(1-q2*.4)).toFixed(3)+')'; g.stroke(); }

      /* 종이 — 깃털 · 돈비 · 지폐 조각 */
      g.globalCompositeOperation='source-over';
      for(i=0;i<feathers.length;i++) if(feather(feathers[i],dt)) alive=true;
      for(i=0;i<minis.length;i++) if(paper(minis[i],dt)) alive=true;
      for(i=0;i<pieces.length;i++) if(paper(pieces[i],dt)) alive=true;

      /* 반짝임 — 작은 폭죽 · 금빛 먼지 · 네 갈래 별 */
      for(i=0;i<crackles.length;i++){ var cr=crackles[i]; if(cr.done) continue; alive=true;
        if(t>=cr.d){ cr.done=true; flashes.push({ x:cr.x, y:cr.y, t0:t, r:16+12*big, dur:.26, a:.8 });
          for(var m2=0;m2<8;m2++){ var ak=rand(0,TAU), sk=rand(60,150); sparks.push({ x:cr.x, y:cr.y, vx:Math.cos(ak)*sk, vy:Math.sin(ak)*sk, k:3.6, gr:140, life:rand(.35,.6), sz:rand(1,1.7), c:Math.random()<.5?'white':'gold', tw:rand(0,TAU), d:t, m:0 }); } } }
      g.globalCompositeOperation='lighter'; g.setTransform(dpr,0,0,dpr,0,0); g.lineCap='round';
      for(i=0;i<sparks.length;i++){
        var p=sparks[i], qt=t-p.d; if(qt<0){ alive=true; continue; } if(qt>p.life) continue; alive=true;
        var ex=Math.exp(-p.k*dt); p.vx*=ex; p.vy=p.vy*ex+p.gr*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
        var lf=qt/p.life, a=lf<.25?1:1-smooth((lf-.25)/.75);
        if(lf>.35){ var tw=Math.sin(qt*(p.m?9:21)+p.tw); a*=.55+.45*tw*tw; }
        var sz=p.sz*(1-.55*lf);
        if(!lite && !p.m){ var spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy); if(spd>45){ var L=Math.min(24,spd*.03);
          g.globalAlpha=1; g.strokeStyle='rgba('+RGB[p.c]+','+(a*.5).toFixed(3)+')'; g.lineWidth=sz*.8;
          g.beginPath(); g.moveTo(p.x-p.vx/spd*L,p.y-p.vy/spd*L); g.lineTo(p.x,p.y); g.stroke(); } }
        var D=sz*5.4; g.globalAlpha=a; g.drawImage(S[p.c],p.x-D/2,p.y-D/2,D,D);
      }
      for(i=0;i<glints.length;i++){ var gl=glints[i], gt=t-gl.d; if(gt<0){ alive=true; continue; } if(gt>gl.life) continue; alive=true;
        var s1=Math.sin(Math.PI*gt/gl.life), D2=gl.sz*(.35+.65*s1), r2=gl.rot+gl.spin*gt, cs2=Math.cos(r2), sn2=Math.sin(r2);
        g.setTransform(dpr*cs2,dpr*sn2,-dpr*sn2,dpr*cs2,dpr*gl.x,dpr*gl.y); g.globalAlpha=s1*.95; g.drawImage(S.star,-D2/2,-D2/2,D2,D2); }

      var ms=performance.now()-t0p; STAT.frames++; STAT.sumMs+=ms; if(ms>STAT.maxMs) STAT.maxMs=ms;
      if(alive && t<4.5) B.raf=requestAnimationFrame(frame); else end();
    }
    function end(){ if(B.dead) return; B.dead=true; if(B.raf) cancelAnimationFrame(B.raf); if(cv.parentNode) cv.parentNode.removeChild(cv); var i=active.indexOf(B); if(i>=0) active.splice(i,1); if(lite) STAT.lite=true; }
    B.end=end;
    frame(performance.now());   /* 첫 장은 바로 — 지폐가 사라진 자리에 빈 틈 없이 조각이 놓인다 */
  }

  document.addEventListener('visibilitychange',function(){
    paused=document.hidden;
    if(paused){ for(var i=active.length-1;i>=0;i--){ try{ active[i].end(); }catch(e){} } }
    else if(!current) schedule();
  });
  setTimeout(spawn, 3000);
  /* 첫 터짐이 가볍게 — 빛 점 · 반짝임 · 깃털 그림은 한가할 때 미리 그려 둔다 */
  (window.requestIdleCallback ? function(f){ window.requestIdleCallback(f,{timeout:5000}); } : function(f){ setTimeout(f,2500); })(function(){
    try{ sprites(); featherSprite(Math.min(LOW?1.5:2, window.devicePixelRatio||1)); }catch(e){}
  });

  /* 시험 · 미리 보기용 — 콘솔에서 __nnBill.burst() 하면 화면 가운데서 터진다 */
  function loadedPre(){ for(var i=0;i<PRE.length;i++){ if(PRE[i].complete && PRE[i].naturalWidth>0) return PRE[i]; } return null; }
  window.__nnBill={
    burst:function(x,y,v){
      var im=loadedPre(), bw=41, bh=im?Math.round(41*im.naturalHeight/im.naturalWidth):17;
      var s={ x:(x==null?innerWidth/2:x), y:(y==null?innerHeight/2:y), ang:0, img:im, bw:im?bw:24, bh:im?bh:12.4, wings:[] };
      s.wings=[{ x:s.x-(s.bw/2+5), y:s.y-1, side:-1, a:0 }, { x:s.x+(s.bw/2+5), y:s.y-1, side:1, a:0 }];
      burst(s,v); return STAT.last;
    },
    spawn:function(){ if(current) return false; clearTimeout(timer); spawn(); return !!current; },
    stat:STAT
  };
})();
