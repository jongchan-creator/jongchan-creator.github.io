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

     ④ 2026-11-25 (회장님 요청)
        · 칸 구분 — 카드 사이 틈을 없애고 괘선 표처럼(바깥 테두리 + 칸 사이 1px 선 공유 + 칸마다 옅은 바탕). 상세도 표 안의 한 줄로
        · 기업 한 장 — 상세의 종목 줄(티커)을 누르면 그 회사가 무엇을 하는지(위키백과 · 한국어 우선), 업종 · 본사 · 매출 · 순이익(SEC),
          지금 주가 · 52주 범위 · 30일 흐름, 이 투자자의 보유와 지난 분기 대비, 내 목록에서 함께 담은 투자자가 뜬다.
          회사 목록을 미리 적어 두지 않는다 — 분기가 바뀌어 새 종목이 생기면 그때 찾아 이 기기에 14일 기억(nn_co_v1)
          상세를 열면 그 투자자의 종목을 뒤에서 하나씩 미리 찾아 두고, 마우스를 올린 줄도 미리 찾는다 → 누르면 바로 보인다
          '모두 팖' 의 종목 이름도 누를 수 있다. 숫자(업종 · 매출)는 worker.js v16 의 /company 가 필요하다(없으면 그 줄만 빠진다)

   window.__nnMasters = { render, refresh(force), open(id), edit(section), list(), data(cik) }
   window.__nnCompany = { open(tk), close(), get(tk) → Promise, peek(tk) }
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
        rows: d.holdings.map(function(h){ return { lb: holdLabel(h), tk: tkOf(h.cusip) || '', nm: h.name, pct: h.pct, chg: h.chg, pc: h.pc, value: h.value, shares: h.shares, cusip: h.cusip }; }) };
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
    /* 상세 안쪽 폭 = 표 폭 − 좌우 여백(clamp(20px,2.6vw,38px) × 2) − 테두리. 2026-11-26 여백을 넓히며 3열 문턱도 1,120px 로(종목 이름 칸이 너무 좁아지지 않게) */
    var g = $('siGrid'), vw = window.innerWidth || 1200, pad = Math.min(38, Math.max(20, vw * 0.026));
    var w = (g ? g.clientWidth : vw) - pad * 2 - 2;
    return w >= 1120 ? 3 : w >= 600 ? 2 : 1;
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
    if (d.sold && d.sold.length) items.push('<span class="sid-q sold"><b>✕ 모두 팖</b> ' + d.sold.slice(0, 3).map(function(x, k){ return '<button type="button" class="sid-sold" data-co-sold="' + k + '" title="' + esc(nameCase(x.name)) + ' — 기업 정보">' + esc(holdLabel(x)) + '</button>'; }).join(' · ')
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
    var h = '<div class="sid-hd">' + (m.img ? photoHTML(m, 'sid-ph')
        : '<button type="button" class="si-ph sid-ph sid-addph" data-si="photo" data-id="' + esc(m.id) + '" title="사진 넣기 — 사진 주소(이미지 링크)를 붙여 넣는 칸이 열립니다" aria-label="' + esc(m.en) + ' 사진 넣기"><i>' + esc(initials(m.en)) + '</i><span>＋ 사진</span></button>')
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
            ? '상위 ' + all.length + '종목 · <b>비중</b> = 신고 총액 중 차지하는 몫 · <b>▲ ▼</b> = 지난 분기보다 <b>주식 수</b>를 늘렸나 줄였나(주가 변화 아님) · <b>티커를 누르면 기업 정보</b>'
            : v.mode === 'demo' ? '예시 값' : '직접 적은 값') + '</span></div>';
      h += '<div class="sid-rows" role="table" aria-label="' + esc(m.en) + ' 보유 상위 종목" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr));grid-template-rows:repeat(' + per + ',auto)">'
        + rows.map(function(r, i){
          var t = r.nm + (r.pc ? ' (' + r.pc + ')' : '') + ' · 비중 ' + pctTxt(r.pct) + (r.value ? ' · ' + money(r.value) : '') + (r.shares ? ' · ' + Math.round(r.shares).toLocaleString('en-US') + '주' : '')
            + (live && d.prev ? (r.chg === 'new' ? ' · 이번 분기 새로 삼' : typeof r.chg === 'number' ? ' · 주식 수 ' + (r.chg > 0 ? '+' : '') + r.chg + '%' : '') : '');
          return '<div class="sid-row" role="row" title="' + esc(t) + '" data-co-i="' + i + '"><span class="sid-rk" role="cell">' + (i + 1) + '</span>'
            + '<button type="button" class="sid-tk' + (r.tk ? '' : ' nolink') + '" data-co-i="' + i + '"' + (r.tk ? ' data-tk="' + esc(r.tk) + '"' : '') + ' role="cell" aria-haspopup="dialog" title="' + esc((r.tk || nameCase(r.nm)) + ' — 기업 정보 보기') + '">' + esc(r.tk || r.lb) + '</button>'
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
  '  --si-rule:rgba(255,255,255,.15);--si-cell:linear-gradient(160deg,rgba(255,255,255,.055),rgba(255,255,255,.014) 55%,rgba(255,255,255,.008));',
  '  --si-panel:linear-gradient(165deg,rgba(24,22,19,.92),rgba(11,11,13,.86));',
  '  --si-cardbd:rgba(255,255,255,.085);--si-cardbd-h:rgba(201,169,110,.42);',
  '  --si-cardsh:inset 0 1px 0 rgba(255,255,255,.05),0 20px 40px -32px rgba(0,0,0,.95);',
  '  --si-cardsh-h:inset 0 1px 0 rgba(255,255,255,.07),0 30px 56px -30px rgba(0,0,0,.95),0 0 0 1px rgba(201,169,110,.1);',
  '  --si-cardsh-on:inset 0 1px 0 rgba(255,255,255,.07),0 0 0 1px rgba(201,169,110,.35),0 30px 56px -30px rgba(0,0,0,.95);',
  '  --si-detbd:rgba(201,169,110,.34);--si-detsh:inset 0 1px 0 rgba(255,255,255,.05),0 36px 70px -40px rgba(0,0,0,.95)}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .masters-section{--si-ink:#14120F;--si-ink2:#575145;--si-ink3:#7d7566;--si-line:rgba(20,18,15,.12);',
  '  --si-card:rgba(255,255,255,.66);--si-card-h:#fff;--si-acc:#8A6A24;--si-acc2:#8A6A24;--si-track:rgba(20,18,15,.1);--si-up:#1e7a4b;--si-dn:#b23a2c;--si-chip:rgba(20,18,15,.035);',
  '  --si-name:#14120F;--si-name-h:#000;--si-name-sh:none;--si-idx:rgba(20,18,15,.38);',
  '  --si-sheen:linear-gradient(100deg,rgba(138,106,36,.075),rgba(138,106,36,.03) 62%,transparent);--si-panel:rgba(255,255,255,.86);',
  '  --si-rule:rgba(20,18,15,.15);--si-cell:linear-gradient(160deg,rgba(255,255,255,.9),rgba(255,255,255,.55) 62%);',
  '  --si-cardbd:rgba(20,18,15,.1);--si-cardbd-h:rgba(138,106,36,.45);',
  '  --si-cardsh:0 1px 2px rgba(20,18,15,.05),0 14px 30px -22px rgba(20,18,15,.25);',
  '  --si-cardsh-h:0 2px 4px rgba(20,18,15,.06),0 24px 44px -24px rgba(20,18,15,.32);',
  '  --si-cardsh-on:0 0 0 1px rgba(138,106,36,.35),0 24px 44px -24px rgba(20,18,15,.32);',
  '  --si-detbd:rgba(138,106,36,.32);--si-detsh:0 26px 50px -30px rgba(20,18,15,.3)}',
  '.masters-section .ref-lane-header{flex-wrap:wrap;row-gap:8px}',
  '.si-tools{margin-left:auto;display:inline-flex;align-items:center;gap:6px}',
  '.si-tools .hub-edit-toggle{margin-left:0}',
  '#siRefresh{width:30px;height:30px;display:inline-grid;place-items:center;border-radius:8px;cursor:pointer;font-size:15px;line-height:1;',
  '  border:1px solid rgba(201,169,110,.4);background:rgba(201,169,110,.08);color:#c9a96e;transition:background .18s}',
  '#siRefresh:hover{background:rgba(201,169,110,.2)}',
  '#siRefresh.spin{animation:siRot 1s linear infinite}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) #siRefresh{background:transparent;border-color:rgba(138,106,36,.42);color:#8A6A24}',
  '@keyframes siRot{to{transform:rotate(360deg)}}',
  /* 2026-11-26 (회장님: 머리글과 '2026 Q3 13F 까지 반영 …' 사이를 레퍼런스 데스크의 머리글 ↔ 단추 사이만큼):
     레퍼런스 데스크는 금색 줄이 머리글에 바로 붙고(위 0) 줄 아래 52px + 단추 4px = 56px 뒤에 단추가 온다.
     nn-style.css 의 '.masters-section .cove-line{margin:18px 0 30px}' 를 같은 리듬으로 — 줄 아래 52px(레퍼런스 데스크의 단추 판과 같은 자리) + 글줄 위 여백 ≈ 56px */
  '.masters-section .cove-line{margin:0 0 52px!important}',
  '.si-status{display:block;margin:2px 0 20px;font:500 13px/1.7 var(--nn-font);color:var(--si-ink3)}',
  '.si-status button{margin-left:6px;vertical-align:1px}',
  '.si-status b{color:var(--si-ink);font-weight:700}',
  '.si-status.warn{color:var(--si-ink2)}.si-status.bad{color:var(--si-dn)}',
  '.si-status button{font:700 12px var(--nn-font);padding:4px 10px;border-radius:7px;cursor:pointer;border:1px solid var(--si-acc);background:transparent;color:var(--si-acc2)}',
  '.si-spin{display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid var(--si-track);border-top-color:var(--si-acc2);animation:siRot .8s linear infinite;vertical-align:-1px}',
  /* 2026-11-25 (회장님: "칸이 잘 구분 안 된다 — 붙어 있어도 칸이 딱 구분되게"): 칸 사이 틈을 없애고 괘선 표처럼 —
     바깥 테두리 + 칸과 칸 사이 1px 선을 한 줄로 공유하고(겹쳐 두꺼워지지 않게 표 왼쪽 · 위쪽은 표가, 칸은 오른쪽 · 아래만 긋는다),
     칸마다 왼쪽 위에서 옅어지는 바탕을 깔아 한 칸 한 칸이 판처럼 보이게 했다. 올리면 칸 윗변에 금색 줄 · 빛 */
  /* 2026-11-26 (회장님: "칸들이 다닥다닥 붙어 답답하다 — 이쁘고 모던하게 띄워 달라"): 괘선 표 → 틈을 둔 카드.
     카드마다 둥근 모서리 · 옅은 테두리 · 아래로 깔리는 그림자, 올리면 살짝 떠오르며 테두리가 금빛, 펼친 카드는 금색 테두리 */
  '#siGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(14px,1.5vw,22px)}',
  '@media (max-width:1099px){#siGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '#siGrid>.si-status{grid-column:1/-1;margin:0;padding:18px 20px;border:1px solid var(--si-cardbd);border-radius:18px;background:var(--si-cell)}',
  '.si-card{position:relative;isolation:isolate;container-type:inline-size;display:flex;flex-direction:column;gap:14px;min-width:0;',
  '  padding:24px clamp(18px,1.7vw,26px);cursor:pointer;outline:none;background:var(--si-cell);border:1px solid var(--si-cardbd);border-radius:20px;',
  '  box-shadow:var(--si-cardsh);transition:transform .5s cubic-bezier(.22,1,.36,1),border-color .35s ease,box-shadow .5s cubic-bezier(.22,1,.36,1)}',
  '.si-card::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;background:var(--si-sheen);opacity:0;transition:opacity .45s cubic-bezier(.22,1,.36,1)}',
  '.si-card:hover::before,.si-card.on::before{opacity:1}',
  '.si-card:hover{transform:translateY(-4px);border-color:var(--si-cardbd-h);box-shadow:var(--si-cardsh-h)}',
  '.si-card.on{border-color:var(--si-acc);box-shadow:var(--si-cardsh-on)}',
  '.si-card:focus-visible{outline:2px solid #e8c47e;outline-offset:3px}',
  '@media (prefers-reduced-motion:reduce){.si-card,.si-card:hover{transition:none;transform:none}}',
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
  '.si-ph{flex:none;position:relative;width:84px;width:clamp(68px,20cqi,96px);aspect-ratio:4/3;border-radius:12px;overflow:hidden;display:grid;place-items:center;',
  '  background:radial-gradient(120% 120% at 18% 8%,rgba(201,169,110,.22),rgba(201,169,110,.05) 58%,rgba(255,255,255,.02));',
  '  box-shadow:inset 0 0 0 1px rgba(201,169,110,.2);color:var(--si-acc2);font:800 15px var(--nn-font-label);letter-spacing:.12em}',
  '.si-ph i{font-style:normal;opacity:.85}',
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
  '.si-chips{display:flex;flex-wrap:wrap;gap:4px 12px}',
  '.si-chip{display:inline-flex;align-items:baseline;gap:6px;font:500 13px var(--nn-font);color:var(--si-ink3);font-variant-numeric:tabular-nums;white-space:nowrap}',
  '.si-chip b{font-weight:800;color:var(--si-ink);letter-spacing:.01em}',
  '.si-pc{font-style:normal;font-size:12px;color:var(--si-ink3);margin-left:-2px}',
  '.si-chip em,.sid-chg em{font-style:normal;font-weight:700}',
  '.si-up{color:var(--si-up)}.si-dn{color:var(--si-dn)}.si-new{color:var(--si-acc2)}.si-eq{color:var(--si-ink3);font-weight:500!important}',
  '.si-meta{font:500 12px/1.4 var(--nn-font);color:var(--si-ink3);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.si-meta .si-old{color:var(--si-ink2)}',
  /* 상세 — 카드가 있는 줄 바로 아래 */
  /* 넓은 화면: 표 안의 한 줄(칸 선을 그대로 잇는다) — 위쪽에 금색 실선 */
  /* 2026-11-26: 카드처럼 떨어진 둥근 판 — 안쪽 여백 · 칸 사이를 넉넉하게(회장님: 상세 안이 촘촘해 답답하다) */
  '.si-detail{position:relative;grid-column:1/-1;margin:0;border-radius:22px;border:1px solid var(--si-detbd);box-shadow:var(--si-detsh);',
  '  background:var(--si-panel);padding:clamp(22px,2.3vw,34px) clamp(20px,2.6vw,38px) clamp(18px,1.9vw,26px)}',
  '.si-detail.anim{animation:siIn .32s cubic-bezier(.22,1,.36,1)}',
  '@keyframes siIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}',
  /* 머리 — 사진 · 큰 이름 · 소개 · 닫기 */
  '.sid-hd{position:relative;display:flex;gap:clamp(18px,2vw,28px);align-items:flex-start;padding-right:44px}',
  '.si-ph.sid-ph{width:clamp(92px,8.4vw,124px);border-radius:12px;font-size:15px}',
  /* 사진이 없을 때 상세의 사진 자리 = [＋ 사진] 단추 */
  'button.sid-addph{cursor:pointer;border:0;padding:0;font-family:var(--nn-font-label);align-content:center;gap:6px;transition:box-shadow .2s ease}',
  'button.sid-addph span{font:700 11px var(--nn-font);letter-spacing:0;color:var(--si-ink3);transition:color .2s ease}',
  'button.sid-addph:hover,button.sid-addph:focus-visible{box-shadow:inset 0 0 0 1px var(--si-acc);outline:none}',
  'button.sid-addph:hover span,button.sid-addph:focus-visible span{color:var(--si-acc2)}',
  '.sid-id{flex:1;min-width:0}',
  '.sid-en{font:800 clamp(1.8rem,2.7vw,2.6rem)/1.04 var(--nn-font);letter-spacing:-.03em;color:var(--si-name);text-shadow:var(--si-name-sh)}',
  '.sid-sub{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px;font:500 13px/1.5 var(--nn-font);color:var(--si-ink2);margin-top:10px}',
  '.sid-tag{display:inline-block;padding:1px 8px;border-radius:999px;border:1px solid var(--si-acc);font-size:12px;font-weight:700;color:var(--si-acc2)}',
  '.sid-tip{font-size:12.5px;color:var(--si-ink3)}',
  '.sid-kd{font:400 13.5px/1.75 var(--nn-font);color:var(--si-ink2);margin-top:12px;max-width:860px;word-break:keep-all}',
  '.sid-x{position:absolute;top:-4px;right:-6px;width:34px;height:34px;border-radius:9px;cursor:pointer;display:grid;place-items:center;font-size:15px;line-height:1;',
  '  color:var(--si-ink2);background:transparent;border:1px solid var(--si-line);transition:background-color .15s,color .15s}',
  '.sid-x:hover{color:var(--si-ink);background:var(--si-chip);border-color:var(--si-acc)}',
  /* 숫자를 말로 — 다섯 칸 */
  '.sid-tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:26px 0 18px}',
  '.sid-tile{display:flex;flex-direction:column;gap:4px;min-width:0;padding:14px 16px 15px;border-radius:14px;background:var(--si-chip);border:1px solid var(--si-line)}',
  '.sid-tile .k{font:600 12px var(--nn-font);color:var(--si-ink3)}',
  '.sid-tile .v{font:800 17px/1.3 var(--nn-font);color:var(--si-ink);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.sid-tile .v em{font-style:normal;font-weight:600;font-size:12.5px;color:var(--si-ink2);margin-left:4px}',
  '.sid-tile .v em.si-old{color:var(--si-dn)}',
  '.sid-tile .s{font:500 12px/1.45 var(--nn-font);color:var(--si-ink3)}',
  '.sid-tile .s .fx{opacity:.8}',
  /* 이번 분기 한눈에 */
  '.sid-qs{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 24px;margin:4px 0 6px;font:500 13px/1.6 var(--nn-font);color:var(--si-ink2)}',
  '.sid-qs-h{font:700 12px var(--nn-font);color:var(--si-ink3);margin-right:2px}',
  '.sid-q b{font-weight:800;margin-right:4px}',
  '.sid-q i{font-style:normal;color:var(--si-ink3)}',
  '.sid-q.new b{color:var(--si-acc2)}.sid-q.up b{color:var(--si-up)}.sid-q.dn b{color:var(--si-dn)}.sid-q.sold b{color:var(--si-ink2)}',
  '.sid-note{margin:18px 0 6px;padding:13px 16px;border-radius:12px;background:var(--si-chip);border:1px dashed var(--si-line);font:500 13px/1.6 var(--nn-font);color:var(--si-ink2)}',
  '.sid-lbl{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px 14px;margin:28px 0 10px;font:700 11px var(--nn-font-label);letter-spacing:.26em;color:var(--si-acc2)}',
  '.sid-lbl span{font:500 12px/1.5 var(--nn-font);letter-spacing:0;color:var(--si-ink3)}',
  '.sid-lbl span b{color:var(--si-ink2);font-weight:700}',
  /* 보유 종목 — 열마다 위에서 아래로 순위 */
  '.sid-rows{display:grid;grid-auto-flow:column;column-gap:44px}',
  '.sid-row{display:grid;grid-template-columns:22px 64px minmax(0,1fr) 52px 70px;align-items:center;gap:12px;padding:10px 6px;margin:0 -6px;border-radius:8px;border-bottom:1px solid var(--si-line)}',
  '.sid-rk{font:700 11px var(--nn-font-label);color:var(--si-ink3);font-variant-numeric:tabular-nums}',
  '.sid-tk{font:800 13px var(--nn-font);color:var(--si-ink);background:none;border:0;padding:0;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  'button.sid-tk:hover{color:var(--si-acc2);text-decoration:underline}',
  '.sid-tk.nolink{cursor:default;font-weight:700}',
  '.sid-nm{display:flex;flex-direction:column;gap:6px;min-width:0}',
  '.sid-nm span{font:400 12px var(--nn-font);color:var(--si-ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  /* 순위 막대 — 한 색, 왼쪽(기준선)은 각지고 끝은 4px 둥글게 */
  '.sid-nm i{display:block;height:5px;border-radius:0 4px 4px 0;background:var(--si-acc)}',
  '.sid-pct{font:700 13px var(--nn-font);color:var(--si-ink);text-align:right;font-variant-numeric:tabular-nums}',
  '.sid-chg{font:700 12px var(--nn-font);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}',
  '.sid-morerows{margin-top:16px;cursor:pointer;font:700 12.5px var(--nn-font);padding:6px 12px;border-radius:8px;color:var(--si-acc2);background:transparent;border:1px solid var(--si-acc)}',
  '.sid-empty{padding:16px 0 4px;font:500 13px var(--nn-font);color:var(--si-ink3)}',
  /* 발 — 읽는 법(접어 둠) · 원문 */
  '.sid-foot{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:8px 20px;margin-top:22px;padding-top:16px;border-top:1px solid var(--si-line);font:400 12.5px/1.65 var(--nn-font);color:var(--si-ink3)}',
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
  '.si-detail.tight{padding-top:20px;padding-bottom:16px}',
  '.si-detail.tight .si-ph.sid-ph{width:84px}',
  '.si-detail.tight .sid-en{font-size:clamp(1.6rem,2.2vw,2.1rem)}',
  '.si-detail.tight .sid-kd{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;margin-top:8px}',
  '.si-detail.tight .sid-tiles{margin:18px 0 12px;gap:10px}',
  '.si-detail.tight .sid-tile{padding:10px 14px 11px}',
  '.si-detail.tight .sid-lbl{margin:18px 0 6px}',
  '.si-detail.tight .sid-row{padding:7px 6px}',
  '.si-detail.tight .sid-foot{margin-top:14px;padding-top:12px}',
  '@media (max-width:900px){.sid-tiles{grid-template-columns:repeat(3,minmax(0,1fr))}}',
  '@media (max-width:760px){.sid-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.sid-hd{padding-right:36px}}',
  /* 휴대폰 — 옆으로 넘기는 한 줄 */
  '@media (max-width:699px){',
  '  #siGrid{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;margin:0 -16px;padding:4px 16px 14px;scroll-padding:0 16px}',
  '  #siGrid::-webkit-scrollbar{display:none}',
  '  #siGrid .si-card{flex:0 0 82%;scroll-snap-align:start;padding:20px 18px}',
  '  #siGrid .si-card:hover{transform:none}',
  '  .si-detail{margin-top:4px;padding:20px 16px 16px;border-radius:18px}',
  '  .sid-hd{display:grid;grid-template-columns:76px minmax(0,1fr);column-gap:12px;row-gap:3px;align-items:center}',
  '  .sid-hd .si-ph.sid-ph{grid-row:1/span 2;width:76px}',
  '  .sid-id{display:contents}',
  '  .sid-en,.sid-sub{grid-column:2}',
  '  .sid-sub{margin-top:0}',
  '  .sid-kd{grid-column:1/-1;margin:8px -40px 0 0}',
  '  .sid-tile .v{white-space:normal}',
  '  .sid-row{grid-template-columns:20px 58px minmax(0,1fr) 46px 60px;gap:8px;padding:9px 4px;margin:0 -4px}',
  '  .sid-en{font-size:clamp(1.6rem,8vw,2.2rem)}',
  '  .si-ph.sid-ph{width:84px}',
  '  .sid-tile .v{font-size:15px}',
  '}',
  '@media (prefers-reduced-motion:reduce){.si-detail.anim{animation:none}.si-spin,#siRefresh.spin{animation:none}}',
  /* 상세의 종목 줄 — 줄 전체가 '기업 한 장' 단추 */
  '.sid-row[data-co-i]{cursor:pointer;transition:background-color .15s}',
  '.sid-row[data-co-i]:hover,.sid-row.co-on{background:linear-gradient(90deg,rgba(201,169,110,.1),rgba(201,169,110,.02))}',
  '.sid-row.co-on .sid-tk{color:var(--si-acc2)}',
  'button.sid-tk.nolink{cursor:pointer;color:var(--si-ink2)}',
  '.sid-sold{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;text-decoration:underline;text-decoration-color:var(--si-line);text-underline-offset:3px}',
  '.sid-sold:hover{color:var(--si-ink);text-decoration-color:var(--si-acc)}',
  /* 기업 한 장 (티커를 누르면 뜨는 작은 창) — 화면에 붙어 뜬다(body 아래). 휴대폰은 아래에서 올라오는 시트 */
  /* ⚠ nn-style.css 의 'body > div { overflow-y:visible; height:auto; max-height:none } !important' 패치가 body 바로 아래 div 에 걸린다 — 높이 · 넘김은 !important 로 */
  '#coPop{position:fixed;left:0;top:0;z-index:2850000;width:min(440px,calc(100vw - 24px));max-height:calc(100vh - 90px)!important;overflow-y:auto!important;overscroll-behavior:contain;box-sizing:border-box;',
  '  --co-bg:#13120f;--co-ink:#f0ede6;--co-ink2:rgba(240,237,230,.76);--co-ink3:rgba(240,237,230,.52);--co-line:rgba(255,255,255,.1);--co-acc:#e8c47e;',
  '  --co-up:#7ee7a6;--co-dn:#ff9d8f;--co-chip:rgba(255,255,255,.045);--co-sk:rgba(255,255,255,.07);--co-sk2:rgba(255,255,255,.15);',
  '  background:var(--co-bg);color:var(--co-ink);border:1px solid rgba(201,169,110,.4);border-radius:14px;outline:none;',
  '  box-shadow:0 26px 60px -18px rgba(0,0,0,.8),0 2px 10px rgba(0,0,0,.35);font:400 13px/1.6 var(--nn-font);padding:14px 16px 12px;',
  '  opacity:0;transform:translateY(6px);transition:opacity .16s ease,transform .22s cubic-bezier(.22,1,.36,1)}',
  '#coPop.show{opacity:1;transform:none}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) #coPop{--co-bg:#fffdf8;--co-ink:#14120f;--co-ink2:#4f493e;--co-ink3:#7d7566;--co-line:rgba(20,18,15,.1);--co-acc:#8a6a24;',
  '  --co-up:#1e7a4b;--co-dn:#b23a2c;--co-chip:rgba(20,18,15,.035);--co-sk:rgba(20,18,15,.06);--co-sk2:rgba(20,18,15,.13);border-color:rgba(138,106,36,.38);',
  '  box-shadow:0 26px 60px -24px rgba(20,18,15,.38),0 2px 10px rgba(20,18,15,.08)}',
  '.co-hd{display:flex;gap:10px;align-items:flex-start}',
  '.co-id{flex:1;min-width:0}',
  '.co-t1{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
  '.co-tk{font:800 22px/1.1 var(--nn-font);letter-spacing:.01em;color:var(--co-ink)}',
  '.co-ex{font:700 10.5px/1 var(--nn-font-label);letter-spacing:.14em;color:var(--co-acc);border:1px solid currentColor;border-radius:999px;padding:4px 8px 3px}',
  '.co-pc{font:700 11px/1 var(--nn-font);color:var(--co-dn);border:1px solid currentColor;border-radius:999px;padding:3px 8px}',
  '.co-nm{font:700 15px/1.35 var(--nn-font);margin-top:5px;color:var(--co-ink)}',
  '.co-ko{font:500 12.5px/1.55 var(--nn-font);color:var(--co-ink2);margin-top:2px;word-break:keep-all}',
  '.co-ko b{color:var(--co-ink);font-weight:700}',
  '.co-x{flex:none;width:30px;height:30px;border-radius:8px;border:1px solid var(--co-line);background:transparent;color:var(--co-ink2);cursor:pointer;font-size:13px;line-height:1}',
  '.co-x:hover{color:var(--co-ink);border-color:var(--co-acc)}',
  /* 지금 주가 — 숫자 + 전날 대비 + 30일 흐름(옅은 선 · 끝점만 금색) + 52주 범위(같은 색 길 위의 점) */
  '.co-px{margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--co-chip);border:1px solid var(--co-line)}',
  '.co-p1{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap}',
  '.co-pl{flex:0 0 100%;font:600 11.5px var(--nn-font);color:var(--co-ink3)}',
  '.co-pr{font:800 20px/1.15 var(--nn-font);color:var(--co-ink)}',
  '.co-dl{font:700 12.5px var(--nn-font);color:var(--co-ink2);font-variant-numeric:tabular-nums}.co-dl i{font-style:normal;font-weight:500;color:var(--co-ink3)}',
  '#coPop .up{color:var(--co-up)}#coPop .dn{color:var(--co-dn)}',
  '.co-spw{margin-left:auto;display:inline-flex;align-items:center;gap:6px;color:var(--co-ink3)}',
  '.co-sp{display:block;overflow:visible}.co-sp-d{fill:var(--co-acc);stroke:var(--co-bg);stroke-width:2}',
  '.co-sp-t{font:600 11.5px var(--nn-font);color:var(--co-ink3);font-variant-numeric:tabular-nums;white-space:nowrap}',
  '.co-rg{display:flex;align-items:center;gap:8px;margin-top:9px;font:500 11.5px var(--nn-font);color:var(--co-ink3);font-variant-numeric:tabular-nums}',
  '.co-rg-l{font-weight:700}',
  '.co-rg-t{position:relative;flex:1;min-width:60px;height:4px;border-radius:999px;background:var(--co-sk2)}',
  '.co-rg-t i{position:absolute;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:var(--co-acc);box-shadow:0 0 0 2px var(--co-bg)}',
  /* 무슨 회사인가 */
  '.co-sum{margin-top:12px}',
  '.co-sum p{margin:0;font:400 13px/1.72 var(--nn-font);color:var(--co-ink2);word-break:keep-all;overflow-wrap:break-word}',
  '.co-sum.clip p{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}',
  '.co-src{margin-top:4px;font:500 11.5px var(--nn-font);color:var(--co-ink3)}',
  '.co-src a,.co-ft a{color:var(--co-acc);font-weight:700;text-decoration:none}.co-src a:hover,.co-ft a:hover{text-decoration:underline}',
  '.co-more{background:none;border:0;padding:0;cursor:pointer;color:var(--co-ink2);font:700 11.5px var(--nn-font)}.co-more:hover{color:var(--co-ink)}',
  /* 숫자 — 업종 · 본사 · 설립 · 결산(두 칸씩) + 매출 · 순이익 작은 칸 두 개 */
  '.co-kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px;margin-top:12px;padding-top:10px;border-top:1px solid var(--co-line)}',
  '.co-kv>div{min-width:0;display:flex;flex-direction:column;gap:1px}',
  '.co-kv .k{font:600 11.5px var(--nn-font);color:var(--co-ink3)}',
  '.co-kv b{font:700 12.5px/1.45 var(--nn-font);color:var(--co-ink);overflow-wrap:break-word}',
  '.co-kv i{font:500 11px/1.4 var(--nn-font);font-style:normal;color:var(--co-ink3);overflow-wrap:break-word}',
  '.co-fin{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}',
  '.co-fn{min-width:0;display:flex;flex-direction:column;gap:1px;padding:8px 11px 9px;border-radius:9px;background:var(--co-chip);border:1px solid var(--co-line)}',
  '.co-fn .k{font:600 11.5px var(--nn-font);color:var(--co-ink3)}',
  '.co-fn .v{font:800 17px/1.25 var(--nn-font);color:var(--co-ink);white-space:nowrap}',
  '.co-fn .w{font:500 11.5px var(--nn-font);color:var(--co-ink3)}',
  '.co-fn .d em{font:700 11.5px var(--nn-font);font-style:normal;color:var(--co-ink2)}',
  '.co-fy{margin-top:5px;font:500 11px/1.5 var(--nn-font);color:var(--co-ink3)}',
  '.co-loss{font:700 11px var(--nn-font);font-style:normal;color:var(--co-dn);vertical-align:2px}',
  /* 이 투자자 · 함께 담은 투자자 */
  '.co-me{margin-top:12px;padding:10px 12px;border-radius:10px;border:1px solid rgba(201,169,110,.32);background:rgba(201,169,110,.06)}',
  '.co-h{font:700 12px/1.5 var(--nn-font);color:var(--co-acc)}.co-h i{font-style:normal;font-weight:500;color:var(--co-ink3);margin-left:4px}',
  '.co-mv{font:500 12.5px/1.6 var(--nn-font);color:var(--co-ink2);margin-top:3px}.co-mv b{color:var(--co-ink);font-weight:800}.co-mv i{font-style:normal;color:var(--co-ink3)}',
  '.co-new{color:var(--co-acc);font-weight:700}',
  '.co-note{margin-top:8px;font:500 12px/1.55 var(--nn-font);color:var(--co-ink3)}.co-note b{color:var(--co-ink2)}',
  '.co-with{margin-top:10px;display:flex;flex-wrap:wrap;align-items:center;gap:5px 6px}.co-with .co-h{margin-right:2px}',
  '.co-who{cursor:pointer;font:600 12px var(--nn-font);color:var(--co-ink2);background:var(--co-chip);border:1px solid var(--co-line);border-radius:999px;padding:3px 9px}',
  '.co-who b{color:var(--co-ink);margin-left:2px}.co-who i{font-style:normal;color:var(--co-ink3);margin-left:4px;font-size:11px}',
  '.co-who:hover{border-color:var(--co-acc);color:var(--co-ink)}',
  '.co-dim{font:500 12px var(--nn-font);color:var(--co-ink3)}',
  '.co-ft{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-top:12px;padding-top:10px;border-top:1px solid var(--co-line);font:600 12px var(--nn-font)}',
  '.co-btn{margin-left:auto;cursor:pointer;font:700 12px var(--nn-font);padding:6px 10px;border-radius:8px;color:var(--co-ink);background:var(--co-chip);border:1px solid var(--co-line)}',
  '.co-btn:hover{border-color:var(--co-acc)}',
  '.co-lnk{background:none;border:0;padding:0;cursor:pointer;color:var(--co-acc);font:700 12px var(--nn-font);text-decoration:underline}',
  '.co-empty{margin-top:12px;font:500 12.5px/1.6 var(--nn-font);color:var(--co-ink2)}',
  '.co-sk{display:block;height:10px;border-radius:5px;margin:7px 0;background:linear-gradient(90deg,var(--co-sk),var(--co-sk2),var(--co-sk));background-size:200% 100%;animation:coSk 1.1s linear infinite}',
  '@keyframes coSk{to{background-position:-200% 0}}',
  '.co-back{position:fixed;inset:0;z-index:2849999;background:rgba(0,0,0,.45);opacity:0;transition:opacity .2s}',
  '.co-back.show{opacity:1}',
  '#coPop.sheet{left:0!important;top:auto!important;bottom:0;width:100%;max-height:84vh!important;max-height:84dvh!important;border-radius:16px 16px 0 0;border-bottom:0;transform:translateY(24px);',
  '  padding:16px 16px calc(14px + env(safe-area-inset-bottom,0px))}',
  '#coPop.sheet.show{transform:none}',
  '@media (prefers-reduced-motion:reduce){#coPop,.co-back{transition:none}.co-sk{animation:none}}',

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
    /* 상세가 닫히거나 다른 투자자로 바뀌면 기업 한 장도 닫는다 (같은 투자자면 둔다 — 새 줄을 다시 찾아 붙는다) */
    if (co.pop && co.ctx && co.ctx.kind !== 'ext' && (!st.open || !co.ctx.me || co.ctx.me.m.id !== st.open)) coClose();
    var g = $('siGrid'), L = getList();
    var keepScroll = g.scrollLeft;
    var det = $('siDetail'); if (det) det.remove();
    g.innerHTML = L.list.length ? L.list.map(function(it, i){ return cardHTML(full(it), i); }).join('')
      : '<div class="si-status">고른 투자자가 없습니다. <button type="button" data-si="edit">고르기</button></div>';
    g.scrollLeft = keepScroll;
    placeDetail();
    paintStatus();
    if (co.pop){ co.anchor = null; coMark(); coPlace(); }
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
    if (st.open){ fitDetail(); requestAnimationFrame(scrollToDetail); setTimeout(function(){ if (st.open === id) coWarmFor(id); }, 900); }   /* 이 투자자의 종목 정보를 뒤에서 하나씩 */
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
    else if (st.ws === 'old'){ cls = 'warn'; html = 'Worker 를 새 판(v16)으로 바꾸면 최신 분기가 저절로 반영됩니다' + (live ? '' : ' — 지금은 예시 값입니다') + '. <button type="button" data-si="help">바꾸는 법</button>'; }
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
  /* 2026-11-26: 사진이 없는 사람의 상세에서 [＋ 사진] — 고르기 · 편집 창을 열고 그 사람의 '사진 주소' 칸에 바로 커서.
     (사진을 인터넷에서 저절로 찾아 붙이지는 않는다 — 회장님이 고른 사진의 주소를 붙여 넣는다. 처음 9명도 그렇게 넣은 사진이다) */
  function editPhoto(id){
    if (!id || !byId(id)) return;
    ed.editing = id; openEditor();
    setTimeout(function(){
      var bd = $('siEdBd'); if (!bd) return;
      var forms = bd.querySelectorAll('.sie-form'), f = null;
      for (var i = 0; i < forms.length; i++) if (forms[i].getAttribute('data-form') === id){ f = forms[i]; break; }
      var inp = f && f.querySelector('.sie-in[data-f="img"]'); if (!inp) return;
      try { inp.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch(e) {}
      try { inp.focus({ preventScroll: true }); } catch(e) { inp.focus(); }
    }, 90);
  }
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
      ed.probe = { v: j && j.v, sec: !!(j && j.endpoints && j.endpoints.indexOf('/sec13f') >= 0), co: !!(j && j.endpoints && j.endpoints.indexOf('/company') >= 0), ua: !!(j && j.secUa) };
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
    h += '<label>사진 주소 <span style="font-weight:400;color:var(--nn-ink-3)">(이미지 링크를 붙여 넣으세요 · 비우면 이니셜)</span></label><input class="sie-in" data-f="img" value="' + esc(it.img || (m.dir ? '' : m.img)) + '" placeholder="https://…" maxlength="400">';
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
      + (w ? (p.loading ? '<span class="sie-chk">확인 중…</span>' : p.fail ? chk(false, '', 'Worker 가 답하지 않음') : chk(p.sec, 'v' + (p.v || '?') + ' · 13F 지원', 'v' + (p.v || '?') + ' — 새 판(v16) 필요') + (p.sec ? chk(p.co, '기업 정보 지원', '기업 정보는 v16 부터') : '') + (p.sec ? chk(p.ua, 'SEC_UA 설정됨', 'SEC_UA 없음') : '')) : '')
      + '</div>';
    s += '<div class="sie-note">SUPER INVESTORS 는 내 Cloudflare Worker 를 거쳐 SEC EDGAR 의 공식 13F 공시를 읽습니다. 처음 한 번만 해 두면 매 분기 저절로 바뀝니다. 상세에서 티커를 누르면 뜨는 기업 정보의 업종 · 매출 · 순이익도 같은 Worker(v16)가 SEC 에서 가져옵니다.</div><ol>'
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

  /* ══════════ 기업 한 장 — 상세의 티커를 누르면 (2026-11-25) ══════════
     회장님 요청: "티커를 누르면 간단한 기업 정보가 뜨게 · 분기마다 없어지고 생기는 티커도 그때그때 알아서 찾게"
     미리 적어 둔 회사 목록이 없다. 누를 때(마우스를 올릴 때 · 상세를 열 때 뒤에서 차례로) 찾아서 이 기기에 14일 기억한다(nn_co_v1).
       ① 무슨 회사인가 — 위키데이터(티커 → 항목: 한국어 이름 · 한 줄 설명 · 설립 연도) → 한국어 위키백과 요약(없으면 영어)
          위키데이터에 그 티커가 없으면 회사 이름으로 위키백과를 검색한다 (Worker 없이도 된다 · 브라우저가 바로 묻는다)
       ② 숫자 — 내 Worker /company (v16 · SEC): 업종 · 본사 · 최근 회계연도 매출 · 순이익(전년 대비) · 예전 이름
                내 Worker /quote (원래 있던 것): 지금 주가 · 전날 대비 · 52주 범위 · 최근 30거래일 흐름
       ③ 이 투자자의 보유(비중 · 금액 · 주식 수 · 지난 분기 대비) · 내 목록의 다른 투자자 중 함께 담은 사람
     티커가 없는 줄(OpenFIGI 가 못 찾은 종목)은 13F 의 회사 이름으로 SEC 에서 찾아 티커를 알아낸다. */
  var CO_KEY = 'nn_co_v1', CO_TTL = 14 * 864e5, CO_MISS = 3 * 864e5, CO_MAX = 120;
  var co = { mem: null, fly: {}, qt: {}, wk: '', pop: null, back: null, anchor: null, ctx: null, q: null, d: null, tok: 0, more: false,
             hoverRow: null, hoverT: 0, warmQ: [], warmOn: false, raf: 0 };
  var SIC2 = { '01':'농작물 재배','02':'축산','07':'농업 서비스','08':'임업','09':'어업','10':'금속 광업','12':'석탄','13':'석유 · 가스 생산','14':'비금속 광물',
    '15':'건설 · 주택','16':'토목 건설','17':'전문 건설','20':'식품 · 음료','21':'담배','22':'섬유','23':'의류','24':'목재','25':'가구','26':'종이 · 포장','27':'출판 · 인쇄',
    '28':'화학 · 의약품','29':'석유 정제','30':'고무 · 플라스틱','31':'가죽 · 신발','32':'유리 · 시멘트','33':'철강 · 금속','34':'금속 가공','35':'기계 · 컴퓨터 장비',
    '36':'전자 · 전기 장비','37':'자동차 · 항공 · 운송 장비','38':'정밀 · 의료 기기','39':'기타 제조','40':'철도','41':'대중교통','42':'트럭 운송 · 물류','44':'해운',
    '45':'항공 운송','46':'파이프라인','47':'운송 서비스 · 여행','48':'통신 · 방송','49':'전기 · 가스 · 수도','50':'도매(내구재)','51':'도매(소비재)','52':'건자재 소매',
    '53':'종합 소매 · 할인점','54':'식료품점','55':'자동차 판매 · 주유소','56':'의류 소매','57':'가구 · 가전 소매','58':'음식점 · 외식','59':'소매',
    '60':'은행','61':'대출 · 카드 금융','62':'증권 · 자산운용','63':'보험','64':'보험 중개','65':'부동산','67':'지주 · 투자 회사','70':'호텔 · 숙박','72':'개인 서비스',
    '73':'소프트웨어 · 기업 서비스','75':'자동차 정비 · 렌털','76':'수리 서비스','78':'영화 · 영상','79':'레저 · 엔터테인먼트','80':'의료 서비스','81':'법률 서비스',
    '82':'교육','83':'사회 서비스','86':'단체','87':'연구 · 엔지니어링 · 컨설팅','89':'기타 서비스','99':'분류 없음' };
  var SIC4 = { '1311':'원유 · 천연가스 생산','1381':'석유 시추','1389':'유전 서비스','2080':'음료','2082':'맥주','2086':'음료(탄산 · 생수)','2111':'담배',
    '2834':'의약품','2835':'진단 시약','2836':'바이오 의약품','2911':'석유 정제','3312':'철강','3334':'알루미늄','3523':'농기계','3531':'건설 기계',
    '3570':'컴퓨터 · 사무기기','3571':'컴퓨터 · 전자기기','3572':'저장 장치','3576':'네트워크 장비','3577':'컴퓨터 주변기기','3661':'통신 장비','3663':'방송 · 무선 통신 장비',
    '3669':'통신 장비','3672':'인쇄 회로 기판','3674':'반도체','3679':'전자 부품','3711':'자동차','3713':'트럭 · 버스','3714':'자동차 부품','3721':'항공기',
    '3724':'항공기 엔진','3728':'항공기 부품','3760':'미사일 · 우주','3812':'방산 · 항법 장비','3826':'분석 기기','3841':'의료 기기','3842':'의료 · 정형 용품',
    '3845':'전자 의료기기','4011':'철도','4512':'항공사','4812':'무선 통신','4813':'통신 서비스','4833':'TV 방송','4841':'케이블 · 유료 방송','4899':'통신 서비스',
    '4911':'전력','4922':'천연가스 수송','4923':'가스 수송 · 배급','4924':'가스 배급','4931':'전력 · 가스','4932':'가스 · 전력','4941':'수도','4953':'폐기물 처리',
    '5045':'컴퓨터 도매','5047':'의료 용품 도매','5122':'의약품 도매','5331':'할인점','5399':'종합 소매','5411':'슈퍼마켓 · 식료품점','5412':'편의점','5500':'자동차 판매',
    '5531':'자동차 부품 소매','5651':'의류 · 신발 소매','5700':'가구 · 가전 소매','5731':'가전 · 전자제품 소매','5810':'음식점 · 외식','5812':'음식점 · 외식','5900':'소매',
    '5912':'약국','5940':'스포츠 · 취미 용품 소매','5961':'온라인 · 통신 판매','5990':'소매','6021':'은행(국법 은행)','6022':'은행(주 은행)','6029':'상업 은행',
    '6035':'저축은행','6036':'저축은행','6099':'금융 서비스','6141':'소비자 대출','6153':'신용카드 · 단기 금융','6159':'기업 대출','6162':'주택담보 대출','6172':'리스 금융',
    '6189':'자산 유동화','6199':'금융 서비스','6200':'증권 · 거래소','6211':'증권 · 투자은행','6221':'선물 중개','6282':'투자 자문 · 자산운용','6311':'생명 보험',
    '6321':'건강 · 상해 보험','6324':'건강 보험','6331':'손해 보험','6351':'보증 보험','6361':'권원 보험','6399':'보험','6411':'보험 중개','6500':'부동산','6510':'부동산 운영',
    '6519':'부동산 임대','6531':'부동산 중개','6770':'기업인수목적회사(SPAC)','6792':'석유 · 광물 로열티','6795':'광물 로열티','6798':'리츠(부동산투자신탁)',
    '7011':'호텔 · 카지노','7370':'인터넷 · IT 서비스','7371':'IT 서비스 · 개발','7372':'소프트웨어','7373':'시스템 통합','7374':'데이터 처리 · 결제','7389':'기업 서비스',
    '7812':'영화 · 영상 제작','7822':'영상 배급','7990':'레저 · 오락','7997':'회원제 스포츠 · 레저','8000':'의료 서비스','8011':'의원','8050':'요양 시설','8060':'병원',
    '8062':'병원','8071':'의료 검사','8090':'의료 서비스','8093':'외래 진료','8200':'교육','8711':'엔지니어링','8731':'연구 개발','8741':'경영 서비스','8742':'경영 컨설팅' };
  var USST = { AL:'앨라배마',AK:'알래스카',AZ:'애리조나',AR:'아칸소',CA:'캘리포니아',CO:'콜로라도',CT:'코네티컷',DE:'델라웨어',DC:'워싱턴 D.C.',FL:'플로리다',GA:'조지아',
    HI:'하와이',ID:'아이다호',IL:'일리노이',IN:'인디애나',IA:'아이오와',KS:'캔자스',KY:'켄터키',LA:'루이지애나',ME:'메인',MD:'메릴랜드',MA:'매사추세츠',MI:'미시간',
    MN:'미네소타',MS:'미시시피',MO:'미주리',MT:'몬태나',NE:'네브래스카',NV:'네바다',NH:'뉴햄프셔',NJ:'뉴저지',NM:'뉴멕시코',NY:'뉴욕',NC:'노스캐롤라이나',
    ND:'노스다코타',OH:'오하이오',OK:'오클라호마',OR:'오리건',PA:'펜실베이니아',RI:'로드아일랜드',SC:'사우스캐롤라이나',SD:'사우스다코타',TN:'테네시',TX:'텍사스',
    UT:'유타',VT:'버몬트',VA:'버지니아',WA:'워싱턴',WV:'웨스트버지니아',WI:'위스콘신',WY:'와이오밍',PR:'푸에르토리코' };
  var CTRY = { 'CAYMAN ISLANDS':'케이맨 제도','HONG KONG':'홍콩','CHINA':'중국','UNITED KINGDOM':'영국','CANADA':'캐나다','NETHERLANDS':'네덜란드','IRELAND':'아일랜드',
    'ISRAEL':'이스라엘','JAPAN':'일본','KOREA, REPUBLIC OF':'한국','TAIWAN':'대만','TAIWAN, PROVINCE OF CHINA':'대만','SWITZERLAND':'스위스','GERMANY':'독일','FRANCE':'프랑스',
    'BERMUDA':'버뮤다','LUXEMBOURG':'룩셈부르크','SINGAPORE':'싱가포르','BRAZIL':'브라질','ARGENTINA':'아르헨티나','MEXICO':'멕시코','INDIA':'인도','AUSTRALIA':'호주',
    'JERSEY':'저지섬','DENMARK':'덴마크','SWEDEN':'스웨덴','NORWAY':'노르웨이','SPAIN':'스페인','ITALY':'이탈리아','BELGIUM':'벨기에','URUGUAY':'우루과이','CHILE':'칠레',
    'COLOMBIA':'콜롬비아','PERU':'페루','SOUTH AFRICA':'남아프리카공화국','GREECE':'그리스','FINLAND':'핀란드','VIRGIN ISLANDS, BRITISH':'영국령 버진아일랜드',
    'BAHAMAS':'바하마','PANAMA':'파나마','MONACO':'모나코','CYPRUS':'키프로스','INDONESIA':'인도네시아','PHILIPPINES':'필리핀','THAILAND':'태국','VIETNAM':'베트남',
    'KAZAKHSTAN':'카자흐스탄','RUSSIAN FEDERATION':'러시아','TURKEY':'튀르키예','UNITED ARAB EMIRATES':'아랍에미리트','SAUDI ARABIA':'사우디아라비아' };
  var WD_US = { 'http://www.wikidata.org/entity/Q13677': 1, 'http://www.wikidata.org/entity/Q82059': 1 };   /* 뉴욕증권거래소 · 나스닥 */
  var BIZ = /\b(company|companies|corporation|conglomerate|bank|banking|insurer|insurance|manufacturer|retailer|restaurant|chain|airline|operator|provider|developer|producer|holding|firm|brand|maker|trust|fund|etf|exchange-traded|reit|investment|semiconductor|pharmaceutical|biotechnology|technology|software|media|telecommunications|utility|railroad|automaker|subsidiary|multinational|enterprise|business|services|platform|marketplace|supplier|distributor|group)\b/i;
  var NOTBIZ = /\b(person|politician|actor|actress|singer|footballer|city|town|village|river|mountain|album|song|film|novel|species|genus|character|television series|video game|surname|given name)\b/i;
  var NM_STOP = { inc:1, corp:1, corporation:1, co:1, company:1, ltd:1, limited:1, plc:1, holdings:1, holding:1, hldgs:1, group:1, the:1, cl:1, class:1, 'new':1, del:1, de:1,
    com:1, sa:1, nv:1, ag:1, se:1, llc:1, lp:1, trust:1, tr:1, etf:1, shs:1, adr:1, ads:1, sponsored:1, of:1, and:1, a:1, b:1, c:1 };

  function coTk(t){ return String(t || '').trim().toUpperCase().replace(/\//g, '.'); }
  function nmTokens(s){ return String(s || '').toLowerCase().replace(/['’]/g, '').replace(/\/[a-z]{2,3}\/?/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(function(w){ return w && !NM_STOP[w]; }); }
  function coK(q){ return q.tk ? coTk(q.tk) : 'n:' + nmTokens(q.name).join(' '); }
  function properName(n){
    n = String(n || '').replace(/\s*\/[A-Za-z]{2,3}\/?\s*$/, '').replace(/\s+/g, ' ').trim();
    if (/[a-z]/.test(n)) return n;
    return nameCase(n).replace(/(\s)(Of|And|The|De|For|In|On)\b/g, function(a, sp, w){ return sp + w.toLowerCase(); });
  }
  function sicKo(code){ code = String(code || ''); return SIC4[code] || SIC2[code.slice(0, 2)] || ''; }
  function locKo(city, region, desc){
    var c = city ? properName(String(city)) : '';
    if (USST[region]) return (c ? c + ', ' : '') + USST[region] + ' · 미국';
    var d = String(desc || '').toUpperCase(), k = CTRY[d] || (d ? properName(d) : '');
    return [c, k].filter(Boolean).join(' · ');
  }
  function fyeKo(f){ var m = /^(\d{2})(\d{2})$/.exec(f || ''); return m ? (+m[1]) + '월 결산' : ''; }
  function krCount(n){
    n = Math.round(+n || 0);
    if (n >= 1e8){ var e = Math.floor(n / 1e8), r = Math.round((n % 1e8) / 1e4); return e + '억' + (r ? ' ' + r.toLocaleString('ko-KR') + '만' : ''); }
    if (n >= 1e4) return Math.round(n / 1e4).toLocaleString('ko-KR') + '만';
    return n.toLocaleString('ko-KR');
  }
  function fmtPrice(v){ v = +v || 0; return v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v.toFixed(2); }
  function bigTxt(v, unit){
    if (unit === 'USD') return (v < 0 ? '−' : '') + money(Math.abs(v));
    var a = Math.abs(v), s = a >= 1e12 ? (a / 1e12).toFixed(2) + 'T' : a >= 1e9 ? (a / 1e9).toFixed(1) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(1) + 'M' : Math.round(a).toLocaleString('en-US');
    return (v < 0 ? '−' : '') + esc(unit) + ' ' + s;
  }

  /* ── 이 기기에 기억 ── */
  function coAll(){ if (!co.mem){ co.mem = jget(CO_KEY, {}); if (!co.mem || typeof co.mem !== 'object') co.mem = {}; } return co.mem; }
  function coSave(){
    var m = coAll(), byAge = function(){ return Object.keys(m).sort(function(a, b){ return (m[a].at || 0) - (m[b].at || 0); }); };
    var ks = byAge();
    if (ks.length > CO_MAX) ks.slice(0, ks.length - CO_MAX).forEach(function(k){ delete m[k]; });
    if (!lsSet(CO_KEY, JSON.stringify(m))){ ks = byAge(); ks.slice(0, Math.ceil(ks.length / 2)).forEach(function(k){ delete m[k]; }); lsSet(CO_KEY, JSON.stringify(m)); }
  }
  function coPeek(k){ var e = coAll()[k]; return e && Date.now() - e.at < (e.miss ? CO_MISS : CO_TTL) ? e : null; }
  function coPut(k, d, miss){ coAll()[k] = { at: Date.now(), d: d, miss: miss ? 1 : 0 }; coSave(); }

  function getJ(url, ms){
    var ctl = null; try { ctl = new AbortController(); } catch(e) {}
    var timer = setTimeout(function(){ try { if (ctl) ctl.abort(); } catch(e) {} }, ms || 9000);
    return fetch(url, ctl ? { signal: ctl.signal } : undefined).then(function(r){
      return r.json().then(function(j){ return { s: r.status, j: j }; }, function(){ return { s: r.status, j: null }; });
    }, function(){ return { s: 0, j: null }; }).then(function(x){ clearTimeout(timer); return x; });
  }

  /* ② SEC — 내 Worker /company (v16) */
  function secPart(q){
    var k = 'S:' + coK(q), hit = coPeek(k);
    if (hit) return Promise.resolve(hit.d);
    var w = W();
    if (!w) return Promise.resolve({ none: 'noworker' });
    if (co.wk === 'old') return Promise.resolve({ none: 'old' });
    if (co.fly[k]) return co.fly[k];
    var u = w + '/company?' + [q.tk ? 'tk=' + encodeURIComponent(coTk(q.tk)) : '', q.name ? 'name=' + encodeURIComponent(String(q.name).slice(0, 100)) : ''].filter(Boolean).join('&');
    return (co.fly[k] = getJ(u, 20000).then(function(x){
      delete co.fly[k];
      var j = x.j;
      if (x.s === 404 && j && j.error === 'unknown path'){ co.wk = 'old'; return { none: 'old' }; }
      if (j && j.ok){ co.wk = 'ok'; coPut(k, j); return j; }
      if (j && j.error === 'not_found'){ coPut(k, { none: 'not_found' }, true); return { none: 'not_found' }; }
      return { none: (j && j.error) || 'net' };   /* 막힘 · 네트워크 — 기억하지 않는다(다음에 다시 묻는다) */
    }));
  }
  /* 주가 — 내 Worker /quote (원래 있던 것 · 5분 기억) */
  function quotePart(tk){
    tk = coTk(tk); var w = W();
    if (!tk || !w) return Promise.resolve(null);
    var c = co.qt[tk]; if (c && Date.now() - c.at < 5 * 60e3) return Promise.resolve(c.d);
    var ytk = tk.replace(/\./g, '-');   /* 야후는 BRK-B 로 적는다 */
    return getJ(w + '/quote?us=' + encodeURIComponent(ytk), 12000).then(function(x){
      var o = x.j && x.j.us && (x.j.us[ytk] || x.j.us[tk]);
      var d = o && typeof o.price === 'number' && isFinite(o.price) ? o : null;
      if (x.j) co.qt[tk] = { at: Date.now(), d: d };
      return d;
    });
  }
  /* ① 위키데이터 · 위키백과 */
  function wikiTitle(url){ var m = /\/wiki\/(.+)$/.exec(url || ''); try { return m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : ''; } catch(e) { return ''; } }
  function wpSum(lang, title){
    if (!title) return Promise.resolve(null);
    var path = encodeURIComponent(title.replace(/ /g, '_'));
    return getJ('https://' + lang + '.wikipedia.org/api/rest_v1/page/summary/' + path, 8000).then(function(x){
      var j = x.j; if (!j || j.type === 'disambiguation' || !j.extract) return null;
      return { lang: lang, title: j.title || title, text: String(j.extract).replace(/\s+/g, ' ').trim().slice(0, 900),
               url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || ('https://' + lang + '.wikipedia.org/wiki/' + path),
               desc: j.description || '', qid: j.wikibase_item || '' };
    });
  }
  function wdByTicker(tk){
    var seen = {}, vs = [tk, tk.replace(/\./g, '-'), tk.replace(/-/g, '.'), tk.replace(/[.\-]/g, ' ')].filter(function(v){ if (seen[v]) return false; seen[v] = 1; return true; });
    var sp = 'SELECT ?i ?ex ?koL ?enL ?koD ?enD ?kw ?ew ?inc WHERE { VALUES ?t { ' + vs.map(function(v){ return '"' + v.replace(/["\\]/g, '') + '"'; }).join(' ') + ' } '
      + '?s pq:P249 ?t . ?i p:P414 ?s . ?s ps:P414 ?ex . '
      + 'OPTIONAL { ?i rdfs:label ?koL . FILTER(LANG(?koL) = "ko") } OPTIONAL { ?i rdfs:label ?enL . FILTER(LANG(?enL) = "en") } '
      + 'OPTIONAL { ?i schema:description ?koD . FILTER(LANG(?koD) = "ko") } OPTIONAL { ?i schema:description ?enD . FILTER(LANG(?enD) = "en") } '
      + 'OPTIONAL { ?kw schema:about ?i ; schema:isPartOf <https://ko.wikipedia.org/> } OPTIONAL { ?ew schema:about ?i ; schema:isPartOf <https://en.wikipedia.org/> } '
      + 'OPTIONAL { ?i wdt:P571 ?inc } } LIMIT 24';
    return getJ('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sp), 9000).then(function(x){
      if (!x.j) return 'err';
      var rows = (x.j.results && x.j.results.bindings) || [], by = {}, order = [];
      rows.forEach(function(b){
        var id = b.i && b.i.value; if (!id) return;
        var e = by[id]; if (!e){ e = by[id] = { id: id, us: 0 }; order.push(id); }
        if (b.ex && WD_US[b.ex.value]) e.us = 1;
        ['koL', 'enL', 'koD', 'enD', 'kw', 'ew'].forEach(function(f){ if (b[f] && b[f].value && !e[f]) e[f] = b[f].value; });
        if (b.inc){ var y = parseInt(String(b.inc.value).replace(/^\+/, ''), 10); if (y > 1000 && (!e.year || y < e.year)) e.year = y; }
      });
      var best = null, bs = -1;
      order.forEach(function(id){ var e = by[id], sc = e.us * 4 + (e.ew ? 2 : 0) + (e.kw ? 1 : 0); if (sc > bs){ best = e; bs = sc; } });
      if (!best) return null;
      var ko = wikiTitle(best.kw), en = wikiTitle(best.ew);
      return wpSum(ko ? 'ko' : 'en', ko || en).then(function(s){ return !s && ko && en ? wpSum('en', en) : s; }).then(function(s){
        return { qid: String(best.id).replace(/^.*\//, ''), koL: best.koL || '', enL: best.enL || '', koD: best.koD || '', enD: best.enD || '', year: best.year || 0, sum: s, src: 'wd' };
      });
    });
  }
  function wpByName(nm){
    var qs = properName(nm).replace(/\b(Inc|Corp|Co|Ltd|Plc|Hldgs|Holdings|Com|New|Del|Cl [A-Z])\b\.?/gi, ' ').replace(/\s+/g, ' ').trim();
    var words = nmTokens(qs); if (!words.length) return Promise.resolve(null);
    return getJ('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(qs) + '&srlimit=5&srnamespace=0&srprop=&format=json&origin=*', 8000).then(function(x){
      if (!x.j) return 'err';
      var arr = (x.j.query && x.j.query.search) || [];
      var pick = arr.map(function(a){ return a.title; }).filter(function(t){
        var tw = nmTokens(t); return tw.length && (tw[0] === words[0] || (words[0].length >= 2 && tw[0].indexOf(words[0]) === 0) || (tw[0].length >= 3 && words[0].indexOf(tw[0]) === 0));
      })[0];
      if (!pick) return null;
      return wpSum('en', pick).then(function(s){
        if (!s || NOTBIZ.test(s.desc) || !(BIZ.test(s.desc) || BIZ.test(s.text.slice(0, 320)))) return null;
        var r = { qid: s.qid, koL: '', enL: s.title, koD: '', enD: s.desc, year: 0, sum: s, src: 'search' };
        if (!s.qid) return r;
        return getJ('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + encodeURIComponent(s.qid) + '&props=labels%7Cdescriptions%7Csitelinks&languages=ko%7Cen&sitefilter=kowiki&format=json&origin=*', 8000).then(function(y){
          var e = (y.j && y.j.entities && y.j.entities[s.qid]) || {}, L = e.labels || {}, D = e.descriptions || {}, sl = e.sitelinks || {};
          r.koL = L.ko ? L.ko.value : ''; if (L.en) r.enL = L.en.value; r.koD = D.ko ? D.ko.value : ''; if (D.en) r.enD = D.en.value;
          return sl.kowiki && sl.kowiki.title ? wpSum('ko', sl.kowiki.title).then(function(k){ if (k) r.sum = k; return r; }) : r;
        });
      });
    });
  }
  /* key: 기억할 이름(처음 물은 것) · q: 실제로 찾을 것(티커를 나중에 알게 되면 바뀐다) */
  function wikiPart(q, secP, key){
    var k = 'W:' + (key || coK(q)), hit = coPeek(k);
    if (hit) return Promise.resolve(hit.d);
    if (co.fly[k]) return co.fly[k];
    var err = false;
    var p = (q.tk ? wdByTicker(coTk(q.tk)) : Promise.resolve(null)).then(function(r){
      if (r === 'err'){ err = true; r = null; }
      if (r) return r;
      /* 위키데이터에 이 티커가 없으면 회사 이름으로 (SEC 의 정식 이름 > 13F 의 줄인 이름) */
      return Promise.resolve(secP).then(function(s){ var nm = (s && s.ok && s.name) || q.name || ''; return nm ? wpByName(nm) : null; })
        .then(function(r2){ if (r2 === 'err'){ err = true; return null; } return r2; });
    }).then(function(r){
      delete co.fly[k];
      if (r) coPut(k, r);
      else if (!err) coPut(k, { none: 1 }, true);
      return r || { none: 1 };
    }, function(){ delete co.fly[k]; return { none: 1 }; });
    return (co.fly[k] = p);
  }
  /* 한 종목을 통째로 — onPart(이름, 값) 로 하나씩 알린다 */
  function coLoad(q, onPart, noQuote){
    var secP = secPart(q), key = coK(q);
    var go = function(q2){
      var w = wikiPart(q2, secP, key).then(function(v){ onPart('wiki', v); });
      if (noQuote || !q2.tk) { if (!noQuote) onPart('quote', null); return w; }
      return Promise.all([w, quotePart(q2.tk).then(function(v){ onPart('quote', v); })]);
    };
    var s = secP.then(function(v){ onPart('sec', v); return v; });
    if (q.tk || !W()) return Promise.all([s, go(q)]);
    return s.then(function(v){ return go(v && v.ok && v.tk ? { tk: coTk(v.tk), name: q.name, cusip: q.cusip, pc: q.pc } : q); });
  }

  /* ③ 이 투자자 · 함께 담은 투자자 */
  function coCtx(m, kind, idx){
    var v = view(m), d = v.d;
    if (kind === 'sold'){
      var x = d && d.sold && d.sold[idx]; if (!x) return null;
      return { kind: kind, idx: idx, q: { tk: coTk(tkOf(x.cusip) || ''), name: x.name, cusip: x.cusip, pc: x.pc || '' }, me: { m: m, sold: x, period: d.period, prev: d.prev && d.prev.period, mode: v.mode } };
    }
    var r = v.rows.slice(0, getList().detail)[idx]; if (!r) return null;
    return { kind: 'row', idx: idx, q: { tk: coTk(r.tk), name: r.nm, cusip: r.cusip || '', pc: r.pc || '' }, me: { m: m, r: r, period: v.period, live: v.mode === 'live', hasPrev: !!(d && d.prev), mode: v.mode } };
  }
  function coWith(q, selfId){
    var out = [];
    getList().list.forEach(function(it){
      var m = full(it); if (m.id === selfId) return;
      var v = view(m), hit = null;
      v.rows.some(function(r){
        var same = (q.cusip && r.cusip) ? (r.cusip === q.cusip && (r.pc || '') === (q.pc || '')) : (q.tk && r.tk && coTk(r.tk) === q.tk && !r.pc && !q.pc);
        if (same) hit = r; return same;
      });
      if (hit) out.push({ m: m, pct: hit.pct, mode: v.mode });
    });
    return out.sort(function(a, b){ return b.pct - a.pct; });
  }

  /* ── 그리기 ── */
  function sparkSVG(a){
    a = (a || []).filter(function(v){ return typeof v === 'number' && isFinite(v); });
    if (a.length < 5) return '';
    var w = 92, h = 26, lo = Math.min.apply(null, a), hi = Math.max.apply(null, a), rg = hi - lo || 1;
    var pts = a.map(function(v, i){ return (2 + i / (a.length - 1) * (w - 6)).toFixed(1) + ',' + (h - 4 - (v - lo) / rg * (h - 8)).toFixed(1); });
    var last = pts[pts.length - 1].split(','), ch = (a[a.length - 1] - a[0]) / a[0] * 100, t = (ch >= 0 ? '+' : '−') + Math.abs(ch).toFixed(1) + '%';
    return '<span class="co-spw"><svg class="co-sp" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="최근 ' + a.length + '거래일 ' + t + '">'
      + '<title>최근 ' + a.length + '거래일 종가 흐름 ' + t + '</title>'
      + '<polyline points="' + pts.join(' ') + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>'
      + '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" class="co-sp-d"/></svg><span class="co-sp-t">' + a.length + '일 ' + t + '</span></span>';
  }
  function coPriceHTML(D, tk){
    if (!tk) return '';
    if (D.qs === 'load') return '<div class="co-px"><span class="co-sk" style="width:52%"></span><span class="co-sk" style="width:84%"></span></div>';
    var p = D.quote; if (!p) return '';
    var cur = p.cur && p.cur !== 'USD' ? esc(p.cur) + ' ' : '$';
    var dl = typeof p.chg === 'number' && isFinite(p.chg)
      ? '<span class="co-dl ' + (p.chg > 0.005 ? 'up' : p.chg < -0.005 ? 'dn' : '') + '">' + (p.chg > 0.005 ? '▲ ' : p.chg < -0.005 ? '▼ ' : '') + Math.abs(p.chg).toFixed(2) + '%<i> 전날보다</i></span>' : '';
    var rg = '';
    if (p.hi52 && p.lo52 && p.hi52 > p.lo52){
      var pos = Math.max(0, Math.min(100, (p.price - p.lo52) / (p.hi52 - p.lo52) * 100));
      rg = '<div class="co-rg"><span class="co-rg-l">52주</span><span class="co-rg-v">' + cur + fmtPrice(p.lo52) + '</span>'
        + '<span class="co-rg-t" role="img" aria-label="52주 최저와 최고 사이 ' + Math.round(pos) + '% 자리"><i style="left:' + pos.toFixed(1) + '%"></i></span>'
        + '<span class="co-rg-v">' + cur + fmtPrice(p.hi52) + '</span></div>';
    }
    return '<div class="co-px"><div class="co-p1"><span class="co-pl">지금 주가</span><b class="co-pr">' + cur + fmtPrice(p.price) + '</b>' + dl + sparkSVG(p.spark) + '</div>' + rg + '</div>';
  }
  function coSumHTML(D, w){
    if (D.ws === 'load') return '<div class="co-sum"><span class="co-sk"></span><span class="co-sk"></span><span class="co-sk" style="width:58%"></span></div>';
    if (!w || !w.sum) return '';
    var s = w.sum;   /* 넉 줄이 넘으면 접는다 — 넘는지는 그린 뒤에 재서 [더 보기]를 보인다(coPaint) */
    return '<div class="co-sum' + (co.more ? '' : ' clip') + '"><p lang="' + (s.lang === 'ko' ? 'ko' : 'en') + '">' + esc(s.text) + '</p>'
      + '<div class="co-src"><span class="co-morew"' + (co.more ? '' : ' hidden') + '><button type="button" class="co-more" data-co="more">' + (co.more ? '접기' : '더 보기') + '</button> · </span>'
      + '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + (s.lang === 'ko' ? '위키백과' : '영문 위키백과') + ' ↗</a>'
      + (s.lang !== 'ko' ? ' · <a href="https://translate.google.com/translate?sl=en&amp;tl=ko&amp;u=' + encodeURIComponent(s.url) + '" target="_blank" rel="noopener">한국어로 번역해 읽기 ↗</a>' : '')
      + '</div></div>';
  }
  /* 매출 · 순이익 — 작은 숫자 칸 두 개(이름 · 값 · 원화 · 전년 대비) */
  function finTile(lb, f, ni){
    var y = /^(\d{4})-(\d{2})/.exec(f.end || ''), when = y ? y[1] + '년 ' + (+y[2]) + '월까지 1년' : '';
    var dl = '';
    if (f.prev && typeof f.prev.val === 'number' && f.prev.val !== 0){
      if (ni && (f.val < 0) !== (f.prev.val < 0)) dl = f.val < 0 ? '<em class="dn">적자로 돌아섬</em>' : '<em class="up">흑자로 돌아섬</em>';
      else { var ch = (f.val - f.prev.val) / Math.abs(f.prev.val) * 100; if (isFinite(ch)) dl = '<em class="' + (ch > 0.05 ? 'up' : ch < -0.05 ? 'dn' : '') + '">전년보다 ' + (ch > 0.05 ? '+' : ch < -0.05 ? '−' : '') + Math.abs(ch).toFixed(1) + '%</em>'; }
    }
    return '<div class="co-fn" title="' + esc(when) + '"><span class="k">' + lb + '</span><b class="v">' + bigTxt(f.val, f.unit) + (ni && f.val < 0 ? ' <em class="co-loss">적자</em>' : '') + '</b>'
      + (f.unit === 'USD' ? '<span class="w">' + (f.val < 0 ? '약 −' + krw(Math.abs(f.val)).replace('약 ', '') : krw(f.val)) + '</span>' : '')
      + (dl ? '<span class="d">' + dl + '</span>' : '') + '</div>';
  }
  function coFactsHTML(D, s, w){
    var kv = [], h = '';
    if (s){
      var ind = sicKo(s.sic);
      if (ind || s.sicDesc) kv.push(['업종', esc(ind || properName(s.sicDesc)), ind && s.sicDesc ? esc(properName(s.sicDesc)) : '']);
      var loc = locKo(s.city, s.region, s.regionDesc); if (loc) kv.push(['본사', esc(loc), '']);
    }
    if (w && w.year) kv.push(['설립', w.year + '년', '']);
    if (s && s.fye) kv.push(['결산', esc(fyeKo(s.fye)), '']);
    var fm = s && s.former && s.former[0];
    if (fm && fm.to && Date.now() - Date.parse(fm.to) < 8 * 365 * 864e5) kv.push(['예전 이름', esc(properName(fm.name)), esc(fm.to.slice(0, 4)) + '년까지']);
    if (kv.length) h += '<div class="co-kv">' + kv.map(function(r){ return '<div><span class="k">' + r[0] + '</span><b>' + r[1] + '</b>' + (r[2] ? '<i>' + r[2] + '</i>' : '') + '</div>'; }).join('') + '</div>';
    if (s && s.fin && (s.fin.rev || s.fin.ni)){
      var e = /^(\d{4})-(\d{2})/.exec((s.fin.rev || s.fin.ni).end || '');
      h += '<div class="co-fin">' + (s.fin.rev ? finTile('매출', s.fin.rev) : '') + (s.fin.ni ? finTile('순이익', s.fin.ni, true) : '') + '</div>'
        + (e ? '<div class="co-fy">최근 회계연도(' + e[1] + '년 ' + (+e[2]) + '월까지 1년) · SEC 공시</div>' : '');
    }
    if (D.ss === 'load') h += '<div class="co-kv"><div><span class="co-sk" style="width:80%"></span></div><div><span class="co-sk" style="width:60%"></span></div></div>';
    return h;
  }
  function coMeHTML(){
    var c = co.ctx; if (!c || !c.me) return '';
    var me = c.me, m = me.m, who = esc(m.kr || m.en);
    if (me.sold){
      return '<div class="co-me"><div class="co-h">' + who + '의 움직임 <i>' + esc(qLabel(me.period)) + ' 13F</i></div><div class="co-mv">지난 분기(' + esc(qLabel(me.prev))
        + ')에는 신고 총액의 <b>' + pctTxt(me.sold.pct) + '</b>' + (me.sold.value ? '(' + money(me.sold.value) + ')' : '') + '를 담고 있었는데, 이번 분기에 <b>모두 팔았습니다</b>.</div></div>';
    }
    var r = me.r, parts = ['비중 <b>' + pctTxt(r.pct) + '</b>'];
    if (r.value) parts.push('<b>' + money(r.value) + '</b> <i>' + krw(r.value) + '</i>');
    if (r.shares) parts.push(krCount(r.shares) + ' 주' + (r.pc ? ' <i>(옵션이 걸린 주식 수)</i>' : ''));
    var chg = '';
    if (me.live && me.hasPrev){
      chg = r.chg === 'new' ? '<span class="co-new">이번 분기에 새로 샀습니다</span>'
        : typeof r.chg === 'number' ? (r.chg >= 1 ? '지난 분기보다 주식 수를 <span class="up">' + (r.chg >= 100 ? Math.round(r.chg) : r.chg) + '% 늘렸습니다</span>'
          : r.chg <= -1 ? '지난 분기보다 주식 수를 <span class="dn">' + Math.abs(r.chg) + '% 줄였습니다</span>' : '지난 분기와 주식 수가 거의 같습니다') : '';
    }
    var tag = me.mode === 'live' ? qLabel(me.period) + ' 13F' : me.mode === 'demo' ? '예시 값' : '직접 적은 값';
    return '<div class="co-me"><div class="co-h">' + who + '의 보유 <i>' + esc(tag) + '</i></div><div class="co-mv">' + parts.join(' · ') + '</div>'
      + (chg ? '<div class="co-mv">' + chg + '</div>' : '')
      + (r.pc ? '<div class="co-note">' + (r.pc === 'Put' ? '풋옵션 — 이 회사 주가가 <b>내리면</b> 이익을 보는 계약입니다.' : r.pc === 'Call' ? '콜옵션 — 이 회사 주가가 <b>오르면</b> 이익을 보는 계약입니다.' : esc(r.pc)) + '</div>' : '')
      + '</div>';
  }
  function coWithHTML(){
    var c = co.ctx; if (!c || !c.q) return '';
    var list = coWith(c.q, c.me && c.me.m && c.me.m.id);
    if (!list.length) return '<div class="co-with"><span class="co-h">함께 담은 투자자</span><span class="co-dim">내 목록의 다른 투자자 상위 종목에는 없습니다</span></div>';
    return '<div class="co-with"><span class="co-h">함께 담은 투자자</span>' + list.slice(0, 5).map(function(x){
      return '<button type="button" class="co-who" data-co-who="' + esc(x.m.id) + '" title="' + esc(x.m.en) + ' 상세 열기">' + esc(x.m.kr || x.m.en) + ' <b>' + pctTxt(x.pct) + '</b>' + (x.mode !== 'live' ? '<i>예시</i>' : '') + '</button>';
    }).join('') + (list.length > 5 ? '<span class="co-dim">외 ' + (list.length - 5) + '명</span>' : '') + '</div>';
  }
  function coHTML(){
    var q = co.q, D = co.d || {}, s = D.sec && D.sec.ok ? D.sec : null, w = D.wiki && !D.wiki.none ? D.wiki : null, p = D.quote;
    var tk = q.tk || (s && s.tk ? coTk(s.tk) : '');
    var nm = (w && w.enL) || (p && p.name) || (s && properName(s.name)) || nameCase(q.name) || tk;
    var ko = w && w.koL && w.koL.toLowerCase() !== String(nm).toLowerCase() ? w.koL : '', one = w ? (w.koD || w.enD || '') : '';
    var ex = s && s.exch && s.exch.length ? s.exch.map(function(x){ return String(x).toUpperCase(); }).filter(function(x, i, a){ return a.indexOf(x) === i; }).join(' · ') : '';
    var h = '<div class="co-hd"><div class="co-id"><div class="co-t1"><b class="co-tk" id="coTk">' + esc(tk || shortName(q.name)) + '</b>'
      + (ex ? '<span class="co-ex">' + esc(ex) + '</span>' : '')
      + (q.pc ? '<span class="co-pc">' + (q.pc === 'Put' ? '풋옵션' : q.pc === 'Call' ? '콜옵션' : esc(q.pc)) + '</span>' : '')
      + '</div><div class="co-nm">' + esc(nm) + '</div>'
      + ((ko || one) ? '<div class="co-ko">' + (ko ? '<b>' + esc(ko) + '</b>' : '') + (ko && one ? ' — ' : '') + esc(one) + '</div>' : '')
      + '</div><button type="button" class="co-x" data-co="close" aria-label="기업 정보 닫기" title="닫기 (Esc)">✕</button></div>';
    h += coPriceHTML(D, tk) + coSumHTML(D, w) + coFactsHTML(D, s, w) + coMeHTML() + coWithHTML();
    var nothing = D.ss !== 'load' && D.ws !== 'load' && !s && !(w && (w.sum || w.koD || w.enD)) && !p;
    var why = D.sec && D.sec.none, note = '';
    if (why === 'old') note = 'Worker 를 v16 으로 바꾸면 업종 · 본사 · 매출 · 순이익도 함께 보입니다. <button type="button" class="co-lnk" data-co="help">바꾸는 법</button>';
    else if (why === 'noworker') note = '내 Worker 를 연결하면 주가 · 업종 · 매출 · 순이익도 함께 보입니다.';
    else if (why === 'sec_forbidden') note = 'SEC 가 잠시 요청을 막아 숫자를 못 받았습니다 — 잠시 뒤 다시 눌러 보세요.';
    var links = [];
    if (s && s.cik) links.push('<a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&amp;CIK=' + esc(s.cik) + '&amp;owner=include&amp;count=40" target="_blank" rel="noopener">SEC 공시 ↗</a>');
    if (tk) links.push('<a href="https://finance.yahoo.com/quote/' + encodeURIComponent(tk.replace(/\./g, '-')) + '/" target="_blank" rel="noopener">Yahoo Finance ↗</a>');
    h += (nothing ? '<div class="co-empty">이 종목의 기업 정보를 찾지 못했습니다 — 아래 링크에서 확인해 보세요.</div>' : '')
      + (note ? '<div class="co-note">' + note + '</div>' : '')
      + '<div class="co-ft">' + links.join('') + (tk && window.__nnTicker && window.__nnTicker.open ? '<button type="button" class="co-btn" data-co="sheet" title="내 노트 · 논거 · 매매 기록에서 이 종목">내 기록 · 종목 한 장 →</button>' : '') + '</div>';
    return h;
  }

  /* ── 띄우기 · 자리 잡기 · 닫기 ── */
  function coSheet(){ try { return window.matchMedia('(max-width:640px)').matches; } catch(e) { return false; } }
  function coAnchor(){
    if (co.anchor && co.anchor.isConnected) return co.anchor;
    var c = co.ctx; if (!c) return null;
    var a = c.kind === 'sold' ? document.querySelector('#siDetail [data-co-sold="' + c.idx + '"]') : document.querySelector('#siDetail .sid-tk[data-co-i="' + c.idx + '"]');
    return (co.anchor = a || null);
  }
  function coMark(){
    [].forEach.call(document.querySelectorAll('#siDetail .sid-row.co-on'), function(r){ r.classList.remove('co-on'); });
    var a = co.pop && coAnchor(), row = a && a.closest ? a.closest('.sid-row') : null;
    if (row) row.classList.add('co-on');
  }
  function coPlace(){
    var p = co.pop; if (!p || p.classList.contains('sheet')) return;
    var a = coAnchor();
    var vw = document.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight, nb = navBottom();
    if (!a){   /* 붙을 줄이 없으면(다른 곳에서 열었을 때) 화면 가운데 위쪽 */
      p.style.setProperty('max-height', Math.max(240, vh - nb - 24) + 'px', 'important');
      p.style.left = Math.round(Math.max(12, (vw - p.offsetWidth) / 2)) + 'px';
      p.style.top = Math.round(Math.max(nb + 12, Math.min(nb + 48, vh - p.offsetHeight - 12))) + 'px';
      return;
    }
    var r = a.getBoundingClientRect();
    if (r.bottom < nb || r.top > vh){ coClose(); return; }               /* 누른 줄이 화면 밖으로 나가면 닫는다 */
    var full = Math.max(240, vh - nb - 24);
    p.style.setProperty('max-height', full + 'px', 'important');
    var row = (a.closest && a.closest('.sid-row')) || a, rr = row.getBoundingClientRect();
    var w = p.offsetWidth, h = p.offsetHeight, left, top;
    var rs = vw - rr.right - 24, ls = rr.left - 24;
    if (rs >= w || ls >= w){
      /* 옆에 자리가 있으면 줄 옆에 — 누른 줄을 가리지 않는다. 창 머리가 줄 높이쯤 오게 두고 화면 안으로 맞춘다 */
      left = rs >= w && (rs >= ls || ls < w) ? rr.right + 12 : rr.left - 12 - w;
      top = Math.max(nb + 8, Math.min(rr.top - 56, vh - h - 8));
    } else {
      /* 옆이 좁으면(한 줄짜리 상세) 줄 아래나 위 — 넘치면 창 안에서 넘겨 본다 */
      var below = vh - rr.bottom - 16, above = rr.top - nb - 16;
      left = Math.min(Math.max(12, r.left - 14), vw - w - 12);
      if (h <= below || below >= above){ top = rr.bottom + 8; p.style.setProperty('max-height', Math.max(160, Math.min(full, below)) + 'px', 'important'); }
      else { var mh = Math.max(160, Math.min(full, above)); p.style.setProperty('max-height', mh + 'px', 'important'); top = rr.top - 8 - Math.min(h, mh); }
      top = Math.max(nb + 8, top);
    }
    p.style.left = Math.round(left) + 'px'; p.style.top = Math.round(top) + 'px';
  }
  function coOnScroll(){ if (!co.raf) co.raf = requestAnimationFrame(function(){ co.raf = 0; coPlace(); }); }
  function coOutside(e){
    if (!co.pop) return;
    var t = e.target;
    if (co.pop.contains(t) || (co.back && t === co.back)) return;
    if (t && t.closest && t.closest('#siDetail [data-co-i], #siDetail [data-co-sold]')) return;   /* 다른 종목을 누르면 바꿔서 연다 */
    coClose();
  }
  function coPaint(first){
    var p = co.pop; if (!p) return;
    var y = p.scrollTop;
    p.innerHTML = coHTML();
    var sp = p.querySelector('.co-sum.clip p'), mw = p.querySelector('.co-morew');
    if (sp && mw && sp.scrollHeight > sp.clientHeight + 2) mw.hidden = false;
    p.scrollTop = y;
    coPlace();
    if (first) coMark();
  }
  function coEnsure(){
    if (co.pop) return co.pop;
    var p = document.createElement('div');
    p.id = 'coPop'; p.className = 'co-pop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-labelledby', 'coTk'); p.tabIndex = -1;
    if (coSheet()){
      p.classList.add('sheet');
      var b = document.createElement('div'); b.className = 'co-back'; b.id = 'coBack'; document.body.appendChild(b); co.back = b;
      b.addEventListener('click', function(){ coClose(); });
    }
    document.body.appendChild(p); co.pop = p;
    p.addEventListener('click', coClick);
    window.addEventListener('scroll', coOnScroll, { passive: true });
    window.addEventListener('resize', coOnScroll);
    document.addEventListener('mousedown', coOutside, true);
    requestAnimationFrame(function(){ if (co.pop) co.pop.classList.add('show'); if (co.back) co.back.classList.add('show'); });
    return p;
  }
  function coClose(){
    if (!co.pop) return;
    var p = co.pop, b = co.back, a = co.anchor;
    co.pop = null; co.back = null; co.anchor = null; co.tok++;
    p.classList.remove('show'); if (b) b.classList.remove('show');
    setTimeout(function(){ if (p.parentNode) p.parentNode.removeChild(p); if (b && b.parentNode) b.parentNode.removeChild(b); }, 200);
    window.removeEventListener('scroll', coOnScroll); window.removeEventListener('resize', coOnScroll);
    document.removeEventListener('mousedown', coOutside, true);
    [].forEach.call(document.querySelectorAll('#siDetail .sid-row.co-on'), function(r){ r.classList.remove('co-on'); });
    if (a && a.isConnected) try { a.focus({ preventScroll: true }); } catch(e) {}
  }
  function coOpen(ctx, anchor){
    if (!ctx || !ctx.q) return;
    var q = ctx.q;
    co.ctx = ctx; co.q = q; co.anchor = anchor || null; co.more = false;
    var tok = ++co.tok;
    co.d = { ss: 'load', ws: 'load', qs: q.tk && W() ? 'load' : 'none' };
    var fresh = !co.pop;
    coEnsure();
    coPaint(true);
    if (fresh) setTimeout(function(){ try { if (co.pop) co.pop.focus({ preventScroll: true }); } catch(e) {} }, 40);
    coLoad(q, function(part, v){
      if (tok !== co.tok || !co.d) return;
      if (part === 'sec'){
        co.d.sec = v; co.d.ss = 'done';
        if (!q.tk && v && v.ok && v.tk){ co.q = { tk: coTk(v.tk), name: q.name, cusip: q.cusip, pc: q.pc }; if (W()) co.d.qs = 'load'; }
      } else if (part === 'wiki'){ co.d.wiki = v; co.d.ws = 'done'; }
      else if (part === 'quote'){ co.d.quote = v; co.d.qs = 'done'; }
      coPaint();
    });
  }
  function coClick(e){
    var t = e.target && e.target.closest ? e.target.closest('button') : null; if (!t) return;
    var a = t.getAttribute('data-co'), who = t.getAttribute('data-co-who');
    if (a === 'close'){ coClose(); return; }
    if (a === 'more'){ co.more = !co.more; coPaint(); return; }
    if (a === 'sheet'){ var tk = co.q && co.q.tk; coClose(); if (tk && window.__nnTicker) window.__nnTicker.open(tk); return; }
    if (a === 'help'){ coClose(); openEditor('help'); return; }
    if (who){ coClose(); if (byId(who)){ st.open = who; st.anim = true; st.tight = false; st.lim = 0; st.allRows = false; render(); fitDetail(); requestAnimationFrame(scrollToDetail); coWarmFor(who); } }
  }

  /* ── 미리 찾아 두기 — 마우스를 올리면 그 종목 · 상세를 열면 그 투자자의 종목을 뒤에서 하나씩 ── */
  function coNeed(q){ var k = coK(q); return !coPeek('W:' + k) || (W() && co.wk !== 'old' && !coPeek('S:' + k)); }
  function coWarmFor(id){
    var it = byId(id); if (!it) return;
    var m = full(it), v = view(m);
    v.rows.slice(0, getList().detail).forEach(function(r){
      var q = { tk: coTk(r.tk), name: r.nm, cusip: r.cusip || '', pc: r.pc || '' }, k = coK(q);
      if (coNeed(q) && !co.warmQ.some(function(x){ return coK(x) === k; })) co.warmQ.push(q);
    });
    coWarmPump();
  }
  function coWarmPump(){
    if (co.warmOn || !co.warmQ.length) return;
    if (document.visibilityState === 'hidden'){ setTimeout(coWarmPump, 4000); return; }
    co.warmOn = true;
    var q = co.warmQ.shift();
    var done = function(){ setTimeout(function(){ co.warmOn = false; coWarmPump(); }, 700); };
    if (!coNeed(q)) { co.warmOn = false; coWarmPump(); return; }
    coLoad(q, function(){}, true).then(done, done);
  }
  function coHover(e){
    var r = e.target && e.target.closest ? e.target.closest('#siDetail .sid-row[data-co-i]') : null;
    if (r === co.hoverRow) return;
    co.hoverRow = r; clearTimeout(co.hoverT);
    if (!r) return;
    co.hoverT = setTimeout(function(){
      if (co.hoverRow !== r || !st.open) return;
      var it = byId(st.open); if (!it) return;
      var c = coCtx(full(it), 'row', +r.getAttribute('data-co-i'));
      if (c && coNeed(c.q)) coLoad(c.q, function(){}, true);
    }, 140);
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
      if (a === 'photo'){ editPhoto(b.getAttribute('data-id')); return; }
      if (a === 'close-detail'){
        var cid = st.open; st.open = ''; render();
        var cc = cid && document.querySelector('#siGrid .si-card[data-id="' + (window.CSS && CSS.escape ? CSS.escape(cid) : cid) + '"]');
        if (cc) try { cc.focus({ preventScroll: true }); } catch(x) {}
        return;
      }
      if (a === 'all-rows'){ st.allRows = true; st.lim = 0; placeDetail(); requestAnimationFrame(scrollToDetail); return; }
    }
    /* 상세의 종목 줄(티커 · 이름 · 막대 어디든) · '모두 팖' 의 종목 → 기업 한 장 */
    if ((b = t.closest('#siDetail [data-co-i], #siDetail [data-co-sold]')) && st.open && !t.closest('a')){
      var it0 = byId(st.open); if (!it0) return;
      var sold = b.hasAttribute('data-co-sold'), idx = +(b.getAttribute(sold ? 'data-co-sold' : 'data-co-i'));
      var ctx = coCtx(full(it0), sold ? 'sold' : 'row', idx);
      var anc = sold ? b : (b.classList.contains('sid-tk') ? b : (b.querySelector('.sid-tk') || b));
      if (co.pop && co.ctx && co.ctx.kind === (sold ? 'sold' : 'row') && co.ctx.idx === idx && co.ctx.me && co.ctx.me.m.id === st.open){ coClose(); return; }   /* 같은 줄을 다시 누르면 닫는다 */
      if (ctx) coOpen(ctx, anc);
      return;
    }
    var card = t.closest('.si-card');
    if (card && !t.closest('a')) toggle(card.getAttribute('data-id'));
  }
  function onKey(e){
    if (e.key === 'Escape'){
      if (co.pop){ e.preventDefault(); e.stopPropagation(); coClose(); return; }   /* 기업 한 장이 떠 있으면 그것부터 닫는다 */
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
    document.addEventListener('mouseover', coHover, { passive: true });
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
  /* 기업 한 장 — 다른 곳에서도 부를 수 있게 (예: __nnCompany.open('AAPL')) */
  window.__nnCompany = {
    open: function(tk, name){ tk = coTk(tk); if (!tk && !name) return; coOpen({ kind: 'ext', idx: -1, q: { tk: tk, name: name || '', cusip: '', pc: '' }, me: null }, null); },
    close: coClose,
    get: function(tk, name){ var q = { tk: coTk(tk), name: name || '', cusip: '', pc: '' }, out = {}; return coLoad(q, function(k, v){ out[k] = v; }).then(function(){ return out; }); },
    peek: function(tk){ var k = coTk(tk); return { sec: (coPeek('S:' + k) || {}).d || null, wiki: (coPeek('W:' + k) || {}).d || null }; },
    _state: co
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
