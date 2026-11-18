/* ══════════════════════════════════════════════════════════════════
   NEWNORMAL — 용어 복습과 단어 보드 (nn-srs.js)   2026-11 신설

   ① 잊을 때쯤 다시 나오는 복습 (개선제안 R-1)
      예전 VOCAB QUIZ 는 단어를 무작위로 한 장 뽑아 뜻을 가렸다 보여 주는 것까지였다.
      이제 답을 본 뒤 [다시 · 어려움 · 알맞음 · 쉬움] 을 누르면 그 단어의 다음 복습일이 정해진다.
      퀴즈는 '오늘 볼 차례인 단어'만 낸다. 다 보면 "오늘 복습 끝"과 내일 볼 개수가 나온다.

      저장: 용어 노트 안의 note.srs = { due:'YYYY-MM-DD', ivl:일수, ease:배수, reps:횟수, lapses:틀린 횟수, last:'YYYY-MM-DD' }
            노트 안에 있으므로 클라우드 동기화 · 백업에 그대로 따라간다. 원본 코드는 이 칸을 무시한다(지우지 않는다).
      계산: SM-2 를 단순하게 줄인 것 — 처음 '알맞음'은 1일 → 3일 → 그다음부터 간격 × 쉬움 정도(ease, 1.3~3.0).
            '다시'는 오늘 한 번 더, 다음 간격은 1일로. 나중에 FSRS 로 바꿀 수 있게 ease·reps·lapses 를 남겨 둔다.
      카드의 ○ ✓ ✕ 표시와도 이어진다: 간격이 21일을 넘으면 ✓(외웠어요), '다시'를 누르면 ✕(헷갈려요).
      새 단어는 하루 15개까지만 섞는다(복습이 쌓이지 않게). 범위 칩으로 그룹(경제 · 일반 · 영어 …)을 고를 수 있다.
      window.__nnSrs.dueCount() 를 홈의 '돌아볼 것'(nn-review.js)과 빠른 실행 줄이 쓴다.

   ② 단어 보드 (개선제안 V-4)
      · 세 칸이 내용 길이에 맞게 (예전에는 가장 긴 칸에 맞춰 흰 면이 길게 늘어났다)
      · LOOK UP 칸에 글자를 치면 내 사전 카드가 바로 걸러진다 — 이미 저장한 말을 또 찾지 않게
      · 정렬(기본 · 최근 · 가나다 · 복습 차례) · 보기(카드 · 목록) — 이 기기에 기억 (nn_lex_view_v1)
        정렬은 화면에서만 바꾼다. 저장된 순서(끌어서 옮긴 순서)는 그대로다.

   로딩 순서: … → nn-settings.js → nn-srs.js → nn-capture.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__nnSrs) return;

  var NEW_PER_DAY = 15;
  var DAY_KEY = 'nn_srs_day_v1';      /* { day, newDone } 오늘 새로 본 단어 수 (이 기기) */
  var SCOPE_KEY = 'nn_srs_scope_v1';  /* 복습 범위: '' = 전체, 그 밖에는 그룹 id */
  var VIEW_KEY = 'nn_lex_view_v1';    /* { sort, view } */

  function KN(){ return window.KnowledgeNotes; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function dstr(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today(){ return dstr(new Date()); }
  function addDays(s, n){ var p = s.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() + n); return dstr(d); }
  function daysBetween(a, b){ var pa = a.split('-'), pb = b.split('-'); return Math.round((new Date(+pb[0], +pb[1]-1, +pb[2]) - new Date(+pa[0], +pa[1]-1, +pa[2])) / 86400000); }
  function lsGet(k, d){ try { var v = localStorage.getItem(k); return v == null ? d : v; } catch(e) { return d; } }
  function lsSet(k, v){ try { localStorage.setItem(k, v); } catch(e) {} }
  function plain(html){ return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }

  /* ── 대상 단어 ── */
  function valid(n){
    if (!n || !n.id) return false;
    var t = String(n.title || '').trim();
    if (!t || t === '새로운 용어 혹은 단어 기입') return false;
    return !!plain(n.content);
  }
  function scope(){ return lsGet(SCOPE_KEY, ''); }
  function groupOf(n){
    var k = KN(), gs = (k && k.groups && k.groups.lexicon) || [], id = n.groupId, guard = 0;
    /* 하위 토글이면 맨 위 그룹으로 */
    while (id && guard++ < 10){
      var g = null; for (var i = 0; i < gs.length; i++){ if (gs[i].id === id){ g = gs[i]; break; } }
      if (!g || !g.parentId) return id;
      id = g.parentId;
    }
    return id || '';
  }
  function pool(){
    var k = KN(); if (!k || !k.data) return [];
    var sc = scope();
    return (k.data.lexicon || []).filter(function(n){ return valid(n) && (!sc || groupOf(n) === sc); });
  }
  function dayState(){
    var s = null; try { s = JSON.parse(lsGet(DAY_KEY, 'null')); } catch(e) {}
    if (!s || s.day !== today()) s = { day: today(), newDone: 0 };
    return s;
  }
  function isDue(n, t){ return !!(n.srs && n.srs.due && n.srs.due <= t); }
  function isNew(n){ return !n.srs || !n.srs.due; }

  /* 오늘 볼 차례: 복습할 것(밀린 순) + 새 단어(하루 한도 안에서, 오래된 것부터) */
  var again = [];   /* 이번 시간에 '다시'를 누른 단어 id — 끝에 한 번 더 */
  function queue(){
    var t = today(), all = pool();
    var due = all.filter(function(n){ return isDue(n, t); })
      .sort(function(a, b){ return a.srs.due < b.srs.due ? -1 : a.srs.due > b.srs.due ? 1 : 0; });
    var left = Math.max(0, NEW_PER_DAY - dayState().newDone);
    var fresh = all.filter(isNew).slice().reverse().slice(0, left);   /* 목록은 최근 것이 앞 — 오래된 것부터 */
    var q = due.concat(fresh);
    /* '다시'를 누른 단어는 맨 뒤로 */
    var ids = {}; again.forEach(function(id){ ids[id] = 1; });
    var head = q.filter(function(n){ return !ids[n.id]; });
    var tail = all.filter(function(n){ return ids[n.id]; });
    return head.concat(tail);
  }
  function counts(){
    var t = today(), all = pool(), due = 0, fresh = 0, tomorrow = 0, t1 = addDays(t, 1);
    all.forEach(function(n){
      if (isDue(n, t)) due++;
      else if (isNew(n)) fresh++;
      else if (n.srs.due <= t1) tomorrow++;
    });
    var left = Math.max(0, NEW_PER_DAY - dayState().newDone);
    return { due: due, fresh: Math.min(fresh, left), tomorrow: tomorrow, total: all.length };
  }
  /* 범위와 무관하게 전체에서 오늘 볼 개수 — 홈의 '돌아볼 것'용 */
  function dueAll(){
    var k = KN(); if (!k || !k.data) return 0;
    var t = today(), n = 0;
    (k.data.lexicon || []).forEach(function(x){ if (valid(x) && isDue(x, t)) n++; });
    return n;
  }

  /* ── 간격 계산 ── */
  function plan(n, grade){
    var s = n.srs || {}, reps = s.reps || 0, ivl = s.ivl || 0, ease = s.ease || 2.5;
    var out = { ease: ease, ivl: 0, reps: reps + 1, lapses: s.lapses || 0 };
    if (grade === 'again'){
      out.ivl = 0; out.lapses++; out.ease = Math.max(1.3, ease - 0.2); out.reps = 0;
    } else if (reps === 0){
      out.ivl = { hard: 1, good: 1, easy: 4 }[grade];
      if (grade === 'easy') out.ease = Math.min(3, ease + 0.15);
    } else if (reps === 1){
      out.ivl = { hard: 2, good: 3, easy: 6 }[grade];
      if (grade === 'hard') out.ease = Math.max(1.3, ease - 0.15);
      if (grade === 'easy') out.ease = Math.min(3, ease + 0.15);
    } else {
      if (grade === 'hard'){ out.ivl = Math.max(ivl + 1, Math.round(ivl * 1.2)); out.ease = Math.max(1.3, ease - 0.15); }
      else if (grade === 'good'){ out.ivl = Math.max(ivl + 1, Math.round(ivl * ease)); }
      else { out.ivl = Math.max(ivl + 2, Math.round(ivl * ease * 1.3)); out.ease = Math.min(3, ease + 0.15); }
    }
    out.ivl = Math.min(out.ivl, 3650);
    return out;
  }
  function label(d){
    if (d <= 0) return '오늘 다시';
    if (d < 30) return d + '일';
    if (d < 365) return Math.round(d / 30) + '달';
    return (Math.round(d / 36.5) / 10) + '년';
  }
  function rate(n, grade){
    var k = KN(); if (!k || !n) return;
    var wasNew = isNew(n), p = plan(n, grade), t = today();
    n.srs = { due: addDays(t, p.ivl), ivl: p.ivl, ease: Math.round(p.ease * 100) / 100, reps: p.reps, lapses: p.lapses, last: t };
    /* 카드의 ○ ✓ ✕ 와 잇는다 */
    if (grade === 'again') n.mem = 'hard';
    else if (p.ivl >= 21) n.mem = 'known';
    else if (n.mem === 'hard' && grade !== 'hard') n.mem = '';
    if (wasNew){ var ds = dayState(); ds.newDone++; lsSet(DAY_KEY, JSON.stringify(ds)); }
    var i = again.indexOf(n.id);
    if (grade === 'again'){ if (i < 0) again.push(n.id); }
    else if (i >= 0) again.splice(i, 1);
    try { k.save(); } catch(e) {}
    /* 카드 표시(✓ ✕)도 바로 맞춘다 */
    try {
      var card = document.getElementById('item-' + n.id);
      if (card){
        card.classList.remove('mem-known', 'mem-hard');
        if (n.mem === 'known') card.classList.add('mem-known'); else if (n.mem === 'hard') card.classList.add('mem-hard');
        var mb = card.querySelector('.lex-mem'); if (mb) mb.innerHTML = n.mem === 'known' ? '✓' : (n.mem === 'hard' ? '✕' : '○');
      }
    } catch(e) {}
    try { if (window.__nnReviewRender) window.__nnReviewRender(); } catch(e) {}
  }

  /* ── 퀴즈 화면 ── */
  var CSS = [
  '.lex-quiz .lq-scope{display:flex;flex-wrap:wrap;gap:5px;margin:2px 0 10px}',
  '.lex-quiz .lq-sc{cursor:pointer;font:600 11px \'Pretendard\',sans-serif;padding:4px 9px;border-radius:999px;line-height:1.2;',
  '  color:rgba(240,237,230,.6);background:transparent;border:1px solid rgba(255,255,255,.14)}',
  '.lex-quiz .lq-sc.on{color:#14120f;background:#e0dcd2;border-color:#e0dcd2}',
  '.lex-quiz .lq-count{font:600 11px \'Pretendard\',sans-serif;color:rgba(240,237,230,.55);white-space:nowrap}',
  '.lex-quiz .lq-count b{color:#e8c47e;font-weight:700}',
  '.lex-quiz .lq-rate{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:2px}',
  '.lex-quiz .lq-r{cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px 7px;border-radius:9px;',
  '  font:700 12px \'Pretendard\',sans-serif;color:#f0ede6;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);transition:background-color .15s,border-color .15s}',
  '.lex-quiz .lq-r small{font-size:11px;font-weight:500;color:rgba(240,237,230,.55)}',
  '.lex-quiz .lq-r:hover{background:rgba(255,255,255,.1)}',
  '.lex-quiz .lq-r[data-g="again"]{border-color:rgba(255,107,107,.45)}.lex-quiz .lq-r[data-g="again"]:hover{background:rgba(255,107,107,.14)}',
  '.lex-quiz .lq-r[data-g="good"]{border-color:rgba(232,196,126,.5)}.lex-quiz .lq-r[data-g="good"]:hover{background:rgba(232,196,126,.14)}',
  '.lex-quiz .lq-r[data-g="easy"]{border-color:rgba(74,222,128,.45)}.lex-quiz .lq-r[data-g="easy"]:hover{background:rgba(74,222,128,.12)}',
  '.lex-quiz .lq-done{text-align:center;padding:12px 4px 4px;font:500 12.5px/1.7 \'Pretendard\',sans-serif;color:rgba(240,237,230,.72)}',
  '.lex-quiz .lq-done b{display:block;font-size:15px;color:#f0ede6;margin-bottom:2px}',
  '.lex-quiz .lq-more{margin-top:9px;cursor:pointer;font:600 12px \'Pretendard\',sans-serif;padding:7px 12px;border-radius:8px;color:#f0ede6;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16)}',
  '.lex-quiz .lq-kbd{margin-top:8px;text-align:center;font:500 11px \'Pretendard\',sans-serif;color:rgba(240,237,230,.38)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .lex-quiz .lq-sc.on{color:#fff;background:#3d3a33;border-color:#3d3a33}',

  /* 단어 보드 */
  /* V-4: 칸 높이를 내용에 맞춘다. 세 칸은 가장 긴 칸에 맞춰 같은 높이(최소 420px · 최대 1100px — 넘치면 칸 안에서 스크롤).
     휴대폰(900px 이하)은 nn-style.css 의 원래 규칙(340px ~ 70vh)을 그대로 쓴다. */
  '@media (min-width:901px){',
  '#lexicon-editor-layout:not(.editing){height:auto!important;max-height:none!important}',
  '#lexicon-editor-layout:not(.editing) .editor-sidebar{height:auto!important;max-height:none!important;overflow:visible!important}',
  '#lexicon-editor-layout:not(.editing) #lexicon-sidebar-list{height:auto!important;max-height:none!important;align-items:stretch!important}',
  '#lexicon-editor-layout:not(.editing) #lexicon-sidebar-list > .note-group{height:auto!important;min-height:420px!important;max-height:1100px!important}',
  '#lexicon-editor-layout:not(.editing) .nnsb-side{display:none!important}',
  '}',
  '#lexicon-editor-layout:not(.editing) #lexicon-sidebar-list > .note-group > .note-group-body{min-height:0!important}',
  '#lxBar{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:0 0 12px;font:600 12px \'Pretendard\',sans-serif;color:rgba(240,237,230,.55)}',
  '#lxBar .lx-g{display:inline-flex;align-items:center;gap:4px}',
  '#lxBar button{cursor:pointer;font:600 12px \'Pretendard\',sans-serif;padding:5px 10px;border-radius:7px;color:rgba(240,237,230,.72);background:transparent;border:1px solid rgba(255,255,255,.14)}',
  '#lxBar button.on{color:#14120f;background:#e0dcd2;border-color:#e0dcd2}',
  '#lxBar .lx-n{margin-left:auto;color:rgba(240,237,230,.5)}',
  '#lkMine{margin:8px 2px 0;font:600 12.5px \'Pretendard\',sans-serif;color:rgba(240,237,230,.72);cursor:pointer}',
  '#lkMine b{color:#e8c47e}',
  '#lkMine[hidden]{display:none}',
  '.lex-card.lx-hide{display:none!important}',
  '.lex-card.lx-hit{box-shadow:0 0 0 2px rgba(232,196,126,.75)!important}',
  /* 목록 보기 — 한 줄에 단어와 뜻 */
  '#lexicon-sidebar-list.lx-list .note-group-body,#lexicon-sidebar-list.lx-list .note-ungrouped{grid-template-columns:1fr!important;gap:6px!important}',
  '#lexicon-sidebar-list.lx-list .lex-card{display:flex!important;flex-direction:row!important;align-items:baseline;gap:10px;padding:8px 34px 8px 12px!important;min-height:0!important}',
  '#lexicon-sidebar-list.lx-list .lex-card .lex-term{flex:0 0 auto;max-width:45%;font-size:13.5px!important;margin:0!important}',
  '#lexicon-sidebar-list.lx-list .lex-card .lex-def{flex:1 1 auto;min-width:0;margin:0!important;font-size:12.5px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '#lexicon-sidebar-list.lx-list .lex-card .lex-def:focus{white-space:normal}',
  '#lexicon-sidebar-list.lx-list .lex-card .lex-actions{top:50%!important;transform:translateY(-50%)}',
  '#lexicon-sidebar-list.lx-list .lex-card .lex-mem{display:none}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) #lxBar button.on{color:#fff;background:#3d3a33;border-color:#3d3a33}'
  ].join('\n');
  function injectCss(){
    if (document.getElementById('nnSrsCss')) return;
    var st = document.createElement('style'); st.id = 'nnSrsCss'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  var state = { cur: null, shown: false, practice: false };
  function groupsTop(){
    var k = KN(); return ((k && k.groups && k.groups.lexicon) || []).filter(function(g){ return !g.parentId; });
  }
  function gname(id){
    var gs = groupsTop();
    for (var i = 0; i < gs.length; i++) if (gs[i].id === id) return String(gs[i].name || '').replace(/\s*[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}️]+\s*$/u, '').trim();
    return '';
  }

  function build(){
    injectCss();
    var gp = document.createElement('div'); gp.className = 'bk-goal lex-quiz';
    var c = counts(), q = queue(), sc = scope();
    var chips = '<button type="button" class="lq-sc' + (sc ? '' : ' on') + '" data-sc="">전체</button>'
      + groupsTop().map(function(g){ return '<button type="button" class="lq-sc' + (sc === g.id ? ' on' : '') + '" data-sc="' + esc(g.id) + '">' + esc(gname(g.id) || '그룹') + '</button>'; }).join('');
    var top = '<div class="bk-goal-top"><span class="t">📝 VOCAB QUIZ</span>'
      + '<span class="lq-count">복습 <b>' + c.due + '</b> · 새 단어 <b>' + c.fresh + '</b></span></div>'
      + '<div class="lq-scope">' + chips + '</div>';

    if (!c.total){
      gp.innerHTML = top + '<div class="lq-empty">' + (sc ? '이 그룹에는 아직 뜻이 적힌 단어가 없어요.' : '어휘를 등록하면<br>이곳에서 복습할 수 있어요.') + '</div>';
      wire(gp); return gp;
    }

    var cur = state.cur;
    if (state.practice){
      var all = pool();
      if (!cur || all.indexOf(cur) < 0){ cur = all[Math.floor(Math.random() * all.length)]; state.cur = cur; state.shown = false; }
    } else {
      if (!cur || q.indexOf(cur) < 0){ cur = q[0] || null; state.cur = cur; state.shown = false; }
    }

    if (!cur){
      gp.innerHTML = top + '<div class="lq-done"><b>오늘 복습 끝 🎉</b>'
        + (c.tomorrow ? '내일 복습할 단어 ' + c.tomorrow + '개' : '다음 복습 날짜가 되면 여기에 나옵니다') + '<br>'
        + '<button type="button" class="lq-more">그래도 더 보기 (기록 안 함)</button></div>';
      wire(gp); return gp;
    }

    var tag = gname(groupOf(cur));
    var def = plain(cur.content);
    var shown = state.shown;
    var btns;
    if (!shown){
      btns = '<div class="lq-btns"><button type="button" class="lq-b lq-show">정답 보기</button>'
        + (state.practice ? '<button type="button" class="lq-b lq-next">다음 단어 →</button>' : '') + '</div>';
    } else if (state.practice){
      btns = '<div class="lq-btns"><button type="button" class="lq-b lq-next">다음 단어 →</button><button type="button" class="lq-b lq-back">복습으로</button></div>';
    } else {
      btns = '<div class="lq-rate">' + ['again', 'hard', 'good', 'easy'].map(function(g){
        var nm = { again:'다시', hard:'어려움', good:'알맞음', easy:'쉬움' }[g];
        return '<button type="button" class="lq-r" data-g="' + g + '">' + nm + '<small>' + label(plan(cur, g).ivl) + '</small></button>';
      }).join('') + '</div><div class="lq-kbd">자판 1 · 2 · 3 · 4</div>';
    }
    gp.innerHTML = top
      + (tag || state.practice ? '<div class="lq-tagrow">' + (tag ? '<span class="lq-tag">' + esc(tag) + '</span>' : '') + (state.practice ? '<span class="lq-tag">연습 · 기록 안 함</span>' : '') + '</div>' : '')
      + '<div class="lq-term">' + esc(cur.title) + '</div>'
      + '<div class="lq-def' + (shown ? ' show' : '') + '">' + (shown ? esc(def) : '뜻을 떠올려 보세요 · 탭하면 정답') + '</div>'
      + btns;
    wire(gp);
    return gp;
  }

  function refresh(){
    var host = document.getElementById('lexQuizHost');
    if (host){ host.innerHTML = ''; host.appendChild(build()); }
  }
  function wire(gp){
    gp.querySelectorAll('.lq-sc').forEach(function(b){
      b.onclick = function(e){ e.stopPropagation(); lsSet(SCOPE_KEY, b.getAttribute('data-sc') || ''); state.cur = null; state.shown = false; refresh(); };
    });
    var show = gp.querySelector('.lq-show'), d = gp.querySelector('.lq-def');
    if (show) show.onclick = function(e){ e.stopPropagation(); state.shown = true; refresh(); };
    if (d) d.onclick = function(e){ e.stopPropagation(); if (!state.shown){ state.shown = true; refresh(); } };
    gp.querySelectorAll('.lq-r').forEach(function(b){
      b.onclick = function(e){ e.stopPropagation(); grade(b.getAttribute('data-g')); };
    });
    var nx = gp.querySelector('.lq-next');
    if (nx) nx.onclick = function(e){
      e.stopPropagation();
      var all = pool(), pick = state.cur;
      if (all.length > 1){ var guard = 0; while (pick === state.cur && guard++ < 20) pick = all[Math.floor(Math.random() * all.length)]; }
      state.cur = pick; state.shown = false; refresh();
    };
    var more = gp.querySelector('.lq-more');
    if (more) more.onclick = function(e){ e.stopPropagation(); state.practice = true; state.cur = null; state.shown = false; refresh(); };
    var back = gp.querySelector('.lq-back');
    if (back) back.onclick = function(e){ e.stopPropagation(); state.practice = false; state.cur = null; state.shown = false; refresh(); };
  }
  function grade(g){
    if (!state.cur || state.practice) return;
    rate(state.cur, g);
    state.cur = null; state.shown = false;
    refresh();
  }
  /* 자판: 정답 보기(Space) · 1~4 — 용어 탭이 열려 있고 글을 쓰는 중이 아닐 때만 */
  document.addEventListener('keydown', function(e){
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if (t && (t.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return;
    var pane = document.getElementById('page-lexicon');
    if (!pane || !pane.offsetParent || !document.querySelector('#lexQuizHost .lex-quiz')) return;
    if (!state.cur || state.practice) return;
    /* 위에 다른 창(설정 · 확인 창 · 검색창 · 종목 한 장)이 떠 있으면 넘긴다 */
    if (document.querySelector('#nnSetOv, .bga-ov, .ks-ov, #capOv.show, #tkOv, #cmdkOv.show')) return;
    /* 퀴즈가 화면에 보일 때만 — 아래 보드를 보다가 누른 숫자 키는 원래대로 탭 이동 */
    var r = document.getElementById('lexQuizHost').getBoundingClientRect();
    if (r.bottom < 40 || r.top > window.innerHeight - 40) return;
    if (!state.shown && (e.key === ' ' || e.code === 'Space')){
      e.preventDefault(); state.shown = true; refresh(); return;
    }
    if (state.shown){
      var map = { Digit1:'again', Digit2:'hard', Digit3:'good', Digit4:'easy', Numpad1:'again', Numpad2:'hard', Numpad3:'good', Numpad4:'easy' };
      var g = map[e.code];
      if (g){ e.preventDefault(); e.stopImmediatePropagation(); grade(g); }
    }
  }, true);

  /* ── ② 단어 보드 ── */
  function view(){ var v = null; try { v = JSON.parse(lsGet(VIEW_KEY, 'null')); } catch(e) {} return v || { sort:'base', view:'card' }; }
  function setView(p){ var v = view(); Object.keys(p).forEach(function(k){ v[k] = p[k]; }); lsSet(VIEW_KEY, JSON.stringify(v)); applyBoard(); }
  function stamp(n){
    var m = /^(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/.exec(String(n.date || ''));
    var t = m ? new Date(+m[1], +m[2]-1, +m[3], +(m[4]||0), +(m[5]||0)).getTime() : 0;
    var id = /(\d{13})/.exec(String(n.id)); return Math.max(t, id ? +id[1] : 0, +n.mtime || 0);
  }
  function ensureBar(){
    var layout = document.getElementById('lexicon-editor-layout');
    if (!layout) return null;
    var bar = document.getElementById('lxBar');
    if (!bar){
      bar = document.createElement('div'); bar.id = 'lxBar';
      layout.parentNode.insertBefore(bar, layout);
      bar.addEventListener('click', function(e){
        var b = e.target.closest ? e.target.closest('button[data-k]') : null; if (!b) return;
        var o = {}; o[b.getAttribute('data-k')] = b.getAttribute('data-v'); setView(o);
      });
    }
    var v = view();
    var opt = function(k, val, txt){ return '<button type="button" data-k="' + k + '" data-v="' + val + '" class="' + (v[k] === val ? 'on' : '') + '">' + txt + '</button>'; };
    var k = KN(), n = ((k && k.data && k.data.lexicon) || []).filter(valid).length;
    var html = '<span class="lx-g">정렬 ' + opt('sort', 'base', '기본') + opt('sort', 'new', '최근') + opt('sort', 'abc', '가나다') + opt('sort', 'due', '복습 차례') + '</span>'
      + '<span class="lx-g">보기 ' + opt('view', 'card', '카드') + opt('view', 'list', '목록') + '</span>'
      + '<span class="lx-n">단어 ' + n + '개</span>';
    if (bar.__h !== html){ bar.innerHTML = html; bar.__h = html; }
    return bar;
  }
  function applyBoard(){
    var list = document.getElementById('lexicon-sidebar-list');
    if (!list) return;
    ensureBar();
    var v = view(), k = KN();
    list.classList.toggle('lx-list', v.view === 'list');
    if (!k || !k.data) return;
    var byId = {}; (k.data.lexicon || []).forEach(function(n){ if (n && n.id) byId[n.id] = n; });
    var order = {}; (k.data.lexicon || []).forEach(function(n, i){ if (n && n.id) order[n.id] = i; });
    var t = today();
    var key = function(card){
      var n = byId[String(card.id).replace(/^item-/, '')];
      if (!n) return [9, 0, ''];
      if (v.sort === 'new') return [0, -stamp(n), ''];
      if (v.sort === 'abc') return [0, 0, String(n.title || '').trim().toLowerCase()];
      if (v.sort === 'due'){
        var due = n.srs && n.srs.due ? n.srs.due : '0000-00-00';  /* 새 단어는 맨 앞 */
        return [0, due <= t ? 0 : 1, due];
      }
      return [0, order[n.id] || 0, ''];
    };
    var parents = [];
    list.querySelectorAll('.lex-card').forEach(function(c){ if (parents.indexOf(c.parentNode) < 0) parents.push(c.parentNode); });
    parents.forEach(function(par){
      var cards = Array.prototype.filter.call(par.children, function(x){ return x.classList && x.classList.contains('lex-card'); });
      if (cards.length < 2) return;
      var anchor = cards[cards.length - 1].nextSibling;
      var sorted = cards.slice().sort(function(a, b){
        var ka = key(a), kb = key(b);
        for (var i = 0; i < 3; i++){ if (ka[i] < kb[i]) return -1; if (ka[i] > kb[i]) return 1; }
        return 0;
      });
      var same = sorted.every(function(c, i){ return c === cards[i]; });
      if (same) return;
      sorted.forEach(function(c){ par.insertBefore(c, anchor); });
    });
    filterMine();
  }

  /* LOOK UP 칸에 친 글자로 내 사전 카드를 거른다 */
  function filterMine(){
    var inp = document.getElementById('lkQ'), list = document.getElementById('lexicon-sidebar-list');
    if (!list) return;
    var q = inp ? String(inp.value || '').trim().toLowerCase() : '';
    var hits = 0, first = null;
    list.querySelectorAll('.lex-card').forEach(function(c){
      if (!q){ c.classList.remove('lx-hide', 'lx-hit'); return; }
      var tx = (c.textContent || '').toLowerCase();
      var ok = tx.indexOf(q) >= 0;
      c.classList.toggle('lx-hide', !ok);
      var term = c.querySelector('.lex-term');
      var exact = ok && term && String(term.textContent || '').trim().toLowerCase() === q;
      c.classList.toggle('lx-hit', !!exact);
      if (ok){ hits++; if (!first) first = c; }
    });
    var form = document.getElementById('lkForm'), mine = document.getElementById('lkMine');
    if (form && !mine){
      mine = document.createElement('div'); mine.id = 'lkMine'; mine.hidden = true;
      form.parentNode.insertBefore(mine, form.nextSibling);
      mine.addEventListener('click', function(){
        var c = document.querySelector('#lexicon-sidebar-list .lex-card:not(.lx-hide)');
        if (c) { try { c.scrollIntoView({ behavior:'smooth', block:'center' }); } catch(e) { c.scrollIntoView(); } }
      });
    }
    if (mine){
      if (q && hits){ mine.hidden = false; mine.innerHTML = '내 사전에서 <b>' + hits + '개</b> 찾음 — 아래 목록에 걸러 두었습니다 ↓'; }
      else { mine.hidden = true; mine.innerHTML = ''; }
    }
  }

  /* ── 엮기 ── */
  function copyProps(from, to){ try { Object.keys(from).forEach(function(p){ if (!(p in to)) to[p] = from[p]; }); } catch(e) {} }
  function hook(){
    var k = KN(); if (!k) return false;
    /* 퀴즈를 새것으로 바꿔 끼운다 — nn-core 의 renderSidebar('lexicon') 가 이것을 부른다 */
    if (!k._buildLexQuiz.__srs){ var b = function(){ return build(); }; b.__srs = true; k._buildLexQuiz = b; }
    if (!k.renderSidebar.__srs){
      var o = k.renderSidebar;
      var w = function(type){ var r = o.apply(this, arguments); if (type === 'lexicon') { try { applyBoard(); } catch(e) {} } return r; };
      copyProps(o, w); w.__srs = true; k.renderSidebar = w;
    }
    return true;
  }
  function boot(){
    injectCss();
    if (hook()){
      try { if (document.getElementById('lexicon-sidebar-list')) KN().renderSidebar('lexicon'); } catch(e) {}
    } else setTimeout(boot, 300);
    document.addEventListener('input', function(e){ if (e.target && e.target.id === 'lkQ') filterMine(); }, true);
    document.addEventListener('click', function(e){ if (e.target && e.target.closest && e.target.closest('#lkX')) setTimeout(filterMine, 0); }, true);
    window.addEventListener('nn:vault-reloaded', function(){ try { refresh(); } catch(e) {} });
  }

  window.__nnSrs = { dueCount: dueAll, counts: counts, queue: queue, rate: rate, plan: plan, refresh: refresh, applyBoard: applyBoard };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 0); });
  else setTimeout(boot, 0);
})();
