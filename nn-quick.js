/* ══════════════════════════════════════════════════════════════════
   NEWNORMAL — 최근 기록과 홈의 빠른 실행 줄 (nn-quick.js)   2026-11 신설

   ① 최근 기록 (window.__nnRecent)
      어떤 글을 마지막으로 열었는지 이 브라우저에 적어 둔다 (nn_recent_notes_v1 · 최대 12개).
      저장본(vault)에 손대지 않으므로 동기화·백업에 부담을 주지 않는다 — 기기마다 따로다.
      검색창(Ctrl+K)의 빈 화면과 아래 ②의 "이어 쓰기"가 이것을 쓴다.
      기록되는 때: 편집기가 그려질 때 · 카드 내용을 고칠 때 · THESIS 글을 열 때.

   ② 홈 히어로의 빠른 실행 줄 (개선제안 S-2 · 회장님이 고른 안 A)
      히어로의 높이·배치는 그대로 두고, 시계 아래에 작은 버튼 한 줄만 놓는다.
        오늘 일기 쓰기 · 단어 찾기 · 이어 쓰기(마지막으로 연 글) · 돌아볼 것 N
      주인에게만 보인다 — 로그인했거나, 이 브라우저에 예시가 아닌 글이 하나라도 있을 때.
      처음 온 방문자에게는 히어로가 예전 그대로 보인다.

   로딩 순서: … → nn-polish.js → nn-quick.js → nn-route.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__nnQuick) return;
  window.__nnQuick = true;

  var KEY = 'nn_recent_notes_v1', MAX = 12;
  var META = {
    books:    { lb:'BOOKS',   c:'#e8c47e' },
    lexicon:  { lb:'LEXICON', c:'#aeb1b4' },
    media:    { lb:'MEDIA',   c:'#7fbef5' },
    economics:{ lb:'ECON',    c:'#7fd58c' },
    daily:    { lb:'일기',    c:'#c2a0e8' },
    thesis:   { lb:'THESIS',  c:'#e0709c' }
  };
  var LONGFORM = { books:1, economics:1, daily:1, thesis:1 };   /* "이어 쓰기"에 올릴 종류 */

  function KN(){ return window.KnowledgeNotes; }
  function load(){
    try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch(e) { return []; }
  }
  function store(a){ try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch(e) {} }

  /* ── ① 최근 기록 ── */
  var lastTouch = { t:'', i:'', at:0 };
  function touch(type, id){
    if (!type || !id) return;
    var now = Date.now();
    /* 같은 글을 계속 고치는 동안에는 1분에 한 번만 적는다 (글자마다 저장하지 않게) */
    if (lastTouch.t === type && lastTouch.i === id && now - lastTouch.at < 60000) return;
    lastTouch = { t:type, i:id, at:now };
    var a = load().filter(function(e){ return !(e && e.t === type && e.i === id); });
    a.unshift({ t:type, i:id, at:now });
    store(a);
  }

  function parseWhen(s){
    /* '2026.11.11 14:49' · '2026-11-11' 두 모양을 모두 받는다 */
    var m = /^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/.exec(String(s || '').trim());
    if (!m) return 0;
    return new Date(+m[1], +m[2]-1, +m[3], +(m[4]||12), +(m[5]||0)).getTime() || 0;
  }
  /* 처음 한 번 — 적어 둔 것이 없으면, 글에 남은 날짜로 최근 다섯 개를 채워 둔다 */
  function bootstrap(){
    if (load().length) return;
    var k = KN(); if (!k || !k.data || k._ready === false) return;
    var all = [];
    Object.keys(LONGFORM).forEach(function(t){
      (k.data[t] || []).forEach(function(n){
        if (!n || !n.id || /^(p_seed_|rlx_)/.test(n.id)) return;
        var at = Math.max(+n.mtime || 0, parseWhen(n.date), t === 'daily' ? parseWhen(n.day) : 0);
        if (at) all.push({ t:t, i:n.id, at:at });
      });
    });
    all.sort(function(a,b){ return b.at - a.at; });
    if (all.length) store(all.slice(0, 5));
  }

  function ago(at){
    var d = Math.max(0, Date.now() - at), m = Math.floor(d / 60000);
    if (m < 1) return '방금';
    if (m < 60) return m + '분 전';
    var h = Math.floor(m / 60); if (h < 24) return h + '시간 전';
    var dd = Math.floor(h / 24); if (dd < 30) return dd + '일 전';
    return Math.floor(dd / 30) + '달 전';
  }

  function openNote(type, note){
    var sw = window.switchPage, k = KN();
    if (typeof sw !== 'function' || !k) return;
    if (type === 'thesis'){
      sw('thesis');
      setTimeout(function(){ try { if (window.ThesisApp && window.ThesisApp.open) window.ThesisApp.open(note.id); } catch(e) {} }, 160);
      return;
    }
    if (type === 'daily' && note.day && window.__nnDaily && window.__nnDaily.open){
      sw('daily');
      setTimeout(function(){ try { window.__nnDaily.open(note.day); } catch(e) {} }, 200);
      return;
    }
    sw(type);
    setTimeout(function(){
      try {
        k.activeIds[type] = note.id;
        k.renderSidebar(type);
        if (type !== 'lexicon' && type !== 'media') k.renderEditor(type);
      } catch(e) {}
    }, 140);
  }

  function list(n, onlyLong){
    var k = KN(), out = [];
    if (!k || !k.data) return out;
    var a = load();
    for (var x = 0; x < a.length && out.length < (n || 5); x++){
      var e = a[x]; if (!e || !e.t || !e.i) continue;
      if (onlyLong && !LONGFORM[e.t]) continue;
      var arr = k.data[e.t]; if (!Array.isArray(arr)) continue;
      var note = null;
      for (var j = 0; j < arr.length; j++){ if (arr[j] && arr[j].id === e.i){ note = arr[j]; break; } }
      if (!note) continue;
      var m = META[e.t] || { lb:'NOTE', c:'#e0c389' };
      (function(type, nt){
        out.push({
          type: type, id: nt.id, at: e.at,
          title: (String(nt.title || '').trim() || '제목 없음'),
          lb: m.lb, c: m.c,
          sub: (type === 'daily' && nt.day ? nt.day + ' · ' : '') + ago(e.at),
          open: function(){ openNote(type, nt); }
        });
      })(e.t, note);
    }
    return out;
  }
  window.__nnRecent = { list: list, touch: touch };

  function copyProps(from, to){
    try { Object.keys(from).forEach(function(p){ if (!(p in to)) to[p] = from[p]; }); } catch(e) {}
  }
  function hookNotes(){
    var k = KN(); if (!k) return false;
    if (typeof k.renderEditor === 'function' && !k.renderEditor.__quickWrapped){
      var oe = k.renderEditor;
      var we = function(type){
        var r = oe.apply(this, arguments);
        try { var id = this.activeIds && this.activeIds[type]; if (id) touch(type, id); } catch(e) {}
        return r;
      };
      copyProps(oe, we); we.__quickWrapped = true; k.renderEditor = we;
    }
    if (typeof k.update === 'function' && !k.update.__quickWrapped){
      var ou = k.update;
      var wu = function(type, id){
        try { touch(type, id); } catch(e) {}
        return ou.apply(this, arguments);
      };
      copyProps(ou, wu); wu.__quickWrapped = true; k.update = wu;
    }
    var T = window.ThesisApp;
    if (T && typeof T.open === 'function' && !T.open.__quickWrapped){
      var ot = T.open;
      var wt = function(id){ try { if (id) touch('thesis', id); } catch(e) {} return ot.apply(this, arguments); };
      wt.__quickWrapped = true; T.open = wt;
    }
    return true;
  }

  /* ── ② 홈의 빠른 실행 줄 ── */
  var ICON = {
    pen:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.9 2.6l2.5 2.5L5.6 12.9l-3.1.6.6-3.1z"/><path d="M9.4 4.1l2.5 2.5"/></svg>',
    find:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.4"/><path d="M10.4 10.4L13.6 13.6"/></svg>',
    back:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.2 4L2.8 7.4l3.4 3.4"/><path d="M2.8 7.4h6.4a3.6 3.6 0 0 1 3.6 3.6v1"/></svg>',
    plus:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M8 3.2v9.6M3.2 8h9.6"/></svg>',
    clock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="5.6"/><path d="M8 4.9V8l2.1 1.4"/></svg>'
  };
  var CSS = [
  '#nnQuick{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px;max-width:min(92vw,760px);pointer-events:auto;',
  '  opacity:0;transform:translateY(5px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1)}',
  '#nnQuick.show{opacity:1;transform:none}',
  '#nnQuick .nq-b{height:32px;display:inline-flex;align-items:center;gap:7px;padding:0 12px 0 10px;margin:0;',
  '  border-radius:9px;cursor:pointer;white-space:nowrap;-webkit-appearance:none;appearance:none;',
  '  font-family:\'Pretendard\',\'Noto Sans KR\',-apple-system,sans-serif;font-size:12.5px;font-weight:500;line-height:1;letter-spacing:-.005em;',
  '  color:rgba(255,255,255,.9);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);',
  '  -webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);',
  '  box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 6px 18px -12px rgba(0,0,0,.6);text-shadow:none;',
  '  transition:background-color .18s ease,border-color .18s ease,color .18s ease,transform .12s ease}',
  '#nnQuick .nq-b:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.32);color:#fff}',
  '#nnQuick .nq-b:active{transform:scale(.975)}',
  '#nnQuick .nq-b svg{width:14px;height:14px;flex:none;opacity:.8}',
  '#nnQuick .nq-b.pri{background:rgba(232,196,126,.14);border-color:rgba(232,196,126,.42);color:#f4e2b8}',
  '#nnQuick .nq-b.pri:hover{background:rgba(232,196,126,.24);border-color:rgba(232,196,126,.75);color:#fff4d8}',
  '#nnQuick .nq-dim{color:rgba(255,255,255,.52)}',
  '#nnQuick .nq-ttl{display:inline-block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;line-height:1.25}',
  '#nnQuick .nq-n{font-variant-numeric:tabular-nums;font-weight:700;color:#e8c47e}',
  '#nnQuick kbd{font-family:\'JetBrains Mono\',ui-monospace,Consolas,monospace;font-size:9.5px;font-weight:600;line-height:1;',
  '  color:rgba(255,255,255,.46);border:1px solid rgba(255,255,255,.17);border-radius:4px;padding:2.5px 4.5px;margin-left:2px;background:rgba(0,0,0,.18)}',
  '#nnQuick .nq-b.pri kbd{color:rgba(244,226,184,.6);border-color:rgba(232,196,126,.32)}',
  '@media (hover:none),(max-width:768px){#nnQuick{gap:6px;margin-top:14px}#nnQuick kbd{display:none}#nnQuick .nq-ttl{max-width:128px}}',
  '@media (prefers-reduced-motion: reduce){#nnQuick{transition:none}#nnQuick .nq-b{transition:none}}'
  ].join('\n');

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }

  function isOwner(){
    try { if (window.__nnCloud && window.__nnCloud.user && window.__nnCloud.user()) return true; } catch(e) {}
    if (load().length) return true;
    var k = KN(); if (!k || !k.data) return false;
    var types = Object.keys(k.data);
    for (var i = 0; i < types.length; i++){
      var arr = k.data[types[i]];
      if (!Array.isArray(arr)) continue;
      for (var j = 0; j < arr.length; j++){
        var n = arr[j];
        if (n && typeof n === 'object' && n.id && !/^(p_seed_|rlx_)/.test(String(n.id))) return true;
      }
    }
    return false;
  }

  function dueCount(){
    try { return (window.__nnReview && window.__nnReview.count) ? (window.__nnReview.count() || 0) : 0; }
    catch(e) { return 0; }
  }

  var shownOnce = false;
  function render(){
    var deco = document.getElementById('nnDeco');
    var host = deco && deco.parentNode;
    var row = document.getElementById('nnQuick');
    if (!host || !isOwner()){ if (row) row.remove(); return; }
    if (!document.getElementById('nnQuickCss')){
      var st = document.createElement('style'); st.id = 'nnQuickCss'; st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    if (!row){
      row = document.createElement('div'); row.id = 'nnQuick';
      row.setAttribute('role', 'group'); row.setAttribute('aria-label', '빠른 실행');
      if (deco.nextSibling) host.insertBefore(row, deco.nextSibling); else host.appendChild(row);
      row.addEventListener('click', function(e){
        var b = e.target.closest ? e.target.closest('.nq-b') : null; if (!b) return;
        var act = b.getAttribute('data-act'), go = window.__nnGo || {};
        if (act === 'daily' && go.dailyToday) go.dailyToday();
        else if (act === 'find' && go.lookup) go.lookup('');
        else if (act === 'cap' && window.__nnCapture) window.__nnCapture.open();
        else if (act === 'cont'){ var r = list(1, true)[0]; if (r) r.open(); }
        else if (act === 'due'){
          var box = document.getElementById('ddReview');
          if (box) { try { box.scrollIntoView({ behavior:'smooth', block:'center' }); } catch(x) { box.scrollIntoView(); } }
        }
      });
    }
    var html = ''
      + '<button type="button" class="nq-b pri" data-act="daily">' + ICON.pen + '<span>오늘 일기 쓰기</span><kbd>D</kbd></button>'
      + '<button type="button" class="nq-b" data-act="cap">' + ICON.plus + '<span>한 줄 담기</span><kbd>N</kbd></button>'
      + '<button type="button" class="nq-b" data-act="find">' + ICON.find + '<span>단어 찾기</span><kbd>L</kbd></button>';
    var rec = list(1, true)[0];
    if (rec) html += '<button type="button" class="nq-b" data-act="cont" title="' + esc(rec.title) + '">' + ICON.back
      + '<span class="nq-dim">이어 쓰기</span><span class="nq-ttl">' + esc(rec.title) + '</span></button>';
    var due = dueCount();
    if (due > 0) html += '<button type="button" class="nq-b" data-act="due">' + ICON.clock
      + '<span>돌아볼 것</span><span class="nq-n">' + due + '</span></button>';
    if (row.__html !== html){ row.innerHTML = html; row.__html = html; }

    /* 히어로 문구가 나타난 뒤에 따라 나타난다 (인트로가 끝나기 전에는 숨어 있다) */
    var ready = shownOnce || deco.classList.contains('show');
    if (ready){ shownOnce = true; requestAnimationFrame(function(){ row.classList.add('show'); }); }
  }

  function boot(){
    hookNotes();
    bootstrap();
    render();
    /* 인트로가 끝나 문구가 보일 때를 기다린다 */
    var tries = 0;
    (function wait(){
      var deco = document.getElementById('nnDeco');
      if (deco && deco.classList.contains('show')){ render(); return; }
      if (++tries < 80) setTimeout(wait, 250); else { shownOnce = true; render(); }
    })();
    /* 늦게 뜨는 것들(THESIS · 복습 목록 · 로그인) 뒤에 한 번씩 더 */
    setTimeout(function(){ hookNotes(); render(); }, 1500);
    setTimeout(function(){ hookNotes(); bootstrap(); render(); }, 4500);
    window.addEventListener('nn:sync', function(){ render(); });
    window.addEventListener('nn:vault-reloaded', function(){ bootstrap(); render(); });
    window.addEventListener('focus', function(){ render(); });
    /* 홈으로 돌아올 때 새로 그린다 */
    var orig = window.switchPage;
    if (typeof orig === 'function' && !orig.__quickWrapped){
      var w = function(name){
        var r = orig.apply(this, arguments);
        if (name === 'home') setTimeout(render, 60);
        return r;
      };
      copyProps(orig, w); w.__quickWrapped = true; window.switchPage = w;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 0); });
  else setTimeout(boot, 0);

  window.__nnQuickRender = render;
})();
