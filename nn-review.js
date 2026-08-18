/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 돌아볼 것 (nn-review.js)

   왜 만들었나
     이 사이트의 요지는 ABOUT 에 적힌 그대로다.
       "몇 해가 지난 뒤 그 판단을 다시 꺼내 확인해 보는 일."

     그런데 그 '다시 꺼낼 때가 됐다'는 신호가
       · 논거 검토 → CONVICTION 탭 안
       · 일지 복기 → JOURNAL 탭 안
     에만 있었다. 즉 이미 잊어버린 사람은 영영 볼 수 없고,
     기억하고 그 탭에 들어간 사람만 알림을 받는 구조였다.
     알림이 필요한 사람에게 정확히 닿지 않았다.

     그래서 홈 DAILY DESK 맨 앞 — 브리핑 바로 아래에 한 칸을 둔다.
     밀린 것이 없으면 칸 자체를 숨긴다. 빈 상자를 두지 않는다.

   설계 원칙
     · 새 데이터를 만들지 않는다. __nnConv.dueList() 와
       __nnJournal.dueList() 를 부르는 게 전부다.
     · 마크업을 index.html 에 넣지 않고 DOM 으로 끼워 넣는다.
       DAILY DESK 구조를 건드리지 않기 위해서다.
     · 기존 클래스(.dd-card .dd-head .dd-label .dd-item)를 그대로 쓴다.
       그래야 어두운 배경과 '첫 화면만 흰색' 편집 레이아웃
       두 가지 모드가 자동으로 따라온다.
     · 스타일은 이 파일이 주입한다. nn-style.css 의 규칙 순서를
       건드리지 않는다(같은 셀렉터 113군데 중복).

   로딩 순서: … → nn-modules.js → nn-mobilenav.js → nn-review.js  (맨 마지막)
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnReview) return;

  var MAX = 5;          /* 한 번에 보여 줄 최대 건수 */
  var box = null;

  function esc(x){ return String(x==null?'':x)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function today(){ return new Date().toISOString().slice(0,10); }

  /* 날짜 문자열(YYYY-MM-DD) 기준 며칠 지났나 */
  function daysPast(dstr){
    if(!dstr) return 0;
    var a = new Date(String(dstr).slice(0,10) + 'T00:00:00');
    var b = new Date(today() + 'T00:00:00');
    if(isNaN(a.getTime())) return 0;
    return Math.round((b - a) / 86400000);
  }

  /* 지난 정도에 따라 색을 달리한다 — 오래 방치될수록 눈에 띄게 */
  function tone(d){
    if(d >= 31) return { c:'#d4677a', lb:d + '일 지남' };
    if(d >= 8)  return { c:'#d99b5f', lb:d + '일 지남' };
    if(d >= 1)  return { c:'#e0a94a', lb:d + '일 지남' };
    return { c:'#e0a94a', lb:'오늘' };
  }

  /* ══════════════════════════════════════════════════════
     밀린 항목 모으기
     ══════════════════════════════════════════════════════ */
  function collect(){
    var out = [];

    try{
      var C = window.__nnConv;
      if(C && C.dueList){
        C.dueList().forEach(function(x){
          var st = C.statusOf(x.status);
          out.push({
            kind:'thesis', id:x.id,
            badge:'논거', bc:'#4d8bff',
            title:(x.title || '제목 없는 논거'),
            sub:(st ? st.lb : '') + (x.nextReview ? ' · 검토 예정 ' + x.nextReview : ''),
            days:daysPast(x.nextReview)
          });
        });
      }
    }catch(e){}

    try{
      var J = window.__nnJournal;
      if(J && J.dueList){
        J.dueList().forEach(function(x){
          var a = J.actionOf(x.action);
          var why = (x.why && x.why.length) ? x.why[0] : '';
          out.push({
            kind:'journal', id:x.id,
            badge:'일지', bc:'#3fc4b0',
            title:(x.asset ? x.asset + ' ' : '') + (a ? a.lb : '') ,
            sub:x.date + (why ? ' · ' + why : ''),
            days:daysPast(x.reviewDate)
          });
        });
      }
    }catch(e){}

    /* 오래 밀린 것부터 */
    out.sort(function(a,b){ return b.days - a.days; });
    return out;
  }

  /* ══════════════════════════════════════════════════════
     스타일
     ══════════════════════════════════════════════════════ */
  var CSS = [
  '#ddReview{display:none}',
  '#ddReview.on{display:block}',
  '.ddrv-sum{font-family:\'Pretendard\',sans-serif;font-size:12px;color:rgba(255,255,255,.5);',
  '  margin:-4px 0 10px;letter-spacing:.01em}',
  '.ddrv-sum b{color:#e0a94a;font-weight:700}',
  '.ddrv-list{display:flex;flex-direction:column;gap:7px}',
  '.ddrv-badge{font-family:\'Pretendard\',sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.06em;',
  '  border:1px solid;border-radius:6px;padding:3px 7px;flex-shrink:0;line-height:1}',
  '.ddrv-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
  '.ddrv-t{font-family:\'Pretendard\',sans-serif;font-size:13px;font-weight:600;color:rgba(245,242,235,.94);',
  '  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.ddrv-s{font-family:\'Pretendard\',sans-serif;font-size:10.5px;font-weight:300;color:rgba(255,255,255,.42);',
  '  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.ddrv-days{font-family:\'Pretendard\',sans-serif;font-size:10.5px;font-weight:700;flex-shrink:0;',
  '  border-radius:8px;padding:3px 8px;line-height:1;border:1px solid}',
  '.ddrv-more{font-family:\'Pretendard\',sans-serif;font-size:11px;color:rgba(255,255,255,.42);',
  '  background:transparent;border:0;cursor:pointer;padding:8px 4px 2px;text-align:left;width:100%}',
  '.ddrv-more:hover{color:#e0c389}',

  /* 첫 화면만 흰색 — 편집 레이아웃 모드 */
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .ddrv-t{color:var(--lp-ink)!important}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .ddrv-s{color:var(--lp-ink3)!important}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .ddrv-sum{color:var(--lp-ink2)!important}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .ddrv-sum b{color:var(--lp-brass)!important}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) .ddrv-more{color:var(--lp-ink3)!important}',
  'html.nn-bgmode-hero:not(.nn-bgscroll-dark) #ddReview{',
  '  margin-bottom:clamp(46px,5.5vw,78px)!important;padding-bottom:clamp(38px,4.6vw,60px)!important;',
  '  border-bottom:1px solid var(--lp-rule)!important}',

  '@media (max-width:560px){',
  '  .ddrv-s{display:none}',
  '  .ddrv-days{font-size:10px;padding:3px 6px}',
  '}'
  ].join('');

  function injectCss(){
    if(document.getElementById('nnReviewCss')) return;
    var s = document.createElement('style');
    s.id = 'nnReviewCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════
     칸 만들기 — 브리핑 바로 아래
     ══════════════════════════════════════════════════════ */
  function ensureBox(){
    if(box && box.parentNode) return box;
    var desk = document.querySelector('.daily-desk');
    if(!desk) return null;

    box = document.createElement('div');
    box.className = 'dd-card dd-review reveal-up';
    box.id = 'ddReview';
    box.innerHTML =
        '<div class="dd-head">'
      +   '<span class="dd-label">REVIEW DUE</span>'
      +   '<span class="dd-sub">돌아볼 때가 된 판단</span>'
      + '</div>'
      + '<div class="ddrv-sum" id="ddrvSum"></div>'
      + '<div class="ddrv-list" id="ddrvList"></div>';

    var brief = document.getElementById('ddBrief');
    if(brief && brief.parentNode === desk) desk.insertBefore(box, brief.nextSibling);
    else desk.insertBefore(box, desk.firstChild);

    return box;
  }

  /* ══════════════════════════════════════════════════════
     그리기
     ══════════════════════════════════════════════════════ */
  function render(){
    var el = ensureBox();
    if(!el) return;

    var list = collect();
    if(!list.length){
      el.classList.remove('on');
      return;
    }
    el.classList.add('on');

    var nT = 0, nJ = 0;
    list.forEach(function(x){ if(x.kind === 'thesis') nT++; else nJ++; });
    var parts = [];
    if(nT) parts.push('논거 검토 <b>' + nT + '건</b>');
    if(nJ) parts.push('일지 복기 <b>' + nJ + '건</b>');

    var sum = el.querySelector('#ddrvSum');
    if(sum) sum.innerHTML = parts.join(' · ') + ' — 다시 볼 때가 됐습니다.';

    var host = el.querySelector('#ddrvList');
    if(!host) return;

    var show = list.slice(0, MAX);
    host.innerHTML = show.map(function(x){
      var t = tone(x.days);
      return '<div class="dd-item ddrv-item" data-kind="' + x.kind + '" data-id="' + esc(x.id) + '">'
        + '<span class="ddrv-badge" style="color:' + x.bc + ';border-color:' + x.bc + '55;background:' + x.bc + '14">'
        +   esc(x.badge) + '</span>'
        + '<span class="ddrv-body">'
        +   '<span class="ddrv-t">' + esc(x.title) + '</span>'
        +   (x.sub ? '<span class="ddrv-s">' + esc(x.sub) + '</span>' : '')
        + '</span>'
        + '<span class="ddrv-days" style="color:' + t.c + ';border-color:' + t.c + '55;background:' + t.c + '14">'
        +   esc(t.lb) + '</span>'
        + '</div>';
    }).join('');

    if(list.length > MAX){
      var rest = list.length - MAX;
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'ddrv-more';
      more.textContent = '외 ' + rest + '건 더 — CONVICTION · JOURNAL 에서 보기';
      more.onclick = function(){ go(list[MAX].kind, list[MAX].id); };
      host.appendChild(more);
    }

    host.querySelectorAll('.ddrv-item').forEach(function(row){
      row.onclick = function(){
        go(row.getAttribute('data-kind'), row.getAttribute('data-id'));
      };
    });
  }

  /* 해당 기록으로 이동 */
  function go(kind, id){
    try{
      if(typeof switchPage !== 'function') return;
      if(kind === 'thesis'){
        switchPage('conviction');
        setTimeout(function(){ try{ if(window.__nnConvOpen) window.__nnConvOpen(id); }catch(e){} }, 280);
      } else {
        switchPage('journal');
        setTimeout(function(){ try{ if(window.__nnJnOpen) window.__nnJnOpen(id); }catch(e){} }, 280);
      }
    }catch(e){}
  }

  /* ══════════════════════════════════════════════════════
     홈으로 돌아올 때마다 다시 센다
     ══════════════════════════════════════════════════════ */
  function hookSwitch(){
    if(typeof window.switchPage !== 'function' || window.switchPage.__nnRvWrapped) return;
    var orig = window.switchPage;
    var wrapped = function(name){
      var r = orig.apply(this, arguments);
      if(name === 'home') setTimeout(render, 80);
      return r;
    };
    wrapped.__nnRvWrapped = true;
    window.switchPage = wrapped;
  }

  /* ══════════════════════════════════════════════════════
     시작 — 논거·일지 모듈과 예시 데이터가 늦게 뜬다
     ══════════════════════════════════════════════════════ */
  function boot(){
    injectCss();
    hookSwitch();
    render();
    [900, 2600, 4200].forEach(function(ms){ setTimeout(render, ms); });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__nnReview = { render:render, count:function(){ return collect().length; } };
  window.__nnReviewRender = render;
})();
