/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 지식에서 자본까지 (nn-flow.js)

   "나는 왜 이 자산을 갖고 있는가"에 답하는 화면.
   1~3단계에서 쌓인 것들(기록·맥락·논거·일지)을 한 장으로 모아
   내 지식이 어디까지 흘러갔는지 보여 준다.

   숫자를 세는 데 그치지 않는다. 각 단계를 눌러 실제 기록으로 갈 수 있고,
   자산 하나를 고르면 그 자산에 닿은 갈래를 거슬러 올라간다.

   로딩 순서: … → nn-conviction.js → nn-journal.js → nn-flow.js → nn-modules.js
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnFlow) return;

  function esc(x){ return String(x==null?'':x)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ── 단계별 집계 ── */
  function counts(){
    var out = { books:0, notes:0, threads:0, thesis:0, journal:0, assets:0, linked:0 };
    try{
      var k = window.KnowledgeNotes;
      if(k && k.data){
        out.books = (k.data.books || []).length;
        ['economics','media','lexicon','thesis'].forEach(function(t){
          out.notes += (k.data[t] || []).length;
        });
      }
    }catch(e){}
    try{
      var R = window.__nnRel;
      if(R){
        var all = R.all();
        out.linked = all.length;
        /* 갈래(뿌리) 수 = 서로 다른 뿌리의 개수 */
        var roots = {};
        all.forEach(function(x){ roots[R.rootOf(x.from)] = 1; });
        out.threads = Object.keys(roots).length;
      }
    }catch(e){}
    try{ if(window.__nnConv) out.thesis = window.__nnConv.all().length; }catch(e){}
    try{ if(window.__nnJournal) out.journal = window.__nnJournal.all().length; }catch(e){}
    try{
      var H = window.HOLDINGS || [];
      out.assets = H.length;
    }catch(e){}
    return out;
  }

  /* ── 자산별 역추적 ──
     이 자산에 닿은 갈래를 거슬러, 어떤 기록에서 시작했는지 찾는다. */
  function traceAsset(tk){
    var out = { asset:tk, chain:[], thesis:[], journal:[] };
    try{
      var R = window.__nnRel;
      if(R){
        var ref = 'asset:' + String(tk).toUpperCase();
        var line = R.lineOf(ref);
        out.chain = line;
      }
    }catch(e){}
    try{
      if(window.__nnConv) out.thesis = window.__nnConv.forAsset(tk);
    }catch(e){}
    try{
      if(window.__nnJournal) out.journal = window.__nnJournal.forAsset(tk);
    }catch(e){}
    return out;
  }

  /* ── 자산 목록 (연결된 것 우선) ── */
  function assetList(){
    var H = [];
    try{ H = window.HOLDINGS || []; }catch(e){}
    return H.map(function(h){
      var tk = String(h.tk || '').toUpperCase();
      var t = traceAsset(tk);
      return {
        tk: tk, nm: h.nm || '',
        chainLen: t.chain.length,
        thesisN: t.thesis.length,
        journalN: t.journal.length,
        linked: (t.chain.length > 1 || t.thesis.length || t.journal.length)
      };
    }).sort(function(a,b){
      if(a.linked !== b.linked) return a.linked ? -1 : 1;
      return (b.chainLen + b.thesisN + b.journalN) - (a.chainLen + a.thesisN + a.journalN);
    });
  }

  window.__nnFlow = { counts:counts, traceAsset:traceAsset, assetList:assetList };
})();

/* ══════════════════════════════════════════════════════════════════════
   화면 — 흐름 요약 · 자산별 역추적
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var F = window.__nnFlow;
  if(!F) return;

  function esc(x){ return String(x==null?'':x)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function host(){ return document.getElementById('fl-body'); }

  var openTk = null;

  var STAGES = [
    { k:'books',   lb:'읽는다',   sub:'BOOKS',      unit:'권', c:'#c9a96e', go:'books' },
    { k:'notes',   lb:'기록한다', sub:'NOTES',      unit:'개', c:'#8fb98f', go:'economics' },
    { k:'threads', lb:'잇는다',   sub:'THREAD',     unit:'갈래', c:'#7ee8c8', go:null },
    { k:'thesis',  lb:'판단한다', sub:'CONVICTION', unit:'건', c:'#4d8bff', go:'conviction' },
    { k:'journal', lb:'실행한다', sub:'JOURNAL',    unit:'건', c:'#3fc4b0', go:'journal' },
    { k:'assets',  lb:'보유한다', sub:'HOLDINGS',   unit:'종목', c:'#b28ad4', go:'portfolio' }
  ];

  function render(){
    var el = host(); if(!el) return;
    var c = F.counts();
    var list = F.assetList();
    var linkedN = list.filter(function(a){ return a.linked; }).length;

    var h = '<div class="fl-stages">' + STAGES.map(function(s, i){
        var n = c[s.k] || 0;
        return (i ? '<span class="fl-ar">→</span>' : '')
          + '<button type="button" class="fl-st' + (n ? '' : ' zero') + '"'
          + (s.go ? ' data-go="' + s.go + '"' : '') + '>'
          +   '<span class="fl-st-bar" style="background:' + s.c + '"></span>'
          +   '<span class="fl-st-n">' + n + '<i>' + s.unit + '</i></span>'
          +   '<span class="fl-st-lb">' + s.lb + '</span>'
          +   '<span class="fl-st-sub">' + s.sub + '</span>'
          + '</button>';
      }).join('') + '</div>';

    /* 한 줄 요약 */
    h += '<div class="fl-sum">'
      + (linkedN
          ? '보유 ' + c.assets + '종목 중 <b>' + linkedN + '종목</b>이 내 기록과 이어져 있습니다.'
          : '아직 기록과 이어진 자산이 없습니다. 맥락에서 <b>기록과 종목을 이어</b> 보세요.')
      + '</div>';

    /* 자산별 */
    h += '<div class="fl-sec-t">나는 왜 이걸 갖고 있는가</div>';
    if(!list.length){
      h += '<div class="fl-empty">보유 종목이 없습니다.</div>';
    } else {
      h += '<div class="fl-assets">' + list.map(function(a){
        return '<button type="button" class="fl-as' + (a.linked ? ' on' : '') + (openTk===a.tk ? ' open' : '') + '" data-tk="' + esc(a.tk) + '">'
          + '<span class="fl-as-tk">' + esc(a.tk) + '</span>'
          + (a.nm ? '<span class="fl-as-nm">' + esc(a.nm) + '</span>' : '')
          + (a.linked
              ? '<span class="fl-as-tag">' + (a.chainLen > 1 ? a.chainLen + '칸 갈래' : '') 
                + (a.thesisN ? (a.chainLen>1?' · ':'') + '논거 ' + a.thesisN : '')
                + (a.journalN ? ' · 일지 ' + a.journalN : '') + '</span>'
              : '<span class="fl-as-none">아직 이어진 기록 없음</span>')
          + '</button>';
      }).join('') + '</div>';
      if(openTk) h += '<div id="flTrace"></div>';
    }
    el.innerHTML = h;

    el.querySelectorAll('.fl-st[data-go]').forEach(function(b){
      b.onclick = function(){
        var p = b.getAttribute('data-go');
        if(typeof switchPage === 'function') switchPage(p);
      };
    });
    el.querySelectorAll('.fl-as').forEach(function(b){
      b.onclick = function(){
        var tk = b.getAttribute('data-tk');
        openTk = (openTk === tk) ? null : tk;
        render();
      };
    });
    if(openTk) drawTrace(openTk);
  }

  function drawTrace(tk){
    var box = document.getElementById('flTrace'); if(!box) return;
    var t = F.traceAsset(tk);

    var h = '<div class="fl-tr">';
    h += '<div class="fl-tr-h">' + esc(tk) + ' 까지 이어진 길</div>';

    if(t.chain.length > 1){
      h += '<div class="fl-tr-chain">' + t.chain.map(function(n, i){
        return '<div class="fl-tr-step' + (n.kind === 'asset' ? ' last' : '') + '">'
          + '<span class="fl-tr-no">' + (i+1) + '</span>'
          + '<span class="fl-tr-tag" style="color:' + esc(n.color) + '">' + esc(n.label) + '</span>'
          + '<button type="button" class="fl-tr-t" data-ref="' + esc(n.ref) + '">' + esc(n.title) + '</button>'
          + '</div>';
      }).join('') + '</div>';
    } else {
      h += '<div class="fl-tr-none">이 종목으로 이어진 갈래가 없습니다.<br>'
         + '기록에서 <b>맥락 잇기</b>로 이 종목을 연결해 보세요.</div>';
    }

    if(t.thesis.length){
      h += '<div class="fl-tr-sub">투자 논거</div><div class="fl-tr-cards">'
        + t.thesis.map(function(x){
            var st = window.__nnConv ? window.__nnConv.statusOf(x.status) : {lb:'',c:'#999'};
            return '<button type="button" class="fl-tr-c" data-cv="' + esc(x.id) + '">'
              + '<span class="fl-tr-c-st" style="color:' + esc(st.c) + '">' + esc(st.lb) + '</span>'
              + '<span class="fl-tr-c-t">' + esc(x.title) + '</span></button>';
          }).join('') + '</div>';
    }
    if(t.journal.length){
      h += '<div class="fl-tr-sub">투자 일지 ' + t.journal.length + '건</div><div class="fl-tr-cards">'
        + t.journal.slice(0,4).map(function(x){
            var a = window.__nnJournal ? window.__nnJournal.actionOf(x.action) : {lb:'',c:'#999'};
            return '<button type="button" class="fl-tr-c" data-jn="' + esc(x.id) + '">'
              + '<span class="fl-tr-c-st" style="color:' + esc(a.c) + '">' + esc(a.lb) + '</span>'
              + '<span class="fl-tr-c-t">' + esc(x.date) + (x.why && x.why[0] ? ' · ' + esc(x.why[0]) : '') + '</span></button>';
          }).join('') + '</div>';
    }
    h += '</div>';
    box.innerHTML = h;

    box.querySelectorAll('.fl-tr-t').forEach(function(b){
      b.onclick = function(){
        try{
          var info = window.__nnRel.resolve(b.getAttribute('data-ref'));
          if(info && info.open) info.open();
        }catch(e){}
      };
    });
    box.querySelectorAll('[data-cv]').forEach(function(b){
      b.onclick = function(){
        if(typeof switchPage === 'function') switchPage('conviction');
        setTimeout(function(){ if(window.__nnConvOpen) window.__nnConvOpen(b.getAttribute('data-cv')); }, 260);
      };
    });
    box.querySelectorAll('[data-jn]').forEach(function(b){
      b.onclick = function(){
        if(typeof switchPage === 'function') switchPage('journal');
        setTimeout(function(){ if(window.__nnJnOpen) window.__nnJnOpen(b.getAttribute('data-jn')); }, 260);
      };
    });
  }

  window.__nnFlowRender = render;
})();
