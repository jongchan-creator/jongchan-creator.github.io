/* ══════════════════════════════════════════════════════════════════
   NEWNORMAL — SUPER INVESTORS (nn-masters.js)   2026-11-23 신설
   개선제안 S-2 ("3열 카드로 접어 높이를 1/3로") + 요청: 최신 분기 자동 반영 · 투자자를 골라서 편집

   예전 (index.html 안의 두 스크립트 — 이 파일로 바꾸며 지웠다)
     · 9명을 한 줄에 한 명씩(약 210px) — 홈 전체 높이의 30%(2,064px)
     · 보유 종목은 손으로 적어 둔 값(2026 Q1)이라 분기가 바뀌어도 그대로였다
     · 9명 가운데 4명의 SEC 번호(CIK)가 엉뚱한 곳을 가리켰다
       드러켄밀러 1501697 → 1536411 · 테리 스미스 1569485 → 1569205 · 캐시 우드 1602701 → 1697748 · 레이 달리오 1358548 → 1350694

   지금
     ① 카드 — 넓은 화면 3열 · 중간 2열 · 휴대폰은 옆으로 넘기는 한 줄. 카드를 누르면 그 줄 바로 아래에 상세가 펼쳐진다
        카드: 사진 · 이름 · 분기 · 상위 3종목이 차지하는 몫(가는 막대, 한 색 + 나머지 회색) · 상위 종목 · 종목 수 · 합계 · 신규/매도 수
        상세: 상위 15종목 순위 막대(한 색, 큰 것부터) · 지난 분기 대비(▲ 늘림 · ▼ 줄임 · 신규) · 다 판 종목 · SEC 원문 링크
        종목 이름을 누르면 '종목 한 장'(nn-ticker.js)이 열린다 — 내 노트 · 보유 · 논거와 함께 본다
     ② 자동 갱신 — 내 Worker 의 /sec13f 가 SEC EDGAR 에서 가장 최근 13F-HR 두 건을 읽어 준다(worker.js v15)
        이 기기에 12시간 보관(nn_si_cache_v1) → 지나면 다시 묻는다. ⟳ 로 바로 다시 받을 수 있다
        티커는 CUSIP 으로 찾는다: 자주 나오는 종목은 아래 표, 나머지는 /figi(OpenFIGI)를 10개씩 나눠 묻고 이 기기에 기억(nn_si_tk_v1)
        Worker 가 없거나 예전 판이면 예전 내장 값을 '예시'로 보여 주고 무엇을 하면 되는지 안내한다
     ③ 고르기 · 편집 — 이름표 27명(가치 · 성장 · 매크로 · 행동주의 · 역발상 · 기관)에서 넣고 빼고 순서를 바꾼다
        목록에 없는 사람은 CIK 로 찾아 넣는다(13F 를 내는 곳이면 누구나). 13F 가 없는 사람은 직접 적을 수도 있다
        내 목록: nn_masters_v2 (클라우드 동기화 hub). 예전 목록(nn_masters_v1)은 처음에 옮겨 읽기만 하고 건드리지 않는다

   window.__nnMasters = { render, refresh(force), open(id), edit(section), list(), data(cik) }
   로딩: … → nn-ticker.js → nn-masters.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__nnMasters) return;

  var KEY = 'nn_masters_v2', OLD_KEY = 'nn_masters_v1', CACHE_KEY = 'nn_si_cache_v1', TK_KEY = 'nn_si_tk_v1';
  var STALE = 12 * 3600e3, FIGI_GAP = 2700;
  var TAGS = ['가치', '성장', '매크로', '행동주의', '역발상', '기관'];
  var DEFAULT = ['druckenmiller', 'smith', 'coleman', 'buffett', 'ackman', 'wood', 'soros', 'burry', 'dalio'];

  /* 이름표 — cik 는 SEC EDGAR 의 13F 제출 번호 (2026-11 SEC 공시 주소로 확인) */
  var DIR = [
    {"id": "druckenmiller", "cik": "0001536411", "en": "Stanley Druckenmiller", "kr": "스탠리 드러켄밀러", "corp": "Duquesne Family Office", "tag": "매크로", "bio": "Macro trader known for decades of double-digit returns without a losing year.", "img": "https://i.postimg.cc/fLFZ0Pgj/deuleoken-milleo.jpg"},
    {"id": "smith", "cik": "0001569205", "en": "Terry Smith", "kr": "테리 스미스", "corp": "Fundsmith LLP", "tag": "성장", "bio": "Buy good companies, don't overpay, then do nothing.", "img": "https://i.postimg.cc/6pw737Zy/teli-seumiseu.jpg"},
    {"id": "coleman", "cik": "0001167483", "en": "Chase Coleman", "kr": "체이스 콜먼", "corp": "Tiger Global Management", "tag": "성장", "bio": "Tiger cub backing global technology winners with long-term conviction.", "img": "https://i.postimg.cc/BvnXTdMJ/cheiseu-kolmeon.jpg"},
    {"id": "buffett", "cik": "0001067983", "en": "Warren Buffett", "kr": "워런 버핏", "corp": "Berkshire Hathaway", "tag": "가치", "bio": "Owner-minded value investing, compounded at permanent scale.", "img": "https://i.postimg.cc/QdLtzFmb/woleon-beopis.jpg"},
    {"id": "ackman", "cik": "0001336528", "en": "Bill Ackman", "kr": "빌 애크먼", "corp": "Pershing Square", "tag": "행동주의", "bio": "Concentrated activist bets on high-quality franchises.", "img": "https://i.postimg.cc/7PGJQr4d/bil-aekeumeon.jpg"},
    {"id": "wood", "cik": "0001697748", "en": "Cathie Wood", "kr": "캐시 우드", "corp": "ARK Investment Management", "tag": "성장", "bio": "High-conviction positions in disruptive innovation themes.", "img": "https://i.postimg.cc/Jhr1wZkN/kaesiudeu.jpg"},
    {"id": "soros", "cik": "0001029160", "en": "George Soros", "kr": "조지 소로스", "corp": "Soros Fund Management", "tag": "매크로", "bio": "Reflexivity — markets shape the very reality they price.", "img": "https://i.postimg.cc/HxPW9njP/joji-soloseu.jpg"},
    {"id": "burry", "cik": "0001649339", "en": "Michael Burry", "kr": "마이클 버리", "corp": "Scion Asset Management", "tag": "역발상", "bio": "Deep-value contrarian who shorted the housing bubble.", "img": "https://i.postimg.cc/nVgcsXyj/maikeul-beoli.jpg"},
    {"id": "dalio", "cik": "0001350694", "en": "Ray Dalio", "kr": "레이 달리오", "corp": "Bridgewater Associates", "tag": "매크로", "bio": "All-weather diversification built on written principles.", "img": "https://i.postimg.cc/L4cYcQ6t/lei-dallio.jpg"},
    {"id": "klarman", "cik": "0001061768", "en": "Seth Klarman", "kr": "세스 클라먼", "corp": "Baupost Group", "tag": "가치", "bio": "Margin of safety first; patient enough to hold cash for years."},
    {"id": "lilu", "cik": "0001709323", "en": "Li Lu", "kr": "리 루", "corp": "Himalaya Capital Management", "tag": "가치", "bio": "Munger-backed, highly concentrated value investing."},
    {"id": "duan", "cik": "0001759760", "en": "Duan Yongping", "kr": "돤융핑", "corp": "H&H International Investment", "tag": "가치", "bio": "Founder-turned-investor who buys a few great businesses and waits."},
    {"id": "pabrai", "cik": "0001549575", "en": "Mohnish Pabrai", "kr": "모니시 파브라이", "corp": "Dalal Street (Pabrai Funds)", "tag": "가치", "bio": "Heads I win, tails I don't lose much."},
    {"id": "gayner", "cik": "0001096343", "en": "Tom Gayner", "kr": "톰 게이너", "corp": "Markel Group", "tag": "가치", "bio": "The equity book behind the 'baby Berkshire'."},
    {"id": "einhorn", "cik": "0001079114", "en": "David Einhorn", "kr": "데이비드 아인혼", "corp": "Greenlight Capital", "tag": "가치", "bio": "Value long/short, known for calling out accounting games."},
    {"id": "akre", "cik": "0001112520", "en": "Chuck Akre", "kr": "척 아크레", "corp": "Akre Capital Management", "tag": "성장", "bio": "Great business, great people, great reinvestment — then hold."},
    {"id": "mandel", "cik": "0001061165", "en": "Stephen Mandel", "kr": "스티븐 맨델", "corp": "Lone Pine Capital", "tag": "성장", "bio": "Tiger cub picking growth leaders with a long/short book."},
    {"id": "laffont", "cik": "0001135730", "en": "Philippe Laffont", "kr": "필립 라퐁", "corp": "Coatue Management", "tag": "성장", "bio": "Tiger cub focused on technology and the internet."},
    {"id": "halvorsen", "cik": "0001103804", "en": "Andreas Halvorsen", "kr": "안드레아스 할보르센", "corp": "Viking Global Investors", "tag": "성장", "bio": "Tiger cub running a fundamental, sector-deep book."},
    {"id": "loeb", "cik": "0001040273", "en": "Dan Loeb", "kr": "댄 로브", "corp": "Third Point", "tag": "행동주의", "bio": "Event-driven activist famous for blunt letters to boards."},
    {"id": "icahn", "cik": "0000921669", "en": "Carl Icahn", "kr": "칼 아이칸", "corp": "Icahn Enterprises", "tag": "행동주의", "bio": "The original corporate raider and activist."},
    {"id": "peltz", "cik": "0001345471", "en": "Nelson Peltz", "kr": "넬슨 펠츠", "corp": "Trian Fund Management", "tag": "행동주의", "bio": "Operational activist inside consumer and industrial giants."},
    {"id": "hohn", "cik": "0001647251", "en": "Chris Hohn", "kr": "크리스 혼", "corp": "TCI Fund Management", "tag": "행동주의", "bio": "Concentrated quality activist with strong board pressure."},
    {"id": "tepper", "cik": "0001656456", "en": "David Tepper", "kr": "데이비드 테퍼", "corp": "Appaloosa", "tag": "역발상", "bio": "Distressed-debt legend who buys when fear peaks."},
    {"id": "marks", "cik": "0000949509", "en": "Howard Marks", "kr": "하워드 막스", "corp": "Oaktree Capital Management", "tag": "역발상", "bio": "Second-level thinking and the credit cycle."},
    {"id": "gates", "cik": "0001166559", "en": "Gates Foundation Trust", "kr": "게이츠 재단 신탁", "corp": "Bill & Melinda Gates Foundation Trust", "tag": "기관", "bio": "The foundation endowment — long-term and concentrated."},
    {"id": "nps", "cik": "0001608046", "en": "National Pension Service", "kr": "국민연금", "corp": "국민연금공단 (NPS)", "tag": "기관", "bio": "Korea's national pension — the US stocks it holds."}
  ];
  var DIRI = {}; DIR.forEach(function(d){ DIRI[d.id] = d; });

  /* 예전에 손으로 적어 둔 값 — Worker 가 없을 때만 '예시'로 보인다 (2026 Q1 이라고 적혀 있던 숫자, 실제와 다를 수 있다) */
  var FB = {
    "druckenmiller": [["NTRA", "Natera Inc.", 24.7], ["TSM", "Taiwan Semiconductor", 6.6], ["STM", "STMicroelectronics", 5.7], ["YPF", "YPF S.A.", 4.5], ["INSM", "Insmed Inc.", 3.7]],
    "smith": [["MAR", "Marriott International", 9], ["WAT", "Waters Corp", 8.5], ["V", "Visa Inc.", 7.3], ["SYK", "Stryker Corp", 7.2], ["GOOGL", "Alphabet Inc.", 6.8]],
    "coleman": [["GOOGL", "Alphabet Inc.", 13.4], ["NVDA", "NVIDIA Corp.", 9.2], ["AMZN", "Amazon.com Inc.", 9.1], ["TSM", "Taiwan Semiconductor", 8.2], ["META", "Meta Platforms", 7.7]],
    "buffett": [["AAPL", "Apple Inc.", 40.5], ["BAC", "Bank of America", 11.8], ["AXP", "American Express", 8.5], ["KO", "Coca-Cola", 7.2], ["CVX", "Chevron", 5.5]],
    "ackman": [["CMG", "Chipotle Mexican Grill", 18.5], ["QSR", "Restaurant Brands Int.", 17.2], ["HLT", "Hilton Worldwide", 16.1], ["HHH", "Howard Hughes", 12.4], ["GOOGL", "Alphabet Inc.", 11.2]],
    "wood": [["TSLA", "Tesla Inc.", 11.5], ["COIN", "Coinbase Global", 9.2], ["ROKU", "Roku Inc.", 7.8], ["SQ", "Block Inc.", 6.5], ["ZM", "Zoom Video", 5.1]],
    "soros": [["SPY", "SPDR S&P 500 ETF", 36.2], ["QQQ", "Invesco QQQ Trust", 25.1], ["AER", "AerCap Holdings", 18.5], ["AMZN", "Amazon.com Inc.", 12.8], ["IBIT", "iShares Bitcoin Trust", 7.4]],
    "burry": [["MOH", "Molina Healthcare", 35.1], ["LULU", "Lululemon", 26.1], ["SLM", "Sallie Mae", 19.5], ["BRK.B", "Berkshire Hathaway", 19.3]],
    "dalio": [["IVV", "iShares Core S&P 500 ETF", 35.5], ["IEMG", "iShares Emerging Markets", 24.8], ["GOOGL", "Alphabet Inc.", 16.4], ["META", "Meta Platforms", 13.1], ["PG", "Procter & Gamble", 10.2]]
  };
  var FB_PERIOD = '2026-03-31';

  /* 자주 나오는 CUSIP → 티커 (나머지는 OpenFIGI 로 찾는다) */
  var SEED = { '037833100':'AAPL', '594918104':'MSFT', '023135106':'AMZN', '02079K305':'GOOGL', '02079K107':'GOOG', '30303M102':'META',
    '67066G104':'NVDA', '88160R101':'TSLA', '084670702':'BRK.B', '025816109':'AXP', '060505104':'BAC', '191216100':'KO', '166764100':'CVX',
    '674599105':'OXY', '92826C839':'V', '57636Q104':'MA', '874039100':'TSM', '46625H100':'JPM', '91324P102':'UNH', '500754106':'KHC', '615369105':'MCO' };

  /* ── 작은 도구 ── */
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function lsGet(k){ try { return localStorage.getItem(k); } catch(e) { return null; } }
  function lsSet(k, v){ try { localStorage.setItem(k, v); return true; } catch(e) { return false; } }
  function jget(k, d){ try { var v = JSON.parse(lsGet(k) || 'null'); return v == null ? d : v; } catch(e) { return d; } }
  function cik10(c){ c = String(c || '').replace(/\D/g, ''); return c ? ('0000000000' + String(parseInt(c, 10))).slice(-10) : ''; }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function dstr(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function toast(m, bad){ if (window.__nnToast) window.__nnToast(m, bad ? { kind:'del' } : {}); }
  function W(){ try { return (localStorage.getItem('nn_worker_url') || '').trim().replace(/\/+$/, ''); } catch(e) { return ''; } }
  function qOf(p){ var m = /^(\d{4})-(\d{2})/.exec(p || ''); return m ? { y: +m[1], q: Math.ceil(+m[2] / 3) } : null; }
  function qLabel(p){ var q = qOf(p); return q ? q.y + ' Q' + q.q : ''; }
  function qShort(p){ var q = qOf(p); return q ? 'Q' + q.q + ' ’' + String(q.y).slice(2) : ''; }
  function kDay(s){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); if (!m) return ''; return (+m[1] !== new Date().getFullYear() ? m[1] + '년 ' : '') + (+m[2]) + '월 ' + (+m[3]) + '일'; }
  function ago(ms){
    var s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 90) return '방금'; if (s < 3600) return Math.round(s / 60) + '분 전';
    if (s < 86400) return Math.round(s / 3600) + '시간 전'; return Math.round(s / 86400) + '일 전';
  }
  function money(v){
    v = +v || 0;
    if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(v >= 1e11 ? 0 : 1) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(v >= 1e8 ? 0 : 1) + 'M';
    return '$' + Math.round(v / 1e3) + 'K';
  }
  function pctTxt(p){ return (+p || 0).toFixed(1) + '%'; }
  function initials(en){ var p = String(en || '?').replace(/[^A-Za-z가-힣 ]/g, ' ').trim().split(/\s+/); return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase(); }
  /* 이번에 나와 있어야 할 분기 — 분기 말 + 45일(13F 마감)이 지난 가장 최근 분기 */
  function expectedPeriod(){
    var now = new Date(), y = now.getFullYear();
    for (var yy = y; yy >= y - 1; yy--){
      var ends = [new Date(yy, 11, 31), new Date(yy, 8, 30), new Date(yy, 5, 30), new Date(yy, 2, 31)];
      for (var i = 0; i < ends.length; i++) if (now - ends[i] >= 45 * 86400e3) return dstr(ends[i]);
    }
    return '';
  }

  /* ── 내 목록 ── */
  function defaults(){ return { v: 2, list: DEFAULT.map(function(id){ return { id: id }; }), top: 3, detail: 15 }; }
  function norm(v){
    var seen = {};
    v.list = (Array.isArray(v.list) ? v.list : []).filter(function(x){
      if (!x || !x.id || seen[x.id]) return false;
      seen[x.id] = 1;
      return !!(DIRI[x.id] || x.cik || x.manual);
    });
    v.top = +v.top === 5 ? 5 : 3;
    v.detail = [10, 15, 20].indexOf(+v.detail) >= 0 ? +v.detail : 15;
    return v;
  }
  function migrate(old){
    var out = { v: 2, list: [], top: 3, detail: 15 }, seen = {};
    old.forEach(function(o){
      if (!o) return;
      var en = String(o.en || '').trim().toLowerCase(), kr = String(o.name || '').trim(), corp = String(o.corp || '').trim().toLowerCase();
      var d = null;
      DIR.forEach(function(x){ if (!d && ((en && x.en.toLowerCase() === en) || (kr && x.kr === kr) || (corp && x.corp.toLowerCase() === corp))) d = x; });
      if (d){
        if (seen[d.id]) return; seen[d.id] = 1;
        var it = { id: d.id };
        if (o.img && o.img !== d.img) it.img = String(o.img);
        if (kr && kr !== d.kr) it.kr = kr;
        out.list.push(it);
        return;
      }
      var cik = cik10(((String(o.secUrl || '')).match(/CIK=(\d+)/i) || [])[1]);
      var port = (o.port || []).map(function(p){ return [String(p.tick || '').trim(), String(p.name || p.tick || '').trim(), parseFloat(String(p.pct).replace('%', '')) || 0]; }).filter(function(p){ return p[0]; });
      var id = cik ? 'cik:' + cik : 'm:' + Math.random().toString(36).slice(2, 9);
      if (seen[id]) return; seen[id] = 1;
      out.list.push({ id: id, cik: cik || undefined, manual: !cik, en: String(o.en || o.name || '이름 없음'), kr: String(o.name || ''), corp: String(o.corp || ''), bio: String(o.bio || ''), img: String(o.img || ''), port: port });
    });
    return out.list.length ? out : defaults();
  }
  var LIST = null;
  function getList(){
    if (LIST) return LIST;
    var v = jget(KEY, null);
    if (v && Array.isArray(v.list)) LIST = norm(v);
    else {
      var old = jget(OLD_KEY, null);
      LIST = norm(Array.isArray(old) && old.length ? migrate(old) : defaults());
    }
    return LIST;
  }
  function saveList(){ lsSet(KEY, JSON.stringify(LIST)); }
  function full(it){
    var d = DIRI[it.id], m;
    if (d) m = { id: d.id, cik: d.cik, en: d.en, kr: it.kr || d.kr, corp: d.corp, tag: d.tag, img: it.img || d.img || '', bio: d.bio, dir: true, manual: false };
    else m = { id: it.id, cik: it.cik ? cik10(it.cik) : '', en: it.en || it.kr || '이름 없음', kr: it.kr || '', corp: it.corp || '', tag: it.tag || '', img: it.img || '', bio: it.bio || '', dir: false, manual: !!it.manual };
    if (m.manual) m.cik = '';
    var port = d ? FB[d.id] : it.port;
    m.fb = port && port.length ? { p: d ? FB_PERIOD : '', h: port } : null;
    return m;
  }
  function byId(id){ var L = getList(); for (var i = 0; i < L.list.length; i++) if (L.list[i].id === id) return L.list[i]; return null; }

  /* ── 받아 둔 13F (이 기기) ── */
  function cacheAll(){ var c = jget(CACHE_KEY, {}); return c && typeof c === 'object' ? c : {}; }
  function cacheGet(cik){ var c = cacheAll()[cik]; return c && c.d && c.d.ok ? c : null; }
  function cachePut(cik, d){
    var c = cacheAll(); c[cik] = { at: Date.now(), d: d };
    var keys = Object.keys(c);
    if (keys.length > 40){
      var keep = {}; getList().list.forEach(function(it){ var m = full(it); if (m.cik) keep[m.cik] = 1; });
      keys.forEach(function(k){ if (!keep[k]) delete c[k]; });
    }
    if (!lsSet(CACHE_KEY, JSON.stringify(c))){ var one = {}; one[cik] = c[cik]; lsSet(CACHE_KEY, JSON.stringify(one)); }
  }

  /* ── 티커 ── */
  var tkMap = null;
  function tkAll(){ if (!tkMap){ tkMap = jget(TK_KEY, {}); if (!tkMap || typeof tkMap !== 'object') tkMap = {}; } return tkMap; }
  function tkOf(cusip){ cusip = String(cusip || '').toUpperCase(); if (SEED[cusip]) return SEED[cusip]; var v = tkAll()[cusip]; return typeof v === 'string' ? v : null; }
  function shortName(n){
    var s = String(n || '').replace(/\b(INC|CORP|CORPORATION|CO|LTD|PLC|N\.?V|S\.?A|HLDGS?|HOLDINGS?|GROUP|COM|NEW|DEL|CL [A-Z]|THE|LP|L\.P|AG|SE|ADR|SPONSORED|ETF|TR)\b\.?/gi, ' ').replace(/[^A-Za-z0-9&\- ]/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.split(' ').slice(0, 2).join(' ') || String(n || '').slice(0, 10);
    return s.toLowerCase().replace(/\b[a-z]/g, function(c){ return c.toUpperCase(); }).slice(0, 14);
  }
  function holdLabel(h){ var t = tkOf(h.cusip); return t || shortName(h.name); }
  var figiQ = [], figiBusy = false, figiNext = 0, figiOff = false;
  function needTk(d){
    if (!d || figiOff) return;
    (d.holdings || []).concat(d.sold || []).forEach(function(h){
      var c = String(h.cusip || '').toUpperCase();
      if (c && tkOf(c) === null && figiQ.indexOf(c) < 0) figiQ.push(c);
    });
    pumpFigi();
  }
  function pumpFigi(){
    if (figiBusy || !figiQ.length || figiOff) return;
    var w = W(); if (!w) return;
    figiBusy = true;
    setTimeout(function(){
      var batch = figiQ.splice(0, 10);
      fetch(w + '/figi?cusips=' + batch.join(','), { cache: 'no-store' })
        .then(function(r){ return r.json(); })
        .then(function(j){
          if (j && j.ok && j.map){
            var m = tkAll();
            batch.forEach(function(c){ var v = j.map[c]; m[c] = v && v.t ? String(v.t) : ''; });
            lsSet(TK_KEY, JSON.stringify(m));
            figiNext = Date.now() + FIGI_GAP;
            renderSoon();
          } else if (j && j.error === 'rate'){ figiQ = batch.concat(figiQ); figiNext = Date.now() + 61000; }
          else if (j && j.error === 'unknown path'){ figiQ = []; figiOff = true; }
          else figiNext = Date.now() + FIGI_GAP;
        })
        .catch(function(){ figiQ = batch.concat(figiQ); figiNext = Date.now() + 20000; })
        .then(function(){ figiBusy = false; pumpFigi(); });
    }, Math.max(0, figiNext - Date.now()));
  }

  /* ── 받기 ── */
  var runQ = [], running = false, forceAt = 0;
  var st = { open: '', busy: {}, err: {}, ws: '', checkedAt: 0 };
  function refresh(force){
    if (!W()){ st.ws = 'none'; paintStatus(); return; }
    if (force){ forceAt = Date.now(); figiOff = false; if (st.ws !== 'ok') st.ws = ''; }
    getList().list.forEach(function(it){
      var m = full(it); if (!m.cik) return;
      var c = cacheGet(m.cik);
      if (force || !c || Date.now() - c.at > STALE){ if (runQ.indexOf(m.cik) < 0 && !st.busy[m.cik]) runQ.push(m.cik); }
      else needTk(c.d);
    });
    paintStatus();
    pump();
  }
  function pump(){
    if (running) return;
    if (!runQ.length){ paintStatus(); return; }
    running = true;
    var cik = runQ.shift();
    st.busy[cik] = 1; renderSoon();
    fetchOne(cik, forceAt && Date.now() - forceAt < 120000).then(function(res){
      delete st.busy[cik];
      st.checkedAt = Date.now();
      if (res.ok){ cachePut(cik, res.d); delete st.err[cik]; st.ws = 'ok'; needTk(res.d); }
      else {
        st.err[cik] = res.error;
        if (res.error === 'old'){ st.ws = 'old'; runQ = []; }
        else if (res.error === 'sec_forbidden'){ st.ws = 'forbidden'; st.uaSet = !!res.uaSet; runQ = []; }
        else if (res.error === 'net' && st.ws !== 'ok') st.ws = 'error';
      }
      renderSoon();
    }).then(function(){ running = false; setTimeout(pump, 250); });
  }
  function fetchOne(cik, force){
    var w = W();
    return fetch(w + '/sec13f?cik=' + cik + '&top=20', { cache: force ? 'reload' : 'default' })
      .then(function(r){ return r.json().then(function(j){ return { s: r.status, j: j }; }, function(){ return { s: r.status, j: null }; }); })
      .then(function(x){
        var j = x.j;
        if (x.s === 404 && j && j.error === 'unknown path') return { ok: false, error: 'old' };
        if (!j) return { ok: false, error: 'net' };
        if (j.ok && Array.isArray(j.holdings)) return { ok: true, d: j };
        return { ok: false, error: j.error || 'error', name: j.name, uaSet: !!j.uaSet };
      }, function(){ return { ok: false, error: 'net' }; });
  }
  var ERR = { not_found: 'SEC 에 없는 번호입니다', no_13f: '13F 공시가 없습니다', bad_cik: 'CIK 번호가 올바르지 않습니다', table_error: '공시 표를 읽지 못했습니다',
              sec_error: 'SEC 가 잠시 답하지 않습니다', sec_forbidden: 'SEC 가 막았습니다(SEC_UA)', old: 'Worker 가 예전 판입니다', net: '받지 못했습니다' };

  /* ── 그리기 ── */
  var CHG_TITLE = function(c){ return c === 'new' ? '이번 분기 새로 삼' : (c > 0 ? '주식 수 +' : '주식 수 ') + c + '% (지난 분기 대비)'; };
  function chgMark(c, long){
    if (c === 'new') return '<em class="si-new" title="' + CHG_TITLE(c) + '">신규</em>';
    if (typeof c !== 'number') return long ? '<em class="si-eq">—</em>' : '';
    if (c >= 1) return '<em class="si-up" title="' + esc(CHG_TITLE(c)) + '">▲' + (long ? ' ' + (c >= 100 ? Math.round(c) : c) + '%' : '') + '</em>';
    if (c <= -1) return '<em class="si-dn" title="' + esc(CHG_TITLE(c)) + '">▼' + (long ? ' ' + Math.abs(c >= -100 ? c : -100) + '%' : '') + '</em>';
    return long ? '<em class="si-eq" title="그대로">그대로</em>' : '';
  }
  function avatar(m){
    return '<span class="si-av" aria-hidden="true"><i>' + esc(initials(m.en)) + '</i>'
      + (m.img ? '<img src="' + esc(m.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false" onerror="this.remove()">' : '') + '</span>';
  }
  /* 카드 · 상세가 함께 쓰는 '지금 보여 줄 값' */
  function view(m){
    var c = m.cik ? cacheGet(m.cik) : null;
    if (c){
      var d = c.d;
      return { mode: 'live', d: d, at: c.at, period: d.period,
        rows: d.holdings.map(function(h){ return { lb: holdLabel(h), tk: tkOf(h.cusip) || '', nm: h.name, pct: h.pct, chg: h.chg, pc: h.pc, value: h.value, shares: h.shares }; }) };
    }
    if (m.fb) return { mode: m.manual ? 'manual' : (m.dir ? 'demo' : 'manual'), period: m.fb.p,
      rows: m.fb.h.map(function(p){ return { lb: p[0], tk: /^[A-Z.\-]{1,8}$/.test(p[0]) ? p[0] : '', nm: p[1], pct: +p[2] || 0, chg: null }; }) };
    return { mode: 'none', rows: [] };
  }
  function cardHTML(m){
    var L = getList(), v = view(m), busy = m.cik && st.busy[m.cik], err = m.cik ? st.err[m.cik] : '';
    var q = v.mode === 'live' ? qShort(v.period) : v.mode === 'demo' ? '예시' : v.mode === 'manual' ? '직접' : '';
    var top3 = v.rows.slice(0, 3), sum3 = 0;
    top3.forEach(function(r){ sum3 += r.pct; });
    var seg = '';
    if (v.rows.length){
      seg = '<div class="si-bar" title="상위 3종목이 ' + pctTxt(sum3) + '"><span class="si-seg" role="img" aria-label="상위 3종목 비중 ' + pctTxt(sum3) + '">'
        + top3.map(function(r){ return '<i style="flex:0 0 ' + Math.max(1.5, Math.min(100, r.pct)).toFixed(1) + '%"></i>'; }).join('')
        + '<i class="rest"></i></span><span class="si-c3">상위 3 · ' + pctTxt(sum3) + '</span></div>';
    }
    var chips = v.rows.slice(0, L.top).map(function(r){
      return '<span class="si-chip"><b>' + esc(r.lb) + '</b>' + (r.pc ? '<i class="si-pc">' + (r.pc === 'Put' ? '풋' : r.pc === 'Call' ? '콜' : esc(r.pc)) + '</i>' : '') + pctTxt(r.pct) + chgMark(r.chg, false) + '</span>';
    }).join('');
    var meta;
    if (v.mode === 'live'){
      var d = v.d;
      meta = d.count + '종목 · ' + money(d.total)
        + (d.prev ? (d.newCount ? ' · 신규 ' + d.newCount : '') + (d.soldCount ? ' · 매도 ' + d.soldCount : '') : '')
        + (d.period < expectedPeriod() ? ' · <span class="si-old">지난 분기</span>' : '');
    } else if (v.mode === 'demo') meta = '예시 값 · 자동 갱신 전';
    else if (v.mode === 'manual') meta = '직접 적은 값';
    else meta = err ? esc(ERR[err] || '받지 못했습니다') : busy ? '받는 중…' : (W() ? '곧 받아 옵니다' : 'Worker 를 연결하면 보입니다');
    if (busy && v.mode !== 'none') meta += ' · <span class="si-spin" aria-label="받는 중"></span>';
    else if (err && v.mode !== 'none' && v.mode !== 'live') meta += ' · ' + esc(ERR[err] || '');
    return '<div class="si-card' + (st.open === m.id ? ' on' : '') + '" data-id="' + esc(m.id) + '" role="button" tabindex="0" aria-expanded="' + (st.open === m.id) + '" aria-label="' + esc(m.en + ' 포트폴리오 ' + (st.open === m.id ? '접기' : '펼치기')) + '">'
      + '<div class="si-top">' + avatar(m)
      +   '<span class="si-who"><b class="si-en">' + esc(m.en) + '</b><span class="si-sub">' + esc([m.kr, m.corp].filter(Boolean).join(' · ')) + '</span></span>'
      +   (q ? '<span class="si-q' + (v.mode === 'live' ? '' : ' demo') + '">' + esc(q) + '</span>' : '')
      + '</div>' + seg
      + (chips ? '<div class="si-chips">' + chips + '</div>' : '')
      + '<div class="si-meta">' + meta + '</div>'
      + '</div>';
  }
  function detailHTML(m){
    var L = getList(), v = view(m), rows = v.rows.slice(0, L.detail), max = 0, d = v.d;
    rows.forEach(function(r){ if (r.pct > max) max = r.pct; });
    var edgar = m.cik ? 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=' + m.cik + '&type=13F-HR&dateb=&owner=include&count=40' : '';
    var right = '';
    if (v.mode === 'live'){
      right = '<b>' + esc(qLabel(d.period)) + '</b> · ' + esc(d.period) + ' 기준<br>' + esc(kDay(d.filed)) + ' 공시'
        + (d.prev ? '<br>지난 분기(' + esc(qLabel(d.prev.period)) + ')와 비교' : '')
        + '<br><a href="' + esc(d.url || edgar) + '" target="_blank" rel="noopener">SEC 원문 ↗</a>';
    } else if (edgar) right = '<a href="' + esc(edgar) + '" target="_blank" rel="noopener">SEC 13F 목록 ↗</a>';
    var h = '<div class="sid-hd"><div class="sid-who">' + avatar(m)
      + '<div class="sid-id"><div class="sid-en">' + esc(m.en) + '</div><div class="sid-sub">' + esc([m.kr, m.corp].filter(Boolean).join(' · ')) + (m.tag ? '<span class="sid-tag">' + esc(m.tag) + '</span>' : '') + '</div>'
      + (m.bio ? '<div class="sid-bio">' + esc(m.bio) + '</div>' : '') + '</div></div>'
      + '<div class="sid-meta">' + right + '</div></div>';
    if (v.mode === 'live'){
      h += '<div class="sid-stats"><span>보유 <b>' + d.count + '</b>종목</span><span>13F 합계 <b>' + money(d.total) + '</b></span>'
        + (d.prev ? '<span>지난 분기 대비 신규 <b>' + d.newCount + '</b> · 다 판 것 <b>' + d.soldCount + '</b></span>' : '')
        + '<span>상위 10종목 <b>' + pctTxt(v.rows.slice(0, 10).reduce(function(a, r){ return a + r.pct; }, 0)) + '</b></span></div>';
    }
    if (rows.length){
      h += '<div class="sid-rows" role="table" aria-label="' + esc(m.en) + ' 보유 상위 종목">'
        + rows.map(function(r, i){
          var tip = r.nm + (r.pc ? ' (' + r.pc + ')' : '') + ' · ' + pctTxt(r.pct) + (r.value ? ' · ' + money(r.value) : '') + (r.shares ? ' · ' + Math.round(r.shares).toLocaleString('en-US') + '주' : '');
          return '<div class="sid-row" role="row" title="' + esc(tip) + '"><span class="sid-rk" role="cell">' + (i + 1) + '</span>'
            + (r.tk ? '<button type="button" class="sid-tk" data-tk="' + esc(r.tk) + '" role="cell" title="종목 한 장 열기">' + esc(r.tk) + '</button>' : '<span class="sid-tk nolink" role="cell">' + esc(r.lb) + '</span>')
            + '<span class="sid-nm" role="cell"><span>' + esc(r.nm) + (r.pc ? ' · ' + esc(r.pc === 'Put' ? '풋옵션' : r.pc === 'Call' ? '콜옵션' : r.pc) : '') + '</span><i style="width:' + (max ? Math.max(2, r.pct / max * 100) : 0).toFixed(1) + '%"></i></span>'
            + '<span class="sid-pct" role="cell">' + pctTxt(r.pct) + '</span>'
            + '<span class="sid-chg" role="cell">' + (v.mode === 'live' && d.prev ? chgMark(r.chg, true) : '') + '</span></div>';
        }).join('') + '</div>';
    } else h += '<div class="sid-empty">아직 보여 줄 종목이 없습니다' + (m.cik && !W() ? ' — Worker 를 연결하면 SEC 에서 받아 옵니다.' : '.') + '</div>';
    if (v.mode === 'live' && d.sold && d.sold.length){
      h += '<div class="sid-sold"><span class="sid-lb">다 판 종목</span>' + d.sold.map(function(s){
        return '<span class="si-chip"><b>' + esc(holdLabel(s)) + '</b>' + (s.pct ? '지난 분기 ' + pctTxt(s.pct) : '') + '</span>';
      }).join('') + (d.soldCount > d.sold.length ? '<span class="sid-more">외 ' + (d.soldCount - d.sold.length) + '</span>' : '') + '</div>';
    }
    var foot = v.mode === 'live'
      ? '※ 13F 는 미국 상장 주식 · 옵션의 롱 포지션만 분기 말 기준으로, 분기가 끝나고 최대 45일 뒤에 공시합니다. 공매도 · 채권 · 현금은 나오지 않고, 비중은 13F 합계 대비입니다. ' + esc(ago(v.at)) + ' 받음.'
      : v.mode === 'demo'
        ? '※ 예시 값입니다 — 예전에 적어 둔 숫자(2026 Q1 이라고 적혀 있던 값)라 실제와 다를 수 있습니다. 내 Worker 를 연결하면 SEC 의 최신 분기 공시로 저절로 바뀝니다.'
        : v.mode === 'manual' ? '※ 직접 적은 값입니다. 고르기 · 편집에서 고칠 수 있습니다.' : '';
    if (foot) h += '<div class="sid-foot">' + foot + '</div>';
    return h;
  }

  var CSS = [
  /* 색은 한 곳에서 — 밝은 바탕(홈의 종이 화면)에서는 아래에서 바꾼다 */
  '.masters-section{--si-ink:#f0ede6;--si-ink2:rgba(240,237,230,.72);--si-ink3:rgba(240,237,230,.5);--si-line:rgba(255,255,255,.1);',
  '  --si-card:rgba(255,255,255,.03);--si-card-h:rgba(255,255,255,.055);--si-acc:#c9a96e;--si-acc2:#e8c47e;--si-track:rgba(255,255,255,.13);',
  '  --si-up:#7ee7a6;--si-dn:#ff9d8f;--si-chip:rgba(255,255,255,.045)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .masters-section{--si-ink:#14120F;--si-ink2:#575145;--si-ink3:#7d7566;--si-line:rgba(20,18,15,.12);',
  '  --si-card:rgba(255,255,255,.66);--si-card-h:#fff;--si-acc:#8A6A24;--si-acc2:#8A6A24;--si-track:rgba(20,18,15,.1);--si-up:#1e7a4b;--si-dn:#b23a2c;--si-chip:rgba(20,18,15,.035)}',
  '.masters-section .ref-lane-header{flex-wrap:wrap;row-gap:8px}',
  '.si-tools{margin-left:auto;display:inline-flex;align-items:center;gap:6px}',
  '.si-tools .hub-edit-toggle{margin-left:0}',
  '#siRefresh{width:30px;height:30px;display:inline-grid;place-items:center;border-radius:8px;cursor:pointer;font-size:15px;line-height:1;',
  '  border:1px solid rgba(201,169,110,.4);background:rgba(201,169,110,.08);color:#c9a96e;transition:background .18s}',
  '#siRefresh:hover{background:rgba(201,169,110,.2)}',
  '#siRefresh.spin{animation:siRot 1s linear infinite}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) #siRefresh{background:transparent;border-color:rgba(138,106,36,.42);color:#8A6A24}',
  '@keyframes siRot{to{transform:rotate(360deg)}}',
  '.si-status{display:block;margin:2px 0 14px;font:500 13px/1.7 var(--nn-font);color:var(--si-ink3)}',
  '.si-status button{margin-left:6px;vertical-align:1px}',
  '.si-status b{color:var(--si-ink);font-weight:700}',
  '.si-status.warn{color:var(--si-ink2)}.si-status.bad{color:var(--si-dn)}',
  '.si-status button{font:700 12px var(--nn-font);padding:4px 10px;border-radius:7px;cursor:pointer;border:1px solid var(--si-acc);background:transparent;color:var(--si-acc2)}',
  '.si-spin{display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid var(--si-track);border-top-color:var(--si-acc2);animation:siRot .8s linear infinite;vertical-align:-1px}',
  '#siGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}',
  '@media (max-width:1099px){#siGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '.si-card{position:relative;display:flex;flex-direction:column;gap:11px;min-width:0;padding:16px 16px 14px;border-radius:14px;cursor:pointer;',
  '  background:var(--si-card);border:1px solid var(--si-line);transition:background-color .22s,border-color .22s,box-shadow .22s;outline:none}',
  '.si-card:hover{background:var(--si-card-h);border-color:rgba(201,169,110,.42)}',
  '.si-card:focus-visible{box-shadow:0 0 0 2px #e8c47e}',
  '.si-card.on{border-color:var(--si-acc);box-shadow:inset 0 0 0 1px var(--si-acc)}',
  '.si-top{display:flex;align-items:center;gap:11px;min-width:0}',
  '.si-av{flex:none;position:relative;width:42px;height:42px;border-radius:50%;overflow:hidden;display:grid;place-items:center;',
  '  background:rgba(201,169,110,.15);color:var(--si-acc2);font:800 13px var(--nn-font);letter-spacing:.02em}',
  '.si-av i{font-style:normal}',
  '.si-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 22%;filter:grayscale(1);transition:filter .35s}',
  '.si-card:hover .si-av img,.si-card.on .si-av img,.si-detail .si-av img{filter:none}',
  '.si-who{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
  '.si-en{font:800 16px/1.25 var(--nn-font);letter-spacing:-.01em;color:var(--si-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.si-sub{font:500 12px/1.35 var(--nn-font);color:var(--si-ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.si-q{flex:none;align-self:flex-start;font:700 11px var(--nn-font-label);letter-spacing:.06em;padding:3px 7px;border-radius:6px;color:var(--si-acc2);border:1px solid var(--si-acc)}',
  '.si-q.demo{color:var(--si-ink3);border-color:var(--si-line);font-family:var(--nn-font);letter-spacing:0}',
  /* 가는 막대: 상위 3종목(한 색 · 2px 틈) + 나머지(회색). 글자는 옆에 */
  '.si-bar{display:flex;align-items:center;gap:10px}',
  '.si-seg{flex:1;min-width:0;display:flex;gap:2px;height:8px}',
  '.si-seg i{display:block;height:100%;border-radius:999px;background:var(--si-acc)}',
  '.si-seg i.rest{flex:1 1 0;min-width:4px;background:var(--si-track)}',
  '.si-c3{flex:none;font:600 12px var(--nn-font);color:var(--si-ink3);font-variant-numeric:tabular-nums}',
  '.si-chips{display:flex;flex-wrap:wrap;gap:6px}',
  '.si-chip{display:inline-flex;align-items:baseline;gap:5px;padding:4px 8px;border-radius:7px;background:var(--si-chip);border:1px solid var(--si-line);',
  '  font:500 12px var(--nn-font);color:var(--si-ink2);font-variant-numeric:tabular-nums;white-space:nowrap}',
  '.si-chip b{font-weight:800;color:var(--si-ink)}',
  '.si-pc{font-style:normal;font-size:12px;color:var(--si-ink3);margin-left:-2px}',
  '.si-chip em,.sid-chg em{font-style:normal;font-weight:700}',
  '.si-up{color:var(--si-up)}.si-dn{color:var(--si-dn)}.si-new{color:var(--si-acc2)}.si-eq{color:var(--si-ink3);font-weight:500!important}',
  '.si-meta{font:500 12px/1.4 var(--nn-font);color:var(--si-ink3);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.si-meta .si-old{color:var(--si-ink2)}',
  /* 상세 — 카드가 있는 줄 바로 아래 */
  '.si-detail{grid-column:1/-1;border-radius:16px;border:1px solid var(--si-acc);background:var(--si-card-h);padding:20px 22px 18px}',
  '.si-detail.anim{animation:siIn .32s cubic-bezier(.22,1,.36,1)}',
  '@keyframes siIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}',
  '.sid-hd{display:flex;gap:14px 20px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}',
  '.sid-who{display:flex;gap:14px;align-items:flex-start;min-width:0;flex:1 1 360px}',
  '.sid-who .si-av{width:56px;height:56px;font-size:16px}',
  '.sid-id{min-width:0}',
  '.sid-en{font:800 22px/1.2 var(--nn-font);letter-spacing:-.015em;color:var(--si-ink)}',
  '.sid-sub{font:500 13px/1.5 var(--nn-font);color:var(--si-ink2);margin-top:2px}',
  '.sid-tag{display:inline-block;margin-left:8px;padding:1px 7px;border-radius:999px;border:1px solid var(--si-line);font-size:12px;color:var(--si-ink3)}',
  '.sid-bio{font:400 13px/1.55 var(--nn-font);color:var(--si-ink3);margin-top:6px;max-width:620px}',
  '.sid-meta{flex:none;text-align:right;font:500 12px/1.65 var(--nn-font);color:var(--si-ink3)}',
  '.sid-meta b{color:var(--si-ink)}',
  '.sid-meta a{color:var(--si-acc2);font-weight:700;text-decoration:none}',
  '.sid-meta a:hover{text-decoration:underline}',
  '.sid-stats{display:flex;flex-wrap:wrap;gap:4px 20px;margin:14px 0 8px;font:500 13px var(--nn-font);color:var(--si-ink2)}',
  '.sid-stats b{color:var(--si-ink);font-weight:800;font-variant-numeric:tabular-nums}',
  '.sid-rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:30px}',
  '.sid-row{display:grid;grid-template-columns:22px 70px minmax(0,1fr) 50px 62px;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--si-line)}',
  '.sid-rk{font:700 11px var(--nn-font-label);color:var(--si-ink3);font-variant-numeric:tabular-nums}',
  '.sid-tk{font:800 13px var(--nn-font);color:var(--si-ink);background:none;border:0;padding:0;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  'button.sid-tk:hover{color:var(--si-acc2);text-decoration:underline}',
  '.sid-tk.nolink{cursor:default;font-weight:700}',
  '.sid-nm{display:flex;flex-direction:column;gap:4px;min-width:0}',
  '.sid-nm span{font:400 12px var(--nn-font);color:var(--si-ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  /* 순위 막대 — 한 색, 왼쪽(기준선)은 각지고 끝은 4px 둥글게 */
  '.sid-nm i{display:block;height:6px;border-radius:0 4px 4px 0;background:var(--si-acc)}',
  '.sid-pct{font:700 13px var(--nn-font);color:var(--si-ink);text-align:right;font-variant-numeric:tabular-nums}',
  '.sid-chg{font:700 12px var(--nn-font);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}',
  '.sid-sold{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:14px}',
  '.sid-lb{font:700 12px var(--nn-font);color:var(--si-ink2);margin-right:4px}',
  '.sid-more{font:500 12px var(--nn-font);color:var(--si-ink3)}',
  '.sid-empty{padding:16px 0 4px;font:500 13px var(--nn-font);color:var(--si-ink3)}',
  '.sid-foot{margin-top:14px;font:400 12px/1.65 var(--nn-font);color:var(--si-ink3)}',
  '@media (max-width:899px){.sid-rows{grid-template-columns:1fr}.sid-meta{text-align:left}}',
  /* 휴대폰 — 옆으로 넘기는 한 줄 */
  '@media (max-width:699px){',
  '  #siGrid{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:2px 2px 8px;margin:0 -2px}',
  '  #siGrid::-webkit-scrollbar{display:none}',
  '  #siGrid .si-card{flex:0 0 84%;scroll-snap-align:start}',
  '  .si-detail{margin-top:10px;padding:16px 14px}',
  '  .sid-row{grid-template-columns:20px 62px minmax(0,1fr) 48px 56px;gap:6px}',
  '  .sid-en{font-size:19px}',
  '}',
  '@media (prefers-reduced-motion:reduce){.si-detail.anim{animation:none}.si-spin,#siRefresh.spin{animation:none}}',

  /* 고르기 · 편집 창 */
  '.si-ed-ov{position:fixed;inset:0;z-index:2900000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.58);opacity:0;transition:opacity .2s}',
  '.si-ed-ov.show{opacity:1}',
  '.si-ed{width:min(760px,100%);max-height:min(88vh,920px);display:flex;flex-direction:column;background:var(--nn-surface);color:var(--nn-ink);',
  '  border:1px solid var(--nn-line);border-radius:16px;box-shadow:var(--nn-shadow-lg);font-family:var(--nn-font);transform:translateY(8px);transition:transform .25s cubic-bezier(.22,1,.36,1)}',
  '.si-ed-ov.show .si-ed{transform:none}',
  '.si-ed-hd{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--nn-line)}',
  '.si-ed-hd b{flex:1;font:800 17px var(--nn-font)}',
  '.si-ed-bd{overflow:auto;padding:4px 18px 18px;overscroll-behavior:contain}',
  '.si-ed-ft{display:flex;align-items:center;gap:8px;padding:12px 18px;border-top:1px solid var(--nn-line)}',
  '.si-ed-ft .sp{flex:1}',
  '.si-ed .sb{font:600 12px var(--nn-font);padding:7px 11px;border-radius:8px;cursor:pointer;color:var(--nn-ink);background:var(--nn-surface-3);border:1px solid var(--nn-line-2);white-space:nowrap}',
  '.si-ed .sb:hover{background:rgba(255,255,255,.1)}',
  '.si-ed .sb.pri{color:#14120f;background:var(--nn-gold-2);border-color:var(--nn-gold-2)}',
  '.si-ed .sb.on{color:#14120f;background:#e0dcd2;border-color:#e0dcd2}',
  '.si-ed .sb.ic{width:30px;height:30px;padding:0;display:inline-grid;place-items:center;font-size:13px}',
  '.si-ed .sb:disabled{opacity:.35;cursor:default}',
  '.si-ed .sb.del{color:#ffb4b4;border-color:rgba(248,113,113,.4)}',
  '.sie-sec{display:flex;align-items:baseline;gap:8px;margin:18px 0 8px;font:700 11px var(--nn-font-label);letter-spacing:.16em;color:var(--nn-gold)}',
  '.sie-sec small{font:500 12px var(--nn-font);letter-spacing:0;color:var(--nn-ink-3)}',
  '.sie-note{font:400 12.5px/1.6 var(--nn-font);color:var(--nn-ink-3);margin:-2px 0 8px}',
  '.sie-row{display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:6px;border-radius:10px;border:1px solid var(--nn-line);background:var(--nn-surface-3)}',
  '.sie-row .si-av{width:32px;height:32px;font-size:11px}',
  '.sie-row .si-av img{filter:none}',
  '.sie-nm{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}',
  '.sie-nm b{font:700 14px var(--nn-font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.sie-nm span{font:400 12px var(--nn-font);color:var(--nn-ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.sie-acts{display:flex;gap:4px;flex:none}',
  '.sie-tags{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 8px}',
  '.sie-in{width:100%;box-sizing:border-box;font:500 13px var(--nn-font);color:var(--nn-ink);background:rgba(255,255,255,.04);border:1px solid var(--nn-line-2);border-radius:8px;padding:8px 10px;outline:none}',
  '.sie-in:focus{border-color:var(--nn-gold-line)}',
  'textarea.sie-in{min-height:110px;resize:vertical;line-height:1.6}',
  '.sie-line{display:flex;gap:6px;align-items:center;flex-wrap:wrap}',
  '.sie-line .sie-in{flex:1 1 200px;width:auto}',
  '.sie-form{display:grid;gap:8px;padding:10px;margin:-2px 0 10px;border-radius:10px;border:1px dashed var(--nn-gold-line);background:rgba(232,196,126,.05)}',
  '.sie-form label{font:600 12px var(--nn-font);color:var(--nn-ink-2)}',
  '.sie-out{margin-top:8px;font:500 13px/1.6 var(--nn-font);color:var(--nn-ink-2)}',
  '.sie-out .bad{color:#ffb4b4}',
  '.sie-a{color:var(--nn-gold-2);font:600 12px var(--nn-font);text-decoration:none}',
  '.sie-a:hover{text-decoration:underline}',
  '.sie-help ol{margin:6px 0 0 18px;padding:0;font:400 13px/1.75 var(--nn-font);color:var(--nn-ink-2)}',
  '.sie-help code{font:600 12px ui-monospace,Consolas,monospace;padding:1px 5px;border-radius:5px;background:rgba(255,255,255,.08);color:var(--nn-ink)}',
  '.sie-chk{display:inline-flex;align-items:center;gap:6px;font:600 12px var(--nn-font);padding:3px 9px;border-radius:999px;border:1px solid var(--nn-line-2);color:var(--nn-ink-2)}',
  '.sie-chk.ok{color:var(--nn-good);border-color:rgba(74,222,128,.35)}.sie-chk.no{color:var(--nn-warn);border-color:rgba(255,196,126,.4)}',
  '.sie-empty{font:500 13px var(--nn-font);color:var(--nn-ink-3);padding:8px 2px}',
  '@media (max-width:640px){.si-ed-ov{padding:0;align-items:flex-end}.si-ed{max-height:92vh;border-radius:16px 16px 0 0}}'
  ].join('\n');
  function injectCss(){
    if ($('nnMastersCss')) return;
    var s = document.createElement('style'); s.id = 'nnMastersCss'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ── 자리 만들기 ── */
  function mount(){
    var sec = document.querySelector('.masters-section'); if (!sec) return false;
    var wrap = sec.querySelector('.ref-lane-wrap'); if (!wrap) return false;
    var head = wrap.querySelector('.ref-lane-header');
    if (head && !$('siTools')){
      var sub = head.querySelector('.ref-lane-sub'); if (sub){ sub.id = 'siSub'; sub.textContent = '전설적 투자자들의 최신 포트폴리오 · 13F 공시'; }
      var t = document.createElement('span'); t.className = 'si-tools'; t.id = 'siTools';
      t.innerHTML = '<button type="button" id="siRefresh" title="최신 13F 다시 받기" aria-label="최신 13F 다시 받기">⟳</button>'
        + '<button type="button" id="siEdit" class="hub-edit-toggle">✎ 고르기 · 편집</button>';
      head.appendChild(t);
    }
    /* 예전 칸(흐르는 띠 · 도넛 상세)은 치운다 */
    ['mastersMarquee', 'masterDetail', 'masterTooltip'].forEach(function(id){ var e = $(id); if (e) e.remove(); });
    if (!$('siStatus')){ var s = document.createElement('div'); s.className = 'si-status'; s.id = 'siStatus'; s.setAttribute('aria-live', 'polite'); wrap.appendChild(s); }
    if (!$('siGrid')){ var g = document.createElement('div'); g.id = 'siGrid'; wrap.appendChild(g); }
    return true;
  }

  function isRail(){ try { return window.matchMedia('(max-width:699px)').matches; } catch(e) { return false; } }
  function colCount(g){ var t = ''; try { t = getComputedStyle(g).gridTemplateColumns || ''; } catch(e) {} return Math.max(1, t.split(' ').filter(Boolean).length); }
  function render(){
    if (!mount()) return;
    var g = $('siGrid'), L = getList();
    var keepScroll = g.scrollLeft;
    var det = $('siDetail'); if (det) det.remove();
    g.innerHTML = L.list.length ? L.list.map(function(it){ return cardHTML(full(it)); }).join('')
      : '<div class="si-status">고른 투자자가 없습니다. <button type="button" data-si="edit">고르기</button></div>';
    g.scrollLeft = keepScroll;
    placeDetail();
    paintStatus();
  }
  var rq = 0;
  function renderSoon(){ if (!rq) rq = setTimeout(function(){ rq = 0; render(); }, 60); }
  function placeDetail(){
    var g = $('siGrid'); if (!g) return;
    var old = $('siDetail'); if (old) old.remove();
    if (!st.open) return;
    var it = byId(st.open), card = g.querySelector('.si-card[data-id="' + (window.CSS && CSS.escape ? CSS.escape(st.open) : st.open) + '"]');
    if (!it || !card){ st.open = ''; return; }
    var det = document.createElement('div'); det.id = 'siDetail'; det.className = 'si-detail' + (st.anim ? ' anim' : ''); st.anim = false;
    det.setAttribute('role', 'region'); det.setAttribute('aria-label', full(it).en + ' 포트폴리오');
    det.innerHTML = detailHTML(full(it));
    if (isRail()) g.parentNode.insertBefore(det, g.nextSibling);
    else {
      var cards = [].slice.call(g.querySelectorAll('.si-card')), i = cards.indexOf(card), cols = colCount(g);
      var last = cards[Math.min(cards.length - 1, Math.floor(i / cols) * cols + cols - 1)];
      g.insertBefore(det, last.nextSibling);
    }
  }
  function toggle(id){
    st.open = st.open === id ? '' : id;
    st.anim = !!st.open;
    render();
    if (st.open){
      var det = $('siDetail');
      if (det) setTimeout(function(){
        var r = det.getBoundingClientRect();
        if (r.bottom > window.innerHeight - 20 || r.top < 70){ try { det.scrollIntoView({ behavior: 'smooth', block: r.height < window.innerHeight - 120 ? 'nearest' : 'start' }); } catch(e) {} }
      }, 40);
    }
  }

  function paintStatus(){
    var el = $('siStatus'); if (!el) return;
    var L = getList(), w = W(), html = '', cls = '';
    var periods = [], lastAt = 0, behind = 0, live = 0, exp = expectedPeriod();
    var busy = Object.keys(st.busy).length + runQ.length;
    L.list.forEach(function(it){
      var m = full(it); if (!m.cik) return;
      var c = cacheGet(m.cik); if (!c) return;
      live++; periods.push(c.d.period); if (c.at > lastAt) lastAt = c.at; if (c.d.period < exp) behind++;
    });
    periods.sort();
    var top = periods[periods.length - 1] || '';
    if (!w){ cls = 'warn'; html = '자동 갱신이 꺼져 있습니다 — 내 Worker 를 연결하면 매 분기 최신 13F 로 저절로 바뀝니다. 지금은 예시 값입니다. <button type="button" data-si="connect">연결하기</button>'; }
    else if (st.ws === 'old'){ cls = 'warn'; html = 'Worker 를 새 판(v15)으로 바꾸면 최신 분기가 저절로 반영됩니다' + (live ? '' : ' — 지금은 예시 값입니다') + '. <button type="button" data-si="help">바꾸는 법</button>'; }
    else if (st.ws === 'forbidden' && st.uaSet){ cls = 'warn'; html = 'SEC 가 잠시 요청을 막았습니다(짧은 시간에 요청이 많을 때 생깁니다) — 잠시 뒤 ⟳ 를 눌러 주세요' + (live ? '' : '. 지금은 예시 값입니다') + '.'; }
    else if (st.ws === 'forbidden'){ cls = 'bad'; html = 'SEC 가 요청을 막았습니다 — Worker 설정에 SEC_UA(이름과 이메일)를 넣어 주세요. <button type="button" data-si="help">넣는 법</button>'; }
    else if (st.ws === 'error' && !live){ cls = 'warn'; html = '13F 를 받지 못했습니다 — 잠시 뒤 ⟳ 를 눌러 주세요.'; }
    else {
      html = (top ? '<b>' + esc(qLabel(top)) + '</b> 13F 까지 반영' : (busy ? '13F 를 받는 중' : 'SEC 13F 공시'))
        + (lastAt ? ' · ' + esc(ago(lastAt)) + ' 확인' : '')
        + (busy ? ' · <span class="si-spin"></span> ' + busy + '명 받는 중' : '')
        + (!busy && behind && top ? ' · ' + behind + '명은 ' + esc(qLabel(exp)) + ' 공시가 아직 없음' : '');
    }
    el.innerHTML = html; el.className = 'si-status' + (cls ? ' ' + cls : '');
    var rb = $('siRefresh'); if (rb) rb.classList.toggle('spin', !!busy);
  }

  /* ── 고르기 · 편집 창 ── */
  var ed = { q: '', tag: '', editing: '', cikRes: null, probe: null };
  function edOpen(){ return !!$('siEdOv'); }
  function openEditor(section){
    injectCss();
    if (!edOpen()){
      var ov = document.createElement('div'); ov.id = 'siEdOv'; ov.className = 'si-ed-ov';
      ov.innerHTML = '<div class="si-ed" role="dialog" aria-modal="true" aria-labelledby="siEdT">'
        + '<div class="si-ed-hd"><b id="siEdT">슈퍼 인베스터 고르기 · 편집</b><button type="button" class="sb ic" data-si="close" aria-label="닫기">✕</button></div>'
        + '<div class="si-ed-bd" id="siEdBd"></div>'
        + '<div class="si-ed-ft"><button type="button" class="sb" data-si="reset">처음 9명으로</button><span class="sp"></span><button type="button" class="sb pri" data-si="close">완료</button></div></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', onEdClick);
      ov.addEventListener('input', onEdInput);
      ov.addEventListener('keydown', function(e){ if (e.key === 'Enter' && e.target && e.target.id === 'siEdCik'){ e.preventDefault(); findCik(); } });
      ov.addEventListener('mousedown', function(e){ if (e.target === ov) ov.__down = true; });
      ov.addEventListener('mouseup', function(e){ if (e.target === ov && ov.__down) closeEditor(); ov.__down = false; });
      requestAnimationFrame(function(){ ov.classList.add('show'); });
      probeWorker();
    }
    renderEditor();
    if (section){
      setTimeout(function(){ var t = $('siEd-' + section); if (t) try { t.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch(e) {} }, 60);
    }
  }
  function closeEditor(){
    var ov = $('siEdOv'); if (!ov) return;
    ov.classList.remove('show'); ed.editing = '';
    setTimeout(function(){ if (ov.parentNode) ov.remove(); }, 200);
    var b = $('siEdit'); if (b) try { b.focus({ preventScroll: true }); } catch(e) {}
  }
  function probeWorker(){
    var w = W();
    if (!w){ ed.probe = { none: true }; return; }
    ed.probe = { loading: true };
    fetch(w + '/', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(j){
      ed.probe = { v: j && j.v, sec: !!(j && j.endpoints && j.endpoints.indexOf('/sec13f') >= 0), ua: !!(j && j.secUa) };
    }, function(){ ed.probe = { fail: true }; }).then(function(){ if (edOpen()) renderEditor(); });
  }
  function rowHTML(m, acts){
    return '<div class="sie-row" data-id="' + esc(m.id) + '">' + avatar(m)
      + '<span class="sie-nm"><b>' + esc(m.en) + '</b><span>' + esc([m.kr, m.corp, m.tag].filter(Boolean).join(' · ')) + '</span></span>'
      + '<span class="sie-acts">' + acts + '</span></div>';
  }
  function editForm(it){
    var m = full(it);
    var h = '<div class="sie-form" data-form="' + esc(it.id) + '">';
    if (!m.dir){
      h += '<label>이름 (영문 또는 한글)</label><input class="sie-in" data-f="en" value="' + esc(m.en) + '" maxlength="60">';
      h += '<label>운용사</label><input class="sie-in" data-f="corp" value="' + esc(m.corp) + '" maxlength="80">';
    }
    h += '<label>한글 이름</label><input class="sie-in" data-f="kr" value="' + esc(m.kr) + '" maxlength="40">';
    h += '<label>사진 주소 <span style="font-weight:400;color:var(--nn-ink-3)">(비우면 이니셜)</span></label><input class="sie-in" data-f="img" value="' + esc(it.img || (m.dir ? '' : m.img)) + '" placeholder="https://…" maxlength="400">';
    if (m.manual){
      var port = (it.port || []).map(function(p){ return p[0] + ' | ' + p[1] + ' | ' + p[2] + '%'; }).join('\n');
      h += '<label>보유 종목 <span style="font-weight:400;color:var(--nn-ink-3)">(한 줄에 하나 · 티커 | 종목명 | 비중%)</span></label><textarea class="sie-in" data-f="port" placeholder="AAPL | Apple Inc. | 25%">' + esc(port) + '</textarea>';
    }
    h += '<div class="sie-line"><button type="button" class="sb pri" data-si="save-edit" data-id="' + esc(it.id) + '">저장</button><button type="button" class="sb" data-si="cancel-edit">취소</button></div></div>';
    return h;
  }
  function renderEditor(){
    var bd = $('siEdBd'); if (!bd) return;
    var L = getList(), keep = bd.scrollTop, focusId = document.activeElement && document.activeElement.id;
    var chosen = {}; L.list.forEach(function(it){ chosen[it.id] = 1; });
    var h = '<div class="sie-sec" id="siEd-mine">홈에 보일 사람 <small>' + L.list.length + '명 · 위에서부터 차례로</small></div>';
    if (!L.list.length) h += '<div class="sie-empty">아직 아무도 없습니다 — 아래에서 골라 넣으세요.</div>';
    L.list.forEach(function(it, i){
      var m = full(it);
      h += rowHTML(m, '<button type="button" class="sb ic" data-si="edit-one" data-id="' + esc(it.id) + '" title="이름 · 사진 고치기" aria-label="' + esc(m.en) + ' 고치기">✎</button>'
        + '<button type="button" class="sb ic" data-si="up" data-id="' + esc(it.id) + '"' + (i ? '' : ' disabled') + ' title="위로" aria-label="위로">↑</button>'
        + '<button type="button" class="sb ic" data-si="down" data-id="' + esc(it.id) + '"' + (i < L.list.length - 1 ? '' : ' disabled') + ' title="아래로" aria-label="아래로">↓</button>'
        + '<button type="button" class="sb ic del" data-si="del" data-id="' + esc(it.id) + '" title="빼기" aria-label="' + esc(m.en) + ' 빼기">✕</button>');
      if (ed.editing === it.id) h += editForm(it);
    });

    h += '<div class="sie-sec" id="siEd-dir">더 고르기 <small>이름표 ' + DIR.length + '명</small></div>'
      + '<input class="sie-in" id="siEdQ" placeholder="이름 · 운용사로 찾기 (예: 버핏, Baupost)" value="' + esc(ed.q) + '" autocomplete="off" style="margin-bottom:8px">'
      + '<div class="sie-tags">' + ['전체'].concat(TAGS).map(function(t){ var v = t === '전체' ? '' : t; return '<button type="button" class="sb' + (ed.tag === v ? ' on' : '') + '" data-si="tag" data-tag="' + esc(v) + '">' + esc(t) + '</button>'; }).join('') + '</div>'
      + '<div id="siEdDir">' + dirHTML(chosen) + '</div>';

    h += '<div class="sie-sec" id="siEd-cik">CIK 로 찾아 넣기 <small>13F 를 내는 곳이면 누구나</small></div>'
      + '<div class="sie-note">CIK 는 SEC 가 매긴 10자리 번호입니다. 운용사 이름으로 SEC 에서 찾을 수 있습니다 — <a class="sie-a" href="https://www.sec.gov/edgar/searchedgar/companysearch" target="_blank" rel="noopener">SEC 에서 CIK 찾기 ↗</a></div>'
      + '<div class="sie-line"><input class="sie-in" id="siEdCik" inputmode="numeric" placeholder="예) 0001067983" maxlength="14" autocomplete="off"><button type="button" class="sb" data-si="cik-find">찾기</button></div>'
      + '<div class="sie-out" id="siEdCikOut">' + cikOutHTML() + '</div>';

    h += '<div class="sie-sec" id="siEd-manual">직접 적기 <small>13F 가 없는 사람</small></div>'
      + '<div class="sie-note">국내 투자자처럼 SEC 공시가 없는 사람은 이름과 보유 종목을 직접 적어 둘 수 있습니다(자동으로 바뀌지는 않습니다).</div>'
      + '<button type="button" class="sb" data-si="manual-add">＋ 직접 적기</button>';

    h += '<div class="sie-sec" id="siEd-view">보이는 개수</div>'
      + '<div class="sie-line">카드 칩 ' + [3, 5].map(function(n){ return '<button type="button" class="sb' + (L.top === n ? ' on' : '') + '" data-si="top" data-v="' + n + '">' + n + '개</button>'; }).join('')
      + '<span style="width:14px"></span>상세 ' + [10, 15, 20].map(function(n){ return '<button type="button" class="sb' + (L.detail === n ? ' on' : '') + '" data-si="detail" data-v="' + n + '">' + n + '종목</button>'; }).join('') + '</div>';

    h += '<div class="sie-sec" id="siEd-help">자동 갱신 연결</div><div class="sie-help">' + helpHTML() + '</div>';
    bd.innerHTML = h;
    bd.scrollTop = keep;
    if (focusId && $(focusId)){ var f = $(focusId); try { f.focus({ preventScroll: true }); if (f.setSelectionRange && typeof f.value === 'string') f.setSelectionRange(f.value.length, f.value.length); } catch(e) {} }
  }
  function dirHTML(chosen){
    var q = ed.q.trim().toLowerCase();
    var rows = DIR.filter(function(d){
      if (chosen[d.id]) return false;
      if (ed.tag && d.tag !== ed.tag) return false;
      if (!q) return true;
      return (d.en + ' ' + d.kr + ' ' + d.corp + ' ' + d.tag).toLowerCase().indexOf(q) >= 0;
    });
    if (!rows.length) return '<div class="sie-empty">' + (q || ed.tag ? '맞는 사람이 없습니다 — 아래 CIK 로 찾아 넣을 수 있습니다.' : '이름표의 모든 사람을 이미 골랐습니다.') + '</div>';
    return rows.map(function(d){ return rowHTML(full({ id: d.id }), '<button type="button" class="sb" data-si="add" data-id="' + esc(d.id) + '">＋ 넣기</button>'); }).join('');
  }
  function cikOutHTML(){
    var r = ed.cikRes; if (!r) return '';
    if (r.loading) return '<span class="si-spin"></span> SEC 에서 찾는 중…';
    if (r.error) return '<span class="bad">' + esc(r.error) + '</span>';
    var d = r.d;
    return '<b>' + esc(d.name || r.cik) + '</b> · CIK ' + esc(r.cik) + ' · ' + esc(qLabel(d.period)) + ' 13F (' + esc(kDay(d.filed)) + ' 공시) · ' + d.count + '종목 · ' + money(d.total)
      + (r.dup ? ' — <span class="bad">이미 목록에 있습니다</span>' : ' <button type="button" class="sb pri" data-si="cik-add">＋ 넣기</button>');
  }
  function helpHTML(){
    var p = ed.probe || {}, w = W();
    var chk = function(ok, yes, no){ return '<span class="sie-chk ' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓ ' + yes : '• ' + no) + '</span>'; };
    var s = '<div class="sie-line" style="margin-bottom:6px">'
      + chk(!!w, 'Worker 연결됨', 'Worker 주소 없음')
      + (w ? (p.loading ? '<span class="sie-chk">확인 중…</span>' : p.fail ? chk(false, '', 'Worker 가 답하지 않음') : chk(p.sec, 'v' + (p.v || '?') + ' · 13F 지원', 'v' + (p.v || '?') + ' — 새 판(v15) 필요') + (p.sec ? chk(p.ua, 'SEC_UA 설정됨', 'SEC_UA 없음') : '')) : '')
      + '</div>';
    s += '<div class="sie-note">SUPER INVESTORS 는 내 Cloudflare Worker 를 거쳐 SEC EDGAR 의 공식 13F 공시를 읽습니다. 처음 한 번만 해 두면 매 분기 저절로 바뀝니다.</div><ol>'
      + (w ? '' : '<li>설정 › 연결 에서 Worker 주소를 넣습니다 <button type="button" class="sb" data-si="connect">설정 열기</button></li>')
      + '<li>Cloudflare 대시보드 › Workers &amp; Pages › 내 Worker › <b>Edit code</b> 에서, 올릴 파일 묶음의 <code>worker.js</code> 내용으로 통째로 바꾸고 <b>Deploy</b></li>'
      + '<li>같은 Worker 의 <b>Settings › Variables and Secrets › Add</b> — 이름 <code>SEC_UA</code>, 값은 <code>이름 이메일주소</code> (예: <code>Hong Gildong hong@example.com</code>)<br>'
      + '<span style="color:var(--nn-ink-3)">SEC 는 누가 보내는지 밝히지 않은 자동 요청을 막습니다. 이 값은 Worker 안에만 있고 SEC 로만 보내집니다.</span></li>'
      + '<li>(선택) <code>OPENFIGI_KEY</code> — openfigi.com 무료 키. 없어도 되지만 넣으면 티커를 더 빨리 찾습니다</li>'
      + '<li>여기서 <button type="button" class="sb" data-si="refresh">⟳ 지금 받기</button> 를 누르면 바로 최신 분기를 받습니다</li></ol>';
    return s;
  }
  function move(id, dir){
    var L = getList(), i = -1;
    L.list.forEach(function(x, k){ if (x.id === id) i = k; });
    var j = i + dir; if (i < 0 || j < 0 || j >= L.list.length) return;
    var t = L.list[i]; L.list[i] = L.list[j]; L.list[j] = t;
    saveList(); renderEditor(); render();
  }
  function findCik(){
    var inp = $('siEdCik'), c = cik10(inp && inp.value);
    if (!c){ ed.cikRes = { error: '숫자로 된 CIK 를 넣어 주세요 (예: 0001067983)' }; paintCik(); return; }
    if (!W()){ ed.cikRes = { error: 'Worker 가 연결되어 있어야 SEC 에서 찾을 수 있습니다 — 아래 \'자동 갱신 연결\'을 먼저 해 주세요' }; paintCik(); return; }
    ed.cikRes = { loading: true, cik: c }; paintCik();
    fetchOne(c, false).then(function(res){
      if (!ed.cikRes || ed.cikRes.cik !== c) return;
      if (res.ok){
        cachePut(c, res.d);
        var dup = getList().list.some(function(it){ return full(it).cik === c; });
        ed.cikRes = { cik: c, d: res.d, dup: dup };
        needTk(res.d);
      } else ed.cikRes = { cik: c, error: (ERR[res.error] || '찾지 못했습니다') + (res.name ? ' — ' + res.name : '') };
      paintCik();
    });
  }
  function paintCik(){ var o = $('siEdCikOut'); if (o) o.innerHTML = cikOutHTML(); }
  function titleCase(s){ return String(s || '').toLowerCase().replace(/\b[a-z]/g, function(c){ return c.toUpperCase(); }).replace(/\b(Llc|Lp|L\.p\.|Inc|Ltd)\b/g, function(x){ return x.toUpperCase().replace('L.P.', 'LP'); }); }
  function onEdInput(e){
    if (e.target && e.target.id === 'siEdQ'){
      ed.q = e.target.value || '';
      var L = getList(), chosen = {}; L.list.forEach(function(it){ chosen[it.id] = 1; });
      var box = $('siEdDir'); if (box) box.innerHTML = dirHTML(chosen);
    }
  }
  function onEdClick(e){
    var t = e.target.closest ? e.target.closest('[data-si]') : null; if (!t) return;
    var a = t.getAttribute('data-si'), id = t.getAttribute('data-id'), L = getList();
    if (a === 'close'){ closeEditor(); return; }
    if (a === 'add'){
      if (!byId(id)){ L.list.push({ id: id }); saveList(); }
      renderEditor(); render(); refresh(false);
      toast('✓ ' + (DIRI[id] ? DIRI[id].en : '') + ' 을(를) 넣었습니다');
      return;
    }
    if (a === 'del'){
      var idx = -1; L.list.forEach(function(x, k){ if (x.id === id) idx = k; }); if (idx < 0) return;
      var rm = L.list.splice(idx, 1)[0]; saveList();
      if (st.open === id) st.open = '';
      if (ed.editing === id) ed.editing = '';
      renderEditor(); render();
      if (window.__nnToast) window.__nnToast('🗑 ' + esc(full(rm).en) + ' 을(를) 뺐습니다', { kind: 'del', undo: function(){
        var l2 = getList(); if (!byId(rm.id)){ l2.list.splice(Math.min(idx, l2.list.length), 0, rm); saveList(); }
        if (edOpen()) renderEditor(); render();
      } });
      return;
    }
    if (a === 'up' || a === 'down'){ move(id, a === 'up' ? -1 : 1); return; }
    if (a === 'edit-one'){ ed.editing = ed.editing === id ? '' : id; renderEditor(); return; }
    if (a === 'cancel-edit'){ ed.editing = ''; renderEditor(); return; }
    if (a === 'save-edit'){ saveEdit(id); return; }
    if (a === 'tag'){ ed.tag = t.getAttribute('data-tag') || ''; var chosen = {}; L.list.forEach(function(it){ chosen[it.id] = 1; }); var box = $('siEdDir'); if (box) box.innerHTML = dirHTML(chosen);
      [].forEach.call(document.querySelectorAll('#siEdOv [data-si="tag"]'), function(b){ b.classList.toggle('on', (b.getAttribute('data-tag') || '') === ed.tag); }); return; }
    if (a === 'cik-find'){ findCik(); return; }
    if (a === 'cik-add'){
      var r = ed.cikRes; if (!r || !r.d) return;
      var nm = titleCase(r.d.name || ('CIK ' + r.cik));
      L.list.push({ id: 'cik:' + r.cik, cik: r.cik, en: nm, kr: '', corp: nm });
      saveList(); ed.cikRes = null; var ci = $('siEdCik'); if (ci) ci.value = '';
      renderEditor(); render(); refresh(false);
      toast('✓ ' + nm + ' 을(를) 넣었습니다 — ✎ 로 이름과 사진을 고칠 수 있습니다');
      return;
    }
    if (a === 'manual-add'){
      var mid = 'm:' + Math.random().toString(36).slice(2, 9);
      L.list.push({ id: mid, manual: true, en: '새 투자자', kr: '', corp: '', port: [] });
      saveList(); ed.editing = mid; renderEditor(); render();
      setTimeout(function(){ var f = document.querySelector('#siEdOv .sie-form [data-f="en"]'); if (f){ f.focus(); f.select(); } }, 30);
      return;
    }
    if (a === 'top' || a === 'detail'){ L[a] = +t.getAttribute('data-v'); saveList(); renderEditor(); render(); return; }
    if (a === 'reset'){
      var go = function(){ LIST = defaults(); saveList(); st.open = ''; ed.editing = ''; renderEditor(); render(); refresh(false); toast('처음 9명으로 돌렸습니다'); };
      if (window.__nnConfirm) window.__nnConfirm({ icon: '↺', title: '처음 9명으로 돌릴까요?', msg: '지금 고른 목록과 고친 이름 · 사진이 처음 상태로 돌아갑니다.', ok: '돌리기', onOk: go });
      else go();
      return;
    }
    if (a === 'connect'){ closeEditor(); setTimeout(function(){ if (window.__nnSettingsOpen) window.__nnSettingsOpen('keys'); }, 220); return; }
    if (a === 'refresh'){ refresh(true); toast('최신 13F 를 받는 중입니다'); return; }
  }
  function saveEdit(id){
    var it = byId(id), f = document.querySelector('#siEdOv .sie-form[data-form="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (!it || !f) return;
    var val = function(k){ var el = f.querySelector('[data-f="' + k + '"]'); return el ? String(el.value || '').trim() : null; };
    var img = val('img');
    if (img && window.__nnCheckImgUrl){ var c = window.__nnCheckImgUrl(img); if (!c || !c.ok) return; img = c.url; }
    if (img && !/^https?:\/\//i.test(img)){ toast('사진 주소는 http(s):// 로 시작해야 합니다', true); return; }
    var m = full(it);
    if (m.dir){
      if (val('kr') && val('kr') !== DIRI[id].kr) it.kr = val('kr'); else delete it.kr;
      if (img && img !== DIRI[id].img) it.img = img; else delete it.img;
    } else {
      var en = val('en'); if (en === '') { toast('이름을 적어 주세요', true); return; }
      if (en != null) it.en = en;
      if (val('corp') != null) it.corp = val('corp');
      it.kr = val('kr') || '';
      it.img = img || '';
      if (m.manual){
        var tx = f.querySelector('[data-f="port"]');
        it.port = String(tx ? tx.value : '').split('\n').map(function(ln){
          var p = ln.split('|').map(function(s){ return s.trim(); });
          if (!p[0]) return null;
          return [p[0].toUpperCase().slice(0, 12), p[1] || p[0], parseFloat(String(p[2] || '').replace(/[^0-9.]/g, '')) || 0];
        }).filter(Boolean).sort(function(a, b){ return b[2] - a[2]; }).slice(0, 40);
      }
    }
    saveList(); ed.editing = ''; renderEditor(); render();
    toast('✓ 고쳤습니다');
  }

  /* ── 이벤트 ── */
  function onClick(e){
    var t = e.target;
    if (!t || !t.closest) return;
    var sec = t.closest('.masters-section'); if (!sec) return;
    var b;
    if ((b = t.closest('#siRefresh'))){ refresh(true); return; }
    if ((b = t.closest('#siEdit'))){ openEditor(); return; }
    if ((b = t.closest('[data-si]'))){
      var a = b.getAttribute('data-si');
      if (a === 'connect'){ if (window.__nnSettingsOpen) window.__nnSettingsOpen('keys'); return; }
      if (a === 'help'){ openEditor('help'); return; }
      if (a === 'edit'){ openEditor(); return; }
    }
    if ((b = t.closest('.sid-tk[data-tk]'))){
      var tk = b.getAttribute('data-tk');
      if (window.__nnTicker && window.__nnTicker.open) window.__nnTicker.open(tk);
      return;
    }
    var card = t.closest('.si-card');
    if (card && !t.closest('a')) toggle(card.getAttribute('data-id'));
  }
  function onKey(e){
    if (e.key === 'Escape'){
      if (edOpen()){ e.preventDefault(); e.stopPropagation(); if (ed.editing){ ed.editing = ''; renderEditor(); } else closeEditor(); return; }
      if (st.open && document.activeElement && document.activeElement.closest && document.activeElement.closest('.masters-section')){ st.open = ''; render(); }
      return;
    }
    var t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t && t.classList && t.classList.contains('si-card')){ e.preventDefault(); toggle(t.getAttribute('data-id')); }
  }

  /* 화면 근처에 오면 받기 시작 — 홈을 열자마자 다 부르지 않는다 */
  var started = false;
  function start(){ if (started) return; started = true; refresh(false); }
  function watchVisible(){
    var sec = document.querySelector('.masters-section');
    if (!sec) return;
    if (typeof IntersectionObserver === 'function'){
      var io = new IntersectionObserver(function(en){ en.forEach(function(x){ if (x.isIntersecting){ start(); io.disconnect(); } }); }, { rootMargin: '900px 0px' });
      io.observe(sec);
    }
    setTimeout(start, 9000);
  }
  var rz = 0, lastRail = null;
  function onResize(){
    clearTimeout(rz);
    rz = setTimeout(function(){
      var r = isRail();
      if (st.open || r !== lastRail){ lastRail = r; placeDetail(); }
    }, 150);
  }

  function boot(){
    injectCss();
    if (!mount()){ setTimeout(boot, 400); return; }
    lastRail = isRail();
    render();
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('storage', function(e){
      if (!e) return;
      if (e.key === KEY){ LIST = null; render(); }
      else if (e.key === 'nn_worker_url'){ st.ws = ''; refresh(false); }
    });
    window.addEventListener('nn:sync', function(){ var v = lsGet(KEY); if (v && LIST && v !== JSON.stringify(LIST)){ LIST = null; render(); } });
    watchVisible();
  }

  window.__nnMasters = {
    render: render, refresh: refresh, edit: openEditor, close: closeEditor,
    open: function(id){ if (byId(id)){ st.open = id; render(); } },
    list: function(){ return getList().list.map(full); },
    data: function(cik){ var c = cacheGet(cik10(cik)); return c ? c.d : null; },
    dir: function(){ return DIR.slice(); },
    _state: st
  };
  window.__siRender = function(){ LIST = null; render(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
