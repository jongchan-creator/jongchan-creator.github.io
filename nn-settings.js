/* ══════════════════════════════════════════════════════════════════
   NEWNORMAL — 저장 상태 · 설정 (nn-settings.js)   2026-11 신설

   ① 저장 상태 알림 (개선제안 T-1)
      상단 LOGIN 버튼 왼쪽의 작은 알약(#nnSync). 지금 기록이 어디까지 안전한지 늘 보여 준다.
        ○ 이 기기      로그인하지 않음 — 이 브라우저에만 저장
        ● 저장 중      바뀐 내용을 클라우드에 올리는 중 (1.5초 뒤 자동)
        ● 동기화       클라우드와 맞춰져 있음 (마우스를 올리면 몇 분 전인지)
        ▲ 다시 시도    올리기에 실패 — 누르면 다시 올린다
        ○ 오프라인     인터넷이 끊김 — 다시 연결되면 자동으로 올린다
      글을 쓰는 동안 저장될 때마다 잠깐 "저장됨 ✓"으로 바뀐다.
      누르면 자세한 상태와 [지금 맞추기] · [로그인] 버튼이 나온다.
      휴대폰에서는 메뉴(☰)의 계정 줄 아래에 같은 내용이 한 줄로 나온다.
      정보는 index.html 동기화 블록이 내놓는 window.__nnCloud 와 'nn:sync' 이벤트에서 읽는다.

   ② 설정 한 장 (V-9) · ③ 백업 센터 (T-2) — 아래 코드의 설명 참고.
      상단 톱니(⚙) · 검색창 · 알약의 [백업 · 설정] · 휴대폰 메뉴의 '설정 · 백업' 에서 연다.
      window.__nnSettingsOpen(tab)   tab: 'keys'(연결) · 'look'(화면) · 'data'(데이터) · 'shortcuts'(단축키)

   로딩 순서: … → nn-route.js → nn-settings.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__nnSettings) return;
  window.__nnSettings = {};

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  function ago(at){
    if (!at) return '';
    var m = Math.floor(Math.max(0, Date.now() - at) / 60000);
    if (m < 1) return '방금';
    if (m < 60) return m + '분 전';
    var h = Math.floor(m / 60); if (h < 24) return h + '시간 전';
    return Math.floor(h / 24) + '일 전';
  }
  var GROUP = { vault:'노트', assets:'자산', holdings:'보유 종목', watch:'추적 종목', misc:'설정·기타', hub:'홈 꾸미기' };

  /* ── 지금 상태 ── */
  function state(){
    var C = window.__nnCloud;
    if (navigator.onLine === false) return { k:'off', t:'오프라인', d:'인터넷이 끊겼습니다. 기록은 이 브라우저에 저장되고, 다시 연결되면 자동으로 클라우드에 올립니다.' };
    var u = null; try { u = C && C.user ? C.user() : null; } catch(e) {}
    if (!u) return { k:'local', t:'이 기기', d:'로그인하지 않아 이 브라우저에만 저장됩니다. 로그인하면 내 클라우드에도 자동으로 저장되어 다른 기기에서도 이어 쓸 수 있습니다.' };
    var st = {}, dirty = [];
    try { st = C.state() || {}; dirty = C.dirty() || []; } catch(e) {}
    var at = Math.max(st.lastOkAt || 0, st.lastSync || 0);
    if (st.lastError && (!st.lastOkAt || st.lastError.at > st.lastOkAt))
      return { k:'err', t:'다시 시도', d:'클라우드에 올리지 못했습니다' + (st.lastError.group && GROUP[st.lastError.group] ? ' (' + GROUP[st.lastError.group] + ')' : '') + '. 기록은 이 브라우저에 남아 있습니다. 누르면 다시 올립니다.', at:at, user:u, dirty:dirty };
    if (dirty.length)
      return { k:'saving', t:'저장 중', d:'바뀐 내용을 클라우드에 올리는 중입니다.', at:at, user:u, dirty:dirty };
    if (st.checking)
      return { k:'ok', t:'확인 중', d:'다른 기기에서 바뀐 것이 있는지 확인하는 중입니다.', at:at, user:u, dirty:dirty };
    return { k:'ok', t:'동기화', d:'클라우드와 맞춰져 있습니다.', at:at, user:u, dirty:dirty };
  }

  var CSS = [
  '#nnSync{display:inline-flex;align-items:center;gap:6px;height:26px;margin-left:10px;padding:0 10px 0 9px;cursor:pointer;',
  '  border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:rgba(240,237,230,.74);',
  '  font-family:\'Pretendard\',\'Noto Sans KR\',sans-serif;font-size:11px;font-weight:600;line-height:1;letter-spacing:.01em;white-space:nowrap;',
  '  transition:color .2s ease,border-color .2s ease,background-color .2s ease}',
  '#nnSync:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.3)}',
  '#nnSync i{width:7px;height:7px;border-radius:50%;flex:none;background:currentColor}',
  '#nnSync.k-local i,#nnSync.k-off i{background:transparent;box-shadow:inset 0 0 0 1.5px currentColor}',
  '#nnSync.k-ok{color:#9fe3b9;border-color:rgba(74,222,128,.3)}',
  '#nnSync.k-ok i{background:#4ade80;box-shadow:0 0 6px rgba(74,222,128,.75)}',
  '#nnSync.k-saving{color:#f1d697;border-color:rgba(232,196,126,.42)}',
  '#nnSync.k-saving i{background:#e8c47e;animation:nnSyncPulse 1s ease-in-out infinite}',
  '#nnSync.k-err{color:#ffa3a3;border-color:rgba(255,91,91,.5);background:rgba(255,91,91,.08)}',
  '#nnSync.k-err i{background:#ff5b5b;border-radius:1px;transform:rotate(45deg) scale(.85)}',
  '#nnSync.flash{color:#fff;border-color:rgba(255,255,255,.45)}',
  '@keyframes nnSyncPulse{0%,100%{opacity:1}50%{opacity:.35}}',
  'html.nn-nav-light #nnSync{color:#3d3a33;background:rgba(20,18,15,.04);border-color:rgba(20,18,15,.22)}',
  'html.nn-nav-light #nnSync.k-ok{color:#1d7a46;border-color:rgba(29,122,70,.35)}',
  'html.nn-nav-light #nnSync.k-saving{color:#8a6a24;border-color:rgba(138,106,36,.4)}',
  'html.nn-nav-light #nnSync.k-err{color:#b3261e;border-color:rgba(179,38,30,.4)}',
  'html.nn-nav-light #nnSync.flash{color:#14120f;border-color:rgba(20,18,15,.5)}',
  '@media (max-width:768px){#nnSync{display:none!important}}',
  '@media (prefers-reduced-motion: reduce){#nnSync.k-saving i{animation:none}}',

  /* 자세히 보기 */
  '#nnSyncPop{position:fixed;z-index:3100000;width:300px;max-width:calc(100vw - 24px);padding:16px 16px 14px;border-radius:14px;',
  '  background:linear-gradient(165deg,rgba(24,21,18,.98),rgba(12,11,10,.98));border:1px solid rgba(201,169,110,.3);',
  '  box-shadow:0 24px 60px -18px rgba(0,0,0,.9);color:#f0ede6;font-family:\'Pretendard\',\'Noto Sans KR\',sans-serif;',
  '  opacity:0;transform:translateY(-4px);transition:opacity .16s ease,transform .16s ease;pointer-events:none}',
  '#nnSyncPop.show{opacity:1;transform:none;pointer-events:auto}',
  '#nnSyncPop .sp-h{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;margin-bottom:7px}',
  '#nnSyncPop .sp-h i{width:8px;height:8px;border-radius:50%;background:#9a9a9a}',
  '#nnSyncPop.k-ok .sp-h i{background:#4ade80}#nnSyncPop.k-saving .sp-h i{background:#e8c47e}#nnSyncPop.k-err .sp-h i{background:#ff5b5b}',
  '#nnSyncPop .sp-d{font-size:12.5px;line-height:1.6;color:rgba(240,237,230,.78)}',
  '#nnSyncPop .sp-m{margin-top:9px;font-size:12px;color:rgba(240,237,230,.55);line-height:1.6}',
  '#nnSyncPop .sp-b{display:flex;gap:7px;margin-top:13px;flex-wrap:wrap}',
  '#nnSyncPop .sp-b button{cursor:pointer;font:600 12px \'Pretendard\',sans-serif;padding:7px 12px;border-radius:8px;',
  '  color:#f0ede6;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18)}',
  '#nnSyncPop .sp-b button:hover{background:rgba(255,255,255,.12)}',
  '#nnSyncPop .sp-b button.pri{color:#14120f;background:#e8c47e;border-color:#e8c47e}',

  /* 휴대폰 메뉴 안의 한 줄 */
  '.nnmn-auth .nnst{display:block;margin-top:4px;font-size:11.5px;font-weight:500;color:rgba(240,237,230,.6);letter-spacing:0}',
  '.nnmn-auth .nnst b{font-weight:700}',
  '.nnmn-auth .nnst.k-ok b{color:#7fe0a5}.nnmn-auth .nnst.k-saving b{color:#e8c47e}.nnmn-auth .nnst.k-err b{color:#ff8a8a}'
  ].join('\n');

  function injectCss(){
    if (document.getElementById('nnSettingsCss')) return;
    var st = document.createElement('style'); st.id = 'nnSettingsCss'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── 알약 ── */
  var pill = null, flashUntil = 0, lastKey = '';
  function ensurePill(){
    if (pill && document.body.contains(pill)) return pill;
    var links = document.getElementById('fnCtas') || document.querySelector('.nav-links');
    var w = links && links.querySelector('.wbtn');
    if (!links || !w) return null;
    pill = document.createElement('button');
    pill.type = 'button'; pill.id = 'nnSync';
    pill.setAttribute('aria-live', 'polite');
    pill.innerHTML = '<i aria-hidden="true"></i><span class="t"></span>';
    links.insertBefore(pill, w);
    pill.addEventListener('click', function(e){ e.stopPropagation(); togglePop(); });
    return pill;
  }
  function paint(){
    var p = ensurePill();
    var s = state();
    if (p){
      var flashing = Date.now() < flashUntil;
      var txt = flashing ? '저장됨 ✓' : s.t;
      var cls = 'k-' + s.k + (flashing ? ' flash' : '');
      var title = s.d + (s.at ? ' (마지막 동기화 ' + ago(s.at) + ')' : '');
      var key = cls + '|' + txt + '|' + title;
      if (key !== lastKey){
        lastKey = key;
        p.className = cls;
        p.querySelector('.t').textContent = txt;
        p.title = title;
        p.setAttribute('aria-label', '저장 상태: ' + txt);
      }
    }
    paintMobile(s);
    if (pop && pop.classList.contains('show')) fillPop(s);
  }

  /* 글을 쓰는 동안 저장되면 잠깐 "저장됨 ✓" */
  var lastInput = 0;
  document.addEventListener('input', function(){ lastInput = Date.now(); }, true);
  document.addEventListener('keydown', function(){ lastInput = Date.now(); }, true);
  function hookSave(){
    var k = window.KnowledgeNotes;
    if (!k || typeof k.save !== 'function' || k.save.__statusWrapped) return !!(k && k.save && k.save.__statusWrapped);
    var orig = k.save;
    var w = function(){
      var r = orig.apply(this, arguments);
      if (r !== false && Date.now() - lastInput < 4000){ flashUntil = Date.now() + 1300; paint(); setTimeout(paint, 1350); }
      return r;
    };
    try { Object.keys(orig).forEach(function(p){ if (!(p in w)) w[p] = orig[p]; }); } catch(e) {}
    w.__statusWrapped = true;
    k.save = w;
    return true;
  }

  /* ── 자세히 보기 ── */
  var pop = null;
  function fillPop(s){
    pop.className = 'show k-' + s.k;
    var head = { local:'이 브라우저에만 저장', off:'오프라인', saving:'저장 중', ok:'동기화됨', err:'올리기 실패' }[s.k] || s.t;
    var meta = [];
    if (s.user && s.user.name) meta.push('계정: ' + esc(s.user.name));
    if (s.at) meta.push('마지막 동기화: ' + ago(s.at));
    if (s.dirty && s.dirty.length) meta.push('올릴 차례: ' + s.dirty.map(function(g){ return GROUP[g] || g; }).join(' · '));
    var btns = '';
    if (s.k === 'local') btns += '<button type="button" class="pri" data-a="login">로그인</button>';
    else if (s.k !== 'off') btns += '<button type="button" class="pri" data-a="sync">지금 맞추기</button>';
    if (window.__nnSettingsOpen) btns += '<button type="button" data-a="settings">백업 · 설정</button>';
    pop.innerHTML = '<div class="sp-h"><i></i>' + esc(head) + '</div><div class="sp-d">' + esc(s.d) + '</div>'
      + (meta.length ? '<div class="sp-m">' + meta.join('<br>') + '</div>' : '')
      + (btns ? '<div class="sp-b">' + btns + '</div>' : '');
  }
  function placePop(){
    var p = ensurePill(); if (!p || !pop) return;
    var r = p.getBoundingClientRect();
    var w = Math.min(300, window.innerWidth - 24);
    pop.style.top = Math.round(r.bottom + 8) + 'px';
    pop.style.left = Math.round(Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w))) + 'px';
  }
  function closePop(){ if (pop) pop.classList.remove('show'); }
  function togglePop(){
    if (!pop){
      pop = document.createElement('div'); pop.id = 'nnSyncPop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', '저장 상태');
      document.body.appendChild(pop);
      pop.addEventListener('click', function(e){
        var b = e.target.closest ? e.target.closest('button[data-a]') : null; if (!b) return;
        var a = b.getAttribute('data-a'), C = window.__nnCloud;
        if (a === 'login'){ closePop(); var w = document.querySelector('.nav-links .wbtn'); if (w) w.click(); }
        else if (a === 'sync' && C){
          b.textContent = '맞추는 중…'; b.disabled = true;
          Promise.resolve().then(function(){ return C.flush && C.flush(); }).then(function(){ return C.check && C.check(); })
            .catch(function(){}).then(function(){ paint(); if (window.__nnToast) window.__nnToast(state().k === 'ok' ? '✓ 클라우드와 맞췄습니다' : '클라우드와 맞추지 못했습니다 — 잠시 뒤 다시 해 보세요', state().k === 'ok' ? {} : {kind:'del'}); });
        }
        else if (a === 'settings'){ closePop(); if (window.__nnSettingsOpen) window.__nnSettingsOpen('data'); }
      });
      document.addEventListener('click', function(e){ if (pop && pop.classList.contains('show') && !pop.contains(e.target) && e.target !== pill) closePop(); });
      document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closePop(); });
      window.addEventListener('resize', closePop);
      window.addEventListener('scroll', closePop, { passive:true });
    }
    if (pop.classList.contains('show')){ closePop(); return; }
    var s = state();
    if (s.k === 'err' && window.__nnCloud && window.__nnCloud.flush){ try { window.__nnCloud.flush(); } catch(e) {} }
    fillPop(s); placePop();
  }

  /* ── 휴대폰 메뉴 안의 한 줄 ── */
  function paintMobile(s){
    var a = document.querySelector('#nnMnavPanel .nnmn-auth');
    if (!a) return;
    var span = a.querySelector('.nnst');
    var html = '<b>' + esc(s.t) + '</b>' + (s.at && s.k !== 'local' ? ' · ' + ago(s.at) : (s.k === 'local' ? ' · 이 브라우저에만 저장' : ''));
    if (!span){ span = document.createElement('span'); span.className = 'nnst'; var host = a.querySelector('span') || a; host.appendChild(span); }
    if (span.__h !== html){ span.innerHTML = html; span.__h = html; }
    span.className = 'nnst k-' + s.k;
  }


  /* ══════════════════════════════════════════════════════════════════
     ② 설정 한 장 (개선제안 V-9)  ·  ③ 백업 센터 (T-2)
     상단 메뉴의 톱니(⚙) · 검색창(설정) · 저장 상태 알약의 [백업 · 설정] 에서 연다.
       연결    키 6종 — 무엇에 쓰는지 · 들어 있는지 · 바꾸기/지우기.
               각 탭의 입력 칸은 그대로 두고 같은 값을 쓴다(그 탭의 저장 단추를 대신 눌러 같은 일이 일어나게).
       화면    배경 표시 · 스크롤 바탕 · 날아다니는 지폐(V-5) · 작은 글자 키우기(V-3) · 패널 투명도
       데이터  저장 상태 · 저장 공간 · 날짜별 자동 백업(이 날로 되돌리기) · 클라우드 덮어쓰기 직전 사본
               · 파일 백업 · 보호 PIN
       단축키  키보드 단축키 목록
     색과 크기는 nn-tokens.css 의 이름표만 쓴다(개선제안 V-6).
     ══════════════════════════════════════════════════════════════════ */
  function lsGet(k){ try { return localStorage.getItem(k); } catch(e) { return null; } }
  /* 지울 때도 빈 값으로 저장한다 — removeItem 은 동기화가 알아채지 못해 다른 기기의 옛 값이 되살아난다 */
  function lsSet(k, v){ try { localStorage.setItem(k, v == null ? '' : String(v)); return true; } catch(e) { return false; } }
  function toast(msg, bad){ if (window.__nnToast) window.__nnToast(msg, bad ? { kind:'del' } : {}); }

  var BILL_KEY = 'nn_bill_off_v1', TYPE_KEY = 'nn_type_fix_v1';
  function billOff(){ return lsGet(BILL_KEY) === '1'; }
  function typeFixOn(){ return lsGet(TYPE_KEY) !== '0'; }   /* 기본은 켜짐 */
  function applyLook(){
    document.documentElement.classList.toggle('nn-bill-off', billOff());
    /* 글자 크기는 nn-type.js 가 직접 맞춘다(html.nn-type-fix) */
  }
  applyLook();
  window.addEventListener('storage', function(e){ if (e && e.key === BILL_KEY) applyLook(); });

  var KEYDEFS = [
    { id:'worker', k:'nn_worker_url', name:'내 Worker 주소', url:true,
      use:'한국 시세 · 뉴스 · 국어사전 · 한국은행 자료를 대신 받아 오는 내 중계 서버(Cloudflare Worker)',
      where:'MACRO › 연결 설정', input:'workerUrlMacro', btn:'saveWorkerBtn', ph:'https://….workers.dev' },
    { id:'fmp', k:'nn_fmp_key', name:'FMP',
      use:'미국 지수 · 원자재 · 주가를 실제 값으로 (RESEARCH 와 함께 씁니다)',
      where:'MACRO › 연결 설정', input:'fmpKeyMacro', btn:'saveFmpBtn', get:'https://site.financialmodelingprep.com/register' },
    { id:'finnhub', k:'nn_finnhub', name:'Finnhub',
      use:'관심 종목의 실적 발표일을 D-DAY 에 자동으로 올리고, VIX 지수를 받아 옵니다',
      where:'여기에서만 넣습니다', get:'https://finnhub.io/register',
      after:function(v){ try { window.finnhubKey = v; } catch(e) {} } },
    { id:'ecos', k:'nn_ecos_key', name:'한국은행 ECOS',
      use:'한국 기준금리를 자동으로 갱신합니다',
      where:'MACRO › 기준금리', input:'ecosKey', btn:'ecosSave', get:'https://ecos.bok.or.kr/api/#/' },
    { id:'stdict', k:'nn_stdict_key', name:'표준국어대사전', check:/^[A-Za-z0-9]{16,64}$/,
      use:'용어 탭과 글에서 고른 우리말 낱말의 뜻을 국립국어원 사전에서 찾습니다',
      where:'NOTES › 용어 › LOOK UP', get:'https://stdict.korean.go.kr/openapi/openApiInfo.do',
      after:function(){ try { if (window.__nnLookup && window.__nnLookup.refreshKey) window.__nnLookup.refreshKey(); } catch(e) {} } },
    { id:'apt', k:'nn_apt_key', name:'공공데이터포털',
      use:'아파트 실거래가와 청약 일정을 불러옵니다 (ASSETS › 부동산)',
      where:'ASSETS › 부동산', get:'https://www.data.go.kr/data/15126469/openapi.do',
      after:function(v){ var i = document.getElementById('aptKey'); if (i) i.value = v; var s = document.getElementById('aptKeySt'); if (s) s.textContent = v ? '✓ 저장되었습니다' : '키가 비어 있습니다'; } }
  ];
  function keyVal(d){ return String(lsGet(d.k) || '').trim(); }
  function keyShow(d, v){
    if (!v) return '';
    if (d.url){ try { return new URL(v).host; } catch(e) { return v.slice(0, 28); } }
    return '••••' + esc(v.slice(-4));
  }
  function saveKey(d, v){
    v = String(v || '').trim();
    if (!d.url) v = v.replace(/\s+/g, '');
    if (v && d.check && !d.check.test(v)) return '키 모양이 아닙니다 — 받은 키를 그대로 붙여넣어 주세요';
    if (v && d.url && !/^https:\/\/[^\s\/]+\.[^\s]+$/i.test(v)) return 'https:// 로 시작하는 주소를 넣어 주세요';
    var old = keyVal(d);
    if (old === v) return v ? '이미 같은 값이 들어 있습니다' : '';
    /* 그 탭의 저장 단추를 그대로 누른다 — 배지 · 안내 문구 · 새로 불러오기까지 같은 일이 일어난다 */
    var inp = d.input && document.getElementById(d.input), btn = d.btn && document.getElementById(d.btn);
    var handled = false;
    if (inp && btn){ try { inp.value = v; btn.click(); handled = keyVal(d) === v; } catch(e) {} }
    if (!handled){
      lsSet(d.k, v);
      toast(v ? '✅ ' + d.name + ' 키를 저장했습니다' : d.name + ' 키를 지웠습니다', !v);
    }
    if (d.after) { try { d.after(v); } catch(e) {} }
    return '';
  }

  /* ── 백업 목록 ── */
  var KIND = { auto:'자동', pre:'되돌리기 직전' };
  var GROUPK = { vault:'노트', assets:'자산', holdings:'보유 종목', watch:'추적 종목', misc:'설정·기타', hub:'홈 꾸미기' };
  function parseArr(s){ try { var a = JSON.parse(s || 'null'); return Array.isArray(a) ? a.length : null; } catch(e) { return null; } }
  function countsOf(data){
    var out = [];
    function add(lb, n){ if (typeof n === 'number' && n > 0) out.push(lb + ' ' + n.toLocaleString('ko-KR')); }
    try {
      var v = JSON.parse(data.nn_knowledge_vault_v2 || 'null');
      if (v && typeof v === 'object'){
        add('책', (v.books || []).length); add('용어', (v.lexicon || []).length); add('일기', (v.daily || []).length);
        add('경제', (v.economics || []).length); add('미디어', (v.media || []).length);
      }
    } catch(e) {}
    add('논거', parseArr(data.nn_conviction_v1));
    add('일지', parseArr(data.nn_journal_v1));
    add('보유', parseArr(data.nn_hold_v2));
    return out;
  }
  var WD = ['일','월','화','수','목','금','토'];
  function dayLabel(iso){
    var d = new Date(iso); if (isNaN(d)) return String(iso || '');
    var t = new Date(); t.setHours(0,0,0,0);
    var d0 = new Date(d); d0.setHours(0,0,0,0);
    var diff = Math.round((t - d0) / 86400000);
    var base = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + WD[d.getDay()] + ')';
    return diff === 0 ? '오늘 · ' + base : diff === 1 ? '어제 · ' + base : base;
  }
  function hm(iso){ var d = new Date(iso); return isNaN(d) ? '' : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function kb(n){ n = n || 0; return n >= 1073741824 ? (n / 1073741824).toFixed(1) + 'GB' : n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'; }

  /* ── 창 ── */
  var SCSS = [
  '#nnSetOv{position:fixed;inset:0;z-index:var(--nn-z-sheet,2900000);display:flex;justify-content:flex-end;',
  '  background:rgba(4,4,6,.55);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);opacity:0;transition:opacity var(--nn-dur,.22s) ease}',
  '#nnSetOv.show{opacity:1}',
  '#nnSet{position:relative;width:min(560px,100%);height:100%;display:flex;flex-direction:column;background:var(--nn-surface,#0f0e0c);',
  '  border-left:1px solid var(--nn-line,rgba(255,255,255,.12));box-shadow:var(--nn-shadow-lg);color:var(--nn-ink,#f0ede6);font-family:var(--nn-font);',
  '  transform:translateX(24px);transition:transform .28s var(--nn-ease,ease)}',
  '#nnSetOv.show #nnSet{transform:none}',
  '#nnSet .st-top{display:flex;align-items:center;gap:var(--nn-sp-3);padding:var(--nn-sp-5) var(--nn-sp-5) var(--nn-sp-3)}',
  '#nnSet .st-h{font:600 var(--nn-fs-xs) var(--nn-font-label);letter-spacing:.24em;color:var(--nn-gold-2)}',
  '#nnSet .st-t{font-size:var(--nn-fs-xl);font-weight:700;margin-top:4px}',
  '#nnSet .st-x{margin-left:auto;width:34px;height:34px;border-radius:50%;border:1px solid var(--nn-line);background:transparent;color:var(--nn-ink-2);cursor:pointer;font-size:15px}',
  '#nnSet .st-x:hover{color:var(--nn-ink);border-color:var(--nn-line-2)}',
  '#nnSet .st-tabs{display:flex;gap:4px;padding:0 var(--nn-sp-5);border-bottom:1px solid var(--nn-line)}',
  '#nnSet .st-tab{position:relative;cursor:pointer;background:none;border:0;padding:10px 12px 12px;color:var(--nn-ink-3);font:600 var(--nn-fs-md) var(--nn-font)}',
  '#nnSet .st-tab:hover{color:var(--nn-ink-2)}',
  '#nnSet .st-tab.on{color:var(--nn-ink)}',
  '#nnSet .st-tab.on::after{content:"";position:absolute;left:10px;right:10px;bottom:-1px;height:2px;border-radius:2px;background:var(--nn-gold-2)}',
  '#nnSet .st-body{flex:1;overflow-y:auto;padding:var(--nn-sp-4) var(--nn-sp-5) var(--nn-sp-6);overscroll-behavior:contain}',
  '#nnSet .st-sec{margin:var(--nn-sp-5) 0 var(--nn-sp-2);font:700 var(--nn-fs-sm) var(--nn-font);letter-spacing:.02em;color:var(--nn-ink-3)}',
  '#nnSet .st-sec:first-child{margin-top:0}',
  '#nnSet .st-note{font-size:var(--nn-fs-sm);line-height:1.65;color:var(--nn-ink-3);margin:var(--nn-sp-2) 0}',
  '#nnSet .st-card{border:1px solid var(--nn-line);border-radius:var(--nn-r-lg);background:var(--nn-surface-3);margin-bottom:var(--nn-sp-2)}',
  '#nnSet .st-row{display:flex;align-items:center;gap:var(--nn-sp-3);padding:12px 14px;border-top:1px solid var(--nn-line)}',
  '#nnSet .st-card>.st-row:first-child{border-top:0}',
  '#nnSet .st-l{flex:1;min-width:0}',
  '#nnSet .st-n{font-size:var(--nn-fs-md);font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
  '#nnSet .st-d{font-size:var(--nn-fs-sm);line-height:1.6;color:var(--nn-ink-3);margin-top:2px}',
  '#nnSet .st-d b{color:var(--nn-ink-2);font-weight:600}',
  '#nnSet .st-chip{display:inline-flex;align-items:center;gap:5px;font-size:var(--nn-fs-xs);font-weight:600;padding:2px 8px;border-radius:999px;border:1px solid var(--nn-line);color:var(--nn-ink-3)}',
  '#nnSet .st-chip i{width:6px;height:6px;border-radius:50%;box-shadow:inset 0 0 0 1.5px currentColor}',
  '#nnSet .st-chip.on{color:var(--nn-good);border-color:rgba(74,222,128,.35)}',
  '#nnSet .st-chip.on i{background:var(--nn-good);box-shadow:0 0 6px rgba(74,222,128,.6)}',
  '#nnSet .st-chip.warn{color:var(--nn-warn);border-color:rgba(255,196,126,.4)}',
  '#nnSet .st-chip.warn i{background:var(--nn-warn);box-shadow:none}',
  '#nnSet .st-chip.bad{color:var(--nn-bad);border-color:rgba(248,113,113,.4)}',
  '#nnSet .st-chip.bad i{background:var(--nn-bad);box-shadow:none}',
  '#nnSet button.st-b,#nnSet a.st-b{flex:none;display:inline-flex;align-items:center;gap:6px;cursor:pointer;text-decoration:none;white-space:nowrap;',
  '  font:600 var(--nn-fs-sm) var(--nn-font);padding:7px 12px;border-radius:var(--nn-r);color:var(--nn-ink);background:var(--nn-surface-3);border:1px solid var(--nn-line-2)}',
  '#nnSet .st-b:hover{background:rgba(255,255,255,.1)}',
  '#nnSet .st-b.pri{color:#14120f;background:var(--nn-gold-2);border-color:var(--nn-gold-2)}',
  '#nnSet .st-b.pri:hover{filter:brightness(1.06)}',
  '#nnSet .st-b.ghost{background:transparent;border-color:transparent;color:var(--nn-ink-3);padding-left:6px;padding-right:6px}',
  '#nnSet .st-b.ghost:hover{color:var(--nn-ink)}',
  '#nnSet .st-b.danger{color:#ffb4b4;border-color:rgba(248,113,113,.4)}',
  '#nnSet .st-b:disabled{opacity:.45;cursor:default}',
  '#nnSet .st-edit{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:0 14px 12px}',
  '#nnSet .st-edit input{flex:1 1 220px;min-width:0;font:500 var(--nn-fs-md) var(--nn-font);color:var(--nn-ink);background:rgba(0,0,0,.35);',
  '  border:1px solid var(--nn-line-2);border-radius:var(--nn-r);padding:8px 10px;outline:none}',
  '#nnSet .st-edit input:focus{border-color:var(--nn-gold-line)}',
  '#nnSet .st-err{flex:1 1 100%;font-size:var(--nn-fs-sm);color:var(--nn-bad)}',
  '#nnSet .st-seg{display:inline-flex;flex:none;padding:3px;border-radius:var(--nn-r);background:rgba(0,0,0,.3);border:1px solid var(--nn-line)}',
  '#nnSet .st-seg button{cursor:pointer;border:0;background:transparent;color:var(--nn-ink-3);font:600 var(--nn-fs-sm) var(--nn-font);padding:6px 11px;border-radius:7px}',
  '#nnSet .st-seg button.on{background:var(--nn-ink);color:#14120f}',
  '#nnSet .st-sw{position:relative;flex:none;width:44px;height:26px;border-radius:999px;cursor:pointer;border:1px solid var(--nn-line-2);background:rgba(255,255,255,.08);transition:background .2s ease,border-color .2s ease}',
  '#nnSet .st-sw::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--nn-ink-2);transition:transform .2s var(--nn-ease,ease),background .2s ease}',
  '#nnSet .st-sw[aria-checked="true"]{background:var(--nn-gold-2);border-color:var(--nn-gold-2)}',
  '#nnSet .st-sw[aria-checked="true"]::after{transform:translateX(18px);background:#14120f}',
  '#nnSet .st-meter{height:6px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:8px}',
  '#nnSet .st-meter i{display:block;height:100%;border-radius:6px;background:var(--nn-good)}',
  '#nnSet .st-meter i.warn{background:var(--nn-warn)}#nnSet .st-meter i.bad{background:var(--nn-bad)}',
  '#nnSet .st-bk{display:flex;align-items:center;gap:var(--nn-sp-3);padding:11px 14px;border-top:1px solid var(--nn-line)}',
  '#nnSet .st-card>.st-bk:first-child{border-top:0}',
  '#nnSet .st-bk .st-n{font-size:var(--nn-fs-md)}',
  '#nnSet .st-bk .st-tag{font-size:var(--nn-fs-xs);font-weight:600;color:var(--nn-ink-3);padding:1px 7px;border-radius:999px;border:1px solid var(--nn-line)}',
  '#nnSet .st-bk .st-tag.pre{color:var(--nn-warn);border-color:rgba(255,196,126,.35)}',
  '#nnSet .st-empty{padding:14px;font-size:var(--nn-fs-sm);color:var(--nn-ink-3);line-height:1.6}',
  '#nnSet .st-more{display:block;width:100%;cursor:pointer;padding:10px;border:0;border-top:1px solid var(--nn-line);background:transparent;color:var(--nn-ink-3);font:600 var(--nn-fs-sm) var(--nn-font);border-radius:0 0 var(--nn-r-lg) var(--nn-r-lg)}',
  '#nnSet .st-more:hover{color:var(--nn-ink)}',
  '#nnSet .st-kgroup{margin-bottom:var(--nn-sp-4)}',
  '#nnSet .st-krow{display:flex;gap:var(--nn-sp-3);align-items:baseline;padding:8px 0;border-top:1px solid var(--nn-line);font-size:var(--nn-fs-md)}',
  '#nnSet .st-krow:first-of-type{border-top:0}',
  '#nnSet .st-krow .k{flex:0 0 132px;display:flex;flex-wrap:wrap;gap:4px;align-items:center}',
  '#nnSet .st-krow kbd{font:600 var(--nn-fs-xs) var(--nn-font);padding:3px 7px;border-radius:6px;border:1px solid var(--nn-line-2);background:rgba(255,255,255,.06);color:var(--nn-ink)}',
  '#nnSet .st-krow .d{flex:1;color:var(--nn-ink-2);line-height:1.55;font-size:var(--nn-fs-sm)}',
  '#nnSet a{color:var(--nn-gold-2)}',
  '@media (max-width:640px){',
  '  #nnSetOv{align-items:flex-end}',
  '  #nnSet{width:100%;height:92vh;height:92dvh;border-left:0;border-top:1px solid var(--nn-line);border-radius:var(--nn-r-xl) var(--nn-r-xl) 0 0;transform:translateY(24px)}',
  '  #nnSet .st-top{padding:var(--nn-sp-4) var(--nn-sp-4) var(--nn-sp-2)}',
  '  #nnSet .st-tabs{padding:0 var(--nn-sp-3);overflow-x:auto;scrollbar-width:none}',
  '  #nnSet .st-body{padding:var(--nn-sp-3) var(--nn-sp-4) var(--nn-sp-6)}',
  '  #nnSet .st-row{flex-wrap:wrap}',
  '  #nnSet .st-krow .k{flex-basis:108px}',
  '}',
  '@media (prefers-reduced-motion: reduce){#nnSetOv,#nnSet{transition:none}}',
  /* 상단 메뉴의 톱니 */
  '#nnSetBtn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;margin-left:6px;padding:0;cursor:pointer;flex:none;',
  '  border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:rgba(240,237,230,.78);transition:color .2s,border-color .2s,background-color .2s}',
  '#nnSetBtn:hover{color:#fff;border-color:rgba(255,255,255,.32);background:rgba(255,255,255,.09)}',
  '#nnSetBtn svg{width:15px;height:15px}',
  'html.nn-nav-light #nnSetBtn{color:#3d3a33;background:rgba(20,18,15,.04);border-color:rgba(20,18,15,.22)}',
  '@media (max-width:768px){#nnSetBtn{display:none!important}}',
  /* V-5 지폐 끄기 */
  'html.nn-bill-off .fly-money{display:none!important}'
  ].join('\n');
  var GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.9 4.6 1.7 1.7 0 0 0 9.94 3.04V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.6.85 1 1.51 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/></svg>';
  function injectSheetCss(){
    if (document.getElementById('nnSetCss')) return;
    var st = document.createElement('style'); st.id = 'nnSetCss'; st.textContent = SCSS;
    (document.head || document.documentElement).appendChild(st);
  }

  var ov = null, sheet = null, tab = 'keys', lastFocus = null, editing = '', showAllBk = false;
  var TABS = [['keys','연결'],['look','화면'],['data','데이터'],['keys2','단축키']];

  function ensureGear(){
    if (document.getElementById('nnSetBtn')) return;
    var links = document.getElementById('fnCtas') || document.querySelector('.nav-links');
    var w = links && links.querySelector('.wbtn');
    if (!links || !w) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'nnSetBtn'; b.title = '설정 · 백업'; b.setAttribute('aria-label', '설정 · 백업 열기');
    b.innerHTML = GEAR;
    var p = document.getElementById('nnSync');
    links.insertBefore(b, p && p.parentNode === links ? p.nextSibling : w);
    b.addEventListener('click', function(e){ e.stopPropagation(); open(); });
  }

  function open(which){
    injectSheetCss();
    if (which) tab = (which === 'shortcuts' ? 'keys2' : (which === 'connect' ? 'keys' : which));
    if (TABS.every(function(t){ return t[0] !== tab; })) tab = 'keys';
    try { closePop(); } catch(e) {}
    if (!ov){
      lastFocus = document.activeElement;
      ov = document.createElement('div'); ov.id = 'nnSetOv';
      ov.innerHTML = '<div id="nnSet" role="dialog" aria-modal="true" aria-labelledby="nnSetT">'
        + '<div class="st-top"><div><div class="st-h">SETTINGS</div><div class="st-t" id="nnSetT">설정 · 백업</div></div>'
        + '<button type="button" class="st-x" aria-label="닫기">✕</button></div>'
        + '<div class="st-tabs" role="tablist"></div><div class="st-body"></div></div>';
      document.body.appendChild(ov);
      sheet = ov.querySelector('#nnSet');
      ov.addEventListener('mousedown', function(e){ if (e.target === ov) close(); });
      ov.querySelector('.st-x').addEventListener('click', close);
      sheet.addEventListener('click', onClick);
      sheet.addEventListener('keydown', onKey);
      requestAnimationFrame(function(){ if (ov) ov.classList.add('show'); });
    }
    render();
    setTimeout(function(){ var t = sheet && sheet.querySelector('.st-tab.on'); if (t) try { t.focus({ preventScroll:true }); } catch(e) {} }, 60);
  }
  function close(){
    if (!ov) return;
    var o = ov; ov = null; sheet = null; editing = '';
    o.classList.remove('show');
    setTimeout(function(){ if (o.parentNode) o.parentNode.removeChild(o); }, 260);
    try { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true }); } catch(e) {}
  }
  function isOpen(){ return !!ov; }

  function render(){
    if (!sheet) return;
    sheet.querySelector('.st-tabs').innerHTML = TABS.map(function(t){
      return '<button type="button" role="tab" class="st-tab' + (t[0] === tab ? ' on' : '') + '" aria-selected="' + (t[0] === tab) + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    var body = sheet.querySelector('.st-body');
    var keepScroll = body.__tab === tab ? body.scrollTop : 0;
    body.__tab = tab;
    body.innerHTML = tab === 'keys' ? viewKeys() : tab === 'look' ? viewLook() : tab === 'data' ? viewData() : viewShortcuts();
    body.scrollTop = keepScroll;
    if (tab === 'data') fillData();
    if (editing){ var inp = body.querySelector('.st-edit input'); if (inp) try { inp.focus(); } catch(e) {} }
  }

  /* ── 연결 ── */
  function viewKeys(){
    var n = KEYDEFS.filter(function(d){ return keyVal(d); }).length;
    var h = '<div class="st-note">사이트가 바깥 자료를 받아 오는 데 쓰는 키입니다. 키는 이 브라우저와 <b>본인만 볼 수 있는 내 클라우드</b>에만 저장되고, '
      + '각 서비스의 공식 주소나 내 Worker 로만 보내집니다. 지금 <b>' + n + ' / ' + KEYDEFS.length + '개</b>가 들어 있습니다.</div>';
    h += '<div class="st-card">';
    KEYDEFS.forEach(function(d){
      var v = keyVal(d), on = !!v;
      h += '<div class="st-row"><div class="st-l"><div class="st-n">' + esc(d.name)
        + '<span class="st-chip' + (on ? ' on' : '') + '"><i></i>' + (on ? '들어 있음 · ' + keyShow(d, v) : '비어 있음') + '</span></div>'
        + '<div class="st-d">' + esc(d.use) + '<br>입력하는 곳: ' + esc(d.where)
        + (d.get ? ' · <a href="' + esc(d.get) + '" target="_blank" rel="noopener">발급 안내 ↗</a>' : '') + '</div></div>'
        + (editing === d.id ? '' : '<button type="button" class="st-b" data-key="' + d.id + '">' + (on ? '바꾸기' : '넣기') + '</button>')
        + '</div>';
      if (editing === d.id){
        h += '<form class="st-edit" data-form="' + d.id + '" autocomplete="off" novalidate>'
          + '<input type="' + (d.url ? 'url' : 'password') + '" name="v" spellcheck="false" autocomplete="off" placeholder="' + esc(d.ph || '받은 키를 붙여넣으세요') + '" value="' + esc(v) + '" aria-label="' + esc(d.name) + ' 키">'
          + (d.url ? '' : '<button type="button" class="st-b ghost" data-peek="1">보기</button>')
          + '<button type="submit" class="st-b pri">저장</button>'
          + (on ? '<button type="button" class="st-b danger" data-clear="' + d.id + '">지우기</button>' : '')
          + '<button type="button" class="st-b ghost" data-cancel="1">취소</button>'
          + '<div class="st-err" hidden></div></form>';
      }
    });
    h += '</div>';
    h += '<div class="st-note">MACRO · 용어 · ASSETS 탭에 있던 입력 칸은 그대로 있습니다. 어느 쪽에서 바꿔도 같은 값입니다.</div>';
    return h;
  }

  /* ── 화면 ── */
  function bgMode(){ return lsGet('nn_bg_mode_v1') || 'hero'; }
  function bgScroll(){ return lsGet('nn_bg_scroll_v1') || 'light'; }
  function viewLook(){
    var hero = bgMode() === 'hero';
    var h = '<div class="st-sec">배경</div><div class="st-card">'
      + '<div class="st-row"><div class="st-l"><div class="st-n">배경화면</div><div class="st-d">사진 고르기 · 추가 · 자동 전환은 상단 BACKDROP 메뉴에서 합니다. 단축키 <b>B</b> 로 다음 배경.</div></div>'
      + '<button type="button" class="st-b" data-act="bgmenu">배경 고르기 ›</button></div>'
      + '<div class="st-row"><div class="st-l"><div class="st-n">배경 표시</div><div class="st-d">' + (hero ? '첫 화면에서만 사진이 보이고, 내리면 단색 바탕으로 넘어갑니다.' : '스크롤해도 사진이 계속 보입니다.') + '</div></div>'
      + '<div class="st-seg" role="group" aria-label="배경 표시"><button type="button" data-bmode="fixed" class="' + (!hero ? 'on' : '') + '">계속 보임</button><button type="button" data-bmode="hero" class="' + (hero ? 'on' : '') + '">첫 화면만</button></div></div>';
    if (hero){
      var dark = bgScroll() === 'dark';
      h += '<div class="st-row"><div class="st-l"><div class="st-n">홈 아래쪽 바탕</div><div class="st-d">첫 화면 아래로 내렸을 때의 바탕색입니다.</div></div>'
        + '<div class="st-seg" role="group" aria-label="스크롤 바탕"><button type="button" data-bscroll="dark" class="' + (dark ? 'on' : '') + '">어둡게</button><button type="button" data-bscroll="light" class="' + (!dark ? 'on' : '') + '">밝게</button></div></div>';
    }
    h += '<div class="st-row"><div class="st-l"><div class="st-n">패널 투명도</div><div class="st-d">카드 · 패널 바탕을 얼마나 비치게 할지 정합니다.</div></div>'
      + '<button type="button" class="st-b" data-act="opacity">조절하기 ›</button></div></div>';
    h += '<div class="st-sec">움직임 · 글자</div><div class="st-card">'
      + '<div class="st-row"><div class="st-l"><div class="st-n">날아다니는 지폐</div><div class="st-d">8~15초마다 화면을 가로지르는 날개 달린 지폐입니다. 숫자를 읽을 때 거슬리면 끄세요. 누르면 축포가 터지는 것은 그대로입니다.</div></div>'
      + sw('bill', !billOff(), '날아다니는 지폐') + '</div>'
      + '<div class="st-row"><div class="st-l"><div class="st-n">작은 글자 키우기</div><div class="st-d">10px 안팎으로 작던 글자를 읽는 글과 숫자는 <b>12px</b>, 대문자 꼬리표는 <b>11px</b> 이상으로 올립니다. 끄면 예전 크기로 돌아갑니다.</div></div>'
      + sw('type', typeFixOn(), '작은 글자 키우기') + '</div></div>';
    h += '<div class="st-note">이 설정들은 로그인하면 다른 기기에도 같이 적용됩니다.</div>';
    return h;
  }
  function sw(id, on, label){ return '<button type="button" class="st-sw" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + esc(label) + '" data-sw="' + id + '"></button>'; }

  /* ── 데이터 ── */
  function viewData(){
    var s = state();
    var chip = s.k === 'ok' ? 'on' : s.k === 'err' ? 'bad' : s.k === 'saving' ? 'warn' : '';
    var h = '<div class="st-sec">저장 상태</div><div class="st-card">'
      + '<div class="st-row"><div class="st-l"><div class="st-n">' + esc({ local:'이 브라우저에만 저장', off:'오프라인', saving:'저장 중', ok:'클라우드와 동기화됨', err:'올리기 실패' }[s.k] || s.t)
      + '<span class="st-chip ' + chip + '"><i></i>' + esc(s.t) + (s.at ? ' · ' + ago(s.at) : '') + '</span></div>'
      + '<div class="st-d">' + esc(s.d) + (s.user && s.user.name ? '<br>계정: <b>' + esc(s.user.name) + '</b>' : '') + '</div></div>'
      + (s.k === 'local' ? '<button type="button" class="st-b pri" data-act="login">로그인</button>' : (s.k !== 'off' ? '<button type="button" class="st-b" data-act="sync">지금 맞추기</button>' : ''))
      + '</div>'
      + '<div class="st-row"><div class="st-l"><div class="st-n">저장 공간</div><div class="st-d" id="nnSetStore">재는 중…</div><div class="st-meter"><i id="nnSetMeter" style="width:0"></i></div></div></div>'
      + '</div>';

    h += '<div class="st-sec">날짜별 자동 백업</div>'
      + '<div class="st-note">하루 한 번 이 브라우저 안에 통째로 한 장씩 떠서 <b>30일치</b>를 보관합니다. 되돌리기 직전의 상태도 자동으로 한 장 더 남기므로, 되돌린 뒤 마음이 바뀌어도 다시 돌아올 수 있습니다.</div>'
      + '<div class="st-card" id="nnSetBk"><div class="st-empty">목록을 불러오는 중…</div></div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px"><button type="button" class="st-b" data-act="snapnow">지금 한 장 더 뜨기</button></div>';

    h += '<div class="st-sec">클라우드 덮어쓰기 직전 사본</div>'
      + '<div class="st-note">다른 기기의 내용과 합치거나 크게 줄어든 내용을 올리기 직전에, 덮일 쪽을 그룹별로 떠 둔 것입니다.</div>'
      + '<div class="st-card" id="nnSetSnap"><div class="st-empty">목록을 불러오는 중…</div></div>';

    var d = null; try { d = window.__nnBackup && window.__nnBackup.daysSinceExport ? window.__nnBackup.daysSinceExport() : null; } catch(e) {}
    h += '<div class="st-sec">파일 백업 · 보호 PIN</div><div class="st-card">'
      + '<div class="st-row"><div class="st-l"><div class="st-n">백업 파일</div><div class="st-d">위 두 가지는 브라우저 안에 있어 \'사이트 데이터 삭제\'를 하면 함께 지워집니다. 브라우저 밖에 남는 것은 파일뿐입니다.<br>'
      + (d === null ? '아직 파일로 받은 적이 없습니다.' : '마지막 파일 백업: <b>' + (d === 0 ? '오늘' : d + '일 전') + '</b>') + '</div></div></div>'
      + '<div class="st-row" style="border-top:0;padding-top:0"><button type="button" class="st-b pri" data-act="export">백업 파일 내려받기</button><button type="button" class="st-b" data-act="import">파일에서 불러오기</button></div>'
      + '<div class="st-row"><div class="st-l"><div class="st-n">보호 PIN</div><div class="st-d">백업 파일을 내려받거나 불러올 때 묻는 번호입니다' + (lsGet('nn_db_pin') ? '.' : ' — 아직 정하지 않았습니다.') + '</div></div>'
      + '<button type="button" class="st-b" data-act="pin">' + (lsGet('nn_db_pin') ? 'PIN 바꾸기' : 'PIN 정하기') + '</button></div>'
      + '</div>';
    return h;
  }
  var bkRows = null, snapRows = null, dataSeq = 0;
  function fillData(){
    var my = ++dataSeq;
    /* 저장 공간 */
    try {
      if (window.__nnStorageDetail) window.__nnStorageDetail().then(function(x){
        if (my !== dataSeq || !sheet) return;
        var el = document.getElementById('nnSetStore'), m = document.getElementById('nnSetMeter'); if (!el) return;
        el.innerHTML = '빠른 저장 영역 <b>' + kb(x.localUsed) + ' / 5MB</b> (' + x.localPct + '%)' + (x.diskQuota ? ' · 브라우저 여유 공간 <b>' + kb(x.diskQuota - (x.diskUsage || 0)) + '</b>' : '');
        if (m){ m.style.width = Math.min(100, x.localPct) + '%'; m.className = x.localPct >= 90 ? 'bad' : x.localPct >= 70 ? 'warn' : ''; }
      });
    } catch(e) {}
    /* 자동 백업 */
    loadBackups().then(function(rows){ if (my === dataSeq) paintBackups(rows); });
    loadSnaps().then(function(rows){ if (my === dataSeq) paintSnaps(rows); });
  }
  function loadBackups(){
    var B = window.__nnBigStore;
    if (!B || !B.get) return Promise.resolve(null);
    var idx = {}; try { idx = JSON.parse(lsGet('nn_auto_snap_v1') || '{}') || {}; } catch(e) {}
    var keys = (idx.keys || []).slice().reverse();
    return Promise.all(keys.map(function(k){
      return B.get(k).then(function(r){
        if (!r || !r.data) return null;
        return { key:k, at:r.at, date:r.date, kind:r.kind || 'auto', count:r.count, bytes:r.bytes, sum:countsOf(r.data) };
      }).catch(function(){ return null; });
    })).then(function(a){ return a.filter(Boolean); }).catch(function(){ return null; });
  }
  function paintBackups(rows){
    var host = document.getElementById('nnSetBk'); if (!host) return;
    bkRows = rows;
    if (rows === null){ host.innerHTML = '<div class="st-empty">이 브라우저에서는 자동 백업을 쓸 수 없습니다(IndexedDB 없음). 파일 백업을 이용하세요.</div>'; return; }
    if (!rows.length){ host.innerHTML = '<div class="st-empty">아직 자동 백업이 없습니다. 사이트를 연 지 몇 초 뒤에 오늘 것이 처음 생깁니다. 지금 바로 뜨려면 아래 단추를 누르세요.</div>'; return; }
    var LIM = 7, list = showAllBk ? rows : rows.slice(0, LIM);
    host.innerHTML = list.map(function(r){
      return '<div class="st-bk"><div class="st-l"><div class="st-n">' + esc(dayLabel(r.at || r.date)) + ' <span class="st-tag' + (r.kind === 'pre' ? ' pre' : '') + '">' + esc(KIND[r.kind] || r.kind) + ' · ' + hm(r.at) + '</span></div>'
        + '<div class="st-d">' + esc(r.sum.length ? r.sum.join(' · ') : '항목 ' + (r.count || 0) + '개') + ' · ' + kb(r.bytes) + '</div></div>'
        + '<button type="button" class="st-b" data-restore="' + esc(r.key) + '">이 날로 되돌리기</button></div>';
    }).join('') + (rows.length > LIM ? '<button type="button" class="st-more" data-act="morebk">' + (showAllBk ? '접기 ▴' : '나머지 ' + (rows.length - LIM) + '장 더 보기 ▾') + '</button>' : '');
  }
  function loadSnaps(){
    var B = window.__nnBigStore;
    if (!B || !B.get) return Promise.resolve([]);
    var idx = {}; try { idx = JSON.parse(lsGet('nn_cloud_snap_idx_v1') || 'null') || {}; } catch(e) {}
    var keys = [];
    Object.keys(idx).forEach(function(g){ (idx[g] || []).forEach(function(k){ keys.push(k); }); });
    return Promise.all(keys.map(function(k){
      return B.get(k).then(function(r){ return r && r.data ? { key:k, at:r.at, group:r.group, why:r.why || '', source:r.source || 'local', n:Object.keys(r.data).length } : null; }).catch(function(){ return null; });
    })).then(function(a){ return a.filter(Boolean).sort(function(x, y){ return String(y.at).localeCompare(String(x.at)); }); });
  }
  function paintSnaps(rows){
    var host = document.getElementById('nnSetSnap'); if (!host) return;
    snapRows = rows;
    if (!rows.length){ host.innerHTML = '<div class="st-empty">아직 없습니다. 동기화가 무언가를 덮어쓰기 직전에만 생깁니다 — 없으면 그런 일이 없었다는 뜻입니다.</div>'; return; }
    host.innerHTML = rows.slice(0, 12).map(function(r){
      return '<div class="st-bk"><div class="st-l"><div class="st-n">' + esc(GROUPK[r.group] || r.group) + ' <span class="st-tag">' + (r.source === 'cloud' ? '클라우드 쪽' : '이 기기 쪽') + '</span></div>'
        + '<div class="st-d">' + esc(dayLabel(r.at)) + ' ' + hm(r.at) + (r.why ? ' · ' + esc(r.why) : '') + '</div></div>'
        + '<button type="button" class="st-b" data-snap="' + esc(r.key) + '">되돌리기</button></div>';
    }).join('');
  }

  /* ── 단축키 ── */
  function viewShortcuts(){
    var L = window.__ksList || [];
    var h = '<div class="st-note">글을 쓰는 중에는 동작하지 않습니다. 어디서든 <kbd style="font-size:11px;padding:2px 6px;border:1px solid rgba(255,255,255,.2);border-radius:5px">?</kbd> 를 누르면 같은 안내가 뜹니다.</div>';
    if (!L.length) return h + '<div class="st-empty">단축키 목록을 불러오지 못했습니다.</div>';
    L.forEach(function(sec){
      h += '<div class="st-kgroup"><div class="st-sec">' + esc(sec.g) + '</div><div class="st-card" style="padding:4px 14px">';
      sec.rows.forEach(function(r){
        var keys = String(r[0]).split(' + ').map(function(k){ return '<kbd>' + esc(k) + '</kbd>'; }).join('<span style="color:var(--nn-ink-4)">+</span>');
        h += '<div class="st-krow"><div class="k">' + keys + '</div><div class="d">' + esc(r[1]) + '</div></div>';
      });
      h += '</div></div>';
    });
    return h;
  }

  /* ── 누르기 ── */
  function defOf(id){ for (var i = 0; i < KEYDEFS.length; i++) if (KEYDEFS[i].id === id) return KEYDEFS[i]; return null; }
  function showErr(form, msg){ var e = form && form.querySelector('.st-err'); if (e){ e.textContent = msg; e.hidden = !msg; } }
  function onKey(e){
    if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); if (editing){ editing = ''; render(); } else close(); return; }
    if (e.key === 'Tab'){   /* 창 안에서만 돈다 */
      var f = sheet.querySelectorAll('button,input,a[href]'); f = Array.prototype.filter.call(f, function(x){ return !x.disabled && x.offsetParent; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target && e.target.classList && e.target.classList.contains('st-tab')){
      var i = TABS.map(function(t){ return t[0]; }).indexOf(tab);
      i = (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
      tab = TABS[i][0]; editing = ''; render();
      var t = sheet.querySelector('.st-tab.on'); if (t) t.focus();
    }
  }
  function onClick(e){
    var t = e.target.closest ? e.target.closest('button,a') : null;
    if (!t || !sheet || !sheet.contains(t)) return;
    var a;
    if ((a = t.getAttribute('data-tab'))){ tab = a; editing = ''; render(); return; }
    if ((a = t.getAttribute('data-key'))){ editing = a; render(); return; }
    if (t.getAttribute('data-cancel')){ editing = ''; render(); return; }
    if (t.getAttribute('data-peek')){ var inp = t.parentNode.querySelector('input'); if (inp){ var hid = inp.type === 'password'; inp.type = hid ? 'text' : 'password'; t.textContent = hid ? '숨기기' : '보기'; } return; }
    if ((a = t.getAttribute('data-clear'))){
      var dd = defOf(a); if (!dd) return;
      var name = dd.name;
      window.__nnConfirm ? window.__nnConfirm({ icon:'🔑', title:name + ' 키를 지울까요?', msg:'이 키로 받아 오던 자료는 참고값으로 바뀌거나 비게 됩니다. 언제든 다시 넣을 수 있습니다.', ok:'지우기', danger:true,
        onOk:function(){ saveKey(dd, ''); editing = ''; render(); } }) : (saveKey(dd, ''), editing = '', render());
      return;
    }
    if (t.type === 'submit') return;   /* 폼 submit 에서 처리 */
    if ((a = t.getAttribute('data-bmode'))){ setBg('bmode', a); return; }
    if ((a = t.getAttribute('data-bscroll'))){ setBg('bscroll', a); return; }
    if ((a = t.getAttribute('data-sw'))){
      var on = t.getAttribute('aria-checked') !== 'true';
      if (a === 'bill'){ lsSet(BILL_KEY, on ? '0' : '1'); applyLook(); toast(on ? '지폐가 다시 날아다닙니다' : '지폐를 쉬게 했습니다 — 설정에서 다시 켤 수 있습니다'); }
      if (a === 'type'){
        if (window.__nnType) window.__nnType.set(on); else lsSet(TYPE_KEY, on ? '1' : '0');
        toast(on ? '작은 글자를 키웠습니다' : '글자를 예전 크기로 돌렸습니다');
      }
      t.setAttribute('aria-checked', on ? 'true' : 'false');
      return;
    }
    if ((a = t.getAttribute('data-restore'))){ askRestore(a); return; }
    if ((a = t.getAttribute('data-snap'))){ askSnap(a); return; }
    a = t.getAttribute('data-act');
    if (a === 'bgmenu'){ close(); setTimeout(function(){ var b = document.getElementById('bgSwitchBtn'); if (b) b.click(); }, 280); }
    else if (a === 'opacity'){ close(); setTimeout(function(){ if (window.__panelOpacityOpen) window.__panelOpacityOpen(); }, 280); }
    else if (a === 'login'){ close(); var w = document.querySelector('.nav-links .wbtn'); if (w) w.click(); }
    else if (a === 'sync'){
      var C = window.__nnCloud; if (!C) return;
      t.textContent = '맞추는 중…'; t.disabled = true;
      Promise.resolve().then(function(){ return C.flush && C.flush(); }).then(function(){ return C.check && C.check(); })
        .catch(function(){}).then(function(){ paint(); if (isOpen() && tab === 'data') render(); toast(state().k === 'ok' ? '✓ 클라우드와 맞췄습니다' : '클라우드와 맞추지 못했습니다 — 잠시 뒤 다시 해 보세요', state().k !== 'ok'); });
    }
    else if (a === 'snapnow'){
      if (!window.__nnBackup || !window.__nnBackup.snapshot) return;
      t.disabled = true; t.textContent = '뜨는 중…';
      window.__nnBackup.snapshot().then(function(ok){ toast(ok ? '✓ 지금 상태를 오늘 백업으로 떴습니다' : '백업을 뜨지 못했습니다', !ok); if (isOpen() && tab === 'data') render(); });
    }
    else if (a === 'morebk'){ showAllBk = !showAllBk; paintBackups(bkRows); }
    else if (a === 'export'){ close(); setTimeout(function(){ if (window.dbLock) window.dbLock('export'); }, 200); }
    else if (a === 'import'){ close(); setTimeout(function(){ if (window.dbLock) window.dbLock('import'); }, 200); }
    else if (a === 'pin'){ if (window.dbChangePin) window.dbChangePin(); }
  }
  document.addEventListener('submit', function(e){
    var f = e.target; if (!f || !f.getAttribute || !f.getAttribute('data-form') || !sheet || !sheet.contains(f)) return;
    e.preventDefault();
    var d = defOf(f.getAttribute('data-form')); if (!d) return;
    var v = (f.querySelector('input') || {}).value || '';
    var err = saveKey(d, v);
    if (err){ showErr(f, err); return; }
    editing = ''; render();
  }, true);

  function setBg(kind, val){
    var sel = kind === 'bmode' ? '[data-bmode="' + val + '"]' : '[data-bscroll="' + val + '"]';
    var b = document.querySelector('#bgSwitchMenu ' + sel);
    if (b) b.click();   /* BACKDROP 메뉴의 같은 단추 — 메뉴 표시까지 함께 맞는다 */
    else {
      lsSet(kind === 'bmode' ? 'nn_bg_mode_v1' : 'nn_bg_scroll_v1', val);
      if (window.__bgApplyMode) window.__bgApplyMode();
    }
    render();
  }

  function askRestore(key){
    var r = null; (bkRows || []).forEach(function(x){ if (x.key === key) r = x; });
    if (!r || !window.__nnBackupRestore) return;
    var go = function(){ toast('되돌리는 중… 지금 상태를 먼저 한 장 떠 둡니다'); window.__nnBackupRestore(key); };
    if (!window.__nnConfirm){ if (confirm(dayLabel(r.at) + ' 상태로 되돌릴까요?')) go(); return; }
    window.__nnConfirm({ icon:'⏪', title:dayLabel(r.at || r.date) + ' 상태로 되돌릴까요?',
      msg:(r.sum.length ? '그때 내용: ' + r.sum.join(' · ') + '. ' : '') + '지금 상태는 \'되돌리기 직전\' 백업으로 따로 남기니, 마음이 바뀌면 그것으로 다시 돌아올 수 있습니다. 되돌린 뒤 페이지가 새로고침됩니다.',
      ok:'이 날로 되돌리기', danger:true, onOk:go });
  }
  function askSnap(key){
    var r = null; (snapRows || []).forEach(function(x){ if (x.key === key) r = x; });
    if (!r || !window.__nnCloudRestore) { if (r) toast('클라우드 기능을 불러오지 못해 지금은 되돌릴 수 없습니다', true); return; }
    var go = function(){
      var pre = (window.__nnBackup && window.__nnBackup.before) ? window.__nnBackup.before() : Promise.resolve();
      Promise.resolve(pre).catch(function(){}).then(function(){ return window.__nnCloudRestore(key); })
        .then(function(ok){ toast(ok ? '✓ 되돌렸습니다 — 곧 새로고침됩니다' : '되돌리지 못했습니다', !ok); });
    };
    window.__nnConfirm ? window.__nnConfirm({ icon:'⏪', title:(GROUPK[r.group] || r.group) + ' — ' + dayLabel(r.at) + ' ' + hm(r.at) + ' 사본으로 되돌릴까요?',
      msg:'이 그룹만 그때 내용으로 바뀌고 클라우드에도 올라갑니다. 지금 상태는 \'되돌리기 직전\' 백업으로 먼저 떠 둡니다.', ok:'되돌리기', danger:true, onOk:go }) : go();
  }

  window.__nnSettingsOpen = open;
  window.__nnSettingsClose = close;
  window.__nnSettingsIsOpen = isOpen;

  function boot(){
    injectCss();
    injectSheetCss();
    ensurePill();
    ensureGear();
    hookSave();
    paint();
    window.addEventListener('nn:sync', paint);
    window.addEventListener('online', paint);
    window.addEventListener('offline', paint);
    window.addEventListener('focus', paint);
    /* 휴대폰 메뉴를 열 때마다 새로 만들어지므로, 열린 뒤에 한 줄을 넣는다 */
    document.addEventListener('click', function(e){
      if (e.target && e.target.closest && e.target.closest('#nnMnavBtn')) setTimeout(paint, 60);
    }, true);
    /* 바뀐 것이 생겼는지(안 올라간 변경)는 이벤트가 없어서 가볍게 들여다본다 — 화면이 보일 때만 */
    setInterval(function(){ if (document.visibilityState !== 'hidden') { hookSave(); paint(); ensureGear(); } }, 2000);
    setTimeout(hookSave, 1500);
  }

  injectCss();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 0); });
  else setTimeout(boot, 0);

  window.__nnSyncState = state;
  window.__nnSyncPaint = paint;
})();
