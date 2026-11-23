/* ══════════════════════════════════════════════════════════════════
   NEWNORMAL — 종목 명부 · 종목 한 장 · 일기와 논거 잇기 (nn-ticker.js)
   2026-11 신설 · 개선제안 S-6 · R-3

   ① 종목 명부 (S-6)
      종목을 적어 두는 곳이 10군데이고 서로 몰랐다(보유 종목 · 주식 평가액 · 모의 투자 · 관심 종목 · 텐베거 후보 ·
      논거 · 매매 기록 · 인텔 메모 …). 새 저장소를 만들지 않고, 열 때마다 그 저장소들을 읽어 '명부'를 만든다.
        티커 · 이름(여러 개) · 거래소 · 통화 · 어디에 있는지
      · 종목을 적는 칸(논거 · 매매 기록 · 주식 · 종목 추가 · 모의 투자 · 텐베거)에 자동완성 목록을 붙인다.
      · 논거 · 매매 기록 · 주식 칸에 'Tsla' · '테슬라'처럼 적으면 저장 직전에 'TSLA'로 맞추고 알려 준다
        — 같은 종목이 다른 글자로 적혀 연결이 끊기던 일을 막는다.

   ② 종목 한 장 (S-6)
      종목 하나에 대해 흩어져 있던 것을 한 장에 모은다.
        보유(수량 · 평단 · 평가액 · 손익) · 논거와 상태 · 매매 기록 · 그 종목이 나온 일기 · 다른 노트 ·
        인텔 메모 · 관심 종목 메모와 알림 · 텐베거 메모 · 이어 둔 맥락
      여는 곳: 검색창(Ctrl+K)에 티커나 이름 · 논거/매매 기록 카드의 티커 · 종목 분석 제목 옆 · 일기의 종목 칩

   ③ 일기와 논거 잇기 (R-3)
      일기를 쓰는 동안 본문에 보유 · 논거 · 매매 기록이 있는 종목의 티커나 이름이 나오면,
      맥락 칸 아래에 [＋ NVDA 논거와 잇기] 칩이 뜬다. 누르면 그 논거와 이어지고(되돌리기 가능),
      논거 화면의 맥락 칸에 이 일기가 나타난다. 논거가 없는 종목은 [NVDA ↗](종목 한 장)만 보인다.

   ④ 2026-11-23 더한 것
      · 논거 화면에 '이 종목이 나온 일기'를 날짜순으로 모은다 (R-3 마무리) — 줄마다 [＋ 잇기] · 누르면 그 일기로
      · 자동완성을 종목 분석(Tenbagger Lab) 칸에도 (S-6)
      · 관심 종목 추가 · 마퀴 종목 편집의 검색칸 아래에 '내 종목' 칩 — 쳐 넣은 글자로 걸러지고, 누르면 티커 칸이 채워진다
        (그 두 칸은 Worker 검색 결과 목록이 따로 있어 브라우저 자동완성 목록을 붙이면 목록이 둘이 된다 — 그래서 칩으로)

   window.__nnTicker = { list, get, resolve, mentions, open, close, refresh, diaries, diaryBlock }
   색과 크기는 nn-tokens.css 의 이름표만 쓴다(V-6).
   로딩 순서: … → nn-capture.js → nn-ticker.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__nnTicker) return;

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  function rd(k, d){ try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch(e) { return d; } }
  function KN(){ return window.KnowledgeNotes; }
  function sp(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function up(s){ return sp(s).toUpperCase(); }
  function num(v){ var x = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(x) ? x : 0; }
  function strip(h){ var d = document.createElement('div'); d.innerHTML = String(h || ''); return sp(d.textContent || ''); }
  function toast(msg, o){ if (window.__nnToast) window.__nnToast(msg, o || {}); }

  /* ══════════ ① 종목 명부 ══════════ */
  var cache = null, cacheAt = 0;
  function build(){
    var M = {};
    function ent(tk){
      tk = up(tk).replace(/^[A-Z]+:/, function(p){ return /^(NASDAQ|NYSE|AMEX|CBOE|KRX|KOSDAQ|KOSPI|TSE|HKEX|LSE|BATS|ARCA):$/.test(p) ? '' : p; });
      if (!tk || tk.length > 16) return null;
      return M[tk] || (M[tk] = { tk:tk, name:'', names:{}, exch:'', ccy:'', sym:'', src:{} });
    }
    function nm(e, n){
      n = sp(n); if (!e || !n || n.toUpperCase() === e.tk) return;
      if (!e.name) e.name = n;
      e.names[n.toLowerCase()] = n;
    }
    /* 보유 종목 (종목 분석) */
    var H = (window.HOLDINGS && window.HOLDINGS.length) ? window.HOLDINGS : rd('nn_hold_v2', []);
    (H || []).forEach(function(h){
      var e = ent(h && h.tk); if (!e) return;
      e.src.hold = 1; e.sym = h.sym || e.sym;
      if (h.sym && h.sym.indexOf(':') > 0) e.exch = h.sym.split(':')[0];
      nm(e, h.nm);
    });
    /* 주식 평가액 · 모의 투자 */
    var A = rd('nn_assets_v1', {}) || {};
    (A.stocks || []).forEach(function(s){ var e = ent(s && s.ticker); if (!e) return; e.src.stock = 1; if (s.ccy) e.ccy = s.ccy; nm(e, s.name); });
    ((A.paper && A.paper.positions) || []).forEach(function(s){ var e = ent(s && s.ticker); if (!e) return; e.src.paper = 1; if (s.ccy && !e.ccy) e.ccy = s.ccy; nm(e, s.name); });
    /* 관심 종목 (MACRO) */
    var WN = rd('nn_wl_names_v1', {}) || {};
    (rd('nn_watchlist_v1', []) || []).forEach(function(w){
      var e = ent(w && w.sym); if (!e) return;
      e.src.watch = 1; e.market = w.market || e.market;
      if (w.market === 'kr' && !e.ccy) e.ccy = 'KRW';
      nm(e, WN[w.sym]);
    });
    /* 텐베거 후보 */
    (rd('nn_tb_watch', []) || []).forEach(function(t){ var e = ent(t && t.sym); if (!e) return; e.src.tb = 1; nm(e, t.name); });
    /* 논거 · 매매 기록 */
    var CV = window.__nnConv ? window.__nnConv.all() : rd('nn_conviction_v1', []);
    (CV || []).forEach(function(c){ var e = ent(c && c.asset); if (e) e.src.conv = (e.src.conv || 0) + 1; });
    var JN = window.__nnJournal ? window.__nnJournal.all() : rd('nn_journal_v1', []);
    (JN || []).forEach(function(j){ var e = ent(j && j.asset); if (e) e.src.journal = (e.src.journal || 0) + 1; });
    /* 인텔 메모 */
    try {
      var hi = KN() && KN().data && KN().data.holdIntel;
      if (hi) Object.keys(hi).forEach(function(t){
        var it = hi[t]; if (!it) return;
        if ((it.memos || []).length || (it.news || []).length){ var e = ent(t); if (e) e.src.intel = 1; }
      });
    } catch(e) {}
    /* 이름 사전 — 세계 시총 상위(엔비디아 · 애플 …). 내 기록에 없어도 자동완성과 이름 맞추기에 쓴다 */
    (window.MEGACAPS || []).forEach(function(m){ if (!m || !m.s) return; var e = ent(m.s); if (!e) return; if (!Object.keys(e.src).length) e.src.mega = 1; nm(e, m.n); });
    return M;
  }
  function reg(){
    if (!cache || Date.now() - cacheAt > 2500){ cache = build(); cacheAt = Date.now(); }
    return cache;
  }
  window.addEventListener('storage', function(){ cache = null; });
  var RANK = ['hold','stock','conv','journal','paper','watch','tb','intel','mega'];
  function rank(e){ for (var i = 0; i < RANK.length; i++) if (e.src[RANK[i]]) return i; return RANK.length; }
  function list(){
    var M = reg();
    return Object.keys(M).map(function(k){ return M[k]; }).sort(function(a, b){ return rank(a) - rank(b) || a.tk.localeCompare(b.tk); });
  }
  function get(tk){ return reg()[up(tk)] || null; }
  /* 글자 → 티커. 티커(대소문자 무관)나 알려진 이름과 똑같을 때만 */
  function resolve(text){
    var t = sp(text); if (!t) return '';
    var M = reg(), U = t.toUpperCase();
    if (M[U]) return U;
    var L = t.toLowerCase();
    var keys = Object.keys(M);
    for (var i = 0; i < keys.length; i++){ if (M[keys[i]].names[L]) return keys[i]; }
    return '';
  }
  /* 글 속에 나온 종목 — 내 기록이 있는 종목만(보유 · 주식 · 논거 · 매매 기록) */
  function mine(e){ return e.src.hold || e.src.stock || e.src.conv || e.src.journal; }
  function reEsc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function hit(text, e){
    if (/^[A-Z0-9.\-]{2,12}$/.test(e.tk) && new RegExp('(^|[^A-Za-z0-9])' + reEsc(e.tk) + '(?![A-Za-z0-9])').test(text)) return e.tk;
    var ns = Object.keys(e.names);
    for (var i = 0; i < ns.length; i++){
      var n = e.names[ns[i]];
      if (/[가-힣]/.test(n)){ if (n.length >= 2 && text.indexOf(n) >= 0) return n; }
      else if (n.length >= 4 && new RegExp('(^|[^A-Za-z0-9])' + reEsc(n) + '(?![A-Za-z0-9])', 'i').test(text)) return n;
    }
    return '';
  }
  function mentions(text, all){
    var out = [], M = reg();
    Object.keys(M).forEach(function(k){ var e = M[k]; if (!all && !mine(e)) return; var w = hit(text, e); if (w) out.push({ tk:k, word:w }); });
    return out;
  }

  /* ── 자동완성 · 이름 맞추기 ── */
  var DL_ID = 'nnTkList';
  var LIST_IDS = { cvA:1, jnA:1, haTk:1, pmBuyTk:1, twAdd:1, wlSymIn:1, researchInput:1 };
  var NORM_IDS = { cvA:1, jnA:1 };
  function tickerInput(el){
    if (!el || el.tagName !== 'INPUT') return 0;
    if (NORM_IDS[el.id]) return 2;
    if (el.getAttribute('placeholder') === 'TICKER' && el.closest && el.closest('#page-assets')) return 2;   /* ASSETS › 주식 표 */
    if (LIST_IDS[el.id]) return 1;
    return 0;
  }
  var SRC_LB = { hold:'보유', stock:'주식', conv:'논거', journal:'매매 기록', paper:'모의', watch:'관심', tb:'텐베거', intel:'인텔', mega:'' };
  function fillList(){
    var dl = document.getElementById(DL_ID);
    if (!dl){ dl = document.createElement('datalist'); dl.id = DL_ID; document.body.appendChild(dl); }
    var h = list().map(function(e){
      var tags = RANK.filter(function(r){ return e.src[r] && SRC_LB[r]; }).map(function(r){ return SRC_LB[r]; }).slice(0, 3).join(' · ');
      return '<option value="' + esc(e.tk) + '" label="' + esc((e.name || '') + (tags ? (e.name ? ' · ' : '') + tags : '')) + '"></option>';
    }).join('');
    if (dl.__h !== h){ dl.innerHTML = h; dl.__h = h; }
  }
  document.addEventListener('focusin', function(e){
    var t = e.target; if (!tickerInput(t)) return;
    try { fillList(); t.setAttribute('list', DL_ID); t.setAttribute('autocomplete', 'off'); } catch(x) {}
  }, true);
  /* 값이 바뀌어 저장되기 직전(change 를 먼저 받는다) — 이름이나 소문자로 적은 것을 티커로 */
  function normalize(t){
    if (tickerInput(t) !== 2) return;
    var v = sp(t.value); if (!v) return;
    var tk = resolve(v);
    if (tk && tk !== v){
      t.value = tk;
      if (tk !== v.toUpperCase()) toast('“' + esc(v) + '” → <b>' + esc(tk) + '</b> 로 맞췄습니다 · 종목 명부');
    }
  }
  document.addEventListener('change', function(e){ normalize(e.target); }, true);
  /* 논거 · 매매 기록 창은 저장 단추가 값을 바로 읽는다 — 단추를 누르기 직전에도 한 번 */
  document.addEventListener('mousedown', function(e){
    var b = e.target && e.target.closest ? e.target.closest('#cvEd button, #jnEd button') : null; if (!b) return;
    ['cvA','jnA'].forEach(function(id){ var i = document.getElementById(id); if (i) normalize(i); });
  }, true);

  /* ══════════ ② 종목 한 장 ══════════ */
  var CSS = [
  '#tkOv{position:fixed;inset:0;z-index:var(--nn-z-sheet,2900000);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px 16px;',
  '  background:rgba(4,4,6,.62);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);opacity:0;transition:opacity var(--nn-dur,.22s) ease;overflow-y:auto;overscroll-behavior:contain}',
  '#tkOv.show{opacity:1}',
  '#tkCard{position:relative;width:min(760px,100%);border-radius:var(--nn-r-xl,16px);background:var(--nn-surface,#0f0e0c);border:1px solid var(--nn-line,rgba(255,255,255,.12));',
  '  box-shadow:var(--nn-shadow-lg);color:var(--nn-ink,#f0ede6);font-family:var(--nn-font);transform:translateY(10px);transition:transform .26s var(--nn-ease,ease)}',
  '#tkOv.show #tkCard{transform:none}',
  '#tkCard .tks-top{display:flex;align-items:flex-start;gap:var(--nn-sp-3);padding:var(--nn-sp-5) var(--nn-sp-5) var(--nn-sp-3);border-bottom:1px solid var(--nn-line)}',
  '#tkCard .tks-h{font:600 var(--nn-fs-xs) var(--nn-font-label);letter-spacing:.24em;color:var(--nn-gold-2)}',
  '#tkCard .tks-t{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:6px}',
  '#tkCard .tks-tk{font-size:var(--nn-fs-2xl);font-weight:800;letter-spacing:.02em}',
  '#tkCard .tks-nm{font-size:var(--nn-fs-lg);color:var(--nn-ink-2);font-weight:600}',
  '#tkCard .tks-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}',
  '#tkCard .tks-tag{font-size:var(--nn-fs-xs);font-weight:600;padding:2px 8px;border-radius:999px;border:1px solid var(--nn-line);color:var(--nn-ink-3)}',
  '#tkCard .tks-tag.on{color:var(--nn-gold-2);border-color:var(--nn-gold-line)}',
  '#tkCard .tks-x{margin-left:auto;flex:none;width:34px;height:34px;border-radius:50%;border:1px solid var(--nn-line);background:transparent;color:var(--nn-ink-2);cursor:pointer;font-size:15px}',
  '#tkCard .tks-x:hover{color:var(--nn-ink);border-color:var(--nn-line-2)}',
  '#tkCard .tks-acts{display:flex;gap:6px;flex-wrap:wrap;padding:var(--nn-sp-3) var(--nn-sp-5) 0}',
  '#tkCard .tks-b{cursor:pointer;font:600 var(--nn-fs-sm) var(--nn-font);padding:7px 12px;border-radius:var(--nn-r);color:var(--nn-ink);background:var(--nn-surface-3);border:1px solid var(--nn-line-2);white-space:nowrap}',
  '#tkCard .tks-b:hover{background:rgba(255,255,255,.1)}',
  '#tkCard .tks-b.pri{color:#14120f;background:var(--nn-gold-2);border-color:var(--nn-gold-2)}',
  '#tkCard .tks-body{padding:var(--nn-sp-2) var(--nn-sp-5) var(--nn-sp-5)}',
  '#tkCard .tks-sec{margin-top:var(--nn-sp-5)}',
  '#tkCard .tks-sh{display:flex;align-items:baseline;gap:8px;font:700 var(--nn-fs-sm) var(--nn-font);color:var(--nn-ink-3);margin-bottom:var(--nn-sp-2)}',
  '#tkCard .tks-sh b{color:var(--nn-ink);font-size:var(--nn-fs-md)}',
  '#tkCard .tks-sh i{font-style:normal;color:var(--nn-ink-4)}',
  '#tkCard .tks-box{border:1px solid var(--nn-line);border-radius:var(--nn-r-lg);background:var(--nn-surface-3)}',
  '#tkCard .tks-row{display:flex;align-items:flex-start;gap:var(--nn-sp-3);padding:10px 14px;border-top:1px solid var(--nn-line)}',
  '#tkCard .tks-box>.tks-row:first-child{border-top:0}',
  '#tkCard button.tks-row{width:100%;text-align:left;cursor:pointer;background:transparent;color:inherit;font:inherit;border-left:0;border-right:0;border-bottom:0}',
  '#tkCard .tks-box>button.tks-row:first-child{border-top:0}',
  '#tkCard button.tks-row:hover{background:rgba(255,255,255,.04)}',
  '#tkCard .tks-l{flex:1;min-width:0}',
  '#tkCard .tks-a{font-size:var(--nn-fs-md);font-weight:600;line-height:1.5}',
  '#tkCard .tks-d{font-size:var(--nn-fs-sm);color:var(--nn-ink-3);line-height:1.6;margin-top:1px;overflow-wrap:anywhere}',
  '#tkCard .tks-d mark{background:var(--nn-gold-soft);color:var(--nn-gold-2);border-radius:3px;padding:0 2px}',
  '#tkCard .tks-r{flex:none;text-align:right;font-size:var(--nn-fs-sm);color:var(--nn-ink-2);font-variant-numeric:tabular-nums;line-height:1.5}',
  '#tkCard .tks-badge{display:inline-block;font-size:var(--nn-fs-xs);font-weight:700;padding:2px 7px;border-radius:999px;border:1px solid currentColor;margin-right:6px;vertical-align:1px}',
  '#tkCard .tks-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1px;background:var(--nn-line);border-radius:var(--nn-r-lg);overflow:hidden;border:1px solid var(--nn-line)}',
  '#tkCard .tks-num>div{background:var(--nn-surface-2);padding:11px 14px}',
  '#tkCard .tks-num .k{font-size:var(--nn-fs-xs);color:var(--nn-ink-3);font-weight:600}',
  '#tkCard .tks-num .v{font-size:var(--nn-fs-lg);font-weight:700;margin-top:3px;font-variant-numeric:tabular-nums}',
  '#tkCard .up{color:var(--nn-good)}#tkCard .dn{color:var(--nn-bad)}',
  '#tkCard .tks-empty{font-size:var(--nn-fs-sm);color:var(--nn-ink-4);padding:10px 2px}',
  '#tkCard .tks-dots{letter-spacing:1px;color:var(--nn-gold-2)}',
  '#tkCard a{color:var(--nn-gold-2)}',
  '@media (max-width:640px){#tkOv{padding:0;align-items:flex-end}#tkCard{border-radius:var(--nn-r-xl) var(--nn-r-xl) 0 0;max-height:94vh;max-height:94dvh;overflow-y:auto}',
  '  #tkCard .tks-top,#tkCard .tks-body{padding-left:var(--nn-sp-4);padding-right:var(--nn-sp-4)}#tkCard .tks-acts{padding-left:var(--nn-sp-4);padding-right:var(--nn-sp-4)}}',
  '@media (prefers-reduced-motion: reduce){#tkOv,#tkCard{transition:none}}',
  /* 카드 위의 티커 — 누르면 종목 한 장 */
  '.cv-c-tk,.jn-c-tk{cursor:pointer}.cv-c-tk:hover,.jn-c-tk:hover{text-decoration:underline;text-underline-offset:2px}',
  /* 종목 분석 제목 옆 단추 */
  '#tkHoldBtn{margin-left:10px;cursor:pointer;font:600 var(--nn-fs-sm) var(--nn-font);padding:5px 10px;border-radius:var(--nn-r);vertical-align:2px;',
  '  color:var(--nn-ink-2);background:rgba(255,255,255,.05);border:1px solid var(--nn-line-2);letter-spacing:0;text-shadow:none}',
  '#tkHoldBtn:hover{color:var(--nn-ink);background:rgba(255,255,255,.1)}',
  /* ③ 일기의 종목 칩 — 편집기 바탕이 흰색 */
  '.dl-tks{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:10px 0 14px;font-family:var(--nn-font)}',
  '.dl-tks .dlt-h{font-size:var(--nn-fs-sm);font-weight:700;color:var(--nn-paper-ink-3);margin-right:2px}',
  '.dl-tks button{cursor:pointer;font:600 var(--nn-fs-sm) var(--nn-font);padding:6px 11px;border-radius:999px;line-height:1.2;',
  '  color:var(--nn-gold-ink);background:rgba(232,196,126,.14);border:1px solid rgba(138,106,36,.35);transition:background-color .15s}',
  '.dl-tks button:hover{background:rgba(232,196,126,.26)}',
  '.dl-tks button.done{color:#1d7a46;background:rgba(74,222,128,.1);border-color:rgba(29,122,70,.3)}',
  '.dl-tks button.tk{color:var(--nn-paper-ink-2);background:transparent;border-color:var(--nn-paper-line)}',
  '.dl-tks button.tk:hover{color:var(--nn-paper-ink);border-color:rgba(0,0,0,.3)}',

  /* 논거 화면 — 이 종목이 나온 일기 */
  '.cv-dy-n{margin-left:8px;font-weight:500;letter-spacing:0;color:var(--nn-ink-3)}',
  '.cv-dy-list{display:flex;flex-direction:column}',
  '.cv-dy-row{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--nn-line)}',
  '.cv-dy-row:last-child{border-bottom:none}',
  '.cv-dy-open{flex:1;min-width:0;display:flex;gap:12px;align-items:baseline;text-align:left;cursor:pointer;background:none;border:none;padding:0;color:var(--nn-ink);font:400 var(--nn-fs-md)/1.6 var(--nn-font)}',
  '.cv-dy-open:hover .cv-dy-s{color:var(--nn-ink)}',
  '.cv-dy-d{flex:none;font:600 var(--nn-fs-sm) var(--nn-font);color:var(--nn-ink-2);font-variant-numeric:tabular-nums;min-width:86px}',
  '.cv-dy-s{min-width:0;color:var(--nn-ink-2);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
  '.cv-dy-s mark{background:rgba(232,196,126,.22);color:inherit;border-radius:3px;padding:0 2px}',
  '.cv-dy-link{flex:none;cursor:pointer;font:600 var(--nn-fs-xs) var(--nn-font);padding:5px 9px;border-radius:999px;white-space:nowrap;',
  '  color:var(--nn-gold-2);background:var(--nn-gold-soft);border:1px solid rgba(232,196,126,.35)}',
  '.cv-dy-link:hover{background:rgba(232,196,126,.24)}',
  '.cv-dy-link.on{color:var(--nn-good);background:var(--nn-good-soft);border-color:rgba(74,222,128,.35)}',
  '.cv-dy-more{margin-top:8px;cursor:pointer;font:600 var(--nn-fs-sm) var(--nn-font);color:var(--nn-gold-2);background:none;border:none;padding:0}',
  '.cv-dy-empty{font:400 var(--nn-fs-md)/1.6 var(--nn-font);color:var(--nn-ink-3)}',
  /* 검색칸 아래 '내 종목' 칩 */
  '.tk-mine{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:6px 0 2px}',
  '.tk-mine[hidden]{display:none}',
  '.tk-mine > span{font:600 var(--nn-fs-xs) var(--nn-font);color:var(--nn-ink-3);margin-right:2px}',
  '.tk-mine button{cursor:pointer;display:inline-flex;align-items:baseline;gap:5px;font:500 var(--nn-fs-sm) var(--nn-font);padding:4px 9px;border-radius:999px;',
  '  color:var(--nn-ink-2);background:var(--nn-surface-3);border:1px solid var(--nn-line-2)}',
  '.tk-mine button b{font-weight:800;color:var(--nn-ink)}',
  '.tk-mine button:hover,.tk-mine button.on{border-color:var(--nn-gold-line);background:var(--nn-gold-soft)}'
  ].join('\n');
  function injectCss(){
    if (document.getElementById('nnTickerCss')) return;
    var st = document.createElement('style'); st.id = 'nnTickerCss'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* 한 장에 모을 것 */
  function gather(tk){
    tk = up(tk);
    var e = get(tk) || { tk:tk, name:'', names:{}, src:{} };
    var aliases = [tk].concat(Object.keys(e.names).map(function(k){ return e.names[k]; }));
    var d = { tk:tk, e:e, aliases:aliases };
    /* 보유 */
    var H = (window.HOLDINGS && window.HOLDINGS.length) ? window.HOLDINGS : rd('nn_hold_v2', []);
    d.hold = (H || []).filter(function(h){ return h && up(h.tk) === tk; })[0] || null;
    var A = rd('nn_assets_v1', {}) || {};
    d.stocks = (A.stocks || []).filter(function(s){ return s && up(s.ticker) === tk; });
    d.paper = ((A.paper && A.paper.positions) || []).filter(function(s){ return s && up(s.ticker) === tk; });
    d.fx = num(A.fx) || 1380;
    /* 논거 · 매매 기록 */
    d.conv = window.__nnConv ? window.__nnConv.forAsset(tk) : [];
    d.jn = (window.__nnJournal ? window.__nnJournal.forAsset(tk) : []).slice().sort(function(a, b){ return String(b.date || '').localeCompare(String(a.date || '')); });
    /* 일기 · 다른 노트에 나온 곳 */
    d.diary = []; d.notes = [];
    var k = KN();
    if (k && k.data){
      Object.keys(k.data).forEach(function(type){
        var arr = k.data[type]; if (!Array.isArray(arr)) return;
        arr.forEach(function(n){
          if (!n || !n.id) return;
          var text = strip(n.content), w = hit(text, e);
          if (!w){ text = sp(n.title); w = hit(text, e); }
          if (!w) return;
          var at = text.indexOf(w); if (at < 0) at = text.toLowerCase().indexOf(w.toLowerCase());
          var s0 = Math.max(0, at - 38), s1 = Math.min(text.length, at + w.length + 60);
          var sn = { pre:(s0 > 0 ? '…' : '') + text.slice(s0, at), w:text.substr(at, w.length), post:text.slice(at + w.length, s1) + (s1 < text.length ? '…' : '') };
          if (type === 'daily') d.diary.push({ n:n, day:n.day || '', sn:sn });
          else d.notes.push({ n:n, type:type, sn:sn });
        });
      });
    }
    d.diary.sort(function(a, b){ return String(b.day).localeCompare(String(a.day)); });
    /* 인텔 메모 */
    d.intel = (k && k.data && k.data.holdIntel && k.data.holdIntel[tk]) || null;
    /* 관심 종목 · 텐베거 */
    var W = rd('nn_watchlist_v1', []) || [], memo = rd('nn_wl_memo_v1', {}) || {}, al = rd('nn_wl_alert_v1', {}) || {};
    d.watch = W.filter(function(w){ return w && up(w.sym) === tk; }).map(function(w){ return { w:w, memo:memo[w.sym] || memo[tk] || '', alert:al[w.market + ':' + w.sym] || null }; });
    d.tb = (rd('nn_tb_watch', []) || []).filter(function(t){ return t && up(t.sym) === tk; })[0] || null;
    /* 이어 둔 맥락 */
    d.rel = [];
    try {
      var R = window.__nnRel;
      if (R){
        var seen = {};
        ['asset:' + tk, 'holding:' + tk].forEach(function(ref){ R.of(ref).forEach(function(x){ if (!seen[x.ref]){ seen[x.ref] = 1; d.rel.push(x); } }); });
      }
    } catch(x) {}
    return d;
  }

  var TAB_LB = { books:'책', lexicon:'용어', media:'미디어', economics:'경제', thesis:'논지' };
  function money(v, ccy){
    if (!isFinite(v)) return '—';
    if (ccy === 'KRW') return '₩' + Math.round(v).toLocaleString('ko-KR');
    return (ccy && ccy !== 'USD' ? ccy + ' ' : '$') + v.toLocaleString('en-US', { maximumFractionDigits:2 });
  }
  function hl(sn){ return esc(sn.pre) + '<mark>' + esc(sn.w) + '</mark>' + esc(sn.post); }

  var ov = null, curTk = '', lastFocus = null, data = null;
  function render(){
    var d = data, e = d.e, h = '';
    var tags = [];
    if (d.hold) tags.push(['보유', 1]);
    if (d.stocks.length) tags.push(['주식 평가액', 1]);
    if (d.conv.length) tags.push(['논거 ' + d.conv.length, 1]);
    if (d.jn.length) tags.push(['매매 기록 ' + d.jn.length, 0]);
    if (d.watch.length) tags.push(['관심 종목', 0]);
    if (d.tb) tags.push(['텐베거 후보', 0]);
    if (d.paper.length) tags.push(['모의 투자', 0]);
    if (e.exch) tags.push([e.exch, 0]);
    h += '<div class="tks-top"><div style="min-width:0"><div class="tks-h">TICKER SHEET</div>'
      + '<div class="tks-t"><span class="tks-tk" id="tkT">' + esc(d.tk) + '</span>' + (e.name ? '<span class="tks-nm">' + esc(e.name) + '</span>' : '') + '</div>'
      + (tags.length ? '<div class="tks-tags">' + tags.map(function(t){ return '<span class="tks-tag' + (t[1] ? ' on' : '') + '">' + esc(t[0]) + '</span>'; }).join('') + '</div>' : '')
      + '</div><button type="button" class="tks-x" aria-label="닫기">✕</button></div>';
    h += '<div class="tks-acts">'
      + (d.hold ? '<button type="button" class="tks-b pri" data-a="hold">종목 분석 열기</button>' : '')
      + ((d.hold || d.intel) ? '<button type="button" class="tks-b" data-a="intel">인텔 서랍</button>' : '')
      + (d.conv.length ? '' : '<button type="button" class="tks-b" data-a="newconv">논거 쓰기</button>')
      + '<button type="button" class="tks-b" data-a="newjn">매매 기록 쓰기</button>'
      + '<button type="button" class="tks-b" data-a="cap">일기에 한 줄</button>'
      + '</div><div class="tks-body">';

    /* 보유 */
    if (d.stocks.length || d.paper.length){
      var q = 0, cost = 0, val = 0, ccy = '';
      d.stocks.forEach(function(s){ var sh = num(s.shares), av = num(s.avgPrice), cu = num(s.curPrice) || av; q += sh; cost += sh * av; val += sh * cu; ccy = s.ccy || ccy || 'USD'; });
      if (d.stocks.length){
        var pl = cost ? (val - cost) / cost * 100 : 0, cls = pl > 0.005 ? 'up' : pl < -0.005 ? 'dn' : '';
        h += '<div class="tks-sec"><div class="tks-sh"><b>보유</b><i>ASSETS › 주식 평가액</i></div><div class="tks-num">'
          + '<div><div class="k">수량</div><div class="v">' + q.toLocaleString('ko-KR', { maximumFractionDigits:4 }) + '주</div></div>'
          + '<div><div class="k">평균 단가</div><div class="v">' + money(q ? cost / q : 0, ccy) + '</div></div>'
          + '<div><div class="k">평가액</div><div class="v">' + money(val, ccy) + '</div></div>'
          + '<div><div class="k">손익</div><div class="v ' + cls + '">' + (pl > 0 ? '+' : '') + pl.toFixed(2) + '%</div></div>'
          + '</div></div>';
      }
      if (d.paper.length){
        h += '<div class="tks-sec"><div class="tks-sh"><b>모의 투자</b></div><div class="tks-box">' + d.paper.map(function(s){
          return '<div class="tks-row"><div class="tks-l"><div class="tks-a">' + num(s.shares) + '주 · 평단 ' + money(num(s.avgPrice), s.ccy) + '</div></div><div class="tks-r">' + money(num(s.shares) * (num(s.curPrice) || num(s.avgPrice)), s.ccy) + '</div></div>';
        }).join('') + '</div></div>';
      }
    }

    /* 논거 */
    h += '<div class="tks-sec"><div class="tks-sh"><b>논거</b><i>CONVICTION</i></div>';
    if (d.conv.length){
      h += '<div class="tks-box">' + d.conv.map(function(c){
        var st = window.__nnConv ? window.__nnConv.statusOf(c.status) : { lb:c.status, c:'#9ba8b5' };
        var dots = ''; for (var i = 1; i <= 5; i++) dots += i <= (c.conviction || 0) ? '●' : '○';
        return '<button type="button" class="tks-row" data-conv="' + esc(c.id) + '"><div class="tks-l"><div class="tks-a"><span class="tks-badge" style="color:' + esc(st.c) + '">' + esc(st.lb) + '</span>' + esc(c.title || '제목 없는 논거') + '</div>'
          + '<div class="tks-d">' + esc(c.summary || '') + '</div></div><div class="tks-r"><span class="tks-dots">' + dots + '</span>' + (c.nextReview ? '<br>복기 ' + esc(c.nextReview) : '') + '</div></button>';
      }).join('') + '</div>';
    } else h += '<div class="tks-empty">아직 이 종목의 논거가 없습니다. 위의 [논거 쓰기]로 "왜 들고 있는가"를 남겨 두면 나중에 복기할 수 있습니다.</div>';
    h += '</div>';

    /* 매매 기록 */
    h += '<div class="tks-sec"><div class="tks-sh"><b>매매 기록</b><i>JOURNAL · ' + d.jn.length + '건</i></div>';
    if (d.jn.length){
      h += '<div class="tks-box">' + d.jn.slice(0, 8).map(function(j){
        var a = window.__nnJournal ? window.__nnJournal.actionOf(j.action) : { lb:j.action, c:'#9ba8b5' };
        var qty = j.qty ? j.qty + '주' : '', pr = j.price ? '@ ' + j.price : '';
        return '<button type="button" class="tks-row" data-jn="' + esc(j.id) + '"><div class="tks-l"><div class="tks-a"><span class="tks-badge" style="color:' + esc(a.c) + '">' + esc(a.lb) + '</span>' + esc(j.date || '') + '</div>'
          + '<div class="tks-d">' + esc((j.why && j.why[0]) || j.lesson || '') + '</div></div><div class="tks-r">' + esc([qty, pr].filter(Boolean).join(' ')) + '</div></button>';
      }).join('') + (d.jn.length > 8 ? '<div class="tks-row"><div class="tks-d">그 밖에 ' + (d.jn.length - 8) + '건 — JOURNAL 에서 볼 수 있습니다</div></div>' : '') + '</div>';
    } else h += '<div class="tks-empty">매매 기록이 없습니다.</div>';
    h += '</div>';

    /* 일기 */
    h += '<div class="tks-sec"><div class="tks-sh"><b>이 종목이 나온 일기</b><i>' + d.diary.length + '편 · 날짜순</i></div>';
    if (d.diary.length){
      h += '<div class="tks-box">' + d.diary.slice(0, 10).map(function(x){
        return '<button type="button" class="tks-row" data-day="' + esc(x.day) + '" data-note="' + esc(x.n.id) + '"><div class="tks-l"><div class="tks-a">' + esc(x.day || x.n.title || '') + '</div><div class="tks-d">' + hl(x.sn) + '</div></div></button>';
      }).join('') + (d.diary.length > 10 ? '<div class="tks-row"><div class="tks-d">그 밖에 ' + (d.diary.length - 10) + '편</div></div>' : '') + '</div>';
    } else h += '<div class="tks-empty">' + esc(d.tk) + (d.e.name ? ' · ' + esc(d.e.name) : '') + ' 이(가) 나온 일기가 아직 없습니다.</div>';
    h += '</div>';

    /* 다른 노트 */
    if (d.notes.length){
      h += '<div class="tks-sec"><div class="tks-sh"><b>다른 노트</b><i>' + d.notes.length + '편</i></div><div class="tks-box">' + d.notes.slice(0, 6).map(function(x){
        return '<button type="button" class="tks-row" data-type="' + esc(x.type) + '" data-note="' + esc(x.n.id) + '"><div class="tks-l"><div class="tks-a">' + esc(x.n.title || '제목 없는 페이지') + '</div><div class="tks-d">' + hl(x.sn) + '</div></div><div class="tks-r">' + esc(TAB_LB[x.type] || x.type) + '</div></button>';
      }).join('') + '</div></div>';
    }

    /* 인텔 · 관심 종목 · 텐베거 */
    var memos = (d.intel && d.intel.memos) || [], news = (d.intel && d.intel.news) || [];
    if (memos.length || news.length){
      h += '<div class="tks-sec"><div class="tks-sh"><b>인텔 메모</b><i>RESEARCH 서랍</i></div><div class="tks-box">'
        + memos.slice(-5).reverse().map(function(m){ return '<div class="tks-row"><div class="tks-l"><div class="tks-d" style="color:var(--nn-ink-2)">' + esc(m.text) + '</div></div><div class="tks-r">' + esc(m.date || '') + '</div></div>'; }).join('')
        + news.slice(-5).reverse().map(function(n){ var ok = /^https?:\/\//i.test(n.url || ''); return '<div class="tks-row"><div class="tks-l"><div class="tks-a">' + (ok ? '<a href="' + esc(n.url) + '" target="_blank" rel="noopener">' + esc(n.title) + ' ↗</a>' : esc(n.title)) + '</div></div></div>'; }).join('')
        + '</div></div>';
    }
    if (d.watch.length || d.tb){
      h += '<div class="tks-sec"><div class="tks-sh"><b>관심 · 후보</b></div><div class="tks-box">';
      d.watch.forEach(function(x){
        var a = x.alert, band = a ? [a.lo != null ? '아래 ' + a.lo : '', a.hi != null ? '위 ' + a.hi : ''].filter(Boolean).join(' · ') : '';
        h += '<div class="tks-row"><div class="tks-l"><div class="tks-a">MACRO 관심 종목 · ' + esc(String(x.w.market || '').toUpperCase()) + '</div>'
          + '<div class="tks-d">' + (x.memo ? esc(x.memo) : '메모 없음') + '</div></div><div class="tks-r">' + (band ? '알림 ' + esc(band) : '') + '</div></div>';
      });
      if (d.tb) h += '<div class="tks-row"><div class="tks-l"><div class="tks-a">RESEARCH 텐베거 후보</div><div class="tks-d">' + esc(d.tb.memo || '메모 없음') + '</div></div><div class="tks-r">' + (d.tb.addedPrice ? '담을 때 ' + esc(d.tb.addedPrice) : '') + '</div></div>';
      h += '</div></div>';
    }
    if (d.rel.length){
      h += '<div class="tks-sec"><div class="tks-sh"><b>이어 둔 맥락</b></div><div class="tks-box">' + d.rel.slice(0, 8).map(function(x, i){
        return '<button type="button" class="tks-row" data-rel="' + i + '"><div class="tks-l"><div class="tks-a">' + esc(x.target.title) + '</div>' + (x.memo ? '<div class="tks-d">' + esc(x.memo) + '</div>' : '') + '</div><div class="tks-r">' + esc(x.target.label || '') + '</div></button>';
      }).join('') + '</div></div>';
    }
    h += '</div>';
    return h;
  }
  function open(tk){
    tk = up(tk); if (!tk) return;
    injectCss();
    data = gather(tk); curTk = tk;
    if (!ov){
      lastFocus = document.activeElement;
      ov = document.createElement('div'); ov.id = 'tkOv';
      ov.innerHTML = '<div id="tkCard" role="dialog" aria-modal="true" aria-labelledby="tkT"></div>';
      document.body.appendChild(ov);
      ov.addEventListener('mousedown', function(e){ if (e.target === ov) close(); });
      ov.addEventListener('click', onClick);
      ov.addEventListener('keydown', function(e){ if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); } });
      requestAnimationFrame(function(){ if (ov) ov.classList.add('show'); });
    }
    ov.querySelector('#tkCard').innerHTML = render();
    ov.scrollTop = 0;
    setTimeout(function(){ var x = ov && ov.querySelector('.tks-x'); if (x) try { x.focus({ preventScroll:true }); } catch(e) {} }, 60);
  }
  function close(){
    if (!ov) return;
    var o = ov; ov = null;
    o.classList.remove('show');
    setTimeout(function(){ if (o.parentNode) o.parentNode.removeChild(o); }, 240);
    try { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true }); } catch(e) {}
  }
  function then(fn){ close(); setTimeout(fn, 220); }
  function onClick(e){
    var t = e.target.closest ? e.target.closest('button') : null; if (!t || !ov || !ov.contains(t)) return;
    var tk = curTk, d = data, a = t.getAttribute('data-a'), v;
    if (t.classList.contains('tks-x')){ close(); return; }
    if (a === 'hold' && d.hold){ then(function(){ if (window.__nnGo) window.__nnGo.holding(d.hold.sym); }); return; }
    if (a === 'intel'){ then(function(){ if (window.openIntelDrawer) window.openIntelDrawer(tk); }); return; }
    if (a === 'newconv'){ then(function(){ if (typeof switchPage === 'function') switchPage('conviction'); setTimeout(function(){ if (window.__nnConvEditor) window.__nnConvEditor(null, { asset:tk }); }, 300); }); return; }
    if (a === 'newjn'){ then(function(){ if (typeof switchPage === 'function') switchPage('journal'); setTimeout(function(){ if (window.__nnJnEditor){ window.__nnJnEditor(null, { asset:tk }); setTimeout(function(){ var i = document.getElementById('jnA'); if (i && !i.value) i.value = tk; }, 60); } }, 300); }); return; }
    if (a === 'cap'){ then(function(){ if (window.__nnCapture) window.__nnCapture.open(); setTimeout(function(){ var ta = document.querySelector('#capOv textarea'); if (ta && !ta.value){ ta.value = tk + ' '; try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch(x) {} } }, 80); }); return; }
    if ((v = t.getAttribute('data-conv'))){ then(function(){ if (typeof switchPage === 'function') switchPage('conviction'); setTimeout(function(){ if (window.__nnConvOpen) window.__nnConvOpen(v); }, 260); }); return; }
    if ((v = t.getAttribute('data-jn'))){ then(function(){ if (typeof switchPage === 'function') switchPage('journal'); setTimeout(function(){ if (window.__nnJnOpen) window.__nnJnOpen(v); }, 260); }); return; }
    if ((v = t.getAttribute('data-day')) !== null && t.hasAttribute('data-day')){ var nid = t.getAttribute('data-note'); then(function(){ if (typeof switchPage === 'function') switchPage('daily'); setTimeout(function(){ try { if (v && window.__nnDaily) window.__nnDaily.open(v); else KN().select('daily', nid); } catch(x) {} }, 220); }); return; }
    if ((v = t.getAttribute('data-type'))){ var id = t.getAttribute('data-note'); then(function(){ if (typeof switchPage === 'function') switchPage(v); setTimeout(function(){ try { if (v === 'thesis' && window.ThesisApp) window.ThesisApp.open(id); else KN().select(v, id); } catch(x) {} }, 280); }); return; }
    if ((v = t.getAttribute('data-rel')) !== null && t.hasAttribute('data-rel')){ var r = d.rel[+v]; if (r && r.target && r.target.open) then(function(){ r.target.open(); }); return; }
  }
  document.addEventListener('keydown', function(e){ if (ov && e.key === 'Escape'){ e.preventDefault(); close(); } });

  /* 논거 · 매매 기록 카드의 티커 → 종목 한 장 (카드를 여는 클릭보다 먼저 받는다) */
  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest ? e.target.closest('.cv-c-tk, .jn-c-tk') : null; if (!t) return;
    var tk = up(t.textContent); if (!tk) return;
    e.preventDefault(); e.stopPropagation();
    open(tk);
  }, true);
  /* 종목 분석 제목 옆 */
  function holdBtn(){
    var ttl = document.getElementById('holdTitle'); if (!ttl || document.getElementById('tkHoldBtn')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'tkHoldBtn'; b.textContent = '종목 한 장';
    b.title = '이 종목의 보유 · 논거 · 매매 기록 · 일기를 한 번에';
    ttl.parentNode.insertBefore(b, ttl.nextSibling);
    b.addEventListener('click', function(){
      var sym = window.__holdCur, H = window.HOLDINGS || [], tk = '';
      for (var i = 0; i < H.length; i++) if (H[i].sym === sym){ tk = H[i].tk; break; }
      if (!tk && H[0]) tk = H[0].tk;
      if (tk) open(tk);
    });
  }

  /* ══════════ ③ 일기와 논거 잇기 (R-3) ══════════ */
  var dlTimer = 0;
  function activeDaily(){
    var k = KN(); if (!k || !k.data || !k.activeIds) return null;
    var id = k.activeIds.daily, arr = k.data.daily || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }
  function paintDiary(){
    var main = document.getElementById('daily-editor-main'); if (!main) return;
    var body = main.querySelector('.note-editable-body'); if (!body) return;
    var note = activeDaily(); if (!note) return;
    injectCss();
    var bar = main.querySelector('.dl-tks');
    var text = sp(body.textContent || '') + ' ' + sp(note.title || '');
    var found = mentions(text, false);
    var R = window.__nnRel, C = window.__nnConv, me = R ? R.makeRef('note', 'daily', note.id) : '';
    var chips = [];
    found.forEach(function(f){
      var th = C ? C.forAsset(f.tk) : [];
      if (th.length && R){
        th.slice(0, 2).forEach(function(c){
          var ref = 'thesis:' + c.id, on = R.exists(me, ref);
          var lb = th.length > 1 ? f.tk + ' 논거(' + (c.title || '').replace(/^\[예시\]\s*/, '').slice(0, 12) + ')' : f.tk + ' 논거';
          chips.push('<button type="button" class="' + (on ? 'done' : '') + '" data-tk="' + esc(f.tk) + '" data-th="' + esc(c.id) + '" title="' + esc(c.title || '') + '">' + (on ? '✓ ' + esc(lb) + '와 이어짐' : '＋ ' + esc(lb) + '와 잇기') + '</button>');
        });
      } else chips.push('<button type="button" class="tk" data-open="' + esc(f.tk) + '" title="종목 한 장">' + esc(f.tk) + ' ↗</button>');
    });
    if (!chips.length){ if (bar) bar.remove(); return; }
    var h = '<span class="dlt-h">글에 나온 종목</span>' + chips.join('');
    if (!bar){
      bar = document.createElement('div'); bar.className = 'dl-tks';
      var panel = main.querySelector('.rl-panel');
      if (panel && panel.parentNode) panel.parentNode.insertBefore(bar, panel.nextSibling);
      else body.parentNode.insertBefore(bar, body);
      bar.addEventListener('click', onDiaryChip);
    }
    if (bar.__h !== h){ bar.innerHTML = h; bar.__h = h; }
  }
  function repaintPanel(ref){
    try {
      var old = document.querySelector('#daily-editor-main .rl-panel[data-ref="' + ref + '"]');
      if (old && window.__nnRelPanel) old.parentNode.replaceChild(window.__nnRelPanel(ref), old);
    } catch(e) {}
  }
  function onDiaryChip(e){
    var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
    var op = b.getAttribute('data-open'); if (op){ open(op); return; }
    var thId = b.getAttribute('data-th'), tk = b.getAttribute('data-tk'), note = activeDaily(), R = window.__nnRel;
    if (!thId || !note || !R) return;
    var me = R.makeRef('note', 'daily', note.id), ref = 'thesis:' + thId;
    if (R.exists(me, ref)){ open(tk); return; }
    var rec = R.add(me, ref, '일기에서 ' + tk + ' 언급');
    var th = window.__nnConv ? window.__nnConv.byId(thId) : null;
    paintDiary(); repaintPanel(me);
    toast('📔 이 일기를 <b>' + esc((th && th.title) || tk + ' 논거') + '</b>에 이었습니다 — 논거 화면의 맥락 칸에 보입니다', { undo: function(){
      if (rec && rec.id && R.remove) R.remove(rec.id);
      paintDiary(); repaintPanel(me);
    }});
  }
  function hookDiary(){
    var k = KN();
    if (!k || !k.renderEditor) return false;
    if (k.renderEditor.__tkWrapped) return true;
    var orig = k.renderEditor;
    var w = function(type){
      var r = orig.apply(this, arguments);
      if (type === 'daily') setTimeout(paintDiary, 30);
      return r;
    };
    try { Object.keys(orig).forEach(function(p){ if (!(p in w)) w[p] = orig[p]; }); } catch(e) {}
    w.__tkWrapped = true; k.renderEditor = w;
    return true;
  }
  document.addEventListener('input', function(e){
    var t = e.target; if (!t || !t.closest || !t.closest('#daily-editor-main')) return;
    clearTimeout(dlTimer); dlTimer = setTimeout(paintDiary, 1200);
  }, true);

  function boot(){
    injectCss();
    (function wait(n){ if (hookDiary() || n > 60) return; setTimeout(function(){ wait(n + 1); }, 200); })(0);
    /* 종목 분석 화면은 열 때 만들어진다 */
    setInterval(function(){ if (document.visibilityState !== 'hidden') holdBtn(); }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 0); });
  else setTimeout(boot, 0);

  /* ── ④ 논거 화면: 이 종목이 나온 일기 (날짜순) ── */
  function diaryHits(tk){
    tk = up(tk); if (!tk) return [];
    var e = get(tk) || { tk:tk, name:'', names:{}, src:{} }, out = [], k = KN();
    ((k && k.data && k.data.daily) || []).forEach(function(n){
      if (!n || !n.id) return;
      var text = strip(n.content), w = hit(text, e);
      if (!w){ text = sp(n.title); w = hit(text, e); }
      if (!w) return;
      var at = text.indexOf(w); if (at < 0) at = text.toLowerCase().indexOf(w.toLowerCase());
      var s0 = Math.max(0, at - 30), s1 = Math.min(text.length, at + w.length + 70);
      out.push({ id:n.id, day:n.day || '', title:n.title || '',
        sn:{ pre:(s0 > 0 ? '…' : '') + text.slice(s0, at), w:text.substr(at, w.length), post:text.slice(at + w.length, s1) + (s1 < text.length ? '…' : '') } });
    });
    out.sort(function(a, b){ return String(b.day).localeCompare(String(a.day)); });
    return out;
  }
  var DY_MAX = 12;
  function diaryBlock(tk, thId){
    injectCss();
    tk = up(tk);
    var box = document.createElement('div');
    box.className = 'cv-blk cv-dy'; box.setAttribute('data-tk', tk);
    var paint = function(all){
      var R = window.__nnRel, me = 'thesis:' + thId, e = get(tk);
      var list = all ? box.__hits : box.__hits.slice(0, DY_MAX);
      var h = '<div class="cv-blk-t">이 종목이 나온 일기<span class="cv-dy-n">' + box.__hits.length + '편 · 최근부터</span></div>';
      if (!box.__hits.length){
        h += '<div class="cv-dy-empty">아직 ' + esc(tk) + (e && e.name ? ' · ' + esc(e.name) : '') + ' 이(가) 나온 일기가 없습니다. 일기에 티커나 이름을 적으면 여기에 날짜순으로 모입니다.</div>';
      } else {
        h += '<div class="cv-dy-list">' + list.map(function(x){
          var on = !!(R && thId && R.exists(R.makeRef('note', 'daily', x.id), me));
          return '<div class="cv-dy-row" data-id="' + esc(x.id) + '" data-day="' + esc(x.day) + '">'
            + '<button type="button" class="cv-dy-open" title="이 일기 열기"><span class="cv-dy-d">' + esc(x.day || x.title) + '</span><span class="cv-dy-s">' + hl(x.sn) + '</span></button>'
            + (R && thId ? '<button type="button" class="cv-dy-link' + (on ? ' on' : '') + '" aria-pressed="' + on + '">' + (on ? '✓ 이어짐' : '＋ 잇기') + '</button>' : '')
            + '</div>';
        }).join('') + '</div>';
        if (!all && box.__hits.length > DY_MAX) h += '<button type="button" class="cv-dy-more">그 밖에 ' + (box.__hits.length - DY_MAX) + '편 더 보기</button>';
      }
      box.innerHTML = h;
    };
    box.__hits = diaryHits(tk);
    paint(false);
    box.addEventListener('click', function(ev){
      var t = ev.target.closest ? ev.target.closest('button') : null; if (!t) return;
      if (t.classList.contains('cv-dy-more')){ paint(true); return; }
      var row = t.closest('.cv-dy-row'); if (!row) return;
      var id = row.getAttribute('data-id'), day = row.getAttribute('data-day');
      if (t.classList.contains('cv-dy-open')){
        if (typeof switchPage === 'function') switchPage('daily');
        setTimeout(function(){ try { if (day && window.__nnDaily && window.__nnDaily.open) window.__nnDaily.open(day); else if (KN()) KN().select('daily', id); } catch(x) {} }, 200);
        return;
      }
      if (t.classList.contains('cv-dy-link')){
        var R = window.__nnRel; if (!R || !thId) return;
        var me = R.makeRef('note', 'daily', id), ref = 'thesis:' + thId;
        if (R.exists(me, ref)){ toast('이미 이어져 있습니다 — 아래 맥락 칸에서 끊을 수 있습니다'); return; }
        var rec = R.add(me, ref, '일기에서 ' + tk + ' 언급');
        paint(false); repaintThesisRel(ref);
        toast('📔 ' + esc(day) + ' 일기를 이 논거에 이었습니다', { undo: function(){ if (rec && rec.id && R.remove) R.remove(rec.id); paint(false); repaintThesisRel(ref); } });
      }
    });
    return box;
  }
  function repaintThesisRel(ref){
    try {
      var old = document.querySelector('#page-conviction .rl-panel[data-ref="' + ref + '"]');
      if (old && window.__nnRelPanel) old.parentNode.replaceChild(window.__nnRelPanel(ref), old);
    } catch(e) {}
  }

  /* ── ④ 검색칸 아래 '내 종목' 칩 (관심 종목 추가 · 마퀴 종목 편집) ── */
  var MINE_FOR = { wlSearchIn:{ sym:'wlSymIn' }, tkSearch:{ sym:'tkSym', name:'tkName' } };
  function minePaint(inp){
    var cfg = MINE_FOR[inp.id]; if (!cfg) return;
    injectCss();
    var box = inp.__tkMine;
    if (!box || !box.parentNode){
      box = document.createElement('div'); box.className = 'tk-mine'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', '내 종목에서 고르기');
      inp.parentNode.insertBefore(box, inp.nextSibling);
      inp.__tkMine = box;
      box.addEventListener('mousedown', function(e){ e.preventDefault(); });   /* 칩을 눌러도 검색칸 초점이 그대로 */
      box.addEventListener('click', function(e){
        var b = e.target.closest ? e.target.closest('button[data-tk]') : null; if (!b) return;
        var tk = b.getAttribute('data-tk'), ent = get(tk) || {};
        var root = inp.closest('.hub-modal') || document;
        var symIn = root.querySelector('#' + cfg.sym);
        if (cfg.sym === 'wlSymIn'){
          var m = /^\d{6}$/.test(tk) ? 'kr' : 'us';
          var mb = root.querySelector('.wl-mkt-opt[data-m="' + m + '"]'); if (mb) mb.click();
        }
        if (symIn){ symIn.value = tk; try { symIn.dispatchEvent(new Event('input', { bubbles:true })); } catch(x) {} }
        if (cfg.name){ var nmIn = root.querySelector('#' + cfg.name); if (nmIn && !nmIn.value) nmIn.value = ent.name || tk; }
        box.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x === b); });
        if (symIn) try { symIn.focus(); } catch(x) {}
      });
    }
    var q = sp(inp.value).toLowerCase();
    var rows = list().filter(function(e){ return !e.src.mega || Object.keys(e.src).length > 1; });   /* 시총 상위 목록에서만 온 것은 '내 종목'이 아니다 */
    if (q) rows = rows.filter(function(e){
      if (e.tk.toLowerCase().indexOf(q) >= 0) return true;
      return Object.keys(e.names).some(function(n){ return n.indexOf(q) >= 0; });
    });
    rows = rows.slice().sort(function(a, b){ return (rank(a) - rank(b)) || (a.tk < b.tk ? -1 : a.tk > b.tk ? 1 : 0); }).slice(0, 8);   /* 보유 · 논거 먼저 */
    if (!rows.length){ box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    var h = '<span>내 종목</span>' + rows.map(function(e){
      return '<button type="button" data-tk="' + esc(e.tk) + '" title="' + esc((e.name || e.tk) + ' — 티커 칸에 넣기') + '"><b>' + esc(e.tk) + '</b>' + (e.name ? esc(String(e.name).slice(0, 12)) : '') + '</button>';
    }).join('');
    if (box.__h !== h){ box.innerHTML = h; box.__h = h; }
  }
  document.addEventListener('focusin', function(e){ var t = e.target; if (t && MINE_FOR[t.id]) { try { minePaint(t); } catch(x) {} } }, true);
  document.addEventListener('input', function(e){ var t = e.target; if (t && MINE_FOR[t.id]) { try { minePaint(t); } catch(x) {} } }, true);

  window.__nnTicker = { list:list, get:get, resolve:resolve, mentions:mentions, open:open, close:close, refresh:function(){ cache = null; },
                        diaries:diaryHits, diaryBlock:diaryBlock };
})();
