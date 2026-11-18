/* ══════════════════════════════════════════════════════════════════
   NEWNORMAL — 작은 글자 키우기 (nn-type.js)   2026-11 신설 · 개선제안 V-3

   왜
     화면에 보이는 글 조각의 절반 이상이 12px 미만이었다(MACRO 70% · 홈 61%).
     스타일시트에 크기 지정이 1,139곳, 그중 607곳이 12px 미만이고 가장 작은 것은 7px.

   어떻게
     nn-style.css 와 각 모듈이 넣는 <style> 의 규칙을 그 자리에서 고친다(CSSOM).
     선택자 · 규칙 순서 · 우선순위는 그대로 두고 '크기 값'만 바꾼다.
       → 덮어쓰는 규칙을 새로 얹는 방식은 쓰지 않는다. 우선순위 다툼 때문에
         일부러 크게 해 둔 곳까지 오히려 작게 만들 수 있다.
     파일 nn-style.css 자체는 한 글자도 바뀌지 않는다.

   기준 (개선제안 V-3 — 읽는 글 · 숫자는 12px 이상, 대문자 꼬리표 같은 보조 표시는 11px 이상)
     꼬리표 (대문자 · 자간이 넓음 · Orbitron/Bebas/고정폭 글꼴)   11px 미만 → 11px
     그 밖의 글                       10px 미만 → 11px · 10 ~ 10.5px → 11.5px · 11 ~ 11.5px → 12px
     건드리지 않는 것: 6px 미만(숨김용) · ::before/::after(장식 기호) · px 가 아닌 크기(em · % · clamp)

   켜고 끄기
     설정 › 화면 › '작은 글자 키우기' (기본 켜짐). 끄면 고쳤던 값을 모두 원래대로 돌린다.
     localStorage nn_type_fix_v1 = '0' 이면 꺼짐. 켜져 있으면 <html class="nn-type-fix">.
     window.__nnType = { set(bool), on(), stats() }

   로딩: <head> 에서 nn-style.css 바로 뒤 — 스타일시트가 다 읽힌 뒤, 첫 화면을 그리기 전에 돈다.
   ══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__nnType) return;

  var KEY = 'nn_type_fix_v1';
  var LABEL_FONT = /orbitron|bebas|share tech|chakra|jetbrains|monospace|consolas/i;
  var SKIP_SEL = /::?(before|after|placeholder|marker|selection)\b/i;
  var hasWS = typeof WeakSet === 'function';
  var seen = hasWS ? new WeakSet() : null;
  var changed = [];           /* [rule, 원래 값, 원래 !important] */
  var on = false;

  function wanted(){ try { return localStorage.getItem(KEY) !== '0'; } catch(e) { return true; } }

  function isLabel(st){
    if (/uppercase/i.test(st.textTransform || '')) return true;
    var m = /^(-?[\d.]+)(em|px)$/.exec(st.letterSpacing || '');
    if (m){ var v = parseFloat(m[1]); if ((m[2] === 'em' && v >= 0.08) || (m[2] === 'px' && v >= 1)) return true; }
    return LABEL_FONT.test(st.fontFamily || '');
  }
  function target(px, label){
    if (px < 6) return 0;
    if (label) return px < 11 ? 11 : 0;
    if (px < 10) return 11;
    if (px < 11) return 11.5;
    if (px < 12) return 12;
    return 0;
  }
  function fixRule(r){
    if (seen){ if (seen.has(r)) return; seen.add(r); }
    else if (r.__nnType) return; else { try { r.__nnType = 1; } catch(e) {} }
    var st = r.style; if (!st) return;
    var fs = st.fontSize; if (!fs) return;
    var m = /^([\d.]+)px$/.exec(fs); if (!m) return;
    var px = parseFloat(m[1]); if (px >= 12) return;
    if (SKIP_SEL.test(r.selectorText || '')) return;
    var t = target(px, isLabel(st)); if (!t || t <= px) return;
    var prio = st.getPropertyPriority('font-size');
    changed.push([r, fs, prio]);
    st.setProperty('font-size', t + 'px', prio);
  }
  function walk(rules){
    if (!rules) return;
    for (var i = 0; i < rules.length; i++){
      var r = rules[i];
      if (r.type === 1){ fixRule(r); if (r.cssRules && r.cssRules.length) walk(r.cssRules); }   /* 1 = 스타일 규칙 (중첩 규칙도) */
      else if (r.cssRules) walk(r.cssRules);                                                       /* @media · @supports … */
    }
  }
  function fixSheet(sh){
    var rules;
    try { rules = sh.cssRules; } catch(e) { return; }   /* 다른 도메인(글꼴) 시트는 읽을 수 없다 */
    walk(rules);
  }
  function applyAll(){
    if (!on) return;
    var S = document.styleSheets;
    for (var i = 0; i < S.length; i++) fixSheet(S[i]);
  }
  function revert(){
    for (var i = changed.length - 1; i >= 0; i--){
      var c = changed[i];
      try { c[0].style.setProperty('font-size', c[1], c[2]); } catch(e) {}
    }
    changed = [];
    seen = hasWS ? new WeakSet() : null;
  }
  function set(v){
    v = !!v;
    if (v === on){ if (v) applyAll(); return; }
    on = v;
    document.documentElement.classList.toggle('nn-type-fix', on);
    if (on) applyAll(); else revert();
  }

  /* 나중에 들어오는 <style>(모듈 CSS) — 들어오는 대로 고친다. 그리기 전에 돌아 깜빡임이 없다 */
  var pend = 0;
  function soon(){ if (pend) return; pend = setTimeout(function(){ pend = 0; applyAll(); }, 0); }
  function watch(){
    try {
      var mo = new MutationObserver(function(list){
        if (!on) return;
        for (var i = 0; i < list.length; i++){
          var mu = list[i];
          if (mu.type === 'characterData'){ var p = mu.target && mu.target.parentNode; if (p && p.nodeName === 'STYLE'){ applyAll(); return; } continue; }
          var a = mu.addedNodes || [];
          for (var j = 0; j < a.length; j++){
            var n = a[j], nn = n.nodeName;
            if (nn === 'STYLE' || (n.nodeType === 3 && mu.target && mu.target.nodeName === 'STYLE')){ applyAll(); return; }
            if (nn === 'LINK' && /stylesheet/i.test(n.rel || '')) n.addEventListener('load', soon);
          }
        }
      });
      mo.observe(document.head || document.documentElement, { childList:true, subtree:true, characterData:true });
      /* <body> 에 바로 붙는 <style> 도 있을 수 있다 — 바로 아래 자식만 본다 */
      var watchBody = function(){
        if (!document.body) return;
        new MutationObserver(function(list){
          if (!on) return;
          for (var i = 0; i < list.length; i++){
            var a = list[i].addedNodes || [];
            for (var j = 0; j < a.length; j++) if (a[j].nodeName === 'STYLE'){ soon(); return; }
          }
        }).observe(document.body, { childList:true });
      };
      if (document.body) watchBody(); else document.addEventListener('DOMContentLoaded', watchBody);
    } catch(e) {}
  }

  window.__nnType = {
    set: function(v){ try { localStorage.setItem(KEY, v ? '1' : '0'); } catch(e) {} set(v); },
    on: function(){ return on; },
    stats: function(){ return { on:on, changed:changed.length }; },
    apply: applyAll
  };

  set(wanted());
  watch();
  /* 늦게 붙는 것까지 — 모든 파일을 읽은 뒤 한 번 더 */
  window.addEventListener('load', function(){ applyAll(); setTimeout(applyAll, 2500); });
  /* 다른 창에서 켜고 끈 경우 */
  window.addEventListener('storage', function(e){ if (e && e.key === KEY) set(wanted()); });
})();
