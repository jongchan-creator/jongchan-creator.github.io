/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — 사전 바로 찾기 (nn-lookup.js, 2026-11-11)

   왜 만들었나
     LEXICON 에 단어 하나를 넣으려면 ① 네이버·구글을 따로 열어 뜻을 찾고
     ② 읽고 ③ 다시 뉴노멀로 돌아와 옮겨 적어야 했다.
     이제 LEXICON 안에서 찾고, 고치고, 한 번 눌러 카드로 저장한다.

   어디서 찾나 — 검색어를 보고 알아서 고른다
     ┌ 영어(알파벳)  → 영어 사전: 한국어 뜻(MyMemory) + 발음·품사별 영영 풀이·예문(Free Dictionary)
     ├ 모든 검색어   → 한국은행 경제용어사전 (ECOS StatisticWord · 매크로 탭에 넣어 둔 인증키 사용)
     ├ 한글 검색어   → 표준국어대사전 (국립국어원 Open API · 무료 인증키 nn_stdict_key) — 낱말 뜻
     └ 모든 검색어   → 한국어 위키백과 요약 (개념·시사·경제 일반)
     못 찾았을 때를 위해 네이버 사전·지식백과·구글로 가는 바로가기도 항상 같이 띄운다.

   ⚠ 한국은행 경제용어·표준국어대사전은 프록시(worker.js v14 의 /ecosword · /stdict)를 거친다.
     (두 곳 모두 브라우저에서 직접 부르는 것을 허용하지 않는다)
     인증키를 공용 프록시(allorigins 등)로 흘리지 않으려고, 이 파일은
     '내 프록시 → 한국은행 직접' 두 길만 쓴다. 둘 다 안 되면 그 칸만 조용히 빠진다.

   저장
     결과마다 제목·뜻을 고칠 수 있는 칸이 있고, LEXICON 의 실제 그룹(경제·일반·영어 …)이
     버튼으로 뜬다. 출처에 맞는 그룹이 미리 골라져 있다.
     LEXICON 카드의 뜻은 '줄바꿈 없는 글'이라(nn-core _buildLexCard) 한 문단으로 다듬어 넣는다.
     2026-11-26 — '담을 내용 고르기': 뜻을 조각(문장 · 뜻 번호 · 한글 뜻)으로 나눠 누르면 넣고 빼고,
     아래 칸에 만들어지는 글을 바로 고쳐 쓴 뒤 한 번에 저장한다(단어장에서 다시 고칠 필요 없게).
     저장한 뒤에 다시 고르거나 고치면 새 카드를 만들지 않고 '저장한 카드에 반영'.

   로딩 순서: … → nn-tradelog.js → nn-lookup.js → nn-notes.js
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if(window.__nnLookup) return;

  var RECENT = 'nn_lookup_recent_v1';
  var seq = 0;                       /* 늦게 도착한 옛 검색 결과가 화면을 덮지 않게 */
  var results = [];                  /* 지금 화면의 결과들 */
  var lastQ = '';

  function KN(){ return window.KnowledgeNotes; }
  function $(id){ return document.getElementById(id); }
  function ls(k){ try{ return (localStorage.getItem(k) || '').trim(); }catch(e){ return ''; } }
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function clean(s){
    /* 2026-11-26: 표준국어대사전은 책 이름 · 편 이름을 <월세가(越世家)> 처럼 꺾쇠로 감싸 보낸다.
       예전에는 이것을 HTML 태그로 알고 지워서 '≪사기≫의 와 ≪십팔사략≫' 처럼 말이 빠졌다.
       한글 · 한자로 시작하는 꺾쇠는 태그가 아니므로 〈 〉 로 바꿔 남긴다(태그는 영문자나 / 로 시작한다). */
    return String(s || '').replace(/<([가-힣㐀-鿿][^<>]*)>/g, '〈$1〉').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
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

  /* ════════ 담을 내용 고르기 (2026-11-26) ════════
     회장님: "찾아서 나온 설명 중에 넣고 싶은 것과 넣고 싶지 않은 것이 있는데, 지금은 일단 단어장에 넣고
             단어장에서 다시 고쳐 저장해야 해서 불편하다."
     → 결과마다 뜻을 '조각'(문장 · 뜻 번호 · 한글 뜻 하나하나)으로 나눠 보여 주고, 누르면 넣고 뺀다.
       아래 칸에는 고른 조각으로 만든 글이 바로 보이고, 거기서 고쳐 써도 된다. 저장은 한 번.
     조각: 표준국어대사전 — 뜻(①②…)마다 문장으로 · 영어 사전 — 한글 뜻 하나하나 + 발음 · 영영 풀이 · 예문
           위키백과 · 한국은행 경제용어 — 문장으로
     처음 골라 두는 것(예전 '짧게'와 같은 자리): 국어사전은 앞의 두 뜻의 첫 문장(와신상담의 긴 유래 이야기는 빠진다),
           영어는 한글 뜻 전부, 위키 · 경제용어는 앞의 두 문장. */
  var NUM = ['①','②','③','④','⑤','⑥','⑦','⑧'];
  /* 문장으로 나누기 — 마침표 · 물음표 뒤에 빈칸(또는 끝)이 올 때만 자른다(3.5% 같은 숫자는 그대로). 아주 짧은 토막은 앞 문장에 붙인다 */
  function sents(text, max){
    var t = clean(text), out = [], re = /[\s\S]*?[.!?。](?=\s|$)/g, m, last = 0;
    function put(s){ s = s.trim(); if(!s) return; if(out.length && s.length < 6) out[out.length - 1] += ' ' + s; else out.push(s); }
    while((m = re.exec(t))){ put(m[0]); last = re.lastIndex; }
    put(t.slice(last));
    if(max && out.length > max) out = out.slice(0, max);
    return out;
  }
  /* 고른 조각으로 글 만들기 */
  function compose(r, sel){
    sel = sel || r.sel || [];
    var pcs = r.pcs || [];
    if(r.src === 'std'){
      var by = {}, order = [];
      pcs.forEach(function(pc, i){ if(!sel[i]) return; if(!by[pc.s]){ by[pc.s] = []; order.push(pc.s); } by[pc.s].push(pc.t); });
      var ss = order.map(function(s){ var pos = (r.spos || [])[s]; return (pos ? '[' + pos + '] ' : '') + by[s].join(' '); });
      return ss.length === 1 ? ss[0] : ss.map(function(x, k){ return (NUM[k] || (k + 1) + '.') + ' ' + x; }).join(' ');
    }
    if(r.src === 'en'){
      var ko = [], rest = [];
      pcs.forEach(function(pc, i){
        if(!sel[i]) return;
        if(pc.k === 'ko') ko.push(pc.t);
        else if(pc.k === 'def') rest.push((pc.pos ? '[' + pc.pos + '] ' : '') + pc.t);
        else if(pc.k === 'ex') rest.push('예) ' + pc.t);
        else rest.push(pc.t);
      });
      return (ko.length ? [ko.join(', ')] : []).concat(rest).join(' · ');
    }
    return pcs.filter(function(pc, i){ return sel[i]; }).map(function(pc){ return pc.t; }).join(' ');
  }
  /* 결과 하나에 처음 고를 것 · 짧은 글을 정해 둔다 (sel0 은 '처음대로' 단추가 되돌아갈 자리) */
  function prep(r, sel0){
    r.sel0 = sel0; r.sel = sel0.slice();
    if(r.pcs && r.pcs.length && !sel0.some(Boolean)) r.sel0[0] = r.sel[0] = true;
    r.short = compose(r) || r.short || '';
    return r;
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
        var it = { src: 'ecos', badge: '한국은행 경제용어', kind: 'econ', title: r.word,
                   full: r.text, short: brief(r.text, 2, 240),
                   url: 'https://www.bok.or.kr/portal/ecEdu/ecWordDicary/search.do?menuNo=200688' };
        it.pcs = sents(r.text, 10).map(function(s){ return {t: s}; });
        return prep(it, it.pcs.map(function(pc, j){ return j < 2; }));
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
        var it = { src: 'wiki', badge: '위키백과', kind: 'general', title: clean(p.title),
                   full: t, short: brief(t, 2, 240),
                   url: p.fullurl || ('https://ko.wikipedia.org/wiki/' + encodeURIComponent(p.title)) };
        it.pcs = sents(t, 8).map(function(s){ return {t: s}; });
        list.push(prep(it, it.pcs.map(function(pc, j){ return j < 2; })));
      });
      return {list: list};
    });
  }

  /* ════════ 출처 ②-2 표준국어대사전 (국립국어원) ════════
     search.do 응답: {channel:{total,item:[{word,sup_no,pos,sense:{definition,link,type}}]}}
     word 에는 형태소 경계 '-' 와 띄어쓰기 표시 '^' 가 섞여 온다(천착-하다) → 지우고 보여 준다.
     같은 말이 어깨번호(sup_no)만 달리 여러 번 오므로 한 카드에 ①②③ 으로 모은다. */
  function srcStd(q){
    var key = ls('nn_stdict_key');
    if(!key) return Promise.resolve({list: [], note: 'nokey'});
    var W = ls('nn_worker_url').replace(/\/+$/, '');
    var direct = 'https://stdict.korean.go.kr/api/search.do?key=' + encodeURIComponent(key) + '&q=' + encodeURIComponent(q) + '&req_type=json&num=10';
    function good(j){ return j && (j.channel || j.error); }
    var first = W ? getJSON(W + '/stdict?key=' + encodeURIComponent(key) + '&q=' + encodeURIComponent(q)) : Promise.resolve(null);
    return first.then(function(j){
      return good(j) ? j : getJSON(direct);
    }).then(function(j){
      if(!good(j)) return {list: [], note: 'unreachable'};
      if(j.error) return {list: [], note: 'badkey'};
      var items = (j.channel && j.channel.item) || [];
      if(!Array.isArray(items)) items = [items];
      var byWord = {}, order = [];
      items.forEach(function(it){
        var w = clean(it.word).replace(/[\-\^]/g, '');
        var senses = Array.isArray(it.sense) ? it.sense : (it.sense ? [it.sense] : []);
        senses.forEach(function(sn){
          var d = clean(sn.definition);
          if(!w || !d) return;
          if(!byWord[w]){ byWord[w] = {defs: [], senses: [], link: sn.link || ''}; order.push(w); }
          var pos = it.pos && it.pos !== '품사 없음' ? clean(it.pos) : '';
          byWord[w].defs.push((pos ? '[' + pos + '] ' : '') + d);
          byWord[w].senses.push({pos: pos, text: d});
        });
      });
      /* 찾은 말과 똑같은 표제어를 먼저 */
      var ql = q.replace(/\s+/g, '');
      order.sort(function(a, b){ return (a === ql ? 0 : 1) - (b === ql ? 0 : 1); });
      return {list: order.slice(0, 2).map(function(w){
        var d = byWord[w].defs;
        function join(n){ return d.length === 1 ? d[0] : d.slice(0, n).map(function(x, i){ return NUM[i] + ' ' + x; }).join(' '); }
        var it = { src: 'std', badge: '표준국어대사전', kind: 'general', title: w,
                   full: join(6), short: join(2),
                   url: 'https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=' + encodeURIComponent(w) };
        /* 조각: 뜻(최대 6개)마다 문장으로. s = 몇 번째 뜻, lead = 그 뜻의 첫 문장 */
        var ss = byWord[w].senses.slice(0, 6);
        it.spos = ss.map(function(x){ return x.pos; });
        it.pcs = [];
        ss.forEach(function(x, si){ sents(x.text).forEach(function(s, j){ it.pcs.push({t: s, s: si, lead: j === 0}); }); });
        return prep(it, it.pcs.map(function(pc){ return pc.lead && pc.s < 2; }));
      })};
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

      /* 기본은 **한글 뜻만** (2026-11-11) — 발음·영영 풀이·예문까지 한 줄에 이어 붙이니 읽기 어려웠다.
         그것들은 '영영 풀이도 넣기'를 눌렀을 때만 들어간다. 한글 뜻을 못 받았으면 영영 풀이 첫 줄로 대신한다. */
      var parts = [];
      if(ko.length) parts.push(ko.join(', '));
      if(phon) parts.push(phon);
      defs.forEach(function(x){ parts.push((x.p ? '[' + x.p + '] ' : '') + x.t); });
      if(ex) parts.push('예) ' + ex);
      var simple = ko.length ? ko.join(', ') : (defs.length ? (defs[0].p ? '[' + defs[0].p + '] ' : '') + defs[0].t : '');
      var it = {
        src: 'en', badge: '영어 사전', kind: 'english', title: (d && d.word) || word,
        full: parts.join(' · '), short: simple, rows: 2,
        url: 'https://en.dict.naver.com/#/search?query=' + encodeURIComponent(word),
        ko: ko, phon: phon
      };
      /* 조각: 한글 뜻 하나하나 · 발음 · 영영 풀이 · 예문 — 처음에는 한글 뜻만(없으면 첫 풀이) */
      it.pcs = [];
      ko.forEach(function(t){ it.pcs.push({t: t, k: 'ko'}); });
      if(phon) it.pcs.push({t: phon, k: 'phon'});
      defs.forEach(function(x){ it.pcs.push({t: x.t, k: 'def', pos: x.p}); });
      if(ex) it.pcs.push({t: ex, k: 'ex'});
      return {list: [prep(it, it.pcs.map(function(pc, j){ return ko.length ? pc.k === 'ko' : (pc.k === 'def' && j === (phon ? 1 : 0)); }))]};
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
    var picking = !!(r.pcs && r.pcs.length > 1);
    if(!r.sel) r.sel = [];
    r.made = compose(r) || r.short || '';   /* 지금 칸에 들어간 글 — 손으로 고쳤는지 알아보는 기준 */
    return '<div class="lk-card lk-' + r.src + '" data-i="' + i + '">'
      + '<div class="lk-ch"><span class="lk-badge">' + esc(r.badge) + '</span>'
      +   (exists(r.title) ? '<span class="lk-dup">이미 사전에 있는 말</span>' : '')
      +   (r.url ? '<a class="lk-src" href="' + esc(r.url) + '" target="_blank" rel="noopener">원문 ↗</a>' : '')
      + '</div>'
      + '<input type="text" class="lk-title" data-i="' + i + '" value="' + esc(r.title) + '" aria-label="단어">'
      + (picking ? pickHTML(r, i) : '')
      + (picking ? '<div class="lk-dl"><span>단어장에 들어갈 글</span><i>여기서 고쳐 써도 돼요</i>'
                   + '<button type="button" class="lk-undo" data-i="' + i + '" hidden>↶ 고친 글 되살리기</button></div>' : '')
      + '<textarea class="lk-def" data-i="' + i + '" rows="' + (r.rows || 3) + '" aria-label="단어장에 들어갈 뜻">' + esc(r.made) + '</textarea>'
      + '<div class="lk-cf">'
      +   '<span class="lk-gs">' + chips + '</span>'
      +   '<button type="button" class="lk-save" data-i="' + i + '">＋ 사전에 저장</button>'
      + '</div></div>';
  }

  /* 담을 내용 고르기 — 조각 단추들 */
  function pickHTML(r, i){
    var many = r.src === 'std' && (r.spos || []).length > 1;
    var chips = '', rows = '';
    r.pcs.forEach(function(pc, p){
      var on = !!r.sel[p];
      var cls = 'lk-pc' + (on ? ' on' : '') + (r.src === 'en' && pc.k === 'ko' ? ' chip' : '') + (r.src === 'std' && !pc.lead ? ' sub' : '');
      var pre = '';
      if(r.src === 'std' && pc.lead){
        if(many) pre += '<b class="lk-pc-n">' + (NUM[pc.s] || (pc.s + 1) + '.') + '</b>';
        if((r.spos || [])[pc.s]) pre += '<em class="lk-pc-tag">' + esc(r.spos[pc.s]) + '</em>';
      } else if(r.src === 'en' && pc.k !== 'ko'){
        pre = '<em class="lk-pc-tag">' + (pc.k === 'phon' ? '발음' : pc.k === 'ex' ? '예문' : esc(pc.pos || '풀이')) + '</em>';
      }
      var b = '<button type="button" class="' + cls + '" data-i="' + i + '" data-p="' + p + '" aria-pressed="' + on + '">'
        + '<span class="lk-pc-i" aria-hidden="true"></span><span class="lk-pc-t">' + pre + esc(pc.t) + '</span></button>';
      if(r.src === 'en' && pc.k === 'ko') chips += b; else rows += b;
    });
    return '<div class="lk-pick" data-i="' + i + '">'
      + '<div class="lk-pk-h"><span class="lk-pk-l">담을 내용 고르기<i>누르면 넣고 빠져요</i></span>'
      +   '<span class="lk-pk-n">' + pickCount(r) + '</span>'
      +   '<span class="lk-pk-as"><button type="button" class="lk-pk-a" data-i="' + i + '" data-a="all">모두</button>'
      +   '<button type="button" class="lk-pk-a" data-i="' + i + '" data-a="base">처음대로</button></span></div>'
      + (chips ? '<div class="lk-pcs lk-pcs-ko"><span class="lk-pk-sec">한글 뜻</span>' + chips + '</div>' : '')
      + (rows ? '<div class="lk-pcs">' + rows + '</div>' : '')
      + '</div>';
  }
  function pickCount(r){ var n = 0; (r.sel || []).forEach(function(v){ if(v) n++; }); return '<b>' + n + '</b> / ' + r.pcs.length + ' 골랐어요'; }
  function autosize(ta){
    if(!ta || !ta.isConnected) return;
    ta.style.height = '0px';                       /* 'auto' 로 재면 rows(3줄) 높이가 바닥이 된다 — 0 으로 두고 글 높이만 잰다 */
    ta.style.height = Math.max(ta.scrollHeight + 2, 44) + 'px';
  }
  /* 조각을 바꾼 뒤 — 단추 모양 · 개수 · 아래 글을 새로. 손으로 고친 글을 덮어쓰게 되면 한 번 되살릴 수 있게 남긴다 */
  function refreshPick(i){
    var r = results[i], box = $('lkOut'); if(!r || !box) return;
    var el = box.querySelector('.lk-card[data-i="' + i + '"]'); if(!el) return;
    el.querySelectorAll('.lk-pc').forEach(function(b){
      var on = !!r.sel[+b.getAttribute('data-p')];
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var n = el.querySelector('.lk-pk-n'); if(n) n.innerHTML = pickCount(r);
    var ta = el.querySelector('.lk-def'), undo = el.querySelector('.lk-undo');
    var next = compose(r);
    if(ta.value !== r.made && ta.value.trim()){ r.kept = ta.value; if(undo) undo.hidden = false; }
    else if(undo) undo.hidden = true;
    ta.value = next; r.made = next; autosize(ta);
    reopenSave(el, r);
  }
  /* 저장한 뒤에 고르기 · 글을 바꾸면 — 새 카드를 또 만들지 않고 방금 저장한 카드에 반영한다 */
  function reopenSave(el, r){
    var sv = el && el.querySelector('.lk-save');
    if(!sv || !r || !r.savedId || !sv.classList.contains('done')) return;
    sv.textContent = '↻ 저장한 카드에 반영'; sv.classList.remove('done'); sv.classList.add('again'); sv.disabled = false;
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
    if(notes.ecos === 'unreachable') hint.push('한국은행 경제용어사전에는 닿지 못했습니다 — 프록시를 <b>최신 worker.js</b> 로 올리면 켜집니다.');
    if(notes.std === 'nokey') hint.push('한국어 낱말 뜻은 <b>표준국어대사전 인증키</b>(무료)를 넣으면 나옵니다 — 아래 <b>⚙ 사전 연결 · 사용 안내</b>를 열어 보세요.');
    if(notes.std === 'unreachable') hint.push('표준국어대사전에는 닿지 못했습니다 — 프록시를 <b>최신 worker.js</b> 로 올리면 켜집니다.');
    if(notes.std === 'badkey') hint.push('표준국어대사전이 <b>인증키를 받아 주지 않았습니다</b> — 아래 설정에서 키를 다시 확인해 주세요.');
    if(hint.length) h += '<div class="lk-hint">' + hint.join('<br>') + '</div>';
    out.innerHTML = h + links(q);
    out.querySelectorAll('.lk-def').forEach(autosize);
  }

  function search(q){
    q = String(q || '').replace(/\s+/g, ' ').trim();
    if(!q) return;
    var my = ++seq, en = isEnglish(q);
    var inp = $('lkQ'); if(inp && inp.value !== q) inp.value = q;
    syncX(); fold(false);
    remember(q); paintRecent();
    results = []; paint(q, 'busy', {});
    var jobs = [ srcEcos(q), srcWiki(q, en ? 2 : 3), en ? srcEnglish(q) : Promise.resolve({list: []}),
                 (!en && hasHangul(q)) ? srcStd(q) : Promise.resolve({list: []}) ];
    Promise.all(jobs.map(function(p){ return p.catch(function(){ return {list: [], note: 'unreachable'}; }); })).then(function(r){
      if(my !== seq) return;
      /* 영어 단어는 영어 사전이 맨 위, 그 밖에는 경제용어 → 국어사전 → 위키백과 */
      var order = en ? [r[2], r[0], r[1]] : [r[0], r[3], r[1]];
      results = [];
      order.forEach(function(x){ (x.list || []).forEach(function(it){ it.group = defaultGroup(it.kind); results.push(it); }); });
      lastQ = q;
      paint(q, '', {ecos: r[0].note, std: r[3].note});
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
    var btn0 = cardEl.querySelector('.lk-save');
    /* 이미 저장한 결과를 고쳐서 다시 누르면 — 그 카드에 반영 (같은 단어 카드를 두 장 만들지 않는다) */
    var had = r.savedId ? k.data.lexicon.filter(function(n){ return n && n.id === r.savedId; })[0] : null;
    if(had){
      had.title = title; had.content = def; had.groupId = r.group || had.groupId || null;
      try{ k.save(); k.renderSidebar('lexicon'); }catch(e){}
      toast('📇 “' + title + '” 고친 내용을 반영했습니다');
      if(btn0){ btn0.textContent = '✓ 반영됨'; btn0.classList.remove('again'); btn0.classList.add('done'); btn0.disabled = true; }
      flash(had.id);
      return;
    }
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
    r.savedId = note.id;
    var btn = cardEl.querySelector('.lk-save');
    if(btn){ btn.textContent = '✓ 저장됨'; btn.classList.add('done'); btn.disabled = true; }
    flash(note.id);
  }
  function flash(id){
    setTimeout(function(){
      var el = document.getElementById('item-' + id);
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
      +   '<span class="lk-sub">경제 용어 · 일반 개념 · 영어 단어 — 여기서 찾고, 고쳐서, 바로 카드로 저장합니다</span>'
      +   '<button type="button" class="lk-fold" id="lkFold" title="검색 결과와 안내를 접거나 펼칩니다">접기 ▴</button></div>'
      + '<form class="lk-form" id="lkForm" autocomplete="off">'
      +   '<svg class="lk-ico" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13 13l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      +   '<input type="text" id="lkQ" class="lk-q" placeholder="예) 양적완화 · 기회비용 · duration" aria-label="찾을 말">'
      +   '<button type="button" class="lk-x" id="lkX" aria-label="입력한 말 지우기" title="지우기" hidden>✕</button>'
      +   '<button type="submit" class="lk-go">찾기</button>'
      + '</form>'
      + '<div class="lk-call" id="lkCall"></div>'
      + '<div class="lk-recent" id="lkRecent"></div>'
      + '<div class="lk-out" id="lkOut"></div>'
      + '<details class="lk-set" id="lkSet"><summary><span>⚙ 사전 연결 · 사용 안내</span><i>처음이라면 여기부터</i></summary>'
      +   '<div class="lk-set-body" id="lkSetBody"></div></details>';
    quiz.parentNode.insertBefore(p, quiz);

    $('lkForm').addEventListener('submit', function(e){ e.preventDefault(); search($('lkQ').value); });
    $('lkQ').addEventListener('input', syncX);
    $('lkX').addEventListener('click', function(){
      var q = $('lkQ'); q.value = ''; syncX(); q.focus();
    });
    $('lkFold').addEventListener('click', function(){ fold(!p.classList.contains('lk-folded')); });
    p.addEventListener('click', function(e){
      var t = e.target;
      if(!t || !t.classList) return;
      /* 담을 내용 고르기 (2026-11-26) */
      var pc = t.closest ? t.closest('.lk-pc') : null;
      if(pc){
        var ri = +pc.getAttribute('data-i'), pi = +pc.getAttribute('data-p'), rr = results[ri];
        if(rr && rr.sel){ rr.sel[pi] = !rr.sel[pi]; refreshPick(ri); }
        return;
      }
      if(t.classList.contains('lk-pk-a')){
        var ra = results[+t.getAttribute('data-i')];
        if(ra && ra.pcs){ ra.sel = t.getAttribute('data-a') === 'all' ? ra.pcs.map(function(){ return true; }) : ra.sel0.slice(); refreshPick(+t.getAttribute('data-i')); }
        return;
      }
      if(t.classList.contains('lk-undo')){
        var ru = results[+t.getAttribute('data-i')], cu = t.closest('.lk-card'), tu = cu && cu.querySelector('.lk-def');
        if(ru && tu && ru.kept != null){ tu.value = ru.kept; ru.kept = null; autosize(tu); reopenSave(cu, ru); }
        t.hidden = true;
        return;
      }
      if(t.classList.contains('lk-howto')){
        var d = $('lkSet'); d.open = true; probeWorker();
        try{ d.scrollIntoView({behavior: 'smooth', block: 'center'}); }catch(x){}
        return;
      }
      if(t.classList.contains('lk-r')){ search(t.getAttribute('data-q')); return; }
      var i = +t.getAttribute('data-i');
      if(t.classList.contains('lk-save')){ save(i); return; }
      if(t.classList.contains('lk-g')){
        if(results[i]) results[i].group = t.getAttribute('data-g');
        var sib = t.parentNode.querySelectorAll('.lk-g');
        for(var s = 0; s < sib.length; s++) sib[s].classList.toggle('on', sib[s] === t);
        reopenSave(t.closest('.lk-card'), results[i]);
        return;
      }
      /* (예전 '전문 넣기 / 한글 뜻만' 단추는 2026-11-26 '담을 내용 고르기'로 바뀌었다) */
    });
    /* 아래 글을 손으로 고치면 — 칸 높이를 맞추고, 이미 저장했다면 '저장한 카드에 반영'으로 */
    p.addEventListener('input', function(e){
      var t = e.target;
      if(!t || !t.classList || !(t.classList.contains('lk-def') || t.classList.contains('lk-title'))) return;
      if(t.classList.contains('lk-def')) autosize(t);
      reopenSave(t.closest('.lk-card'), results[+t.getAttribute('data-i')]);
    });
    paintRecent();
    paintCall();
    paintSet();
    $('lkSet').addEventListener('toggle', function(){ if(this.open) probeWorker(); });
    p.addEventListener('submit', function(e){
      if(!e.target || !e.target.classList || !e.target.classList.contains('lk-keyform')) return;
      e.preventDefault();
      var v = (e.target.querySelector('.lk-key').value || '').replace(/\s+/g, '');
      if(v && !/^[A-Za-z0-9]{16,64}$/.test(v)){ toast('인증키 모양이 아닙니다 — 영문·숫자 32자리를 그대로 붙여넣어 주세요'); return; }
      try{ if(v) localStorage.setItem('nn_stdict_key', v); else localStorage.removeItem('nn_stdict_key'); }catch(x){}
      toast(v ? '✅ 표준국어대사전 인증키를 저장했습니다' : '표준국어대사전 인증키를 지웠습니다');
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
      paintCall(); paintSet();
      if(v && lastQ) search(lastQ);
    });
    return true;
  }

  function syncX(){ var x = $('lkX'), q = $('lkQ'); if(x && q) x.hidden = !q.value; }
  function fold(on){
    var p = $('lkPanel'), b = $('lkFold'); if(!p || !b) return;
    p.classList.toggle('lk-folded', !!on);
    b.textContent = on ? '펼치기 ▾' : '접기 ▴';
    if(!on){ var o = $('lkOut'); if(o) o.querySelectorAll('.lk-def').forEach(autosize); }   /* 접혀 있는 동안에는 높이를 잴 수 없었다 */
  }

  /* ════════ 표준국어대사전 인증키 — 눈에 보이는 자리 ════════
     처음엔 맨 아래 접힌 안내 속에만 입력 칸이 있어서, 키를 받아 와도 넣을 곳을 찾지 못했다.
     키가 없는 동안에는 검색창 바로 아래에 입력 칸을 펼쳐 두고, 넣고 나면 사라진다. */
  function paintCall(){
    var el = $('lkCall'); if(!el) return;
    if(ls('nn_stdict_key')){ el.innerHTML = ''; el.style.display = 'none'; return; }
    if(el.querySelector('.lk-key') === document.activeElement) return;
    el.style.display = '';
    el.innerHTML =
        '<div class="lk-call-t">📖 한국어 낱말 뜻도 여기서 찾기 <i>표준국어대사전 인증키 · 무료</i></div>'
      + '<div class="lk-call-d">인증키를 넣으면 <b>천착 · 해태 · 소회</b> 같은 우리말 낱말을 찾았을 때 국립국어원 사전 풀이가 바로 나오고, '
      +   '한 번 눌러 카드로 저장할 수 있습니다. 넣지 않아도 영어 사전과 위키백과는 그대로 됩니다.</div>'
      + '<form class="lk-keyform" autocomplete="off">'
      +   '<input type="password" class="lk-key" placeholder="발급받은 인증키 32자리를 붙여넣으세요" spellcheck="false" aria-label="표준국어대사전 인증키">'
      +   '<button type="submit" class="lk-keysave">저장</button>'
      + '</form>'
      + '<button type="button" class="lk-howto">아직 키가 없다면 — 받는 법 보기 ▾</button>';
  }

  /* ════════ 설정 · 안내 ════════
     이 사이트는 여러 사람이 쓴다. 키와 프록시는 각자 자기 브라우저(로그인했다면 자기 계정)에만 저장되므로
     처음 온 사람도 무엇이 그냥 되고 무엇에 준비가 필요한지 이 칸만 보면 알 수 있어야 한다. */
  var wk = null;   /* 프록시가 알려 준 기능 목록 (null = 아직 안 물어봄) */
  function probeWorker(){
    var W = ls('nn_worker_url').replace(/\/+$/, '');
    if(!W){ wk = {none: true}; paintSet(); return; }
    getJSON(W + '/', 6000).then(function(j){
      wk = (j && Array.isArray(j.endpoints)) ? {v: j.v, eps: j.endpoints} : {fail: true};
      paintSet();
    });
  }
  function paintSet(){
    var el = $('lkSetBody'); if(!el) return;
    var keyping = el.querySelector('.lk-key') && el.querySelector('.lk-key') === document.activeElement;
    if(keyping) return;                                  /* 키를 치는 중에는 다시 그리지 않는다 */
    var ecosKey = !!ls('nn_ecos_key'), stdKey = ls('nn_stdict_key');
    function st(ok, txt){ return '<span class="lk-st ' + (ok ? 'ok' : 'no') + '">' + (ok ? '● ' : '○ ') + txt + '</span>'; }
    function px(path){
      if(!wk) return '';
      if(wk.none) return st(false, '프록시 주소 없음');
      if(wk.fail) return st(false, '프록시 응답 없음');
      return (wk.eps.indexOf(path) >= 0) ? st(true, '프록시 v' + wk.v) : st(false, '프록시가 옛 버전(v' + wk.v + ') — 최신 worker.js 필요');
    }
    el.innerHTML =
        '<p class="lk-p"><b>이렇게 씁니다</b> — 위 칸에 말을 넣고 Enter → 결과의 제목·뜻을 그 자리에서 고치고 → 그룹을 골라 <b>＋ 사전에 저장</b>. '
      +   '저장한 카드는 아래 목록에 바로 생깁니다. 연결된 사전에 없는 말은 결과 아래 <b>네이버 사전 · 지식백과 · 구글</b> 바로가기로 확인하세요.</p>'
      + '<div class="lk-rows">'
      +   '<div class="lk-row"><b>영어 사전</b><span>한국어 뜻 · 발음 · 영영 풀이 · 예문</span>' + st(true, '설정 없이 됩니다') + '</div>'
      +   '<div class="lk-row"><b>위키백과</b><span>개념 · 시사 · 경제 일반 요약</span>' + st(true, '설정 없이 됩니다') + '</div>'
      +   '<div class="lk-row"><b>한국은행 경제용어</b><span>경제 · 금융 용어 풀이</span>'
      +     st(ecosKey, ecosKey ? 'ECOS 키 있음' : 'ECOS 키 필요') + px('/ecosword') + '</div>'
      +   '<div class="lk-row"><b>표준국어대사전</b><span>한국어 낱말 뜻</span>'
      +     st(!!stdKey, stdKey ? '인증키 있음' : '인증키 필요') + px('/stdict') + '</div>'
      + '</div>'
      + '<div class="lk-guide"><div class="lk-gt">표준국어대사전 인증키 받기 <i>무료 · 약 2분</i></div>'
      +   '<ol>'
      +     '<li><a href="https://stdict.korean.go.kr/openapi/openApiInfo.do" target="_blank" rel="noopener">표준국어대사전 오픈 API 안내 ↗</a> 를 열고 회원가입 · 로그인합니다.</li>'
      +     '<li>같은 화면의 <b>오픈 API 사용 신청</b>에서 신청합니다 (용도는 “개인 학습용 단어 검색” 정도면 됩니다).</li>'
      +     '<li>발급된 <b>인증키</b>(영문·숫자 32자리)를 복사합니다.</li>'
      +     '<li>아래 칸에 붙여넣고 <b>저장</b>을 누릅니다.</li>'
      +   '</ol>'
      +   '<p class="lk-why"><b>넣으면 좋은 점</b> — 우리말 낱말(천착 · 해태 · 소회 …)을 찾으면 국립국어원 풀이가 바로 나옵니다. 위키백과에는 이런 낱말이 거의 없습니다.</p>'
      +   '<form class="lk-keyform" autocomplete="off">'
      +     '<input type="password" class="lk-key" placeholder="표준국어대사전 인증키 32자리" value="' + esc(stdKey) + '" spellcheck="false" aria-label="표준국어대사전 인증키">'
      +     '<button type="submit" class="lk-keysave">저장</button>'
      +   '</form>'
      + '</div>'
      + '<div class="lk-guide"><div class="lk-gt">한국은행 경제용어 · 프록시</div>'
      +   '<ul>'
      +     '<li><b>ECOS 키</b> — MACRO 탭 ‘한국 기준금리 자동 연동 설정’에 넣는 키를 그대로 같이 씁니다. '
      +       '<a href="https://ecos.bok.or.kr/api/" target="_blank" rel="noopener">한국은행 ECOS 에서 무료 발급 ↗</a></li>'
      +     '<li><b>프록시</b> — 한국은행 · 국립국어원은 웹페이지가 직접 부르는 것을 막아 둬서, 각자의 Cloudflare Worker 를 거쳐야 합니다. '
      +       'MACRO 탭 ‘Cloudflare Worker 프록시 만드는 법’대로 만들고, 코드는 <a href="worker.js" target="_blank" rel="noopener">최신 worker.js ↗</a> 를 열어 전체 복사해 붙여넣으세요.</li>'
      +   '</ul></div>'
      + '<p class="lk-p lk-priv">🔒 인증키와 프록시 주소는 <b>이 브라우저</b>(로그인했다면 <b>내 계정</b>)에만 저장됩니다. 다른 방문자에게는 보이지 않고, 각자 자기 것을 넣어 씁니다.</p>';
  }

  (function wait(n){
    if(mount()) return;
    if(n > 60) return;
    setTimeout(function(){ wait(n + 1); }, 200);
  })(0);

  /* ── 화면 없이 찾기 · 저장 (2026-11) ──
     글을 읽다가 낱말을 골라 그 자리에서 뜻을 볼 때(nn-capture.js) 쓴다. LOOK UP 칸의 결과는 건드리지 않는다. */
  function lookupOnly(q){
    q = String(q || '').replace(/\s+/g, ' ').trim();
    if(!q) return Promise.resolve({ q:q, list:[], notes:{} });
    var en = isEnglish(q);
    var jobs = [ srcEcos(q), srcWiki(q, en ? 1 : 2), en ? srcEnglish(q) : Promise.resolve({list: []}),
                 (!en && hasHangul(q)) ? srcStd(q) : Promise.resolve({list: []}) ];
    return Promise.all(jobs.map(function(p){ return p.catch(function(){ return {list: [], note: 'unreachable'}; }); })).then(function(r){
      var order = en ? [r[2], r[0], r[1]] : [r[0], r[3], r[1]];
      var list = [];
      order.forEach(function(x){ (x.list || []).forEach(function(it){ it.group = defaultGroup(it.kind); list.push(it); }); });
      return { q:q, list:list, notes:{ ecos:r[0].note, std:r[3].note } };
    });
  }
  function addTerm(title, def, groupId){
    var k = KN(); title = clean(title); def = clean(def);
    if(!k || !title) return null;
    if(!k.data.lexicon) k.data.lexicon = [];
    var note = {
      id: 'note_' + Date.now() + Math.floor(Math.random() * 900 + 100),
      title: title, content: def,
      date: (typeof k._nowStr === 'function') ? k._nowStr() : '',
      groupId: groupId || null, icon: '📇'
    };
    k.data.lexicon.unshift(note);
    try{ k.save(); if(document.getElementById('lexicon-sidebar-list')) k.renderSidebar('lexicon'); }catch(e){}
    return note;
  }
  /* 설정 창에서 표준국어대사전 키를 바꿨을 때 — 용어 탭의 안내 칸을 다시 그린다 */
  function refreshKey(){ try { paintCall(); paintSet(); } catch(e) {} }
  window.__nnLookup = { search: search, lookup: lookupOnly, add: addTerm, exists: exists, groups: groups, defaultGroup: defaultGroup, refreshKey: refreshKey };
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
  '.lk-save.again{background:rgba(245,199,92,.16);color:#f7d98a;border-color:rgba(245,199,92,.6)}',
  '.lk-save.again:hover{background:rgba(245,199,92,.3);color:#fff;box-shadow:none}',
  /* 담을 내용 고르기 (2026-11-26) — 조각마다 누르면 넣고 빠진다. 출처 색을 따라간다 */
  '.lk-card{--lk-ac:#aeb1b4;--lk-ac-bg:rgba(174,177,180,.10);--lk-ac-bd:rgba(174,177,180,.42)}',
  '.lk-card.lk-std{--lk-ac:#f5c75c;--lk-ac-bg:rgba(245,199,92,.09);--lk-ac-bd:rgba(245,199,92,.42)}',
  '.lk-card.lk-en{--lk-ac:#7fbef5;--lk-ac-bg:rgba(127,190,245,.10);--lk-ac-bd:rgba(127,190,245,.45)}',
  '.lk-card.lk-ecos{--lk-ac:#7fd58c;--lk-ac-bg:rgba(127,213,140,.09);--lk-ac-bd:rgba(127,213,140,.42)}',
  '.lk-pick{margin-top:11px}',
  '.lk-pk-h{display:flex;align-items:baseline;gap:6px 10px;flex-wrap:wrap;margin-bottom:7px}',
  '.lk-pk-l{font-size:12px;font-weight:800;color:rgba(255,255,255,.86)}',
  '.lk-pk-l i{font-style:normal;font-weight:500;font-size:11px;color:rgba(255,255,255,.42);margin-left:7px}',
  '.lk-pk-n{font-size:11px;color:rgba(255,255,255,.45)}',
  '.lk-pk-n b{color:var(--lk-ac);font-weight:800}',
  '.lk-pk-as{margin-left:auto;display:flex;gap:4px}',
  '.lk-pk-a{cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;',
  '  border:1px solid rgba(255,255,255,.14);background:transparent;color:rgba(255,255,255,.6);transition:.15s}',
  '.lk-pk-a:hover{color:#fff;border-color:rgba(255,255,255,.4)}',
  '.lk-pcs{display:flex;flex-direction:column;gap:5px}',
  '.lk-pcs + .lk-pcs{margin-top:8px}',
  '.lk-pcs-ko{flex-direction:row;flex-wrap:wrap;align-items:center;gap:6px}',
  '.lk-pk-sec{font-size:11px;font-weight:700;color:rgba(255,255,255,.45);margin-right:2px}',
  '.lk-pc{display:flex;align-items:flex-start;gap:9px;width:100%;box-sizing:border-box;text-align:left;cursor:pointer;',
  '  font-family:inherit;font-size:13px;line-height:1.62;padding:8px 12px 8px 10px;border-radius:9px;',
  '  border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.02);color:rgba(255,255,255,.46);',
  '  transition:background .15s,border-color .15s,color .15s}',
  '.lk-pc:hover{border-color:rgba(255,255,255,.26);color:rgba(255,255,255,.74)}',
  '.lk-pc:focus-visible{outline:2px solid var(--lk-ac);outline-offset:2px}',
  '.lk-pc.on{background:var(--lk-ac-bg);border-color:var(--lk-ac-bd);color:rgba(255,255,255,.94)}',
  '.lk-pc.sub{margin-left:28px;width:calc(100% - 28px)}',
  '.lk-pc-i{flex:0 0 auto;width:18px;height:18px;margin-top:2px;border-radius:50%;box-sizing:border-box;',
  '  border:1.5px solid rgba(255,255,255,.28);display:flex;align-items:center;justify-content:center;',
  '  font-size:11px;font-weight:900;line-height:1;transition:.15s}',
  '.lk-pc-i::before{content:"+";color:rgba(255,255,255,.55)}',
  '.lk-pc.on .lk-pc-i{background:var(--lk-ac);border-color:var(--lk-ac)}',
  '.lk-pc.on .lk-pc-i::before{content:"✓";color:#101114}',
  '.lk-pc-t{flex:1;min-width:0;overflow-wrap:anywhere}',
  '.lk-pc-n{font-weight:800;color:var(--lk-ac);margin-right:6px}',
  '.lk-pc-tag{font-style:normal;font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:5px;margin-right:7px;',
  '  vertical-align:1px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.66)}',
  '.lk-pc.chip{width:auto;align-items:center;padding:5px 13px 5px 7px;border-radius:999px;font-size:14px;font-weight:700}',
  '.lk-pc.chip .lk-pc-i{margin-top:0}',
  '.lk-dl{display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;margin-top:12px}',
  '.lk-dl span{font-size:12px;font-weight:800;color:rgba(255,255,255,.86)}',
  '.lk-dl i{font-style:normal;font-size:11px;color:rgba(255,255,255,.42)}',
  '.lk-dl + .lk-def{margin-top:6px}',
  '.lk-undo{margin-left:auto;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:700;background:none;border:none;',
  '  padding:0;color:#f7d98a;text-decoration:underline}',
  '.lk-undo:hover{color:#fff}',
  '.lk-undo[hidden]{display:none}',
  '.lk-links{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:12px;',
  '  border-top:1px solid rgba(255,255,255,.08)}',
  '.lk-links span{font-size:11px;color:rgba(255,255,255,.4)}',
  '.lk-links a{font-size:12px;font-weight:600;color:rgba(255,255,255,.75);text-decoration:none;',
  '  padding:5px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.16);transition:.15s}',
  '.lk-links a:hover{color:#fff;border-color:rgba(226,229,232,.6)}',
  /* 지우기 × · 접기 */
  '.lk-x{flex-shrink:0;width:26px;height:26px;border-radius:50%;cursor:pointer;line-height:1;font-size:12px;',
  '  border:none;background:rgba(255,255,255,.14);color:rgba(255,255,255,.8);transition:.15s}',
  '.lk-x:hover{background:rgba(255,255,255,.3);color:#fff}',
  '.lk-x[hidden]{display:none}',
  '.lk-fold{margin-left:auto;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:700;padding:5px 12px;',
  '  border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);',
  '  color:rgba(255,255,255,.75);transition:.15s;white-space:nowrap}',
  '.lk-fold:hover{color:#fff;border-color:rgba(226,229,232,.65)}',
  '.lk-panel.lk-folded .lk-call,.lk-panel.lk-folded .lk-recent,.lk-panel.lk-folded .lk-out,',
  '.lk-panel.lk-folded .lk-set{display:none!important}',
  /* 영어 사전 — 한글 뜻이 크게 */
  '.lk-en .lk-def{font-size:16px;font-weight:600;color:#fff}',
  /* 눈에 보이는 인증키 칸 */
  '.lk-call{margin-top:12px;padding:13px 15px 12px;border-radius:12px;',
  '  background:rgba(245,199,92,.09);border:1px solid rgba(245,199,92,.45)}',
  '.lk-call-t{font-size:13.5px;font-weight:800;color:#fff}',
  '.lk-call-t i{font-style:normal;font-size:11px;font-weight:700;color:#f7d98a;margin-left:8px}',
  '.lk-call-d{margin-top:5px;font-size:12.5px;line-height:1.7;color:rgba(255,255,255,.78)}',
  '.lk-call-d b{color:#fff}',
  '.lk-howto{margin-top:8px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;',
  '  background:none;border:none;padding:0;color:#f7d98a;text-decoration:underline}',
  '.lk-howto:hover{color:#fff}',
  '.lk-why{margin:0 0 6px;font-size:12.5px;line-height:1.7;color:rgba(255,255,255,.74)}',
  '.lk-why b{color:#f7d98a}',
  '.lk-card.lk-std{border-left-color:#f5c75c}',
  '.lk-std .lk-badge{background:rgba(245,199,92,.16);color:#f7d98a}',
  /* 설정 · 안내 */
  '.lk-set{margin-top:14px;border-top:1px solid rgba(255,255,255,.08);padding-top:10px}',
  '.lk-set summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;',
  '  font-size:12.5px;font-weight:700;color:rgba(255,255,255,.78);padding:4px 0}',
  '.lk-set summary::-webkit-details-marker{display:none}',
  '.lk-set summary::after{content:"펼치기 ▾";margin-left:auto;font-size:11px;font-weight:600;color:rgba(255,255,255,.4)}',
  '.lk-set[open] summary::after{content:"접기 ▴"}',
  '.lk-set summary i{font-style:normal;font-size:11px;font-weight:500;color:rgba(255,255,255,.4)}',
  '.lk-set summary:hover{color:#fff}',
  '.lk-set-body{padding:8px 0 2px}',
  '.lk-p{font-size:12.5px;line-height:1.75;color:rgba(255,255,255,.72);margin:6px 0 12px}',
  '.lk-p b{color:#fff}',
  '.lk-rows{border:1px solid rgba(255,255,255,.1);border-radius:10px;overflow:hidden}',
  '.lk-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:9px 12px;font-size:12.5px;',
  '  border-top:1px solid rgba(255,255,255,.07)}',
  '.lk-row:first-child{border-top:none}',
  '.lk-row > b{color:#fff;min-width:118px}',
  '.lk-row > span:nth-child(2){color:rgba(255,255,255,.5);flex:1;min-width:150px}',
  '.lk-st{font-size:11.5px;font-weight:700;white-space:nowrap}',
  '.lk-st.ok{color:#8fe09b}',
  '.lk-st.no{color:#ffbe7a}',
  '.lk-guide{margin-top:12px;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.035);',
  '  border:1px solid rgba(255,255,255,.08)}',
  '.lk-gt{font-size:12.5px;font-weight:800;color:#fff;margin-bottom:6px}',
  '.lk-gt i{font-style:normal;font-weight:600;font-size:11px;color:#f7d98a;margin-left:6px}',
  '.lk-guide ol,.lk-guide ul{margin:0;padding-left:19px}',
  '.lk-guide li{font-size:12.5px;line-height:1.8;color:rgba(255,255,255,.74)}',
  '.lk-guide li b{color:#fff}',
  '.lk-guide a{color:#a9d4f8;text-decoration:none;border-bottom:1px solid rgba(169,212,248,.4)}',
  '.lk-guide a:hover{color:#fff}',
  '.lk-keyform{display:flex;gap:8px;margin-top:10px}',
  '.lk-key{flex:1;min-width:0;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.16);border-radius:8px;',
  '  outline:none;color:#fff;font-family:inherit;font-size:13px;padding:9px 11px;letter-spacing:.04em}',
  '.lk-key:focus{border-color:rgba(245,199,92,.7)}',
  '.lk-keysave{cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:800;padding:9px 18px;border-radius:8px;',
  '  border:1px solid rgba(245,199,92,.7);background:rgba(245,199,92,.18);color:#f7d98a}',
  '.lk-keysave:hover{background:rgba(245,199,92,.34);color:#fff}',
  '.lk-priv{margin:12px 0 2px;color:rgba(255,255,255,.55)}',
  /* 방금 저장한 카드를 잠깐 밝혀 준다 */
  '.lex-card.lk-flash{box-shadow:0 0 0 2px #7fd58c,0 0 22px -4px #7fd58c!important;transition:box-shadow .3s}',
  '@media (max-width:760px){',
  '  .lk-panel{padding:14px 13px}',
  '  .lk-gs{margin-left:0;width:100%}',
  '  .lk-save{width:100%}',
  '  .lk-pc.sub{margin-left:16px;width:calc(100% - 16px)}',
  '  .lk-pc{font-size:13.5px}',
  '}'
  ].join('');
  var s = document.createElement('style');
  s.id = 'nnLookupCss'; s.textContent = CSS;
  document.head.appendChild(s);
})();
