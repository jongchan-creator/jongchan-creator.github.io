/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 투자 일기 (nn-diary.js)

   JOURNAL 과 무엇이 다른가
     JOURNAL 은 '사건' 기록이다 — 사고팔 때만 쓴다.
     이 파일은 '시간' 기록이다 — 매매가 없어도 매일 쓴다.
     둘을 한 곳에 두면 매매 기록이 일기에 파묻히므로 저장소를 나눈다.

   무엇을 남기는가
     핵심 질문은 하나다 — "오늘 무엇을 봤나".
     가격은 증권사에 남고 뉴스는 인터넷에 남는다.
     여기에만 남을 수 있는 것은 '무엇이 내 눈에 들어왔는가' 다.
     몇 달 뒤 판단이 바뀌었을 때, 그 계기를 되짚는 유일한 실마리가 된다.

   그날 시장을 함께 박제한다
     nn-core 의 브리핑이 계산한 코스피·S&P500·나스닥 등락률을
     기록 시점에 같이 넣는다. 소급해서 만들 수 없는 값이다.
     1년 뒤 "그날 시장은 이랬는데 나는 이렇게 봤다"를 볼 수 있다.

   설계에서 가장 신경 쓴 것 — 지속
     매일 쓰는 기록의 적은 부실한 기능이 아니라 2주 뒤 그만두는 것이다.
       · 기본은 한 줄. 더 쓰고 싶을 때만 펼친다
       · 연속 일수(streak)를 쓰지 않는다. 하루 끊기면 그만두게 된다
         대신 "이번 달 12일" 처럼 부드럽게 센다
       · 빈 날을 붉게 칠하지 않는다. 쓴 날만 표시한다

   로딩 순서: … → nn-review.js → nn-fonts.js → nn-diary.js  (맨 마지막)
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnDiary) return;

  var KEY = 'nn_diary_v1';

  function load(){
    try{ var o = JSON.parse(localStorage.getItem(KEY)); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; }
    catch(e){ return {}; }
  }
  function save(o){
    try{ localStorage.setItem(KEY, JSON.stringify(o)); return true; }catch(e){ return false; }
  }
  function today(){ return new Date().toISOString().slice(0,10); }
  function nowISO(){ return new Date().toISOString(); }

  function get(date){ return load()[date] || null; }
  function has(date){ return !!load()[date]; }

  /* 오늘 시장 숫자 — 워커가 연결돼 있을 때만 값이 있다 */
  function marketNow(){
    try{
      var m = window.__nnMarketToday;
      if(!m || m.date !== today()) return null;
      if(m.kospi == null && m.spx == null && m.ixic == null) return null;
      return { kospi:m.kospi, spx:m.spx, ixic:m.ixic };
    }catch(e){ return null; }
  }

  function set(date, patch){
    var all = load();
    var cur = all[date] || {
      date: date, saw: [], note: '', impulse: '', action: '',
      conv: [], market: null, createdAt: nowISO()
    };
    Object.keys(patch || {}).forEach(function(k){
      if(k === 'date' || k === 'createdAt') return;
      cur[k] = patch[k];
    });
    /* 시장 숫자는 그날 처음 쓸 때만 잡는다. 나중에 고쳐도 그날 값을 유지한다 */
    if(!cur.market && date === today()){
      var m = marketNow();
      if(m) cur.market = m;
    }
    cur.updatedAt = nowISO();
    all[date] = cur;
    return save(all) ? cur : null;
  }

  function remove(date){
    var all = load();
    if(!all[date]) return null;
    var gone = all[date];
    delete all[date];
    save(all);
    return gone;
  }
  function restore(rec){
    if(!rec || !rec.date) return null;
    var all = load();
    if(all[rec.date]) return all[rec.date];
    all[rec.date] = rec;
    return save(all) ? rec : null;
  }

  /* 최신순 목록 */
  function all(){
    var o = load();
    return Object.keys(o).sort().reverse().map(function(d){ return o[d]; });
  }

  function ym(date){ return String(date || '').slice(0,7); }

  function stats(){
    var list = all();
    var t = today(), curM = ym(t);
    var thisMonth = list.filter(function(x){ return ym(x.date) === curM; }).length;
    var sawCount = 0;
    list.forEach(function(x){ sawCount += (x.saw || []).length; });
    /* 최근 30일 중 며칠 썼나 — 연속이 아니라 밀도로 센다 */
    var since = new Date(Date.now() - 29*86400000).toISOString().slice(0,10);
    var last30 = list.filter(function(x){ return x.date >= since; }).length;
    return { total:list.length, thisMonth:thisMonth, last30:last30,
             sawCount:sawCount, wroteToday:has(t) };
  }

  window.__nnDiary = {
    all: all, get: get, has: has, set: set, remove: remove, restore: restore,
    stats: stats, today: today, marketNow: marketNow, load: load
  };
})();

/* ══════════════════════════════════════════════════════════════════════
   화면 — 오늘 · 달력 · 목록
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var D = window.__nnDiary;
  if(!D) return;

  function esc(x){ return String(x==null?'':x)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function host(){ return document.getElementById('dy-body'); }

  var view = 'today';               /* today | cal | list */
  var calRef = null;                /* {y, m} */
  var openDate = null;

  var IMPULSE = [
    { k:'none',   lb:'전혀',  c:'#5cae94' },
    { k:'some',   lb:'조금',  c:'#e0a94a' },
    { k:'strong', lb:'많이',  c:'#d4677a' }
  ];
  var ACTION = [
    { k:'nothing', lb:'아무것도' },
    { k:'held',    lb:'참았다' },
    { k:'bought',  lb:'샀다' },
    { k:'sold',    lb:'팔았다' }
  ];
  function impulseOf(k){ for(var i=0;i<IMPULSE.length;i++) if(IMPULSE[i].k===k) return IMPULSE[i]; return null; }
  function actionOf(k){ for(var i=0;i<ACTION.length;i++) if(ACTION[i].k===k) return ACTION[i]; return null; }

  function pct(v){
    if(v == null || isNaN(v)) return '';
    var s = (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%';
    return '<i class="dy-' + (v >= 0 ? 'up' : 'dn') + '">' + s + '</i>';
  }
  function marketLine(m){
    if(!m) return '';
    var bits = [];
    if(m.kospi != null) bits.push('코스피 ' + pct(m.kospi));
    if(m.spx   != null) bits.push('S&P500 ' + pct(m.spx));
    if(m.ixic  != null) bits.push('나스닥 ' + pct(m.ixic));
    if(!bits.length) return '';
    return '<div class="dy-mkt">그날의 시장 · ' + bits.join('  ') + '</div>';
  }
  function dowKo(dstr){
    var d = new Date(dstr + 'T00:00:00');
    return ['일','월','화','수','목','금','토'][d.getDay()];
  }
  function prettyDate(dstr){
    return dstr.slice(0,4) + '.' + dstr.slice(5,7) + '.' + dstr.slice(8,10) + ' ' + dowKo(dstr);
  }

  /* ── 상단 탭 + 요약 ── */
  function headHTML(){
    var s = D.stats();
    return '<div class="dy-tabs">'
      + '<button type="button" class="dy-tab' + (view==='today'?' on':'') + '" data-v="today">오늘</button>'
      + '<button type="button" class="dy-tab' + (view==='cal'?' on':'')   + '" data-v="cal">달력</button>'
      + '<button type="button" class="dy-tab' + (view==='list'?' on':'')  + '" data-v="list">지난 기록</button>'
      + '<span class="dy-count">최근 30일 중 <b>' + s.last30 + '일</b> · 이번 달 <b>' + s.thisMonth + '일</b> · 전체 ' + s.total + '건</span>'
      + '</div>';
  }

  /* ══════════ 오늘 ══════════ */
  function todayHTML(){
    var t = D.today();
    var rec = D.get(t);
    var h = '<div class="dy-today">';
    h += '<div class="dy-t-date">' + prettyDate(t) + '</div>';

    if(!rec){
      var m = D.marketNow();
      h += marketLine(m);
      h += '<div class="dy-t-ask">오늘 무엇을 봤나요?</div>'
        +  '<div class="dy-t-hint">읽은 기사, 본 영상, 귀에 걸린 이야기 — 한 줄이면 충분합니다.<br>'
        +  '몇 달 뒤 생각이 바뀌었을 때, 그 계기를 되짚는 실마리가 됩니다.</div>'
        +  '<button type="button" class="dy-big" id="dyWrite">오늘 기록하기</button>';
    } else {
      h += marketLine(rec.market);
      h += entryHTML(rec, true);
      h += '<div class="dy-t-acts">'
        +  '<button type="button" class="dy-act" id="dyEdit">고치기</button>'
        +  '<button type="button" class="dy-act dy-del" id="dyDel">삭제</button>'
        +  '</div>';
    }
    h += '</div>';

    /* 어제·그제를 함께 보여 준다 — 어제 뭘 봤는지가 오늘 쓰는 데 도움이 된다 */
    var recent = D.all().filter(function(x){ return x.date !== t; }).slice(0,2);
    if(recent.length){
      h += '<div class="dy-sec">바로 앞선 기록</div>';
      h += '<div class="dy-list">' + recent.map(cardHTML).join('') + '</div>';
    }
    return h;
  }

  /* 기록 본문 */
  function entryHTML(rec, big){
    var h = '';
    if(rec.saw && rec.saw.length){
      h += '<div class="dy-blk"><div class="dy-blk-t">오늘 본 것</div><ul class="dy-saw' + (big?' big':'') + '">'
        + rec.saw.map(function(v){ return '<li>' + linkify(v) + '</li>'; }).join('') + '</ul></div>';
    }
    if(rec.note){
      h += '<div class="dy-blk"><div class="dy-blk-t">한 줄</div><div class="dy-note">' + esc(rec.note) + '</div></div>';
    }
    var im = impulseOf(rec.impulse), ac = actionOf(rec.action);
    if(im || ac){
      h += '<div class="dy-chips">';
      if(im) h += '<span class="dy-chip" style="color:' + im.c + ';border-color:' + im.c + '55">팔고 싶었다 · ' + im.lb + '</span>';
      if(ac) h += '<span class="dy-chip">' + esc(ac.lb) + '</span>';
      h += '</div>';
    }
    if(rec.conv && rec.conv.length){
      h += '<div class="dy-blk"><div class="dy-blk-t">이날 생각이 바뀐 논거</div>'
        + rec.conv.map(function(c){
            return '<button type="button" class="dy-cv" data-cv="' + esc(c.id) + '">'
              + esc(c.title || '논거') + ' <i>' + esc(c.fromLb || '') + ' → ' + esc(c.toLb || '') + '</i></button>';
          }).join('') + '</div>';
    }
    if(!h) h = '<div class="dy-empty-in">내용이 비어 있습니다.</div>';
    return h;
  }

  /* 주소만 링크로 바꾼다 — 나머지는 그대로 이스케이프 */
  function linkify(s){
    var out = esc(s);
    return out.replace(/(https?:\/\/[^\s<]+)/g, function(u){
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>';
    });
  }

  function cardHTML(rec){
    var first = (rec.saw && rec.saw[0]) ? rec.saw[0] : (rec.note || '');
    var more = (rec.saw ? rec.saw.length : 0) - 1;
    var im = impulseOf(rec.impulse);
    return '<button type="button" class="dy-card" data-d="' + esc(rec.date) + '">'
      + '<span class="dy-c-date">' + esc(rec.date.slice(5).replace('-','.')) + '<i>' + dowKo(rec.date) + '</i></span>'
      + '<span class="dy-c-body">'
      +   '<span class="dy-c-t">' + esc(String(first).slice(0,70) || '(내용 없음)') + '</span>'
      +   '<span class="dy-c-meta">'
      +     (more > 0 ? '<span>외 ' + more + '건</span>' : '')
      +     (rec.market && rec.market.kospi != null ? '<span>코스피 ' + pct(rec.market.kospi) + '</span>' : '')
      +     (im ? '<span style="color:' + im.c + '">팔고싶음 ' + im.lb + '</span>' : '')
      +   '</span>'
      + '</span></button>';
  }

  /* ══════════ 달력 ══════════ */
  function calHTML(){
    var t = D.today();
    if(!calRef){ var n = new Date(); calRef = { y:n.getFullYear(), m:n.getMonth() }; }
    var Y = calRef.y, M = calRef.m;
    var first = new Date(Y, M, 1), last = new Date(Y, M+1, 0);
    var startDow = first.getDay(), total = last.getDate();
    var MN = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    var data = D.load();

    var h = '<div class="dy-cal-head">'
      + '<button type="button" class="dy-nav" data-mv="-1">‹</button>'
      + '<span class="dy-cal-t">' + Y + ' ' + MN[M] + '</span>'
      + '<button type="button" class="dy-nav" data-mv="1">›</button>'
      + '</div><div class="dy-cal">';
    ['일','월','화','수','목','금','토'].forEach(function(d,i){
      h += '<span class="dy-dow' + (i===0?' sun':(i===6?' sat':'')) + '">' + d + '</span>';
    });
    for(var b=0;b<startDow;b++) h += '<span class="dy-cell empty"></span>';
    for(var day=1; day<=total; day++){
      var ds = Y + '-' + String(M+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
      var rec = data[ds];
      var cls = 'dy-cell' + (rec ? ' has' : '') + (ds === t ? ' today' : '') + (ds > t ? ' future' : '');
      var im = rec ? impulseOf(rec.impulse) : null;
      h += '<button type="button" class="' + cls + '" data-d="' + ds + '"' + (ds > t ? ' disabled' : '') + '>'
        + '<span class="dy-n">' + day + '</span>'
        + (rec ? '<span class="dy-mark" style="background:' + (im ? im.c : '#cf8a6a') + '"></span>' : '')
        + '</button>';
    }
    h += '</div>';

    var mCount = Object.keys(data).filter(function(d){
      return d.slice(0,7) === Y + '-' + String(M+1).padStart(2,'0');
    }).length;
    h += '<div class="dy-cal-sum">' + Y + '년 ' + MN[M] + ' — <b>' + mCount + '일</b> 기록했습니다.</div>';
    if(openDate) h += '<div id="dyDay"></div>';
    return h;
  }

  function dayHTML(ds){
    var rec = D.get(ds);
    var h = '<div class="dy-day">'
      + '<div class="dy-day-h"><span>' + prettyDate(ds) + '</span>'
      + '<button type="button" class="dy-act" id="dyDayEdit">' + (rec ? '고치기' : '이날 기록하기') + '</button></div>';
    if(rec){ h += marketLine(rec.market) + entryHTML(rec); }
    else h += '<div class="dy-empty-in">이날은 기록이 없습니다.</div>';
    h += '</div>';
    return h;
  }

  /* ══════════ 목록 ══════════ */
  function listHTML(){
    var list = D.all();
    if(!list.length){
      return '<div class="dy-empty">'
        + '<div class="dy-e-t">아직 기록이 없습니다</div>'
        + '<div class="dy-e-d">매일 <b>무엇을 봤는지</b> 한 줄씩 남기는 곳입니다.<br>'
        + '하루치는 메모에 지나지 않지만, 1년이 모이면<br>'
        + '<b>내 판단이 무엇에 흔들려 왔는지</b>가 드러납니다.</div></div>';
    }
    /* 달 단위로 묶는다 */
    var groups = {}, order = [];
    list.forEach(function(x){
      var k = x.date.slice(0,7);
      if(!groups[k]){ groups[k] = []; order.push(k); }
      groups[k].push(x);
    });
    return order.map(function(k){
      return '<div class="dy-sec">' + k.slice(0,4) + '년 ' + parseInt(k.slice(5),10) + '월'
        + ' <i>' + groups[k].length + '일 기록</i></div>'
        + '<div class="dy-list">' + groups[k].map(cardHTML).join('') + '</div>';
    }).join('');
  }

  /* ══════════ 그리기 ══════════ */
  function render(){
    var el = host(); if(!el) return;
    var h = headHTML();
    if(view === 'today') h += todayHTML();
    else if(view === 'cal') h += calHTML();
    else h += listHTML();
    el.innerHTML = h;
    bind(el);
    if(view === 'cal' && openDate){
      var box = el.querySelector('#dyDay');
      if(box){
        box.innerHTML = dayHTML(openDate);
        var eb = box.querySelector('#dyDayEdit');
        if(eb) eb.onclick = function(){ if(window.__nnDiaryEditor) window.__nnDiaryEditor(openDate); };
        bindCv(box);
      }
    }
  }

  function bind(el){
    el.querySelectorAll('.dy-tab').forEach(function(b){
      b.onclick = function(){ view = b.getAttribute('data-v'); openDate = null; render(); };
    });
    var w = el.querySelector('#dyWrite');
    if(w) w.onclick = function(){ if(window.__nnDiaryEditor) window.__nnDiaryEditor(D.today()); };
    var e = el.querySelector('#dyEdit');
    if(e) e.onclick = function(){ if(window.__nnDiaryEditor) window.__nnDiaryEditor(D.today()); };
    var d = el.querySelector('#dyDel');
    if(d) d.onclick = function(){ confirmDelete(D.today()); };

    el.querySelectorAll('.dy-nav').forEach(function(b){
      b.onclick = function(){
        var mv = parseInt(b.getAttribute('data-mv'), 10);
        var m = calRef.m + mv, y = calRef.y;
        if(m < 0){ m = 11; y--; } else if(m > 11){ m = 0; y++; }
        calRef = { y:y, m:m }; openDate = null; render();
      };
    });
    el.querySelectorAll('.dy-cell[data-d]').forEach(function(b){
      b.onclick = function(){
        var ds = b.getAttribute('data-d');
        openDate = (openDate === ds) ? null : ds;
        render();
      };
    });
    el.querySelectorAll('.dy-card').forEach(function(b){
      b.onclick = function(){
        var ds = b.getAttribute('data-d');
        calRef = { y:parseInt(ds.slice(0,4),10), m:parseInt(ds.slice(5,7),10)-1 };
        openDate = ds; view = 'cal'; render();
      };
    });
    bindCv(el);
  }

  function bindCv(el){
    el.querySelectorAll('.dy-cv').forEach(function(b){
      b.onclick = function(ev){
        ev.stopPropagation();
        var id = b.getAttribute('data-cv');
        if(typeof switchPage === 'function') switchPage('conviction');
        setTimeout(function(){ try{ if(window.__nnConvOpen) window.__nnConvOpen(id); }catch(e){} }, 280);
      };
    });
  }

  function confirmDelete(ds){
    var run = function(){
      var gone = D.remove(ds);
      render();
      if(!gone) return;
      if(window.__nnToast) window.__nnToast('🗑 ' + ds + ' 기록 삭제됨', {kind:'del', undo:function(){
        D.restore(gone); render();
        if(window.__nnToast) window.__nnToast('✓ 되돌렸습니다');
      }});
    };
    if(window.__nnConfirm) window.__nnConfirm({
      title: ds + ' 기록을 삭제할까요?',
      msg: '삭제 후 잠시 동안은 되돌리기로 복구할 수 있습니다.',
      ok:'삭제', onOk:run
    });
    else run();
  }

  window.__nnDiaryRender = render;
  window.__nnDiaryOpen = function(ds){ view='cal'; openDate=ds||null; render(); };
})();

/* ══════════════════════════════════════════════════════════════════════
   기록하기 / 고치기
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var D = window.__nnDiary;
  if(!D) return;

  function esc(x){ return String(x==null?'':x)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function lines(v){ return String(v||'').split('\n').map(function(s){ return s.trim(); }).filter(Boolean); }

  var IMPULSE = [
    { k:'none',   lb:'전혀',  c:'#5cae94' },
    { k:'some',   lb:'조금',  c:'#e0a94a' },
    { k:'strong', lb:'많이',  c:'#d4677a' }
  ];
  var ACTION = [
    { k:'nothing', lb:'아무것도' },
    { k:'held',    lb:'참았다' },
    { k:'bought',  lb:'샀다' },
    { k:'sold',    lb:'팔았다' }
  ];

  function convOptions(){
    var out = '<option value="">없음</option>';
    try{
      var C = window.__nnConv;
      if(C) C.all().forEach(function(t){
        if(t.status === 'closed') return;
        out += '<option value="' + esc(t.id) + '">' + esc((t.asset ? t.asset + ' · ' : '') + (t.title || '제목 없음')) + '</option>';
      });
    }catch(e){}
    return out;
  }
  function statusOptions(){
    var out = '';
    try{
      var C = window.__nnConv;
      if(C) C.STATUS.forEach(function(s){
        out += '<option value="' + s.k + '">' + esc(s.lb) + '</option>';
      });
    }catch(e){}
    return out;
  }

  function openEditor(date){
    date = date || D.today();
    var x = D.get(date);
    var prev = document.getElementById('dyEd'); if(prev) prev.remove();

    var ov = document.createElement('div');
    ov.id = 'dyEd'; ov.className = 'hub-modal-ov';
    ov.innerHTML = '<div class="hub-modal dy-modal">'
      + '<div class="hm-title">' + (x ? '기록 고치기' : '오늘의 기록') + '</div>'
      + '<div class="dy-hint">' + esc(date) + ' · <b>오늘 무엇을 봤나요</b><br>'
      +   '읽은 기사, 본 영상, 들은 이야기. 한 줄에 하나씩. 주소를 붙여도 됩니다.</div>'
      + '<textarea class="hm-in dy-ta dy-ta-main" id="dySaw" rows="5" '
      +   'placeholder="예: 연준 의사록 — 금리 인하 시점에 이견&#10;유튜브 ○○ 반도체 사이클 편&#10;https://...">'
      +   esc(x ? (x.saw||[]).join('\n') : '') + '</textarea>'
      + '<label class="hm-lb" style="margin-top:14px">한 줄 <span class="hm-hint">(선택)</span></label>'
      + '<input class="hm-in" id="dyNote" maxlength="120" placeholder="오늘을 한 문장으로" value="' + esc(x ? x.note : '') + '">'
      + '<button type="button" class="dy-more" id="dyMore">＋ 더 적기 (팔고 싶었나 · 논거 변화)</button>'
      + '<div class="dy-extra" id="dyExtra" style="display:none">'
      +   '<label class="hm-lb">오늘 팔고 싶었나요</label>'
      +   '<div class="dy-opts" id="dyImp"></div>'
      +   '<label class="hm-lb" style="margin-top:11px">그래서 실제로는</label>'
      +   '<div class="dy-opts" id="dyAct"></div>'
      +   '<label class="hm-lb" style="margin-top:11px">생각이 바뀐 논거 <span class="hm-hint">(선택하면 그 논거의 상태가 함께 바뀝니다)</span></label>'
      +   '<div class="dy-row2">'
      +     '<select class="hm-in dy-sel" id="dyCv">' + convOptions() + '</select>'
      +     '<select class="hm-in dy-sel" id="dyCvSt">' + statusOptions() + '</select>'
      +   '</div>'
      + '</div>'
      + '<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      + '<button type="button" class="hm-btn hm-save" id="dyOk">' + (x ? '저장' : '기록') + '</button></div></div>';
    document.body.appendChild(ov);

    /* 더 적기 펼침 — 이미 값이 있으면 처음부터 펼친다 */
    var extra = ov.querySelector('#dyExtra');
    var moreBtn = ov.querySelector('#dyMore');
    if(x && (x.impulse || x.action || (x.conv && x.conv.length))){
      extra.style.display = ''; moreBtn.style.display = 'none';
    }
    moreBtn.onclick = function(){ extra.style.display = ''; moreBtn.style.display = 'none'; };

    var imp = x ? x.impulse : '';
    var act = x ? x.action : '';
    function paintOpts(){
      ov.querySelector('#dyImp').innerHTML = IMPULSE.map(function(o){
        return '<button type="button" class="dy-opt' + (o.k===imp?' on':'') + '" data-k="' + o.k + '"'
          + (o.k===imp ? ' style="border-color:' + o.c + ';color:' + o.c + '"' : '') + '>' + o.lb + '</button>';
      }).join('');
      ov.querySelector('#dyAct').innerHTML = ACTION.map(function(o){
        return '<button type="button" class="dy-opt' + (o.k===act?' on':'') + '" data-k="' + o.k + '">' + o.lb + '</button>';
      }).join('');
      ov.querySelectorAll('#dyImp .dy-opt').forEach(function(b){
        b.onclick = function(){ imp = (imp === b.getAttribute('data-k')) ? '' : b.getAttribute('data-k'); paintOpts(); };
      });
      ov.querySelectorAll('#dyAct .dy-opt').forEach(function(b){
        b.onclick = function(){ act = (act === b.getAttribute('data-k')) ? '' : b.getAttribute('data-k'); paintOpts(); };
      });
    }
    paintOpts();

    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); }, 200); }
    ov.querySelector('.hm-cancel').onclick = close;
    ov.onclick = function(e){ if(e.target === ov) close(); };
    ov.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ e.preventDefault(); close(); } });

    ov.querySelector('#dyOk').onclick = function(){
      var saw = lines(ov.querySelector('#dySaw').value);
      var note = (ov.querySelector('#dyNote').value || '').trim();
      if(!saw.length && !note){
        if(window.__nnToast) window.__nnToast('오늘 본 것이나 한 줄 중 하나는 적어 주세요', {kind:'del'});
        return;
      }

      /* 논거 상태 변경 — 일기가 CONVICTION 의 이력을 채우는 입구가 된다 */
      var conv = (x && x.conv) ? x.conv.slice() : [];
      var cvId = ov.querySelector('#dyCv').value;
      var cvSt = ov.querySelector('#dyCvSt').value;
      if(cvId && cvSt){
        try{
          var C = window.__nnConv;
          var before = C.byId(cvId);
          if(before && before.status !== cvSt){
            C.setStatus(cvId, cvSt, '일기 ' + date);
            conv.push({ id:cvId, title:before.title || '',
                        fromLb:C.statusOf(before.status).lb, toLb:C.statusOf(cvSt).lb });
          }
        }catch(e){}
      }

      var res = D.set(date, { saw:saw, note:note, impulse:imp, action:act, conv:conv });
      if(!res){ if(window.__nnToast) window.__nnToast('저장하지 못했습니다 · 저장 공간을 확인해 주세요', {kind:'del'}); return; }
      close();
      if(window.__nnDiaryRender) window.__nnDiaryRender();
      if(window.__nnToast) window.__nnToast(x ? '✓ 저장했습니다' : '✓ 오늘을 기록했습니다');
    };

    requestAnimationFrame(function(){ ov.classList.add('show');
      setTimeout(function(){ try{ ov.querySelector('#dySaw').focus(); }catch(e){} }, 120); });
  }

  window.__nnDiaryEditor = openEditor;
})();

/* ══════════════════════════════════════════════════════════════════════
   스타일 — 파일이 직접 주입한다 (nn-style.css 순서를 건드리지 않기 위해)
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(document.getElementById('nnDiaryCss')) return;
  var A = '#cf8a6a';   /* 일기 강조색 — 다른 탭과 겹치지 않는 테라코타 */
  var CSS = [
  '#page-diary .as-h1{text-shadow:0 0 22px rgba(207,138,106,.3)!important}',
  '#page-diary .as-hsub{color:rgba(224,168,140,.6)!important}',
  '#nav-diary{color:#f8f8fa!important}',
  '#nav-diary:hover,#nav-diary.active{color:' + A + '!important;',
  '  text-shadow:0 0 3px rgba(0,0,0,.85),0 1px 4px rgba(0,0,0,.6),0 0 9px rgba(207,138,106,.8)}',
  '#nav-diary .sh{background:linear-gradient(90deg,transparent,' + A + ',transparent)!important}',
  '.cove-line.dy-line{background:linear-gradient(90deg,transparent 0%,rgba(207,138,106,.15) 8%,rgba(224,168,140,.85) 50%,rgba(207,138,106,.15) 92%,transparent 100%)}',

  '.dy-body{margin-top:34px;font-family:\'Pretendard\',sans-serif;background:rgba(10,9,8,.88);',
  '  border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px 24px 26px;',
  '  box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 20px 44px -32px rgba(0,0,0,.9)}',

  /* 탭 */
  '.dy-tabs{display:flex;align-items:center;gap:6px;margin-bottom:18px;flex-wrap:wrap}',
  '.dy-tab{font-size:12.5px;font-weight:600;color:rgba(255,255,255,.55);background:rgba(255,255,255,.04);',
  '  border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:7px 14px;cursor:pointer;transition:.16s}',
  '.dy-tab:hover{color:#fff;background:rgba(255,255,255,.08)}',
  '.dy-tab.on{color:' + A + ';border-color:rgba(207,138,106,.5);background:rgba(207,138,106,.12)}',
  '.dy-count{margin-left:auto;font-size:11px;color:rgba(255,255,255,.38)}',
  '.dy-count b{color:rgba(255,255,255,.7);font-weight:700}',

  /* 오늘 */
  '.dy-today{background:rgba(207,138,106,.06);border:1px solid rgba(207,138,106,.22);',
  '  border-radius:14px;padding:20px 22px 22px;margin-bottom:22px}',
  '.dy-t-date{font-family:\'Orbitron\',sans-serif;font-size:11px;letter-spacing:.14em;',
  '  color:' + A + ';margin-bottom:12px}',
  '.dy-t-ask{font-size:17px;font-weight:700;color:#f0ede6;margin:4px 0 7px}',
  '.dy-t-hint{font-size:12px;font-weight:300;color:rgba(255,255,255,.45);line-height:1.8;margin-bottom:16px}',
  '.dy-big{font-size:13px;font-weight:700;color:#1a1410;background:linear-gradient(135deg,#e0a884,' + A + ');',
  '  border:0;border-radius:10px;padding:12px 22px;cursor:pointer;transition:.16s;letter-spacing:.02em}',
  '.dy-big:hover{filter:brightness(1.08);box-shadow:0 6px 18px -6px rgba(207,138,106,.6)}',
  '.dy-t-acts{display:flex;gap:7px;margin-top:15px}',
  '.dy-act{font-size:11.5px;font-weight:600;color:rgba(255,255,255,.6);background:rgba(255,255,255,.05);',
  '  border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:7px 13px;cursor:pointer;transition:.15s}',
  '.dy-act:hover{color:#fff;border-color:rgba(207,138,106,.5)}',
  '.dy-act.dy-del:hover{color:#e0899b;border-color:rgba(212,103,122,.5)}',

  /* 시장 한 줄 */
  '.dy-mkt{font-size:11.5px;color:rgba(255,255,255,.42);margin-bottom:14px;letter-spacing:.01em}',
  '.dy-up{font-style:normal;color:#5cae94;font-weight:700}',
  '.dy-dn{font-style:normal;color:#d4677a;font-weight:700}',

  /* 본문 블록 */
  '.dy-blk{margin-bottom:14px}',
  '.dy-blk-t{font-family:\'Bebas Neue\',sans-serif;font-size:10px;letter-spacing:.2em;',
  '  color:rgba(207,138,106,.8);margin-bottom:7px}',
  '.dy-saw{margin:0;padding-left:17px;display:flex;flex-direction:column;gap:6px}',
  '.dy-saw li{font-size:13px;color:rgba(245,242,235,.9);line-height:1.65}',
  '.dy-saw.big li{font-size:13.5px}',
  '.dy-saw a{color:#9fc4e8;text-decoration:none;border-bottom:1px solid rgba(159,196,232,.3);word-break:break-all}',
  '.dy-saw a:hover{color:#c5dcf5}',
  '.dy-note{font-size:13px;color:rgba(245,242,235,.85);line-height:1.7;padding-left:2px}',
  '.dy-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}',
  '.dy-chip{font-size:11px;font-weight:600;color:rgba(255,255,255,.6);',
  '  border:1px solid rgba(255,255,255,.16);border-radius:7px;padding:4px 10px}',
  '.dy-cv{display:block;width:100%;text-align:left;font-size:12.5px;color:#9fbef0;',
  '  background:rgba(77,139,255,.08);border:1px solid rgba(77,139,255,.25);border-radius:9px;',
  '  padding:9px 12px;cursor:pointer;margin-bottom:5px;transition:.15s;font-family:\'Pretendard\',sans-serif}',
  '.dy-cv:hover{background:rgba(77,139,255,.16)}',
  '.dy-cv i{font-style:normal;color:rgba(255,255,255,.45);font-size:11px;margin-left:5px}',
  '.dy-empty-in{font-size:12px;color:rgba(255,255,255,.35);padding:10px 0}',

  /* 목록 */
  '.dy-sec{font-size:12px;font-weight:700;color:rgba(255,255,255,.5);margin:20px 0 10px;',
  '  letter-spacing:.02em;display:flex;align-items:baseline;gap:7px}',
  '.dy-sec i{font-style:normal;font-size:10.5px;font-weight:400;color:rgba(207,138,106,.75)}',
  '.dy-list{display:flex;flex-direction:column;gap:7px}',
  '.dy-card{display:flex;align-items:flex-start;gap:13px;text-align:left;width:100%;',
  '  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:11px;',
  '  padding:12px 14px;cursor:pointer;transition:.16s;font-family:\'Pretendard\',sans-serif}',
  '.dy-card:hover{background:rgba(207,138,106,.08);border-color:rgba(207,138,106,.32);transform:translateX(3px)}',
  '.dy-c-date{flex:none;font-family:\'Orbitron\',sans-serif;font-size:12px;font-weight:700;',
  '  color:' + A + ';display:flex;flex-direction:column;align-items:center;gap:2px;min-width:42px}',
  '.dy-c-date i{font-style:normal;font-family:\'Pretendard\',sans-serif;font-size:9.5px;',
  '  font-weight:400;color:rgba(255,255,255,.35)}',
  '.dy-c-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}',
  '.dy-c-t{font-size:13px;font-weight:500;color:rgba(245,242,235,.9);line-height:1.5;',
  '  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.dy-c-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:10.5px;color:rgba(255,255,255,.35)}',

  /* 달력 */
  '.dy-cal-head{display:flex;align-items:center;justify-content:center;gap:16px;max-width:460px;margin:0 auto 14px}',
  '.dy-cal-t{font-family:\'Bebas Neue\',sans-serif;font-size:19px;letter-spacing:.1em;color:#f0ede6}',
  '.dy-nav{width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.05);',
  '  border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.6);cursor:pointer;font-size:15px;line-height:1}',
  '.dy-nav:hover{border-color:rgba(207,138,106,.5);color:' + A + '}',
  '.dy-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;max-width:460px;margin:0 auto}',
  '.dy-dow{text-align:center;font-family:\'Orbitron\',sans-serif;font-size:9px;font-weight:700;',
  '  color:rgba(255,255,255,.3);padding:3px 0 6px}',
  '.dy-dow.sun{color:rgba(255,139,139,.5)} .dy-dow.sat{color:rgba(138,180,255,.5)}',
  '.dy-cell{position:relative;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;',
  '  justify-content:center;gap:4px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);',
  '  border-radius:9px;cursor:pointer;transition:.15s;font-family:\'Pretendard\',sans-serif}',
  '.dy-cell:hover:not(.empty):not(.future){background:rgba(207,138,106,.12);border-color:rgba(207,138,106,.4)}',
  '.dy-cell.empty{visibility:hidden;cursor:default}',
  '.dy-cell.future{opacity:.25;cursor:default}',
  '.dy-cell.has{background:rgba(207,138,106,.1);border-color:rgba(207,138,106,.3)}',
  '.dy-cell.today{box-shadow:0 0 0 1.5px rgba(207,138,106,.7) inset}',
  '.dy-n{font-size:12px;font-weight:500;color:rgba(255,255,255,.62)}',
  '.dy-cell.has .dy-n{color:#f0ede6;font-weight:700}',
  '.dy-mark{width:5px;height:5px;border-radius:50%}',
  '.dy-cal-sum{text-align:center;font-size:11.5px;color:rgba(255,255,255,.4);margin-top:14px}',
  '.dy-cal-sum b{color:' + A + ';font-weight:700}',
  '.dy-day{margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)}',
  '.dy-day-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}',
  '.dy-day-h span{font-size:13px;font-weight:700;color:#f0ede6}',

  /* 빈 상태 */
  '.dy-empty{text-align:center;padding:44px 20px}',
  '.dy-e-t{font-size:15px;font-weight:700;color:rgba(245,242,235,.85);margin-bottom:10px}',
  '.dy-e-d{font-size:12.5px;font-weight:300;color:rgba(255,255,255,.45);line-height:2}',

  /* 편집 창 */
  '.dy-modal{max-width:560px}',
  '.dy-hint{font-size:12px;font-weight:300;color:rgba(255,255,255,.5);line-height:1.75;margin-bottom:14px}',
  '.dy-ta{resize:vertical;line-height:1.7}',
  '.dy-ta-main{font-size:13.5px!important;min-height:120px}',
  '.dy-more{width:100%;margin-top:14px;font-size:12px;font-weight:600;color:rgba(255,255,255,.45);',
  '  background:transparent;border:1px dashed rgba(255,255,255,.18);border-radius:9px;',
  '  padding:10px;cursor:pointer;transition:.15s;font-family:\'Pretendard\',sans-serif}',
  '.dy-more:hover{color:' + A + ';border-color:rgba(207,138,106,.45)}',
  '.dy-extra{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1)}',
  '.dy-opts{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}',
  '.dy-opt{font-size:12px;font-weight:600;color:rgba(255,255,255,.55);background:rgba(255,255,255,.04);',
  '  border:1px solid rgba(255,255,255,.13);border-radius:8px;padding:7px 14px;cursor:pointer;transition:.15s}',
  '.dy-opt:hover{color:#fff}',
  '.dy-opt.on{background:rgba(255,255,255,.1)}',
  '.dy-row2{display:grid;grid-template-columns:1fr 130px;gap:8px;margin-top:5px}',

  '@media (max-width:560px){',
  '  .dy-body{padding:18px 15px 20px}',
  '  .dy-today{padding:16px 16px 18px}',
  '  .dy-count{margin-left:0;width:100%;margin-top:4px}',
  '  .dy-row2{grid-template-columns:1fr}',
  '  .dy-cal{gap:3px}',
  '  .dy-n{font-size:11px}',
  '}'
  ].join('');

  var s = document.createElement('style');
  s.id = 'nnDiaryCss';
  s.textContent = CSS;
  document.head.appendChild(s);
})();
