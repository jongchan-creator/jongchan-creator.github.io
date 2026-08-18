/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 모바일 메뉴 (nn-mobilenav.js)

   왜 만들었나
     휴대폰(≤768px)에서 KNOWLEDGE·MARKETS·PORTFOLIO 하위 탭 12개가
     전혀 열리지 않았다. 원인은 nn-style.css 의

       @media (max-width:768px){ .nav-links{ overflow-x:auto; overflow-y:hidden } }

     드롭다운은 .nav-links 바깥 아래쪽에 절대배치로 그려지는데,
     overflow-y:hidden 이 그 부분(약 142px)을 통째로 잘라냈다.
     화살표는 ▲로 뒤집히는데 메뉴는 안 보이는 상태였다.

     overflow-y 만 visible 로 되돌릴 수는 없다. CSS 규격상 한 축이
     auto 이면 반대 축의 visible 은 auto 로 승격되어 어차피 잘린다.
     그래서 모바일에서는 드롭다운을 쓰지 않고 전체화면 메뉴로 바꾼다.

   설계 원칙
     · 메뉴 내용을 하드코딩하지 않는다. 열 때마다 .nav-links 를 훑어
       그대로 옮긴다. 그래야 사용자가 만든 탭·숨긴 탭이 자동 반영되고,
       앞으로 탭이 늘어나도 이 파일을 고칠 일이 없다.
     · 원래 버튼을 옮기지 않고 .click() 으로 위임한다.
       switchPage·모달 열기 등 기존 동작이 그대로 살아 있어야 한다.
     · 패널은 body 에 붙인다. .nav 안에 두면 같은 잘림이 재발한다.
     · 스타일은 이 파일이 직접 주입한다. 586KB 짜리 nn-style.css 의
       규칙 순서를 건드리지 않기 위해서다(같은 셀렉터 113군데 중복).

   로딩 순서: … → nn-modules.js → nn-mobilenav.js   (맨 마지막)
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnMnav) return;

  var BP = 768;                 /* 이 폭 이하에서 모바일 메뉴로 전환 */
  var panel = null, scrim = null, open = false, lastFocus = null;

  function esc(x){ return String(x==null?'':x)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function isMobile(){ return window.innerWidth <= BP; }

  /* ══════════════════════════════════════════════════════
     스타일 — 문서 맨 끝에 주입하므로 nn-style.css 를 이긴다
     ══════════════════════════════════════════════════════ */
  var CSS = [
  '#nnMnavCtrls{display:none;align-items:center;gap:6px;flex:none;margin-left:auto}',
  '#nnMnavCtrls button{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);',
  '  border-radius:999px;color:rgba(255,255,255,.82);cursor:pointer;display:inline-flex;',
  '  align-items:center;justify-content:center;padding:0;transition:background .18s,border-color .18s}',
  '#nnMnavCtrls button:active{background:rgba(201,169,110,.22);border-color:rgba(201,169,110,.5)}',
  '#nnMnavSearch{width:36px;height:36px}',
  '#nnMnavBtn{width:40px;height:36px;position:relative}',
  '#nnMnavBtn .bar{position:absolute;left:11px;right:11px;height:1.5px;background:currentColor;border-radius:2px;',
  '  transition:transform .26s cubic-bezier(.4,0,.2,1),opacity .18s}',
  '#nnMnavBtn .b1{top:12px} #nnMnavBtn .b2{top:17px} #nnMnavBtn .b3{top:22px}',
  '#nnMnavBtn.on .b1{transform:translateY(5px) rotate(45deg)}',
  '#nnMnavBtn.on .b2{opacity:0}',
  '#nnMnavBtn.on .b3{transform:translateY(-5px) rotate(-45deg)}',
  '#nnMnavBtn .nn-dot{position:absolute;top:7px;right:7px;width:6px;height:6px;border-radius:50%;',
  '  background:#e0a94a;box-shadow:0 0 8px rgba(224,169,74,.8);display:none}',
  '#nnMnavBtn.has-due .nn-dot{display:block}',

  /* 가림막 */
  '#nnMnavScrim{position:fixed;inset:0;z-index:998;background:rgba(4,4,6,.62);backdrop-filter:blur(3px);',
  '  opacity:0;pointer-events:none;transition:opacity .26s ease}',
  '#nnMnavScrim.show{opacity:1;pointer-events:auto}',

  /* 패널 */
  '#nnMnavPanel{position:fixed;top:0;right:0;bottom:0;z-index:999;width:86vw;max-width:390px;',
  '  background:rgba(11,11,14,.97);backdrop-filter:blur(18px);',
  '  border-left:.5px solid rgba(201,169,110,.22);box-shadow:-18px 0 60px -12px rgba(0,0,0,.8);',
  '  transform:translateX(102%);transition:transform .3s cubic-bezier(.32,.72,0,1);',
  '  display:flex;flex-direction:column;overscroll-behavior:contain;',
  '  padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}',
  '#nnMnavPanel.show{transform:translateX(0)}',

  '.nnmn-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex:none;',
  '  padding:16px 18px 13px;border-bottom:.5px solid rgba(201,169,110,.16)}',
  '.nnmn-brand{font-family:\'Orbitron\',\'Bebas Neue\',sans-serif;font-size:14px;font-weight:700;',
  '  letter-spacing:.2em;color:#f0ede6;text-shadow:0 0 14px rgba(255,255,255,.28)}',
  '.nnmn-x{width:34px;height:34px;flex:none;border-radius:50%;border:1px solid rgba(255,255,255,.16);',
  '  background:rgba(255,255,255,.05);color:rgba(255,255,255,.75);font-size:17px;line-height:1;cursor:pointer}',

  '.nnmn-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px 0 26px}',

  /* 돌아볼 것 */
  '.nnmn-due{margin:12px 14px 4px;padding:11px 13px;border-radius:12px;',
  '  background:rgba(224,169,74,.1);border:1px solid rgba(224,169,74,.3)}',
  '.nnmn-due b{display:block;font-size:11.5px;color:#e0a94a;letter-spacing:.02em;margin-bottom:3px}',
  '.nnmn-due span{font-size:11px;color:rgba(255,255,255,.55);line-height:1.5}',

  /* 그룹 */
  '.nnmn-grp{margin:16px 0 2px;padding:0 20px;font-family:\'Bebas Neue\',sans-serif;font-size:10px;',
  '  letter-spacing:.24em;color:rgba(201,169,110,.72)}',
  '.nnmn-rule{height:.5px;background:rgba(201,169,110,.16);margin:6px 18px 4px}',

  /* 항목 */
  '.nnmn-i{display:flex;align-items:center;gap:10px;width:calc(100% - 20px);margin:1px 10px;',
  '  padding:12px 12px;background:transparent;border:0;border-radius:10px;cursor:pointer;',
  '  text-align:left;font-family:\'Pretendard\',sans-serif;font-size:13.5px;letter-spacing:.05em;',
  '  color:rgba(255,255,255,.78);transition:background .15s,color .15s;min-height:44px}',
  '.nnmn-i:active{background:rgba(255,255,255,.07)}',
  '.nnmn-i.on{background:rgba(201,169,110,.14);color:#f0d9a8;font-weight:600}',
  '.nnmn-i.on .nnmn-mk{opacity:1}',
  '.nnmn-mk{width:3px;height:15px;border-radius:2px;background:#c9a96e;opacity:0;flex:none}',
  '.nnmn-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.nnmn-i.sub{font-size:13px}',
  '.nnmn-i.util{font-size:12.5px;color:rgba(255,255,255,.56)}',
  '.nnmn-cnt{font-size:10.5px;color:rgba(224,169,74,.9);background:rgba(224,169,74,.14);',
  '  border-radius:9px;padding:2px 7px;flex:none}',

  /* 로그인/클라우드 */
  '.nnmn-auth{margin:12px 14px 2px;padding:13px 14px;border-radius:12px;display:flex;align-items:center;',
  '  gap:10px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.1);cursor:pointer;width:calc(100% - 28px)}',
  '.nnmn-auth .k{font-family:\'Bebas Neue\',sans-serif;font-size:9.5px;letter-spacing:.2em;',
  '  color:rgba(255,255,255,.42);display:block;margin-bottom:2px}',
  '.nnmn-auth .v{font-family:\'Orbitron\',sans-serif;font-size:12px;font-weight:600;letter-spacing:.12em;color:#fff}',
  '.nnmn-auth.cloud .v{color:#c9a96e}',
  '.nnmn-auth .arw{margin-left:auto;color:rgba(255,255,255,.3);font-size:14px}',

  '.nnmn-foot{flex:none;padding:11px 20px 16px;border-top:.5px solid rgba(255,255,255,.07);',
  '  font-size:10.5px;color:rgba(255,255,255,.3);letter-spacing:.05em}',

  /* ── 모바일 전환 ── */
  '@media (max-width:' + BP + 'px){',
  '  .nav .nav-links{display:none!important}',
  '  #nnMnavCtrls{display:flex!important}',
  '  .nav{flex-wrap:nowrap!important;justify-content:space-between!important}',
  '}',
  '@media (min-width:' + (BP+1) + 'px){',
  '  #nnMnavPanel,#nnMnavScrim{display:none!important}',
  '}',
  '@media (prefers-reduced-motion: reduce){',
  '  #nnMnavPanel,#nnMnavScrim,#nnMnavBtn .bar{transition:none!important}',
  '}'
  ].join('');

  function injectCss(){
    if(document.getElementById('nnMnavCss')) return;
    var s = document.createElement('style');
    s.id = 'nnMnavCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════
     상단 바 — 검색 · 햄버거
     ══════════════════════════════════════════════════════ */
  function buildBar(){
    if(document.getElementById('nnMnavCtrls')) return;
    var nav = document.querySelector('.nav');
    if(!nav) return;

    var box = document.createElement('div');
    box.id = 'nnMnavCtrls';

    var sb = document.createElement('button');
    sb.id = 'nnMnavSearch'; sb.type = 'button';
    sb.setAttribute('aria-label','검색');
    sb.innerHTML = '<svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true">'
      + '<circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>'
      + '<path d="M11 11 L14.5 14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    sb.onclick = function(){
      closePanel();
      var b = document.getElementById('cmdkBtn');
      if(b) b.click();
    };

    var hb = document.createElement('button');
    hb.id = 'nnMnavBtn'; hb.type = 'button';
    hb.setAttribute('aria-label','메뉴 열기');
    hb.setAttribute('aria-expanded','false');
    hb.innerHTML = '<span class="bar b1"></span><span class="bar b2"></span><span class="bar b3"></span>'
                 + '<span class="nn-dot"></span>';
    hb.onclick = function(){ open ? closePanel() : openPanel(); };

    box.appendChild(sb);
    box.appendChild(hb);
    nav.appendChild(box);
  }

  /* ══════════════════════════════════════════════════════
     돌아볼 것 — 검토·복기가 밀린 건수
     ══════════════════════════════════════════════════════ */
  function dueInfo(){
    var conv = 0, jn = 0;
    try{ if(window.__nnConv) conv = window.__nnConv.dueList().length; }catch(e){}
    try{ if(window.__nnJournal) jn = window.__nnJournal.dueList().length; }catch(e){}
    return { conv:conv, journal:jn, total:conv + jn };
  }

  function paintDot(){
    var b = document.getElementById('nnMnavBtn');
    if(!b) return;
    b.classList.toggle('has-due', dueInfo().total > 0);
  }

  /* ══════════════════════════════════════════════════════
     메뉴 내용 — .nav-links 를 훑어 그대로 옮긴다
     ══════════════════════════════════════════════════════ */
  function visible(el){
    if(!el) return false;
    if(el.style && el.style.display === 'none') return false;
    return true;
  }

  function rowFor(btn, cls){
    var label = (btn.textContent || '').replace(/[▾▴▲▼]/g,'').trim();
    if(!label) return null;
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'nnmn-i' + (cls ? ' ' + cls : '');
    if(btn.classList.contains('active')) row.classList.add('on');

    var mk = document.createElement('span'); mk.className = 'nnmn-mk';
    var t  = document.createElement('span'); t.className = 'nnmn-t'; t.textContent = label;
    row.appendChild(mk); row.appendChild(t);

    /* 색이 지정된 사용자 탭이면 그 색을 따른다 */
    if(btn.style && btn.style.color) t.style.color = btn.style.color;

    /* 검토가 밀린 탭에 건수 표시 */
    var d = dueInfo();
    if(btn.id === 'nav-conviction' && d.conv) addCount(row, d.conv);
    if(btn.id === 'nav-journal'    && d.journal) addCount(row, d.journal);

    row.onclick = function(){
      closePanel();
      /* 패널이 닫히는 동안 원래 버튼을 누른다 */
      setTimeout(function(){ try{ btn.click(); }catch(e){} }, 60);
    };
    return row;
  }

  function addCount(row, n){
    var c = document.createElement('span');
    c.className = 'nnmn-cnt';
    c.textContent = n;
    row.appendChild(c);
  }

  function groupTitle(text){
    var d = document.createElement('div');
    d.className = 'nnmn-grp';
    d.textContent = text;
    return d;
  }
  function rule(){
    var d = document.createElement('div');
    d.className = 'nnmn-rule';
    return d;
  }

  function buildBody(body){
    body.innerHTML = '';

    /* ── 돌아볼 것 ── */
    var d = dueInfo();
    if(d.total){
      var due = document.createElement('div');
      due.className = 'nnmn-due';
      var parts = [];
      if(d.conv) parts.push('논거 검토 ' + d.conv + '건');
      if(d.journal) parts.push('일지 복기 ' + d.journal + '건');
      due.innerHTML = '<b>돌아볼 때가 됐습니다</b><span>' + esc(parts.join(' · ')) + '</span>';
      body.appendChild(due);
    }

    /* ── 로그인 / 클라우드 ── */
    var wbtn = document.querySelector('.nav-links .wbtn');
    if(wbtn){
      var txt = (wbtn.textContent || '').trim() || 'LOGIN';
      var isCloud = txt.toUpperCase() !== 'LOGIN';
      var a = document.createElement('button');
      a.type = 'button';
      a.className = 'nnmn-auth' + (isCloud ? ' cloud' : '');
      a.innerHTML = '<span><span class="k">' + (isCloud ? 'CLOUD' : 'ACCOUNT') + '</span>'
                  + '<span class="v">' + esc(txt) + '</span></span>'
                  + '<span class="arw">›</span>';
      a.onclick = function(){
        closePanel();
        setTimeout(function(){ try{ wbtn.click(); }catch(e){} }, 60);
      };
      body.appendChild(a);
    }

    /* ── .nav-links 순회 ── */
    var links = document.getElementById('fnCtas') || document.querySelector('.nav-links');
    if(!links) return;

    var utils = [];   /* 배경화면·공유 등 부가 버튼은 맨 아래로 모은다 */

    Array.prototype.forEach.call(links.children, function(node){
      if(!visible(node)) return;

      /* 그룹(드롭다운) */
      if(node.classList && node.classList.contains('nav-group')){
        var trig = node.querySelector('.nav-trigger');
        var name = trig ? (trig.textContent||'').replace(/[▾▴▲▼]/g,'').trim() : '';
        if(name) body.appendChild(groupTitle(name));
        body.appendChild(rule());
        var subs = node.querySelectorAll('.nav-dropdown .nbtn');
        Array.prototype.forEach.call(subs, function(sb){
          if(!visible(sb)) return;
          var r = rowFor(sb, sb.classList.contains('ct-manage') ? 'sub util' : 'sub');
          if(r) body.appendChild(r);
        });
        return;
      }

      /* 낱개 버튼 */
      if(node.classList && node.classList.contains('nbtn')){
        if(node.id === 'bgSwitchBtn'){ utils.push({btn:node, label:'배경화면'}); return; }
        if(node.id === 'shareNavBtn'){ utils.push({btn:node, label:'공유'}); return; }
        var r2 = rowFor(node);
        if(r2) body.appendChild(r2);
        return;
      }

      /* 검색 버튼은 상단 바에 이미 있다 */
      if(node.id === 'cmdkBtn') return;
      /* 로그인은 위에서 따로 처리했다 */
      if(node.classList && node.classList.contains('wbtn')) return;
    });

    if(utils.length){
      body.appendChild(groupTitle('그 밖에'));
      body.appendChild(rule());
      utils.forEach(function(u){
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'nnmn-i util';
        row.innerHTML = '<span class="nnmn-mk"></span><span class="nnmn-t">' + esc(u.label) + '</span>';
        row.onclick = function(){
          closePanel();
          setTimeout(function(){ try{ u.btn.click(); }catch(e){} }, 60);
        };
        body.appendChild(row);
      });
    }
  }

  /* ══════════════════════════════════════════════════════
     패널 만들기 · 열고 닫기
     ══════════════════════════════════════════════════════ */
  function ensurePanel(){
    if(panel) return;

    scrim = document.createElement('div');
    scrim.id = 'nnMnavScrim';
    scrim.onclick = closePanel;
    document.body.appendChild(scrim);

    panel = document.createElement('div');
    panel.id = 'nnMnavPanel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');
    panel.setAttribute('aria-label','전체 메뉴');
    panel.innerHTML =
        '<div class="nnmn-head">'
      +   '<span class="nnmn-brand">NEWNORMAL</span>'
      +   '<button type="button" class="nnmn-x" aria-label="메뉴 닫기">✕</button>'
      + '</div>'
      + '<div class="nnmn-body" id="nnMnavBody"></div>'
      + '<div class="nnmn-foot">읽고, 보고, 배우고, 기록하다</div>';
    document.body.appendChild(panel);

    panel.querySelector('.nnmn-x').onclick = closePanel;

    /* 안쪽에서 좌우로 밀면 닫기 */
    var sx = null;
    panel.addEventListener('touchstart', function(e){
      sx = e.touches && e.touches[0] ? e.touches[0].clientX : null;
    }, {passive:true});
    panel.addEventListener('touchend', function(e){
      if(sx == null) return;
      var ex = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : null;
      if(ex != null && ex - sx > 70) closePanel();
      sx = null;
    }, {passive:true});
  }

  function openPanel(){
    if(!isMobile()) return;
    ensurePanel();
    buildBody(document.getElementById('nnMnavBody'));

    lastFocus = document.activeElement;
    open = true;
    document.body.style.overflow = 'hidden';

    var hb = document.getElementById('nnMnavBtn');
    if(hb){ hb.classList.add('on'); hb.setAttribute('aria-expanded','true'); hb.setAttribute('aria-label','메뉴 닫기'); }

    requestAnimationFrame(function(){
      scrim.classList.add('show');
      panel.classList.add('show');
      setTimeout(function(){
        try{ panel.querySelector('.nnmn-x').focus(); }catch(e){}
      }, 180);
    });
  }

  function closePanel(){
    if(!open) return;
    open = false;
    document.body.style.overflow = '';
    if(panel) panel.classList.remove('show');
    if(scrim) scrim.classList.remove('show');

    var hb = document.getElementById('nnMnavBtn');
    if(hb){ hb.classList.remove('on'); hb.setAttribute('aria-expanded','false'); hb.setAttribute('aria-label','메뉴 열기'); }

    try{ if(lastFocus && lastFocus.focus) lastFocus.focus(); }catch(e){}
    lastFocus = null;
    setTimeout(paintDot, 400);
  }

  /* Esc 로 닫기 · 안에서 Tab 이 빠져나가지 않게 */
  document.addEventListener('keydown', function(e){
    if(!open) return;
    if(e.key === 'Escape'){ e.preventDefault(); closePanel(); return; }
    if(e.key === 'Tab' && panel){
      var f = panel.querySelectorAll('button');
      if(!f.length) return;
      var first = f[0], last = f[f.length-1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });

  /* 데스크톱으로 넓어지면 자동으로 닫는다 */
  var rz = null;
  window.addEventListener('resize', function(){
    clearTimeout(rz);
    rz = setTimeout(function(){ if(!isMobile() && open) closePanel(); }, 150);
  });

  /* ══════════════════════════════════════════════════════
     시작
     ══════════════════════════════════════════════════════ */
  function boot(){
    injectCss();
    buildBar();
    /* 논거·일지 모듈이 늦게 뜨므로 잠시 뒤 한 번 더 확인 */
    setTimeout(paintDot, 1200);
    setTimeout(paintDot, 3200);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__nnMnav = { open:openPanel, close:closePanel, refresh:paintDot };
})();
