/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 매매 기록을 논거 옆으로 (nn-tradelog.js)

   왜 옮겼나
     '왜 샀는가'(CONVICTION)와 '언제 얼마에 샀는가'(JOURNAL·매매 기록)는
     사실 같은 이야기의 앞뒤인데 탭이 따로 떨어져 있었다.
     종목 논거를 펼치면 그 종목의 매매 기록이 바로 아래에 보이는 게 맞다.
     JOURNAL 은 메뉴에서 빼고, 들어갈 길만 CONVICTION 안에 남겼다.

   무엇을 건드렸나 — nn-journal.js·nn-conviction.js 는 한 줄도 안 고쳤다
     둘 다 화면을 다시 그리는 함수를 window 에 내놓고 있다.
       window.__nnConvOpen(id)  — 논거 하나 펼치기
       window.__nnConvList()    — 논거 목록
     이 둘을 감싸서, 원래 그림이 끝난 뒤에 블록 하나를 끼워 넣는다.
     기록을 쓰고 고치는 건 기존 모달을 그대로 부른다.
       window.__nnJnEditor(id, seed)   — 매매 기록 쓰기/고치기
       window.__nnJnOutcome(id)        — 나중에 결과·배움 적기
       window.__nnJournal.forAsset(tk) — 그 종목 기록만 골라내기

   ⚠ 끼워 넣는 자리
     nn-conviction.js 의 openDetail 은 마지막에 <div id="cvRel"></div> 를 두고
     거기에 맥락 패널을 채운다. 매매 기록은 그 **앞**에 넣어야
     맥락 패널이 계속 맨 아래에 온다.

   분기 복기는 옮기지 않았다
     화면이 크고 기록 전체를 훑는 성격이라 종목 하나 옆에 붙을 물건이 아니다.
     CONVICTION 목록 맨 위에 버튼만 두고, 누르면 원래 있던 화면으로 보낸다.
     JOURNAL 페이지는 지우지 않고 네비 버튼만 뺐다 — 링크·커맨드 팔레트는 그대로 산다.

   로딩 순서: … → nn-wealth.js → nn-daily.js → nn-tradelog.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnTradeLog) return;

  function J(){ return window.__nnJournal; }
  function C(){ return window.__nnConv; }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function dt(d){
    var p = String(d || '').split('-');
    return p.length === 3 ? (p[0].slice(2) + '.' + p[1] + '.' + p[2]) : esc(d);
  }

  /* ── 종목 하나의 매매 기록 블록 ── */
  function logBlock(asset){
    var j = J();
    if(!j || !asset) return '';
    var rows = j.forAsset(asset).slice().sort(function(a, b){
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    var h = '<div class="cv-blk tl-blk"><div class="cv-blk-t">'
      + '매매 기록 · ' + esc(asset)
      + '<button type="button" class="tl-new" data-tl-new="' + esc(asset) + '">＋ 기록 추가</button>'
      + '</div>';

    if(!rows.length){
      h += '<div class="tl-empty">아직 이 종목의 매매 기록이 없습니다. '
         + '돈이 움직였을 때만 적으면 됩니다.</div></div>';
      return h;
    }

    h += '<div class="tl-list">';
    for(var i = 0; i < rows.length; i++){
      var r = rows[i], a = j.actionOf(r.action) || {lb: r.action, c: '#888'};
      h += '<button type="button" class="tl-row" data-tl-open="' + esc(r.id) + '">'
        + '<span class="tl-d">' + dt(r.date) + '</span>'
        + '<span class="tl-a" style="color:' + esc(a.c) + ';border-color:' + esc(a.c) + '55">'
        +   esc(a.lb) + '</span>'
        + '<span class="tl-q">' + esc(r.qty || '') + (r.qty ? '주' : '')
        +   (r.price ? ' @ ' + esc(r.price) : '') + '</span>'
        + '<span class="tl-c">확신 ' + esc(r.conviction || '-') + '</span>'
        + (r.outcome ? '<span class="tl-ok">복기함</span>' : '')
        + '</button>';
    }
    return h + '</div></div>';
  }

  /* ── 논거 상세가 그려진 뒤 블록을 끼워 넣는다 ── */
  function inject(id){
    var rel = document.getElementById('cvRel');
    if(!rel || !rel.parentNode) return;
    var old = document.querySelector('.tl-blk');
    if(old && old.parentNode) old.parentNode.removeChild(old);

    var c = C(), rec = c && c.byId ? c.byId(id) : null;
    var asset = rec && rec.asset;
    if(!asset) return;

    var box = document.createElement('div');
    box.innerHTML = logBlock(asset);
    var node = box.firstChild;
    if(node) rel.parentNode.insertBefore(node, rel);
  }

  /* ── 목록 맨 위 '분기 복기' 버튼 ── */
  function injectList(){
    var top = document.querySelector('#cv-body .cv-top');
    if(!top || top.querySelector('.tl-rev')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tl-rev';
    b.textContent = '분기 복기';
    b.title = '기록 전체를 분기 단위로 돌아봅니다';
    b.onclick = function(){
      if(typeof window.switchPage === 'function') window.switchPage('journal');
      setTimeout(function(){
        try{ if(window.__nnJnSetView) window.__nnJnSetView('review'); }catch(e){}
      }, 120);
    };
    top.appendChild(b);
  }

  /* ── 클릭 처리 — 본문이 다시 그려져도 살아 있게 문서 단위로 듣는다 ── */
  function bind(){
    if(document.__nnTlBound) return;
    document.__nnTlBound = true;
    document.addEventListener('click', function(e){
      var t = e.target, hit = null, kind = null;
      while(t && t !== document){
        if(t.getAttribute){
          if(t.hasAttribute('data-tl-open')){ hit = t.getAttribute('data-tl-open'); kind = 'open'; break; }
          if(t.hasAttribute('data-tl-new')){ hit = t.getAttribute('data-tl-new'); kind = 'new'; break; }
        }
        t = t.parentNode;
      }
      if(!hit) return;
      e.preventDefault();
      if(kind === 'open'){
        if(window.__nnJnEditor) window.__nnJnEditor(hit);
      } else {
        if(window.__nnJnEditor) window.__nnJnEditor(null, {asset: hit});
      }
      /* 모달을 닫고 나면 목록을 새로 그린다 */
      setTimeout(refresh, 400);
    }, true);
  }

  var lastId = null;
  function refresh(){ if(lastId) inject(lastId); }

  /* ⚠ 뒤로가기 버튼은 감쌀 수 없다
     nn-conviction.js 의 '← 목록' 버튼은 모듈 안쪽 renderList 를 직접 부른다
     (cvBack.onclick = renderList). window 에 나온 함수가 아니라 감싸도 안 걸린다.
     그래서 #cv-body 를 지켜보다가, 화면이 새로 그려질 때마다 끼워 넣는다.
     넣은 게 이미 있으면 아무것도 안 하므로 서로를 계속 부르지 않는다. */
  function watch(){
    var el = document.getElementById('cv-body');
    if(!el || el.__nnTlWatch || typeof MutationObserver !== 'function') return;
    el.__nnTlWatch = true;
    new MutationObserver(function(){
      if(el.querySelector('.cv-top') && !el.querySelector('.tl-rev')) injectList();
      if(el.querySelector('#cvRel') && !el.querySelector('.tl-blk') && lastId) inject(lastId);
    }).observe(el, {childList: true, subtree: true});
  }

  function hook(){
    if(window.__nnConvOpen && !window.__nnConvOpen.__nnTlWrapped){
      var o = window.__nnConvOpen;
      var wo = function(id){
        var r = o.apply(this, arguments);
        lastId = id;
        setTimeout(function(){ inject(id); }, 0);
        return r;
      };
      wo.__nnTlWrapped = true;
      window.__nnConvOpen = wo;
    }
    if(window.__nnConvList && !window.__nnConvList.__nnTlWrapped){
      var l = window.__nnConvList;
      var wl = function(){
        var r = l.apply(this, arguments);
        lastId = null;
        setTimeout(injectList, 0);
        return r;
      };
      wl.__nnTlWrapped = true;
      window.__nnConvList = wl;
      /* __nnConvRender 는 위 두 함수를 **가둬 놓고** 있어서 감싼 게 안 먹는다.
         그래서 다시 그리는 입구도 새로 만들어 준다. */
      window.__nnConvRender = function(){
        if(lastId) window.__nnConvOpen(lastId); else window.__nnConvList();
      };
    }
    return !!(window.__nnConvOpen && window.__nnConvOpen.__nnTlWrapped);
  }

  function boot(){
    bind();
    watch();
    var t = 0;
    (function wait(){
      watch();
      if(hook()) return;
      if(++t > 60) return;
      setTimeout(wait, 200);
    })();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__nnTradeLog = { refresh: refresh, block: logBlock };
})();

/* ── 스타일 — 파일이 직접 주입 (nn-style.css 순서 불변) ── */
(function(){
  'use strict';
  if(document.getElementById('nnTlCss')) return;
  var CSS = [
  '.tl-blk .cv-blk-t{display:flex;align-items:center;gap:10px}',
  '.tl-new{margin-left:auto;cursor:pointer;font-family:\'Pretendard\',sans-serif;',
  '  font-size:11.5px;font-weight:600;padding:5px 11px;border-radius:999px;',
  '  color:#9fc0ff;background:rgba(61,111,181,.14);border:1px solid rgba(61,111,181,.5);',
  '  transition:.16s}',
  '.tl-new:hover{background:rgba(61,111,181,.28);border-color:#3d6fb5;',
  '  box-shadow:0 0 16px -4px #3d6fb5}',
  '.tl-empty{font-family:\'Pretendard\',sans-serif;font-size:12.5px;',
  '  color:rgba(255,255,255,.4);padding:10px 2px}',
  '.tl-list{display:flex;flex-direction:column;gap:5px;margin-top:6px}',
  '.tl-row{display:flex;align-items:center;gap:11px;width:100%;text-align:left;',
  '  cursor:pointer;padding:9px 13px;border-radius:8px;font-family:\'Pretendard\',sans-serif;',
  '  background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.09);',
  '  color:rgba(255,255,255,.82);font-size:12.5px;transition:.15s}',
  '.tl-row:hover{background:rgba(61,111,181,.13);border-color:rgba(61,111,181,.5);',
  '  transform:translateX(2px)}',
  '.tl-d{font-family:\'Bebas Neue\',sans-serif;letter-spacing:.07em;font-size:13px;',
  '  color:rgba(255,255,255,.6);min-width:62px}',
  '.tl-a{font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px;',
  '  border:1px solid;min-width:44px;text-align:center}',
  '.tl-q{flex:1;min-width:0;color:rgba(255,255,255,.9)}',
  '.tl-c{font-size:11.5px;color:rgba(255,255,255,.45)}',
  '.tl-ok{font-size:10.5px;font-weight:700;color:#7fd58c;',
  '  background:rgba(127,213,140,.12);border:1px solid rgba(127,213,140,.4);',
  '  border-radius:5px;padding:2px 7px}',
  '.tl-rev{margin-left:8px;cursor:pointer;font-family:\'Pretendard\',sans-serif;',
  '  font-size:12px;font-weight:600;padding:7px 14px;border-radius:999px;',
  '  color:rgba(255,255,255,.72);background:rgba(255,255,255,.05);',
  '  border:1px solid rgba(255,255,255,.16);transition:.16s}',
  '.tl-rev:hover{color:#9fc0ff;background:rgba(61,111,181,.16);',
  '  border-color:rgba(61,111,181,.55)}',
  '@media (max-width:620px){',
  '  .tl-row{flex-wrap:wrap;gap:7px}',
  '  .tl-q{flex:1 1 100%}',
  '}'
  ].join('');
  var s = document.createElement('style');
  s.id = 'nnTlCss'; s.textContent = CSS;
  document.head.appendChild(s);
})();
