/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 편집기 글꼴 나중에 불러오기 (nn-fonts.js)

   왜 만들었나
     index.html 의 <head> 에서 구글 폰트 29종을 한 번에 요청하고 있었다.
     실제로 화면에 쓰는 건 10종이고, 나머지 18종은 노트 편집기의
     글꼴 드롭다운에서만 고를 수 있는 것들이다. (Michroma 1종은 아예 안 쓰임)

     오해하기 쉬운 부분 — 폰트 '파일'은 원래도 다 받지 않는다.
     브라우저는 그 글꼴로 그려지는 글자가 화면에 있을 때만 파일을 받는다.
     문제는 파일이 아니라 <head> 의 그 링크 자체다.
     구글 폰트는 한글 폰트를 유니코드 구간별로 잘게 쪼개 주기 때문에
     한 종이 @font-face 블록 수십~백여 개를 만들어 낸다.
     그 CSS 는 첫 화면을 막는 자리(<head>)에 있고, 다 받아 파싱하기 전에는
     아무것도 그려지지 않는다.

     그래서 링크를 둘로 나눈다.
       · <head>       — 화면에 실제로 쓰는 10종 (그대로 둠)
       · 이 파일       — 편집기 전용 18종 (첫 화면을 지나고 나서)

   기존 글이 깨지지 않게 하는 장치
     이미 써 둔 노트에 "나눔손글씨 펜" 같은 글꼴을 적용해 둔 곳이 있을 수 있다.
     그래서 아래 넷 중 무엇이든 먼저 걸리면 즉시 불러온다.
       ① 편집 화면이 이미 떠 있다
       ② 지식 탭(BOOKS·LEXICON·MEDIA·ECONOMICS·THESIS·내 탭)으로 이동한다
       ③ 편집 영역이나 글꼴 드롭다운을 건드린다
       ④ 아무 일 없어도 첫 화면이 그려지고 잠깐 뒤 (보험)
     ④ 가 있으므로 최악의 경우에도 몇 초 안에 채워진다.

   로딩 순서: … → nn-mobilenav.js → nn-review.js → nn-fonts.js  (맨 마지막)
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnFonts) return;

  /* 편집기 글꼴 드롭다운에만 쓰이는 18종 */
  var HREF = 'https://fonts.googleapis.com/css2'
    + '?family=Nanum+Gothic:wght@400;700'
    + '&family=Nanum+Myeongjo:wght@400;700'
    + '&family=Nanum+Pen+Script'
    + '&family=Nanum+Brush+Script'
    + '&family=Do+Hyeon'
    + '&family=Sunflower:wght@300;500;700'
    + '&family=Gaegu:wght@300;400;700'
    + '&family=Song+Myung'
    + '&family=Stylish'
    + '&family=Gowun+Dodum'
    + '&family=Gowun+Batang:wght@400;700'
    + '&family=Hahmlet:wght@400;600'
    + '&family=IBM+Plex+Sans+KR:wght@400;600'
    + '&family=Nanum+Gothic+Coding'
    + '&family=Poor+Story'
    + '&family=Kirang+Haerang'
    + '&family=Black+Han+Sans'
    + '&family=Jua'
    + '&display=swap';

  var KNOWLEDGE = ['books','lexicon','media','economics','thesis'];
  var done = false;

  function load(why){
    if(done) return false;
    done = true;
    try{
      var l = document.createElement('link');
      l.id = 'nnEditorFonts';
      l.rel = 'stylesheet';
      l.href = HREF;
      /* media 를 print 로 두었다가 다 받은 뒤 all 로 바꾼다.
         이렇게 하면 받는 동안 화면 그리기를 막지 않는다. */
      l.media = 'print';
      l.onload = function(){ this.onload = null; this.media = 'all'; };
      l.setAttribute('data-why', why || '');
      document.head.appendChild(l);
      /* onload 가 어떤 이유로든 안 불리면 글꼴이 영영 안 먹는다.
         5초 뒤에는 무조건 켠다. */
      setTimeout(function(){ if(l.media !== 'all') l.media = 'all'; }, 5000);
    }catch(e){ done = false; return false; }
    return true;
  }

  /* ① 편집 화면이 이미 떠 있으면 바로 */
  function editorVisible(){
    try{
      if(document.querySelector('.editor-layout.editing')) return true;
      var th = document.getElementById('page-thesis');
      if(th && th.classList.contains('active') && document.querySelector('#thesis-editor-layout.editing')) return true;
    }catch(e){}
    return false;
  }

  /* ② 지식 탭으로 이동할 때 */
  function hookSwitch(){
    if(typeof window.switchPage !== 'function' || window.switchPage.__nnFontWrapped) return;
    var orig = window.switchPage;
    var wrapped = function(name){
      var r = orig.apply(this, arguments);
      try{
        if(KNOWLEDGE.indexOf(name) >= 0 || /^ct_/.test(String(name||''))) load('tab:' + name);
      }catch(e){}
      return r;
    };
    wrapped.__nnFontWrapped = true;
    window.switchPage = wrapped;
  }

  /* ③ 편집 영역·글꼴 드롭다운을 건드릴 때 */
  function hookTouch(){
    var sel = '.editor-layout, .editor-main, .editor-toolbar, .tb-font, .np-body, .nn-editable';
    function onTouch(e){
      try{
        var t = e.target;
        if(t && t.closest && t.closest(sel)){
          load('touch');
          if(done) detach();
        }
      }catch(err){}
    }
    function detach(){
      document.removeEventListener('pointerdown', onTouch, true);
      document.removeEventListener('focusin', onTouch, true);
    }
    document.addEventListener('pointerdown', onTouch, true);
    document.addEventListener('focusin', onTouch, true);
  }

  /* ④ 보험 — 첫 화면이 그려지고 나면 조용히 채워 둔다 */
  function idleLoad(){
    var go = function(){ load('idle'); };
    if(window.requestIdleCallback) window.requestIdleCallback(go, {timeout:4000});
    else setTimeout(go, 3000);
  }

  function boot(){
    hookSwitch();
    hookTouch();
    if(editorVisible()){ load('editor-open'); return; }
    if(document.readyState === 'complete') idleLoad();
    else window.addEventListener('load', idleLoad);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__nnFonts = {
    load: function(){ return load('manual'); },
    loaded: function(){ return done; },
    href: HREF
  };
})();
