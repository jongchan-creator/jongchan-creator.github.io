/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 투자 논거 (nn-conviction.js)

   맥락의 ③ 판단한다 단계를 종목 단위로 형식화한 것.
   "이 종목을 왜 들고 있는가"를 논거 하나로 묶고, 그 논거가
   시간에 따라 어떻게 변해 왔는지를 이력으로 남긴다.

   핵심은 상태 이력이다. 지금 생각이 아니라 "3개월 전 나는 이렇게
   생각했다"를 볼 수 있어야 복기가 된다.

   로딩 순서: nn-core → nn-assets → nn-relations → nn-conviction → nn-modules
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnConv) return;

  var KEY = 'nn_conviction_v1';

  /* ── 상태 정의 ── */
  var STATUS = [
    { k:'idea',      lb:'아이디어',   c:'#9ba8b5', d:'떠올랐지만 아직 조사 전' },
    { k:'watching',  lb:'관찰 중',    c:'#7fa8d4', d:'지켜보는 중 · 아직 사지 않음' },
    { k:'active',    lb:'실행',       c:'#e0a94a', d:'실제로 매수해 보유 중' },
    { k:'intact',    lb:'논거 유효',  c:'#5cae94', d:'세운 근거가 지금도 맞다' },
    { k:'weakening', lb:'논거 약화',  c:'#d99b5f', d:'전제 일부가 흔들린다' },
    { k:'broken',    lb:'논거 깨짐',  c:'#d4677a', d:'근거가 더는 유효하지 않다' },
    { k:'closed',    lb:'종료',       c:'#8a8578', d:'정리했다 · 결론이 났다' }
  ];
  function statusOf(k){
    for(var i=0;i<STATUS.length;i++) if(STATUS[i].k === k) return STATUS[i];
    return STATUS[0];
  }

  /* ── 저장소 ── */
  function load(){
    try{ var a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; }
    catch(e){ return []; }
  }
  function save(a){
    try{ localStorage.setItem(KEY, JSON.stringify(a)); return true; }
    catch(e){ return false; }
  }
  function uid(){ return 'cv_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function nowISO(){ return new Date().toISOString(); }

  function byId(id){
    var a = load();
    for(var i=0;i<a.length;i++) if(a[i].id === id) return a[i];
    return null;
  }

  /* ── 만들기 ── */
  function create(seed){
    seed = seed || {};
    var a = load();
    var rec = {
      id: uid(),
      title: seed.title || '',
      asset: (seed.asset || '').toUpperCase(),
      summary: seed.summary || '',
      conviction: seed.conviction || 3,        /* 1~5 */
      status: seed.status || 'idea',
      believe: seed.believe || [],             /* 왜 믿는가 */
      risks: seed.risks || [],                 /* 무엇이 위험한가 */
      breaks: seed.breaks || [],               /* 무엇이 사실이면 논거가 깨지는가 */
      nextReview: seed.nextReview || '',
      history: [{ status: seed.status || 'idea', date: today(), note: '논거를 세움' }],
      createdAt: nowISO(),
      updatedAt: nowISO()
    };
    a.push(rec);
    return save(a) ? rec : null;
  }

  function update(id, patch){
    var a = load(), i = -1;
    for(var k=0;k<a.length;k++) if(a[k].id === id){ i = k; break; }
    if(i < 0) return null;
    Object.keys(patch || {}).forEach(function(key){
      if(key === 'id' || key === 'history' || key === 'createdAt') return;
      a[i][key] = patch[key];
    });
    a[i].updatedAt = nowISO();
    return save(a) ? a[i] : null;
  }

  /* ── 상태 바꾸기 (이력이 핵심) ── */
  function setStatus(id, next, note){
    var a = load(), i = -1;
    for(var k=0;k<a.length;k++) if(a[k].id === id){ i = k; break; }
    if(i < 0) return null;
    if(a[i].status === next) return a[i];
    a[i].status = next;
    a[i].updatedAt = nowISO();
    if(!Array.isArray(a[i].history)) a[i].history = [];
    a[i].history.push({ status: next, date: today(), note: String(note || '').slice(0,200) });
    return save(a) ? a[i] : null;
  }

  function remove(id){
    var a = load(), i = -1;
    for(var k=0;k<a.length;k++) if(a[k].id === id){ i = k; break; }
    if(i < 0) return null;
    var gone = a.splice(i,1)[0];
    save(a);
    /* 맥락에서도 정리 */
    try{ if(window.__nnRel) window.__nnRel.removeAllOf('thesis:' + id); }catch(e){}
    return gone;
  }

  /* ── 검토 시점이 지난 것 ── */
  function dueList(){
    var t = today();
    return load().filter(function(x){
      if(!x.nextReview) return false;
      if(['closed','broken'].indexOf(x.status) >= 0) return false;
      return x.nextReview <= t;
    });
  }

  /* ── 집계 ── */
  function stats(){
    var a = load(), by = {};
    STATUS.forEach(function(s){ by[s.k] = 0; });
    a.forEach(function(x){ if(by[x.status] !== undefined) by[x.status]++; });
    return { total:a.length, byStatus:by, due:dueList().length };
  }

  /* ── 종목으로 찾기 ── */
  function forAsset(tk){
    tk = String(tk || '').toUpperCase();
    return load().filter(function(x){ return (x.asset || '').toUpperCase() === tk; });
  }

  window.__nnConv = {
    STATUS: STATUS, statusOf: statusOf,
    all: load, byId: byId, create: create, update: update,
    setStatus: setStatus, remove: remove,
    dueList: dueList, stats: stats, forAsset: forAsset
  };
})();

/* ══════════════════════════════════════════════════════════════════════
   화면 — 목록 · 상세 · 상태 바꾸기
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var C = window.__nnConv;
  if(!C) return;

  function esc(x){ return String(x==null?'':x)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function stars(n){ return '★'.repeat(n) + '☆'.repeat(5-n); }
  var openId = null;

  function host(){ return document.getElementById('cv-body'); }

  /* ── 목록 ── */
  function renderList(){
    var el = host(); if(!el) return;
    openId = null;
    var all = C.all().slice().sort(function(a,b){ return (b.updatedAt||'').localeCompare(a.updatedAt||''); });
    var due = C.dueList();

    var h = '<div class="cv-top">'
      + '<div class="cv-sum">' + C.STATUS.map(function(s){
          var n = all.filter(function(x){ return x.status === s.k; }).length;
          if(!n) return '';
          return '<span class="cv-chip" style="border-color:' + s.c + '55;color:' + s.c + '">'
               + esc(s.lb) + '<b>' + n + '</b></span>';
        }).join('') + '</div>'
      + '<button type="button" class="cv-new" id="cvNew">＋ 논거 세우기</button>'
      + '</div>';

    if(due.length){
      h += '<div class="cv-due"><b>검토할 때가 된 논거 ' + due.length + '건</b>'
         + '<span>' + due.map(function(x){ return esc(x.title || '제목 없음'); }).join(' · ') + '</span></div>';
    }

    if(!all.length){
      h += '<div class="cv-empty">'
        + '<div class="cv-e-t">아직 세운 논거가 없습니다</div>'
        + '<div class="cv-e-d">종목 하나를 두고 <b>“나는 왜 이걸 사는가”</b>를 적어 두는 곳입니다.<br>'
        + '왜 믿는지, 무엇이 위험한지, <b>무엇이 사실이면 이 판단이 깨지는지</b>까지 적어 두면<br>'
        + '나중에 판단이 흔들릴 때 무엇을 다시 봐야 하는지 알 수 있습니다.</div>'
        + '<button type="button" class="cv-new" id="cvNew2">＋ 첫 논거 세우기</button></div>';
    } else {
      h += '<div class="cv-list">' + all.map(function(x){
        var s = C.statusOf(x.status);
        var overdue = x.nextReview && x.nextReview <= new Date().toISOString().slice(0,10)
                      && ['closed','broken'].indexOf(x.status) < 0;
        return '<button type="button" class="cv-card" data-id="' + x.id + '">'
          + '<span class="cv-c-bar" style="background:' + s.c + '"></span>'
          + '<span class="cv-c-main">'
          +   '<span class="cv-c-head">'
          +     '<span class="cv-c-st" style="color:' + s.c + ';border-color:' + s.c + '55">' + esc(s.lb) + '</span>'
          +     (x.asset ? '<span class="cv-c-tk">' + esc(x.asset) + '</span>' : '')
          +     '<span class="cv-c-cv">' + stars(x.conviction || 3) + '</span>'
          +   '</span>'
          +   '<span class="cv-c-t">' + esc(x.title || '제목 없는 논거') + '</span>'
          +   (x.summary ? '<span class="cv-c-s">' + esc(x.summary) + '</span>' : '')
          +   '<span class="cv-c-meta">'
          +     '<span>' + (x.history ? x.history.length : 1) + '단계 기록</span>'
          +     (x.nextReview ? '<span class="' + (overdue ? 'cv-od' : '') + '">검토 ' + esc(x.nextReview) + '</span>' : '')
          +   '</span>'
          + '</span></button>';
      }).join('') + '</div>';
    }
    el.innerHTML = h;

    ['cvNew','cvNew2'].forEach(function(id){
      var b = el.querySelector('#' + id);
      if(b) b.onclick = function(){ if(window.__nnConvEditor) window.__nnConvEditor(null); };
    });
    el.querySelectorAll('.cv-card').forEach(function(b){
      b.onclick = function(){ openDetail(b.getAttribute('data-id')); };
    });
  }

  /* ── 상세 ── */
  function openDetail(id){
    var x = C.byId(id); if(!x) return;
    openId = id;
    var el = host(); if(!el) return;
    var s = C.statusOf(x.status);

    function listBlock(title, arr, cls){
      if(!arr || !arr.length) return '';
      return '<div class="cv-blk"><div class="cv-blk-t">' + title + '</div><ul class="' + (cls||'') + '">'
           + arr.map(function(v){ return '<li>' + esc(v) + '</li>'; }).join('') + '</ul></div>';
    }

    var h = '<button type="button" class="cv-back" id="cvBack">← 목록으로</button>'
      + '<div class="cv-d-head">'
      +   '<div class="cv-d-line">'
      +     '<span class="cv-c-st" style="color:' + s.c + ';border-color:' + s.c + '55">' + esc(s.lb) + '</span>'
      +     (x.asset ? '<span class="cv-c-tk">' + esc(x.asset) + '</span>' : '')
      +     '<span class="cv-c-cv">' + stars(x.conviction || 3) + '</span>'
      +   '</div>'
      +   '<h2 class="cv-d-t">' + esc(x.title || '제목 없는 논거') + '</h2>'
      +   (x.summary ? '<p class="cv-d-s">' + esc(x.summary) + '</p>' : '')
      + '</div>'
      + '<div class="cv-d-acts">'
      +   '<button type="button" class="cv-act" id="cvStatus">상태 바꾸기</button>'
      +   '<button type="button" class="cv-act" id="cvEdit">내용 고치기</button>'
      +   '<button type="button" class="cv-act cv-del" id="cvDel">삭제</button>'
      + '</div>'
      + listBlock('왜 믿는가', x.believe)
      + listBlock('무엇이 위험한가', x.risks)
      + listBlock('무엇이 사실이면 이 논거가 깨지는가', x.breaks, 'cv-br');

    if(x.nextReview){
      h += '<div class="cv-blk"><div class="cv-blk-t">다음 검토</div><div class="cv-rev">' + esc(x.nextReview) + '</div></div>';
    }

    /* 이력 — 이 기능의 핵심 */
    h += '<div class="cv-blk"><div class="cv-blk-t">생각이 변해 온 기록</div><div class="cv-hist">'
      + (x.history || []).slice().reverse().map(function(hh){
          var hs = C.statusOf(hh.status);
          return '<div class="cv-h-row">'
            + '<span class="cv-h-dot" style="background:' + hs.c + '"></span>'
            + '<span class="cv-h-d">' + esc(hh.date) + '</span>'
            + '<span class="cv-h-st" style="color:' + hs.c + '">' + esc(hs.lb) + '</span>'
            + '<span class="cv-h-n">' + esc(hh.note || '') + '</span>'
            + '</div>';
        }).join('') + '</div></div>';

    /* 맥락 패널 */
    h += '<div id="cvRel"></div>';
    el.innerHTML = h;

    el.querySelector('#cvBack').onclick = renderList;
    el.querySelector('#cvEdit').onclick = function(){ if(window.__nnConvEditor) window.__nnConvEditor(id); };
    el.querySelector('#cvStatus').onclick = function(){ if(window.__nnConvStatus) window.__nnConvStatus(id); };
    el.querySelector('#cvDel').onclick = function(){
      var run = function(){
        C.remove(id);
        renderList();
        if(window.__nnToast) window.__nnToast('논거를 삭제했습니다', {kind:'del'});
      };
      if(window.__nnConfirm) window.__nnConfirm({
        title:'"' + (x.title || '제목 없는 논거') + '"를 삭제할까요?',
        msg:'변해 온 기록도 함께 사라집니다. 되돌릴 수 없습니다.',
        ok:'삭제', onOk:run
      });
      else run();
    };

    try{
      var rel = el.querySelector('#cvRel');
      if(rel && window.__nnRelPanel) rel.appendChild(window.__nnRelPanel('thesis:' + id));
    }catch(e){}
  }

  window.__nnConvRender = function(){ if(openId) openDetail(openId); else renderList(); };
  window.__nnConvOpen = openDetail;
  window.__nnConvList = renderList;
})();

/* ══════════════════════════════════════════════════════════════════════
   논거 세우기 / 고치기 · 상태 바꾸기
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var C = window.__nnConv;
  if(!C) return;

  function esc(x){ return String(x==null?'':x)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function lines(v){ return String(v||'').split('\n').map(function(s){ return s.trim(); }).filter(Boolean); }

  /* ── 논거 세우기 / 고치기 ── */
  function openEditor(id){
    var x = id ? C.byId(id) : null;
    var prev = document.getElementById('cvEd'); if(prev) prev.remove();
    var ov = document.createElement('div');
    ov.id = 'cvEd'; ov.className = 'hub-modal-ov';

    ov.innerHTML = '<div class="hub-modal cv-modal">'
      + '<div class="hm-title">' + (x ? '논거 고치기' : '논거 세우기') + '</div>'
      + '<div class="cv-hint">종목 하나를 두고 “나는 왜 이걸 사는가”를 적습니다. '
      +   '<b>깨지는 조건</b>까지 적어 두면 나중에 판단이 흔들릴 때 큰 값을 합니다.</div>'
      + '<div class="cv-form">'
      +   '<label class="hm-lb">제목</label>'
      +   '<input class="hm-in" id="cvT" maxlength="60" placeholder="예: 엔비디아 — AI 인프라 성장" value="' + esc(x ? x.title : '') + '">'
      +   '<div class="cv-row2">'
      +     '<div><label class="hm-lb">종목 코드</label>'
      +       '<input class="hm-in" id="cvA" maxlength="12" placeholder="NVDA" value="' + esc(x ? x.asset : '') + '"></div>'
      +     '<div><label class="hm-lb">다음 검토일</label>'
      +       '<input class="hm-in" id="cvR" type="date" value="' + esc(x ? x.nextReview : '') + '"></div>'
      +   '</div>'
      +   '<label class="hm-lb">한 줄 요약</label>'
      +   '<input class="hm-in" id="cvS" maxlength="90" placeholder="예: AI 투자 증가에 따른 장기 성장" value="' + esc(x ? x.summary : '') + '">'
      +   '<label class="hm-lb">확신 정도</label>'
      +   '<div class="cv-stars" id="cvCv"></div>'
      +   '<label class="hm-lb">왜 믿는가 <span class="hm-hint">(한 줄에 하나씩)</span></label>'
      +   '<textarea class="hm-in cv-ta" id="cvB" rows="3" placeholder="AI CAPEX가 장기적으로 증가한다&#10;CUDA 생태계의 진입장벽이 유지된다">' + esc(x ? (x.believe||[]).join('\n') : '') + '</textarea>'
      +   '<label class="hm-lb">무엇이 위험한가</label>'
      +   '<textarea class="hm-in cv-ta" id="cvK" rows="3" placeholder="ASIC 경쟁 심화&#10;중국 수출 규제">' + esc(x ? (x.risks||[]).join('\n') : '') + '</textarea>'
      +   '<label class="hm-lb">무엇이 사실이면 이 논거가 깨지는가 <span class="hm-hint">(가장 중요)</span></label>'
      +   '<textarea class="hm-in cv-ta cv-ta-br" id="cvBr" rows="3" placeholder="빅테크 CAPEX 가이던스가 2분기 연속 하향된다&#10;데이터센터 매출 성장률이 한 자릿수로 떨어진다">' + esc(x ? (x.breaks||[]).join('\n') : '') + '</textarea>'
      + '</div>'
      + '<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      + '<button type="button" class="hm-btn hm-save" id="cvOk">' + (x ? '저장' : '세우기') + '</button></div></div>';
    document.body.appendChild(ov);

    var picked = x ? (x.conviction || 3) : 3;
    var cvBox = ov.querySelector('#cvCv');
    function paintStars(){
      cvBox.innerHTML = [1,2,3,4,5].map(function(n){
        return '<button type="button" class="cv-star' + (n <= picked ? ' on' : '') + '" data-n="' + n + '">★</button>';
      }).join('') + '<span class="cv-star-lb">' + ['','거의 확신 없음','조금 믿는다','보통','꽤 믿는다','매우 확신한다'][picked] + '</span>';
      cvBox.querySelectorAll('.cv-star').forEach(function(b){
        b.onclick = function(){ picked = parseInt(b.getAttribute('data-n'),10); paintStars(); };
      });
    }
    paintStars();

    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); }, 200); }
    ov.querySelector('.hm-cancel').onclick = close;
    ov.onclick = function(e){ if(e.target === ov) close(); };
    ov.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ e.preventDefault(); close(); } });

    ov.querySelector('#cvOk').onclick = function(){
      var title = (ov.querySelector('#cvT').value || '').trim();
      if(!title){ if(window.__nnToast) window.__nnToast('제목을 입력해 주세요', {kind:'del'}); return; }
      var payload = {
        title: title,
        asset: (ov.querySelector('#cvA').value || '').trim().toUpperCase(),
        nextReview: ov.querySelector('#cvR').value || '',
        summary: (ov.querySelector('#cvS').value || '').trim(),
        conviction: picked,
        believe: lines(ov.querySelector('#cvB').value),
        risks: lines(ov.querySelector('#cvK').value),
        breaks: lines(ov.querySelector('#cvBr').value)
      };
      var res = x ? C.update(x.id, payload) : C.create(payload);
      if(!res){ if(window.__nnToast) window.__nnToast('저장하지 못했습니다 · 저장 공간을 확인해 주세요', {kind:'del'}); return; }
      close();
      if(x) window.__nnConvOpen(x.id); else window.__nnConvOpen(res.id);
      if(window.__nnToast) window.__nnToast(x ? '✓ 저장했습니다' : '✓ 논거를 세웠습니다');
    };
    requestAnimationFrame(function(){ ov.classList.add('show');
      setTimeout(function(){ try{ ov.querySelector('#cvT').focus(); }catch(e){} }, 120); });
  }

  /* ── 상태 바꾸기 ── */
  function openStatus(id){
    var x = C.byId(id); if(!x) return;
    var prev = document.getElementById('cvSt'); if(prev) prev.remove();
    var ov = document.createElement('div');
    ov.id = 'cvSt'; ov.className = 'hub-modal-ov';
    ov.innerHTML = '<div class="hub-modal cv-st-modal">'
      + '<div class="hm-title">지금은 어떤 상태인가요?</div>'
      + '<div class="cv-hint">바꾼 이유를 함께 적어 두면, 나중에 <b>생각이 어떻게 변했는지</b> 따라갈 수 있습니다.</div>'
      + '<div class="cv-st-list">' + C.STATUS.map(function(s){
          return '<button type="button" class="cv-st-opt' + (s.k === x.status ? ' cur' : '') + '" data-k="' + s.k + '">'
            + '<span class="cv-st-dot" style="background:' + s.c + '"></span>'
            + '<span class="cv-st-b"><span class="cv-st-n" style="color:' + s.c + '">' + esc(s.lb) + '</span>'
            + '<span class="cv-st-d">' + esc(s.d) + '</span></span>'
            + (s.k === x.status ? '<span class="cv-st-now">지금</span>' : '') + '</button>';
        }).join('') + '</div>'
      + '<label class="hm-lb" style="margin-top:12px">왜 바뀌었나요 <span class="hm-hint">(선택)</span></label>'
      + '<input class="hm-in" id="cvNote" maxlength="90" placeholder="예: 1분기 CAPEX 가이던스 상향 — 전제 유지">'
      + '<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      + '<button type="button" class="hm-btn hm-save" id="cvStOk" disabled>기록</button></div></div>';
    document.body.appendChild(ov);

    var next = null;
    var okB = ov.querySelector('#cvStOk');
    ov.querySelectorAll('.cv-st-opt').forEach(function(b){
      b.onclick = function(){
        if(b.getAttribute('data-k') === x.status) return;
        next = b.getAttribute('data-k');
        ov.querySelectorAll('.cv-st-opt').forEach(function(o){ o.classList.remove('sel'); });
        b.classList.add('sel');
        okB.disabled = false;
      };
    });
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); }, 200); }
    ov.querySelector('.hm-cancel').onclick = close;
    ov.onclick = function(e){ if(e.target === ov) close(); };
    okB.onclick = function(){
      if(!next) return;
      C.setStatus(id, next, (ov.querySelector('#cvNote').value || '').trim());
      close();
      window.__nnConvOpen(id);
      if(window.__nnToast) window.__nnToast('✓ ' + C.statusOf(next).lb + '으로 기록했습니다');
    };
    requestAnimationFrame(function(){ ov.classList.add('show'); });
  }

  window.__nnConvEditor = openEditor;
  window.__nnConvStatus = openStatus;
})();

/* ══════════════════════════════════════════════════════════════════════
   첫 실행 시 예시 논거 하나
   맥락 예시(복리와 시간 → 장기 인덱스)와 이어지는 내용으로 만든다.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var C = window.__nnConv;
  if(!C) return;
  var FLAG = 'nn_conv_seed_v1';
  var EX_ID = 'cv_example_1';

  function pickAsset(){
    try{
      var H = window.HOLDINGS || (typeof HOLDINGS !== 'undefined' ? HOLDINGS : []);
      var PREF = ['INFQ','DRAM','VOO','SPY','QQQ','VTI'];
      for(var i=0;i<PREF.length;i++)
        for(var j=0;j<H.length;j++)
          if(String(H[j].tk).toUpperCase() === PREF[i]) return PREF[i];
      for(var k=0;k<H.length;k++)
        if(/ETF|인덱스|지수/i.test(String(H[k].nm||''))) return String(H[k].tk).toUpperCase();
      if(H.length) return String(H[0].tk).toUpperCase();
    }catch(e){}
    return 'VOO';
  }

  function seed(){
    try{
      if(localStorage.getItem(FLAG) === '1') return;
      if(C.all().length > 0){ localStorage.setItem(FLAG,'1'); return; }

      var tk = pickAsset();
      var d = new Date();
      var iso = function(off){
        var x = new Date(d.getTime() + off*86400000);
        return x.toISOString().slice(0,10);
      };

      var rec = C.create({
        title: '[예시] ' + tk + ' — 20년을 버틸 구조로 간다',
        asset: tk,
        summary: '수익률을 좇기보다, 20년 동안 손대지 않을 수 있는 구조를 만든다',
        conviction: 4,
        status: 'idea',
        believe: [
          '복리는 후반부에 가속된다 — 기간 10년이 수익률 2%p보다 크다 (72의 법칙으로 확인)',
          '개별 기업 위험이 없어 한 회사가 무너져도 원칙이 흔들리지 않는다',
          '보수가 낮아 20년이면 원금의 10% 이상을 아낀다',
          '매일 확인하지 않아도 되므로 팔고 싶어지는 순간이 줄어든다'
        ],
        risks: [
          '20년 이상 실질 수익이 없는 장기 횡보장에 들어설 가능성',
          '보수 인상으로 비용 우위가 사라질 가능성',
          '내가 하락장을 버틸 수 있다고 과신했을 가능성'
        ],
        breaks: [
          '빅테크·주요국 성장률이 구조적으로 꺾였다는 근거가 2년 이상 누적된다',
          '보수가 현재의 두 배 이상으로 오른다',
          '내가 실제로 하락장에서 팔았다 — 전제 자체가 틀렸음이 드러난다'
        ],
        nextReview: iso(90)
      });
      if(!rec) return;

      /* 상태 이력을 만들어 둔다 — 이 기능의 핵심이 무엇인지 보여야 한다 */
      C.setStatus(rec.id, 'watching', '3개월 지켜보며 내가 정말 안 팔고 버티는지 확인');
      C.setStatus(rec.id, 'active',   '매달 같은 금액 자동 매수 시작');
      C.setStatus(rec.id, 'intact',   '첫 하락 구간에서 팔지 않았다 — 전제 유지');

      /* 맥락에 이어 둔다 */
      try{
        var R = window.__nnRel;
        if(R){
          R.add('thesis:' + rec.id, 'asset:' + tk, '예시 · 논거 → 보유');
          var k2 = window.KnowledgeNotes;
          if(k2 && k2.data && (k2.data.thesis||[]).some(function(n){ return n.id === 'rlx_judge'; })){
            R.add(R.makeRef('note','thesis','rlx_judge'), 'thesis:' + rec.id, '예시 · 판단 → 논거');
          }
        }
      }catch(e){}

      localStorage.setItem(FLAG,'1');
      if(window.__nnConvRender) window.__nnConvRender();
    }catch(e){}
  }

  (function ready(){
    if(window.__nnRel){ setTimeout(seed, 2000); return; }
    setTimeout(ready, 300);
  })();
})();
