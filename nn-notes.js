/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 지식 기록 한 탭으로 (nn-notes.js)

   왜 합쳤나
     BOOKS · LEXICON · MEDIA · ECONOMICS 네 탭은 화면이 글자 하나 안 달랐다.
     넷 다 같은 KnowledgeNotes 엔진에 .editor-layout 구조였고,
     다른 것은 데이터가 담기는 칸 이름뿐이었다.
     그런데도 탭을 넷이나 차지해 메뉴가 길어졌다.

   어떻게 합쳤나 — id 를 살려 두는 것이 핵심
     nn-style.css 가 #page-books / #page-lexicon / #page-media /
     #page-economics 를 42 군데에서 쓴다. id 를 바꾸면 그 스타일이 전부 깨진다.
     그래서 **id 는 그대로 두고 class="page" 만 kn-pane 으로 바꿔**
     하나의 #page-notes 안에 넣었다.
     KnowledgeNotes 쪽 코드는 한 줄도 건드리지 않았다.

   THESIS 는 넣지 않았다
     그쪽은 thWrap·thTagBox·thCards 로 된 자기 UI 라 성격이 다르다.

   로딩 순서: … → nn-diary.js → nn-backup.js → nn-notes.js  (맨 마지막)
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnNotes) return;

  var KEY   = 'nn_notes_tab_v1';
  var TYPES = ['books','lexicon','media','economics','daily'];
  var cur   = null;

  function remember(t){ try{ localStorage.setItem(KEY, t); }catch(e){} }
  function recall(){
    try{
      var v = localStorage.getItem(KEY);
      return TYPES.indexOf(v) >= 0 ? v : 'books';
    }catch(e){ return 'books'; }
  }

  function paneOf(t){ return document.getElementById('page-' + t); }

  function show(type, opts){
    if(TYPES.indexOf(type) < 0) type = 'books';
    opts = opts || {};
    cur = type;
    remember(type);

    TYPES.forEach(function(t){
      var el = paneOf(t);
      if(el) el.style.display = (t === type) ? '' : 'none';
    });

    var box = document.getElementById('knTabs');
    if(box) box.querySelectorAll('.kn-tab').forEach(function(b){
      b.classList.toggle('on', b.getAttribute('data-k') === type);
    });

    /* 숨겨져 있던 동안 못 그린 목록을 다시 그린다 */
    try{
      var k = window.KnowledgeNotes;
      if(k && k.renderSidebar){
        k.renderSidebar(type);
        if(k.activeIds && k.activeIds[type] && k.renderEditor) k.renderEditor(type);
      }
    }catch(e){}

    if(!opts.silent) try{ window.scrollTo(0, 0); }catch(e){}
  }

  function bind(){
    var box = document.getElementById('knTabs');
    if(!box || box.__nnBound) return false;
    box.__nnBound = true;
    box.querySelectorAll('.kn-tab').forEach(function(b){
      b.onclick = function(){ show(b.getAttribute('data-k')); };
    });
    return true;
  }

  /* 예전 이름(books·lexicon·media·economics)으로 불러도 통합 탭으로 보낸다.
     커맨드 팔레트·북마크·기존 링크가 그대로 동작해야 한다. */
  function hookSwitch(){
    if(typeof window.switchPage !== 'function' || window.switchPage.__nnNotesWrapped) return;
    var orig = window.switchPage;
    var wrapped = function(name){
      var want = null;
      if(TYPES.indexOf(name) >= 0){ want = name; name = 'notes'; }
      var r = orig.call(this, name);
      if(name === 'notes'){
        setTimeout(function(){
          bind();
          show(want || cur || recall(), {silent:!want});
        }, 40);
      }
      return r;
    };
    wrapped.__nnNotesWrapped = true;
    window.switchPage = wrapped;
  }

  function boot(){
    hookSwitch();
    /* KnowledgeNotes 가 뜬 뒤에 첫 화면을 정한다 */
    var tries = 0;
    (function wait(){
      if(bind()){ show(recall(), {silent:true}); return; }
      if(++tries > 40) return;
      setTimeout(wait, 200);
    })();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__nnNotes = { show: show, types: TYPES, current: function(){ return cur; } };
})();

/* ── 스타일 — 파일이 직접 주입 (nn-style.css 순서 불변) ── */
(function(){
  'use strict';
  if(document.getElementById('nnNotesCss')) return;
  var CSS = [
  '#page-notes .kn-wrap{width:100%}',
  /* 상단 고정 네비(약 53px) 아래로 내려야 가려지지 않는다 */
  '.kn-tabs{display:flex;gap:7px;flex-wrap:wrap;align-items:center;',
  '  max-width:1200px;margin:0 auto;padding:80px 2.5rem 0;font-family:\'Pretendard\',sans-serif}',
  '.kn-tab{display:inline-flex;align-items:baseline;gap:7px;cursor:pointer;',
  '  font-size:13.5px;font-weight:600;color:rgba(255,255,255,.5);',
  '  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);',
  '  border-radius:10px;padding:9px 16px;transition:.16s;font-family:\'Pretendard\',sans-serif}',
  '.kn-tab i{font-style:normal;font-family:\'Bebas Neue\',sans-serif;font-size:9.5px;',
  '  letter-spacing:.16em;color:rgba(255,255,255,.28)}',
  /* ── 원래 탭이 갖고 있던 상징색을 되살린다 ──
     네 탭을 한 곳에 합치면서 색까지 잃으면 구분이 사라진다.
     평소엔 무채색으로 두었다가 손을 올리면 제 색이 드러나고,
     고른 탭은 그 색을 그대로 유지한다. 값은 기존 네비 버튼에서 그대로 가져왔다.
       BOOKS      #f5c75c  (.books-btn)
       LEXICON    #aeb1b4  (.nbtn.lexicon-btn:hover)
       MEDIA      #7fbef5  (.nbtn.media-btn:hover)
       ECONOMICS  #7fd58c  (.nbtn.econ-btn:hover)
       DAILY      #c2a0e8  (새로 만든 칸 — 옛 HOLDINGS 보라) */
  '.kn-tab[data-k="books"]    {--kc:#f5c75c;--kg:244,182,37}',
  '.kn-tab[data-k="lexicon"]  {--kc:#aeb1b4;--kg:174,177,180}',
  '.kn-tab[data-k="media"]    {--kc:#7fbef5;--kg:138,180,212}',
  '.kn-tab[data-k="economics"]{--kc:#7fd58c;--kg:122,158,126}',
  /* 일기 — HOLDINGS 가 ASSETS 빨강으로 옮겨가며 비운 보라를 물려받았다 */
  '.kn-tab[data-k="daily"]   {--kc:#c2a0e8;--kg:194,160,232}',
  '.kn-tab:hover{color:var(--kc);border-color:rgba(var(--kg),.55);',
  '  background:rgba(var(--kg),.10);transform:translateY(-1px);',
  '  text-shadow:0 0 9px rgba(var(--kg),.55),0 0 20px rgba(var(--kg),.3);',
  '  box-shadow:0 6px 18px -8px rgba(var(--kg),.65)}',
  '.kn-tab:hover i{color:rgba(var(--kg),.8)}',
  '.kn-tab.on{color:var(--kc);border-color:rgba(var(--kg),.55);background:rgba(var(--kg),.14);',
  '  text-shadow:0 0 8px rgba(var(--kg),.45)}',
  '.kn-tab.on i{color:rgba(var(--kg),.7)}',
  /* 고른 탭 밑에 색 띠 하나 — 어느 칸을 보고 있는지 눈에 박히게 */
  '.kn-tab{position:relative;overflow:hidden}',
  '.kn-tab::after{content:"";position:absolute;left:12px;right:12px;bottom:0;height:2px;',
  '  background:var(--kc);border-radius:2px 2px 0 0;opacity:0;transform:translateY(2px);transition:.18s}',
  '.kn-tab.on::after{opacity:1;transform:none}',
  /* ── NOTES 네비 버튼 = 형광 주황 ──
     처음엔 사이트 기본 금색(#e8c47e)을 썼는데 BOOKS(#e8c47e)와 같은 값이라
     상위 탭과 하위 탭이 구분되지 않았다. 아무도 안 쓰는 형광 주황으로 옮겼다.
     MACRO 의 주황(#ff8252)은 채도가 낮은 살구색이라 나란히 놓아도 갈린다.
     RESEARCH 의 형광 연두(#ccff00)와 같은 네온 계열이라 사이트 톤에도 맞는다. */
  '#nav-notes:hover,#nav-notes.active{color:#ff7a00!important;',
  '  text-shadow:0 0 3px rgba(0,0,0,.85),0 1px 4px rgba(0,0,0,.6),',
  '  0 0 7px rgba(255,122,0,.95),0 0 18px rgba(255,122,0,.72),0 0 36px rgba(255,122,0,.42)!important}',
  '#nav-notes .sh{background:linear-gradient(90deg,transparent,#ff9a3c,transparent)!important}',
  /* 합쳐진 칸은 원래 페이지처럼 보이게 — 위 여백만 줄인다 */
  '.kn-pane > div:first-child{padding-top:18px!important}',
  /* 첫 화면만 흰색 모드 */
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .kn-tab:not(:hover):not(.on){',
  '  background:transparent!important;border-color:rgba(138,106,36,.28)!important;',
  '  color:var(--lp-ink3)!important}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .kn-tab:hover,',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .kn-tab.on{',
  '  color:var(--kc)!important;border-color:rgba(var(--kg),.65)!important;',
  '  background:rgba(var(--kg),.12)!important;text-shadow:none!important}',
  '@media (max-width:760px){',
  '  .kn-tabs{padding:66px 1.2rem 0;gap:5px}',
  '  .kn-tab{font-size:12.5px;padding:8px 12px}',
  '  .kn-tab i{display:none}',
  '}'
  ].join('');
  var s = document.createElement('style');
  s.id = 'nnNotesCss'; s.textContent = CSS;
  document.head.appendChild(s);
})();
