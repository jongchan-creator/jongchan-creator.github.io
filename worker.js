/* ═══════════════════════════════════════════════════════
   NEWNORMAL 데이터 프록시 (Cloudflare Worker) v14
   - /kr      : 코스피·코스닥 실시간 지수 (네이버)
   - /news    : 경제 뉴스 헤드라인 (매경·한경·연합 RSS)
   - /rates   : 미국 국채 수익률 (재무부 공식 API)
   - /comm    : 원자재 선물 실시간 (금·은·WTI·천연가스·구리)
   - /quote   : 관심종목 조회 (미국·한국 주식 + 암호화폐, 시총·52주 포함)
                예) /quote?us=AAPL,NVDA&kr=005930,000660&crypto=bitcoin,ethereum
   - /search  : 통합 종목 검색
   - /fred    : 🆕 미국 연준 자료 (FRED CSV)   예) /fred?id=DFEDTARL,DFEDTARU
   - /ecos    : 🆕 한국은행 기준금리 (ECOS)     예) /ecos?key=…&code=722Y001&cycle=M&item=0101000&from=202501&to=202609
   - /ecosword: 🆕 한국은행 경제용어사전         예) /ecosword?key=…&q=양적완화
   - /stdict  : 🆕 표준국어대사전 (국립국어원)   예) /stdict?key=…&q=천착
   무료 플랜으로 충분 (하루 10만 요청)

   ※ 이 파일은 비밀값이 없다(인증키는 각자 브라우저가 넘겨준다). 누구나 그대로 복사해 자기 Worker 에 붙여 쓰면 된다.

   v14 변경 — /stdict 추가 (LEXICON '바로 찾기'의 한국어 낱말 뜻)

   v13 변경 — /ecosword 추가 (LEXICON '바로 찾기'가 경제 용어 뜻을 여기서 받는다)

   v12 변경 — /fred 가 FRED 에 막히면 기준금리를 뉴욕 연은 공식 API 로 대신 받는다

   v11 변경 (2026-09-21)
   ① /fred · /ecos 추가 — MACRO 탭의 미국·한국 기준금리가 '참고값'에서 실제 값으로 바뀐다
   ② /comm 오류 수정 — 한국 주식·암호화폐 스파크라인 코드가 /comm 안에 잘못 들어가 있어
      'kr is not defined' 로 매번 실패했다(원자재 등락률이 전부 0.00% 로 보이던 원인).
      그 코드를 원래 자리인 /quote 안으로 옮겼다
   ═══════════════════════════════════════════════════════ */
export default {
  async fetch(req) {
    const url = new URL(req.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const UA = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } };
    const json = (obj, maxAge) => new Response(JSON.stringify(obj), {
      headers: { ...cors, 'Cache-Control': 'public, max-age=' + (maxAge || 0) }
    });
    /* 받은 내용을 그대로 돌려줄 때 (CSV·원본 JSON) */
    const raw = (text, type, maxAge, status) => new Response(text, {
      status: status || 200,
      headers: { ...cors, 'Content-Type': type, 'Cache-Control': 'public, max-age=' + (maxAge || 0) }
    });
    const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };

    try {
      /* ── 코스피·코스닥 ── */
      if (url.pathname === '/kr') {
        const [kospi, kosdaq] = await Promise.all([
          fetch('https://m.stock.naver.com/api/index/KOSPI/basic', UA).then(r => r.json()),
          fetch('https://m.stock.naver.com/api/index/KOSDAQ/basic', UA).then(r => r.json())
        ]);
        const pick = d => ({ price: parseFloat(String(d.closePrice).replace(/,/g, '')), chg: parseFloat(d.fluctuationsRatio) });
        return json({ kospi: pick(kospi), kosdaq: pick(kosdaq), t: Date.now() }, 30);
      }

      /* ── 🆕 미국 연준 자료 (FRED) ──
         사이트가 '/fred?id=DFEDTARL,DFEDTARU' (기준금리 목표범위),
         '/fred?id=DGS2,DGS10,DGS30' (국채 금리) 처럼 부른다.
         FRED 가 주는 CSV 를 그대로 돌려준다 — 사이트가 첫 줄 'observation_date,' 로 진짜인지 확인한다. */
      if (url.pathname === '/fred') {
        const id = (url.searchParams.get('id') || '').toUpperCase();
        if (!/^[A-Z0-9_]{2,30}(,[A-Z0-9_]{2,30}){0,5}$/.test(id)) {
          return json({ error: 'id 가 올바르지 않습니다 (예: DFEDTARL,DFEDTARU)' }, 0);
        }
        /* 최근 1년치만 — 전체 역사를 받으면 느리다 */
        const from = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
        const u = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + id + '&cosd=' + from;
        let t = '', st = 0;
        try {
          const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'text/csv,*/*' } });
          st = r.status; t = await r.text();
        } catch (e) {}
        if (/^\s*(observation_date|DATE)\s*,/i.test(t)) {
          return raw(t, 'text/csv; charset=utf-8', 21600);   /* 6시간 — 기준금리는 자주 안 바뀐다 */
        }
        /* v12 — FRED 는 Cloudflare 같은 클라우드 서버의 요청을 자주 막는다.
           기준금리 목표범위(DFEDTARL·DFEDTARU)는 뉴욕 연은 공식 API 로 대신 받아
           FRED 와 똑같은 CSV 모양으로 만들어 준다 → 사이트 코드는 그대로 동작한다. */
        if (/DFEDTAR/.test(id)) {
          try {
            const d = await fetch('https://markets.newyorkfed.org/api/rates/unsecured/effr/last/5.json', UA).then(r => r.json());
            const rows = ((d && d.refRates) || []).filter(x => x.targetRateFrom != null && x.targetRateTo != null)
              .sort((a, b) => String(a.effectiveDate).localeCompare(String(b.effectiveDate)));
            if (rows.length) {
              const cols = id.split(',');
              const csv = 'observation_date,' + cols.join(',') + '\n' + rows.map(x =>
                x.effectiveDate + ',' + cols.map(c => c === 'DFEDTARL' ? x.targetRateFrom : c === 'DFEDTARU' ? x.targetRateTo : '').join(',')
              ).join('\n') + '\n';
              return raw(csv, 'text/csv; charset=utf-8', 21600);
            }
          } catch (e) {}
        }
        return new Response(JSON.stringify({ error: 'FRED·뉴욕연은 모두 응답 없음', status: st }), { status: 502, headers: cors });
      }

      /* ── 🆕 한국은행 ECOS ──
         사이트가 key·code·cycle·item·from·to 를 넘긴다. 한국은행 응답(JSON)을 그대로 돌려준다.
         인증키는 사이트(각자 브라우저)에 저장돼 있고 여기엔 남기지 않는다. */
      if (url.pathname === '/ecos') {
        const p = url.searchParams;
        const key = (p.get('key') || '').trim();
        const code = (p.get('code') || '').trim();
        const cycle = (p.get('cycle') || 'M').trim().toUpperCase();
        const item = (p.get('item') || '').trim();
        const from = (p.get('from') || '').trim();
        const to = (p.get('to') || '').trim();
        if (!/^[A-Za-z0-9]{8,60}$/.test(key)) return json({ RESULT: { CODE: 'INFO-100', MESSAGE: '인증키가 비어 있거나 형식이 다릅니다' } }, 0);
        if (!/^[A-Z0-9]{5,12}$/.test(code) || !/^(A|S|Q|M|SM|D)$/.test(cycle)
            || !/^\d{4,8}$/.test(from) || !/^\d{4,8}$/.test(to) || (item && !/^[A-Za-z0-9]{1,20}$/.test(item))) {
          return json({ RESULT: { CODE: 'ERROR-100', MESSAGE: '요청 값이 올바르지 않습니다' } }, 0);
        }
        const u = 'https://ecos.bok.or.kr/api/StatisticSearch/' + encodeURIComponent(key)
                + '/json/kr/1/200/' + code + '/' + cycle + '/' + from + '/' + to + (item ? '/' + item : '');
        const r = await fetch(u, UA);
        const t = await r.text();
        if (!/"(StatisticSearch|RESULT)"/.test(t)) {
          return json({ RESULT: { CODE: 'PROXY-502', MESSAGE: '한국은행 응답이 비정상입니다 (HTTP ' + r.status + ')' } }, 0);
        }
        return raw(t, 'application/json; charset=utf-8', 3600);
      }

      /* ── 🆕 한국은행 경제용어사전 (ECOS StatisticWord) ──
         LEXICON 의 '바로 찾기'가 부른다. 한국은행 응답(JSON)을 그대로 돌려준다. 인증키는 저장하지 않는다. */
      if (url.pathname === '/ecosword') {
        const key = (url.searchParams.get('key') || '').trim();
        const q = (url.searchParams.get('q') || '').trim().slice(0, 40);
        if (!/^[A-Za-z0-9]{8,60}$/.test(key)) return json({ RESULT: { CODE: 'INFO-100', MESSAGE: '인증키가 비어 있거나 형식이 다릅니다' } }, 0);
        if (!q) return json({ RESULT: { CODE: 'ERROR-100', MESSAGE: '찾을 말이 없습니다' } }, 0);
        const u = 'https://ecos.bok.or.kr/api/StatisticWord/' + encodeURIComponent(key) + '/json/kr/1/10/' + encodeURIComponent(q);
        const r = await fetch(u, UA);
        const t = await r.text();
        if (!/"(StatisticWord|RESULT)"/.test(t)) {
          return json({ RESULT: { CODE: 'PROXY-502', MESSAGE: '한국은행 응답이 비정상입니다 (HTTP ' + r.status + ')' } }, 0);
        }
        return raw(t, 'application/json; charset=utf-8', 86400);   /* 용어 풀이는 하루 보관 */
      }

      /* ── 🆕 표준국어대사전 (국립국어원 Open API) ──
         LEXICON 의 '바로 찾기'가 부른다. 국립국어원 응답(JSON)을 그대로 돌려준다. 인증키는 저장하지 않는다.
         찾는 말이 없으면 국립국어원이 빈 내용을 주기도 해서, 그때는 빈 목록 모양으로 맞춰 준다. */
      if (url.pathname === '/stdict') {
        const key = (url.searchParams.get('key') || '').trim();
        const q = (url.searchParams.get('q') || '').trim().slice(0, 40);
        if (!/^[A-Za-z0-9]{16,64}$/.test(key)) return json({ error: { error_code: '020', message: '인증키가 비어 있거나 형식이 다릅니다' } }, 0);
        if (!q) return json({ channel: { total: 0, item: [] } }, 0);
        const u = 'https://stdict.korean.go.kr/api/search.do?key=' + encodeURIComponent(key)
                + '&q=' + encodeURIComponent(q) + '&req_type=json&num=10';
        const r = await fetch(u, UA);
        const t = (await r.text()).trim();
        if (!t) return json({ channel: { total: 0, item: [] } }, 3600);
        if (!/"(channel|error)"/.test(t)) {
          return new Response(JSON.stringify({ proxy_error: '국립국어원 응답이 비정상입니다', status: r.status }), { status: 502, headers: cors });
        }
        return raw(t, 'application/json; charset=utf-8', /"error"/.test(t) ? 0 : 86400);
      }

      /* ── 국채 수익률 ── */
      if (url.pathname === '/rates') {
        const yc = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/daily_treasury_yield_curve?sort=-record_date&page[size]=1&format=json';
        let out = {};
        try {
          const d = await fetch(yc, UA).then(r => r.json());
          const row = d && d.data && d.data[0];
          if (row) { out = { date: row.record_date, y2: num(row.bc_2year), y5: num(row.bc_5year), y10: num(row.bc_10year), y30: num(row.bc_30year), y1: num(row.bc_1year), m3: num(row.bc_3month) }; }
        } catch (e) {}
        return json(out, 3600);
      }

      /* ── 원자재 선물 ── */
      if (url.pathname === '/comm') {
        const syms = { 'GC=F': 'gold', 'SI=F': 'silver', 'CL=F': 'wti', 'NG=F': 'natgas', 'HG=F': 'copper' };
        const out = {};
        await Promise.all(Object.keys(syms).map(async s => {
          try {
            const u = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(s) + '?range=5d&interval=1d';
            const d = await fetch(u, UA).then(r => r.json());
            const res = d && d.chart && d.chart.result && d.chart.result[0];
            if (!res) return;
            const m = res.meta || {};
            const price = m.regularMarketPrice;
            let chg = null;
            try {
              const closes = res.indicators.quote[0].close.filter(x => x != null);
              const prev = (closes.length >= 2) ? closes[closes.length - 2] : (m.chartPreviousClose || m.previousClose);
              if (price != null && prev) chg = (price - prev) / prev * 100;
            } catch (e) {}
            out[syms[s]] = { price, chg };
          } catch (e) {}
        }));
        /* ⚠ v10 까지 여기 있던 한국 주식·암호화폐 스파크라인 코드는 /quote 로 옮겼다 (kr·cr 은 /quote 에만 있다) */
        return json(out, 60);
      }

      /* ── 통합 종목 검색 (Yahoo 심볼 검색 — 미국·한국 주식 + 암호화폐) ── */
      if (url.pathname === '/search') {
        const q = (url.searchParams.get('q') || '').trim();
        if (!q) return json([], 0);
        try {
          const d = await fetch('https://query1.finance.yahoo.com/v1/finance/search?q=' + encodeURIComponent(q) + '&quotesCount=12&newsCount=0&listsCount=0', UA).then(r => r.json());
          const out = [];
          ((d && d.quotes) || []).forEach(o => {
            if (!o.symbol) return;
            const type = o.quoteType || '';
            let market = null, sym = o.symbol;
            if (type === 'CRYPTOCURRENCY') {
              if (!/-USD$/.test(o.symbol)) return;          // USD 페어만
              market = 'crypto'; sym = o.symbol.replace(/-USD$/, '');
            } else if (/\.(KS|KQ)$/.test(o.symbol)) {       // 한국: 005930.KS / 코스닥 .KQ
              market = 'kr'; sym = o.symbol.replace(/\.(KS|KQ)$/, '');
            } else if (type === 'EQUITY' || type === 'ETF') {
              if (o.symbol.includes('.') || o.symbol.includes('^')) return; // 미국 본토 티커만
              market = 'us';
            } else return;
            out.push({ market, sym, name: o.shortname || o.longname || sym, exch: o.exchDisp || '' });
          });
          return json(out.slice(0, 8), 300);
        } catch (e) { return json([], 0); }
      }

      /* ── 관심종목 조회 (미국·한국·암호화폐) ── */
      if (url.pathname === '/quote') {
        const us = (url.searchParams.get('us') || '').split(',').filter(Boolean);
        const kr = (url.searchParams.get('kr') || '').split(',').filter(Boolean);
        const cr = (url.searchParams.get('crypto') || '').split(',').filter(Boolean);
        const out = { us: {}, kr: {}, crypto: {} };

        const tasks = [];
        // 미국: Yahoo v8 chart (키·쿠키 불필요, 시세·52주 제공)
        if (us.length) tasks.push(...us.map(async sym => {
          try {
            const u = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?range=1y&interval=1d';
            const d = await fetch(u, UA).then(r => r.json());
            const res = d && d.chart && d.chart.result && d.chart.result[0];
            if (!res) return;
            const m = res.meta || {};
            const price = m.regularMarketPrice;
            let chg = null, hi52 = m.fiftyTwoWeekHigh || null, lo52 = m.fiftyTwoWeekLow || null, spark = null;
            try {
              const closes = res.indicators.quote[0].close.filter(x => x != null);
              if (closes.length) { hi52 = Math.max(...closes); lo52 = Math.min(...closes); }
              // 전일 대비 등락: 마지막 두 종가 사용 (없으면 previousClose)
              const prev = (closes.length >= 2) ? closes[closes.length - 2] : (m.chartPreviousClose || m.previousClose);
              if (price != null && prev) chg = (price - prev) / prev * 100;
              spark = closes.slice(-30).map(v => Math.round(v * 100) / 100);   // 최근 30일 종가 (스파크라인)
            } catch (e) {}
            out.us[sym] = { name: m.longName || m.shortName || sym, price, chg, mcap: null, cur: m.currency || 'USD', hi52, lo52, spark };
          } catch (e) {}
        }));
        // 한국: 네이버 (종목코드 6자리)
        if (kr.length) tasks.push(...kr.map(async code => {
          try {
            const numf = v => { const n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? null : n; };
            // basic: 가격·등락 / integration: 시총·52주 등 상세 지표
            const [b, integ] = await Promise.all([
              fetch('https://m.stock.naver.com/api/stock/' + code + '/basic', UA).then(r => r.json()).catch(() => ({})),
              fetch('https://m.stock.naver.com/api/stock/' + code + '/integration', UA).then(r => r.json()).catch(() => ({}))
            ]);
            let mcap = null, hi52 = null, lo52 = null;
            // integration.totalInfos: [{code,key,value}] 배열 형태
            const infos = (integ && integ.totalInfos) || [];
            const find = k => { const it = infos.find(x => x.code === k || x.key === k); return it ? it.value : null; };
            // 시가총액 (억원 단위 문자열 → 원)
            const mv = find('marketValue') || find('marketSum');
            if (mv != null) {
              const s = String(mv);
              const jo = s.match(/([\d,\.]+)\s*조/), eok = s.match(/([\d,\.]+)\s*억/);
              if (jo || eok) mcap = (jo ? numf(jo[1]) * 1e12 : 0) + (eok ? numf(eok[1]) * 1e8 : 0);
              else { const n = numf(s); if (n != null) mcap = n * 1e8; } // 순수 숫자면 억원 단위로 간주
            }
            // 52주 최고/최저
            hi52 = numf(find('highPriceOf52Weeks'));
            lo52 = numf(find('lowPriceOf52Weeks'));
            out.kr[code] = {
              name: b.stockName || code,
              price: numf(b.closePrice),
              chg: numf(b.fluctuationsRatio),
              mcap: mcap, cur: 'KRW',
              hi52: hi52, lo52: lo52
            };
          } catch (e) {}
        }));
        // 암호화폐: CoinGecko (시총 포함)
        if (cr.length) tasks.push((async () => {
          const ID2SYM = { bitcoin:'BTC', ethereum:'ETH', solana:'SOL', ripple:'XRP', cardano:'ADA', dogecoin:'DOGE', binancecoin:'BNB', tron:'TRX', polkadot:'DOT', chainlink:'LINK', litecoin:'LTC', avalanche:'AVAX', 'avalanche-2':'AVAX', 'shiba-inu':'SHIB', sui:'SUI', aptos:'APT', near:'NEAR', stellar:'XLM', monero:'XMR', uniswap:'UNI', pepe:'PEPE', hyperliquid:'HYPE', toncoin:'TON', 'the-open-network':'TON' };
          const SYM2ID = { BTC:'bitcoin', ETH:'ethereum', SOL:'solana', XRP:'ripple', ADA:'cardano', DOGE:'dogecoin', BNB:'binancecoin', TRX:'tron', DOT:'polkadot', LINK:'chainlink', LTC:'litecoin', AVAX:'avalanche-2', SHIB:'shiba-inu', SUI:'sui', APT:'aptos', NEAR:'near', XLM:'stellar', XMR:'monero', UNI:'uniswap', PEPE:'pepe', HYPE:'hyperliquid', TON:'the-open-network' };
          const toks = cr.map(t => { const lc = t.toLowerCase(); return { tok: t, sym: ID2SYM[lc] || t.toUpperCase() }; });
          // 1차: CryptoCompare (심볼 기반, 키 불필요, 서버 친화적)
          try {
            const fs = [...new Set(toks.map(x => x.sym))].join(',');
            const d = await fetch('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=' + encodeURIComponent(fs) + '&tsyms=USD', { headers: { 'Accept': 'application/json' } }).then(r => r.json());
            const raw = d && d.RAW;
            if (raw) toks.forEach(x => {
              const o = raw[x.sym] && raw[x.sym].USD;
              if (o && o.PRICE != null) out.crypto[x.tok] = { name: x.sym, price: o.PRICE, chg: o.CHANGEPCT24HOUR, mcap: o.MKTCAP || null, cur: 'USD', hi52: o.HIGH24HOUR || null, lo52: o.LOW24HOUR || null };
            });
          } catch (e) {}
          // 2차 폴백: CoinGecko (id 기반)
          const missing = toks.filter(x => !out.crypto[x.tok]);
          if (missing.length) {
            try {
              const ids = missing.map(x => SYM2ID[x.sym] || x.tok.toLowerCase()).join(',');
              const d2 = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' + encodeURIComponent(ids), { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }).then(r => r.json());
              (Array.isArray(d2) ? d2 : []).forEach(o => {
                const hit = missing.find(x => (SYM2ID[x.sym] || x.tok.toLowerCase()) === o.id);
                if (hit) out.crypto[hit.tok] = { name: (o.symbol || o.id).toUpperCase(), price: o.current_price, chg: o.price_change_percentage_24h, mcap: o.market_cap || null, cur: 'USD', hi52: o.high_24h || null, lo52: o.low_24h || null };
              });
            } catch (e) {}
          }
        })());

        await Promise.all(tasks);

        /* 한국 주식 스파크라인 — 네이버 일별시세 (siseJson)  ← v10 에서는 /comm 안에 잘못 들어가 있었다 */
        if (kr.length) {
          const pad = n => String(n).padStart(2, '0');
          const fmt = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
          const endD = new Date();
          const startD = new Date(endD.getTime() - 65 * 86400000);   // 약 2개월(거래일 30일 확보)
          await Promise.all(kr.map(async code => {
            if (!out.kr[code]) return;
            try {
              const u = 'https://api.finance.naver.com/siseJson.naver?symbol=' + encodeURIComponent(code)
                      + '&requestType=1&startTime=' + fmt(startD) + '&endTime=' + fmt(endD) + '&timeframe=day';
              const t = await fetch(u, UA).then(r => r.text());
              /* 응답은 [날짜, 시가, 고가, 저가, 종가, 거래량, 외국인소진율] 행의 배열 형태 */
              const rows = [...t.matchAll(/\["(\d{8})",\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/g)];
              const closes = rows.map(m => parseFloat(m[5])).filter(v => !isNaN(v));
              if (closes.length >= 3) out.kr[code].spark = closes.slice(-30);
            } catch (e) {}
          }));
        }

        /* 암호화폐 스파크라인 — CryptoCompare 일봉 30개
           out.crypto 의 키는 요청한 그대로(bitcoin·btc 등)라 심볼로 바꿔서 조회한다 */
        if (cr.length) {
          await Promise.all(cr.map(async tok => {
            const o = out.crypto[tok];
            if (!o) return;
            const sym = String(o.name || tok).toUpperCase();
            try {
              const d = await fetch('https://min-api.cryptocompare.com/data/v2/histoday?fsym=' + encodeURIComponent(sym) + '&tsym=USD&limit=29')
                .then(r => r.json());
              const arr = d && d.Data && d.Data.Data;
              if (Array.isArray(arr) && arr.length) {
                o.spark = arr.map(x => x.close).filter(v => v != null);
              }
            } catch (e) {}
          }));
        }

        out._v = 14;
        return json(out, 30);
      }

      /* ── 뉴스 ── */
      if (url.pathname === '/news') {
        const feeds = [['매일경제', 'https://www.mk.co.kr/rss/30100041/'], ['한국경제', 'https://www.hankyung.com/feed/economy'], ['연합뉴스', 'https://www.yna.co.kr/rss/economy.xml']];
        const items = [];
        await Promise.all(feeds.map(async ([src, u]) => {
          try {
            const xml = await fetch(u, UA).then(r => r.text());
            for (const c of xml.split('<item>').slice(1, 8)) {
              const g = t => { const m = c.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>')); return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() : ''; };
              const title = g('title'), link = g('link'), pub = g('pubDate');
              if (title && link) items.push({ src, title, link, pub });
            }
          } catch (e) {}
        }));
        items.sort((a, b) => new Date(b.pub) - new Date(a.pub));
        return json(items.slice(0, 15), 180);
      }

      /* ⚠ 모르는 주소에는 404 를 준다.
         v10 은 여기서 200 + {ok:true} 를 돌려줘서, 사이트가 '성공'으로 착각하고
         다른 경로를 시도하지 않았다(기준금리 조회 실패의 원인). */
      if (url.pathname !== '/' && url.pathname !== '') {
        return new Response(JSON.stringify({ error: 'unknown path', path: url.pathname }), { status: 404, headers: cors });
      }
      return json({ ok: true, v: 14, endpoints: ['/kr', '/news', '/rates', '/comm', '/quote', '/search', '/fred', '/ecos', '/ecosword', '/stdict'] }, 0);
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
    }
  }
};
