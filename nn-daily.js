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

  /* ── 달력 ──
     예전 것은 정사각형 칸에 숫자와 점만 찍는 수준이라 너무 단조로웠다.
     지금은 한 장의 카드로 묶고, 칸 안에 그날 글 제목까지 보여 준다. */
  var MON = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
             'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

  /* 오늘(또는 어제)부터 거꾸로 며칠 연달아 썼나 */
  function streak(map){
    var d = new Date(), n = 0;
    if(!map[ymd(d)]) d.setDate(d.getDate() - 1);   /* 오늘 아직 안 썼으면 어제부터 */
    while(map[ymd(d)]){ n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function paint(){
    var box = document.getElementById('dlCal');
    if(!box) return;
    stampNew();

    var y = cur.getFullYear(), m = cur.getMonth();
    var lead = new Date(y, m, 1).getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var map = byDay(), t = todayStr(), i;
    var st = streak(map), total = notes().length;

    var h = '<div class="dl-head">'
      + '<div class="dl-mrow">'
      +   '<button type="button" class="dl-nav" data-go="-1" aria-label="이전 달">‹</button>'
      +   '<span class="dl-y">' + y + '</span>'
      +   '<span class="dl-mon">' + MON[m] + '</span>'
      +   '<button type="button" class="dl-nav" data-go="1" aria-label="다음 달">›</button>'
      +   '<button type="button" class="dl-today" data-d="' + t + '">'
      +     (map[t] ? '오늘 글 열기' : '＋ 오늘 쓰기') + '</button>'
      + '</div>'
      + '<div class="dl-stats">'
      +   '<span class="dl-st"><b>' + monthCount(y, m, map) + '</b>일 이 달</span>'
      +   (st ? '<span class="dl-st dl-fire"><b>' + st + '</b>일 연속</span>' : '')
      +   '<span class="dl-st"><b>' + total + '</b>편 전체</span>'
      + '</div></div>';

    h += '<div class="dl-grid">';
    var wd = ['일','월','화','수','목','금','토'];
    for(i = 0; i < 7; i++){
      h += '<div class="dl-wd' + (i === 0 ? ' sun' : (i === 6 ? ' sat' : '')) + '">' + wd[i] + '</div>';
    }
    for(i = 0; i < lead; i++) h += '<div class="dl-pad"></div>';
    for(i = 1; i <= days; i++){
      var d = y + '-' + pad(m + 1) + '-' + pad(i);
      var note = map[d], dow = (lead + i - 1) % 7;
      var cls = 'dl-day';
      if(note) cls += ' has';
      if(d === t) cls += ' today';
      if(d > t)  cls += ' future';
      if(dow === 0) cls += ' sun';
      if(dow === 6) cls += ' sat';
      h += '<button type="button" class="' + cls + '" data-d="' + d + '"'
         + (note ? ' title="' + escAttr(note.title || '') + '"' : '') + '>'
         + '<span class="dl-n">' + i + '</span>'
         + (note && preview(note) ? '<span class="dl-t">' + esc(preview(note)) + '</span>' : '')
         + (d === t ? '<span class="dl-badge">오늘</span>' : '')
         + '</button>';
    }
    box.innerHTML = h + '</div>';
  }

  /* 칸 안에 보여 줄 한 줄.
     제목이 '2026년 9월 12일' 뿐이면 날짜가 이미 칸에 적혀 있으니 군더더기다.
     그럴 땐 본문 첫 글자들을 대신 보여 준다. 그것도 없으면 왼쪽 색 띠만 남긴다. */
  function preview(note){
    var t = String(note.title || '');
    var m = t.match(/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*(.*)$/);
    var rest = m ? (m[1] || '') : t;
    if(rest.trim()) return cut(rest, 26);
    var body = String(note.content || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ').trim();
    return body ? cut(body, 26) : '';
  }
  function cut(s, n){ return s.length > n ? s.slice(0, n) + '…' : s; }
  function escAttr(s){ return esc(s).replace(/"/g, '&quot;'); }

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
  var C = '194,160,232', H = '#c2a0e8';   /* 일기 색 — HOLDINGS 가 비운 보라 */
  var CSS = [
  /* ══ ① 머리글을 다른 칸과 똑같이 ══
     nn-style.css 에 #page-books·#page-economics… 를 줄줄이 적어 놓은 규칙이 둘 있는데
     (L3214 아이브로우 / L3299 위 여백) 나중에 만든 #page-daily 는 거기 없어서
     혼자 위로 붙고 영문 글자도 작고 얇았다. 같은 값을 여기서 그대로 준다.
     ⚠ nn-style.css 를 고치지 않는다 — 규칙 순서가 바뀌면 안 되는 파일이다. */
  '#page-daily > div:first-child{padding-top:94px!important}',
  '#page-daily > div > div:first-child{font-size:13.5px!important;font-weight:700!important;',
  '  letter-spacing:.35em!important;margin-bottom:.2rem!important;opacity:1!important;',
  '  color:#ddc6f5!important;',
  '  text-shadow:0 2px 6px rgba(0,0,0,.9),0 0 16px rgba(' + C + ',.5)!important}',
  /* 영문 부제목 — 복제본이 ECONOMICS 초록을 들고 오므로 일기 보라로 덮는다 */
  '#page-daily > div:first-child > p:first-of-type:not(.hold-desc){color:#d8c4f0!important;font-weight:600!important;',
  '  text-shadow:0 1px 5px rgba(0,0,0,.9)!important;opacity:1!important}',

  /* ══ ② 달력 ══ */
  /* 폭은 아래 패널과 똑같이 — 양 끝이 한 줄로 떨어져야 정돈돼 보인다 */
  '.dl-cal{max-width:none;margin:48px 0 30px;font-family:\'Pretendard\',sans-serif;',
  '  border-radius:16px;padding:18px 20px 20px;',
  '  background:linear-gradient(180deg,rgba(' + C + ',.07),rgba(10,8,14,.5));',
  '  border:1px solid rgba(' + C + ',.26);',
  '  box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 18px 40px -26px rgba(' + C + ',.8)}',

  '.dl-head{margin-bottom:16px}',
  '.dl-mrow{display:flex;align-items:center;gap:9px;flex-wrap:wrap}',
  '.dl-nav{width:28px;height:28px;border-radius:9px;cursor:pointer;line-height:1;',
  '  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);',
  '  color:rgba(255,255,255,.7);font-size:16px;transition:.15s;flex-shrink:0}',
  '.dl-nav:hover{background:rgba(' + C + ',.2);border-color:rgba(' + C + ',.6);color:' + H + ';',
  '  box-shadow:0 0 14px -4px ' + H + '}',
  '.dl-y{font-family:\'Bebas Neue\',sans-serif;font-size:25px;letter-spacing:.06em;',
  '  color:#fff;line-height:1}',
  '.dl-mon{font-family:\'Bebas Neue\',sans-serif;font-size:14px;letter-spacing:.22em;',
  '  color:' + H + ';text-shadow:0 0 12px rgba(' + C + ',.55);line-height:1;padding-top:3px}',
  '.dl-today{margin-left:auto;cursor:pointer;font-size:12px;font-weight:700;padding:7px 15px;',
  '  border-radius:999px;color:' + H + ';background:rgba(' + C + ',.14);',
  '  border:1px solid rgba(' + C + ',.5);transition:.16s;font-family:inherit;white-space:nowrap}',
  '.dl-today:hover{background:rgba(' + C + ',.3);border-color:' + H + ';color:#fff;',
  '  box-shadow:0 0 20px -5px ' + H + '}',
  '.dl-stats{display:flex;gap:16px;flex-wrap:wrap;margin-top:11px;',
  '  padding-top:11px;border-top:1px solid rgba(255,255,255,.08)}',
  '.dl-st{font-size:11.5px;color:rgba(255,255,255,.45);letter-spacing:.01em}',
  '.dl-st b{font-family:\'Bebas Neue\',sans-serif;font-size:16px;letter-spacing:.04em;',
  '  color:rgba(255,255,255,.92);margin-right:3px}',
  '.dl-fire b{color:' + H + ';text-shadow:0 0 10px rgba(' + C + ',.6)}',

  '.dl-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}',
  '.dl-wd{text-align:center;font-size:10.5px;font-weight:600;letter-spacing:.06em;',
  '  color:rgba(255,255,255,.3);padding-bottom:5px}',
  '.dl-wd.sun{color:rgba(255,140,140,.5)}',
  '.dl-wd.sat{color:rgba(140,180,255,.5)}',
  '.dl-pad{min-height:66px}',

  '.dl-day{position:relative;min-height:66px;display:flex;flex-direction:column;',
  '  align-items:flex-start;gap:3px;cursor:pointer;border-radius:10px;padding:7px 8px;',
  '  background:rgba(255,255,255,.028);border:1px solid rgba(255,255,255,.06);',
  '  font-family:inherit;text-align:left;overflow:hidden;transition:.15s}',
  '.dl-n{font-family:\'Bebas Neue\',sans-serif;font-size:14px;letter-spacing:.04em;',
  '  color:rgba(255,255,255,.5);line-height:1}',
  '.dl-day.sun .dl-n{color:rgba(255,150,150,.62)}',
  '.dl-day.sat .dl-n{color:rgba(150,185,255,.62)}',
  '.dl-day.future{opacity:.55}',
  '.dl-day.future:hover{opacity:1}',
  '.dl-day:hover{background:rgba(' + C + ',.15);border-color:rgba(' + C + ',.55);',
  '  transform:translateY(-2px);opacity:1;',
  '  box-shadow:0 10px 22px -12px ' + H + '}',
  '.dl-day:hover .dl-n{color:#fff}',

  /* 글이 있는 날 — 왼쪽에 색 띠 + 제목 미리보기 */
  '.dl-day.has{background:rgba(' + C + ',.12);border-color:rgba(' + C + ',.34)}',
  '.dl-day.has .dl-n{color:#fff;font-weight:600}',
  '.dl-day.has::before{content:"";position:absolute;left:0;top:6px;bottom:6px;width:3px;',
  '  border-radius:0 3px 3px 0;background:' + H + ';box-shadow:0 0 9px rgba(' + C + ',.9)}',
  '.dl-t{font-size:11px;line-height:1.3;color:rgba(255,255,255,.62);',
  '  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;',
  '  word-break:break-all}',
  '.dl-day.has:hover .dl-t{color:rgba(255,255,255,.92)}',

  /* 오늘 */
  '.dl-day.today{border-color:rgba(255,255,255,.5)}',
  '.dl-day.today .dl-n{color:#fff;font-weight:700}',
  '.dl-badge{position:absolute;right:6px;top:6px;font-size:8.5px;font-weight:700;',
  '  letter-spacing:.06em;color:rgba(10,8,14,.9);background:rgba(255,255,255,.88);',
  '  border-radius:4px;padding:1px 5px;line-height:1.4}',

  /* ══ ③ 첫 화면(흰 배경) 모드 ══ */
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-cal{',
  '  background:linear-gradient(180deg,rgba(255,255,255,.82),rgba(255,255,255,.62));',
  '  border-color:rgba(138,106,36,.34);',
  '  box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 16px 34px -26px rgba(60,45,20,.6)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-mon{color:#7b4fb0;text-shadow:none}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-nav{color:var(--lp-ink2);',
  '  background:rgba(0,0,0,.04);border-color:rgba(138,106,36,.3)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-today{color:#6c41a0;',
  '  background:rgba(' + C + ',.22);border-color:rgba(124,80,176,.55)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-fire b{color:#7b4fb0;text-shadow:none}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-stats{border-top-color:rgba(138,106,36,.25)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-y{color:var(--lp-ink)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-wd{color:var(--lp-ink3)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-st{color:var(--lp-ink3)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-st b{color:var(--lp-ink)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-day{background:rgba(0,0,0,.035);',
  '  border-color:rgba(138,106,36,.2)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-day .dl-n{color:var(--lp-ink2)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-day.has{background:rgba(' + C + ',.22);',
  '  border-color:rgba(' + C + ',.6)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-day.has .dl-n,',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-t{color:var(--lp-ink)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .dl-badge{color:#fff;background:rgba(40,30,20,.85)}',

  /* ══ ④ '새 페이지 추가' 가 안 보이던 문제 ══
     nn-style.css L2559 가 흰 패널용 색(#333·12px·500)을 !important 로 전역에 박아
     큰 흰 패널 위에서 글씨가 묻혔다. 지식 칸 안에서만 또렷하게 올린다. */
  '.kn-pane .add-page-btn{font-size:13px!important;font-weight:700!important;',
  '  color:#1b1b1f!important;background:rgba(0,0,0,.055)!important;',
  '  border:1px dashed rgba(0,0,0,.36)!important;padding:12px 13px!important;',
  '  letter-spacing:.01em!important}',
  '.kn-pane .add-page-btn:hover{background:rgba(0,0,0,.1)!important;color:#000!important;',
  '  border-color:rgba(0,0,0,.6)!important}',
  '.kn-pane .add-group-btn{font-size:12.5px!important;font-weight:700!important;',
  '  color:#8a6a24!important;border-color:rgba(138,106,36,.75)!important}',

  '@media (max-width:760px){',
  '  .dl-cal{max-width:none;padding:14px 13px 15px}',
  '  .dl-grid{gap:3px}',
  '  .dl-day,.dl-pad{min-height:46px}',
  '  .dl-t{display:none}',
  '  .dl-today{margin-left:0;width:100%;text-align:center;margin-top:4px}',
  '}'
  ].join('');
  /* ══ ECONOMICS 칸의 모양을 통째로 물려받는다 ══
     nn-style.css 는 #economics-editor-layout · #page-economics 를 20여 군데에서 따로 꾸민다
     (흰 패널 기둥 · 목록 스크롤 · 그룹 머리 · 부제목 색 · 모바일 …).
     #page-daily 는 그 어느 목록에도 없어서 패널 폭·여백이 혼자 달랐다.
     그래서 불러온 스타일시트를 훑어 economics 규칙을 daily 로 바꿔 한 벌 더 만든다.
     ECONOMICS 쪽 디자인을 나중에 고쳐도 일기가 저절로 따라간다.
     ⚠ 이 복제본을 먼저 넣고, 위의 일기 전용 규칙(보라 색 등)을 **뒤에** 넣어야 색이 안 섞인다. */
  function splitSel(t){
    var out = [], depth = 0, cur = '';
    for(var i = 0; i < t.length; i++){
      var ch = t.charAt(i);
      if(ch === '(') depth++;
      else if(ch === ')') depth--;
      if(ch === ',' && depth === 0){ out.push(cur); cur = ''; } else cur += ch;
    }
    if(cur) out.push(cur);
    return out;
  }
  var RX = /#economics-editor-layout|#page-economics/;
  function swap(sel){
    return sel.replace(/#economics-editor-layout/g, '#daily-editor-layout')
              .replace(/#page-economics/g, '#page-daily');
  }
  function walk(rules, acc){
    for(var i = 0; i < rules.length; i++){
      var r = rules[i];
      if(r.type === 1 && r.selectorText && RX.test(r.selectorText)){
        var keep = splitSel(r.selectorText).filter(function(x){ return RX.test(x); });
        if(keep.length) acc.push(keep.map(function(x){ return swap(x.trim()); }).join(',') + '{' + r.style.cssText + '}');
      } else if(r.type === 4 && r.cssRules){
        var inner = [];
        walk(r.cssRules, inner);
        if(inner.length) acc.push('@media ' + r.conditionText + '{' + inner.join('') + '}');
      }
    }
  }
  var clone = [];
  for(var si = 0; si < document.styleSheets.length; si++){
    var sh = document.styleSheets[si], rs = null;
    try{ rs = sh.cssRules; }catch(e){ rs = null; }   /* 다른 도메인(구글 폰트)은 읽을 수 없다 */
    if(rs) walk(rs, clone);
  }
  if(clone.length){
    var c = document.createElement('style');
    c.id = 'nnDailyClone'; c.textContent = clone.join('\n');
    document.head.appendChild(c);
  }

  var s = document.createElement('style');
  s.id = 'nnDailyCss'; s.textContent = CSS;
  document.head.appendChild(s);
})();

/* ══════════════════════════════════════════════════════════════════════
   그날의 시장 — 일기 본문 위에 붙는 매크로 지표 카드 (2026-09-21)

   무엇을 보여 주나
     나스닥 · S&P500 · 코스피 · 미 10년물 · 원/달러 · WTI 유가 · 금 · 비트코인
     8개를 제목 바로 밑에 카드로 띄운다.

   ⚠ '박제'가 핵심이다
     오늘 글을 열면 실시간으로 받아 note.market 에 저장한다(5분마다 새로).
     날짜가 지나면 더 이상 받지 않고 **그때 저장한 값을 그대로** 보여 준다.
     지난 날의 시세를 나중에 소급해 만들 수는 없으므로(무료 API 한계),
     그날 일기를 한 번도 안 열었으면 그날 시세는 비어 있다 — 그렇다고 솔직히 표시한다.
     note.market 은 nn_knowledge_vault_v2 안에 들어가므로 클라우드 동기화도 된다.

   어디서 받나 — 사이트가 이미 쓰는 경로만 쓴다
     ① 프록시(Worker, 매크로 탭에서 설정) /quote?us=…&crypto=btc  +  /kr
        ^IXIC ^GSPC ^TNX KRW=X CL=F GC=F 를 한 번에
     ② 못 받은 칸만 보충
        비트코인 → CoinGecko  /  금 → CoinGecko PAXG(금 1온스 토큰)  /  환율 → open.er-api
        나머지 → FMP 키가 있으면 FMP
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnDailyMarket) return;

  var T = 'daily', FRESH = 5 * 60 * 1000;
  var ITEMS = [
    {k:'ixic', lb:'나스닥',     en:'NASDAQ',   sym:'^IXIC', dec:2},
    {k:'spx',  lb:'S&P 500',   en:'S&P500',   sym:'^GSPC', dec:2},
    {k:'kospi',lb:'코스피',     en:'KOSPI',    kr:true,     dec:2},
    {k:'tnx',  lb:'미 10년물',  en:'US 10Y',   sym:'^TNX',  dec:3, suf:'%'},
    {k:'krw',  lb:'원/달러',    en:'USD/KRW',  sym:'KRW=X', dec:1, suf:'원'},
    {k:'wti',  lb:'WTI 유가',   en:'CRUDE',    sym:'CL=F',  dec:2, pre:'$'},
    {k:'gold', lb:'금',         en:'GOLD',     sym:'GC=F',  dec:1, pre:'$'},
    {k:'btc',  lb:'비트코인',   en:'BITCOIN',  btc:true,    dec:0, pre:'$'}
  ];
  var FMP = {ixic:'^IXIC', spx:'^GSPC', tnx:'^TNX', wti:'CLUSD', gold:'GCUSD'};

  function KN(){ return window.KnowledgeNotes; }
  function ls(k){ try{ return (localStorage.getItem(k) || '').trim(); }catch(e){ return ''; } }
  function worker(){ return ls('nn_worker_url').replace(/\/+$/, ''); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function ymd(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function num(v){ v = (typeof v === 'string') ? parseFloat(v) : v; return (v == null || isNaN(v)) ? null : Number(v); }

  function get(url, ms){
    return new Promise(function(res){
      var done = false, t = setTimeout(function(){ if(!done){ done = true; res(null); } }, ms || 7000);
      fetch(url).then(function(r){ return r.ok ? r.json() : null; })
        .then(function(j){ if(!done){ done = true; clearTimeout(t); res(j); } })
        .catch(function(){ if(!done){ done = true; clearTimeout(t); res(null); } });
    });
  }

  /* ── 실시간으로 받기 ── */
  function fetchLive(){
    var out = {}, W = worker(), jobs = [];
    function put(k, p, c){
      p = num(p); c = num(c);
      if(p == null || p <= 0) return;
      if(k === 'tnx' && p > 20) p = p / 10;        /* 일부 소스는 42.5 처럼 10배로 준다 */
      out[k] = {p: p, c: c};
    }

    if(W){
      var syms = ITEMS.filter(function(x){ return x.sym; }).map(function(x){ return x.sym; });
      jobs.push(get(W + '/quote?us=' + encodeURIComponent(syms.join(',')) + '&crypto=btc').then(function(d){
        if(!d) return;
        var us = d.us || {}, cr = d.crypto || {};
        ITEMS.forEach(function(x){ if(x.sym && us[x.sym]) put(x.k, us[x.sym].price, us[x.sym].chg); });
        if(cr.btc) put('btc', cr.btc.price, cr.btc.chg);
      }));
      jobs.push(get(W + '/kr').then(function(d){
        if(d && d.kospi) put('kospi', d.kospi.price, d.kospi.chg);
      }));
    }

    return Promise.all(jobs).then(function(){
      var more = [];
      if(!out.btc || !out.gold){
        more.push(get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,pax-gold&vs_currencies=usd&include_24hr_change=true').then(function(d){
          if(!d) return;
          if(!out.btc && d.bitcoin) put('btc', d.bitcoin.usd, d.bitcoin.usd_24h_change);
          if(!out.gold && d['pax-gold']){ put('gold', d['pax-gold'].usd, d['pax-gold'].usd_24h_change); if(out.gold) out.gold.via = 'PAXG'; }
        }));
      }
      if(!out.krw){
        more.push(get('https://open.er-api.com/v6/latest/USD').then(function(d){
          if(d && d.rates && d.rates.KRW) put('krw', d.rates.KRW, null);
        }));
      }
      var key = ls('nn_fmp_key');
      if(key){
        Object.keys(FMP).forEach(function(k){
          if(out[k]) return;
          more.push(get('https://financialmodelingprep.com/stable/quote?symbol=' + encodeURIComponent(FMP[k]) + '&apikey=' + encodeURIComponent(key)).then(function(d){
            var o = Array.isArray(d) ? d[0] : d;
            if(!o) return;
            var c = (o.changePercentage != null) ? o.changePercentage : o.changesPercentage;
            put(k, (o.price != null ? o.price : o.close), c);
          }));
        });
      }
      return Promise.all(more);
    }).then(function(){ return out; });
  }

  /* ── 그리기 ── */
  function fmt(x, v){
    if(!v || v.p == null) return '—';
    var s = v.p.toLocaleString('en-US', {minimumFractionDigits: x.dec, maximumFractionDigits: x.dec});
    return (x.pre || '') + s + (x.suf ? '<small>' + x.suf + '</small>' : '');
  }
  function chg(v){
    if(!v || v.c == null) return '<span class="dm-c dm-flat">&nbsp;</span>';
    var up = v.c > 0, dn = v.c < 0;
    return '<span class="dm-c ' + (up ? 'dm-up' : (dn ? 'dm-dn' : 'dm-flat')) + '">'
      + (up ? '▲ ' : (dn ? '▼ ' : '')) + (v.c > 0 ? '+' : '') + v.c.toFixed(2) + '%</span>';
  }
  function when(ms){
    var d = new Date(ms), wd = ['일','월','화','수','목','금','토'][d.getDay()];
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' (' + wd + ') '
      + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function html(note, state){
    var m = note.market, today = ymd(new Date()), day = note.day || today;
    var h = '<div class="dm-h"><span class="dm-t">MARKET SNAPSHOT</span>';
    if(m && m.at) h += '<span class="dm-at">' + (day === today ? '' : '그날 박제된 시세 · ') + when(m.at) + ' 기준</span>';
    if(day === today){
      h += '<button type="button" class="dm-rf" title="지금 시세로 다시 받기">'
         + (state === 'busy' ? '받는 중…' : '↻ 새로 받기') + '</button>';
    }
    h += '</div>';

    if(!m || !m.items){
      var msg = day > today ? '아직 오지 않은 날입니다. 그날 이 글을 열면 시세가 자동으로 기록됩니다.'
              : (day < today ? '이 날은 시세가 기록되지 않았습니다. 시세는 <b>그날 일기를 열 때</b> 자동으로 박제됩니다.'
              : (state === 'busy' ? '오늘 시세를 받아오는 중입니다…' : '시세를 받지 못했습니다. ↻ 를 눌러 다시 시도해 보세요.'));
      return h + '<div class="dm-empty">' + msg + '</div>';
    }

    h += '<div class="dm-g">';
    ITEMS.forEach(function(x){
      var v = m.items[x.k];
      h += '<div class="dm-k' + (v && (v.p != null || v.c != null) ? '' : ' dm-none') + '">'
        + '<div class="dm-l"><span>' + x.lb + '</span><i>' + (v && v.via ? v.via : x.en) + '</i></div>'
        + '<div class="dm-v">' + fmt(x, v) + '</div>' + chg(v) + '</div>';
    });
    h += '</div>';
    var miss = ITEMS.filter(function(x){ return !(m.items[x.k] && m.items[x.k].p != null); });
    if(miss.length && day === today && !worker()){
      h += '<div class="dm-hint">' + miss.map(function(x){ return x.lb; }).join(' · ')
         + ' 는 <b>매크로 탭에서 프록시(Worker)</b>를 연결하면 채워집니다.</div>';
    }
    return h;
  }

  /* ── 편집기에 붙이기 ── */
  var busy = false;
  function mount(){
    var k = KN();
    if(!k || !k.activeIds) return;
    backfill();
    var id = k.activeIds[T];
    var note = id ? (k.data[T] || []).filter(function(n){ return n.id === id; })[0] : null;
    var area = document.querySelector('#daily-editor-main .editor-scroll-area');
    if(!note || !area) return;

    var box = area.querySelector('.dl-mkt');
    if(!box){
      box = document.createElement('div');
      box.className = 'dl-mkt';
      var title = area.querySelector('.note-title-input');
      area.insertBefore(box, title ? title.nextSibling : area.firstChild);
      box.addEventListener('click', function(e){
        var t = e.target;
        if(t && t.classList && t.classList.contains('dm-rf')) refresh(true);
      });
    }
    box.setAttribute('data-note', note.id);
    box.innerHTML = html(note, busy ? 'busy' : '');

    var today = ymd(new Date());
    if((note.day || today) === today && (!note.market || !note.market.at || Date.now() - note.market.at > FRESH)) refresh(false);
  }

  function refresh(force){
    if(busy) return;
    var k = KN(), id = k && k.activeIds && k.activeIds[T];
    if(!id) return;
    busy = true;
    var box = document.querySelector('#daily-editor-main .dl-mkt');
    if(box){ var b = box.querySelector('.dm-rf'); if(b) b.textContent = '받는 중…'; }
    fetchLive().then(function(items){
      busy = false;
      var note = (k.data[T] || []).filter(function(n){ return n.id === id; })[0];
      if(!note) return;
      var got = Object.keys(items).length;
      if(got){
        /* 이번에 못 받은 칸은 먼저 받아 둔 값을 남긴다 */
        var prev = (note.market && note.market.items) || {};
        Object.keys(prev).forEach(function(x){ if(!items[x]) items[x] = prev[x]; });
        note.market = {at: Date.now(), items: items};
        try{ k.save(); }catch(e){}
      }
      var b2 = document.querySelector('#daily-editor-main .dl-mkt');
      if(b2 && b2.getAttribute('data-note') === id) b2.innerHTML = html(note, '');
    });
  }

  /* 옛 구조화 일기(nn_diary_v1)가 잡아 둔 등락률을 옮겨 온 글에 붙인다 — 한 번만 */
  function backfill(){
    try{
      if(localStorage.getItem('nn_daily_mkt_mig_v1')) return;
      var k = KN(), raw = localStorage.getItem('nn_diary_v1');
      /* 옛 일기를 옮겨 오는 쪽(위 migrate)이 아직 안 끝났으면 다음 기회에 — 순서가 보장되지 않는다 */
      if(!k || !k.data[T] || !k.data[T].length) return;
      localStorage.setItem('nn_daily_mkt_mig_v1', '1');
      if(!raw) return;
      var o = JSON.parse(raw), n = 0;
      k.data[T].forEach(function(note){
        var r = o && note.day && o[note.day], m = r && r.market;
        if(!m || note.market || typeof m !== 'object') return;
        var items = {};
        ['kospi','spx','ixic'].forEach(function(x){ var c = num(m[x]); if(c != null) items[x] = {p: null, c: c}; });
        if(Object.keys(items).length){ note.market = {at: m.at || Date.parse(note.day + 'T16:00:00'), items: items}; n++; }
      });
      if(n) k.save();
    }catch(e){}
  }

  function hook(){
    var k = KN();
    if(!k || !k.renderEditor || k.renderEditor.__nnMktWrapped) return !!(k && k.renderEditor);
    var orig = k.renderEditor;
    var wrapped = function(type){
      var r = orig.apply(this, arguments);
      if(type === T) setTimeout(mount, 0);
      return r;
    };
    wrapped.__nnMktWrapped = true;
    k.renderEditor = wrapped;
    return true;
  }

  (function wait(n){
    if(hook()){ backfill(); return; }
    if(n > 60) return;
    setTimeout(function(){ wait(n + 1); }, 200);
  })(0);

  window.__nnDailyMarket = { mount: mount, refresh: refresh, fetch: fetchLive, items: ITEMS };
})();

(function(){
  'use strict';
  if(document.getElementById('nnDailyMktCss')) return;
  var CSS = [
  /* 편집기 바탕이 흰색이라 카드는 어둡게 — 숫자가 한눈에 튀어 보이게 */
  '.dl-mkt{margin:14px 0 18px;border-radius:14px;padding:14px 16px 13px;',
  '  background:linear-gradient(135deg,#17131f 0%,#0d0c12 100%);',
  '  border:1px solid rgba(194,160,232,.38);font-family:\'Pretendard\',sans-serif;',
  '  box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 12px 28px -16px rgba(30,15,60,.75)}',
  '.dm-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:11px}',
  '.dm-t{font-family:\'Bebas Neue\',sans-serif;font-size:14px;letter-spacing:.24em;',
  '  color:#c2a0e8;text-shadow:0 0 10px rgba(194,160,232,.55)}',
  '.dm-at{font-size:11px;color:rgba(255,255,255,.5);letter-spacing:.02em}',
  '.dm-rf{margin-left:auto;cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;',
  '  padding:5px 11px;border-radius:999px;color:#d8c4f0;background:rgba(194,160,232,.12);',
  '  border:1px solid rgba(194,160,232,.45);transition:.15s}',
  '.dm-rf:hover{background:rgba(194,160,232,.26);color:#fff}',
  '.dm-g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}',
  '.dm-k{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);',
  '  border-radius:10px;padding:9px 11px 8px;min-width:0}',
  '.dm-k.dm-none{opacity:.45}',
  '.dm-l{display:flex;align-items:baseline;justify-content:space-between;gap:6px}',
  '.dm-l span{font-size:11.5px;font-weight:600;color:rgba(255,255,255,.72);white-space:nowrap}',
  '.dm-l i{font-style:normal;font-family:\'Bebas Neue\',sans-serif;font-size:10px;',
  '  letter-spacing:.12em;color:rgba(255,255,255,.3);white-space:nowrap}',
  '.dm-v{font-family:\'Bebas Neue\',sans-serif;font-size:24px;letter-spacing:.03em;',
  '  color:#fff;line-height:1.1;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.dm-v small{font-size:13px;margin-left:2px;color:rgba(255,255,255,.55)}',
  '.dm-c{display:block;font-size:11.5px;font-weight:700;margin-top:1px;font-variant-numeric:tabular-nums}',
  '.dm-up{color:#4ade80}',
  '.dm-dn{color:#ff5b5b}',
  '.dm-flat{color:rgba(255,255,255,.4)}',
  '.dm-empty{font-size:12.5px;line-height:1.6;color:rgba(255,255,255,.62);padding:6px 2px}',
  '.dm-empty b,.dm-hint b{color:#d8c4f0}',
  '.dm-hint{margin-top:9px;font-size:11px;color:rgba(255,255,255,.45)}',
  '@media (max-width:760px){',
  '  .dm-g{grid-template-columns:repeat(2,1fr)}',
  '  .dm-v{font-size:21px}',
  '}'
  ].join('');
  var s = document.createElement('style');
  s.id = 'nnDailyMktCss'; s.textContent = CSS;
  document.head.appendChild(s);
})();
