/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — ASSETS 안으로 HOLDINGS 들이기 (nn-wealth.js)

   왜 합쳤나
     ASSETS 는 "내가 가진 것 전부"를, HOLDINGS 는 "그중 개별 종목"을 본다.
     둘은 상하 관계인데 탭이 나란히 둘이라 메뉴만 길어졌다.
     ASSETS 왼쪽 사이드바에 이미 '주식' 칸이 있으니
     그 바로 밑에 '보유 종목'을 넣으면 위계가 눈에 그대로 보인다.

   HOLDINGS 디자인은 한 픽셀도 고치지 않았다 — 그게 핵심
     #page-portfolio 안의 마크업은 그대로다.
     바깥 껍데기 class="page" 만 pf-pane 으로 바꿔
     #page-assets 의 .as-wrap 안(= #asContent 옆자리)으로 옮겼을 뿐이다.
     id 가 살아 있으니 nn-style.css 의 .hold-* 규칙이 전부 그대로 걸린다.

     다만 사이드바(236px)가 자리를 먹으면 차트 폭이 좁아진다.
     그래서 '보유 종목'을 보고 있는 동안에만 .as-page-wrap 의 최대폭을
     사이드바 몫만큼 넓혀, 원래 HOLDINGS 와 같은 폭이 나오게 맞췄다.
       원래   1300 - 80(좌우 여백)            = 1220
       지금   1586 - 80 - 236 - 20 - 30       = 1220   ← 같다

   ASSETS 머리글은 숨긴다
     HOLDINGS 에는 보라색 자기 머리글(hold-header)이 있다.
     빨간 ASSETS 머리글과 겹치면 제목이 두 개가 되므로,
     이 칸에 있는 동안에만 .as-header 를 감춘다.

   nn-assets.js 는 한 줄도 안 건드렸다
     #asNav 의 클릭 처리기가 data-sec 값을 그대로 쓰기 때문에
     data-sec="holdings" 버튼 하나만 넣으면 저쪽은 알아서 동작한다.
     (render() 는 모르는 sec 을 viewNet() 으로 흘리는데,
      그때 #asContent 는 숨겨져 있으므로 화면에 영향이 없다.)

   switchPage('portfolio') 는 그대로 살려 둔다
     커맨드 팔레트 · FLOW 의 '보유한다' 칸 · 맥락(nn-relations) ·
     숫자 단축키가 전부 이 이름을 부른다.
     이름을 갈아엎는 대신 여기서 ASSETS + 보유 종목으로 돌려보낸다.

   로딩 순서: … → nn-backup.js → nn-wealth.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnWealth) return;

  var SEC = 'holdings';
  var inited = false;

  function $(id){ return document.getElementById(id); }
  function pane(){ return $('page-portfolio'); }
  function page(){ return $('page-assets'); }

  function curSec(){
    var b = document.querySelector('#asNav .as-navbtn.active');
    return b ? b.getAttribute('data-sec') : null;
  }

  /* 보유 종목 칸을 켜고 끈다 */
  function setHold(on){
    var p = pane(), g = page(), c = $('asContent');
    if(!p || !g) return;
    on = !!on;
    g.classList.toggle('as-holding', on);
    p.style.display = on ? '' : 'none';
    if(c) c.style.display = on ? 'none' : '';
    if(!on) return;

    /* TradingView 위젯은 보이는 상태에서 그려야 높이가 잡힌다 */
    if(!inited){
      inited = true;
      setTimeout(function(){
        try{ if(typeof window.initHoldings === 'function') window.initHoldings(); }catch(e){}
      }, 80);
    }
  }

  /* 사이드바 클릭 — nn-assets.js 의 처리기와 별개로 하나 더 듣는다.
     저쪽은 sec 값만 바꾸고, 화면 교체는 여기서 한다. */
  function bindNav(){
    var nav = $('asNav');
    if(!nav || nav.__nnWealthBound) return false;
    nav.__nnWealthBound = true;
    nav.addEventListener('click', function(e){
      var t = e.target, b = null;
      while(t && t !== nav){
        if(t.classList && t.classList.contains('as-navbtn')){ b = t; break; }
        t = t.parentNode;
      }
      if(!b) return;
      setHold(b.getAttribute('data-sec') === SEC);
    });
    return true;
  }

  /* 옛 이름(portfolio)으로 불러도 ASSETS · 보유 종목으로 보낸다 */
  function hookSwitch(){
    if(typeof window.switchPage !== 'function' || window.switchPage.__nnWealthWrapped) return;
    var orig = window.switchPage;
    var wrapped = function(name){
      var want = false;
      if(name === 'portfolio'){ name = 'assets'; want = true; }
      var r = orig.call(this, name);
      if(name === 'assets'){
        setTimeout(function(){
          bindNav();
          if(want){
            var b = document.querySelector('#asNav .as-navbtn[data-sec="' + SEC + '"]');
            if(b){ b.click(); return; }
          }
          /* ASSETS 로 그냥 들어온 경우 — 마지막에 보던 칸을 되살린다 */
          setHold(curSec() === SEC);
        }, 100);
      }
      return r;
    };
    wrapped.__nnWealthWrapped = true;
    window.switchPage = wrapped;
  }

  function boot(){
    hookSwitch();
    var tries = 0;
    (function wait(){
      if(bindNav()) return;
      if(++tries > 40) return;
      setTimeout(wait, 200);
    })();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__nnWealth = { show: function(){ setHold(true); }, hide: function(){ setHold(false); } };
})();

/* ── 스타일 — 파일이 직접 주입 (nn-style.css 순서 불변) ── */
(function(){
  'use strict';
  if(document.getElementById('nnWealthCss')) return;
  var CSS = [
  /* 옮겨 온 HOLDINGS 는 이제 안쪽 칸이므로 자기 여백·최대폭을 내려놓는다 */
  '#page-portfolio.pf-pane{flex:1;min-width:0;padding-left:18px}',
  '#page-portfolio.pf-pane .hold-wrap{padding:0;max-width:none;margin:0}',
  '#page-portfolio.pf-pane .hold-layout{margin-top:1.2rem}',
  /* 사이드바가 먹은 폭만큼 바깥을 넓혀 원래 HOLDINGS 폭(1220px)을 되돌린다 */
  '#page-assets.as-holding > .as-page-wrap{max-width:1586px;padding-left:1.6rem;padding-right:1.6rem}',
  /* 제목이 둘이 되지 않게 — HOLDINGS 는 자기 머리글을 갖고 있다 */
  '#page-assets.as-holding .as-header{display:none}',
  '#page-assets.as-holding .as-wrap{margin-top:0}',
  /* 사이드바 버튼 — 이 칸만 HOLDINGS 의 보라색을 쓴다 */
  '.as-navbtn.as-nav-hold{--bc:#b28ad4}',
  '.as-navbtn.as-nav-hold.active{color:#cbaae6;text-shadow:0 0 10px rgba(178,138,212,.6)}',
  /* 900px 아래에서는 nn-style.css 가 사이드바를 위로 올린다(.as-wrap{flex-direction:column}).
     그때는 좁힐 이유가 없으니 여백과 최대폭을 원래대로 돌려놓는다. */
  '@media (max-width:900px){',
  '  #page-portfolio.pf-pane{padding-left:0}',
  '  #page-assets.as-holding > .as-page-wrap{max-width:1300px;padding-left:2.5rem;padding-right:2.5rem}',
  '}'
  ].join('');
  var s = document.createElement('style');
  s.id = 'nnWealthCss'; s.textContent = CSS;
  document.head.appendChild(s);
})();
