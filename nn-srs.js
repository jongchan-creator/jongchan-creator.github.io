/* ══════════════════════════════════════════════════════════════════
   NEWNORMAL — 용어 복습과 단어 보드 (nn-srs.js)   2026-11 신설

   ① 잊을 때쯤 다시 나오는 복습 (개선제안 R-1)
      예전 VOCAB QUIZ 는 단어를 무작위로 한 장 뽑아 뜻을 가렸다 보여 주는 것까지였다.
      이제 답을 본 뒤 [다시 · 어려움 · 알맞음 · 쉬움] 을 누르면 그 단어의 다음 복습일이 정해진다.
      퀴즈는 '오늘 볼 차례인 단어'만 낸다. 다 보면 "오늘 복습 끝"과 내일 볼 개수가 나온다.

      저장: 용어 노트 안의 note.srs — 노트 안에 있으므로 클라우드 동기화 · 백업에 그대로 따라간다.
            원본 코드는 이 칸을 무시한다(지우지 않는다).
      계산: 2026-11-23 부터 FSRS-5 (아래 '간격 계산' 설명). 그 전에는 SM-2 를 줄인 계산이었고,
            그 형식(ease · ivl)으로 저장된 카드는 다음에 볼 때 FSRS 기억 상태로 옮겨진다.
            '다시'는 오늘 이 자리에서 한 번 더(같은 날 다시 보는 FSRS-5 단기 공식), 그 밖에는 하루 이상.
      복습 기록: 누를 때마다 nn_srs_log_v1 에 한 줄씩 — 설정 › 데이터에서 CSV(FSRS 최적화기 형식)로 받는다.
      카드의 ○ ✓ ✕ 표시와도 이어진다: 간격이 21일을 넘으면 ✓(외웠어요), '다시'를 누르면 ✕(헷갈려요).
      새 단어는 하루 15개까지만 섞는다(복습이 쌓이지 않게). 범위 칩으로 그룹(경제 · 일반 · 영어 …)을 고를 수 있다.
      window.__nnSrs.dueCount() 를 홈의 '돌아볼 것'(nn-review.js)과 빠른 실행 줄이 쓴다.

   ③ VOCAB QUIZ 와 LOOK UP 이 겹치지 않게 (2026-11-23)
      퀴즈는 제목 오른쪽에 떠 있다(nn-style.css 의 position:absolute). 정답을 펼치거나 범위 칩이 두 줄이 되면
      키가 커져서 아래 LOOK UP 칸을 덮었다. 퀴즈의 아래 끝을 재서 LOOK UP 을 그만큼 내린다(넓은 화면에서만 —
      휴대폰에서는 퀴즈가 원래 본문 흐름 안에 있다). 퀴즈 키가 바뀔 때마다(ResizeObserver) 다시 잰다.

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

  /* ── 간격 계산: FSRS-5 (2026-11-23 · 개선제안 R-1 마무리) ──
     저장 칸은 FSRS(ts-fsrs 의 Card)와 같은 이름이다 — 다른 FSRS 도구로 옮기거나 매개변수를 최적화할 수 있게.
       note.srs = { due:'YYYY-MM-DD', stability, difficulty, elapsed_days, scheduled_days, reps, lapses,
                    state: 0 새 단어 · 1 배우는 중 · 2 복습 · 3 다시 배우는 중, last_review: ISO 시각,
                    ivl(= scheduled_days) · last('YYYY-MM-DD') — 예전 코드 · 정렬용 별칭, algo:'fsrs5' }
     공식 (FSRS-5, 기본 매개변수 19개 · 목표 기억률 90%)
       기억률   R(t,S) = (1 + 19/81 · t/S)^-0.5           간격 I = S/(19/81) · (r^(1/-0.5) − 1) → 90%면 I = S
       처음     S0 = w[G−1] · D0 = w4 − e^(w5·(G−1)) + 1
       난이도   D' = D − w6·(G−3)·(10−D)/9 → w7·D0(4) + (1−w7)·D' 로 되돌림, 1~10
       기억함   S' = S·(1 + e^w8 · (11−D) · S^−w9 · (e^(w10·(1−R)) − 1) · (어려움이면 w15) · (쉬움이면 w16))
       잊음     S' = min(S, w11 · D^−w12 · ((S+1)^w13 − 1) · e^(w14·(1−R)))
       같은 날  S' = S · e^(w17·(G − 3 + w18))       ('다시' 뒤에 오늘 다시 볼 때)
       간격 순서: 어려움 ≤ 알맞음 < 쉬움 (ts-fsrs 와 같게 맞춘다)
     예전 형식(ease · ivl)의 카드 → 안정도 = 간격, 난이도 = 11 − (ease−1)/(e^w8 · S^−w9 · (e^(0.1·w10) − 1))
       (SM-2 의 ease 가 FSRS 의 '기억함' 배수와 같아지는 난이도 — Anki 가 SM-2 카드를 옮길 때와 같은 생각)
     매개변수: nn_srs_param_v1 = { w:[19개], retention:0.9 } — 없으면 기본값. 설정 › 데이터에서 바꾼다. */
  var W_DEF = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  var DECAY = -0.5, FACTOR = 19 / 81, MAX_IVL = 3650;
  var PARAM_KEY = 'nn_srs_param_v1', LOG_KEY = 'nn_srs_log_v1', LOG_MAX = 3000;
  var GRADE = { again:1, hard:2, good:3, easy:4 };

  function validW(w){
    if (!Array.isArray(w) || w.length !== 19) return false;
    for (var i = 0; i < 19; i++) if (typeof w[i] !== 'number' || !isFinite(w[i])) return false;
    return w[0] > 0 && w[1] > 0 && w[2] > 0 && w[3] > 0;
  }
  function params(){
    var p = null; try { p = JSON.parse(lsGet(PARAM_KEY, 'null')); } catch(e) {}
    var custom = !!(p && validW(p.w));
    var r = p ? +p.retention : 0.9; if (!(r >= 0.7 && r <= 0.97)) r = 0.9;
    return { w: custom ? p.w : W_DEF, retention: r, custom: custom };
  }
  function setParams(o){
    var cur = params(), nx = { w: cur.custom ? cur.w : null, retention: cur.retention };
    if (o && 'w' in o) nx.w = o.w && validW(o.w) ? o.w : null;
    if (o && 'retention' in o) nx.retention = +o.retention;
    if (!nx.w && Math.abs(nx.retention - 0.9) < 1e-9) lsSet(PARAM_KEY, ''); else lsSet(PARAM_KEY, JSON.stringify(nx.w ? nx : { retention: nx.retention }));
    try { refresh(); } catch(e) {}
  }
  function clampD(d){ return Math.min(10, Math.max(1, d)); }
  function retr(t, S){ return Math.pow(1 + FACTOR * t / S, DECAY); }
  function ivlOf(S, P){ return Math.min(MAX_IVL, Math.max(1, Math.round(S / FACTOR * (Math.pow(P.retention, 1 / DECAY) - 1)))); }
  function d0(w, g){ return w[4] - Math.exp(w[5] * (g - 1)) + 1; }
  function nextD(w, D, g){ var dp = D - w[6] * (g - 3) * (10 - D) / 9; return clampD(w[7] * d0(w, 4) + (1 - w[7]) * dp); }
  function sRecall(w, D, S, r, g){
    return S * (1 + Math.exp(w[8]) * (11 - D) * Math.pow(S, -w[9]) * (Math.exp(w[10] * (1 - r)) - 1) * (g === 2 ? w[15] : 1) * (g === 4 ? w[16] : 1));
  }
  function sForget(w, D, S, r){ return Math.min(S, w[11] * Math.pow(D, -w[12]) * (Math.pow(S + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r))); }
  function sShort(w, S, g){ return S * Math.exp(w[17] * (g - 3 + w[18])); }
  function r4(x){ return Math.round(x * 10000) / 10000; }

  /* 카드의 지금 기억 상태 — FSRS 칸이 있으면 그대로, 예전 형식이면 옮겨서, 새 단어면 0 */
  function mem(n){
    var s = (n && n.srs) || {};
    var last = s.last || (s.last_review ? dstr(new Date(s.last_review)) : '');
    if (typeof s.stability === 'number' && s.stability > 0 && typeof s.difficulty === 'number'){
      return { S: s.stability, D: clampD(s.difficulty), st: s.state == null ? 2 : +s.state, last: last, reps: s.reps || 0, lapses: s.lapses || 0 };
    }
    if (!s.due) return { S: 0, D: 0, st: 0, last: '', reps: 0, lapses: 0 };
    var w = params().w, ivl = +s.ivl || 0, ease = +s.ease || 2.5;
    var S = ivl > 0 ? ivl : w[0];
    var D = clampD(11 - (ease - 1) / (Math.exp(w[8]) * Math.pow(S, -w[9]) * (Math.exp(0.1 * w[10]) - 1)));
    return { S: S, D: D, st: ivl > 0 ? 2 : 3, last: last, reps: s.reps || 0, lapses: s.lapses || 0, legacy: true };
  }
  function plan1(n, g, P){
    var w = P.w, m = mem(n), t = today();
    var el = m.last ? Math.max(0, daysBetween(m.last, t)) : 0;
    var S, D, st;
    if (m.st === 0){ S = w[g - 1]; D = clampD(d0(w, g)); st = g === 1 ? 1 : 2; }
    else if (el === 0){ S = sShort(w, m.S, g); D = nextD(w, m.D, g); st = g === 1 ? (m.st === 2 ? 3 : m.st) : 2; }
    else {
      var r = retr(el, m.S);
      D = nextD(w, m.D, g);
      if (g === 1){ S = sForget(w, m.D, m.S, r); st = 3; }
      else { S = sRecall(w, m.D, m.S, r, g); st = 2; }
    }
    S = Math.max(0.01, S);
    return { g: g, S: S, D: D, st: st, ivl: g === 1 ? 0 : ivlOf(S, P), el: el, before: m.st,
             reps: m.reps + 1, lapses: m.lapses + (g === 1 && m.st === 2 ? 1 : 0) };
  }
  /* 네 버튼의 결과를 한꺼번에 — 간격 순서(어려움 ≤ 알맞음 < 쉬움)를 맞춘다 */
  function planAll(n){
    var P = params(), o = { again: plan1(n, 1, P), hard: plan1(n, 2, P), good: plan1(n, 3, P), easy: plan1(n, 4, P) };
    o.hard.ivl = Math.min(o.hard.ivl, o.good.ivl);
    o.good.ivl = Math.min(MAX_IVL, Math.max(o.good.ivl, o.hard.ivl + 1));
    o.easy.ivl = Math.min(MAX_IVL, Math.max(o.easy.ivl, o.good.ivl + 1));
    return o;
  }
  function plan(n, grade){ var o = planAll(n); return o[grade] || o.good; }
  function label(d){
    if (d <= 0) return '오늘 다시';
    if (d < 30) return d + '일';
    if (d < 365) return Math.round(d / 30) + '달';
    return (Math.round(d / 36.5) / 10) + '년';
  }

  /* ── 복습 기록 ──
     nn_srs_log_v1 = [[노트 id, 시각(ms), 평가 1~4, 보기 전 상태 0~3, 걸린 시간(ms), 지난 날수, 정한 날수], …]
     최근 3,000개까지(약 150KB) · 클라우드 동기화(misc). 두 기기에서 따로 쌓인 기록은 올릴 때 합친다(index.html). */
  var shownId = '', shownAt = 0;
  function readLog(){ try { var a = JSON.parse(lsGet(LOG_KEY, '[]') || '[]'); return Array.isArray(a) ? a : []; } catch(e) { return []; } }
  function writeLog(a){ if (a.length > LOG_MAX) a = a.slice(a.length - LOG_MAX); lsSet(LOG_KEY, JSON.stringify(a)); }
  function logReview(id, p){
    var dur = (shownId === id && shownAt) ? Math.min(600000, Date.now() - shownAt) : 0;
    var a = readLog(); a.push([id, Date.now(), p.g, p.before, dur, p.el, p.ivl]); writeLog(a);
    shownId = ''; shownAt = 0;
  }
  /* 클라우드 쪽 기록과 합치기 — 같은 (id, 시각)은 하나로 */
  function mergeLog(remote){
    var b = remote; if (typeof b === 'string'){ try { b = JSON.parse(b); } catch(e) { b = null; } }
    if (!Array.isArray(b) || !b.length) return 0;
    var a = readLog(), seen = {}, added = 0;
    a.forEach(function(e){ if (Array.isArray(e)) seen[e[0] + '|' + e[1]] = 1; });
    b.forEach(function(e){ if (Array.isArray(e) && e.length >= 4 && !seen[e[0] + '|' + e[1]]){ seen[e[0] + '|' + e[1]] = 1; a.push(e); added++; } });
    if (!added) return 0;
    a.sort(function(x, y){ return x[1] - y[1]; });
    writeLog(a);
    return added;
  }
  function logStats(){
    var a = readLog(), ids = {}, last = 0, d30 = 0, cut = Date.now() - 30 * 86400000;
    a.forEach(function(e){ ids[e[0]] = 1; if (e[1] > last) last = e[1]; if (e[1] >= cut) d30++; });
    return { n: a.length, cards: Object.keys(ids).length, last: last ? dstr(new Date(last)) : '', d30: d30 };
  }
  /* FSRS 최적화기가 읽는 형식: card_id,review_time,review_rating,review_state,review_duration */
  function exportCsv(){
    var a = readLog().slice().sort(function(x, y){ return x[1] - y[1]; });
    var map = {}, next = 1, rows = ['card_id,review_time,review_rating,review_state,review_duration'];
    a.forEach(function(e){ if (!map[e[0]]) map[e[0]] = next++; rows.push(map[e[0]] + ',' + e[1] + ',' + e[2] + ',' + e[3] + ',' + (e[4] || 0)); });
    return rows.join('\n') + '\n';
  }
  function downloadCsv(){
    var csv = exportCsv();
    try {
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }), u = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = u; a.download = 'newnormal-revlog-' + today().replace(/-/g, '') + '.csv';
      document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); }, 800);
      return true;
    } catch(e) { return false; }
  }

  function rate(n, grade){
    var k = KN(); if (!k || !n) return;
    var wasNew = isNew(n), p = plan(n, grade), t = today();
    n.srs = { due: addDays(t, p.ivl), stability: r4(p.S), difficulty: r4(p.D), elapsed_days: p.el, scheduled_days: p.ivl,
              reps: p.reps, lapses: p.lapses, state: p.st, last_review: new Date().toISOString(),
              ivl: p.ivl, last: t, algo: 'fsrs5' };
    logReview(n.id, p);
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
  /* 2026-11-26 고침: 칸 폭을 1fr 로 두면 한 줄로 줄인(nowrap) 긴 뜻의 글자 폭만큼 칸이 넓어져
     와신상담 · 좌고우면처럼 긴 뜻이 있는 그룹 전체가 오른쪽으로 넘쳐 잘렸다(2,400px 넘게) → minmax(0,1fr) + 카드 min-width:0 */
  '#lexicon-sidebar-list.lx-list .note-group-body,#lexicon-sidebar-list.lx-list .note-ungrouped{grid-template-columns:minmax(0,1fr)!important;gap:6px!important}',
  '#lexicon-sidebar-list.lx-list .lex-card{display:flex!important;flex-direction:row!important;align-items:baseline;gap:10px;padding:8px 34px 8px 12px!important;min-height:0!important;min-width:0;max-width:100%;box-sizing:border-box}',
  '#lexicon-sidebar-list.lx-list .lex-card .lex-term{flex:0 0 auto;max-width:45%;font-size:13.5px!important;margin:0!important}',
  '#lexicon-sidebar-list.lx-list .lex-card .lex-def{flex:1 1 auto;min-width:0;margin:0!important;font-size:12.5px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '#lexicon-sidebar-list.lx-list .lex-card .lex-def:focus{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}',
  /* 뜻을 눌러 고칠 때는 뜻이 단어 아래 줄로 내려가 카드 폭을 다 쓴다(좁은 오른쪽 기둥에 갇히지 않게) */
  '#lexicon-sidebar-list.lx-list .lex-card:has(> .lex-def:focus){flex-wrap:wrap;row-gap:5px}',
  '#lexicon-sidebar-list.lx-list .lex-card > .lex-def:focus{flex:1 0 100%}',
  /* 오늘 넣은 단어 — 단어 옆 작은 today (2026-11-26) */
  '.lx-today{display:inline-flex;align-items:center;flex:0 0 auto;align-self:center;box-sizing:border-box;',
  '  font:800 9.5px/1 \'Pretendard\',sans-serif;letter-spacing:.05em;color:#e0527a;background:#fff0f4;',
  '  border:1px solid rgba(224,82,122,.28);border-radius:999px;padding:3px 7px 3px;white-space:nowrap;',
  '  pointer-events:none;user-select:none;-webkit-user-select:none}',
  /* 카드 보기: today 는 단어 바로 옆 — 자리가 모자라면(오른쪽 위 ○ 단추와 겹칠 것 같으면) 단어 아래로 내려간다. 뜻은 늘 그다음 줄 전체 폭 */
  '#lexicon-sidebar-list:not(.lx-list) .lex-card.lx-new{flex-direction:row;flex-wrap:wrap;align-items:center;align-content:flex-start;column-gap:6px;row-gap:6px}',
  '#lexicon-sidebar-list:not(.lx-list) .lex-card.lx-new > .lex-term{flex:0 1 auto;min-width:0;max-width:100%}',
  '#lexicon-sidebar-list:not(.lx-list) .lex-card.lx-new > .lx-today{margin-right:30px}',
  '#lexicon-sidebar-list:not(.lx-list) .lex-card.lx-new > .lex-def{flex:1 0 100%;min-width:0}',
  '#lexicon-sidebar-list.lx-list .lex-card .lx-today{margin:0 -2px}',
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

    if (!state.practice && shownId !== cur.id){ shownId = cur.id; shownAt = Date.now(); }   /* 복습 기록의 '걸린 시간' */
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
      var pa = planAll(cur);
      btns = '<div class="lq-rate">' + ['again', 'hard', 'good', 'easy'].map(function(g){
        var nm = { again:'다시', hard:'어려움', good:'알맞음', easy:'쉬움' }[g];
        return '<button type="button" class="lq-r" data-g="' + g + '">' + nm + '<small>' + label(pa[g].ivl) + '</small></button>';
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
    fitQuiz();
  }

  /* ── ③ 퀴즈가 LOOK UP 을 덮지 않게 ── */
  var FIT_GAP = 22;
  function fitQuiz(){
    var q = document.getElementById('lexQuizHost'), lk = document.getElementById('lkPanel'), pane = document.getElementById('page-lexicon');
    if (!q || !lk || !pane || !pane.offsetParent) return;
    var abs = false; try { abs = getComputedStyle(q).position === 'absolute'; } catch(e) {}
    var old = lk.style.marginTop || '';
    if (!abs || !q.firstChild){ if (old){ lk.style.transition = 'none'; lk.style.marginTop = ''; } return; }
    /* 원래 자리를 잰다 — 잠깐 덧붙인 여백을 빼고(전환도 끈 채) 재고, 그리기 전에 되돌린다 */
    lk.style.transition = 'none'; lk.style.marginTop = '';
    var natTop = lk.getBoundingClientRect().top, base = 0;
    try { base = parseFloat(getComputedStyle(lk).marginTop) || 0; } catch(e) {}
    var need = Math.max(0, Math.ceil(q.getBoundingClientRect().bottom + FIT_GAP - natTop));
    var target = need ? (base + need) + 'px' : '';
    lk.style.marginTop = old; void lk.offsetHeight;
    if (target === old) return;
    /* 처음 맞출 때는 바로, 그다음(정답 펼치기 등)부터는 부드럽게 */
    lk.style.transition = lk.__nnFitted ? 'margin-top .32s cubic-bezier(.22,1,.36,1)' : 'none';
    lk.__nnFitted = true;
    lk.style.marginTop = target;
  }
  var fitRaf = 0;
  function fitSoon(){ if (!fitRaf) fitRaf = requestAnimationFrame(function(){ fitRaf = 0; fitQuiz(); }); }
  function watchFit(){
    var q = document.getElementById('lexQuizHost');
    if (!q) return;
    if (typeof ResizeObserver === 'function'){
      try { new ResizeObserver(fitSoon).observe(q); } catch(e) {}
      var head = q.parentNode; if (head) try { new ResizeObserver(fitSoon).observe(head); } catch(e) {}
    }
    window.addEventListener('resize', fitSoon);
    window.addEventListener('load', fitSoon);
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
    markToday(list, byId, t);
    filterMine();
  }
  /* 오늘 넣은 단어에 작은 'today' (2026-11-26 · 회장님: "오늘 새로 넣은 단어에 today 라고 작게 붙여 주면 귀여울 것 같다")
     넣은 날 = 카드를 만들 때 적힌 date('2026.11.26 09:12' — 단어장은 고쳐도 date 가 바뀌지 않는다), 없으면 id 의 13자리 시각.
     글자는 단어 · 뜻 칸 밖에 따로 둔다 — 고쳐 쓰는 칸 안에 넣으면 단어 이름에 'today' 가 섞여 저장된다. */
  function addedDay(n){
    var m = /^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/.exec(String(n.date || ''));
    if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    var id = /(\d{13})/.exec(String(n.id || ''));
    return id ? dstr(new Date(+id[1])) : '';
  }
  function markToday(list, byId, t){
    list.querySelectorAll('.lex-card').forEach(function(c){
      var n = byId[String(c.id).replace(/^item-/, '')];
      var on = !!(n && addedDay(n) === t), tag = null;
      for (var x = c.firstElementChild; x; x = x.nextElementSibling){ if (x.classList.contains('lx-today')){ tag = x; break; } }
      c.classList.toggle('lx-new', on);
      if (on && !tag){
        tag = document.createElement('span'); tag.className = 'lx-today'; tag.textContent = 'today';
        tag.title = '오늘 넣은 단어'; tag.setAttribute('aria-label', '오늘 넣은 단어');
        var term = c.querySelector('.lex-term');
        c.insertBefore(tag, term ? term.nextSibling : null);
      } else if (!on && tag) c.removeChild(tag);
    });
  }

  /* LOOK UP 칸에 친 글자로 내 사전 카드를 거른다 */
  function filterMine(){
    var inp = document.getElementById('lkQ'), list = document.getElementById('lexicon-sidebar-list');
    if (!list) return;
    var q = inp ? String(inp.value || '').trim().toLowerCase() : '';
    var hits = 0, first = null;
    list.querySelectorAll('.lex-card').forEach(function(c){
      if (!q){ c.classList.remove('lx-hide', 'lx-hit'); return; }
      var tm0 = c.querySelector('.lex-term'), df0 = c.querySelector('.lex-def');   /* 단어 · 뜻만 (today 표시 · 단추 글자는 빼고) */
      var tx = ((tm0 ? tm0.textContent : '') + ' ' + (df0 ? df0.textContent : '')).toLowerCase();
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
    watchFit(); fitSoon();
  }

  window.__nnSrs = { dueCount: dueAll, counts: counts, queue: queue, rate: rate, plan: plan, planAll: planAll, mem: mem, refresh: refresh, applyBoard: applyBoard,
                     params: params, setParams: setParams, defaults: W_DEF.slice(), log: readLog, logStats: logStats, mergeLog: mergeLog,
                     exportCsv: exportCsv, downloadCsv: downloadCsv, fitQuiz: fitQuiz };
  /* index.html 의 동기화가 다른 기기와 어긋났을 때 부른다 (misc 그룹 — 복습 기록 합치기) */
  window.__nnSrsMergeLog = mergeLog;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 0); });
  else setTimeout(boot, 0);
})();
