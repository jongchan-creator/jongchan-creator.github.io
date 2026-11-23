/* ══════════════════════════════════════════════════════════════════
   NEWNORMAL — 한 줄 담기 · 고른 낱말 바로 찾기 (nn-capture.js)   2026-11 신설

   ① 어디서든 한 줄 담기 (개선제안 S-4)
      N 키(또는 검색창의 "한 줄 담기", 홈의 [담기] 버튼)를 누르면 작은 입력창이 뜬다.
      적은 내용은 오늘 날짜의 투자 일기 끝에 "시각 + 내용"으로 붙는다. 오늘 일기가 없으면 만든다.
      MACRO 의 뉴스 줄 · 관심 종목 카드에는 [＋ 일기] 버튼이 붙어, 제목 · 링크 · 그때 값이 한 번에 담긴다.
      담은 뒤 5초 안에는 되돌릴 수 있다.

   ③ 휴대폰 모서리의 ＋ (개선제안 S-4 마무리 · 2026-11-23)
      휴대폰에는 N 키가 없다. 화면 오른쪽 아래의 둥근 ＋ 를 누르면 어디서든 한 줄 담기가 열린다.
      글을 쓰는 중(자판이 올라온 때) · 다른 창이 떠 있을 때 · 아래로 훑어 내리는 중에는 숨고, 위로 올리면 다시 나온다.
      마우스를 쓰는 넓은 화면에서는 보이지 않는다(N 키와 [담기] 버튼이 있다).

   ② 글을 읽다가 고른 낱말 바로 찾기 (개선제안 S-5)
      노트 본문에서 낱말을 끌어 고르면 작은 [뜻 찾기] 단추가 뜬다.
      누르면 그 자리에서 뜻이 보이고(내 사전에 이미 있으면 그것부터), [＋ 용어집에 저장]을 누르면
      용어 카드가 생기면서 원래 글과 갈래(맥락)로 이어진다. 사전 연결은 nn-lookup.js 의 것을 그대로 쓴다.

   로딩 순서: … → nn-srs.js → nn-capture.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__nnCapture) return;

  function KN(){ return window.KnowledgeNotes; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function today(){ var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function hm(){ var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function toast(m, o){ if (window.__nnToast) window.__nnToast(m, o || {}); }

  /* ── ① 오늘 일기 끝에 붙이기 ── */
  function todayNote(create){
    var k = KN(); if (!k || !k.data) return null;
    if (!Array.isArray(k.data.daily)) k.data.daily = [];
    var t = today(), a = k.data.daily;
    for (var i = 0; i < a.length; i++) if (a[i] && a[i].day === t) return a[i];
    if (!create) return null;
    var p = t.split('-');
    var note = { id: 'note_' + Date.now(), title: p[0] + '년 ' + (+p[1]) + '월 ' + (+p[2]) + '일', content: '',
                 date: t.replace(/-/g, '.') + ' 00:00', day: t, groupId: null, icon: '📔' };
    a.unshift(note);
    a.sort(function(x, y){ return String(y.day || '').localeCompare(String(x.day || '')); });
    return note;
  }
  function append(text, opt){
    opt = opt || {};
    text = String(text || '').replace(/\r/g, '').trim();
    if (!text && !opt.link) return false;
    var k = KN(); if (!k || k._ready === false) { toast('아직 기록을 불러오는 중입니다 — 잠시 뒤 다시 해 주세요', {kind:'del'}); return false; }
    var created = !todayNote(false);
    var note = todayNote(true);
    var body = esc(text).replace(/\n/g, '<br>');
    var line = '<p data-cap="1"><b>' + hm() + '</b> '
      + (opt.link ? '<a href="' + esc(opt.link) + '" target="_blank" rel="noopener">' + esc(opt.label || opt.link) + '</a>' + (body ? ' — ' : '') : '')
      + body + '</p>';
    var before = note.content || '';
    var after = before + line;
    note.mtime = Date.now();   /* 홈의 '최근 기록'에 바로 올라오게 */
    if (typeof k.update === 'function') k.update('daily', note.id, 'content', after);
    else { note.content = after; k.save(); }
    /* 그 일기가 편집기에 열려 있으면 다시 그린다 — 옛 화면이 방금 담은 줄을 덮어쓰지 않게 */
    try {
      if (k.activeIds && k.activeIds.daily === note.id && document.getElementById('daily-editor-main')) k.renderEditor('daily');
      if (window.__nnDaily && window.__nnDaily.paint) window.__nnDaily.paint();
    } catch(e) {}
    toast('📝 오늘 일기에 담았습니다', { undo: function(){
      var n2 = todayNote(false); if (!n2) return;
      if (created && (n2.content || '') === after){
        var arr = k.data.daily, at = arr.indexOf(n2);
        if (at >= 0){ arr.splice(at, 1); if (k.activeIds && k.activeIds.daily === n2.id) k.activeIds.daily = null; k.save(); }
      } else if ((n2.content || '').slice(-line.length) === line){
        k.update('daily', n2.id, 'content', (n2.content || '').slice(0, -line.length));
      } else return;
      try { if (document.getElementById('daily-editor-main')) { k.renderSidebar('daily'); k.renderEditor('daily'); } if (window.__nnDaily && window.__nnDaily.paint) window.__nnDaily.paint(); } catch(e) {}
      toast('↩ 되돌렸습니다');
    }});
    return true;
  }

  var CSS = [
  /* 담기 창 */
  '#capOv{position:fixed;inset:0;z-index:3200000;display:flex;align-items:flex-start;justify-content:center;padding:18vh 16px 16px;',
  '  background:rgba(4,4,6,.55);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);opacity:0;transition:opacity .16s ease}',
  '#capOv.show{opacity:1}',
  '#capOv .cap{width:520px;max-width:100%;border-radius:14px;padding:16px 16px 12px;color:#f0ede6;font-family:\'Pretendard\',\'Noto Sans KR\',sans-serif;',
  '  background:linear-gradient(165deg,rgba(24,21,18,.98),rgba(12,11,10,.98));border:1px solid rgba(194,160,232,.38);box-shadow:0 30px 80px -22px rgba(0,0,0,.95)}',
  '#capOv .cap-h{display:flex;align-items:baseline;gap:9px;margin-bottom:9px;font-size:13.5px;font-weight:700}',
  '#capOv .cap-h span{font-size:12px;font-weight:500;color:rgba(240,237,230,.5)}',
  '#capOv textarea{width:100%;box-sizing:border-box;min-height:84px;resize:vertical;padding:11px 12px;border-radius:10px;outline:none;',
  '  font:400 14px/1.6 \'Pretendard\',\'Noto Sans KR\',sans-serif;color:#f0ede6;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16)}',
  '#capOv textarea:focus{border-color:rgba(194,160,232,.7);box-shadow:0 0 0 3px rgba(194,160,232,.16)}',
  '#capOv .cap-f{display:flex;align-items:center;gap:8px;margin-top:9px;font-size:11.5px;color:rgba(240,237,230,.45)}',
  '#capOv .cap-f button{margin-left:auto;cursor:pointer;font:700 12.5px \'Pretendard\',sans-serif;padding:8px 14px;border-radius:9px;color:#1a1420;background:#c2a0e8;border:none}',
  '#capOv .cap-f button.cx{margin-left:0;color:rgba(240,237,230,.75);background:transparent;border:1px solid rgba(255,255,255,.16);font-weight:600}',
  /* 뉴스 줄 · 관심 종목 카드의 [＋ 일기] */
  '.news-row{position:relative}',
  '.cap-add{cursor:pointer;font:600 11px \'Pretendard\',sans-serif;line-height:1;padding:5px 8px;border-radius:7px;white-space:nowrap;',
  '  color:#d9c2f2;background:rgba(18,14,22,.86);border:1px solid rgba(194,160,232,.45);opacity:0;transition:opacity .15s ease}',
  '.news-row .cap-add{position:absolute;right:4px;top:50%;transform:translateY(-50%)}',
  '.wl-card{position:relative}',
  '.wl-card .cap-add{position:absolute;right:8px;bottom:8px;z-index:3}',
  '.news-row:hover .cap-add,.wl-card:hover .cap-add,.cap-add:focus-visible{opacity:1}',
  '.cap-add:hover{background:rgba(194,160,232,.22);color:#fff}',
  '@media (hover:none),(pointer:coarse){.cap-add{opacity:.75}}',

  /* 고른 낱말 찾기 */
  '#selBub{position:fixed;z-index:3150000;display:none;cursor:pointer;font:600 12px \'Pretendard\',sans-serif;line-height:1;padding:8px 11px;border-radius:9px;',
  '  color:#14120f;background:#e8c47e;border:none;box-shadow:0 10px 26px -10px rgba(0,0,0,.8)}',
  '#selBub.show{display:block}',
  '#selPop{position:fixed;z-index:3150001;width:340px;max-width:calc(100vw - 20px);max-height:min(420px,70vh);overflow:auto;display:none;',
  '  padding:13px 14px 11px;border-radius:13px;color:#f0ede6;font-family:\'Pretendard\',\'Noto Sans KR\',sans-serif;',
  '  background:linear-gradient(165deg,rgba(24,21,18,.99),rgba(12,11,10,.99));border:1px solid rgba(201,169,110,.34);box-shadow:0 26px 70px -20px rgba(0,0,0,.95)}',
  '#selPop.show{display:block}',
  '#selPop .sp-q{font-size:15px;font-weight:800;margin-bottom:8px}',
  '#selPop .sp-it{padding:9px 0;border-top:1px solid rgba(255,255,255,.08)}',
  '#selPop .sp-b{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.04em;padding:3px 7px;border-radius:6px;color:#e0c389;border:1px solid rgba(224,195,137,.4);margin-right:6px}',
  '#selPop .sp-b.mine{color:#9fe3b9;border-color:rgba(74,222,128,.45)}',
  '#selPop .sp-t{font-size:13px;font-weight:700}',
  '#selPop .sp-d{margin-top:5px;font-size:12.5px;line-height:1.6;color:rgba(240,237,230,.82);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}',
  '#selPop .sp-s{margin-top:7px;cursor:pointer;font:600 12px \'Pretendard\',sans-serif;padding:6px 11px;border-radius:8px;color:#f0ede6;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18)}',
  '#selPop .sp-s:hover{background:rgba(255,255,255,.12)}',
  '#selPop .sp-s.done{color:#9fe3b9;border-color:rgba(74,222,128,.4);cursor:default}',
  '#selPop .sp-m{font-size:12.5px;color:rgba(240,237,230,.6);padding:4px 0}',
  '#selPop .sp-f{display:flex;flex-wrap:wrap;gap:10px;margin-top:9px;padding-top:9px;border-top:1px solid rgba(255,255,255,.08);font-size:12px}',
  '#selPop .sp-f a,#selPop .sp-f button{color:#e0c389;background:none;border:none;padding:0;cursor:pointer;font:600 12px \'Pretendard\',sans-serif;text-decoration:none}',

  /* ③ 휴대폰 ＋ */
  '#capFab{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom, 0px));z-index:2800000;width:54px;height:54px;border-radius:50%;',
  '  display:none;align-items:center;justify-content:center;padding:0;cursor:pointer;border:none;color:#14120f;',
  '  background:linear-gradient(160deg,#f2d8a2,#c9a96e);box-shadow:0 14px 30px -12px rgba(0,0,0,.8),inset 0 0 0 1px rgba(255,255,255,.25);',
  '  font:600 30px/1 \'Pretendard\',sans-serif;-webkit-tap-highlight-color:transparent;',
  '  transition:transform .28s cubic-bezier(.22,1,.36,1),opacity .2s ease}',
  '#capFab span{display:block;margin-top:-3px}',
  '#capFab:active{transform:scale(.93)}',
  '#capFab.hide{transform:translateY(96px);opacity:0;pointer-events:none}',
  '@media (max-width:700px),(hover:none) and (pointer:coarse) and (max-width:1024px){#capFab{display:flex}}',
  '@media print{#capFab{display:none!important}}'
  ].join('\n');
  function injectCss(){
    if (document.getElementById('nnCaptureCss')) return;
    var st = document.createElement('style'); st.id = 'nnCaptureCss'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* 담기 창 */
  var ov = null, lastFocus = null;
  function close(){ if (!ov) return; ov.classList.remove('show'); var o = ov; ov = null; setTimeout(function(){ if (o.parentNode) o.remove(); }, 170); try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch(e) {} }
  function open(prefill){
    injectCss();
    if (ov) { var ta0 = ov.querySelector('textarea'); if (ta0) ta0.focus(); return; }
    lastFocus = document.activeElement;
    var has = !!todayNote(false);
    ov = document.createElement('div'); ov.id = 'capOv';
    ov.innerHTML = '<div class="cap" role="dialog" aria-label="한 줄 담기">'
      + '<div class="cap-h">한 줄 담기<span>오늘 일기(' + today() + ')' + (has ? ' 끝에 붙습니다' : '를 새로 만들어 붙입니다') + '</span></div>'
      + '<textarea placeholder="떠오른 생각, 본 뉴스, 배운 것 — 한 줄이면 충분합니다" aria-label="담을 내용"></textarea>'
      + '<div class="cap-f"><span>Enter 담기 · Shift+Enter 줄바꿈 · Esc 닫기</span>'
      + '<button type="button" class="cx">취소</button><button type="button" class="ok">담기</button></div></div>';
    document.body.appendChild(ov);
    var ta = ov.querySelector('textarea');
    if (prefill) ta.value = prefill;
    var go = function(){ var v = ta.value.trim(); if (!v){ ta.focus(); return; } if (append(v)) close(); };
    ov.querySelector('.ok').onclick = go;
    ov.querySelector('.cx').onclick = close;
    ov.addEventListener('mousedown', function(e){ if (e.target === ov) close(); });
    ta.addEventListener('keydown', function(e){
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); go(); }
      else if (e.key === 'Escape'){ e.preventDefault(); close(); }
    });
    requestAnimationFrame(function(){ if (ov) ov.classList.add('show'); });
    setTimeout(function(){ ta.focus(); }, 30);
  }

  /* N 키 */
  function typing(t){
    if (!t) return false;
    if (t.isContentEditable) return true;
    var tag = (t.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!(t.closest && t.closest('[contenteditable="true"]'));
  }
  function modalOpen(){
    if (document.querySelector('.hub-modal-ov, .wd-ov, .nn-lightbox, .bga-ov, .cover-modal-ov, .lex-confirm, .ks-ov, #capOv, #nnSetOv, #tkOv, #siEdOv')) return true;
    var c = document.getElementById('cmdkOv'); return !!(c && c.classList.contains('show'));
  }
  document.addEventListener('keydown', function(e){
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (e.code !== 'KeyN' || typing(e.target) || modalOpen()) return;
    e.preventDefault(); open();
  });

  /* MACRO 뉴스 줄 · 관심 종목 카드에 [＋ 일기] */
  function decorate(){
    document.querySelectorAll('#newsRows .news-row').forEach(function(r){
      if (r.querySelector('.cap-add')) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cap-add'; b.textContent = '＋ 일기'; b.title = '오늘 일기에 담기';
      r.appendChild(b);
    });
    document.querySelectorAll('.wl-card').forEach(function(c){
      if (c.querySelector('.cap-add')) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cap-add'; b.textContent = '＋ 일기'; b.title = '오늘 일기에 담기 (그때 값과 함께)';
      c.appendChild(b);
    });
  }
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest ? e.target.closest('.cap-add') : null; if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var row = b.closest('.news-row');
    if (row){
      var src = (row.querySelector('.news-src') || {}).textContent || '', ttl = (row.querySelector('.news-title') || {}).textContent || '';
      append(src ? '[' + src.trim() + ']' : '', { link: row.getAttribute('href') || '', label: ttl.trim() || '뉴스' });
      return;
    }
    var card = b.closest('.wl-card');
    if (card){
      var sym = ((card.querySelector('.wl-sym') || {}).textContent || '').trim();
      var nm = ((card.querySelector('.wl-name') || {}).textContent || '').trim();
      var pr = ((card.querySelector('.wl-price-row') || {}).textContent || '').replace(/\s+/g, ' ').trim();
      append(sym + (nm && nm !== sym ? ' ' + nm : '') + (pr ? ' · ' + pr : ''));
    }
  }, true);

  /* ── ② 고른 낱말 바로 찾기 ── */
  var bub = null, pop = null, selQ = '', selSrc = null, seq = 0;
  function ensureSel(){
    injectCss();
    if (!bub){
      bub = document.createElement('button'); bub.type = 'button'; bub.id = 'selBub'; bub.textContent = '⌕ 뜻 찾기';
      bub.addEventListener('mousedown', function(e){ e.preventDefault(); });   /* 고른 글자가 풀리지 않게 */
      bub.addEventListener('click', function(e){ e.preventDefault(); showPop(); });
      document.body.appendChild(bub);
    }
    if (!pop){
      pop = document.createElement('div'); pop.id = 'selPop'; pop.setAttribute('role', 'dialog');
      document.body.appendChild(pop);
      pop.addEventListener('click', onPopClick);
    }
  }
  function hideAll(){ if (bub) bub.classList.remove('show'); if (pop) pop.classList.remove('show'); }
  function sourceOf(node){
    var el = node && (node.nodeType === 1 ? node : node.parentElement);
    var body = el && el.closest ? el.closest('.note-editable-body') : null;
    if (!body) return null;
    var main = body.closest('[id$="-editor-main"]');
    var type = main ? main.id.replace(/-editor-main$/, '') : '';
    var k = KN(), id = (k && k.activeIds && type) ? k.activeIds[type] : null;
    return { type: type, id: id };
  }
  var selTimer = 0;
  function checkSel(){
    var s = window.getSelection ? window.getSelection() : null;
    if (!s || s.isCollapsed || !s.rangeCount){ if (bub) bub.classList.remove('show'); return; }
    var src = sourceOf(s.anchorNode);
    if (!src || !sourceOf(s.focusNode)){ if (bub) bub.classList.remove('show'); return; }
    var q = String(s.toString() || '').replace(/\s+/g, ' ').trim();
    if (!q || q.length > 40 || /[\n\r]/.test(s.toString().trim())){ if (bub) bub.classList.remove('show'); return; }
    ensureSel();
    selQ = q; selSrc = src;
    var r = s.getRangeAt(0).getBoundingClientRect();
    if (!r || (!r.width && !r.height)) return;
    var navB = 64, touch = window.matchMedia && matchMedia('(hover:none),(pointer:coarse)').matches;
    bub.classList.add('show');
    var bw = bub.offsetWidth || 80, bh = bub.offsetHeight || 30;
    var top = (touch || r.top - bh - 10 < navB) ? r.bottom + 10 : r.top - bh - 8;
    top = Math.max(navB + 4, Math.min(window.innerHeight - bh - 8, top));   /* 화면 밖으로 나가지 않게 */
    var left = Math.max(8, Math.min(window.innerWidth - bw - 8, r.left + r.width / 2 - bw / 2));
    bub.style.top = Math.round(top) + 'px'; bub.style.left = Math.round(left) + 'px';
  }
  document.addEventListener('selectionchange', function(){
    clearTimeout(selTimer);
    selTimer = setTimeout(function(){ if (!document.querySelector('#selPop.show')) checkSel(); }, 260);
  });
  document.addEventListener('mousedown', function(e){
    if (pop && pop.classList.contains('show') && !pop.contains(e.target) && e.target !== bub) pop.classList.remove('show');
  }, true);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') hideAll(); });
  /* 창이든 글 칸 안쪽이든 어디가 스크롤돼도 단추를 감춘다(스크롤 이벤트는 위로 번지지 않으므로 capture 로 받는다) */
  document.addEventListener('scroll', function(e){
    if (!bub || !bub.classList.contains('show')) return;
    if (pop && (pop.classList.contains('show') || (e.target && e.target.nodeType === 1 && pop.contains(e.target)))) return;
    bub.classList.remove('show');
  }, { passive:true, capture:true });

  var results = [];
  function mineOf(q){
    var k = KN(), a = (k && k.data && k.data.lexicon) || [], t = q.toLowerCase();
    for (var i = 0; i < a.length; i++){ if (String(a[i].title || '').trim().toLowerCase() === t) return a[i]; }
    return null;
  }
  var anchor = null;   /* [뜻 찾기] 단추가 있던 자리 — 단추를 숨긴 뒤에도 창 위치를 그 자리에 맞춘다 */
  function placePop(){
    var b = anchor || bub.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 20);
    pop.style.left = Math.round(Math.max(10, Math.min(window.innerWidth - w - 10, b.left + b.width / 2 - w / 2))) + 'px';
    var below = b.bottom + 8, h = pop.offsetHeight || 220;
    pop.style.top = Math.round(below + h > window.innerHeight - 8 ? Math.max(8, b.top - h - 8) : below) + 'px';
  }
  function showPop(){
    if (!selQ) return;
    var q = selQ, my = ++seq, L = window.__nnLookup;
    var mine = mineOf(q);
    pop.innerHTML = '<div class="sp-q">' + esc(q) + '</div>'
      + (mine ? '<div class="sp-it"><span class="sp-b mine">내 사전</span><span class="sp-t">' + esc(mine.title) + '</span><div class="sp-d">' + esc(String(mine.content || '').replace(/<[^>]+>/g, ' ').trim()) + '</div></div>' : '')
      + '<div class="sp-m sp-busy">사전에서 찾는 중…</div>';
    var br = bub.getBoundingClientRect();
    anchor = { left: br.left, top: br.top, bottom: br.bottom, width: br.width };
    pop.classList.add('show'); placePop(); bub.classList.remove('show');
    if (!L || !L.lookup){ fill(q, mine, []); return; }
    L.lookup(q).then(function(r){ if (my !== seq) return; results = (r && r.list) || []; fill(q, mine, results); })
      .catch(function(){ if (my === seq) fill(q, mine, []); });
  }
  function fill(q, mine, list){
    var e = encodeURIComponent(q), en = /^[A-Za-z][A-Za-z\s\-'.]*$/.test(q);
    var h = '<div class="sp-q">' + esc(q) + '</div>';
    if (mine) h += '<div class="sp-it"><span class="sp-b mine">내 사전</span><span class="sp-t">' + esc(mine.title) + '</span><div class="sp-d">' + esc(String(mine.content || '').replace(/<[^>]+>/g, ' ').trim()) + '</div></div>';
    list.slice(0, 3).forEach(function(r, i){
      h += '<div class="sp-it"><span class="sp-b">' + esc(r.badge || '사전') + '</span><span class="sp-t">' + esc(r.title) + '</span>'
        + '<div class="sp-d">' + esc(r.short || '') + '</div>'
        + (mine ? '' : '<button type="button" class="sp-s" data-i="' + i + '">＋ 용어집에 저장</button>') + '</div>';
    });
    if (!mine && !list.length) h += '<div class="sp-m">연결된 사전에서는 찾지 못했습니다.</div>';
    h += '<div class="sp-f"><button type="button" class="sp-go">용어 탭에서 크게 보기 →</button>'
      + '<a href="' + (en ? 'https://en.dict.naver.com/#/search?query=' : 'https://dict.naver.com/dict.search?query=') + e + '" target="_blank" rel="noopener">네이버 사전 ↗</a></div>';
    pop.innerHTML = h;
    placePop();
  }
  function onPopClick(e){
    var go = e.target.closest ? e.target.closest('.sp-go') : null;
    if (go){ hideAll(); if (window.__nnGo && window.__nnGo.lookup) window.__nnGo.lookup(selQ); return; }
    var b = e.target.closest ? e.target.closest('.sp-s') : null; if (!b || b.classList.contains('done')) return;
    var r = results[+b.getAttribute('data-i')], L = window.__nnLookup; if (!r || !L || !L.add) return;
    var note = L.add(r.title, r.short || r.full || '', r.group);
    if (!note) return;
    /* 원래 글과 갈래로 잇는다 */
    try {
      var R = window.__nnRel;
      if (R && R.add && selSrc && selSrc.type && selSrc.id)
        R.add(R.makeRef('note', 'lexicon', note.id), R.makeRef('note', selSrc.type, selSrc.id), '글에서 찾은 낱말');
    } catch(err) {}
    b.textContent = '✓ 용어집에 저장됨 · 글과 이어 둠'; b.classList.add('done');
    toast('📇 “' + esc(note.title) + '” 용어집에 저장');
  }

  /* ── ③ 휴대폰 ＋ ── */
  var fab = null, lastY = 0, scrollHide = false;
  function fabUpdate(){
    if (!fab) return;
    var hide = scrollHide || modalOpen() || typing(document.activeElement) || !!document.querySelector('#siEdOv, #selPop.show');
    if (fab.classList.contains('hide') !== hide) fab.classList.toggle('hide', hide);
  }
  function makeFab(){
    if (fab || document.getElementById('capFab')) return;
    fab = document.createElement('button');
    fab.type = 'button'; fab.id = 'capFab'; fab.title = '한 줄 담기 — 오늘 일기에';
    fab.setAttribute('aria-label', '한 줄 담기 — 오늘 일기 끝에 붙입니다');
    fab.innerHTML = '<span aria-hidden="true">＋</span>';
    fab.addEventListener('click', function(){ open(); fabUpdate(); });
    document.body.appendChild(fab);
    window.addEventListener('scroll', function(){
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (Math.abs(y - lastY) < 14) return;
      scrollHide = y > lastY && y > 160;   /* 내려가는 중이면 숨기고, 올라가면 보인다 */
      lastY = y; fabUpdate();
    }, { passive: true });
    document.addEventListener('focusin', fabUpdate);
    document.addEventListener('focusout', function(){ setTimeout(fabUpdate, 60); });
    try { new MutationObserver(fabUpdate).observe(document.body, { childList: true }); } catch(e) {}
    fabUpdate();
  }

  window.__nnCapture = { open: open, append: append, decorate: decorate, fab: function(){ return fab; } };

  function boot(){
    injectCss();
    decorate();
    makeFab();
    try {
      new MutationObserver(function(m){
        for (var i = 0; i < m.length; i++){ if (m[i].addedNodes && m[i].addedNodes.length){ decorate(); break; } }
      }).observe(document.getElementById('page-macro') || document.body, { childList:true, subtree:true });
    } catch(e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 0); });
  else setTimeout(boot, 0);
})();
