/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — nn-assets.js
   자산 관리 — 주식 · 현금 · 부동산 · 배당 · 청약

   ⚠ 이 파일은 index.html 에서 정해진 순서로 불러옵니다.
     순서를 바꾸거나 async/defer 를 붙이면 '함수를 찾을 수 없음' 오류가 납니다.
     로딩 순서: nn-core.js → nn-assets.js → nn-modules.js
   ══════════════════════════════════════════════════════════════════════ */


(function(){
  var KEY='nn_assets_v1';
  var DEF={ fx:1380, blur:false, assets:[], debts:[], stocks:[], realty:[], sectors:['기술·IT','반도체','소프트웨어·인터넷','금융','헬스케어·제약','임의소비재','필수소비재','에너지','산업재','통신서비스','유틸리티','부동산·리츠','소재','ETF·펀드','암호화폐','기타'], snapshots:[], goal:{}, rebal:{}, scenario:{}, divGoals:[{id:'dg1',monthly:2000000},{id:'dg2',monthly:10000000}], incomes:[{id:'inc1',type:'근로',name:'근로소득',annual:'',taxRate:20},{id:'inc2',type:'금융',name:'금융소득',annual:'',taxRate:15.4}], paper:{init:10000000,cash:10000000,positions:[],log:[]} };
  var S=load(), sec='networth', wired=false;

  /* ═════════ 보유 종목 실시간 시세 (Worker 프록시) ═════════ */
  var LIVE={}, liveBusy=false, liveAt=0, liveMsg='', liveTimer=null;
  function wUrl(){ try{ return (localStorage.getItem('nn_worker_url')||'').trim().replace(/\/+$/,''); }catch(e){ return ''; } }
  function mktOf(st){
    var t=String(st.ticker||'').trim();
    if(!t) return null;
    if((st.ccy||'USD')==='KRW') return /^\d{6}$/.test(t) ? 'kr' : null;
    return 'us';
  }
  function liveTimeTxt(){ if(!liveAt) return ''; return new Date(liveAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}); }
  function liveCell(st){
    var L=LIVE[st.id];
    if(!L||L.chg==null||isNaN(L.chg)) return '';
    var cls=L.chg>0?'as-pos':(L.chg<0?'as-neg':'');
    var ar=L.chg>0?'\u25b2':(L.chg<0?'\u25bc':'\u00b7');
    return '<div class="as-live '+cls+'">'+ar+' '+(L.chg>0?'+':'')+L.chg.toFixed(2)+'%</div>';
  }
  function liveBtn(){
    var stt;
    if(liveBusy) stt='<span class="as-live-st busy">\uc2dc\uc138 \ubd88\ub7ec\uc624\ub294 \uc911\u2026</span>';
    else if(liveMsg) stt='<span class="as-live-st warn">'+esc(liveMsg)+'</span>';
    else if(liveAt) stt='<span class="as-live-st ok"><i class="as-live-dot"></i>\uc2e4\uc2dc\uac04 '+liveTimeTxt()+'</span>';
    else stt='<span class="as-live-st">\ud604\uc7ac\uac00 \uc790\ub3d9 \uac31\uc2e0</span>';
    return '<span class="as-live-wrap">'+stt+'<button class="as-live-btn" onclick="AssetsApp.liveRefresh()"'+(liveBusy?' disabled':'')+'>\ud83d\udd04 \uc2dc\uc138 \uac31\uc2e0</button></span>';
  }
  /* 오늘 손익 (원화 환산) */
  function dayPL(){
    var sum=0, has=false;
    S.stocks.forEach(function(st){
      var L=LIVE[st.id]; if(!L||L.chg==null||isNaN(L.chg)) return;
      var cp=num(st.curPrice), sh=num(st.shares); if(!cp||!sh) return;
      var prev=cp/(1+L.chg/100); if(!isFinite(prev)||prev<=0) return;
      var diff=(cp-prev)*sh;
      sum += ((st.ccy||'USD')==='USD') ? diff*num(S.fx) : diff;
      has=true;
    });
    return has?sum:null;
  }
  /* 입력 중에는 리렌더를 미뤄 포커스를 보호 */
  function safeRender(){
    if(sec==='apt') return;   /* 실거래가 화면은 시세 갱신과 무관 — 상태 보호 */
    var ae=document.activeElement;
    if(ae && ae.tagName && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName) && ae.closest && ae.closest('#asContent')){
      if(!ae.__asPend){ ae.__asPend=true; ae.addEventListener('blur', function(){ setTimeout(render,80); }, {once:true}); }
      return;
    }
    render();
  }
  async function fetchLive(manual){
    if(liveBusy) return;
    var W=wUrl();
    if(!W){ if(manual){ liveMsg='\ud504\ub85d\uc2dc(Worker) \uc8fc\uc18c\uac00 \uc5c6\uc2b5\ub2c8\ub2e4 \u2014 MACRO \ud0ed\uc5d0\uc11c \uc124\uc815\ud558\uc138\uc694'; safeRender(); } return; }
    var list=S.stocks.filter(function(st){ return mktOf(st) && num(st.shares)>0; });
    if(!list.length){ if(manual){ liveMsg='\uc870\ud68c\ud560 \uc885\ubaa9\uc774 \uc5c6\uc2b5\ub2c8\ub2e4 (\ud2f0\ucee4\u00b7\uc218\ub7c9 \ud544\uc694)'; safeRender(); } return; }
    liveBusy=true; liveMsg=''; safeRender();
    var us=[], kr=[];
    list.forEach(function(st){ var m=mktOf(st), t=String(st.ticker).trim();
      if(m==='us'){ if(us.indexOf(t.toUpperCase())<0) us.push(t.toUpperCase()); }
      else if(m==='kr'){ if(kr.indexOf(t)<0) kr.push(t); } });
    var qs=[];
    if(us.length) qs.push('us='+encodeURIComponent(us.join(',')));
    if(kr.length) qs.push('kr='+encodeURIComponent(kr.join(',')));
    var res=null;
    try{
      var r=await fetch(W+'/quote?'+qs.join('&'));
      if(!r.ok) throw new Error('HTTP '+r.status);
      res=await r.json();
    }catch(e){
      liveBusy=false; liveMsg='\uc2dc\uc138 \uc5f0\uacb0 \uc2e4\ud328 \u2014 \ud504\ub85d\uc2dc \uc8fc\uc18c\ub97c \ud655\uc778\ud558\uc138\uc694'; safeRender(); return;
    }
    res=res||{}; res.us=res.us||{}; res.kr=res.kr||{}; res.crypto=res.crypto||{};
    /* 미국 목록에서 못 찾은 심볼은 암호화폐로 재시도 */
    var miss=us.filter(function(t){ var o=res.us[t]; return !(o&&o.price>0); });
    if(miss.length){
      try{
        var r2=await fetch(W+'/quote?crypto='+encodeURIComponent(miss.map(function(t){return t.toLowerCase();}).join(',')));
        if(r2.ok){ var d2=await r2.json(); if(d2&&d2.crypto){ Object.keys(d2.crypto).forEach(function(k){ res.crypto[k]=d2.crypto[k]; }); } }
      }catch(e){}
    }
    var n=0, fail=0, changed=false;
    S.stocks.forEach(function(st){
      var m=mktOf(st); if(!m) return;
      var t=String(st.ticker).trim();
      var o=(m==='us') ? (res.us[t.toUpperCase()] || res.crypto[t.toLowerCase()]) : res.kr[t];
      if(o && o.price>0){
        var np=Math.round(o.price*10000)/10000;
        if(num(st.curPrice)!==np){ st.curPrice=np; changed=true; }
        if(!String(st.name||'').trim() && o.name){ st.name=o.name; changed=true; }
        LIVE[st.id]={p:np, chg:(typeof o.chg==='number'?o.chg:null), at:Date.now()};
        n++;
      } else { fail++; }
    });
    liveBusy=false; liveAt=Date.now();
    liveMsg = fail ? (n? (fail+'\uac1c \uc885\ubaa9 \uc2dc\uc138\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4') : '\uc2dc\uc138\ub97c \uac00\uc838\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4 \u2014 \ud2f0\ucee4\u00b7\ud1b5\ud654\ub97c \ud655\uc778\ud558\uc138\uc694') : '';
    if(changed) save();
    safeRender();
    if(manual && window.__nnToast) window.__nnToast(n? ('\u2713 '+n+'\uac1c \uc885\ubaa9 \uc2dc\uc138\ub97c \uac31\uc2e0\ud588\uc2b5\ub2c8\ub2e4') : '\uac31\uc2e0\ub41c \uc885\ubaa9\uc774 \uc5c6\uc2b5\ub2c8\ub2e4');
  }
  function liveAutoStart(){
    if(liveTimer) return;
    liveTimer=setInterval(function(){
      var pg=document.getElementById('page-assets');
      if(!pg || !pg.classList.contains('active')) return;
      if(document.hidden) return;
      if(sec!=='stocks' && sec!=='networth') return;
      fetchLive(false);
    }, 120000);
  }
  /* ═════════ 배당 정보 자동 조회 (Yahoo 배당 이력) ═════════ */
  var DIV={}, divBusy=false, divAt=0, divMsg='', divVia='';
  function divSyms(st){
    var t=String(st.ticker||'').trim(); if(!t) return [];
    if((st.ccy||'USD')==='KRW') return /^\d{6}$/.test(t) ? [t+'.KS', t+'.KQ'] : [t];
    return [t.toUpperCase()];
  }
  var DAY=86400000;
  /* Yahoo chart 응답에서 배당 이력 추출 */
  function parseDiv(txt){
    var j=JSON.parse(txt);
    var r=j&&j.chart&&j.chart.result&&j.chart.result[0];
    if(!r) throw new Error('no result');
    var ev=(r.events&&r.events.dividends)||{};
    var list=Object.keys(ev).map(function(k){
      var e=ev[k];
      return { ts:(e.date||parseInt(k,10))*1000, amt:parseFloat(e.amount)||0 };
    }).filter(function(x){ return x.amt>0 && x.ts>0; }).sort(function(a,b){ return a.ts-b.ts; });
    return { divs:list, price:(r.meta&&r.meta.regularMarketPrice)||0, cur:(r.meta&&r.meta.currency)||'' };
  }
  async function fetchDivSym(sym){
    var path='/v8/finance/chart/'+encodeURIComponent(sym)+'?range=2y&interval=1mo&events=div';
    var W=wUrl(), tries=[];
    if(W) tries.push({u:W+'/div?sym='+encodeURIComponent(sym), via:'worker'});
    tries.push({u:'https://api.allorigins.win/raw?url='+encodeURIComponent('https://query1.finance.yahoo.com'+path), via:'public'});
    var last=null;
    for(var i=0;i<tries.length;i++){
      try{
        var r=await fetch(tries[i].u);
        if(!r.ok) throw new Error('HTTP '+r.status);
        var o=parseDiv(await r.text());
        divVia=tries[i].via;
        return o;
      }catch(e){ last=e; }
    }
    throw last||new Error('fail');
  }
  /* 지급 주기 추정 후 직전 1주기분을 합산 (366일 창의 5회 중복 방지) */
  function divStat(divs){
    if(!divs||!divs.length) return null;
    var now=Date.now();
    var gaps=[];
    for(var i=1;i<divs.length;i++){ var g=divs[i].ts-divs[i-1].ts; if(g>0) gaps.push(g); }
    var freq=1;
    if(gaps.length){
      gaps.sort(function(a,b){ return a-b; });
      var med=gaps[Math.floor(gaps.length/2)];
      if(med>0) freq=Math.max(1, Math.min(12, Math.round(365*DAY/med)));
    }
    var recent=divs.slice(-freq);
    var ttm=recent.reduce(function(s,x){ return s+x.amt; },0);
    var last=divs[divs.length-1];
    return { ttm:ttm, freq:freq, last:last, recent:recent, stale:(now-last.ts)>400*DAY };
  }
  /* 다음 12개월 배당락 예상일 — 직전 1주기 날짜를 앞으로 투영 (1건당 1회만) */
  function projectEx(st){
    var d=DIV[st.id]; if(!d||!d.stat||d.stat.stale||!d.stat.recent.length) return [];
    var now=Date.now(), out=[];
    d.stat.recent.forEach(function(x){
      var t=new Date(x.ts), p=null;
      for(var y=1;y<=3;y++){
        var c=new Date(t.getFullYear()+y, t.getMonth(), t.getDate());
        if(c.getTime()>now){ p=c; break; }
      }
      if(p && (p.getTime()-now)<=372*DAY) out.push({ ts:p.getTime(), amt:x.amt });
    });
    return out.sort(function(a,b){ return a.ts-b.ts; });
  }
  /* 종목 배당을 원화 세후로 환산 */
  function divKrw(st, perShare){
    var a=perShare*num(st.shares);
    var aK=(st.ccy||'USD')==='USD' ? a*num(S.fx) : a;
    return { pre:aK, post:divAfterTax(aK, st.ccy||'USD') };
  }
  /* 월별 예상 배당 (앞으로 12개월) */
  function divCalendar(){
    var months=[], base=new Date(); base.setDate(1); base.setHours(0,0,0,0);
    for(var i=0;i<12;i++){
      var m=new Date(base.getFullYear(), base.getMonth()+i, 1);
      months.push({ y:m.getFullYear(), m:m.getMonth(), amt:0, items:[] });
    }
    S.stocks.forEach(function(st){
      projectEx(st).forEach(function(p){
        var dt=new Date(p.ts);
        for(var i=0;i<months.length;i++){
          if(months[i].y===dt.getFullYear() && months[i].m===dt.getMonth()){
            var k=divKrw(st, p.amt);
            months[i].amt+=k.post;
            months[i].items.push({ tk:(st.ticker||st.name||'?'), ts:p.ts, won:k.post });
            break;
          }
        }
      });
    });
    return months;
  }
  /* 다가오는 배당락일 (전 종목 통합) */
  function divUpcoming(limit){
    var out=[];
    S.stocks.forEach(function(st){
      projectEx(st).forEach(function(p){
        out.push({ tk:(st.ticker||st.name||'?'), nm:(st.name||''), ts:p.ts, per:p.amt, ccy:(st.ccy||'USD'), won:divKrw(st,p.amt).post });
      });
    });
    out.sort(function(a,b){ return a.ts-b.ts; });
    return out.slice(0, limit||12);
  }
  async function fetchDiv(manual){
    if(divBusy) return;
    var list=S.stocks.filter(function(st){ return String(st.ticker||'').trim() && num(st.shares)>0; });
    if(!list.length){ if(manual){ divMsg='\uc885\ubaa9\uc744 \uba3c\uc800 \ub4f1\ub85d\ud558\uc138\uc694 (\ud2f0\ucee4\u00b7\uc218\ub7c9 \ud544\uc694)'; render(); } return; }
    divBusy=true; divMsg=''; render();
    var ok=0, miss=[], changed=false;
    for(var i=0;i<list.length;i++){
      var st=list[i], syms=divSyms(st), got=null;
      for(var k=0;k<syms.length && !got;k++){
        try{
          var o=await fetchDivSym(syms[k]);
          if(o && o.divs.length) got=o;
        }catch(e){}
      }
      if(got){
        var stat=divStat(got.divs);
        DIV[st.id]={ stat:stat, price:got.price, cur:got.cur, at:Date.now() };
        if(stat && stat.ttm>0 && !stat.stale){
          var v=Math.round(stat.ttm*10000)/10000;
          if(num(st.divPerShare)!==v){ st.divPerShare=v; changed=true; }
        }
        ok++;
      } else { miss.push(st.ticker||st.name||'?'); }
    }
    if(changed) save();
    divBusy=false; divAt=Date.now();
    divMsg = miss.length ? ('\ubc30\ub2f9 \uae30\ub85d \uc5c6\uc74c: '+miss.slice(0,4).join(', ')+(miss.length>4?' \uc678 '+(miss.length-4)+'\uac1c':'')) : '';
    pushDdayDiv();
    render();
    if(manual && window.__nnToast) window.__nnToast(ok? ('\u2713 '+ok+'\uac1c \uc885\ubaa9\uc758 \ubc30\ub2f9 \uc815\ubcf4\ub97c \ubd88\ub7ec\uc654\uc2b5\ub2c8\ub2e4') : '\ubc30\ub2f9 \uc815\ubcf4\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4');
  }
  /* D-DAY 위젯에 배당락일 전달 */
  function pushDdayDiv(){
    if(!window.__ddSetDiv) return;
    var ev=divUpcoming(6).map(function(x){
      var d=new Date(x.ts);
      return { d: d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),
               t: x.tk+' \ubc30\ub2f9\ub77d', tag:'DIV' };
    });
    window.__ddSetDiv(ev);
  }
  window.__nnDivPush=pushDdayDiv;

  /* ═════════ 청약 일정 (한국부동산원 청약홈 · data.go.kr) ═════════ */
  var SUB={ area:'', kind:'all', rows:[], busy:false, err:'', done:false, via:'', at:0 };
  var SUB_API='https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail';
  var SUB_AREAS=['서울','경기','인천','부산','대구','광주','대전','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'];

  function subKey(){ try{ return (localStorage.getItem('nn_apt_key')||'').trim(); }catch(e){ return ''; } }
  function subEnc(k){ k=String(k||'').trim(); return /%[0-9A-Fa-f]{2}/.test(k)? k : encodeURIComponent(k); }
  function d8(dt){ /* Date → YYYY-MM-DD */
    return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  }
  function pd(v){ /* 'YYYY-MM-DD' 또는 'YYYYMMDD' → Date */
    var s=String(v||'').trim(); if(!s) return null;
    var m=s.match(/^(\d{4})[-.\/]?(\d{2})[-.\/]?(\d{2})/);
    if(!m) return null;
    var d=new Date(+m[1], +m[2]-1, +m[3]);
    return isNaN(d.getTime())? null : d;
  }
  function dTxt(d){ return d? (String(d.getFullYear()).slice(2)+'.'+(d.getMonth()+1)+'.'+d.getDate()) : '—'; }
  function dday(d){
    if(!d) return null;
    var t=new Date(); t.setHours(0,0,0,0);
    return Math.round((d.getTime()-t.getTime())/86400000);
  }
  function p1(o){ for(var i=1;i<arguments.length;i++){ var v=o[arguments[i]]; if(v!=null && String(v).trim()!=='') return String(v).trim(); } return ''; }

  function subNorm(o){
    /* 1순위 접수일은 해당지역 → 기타경기 → 기타지역 순으로 존재하는 값 사용 */
    var rk1=p1(o,'GNRL_RNK1_CRSPAREA_RCPTDE','GNRL_RNK1_ETC_GG_RCPTDE','GNRL_RNK1_ETC_AREA_RCPTDE');
    var sp=p1(o,'SPSPLY_RCEPT_BGNDE');
    var spE=p1(o,'SPSPLY_RCEPT_ENDDE');
    var name=p1(o,'HOUSE_NM');
    var bgn=pd(sp)||pd(rk1);
    var end=pd(p1(o,'GNRL_RNK2_ETC_AREA_RCPTDE','GNRL_RNK2_CRSPAREA_RCPTDE','GNRL_RNK1_ETC_AREA_RCPTDE'))||pd(rk1)||pd(spE);
    return {
      name: name,
      area: p1(o,'SUBSCRPT_AREA_CODE_NM'),
      addr: p1(o,'HSSPLY_ADRES'),
      kind: p1(o,'RENT_SECD_NM','HOUSE_DTL_SECD_NM'),
      dtl:  p1(o,'HOUSE_DTL_SECD_NM'),
      total: parseInt(p1(o,'TOT_SUPLY_HSHLDCO').replace(/[^0-9]/g,''),10)||0,
      biz:  p1(o,'BSNS_MBY_NM'),
      tel:  p1(o,'MDHS_TELNO'),
      notice: pd(p1(o,'RCRIT_PBLANC_DE')),
      sp: pd(sp), spE: pd(spE),
      rk1: pd(rk1),
      win: pd(p1(o,'PRZWNER_PRESNATN_DE')),
      ctB: pd(p1(o,'CNTRCT_CNCLS_BGNDE')), ctE: pd(p1(o,'CNTRCT_CNCLS_ENDDE')),
      url: p1(o,'PBLANC_URL','HMPG_ADRES'),
      bgn: bgn, end: end
    };
  }
  function subParse(txt){
    var t=String(txt||'').trim();
    if(!t) throw new Error('빈 응답을 받았습니다.');
    if(t.charAt(0)!=='{' && t.charAt(0)!=='['){
      if(/SERVICE[_ ]?KEY|SERVICE ERROR|등록되지 않은/i.test(t)) throw new Error('서비스키가 등록되지 않았습니다 — 청약홈 API도 따로 활용신청이 필요합니다.');
      throw new Error('응답을 해석할 수 없습니다 (JSON이 아님).');
    }
    var j=JSON.parse(t);
    if(j && j.code && j.msg && !j.data) throw new Error('API 오류 ('+j.code+') '+j.msg);
    var arr = Array.isArray(j.data) ? j.data : (Array.isArray(j) ? j : []);
    return { items: arr.map(subNorm), total: (j.matchCount||j.totalCount||arr.length) };
  }
  async function subFetchPage(page){
    var k=subKey();
    var since=new Date(); since.setMonth(since.getMonth()-2);
    var qs='page='+page+'&perPage=100&cond%5BRCRIT_PBLANC_DE%3A%3AGTE%5D='+encodeURIComponent(d8(since))
         +'&serviceKey='+subEnc(k);
    var target=SUB_API+'?'+qs;
    var W=wUrl(), tries=[];
    if(W) tries.push({u:W+'/subscribe?page='+page+'&since='+encodeURIComponent(d8(since))+'&key='+encodeURIComponent(k), via:'worker'});
    tries.push({u:'https://api.allorigins.win/raw?url='+encodeURIComponent(target), via:'public'});
    var last=null;
    for(var i=0;i<tries.length;i++){
      try{
        var r=await fetch(tries[i].u);
        if(!r.ok) throw new Error('HTTP '+r.status);
        var res=subParse(await r.text());
        SUB.via=tries[i].via;
        return res;
      }catch(e){
        last=e;
        if(e && e.message && /서비스키|활용신청/.test(e.message)) throw e;
      }
    }
    throw last||new Error('조회에 실패했습니다.');
  }
  async function subFetch(manual){
    if(SUB.busy) return;
    if(!subKey()){ SUB.err='공공데이터 API 키가 필요합니다 — 아파트 실거래가 화면에서 먼저 저장하세요.'; SUB.done=false; render(); return; }
    SUB.busy=true; SUB.err=''; render();
    var all=[];
    try{
      for(var pg=1; pg<=3; pg++){
        var r=await subFetchPage(pg);
        all=all.concat(r.items);
        if(all.length>=r.total || r.items.length<100) break;
      }
      /* 최근 종료분 + 앞으로 예정분만 남기고 공고일 최신순 */
      var cut=new Date(); cut.setDate(cut.getDate()-21);
      SUB.rows=all.filter(function(x){ return x.name && (!x.end || x.end.getTime()>=cut.getTime()); })
                  .sort(function(a,b){
                    var ab=a.bgn?a.bgn.getTime():0, bb=b.bgn?b.bgn.getTime():0;
                    return bb-ab;
                  });
      SUB.done=true; SUB.at=Date.now();
      subPushDday();
    }catch(e){ SUB.err=(e&&e.message)||'조회에 실패했습니다.'; }
    SUB.busy=false; render();
    if(manual && window.__nnToast) window.__nnToast(SUB.err? '청약 정보를 불러오지 못했습니다' : ('✓ 청약 공고 '+SUB.rows.length+'건을 불러왔습니다'));
  }
  /* D-DAY 위젯에 접수 시작일·당첨자 발표일 전달 */
  function subPushDday(){
    if(!window.__ddSetSub) return;
    var now=new Date(); now.setHours(0,0,0,0);
    var ev=[];
    subView().slice(0,40).forEach(function(x){
      function add(d,label){
        if(!d || d.getTime()<now.getTime()) return;
        if((d.getTime()-now.getTime())>200*86400000) return;
        ev.push({ d:d8(d), t:x.name+' '+label, tag:'청약' });
      }
      add(x.rk1, '1순위 접수');
      add(x.win, '당첨자 발표');
    });
    ev.sort(function(a,b){ return a.d<b.d?-1:1; });
    window.__ddSetSub(ev.slice(0,8));
  }
  function subView(){
    return SUB.rows.filter(function(x){
      if(SUB.area && x.area.indexOf(SUB.area)<0) return false;
      if(SUB.kind==='sale' && /임대/.test(x.kind)) return false;
      if(SUB.kind==='rent' && !/임대/.test(x.kind)) return false;
      return true;
    });
  }


  function load(){
    var o=null;
    try{ var r=JSON.parse(localStorage.getItem(KEY)); if(r&&typeof r==='object') o=Object.assign({}, JSON.parse(JSON.stringify(DEF)), r); }catch(e){}
    if(!o) o=JSON.parse(JSON.stringify(DEF));
    /* 이전 버전 데이터에는 realty 가 없다 */
    if(!Array.isArray(o.realty)) o.realty=[];
    return o;
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
  var fxAutoTried=false;
  function fetchFx(auto){
    var st=document.getElementById('asFxStatus');
    if(st && !auto) st.textContent='불러오는 중…';
    var apply=function(v){ if(v>0){ S.fx=Math.round(v*100)/100; save(); render(); var s2=document.getElementById('asFxStatus'); if(s2) s2.textContent='실시간 반영 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}); } };
    var fail=function(){ var s3=document.getElementById('asFxStatus'); if(s3 && !auto) s3.textContent='실시간 불러오기 실패 · 수동 입력하세요'; };
    fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json').then(function(r){return r.json();}).then(function(j){ var vv=j&&j.usd&&j.usd.krw; if(vv) apply(vv); else throw 0; })
    .catch(function(){ fetch('https://latest.currency-api.pages.dev/v1/currencies/usd.json').then(function(r){return r.json();}).then(function(j){ var vv=j&&j.usd&&j.usd.krw; if(vv) apply(vv); else throw 0; })
    .catch(function(){ fetch('https://api.frankfurter.app/latest?from=USD&to=KRW').then(function(r){return r.json();}).then(function(j){ var vv=j&&j.rates&&j.rates.KRW; if(vv) apply(vv); else throw 0; })
    .catch(function(){ fetch('https://open.er-api.com/v6/latest/USD').then(function(r){return r.json();}).then(function(j){ var vv=j&&j.rates&&j.rates.KRW; if(vv) apply(vv); else throw 0; }).catch(fail); }); }); });
  }
  function uid(){ return 'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function num(v){ var n=parseFloat(v); return isNaN(n)?0:n; }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
  function hex2rgb(h){ h=String(h||'').replace('#',''); if(h.length===3) h=h.split('').map(function(c){return c+c;}).join(''); return [parseInt(h.substr(0,2),16)||0,parseInt(h.substr(2,2),16)||0,parseInt(h.substr(4,2),16)||0]; }
  function shade(hex,f){ if(String(hex).indexOf('#')!==0) return hex; var c=hex2rgb(hex); return 'rgb('+c.map(function(x){return Math.max(0,Math.min(255,Math.round(x*f)));}).join(',')+')'; }
  function won(n){ n=Math.round(n||0); return '\u20a9'+n.toLocaleString('ko-KR'); }
  function wonKo(n){ n=Math.round(n||0); var neg=n<0; n=Math.abs(n); var eok=Math.floor(n/1e8), man=Math.floor((n%1e8)/1e4), w=n%1e4; var p=[]; if(eok)p.push(eok+'억'); if(man)p.push(man.toLocaleString('ko-KR')+'만'); if(w||!p.length)p.push(w.toLocaleString('ko-KR')); return (neg?'-':'')+p.join(' ')+'원'; }
  function pctTxt(n){ return (n>=0?'+':'')+n.toFixed(2)+'%'; }
  var ARR={asset:'assets',debt:'debts',stock:'stocks',income:'incomes',realty:'realty'};

  function stockEval(st){ var c=num(st.curPrice)*num(st.shares); return st.ccy==='USD'? c*num(S.fx):c; }
  function stockCost(st){ var bfx=(st.ccy==='USD')?(num(st.buyFx)||num(S.fx)):1; return num(st.avgPrice)*num(st.shares)*bfx; }
  function stockFxPL(st){ if((st.ccy||'USD')!=='USD') return 0; var bfx=num(st.buyFx)||num(S.fx); return num(st.curPrice)*num(st.shares)*(num(S.fx)-bfx); }
  function assetTotal(){ var t=0; S.assets.forEach(function(a){ t+=num(a.amount); }); return t; }
  function debtTotal(){ var t=0; S.debts.forEach(function(d){ t+=num(d.amount); }); return t; }
  function stockTotal(){ var t=0; S.stocks.forEach(function(s){ t+=stockEval(s); }); return t; }
  /* 보유 부동산 — 부동산 탭에서 입력하면 자산 현황에 자동 반영된다 */
  function realtyTotal(){ var t=0; (S.realty||[]).forEach(function(r){ t+=num(r.value); }); return t; }
  function realtyLoan(){ var t=0; (S.realty||[]).forEach(function(r){ t+=num(r.loan); }); return t; }
  function realtyEquity(){ return realtyTotal()-realtyLoan(); }
  function grossAssets(){ return assetTotal()+stockTotal()+realtyTotal(); }
  function grossDebts(){ return debtTotal()+realtyLoan(); }
  function netWorth(){ return grossAssets()-grossDebts(); }
  /* 자산 표에 '부동산'을 직접 적어 두면 보유 부동산과 이중 계산된다 */
  function realtyDup(){
    if(!(S.realty||[]).length) return 0;
    var t=0; S.assets.forEach(function(a){ if((a.type||'')==='부동산') t+=num(a.amount); });
    return t;
  }

  var PAL=['#ff4d4d','#ff8a3d','#ffd166','#4ade80','#38bdf8','#b28ad4','#f472b6','#9ca3af','#22d3ee','#facc15'];
  function donut(parts, lab, val){
    var total=parts.reduce(function(s,p){return s+p.v;},0);
    if(total<=0) return '<div class="as-empty">\uB370\uC774\uD130\uB97C \uC785\uB825\uD558\uBA74 \uCC28\uD2B8\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4</div>';
    var R=54,c=2*Math.PI*R,off=0,segs='',defs='<defs>';
    var gap=parts.length>1?4.2:0;
    parts.forEach(function(p,i){ var col=p.c||PAL[i%PAL.length];
      defs+='<linearGradient id="asg'+i+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+shade(col,1.5)+'"/><stop offset=".55" stop-color="'+col+'"/><stop offset="1" stop-color="'+shade(col,.55)+'"/></linearGradient>';
      var len=c*(p.v/total), draw=Math.max(0.001,len-gap);
      segs+='<circle cx="60" cy="60" r="'+R+'" fill="none" stroke="url(#asg'+i+')" stroke-width="14" stroke-linecap="round" stroke-dasharray="'+draw+' '+(c-draw)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 60 60)"></circle>'; off+=len; });
    defs+='<filter id="asShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="1.5" stdDeviation="2.4" flood-color="#000" flood-opacity="0.55"/></filter></defs>';
    var track='<circle cx="60" cy="60" r="'+R+'" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="14"></circle>';
    var leg=parts.map(function(p,i){ var f=p.v/total*100; var col=p.c||PAL[i%PAL.length];
      return '<div class="as-leg"><span class="sw" style="background:'+col+'"></span><span class="ln">'+esc(p.name)+'</span><span class="lp">'+f.toFixed(1)+'%</span><span class="lv blurable">'+won(p.v)+'</span></div>'; }).join('');
    return '<div class="as-donut-wrap"><div class="as-donut"><svg viewBox="-14 -14 148 148" style="width:100%;height:100%;overflow:visible">'+defs+track+'<g filter="url(#asShadow)">'+segs+'</g></svg><div class="as-donut-center"><div class="dc-lab">'+(lab||'')+'</div><div class="dc-val blurable">'+(val||'')+'</div></div></div><div class="as-legend">'+leg+'</div></div>';
  }
  function typeOpts(sel){ return ['\uD604\uAE08','\uBD80\uB3D9\uC0B0','\uAE08\uC735','\uAE30\uD0C0'].map(function(t){return '<option'+(t===sel?' selected':'')+'>'+t+'</option>';}).join(''); }
  function debtTypeOpts(sel){ return ['담보대출','신용·레버리지','기타'].map(function(t){return '<option'+(t===sel?' selected':'')+'>'+t+'</option>';}).join(''); }
  function ccyOpts(sel){ return ['USD','KRW'].map(function(t){return '<option'+(t===sel?' selected':'')+'>'+t+'</option>';}).join(''); }

  /* ───────── 자산현황 ───────── */
  /* 다른 탭에서 들어온 값 — 여기서는 읽기 전용으로 보여준다 */
  function autoRow(label, sub, amount, goSec){
    return '<tr class="as-auto"><td><span class="as-auto-b">자동</span></td>'
      +'<td>'+esc(label)+'<span class="as-auto-s">'+esc(sub)+'</span></td>'
      +'<td class="num blurable">'+won(amount)+'</td>'
      +'<td><span class="as-auto-go" title="'+esc(goSec[1])+'로 이동" onclick="AssetsApp.go(\''+goSec[0]+'\')">\u2197</span></td></tr>';
  }
  function autoAssetRows(){
    var out='', sT=stockTotal(), rT=realtyTotal();
    if(rT>0) out+=autoRow('부동산', (S.realty||[]).length+'건 · 시세 합계', rT, ['realty','부동산']);
    if(sT>0) out+=autoRow('주식·코인', S.stocks.length+'종목 · 실시간 평가액', sT, ['stocks','주식']);
    return out;
  }
  function autoDebtRows(){
    var rL=realtyLoan();
    if(rL<=0) return '';
    return autoRow('담보대출', '보유 부동산 대출 잔액', rL, ['realty','부동산']);
  }
  function dupWarn(){
    var d=realtyDup();
    if(d<=0) return '';
    return '<div class="rt-warn">\u26a0 종류가 <b>부동산</b>인 항목('+won(d)+')이 아래 표에 있습니다. 부동산 탭에 등록한 보유 부동산과 <b>이중 계산</b>되니 한쪽만 남겨 주세요.</div>';
  }

  function viewNet(){
    var aT=assetTotal(), sT=stockTotal(), rT=realtyTotal(), rL=realtyLoan();
    var dT=grossDebts(), nw=netWorth(), totAssets=grossAssets();
    var sp=stockSplit();
    var lev=0; S.debts.forEach(function(d){ if(d.type==='신용·레버리지') lev+=num(d.amount); });
    var byType={}; S.assets.forEach(function(a){ var t=a.type||'\uAE30\uD0C0'; byType[t]=(byType[t]||0)+num(a.amount); });
    var parts=[]; Object.keys(byType).forEach(function(t){ parts.push({name:t,v:byType[t]}); });
    if(sT>0) parts.push({name:'\uC8FC\uC2DD',v:sT,c:'#ff4d4d'});
    if(rT>0) parts.push({name:'\ubd80\ub3d9\uc0b0',v:rT,c:'#b28ad4'});
    parts.sort(function(a,b){return b.v-a.v;});
    var debtRatio=totAssets>0?dT/totAssets*100:0, cashRatio=totAssets>0?(byType['\uD604\uAE08']||0)/totAssets*100:0;
    var aRows=S.assets.map(function(a){ return '<tr><td><select onchange="AssetsApp.edit(\'asset\',\''+a.id+'\',\'type\',this.value)">'+typeOpts(a.type)+'</select></td><td><input value="'+esc(a.name)+'" placeholder="\uD56D\uBAA9\uBA85" onchange="AssetsApp.edit(\'asset\',\''+a.id+'\',\'name\',this.value)"></td><td><input type="number" class="blurable" value="'+(a.amount||'')+'" placeholder="0" onchange="AssetsApp.edit(\'asset\',\''+a.id+'\',\'amount\',this.value)"></td><td><span class="as-rowdel" onclick="AssetsApp.del(\'asset\',\''+a.id+'\')">\u2715</span></td></tr>'; }).join('');
    var dRows=S.debts.map(function(d){ return '<tr><td><select style="width:120px" onchange="AssetsApp.edit(\'debt\',\''+d.id+'\',\'type\',this.value)">'+debtTypeOpts(d.type)+'</select></td><td><input value="'+esc(d.name)+'" placeholder="\uBD80\uCC44\uBA85" onchange="AssetsApp.edit(\'debt\',\''+d.id+'\',\'name\',this.value)"></td><td><input type="number" class="blurable" value="'+(d.amount||'')+'" placeholder="0" onchange="AssetsApp.edit(\'debt\',\''+d.id+'\',\'amount\',this.value)"></td><td><span class="as-rowdel" onclick="AssetsApp.del(\'debt\',\''+d.id+'\')">\u2715</span></td></tr>'; }).join('');
    return '<div class="as-sec-head">NET WORTH</div><div class="as-sec-sub">\uc8fc\uc2dd\uacfc \ubd80\ub3d9\uc0b0\uc740 \uac01 \ud0ed\uc5d0\uc11c \uc785\ub825\ud55c \uac12\uc774 \uc790\ub3d9\uc73c\ub85c \ud569\uc0b0\ub429\ub2c8\ub2e4. \ud604\uae08\u00b7\uae08\uc735 \ub4f1 \ub098\uba38\uc9c0\ub9cc \uc9c1\uc811 \uc801\uc73c\uba74 \uc21c\uc790\uc0b0\uc774 \uc644\uc131\ub429\ub2c8\ub2e4.</div>'
      +'<div class="as-grid">'
      +'<div class="as-card span12"><div class="as-card-t">\uC21C\uC790\uC0B0 (NET WORTH)</div><div class="as-big red blurable">'+won(nw)+'</div><div class="as-sub-amt blurable" style="color:rgba(255,255,255,.72);font-size:13px;margin-top:3px">'+wonKo(nw)+'</div><div class="as-sub-amt blurable">\uCD1D\uC790\uC0B0 '+won(totAssets)+' \u2212 \uCD1D\uBD80\uCC44 '+won(dT)+'</div>'
      +'<div class="as-kpis"><div class="as-kpi"><div class="k">\uCD1D\uC790\uC0B0</div><div class="v blurable">'+won(totAssets)+'</div></div><div class="as-kpi"><div class="k">\uCD1D\uBD80\uCC44</div><div class="v blurable">'+won(dT)+'</div></div><div class="as-kpi"><div class="k">레버리지</div><div class="v blurable">'+won(lev)+'</div></div><div class="as-kpi"><div class="k">\uBD80\uCC44\uBE44\uC728</div><div class="v">'+debtRatio.toFixed(1)+'%</div></div><div class="as-kpi"><div class="k">\uD604\uAE08\uC131 \uBE44\uC911</div><div class="v">'+cashRatio.toFixed(1)+'%</div></div></div></div>'
      +'<div class="as-card span12"><div class="as-card-t">\uC790\uC0B0 \uBC30\uBD84</div>'+donut(parts,'\uCD1D\uC790\uC0B0',won(totAssets))+'</div>'
      +'<div class="as-card span6"><div class="as-card-t">통화 구성 <span class="as-mini">원화 / 외화</span></div>'+barsHtml([{name:'원화 자산',v:aT+rT+sp.krw,c:'#4ade80'},{name:'외화 자산(USD)',v:sp.usd,c:'#38bdf8'}])+'</div>'
      +'<div class="as-card span6"><div class="as-card-t">유형 구성 <span class="as-mini">유동 / 고정</span></div>'+barsHtml([{name:'유동자산 (현금·금융·주식 등)',v:(byType['현금']||0)+(byType['금융']||0)+(byType['기타']||0)+sT,c:'#ff8a3d'},{name:'고정자산 (부동산)',v:(byType['부동산']||0)+rT,c:'#b28ad4'}])+'</div>'
      +'<div class="as-card span6"><div class="as-card-t">\uC790\uC0B0 <span class="as-mini">\uB2E8\uC704: \uC6D0</span></div><table class="as-table"><thead><tr><th>\uC885\uB958</th><th>\uD56D\uBAA9</th><th>\uAE08\uC561</th><th></th></tr></thead><tbody>'+autoAssetRows()+(aRows||'')+'</tbody></table>'+((S.assets.length||sT>0||rT>0)?'':'<div class="as-empty">\uC790\uC0B0\uC744 \uCD94\uAC00\uD558\uC138\uC694</div>')+'<button class="as-btn ghost" onclick="AssetsApp.add(\'asset\')">+ \uC790\uC0B0 \uCD94\uAC00</button>'+dupWarn()+'</div>'
      +'<div class="as-card span6"><div class="as-card-t">\uBD80\uCC44 <span class="as-mini">\uB2E8\uC704: \uC6D0</span></div><table class="as-table"><thead><tr><th>종류</th><th>\uBD80\uCC44\uBA85</th><th>\uAE08\uC561</th><th></th></tr></thead><tbody>'+autoDebtRows()+(dRows||'')+'</tbody></table>'+((S.debts.length||rL>0)?'':'<div class="as-empty">\uBD80\uCC44\uB97C \uCD94\uAC00\uD558\uC138\uC694</div>')+'<button class="as-btn ghost" onclick="AssetsApp.add(\'debt\')">+ \uBD80\uCC44 \uCD94\uAC00</button></div>'
      +'</div>';
  }

  /* ───────── 주식 ───────── */
  function viewStocks(){
    var ev=stockTotal(), cost=0; S.stocks.forEach(function(s){cost+=stockCost(s);});
    var pl=ev-cost, plp=cost>0?pl/cost*100:0;
    var wparts=S.stocks.map(function(s){ return {name:(s.ticker||s.name||'?'), v:stockEval(s)}; }).filter(function(p){return p.v>0;}).sort(function(a,b){return b.v-a.v;});
    var bySec={},byCcy={}; S.stocks.forEach(function(s){ var e=stockEval(s); if(e<=0)return; var sc=s.sector||'\uBBF8\uBD84\uB958'; bySec[sc]=(bySec[sc]||0)+e; byCcy[s.ccy||'USD']=(byCcy[s.ccy||'USD']||0)+e; });
    function bars(map){ var keys=Object.keys(map); var tot=keys.reduce(function(s,k){return s+map[k];},0); if(tot<=0) return '<div class="as-empty">\uB370\uC774\uD130 \uC5C6\uC74C</div>'; return '<div class="as-seg">'+keys.sort(function(a,b){return map[b]-map[a];}).map(function(k,i){ var f=map[k]/tot*100; var col=PAL[i%PAL.length]; return '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;font-family:Pretendard"><span style="color:rgba(240,237,230,.8)">'+esc(k)+'</span><span style="color:#fff">'+f.toFixed(1)+'%</span></div><div class="as-bar"><span style="width:'+f+'%;background:'+col+'"></span></div></div>'; }).join('')+'</div>'; }
    var rows=S.stocks.map(function(s){ var e=stockEval(s),cst=stockCost(s),p=e-cst,pp=cst>0?p/cst*100:0,w=ev>0?e/ev*100:0,fxpl=stockFxPL(s),isUsd=(s.ccy||'USD')==='USD';
      return '<tr><td><input value="'+esc(s.ticker)+'" placeholder="TICKER" style="width:80px" onchange="AssetsApp.edit(\'stock\',\''+s.id+'\',\'ticker\',this.value)"></td>'
        +'<td><input value="'+esc(s.name)+'" placeholder="\uC885\uBAA9\uBA85" onchange="AssetsApp.edit(\'stock\',\''+s.id+'\',\'name\',this.value)"></td>'
        +'<td><select style="width:74px" onchange="AssetsApp.edit(\'stock\',\''+s.id+'\',\'ccy\',this.value)">'+ccyOpts(s.ccy||'USD')+'</select></td>'
        +'<td><input type="number" value="'+(s.shares||'')+'" placeholder="0" onchange="AssetsApp.edit(\'stock\',\''+s.id+'\',\'shares\',this.value)"></td>'
        +'<td><input type="number" value="'+(s.avgPrice||'')+'" placeholder="0" onchange="AssetsApp.edit(\'stock\',\''+s.id+'\',\'avgPrice\',this.value)"></td>'
        +'<td><input type="number" value="'+(s.curPrice||'')+'" placeholder="0" onchange="AssetsApp.edit(\'stock\',\''+s.id+'\',\'curPrice\',this.value)">'+liveCell(s)+'</td>'
        +'<td>'+(isUsd?'<input type="number" value="'+(s.buyFx||'')+'" placeholder="'+num(S.fx)+'" style="width:82px" onchange="AssetsApp.edit(\'stock\',\''+s.id+'\',\'buyFx\',this.value)">':'<span style="color:rgba(255,255,255,.28)">—</span>')+'</td>'+'<td><select style="width:130px" onchange="AssetsApp.edit(\'stock\',\''+s.id+'\',\'sector\',this.value)">'+sectorOpts(s.sector)+'</select></td>'
        +'<td class="num blurable">'+won(cst)+'</td>'
        +'<td class="num blurable">'+won(e)+'</td>'
        +'<td class="num '+(p>=0?'as-pos':'as-neg')+' blurable">'+(p>=0?'+':'')+won(p)+'</td>'
        +'<td class="num '+(fxpl>=0?'as-pos':'as-neg')+'">'+(isUsd?('<span class="blurable">'+(fxpl>=0?'+':'')+won(fxpl)+'</span>'):'<span style="color:rgba(255,255,255,.28)">—</span>')+'</td>'
        +'<td class="num '+(p>=0?'as-pos':'as-neg')+'">'+pctTxt(pp)+'</td>'
        +'<td class="num">'+w.toFixed(1)+'%</td>'
        +'<td><span class="as-rowdel" onclick="AssetsApp.del(\'stock\',\''+s.id+'\')">\u2715</span></td></tr>'; }).join('');
    return '<div class="as-sec-head">STOCK PORTFOLIO</div><div class="as-sec-sub">\uBCF4\uC720 \uC8FC\uC2DD\uC744 \uC785\uB825\uD558\uBA74 \uBE44\uC911\u00B7\uC190\uC775\u00B7\uBD84\uC0B0\uC744 \uBD84\uC11D\uD569\uB2C8\uB2E4. \ud604\uc7ac\uac00\ub294 \ud504\ub85d\uc2dc\ub85c \uc790\ub3d9 \uac31\uc2e0\ub418\uba70, \uc9c1\uc811 \uc218\uc815\ud560 \uc218\ub3c4 \uc788\uc2b5\ub2c8\ub2e4.</div>'
      +'<div class="as-grid">'
      +'<div class="as-card span12"><div class="as-card-t">\uC8FC\uC2DD \uD3C9\uAC00\uCD1D\uC561'+liveBtn()+'</div><div class="as-big blurable">'+won(ev)+'</div><div class="as-sub-amt blurable">\uC6D0\uAE08 '+won(cost)+' \u00B7 \uD3C9\uAC00\uC190\uC775 <span class="'+(pl>=0?'as-pos':'as-neg')+'">'+won(pl)+' ('+pctTxt(plp)+')</span></div>'
      +(function(){ var dp=dayPL(); if(dp==null) return '';
          var tot=ev-dp, dpp=tot>0?dp/tot*100:0;
          return '<div class="as-kpis"><div class="as-kpi"><div class="k">\uc624\ub298 \uc190\uc775</div><div class="v blurable '+(dp>=0?'as-pos':'as-neg')+'">'+(dp>=0?'+':'')+won(dp)+'</div></div>'
            +'<div class="as-kpi"><div class="k">\uc624\ub298 \ub4f1\ub77d\ub960</div><div class="v '+(dp>=0?'as-pos':'as-neg')+'">'+pctTxt(dpp)+'</div></div>'
            +'<div class="as-kpi"><div class="k">\ud3c9\uac00\uc190\uc775\ub960</div><div class="v '+(pl>=0?'as-pos':'as-neg')+'">'+pctTxt(plp)+'</div></div></div>'; })()
      +'</div>'
      +'<div class="as-card span12"><div class="as-card-t">\uC885\uBAA9\uBCC4 \uBE44\uC911</div>'+donut(wparts,'\uD3C9\uAC00\uCD1D\uC561',won(ev))+'</div>'
      +'<div class="as-card span6"><div class="as-card-t">\uC139\uD130\uBCC4 \uBD84\uC0B0</div>'+bars(bySec)+'</div>'
      +'<div class="as-card span6"><div class="as-card-t">\uD1B5\uD654\uBCC4 \uBD84\uC0B0</div>'+bars(byCcy)+'</div>'
      +'<div class="as-card span12"><div class="as-card-t">섹터 관리 <span class="as-mini">종목 섹터 선택지 (드롭다운에 표시)</span></div><div class="as-sectors">'+sectorChips()+'</div><div class="as-sec-add"><input type="text" id="asNewSector" placeholder="새 섹터명 입력" autocomplete="off" onkeydown="if(event.key===&quot;Enter&quot;){event.preventDefault();AssetsApp.addSector();}"><button class="as-btn" onclick="AssetsApp.addSector()">+ 추가</button></div></div>'+'<div class="as-card span12"><div class="as-card-t">\uBCF4\uC720 \uC885\uBAA9</div><div style="overflow-x:auto"><table class="as-table"><thead><tr><th>\uD2F0\uCEE4</th><th>\uC885\uBAA9\uBA85</th><th>\uD1B5\uD654</th><th>\uC218\uB7C9</th><th>\uD3C9\uB2E8</th><th>\uD604\uC7AC\uAC00</th><th>매입환율</th><th>\uC139\uD130</th><th>투자원금(원)</th><th>\uD3C9\uAC00\uC561(\uC6D0)</th><th>총손익</th><th>환차손익</th><th>\uC218\uC775\uB960</th><th>\uBE44\uC911</th><th></th></tr></thead><tbody>'+(rows||'')+'</tbody></table></div>'+(S.stocks.length?'':'<div class="as-empty">\uC885\uBAA9\uC744 \uCD94\uAC00\uD558\uC138\uC694</div>')+'<button class="as-btn ghost" onclick="AssetsApp.add(\'stock\')">+ \uC885\uBAA9 \uCD94\uAC00</button></div>'
      +'</div>';
  }

  /* ───────── 시뮬레이터 ───────── */
  var simTab='avg';
  function sectorOpts(sel){
    var list=(S.sectors&&S.sectors.length)?S.sectors.slice():[];
    if(sel && list.indexOf(sel)<0) list.push(sel);
    var o='<option value=""'+(!sel?' selected':'')+'>(미분류)</option>';
    o+=list.map(function(s){ return '<option'+(s===sel?' selected':'')+'>'+esc(s)+'</option>'; }).join('');
    return o;
  }
  function sectorChips(){
    if(!S.sectors||!S.sectors.length) return '<div class="as-empty">섹터가 없습니다. 아래에서 추가하세요.</div>';
    return S.sectors.map(function(s,i){ return '<span class="as-chip">'+esc(s)+'<span class="as-chip-x" title="삭제" onclick="AssetsApp.delSector('+i+')">✕</span></span>'; }).join('');
  }
  function stockSel(id){ if(!S.stocks.length) return '<option value="">\uBCF4\uC720 \uC885\uBAA9 \uC5C6\uC74C</option>'; return S.stocks.map(function(s){ return '<option value="'+s.id+'">'+esc(s.ticker||s.name||'?')+' ('+esc(s.name||'')+')</option>'; }).join(''); }
  function viewSim(){
    var tabs=[['avg','\uBB3C\uD0C0\uAE30'],['rev','\uC5ED\uC0B0'],['sell','\uB9E4\uB3C4+\uC138\uAE08'],['calc','\uACC4\uC0B0\uAE30']];
    var tb=tabs.map(function(t){return '<button class="as-tab'+(simTab===t[0]?' active':'')+'" onclick="AssetsApp.simTab(\''+t[0]+'\')">'+t[1]+'</button>';}).join('');
    var body='';
    if(simTab==='avg') body='<div class="as-card span12"><div class="as-card-t">\uBB3C\uD0C0\uAE30 \uC2DC\uBBAC\uB808\uC774\uD130</div><div class="as-grid"><div class="as-card span6" style="background:transparent;border:none;padding:0;box-shadow:none"><div class="as-field"><label>\uC885\uBAA9</label><select id="smAvgId">'+stockSel()+'</select></div><div class="as-field"><label>\uCD94\uAC00 \uB9E4\uC218 \uC218\uB7C9</label><input type="number" id="smAvgQty" placeholder="0"></div><div class="as-field"><label>\uCD94\uAC00 \uB9E4\uC218 \uB2E8\uAC00</label><input type="number" id="smAvgPx" placeholder="0"></div><button class="as-btn solid" onclick="AssetsApp.runAvg()">\uACC4\uC0B0</button></div><div class="as-card span6" style="background:transparent;border:none;padding:0;box-shadow:none"><div id="smAvgOut" class="as-result">\uC885\uBAA9\u00B7\uC218\uB7C9\u00B7\uB2E8\uAC00\uB97C \uC785\uB825\uD558\uACE0 \uACC4\uC0B0\uC744 \uB204\uB974\uC138\uC694.</div></div></div></div>';
    else if(simTab==='rev') body='<div class="as-card span12"><div class="as-card-t">\uC5ED\uC0B0 \u2014 \uD3C9\uB2E8\uC744 \uBAA9\uD45C\uAC00\uB85C \uB0AE\uCD94\uB824\uBA74?</div><div class="as-grid"><div class="as-card span6" style="background:transparent;border:none;padding:0;box-shadow:none"><div class="as-field"><label>\uC885\uBAA9</label><select id="smRevId">'+stockSel()+'</select></div><div class="as-field"><label>\uBAA9\uD45C \uD3C9\uB2E8</label><input type="number" id="smRevTarget" placeholder="0"></div><div class="as-field"><label>\uCD94\uAC00 \uB9E4\uC218 \uB2E8\uAC00 (\uD604\uC7AC\uAC00)</label><input type="number" id="smRevPx" placeholder="0"></div><button class="as-btn solid" onclick="AssetsApp.runRev()">\uACC4\uC0B0</button></div><div class="as-card span6" style="background:transparent;border:none;padding:0;box-shadow:none"><div id="smRevOut" class="as-result">\uBAA9\uD45C \uD3C9\uB2E8\uACFC \uB9E4\uC218 \uB2E8\uAC00\uB97C \uC785\uB825\uD558\uC138\uC694.</div></div></div></div>';
    else if(simTab==='sell') body='<div class="as-card span12"><div class="as-card-t">\uB9E4\uB3C4 \uC2DC\uBBAC + \uC591\uB3C4\uC18C\uB4DD\uC138 \uCD94\uC815</div><div class="as-grid"><div class="as-card span6" style="background:transparent;border:none;padding:0;box-shadow:none"><div class="as-field"><label>\uC885\uBAA9</label><select id="smSellId">'+stockSel()+'</select></div><div class="as-field"><label>\uB9E4\uB3C4 \uC218\uB7C9</label><input type="number" id="smSellQty" placeholder="0"></div><div class="as-field"><label>\uB9E4\uB3C4 \uB2E8\uAC00</label><input type="number" id="smSellPx" placeholder="0"></div><button class="as-btn solid" onclick="AssetsApp.runSell()">\uACC4\uC0B0</button></div><div class="as-card span6" style="background:transparent;border:none;padding:0;box-shadow:none"><div id="smSellOut" class="as-result">\uB9E4\uB3C4 \uC218\uB7C9\u00B7\uB2E8\uAC00\uB97C \uC785\uB825\uD558\uC138\uC694.</div></div></div></div>';
    else body='<div class="as-card span12"><div class="as-card-t">\uAC04\uB2E8 \uACC4\uC0B0\uAE30 (\uAC00\uACA9 \u00B1%)</div><div class="as-grid"><div class="as-card span6" style="background:transparent;border:none;padding:0;box-shadow:none"><div class="as-field"><label>\uAE30\uC900 \uAC00\uACA9</label><input type="number" id="smCalcPx" placeholder="\uC608: 125"></div><div class="as-field"><label>\uBCC0\uB3D9\uB960 (%) \u2014 \uD558\uB77D\uC740 \uC74C\uC218</label><input type="number" id="smCalcPct" placeholder="\uC608: -5"></div><button class="as-btn solid" onclick="AssetsApp.runCalc()">\uACC4\uC0B0</button></div><div class="as-card span6" style="background:transparent;border:none;padding:0;box-shadow:none"><div id="smCalcOut" class="as-result">\uAC00\uACA9\uACFC \uBCC0\uB3D9\uB960\uC744 \uC785\uB825\uD558\uC138\uC694. \uC608: 125\uC5D0\uC11C -5% \u2192 \uBAA9\uD45C\uAC00.</div></div></div></div>';
    return '<div class="as-sec-head">SIMULATOR</div><div class="as-sec-sub">\uBB3C\uD0C0\uAE30\u00B7\uC5ED\uC0B0\u00B7\uB9E4\uB3C4\u00B7\uACC4\uC0B0\uAE30. \uC2DC\uBBAC\uB808\uC774\uC158\uC740 \uC800\uC7A5\uB418\uC9C0 \uC54A\uC73C\uBA70 \uACC4\uC0B0\uB9CC \uC218\uD589\uD569\uB2C8\uB2E4.</div><div class="as-tabs">'+tb+'</div><div class="as-grid">'+body+'</div>';
  }

  /* ───────── 배당 ───────── */
  function divAfterTax(annual, ccy){ return annual*(ccy==='USD'?0.85:0.846); }
  function divBtn(){
    var stt;
    if(divBusy) stt='<span class="as-live-st busy">\ubc30\ub2f9 \uc774\ub825 \uc870\ud68c \uc911\u2026</span>';
    else if(divMsg) stt='<span class="as-live-st warn">'+esc(divMsg)+'</span>';
    else if(divAt) stt='<span class="as-live-st ok"><i class="as-live-dot"></i>'+(divVia==='worker'?'\ub0b4 \ud504\ub85d\uc2dc':'\uacf5\uc6a9 \ud504\ub85d\uc2dc')+' \u00b7 '+new Date(divAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+'</span>';
    else stt='<span class="as-live-st">\ubc30\ub2f9 \uc774\ub825\uc744 \uc790\ub3d9\uc73c\ub85c \ubd88\ub7ec\uc635\ub2c8\ub2e4</span>';
    return '<span class="as-live-wrap">'+stt+'<button class="as-live-btn" onclick="AssetsApp.divRefresh()"'+(divBusy?' disabled':'')+'>\ud83d\udcb0 \ubc30\ub2f9 \uc815\ubcf4 \ubd88\ub7ec\uc624\uae30</button></span>';
  }
  function divCalHtml(){
    var ms=divCalendar(), max=0, tot=0;
    ms.forEach(function(m){ if(m.amt>max) max=m.amt; tot+=m.amt; });
    if(max<=0) return '<div class="as-empty">\ubc30\ub2f9 \uc815\ubcf4\ub97c \ubd88\ub7ec\uc624\uba74 \uc55e\uc73c\ub85c 12\uac1c\uc6d4\uac04 \uc608\uc0c1 \ubc30\ub2f9\uc774 \uc6d4\ubcc4\ub85c \ud45c\uc2dc\ub429\ub2c8\ub2e4.</div>';
    var bars=ms.map(function(m){
      var h=m.amt>0?Math.max(3, m.amt/max*100):0;
      var tip=m.items.length? m.items.map(function(x){ return x.tk; }).join(', ') : '';
      return '<div class="dvc-col'+(m.amt>0?' on':'')+'"'+(tip?' title="'+esc(tip)+'"':'')+'>'
        +'<div class="dvc-v blurable">'+(m.amt>0?shortWon(m.amt):'')+'</div>'
        +'<div class="dvc-track">'+(m.amt>0?'<span style="height:'+h.toFixed(1)+'%"></span>':'')+'</div>'
        +'<div class="dvc-l">'+(m.m+1)+'\uc6d4</div>'
        +'<div class="dvc-n">'+(m.items.length?m.items.length+'\uac74':'')+'</div></div>';
    }).join('');
    return '<div class="dvc-sum">\ud5a5\ud6c4 12\uac1c\uc6d4 \ud569\uacc4 <b class="blurable">'+won(tot)+'</b>'
      +'<span class="dvc-sub">\uc138\ud6c4 \ucd94\uc815 \u00b7 \uc6d4 \ud3c9\uade0 <span class="blurable">'+won(tot/12)+'</span></span></div>'
      +'<div class="dvc">'+bars+'</div>';
  }
  function divUpHtml(){
    var u=divUpcoming(10);
    if(!u.length) return '<div class="as-empty">\uc608\uc815\ub41c \ubc30\ub2f9\ub77d\uc77c\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div>';
    var now=Date.now();
    return '<div class="dvu">'+u.map(function(x){
      var d=new Date(x.ts), dd=Math.ceil((x.ts-now)/86400000);
      return '<div class="dvu-i'+(dd<=14?' soon':'')+'"><span class="dvu-d">D-'+dd+'</span>'
        +'<span class="dvu-t">'+esc(x.tk)+(x.nm?'<span class="dvu-n">'+esc(x.nm)+'</span>':'')+'</span>'
        +'<span class="dvu-a blurable">'+won(x.won)+'</span>'
        +'<span class="dvu-dt">'+(d.getMonth()+1)+'.'+d.getDate()+'</span></div>';
    }).join('')+'</div>';
  }
  function viewDiv(){
    var annual=0, after=0;
    S.stocks.forEach(function(s){ var a=num(s.divPerShare)*num(s.shares); var aK=s.ccy==='USD'?a*num(S.fx):a; annual+=aK; after+=divAfterTax(aK, s.ccy||'USD'); });
    var rows=S.stocks.map(function(s){
      var a=num(s.divPerShare)*num(s.shares); var aK=s.ccy==='USD'?a*num(S.fx):a;
      var at=divAfterTax(aK,s.ccy||'USD'); var px=num(s.curPrice)||num(s.avgPrice);
      var dy=px>0?num(s.divPerShare)/px*100:0;
      var dd=DIV[s.id]&&DIV[s.id].stat;
      var fq = dd ? (dd.freq===12?'\uc6d4':dd.freq===4?'\ubd84\uae30':dd.freq===2?'\ubc18\uae30':dd.freq===1?'\uc5f0 1\ud68c':dd.freq+'\ud68c/\ub144') : '\u2014';
      var lt='\u2014';
      if(dd&&dd.last){ var L=new Date(dd.last.ts); lt=String(L.getFullYear()).slice(2)+'.'+(L.getMonth()+1)+'.'+L.getDate(); }
      var warn = (dd&&dd.stale) ? '<span class="dv-stale" title="1\ub144 \ub118\uac8c \ubc30\ub2f9 \uae30\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4">\uc911\ub2e8?</span>' : '';
      return '<tr><td>'+esc(s.ticker||s.name||'?')+warn+'</td>'
        +'<td><input type="number" value="'+(s.divPerShare||'')+'" placeholder="\uC8FC\uB2F9 \uC5F0\uBC30\uB2F9" onchange="AssetsApp.edit(\'stock\',\''+s.id+'\',\'divPerShare\',this.value)"></td>'
        +'<td class="num">'+fq+'</td><td class="num">'+lt+'</td>'
        +'<td class="num">'+(num(s.shares)||0)+'</td><td class="num">'+dy.toFixed(2)+'%</td>'
        +'<td class="num blurable">'+won(aK)+'</td><td class="num blurable">'+won(at)+'</td>'
        +'<td><span class="as-rowdel" onclick="AssetsApp.del(\'stock\',\''+s.id+'\')">\u2715</span></td></tr>';
    }).join('');
    var monthlyDiv=after/12;
    var goalRows=(S.divGoals||[]).map(function(g){ var goal=num(g.monthly); var prog=goal>0?Math.min(100,monthlyDiv/goal*100):0;
      return '<div style="margin-bottom:15px"><div style="display:flex;gap:9px;align-items:center;margin-bottom:6px;flex-wrap:wrap"><span style="font-size:12px;color:rgba(255,255,255,.6)">목표 월 배당</span><input type="number" value="'+(g.monthly||'')+'" placeholder="2000000" style="width:150px;background:rgba(22,22,28,.7);border:1px solid rgba(255,255,255,.14);border-radius:7px;padding:7px 10px;color:#f0ede6;font-size:13px;font-family:Pretendard" onchange="AssetsApp.divGoalEdit(\''+g.id+'\',this.value)"><span class="as-rowdel" onclick="AssetsApp.divGoalDel(\''+g.id+'\')" style="opacity:.6">\u2715</span><span style="margin-left:auto;font-size:12px" class="blurable">현재 '+won(monthlyDiv)+' · <b style="color:#ff8a8a">'+prog.toFixed(1)+'%</b> 달성</span></div><div class="as-bar"><span style="width:'+prog+'%;background:linear-gradient(90deg,#ff8a3d,#ff4d4d)"></span></div></div>';
    }).join('');
    return '<div class="as-sec-head">DIVIDENDS</div><div class="as-sec-sub">\ubcf4\uc720 \uc885\ubaa9\uc758 \ubc30\ub2f9 \uc774\ub825\uc744 \ubd88\ub7ec\uc640 \uc5f0\u00b7\uc6d4 \uc608\uc0c1 \ubc30\ub2f9(\uc138\ud6c4 \ucd94\uc815)\uacfc \ubc30\ub2f9\ub77d\uc77c \uc77c\uc815\uc744 \uc815\ub9ac\ud569\ub2c8\ub2e4.</div>'
      +'<div class="as-grid">'
      +'<div class="as-card span12"><div class="as-card-t">\uC5F0 \uC608\uC0C1 \uBC30\uB2F9 <span class="as-mini">\uC138\uD6C4 \uCD94\uC815</span>'+divBtn()+'</div>'
      +'<div class="as-big blurable">'+won(after)+'</div>'
      +'<div class="as-sub-amt blurable">\uC138\uC804 '+won(annual)+' \u00B7 \uC6D4 \uD658\uC0B0 '+won(after/12)+'</div></div>'
      +(function(){ var W=wUrl();
        return '<div class="as-card span12" style="padding-top:14px"><details class="apt-guide" style="border-top:none;padding-top:0">'
        +'<summary>\ubc30\ub2f9 \uc870\ud68c\uac00 \ub290\ub9ac\uac70\ub098 \uc2e4\ud328\ud560 \ub54c \u2014 \uc124\uc815 \uc548\ub0b4</summary>'
        +'<div class="apt-g-b">\uc9c0\uae08\uc740 \uacf5\uc6a9 \ud504\ub85d\uc2dc\ub97c \uac70\uccd0 Yahoo \ubc30\ub2f9 \uc774\ub825\uc744 \ubd88\ub7ec\uc635\ub2c8\ub2e4. \uc885\ubaa9\uc774 \ub9ce\uc73c\uba74 \ub290\ub9b4 \uc218 \uc788\uc73c\ub2c8, Worker\uc5d0 \uc544\ub798 \uacbd\ub85c\ub97c \ucd94\uac00\ud558\uba74 \uc790\ub3d9\uc73c\ub85c \uadf8\ucabd\uc744 \uba3c\uc800 \uc501\ub2c8\ub2e4.'
        +'<pre class="apt-code">if (url.pathname === "/div") {\n  const sym = url.searchParams.get("sym") || "";\n  const y = "https://query1.finance.yahoo.com/v8/finance/chart/"\n    + encodeURIComponent(sym) + "?range=2y&interval=1mo&events=div";\n  const r = await fetch(y);\n  return new Response(await r.text(), {\n    headers: { "content-type": "application/json",\n               "Access-Control-Allow-Origin": "*" }\n  });\n}</pre>'
        +'\ud604\uc7ac \ud504\ub85d\uc2dc: <code>'+(W?esc(W):'\ubbf8\uc124\uc815 \u2014 MACRO \ud0ed\uc5d0\uc11c \uc124\uc815')+'</code></div></details></div>'; })()
      +'<div class="as-card span12"><div class="as-card-t">\ubc30\ub2f9 \uce98\ub9b0\ub354 <span class="as-mini">\ud5a5\ud6c4 12\uac1c\uc6d4 \u00b7 \ubc30\ub2f9\ub77d\uc6d4 \uae30\uc900</span></div>'+divCalHtml()+'</div>'
      +'<div class="as-card span6"><div class="as-card-t">\ub2e4\uac00\uc624\ub294 \ubc30\ub2f9\ub77d\uc77c</div>'+divUpHtml()
      +'<div class="as-note">\ubc30\ub2f9\ub77d\uc77c \uc804\ub0a0\uae4c\uc9c0 \ubcf4\uc720\ud574\uc57c \ubc30\ub2f9\uc744 \ubc1b\uc2b5\ub2c8\ub2e4. \uc9c0\uae09\uc740 \ubcf4\ud1b5 \ubc30\ub2f9\ub77d \ud6c4 2~6\uc8fc \ub4a4\uc774\uba70, \uacfc\uac70 \uc9c0\uae09 \ud328\ud134\uc73c\ub85c \ucd94\uc815\ud55c \uac12\uc774\ub77c \uc2e4\uc81c\uc640 \ub2e4\ub97c \uc218 \uc788\uc2b5\ub2c8\ub2e4.</div></div>'
      +'<div class="as-card span6"><div class="as-card-t">배당 목표 <span class="as-mini">세후 월 배당 기준</span></div>'+(goalRows||'<div class="as-empty">목표를 추가하세요</div>')+'<button class="as-btn ghost" onclick="AssetsApp.divGoalAdd()">+ 목표 추가</button></div>'
      +'<div class="as-card span12"><div class="as-card-t">\uC885\uBAA9\uBCC4 \uBC30\uB2F9</div><div style="overflow-x:auto"><table class="as-table"><thead><tr><th>\uD2F0\uCEE4</th><th>\uC8FC\uB2F9 \uC5F0\uBC30\uB2F9</th><th>\uc9c0\uae09 \uc8fc\uae30</th><th>\ucd5c\uadfc \ubc30\ub2f9\ub77d</th><th>\uC218\uB7C9</th><th>배당수익률</th><th>\uC5F0\uBC30\uB2F9(\uC138\uC804)</th><th>\uC138\uD6C4</th><th></th></tr></thead><tbody>'+(rows||'')+'</tbody></table></div>'
      +(S.stocks.length?'':'<div class="as-empty">\uC8FC\uC2DD \uC139\uC158\uC5D0\uC11C \uC885\uBAA9\uC744 \uBA3C\uC800 \uCD94\uAC00\uD558\uC138\uC694</div>')
      +'<div class="as-note">\u26A0 \uBBF8\uAD6D \uC6D0\uCC9C\uC9D5\uC218 15%(KRW \uC885\uBAA9\uC740 15.4%) \uAE30\uC900 \uCD94\uC815\uCE58\uC785\uB2C8\uB2E4. \uAE08\uC735\uC18C\uB4DD\uC885\uD569\uACFC\uC138 \uB4F1\uC740 \uBCC4\uB3C4\uC785\uB2C8\uB2E4. \uc8fc\ub2f9 \uc5f0\ubc30\ub2f9\uc740 \uc9c1\uc804 1\uc8fc\uae30 \uc2e4\uc9c0\uae09\uc561 \ud569\uacc4\uc774\uba70 \uc9c1\uc811 \uc218\uc815\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.</div></div>'
      +'</div>';
  }

  /* ───────── 이용 안내 ───────── */
  var GUIDE_SECS=[
    {g:'직접 입력', c:'in', items:[
      ['💎','자산 현황','networth','현금·예금·연금 같은 나머지 자산과 부채를 적습니다. 주식·부동산은 자동으로 합산되니 여기 또 적지 마세요.','순자산이 계산됩니다'],
      ['📈','주식','stocks','티커와 수량·평단을 넣으면 현재가는 자동으로 채워집니다. 미국 주식은 환율까지 반영해 원화로 환산합니다.','자산 현황 · 배당 · 추이'],
      ['🏠','부동산','realty','보유한 집의 시세와 대출 잔액을 적습니다. 아래에서 대출·DSR·취득세·양도세도 계산할 수 있습니다.','자산 현황 · 부채'],
      ['💰','소득','income','근로·금융 소득을 적으면 세후 실수령액과 저축 여력을 봅니다.','재무적 목표']
    ]},
    {g:'자동 분석', c:'auto', items:[
      ['💸','배당 수익','dividends','보유 종목의 배당 이력을 불러와 연·월 예상 배당과 배당락 일정을 정리합니다.','주식에서 가져옴'],
      ['📊','순자산 추이','trend','오늘의 순자산을 스냅샷으로 저장해 시간에 따른 변화를 그립니다.','자산 현황에서 가져옴'],
      ['🏆','재무적 목표','goal','목표 금액까지 남은 거리와 달성 시점을 계산합니다.','자산 현황 · 소득'],
      ['💥','시나리오','scenario','폭락·금리 인상 같은 충격이 오면 순자산이 어떻게 되는지 시험합니다.','자산 현황에서 가져옴']
    ]},
    {g:'시장 조회', c:'mkt', items:[
      ['🏢','아파트 실거래가','apt','국토교통부 실거래가로 단지별 시세와 추이를 봅니다. 여기서 확인한 금액을 부동산에 적으면 됩니다.','공공데이터 키 필요'],
      ['📋','청약 일정','subscribe','청약홈 공고를 불러와 접수·발표 일정을 정리하고 D-DAY에 올립니다.','공공데이터 키 필요']
    ]},
    {g:'연습', c:'lab', items:[
      ['🧪','시뮬레이터','simulator','적립식 투자와 복리를 미리 돌려봅니다.','실제 자산과 무관'],
      ['📝','페이퍼 트레이딩','paper','가상의 돈으로 매매를 연습합니다.','실제 자산과 무관']
    ]}
  ];

  function guideFlow(){
    return '<svg class="gd-flow" viewBox="0 0 720 200" preserveAspectRatio="xMidYMid meet">'
      +'<defs><marker id="gdA" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">'
      +'<path d="M0,1 L7,4.5 L0,8 Z" fill="rgba(255,140,90,.75)"/></marker></defs>'
      /* 입력 3개 */
      +'<g class="gd-n gd-in"><rect x="12" y="18" width="150" height="40" rx="9"/><text x="87" y="43">📈 주식</text></g>'
      +'<g class="gd-n gd-in"><rect x="12" y="80" width="150" height="40" rx="9"/><text x="87" y="105">🏠 부동산</text></g>'
      +'<g class="gd-n gd-in"><rect x="12" y="142" width="150" height="40" rx="9"/><text x="87" y="167">💎 현금 · 부채</text></g>'
      /* 화살표 → 자산 현황 */
      +'<path class="gd-e" d="M168 38 C 220 38, 230 100, 276 100" marker-end="url(#gdA)"/>'
      +'<path class="gd-e" d="M168 100 L 276 100" marker-end="url(#gdA)"/>'
      +'<path class="gd-e" d="M168 162 C 220 162, 230 100, 276 100" marker-end="url(#gdA)"/>'
      /* 중앙 */
      +'<g class="gd-n gd-core"><rect x="282" y="72" width="156" height="56" rx="11"/>'
      +'<text x="360" y="96" class="gd-t1">자산 현황</text><text x="360" y="115" class="gd-t2">순자산 자동 계산</text></g>'
      /* 화살표 → 분석 */
      +'<path class="gd-e" d="M444 100 C 490 100, 500 38, 548 38" marker-end="url(#gdA)"/>'
      +'<path class="gd-e" d="M444 100 L 548 100" marker-end="url(#gdA)"/>'
      +'<path class="gd-e" d="M444 100 C 490 100, 500 162, 548 162" marker-end="url(#gdA)"/>'
      /* 분석 3개 */
      +'<g class="gd-n gd-out"><rect x="554" y="18" width="154" height="40" rx="9"/><text x="631" y="43">📊 순자산 추이</text></g>'
      +'<g class="gd-n gd-out"><rect x="554" y="80" width="154" height="40" rx="9"/><text x="631" y="105">🏆 재무적 목표</text></g>'
      +'<g class="gd-n gd-out"><rect x="554" y="142" width="154" height="40" rx="9"/><text x="631" y="167">💥 시나리오</text></g>'
      +'</svg>';
  }

  function guideReady(){
    var w=''; try{ w=(localStorage.getItem('nn_worker_url')||'').trim(); }catch(e){}
    var k=''; try{ k=(localStorage.getItem('nn_apt_key')||'').trim(); }catch(e){}
    var nStock=S.stocks.length, nRealty=(S.realty||[]).length, nAsset=S.assets.length;
    function chip(ok, lb, sub){
      return '<div class="gd-chk'+(ok?' on':'')+'"><span class="gd-chk-i">'+(ok?'✓':'○')+'</span>'
        +'<span class="gd-chk-b"><b>'+lb+'</b><i>'+sub+'</i></span></div>';
    }
    return '<div class="gd-chks">'
      + chip(nStock>0, '주식 '+(nStock?nStock+'종목':'미입력'), nStock?'실시간 평가 중':'주식 탭에서 추가')
      + chip(nRealty>0, '부동산 '+(nRealty?nRealty+'건':'미입력'), nRealty?'자산 현황에 반영됨':'부동산 탭에서 추가')
      + chip(nAsset>0, '현금·기타 '+(nAsset?nAsset+'건':'미입력'), nAsset?'입력됨':'자산 현황에서 추가')
      + chip(!!w, '프록시(Worker)', w?'연결됨 — 실시간 시세·배당':'미설정 — MACRO 탭에서 설정')
      + chip(!!k, '공공데이터 키', k?'저장됨 — 실거래가·청약':'미설정 — 아파트 실거래가 탭에서 입력')
      + '</div>';
  }

  function viewGuide(){
    var cards=GUIDE_SECS.map(function(sec){
      return '<div class="gd-grp gd-'+sec.c+'"><div class="gd-grp-t">'+sec.g+'</div><div class="gd-cards">'
        + sec.items.map(function(it){
            return '<div class="gd-card" onclick="AssetsApp.go(\''+it[2]+'\')">'
              +'<div class="gd-c-h"><span class="gd-c-ic">'+it[0]+'</span><b>'+it[1]+'</b><span class="gd-c-go">→</span></div>'
              +'<p>'+it[3]+'</p>'
              +'<span class="gd-c-tag">'+it[4]+'</span></div>';
          }).join('')
        + '</div></div>';
    }).join('');

    return '<div class="as-sec-head">GUIDE</div>'
      +'<div class="as-sec-sub">화면이 많아 보이지만 구조는 단순합니다. <b>왼쪽 위 네 곳에 값을 넣으면</b>, 나머지는 그 값으로 자동 계산됩니다.</div>'
      +'<div class="as-grid">'
      +'<div class="as-card span12"><div class="as-card-t">데이터가 흐르는 방향</div>'+guideFlow()
      +'<div class="as-note">주식과 부동산은 각 탭에 입력하면 자산 현황에 <b>자동으로 합산</b>됩니다. 자산 현황에서 또 적으면 이중 계산되니, 거기에는 현금·예금·연금처럼 다른 곳에 없는 항목만 적으세요.</div></div>'

      +'<div class="as-card span12"><div class="as-card-t">지금 상태 <span class="as-mini">무엇이 준비됐는지</span></div>'+guideReady()+'</div>'

      +'<div class="as-card span12"><div class="as-card-t">처음이라면 이 순서로</div>'
      +'<div class="gd-steps">'
      +'<div class="gd-step" onclick="AssetsApp.go(\'stocks\')"><span class="gd-n">1</span><div><b>주식을 넣습니다</b><p>티커·수량·평단만 넣으면 현재가와 손익은 자동입니다.</p></div></div>'
      +'<div class="gd-step" onclick="AssetsApp.go(\'realty\')"><span class="gd-n">2</span><div><b>부동산을 넣습니다</b><p>시세와 대출 잔액을 적으면 순자산 기여분이 계산됩니다.</p></div></div>'
      +'<div class="gd-step" onclick="AssetsApp.go(\'networth\')"><span class="gd-n">3</span><div><b>나머지를 채웁니다</b><p>현금·예금·연금과 그 밖의 부채를 적으면 순자산이 완성됩니다.</p></div></div>'
      +'<div class="gd-step" onclick="AssetsApp.go(\'trend\')"><span class="gd-n">4</span><div><b>스냅샷을 남깁니다</b><p>순자산 추이에서 오늘을 저장해두면 다음 달부터 변화가 보입니다.</p></div></div>'
      +'</div></div>'

      +'<div class="as-card span12"><div class="as-card-t">화면별 역할</div>'+cards+'</div>'

      +'<div class="as-card span12"><div class="as-card-t">알아두면 좋은 것</div>'
      +'<div class="gd-tips">'
      +'<div class="gd-tip"><b>🔒 데이터는 이 브라우저에 저장됩니다</b><p>서버로 보내지 않습니다. 로그인하면 본인 전용 클라우드에 자동 동기화되어 다른 기기에서도 이어집니다.</p></div>'
      +'<div class="gd-tip"><b>👁 금액 가리기</b><p>왼쪽 아래 버튼을 누르면 모든 금액이 흐려집니다. 화면을 공유하거나 캡처할 때 쓰세요.</p></div>'
      +'<div class="gd-tip"><b>🔌 프록시가 필요한 기능</b><p>실시간 시세·배당 조회는 프록시(Worker)를 거칩니다. 없어도 직접 입력하면 모든 계산은 정상 작동합니다.</p></div>'
      +'<div class="gd-tip"><b>⌨ 단축키</b><p>아무 데서나 <kbd>?</kbd> 를 누르면 단축키 목록이, <kbd>Ctrl</kbd>+<kbd>K</kbd> 로는 모든 기능을 검색할 수 있습니다.</p></div>'
      +'</div></div>'
      +'</div>';
  }

  function subBtn(){
    var stt;
    if(SUB.busy) stt='<span class="as-live-st busy">청약 공고 조회 중…</span>';
    else if(SUB.err) stt='<span class="as-live-st warn">'+esc(SUB.err)+'</span>';
    else if(SUB.at) stt='<span class="as-live-st ok"><i class="as-live-dot"></i>'+(SUB.via==='worker'?'내 프록시':'공용 프록시')+' · '+new Date(SUB.at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+'</span>';
    else stt='<span class="as-live-st">최근 2개월 공고를 불러옵니다</span>';
    return '<span class="as-live-wrap">'+stt+'<button class="as-live-btn" onclick="AssetsApp.subRefresh()"'+(SUB.busy?' disabled':'')+'>🏠 청약 공고 불러오기</button></span>';
  }
  function subCard(x){
    var d1=dday(x.rk1), dw=dday(x.win);
    var badge='';
    if(d1!=null){
      if(d1>0) badge='<span class="sb-d open">D-'+d1+'</span>';
      else if(d1===0) badge='<span class="sb-d today">오늘 접수</span>';
      else if(dw!=null && dw>=0) badge='<span class="sb-d wait">발표 D-'+dw+'</span>';
      else badge='<span class="sb-d done">접수 마감</span>';
    }
    function row(lb,val,cls){ return val? '<div class="sb-r"><span class="sb-lb">'+lb+'</span><span class="sb-v'+(cls?' '+cls:'')+'">'+val+'</span></div>' : ''; }
    var sp = x.sp ? (dTxt(x.sp)+(x.spE&&x.spE.getTime()!==x.sp.getTime()? ' ~ '+dTxt(x.spE):'')) : '';
    var ct = x.ctB ? (dTxt(x.ctB)+(x.ctE? ' ~ '+dTxt(x.ctE):'')) : '';
    return '<div class="sb-card">'
      +'<div class="sb-top">'+badge+'<span class="sb-area">'+esc(x.area||'—')+'</span>'
      +(x.kind?'<span class="sb-kind'+(/임대/.test(x.kind)?' rent':'')+'">'+esc(x.kind)+'</span>':'')+'</div>'
      +'<div class="sb-nm">'+esc(x.name)+'</div>'
      +(x.addr?'<div class="sb-ad">'+esc(x.addr)+'</div>':'')
      +'<div class="sb-rows">'
      + row('모집공고', dTxt(x.notice))
      + row('특별공급', sp)
      + row('1순위 접수', dTxt(x.rk1), 'hi')
      + row('당첨자 발표', dTxt(x.win), 'hi')
      + row('계약', ct)
      + row('공급 세대', x.total? x.total.toLocaleString('ko-KR')+'세대':'')
      +'</div>'
      +'<div class="sb-foot">'
      +(x.biz?'<span class="sb-biz">'+esc(x.biz)+'</span>':'')
      +(x.url?'<a class="sb-link" href="'+esc(x.url)+'" target="_blank" rel="noopener">공고문 →</a>':'')
      +'</div></div>';
  }
  function viewSub(){
    var areaOpt='<option value="">전체 지역</option>'+SUB_AREAS.map(function(a){ return '<option value="'+a+'"'+(SUB.area===a?' selected':'')+'>'+a+'</option>'; }).join('');
    var kinds=[['all','전체'],['sale','분양'],['rent','임대']];
    var body;
    if(SUB.busy) body='<div class="as-card span12"><div class="apt-load"><span class="apt-spin"></span>청약 공고를 불러오는 중…</div></div>';
    else if(SUB.err) body='<div class="as-card span12"><div class="apt-err">⚠ '+esc(SUB.err)+'</div>'+subGuide()+'</div>';
    else if(!SUB.done) body='<div class="as-card span12"><div class="apt-empty"><b>청약 공고 불러오기</b>를 누르면 최근 2개월 이내 공고와 앞으로의 접수 일정을 보여드립니다.</div>'+subGuide()+'</div>';
    else {
      var v=subView();
      if(!v.length) body='<div class="as-card span12"><div class="apt-empty">조건에 맞는 공고가 없습니다. 지역·구분을 바꿔 보세요.</div></div>';
      else {
        var soon=v.filter(function(x){ var d=dday(x.rk1); return d!=null && d>=0; });
        body='<div class="as-card span12"><div class="as-card-t">청약 일정 <span class="as-mini">'+v.length+'건'+(soon.length?' · 접수 예정 '+soon.length+'건':'')+'</span></div>'
            +'<div class="sb-grid">'+v.slice(0,60).map(subCard).join('')+'</div>'
            +(v.length>60?'<div class="as-note">최근 60건만 표시합니다. 지역을 좁히면 더 정확히 볼 수 있습니다.</div>':'')
            +'</div>';
      }
    }
    return '<div class="as-sec-head">SUBSCRIPTION</div>'
      +'<div class="as-sec-sub">한국부동산원 청약홈 공고를 불러와 접수·발표 일정을 정리하고, 다가오는 일정은 홈 화면 D-DAY에 자동 등록합니다.</div>'
      +'<div class="as-grid">'
      +'<div class="as-card span12"><div class="as-card-t">조회 조건'+subBtn()+'</div>'
      +'<div class="apt-form">'
      +'<div class="apt-f"><label>지역</label><select id="subArea">'+areaOpt+'</select></div>'
      +'<div class="apt-f"><label>구분</label><select id="subKind">'+kinds.map(function(k){ return '<option value="'+k[0]+'"'+(SUB.kind===k[0]?' selected':'')+'>'+k[1]+'</option>'; }).join('')+'</select></div>'
      +'</div>'
      +'<div class="as-note">아파트 실거래가 화면에 저장한 API 키를 함께 사용합니다. 청약홈은 별도 서비스라 <b>활용신청을 한 번 더</b> 해야 합니다.</div>'
      +'</div>'
      + body
      +'</div>';
  }
  function subGuide(){
    return '<details class="apt-guide"><summary>청약 정보가 안 나올 때 — 설정 안내</summary>'
      +'<div class="apt-g-b"><b>1. 활용신청</b> — <a href="https://www.data.go.kr/data/15101046/openapi.do" target="_blank" rel="noopener">공공데이터포털 「한국부동산원 청약홈 분양정보 조회 서비스」</a> 에서 활용신청하세요. 실거래가와 같은 인증키를 쓰지만, 서비스별로 신청이 따로 필요합니다.</div>'
      +'<div class="apt-g-b"><b>2. 내 프록시(권장)</b> — Worker에 아래 경로를 추가하면 자동으로 그쪽을 먼저 씁니다.'
      +'<pre class="apt-code">if (url.pathname === "/subscribe") {\n  const p = url.searchParams;\n  const api = "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1"\n    + "/getAPTLttotPblancDetail?perPage=100"\n    + "&page=" + (p.get("page") || "1")\n    + "&cond%5BRCRIT_PBLANC_DE%3A%3AGTE%5D=" + (p.get("since") || "")\n    + "&serviceKey=" + encodeURIComponent(p.get("key") || "");\n  const r = await fetch(api);\n  return new Response(await r.text(), {\n    headers: { "content-type": "application/json",\n               "Access-Control-Allow-Origin": "*" }\n  });\n}</pre></div></details>';
  }

  /* ───────── 아파트 실거래가 ───────── */
  function viewApt(){
    return '<div class="as-sec-head">APARTMENT DEALS</div>'
      +'<div class="as-sec-sub">\uad6d\ud1a0\uad50\ud1b5\ubd80 \uc2e4\uac70\ub798\uac00 \uacf5\uac1c\uc790\ub8cc\ub85c \uc544\ud30c\ud2b8 \ub9e4\ub9e4 \uac70\ub798\ub97c \uc870\ud68c\ud558\uace0, \uad00\uc2ec \ub2e8\uc9c0\ub97c \ub4f1\ub85d\ud574 \ucd94\uc774\ub97c \ucd94\uc801\ud569\ub2c8\ub2e4.</div>'
      +'<div id="aptRoot"></div>';
  }

  /* ───────── 부동산 계산기 ───────── */
  function rtKindOpts(sel){
    return ['아파트','주택·빌라','오피스텔','상가·사무실','토지','기타'].map(function(t){
      return '<option'+(t===sel?' selected':'')+'>'+t+'</option>'; }).join('');
  }
  function viewRealtyOwn(){
    var rows=(S.realty||[]).map(function(r){
      var eq=num(r.value)-num(r.loan);
      var ltv=num(r.value)>0 ? num(r.loan)/num(r.value)*100 : 0;
      return '<tr>'
        +'<td><input value="'+esc(r.name||'')+'" placeholder="예: 천안 자가" onchange="AssetsApp.edit(\'realty\',\''+r.id+'\',\'name\',this.value)"></td>'
        +'<td><select onchange="AssetsApp.edit(\'realty\',\''+r.id+'\',\'kind\',this.value)">'+rtKindOpts(r.kind)+'</select></td>'
        +'<td><input type="number" class="blurable" value="'+(r.value||'')+'" placeholder="0" onchange="AssetsApp.edit(\'realty\',\''+r.id+'\',\'value\',this.value)"></td>'
        +'<td><input type="number" class="blurable" value="'+(r.loan||'')+'" placeholder="0" onchange="AssetsApp.edit(\'realty\',\''+r.id+'\',\'loan\',this.value)"></td>'
        +'<td class="num blurable">'+won(eq)+'</td>'
        +'<td class="num">'+(num(r.value)>0?ltv.toFixed(0)+'%':'—')+'</td>'
        +'<td><span class="as-rowdel" onclick="AssetsApp.del(\'realty\',\''+r.id+'\')">\u2715</span></td></tr>';
    }).join('');
    var tv=realtyTotal(), tl=realtyLoan(), eq=realtyEquity();
    var dup=realtyDup();
    return '<div class="as-card span12 rt-own"><div class="as-card-t">보유 부동산 <span class="as-mini">입력하면 자산 현황에 자동 반영됩니다</span></div>'
      +'<div class="as-kpis"><div class="as-kpi"><div class="k">시세 합계</div><div class="v blurable">'+won(tv)+'</div></div>'
      +'<div class="as-kpi"><div class="k">담보대출</div><div class="v blurable">'+won(tl)+'</div></div>'
      +'<div class="as-kpi"><div class="k">순자산 기여</div><div class="v blurable">'+won(eq)+'</div></div>'
      +'<div class="as-kpi"><div class="k">평균 LTV</div><div class="v">'+(tv>0?(tl/tv*100).toFixed(0)+'%':'—')+'</div></div></div>'
      +'<div style="overflow-x:auto"><table class="as-table"><thead><tr><th>이름</th><th>종류</th><th>현재 시세</th><th>대출 잔액</th><th>순자산</th><th>LTV</th><th></th></tr></thead><tbody>'+(rows||'')+'</tbody></table></div>'
      +(rows?'':'<div class="as-empty">보유한 집이나 부동산을 추가해 보세요. 시세와 대출 잔액을 넣으면 순자산이 자동 계산됩니다.</div>')
      +'<button class="as-btn ghost" onclick="AssetsApp.add(\'realty\')">+ 부동산 추가</button>'
      +(dup>0?'<div class="rt-warn">⚠ 자산 현황의 <b>자산</b> 표에 종류가 \'부동산\'인 항목('+won(dup)+')이 남아 있습니다. 여기에 입력한 부동산과 <b>이중으로 계산</b>되니, 그 행은 지워 주세요.</div>':'')
      +'<div class="as-note">시세는 아파트 실거래가 화면에서 확인한 금액을 넣으면 됩니다. 대출 잔액을 함께 적으면 부채에도 자동 반영되어 순자산이 정확해집니다.</div>'
      +'</div>';
  }

  function viewRealty(){
    return '<div class="as-sec-head">REAL ESTATE</div>'
      + '<div class="as-sec-sub">보유 부동산을 등록하면 자산 현황에 자동 반영됩니다. 아래에서 대출 상환 · DSR 한도 · 취득세 · 양도소득세 · 전월세 전환도 계산할 수 있습니다.</div>'
      + '<div class="as-grid" style="margin-bottom:18px">'+viewRealtyOwn()+'</div>'
      + '<div class="as-sec-head" style="margin-top:4px">CALCULATOR</div>'
      + '<div class="rc-tabs" id="rcTabs">'
      +   '<button class="rc-tab on" data-t="loan">💳 대출 원리금</button>'
      +   '<button class="rc-tab" data-t="dsr">📊 DSR 한도</button>'
      +   '<button class="rc-tab" data-t="acq">🧾 취득세</button>'
      +   '<button class="rc-tab" data-t="cgt">💰 양도소득세</button>'
      +   '<button class="rc-tab" data-t="rent">🔁 전월세 전환</button>'
      + '</div>'
      + '<div id="rcBody" class="rc-body"></div>';
  }

  /* ───────── 라우터/이벤트 ───────── */
  function render(){
    var el=document.getElementById('asContent'); if(!el) return;
    var pg=document.getElementById('page-assets'); if(pg) pg.classList.toggle('as-blurred', !!S.blur);
    var fx=document.getElementById('asFx'); if(fx && document.activeElement!==fx) fx.value=S.fx;
    var bt=document.getElementById('asBlurToggle'); if(bt){ bt.classList.toggle('on', !!S.blur); bt.textContent=S.blur?'\uD83D\uDE48 \uAC00\uB9BC \uD574\uC81C':'\uD83D\uDC41 \uAE08\uC561 \uAC00\uB9AC\uAE30'; }
    el.innerHTML = sec==='networth'?viewNet() : sec==='stocks'?viewStocks() : sec==='simulator'?viewSim() : sec==='dividends'?viewDiv() : sec==='trend'?viewTrend() : sec==='goal'?viewGoal() : sec==='scenario'?viewScenario() : sec==='paper'?viewPaper() : sec==='income'?viewIncome() : sec==='realty'?viewRealty() : sec==='apt'?viewApt() : sec==='subscribe'?viewSub() : sec==='guide'?viewGuide() : viewNet();
    if(sec==='realty' && window.__rcInit) window.__rcInit();
    if(sec==='apt' && window.__aptInit) window.__aptInit();
    if(sec==='subscribe'){
      var sa=document.getElementById('subArea'), sk=document.getElementById('subKind');
      if(sa) sa.onchange=function(){ SUB.area=this.value; render(); subPushDday(); };
      if(sk) sk.onchange=function(){ SUB.kind=this.value; render(); subPushDday(); };
      if(!SUB.done && !SUB.busy && !SUB.err && subKey()) setTimeout(function(){ subFetch(false); }, 280);
    }
    if(sec==='dividends' && !divAt && !divBusy && S.stocks.length){ setTimeout(function(){ fetchDiv(false); }, 260); }
  }
  function setNav(){ var nav=document.getElementById('asNav'); if(!nav) return; [].slice.call(nav.querySelectorAll('.as-navbtn')).forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-sec')===sec); }); }

  /* ═══════════ 2단계: 추이 · 목표 · 시나리오 ═══════════ */
  function shortWon(n){ n=n||0; var a=Math.abs(n); if(a>=1e8) return (n/1e8).toFixed(a>=1e9?0:1)+'억'; if(a>=1e4) return Math.round(n/1e4).toLocaleString('ko-KR')+'만'; return Math.round(n).toString(); }
  function fmtDay(ts){ var d=new Date(ts); return (d.getFullYear()%100)+'.'+(d.getMonth()+1)+'.'+d.getDate(); }
  function classMap(){ var m={'현금':0,'부동산':0,'금융':0,'기타':0}; S.assets.forEach(function(a){ var t=a.type||'기타'; m[t]=(m[t]||0)+num(a.amount); }); return m; }
  function stockSplit(){ var usd=0,krw=0; S.stocks.forEach(function(s){ var e=stockEval(s); if((s.ccy||'USD')==='USD') usd+=e; else krw+=e; }); return {usd:usd,krw:krw}; }
  function barsHtml(parts){
    var tot=parts.reduce(function(s,p){return s+p.v;},0);
    if(tot<=0) return '<div class="as-empty">데이터를 입력하면 표시됩니다</div>';
    return '<div class="as-seg">'+parts.map(function(p,i){ var f=p.v/tot*100; var col=p.c||PAL[i%PAL.length];
      return '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;font-family:Pretendard"><span style="color:rgba(240,237,230,.85)">'+esc(p.name)+'</span><span style="color:#fff">'+f.toFixed(1)+'% <span class="blurable" style="color:rgba(255,255,255,.45);font-size:11px;font-weight:400">'+won(p.v)+'</span></span></div><div class="as-bar"><span style="width:'+f+'%;background:'+col+'"></span></div></div>';
    }).join('')+'</div>';
  }

  function lineChart(pts){
    if(pts.length<2) return '<div class="as-empty">스냅샷을 2개 이상 저장하면 추이 그래프가 표시됩니다.</div>';
    var W=640,H=230,pad=42,n=pts.length;
    var vals=pts.map(function(p){return p.v;});
    var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals);
    if(mn===mx){ var b=Math.abs(mn)||1; mn-=b*0.05; mx+=b*0.05; }
    function X(i){ return pad+(W-pad*2)*(i/(n-1)); }
    function Y(v){ return H-pad-(H-pad*2)*((v-mn)/(mx-mn)); }
    var line=pts.map(function(p,i){ return (i?'L':'M')+X(i).toFixed(1)+' '+Y(p.v).toFixed(1); }).join(' ');
    var area=line+' L'+X(n-1).toFixed(1)+' '+(H-pad)+' L'+X(0).toFixed(1)+' '+(H-pad)+' Z';
    var grid='';
    for(var g=0;g<=3;g++){ var yy=(pad+(H-pad*2)*(g/3)); var vv=mx-(mx-mn)*(g/3); grid+='<line x1="'+pad+'" y1="'+yy+'" x2="'+(W-pad)+'" y2="'+yy+'" stroke="rgba(255,255,255,.06)"/><text x="'+(pad-7)+'" y="'+(yy+3)+'" text-anchor="end" font-size="9" fill="rgba(255,255,255,.42)">'+shortWon(vv)+'</text>'; }
    var dots=pts.map(function(p,i){ return '<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="3.2" fill="#ff5b5b" stroke="#160a0a" stroke-width="1.5"/>'; }).join('');
    return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;overflow:visible"><defs><linearGradient id="asArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,77,77,.38)"/><stop offset="1" stop-color="rgba(255,77,77,0)"/></linearGradient><linearGradient id="asLineG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ff4d4d"/></linearGradient></defs>'+grid+'<path d="'+area+'" fill="url(#asArea)"/><path d="'+line+'" fill="none" stroke="url(#asLineG)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>'+dots+'<text x="'+pad+'" y="'+(H-10)+'" font-size="9.5" fill="rgba(255,255,255,.55)">'+fmtDay(pts[0].d)+'</text><text x="'+(W-pad)+'" y="'+(H-10)+'" text-anchor="end" font-size="9.5" fill="rgba(255,255,255,.55)">'+fmtDay(pts[n-1].d)+'</text></svg>';
  }

  function viewTrend(){
    var snaps=(S.snapshots||[]).slice().sort(function(a,b){return a.d-b.d;});
    var pts=snaps.map(function(s){ return {d:s.d,v:s.net}; });
    var cur=netWorth();
    var first=snaps.length?snaps[0].net:cur, chg=cur-first, chgp=first?chg/first*100:0;
    var rows=snaps.slice().reverse().map(function(s){ return '<tr><td>'+fmtDay(s.d)+' '+('0'+new Date(s.d).getHours()).slice(-2)+':'+('0'+new Date(s.d).getMinutes()).slice(-2)+'</td><td class="num blurable">'+won(s.net)+'</td><td><span class="as-rowdel" onclick="AssetsApp.snapDel('+s.d+')">\u2715</span></td></tr>'; }).join('');
    return '<div class="as-sec-head">NET WORTH TREND</div><div class="as-sec-sub">현재 순자산을 스냅샷으로 저장하면 시점별 추이를 그래프로 볼 수 있습니다.</div>'
      +'<div class="as-grid">'
      +'<div class="as-card span12"><div class="as-card-t">순자산 추이 <span class="as-mini">스냅샷 '+snaps.length+'개</span></div>'+lineChart(pts)+'<div style="display:flex;gap:12px;align-items:center;margin-top:14px;flex-wrap:wrap"><button class="as-btn solid" onclick="AssetsApp.snapSave()">\uD83D\uDCCC 현재 순자산 스냅샷 저장</button><span class="as-sub-amt blurable" style="margin:0">현재 '+won(cur)+(snaps.length?' \u00B7 시작 대비 <span class="'+(chg>=0?'as-pos':'as-neg')+'">'+won(chg)+' ('+(chgp>=0?'+':'')+chgp.toFixed(1)+'%)</span>':'')+'</span></div></div>'
      +'<div class="as-card span12"><div class="as-card-t">스냅샷 기록</div><table class="as-table"><thead><tr><th>일시</th><th>순자산</th><th></th></tr></thead><tbody>'+(rows||'')+'</tbody></table>'+(snaps.length?'':'<div class="as-empty">아직 저장된 스냅샷이 없습니다.</div>')+'</div>'
      +'</div>';
  }

  function viewGoal(){
    var cur=netWorth(), g=S.goal||{};
    var target=num(g.target), years=num(g.years), ret=num(g.ret);
    var months=Math.round(years*12);
    var prog=target>0?Math.min(100,cur/target*100):0;
    var r=ret/100/12, req=0, reached=false, msg='';
    if(target>0 && months>0){
      var fvCur=cur*Math.pow(1+r,months);
      var need=target-fvCur;
      if(need<=0){ reached=true; req=0; }
      else { req = (r===0)? need/months : need*r/(Math.pow(1+r,months)-1); }
    }
    var goalResult = (target>0&&months>0)
      ? (reached ? '<div class="as-result">🎉 현재 자산과 기대수익률만으로 목표 시점에 <b>목표를 초과 달성</b>합니다. 추가 저축이 필요 없습니다.</div>'
                 : '<div class="as-result">목표까지 <b>'+months+'개월</b> ('+years+'년) · 기대수익률 연 '+ret+'%<br>필요 월 저축액 <span class="big blurable">'+won(req)+'</span><br><span style="font-size:11px;color:rgba(255,255,255,.45)">현재 순자산이 복리로 불어나는 것을 포함한 추정치입니다.</span></div>')
      : '<div class="as-result">목표 순자산·기간·기대수익률을 입력하세요.</div>';
    // 리밸런싱
    var cm=classMap(), st=stockTotal();
    var classes=[['주식',st],['현금',cm['현금']||0],['부동산',cm['부동산']||0],['금융',cm['금융']||0]];
    var invTot=classes.reduce(function(s,c){return s+c[1];},0);
    var rb=S.rebal||{};
    var rbRows=classes.map(function(c){
      var key=c[0], curV=c[1], curP=invTot>0?curV/invTot*100:0;
      var tgt=num(rb[key]);
      var tgtV=invTot*tgt/100, diff=tgtV-curV;
      var diffTxt = tgt>0 ? '<span class="'+(diff>=0?'as-pos':'as-neg')+'">'+(diff>=0?'+':'')+won(diff)+'</span>' : '<span style="color:rgba(255,255,255,.3)">—</span>';
      return '<tr><td>'+key+'</td><td class="num">'+curP.toFixed(1)+'%</td><td><input type="number" value="'+(rb[key]||'')+'" placeholder="0" style="width:70px" onchange="AssetsApp.setRebal(\''+key+'\',this.value)">%</td><td class="num blurable">'+diffTxt+'</td></tr>';
    }).join('');
    return '<div class="as-sec-head">GOAL &amp; REBALANCING</div><div class="as-sec-sub">목표 순자산 달성에 필요한 월 저축액과, 목표 자산배분 대비 조정 금액을 계산합니다.</div>'
      +'<div class="as-grid">'
      +'<div class="as-card span12"><div class="as-card-t">목표 진행률</div><div class="as-big red blurable">'+prog.toFixed(1)+'%</div><div class="as-bar" style="margin-top:12px"><span style="width:'+prog+'%;background:linear-gradient(90deg,#ff8a3d,#ff4d4d)"></span></div><div class="as-sub-amt blurable">현재 '+won(cur)+' / 목표 '+(target>0?won(target):'—')+'</div></div>'
      +'<div class="as-card span6"><div class="as-card-t">목표 설정</div><div class="as-field"><label>목표 순자산 (원)</label><input type="number" value="'+(g.target||'')+'" placeholder="예: 1000000000" onchange="AssetsApp.setGoal(\'target\',this.value)"></div><div class="as-field"><label>목표까지 기간 (년)</label><input type="number" value="'+(g.years||'')+'" placeholder="예: 10" onchange="AssetsApp.setGoal(\'years\',this.value)"></div><div class="as-field"><label>기대 연 수익률 (%)</label><input type="number" value="'+(g.ret||'')+'" placeholder="예: 6" onchange="AssetsApp.setGoal(\'ret\',this.value)"></div></div>'
      +'<div class="as-card span6"><div class="as-card-t">필요 저축</div>'+goalResult+'</div>'
      +'<div class="as-card span12"><div class="as-card-t">리밸런싱 <span class="as-mini">목표 비중 대비 조정액</span></div><table class="as-table"><thead><tr><th>자산군</th><th>현재 비중</th><th>목표 비중</th><th>조정 필요액</th></tr></thead><tbody>'+rbRows+'</tbody></table><div class="as-note">조정 필요액이 +면 매수/추가, −면 매도/축소가 필요하다는 의미입니다. (투자자산: 주식·현금·부동산·금융 기준)</div></div>'
      +'</div>';
  }

  function viewScenario(){
    var cur=netWorth(), cm=classMap(), sp=stockSplit();
    var sc=S.scenario||{stock:'',realestate:'',financial:'',cash:'',fx:''};
    function shocked(){
      var kStock=(1+num(sc.stock)/100), kFx=(1+num(sc.fx)/100);
      var newStock = sp.krw*kStock + sp.usd*kStock*kFx;
      var newAssets = (cm['현금']||0)*(1+num(sc.cash)/100) + (cm['부동산']||0)*(1+num(sc.realestate)/100) + (cm['금융']||0)*(1+num(sc.financial)/100) + (cm['기타']||0);
      return newAssets + newStock - debtTotal();
    }
    var nw=shocked(), delta=nw-cur, dp=cur?delta/cur*100:0;
    function fld(k,lab,ph){ return '<div class="as-field" style="margin-bottom:9px"><label>'+lab+'</label><input type="number" value="'+(sc[k]||'')+'" placeholder="'+ph+'" onchange="AssetsApp.setScenario(\''+k+'\',this.value)"></div>'; }
    var presets=[['증시 폭락',{stock:-30,realestate:-5,financial:-3,cash:0,fx:5},'단기 조정장'],['금융위기',{stock:-45,realestate:-20,financial:-10,cash:0,fx:12},'2008년급 시스템 위기'],['금리인하 랠리',{stock:25,realestate:8,financial:5,cash:0,fx:-6},'유동성 확대 상승장'],['충격 초기화',{stock:0,realestate:0,financial:0,cash:0,fx:0},'모든 충격 제거']];
    function shkSum(sh){ var m={stock:'주식',realestate:'부동산',financial:'금융',fx:'환율'}; var out=[]; ['stock','realestate','financial','fx'].forEach(function(k){ if(sh[k]) out.push(m[k]+' '+(sh[k]>0?'+':'')+sh[k]+'%'); }); return out.length?out.join(' · '):'변동 없음'; }
    var pbtn=presets.map(function(p,i){ return '<button class="as-tab" style="text-align:left;width:100%;padding:11px 14px;line-height:1.5" onclick="AssetsApp.scenarioPreset('+i+')"><b>'+p[0]+'</b> <span style="font-size:10.5px;opacity:.6">'+p[2]+'</span><br><span style="font-size:11px;opacity:.78">'+shkSum(p[1])+'</span></button>'; }).join('');
    window.__asScenPresets=presets;
    var gret=(sc.gret===''||sc.gret==null)?7:num(sc.gret);
    var periods=[['1주',7],['1개월',30],['1년',365],['5년',1825],['10년',3650]];
    var gp=num(sc.gperiod);
    var perBtns=periods.map(function(p){ return '<button class="as-tab'+(gp===p[1]?' active':'')+'" onclick="AssetsApp.scenarioPeriod('+p[1]+')">'+p[0]+'</button>'; }).join('');
    var perRes;
    if(gp>0){ var yrs=gp/365, proj=cur*Math.pow(1+gret/100,yrs), pd=proj-cur, pdp=cur?pd/cur*100:0; var plab=(periods.filter(function(p){return p[1]===gp;})[0]||['',''])[0];
      perRes='<div class="as-result"><b>'+plab+'</b> 뒤 예상 순자산 <span class="big blurable">'+won(proj)+'</span><br><span class="'+(pd>=0?'as-pos':'as-neg')+'">'+(pd>=0?'+':'')+won(pd)+' ('+(pdp>=0?'+':'')+pdp.toFixed(1)+'%)</span></div>'; }
    else perRes='<div class="as-result">기간 버튼을 선택하면 예상 순자산이 표시됩니다.</div>';
    var perCard='<div class="as-card span12"><div class="as-card-t">기간별 성장 전망 <span class="as-mini">복리 가정</span></div><div class="as-field" style="max-width:230px"><label>연 기대수익률 (%)</label><input type="number" value="'+gret+'" onchange="AssetsApp.setScenario(\'gret\',this.value)"></div><div class="as-tabs">'+perBtns+'</div>'+perRes+'<div class="as-note">현재 순자산이 매년 복리로 성장한다고 가정한 단순 전망입니다. (위 충격 가정과는 별개)</div></div>';
    return '<div class="as-sec-head">SCENARIO / STRESS TEST</div><div class="as-sec-sub">자산군별 가격 충격과 환율 변동을 가정하면 순자산이 어떻게 변하는지 시뮬레이션합니다.</div>'
      +'<div class="as-grid">'
      +'<div class="as-card span12"><div class="as-card-t">시나리오 결과</div><div style="display:flex;gap:26px;flex-wrap:wrap;align-items:flex-end"><div><div class="as-sub-amt" style="margin:0">현재 순자산</div><div class="as-big blurable" style="font-size:22px">'+won(cur)+'</div></div><div style="font-size:24px;color:rgba(255,255,255,.3)">\u2192</div><div><div class="as-sub-amt" style="margin:0">시나리오 적용 후</div><div class="as-big blurable '+(delta>=0?'pos':'neg')+'">'+won(nw)+'</div></div><div><div class="as-sub-amt" style="margin:0">변화</div><div class="as-big blurable '+(delta>=0?'pos':'neg')+'" style="font-size:22px">'+(delta>=0?'+':'')+won(delta)+' ('+(dp>=0?'+':'')+dp.toFixed(1)+'%)</div></div></div></div>'
      +'<div class="as-card span6"><div class="as-card-t">충격 가정 (%)</div>'+fld('stock','주식','예: -30')+fld('realestate','부동산','예: -20')+fld('financial','금융자산','예: -10')+fld('cash','현금','보통 0')+fld('fx','환율 USD/KRW','예: 10 (원화 약세)')+'<div class="as-note">각 자산군 가격이 몇 % 변할지 가정합니다. +는 상승, −는 하락. 환율(USD/KRW) +는 <b>원화 약세</b>라 달러 자산의 원화 평가액이 커집니다. 직접 입력하면 위 결과가 즉시 갱신됩니다.</div>'+'</div>'
      +'<div class="as-card span6"><div class="as-card-t">프리셋 <span class="as-mini">클릭하면 자동 적용</span></div><div class="as-tabs" style="flex-direction:column;align-items:stretch">'+pbtn+'</div><div class="as-note">버튼을 누르면 왼쪽 "충격 가정"에 해당 %가 자동 입력되고 결과가 계산됩니다. 예를 들어 <b>금융위기</b>는 주식 −45% · 부동산 −20% · 환율 +12%를 동시에 적용합니다. 실제 예측이 아닌 가정 시나리오입니다.</div></div>'
      +perCard
      +'</div>';
  }

  /* ═══════════ 2단계 B: 가상 포트폴리오 (페이퍼 트레이딩) ═══════════ */
  function paperCalc(){
    var p=S.paper, posVal=0, cost=0;
    p.positions.forEach(function(x){
      var e=(num(x.curPrice)||num(x.avgPrice))*num(x.shares); var eK=(x.ccy==='USD')?e*num(S.fx):e; posVal+=eK;
      var c=num(x.avgPrice)*num(x.shares); cost+=(x.ccy==='USD')?c*num(S.fx):c;
    });
    var total=num(p.cash)+posVal, pl=total-num(p.init), plp=num(p.init)>0?pl/num(p.init)*100:0;
    return {posVal:posVal,total:total,cost:cost,pl:pl,plp:plp};
  }
  function viewPaper(){
    if(!S.paper) S.paper={init:10000000,cash:10000000,positions:[],log:[]};
    var p=S.paper, c=paperCalc();
    var rows=p.positions.map(function(x){
      var e=(num(x.curPrice)||num(x.avgPrice))*num(x.shares); var eK=(x.ccy==='USD')?e*num(S.fx):e;
      var cst=num(x.avgPrice)*num(x.shares); var cstK=(x.ccy==='USD')?cst*num(S.fx):cst;
      var pl=eK-cstK, plp=cstK>0?pl/cstK*100:0, w=c.posVal>0?eK/c.posVal*100:0, cur=(x.ccy==='USD')?'$':'\u20a9';
      return '<tr><td>'+esc(x.ticker)+'</td><td>'+esc(x.name||'')+'</td><td>'+x.ccy+'</td><td class="num">'+num(x.shares)+'</td><td class="num">'+cur+fmt(num(x.avgPrice))+'</td>'
        +'<td><input type="number" value="'+(x.curPrice||'')+'" placeholder="'+fmt(num(x.avgPrice))+'" style="width:92px" onchange="AssetsApp.paperPrice(\''+x.id+'\',this.value)"></td>'
        +'<td class="num blurable">'+won(eK)+'</td>'
        +'<td class="num '+(pl>=0?'as-pos':'as-neg')+'"><span class="blurable">'+(pl>=0?'+':'')+won(pl)+'</span><br><span style="font-size:11px">'+(plp>=0?'+':'')+plp.toFixed(2)+'%</span></td>'
        +'<td class="num">'+w.toFixed(1)+'%</td></tr>';
    }).join('');
    var sellOpts=p.positions.length?p.positions.map(function(x){ return '<option value="'+x.id+'">'+esc(x.ticker)+' ('+num(x.shares)+'주)</option>'; }).join(''):'<option value="">보유 종목 없음</option>';
    var log=(p.log||[]).slice().reverse().slice(0,40).map(function(l){
      var cur=(l.ccy==='USD')?'$':'\u20a9';
      if(l.type==='reset') return '<tr><td>'+fmtDay(l.d)+'</td><td colspan="3" style="color:#c9a96e">시드머니 설정/리셋</td><td class="num blurable">'+won(l.amount)+'</td></tr>';
      var t=l.type==='buy'?'<span class="as-neg">매수</span>':'<span class="as-pos">매도</span>';
      return '<tr><td>'+fmtDay(l.d)+'</td><td>'+t+'</td><td>'+esc(l.ticker)+'</td><td class="num">'+l.shares+' @ '+cur+fmt(l.price)+'</td><td class="num blurable">'+won(l.amount)+'</td></tr>';
    }).join('');
    return '<div class="as-sec-head">PAPER TRADING</div><div class="as-sec-sub">실제 자산과 완전히 분리된 가상 자금으로 매매를 연습합니다. 현재가는 수동 입력이며, 손익은 시드머니 대비로 계산됩니다.</div>'
      +'<div class="as-grid">'
      +'<div class="as-card span12"><div class="as-card-t">가상 총 평가자산 <span class="as-mini">현금 + 보유 평가액</span></div><div class="as-big red blurable">'+won(c.total)+'</div>'
      +'<div class="as-sub-amt blurable">시드 '+won(p.init)+' 대비 <span class="'+(c.pl>=0?'as-pos':'as-neg')+'">'+(c.pl>=0?'+':'')+won(c.pl)+' ('+(c.plp>=0?'+':'')+c.plp.toFixed(2)+'%)</span></div>'
      +'<div class="as-kpis"><div class="as-kpi"><div class="k">현금 잔고</div><div class="v blurable">'+won(p.cash)+'</div></div><div class="as-kpi"><div class="k">보유 평가액</div><div class="v blurable">'+won(c.posVal)+'</div></div><div class="as-kpi"><div class="k">시드머니</div><div class="v blurable">'+won(p.init)+'</div></div></div>'
      +'<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;align-items:flex-end"><div class="as-field" style="margin:0;max-width:190px"><label>시드머니 설정 (원)</label><input type="number" id="pmSeed" placeholder="'+num(p.init)+'"></div><button class="as-btn" onclick="AssetsApp.paperSeed()">설정+초기화</button><button class="as-btn" onclick="AssetsApp.paperReset()">리셋</button></div></div>'
      +'<div class="as-card span6"><div class="as-card-t">매수</div><div class="as-field"><label>티커</label><input type="text" id="pmBuyTk" placeholder="AAPL" autocomplete="off"></div><div class="as-field"><label>종목명</label><input type="text" id="pmBuyNm" placeholder="애플" autocomplete="off"></div><div class="as-field"><label>통화</label><select id="pmBuyCcy">'+ccyOpts('USD')+'</select></div><div style="display:flex;gap:8px"><div class="as-field" style="flex:1"><label>수량</label><input type="number" id="pmBuyQty" placeholder="0"></div><div class="as-field" style="flex:1"><label>매수 단가</label><input type="number" id="pmBuyPx" placeholder="0"></div></div><button class="as-btn solid" onclick="AssetsApp.paperBuy()">매수 체결</button></div>'
      +'<div class="as-card span6"><div class="as-card-t">매도</div><div class="as-field"><label>보유 종목</label><select id="pmSellId">'+sellOpts+'</select></div><div style="display:flex;gap:8px"><div class="as-field" style="flex:1"><label>수량</label><input type="number" id="pmSellQty" placeholder="0"></div><div class="as-field" style="flex:1"><label>매도 단가</label><input type="number" id="pmSellPx" placeholder="0"></div></div><button class="as-btn solid" onclick="AssetsApp.paperSell()">매도 체결</button><div class="as-note">매도 시 실현손익은 현금 잔고에 반영됩니다.</div></div>'
      +'<div class="as-card span12"><div class="as-card-t">가상 보유 종목</div><div style="overflow-x:auto"><table class="as-table"><thead><tr><th>티커</th><th>종목명</th><th>통화</th><th>수량</th><th>평단</th><th>현재가</th><th>평가액(원)</th><th>손익</th><th>비중</th></tr></thead><tbody>'+(rows||'')+'</tbody></table></div>'+(p.positions.length?'':'<div class="as-empty">보유 종목이 없습니다. 위에서 매수해 보세요.</div>')+'</div>'
      +'<div class="as-card span12"><div class="as-card-t">체결 로그 <span class="as-mini">최근 40건</span></div><table class="as-table"><thead><tr><th>일자</th><th>구분</th><th>티커</th><th>수량 @ 단가</th><th>금액(원)</th></tr></thead><tbody>'+(log||'')+'</tbody></table>'+((p.log&&p.log.length)?'':'<div class="as-empty">체결 내역이 없습니다.</div>')+'</div>'
      +'</div>';
  }

  /* ═══════════ 소득 (INCOME) ═══════════ */
  function incomeTypeOpts(sel){ return ['근로','금융','사업','기타'].map(function(t){return '<option'+(t===sel?' selected':'')+'>'+t+'</option>';}).join(''); }
  function viewIncome(){
    if(!S.incomes) S.incomes=[];
    var grossY=0, afterY=0;
    S.incomes.forEach(function(x){ var g=num(x.annual); grossY+=g; afterY+=g*(1-num(x.taxRate)/100); });
    var afterM=afterY/12, grossM=grossY/12;
    var rows=S.incomes.map(function(x){
      var g=num(x.annual), ay=g*(1-num(x.taxRate)/100), am=ay/12;
      return '<tr><td><select style="width:96px" onchange="AssetsApp.edit(\'income\',\''+x.id+'\',\'type\',this.value)">'+incomeTypeOpts(x.type)+'</select></td>'
        +'<td><input value="'+esc(x.name)+'" placeholder="항목명" onchange="AssetsApp.edit(\'income\',\''+x.id+'\',\'name\',this.value)"></td>'
        +'<td><input type="number" class="blurable" value="'+(x.annual||'')+'" placeholder="0" onchange="AssetsApp.edit(\'income\',\''+x.id+'\',\'annual\',this.value)"></td>'
        +'<td><input type="number" value="'+(x.taxRate||'')+'" placeholder="0" style="width:72px" onchange="AssetsApp.edit(\'income\',\''+x.id+'\',\'taxRate\',this.value)"></td>'
        +'<td class="num blurable">'+won(ay)+'</td>'
        +'<td class="num blurable">'+won(am)+'</td>'
        +'<td><span class="as-rowdel" onclick="AssetsApp.del(\'income\',\''+x.id+'\')">\u2715</span></td></tr>';
    }).join('');
    return '<div class="as-sec-head">INCOME</div><div class="as-sec-sub">근로·금융·사업 등 소득원의 세전 연소득과 세율을 입력하면 세후 연/월 소득을 계산합니다. 자산이 아닌 현금흐름 관점의 참고 지표입니다.</div>'
      +'<div class="as-grid">'
      +'<div class="as-card span12"><div class="as-card-t">세후 소득 요약</div><div class="as-big red blurable">'+won(afterM)+'<span style="font-size:15px;color:rgba(255,255,255,.5)"> / 월</span></div>'
      +'<div class="as-kpis"><div class="as-kpi"><div class="k">세전 연소득</div><div class="v blurable">'+won(grossY)+'</div></div><div class="as-kpi"><div class="k">세후 연소득</div><div class="v blurable">'+won(afterY)+'</div></div><div class="as-kpi"><div class="k">세전 월소득</div><div class="v blurable">'+won(grossM)+'</div></div><div class="as-kpi"><div class="k">세후 월소득</div><div class="v blurable">'+won(afterM)+'</div></div></div></div>'
      +'<div class="as-card span12"><div class="as-card-t">소득원</div><div style="overflow-x:auto"><table class="as-table"><thead><tr><th>종류</th><th>항목명</th><th>연소득(세전)</th><th>세율(%)</th><th>세후 연소득</th><th>세후 월소득</th><th></th></tr></thead><tbody>'+(rows||'')+'</tbody></table></div>'+(S.incomes.length?'':'<div class="as-empty">소득원을 추가하세요</div>')+'<button class="as-btn ghost" onclick="AssetsApp.add(\'income\')">+ 소득원 추가</button><div class="as-note">세율은 실효세율(근로소득세·건강보험 등 포함 추정)을 직접 입력하세요. 참고용이며 실제 세액과 다를 수 있습니다.</div></div>'
      +'</div>';
  }

  window.AssetsApp={
    init:function(){
      if(!wired){
        wired=true;
        var nav=document.getElementById('asNav');
        if(nav) nav.addEventListener('click', function(e){ var b=e.target.closest('.as-navbtn'); if(!b) return; sec=b.getAttribute('data-sec'); setNav(); render(); });
        var fx=document.getElementById('asFx'); if(fx) fx.addEventListener('change', function(){ S.fx=num(fx.value)||0; save(); render(); });
        var fxb=document.getElementById('asFxFetch'); if(fxb) fxb.addEventListener('click', function(){ fetchFx(false); });
        if(!fxAutoTried){ fxAutoTried=true; fetchFx(true); }
        var bt=document.getElementById('asBlurToggle'); if(bt) bt.addEventListener('click', function(){ S.blur=!S.blur; save(); render(); });
        liveAutoStart();
      }
      setNav(); render();
      /* 탭 진입 시 1회 시세 갱신 (2분 이내 갱신분은 재사용) */
      if(Date.now()-liveAt > 120000) setTimeout(function(){ fetchLive(false); }, 250);
    },
    liveRefresh:function(){ fetchLive(true); },
    divRefresh:function(){ fetchDiv(true); },
    subRefresh:function(){ subFetch(true); },
    go:function(target){ var b=document.querySelector('.as-navbtn[data-sec="'+target+'"]'); if(b) b.click(); },
    add:function(kind){ var a=S[ARR[kind]]; if(kind==='asset') a.push({id:uid(),type:'\uD604\uAE08',name:'',amount:''}); else if(kind==='debt') a.push({id:uid(),type:'담보대출',name:'',amount:''}); else if(kind==='income') a.push({id:uid(),type:'근로',name:'',annual:'',taxRate:''}); else a.push({id:uid(),ticker:'',name:'',ccy:'USD',shares:'',avgPrice:'',curPrice:'',buyFx:'',sector:'',divPerShare:''}); save(); render(); },
    del:function(kind,id){ S[ARR[kind]]=S[ARR[kind]].filter(function(x){return x.id!==id;}); save(); render(); },
    edit:function(kind,id,field,val){ var row=S[ARR[kind]].filter(function(x){return x.id===id;})[0]; if(!row) return; row[field]=val;
      if(kind==='stock'){ if(field==='ticker'||field==='ccy'){ delete LIVE[id]; } }
      save(); render();
      if(kind==='stock' && (field==='ticker'||field==='ccy')) setTimeout(function(){ fetchLive(false); },200); },
    simTab:function(t){ simTab=t; render(); },
    addSector:function(){ var inp=document.getElementById('asNewSector'); if(!inp) return; var v=(inp.value||'').trim(); if(!v){ return; } if(S.sectors.indexOf(v)>=0){ inp.value=''; return; } S.sectors.push(v); save(); render(); },
    delSector:function(i){ i=parseInt(i,10); if(isNaN(i)||i<0||i>=S.sectors.length) return; if(!confirm('"'+S.sectors[i]+'" 섹터를 삭제할까요?')) return; S.sectors.splice(i,1); save(); render(); },
    divGoalAdd:function(){ if(!S.divGoals) S.divGoals=[]; S.divGoals.push({id:uid(),monthly:''}); save(); render(); },
    divGoalDel:function(id){ S.divGoals=(S.divGoals||[]).filter(function(g){return g.id!==id;}); save(); render(); },
    divGoalEdit:function(id,val){ var g=(S.divGoals||[]).filter(function(x){return x.id===id;})[0]; if(g){ g.monthly=val; save(); render(); } },
    snapSave:function(){ if(!S.snapshots) S.snapshots=[]; S.snapshots.push({d:Date.now(), net:netWorth()}); save(); render(); },
    snapDel:function(d){ d=parseInt(d,10); S.snapshots=(S.snapshots||[]).filter(function(s){return s.d!==d;}); save(); render(); },
    setGoal:function(f,v){ if(!S.goal) S.goal={}; S.goal[f]=v; save(); render(); },
    setRebal:function(k,v){ if(!S.rebal) S.rebal={}; S.rebal[k]=v; save(); render(); },
    setScenario:function(k,v){ if(!S.scenario) S.scenario={}; S.scenario[k]=v; save(); render(); },
    scenarioPreset:function(i){ var ps=window.__asScenPresets; if(!ps||!ps[i]) return; S.scenario=Object.assign({},ps[i][1]); save(); render(); },
    scenarioPeriod:function(d){ if(!S.scenario) S.scenario={}; S.scenario.gperiod=d; save(); render(); },
    paperBuy:function(){ var p=S.paper; var tk=(v('pmBuyTk')||'').toUpperCase().trim(); var nm=(v('pmBuyNm')||'').trim(); var ccy=v('pmBuyCcy')||'USD'; var q=num(v('pmBuyQty')), px=num(v('pmBuyPx'));
      if(!tk||q<=0||px<=0){ alert('티커·수량·단가를 올바르게 입력하세요'); return; }
      var costK=(ccy==='USD')?q*px*num(S.fx):q*px;
      if(costK>num(p.cash)){ alert('현금이 부족합니다.\n필요 '+won(costK)+' / 보유 '+won(p.cash)); return; }
      var pos=p.positions.filter(function(x){return x.ticker===tk&&x.ccy===ccy;})[0];
      if(pos){ var tot=num(pos.shares)+q; pos.avgPrice=(num(pos.shares)*num(pos.avgPrice)+q*px)/tot; pos.shares=tot; if(nm) pos.name=nm; }
      else { p.positions.push({id:uid(),ticker:tk,name:nm||tk,ccy:ccy,shares:q,avgPrice:px,curPrice:px}); }
      p.cash=num(p.cash)-costK; p.log=p.log||[]; p.log.push({d:Date.now(),type:'buy',ticker:tk,shares:q,price:px,ccy:ccy,amount:costK}); save(); render();
    },
    paperSell:function(){ var p=S.paper; var pos=p.positions.filter(function(x){return x.id===v('pmSellId');})[0]; if(!pos){ alert('매도할 종목을 선택하세요'); return; } var q=num(v('pmSellQty')), px=num(v('pmSellPx'));
      if(q<=0||px<=0){ alert('수량·단가를 올바르게 입력하세요'); return; }
      if(q>num(pos.shares)){ alert('보유 수량보다 많이 매도할 수 없습니다 (보유 '+num(pos.shares)+'주)'); return; }
      var procK=(pos.ccy==='USD')?q*px*num(S.fx):q*px; p.cash=num(p.cash)+procK; pos.shares=num(pos.shares)-q; if(pos.shares<=0) p.positions=p.positions.filter(function(x){return x.id!==pos.id;});
      p.log=p.log||[]; p.log.push({d:Date.now(),type:'sell',ticker:pos.ticker,shares:q,price:px,ccy:pos.ccy,amount:procK}); save(); render();
    },
    paperPrice:function(id,val){ var pos=S.paper.positions.filter(function(x){return x.id===id;})[0]; if(pos){ pos.curPrice=val; save(); render(); } },
    paperSeed:function(){ var val=num(v('pmSeed')); if(val<=0){ alert('시드머니를 입력하세요'); return; } if(!confirm('시드머니를 '+won(val)+'(으)로 설정하고 가상 포트폴리오를 초기화할까요?\n(보유·기록 삭제)')) return; S.paper={init:val,cash:val,positions:[],log:[{d:Date.now(),type:'reset',amount:val}]}; save(); render(); },
    paperReset:function(){ if(!confirm('가상 포트폴리오를 초기 시드머니 상태로 리셋할까요?\n(보유·기록 삭제)')) return; var init=num(S.paper&&S.paper.init)||10000000; S.paper={init:init,cash:init,positions:[],log:[{d:Date.now(),type:'reset',amount:init}]}; save(); render(); },
    runAvg:function(){ var st=byId('smAvgId'); if(!st){ out('smAvgOut','\uC885\uBAA9\uC744 \uC120\uD0DD\uD558\uC138\uC694.'); return; } var q=num(v('smAvgQty')), p=num(v('smAvgPx')); var sh=num(st.shares), av=num(st.avgPrice); var nsh=sh+q, nav=nsh>0?(sh*av+q*p)/nsh:0; var cur=st.ccy==='USD'?'$':'\u20a9'; var newEvalK=(st.ccy==='USD'?nav*nsh*num(S.fx):nav*nsh); out('smAvgOut','\uC0C8 \uD3C9\uB2E8 <span class="big">'+cur+fmt(nav)+'</span><br>\uBCF4\uC720\uC218\uB7C9 '+sh+' \u2192 <b>'+nsh+'</b>\uC8FC<br>\uD3C9\uADE0\uB2E8\uAC00 '+cur+fmt(av)+' \u2192 <b>'+cur+fmt(nav)+'</b><br>\uCD94\uAC00 \uD22C\uC785\uAE08 <b>'+cur+fmt(q*p)+'</b>'); },
    runRev:function(){ var st=byId('smRevId'); if(!st){ out('smRevOut','\uC885\uBAA9\uC744 \uC120\uD0DD\uD558\uC138\uC694.'); return; } var target=num(v('smRevTarget')), p=num(v('smRevPx')); var sh=num(st.shares), av=num(st.avgPrice); var cur=st.ccy==='USD'?'$':'\u20a9'; if(p>=target){ out('smRevOut','\u26A0 \uB9E4\uC218\uB2E8\uAC00\uAC00 \uBAA9\uD45C\uD3C9\uB2E8\uBCF4\uB2E4 \uB0AE\uC544\uC57C \uD3C9\uB2E8\uC744 \uB0AE\uCD9C \uC218 \uC788\uC2B5\uB2C8\uB2E4.'); return; } if(target>=av){ out('smRevOut','\u26A0 \uBAA9\uD45C \uD3C9\uB2E8\uC774 \uD604\uC7AC \uD3C9\uB2E8\uBCF4\uB2E4 \uB192\uC2B5\uB2C8\uB2E4. \uC774\uBBF8 \uB2EC\uC131 \uC0C1\uD0DC\uC785\uB2C8\uB2E4.'); return; } var q=sh*(av-target)/(target-p); var qq=Math.ceil(q); out('smRevOut','\uD544\uC694 \uCD94\uAC00\uB9E4\uC218 <span class="big">'+qq+'\uC8FC</span><br>\uB9E4\uC218 \uB2E8\uAC00 '+cur+fmt(p)+' \uAE30\uC900<br>\uD22C\uC785\uAE08 <b>'+cur+fmt(qq*p)+'</b><br>\uACB0\uACFC \uD3C9\uB2E8 \u2248 <b>'+cur+fmt((sh*av+qq*p)/(sh+qq))+'</b>'); },
    runSell:function(){ var st=byId('smSellId'); if(!st){ out('smSellOut','\uC885\uBAA9\uC744 \uC120\uD0DD\uD558\uC138\uC694.'); return; } var q=num(v('smSellQty')), p=num(v('smSellPx')); var av=num(st.avgPrice); var gain=(p-av)*q; var gainK=st.ccy==='USD'?gain*num(S.fx):gain; var ded=2500000; var taxable=Math.max(0,gainK-ded); var tax=taxable*0.22; var cur=st.ccy==='USD'?'$':'\u20a9'; out('smSellOut','\uC2E4\uD604\uC190\uC775 <span class="big" style="color:'+(gainK>=0?'#4ade80':'#ff5b5b')+'">'+won(gainK)+'</span><br>('+cur+fmt(av)+' \u2192 '+cur+fmt(p)+', '+q+'\uC8FC)<br>\uACFC\uC138\uD45C\uC900 (250\uB9CC \uACF5\uC81C \uD6C4) <b>'+won(taxable)+'</b><br>\uC608\uC0C1 \uC591\uB3C4\uC18C\uB4DD\uC138 (22%) <span class="big">'+won(tax)+'</span><br><span style="font-size:10.5px;color:rgba(255,255,255,.4)">\u26A0 \uC5F0\uAC04 \uC2E4\uD604\uC774\uC775 \uD569\uC0B0\u00B7\uC190\uC775\uD1B5\uC0B0 \uBCC4\uB3C4. \uCC38\uACE0\uC6A9 \uCD94\uC815\uCE58.</span>'); },
    runCalc:function(){ var px=num(v('smCalcPx')), pc=num(v('smCalcPct')); if(!px){ out('smCalcOut','\uAE30\uC900 \uAC00\uACA9\uC744 \uC785\uB825\uD558\uC138\uC694.'); return; } var tgt=px*(1+pc/100); var diff=tgt-px; out('smCalcOut','\uBAA9\uD45C\uAC00 <span class="big">'+fmt(tgt)+'</span><br>'+fmt(px)+' \uC5D0\uC11C '+(pc>=0?'+':'')+pc+'% \u2192 '+fmt(tgt)+'<br>\uCC28\uC774 <b>'+(diff>=0?'+':'')+fmt(diff)+'</b>'); }
  };
  function v(id){ var e=document.getElementById(id); return e?e.value:''; }
  function byId(id){ var sid=v(id); return S.stocks.filter(function(s){return s.id===sid;})[0]; }
  function out(id,html){ var e=document.getElementById(id); if(e) e.innerHTML=html; }
  function fmt(n){ n=n||0; return (Math.round(n*100)/100).toLocaleString('ko-KR',{maximumFractionDigits:2}); }
})();

