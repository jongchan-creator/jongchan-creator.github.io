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

  /* ── 연결 가능한 대상 목록 (선택 UI용) ──────────────── */
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
   연결 UI — 편집 화면의 "연결" 패널 + 대상 고르기 창
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var R = window.__nnRel;
  if(!R) return;

  function esc(x){ return String(x==null?'':x)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ── 편집 화면에 붙는 연결 패널 ── */
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
          + '<span class="rl-title">연결</span>'
          + (list.length ? '<span class="rl-n">' + list.length + '</span>' : '')
          + '<button type="button" class="rl-add">＋ 연결 추가</button>'
          + '</div>';

    if(!list.length){
      h += '<div class="rl-empty">이 기록과 이어지는 책·생각·종목을 연결해 두면, '
         + '나중에 <b>“나는 왜 이렇게 판단했는가”</b>를 되짚을 수 있습니다.</div>';
    } else {
      h += '<div class="rl-list">' + list.map(function(x){
        return '<div class="rl-item" data-id="' + x.id + '" data-ref="' + esc(x.ref) + '">'
             + '<span class="rl-dot" style="background:' + esc(x.target.color) + '"></span>'
             + '<span class="rl-lb" style="color:' + esc(x.target.color) + '">' + esc(x.target.label) + '</span>'
             + '<span class="rl-t">' + esc(x.target.title) + '</span>'
             + (x.memo ? '<span class="rl-memo">' + esc(x.memo) + '</span>' : '')
             + '<button type="button" class="rl-x" title="연결 끊기">✕</button>'
             + '</div>';
      }).join('') + '</div>';
    }
    wrap.innerHTML = h;

    var addBtn = wrap.querySelector('.rl-add');
    if(addBtn) addBtn.onclick = function(){ openPicker(ref, function(){ paint(wrap, ref); }); };

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
        if(gone && window.__nnToast) window.__nnToast('연결을 끊었습니다', {kind:'del', undo:function(){
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
      + '<div class="hm-title">무엇과 연결할까요?</div>'
      + '<div class="rl-hint">이 기록과 이어지는 대상을 고르세요. 연결은 직접 지정한 것만 저장됩니다.</div>'
      + '<input class="hm-in rl-search" id="rlSearch" placeholder="제목 · 종목으로 찾기" autocomplete="off">'
      + '<div class="rl-cands" id="rlCands"></div>'
      + '<label class="hm-lb" style="margin-top:12px">메모 <span class="hm-hint">(선택 · 왜 연결했는지)</span></label>'
      + '<input class="hm-in" id="rlMemo" placeholder="예: 이 책의 복리 개념에서 출발" maxlength="60" autocomplete="off">'
      + '<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      + '<button type="button" class="hm-btn hm-save" id="rlOk" disabled>연결</button></div></div>';
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
        box.innerHTML = '<div class="rl-none">' + (q ? '찾는 대상이 없습니다.' : '연결할 수 있는 기록이 아직 없습니다.') + '</div>';
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
             + (already ? '<span class="rl-c-done">연결됨</span>' : '')
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
        if(window.__nnToast) window.__nnToast('이미 연결되어 있습니다', {kind:'del'});
        return;
      }
      if(!res){
        if(window.__nnToast) window.__nnToast('저장하지 못했습니다 · 저장 공간을 확인해 주세요', {kind:'del'});
        return;
      }
      close();
      if(after) after();
      if(window.__nnToast) window.__nnToast('✓ 연결했습니다');
    };
    requestAnimationFrame(function(){ ov.classList.add('show'); setTimeout(function(){ try{ search.focus(); }catch(e){} }, 120); });
  }

  window.__nnRelPanel = buildPanel;
  window.__nnRelPicker = openPicker;
})();
