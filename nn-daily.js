/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 투자 일기 (nn-daily.js)

   무엇인가
     NOTES 안의 다섯 번째 칸. 오늘 배운 이론, 눈에 띈 경제 이슈,
     어떤 기업에 대한 생각 — 형식 없이 적는 공간이다.

   왜 새로 만들었나
     먼저 만든 일기(nn-diary.js)는 '오늘 무엇을 봤나 / 충동 / 행동' 처럼
     매매 충동을 다스리는 칸으로 짜여 있었다.
     쓰고 싶은 건 그게 아니라 그냥 자유로운 기록이었다.
     그래서 BOOKS·LEXICON 과 똑같은 자유 편집기를 쓰고,
     쓸모 있던 '달력' 하나만 위에 남겼다.

   어떻게 만들었나 — 엔진을 새로 짜지 않았다
     KnowledgeNotes 는 타입 문자열만 주면 무엇이든 담는다.
     (data[type] / groups[type] / activeIds[type] 세 칸만 있으면 된다)
     그래서 'daily' 라는 타입을 하나 더 만들고,
     index.html 에 #daily-editor-layout · #daily-sidebar-list · #daily-editor-main
     세 id 만 기존 칸과 똑같은 구조로 넣었다.

   ⚠ KnowledgeNotes.init() 은 저장본을 통째로 this.data 에 덮어쓰고
     (nn-core.js:1937) 기본 타입 보정은 books·lexicon·economics·media 넷뿐이다
     (nn-core.js:1979). 그래서 'daily' 칸은 **여기서 직접 마련**해 줘야 한다.

   날짜는 note.day 에 둔다 — note.date 를 쓰면 안 된다
     note.date 는 '고친 시각'이라 글을 손볼 때마다 값이 바뀐다.
     일기를 그걸로 달력에 꽂으면 어제 글이 오늘로 옮겨간다.
     그래서 'YYYY-MM-DD' 를 note.day 에 따로 박아 둔다.
     nn_knowledge_vault_v2 안에 같이 들어가므로 클라우드 동기화도 그대로 된다.

   로딩 순서: … → nn-backup.js → nn-wealth.js → nn-daily.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnDaily) return;

  var T = 'daily';
  var MIG = 'nn_daily_mig_v1';
  var cur = new Date();                       /* 달력이 보고 있는 달 */

  function KN(){ return window.KnowledgeNotes; }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function ymd(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr(){ return ymd(new Date()); }

  /* ── 'daily' 칸 마련 ── */
  function ensureBucket(){
    var k = KN();
    if(!k || !k.data) return false;
    if(!k.data[T]) k.data[T] = [];
    if(!k.groups) k.groups = {};
    if(!k.groups[T]) k.groups[T] = [];
    if(!k.activeIds) k.activeIds = {};
    if(k.activeIds[T] === undefined) k.activeIds[T] = null;
    return true;
  }

  /* ── 옛 일기(nn_diary_v1)를 한 번만 옮겨 온다 ──
     구조화된 칸(봤다/충동/행동)을 문장으로 풀어 본문에 넣는다.
     원본은 지우지 않는다. 되돌릴 일이 있으면 백업에서 그대로 꺼낼 수 있다. */
  function migrate(){
    try{
      if(localStorage.getItem(MIG)) return;
      var raw = localStorage.getItem('nn_diary_v1');
      localStorage.setItem(MIG, '1');
      if(!raw) return;
      var o = JSON.parse(raw);
      if(!o || typeof o !== 'object') return;

      var k = KN(), days = Object.keys(o).sort(), n = 0;
      for(var i = 0; i < days.length; i++){
        var d = days[i], r = o[d];
        if(!r) continue;
        var body = '';
        if(r.saw && r.saw.length){
          body += '<p><b>오늘 무엇을 봤나</b></p><ul>';
          for(var j = 0; j < r.saw.length; j++) body += '<li>' + esc(r.saw[j]) + '</li>';
          body += '</ul>';
        }
        if(r.note)    body += '<p>' + esc(r.note).replace(/\n/g, '<br>') + '</p>';
        if(r.impulse) body += '<p><b>충동</b> · ' + esc(r.impulse) + '</p>';
        if(r.action)  body += '<p><b>행동</b> · ' + esc(r.action) + '</p>';
        if(!body) continue;

        /* 같은 id 가 이미 있으면 건너뛴다.
           다른 기기에서 옮긴 결과가 클라우드로 먼저 들어와 있을 수 있다. */
        var mid = 'note_mig_' + d.replace(/-/g, ''), dup = false;
        for(var q = 0; q < k.data[T].length; q++){ if(k.data[T][q].id === mid){ dup = true; break; } }
        if(dup) continue;

        k.data[T].push({
          id: mid,
          title: title(d),
          content: body,
          date: d.replace(/-/g, '.') + ' 00:00',
          day: d,
          groupId: null,
          icon: '📔'
        });
        n++;
      }
      if(n){ k.data[T].sort(byDayDesc); k.save(); }
    }catch(e){}
  }

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function title(d){
    var p = d.split('-');
    return p[0] + '년 ' + (+p[1]) + '월 ' + (+p[2]) + '일';
  }
  function byDayDesc(a, b){ return String(b.day || '').localeCompare(String(a.day || '')); }

  /* ── 날짜 → 글 ── */
  function notes(){ var k = KN(); return (k && k.data && k.data[T]) || []; }
  function byDay(){
    var m = {}, a = notes();
    for(var i = 0; i < a.length; i++){
      var d = a[i].day;
      if(d && !m[d]) m[d] = a[i];
    }
    return m;
  }

  /* 그날 글을 연다. 없으면 만든다. */
  function open(day){
    var k = KN();
    if(!k) return;
    ensureBucket();
    var hit = byDay()[day];
    if(hit){ k.select(T, hit.id); paint(); return; }

    var note = {
      id: 'note_' + Date.now(),
      title: title(day),
      content: '',
      date: day.replace(/-/g, '.') + ' 00:00',
      day: day,
      groupId: null,
      icon: '📔'
    };
    k.data[T].unshift(note);
    k.data[T].sort(byDayDesc);
    k.save();
    k.select(T, note.id);
    paint();
  }

  /* 사이드바의 '+ 새 페이지' 로 만든 글에는 day 가 없다. 오늘로 채워 준다. */
  function stampNew(){
    var a = notes(), touched = false;
    for(var i = 0; i < a.length; i++){
      if(!a[i].day){ a[i].day = todayStr(); touched = true; }
    }
    if(touched){ var k = KN(); if(k){ a.sort(byDayDesc); k.save(); } }
  }

  /* ── 달력 ── */
  function paint(){
    var box = document.getElementById('dlCal');
    if(!box) return;
    stampNew();

    var y = cur.getFullYear(), m = cur.getMonth();
    var first = new Date(y, m, 1), lead = first.getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var map = byDay(), t = todayStr(), i;

    var h = '<div class="dl-cal-top">'
      + '<button type="button" class="dl-nav" data-go="-1">‹</button>'
      + '<span class="dl-mon">' + y + '. ' + pad(m + 1) + '</span>'
      + '<button type="button" class="dl-nav" data-go="1">›</button>'
      + '<button type="button" class="dl-today" data-d="' + t + '">오늘 쓰기</button>'
      + '<span class="dl-count">이 달 ' + monthCount(y, m, map) + '일 기록</span>'
      + '</div><div class="dl-grid">';

    var wd = ['일','월','화','수','목','금','토'];
    for(i = 0; i < 7; i++) h += '<div class="dl-wd">' + wd[i] + '</div>';
    for(i = 0; i < lead; i++) h += '<div class="dl-pad"></div>';
    for(i = 1; i <= days; i++){
      var d = y + '-' + pad(m + 1) + '-' + pad(i);
      var cls = 'dl-day' + (map[d] ? ' has' : '') + (d === t ? ' today' : '');
      h += '<button type="button" class="' + cls + '" data-d="' + d + '">'
         + '<span class="dl-n">' + i + '</span>'
         + (map[d] ? '<span class="dl-dot"></span>' : '') + '</button>';
    }
    box.innerHTML = h + '</div>';
  }

  function monthCount(y, m, map){
    var p = y + '-' + pad(m + 1) + '-', n = 0;
    for(var k in map) if(map.hasOwnProperty(k) && k.indexOf(p) === 0) n++;
    return n;
  }

  function bind(){
    var box = document.getElementById('dlCal');
    if(!box || box.__nnBound) return;
    box.__nnBound = true;
    box.addEventListener('click', function(e){
      var t = e.target;
      while(t && t !== box && !t.getAttribute) t = t.parentNode;
      while(t && t !== box && !t.hasAttribute('data-d') && !t.hasAttribute('data-go')) t = t.parentNode;
      if(!t || t === box) return;
      if(t.hasAttribute('data-go')){
        cur = new Date(cur.getFullYear(), cur.getMonth() + (+t.getAttribute('data-go')), 1);
        paint();
        return;
      }
      open(t.getAttribute('data-d'));
    });
  }

  /* 글을 지우거나 새로 만들면 달력도 다시 그린다 */
  function hookRender(){
    var k = KN();
    if(!k || k.renderSidebar.__nnDailyWrapped) return;
    var orig = k.renderSidebar;
    var wrapped = function(type){
      var r = orig.apply(this, arguments);
      if(type === T) setTimeout(paint, 0);
      return r;
    };
    wrapped.__nnDailyWrapped = true;
    k.renderSidebar = wrapped;
  }

  function boot(){
    var tries = 0;
    (function wait(){
      if(KN() && KN().data){
        ensureBucket();
        migrate();
        hookRender();
        bind();
        paint();
        return;
      }
      if(++tries > 60) return;
      setTimeout(wait, 200);
    })();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__nnDaily = { open: open, paint: paint, type: T, today: todayStr };
})();

/* ── 스타일 — 파일이 직접 주입 (nn-style.css 순서 불변) ── */
(function(){
  'use strict';
  if(document.getElementById('nnDailyCss')) return;
  var C = '194,160,232', H = '#c2a0e8';      /* 일기 색 — HOLDINGS 가 비운 보라를 물려받았다 */
  var CSS = [
  '.dl-cal{max-width:520px;margin:22px 0 26px;font-family:\'Pretendard\',sans-serif}',
  '.dl-cal-top{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap}',
  '.dl-nav{width:26px;height:26px;border-radius:7px;cursor:pointer;line-height:1;',
  '  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);',
  '  color:rgba(255,255,255,.75);font-size:15px;transition:.15s}',
  '.dl-nav:hover{background:rgba(' + C + ',.18);border-color:rgba(' + C + ',.5);color:' + H + '}',
  '.dl-mon{font-family:\'Bebas Neue\',sans-serif;font-size:17px;letter-spacing:.1em;',
  '  color:rgba(255,255,255,.9);min-width:74px}',
  '.dl-today{margin-left:4px;cursor:pointer;font-size:12px;font-weight:600;padding:5px 12px;',
  '  border-radius:999px;color:' + H + ';background:rgba(' + C + ',.13);',
  '  border:1px solid rgba(' + C + ',.45);transition:.16s;font-family:inherit}',
  '.dl-today:hover{background:rgba(' + C + ',.26);border-color:' + H + ';',
  '  box-shadow:0 0 16px -4px ' + H + '}',
  '.dl-count{margin-left:auto;font-size:11.5px;color:rgba(255,255,255,.42)}',
  '.dl-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}',
  '.dl-wd{text-align:center;font-size:10.5px;color:rgba(255,255,255,.32);padding-bottom:3px}',
  '.dl-pad{aspect-ratio:1}',
  '.dl-day{position:relative;aspect-ratio:1;display:flex;flex-direction:column;',
  '  align-items:center;justify-content:center;gap:2px;cursor:pointer;border-radius:8px;',
  '  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);',
  '  color:rgba(255,255,255,.55);font-size:12.5px;font-family:inherit;transition:.14s}',
  '.dl-day:hover{background:rgba(' + C + ',.16);border-color:rgba(' + C + ',.5);color:#fff;',
  '  transform:translateY(-1px)}',
  '.dl-day.has{color:#fff;background:rgba(' + C + ',.1);border-color:rgba(' + C + ',.32)}',
  '.dl-day.today{border-color:rgba(255,255,255,.45)}',
  '.dl-day.today .dl-n{font-weight:700}',
  '.dl-dot{width:4px;height:4px;border-radius:50%;background:' + H + ';',
  '  box-shadow:0 0 6px ' + H + '}',
  /* 첫 화면(흰 배경) 모드 */
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-day{background:rgba(0,0,0,.03);',
  '  border-color:rgba(138,106,36,.2);color:var(--lp-ink3)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-mon,',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-wd{color:var(--lp-ink3)}',
  '@media (max-width:760px){ .dl-cal{max-width:none} }'
  ].join('');
  var s = document.createElement('style');
  s.id = 'nnDailyCss'; s.textContent = CSS;
  document.head.appendChild(s);
})();
