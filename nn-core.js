/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — nn-core.js
   핵심 앱 — 페이지 전환 · 노트 엔진 · 매크로 · 관심종목

   ⚠ 이 파일은 index.html 에서 정해진 순서로 불러옵니다.
     순서를 바꾸거나 async/defer 를 붙이면 '함수를 찾을 수 없음' 오류가 납니다.
     로딩 순서: nn-core.js → nn-assets.js → nn-modules.js
   ══════════════════════════════════════════════════════════════════════ */


(function(){
"use strict";

/* ══ PAGE SWITCH ══ */
window.switchPage = function(name) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); p.classList.remove('pg-in'); });
  document.querySelectorAll('.nbtn').forEach(function(b){ b.classList.remove('active'); });
  var pg = document.getElementById('page-'+name);
  if(pg){
    pg.classList.add('active');
    /* 크로스페이드 등장 */
    void pg.offsetWidth;
    pg.classList.add('pg-in');
  }
  var nb = document.getElementById('nav-'+name);
  if(nb) nb.classList.add('active');
  window.scrollTo(0,0);
  if(name === 'conviction' && window.__nnConvRender){
    setTimeout(function(){ try{ window.__nnConvRender(); }catch(e){} }, 40);
  }
  /* 사용자가 만든 탭 — 지식 노트 엔진을 그대로 사용 */
  if(/^ct_/.test(name) && window.KnowledgeNotes){
    setTimeout(function(){
      try{
        var k=window.KnowledgeNotes;
        if(!k.data[name]) k.data[name]=[];
        if(k.groups && !k.groups[name]) k.groups[name]=[];
        k.renderSidebar(name);
        if(k.activeIds && k.activeIds[name]) k.renderEditor(name);
      }catch(e){}
    }, 60);
  }
  if(name==='macro'){ macroFetch(); setTimeout(function(){ if(typeof initTVMacroWidgets==='function') initTVMacroWidgets(); }, 120); }
  if(name==='portfolio'){ setTimeout(function(){ if(typeof initHoldings==='function') initHoldings(); }, 120); }
  if(name==='assets'){ setTimeout(function(){ if(window.AssetsApp) AssetsApp.init(); }, 60); }
  if(name==='research'){ setTimeout(function(){ if(typeof initTVScreener==='function') tvLazy('#tvScreener', initTVScreener); if(window.__fxFill) __fxFill(); }, 120); }
  if(name==='lexicon'){ window.KnowledgeNotes.renderSidebar('lexicon'); }
  if(name==='thesis'){ setTimeout(function(){ if(window.ThesisApp) ThesisApp.render(); }, 40); }
  if(name==='macro'){ setTimeout(function(){ if(typeof rebuildHomeTickers==='function') rebuildHomeTickers(); }, 140); }
  if(window.__bgScrollUpdate){ window.__bgScrollUpdate(); setTimeout(window.__bgScrollUpdate, 260); }
};

/* ── 🔒 데이터 내보내기/가져오기 PIN 잠금 (최초 1회 PIN 설정 → 이후 입력 요구) ── */
window.dbLock = function(action){
  var run=function(){
    if(!window.KnowledgeNotes){ alert('데이터 모듈을 불러오지 못했습니다.'); return; }
    if(action==='export') KnowledgeNotes.exportData(); else KnowledgeNotes.importData();
  };
  var label = (action==='export' ? '내보내기' : '가져오기');
  var stored = localStorage.getItem('nn_db_pin');
  if(!stored){
    var np = prompt('🔒 데이터 보호 PIN을 설정하세요 (최초 1회 · 숫자나 문자).\n이후 내보내기/가져오기 시 이 PIN을 입력해야 합니다:');
    if(np===null || !np.trim()) return;
    localStorage.setItem('nn_db_pin', np.trim());
    alert('✅ 보호 PIN이 설정되었습니다. 잠금이 적용됩니다.');
    run(); return;
  }
  var pin = prompt('🔒 데이터 '+label+' — PIN을 입력하세요:');
  if(pin===null) return;
  if(pin.trim() !== stored){ alert('❌ PIN이 올바르지 않습니다.'); return; }
  run();
};
/* PIN 변경: 콘솔에서 localStorage.removeItem('nn_db_pin') 후 재설정 */

/* ══ LETTER FLY-IN ANIMATION ══ */
var letterColors=['#f0ede6','#f0ede6','#eeead8','#ecddc0','#e8cf9e','#e0c082','#d8b468','#cfac58','#c9a96e'];
var origins=[
  [-0.80,-0.50,-24, 3.0,   0, 38,-46,-620],
  [-0.40,-0.85, 20, 2.7,  76,-44, 30,-560],
  [ 0.10,-1.00,-14, 3.2, 152, 30, 50,-680],
  [ 0.85,-0.60, 28, 2.8, 240,-36,-40,-600],
  [ 1.05,-0.10,-20, 3.0, 312, 42, 44,-640],
  [ 0.92, 0.55, 16, 2.7, 392,-30,-48,-560],
  [ 0.30, 1.00,-28, 3.1, 468, 46, 34,-660],
  [-0.70, 0.82, 22, 2.6, 536,-40, 38,-540],
  [-1.00, 0.18,-14, 2.9, 604, 34,-50,-620]
];
var seq=[{id:'l-books',delay:0,n:'01',dir:'right'},{id:'l-econ',delay:700,n:'02',dir:'left'},{id:'l-media',delay:1250,n:'03',dir:'right'},{id:'l-portfolio',delay:1800,n:'04',dir:'left'},{id:'l-macro',delay:2350,n:'05',dir:'right'}];
var animDone = false;

function $id(id){ return document.getElementById(id); }
function cls(id,c){ var e=$id(id); if(e) e.classList.add(c); }
function introSkipRequested(){
  try{
    if(sessionStorage.getItem('nn_skip_intro')==='1'){ sessionStorage.removeItem('nn_skip_intro'); return true; }
  }catch(e){}
  return false;
}
/* 자동 로그인 새로고침 등: 애니메이션 없이 최종 상태로 즉시 안착 */
function finishIntroInstant(){
  animDone=true;
  ['stack','econSwoosh','introBlack','layerCount'].forEach(function(id){
    var e=$id(id); if(e) e.style.display='none';
  });
  var finalEl=$id('final'); if(finalEl) finalEl.style.display='flex';
  for(var j=0;j<9;j++){
    var nl=$id('nl'+j); if(!nl) continue;
    nl.style.transition='none';
    nl.style.transform='translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)';
    nl.style.opacity='1';
    nl.style.filter='';
    nl.classList.add('swept'); nl.classList.add('glowing');
  }
  ['fnSub','volBadge','nnDeco','fnCtas','homeTickers','scrollHint'].forEach(function(id){ cls(id,'show'); });
  var lw=document.querySelector('.logo-wrap'); if(lw) lw.classList.add('intro-shown');
  if(window.__bqIntro){ window.__bqIntro(); } else { window.__bqIntroPending=true; }
  /* 다음 프레임에 transition 복구 (이후 상호작용 애니메이션은 정상 동작) */
  requestAnimationFrame(function(){
    setTimeout(function(){
      for(var j2=0;j2<9;j2++){ var n2=$id('nl'+j2); if(n2) n2.style.transition=''; }
      try{ document.documentElement.classList.remove('nn-nointro'); }catch(e){}
    }, 60);
  });
}
function runAnim(){
  if(animDone){
    var lwSkip=document.querySelector('.logo-wrap'); if(lwSkip) lwSkip.classList.add('intro-shown');
    return;
  }
  if(introSkipRequested()){ finishIntroInstant(); return; }
  var iW=window.innerWidth, iH=window.innerHeight;
  for(var j=0;j<9;j++){
    var nl=$id('nl'+j); if(!nl) continue;
    nl.style.transition='none'; nl.style.opacity='0';
    var ox=origins[j][0]*iW, oy=origins[j][1]*iH;
    var o=origins[j];
    nl.style.transform='translate3d('+ox+'px,'+oy+'px,'+o[7]+'px) rotateX('+o[5]+'deg) rotateY('+o[6]+'deg) rotateZ('+o[2]+'deg) scale('+o[3]+')';
    nl.style.filter='blur(8px) drop-shadow(0 0 28px rgba(232,238,246,.42))';
  }

  var stackEl=$id('stack'); if(stackEl) stackEl.style.display='none';
  var swoosh=$id('econSwoosh'); if(swoosh) swoosh.style.display='none';
  var black=$id('introBlack'); if(black) black.style.display='none';
  var lc=$id('layerCount'); if(lc) lc.style.display='none';

  var finalEl=$id('final');
  if(finalEl) finalEl.style.display='flex';
 




  for(var k=0;k<9;k++){
    (function(idx){
      setTimeout(function(){
        var nl=$id('nl'+idx); if(!nl) return;
        nl.style.transition='transform 1.15s cubic-bezier(.19,1,.22,1),opacity .5s ease,filter .7s ease';
        nl.style.transform='translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)';
        nl.style.opacity='1';
        nl.style.filter='blur(0) drop-shadow(0 0 28px rgba(232,238,246,.42))';
        setTimeout(function(){ nl.classList.add('swept'); }, 620);
        setTimeout(function(){
          nl.style.filter='';
          nl.classList.add('glowing');
        }, 1150);
      },120+origins[idx][4]);
    })(k);
  }

  // ── ✨ [완벽하게 교정된 초고속 스피드업 점등 타이머 엔진] ──
  setTimeout(function(){

    // 💡 1) 핵심 UI 요소들(로고, 탭, 시계선, 부제목)이 글자 정착과 동시에 150ms 만에 팟! 하고 동시 점등됩니다.
    setTimeout(function(){ 
      cls('fnSub','show');      
      cls('volBadge','show');    
      cls('nnDeco','show');     
      if(window.__bqIntro){ window.__bqIntro(); } else { window.__bqIntroPending = true; } /* 모듈 로드 전이면 예약 */
      cls('fnCtas','show');     
      var lw = document.querySelector('.logo-wrap'); if(lw) lw.classList.add('intro-shown'); 
    }, 150);

    // 💡 2) 하단 마퀴 2줄은 시선이 자연스럽게 흐르도록 700ms 뒤에 신속하게 연동되어 올라옵니다.
    setTimeout(function(){ cls('homeTickers','show'); }, 700); 

    // 💡 3) 스크롤 유도 문구(SCROLL)도 950ms 뒤에 부드럽게 안착하며 인트로 상황 전체를 깔끔하게 종료합니다.
    setTimeout(function(){ cls('scrollHint','show'); }, 950); 

    animDone=true;
  }, 420); // 바깥쪽 대기 시간도 420ms로 줄여 쾌적한 반응 속도를 확보합니다.
}
/* ══ MACRO DATA ══ */
var macroLoaded=false;
var krwRate=1390;            
var finnhubKey=(function(){ try{return localStorage.getItem('nn_finnhub')||'';}catch(e){return '';} })();

function fmt(v,d){ return v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}); }
function fmtKrw(usd){
  var won=usd*krwRate;
  if(won>=100000000) return '₩'+fmt(won/100000000,2)+'억';
  if(won>=10000)     return '₩'+fmt(won/10000,1)+'만';
  return '₩'+fmt(won,0);
}
function chgHtml(c){
  if(c===null||c===undefined||isNaN(c)) return '<div class="t-chg t-neu"><span class="t-chg-badge">—</span></div>';
  var cls=c>0?'t-up':c<0?'t-dn':'t-neu';
  var arrow=c>0?'▲':c<0?'▼':'';
  return '<div class="t-chg '+cls+'"><span class="t-chg-badge">'+(arrow?arrow+' ':'')+(c>0?'+':'')+c.toFixed(2)+'%</span></div>';
}
/* 가짜 난수 제거: 변동을 만들지 않고 0 반환 (실데이터 없을 땐 종가 고정) */
function rndChg(base,spread){ return 0; }

/* 미국 증시 세션 판단 (한국시간 기준). 서머타임 단순화: 연중 EDT(UTC-4) 가정 */


function tRow(label,sub,usdVal,chg,opts){
  opts=opts||{};
  var valStr, krwStr='';
  if(opts.raw){
    valStr=opts.raw;                         
  }else{
    valStr='$'+fmt(usdVal, opts.dec!==undefined?opts.dec:2);
    if(opts.krw!==false) krwStr='<div class="t-krw">'+fmtKrw(usdVal)+'</div>';
  }
  return '<div class="ticker-row"><div class="t-left"><div>'+
    '<div class="t-label">'+label+'</div>'+
    (sub?'<div class="t-sub">'+sub+'</div>':'')+
    '</div></div><div class="t-right"><div class="t-val">'+valStr+'</div>'+
    krwStr+chgHtml(chg)+'</div></div>';
}

function rankChgHtml(rk,pr){
  if(pr===undefined||pr===null||pr===rk) return '<span class="rk-flat">—</span>';
  var diff=pr-rk;                       
  if(diff>0) return '<span class="rk-up">▲'+diff+'</span>';
  return '<span class="rk-dn">▼'+(-diff)+'</span>';
}

/* 💡 문법 오류가 일어났던 작은따옴표 영역을 깔끔하게 세척 완료 */
function stockRow(m,usdVal,chg){
  /* 기업 로고: 도메인 기반 무료 로고 서비스. 실패 시 티커 이니셜 배지로 폴백 */
  var logo = m.dom
    ? '<img class="stk-logo" src="https://www.google.com/s2/favicons?domain='+m.dom+'&sz=64" alt="" loading="lazy" '
      + 'onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\';">'
      + '<span class="stk-logo-fb" style="display:none">'+m.s.charAt(0)+'</span>'
    : '<span class="stk-logo-fb" style="display:flex">'+m.s.charAt(0)+'</span>';
  return '<div class="ticker-row stock-row"><div class="t-left">'+
    '<span class="rk-badge">'+m.rk+'</span>'+
    '<span class="stk-logo-wrap">'+logo+'</span>'+
    '<div class="stk-info"><div class="stk-head"><span class="stk-ticker">'+m.s+'</span>'+
    '<span class="stk-name">'+m.n+'</span>'+
    (m.ctry?'<span class="stk-ctry">'+m.ctry+'</span>':'')+'</div>'+
    '<div class="t-sub">시총 '+m.rk+'위 '+rankChgHtml(m.rk,m.pr)+'</div></div>'+
    '</div><div class="t-right"><div class="t-val">$'+fmt(usdVal,2)+'</div>'+
    '<div class="t-krw">'+fmtKrw(usdVal)+'</div>'+chgHtml(chg)+'</div></div>';
}

// 변동률 → 히트맵 색상 (상승=초록, 하락=빨강, 보합=회색)
function heatColor(chg){
  if(chg===null||chg===undefined||isNaN(chg)) return 'rgba(120,120,130,.35)';
  var v=Math.max(-3,Math.min(3,chg))/3; // -1~1로 정규화 (±3% 기준 최대 농도)
  if(v>0.02){ // 상승
    var a=0.2+Math.abs(v)*0.65;
    return 'rgba(38,166,91,'+a.toFixed(2)+')';
  } else if(v<-0.02){ // 하락
    var a2=0.2+Math.abs(v)*0.65;
    return 'rgba(224,72,72,'+a2.toFixed(2)+')';
  }
  return 'rgba(120,120,130,.4)'; // 보합
}

// 시총 히트맵 — squarified treemap (직사각형을 빈틈없이 채움)
function renderHeatmap(){
  var el=document.getElementById('stockHeatmap'); if(!el) return;
  var W=el.clientWidth || 600;
  var H=360; // 히트맵 높이
  el.style.height=H+'px';

  // 시총 큰 순서로 정렬된 데이터
  var items=MEGACAPS.map(function(m){
    return { m:m, value:(m.mc||100) };
  }).sort(function(a,b){ return b.value-a.value; });

  var total=items.reduce(function(s,it){ return s+it.value; },0);
  // 면적 정규화
  items.forEach(function(it){ it.area = it.value/total * (W*H); });

  // ── squarified treemap 알고리즘 ──
  var rects=[];
  var x=0,y=0,w=W,h=H;
  var idx=0;

  function worst(row, length){
    var areaSum=row.reduce(function(s,r){return s+r.area;},0);
    var maxA=Math.max.apply(null,row.map(function(r){return r.area;}));
    var minA=Math.min.apply(null,row.map(function(r){return r.area;}));
    var s2=length*length, sum2=areaSum*areaSum;
    return Math.max((s2*maxA)/sum2, sum2/(s2*minA));
  }

  function layoutRow(row, length, horizontal){
    var areaSum=row.reduce(function(s,r){return s+r.area;},0);
    var thickness = areaSum/length;
    var pos = horizontal ? y : x;
    for(var i=0;i<row.length;i++){
      var cellLen = row[i].area/thickness;
      if(horizontal){
        rects.push({m:row[i].m, x:x, y:pos, w:thickness, h:cellLen});
        pos += cellLen;
      } else {
        rects.push({m:row[i].m, x:pos, y:y, w:cellLen, h:thickness});
        pos += cellLen;
      }
    }
    if(horizontal){ x += thickness; w -= thickness; }
    else { y += thickness; h -= thickness; }
  }

  var remaining = items.slice();
  while(remaining.length>0){
    var shortest = Math.min(w,h);
    var horizontal = (w < h); // 짧은 변 기준으로 행 쌓기
    var row=[];
    row.push(remaining[0]);
    // 행에 추가할수록 worst ratio가 나빠지기 직전까지 채움
    while(remaining.length > row.length){
      var withNext = row.concat([remaining[row.length]]);
      if(worst(row, shortest) >= worst(withNext, shortest)){
        row=withNext;
      } else break;
    }
    layoutRow(row, shortest, horizontal);
    remaining = remaining.slice(row.length);
  }

  // 렌더
  var html='';
  rects.forEach(function(rc){
    var m=rc.m;
    var chg=(typeof m.lastChg==='number')?m.lastChg:null;
    var col=heatColor(chg);
    var chgTxt=(chg===null)?'–':((chg>0?'+':'')+chg.toFixed(2)+'%');
    var big = (rc.w>70 && rc.h>45);
    var mid = (rc.w>48 && rc.h>30);
    var fs = big ? 15 : (mid ? 12 : 9);
    html+='<div class="hm-tile" style="left:'+rc.x+'px;top:'+rc.y+'px;width:'+(rc.w-2)+'px;height:'+(rc.h-2)+'px;background:'+col+'" title="'+m.n+' ('+m.s+') 시총 '+m.rk+'위 '+chgTxt+'">'+
      (mid ? '<span class="hm-sym" style="font-size:'+fs+'px">'+m.s+'</span>' : '')+
      (big ? '<span class="hm-chg">'+chgTxt+'</span>' : '')+
      '</div>';
  });
  el.innerHTML=html;
}

/* ══ TradingView 위젯 (iframe 직접 생성 · lazy-load) ══ */
/* 로더 스크립트는 document.currentScript에 의존해서 동적 주입 시 null로 실패함.
   로더가 결국 만드는 iframe을 직접 구성해 그 문제를 우회한다. */
/* 컨테이너가 실제로 보이고 크기를 가졌는지 — 숨은 상태(display:none)에서 만들면
   위젯이 0x0 으로 렌더돼 새로고침 전까지 빈 화면이 된다. */
function tvVisible(el){
  if(!el) return false;
  if(el.offsetParent===null){
    try{ if(getComputedStyle(el).position!=='fixed') return false; }catch(e){ return false; }
  }
  var r=el.getBoundingClientRect();
  return r.width>2 && r.height>2;
}
/* 보일 때까지 기다렸다가 콜백 (탭이 열릴 때 자동 발동) */
function tvWhenVisible(root, fn){
  if(root.__tvWait) return;
  root.__tvWait=true;
  var n=0;
  var iv=setInterval(function(){
    if(tvVisible(root)){ clearInterval(iv); root.__tvWait=false; fn(); }
    else if(++n>1200){ clearInterval(iv); root.__tvWait=false; }   /* 10분이면 포기 */
  }, 500);
}
function tvBuildIframe(rootSel, widgetName, settings){
  var root=document.querySelector(rootSel);
  if(!root || root.__tvLoaded) return;
  var mount=root.querySelector('.tradingview-widget-container__widget');
  if(!mount) return;
  /* 숨겨진 동안에는 만들지 않는다 — 보이는 순간 자동으로 다시 시도 */
  if(!tvVisible(root)){
    tvWhenVisible(root, function(){ tvBuildIframe(rootSel, widgetName, settings); });
    return;
  }
  root.__tvLoaded=true;
  var src='https://www.tradingview-widget.com/embed-widget/'+widgetName+'/?locale=kr#'
          + encodeURIComponent(JSON.stringify(settings));
  function build(){
    var f=document.createElement('iframe');
    f.src=src;
    f.title=widgetName+' TradingView widget';
    f.setAttribute('frameborder','0');
    f.setAttribute('scrolling','no');
    f.setAttribute('allowtransparency','true');
    f.addEventListener('load',function(){ f.__ok=true; });
    mount.appendChild(f);
    /* 감시: 로드 실패하거나 0 크기로 붙은 경우 1회 재시도 */
    setTimeout(function(){
      var r=f.getBoundingClientRect();
      var broken = !f.__ok || r.height<8;
      if(broken && !root.__tvRetried){
        root.__tvRetried=true;
        try{ mount.removeChild(f); }catch(e){}
        if(tvVisible(root)) build();
        else { root.__tvLoaded=false; tvWhenVisible(root, function(){ tvBuildIframe(rootSel, widgetName, settings); }); }
      }
    }, 8000);
  }
  build();
}

/* ① 시총 히트맵 */
function initTVHeatmap(){
  tvBuildIframe('#tvHeatmapWidget','stock-heatmap',{
    dataSource:'NASDAQ100',       // 기본: 나스닥 100 (상단바에서 전환 가능)
    exchanges:[],
    grouping:'sector',
    blockSize:'market_cap_basic', // 네모 크기 = 시총
    blockColor:'change',          // 색 = 당일 등락률
    hasTopBar:true, isDataSetEnabled:true, isZoomEnabled:true,
    hasSymbolTooltip:true, isMonoSize:false,
    colorTheme:'dark', width:'100%', height:'100%'
  });
}



/* ③ 멀티에셋 마켓 오버뷰 */
function initTVMarketOverview(){
  tvBuildIframe('#tvMarketOverview','market-overview',{
    colorTheme:'dark', dateRange:'12M', showChart:true,
    isTransparent:true, showSymbolLogo:true, showFloatingTooltip:true,
    width:'100%', height:'100%',
    plotLineColorGrowing:'rgba(255,110,64,1)', plotLineColorFalling:'rgba(120,123,134,1)',
    gridLineColor:'rgba(120,123,134,0.18)', scaleFontColor:'rgba(219,219,219,1)',
    belowLineFillColorGrowing:'rgba(255,110,64,0.12)', belowLineFillColorFalling:'rgba(120,123,134,0.10)',
    belowLineFillColorGrowingBottom:'rgba(255,110,64,0)', belowLineFillColorFallingBottom:'rgba(120,123,134,0)',
    symbolActiveColor:'rgba(255,110,64,0.12)',
    tabs:[
      {title:'지수', symbols:[
        {s:'FOREXCOM:SPXUSD', d:'S&P 500'},
        {s:'FOREXCOM:NSXUSD', d:'나스닥100'},
        {s:'FOREXCOM:DJI',    d:'다우존스'},
        {s:'INDEX:NKY',       d:'닛케이225'},
        {s:'KRX:KOSPI',       d:'코스피'}
      ]},
      {title:'외환·금리', symbols:[
        {s:'TVC:DXY',       d:'달러인덱스'},
        {s:'FX_IDC:USDKRW', d:'USD/KRW'},
        {s:'FX:EURUSD',     d:'EUR/USD'},
        {s:'FX:USDJPY',     d:'USD/JPY'},
        {s:'TVC:US10Y',     d:'미국 10Y'}
      ]},
      {title:'원자재', symbols:[
        {s:'TVC:GOLD',   d:'금'},
        {s:'TVC:SILVER', d:'은'},
        {s:'TVC:USOIL',  d:'WTI 원유'},
        {s:'TVC:UKOIL',  d:'브렌트유'}
      ]},
      {title:'암호화폐', symbols:[
        {s:'BITSTAMP:BTCUSD',  d:'비트코인'},
        {s:'BITSTAMP:ETHUSD',  d:'이더리움'},
        {s:'COINBASE:SOLUSD',  d:'솔라나'}
      ]}
    ]
  });
}

/* ④ 경제 캘린더 */
function initTVEconCalendar(){
  tvBuildIframe('#tvEconCalendar','events',{
    colorTheme:'dark', isTransparent:true,
    width:'100%', height:'100%',
    importanceFilter:'0,1',                  // 중요도 중·상
    countryFilter:'us,eu,jp,kr,cn,gb'
  });
}

/* ⑤ 마켓 뉴스 (Top Stories) */
function initTVTopStories(){
  tvBuildIframe('#tvTopStories','timeline',{
    feedMode:'all_symbols',
    isTransparent:true, displayMode:'regular',
    colorTheme:'dark', width:'100%', height:'100%'
  });
}

/* ⑥ 경제 지도 (웹컴포넌트 · ES 모듈 1회 주입) */
var __tvEconMapLoaded=false;
function initTVEconMap(){
  if(__tvEconMapLoaded) return;
  if(!document.querySelector('tv-economic-map')) return;
  __tvEconMapLoaded=true;
  var s=document.createElement('script');
  s.type='module';
  s.src='https://widgets.tradingview-widget.com/w/en/tv-economic-map.js';
  document.head.appendChild(s);
}

/* 마켓 서머리 (웹컴포넌트 · ES 모듈 1회 주입) */
var __tvMktSumLoaded=false;
function initTVMarketSummary(){
  if(__tvMktSumLoaded) return;
  if(!document.querySelector('tv-market-summary')) return;
  __tvMktSumLoaded=true;
  var s=document.createElement('script');
  s.type='module';
  s.src='https://widgets.tradingview-widget.com/w/en/tv-market-summary.js';
  document.head.appendChild(s);
}

/* 스크롤되어 화면에 들어올 때 해당 위젯만 로드 (동시 로드 방지 → 안정성·성능 ↑) */
function initTVScreener(){
  tvBuildIframe('#tvScreener','screener',{
    width:'100%', height:'100%',
    defaultColumn:'overview',
    defaultScreen:'general',
    market:'america',
    showToolbar:true,
    colorTheme:'dark',
    locale:'kr',
    isTransparent:true
  });
}
function tvLazy(rootSel, initFn, opts){
  opts=opts||{};
  var el=document.querySelector(rootSel);
  if(!el) return;
  if(!('IntersectionObserver' in window)){ initFn(); return; }
  var done=false;
  function fire(){ if(done) return; done=true; try{ io.disconnect(); }catch(e){} initFn(); }
  var io=new IntersectionObserver(function(entries){
    for(var i=0;i<entries.length;i++){ if(entries[i].isIntersecting){ fire(); break; } }
  }, { root:null, rootMargin:'400px 0px', threshold:0.01 });
  io.observe(el);
  /* 안전장치: 옵저버가 발동 안 해도 일정 시간 후 로드.
     단 화면에 보일 때만 — 숨은 상태로 만들면 위젯이 깨진다. */
  if(opts.eager) setTimeout(function(){ if(tvVisible(el)) fire(); }, opts.delay||600);
}

/* 이미 만들어졌지만 0 크기로 깨진 위젯을 찾아 다시 만든다
   (탭을 떠났다 돌아올 때 TradingView iframe 이 접히는 경우 대비) */
var TV_REBUILD={
  '#tvHeatmapWidget':  function(){ initTVHeatmap(); },
  '#tvMarketOverview': function(){ initTVMarketOverview(); },
  '#tvEconCalendar':   function(){ initTVEconCalendar(); },
  '#tvTopStories':     function(){ initTVTopStories(); }
};
function tvRepairMacro(){
  Object.keys(TV_REBUILD).forEach(function(sel){
    var root=document.querySelector(sel);
    if(!root || !root.__tvLoaded) return;
    if(!tvVisible(root)) return;
    var f=root.querySelector('iframe');
    var h=f? f.getBoundingClientRect().height : 0;
    if(f && h>=8) return;                 /* 정상 */
    var m=root.querySelector('.tradingview-widget-container__widget');
    if(m) m.innerHTML='';
    root.__tvLoaded=false; root.__tvRetried=false;
    TV_REBUILD[sel]();
  });
}

/* 매크로탭 진입 시 위젯들을 lazy-load 등록 (보이는 것부터 순차 로드) */
function initTVMacroWidgets(){
  setTimeout(tvRepairMacro, 1500);
  if(typeof tvLazy==='function'){ tvLazy('#homeTicker1', initHomeTicker1); tvLazy('#homeTicker2', initHomeTicker2); }
  tvLazy('#tvHeatmapWidget',  initTVHeatmap);
  tvLazy('#tvMarketOverview', initTVMarketOverview);
  tvLazy('#tvMarketSummary',  initTVMarketSummary);
  tvLazy('#tvEconMap',        initTVEconMap);
  tvLazy('#tvEconCalendar',   initTVEconCalendar);
  tvLazy('#tvTopStories',     initTVTopStories, {eager:true, delay:700});
}
/* 예전에는 페이지 로드 2.2초 뒤 마켓 뉴스를 미리 만들었지만, 그때 매크로 탭은
   display:none 이라 위젯이 0x0 으로 깨진 채 굳어졌다(→ 새로고침해야 정상).
   지금은 tvBuildIframe 이 "보일 때"까지 기다렸다가 만들므로 프리로드가 필요 없다. */

/* ════════ HOLDINGS 탭 (보유 종목 심층 분석) ════════ */
var HOLDINGS=[
  {sym:'NASDAQ:TSLA', tk:'TSLA', nm:'테슬라',     c:'#ff4444'},
  {sym:'NASDAQ:RKLB', tk:'RKLB', nm:'로켓랩',     c:'#ffffff'},
  {sym:'NASDAQ:IREN', tk:'IREN', nm:'아이렌',     c:'#33ffcc'},
  {sym:'NASDAQ:NVDA', tk:'NVDA', nm:'엔비디아',   c:'#9cf500'},
  {sym:'CBOE:DRAM',   tk:'DRAM', nm:'메모리 ETF', c:'#66f0ff'},
  {sym:'NYSE:CRCL',   tk:'CRCL', nm:'서클',       c:'#be9eff'},
  {sym:'NYSE:INFQ',   tk:'INFQ', nm:'인플렉션',   c:'#ff9e80'},
  {sym:'NASDAQ:GOOG', tk:'GOOG', nm:'알파벳',     c:'#73a5ff'}
];

/* 재구성 가능한 iframe 빌더 (종목 바뀔 때마다 교체) */
function tvIframeInto(mountId, widgetName, settings){
  var mount=document.getElementById(mountId);
  if(!mount) return;
  mount.innerHTML='';
  var qs='?locale=kr';
  // 일부 위젯(symbol-info, symbol-profile 등)은 심볼을 hash가 아닌 쿼리스트링에서 읽음
  if(settings && settings.symbol){ qs+='&symbol='+encodeURIComponent(settings.symbol); }
  var src='https://www.tradingview-widget.com/embed-widget/'+widgetName+'/'+qs+'#'
          + encodeURIComponent(JSON.stringify(settings));
  var f=document.createElement('iframe');
  f.src=src; f.title=widgetName;
  f.setAttribute('frameborder','0');
  f.setAttribute('scrolling','no');
  f.setAttribute('allowtransparency','true');
  f.style.cssText='width:100%;height:100%;border:0;display:block';
  mount.appendChild(f);
}

var __holdCur=null;
function loadHolding(sym){
  if(sym===__holdCur) return;
  __holdCur=sym;
  var item=null,i;
  for(i=0;i<HOLDINGS.length;i++){ if(HOLDINGS[i].sym===sym){ item=HOLDINGS[i]; break; } }
  var btns=document.querySelectorAll('#holdSide .hold-item');
  for(i=0;i<btns.length;i++){
    if(btns[i].getAttribute('data-sym')===sym) btns[i].classList.add('active');
    else btns[i].classList.remove('active');
  }
  var t=document.getElementById('holdTitle');
  if(t && item) {
    t.textContent=item.tk+' · '+item.nm+'  —  '+sym;
    
    // 💡 동적 네온사인 엔진: 각 종목의 상징색(item.c)을 가져와 글자색과 발광 효과를 입힙니다.
    t.style.color = item.c;
    t.style.fontSize = '14px'; /* 기존 10px에서 1.5배 가까이 확대 */
    t.style.fontWeight = '700';
    t.style.letterSpacing = '0.15em';
    
    /* 입체적인 블랙 그림자 베이스에, 기업 색상에 투명도를 얹은 3단 네온 글로우 주입 */
    t.style.textShadow = '0 1px 3px rgba(0,0,0,0.9), 0 0 10px ' + item.c + 'cc, 0 0 22px ' + item.c + '80, 0 0 35px ' + item.c + '4d';
    t.style.transition = 'all 0.4s ease'; /* 종목 바꿀 때 색상이 부드럽게 스르륵 변하게 함 */
  }
  if(window.__hwKrwUpdate) window.__hwKrwUpdate(sym);
  setTimeout(function(){ if(window.__rsFmpMount) window.__rsFmpMount('hwFmp', String(sym).split(':').pop()); }, 80);
  tvIframeInto('hw-info','symbol-info',{
    symbol:sym, colorTheme:'dark', isTransparent:true, width:'100%'
  });
  tvIframeInto('hw-chart','advanced-chart',{
    symbol:sym, interval:'D', timezone:'Asia/Seoul', theme:'dark', style:'1',
    locale:'kr', autosize:true, allow_symbol_change:false, calendar:false,
    hide_volume:false, support_host:'https://www.tradingview.com'
  });
  tvIframeInto('hw-tech','technical-analysis',{
    symbol:sym, interval:'1D', showIntervalTabs:true, displayMode:'multiple',
    colorTheme:'dark', isTransparent:true, width:'100%', height:'100%'
  });
  tvIframeInto('hw-profile','symbol-profile',{
    symbol:sym, colorTheme:'dark', isTransparent:true, width:'100%', height:'100%'
  });
  tvIframeInto('hw-fin','financials',{
    symbol:sym, colorTheme:'dark', displayMode:'regular', isTransparent:true,
    width:'100%', height:'100%'
  });
  tvIframeInto('hw-news','timeline',{
    feedMode:'symbol', symbol:sym, colorTheme:'dark', isTransparent:true,
    displayMode:'regular', width:'100%', height:'100%'
  });
}

var __holdInit=false;
/* ── ✨ 종목 단추 명칭 교정 (INTEL ➔ RESEARCH 변경본) ── */
function holdRenderItem(h, active){
  return '<button class="hold-item'+(active?' active':'')+'" draggable="true" data-sym="'+h.sym+'" style="--bc:'+h.c+'">'+
         '<span class="hold-tk">'+h.tk+'</span><span class="hold-nm">'+h.nm+'</span>'+
         '<span class="intel-trigger" onclick="event.stopPropagation(); window.openIntelDrawer(\''+h.tk+'\')">RESEARCH 📑</span>' +
         '<span class="hold-del" title="삭제" onclick="event.stopPropagation(); window.holdDelete(\''+h.sym+'\')">✕</span>'+
         '<span class="hold-grip" aria-hidden="true">⠿</span></button>';
}/* 저장된 순서 복원 */
function holdLoadOrder(){
  try{
    var raw=localStorage.getItem('nn_hold_order');
    if(!raw) return;
    var order=JSON.parse(raw);
    if(!order || !order.length) return;
    var map={}; HOLDINGS.forEach(function(h){ map[h.sym]=h; });
    var next=[];
    order.forEach(function(s){ if(map[s]){ next.push(map[s]); delete map[s]; } });
    HOLDINGS.forEach(function(h){ if(map[h.sym]) next.push(h); });
    if(next.length===HOLDINGS.length) HOLDINGS=next;
  }catch(e){}
}
/* 현재 DOM 순서를 저장 + HOLDINGS 배열 동기화 */
function holdSaveOrder(){
  try{
    var side=document.getElementById('holdSide');
    var syms=[].slice.call(side.querySelectorAll('.hold-item')).map(function(b){ return b.getAttribute('data-sym'); });
    var map={}; HOLDINGS.forEach(function(h){ map[h.sym]=h; });
    HOLDINGS=syms.map(function(s){ return map[s]; });
    localStorage.setItem('nn_hold_order', JSON.stringify(syms));
    holdSaveAll();
  }catch(e){}
}
function holdDragAfter(container, y){
  var els=[].slice.call(container.querySelectorAll('.hold-item:not(.dragging)'));
  var closest={offset:-Infinity, element:null};
  els.forEach(function(child){
    var box=child.getBoundingClientRect();
    var offset=y - box.top - box.height/2;
    if(offset<0 && offset>closest.offset){ closest={offset:offset, element:child}; }
  });
  return closest.element;
}

/* ── 종목 추가/삭제 (홈에서 자유롭게 편집, localStorage 영속) ── */
function holdSaveAll(){ try{ localStorage.setItem('nn_hold_v2', JSON.stringify(HOLDINGS)); }catch(e){} }
function holdLoadAll(){
  try{ var raw=localStorage.getItem('nn_hold_v2'); if(raw){ var arr=JSON.parse(raw); if(Array.isArray(arr)&&arr.length){ HOLDINGS=arr; return true; } } }catch(e){}
  return false;
}
function holdRenderSidebar(){
  var side=document.getElementById('holdSide'); if(!side) return;
  var html='',i;
  for(i=0;i<HOLDINGS.length;i++){ html+=holdRenderItem(HOLDINGS[i], HOLDINGS[i].sym===__holdCur); }
  html+='<button class="hold-add-btn" type="button" onclick="window.holdOpenAdd()">＋ 종목 추가</button>';
  side.innerHTML=html;
  var btns=side.querySelectorAll('.hold-item');
  for(i=0;i<btns.length;i++){
    (function(b){
      var wasDragged=false;
      b.addEventListener('click', function(){ if(wasDragged){ wasDragged=false; return; } loadHolding(b.getAttribute('data-sym')); });
      b.addEventListener('dragstart', function(){ wasDragged=true; b.classList.add('dragging'); });
      b.addEventListener('dragend', function(){ b.classList.remove('dragging'); holdSaveOrder(); setTimeout(function(){ wasDragged=false; }, 60); });
    })(btns[i]);
  }
}
window.holdDelete=function(sym){
  if(HOLDINGS.length<=1){ alert('최소 1개 종목은 유지해야 합니다.'); return; }
  var item=null; HOLDINGS.forEach(function(h){ if(h.sym===sym) item=h; });
  if(!item) return;
  if(!confirm('"'+item.tk+' · '+item.nm+'" 종목을 목록에서 삭제할까요?')) return;
  HOLDINGS=HOLDINGS.filter(function(h){ return h.sym!==sym; });
  holdSaveAll();
  if(__holdCur===sym) __holdCur=null;
  holdRenderSidebar();
  loadHolding(__holdCur || HOLDINGS[0].sym);
};
window.haPick=function(c){
  var ci=document.getElementById('haColor'); if(ci) ci.value=c;
  var sws=document.querySelectorAll('#holdAddModal .ham-sw');
  for(var i=0;i<sws.length;i++){ var dc=sws[i].getAttribute('data-c')||''; if(dc.toLowerCase()===String(c).toLowerCase()) sws[i].classList.add('sel'); else sws[i].classList.remove('sel'); }
};
function holdBuildModal(){
  var m=document.createElement('div'); m.id='holdAddModal'; m.className='hold-add-modal';
  var presets=['#ff4444','#ffffff','#33ffcc','#9cf500','#66f0ff','#be9eff','#ff9e80','#73a5ff','#ffd60a','#ff3d8b'];
  var sw=''; for(var i=0;i<presets.length;i++){ sw+='<span class="ham-sw" data-c="'+presets[i]+'" style="background:'+presets[i]+'" onclick="window.haPick(\''+presets[i]+'\')"></span>'; }
  m.innerHTML=
    '<div class="ham-card">'
    + '<div class="ham-title">＋ 종목 추가</div>'
    + '<div class="ham-field"><label>티커 (예: AAPL)</label><input type="text" id="haTk" placeholder="AAPL" autocomplete="off"></div>'
    + '<div class="ham-field"><label>종목명</label><input type="text" id="haNm" placeholder="애플" autocomplete="off"></div>'
    + '<div class="ham-field"><label>거래소</label><select id="haEx"><option>NASDAQ</option><option>NYSE</option><option>AMEX</option><option>CBOE</option><option>OTC</option><option>BINANCE</option></select></div>'
    + '<div class="ham-field"><label>색상</label><div class="ham-swatches">'+sw+'<input type="color" id="haColor" class="ham-color" value="#b28ad4" oninput="window.haPick(this.value)"></div></div>'
    + '<div class="ham-actions"><button class="ham-btn ham-cancel" type="button" onclick="window.holdCloseAdd()">취소</button><button class="ham-btn ham-add" type="button" onclick="window.holdSubmitAdd()">추가</button></div>'
    + '</div>';
  m.addEventListener('click', function(e){ if(e.target===m) window.holdCloseAdd(); });
  m.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); window.holdSubmitAdd(); } else if(e.key==='Escape'){ window.holdCloseAdd(); } });
  return m;
}
window.holdOpenAdd=function(){
  var m=document.getElementById('holdAddModal');
  if(!m){ m=holdBuildModal(); document.body.appendChild(m); }
  m.querySelector('#haTk').value=''; m.querySelector('#haNm').value=''; m.querySelector('#haEx').value='NASDAQ';
  window.haPick('#b28ad4');
  m.classList.add('open');
  setTimeout(function(){ var t=m.querySelector('#haTk'); if(t) t.focus(); },50);
};
window.holdCloseAdd=function(){ var m=document.getElementById('holdAddModal'); if(m) m.classList.remove('open'); };
window.holdSubmitAdd=function(){
  var m=document.getElementById('holdAddModal'); if(!m) return;
  var tk=(m.querySelector('#haTk').value||'').trim().toUpperCase().replace(/\s+/g,'');
  var nm=(m.querySelector('#haNm').value||'').trim();
  var ex=m.querySelector('#haEx').value;
  var c=m.querySelector('#haColor').value || '#b28ad4';
  if(!tk){ alert('티커를 입력하세요'); return; }
  if(!nm) nm=tk;
  var sym=ex+':'+tk;
  for(var i=0;i<HOLDINGS.length;i++){ if(HOLDINGS[i].sym===sym){ alert('이미 추가된 종목입니다: '+sym); return; } }
  HOLDINGS.push({sym:sym, tk:tk, nm:nm, c:c});
  holdSaveAll();
  holdRenderSidebar();
  loadHolding(sym);
  window.holdCloseAdd();
};

function initHoldings(){
  var side=document.getElementById('holdSide');
  if(!side) return;
  if(!__holdInit){
    __holdInit=true;
    if(!holdLoadAll()) holdLoadOrder();
    holdRenderSidebar();
    side.addEventListener('dragover', function(e){
      e.preventDefault();
      var dragging=side.querySelector('.dragging');
      if(!dragging) return;
      var after=holdDragAfter(side, e.clientY);
      if(after==null){ var addb=side.querySelector('.hold-add-btn'); if(addb) side.insertBefore(dragging, addb); else side.appendChild(dragging); }
      else side.insertBefore(dragging, after);
    });
  }
  loadHolding(__holdCur || HOLDINGS[0].sym);
}

var MEGACAPS=[
  {s:'NVDA',n:'엔비디아',p:222.82,rk:1,pr:1,mc:5230,dom:'nvidia.com',ctry:'US'},
  {s:'MSFT',n:'마이크로소프트',p:441.31,rk:2,pr:4,mc:3110,dom:'microsoft.com',ctry:'US'},
  {s:'GOOGL',n:'알파벳',p:361.85,rk:3,pr:3,mc:4630,dom:'abc.xyz',ctry:'US'},
  {s:'AAPL',n:'애플',p:315.03,rk:4,pr:2,mc:4540,dom:'apple.com',ctry:'US'},
  {s:'SPCX',n:'스페이스X',p:145.30,rk:5,pr:5,mc:2100,dom:'spacex.com',ctry:'US'},
  {s:'AMZN',n:'아마존',p:256.60,rk:6,pr:5,mc:2870,dom:'amazon.com',ctry:'US'},
  {s:'TSM',n:'TSMC',p:446.69,rk:7,pr:6,mc:2100,dom:'tsmc.com',ctry:'TW'},
  {s:'AVGO',n:'브로드컴',p:481.65,rk:8,pr:7,mc:1600,dom:'broadcom.com',ctry:'US'},
  {s:'TSLA',n:'테슬라',p:423.74,rk:9,pr:8,mc:1400,dom:'tesla.com',ctry:'US'},
  {s:'META',n:'메타',p:597.63,rk:10,pr:9,mc:1700,dom:'meta.com',ctry:'US'},
  {s:'MU',n:'마이크론',p:1064.10,rk:11,pr:10,mc:1180,dom:'micron.com',ctry:'US'},
  {s:'BRK.B',n:'버크셔',p:471.69,rk:12,pr:11,mc:1050,dom:'berkshirehathaway.com',ctry:'US'},
  {s:'LLY',n:'일라이릴리',p:1064.15,rk:13,pr:12,mc:1020,dom:'lilly.com',ctry:'US'},
  {s:'WMT',n:'월마트',p:113.06,rk:14,pr:13,mc:1000,dom:'walmart.com',ctry:'US'},
  {s:'AMD',n:'AMD',p:520.87,rk:15,pr:14,mc:870,dom:'amd.com',ctry:'US'},
  {s:'JPM',n:'JP모건',p:300.96,rk:16,pr:15,mc:840,dom:'jpmorganchase.com',ctry:'US'},
  {s:'ORCL',n:'오라클',p:244.58,rk:17,pr:16,mc:800,dom:'oracle.com',ctry:'US'},
  {s:'ASML',n:'ASML',p:1705.37,rk:18,pr:17,mc:760,dom:'asml.com',ctry:'NL'},
  {s:'XOM',n:'엑손모빌',p:149.56,rk:19,pr:18,mc:620,dom:'exxonmobil.com',ctry:'US'},
  {s:'V',n:'비자',p:317.32,rk:20,pr:19,mc:600,dom:'visa.com',ctry:'US'},
  {s:'INTC',n:'인텔',p:107.93,rk:21,pr:20,mc:560,dom:'intel.com',ctry:'US'},
  {s:'JNJ',n:'존슨앤존슨',p:222.89,rk:22,pr:21,mc:540,dom:'jnj.com',ctry:'US'},
  {s:'CSCO',n:'시스코',p:128.00,rk:23,pr:22,mc:520,dom:'cisco.com',ctry:'US'},
  {s:'MA',n:'마스터카드',p:477.68,rk:24,pr:23,mc:500,dom:'mastercard.com',ctry:'US'},
  {s:'ARM',n:'ARM',p:402.71,rk:25,pr:24,mc:480,dom:'arm.com',ctry:'GB'},
  {s:'COST',n:'코스트코',p:954.27,rk:26,pr:25,mc:460,dom:'costco.com',ctry:'US'},
  {s:'CAT',n:'캐터필러',p:909.81,rk:27,pr:26,mc:440,dom:'caterpillar.com',ctry:'US'},
  {s:'LRCX',n:'램리서치',p:334.41,rk:28,pr:27,mc:420,dom:'lamresearch.com',ctry:'US'},
  {s:'PLTR',n:'팔란티어',p:152.17,rk:29,pr:28,mc:400,dom:'palantir.com',ctry:'US'},
  {s:'ABBV',n:'애브비',p:215.43,rk:30,pr:29,mc:380,dom:'abbvie.com',ctry:'US'}
];

var INDICES=[
  {k:'S&P 500',sub:'SPY ETF',v:660},{k:'나스닥 100',sub:'QQQ ETF',v:585},
  {k:'다우존스',sub:'DIA ETF',v:475},{k:'러셀2000',sub:'IWM ETF',v:250},
  {k:'반도체',sub:'SOXX ETF',v:265},{k:'한국 MSCI',sub:'EWY ETF',v:78},
  {k:'일본 MSCI',sub:'EWJ ETF',v:82},{k:'중국 MSCI',sub:'MCHI ETF',v:62},
  {k:'독일 MSCI',sub:'EWG ETF',v:42},{k:'영국 MSCI',sub:'EWU ETF',v:41}
];

function renderIndices(){
  var html='';
  for(var i=0;i<INDICES.length;i++){
    var ix=INDICES[i];
    var v=ix.v*(1+rndChg(0,.004));
    html+=tRow(ix.k,ix.sub,0,rndChg(0,.9),{raw:fmt(v,2)});
  }
  document.getElementById('indexRows').innerHTML=html;
}

function renderCommodities(){
  document.getElementById('commRows').innerHTML=
    tRow('금 Gold','XAU/USD',4320*(1+rndChg(0,.004)),rndChg(0.05,.6),{dec:1})+
    tRow('은 Silver','XAG/USD',53.8*(1+rndChg(0,.006)),rndChg(0,.9),{dec:2})+
    tRow('WTI 원유','배럴',75.5*(1+rndChg(-.02,.008)),rndChg(-.02,1),{dec:2})+
    tRow('천연가스','MMBtu',3.95*(1+rndChg(0,.01)),rndChg(0,1.4),{dec:3})+
    tRow('구리 Copper','파운드',5.15*(1+rndChg(0,.006)),rndChg(0,.9),{dec:3});
}

/* ══════════ 기준금리 자동 조회 (미국 FRED · 한국 ECOS) ══════════ */
var POL_KEY='nn_policy_v1';
function polLoad(){
  try{ var s=localStorage.getItem(POL_KEY); if(s){ var o=JSON.parse(s); if(o&&typeof o==='object') return o; } }catch(e){}
  return {};
}
function polSave(o){ try{ localStorage.setItem(POL_KEY, JSON.stringify(o)); }catch(e){} }
function polEcosKey(){ try{ return (localStorage.getItem('nn_ecos_key')||'').trim(); }catch(e){ return ''; } }
var polBusy=false, polMsg='';

/* 프록시 경유 (Worker 우선 → 공용 프록시) */
async function polFetch(target, workerPath){
  var W=(typeof workerUrl==='function')?workerUrl():'';
  var tries=[];
  if(W && workerPath) tries.push(W+workerPath);
  tries.push('https://api.allorigins.win/raw?url='+encodeURIComponent(target));
  var last=null;
  for(var i=0;i<tries.length;i++){
    try{
      var r=await fetch(tries[i]);
      if(!r.ok) throw new Error('HTTP '+r.status);
      return await r.text();
    }catch(e){ last=e; }
  }
  throw last||new Error('fail');
}

/* 미국 — FRED 무료 CSV (키 불필요). 목표범위 하단·상단 */
async function polUS(){
  var txt=await polFetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFEDTARL,DFEDTARU', '/fred?id=DFEDTARL,DFEDTARU');
  var lines=String(txt||'').trim().split(/\r?\n/);
  if(lines.length<2) throw new Error('no data');
  for(var i=lines.length-1;i>=1;i--){
    var c=lines[i].split(',');
    if(c.length<3) continue;
    var lo=parseFloat(c[1]), hi=parseFloat(c[2]);
    if(!isNaN(lo)&&!isNaN(hi)) return { lo:lo, hi:hi, date:(c[0]||'').trim(), src:'FRED' };
  }
  throw new Error('no valid row');
}

/* 한국 — 한국은행 ECOS (무료 키 필요). 722Y001 / 0101000 = 한국은행 기준금리 */
async function polKR(){
  var k=polEcosKey();
  if(!k) throw new Error('ECOS 인증키가 없습니다');
  function d8(dt){ return dt.getFullYear()+String(dt.getMonth()+1).padStart(2,'0')+String(dt.getDate()).padStart(2,'0'); }
  var to=new Date(), from=new Date(); from.setDate(from.getDate()-400);
  var url='https://ecos.bok.or.kr/api/StatisticSearch/'+encodeURIComponent(k)
        +'/json/kr/1/200/722Y001/D/'+d8(from)+'/'+d8(to)+'/0101000';
  var txt=await polFetch(url, '/ecos?key='+encodeURIComponent(k)+'&from='+d8(from)+'&to='+d8(to));
  var j=JSON.parse(txt);
  if(j && j.RESULT && j.RESULT.CODE) throw new Error('ECOS ('+j.RESULT.CODE+') '+(j.RESULT.MESSAGE||''));
  var rows=j && j.StatisticSearch && j.StatisticSearch.row;
  if(!rows || !rows.length) throw new Error('데이터가 없습니다');
  for(var i=rows.length-1;i>=0;i--){
    var v=parseFloat(rows[i].DATA_VALUE);
    if(!isNaN(v)) return { v:v, date:String(rows[i].TIME||''), src:'ECOS' };
  }
  throw new Error('유효한 값이 없습니다');
}

async function polRefresh(manual){
  if(polBusy) return;
  polBusy=true; polMsg=''; renderRates();
  var P=polLoad(), okN=0, errs=[];
  try{ var u=await polUS(); P.us={lo:u.lo, hi:u.hi, date:u.date, src:u.src, at:Date.now()}; okN++; }
  catch(e){ errs.push('미국'); }
  if(polEcosKey()){
    try{ var k2=await polKR(); P.kr={v:k2.v, date:k2.date, src:k2.src, at:Date.now()}; okN++; }
    catch(e){ errs.push('한국('+((e&&e.message)||'')+')'); }
  }
  polSave(P);
  polBusy=false;
  polMsg = errs.length ? (errs.join(' · ')+' 조회 실패') : '';
  renderRates();
  if(manual && typeof fmpToast==='function'){
    fmpToast(okN? ('✅ 기준금리를 갱신했습니다'+(errs.length?' (일부 실패)':'')) : '기준금리를 불러오지 못했습니다', okN?'ok':'out');
  }
}
window.__polRefresh=polRefresh;
/* 진입 시 자동 갱신 — 마지막 성공에서 12시간 지났을 때만 (불필요한 호출 방지) */
function polMaybeRefresh(){
  var P=polLoad();
  var last=Math.max((P.us&&P.us.at)||0, (P.kr&&P.kr.at)||0);
  var needKR = !!polEcosKey() && !(P.kr&&P.kr.at);
  if(needKR || Date.now()-last > 12*3600000) polRefresh(false);
}

/* 표시용 문자열 — 자동값 > 수동값 > 내장 기본값 순 */
function polUSTxt(){
  var P=polLoad();
  if(P.us && P.us.hi!=null) return { txt:P.us.lo.toFixed(2)+'–'+P.us.hi.toFixed(2)+'%', sub:'Fed Funds · '+polAgo(P.us.at), live:true };
  var m=(P.manual&&P.manual.us||'').trim();
  if(m) return { txt:m, sub:'Fed Funds · 직접 입력', live:false };
  return { txt:'3.50–3.75%', sub:'Fed Funds · 참고값', live:false };
}
function polKRTxt(){
  var P=polLoad();
  if(P.kr && P.kr.v!=null) return { txt:P.kr.v.toFixed(2)+'%', sub:'BOK Base · '+polAgo(P.kr.at), live:true };
  var m=(P.manual&&P.manual.kr||'').trim();
  if(m) return { txt:(/%$/.test(m)?m:m+'%'), sub:'BOK Base · 직접 입력', live:false };
  return { txt:'2.75%', sub:'BOK Base · 참고값 (2026.7 인상 반영)', live:false };
}
function polAgo(ts){
  if(!ts) return '실시간';
  var s=Math.floor((Date.now()-ts)/1000);
  if(s<3600) return '방금 갱신';
  if(s<86400) return Math.floor(s/3600)+'시간 전 갱신';
  return Math.floor(s/86400)+'일 전 갱신';
}

function renderRates(){
  var host=document.getElementById('ratesRows'); if(!host) return;
  var pu=polUSTxt(), pk=polKRTxt();
  host.innerHTML=
    tRow('미국 기준금리',pu.sub,0,null,{raw:pu.txt})+
    tRow('한국 기준금리',pk.sub,0,null,{raw:pk.txt})+
    tRow('미국 10년물','US 10Y',0,null,{raw:'4.44%'})+
    tRow('미국 2년물','US 2Y',0,null,{raw:'4.18%'})+
    tRow('미국 30년물','US 30Y',0,null,{raw:'4.62%'})+
    tRow('장단기 스프레드','10Y-2Y',0,null,{raw:'+0.26%p'});
  renderRatesWorker();
}
async function renderRatesWorker(){
  var W=(typeof workerUrl==='function')?workerUrl():''; if(!W) return;
  try{
    var r=await fetch(W+'/rates'); if(!r.ok) return;
    var d=await r.json();
    if(!d || d.y10==null) return;
    var sp = (d.y10!=null && d.y2!=null) ? (d.y10-d.y2) : null;
    var host=$id('ratesRows'); if(!host) return;
    host.innerHTML=
      (function(){ var pu=polUSTxt(); return tRow('미국 기준금리',pu.sub,0,null,{raw:pu.txt}); })()+
      (function(){ var pk=polKRTxt(); return tRow('한국 기준금리',pk.sub,0,null,{raw:pk.txt}); })()+
      (d.y10!=null?tRow('미국 10년물','US 10Y · 실시간',0,null,{raw:d.y10.toFixed(2)+'%'}):'')+
      (d.y2!=null?tRow('미국 2년물','US 2Y · 실시간',0,null,{raw:d.y2.toFixed(2)+'%'}):'')+
      (d.y30!=null?tRow('미국 30년물','US 30Y · 실시간',0,null,{raw:d.y30.toFixed(2)+'%'}):'')+
      (sp!=null?tRow('장단기 스프레드','10Y-2Y',0,null,{raw:(sp>=0?'+':'')+sp.toFixed(2)+'%p'}):'');
    var tg=document.querySelector('#ratesRows'); 
  }catch(e){}
}

function renderSummary(vix,fng,dxy){
  function setSm(id,val){ var e=$id(id); if(e) e.innerHTML=val; }
  setSm('sm-vix', (vix||(18.4+rndChg(0,.05)*18)).toFixed(2));
  setSm('sm-fng', (fng||Math.round(50+rndChg(0,.3)*30))+' <span class="sm-chg t-neu">/100</span>');
  setSm('sm-dxy', (dxy||(105.2+rndChg(0,.004)*105)).toFixed(2));
  setSm('sm-us10', (4.44+rndChg(0,.008)).toFixed(2)+'%');
  setSm('sm-us2', (4.18+rndChg(0,.008)).toFixed(2)+'%');
  setSm('sm-krw', '₩'+fmt(krwRate,1));
}

async function fetchStocks(){
  var tag=$id('stockTag');
  var host=document.getElementById('stockRows');
  var K=''; try{ K=(localStorage.getItem('nn_fmp_key')||'').trim(); }catch(e){}

  /* 항상 먼저 종가로 전체 목록을 그린다 (절대 빈 화면 없음) */
  function paintClose(){
    var h='';
    for(var i=0;i<MEGACAPS.length;i++){ var m=MEGACAPS[i]; h+=stockRow(m,m.p,(m.lastChg!=null?m.lastChg:null)); }
    if(host) host.innerHTML=h;
    try{ renderHeatmap(); }catch(e){}
  }
  paintClose();

  // FMP 키 없으면: 종가 고정 표시로 끝
  if(!K){ if(tag){tag.textContent='참고값';tag.className='sim-tag';} return; }

  if(window.__stockFetching) return;
  window.__stockFetching=true;
  try{
    var qm=await fmpQuote(MEGACAPS.map(function(m){ return m.s; }));
    if(qm){
      var rows='', liveN=0;
      for(var k=0;k<MEGACAPS.length;k++){
        var mm=MEGACAPS[k], o=qm[mm.s];
        var valid = o && o.price>0;
        if(valid){ mm.lastChg=(typeof o.chg==='number')?o.chg:0; mm.p=o.price; rows+=stockRow(mm,o.price,mm.lastChg); liveN++; }
        else { rows+=stockRow(mm,mm.p,(mm.lastChg!=null?mm.lastChg:null)); }
      }
      if(host) host.innerHTML=rows;
      try{ renderHeatmap(); }catch(e){}
      if(tag){ tag.textContent = liveN>0 ? 'FMP 실시간' : '참고값'; tag.className = liveN>0 ? 'live-tag' : 'sim-tag'; }
    } else { if(tag){tag.textContent='참고값';tag.className='sim-tag';} }
  }catch(e){ if(tag){tag.textContent='참고값';tag.className='sim-tag';} }
  finally{ window.__stockFetching=false; }
}

/* ══ FMP 실시간 데이터 (지수·원자재·주식) — RESEARCH 탭과 키 공유 ══ */
function fmpKey(){ try{ return (localStorage.getItem('nn_fmp_key')||'').trim(); }catch(e){ return ''; } }

/* FMP 지수 심볼 (^ 접두) */
/* 지수 ETF (FMP 무료로 실제 값 조회 가능 — 지수 자체는 유료라 ETF로 대체) */
var FMP_INDICES=[
  {s:'SPY',k:'S&P 500',sub:'SPY ETF'},{s:'QQQ',k:'나스닥 100',sub:'QQQ ETF'},
  {s:'DIA',k:'다우존스',sub:'DIA ETF'},{s:'IWM',k:'러셀2000',sub:'IWM ETF'},
  {s:'SOXX',k:'반도체',sub:'SOXX ETF'},{s:'EWY',k:'한국 MSCI',sub:'EWY ETF'},
  {s:'EWJ',k:'일본 MSCI',sub:'EWJ ETF'},{s:'MCHI',k:'중국 MSCI',sub:'MCHI ETF'},
  {s:'EWG',k:'독일 MSCI',sub:'EWG ETF'},{s:'EWU',k:'영국 MSCI',sub:'EWU ETF'}
];
/* Worker 프록시용 실제 지수 심볼 (Yahoo v8 — ETF 근사가 아닌 진짜 지수) */
var WK_INDICES=[
  {s:'^GSPC',k:'S&P 500',sub:'미국 대형주'},
  {s:'^IXIC',k:'나스닥 종합',sub:'미국 기술주'},
  {s:'^DJI',k:'다우존스',sub:'미국 우량주 30'},
  {s:'^RUT',k:'러셀 2000',sub:'미국 중소형주'},
  {s:'^SOX',k:'필라델피아 반도체',sub:'반도체 지수'},
  {s:'^N225',k:'닛케이 225',sub:'일본'},
  {s:'^HSI',k:'항셍',sub:'홍콩'},
  {s:'^GDAXI',k:'DAX 40',sub:'독일'},
  {s:'^FTSE',k:'FTSE 100',sub:'영국'}
];
async function renderIndicesWorker(){
  var W=(typeof workerUrl==='function')?workerUrl():''; if(!W) return false;
  try{
    var r=await fetch(W+'/quote?us='+encodeURIComponent(WK_INDICES.map(function(x){return x.s;}).join(',')));
    if(!r.ok) return false;
    var d=await r.json(); var us=(d&&d.us)||{};
    var h='', n=0;
    for(var i=0;i<WK_INDICES.length;i++){
      var ix=WK_INDICES[i], o=us[ix.s];
      if(o && o.price>0){ h+=tRow(ix.k, ix.sub+' · 실시간', 0, (o.chg==null?null:o.chg), {raw:fmt(o.price,2)}); n++; }
    }
    if(!n) return false;
    $id('indexRows').innerHTML=h;
    var tag=$id('idxTag'); if(tag){ tag.textContent='실시간 · 실제 지수'; tag.className='live-tag'; }
    prependKR();
    return true;
  }catch(e){ return false; }
}
/* FMP 원자재 심볼 */
/* 원자재 ETF (FMP 무료로 실제 값 조회 가능 — 원자재 직접 시세는 유료) */
var FMP_COMM=[
  {s:'GLD',k:'금 Gold',sub:'GLD ETF',dec:2},{s:'SLV',k:'은 Silver',sub:'SLV ETF',dec:2},
  {s:'USO',k:'WTI 원유',sub:'USO ETF',dec:2},{s:'UNG',k:'천연가스',sub:'UNG ETF',dec:2},
  {s:'CPER',k:'구리 Copper',sub:'CPER ETF',dec:2}
];

/* FMP 응답 정규화 (stable/legacy 필드 차이 흡수) */
function fmpNorm(o){
  if(!o) return null;
  var price=(o.price!=null)?o.price:(o.close!=null?o.close:null);
  var chg=(o.changePercentage!=null)?o.changePercentage:((o.changesPercentage!=null)?o.changesPercentage:0);
  return { symbol:o.symbol, price:price, chg:(typeof chg==='number'?chg:parseFloat(chg)||0) };
}
/* FMP quote 조회 — Stable API 개별 병렬 호출 (무료 플랜 확실 동작) */
async function fmpQuote(symbols){
  var K=fmpKey(); if(!K) return null;
  try{
    var results=await Promise.all(symbols.map(function(s){
      return fetch('https://financialmodelingprep.com/stable/quote?symbol='+encodeURIComponent(s)+'&apikey='+K)
        .then(function(r){ return r.ok?r.json():null; })
        .then(function(d){ if(Array.isArray(d)&&d[0]) return fmpNorm(d[0]); if(d&&d.symbol) return fmpNorm(d); return null; })
        .catch(function(){ return null; });
    }));
    var map={}, any=false;
    results.forEach(function(n){ if(n&&n.symbol){ map[n.symbol]=n; any=true; } });
    return any?map:null;
  }catch(e){ return null; }
}

/* ── KR 실시간·뉴스 프록시 (Cloudflare Worker) ── */
function workerUrl(){ try{ return (localStorage.getItem('nn_worker_url')||'').trim().replace(/\/+$/,''); }catch(e){ return ''; } }
async function prependKR(){
  var W=workerUrl(); if(!W) return;
  try{
    var r=await fetch(W+'/kr'); if(!r.ok) return;
    var d=await r.json();
    var rows='';
    if(d.kospi && d.kospi.price) rows+=tRow('KOSPI','한국 · 실시간',0,(d.kospi.chg||0),{raw:fmt(d.kospi.price,2)});
    if(d.kosdaq && d.kosdaq.price) rows+=tRow('KOSDAQ','한국 성장주 · 실시간',0,(d.kosdaq.chg||0),{raw:fmt(d.kosdaq.price,2)});
    if(rows){ var host=$id('indexRows'); if(host) host.innerHTML=rows+host.innerHTML; }
  }catch(e){}
}
async function renderNews(){
  var host=$id('newsRows'), tag=$id('newsTag'); if(!host) return;
  var W=workerUrl();
  if(!W){ host.innerHTML='<div class="news-empty">위 통합 패널에 프록시 주소를 입력하면 실시간 경제 뉴스가 표시됩니다.</div>'; if(tag){tag.textContent='프록시 필요';tag.className='sim-tag';} return; }
  try{
    var r=await fetch(W+'/news'); if(!r.ok) throw 0;
    var items=await r.json();
    if(!Array.isArray(items)||!items.length) throw 0;
    host.innerHTML=items.slice(0,10).map(function(n){
      var t=''; try{ var dt=new Date(n.pub); if(!isNaN(dt)) t=('0'+dt.getHours()).slice(-2)+':'+('0'+dt.getMinutes()).slice(-2); }catch(e){}
      var ttl=String(n.title||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
      return '<a class="news-row" href="'+String(n.link||'#').replace(/"/g,'&quot;')+'" target="_blank" rel="noopener">'
        +'<span class="news-src">'+String(n.src||'').replace(/</g,'&lt;')+'</span>'
        +'<span class="news-title">'+ttl+'</span>'
        +'<span class="news-time">'+t+'</span></a>';
    }).join('');
    if(tag){ tag.textContent='실시간'; tag.className='live-tag'; }
  }catch(e){ host.innerHTML='<div class="news-empty">뉴스를 불러오지 못했습니다. 프록시 주소를 확인해 주세요.</div>'; if(tag){tag.textContent='연결 실패';tag.className='sim-tag';} }
}
/* 지수 전용 조회 (stable/index-quote — 일반 quote와 엔드포인트 다름) */

/* 지수: FMP 실제 값 (항목별 유효성 검증 — 못 믿을 값은 참고값 표시) */
async function renderIndicesFMP(){
  if(await renderIndicesWorker()) return; /* Worker 실제 지수 우선 (FMP 한도 절약) */
  var tag=$id('idxTag');
  var map=await fmpQuote(FMP_INDICES.map(function(x){return x.s;}));
  if(!map){ renderIndices(); if(tag){tag.textContent='참고용';tag.style.display='';} prependKR(); return; }
  var html='', liveCount=0;
  for(var i=0;i<FMP_INDICES.length;i++){
    var ix=FMP_INDICES[i], o=map[ix.s], fb=INDICES[i];
    /* 유효성: FMP가 값을 주면(0 초과) 신뢰 */
    var valid = o && o.price>0;
    if(valid){
      html+=tRow(ix.k,ix.sub,0,(o.chg||0),{raw:fmt(o.price,2)});
      liveCount++;
    } else {
      html+=tRow(ix.k,ix.sub+' · 참고값',0,null,{raw:fb?fmt(fb.v,2):'—'});
    }
  }
  $id('indexRows').innerHTML=html;
  if(tag){ tag.textContent = liveCount>0 ? ('FMP 실시간 · ETF 기준') : '참고용'; }
  prependKR();
}

/* 원자재: FMP 실제 값 (항목별 유효성 검증) */
async function renderCommoditiesFMP(){
  /* 1순위: Worker 실제 선물가격 (금·은·WTI·천연가스·구리) */
  var W=(typeof workerUrl==='function')?workerUrl():'';
  if(W){
    try{
      var r=await fetch(W+'/comm');
      if(r.ok){
        var d=await r.json();
        if(d && (d.gold||d.wti)){
          var defs=[['gold','금 Gold','현물 $/oz',2],['silver','은 Silver','현물 $/oz',2],
                    ['wti','WTI 원유','$/배럴',2],['natgas','천연가스','$/MMBtu',3],['copper','구리 Copper','$/lb',3]];
          var h='';
          for(var i=0;i<defs.length;i++){
            var key=defs[i][0], o=d[key];
            if(o && o.price>0){ h+=tRow(defs[i][1],defs[i][2]+' · 실시간',o.price,(o.chg||0),{dec:defs[i][3]}); }
          }
          if(h){ $id('commRows').innerHTML=h; var ct=$id('commTag'); if(ct){ct.textContent='실시간 · 선물';ct.className='live-tag';} return; }
        }
      }
    }catch(e){}
  }
  /* 2순위: FMP ETF 프록시 */
  var map=await fmpQuote(FMP_COMM.map(function(x){return x.s;}));
  if(!map){ renderCommodities(); return; }
  var html='', fallback={GLD:395,SLV:49,USO:72,UNG:15,CPER:38};
  for(var i=0;i<FMP_COMM.length;i++){
    var c=FMP_COMM[i], o=map[c.s], fb=fallback[c.s];
    var valid = o && o.price>0 && (o.price > fb*0.4 && o.price < fb*1.6);
    if(valid){ html+=tRow(c.k,c.sub,o.price,(o.chg||0),{dec:c.dec}); }
    else { html+=tRow(c.k,c.sub+' · 참고값',fb,null,{dec:c.dec}); }
  }
  $id('commRows').innerHTML=html;
  var ct=$id('commTag'); if(ct){ct.textContent='ETF 기준';ct.className='sim-tag';}
}

async function macroFetch(){
  var dot=$id('liveDot'), ts=$id('macroTs');
  if(dot) dot.style.background='rgba(201,169,110,.5)';
  if(ts) ts.textContent='업데이트 중...';

  var fxOk=false;
  try{
    var r=await fetch('https://open.er-api.com/v6/latest/USD');
    if(r.ok){
      var d=await r.json(), rates=d.rates;
      krwRate=rates.KRW||krwRate;
      document.getElementById('fxRows').innerHTML=
        tRow('USD/KRW','달러/원',0,rndChg(0,.5),{raw:fmt(krwRate,1)})+
        tRow('EUR/KRW','유로/원',0,rndChg(0,.5),{raw:fmt(krwRate/rates.EUR,1)})+
        tRow('JPY/KRW','100엔/원',0,rndChg(0,.4),{raw:fmt(krwRate/rates.JPY*100,2)})+
        tRow('CNY/KRW','위안/원',0,rndChg(0,.4),{raw:fmt(krwRate/rates.CNY,1)})+
        tRow('EUR/USD','유로/달러',0,rndChg(0,.4),{raw:fmt(1/rates.EUR,4)})+
        tRow('USD/JPY','달러/엔',0,rndChg(0,.4),{raw:fmt(rates.JPY,2)});
      fxOk=true;
    }
  }catch(e){}
  if(!fxOk) document.getElementById('fxRows').innerHTML='<div class="t-err">환율 연결 실패</div>';

  var cryptoOk=false;
  try{
    var cr=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,binancecoin&vs_currencies=usd&include_24hr_change=true');
    if(cr.ok){
      var cd=await cr.json();
      var mk=function(id,sym,nm,dec){
        var o=cd[id]; if(!o) return '';
        return tRow(sym,nm,o.usd,o.usd_24h_change||0,{dec:dec});
      };
      document.getElementById('cryptoRows').innerHTML=
        mk('bitcoin','BTC','비트코인',0)+
        mk('ethereum','ETH','이더리움',2)+
        mk('binancecoin','BNB','바이낸스',2)+
        mk('solana','SOL','솔라나',2)+
        mk('ripple','XRP','리플',4);
      cryptoOk=true;
    }
  }catch(e){}
  if(!cryptoOk) document.getElementById('cryptoRows').innerHTML='<div class="t-err">CoinGecko 연결 실패</div>';

  var fng=null;
  try{
    var fr=await fetch('https://api.alternative.me/fng/');
    if(fr.ok){ var fd=await fr.json(); if(fd.data&&fd.data[0]) fng=parseInt(fd.data[0].value); }
  }catch(e){}

  var vix=null, dxy=null;
  if(finnhubKey){
    try{
      var vr=await fetch('https://finnhub.io/api/v1/quote?symbol=^VIX&token='+finnhubKey);
      if(vr.ok){ var vq=await vr.json(); if(vq.c) vix=vq.c; }
    }catch(e){}
  }

  renderIndicesFMP(); renderCommoditiesFMP(); renderRates(); renderSummary(vix,fng,dxy); fetchStocks(); renderNews(); if(typeof polMaybeRefresh==='function') polMaybeRefresh(); if(window.__wlRender) window.__wlRender();

  var now=new Date();
  var ts2=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0')+':'+now.getSeconds().toString().padStart(2,'0');
  if(dot) dot.style.background='#4caf50';
  if($id('macroTs')) $id('macroTs').textContent=ts2+' 기준';
  macroLoaded=true;
}

function macroTick(){
  if(!macroLoaded) return;
  renderNews(); /* 뉴스는 FMP 키와 무관하게 갱신 */
  if(window.__wlRender) window.__wlRender(); /* 관심종목도 프록시로 갱신 */
  var K=''; try{ K=(localStorage.getItem('nn_fmp_key')||'').trim(); }catch(e){}
  if(!K){ renderIndicesFMP(); return; } /* FMP 키 없어도 KR 실시간(prependKR)은 갱신 */
  renderIndicesFMP();
  renderCommoditiesFMP();
  fetchStocks();
}



function fmpToast(msg,kind){
  try{ if(window.__cloudToast){ window.__cloudToast(msg,kind==='out'?'out':'ok'); return; } }catch(e){}
  /* 폴백: 자체 토스트 */
  var t=document.getElementById('fmpToastEl');
  if(!t){ t=document.createElement('div'); t.id='fmpToastEl'; document.body.appendChild(t); }
  t.className='fmp-toast'+(kind==='out'?' out':'');
  t.innerHTML=msg;
  requestAnimationFrame(function(){ t.classList.add('show'); });
  clearTimeout(t.__tm); t.__tm=setTimeout(function(){ t.classList.remove('show'); }, 3200);
}
function updateFmpBadge(){
  var badge=$id('fmpKeyBadge'); if(!badge) return;
  var k=''; try{ k=(localStorage.getItem('nn_fmp_key')||'').trim(); }catch(e){}
  if(k){ badge.textContent='적용됨'; badge.className='fmp-key-badge ok'; }
  else { badge.textContent='미입력'; badge.className='fmp-key-badge empty'; }
}
function bindMacroControls(){
  var saveBtn=$id('saveFmpBtn'), input=$id('fmpKeyMacro'), refresh=$id('macroRefresh');
  var existing=''; try{ existing=(localStorage.getItem('nn_fmp_key')||'').trim(); }catch(e){}
  if(input && existing) input.value=existing;
  updateFmpBadge();
  if(saveBtn) saveBtn.addEventListener('click',function(){
    var k=(input.value||'').trim();
    try{ localStorage.setItem('nn_fmp_key',k); }catch(e){}
    updateFmpBadge();
    var hint=$id('keyHint');
    if(k){
      if(hint) hint.innerHTML = '✓ <b style="color:#7ee0a8">FMP 키가 적용되었습니다</b> — 지수·원자재·주가가 실제 값으로 전환됩니다. (RESEARCH 탭과 공유) 잠시 후 데이터가 갱신됩니다.';
      fmpToast('✅ FMP 키가 적용되었습니다 · 실시간 데이터 전환 중', 'ok');
    } else {
      if(hint) hint.innerHTML = 'FMP 키가 삭제되었습니다. 지수·원자재·주가는 참고값으로 표시됩니다.';
      fmpToast('FMP 키가 삭제되었습니다 · 참고값 모드', 'out');
    }
    macroFetch();
  });
  if(refresh) refresh.addEventListener('click',function(){ macroFetch(); fmpToast('🔄 새로고침했습니다', 'ok'); });
  /* KR 프록시 주소 */
  var wIn=$id('workerUrlMacro'), wBtn=$id('saveWorkerBtn'), wBadge=$id('workerBadge');
  function updWBadge(){ if(!wBadge) return; var w=workerUrl(); if(w){ wBadge.textContent='적용됨'; wBadge.className='fmp-key-badge ok'; } else { wBadge.textContent='미입력'; wBadge.className='fmp-key-badge empty'; } }
  if(wIn){ var ex=workerUrl(); if(ex) wIn.value=ex; }
  updWBadge();
  if(wBtn) wBtn.addEventListener('click',function(){
    var w=(wIn.value||'').trim();
    try{ localStorage.setItem('nn_worker_url',w); }catch(e){}
    updWBadge();
    if(w){ fmpToast('✅ 프록시가 적용되었습니다 · KR 실시간·뉴스 전환 중','ok'); }
    else { fmpToast('프록시가 삭제되었습니다','out'); }
    macroFetch();
  });
  /* 기준금리 — ECOS 키 (자동 갱신은 매크로 진입 시) */
  var ek=$id('ecosKey'), es=$id('ecosSave'), est=$id('ecosSt');
  function ecosStat(){
    if(!est) return;
    var k=''; try{ k=(localStorage.getItem('nn_ecos_key')||'').trim(); }catch(e){}
    est.innerHTML = k ? '✓ 인증키가 저장되어 있습니다 — 한국 기준금리도 자동으로 들어옵니다.' : '키가 없어도 미국 기준금리는 자동입니다. 한국 기준금리는 참고값(직접 수정 가능)으로 표시됩니다.';
  }
  if(ek){ try{ var ex=(localStorage.getItem('nn_ecos_key')||'').trim(); if(ex) ek.value=ex; }catch(e){} }
  ecosStat();
  if(es) es.addEventListener('click', function(){
    var v=(ek&&ek.value||'').trim();
    try{ localStorage.setItem('nn_ecos_key', v); }catch(e){}
    ecosStat();
    if(v){ fmpToast('✅ ECOS 키 저장 · 한국 기준금리를 불러옵니다','ok'); if(window.__polRefresh) window.__polRefresh(true); }
    else { fmpToast('ECOS 키를 지웠습니다','out'); if(typeof renderRates==='function') renderRates(); }
  });
}
/* 두 발급 가이드는 한 번에 하나만 (오른쪽 펼침 겹침 방지) */
(function(){
  var DUR=340;
  function bodyOf(g){ return g.querySelector('.mkg-guide-body'); }
  function isSideMode(b){
    try{ return window.getComputedStyle(b).position==='absolute'; }catch(e){ return false; }
  }
  function openIt(g){
    var b=bodyOf(g); if(!b) return;
    g.open=true;
    g.classList.add('mkg-anim');
    if(isSideMode(b)){
      /* 옆으로 펼쳐질 때: 살짝 밀려나며 나타남 */
      b.style.transition='none';
      b.style.opacity='0'; b.style.transform='translateX(-14px)';
      requestAnimationFrame(function(){
        b.style.transition='opacity '+DUR+'ms cubic-bezier(.22,1,.36,1),transform '+DUR+'ms cubic-bezier(.22,1,.36,1)';
        b.style.opacity='1'; b.style.transform='translateX(0)';
      });
    } else {
      /* 아래로 펼쳐질 때: 높이가 자라며 나타남 */
      b.style.transition='none';
      b.style.overflow='hidden'; b.style.height='0px'; b.style.opacity='0';
      requestAnimationFrame(function(){
        var h=b.scrollHeight;
        b.style.transition='height '+DUR+'ms cubic-bezier(.22,1,.36,1),opacity '+(DUR-80)+'ms ease';
        b.style.height=h+'px'; b.style.opacity='1';
      });
    }
    setTimeout(function(){
      b.style.transition=''; b.style.height=''; b.style.overflow=''; b.style.transform='';
      g.classList.remove('mkg-anim');
    }, DUR+40);
  }
  function closeIt(g, done){
    var b=bodyOf(g);
    if(!b){ g.open=false; if(done) done(); return; }
    g.classList.add('mkg-anim');
    if(isSideMode(b)){
      b.style.transition='opacity '+(DUR-100)+'ms ease,transform '+(DUR-100)+'ms cubic-bezier(.4,0,1,1)';
      b.style.opacity='0'; b.style.transform='translateX(-10px)';
    } else {
      b.style.overflow='hidden';
      b.style.height=b.scrollHeight+'px';
      requestAnimationFrame(function(){
        b.style.transition='height '+(DUR-60)+'ms cubic-bezier(.4,0,1,1),opacity '+(DUR-140)+'ms ease';
        b.style.height='0px'; b.style.opacity='0';
      });
    }
    setTimeout(function(){
      g.open=false;
      b.style.transition=''; b.style.height=''; b.style.overflow='';
      b.style.opacity=''; b.style.transform='';
      g.classList.remove('mkg-anim');
      if(done) done();
    }, DUR-40);
  }
  function bindGuides(){
    var guides=document.querySelectorAll('.macro-keyguide');
    if(!guides.length){ setTimeout(bindGuides, 200); return; }
    guides.forEach(function(g){
      var sm=g.querySelector('summary');
      if(!sm || sm.__anim) return;
      sm.__anim=1;
      sm.addEventListener('click', function(e){
        e.preventDefault();
        if(g.classList.contains('mkg-anim')) return;   /* 연타 방지 */
        if(g.open){ closeIt(g); return; }
        /* 다른 안내가 열려 있으면 닫고 나서 연다 */
        var other=null;
        guides.forEach(function(o){ if(o!==g && o.open) other=o; });
        if(other) closeIt(other, function(){ openIt(g); });
        else openIt(g);
      });
    });
  }
  (function ready(){
    if(document.querySelector('.macro-keyguide')){ bindGuides(); return; }
    if(document.body && document.readyState!=='loading'){ bindGuides(); return; }
    setTimeout(ready, 100);
  })();
})();
bindMacroControls();
setInterval(macroTick,120000);
/* ── [교정 완료] 마퀴 전광판 자바스크립트 엔진 (컴마 및 함수 누락 완벽 복구) ── */
function homeTickerCfg(symbols){
  return { symbols:symbols, showSymbolLogo:true, isTransparent:true, displayMode:'regular', colorTheme:'dark' }; /* regular = 종목명·주가 항상 한 줄 */
}

// 🏆 매크로 상단: 미국 시장 시가총액 1~20위 (순차) 티커테이프 마퀴


// 📊 1번 줄: 글로벌 시장 지표 및 채권/주식 변동성 지수 (MARKETS & MACRO)
/* ══ 마퀴 종목 편집 시스템 — 기본값 + 사용자 편집(localStorage) ══ */
var TK_DEFAULTS={
  home1:[
    {proName:'FOREXCOM:SPXUSD', title:'S&P 500'},
    {proName:'FOREXCOM:NSXUSD', title:'NASDAQ 100'},
    {proName:'SSE:000001',      title:'상하이종합'},
     {proName:'INDEX:NKY',       title:'NIKKEI 225'},
    {proName:'NASDAQ:SOXX',     title:'반도체 SOXX'},
    {proName:'CAPITALCOM:VIX',         title:'VIX 공포지수'},
    {proName:'NASDAQ:TLT',      title:'미국 장기채 TLT'},
    {proName:'CAPITALCOM:DXY',         title:'DXY'},
    {proName:'FX_IDC:USDKRW',   title:'USD/KRW'},
    {proName:'TVC:GOLD',        title:'GOLD'},
    {proName:'TVC:USOIL',       title:'WTI'},
    {proName:'FRED:DGS10',      title:'미국 10년물 금리'},
    {proName:'BINANCE:BTCUSDT',  title:'비트코인'},
    {proName:'BINANCE:ETHUSDT',  title:'이더리움'},
    {proName:'BINANCE:SOLUSDT',  title:'솔라나'}
  ],
  home2:[
    {proName:'NASDAQ:NVDA',  title:'엔비디아'},
    {proName:'NASDAQ:AAPL',  title:'애플'},
    {proName:'NASDAQ:GOOGL', title:'알파벳'},
    {proName:'NASDAQ:MSFT',  title:'마이크로소프트'},
    {proName:'NASDAQ:AMZN',  title:'아마존'},
    {proName:'NYSE:TSM',     title:'TSMC'},
    {proName:'NASDAQ:AVGO',  title:'브로드컴'},
    {proName:'NASDAQ:TSLA',  title:'테슬라'},
    {proName:'NASDAQ:MU',    title:'마이크론'},
    {proName:'NASDAQ:META',  title:'메타'},
    {proName:'NASDAQ:SPCX',  title:'스페이스X'},
    {proName:'NYSE:LLY',     title:'일라이릴리'},
    {proName:'NASDAQ:IREN',  title:'아이렌'},
    {proName:'NASDAQ:NBIS',  title:'네비우스'},
    {proName:'NASDAQ:RKLB',  title:'로켓랩'},
    {proName:'CBOE:DRAM',    title:'DRAM ETF'},
    {proName:'NYSE:CRCL',    title:'서클'},
    {proName:'NYSE:INFQ',    title:'인플렉션'}
  ],
  macro:[
    {proName:'NASDAQ:NVDA',  title:'엔비디아'},
    {proName:'NASDAQ:MSFT',  title:'마이크로소프트'},
    {proName:'NASDAQ:AAPL',  title:'애플'},
    {proName:'NASDAQ:GOOGL', title:'알파벳'},
    {proName:'NASDAQ:AMZN',  title:'아마존'},
    {proName:'NASDAQ:META',  title:'메타'},
    {proName:'NASDAQ:AVGO',  title:'브로드컴'},
    {proName:'NASDAQ:TSLA',  title:'테슬라'},
    {proName:'NYSE:BRK.B',   title:'버크셔'},
    {proName:'NYSE:TSM',     title:'TSMC'},
    {proName:'NYSE:LLY',     title:'일라이릴리'},
    {proName:'NYSE:WMT',     title:'월마트'},
    {proName:'NYSE:JPM',     title:'JP모건'},
    {proName:'NYSE:V',       title:'비자'},
    {proName:'NYSE:ORCL',    title:'오라클'},
    {proName:'NYSE:MA',      title:'마스터카드'},
    {proName:'NASDAQ:NFLX',  title:'넷플릭스'},
    {proName:'NYSE:XOM',     title:'엑슨모빌'},
    {proName:'NASDAQ:COST',  title:'코스트코'},
    {proName:'NYSE:JNJ',     title:'존슨앤존슨'}
  ]
};
var TK_KEY='nn_ticker_v1';
function tkLoadAll(){
  try{ var s=localStorage.getItem(TK_KEY); if(s){ var o=JSON.parse(s); if(o&&typeof o==='object') return o; } }catch(e){}
  return {};
}
function tkList(id){
  var all=tkLoadAll();
  var l=all[id];
  if(Array.isArray(l)&&l.length) return l;
  return JSON.parse(JSON.stringify(TK_DEFAULTS[id]||[]));
}
function tkSave(id,list){
  var all=tkLoadAll(); all[id]=list;
  try{ localStorage.setItem(TK_KEY, JSON.stringify(all)); }catch(e){}
}
function tkReset(id){
  var all=tkLoadAll(); delete all[id];
  try{ localStorage.setItem(TK_KEY, JSON.stringify(all)); }catch(e){}
}
function tkRebuild(id){
  var sel={home1:'#homeTicker1',home2:'#homeTicker2',macro:'#homeTicker1'}[id];
  if(!sel) return;
  var root=document.querySelector(sel); if(!root) return;
  root.__tvLoaded=false;
  var m=root.querySelector('.tradingview-widget-container__widget');
  if(m) m.innerHTML='';
  tvBuildIframe(sel,'ticker-tape', homeTickerCfg(tkList(id)));
}
window.__tkList=tkList; window.__tkSave=tkSave; window.__tkReset=tkReset; window.__tkRebuild=tkRebuild;

function initHomeTicker1(){ tvBuildIframe('#homeTicker1','ticker-tape', homeTickerCfg(tkList('home1'))); }
function initHomeTicker2(){ tvBuildIframe('#homeTicker2','ticker-tape', homeTickerCfg(tkList('home2'))); }


// 🚀 전광판 초기화 및 지연 로딩 가동 마스터 함수 (구조적 증발 복구 완료)
function initHomeTickers(){
  /* 마퀴는 MACRO 탭으로 이전됨 — 홈에서는 초기화하지 않음 */
}
/* 홈 재진입 시 재빌드 (TradingView 위젯은 display:none→다시보임 때 깨지므로) */
function rebuildHomeTickers(){
  ['#homeTicker1','#homeTicker2',].forEach(function(sel){
    var root=document.querySelector(sel);
    if(!root) return;
    root.__tvLoaded=false;
    var m=root.querySelector('.tradingview-widget-container__widget');
    if(m) m.innerHTML='';
  });
  initHomeTicker1(); initHomeTicker2();}
initHomeTickers();
// 창 크기 변경 시 히트맵 다시 그리기 (디바운스)
var __hmResizeT;
window.addEventListener('resize', function(){
  clearTimeout(__hmResizeT);
  __hmResizeT=setTimeout(function(){ if(typeof renderHeatmap==='function') renderHeatmap(); }, 200);
});


/* ══ 4K 단일 이미지 복원형 관성 패럴랙스 및 타임 가림막 통합 엔진 ══ */
var prevSec='';
/* ── 한국 공휴일 판정 (달력·시계 공용) ── */
var KR_FIXED=['01-01','03-01','05-05','06-06','08-15','10-03','10-09','12-25'];
var KR_EXTRA={
  '2026':['02-16','02-17','02-18','03-02','05-24','05-25','06-03','07-17','08-17','09-24','09-25','09-26','10-05']
};
function isKrHoliday(y,m,d){
  var mm=String(m).padStart(2,'0'), dd=String(d).padStart(2,'0'), key=mm+'-'+dd;
  return KR_FIXED.indexOf(key)>=0 || ((KR_EXTRA[String(y)]||[]).indexOf(key)>=0);
}
window.__isKrHoliday=isKrHoliday;

/* ══════════ 미니 실시간 캘린더 (날짜 클릭·호버 시 펼침) ══════════ */
var __calRef=null, __calPinned=false, __calHideT=null;
function initMiniCalendar(){
  var dateEl=document.getElementById('clkDate'); if(!dateEl || dateEl.__calBound) return;
  dateEl.__calBound=true;
  var wrap=document.querySelector('.nn-clock-wrap'); if(!wrap) return;
  var pop=document.getElementById('miniCal');
  if(!pop){
    pop=document.createElement('div');
    pop.id='miniCal'; pop.className='mini-cal';
    document.body.appendChild(pop);   /* 히어로 overflow:hidden 에 잘리지 않도록 body 직속 */
  }
  function place(){
    var r=dateEl.getBoundingClientRect();
    var w=pop.offsetWidth||236;
    var center=r.left + r.width/2;                       /* 날짜 텍스트 중심 */
    pop.style.left=Math.max(10, Math.min(center - w/2, window.innerWidth - w - 10))+'px';
    pop.style.top=(r.bottom+12)+'px';
  }
  var now=new Date();
  __calRef={y:now.getFullYear(), m:now.getMonth()};
  function show(){ clearTimeout(__calHideT); renderMiniCalendar(); place(); pop.classList.add('on'); }
  function hide(force){
    if(__calPinned && !force) return;
    clearTimeout(__calHideT);
    __calHideT=setTimeout(function(){ pop.classList.remove('on'); }, 220);
  }
  dateEl.addEventListener('mouseenter',show);
  dateEl.addEventListener('mouseleave',function(){ hide(false); });
  pop.addEventListener('mouseenter',function(){ clearTimeout(__calHideT); });
  pop.addEventListener('mouseleave',function(){ hide(false); });
  dateEl.addEventListener('click',function(e){
    e.stopPropagation();
    __calPinned=!__calPinned;
    if(__calPinned){ show(); pop.classList.add('pinned'); }
    else { pop.classList.remove('pinned'); hide(true); }
  });
  window.addEventListener('scroll',function(){ if(pop.classList.contains('on')) place(); },{passive:true});
  window.addEventListener('resize',function(){ if(pop.classList.contains('on')) place(); });
  document.addEventListener('click',function(e){
    if(!pop.contains(e.target) && e.target!==dateEl){
      __calPinned=false; pop.classList.remove('pinned'); hide(true);
    }
  });
}

function renderMiniCalendar(){
  var pop=document.getElementById('miniCal'); if(!pop || !__calRef) return;
  var Y=__calRef.y, Mo=__calRef.m;                 /* Mo: 0-11 */
  var today=new Date();
  var first=new Date(Y,Mo,1), last=new Date(Y,Mo+1,0);
  var startDow=first.getDay(), total=last.getDate();
  var MN=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  var head='<div class="mc-head">'
    + '<button type="button" class="mc-nav" data-mv="-1">&#8249;</button>'
    + '<div class="mc-title"><span class="mc-mon">'+MN[Mo]+'</span><span class="mc-year">'+Y+'</span></div>'
    + '<button type="button" class="mc-nav" data-mv="1">&#8250;</button>'
    + '</div>';
  /* D-DAY 일정 로드 (해당 월) */
  var evMap={}, evList=[];
  try{
    var raw=localStorage.getItem('nn_dday_v1');
    if(raw){
      var all=JSON.parse(raw);
      if(Array.isArray(all)){
        all.forEach(function(x){
          var p=String(x.d||'').split('-');
          if(p.length!==3) return;
          if(parseInt(p[0],10)===Y && parseInt(p[1],10)===Mo+1){
            var dd=parseInt(p[2],10);
            if(!evMap[dd]) evMap[dd]=[];
            evMap[dd].push(x.t||'');
            evList.push({d:dd, t:x.t||''});
          }
        });
      }
    }
  }catch(e){}
  evList.sort(function(a,b){ return a.d-b.d; });
  var dowNames=['S','M','T','W','T','F','S'];
  var grid='<div class="mc-grid">';
  for(var i=0;i<7;i++){
    var wc = i===0?' mc-sun':(i===6?' mc-sat':'');
    grid+='<span class="mc-dow'+wc+'">'+dowNames[i]+'</span>';
  }
  for(var b=0;b<startDow;b++) grid+='<span class="mc-cell mc-empty"></span>';
  for(var day=1;day<=total;day++){
    var dw=(startDow+day-1)%7;
    var cls='mc-cell';
    if(dw===0 || isKrHoliday(Y,Mo+1,day)) cls+=' mc-sun';
    else if(dw===6) cls+=' mc-sat';
    if(Y===today.getFullYear() && Mo===today.getMonth() && day===today.getDate()) cls+=' mc-today';
    var evs=evMap[day];
    if(evs && evs.length) cls+=' mc-ev';
    var ttl=(evs && evs.length) ? ' title="'+String(evs.join(' · ')).replace(/"/g,'&quot;')+'"' : '';
    grid+='<span class="'+cls+'"'+ttl+'>'+day+'</span>';
  }
  grid+='</div>';
  var hh=String(today.getHours()).padStart(2,'0'), mm=String(today.getMinutes()).padStart(2,'0');
  var foot='<div class="mc-foot"><span class="mc-live"><i></i>TODAY</span>'
    + '<span class="mc-now">'+today.getFullYear()+'.'+String(today.getMonth()+1).padStart(2,'0')+'.'+String(today.getDate()).padStart(2,'0')+' '+hh+':'+mm+'</span></div>';
  var evHtml='';
  if(evList.length){
    evHtml='<div class="mc-evlist">'+evList.slice(0,4).map(function(e){
      return '<div class="mc-ev-item"><span class="mc-ev-dot"></span>'
        + '<span class="mc-ev-d">'+String(e.d).padStart(2,'0')+'일</span>'
        + '<span class="mc-ev-t">'+String(e.t).replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</span></div>';
    }).join('')+'</div>';
  }
  pop.innerHTML=head+grid+evHtml+foot;
  pop.querySelectorAll('.mc-nav').forEach(function(b){
    b.onclick=function(e){
      e.stopPropagation();
      var mv=parseInt(b.getAttribute('data-mv'),10);
      var nm=__calRef.m+mv, ny=__calRef.y;
      if(nm<0){ nm=11; ny--; } else if(nm>11){ nm=0; ny++; }
      __calRef={y:ny,m:nm};
      renderMiniCalendar();
    };
  });
}

window.updateClock = function(){
  var el=document.getElementById('liveClock'); if(!el) return;
  var now=new Date();
  var y=now.getFullYear(), M=now.getMonth()+1, D=now.getDate();
  var mo=String(M).padStart(2,'0'), d=String(D).padStart(2,'0');
  var h=String(now.getHours()).padStart(2,'0'), mi=String(now.getMinutes()).padStart(2,'0'), s=String(now.getSeconds()).padStart(2,'0');
  var days=['SUN','MON','TUE','WED','THU','FRI','SAT'], dow=now.getDay(), dayStr=days[dow];

  /* 골격은 최초 1회만 생성 — 매초 재생성하지 않아 시·분 발광이 끊기지 않음 */
  if(!el.__built){
    el.innerHTML=
        '<span class="clk-cap">'
      +   '<span class="clk-brand"><i class="clk-dot"></i>ARCHIVE</span>'
      +   '<span class="clk-div"></span>'
      +   '<span class="clk-date" id="clkDate" title="클릭하면 달력이 열립니다"></span>'
      +   '<span class="clk-day" id="clkDay"></span>'
      +   '<span class="clk-div"></span>'
      +   '<span class="clk-time"><span class="clk-hm" id="clkHM" data-t=""><i class="hm-h"></i><i class="clk-colon">:</i><i class="hm-m"></i></span>'
      +     '<i class="clk-scolon">:</i><span class="clk-sec" id="clkSec" data-t=""></span></span>'
      + '</span>';
    el.__built=true;
    el.__prev={};
    try{ initMiniCalendar(); }catch(e){}
    setTimeout(function(){ try{ initMiniCalendar(); }catch(e){} }, 300);
  }
  var P=el.__prev, q=function(id){ return document.getElementById(id); };

  /* 날짜 (바뀔 때만 갱신) */
  var dateKey=y+'-'+mo+'-'+d;
  if(P.date!==dateKey){
    P.date=dateKey;
    var dt=q('clkDate'); if(dt) dt.innerHTML=y+'<i class="clk-sep">.</i>'+mo+'<i class="clk-sep">.</i>'+d;
    var dy=q('clkDay');
    if(dy){
      dy.textContent=dayStr;
      dy.className='clk-day'+((dow===0||isKrHoliday(y,M,D))?' clk-day-sun':(dow===6?' clk-day-sat':''));
    }
    if(typeof renderMiniCalendar==='function') renderMiniCalendar();
  }

  /* 시·분 (바뀔 때만 갱신 — 발광 애니메이션 유지) */
  var hm=h+':'+mi;
  if(P.hm!==hm){
    P.hm=hm;
    var hmEl=q('clkHM');
    if(hmEl){
      hmEl.setAttribute('data-t',hm);
      var hh=hmEl.querySelector('.hm-h'), mm2=hmEl.querySelector('.hm-m');
      if(hh) hh.textContent=h;
      if(mm2) mm2.textContent=mi;
    }
  }

  /* 초 (매초 롤 전환) */
  if(P.sec!==s){
    var secEl=q('clkSec');
    if(secEl){
      secEl.setAttribute('data-t',s);
      var d0=s.charAt(0), d1=s.charAt(1);
      var p0=(P.sec||'').charAt(0), p1=(P.sec||'').charAt(1);
      function mkDigit(nw, ol, changed){
        if(!changed || ol==='') return '<span class="clk-d">'+nw+'</span>';
        return '<span class="clk-d rolling"><i class="d-new">'+nw+'</i><i class="d-old">'+ol+'</i></span>';
      }
      secEl.innerHTML=mkDigit(d0,p0,!!P.sec&&d0!==p0)+mkDigit(d1,p1,!!P.sec&&d1!==p1);
    }
    P.sec=s;
  }
  prevSec=s;
};

var runParallax = function(){
  const cards = document.querySelectorAll('.comp-card');
  if(!cards.length) return;
  let lastY = window.scrollY; let velocity = 0; let targetVelocity = 0;
  let running = false; let idleFrames = 0;
  function lerp(a, b, t){ return a + (b - a) * t; }
  function tick(){
    const currentY = window.scrollY; targetVelocity = currentY - lastY; lastY = currentY;
    velocity = lerp(velocity, targetVelocity, 0.2);
    if(Math.abs(velocity) < 0.08) velocity = 0; // 서브픽셀 꼬리 제거(하단 플리커 방지)

    let anyVisible = false;
    cards.forEach(function(card){
      const rect = card.getBoundingClientRect(); const vh = window.innerHeight;
      if(rect.bottom < -100 || rect.top > vh + 100){ return; }
      anyVisible = true;
      const ratio = card.dataset.parallax ? parseFloat(card.dataset.parallax) : 0.14;
      const centerOffset = (rect.top + rect.height / 2) - vh / 2;
      const bg = card.querySelector('.comp-bg');
      if(bg){
        // 카드 중심이 화면 중앙에서 떨어진 정도를 -1~1로 정규화
        var norm = centerOffset / (vh/2 + rect.height/2);
        if(norm < -1) norm = -1; if(norm > 1) norm = 1;
        // scale(1.18)로 생긴 약 9% 여유 안에서만 세로 이동 → 가장자리 안 드러남
        var shiftPct = norm * ratio * 3; // 카드 높이 대비 % (최대 약 ±3% — scale 1.22 여유 11% 내 안전)
        var sp = shiftPct.toFixed(1);
        if(bg.__sp !== sp){ bg.__sp = sp; bg.style.transform = 'scale(1.22) translateY(' + sp + '%)'; }
      }
      var floatY = velocity * 1.4 * ratio;
      // 과한 튐 방지: 최대 ±42px로 제한
      if(floatY > 42) floatY = 42; if(floatY < -42) floatY = -42;
      // reveal 떠오름이 완전히 끝난(reveal-done) 카드만 패럴랙스 적용 — 떠오르는 중엔 건드리지 않음
      var fy = Math.round(floatY); if(Math.abs(fy) < 1) fy = 0;
      if(!card.classList.contains('reveal-up') || card.classList.contains('reveal-done')){
        if(card.__fy !== fy){ card.__fy = fy; card.style.transform = 'translateY(' + fy + 'px)'; }
      }
    });

    // 스크롤이 멈추고 카드 움직임이 잦아들면 루프 정지 (CPU 절약)
    if(Math.abs(targetVelocity) < 0.5 && Math.abs(velocity) < 0.1){ idleFrames++; } else { idleFrames = 0; }
    if(idleFrames > 30 || !anyVisible){ running = false; return; }
    requestAnimationFrame(tick);
  }
  function start(){ if(!running){ running = true; idleFrames = 0; tick(); } }
  window.addEventListener('scroll', start, {passive:true});
  start();
};


/* ══ 노션 스타일 서식 지정, 이미지 클릭 크기 조절 및 자동 정렬 통합 엔진 (문법 완전 교정본) ══ */
var ECON_SEED_CONTENT = '<div class="np-note" contenteditable="false" style="border-left-color:rgba(204,255,0,.5)">📝 <b>예시 페이지입니다.</b> ECONOMICS 탭 사용법을 보여드리는 샘플이에요. 자유롭게 수정하거나 카드의 ✕로 삭제하세요.</div><h2>72의 법칙 (Rule of 72)</h2><p>복리 수익률로 <b>원금이 두 배</b>가 되는 데 걸리는 시간을 빠르게 어림하는 방법. <b>72 ÷ 연이율(%)</b> = 대략적인 소요 연수.</p><ul><li>연 6% → 72 ÷ 6 = <b>약 12년</b>이면 자산이 2배</li><li>연 9% → 72 ÷ 9 = <b>약 8년</b></li><li>인플레이션에도 적용 — 물가가 연 3%씩 오르면 24년 뒤 화폐가치는 절반</li></ul><blockquote>작은 수익률 차이가 장기적으로 자산 규모를 완전히 바꾼다 — 복리는 시간의 함수다.</blockquote><p><br></p>';
var MEDIA_SEED_CONTENT = '<div class="np-note" contenteditable="false" style="border-left-color:rgba(178,138,212,.6)">📝 <b>예시 페이지입니다.</b> MEDIA 탭 사용법을 보여드리는 샘플이에요. 다큐·영상·팟캐스트에서 얻은 인사이트를 이렇게 정리하세요. 자유롭게 수정하거나 ✕로 삭제하세요.</div><h2>다큐멘터리 · Inside Job (2010)</h2><div class="nn-props" contenteditable="false"><div class="nn-prop"><span class="np-k">🎬 유형</span><span class="np-v" contenteditable="true">다큐멘터리</span></div><div class="nn-prop"><span class="np-k">⭐ 추천도</span><span class="np-v" contenteditable="true">★★★★★</span></div></div><p>2008 금융위기의 구조적 원인을 추적한 다큐. 파생상품·신용평가사·규제 실패가 어떻게 맞물렸는지 보여준다.</p><div style="font-weight:700;margin-top:12px">📌 핵심 메모</div><ul><li>위기는 예측 불가능한 사고가 아니라 <b>인센티브 구조가 만든 필연</b>이었다.</li><li>리스크를 감춘 금융상품일수록 등급은 높았다 — 복잡성은 종종 위험의 위장막이다.</li></ul><p><br></p>';
window.KnowledgeNotes = {
  data: { books: [], lexicon: [], economics: [], media: [], thesis: [] },
  activeIds: { books: null, lexicon: null, economics: null, media: null, thesis: null },

  init: function() {
    var self = this;
    if(!this._tablePopupBound){
      this._tablePopupBound = true;
      document.addEventListener('click', function(e){
        var inPopup = e.target.closest && e.target.closest('.nn-table-popup');
        var inCell = e.target.closest && e.target.closest('table.nn-table td');
        if(!inPopup && !inCell) self.hideTablePopup();
      }, true);
    }
    
    try {
      var saved = localStorage.getItem('nn_knowledge_vault_v2');
      if (saved) {
        this.data = JSON.parse(saved);
// 📡 인텔리전스 리서치 전용 다차원 서브 메모리 할당
      this.data.holdIntel = this.data.holdIntel || {};
      this.data.thesis = this.data.thesis || [];
      } else {
        var initialBookContent = 
          '<div class="nn-callout"><span class="nn-callout-icon" contenteditable="false">💡</span><div class="nn-callout-body"><b>한 줄 총평:</b> 돈을 다루는 능력은 수학적 지능이 아니라 마음의 성향, 즉 심리의 문제다. 살아남는 자가 통찰을 얻는다.</div></div>' +
          '<p><br></p>' +
          '<table class="nn-table" style="width:100%;">' +
          '<tbody>' +
          '<tr><td style="background:#f5f3ee;font-weight:600;width:30%;">도서명</td><td style="background:#f5f3ee;font-weight:600;width:25%;">저자</td><td style="background:#f5f3ee;font-weight:600;width:25%;">평점</td><td style="background:#f5f3ee;font-weight:600;width:20%;">완독일</td></tr>' +
          '<tr><td>돈의 심리학</td><td>모건 하우절</td><td>⭐⭐⭐⭐⭐</td><td>2026.06.24</td></tr>' +
          '</tbody>' +
          '</table>' +
          '<p><br></p>' +
          '<h3>내 마음에 남은 핵심 문장들</h3>' +
          '<ul>' +
          '<li>"부자가 되는 것보다 부자로 남는 것이 더 어렵다. 여기에는 겸손함과 생존 능력이 필요하다."</li>' +
          '<li>"내가 원할 때, 원하는 사람과, 원하는 만큼 시간을 보낼 수 있다는 것. 그것이 돈이 주는 가장 큰 배당금이다."</li>' +
          '<li>"남들의 눈치나 유행에 휩쓸리지 않고, 나만의 자산 스케줄을 유지하는 독립성이 최고의 자산 방어 기제다."</li>' +
          '</ul>' +
          '<hr>' +
          '<h3>삶에 변화를 줄 행동 지침 (Action Item)</h3>' +
          '<div class="nn-check" contenteditable="false"><input type="checkbox"><span>매월 수입의 일정 비율은 자산 시장의 등락과 상관없이 무조건 적립식 우량주/ETF 매수하기</span></div>' +
          '<div class="nn-check" contenteditable="false"><input type="checkbox"><span>과시 소비성 지출 항목 점검하고 리서치 기록 도구 구독 자금으로 일원화하기</span></div>' +
          '<p><br></p>';

        this.data = {
          books: [],
          lexicon: [], economics: [], media: [], thesis: []
        };
      }
    } catch(e) {
      this.data = { books: [], lexicon: [], economics: [], media: [], thesis: [] };
    }

    if(!this.groups) this.groups = {};
    var savedGroups = null;
    try { savedGroups = JSON.parse(localStorage.getItem('nn_knowledge_groups_v1')); } catch(e){}
    
    ['books', 'lexicon', 'economics', 'media'].forEach(function(t){
      if(!this.data[t]) this.data[t] = [];
      if(savedGroups && savedGroups[t]) {
        this.groups[t] = savedGroups[t];
        /* books 필수 3그룹 보정: 저장본에 누락된 기본 그룹 복원 */
        if (t === 'books') {
          var need = [
            { id: 'grp_books_wish', name: '사고 싶은 책 🛒', collapsed: false, parentId: null, icon: '🛒' },
            { id: 'grp_books_reading', name: '읽는 중 📖', collapsed: false, parentId: null, icon: '📖' },
            { id: 'grp_books_done', name: '완독 📚', collapsed: false, parentId: null, icon: '📚' }
          ];
          var have = this.groups[t].map(function(g){ return g.id; });
          need.forEach(function(ng, idx){ if(have.indexOf(ng.id)<0){ this.groups[t].splice(idx,0,ng); } }, this);
        }
        /* economics/media 기본 그룹 보정 */
        if (t === 'economics' && !this.groups[t].some(function(g){ return g.id==='grp_econ_main'; })) {
          this.groups[t].unshift({ id: 'grp_econ_main', name: '핵심 개념 (예시) 📈', collapsed: false, parentId: null, icon: '📈' });
        }
        if (t === 'media' && !this.groups[t].some(function(g){ return g.id==='grp_media_main'; })) {
          this.groups[t].unshift({ id: 'grp_media_main', name: '아카이브 (예시) 🎬', collapsed: false, parentId: null, icon: '🎬' });
        }
        /* 예전 이름 → (예시) 라벨 1회 갱신 */
        this.groups[t].forEach(function(g){
          if(g.id==='grp_econ_main' && g.name==='핵심 개념 📈') g.name='핵심 개념 (예시) 📈';
          if(g.id==='grp_media_main' && g.name==='아카이브 🎬') g.name='아카이브 (예시) 🎬';
        });
      } else {
        if (t === 'books') {
          this.groups[t] = [
            { id: 'grp_books_wish', name: '사고 싶은 책 🛒', collapsed: false, parentId: null, icon: '🛒' },
            { id: 'grp_books_reading', name: '읽는 중 📖', collapsed: false, parentId: null, icon: '📖' },
            { id: 'grp_books_done', name: '완독 📚', collapsed: false, parentId: null, icon: '📚' }
          ];
        } else if (t === 'lexicon') {
          this.groups[t] = [
            { id: 'grp_lexicon_econ', name: '경제 관련 📊', collapsed: false, parentId: null, icon: '📊' },
            { id: 'grp_lexicon_general', name: '일반 관련 💡', collapsed: false, parentId: null, icon: '💡' },
            { id: 'grp_lexicon_english', name: '영어 단어 🔤', collapsed: false, parentId: null, icon: '📇' }
          ];
        } else if (t === 'economics') {
          this.groups[t] = [ { id: 'grp_econ_main', name: '핵심 개념 (예시) 📈', collapsed: false, parentId: null, icon: '📈' } ];
        } else if (t === 'media') {
          this.groups[t] = [ { id: 'grp_media_main', name: '아카이브 (예시) 🎬', collapsed: false, parentId: null, icon: '🎬' } ];
        } else {
          this.groups[t] = [];
        }
      }
      this.data[t].forEach(function(p){ if(!p.id) p.id = 'p_' + Math.random().toString(36).substr(2,9); });
      /* 예시 책: 서재가 비어있는 방문자에게 FROM MY LIBRARY 시연용 */
      if (t === 'books' && !this.data.books.some(function(b){ return b && b.id === 'p_seed_lynch'; })) {
        this.data.books.push({
          id: 'p_seed_lynch',
          title: '전설로 떠나는 월가의 영웅',
          icon: '',
          cover: 'https://covers.openlibrary.org/b/isbn/0743200403-L.jpg',
          date: '2026-07-05',
          groupId: 'grp_books_done',
          content: '<div class="nn-props" contenteditable="false"><div class="nn-prop"><span class="np-k">✍️ 작가</span><span class="np-v" contenteditable="true" data-ph="비어 있음">피터 린치</span></div><div class="nn-prop"><span class="np-k">⭐ 별점</span><span class="np-stars" data-rating="4.5"><i class="st" data-v="1"><b class="h1" data-half="0.5"></b><b class="h2" data-half="1.0"></b></i><i class="st" data-v="2"><b class="h1" data-half="1.5"></b><b class="h2" data-half="2.0"></b></i><i class="st" data-v="3"><b class="h1" data-half="2.5"></b><b class="h2" data-half="3.0"></b></i><i class="st" data-v="4"><b class="h1" data-half="3.5"></b><b class="h2" data-half="4.0"></b></i><i class="st" data-v="5"><b class="h1" data-half="4.5"></b><b class="h2" data-half="5.0"></b></i></span></div><div class="nn-prop"><span class="np-k">🏷️ 종류</span><span class="np-cat" data-cat="투자"><span class="cat-chip">투자</span></span></div><div class="nn-prop"><span class="np-k">📅 읽기 시작한 날짜</span><span class="np-v" contenteditable="true" data-ph="예: 2026/07/01">2026/06/21 (일)</span></div><div class="nn-prop"><span class="np-k">🏁 다 읽은 날짜</span><span class="np-v" contenteditable="true" data-ph="예: 2026/07/08">2026/07/05 (일)</span></div></div><div class="np-note" contenteditable="false" style="border-left-color:rgba(127,168,212,.6)">📖 <b>이 책은 예시입니다.</b> BOOKS 사용법을 보여드리기 위한 샘플이에요. 위 작가·날짜·별점·종류를 눌러 직접 편집해 보고, 아래 구절도 자유롭게 바꿔보세요. 필요 없으면 카드의 ✕로 삭제하면 됩니다.</div><div style="font-weight:700;margin-top:12px">📌 인상 깊은 구절</div><div class="np-note" contenteditable="false">💡 점(•)에 쓴 문장은 이 책이 <b>완독</b> 그룹에 있을 때 홈 화면의 FROM MY LIBRARY 카드에 랜덤으로 표시됩니다. 백스페이스로 점을 지운 일반 줄은 표시되지 않아 자유 메모로 쓸 수 있어요.</div><ul><li>일상 속에서 위대한 기업의 단서를 가장 먼저 발견하는 사람은 언제나 평범한 개인 투자자다.</li><li>시장의 조정을 예측하려 애쓰다 잃은 돈이, 조정 그 자체로 잃은 돈보다 훨씬 많다.</li><li>텐베거의 비밀은 단순하다 — 뛰어난 기업을, 충분히 오래, 흔들리지 않고 보유하는 것.</li></ul><div><br></div>'
        });
      }
      /* 예시 페이지: economics / media (사용법 시연용) */
      if (t === 'economics' && !this.data.economics.some(function(p){ return p && p.id === 'p_seed_econ'; })) {
        this.data.economics.push({ id: 'p_seed_econ', title: '72의 법칙 (예시 작성)', icon: '📈', date: this._nowStr(), groupId: 'grp_econ_main', content: ECON_SEED_CONTENT });
      }
      if (t === 'media' && !this.data.media.some(function(p){ return p && p.id === 'p_seed_media'; })) {
        this.data.media.push({ id: 'p_seed_media', title: '[예시] TERAFAB — 사상 최대 반도체 팹', icon: '🎬', date: this._nowStr(), groupId: 'grp_media_main', url: 'https://www.youtube.com/watch?v=Txt3Wodav1o', content: 'Tesla·SpaceX·xAI가 로직·메모리·첨단 패키징을 한 지붕 아래 통합하는 초대형 반도체 제조 시설(TERAFAB) 구상. 수직 통합이 칩 공급망과 AI 하드웨어 경쟁에 어떤 의미인지 짚어볼 것. (예시 카드 — 링크를 붙이면 썸네일이 자동으로 뜹니다. ✕로 삭제하세요.)' });
      }
      /* 구버전 시드(예시 안내 없는)면 최신 안내 포함본으로 1회 교체 */
      if (t === 'books') {
        var _seed = this.data.books.filter(function(b){ return b && b.id === 'p_seed_lynch'; })[0];
        if (_seed && (_seed.content||'').indexOf('이 책은 예시입니다') === -1) {
          _seed.groupId = 'grp_books_done';
          _seed.content = '<div class="nn-props" contenteditable="false"><div class="nn-prop"><span class="np-k">✍️ 작가</span><span class="np-v" contenteditable="true" data-ph="비어 있음">피터 린치</span></div><div class="nn-prop"><span class="np-k">⭐ 별점</span><span class="np-stars" data-rating="4.5"><i class="st" data-v="1"><b class="h1" data-half="0.5"></b><b class="h2" data-half="1.0"></b></i><i class="st" data-v="2"><b class="h1" data-half="1.5"></b><b class="h2" data-half="2.0"></b></i><i class="st" data-v="3"><b class="h1" data-half="2.5"></b><b class="h2" data-half="3.0"></b></i><i class="st" data-v="4"><b class="h1" data-half="3.5"></b><b class="h2" data-half="4.0"></b></i><i class="st" data-v="5"><b class="h1" data-half="4.5"></b><b class="h2" data-half="5.0"></b></i></span></div><div class="nn-prop"><span class="np-k">🏷️ 종류</span><span class="np-cat" data-cat="투자"><span class="cat-chip">투자</span></span></div><div class="nn-prop"><span class="np-k">📅 읽기 시작한 날짜</span><span class="np-v" contenteditable="true" data-ph="예: 2026/07/01">2026/06/21 (일)</span></div><div class="nn-prop"><span class="np-k">🏁 다 읽은 날짜</span><span class="np-v" contenteditable="true" data-ph="예: 2026/07/08">2026/07/05 (일)</span></div></div><div class="np-note" contenteditable="false" style="border-left-color:rgba(127,168,212,.6)">📖 <b>이 책은 예시입니다.</b> BOOKS 사용법을 보여드리기 위한 샘플이에요. 위 작가·날짜·별점·종류를 눌러 직접 편집해 보고, 아래 구절도 자유롭게 바꿔보세요. 필요 없으면 카드의 ✕로 삭제하면 됩니다.</div><div style="font-weight:700;margin-top:12px">📌 인상 깊은 구절</div><div class="np-note" contenteditable="false">💡 점(•)에 쓴 문장은 이 책이 <b>완독</b> 그룹에 있을 때 홈 화면의 FROM MY LIBRARY 카드에 랜덤으로 표시됩니다. 백스페이스로 점을 지운 일반 줄은 표시되지 않아 자유 메모로 쓸 수 있어요.</div><ul><li>일상 속에서 위대한 기업의 단서를 가장 먼저 발견하는 사람은 언제나 평범한 개인 투자자다.</li><li>시장의 조정을 예측하려 애쓰다 잃은 돈이, 조정 그 자체로 잃은 돈보다 훨씬 많다.</li><li>텐베거의 비밀은 단순하다 — 뛰어난 기업을, 충분히 오래, 흔들리지 않고 보유하는 것.</li></ul><div><br></div>';
        }
      }
    }, this);

    this.renderSidebar('books');
    this.renderSidebar('lexicon');
    this.renderSidebar('economics');
    this.renderSidebar('media');
  },

  save: function() {
    try {
      localStorage.setItem('nn_knowledge_vault_v2', JSON.stringify(this.data));
      if(this.groups) localStorage.setItem('nn_knowledge_groups_v1', JSON.stringify(this.groups));
    } catch(e) {}
  },

  createGroup: function(type, parentId) {
    if(!this.groups[type]) this.groups[type] = [];
    var newId = 'grp_' + Date.now() + Math.floor(Math.random()*1000);
    this.groups[type].push({ id: newId, name: '새 토글', collapsed: false, parentId: parentId || null, icon: '📁' });
    if(parentId){
      var parent = this.groups[type].find(function(x){ return x.id === parentId; });
      if(parent) parent.collapsed = false;
    }
    this.save(); this.renderSidebar(type);
    var self = this;
    setTimeout(function(){ self.startInlineRename(type, newId); }, 30);
  },

  startInlineRename: function(type, gid){
    var self = this;
    var nameEl = document.querySelector('[data-gname="'+gid+'"]');
    if(!nameEl) return;
    nameEl.contentEditable = 'true'; nameEl.classList.add('editing-name'); nameEl.focus();
    var range = document.createRange(); range.selectNodeContents(nameEl);
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);

    function finish(){
      nameEl.contentEditable = 'false'; nameEl.classList.remove('editing-name');
      var g = self.groups[type].find(function(x){ return x.id === gid; });
      if(g){ g.name = nameEl.textContent.trim() || '새 토글'; self.save(); }
      nameEl.removeEventListener('blur', finish); nameEl.removeEventListener('keydown', onKey);
    }
    function onKey(e){
      if(e.key === 'Enter'){ e.preventDefault(); nameEl.blur(); }
      else if(e.key === 'Escape'){ nameEl.blur(); }
    }
    nameEl.addEventListener('blur', finish); nameEl.addEventListener('keydown', onKey);
  },

  changeGroupIcon: function(type, gid){
    var self = this;
    var g = this.groups[type].find(function(x){ return x.id === gid; }); if(!g) return;
    var anchor = document.querySelector('[data-gicon="'+gid+'"]');
    this.showEmojiPicker(anchor, function(emoji){ g.icon = emoji; self.save(); self.renderSidebar(type); });
  },

  renameGroup: function(type, gid, e) {
    if(e) e.stopPropagation();
    var g = this.groups[type].find(function(x){ return x.id === gid; }); if(!g) return;
    var self=this;
    if(!window.__nnPrompt) return;
    window.__nnPrompt({ icon:'\ud83d\udcc1', title:'\ud1a0\uae00 \uc774\ub984 \ubcc0\uacbd', label:'\uc774\ub984', value:g.name, required:true,
      onOk:function(v){ g.name = v || g.name; self.save(); self.renderSidebar(type); } });
  },

  deleteGroup: function(type, gid, e) {
    if(e) e.stopPropagation();
    var self=this;
    if(!window.__nnConfirm) return;
    window.__nnConfirm({ title:'\ud1a0\uae00\uc744 \uc0ad\uc81c\ud560\uae4c\uc694?', msg:'\uc548\uc5d0 \ub4e4\uc5b4 \uc788\ub294 \ud398\uc774\uc9c0\ub294 \uc9c0\uc6cc\uc9c0\uc9c0 \uc54a\uace0 \ubc16\uc73c\ub85c \uc774\ub3d9\ud569\ub2c8\ub2e4.', ok:'\uc0ad\uc81c',
      onOk:function(){
    self.data[type].forEach(function(n){ if(n.groupId === gid) n.groupId = null; });
    var deleting = self.groups[type].find(function(x){ return x.id === gid; });
    var newParent = deleting ? deleting.parentId : null;
    self.groups[type].forEach(function(x){ if(x.parentId === gid) x.parentId = newParent; });
    self.groups[type] = self.groups[type].filter(function(x){ return x.id !== gid; });
    self.save(); self.renderSidebar(type);  } });
  },

  toggleGroup: function(type, gid) {
    var g = this.groups[type].find(function(x){ return x.id === gid; }); if(!g) return;
    g.collapsed = !g.collapsed; this.save(); this.renderSidebar(type);
  },

  moveToGroup: function(type, pageId, gid) {
    var p = this.data[type].find(function(n){ return n.id === pageId; }); if(!p) return;
    p.groupId = gid; this.save(); this.renderSidebar(type);
  },

  reorderPage: function(type, dragId, targetId, after) {
    var arr = this.data[type];
    var fromIdx = arr.findIndex(function(n){ return n.id === dragId; }); var dragNote = arr[fromIdx];
    if(fromIdx < 0) return;
    var targetNote = arr.find(function(n){ return n.id === targetId; }); if(!targetNote) return;
    dragNote.groupId = targetNote.groupId; arr.splice(fromIdx, 1);
    var targetIdx = arr.findIndex(function(n){ return n.id === targetId; });
    var insertIdx = after ? targetIdx + 1 : targetIdx;
    arr.splice(insertIdx, 0, dragNote); this.save(); this.renderSidebar(type);
  },

  create: function(type, groupId) {
    var dateStr = this._nowStr();
    var newPage = {
      id: 'note_' + Date.now(),
      title: type === 'books' ? '제목 없는 페이지' : (type === 'lexicon' ? '새로운 용어 혹은 단어 기입' : '제목 없는 페이지'),
      content: (type==='books' ? (groupId==='grp_books_wish' ? '<div class="nn-props" contenteditable="false"><div class="nn-prop"><span class="np-k">✍️ 작가</span><span class="np-v" contenteditable="true" data-ph="비어 있음"></span></div><div class="nn-prop"><span class="np-k">🏷️ 종류</span><span class="np-cat" data-cat=""><span class="cat-chip empty">선택 안 함</span></span></div><div class="nn-prop"><span class="np-k">📌 알게 된 경로</span><span class="np-v" contenteditable="true" data-ph="예: 유튜브 추천 · 서점에서 발견"></span></div><div class="nn-prop"><span class="np-k">💰 예상 가격</span><span class="np-v" contenteditable="true" data-ph="예: 18,000원"></span></div><div class="nn-prop"><span class="np-k">⚡ 우선순위</span><span class="np-v" contenteditable="true" data-ph="예: 높음 · 다음 달에"></span></div></div><div style="font-weight:700;margin-top:12px">💭 왜 읽고 싶은가</div><div class="np-note" contenteditable="false">📚 기대하는 점을 적어두면, 나중에 실제로 읽고 나서 기대와 얼마나 맞았는지 비교할 수 있어요. 읽기 시작하면 별점·날짜·구절 칸이 자동으로 생깁니다.</div><ul><li><br></li></ul><div><br></div>' : '<div class="nn-props" contenteditable="false"><div class="nn-prop"><span class="np-k">✍️ 작가</span><span class="np-v" contenteditable="true" data-ph="비어 있음"></span></div><div class="nn-prop"><span class="np-k">⭐ 별점</span><span class="np-stars" data-rating="0"><i class="st" data-v="1"><b class="h1" data-half="0.5"></b><b class="h2" data-half="1.0"></b></i><i class="st" data-v="2"><b class="h1" data-half="1.5"></b><b class="h2" data-half="2.0"></b></i><i class="st" data-v="3"><b class="h1" data-half="2.5"></b><b class="h2" data-half="3.0"></b></i><i class="st" data-v="4"><b class="h1" data-half="3.5"></b><b class="h2" data-half="4.0"></b></i><i class="st" data-v="5"><b class="h1" data-half="4.5"></b><b class="h2" data-half="5.0"></b></i></span></div><div class="nn-prop"><span class="np-k">🏷️ 종류</span><span class="np-cat" data-cat=""><span class="cat-chip empty">선택 안 함</span></span></div><div class="nn-prop"><span class="np-k">📅 읽기 시작한 날짜</span><span class="np-v" contenteditable="true" data-ph="예: 2026/07/01"></span></div><div class="nn-prop"><span class="np-k">🏁 다 읽은 날짜</span><span class="np-v" contenteditable="true" data-ph="예: 2026/07/08"></span></div></div><div style="font-weight:700;margin-top:12px">📌 인상 깊은 구절</div><div class="np-note" contenteditable="false">💡 점(•)에 쓴 문장은 이 책이 <b>완독</b> 그룹에 있을 때 홈 화면의 FROM MY LIBRARY 카드에 랜덤으로 표시됩니다. 백스페이스로 점을 지운 일반 줄은 표시되지 않아 자유 메모로 쓸 수 있어요.</div><ul><li><br></li></ul><div><br></div>') : ''), date: dateStr, groupId: groupId || null,
      icon: (type === 'books' || type === 'economics') ? '' : (type === 'lexicon' ? '📇' : '📄')
    };
    this.data[type].unshift(newPage);
    if(type==='lexicon'){
      this.save(); this.renderSidebar(type);
      var self=this; setTimeout(function(){ var c=document.getElementById('item-'+newPage.id); if(c){ var t=c.querySelector('.lex-term'); if(t){ t.focus(); } c.scrollIntoView({block:'nearest'}); } }, 50);
    } else if(type==='media'){
      this.save(); this.renderSidebar(type);
      var self2=this; setTimeout(function(){ var c=document.getElementById('item-'+newPage.id); if(c){ var u=c.querySelector('.media-url'); if(u){ u.focus(); } c.scrollIntoView({block:'nearest'}); } }, 50);
    } else {
      this.save(); this.select(type, newPage.id);
    }
  },

  select: function(type, id) {
    var __n=(this.data[type]||[]).find(function(x){ return x.id===id; });
    if(__n){ __n.mtime=Date.now(); }
    this.activeIds[type] = id; this.save(); this.renderSidebar(type); this.renderEditor(type);
    var layout = document.getElementById(type + '-editor-layout');
    if(layout) layout.classList.add('editing');
  },

  closeEditor: function(type) {
    this.activeIds[type] = null; this.renderSidebar(type);
    var layout = document.getElementById(type + '-editor-layout');
    if(layout) layout.classList.remove('editing');
  },

  delete: function(type, id, event) {
    if (event) event.stopPropagation();
    var self=this, arr=this.data[type]||[];
    var idx=arr.findIndex(function(n){ return n.id===id; });
    if(idx<0) return;
    var removed=arr[idx];
    arr.splice(idx,1);
    if (this.activeIds[type] === id) this.activeIds[type] = null;
    this.save(); this.renderSidebar(type); this.renderEditor(type);
    var lb={books:'책',media:'미디어',lexicon:'용어'}[type]||'페이지';
    var ttl=((removed&&removed.title)||'').trim()||'제목 없음';
    if(window.__nnToast){
      window.__nnToast('🗑 '+lb+' "'+ttl+'" 삭제됨',{kind:'del',undo:function(){
        var a=self.data[type]||(self.data[type]=[]);
        a.splice(Math.min(idx,a.length),0,removed);
        self.save(); self.renderSidebar(type); self.renderEditor(type);
        if(window.__nnToast) window.__nnToast('↩ 복원되었습니다');
      }});
    }
  },

  _nowStr: function(){
    var now = new Date();
    return now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  },

  update: function(type, id, field, value) {
    var target = this.data[type].find(function(n) { return n.id === id; });
    if (target) {
      target[field] = value;
      if (type !== 'lexicon' && type !== 'media') { target.date = this._nowStr(); }
      this.save();
      if (type === 'lexicon' || type === 'media') { return; } /* 인라인 카드 편집 중 DOM 재기록 불필요 */
      if (field === 'title') {
        var sideEl = document.querySelector('#item-' + id + ' .page-title-text');
        if (sideEl) sideEl.textContent = value || '제목 없는 페이지';
      }
      var dateEl = document.querySelector('#item-' + id + ' .page-date-text');
      if (dateEl) dateEl.textContent = target.date + ' · 수정됨';
    }
  },

  changePageIcon: function(type, id){
    var self = this;
    var note = this.data[type].find(function(n){ return n.id === id; }); if(!note) return;
    var anchor = document.querySelector('#item-' + id + ' .page-icon');
    this.showEmojiPicker(anchor, function(emoji){ note.icon = emoji; self.save(); self.renderSidebar(type); });
  },

  _ensureCoverTip: function(){
    var self=this;
    if(self._coverTipEl && self._coverTipEl.isConnected) return self._coverTipEl;
    var tip=document.createElement('div'); tip.className='cover-tip-float';
    tip.innerHTML='<div class="cover-tip-title">🖼️ 책 표지 넣는 법</div>'
      +'<div class="ch-step"><span class="ch-n">1</span><div>이 <b>점선 슬롯</b>을 <b>클릭</b>하세요.</div></div>'
      +'<div class="ch-step"><span class="ch-n">2</span><div>표지 이미지의 <b>URL</b>을 붙여넣고 확인.</div></div>'
      +'<div class="ch-step"><span class="ch-n">3</span><div>URL은 <a href="https://www.google.com/search?q=book+cover&tbm=isch" target="_blank" rel="noopener">구글 이미지</a>·<a href="https://openlibrary.org" target="_blank" rel="noopener">Open Library</a>에서 <b>우클릭 → 이미지 주소 복사</b>.</div></div>';
    document.body.appendChild(tip);
    self._coverTipEl=tip;
    tip.addEventListener('mouseenter', function(){ self._coverTipHover=true; });
    tip.addEventListener('mouseleave', function(){ self._coverTipHover=false; self._scheduleHideCoverTip(); });
    return tip;
  },
  _showCoverTip: function(slot){
    var self=this;
    if(self._coverTipHideTimer){ clearTimeout(self._coverTipHideTimer); self._coverTipHideTimer=null; }
    var tip=self._ensureCoverTip();
    self._coverTipSlot=slot;
    /* 위치 계산 (툴팁이 이미 렌더돼 있어 크기 정확) */
    var r=slot.getBoundingClientRect();
    var tw=tip.offsetWidth||228, th=tip.offsetHeight||160;
    var left=r.right+12, top=r.top + r.height/2 - th/2;
    if(left+tw > window.innerWidth-10){ left=r.left-12-tw; }
    if(left < 10){ left=Math.max(10, r.left); top=r.bottom+10; }
    if(top < 10) top=10;
    if(top+th > window.innerHeight-10) top=Math.max(10, window.innerHeight-10-th);
    tip.style.left=Math.round(left)+'px'; tip.style.top=Math.round(top)+'px';
    tip.classList.add('show');
  },
  _scheduleHideCoverTip: function(){
    var self=this;
    if(self._coverTipHideTimer) clearTimeout(self._coverTipHideTimer);
    self._coverTipHideTimer=setTimeout(function(){
      if(self._coverTipHover) return;
      if(self._coverTipEl) self._coverTipEl.classList.remove('show');
    }, 120);
  },
  _hideCoverTip: function(){ this._scheduleHideCoverTip(); },

  changeBookCover: function(type, id) {
    var self=this;
    var note = this.data[type].find(function(n){ return n.id === id; });
    if(!note) return;
    /* 기존 모달 제거 */
    var old=document.getElementById('coverModal'); if(old) old.remove();
    var ov=document.createElement('div'); ov.id='coverModal'; ov.className='cover-modal-ov';
    ov.innerHTML=
      '<div class="cover-modal">'
      +'<div class="cm-head"><span class="cm-ic">🖼️</span><div><div class="cm-title">책 표지 설정</div><div class="cm-sub">이미지 URL을 붙여넣으세요</div></div></div>'
      +'<div class="cm-preview" id="cmPrev">'+(note.cover?'<img src="'+note.cover+'" alt="">':'<span class="cm-prev-ph">미리보기</span>')+'</div>'
      +'<input type="text" class="cm-input" id="cmInput" placeholder="https://... 표지 이미지 주소" value="'+(note.cover||'').replace(/"/g,'&quot;')+'">'
      +'<div class="cm-hint">💡 <a href="https://www.google.com/search?q=book+cover&tbm=isch" target="_blank" rel="noopener">구글 이미지</a>·<a href="https://openlibrary.org" target="_blank" rel="noopener">Open Library</a>에서 표지를 <b>우클릭 → 이미지 주소 복사</b></div>'
      +'<div class="cm-btns"><button class="cm-btn cm-cancel">취소</button>'+(note.cover?'<button class="cm-btn cm-clear">표지 삭제</button>':'')+'<button class="cm-btn cm-save">저장</button></div>'
      +'</div>';
    document.body.appendChild(ov);
    var input=ov.querySelector('#cmInput'), prev=ov.querySelector('#cmPrev');
    function close(){
    var side=document.querySelector('.th-esidebar'); if(side) side.innerHTML=''; ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    function apply(v){ var t=(v||'').trim(); if(t && window.__nnCheckImgUrl){ var c=window.__nnCheckImgUrl(t); if(!c.ok) return; t=c.url; } note.cover=t; self.save(); self.renderSidebar(type); close(); }
    input.oninput=function(){ var v=this.value.trim(); if(v){ prev.innerHTML='<img src="'+v.replace(/"/g,'&quot;')+'" alt="" onerror="this.parentNode.innerHTML=\'<span class=&quot;cm-prev-err&quot;>이미지를 불러올 수 없어요</span>\'">'; } else { prev.innerHTML='<span class="cm-prev-ph">미리보기</span>'; } };
    input.onkeydown=function(e){ if(e.key==='Enter'){ apply(input.value); } if(e.key==='Escape'){ close(); } };
    ov.querySelector('.cm-cancel').onclick=close;
    ov.querySelector('.cm-save').onclick=function(){ apply(input.value); };
    var clr=ov.querySelector('.cm-clear'); if(clr) clr.onclick=function(){ apply(''); };
    ov.onclick=function(e){ if(e.target===ov) close(); };
    requestAnimationFrame(function(){ ov.classList.add('show'); if(window.__nnRenderStorage) window.__nnRenderStorage(); input.focus(); });
  },

  showEmojiPicker: function(anchor, onPick){
    var existing = document.getElementById('nn-emoji-picker'); if(existing) existing.remove();
    var EMOJIS = ['📄','📝','📖','📚','📌','⭐','💡','✅','❤️','🔖','📊','📈','📉','💰','💵','🏦','🎬','🎵','🎨','📷','🌍','🚀','🔥','⚡','🧠','🔑','🗂','📁','📋','🎯','🏆','💎','🌱','☕','🍀','🔬','⚙️','🛠','📅','✍️'];
    var pop = document.createElement('div'); pop.id = 'nn-emoji-picker'; pop.className = 'nn-emoji-picker';
    pop.onmousedown = function(e){ e.preventDefault(); };
    EMOJIS.forEach(function(em){
      var b = document.createElement('button'); b.className = 'nn-emoji-cell'; b.textContent = em;
      b.onclick = function(e){ e.stopPropagation(); pop.remove(); onPick(em); }; pop.appendChild(b);
    });
    document.body.appendChild(pop);
    if(anchor){
      var rect = anchor.getBoundingClientRect(); var pr = pop.getBoundingClientRect();
      var left = rect.left + window.scrollX; var maxLeft = window.scrollX + document.documentElement.clientWidth - pr.width - 8;
      if(left > maxLeft) left = maxLeft; if(left < 4) left = 4;
      pop.style.left = left + 'px'; pop.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    }
    setTimeout(function(){
      document.addEventListener('click', function closer(ev){
        if(!ev.target.closest('#nn-emoji-picker')){ pop.remove(); document.removeEventListener('click', closer, true); }
      }, true);
    }, 0);
  },

  execCmd: function(cmd, val) { try { return document.execCommand(cmd, false, val || null); } catch(e) { return false; } },
  insertImgUrl: function() { var self=this; if(!window.__nnImgModal) return; var restore = window.__nnSelSave ? window.__nnSelSave() : null; window.__nnImgModal({ multi:false, onInsert:function(html){ if(restore) restore(); self.execCmd('insertHTML', html); } }); },
  insertChecklist: function() { var html = '<div class="nn-check" contenteditable="false"><input type="checkbox" onchange="this.parentNode.classList.toggle(\'done\',this.checked)"><span contenteditable="true">할 일</span></div><p><br></p>'; this.execCmd('insertHTML', html); },
  insertCallout: function() { var html = '<div class="nn-callout"><span class="nn-callout-icon" contenteditable="false">💡</span><div class="nn-callout-body">여기에 강조할 내용을 입력하세요</div></div><p><br></p>'; this.execCmd('insertHTML', html); },
  insertLink: function() {
    var self=this;
    var sel=window.getSelection();
    var selectedText = sel ? String(sel.toString()||'').trim() : '';
    var restore = window.__nnSelSave ? window.__nnSelSave() : null;
    if(!window.__nnLinkModal) return;
    function esc2(x){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    window.__nnLinkModal({
      text: selectedText,
      onOk: function(url, text){
        if(restore) restore();
        if(selectedText){
          self.execCmd('createLink', url);
          try{
            var s2=window.getSelection();
            var a=s2 && s2.anchorNode ? (s2.anchorNode.parentNode) : null;
            if(a && a.tagName!=='A' && a.closest) a=a.closest('a');
            if(a && a.tagName==='A'){ a.target='_blank'; a.rel='noopener'; }
          }catch(e){}
        } else {
          self.execCmd('insertHTML', '<a href="'+esc2(url)+'" target="_blank" rel="noopener">'+esc2(text||url)+'</a>&nbsp;');
        }
      }
    });
  },

  insertTable: function(anchorBtn) {
    var self = this; var existing = document.getElementById('nn-grid-picker'); if(existing){ existing.remove(); return; }
    var sel = window.getSelection(); var savedRange = (sel && sel.rangeCount) ? sel.getRangeAt(0).cloneRange() : null;
    var MAXR = 8, MAXC = 10; var picker = document.createElement('div'); picker.id = 'nn-grid-picker'; picker.className = 'nn-grid-picker'; picker.onmousedown = function(e){ e.preventDefault(); };
    var label = document.createElement('div'); label.className = 'nn-grid-label'; label.textContent = '표 크기 선택'; picker.appendChild(label);
    var grid = document.createElement('div'); grid.className = 'nn-grid'; var cells = [];
    function paint(hr, hc){
      for(var r=0; r<MAXR; r++){ for(var c=0; c<MAXC; c++){ var on = (r <= hr && c <= hc); cells[r*MAXC + c].classList.toggle('on', on); } }
      label.textContent = (hr>=0 && hc>=0) ? (hc+1) + ' × ' + (hr+1) : '표 크기 선택';
    }
    for(var r=0; r<MAXR; r++){
      for(var c=0; c<MAXC; c++){
        var cell = document.createElement('div'); cell.className = 'nn-grid-cell';
        (function(rr, cc){
          cell.onmouseenter = function(){ paint(rr, cc); };
          cell.onclick = function(e){ e.stopPropagation(); picker.remove(); self._createTable(rr+1, cc+1, savedRange); };
        })(r, c); grid.appendChild(cell); cells.push(cell);
      }
    }
    picker.appendChild(grid); document.body.appendChild(picker);
    var btn = anchorBtn || document.querySelector('.tb-btn[data-action="table"]');
    if(btn){ var rect = btn.getBoundingClientRect(); var pr = picker.getBoundingClientRect(); picker.style.left = Math.min(rect.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - pr.width - 8) + 'px'; picker.style.top = (rect.bottom + window.scrollY + 6) + 'px'; }
    setTimeout(function(){ document.addEventListener('click', function closer(ev){ if(!ev.target.closest('#nn-grid-picker') && !ev.target.closest('.tb-btn[data-action="table"]')){ picker.remove(); document.removeEventListener('click', closer, true); } }, true); }, 0);
  },

  _createTable: function(rows, cols, savedRange){ if(savedRange){ var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); } var html = '<table class="nn-table"><tbody>'; for(var r=0; r<rows; r++){ html += '<tr>'; for(var c=0; c<cols; c++){ html += '<td>' + (r===0 ? '제목'+(c+1) : '') + '</td>'; } html += '</tr>'; } html += '</tbody></table><p><br></p>'; this.execCmd('insertHTML', html); },
  hideTablePopup: function(){ var p = document.getElementById('nn-table-popup'); if(p) p.remove(); },

  showTablePopup: function(td, type, noteId, editableBody){
    var self = this; this.hideTablePopup(); var table = td.closest('table.nn-table'); var row = td.parentNode; var colIndex = Array.prototype.indexOf.call(row.children, td);
    function commit(){ self.update(type, noteId, 'content', editableBody.innerHTML); }
    var pop = document.createElement('div'); pop.id = 'nn-table-popup'; pop.className = 'nn-table-popup'; pop.contentEditable = 'false'; pop.onmousedown = function(e){ e.preventDefault(); };
    var actions = [
      { ic:'⤓', tip:'아래 행 추가', fn:function(){ var nr=row.cloneNode(true); Array.prototype.forEach.call(nr.children,function(c){c.innerHTML='';c.style.background='';}); row.parentNode.insertBefore(nr,row.nextSibling); }},
      { ic:'⤒', tip:'위 행 추가', fn:function(){ var nr=row.cloneNode(true); Array.prototype.forEach.call(nr.children,function(c){c.innerHTML='';c.style.background='';}); row.parentNode.insertBefore(nr,row); }},
      { ic:'⇥', tip:'오른쪽 열 추가', fn:function(){ Array.prototype.forEach.call(table.rows,function(r){ r.insertCell(colIndex+1).innerHTML=''; }); }},
      { ic:'⇤', tip:'왼쪽 열 추가', fn:function(){ Array.prototype.forEach.call(table.rows,function(r){ r.insertCell(colIndex).innerHTML=''; }); }},
      { ic:'✕행', tip:'이 행 삭제', fn:function(){ if(table.rows.length>1) row.parentNode.removeChild(row); self.hideTablePopup(); }},
      { ic:'✕열', tip:'이 열 삭제', fn:function(){ if(table.rows[0].cells.length>1){ Array.prototype.forEach.call(table.rows,function(r){ if(r.cells[colIndex]) r.deleteCell(colIndex); }); } self.hideTablePopup(); }}
    ];
    actions.forEach(function(a){ var b=document.createElement('button'); b.className='nn-tp-btn'; b.textContent=a.ic; b.title=a.tip; b.onclick=function(ev){ ev.stopPropagation(); a.fn(); commit(); }; pop.appendChild(b); });
    var sep=document.createElement('span'); sep.className='nn-tp-sep'; pop.appendChild(sep);
    var colors = ['transparent','#ffe9b0','#ffd0c4','#d4f0d8','#cfe4f5','#e6d4f5','#f5d4e4'];
    colors.forEach(function(col){ var sw=document.createElement('button'); sw.className='nn-tp-swatch'; sw.style.background = col==='transparent' ? '#fff' : col; if(col==='transparent'){ sw.textContent='⌀'; sw.style.color='#999'; sw.style.fontSize='11px'; } sw.onclick=function(ev){ ev.stopPropagation(); td.style.background = col; commit(); }; pop.appendChild(sw); });
    var selectedCells = self._getSelectedCells ? self._getSelectedCells() : [];
    if(selectedCells.length > 1){ var mergeBtn=document.createElement('button'); mergeBtn.className='nn-tp-btn'; mergeBtn.textContent='⊞ 병합'; mergeBtn.onclick=function(ev){ ev.stopPropagation(); self.mergeCells(selectedCells, editableBody); commit(); self.hideTablePopup(); }; pop.appendChild(mergeBtn); }
    if(td.colSpan > 1 || td.rowSpan > 1){ var unmergeBtn=document.createElement('button'); unmergeBtn.className='nn-tp-btn'; unmergeBtn.textContent='⊟ 해제'; unmergeBtn.onclick=function(ev){ ev.stopPropagation(); self.unmergeCell(td, editableBody); commit(); self.hideTablePopup(); }; pop.appendChild(unmergeBtn); }
    var aligns = [{ ic:'⬅', val:'left' },{ ic:'⬌', val:'center' },{ ic:'➡', val:'right' }]; aligns.forEach(function(a){ var b=document.createElement('button'); b.className='nn-tp-btn'; b.textContent=a.ic; b.onclick=function(ev){ ev.stopPropagation(); td.style.textAlign=a.val; commit(); }; pop.appendChild(b); });
    var textColors = ['#1a1a1a','#e05555','#e8861f','#2e9e4f','#2a6fb0','#8a4fd4']; textColors.forEach(function(col){ var sw=document.createElement('button'); sw.className='nn-tp-swatch nn-tp-textsw'; sw.style.background = col; sw.onclick=function(ev){ ev.stopPropagation(); td.style.color = col; commit(); }; pop.appendChild(sw); });
    document.body.appendChild(pop); var rect = td.getBoundingClientRect(); var pr = pop.getBoundingClientRect(); var left = rect.left + window.scrollX; var topPos = rect.top + window.scrollY - pr.height - 8; if(topPos < window.scrollY + 4) topPos = rect.bottom + window.scrollY + 8; pop.style.left = Math.max(window.scrollX + 4, Math.min(left, window.scrollX + document.documentElement.clientWidth - pr.width - 8)) + 'px'; pop.style.top = topPos + 'px';
  },

  mergeCells: function(cells, editableBody){
    if(!cells || cells.length < 2) return; var table = cells[0].closest('table'); var rMin=Infinity,rMax=-Infinity,cMin=Infinity,cMax=-Infinity;
    cells.forEach(function(td){ var r=td.parentNode.rowIndex, c=td.cellIndex; rMin=Math.min(rMin,r); rMax=Math.max(rMax,r); cMin=Math.min(cMin,c); cMax=Math.max(cMax,c); });
    var rows = table.rows; var first = rows[rMin].cells[cMin]; var combinedText = []; cells.forEach(function(td){ if(td !== first){ var t = td.textContent.trim(); if(t) combinedText.push(t); } });
    for(var ri=rMax; ri>=rMin; ri--){ for(var ci=cMax; ci>=cMin; ci--){ var cell = rows[ri] && rows[ri].cells[ci]; if(cell && cell !== first && cell.classList.contains('nn-cell-selected')){ cell.parentNode.removeChild(cell); } } }
    first.colSpan = (cMax - cMin) + 1; first.rowSpan = (rMax - rMin) + 1; if(combinedText.length){ first.innerHTML = (first.textContent.trim() + ' ' + combinedText.join(' ')).trim(); }
    first.classList.remove('nn-cell-selected'); editableBody.querySelectorAll('.nn-cell-selected').forEach(function(c){ c.classList.remove('nn-cell-selected'); });
  },

  unmergeCell: function(td, editableBody){
    var cs = td.colSpan || 1, rs = td.rowSpan || 1; if(cs<=1 && rs<=1) return; var table = td.closest('table'); var startRow = td.parentNode.rowIndex; var startCol = td.cellIndex; td.colSpan = 1; td.rowSpan = 1;
    for(var ri=0; ri<rs; ri++){ var row = table.rows[startRow + ri]; if(!row) continue; for(var ci=0; ci<cs; ci++){ if(ri===0 && ci===0) continue; var refIndex = startCol + ci; var newCell = row.insertCell(Math.min(refIndex, row.cells.length)); newCell.innerHTML = ''; } }
  },

  insertGallery: function() {
    var self=this;
    if(!window.__nnImgModal){ return; }
    var restore = window.__nnSelSave ? window.__nnSelSave() : null;
    window.__nnImgModal({ multi:true, onInsert:function(html){ if(restore) restore(); self.execCmd('insertHTML', html); } });
  },

  lexConfirmDelete: function(card, id){
    var self=this;
    if(card.querySelector('.lex-confirm')) return;
    var ov=document.createElement('div'); ov.className='lex-confirm';
    ov.innerHTML='<div class="lc-msg">삭제할까요?</div><div class="lc-btns"><button class="lc-no">취소</button><button class="lc-yes">삭제</button></div>';
    ov.querySelector('.lc-no').onclick=function(e){ e.stopPropagation(); ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },180); };
    ov.querySelector('.lc-yes').onclick=function(e){ e.stopPropagation();
      card.classList.add('lex-removing');
      setTimeout(function(){
        self.data.lexicon = self.data.lexicon.filter(function(n){ return n.id!==id; });
        self.save(); self.renderSidebar('lexicon');
      }, 200);
    };
    card.appendChild(ov);
    requestAnimationFrame(function(){ ov.classList.add('show'); if(window.__nnRenderStorage) window.__nnRenderStorage(); });
  },

  _scrollTarget: function(){
    /* 실제로 스크롤되는 요소를 찾는다: page-media 조상 중 스크롤 가능한 것, 없으면 window */
    var el=document.getElementById('page-media');
    var node=el;
    while(node && node!==document.body){
      var st=getComputedStyle(node);
      if((st.overflowY==='auto'||st.overflowY==='scroll') && node.scrollHeight>node.clientHeight+4) return node;
      node=node.parentElement;
    }
    /* document 스크롤러 */
    return (document.scrollingElement||document.documentElement||document.body);
  },
  _doScroll: function(dy){
    var t=this._scrollTarget();
    if(t===window || t===document.scrollingElement || t===document.documentElement || t===document.body){
      window.scrollBy(0, dy);
    } else {
      t.scrollTop += dy;
    }
  },
  _startDragScroll: function(){
    var self=this;
    if(self._dragScrollOn) return;
    self._dragScrollOn=true; self._dragEdge=0;
    /* 드래그 중 마우스 휠 → 스크롤 (썸네일 잡은 채 휠 돌려도 이동) */
    self._onDragWheel=function(e){
      var dy = e.deltaY;
      if(dy===undefined || dy===0){ if(e.wheelDelta!==undefined) dy=-e.wheelDelta; else if(e.detail) dy=e.detail*40; }
      if(dy){ self._doScroll(dy); if(e.cancelable) e.preventDefault(); }
    };
    /* 마우스가 화면 상/하단(전체 폭)에 오면 자동 스크롤 — 좌우 위치 무관 */
    self._onDragOver=function(e){
      var h=window.innerHeight, edge=110;
      if(e.clientY < edge) self._dragEdge=-Math.ceil((edge-e.clientY)/4);
      else if(e.clientY > h-edge) self._dragEdge=Math.ceil((e.clientY-(h-edge))/4);
      else self._dragEdge=0;
    };
    /* drag 계열 + 일반 마우스 이동 모두 대응 */
    window.addEventListener('wheel', self._onDragWheel, {passive:false, capture:true});
    document.addEventListener('wheel', self._onDragWheel, {passive:false, capture:true});
    document.addEventListener('mousewheel', self._onDragWheel, {passive:false, capture:true});
    document.addEventListener('DOMMouseScroll', self._onDragWheel, {passive:false, capture:true});
    document.addEventListener('dragover', self._onDragOver, {passive:true});
    document.addEventListener('drag', self._onDragOver, {passive:true});
    var step=function(){
      if(!self._dragScrollOn) return;
      if(self._dragEdge!==0) self._doScroll(self._dragEdge);
      self._dragScrollRAF=requestAnimationFrame(step);
    };
    self._dragScrollRAF=requestAnimationFrame(step);
  },
  _stopDragScroll: function(){
    var self=this;
    self._dragScrollOn=false; self._dragEdge=0;
    if(self._onDragWheel){
      window.removeEventListener('wheel', self._onDragWheel, {capture:true});
      document.removeEventListener('wheel', self._onDragWheel, {capture:true});
      document.removeEventListener('mousewheel', self._onDragWheel, {capture:true});
      document.removeEventListener('DOMMouseScroll', self._onDragWheel, {capture:true});
    }
    if(self._onDragOver){ document.removeEventListener('dragover', self._onDragOver); document.removeEventListener('drag', self._onDragOver); }
    if(self._dragScrollRAF) cancelAnimationFrame(self._dragScrollRAF);
  },
  _ytId: function(url){
    if(!url) return null;
    var m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  },
  _buildMediaCard: function(note){
    var self=this;
    var card=document.createElement('div'); card.className='media-card'+(note.groupId?' in-group':' no-group'); card.id='item-'+note.id; card.draggable=true;
    card.ondragstart=function(e){ e.stopPropagation(); e.dataTransfer.setData('text/plain', note.id); card.classList.add('dragging'); self._draggingPageId=note.id; self._startDragScroll(); };
    card.ondragend=function(){ card.classList.remove('dragging'); self._stopDragScroll(); };
    card.ondragover=function(e){ e.preventDefault(); e.stopPropagation(); var d=self._draggingPageId; if(d&&d!==note.id){ var r=card.getBoundingClientRect(); var after=(e.clientY-r.top)>r.height/2; card.classList.toggle('drop-after',after); card.classList.toggle('drop-before',!after); } };
    card.ondragleave=function(){ card.classList.remove('drop-before','drop-after'); };
    card.ondrop=function(e){ e.preventDefault(); e.stopPropagation(); card.classList.remove('drop-before','drop-after'); var d=e.dataTransfer.getData('text/plain'); if(!d||d===note.id) return; var r=card.getBoundingClientRect(); var after=(e.clientY-r.top)>r.height/2; self.reorderPage('media', d, note.id, after); };
    /* 삭제 */
    var del=document.createElement('button'); del.className='media-del'; del.innerHTML='&#10005;'; del.title='삭제';
    del.onclick=function(e){ e.stopPropagation(); self.mediaConfirmDelete(card, note.id); };
    card.appendChild(del);
    /* 썸네일 영역 */
    var thumb=document.createElement('div'); thumb.className='media-thumb';
    var yid=self._ytId(note.url||'');
    function paintThumb(){
      var id=self._ytId(note.url||'');
      if(id){
        thumb.classList.remove('empty');
        thumb.innerHTML='<img src="https://i.ytimg.com/vi/'+id+'/hqdefault.jpg" alt="" loading="lazy"><span class="media-play">▶</span>';
        thumb.onclick=function(e){ e.stopPropagation(); window.open('https://www.youtube.com/watch?v='+id,'_blank','noopener'); };
      } else if(note.url){
        thumb.classList.remove('empty');
        thumb.innerHTML='<div class="media-link-ph">🔗<span>'+ (note.url.replace(/^https?:\/\//,'').slice(0,42)) +'</span></div>';
        thumb.onclick=function(e){ e.stopPropagation(); window.open(note.url,'_blank','noopener'); };
      } else {
        thumb.classList.add('empty');
        thumb.innerHTML='<div class="media-thumb-hint">▶ 유튜브·영상 링크를 붙여넣으면<br>썸네일이 자동으로 나타나요</div>';
        thumb.onclick=null;
      }
    }
    paintThumb();
    card.appendChild(thumb);
    /* URL 입력 */
    var urlIn=document.createElement('input'); urlIn.className='media-url'; urlIn.type='text';
    urlIn.placeholder='🔗 영상 링크 붙여넣기 (YouTube 등)'; urlIn.value=note.url||'';
    urlIn.onclick=function(e){ e.stopPropagation(); };
    urlIn.oninput=function(){ self.update('media', note.id, 'url', this.value.trim()); paintThumb(); };
    card.appendChild(urlIn);
    /* 제목 */
    var title=document.createElement('div'); title.className='media-title'; title.contentEditable='true';
    title.setAttribute('data-ph','제목 · 영상 이름'); title.textContent=(note.title&&note.title!=='제목 없는 페이지')?note.title:'';
    title.onclick=function(e){ e.stopPropagation(); };
    title.oninput=function(){ self.update('media', note.id, 'title', this.textContent.trim()||'제목 없는 페이지'); };
    card.appendChild(title);
    /* 메모 */
    var memo=document.createElement('div'); memo.className='media-memo'; memo.contentEditable='true';
    memo.setAttribute('data-ph','간단한 메모 · 인상 깊은 점을 적어보세요');
    var plain=(note.content||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
    memo.textContent=plain;
    memo.onclick=function(e){ e.stopPropagation(); };
    memo.oninput=function(){ self.update('media', note.id, 'content', this.textContent); };
    card.appendChild(memo);
    return card;
  },
  mediaConfirmDelete: function(card, id){
    var self=this;
    if(card.querySelector('.lex-confirm')) return;
    var ov=document.createElement('div'); ov.className='lex-confirm';
    ov.innerHTML='<div class="lc-msg">삭제할까요?</div><div class="lc-btns"><button class="lc-no">취소</button><button class="lc-yes">삭제</button></div>';
    ov.querySelector('.lc-no').onclick=function(e){ e.stopPropagation(); ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },180); };
    ov.querySelector('.lc-yes').onclick=function(e){ e.stopPropagation();
      card.classList.add('lex-removing');
      setTimeout(function(){ self.data.media=self.data.media.filter(function(n){ return n.id!==id; }); self.save(); self.renderSidebar('media'); }, 200);
    };
    card.appendChild(ov);
    requestAnimationFrame(function(){ ov.classList.add('show'); if(window.__nnRenderStorage) window.__nnRenderStorage(); });
  },

  _buildLexCard: function(note){
    var self=this;
    var card=document.createElement('div'); card.className='lex-card'; card.id='item-'+note.id; card.draggable=true;
    card.ondragstart=function(e){ e.stopPropagation(); e.dataTransfer.setData('text/plain', note.id); card.classList.add('dragging'); self._draggingPageId=note.id; };
    card.ondragend=function(){ card.classList.remove('dragging'); };
    card.ondragover=function(e){ e.preventDefault(); e.stopPropagation(); var d=self._draggingPageId; if(d&&d!==note.id){ var r=card.getBoundingClientRect(); var after=(e.clientY-r.top)>r.height/2; card.classList.toggle('drop-after',after); card.classList.toggle('drop-before',!after); } };
    card.ondragleave=function(){ card.classList.remove('drop-before','drop-after'); };
    card.ondrop=function(e){ e.preventDefault(); e.stopPropagation(); card.classList.remove('drop-before','drop-after'); var d=e.dataTransfer.getData('text/plain'); if(!d||d===note.id) return; var r=card.getBoundingClientRect(); var after=(e.clientY-r.top)>r.height/2; self.reorderPage('lexicon', d, note.id, after); };
    /* 암기 상태 클래스 */
    if(note.mem==='known') card.classList.add('mem-known');
    else if(note.mem==='hard') card.classList.add('mem-hard');
    /* 상단 우측 액션: 암기 토글 + 삭제 */
    var actions=document.createElement('div'); actions.className='lex-actions';
    var memBtn=document.createElement('button'); memBtn.className='lex-mem'; memBtn.type='button';
    var _mt={known:'✓ 외웠어요', hard:'✕ 헷갈려요'};
    memBtn.title='암기 상태 (클릭: 미정 → 외움 → 헷갈림)';
    memBtn.innerHTML = note.mem==='known' ? '✓' : (note.mem==='hard' ? '✕' : '○');
    memBtn.onclick=function(e){ e.stopPropagation();
      var nxt = note.mem==='known' ? 'hard' : (note.mem==='hard' ? '' : 'known');
      self.update('lexicon', note.id, 'mem', nxt);
      card.classList.remove('mem-known','mem-hard');
      if(nxt==='known') card.classList.add('mem-known'); else if(nxt==='hard') card.classList.add('mem-hard');
      memBtn.innerHTML = nxt==='known' ? '✓' : (nxt==='hard' ? '✕' : '○');
    };
    var del=document.createElement('button'); del.className='lex-del'; del.innerHTML='&#10005;'; del.title='삭제';
    del.onclick=function(e){ e.stopPropagation(); self.lexConfirmDelete(card, note.id); };
    actions.appendChild(memBtn); actions.appendChild(del);
    /* 단어(제목) — contentEditable */
    var term=document.createElement('div'); term.className='lex-term'; term.contentEditable='true';
    term.setAttribute('data-ph','단어 · 용어'); term.textContent=note.title==='새로운 용어 혹은 단어 기입'?'':(note.title||'');
    term.oninput=function(){ self.update('lexicon', note.id, 'title', this.textContent.trim()||'새로운 용어 혹은 단어 기입'); };
    term.onkeydown=function(e){ if(e.key==='Enter'){ e.preventDefault(); var d=card.querySelector('.lex-def'); if(d) d.focus(); } };
    /* 뜻(내용) — contentEditable, 순수 텍스트 */
    var def=document.createElement('div'); def.className='lex-def'; def.contentEditable='true';
    def.setAttribute('data-ph','뜻 · 설명을 입력하세요');
    var plain=(note.content||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
    def.textContent=plain;
    def.oninput=function(){ self.update('lexicon', note.id, 'content', this.textContent); };
    card.appendChild(actions); card.appendChild(term); card.appendChild(def);
    return card;
  },

  _buildPageItem: function(type, note, activeId) {
    var self = this;
    if (type === 'lexicon') { return self._buildLexCard(note); }
    if (type === 'media') { return self._buildMediaCard(note); }
    var item = document.createElement('div'); item.className = 'page-item' + (note.id === activeId ? ' active' : ''); item.id = 'item-' + note.id; item.draggable = true;
    item.onclick = function() { self.select(type, note.id); };
    item.ondragstart = function(e){ e.stopPropagation(); e.dataTransfer.setData('text/plain', note.id); item.classList.add('dragging'); self._draggingPageId = note.id; };
    item.ondragend = function(){ item.classList.remove('dragging'); };
    item.ondragover = function(e){ e.preventDefault(); e.stopPropagation(); var dragId = self._draggingPageId; if(dragId && dragId !== note.id){ var r = item.getBoundingClientRect(); var after = (e.clientY - r.top) > r.height / 2; item.classList.toggle('drop-after', after); item.classList.toggle('drop-before', !after); } };
    item.ondragleave = function(){ item.classList.remove('drop-before','drop-after'); };
    item.ondrop = function(e){ e.preventDefault(); e.stopPropagation(); item.classList.remove('drop-before','drop-after'); var dragId = e.dataTransfer.getData('text/plain'); if(!dragId || dragId === note.id) return; var r = item.getBoundingClientRect(); var after = (e.clientY - r.top) > r.height / 2; self.reorderPage(type, dragId, note.id, after); };
    var contentWrap = document.createElement('div'); contentWrap.style.display = 'flex'; contentWrap.style.gap = '12px'; contentWrap.style.alignItems = 'flex-start'; contentWrap.style.width = '100%';
    if (type === 'books') {
      var coverBtn = document.createElement('div'); coverBtn.className = 'book-cover' + (note.cover ? ' has-img' : '');
      if (note.cover) { coverBtn.style.backgroundImage = 'url(' + note.cover + ')'; }
      else {
        coverBtn.innerHTML = '&#43;<br>표지';
        coverBtn.onmouseenter = function(){ self._showCoverTip(coverBtn); };
        coverBtn.onmouseleave = function(){ self._scheduleHideCoverTip(); };
      }
      coverBtn.onclick = function(e){ e.stopPropagation(); self.changeBookCover(type, note.id); }; contentWrap.appendChild(coverBtn);
    }
    var header = document.createElement('div'); header.className = 'page-item-header'; header.style.flex = '1'; header.style.minWidth = '0'; header.style.display = 'flex'; header.style.flexDirection = 'column'; header.style.alignItems = 'stretch'; header.style.gap = '0';
    var topRow = document.createElement('div'); topRow.style.display = 'flex'; topRow.style.alignItems = 'center'; topRow.style.gap = '5px'; topRow.style.width = '100%';
    var pIcon = document.createElement('span'); pIcon.className = 'page-icon'; pIcon.textContent = (note.icon != null ? note.icon : '📄'); if(type==='books' || type==='economics'){ pIcon.style.display='none'; } pIcon.onclick = function(e){ e.stopPropagation(); self.changePageIcon(type, note.id); };
    var titleSpan = document.createElement('span'); titleSpan.className = 'page-title-text'; titleSpan.textContent = note.title || '제목 없는 페이지';
    if(type==='books'){
      try{
        var mcat=/data-cat="([^"]*)"/.exec(note.content||''); var cv=mcat?mcat[1]:'';
        if(cv){ var badge=document.createElement('span'); badge.className='pg-cat-badge'; badge.textContent=cv;
          var col=(window.__nnCatColor?window.__nnCatColor(cv):'#c9a96e')||'#c9a96e';
          var m6=/^#?([0-9a-f]{6})$/i.exec(col); var n6=m6?parseInt(m6[1],16):0xc9a96e;
          badge.style.color=col; badge.style.background='rgba('+((n6>>16)&255)+','+((n6>>8)&255)+','+(n6&255)+',.16)';
          topRow.__catBadge = badge;
        }
      }catch(e){}
    }
    var delBtn = document.createElement('button'); delBtn.className = 'page-del-btn'; delBtn.innerHTML = '&#10005;'; delBtn.onclick = function(e) { self.delete(type, note.id, e); };
    if(!(type==='books')){ topRow.appendChild(pIcon); } topRow.appendChild(titleSpan); if(topRow.__catBadge) topRow.appendChild(topRow.__catBadge);
    if(window.__nnIsShared && window.__nnIsShared(note.id)){
      var shb=document.createElement('span'); shb.className='pg-share-badge'; shb.textContent='🔗'; shb.title='공유 중 — 링크가 있는 누구나 볼 수 있습니다';
      topRow.appendChild(shb);
    }
    topRow.appendChild(delBtn);
    var dateDiv = document.createElement('div'); dateDiv.className = 'page-date-text'; dateDiv.style.paddingLeft = '0'; dateDiv.style.alignSelf = 'flex-start'; dateDiv.style.textAlign = 'left'; dateDiv.textContent = note.date ? (note.date + ' · 수정됨') : '';
    header.appendChild(topRow); header.appendChild(dateDiv);
    /* 완독 카드: 목록에서 별점 미리보기 */
    if(type==='books' && note.groupId==='grp_books_done'){
      try{
        var mr=/data-rating="([0-9.]+)"/.exec(note.content||''); var rating=mr?parseFloat(mr[1]):0;
        if(rating>0){
          var starRow=document.createElement('div'); starRow.className='pg-star-row';
          var full=Math.floor(rating), half=(rating-full)>=0.5;
          var sh='';
          for(var si=0; si<5; si++){
            if(si<full) sh+='<span class="pg-star full">★</span>';
            else if(si===full && half) sh+='<span class="pg-star half">★</span>';
            else sh+='<span class="pg-star">★</span>';
          }
          starRow.innerHTML=sh+'<span class="pg-star-num">'+rating.toFixed(1)+'</span>';
          starRow.style.alignSelf='flex-start';
          header.appendChild(starRow);
        }
      }catch(e){}
    }
    contentWrap.appendChild(header); item.appendChild(contentWrap); return item;
  },

  _attachDrop: function(zone, type, targetGroupId) {
    var self = this;
    zone.ondragover = function(e){ e.preventDefault(); e.stopPropagation(); zone.classList.add('drop-hover'); };
    zone.ondragleave = function(){ zone.classList.remove('drop-hover'); };
    zone.ondrop = function(e){ e.preventDefault(); e.stopPropagation(); zone.classList.remove('drop-hover'); var pageId = e.dataTransfer.getData('text/plain'); if(pageId) self.moveToGroup(type, pageId, targetGroupId); };
  },

  _buildGroup: function(type, g, activeId){
    var self = this; var groupEl = document.createElement('div'); groupEl.className = 'note-group' + (g.collapsed ? ' collapsed' : '');
    var gHeader = document.createElement('div'); gHeader.className = 'note-group-header';
    var arrow = document.createElement('span'); arrow.className = 'note-group-arrow'; arrow.innerHTML = g.collapsed ? '&#9656;' : '&#9662;'; arrow.onclick = function(e){ e.stopPropagation(); self.toggleGroup(type, g.id); };
    var gIcon = document.createElement('span'); gIcon.className = 'note-group-icon'; gIcon.textContent = g.icon || '📁'; gIcon.setAttribute('data-gicon', g.id); gIcon.onclick = function(e){ e.stopPropagation(); self.changeGroupIcon(type, g.id); };
    var gName = document.createElement('span'); gName.className = 'note-group-name'; gName.textContent = (g.name||'').replace(/\s*[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\uFE0F]+\s*$/u,'').trim(); gName.setAttribute('data-gname', g.id); gName.ondblclick = function(e){ e.stopPropagation(); self.startInlineRename(type, g.id); };
    var gAddSub = document.createElement('button'); gAddSub.className = 'note-group-addsub'; gAddSub.innerHTML = '&#43;토글'; gAddSub.onclick = function(e){ e.stopPropagation(); self.createGroup(type, g.id); };
    var gDel = document.createElement('button'); gDel.className = 'note-group-del'; gDel.innerHTML = '&#10005; 삭제'; gDel.title='이 그룹(토글) 삭제'; gDel.onclick = function(e){ self.deleteGroup(type, g.id, e); };
    gHeader.appendChild(arrow); gHeader.appendChild(gIcon); gHeader.appendChild(gName);
    var pagesInGroup = self.data[type].filter(function(n){ return n.groupId === g.id; });
    var gCount = document.createElement('span'); gCount.className = 'note-group-count'; gCount.textContent = pagesInGroup.length; gHeader.appendChild(gCount);
    gHeader.appendChild(gAddSub); var _canDel = g.parentId || (type==='economics') || (type==='media'); if(_canDel){ gHeader.appendChild(gDel); }
    if(type==='books' && g.id==='grp_books_done'){
      var LBL={date:'최신순',rating:'별점순',cat:'카테고리별'};
      var sortBtn=document.createElement('button'); sortBtn.className='bk-sort-btn';
      sortBtn.innerHTML=(LBL[self._booksSort||'date'])+' ▾';
      sortBtn.onclick=function(e){
        e.stopPropagation();
        var old=document.querySelector('.bk-sort-menu'); if(old){ old.remove(); if(old.__for===g.id) return; }
        var menu=document.createElement('div'); menu.className='bk-sort-menu'; menu.__for=g.id;
        ['date','rating','cat'].forEach(function(k){
          var it=document.createElement('div'); it.className='bsi'+((self._booksSort||'date')===k?' on':''); it.textContent=LBL[k];
          it.onclick=function(ev){ ev.stopPropagation(); self._booksSort=k; menu.remove(); self.renderSidebar('books'); };
          menu.appendChild(it);
        });
        document.body.appendChild(menu);
        var r=sortBtn.getBoundingClientRect();
        menu.style.left=Math.min(r.left, window.innerWidth-menu.offsetWidth-8)+'px';
        menu.style.top=(r.bottom+4)+'px';
        setTimeout(function(){ document.addEventListener('mousedown', function h(ev){ if(!menu.contains(ev.target)&&ev.target!==sortBtn){ menu.remove(); document.removeEventListener('mousedown',h); } }); },0);
      };
      gHeader.insertBefore(sortBtn, gAddSub);
    }
    gHeader.ondragover = function(e){ e.preventDefault(); e.stopPropagation(); gHeader.classList.add('group-drop-target'); };
    gHeader.ondragleave = function(){ gHeader.classList.remove('group-drop-target'); };
    gHeader.ondrop = function(e){ e.preventDefault(); e.stopPropagation(); gHeader.classList.remove('group-drop-target'); var pageId = e.dataTransfer.getData('text/plain'); if(pageId){ if(g.collapsed) g.collapsed = false; self.moveToGroup(type, pageId, g.id); } };
    groupEl.appendChild(gHeader);
    var gBody = document.createElement('div'); gBody.className = 'note-group-body'; self._attachDrop(gBody, type, g.id);
    var childGroups = (self.groups[type] || []).filter(function(x){ return x.parentId === g.id; }); childGroups.forEach(function(cg){ gBody.appendChild(self._buildGroup(type, cg, activeId)); });
    if(pagesInGroup.length === 0 && childGroups.length === 0){ var empty = document.createElement('div'); empty.className = 'note-group-empty'; empty.textContent = (type==='lexicon' ? '＋ 아래 버튼으로 첫 단어를 추가해 보세요' : (type==='books' ? '여기로 책을 끌어다 놓으세요' : '여기로 페이지를 끌어다 놓으세요')); gBody.appendChild(empty); } 
    else {
      var _pg = pagesInGroup.slice();
      if(type==='books' && g.id==='grp_books_done'){
        var mode = self._booksSort || 'date';
        function _rating(n){ var m=/data-rating="([\d.]+)"/.exec(n.content||''); return m?parseFloat(m[1]):0; }
        function _cat(n){ var m=/data-cat="([^"]*)"/.exec(n.content||''); return m?m[1]:''; }
        if(mode==='rating') _pg.sort(function(a,b){ return _rating(b)-_rating(a); });
        else if(mode==='cat') _pg.sort(function(a,b){ return (_cat(a)||'힣').localeCompare(_cat(b)||'힣','ko'); });
        else _pg.sort(function(a,b){ return String(b.date||'').localeCompare(String(a.date||'')); });
      }
      if(type==='lexicon' && _pg.length>50){
        /* 50개 단위 접이식 하위 묶음 */
        var CHUNK=50;
        var foldStore={}; try{ foldStore=JSON.parse(localStorage.getItem('nn_lex_fold_v1')||'{}'); }catch(e){}
        for(var ci=0; ci<_pg.length; ci+=CHUNK){
          (function(ci){
            var slice=_pg.slice(ci, ci+CHUNK);
            var from=ci+1, to=ci+slice.length;
            var chunkKey=g.id+'_'+ci;
            var collapsed = !!foldStore[chunkKey];
            var sec=document.createElement('div'); sec.className='lex-chunk'+(collapsed?' collapsed':'');
            var sh=document.createElement('div'); sh.className='lex-chunk-head';
            sh.innerHTML='<span class="lex-chunk-arr">'+(collapsed?'▸':'▾')+'</span><span class="lex-chunk-t">'+from+' – '+to+'</span><span class="lex-chunk-c">'+slice.length+'</span>';
            sh.onclick=function(e){
              e.stopPropagation();
              var fs={}; try{ fs=JSON.parse(localStorage.getItem('nn_lex_fold_v1')||'{}'); }catch(e){}
              fs[chunkKey]=!fs[chunkKey];
              try{ localStorage.setItem('nn_lex_fold_v1', JSON.stringify(fs)); }catch(e){}
              self.renderSidebar('lexicon');
            };
            var sbody=document.createElement('div'); sbody.className='lex-chunk-body';
            slice.forEach(function(note){ sbody.appendChild(self._buildPageItem(type, note, activeId)); });
            sec.appendChild(sh); sec.appendChild(sbody); gBody.appendChild(sec);
          })(ci);
        }
      } else {
        _pg.forEach(function(note){ gBody.appendChild(self._buildPageItem(type, note, activeId)); });
      }
    }
    if (type === 'books' || type === 'lexicon') {
      var addCardBtn = document.createElement('button'); addCardBtn.className = 'kanban-add-btn'; addCardBtn.innerHTML = type === 'books' ? '&#43; 새 책 추가' : (type === 'media' ? '&#43; 새 영상·미디어 추가' : (type === 'lexicon' ? '&#43; 새 용어·개념 추가' : '&#43; 새 페이지 추가'));
      addCardBtn.onclick = function(e) { e.stopPropagation(); self.create(type, g.id); }; gBody.appendChild(addCardBtn);
    }
    groupEl.appendChild(gBody); return groupEl;
  },

  _buildLexQuiz: function(){
    var self=this;
    if(self._lexQuizExKnown===undefined){ try{ self._lexQuizExKnown = localStorage.getItem('nn_lex_quiz_exknown')==='1'; }catch(e){ self._lexQuizExKnown=false; } }
    var exKnown = self._lexQuizExKnown;
    var pool=(self.data.lexicon||[]).filter(function(n){
      var t=(n.title||'').trim(); if(!t||t==='새로운 용어 혹은 단어 기입') return false;
      var d=(n.content||'').replace(/<[^>]+>/g,'').trim(); if(!d) return false;
      if(exKnown && n.mem==='known') return false;
      return true;
    });
    var gp=document.createElement('div'); gp.className='bk-goal lex-quiz';
    if(pool.length<1){
      var allCount=(self.data.lexicon||[]).filter(function(n){ var t=(n.title||'').trim(); return t&&t!=='새로운 용어 혹은 단어 기입'&&(n.content||'').replace(/<[^>]+>/g,'').trim(); }).length;
      if(exKnown && allCount>0){
        gp.innerHTML='<div class="bk-goal-top"><span class="t">📝 VOCAB QUIZ</span><button class="lq-filter on">외운 것 제외</button></div>'
          +'<div class="lq-empty">아직 안 외운 단어가 없어요! 🎉<br>버튼을 눌러 전체 단어로 볼 수 있어요.</div>';
        var fb2=gp.querySelector('.lq-filter');
        if(fb2) fb2.onclick=function(e){ e.stopPropagation(); self._lexQuizExKnown=false; try{ localStorage.setItem('nn_lex_quiz_exknown','0'); }catch(x){} self._lexQuizCur=null; var host=document.getElementById('lexQuizHost'); if(host){ host.innerHTML=''; host.appendChild(self._buildLexQuiz()); } };
      } else {
        gp.innerHTML='<div class="bk-goal-top"><span class="t">📝 VOCAB QUIZ</span></div>'
          +'<div class="lq-empty">어휘를 등록하면<br>이곳에서 복습할 수 있어요.</div>';
      }
      return gp;
    }
    var cur = self._lexQuizCur;
    if(!cur || pool.indexOf(cur)<0){ cur = pool[Math.floor(Math.random()*pool.length)]; self._lexQuizCur=cur; self._lexQuizShown=false; }
    var grpName=(function(){ var g=(self.groups.lexicon||[]).filter(function(x){return x.id===cur.groupId;})[0]; return g?(g.name||'').replace(/\s*[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]+\s*$/u,'').trim():''; })();
    var defText=(cur.content||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
    var shown=self._lexQuizShown;
    gp.innerHTML='<div class="bk-goal-top"><span class="t">📝 VOCAB QUIZ</span>'
      +'<button class="lq-filter'+(exKnown?' on':'')+'" title="암기 완료(✓) 단어 제외 여부">'+(exKnown?'외운 것 제외':'전체 단어')+'</button></div>'
      +(grpName?'<div class="lq-tagrow"><span class="lq-tag">'+grpName+'</span></div>':'')
      +'<div class="lq-term">'+ (cur.title||'') +'</div>'
      +'<div class="lq-def'+(shown?' show':'')+'">'+ (shown? defText : '뜻을 떠올려 보세요 · 탭하면 정답') +'</div>'
      +'<div class="lq-btns">'
      +  '<button class="lq-b lq-show">'+(shown?'뜻 숨기기':'정답 보기')+'</button>'
      +  '<button class="lq-b lq-next">다음 단어 →</button>'
      +'</div>';
    var defEl=gp.querySelector('.lq-def');
    gp.querySelector('.lq-show').onclick=function(e){ e.stopPropagation(); self._lexQuizShown=!self._lexQuizShown; refresh(); };
    defEl.onclick=function(e){ e.stopPropagation(); if(!self._lexQuizShown){ self._lexQuizShown=true; refresh(); } };
    gp.querySelector('.lq-next').onclick=function(e){ e.stopPropagation();
      var pick=cur; if(pool.length>1){ while(pick===cur){ pick=pool[Math.floor(Math.random()*pool.length)]; } }
      self._lexQuizCur=pick; self._lexQuizShown=false; refresh();
    };
    var fb=gp.querySelector('.lq-filter');
    if(fb) fb.onclick=function(e){ e.stopPropagation();
      self._lexQuizExKnown=!self._lexQuizExKnown;
      try{ localStorage.setItem('nn_lex_quiz_exknown', self._lexQuizExKnown?'1':'0'); }catch(x){}
      self._lexQuizCur=null; self._lexQuizShown=false; refresh();
    };
    function refresh(){ var host=document.getElementById('lexQuizHost'); if(host){ host.innerHTML=''; host.appendChild(self._buildLexQuiz()); } }
    return gp;
  },

  _buildReadingGoal: function(){
    var self=this;
    var store={}; try{ store=JSON.parse(localStorage.getItem('nn_book_goal_v1')||'{}'); }catch(e){}
    var yr = store.__year || new Date().getFullYear();
    var goal = parseInt(store[yr]||'0',10)||0;
    var doneCount = self.data.books.filter(function(b){ return b && b.groupId==='grp_books_done'; }).length;
    var pct = goal>0 ? Math.min(100, Math.round(doneCount/goal*100)) : 0;
    var gp=document.createElement('div'); gp.className='bk-goal';
    gp.innerHTML='<div class="bk-goal-top">'
      +'<span class="t"><input type="number" class="bk-goal-year" value="'+yr+'" title="연도"> READING GOAL</span>'
      +'<span class="bk-goal-set">목표 <input type="number" min="0" class="bk-goal-num" value="'+(goal||'')+'" placeholder="0"> 권</span></div>'
      +'<div class="bk-goal-bar"><div class="bk-goal-fill" style="width:'+pct+'%"></div></div>'
      +'<div class="bk-goal-meta"><span>완독 <b>'+doneCount+'</b> / '+(goal||'—')+' 권</span><span>달성률 <b>'+(goal>0?pct+'%':'—')+'</b></span></div>';
    function save(o){ try{ localStorage.setItem('nn_book_goal_v1', JSON.stringify(o)); }catch(e){} }
    var yInp=gp.querySelector('.bk-goal-year'), nInp=gp.querySelector('.bk-goal-num');
    yInp.onclick=function(e){ e.stopPropagation(); };
    yInp.onchange=function(){ var o={}; try{ o=JSON.parse(localStorage.getItem('nn_book_goal_v1')||'{}'); }catch(e){} o.__year=parseInt(this.value,10)||new Date().getFullYear(); save(o); self.renderSidebar('books'); };
    nInp.onclick=function(e){ e.stopPropagation(); };
    nInp.onchange=function(){ var o={}; try{ o=JSON.parse(localStorage.getItem('nn_book_goal_v1')||'{}'); }catch(e){} o[yInp.value]=parseInt(this.value,10)||0; save(o); self.renderSidebar('books'); };
    return gp;
  },

  renderSidebar: function(type) {
    if(type==='thesis'){ if(window.ThesisApp) ThesisApp.renderList(); return; }
    var container = document.getElementById(type + '-sidebar-list'); if (!container) return; container.innerHTML = '';
    var self = this; var activeId = this.activeIds[type]; var groups = this.groups[type] || [];
    groups.filter(function(g){ return !g.parentId; }).forEach(function(g){ container.appendChild(self._buildGroup(type, g, activeId)); });
    if(type==='books'){ var gh=document.getElementById('bkGoalHost'); if(gh){ gh.innerHTML=''; gh.appendChild(self._buildReadingGoal()); } }
    if(type==='lexicon'){ var qh=document.getElementById('lexQuizHost'); if(qh){ qh.innerHTML=''; qh.appendChild(self._buildLexQuiz()); } }
    var loosePages = this.data[type].filter(function(n){ return !n.groupId; });
    if(type==='media' && loosePages.length){
      var looseLabel = document.createElement('div'); looseLabel.className='media-loose-label';
      looseLabel.innerHTML='<span class="mll-ic">📥</span> 미분류 — 아직 토글에 넣지 않은 영상 <span class="mll-c">'+loosePages.length+'</span>';
      container.appendChild(looseLabel);
    }
    var ungrouped = document.createElement('div'); ungrouped.className = 'note-ungrouped' + (type==='media'?' media-loose':''); self._attachDrop(ungrouped, type, null);
    loosePages.forEach(function(note){ ungrouped.appendChild(self._buildPageItem(type, note, activeId)); });
    container.appendChild(ungrouped);
    var sb=document.createElement('div'); sb.className='nn-storage-bar nnsb-side'; container.appendChild(sb);
    if(window.__nnRenderStorage) window.__nnRenderStorage();
  },

  /* ── 단계 이동 시 필요한 항목 자동 보강/정리 ── */
  _syncBookFields: function(note, toGid){
    if(!note) return false;
    var box=document.createElement('div');
    box.innerHTML=note.content||'';
    var props=box.querySelector('.nn-props');
    if(!props) return false;
    var changed=false;

    function rowByKey(k){
      var rows=props.querySelectorAll('.nn-prop');
      for(var i=0;i<rows.length;i++){
        var kk=rows[i].querySelector('.np-k');
        if(kk && (kk.textContent||'').indexOf(k)>=0) return rows[i];
      }
      return null;
    }
    function hasKey(k){ return !!rowByKey(k); }
    function mkRow(html){ var d=document.createElement('div'); d.innerHTML=html; return d.firstElementChild; }
    function rowEmpty(row){
      if(!row) return true;
      var v=row.querySelector('.np-v');
      if(v) return !((v.textContent||'').trim());
      var st2=row.querySelector('.np-stars');
      if(st2) return (parseFloat(st2.getAttribute('data-rating'))||0)===0;
      return false;
    }
    /* '인상 깊은 구절' 섹션 찾기 → [제목, 안내, 목록] */
    function quoteParts(){
      var kids=Array.prototype.slice.call(box.children);
      for(var i=0;i<kids.length;i++){
        if((kids[i].textContent||'').indexOf('인상 깊은 구절')>=0 && kids[i].tagName!=='UL'){
          var head=kids[i], note2=null, list=null;
          for(var j=i+1;j<kids.length && j<=i+3;j++){
            if(!note2 && kids[j].classList && kids[j].classList.contains('np-note')){ note2=kids[j]; continue; }
            if(kids[j].tagName==='UL'){ list=kids[j]; break; }
          }
          return {head:head, note:note2, list:list};
        }
      }
      return null;
    }
    function listEmpty(ul){
      if(!ul) return true;
      return !((ul.textContent||'').replace(/\s+/g,'').trim());
    }

    var STARS='<div class="nn-prop"><span class="np-k">⭐ 별점</span><span class="np-stars" data-rating="0"><i class="st" data-v="1"><b class="h1" data-half="0.5"></b><b class="h2" data-half="1.0"></b></i><i class="st" data-v="2"><b class="h1" data-half="1.5"></b><b class="h2" data-half="2.0"></b></i><i class="st" data-v="3"><b class="h1" data-half="2.5"></b><b class="h2" data-half="3.0"></b></i><i class="st" data-v="4"><b class="h1" data-half="3.5"></b><b class="h2" data-half="4.0"></b></i><i class="st" data-v="5"><b class="h1" data-half="4.5"></b><b class="h2" data-half="5.0"></b></i></span></div>';

    if(toGid==='grp_books_wish'){
      /* 읽기 관련 항목은 '비어 있을 때만' 정리 — 입력값이 있으면 보존 */
      ['별점','읽기 시작한 날짜','다 읽은 날짜'].forEach(function(k){
        var r=rowByKey(k);
        if(r && rowEmpty(r)){ r.remove(); changed=true; }
      });
      var q=quoteParts();
      if(q && listEmpty(q.list)){
        if(q.head) q.head.remove();
        if(q.note) q.note.remove();
        if(q.list) q.list.remove();
        changed=true;
      }
      /* 구매 판단용 항목 보강 */
      if(!hasKey('알게 된 경로')){
        props.appendChild(mkRow('<div class="nn-prop"><span class="np-k">📌 알게 된 경로</span><span class="np-v" contenteditable="true" data-ph="예: 유튜브 추천 · 서점에서 발견"></span></div>'));
        changed=true;
      }
      if(!hasKey('예상 가격')){
        props.appendChild(mkRow('<div class="nn-prop"><span class="np-k">💰 예상 가격</span><span class="np-v" contenteditable="true" data-ph="예: 18,000원"></span></div>'));
        changed=true;
      }
      if(!hasKey('우선순위')){
        props.appendChild(mkRow('<div class="nn-prop"><span class="np-k">⚡ 우선순위</span><span class="np-v" contenteditable="true" data-ph="예: 높음 · 다음 달에"></span></div>'));
        changed=true;
      }
      /* '왜 읽고 싶은가' 섹션 */
      if((box.textContent||'').indexOf('왜 읽고 싶은가')<0){
        var sec=document.createElement('div');
        sec.innerHTML='<div style="font-weight:700;margin-top:12px">💭 왜 읽고 싶은가</div>'
          +'<div class="np-note" contenteditable="false">📚 기대하는 점을 적어두면, 나중에 읽고 나서 기대와 얼마나 맞았는지 비교할 수 있어요. 읽기 시작하면 별점·날짜·구절 칸이 자동으로 생깁니다.</div>'
          +'<ul><li><br></li></ul><div><br></div>';
        while(sec.firstChild) box.appendChild(sec.firstChild);
        changed=true;
      }
    }
    else if(toGid==='grp_books_reading' || toGid==='grp_books_done'){
      if(!hasKey('별점')){
        var starRow=mkRow(STARS);
        var catRow=rowByKey('종류');
        if(catRow) props.insertBefore(starRow, catRow); else props.appendChild(starRow);
        changed=true;
      }
      if(!hasKey('읽기 시작한 날짜')){
        props.appendChild(mkRow('<div class="nn-prop"><span class="np-k">📅 읽기 시작한 날짜</span><span class="np-v" contenteditable="true" data-ph="예: 2026/07/01"></span></div>'));
        changed=true;
      }
      if(!hasKey('다 읽은 날짜')){
        props.appendChild(mkRow('<div class="nn-prop"><span class="np-k">🏁 다 읽은 날짜</span><span class="np-v" contenteditable="true" data-ph="예: 2026/07/08"></span></div>'));
        changed=true;
      }
      /* 구매 계획 전용 항목: 비어 있으면 정리 (입력값이 있으면 기록으로 보존) */
      ['우선순위','알게 된 경로','예상 가격'].forEach(function(k){
        var r=rowByKey(k);
        if(r && rowEmpty(r)){ r.remove(); changed=true; }
      });
      /* '왜 읽고 싶은가' 섹션이 비어 있으면 정리 */
      var kids2=Array.prototype.slice.call(box.children);
      for(var w=0;w<kids2.length;w++){
        if((kids2[w].textContent||'').indexOf('왜 읽고 싶은가')>=0 && kids2[w].tagName!=='UL'){
          var wh=kids2[w], wn=null, wl=null;
          for(var z=w+1;z<kids2.length && z<=w+3;z++){
            if(!wn && kids2[z].classList && kids2[z].classList.contains('np-note')){ wn=kids2[z]; continue; }
            if(kids2[z].tagName==='UL'){ wl=kids2[z]; break; }
          }
          if(listEmpty(wl)){ wh.remove(); if(wn) wn.remove(); if(wl) wl.remove(); changed=true; }
          break;
        }
      }
      if((box.textContent||'').indexOf('인상 깊은 구절')<0){
        var sec2=document.createElement('div');
        sec2.innerHTML='<div style="font-weight:700;margin-top:12px">📌 인상 깊은 구절</div>'
          +'<div class="np-note" contenteditable="false">💡 점(•)에 쓴 문장은 이 책이 <b>완독</b> 그룹에 있을 때 홈 화면의 FROM MY LIBRARY 카드에 랜덤으로 표시됩니다.</div>'
          +'<ul><li><br></li></ul><div><br></div>';
        while(sec2.firstChild) box.appendChild(sec2.firstChild);
        changed=true;
      }
    }
    if(changed) note.content=box.innerHTML;
    return changed;
  },

  /* ── 책 전용 바: 단계 이동 · 네이버 검색 ── */
  _buildBookBar: function(note, titleInp){
    var self=this;
    var STAGES=[
      {id:'grp_books_wish',    lb:'사고 싶은 책', ic:'🛒'},
      {id:'grp_books_reading', lb:'읽는 중',     ic:'📖'},
      {id:'grp_books_done',    lb:'완독',        ic:'📚'}
    ];
    var wrap=document.createElement('div'); wrap.className='bk-bar';

    function paint(){
      var cur=note.groupId||'';
      var idx=-1;
      for(var i=0;i<STAGES.length;i++){ if(STAGES[i].id===cur){ idx=i; break; } }
      var h='<div class="bk-bar-r"><span class="bk-bar-k">단계</span><div class="bk-steps">';
      STAGES.forEach(function(st,i){
        var on = (i===idx);
        h+='<button type="button" class="bk-step'+(on?' on':'')+(i<idx?' passed':'')+'" data-g="'+st.id+'">'
          +'<span class="bk-step-ic">'+st.ic+'</span>'+st.lb+'</button>';
        if(i<STAGES.length-1) h+='<span class="bk-step-ar">›</span>';
      });
      h+='</div>';
      if(idx>-1 && idx<STAGES.length-1){
        var nx=STAGES[idx+1];
        h+='<button type="button" class="bk-next" data-g="'+nx.id+'">'+nx.ic+' '+nx.lb+'(으)로 이동 →</button>';
      }
      h+='</div>';
      h+='<div class="bk-bar-r"><span class="bk-bar-k">제목 확인</span>'
        +'<button type="button" class="bk-naver" id="bkNaver">🔍 네이버 책에서 검색</button>'
        +'<span class="bk-naver-h">제목이 맞는지, 실제 있는 책인지 확인해 보세요</span></div>';
      wrap.innerHTML=h;

      function moveTo(gid){
        var lb=''; STAGES.forEach(function(x){ if(x.id===gid) lb=x.lb; });
        var prev=note.groupId||null, prevContent=note.content;
        note.groupId=gid;
        var g=(self.groups && self.groups['books'])||[];
        var tg=g.find(function(x){ return x.id===gid; });
        if(tg) tg.collapsed=false;
        var grew=self._syncBookFields(note, gid);
        self.save(); self.renderSidebar('books');
        if(grew){ self.renderEditor('books'); }
        else { paint(); }
        if(window.__nnToast) window.__nnToast('✓ "'+lb+'"(으)로 옮겼습니다'+(grew?' · 항목이 추가되었습니다':''),{kind:'del',undo:function(){
          note.groupId=prev; note.content=prevContent;
          self.save(); self.renderSidebar('books'); self.renderEditor('books');
        }});
      }
      wrap.querySelectorAll('.bk-step').forEach(function(b){
        b.onclick=function(){ var g=b.getAttribute('data-g'); if(g!==(note.groupId||'')) moveTo(g); };
      });
      var nb=wrap.querySelector('.bk-next');
      if(nb) nb.onclick=function(){ moveTo(nb.getAttribute('data-g')); };
      var nv=wrap.querySelector('#bkNaver');
      if(nv) nv.onclick=function(){
        var q=((titleInp&&titleInp.value)||note.title||'').trim();
        if(!q || q==='제목 없는 페이지'){
          if(window.__nnToast) window.__nnToast('먼저 책 제목을 입력해 주세요',{kind:'del'});
          if(titleInp) titleInp.focus();
          return;
        }
        window.open('https://search.shopping.naver.com/book/search?query='+encodeURIComponent(q), '_blank', 'noopener');
      };
    }
    paint();
    return wrap;
  },

  renderEditor: function(type) {
    var mainContainer = document.getElementById(type + '-editor-main'); if (!mainContainer) return; mainContainer.innerHTML = '';
    var topRow = document.createElement('div'); topRow.className = 'editor-toprow';
    var backBtn = document.createElement('button'); backBtn.className = 'editor-back-btn'; backBtn.innerHTML = '← 목록으로'; backBtn.onclick = function(){ KnowledgeNotes.closeEditor(type); }; topRow.appendChild(backBtn);
    var shareBtn = document.createElement('button'); shareBtn.className = 'editor-share-btn'; shareBtn.innerHTML = '🔗 공유';
    shareBtn.title = '읽기 전용 링크를 만들어 다른 사람과 공유합니다';
    topRow.appendChild(shareBtn);
    mainContainer.appendChild(topRow);
    var activeId = this.activeIds[type]; var note = this.data[type].find(function(n) { return n.id === activeId; });
    if(type==='books' && note){ if(this._syncBookFields(note, note.groupId)) this.save(); }
    (function(){
      var KL={books:'BOOKS · 독서 기록', lexicon:'LEXICON · 용어', media:'MEDIA · 미디어', economics:'ECONOMICS · 경제 지식', thesis:'THESIS · 생각의 기록'};
      if(note){
        shareBtn.onclick = function(){ if(window.__nnShareOpen) window.__nnShareOpen(note, KL[type]||''); };
        if(window.__nnIsShared && window.__nnIsShared(note.id)){
          shareBtn.innerHTML='🌐 공유 중'; shareBtn.classList.add('on');
          shareBtn.title='링크가 있는 누구나 볼 수 있습니다 · 클릭하면 링크 확인·중지';
        }
      }
      else { shareBtn.style.display='none'; }
    })();
    if (!note) { var placeholder = document.createElement('div'); placeholder.className = 'editor-placeholder'; placeholder.innerHTML = '좌측 패널에서 카드를 추가하거나<br/>정리해 둔 단어를 선택하여 실시간 편집 및 지식을 누적하세요.'; mainContainer.appendChild(placeholder); return; }
    var self = this; var toolbar = document.createElement('div'); toolbar.className = 'editor-toolbar';
    toolbar.innerHTML = `<span class="tb-grp" data-g="글자"><button class="tb-btn" data-cmd="bold" style="font-weight:bold" data-tip="굵게 · Ctrl+B">B</button><button class="tb-btn" data-cmd="italic" style="font-style:italic" data-tip="기울임 · Ctrl+I">I</button><button class="tb-btn" data-cmd="underline" style="text-decoration:underline" data-tip="밑줄 · Ctrl+U">U</button><button class="tb-btn" data-cmd="strikeThrough" style="text-decoration:line-through" data-tip="취소선">S</button></span><span class="tb-grp" data-g="서체"><select class="tb-font" data-tip="글꼴을 바꿉니다 · 먼저 글자를 선택하세요"><option value="">글꼴</option><optgroup label="고딕"><option value="Pretendard">기본 고딕</option><option value="Noto Sans KR">노토 고딕</option><option value="Nanum Gothic">나눔고딕</option><option value="IBM Plex Sans KR">플렉스 고딕</option><option value="Gowun Dodum">고운돋움</option><option value="Sunflower">해바라기</option></optgroup><optgroup label="명조·세리프"><option value="Noto Serif KR">노토 명조</option><option value="Nanum Myeongjo">나눔명조</option><option value="Gowun Batang">고운바탕</option><option value="Song Myung">송명</option><option value="Hahmlet">함렛</option></optgroup><optgroup label="굵은 제목용"><option value="Gothic A1">고딕 A1</option><option value="Black Han Sans">검은고딕</option><option value="Do Hyeon">도현</option><option value="Jua">주아</option><option value="Stylish">스타일리시</option></optgroup><optgroup label="손글씨"><option value="Nanum Pen Script">나눔손글씨 펜</option><option value="Nanum Brush Script">나눔손글씨 붓</option><option value="Gaegu">개구</option><option value="Poor Story">푸어스토리</option><option value="Kirang Haerang">기랑해랑</option></optgroup><optgroup label="고정폭·영문"><option value="Nanum Gothic Coding">나눔고딕코딩</option><option value="Share Tech Mono">테크 모노</option><option value="Cormorant Garamond">Cormorant</option><option value="Bebas Neue">Bebas Neue</option><option value="Syne">Syne</option><option value="Orbitron">Orbitron</option></optgroup></select><span class="tb-sizewrap" data-tip="글자 크기 (px) · 먼저 글자를 선택하세요"><button type="button" class="tb-szbtn" data-sz="-1">−</button><input type="number" class="tb-size" min="8" max="140" step="1" value="16" aria-label="글자 크기"><button type="button" class="tb-szbtn" data-sz="1">＋</button></span></span><span class="tb-grp" data-g="제목"><button class="tb-btn" data-block="h1" data-tip="큰 제목">H1</button><button class="tb-btn" data-block="h2" data-tip="중간 제목">H2</button><button class="tb-btn" data-block="h3" data-tip="작은 제목">H3</button><button class="tb-btn" data-block="p" data-tip="본문으로 되돌리기">T</button></span><span class="tb-grp" data-g="목록"><button class="tb-btn" data-list="ul" data-tip="점 목록">&#8226; 목록</button><button class="tb-btn" data-list="ol" data-tip="번호 목록">1. 목록</button><button class="tb-btn tb-autolist" data-tip="엔터로 목록이 자동으로 이어지게 할지 정합니다">•&#8629;</button><button class="tb-btn" data-action="check" data-tip="체크박스 할 일">&#9745; 할일</button></span><span class="tb-grp" data-g="강조"><button class="tb-btn" data-block="blockquote" data-tip="인용문">&#8220; 인용</button><button class="tb-btn" data-action="callout" data-tip="강조 상자">&#128161; 콜아웃</button><button class="tb-btn" data-action="link" data-tip="링크 걸기">&#128279; 링크</button><button class="tb-btn" data-action="hr" data-tip="가로 구분선">&#8212; 구분선</button></span><span class="tb-grp" data-g="들여쓰기"><button class="tb-btn" data-action="outdent" data-tip="내어쓰기">&#8676;</button><button class="tb-btn" data-action="indent" data-tip="들여쓰기">&#8677;</button><div class="tb-color-group"></span><span class="tb-grp" data-g="색"><span class="tb-label" data-tip="선택한 글자의 색을 바꿉니다">글자색</span><button class="tb-swatch" data-fore="#f0ede6" style="background:#f0ede6"></button><button class="tb-swatch" data-fore="#c9a96e" style="background:#c9a96e"></button><button class="tb-swatch" data-fore="#ff6e40" style="background:#ff6e40"></button><button class="tb-swatch" data-fore="#7a9e7e" style="background:#7a9e7e"></button><button class="tb-swatch" data-fore="#8ab4d4" style="background:#8ab4d4"></button><button class="tb-swatch" data-fore="#b28ad4" style="background:#b28ad4"></button><button class="tb-swatch" data-fore="#e05555" style="background:#e05555"></button></div><div class="tb-color-group"><span class="tb-label" data-tip="선택한 글자에 형광펜을 칠합니다">배경</span><button class="tb-swatch tb-bg" data-back="transparent" style="background:transparent;border:0.5px solid rgba(255,255,255,.3)"></button><button class="tb-swatch tb-bg" data-back="rgba(201,169,110,.25)" style="background:rgba(201,169,110,.45)"></button><button class="tb-swatch tb-bg" data-back="rgba(255,110,64,.25)" style="background:rgba(255,110,64,.45)"></button><button class="tb-swatch tb-bg" data-back="rgba(122,158,126,.25)" style="background:rgba(122,158,126,.45)"></button><button class="tb-swatch tb-bg" data-back="rgba(138,180,212,.25)" style="background:rgba(138,180,212,.45)"></button><button class="tb-swatch tb-bg" data-back="rgba(178,138,212,.25)" style="background:rgba(178,138,212,.45)"></button></div></span><span class="tb-grp" data-g="넣기"><button class="tb-btn" data-action="img" style="color:#1fe0ff" data-tip="사진 한 장 넣기">&#128247; 사진</button><button class="tb-btn" data-action="gallery" style="color:#1fe0ff" data-tip="사진 여러 장 넣기">&#128444; 사진 여러장</button><button class="tb-btn" data-action="table" data-tip="표 삽입">⊞ 표</button></span>`;
    toolbar.querySelectorAll('[data-cmd]').forEach(function(b){ b.onmousedown = function(e){ e.preventDefault(); }; b.onclick = function(){ self.execCmd(this.dataset.cmd); }; });
    toolbar.querySelectorAll('[data-block]').forEach(function(b){ b.onmousedown = function(e){ e.preventDefault(); }; b.onclick = function(){ self.execCmd('formatBlock', '<'+this.dataset.block+'>'); }; });
    toolbar.querySelectorAll('[data-list]').forEach(function(b){ b.onmousedown = function(e){ e.preventDefault(); }; b.onclick = function(){ self.execCmd(this.dataset.list === 'ol' ? 'insertOrderedList' : 'insertUnorderedList'); }; });
    toolbar.querySelectorAll('[data-action]').forEach(function(b){ b.onmousedown = function(e){ e.preventDefault(); }; b.onclick = function(){ if(this.dataset.action==='img') self.insertImgUrl(); if(this.dataset.action==='check') self.insertChecklist(); if(this.dataset.action==='callout') self.insertCallout(); if(this.dataset.action==='link') self.insertLink(); if(this.dataset.action==='hr') self.execCmd('insertHorizontalRule'); if(this.dataset.action==='indent') self.execCmd('indent'); if(this.dataset.action==='outdent') self.execCmd('outdent'); if(this.dataset.action==='table') self.insertTable(this); if(this.dataset.action==='gallery') self.insertGallery(); }; });
    toolbar.querySelectorAll('[data-fore]').forEach(function(b){ b.onmousedown = function(e){ e.preventDefault(); }; b.onclick = function(){ self.execCmd('foreColor', this.dataset.fore); }; });
    toolbar.querySelectorAll('[data-back]').forEach(function(b){ b.onmousedown = function(e){ e.preventDefault(); }; b.onclick = function(){ var c = this.dataset.back; self.execCmd('hiliteColor', c) || self.execCmd('backColor', c); }; });
    /* ── 글꼴 · 글자 크기 드롭다운 ── */
    (function(){
      var savedRange=null;
      /* editableBody는 이 시점에 아직 생성 전 → 필요할 때 찾아 쓴다 */
      function bodyEl(){ return mainContainer.querySelector('[contenteditable="true"]'); }
      function remember(){
        try{
          var sel=window.getSelection();
          if(sel && sel.rangeCount && !sel.isCollapsed) savedRange=sel.getRangeAt(0).cloneRange();
        }catch(e){}
      }
      function restore(){
        try{
          if(!savedRange) return false;
          var sel=window.getSelection();
          sel.removeAllRanges(); sel.addRange(savedRange);
          return !sel.isCollapsed;
        }catch(e){ return false; }
      }
      /* 드롭다운을 여는 순간 선택이 풀리므로 미리 저장 */
      ['mousedown','focus'].forEach(function(ev){
        toolbar.querySelectorAll('.tb-font,.tb-size,.tb-szbtn').forEach(function(el){
          el.addEventListener(ev, remember, true);
        });
      });
      var fsel=toolbar.querySelector('.tb-font');
      if(fsel) fsel.onchange=function(){
        var v=this.value; this.selectedIndex=0;
        if(!v) return;
        if(!restore()){ if(window.__nnToast) window.__nnToast('바꿀 글자를 먼저 선택해 주세요',{kind:'del'}); return; }
        if(inProps()){ if(window.__nnToast) window.__nnToast('작가·별점 같은 항목 칸은 글꼴을 바꿀 수 없어요 · 본문에서만 가능합니다',{kind:'del'}); return; }
        try{ document.execCommand('styleWithCSS', false, true); }catch(e){}
        self.execCmd('fontName', v);
        savedRange=null;
      };
      /* ── 글자 크기: 숫자 입력 + 증감 버튼 ── */
      var zin=toolbar.querySelector('.tb-size');
      /* 속성칸(작가·별점·종류 등)은 서식 대상에서 제외 — 본문만 허용 */
      function inProps(){
        try{
          var sel=window.getSelection();
          if(!sel || !sel.rangeCount) return false;
          var n=sel.getRangeAt(0).commonAncestorContainer;
          if(n.nodeType===3) n=n.parentNode;
          while(n && n!==document.body){
            if(n.classList && (n.classList.contains('nn-props') || n.classList.contains('np-v')
               || n.classList.contains('np-k') || n.classList.contains('np-stars')
               || n.classList.contains('np-cat') || n.classList.contains('bk-bar'))) return true;
            n=n.parentNode;
          }
        }catch(e){}
        return false;
      }
      function applySize(px){
        px=Math.max(8, Math.min(140, Math.round(px||0)));
        if(!px) return;
        if(!restore()){ if(window.__nnToast) window.__nnToast('크기를 바꿀 글자를 먼저 선택해 주세요',{kind:'del'}); return; }
        if(inProps()){ if(window.__nnToast) window.__nnToast('작가·별점 같은 항목 칸은 크기를 바꿀 수 없어요 · 본문에서만 가능합니다',{kind:'del'}); return; }
        try{ document.execCommand('styleWithCSS', false, true); }catch(e){}
        /* execCommand fontSize는 1~7 단계뿐이라 직접 span으로 감싼다 */
        try{
          var sel=window.getSelection();
          if(sel && sel.rangeCount && !sel.isCollapsed){
            var r=sel.getRangeAt(0);
            var span=document.createElement('span');
            span.style.fontSize=px+'px';
            span.appendChild(r.extractContents());
            r.insertNode(span);
            sel.removeAllRanges();
            var nr=document.createRange(); nr.selectNodeContents(span); sel.addRange(nr);
            savedRange=nr.cloneRange();
          }
        }catch(e){}
        try{ var _eb=bodyEl(); if(_eb) self.update(type, note.id, 'content', _eb.innerHTML); }catch(e){}
      }
      /* 선택한 글자의 현재 크기를 입력칸에 비춰 준다 */
      function reflectSize(){
        try{
          var sel=window.getSelection();
          if(!sel || !sel.rangeCount) return;
          var node=sel.getRangeAt(0).startContainer;
          if(node.nodeType===3) node=node.parentNode;
          var _eb2=bodyEl(); if(!_eb2 || !node || !_eb2.contains(node)) return;
          var cs=window.getComputedStyle(node).fontSize;
          var v=parseFloat(cs);
          if(v && zin && document.activeElement!==zin) zin.value=Math.round(v);
        }catch(e){}
      }
      (function bindReflect(){
        var eb=bodyEl();
        if(!eb){ setTimeout(bindReflect, 40); return; }
        eb.addEventListener('keyup', reflectSize);
        eb.addEventListener('mouseup', reflectSize);
      })();
      if(zin){
        zin.addEventListener('change', function(){ applySize(parseInt(zin.value,10)); });
        zin.addEventListener('keydown', function(e){
          if(e.key==='Enter'){ e.preventDefault(); applySize(parseInt(zin.value,10)); }
        });
      }
      toolbar.querySelectorAll('.tb-szbtn').forEach(function(b){
        b.addEventListener('mousedown', function(e){ e.preventDefault(); remember(); }, true);
        b.onclick=function(){
          var d=parseInt(b.getAttribute('data-sz'),10)||0;
          var cur=parseInt(zin&&zin.value,10)||16;
          var nv=Math.max(8, Math.min(140, cur+d));
          if(zin) zin.value=nv;
          applySize(nv);
        };
      });
    })();
    var titleInp = document.createElement('input'); titleInp.type = 'text'; titleInp.className = 'note-title-input'; titleInp.value = note.title; titleInp.placeholder = type === 'lexicon' ? '새로운 용어 혹은 단어 기입' : '제목 없는 페이지'; titleInp.oninput = function() { self.update(type, note.id, 'title', this.value); };
    var editableBody = document.createElement('div'); editableBody.className = 'note-editable-body'; editableBody.contentEditable = 'true'; editableBody.innerHTML = note.content; editableBody.oninput = function() { self.update(type, note.id, 'content', this.innerHTML); };
    if(type === 'books'){
      /* 줄바꿈 시 기본 입력 모드 = 불릿: 리스트 밖에서 Enter로 생긴 새 줄을 자동으로 점 목록으로 전환 */
      editableBody.addEventListener('keyup', function(e){
        if(e.key !== 'Enter' || e.shiftKey) return;
        var sel = window.getSelection(); if(!sel || !sel.rangeCount) return;
        var node = sel.anchorNode; if(!node) return;
        var el = node.nodeType === 1 ? node : node.parentElement; if(!el || !editableBody.contains(el)) return;
        if(el.closest('li, ul, ol, table, .nn-props, .nn-callout, .nn-check, .nn-gallery, h1, h2, h3, blockquote')) return;
        document.execCommand('insertUnorderedList');
      });
      /* 빈 점에서 백스페이스 → 점 제거(일반 줄) — 홈 카드에 안 나가는 자유 메모용 */
      /* ── 엔터로 목록을 이어갈지 여부 (기본: 이어감) ── */
    function autoListOn(){
      try{ return localStorage.getItem('nn_autolist_v1') !== '0'; }catch(e){ return true; }
    }
    function paintAutoListBtn(){
      var b = toolbar.querySelector('.tb-autolist');
      if(!b) return;
      var on = autoListOn();
      b.classList.toggle('on', on);
      b.setAttribute('data-tip', on
        ? '목록 자동 이어가기 · 켜짐 — 엔터를 누르면 다음 항목이 생깁니다'
        : '목록 자동 이어가기 · 꺼짐 — 엔터를 누르면 일반 줄로 빠져나옵니다');
    }
    (function(){
      var b = toolbar.querySelector('.tb-autolist');
      if(!b) return;
      paintAutoListBtn();
      b.onmousedown = function(ev){ ev.preventDefault(); };
      b.onclick = function(){
        try{ localStorage.setItem('nn_autolist_v1', autoListOn() ? '0' : '1'); }catch(e){}
        paintAutoListBtn();
        if(window.__nnToast) window.__nnToast(autoListOn()
          ? '엔터를 누르면 목록이 이어집니다'
          : '엔터를 누르면 목록을 빠져나옵니다');
      };
    })();

    editableBody.addEventListener('keydown', function(e){
      /* 자동 이어가기를 껐다면, 목록 안에서 엔터를 눌러도 일반 줄로 나온다 */
      if(e.key === 'Enter' && !e.shiftKey && !autoListOn()){
        try{
          var sel0 = window.getSelection();
          if(sel0 && sel0.rangeCount){
            var n0 = sel0.anchorNode;
            var e0 = n0 && (n0.nodeType === 1 ? n0 : n0.parentElement);
            var li0 = e0 && e0.closest ? e0.closest('li') : null;
            if(li0 && editableBody.contains(li0)){
              e.preventDefault();
              document.execCommand('insertParagraph');
              document.execCommand('insertUnorderedList');   /* 새로 생긴 항목을 일반 줄로 되돌림 */
              self.update(type, note.id, 'content', editableBody.innerHTML);
              return;
            }
          }
        }catch(err){}
      }
    });

    editableBody.addEventListener('keydown', function(e){
        if(e.key !== 'Backspace') return;
        var sel = window.getSelection(); if(!sel || !sel.rangeCount || !sel.isCollapsed) return;
        var node = sel.anchorNode; if(!node) return;
        var el2 = node.nodeType === 1 ? node : node.parentElement; if(!el2) return;
        var li = el2.closest('li'); if(!li || !editableBody.contains(li)) return;
        if((li.textContent||'').trim() !== '') return;
        e.preventDefault();
        document.execCommand('insertUnorderedList');
      });
    }
    editableBody.onclick = function(e) { if (e.target.tagName === 'IMG') { var body=this; if(window.__nnLightbox){ window.__nnLightbox(e.target, function(){ self.update(type, note.id, 'content', body.innerHTML); }); } } };
    editableBody.onclick = (function(prevHandler){ return function(e){ if(prevHandler) prevHandler.call(this, e); var td = e.target.closest ? e.target.closest('td') : null; if(td && td.closest('table.nn-table')){ self.showTablePopup(td, type, note.id, editableBody); } else if(!e.target.closest || !e.target.closest('.nn-table-popup')) { self.hideTablePopup(); } }; })(editableBody.onclick);
    var scrollArea = document.createElement('div'); scrollArea.className = 'editor-scroll-area'; scrollArea.appendChild(titleInp); /* 툴바는 제목 아래에 두고, 스크롤해도 따라오도록 고정한다 */ toolbar.classList.add('tb-sticky'); scrollArea.appendChild(toolbar);
    if(type === 'books'){ var bkBar = self._buildBookBar(note, titleInp); if(bkBar) scrollArea.appendChild(bkBar); }
    /* 연결 패널 — 이 기록과 이어지는 책·생각·종목 */
    if(note && window.__nnRelPanel && window.__nnRel){
      try{ scrollArea.appendChild(window.__nnRelPanel(window.__nnRel.makeRef('note', type, note.id))); }catch(e){}
    }
    scrollArea.appendChild(editableBody); mainContainer.appendChild(scrollArea);
  },

  exportData: function() {
    /* 전체 백업 — nn_ 로 시작하는 모든 키를 담는다.
       (예전에는 4종만 담아 관심종목·보유·자산·설정이 전부 유실됐다) */
    var data = {};
    try{
      for(var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i);
        if(!k || k.indexOf('nn_') !== 0) continue;
        if(k === 'nn_db_pin') continue;            /* 보호 PIN은 백업에서 제외 */
        data[k] = localStorage.getItem(k);
      }
    }catch(e){}

    var backup = {
      schemaVersion: 2,
      appVersion: 'v10',
      createdAt: new Date().toISOString(),
      keyCount: Object.keys(data).length,
      data: data,
      /* 구버전 복원기와의 호환 — 예전 형식 필드도 함께 넣어 둔다 */
      vault: data['nn_knowledge_vault_v2'] || null,
      groups: data['nn_knowledge_groups_v1'] || null,
      holdOrder: data['nn_hold_order'] || null,
      finnhub: data['nn_finnhub'] || null
    };

    var json = JSON.stringify(backup);
    var now = new Date();
    var dateStr = now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0');
    try{
      var blob = new Blob([json], {type:'application/json'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'newnormal_backup_' + dateStr + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    }catch(e){
      var a2 = document.createElement('a');
      a2.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);
      a2.download = 'newnormal_backup_' + dateStr + '.json';
      document.body.appendChild(a2); a2.click(); a2.remove();
    }
    if(window.__nnToast) window.__nnToast('✓ 백업 완료 — ' + backup.keyCount + '개 항목 · ' + Math.round(json.length/1024) + 'KB');
  },

  importData: function() {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = function(e) {
      var file = e.target.files[0]; if(!file) return;
      var reader = new FileReader();
      reader.onload = function(evt) {
        var backup;
        try{ backup = JSON.parse(evt.target.result); }
        catch(err){
          if(window.__nnConfirm) window.__nnConfirm({title:'복구할 수 없습니다', msg:'백업 파일 형식이 올바르지 않거나 파일이 손상되었습니다.', ok:'확인', onOk:function(){}});
          else alert('올바르지 않은 백업 파일입니다.');
          return;
        }

        /* 신·구 형식 모두 받아들인다 */
        var map = {};
        if(backup && backup.data && typeof backup.data === 'object'){
          map = backup.data;                                   /* 신형식 (schemaVersion 2) */
        } else if(backup){
          if(backup.vault)     map['nn_knowledge_vault_v2'] = backup.vault;   /* 구형식 */
          if(backup.groups)    map['nn_knowledge_groups_v1'] = backup.groups;
          if(backup.holdOrder) map['nn_hold_order'] = backup.holdOrder;
          if(backup.finnhub)   map['nn_finnhub'] = backup.finnhub;
        }
        var keys = Object.keys(map);
        if(!keys.length){
          if(window.__nnToast) window.__nnToast('백업 파일에 복구할 데이터가 없습니다',{kind:'del'});
          return;
        }

        var ver = backup.schemaVersion || 1;
        var when = backup.createdAt ? String(backup.createdAt).slice(0,10) : '날짜 미상';
        var run = function(){
          var ok=0, fail=0;
          keys.forEach(function(k){
            if(k === 'nn_db_pin') return;
            try{ localStorage.setItem(k, map[k]); ok++; }catch(err){ fail++; }
          });
          if(fail){
            if(window.__nnToast) window.__nnToast(ok+'개 복구 · '+fail+'개 실패 (저장 공간 부족)',{kind:'del'});
            setTimeout(function(){ location.reload(); }, 2600);
          } else {
            if(window.__nnToast) window.__nnToast('✓ '+ok+'개 항목을 복구했습니다 — 곧 새로고침됩니다');
            setTimeout(function(){ location.reload(); }, 1400);
          }
        };

        if(window.__nnConfirm){
          window.__nnConfirm({
            title: '백업을 복구할까요?',
            msg: '백업 시점: ' + when + ' · ' + keys.length + '개 항목 (형식 v' + ver + ')\n'
               + '지금 브라우저에 저장된 같은 이름의 기록은 덮어쓰기 됩니다.',
            ok: '복구', onOk: run
          });
        } else if(confirm('백업 '+keys.length+'개 항목을 복구할까요? 현재 기록은 덮어쓰기 됩니다.')) run();
      };
      reader.readAsText(file);
    };
    input.click();
  }
};

/* ══════════ 마퀴 종목 편집기 ══════════ */
(function(){
  var META={
    home1:{sel:'#homeTicker1', lb:'매크로 1번 줄 · 글로벌 지표'},
    home2:{sel:'#homeTicker2', lb:'매크로 2번 줄 · 보유·관심 종목'},
    macro:{sel:'#homeTicker1', lb:'매크로 상단 · 글로벌 지표'}
  };
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function W(){ return (typeof workerUrl==='function')?workerUrl():''; }

  function openEditor(id){
    var meta=META[id]; if(!meta) return;
    var list=(window.__tkList?window.__tkList(id):[]).slice();
    var prev=document.getElementById('tkEditOv'); if(prev) prev.remove();
    var ov=document.createElement('div');
    ov.id='tkEditOv'; ov.className='hub-modal-ov';
    ov.innerHTML='<div class="hub-modal tk-modal">'
      + '<div class="hm-title">마퀴 종목 편집</div>'
      + '<div class="tk-sub">'+esc(meta.lb)+'</div>'
      + '<label class="hm-lb">종목 검색 <span class="hm-hint">(기업명·티커 — 미국·한국·코인)</span></label>'
      + '<input class="hm-in" id="tkSearch" placeholder="예: 삼성전자, apple, NVDA, 비트코인" autocomplete="off">'
      + '<div class="wl-sr" id="tkSearchRes"></div>'
      + '<label class="hm-lb" style="margin-top:12px">직접 입력 <span class="hm-hint">(TradingView 심볼 · 예: NASDAQ:AAPL)</span></label>'
      + '<div class="tk-manual"><input class="hm-in" id="tkSym" placeholder="NASDAQ:AAPL" autocomplete="off">'
      +   '<input class="hm-in" id="tkName" placeholder="표시 이름" autocomplete="off">'
      +   '<button type="button" class="tk-addbtn" id="tkAdd">＋</button></div>'
      + '<label class="hm-lb" style="margin-top:14px">현재 목록 <span class="hm-hint" id="tkCount"></span></label>'
      + '<div class="tk-list" id="tkList"></div>'
      + '<div class="hm-btns"><button type="button" class="hm-btn tk-reset">기본값 복원</button>'
      +   '<button type="button" class="hm-btn hm-cancel">취소</button>'
      +   '<button type="button" class="hm-btn hm-save">저장</button></div>'
      + '</div>';
    document.body.appendChild(ov);
    var listEl=ov.querySelector('#tkList'), cntEl=ov.querySelector('#tkCount');
    var sIn=ov.querySelector('#tkSearch'), sRes=ov.querySelector('#tkSearchRes');

    function paint(){
      cntEl.textContent=list.length+'개';
      if(!list.length){ listEl.innerHTML='<div class="tk-empty">종목이 없습니다 — 위에서 추가하세요.</div>'; return; }
      listEl.innerHTML=list.map(function(x,i){
        return '<div class="tk-row" data-i="'+i+'">'
          + '<span class="tk-ord">'+String(i+1).padStart(2,'0')+'</span>'
          + '<span class="tk-nm">'+esc(x.title||'')+'</span>'
          + '<span class="tk-sy">'+esc(x.proName||'')+'</span>'
          + '<span class="tk-acts"><button type="button" class="tk-mv" data-d="-1" title="위로">▲</button>'
          +   '<button type="button" class="tk-mv" data-d="1" title="아래로">▼</button>'
          +   '<button type="button" class="tk-rm" title="삭제">✕</button></span>'
          + '</div>';
      }).join('');
      listEl.querySelectorAll('.tk-row').forEach(function(row){
        var i=parseInt(row.getAttribute('data-i'),10);
        row.querySelector('.tk-rm').onclick=function(){ list.splice(i,1); paint(); };
        row.querySelectorAll('.tk-mv').forEach(function(b){
          b.onclick=function(){
            var d=parseInt(b.getAttribute('data-d'),10), j=i+d;
            if(j<0||j>=list.length) return;
            var t=list[i]; list[i]=list[j]; list[j]=t; paint();
          };
        });
      });
    }
    function add(sym,name){
      sym=(sym||'').trim(); name=(name||'').trim()||sym;
      if(!sym){ if(window.__nnToast) window.__nnToast('심볼을 입력해 주세요',{kind:'del'}); return; }
      if(list.some(function(x){ return String(x.proName).toUpperCase()===sym.toUpperCase(); })){
        if(window.__nnToast) window.__nnToast('이미 목록에 있습니다',{kind:'del'}); return;
      }
      list.push({proName:sym, title:name}); paint();
    }
    ov.querySelector('#tkAdd').onclick=function(){
      add(ov.querySelector('#tkSym').value, ov.querySelector('#tkName').value);
      ov.querySelector('#tkSym').value=''; ov.querySelector('#tkName').value='';
    };

    /* 통합 검색 → TradingView 심볼로 변환 */
    var tmr=null, cache=[];
    function toTV(o){
      if(o.market==='kr') return 'KRX:'+o.sym;
      if(o.market==='crypto') return 'BINANCE:'+o.sym+'USDT';
      return o.sym;   /* 미국은 심볼만 넣으면 자동 인식 */
    }
    function doSearch(){
      var q=(sIn.value||'').trim();
      if(!q){ sRes.innerHTML=''; return; }
      var w=W();
      if(!w){ sRes.innerHTML='<div class="wl-sr-empty">검색은 프록시 연결 후 사용할 수 있어요. 아래에서 직접 입력해 주세요.</div>'; return; }
      sRes.innerHTML='<div class="wl-sr-empty">검색 중...</div>';
      fetch(w+'/search?q='+encodeURIComponent(q)).then(function(r){ return r.ok?r.json():[]; })
        .then(function(arr){
          if((sIn.value||'').trim()!==q) return;
          cache=Array.isArray(arr)?arr:[];
          if(!cache.length){ sRes.innerHTML='<div class="wl-sr-empty">결과가 없습니다.</div>'; return; }
          sRes.innerHTML=cache.map(function(o,i){
            var mk=o.market==='us'?'US':o.market==='kr'?'KR':'CRYPTO';
            return '<button type="button" class="wl-sr-item" data-i="'+i+'">'
              +'<span class="wl-mkt wl-mkt-'+o.market+'">'+mk+'</span>'
              +'<span class="wl-sr-sym">'+esc(o.sym)+'</span>'
              +'<span class="wl-sr-name">'+esc(o.name)+'</span></button>';
          }).join('');
          sRes.querySelectorAll('.wl-sr-item').forEach(function(b){
            b.onclick=function(){
              var o=cache[parseInt(b.getAttribute('data-i'),10)]; if(!o) return;
              add(toTV(o), o.name||o.sym);
              sIn.value=''; sRes.innerHTML='';
            };
          });
        }).catch(function(){ sRes.innerHTML='<div class="wl-sr-empty">검색 실패</div>'; });
    }
    sIn.addEventListener('input',function(){ clearTimeout(tmr); tmr=setTimeout(doSearch,450); });

    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    ov.querySelector('.hm-cancel').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    ov.querySelector('.tk-reset').onclick=function(){
      if(window.__tkReset) window.__tkReset(id);
      list=(window.__tkList?window.__tkList(id):[]).slice();
      paint();
      if(window.__nnToast) window.__nnToast('기본값으로 되돌렸습니다 (저장을 눌러 적용)');
    };
    ov.querySelector('.hm-save').onclick=function(){
      if(!list.length){ if(window.__nnToast) window.__nnToast('최소 1개 종목이 필요합니다',{kind:'del'}); return; }
      if(window.__tkSave) window.__tkSave(id, list);
      if(window.__tkRebuild) window.__tkRebuild(id);
      close();
      if(window.__nnToast) window.__nnToast('✓ 마퀴가 업데이트되었습니다');
    };
    paint();
    requestAnimationFrame(function(){ ov.classList.add('show'); sIn.focus(); });
  }
  window.__tkEdit=openEditor;

  function dismissHint(){
    try{ localStorage.setItem('nn_tk_hint','1'); }catch(e){}
    document.querySelectorAll('.tk-tip').forEach(function(t){
      t.classList.remove('on');
      setTimeout(function(){ if(t.parentNode) t.remove(); },260);
    });
    document.querySelectorAll('.tk-edit-btn.tk-pulse').forEach(function(b){ b.classList.remove('tk-pulse'); });
  }

  /* 각 마퀴에 편집 버튼 부착 */
  function attach(){
    Object.keys(META).forEach(function(id){
      var root=document.querySelector(META[id].sel);
      if(!root || root.__tkBtn) return;
      var wrap=root.parentNode; if(!wrap) return;
      if(getComputedStyle(root).position==='static') root.style.position='relative';
      var b=document.createElement('button');
      b.type='button'; b.className='tk-edit-btn'; b.title='이 마퀴의 종목을 직접 편집합니다';
      b.innerHTML='<span class="tk-eb-ic">✎</span><span class="tk-eb-lb">종목 편집</span>';
      b.onclick=function(e){ e.stopPropagation(); dismissHint(); openEditor(id); };
      root.appendChild(b);
      root.__tkBtn=true;

      /* 최초 1회 안내 — 기능 존재를 알림 */
      var seen=false;
      try{ seen=localStorage.getItem('nn_tk_hint')==='1'; }catch(e){}
      if(!seen && id==='home1'){
        b.classList.add('tk-pulse');
        var tip=document.createElement('div');
        tip.className='tk-tip';
        tip.innerHTML='<b>마퀴 종목을 직접 편집할 수 있어요</b><span>여기를 눌러 추가 · 삭제 · 순서 변경</span>'
          + '<button type="button" class="tk-tip-x" aria-label="닫기">✕</button>';
        root.appendChild(tip);
        requestAnimationFrame(function(){ tip.classList.add('on'); });
        tip.querySelector('.tk-tip-x').onclick=function(e){ e.stopPropagation(); dismissHint(); };
        setTimeout(dismissHint, 14000);
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(attach,400); });
  else setTimeout(attach,400);
  setInterval(attach,3000);
})();

/* ══════════ 커맨드 팔레트 (Ctrl+K / Cmd+K — 빠른 이동·검색) ══════════ */
(function(){
  var ov=null, inp=null, listEl=null, items=[], activeIdx=0;
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  var TABS=[
    {t:'홈', sub:'HOME', page:'home'},
    {t:'매크로', sub:'MACRO · 실시간 시장', page:'macro'},
    {t:'리서치', sub:'RESEARCH', page:'research'},
    {t:'자산', sub:'ASSETS', page:'assets'},
    {t:'북스', sub:'BOOKS', page:'books'},
    {t:'미디어', sub:'MEDIA', page:'media'},
    {t:'렉시콘', sub:'LEXICON', page:'lexicon'},
    {t:'이코노믹스', sub:'ECONOMICS', page:'economics'},
    {t:'포트폴리오', sub:'PORTFOLIO', page:'portfolio'},
    {t:'어바웃', sub:'ABOUT', page:'about'}
  ];
  var NOTE_META={books:{lb:'BOOKS',c:'#e8c47e'},media:{lb:'MEDIA',c:'#7fbef5'},lexicon:{lb:'LEXICON',c:'#aeb1b4'},economics:{lb:'ECON',c:'#7fd58c'}};

  /* 실행 명령 */
  function goHome(fn,delay){
    return function(){
      if(typeof switchPage==='function') switchPage('home');
      setTimeout(fn, delay||220);
    };
  }
  function scrollTo(sel,off){
    return goHome(function(){
      var el=document.querySelector(sel); if(!el) return;
      window.scrollTo({top:Math.max(0, el.getBoundingClientRect().top+window.pageYOffset-(off||60)), behavior:'smooth'});
    });
  }
  var CMDS=[
    /* 배경 */
    {t:'배경화면 메뉴 열기', sub:'BACKDROP', run:function(){ var b=document.getElementById('bgSwitchBtn'); if(b) b.click(); }},
    {t:'다음 배경화면으로', sub:'즉시 전환', run:function(){ if(window.__bgNext) window.__bgNext(); }},
    {t:'이전 배경화면으로', sub:'즉시 전환', run:function(){ if(window.__bgPrev) window.__bgPrev(); }},
    {t:'배경화면 추가', sub:'이미지 URL로 등록', run:function(){ if(window.__bgAdd) window.__bgAdd(); }},
    {t:'배경 자동 전환 — 3분', sub:'자동 전환 켜기', run:function(){ if(window.__bgSetAuto) window.__bgSetAuto('3'); }},
    {t:'배경 자동 전환 — 10분', sub:'자동 전환 켜기', run:function(){ if(window.__bgSetAuto) window.__bgSetAuto('10'); }},
    {t:'배경 자동 전환 끄기', sub:'고정', run:function(){ if(window.__bgSetAuto) window.__bgSetAuto('off'); }},
    /* 기록 작성 */
    {t:'새 책 기록 쓰기', sub:'BOOKS', run:function(){ if(typeof switchPage==='function') switchPage('books'); setTimeout(function(){ try{ KnowledgeNotes.create('books'); }catch(e){} },240); }},
    {t:'새 용어 기록 쓰기', sub:'LEXICON', run:function(){ if(typeof switchPage==='function') switchPage('lexicon'); setTimeout(function(){ try{ KnowledgeNotes.create('lexicon'); }catch(e){} },240); }},
    {t:'새 미디어 기록 쓰기', sub:'MEDIA', run:function(){ if(typeof switchPage==='function') switchPage('media'); setTimeout(function(){ try{ KnowledgeNotes.create('media','grp_media_main'); }catch(e){} },240); }},
    {t:'새 경제 기록 쓰기', sub:'ECONOMICS', run:function(){ if(typeof switchPage==='function') switchPage('economics'); setTimeout(function(){ try{ KnowledgeNotes.create('economics','grp_econ_main'); }catch(e){} },240); }},
    {t:'새 글 쓰기', sub:'THESIS · 생각·메모 기록', run:function(){ if(typeof switchPage==='function') switchPage('thesis'); setTimeout(function(){ try{ ThesisApp.create(); }catch(e){} },260); }},
    {t:'생각의 기록 열기', sub:'THESIS', run:function(){ if(typeof switchPage==='function') switchPage('thesis'); }},
    /* 마퀴 */
    {t:'마퀴 종목 편집 — 히어로 1번 줄', sub:'글로벌 지표', run:function(){ if(window.__tkEdit) window.__tkEdit('home1'); }},
    {t:'마퀴 종목 편집 — 히어로 2번 줄', sub:'보유·관심 종목', run:function(){ if(window.__tkEdit) window.__tkEdit('home2'); }},
    {t:'마퀴 종목 편집 — 매크로 상단', sub:'시총 상위', run:function(){ if(window.__tkEdit) window.__tkEdit('macro'); }},
    /* 관심종목·매크로 */
    {t:'관심종목 추가', sub:'매크로 탭', run:function(){ if(typeof switchPage==='function') switchPage('macro'); setTimeout(function(){ var b=document.getElementById('wlAddBtn'); if(b) b.click(); },320); }},
    {t:'매크로 데이터 새로고침', sub:'실시간 지표 갱신', run:function(){ if(typeof switchPage==='function') switchPage('macro'); setTimeout(function(){ try{ if(typeof renderIndicesWorker==='function') renderIndicesWorker(); if(typeof renderRatesWorker==='function') renderRatesWorker(); if(typeof renderNews==='function') renderNews(); }catch(e){} },300); if(window.__nnToast) window.__nnToast('매크로 데이터를 갱신합니다'); }},
    /* 데일리 데스크 */
    {t:'D-DAY 일정 추가', sub:'데일리 데스크', run:goHome(function(){ var b=document.getElementById('ddAddBtn'); if(b) b.click(); })},
    {t:'오늘의 달력 열기', sub:'히어로 시계', run:goHome(function(){ var d=document.getElementById('clkDate'); if(d) d.click(); })},
    {t:'퀵 글랜스 편집', sub:'자주 보는 지표 추가·삭제·순서변경', run:goHome(function(){ var b=document.getElementById('ddMacroEdit'); if(b) b.click(); })},
    {t:'패널 투명도 조절', sub:'모든 패널의 배경 투명도', run:function(){ if(window.__panelOpacityOpen) window.__panelOpacityOpen(); }},
    {t:'배경 계속 보이게', sub:'스크롤해도 배경 유지', run:function(){ try{ localStorage.setItem('nn_bg_mode_v1','fixed'); }catch(e){} document.documentElement.classList.remove('nn-bgmode-hero','nn-bgscroll-dark'); if(window.__bgScrollUpdate) window.__bgScrollUpdate(); }},
    {t:'배경 첫 화면만', sub:'스크롤하면 단색 바탕', run:function(){ try{ localStorage.setItem('nn_bg_mode_v1','hero'); }catch(e){} document.documentElement.classList.add('nn-bgmode-hero'); if(window.__bgScrollUpdate) window.__bgScrollUpdate(); }},
    {t:'모아서 공유', sub:'탭 전체 · 사이트 전체 링크', run:function(){ if(window.__nnShareBulk) window.__nnShareBulk(); }},
    {t:'탭 관리', sub:'새 탭 만들기 · 기본 탭 숨기기', run:function(){ if(window.__nnTabManager) window.__nnTabManager(); }},
    /* 섹션 이동 */
    {t:'데일리 데스크로 이동', sub:'브리핑 · D-DAY · 최근 기록', run:scrollTo('.daily-desk',70)},
    {t:'홀딩스 허브로 이동', sub:'보유 기업', run:scrollTo('.hub-section',56)},
    {t:'레퍼런스 데스크로 이동', sub:'참고 사이트', run:scrollTo('.ref-lane-section',56)},
    {t:'슈퍼 인베스터로 이동', sub:'투자 거장', run:scrollTo('.masters-section',56)},
    {t:'맨 위로', sub:'히어로', run:function(){ window.scrollTo({top:0,behavior:'smooth'}); }},
    /* 편집 모드 */
    {t:'홀딩스 허브 편집', sub:'기업 카드 추가·수정', run:goHome(function(){ if(window.hubToggleEdit) window.hubToggleEdit(); })},
    {t:'레퍼런스 데스크 편집', sub:'링크 추가·수정', run:goHome(function(){ if(window.rdToggleEdit) window.rdToggleEdit(); })},
    {t:'레퍼런스 데스크 보기 전환', sub:'쇼케이스 ↔ 전체 목록', run:goHome(function(){ if(window.rdToggleView) window.rdToggleView(); })},
    /* 데이터 */
    {t:'데이터 백업 내려받기', sub:'전체 내보내기', run:function(){ if(window.dbLock) window.dbLock('export'); }},
    {t:'데이터 백업 가져오기', sub:'백업 파일 불러오기', run:function(){ if(window.dbLock) window.dbLock('import'); }},
    {t:'부동산 계산기 열기', sub:'대출 · DSR · 취득세 · 양도세', run:function(){ if(typeof switchPage==='function') switchPage('assets'); setTimeout(function(){ var b=document.querySelector('.as-navbtn[data-sec="realty"]'); if(b) b.click(); },300); }},
    {t:'아파트 실거래가 조회', sub:'국토교통부 공공데이터', run:function(){ if(typeof switchPage==='function') switchPage('assets'); setTimeout(function(){ var b=document.querySelector('.as-navbtn[data-sec="apt"]'); if(b) b.click(); },300); }},
    {t:'배당 정보 불러오기', sub:'ASSETS · 배당 캘린더', run:function(){ if(typeof switchPage==='function') switchPage('assets'); setTimeout(function(){ var b=document.querySelector('.as-navbtn[data-sec="dividends"]'); if(b) b.click(); setTimeout(function(){ if(window.AssetsApp&&AssetsApp.divRefresh) AssetsApp.divRefresh(); },260); },300); }},
    {t:'청약 일정 보기', sub:'한국부동산원 청약홈', run:function(){ if(typeof switchPage==='function') switchPage('assets'); setTimeout(function(){ var b=document.querySelector('.as-navbtn[data-sec="subscribe"]'); if(b) b.click(); },300); }},
    {t:'관심종목 등락률순 정렬', sub:'MARKETS · 관심종목', run:function(){ if(typeof switchPage==='function') switchPage('macro'); if(window.__wlViewSet) window.__wlViewSet('sort','chgdesc'); }},
    {t:'관심종목 목표가 알림 켜기', sub:'브라우저 알림 권한 요청', run:function(){ if(window.__wlNotifyAsk) window.__wlNotifyAsk(); }},
    {t:'키보드 단축키 안내', sub:'? 키로도 열립니다', run:function(){ if(window.__ksOpen) window.__ksOpen(); }},
    {t:'자산 이용 안내 보기', sub:'ASSETS · 구조와 사용법', run:function(){ if(typeof switchPage==='function') switchPage('assets'); setTimeout(function(){ var b=document.querySelector('.as-navbtn[data-sec="guide"]'); if(b) b.click(); },300); }},
    {t:'보유 종목 시세 갱신', sub:'ASSETS · 실시간 평가', run:function(){ if(typeof switchPage==='function') switchPage('assets'); setTimeout(function(){ var b=document.querySelector('.as-navbtn[data-sec="stocks"]'); if(b) b.click(); setTimeout(function(){ if(window.AssetsApp&&AssetsApp.liveRefresh) AssetsApp.liveRefresh(); },260); },300); }},
    {t:'대출 원리금 계산', sub:'부동산 계산기', run:function(){ if(typeof switchPage==='function') switchPage('assets'); setTimeout(function(){ var b=document.querySelector('.as-navbtn[data-sec="realty"]'); if(b) b.click(); setTimeout(function(){ var t=document.querySelector('.rc-tab[data-t="loan"]'); if(t) t.click(); },220); },300); }},
    {t:'DSR 한도 계산', sub:'부동산 계산기', run:function(){ if(typeof switchPage==='function') switchPage('assets'); setTimeout(function(){ var b=document.querySelector('.as-navbtn[data-sec="realty"]'); if(b) b.click(); setTimeout(function(){ var t=document.querySelector('.rc-tab[data-t="dsr"]'); if(t) t.click(); },220); },300); }},
    {t:'저장 공간 확인', sub:'사용량 · 동기화 상태', run:function(){ if(typeof switchPage==='function') switchPage('macro'); setTimeout(function(){ if(window.__nnRenderStorage) window.__nnRenderStorage(); var b=document.querySelector('.nn-storage-bar'); if(b) b.scrollIntoView({behavior:'smooth',block:'center'}); },320); }}
  ];

  function collect(){
    var out=[];
    CMDS.forEach(function(x){
      out.push({kind:'cmd', lb:'실행', c:'#ff9e80', t:x.t, sub:x.sub,
        key:('실행 '+x.t+' '+x.sub).toLowerCase(), run:x.run});
    });
    TABS.forEach(function(x){
      out.push({kind:'tab', lb:'TAB', c:'#e0c389', t:x.t, sub:x.sub,
        key:(x.t+' '+x.sub).toLowerCase(),
        run:function(){ if(typeof switchPage==='function') switchPage(x.page); }});
    });
    try{
      var kn=window.KnowledgeNotes;
      if(kn && kn.data){
        Object.keys(NOTE_META).forEach(function(tp){
          (kn.data[tp]||[]).forEach(function(n){
            if(!n||!n.id) return;
            var title=(n.title||'').trim()||'제목 없음';
            var body='';
            try{
              var tmp=document.createElement('div'); tmp.innerHTML=String(n.content||'');
              body=(tmp.textContent||'').replace(/\s+/g,' ').trim();
            }catch(e){}
            out.push({kind:'note', lb:NOTE_META[tp].lb, c:NOTE_META[tp].c, t:title, sub:'노트 열기', mt:n.mtime||0,
              body:body,
              key:(title+' '+body).toLowerCase(),
              run:function(){
                if(typeof switchPage==='function') switchPage(tp);
                setTimeout(function(){
                  try{
                    var k2=window.KnowledgeNotes;
                    var nn=(k2.data[tp]||[]).find(function(x){ return x.id===n.id; });
                    if(nn) nn.mtime=Date.now();
                    k2.activeIds[tp]=n.id; k2.save(); k2.renderSidebar(tp); k2.renderEditor(tp);
                  }catch(e){}
                },120);
              }});
          });
        });
      }
    }catch(e){}
    try{
      var wl=JSON.parse(localStorage.getItem('nn_watchlist_v1')||'[]');
      wl.forEach(function(it){
        out.push({kind:'watch', lb:'WATCH', c:'#ff9e80', t:it.sym, sub:'관심종목 — 매크로 탭',
          key:String(it.sym).toLowerCase(),
          run:function(){ if(typeof switchPage==='function') switchPage('macro'); }});
      });
    }catch(e){}
    try{
      var rd=JSON.parse(localStorage.getItem('nn_refdesk_v1')||'[]');
      (rd||[]).forEach(function(l){
        (l.chips||[]).forEach(function(c){
          out.push({kind:'link', lb:'DESK', c:'#8ab4ff', t:c.name||'', sub:(l.label||'')+' — 새 탭으로 열기',
            key:((c.name||'')+' '+(c.desc||'')+' '+(l.label||'')).toLowerCase(),
            run:function(){ window.open(c.url,'_blank','noopener'); }});
        });
      });
    }catch(e){}
    try{
      var hub=JSON.parse(localStorage.getItem('nn_hub_v1')||'[]');
      (hub||[]).forEach(function(c){
        if(!c||!c.name) return;
        out.push({kind:'hub', lb:'HUB', c:'#7fd58c', t:c.name, sub:'보유 기업 — 공식 홈페이지',
          key:(c.name+' '+(c.tag||'')).toLowerCase(),
          run:function(){ if(c.url) window.open(c.url,'_blank','noopener'); }});
      });
    }catch(e){}
    return out;
  }

  function ensure(){
    if(ov) return;
    ov=document.createElement('div');
    ov.id='cmdkOv';
    var isMacOS=false;
    try{ isMacOS=/Mac|iPhone|iPad|iPod/i.test(navigator.platform||navigator.userAgent||''); }catch(e){}
    ov.innerHTML='<div class="cmdk">'
      + '<div class="cmdk-in-wrap">'
      + '<svg class="cmdk-ic-svg" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11 L14.5 14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
      + '<input id="cmdkIn" placeholder="무엇을 찾으시나요?" autocomplete="off" spellcheck="false"></div>'
      + '<div class="cmdk-guide">내가 쓴 글을 <b>제목과 본문</b>으로 찾고, 탭 이동·설정 같은 <b>기능</b>도 바로 실행할 수 있어요.</div>'
      + '<div class="cmdk-list" id="cmdkList"></div>'
      + '<div class="cmdk-foot"><span>↑↓ 이동</span><span>Enter 실행</span><span>Esc 닫기</span>'
      + '<span class="cmdk-tip">어디서든 <b>'+(isMacOS?'⌘ K':'Ctrl + K')+'</b></span></div>'
      + '</div>';
    document.body.appendChild(ov);
    inp=ov.querySelector('#cmdkIn');
    listEl=ov.querySelector('#cmdkList');
    ov.addEventListener('mousedown',function(e){ if(e.target===ov) close(); });
    inp.addEventListener('input',refresh);
    inp.addEventListener('keydown',function(e){
      if(e.key==='ArrowDown'){ e.preventDefault(); move(1); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); move(-1); }
      else if(e.key==='Enter'){ e.preventDefault(); exec(activeIdx); }
      else if(e.key==='Escape'){ e.preventDefault(); close(); }
    });
  }
  function refresh(){
    var q=(inp.value||'').trim().toLowerCase();
    var src=collect();
    if(!q){
      var cmds=src.filter(function(x){ return x.kind==='cmd'; }).slice(0,9);
      var notes=src.filter(function(x){ return x.kind==='note'; })
        .sort(function(a,b){ return (b.mt||0)-(a.mt||0); }).slice(0,3);
      items=cmds.concat(notes);
    }else{
      items=src.filter(function(x){ return x.key.indexOf(q)>=0; }).slice(0,14);
      /* 본문에서 매칭된 노트는 해당 문장을 미리보기로 */
      items.forEach(function(x){
        if(x.kind!=='note' || !x.body) return;
        if(x.t.toLowerCase().indexOf(q)>=0) return;   /* 제목 매칭이면 그대로 */
        var pos=x.body.toLowerCase().indexOf(q);
        if(pos<0) return;
        var st=Math.max(0,pos-24);
        x.sub='…'+x.body.slice(st, st+62).trim()+'…';
      });
    }
    activeIdx=0;
    paint();
  }
  function paint(){
    if(!items.length){
      listEl.innerHTML='<div class="cmdk-empty">결과가 없습니다</div>';
      return;
    }
    listEl.innerHTML=items.map(function(x,i){
      return '<div class="cmdk-item'+(i===activeIdx?' on':'')+'" data-i="'+i+'">'
        + '<span class="cmdk-badge" style="color:'+x.c+';border-color:'+x.c+'55;background:'+x.c+'12">'+x.lb+'</span>'
        + '<span class="cmdk-t">'+esc(x.t)+'</span>'
        + '<span class="cmdk-sub">'+esc(x.sub)+'</span>'
        + '</div>';
    }).join('');
    listEl.querySelectorAll('.cmdk-item').forEach(function(el){
      var i=parseInt(el.getAttribute('data-i'),10);
      el.onmouseenter=function(){ activeIdx=i; mark(); };
      el.onclick=function(){ exec(i); };
    });
    mark();
  }
  function mark(){
    listEl.querySelectorAll('.cmdk-item').forEach(function(el,i){
      el.classList.toggle('on', i===activeIdx);
    });
    var on=listEl.querySelector('.cmdk-item.on');
    if(on) on.scrollIntoView({block:'nearest'});
  }
  function move(d){
    if(!items.length) return;
    activeIdx=(activeIdx+d+items.length)%items.length;
    mark();
  }
  function exec(i){
    var x=items[i]; if(!x) return;
    close();
    /* 현재 클릭 이벤트가 끝난 뒤 실행 — 문서 클릭 리스너에 의해 메뉴가 즉시 닫히는 것 방지 */
    setTimeout(function(){ try{ x.run(); }catch(e){} }, 70);
  }
  function open(){
    ensure();
    ov.classList.add('show');
    inp.value=''; refresh();
    setTimeout(function(){ inp.focus(); },40);
  }
  function close(){ if(ov) ov.classList.remove('show'); }
  window.__nnCmdk=open;

  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey) && (e.key==='k'||e.key==='K')){
      e.preventDefault();
      if(ov && ov.classList.contains('show')) close(); else open();
    }
  });
  function bindBtn(){
    var b=document.getElementById('cmdkBtn');
    if(b) b.onclick=function(){ open(); };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bindBtn); else bindBtn();
})();

/* ══════════ 오프라인 지원 (Service Worker) · 연결 상태 표시 ══════════ */
(function(){
  /* ── 연결 상태 배지 ── */
  var badge=null;
  function ensureBadge(){
    if(badge) return badge;
    badge=document.createElement('div');
    badge.className='net-badge';
    document.body.appendChild(badge);
    return badge;
  }
  function showOffline(){
    var b=ensureBadge();
    b.innerHTML='<i class="nb-dot"></i><span>오프라인 — 저장된 기록은 그대로 열람·작성할 수 있어요</span>';
    b.className='net-badge off show';
  }
  function showOnline(){
    if(!badge) return;
    badge.innerHTML='<i class="nb-dot"></i><span>연결이 복구되었습니다</span>';
    badge.className='net-badge on show';
    setTimeout(function(){ if(badge) badge.classList.remove('show'); }, 2600);
  }
  window.addEventListener('offline', showOffline);
  window.addEventListener('online', showOnline);
  if(navigator.onLine===false) setTimeout(showOffline, 600);

  /* ── 서비스 워커 등록 (https 환경에서만) ── */
  if(!('serviceWorker' in navigator)) return;
  if(location.protocol!=='https:' && location.hostname!=='localhost') return;

  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js').then(function(reg){
      /* 새 버전 감지 → 안내 */
      reg.addEventListener('updatefound', function(){
        var nw=reg.installing;
        if(!nw) return;
        nw.addEventListener('statechange', function(){
          if(nw.state==='installed' && navigator.serviceWorker.controller){
            if(window.__nnToast){
              window.__nnToast('✨ 새 버전이 준비되었습니다 — 새로고침하면 적용됩니다',{
                undo:function(){ nw.postMessage('SKIP_WAITING'); location.reload(); }
              });
            }
          }
        });
      });
    }).catch(function(){});
  });
})();

/* ══════════════════════════════════════════════════════
   관심종목 상세 드로어
   ══════════════════════════════════════════════════════ */
(function(){
  var MEMO_KEY='nn_wl_memo_v1';
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function memoLoad(){ try{ var s=localStorage.getItem(MEMO_KEY); if(s){ var o=JSON.parse(s); if(o&&typeof o==='object') return o; } }catch(e){} return {}; }
  function memoSave(o){ try{ localStorage.setItem(MEMO_KEY, JSON.stringify(o)); }catch(e){} }

  function bigChart(arr, up){
    if(!Array.isArray(arr)||arr.length<3) return '<div class="wd-nochart">차트 데이터가 없습니다</div>';
    var w=560,h=170,pad=8;
    var lo=Math.min.apply(null,arr), hi=Math.max.apply(null,arr), span=(hi-lo)||1;
    var pts=arr.map(function(v,i){
      var x=pad+(i/(arr.length-1))*(w-pad*2);
      var y=pad+(1-(v-lo)/span)*(h-pad*2);
      return x.toFixed(1)+','+y.toFixed(1);
    });
    var col=up?'#4ade80':'#ff5b5b';
    var id='wdg'+Math.random().toString(36).slice(2,7);
    var last=pts[pts.length-1].split(',');
    return '<svg class="wd-chart" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'
      + '<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1">'
      +  '<stop offset="0%" stop-color="'+col+'" stop-opacity=".3"/>'
      +  '<stop offset="100%" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs>'
      + '<polygon points="'+pad+','+(h-pad)+' '+pts.join(' ')+' '+(w-pad)+','+(h-pad)+'" fill="url(#'+id+')"/>'
      + '<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+col+'" stroke-width="1.8" '
      +   'stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>'
      + '<circle cx="'+last[0]+'" cy="'+last[1]+'" r="3.2" fill="'+col+'"/>'
      + '</svg>';
  }

  function links(market, sym, name){
    var out=[];
    if(market==='us'){
      out.push(['TradingView','https://www.tradingview.com/symbols/'+encodeURIComponent(sym)+'/']);
      out.push(['Yahoo Finance','https://finance.yahoo.com/quote/'+encodeURIComponent(sym)]);
      out.push(['SEC 공시','https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company='+encodeURIComponent(sym)+'&type=10-K&dateb=&owner=include&count=40']);
      out.push(['Finviz','https://finviz.com/quote.ashx?t='+encodeURIComponent(sym)]);
    }else if(market==='kr'){
      out.push(['네이버 금융','https://finance.naver.com/item/main.naver?code='+encodeURIComponent(sym)]);
      out.push(['TradingView','https://www.tradingview.com/symbols/KRX-'+encodeURIComponent(sym)+'/']);
      out.push(['전자공시 DART','https://dart.fss.or.kr/dsab007/main.do?textCrpNm='+encodeURIComponent(name||sym)]);
      out.push(['한경 컨센서스','https://consensus.hankyung.com/']);
    }else{
      out.push(['TradingView','https://www.tradingview.com/symbols/'+encodeURIComponent(sym)+'USD/']);
      out.push(['CoinGecko','https://www.coingecko.com/en/search?query='+encodeURIComponent(sym)]);
      out.push(['CoinMarketCap','https://coinmarketcap.com/currencies/']);
      out.push(['Upbit','https://upbit.com/exchange?code=CRIX.UPBIT.KRW-'+encodeURIComponent(sym)]);
    }
    return out.map(function(x){
      return '<a class="wd-link" href="'+x[1]+'" target="_blank" rel="noopener">'+x[0]+' ↗</a>';
    }).join('');
  }

  function fmt(n,cur){
    if(n==null||isNaN(n)) return '—';
    if(cur==='KRW') return Math.round(n).toLocaleString('ko-KR')+'원';
    return '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function fmtCap(n,cur){
    if(n==null||isNaN(n)||n<=0) return '—';
    if(cur==='KRW'){ return n>=1e12 ? (n/1e12).toFixed(2)+'조원' : Math.round(n/1e8).toLocaleString('ko-KR')+'억원'; }
    return n>=1e12 ? '$'+(n/1e12).toFixed(2)+'T' : n>=1e9 ? '$'+(n/1e9).toFixed(1)+'B' : '$'+(n/1e6).toFixed(0)+'M';
  }

  window.__wlDrawer=function(idx){
    var data=window.__wlData||[], res=window.__wlRes||{};
    var it=data[idx]; if(!it) return;
    var o=(res[it.market]||{})[it.sym]||null;
    var cur=(o&&o.cur)?o.cur:(it.market==='kr'?'KRW':'USD');
    var name=(o&&o.name)?o.name:it.sym;
    var up = o && o.chg!=null ? o.chg>=0 : true;
    var mk = it.market==='us'?'US':it.market==='kr'?'KR':'CRYPTO';
    var key=it.market+':'+it.sym;
    var memos=memoLoad();

    var p52=null;
    if(o && o.price!=null && o.lo52!=null && o.hi52!=null && o.hi52>o.lo52)
      p52=Math.max(0,Math.min(100,(o.price-o.lo52)/(o.hi52-o.lo52)*100));

    var prev=document.getElementById('wlDrawer'); if(prev) prev.remove();
    var ov=document.createElement('div');
    ov.id='wlDrawer'; ov.className='wd-ov';
    ov.innerHTML='<div class="wd-panel">'
      + '<button type="button" class="wd-close" aria-label="닫기">✕</button>'
      + '<div class="wd-head">'
      +   '<span class="wl-mkt wl-mkt-'+it.market+'">'+mk+'</span>'
      +   '<span class="wd-sym">'+esc(String(it.sym).toUpperCase())+'</span>'
      + '</div>'
      + '<div class="wd-name">'+esc(name)+'</div>'
      + '<div class="wd-price">'+fmt(o?o.price:null,cur)
      +   (o&&o.chg!=null?'<span class="wd-chg '+(up?'wd-up':'wd-down')+'">'+(o.chg>=0?'+':'')+o.chg.toFixed(2)+'%</span>':'')
      + '</div>'
      + ((o&&o.spark)?'<div class="wd-chart-wrap">'+bigChart(o.spark,up)+'<div class="wd-chart-lb">최근 30거래일</div></div>'
                     :'<div class="wd-nochart">차트 데이터가 없습니다</div>')
      + (p52!=null?'<div class="wd-52"><div class="wd-52-head"><span>'+(it.market==='crypto'?'24시간':'52주')+' 위치</span><b>'+p52.toFixed(0)+'%</b></div>'
        + '<div class="wd-52-bar"><i style="width:'+p52.toFixed(1)+'%"></i><span class="wd-52-dot" style="left:'+p52.toFixed(1)+'%"></span></div>'
        + '<div class="wd-52-lb"><span>저 '+fmt(o.lo52,cur)+'</span><span>고 '+fmt(o.hi52,cur)+'</span></div></div>':'')
      + '<div class="wd-stats">'
      +   '<div class="wd-st"><span>시가총액</span><b>'+fmtCap(o?o.mcap:null,cur)+'</b></div>'
      +   '<div class="wd-st"><span>통화</span><b>'+cur+'</b></div>'
      + '</div>'
      + (function(){
          var al=(window.__wlAlertGet?window.__wlAlertGet(key):{})||{};
          var p=(o&&o.price!=null&&!isNaN(o.price))?o.price:null;
          function dist(t){ if(t==null||p==null||p<=0) return ''; var d=(t-p)/p*100;
            return '<span class="wd-tg-d'+(d>=0?' up':' dn')+'">'+(d>=0?'+':'')+d.toFixed(1)+'%</span>'; }
          var step=(cur==='KRW')?'1':'0.01';
          return '<div class="wd-sec"><div class="wd-sec-t">\ubaa9\ud45c\uac00 \uc54c\ub9bc <span class="wd-auto">\uc790\ub3d9 \uc800\uc7a5</span></div>'
            +'<div class="wd-tg">'
            +'<div class="wd-tg-f"><label>\uc0c1\ub2e8 \ubaa9\ud45c\uac00 \u25b2</label>'
            +'<input type="number" step="'+step+'" id="wdTgHi" placeholder="\ub3c4\ub2ec \uc2dc \uc54c\ub9bc" value="'+(al.hi!=null?al.hi:'')+'">'
            +dist(al.hi!=null?al.hi:null)+'</div>'
            +'<div class="wd-tg-f"><label>\ud558\ub2e8 \ubaa9\ud45c\uac00 \u25bc</label>'
            +'<input type="number" step="'+step+'" id="wdTgLo" placeholder="\uc774\ud0c8 \uc2dc \uc54c\ub9bc" value="'+(al.lo!=null?al.lo:'')+'">'
            +dist(al.lo!=null?al.lo:null)+'</div>'
            +'</div>'
            +'<div class="wd-tg-n">\ud604\uc7ac\uac00\uac00 \uc0c1\ub2e8\uc744 \ub118\uac70\ub098 \ud558\ub2e8\uc744 \ub0b4\ub824\uac00\uba74 \uad00\uc2ec\uc885\ubaa9 \uc0c1\ub2e8\uc5d0 \ubc30\ub108\uac00 \ub73d\ub2c8\ub2e4. \ubc94\uc704 \uc548\uc73c\ub85c \ub3cc\uc544\uc624\uba74 \ub2e4\uc2dc \uac10\uc2dc\ud569\ub2c8\ub2e4.</div></div>'; })()
      + '<div class="wd-sec"><div class="wd-sec-t">빠른 이동</div><div class="wd-links">'+links(it.market,it.sym,name)+'</div></div>'
      + '<div class="wd-sec"><div class="wd-sec-t">투자 메모 <span class="wd-auto">자동 저장</span></div>'
      +   '<textarea class="wd-memo" id="wdMemo" placeholder="매수 근거, 목표가, 체크포인트를 기록해두세요.">'+esc(memos[key]||'')+'</textarea></div>'
      + '</div>';
    document.body.appendChild(ov);

    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },260); }
    ov.querySelector('.wd-close').onclick=close;
    ov.addEventListener('click', function(e){ if(e.target===ov) close(); });
    document.addEventListener('keydown', function esc2(e){
      if(e.key==='Escape'){ close(); document.removeEventListener('keydown',esc2); }
    });
    /* 목표가 저장 */
    (function(){
      var hi=ov.querySelector('#wdTgHi'), lo=ov.querySelector('#wdTgLo'), tt=null;
      if(!hi||!lo) return;
      function commit(){
        if(!window.__wlAlertSet) return;
        window.__wlAlertSet(key, hi.value, lo.value);
        if(window.__wlRender) try{ window.__wlRender(); }catch(e){}
      }
      [hi,lo].forEach(function(el){
        el.addEventListener('input', function(){ clearTimeout(tt); tt=setTimeout(commit, 600); });
        el.addEventListener('change', function(){ clearTimeout(tt); commit(); });
      });
    })();

    var ta=ov.querySelector('#wdMemo'), t=null;
    ta.addEventListener('input', function(){
      clearTimeout(t);
      t=setTimeout(function(){
        var m=memoLoad(); 
        if(ta.value.trim()) m[key]=ta.value; else delete m[key];
        memoSave(m);
      }, 500);
    });
    requestAnimationFrame(function(){ ov.classList.add('show'); });
  };
})();

/* ══════════════════════════════════════════════════════
   부동산 계산기 — 대출 · DSR · 취득세 · 양도세 · 전월세
   ══════════════════════════════════════════════════════ */
(function(){
  var cur='loan';
  function won(n){
    if(n==null||isNaN(n)) return '—';
    n=Math.round(n);
    return n.toLocaleString('ko-KR')+'원';
  }
  function eok(n){
    if(n==null||isNaN(n)) return '—';
    var a=Math.abs(n);
    if(a>=1e8) return (n/1e8).toFixed(2).replace(/\.?0+$/,'')+'억원';
    if(a>=1e4) return Math.round(n/1e4).toLocaleString('ko-KR')+'만원';
    return Math.round(n).toLocaleString('ko-KR')+'원';
  }
  function num(id){
    var el=document.getElementById(id); if(!el) return 0;
    var v=parseFloat(String(el.value||'').replace(/,/g,''));
    return isNaN(v)?0:v;
  }
  function chk(id){ var el=document.getElementById(id); return !!(el&&el.checked); }
  function sel(id){ var el=document.getElementById(id); return el?el.value:''; }
  function row(lb,val,cls){ return '<div class="rc-r'+(cls?' '+cls:'')+'"><span>'+lb+'</span><b>'+val+'</b></div>'; }

  /* ── 1. 대출 원리금 ── */
  function formLoan(){
    return '<div class="rc-grid">'
      + '<div class="rc-form">'
      +   fld('rcLoanAmt','대출 금액','원','300000000')
      +   fld('rcLoanRate','연 이자율','%','4.2')
      +   fld('rcLoanYear','상환 기간','년','30')
      +   fld('rcLoanGrace','거치 기간','년','0')
      +   '<label class="rc-lb">상환 방식</label>'
      +   '<div class="rc-seg" id="rcLoanType">'
      +     '<button class="rc-segb on" data-v="eq">원리금 균등</button>'
      +     '<button class="rc-segb" data-v="pr">원금 균등</button>'
      +   '</div>'
      + '</div>'
      + '<div class="rc-out" id="rcLoanOut"></div>'
      + '</div>';
  }
  var loanType='eq';
  function calcLoan(){
    var P=num('rcLoanAmt'), r=num('rcLoanRate')/100/12, y=num('rcLoanYear'), g=num('rcLoanGrace');
    var n=Math.round(y*12), gn=Math.round(g*12);
    var out=document.getElementById('rcLoanOut'); if(!out) return;
    if(P<=0||n<=0){ out.innerHTML='<div class="rc-empty">금액과 기간을 입력하세요.</div>'; return; }
    var payN=n-gn; if(payN<=0) payN=n;
    var html='', totalInt=0, first=0, last=0;
    if(loanType==='eq'){
      var m = r>0 ? P*r*Math.pow(1+r,payN)/(Math.pow(1+r,payN)-1) : P/payN;
      first=m; last=m;
      totalInt = m*payN - P + (gn>0 ? P*r*gn : 0);
      html += row('월 상환액', won(m), 'rc-hi');
      if(gn>0) html += row('거치 기간 중 월 이자', won(P*r));
    } else {
      var pr=P/payN;
      first=pr+P*r;
      last=pr+pr*r;
      var sumInt=0;
      for(var i=0;i<payN;i++) sumInt += (P-pr*i)*r;
      totalInt = sumInt + (gn>0 ? P*r*gn : 0);
      html += row('첫 회 상환액', won(first), 'rc-hi');
      html += row('마지막 회 상환액', won(last));
      if(gn>0) html += row('거치 기간 중 월 이자', won(P*r));
    }
    html += row('총 이자', won(totalInt));
    html += row('총 상환액', won(P+totalInt));
    html += row('이자 비율', ((totalInt/P)*100).toFixed(1)+'%');
    out.innerHTML = html + '<div class="rc-note">※ 원금과 이자만 반영한 단순 계산입니다. 중도상환수수료·인지세·보증료 등은 제외됩니다.</div>';
  }

  /* ── 2. DSR ── */
  function formDsr(){
    return '<div class="rc-grid">'
      + '<div class="rc-form">'
      +   fld('rcDsrIncome','연 소득','원','60000000')
      +   fld('rcDsrExist','기존 대출 연간 원리금','원','0')
      +   fld('rcDsrAmt','신규 대출 금액','원','300000000')
      +   fld('rcDsrRate','신규 대출 금리','%','4.2')
      +   fld('rcDsrYear','신규 대출 기간','년','30')
      +   fld('rcDsrLimit','DSR 규제 한도','%','40')
      + '</div>'
      + '<div class="rc-out" id="rcDsrOut"></div>'
      + '</div>';
  }
  function annuity(P,rate,years){
    var r=rate/100/12, n=Math.round(years*12);
    if(n<=0) return 0;
    var m = r>0 ? P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1) : P/n;
    return m*12;
  }
  function calcDsr(){
    var inc=num('rcDsrIncome'), ex=num('rcDsrExist');
    var amt=num('rcDsrAmt'), rate=num('rcDsrRate'), yr=num('rcDsrYear'), lim=num('rcDsrLimit')||40;
    var out=document.getElementById('rcDsrOut'); if(!out) return;
    if(inc<=0){ out.innerHTML='<div class="rc-empty">연 소득을 입력하세요.</div>'; return; }
    var newAnn=annuity(amt,rate,yr);
    var total=ex+newAnn;
    var dsr=total/inc*100;
    var room=inc*(lim/100)-ex;
    var maxLoan=0;
    if(room>0 && yr>0){
      var r=rate/100/12, n=Math.round(yr*12);
      var mMax=room/12;
      maxLoan = r>0 ? mMax*(Math.pow(1+r,n)-1)/(r*Math.pow(1+r,n)) : mMax*n;
    }
    var cls = dsr<=lim ? 'rc-ok' : 'rc-bad';
    out.innerHTML = row('신규 대출 연간 원리금', won(newAnn))
      + row('총 연간 원리금 (기존 포함)', won(total))
      + '<div class="rc-r rc-hi '+cls+'"><span>DSR</span><b>'+dsr.toFixed(1)+'%</b></div>'
      + '<div class="rc-bar"><i style="width:'+Math.min(100,dsr).toFixed(1)+'%" class="'+cls+'"></i>'
      +   '<span class="rc-bar-lim" style="left:'+Math.min(100,lim)+'%"></span></div>'
      + row(dsr<=lim?'✅ 규제 한도 이내':'⚠ 규제 한도 초과', dsr<=lim?'여유 '+(lim-dsr).toFixed(1)+'%p':'초과 '+(dsr-lim).toFixed(1)+'%p')
      + row('DSR '+lim+'% 기준 최대 대출 가능액', eok(maxLoan), 'rc-hi')
      + '<div class="rc-note">※ 스트레스 DSR·DTI·LTV 등 개별 규제와 은행 내부 기준에 따라 실제 한도는 달라집니다.</div>';
  }

  /* ── 3. 취득세 ── */
  function formAcq(){
    return '<div class="rc-grid">'
      + '<div class="rc-form">'
      +   fld('rcAcqPrice','취득 가액','원','700000000')
      +   '<label class="rc-lb">보유 주택 수 (취득 후)</label>'
      +   '<select class="rc-in" id="rcAcqCount"><option value="1">1주택</option><option value="2">2주택</option><option value="3">3주택</option><option value="4">4주택 이상 · 법인</option></select>'
      +   '<label class="rc-lb">지역</label>'
      +   '<select class="rc-in" id="rcAcqArea"><option value="n">비조정대상지역</option><option value="y">조정대상지역</option></select>'
      +   '<label class="rc-chkline"><input type="checkbox" id="rcAcq85"> 전용면적 85㎡ 초과 <span class="rc-hint">(농어촌특별세 대상)</span></label>'
      + '</div>'
      + '<div class="rc-out" id="rcAcqOut"></div>'
      + '</div>';
  }
  function calcAcq(){
    var p=num('rcAcqPrice'), cnt=parseInt(sel('rcAcqCount'),10)||1, adj=sel('rcAcqArea')==='y', over85=chk('rcAcq85');
    var out=document.getElementById('rcAcqOut'); if(!out) return;
    if(p<=0){ out.innerHTML='<div class="rc-empty">취득 가액을 입력하세요.</div>'; return; }
    var base, label;
    if(cnt===1){
      if(p<=600000000){ base=1; label='6억 이하 · 1%'; }
      else if(p<=900000000){
        var e=p/100000000;
        base = (e*2/3 - 3);
        base = Math.round(base*100)/100;
        label='6~9억 누진 · '+base.toFixed(2)+'%';
      }
      else { base=3; label='9억 초과 · 3%'; }
    } else if(cnt===2){ base = adj?8:(p<=600000000?1:(p<=900000000?2:3)); label = adj?'2주택 조정 · 8%':'2주택 비조정 · 일반세율'; }
    else if(cnt===3){ base = adj?12:8; label = adj?'3주택 조정 · 12%':'3주택 비조정 · 8%'; }
    else { base=12; label='4주택 이상·법인 · 12%'; }

    var acq=p*base/100;
    var eduRate = base<=1 ? 0.1 : (base>=8 ? 0.4 : base*0.1);
    if(cnt===1 && base>1 && base<3) eduRate=base*0.1;
    else if(cnt===1 && base===3) eduRate=0.3;
    var edu=p*eduRate/100;
    var farm = over85 ? p*(base>=8?1.0:0.2)/100 : 0;
    var total=acq+edu+farm;
    out.innerHTML = row('적용 세율', label, 'rc-hi')
      + row('취득세', won(acq))
      + row('지방교육세', won(edu))
      + row('농어촌특별세', over85?won(farm):'해당 없음')
      + '<div class="rc-r rc-total"><span>총 납부액</span><b>'+won(total)+'</b></div>'
      + row('취득가 대비', (total/p*100).toFixed(2)+'%')
      + '<div class="rc-note">※ 생애최초·신혼부부 감면, 일시적 2주택, 상속·증여 등 특례는 반영되지 않은 개략 계산입니다. 실제 세액은 관할 지자체 기준을 확인하세요.</div>';
  }

  /* ── 4. 양도소득세 ── */
  function formCgt(){
    return '<div class="rc-grid">'
      + '<div class="rc-form">'
      +   fld('rcCgtSell','양도 가액','원','1200000000')
      +   fld('rcCgtBuy','취득 가액','원','700000000')
      +   fld('rcCgtCost','필요 경비','원','20000000')
      +   fld('rcCgtHold','보유 기간','년','5')
      +   fld('rcCgtLive','거주 기간','년','5')
      +   '<label class="rc-chkline"><input type="checkbox" id="rcCgt1h" checked> 1세대 1주택 (12억까지 비과세)</label>'
      + '</div>'
      + '<div class="rc-out" id="rcCgtOut"></div>'
      + '</div>';
  }
  function calcCgt(){
    var sellP=num('rcCgtSell'), buyP=num('rcCgtBuy'), cost=num('rcCgtCost');
    var hold=num('rcCgtHold'), live=num('rcCgtLive'), one=chk('rcCgt1h');
    var out=document.getElementById('rcCgtOut'); if(!out) return;
    if(sellP<=0||buyP<=0){ out.innerHTML='<div class="rc-empty">양도가액과 취득가액을 입력하세요.</div>'; return; }
    var gain=sellP-buyP-cost;
    if(gain<=0){
      out.innerHTML=row('양도 차익', won(gain))+'<div class="rc-r rc-total"><span>예상 세액</span><b>0원</b></div>'
        + '<div class="rc-note">양도 차손이 발생해 납부할 세액이 없습니다.</div>';
      return;
    }
    var taxableGain=gain, exemptNote='';
    if(one && sellP>1200000000){
      taxableGain = gain*(sellP-1200000000)/sellP;
      exemptNote='12억 초과분만 과세';
    } else if(one){
      out.innerHTML=row('양도 차익', won(gain))
        + row('과세 대상', '없음 (12억 이하 비과세)')
        + '<div class="rc-r rc-total"><span>예상 세액</span><b>0원</b></div>'
        + '<div class="rc-note">※ 2년 이상 보유(조정지역은 2년 거주) 요건 충족 가정입니다.</div>';
      return;
    }
    /* 장기보유특별공제 */
    var ltd=0, ltdLabel='';
    if(one){
      var h=Math.min(10,Math.floor(hold)), l=Math.min(10,Math.floor(live));
      if(h>=3){ ltd=(h*4+Math.min(l,10)*4)/100; ltdLabel='1주택 특례 '+(ltd*100).toFixed(0)+'%'; }
    } else {
      var y=Math.min(15,Math.floor(hold));
      if(y>=3){ ltd=y*2/100; ltdLabel='일반 '+(ltd*100).toFixed(0)+'%'; }
    }
    if(ltd>0.8) ltd=0.8;
    var afterLtd=taxableGain*(1-ltd);
    var base=Math.max(0, afterLtd-2500000);
    var brackets=[[14000000,.06,0],[50000000,.15,1260000],[88000000,.24,5760000],
                  [150000000,.35,15440000],[300000000,.38,19940000],[500000000,.40,25940000],
                  [1000000000,.42,35940000],[Infinity,.45,65940000]];
    var rate=0, ded=0;
    for(var i=0;i<brackets.length;i++){ if(base<=brackets[i][0]){ rate=brackets[i][1]; ded=brackets[i][2]; break; } }
    var tax=Math.max(0, base*rate-ded);
    if(hold<1) tax=Math.max(tax, base*0.70);
    else if(hold<2) tax=Math.max(tax, base*0.60);
    var local=tax*0.1;
    out.innerHTML = row('양도 차익', won(gain))
      + (exemptNote?row('과세 대상 차익', won(taxableGain)+' ('+exemptNote+')'):'')
      + row('장기보유특별공제', ltd>0?('-'+won(taxableGain*ltd)+' ('+ltdLabel+')'):'해당 없음')
      + row('기본공제', '-'+won(Math.min(2500000, afterLtd)))
      + row('과세 표준', won(base), 'rc-hi')
      + row('적용 세율', (rate*100).toFixed(0)+'%'+(hold<2?' (단기 중과 적용)':''))
      + row('양도소득세', won(tax))
      + row('지방소득세 (10%)', won(local))
      + '<div class="rc-r rc-total"><span>총 납부 예상액</span><b>'+won(tax+local)+'</b></div>'
      + '<div class="rc-note">※ 다주택 중과, 조정대상지역 규정, 감면·이월과세 등은 반영되지 않은 간이 계산입니다. 실제 신고 전 세무 전문가 확인을 권합니다.</div>';
  }

  /* ── 5. 전월세 전환 ── */
  function formRent(){
    return '<div class="rc-grid">'
      + '<div class="rc-form">'
      +   fld('rcRentJeon','전세 보증금','원','500000000')
      +   fld('rcRentDep','월세 보증금','원','100000000')
      +   fld('rcRentRate','전환율','%','5.5')
      +   fld('rcRentMonthly','월세 (역산용)','원','0')
      + '</div>'
      + '<div class="rc-out" id="rcRentOut"></div>'
      + '</div>';
  }
  function calcRent(){
    var j=num('rcRentJeon'), d=num('rcRentDep'), r=num('rcRentRate'), m=num('rcRentMonthly');
    var out=document.getElementById('rcRentOut'); if(!out) return;
    if(j<=0||r<=0){ out.innerHTML='<div class="rc-empty">전세 보증금과 전환율을 입력하세요.</div>'; return; }
    var diff=j-d;
    var monthly=diff*(r/100)/12;
    var html=row('전환 대상 금액', eok(diff))
      + '<div class="rc-r rc-hi"><span>예상 월세</span><b>'+won(monthly)+'</b></div>'
      + row('연 환산', won(monthly*12));
    if(m>0){
      var needDep = j - (m*12/(r/100));
      html += '<div class="rc-div"></div>'
        + row('월세 '+eok(m)+' 기준 필요 보증금', eok(Math.max(0,needDep)), 'rc-hi');
    }
    out.innerHTML = html + '<div class="rc-note">※ 법정 전월세전환율은 기준금리+2%와 10% 중 낮은 값을 상한으로 합니다(주택임대차보호법). 실제 계약은 협의에 따릅니다.</div>';
  }

  function fld(id,lb,unit,def){
    return '<label class="rc-lb">'+lb+' <span class="rc-unit">'+unit+'</span></label>'
      + '<input class="rc-in" id="'+id+'" type="text" inputmode="numeric" value="'+def+'">';
  }

  var MAP={
    loan:{form:formLoan, calc:calcLoan},
    dsr :{form:formDsr,  calc:calcDsr},
    acq :{form:formAcq,  calc:calcAcq},
    cgt :{form:formCgt,  calc:calcCgt},
    rent:{form:formRent, calc:calcRent}
  };

  function mount(){
    var body=document.getElementById('rcBody'); if(!body) return;
    body.innerHTML=MAP[cur].form();
    /* 숫자 입력 천단위 표시 */
    body.querySelectorAll('.rc-in').forEach(function(el){
      if(el.tagName==='SELECT'){ el.addEventListener('change', MAP[cur].calc); return; }
      if(el.type==='text'){
        var fmt=function(){
          var v=String(el.value||'').replace(/[^0-9.]/g,'');
          if(v==='') { el.value=''; return; }
          var parts=v.split('.');
          el.value=Number(parts[0]).toLocaleString('ko-KR')+(parts.length>1?'.'+parts[1]:'');
        };
        el.addEventListener('input', function(){ fmt(); MAP[cur].calc(); });
        fmt();
      }
    });
    body.querySelectorAll('input[type=checkbox]').forEach(function(c){ c.addEventListener('change', MAP[cur].calc); });
    var segs=body.querySelectorAll('.rc-segb');
    segs.forEach(function(b){
      b.addEventListener('click', function(){
        segs.forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on'); loanType=b.getAttribute('data-v'); MAP[cur].calc();
      });
    });
    MAP[cur].calc();
  }

  window.__rcInit=function(){
    var tabs=document.getElementById('rcTabs'); if(!tabs) return;
    if(tabs.__bound){ mount(); return; }
    tabs.__bound=true;
    tabs.querySelectorAll('.rc-tab').forEach(function(b){
      b.addEventListener('click', function(){
        tabs.querySelectorAll('.rc-tab').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on'); cur=b.getAttribute('data-t'); mount();
      });
    });
    mount();
  };
})();


/* ══════════════════════════════════════════════════════
   아파트 실거래가 — 국토교통부 공공데이터 (data.go.kr)
   ══════════════════════════════════════════════════════ */
(function(){
  var K_KEY='nn_apt_key', K_FAV='nn_apt_fav_v1', K_PREF='nn_apt_pref_v1';
  var API='https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';

  /* 전국 시군구 법정동코드 (5자리) */
  var REG=[
    ['서울특별시','11110 종로구|11140 중구|11170 용산구|11200 성동구|11215 광진구|11230 동대문구|11260 중랑구|11290 성북구|11305 강북구|11320 도봉구|11350 노원구|11380 은평구|11410 서대문구|11440 마포구|11470 양천구|11500 강서구|11530 구로구|11545 금천구|11560 영등포구|11590 동작구|11620 관악구|11650 서초구|11680 강남구|11710 송파구|11740 강동구'],
    ['부산광역시','26110 중구|26140 서구|26170 동구|26200 영도구|26230 부산진구|26260 동래구|26290 남구|26320 북구|26350 해운대구|26380 사하구|26410 금정구|26440 강서구|26470 연제구|26500 수영구|26530 사상구|26710 기장군'],
    ['대구광역시','27110 중구|27140 동구|27170 서구|27200 남구|27230 북구|27260 수성구|27290 달서구|27710 달성군|27720 군위군'],
    ['인천광역시','28110 중구|28140 동구|28177 미추홀구|28185 연수구|28200 남동구|28237 부평구|28245 계양구|28260 서구|28710 강화군|28720 옹진군'],
    ['광주광역시','29110 동구|29140 서구|29155 남구|29170 북구|29200 광산구'],
    ['대전광역시','30110 동구|30140 중구|30170 서구|30200 유성구|30230 대덕구'],
    ['울산광역시','31110 중구|31140 남구|31170 동구|31200 북구|31710 울주군'],
    ['세종특별자치시','36110 세종특별자치시'],
    ['경기도','41111 수원시 장안구|41113 수원시 권선구|41115 수원시 팔달구|41117 수원시 영통구|41131 성남시 수정구|41133 성남시 중원구|41135 성남시 분당구|41150 의정부시|41171 안양시 만안구|41173 안양시 동안구|41190 부천시|41210 광명시|41220 평택시|41250 동두천시|41271 안산시 상록구|41273 안산시 단원구|41281 고양시 덕양구|41285 고양시 일산동구|41287 고양시 일산서구|41290 과천시|41310 구리시|41360 남양주시|41370 오산시|41390 시흥시|41410 군포시|41430 의왕시|41450 하남시|41461 용인시 처인구|41463 용인시 기흥구|41465 용인시 수지구|41480 파주시|41500 이천시|41550 안성시|41570 김포시|41590 화성시|41610 광주시|41630 양주시|41650 포천시|41670 여주시|41800 연천군|41820 가평군|41830 양평군'],
    ['강원특별자치도','51110 춘천시|51130 원주시|51150 강릉시|51170 동해시|51190 태백시|51210 속초시|51230 삼척시|51720 홍천군|51730 횡성군|51750 영월군|51760 평창군|51770 정선군|51780 철원군|51790 화천군|51800 양구군|51810 인제군|51820 고성군|51830 양양군'],
    ['충청북도','43111 청주시 상당구|43112 청주시 서원구|43113 청주시 흥덕구|43114 청주시 청원구|43130 충주시|43150 제천시|43720 보은군|43730 옥천군|43740 영동군|43745 증평군|43750 진천군|43760 괴산군|43770 음성군|43800 단양군'],
    ['충청남도','44131 천안시 동남구|44133 천안시 서북구|44150 공주시|44180 보령시|44200 아산시|44210 서산시|44230 논산시|44250 계룡시|44270 당진시|44710 금산군|44760 부여군|44770 서천군|44790 청양군|44800 홍성군|44810 예산군|44825 태안군'],
    ['전북특별자치도','52111 전주시 완산구|52113 전주시 덕진구|52130 군산시|52140 익산시|52180 정읍시|52190 남원시|52210 김제시|52710 완주군|52720 진안군|52730 무주군|52740 장수군|52750 임실군|52770 순창군|52790 고창군|52800 부안군'],
    ['전라남도','46110 목포시|46130 여수시|46150 순천시|46170 나주시|46230 광양시|46710 담양군|46720 곡성군|46730 구례군|46770 고흥군|46780 보성군|46790 화순군|46800 장흥군|46810 강진군|46820 해남군|46830 영암군|46840 무안군|46860 함평군|46870 영광군|46880 장성군|46890 완도군|46900 진도군|46910 신안군'],
    ['경상북도','47111 포항시 남구|47113 포항시 북구|47130 경주시|47150 김천시|47170 안동시|47190 구미시|47210 영주시|47230 영천시|47250 상주시|47280 문경시|47290 경산시|47730 의성군|47750 청송군|47760 영양군|47770 영덕군|47820 청도군|47830 고령군|47840 성주군|47850 칠곡군|47900 예천군|47920 봉화군|47930 울진군|47940 울릉군'],
    ['경상남도','48121 창원시 의창구|48123 창원시 성산구|48125 창원시 마산합포구|48127 창원시 마산회원구|48129 창원시 진해구|48170 진주시|48220 통영시|48240 사천시|48250 김해시|48270 밀양시|48310 거제시|48330 양산시|48720 의령군|48730 함안군|48740 창녕군|48820 고성군|48840 남해군|48850 하동군|48860 산청군|48870 함양군|48880 거창군|48890 합천군'],
    ['제주특별자치도','50110 제주시|50130 서귀포시']
  ];
  var SGG=REG.map(function(r){ return r[1].split('|').map(function(x){ var i=x.indexOf(' '); return {c:x.slice(0,i), n:x.slice(i+1)}; }); });

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v==null?d:v; }catch(e){ return d; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function worker(){ try{ return (localStorage.getItem('nn_worker_url')||'').trim().replace(/\/+$/,''); }catch(e){ return ''; } }
  function apiKey(){ return (lsGet(K_KEY,'')||'').trim(); }
  /* data.go.kr 키는 Encoding(이미 %인코딩)/Decoding 두 형태로 배포됨 — 이중 인코딩 방지 */
  function encKey(k){ k=String(k||'').trim(); return /%[0-9A-Fa-f]{2}/.test(k) ? k : encodeURIComponent(k); }

  /* ── 상태 ── */
  var ST={ si:0, lawd:'11680', months:3, q:'', sort:'date', rows:[], busy:false, prog:'', err:'', via:'', done:false };
  try{ var pf=JSON.parse(lsGet(K_PREF,'{}')); if(pf&&typeof pf==='object'){ if(typeof pf.si==='number') ST.si=pf.si; if(pf.lawd) ST.lawd=pf.lawd; if(pf.months) ST.months=pf.months; } }catch(e){}
  function savePref(){ lsSet(K_PREF, JSON.stringify({si:ST.si, lawd:ST.lawd, months:ST.months})); }
  function favLoad(){ try{ var a=JSON.parse(lsGet(K_FAV,'[]')); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
  function favSave(a){ lsSet(K_FAV, JSON.stringify(a)); }
  function favHas(lawd,apt){ return favLoad().some(function(f){ return f.lawd===lawd && f.apt===apt; }); }

  /* ── 숫자 포맷 ── */
  function eok(man){
    man=Math.round(man||0); if(!man) return '—';
    var neg=man<0; man=Math.abs(man);
    var e=Math.floor(man/10000), m=man%10000;
    var t = e>0 ? (e+'억'+(m? ' '+m.toLocaleString('ko-KR'):'')) : m.toLocaleString('ko-KR')+'만';
    return (neg?'-':'')+t;
  }
  function py(area){ return area/3.3058; }
  function n1(v){ return (Math.round(v*10)/10).toLocaleString('ko-KR',{maximumFractionDigits:1}); }
  function ymList(cnt){
    var out=[], d=new Date();
    for(var i=0;i<cnt;i++){ var y=d.getFullYear(), m=d.getMonth()+1; out.push(''+y+(m<10?'0':'')+m); d.setMonth(d.getMonth()-1); }
    return out;
  }

  /* ── 응답 파싱 (JSON/XML 모두 지원, 신·구 필드명 모두 흡수) ── */
  var ERRMSG={'30':'등록되지 않은 서비스키입니다. 발급 직후라면 최대 1시간 뒤 활성화됩니다.','31':'서비스키 활용기간이 만료되었습니다.','22':'일시적으로 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.','20':'서비스 접근이 거부되었습니다. 활용신청 승인 여부를 확인하세요.','10':'요청 파라미터가 잘못되었습니다.','12':'해당 오픈API 서비스가 없거나 폐기되었습니다.','01':'애플리케이션 오류입니다. 잠시 후 다시 시도하세요.'};
  function pick(o){ for(var i=1;i<arguments.length;i++){ var v=o[arguments[i]]; if(v!=null && String(v).trim()!=='') return String(v).trim(); } return ''; }
  function norm(o){
    var amt=parseInt(pick(o,'dealAmount','거래금액').replace(/[^0-9-]/g,''),10)||0;
    var area=parseFloat(pick(o,'excluUseAr','전용면적'))||0;
    return {
      apt: pick(o,'aptNm','아파트'),
      dong: pick(o,'umdNm','법정동'),
      area: area,
      floor: parseInt(pick(o,'floor','층'),10)||0,
      build: parseInt(pick(o,'buildYear','건축년도'),10)||0,
      amt: amt,
      unit: area>0 ? amt/py(area) : 0,
      y: parseInt(pick(o,'dealYear','년'),10)||0,
      m: parseInt(pick(o,'dealMonth','월'),10)||0,
      d: parseInt(pick(o,'dealDay','일'),10)||0,
      cancel: pick(o,'cdealType','해제여부'),
      gbn: pick(o,'dealingGbn','거래유형')
    };
  }
  function parseBody(txt){
    txt=String(txt||'').trim();
    if(!txt) throw new Error('빈 응답을 받았습니다.');
    if(txt.charAt(0)==='{' || txt.charAt(0)==='['){
      var j=JSON.parse(txt);
      var hd=j&&j.response&&j.response.header;
      if(hd && hd.resultCode && ['00','000','0'].indexOf(String(hd.resultCode))<0)
        throw new Error(ERRMSG[String(hd.resultCode)] || ('API 오류 ('+hd.resultCode+') '+(hd.resultMsg||'')));
      var bd=j&&j.response&&j.response.body;
      var it=bd&&bd.items&&bd.items.item;
      var arr = it ? (Array.isArray(it)?it:[it]) : [];
      return { items:arr.map(norm), total: (bd&&parseInt(bd.totalCount,10))||arr.length };
    }
    var doc=new DOMParser().parseFromString(txt,'text/xml');
    if(doc.getElementsByTagName('parsererror').length) throw new Error('응답을 해석할 수 없습니다 (형식 오류).');
    function tv(tag){ var e=doc.getElementsByTagName(tag)[0]; return e? (e.textContent||'').trim() : ''; }
    var rc=tv('returnReasonCode');
    if(rc) throw new Error(ERRMSG[rc] || ('API 오류 ('+rc+') '+tv('returnAuthMsg')));
    var code=tv('resultCode');
    if(code && ['00','000','0'].indexOf(code)<0) throw new Error(ERRMSG[code] || ('API 오류 ('+code+') '+tv('resultMsg')));
    var nodes=doc.getElementsByTagName('item'), out=[];
    for(var i=0;i<nodes.length;i++){
      var o={}, ch=nodes[i].children;
      for(var k=0;k<ch.length;k++) o[ch[k].tagName]=(ch[k].textContent||'').trim();
      out.push(norm(o));
    }
    return { items:out, total: parseInt(tv('totalCount'),10)||out.length };
  }

  /* ── 한 달치 조회 (Worker → 공용 프록시 순서로 시도) ── */
  async function fetchOne(lawd, ym, page){
    var k=apiKey();
    var target=API+'?serviceKey='+encKey(k)+'&LAWD_CD='+lawd+'&DEAL_YMD='+ym+'&numOfRows=1000&pageNo='+(page||1);
    var W=worker(), tries=[];
    if(W) tries.push({u:W+'/apt?lawd='+lawd+'&ym='+ym+'&page='+(page||1)+'&key='+encodeURIComponent(k), via:'worker'});
    tries.push({u:'https://api.allorigins.win/raw?url='+encodeURIComponent(target), via:'public'});
    var lastErr=null;
    for(var i=0;i<tries.length;i++){
      try{
        var r=await fetch(tries[i].u);
        if(!r.ok) throw new Error('HTTP '+r.status);
        var t=await r.text();
        var res=parseBody(t);
        ST.via=tries[i].via;
        return res;
      }catch(e){
        lastErr=e;
        /* API 자체가 명확한 오류를 돌려준 경우엔 다른 경로로 재시도해도 소용없음 */
        if(e && e.message && /서비스키|활용기간|한도|접근이 거부/.test(e.message)) throw e;
      }
    }
    throw lastErr || new Error('조회에 실패했습니다.');
  }

  async function runQuery(){
    if(ST.busy) return;
    if(!apiKey()){ ST.err='먼저 공공데이터 API 키를 입력하고 저장하세요.'; renderResult(); return; }
    ST.busy=true; ST.err=''; ST.done=false; ST.rows=[]; ST.via='';
    var yms=ymList(ST.months), all=[], lawd=ST.lawd;
    try{
      for(var i=0;i<yms.length;i++){
        ST.prog='조회 중 '+(i+1)+' / '+yms.length+'개월 ('+yms[i].slice(0,4)+'.'+yms[i].slice(4)+')';
        renderResult();
        var res=await fetchOne(lawd, yms[i], 1);
        all=all.concat(res.items);
        /* 1000건 초과 시 추가 페이지 (최대 3페이지) */
        if(res.total>1000){
          var pages=Math.min(3, Math.ceil(res.total/1000));
          for(var pg=2; pg<=pages; pg++){
            var r2=await fetchOne(lawd, yms[i], pg);
            all=all.concat(r2.items);
          }
        }
      }
      /* 강원(51)·전북(52) 신규 코드로 결과가 없으면 구 코드(42·45)로 자동 재시도 */
      if(!all.length && /^(51|52)/.test(lawd)){
        var legacy=(lawd.slice(0,2)==='51'?'42':'45')+lawd.slice(2);
        for(var j=0;j<yms.length;j++){
          ST.prog='구 지역코드로 재조회 '+(j+1)+' / '+yms.length+'개월';
          renderResult();
          var r3=await fetchOne(legacy, yms[j], 1);
          all=all.concat(r3.items);
        }
      }
      ST.rows=all.filter(function(x){ return x.amt>0 && !/O|o/.test(x.cancel||''); });
      ST.done=true;
    }catch(e){
      ST.err=(e&&e.message)||'조회에 실패했습니다.';
    }
    ST.busy=false; ST.prog='';
    renderResult();
  }

  /* ── 필터·정렬·집계 ── */
  function view(){
    var q=(ST.q||'').trim().toLowerCase();
    var r=ST.rows.filter(function(x){ return !q || (x.apt||'').toLowerCase().indexOf(q)>=0 || (x.dong||'').toLowerCase().indexOf(q)>=0; });
    var s=ST.sort;
    r=r.slice().sort(function(a,b){
      if(s==='amt') return b.amt-a.amt;
      if(s==='unit') return b.unit-a.unit;
      if(s==='area') return b.area-a.area;
      return (b.y*10000+b.m*100+b.d)-(a.y*10000+a.m*100+a.d);
    });
    return r;
  }
  function stats(r){
    if(!r.length) return null;
    var sum=0, us=0, un=0, hi=r[0], lo=r[0];
    r.forEach(function(x){ sum+=x.amt; if(x.unit>0){ us+=x.unit; un++; } if(x.amt>hi.amt) hi=x; if(x.amt<lo.amt) lo=x; });
    return { n:r.length, avg:sum/r.length, unit:un?us/un:0, hi:hi, lo:lo };
  }
  function monthly(r){
    var map={};
    r.forEach(function(x){ var k=x.y+'-'+(x.m<10?'0':'')+x.m; if(!map[k]) map[k]={n:0,s:0,u:0,un:0}; map[k].n++; map[k].s+=x.amt; if(x.unit>0){ map[k].u+=x.unit; map[k].un++; } });
    return Object.keys(map).sort().map(function(k){ return { k:k, n:map[k].n, avg:map[k].s/map[k].n, unit:map[k].un?map[k].u/map[k].un:0 }; });
  }
  function trendSvg(ms){
    if(ms.length<2) return '<div class="apt-empty">월별 추이는 2개월 이상 조회 시 표시됩니다.</div>';
    var w=680,h=130,pl=8,pr=8,pt=14,pb=26;
    var vals=ms.map(function(m){return m.avg;});
    var lo=Math.min.apply(null,vals), hi=Math.max.apply(null,vals), sp=(hi-lo)||1;
    if(hi===lo){ lo=hi*0.98; sp=hi*0.04||1; }
    var pts=ms.map(function(m,i){
      var x=pl+(ms.length===1?0.5:(i/(ms.length-1)))*(w-pl-pr);
      var y=pt+(1-(m.avg-lo)/sp)*(h-pt-pb);
      return [x,y];
    });
    var line=pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');
    var area=pl+','+(h-pb)+' '+line+' '+(w-pr)+','+(h-pb);
    var dots=pts.map(function(p,i){ return '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3.2" fill="#ff6b6b"/>'
      +'<text x="'+p[0].toFixed(1)+'" y="'+(p[1]-9).toFixed(1)+'" text-anchor="middle" class="apt-tv">'+eok(ms[i].avg)+'</text>'; }).join('');
    var labs=pts.map(function(p,i){ return '<text x="'+p[0].toFixed(1)+'" y="'+(h-8)+'" text-anchor="middle" class="apt-tx">'+ms[i].k.slice(2).replace('-','.')+'</text>'; }).join('');
    return '<svg class="apt-trend" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'
      +'<defs><linearGradient id="aptG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b6b" stop-opacity=".28"/><stop offset="1" stop-color="#ff6b6b" stop-opacity="0"/></linearGradient></defs>'
      +'<polygon points="'+area+'" fill="url(#aptG)"/>'
      +'<polyline points="'+line+'" fill="none" stroke="#ff6b6b" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
      +dots+labs+'</svg>';
  }

  /* ── 렌더 ── */
  function regName(){
    var g=SGG[ST.si]||[], f=g.filter(function(x){return x.c===ST.lawd;})[0];
    return REG[ST.si][0]+(f?' '+f.n:'');
  }
  function renderResult(){
    var el=document.getElementById('aptResult'); if(!el) return;
    if(ST.busy){ el.innerHTML='<div class="as-card span12"><div class="apt-load"><span class="apt-spin"></span>'+esc(ST.prog||'조회 중…')+'</div></div>'; return; }
    if(ST.err){ el.innerHTML='<div class="as-card span12"><div class="apt-err">⚠ '+esc(ST.err)+'</div>'+guideHtml()+'</div>'; return; }
    if(!ST.done){ el.innerHTML='<div class="as-card span12"><div class="apt-empty">지역과 기간을 고르고 <b>실거래가 조회</b>를 눌러 주세요.</div></div>'; return; }
    var r=view(), st=stats(r), ms=monthly(r);
    if(!r.length){ el.innerHTML='<div class="as-card span12"><div class="apt-empty">조회된 거래가 없습니다. 기간을 늘리거나 다른 지역을 선택해 보세요.</div></div>'; return; }
    var viaTxt = ST.via==='worker' ? '내 프록시 경유' : '공용 프록시 경유';
    var rows=r.slice(0,300).map(function(x){
      var fav=favHas(ST.lawd,x.apt);
      return '<tr><td><button class="apt-star'+(fav?' on':'')+'" title="관심 단지" onclick="AptDeal.fav(\''+encodeURIComponent(x.apt).replace(/'/g,"%27")+'\')">'+(fav?'★':'☆')+'</button> '+esc(x.apt)+'</td>'
        +'<td class="apt-l">'+esc(x.dong)+'</td>'
        +'<td class="num">'+n1(x.area)+'㎡<span class="apt-sub">'+n1(py(x.area))+'평</span></td>'
        +'<td class="num">'+(x.floor||'—')+'층</td>'
        +'<td class="num apt-amt">'+eok(x.amt)+'</td>'
        +'<td class="num">'+eok(x.unit)+'</td>'
        +'<td class="num">'+String(x.y).slice(2)+'.'+(x.m<10?'0':'')+x.m+'.'+(x.d<10?'0':'')+x.d+'</td>'
        +'<td class="num">'+(x.build||'—')+'</td></tr>';
    }).join('');
    el.innerHTML=
      '<div class="as-card span12"><div class="as-card-t">'+esc(regName())+' · 최근 '+ST.months+'개월 <span class="as-mini">'+viaTxt+'</span></div>'
      +'<div class="as-kpis">'
      +'<div class="as-kpi"><div class="k">거래 건수</div><div class="v">'+st.n.toLocaleString('ko-KR')+'건</div></div>'
      +'<div class="as-kpi"><div class="k">평균 거래가</div><div class="v">'+eok(st.avg)+'</div></div>'
      +'<div class="as-kpi"><div class="k">평균 평단가</div><div class="v">'+eok(st.unit)+'<span class="apt-sub">1평 기준</span></div></div>'
      +'<div class="as-kpi"><div class="k">최고 거래가</div><div class="v">'+eok(st.hi.amt)+'</div></div>'
      +'<div class="as-kpi"><div class="k">최저 거래가</div><div class="v">'+eok(st.lo.amt)+'</div></div>'
      +'</div>'
      +'<div class="apt-hl">최고가 <b>'+esc(st.hi.apt)+'</b> '+n1(st.hi.area)+'㎡ '+st.hi.floor+'층 · 최저가 <b>'+esc(st.lo.apt)+'</b> '+n1(st.lo.area)+'㎡ '+st.lo.floor+'층</div>'
      +'</div>'
      +'<div class="as-card span12"><div class="as-card-t">월별 평균 거래가 추이</div>'+trendSvg(ms)+'</div>'
      +'<div class="as-card span12"><div class="as-card-t">거래 목록 <span class="as-mini">'+r.length.toLocaleString('ko-KR')+'건'+(r.length>300?' 중 최근 300건 표시':'')+'</span></div>'
      +'<div style="overflow-x:auto"><table class="as-table apt-table"><thead><tr><th>아파트</th><th class="apt-l">법정동</th><th>전용면적</th><th>층</th><th>거래금액</th><th>평단가</th><th>계약일</th><th>준공</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
  }
  function renderFav(){
    var el=document.getElementById('aptFav'); if(!el) return;
    var f=favLoad();
    if(!f.length){ el.innerHTML='<div class="as-card span12"><div class="as-card-t">관심 단지</div><div class="apt-empty">거래 목록의 ☆ 를 누르면 관심 단지로 등록됩니다.</div></div>'; return; }
    var cards=f.map(function(x,i){
      var mine=ST.done ? ST.rows.filter(function(z){ return z.apt===x.apt; }) : [];
      var last=null;
      mine.forEach(function(z){ if(!last || (z.y*10000+z.m*100+z.d)>(last.y*10000+last.m*100+last.d)) last=z; });
      return '<div class="apt-fav">'
        +'<button class="apt-fav-x" title="삭제" onclick="AptDeal.favDel('+i+')">✕</button>'
        +'<div class="apt-fav-n">'+esc(x.apt)+'</div>'
        +'<div class="apt-fav-r">'+esc(x.rn||'')+'</div>'
        +(last? '<div class="apt-fav-p">'+eok(last.amt)+'</div><div class="apt-fav-s">'+n1(last.area)+'㎡ · '+last.floor+'층 · '+String(last.y).slice(2)+'.'+last.m+'.'+last.d+' · 최근 '+mine.length+'건</div>'
              : '<div class="apt-fav-s">현재 조회 결과에 없음</div>')
        +'<button class="apt-fav-go" onclick="AptDeal.favGo('+i+')">이 단지 조회</button>'
        +'</div>';
    }).join('');
    el.innerHTML='<div class="as-card span12"><div class="as-card-t">관심 단지 <span class="as-mini">'+f.length+'곳</span></div><div class="apt-favs">'+cards+'</div></div>';
  }
  function guideHtml(){
    var W=worker();
    return '<details class="apt-guide"><summary>연결이 안 될 때 — 설정 안내 보기</summary>'
      +'<div class="apt-g-b"><b>1. API 키 발급</b> — <a href="https://www.data.go.kr/data/15126469/openapi.do" target="_blank" rel="noopener">공공데이터포털 「국토교통부 아파트 매매 실거래가 상세 자료」</a> 에서 활용신청하면 즉시 승인됩니다. 마이페이지 → 개발계정에서 <b>일반 인증키</b>를 복사해 위 칸에 붙여넣으세요.</div>'
      +'<div class="apt-g-b"><b>2. 발급 직후 대기</b> — 키가 서버에 반영되는 데 최대 1시간이 걸립니다. 「등록되지 않은 서비스키」 오류는 대부분 이 때문입니다.</div>'
      +'<div class="apt-g-b"><b>3. 내 프록시(권장)</b> — 지금은 공용 프록시를 거쳐 조회합니다. 속도와 안정성을 위해 Cloudflare Worker에 아래 경로를 추가하면 자동으로 그쪽을 우선 사용합니다.'
      +'<pre class="apt-code">if (url.pathname === "/apt") {\n  const p = url.searchParams;\n  const api = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"\n    + "?serviceKey=" + encodeURIComponent(p.get("key") || "")\n    + "&LAWD_CD=" + (p.get("lawd") || "")\n    + "&DEAL_YMD=" + (p.get("ym") || "")\n    + "&numOfRows=1000&pageNo=" + (p.get("page") || "1");\n  const r = await fetch(api);\n  return new Response(await r.text(), {\n    headers: { "content-type": "application/xml; charset=utf-8",\n               "Access-Control-Allow-Origin": "*" }\n  });\n}</pre>'
      +'현재 프록시 주소: <code>'+(W?esc(W):'미설정 — MACRO 탭에서 설정')+'</code></div>'
      +'</details>';
  }

  /* ── 화면 구성 ── */
  function build(){
    var root=document.getElementById('aptRoot'); if(!root) return;
    var sidoOpt=REG.map(function(r,i){ return '<option value="'+i+'"'+(i===ST.si?' selected':'')+'>'+r[0]+'</option>'; }).join('');
    var sggOpt=(SGG[ST.si]||[]).map(function(x){ return '<option value="'+x.c+'"'+(x.c===ST.lawd?' selected':'')+'>'+x.n+'</option>'; }).join('');
    var mOpt=[1,3,6,12].map(function(m){ return '<option value="'+m+'"'+(m===ST.months?' selected':'')+'>최근 '+m+'개월</option>'; }).join('');
    var sOpt=[['date','최신순'],['amt','거래가 높은순'],['unit','평단가 높은순'],['area','면적 넓은순']].map(function(o){ return '<option value="'+o[0]+'"'+(o[0]===ST.sort?' selected':'')+'>'+o[1]+'</option>'; }).join('');
    var k=apiKey();
    root.innerHTML='<div class="as-grid">'
      +'<div class="as-card span12"><div class="as-card-t">공공데이터 API 키 <span class="as-mini">브라우저에만 저장됩니다</span></div>'
      +'<div class="apt-keyrow"><input type="password" id="aptKey" class="apt-in" placeholder="공공데이터포털 일반 인증키를 붙여넣으세요" value="'+esc(k)+'" autocomplete="off">'
      +'<button class="as-btn" id="aptKeySave">저장</button></div>'
      +'<div class="apt-keyst" id="aptKeySt">'+(k?'✓ 키가 저장되어 있습니다':'키를 입력해야 조회할 수 있습니다')+'</div>'
      +guideHtml()+'</div>'
      +'<div class="as-card span12"><div class="as-card-t">조회 조건</div>'
      +'<div class="apt-form">'
      +'<div class="apt-f"><label>시 · 도</label><select id="aptSido">'+sidoOpt+'</select></div>'
      +'<div class="apt-f"><label>시 · 군 · 구</label><select id="aptSgg">'+sggOpt+'</select></div>'
      +'<div class="apt-f"><label>조회 기간</label><select id="aptMonths">'+mOpt+'</select></div>'
      +'<div class="apt-f"><label>단지명 · 법정동 검색</label><input type="text" id="aptQ" class="apt-in" placeholder="예: 래미안, 은마, 대치동" value="'+esc(ST.q)+'" autocomplete="off"></div>'
      +'<div class="apt-f"><label>정렬</label><select id="aptSort">'+sOpt+'</select></div>'
      +'<div class="apt-f apt-f-btn"><button class="as-btn solid" id="aptRun">실거래가 조회</button></div>'
      +'</div>'
      +'<div class="as-note">국토교통부 실거래가 공개시스템 자료입니다. 계약일 기준이며 신고 기한(계약 후 30일) 때문에 최근 1개월 자료는 일부만 집계될 수 있습니다. 해제된 거래는 제외했습니다.</div>'
      +'</div>'
      +'<div id="aptFav" class="apt-slot"></div>'
      +'<div id="aptResult" class="apt-slot"></div>'
      +'</div>';

    document.getElementById('aptKeySave').onclick=function(){
      var v=(document.getElementById('aptKey').value||'').trim();
      lsSet(K_KEY,v);
      var st=document.getElementById('aptKeySt');
      if(st) st.innerHTML=v?'✓ 저장되었습니다':'키가 비어 있습니다';
      if(window.__nnToast) window.__nnToast(v?'✓ API 키가 저장되었습니다':'API 키를 지웠습니다');
    };
    document.getElementById('aptSido').onchange=function(){
      ST.si=parseInt(this.value,10)||0;
      var g=SGG[ST.si]||[]; ST.lawd=g.length?g[0].c:'';
      var sg=document.getElementById('aptSgg');
      if(sg) sg.innerHTML=g.map(function(x){ return '<option value="'+x.c+'">'+x.n+'</option>'; }).join('');
      savePref();
    };
    document.getElementById('aptSgg').onchange=function(){ ST.lawd=this.value; savePref(); };
    document.getElementById('aptMonths').onchange=function(){ ST.months=parseInt(this.value,10)||3; savePref(); };
    document.getElementById('aptSort').onchange=function(){ ST.sort=this.value; renderResult(); };
    var qi=document.getElementById('aptQ'), qt=null;
    qi.oninput=function(){ clearTimeout(qt); var v=this.value; qt=setTimeout(function(){ ST.q=v; renderResult(); },260); };
    qi.onkeydown=function(e){ if(e.key==='Enter'){ e.preventDefault(); clearTimeout(qt); ST.q=this.value; renderResult(); } };
    document.getElementById('aptRun').onclick=function(){ runQuery(); };
    renderFav(); renderResult();
  }

  window.AptDeal={
    fav:function(encApt){
      var apt=decodeURIComponent(encApt);
      var f=favLoad(), i=-1;
      f.forEach(function(x,ix){ if(x.lawd===ST.lawd && x.apt===apt) i=ix; });
      if(i>=0){ f.splice(i,1); if(window.__nnToast) window.__nnToast('관심 단지에서 해제했습니다'); }
      else { f.push({lawd:ST.lawd, apt:apt, rn:regName(), si:ST.si}); if(window.__nnToast) window.__nnToast('★ "'+apt+'" 관심 단지에 추가했습니다'); }
      favSave(f); renderFav(); renderResult();
    },
    favDel:function(i){ var f=favLoad(); f.splice(i,1); favSave(f); renderFav(); renderResult(); },
    favGo:function(i){
      var f=favLoad()[i]; if(!f) return;
      ST.si=(typeof f.si==='number'?f.si:ST.si); ST.lawd=f.lawd; ST.q=f.apt; savePref();
      build(); runQuery();
    }
  };
  window.__aptInit=function(){ if(document.getElementById('aptRoot')) build(); };
})();

/* ══════════ 히어로 스크롤 유도 ══════════ */
(function(){
  /* ⑥ 히어로 스크롤 유도 */
  function ensureCue(){
    var hero=document.querySelector('.hero');
    if(!hero || hero.__cue) return;
    hero.__cue=true;
    var cue=document.createElement('button');
    cue.type='button'; cue.className='hero-cue'; cue.setAttribute('aria-label','아래로 이동');
    cue.innerHTML='<span class="hc-txt">SCROLL</span><span class="hc-line"><i></i></span>';
    cue.onclick=function(){
      var dd=document.querySelector('.daily-desk');
      var top=dd ? dd.getBoundingClientRect().top+window.pageYOffset-70 : window.innerHeight;
      window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
    };
    hero.appendChild(cue);
    /* 스크롤을 시작하면 사라짐 */
    function fade(){
      cue.classList.toggle('gone', window.pageYOffset>60);
    }
    window.addEventListener('scroll',fade,{passive:true});
    fade();
  }

  function boot(){ ensureCue(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else setTimeout(boot,80);
})();

/* ══════════ 섹션 인디케이터 (우측 세로 내비게이션) ══════════ */
(function(){
  var NAV=[
    {k:'hero',  lb:'HOME',            sel:'.hero'},
    {k:'daily', lb:'DAILY DESK',      sel:'.daily-desk'},
    {k:'hub',   lb:'HOLDINGS HUB',    sel:null},
    {k:'desk',  lb:'REFERENCE DESK',  sel:null},
    {k:'mast',  lb:'SUPER INVESTORS', sel:'.masters-section'}
  ];
  var els={}, bar=null, dots={}, io=null, curKey=null;

  function resolve(){
    els.hero=document.querySelector('.hero');
    els.daily=document.querySelector('.daily-desk');
    var hg=document.getElementById('hubGrid');
    els.hub=hg?hg.closest('.company-section'):null;
    var rl=document.getElementById('rdLanes');
    els.desk=rl?rl.closest('.ref-lane-section'):null;
    els.mast=document.querySelector('.masters-section');
    /* 슈퍼인베스터가 데스크와 같은 요소로 잡히면 분리 */
    if(els.desk && els.mast && els.desk===els.mast) els.desk=null;
    return NAV.filter(function(n){ return !!els[n.k]; });
  }

  function build(){
    var list=resolve();
    if(list.length<2) return;
    if(bar) bar.remove();
    bar=document.createElement('nav');
    bar.className='sec-ind'; bar.setAttribute('aria-label','섹션 이동');
    bar.innerHTML=list.map(function(n){
      return '<button type="button" class="si-dot" data-k="'+n.k+'">'
        + '<span class="si-lb">'+n.lb+'</span><span class="si-pt"></span></button>';
    }).join('');
    document.body.appendChild(bar);
    dots={};
    bar.querySelectorAll('.si-dot').forEach(function(b){
      var k=b.getAttribute('data-k');
      dots[k]=b;
      b.onclick=function(){
        var el=els[k]; if(!el) return;
        var top=el.getBoundingClientRect().top+window.pageYOffset-(k==='hero'?0:56);
        window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
      };
    });
    observe(list);
    updateVisibility();
  }

  function setActive(k){
    if(curKey===k) return;
    curKey=k;
    Object.keys(dots).forEach(function(x){ dots[x].classList.toggle('on', x===k); });
  }

  function observe(list){
    if(io) io.disconnect();
    if(!('IntersectionObserver' in window)) return;
    var seen={};
    io=new IntersectionObserver(function(es){
      es.forEach(function(e){ seen[e.target.__siKey]=e.isIntersecting?e.intersectionRatio:0; });
      var best=null, bv=0;
      list.forEach(function(n){
        var v=seen[n.k]||0;
        if(v>bv){ bv=v; best=n.k; }
      });
      if(best) setActive(best);
    },{root:null,rootMargin:'-45% 0px -45% 0px',threshold:[0,.01,.25,.5,1]});
    list.forEach(function(n){
      var el=els[n.k]; if(!el) return;
      el.__siKey=n.k; io.observe(el);
    });
  }

  /* 홈 탭에서만 표시 */
  function updateVisibility(){
    if(!bar) return;
    var home=document.getElementById('page-home');
    var on = home && home.classList.contains('active');
    bar.classList.toggle('show', !!on);
  }

  function boot(){
    build();
    window.addEventListener('resize',function(){ setTimeout(build,120); });
    document.addEventListener('click',function(){ setTimeout(updateVisibility,60); },true);
    setInterval(updateVisibility,1200);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else setTimeout(boot,60);
})();

/* ══════════ DAILY DESK — 오늘의 브리핑 · D-DAY · 최근 기록 ══════════ */
(function(){
  function $d(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function W(){ return (typeof workerUrl==='function') ? workerUrl() : ''; }
  function fmtChg(v){
    if(v==null||isNaN(v)) return '';
    var s=(v>=0?'+':'')+v.toFixed(2)+'%';
    return '<b class="'+(v>=0?'dd-pos':'dd-neg')+'">'+s+'</b>';
  }
  function fmtNum(v,dec){ if(v==null||isNaN(v)) return '—'; return Number(v).toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}); }

  /* ── ① 오늘의 브리핑 ── */
  async function renderBriefing(){
    var dEl=$d('ddDate'), sEl=$d('ddSum'), pEl=$d('ddPills');
    if(!sEl) return;
    var now=new Date();
    if(dEl) dEl.textContent=now.getFullYear()+'.'+String(now.getMonth()+1).padStart(2,'0')+'.'+String(now.getDate()).padStart(2,'0')+' '+['일','월','화','수','목','금','토'][now.getDay()]+'요일';
    var w=W();
    if(!w){
      sEl.innerHTML='매크로 탭에서 프록시(Worker)를 연결하면 <b style="color:#e0c389">실시간 시장 브리핑</b>이 이 자리에 표시됩니다.';
      if(pEl) pEl.innerHTML='';
      return;
    }
    /* 관심종목 수집 */
    var wl=[];
    try{ wl=JSON.parse(localStorage.getItem('nn_watchlist_v1')||'[]'); }catch(e){}
    var us=['^GSPC','^IXIC'], kr=[], cr=[];
    wl.forEach(function(it){
      if(it.market==='us') us.push(it.sym);
      else if(it.market==='kr') kr.push(it.sym);
      else if(it.market==='crypto') cr.push(it.sym);
    });
    try{
      var qs=[w+'/kr'];
      var qp=w+'/quote?us='+encodeURIComponent(us.join(','));
      if(kr.length) qp+='&kr='+encodeURIComponent(kr.join(','));
      if(cr.length) qp+='&crypto='+encodeURIComponent(cr.join(','));
      qs.push(qp);
      var rs=await Promise.all(qs.map(function(u){ return fetch(u).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); }));
      var krIdx=rs[0]||{}, q=rs[1]||{};
      var kospi=krIdx.kospi||{}, spx=(q.us||{})['^GSPC']||{}, ixic=(q.us||{})['^IXIC']||{};

      /* 관심종목 최다 변동 */
      var top=null;
      function consider(name, chg){
        if(chg==null||isNaN(chg)) return;
        if(!top || Math.abs(chg)>Math.abs(top.chg)) top={name:name, chg:chg};
      }
      wl.forEach(function(it){
        var o=null, nm=it.sym;
        if(it.market==='us'){ o=(q.us||{})[it.sym]; }
        else if(it.market==='kr'){ o=(q.kr||{})[it.sym]; if(o&&o.name) nm=o.name; }
        else { o=(q.crypto||{})[it.sym]; if(o&&o.name) nm=o.name; }
        if(o) consider(nm, o.chg);
      });

      /* 요약 문장 */
      function word(c){ return c==null?'':(c>=0?'상승':'하락'); }
      var parts=[];
      if(kospi.chg!=null) parts.push('코스피 '+fmtChg(kospi.chg)+' '+word(kospi.chg));
      if(spx.chg!=null) parts.push('S&P500 '+fmtChg(spx.chg)+' '+word(spx.chg));
      var sum= parts.length ? parts.join(' · ') : '지수 데이터를 가져오지 못했습니다';
      if(top) sum+=' — 관심종목 중 <b class="dd-hl">'+esc(top.name)+'</b>이(가) '+fmtChg(top.chg)+'로 가장 크게 움직였습니다.';
      else sum+='.';
      sEl.innerHTML=sum;

      /* 지표 알약 */
      if(pEl){
        var pills='';
        function pill(lb,price,chg,dec){
          if(price==null) return '';
          return '<span class="dd-pill"><span class="ddp-lb">'+lb+'</span><span class="ddp-v">'+fmtNum(price,dec)+'</span>'+fmtChg(chg)+'</span>';
        }
        pills+=pill('KOSPI',kospi.price,kospi.chg,2);
        pills+=pill('KOSDAQ',(krIdx.kosdaq||{}).price,(krIdx.kosdaq||{}).chg,2);
        pills+=pill('S&P 500',spx.price,spx.chg,2);
        pills+=pill('NASDAQ',ixic.price,ixic.chg,2);
        if(top) pills+='<span class="dd-pill ddp-top"><span class="ddp-lb">TOP MOVER</span><span class="ddp-v">'+esc(top.name)+'</span>'+fmtChg(top.chg)+'</span>';
        pEl.innerHTML=pills;
      }
    }catch(e){
      sEl.textContent='시장 데이터를 불러오지 못했습니다 — 잠시 후 자동 재시도합니다.';
    }
  }

  /* ── ② D-DAY (수동 + 자동) ── */
  var DD_KEY='nn_dday_v1';
  var DD_HIDE_KEY='nn_dday_hide_v1';   /* 숨긴 자동 일정 */

  /* 확정 일정표 (기관 공식 발표 기준 · 연 1회 갱신) */
  var FIXED_EVENTS=[
    /* FOMC 2026 — 연방준비제도 공식 일정 (결정일 기준) */
    {d:'2026-07-29', t:'FOMC 금리결정', tag:'FOMC'},
    {d:'2026-09-16', t:'FOMC 금리결정 · 점도표', tag:'FOMC'},
    {d:'2026-10-28', t:'FOMC 금리결정', tag:'FOMC'},
    {d:'2026-12-09', t:'FOMC 금리결정 · 점도표', tag:'FOMC'},
    {d:'2027-01-27', t:'FOMC 금리결정', tag:'FOMC'},
    /* 미국 CPI — BLS 공식 발표일 */
    {d:'2026-08-12', t:'미국 CPI 발표', tag:'CPI'}
  ];

  function ymd(dt){
    return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  }
  function nthWeekday(y,m,weekday,nth){   /* m: 0-11, weekday: 0=일 */
    var d=new Date(y,m,1), cnt=0;
    while(d.getMonth()===m){
      if(d.getDay()===weekday){ cnt++; if(cnt===nth) return new Date(y,m,d.getDate()); }
      d.setDate(d.getDate()+1);
    }
    return null;
  }
  /* 규칙으로 계산되는 일정 — 향후 100일 */
  function computedEvents(){
    var out=[], now=new Date();
    var start=new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var end=new Date(start.getTime()+100*86400000);
    for(var k=0;k<5;k++){
      var y=start.getFullYear(), m=start.getMonth()+k;
      var yy=y+Math.floor(m/12), mm=((m%12)+12)%12;
      /* 옵션만기 — 셋째 금요일 */
      var opt=nthWeekday(yy,mm,5,3);
      if(opt){
        var quad=(mm===2||mm===5||mm===8||mm===11);
        out.push({d:ymd(opt), t:quad?'쿼드러플 위칭 (네 마녀의 날)':'미국 옵션만기', tag:quad?'WITCH':'OPEX'});
      }
      /* 미국 고용보고서 — 첫째 금요일 */
      var jobs=nthWeekday(yy,mm,5,1);
      if(jobs) out.push({d:ymd(jobs), t:'미국 고용보고서', tag:'JOBS'});
      /* 분기 마감 */
      if(mm===2||mm===5||mm===8||mm===11){
        var last=new Date(yy,mm+1,0);
        out.push({d:ymd(last), t:'분기 마감 (Q'+(Math.floor(mm/3)+1)+')', tag:'QTR'});
      }
    }
    /* 한국 증시 휴장 (공휴일) */
    if(typeof window.__isKrHoliday==='function'){
      var cur=new Date(start.getTime());
      while(cur<=end){
        if(window.__isKrHoliday(cur.getFullYear(), cur.getMonth()+1, cur.getDate())){
          out.push({d:ymd(cur), t:'한국 증시 휴장', tag:'KRX'});
        }
        cur.setDate(cur.getDate()+1);
      }
    }
    return out.filter(function(x){
      var p=x.d.split('-'); var dt=new Date(+p[0],+p[1]-1,+p[2]);
      return dt>=start && dt<=end;
    });
  }

  /* Finnhub 무료 실적 캘린더 — 관심종목(미국) 다음 발표일 */
  var earningsCache=[];
  function fetchEarnings(){
    var key='';
    try{ key=localStorage.getItem('nn_finnhub')||''; }catch(e){}
    if(!key) return;
    var wl=[];
    try{ wl=JSON.parse(localStorage.getItem('nn_watchlist_v1')||'[]'); }catch(e){}
    var us=wl.filter(function(x){ return x.market==='us'; }).map(function(x){ return x.sym; }).slice(0,12);
    if(!us.length) return;
    var now=new Date();
    var from=ymd(now), to=ymd(new Date(now.getTime()+100*86400000));
    Promise.all(us.map(function(sym){
      return fetch('https://finnhub.io/api/v1/calendar/earnings?from='+from+'&to='+to+'&symbol='+encodeURIComponent(sym)+'&token='+encodeURIComponent(key))
        .then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; });
    })).then(function(rs){
      var acc=[];
      rs.forEach(function(r){
        var arr=(r&&r.earningsCalendar)||[];
        if(arr.length){
          arr.sort(function(a,b){ return String(a.date).localeCompare(String(b.date)); });
          var e=arr[0];
          if(e && e.date) acc.push({d:e.date, t:(e.symbol||'')+' 실적발표', tag:'EARN'});
        }
      });
      earningsCache=acc;
      if(acc.length) renderDday();
    }).catch(function(){});
  }

  /* 배당락일 — ASSETS 배당 모듈이 채워 넣음 */
  var divCache=[];
  window.__ddSetDiv=function(list){
    divCache=Array.isArray(list)?list:[];
    try{ renderDday(); }catch(e){}
  };

  /* 청약 일정 — ASSETS 청약 모듈이 채워 넣음 */
  var subCache=[];
  window.__ddSetSub=function(list){
    subCache=Array.isArray(list)?list:[];
    try{ renderDday(); }catch(e){}
  };

  function autoEvents(){
    var hide=[];
    try{ hide=JSON.parse(localStorage.getItem(DD_HIDE_KEY)||'[]'); }catch(e){}
    var all=FIXED_EVENTS.concat(computedEvents()).concat(earningsCache).concat(divCache).concat(subCache);
    return all.map(function(x){
      return {id:'auto_'+x.d+'_'+(x.tag||''), t:x.t, d:x.d, auto:true, tag:x.tag};
    }).filter(function(x){ return hide.indexOf(x.id)<0; });
  }

  function ddLoad(){
    try{
      var raw=localStorage.getItem(DD_KEY);
      if(raw){ var l=JSON.parse(raw); if(Array.isArray(l)) return l; }
    }catch(e){}
    var seed=[
      {id:'dd1', t:'FOMC 회의',     d:'2026-07-28'},
      {id:'dd2', t:'미국 CPI 발표', d:'2026-08-12'},
      {id:'dd3', t:'미국 옵션만기', d:'2026-08-21'}
    ];
    try{ localStorage.setItem(DD_KEY, JSON.stringify(seed)); }catch(e){}
    return seed;
  }
  function ddSave(l){ try{ localStorage.setItem(DD_KEY, JSON.stringify(l)); }catch(e){} }
  function ddDiff(dstr){
    var p=String(dstr||'').split('-');
    if(p.length!==3) return null;
    var t=new Date(+p[0], +p[1]-1, +p[2]);
    var n=new Date(); var n0=new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.round((t-n0)/86400000);
  }
  function renderDday(){
    var host=$d('ddDdayList'); if(!host) return;
    var man=ddLoad();
    /* 7일 이상 지난 수동 일정은 자동 정리 */
    var keep=man.filter(function(x){ var df=ddDiff(x.d); return df==null || df>=-7; });
    if(keep.length!==man.length){ ddSave(keep); man=keep; }
    var l=keep.concat(autoEvents())
      .filter(function(x){ var df=ddDiff(x.d); return df==null || df>=0; })
      .sort(function(a,b){ return String(a.d).localeCompare(String(b.d)); })
      .slice(0,8);
    if(!l.length){
      host.innerHTML='<div class="dd-empty">등록된 일정이 없습니다 — 우측 상단 ＋ 일정으로 추가하세요.</div>';
      return;
    }
    host.innerHTML=l.map(function(x){
      var df=ddDiff(x.d);
      var badge, cls='';
      if(df==null){ badge='—'; }
      else if(df>0){ badge='D-'+df; cls=(df<=7?' dd-soon':''); }
      else if(df===0){ badge='D-DAY'; cls=' dd-today'; }
      else { badge='D+'+(-df); cls=' dd-past'; }
      var dp=String(x.d).split('-');
      var dLb=dp.length===3 ? (dp[1]+'.'+dp[2]) : x.d;
      return '<div class="dd-item'+cls+(x.auto?' dd-auto':'')+'" data-id="'+esc(x.id)+'"'+(x.auto?' data-auto="1"':'')+'>'
        + '<span class="ddi-badge">'+badge+'</span>'
        + '<span class="ddi-t">'+esc(x.t)+(x.auto?'<span class="ddi-auto">AUTO</span>':'')+'</span>'
        + '<span class="ddi-d">'+esc(dLb)+'</span>'
        + '<button type="button" class="ddi-del" title="'+(x.auto?'목록에서 숨기기':'삭제')+'">&times;</button>'
        + '</div>';
    }).join('');
    host.querySelectorAll('.dd-item').forEach(function(it){
      var id=it.getAttribute('data-id');
      var isAuto=it.getAttribute('data-auto')==='1';
      it.querySelector('.ddi-del').onclick=function(e){
        e.stopPropagation();
        if(isAuto){
          var hide=[]; try{ hide=JSON.parse(localStorage.getItem(DD_HIDE_KEY)||'[]'); }catch(err){}
          hide.push(id);
          try{ localStorage.setItem(DD_HIDE_KEY, JSON.stringify(hide)); }catch(err){}
          renderDday();
          if(window.__nnToast) window.__nnToast('자동 일정을 숨겼습니다',{kind:'del',undo:function(){
            var h2=[]; try{ h2=JSON.parse(localStorage.getItem(DD_HIDE_KEY)||'[]'); }catch(err){}
            h2=h2.filter(function(z){ return z!==id; });
            try{ localStorage.setItem(DD_HIDE_KEY, JSON.stringify(h2)); }catch(err){}
            renderDday();
          }});
          return;
        }
        var l2=ddLoad(); var idx=l2.findIndex(function(x){ return x.id===id; });
        if(idx<0) return;
        var rm=l2[idx]; l2.splice(idx,1); ddSave(l2); renderDday();
        try{ if(typeof renderMiniCalendar==='function') renderMiniCalendar(); }catch(e){}
        if(window.__nnToast) window.__nnToast('🗑 "'+rm.t+'" 일정 삭제됨',{kind:'del',undo:function(){
          var l3=ddLoad(); l3.splice(Math.min(idx,l3.length),0,rm); ddSave(l3); renderDday();
        }});
      };
      it.onclick=function(){ if(!isAuto) openDdayModal(id); };
    });
  }
  function openDdayModal(editId){
    var l=ddLoad();
    var cur=editId ? l.find(function(x){ return x.id===editId; }) : null;
    var prev=document.getElementById('ddModalOv'); if(prev) prev.remove();
    var ov=document.createElement('div');
    ov.id='ddModalOv'; ov.className='hub-modal-ov';
    ov.innerHTML='<div class="hub-modal ddm-cal-modal" style="width:352px">'
      + '<div class="hm-title">'+(cur?'일정 수정':'일정 추가')+'</div>'
      + '<label class="hm-lb">일정 이름</label>'
      + '<input class="hm-in" id="ddmT" placeholder="예: FOMC 회의" value="'+esc(cur?cur.t:'')+'" autocomplete="off">'
      + '<label class="hm-lb" style="margin-top:11px">날짜</label>'
      + '<input id="ddmD" type="hidden" value="'+esc(cur?cur.d:'')+'">'
      + '<div class="ddcal" id="ddCal"></div>'
      + '<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      + '<button type="button" class="hm-btn hm-save">'+(cur?'저장':'추가')+'</button></div>'
      + '</div>';
    document.body.appendChild(ov);

    /* ── 날짜 선택 달력 (히어로 미니 캘린더와 동일 디자인) ── */
    var hidden=ov.querySelector('#ddmD');
    var sel=null;
    if(cur && /^\d{4}-\d{2}-\d{2}$/.test(cur.d||'')){
      var pp=cur.d.split('-'); sel={y:+pp[0], m:+pp[1]-1, d:+pp[2]};
    }
    var todayD=new Date();
    var view={ y:(sel?sel.y:todayD.getFullYear()), m:(sel?sel.m:todayD.getMonth()) };
    function pad2(n){ return String(n).padStart(2,'0'); }
    function paintCal(){
      var host=ov.querySelector('#ddCal'); if(!host) return;
      var Y=view.y, Mo=view.m;
      var first=new Date(Y,Mo,1), last=new Date(Y,Mo+1,0);
      var startDow=first.getDay(), total=last.getDate();
      var MN=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
      var h='<div class="mc-head">'
        + '<button type="button" class="mc-nav" data-mv="-1">&#8249;</button>'
        + '<div class="mc-title"><span class="mc-mon">'+MN[Mo]+'</span><span class="mc-year">'+Y+'</span></div>'
        + '<button type="button" class="mc-nav" data-mv="1">&#8250;</button></div>';
      var dowNames=['S','M','T','W','T','F','S'];
      h+='<div class="mc-grid">';
      for(var i=0;i<7;i++){
        var wc = i===0?' mc-sun':(i===6?' mc-sat':'');
        h+='<span class="mc-dow'+wc+'">'+dowNames[i]+'</span>';
      }
      for(var b=0;b<startDow;b++) h+='<span class="mc-cell mc-empty"></span>';
      for(var day=1;day<=total;day++){
        var dw=(startDow+day-1)%7;
        var cls='mc-cell ddc-pick';
        if(dw===0 || (typeof isKrHoliday==='function' && isKrHoliday(Y,Mo+1,day))) cls+=' mc-sun';
        else if(dw===6) cls+=' mc-sat';
        if(Y===todayD.getFullYear() && Mo===todayD.getMonth() && day===todayD.getDate()) cls+=' mc-today';
        if(sel && sel.y===Y && sel.m===Mo && sel.d===day) cls+=' ddc-sel';
        h+='<span class="'+cls+'" data-d="'+day+'">'+day+'</span>';
      }
      h+='</div>';
      var picked = sel ? (sel.y+'.'+pad2(sel.m+1)+'.'+pad2(sel.d)) : '날짜를 선택하세요';
      h+='<div class="ddc-foot"><span class="ddc-lb">선택</span><span class="ddc-val'+(sel?' on':'')+'">'+picked+'</span>'
        + '<button type="button" class="ddc-today">오늘</button></div>';
      host.innerHTML=h;
      host.querySelectorAll('.mc-nav').forEach(function(bn){
        bn.onclick=function(e){ e.preventDefault(); e.stopPropagation();
          var mv=parseInt(bn.getAttribute('data-mv'),10);
          var d2=new Date(view.y, view.m+mv, 1);
          view={y:d2.getFullYear(), m:d2.getMonth()}; paintCal();
        };
      });
      host.querySelectorAll('.ddc-pick').forEach(function(c){
        c.onclick=function(e){ e.stopPropagation();
          sel={y:view.y, m:view.m, d:parseInt(c.getAttribute('data-d'),10)};
          if(hidden) hidden.value=sel.y+'-'+pad2(sel.m+1)+'-'+pad2(sel.d);
          paintCal();
        };
      });
      var tb=host.querySelector('.ddc-today');
      if(tb) tb.onclick=function(e){ e.preventDefault(); e.stopPropagation();
        var n=new Date();
        view={y:n.getFullYear(), m:n.getMonth()};
        sel={y:n.getFullYear(), m:n.getMonth(), d:n.getDate()};
        if(hidden) hidden.value=sel.y+'-'+pad2(sel.m+1)+'-'+pad2(sel.d);
        paintCal();
      };
    }
    paintCal();

    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    ov.querySelector('.hm-cancel').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    ov.querySelector('.hm-save').onclick=function(){
      var t=(ov.querySelector('#ddmT').value||'').trim();
      var d=(ov.querySelector('#ddmD').value||'').trim();
      if(!t){ if(window.__nnToast) window.__nnToast('일정 이름을 입력해 주세요',{kind:'del'}); return; }
      if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){ if(window.__nnToast) window.__nnToast('날짜를 선택해 주세요',{kind:'del'}); return; }
      var l2=ddLoad();
      if(cur){
        var tg=l2.find(function(x){ return x.id===cur.id; });
        if(tg){ tg.t=t; tg.d=d; }
      }else{
        l2.push({id:'dd_'+Date.now(), t:t, d:d});
      }
      ddSave(l2); renderDday(); close();
      try{ if(typeof renderMiniCalendar==='function') renderMiniCalendar(); }catch(e){}
      if(window.__nnToast) window.__nnToast('✓ 일정이 '+(cur?'수정':'추가')+'되었습니다');
    };
    ov.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); if(e.key==='Enter'){ e.preventDefault(); ov.querySelector('.hm-save').click(); } });
    requestAnimationFrame(function(){ ov.classList.add('show'); ov.querySelector('#ddmT').focus(); });
  }

  /* ── ③ 최근 기록 ── */
  /* 각 탭의 상징색과 일치 */
  var TYPE_META={
    books:{lb:'BOOKS', c:'#e8c47e', page:'books'},
    media:{lb:'MEDIA', c:'#7fbef5', page:'media'},
    lexicon:{lb:'LEXICON', c:'#aeb1b4', page:'lexicon'},
    economics:{lb:'ECON', c:'#7fd58c', page:'economics'}
  };
  function timeAgo(ts){
    if(!ts) return '';
    var s=Math.floor((Date.now()-ts)/1000);
    if(s<60) return '방금';
    if(s<3600) return Math.floor(s/60)+'분 전';
    if(s<86400) return Math.floor(s/3600)+'시간 전';
    return Math.floor(s/86400)+'일 전';
  }
  function stripHtml(s){
    var d=document.createElement('div'); d.innerHTML=String(s||'');
    return (d.textContent||'').replace(/\s+/g,' ').trim();
  }
  function renderRecent(){
    var host=$d('ddRecentList'); if(!host) return;
    var kn=window.KnowledgeNotes;
    if(!kn || !kn.data){ host.innerHTML='<div class="dd-empty">기록을 불러오는 중...</div>'; return; }
    var all=[];
    Object.keys(TYPE_META).forEach(function(t){
      (kn.data[t]||[]).forEach(function(n,i){
        if(!n||!n.id) return;
        all.push({type:t, id:n.id, title:(n.title||'').trim()||'제목 없음',
          snippet:stripHtml(n.content).slice(0,52), mtime:n.mtime||0, idx:i});
      });
    });
    if(!all.length){ host.innerHTML='<div class="dd-empty">아직 기록이 없습니다 — KNOWLEDGE 탭에서 첫 기록을 남겨보세요.</div>'; return; }
    all.sort(function(a,b){ return (b.mtime-a.mtime) || (b.idx-a.idx); });
    host.innerHTML=all.slice(0,4).map(function(n){
      var m=TYPE_META[n.type];
      return '<div class="dd-note" data-type="'+n.type+'" data-id="'+esc(n.id)+'">'
        + '<span class="ddn-badge" style="color:'+m.c+';border-color:'+m.c+'55;background:'+m.c+'14">'+m.lb+'</span>'
        + '<span class="ddn-body"><span class="ddn-t">'+esc(n.title)+'</span>'
        + (n.snippet?'<span class="ddn-s">'+esc(n.snippet)+'</span>':'')
        + '</span>'
        + (n.mtime?'<span class="ddn-ago">'+timeAgo(n.mtime)+'</span>':'')
        + '</div>';
    }).join('');
    renderStats(all);
    host.querySelectorAll('.dd-note').forEach(function(el){
      el.onclick=function(){
        var t=el.getAttribute('data-type'), id=el.getAttribute('data-id');
        var m=TYPE_META[t];
        try{ if(typeof switchPage==='function') switchPage(m.page); }catch(e){}
        setTimeout(function(){
          try{
            var kn2=window.KnowledgeNotes;
            var n=(kn2.data[t]||[]).find(function(x){ return x.id===id; });
            if(n) n.mtime=Date.now();
            kn2.activeIds[t]=id; kn2.save();
            kn2.renderSidebar(t); kn2.renderEditor(t);
          }catch(e){}
        }, 120);
      };
    });
  }

  /* 기록 통계 — 이번 달 · 올해 · 전체 */
  function renderStats(all){
    var el=$d('ddStats'); if(!el) return;
    var now=new Date(), y=now.getFullYear(), m=now.getMonth();
    var mo=0, yr=0;
    (all||[]).forEach(function(n){
      if(!n.mtime) return;
      var d=new Date(n.mtime);
      if(d.getFullYear()===y){
        yr++;
        if(d.getMonth()===m) mo++;
      }
    });
    var total=(all||[]).length;
    el.innerHTML='<span class="dds-item"><b>'+mo+'</b><i>개</i><span class="dds-lb">이번 달</span></span>'
      + '<span class="dds-div"></span>'
      + '<span class="dds-item"><b>'+yr+'</b><i>개</i><span class="dds-lb">올해</span></span>'
      + '<span class="dds-div"></span>'
      + '<span class="dds-item"><b>'+total+'</b><i>개</i><span class="dds-lb">전체</span></span>';
  }

  /* ── 초기화 ── */
  function boot(){
    var add=$d('ddAddBtn');
    if(add) add.onclick=function(){ openDdayModal(null); };
    renderBriefing(); renderDday(); renderRecent();
    fetchEarnings(); setInterval(fetchEarnings, 6*3600000);
    setInterval(renderBriefing, 300000);   /* 5분 */
    setInterval(renderDday, 3600000);      /* 1시간 (자정 넘어감 대비) */
    setInterval(renderRecent, 60000);      /* 1분 */
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ══════════ THESIS — 논지 아카이브 (태그 분류 · 출처 중심) ══════════ */
window.ThesisApp = (function(){
  var TAG_KEY='nn_thesis_tags_v1', FILT_KEY='nn_thesis_filter_v1';
  var DEFAULT_TAGS=['거시·현금','코인·스테이블','부동산','개별 종목','시장 구조'];
  var filter='__all';

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function KN(){ return window.KnowledgeNotes; }
  function list(){ var k=KN(); if(!k) return []; k.data.thesis=k.data.thesis||[]; return k.data.thesis; }
  function byId(id){ return list().find(function(n){ return n.id===id; })||null; }

  function tags(){
    try{ var s=localStorage.getItem(TAG_KEY); if(s){ var a=JSON.parse(s); if(Array.isArray(a)&&a.length) return a; } }catch(e){}
    return DEFAULT_TAGS.slice();
  }
  function saveTags(a){ try{ localStorage.setItem(TAG_KEY, JSON.stringify(a)); }catch(e){} }
  function loadFilter(){ try{ return localStorage.getItem(FILT_KEY)||'__all'; }catch(e){ return '__all'; } }
  function saveFilter(v){ try{ localStorage.setItem(FILT_KEY, v); }catch(e){} }

  function plain(html){
    var d=document.createElement('div'); d.innerHTML=String(html||'');
    d.querySelectorAll('.nn-props,.np-note,script,style').forEach(function(x){ x.remove(); });
    return (d.textContent||'').replace(/\s+/g,' ').trim();
  }
  function ago(ts){
    if(!ts) return '';
    var s=Math.floor((Date.now()-ts)/1000);
    if(s<60) return '방금';
    if(s<3600) return Math.floor(s/60)+'분 전';
    if(s<86400) return Math.floor(s/3600)+'시간 전';
    var d=Math.floor(s/86400);
    if(d<7) return d+'일 전';
    if(d<35) return Math.floor(d/7)+'주 전';
    return Math.floor(d/30)+'개월 전';
  }
  function mtime(n){ return n.mtime || n.ctime || 0; }

  /* ── 좌측 태그 패널 ── */
  function renderTags(){
    var host=document.getElementById('thTagBox'); if(!host) return;
    var L=list(), T=tags();
    var starN=L.filter(function(n){ return n.star; }).length;
    var cnt=function(v){ return v>0 ? '<span>'+v+'</span>' : ''; };
    var h='<div class="th-tg'+(filter==='__all'?' on':'')+'" data-t="__all">전체'+cnt(L.length)+'</div>'
      +'<div class="th-tg'+(filter==='__star'?' on':'')+'" data-t="__star">⭐ 중요'+cnt(starN)+'</div>'
      +'<div class="th-tsep"></div><div class="th-tlabel">주제</div>';
    T.forEach(function(t){
      var c=L.filter(function(n){ return (n.tags||[]).indexOf(t)>=0; }).length;
      h+='<div class="th-tg'+(filter===t?' on':'')+'" data-t="'+esc(t)+'">'+esc(t)+cnt(c)+'</div>';
    });
    var un=L.filter(function(n){ return !(n.tags||[]).length; }).length;
    if(un) h+='<div class="th-tg'+(filter==='__none'?' on':'')+'" data-t="__none">미분류'+cnt(un)+'</div>';
    h+='<button type="button" class="th-tedit" id="thTagEdit">주제 편집</button>';
    host.innerHTML=h;
    host.querySelectorAll('.th-tg').forEach(function(b){
      b.onclick=function(){ filter=b.getAttribute('data-t'); saveFilter(filter); renderTags(); renderCards(); };
    });
    var te=host.querySelector('#thTagEdit'); if(te) te.onclick=openTagEdit;
  }

  /* ── 카드 목록 ── */
  function filtered(){
    var L=list().slice();
    if(filter==='__star') L=L.filter(function(n){ return n.star; });
    else if(filter==='__none') L=L.filter(function(n){ return !(n.tags||[]).length; });
    else if(filter!=='__all') L=L.filter(function(n){ return (n.tags||[]).indexOf(filter)>=0; });
    L.sort(function(a,b){ return mtime(b)-mtime(a); });
    return L;
  }
  function renderCards(){
    var head=document.getElementById('thListHead'), host=document.getElementById('thCards');
    if(!host) return;
    var L=filtered();
    if(head){
      var lb = filter==='__all'?'전체':(filter==='__star'?'중요':(filter==='__none'?'미분류':filter));
      var srcN=0; L.forEach(function(n){ srcN+=(n.sources||[]).length; });
      head.innerHTML='<div class="th-lh-l"><span class="th-lh-t">'+esc(lb)+'</span>'
        +'<span class="th-lh-n">'+L.length+'</span>'
        +(srcN?'<span class="th-lh-sep"></span><span class="th-lh-src">출처 '+srcN+'</span>':'')+'</div>'
        +'<span class="th-lh-s">최근 수정순</span>';
    }
    if(!L.length){
      host.innerHTML='<div class="th-empty"><div class="th-e-i">🧭</div>'
        +'<b>'+(filter==='__all'?'아직 정리한 글이 없습니다':'이 주제에 해당하는 글이 없습니다')+'</b>'
        +'<p>책·뉴스·영상을 보고 든 생각을 정리해 두면,<br>나중에 판단의 근거를 되짚어볼 수 있습니다.</p>'
        +'<button type="button" class="th-e-btn" onclick="ThesisApp.create()">첫 글 쓰기</button></div>';
      return;
    }
    host.innerHTML=L.map(function(n,i){
      var tg=(n.tags||[]).map(function(t){ return '<span class="th-ctag">'+esc(t)+'</span>'; }).join('');
      var sym=(n.symbols||'').trim();
      var body=plain(n.content).slice(0,110);
      var src=(n.sources||[]).length;
      var idx=('0'+(i+1)).slice(-2);
      return '<div class="th-card'+(n.star?' starred':'')+'" data-id="'+n.id+'">'
        +'<span class="th-c-num">'+idx+'</span>'
        +'<div class="th-c-in">'
        +'<div class="th-c-top">'+(tg||'<span class="th-ctag none">미분류</span>')
        +(sym?'<span class="th-csym">'+esc(sym)+'</span>':'')
        +'<button type="button" class="th-cstar'+(n.star?' on':'')+'" data-id="'+n.id+'" title="중요 표시">'+(n.star?'★':'☆')+'</button></div>'
        +'<div class="th-c-title">'+((window.__nnIsShared&&window.__nnIsShared(n.id))?'<span class="th-c-share" title="공유 중">🔗</span>':'')+esc(n.title||'제목 없는 글')+'</div>'
        +(body?'<div class="th-c-body">'+esc(body)+'</div>':'')
        +'<div class="th-c-foot">'+(src?'<span class="th-cf-i src">'+src+'개의 출처</span>':'<span class="th-cf-i dim">출처 없음</span>')
        +'<span class="th-cf-i">'+ago(mtime(n))+'</span>'
        +'<button type="button" class="th-cdel" data-id="'+n.id+'" title="삭제">✕</button></div>'
        +'</div></div>';
    }).join('');
    host.querySelectorAll('.th-card').forEach(function(c){
      c.onclick=function(e){
        if(e.target.closest('.th-cstar')||e.target.closest('.th-cdel')) return;
        open(c.getAttribute('data-id'));
      };
    });
    host.querySelectorAll('.th-cstar').forEach(function(b){
      b.onclick=function(e){ e.stopPropagation();
        var n=byId(b.getAttribute('data-id')); if(!n) return;
        n.star=!n.star; KN().save(); renderTags(); renderCards();
      };
    });
    host.querySelectorAll('.th-cdel').forEach(function(b){
      b.onclick=function(e){ e.stopPropagation();
        var id=b.getAttribute('data-id'), n=byId(id); if(!n) return;
        var run=function(){
          var L2=list(), i=L2.findIndex(function(x){ return x.id===id; });
          if(i<0) return;
          var backup=L2[i]; L2.splice(i,1); KN().save(); renderTags(); renderCards();
          if(window.__nnToast) window.__nnToast('글을 삭제했습니다',{kind:'del',undo:function(){
            list().splice(Math.min(i,list().length),0,backup); KN().save(); renderTags(); renderCards();
          }});
        };
        if(window.__nnConfirm) window.__nnConfirm({
          title:'"'+(n.title||'제목 없는 글')+'"를 삭제할까요?',
          msg:'삭제 후에도 잠시 동안은 되돌리기로 복구할 수 있습니다.',
          ok:'삭제', onOk:run
        });
        else run();
      };
    });
  }

  /* ── 주제(태그) 편집 ── */
  function openTagEdit(){
    var prev=document.getElementById('thTagOv'); if(prev) prev.remove();
    var ov=document.createElement('div'); ov.id='thTagOv'; ov.className='hub-modal-ov';
    function rows(){
      return tags().map(function(t,i){
        return '<div class="th-trow"><input class="hm-in th-tin" data-i="'+i+'" value="'+esc(t)+'">'
          +'<button type="button" class="th-trm" data-i="'+i+'">✕</button></div>';
      }).join('');
    }
    ov.innerHTML='<div class="hub-modal" style="width:360px"><div class="hm-title">주제 편집</div>'
      +'<div class="th-trows" id="thTrows">'+rows()+'</div>'
      +'<button type="button" class="th-tadd" id="thTadd">+ 주제 추가</button>'
      +'<div class="ddm-hint">주제를 지워도 글은 남습니다. 해당 글은 미분류로 이동합니다.</div>'
      +'<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      +'<button type="button" class="hm-btn hm-save">저장</button></div></div>';
    document.body.appendChild(ov);
    var box=ov.querySelector('#thTrows');
    function bind(){
      box.querySelectorAll('.th-trm').forEach(function(b){
        b.onclick=function(){ b.closest('.th-trow').remove(); };
      });
    }
    bind();
    ov.querySelector('#thTadd').onclick=function(){
      var d=document.createElement('div'); d.className='th-trow';
      d.innerHTML='<input class="hm-in th-tin" value=""><button type="button" class="th-trm">✕</button>';
      box.appendChild(d); bind(); d.querySelector('input').focus();
    };
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    ov.querySelector('.hm-cancel').onclick=close;
    ov.querySelector('.hm-save').onclick=function(){
      var next=[], seen={};
      box.querySelectorAll('.th-tin').forEach(function(i){
        var v=(i.value||'').trim();
        if(v && !seen[v]){ seen[v]=1; next.push(v); }
      });
      if(!next.length) next=DEFAULT_TAGS.slice();
      saveTags(next);
      list().forEach(function(n){ n.tags=(n.tags||[]).filter(function(t){ return next.indexOf(t)>=0; }); });
      KN().save();
      if(filter!=='__all'&&filter!=='__star'&&filter!=='__none'&&next.indexOf(filter)<0){ filter='__all'; saveFilter(filter); }
      close(); renderTags(); renderCards();
    };
    ov.onclick=function(e){ if(e.target===ov) close(); };
    requestAnimationFrame(function(){ ov.classList.add('show'); });
  }

  /* ── 출처 패널 (에디터 상단) ── */
  function srcPanel(n){
    var wrap=document.createElement('div'); wrap.className='th-srcbox';
    function paint(){
      var S=n.sources||[];
      wrap.innerHTML='<div class="th-sb-h"><span class="th-sb-t">📚 근거가 된 출처 <b>'+S.length+'</b></span>'
        +'<button type="button" class="th-sb-add">+ 출처 추가</button></div>'
        +(S.length?'<div class="th-sb-l">'+S.map(function(x,i){
            var t=esc(x.title||x.url||'');
            return '<div class="th-sb-i">'+(x.url?'<a href="'+esc(x.url)+'" target="_blank" rel="noopener">'+t+'</a>':'<span>'+t+'</span>')
              +(x.note?'<i>'+esc(x.note)+'</i>':'')
              +'<button type="button" class="th-sb-rm" data-i="'+i+'">✕</button></div>';
          }).join('')+'</div>'
          :'<div class="th-sb-e">읽은 책·본 영상·기사 링크를 남겨두면 나중에 근거를 되짚기 쉽습니다.</div>');
      wrap.querySelector('.th-sb-add').onclick=function(){ addSrc(n, paint); };
      wrap.querySelectorAll('.th-sb-rm').forEach(function(b){
        b.onclick=function(){ (n.sources||[]).splice(parseInt(b.getAttribute('data-i'),10),1); KN().save(); paint(); };
      });
    }
    paint();
    return wrap;
  }
  function addSrc(n, done){
    var prev=document.getElementById('thSrcOv'); if(prev) prev.remove();
    var ov=document.createElement('div'); ov.id='thSrcOv'; ov.className='hub-modal-ov';
    ov.innerHTML='<div class="hub-modal" style="width:380px"><div class="hm-title">출처 추가</div>'
      +'<label class="hm-lb">제목</label><input class="hm-in" id="thSrcT" placeholder="예: 팬딩 · 유동성 축소 국면 정리" autocomplete="off">'
      +'<label class="hm-lb" style="margin-top:10px">링크 <span class="hm-hint">(선택)</span></label>'
      +'<input class="hm-in" id="thSrcU" placeholder="https://" autocomplete="off" spellcheck="false">'
      +'<label class="hm-lb" style="margin-top:10px">한 줄 메모 <span class="hm-hint">(선택)</span></label>'
      +'<input class="hm-in" id="thSrcN" placeholder="예: 3장 · 현금의 기회비용" autocomplete="off">'
      +'<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      +'<button type="button" class="hm-btn hm-save">추가</button></div></div>';
    document.body.appendChild(ov);
    var t=ov.querySelector('#thSrcT'), u=ov.querySelector('#thSrcU'), m=ov.querySelector('#thSrcN');
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    function ok(){
      var tv=(t.value||'').trim(); if(!tv){ t.focus(); return; }
      var uv=(u.value||'').trim();
      if(uv){
        if(/^\s*javascript:/i.test(uv)||/^\s*data:/i.test(uv)){ u.focus(); return; }
        if(!/^https?:\/\//i.test(uv)) uv='https://'+uv;
      }
      n.sources=n.sources||[];
      n.sources.push({title:tv, url:uv, note:(m.value||'').trim()});
      n.mtime=Date.now(); KN().save(); close(); if(done) done();
    }
    ov.querySelector('.hm-cancel').onclick=close;
    ov.querySelector('.hm-save').onclick=ok;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    ov.addEventListener('keydown', function(e){ if(e.key==='Escape'){e.preventDefault();close();} if(e.key==='Enter'){e.preventDefault();ok();} });
    requestAnimationFrame(function(){ ov.classList.add('show'); t.focus(); });
  }

  /* ── 태그·종목 선택 바 ── */
  function metaBar(n){
    var wrap=document.createElement('div'); wrap.className='th-meta';
    function paint(){
      var T=tags(), cur=n.tags||[];
      wrap.innerHTML='<div class="th-m-r"><span class="th-m-k">주제</span><div class="th-m-tags">'
        +T.map(function(t){ return '<button type="button" class="th-mt'+(cur.indexOf(t)>=0?' on':'')+'" data-t="'+esc(t)+'">'+esc(t)+'</button>'; }).join('')
        +'</div></div>'
        +'<div class="th-m-r"><span class="th-m-k">관련 종목</span>'
        +'<input class="th-m-in" id="thSym" placeholder="예: $SPY · 현금비중 (선택)" value="'+esc(n.symbols||'')+'"></div>';
      wrap.querySelectorAll('.th-mt').forEach(function(b){
        b.onclick=function(){
          var t=b.getAttribute('data-t'); n.tags=n.tags||[];
          var i=n.tags.indexOf(t);
          if(i>=0) n.tags.splice(i,1); else n.tags.push(t);
          n.mtime=Date.now(); KN().save(); paint();
        };
      });
      var si=wrap.querySelector('#thSym');
      if(si) si.onchange=function(){ n.symbols=si.value.trim(); n.mtime=Date.now(); KN().save(); };
    }
    paint();
    return wrap;
  }

  /* ── 열기 / 닫기 ── */
  /* ── 편집 화면 좌측 패널: 이 글의 정보 + 다른 글로 바로 이동 ── */
  function renderEditorSide(cur){
    var host=document.querySelector('.th-esidebar');
    if(!host) return;
    var k=KN(); if(!k) return;
    var all=(k.data.thesis||[]).slice().sort(function(a,b){ return mtime(b)-mtime(a); });

    /* 본문에서 글자 수 계산 */
    var tmp=document.createElement('div');
    tmp.innerHTML=cur.content||'';
    var chars=(tmp.textContent||'').replace(/\s+/g,'').length;
    var srcN=(cur.sources||[]).length;
    var tags=(cur.tags||[]);

    var h='<div class="thes-side">';
    h+='<button type="button" class="thes-new" id="thesNew">＋ 새 글 쓰기</button>';
    h+='<div class="thes-s-sec">'
      +'<div class="thes-s-t">이 글</div>'
      +'<div class="thes-stat"><span>글자 수</span><b>'+chars.toLocaleString()+'</b></div>'
      +'<div class="thes-stat"><span>출처</span><b>'+srcN+'</b></div>'
      +'<div class="thes-stat"><span>수정</span><b>'+ago(mtime(cur))+'</b></div>'
      +'</div>';

    h+='<div class="thes-s-sec"><div class="thes-s-t">주제</div>'
      + (tags.length
          ? '<div class="thes-tags">'+tags.map(function(t){ return '<span class="thes-tag">'+esc(t)+'</span>'; }).join('')+'</div>'
          : '<div class="thes-empty">아래 본문 위쪽에서 주제를 고를 수 있어요.</div>')
      + '</div>';

    var others=all.filter(function(x){ return x.id!==cur.id; }).slice(0,14);
    h+='<div class="thes-s-sec thes-s-grow"><div class="thes-s-t">다른 글 <i>'+all.length+'</i></div>';
    if(!others.length){
      h+='<div class="thes-empty">아직 다른 글이 없습니다.</div>';
    } else {
      h+='<div class="thes-list">'+others.map(function(x){
        return '<button type="button" class="thes-item" data-id="'+x.id+'">'
          +'<span class="thes-i-t">'+esc(x.title||'제목 없는 글')+'</span>'
          +'<span class="thes-i-m">'+((x.sources||[]).length?((x.sources||[]).length+'개 출처'):'출처 없음')+'</span>'
          +'</button>';
      }).join('')+'</div>';
    }
    h+='</div>';

    h+='</div>';
    host.innerHTML=h;

    host.querySelectorAll('.thes-item').forEach(function(b){
      b.onclick=function(){ open(b.getAttribute('data-id')); };
    });
    var nb=host.querySelector('#thesNew');
    if(nb) nb.onclick=function(){ create(); };
  }

  function open(id){
    var k=KN(); if(!k) return;
    var n=byId(id); if(!n) return;
    n.mtime=Date.now();
    k.activeIds.thesis=id; k.save();
    k.renderEditor('thesis');
    var wrap=document.getElementById('thWrap');
    var layout=document.getElementById('thesis-editor-layout');
    if(wrap) wrap.style.display='none';
    if(layout) layout.classList.add('editing');
    renderEditorSide(n);
    setTimeout(function(){
      try{
        var main=document.getElementById('thesis-editor-main');
        if(!main || !window.__nnRelPanel || !window.__nnRel) return;
        var old=main.querySelector('.rl-panel'); if(old) old.remove();
        var area=main.querySelector('.editor-scroll-area') || main;
        var panel=window.__nnRelPanel(window.__nnRel.makeRef('note','thesis', n.id));
        /* 다른 탭과 같이 본문 위쪽에 둔다 (제목·메타 다음) */
        var after=area.querySelector('.th-srcbox') || area.querySelector('.th-tagbox')
               || area.querySelector('.editor-toolbar') || null;
        if(after && after.nextSibling) area.insertBefore(panel, after.nextSibling);
        else if(after) area.appendChild(panel);
        else area.insertBefore(panel, area.firstChild);
      }catch(e){}
    }, 80);
    var main=document.getElementById('thesis-editor-main');
    if(main){
      var back=main.querySelector('.editor-back-btn');
      if(back){ back.innerHTML='\u2190 \uBAA9\uB85D\uC73C\uB85C'; back.onclick=function(){ close(); }; }
      var shb=main.querySelector('.editor-share-btn');
      if(shb) shb.onclick=function(){ if(window.__nnShareOpen) window.__nnShareOpen(n, 'THESIS \u00B7 \uC0DD\uAC01\uC758 \uAE30\uB85D'); };
      var sa=main.querySelector('.editor-scroll-area');
      if(sa){
        var body=sa.querySelector('[contenteditable="true"]');
        var mb=metaBar(n), sb=srcPanel(n);
        if(body){ sa.insertBefore(mb, body); sa.insertBefore(sb, body); }
        else { sa.appendChild(mb); sa.appendChild(sb); }
      }
    }
    try{ window.scrollTo(0,0); }catch(e){}
  }
  function close(){
    var k=KN(); if(k){ k.activeIds.thesis=null; k.save(); }
    var layout=document.getElementById('thesis-editor-layout');
    if(layout) layout.classList.remove('editing');
    var main=document.getElementById('thesis-editor-main');
    if(main) main.innerHTML='';
    var wrap=document.getElementById('thWrap');
    if(wrap) wrap.style.display='';
    renderTags(); renderCards();
  }

  function create(){
    var k=KN(); if(!k) return;
    var n={ id:'note_'+Date.now(), title:'제목 없는 글', content:'', date:k._nowStr?k._nowStr():'',
            tags: (filter!=='__all'&&filter!=='__star'&&filter!=='__none')?[filter]:[],
            sources:[], symbols:'', star:false, ctime:Date.now(), mtime:Date.now() };
    list().unshift(n); k.save();
    open(n.id);
    setTimeout(function(){
      var sa=document.querySelector('#thesis-editor-main .editor-scroll-area');
      if(!sa) return;
      var t=sa.firstElementChild;
      if(t && t.focus){ t.focus();
        try{ var r=document.createRange(); r.selectNodeContents(t); var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }catch(e){}
      }
    },90);
  }

  function render(){
    filter=loadFilter();
    var k=KN(); if(k) k.data.thesis=k.data.thesis||[];
    var layout=document.getElementById('thesis-editor-layout');
    var wrap=document.getElementById('thWrap');
    if(layout && !layout.classList.contains('editing')){
      if(wrap) wrap.style.display='';
      var main=document.getElementById('thesis-editor-main'); if(main) main.innerHTML='';
    }
    renderTags(); renderCards();
  }

  return { render:render, create:create, open:open, close:close, renderList:function(){ renderTags(); renderCards(); } };
})();

/* ══════════ 배경 표시 방식 — 첫 화면만(홈) / 계속 보임 ══════════ */
(function(){
  var el=null, raf=0;
  function ensure(){
    el=document.getElementById('nnScrollBg');
    if(!el && document.body){
      el=document.createElement('div');
      el.id='nnScrollBg';
      document.body.appendChild(el);
    }
    return el;
  }
  function heroMode(){ return document.documentElement.classList.contains('nn-bgmode-hero'); }
  function homeActive(){
    var h=document.getElementById('page-home');
    return !!(h && h.classList.contains('active'));
  }
  function keepOnTop(e){
    var nx=e.nextElementSibling;
    while(nx){
      if(nx.classList && nx.classList.contains('nn-bg-layer')){
        try{ e.parentNode.appendChild(e); }catch(x){}
        return;
      }
      nx=nx.nextElementSibling;
    }
  }
  function update(){
    raf=0;
    var e=ensure(); if(!e) return;
    /* 홈 화면 + 첫화면만 모드에서만 동작 — 다른 탭은 기존처럼 배경 고정 */
    var lit = heroMode() && homeActive();
    try{ document.documentElement.classList.toggle('nn-lightsurface', lit); }catch(x){}
    if(!lit){ e.style.setProperty('display','none','important'); return; }
    keepOnTop(e);
    var hero=document.querySelector('#page-home .hero');
    var start = hero ? (hero.offsetTop + hero.offsetHeight) : (window.innerHeight||800);
    var docH = Math.max(
      document.documentElement.scrollHeight || 0,
      document.body ? document.body.scrollHeight : 0
    );
    var h = docH - start;
    if(h < 0) h = 0;
    /* body>div{height:auto!important} 패치 방어 — 인라인 !important 로 치수 고정 */
    e.style.setProperty('display','block','important');
    e.style.setProperty('position','absolute','important');
    e.style.setProperty('left','0','important');
    e.style.setProperty('width','100%','important');
    e.style.setProperty('z-index','-1','important');
    e.style.setProperty('top', start + 'px', 'important');
    e.style.setProperty('height', h + 'px', 'important');
    e.style.setProperty('min-height', h + 'px', 'important');
    e.style.setProperty('max-height','none','important');
  }
  function onEvt(){ if(!raf) raf=requestAnimationFrame(update); }
  window.__bgScrollUpdate=update;
  function boot(){
    ensure(); update();
    window.addEventListener('scroll', onEvt, {passive:true});
    window.addEventListener('resize', onEvt, {passive:true});
    window.addEventListener('load', onEvt);
    /* 콘텐츠 높이 변화(위젯 로딩 등) 대응 */
    setInterval(update, 1500);
  }
  (function ready(){
    if(document.body){ boot(); return; }
    setTimeout(ready, 40);
  })();
})();

/* ══════════ 편집 툴바 고정 상태 감지 ══════════
   sticky로 위에 붙는 순간에만 그림자를 준다.
   붙지 않았을 때도 그림자가 있으면 공중에 뜬 것처럼 보여 어색하다. */
(function(){
  var raf = 0;
  function check(){
    raf = 0;
    document.querySelectorAll('.editor-toolbar.tb-sticky').forEach(function(tb){
      try{
        var cs = window.getComputedStyle(tb);
        var top = parseFloat(cs.top);
        if(!isFinite(top)) top = (window.innerWidth <= 760 ? 52 : 58);
        var stuck = tb.getBoundingClientRect().top <= top + 1;
        tb.classList.toggle('is-stuck', stuck);
      }catch(e){}
    });
  }
  function onScroll(){ if(!raf) raf = requestAnimationFrame(check); }
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll, {passive:true});
  setInterval(check, 900);   /* 편집 화면이 새로 그려질 때도 반영 */
})();

/* ══════════ 저장 공간 안전장치 ══════════
   localStorage.setItem 을 한 겹 감싸 다음을 보장한다.
   ① 한도 초과로 저장이 실패하면 사용자에게 반드시 알린다
      (기존 코드는 79곳 전부 try/catch로 실패를 조용히 삼키고 있었다)
   ② 80%를 넘기면 미리 경고해 백업·정리를 유도한다
   기존 호출부는 한 줄도 고치지 않는다. */
(function(){
  if(window.__nnStorageGuard) return;
  window.__nnStorageGuard = true;

  var LIMIT = 5*1024*1024;
  var WARN_AT = 0.80;
  var lastFail = 0, warnedThisSession = false;

  var raw;
  try{ raw = localStorage.setItem.bind(localStorage); }catch(e){ return; }

  function used(){
    var t=0;
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i); if(!k) continue;
        t += (k.length + (localStorage.getItem(k)||'').length) * 2;
      }
    }catch(e){}
    return t;
  }
  function fmt(b){ return b>=1048576 ? (b/1048576).toFixed(2)+'MB' : Math.round(b/1024)+'KB'; }

  function notifyFail(){
    var now = Date.now();
    if(now - lastFail < 8000) return;   /* 연속 실패 시 도배 방지 */
    lastFail = now;
    var msg = '저장 공간이 가득 차 기록이 저장되지 않았습니다 · 백업 후 정리해 주세요';
    if(window.__nnToast) window.__nnToast(msg, {kind:'del'});
    else { try{ alert(msg); }catch(e){} }
  }

  function maybeWarn(){
    if(warnedThisSession) return;
    var u = used();
    if(u < LIMIT*WARN_AT) return;
    warnedThisSession = true;
    if(window.__nnToast){
      window.__nnToast('저장 공간 ' + fmt(u) + ' / 5MB · 곧 가득 찹니다. 백업을 권합니다', {kind:'del'});
    }
  }

  var sinceCheck = 0;
  localStorage.setItem = function(k, v){
    try{
      raw(k, v);
    }catch(e){
      var quota = (e && (e.name==='QuotaExceededError'
                      || e.name==='NS_ERROR_DOM_QUOTA_REACHED'
                      || e.code===22 || e.code===1014));
      if(quota) notifyFail();
      throw e;   /* 기존 동작을 바꾸지 않도록 그대로 다시 던진다 */
    }
    /* 매번 전체를 재는 건 무거우므로 20회에 한 번만 점검 */
    if(++sinceCheck >= 20){ sinceCheck = 0; maybeWarn(); }
  };

  /* 진입 직후 한 번 점검 */
  setTimeout(maybeWarn, 3000);

  /* 수동 점검용 */
  window.__nnStorageCheck = function(){
    var u = used(), p = u/LIMIT*100;
    return { used:u, limit:LIMIT, pct:p, text:fmt(u)+' / 5MB',
             level:(p>=90?'danger':p>=WARN_AT*100?'warn':'ok') };
  };
})();

/* ══════════ 사용자 탭 — 추가 · 삭제 · 기본 탭 숨기기 ══════════ */
(function(){
  var TABS_KEY='nn_custom_tabs_v1', HIDE_KEY='nn_hidden_tabs_v1';
  var BUILTIN=[
    {k:'books',     lb:'BOOKS'},
    {k:'lexicon',   lb:'LEXICON'},
    {k:'media',     lb:'MEDIA'},
    {k:'economics', lb:'ECONOMICS'},
    {k:'thesis',    lb:'THESIS'}
  ];
  var PALETTE=[
    '#c9a96e','#d4b483','#e0a94a','#d99b5f','#c98f6b',
    '#e0709c','#d4779b','#c96f8a','#b5698f','#d48fa8',
    '#7fa8d4','#6f96c9','#5b8fd4','#8fb4e0','#7bc0d4',
    '#8fb98f','#6fb08a','#5cae94','#8fc9c9','#a3c98f',
    '#b28ad4','#9b8ad4','#8f9fd4','#a88fc9','#c98fd4',
    '#d49a7f','#c98a6f','#d4c98f','#b9b06f','#9ba8b5'
  ];

  function esc(x){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function loadTabs(){ try{ var a=JSON.parse(localStorage.getItem(TABS_KEY)); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
  function saveTabs(a){ try{ localStorage.setItem(TABS_KEY, JSON.stringify(a)); }catch(e){} }
  function loadHidden(){ try{ var a=JSON.parse(localStorage.getItem(HIDE_KEY)); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
  function saveHidden(a){ try{ localStorage.setItem(HIDE_KEY, JSON.stringify(a)); }catch(e){} }
  function KN(){ return window.KnowledgeNotes; }
  window.__nnCustomTabs=loadTabs;

  /* ── 페이지 DOM 생성 (기존 지식 탭과 동일한 구조) ── */
  function ensurePage(t){
    if(document.getElementById('page-'+t.id)) return;
    var host=document.getElementById('page-lexicon');
    if(!host || !host.parentNode) return;
    var d=document.createElement('div');
    d.className='page'; d.id='page-'+t.id;
    d.innerHTML=
      '<div style="padding:30px 2.5rem 4rem;max-width:1200px;margin:0 auto;position:relative">'
      + '<div class="ct-eyebrow" style="color:'+esc(t.color)+'">'+esc((t.name||'').toUpperCase())+'</div>'
      + '<h1 class="ct-title">'+esc(t.name||'새 탭')+'</h1>'
      + '<p class="ct-sub">My Own Archive</p>'
      + '<div class="cove-line" style="max-width:520px;margin-top:18px;margin-bottom:8px;background:linear-gradient(90deg,'+esc(t.color)+',transparent)"></div>'
      + '<p class="hold-desc">내가 직접 만든 기록 공간입니다.<br/>좌측에서 페이지를 추가해 자유롭게 정리하세요.</p>'
      + '<div class="editor-layout books-board" id="'+t.id+'-editor-layout">'
      +   '<div class="editor-sidebar"><div id="'+t.id+'-sidebar-list" class="editor-sidebar-list"></div></div>'
      +   '<div class="editor-main" id="'+t.id+'-editor-main">'
      +     '<button class="editor-back-btn" onclick="KnowledgeNotes.closeEditor(\''+t.id+'\')">← 목록으로</button>'
      +     '<div class="editor-placeholder">좌측 패널에서 페이지를 추가하거나<br/>기록해 둔 내용을 선택해 편집하세요.</div>'
      +   '</div>'
      + '</div></div>';
    host.parentNode.insertBefore(d, host.nextSibling);
    /* 저장소 자리 마련 */
    var k=KN();
    if(k){
      if(!k.data[t.id]) k.data[t.id]=[];
      if(k.groups && !k.groups[t.id]) k.groups[t.id]=[];
      if(k.activeIds && k.activeIds[t.id]===undefined) k.activeIds[t.id]=null;
    }
  }

  /* ── 네비 메뉴 다시 그리기 ── */
  function renderNav(){
    var dd=document.querySelector('.ng-knowledge .nav-dropdown');
    if(!dd) return;
    var hidden=loadHidden(), tabs=loadTabs();
    BUILTIN.forEach(function(b){
      var btn=dd.querySelector('#nav-'+b.k);
      if(btn) btn.style.display = hidden.indexOf(b.k)>=0 ? 'none' : '';
    });
    dd.querySelectorAll('.ct-navbtn').forEach(function(n){ n.remove(); });
    tabs.forEach(function(t){
      var b=document.createElement('button');
      b.className='nbtn ct-navbtn'; b.id='nav-'+t.id; b.type='button';
      b.innerHTML=esc((t.name||'').toUpperCase())+'<div class="sh"></div>';
      b.style.color=t.color;
      b.onclick=function(){ if(typeof switchPage==='function') switchPage(t.id); };
      dd.appendChild(b);
    });
    var mg=dd.querySelector('.ct-manage');
    if(!mg){
      mg=document.createElement('button');
      mg.className='nbtn ct-manage'; mg.type='button';
      mg.innerHTML='＋ 탭 관리<div class="sh"></div>';
      mg.onclick=function(e){ e.stopPropagation(); openManager(); };
      dd.appendChild(mg);
    } else { dd.appendChild(mg); }
  }

  function applyAll(){
    loadTabs().forEach(ensurePage);
    renderNav();
  }
  window.__nnTabsApply=applyAll;

  /* ── 관리 창 ── */
  function openManager(){
    var prev=document.getElementById('ctOv'); if(prev) prev.remove();
    var ov=document.createElement('div'); ov.id='ctOv'; ov.className='hub-modal-ov';
    ov.innerHTML='<div class="hub-modal ct-modal"><div class="hm-title">탭 관리</div>'
      +'<div class="ct-hint">내 기록 공간을 새로 만들거나, 쓰지 않는 기본 탭을 메뉴에서 숨길 수 있습니다.</div>'
      +'<div class="ct-body" id="ctBody"></div>'
      +'<div class="hm-btns"><button type="button" class="hm-btn hm-save" id="ctDone">완료</button></div></div>';
    document.body.appendChild(ov);
    var body=ov.querySelector('#ctBody');
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    ov.querySelector('#ctDone').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    ov.addEventListener('keydown', function(e){ if(e.key==='Escape'){ e.preventDefault(); close(); } });

    function paint(){
      var tabs=loadTabs(), hidden=loadHidden(), k=KN();
      var h='<div class="ct-sec"><div class="ct-sec-t">내가 만든 탭</div>';
      if(!tabs.length){
        h+='<div class="ct-empty">아직 없습니다. 아래에서 만들어 보세요.</div>';
      } else {
        h+=tabs.map(function(t,i){
          var n=(k && k.data[t.id]) ? k.data[t.id].length : 0;
          return '<div class="ct-row"><span class="ct-dot" style="background:'+esc(t.color)+'"></span>'
            +'<span class="ct-nm">'+esc(t.name)+'</span>'
            +'<span class="ct-n">'+n+'개</span>'
            +'<button type="button" class="ct-x" data-del="'+i+'">삭제</button></div>';
        }).join('');
      }
      h+='<button type="button" class="ct-add" id="ctAdd">＋ 새 탭 만들기</button></div>';

      h+='<div class="ct-sec"><div class="ct-sec-t">기본 탭 표시</div>';
      h+=BUILTIN.map(function(b){
        var off=hidden.indexOf(b.k)>=0;
        var n=(k && k.data[b.k]) ? k.data[b.k].length : 0;
        return '<div class="ct-row"><span class="ct-nm">'+b.lb+'</span>'
          +'<span class="ct-n">'+n+'개</span>'
          +'<button type="button" class="ct-toggle'+(off?'':' on')+'" data-hide="'+b.k+'">'
          +(off?'숨김':'표시')+'</button></div>';
      }).join('');
      h+='<div class="ct-note">숨겨도 기록은 그대로 남습니다. 언제든 다시 표시할 수 있어요.</div></div>';
      body.innerHTML=h;
      bind();
    }

    function bind(){
      var addB=body.querySelector('#ctAdd');
      if(addB) addB.onclick=function(){ openAdd(paint); };
      body.querySelectorAll('[data-del]').forEach(function(b){
        b.onclick=function(){
          var i=parseInt(b.getAttribute('data-del'),10);
          var tabs=loadTabs(), t=tabs[i]; if(!t) return;
          var k=KN(); var n=(k && k.data[t.id]) ? k.data[t.id].length : 0;
          var run=function(){
            var a=loadTabs(); a.splice(i,1); saveTabs(a);
            try{
              if(k){ delete k.data[t.id]; if(k.groups) delete k.groups[t.id]; k.save(); }
            }catch(e){}
            var pg=document.getElementById('page-'+t.id); if(pg) pg.remove();
            renderNav(); paint();
            if(window.__nnToast) window.__nnToast('"'+t.name+'" 탭을 삭제했습니다',{kind:'del'});
            if(document.querySelector('#page-'+t.id+'.active') && typeof switchPage==='function') switchPage('home');
          };
          if(window.__nnConfirm) window.__nnConfirm({
            title:'"'+t.name+'" 탭을 삭제할까요?',
            msg: n ? ('안에 기록된 '+n+'개의 페이지도 함께 지워집니다. 되돌릴 수 없습니다.') : '되돌릴 수 없습니다.',
            ok:'삭제', onOk:run
          });
          else run();
        };
      });
      body.querySelectorAll('[data-hide]').forEach(function(b){
        b.onclick=function(){
          var k2=b.getAttribute('data-hide');
          var hid=loadHidden(), i=hid.indexOf(k2);
          if(i>=0) hid.splice(i,1); else hid.push(k2);
          saveHidden(hid); renderNav(); paint();
          if(i<0 && document.querySelector('#page-'+k2+'.active') && typeof switchPage==='function') switchPage('home');
        };
      });
    }
    paint();
    requestAnimationFrame(function(){ ov.classList.add('show'); });
  }
  window.__nnTabManager=openManager;

  /* ── 새 탭 만들기 ── */
  function openAdd(after){
    var prev=document.getElementById('ctAddOv'); if(prev) prev.remove();
    var ov=document.createElement('div'); ov.id='ctAddOv'; ov.className='hub-modal-ov';
    ov.innerHTML='<div class="hub-modal ct-add-modal"><div class="hm-title">새 탭 만들기</div>'
      +'<label class="hm-lb">이름</label>'
      +'<input class="hm-in" id="ctName" placeholder="예: 아이디어 · 여행 기록" maxlength="14" autocomplete="off">'
      +'<label class="hm-lb" style="margin-top:14px">탭 색</label>'
      +'<div class="ct-colors" id="ctColors"></div>'
      +'<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      +'<button type="button" class="hm-btn hm-save">만들기</button></div></div>';
    document.body.appendChild(ov);
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    ov.querySelector('.hm-cancel').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };

    var pickedColor=PALETTE[0];
    var cb=ov.querySelector('#ctColors');
    cb.innerHTML=PALETTE.map(function(c,i){ return '<button type="button" class="ct-c'+(i===0?' sel':'')+'" data-c="'+c+'" style="background:'+c+'"></button>'; }).join('');
    cb.querySelectorAll('.ct-c').forEach(function(b){
      b.onclick=function(){ cb.querySelectorAll('.ct-c').forEach(function(o){ o.classList.remove('sel'); });
        b.classList.add('sel'); pickedColor=b.getAttribute('data-c'); };
    });

    ov.querySelector('.hm-save').onclick=function(){
      var nm=(ov.querySelector('#ctName').value||'').trim();
      if(!nm){ if(window.__nnToast) window.__nnToast('탭 이름을 입력해 주세요',{kind:'del'}); return; }
      var tabs=loadTabs();
      if(tabs.length>=8){ if(window.__nnToast) window.__nnToast('탭은 최대 8개까지 만들 수 있습니다',{kind:'del'}); return; }
      if(tabs.some(function(x){ return x.name===nm; })){ if(window.__nnToast) window.__nnToast('같은 이름의 탭이 이미 있습니다',{kind:'del'}); return; }
      var t={ id:'ct_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
              name:nm, color:pickedColor, createdAt:Date.now() };
      tabs.push(t); saveTabs(tabs);
      ensurePage(t); renderNav();
      try{ var k=KN(); if(k) k.save(); }catch(e){}
      close();
      if(after) after();
      if(window.__nnToast) window.__nnToast('✓ "'+nm+'" 탭을 만들었습니다');
    };
    requestAnimationFrame(function(){ ov.classList.add('show'); });
  }

  (function ready(){
    if(document.getElementById('page-lexicon') && window.KnowledgeNotes){ applyAll(); return; }
    if(document.body && document.readyState!=='loading'){ setTimeout(ready, 150); return; }
    setTimeout(ready, 120);
  })();
})();

/* ══════════ MACRO 연동 카드 — 필요할 때만 펼치기 ══════════ */
(function(){
  function boot(){
    var cards=document.querySelectorAll('.mp-card');
    if(!cards.length){ setTimeout(boot, 200); return; }
    cards.forEach(function(c){
      var face=c.querySelector('.mp-card-face');
      if(!face || face.__b) return;
      face.__b=1;
      face.onclick=function(){
        var wasOpen=c.classList.contains('open');
        document.querySelectorAll('.mp-card.open').forEach(function(o){ o.classList.remove('open'); });
        if(!wasOpen){
          c.classList.add('open');
          var inp=c.querySelector('.key-input');
          if(inp) setTimeout(function(){ try{ inp.focus(); }catch(e){} }, 220);
        }
      };
    });
    /* 아직 설정되지 않은 카드를 하나만 펼쳐 둔다 */
    var first=null;
    cards.forEach(function(c){
      var b=c.querySelector('.mp-c-badge');
      if(b && !/미입력/.test(b.textContent||'')) b.classList.add('on');
      if(!first && b && /미입력/.test(b.textContent||'')) first=c;
    });
    if(first) first.classList.add('open');
  }
  (function ready(){
    if(document.querySelector('.mp-card')){ boot(); return; }
    if(document.body && document.readyState!=='loading'){ boot(); return; }
    setTimeout(ready, 80);
  })();
})();

/* ══════════ 잘린 글자 자동 말풍선 ══════════
   말줄임(…)으로 잘린 요소에 마우스를 올리면 전체 내용을 보여준다.
   실제로 잘렸을 때만 뜨므로, 짧은 글에는 아무 일도 일어나지 않는다. */
(function(){
  var SEL = ['.note-group-name','.page-title-text','.bq-t','.mc-name','.mc-fund',
    '.news-title','.wl-name','.wl-sr-name','.sh-note b','.shv-toc-i','.sb-r-i b',
    '.po-lb','.ddm-txt b','.ddm-txt i','.ddi-t','.ddn-t','.ddn-s','.mc-ev-t',
    '.cmdk-t','.cmdk-sub','.tk-nm','.tk-sy','.mp-tick','.mp-name','.dvu-n',
    '.sb-biz','.intel-item-link','.nnd-pv-u','.media-link-ph span',
    '.thes-i-t','.page-item-title','.th-c-title','.mi-name','.rds-name','.rds-desc',
    '.fav-i-t','.ref-chip b','.comp-name'].join(',');

  var tip=null, hideT=0;
  function el(){
    if(tip && tip.parentNode) return tip;
    tip=document.createElement('div');
    tip.className='nn-eltip';
    document.body.appendChild(tip);
    return tip;
  }
  function isClipped(n){
    if(!n) return false;
    /* 가로 말줄임 또는 여러 줄 자르기(-webkit-line-clamp) 모두 감지 */
    return (n.scrollWidth - n.clientWidth > 1) || (n.scrollHeight - n.clientHeight > 1);
  }
  function show(n, forced){
    var txt=(forced || n.getAttribute('data-full') || n.textContent || '').trim();
    if(!txt) return;
    var t=el();
    t.textContent=txt;
    t.classList.add('show');
    var r=n.getBoundingClientRect();
    /* 먼저 그려서 크기를 잰 뒤 화면 안으로 밀어 넣는다 */
    t.style.left='0px'; t.style.top='-9999px';
    var w=t.offsetWidth, h=t.offsetHeight;
    var left=r.left + r.width/2 - w/2;
    left=Math.max(8, Math.min(left, window.innerWidth - w - 8));
    var top=r.bottom + 8;
    if(top + h > window.innerHeight - 8) top = r.top - h - 8;
    t.style.left=left+'px';
    t.style.top=Math.max(8, top)+'px';
  }
  function hide(){
    if(tip) tip.classList.remove('show');
  }
  document.addEventListener('mouseover', function(e){
    if(!e.target || !e.target.closest) return;
    /* 1) data-tip 이 붙은 요소는 설명을 그대로 보여준다 (툴바 버튼 등) */
    var tp=e.target.closest('[data-tip]');
    if(tp){
      clearTimeout(hideT);
      show(tp, tp.getAttribute('data-tip'));
      return;
    }
    /* 2) 말줄임으로 잘린 요소는 전체 내용을 보여준다 */
    var n=e.target.closest(SEL);
    if(!n){ return; }
    if(!isClipped(n)){ hide(); return; }
    clearTimeout(hideT);
    show(n);
  }, true);
  document.addEventListener('mouseout', function(e){
    if(!e.target || !e.target.closest) return;
    if(!e.target.closest('[data-tip]') && !e.target.closest(SEL)) return;
    clearTimeout(hideT);
    hideT=setTimeout(hide, 60);
  }, true);
  window.addEventListener('scroll', hide, {passive:true});
  window.addEventListener('resize', hide, {passive:true});
})();

/* ══════════ 네비 공유 버튼 ══════════ */
(function(){
  function boot(){
    var sb=document.getElementById('shareNavBtn');
    if(sb) sb.onclick=function(e){ e.stopPropagation(); if(window.__nnShareBulk) window.__nnShareBulk(); };
  }
  (function ready(){
    if(document.getElementById('shareNavBtn')){ boot(); return; }
    if(document.body && document.readyState!=='loading'){ boot(); return; }
    setTimeout(ready, 40);
  })();
})();

/* ══════════ 아카이브 공유 — 버튼 · 모달 · 읽기 전용 뷰어 ══════════ */
(function(){
  var MAP_KEY='nn_share_map_v1';   /* noteId → shareId */

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function loadMap(){ try{ var o=JSON.parse(localStorage.getItem(MAP_KEY)); return (o&&typeof o==='object')?o:{}; }catch(e){ return {}; } }
  function saveMap(o){ try{ localStorage.setItem(MAP_KEY, JSON.stringify(o)); }catch(e){} }
  function api(){ return window.__nnShareApi || null; }
  function linkFor(id){ return location.origin + location.pathname + '?share=' + id; }

  /* 공유 내용에서 편집 전용 요소 제거 */
  function sanitize(html){
    var d=document.createElement('div');
    d.innerHTML=String(html||'');
    d.querySelectorAll('script,style,iframe,object,embed').forEach(function(x){ x.remove(); });
    d.querySelectorAll('[contenteditable]').forEach(function(x){ x.setAttribute('contenteditable','false'); });
    d.querySelectorAll('[onclick],[onerror],[onload]').forEach(function(x){
      x.removeAttribute('onclick'); x.removeAttribute('onerror'); x.removeAttribute('onload');
    });
    d.querySelectorAll('a[href]').forEach(function(a){
      var h=(a.getAttribute('href')||'').trim();
      if(/^\s*(javascript|data):/i.test(h)) a.removeAttribute('href');
      else { a.setAttribute('target','_blank'); a.setAttribute('rel','noopener noreferrer'); }
    });
    return d.innerHTML;
  }

  /* ── 공유 모달 ── */
  function open(note, kindLabel){
    if(!note){ return; }
    var A=api();
    if(!A || !A.ready()){
      if(window.__nnToast) window.__nnToast('공유하려면 먼저 우측 상단에서 로그인해 주세요',{kind:'del'});
      return;
    }
    var prev=document.getElementById('shOv'); if(prev) prev.remove();
    var map=loadMap();
    var existing=map[note.id]||'';

    var ov=document.createElement('div'); ov.id='shOv'; ov.className='hub-modal-ov';
    ov.innerHTML='<div class="hub-modal sh-modal"><div class="hm-title">공유</div>'
      +'<div class="sh-note"><b>'+esc(note.title||'제목 없음')+'</b><i>'+esc(kindLabel||'')+'</i></div>'
      +'<div class="sh-body" id="shBody"></div></div>';
    document.body.appendChild(ov);
    var body=ov.querySelector('#shBody');

    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    ov.onclick=function(e){ if(e.target===ov) close(); };
    ov.addEventListener('keydown', function(e){ if(e.key==='Escape'){ e.preventDefault(); close(); } });

    function paintOff(){
      body.innerHTML='<div class="sh-state"><span class="sh-lock">🔒</span>'
        +'<div><b>나만 볼 수 있음</b><p>링크를 만들면 누구나 이 글을 읽을 수 있습니다. 편집은 불가능하고, 보기만 가능합니다.</p></div></div>'
        +'<div class="hm-btns"><button type="button" class="hm-btn hm-cancel" id="shClose">닫기</button>'
        +'<button type="button" class="hm-btn hm-save" id="shMake">🔗 공유 링크 만들기</button></div>';
      body.querySelector('#shClose').onclick=close;
      body.querySelector('#shMake').onclick=function(){ make(); };
    }
    function paintOn(id){
      var url=linkFor(id);
      body.innerHTML='<div class="sh-state on"><span class="sh-lock">🌐</span>'
        +'<div><b>링크가 있는 누구나 볼 수 있음</b><p>읽기 전용입니다. 링크를 아는 사람만 접근할 수 있어요.</p></div></div>'
        +'<div class="sh-linkrow"><input class="sh-link" id="shLink" readonly value="'+esc(url)+'">'
        +'<button type="button" class="sh-copy" id="shCopy">복사</button></div>'
        +'<div class="sh-actions"><button type="button" class="sh-sub" id="shOpen">↗ 새 탭에서 열기</button>'
        +'<button type="button" class="sh-sub" id="shUpdate">↻ 최신 내용으로 갱신</button></div>'
        +'<div class="hm-btns"><button type="button" class="hm-btn hm-cancel" id="shStop">공유 중지</button>'
        +'<button type="button" class="hm-btn hm-save" id="shDone">완료</button></div>';
      var inp=body.querySelector('#shLink');
      body.querySelector('#shCopy').onclick=function(){
        try{
          if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url);
          else { inp.select(); document.execCommand('copy'); }
          if(window.__nnToast) window.__nnToast('✓ 링크를 복사했습니다');
        }catch(e){ inp.select(); }
      };
      body.querySelector('#shOpen').onclick=function(){ window.open(url,'_blank','noopener'); };
      body.querySelector('#shUpdate').onclick=function(){ make(id, true); };
      body.querySelector('#shDone').onclick=close;
      body.querySelector('#shStop').onclick=function(){
        var run=function(){
          A.revoke(id).then(function(){
            var m=loadMap(); delete m[note.id]; saveMap(m);
            paintOff();
            if(window.__nnToast) window.__nnToast('공유를 중지했습니다',{kind:'del'});
          }).catch(function(err){
            if(window.__nnToast) window.__nnToast('중지 실패: '+((err&&err.message)||''),{kind:'del'});
          });
        };
        if(window.__nnConfirm) window.__nnConfirm({title:'공유를 중지할까요?', msg:'기존 링크로는 더 이상 열람할 수 없게 됩니다.', ok:'중지', onOk:run});
        else run();
      };
    }
    function paintBusy(msg){
      body.innerHTML='<div class="sh-busy">'+esc(msg||'처리 중...')+'</div>';
    }
    function make(id, isUpdate){
      paintBusy(isUpdate?'최신 내용으로 갱신하는 중...':'공유 링크를 만드는 중...');
      A.create({
        id: id||null,
        title: note.title||'제목 없음',
        content: sanitize(note.content),
        kind: kindLabel||'',
        meta: note.date||''
      }).then(function(newId){
        var m=loadMap(); m[note.id]=newId; saveMap(m);
        paintOn(newId);
        if(window.__nnToast) window.__nnToast(isUpdate?'✓ 최신 내용으로 갱신했습니다':'✓ 공유 링크를 만들었습니다');
      }).catch(function(err){
        var msg=(err&&err.message)||'';
        body.innerHTML='<div class="sh-err"><b>공유하지 못했습니다</b><p>'+esc(msg)+'</p>'
          +'<p class="sh-err-h">Firebase 콘솔에서 <code>shares</code> 컬렉션의 보안 규칙을 설정해야 할 수 있습니다.</p></div>'
          +'<div class="hm-btns"><button type="button" class="hm-btn hm-cancel" id="shClose2">닫기</button>'
          +'<button type="button" class="hm-btn hm-save" id="shRetry">다시 시도</button></div>';
        body.querySelector('#shClose2').onclick=close;
        body.querySelector('#shRetry').onclick=function(){ make(id, isUpdate); };
      });
    }

    if(existing) paintOn(existing); else paintOff();
    requestAnimationFrame(function(){ ov.classList.add('show'); });
  }
  window.__nnShareOpen=open;
  window.__nnIsShared=function(noteId){ if(!noteId) return false; return !!loadMap()[noteId]; };
  window.__nnSharedCount=function(){ return Object.keys(loadMap()).length; };


  /* ══════════ 일괄 공유 — 탭 전체 · 사이트 전체 ══════════ */
  var BULK_KEY='nn_share_bulk_v1';   /* scope → shareId */
  function loadBulk(){ try{ var o=JSON.parse(localStorage.getItem(BULK_KEY)); return (o&&typeof o==='object')?o:{}; }catch(e){ return {}; } }
  function saveBulk(o){ try{ localStorage.setItem(BULK_KEY, JSON.stringify(o)); }catch(e){} }

  var TABS=[
    {k:'books',     lb:'BOOKS · 독서 기록'},
    {k:'lexicon',   lb:'LEXICON · 용어 사전'},
    {k:'media',     lb:'MEDIA · 미디어 인사이트'},
    {k:'economics', lb:'ECONOMICS · 경제 지식'},
    {k:'thesis',    lb:'THESIS · 생각의 기록'}
  ];
  function KN(){ return window.KnowledgeNotes; }
  function groupName(type, gid){
    try{
      var g=(KN().groups && KN().groups[type])||[];
      var f=g.find(function(x){ return x.id===gid; });
      return f ? String(f.name||'') : '';
    }catch(e){ return ''; }
  }
  function collect(type){
    var k=KN(); if(!k || !k.data || !k.data[type]) return [];
    return k.data[type].map(function(n){
      return {
        title: String(n.title||'제목 없음').slice(0,300),
        content: sanitize(n.content),
        group: groupName(type, n.groupId),
        date: String(n.date||'')
      };
    });
  }
  function bytesOf(obj){
    try{ return new Blob([JSON.stringify(obj)]).size; }
    catch(e){ return JSON.stringify(obj).length; }
  }
  function fmtSize(b){
    if(b<1024) return b+'B';
    if(b<1024*1024) return (b/1024).toFixed(0)+'KB';
    return (b/1024/1024).toFixed(2)+'MB';
  }

  function openBulk(){
    var A=api();
    if(!A || !A.ready()){
      if(window.__nnToast) window.__nnToast('공유하려면 먼저 우측 상단에서 로그인해 주세요',{kind:'del'});
      return;
    }
    var prev=document.getElementById('sbOv'); if(prev) prev.remove();
    var ov=document.createElement('div'); ov.id='sbOv'; ov.className='hub-modal-ov';
    ov.innerHTML='<div class="hub-modal sb-modal"><div class="hm-title">모아서 공유</div>'
      +'<div class="sb-hint">여러 글을 하나의 링크로 묶어 공유합니다. 받는 사람은 목차에서 글을 골라 읽을 수 있어요.</div>'
      +'<div class="sb-body" id="sbBody"></div>'
      +'<div class="hm-btns"><button type="button" class="hm-btn hm-save" id="sbDone">완료</button></div></div>';
    document.body.appendChild(ov);
    var body=ov.querySelector('#sbBody');
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    ov.querySelector('#sbDone').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    ov.addEventListener('keydown', function(e){ if(e.key==='Escape'){ e.preventDefault(); close(); } });

    function paint(){
      var bulk=loadBulk();
      var rows=TABS.map(function(t){
        var n=collect(t.k).length;
        var sid=bulk[t.k]||'';
        return row(t.k, t.lb, n+'개의 글', sid, n===0);
      }).join('');
      var allN=0; TABS.forEach(function(t){ allN+=collect(t.k).length; });
      var sidAll=bulk['__all']||'';
      body.innerHTML='<div class="sb-grp-t">탭 전체</div>'+rows
        +'<div class="sb-grp-t" style="margin-top:14px">사이트 전체</div>'
        +row('__all', '📚 모든 아카이브', allN+'개의 글 · 5개 탭', sidAll, allN===0);
      bind();
    }
    function row(key, lb, sub, sid, empty){
      return '<div class="sb-row'+(sid?' on':'')+'" data-k="'+key+'">'
        +'<div class="sb-r-i"><b>'+esc(lb)+'</b><i>'+esc(sub)+'</i></div>'
        +(sid
          ? '<button type="button" class="sb-b copy" data-a="copy" data-k="'+key+'">링크 복사</button>'
            +'<button type="button" class="sb-b up" data-a="up" data-k="'+key+'" title="최신 내용으로 갱신">↻</button>'
            +'<button type="button" class="sb-b stop" data-a="stop" data-k="'+key+'" title="공유 중지">✕</button>'
          : '<button type="button" class="sb-b make" data-a="make" data-k="'+key+'"'+(empty?' disabled':'')+'>'+(empty?'글 없음':'링크 만들기')+'</button>')
        +'</div>';
    }
    function bind(){
      body.querySelectorAll('.sb-b').forEach(function(b){
        b.onclick=function(){
          var k=b.getAttribute('data-k'), a=b.getAttribute('data-a');
          if(a==='make') make(k, false);
          else if(a==='up') make(k, true);
          else if(a==='copy'){
            var url=linkFor(loadBulk()[k]);
            try{
              if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url);
              if(window.__nnToast) window.__nnToast('✓ 링크를 복사했습니다 · '+url.slice(0,46)+'…');
            }catch(e){}
          }
          else if(a==='stop'){
            var run=function(){
              api().revoke(loadBulk()[k]).then(function(){
                var m=loadBulk(); delete m[k]; saveBulk(m); paint();
                if(window.__nnToast) window.__nnToast('공유를 중지했습니다',{kind:'del'});
              }).catch(function(err){
                if(window.__nnToast) window.__nnToast('중지 실패: '+((err&&err.message)||''),{kind:'del'});
              });
            };
            if(window.__nnConfirm) window.__nnConfirm({title:'공유를 중지할까요?', msg:'기존 링크로는 더 이상 열람할 수 없게 됩니다.', ok:'중지', onOk:run});
            else run();
          }
        };
      });
    }
    function make(key, isUpdate){
      var pages=[], title='', kind='';
      if(key==='__all'){
        TABS.forEach(function(t){
          collect(t.k).forEach(function(pg){ pg.tab=t.lb.split(' · ')[0]; pages.push(pg); });
        });
        title='전체 아카이브'; kind='NEWNORMAL · 전체';
      } else {
        var t=TABS.find(function(x){ return x.k===key; });
        pages=collect(key);
        pages.forEach(function(pg){ pg.tab=t.lb.split(' · ')[0]; });
        title=t.lb.split(' · ')[1]||t.lb; kind=t.lb;
      }
      if(!pages.length){ if(window.__nnToast) window.__nnToast('공유할 글이 없습니다',{kind:'del'}); return; }

      var size=bytesOf(pages);
      if(size > 900000){
        if(window.__nnToast) window.__nnToast('내용이 너무 큽니다 ('+fmtSize(size)+') · 탭별로 나눠 공유해 주세요',{kind:'del'});
        return;
      }
      body.innerHTML='<div class="sh-busy">'+(isUpdate?'최신 내용으로 갱신하는 중':'링크를 만드는 중')+'... ('+pages.length+'개 · '+fmtSize(size)+')</div>';
      api().create({
        id: isUpdate ? loadBulk()[key] : null,
        title: title, kind: kind, pages: pages, meta: pages.length+'개의 글'
      }).then(function(id){
        var m=loadBulk(); m[key]=id; saveBulk(m); paint();
        if(window.__nnToast) window.__nnToast(isUpdate?'✓ 갱신했습니다':'✓ 공유 링크를 만들었습니다 ('+pages.length+'개)');
      }).catch(function(err){
        paint();
        if(window.__nnToast) window.__nnToast('공유 실패: '+((err&&err.message)||''),{kind:'del'});
      });
    }
    paint();
    requestAnimationFrame(function(){ ov.classList.add('show'); });
  }
  window.__nnShareBulk=openBulk;

  /* ── 읽기 전용 뷰어 (?share=xxx) ── */
  function viewerId(){
    try{
      var m=/[?&]share=([A-Za-z0-9_-]{4,64})/.exec(location.search||'');
      return m?m[1]:'';
    }catch(e){ return ''; }
  }
  function showViewer(id){
    var ov=document.createElement('div'); ov.id='shViewer'; ov.className='sh-viewer';
    ov.innerHTML='<div class="shv-inner"><div class="shv-load">아카이브를 불러오는 중...</div></div>';
    document.body.appendChild(ov);
    document.documentElement.style.overflow='hidden';

    function bail(msg){
      ov.querySelector('.shv-inner').innerHTML='<div class="shv-err"><div class="shv-e-i">🔗</div>'
        +'<b>'+esc(msg)+'</b><p>링크가 만료되었거나 공유가 중지되었을 수 있습니다.</p>'
        +'<button type="button" class="shv-home" id="shvHome">NEWNORMAL 둘러보기</button></div>';
      var hb=ov.querySelector('#shvHome');
      if(hb) hb.onclick=function(){ location.href=location.origin+location.pathname; };
    }
    function head(d){
      return '<div class="shv-head"><span class="shv-brand">NEWNORMAL</span>'
        +(d.kind?'<span class="shv-kind">'+esc(d.kind)+'</span>':'')
        +'<button type="button" class="shv-x" id="shvX" title="닫기">✕</button></div>';
    }
    function metaLine(d, extra){
      return '<div class="shv-meta">'+(d.author?esc(d.author)+'님의 아카이브':'공유된 아카이브')
        +(d.createdAt?' · '+esc(String(d.createdAt).slice(0,10).replace(/-/g,'.')):'')
        +(extra?' · '+esc(extra):'')+'</div>';
    }
    function foot(){
      return '<div class="shv-foot"><span>읽기 전용으로 공유된 문서입니다</span>'
        +'<button type="button" class="shv-home" id="shvHome2">NEWNORMAL 둘러보기</button></div>';
    }
    function wire(){
      var x=ov.querySelector('#shvX');
      if(x) x.onclick=function(){ location.href=location.origin+location.pathname; };
      var h2=ov.querySelector('#shvHome2');
      if(h2) h2.onclick=function(){ location.href=location.origin+location.pathname; };
    }
    function draw(d){
      if(d.pages && d.pages.length){ drawCollection(d); return; }
      ov.querySelector('.shv-inner').innerHTML=
        head(d)
        +'<h1 class="shv-title">'+esc(d.title||'제목 없음')+'</h1>'
        +metaLine(d)
        +'<div class="shv-body">'+sanitize(d.content)+'</div>'
        +foot();
      wire();
    }
    function drawCollection(d){
      var pages=d.pages;
      /* 탭 → 그룹 순으로 묶기 */
      var order=[], byKey={};
      pages.forEach(function(pg, i){
        var key=(pg.tab||'')+'||'+(pg.group||'');
        if(!byKey[key]){ byKey[key]={tab:pg.tab||'', group:pg.group||'', items:[]}; order.push(key); }
        byKey[key].items.push({i:i, title:pg.title||'제목 없음', date:pg.date||''});
      });
      var toc=order.map(function(key){
        var g=byKey[key];
        return '<div class="shv-toc-g"><div class="shv-toc-gt">'
          +(g.tab?'<span class="shv-toc-tab">'+esc(g.tab)+'</span>':'')
          +(g.group?esc(g.group):'')+'</div>'
          + g.items.map(function(it){
              return '<button type="button" class="shv-toc-i" data-i="'+it.i+'">'+esc(it.title)+'</button>';
            }).join('')
          +'</div>';
      }).join('');

      ov.querySelector('.shv-inner').innerHTML=
        head(d)
        +'<h1 class="shv-title">'+esc(d.title||'제목 없음')+'</h1>'
        +metaLine(d, pages.length+'개의 글')
        +'<div class="shv-col"><aside class="shv-toc">'+toc+'</aside>'
        +'<div class="shv-pane" id="shvPane"></div></div>'
        +foot();
      wire();

      function show(idx){
        var pg=pages[idx]; if(!pg) return;
        var pane=ov.querySelector('#shvPane');
        pane.innerHTML='<div class="shv-p-h">'
          +(pg.group?'<span class="shv-p-g">'+esc(pg.group)+'</span>':'')
          +'<h2>'+esc(pg.title||'제목 없음')+'</h2>'
          +(pg.date?'<span class="shv-p-d">'+esc(pg.date)+'</span>':'')+'</div>'
          +'<div class="shv-body">'+sanitize(pg.content)+'</div>';
        ov.querySelectorAll('.shv-toc-i').forEach(function(b){
          b.classList.toggle('on', parseInt(b.getAttribute('data-i'),10)===idx);
        });
        try{ pane.scrollTop=0; }catch(e){}
      }
      ov.querySelectorAll('.shv-toc-i').forEach(function(b){
        b.onclick=function(){ show(parseInt(b.getAttribute('data-i'),10)); };
      });
      show(0);
    }
    function tryFetch(tries){
      var A=api();
      if(!A){
        if(tries>60){ bail('연결하지 못했습니다'); return; }
        setTimeout(function(){ tryFetch(tries+1); }, 200);
        return;
      }
      A.fetch(id).then(function(d){
        if(!d) bail('문서를 찾을 수 없습니다');
        else draw(d);
      }).catch(function(){ bail('문서를 불러오지 못했습니다'); });
    }
    tryFetch(0);
  }

  var vid=viewerId();
  if(vid){
    (function boot(){
      if(document.body){ showViewer(vid); return; }
      setTimeout(boot, 30);
    })();
  }
})();

/* ══════════ 패널 투명도 조절 ══════════ */
(function(){
  var KEY='nn_panel_opacity_v1';

  /* sel: 대상 · rgb: 기존 배경 RGB · def: 기존 알파(디폴트) */
  var PANELS=[
    {g:'홈', k:'ddBrief',  lb:"TODAY'S BRIEFING", sel:'.dd-brief',        rgb:'0,0,0',    def:.55},
    {g:'홈', k:'ddCard',   lb:'퀵 글랜스 · D-DAY · 최근 노트', sel:'.dd-card', rgb:'0,0,0', def:.55},
    {g:'홈', k:'ddmItem',  lb:'퀵 글랜스 링크 버튼', sel:'.ddm-item',      rgb:'255,255,255', def:.035},
    {g:'홈', k:'hubSec',   lb:'레퍼런스 데스크',   sel:'.hub-section',     rgb:'0,0,0',    def:.55},
    {g:'홈', k:'cmpSec',   lb:'홀딩스 허브 무대',  sel:'.company-section', rgb:'0,0,0',    def:.55},
    {g:'MACRO', k:'mcCard', lb:'매크로 카드',      sel:'.macro-card',      rgb:'8,8,8',    def:.55},
    {g:'MACRO', k:'mcPanel',lb:'API 설정 패널',   sel:'.macro-panel',     rgb:'26,20,17', def:.55},
    {g:'MACRO', k:'mcGuide',lb:'상세 안내 패널',   sel:'.macro-keyguide',  rgb:'44,28,20', def:.55},
    {g:'ASSETS', k:'asCard',lb:'자산 카드',        sel:'.as-card',         rgb:'16,16,20', def:.55},
    {g:'THESIS', k:'thCard',lb:'글 카드',          sel:'.th-card',         rgb:'0,0,0',    def:.55},
    {g:'THESIS', k:'thTag', lb:'주제 패널',        sel:'.th-tagbox',       rgb:'0,0,0',    def:.55},
    {g:'PORTFOLIO', k:'holdItem', lb:'보유 종목 타일', sel:'.hold-item',   rgb:'30,22,40', def:.55},
    {g:'KNOWLEDGE', k:'edMain', lb:'노트 편집 패널', sel:'.editor-main',   rgb:'255,255,255', def:1},
    {g:'KNOWLEDGE', k:'edSide', lb:'노트 목록 패널', sel:'.editor-sidebar',rgb:'255,255,255', def:.015}
  ];

  function load(){
    try{ var s=localStorage.getItem(KEY); if(s){ var o=JSON.parse(s); if(o&&typeof o==='object') return o; } }catch(e){}
    return {};
  }
  function save(o){ try{ localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){} }
  function valOf(p, st){ var v=st[p.k]; return (typeof v==='number' && isFinite(v)) ? v : p.def; }

  function apply(){
    var st=load();
    var css='';
    PANELS.forEach(function(p){
      var v=valOf(p, st);
      if(Math.abs(v-p.def)<0.001) return;         /* 기본값이면 규칙 생략 */
      if(p.rgb==='grad'){
        var lo=Math.max(0, v-0.07);
        css+=p.sel+'{background:linear-gradient(155deg,rgba(28,20,16,'+v.toFixed(3)+'),rgba(18,14,12,'+lo.toFixed(3)+'))!important}\n';
      } else {
        css+=p.sel+'{background:rgba('+p.rgb+','+v.toFixed(3)+')!important}\n';
      }
    });
    var tag=document.getElementById('nnPanelOpacity');
    if(!tag){ tag=document.createElement('style'); tag.id='nnPanelOpacity'; document.head.appendChild(tag); }
    tag.textContent=css;
  }
  window.__panelOpacityApply=apply;

  function openModal(){
    var prev=document.getElementById('poOv'); if(prev) prev.remove();
    var st=load();
    var ov=document.createElement('div'); ov.id='poOv'; ov.className='hub-modal-ov';

    var groups=[];
    PANELS.forEach(function(p){
      var g=groups.find(function(x){ return x.name===p.g; });
      if(!g){ g={name:p.g, items:[]}; groups.push(g); }
      g.items.push(p);
    });

    var body=groups.map(function(g){
      return '<div class="po-grp"><div class="po-grp-t">'+g.name+'</div>'
        + g.items.map(function(p){
            var v=valOf(p, st);
            return '<div class="po-row" data-k="'+p.k+'">'
              +'<div class="po-r-h"><span class="po-lb">'+p.lb+'</span>'
              +'<span class="po-val">'+Math.round(v*100)+'%</span></div>'
              +'<input type="range" class="po-sl" min="0" max="100" step="1" value="'+Math.round(v*100)+'" data-k="'+p.k+'">'
              +'</div>';
          }).join('')
        + '</div>';
    }).join('');

    ov.innerHTML='<div class="hub-modal po-modal"><div class="hm-title">패널 투명도</div>'
      +'<div class="po-hint">숫자가 높을수록 패널이 진해지고, 낮을수록 뒤의 배경화면이 비쳐 보입니다.</div>'
      +'<div class="po-body">'+body+'</div>'
      +'<div class="hm-btns"><button type="button" class="hm-btn hm-cancel" id="poReset">전체 기본값</button>'
      +'<button type="button" class="hm-btn hm-save" id="poDone">완료</button></div></div>';
    document.body.appendChild(ov);

    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }

    ov.querySelectorAll('.po-sl').forEach(function(sl){
      sl.addEventListener('input', function(){
        var k=sl.getAttribute('data-k');
        var v=parseInt(sl.value,10)/100;
        var cur=load(); cur[k]=v; save(cur); apply();
        var row=sl.closest('.po-row'); if(row){ var vv=row.querySelector('.po-val'); if(vv) vv.textContent=sl.value+'%'; }
      });
    });
    var rs=ov.querySelector('#poReset');
    if(rs) rs.onclick=function(){
      save({}); apply();
      ov.querySelectorAll('.po-sl').forEach(function(sl){
        var p=PANELS.find(function(x){ return x.k===sl.getAttribute('data-k'); });
        if(!p) return;
        sl.value=Math.round(p.def*100);
        var row=sl.closest('.po-row'); if(row){ var vv=row.querySelector('.po-val'); if(vv) vv.textContent=sl.value+'%'; }
      });
      if(window.__nnToast) window.__nnToast('기본값으로 되돌렸습니다');
    };
    var dn=ov.querySelector('#poDone'); if(dn) dn.onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    ov.addEventListener('keydown', function(e){ if(e.key==='Escape'){ e.preventDefault(); close(); } });
    requestAnimationFrame(function(){ ov.classList.add('show'); });
  }
  window.__panelOpacityOpen=openModal;

  apply();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', apply);
})();

/* ══════════ QUICK GLANCE — 자주 보는 지표 바로가기 (편집·순서변경) ══════════ */
(function(){
  var KEY='nn_macrowatch_v1';
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* 기본 제공 목록 — TradingView 심볼로 바로 연결 */
  var DEFAULTS=[
    { name:'CNN 공포탐욕지수', sub:'Fear & Greed', ic:'😨', url:'https://edition.cnn.com/markets/fear-and-greed', ext:true },
    { name:'VIX 변동성지수', sub:'CBOE Volatility', ic:'📉', url:'https://www.tradingview.com/symbols/CBOE-VIX/' },
    { name:'미국 10년물 국채', sub:'US 10Y Yield', ic:'🏛️', url:'https://www.tradingview.com/symbols/TVC-US10Y/' },
    { name:'WTI 원유', sub:'Crude Oil', ic:'🛢️', url:'https://www.tradingview.com/symbols/TVC-USOIL/' },
    { name:'비트코인', sub:'BTC / USD', ic:'₿', url:'https://www.tradingview.com/symbols/BTCUSD/' }
  ];

  function load(){
    try{ var s=localStorage.getItem(KEY); if(s){ var a=JSON.parse(s); if(Array.isArray(a)) return a; } }catch(e){}
    return DEFAULTS.slice();
  }
  function save(a){ try{ localStorage.setItem(KEY, JSON.stringify(a)); }catch(e){} }

  var editing=false;

  var dragIdx=null;

  function render(){
    var host=document.getElementById('ddMacroList'); if(!host) return;
    var list=load();
    var html=list.map(function(x,i){
      var inner='<span class="ddm-ic">'+esc(x.ic||'📊')+'</span>'
        +'<span class="ddm-txt"><b>'+esc(x.name||'')+'</b>'+(x.sub?'<i>'+esc(x.sub)+'</i>':'')+'</span>'
        +'<span class="ddm-go">'+(x.ext?'↗':'→')+'</span>';
      if(editing){
        return '<div class="ddm-item ddm-edit" data-i="'+i+'" draggable="true">'
          +'<span class="ddm-grip" title="끌어서 순서 변경">⋮⋮</span>'+inner
          +'<button type="button" class="ddm-del" title="삭제" data-i="'+i+'">✕</button></div>';
      }
      return '<a class="ddm-item" href="'+esc(x.url||'#')+'" target="_blank" rel="noopener">'+inner+'</a>';
    }).join('');
    if(editing){
      html+='<button type="button" class="ddm-item ddm-add" id="ddmAddBtn"><span class="ddm-ic">＋</span>'
        +'<span class="ddm-txt"><b>지표 추가</b><i>TradingView·URL 링크</i></span></button>';
    }
    host.innerHTML=html;

    if(editing){
      host.querySelectorAll('.ddm-del').forEach(function(b){
        b.onclick=function(e){ e.stopPropagation(); e.preventDefault();
          var i=parseInt(b.getAttribute('data-i'),10);
          var a=load(); var gone=a[i];
          a.splice(i,1); save(a); render();
          if(window.__nnToast && gone) window.__nnToast('"'+(gone.name||'')+'" 삭제됨',{kind:'del',undo:function(){
            var b2=load(); b2.splice(Math.min(i,b2.length),0,gone); save(b2); render();
          }});
        };
      });
      var addB=host.querySelector('#ddmAddBtn');
      if(addB) addB.onclick=function(){ openAdd(); };
      bindDrag(host);
    }
  }

  /* ── 드래그로 순서 변경 ── */
  function bindDrag(host){
    var items=host.querySelectorAll('.ddm-edit');
    items.forEach(function(el){
      el.addEventListener('dragstart', function(e){
        dragIdx=parseInt(el.getAttribute('data-i'),10);
        el.classList.add('ddm-dragging');
        try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', String(dragIdx)); }catch(x){}
      });
      el.addEventListener('dragend', function(){
        el.classList.remove('ddm-dragging');
        host.querySelectorAll('.ddm-over').forEach(function(n){ n.classList.remove('ddm-over'); });
        dragIdx=null;
      });
      el.addEventListener('dragover', function(e){
        e.preventDefault();
        try{ e.dataTransfer.dropEffect='move'; }catch(x){}
        if(dragIdx===null) return;
        var t=parseInt(el.getAttribute('data-i'),10);
        if(t!==dragIdx) el.classList.add('ddm-over');
      });
      el.addEventListener('dragleave', function(){ el.classList.remove('ddm-over'); });
      el.addEventListener('drop', function(e){
        e.preventDefault(); e.stopPropagation();
        el.classList.remove('ddm-over');
        var to=parseInt(el.getAttribute('data-i'),10);
        var from=dragIdx;
        if(from===null || isNaN(to) || from===to) return;
        var a=load();
        if(from<0||from>=a.length||to<0||to>=a.length) return;
        var moved=a.splice(from,1)[0];
        a.splice(to,0,moved);
        save(a); dragIdx=null; render();
      });
    });
  }

  function openAdd(){
    var prev=document.getElementById('ddmModalOv'); if(prev) prev.remove();
    var ov=document.createElement('div');
    ov.id='ddmModalOv'; ov.className='hub-modal-ov';
    ov.innerHTML='<div class="hub-modal" style="width:380px">'
      +'<div class="hm-title">지표 추가</div>'
      +'<label class="hm-lb">이름</label>'
      +'<input class="hm-in" id="ddmName" placeholder="예: 나스닥 100" autocomplete="off">'
      +'<label class="hm-lb" style="margin-top:10px">부제 <span class="hm-hint">(선택)</span></label>'
      +'<input class="hm-in" id="ddmSub" placeholder="예: NASDAQ 100" autocomplete="off">'
      +'<label class="hm-lb" style="margin-top:10px">아이콘</label>'
      +'<div class="ddm-icrow"><button type="button" class="ddm-icbtn" id="ddmIcBtn">📊</button>'
      +'<span class="ddm-ichint">버튼을 눌러 이모지를 선택하세요</span></div>'
      +'<label class="hm-lb" style="margin-top:10px">링크 (URL)</label>'
      +'<input class="hm-in" id="ddmUrl" placeholder="https://www.tradingview.com/symbols/..." autocomplete="off" spellcheck="false">'
      +'<div class="ddm-hint">TradingView 심볼 페이지 주소나 아무 웹 링크나 넣을 수 있어요.</div>'
      +'<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      +'<button type="button" class="hm-btn hm-save">추가</button></div>'
      +'</div>';
    document.body.appendChild(ov);
    var nm=ov.querySelector('#ddmName'), sub=ov.querySelector('#ddmSub'),
        icBtn=ov.querySelector('#ddmIcBtn'), url=ov.querySelector('#ddmUrl');
    var pickedIc='📊';
    var ICONS=['📊','📈','📉','💹','🏛️','🛢️','₿','💵','💰','🥇','🥈','⚡','🔥','😨','😱','🌡️','🧭','🎯','🚨','🔔','🌍','🇺🇸','🇰🇷','🏦','📌','⭐','💎','🪙','📰','⏱️'];
    if(icBtn) icBtn.onclick=function(e){
      e.stopPropagation();
      var old=document.getElementById('ddmIcPop'); if(old){ old.remove(); return; }
      var pop=document.createElement('div'); pop.id='ddmIcPop'; pop.className='ddm-icpop';
      pop.onmousedown=function(ev){ ev.preventDefault(); };
      ICONS.forEach(function(em){
        var b=document.createElement('button'); b.type='button'; b.className='ddm-iccell'; b.textContent=em;
        b.onclick=function(ev){ ev.stopPropagation(); pickedIc=em; icBtn.textContent=em; pop.remove(); };
        pop.appendChild(b);
      });
      document.body.appendChild(pop);
      var r=icBtn.getBoundingClientRect();
      var w=pop.offsetWidth||230;
      pop.style.left=Math.max(8, Math.min(r.left, window.innerWidth-w-8))+'px';
      pop.style.top=(r.bottom+6)+'px';
      setTimeout(function(){
        document.addEventListener('click', function closer(ev){
          if(!ev.target.closest('#ddmIcPop') && ev.target!==icBtn){ pop.remove(); document.removeEventListener('click', closer, true); }
        }, true);
      },0);
    };
    function close(){ var ip=document.getElementById('ddmIcPop'); if(ip) ip.remove();
      ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    function norm(v){ v=String(v||'').trim(); if(!v) return ''; if(!/^https?:\/\//i.test(v) && !/^\//.test(v)) v='https://'+v; return v; }
    function done(){
      var u=norm(url.value);
      var n=(nm.value||'').trim();
      if(!n){ nm.focus(); return; }
      if(!u || /^\s*javascript:/i.test(url.value) || /^\s*data:/i.test(url.value)){ url.focus(); return; }
      var a=load();
      a.push({ name:n, sub:(sub.value||'').trim(), ic:pickedIc||'📊', url:u, ext:!/tradingview\.com/i.test(u) });
      save(a); close(); render();
      if(window.__nnToast) window.__nnToast('✓ "'+n+'" 지표를 추가했습니다');
    }
    ov.querySelector('.hm-cancel').onclick=close;
    ov.querySelector('.hm-save').onclick=done;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    ov.addEventListener('keydown', function(e){ if(e.key==='Escape'){ e.preventDefault(); close(); } if(e.key==='Enter'){ e.preventDefault(); done(); } });
    requestAnimationFrame(function(){ ov.classList.add('show'); nm.focus(); });
  }

  function boot(){
    var card=document.getElementById('ddMacroCard'); if(!card) return;
    var editBtn=document.getElementById('ddMacroEdit');
    if(editBtn) editBtn.onclick=function(){
      editing=!editing;
      editBtn.textContent = editing ? '✓ 완료' : '✎ 편집';
      editBtn.classList.toggle('on', editing);
      card.classList.toggle('ddm-editing', editing);
      render();
    };
    render();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ══════════ 저장 공간 사용량 · 이미지 URL 안전장치 (공용) ══════════ */
(function(){
  var LIMIT=5*1024*1024; /* 브라우저 localStorage 통상 한도 5MB */

  /* 사용량(바이트) 계산 — nn_ 키 전체 */
  function usedBytes(){
    var t=0;
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i); if(!k) continue;
        var v=localStorage.getItem(k)||'';
        t+=(k.length+v.length)*2; /* UTF-16 근사 */
      }
    }catch(e){}
    return t;
  }
  function fmtKB(b){ return b>=1048576 ? (b/1048576).toFixed(2)+'MB' : Math.round(b/1024)+'KB'; }
  window.__nnStorageInfo=function(){
    var u=usedBytes(), p=Math.min(100, u/LIMIT*100);
    return {used:u, limit:LIMIT, pct:p, text:fmtKB(u)+' / 5MB', level:(p>=90?'danger':p>=70?'warn':'ok')};
  };

  /* 사용량 바 렌더 (모든 .nn-storage-bar 요소) */
  window.__nnRenderStorage=function(){
    var info=window.__nnStorageInfo();
    document.querySelectorAll('.nn-storage-bar').forEach(function(el){
      var syncTxt='';
      try{
        var ls=parseInt(localStorage.getItem('nn_last_sync')||'0',10);
        if(ls){
          var sec=Math.floor((Date.now()-ls)/1000);
          var ago = sec<60?'방금':(sec<3600?Math.floor(sec/60)+'분 전':(sec<86400?Math.floor(sec/3600)+'시간 전':Math.floor(sec/86400)+'일 전'));
          syncTxt='<div class="nnsb-sync"><i></i>'+ago+' 클라우드 동기화됨</div>';
        }
      }catch(e){}
      el.innerHTML='<div class="nnsb-head"><span class="nnsb-lb">저장 공간</span>'
        +'<span class="nnsb-val nnsb-'+info.level+'">'+info.text+' ('+info.pct.toFixed(0)+'%)</span></div>'
        +'<div class="nnsb-track"><div class="nnsb-fill nnsb-'+info.level+'" style="width:'+info.pct.toFixed(1)+'%"></div></div>'
        +(info.level==='danger'?'<div class="nnsb-msg">⚠ 공간이 거의 찼습니다. 불필요한 항목을 정리하세요.</div>'
          :info.level==='warn'?'<div class="nnsb-msg">공간이 70%를 넘었습니다.</div>':'')
        +syncTxt;
    });
  };

  /* 이미지 URL 안전장치: base64 등 위험 입력 차단 */
  window.__nnCheckImgUrl=function(url,opt){
    opt=opt||{};
    var u=String(url||'').trim();
    if(!u) return {ok:true, url:''};
    if(/^data:/i.test(u)){
      var kb=Math.round(u.length/1024);
      if(window.__nnToast) window.__nnToast('⚠ 이미지를 직접 붙여넣으면 저장 공간('+kb+'KB)을 크게 차지해 데이터가 손실될 수 있어요. postimg.cc 등에 올린 뒤 "직접 링크"를 붙여넣어 주세요.',{kind:'del'});
      else alert('이미지 데이터(base64)는 저장 공간을 크게 차지해 사용할 수 없습니다.\npostimg.cc 등에 올린 뒤 직접 링크를 붙여넣어 주세요.');
      return {ok:false, url:''};
    }
    if(!/^https?:\/\//i.test(u) && !/^\//.test(u)){
      if(window.__nnToast) window.__nnToast('이미지 주소는 https:// 로 시작해야 합니다.',{kind:'del'});
      return {ok:false, url:u};
    }
    /* 남은 공간 경고 */
    var info=window.__nnStorageInfo();
    if(info.level==='danger' && window.__nnToast) window.__nnToast('⚠ 저장 공간이 '+info.pct.toFixed(0)+'% 찼습니다. 정리를 권장합니다.');
    return {ok:true, url:u};
  };

  /* 붙여넣기 감시: 모든 텍스트 입력칸에 base64 유입 차단 */
  document.addEventListener('paste', function(e){
    var t=e.target;
    if(!t || !(t.tagName==='INPUT' || t.tagName==='TEXTAREA')) return;
    var txt=''; try{ txt=(e.clipboardData||window.clipboardData).getData('text')||''; }catch(x){ return; }
    if(/^data:image\//i.test(txt.trim())){
      e.preventDefault();
      if(window.__nnToast) window.__nnToast('⚠ 이미지 데이터는 붙여넣을 수 없어요. postimg.cc 등에 올린 뒤 "직접 링크"를 붙여넣어 주세요.',{kind:'del'});
    }
  }, true);

  /* 저장 실패(한도 초과) 감지 — 조용한 데이터 손실 방지 */
  var _si=localStorage.setItem.bind(localStorage);
  try{
    localStorage.setItem=function(k,v){
      try{ return _si(k,v); }
      catch(err){
        if(window.__nnToast) window.__nnToast('⚠ 저장 실패 — 저장 공간이 가득 찼습니다. 항목을 정리한 뒤 다시 시도하세요.',{kind:'del'});
        throw err;
      }
    };
  }catch(e){}

  /* 주기적 갱신 */
  function boot(){ window.__nnRenderStorage(); setInterval(window.__nnRenderStorage, 20000); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ══ BOOT LAUNCHER ══ */
window.addEventListener('load', function(){
  runAnim();
  // fallback: 인트로가 어떤 이유로 안 돌아도 로고가 영영 숨겨지지 않도록 보장
  setTimeout(function(){
    var lwfb=document.querySelector('.logo-wrap'); if(lwfb) lwfb.classList.add('intro-shown');
  }, 4500);
  window.updateClock();
  setInterval(window.updateClock, 1000);

  /* ── 로고: NEWNORMAL → NN → HOME 루프 ── */
  (function(){
    var inner = document.getElementById('logo-inner');
    var home  = document.getElementById('logo-home');
    var word  = document.getElementById('nnWord');
    if(!inner || !home || !word) return;
    var letters = Array.prototype.slice.call(word.querySelectorAll('.ltr'));
    if(letters.length < 4) return;
    home.style.transform='translateY(-50%) translateY(7px)';
    var A = letters[0], B = letters[3];                       // 남는 두 N
    var fades = letters.filter(function(_,i){ return i!==0 && i!==3; }); // EWORMAL
    var timers = [];
    function T(ms, fn){ timers.push(setTimeout(fn, ms)); }
    function clearAll(){ timers.forEach(clearTimeout); timers = []; }

    function measure(){                                       // 둘째 N이 첫 N 오른쪽에 닿는 거리
      var prev = B.style.transition; B.style.transition = 'none';
      B.style.transform = 'translateX(0)';
      var aRight = A.offsetLeft + A.offsetWidth;
      var gap = letters[1].offsetLeft - (letters[0].offsetLeft + letters[0].offsetWidth);
      var dx = (aRight + Math.max(gap,0)) - B.offsetLeft;
      B.style.transition = prev;
      return dx;
    }
    function collapse(){                                      // EWORMAL 페이드아웃 + N 이동 (동시 시작·동시 종료 0.95s)
      var dx = measure();
      fades.forEach(function(l){ l.style.transition='opacity .95s ease'; l.style.opacity='0'; });
      B.style.transition='transform .95s cubic-bezier(.62,0,.2,1)';
      B.style.transform='translateX('+dx+'px)';
    }
    function toHome(){                                        // NN → HOME 크로스페이드 + 살짝 플로팅
      inner.style.transition='opacity .6s ease'; inner.style.opacity='0';
      home.style.transition='opacity .6s ease, transform .6s cubic-bezier(.34,1,.3,1)';
      home.style.opacity='1'; home.style.transform='translateY(-50%) translateY(0)'; home.style.pointerEvents='auto';
    }
    function toFull(){                                        // HOME → NEWNORMAL (가려진 상태에서 리셋 후, 블러 풀리며 아련하게 복귀)
      home.style.transition='opacity .6s ease, transform .5s ease'; home.style.opacity='0'; home.style.transform='translateY(-50%) translateY(7px)'; home.style.pointerEvents='none';
      fades.forEach(function(l){ l.style.transition='none'; l.style.opacity='1'; });
      B.style.transition='none'; B.style.transform='translateX(0)';
      // 가려진 상태에서 '아련한' 시작값 세팅
      inner.style.transition='none';
      inner.style.opacity='0'; inner.style.filter='blur(6px)'; inner.style.transform='translateY(1px) scale(1.022)';
      void word.offsetWidth;
      // 부드럽게 선명해지며 등장
      inner.style.transition='opacity .95s ease, filter 1.05s ease, transform 1.05s cubic-bezier(.22,1,.36,1)';
      requestAnimationFrame(function(){
        inner.style.opacity='1'; inner.style.filter='blur(0px)'; inner.style.transform='translateY(0) scale(1)';
      });
    }
    function cycle(){
      clearAll();
      T(6000, collapse);                        // 6초 정지 → 이동(0.95s)
      T(6000+950+3000, toHome);                 // NN 3초 → HOME
      T(6000+950+3000+600+2000, toFull);        // HOME 2초 → NEWNORMAL(아련)
      T(6000+950+3000+600+2000+950, cycle);     // 루프 (총 약 13.5초)
    }
    function start(){                                          // 폰트 로드 + 인트로(로고·탭) 페이드인 이후 시작
      var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      fontsReady.then(function(){
        var lw = document.querySelector('.logo-wrap'); var tries = 0;
        (function waitIntro(){
          if((lw && lw.classList.contains('intro-shown')) || tries > 80){
            setTimeout(cycle, 800);            // 페이드인(.7s) 완료 후 시작
          } else { tries++; setTimeout(waitIntro, 200); }
        })();
      });
    }
    start();
  })();
  runParallax();
  window.KnowledgeNotes.init();

  /* ── 스크롤 리빌 (부드러운 플로팅 페이드인) ── */
  (function(){
    var els = document.querySelectorAll('.reveal-up');
    if(!els.length) return;
    if(!('IntersectionObserver' in window)){
      els.forEach(function(el){ el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          var el = entry.target;
          // 같은 그룹 내 순서에 따라 약간씩 지연 (stagger)
          var delay = parseFloat(el.dataset.revealDelay || 0);
          el.style.transitionDelay = delay + 'ms';
          el.classList.add('is-visible');
          io.unobserve(el);
          // 카드: 떠오름(transform) 완전히 끝난 뒤에야 패럴랙스 허용
          if(el.classList.contains('comp-card')){
            el.addEventListener('transitionend', function(ev){
              if(ev.propertyName === 'transform'){ el.classList.add('reveal-done'); }
            }, { once:true });
            // 안전장치: transition이 안 끝나도 일정 시간 후 강제 허용
            setTimeout(function(){ el.classList.add('reveal-done'); }, delay + 1600);
          }
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 5% 0px' });

    // 카드 그룹은 순차 지연 부여
    var cards = document.querySelectorAll('.company-grid .comp-card.reveal-up');
    // 2열 그리드: 같은 줄 좌우는 거의 동시에, 줄이 바뀔 때만 약간 지연 (누적 방지)
    cards.forEach(function(c,i){
      var col = i % 2;               // 0=왼쪽, 1=오른쪽
      c.dataset.revealDelay = (col*70); // 줄마다 0 또는 70ms만 — 줄 간 누적 없음
    });
    var lanes = document.querySelectorAll('.ref-lane.reveal-up');
    lanes.forEach(function(l,i){ l.dataset.revealDelay = (i*110); });

    els.forEach(function(el){ io.observe(el); });
  })();
});

})();
