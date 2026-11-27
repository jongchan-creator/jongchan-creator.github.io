/* ══════════════════════════════════════════════════════════════════
   NEWNORMAL — MACRO 길잡이 (nn-macronav.js)   2026-11 신설 · 개선제안 V-7

   왜
     MACRO 는 데스크톱 7.9화면(7,119px), 휴대폰 12.7화면(10,706px)이고 카드가 14장인데
     화면 안에서 건너뛸 방법이 없어, 환율을 보려면 지수 · 히트맵 · 캘린더를 다 지나야 했다.

   무엇
     ① 칩 한 줄 — 시세 띠 위에 붙고, 내리면 상단 메뉴 바로 아래에 붙어 따라온다.
        내 관심 · 지수 · 환율 · 금리 · 원자재 · 뉴스 · 캘린더 · 히트맵 · 시총 TOP
        누르면 그 카드로 건너뛴다(접혀 있으면 펼친다). 지금 보고 있는 카드의 칩이 밝아진다.
        칩 순서는 화면의 카드 순서를 따른다 — '내 관심'을 맨 위로 올리면 칩도 맨 앞으로.
     ② 카드마다 [접기] — 제목 줄만 남긴다. 접은 카드는 칩이 흐려진다.
        TradingView 카드는 접혀 있는 동안 불러오지 않는다(원래 화면에 보일 때 불러오는 방식이라).
     ③ [맨 위로] — 그 카드를 맨 위로 올린다. 칩 줄 끝의 [기본 순서]로 처음 배치로 돌아간다.
        2026-11-26 (회장님: "맨 위로 올리는 기능은 있는데 원래 자리로 돌리는 기능이 없다"):
        올린 카드의 제목 줄에 [↩ 원래 자리](늘 보임) — 그 카드만 처음 자리로. 칩 줄의 [↺ 원래 순서로]는 전부를(휴대폰에서도 보임).
        카드는 실제로 옮기지 않고 CSS order 로만 자리를 바꾼다 — TradingView 창(iframe)을 옮기면 다시 불러오기 때문.

   기억 (이 기기에만 — 휴대폰과 PC 의 보기 습관이 다르므로)
     nn_macro_fold_v1   { 카드 키: 1 }       접은 카드
     nn_macro_order_v1  [ 카드 키, … ]        맨 위로 올린 카드 (앞쪽이 위)
     카드 키 = 카드 안 내용 칸의 id (tvHeatmapWidget · indexRows · fxRows · wlAlertBar …)

   로딩 순서: … → nn-polish.js → nn-macronav.js → …
   ══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__nnMacroNav) return;
  window.__nnMacroNav = true;

  var FOLD_KEY = 'nn_macro_fold_v1', ORDER_KEY = 'nn_macro_order_v1';
  var CHIPS = [
    ['wlAlertBar', '내 관심'], ['indexRows', '지수'], ['fxRows', '환율'], ['ratesRows', '금리'],
    ['commRows', '원자재'], ['tvTopStories', '뉴스'], ['tvEconCalendar', '캘린더'],
    ['tvHeatmapWidget', '히트맵'], ['stockRows', '시총 TOP']
  ];

  function rd(k, d){ try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch(e) { return d; } }
  function wr(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }

  var CSS = [
  '#mcChips{position:sticky;top:var(--mc-top,53px);z-index:150;display:flex;align-items:center;gap:4px;margin:0 0 18px;padding:7px 8px;',
  '  border-radius:var(--nn-r-lg,12px);background:rgba(9,9,11,.8);-webkit-backdrop-filter:blur(14px) saturate(1.1);backdrop-filter:blur(14px) saturate(1.1);',
  '  border:1px solid rgba(255,255,255,.09);box-shadow:0 10px 30px -18px rgba(0,0,0,.9);font-family:var(--nn-font,\'Pretendard\',sans-serif)}',
  '#mcChips .mc-list{display:flex;gap:4px;flex:1 1 auto;min-width:0;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-behavior:smooth}',
  '#mcChips .mc-list::-webkit-scrollbar{display:none}',
  '#mcChips .mcc{flex:none;cursor:pointer;font:600 var(--nn-fs-md,13px)/1 var(--nn-font,\'Pretendard\',sans-serif);padding:8px 13px;border-radius:999px;white-space:nowrap;',
  '  color:var(--nn-ink-2,rgba(240,237,230,.72));background:transparent;border:1px solid transparent;transition:color .18s,background-color .18s}',
  '#mcChips .mcc:hover{color:var(--nn-ink,#f0ede6);background:rgba(255,255,255,.07)}',
  '#mcChips .mcc.on{color:#14120f;background:var(--nn-gold-2,#e8c47e)}',
  '#mcChips .mcc.fold{color:var(--nn-ink-4,rgba(240,237,230,.34))}',
  '#mcChips .mcc.fold.on{color:#14120f}',
  '#mcChips .mc-act{flex:none;cursor:pointer;font:600 var(--nn-fs-sm,12px)/1 var(--nn-font,\'Pretendard\',sans-serif);padding:8px 10px;border-radius:var(--nn-r,9px);white-space:nowrap;',
  '  color:var(--nn-ink-3,rgba(240,237,230,.5));background:transparent;border:0}',
  '#mcChips .mc-act:hover{color:var(--nn-ink,#f0ede6)}',
  '#mcChips .mc-act.mc-reset{color:var(--nn-gold-2,#e8c47e);border:1px solid rgba(232,196,126,.45);border-radius:999px;padding:7px 11px}',
  '#mcChips .mc-act.mc-reset:hover{color:#fff;background:rgba(232,196,126,.14)}',
  'html.nn-nav-light #mcChips .mc-act.mc-reset{color:#8a6420;border-color:rgba(138,100,32,.45)}',
  '#mcChips .mc-sep{flex:none;width:1px;height:18px;background:rgba(255,255,255,.12);margin:0 2px}',
  /* 카드 제목 줄의 단추 */
  '#page-macro .macro-card-title .mc-ctl{order:2;margin-left:auto;display:inline-flex;align-items:center;gap:2px;flex:none;padding-left:10px}',
  '#page-macro .mc-ctl button{cursor:pointer;font:600 var(--nn-fs-xs,11px)/1 var(--nn-font,\'Pretendard\',sans-serif);letter-spacing:0;text-transform:none;',
  '  padding:5px 8px;border-radius:7px;color:var(--nn-ink-3,rgba(240,237,230,.5));background:transparent;border:1px solid transparent;transition:color .15s,background-color .15s,opacity .15s}',
  '#page-macro .mc-ctl button:hover{color:var(--nn-ink,#f0ede6);background:rgba(255,255,255,.07)}',
  '#page-macro .mc-ctl .mc-top{opacity:0}',
  '#page-macro .mc-ctl .mc-back{color:var(--nn-gold-2,#e8c47e);border-color:rgba(232,196,126,.45)}',
  '#page-macro .mc-ctl .mc-back:hover{color:#fff;background:rgba(232,196,126,.16)}',
  '#page-macro .mc-ctl button[hidden]{display:none}',
  '#page-macro .macro-card:hover .mc-ctl .mc-top,#page-macro .mc-ctl .mc-top:focus-visible{opacity:1}',
  '@media (hover:none),(pointer:coarse){#page-macro .mc-ctl .mc-top{opacity:.7}}',
  '#page-macro .mc-ctl .mc-fold i{display:inline-block;margin-left:3px;transition:transform .2s ease;font-style:normal}',
  /* 접힌 카드 — 제목 줄만 */
  '#page-macro .macro-card.mc-folded>:not(.macro-card-title){display:none!important}',
  '#page-macro .macro-card.mc-folded{padding-bottom:8px!important;min-height:0!important;height:auto!important}',
  '#page-macro .macro-card.mc-folded>.macro-card-title{margin-bottom:0!important;border-bottom-color:transparent!important}',
  '#page-macro .macro-card.mc-folded .mc-ctl .mc-fold i{transform:rotate(-90deg)}',
  /* 건너뛴 카드를 잠깐 표시 */
  '@keyframes mcFlash{0%{box-shadow:0 0 0 2px rgba(232,196,126,.75)}100%{box-shadow:0 0 0 2px rgba(232,196,126,0)}}',
  '#page-macro .macro-card.mc-flash{animation:mcFlash 1.4s ease-out 1}',
  /* 밝은 바탕 위 (홈의 밝은 스크롤 바탕 설정을 MACRO 에서도 쓰는 경우) */
  'html.nn-nav-light #mcChips{background:rgba(250,248,243,.86);border-color:rgba(20,18,15,.12)}',
  'html.nn-nav-light #mcChips .mcc{color:rgba(26,26,26,.7)}html.nn-nav-light #mcChips .mcc.on{color:#fff;background:#3d3a33}',
  '@media (max-width:768px){#mcChips{margin:0 -4px 14px;padding:6px;border-radius:10px}#mcChips .mcc{padding:8px 11px;font-size:var(--nn-fs-sm,12px)}#mcChips .mc-act.wide{display:none}',
  '  #page-macro .mc-ctl{padding-left:6px}#page-macro .mc-ctl .mc-top{font-size:0;padding:5px 8px}#page-macro .mc-ctl .mc-top::before{content:"⤒";font-size:14px;line-height:1}',
  '  #mcChips .mc-act.mc-reset{padding:7px 9px}}',
  '@media (prefers-reduced-motion: reduce){#mcChips .mc-list{scroll-behavior:auto}#page-macro .macro-card.mc-flash{animation:none}}'
  ].join('\n');

  function injectCss(){
    if (document.getElementById('nnMacroNavCss')) return;
    var st = document.createElement('style'); st.id = 'nnMacroNavCss'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function grid(){ return document.querySelector('#page-macro .macro-grid'); }
  function cards(){ var g = grid(); return g ? Array.prototype.filter.call(g.children, function(c){ return c.classList && c.classList.contains('macro-card'); }) : []; }
  function keyOf(card){
    if (card.__mcKey) return card.__mcKey;
    var k = '';
    for (var i = 0; i < card.children.length && !k; i++){
      var c = card.children[i];
      if (c.classList && c.classList.contains('macro-card-title')) continue;
      if (c.id) k = c.id; else { var d = c.querySelector && c.querySelector('[id]'); if (d) k = d.id; }
    }
    if (!k){ var t = card.querySelector('.macro-card-title'); k = 't:' + ((t && t.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 24); }
    card.__mcKey = k;
    return k;
  }
  function cardByKey(k){ var cs = cards(); for (var i = 0; i < cs.length; i++) if (keyOf(cs[i]) === k) return cs[i]; return null; }
  function titleOf(card){
    var t = card.querySelector('.macro-card-title'); if (!t) return '';
    var s = ''; for (var i = 0; i < t.childNodes.length; i++){ var n = t.childNodes[i]; if (n.nodeType === 3) s += n.textContent; else break; }
    return s.replace(/\s+/g, ' ').trim();
  }

  /* ── 접기 · 순서 적용 ── */
  function applyState(){
    var fold = rd(FOLD_KEY, {}), order = rd(ORDER_KEY, []);
    if (!Array.isArray(order)) order = [];
    cards().forEach(function(c){
      var k = keyOf(c);
      c.classList.toggle('mc-folded', !!fold[k]);
      var i = order.indexOf(k);
      c.style.order = i >= 0 ? String(i - 1000) : '';
      var b = c.querySelector('.mc-ctl .mc-fold');
      if (b){ b.firstChild.nodeValue = fold[k] ? '펼치기' : '접기'; b.setAttribute('aria-expanded', fold[k] ? 'false' : 'true'); }
      var tp = c.querySelector('.mc-ctl .mc-top'); if (tp) tp.hidden = (i === 0);
      var bk = c.querySelector('.mc-ctl .mc-back'); if (bk) bk.hidden = (i < 0);   /* 올린 카드에만 — 늘 보인다 */
    });
  }
  function decorate(){
    cards().forEach(function(c){
      if (c.querySelector('.mc-ctl')) return;
      var t = c.querySelector('.macro-card-title'); if (!t) return;
      var k = keyOf(c), name = titleOf(c);
      var w = document.createElement('span'); w.className = 'mc-ctl';
      w.innerHTML = '<button type="button" class="mc-back" hidden title="이 카드를 처음 자리로 돌려놓기" aria-label="' + esc(name) + ' 원래 자리로">↩ 원래 자리</button>'
        + '<button type="button" class="mc-top" title="이 카드를 맨 위로" aria-label="' + esc(name) + ' 맨 위로">맨 위로</button>'
        + '<button type="button" class="mc-fold" aria-expanded="true" title="접기 · 펼치기" aria-label="' + esc(name) + ' 접기 · 펼치기">접기<i aria-hidden="true">▾</i></button>';
      w.setAttribute('data-k', k);
      t.appendChild(w);
    });
    applyState();
  }

  function fold(k, v){
    var f = rd(FOLD_KEY, {});
    if (v) f[k] = 1; else delete f[k];
    wr(FOLD_KEY, f); applyState(); paintChips();
    /* 펼친 TradingView 카드는 화면에 보일 때 불러온다 — 크기가 바뀐 것을 알려 준다 */
    if (!v) setTimeout(function(){ try { window.dispatchEvent(new Event('resize')); } catch(e) {} }, 60);
  }
  function toTop(k){
    var o = rd(ORDER_KEY, []); if (!Array.isArray(o)) o = [];
    o = [k].concat(o.filter(function(x){ return x !== k; }));
    wr(ORDER_KEY, o); applyState(); paintChips();
    var c = cardByKey(k); if (c) setTimeout(function(){ jump(c); }, 30);
  }
  function restore(k){
    var o = rd(ORDER_KEY, []); if (!Array.isArray(o)) o = [];
    var c = cardByKey(k), name = c ? titleOf(c) : '';
    wr(ORDER_KEY, o.filter(function(x){ return x !== k; })); applyState(); paintChips();
    if (window.__nnToast) try { window.__nnToast('↩ ' + (name ? '‘' + name.split(/\s{2,}|\s+[A-Z]{2,}/)[0].trim() + '’ 카드를 ' : '카드를 ') + '원래 자리로 돌려놓았습니다'); } catch(e) {}
  }
  function resetOrder(){
    var had = rd(ORDER_KEY, []); wr(ORDER_KEY, []); applyState(); paintChips();
    if (Array.isArray(had) && had.length && window.__nnToast) try { window.__nnToast('↺ 모든 카드를 원래 순서로 돌려놓았습니다'); } catch(e) {}
  }
  function allFolded(){ var f = rd(FOLD_KEY, {}); var cs = cards(); return cs.length && cs.every(function(c){ return f[keyOf(c)]; }); }
  function foldAll(v){
    var f = {}; if (v) cards().forEach(function(c){ f[keyOf(c)] = 1; });
    wr(FOLD_KEY, f); applyState(); paintChips();
    if (!v) setTimeout(function(){ try { window.dispatchEvent(new Event('resize')); } catch(e) {} }, 60);
  }

  /* ── 칩 줄 ── */
  var bar = null;
  function navH(){
    var n = document.querySelector('.nav'), h = n ? n.getBoundingClientRect().height : 53;
    var mb = document.getElementById('nnMnavBar'); if (mb && mb.offsetParent){ var r = mb.getBoundingClientRect(); if (r.bottom > h) h = r.bottom; }
    return Math.round(h);
  }
  function ensureBar(){
    var pg = document.querySelector('#page-macro .macro-page'), g = grid();
    if (!pg || !g) return null;
    if (bar && pg.contains(bar)) return bar;
    bar = document.createElement('nav'); bar.id = 'mcChips'; bar.setAttribute('aria-label', 'MACRO 카드 바로 가기');
    var anchor = document.getElementById('macroTickers');
    if (anchor && anchor.parentNode === pg) pg.insertBefore(bar, anchor); else g.parentNode.insertBefore(bar, g);
    bar.addEventListener('click', onBar);
    return bar;
  }
  function chipList(){
    /* 화면에 놓인 순서대로 — 맨 위로 올린 카드의 칩이 앞으로 */
    var cs = cards(), pos = {};
    cs.forEach(function(c, i){ pos[keyOf(c)] = (parseInt(c.style.order || '0', 10) || 0) * 100 + i; });
    return CHIPS.filter(function(x){ return pos[x[0]] !== undefined; }).sort(function(a, b){ return pos[a[0]] - pos[b[0]]; });
  }
  function paintChips(){
    var b = ensureBar(); if (!b) return;
    b.style.setProperty('--mc-top', navH() + 'px');
    var f = rd(FOLD_KEY, {}), o = rd(ORDER_KEY, []);
    var list = chipList();
    var h = '<div class="mc-list" role="list">' + list.map(function(x){
      return '<button type="button" role="listitem" class="mcc' + (f[x[0]] ? ' fold' : '') + (x[0] === cur ? ' on' : '') + '" data-k="' + x[0] + '"'
        + (f[x[0]] ? ' title="접혀 있음 — 누르면 펼쳐서 보여 줍니다"' : '') + '>' + esc(x[1]) + '</button>';
    }).join('') + '</div><span class="mc-sep" aria-hidden="true"></span>'
      + (Array.isArray(o) && o.length ? '<button type="button" class="mc-act mc-reset" data-a="reset" title="맨 위로 올린 카드를 모두 처음 자리로">↺ 원래 순서로</button>' : '')
      + '<button type="button" class="mc-act" data-a="all">' + (allFolded() ? '모두 펼치기' : '모두 접기') + '</button>';
    if (b.__h !== h){
      var sl = b.querySelector('.mc-list'), keep = sl ? sl.scrollLeft : 0;
      b.innerHTML = h; b.__h = h;
      var nl = b.querySelector('.mc-list'); if (nl) nl.scrollLeft = keep;
    }
  }
  function jump(card){
    var b = ensureBar();
    var off = navH() + (b ? b.getBoundingClientRect().height : 0) + 14;
    var y = card.getBoundingClientRect().top + window.pageYOffset - off;
    try { window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); } catch(e) { window.scrollTo(0, Math.max(0, y)); }
    card.classList.remove('mc-flash'); void card.offsetWidth; card.classList.add('mc-flash');
    setTimeout(function(){ card.classList.remove('mc-flash'); }, 1500);
  }
  function onBar(e){
    var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
    var k = t.getAttribute('data-k'), a = t.getAttribute('data-a');
    if (k){
      var c = cardByKey(k); if (!c) return;
      if (c.classList.contains('mc-folded')) fold(k, false);
      cur = k; paintChips(); lockSpy = Date.now() + 900;
      setTimeout(function(){ jump(c); }, 20);
    }
    else if (a === 'all') foldAll(!allFolded());
    else if (a === 'reset') resetOrder();
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('#page-macro .mc-ctl button') : null; if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var k = b.parentNode.getAttribute('data-k');
    if (b.classList.contains('mc-fold')){ var c = cardByKey(k); fold(k, !(c && c.classList.contains('mc-folded'))); }
    else if (b.classList.contains('mc-top')) toTop(k);
    else if (b.classList.contains('mc-back')) restore(k);
  }, true);

  /* ── 지금 보고 있는 카드 ── */
  var cur = '', lockSpy = 0, raf = 0;
  function spy(){
    raf = 0;
    if (Date.now() < lockSpy) return;
    var pg = document.getElementById('page-macro'); if (!pg || !pg.classList.contains('active')) return;
    var b = ensureBar(); if (!b) return;
    var line = navH() + b.getBoundingClientRect().height + 40, best = '', bestTop = -Infinity;
    chipList().forEach(function(x){
      var c = cardByKey(x[0]); if (!c) return;
      var r = c.getBoundingClientRect();
      if (r.top <= line && r.bottom > line - 20 && r.top > bestTop){ best = x[0]; bestTop = r.top; }
    });
    if (best !== cur){
      cur = best; paintChips();
      var on = b.querySelector('.mcc.on'), l = b.querySelector('.mc-list');
      if (on && l){ var lr = l.getBoundingClientRect(), or = on.getBoundingClientRect(); if (or.left < lr.left || or.right > lr.right) l.scrollLeft += (or.left - lr.left) - lr.width / 2 + or.width / 2; }
    }
  }
  window.addEventListener('scroll', function(){ if (!raf) raf = requestAnimationFrame(spy); }, { passive:true });
  window.addEventListener('resize', function(){ if (bar) bar.style.setProperty('--mc-top', navH() + 'px'); });

  function boot(){
    injectCss();
    if (!grid()) return;
    decorate(); paintChips();
  }
  /* MACRO 는 처음 들어갈 때 그려지는 부분이 있어, 들어갈 때마다 한 번 더 */
  function hook(){
    var sw = window.switchPage;
    if (typeof sw !== 'function' || sw.__mcWrapped) return;
    var w = function(name){ var r = sw.apply(this, arguments); if (name === 'macro') { setTimeout(boot, 60); setTimeout(boot, 900); } return r; };
    try { Object.keys(sw).forEach(function(p){ if (!(p in w)) w[p] = sw[p]; }); } catch(e) {}
    w.__mcWrapped = true; window.switchPage = w;
  }
  function start(){ boot(); hook(); setTimeout(hook, 1200); setTimeout(boot, 1500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(start, 0); });
  else setTimeout(start, 0);

  window.__nnMacro = { fold: fold, toTop: toTop, restore: restore, reset: resetOrder, foldAll: foldAll, refresh: boot };
})();
