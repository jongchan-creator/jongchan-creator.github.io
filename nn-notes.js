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
  var TYPES = ['books','lexicon','media','economics'];
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
  '.kn-tab:hover{color:#fff;background:rgba(255,255,255,.08)}',
  '.kn-tab.on{color:#e8c47e;border-color:rgba(201,169,110,.5);background:rgba(201,169,110,.13)}',
  '.kn-tab.on i{color:rgba(232,196,126,.6)}',
  /* 합쳐진 칸은 원래 페이지처럼 보이게 — 위 여백만 줄인다 */
  '.kn-pane > div:first-child{padding-top:18px!important}',
  /* 첫 화면만 흰색 모드 */
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .kn-tab{',
  '  background:transparent!important;border-color:rgba(138,106,36,.28)!important;',
  '  color:var(--lp-ink3)!important}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .kn-tab.on{',
  '  color:var(--lp-brass)!important;border-color:rgba(138,106,36,.6)!important;',
  '  background:rgba(138,106,36,.08)!important}',
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
