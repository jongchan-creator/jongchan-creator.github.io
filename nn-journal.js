/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 투자 일지 · 복기 (nn-journal.js)

   맥락의 ④ 보유한다 단계에서 실제로 벌어진 일을 남긴다.
   "무엇을 샀다"가 아니라 "왜 샀고, 무엇을 예상했고, 언제 다시 볼 것인가"를
   기록해 두어야 몇 년 뒤에 복기가 된다.

   저널 한 건은 논거(CONVICTION) 하나에 이어 붙일 수 있다.
   그래야 "이 판단이 실제 어떤 매매로 이어졌는가"를 되짚을 수 있다.

   로딩 순서: nn-core → nn-assets → nn-relations → nn-conviction → nn-journal → nn-modules
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnJournal) return;

  var KEY = 'nn_journal_v1';
  var RKEY = 'nn_review_v1';

  var ACTIONS = [
    { k:'buy',   lb:'매수',   c:'#5cae94', sign:'+' },
    { k:'add',   lb:'추가매수', c:'#4d8bff', sign:'+' },
    { k:'trim',  lb:'일부매도', c:'#e0a94a', sign:'−' },
    { k:'sell',  lb:'전량매도', c:'#d4677a', sign:'−' },
    { k:'hold',  lb:'그대로 둠', c:'#9ba8b5', sign:'·' }
  ];
  function actionOf(k){
    for(var i=0;i<ACTIONS.length;i++) if(ACTIONS[i].k === k) return ACTIONS[i];
    return ACTIONS[0];
  }

  /* 매도 이유 — 무엇 때문에 팔았는지가 나중에 가장 중요하다 */
  var SELL_WHY = [
    { k:'broken',  lb:'논거가 깨졌다' },
    { k:'value',   lb:'너무 비싸졌다' },
    { k:'risk',    lb:'위험이 커졌다' },
    { k:'rebal',   lb:'비중을 조정했다' },
    { k:'need',    lb:'현금이 필요했다' },
    { k:'other',   lb:'그 밖의 이유' }
  ];

  function load(){
    try{ var a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; }
    catch(e){ return []; }
  }
  function save(a){
    try{ localStorage.setItem(KEY, JSON.stringify(a)); return true; }catch(e){ return false; }
  }
  function uid(){ return 'jn_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
  function today(){ return new Date().toISOString().slice(0,10); }

  function byId(id){
    var a = load();
    for(var i=0;i<a.length;i++) if(a[i].id === id) return a[i];
    return null;
  }

  function create(seed){
    seed = seed || {};
    var a = load();
    var rec = {
      id: uid(),
      date: seed.date || today(),
      action: seed.action || 'buy',
      asset: (seed.asset || '').toUpperCase(),
      price: seed.price || '',
      qty: seed.qty || '',
      why: seed.why || [],             /* 왜 이렇게 했나 */
      sellWhy: seed.sellWhy || '',     /* 매도일 때 주된 이유 */
      conviction: seed.conviction || 3,
      risks: seed.risks || [],         /* 그때 예상한 위험 */
      reviewDate: seed.reviewDate || '',
      thesisId: seed.thesisId || '',   /* 어떤 논거에 근거했나 */
      outcome: '',                     /* 나중에 적는 결과 */
      lesson: '',                      /* 나중에 적는 배움 */
      createdAt: new Date().toISOString()
    };
    a.push(rec);
    return save(a) ? rec : null;
  }

  function update(id, patch){
    var a = load(), i = -1;
    for(var k=0;k<a.length;k++) if(a[k].id === id){ i = k; break; }
    if(i < 0) return null;
    Object.keys(patch || {}).forEach(function(key){
      if(key === 'id' || key === 'createdAt') return;
      a[i][key] = patch[key];
    });
    return save(a) ? a[i] : null;
  }

  function remove(id){
    var a = load(), i = -1;
    for(var k=0;k<a.length;k++) if(a[k].id === id){ i = k; break; }
    if(i < 0) return null;
    var gone = a.splice(i,1)[0];
    save(a);
    try{ if(window.__nnRel) window.__nnRel.removeAllOf('journal:' + id); }catch(e){}
    return gone;
  }

  /* 최신순 */
  function all(){
    return load().slice().sort(function(a,b){
      return (b.date || '').localeCompare(a.date || '') ||
             (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }
  function forAsset(tk){
    tk = String(tk || '').toUpperCase();
    return all().filter(function(x){ return (x.asset||'').toUpperCase() === tk; });
  }
  function forThesis(tid){
    return all().filter(function(x){ return x.thesisId === tid; });
  }
  /* 되돌아볼 때가 된 기록 */
  function dueList(){
    var t = today();
    return all().filter(function(x){
      return x.reviewDate && x.reviewDate <= t && !x.outcome;
    });
  }

  /* ── 분기 집계 ── */
  function quarterOf(dateStr){
    var d = String(dateStr || '').slice(0,10);
    if(!/^\d{4}-\d{2}/.test(d)) return null;
    var y = d.slice(0,4), m = parseInt(d.slice(5,7), 10);
    return y + '-Q' + Math.ceil(m / 3);
  }
  function quarters(){
    var set = {};
    all().forEach(function(x){ var q = quarterOf(x.date); if(q) set[q] = 1; });
    try{
      var k = window.KnowledgeNotes;
      if(k && k.data){
        ['books','economics','media','lexicon','thesis'].forEach(function(t){
          (k.data[t] || []).forEach(function(n){
            var q = quarterOf(String(n.date || '').replace(/\./g,'-'));
            if(q) set[q] = 1;
          });
        });
      }
    }catch(e){}
    var cur = quarterOf(today()); if(cur) set[cur] = 1;
    return Object.keys(set).sort().reverse();
  }

  function inQuarter(dateStr, q){ return quarterOf(dateStr) === q; }

  function summary(q){
    var out = { quarter:q, books:0, notes:0, thesisNew:0, thesisBroken:0,
                buys:0, sells:0, journal:0, assets:{} };
    try{
      var k = window.KnowledgeNotes;
      if(k && k.data){
        (k.data.books || []).forEach(function(n){
          if(inQuarter(String(n.date||'').replace(/\./g,'-'), q)) out.books++;
        });
        ['economics','media','lexicon','thesis'].forEach(function(t){
          (k.data[t] || []).forEach(function(n){
            if(inQuarter(String(n.date||'').replace(/\./g,'-'), q)) out.notes++;
          });
        });
      }
    }catch(e){}
    try{
      var C = window.__nnConv;
      if(C){
        C.all().forEach(function(t){
          if(inQuarter(String(t.createdAt||'').slice(0,10), q)) out.thesisNew++;
          (t.history || []).forEach(function(h){
            if(h.status === 'broken' && inQuarter(h.date, q)) out.thesisBroken++;
          });
        });
      }
    }catch(e){}
    all().forEach(function(j){
      if(!inQuarter(j.date, q)) return;
      out.journal++;
      if(j.action === 'buy' || j.action === 'add') out.buys++;
      if(j.action === 'sell' || j.action === 'trim') out.sells++;
      if(j.asset) out.assets[j.asset] = (out.assets[j.asset] || 0) + 1;
    });
    return out;
  }

  /* ── 분기 회고 (직접 작성) ── */
  function loadReviews(){
    try{ var o = JSON.parse(localStorage.getItem(RKEY)); return (o && typeof o==='object') ? o : {}; }
    catch(e){ return {}; }
  }
  function saveReviews(o){
    try{ localStorage.setItem(RKEY, JSON.stringify(o)); return true; }catch(e){ return false; }
  }
  function reviewOf(q){
    var r = loadReviews()[q] || {};
    return { best:r.best||'', worst:r.worst||'', learned:r.learned||'', next:r.next||'' };
  }
  function setReview(q, data){
    var o = loadReviews();
    o[q] = {
      best: String(data.best||'').slice(0,200),
      worst: String(data.worst||'').slice(0,200),
      learned: String(data.learned||'').slice(0,600),
      next: String(data.next||'').slice(0,400)
    };
    if(!o[q].best && !o[q].worst && !o[q].learned && !o[q].next) delete o[q];
    return saveReviews(o);
  }

  window.__nnJournal = {
    ACTIONS:ACTIONS, actionOf:actionOf, SELL_WHY:SELL_WHY,
    all:all, byId:byId, create:create, update:update, remove:remove,
    forAsset:forAsset, forThesis:forThesis, dueList:dueList,
    quarters:quarters, quarterOf:quarterOf, summary:summary,
    reviewOf:reviewOf, setReview:setReview
  };
})();

/* ══════════════════════════════════════════════════════════════════════
   화면 — 일지 목록 · 기록하기 · 분기 복기
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var J = window.__nnJournal;
  if(!J) return;

  function esc(x){ return String(x==null?'':x)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function stars(n){ return '★'.repeat(n) + '☆'.repeat(5-n); }
  function lines(v){ return String(v||'').split('\n').map(function(s){ return s.trim(); }).filter(Boolean); }
  function host(){ return document.getElementById('jn-body'); }

  var view = 'log';   /* log | review */
  var curQ = null;

  function thesisTitle(id){
    try{
      var C = window.__nnConv;
      var t = C && C.byId ? C.byId(id) : null;
      return t ? t.title : '';
    }catch(e){ return ''; }
  }

  /* ── 목록 ── */
  function render(){
    var el = host(); if(!el) return;
    var list = J.all();
    var due = J.dueList();

    var h = '<div class="jn-tabs">'
      + '<button type="button" class="jn-tab' + (view==='log'?' on':'') + '" data-v="log">기록</button>'
      + '<button type="button" class="jn-tab' + (view==='review'?' on':'') + '" data-v="review">분기 복기</button>'
      + '<button type="button" class="jn-new" id="jnNew">＋ 기록하기</button>'
      + '</div>';

    if(view === 'review'){ el.innerHTML = h + reviewHTML(); bindReview(el); return; }

    if(due.length){
      h += '<div class="jn-due"><b>돌아볼 때가 된 기록 ' + due.length + '건</b>'
         + '<span>' + due.map(function(x){ return esc(x.asset || '종목 미상') + ' · ' + esc(x.date); }).join(' / ') + '</span></div>';
    }

    if(!list.length){
      h += '<div class="jn-empty">'
        + '<div class="jn-e-t">아직 기록이 없습니다</div>'
        + '<div class="jn-e-d">사고팔 때 <b>“왜 그렇게 했는지”</b>를 남겨 두는 곳입니다.<br>'
        + '가격과 수량은 증권사에도 남지만, <b>그때의 생각은 여기에만</b> 남습니다.<br>'
        + '1년 뒤 “내가 왜 이걸 샀지?”에 답할 수 있게 됩니다.</div>'
        + '<button type="button" class="jn-new" id="jnNew2">＋ 첫 기록 남기기</button></div>';
    } else {
      h += '<div class="jn-list">' + list.map(function(x){
        var a = J.actionOf(x.action);
        var overdue = x.reviewDate && x.reviewDate <= new Date().toISOString().slice(0,10) && !x.outcome;
        var th = thesisTitle(x.thesisId);
        return '<button type="button" class="jn-card" data-id="' + x.id + '">'
          + '<span class="jn-c-side" style="background:' + a.c + '"></span>'
          + '<span class="jn-c-main">'
          +   '<span class="jn-c-top">'
          +     '<span class="jn-c-act" style="color:' + a.c + ';border-color:' + a.c + '55">' + esc(a.lb) + '</span>'
          +     (x.asset ? '<span class="jn-c-tk">' + esc(x.asset) + '</span>' : '')
          +     '<span class="jn-c-date">' + esc(x.date) + '</span>'
          +     '<span class="jn-c-cv">' + stars(x.conviction || 3) + '</span>'
          +   '</span>'
          +   (x.why && x.why.length ? '<span class="jn-c-why">' + esc(x.why[0]) + (x.why.length>1 ? ' 외 ' + (x.why.length-1) + '가지' : '') + '</span>' : '')
          +   '<span class="jn-c-meta">'
          +     (x.price ? '<span>' + esc(x.price) + (x.qty ? ' × ' + esc(x.qty) : '') + '</span>' : '')
          +     (th ? '<span class="jn-c-th">논거 · ' + esc(th) + '</span>' : '')
          +     (x.reviewDate ? '<span class="' + (overdue?'jn-od':'') + '">복기 ' + esc(x.reviewDate) + '</span>' : '')
          +     (x.outcome ? '<span class="jn-done">복기함</span>' : '')
          +   '</span>'
          + '</span></button>';
      }).join('') + '</div>';
    }
    el.innerHTML = h;
    bindTabs(el);
    ['jnNew','jnNew2'].forEach(function(id){
      var b = el.querySelector('#' + id);
      if(b) b.onclick = function(){ if(window.__nnJnEditor) window.__nnJnEditor(null); };
    });
    el.querySelectorAll('.jn-card').forEach(function(b){
      b.onclick = function(){ openDetail(b.getAttribute('data-id')); };
    });
  }

  function bindTabs(el){
    el.querySelectorAll('.jn-tab').forEach(function(b){
      b.onclick = function(){ view = b.getAttribute('data-v'); render(); };
    });
  }

  /* ── 상세 ── */
  function openDetail(id){
    var x = J.byId(id); if(!x) return;
    var el = host(); if(!el) return;
    var a = J.actionOf(x.action);
    var th = thesisTitle(x.thesisId);
    var sw = x.sellWhy ? (J.SELL_WHY.filter(function(s){ return s.k===x.sellWhy; })[0]||{}).lb : '';

    function blk(t, arr){
      if(!arr || !arr.length) return '';
      return '<div class="jn-blk"><div class="jn-blk-t">' + t + '</div><ul>'
           + arr.map(function(v){ return '<li>' + esc(v) + '</li>'; }).join('') + '</ul></div>';
    }

    var h = '<button type="button" class="jn-back" id="jnBack">← 목록으로</button>'
      + '<div class="jn-d-head">'
      +   '<div class="jn-d-line">'
      +     '<span class="jn-c-act" style="color:' + a.c + ';border-color:' + a.c + '55">' + esc(a.lb) + '</span>'
      +     (x.asset ? '<span class="jn-c-tk">' + esc(x.asset) + '</span>' : '')
      +     '<span class="jn-c-date">' + esc(x.date) + '</span>'
      +     '<span class="jn-c-cv">' + stars(x.conviction || 3) + '</span>'
      +   '</div>'
      +   (x.price ? '<div class="jn-d-px">' + esc(x.price) + (x.qty ? ' × ' + esc(x.qty) : '') + '</div>' : '')
      +   (sw ? '<div class="jn-d-sw">판 이유 · <b>' + esc(sw) + '</b></div>' : '')
      + '</div>'
      + '<div class="jn-d-acts">'
      +   '<button type="button" class="jn-act" id="jnEdit">고치기</button>'
      +   '<button type="button" class="jn-act" id="jnOut">' + (x.outcome ? '복기 고치기' : '복기 남기기') + '</button>'
      +   '<button type="button" class="jn-act jn-del" id="jnDel">삭제</button>'
      + '</div>'
      + blk('그때 이렇게 생각했다', x.why)
      + blk('그때 예상한 위험', x.risks);

    if(th){
      h += '<div class="jn-blk"><div class="jn-blk-t">근거가 된 논거</div>'
         + '<button type="button" class="jn-th-go" data-t="' + esc(x.thesisId) + '">' + esc(th) + ' →</button></div>';
    }
    if(x.reviewDate){
      h += '<div class="jn-blk"><div class="jn-blk-t">복기 예정</div><div class="jn-rev">' + esc(x.reviewDate) + '</div></div>';
    }
    if(x.outcome || x.lesson){
      h += '<div class="jn-blk jn-out"><div class="jn-blk-t">돌아보니</div>'
         + (x.outcome ? '<div class="jn-out-t">' + esc(x.outcome) + '</div>' : '')
         + (x.lesson ? '<div class="jn-out-l"><b>배운 것</b> ' + esc(x.lesson) + '</div>' : '')
         + '</div>';
    }
    h += '<div id="jnRel"></div>';
    el.innerHTML = h;

    el.querySelector('#jnBack').onclick = render;
    el.querySelector('#jnEdit').onclick = function(){ if(window.__nnJnEditor) window.__nnJnEditor(id); };
    el.querySelector('#jnOut').onclick = function(){ if(window.__nnJnOutcome) window.__nnJnOutcome(id); };
    el.querySelector('#jnDel').onclick = function(){
      var run = function(){ J.remove(id); render();
        if(window.__nnToast) window.__nnToast('기록을 삭제했습니다', {kind:'del'}); };
      if(window.__nnConfirm) window.__nnConfirm({
        title:'이 기록을 삭제할까요?', msg:'그때의 생각과 복기가 함께 사라집니다.',
        ok:'삭제', onOk:run });
      else run();
    };
    var tg = el.querySelector('.jn-th-go');
    if(tg) tg.onclick = function(){
      if(typeof switchPage === 'function') switchPage('conviction');
      setTimeout(function(){ if(window.__nnConvOpen) window.__nnConvOpen(tg.getAttribute('data-t')); }, 260);
    };
    try{
      var rel = el.querySelector('#jnRel');
      if(rel && window.__nnRelPanel) rel.appendChild(window.__nnRelPanel('journal:' + id));
    }catch(e){}
  }

  /* ── 분기 복기 ── */
  function reviewHTML(){
    var qs = J.quarters();
    if(!curQ) curQ = qs[0] || J.quarterOf(new Date().toISOString().slice(0,10));
    var s = J.summary(curQ);
    var r = J.reviewOf(curQ);
    var top = Object.keys(s.assets).sort(function(a,b){ return s.assets[b]-s.assets[a]; }).slice(0,5);

    function stat(lb, v, sub){
      return '<div class="jn-st"><div class="jn-st-v">' + v + '</div>'
        + '<div class="jn-st-l">' + lb + '</div>'
        + (sub ? '<div class="jn-st-s">' + sub + '</div>' : '') + '</div>';
    }
    function field(k, lb, val, ph){
      return '<div class="jn-rf"><label class="jn-rf-l">' + lb + '</label>'
        + '<textarea class="jn-rf-i" data-k="' + k + '" rows="2" placeholder="' + ph + '">' + esc(val) + '</textarea></div>';
    }

    return '<div class="jn-qsel">' + qs.map(function(q){
        return '<button type="button" class="jn-q' + (q===curQ?' on':'') + '" data-q="' + q + '">' + q.replace('-',' ') + '</button>';
      }).join('') + '</div>'
      + '<div class="jn-stats">'
      +   stat('읽은 책', s.books, '권')
      +   stat('남긴 기록', s.notes, '개')
      +   stat('새 논거', s.thesisNew, '건')
      +   stat('논거 깨짐', s.thesisBroken, '건')
      +   stat('매수', s.buys, '회')
      +   stat('매도', s.sells, '회')
      + '</div>'
      + (top.length ? '<div class="jn-top">이 분기에 다룬 종목 · ' + top.map(function(t){
          return '<b>' + esc(t) + '</b>' + (s.assets[t]>1 ? '<i>' + s.assets[t] + '</i>' : '');
        }).join(' ') + '</div>' : '')
      + '<div class="jn-rform">'
      +   '<div class="jn-rf-head">이 분기를 돌아보며</div>'
      +   field('best','가장 잘한 판단', r.best, '예: 논거가 깨졌을 때 미루지 않고 정리한 것')
      +   field('worst','가장 아쉬운 판단', r.worst, '예: 깨진 줄 알면서 두 달 더 들고 있었던 것')
      +   field('learned','무엇을 배웠나', r.learned, '예: 깨지는 조건을 미리 적어두지 않으면 판단이 늦어진다')
      +   field('next','다음 분기에 할 것', r.next, '예: 모든 논거에 깨지는 조건을 반드시 적는다')
      +   '<button type="button" class="jn-rsave" id="jnRSave">저장</button>'
      + '</div>';
  }

  function bindReview(el){
    el.querySelectorAll('.jn-q').forEach(function(b){
      b.onclick = function(){ curQ = b.getAttribute('data-q'); render(); };
    });
    var sv = el.querySelector('#jnRSave');
    if(sv) sv.onclick = function(){
      var data = {};
      el.querySelectorAll('.jn-rf-i').forEach(function(t){ data[t.getAttribute('data-k')] = t.value; });
      if(!J.setReview(curQ, data)){
        if(window.__nnToast) window.__nnToast('저장하지 못했습니다 · 저장 공간을 확인해 주세요', {kind:'del'});
        return;
      }
      if(window.__nnToast) window.__nnToast('✓ ' + curQ + ' 복기를 저장했습니다');
    };
  }

  window.__nnJnRender = render;
  window.__nnJnOpen = openDetail;
})();

/* ══════════════════════════════════════════════════════════════════════
   기록하기 / 고치기 · 복기 남기기
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var J = window.__nnJournal;
  if(!J) return;

  function esc(x){ return String(x==null?'':x)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function lines(v){ return String(v||'').split('\n').map(function(s){ return s.trim(); }).filter(Boolean); }

  function thesisOptions(sel){
    var out = '<option value="">연결 안 함</option>';
    try{
      var C = window.__nnConv;
      if(C) C.all().forEach(function(t){
        out += '<option value="' + esc(t.id) + '"' + (t.id===sel?' selected':'') + '>'
             + esc((t.asset ? t.asset + ' · ' : '') + (t.title||'제목 없음')) + '</option>';
      });
    }catch(e){}
    return out;
  }

  function openEditor(id){
    var x = id ? J.byId(id) : null;
    var prev = document.getElementById('jnEd'); if(prev) prev.remove();
    var ov = document.createElement('div');
    ov.id = 'jnEd'; ov.className = 'hub-modal-ov';

    ov.innerHTML = '<div class="hub-modal jn-modal">'
      + '<div class="hm-title">' + (x ? '기록 고치기' : '오늘의 기록') + '</div>'
      + '<div class="jn-hint">가격과 수량은 증권사에도 남습니다. 여기에는 '
      +   '<b>그때의 생각</b>을 남기세요. 1년 뒤 가장 값진 부분이 됩니다.</div>'
      + '<div class="jn-form">'
      +   '<div class="jn-row3">'
      +     '<div><label class="hm-lb">날짜</label><input class="hm-in" id="jnD" type="date" value="' + esc(x ? x.date : new Date().toISOString().slice(0,10)) + '"></div>'
      +     '<div><label class="hm-lb">종목</label><input class="hm-in" id="jnA" maxlength="12" placeholder="VOO" value="' + esc(x ? x.asset : '') + '"></div>'
      +     '<div><label class="hm-lb">복기 예정</label><input class="hm-in" id="jnR" type="date" value="' + esc(x ? x.reviewDate : '') + '"></div>'
      +   '</div>'
      +   '<label class="hm-lb">무엇을 했나</label>'
      +   '<div class="jn-acts" id="jnActs"></div>'
      +   '<div class="jn-sellwhy" id="jnSW" style="display:none">'
      +     '<label class="hm-lb">판 이유 <span class="hm-hint">(가장 큰 것 하나)</span></label>'
      +     '<div class="jn-sw-opts" id="jnSWOpts"></div>'
      +   '</div>'
      +   '<div class="jn-row2">'
      +     '<div><label class="hm-lb">가격 <span class="hm-hint">(선택)</span></label><input class="hm-in" id="jnP" maxlength="16" placeholder="520" value="' + esc(x ? x.price : '') + '"></div>'
      +     '<div><label class="hm-lb">수량 <span class="hm-hint">(선택)</span></label><input class="hm-in" id="jnQ" maxlength="16" placeholder="10" value="' + esc(x ? x.qty : '') + '"></div>'
      +   '</div>'
      +   '<label class="hm-lb">그때 이렇게 생각했다 <span class="hm-hint">(한 줄에 하나씩)</span></label>'
      +   '<textarea class="hm-in jn-ta" id="jnW" rows="3" placeholder="20년 버틸 구조를 만들기로 했다&#10;기간이 수익률보다 크다는 것을 확인했다">' + esc(x ? (x.why||[]).join('\n') : '') + '</textarea>'
      +   '<label class="hm-lb">그때 예상한 위험</label>'
      +   '<textarea class="hm-in jn-ta jn-ta-risk" id="jnK" rows="2" placeholder="장기 횡보장에 들어설 가능성&#10;내가 하락장에서 못 버틸 가능성">' + esc(x ? (x.risks||[]).join('\n') : '') + '</textarea>'
      +   '<label class="hm-lb">그때의 확신</label>'
      +   '<div class="cv-stars" id="jnCv"></div>'
      +   '<label class="hm-lb">근거가 된 논거 <span class="hm-hint">(선택)</span></label>'
      +   '<select class="hm-in jn-sel" id="jnT">' + thesisOptions(x ? x.thesisId : '') + '</select>'
      + '</div>'
      + '<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      + '<button type="button" class="hm-btn hm-save" id="jnOk">' + (x ? '저장' : '기록') + '</button></div></div>';
    document.body.appendChild(ov);

    /* 행동 선택 */
    var act = x ? x.action : 'buy';
    var actBox = ov.querySelector('#jnActs');
    var swBox = ov.querySelector('#jnSW');
    function paintActs(){
      actBox.innerHTML = J.ACTIONS.map(function(a){
        return '<button type="button" class="jn-a' + (a.k===act?' on':'') + '" data-k="' + a.k + '"'
          + (a.k===act ? ' style="border-color:' + a.c + ';color:' + a.c + '"' : '') + '>' + a.lb + '</button>';
      }).join('');
      actBox.querySelectorAll('.jn-a').forEach(function(b){
        b.onclick = function(){ act = b.getAttribute('data-k'); paintActs(); toggleSW(); };
      });
    }
    var sw = x ? x.sellWhy : '';
    function toggleSW(){
      var need = (act === 'sell' || act === 'trim');
      swBox.style.display = need ? '' : 'none';
      if(!need) return;
      var o = ov.querySelector('#jnSWOpts');
      o.innerHTML = J.SELL_WHY.map(function(s){
        return '<button type="button" class="jn-sw' + (s.k===sw?' on':'') + '" data-k="' + s.k + '">' + s.lb + '</button>';
      }).join('');
      o.querySelectorAll('.jn-sw').forEach(function(b){
        b.onclick = function(){ sw = b.getAttribute('data-k'); toggleSW(); };
      });
    }
    paintActs(); toggleSW();

    /* 확신 별 */
    var cv = x ? (x.conviction || 3) : 3;
    var cvBox = ov.querySelector('#jnCv');
    function paintCv(){
      cvBox.innerHTML = [1,2,3,4,5].map(function(n){
        return '<button type="button" class="cv-star' + (n<=cv?' on':'') + '" data-n="' + n + '">★</button>';
      }).join('') + '<span class="cv-star-lb">' + ['','거의 확신 없음','조금 믿는다','보통','꽤 믿는다','매우 확신한다'][cv] + '</span>';
      cvBox.querySelectorAll('.cv-star').forEach(function(b){
        b.onclick = function(){ cv = parseInt(b.getAttribute('data-n'),10); paintCv(); };
      });
    }
    paintCv();

    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); }, 200); }
    ov.querySelector('.hm-cancel').onclick = close;
    ov.onclick = function(e){ if(e.target === ov) close(); };
    ov.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ e.preventDefault(); close(); } });

    ov.querySelector('#jnOk').onclick = function(){
      var payload = {
        date: ov.querySelector('#jnD').value || new Date().toISOString().slice(0,10),
        action: act,
        asset: (ov.querySelector('#jnA').value || '').trim().toUpperCase(),
        price: (ov.querySelector('#jnP').value || '').trim(),
        qty: (ov.querySelector('#jnQ').value || '').trim(),
        why: lines(ov.querySelector('#jnW').value),
        risks: lines(ov.querySelector('#jnK').value),
        sellWhy: (act==='sell'||act==='trim') ? sw : '',
        conviction: cv,
        reviewDate: ov.querySelector('#jnR').value || '',
        thesisId: ov.querySelector('#jnT').value || ''
      };
      if(!payload.asset && !payload.why.length){
        if(window.__nnToast) window.__nnToast('종목이나 생각 중 하나는 적어 주세요', {kind:'del'});
        return;
      }
      var res = x ? J.update(x.id, payload) : J.create(payload);
      if(!res){ if(window.__nnToast) window.__nnToast('저장하지 못했습니다 · 저장 공간을 확인해 주세요', {kind:'del'}); return; }
      close();
      if(window.__nnJnOpen) window.__nnJnOpen(res.id);
      if(window.__nnToast) window.__nnToast(x ? '✓ 저장했습니다' : '✓ 기록했습니다');
    };
    requestAnimationFrame(function(){ ov.classList.add('show');
      setTimeout(function(){ try{ ov.querySelector('#jnA').focus(); }catch(e){} }, 120); });
  }

  /* ── 복기 남기기 ── */
  function openOutcome(id){
    var x = J.byId(id); if(!x) return;
    var prev = document.getElementById('jnOu'); if(prev) prev.remove();
    var ov = document.createElement('div');
    ov.id = 'jnOu'; ov.className = 'hub-modal-ov';
    ov.innerHTML = '<div class="hub-modal jn-ou-modal">'
      + '<div class="hm-title">돌아보기</div>'
      + '<div class="jn-hint">' + esc(x.date) + ' · ' + esc(x.asset || '종목 미상')
      +   ' 기록을 되짚습니다. <b>맞았는지보다 왜 그렇게 판단했는지</b>가 중요합니다.</div>'
      + (x.why && x.why.length
          ? '<div class="jn-ou-was"><div class="jn-ou-k">그때 이렇게 생각했다</div><ul>'
            + x.why.map(function(v){ return '<li>' + esc(v) + '</li>'; }).join('') + '</ul></div>'
          : '')
      + '<label class="hm-lb">지금 보니 어떤가</label>'
      + '<textarea class="hm-in jn-ta" id="jnOT" rows="3" placeholder="예: 방향은 맞았지만 진입 시점을 서둘렀다">' + esc(x.outcome) + '</textarea>'
      + '<label class="hm-lb" style="margin-top:12px">무엇을 배웠나</label>'
      + '<textarea class="hm-in jn-ta" id="jnOL" rows="3" placeholder="예: 확신이 강할수록 나눠서 사야 한다">' + esc(x.lesson) + '</textarea>'
      + '<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      + '<button type="button" class="hm-btn hm-save" id="jnOuOk">저장</button></div></div>';
    document.body.appendChild(ov);
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); }, 200); }
    ov.querySelector('.hm-cancel').onclick = close;
    ov.onclick = function(e){ if(e.target === ov) close(); };
    ov.querySelector('#jnOuOk').onclick = function(){
      J.update(id, {
        outcome: (ov.querySelector('#jnOT').value || '').trim().slice(0,400),
        lesson: (ov.querySelector('#jnOL').value || '').trim().slice(0,400)
      });
      close();
      if(window.__nnJnOpen) window.__nnJnOpen(id);
      if(window.__nnToast) window.__nnToast('✓ 복기를 남겼습니다');
    };
    requestAnimationFrame(function(){ ov.classList.add('show'); });
  }

  window.__nnJnEditor = openEditor;
  window.__nnJnOutcome = openOutcome;
})();
