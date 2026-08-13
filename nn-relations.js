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
    economics:'ECONOMICS', thesis:'THESIS'
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

    if(r.kind === 'holding'){
      var tk2 = String(r.id || '').toUpperCase();
      var nm2 = '';
      try{
        var H2 = (typeof HOLDINGS !== 'undefined') ? HOLDINGS : (window.HOLDINGS || []);
        for(var q=0;q<H2.length;q++) if(String(H2[q].tk).toUpperCase() === tk2){ nm2 = H2[q].nm || ''; break; }
      }catch(e){}
      return {
        ref:ref, kind:'holding', id:tk2, exists:true,
        title: nm2 ? (tk2 + ' · ' + nm2) : tk2,
        label:'HOLDINGS', color:'#b28ad4',
        open: function(){ if(typeof switchPage === 'function') switchPage('portfolio'); }
      };
    }

    if(r.kind === 'wealth'){
      var wn = '', wc = '';
      try{
        var A2 = JSON.parse(localStorage.getItem('nn_assets_v1') || '{}');
        ['assets','stocks','realty','debts'].forEach(function(g){
          (A2[g] || []).forEach(function(it){
            if(String(it.id) === r.id){ wn = it.name || it.nm || it.ticker || ''; wc = g; }
          });
        });
      }catch(e){}
      var GL = { assets:'자산', stocks:'주식', realty:'부동산', debts:'부채' };
      return {
        ref:ref, kind:'wealth', id:r.id, exists: !!wn,
        title: wn || '삭제된 항목',
        label:'ASSETS' + (wc ? ' · ' + (GL[wc]||wc) : ''), color:'#e05555',
        open: function(){ if(typeof switchPage === 'function') switchPage('assets'); }
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
        out.push({ ref:ref, title:info.title, label:'HOLDINGS', color:'#b28ad4',
                   search:(info.title + ' 보유 종목 holdings').toLowerCase() });
      });
    }catch(e){}

    /* ASSETS 탭의 자산 항목 */
    try{
      var AS = JSON.parse(localStorage.getItem('nn_assets_v1') || '{}');
      var GL2 = { assets:'자산', stocks:'주식', realty:'부동산', debts:'부채' };
      ['stocks','realty','assets','debts'].forEach(function(g){
        (AS[g] || []).forEach(function(it){
          if(!it || !it.id) return;
          var nm = it.name || it.nm || it.ticker || '';
          if(!nm) return;
          var ref2 = 'wealth:' + it.id;
          if(ref2 === excludeRef) return;
          out.push({ ref:ref2, title:nm, label:'ASSETS · ' + (GL2[g]||g), color:'#e05555',
                     search:(nm + ' 자산 ' + (GL2[g]||g)).toLowerCase() });
        });
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

  /* ── 갈래 이름·설명 ────────────────────────────────────
     갈래 전체에 하나의 제목을 붙인다. 어느 칸에서 열어도 같은 값이
     보이도록 '뿌리 ref' 를 열쇠로 삼는다. ── */
  var META_KEY = 'nn_thread_meta_v1';
  function loadMeta(){
    try{ var o = JSON.parse(localStorage.getItem(META_KEY)); return (o && typeof o === 'object') ? o : {}; }
    catch(e){ return {}; }
  }
  function saveMeta(o){
    try{ localStorage.setItem(META_KEY, JSON.stringify(o)); return true; }catch(e){ return false; }
  }
  /* 이 갈래의 뿌리를 찾는다 (들어오는 것이 없을 때까지 거슬러 오름) */
  function rootOf(ref, seen){
    seen = seen || {};
    if(seen[ref]) return ref;
    seen[ref] = 1;
    var all = load();
    var ins = all.filter(function(x){ return x.to === ref; }).map(function(x){ return x.from; });
    if(!ins.length) return ref;
    return rootOf(ins[0], seen);
  }
  function metaOf(ref){
    var r = rootOf(ref);
    var m = loadMeta()[r] || {};
    return { root:r, title:m.title || '', desc:m.desc || '' };
  }
  function setMeta(ref, title, desc){
    var r = rootOf(ref);
    var o = loadMeta();
    o[r] = { title:String(title||'').slice(0,60), desc:String(desc||'').slice(0,200) };
    if(!o[r].title && !o[r].desc) delete o[r];
    return saveMeta(o);
  }

  /* ── 이 기록이 갈래의 어디쯤인지 계산 ───────────────────
     방향을 저장해 두었으므로 앞/뒤를 나눌 수 있다.
       before : 이 기록으로 흘러 들어온 것 (X → 나)
       after  : 이 기록에서 뻗어 나간 것   (나 → Y)
       depth  : 뿌리에서 몇 번째인지
       total  : 이 갈래 전체 길이
     ───────────────────────────────────────────────────── */
  function chainOf(ref){
    var all = load();
    function inbound(r){
      return all.filter(function(x){ return x.to === r; }).map(function(x){ return x.from; });
    }
    function outbound(r){
      return all.filter(function(x){ return x.from === r; }).map(function(x){ return x.to; });
    }
    /* 뿌리까지 거슬러 올라간 깊이 */
    function depthOf(r, seen){
      seen = seen || {};
      if(seen[r]) return 0;           /* 순환 방지 */
      seen[r] = 1;
      var ins = inbound(r);
      if(!ins.length) return 0;
      var best = 0;
      ins.forEach(function(p){
        var d = depthOf(p, seen) + 1;
        if(d > best) best = d;
      });
      return best;
    }
    /* 끝까지 내려간 길이 */
    function heightOf(r, seen){
      seen = seen || {};
      if(seen[r]) return 0;
      seen[r] = 1;
      var outs = outbound(r);
      if(!outs.length) return 0;
      var best = 0;
      outs.forEach(function(c){
        var d = heightOf(c, seen) + 1;
        if(d > best) best = d;
      });
      return best;
    }
    var before = inbound(ref).map(resolve).filter(function(i){ return i.exists; });
    var after  = outbound(ref).map(resolve).filter(function(i){ return i.exists; });
    var d = depthOf(ref), hgt = heightOf(ref);
    return { before:before, after:after, depth:d, total:d + hgt + 1, pos:d + 1 };
  }

  /* ── 이 갈래를 뿌리부터 끝까지 한 줄로 펼친다 ── */
  function lineOf(ref){
    var all = load();
    function outs(r){ return all.filter(function(x){ return x.from === r; }).map(function(x){ return x.to; }); }
    var root = rootOf(ref);
    var seq = [], seen = {};
    var cur = root;
    while(cur && !seen[cur]){
      seen[cur] = 1;
      var info = resolve(cur);
      if(info.exists || info.kind === 'asset') seq.push(info);
      var nx = outs(cur);
      if(!nx.length) break;
      /* 여러 갈래로 나뉘면 지금 보고 있는 쪽을 우선 따라간다 */
      cur = nx.indexOf(ref) >= 0 ? ref : nx[0];
      if(seq.length > 12) break;
    }
    /* 현재 기록이 빠졌다면 (곁가지) 끝에 붙인다 */
    if(!seq.some(function(x){ return x.ref === ref; })) seq.push(resolve(ref));
    return seq;
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
    candidates:candidates, stats:stats, chainOf:chainOf, lineOf:lineOf, metaOf:metaOf, setMeta:setMeta, rootOf:rootOf,
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
          + (list.some(function(x){ return /^(예시|①|②|③)/.test(x.memo||''); })
              ? '<span class="rl-ex-badge">예시</span>' : '')
          + '<button type="button" class="rl-help" title="맥락이란?">?</button>'
          + '<button type="button" class="rl-add">＋ 맥락 잇기</button>'
          + '</div>';

    /* ── 갈래 지도 ──
       구조를 새로 짰다. 상단은 '지금 어디에 있는가'를 한 줄로,
       본문은 세로 타임라인으로 각 칸을 펼친다.
       카드 나열보다 흐름과 위계가 분명하게 읽힌다. */
    if(list.length){
      var ch = R.chainOf(ref);
      var me = R.resolve(ref);
      var meta = R.metaOf(ref);
      var full = R.lineOf(ref);
      var isEx = list.some(function(x){ return /^(예시|①|②|③)/.test(x.memo||''); });

      /* 칸 안에서 내용을 살짝 보여 준다 — 굳이 이동하지 않아도 되게 */
      function preview(rf){
        try{
          var pr = R.parseRef(rf);
          if(pr.kind !== 'note') return '';
          var kk = window.KnowledgeNotes;
          var arr = (kk && kk.data && kk.data[pr.type]) ? kk.data[pr.type] : null;
          if(!arr) return '';
          for(var z=0; z<arr.length; z++){
            if(arr[z].id !== pr.id) continue;
            var tmp = document.createElement('div');
            tmp.innerHTML = arr[z].content || '';
            var txt = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
            return txt.slice(0, 160);
          }
        }catch(e){}
        return '';
      }

      function relIdOf(otherRef){
        var f = list.filter(function(x){ return x.ref === otherRef; })[0];
        return f ? f.id : '';
      }

      h += '<div class="rl-board">';

      /* 머리 — 갈래 이름과 현재 위치 */
      h += '<div class="rl-bd-head">'
        +   '<div class="rl-bd-name">'
        +     (meta.title
                ? '<span class="rl-bd-t">' + esc(meta.title) + '</span>'
                : '<span class="rl-bd-t rl-bd-un">이름 없는 갈래</span>')
        +     (isEx ? '<span class="rl-bd-ex">예시</span>' : '')
        +   '</div>'
        +   '<div class="rl-bd-right">'
        +     '<span class="rl-bd-pos"><b>' + ch.pos + '</b><i>/</i>' + ch.total + '</span>'
        +     '<button type="button" class="rl-mt-edit">' + (meta.title ? '이름 고치기' : '이름 붙이기') + '</button>'
        +   '</div>'
        + '</div>'
        + (meta.desc ? '<div class="rl-bd-desc">' + esc(meta.desc) + '</div>' : '');

      /* 진행 눈금 */
      h += '<div class="rl-gauge">' + full.map(function(n, i){
            var st2 = (n.ref === ref) ? 'on' : (i < ch.pos - 1 ? 'done' : '');
            return '<span class="rl-gg ' + st2 + '"></span>';
          }).join('') + '</div>';

      /* 세로 타임라인 */
      h += '<div class="rl-line">' + full.map(function(n, i){
            var on = (n.ref === ref);
            var passed = i < ch.pos - 1;
            var rid = relIdOf(n.ref);
            var pv = preview(n.ref);
            return '<div class="rl-step ' + (on ? 'on' : (passed ? 'done' : 'next')) + '" data-ref="' + esc(n.ref) + '">'
              + '<div class="rl-st-rail"><span class="rl-st-dot"></span></div>'
              + '<div class="rl-st-body">'
              +   '<div class="rl-st-top">'
              +     '<span class="rl-st-no">' + (i + 1) + '</span>'
              +     '<span class="rl-st-tag" style="color:' + esc(n.color) + '">' + esc(n.label) + '</span>'
              +     (on ? '<span class="rl-st-now">지금 보는 기록</span>' : '')
              +     '<span class="rl-st-tools">'
              +       (pv ? '<button type="button" class="rl-st-peek" title="내용 살짝 보기">▾</button>' : '')
              +       '<button type="button" class="rl-st-go" data-go="' + esc(n.ref) + '" title="이 기록으로 이동">↗</button>'
              +       (rid ? '<button type="button" class="rl-nd-x" data-id="' + rid + '" title="맥락 끊기">✕</button>' : '')
              +     '</span>'
              +   '</div>'
              +   '<div class="rl-st-title">' + esc(n.title) + '</div>'
              +   (pv ? '<div class="rl-st-pv">' + esc(pv) + '</div>' : '')
              + '</div>'
              + '</div>';
          }).join('') + '</div>';

      if(isEx){
        h += '<div class="rl-bd-note">기능을 보여드리는 <b>표본</b>입니다. 각 칸을 눌러 오가며 흐름을 확인해 보세요.</div>';
      }
      h += '</div>';
    }

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
      /* 목록은 없앴다 — 위쪽 흐름 카드가 같은 내용을 더 잘 보여준다.
         예시가 섞여 있을 때만 정리 버튼을 남긴다. */
      if(list.some(function(x){ return /^(예시|①|②|③)/.test(x.memo||''); })){
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

    var mtE = wrap.querySelector('.rl-mt-edit');
    if(mtE) mtE.onclick = function(){ openMetaEditor(ref, function(){ paint(wrap, ref); }); };

    /* 살짝 보기 — 맥락 안에서 펼친다 */
    wrap.querySelectorAll('.rl-st-peek').forEach(function(b){
      b.onclick = function(e){
        e.stopPropagation();
        var st = b.closest('.rl-step');
        if(!st) return;
        var open = st.classList.toggle('peek');
        b.textContent = open ? '▴' : '▾';
        b.setAttribute('title', open ? '접기' : '내용 살짝 보기');
      };
    });
    /* 이동은 전용 버튼으로만 */
    wrap.querySelectorAll('.rl-st-go').forEach(function(b){
      b.onclick = function(e){
        e.stopPropagation();
        var info = R.resolve(b.getAttribute('data-go'));
        if(info && info.open) info.open();
      };
    });
    wrap.querySelectorAll('.rl-mp[data-ref], .rl-nd[data-ref]').forEach(function(b){
      b.onclick = function(){
        var info = R.resolve(b.getAttribute('data-ref'));
        if(info && info.open) info.open();
      };
    });

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
    wrap.querySelectorAll('.rl-nd-x').forEach(function(b){
      b.onclick = function(e){
        e.stopPropagation();
        var gone = R.remove(b.getAttribute('data-id'));
        paint(wrap, ref);
        if(gone && window.__nnToast) window.__nnToast('맥락을 끊었습니다', {kind:'del', undo:function(){
          R.add(gone.from, gone.to, gone.memo); paint(wrap, ref);
        }});
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

  /* ── 갈래 이름·설명 편집 ── */
  function openMetaEditor(ref, after){
    var m = R.metaOf(ref);
    var ch = R.chainOf(ref);
    var prev = document.getElementById('rlMt'); if(prev) prev.remove();
    var ov = document.createElement('div');
    ov.id = 'rlMt'; ov.className = 'hub-modal-ov';
    ov.innerHTML = '<div class="hub-modal rl-mt-modal">'
      + '<div class="hm-title">이 갈래에 이름 붙이기</div>'
      + '<div class="rl-hint">' + ch.total + '칸으로 이어진 이 갈래 전체를 하나로 부르는 이름입니다. '
      +   '어느 칸에서 열어도 같은 이름이 보입니다.</div>'
      + '<label class="hm-lb">이름</label>'
      + '<input class="hm-in" id="rlMtT" maxlength="60" placeholder="예: 복리와 시간 — 장기 인덱스로 가기까지" value="' + esc(m.title) + '">'
      + '<label class="hm-lb" style="margin-top:12px">짧은 설명 <span class="hm-hint">(선택)</span></label>'
      + '<textarea class="hm-in rl-mt-ta" id="rlMtD" rows="3" maxlength="200" '
      +   'placeholder="이 갈래가 무엇에서 시작해 어디로 갔는지 한두 줄로">' + esc(m.desc) + '</textarea>'
      + '<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button>'
      + '<button type="button" class="hm-btn hm-save" id="rlMtOk">저장</button></div></div>';
    document.body.appendChild(ov);
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); }, 200); }
    ov.querySelector('.hm-cancel').onclick = close;
    ov.onclick = function(e){ if(e.target === ov) close(); };
    ov.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ e.preventDefault(); close(); } });
    ov.querySelector('#rlMtOk').onclick = function(){
      var t = (ov.querySelector('#rlMtT').value || '').trim();
      var d = (ov.querySelector('#rlMtD').value || '').trim();
      if(!R.setMeta(ref, t, d)){
        if(window.__nnToast) window.__nnToast('저장하지 못했습니다 · 저장 공간을 확인해 주세요', {kind:'del'});
        return;
      }
      close();
      if(after) after();
      if(window.__nnToast) window.__nnToast(t ? '\u2713 "' + t + '" 로 이름 붙였습니다' : '\u2713 저장했습니다');
    };
    requestAnimationFrame(function(){ ov.classList.add('show');
      setTimeout(function(){ try{ ov.querySelector('#rlMtT').focus(); }catch(e){} }, 120); });
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
  var SEED_FLAG = 'nn_rel_seed_v5';

  function noteHTML(parts){ return parts.join('\n'); }

  /* 4단계 표본 — 책에서 읽은 아이디어가 지표 확인과 판단을 거쳐 실제 보유까지 가는 흐름 */
  var STAGES = [
    { key:'read',    n:1, verb:'읽는다',   color:'#c9a96e' },
    { key:'check',   n:2, verb:'확인한다', color:'#8fb98f' },
    { key:'judge',   n:3, verb:'판단한다', color:'#e0709c' },
    { key:'hold',    n:4, verb:'보유한다', color:'#b28ad4' }
  ];

  function stageBar(cur){
    return '<div class="rl-stage" contenteditable="false">'
      + '<span class="rl-sg-lb">맥락 단계</span>'
      + STAGES.map(function(s){
          var on = (s.key === cur);
          return '<span class="rl-sg' + (on ? ' on' : '') + '"'
            + (on ? ' style="border-color:' + s.color + ';color:' + s.color + '"' : '')
            + '><i>' + s.n + '</i>' + s.verb + '</span>';
        }).join('<span class="rl-sg-ar">›</span>')
      + '<span class="rl-sg-hint">아래 <b>맥락</b>에서 앞뒤 단계로 이동할 수 있습니다</span>'
      + '</div>';
  }

  var SAMPLE = {
    book: {
      type:'books', id:'rlx_book', stage:'read',
      groupHint:'done',
      title:'[예시] 돈의 심리학',
      cover:'https://search.pstatic.net/common/?src=https%3A%2F%2Fshopping-phinf.pstatic.net%2Fmain_5840134%2F58401345275.20260331120920.jpg&type=w276',
      extra:{ rating:5, author:'모건 하우절' },
      content: noteHTML([
        '<div style="font-weight:700;margin-top:14px">밑줄 친 문장</div>',
        '<blockquote>“부자가 되는 것과 부를 지키는 것은 완전히 다른 기술이다. 전자는 위험을 감수해야 하고, 후자는 겸손을 요구한다.”</blockquote>',
        '<div style="font-weight:700;margin-top:14px">건져 올린 아이디어</div>',
        '<div class="np-note" contenteditable="false">💡 <b>수익률보다 “버틴 기간”이 최종 결과를 더 크게 좌우한다.</b><br>버핏 자산의 대부분은 65세 이후에 만들어졌다. 실력이 아니라 시간이 만든 몫이 크다.</div>',
        '<div style="font-weight:700;margin-top:14px">그래서 확인해 볼 것</div>',
        '<ul>',
        '<li>정말 그런가? <b>숫자로</b> 확인해 보자 → 72의 법칙</li>',
        '<li>수익률 2%p를 더 얻는 것과, 기간을 10년 늘리는 것 중 무엇이 큰가?</li>',
        '</ul>',
        '<div class="np-note" contenteditable="false">➡️ 다음 단계: <b>ECONOMICS · 72의 법칙</b>에서 숫자로 확인합니다. (아래 맥락에서 이동)</div>'
      ])
    },

    check: {
      type:'economics', id:'rlx_check', stage:'check',
      title:'[예시] 72의 법칙으로 확인한 것',
      content: noteHTML([
        '<div style="font-weight:700;margin-top:6px">검증할 명제</div>',
        '<div>“수익률을 높이는 것보다 기간을 늘리는 것이 결과에 더 크다.”</div>',
        '<div style="font-weight:700;margin-top:14px">계산</div>',
        '<div>72의 법칙 — <b>72 ÷ 연이율(%) ≈ 원금이 두 배가 되는 햇수</b></div>',
        '<ul>',
        '<li>연 7% → 72 ÷ 7 ≈ <b>10.3년</b></li>',
        '<li>연 9% → 72 ÷ 9 = <b>8.0년</b></li>',
        '<li>수익률을 2%p 올려서 얻는 것: 약 <b>2.3년 단축</b></li>',
        '</ul>',
        '<div style="font-weight:700;margin-top:14px">그런데 기간을 늘리면</div>',
        '<ul>',
        '<li>연 7%로 <b>10년</b> → 2배</li>',
        '<li>연 7%로 <b>20년</b> → 4배</li>',
        '<li>연 7%로 <b>30년</b> → 8배</li>',
        '</ul>',
        '<div class="np-note" contenteditable="false">✅ <b>확인됨.</b> 2%p 차이는 2년 남짓을 벌지만, 기간 10년은 자산을 한 번 더 두 배로 만든다. <b>기간의 힘이 압도적으로 크다.</b></div>',
        '<div class="np-note" contenteditable="false">➡️ 다음 단계: 그렇다면 <b>어떻게 굴려야 20년을 버틸 수 있는가</b> — 생각의 기록에서 판단합니다.</div>'
      ])
    },

    judge: {
      type:'thesis', id:'rlx_judge', stage:'judge',
      title:'[예시] 20년을 버틸 수 있는 방식만 고른다',
      content: noteHTML([
        '<div style="font-weight:700;margin-top:6px">내가 내린 판단</div>',
        '<div>수익률을 좇기보다 <b>20년 동안 손대지 않을 수 있는 구조</b>를 만든다.<br>핵심 자산은 광범위 인덱스로 두고, 개별 종목은 “없어도 잠이 오는” 비중까지만 가져간다.</div>',
        '<div style="font-weight:700;margin-top:16px">여기까지 온 과정</div>',
        '<ol>',
        '<li><b>읽었다</b> — 돈의 심리학: “버틴 기간이 결과를 좌우한다”</li>',
        '<li><b>확인했다</b> — 72의 법칙: 수익률 2%p는 2.3년을 벌지만, 기간 10년은 자산을 한 번 더 두 배로 만든다</li>',
        '<li><b>판단한다</b> — 그렇다면 목표는 “높은 수익률”이 아니라 <b>“중간에 그만두지 않는 것”</b>이다</li>',
        '</ol>',
        '<div style="font-weight:700;margin-top:16px">종목 선정 기준</div>',
        '<table class="nn-table"><tbody>',
        '<tr><td><b>기준</b></td><td><b>왜</b></td></tr>',
        '<tr><td>개별 기업 위험이 없을 것</td><td>한 회사가 무너져도 원칙이 흔들리지 않아야 한다</td></tr>',
        '<tr><td>보수가 낮을 것</td><td>20년이면 연 0.5%p 차이가 원금의 10%를 넘는다</td></tr>',
        '<tr><td>20년 뒤에도 존재할 것</td><td>중간에 상장폐지되면 그 순간 계획이 끝난다</td></tr>',
        '<tr><td>매일 확인하지 않아도 될 것</td><td>확인하는 만큼 팔고 싶어진다</td></tr>',
        '</tbody></table>',
        '<div style="font-weight:700;margin-top:16px">그래서 제외한 것</div>',
        '<ul>',
        '<li><b>테마 ETF</b> — 3년 뒤 남아 있을지 모른다. 기준 3번에 걸림</li>',
        '<li><b>개별 성장주</b> — 내가 매일 주가를 보게 된다. 기준 4번에 걸림</li>',
        '<li><b>고배당주 집중</b> — 배당을 좇다 산업이 한쪽으로 쏠린다. 기준 1번에 걸림</li>',
        '</ul>',
        '<div style="font-weight:700;margin-top:16px">결정</div>',
        '<div class="np-note" contenteditable="false">📌 광범위 인덱스를 핵심으로, <b>매달 같은 금액을 자동 매수</b>한다.<br>시장을 보지 않아도 굴러가게 만드는 것이 이 판단의 핵심이다.</div>',
        '<div style="font-weight:700;margin-top:16px">이 판단이 깨지는 조건</div>',
        '<div class="np-note" contenteditable="false">⚠️ 아래 중 하나라도 사실이 되면 <b>이 판단과 아래로 이어진 보유 종목을 함께 다시 봐야 합니다.</b><br>① 20년 이상 실질 수익이 없는 장기 횡보장에 들어섰다는 근거가 쌓임<br>② 인덱스 보수가 의미 있게 올라 비용 우위가 사라짐<br>③ 내가 하락장에서 실제로 팔았음 — “버틸 수 있다”는 전제가 틀렸음</div>',
        '<div style="font-weight:700;margin-top:16px">다음 점검</div>',
        '<div>분기에 한 번, 위 세 조건을 하나씩 확인한다. 아무것도 해당하지 않으면 <b>아무것도 하지 않는다.</b></div>'
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
    if(found){
      /* 이미 있는 예시는 최신 내용으로 갱신한다 (표지·본문·단계 표시가 바뀌었을 수 있다) */
      found.title = spec.title;
      found.content = spec.content;
      if(spec.cover) found.cover = spec.cover;
      found.mtime = Date.now();
      return spec.id;
    }

    var now = (k._nowStr ? k._nowStr() : new Date().toISOString().slice(0,10));
    var rec = { id:spec.id, title:spec.title, content:spec.content, date:now, mtime:Date.now() };
    if(spec.cover) rec.cover = spec.cover;
    if(spec.extra) Object.keys(spec.extra).forEach(function(kk){ rec[kk] = spec.extra[kk]; });

    /* 그룹 배정 —
       예시 책은 반드시 '완독'에 넣는다. 읽지 않은 책에서 생각이 나올 수는 없다.
       (첫 그룹에 넣으면 '사고 싶은 책'에 들어가 앞뒤가 맞지 않았다) */
    try{
      var g = (k.groups && k.groups[spec.type]) ? k.groups[spec.type] : [];
      if(spec.groupHint && g && g.length){
        for(var gi=0; gi<g.length; gi++){
          var nm = String(g[gi].name || '') + ' ' + String(g[gi].id || '');
          if(nm.indexOf(spec.groupHint) >= 0){ rec.groupId = g[gi].id; break; }
        }
      }
      if(!rec.groupId && g && g.length) rec.groupId = g[g.length-1].id;
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
      /* 구버전 예시가 남아 있으면 먼저 걷어낸다 (v1~v4 → v5 교체) */
      var hadOld = false;
      try{
        ['nn_rel_seed_v1','nn_rel_seed_v2','nn_rel_seed_v3','nn_rel_seed_v4'].forEach(function(old){
          if(localStorage.getItem(old) === '1') hadOld = true;
        });
      }catch(e){}
      if(hadOld){
        try{ clearExamples(); }catch(e){}
        try{
          ['nn_rel_seed_v1','nn_rel_seed_v2','nn_rel_seed_v3','nn_rel_seed_v4'].forEach(function(old){
            localStorage.setItem(old, '0');
          });
        }catch(e){}
      }

      /* 사용자가 직접 이어 둔 갈래가 있으면 예시를 만들지 않는다 */
      var mine = R.all().filter(function(x){ return !/^(예시|①|②|③)/.test(x.memo || ''); });
      if(mine.length > 0){ localStorage.setItem(SEED_FLAG,'1'); return; }
      /* 남아 있는 예시 갈래는 정리 */
      R.all().slice().forEach(function(x){ if(/^(예시|①|②|③)/.test(x.memo||'')) R.remove(x.id); });

      var bookId  = ensureNote(SAMPLE.book);
      var checkId = ensureNote(SAMPLE.check);
      var judgeId = ensureNote(SAMPLE.judge);
      if(!bookId || !checkId || !judgeId) return;

      var bookRef  = R.makeRef('note','books',     bookId);
      var checkRef = R.makeRef('note','economics', checkId);
      var judgeRef = R.makeRef('note','thesis',    judgeId);

      /* 1 → 2 → 3 → 4 순서대로 잇는다 */
      R.add(bookRef,  checkRef, '① 읽는다 → ② 확인한다');
      R.add(checkRef, judgeRef, '② 확인한다 → ③ 판단한다');

      /* ④ 실제 보유 — 보유 종목이 있으면 판단에 이어 붙인다 */
      /* 갈래의 결론(장기 분산 보유)에 어울리는 종목을 고른다.
         첫 항목을 그냥 쓰면 개별 성장주가 걸려 앞의 판단과 어긋난다. */
      var held = null;
      try{
        var H = (typeof HOLDINGS !== 'undefined') ? HOLDINGS : (window.HOLDINGS || []);
        if(H && H.length){
          var PREF = ['INFQ','DRAM','VOO','SPY','QQQ','VTI'];   /* ETF·분산 성격 우선 */
          for(var pi=0; pi<PREF.length && !held; pi++){
            for(var hi=0; hi<H.length; hi++){
              if(String(H[hi].tk).toUpperCase() === PREF[pi]){
                held = 'asset:' + PREF[pi]; break;
              }
            }
          }
          /* ETF 이름이 들어간 종목이 있으면 그것도 후보 */
          if(!held) for(var hj=0; hj<H.length; hj++){
            if(/ETF|인덱스|지수/i.test(String(H[hj].nm||''))){
              held = 'asset:' + String(H[hj].tk).toUpperCase(); break;
            }
          }
          if(!held) held = 'asset:' + String(H[0].tk).toUpperCase();
        }
      }catch(e){}
      if(held) R.add(judgeRef, held, '③ 판단한다 → ④ 보유한다');

      /* 예시 갈래에도 이름과 의의를 붙여 둔다 — 이 기능이 무엇을 위한 것인지
         설명만으로는 와닿지 않는다. 실제로 채워진 모습을 보여야 한다. */
      try{
        R.setMeta(bookRef,
          '복리와 시간 — 장기 인덱스에 이르기까지',
          '한 문장에서 출발해 숫자로 검증하고, 원칙과 종목 선정 기준을 세워 실제 보유까지 간 기록입니다. ' +
          '나중에 이 판단이 흔들릴 때 어디서부터 다시 봐야 하는지 이 갈래를 거슬러 오르면 알 수 있습니다.');
      }catch(e){}

      try{
        k.save();
        k.renderSidebar('books');
        k.renderSidebar('economics');
      }catch(e){}
      localStorage.setItem(SEED_FLAG,'1');
    }catch(e){}
  }

  /* 예시 일괄 정리 */
  function clearExamples(){
    var k = window.KnowledgeNotes;
    var removed = 0;
    try{
      /* 구버전 예시 노트 id 도 함께 정리 */
      var OLD_IDS = [{type:'books',id:'rlx_book'},{type:'thesis',id:'rlx_think'},
                     {type:'economics',id:'rlx_check'},{type:'thesis',id:'rlx_judge'}];
      OLD_IDS.forEach(function(sp){
        var ref = R.makeRef('note', sp.type, sp.id);
        removed += R.removeAllOf(ref);
        var arr0 = k && k.data ? k.data[sp.type] : null;
        if(arr0) for(var z=arr0.length-1;z>=0;z--) if(arr0[z].id === sp.id) arr0.splice(z,1);
      });
      [SAMPLE.book, SAMPLE.check, SAMPLE.judge].forEach(function(sp){
        var ref = R.makeRef('note', sp.type, sp.id);
        removed += R.removeAllOf(ref);
        var arr = k && k.data ? k.data[sp.type] : null;
        if(arr) for(var i=arr.length-1;i>=0;i--) if(arr[i].id === sp.id) arr.splice(i,1);
      });
      /* 메모가 '예시'로 시작하는 나머지 갈래도 정리 */
      R.all().slice().forEach(function(x){ if(/^예시/.test(x.memo||'')){ R.remove(x.id); removed++; } });
      if(k && k.save) k.save();
      if(k && k.renderSidebar){ ['books','economics','thesis'].forEach(function(t){ try{ k.renderSidebar(t); }catch(e){} }); }
    }catch(e){}
    return removed;
  }
  window.__nnRelClearExamples = clearExamples;

  /* 이미 만들어진 예시 노트를 최신 내용으로 맞춘다.
     seedExample 은 한 번 돌면 플래그 때문에 다시 실행되지 않으므로,
     표지·본문이 바뀌었을 때를 위해 별도로 한 번 더 확인한다. */
  function refreshExamples(){
    try{
      var k = window.KnowledgeNotes;
      if(!k || !k.data) return;
      var touched = 0;
      [SAMPLE.book, SAMPLE.check, SAMPLE.judge].forEach(function(sp){
        var n = findNote(sp.type, sp.id);
        if(!n) return;
        var changed = (n.title !== sp.title) || (n.content !== sp.content)
                   || (sp.cover && n.cover !== sp.cover);
        if(!changed) return;
        n.title = sp.title;
        n.content = sp.content;
        if(sp.cover) n.cover = sp.cover;
        touched++;
      });
      /* 옛 안내 문구 정리 — 특정 예시가 아니라 '모든 노트'를 훑는다.
         구버전 예시(rlx_think 등)에도 남아 있어 계속 보였다. */
      try{
        ['books','economics','thesis','lexicon','media'].forEach(function(t){
          (k.data[t] || []).forEach(function(n){
            if(!n || !n.content || n.content.indexOf('맥락 예시') < 0) return;
            n.content = n.content.replace(
              /<div[^>]*class="np-note"[^>]*>[\s\S]*?<\/div>/g, function(m){
                return m.indexOf('맥락 예시') >= 0 ? '' : m;
              });
            touched++;
          });
        });
      }catch(e){}

      /* 예시 갈래 이름이 비어 있으면 채운다 */
      try{
        var bref = R.makeRef('note','books', SAMPLE.book.id);
        if(findNote(SAMPLE.book.type, SAMPLE.book.id) && !R.metaOf(bref).title){
          R.setMeta(bref,
            '복리와 시간 — 장기 인덱스에 이르기까지',
            '한 문장에서 출발해 숫자로 검증하고, 원칙과 종목 선정 기준을 세워 실제 보유까지 간 기록입니다. ' +
            '나중에 이 판단이 흔들릴 때 어디서부터 다시 봐야 하는지 이 갈래를 거슬러 오르면 알 수 있습니다.');
          touched++;
        }
      }catch(e){}

      /* 이미 만들어진 예시 책이 엉뚱한 그룹(사고 싶은 책)에 있으면 완독으로 옮긴다 */
      try{
        var bn = findNote(SAMPLE.book.type, SAMPLE.book.id);
        var bg = (k.groups && k.groups.books) ? k.groups.books : [];
        if(bn && bg.length){
          var want = null;
          for(var bi=0; bi<bg.length; bi++){
            var gname = String(bg[bi].name||'') + ' ' + String(bg[bi].id||'');
            if(gname.indexOf('done') >= 0 || gname.indexOf('완독') >= 0){ want = bg[bi].id; break; }
          }
          if(want && bn.groupId !== want){
            bn.groupId = want;
            if(!bn.rating) bn.rating = 5;
            touched++;
          }
        }
      }catch(e){}

      if(touched){
        k.save();
        ['books','economics','thesis'].forEach(function(t){ try{ k.renderSidebar(t); }catch(e){} });
      }
    }catch(e){}
  }

  (function ready(){
    if(window.KnowledgeNotes && window.KnowledgeNotes.data){
      setTimeout(seedExample, 1500);
      setTimeout(refreshExamples, 1800);
      return;
    }
    setTimeout(ready, 300);
  })();


  /* ══════════════════════════════════════════════════════════
     맥락 안내 — 왜 필요한지 · 무엇을 얻는지 · 언제 이으면 되는지
     패널에 욱여넣지 않고 별도 창으로 제대로 설명한다.
     ══════════════════════════════════════════════════════════ */
  /* 설명 문구는 배열로 둔다 — 여러 줄 문자열 이어붙이기에서 NaN이 나온 적이 있다 */
  var GAINS = [
    ['거슬러 오르기',
     '보유 종목 하나를 열면, 그걸 사게 만든 책·생각·자료가 한눈에 보입니다. “나는 왜 이걸 갖고 있는가”에 <b>기억이 아니라 기록으로</b> 답합니다.'],
    ['전제가 깨졌을 때',
     '“AI 투자가 계속 늘 것이다” 같은 전제가 흔들렸다고 합시다. 그 전제를 담은 기록을 열면 <b>그것에 기대고 있던 판단과 종목이 전부</b> 드러납니다. 무엇을 다시 봐야 하는지 즉시 알 수 있습니다.'],
    ['시간이 쌓이면',
     '3년치가 모이면 내 생각이 어떻게 변해 왔는지, 어떤 가정을 <b>반복해서 틀렸는지</b> 드러납니다. 다른 어떤 서비스도 대신해 줄 수 없는, 나만의 기록입니다.']
  ];
  var WHENS = [
    ['책을 덮으며', '“이건 투자에 쓸 수 있겠다” 싶은 대목이 있었다면, 그 책과 떠오른 생각을 잇습니다.'],
    ['종목을 사기로 했을 때', '결정의 근거가 된 기록과 그 종목을 잇습니다. 이 한 번이 나중에 가장 큰 값을 합니다.'],
    ['뉴스가 생각을 흔들 때', '기존 판단을 강화하거나 약화시킨 자료를 그 판단에 잇습니다.'],
    ['되짚어 볼 때', '분기에 한 번, 이어 둔 갈래를 따라가며 아직 유효한 논리인지 점검합니다.']
  ];

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
      +   '<div class="rlg-gains">' + GAINS.map(function(g){ return gain(g[0], g[1]); }).join('') + '</div>'
      + '</section>'

      /* ④ 언제 이으면 되나 */
      + '<section class="rlg-sec">'
      +   '<div class="rlg-s-n">04</div>'
      +   '<h3 class="rlg-s-t">언제 이으면 되나</h3>'
      +   '<div class="rlg-when">' + WHENS.map(function(w){ return when(w[0], w[1]); }).join('') + '</div>'
      +   '<p class="rlg-note">완벽하게 이을 필요는 없습니다. <b>중요한 판단 하나에 근거 하나</b>만 이어 두어도, 1년 뒤에는 큰 차이가 납니다.</p>'
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
