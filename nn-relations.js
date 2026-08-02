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
          + '<button type="button" class="rl-add">＋ 맥락 잇기</button>'
          + '</div>';

    if(!list.length){
      var seen = false;
      try{ seen = localStorage.getItem('nn_rel_intro_v1') === '1'; }catch(e){}
      if(!seen){
        /* 처음 보는 사람을 위한 설명 — 한 번 닫으면 다시 안 뜬다 */
        h += '<div class="rl-intro">'
          +   '<div class="rl-i-t">맥락이란?</div>'
          +   '<div class="rl-i-d">한 권의 책이 어떤 생각을 남겼고, 그 생각이 어떤 판단으로 이어져 '
          +     '결국 어떤 자산이 되었는지 — <b>그 갈래를 직접 이어 두는 기능</b>입니다.<br>'
          +     '시스템이 추측하지 않습니다. 이어 둔 것만 남습니다.</div>'
          +   '<div class="rl-i-flow">'
          +     '<div class="rl-i-node"><i style="background:#c9a96e"></i>'
          +       '<span class="rl-i-k">읽는다</span><span class="rl-i-v">돈의 심리학</span></div>'
          +     '<div class="rl-i-line"></div>'
          +     '<div class="rl-i-node"><i style="background:#e0709c"></i>'
          +       '<span class="rl-i-k">생각한다</span><span class="rl-i-v">시간이 가장 큰 변수다</span></div>'
          +     '<div class="rl-i-line"></div>'
          +     '<div class="rl-i-node"><i style="background:#8fb98f"></i>'
          +       '<span class="rl-i-k">확인한다</span><span class="rl-i-v">72의 법칙</span></div>'
          +     '<div class="rl-i-line"></div>'
          +     '<div class="rl-i-node"><i style="background:#b28ad4"></i>'
          +       '<span class="rl-i-k">보유한다</span><span class="rl-i-v">장기 인덱스</span></div>'
          +   '</div>'
          +   '<div class="rl-i-f">'
          +     '<span class="rl-i-q">3년 뒤 “나는 왜 이걸 샀지?”라고 물었을 때, '
          +     '이 갈래를 거슬러 올라가면 답이 나옵니다.</span>'
          +     '<button type="button" class="rl-i-x">알겠습니다</button>'
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
  var SEED_FLAG = 'nn_rel_seed_v2';

  function noteHTML(parts){ return parts.join('\n'); }

  var SAMPLE = {
    book: {
      type:'books', id:'rlx_book',
      title:'[예시] 돈의 심리학',
      content: noteHTML([
        '<div class="np-note" contenteditable="false">📘 <b>맥락 예시</b> — 이 기록은 기능을 보여드리는 표본입니다. 아래 <b>맥락</b> 칸을 보시면 다음 단계로 이어져 있습니다. 필요 없으면 목록에서 지우세요.</div>',
        '<div style="font-weight:700;margin-top:12px">기억에 남은 것</div>',
        '<ul>',
        '<li>부자가 되는 것과 부를 유지하는 것은 전혀 다른 기술이다.</li>',
        '<li>수익률보다 <b>버틴 시간</b>이 결과를 더 크게 좌우한다.</li>',
        '<li>합리적인 선택보다 <b>내가 계속할 수 있는 선택</b>이 낫다.</li>',
        '</ul>',
        '<div style="font-weight:700;margin-top:14px">그래서 나는</div>',
        '<div>수익률을 높이려 애쓰기보다, 오래 버틸 수 있는 구조를 먼저 만들기로 했다.</div>'
      ])
    },
    think: {
      type:'thesis', id:'rlx_think',
      title:'[예시] 시간이 가장 큰 변수다',
      content: noteHTML([
        '<div class="np-note" contenteditable="false">💭 <b>맥락 예시</b> — 앞의 책에서 출발해 정리한 생각입니다.</div>',
        '<div>연 7%와 연 9%의 차이보다, 10년과 25년의 차이가 훨씬 크다.</div>',
        '<div style="font-weight:700;margin-top:14px">근거</div>',
        '<ul>',
        '<li>복리는 후반부에 가속된다. 초반 몇 년의 수익률 차이는 시간 앞에서 희석된다.</li>',
        '<li>높은 수익률을 좇다 중간에 그만두면, 남는 건 세금과 수수료뿐이다.</li>',
        '</ul>',
        '<div style="font-weight:700;margin-top:14px">스스로에게 묻는 것</div>',
        '<ul>',
        '<li>이 방식을 <b>20년 동안</b> 계속할 수 있는가?</li>',
        '<li>시장이 40% 빠져도 팔지 않을 자신이 있는가?</li>',
        '</ul>'
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
      R.add(bookRef, thinkRef, '예시 — 여기서 출발한 생각');

      /* 3) 확인 — 기존 ECONOMICS 시드(72의 법칙)가 있으면 이어 붙인다 */
      var econ = (k.data.economics || [])[0];
      if(econ) R.add(thinkRef, R.makeRef('note','economics', econ.id), '예시 — 숫자로 확인');

      /* 4) 보유 — 보유 종목이 있으면 마지막 칸을 잇는다 */
      try{
        var H = (typeof HOLDINGS !== 'undefined') ? HOLDINGS : (window.HOLDINGS || []);
        if(H && H.length) R.add(thinkRef, 'asset:' + String(H[0].tk).toUpperCase(), '예시 — 이 판단이 닿은 곳');
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

  window.__nnRelPanel = buildPanel;
  window.__nnRelPicker = openPicker;
})();
