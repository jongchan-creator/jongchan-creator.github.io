/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 관계 모델 (nn-relations.js)

   이 파일은 "무엇이 무엇과 연결되었는가"만 저장한다.
   책 → 생각 → 투자 논거 → 종목 으로 이어지는 흐름의 토대이며,
   앞으로 만들 INVESTMENT THESIS · 저널 · Knowledge→Capital Flow가
   모두 이 위에 얹힌다.

   설계 원칙
     · 연결은 사용자가 직접 만든 것만 저장한다. 자동 추론하지 않는다.
     · 대상은 문자열 하나(ref)로 가리킨다.  예) note:books:p_seed_lynch
     · 방향은 저장하되, 조회는 양방향으로 한다.
     · 원본이 삭제되면 조회 시점에 걸러낸다(자동 삭제하지 않음 — 복구 여지를 남김).

   로딩 순서: nn-core.js → nn-assets.js → nn-relations.js → nn-modules.js
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnRel) return;

  var KEY = 'nn_relations_v1';

  /* ── 저장소 ───────────────────────────────────────────── */
  function load(){
    try{ var a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; }
    catch(e){ return []; }
  }
  function save(a){
    try{ localStorage.setItem(KEY, JSON.stringify(a)); return true; }
    catch(e){ return false; }   /* 용량 초과 시 안전장치가 알림을 띄운다 */
  }
  function uid(){ return 'rel_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  /* ── ref 문자열 ───────────────────────────────────────────
     note:{탭}:{노트id}   예) note:books:p_seed_lynch
     asset:{티커}         예) asset:NVDA
     thesis:{논거id}      예) thesis:th_abc      (2단계에서 사용)
     journal:{기록id}     예) journal:jn_abc     (3단계에서 사용)
     ───────────────────────────────────────────────────────── */
  function makeRef(kind, a, b){
    if(kind === 'note')  return 'note:' + a + ':' + b;
    return kind + ':' + a;
  }
  function parseRef(ref){
    var p = String(ref || '').split(':');
    if(p[0] === 'note') return { kind:'note', type:p[1], id:p.slice(2).join(':') };
    return { kind:p[0], id:p.slice(1).join(':') };
  }

  /* ── 대상 정보 해석 (표시용) ──────────────────────────── */
  var TAB_LABEL = {
    books:'BOOKS', lexicon:'LEXICON', media:'MEDIA',
    economics:'ECONOMICS', thesis:'생각의 기록'
  };
  var TAB_COLOR = {
    books:'#c9a96e', lexicon:'#9ba8b5', media:'#7fa8d4',
    economics:'#8fb98f', thesis:'#e0709c'
  };
  function customTab(type){
    try{
      var list = window.__nnCustomTabs ? window.__nnCustomTabs() : [];
      for(var i=0;i<list.length;i++) if(list[i].id === type) return list[i];
    }catch(e){}
    return null;
  }

  function resolve(ref){
    var r = parseRef(ref);

    if(r.kind === 'note'){
      var k = window.KnowledgeNotes;
      var arr = (k && k.data && k.data[r.type]) ? k.data[r.type] : null;
      var n = null;
      if(arr) for(var i=0;i<arr.length;i++) if(arr[i].id === r.id){ n = arr[i]; break; }
      var ct = customTab(r.type);
      return {
        ref: ref, kind:'note', type:r.type, id:r.id,
        exists: !!n,
        title: n ? (n.title || '제목 없는 페이지') : '삭제된 기록',
        label: ct ? (ct.name || '내 탭') : (TAB_LABEL[r.type] || r.type.toUpperCase()),
        color: ct ? (ct.color || '#c9a96e') : (TAB_COLOR[r.type] || '#c9a96e'),
        open: function(){
          if(typeof switchPage !== 'function') return;
          switchPage(r.type);
          setTimeout(function(){
            try{
              if(r.type === 'thesis' && window.ThesisApp) window.ThesisApp.open(r.id);
              else if(window.KnowledgeNotes) window.KnowledgeNotes.select(r.type, r.id);
            }catch(e){}
          }, 260);
        }
      };
    }

    if(r.kind === 'asset'){
      var tk = String(r.id || '').toUpperCase();
      var nm = '', held = false;
      try{
        var H = (typeof HOLDINGS !== 'undefined') ? HOLDINGS : (window.HOLDINGS || []);
        for(var j=0;j<H.length;j++) if(String(H[j].tk).toUpperCase() === tk){ nm = H[j].nm || ''; held = true; break; }
      }catch(e){}
      return {
        ref: ref, kind:'asset', id:tk, exists:true,
        title: nm ? (tk + ' · ' + nm) : tk,
        label: held ? '보유' : '종목',
        color: held ? '#b28ad4' : '#7fa8d4',
        open: function(){ if(typeof switchPage === 'function') switchPage(held ? 'portfolio' : 'research'); }
      };
    }

    /* 2·3단계에서 채워질 자리 */
    return { ref:ref, kind:r.kind, id:r.id, exists:false,
             title:r.id, label:String(r.kind).toUpperCase(), color:'#9ba8b5',
             open:function(){} };
  }

  /* ── 조회 ─────────────────────────────────────────────── */
  function of(ref, opt){
    opt = opt || {};
    var out = [];
    load().forEach(function(x){
      var other = null;
      if(x.from === ref) other = x.to;
      else if(x.to === ref) other = x.from;
      if(!other) return;
      var info = resolve(other);
      if(opt.includeMissing !== true && !info.exists) return;   /* 삭제된 대상은 기본 제외 */
      out.push({ id:x.id, ref:other, memo:x.memo || '', createdAt:x.createdAt, target:info });
    });
    out.sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); });
    return out;
  }
  function countOf(ref){ return of(ref).length; }
  function exists(a, b){
    return load().some(function(x){
      return (x.from===a && x.to===b) || (x.from===b && x.to===a);
    });
  }

  /* ── 추가 · 삭제 ──────────────────────────────────────── */
  function add(from, to, memo){
    if(!from || !to || from === to) return null;
    if(exists(from, to)) return 'duplicate';
    var a = load();
    var rec = { id:uid(), from:from, to:to, memo:String(memo||'').slice(0,200),
                createdAt: new Date().toISOString() };
    a.push(rec);
    return save(a) ? rec : null;
  }
  function remove(id){
    var a = load(), i = -1;
    for(var k=0;k<a.length;k++) if(a[k].id === id){ i = k; break; }
    if(i < 0) return null;
    var gone = a.splice(i,1)[0];
    save(a);
    return gone;
  }
  function removeAllOf(ref){
    var a = load();
    var kept = a.filter(function(x){ return x.from !== ref && x.to !== ref; });
    var n = a.length - kept.length;
    if(n) save(kept);
    return n;
  }

  /* ── 이을 수 있는 대상 목록 (선택 UI용) ──────────────── */
  function candidates(excludeRef){
    var out = [];
    var k = window.KnowledgeNotes;
    var tabs = ['books','lexicon','media','economics','thesis'];
    try{
      var custom = window.__nnCustomTabs ? window.__nnCustomTabs() : [];
      custom.forEach(function(t){ tabs.push(t.id); });
    }catch(e){}

    tabs.forEach(function(t){
      var arr = (k && k.data && k.data[t]) ? k.data[t] : [];
      arr.forEach(function(n){
        var ref = makeRef('note', t, n.id);
        if(ref === excludeRef) return;
        var info = resolve(ref);
        out.push({ ref:ref, title:info.title, label:info.label, color:info.color,
                   search:(info.title + ' ' + info.label).toLowerCase() });
      });
    });

    try{
      var H = (typeof HOLDINGS !== 'undefined') ? HOLDINGS : (window.HOLDINGS || []);
      H.forEach(function(h){
        var ref = 'asset:' + String(h.tk).toUpperCase();
        if(ref === excludeRef) return;
        var info = resolve(ref);
        out.push({ ref:ref, title:info.title, label:info.label, color:info.color,
                   search:(info.title + ' 보유 종목').toLowerCase() });
      });
    }catch(e){}

    try{
      var wl = JSON.parse(localStorage.getItem('nn_watchlist_v1') || '[]');
      wl.forEach(function(w){
        var tk = String(w.sym || w.tk || '').replace(/^.*:/,'').toUpperCase();
        if(!tk) return;
        var ref = 'asset:' + tk;
        if(ref === excludeRef) return;
        if(out.some(function(o){ return o.ref === ref; })) return;
        out.push({ ref:ref, title:tk, label:'관심', color:'#7fa8d4',
                   search:(tk + ' 관심 종목').toLowerCase() });
      });
    }catch(e){}

    return out;
  }

  /* ── 통계 (4단계 Flow 시각화에서 사용) ─────────────── */
  function stats(){
    var a = load();
    var byKind = {};
    a.forEach(function(x){
      [x.from, x.to].forEach(function(r){
        var k = parseRef(r).kind;
        byKind[k] = (byKind[k]||0) + 1;
      });
    });
    return { total:a.length, byKind:byKind };
  }

  window.__nnRel = {
    add:add, remove:remove, removeAllOf:removeAllOf,
    of:of, countOf:countOf, exists:exists,
    resolve:resolve, makeRef:makeRef, parseRef:parseRef,
    candidates:candidates, stats:stats,
    all:load
  };
})();

/* ══════════════════════════════════════════════════════════════════════
   맥락 UI — 편집 화면의 "맥락" 패널 + 대상 고르기 창
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var R = window.__nnRel;
  if(!R) return;

  function esc(x){ return String(x==null?'':x)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ── 편집 화면에 붙는 맥락 패널 ── */
  function buildPanel(ref){
    var wrap = document.createElement('div');
    wrap.className = 'rl-panel';
    wrap.setAttribute('data-ref', ref);
    paint(wrap, ref);
    return wrap;
  }

  function paint(wrap, ref){
    var list = R.of(ref);
    var h = '<div class="rl-head">'
          + '<span class="rl-eyebrow">THREAD</span><span class="rl-title">맥락</span>'
          + (list.length ? '<span class="rl-n">' + list.length + '</span>' : '')
          + '<button type="button" class="rl-help" title="맥락이란?">?</button>'
          + '<button type="button" class="rl-add">＋ 맥락 잇기</button>'
          + '</div>';

    if(!list.length){
      var seen = false;
      try{ seen = localStorage.getItem('nn_rel_intro_v1') === '1'; }catch(e){}
      if(!seen){
        h += '<div class="rl-intro">'
          +   '<div class="rl-i-t">이 기록에서 무엇이 뻗어 나갔나요?</div>'
          +   '<div class="rl-i-d">읽은 것 → 든 생각 → 내린 판단 → 보유한 자산.<br>'
          +     '그 갈래를 이어 두면, 몇 년 뒤 <b>“나는 왜 이걸 샀지?”</b>에 '
          +     '기억이 아니라 <b>기록으로</b> 답할 수 있습니다.</div>'
          +   '<div class="rl-i-f">'
          +     '<button type="button" class="rl-i-more">맥락이 무엇인지 자세히 보기 →</button>'
          +     '<button type="button" class="rl-i-x">닫기</button>'
          +   '</div>'
          + '</div>';
      } else {
        h += '<div class="rl-empty">이 기록에서 뻗어 나가는 갈래를 이어 두면, '
           + '나중에 <b>“나는 왜 이렇게 판단했는가”</b>를 되짚을 수 있습니다.</div>';
      }
    } else {
      h += '<div class="rl-list">' + list.map(function(x){
        return '<div class="rl-item" data-id="' + x.id + '" data-ref="' + esc(x.ref) + '">'
             + '<span class="rl-dot" style="background:' + esc(x.target.color) + '"></span>'
             + '<span class="rl-lb" style="color:' + esc(x.target.color) + '">' + esc(x.target.label) + '</span>'
             + '<span class="rl-t">' + esc(x.target.title) + '</span>'
             + (x.memo ? '<span class="rl-memo' + (/^예시/.test(x.memo) ? ' ex' : '') + '">' + esc(x.memo) + '</span>' : '')
             + '<button type="button" class="rl-x" title="맥락 끊기">✕</button>'
             + '</div>';
      }).join('') + '</div>';
      if(list.some(function(x){ return /^예시/.test(x.memo||''); })){
        h += '<button type="button" class="rl-clear">예시 갈래·페이지 정리하기</button>';
      }
    }
    wrap.innerHTML = h;

    var helpB = wrap.querySelector('.rl-help');
    if(helpB) helpB.onclick = function(){ if(window.__nnRelGuide) window.__nnRelGuide(); };

    var addBtn = wrap.querySelector('.rl-add');
    if(addBtn) addBtn.onclick = function(){ openPicker(ref, function(){ paint(wrap, ref); }); };

    var clearB = wrap.querySelector('.rl-clear');
    if(clearB) clearB.onclick = function(){
      var run = function(){
        var n = window.__nnRelClearExamples ? window.__nnRelClearExamples() : 0;
        paint(wrap, ref);
        if(window.__nnToast) window.__nnToast('예시를 정리했습니다 · ' + n + '개 항목');
      };
      if(window.__nnConfirm) window.__nnConfirm({
        title:'예시를 지울까요?',
        msg:'[예시] 표기가 붙은 페이지와 갈래를 함께 지웁니다. 직접 만드신 기록은 그대로 남습니다.',
        ok:'정리', onOk:run
      });
      else run();
    };

    var moreB = wrap.querySelector('.rl-i-more');
    if(moreB) moreB.onclick = function(){ if(window.__nnRelGuide) window.__nnRelGuide(); };

    var introX = wrap.querySelector('.rl-i-x');
    if(introX) introX.onclick = function(){
      try{ localStorage.setItem('nn_rel_intro_v1','1'); }catch(e){}
      paint(wrap, ref);
    };

    wrap.querySelectorAll('.rl-item').forEach(function(el){
      el.onclick = function(e){
        if(e.target.closest('.rl-x')) return;
        var info = R.resolve(el.getAttribute('data-ref'));
        if(info && info.open) info.open();
      };
    });
    wrap.querySelectorAll('.rl-x').forEach(function(b){
      b.onclick = function(e){
        e.stopPropagation();
        var el = b.closest('.rl-item');
        var id = el.getAttribute('data-id');
        var gone = R.remove(id);
        paint(wrap, ref);
        if(gone && window.__nnToast) window.__nnToast('맥락을 끊었습니다', {kind:'del', undo:function(){
          R.add(gone.from, gone.to, gone.memo); paint(wrap, ref);
        }});
      };
    });
  }

  /* ── 대상 고르기 창 ── */
  function openPicker(ref, after){
    var prev = document.getElementById('rlOv'); if(prev) prev.remove();
    var all = R.candidates(ref);

    var ov = document.createElement('div');
    ov.id = 'rlOv'; ov.className = 'hub-modal-ov';
    ov.innerHTML = '<div class="hub-modal rl-modal">'
      + '<div class="hm-title">무엇과 이을까요?</div>'
      + '<div class="rl-hint">이 기록에서 뻗어 나가는 갈래를 고르세요. 직접 이은 것만 기록됩니다.</div>'
      + '<input class="hm-in rl-search" id="rlSearch" placeholder="제목 · 종목으로 찾기" autocomplete="off">'
      + '<div class="rl-cands" id="rlCands"></div>'
      + '<label class="hm-lb" style="margin-top:12px">메모 <span class="hm-hint">(선택 · 왜 이었는지)</span></label>'
      + '<input class="hm-in" id="rlMemo" placeholder="예: 이 책의 복리 개념에서 출발" maxlength="60" autocomplete="off">'
      + '<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      + '<button type="button" class="hm-btn hm-save" id="rlOk" disabled>잇기</button></div></div>';
    document.body.appendChild(ov);

    var picked = null;
    var box = ov.querySelector('#rlCands');
    var okB = ov.querySelector('#rlOk');
    var search = ov.querySelector('#rlSearch');

    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); }, 200); }
    ov.querySelector('.hm-cancel').onclick = close;
    ov.onclick = function(e){ if(e.target === ov) close(); };
    ov.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ e.preventDefault(); close(); } });

    function render(q){
      q = (q||'').trim().toLowerCase();
      var list = q ? all.filter(function(x){ return x.search.indexOf(q) >= 0; }) : all;
      if(!list.length){
        box.innerHTML = '<div class="rl-none">' + (q ? '찾는 대상이 없습니다.' : '이을 수 있는 기록이 아직 없습니다.') + '</div>';
        return;
      }
      box.innerHTML = list.slice(0, 60).map(function(x){
        var on = (picked === x.ref);
        var already = R.exists(ref, x.ref);
        return '<button type="button" class="rl-cand' + (on?' sel':'') + (already?' done':'') + '"'
             + ' data-ref="' + esc(x.ref) + '"' + (already?' disabled':'') + '>'
             + '<span class="rl-dot" style="background:' + esc(x.color) + '"></span>'
             + '<span class="rl-c-lb" style="color:' + esc(x.color) + '">' + esc(x.label) + '</span>'
             + '<span class="rl-c-t">' + esc(x.title) + '</span>'
             + (already ? '<span class="rl-c-done">이어짐</span>' : '')
             + '</button>';
      }).join('');
      box.querySelectorAll('.rl-cand').forEach(function(b){
        b.onclick = function(){
          picked = b.getAttribute('data-ref');
          box.querySelectorAll('.rl-cand').forEach(function(o){ o.classList.remove('sel'); });
          b.classList.add('sel');
          okB.disabled = false;
        };
      });
    }
    render('');
    search.addEventListener('input', function(){ render(search.value); });

    okB.onclick = function(){
      if(!picked) return;
      var memo = (ov.querySelector('#rlMemo').value || '').trim();
      var res = R.add(ref, picked, memo);
      if(res === 'duplicate'){
        if(window.__nnToast) window.__nnToast('이미 이어져 있습니다', {kind:'del'});
        return;
      }
      if(!res){
        if(window.__nnToast) window.__nnToast('저장하지 못했습니다 · 저장 공간을 확인해 주세요', {kind:'del'});
        return;
      }
      close();
      if(after) after();
      if(window.__nnToast) window.__nnToast('✓ 맥락을 이었습니다');
    };
    requestAnimationFrame(function(){ ov.classList.add('show'); setTimeout(function(){ try{ search.focus(); }catch(e){} }, 120); });
  }

  /* ══════════════════════════════════════════════════════════
     첫 실행 시 예시 갈래 한 줄 만들어 두기

     설명만 읽어서는 감이 오지 않는다. 실제로 이어져 있는 기록을
     타고 다녀 봐야 이해된다. 그래서 읽기 → 생각 → 확인 → 보유
     네 칸이 실제로 이어진 표본을 만들어 둔다.
     모두 [예시] 표기가 붙어 있고 언제든 지울 수 있다.
     ══════════════════════════════════════════════════════════ */
  var SEED_FLAG = 'nn_rel_seed_v4';

  function noteHTML(parts){ return parts.join('\n'); }

  var SAMPLE = {
    book: {
      type:'books', id:'rlx_book',
      title:'[예시] 돈의 심리학',
      cover:'https://search.pstatic.net/common/?src=https%3A%2F%2Fshopping-phinf.pstatic.net%2Fmain_5840134%2F58401345275.20260331120920.jpg&type=w276',
      content: noteHTML([
        '<div class="np-note" contenteditable="false">📘 <b>맥락 예시 · 1단계 — 읽는다</b><br>기능을 보여드리는 표본입니다. 아래 <b>맥락</b> 칸을 보시면 이 책에서 무엇이 뻗어 나갔는지 이어져 있습니다. 필요 없으면 맥락 칸의 “예시 정리하기”로 한 번에 지울 수 있습니다.</div>',
        '<div style="font-weight:700;margin-top:14px">밑줄 친 문장</div>',
        '<blockquote>“부자가 되는 것과 부를 지키는 것은 완전히 다른 기술이다. 전자는 위험을 감수해야 하고, 후자는 겸손을 요구한다.”</blockquote>',
        '<div style="font-weight:700;margin-top:14px">기억에 남은 것</div>',
        '<ul>',
        '<li>같은 수익률이라도 <b>얼마나 오래 유지했는가</b>가 결과를 가른다.</li>',
        '<li>워런 버핏 자산의 대부분은 65세 이후에 만들어졌다. 실력보다 <b>시간</b>이 컸다.</li>',
        '<li>합리적으로 최적인 선택보다, <b>내가 끝까지 지킬 수 있는 선택</b>이 실제로는 낫다.</li>',
        '</ul>',
        '<div style="font-weight:700;margin-top:14px">덮으면서 든 생각</div>',
        '<div>나는 그동안 “무엇을 살까”만 고민했다. “얼마나 오래 들고 갈까”는 한 번도 정해본 적이 없다.<br>이 생각을 따로 정리해 두자. → <b>맥락으로 이어 둠</b></div>'
      ])
    },
    think: {
      type:'thesis', id:'rlx_think',
      title:'[예시] 시간이 가장 큰 변수다',
      content: noteHTML([
        '<div class="np-note" contenteditable="false">💭 <b>맥락 예시 · 2단계 — 생각한다</b><br>앞의 책에서 출발해 정리한 생각입니다. 아래 <b>맥락</b>을 보시면 이 생각이 어디서 왔고 어디로 이어졌는지 보입니다.</div>',
        '<div style="font-weight:700;margin-top:6px">내가 믿는 것</div>',
        '<div>수익률 2%p를 더 얻으려 애쓰는 것보다, <b>같은 방식을 15년 더 유지하는 쪽</b>이 결과가 크다.</div>',
        '<div style="font-weight:700;margin-top:14px">왜 그렇게 생각하는가</div>',
        '<ul>',
        '<li>복리는 후반부에 가속된다. 초반 수익률 차이는 시간이 지날수록 희석된다.</li>',
        '<li>높은 수익률을 좇으면 회전율이 올라가고, 세금과 수수료가 복리를 갉아먹는다.</li>',
        '<li>중간에 그만두는 가장 큰 이유는 수익률이 아니라 <b>심리적 피로</b>다.</li>',
        '</ul>',
        '<div style="font-weight:700;margin-top:14px">이 판단이 틀렸다면 어디서일까</div>',
        '<ul>',
        '<li>장기 우상향이라는 전제가 깨지는 시장이라면 (예: 20년 횡보)</li>',
        '<li>내가 20년을 버틸 수 있다고 과신했다면</li>',
        '</ul>',
        '<div class="np-note" contenteditable="false">🔎 이 두 가지가 흔들리면, 아래 맥락으로 이어진 <b>보유 종목</b>도 함께 다시 봐야 합니다. — 이것이 맥락을 이어 두는 이유입니다.</div>',
        '<div style="font-weight:700;margin-top:14px">확인해 본 것</div>',
        '<div>72의 법칙으로 계산해 보니, 연 7%는 약 10년, 연 9%는 약 8년이면 원금이 두 배가 된다.<br>2%p 차이는 2년, 기간을 10년 늘리면 자산은 한 번 더 두 배가 된다. <b>기간의 힘이 훨씬 크다.</b> → 맥락으로 이어 둠</div>'
      ])
    }
  };

  function findNote(type, id){
    var k = window.KnowledgeNotes;
    var arr = (k && k.data && k.data[type]) ? k.data[type] : null;
    if(!arr) return null;
    for(var i=0;i<arr.length;i++) if(arr[i].id === id) return arr[i];
    return null;
  }

  function ensureNote(spec){
    var k = window.KnowledgeNotes;
    if(!k || !k.data) return null;
    if(!k.data[spec.type]) k.data[spec.type] = [];
    var found = findNote(spec.type, spec.id);
    if(found) return spec.id;

    var now = (k._nowStr ? k._nowStr() : new Date().toISOString().slice(0,10));
    var rec = { id:spec.id, title:spec.title, content:spec.content, date:now, mtime:Date.now() };
    if(spec.cover) rec.cover = spec.cover;

    /* 그룹이 있는 탭이면 첫 그룹에 넣는다 */
    try{
      var g = (k.groups && k.groups[spec.type]) ? k.groups[spec.type] : [];
      if(g && g.length) rec.groupId = g[0].id;
    }catch(e){}
    if(spec.type === 'thesis'){ rec.tags = []; rec.sources = []; }

    k.data[spec.type].push(rec);
    return spec.id;
  }

  function seedExample(){
    try{
      if(localStorage.getItem(SEED_FLAG) === '1') return;
      var k = window.KnowledgeNotes;
      if(!k || !k.data) return;

      /* 이미 직접 이어 둔 게 있으면 건드리지 않는다 */
      if(R.all().length > 0){ localStorage.setItem(SEED_FLAG,'1'); return; }

      var bookId  = ensureNote(SAMPLE.book);
      var thinkId = ensureNote(SAMPLE.think);
      if(!bookId || !thinkId) return;

      var bookRef  = R.makeRef('note','books',  bookId);
      var thinkRef = R.makeRef('note','thesis', thinkId);
      R.add(bookRef, thinkRef, '예시 · 읽는다 → 생각한다');

      /* 3) 확인 — 기존 ECONOMICS 시드(72의 법칙)가 있으면 이어 붙인다 */
      var econ = (k.data.economics || [])[0];
      if(econ) R.add(thinkRef, R.makeRef('note','economics', econ.id), '예시 · 생각한다 → 확인한다');

      /* 4) 보유 — 보유 종목이 있으면 마지막 칸을 잇는다 */
      try{
        var H = (typeof HOLDINGS !== 'undefined') ? HOLDINGS : (window.HOLDINGS || []);
        if(H && H.length) R.add(thinkRef, 'asset:' + String(H[0].tk).toUpperCase(), '예시 · 생각한다 → 보유한다');
      }catch(e){}

      try{ k.save(); k.renderSidebar('books'); }catch(e){}
      localStorage.setItem(SEED_FLAG,'1');
    }catch(e){}
  }

  /* 예시 일괄 정리 */
  function clearExamples(){
    var k = window.KnowledgeNotes;
    var removed = 0;
    try{
      [SAMPLE.book, SAMPLE.think].forEach(function(sp){
        var ref = R.makeRef('note', sp.type, sp.id);
        removed += R.removeAllOf(ref);
        var arr = k && k.data ? k.data[sp.type] : null;
        if(arr) for(var i=arr.length-1;i>=0;i--) if(arr[i].id === sp.id) arr.splice(i,1);
      });
      /* 메모가 '예시'로 시작하는 나머지 갈래도 정리 */
      R.all().slice().forEach(function(x){ if(/^예시/.test(x.memo||'')){ R.remove(x.id); removed++; } });
      if(k && k.save) k.save();
      if(k && k.renderSidebar){ k.renderSidebar('books'); k.renderSidebar('thesis'); }
    }catch(e){}
    return removed;
  }
  window.__nnRelClearExamples = clearExamples;

  (function ready(){
    if(window.KnowledgeNotes && window.KnowledgeNotes.data){ setTimeout(seedExample, 1500); return; }
    setTimeout(ready, 300);
  })();


  /* ══════════════════════════════════════════════════════════
     맥락 안내 — 왜 필요한지 · 무엇을 얻는지 · 언제 이으면 되는지
     패널에 욱여넣지 않고 별도 창으로 제대로 설명한다.
     ══════════════════════════════════════════════════════════ */
  function openGuide(){
    var prev = document.getElementById('rlGuide'); if(prev) prev.remove();
    var ov = document.createElement('div');
    ov.id = 'rlGuide'; ov.className = 'hub-modal-ov';

    ov.innerHTML = '<div class="hub-modal rlg-modal">'
      + '<div class="rlg-head">'
      +   '<span class="rlg-eyebrow">THREAD</span>'
      +   '<h2 class="rlg-title">맥락</h2>'
      +   '<p class="rlg-lead">읽은 것이 어떤 생각이 되고, 그 생각이 어떤 판단으로 이어져,<br>'
      +     '결국 어떤 자산이 되었는지 — 그 갈래를 이어 두는 기능입니다.</p>'
      + '</div>'
      + '<div class="rlg-body">'

      /* ① 왜 필요한가 */
      + '<section class="rlg-sec">'
      +   '<div class="rlg-s-n">01</div>'
      +   '<h3 class="rlg-s-t">왜 필요한가</h3>'
      +   '<div class="rlg-ask">'
      +     '<p>2년 전에 산 종목이 있습니다. 지금 30% 빠졌습니다.<br>'
      +     '<b>더 사야 할까요, 팔아야 할까요?</b></p>'
      +     '<p class="rlg-ask-2">답하려면 두 가지를 알아야 합니다.<br>'
      +     '“그때 <b>무엇을 보고</b> 샀는가”, 그리고 “그 근거가 <b>지금도 유효한가</b>”.</p>'
      +   '</div>'
      +   '<p class="rlg-p">대부분은 기억하지 못합니다. 차트만 보고 다시 판단하게 되고, '
      +     '그러면 처음의 논리와 지금의 감정이 뒤섞입니다.<br>'
      +     '<b>맥락은 그 기억을 대신합니다.</b></p>'
      + '</section>'

      /* ② 어떻게 쌓이나 */
      + '<section class="rlg-sec">'
      +   '<div class="rlg-s-n">02</div>'
      +   '<h3 class="rlg-s-t">어떻게 쌓이나</h3>'
      +   '<p class="rlg-p">한 번에 만드는 게 아닙니다. 기록할 때마다 한 칸씩 이어 붙입니다.</p>'
      +   '<div class="rlg-flow">'
      +     step('#c9a96e','읽는다','BOOKS','돈의 심리학','“수익률보다 버틴 시간이 결과를 좌우한다”')
      +     arrow('여기서 든 생각을 적는다')
      +     step('#e0709c','생각한다','생각의 기록','시간이 가장 큰 변수다','연 7%와 9%의 차이보다 10년과 25년의 차이가 크다')
      +     arrow('숫자로 확인한다')
      +     step('#8fb98f','확인한다','ECONOMICS','72의 법칙','72 ÷ 7 = 10년,  72 ÷ 9 = 8년 — 생각보다 차이가 작다')
      +     arrow('그래서 이렇게 굴린다')
      +     step('#b28ad4','보유한다','HOLDINGS','장기 인덱스','높은 수익률보다 20년 버틸 구조를 택함')
      +   '</div>'
      + '</section>'

      /* ③ 무엇을 얻나 */
      + '<section class="rlg-sec">'
      +   '<div class="rlg-s-n">03</div>'
      +   '<h3 class="rlg-s-t">그래서 무엇을 얻나</h3>'
      +   '<div class="rlg-gains">'
      +     gain('거슬러 오르기',
      +          '보유 종목 하나를 열면, 그걸 사게 만든 책·생각·자료가 한눈에 보입니다. '
      +        + '“나는 왜 이걸 갖고 있는가”에 <b>기억이 아니라 기록으로</b> 답합니다.')
      +      gain('전제가 깨졌을 때',
      +            '“AI 투자가 계속 늘 것이다” 같은 전제가 흔들렸다고 합시다. '
      +          + '그 전제를 담은 기록을 열면, <b>그것에 기대고 있던 판단과 종목이 전부</b> 드러납니다. '
      +          + '무엇을 다시 봐야 하는지 즉시 알 수 있습니다.')
      +      gain('시간이 쌓이면',
      +            '3년치가 모이면 내 생각이 어떻게 변해 왔는지, '
      +          + '어떤 가정을 <b>반복해서 틀렸는지</b> 드러납니다. '
      +          + '이건 다른 어떤 서비스도 대신해 줄 수 없는, 나만의 기록입니다.')
      +   '</div>'
      + '</section>'

      /* ④ 언제 이으면 되나 */
      + '<section class="rlg-sec">'
      +   '<div class="rlg-s-n">04</div>'
      +   '<h3 class="rlg-s-t">언제 이으면 되나</h3>'
      +   '<div class="rlg-when">'
      +     when('책을 덮으며', '“이건 투자에 쓸 수 있겠다” 싶은 대목이 있었다면, 그 책과 떠오른 생각을 잇습니다.')
      +      when('종목을 사기로 했을 때', '결정의 근거가 된 기록과 그 종목을 잇습니다. 이 한 번이 나중에 가장 큰 값을 합니다.')
      +      when('뉴스가 생각을 흔들 때', '기존 판단을 강화하거나 약화시킨 자료를 그 판단에 잇습니다.')
      +      when('되짚어 볼 때', '분기에 한 번, 이어 둔 갈래를 따라가며 아직 유효한 논리인지 점검합니다.')
      +   '</div>'
      +   '<p class="rlg-note">완벽하게 이을 필요는 없습니다. '
      +     '<b>중요한 판단 하나에 근거 하나</b>만 이어 두어도, 1년 뒤에는 큰 차이가 납니다.</p>'
      + '</section>'
      + '</div>'
      + '<div class="hm-btns"><button type="button" class="hm-btn hm-save" id="rlgOk">알겠습니다</button></div>'
      + '</div>';

    document.body.appendChild(ov);
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); }, 200); }
    ov.querySelector('#rlgOk').onclick = function(){
      try{ localStorage.setItem('nn_rel_intro_v1','1'); }catch(e){}
      close();
      document.querySelectorAll('.rl-panel').forEach(function(w){
        var r = w.getAttribute('data-ref'); if(r) paint(w, r);
      });
    };
    ov.onclick = function(e){ if(e.target === ov) close(); };
    ov.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ e.preventDefault(); close(); } });
    requestAnimationFrame(function(){ ov.classList.add('show'); });
  }

  function step(color, verb, tab, title, quote){
    return '<div class="rlg-step">'
      + '<span class="rlg-st-dot" style="background:' + color + '"></span>'
      + '<div class="rlg-st-body">'
      +   '<div class="rlg-st-head"><span class="rlg-st-verb">' + verb + '</span>'
      +     '<span class="rlg-st-tab" style="color:' + color + '">' + tab + '</span></div>'
      +   '<div class="rlg-st-title">' + title + '</div>'
      +   '<div class="rlg-st-quote">' + quote + '</div>'
      + '</div></div>';
  }
  function arrow(label){
    return '<div class="rlg-arrow"><span class="rlg-ar-line"></span>'
         + '<span class="rlg-ar-lb">' + label + '</span></div>';
  }
  function gain(t, d){
    return '<div class="rlg-gain"><div class="rlg-g-t">' + t + '</div>'
         + '<div class="rlg-g-d">' + d + '</div></div>';
  }
  function when(t, d){
    return '<div class="rlg-w"><span class="rlg-w-t">' + t + '</span>'
         + '<span class="rlg-w-d">' + d + '</span></div>';
  }
  window.__nnRelGuide = openGuide;

  window.__nnRelPanel = buildPanel;
  window.__nnRelPicker = openPicker;
})();
