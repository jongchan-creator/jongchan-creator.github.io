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
        2026-11-23 오후(회장님 요청): 예전 목록의 '굵고 큰 흰 이름'을 살렸다 — 상자를 걷고 위쪽 괘선만, 이름은 카드 폭에 맞춰
        26~46px 굵게(두 줄로 고르게), 올리면 금색 밑줄이 그어지고 흑백 사진(4:3 액자)에 색이 돌아온다. /0.1 번호 · 운용사 줄도 예전 그대로.
        카드: 번호 · 운용사 · 분기 / 큰 이름 · 한글 이름 · 사진 / 상위 3종목 몫(가는 막대) · 상위 종목 · 종목 수 · 합계 · 신규/매도 수
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

  /* 한 줄 소개 (한국어) — 상세 창 머리에 나온다. 잘 알려진 사실만 적었다 */
  var KD = {
    druckenmiller: '조지 소로스와 함께 1992년 영국 파운드화 하락에 베팅한 일로 유명한 매크로 투자자입니다. 금리 · 환율 같은 큰 흐름을 읽고, 확신이 서면 몇 종목에 크게 겁니다. 지금은 자기 돈만 굴리는 패밀리 오피스입니다.',
    smith: '“좋은 회사를 사라, 비싸게 사지 마라, 그리고 아무것도 하지 마라”는 원칙으로 유명한 영국 펀드매니저입니다. 이익을 꾸준히 많이 내는 우량 기업을 골라 오래 들고 갑니다.',
    coleman: '전설적 헤지펀드 타이거 매니지먼트 출신(‘타이거 새끼’)입니다. 인터넷 · 소프트웨어 같은 기술 성장주에 크게 투자해 왔습니다.',
    buffett: '버크셔 해서웨이를 수십 년간 이끈 ‘오마하의 현인’입니다. 경쟁자가 넘보기 어려운 ‘해자’를 가진 좋은 기업을 적당한 값에 사서 아주 오래 보유합니다. 이 목록은 버크셔 해서웨이 회사의 보유 내역입니다.',
    ackman: '몇 안 되는 우량 기업에 크게 투자하고, 필요하면 경영에 목소리를 내는 행동주의 투자자입니다. 보통 10개 안팎의 종목만 들고 있습니다.',
    wood: 'AI · 로봇 · 유전자 편집 · 핀테크 같은 ‘파괴적 혁신’ 기업에 집중하는 ARK 인베스트의 창업자입니다. 오르내림이 큰 성장주가 많습니다.',
    soros: '재귀성 이론(시장의 믿음이 현실을 바꾸고, 바뀐 현실이 다시 가격에 반영된다)으로 유명한 매크로 투자의 전설입니다. 지금은 소로스 가족과 재단의 자금을 굴립니다.',
    burry: '2008년 금융위기 직전 미국 주택시장 붕괴에 베팅한 영화 ‘빅쇼트’의 주인공입니다. 남들이 외면한 종목을 사거나, 하락에 거는 옵션(풋)을 쓰는 역발상 투자자입니다.',
    dalio: '세계 최대 헤지펀드 브리지워터를 세운 매크로 투자자로, 어떤 경기에도 버티게 나눠 담는 ‘올웨더’ 전략으로 유명합니다. 경영에서는 물러났고, 이 목록은 브리지워터 회사의 보유 내역입니다.',
    klarman: '가치투자 고전 『안전마진』의 저자입니다. 충분히 싸게 살 기회가 없으면 현금을 쥐고 오래 기다리는 것으로 유명합니다.',
    lilu: '찰리 멍거가 직접 돈을 맡긴 투자자입니다. 아주 적은 수의 종목에 오래 집중합니다.',
    duan: '중국 전자회사 BBK(오포 · 비보의 뿌리)를 세운 기업가 출신 투자자입니다. 버핏처럼 좋은 회사 몇 개를 골라 오래 들고 갑니다.',
    pabrai: '버핏의 방식을 그대로 따라 하겠다고 공언한 가치투자자입니다. 잃을 위험은 작고 얻을 가능성은 큰 기회를 노리며, 미국 밖 주식도 많이 삽니다(13F 에는 미국 상장분만 나옵니다).',
    gayner: '보험사 마클의 주식 투자를 이끄는 인물입니다. 버크셔처럼 보험 자금으로 좋은 기업을 오래 보유해 ‘작은 버크셔’로 불립니다.',
    einhorn: '싼 주식은 사고 거품 낀 주식은 공매도하는 가치투자 헤지펀드입니다. 회계 문제를 파헤친 공매도로도 유명합니다(13F 에는 공매도가 나오지 않습니다).',
    akre: '좋은 사업 · 좋은 경영진 · 번 돈을 다시 잘 굴리는 능력, 이 ‘세 다리’를 갖춘 회사를 골라 오래 들고 가는 운용사입니다.',
    mandel: '타이거 출신 스티븐 맨델이 세운 헤지펀드입니다. 소비 · 기술 분야에서 앞서가는 회사를 고릅니다.',
    laffont: '타이거 출신 필립 라퐁이 세운 운용사로, 기술 · 인터넷 기업에 집중합니다.',
    halvorsen: '타이거 출신 안드레아스 할보르센이 세운 헤지펀드입니다. 업종을 깊이 파고들어 오를 종목은 사고, 내릴 종목은 공매도합니다.',
    loeb: '기업 이사회에 날카로운 공개 편지를 보내는 것으로 유명한 행동주의 · 이벤트 투자자입니다.',
    icahn: '1980년대 ‘기업 사냥꾼’으로 이름을 날린 원조 행동주의 투자자입니다. 지분을 사들인 뒤 경영 변화를 요구합니다.',
    peltz: '큰 소비재 · 산업 기업의 지분을 사서 경영 개선을 요구하는 행동주의 투자자입니다(P&G 이사회 참여 등).',
    hohn: '영국 헤지펀드 TCI 의 창업자입니다. 소수의 우량 기업에 크게 투자하고 경영진에 강하게 요구하는 행동주의 투자자입니다.',
    tepper: '2009년 금융위기 때 헐값이 된 은행주를 사서 큰돈을 번 것으로 유명합니다. 공포가 클 때 사는 역발상 투자자입니다.',
    marks: '투자자들이 기다려 읽는 ‘메모’로 유명한 오크트리의 공동 창업자입니다. 부실채권이 본업이라 13F 의 주식은 전체 운용의 일부입니다.',
    gates: '빌 & 멜린다 게이츠 재단의 기금입니다. 큰 우량주를 오래 들고 가는 편입니다.',
    nps: '한국 국민연금공단이 미국 시장에 신고한 주식입니다. 지수처럼 넓게 나눠 담아 한 종목의 비중이 작습니다.'
  };
  var TAG_TIP = { '가치':'싸게 사서 오래 들고 가는 방식', '성장':'빨리 크는 회사에 투자', '매크로':'금리 · 환율 같은 큰 흐름에 베팅', '행동주의':'지분을 사서 경영 변화를 요구', '역발상':'남들이 두려워할 때 사는 방식', '기관':'연기금 · 재단 같은 큰 기금' };

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
  function fxRate(){ var A = jget('nn_assets_v1', {}) || {}, f = parseFloat(A.fx); return f > 500 && f < 3000 ? f : 1380; }
  function krw(usd){
    var w = (+usd || 0) * fxRate();
    if (w >= 1e12) return '약 ' + (w / 1e12).toFixed(w >= 1e13 ? 0 : 1) + '조 원';
    if (w >= 1e8) return '약 ' + Math.round(w / 1e8).toLocaleString('ko-KR') + '억 원';
    return '약 ' + Math.round(w / 1e4).toLocaleString('ko-KR') + '만 원';
  }
  function md(s){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? (+m[2]) + '월 ' + (+m[3]) + '일' : ''; }
  function dayDiff(a, b){
    var pa = /^(\d{4})-(\d{2})-(\d{2})/.exec(a || ''), pb = /^(\d{4})-(\d{2})-(\d{2})/.exec(b || '');
    if (!pa || !pb) return 0;
    return Math.round((new Date(+pb[1], +pb[2] - 1, +pb[3]) - new Date(+pa[1], +pa[2] - 1, +pa[3])) / 86400000);
  }
  /* SEC 의 대문자 회사 이름을 읽기 쉽게 — 'WATERS CORP' → 'Waters Corp' (ETF · ADR 같은 약자는 그대로) */
  var KEEP_UP = { ETF:1, ADR:1, ADS:1, SPDR:1, REIT:1, LP:1, LLC:1, PLC:1, NV:1, SA:1, AG:1, SE:1, II:1, III:1, IV:1, USA:1, US:1, AI:1 };
  function nameCase(n){
    return String(n || '').toLowerCase().replace(/[a-z][a-z0-9'.]*/g, function(w){
      var U = w.toUpperCase().replace(/\./g, '');
      return KEEP_UP[U] ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1);
    });
  }
  /* 상위 10종목 몫으로 본 '쏠림' — 말로 풀어 준다 */
  function concentration(p){
    return p >= 80 ? ['아주 집중', '상위 10개에 거의 다 담았습니다']
         : p >= 50 ? ['집중형', '상위 10개에 절반 넘게 담았습니다']
         : p >= 30 ? ['고르게', '여러 종목에 나눠 담았습니다']
         : ['아주 넓게', '지수처럼 넓게 나눠 담았습니다'];
  }
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
  function photoHTML(m, extra){
    return '<span class="si-ph' + (extra ? ' ' + extra : '') + '" aria-hidden="true"><i>' + esc(initials(m.en)) + '</i>'
      + (m.img ? '<img src="' + esc(m.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false" onerror="this.remove()">' : '') + '</span>';
  }
  /* 아주 긴 낱말(띄어쓰기 없는 이름)은 글자를 조금 줄여 낱말 가운데서 끊기지 않게 */
  function fitCls(name){
    var L = 0; String(name || '').split(/\s+/).forEach(function(w){ var n = 0; for (var i = 0; i < w.length; i++) n += /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF]/.test(w.charAt(i)) ? 1.7 : 1; if (n > L) L = n; });
    return L >= 18 ? ' xl' : L >= 14 ? ' l' : '';
  }
  function cardHTML(m, idx){
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
      + '<div class="si-head"><span class="si-idx">/0.' + ((idx || 0) + 1) + '</span><span class="si-corp">' + esc(m.corp || m.tag || '') + '</span>'
      +   (q ? '<span class="si-q' + (v.mode === 'live' ? '' : ' demo') + '">' + esc(q) + '</span>' : '') + '</div>'
      + '<div class="si-who"><b class="si-en' + fitCls(m.en) + '">' + esc(m.en) + '</b>' + (m.kr ? '<span class="si-kr">' + esc(m.kr) + '</span>' : '') + '</div>'
      + '<div class="si-data">' + photoHTML(m) + '<div class="si-dcol">' + seg
      +   (chips ? '<div class="si-chips">' + chips + '</div>' : '')
      +   '<div class="si-meta">' + meta + '</div></div></div>'
      + '</div>';
  }
  /* 상세 — 2026-11-24: 한 화면에 들어오게(넓은 화면은 3열 · 자세한 설명은 접어 둠) · 말로 풀어 준 요약 */
  function rowsCols(){
    var g = $('siGrid'), w = (g ? g.clientWidth : window.innerWidth) - 56;
    return w >= 1060 ? 3 : w >= 600 ? 2 : 1;
  }
  function tile(k, v, sub, tip){
    return '<div class="sid-tile"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><span class="k">' + k + '</span><b class="v">' + v + '</b>' + (sub ? '<span class="s">' + sub + '</span>' : '') + '</div>';
  }
  function quarterLine(m, v, d){
    if (!d.prev) return '';
    var R = v.rows, items = [], lb = function(r){ return esc(r.lb); };
    var news = R.filter(function(r){ return r.chg === 'new'; });
    var ups = R.filter(function(r){ return typeof r.chg === 'number' && r.chg >= 5; }).sort(function(a, b){ return b.chg - a.chg; });
    var dns = R.filter(function(r){ return typeof r.chg === 'number' && r.chg <= -5; }).sort(function(a, b){ return a.chg - b.chg; });
    var fmt = function(x){ return (x > 0 ? '+' : '−') + (Math.abs(x) >= 100 ? Math.round(Math.abs(x)) : Math.abs(x)) + '%'; };
    if (news.length) items.push('<span class="sid-q new"><b>＋ 새로 담음</b> ' + news.slice(0, 4).map(lb).join(' · ') + (d.newCount > Math.min(4, news.length) ? ' <i>등 ' + d.newCount + '종목</i>' : '') + '</span>');
    if (ups.length) items.push('<span class="sid-q up"><b>▲ 가장 많이 늘림</b> ' + lb(ups[0]) + ' <i>주식 수 ' + fmt(ups[0].chg) + '</i></span>');
    if (dns.length) items.push('<span class="sid-q dn"><b>▼ 가장 많이 줄임</b> ' + lb(dns[0]) + ' <i>주식 수 ' + fmt(dns[0].chg) + '</i></span>');
    if (d.sold && d.sold.length) items.push('<span class="sid-q sold"><b>✕ 모두 팖</b> ' + d.sold.slice(0, 3).map(function(x){ return esc(holdLabel(x)); }).join(' · ')
      + (d.soldCount > 3 ? ' <i>등 ' + d.soldCount + '종목</i>' : '') + '</span>');
    return '<div class="sid-qs"><span class="sid-qs-h">이번 분기 한눈에</span>'
      + (items.length ? items.join('') : '<span class="sid-q">상위 종목 구성은 지난 분기와 거의 같습니다.</span>') + '</div>';
  }
  function detailHTML(m, lim){
    var L = getList(), v = view(m), d = v.d, live = v.mode === 'live';
    var all = v.rows.slice(0, L.detail), rows = lim && lim < all.length ? all.slice(0, lim) : all, max = 0;
    all.forEach(function(r){ if (r.pct > max) max = r.pct; });
    var edgar = m.cik ? 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=' + m.cik + '&type=13F-HR&dateb=&owner=include&count=40' : '';
    var desc = KD[m.id] || (m.dir ? '' : m.cik ? 'SEC 에 분기마다 13F 를 내는 기관입니다(CIK ' + m.cik + ').' : (m.manual ? '직접 적어 둔 투자자입니다.' : ''));
    var tip = TAG_TIP[m.tag] || '';

    /* 머리 — 큰 이름 · 사진 · 소개 · 닫기 */
    var h = '<div class="sid-hd">' + photoHTML(m, 'sid-ph')
      + '<div class="sid-id"><div class="sid-en">' + esc(m.en) + '</div>'
      +   '<div class="sid-sub">' + esc([m.kr, m.corp].filter(Boolean).join(' · '))
      +     (m.tag ? '<span class="sid-tag">' + esc(m.tag) + '</span>' + (tip ? '<span class="sid-tip">' + esc(tip) + '</span>' : '') : '') + '</div>'
      +   (desc ? '<div class="sid-kd">' + esc(desc) + '</div>' : '') + '</div>'
      + '<button type="button" class="sid-x" data-si="close-detail" aria-label="상세 닫기" title="닫기 (Esc)">✕</button></div>';

    /* 숫자를 말로 — 다섯 칸 */
    if (live){
      var t10 = v.rows.slice(0, 10).reduce(function(a, r){ return a + r.pct; }, 0), c = concentration(t10), lag = dayDiff(d.period, d.filed);
      var old = d.period < expectedPeriod();
      h += '<div class="sid-tiles">'
        + tile('기준일', md(d.period) + (old ? ' <em class="si-old">지난 분기</em>' : ''), esc(qLabel(d.period)) + ' · ' + md(d.filed) + ' 신고' + (lag > 0 ? '(' + lag + '일 뒤)' : ''),
               '분기 마지막 날 들고 있던 주식입니다. 신고는 분기가 끝나고 45일 안에 합니다.' + (old ? ' 이 투자자는 아직 최신 분기 신고가 없습니다.' : ''))
        + tile('보유 종목', d.count + '개', '미국 상장 주식 · 옵션', '13F 에 적힌 종목 수입니다(같은 종목은 하나로 셌습니다).')
        + tile('신고한 총액', money(d.total), krw(d.total) + '<span class="fx"> · 1달러 ' + Math.round(fxRate()).toLocaleString('ko-KR') + '원</span>', '13F 에 적힌 평가액의 합계입니다. 원화는 ASSETS 에 적힌 환율로 셈했습니다.')
        + tile('쏠림 정도', c[0] + ' <em>상위 10개 ' + pctTxt(t10) + '</em>', c[1], '상위 10종목이 신고 총액에서 차지하는 몫입니다.')
        + (d.prev ? tile('지난 분기와 비교', '새로 ' + d.newCount + ' · 모두 매도 ' + d.soldCount, esc(qLabel(d.prev.period)) + '(' + md(d.prev.period) + ') 대비', '새로 산 종목 수와, 지난 분기에 있다가 이번에 하나도 남기지 않은 종목 수입니다.')
                  : tile('지난 분기와 비교', '—', '비교할 이전 신고가 없습니다'))
        + '</div>';
      h += quarterLine(m, v, d);
    } else if (v.mode === 'demo'){
      h += '<div class="sid-note">지금 보이는 숫자는 <b>예시</b>입니다 — 예전에 적어 둔 값이라 실제와 다를 수 있어요. 내 Worker 를 연결하면 SEC 의 최신 분기 공시로 저절로 바뀝니다.</div>';
    } else if (v.mode === 'manual'){
      h += '<div class="sid-note">직접 적어 둔 값입니다. 고르기 · 편집의 ✎ 에서 고칠 수 있어요.</div>';
    }

    /* 보유 종목 — 넓은 화면 3열 · 위에서 아래로 순위 */
    if (rows.length){
      var cols = rowsCols(), per = Math.ceil(rows.length / cols);
      h += '<div class="sid-lbl">TOP HOLDINGS<span>' + (live
            ? '상위 ' + all.length + '종목 · <b>비중</b> = 신고 총액 중 차지하는 몫 · <b>▲ ▼</b> = 지난 분기보다 <b>주식 수</b>를 늘렸나 줄였나(주가 변화 아님) · 티커를 누르면 종목 한 장'
            : v.mode === 'demo' ? '예시 값' : '직접 적은 값') + '</span></div>';
      h += '<div class="sid-rows" role="table" aria-label="' + esc(m.en) + ' 보유 상위 종목" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr));grid-template-rows:repeat(' + per + ',auto)">'
        + rows.map(function(r, i){
          var t = r.nm + (r.pc ? ' (' + r.pc + ')' : '') + ' · 비중 ' + pctTxt(r.pct) + (r.value ? ' · ' + money(r.value) : '') + (r.shares ? ' · ' + Math.round(r.shares).toLocaleString('en-US') + '주' : '')
            + (live && d.prev ? (r.chg === 'new' ? ' · 이번 분기 새로 삼' : typeof r.chg === 'number' ? ' · 주식 수 ' + (r.chg > 0 ? '+' : '') + r.chg + '%' : '') : '');
          return '<div class="sid-row" role="row" title="' + esc(t) + '"><span class="sid-rk" role="cell">' + (i + 1) + '</span>'
            + (r.tk ? '<button type="button" class="sid-tk" data-tk="' + esc(r.tk) + '" role="cell" title="' + esc(r.tk) + ' — 종목 한 장 열기">' + esc(r.tk) + '</button>' : '<span class="sid-tk nolink" role="cell">' + esc(r.lb) + '</span>')
            + '<span class="sid-nm" role="cell"><span>' + esc(nameCase(r.nm)) + (r.pc ? ' · ' + esc(r.pc === 'Put' ? '풋옵션(하락에 거는 계약)' : r.pc === 'Call' ? '콜옵션(상승에 거는 계약)' : r.pc) : '') + '</span><i style="width:' + (max ? Math.max(2, r.pct / max * 100) : 0).toFixed(1) + '%"></i></span>'
            + '<span class="sid-pct" role="cell">' + pctTxt(r.pct) + '</span>'
            + '<span class="sid-chg" role="cell">' + (live && d.prev ? chgMark(r.chg, true) : '') + '</span></div>';
        }).join('') + '</div>';
      if (rows.length < all.length) h += '<button type="button" class="sid-morerows" data-si="all-rows">나머지 ' + (all.length - rows.length) + '종목도 보기 ↓</button>';
    } else h += '<div class="sid-empty">아직 보여 줄 종목이 없습니다' + (m.cik && !W() ? ' — Worker 를 연결하면 SEC 에서 받아 옵니다.' : '.') + '</div>';

    /* 발 — 읽는 법(접어 둠) · 원문 */
    h += '<div class="sid-foot"><details class="sid-help"><summary>이 자료 읽는 법 — 13F 란?</summary><ul>'
      + '<li><b>13F</b>는 미국에서 주식을 1억 달러 넘게 굴리는 기관이 분기마다 미국 증권거래위원회(SEC)에 내는 <b>보유 주식 목록</b>입니다.</li>'
      + '<li><b>조금 늦은 정보</b>입니다. 분기 마지막 날 기준이고 그 뒤 45일 안에 공개되니, 지금은 이미 사고팔았을 수 있어요.</li>'
      + '<li><b>빠지는 것</b>이 있습니다. 공매도 · 채권 · 현금 · 미국 밖 주식은 나오지 않아요. 그래서 ‘전 재산’이 아니라 ‘미국 주식 쪽’의 모습입니다.</li>'
      + '<li><b>비중</b>은 신고한 금액 합계 대비이고, <b>▲ ▼</b>는 주식 수 기준입니다 — 주가가 올라 비중이 커진 것과 직접 더 산 것을 가를 수 있어요.</li>'
      + '<li><b>풋 · 콜</b>은 옵션입니다(풋 = 하락에, 콜 = 상승에 거는 계약). 금액은 그 옵션이 걸린 주식 기준입니다.</li>'
      + '</ul></details><span class="sid-src">'
      + (live ? '<a href="' + esc(d.url || edgar) + '" target="_blank" rel="noopener">SEC 원문 보기 ↗</a> · ' + esc(ago(v.at)) + ' 받음'
              : edgar ? '<a href="' + esc(edgar) + '" target="_blank" rel="noopener">SEC 13F 목록 ↗</a>' : '')
      + '</span></div>';
    return h;
  }

  var CSS = [
  /* 색은 한 곳에서 — 밝은 바탕(홈의 종이 화면)에서는 아래에서 바꾼다 */
  '.masters-section{--si-ink:#f0ede6;--si-ink2:rgba(240,237,230,.72);--si-ink3:rgba(240,237,230,.5);--si-line:rgba(255,255,255,.1);',
  '  --si-card:rgba(255,255,255,.03);--si-card-h:rgba(255,255,255,.055);--si-acc:#c9a96e;--si-acc2:#e8c47e;--si-track:rgba(255,255,255,.13);',
  '  --si-up:#7ee7a6;--si-dn:#ff9d8f;--si-chip:rgba(255,255,255,.045);',
  '  --si-name:rgba(248,245,238,.94);--si-name-h:#fff;--si-name-sh:0 1px 3px rgba(0,0,0,.45);--si-idx:rgba(255,255,255,.32);',
  '  --si-sheen:linear-gradient(100deg,rgba(255,255,255,.07),rgba(201,169,110,.05) 62%,transparent);',
  '  --si-panel:linear-gradient(165deg,rgba(24,22,19,.9),rgba(11,11,13,.84))}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .masters-section{--si-ink:#14120F;--si-ink2:#575145;--si-ink3:#7d7566;--si-line:rgba(20,18,15,.12);',
  '  --si-card:rgba(255,255,255,.66);--si-card-h:#fff;--si-acc:#8A6A24;--si-acc2:#8A6A24;--si-track:rgba(20,18,15,.1);--si-up:#1e7a4b;--si-dn:#b23a2c;--si-chip:rgba(20,18,15,.035);',
  '  --si-name:#14120F;--si-name-h:#000;--si-name-sh:none;--si-idx:rgba(20,18,15,.38);',
  '  --si-sheen:linear-gradient(100deg,rgba(138,106,36,.075),rgba(138,106,36,.03) 62%,transparent);--si-panel:rgba(255,255,255,.86)}',
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
  '#siGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:clamp(18px,2.6vw,40px);border-bottom:1px solid var(--si-line)}',
  '@media (max-width:1099px){#siGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  /* 카드 — 상자 대신 위쪽 괘선 하나(예전 목록처럼). 올리면 은은한 빛이 깔리고 괘선이 금색으로 */
  '.si-card{position:relative;isolation:isolate;container-type:inline-size;display:flex;flex-direction:column;gap:12px;min-width:0;',
  '  padding:18px clamp(10px,1.2vw,18px) 20px;cursor:pointer;outline:none;border-top:1px solid var(--si-line);transition:border-color .42s cubic-bezier(.22,1,.36,1)}',
  '.si-card::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:var(--si-sheen);opacity:0;transition:opacity .42s cubic-bezier(.22,1,.36,1)}',
  '.si-card:hover::before,.si-card.on::before{opacity:1}',
  '.si-card:hover{border-top-color:rgba(201,169,110,.42)}',
  '.si-card.on{border-top-color:var(--si-acc)}',
  '.si-card:focus-visible{outline:2px solid #e8c47e;outline-offset:-2px}',
  '.si-head{display:flex;align-items:baseline;gap:10px;min-width:0}',
  '.si-idx{flex:none;font:700 11px var(--nn-font-label);letter-spacing:.1em;color:var(--si-idx);transition:color .35s}',
  '.si-card:hover .si-idx,.si-card.on .si-idx{color:var(--si-acc2)}',
  '.si-corp{flex:1;min-width:0;font:500 12.5px/1.4 var(--nn-font);color:var(--si-ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .35s}',
  '.si-card:hover .si-corp,.si-card.on .si-corp{color:var(--si-ink)}',
  '.si-q{flex:none;font:700 11px var(--nn-font-label);letter-spacing:.08em;color:var(--si-acc2)}',
  '.si-q.demo{font-family:var(--nn-font);letter-spacing:0;color:var(--si-ink3)}',
  /* 이름 — 예전의 굵고 큰 흰 글씨. 카드 폭에 맞춰 26~46px, 두 줄이면 고르게 나눈다 */
  '.si-who{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:7px}',
  '.si-en{position:relative;display:block;max-width:100%;padding-bottom:6px;font-family:var(--nn-font);font-weight:800;letter-spacing:-.03em;line-height:1.02;',
  '  font-size:clamp(1.6rem,2.4vw,2.4rem);font-size:clamp(26px,11cqi,46px);color:var(--si-name);text-shadow:var(--si-name-sh);',
  '  text-wrap:balance;word-break:keep-all;overflow-wrap:break-word;transition:color .38s ease}',
  '.si-en::after{content:"";position:absolute;left:0;bottom:0;height:1px;width:100%;background:linear-gradient(90deg,rgba(201,169,110,.9),rgba(201,169,110,.15));',
  '  transform:scaleX(0);transform-origin:left;transition:transform .55s cubic-bezier(.22,1,.36,1)}',
  '.si-card:hover .si-en::after,.si-card.on .si-en::after{transform:scaleX(1)}',
  '.si-card:hover .si-en,.si-card.on .si-en{color:var(--si-name-h)}',
  '.si-en.l{font-size:clamp(1.4rem,2vw,2rem);font-size:clamp(24px,8.6cqi,38px)}',
  '.si-en.xl{font-size:clamp(1.2rem,1.6vw,1.6rem);font-size:clamp(20px,6.6cqi,30px)}',
  '.si-kr{font:500 12px var(--nn-font);letter-spacing:.02em;color:var(--si-ink3);transition:color .4s}',
  '.si-card:hover .si-kr,.si-card.on .si-kr{color:var(--si-acc2)}',
  /* 사진 — 4:3 액자. 흑백이었다가 올리거나 펼치면 색이 돌아온다(예전 목록과 같은 움직임) */
  '.si-data{display:flex;align-items:center;gap:clamp(12px,4cqi,18px);min-width:0;margin-top:auto;padding-top:3px}',   /* 같은 줄 카드끼리 아래 칸을 맞춘다 */
  '.si-dcol{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px}',
  '.si-ph{flex:none;position:relative;width:88px;width:clamp(70px,22cqi,104px);aspect-ratio:4/3;border-radius:10px;overflow:hidden;display:grid;place-items:center;',
  '  background:var(--si-chip);color:var(--si-acc2);font:700 13px var(--nn-font-label);letter-spacing:.06em}',
  '.si-ph i{font-style:normal;opacity:.75}',
  '.si-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 22%;filter:grayscale(1) brightness(.85);transform:scale(1.05);',
  '  transition:filter .5s cubic-bezier(.22,1,.36,1),transform .6s cubic-bezier(.22,1,.36,1)}',
  '.si-card:hover .si-ph img,.si-card.on .si-ph img,.si-detail .si-ph img{filter:none;transform:scale(1)}',
  '.si-av{flex:none;position:relative;width:42px;height:42px;border-radius:50%;overflow:hidden;display:grid;place-items:center;',
  '  background:rgba(201,169,110,.15);color:var(--si-acc2);font:800 13px var(--nn-font);letter-spacing:.02em}',
  '.si-av i{font-style:normal}',
  '.si-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 22%}',
  /* 가는 막대: 상위 3종목(한 색 · 2px 틈) + 나머지(회색). 글자는 옆에 */
  '.si-bar{display:flex;align-items:center;gap:10px}',
  '.si-seg{flex:1;min-width:0;display:flex;gap:2px;height:4px}',
  '.si-seg i{display:block;height:100%;border-radius:999px;background:var(--si-acc)}',
  '.si-seg i.rest{flex:1 1 0;min-width:4px;background:var(--si-track)}',
  '.si-c3{flex:none;font:600 12px var(--nn-font);color:var(--si-ink3);font-variant-numeric:tabular-nums}',
  /* 상위 종목 — 칸 없이 글자로: 티커는 굵게, 비중은 옅게 */
  '.si-chips{display:flex;flex-wrap:wrap;gap:4px 16px}',
  '.si-chip{display:inline-flex;align-items:baseline;gap:6px;font:500 13px var(--nn-font);color:var(--si-ink3);font-variant-numeric:tabular-nums;white-space:nowrap}',
  '.si-chip b{font-weight:800;color:var(--si-ink);letter-spacing:.01em}',
  '.si-pc{font-style:normal;font-size:12px;color:var(--si-ink3);margin-left:-2px}',
  '.si-chip em,.sid-chg em{font-style:normal;font-weight:700}',
  '.si-up{color:var(--si-up)}.si-dn{color:var(--si-dn)}.si-new{color:var(--si-acc2)}.si-eq{color:var(--si-ink3);font-weight:500!important}',
  '.si-meta{font:500 12px/1.4 var(--nn-font);color:var(--si-ink3);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.si-meta .si-old{color:var(--si-ink2)}',
  /* 상세 — 카드가 있는 줄 바로 아래 */
  '.si-detail{grid-column:1/-1;margin:4px 0 22px;border-radius:16px;border:1px solid rgba(201,169,110,.4);background:var(--si-panel);padding:clamp(16px,1.8vw,24px) clamp(16px,2vw,28px) 14px}',
  '.si-detail.anim{animation:siIn .32s cubic-bezier(.22,1,.36,1)}',
  '@keyframes siIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}',
  /* 머리 — 사진 · 큰 이름 · 소개 · 닫기 */
  '.sid-hd{position:relative;display:flex;gap:clamp(14px,1.6vw,22px);align-items:flex-start;padding-right:40px}',
  '.si-ph.sid-ph{width:clamp(92px,8.4vw,124px);border-radius:12px;font-size:15px}',
  '.sid-id{flex:1;min-width:0}',
  '.sid-en{font:800 clamp(1.8rem,2.7vw,2.6rem)/1.04 var(--nn-font);letter-spacing:-.03em;color:var(--si-name);text-shadow:var(--si-name-sh)}',
  '.sid-sub{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;font:500 13px/1.5 var(--nn-font);color:var(--si-ink2);margin-top:6px}',
  '.sid-tag{display:inline-block;padding:1px 8px;border-radius:999px;border:1px solid var(--si-acc);font-size:12px;font-weight:700;color:var(--si-acc2)}',
  '.sid-tip{font-size:12.5px;color:var(--si-ink3)}',
  '.sid-kd{font:400 13.5px/1.6 var(--nn-font);color:var(--si-ink2);margin-top:6px;max-width:860px;word-break:keep-all}',
  '.sid-x{position:absolute;top:-4px;right:-6px;width:34px;height:34px;border-radius:9px;cursor:pointer;display:grid;place-items:center;font-size:15px;line-height:1;',
  '  color:var(--si-ink2);background:transparent;border:1px solid var(--si-line);transition:background-color .15s,color .15s}',
  '.sid-x:hover{color:var(--si-ink);background:var(--si-chip);border-color:var(--si-acc)}',
  /* 숫자를 말로 — 다섯 칸 */
  '.sid-tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:14px 0 10px}',
  '.sid-tile{display:flex;flex-direction:column;gap:2px;min-width:0;padding:9px 12px 10px;border-radius:10px;background:var(--si-chip);border:1px solid var(--si-line)}',
  '.sid-tile .k{font:600 12px var(--nn-font);color:var(--si-ink3)}',
  '.sid-tile .v{font:800 17px/1.3 var(--nn-font);color:var(--si-ink);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.sid-tile .v em{font-style:normal;font-weight:600;font-size:12.5px;color:var(--si-ink2);margin-left:4px}',
  '.sid-tile .v em.si-old{color:var(--si-dn)}',
  '.sid-tile .s{font:500 12px/1.45 var(--nn-font);color:var(--si-ink3)}',
  '.sid-tile .s .fx{opacity:.8}',
  /* 이번 분기 한눈에 */
  '.sid-qs{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 18px;margin:2px 0 4px;font:500 13px/1.5 var(--nn-font);color:var(--si-ink2)}',
  '.sid-qs-h{font:700 12px var(--nn-font);color:var(--si-ink3);margin-right:2px}',
  '.sid-q b{font-weight:800;margin-right:4px}',
  '.sid-q i{font-style:normal;color:var(--si-ink3)}',
  '.sid-q.new b{color:var(--si-acc2)}.sid-q.up b{color:var(--si-up)}.sid-q.dn b{color:var(--si-dn)}.sid-q.sold b{color:var(--si-ink2)}',
  '.sid-note{margin:12px 0 4px;padding:10px 14px;border-radius:10px;background:var(--si-chip);border:1px dashed var(--si-line);font:500 13px/1.6 var(--nn-font);color:var(--si-ink2)}',
  '.sid-lbl{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px;margin:14px 0 2px;font:700 11px var(--nn-font-label);letter-spacing:.26em;color:var(--si-acc2)}',
  '.sid-lbl span{font:500 12px/1.5 var(--nn-font);letter-spacing:0;color:var(--si-ink3)}',
  '.sid-lbl span b{color:var(--si-ink2);font-weight:700}',
  /* 보유 종목 — 열마다 위에서 아래로 순위 */
  '.sid-rows{display:grid;grid-auto-flow:column;column-gap:28px}',
  '.sid-row{display:grid;grid-template-columns:20px 60px minmax(0,1fr) 46px 64px;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--si-line)}',
  '.sid-rk{font:700 11px var(--nn-font-label);color:var(--si-ink3);font-variant-numeric:tabular-nums}',
  '.sid-tk{font:800 13px var(--nn-font);color:var(--si-ink);background:none;border:0;padding:0;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  'button.sid-tk:hover{color:var(--si-acc2);text-decoration:underline}',
  '.sid-tk.nolink{cursor:default;font-weight:700}',
  '.sid-nm{display:flex;flex-direction:column;gap:4px;min-width:0}',
  '.sid-nm span{font:400 12px var(--nn-font);color:var(--si-ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  /* 순위 막대 — 한 색, 왼쪽(기준선)은 각지고 끝은 4px 둥글게 */
  '.sid-nm i{display:block;height:5px;border-radius:0 4px 4px 0;background:var(--si-acc)}',
  '.sid-pct{font:700 13px var(--nn-font);color:var(--si-ink);text-align:right;font-variant-numeric:tabular-nums}',
  '.sid-chg{font:700 12px var(--nn-font);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}',
  '.sid-morerows{margin-top:8px;cursor:pointer;font:700 12.5px var(--nn-font);padding:6px 12px;border-radius:8px;color:var(--si-acc2);background:transparent;border:1px solid var(--si-acc)}',
  '.sid-empty{padding:16px 0 4px;font:500 13px var(--nn-font);color:var(--si-ink3)}',
  /* 발 — 읽는 법(접어 둠) · 원문 */
  '.sid-foot{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:6px 18px;margin-top:12px;font:400 12.5px/1.65 var(--nn-font);color:var(--si-ink3)}',
  '.sid-help{flex:1 1 420px;min-width:0}',
  '.sid-help summary{cursor:pointer;font-weight:700;color:var(--si-ink2);list-style:none}',
  '.sid-help summary::-webkit-details-marker{display:none}',
  '.sid-help summary::before{content:"ⓘ ";color:var(--si-acc2)}',
  '.sid-help[open] summary{color:var(--si-ink)}',
  '.sid-help ul{margin:6px 0 2px 18px;padding:0}',
  '.sid-help li{margin:2px 0}',
  '.sid-help b{color:var(--si-ink2)}',
  '.sid-src{flex:none}',
  '.sid-src a{color:var(--si-acc2);font-weight:700;text-decoration:none}',
  '.sid-src a:hover{text-decoration:underline}',
  /* 화면이 낮을 때 — 여백과 사진을 줄인다 (nn-masters.js 의 fitDetail 이 붙인다) */
  '.si-detail.tight{padding-top:12px;padding-bottom:10px}',
  '.si-detail.tight .si-ph.sid-ph{width:80px}',
  '.si-detail.tight .sid-en{font-size:clamp(1.6rem,2.2vw,2.1rem)}',
  '.si-detail.tight .sid-kd{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}',
  '.si-detail.tight .sid-tiles{margin:10px 0 6px}',
  '.si-detail.tight .sid-tile{padding:6px 10px 7px}',
  '.si-detail.tight .sid-lbl{margin-top:8px}',
  '.si-detail.tight .sid-row{padding:4px 0}',
  '.si-detail.tight .sid-foot{margin-top:8px}',
  '@media (max-width:900px){.sid-tiles{grid-template-columns:repeat(3,minmax(0,1fr))}}',
  '@media (max-width:760px){.sid-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.sid-hd{padding-right:36px}}',
  /* 휴대폰 — 옆으로 넘기는 한 줄 */
  '@media (max-width:699px){',
  '  #siGrid{display:flex;gap:0;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;margin:0 -2px;border-bottom:0}',
  '  #siGrid::-webkit-scrollbar{display:none}',
  '  #siGrid .si-card{flex:0 0 84%;scroll-snap-align:start;border-bottom:1px solid var(--si-line)}',
  '  #siGrid .si-card + .si-card{border-left:1px solid var(--si-line)}',
  '  .si-detail{margin-top:10px;padding:14px 13px 12px}',
  '  .sid-hd{display:grid;grid-template-columns:76px minmax(0,1fr);column-gap:12px;row-gap:3px;align-items:center}',
  '  .sid-hd .si-ph.sid-ph{grid-row:1/span 2;width:76px}',
  '  .sid-id{display:contents}',
  '  .sid-en,.sid-sub{grid-column:2}',
  '  .sid-sub{margin-top:0}',
  '  .sid-kd{grid-column:1/-1;margin:8px -40px 0 0}',
  '  .sid-tile .v{white-space:normal}',
  '  .sid-row{grid-template-columns:20px 58px minmax(0,1fr) 46px 60px;gap:6px}',
  '  .sid-en{font-size:clamp(1.6rem,8vw,2.2rem)}',
  '  .si-ph.sid-ph{width:84px}',
  '  .sid-tile .v{font-size:15px}',
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
    g.innerHTML = L.list.length ? L.list.map(function(it, i){ return cardHTML(full(it), i); }).join('')
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
    if (st.tight) det.classList.add('tight');
    det.innerHTML = detailHTML(full(it), st.lim);
    if (isRail()) g.parentNode.insertBefore(det, g.nextSibling);
    else {
      var cards = [].slice.call(g.querySelectorAll('.si-card')), i = cards.indexOf(card), cols = colCount(g);
      var last = cards[Math.min(cards.length - 1, Math.floor(i / cols) * cols + cols - 1)];
      g.insertBefore(det, last.nextSibling);
    }
  }
  /* 상세가 한 화면에 들어오게 — ① 여백 · 사진을 줄이고(tight) ② 그래도 넘치면 아래쪽 종목을 접는다([나머지도 보기])
     휴대폰(1열)에서는 줄이지 않는다 — 원래 위아래로 넘겨 보는 화면이다 */
  function navBottom(){
    var n = document.querySelector('.nav'); if (!n) return 0;
    var cs; try { cs = getComputedStyle(n); } catch(e) { return 0; }
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return 0;
    var b = n.getBoundingClientRect().bottom;
    return b > 0 && b < 240 ? b : 0;
  }
  function availH(){ return window.innerHeight - navBottom() - 36; }
  function fitDetail(){
    var det = $('siDetail'); if (!det) return;
    var cols = rowsCols(), avail = availH();
    if (cols < 2) return;
    if (!st.tight && det.offsetHeight > avail){ st.tight = true; det.classList.add('tight'); }
    if (!st.allRows && det.offsetHeight > avail){
      var box = det.querySelector('.sid-rows');
      if (box && box.children.length){
        var n = box.children.length, per = Math.ceil(n / cols), rowH = box.offsetHeight / per;
        var keep = Math.max(3, per - Math.ceil((det.offsetHeight - avail) / rowH));
        if (keep < per){ st.lim = keep * cols; det.innerHTML = detailHTML(full(byId(st.open)), st.lim); }
      }
    }
  }
  function scrollToDetail(){
    var det = $('siDetail'); if (!det) return;
    var r = det.getBoundingClientRect(), top = navBottom() + 20, bot = window.innerHeight - 16, dy = 0;
    if (r.bottom > bot) dy = r.bottom - bot;            /* 아래가 잘리면 그만큼 내리되 */
    if (r.top - dy < top) dy = r.top - top;              /* 위(이름)는 절대 메뉴 띠 밑으로 숨지 않게 */
    if (Math.abs(dy) < 4) return;
    var reduce = false; try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e) {}
    try { window.scrollTo({ top: Math.max(0, (window.pageYOffset || 0) + dy), behavior: reduce ? 'auto' : 'smooth' }); }
    catch(e) { window.scrollTo(0, Math.max(0, (window.pageYOffset || 0) + dy)); }
  }
  function toggle(id){
    st.open = st.open === id ? '' : id;
    st.anim = !!st.open; st.tight = false; st.lim = 0; st.allRows = false;
    render();
    if (st.open){ fitDetail(); requestAnimationFrame(scrollToDetail); }
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
      if (a === 'close-detail'){
        var cid = st.open; st.open = ''; render();
        var cc = cid && document.querySelector('#siGrid .si-card[data-id="' + (window.CSS && CSS.escape ? CSS.escape(cid) : cid) + '"]');
        if (cc) try { cc.focus({ preventScroll: true }); } catch(x) {}
        return;
      }
      if (a === 'all-rows'){ st.allRows = true; st.lim = 0; placeDetail(); requestAnimationFrame(scrollToDetail); return; }
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
      if (st.open || r !== lastRail){
        lastRail = r;
        if (st.open && !st.allRows){ st.tight = false; st.lim = 0; }
        placeDetail();
        if (st.open && !st.allRows) fitDetail();
      }
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
