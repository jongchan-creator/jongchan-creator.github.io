/* ══════════════════════════════════════════════════════════════════
   NEWNORMAL — 화면 다듬기 (nn-polish.js)   2026-11 신설

   nn-style.css 는 규칙 순서를 바꿀 수 없으므로(같은 선택자가 100곳 넘게 겹친다)
   새로 얹는 다듬기는 이 파일이 <style> 로 주입한다.

   ① 상단 메뉴 띠 (개선제안 V-1)
      메뉴 띠는 일부러 투명하게 만든 것이다(nn-style.css 1011행). 맨 위에서는 그대로 둔다.
      다만 스크롤하면 본문 글자가 메뉴 글자 밑으로 지나가며 겹치고,
      홈의 밝은 구간에서는 흰 글자·흰 테두리(검색·LOGIN)가 흰 바탕에 묻혀 안 보였다.
        html.nn-nav-solid   20px 넘게 내렸을 때 — 메뉴 띠 뒤에 바탕막이 깔린다
        html.nn-nav-light   메뉴 띠 아래가 밝은 바탕(#nnScrollBg)일 때 — 막은 밝게, 글자는 어둡게
      판단은 스크롤·크기 변경·탭 전환·배경 방식 변경 때 한다.
      2026-11-23 바탕막: 띠 자체가 아니라 띠 뒤의 막(.nav::before)에 그린다.
        · 위는 짙고 아래 끝으로 갈수록 투명해진다(아래 경계가 칼같이 잘리지 않는다)
        · 나타나고 사라질 때 투명도로 0.55초 동안 천천히 바뀐다
          (예전에는 그라데이션 바탕을 띠에 바로 넣어서 전환 효과가 먹지 않고 툭 바뀌었다)

   ② 키보드 초점 표시 (V-10)
      Tab 키로 옮겨 다닐 때만 금색 테두리가 보인다(:focus-visible).
      마우스로 누를 때와 글 입력 칸은 건드리지 않는다 — 입력 칸은 각자 디자인한 표시가 있다.

   ⑦ 책 보드 높이 (V-4) — 아래 CSS 의 설명 참고

   ③ 닫힌 서랍의 그림자 (F-3)
      INTEL 서랍(#intelDrawer)은 닫혀 있을 때 화면 오른쪽 밖 20px 지점에 있는데,
      그림자가 왼쪽으로 45px 번져서 밝은 바탕에서는 화면 오른쪽 끝이 회색 띠로 보였다.
      닫혀 있을 때는 그림자를 끄고 보이지 않게 한다.

   로딩 순서: … → nn-lookup.js → nn-polish.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__nnPolish) return;
  window.__nnPolish = true;

  var CSS = [
  /* ── ① 메뉴 띠 ── */
  /* 바탕막: 띠보다 30px 더 내려와 그 구간에서 투명하게 사라진다. 흐림(blur)도 같은 모양으로 옅어진다 */
  'html .nav::before{content:"";position:absolute;left:0;right:0;top:0;bottom:-30px;z-index:-1;pointer-events:none;',
  '  background:rgba(7,7,9,.84);',
  '  -webkit-backdrop-filter:blur(12px) saturate(1.12);backdrop-filter:blur(12px) saturate(1.12);',
  '  -webkit-mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 44px),rgba(0,0,0,.55) calc(100% - 24px),transparent 100%);',
  '  mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 44px),rgba(0,0,0,.55) calc(100% - 24px),transparent 100%);',
  '  opacity:0;transition:opacity .55s cubic-bezier(.22,1,.36,1),background-color .4s ease}',
  'html.nn-nav-solid .nav::before{opacity:1}',
  /* 밝은 바탕 위 — 막도 밝게, 글자는 어둡게 */
  'html.nn-nav-light .nav::before{background:rgba(251,250,247,.9)}',
  '@media (prefers-reduced-motion:reduce){html .nav::before{transition:none}}',
  /* 드롭다운 안의 버튼은 어두운 판 위에 있으므로 제외 — 띠에 직접 놓인 것만 */
  'html.nn-nav-light .nav .nav-links > .nbtn,',
  'html.nn-nav-light .nav .nav-links > .nav-group > .nbtn.nav-trigger{color:#2b2823!important;text-shadow:none!important}',
  'html.nn-nav-light .nav .nav-links > .nbtn:hover,',
  'html.nn-nav-light .nav .nav-links > .nav-group:hover > .nbtn.nav-trigger,',
  'html.nn-nav-light .nav .nav-links > .nbtn.active,',
  'html.nn-nav-light .nav .nav-links > .nav-group > .nbtn.nav-trigger.active{color:#14120f!important;text-shadow:none!important}',
  'html.nn-nav-light .nav #bgSwitchBtn,html.nn-nav-light .nav #bgSwitchBtn .bgn-txt{color:#8a6a24!important;text-shadow:none!important}',
  'html.nn-nav-light .nav .sep{background:rgba(20,18,15,.22)!important}',
  'html.nn-nav-light .nav .nav-search{color:#3d3a33!important;background:rgba(20,18,15,.05)!important;border-color:rgba(20,18,15,.24)!important}',
  'html.nn-nav-light .nav .nav-search:hover{color:#14120f!important;border-color:rgba(20,18,15,.45)!important}',
  'html.nn-nav-light .nav .wbtn{color:#14120f!important;background:rgba(20,18,15,.04)!important;border-color:rgba(20,18,15,.42)!important;text-shadow:none!important}',
  'html.nn-nav-light .nav .nn-word .ltr{',
  '  background:linear-gradient(162deg,#14120f 0%,#14120f 30%,#3d3a33 50%,#6b665b 63%,#2b2823 80%,#14120f 100%)!important;',
  '  -webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;filter:none!important}',
  'html.nn-nav-light .nav #logo-home{color:#14120f!important;text-shadow:none!important}',
  /* 밝은 바탕의 홈에서는 드롭다운 판을 더 짙게 — 원래 55% 투명이라 흰 바탕 위에서 뒤 글자가 비쳐 겹쳐 보였다 */
  'html.nn-lightsurface:not(.nn-bgscroll-dark) .nav .nav-dropdown{background:rgba(14,14,17,.95)!important}',
  /* 휴대폰의 검색·메뉴 버튼 */
  'html.nn-nav-light #nnMnavCtrls button{color:#2b2823!important;background:rgba(20,18,15,.05)!important;border-color:rgba(20,18,15,.26)!important}',

  /* ── ② 키보드 초점 ── */
  'button:focus-visible,a:focus-visible,summary:focus-visible,select:focus-visible,[role="button"]:focus-visible,',
  '[tabindex]:not([tabindex="-1"]):not([contenteditable]):focus-visible,',
  'input[type="checkbox"]:focus-visible,input[type="radio"]:focus-visible,input[type="range"]:focus-visible,input[type="file"]:focus-visible{',
  '  outline:2px solid #e8c47e!important;outline-offset:2px!important}',
  'html.nn-nav-light .nav button:focus-visible{outline-color:#8a6a24!important}',

  /* ── ③ 닫힌 INTEL 서랍 ── */
  '#intelDrawer.intel-drawer:not(.open){box-shadow:none!important;visibility:hidden;',
  '  transition:transform .45s cubic-bezier(.16,1,.3,1),visibility 0s linear .45s!important}',
  '#intelDrawer.intel-drawer.open{visibility:visible;',
  '  transition:transform .45s cubic-bezier(.16,1,.3,1),visibility 0s!important}',

  /* ── ④ MACRO 연결 설정 카드 — 연결이 끝난 뒤에는 한 줄로 (개선제안 V-2 중 회장님이 고른 부분) ── */
  '#page-macro .macro-panel.mp-min:not(.mp-min-open) .mp-cards,',
  '#page-macro .macro-panel.mp-min:not(.mp-min-open) .mp-guides{display:none!important}',
  '#page-macro .macro-panel.mp-min:before{content:"SETUP \\00B7  연결 완료"!important}',
  '#mpMini{display:flex;align-items:center;gap:8px 20px;flex-wrap:wrap;margin-top:14px;',
  '  font-family:\'Pretendard\',\'Noto Sans KR\',sans-serif;font-size:12.5px;font-weight:600;color:rgba(240,237,230,.88)}',
  '#page-macro .macro-panel.mp-min.mp-min-open #mpMini{margin-bottom:16px}',
  '#mpMini .mm-it{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}',
  '#mpMini .mm-it i{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 7px rgba(74,222,128,.85);flex:none}',
  '#mpMini .mm-tg{margin-left:auto;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:#ff8a2a;',
  '  background:transparent;border:1px solid rgba(255,138,42,.45);border-radius:999px;padding:6px 14px;transition:background-color .18s,border-color .18s}',
  '#mpMini .mm-tg:hover{background:rgba(255,138,42,.12);border-color:rgba(255,138,42,.8)}',
  'html.nn-lightsurface:not(.nn-bgscroll-dark) #mpMini{color:#2b2823}',

  /* 검색창이 닫히며 흐려지는 0.18초 동안에도 목록이 눌려서, Esc 직후의 클릭이 엉뚱한 기록을 열 수 있었다 */
  '#cmdkOv:not(.show){pointer-events:none}',

  /* ── ⑤ 휴대폰의 ASSETS 메뉴 (개선제안 M-1) ──
     예전: 메뉴 버튼 15개가 두 줄씩 쌓여 519px 를 차지하고, 내용은 그 아래 1,107px 에서 시작했다.
           버튼을 눌러도 화면 밖에서 내용이 바뀌어 아무 일도 안 일어난 것처럼 보였다.
     지금: 옆으로 미는 칩 한 줄. 누르면 내용이 바로 아래에 보이도록 스크롤한다(아래 JS). */
  '@media (max-width:900px){',
  '  #page-assets .as-side{padding-bottom:10px!important;margin-bottom:12px!important}',
  '  #page-assets .as-nav{flex-direction:row!important;flex-wrap:nowrap!important;overflow-x:auto;overflow-y:hidden;gap:6px!important;',
  '    margin:0 -2px;padding:2px 2px 8px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:none;',
  '    -webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}',
  '  #page-assets .as-nav::-webkit-scrollbar{display:none}',
  '  #page-assets .as-navgrp{display:none!important}',
  '  #page-assets .as-navbtn{flex:0 0 auto!important;width:auto!important;white-space:nowrap;padding:9px 13px!important;font-size:13px!important;gap:7px!important;scroll-snap-align:start}',
  '  #page-assets .as-side-foot{flex-direction:row!important;flex-wrap:wrap;align-items:flex-end;gap:10px!important;margin-top:8px!important;padding-top:10px!important}',
  '  #page-assets .as-side-foot .as-fx{flex:1 1 200px}',
  '  #page-assets .as-side-foot .as-privacy{flex:1 1 100%;font-size:11px}',
  '}',

  /* ── ⑥ 누르기 쉬운 삭제 버튼 (개선제안 M-2) ──
     보이는 크기는 그대로 두고, 누르는 영역만 투명하게 넓힌다(::after). 실측: 9×11 · 11×20 · 12×14 · 17×13px → 26px 이상, 손가락 화면은 34px. */
  '.as-chip-x,.as-rowdel,.page-del-btn,.lex-del,.lex-mem,.th-cdel,.note-group-del,.apt-fav-x{position:relative}',
  '.as-chip-x::after,.as-rowdel::after,.hold-del::after,.page-del-btn::after,.ddi-del::after,.lex-del::after,.lex-mem::after,.media-del::after,.th-cdel::after,.note-group-del::after,.apt-fav-x::after{',
  '  content:"";position:absolute;left:50%;top:50%;width:max(100%,26px);height:max(100%,26px);transform:translate(-50%,-50%);border-radius:50%}',
  '@media (hover:none),(pointer:coarse){',
  '  .as-chip-x::after,.as-rowdel::after,.hold-del::after,.page-del-btn::after,.ddi-del::after,.lex-del::after,.lex-mem::after,.media-del::after,.th-cdel::after,.note-group-del::after,.apt-fav-x::after{width:max(100%,34px);height:max(100%,34px)}',
  /* 손가락 화면에는 마우스를 올릴 수 없으니, 숨어 있던 삭제 버튼을 옅게 보여 준다 (보이지 않는 버튼을 실수로 누르지 않게) */
  '  .page-del-btn,.ddi-del{opacity:.55!important}',
  '}',

  /* ── ⑦ 책 보드 높이 (개선제안 V-4) ──
     예전: 세 칸이 책 수와 상관없이 1,100px 흰 기둥이라, 책이 몇 권일 때 아래 절반 이상이 빈 흰 면이었다.
     지금: 가장 긴 칸에 맞춰 세 칸이 같은 높이(최소 520px · 최대 1,100px — 넘치면 칸 안에서 스크롤).
     휴대폰(900px 이하)은 nn-style.css 의 원래 규칙을 그대로 쓴다. 단어 보드는 nn-srs.js 가 같은 방식으로 맞춘다. */
  '@media (min-width:901px){',
  '  #books-editor-layout:not(.editing){height:auto!important;max-height:none!important}',
  '  #books-editor-layout:not(.editing) .editor-sidebar{height:auto!important;max-height:none!important;overflow:visible!important}',
  '  #books-editor-layout:not(.editing) .editor-sidebar-list{height:auto!important;max-height:none!important;align-items:stretch!important}',
  '  #books-editor-layout:not(.editing) .editor-sidebar-list > .note-group{height:auto!important;min-height:520px!important;max-height:1100px!important}',
  '  #books-editor-layout:not(.editing) .nnsb-side{display:none!important}',
  '}',
  '#books-editor-layout:not(.editing) .editor-sidebar-list > .note-group > .note-group-body{min-height:0!important}',

  '@media (prefers-reduced-motion: reduce){.nav{transition:none}}'
  ].join('\n');

  function injectCss(){
    if (document.getElementById('nnPolishCss')) return;
    var st = document.createElement('style');
    st.id = 'nnPolishCss';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── 메뉴 띠 상태 판단 ── */
  var raf = 0;
  function isLightUnderNav(){
    var root = document.documentElement;
    if (!root.classList.contains('nn-lightsurface') || root.classList.contains('nn-bgscroll-dark')) return false;
    var bg = document.getElementById('nnScrollBg');
    if (!bg) return false;
    var cs;
    try { cs = getComputedStyle(bg); } catch(e) { return false; }
    if (cs.display === 'none') return false;
    /* 바탕색이 실제로 밝은지 확인 (어두운 단색 바탕으로 바꿔 쓰는 경우 대비) */
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(cs.backgroundColor || '');
    if (!m || (+m[1] + +m[2] + +m[3]) < 540) return false;
    var nav = document.querySelector('.nav');
    var mid = nav ? nav.getBoundingClientRect().height / 2 : 26;
    var r = bg.getBoundingClientRect();
    return r.top <= mid && r.bottom > mid;
  }
  function update(){
    raf = 0;
    var root = document.documentElement;
    var y = window.pageYOffset || root.scrollTop || 0;
    var light = isLightUnderNav();
    root.classList.toggle('nn-nav-solid', y > 20);
    root.classList.toggle('nn-nav-light', light && y > 20);
  }
  function onEvt(){ if (!raf) raf = requestAnimationFrame(update); }

  function wrapSwitch(){
    var orig = window.switchPage;
    if (typeof orig !== 'function' || orig.__polishWrapped) return false;
    var w = function(){
      var r = orig.apply(this, arguments);
      onEvt(); setTimeout(update, 60); setTimeout(update, 400);
      if (arguments[0] === 'macro') macroMiniSoon();
      if (arguments[0] === 'assets' || arguments[0] === 'portfolio') setTimeout(function(){ assetsChip(false); }, 200);
      return r;
    };
    w.__polishWrapped = true;
    /* 다른 모듈이 붙여 둔 표시를 잃지 않게 옮겨 준다 */
    try { Object.keys(orig).forEach(function(k){ if (!(k in w)) w[k] = orig[k]; }); } catch(e) {}
    window.switchPage = w;
    return true;
  }

  /* ── 글자 없는 아이콘 버튼에 이름표 (화면 낭독기용) ── */
  function labelIcons(){
    [['shareNavBtn','공유'], ['macroRefresh','시세 새로고침'], ['asFxFetch','실시간 환율 불러오기']].forEach(function(p){
      var el = document.getElementById(p[0]);
      if (el && !el.getAttribute('aria-label')) el.setAttribute('aria-label', p[1]);
    });
  }

  /* 클라우드에서 새 내용을 받아 새로고침한 직후 — 보던 탭으로 돌아간다.
     (동기화 블록이 새로고침 직전에 sessionStorage 'nn_return_page' 에 적어 둔다.
      주소에 현재 위치를 적는 기능(S-1)이 들어오면 이 부분은 그쪽이 맡는다) */
  function returnToPlace(){
    var name = '';
    try { name = sessionStorage.getItem('nn_return_page') || ''; sessionStorage.removeItem('nn_return_page'); } catch(e) {}
    if (!name || !/^[A-Za-z0-9_-]+$/.test(name)) return;
    if (typeof window.switchPage !== 'function') return;
    if (!document.getElementById('page-' + name) && name !== 'notes' && name !== 'portfolio') return;
    try { window.switchPage(name); } catch(e) {}
  }

  /* ── ④ MACRO 연결 설정 카드 한 줄로 ──
     시세 키와 프록시가 둘 다 '적용됨'이면 카드 두 장과 안내 두 줄을 접고 한 줄만 남긴다.
     "설정 열기"를 누르면 예전 모습 그대로 펼쳐진다. 하나라도 비어 있으면 손대지 않는다(처음 온 사람은 설정부터 봐야 한다).
     머리말(제목·설명)은 건드리지 않는다. */
  function macroMini(){
    var panel = document.querySelector('#page-macro .macro-panel');
    if (!panel) return;
    var ok = function(id){ var b = document.getElementById(id); return !!(b && /(^|\s)ok(\s|$)/.test(b.className)); };
    var both = ok('fmpKeyBadge') && ok('workerBadge');
    var bar = document.getElementById('mpMini');
    if (!both){
      panel.classList.remove('mp-min', 'mp-min-open');
      if (bar) bar.remove();
      return;
    }
    if (!bar){
      bar = document.createElement('div');
      bar.id = 'mpMini';
      bar.innerHTML = '<span class="mm-it"><i></i>글로벌 시세 연결됨</span>'
                    + '<span class="mm-it"><i></i>국내 지수 · 뉴스 연결됨</span>'
                    + '<button type="button" class="mm-tg" aria-expanded="false">설정 열기 ▾</button>';
      var top = panel.querySelector('.mp-top');
      if (top && top.nextSibling) panel.insertBefore(bar, top.nextSibling); else panel.appendChild(bar);
      bar.querySelector('.mm-tg').addEventListener('click', function(e){
        e.stopPropagation();
        var open = panel.classList.toggle('mp-min-open');
        this.textContent = open ? '설정 접기 ▴' : '설정 열기 ▾';
        this.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    panel.classList.add('mp-min');
  }
  function macroMiniSoon(){ setTimeout(macroMini, 250); setTimeout(macroMini, 1500); }

  /* ── ⑤ 휴대폰의 ASSETS 메뉴: 누르면 내용이 보이게 ── */
  function navH(){ var n = document.querySelector('.nav'); return n ? n.getBoundingClientRect().height : 56; }
  function assetsChip(scrollPage){
    if (!window.matchMedia || !matchMedia('(max-width:900px)').matches) return;
    var nav = document.getElementById('asNav'); if (!nav) return;
    var on = nav.querySelector('.as-navbtn.active');
    var pg = document.getElementById('page-assets');
    if (pg && pg.classList.contains('as-holding')) on = nav.querySelector('.as-navbtn[data-sec="holdings"]') || on;
    if (on){
      var left = on.offsetLeft - 16;
      try { nav.scrollTo({ left: Math.max(0, left), behavior: 'smooth' }); } catch(e) { nav.scrollLeft = Math.max(0, left); }
    }
    if (!scrollPage) return;
    var side = pg && pg.querySelector('.as-side');
    if (!side) return;
    var top = side.getBoundingClientRect().top + (window.pageYOffset || 0) - navH() - 8;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' }); } catch(e) { window.scrollTo(0, Math.max(0, top)); }
  }

  function boot(){
    injectCss();
    wrapSwitch();
    labelIcons();
    macroMiniSoon();
    /* ASSETS 메뉴를 누른 뒤 (화면이 바뀐 다음에) 칩과 내용을 맞춘다 */
    document.addEventListener('click', function(e){
      var b = e.target && e.target.closest ? e.target.closest('#asNav .as-navbtn') : null;
      if (b) setTimeout(function(){ assetsChip(true); }, 80);
    });
    /* 키를 저장·삭제하면 배지가 바뀐다 — 패널 안을 누른 뒤 다시 본다 */
    document.addEventListener('click', function(e){
      if (e.target && e.target.closest && e.target.closest('#page-macro .macro-panel') && !e.target.closest('#mpMini')) macroMiniSoon();
    }, true);
    update();
    setTimeout(returnToPlace, 0);     /* 다른 모듈의 DOMContentLoaded 처리가 끝난 뒤 */
    window.addEventListener('scroll', onEvt, { passive: true });
    window.addEventListener('resize', onEvt, { passive: true });
    window.addEventListener('load', onEvt);
    /* 배경 방식(밝게/어둡게 · 첫 화면만/계속)이 바뀌면 html 의 class 가 바뀐다 */
    try {
      new MutationObserver(function(muts){
        for (var i = 0; i < muts.length; i++) { if (muts[i].attributeName === 'class') { onEvt(); break; } }
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    } catch(e) {}
  }

  injectCss();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__nnNavUpdate = update;
})();
