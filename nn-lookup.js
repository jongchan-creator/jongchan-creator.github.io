/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 사전 바로 찾기 (nn-lookup.js, 2026-11-11)

   왜 만들었나
     LEXICON 에 단어 하나를 넣으려면 ① 네이버·구글을 따로 열어 뜻을 찾고
     ② 읽고 ③ 다시 뉴노멀로 돌아와 옮겨 적어야 했다.
     이제 LEXICON 안에서 찾고, 고치고, 한 번 눌러 카드로 저장한다.

   어디서 찾나 — 검색어를 보고 알아서 고른다
     ┌ 영어(알파벳)  → 영어 사전: 한국어 뜻(MyMemory) + 발음·품사별 영영 풀이·예문(Free Dictionary)
     ├ 모든 검색어   → 한국은행 경제용어사전 (ECOS StatisticWord · 매크로 탭에 넣어 둔 인증키 사용)
     └ 모든 검색어   → 한국어 위키백과 요약 (개념·시사·경제 일반)
     못 찾았을 때를 위해 네이버 사전·지식백과·구글로 가는 바로가기도 항상 같이 띄운다.

   ⚠ 한국은행 경제용어는 프록시(worker.js v13 의 /ecosword)를 거친다.
     인증키를 공용 프록시(allorigins 등)로 흘리지 않으려고, 이 파일은
     '내 프록시 → 한국은행 직접' 두 길만 쓴다. 둘 다 안 되면 그 칸만 조용히 빠진다.

   저장
     결과마다 제목·뜻을 고칠 수 있는 칸이 있고, LEXICON 의 실제 그룹(경제·일반·영어 …)이
     버튼으로 뜬다. 출처에 맞는 그룹이 미리 골라져 있다.
     LEXICON 카드의 뜻은 '줄바꿈 없는 글'이라(nn-core _buildLexCard) 한 문단으로 다듬어 넣는다.

   로딩 순서: … → nn-tradelog.js → nn-lookup.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnLookup) return;

  var RECENT = 'nn_lookup_recent_v1';
  var seq = 0;                       /* 늦게 도착한 옛 검색 결과가 화면을 덮지 않게 */
  var results = [];                  /* 지금 화면의 결과들 */

  function KN(){ return window.KnowledgeNotes; }
  function $(id){ return document.getElementById(id); }
  function ls(k){ try{ return (localStorage.getItem(k) || '').trim(); }catch(e){ return ''; } }
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function clean(s){
    return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '‹').replace(/&gt;/g, '›').replace(/&amp;/g, '&')
      .replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function isEnglish(q){ return /^[A-Za-z][A-Za-z\s\-'.]*$/.test(q); }
  function hasHangul(s){ return /[가-힣]/.test(s); }

  /* 앞에서 n 문장만 — 카드에 넣기 좋은 길이로 */
  function brief(text, n, max){
    var t = clean(text), out = '', m, re = /[^.!?。]+[.!?。]+(?:\s|$)|[^.!?。]+$/g, i = 0;
    while((m = re.exec(t)) && i < n){ out += m[0]; i++; if(out.length >= max) break; }
    out = out.trim() || t;
    return out.length > max ? out.slice(0, max).replace(/\s+\S*$/, '') + '…' : out;
  }

  function getJSON(url, ms){
    return new Promise(function(res){
      var done = false, ctl = (typeof AbortController === 'function') ? new AbortController() : null;
      var t = setTimeout(function(){ if(done) return; done = true; try{ if(ctl) ctl.abort(); }catch(e){} res(null); }, ms || 8000);
      fetch(url, ctl ? {signal: ctl.signal} : undefined)
        .then(function(r){ return r.text(); })
        .then(function(tx){ if(done) return; done = true; clearTimeout(t); var j = null; try{ j = JSON.parse(tx); }catch(e){} res(j); })
        .catch(function(){ if(done) return; done = true; clearTimeout(t); res(null); });
    });
  }

  /* ════════ 출처 ① 한국은행 경제용어사전 ════════ */
  function srcEcos(q){
    var key = ls('nn_ecos_key');
    if(!key) return Promise.resolve({list: [], note: 'nokey'});
    var W = ls('nn_worker_url').replace(/\/+$/, '');
    var direct = 'https://ecos.bok.or.kr/api/StatisticWord/' + encodeURIComponent(key) + '/json/kr/1/10/' + encodeURIComponent(q);
    function good(j){ return j && (j.StatisticWord || j.RESULT); }
    var first = W ? getJSON(W + '/ecosword?key=' + encodeURIComponent(key) + '&q=' + encodeURIComponent(q)) : Promise.resolve(null);
    return first.then(function(j){
      return good(j) ? j : getJSON(direct);
    }).then(function(j){
      if(!good(j)) return {list: [], note: 'unreachable'};
      var rows = (j.StatisticWord && j.StatisticWord.row) || [];
      var ql = q.toLowerCase().replace(/\s+/g, '');
      var list = rows.map(function(r){
        return { word: clean(r.WORD || r.word || ''), text: clean(r.CONTENT || r.content || '') };
      }).filter(function(r){ return r.word && r.text; });
      /* 딱 맞는 말이 먼저, 그다음 짧은 말 */
      list.sort(function(a, b){
        var ax = a.word.toLowerCase().replace(/\s+/g, '') === ql ? 0 : 1;
        var bx = b.word.toLowerCase().replace(/\s+/g, '') === ql ? 0 : 1;
        return ax - bx || a.word.length - b.word.length;
      });
      return {list: list.slice(0, 3).map(function(r){
        return { src: 'ecos', badge: '한국은행 경제용어', kind: 'econ', title: r.word,
                 full: r.text, short: brief(r.text, 2, 240),
                 url: 'https://www.bok.or.kr/portal/ecEdu/ecWordDicary/search.do?menuNo=200688' };
      })};
    });
  }

  /* ════════ 출처 ② 한국어 위키백과 ════════ */
  function srcWiki(q, n){
    var u = 'https://ko.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=' + encodeURIComponent(q)
          + '&gsrlimit=' + n + '&prop=extracts%7Cinfo&inprop=url&exintro=1&explaintext=1&exsentences=4&exlimit=' + n
          + '&redirects=1&format=json&origin=*';
    return getJSON(u).then(function(j){
      var pages = j && j.query && j.query.pages;
      if(!pages) return {list: [], note: j ? '' : 'unreachable'};
      var arr = Object.keys(pages).map(function(k){ return pages[k]; })
        .sort(function(a, b){ return (a.index || 0) - (b.index || 0); });
      var list = [];
      arr.forEach(function(p){
        var t = clean(p.extract);
        if(!t || t.length < 20) return;
        if(/(다음을 가리킨다|다른 뜻은 다음과 같다|다음 뜻으로 쓰인다|동음이의)/.test(t)) return;   /* 동음이의 안내 문서 */
        list.push({ src: 'wiki', badge: '위키백과', kind: 'general', title: clean(p.title),
                    full: t, short: brief(t, 2, 240),
                    url: p.fullurl || ('https://ko.wikipedia.org/wiki/' + encodeURIComponent(p.title)) });
      });
      return {list: list};
    });
  }

  /* ════════ 출처 ③ 영어 사전 (한국어 뜻 + 영영 풀이) ════════ */
  var POS = {noun:'명', verb:'동', adjective:'형', adverb:'부', preposition:'전', conjunction:'접', pronoun:'대', interjection:'감'};
  function srcEnglish(q){
    var word = q.trim();
    var one = !/\s/.test(word);
    var pKo = getJSON('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(word) + '&langpair=en%7Cko');
    var pEn = one ? getJSON('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word.toLowerCase())) : Promise.resolve(null);
    return Promise.all([pKo, pEn]).then(function(r){
      var ko = [], seen = {};
      function add(t){
        t = clean(t).replace(/[.。]+$/, '');
        if(!t || !hasHangul(t) || t.length > 24) return;
        var k = t.replace(/\s+/g, '');
        if(seen[k]) return; seen[k] = 1; ko.push(t);
      }
      var m = r[0];
      if(m && m.responseData) add(m.responseData.translatedText);
      if(m && Array.isArray(m.matches)){
        m.matches.forEach(function(x){
          if(clean(x.segment).toLowerCase() === word.toLowerCase()) add(x.translation);
        });
      }
      ko = ko.slice(0, 4);

      var d = Array.isArray(r[1]) ? r[1][0] : null;
      var phon = '', defs = [], ex = '';
      if(d){
        phon = d.phonetic || '';
        if(!phon && Array.isArray(d.phonetics)) d.phonetics.forEach(function(p){ if(!phon && p.text) phon = p.text; });
        (d.meanings || []).slice(0, 3).forEach(function(mm){
          var p = POS[mm.partOfSpeech] || mm.partOfSpeech || '';
          (mm.definitions || []).slice(0, 2).forEach(function(x, i){
            if(i === 0 || defs.length < 4) defs.push({p: p, t: clean(x.definition)});
            if(!ex && x.example) ex = clean(x.example);
          });
        });
      }
      if(!ko.length && !defs.length) return {list: [], note: (m || r[1]) ? '' : 'unreachable'};

      var parts = [];
      if(phon) parts.push(phon);
      if(ko.length) parts.push(ko.join(', '));
      var shortParts = parts.slice();
      defs.forEach(function(x, i){
        var s = (x.p ? '[' + x.p + '] ' : '') + x.t;
        parts.push(s);
        if(i < 2) shortParts.push(s);
      });
      if(ex){ parts.push('예) ' + ex); shortParts.push('예) ' + ex); }
      return {list: [{
        src: 'en', badge: '영어 사전', kind: 'english', title: (d && d.word) || word,
        full: parts.join(' · '), short: shortParts.join(' · '),
        url: 'https://en.dict.naver.com/#/search?query=' + encodeURIComponent(word),
        ko: ko, phon: phon
      }]};
    });
  }

  /* ════════ 그룹 ════════ */
  var DEF = {econ: 'grp_lexicon_econ', general: 'grp_lexicon_general', english: 'grp_lexicon_english'};
  function groups(){
    var k = KN(), g = (k && k.groups && k.groups.lexicon) || [];
    return g.filter(function(x){ return !x.parentId; });
  }
  function defaultGroup(kind){
    var g = groups(), want = DEF[kind], i;
    for(i = 0; i < g.length; i++) if(g[i].id === want) return want;
    return g.length ? g[0].id : '';
  }
  function exists(title){
    var k = KN(), a = (k && k.data && k.data.lexicon) || [], t = String(title || '').trim().toLowerCase();
    if(!t) return false;
    for(var i = 0; i < a.length; i++) if(String(a[i].title || '').trim().toLowerCase() === t) return true;
    return false;
  }

  /* ════════ 화면 ════════ */
  function links(q){
    var e = encodeURIComponent(q), en = isEnglish(q), a = [];
    a.push(['네이버 사전', en ? 'https://en.dict.naver.com/#/search?query=' + e : 'https://dict.naver.com/dict.search?query=' + e]);
    a.push(['네이버 지식백과', 'https://terms.naver.com/search.naver?query=' + e]);
    a.push(['구글', 'https://www.google.com/search?q=' + e + (en ? '+meaning' : '+%EB%9C%BB')]);
    return '<div class="lk-links"><span>다른 곳에서 보기</span>' + a.map(function(x){
      return '<a href="' + x[1] + '" target="_blank" rel="noopener">' + x[0] + ' ↗</a>';
    }).join('') + '</div>';
  }

  function card(r, i){
    var g = groups(), gid = r.group;
    var chips = g.map(function(x){
      return '<button type="button" class="lk-g' + (x.id === gid ? ' on' : '') + '" data-i="' + i + '" data-g="' + esc(x.id) + '">' + esc(x.name || '그룹') + '</button>';
    }).join('');
    return '<div class="lk-card lk-' + r.src + '" data-i="' + i + '">'
      + '<div class="lk-ch"><span class="lk-badge">' + esc(r.badge) + '</span>'
      +   (exists(r.title) ? '<span class="lk-dup">이미 사전에 있는 말</span>' : '')
      +   (r.url ? '<a class="lk-src" href="' + esc(r.url) + '" target="_blank" rel="noopener">원문 ↗</a>' : '')
      + '</div>'
      + '<input type="text" class="lk-title" data-i="' + i + '" value="' + esc(r.title) + '" aria-label="단어">'
      + '<textarea class="lk-def" data-i="' + i + '" rows="3" aria-label="뜻">' + esc(r.short) + '</textarea>'
      + '<div class="lk-cf">'
      +   (r.full && r.full !== r.short ? '<button type="button" class="lk-more" data-i="' + i + '" data-on="0">전문 넣기</button>' : '')
      +   '<span class="lk-gs">' + chips + '</span>'
      +   '<button type="button" class="lk-save" data-i="' + i + '">＋ 사전에 저장</button>'
      + '</div></div>';
  }

  function paint(q, state, notes){
    var out = $('lkOut'); if(!out) return;
    if(state === 'busy'){ out.innerHTML = '<div class="lk-msg">“' + esc(q) + '” 찾는 중…</div>'; return; }
    var h = '';
    if(results.length){
      h += results.map(card).join('');
    } else {
      h += '<div class="lk-msg">“' + esc(q) + '” — 연결된 사전에서는 찾지 못했습니다. 아래 바로가기로 확인해 보세요.</div>';
    }
    var hint = [];
    if(notes.ecos === 'nokey') hint.push('매크로 탭에 <b>한국은행 ECOS 인증키</b>를 넣으면 경제용어사전도 함께 찾습니다.');
    if(notes.ecos === 'unreachable') hint.push('한국은행 경제용어사전에는 닿지 못했습니다 — 프록시를 <b>worker.js v13</b> 으로 올리면 켜집니다.');
    if(hint.length) h += '<div class="lk-hint">' + hint.join('<br>') + '</div>';
    out.innerHTML = h + links(q);
  }

  function search(q){
    q = String(q || '').replace(/\s+/g, ' ').trim();
    if(!q) return;
    var my = ++seq, en = isEnglish(q);
    var inp = $('lkQ'); if(inp && inp.value !== q) inp.value = q;
    remember(q); paintRecent();
    results = []; paint(q, 'busy', {});
    var jobs = [ srcEcos(q), srcWiki(q, en ? 2 : 3), en ? srcEnglish(q) : Promise.resolve({list: []}) ];
    Promise.all(jobs.map(function(p){ return p.catch(function(){ return {list: [], note: 'unreachable'}; }); })).then(function(r){
      if(my !== seq) return;
      /* 영어 단어는 영어 사전이 맨 위, 그 밖에는 경제용어 → 위키백과 */
      var order = en ? [r[2], r[0], r[1]] : [r[0], r[1]];
      results = [];
      order.forEach(function(x){ (x.list || []).forEach(function(it){ it.group = defaultGroup(it.kind); results.push(it); }); });
      paint(q, '', {ecos: r[0].note});
    });
  }

  /* ════════ 저장 ════════ */
  function save(i){
    var r = results[i], k = KN(), box = $('lkOut');
    if(!r || !k || !box) return;
    var cardEl = box.querySelector('.lk-card[data-i="' + i + '"]');
    var title = clean(cardEl.querySelector('.lk-title').value);
    var def = clean(cardEl.querySelector('.lk-def').value);
    if(!title){ toast('단어 칸이 비어 있습니다'); return; }
    if(!k.data.lexicon) k.data.lexicon = [];
    var note = {
      id: 'note_' + Date.now() + Math.floor(Math.random() * 900 + 100),
      title: title, content: def,
      date: (typeof k._nowStr === 'function') ? k._nowStr() : '',
      groupId: r.group || null, icon: '📇'
    };
    k.data.lexicon.unshift(note);
    try{ k.save(); k.renderSidebar('lexicon'); }catch(e){}
    var gname = '';
    groups().forEach(function(g){ if(g.id === r.group) gname = g.name || ''; });
    toast('📇 “' + title + '” 저장' + (gname ? ' → ' + gname : ''));
    var btn = cardEl.querySelector('.lk-save');
    if(btn){ btn.textContent = '✓ 저장됨'; btn.classList.add('done'); btn.disabled = true; }
    setTimeout(function(){
      var el = document.getElementById('item-' + note.id);
      if(el){ el.classList.add('lk-flash'); setTimeout(function(){ el.classList.remove('lk-flash'); }, 2200); }
    }, 120);
  }
  function toast(m){ if(window.__nnToast) try{ window.__nnToast(m); }catch(e){} }

  /* ════════ 최근 찾은 말 ════════ */
  function recent(){ try{ var a = JSON.parse(localStorage.getItem(RECENT) || '[]'); return Array.isArray(a) ? a : []; }catch(e){ return []; } }
  function remember(q){
    var a = recent().filter(function(x){ return x !== q; });
    a.unshift(q);
    try{ localStorage.setItem(RECENT, JSON.stringify(a.slice(0, 8))); }catch(e){}
  }
  function paintRecent(){
    var el = $('lkRecent'); if(!el) return;
    var a = recent();
    el.innerHTML = a.length ? '<span>최근</span>' + a.map(function(x){
      return '<button type="button" class="lk-r" data-q="' + esc(x) + '">' + esc(x) + '</button>';
    }).join('') : '';
  }

  /* ════════ 틀 만들기 ════════ */
  function mount(){
    if($('lkPanel')) return true;
    var page = $('page-lexicon'), quiz = $('lexQuizHost');
    if(!page || !quiz || !quiz.parentNode) return false;
    var p = document.createElement('div');
    p.className = 'lk-panel'; p.id = 'lkPanel';
    p.innerHTML =
        '<div class="lk-top"><span class="lk-eyebrow">LOOK UP</span>'
      +   '<span class="lk-sub">경제 용어 · 일반 개념 · 영어 단어 — 여기서 찾고, 고쳐서, 바로 카드로 저장합니다</span></div>'
      + '<form class="lk-form" id="lkForm" autocomplete="off">'
      +   '<svg class="lk-ico" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13 13l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      +   '<input type="text" id="lkQ" class="lk-q" placeholder="예) 양적완화 · 기회비용 · duration" aria-label="찾을 말">'
      +   '<button type="submit" class="lk-go">찾기</button>'
      + '</form>'
      + '<div class="lk-recent" id="lkRecent"></div>'
      + '<div class="lk-out" id="lkOut"></div>';
    quiz.parentNode.insertBefore(p, quiz);

    $('lkForm').addEventListener('submit', function(e){ e.preventDefault(); search($('lkQ').value); });
    p.addEventListener('click', function(e){
      var t = e.target;
      if(!t || !t.classList) return;
      if(t.classList.contains('lk-r')){ search(t.getAttribute('data-q')); return; }
      var i = +t.getAttribute('data-i');
      if(t.classList.contains('lk-save')){ save(i); return; }
      if(t.classList.contains('lk-g')){
        if(results[i]) results[i].group = t.getAttribute('data-g');
        var sib = t.parentNode.querySelectorAll('.lk-g');
        for(var s = 0; s < sib.length; s++) sib[s].classList.toggle('on', sib[s] === t);
        return;
      }
      if(t.classList.contains('lk-more') && results[i]){
        var on = t.getAttribute('data-on') === '1';
        var ta = t.parentNode.parentNode.querySelector('.lk-def');
        ta.value = on ? results[i].short : results[i].full;
        ta.rows = on ? 3 : 7;
        t.setAttribute('data-on', on ? '0' : '1');
        t.textContent = on ? '전문 넣기' : '줄여서 넣기';
      }
    });
    paintRecent();
    return true;
  }

  (function wait(n){
    if(mount()) return;
    if(n > 60) return;
    setTimeout(function(){ wait(n + 1); }, 200);
  })(0);

  window.__nnLookup = { search: search };
})();

/* ── 스타일 — 파일이 직접 주입 (nn-style.css 순서 불변) ── */
(function(){
  'use strict';
  if(document.getElementById('nnLookupCss')) return;
  var CSS = [
  '.lk-panel{margin:44px 0 6px;padding:18px 20px 18px;border-radius:16px;font-family:\'Pretendard\',sans-serif;',
  '  background:linear-gradient(180deg,rgba(26,27,31,.88),rgba(12,12,15,.9));',
  '  border:1px solid rgba(174,177,180,.34);',
  '  box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 18px 40px -26px rgba(0,0,0,.9)}',
  '.lk-top{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:12px}',
  '.lk-eyebrow{font-family:\'Bebas Neue\',sans-serif;font-size:15px;letter-spacing:.26em;color:#e2e5e8;',
  '  text-shadow:0 0 12px rgba(174,177,180,.6)}',
  '.lk-sub{font-size:12px;color:rgba(255,255,255,.55)}',
  '.lk-form{display:flex;align-items:center;gap:10px;padding:5px 6px 5px 14px;border-radius:12px;',
  '  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);transition:.15s}',
  '.lk-form:focus-within{border-color:rgba(226,229,232,.75);box-shadow:0 0 0 3px rgba(174,177,180,.16)}',
  '.lk-ico{color:rgba(255,255,255,.55);flex-shrink:0}',
  '.lk-q{flex:1;min-width:0;background:transparent;border:none;outline:none;color:#fff;',
  '  font-family:inherit;font-size:15px;padding:9px 0}',
  '.lk-q::placeholder{color:rgba(255,255,255,.34)}',
  '.lk-go{cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;padding:9px 18px;border-radius:9px;',
  '  border:1px solid rgba(226,229,232,.6);background:rgba(226,229,232,.14);color:#f2f3f5;transition:.15s}',
  '.lk-go:hover{background:rgba(226,229,232,.28);color:#fff}',
  '.lk-recent{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px;min-height:0}',
  '.lk-recent span{font-size:11px;color:rgba(255,255,255,.38);margin-right:2px}',
  '.lk-r{cursor:pointer;font-family:inherit;font-size:11.5px;padding:4px 10px;border-radius:999px;',
  '  border:1px solid rgba(255,255,255,.14);background:transparent;color:rgba(255,255,255,.66);transition:.15s}',
  '.lk-r:hover{border-color:rgba(226,229,232,.6);color:#fff}',
  '.lk-out{margin-top:4px}',
  '.lk-msg{margin-top:12px;font-size:13px;color:rgba(255,255,255,.7);line-height:1.6}',
  '.lk-hint{margin-top:10px;font-size:11.5px;line-height:1.6;color:rgba(255,255,255,.5)}',
  '.lk-hint b{color:rgba(255,255,255,.8)}',

  '.lk-card{margin-top:12px;padding:13px 14px 12px;border-radius:12px;',
  '  background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.1);border-left:3px solid #aeb1b4}',
  '.lk-card.lk-ecos{border-left-color:#7fd58c}',
  '.lk-card.lk-en{border-left-color:#7fbef5}',
  '.lk-ch{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
  '.lk-badge{font-size:10.5px;font-weight:800;letter-spacing:.04em;padding:3px 8px;border-radius:6px;',
  '  background:rgba(174,177,180,.18);color:#e2e5e8}',
  '.lk-ecos .lk-badge{background:rgba(127,213,140,.16);color:#9fe3aa}',
  '.lk-en .lk-badge{background:rgba(127,190,245,.16);color:#a9d4f8}',
  '.lk-dup{font-size:10.5px;font-weight:700;color:#ffcf8a}',
  '.lk-src{margin-left:auto;font-size:11px;color:rgba(255,255,255,.5);text-decoration:none}',
  '.lk-src:hover{color:#fff}',
  '.lk-title{display:block;width:100%;box-sizing:border-box;margin-top:8px;background:transparent;border:none;',
  '  border-bottom:1px dashed rgba(255,255,255,.16);outline:none;color:#fff;font-family:inherit;',
  '  font-size:18px;font-weight:700;letter-spacing:-.01em;padding:3px 0 5px}',
  '.lk-title:focus{border-bottom-color:rgba(226,229,232,.7)}',
  '.lk-def{display:block;width:100%;box-sizing:border-box;margin-top:8px;resize:vertical;',
  '  background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.1);border-radius:8px;outline:none;',
  '  color:rgba(255,255,255,.9);font-family:inherit;font-size:13.5px;line-height:1.65;padding:9px 11px}',
  '.lk-def:focus{border-color:rgba(226,229,232,.55)}',
  '.lk-cf{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px}',
  '.lk-more{cursor:pointer;font-family:inherit;font-size:11.5px;color:rgba(255,255,255,.6);',
  '  background:none;border:none;text-decoration:underline;padding:0}',
  '.lk-more:hover{color:#fff}',
  '.lk-gs{margin-left:auto;display:flex;gap:5px;flex-wrap:wrap}',
  '.lk-g{cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:999px;',
  '  border:1px solid rgba(255,255,255,.16);background:transparent;color:rgba(255,255,255,.6);transition:.15s}',
  '.lk-g:hover{color:#fff;border-color:rgba(255,255,255,.4)}',
  '.lk-g.on{color:#101114;background:#e2e5e8;border-color:#e2e5e8}',
  '.lk-save{cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:800;padding:7px 15px;border-radius:9px;',
  '  border:1px solid #e2e5e8;background:#e2e5e8;color:#101114;transition:.15s;white-space:nowrap}',
  '.lk-save:hover{background:#fff;box-shadow:0 0 18px -4px #e2e5e8}',
  '.lk-save.done{background:transparent;color:#9fe3aa;border-color:rgba(127,213,140,.6);cursor:default;box-shadow:none}',
  '.lk-links{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:12px;',
  '  border-top:1px solid rgba(255,255,255,.08)}',
  '.lk-links span{font-size:11px;color:rgba(255,255,255,.4)}',
  '.lk-links a{font-size:12px;font-weight:600;color:rgba(255,255,255,.75);text-decoration:none;',
  '  padding:5px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.16);transition:.15s}',
  '.lk-links a:hover{color:#fff;border-color:rgba(226,229,232,.6)}',
  /* 방금 저장한 카드를 잠깐 밝혀 준다 */
  '.lex-card.lk-flash{box-shadow:0 0 0 2px #7fd58c,0 0 22px -4px #7fd58c!important;transition:box-shadow .3s}',
  '@media (max-width:760px){',
  '  .lk-panel{padding:14px 13px}',
  '  .lk-gs{margin-left:0;width:100%}',
  '  .lk-save{width:100%}',
  '}'
  ].join('');
  var s = document.createElement('style');
  s.id = 'nnLookupCss'; s.textContent = CSS;
  document.head.appendChild(s);
})();
