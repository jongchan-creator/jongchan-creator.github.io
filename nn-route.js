/* ══════════════════════════════════════════════════════════════════
   NEWNORMAL — 주소에 현재 위치 적기 (nn-route.js)   2026-11 신설 · 개선제안 S-1

   예전에는 어느 탭에 있든 주소가 …/index.html 하나였다.
     · 새로고침하면 늘 홈으로 돌아갔다
     · 브라우저의 뒤로 가기가 이전 탭이 아니라 사이트 밖으로 나갔다
     · "일기 탭"을 즐겨찾기에 넣을 수 없었다
     · ASSETS 는 들어갈 때마다 '자산 현황'부터 시작했다

   이제 주소 끝에 위치를 적는다.
     (없음)            홈
     #/notes/daily     NOTES 의 일기      (books · lexicon · media · economics · daily)
     #/assets/stocks   ASSETS 의 주식      (asNav 의 data-sec 값 그대로)
     #/macro  #/thesis  #/research  #/conviction  #/journal  #/flow  #/about
     #/ct_xxxx         사용자가 만든 탭
     #/today  #/lookup  앱 바로가기 — 오늘 일기를 열고 / 단어 찾기 칸에 커서 (연 뒤 주소는 실제 화면으로)

   원리
     화면 → 주소 : 탭이 바뀔 때마다(switchPage · NOTES 하위 탭 · ASSETS 섹션 누름) '지금 화면'을 읽어 주소를 맞춘다.
                   이름을 믿지 않고 화면을 읽는다 — switchPage('portfolio') 처럼 다른 곳으로 보내는 이름이 있기 때문이다.
     주소 → 화면 : 처음 열 때 · 뒤로/앞으로 가기 · 주소를 직접 고쳤을 때.

   공유 보기(?share=…)에서는 동작하지 않는다.
   로딩 순서: … → nn-polish.js → nn-quick.js → nn-route.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__nnRoute) return;
  if (/[?&]share=/.test(location.search)) return;      /* 읽기 전용 공유 보기 */

  var NOTES = ['books','lexicon','media','economics','daily'];
  var SEC_KEY = 'nn_assets_sec_v1';                    /* ASSETS 에서 마지막으로 보던 섹션 (이 기기에만) */
  var LABEL = { home:'', notes:'NOTES', books:'책', lexicon:'용어', media:'미디어', economics:'경제', daily:'일기',
                thesis:'THESIS', macro:'MACRO', research:'RESEARCH', assets:'ASSETS', conviction:'CONVICTION',
                journal:'JOURNAL', flow:'FLOW', about:'ABOUT' };
  var baseTitle = document.title || 'NEWNORMAL';
  var applying = false, last = null, booted = false;

  function activeName(){
    var a = document.querySelector('.page.active');
    return a ? String(a.id || '').replace(/^page-/, '') : 'home';
  }
  /* 지금 화면이 어디인가 */
  function current(){
    var n = activeName();
    if (n === 'notes'){
      var t = document.querySelector('#knTabs .kn-tab.on');
      var sub = t ? t.getAttribute('data-k') : '';
      return 'notes' + (sub ? '/' + sub : '');
    }
    if (n === 'assets'){
      var pg = document.getElementById('page-assets'), sec = '';
      if (pg && pg.classList.contains('as-holding')) sec = 'holdings';
      else { var b = document.querySelector('#asNav .as-navbtn.active'); sec = b ? (b.getAttribute('data-sec') || '') : ''; }
      return 'assets' + (sec ? '/' + sec : '');
    }
    return n || 'home';
  }
  function parse(){
    var m = /^#\/([A-Za-z0-9_\-\/]+)$/.exec(location.hash || '');
    return m ? m[1].replace(/\/+$/, '') : '';
  }
  function urlOf(route){
    return location.pathname + location.search + (route && route !== 'home' ? '#/' + route : '');
  }
  function setTitle(route){
    try {
      var p = String(route || 'home').split('/');
      var lb = '';
      if (p[0] === 'notes') lb = LABEL[p[1]] || 'NOTES';
      else if (p[0] === 'assets'){
        var b = p[1] ? document.querySelector('#asNav .as-navbtn[data-sec="' + p[1] + '"]') : null;
        var t = b ? (b.textContent || '').replace(/\s+/g, ' ').trim() : '';
        lb = t ? 'ASSETS · ' + t.replace(/^[^\w가-힣]+/, '') : 'ASSETS';
      }
      else if (LABEL[p[0]] !== undefined) lb = LABEL[p[0]];
      else {
        var nb = document.getElementById('nav-' + p[0]);
        lb = nb ? (nb.textContent || '').trim() : '';
      }
      document.title = lb ? lb + ' · ' + baseTitle : baseTitle;
    } catch(e) {}
  }

  /* 화면 → 주소 */
  function sync(push){
    if (applying) return;
    var r = current();
    if (!r) return;
    if (r.indexOf('assets/') === 0){ try { localStorage.setItem(SEC_KEY, r.slice(7)); } catch(e) {} }
    var now = parse() || 'home';
    if (r === now){ last = r; setTitle(r); return; }
    try {
      if (push && booted) history.pushState({ nn:r }, '', urlOf(r));
      else history.replaceState({ nn:r }, '', urlOf(r));
    } catch(e) {}
    last = r;
    setTitle(r);
  }
  function later(push){ setTimeout(function(){ sync(push); }, 0); setTimeout(function(){ sync(push); }, 120); }

  /* 주소 → 화면 */
  function go(route){
    var sw = window.switchPage;
    if (typeof sw !== 'function') return;
    route = route || 'home';
    var p = route.split('/'), name = p[0], sub = p[1] || '';
    applying = true;
    try {
      /* 앱 바로가기(nn-app.webmanifest)용 — 오늘 일기 · 단어 찾기. 연 뒤에는 주소가 실제 화면(#/notes/…)으로 바뀐다 */
      if (name === 'today'){ sw('daily'); whenNotesReady(function(){ if (window.__nnGo) window.__nnGo.dailyToday(); }); }
      else if (name === 'lookup'){ sw('lexicon'); whenNotesReady(function(){ if (window.__nnGo) window.__nnGo.lookup(''); }); }
      else if (name === 'notes') sw(sub && NOTES.indexOf(sub) >= 0 ? sub : 'notes');
      else if (name === 'assets') sw('assets');
      else if (document.getElementById('page-' + name)) sw(name);
      else sw('home');
    } catch(e) {}

    /* ASSETS 의 섹션은 버튼을 눌러야 바뀐다. 처음 열 때는 그 버튼(특히 '종목 분석')이
       아직 준비되지 않았을 수 있으므로, 화면이 주소와 맞을 때까지 잠깐 되풀이해 본다. */
    var want = (name === 'assets' && sub) ? 'assets/' + sub : '';
    var tries = 0;
    (function settle(){
      if (want && current() !== want && tries++ < 14){
        try {
          var b = document.querySelector('#asNav .as-navbtn[data-sec="' + sub + '"]');
          if (b) b.click();
        } catch(e) {}
        setTimeout(settle, 160);
        return;
      }
      setTimeout(function(){
        applying = false;
        last = current();
        setTitle(last);
        if (last.indexOf('assets/') === 0){ try { localStorage.setItem(SEC_KEY, last.slice(7)); } catch(e) {} }
        /* 주소에 적힌 곳이 없는 곳이었으면(지워진 탭 등) 주소를 실제 화면에 맞춘다 */
        if ((parse() || 'home') !== last){ try { history.replaceState({ nn:last }, '', urlOf(last)); } catch(e) {} }
      }, 160);
    })();
  }

  /* 노트가 다 읽힌 뒤에 — 그 전에 오늘 일기를 만들면 저장이 막혀 있어 빈 글이 된다 */
  function whenNotesReady(fn){
    var n = 0;
    (function wait(){
      var k = window.KnowledgeNotes;
      if ((k && k._ready) || n++ > 60) { try { fn(); } catch(e) {} return; }
      setTimeout(wait, 100);
    })();
  }

  function copyProps(from, to){
    try { Object.keys(from).forEach(function(k){ if (!(k in to)) to[k] = from[k]; }); } catch(e) {}
  }
  function hook(){
    var orig = window.switchPage;
    if (typeof orig !== 'function' || orig.__routeWrapped) return;
    var w = function(name){
      var r = orig.apply(this, arguments);
      /* ASSETS 로 그냥 들어왔을 때는 마지막으로 보던 섹션으로 — 주소로 들어온 경우(applying)는 제외 */
      if (name === 'assets' && !applying){
        try {
          var sec = localStorage.getItem(SEC_KEY) || '';
          var cur = current();
          if (sec && cur.indexOf('assets') === 0 && cur !== 'assets/' + sec){
            var b = document.querySelector('#asNav .as-navbtn[data-sec="' + sec + '"]');
            if (b) b.click();
          }
        } catch(e) {}
      }
      later(true);
      return r;
    };
    copyProps(orig, w); w.__routeWrapped = true;
    window.switchPage = w;
  }

  function boot(){
    hook();
    /* NOTES 하위 탭 · ASSETS 섹션은 switchPage 를 거치지 않는다 — 눌린 뒤의 화면을 읽는다 */
    document.addEventListener('click', function(e){
      var t = e.target && e.target.closest ? e.target.closest('#knTabs .kn-tab, #asNav .as-navbtn') : null;
      if (t) setTimeout(function(){ sync(true); }, 40);
    }, true);
    window.addEventListener('popstate', function(){
      var r = parse() || 'home';
      if (r === current()) { last = r; setTitle(r); return; }
      go(r);
    });

    var r0 = parse();
    if (r0 && r0 !== 'home') go(r0);
    else { last = 'home'; setTitle('home'); }
    setTimeout(function(){ booted = true; }, 400);
  }

  window.__nnRoute = { current: current, go: go, sync: sync };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 30); });
  else setTimeout(boot, 30);
})();
