/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 자동 백업과 내보내기 알림 (nn-backup.js)

   왜 만들었나
     클라우드 동기화를 고쳤지만, 그것으로 "절대 안 날아간다"가 되지는 않는다.
     Firestore 는 백업이 아니라 거울이다 — 이전 버전을 보관하지 않는다.
     잘못된 내용이 올라가면 그게 전부다.
     localStorage 도 브라우저 것이라 언제든 지워질 수 있다.

     그래서 방어를 세 겹으로 둔다.
       ① 올리기 직전 안전장치  → index.html 동기화 블록에 있음
                                  (내용이 절반 넘게 줄면 클라우드 사본부터 뜸)
       ② 하루 한 번 자동 스냅샷 → 이 파일. IndexedDB 에 30일치를 굴린다
       ③ 파일 내보내기 알림     → 이 파일. 30일 넘으면 조용히 한 줄

     ②는 브라우저 안이라 '사이트 데이터 삭제'에는 같이 지워진다.
     브라우저 밖으로 나가는 것은 ③ 뿐이므로, 그것만이 진짜 백업이다.
     그래서 알림을 지우기 어렵게 만들지는 않되, 사라지지도 않게 한다.

   로딩 순서: … → nn-diary.js → nn-backup.js   (맨 마지막)
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnBackup) return;

  var AUTO_KEY   = 'nn_auto_snap_v1';    /* {last:'YYYY-MM-DD', keys:[...]} */
  var EXPORT_KEY = 'nn_last_export_v1';  /* 마지막 파일 내보내기 시각(ms) */
  var HIDE_KEY   = 'nn_export_hide_v1';  /* 알림 잠시 접어두기 */
  var KEEP       = 30;                   /* 자동 스냅샷 보관 일수 */
  var REMIND_DAYS = 30;

  function today(){ return new Date().toISOString().slice(0,10); }
  function readMap(k){
    try{ var o = JSON.parse(localStorage.getItem(k) || '{}');
         return (o && typeof o === 'object') ? o : {}; }catch(e){ return {}; }
  }
  function writeMap(k, o){ try{ localStorage.setItem(k, JSON.stringify(o)); }catch(e){} }

  /* ══════════════════════════════════════════════════════
     IndexedDB — nn-core 가 열어 둔 계층을 그대로 쓴다
     ══════════════════════════════════════════════════════ */
  function store(mode){
    if(!window.__nnBigStore || !window.__nnBigStore.open) return Promise.reject(new Error('저장 계층 없음'));
    return window.__nnBigStore.open().then(function(db){
      return db.transaction('blobs', mode).objectStore('blobs');
    });
  }
  function del(key){
    return store('readwrite').then(function(os){
      return new Promise(function(res){
        var q = os.delete(key);
        q.onsuccess = function(){ res(true); };
        q.onerror = function(){ res(false); };
      });
    }).catch(function(){ return false; });
  }

  /* ══════════════════════════════════════════════════════
     ② 하루 한 번 자동 스냅샷
     ══════════════════════════════════════════════════════ */
  function collect(){
    var data = {}, n = 0;
    try{
      for(var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i);
        if(!k || k.indexOf('nn_') !== 0) continue;
        if(k === 'nn_db_pin') continue;                 /* 보호 PIN 은 담지 않는다 */
        if(k === AUTO_KEY || k === HIDE_KEY) continue;  /* 살림살이 키는 제외 */
        data[k] = localStorage.getItem(k);
        n++;
      }
    }catch(e){}
    return { data:data, count:n };
  }

  function bytesOf(data){
    var b = 0;
    Object.keys(data).forEach(function(k){ b += (data[k] || '').length; });
    return b;
  }

  /* 스냅샷 한 장 뜨기 — 키를 받는다.
     ⚠ 되돌리기 직전 스냅샷이 '오늘 자동 스냅샷'과 같은 키를 쓰면
        복구하려던 그 백업을 망가진 현재 상태로 덮어쓴다.
        그래서 용도별로 키를 분리한다. (실제로 한 번 터졌다) */
  function takeSnapshot(key, kind){
    var c = collect();
    if(c.count < 3) return Promise.resolve(false);   /* 사실상 비어 있으면 뜨지 않는다 */
    var t = today();
    return window.__nnBigStore.put(key, {
      at: new Date().toISOString(), date: t, kind: kind || 'auto',
      count: c.count, bytes: bytesOf(c.data), data: c.data
    }).then(function(){
      var st = readMap(AUTO_KEY);
      var keys = (st.keys || []).filter(function(k){ return k !== key; }).concat(key);
      var drop = keys.slice(0, Math.max(0, keys.length - KEEP));
      keys = keys.slice(-KEEP);
      writeMap(AUTO_KEY, { last:(kind === 'auto' ? t : st.last), keys:keys });
      return Promise.all(drop.map(del)).then(function(){
        console.log('[backup] 스냅샷 저장(' + key + ') — ' + c.count + '개 항목 · '
                    + Math.round(bytesOf(c.data)/1024) + 'KB · 보관 ' + keys.length + '장');
        return true;
      });
    }).catch(function(e){
      console.warn('[backup] 스냅샷 실패:', e && e.message);
      return false;
    });
  }

  /* 하루 한 번 — 날짜를 키로 (같은 날 여러 번 떠도 한 장) */
  function snapshotToday(force){
    var st = readMap(AUTO_KEY), t = today();
    if(!force && st.last === t) return Promise.resolve(false);
    return takeSnapshot('auto_' + t, 'auto');
  }

  /* 되돌리기 직전 — 별도 키. 자동 스냅샷을 건드리지 않는다 */
  function snapshotBefore(){
    return takeSnapshot('pre_' + Date.now(), 'pre');
  }

  /* ══════════════════════════════════════════════════════
     보기 · 되돌리기 (콘솔에서 사용)
     ══════════════════════════════════════════════════════ */
  function list(){
    var st = readMap(AUTO_KEY);
    var keys = (st.keys || []).slice().reverse();
    return Promise.all(keys.map(function(k){
      return window.__nnBigStore.get(k).then(function(r){
        return r ? { key:k, date:r.date, 종류:(r.kind==='pre'?'되돌리기 직전':'자동'), 항목수:r.count,
                     크기:Math.round((r.bytes||0)/1024) + 'KB', 시각:r.at } : null;
      }).catch(function(){ return null; });
    })).then(function(rows){
      rows = rows.filter(Boolean);
      try{ console.table(rows); }catch(e){ console.log(rows); }
      return rows;
    });
  }

  function restore(key){
    if(!key) { console.warn('[backup] 되돌릴 날짜를 지정하세요. 예: __nnBackupRestore("auto_2026-08-18")'); return Promise.resolve(false); }
    return window.__nnBigStore.get(key).then(function(rec){
      if(!rec || !rec.data){ console.warn('[backup] 그런 백업이 없습니다:', key); return false; }
      /* 되돌리기 전에 지금 상태부터 뜬다 — 되돌리기 자체가 사고일 수도 있다 */
      return snapshotBefore().then(function(){
        var n = 0;
        Object.keys(rec.data).forEach(function(k){
          try{ localStorage.setItem(k, rec.data[k]); n++; }catch(e){}
        });
        console.log('[backup] ' + rec.date + ' 상태로 되돌렸습니다 — ' + n + '개 항목. 새로고침하세요.');
        if(window.__nnToast) window.__nnToast('✓ ' + rec.date + ' 백업으로 되돌렸습니다 — 새로고침하세요');
        return true;
      });
    }).catch(function(e){ console.warn('[backup] 되돌리기 실패:', e); return false; });
  }

  /* ══════════════════════════════════════════════════════
     ③ 파일 내보내기 알림
     ══════════════════════════════════════════════════════ */
  function lastExport(){
    try{ var v = Number(localStorage.getItem(EXPORT_KEY) || 0); return isNaN(v) ? 0 : v; }catch(e){ return 0; }
  }
  function daysSinceExport(){
    var t = lastExport();
    if(!t) return null;                       /* 한 번도 없음 */
    return Math.floor((Date.now() - t) / 86400000);
  }
  function stampExport(){
    try{ localStorage.setItem(EXPORT_KEY, String(Date.now())); }catch(e){}
    hideBar();
    if(window.__nnToast) window.__nnToast('✓ 백업 파일을 내려받았습니다 · 바탕화면처럼 동기화되는 곳에 두세요');
  }

  /* 기존 내보내기에 시각 기록을 붙인다 (원래 동작은 그대로) */
  function hookExport(){
    try{
      var K = window.KnowledgeNotes;
      if(!K || typeof K.exportData !== 'function' || K.exportData.__nnStamped) return false;
      var orig = K.exportData;
      var wrapped = function(){
        var r = orig.apply(this, arguments);
        stampExport();
        return r;
      };
      wrapped.__nnStamped = true;
      K.exportData = wrapped;
      return true;
    }catch(e){ return false; }
  }

  function snoozed(){
    try{
      var v = Number(localStorage.getItem(HIDE_KEY) || 0);
      return v && (Date.now() - v) < 7*86400000;   /* 7일간 접어둠 */
    }catch(e){ return false; }
  }
  function hideBar(){
    var el = document.getElementById('nnExportBar');
    if(el) el.remove();
  }

  function injectCss(){
    if(document.getElementById('nnBackupCss')) return;
    var CSS = [
    '#nnExportBar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;',
    '  padding:11px 15px;margin-bottom:14px;border-radius:11px;',
    '  background:rgba(201,169,110,.09);border:1px solid rgba(201,169,110,.28);',
    '  font-family:\'Pretendard\',sans-serif}',
    '#nnExportBar .eb-t{font-size:12.5px;color:rgba(240,237,230,.82);flex:1;min-width:180px;line-height:1.6}',
    '#nnExportBar .eb-t b{color:#e0c389;font-weight:700}',
    '#nnExportBar .eb-go{font-size:11.5px;font-weight:700;color:#1a1410;flex:none;',
    '  background:linear-gradient(135deg,#e8d4a8,#c9a96e);border:0;border-radius:8px;',
    '  padding:8px 15px;cursor:pointer;transition:.15s}',
    '#nnExportBar .eb-go:hover{filter:brightness(1.08)}',
    '#nnExportBar .eb-x{font-size:11px;color:rgba(255,255,255,.35);background:transparent;',
    '  border:0;cursor:pointer;padding:6px 4px;flex:none}',
    '#nnExportBar .eb-x:hover{color:rgba(255,255,255,.7)}',
    'html.nn-bgmode-hero:not(.nn-bgscroll-dark) #nnExportBar{',
    '  background:rgba(138,106,36,.07)!important;border-color:rgba(138,106,36,.3)!important}',
    'html.nn-bgmode-hero:not(.nn-bgscroll-dark) #nnExportBar .eb-t{color:var(--lp-ink2)!important}',
    'html.nn-bgmode-hero:not(.nn-bgscroll-dark) #nnExportBar .eb-t b{color:var(--lp-brass)!important}',
    '@media (max-width:560px){ #nnExportBar{padding:10px 12px} #nnExportBar .eb-t{font-size:12px} }'
    ].join('');
    var s = document.createElement('style');
    s.id = 'nnBackupCss'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function renderBar(){
    hideBar();
    if(snoozed()) return;

    var c = collect();
    if(c.count < 5) return;                    /* 지킬 게 별로 없으면 조용히 */

    var d = daysSinceExport();
    var msg;
    if(d === null){
      msg = '아직 <b>파일 백업</b>을 한 번도 받지 않으셨습니다. '
          + '클라우드는 거울이라 이전 버전을 보관하지 않습니다.';
    } else if(d >= REMIND_DAYS){
      msg = '마지막 파일 백업이 <b>' + d + '일 전</b>입니다. 한 번 내려받아 두세요.';
    } else return;

    var desk = document.querySelector('.daily-desk');
    if(!desk) return;

    injectCss();
    var bar = document.createElement('div');
    bar.id = 'nnExportBar';
    bar.innerHTML = '<span class="eb-t">' + msg + '</span>'
      + '<button type="button" class="eb-go">백업 파일 내려받기</button>'
      + '<button type="button" class="eb-x" title="7일 뒤에 다시 알림">나중에</button>';
    desk.insertBefore(bar, desk.firstChild);

    bar.querySelector('.eb-go').onclick = function(){
      try{
        if(window.dbLock) window.dbLock('export');
        else if(window.KnowledgeNotes) window.KnowledgeNotes.exportData();
      }catch(e){}
    };
    bar.querySelector('.eb-x').onclick = function(){
      try{ localStorage.setItem(HIDE_KEY, String(Date.now())); }catch(e){}
      hideBar();
    };
  }

  /* ══════════════════════════════════════════════════════
     시작
     ══════════════════════════════════════════════════════ */
  function boot(){
    /* 앱이 자리 잡은 뒤에 — 첫 화면을 방해하지 않는다 */
    setTimeout(function(){
      hookExport();
      snapshotToday(false);
      renderBar();
    }, 4000);
    /* 지식 노트가 늦게 뜨는 경우가 있어 한 번 더 시도 */
    setTimeout(hookExport, 9000);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__nnBackup = {
    snapshot: function(){ return snapshotToday(true); },
    list: list, restore: restore,
    daysSinceExport: daysSinceExport,
    refreshBar: renderBar
  };
  window.__nnBackupList    = list;
  window.__nnBackupRestore = restore;
})();
