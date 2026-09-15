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

   ⚠ 칸을 바꿔도 화면이 한 픽셀도 안 움직여야 한다 (2026-09-15 수정)
     처음엔 '보유 종목'일 때만 폭을 넓히고 ASSETS 머리글을 감췄다.
     그랬더니 칸을 누를 때마다 사이드바가 가로 112px · 세로 236px 튀었다.
     둘 다 고쳤다.

     ① 폭 — ASSETS 페이지 전체를 1300 → 1586px 로 한 번만 넓혔다.
        칸에 따라 변하지 않으므로 좌우로 튈 일이 없고,
        사이드바(236+20px)가 먹는 만큼을 미리 벌어 둔 셈이라
        차트 폭도 원래 HOLDINGS 와 같다.
          원래   1300 - 80(좌우 여백)       = 1220
          지금   1586 - 80 - 236 - 20 - 30  = 1220   ← 같다
        ⚠ 이 규칙은 반드시 `#page-assets > .as-page-wrap` 로 좁혀 쓸 것.
          .as-page-wrap 은 CONVICTION·JOURNAL·FLOW 도 같이 쓴다.

     ② 머리글 — HOLDINGS 전용 머리글(보라 eyebrow + 3.2rem 제목 + 코브라인)을
        아예 없앴다. 그것만 다른 칸과 형식이 달라 혼자 동떨어져 보였다.
        지금은 다른 칸(NET WORTH·STOCK PORTFOLIO·DIVIDENDS …)과 똑같이
        `.as-sec-head` + `.as-sec-sub` 두 줄만 쓴다.
        보라색 정체성은 2026-09-15 에 전부 걷어내고 ASSETS 빨강으로 통일했다.
        ASSETS 머리글('자산 관리')은 어느 칸이든 늘 그대로 있다.

   nn-assets.js 는 글자 하나만 바꿨다 (카드 제목 '보유 종목' → '종목 목록')
     로직은 한 줄도 안 건드렸다.
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

  /* 보유 종목 칸을 켜고 끈다.
     ASSETS 머리글('자산 관리')은 건드리지 않는다 — 어느 칸이든 늘 그대로 있다. */
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
        bindLink(); renderLink();
      }, 80);
    } else {
      bindLink(); renderLink();
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     두 목록을 이어 주는 칩 줄

     '주식 · 평가액' 칸은 nn_assets_v1.stocks 에, '종목 분석' 칸은 nn_hold_v2 에
     따로 종목을 담는다. 쓰임이 달라 합치지는 않았지만(한쪽은 금액 계산,
     한쪽은 트레이딩뷰 조회) **같은 티커를 두 번 입력하는 일**은 없애야 한다.
     FLOW 의 '논거 없이 들고 있는 종목'과 같은 방식으로,
     한쪽에만 있는 종목을 칩으로 띄우고 한 번 눌러 옮긴다.

     ⚠ 자동으로 밀어 넣지 않는 이유
       nn_assets_v1.stocks 에는 거래소(NASDAQ·NYSE…)가 없다.
       HOLDINGS 의 sym 은 'NASDAQ:TSLA' 형태라 거래소가 반드시 필요하다.
       그래서 칩을 누르면 기존 '＋ 종목 추가' 창을 티커·종목명만 채워서 연다.
       거래소와 색은 사람이 고른다. (중복 검사도 그 창이 이미 한다)
     ══════════════════════════════════════════════════════════════════ */
  function stocksOf(){
    try{
      var raw = localStorage.getItem('nn_assets_v1');
      if(!raw) return [];
      var o = JSON.parse(raw);
      return (o && o.stocks) || [];
    }catch(e){ return []; }
  }
  function up(v){ return String(v || '').trim().toUpperCase(); }

  function renderLink(){
    var box = $('asHoldLink');
    if(!box) return;
    var held = window.HOLDINGS || [];
    var heldTk = {}, i;
    for(i = 0; i < held.length; i++) heldTk[up(held[i].tk)] = held[i];

    var st = stocksOf(), stTk = {}, missing = [];
    for(i = 0; i < st.length; i++){
      var t = up(st[i].ticker);
      if(!t) continue;
      stTk[t] = st[i];
      if(!heldTk[t] && missing.indexOf(t) < 0) missing.push(t);
    }
    var ghost = [];
    for(i = 0; i < held.length; i++){
      var ht = up(held[i].tk);
      if(ht && !stTk[ht]) ghost.push(ht);
    }

    var h = '';
    if(missing.length){
      h += '<div class="hl-row"><span class="hl-lb hl-add">자산에만 있고 분석 목록에 없음</span>';
      for(i = 0; i < missing.length; i++){
        var s = stTk[missing[i]];
        h += '<button type="button" class="hl-chip hl-c-add" data-tk="' + missing[i] +
             '" data-nm="' + esc(s.name || '') + '">＋ ' + esc(missing[i]) + '</button>';
      }
      h += '</div>';
    }
    if(ghost.length){
      h += '<div class="hl-row"><span class="hl-lb hl-warn">분석 목록에만 있고 자산에 안 잡힘</span>';
      for(i = 0; i < ghost.length; i++) h += '<span class="hl-chip hl-c-warn">' + esc(ghost[i]) + '</span>';
      h += '<span class="hl-note">수량·평단을 넣으면 순자산에 합산됩니다</span></div>';
    }
    box.innerHTML = h;
    box.style.display = h ? '' : 'none';
  }

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function bindLink(){
    var box = $('asHoldLink');
    if(!box || box.__nnBound) return;
    box.__nnBound = true;
    box.addEventListener('click', function(e){
      var t = e.target;
      while(t && t !== box && !(t.classList && t.classList.contains('hl-c-add'))) t = t.parentNode;
      if(!t || t === box) return;
      if(typeof window.holdOpenAdd !== 'function') return;
      window.holdOpenAdd();
      setTimeout(function(){
        var tk = document.getElementById('haTk'), nm = document.getElementById('haNm');
        if(tk) tk.value = t.getAttribute('data-tk') || '';
        if(nm) nm.value = t.getAttribute('data-nm') || '';
        var ex = document.getElementById('haEx'); if(ex) ex.focus();
      }, 80);
    });
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

  window.__nnWealth = {
    show: function(){ setHold(true); },
    hide: function(){ setHold(false); },
    refresh: renderLink      /* 종목을 추가한 뒤 칩 줄을 다시 그린다 */
  };

  /* 종목 추가 창이 닫히면(=추가됐을 수 있으면) 칩 줄을 새로 그린다 */
  (function(){
    var t = 0;
    (function wait(){
      if(typeof window.holdSubmitAdd === 'function'){
        var orig = window.holdSubmitAdd;
        window.holdSubmitAdd = function(){
          var r = orig.apply(this, arguments);
          setTimeout(renderLink, 60);
          return r;
        };
        return;
      }
      if(++t > 40) return;
      setTimeout(wait, 200);
    })();
  })();
})();

/* ── 스타일 — 파일이 직접 주입 (nn-style.css 순서 불변) ── */
(function(){
  'use strict';
  if(document.getElementById('nnWealthCss')) return;
  var CSS = [
  /* 옮겨 온 HOLDINGS 는 이제 안쪽 칸이므로 자기 여백·최대폭을 내려놓는다 */
  /* padding-left 30px 은 .as-content 와 같은 값 — 달라지면 제목 x 좌표가 어긋난다 */
  '#page-portfolio.pf-pane{flex:1;min-width:0;padding-left:30px}',
  /* ⚠ nn-style.css 3304 의 `.hold-wrap{padding-top:94px!important}` 를 눌러야 한다.
     독립 탭이던 시절 고정 네비를 피하려고 넣은 값인데, 지금은 94px 만큼 혼자 내려간다 */
  '#page-portfolio.pf-pane .hold-wrap{padding:0!important;max-width:none;margin:0}',
  '#page-portfolio.pf-pane .hold-layout{margin-top:0}',
  /* ── 정렬이 흔들리지 않게 하는 두 줄 ──
     ① 폭은 칸을 바꿔도 절대 안 변한다. 사이드바(236+20px)가 자리를 먹는 만큼
        ASSETS 페이지 전체를 1300 → 1586px 로 한 번만 넓혀 두었다.
        (as-holding 일 때만 넓히면 사이드바가 좌우로 112px 튄다 — 그게 원인이었다)
     ② 머리글은 칸마다 바뀌지 않는다. HOLDINGS 전용 머리글은 없앴고
        ASSETS 머리글은 늘 떠 있다. 세로로 튈 일 자체가 사라졌다. */
  '#page-assets > .as-page-wrap{max-width:1586px}',
  /* ── 색을 ASSETS 빨강(#ff4d4d)으로 통일 (2026-09-15) ──
     HOLDINGS 가 독립 탭이던 시절의 보라색은, ASSETS 안으로 들어온 지금은
     이 칸만 혼자 다른 집처럼 보이게 만든다. 사이드바·카드·표가 전부 빨강인데
     한 칸만 보라면 "같은 페이지"로 안 읽힌다. 그래서 전부 빨강으로 맞췄다.
     nn-style.css 는 건드리지 않고 여기서 덮어쓴다(순서 불변 규칙).
     ⚠ `.hold-desc` 는 사용자가 만든 탭(ct_*)도 쓰므로 반드시 #page-portfolio 안으로 좁힐 것. */
  '#page-portfolio .hold-item{background:rgba(30,20,22,.55)!important;',
  '  border-color:rgba(255,77,77,.3)!important;--bc:#ff4d4d!important}',
  '#page-portfolio .hold-detail-title{color:rgba(255,150,150,.98)!important;',
  '  text-shadow:0 0 10px rgba(255,77,77,.6)!important}',
  '#page-portfolio .hold-w{border-color:rgba(255,77,77,.16)!important;',
  '  box-shadow:inset 0 0 0 1px rgba(0,0,0,.4),0 0 18px rgba(255,77,77,.05)!important}',
  '#page-portfolio .hold-add-btn{background:rgba(255,77,77,.12)!important;',
  '  border-color:rgba(255,77,77,.5)!important;color:#ffb0b0!important}',
  '#page-portfolio .hold-add-btn:hover{border-color:#ff4d4d!important;',
  '  box-shadow:0 0 18px -5px #ff4d4d!important}',
  '#page-portfolio .hw-krw{background:rgba(24,16,17,.4)!important;',
  '  border-left-color:rgba(255,77,77,.5)!important}',
  /* 제목 글로우도 다른 칸과 같은 빨강 (.as-sec-head 기본값) — as-sec-hold 는 덮지 않는다 */
  /* 두 목록을 잇는 칩 줄 */
  '.hold-link{display:flex;flex-direction:column;gap:7px;margin:0 0 16px}',
  '.hl-row{display:flex;flex-wrap:wrap;align-items:center;gap:7px;font-family:\'Pretendard\',sans-serif}',
  '.hl-lb{font-size:11.5px;font-weight:600;letter-spacing:.01em}',
  '.hl-lb.hl-add{color:rgba(255,140,140,.95)}',
  '.hl-lb.hl-warn{color:rgba(255,190,120,.9)}',
  '.hl-chip{font-family:\'Pretendard\',sans-serif;font-size:12px;font-weight:600;',
  '  padding:5px 11px;border-radius:999px;line-height:1.25}',
  '.hl-c-add{cursor:pointer;color:#ffb0b0;background:rgba(255,77,77,.12);',
  '  border:1px solid rgba(255,77,77,.45);transition:.16s}',
  '.hl-c-add:hover{background:rgba(255,77,77,.24);border-color:#ff4d4d;',
  '  box-shadow:0 0 16px -4px #ff4d4d;transform:translateY(-1px)}',
  '.hl-c-warn{color:rgba(255,205,150,.92);background:rgba(255,180,100,.08);',
  '  border:1px solid rgba(255,180,100,.3)}',
  '.hl-note{font-size:11px;color:rgba(255,255,255,.45)}',

  /* 900px 아래에서는 nn-style.css 가 사이드바를 위로 올린다(.as-wrap{flex-direction:column}).
     그때는 좁힐 이유가 없으니 여백과 최대폭을 원래대로 돌려놓는다. */
  '@media (max-width:900px){',
  '  #page-portfolio.pf-pane{padding-left:0}',
  '  #page-assets > .as-page-wrap{max-width:1300px}',
  '}'
  ].join('');
  var s = document.createElement('style');
  s.id = 'nnWealthCss'; s.textContent = CSS;
  document.head.appendChild(s);
})();
