/* ══════════════════════════════════════════════════════════════════════
   NEWNORMAL — nn-modules.js
   부가 모듈 — 별점 · 카테고리 · 공유 · 탭 관리 · 툴팁 · 저장 안전장치

   ⚠ 이 파일은 index.html 에서 정해진 순서로 불러옵니다.
     순서를 바꾸거나 async/defer 를 붙이면 '함수를 찾을 수 없음' 오류가 납니다.
     로딩 순서: nn-core.js → nn-assets.js → nn-modules.js
   ══════════════════════════════════════════════════════════════════════ */


/* ── 별점(0.5단위) + 책 종류 카테고리 (추가/삭제/수정) ── */
(function(){
  var CATKEY='nn_book_categories_v1';
  var PAL=['#c9a96e','#7fa8d4','#8fb98f','#d48fa8','#b28ad4','#d4b48f','#8fc9c9','#d49a7f','#a8b0bb','#c98f8f'];
  var DEF=[['소설','#d48fa8'],['인문','#b28ad4'],['경제','#7fa8d4'],['경영','#8fb98f'],['투자','#c9a96e'],['과학','#8fc9c9'],['역사','#d4b48f'],['에세이','#d49a7f'],['자기계발','#d4c98f'],['기타','#a8b0bb']].map(function(x){return {name:x[0],color:x[1]};});
  /* 기존 카테고리와 겹치지 않는 색을 자동 배정 */
  var EXTRA=['#e05252','#52b788','#4a90d9','#e0a800','#9b59b6','#e67e22','#5bc0be','#f28ab2','#7f8fa6','#b5a642','#6ab04c','#eb4d4b','#686de0','#30336b','#badc58','#f0932b'];
  function pickFreeColor(list){
    var used={}; (list||[]).forEach(function(c){ used[String(c.color||'').toLowerCase()]=1; });
    var pool=PAL.concat(EXTRA);
    for(var i=0;i<pool.length;i++){ if(!used[pool[i].toLowerCase()]) return pool[i]; }
    /* 전부 소진되면 기존과 가장 먼 색을 생성 (HSL 균등 분할) */
    var n=(list||[]).length;
    var hue=Math.round((n*137.508)%360);
    return hslHex(hue, 46, 62);
  }
  function hslHex(h,sPct,lPct){
    var sN=sPct/100, lN=lPct/100;
    var c=(1-Math.abs(2*lN-1))*sN, x=c*(1-Math.abs(((h/60)%2)-1)), m2=lN-c/2;
    var r=0,g=0,b=0;
    if(h<60){r=c;g=x;} else if(h<120){r=x;g=c;} else if(h<180){g=c;b=x;}
    else if(h<240){g=x;b=c;} else if(h<300){r=x;b=c;} else {r=c;b=x;}
    function hx(v){ return ('0'+Math.round((v+m2)*255).toString(16)).slice(-2); }
    return '#'+hx(r)+hx(g)+hx(b);
  }
  function cats(){ try{ var a=JSON.parse(localStorage.getItem(CATKEY)); if(Array.isArray(a)&&a.length){ return a.map(function(x){ return (typeof x==='string')?{name:x,color:PAL[0]}:x; }); } }catch(e){} return DEF.map(function(x){return {name:x.name,color:x.color};}); }
  function saveCats(a){ try{ localStorage.setItem(CATKEY, JSON.stringify(a)); }catch(e){} }
  function catColor(name){ if(!name) return ''; var f=cats().filter(function(c){return c.name===name;})[0]; return f?f.color:'#c9a96e'; }
  window.__nnCatColor=catColor;
  function fireSave(node){ var eb=node.closest('.note-editable-body'); if(eb) eb.dispatchEvent(new Event('input',{bubbles:false})); }

  /* 별점 채움 렌더 */
  function paintStars(box){
    var r=parseFloat(box.getAttribute('data-rating'))||0;
    box.querySelectorAll('.st').forEach(function(st,idx){
      var v=idx+1;
      var f=st.querySelector('.fill'); if(!f){ f=document.createElement('span'); f.className='fill'; st.insertBefore(f, st.firstChild); }
      var pct = r>=v ? 100 : (r>=v-0.5 ? 50 : 0);
      f.style.width=pct+'%';
    });
    var num=box.querySelector('.rate-num'); if(!num){ num=document.createElement('span'); num.className='rate-num'; box.appendChild(num); }
    num.textContent=r>0 ? r.toFixed(1) : '';
  }
  function initStars(root){ (root||document).querySelectorAll('.np-stars').forEach(paintStars); }

  document.addEventListener('click', function(e){
    /* 별점 클릭: 반쪽 단위 */
    var half=e.target.closest('.np-stars .h1, .np-stars .h2');
    if(half){
      var box=half.closest('.np-stars');
      var val=parseFloat(half.getAttribute('data-half'));
      var cur=parseFloat(box.getAttribute('data-rating'))||0;
      if(cur===val) val=val-0.5<=0 && val<=0.5 ? 0 : val; /* 같은 곳 재클릭시 그대로 */
      box.setAttribute('data-rating', String(val));
      paintStars(box); fireSave(box);
      return;
    }
    /* 카테고리 칩 클릭 → 메뉴 */
    var cat=e.target.closest('.np-cat');
    if(cat){ openCatMenu(cat); return; }
  });

  var menu=null, menuTarget=null;
  function closeMenu(){ if(menu){ menu.remove(); menu=null; menuTarget=null; } }
  document.addEventListener('mousedown', function(e){ if(menu && !menu.contains(e.target) && !(menuTarget&&menuTarget.contains(e.target))) closeMenu(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeMenu(); });

  function tint(chip, color){
    if(color){ chip.style.background=hexA(color,.16); chip.style.borderColor=hexA(color,.5); chip.style.color=color; }
    else { chip.style.background=''; chip.style.borderColor=''; chip.style.color=''; }
  }
  function hexA(hex,a){ var m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return 'rgba(201,169,110,'+a+')'; var n=parseInt(m[1],16); return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; }
  function setCat(target, val){
    target.setAttribute('data-cat', val||'');
    var chip=target.querySelector('.cat-chip');
    if(!chip){ chip=document.createElement('span'); chip.className='cat-chip'; target.appendChild(chip); }
    chip.textContent = val || '선택 안 함';
    chip.classList.toggle('empty', !val);
    tint(chip, val?catColor(val):'');
    fireSave(target);
  }
  /* 기존 저장된 칩들 색 입히기 */
  function paintChips(root){ (root||document).querySelectorAll('.np-cat').forEach(function(t){ var v=t.getAttribute('data-cat')||''; var chip=t.querySelector('.cat-chip'); if(chip) tint(chip, v?catColor(v):''); }); }
  function openCatMenu(target){
    closeMenu(); menuTarget=target;
    menu=document.createElement('div'); menu.className='cat-menu';
    render();
    document.body.appendChild(menu);
    var r=target.getBoundingClientRect();
    menu.style.left=Math.min(r.left, window.innerWidth-menu.offsetWidth-8)+'px';
    menu.style.top=Math.min(r.bottom+5, window.innerHeight-menu.offsetHeight-8)+'px';

    function render(){
      var list=cats(); var cur=target.getAttribute('data-cat')||'';
      var h='';
      h+='<div class="ci" data-pick=""><span class="dot" style="visibility:hidden"></span><span class="lbl none">선택 안 함</span></div>';
      list.forEach(function(c,ci){
        h+='<div class="ci" data-pick="'+c.name+'" data-ci="'+ci+'" draggable="true"><span class="cg" title="끌어서 순서 변경">⋮⋮</span><span class="dot" style="background:'+c.color+'"></span><span class="lbl">'+(c.name===cur?'✓ ':'')+c.name+'</span><span class="pl" data-pl="'+c.name+'" title="색상">🎨</span><span class="ed" data-ed="'+c.name+'">수정</span><span class="dl" data-dl="'+c.name+'">삭제</span></div>';
      });
      h+='<div class="add" data-add="1">＋ 새 종류 추가</div>';
      menu.innerHTML=h;
      menu.querySelectorAll('[data-pick]').forEach(function(el){
        el.onclick=function(ev){ if(ev.target.closest('.ed,.dl,.pl')) return; setCat(target, el.getAttribute('data-pick')); closeMenu(); };
      });
      menu.querySelectorAll('.pl').forEach(function(el){
        el.onclick=function(ev){ ev.stopPropagation(); openPalette(el, el.getAttribute('data-pl')); };
      });
      menu.querySelectorAll('.ed').forEach(function(el){
        el.onclick=function(ev){ ev.stopPropagation(); var old=el.getAttribute('data-ed');
        var run=function(nv){ if(nv==null) return; nv=String(nv).trim(); if(!nv) return;
          var a=cats(); for(var i=0;i<a.length;i++){ if(a[i].name===old){ a[i].name=nv; break; } }
          saveCats(a); if((target.getAttribute('data-cat')||'')===old) setCat(target,nv); paintChips(); render(); };
        if(window.__nnPrompt) window.__nnPrompt({title:'종류 이름 수정', label:'이름', value:old, required:true, onOk:run});
        else run(prompt('종류 이름 수정', old)); };
      });
      menu.querySelectorAll('.dl').forEach(function(el){
        el.onclick=function(ev){ ev.stopPropagation(); var c=el.getAttribute('data-dl');
        var run=function(){ var a=cats().filter(function(x){return x.name!==c;}); saveCats(a); if((target.getAttribute('data-cat')||'')===c) setCat(target,''); render(); };
        if(window.__nnConfirm) window.__nnConfirm({title:'"'+c+'" 종류를 삭제할까요?', msg:'이 종류를 쓰던 책은 "선택 안 함"이 됩니다.', ok:'삭제', onOk:run});
        else if(confirm('"'+c+'" 종류를 삭제할까요?')) run(); };
      });
      menu.querySelector('[data-add]').onclick=function(){
        var run=function(nv){
          if(nv==null) return; nv=String(nv).trim(); if(!nv) return;
          var a=cats();
          if(a.some(function(x){return x.name===nv;})){
            if(window.__nnToast) window.__nnToast('이미 있는 종류입니다',{kind:'del'});
            return;
          }
          var col=pickFreeColor(a);
          a.push({name:nv,color:col}); saveCats(a); render();
          if(window.__nnToast) window.__nnToast('✓ "'+nv+'" 종류를 추가했습니다');
        };
        if(window.__nnPrompt) window.__nnPrompt({title:'새 종류 추가', label:'종류 이름', placeholder:'예: 심리학', value:'', onOk:run});
        else run(prompt('새 종류 이름'));
      };
      /* 순서 변경 (드래그) */
      var dIdx=null;
      menu.querySelectorAll('.ci[data-ci]').forEach(function(el){
        el.addEventListener('dragstart', function(ev){
          dIdx=parseInt(el.getAttribute('data-ci'),10);
          el.classList.add('ci-drag');
          try{ ev.dataTransfer.effectAllowed='move'; ev.dataTransfer.setData('text/plain',String(dIdx)); }catch(x){}
        });
        el.addEventListener('dragend', function(){
          el.classList.remove('ci-drag');
          menu.querySelectorAll('.ci-over').forEach(function(n){ n.classList.remove('ci-over'); });
          dIdx=null;
        });
        el.addEventListener('dragover', function(ev){
          ev.preventDefault();
          try{ ev.dataTransfer.dropEffect='move'; }catch(x){}
          if(dIdx===null) return;
          var t=parseInt(el.getAttribute('data-ci'),10);
          if(t!==dIdx) el.classList.add('ci-over');
        });
        el.addEventListener('dragleave', function(){ el.classList.remove('ci-over'); });
        el.addEventListener('drop', function(ev){
          ev.preventDefault(); ev.stopPropagation();
          el.classList.remove('ci-over');
          var to=parseInt(el.getAttribute('data-ci'),10), from=dIdx;
          if(from===null||isNaN(to)||from===to) return;
          var a=cats();
          if(from<0||from>=a.length||to<0||to>=a.length) return;
          var mv=a.splice(from,1)[0];
          a.splice(to,0,mv);
          saveCats(a); dIdx=null; render();
        });
      });
    }
    function openPalette(anchorEl, name){
      var old=menu.querySelector('.pal-pop'); if(old) old.remove();
      var pop=document.createElement('div'); pop.className='pal-pop';
      PAL.concat(['#e05252','#52b788','#4a90d9','#e0a800','#9b59b6','#e67e22']).forEach(function(col){
        var s=document.createElement('span'); s.className='sw'; s.style.background=col;
        s.onclick=function(ev){ ev.stopPropagation(); var a=cats(); for(var i=0;i<a.length;i++){ if(a[i].name===name){ a[i].color=col; break; } } saveCats(a); if((target.getAttribute('data-cat')||'')===name) setCat(target,name); paintChips(); render(); };
        pop.appendChild(s);
      });
      anchorEl.closest('.ci').appendChild(pop);
    }
  }

  /* 에디터 열릴 때 별점 초기 렌더 (동적 노트) */
  var mo=new MutationObserver(function(muts){
    muts.forEach(function(m){ [].forEach.call(m.addedNodes||[], function(n){
      if(n.nodeType===1){ if(n.querySelector) initStars(n); if(n.classList&&n.classList.contains('np-stars')) paintStars(n); if(n.querySelector) paintChips(n); }
    }); });
  });
  function boot(){ initStars(document); paintChips(document); mo.observe(document.body,{childList:true,subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
/* ── 날짜 속성 칸: 실시간 달력 팝업으로 입력 ── */
(function(){
  var pop=null, target=null, vy=0, vm=0;
  var WD=['일','월','화','수','목','금','토'];
  function pad(n){ return (n<10?'0':'')+n; }
  function build(){
    pop=document.createElement('div'); pop.className='nn-cal'; pop.style.display='none';
    document.body.appendChild(pop);
    document.addEventListener('mousedown', function(e){
      if(pop.style.display==='none') return;
      if(pop.contains(e.target) || (target && (e.target===target || target.contains(e.target)))) return;
      hide();
    });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') hide(); });
  }
  function render(){
    var today=new Date(), ty=today.getFullYear(), tm=today.getMonth(), td=today.getDate();
    var first=new Date(vy,vm,1).getDay(), days=new Date(vy,vm+1,0).getDate();
    var h='<div class="nn-cal-h"><b>'+vy+'년 '+(vm+1)+'월</b><div class="nn-cal-nav"><button data-nav="-1">‹</button><button data-nav="1">›</button></div></div>';
    h+='<div class="nn-cal-w">'+WD.map(function(w){ return '<span>'+w+'</span>'; }).join('')+'</div>';
    h+='<div class="nn-cal-g">';
    for(var b=0;b<first;b++) h+='<button class="blank"></button>';
    for(var d=1;d<=days;d++){
      var wd=(first+d-1)%7;
      var cls=(wd===0?'sun':(wd===6?'sat':''))+((vy===ty&&vm===tm&&d===td)?' today':'');
      h+='<button data-d="'+d+'" class="'+cls.trim()+'">'+d+'</button>';
    }
    h+='</div>';
    pop.innerHTML=h;
    pop.querySelectorAll('[data-nav]').forEach(function(b){
      b.onclick=function(){ vm+=parseInt(this.dataset.nav,10); if(vm<0){vm=11;vy--;} if(vm>11){vm=0;vy++;} render(); };
    });
    pop.querySelectorAll('[data-d]').forEach(function(b){
      b.onclick=function(){ pick(vy,vm,parseInt(this.dataset.d,10)); };
    });
  }
  var toastEl=null, toastT=null;
  function toast(msg){
    if(!toastEl){ toastEl=document.createElement('div'); toastEl.className='nn-toast'; document.body.appendChild(toastEl); }
    toastEl.innerHTML='<span class="ic">\u26a0</span>'+msg;
    toastEl.classList.add('show');
    clearTimeout(toastT); toastT=setTimeout(function(){ toastEl.classList.remove('show'); }, 2600);
  }
  function parseDate(txt){
    var m=/(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(txt||''); if(!m) return null;
    return new Date(parseInt(m[1],10), parseInt(m[2],10)-1, parseInt(m[3],10));
  }
  function pick(y,m,d){
    if(!target) return;
    var picked=new Date(y,m,d);
    /* 읽기 시작 ↔ 다 읽은 날짜 순서 검증 */
    var kText=(target.previousElementSibling&&target.previousElementSibling.textContent)||'';
    var props=target.closest('.nn-props');
    if(props){
      var isStart=/읽기 시작/.test(kText), isEnd=/다 읽은|완독/.test(kText);
      var rows=props.querySelectorAll('.np-v');
      var startV=null, endV=null;
      rows.forEach(function(v){
        var k=(v.previousElementSibling&&v.previousElementSibling.textContent)||'';
        if(/읽기 시작/.test(k)) startV=parseDate(v.textContent);
        if(/다 읽은|완독/.test(k)) endV=parseDate(v.textContent);
      });
      if(isStart && endV && picked>endV){ toast('읽기 시작한 날짜는 다 읽은 날짜보다 이후일 수 없어요.'); return; }
      if(isEnd && startV && picked<startV){ toast('다 읽은 날짜는 읽기 시작한 날짜보다 이전일 수 없어요.'); return; }
    }
    target.textContent=y+'/'+pad(m+1)+'/'+pad(d)+' ('+WD[picked.getDay()]+')';
    var eb=target.closest('.note-editable-body');
    if(eb) eb.dispatchEvent(new Event('input',{bubbles:false}));
    hide();
  }
  function show(el){
    target=el;
    var now=new Date(); vy=now.getFullYear(); vm=now.getMonth();
    var m=(el.textContent||'').match(/(\d{4})\/(\d{1,2})/);
    if(m){ vy=parseInt(m[1],10); vm=parseInt(m[2],10)-1; }
    render();
    var r=el.getBoundingClientRect();
    pop.style.display='block';
    pop.style.left=Math.max(8, Math.min(r.left, window.innerWidth-272))+'px';
    pop.style.top=Math.min(r.bottom+6, window.innerHeight-330)+'px';
  }
  function hide(){ if(pop) pop.style.display='none'; target=null; }
  document.addEventListener('click', function(e){
    var v=e.target.closest('.np-v'); if(!v) return;
    var k=v.previousElementSibling;
    if(!k || !k.classList || !k.classList.contains('np-k')) return;
    if(!/날짜|읽기 시작|완독/.test(k.textContent||'')) return;
    if(!pop) build();
    show(v);
  });
})();

/* ══════════ HOLDINGS HUB — 편집 가능 (추가·수정·삭제·드래그, 클라우드 동기화) ══════════ */
(function(){
  var HUB_KEY='nn_hub_v1';
  /* 공용 토스트 (실행취소 지원) — 전역 1회 정의 */
  if(!window.__nnToast){
    window.__nnToast=function(msg, opts){
      opts=opts||{};
      var t=document.getElementById('nnToastEl');
      if(!t){ t=document.createElement('div'); t.id='nnToastEl'; t.className='nn-toast'; document.body.appendChild(t); }
      var undoBtn = opts.undo ? '<button type="button" class="nn-toast-undo">실행취소</button>' : '';
      t.innerHTML='<span class="nn-toast-msg">'+msg+'</span>'+undoBtn;
      t.className='nn-toast'+(opts.kind==='del'?' del':'');
      requestAnimationFrame(function(){ t.classList.add('show'); });
      clearTimeout(t.__tm);
      var dur = opts.undo ? 5000 : 2600;
      t.__tm=setTimeout(function(){ t.classList.remove('show'); }, dur);
      if(opts.undo){
        var ub=t.querySelector('.nn-toast-undo');
        if(ub) ub.onclick=function(){ clearTimeout(t.__tm); t.classList.remove('show'); try{ opts.undo(); }catch(e){} };
      }
    };
  }
  var SEED=[
    {url:'https://www.tesla.com',dom:'tesla.com',tag:'Automotive & Energy',name:'TESLA',desc:'FSD & ESS & ROBOTICS & ROBOTAXI',bg:'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80',color:'#ff4444'},
    {url:'https://www.nvidia.com',dom:'nvidia.com',tag:'AI Computing Platform',name:'NVIDIA',desc:'GPU를 필두로 하여 AI 내러티브를 지배하는 빅테크',bg:'https://images.unsplash.com/photo-1697577418970-95d99b5a55cf?auto=format&fit=crop&w=800&q=80',color:'#9cf500'},
    {url:'https://www.iren.com',dom:'iren.com',tag:'Next-Gen Data Center',name:'IREN',desc:'AI 데이터센터 & 전력 인프라 기업',bg:'https://images.unsplash.com/photo-1695668548342-c0c1ad479aee?auto=format&fit=crop&w=800&q=80',color:'#33ffcc'},
    {url:'https://www.rocketlabusa.com',dom:'rocketlabusa.com',tag:'Space Systems & Launch',name:'ROCKET LAB',desc:'항공우주 제조 & 발사 서비스 제공사',bg:'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?auto=format&fit=crop&w=800&q=80',color:'#ffffff'},
    {url:'https://www.roundhillinvestments.com',dom:'roundhillinvestments.com',tag:'Roundhill Investments',name:'DRAM ETF',desc:'메모리 반도체 산업 집중 ETF',bg:'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',color:'#66f0ff'},
    {url:'https://www.google.com',dom:'google.com',tag:'Alphabet',name:'GOOGLE',desc:'세계 최대의 검색·AI·광고 플랫폼',bg:'https://images.unsplash.com/photo-1766371900950-929959f2bb67?auto=format&fit=crop&w=800&q=80',color:'#73a5ff'},
    {url:'https://www.circle.com',dom:'circle.com',tag:'Stablecoin Issuer',name:'CIRCLE',desc:'USDC 스테이블코인 발행사 · 디지털 달러',bg:'https://images.unsplash.com/photo-1671469904766-a3728219d3b7?auto=format&fit=crop&w=800&q=80',color:'#be9eff'},
    {url:'https://www.infleqtion.com',dom:'infleqtion.com',tag:'Quantum AI',name:'INFLEQTION',desc:'중성원자 양자컴퓨팅 기반 AI 스타트업',bg:'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80',color:'#ff9e80'}
  ];
  var hubEdit=false, dragIdx=-1;
  function load(){ try{ var s=localStorage.getItem(HUB_KEY); if(s){ var a=JSON.parse(s); if(Array.isArray(a)) return a; } }catch(e){} return SEED.slice(); }
  function save(a){ try{ localStorage.setItem(HUB_KEY, JSON.stringify(a)); }catch(e){} }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ══════════ HOLDINGS HUB — 스테이지 (검은 캔버스 · 성좌 배치 · 호버 확장) ══════════ */
  /* 중앙 텍스트 영역(x 30~70 / y 33~67)을 피해 배치 */
  var HUB_POS=[
    [11,17],[21,29],[7,44],[16,57],[25,70],[13,84],
    [75,16],[87,28],[79,43],[91,57],[73,71],[86,83],
    [40,9],[59,7],[34,89],[57,91]
  ];
  var HUB_ANCH=[[16,45],[84,45],[50,10],[50,90]];
  function hubClusterOf(p){
    if(p[1]<14) return 2;
    if(p[1]>86) return 3;
    return p[0]<50 ? 0 : 1;
  }
  function removeStage(sec){ if(!sec) return; var st=sec.querySelector('.hub-stage'); if(st) st.remove(); }

  function buildStage(sec, data){
    if(!sec) return;
    removeStage(sec);
    var stage=document.createElement('div');
    stage.className='hub-stage';

    /* 연결선 */
    /* 카드별 위치: 사용자가 지정했으면 그 값, 없으면 기본 슬롯 순환 */
    function posOf(c,i){
      if(c && c.px!=null && c.py!=null) return [c.px, c.py];
      return HUB_POS[i % HUB_POS.length];
    }
    var lines='';
    for(var i=0;i<data.length;i++){
      var p=posOf(data[i],i), a=HUB_ANCH[hubClusterOf(p)];
      lines+='<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+a[0]+'" y2="'+a[1]+'" style="--i:'+i+'"/>';
    }
    /* 좌·우 앵커만 중앙 카피 쪽으로 연결 (글씨 앞에서 멈춤) · 상·하는 세로선이 글씨를 관통해 제외 */
    lines+='<line class="hl-core" x1="'+HUB_ANCH[0][0]+'" y1="'+HUB_ANCH[0][1]+'" x2="29" y2="49" style="--i:9"/>';
    lines+='<line class="hl-core" x1="'+HUB_ANCH[1][0]+'" y1="'+HUB_ANCH[1][1]+'" x2="71" y2="49" style="--i:11"/>';

    /* 중앙 카피 */
    var center=''
      + '<div class="hub-center">'
      +   '<div class="hub-eyebrow">CONVICTION</div>'
      +   '<h2 class="hub-headline">The companies<br/>I actually own.</h2>'
      +   '<p class="hub-lede">Every position in my portfolio — their official sites, filings, and stories, one hover away.</p>'
      +   '<p class="hub-lede-kr">카드에 마우스를 올리면 펼쳐지고, 클릭하면 공식 홈페이지로 이동합니다.</p>'
      + '</div>';

    /* 노드(축소 카드) */
    var nodes='';
    for(var n=0;n<data.length;n++){
      var c=data[n], pos=posOf(c,n);
      var side = pos[0]<50 ? 'r' : 'l';                 /* 팝업은 항상 좌/우로 (브릿지 정렬) */
      var vert = pos[1]<34 ? 'vt' : (pos[1]>66 ? 'vb' : 'vm');  /* 세로는 정렬만 */
      var thumb = c.bg
        ? '<span class="hn-img" style="background-image:url(\'' + esc(c.bg) + '\')"></span>'
        : '<span class="hn-img hn-img-plain"></span>';
      var mini = c.dom
        ? '<img class="hn-logo" src="https://www.google.com/s2/favicons?domain='+esc(c.dom)+'&sz=64" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
        : '';
      var logoBig = c.dom ? '<img src="https://unavatar.io/'+esc(c.dom)+'?fallback=false" alt="" onerror="if(!this.__f){this.__f=1;this.src=\'https://www.google.com/s2/favicons?domain='+esc(c.dom)+'&sz=128\';}else{this.style.display=\'none\';}">' : '';
      var bgs = c.bg ? 'background-image:url(\'' + esc(c.bg) + '\')' : '';
      var cvar = c.color ? '--comp-hi:'+esc(c.color)+';' : '';
      nodes+='<div class="hub-node hn-'+side+' hn-'+vert+'" style="left:'+pos[0]+'%;top:'+pos[1]+'%;'+cvar+'--d:'+(n*0.42).toFixed(2)+'s;--dur:'+(8+(n%6)*1.4).toFixed(1)+'s" data-i="'+n+'">'
        + '<div class="hn-tile">'+thumb+mini+'</div>'
        + '<div class="hn-name">'+esc(c.name)+'</div>'
        + '<div class="hn-pop">'
        +   '<div class="comp-card is-visible">'
        +     '<div class="comp-bg" style="'+bgs+'"></div>'
        +     '<div class="comp-logo">'+logoBig+'</div>'
        +     '<div class="comp-content">'
        +       '<div class="comp-tag">'+esc(c.tag)+'</div>'
        +       '<div class="comp-name">'+esc(c.name)+'</div>'
        +       '<div class="comp-desc">'+esc(c.desc)+'</div>'
        +       '<a href="'+esc(c.url)+'" target="_blank" rel="noopener" class="comp-btn">홈페이지 <span class="cb-arrow">&#10142;</span></a>'
        +     '</div>'
        +   '</div>'
        + '</div>'
        + '</div>';
    }

    stage.innerHTML='<svg class="hub-lines" viewBox="0 0 100 100" preserveAspectRatio="none">'+lines+'</svg>'+center+nodes;
    var gridEl=sec.querySelector('.company-grid');
    if(gridEl) sec.insertBefore(stage, gridEl); else sec.appendChild(stage);
    initHubExpand(sec);
  }

  /* ── 스크롤 단계 확장: 안쪽 라운드 박스 → 화면 가득 (Anthropic 방식) ── */
  function initHubExpand(sec){
    if(sec.__expandBound) return;
    sec.__expandBound=true;
    var raf=null;
    var curStep=-1;
    function apply(){
      raf=null;
      var r=sec.getBoundingClientRect(), vh=window.innerHeight||800, vw=window.innerWidth||1200;
      var p=1-(r.top-vh*0.02)/(vh*0.78);
      p=Math.max(0,Math.min(1,p));
      /* 딱 2번에 걸쳐 확장: 0단계(기본) → 1단계 → 2단계(가득) · 히스테리시스로 떨림 방지 */
      var step=curStep<0?0:curStep;
      if(p>0.30) step=Math.max(step,1);
      if(p<0.22) step=Math.min(step,0);
      if(p>0.62) step=2;
      if(p<0.52) step=Math.min(step,1);
      if(step===curStep) return;
      curStep=step;
      var W=[Math.min(1080,vw-72), Math.min(1340,vw-32), vw];
      var R=[30,18,0], PX=[24,44,64];
      sec.style.setProperty('width',W[step].toFixed(0)+'px','important');
      sec.style.setProperty('max-width','none','important');
      sec.style.setProperty('border-radius',R[step]+'px','important');
      sec.style.setProperty('padding-left',PX[step]+'px','important');
      sec.style.setProperty('padding-right',PX[step]+'px','important');
      sec.style.setProperty('--hubP', step===0?'0':(step===1?'0.6':'1'));
      sec.classList.remove('hub-step-0','hub-step-1','hub-step-2');
      sec.classList.add('hub-step-'+step);
    }
    function onScroll(){ if(!raf) raf=requestAnimationFrame(apply); }
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('resize',onScroll);
    apply();
  }

  function render(){
    var grid=document.getElementById('hubGrid'); if(!grid) return;
    var data=load();
    var sec=grid.closest('.company-section');
    if(sec){ sec.classList.add('hub-section'); sec.classList.toggle('hub-editing-mode', !!hubEdit); }
    if(!hubEdit){ grid.innerHTML=''; buildStage(sec, data); return; }
    removeStage(sec);
    var h='';
    for(var i=0;i<data.length;i++){
      var c=data[i];
      var logo = c.dom ? '<img src="https://unavatar.io/'+esc(c.dom)+'?fallback=false" alt="" onerror="if(!this.__f){this.__f=1;this.src=\'https://www.google.com/s2/favicons?domain='+esc(c.dom)+'&sz=128\';}else{this.style.display=\'none\';}">' : '';
      var bg = c.bg ? 'background-image:url(\''+esc(c.bg)+'\')' : '';
      var cvar = c.color ? ' style="--comp-hi:'+esc(c.color)+'"' : '';
      h+='<div class="comp-card is-visible'+(hubEdit?' hub-editing':'')+'" data-i="'+i+'"'+cvar+(hubEdit?' draggable="true"':'')+'>'
        + '<div class="comp-bg" style="'+bg+'"></div>'
        + '<div class="comp-logo">'+logo+'</div>'
        + '<div class="comp-content">'
        + '<div class="comp-tag">'+esc(c.tag)+'</div>'
        + '<div class="comp-name">'+esc(c.name)+'</div>'
        + '<div class="comp-desc">'+esc(c.desc)+'</div>'
        + (hubEdit?'':'<a href="'+esc(c.url)+'" target="_blank" rel="noopener" class="comp-btn">홈페이지 <span class="cb-arrow">&#10142;</span></a>')
        + '</div>'
        + (hubEdit?'<div class="hub-card-ctrl"><button type="button" class="hub-cc-edit" onclick="window.hubEditCard('+i+')">✎</button><button type="button" class="hub-cc-del" onclick="window.hubDelCard('+i+')">✕</button></div>':'')
        + '</div>';
    }
    if(hubEdit){
      h+='<button type="button" class="comp-card is-visible hub-add-card" onclick="window.hubAddCard()"><div class="hub-add-inner"><span class="hub-add-plus">＋</span><span class="hub-add-txt">기업 추가</span></div></button>';
    }
    grid.innerHTML=h;
    if(hubEdit) bindDrag(grid);
  }

  function bindDrag(grid){
    var dragEl=null;
    grid.classList.add('hub-drag-live');
    var cards=grid.querySelectorAll('.comp-card[draggable="true"]');
    cards.forEach(function(card){
      card.addEventListener('dragstart',function(e){ dragEl=card; card.classList.add('hub-drag'); e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain',''); }catch(_){} });
      card.addEventListener('dragend',function(){ if(dragEl) dragEl.classList.remove('hub-drag'); dragEl=null; commitOrder(grid); });
    });
    /* 그리드 전역 dragover: 마우스 위치 기준으로 dragEl을 실시간 재배치 → 다른 카드가 비켜남 */
    grid.addEventListener('dragover',function(e){
      e.preventDefault();
      if(!dragEl) return;
      var after=getDragAfter(grid, e.clientX, e.clientY);
      if(after==null){ var addBtn=grid.querySelector('.hub-add-card'); if(addBtn) grid.insertBefore(dragEl, addBtn); else grid.appendChild(dragEl); }
      else grid.insertBefore(dragEl, after);
    });
  }
  function getDragAfter(grid, x, y){
    var els=[].slice.call(grid.querySelectorAll('.comp-card[draggable="true"]:not(.hub-drag)'));
    var closest={dist:-Infinity, el:null};
    for(var i=0;i<els.length;i++){
      var b=els[i].getBoundingClientRect();
      var oy=y-(b.top+b.height/2), ox=x-(b.left+b.width/2);
      /* 같은 행 우선: y가 카드 범위 안이면 x로 판단 */
      var offset = (y < b.bottom && y > b.top) ? ox : (oy<0? -1e9 : 1e9);
      if(offset<0 && offset>closest.dist){ closest={dist:offset, el:els[i]}; }
    }
    return closest.el;
  }
  function commitOrder(grid){
    var order=[].slice.call(grid.querySelectorAll('.comp-card[draggable="true"]')).map(function(el){ return parseInt(el.getAttribute('data-i')); });
    var data=load(); var newData=order.map(function(i){ return data[i]; }).filter(Boolean);
    if(newData.length===data.length){ save(newData); render(); }
  }

  var hubSnapshot=null;
  window.hubToggleEdit=function(){
    hubEdit=!hubEdit;
    var b=document.getElementById('hubEditToggle'), cb=document.getElementById('hubCancelBtn');
    if(hubEdit){ hubSnapshot=JSON.stringify(load()); }
    if(b){ b.textContent=hubEdit?'✓ 완료':'✎ 편집'; b.classList.toggle('on',hubEdit); }
    if(cb){ cb.style.display=hubEdit?'':'none'; }
    if(!hubEdit && hubSnapshot){ window.__nnToast('✓ 변경사항이 저장되었습니다'); hubSnapshot=null; }
    render();
  };
  window.hubCancelEdit=function(){
    if(hubSnapshot!=null){ try{ localStorage.setItem(HUB_KEY, hubSnapshot); }catch(e){} }
    hubSnapshot=null; hubEdit=false;
    var b=document.getElementById('hubEditToggle'), cb=document.getElementById('hubCancelBtn');
    if(b){ b.textContent='✎ 편집'; b.classList.remove('on'); }
    if(cb){ cb.style.display='none'; }
    window.__nnToast('↩ 편집을 취소했습니다');
    render();
  };
  window.hubDelCard=function(i){ var data=load(); if(!data[i]) return; var removed=data[i], pos=i; data.splice(i,1); save(data); render(); window.__nnToast('🗑 "'+removed.name+'" 삭제됨', {kind:'del', undo:function(){ var d=load(); d.splice(pos,0,removed); save(d); render(); window.__nnToast('↩ 복원되었습니다'); }}); };
  window.hubAddCard=function(){ hubOpenModal(-1); };
  window.hubEditCard=function(i){ hubOpenModal(i); };

  window.hubShowImgHelp=function(ev){ ev.stopPropagation();
    hubHelpPop(ev.currentTarget, '🖼️ 배경 이미지 넣는 법',
      '<div class="hhp-step"><b>1.</b> 원하는 이미지를 웹에서 찾습니다 (<a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a>·<a href="https://www.google.com/search?tbm=isch" target="_blank" rel="noopener">구글 이미지</a> 등).</div>'
     +'<div class="hhp-step"><b>2.</b> 이미지 위에서 <b>우클릭 → 이미지 주소 복사</b>를 누릅니다.</div>'
     +'<div class="hhp-step"><b>3.</b> 복사한 주소(https://…jpg/png 등)를 이 칸에 붙여넣습니다.</div>'
     +'<div class="hhp-tip">💡 비워두면 기본 배경이 적용됩니다.</div>');
  };
  window.hubShowLogoHelp=function(ev){ ev.stopPropagation();
    hubHelpPop(ev.currentTarget, '🏢 로고 자동 표시',
      '<div class="hhp-step">기업 <b>홈페이지 도메인</b>만 적으면 로고가 자동으로 표시됩니다.</div>'
     +'<div class="hhp-step">예: <b>tesla.com</b>, <b>nvidia.com</b>, <b>apple.com</b></div>'
     +'<div class="hhp-tip">💡 "https://"나 "www."는 빼고 도메인만 적어도 됩니다.</div>');
  };
  function hubClosePop(){
    var p=document.getElementById('hubHelpPop');
    if(p){ p.classList.remove('show'); setTimeout(function(){ if(p.parentNode) p.remove(); },170); }
    hubHelpPop._owner=null;
  }
  function hubHelpPop(anchorEl, title, body){
    var existing=document.getElementById('hubHelpPop');
    /* 같은 버튼을 다시 누르면 토글(닫기) */
    if(existing && hubHelpPop._owner===anchorEl){ hubClosePop(); return; }
    if(existing) existing.remove();
    var pop=document.createElement('div'); pop.id='hubHelpPop'; pop.className='hub-help-pop';
    pop.innerHTML='<div class="hhp-title">'+title+'</div>'+body;
    document.body.appendChild(pop);
    hubHelpPop._owner=anchorEl;
    var r=anchorEl.getBoundingClientRect();
    var pw=270, ph=pop.offsetHeight;
    var left=r.left, top=r.bottom+8;
    if(left+pw>window.innerWidth-10) left=window.innerWidth-10-pw;
    if(top+ph>window.innerHeight-10) top=r.top-ph-8;
    pop.style.left=Math.max(10,left)+'px'; pop.style.top=Math.max(10,top)+'px';
    requestAnimationFrame(function(){ pop.classList.add('show'); });
    /* 마우스가 팝업에 들어왔다 나가면 페이드아웃 */
    var entered=false;
    pop.addEventListener('mouseenter', function(){ entered=true; });
    pop.addEventListener('mouseleave', function(){ if(entered) hubClosePop(); });
    /* 바깥 클릭 시 닫기 */
    setTimeout(function(){
      document.addEventListener('click', function close(e){ var pp=document.getElementById('hubHelpPop'); if(!pp){ document.removeEventListener('click',close); return; } if(!pp.contains(e.target) && e.target!==anchorEl){ hubClosePop(); document.removeEventListener('click',close); } });
    },0);
  }
  function hubOpenModal(idx){
    var data=load();
    var c = idx>=0 ? data[idx] : {url:'',dom:'',tag:'',name:'',desc:'',bg:''};
    var ov=document.getElementById('hubModal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='hubModal'; ov.className='hub-modal-ov';
    ov.innerHTML='<div class="hub-modal">'
      +'<div class="hm-title">'+(idx>=0?'기업 카드 수정':'기업 카드 추가')+'</div>'
      +'<label class="hm-lb">기업명 (영문)</label><input class="hm-in" id="hmName" value="'+esc(c.name)+'" placeholder="예: TESLA">'
      +'<label class="hm-lb">태그 (분야)</label><input class="hm-in" id="hmTag" value="'+esc(c.tag)+'" placeholder="예: AI Computing Platform">'
      +'<label class="hm-lb">설명 (한글)</label><input class="hm-in" id="hmDesc" value="'+esc(c.desc)+'" placeholder="예: AI 반도체 선두 기업">'
      +'<label class="hm-lb">홈페이지 URL</label><input class="hm-in" id="hmUrl" value="'+esc(c.url)+'" placeholder="https://...">'
      +'<label class="hm-lb">로고 도메인 <span class="hm-hint">(로고 자동 표시)</span> <button type="button" class="hm-help-btn" onclick="window.hubShowLogoHelp(event)">?</button></label><input class="hm-in" id="hmDom" value="'+esc(c.dom)+'" placeholder="예: tesla.com">' 
      +'<label class="hm-lb">배경 이미지 URL <span class="hm-hint">(선택)</span> <button type="button" class="hm-help-btn" onclick="window.hubShowImgHelp(event)">?</button></label><input class="hm-in" id="hmBg" value="'+esc(c.bg)+'" placeholder="https://... (비우면 기본 배경)">' 
      +'<label class="hm-lb">상징 색상 <span class="hm-hint">(마우스 올릴 때 기업명 색)</span></label>'
      +'<div class="hm-color-row" id="hmColorRow">'
      +   ['#ff4444','#9cf500','#33ffcc','#ffffff','#66f0ff','#73a5ff','#be9eff','#ff9e80','#ffd24a','#4ae0a8'].map(function(col){ return '<button type="button" class="hm-sw'+(c.color===col?' sel':'')+'" data-col="'+col+'" style="background:'+col+'"></button>'; }).join('')
      +   '<input type="color" class="hm-color-pick" id="hmColorPick" value="'+(c.color&&/^#[0-9a-fA-F]{6}$/.test(c.color)?c.color:'#c9a96e')+'">'
      +'</div>'
      +'<label class="hm-lb">스테이지 위치 <span class="hm-hint">(비우면 자동 배치 · 0~100 %)</span></label>'
      +'<div class="hm-pos-row">'
      +   '<span class="hm-pos-lb">가로 X</span><input class="hm-in hm-pos" id="hmPx" type="number" min="0" max="100" value="'+(c.px!=null?c.px:'')+'" placeholder="자동">'
      +   '<span class="hm-pos-lb">세로 Y</span><input class="hm-in hm-pos" id="hmPy" type="number" min="0" max="100" value="'+(c.py!=null?c.py:'')+'" placeholder="자동">'
      +'</div>'
      +'<div class="hm-pos-hint">가운데 글씨 영역(가로 30~70 · 세로 33~67)은 피해서 지정하세요.</div>'
      +'<div class="nn-storage-bar" style="margin-top:10px"></div>'
      +'<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button><button type="button" class="hm-btn hm-save">저장</button></div>'
      +'</div>';
    document.body.appendChild(ov);
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    ov.querySelector('.hm-cancel').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    /* 색 선택 */
    var selColor = c.color || '';
    var swRow=ov.querySelector('#hmColorRow');
    swRow.querySelectorAll('.hm-sw').forEach(function(sw){
      sw.onclick=function(){ selColor=sw.getAttribute('data-col'); swRow.querySelectorAll('.hm-sw').forEach(function(x){x.classList.remove('sel');}); sw.classList.add('sel'); };
    });
    ov.querySelector('#hmColorPick').oninput=function(){ selColor=this.value; swRow.querySelectorAll('.hm-sw').forEach(function(x){x.classList.remove('sel');}); };
    ov.querySelector('.hm-save').onclick=function(){
      var __bg=(ov.querySelector('#hmBg').value||'').trim();
      if(__bg && window.__nnCheckImgUrl){ var __c=window.__nnCheckImgUrl(__bg); if(!__c.ok) return; __bg=__c.url; }
      function __num(el){ var v=(el&&el.value||'').trim(); if(v==='') return null; var n=parseFloat(v); return isNaN(n)?null:Math.max(0,Math.min(100,n)); }
      var nc={ name:ov.querySelector('#hmName').value.trim(), tag:ov.querySelector('#hmTag').value.trim(), desc:ov.querySelector('#hmDesc').value.trim(), url:ov.querySelector('#hmUrl').value.trim(), dom:ov.querySelector('#hmDom').value.trim().replace(/^https?:\/\//,'').replace(/\/.*$/,''), bg:__bg, color:selColor,
        px:__num(ov.querySelector('#hmPx')), py:__num(ov.querySelector('#hmPy')) };
      if(!nc.name){ alert('기업명을 입력하세요.'); return; }
      var d=load();
      if(idx>=0) d[idx]=nc; else d.push(nc);
      save(d); close(); render();
    };
    requestAnimationFrame(function(){ ov.classList.add('show'); if(window.__nnRenderStorage) window.__nnRenderStorage(); ov.querySelector('#hmName').focus(); });
  }

  /* 초기 렌더 + 클라우드 복원 후 재렌더 대응 */
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',render); else render();
  window.__hubRender=render;
})();


/* ══════════ REFERENCE DESK — 편집 가능 (레인·칩 추가·수정·삭제·드래그, 클라우드 동기화) ══════════ */
(function(){
  var RD_KEY='nn_refdesk_v1';
  /* 1회 마이그레이션: REAL ESTATE 레인에 재산세 계산기 추가 */
  (function(){
    try{
      if(localStorage.getItem('nn_rd_mig_tax')==='1') return;
      var raw=localStorage.getItem(RD_KEY);
      if(raw){
        var l=JSON.parse(raw);
        if(Array.isArray(l)){
          var lane=l.find(function(x){ return String(x.label||'').toUpperCase().indexOf('REAL')>=0; });
          if(lane && Array.isArray(lane.chips)){
            var exists=lane.chips.some(function(c){ return String(c.url||'').indexOf('xn--989a00a691bdfa717h')>=0; });
            if(!exists){
              lane.chips.push({url:'https://xn--989a00a691bdfa717h.com/%EC%9E%AC%EC%82%B0%EC%84%B8%EA%B3%84%EC%82%B0%EA%B8%B0',name:'재산세 계산기',desc:'주택 · 토지 · 상가 세액'});
              localStorage.setItem(RD_KEY, JSON.stringify(l));
            }
          }
        }
      }
      localStorage.setItem('nn_rd_mig_tax','1');
    }catch(e){}
  })();
  /* 1회 마이그레이션: INTELLIGENCE 레인에 App Economy Insights 추가 */
  (function(){
    try{
      if(localStorage.getItem('nn_rd_mig_aei')==='1') return;
      var raw=localStorage.getItem(RD_KEY);
      if(raw){
        var l=JSON.parse(raw);
        if(Array.isArray(l)){
          var lane=l.find(function(x){ return String(x.label||'').toUpperCase().indexOf('INTELLIGENCE')>=0; });
          if(lane && Array.isArray(lane.chips)){
            var exists=lane.chips.some(function(c){ return String(c.url||'').indexOf('appeconomyinsights')>=0; });
            if(!exists){
              lane.chips.push({url:'https://www.appeconomyinsights.com/',name:'App Economy Insights',desc:'기업 수익구조 인포그래픽'});
              localStorage.setItem(RD_KEY, JSON.stringify(l));
            }
          }
        }
      }
      localStorage.setItem('nn_rd_mig_aei','1');
    }catch(e){}
  })();
  var RD_SEED=[
    {label:'EQUITY',chips:[
      {url:'https://www.google.com/finance/beta',name:'Google Finance',desc:'글로벌 시세 플랫폼'},
      {url:'https://finance.yahoo.com/',name:'Yahoo Finance',desc:'글로벌 시세 플랫폼'},
      {url:'https://seekingalpha.com/',name:'Seeking Alpha',desc:'글로벌 퀀트 · 어닝'},
      {url:'https://finviz.com/',name:'Finviz',desc:'Heatmap'},
      {url:'https://kr.tradingview.com/',name:'TradingView',desc:'차트 · 지표'},
      {url:'https://stockanalysis.com/watchlist/',name:'StockAnalysis',desc:'PT 탐색'},
      {url:'https://finbox.com/',name:'Finbox',desc:'적정 주가 모델링'},
      {url:'https://fanding.kr/feeds',name:'팬딩',desc:'투자 커뮤니티'},
      {url:'https://padorbubu.com/',name:'파돌부부',desc:'아이렌 분석'},
      {url:'https://www.dataroma.com/',name:'Dataroma',desc:'고래 포트폴리오'},
    ]},
    {label:'ETF & FLOW',chips:[
      {url:'https://www.etf.com/',name:'ETF.com',desc:'미국 ETF 상세 분석'},
      {url:'https://kind.krx.co.kr/',name:'KIND 한국거래소',desc:'국내 자금 동향 · 공매도'},
      {url:'https://timeetf.co.kr/m11_view.php?idx=6&cate=001',name:'TIMEFOLIO AI ETF',desc:'구성종목 참고'},
    ]},
    {label:'RESEARCH',chips:[
      {url:'https://consensus.hankyung.com/analysis/list?skinType=industry',name:'한경 컨센서스',desc:'국내외 리포트 통합'},
      {url:'https://www.hankyung.com/globalmarket/usa-stock-nasdaq100',name:'한경 글로벌마켓',desc:'S&P500·나스닥'},
      {url:'https://securities.miraeasset.com/',name:'미래에셋 리서치',desc:'글로벌 투자 전략'},
      {url:'https://www1.kiwoom.com/h/invest/research/VAnalCCView?dummyVal=0',name:'키움증권 리서치',desc:'해외기업 분석'},
      {url:'https://www.hanaw.com/main/research/research/RC_080000_P.cmd?tabIdx=3',name:'하나증권 리서치',desc:'산업 및 매크로'},
      {url:'https://www.myasset.com/myasset/research/rs_list/rs_list.cmd?cd006=&cd007=RE02&cd008=&searchKeyGubun=&keyword=&jongMok_keyword=&keyword_in=&startCalendar=&endCalendar=&pgCnt=&page=1#spot',name:'유안타증권 리서치',desc:'글로벌 인더스트리'},
    ]},
    {label:'REAL ESTATE',chips:[
      {url:'https://land.naver.com/',name:'네이버 부동산',desc:'실거래가 · 시세'},
      {url:'https://kbland.kr/',name:'KB부동산',desc:'매물 통계 · 시세'},
      {url:'https://asil.kr/',name:'아실',desc:'아파트 빅데이터 분석'},
      {url:'https://xn--989a00a691bdfa717h.com/%EC%9E%AC%EC%82%B0%EC%84%B8%EA%B3%84%EC%82%B0%EA%B8%B0',name:'재산세 계산기',desc:'주택 · 토지 · 상가 세액'},
    ]},
    {label:'MACRO',chips:[
      {url:'https://www.saveticker.com/login',name:'오선 Save',desc:'실시간 뉴스'},
      {url:'https://kr.investing.com/',name:'Investing.com',desc:'실시간 속보 · 캘린더'},
      {url:'https://polymarket.com/ko',name:'Polymarket',desc:'예측 시장'},
      {url:'https://edition.cnn.com/markets/fear-and-greed',name:'Fear & Greed',desc:'CNN 공포탐욕지수'},
      {url:'https://www.forbes.com/real-time-billionaires/',name:'Forbes 부자 순위',desc:'글로벌 부자 순위'},
      {url:'https://companiesmarketcap.com/',name:'Market Cap Rank',desc:'시가총액 랭킹'},
      {url:'https://x.com/home',name:'X',desc:'Raw data & Article'},
      {url:'https://truthsocial.com/@realDonaldTrump',name:'Truth Social',desc:'트럼프 피드'},
      {url:'https://fred.stlouisfed.org/',name:'FRED',desc:'연준 경제 통계 데이터'},
      {url:'https://tradingeconomics.com/',name:'Trading Economics',desc:'글로벌 지표 캘린더'},
      {url:'https://ecos.bok.or.kr/',name:'ECOS 한국은행',desc:'국내 거시경제 지표'},
    ]},
    {label:'CRYPTO',chips:[
      {url:'https://cryptoquant.com/',name:'CryptoQuant',desc:'기관급 온체인 데이터'},
      {url:'https://coinmarketcap.com/ko/',name:'CoinMarketCap',desc:'글로벌 시세 · 점유율'},
      {url:'https://defillama.com/',name:'DefiLlama',desc:'디파이 TVL 자금 추적'},
    ]},
    {label:'INTELLIGENCE',chips:[
      {url:'http://openinsider.com/',name:'Open Insider',desc:'내부자 거래 추적'},
      {url:'https://shortvolume.com/index.php?t=GOOG',name:'Short Volume',desc:'공매도 데이터'},
      {url:'https://www.sec.gov/edgar/search/',name:'SEC EDGAR',desc:'미국 기업 공시 원문'},
      {url:'https://dart.fss.or.kr/',name:'DART 전자공시',desc:'국내 기업 공시 원문'},
      {url:'https://www.visualcapitalist.com/',name:'Visual Capitalist',desc:'글로벌 인포그래픽'},
      {url:'https://www.appeconomyinsights.com/',name:'App Economy Insights',desc:'기업 수익구조 인포그래픽'},
    ]},
  ];
  var rdEdit=false, dragChip=null; /* {lane,idx} */
  function load(){ try{ var s=localStorage.getItem(RD_KEY); if(s){ var a=JSON.parse(s); if(Array.isArray(a)) return a; } }catch(e){} return JSON.parse(JSON.stringify(RD_SEED)); }
  function save(a){ try{ localStorage.setItem(RD_KEY, JSON.stringify(a)); }catch(e){} }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function render(){
    var host=document.getElementById('rdLanes'); if(!host) return;
    var data=load(); var h='';
    for(var li=0;li<data.length;li++){
      var lane=data[li];
      h+='<div class="ref-lane is-visible" data-lane="'+li+'">';
      h+='<div class="ref-lane-label">'+esc(lane.label)
        + (rdEdit?'<span class="rd-lane-ctrl"><button type="button" onclick="window.rdEditLane('+li+')">✎</button><button type="button" onclick="window.rdDelLane('+li+')">✕</button></span>':'')
        + '</div>';
      h+='<div class="ref-lane-chips">';
      for(var ci=0;ci<lane.chips.length;ci++){
        var c=lane.chips[ci];
        if(rdEdit){
          h+='<div class="ref-chip rd-chip-edit" draggable="true" data-lane="'+li+'" data-idx="'+ci+'">'
            +'<span class="rc-name">'+esc(c.name)+'</span><span class="rc-desc">'+esc(c.desc)+'</span>'
            +'<span class="rd-chip-ctrl"><button type="button" onclick="window.rdEditChip('+li+','+ci+')">✎</button><button type="button" onclick="window.rdDelChip('+li+','+ci+')">✕</button></span>'
            +'</div>';
        } else {
          h+='<a href="'+esc(c.url)+'" target="_blank" rel="noopener" class="ref-chip">'
            +'<span class="rc-name">'+esc(c.name)+'</span><span class="rc-desc">'+esc(c.desc)+'</span></a>';
        }
      }
      if(rdEdit){ h+='<button type="button" class="ref-chip rd-add-chip" onclick="window.rdAddChip('+li+')">＋ 링크 추가</button>'; }
      h+='</div></div>';
    }
    if(rdEdit){ h+='<button type="button" class="rd-add-lane" onclick="window.rdAddLane()">＋ 카테고리 추가</button>'; }
    host.innerHTML=h;
    if(rdEdit) bindDrag(host);
    try{ if(window.__rdBindLaneDrag) window.__rdBindLaneDrag(); }catch(e){}
    observeLanes(host);
    renderShowcase();
    applyView();
  }

  /* 레인이 화면에 들어오면 칩들이 순차적으로 떠오르며 등장 */
  function observeLanes(host){
    var lanes=host.querySelectorAll('.ref-lane');
    if(!('IntersectionObserver' in window)){ lanes.forEach(function(l){ l.classList.add('rl-in'); l.querySelectorAll('.ref-chip').forEach(function(ch){ ch.classList.add('rc-done'); }); }); return; }
    function markDone(lane){
      setTimeout(function(){
        lane.querySelectorAll('.ref-chip').forEach(function(ch){ ch.classList.add('rc-done'); });
      }, 1000);
    }
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('rl-in'); markDone(e.target); io.unobserve(e.target); } });
    },{root:null,rootMargin:'0px 0px -8% 0px',threshold:0.15});
    lanes.forEach(function(l){ io.observe(l); });
  }

  function bindDrag(host){
    var dragEl=null;
    host.querySelectorAll('.rd-chip-edit').forEach(function(ch){
      ch.addEventListener('dragstart',function(e){ dragEl=ch; ch.classList.add('hub-drag'); e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain',''); }catch(_){} });
      ch.addEventListener('dragend',function(){ if(dragEl) dragEl.classList.remove('hub-drag'); dragEl=null; commitChipOrder(host); });
    });
    /* 각 레인의 칩 영역에서 실시간 재배치 (레인 간 이동도 지원) */
    host.querySelectorAll('.ref-lane-chips').forEach(function(zone){
      zone.addEventListener('dragover',function(e){
        e.preventDefault();
        if(!dragEl) return;
        var after=getChipAfter(zone, e.clientX, e.clientY);
        if(after==null){ var addBtn=zone.querySelector('.rd-add-chip'); if(addBtn) zone.insertBefore(dragEl, addBtn); else zone.appendChild(dragEl); }
        else zone.insertBefore(dragEl, after);
      });
    });
  }
  function getChipAfter(zone, x, y){
    var els=[].slice.call(zone.querySelectorAll('.rd-chip-edit:not(.hub-drag)'));
    var closest={dist:-Infinity, el:null};
    for(var i=0;i<els.length;i++){
      var b=els[i].getBoundingClientRect();
      var offset = (y < b.bottom && y > b.top) ? (x-(b.left+b.width/2)) : ((y<(b.top+b.height/2))? -1e9 : 1e9);
      if(offset<0 && offset>closest.dist){ closest={dist:offset, el:els[i]}; }
    }
    return closest.el;
  }
  function commitChipOrder(host){
    var data=load();
    var lanes=[].slice.call(host.querySelectorAll('.ref-lane'));
    var newData=[];
    lanes.forEach(function(laneEl){
      var li=parseInt(laneEl.getAttribute('data-lane'));
      var src=data[li]; if(!src) return;
      var chips=[].slice.call(laneEl.querySelectorAll('.rd-chip-edit')).map(function(ch){
        return data[parseInt(ch.getAttribute('data-lane'))].chips[parseInt(ch.getAttribute('data-idx'))];
      }).filter(Boolean);
      newData.push({label:src.label, chips:chips});
    });
    if(newData.length===data.length){ save(newData); render(); }
  }

  /* ══════════ 쇼케이스 뷰 (ASML 스타일 — 좌 타이포·카테고리 / 우 드래그 카드) ══════════ */
  var RD_VIEW_KEY='nn_rd_view_v1';
  var rdView=(function(){ try{ return localStorage.getItem(RD_VIEW_KEY)==='full'?'full':'show'; }catch(e){ return 'show'; } })();
  var rdCatScroll=0;
  var rdShowCat=0;
  function rdsThumb(u){ return 'https://s0.wp.com/mshots/v1/'+encodeURIComponent(u)+'?w=700&h=980'; }
  function rdsThumb2(u){ return 'https://image.thum.io/get/width/700/crop/980/noanimate/'+u; }
  function rdsFav(u){
    var host=''; try{ host=new URL(u).hostname; }catch(e){}
    return 'https://www.google.com/s2/favicons?domain='+encodeURIComponent(host)+'&sz=128';
  }
  /* 썸네일 실패 시 2차 서비스 → 그래도 실패하면 로고 폴백 */
  window.__rdsImgFail=function(img){
    var alt=img.getAttribute('data-alt');
    if(alt && !img.__tried){ img.__tried=1; img.src=alt; return; }
    var p=img.parentNode;
    if(p){ p.classList.add('rds-fb'); }
    img.remove();
  };
  function applyView(){
    var sc=document.getElementById('rdShowcase'), ln=document.getElementById('rdLanes');
    var vb=document.getElementById('rdViewToggle');
    var full = rdEdit || rdView==='full';
    if(sc) sc.style.display = full?'none':'';
    if(ln) ln.style.display = full?'':'none';
    var sec=sc?sc.closest('.ref-lane-section'):null;
    if(sec){ sec.classList.add('rd-bleed'); sec.classList.toggle('rd-bleed-full', full); }
    if(vb){
      vb.textContent = (rdView==='full') ? '▦ 쇼케이스' : '☰ 전체 목록';
      vb.style.display = rdEdit ? 'none' : '';
    }
  }
  window.rdToggleView=function(){
    rdView = (rdView==='full') ? 'show' : 'full';
    try{ localStorage.setItem(RD_VIEW_KEY, rdView); }catch(e){}
    applyView();
  };
  function renderShowcase(){
    var sc=document.getElementById('rdShowcase'); if(!sc) return;
    var data=load();
    if(!data.length){ sc.innerHTML=''; return; }
    if(rdShowCat>=data.length) rdShowCat=0;
    var lane=data[rdShowCat]||{chips:[]};
    var cats=data.map(function(l,i){
      return '<button type="button" class="rds-cat'+(i===rdShowCat?' on':'')+'" data-i="'+i+'">'
        + '<span class="rdc-i">'+String(i+1).padStart(2,'0')+'</span>'
        + '<span class="rdc-lb">'+esc(l.label||'')+'</span>'
        + '<span class="rds-cat-n">'+((l.chips||[]).length)+'</span></button>';
    }).join('');
    var cards=(lane.chips||[]).map(function(c){
      return '<a class="rds-card" href="'+esc(c.url)+'" target="_blank" rel="noopener" draggable="false">'
        + '<span class="rds-img"><img src="'+esc(rdsThumb(c.url))+'" data-alt="'+esc(rdsThumb2(c.url))+'" alt="" loading="lazy" draggable="false" onerror="window.__rdsImgFail(this)">'
        +   '<img class="rds-fav" src="'+esc(rdsFav(c.url))+'" alt="" loading="lazy" draggable="false" onerror="this.remove()"></span>'
        + '<span class="rds-meta"><span class="rds-name">'+esc(c.name||'')+'</span>'
        +   (c.desc?'<span class="rds-desc">'+esc(c.desc)+'</span>':'')
        +   '<span class="rds-dash"></span></span>'
        + '</a>';
    }).join('');
    var total=data.reduce(function(a,l){ return a+((l.chips||[]).length); },0);
    sc.innerHTML=
      '<div class="rds-left">'
      + '<h3 class="rds-head">Every source,<br>one desk.</h3>'
      + '<div class="rds-rule"></div>'
      + '<p class="rds-sub">' + data.length + ' categories · ' + total + ' sources</p>'
      + '</div>'
      + '<div class="rds-right">'
      +   '<div class="rds-cats">'+cats+'</div>'
      +   '<div class="rds-stage">'
      +     '<div class="rds-strip" id="rdsStrip">'+(cards||'<div class="rds-none">이 카테고리에는 아직 링크가 없습니다.</div>')+'</div>'
      +     '<div class="rds-hint" id="rdsHint" aria-hidden="true">'
      +       '<span class="rdsh-a rdsh-l">&#8592;</span>'
      +       '<span class="rdsh-hand"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      +         '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11"/>'
      +         '<path d="M15 11V6.5a1.5 1.5 0 0 1 3 0V13"/><path d="M9 11V9a1.5 1.5 0 0 0-3 0v5.5"/>'
      +         '<path d="M6 14.5c0 3.6 2.6 6.5 6 6.5s6-2.9 6-6.5"/></svg></span>'
      +       '<span class="rdsh-a rdsh-r">&#8594;</span>'
      +     '</div>'
      +   '</div>'
      + '</div>';
    /* 카테고리 줄의 가로 스크롤 위치 복원 (전환해도 목록이 처음으로 튀지 않도록) */
    var catRow=sc.querySelector('.rds-cats');
    if(catRow){
      if(typeof rdCatScroll==='number' && rdCatScroll>0){ catRow.scrollLeft=rdCatScroll; }
      catRow.addEventListener('scroll', function(){ rdCatScroll=catRow.scrollLeft; }, {passive:true});
    }
    sc.querySelectorAll('.rds-cat').forEach(function(b){
      b.onclick=function(){
        var row=sc.querySelector('.rds-cats');
        if(row) rdCatScroll=row.scrollLeft;
        rdShowCat=parseInt(b.getAttribute('data-i'),10)||0;
        renderShowcase();
        /* 선택한 카테고리가 화면 밖이면 부드럽게 그 위치만 맞춤 */
        var row2=sc.querySelector('.rds-cats');
        var act=row2 && row2.querySelector('.rds-cat.on');
        if(row2 && act){
          var l=act.offsetLeft, w=act.offsetWidth, vs=row2.scrollLeft, vw=row2.clientWidth;
          if(l < vs+8){ row2.scrollTo({left:Math.max(0,l-16), behavior:'smooth'}); }
          else if(l+w > vs+vw-8){ row2.scrollTo({left:l+w-vw+16, behavior:'smooth'}); }
        }
      };
    });
    var stripEl=document.getElementById('rdsStrip');
    bindStripDrag(stripEl);
    if(stripEl){
      try{ if(localStorage.getItem('nn_rds_hint')==='1') sc.querySelector('.rds-hint').classList.add('hid'); }catch(e){}
      var hideHint=function(){
        var h=sc.querySelector('.rds-hint'); if(h) h.classList.add('hid');
        try{ localStorage.setItem('nn_rds_hint','1'); }catch(e){}
      };
      stripEl.addEventListener('pointerdown',hideHint,{once:true});
      stripEl.addEventListener('scroll',hideHint,{once:true,passive:true});
    }
    bindStripDrag(sc.querySelector('.rds-cats'));
  }
  function bindStripDrag(st){
    if(!st || st.__drag) return; st.__drag=true;
    /* 세로 휠 → 가로 스크롤 */
    st.addEventListener('wheel',function(e){
      if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){
        var max=st.scrollWidth-st.clientWidth;
        if(max<=0) return;
        var next=st.scrollLeft+e.deltaY;
        if(next>0 && next<max){ e.preventDefault(); st.scrollLeft=next; }
      }
    },{passive:false});
    var down=false, sx=0, sl=0, moved=false, over=0;
    function springBack(){
      if(!over){ st.style.transform=''; st.style.transition=''; return; }
      over=0;
      st.style.transition='transform .72s cubic-bezier(.16,1.62,.36,1)';  /* 탄력 스프링 */
      st.style.transform='translateX(0)';
      setTimeout(function(){ st.style.transition=''; st.style.transform=''; }, 760);
    }
    st.addEventListener('pointerdown',function(e){
      down=true; moved=false; sx=e.clientX; sl=st.scrollLeft;
      st.classList.add('dragging');
      st.style.transition=''; /* 드래그 중엔 즉시 반응 */
    });
    window.addEventListener('pointermove',function(e){
      if(!down) return;
      var dx=e.clientX-sx;
      if(Math.abs(dx)>4) moved=true;
      var target=sl-dx, max=Math.max(0, st.scrollWidth-st.clientWidth), o=0;
      if(target<0){ o=target; st.scrollLeft=0; }
      else if(target>max){ o=target-max; st.scrollLeft=max; }
      else { st.scrollLeft=target; }
      if(o){
        /* 저항: 끌수록 둔해지고 최대 120px까지만 늘어남 */
        var mag=Math.min(Math.abs(o)*0.42, 120);
        over=(o<0?-1:1)*mag;
        st.style.transform='translateX('+(-over)+'px)';
      }else if(over){
        over=0; st.style.transform='';
      }
    });
    window.addEventListener('pointerup',function(){
      if(down){ down=false; st.classList.remove('dragging'); springBack(); }
    });
    window.addEventListener('pointercancel',function(){
      if(down){ down=false; st.classList.remove('dragging'); springBack(); }
    });
    st.addEventListener('click',function(e){ if(moved){ e.preventDefault(); e.stopPropagation(); moved=false; } },true);
  }

  var rdSnapshot=null;
  window.rdToggleEdit=function(){
    rdEdit=!rdEdit;
    var b=document.getElementById('rdEditToggle'), cb=document.getElementById('rdCancelBtn');
    if(rdEdit){ rdSnapshot=JSON.stringify(load()); }
    if(b){ b.textContent=rdEdit?'✓ 완료':'✎ 편집'; b.classList.toggle('on',rdEdit); }
    if(cb){ cb.style.display=rdEdit?'':'none'; }
    if(!rdEdit && rdSnapshot){ window.__nnToast('✓ 변경사항이 저장되었습니다'); rdSnapshot=null; }
    render();
  };
  window.rdCancelEdit=function(){
    if(rdSnapshot!=null){ try{ localStorage.setItem(RD_KEY, rdSnapshot); }catch(e){} }
    rdSnapshot=null; rdEdit=false;
    var b=document.getElementById('rdEditToggle'), cb=document.getElementById('rdCancelBtn');
    if(b){ b.textContent='✎ 편집'; b.classList.remove('on'); }
    if(cb){ cb.style.display='none'; }
    window.__nnToast('↩ 편집을 취소했습니다');
    render();
  };
  window.rdDelChip=function(l,i){ var d=load(); if(!d[l]||!d[l].chips[i]) return; var removed=d[l].chips[i], pl=l, pi=i; d[l].chips.splice(i,1); save(d); render(); window.__nnToast('🗑 "'+removed.name+'" 삭제됨', {kind:'del', undo:function(){ var dd=load(); if(dd[pl]){ dd[pl].chips.splice(pi,0,removed); save(dd); render(); window.__nnToast('↩ 복원되었습니다'); } }}); };
  window.rdAddChip=function(l){ rdChipModal(l,-1); };
  window.rdEditChip=function(l,i){ rdChipModal(l,i); };
  window.rdDelLane=function(l){ var d=load(); if(!d[l]) return; var removed=d[l], pos=l; d.splice(l,1); save(d); render(); window.__nnToast('🗑 "'+removed.label+'" 카테고리 삭제됨', {kind:'del', undo:function(){ var dd=load(); dd.splice(pos,0,removed); save(dd); render(); window.__nnToast('↩ 복원되었습니다'); }}); };
  window.rdAddLane=function(){
    var run=function(name){
      name=String(name||'').trim(); if(!name) return;
      var d=load(); d.push({label:name,chips:[]}); save(d); render();
      if(window.__nnToast) window.__nnToast('\u2713 "'+name+'" 카테고리를 추가했습니다');
    };
    if(window.__nnPrompt) window.__nnPrompt({
      title:'새 카테고리', label:'이름', value:'',
      placeholder:'예: EQUITY · MACRO · 리서치', required:true, onOk:run
    });
    else { var n=prompt('새 카테고리 이름:',''); if(n!==null) run(n); }
  };
  window.rdEditLane=function(l){
    var d=load(); if(!d[l]) return;
    var run=function(name){
      name=String(name||'').trim(); if(!name) return;
      var dd=load(); if(!dd[l]) return;
      dd[l].label=name; save(dd); render();
    };
    if(window.__nnPrompt) window.__nnPrompt({
      title:'카테고리 이름', label:'이름', value:d[l].label, required:true, onOk:run
    });
    else { var n=prompt('카테고리 이름 수정:',d[l].label); if(n!==null) run(n); }
  };

  /* ── 카테고리 순서 바꾸기 (끌어다 놓기) ── */
  /* 편집 모드 상태를 밖에서도 읽을 수 있게 (드래그 바인딩이 참조) */
  window.__rdIsEdit=function(){ return !!rdEdit; };

  window.rdMoveLane=function(from,to){
    var d=load();
    if(from===to || from<0 || to<0 || from>=d.length || to>=d.length) return;
    var it=d.splice(from,1)[0];
    d.splice(to,0,it);
    save(d); render();
  };
  function bindLaneDrag(){
    var host=document.getElementById('refDeskFull') || document;
    var lanes=host.querySelectorAll('.ref-lane');
    var dragIdx=null;
    lanes.forEach(function(el,i){
      var editing = window.__rdIsEdit ? window.__rdIsEdit() : false;
      if(!editing){ el.removeAttribute('draggable'); el.classList.remove('rd-drag-on'); return; }
      el.setAttribute('draggable','true');
      el.classList.add('rd-drag-on');
      el.ondragstart=function(e){
        dragIdx=i; el.classList.add('rd-dragging');
        try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', String(i)); }catch(x){}
      };
      el.ondragend=function(){
        dragIdx=null; el.classList.remove('rd-dragging');
        lanes.forEach(function(o){ o.classList.remove('rd-over'); });
      };
      el.ondragover=function(e){ e.preventDefault(); el.classList.add('rd-over'); };
      el.ondragleave=function(){ el.classList.remove('rd-over'); };
      el.ondrop=function(e){
        e.preventDefault(); el.classList.remove('rd-over');
        var from=dragIdx;
        if(from===null){ try{ from=parseInt(e.dataTransfer.getData('text/plain'),10); }catch(x){} }
        if(from===null || isNaN(from)) return;
        window.rdMoveLane(from, i);
      };
    });
  }
  window.__rdBindLaneDrag=bindLaneDrag;

  function rdChipModal(lane,idx){
    var d=load();
    var c = idx>=0 ? d[lane].chips[idx] : {url:'',name:'',desc:''};
    var ov=document.getElementById('rdModal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='rdModal'; ov.className='hub-modal-ov';
    ov.innerHTML='<div class="hub-modal">'
      +'<div class="hm-title">'+(idx>=0?'링크 수정':'링크 추가')+'</div>'
      +'<label class="hm-lb">이름</label><input class="hm-in" id="rcName" value="'+esc(c.name)+'" placeholder="예: Yahoo Finance">'
      +'<label class="hm-lb">설명</label><input class="hm-in" id="rcDesc" value="'+esc(c.desc)+'" placeholder="예: 글로벌 시세 플랫폼">'
      +'<label class="hm-lb">URL</label><input class="hm-in" id="rcUrl" value="'+esc(c.url)+'" placeholder="https://...">'
      +'<div class="nn-storage-bar" style="margin-top:10px"></div>'
      +'<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button><button type="button" class="hm-btn hm-save">저장</button></div>'
      +'</div>';
    document.body.appendChild(ov);
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    ov.querySelector('.hm-cancel').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    ov.querySelector('.hm-save').onclick=function(){
      var nc={ name:ov.querySelector('#rcName').value.trim(), desc:ov.querySelector('#rcDesc').value.trim(), url:ov.querySelector('#rcUrl').value.trim() };
      if(!nc.name){ alert('이름을 입력하세요.'); return; }
      var dd=load(); if(idx>=0) dd[lane].chips[idx]=nc; else dd[lane].chips.push(nc); save(dd); close(); render();
    };
    requestAnimationFrame(function(){ ov.classList.add('show'); if(window.__nnRenderStorage) window.__nnRenderStorage(); ov.querySelector('#rcName').focus(); });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',render); else render();
  window.__rdRender=render;
})();


/* ══════════════════════════════════════════════════════════════════════
   API 키 입력칸 — 내가 뭘 넣었는지 확인할 수 있게
   비밀번호처럼 가려진 칸에 '보기' 버튼을 붙인다.
   붙여넣기 실수(앞뒤 공백·줄바꿈·따옴표)도 저장 전에 정리한다.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  if(window.__nnKeyReveal) return;
  window.__nnKeyReveal = true;

  var TARGETS = ['#ecosKey', '#csKey', '#aptKey', '#fmpKeyMacro', '#workerUrlMacro', '#finnhubKey'];

  function attach(inp){
    if(!inp || inp.__rev) return;
    inp.__rev = true;

    /* 감싸는 상자 */
    var wrap = document.createElement('span');
    wrap.className = 'nn-keywrap';
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nn-keyeye';
    btn.setAttribute('data-tip', '입력한 내용 보기');
    btn.textContent = '보기';
    wrap.appendChild(btn);

    var shown = false;
    btn.onclick = function(e){
      e.preventDefault(); e.stopPropagation();
      shown = !shown;
      inp.type = shown ? 'text' : 'password';
      btn.textContent = shown ? '숨기기' : '보기';
      btn.classList.toggle('on', shown);
      btn.setAttribute('data-tip', shown ? '다시 가리기' : '입력한 내용 보기');
    };

    /* 글자 수를 보여 주면 붙여넣기가 제대로 됐는지 바로 안다 */
    var cnt = document.createElement('span');
    cnt.className = 'nn-keycnt';
    wrap.appendChild(cnt);
    function paintCnt(){
      var v = inp.value || '';
      cnt.textContent = v ? (v.length + '자') : '';
      cnt.classList.toggle('warn', /^\s|\s$|[\r\n"']/.test(v));
    }
    inp.addEventListener('input', paintCnt);
    paintCnt();

    /* 붙여넣기 직후 눈에 보이지 않는 문자를 정리한다 */
    inp.addEventListener('paste', function(){
      setTimeout(function(){
        var v = (inp.value || '');
        var cleaned = v.replace(/[\r\n\t]/g, '').replace(/^["'\s]+|["'\s]+$/g, '');
        if(cleaned !== v){
          inp.value = cleaned;
          paintCnt();
          if(window.__nnToast) window.__nnToast('붙여넣은 값의 공백·따옴표를 정리했습니다');
        }
      }, 10);
    });
  }

  function scan(){
    TARGETS.forEach(function(sel){
      document.querySelectorAll(sel).forEach(attach);
    });
  }
  scan();
  /* 나중에 그려지는 칸도 붙잡는다 */
  var n = 0;
  var iv = setInterval(function(){ scan(); if(++n > 40) clearInterval(iv); }, 500);
  document.addEventListener('click', function(){ setTimeout(scan, 300); }, true);
})();

/* ══════════ 배경화면 관리 (목록·이름편집·추가삭제·자동전환) ══════════ */
(function(){
  var LIST_KEY='nn_bg_list_v1', CUR_KEY='nn_site_bg_v1', AUTO_KEY='nn_bg_auto_v1';
  var DEFAULT_BGS=[
    {id:'trading', name:'Blue Gradient',          url:'https://i.postimg.cc/nzQf9kNm/pexels-tima-miroshnichenko-5912576.jpg'},
    {id:'bg7',     name:'White & Beige',          url:'https://i.postimg.cc/L89ZtPvt/pexels-steve-13934811.jpg'},
    {id:'bg3',     name:'Trading Room',           url:'https://i.postimg.cc/kgnRXDDf/pexels-thales13-38412413.jpg'},
    {id:'bg5',     name:'Ocean View',             url:'https://i.postimg.cc/905r3QvP/pexels-doruqpasha-38023373.jpg'},
    {id:'bg8',     name:'Olympic Park',           url:'https://i.postimg.cc/dQG7g6xN/pexels-annyshatalova-8573211.jpg'},
    {id:'bg9',     name:'Seoul Nightscape',       url:'https://i.postimg.cc/cLnPcKH3/pexels-ethan-brooke-1123775-5038998.jpg'},
    {id:'times',   name:'Times Square Night',     url:'https://images.pexels.com/photos/12729169/pexels-photo-12729169.jpeg'}
  ];
  /* 예전에 한글로 저장된 기본 배경 이름을 영문으로 되돌린다 */
  (function migrateBgNames(){
    try{
      if(localStorage.getItem('nn_bg_name_en_v1') === '1') return;
      var raw = localStorage.getItem(LIST_KEY);
      if(raw){
        var l = JSON.parse(raw);
        if(Array.isArray(l)){
          var MAP = {};
          DEFAULT_BGS.forEach(function(d){ MAP[d.id] = d.name; });
          var changed = false;
          l.forEach(function(it){
            if(it && MAP[it.id] && /[\uAC00-\uD7A3]/.test(String(it.name||''))){
              it.name = MAP[it.id]; changed = true;
            }
          });
          if(changed) localStorage.setItem(LIST_KEY, JSON.stringify(l));
        }
      }
      localStorage.setItem('nn_bg_name_en_v1','1');
    }catch(e){}
  })();

  function loadList(){
    try{ var s=localStorage.getItem(LIST_KEY); if(s){ var a=JSON.parse(s); if(Array.isArray(a)&&a.length) return a; } }catch(e){}
    return JSON.parse(JSON.stringify(DEFAULT_BGS));
  }
  function saveList(a){ try{ localStorage.setItem(LIST_KEY, JSON.stringify(a)); }catch(e){} }
  function current(){ try{ return localStorage.getItem(CUR_KEY)||'trading'; }catch(e){ return 'trading'; } }
  function autoMode(){ try{ return localStorage.getItem(AUTO_KEY)||'5'; }catch(e){ return '5'; } }
  /* 1회 마이그레이션: 자동 전환 기본값을 3분으로 */
  (function(){
    try{
      if(localStorage.getItem('nn_bg_auto_mig')==='1') return;
      var cur=localStorage.getItem(AUTO_KEY);
      if(!cur || cur==='off') localStorage.setItem(AUTO_KEY,'3');
      localStorage.setItem('nn_bg_auto_mig','1');
    }catch(e){}
  })();
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  /* ── 배경 렌더: 상시 2중 레이어(A/B) 크로스페이드 — 층위·캐스케이드 간섭 원천 차단 ── */
  var _bgA=null,_bgB=null,_bgActive=null;
  function ensureLayers(){
    if(_bgA&&_bgB) return;
    function mk(){
      var d=document.createElement('div');
      d.className='nn-bg-layer';
      d.style.cssText='position:fixed;top:0;left:0;z-index:-1;pointer-events:none;opacity:0;background-size:cover;background-position:center center;background-repeat:no-repeat';
      /* body>div{height:auto !important} 광역 패치 방어 — 인라인 !important로 치수 고정 */
      d.style.setProperty('width','100vw','important');
      d.style.setProperty('height','100vh','important');
      d.style.setProperty('max-height','100vh','important');
      document.body.appendChild(d); return d;
    }
    _bgA=mk(); _bgB=mk(); _bgActive=_bgA;
    document.documentElement.classList.add('bg-js'); /* 레이어 가동 → 의사요소 배경 투명화 (CSS 연동) */
  }
  function paintLayer(el,cssUrl){ el.style.backgroundImage='linear-gradient(rgba(10,10,14,0.02), rgba(6,6,8,0.05)), '+cssUrl; }
  /* rAF 수동 페이드 — CSS transition 의존 없이 매 프레임 직접 구동 (배칭·캐스케이드 무관) */
  function fadeIn(el,dur,done){
    el.style.transition='none';
    el.style.opacity='0';
    var t0=null;
    function step(ts){
      if(t0===null) t0=ts;
      var p=Math.min(1,(ts-t0)/dur);
      var e=p*p*(3-2*p); /* smoothstep */
      el.style.opacity=String(e);
      if(p<1) requestAnimationFrame(step);
      else if(done) done();
    }
    requestAnimationFrame(step);
  }
  function apply(id, fade){
    var list=loadList();
    var bg=list.find(function(b){return b.id===id;})||list[0];
    if(!bg) return;
    var cssUrl="url('"+bg.url+"')";
    if(!document.body){ document.documentElement.style.setProperty('--site-bg',cssUrl); return; } /* DOM 준비 전: 변수만 설정 (의사요소가 표시) — build()에서 재적용 */
    ensureLayers();
    if(!fade){
      document.documentElement.style.setProperty('--site-bg',cssUrl);
      paintLayer(_bgActive,cssUrl);
      _bgActive.style.opacity='1';
      ((_bgActive===_bgA)?_bgB:_bgA).style.opacity='0';
      var pim=new Image(); pim.src=bg.url;
      return;
    }
    var back=(_bgActive===_bgA)?_bgB:_bgA;
    var front=_bgActive;
    var started=false;
    function startFade(){
      if(started) return; started=true;
      paintLayer(back,cssUrl);
      document.body.appendChild(back);   /* 새 레이어를 항상 최상단으로 */
      _bgActive=back;
      fadeIn(back, 900, function(){
        front.style.opacity='0';         /* 완전히 덮인 뒤 이전 레이어 정리 */
        document.documentElement.style.setProperty('--site-bg',cssUrl);
      });
    }
    var im=new Image();
    im.onload=startFade;
    im.onerror=startFade;                /* 프리로드 실패해도 페이드 강행 (CSS 배경은 별도 로드) */
    im.src=bg.url;
    setTimeout(startFade, 1200);         /* 프리로드 지연 시에도 강행 */
  }
  function setBg(id){ try{ localStorage.setItem(CUR_KEY,id); }catch(e){} apply(id, true); renderMenu(); }
  /* 커맨드 팔레트용 전역 */
  window.__bgNext=function(){
    var l=loadList(); if(!l.length) return;
    var cur=current(), i=l.findIndex(function(b){ return b.id===cur; });
    setBg(l[(i+1+l.length)%l.length].id);
  };
  window.__bgPrev=function(){
    var l=loadList(); if(!l.length) return;
    var cur=current(), i=l.findIndex(function(b){ return b.id===cur; });
    setBg(l[(i-1+l.length)%l.length].id);
  };
  window.__bgSetAuto=function(m){ setAuto(m); };
  window.__bgAdd=function(){ openAddBgModal(); };
  /* 최초 진입 배경도 페이드인 — 두 초기화 지점(모듈 로드·DOM 준비)이 중복 실행되지 않게 1회 가드 */
  var _bgInit=false;
  function initBg(){
    if(_bgInit) return;
    if(!document.body) return; /* DOM 준비 전이면 build()에서 재시도 */
    _bgInit=true;
    apply(current(), true);
  }

  /* 자동 전환 타이머 */
  var autoTimer=null;
  function setupAuto(){
    if(autoTimer){ clearInterval(autoTimer); autoTimer=null; }
    var mode=autoMode();
    if(mode==='off') return;
    var mins=parseInt(mode)||10;
    autoTimer=setInterval(function(){
      var list=loadList(); if(list.length<2) return;
      var cur=current(); var idx=list.findIndex(function(b){return b.id===cur;});
      var next=list[(idx+1)%list.length];
      setBg(next.id);
    }, mins*60000);
  }
  function setAuto(mode){ try{ localStorage.setItem(AUTO_KEY,mode); }catch(e){} setupAuto(); renderMenu(); }

  /* ── 배경 추가 모달 (구식 prompt 대체) ── */
  function openAddBgModal(){
    var prev=document.getElementById('bgAddModal'); if(prev) prev.remove();
    var ov=document.createElement('div'); ov.id='bgAddModal'; ov.className='bga-ov';
    ov.innerHTML='<div class="bga-card">'
      +'<div class="bga-head"><span class="bga-ic">🖼</span><div><div class="bga-title">배경화면 추가</div>'
      +'<div class="bga-sub">이미지 주소를 붙여넣으면 미리보기가 나타납니다</div></div></div>'
      +'<div class="bga-prev" id="bgaPrev"><span class="bga-prev-ph">미리보기</span></div>'
      +'<label class="bga-lb">이미지 주소 (URL)</label>'
      +'<input class="bga-in" id="bgaUrl" placeholder="https://i.postimg.cc/…jpg" autocomplete="off">'
      +'<label class="bga-lb" style="margin-top:11px">이름</label>'
      +'<input class="bga-in" id="bgaName" placeholder="내 배경" autocomplete="off">'
      +'<div class="bga-hint">캡처 이미지는 <b>postimg.cc</b> 등에 올린 뒤 <b>직접 링크</b>를 붙여넣으세요.</div>'
      +'<div class="bga-btns"><button type="button" class="bga-btn bga-cancel">취소</button>'
      +'<button type="button" class="bga-btn bga-save">추가</button></div>'
      +'</div>';
    document.body.appendChild(ov);
    var uIn=ov.querySelector('#bgaUrl'), nIn=ov.querySelector('#bgaName'), pv=ov.querySelector('#bgaPrev');
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    uIn.oninput=function(){
      var v=this.value.trim();
      if(v){ pv.innerHTML='<img src="'+v.replace(/"/g,'&quot;')+'" alt="" onerror="this.parentNode.innerHTML=\'<span class=&quot;bga-prev-err&quot;>이미지를 불러올 수 없어요</span>\'">'; }
      else { pv.innerHTML='<span class="bga-prev-ph">미리보기</span>'; }
    };
    function submit(){
      var url=(uIn.value||'').trim();
      if(!url){ if(window.__nnToast) window.__nnToast('이미지 주소를 입력해 주세요',{kind:'del'}); uIn.focus(); return; }
      if(window.__nnCheckImgUrl){ var c=window.__nnCheckImgUrl(url); if(!c.ok) return; url=c.url; }
      var name=(nIn.value||'').trim()||'내 배경';
      var l=loadList();
      l.push({id:'user_'+Date.now(), name:name, url:url});
      saveList(l); renderMenu(); close();
      if(window.__nnToast) window.__nnToast('✓ "'+name+'" 배경이 추가되었습니다');
    }
    ov.querySelector('.bga-cancel').onclick=close;
    ov.querySelector('.bga-save').onclick=submit;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    ov.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); submit(); } if(e.key==='Escape') close(); });
    requestAnimationFrame(function(){ ov.classList.add('show'); uIn.focus(); });
  }

  function build(){
    initBg(); /* DOM 준비 후 최초 배경 페이드인 */
    var menu=document.createElement('div');
    menu.id='bgSwitchMenu'; menu.className='bg-switch-menu';
    document.body.appendChild(menu);
    renderMenu();
    var btn=document.getElementById('bgSwitchBtn');
    if(btn) btn.onclick=function(e){ e.stopPropagation(); var m=document.getElementById('bgSwitchMenu');
      if(m){ if(!m.classList.contains('show')){
        var r=btn.getBoundingClientRect();
        var txt=btn.querySelector('.bgn-txt');
        var tr=(txt && txt.offsetWidth) ? txt.getBoundingClientRect() : r;   /* BACKDROP 글씨 기준 */
        var anchor=tr.left + tr.width/2;                                      /* 글씨 중심 */
        var mw=m.offsetWidth||274;
        m.style.left=Math.max(10, Math.min(anchor - mw/2, window.innerWidth - mw - 10))+'px';
        var top=r.bottom+10;
        m.style.top=top+'px';
        /* 화면 아래로 잘리지 않도록 남은 높이에 맞춤 */
        m.style.setProperty('max-height', Math.max(220, window.innerHeight - top - 16)+'px', 'important');
        m.style.setProperty('height','auto','important');
        m.style.setProperty('overflow-y','auto','important');
      } m.classList.toggle('show'); } };
    window.addEventListener('resize', function(){
      var m=document.getElementById('bgSwitchMenu');
      if(m && m.classList.contains('show')){
        var t=parseFloat(m.style.top)||70;
        m.style.setProperty('max-height', Math.max(220, window.innerHeight - t - 16)+'px', 'important');
      }
    }, {passive:true});
    document.addEventListener('click',function(e){ var m=document.getElementById('bgSwitchMenu'); if(m && m.classList.contains('show') && !m.contains(e.target) && e.target.id!=='bgSwitchBtn' && !e.target.closest('#bgSwitchBtn')){ m.classList.remove('show'); } });
  }

  function renderMenu(){
    var menu=document.getElementById('bgSwitchMenu'); if(!menu) return;
    var list=loadList(), cur=current(), mode=autoMode();
    var h='<div class="bgm-title">배경화면</div>';
    h+=list.map(function(b,i){
      return '<div class="bgm-item'+(b.id===cur?' sel':'')+'" data-id="'+b.id+'">'
        +'<span class="bgm-thumb" style="background-image:url(\''+esc(b.url)+'\')"></span>'
        +'<span class="bgm-name">'+esc(b.name)+'</span>'
        +(b.id===cur?'<span class="bgm-check">✓</span>':'')
        +'<span class="bgm-ctrl"><button type="button" class="bgm-edit" data-i="'+i+'" title="이름 편집">✎</button><button type="button" class="bgm-del" data-i="'+i+'" title="삭제">✕</button></span>'
        +'</div>';
    }).join('');
    h+='<button type="button" class="bgm-add" id="bgmAdd">＋ 배경 추가</button>';
    h+='<div class="bgm-divider"></div>';
    h+='<div class="bgm-auto-row"><span class="bgm-auto-label">자동 전환</span><div class="bgm-auto-opts">'
      +[['off','끄기'],['3','3분'],['5','5분'],['10','10분'],['30','30분']].map(function(o){
        return '<button type="button" class="bgm-auto-opt'+(mode===o[0]?' sel':'')+'" data-mode="'+o[0]+'">'+o[1]+'</button>';
      }).join('')+'</div></div>';
    h+='<div class="bgm-divider"></div>';
    /* 배경 표시 방식 */
    var bmode='hero', bscroll='light';
    try{ bmode=localStorage.getItem('nn_bg_mode_v1')||'hero'; bscroll=localStorage.getItem('nn_bg_scroll_v1')||'light'; }catch(e){}
    h+='<div class="bgm-auto-row"><span class="bgm-auto-label">배경 표시</span><div class="bgm-auto-opts">'
      +'<button type="button" class="bgm-mode-opt'+(bmode==='fixed'?' sel':'')+'" data-bmode="fixed">계속 보임</button>'
      +'<button type="button" class="bgm-mode-opt'+(bmode==='hero'?' sel':'')+'" data-bmode="hero">첫 화면만</button>'
      +'</div></div>';
    h+='<div class="bgm-note">'+(bmode==='hero'
      ? '첫 화면에서는 배경화면이 꽉 차게 보이고, 스크롤을 내리면 단색 바탕으로 넘어갑니다.'
      : '스크롤을 내려도 배경화면이 그대로 보입니다.')+'</div>';
    if(bmode==='hero'){
      h+='<div class="bgm-auto-row"><span class="bgm-auto-label">스크롤 바탕</span><div class="bgm-auto-opts">'
        +'<button type="button" class="bgm-mode-opt'+(bscroll==='dark'?' sel':'')+'" data-bscroll="dark">어둡게</button>'
        +'<button type="button" class="bgm-mode-opt'+(bscroll==='light'?' sel':'')+'" data-bscroll="light">밝게</button>'
        +'</div></div>';
    }
    h+='<div class="bgm-divider"></div>';
    h+='<button type="button" class="bgm-opacity" id="bgmOpacity">🎚 패널 투명도 조절</button>';
    menu.innerHTML=h;
    /* 배경 표시 방식 적용 */
    function applyBgMode(){
      var m2='hero', c2='light';
      try{ m2=localStorage.getItem('nn_bg_mode_v1')||'hero'; c2=localStorage.getItem('nn_bg_scroll_v1')||'light'; }catch(e){}
      var r=document.documentElement;
      r.classList.toggle('nn-bgmode-hero', m2==='hero');
      r.classList.toggle('nn-bgscroll-dark', m2==='hero' && c2==='dark');
      if(window.__bgScrollUpdate) window.__bgScrollUpdate();
    }
    window.__bgApplyMode=applyBgMode;
    menu.querySelectorAll('[data-bmode]').forEach(function(b){
      b.onclick=function(e){ e.stopPropagation();
        var mv=b.getAttribute('data-bmode');
        try{
          localStorage.setItem('nn_bg_mode_v1', mv);
        }catch(x){}
        applyBgMode(); renderMenu();
      };
    });
    menu.querySelectorAll('[data-bscroll]').forEach(function(b){
      b.onclick=function(e){ e.stopPropagation();
        try{ localStorage.setItem('nn_bg_scroll_v1', b.getAttribute('data-bscroll')); }catch(x){}
        applyBgMode(); renderMenu();
      };
    });
    var opB=menu.querySelector('#bgmOpacity');
    if(opB) opB.onclick=function(e){ e.stopPropagation(); if(window.__panelOpacityOpen) window.__panelOpacityOpen(); };
    /* 배경 선택 (컨트롤 버튼 제외 영역 클릭) */
    menu.querySelectorAll('.bgm-item').forEach(function(it){
      it.addEventListener('click',function(e){
        if(e.target.closest('.bgm-ctrl')) return;
        setBg(it.getAttribute('data-id'));
        if(window.__nnToast) window.__nnToast('🌆 배경화면이 변경되었습니다');
      });
    });
    /* 이름 편집 */
    menu.querySelectorAll('.bgm-edit').forEach(function(b){
      b.onclick=function(e){ e.stopPropagation();
        var i=parseInt(b.getAttribute('data-i')); var l=loadList();
        var run=function(nm){
          nm=String(nm||'').trim(); if(!nm) return;
          var ll=loadList(); if(!ll[i]) return;
          ll[i].name=nm; saveList(ll); renderMenu();
        };
        if(window.__nnPrompt) window.__nnPrompt({title:'배경화면 이름', label:'이름', value:(l[i]||{}).name||'', required:true, onOk:run});
        else { var nm0=prompt('배경화면 이름:', (l[i]||{}).name||''); if(nm0!==null) run(nm0); }
      };
    });
    /* 삭제 (토스트 실행취소) */
    menu.querySelectorAll('.bgm-del').forEach(function(b){
      b.onclick=function(e){ e.stopPropagation();
        var i=parseInt(b.getAttribute('data-i')); var l=loadList();
        if(l.length<=1){ if(window.__nnToast) window.__nnToast('마지막 배경은 삭제할 수 없습니다'); return; }
        var removed=l[i], pos=i;
        l.splice(i,1); saveList(l);
        if(removed.id===current()) setBg(l[0].id); else renderMenu();
        if(window.__nnToast) window.__nnToast('🗑 "'+removed.name+'" 삭제됨',{kind:'del',undo:function(){ var ll=loadList(); ll.splice(pos,0,removed); saveList(ll); renderMenu(); if(window.__nnToast) window.__nnToast('↩ 복원되었습니다'); }});
      };
    });
    /* 추가 */
    var add=menu.querySelector('#bgmAdd');
    if(add) add.onclick=function(e){ e.stopPropagation(); openAddBgModal(); };
    /* 자동 전환 옵션 */
    menu.querySelectorAll('.bgm-auto-opt').forEach(function(b){
      b.onclick=function(e){ e.stopPropagation(); setAuto(b.getAttribute('data-mode'));
        if(window.__nnToast) window.__nnToast(b.getAttribute('data-mode')==='off'?'자동 전환을 껐습니다':'🔄 '+b.textContent+'마다 자동 전환됩니다'); };
    });
  }

  /* 1회 마이그레이션: 기존 저장 목록의 이름·순서를 새 체계로 갱신 */
  (function(){
    try{
      if(localStorage.getItem('nn_bg_mig_v2')!=='1'){
        var MAP={'트레이딩룸':['Blue Gradient',0],'시티뷰3':['Ocean View',1],'시티뷰1':['Trading Room',2],'시티뷰2':['White & Beige',3],'타임스퀘어야경':['Times Square Night',4],'별이빛나는밤':['New York Night Skyline',5]};
        var raw=localStorage.getItem(LIST_KEY);
        if(raw){
          var l=JSON.parse(raw);
          if(Array.isArray(l)&&l.length){
            var norm=function(s){ return String(s||'').replace(/\s+/g,''); };
            l.forEach(function(b){ var m=MAP[norm(b.name)]; if(m){ b.name=m[0]; b.__o=m[1]; } else { b.__o=99; } });
            l.sort(function(a,b){ return a.__o-b.__o; });
            l.forEach(function(b){ delete b.__o; });
            localStorage.setItem(LIST_KEY, JSON.stringify(l));
          }
        }
        localStorage.setItem('nn_bg_mig_v2','1');
      }
    }catch(e){}
    /* v3: 기본 배경 'New York Night Skyline' 제거 */
    try{
      if(localStorage.getItem('nn_bg_mig_v3')!=='1'){
        var raw3=localStorage.getItem(LIST_KEY);
        if(raw3){
          var l3=JSON.parse(raw3);
          if(Array.isArray(l3)){
            var f3=l3.filter(function(b){ return b.id!=='bg6' && String(b.name||'').replace(/\s+/g,'')!=='NewYorkNightSkyline'; });
            if(f3.length) localStorage.setItem(LIST_KEY, JSON.stringify(f3));
            if(localStorage.getItem(CUR_KEY)==='bg6' && f3.length) localStorage.setItem(CUR_KEY, f3[0].id);
          }
        }
        localStorage.setItem('nn_bg_mig_v3','1');
      }
    }catch(e){}
    /* v4: 기본 배경 'Seoul'(bg4) 제거 + 신규 3종(bg7·bg8·bg9) 추가 */
    try{
      if(localStorage.getItem('nn_bg_mig_v4')!=='1'){
        var raw4=localStorage.getItem(LIST_KEY);
        if(raw4){
          var l4=JSON.parse(raw4);
          if(Array.isArray(l4)){
            /* Seoul 제거 (id 또는 이름 기준) */
            l4=l4.filter(function(b){ return b.id!=='bg4' && String(b.name||'').replace(/\s+/g,'')!=='Seoul'; });
            /* 신규 기본 배경 중, 사용자 목록에 없는 것만 추가 */
            var adds=[
              {id:'bg7', name:'White & Beige',   url:'https://i.postimg.cc/L89ZtPvt/pexels-steve-13934811.jpg'},
              {id:'bg8', name:'Olympic Park',     url:'https://i.postimg.cc/dQG7g6xN/pexels-annyshatalova-8573211.jpg'},
              {id:'bg9', name:'Seoul Nightscape', url:'https://i.postimg.cc/cLnPcKH3/pexels-ethan-brooke-1123775-5038998.jpg'}
            ];
            adds.forEach(function(nb){
              var has=l4.some(function(b){ return b.id===nb.id || b.url===nb.url; });
              if(!has) l4.push(nb);
            });
            localStorage.setItem(LIST_KEY, JSON.stringify(l4));
            /* Seoul을 배경으로 쓰고 있었으면 첫 배경으로 폴백 */
            if(localStorage.getItem(CUR_KEY)==='bg4' && l4.length) localStorage.setItem(CUR_KEY, l4[0].id);
          }
        }
        localStorage.setItem('nn_bg_mig_v4','1');
      }
    }catch(e){}
    /* v5: 기본 배경 표시 순서 재정렬 (Blue Gradient → White & Beige → Trading Room → Ocean View) */
    try{
      if(localStorage.getItem('nn_bg_mig_v5')!=='1'){
        var raw5=localStorage.getItem(LIST_KEY);
        if(raw5){
          var l5=JSON.parse(raw5);
          if(Array.isArray(l5)&&l5.length){
            var ORD={'trading':0,'bg7':1,'bg3':2,'bg5':3,'bg8':4,'bg9':5,'times':6};
            l5.forEach(function(b,i){ b.__o=(ORD[b.id]!=null?ORD[b.id]:100+i); });
            l5.sort(function(a,b){ return a.__o-b.__o; });
            l5.forEach(function(b){ delete b.__o; });
            localStorage.setItem(LIST_KEY, JSON.stringify(l5));
          }
        }
        localStorage.setItem('nn_bg_mig_v5','1');
      }
    }catch(e){}
  })();
  initBg();
  setupAuto();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
})();

/* ══════════ 편집기 선택영역 보존 · 공용 대화상자 ══════════ */
(function(){
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* 모달을 열면 contenteditable 의 커서가 사라진다.
     열기 직전에 편집기와 Range 를 붙잡아 두었다가 삽입 직전에 되돌린다. */
  window.__nnSelSave=function(){
    var el=document.activeElement, ed=null;
    try{
      if(el){
        if(el.isContentEditable) ed=el;
        else if(el.closest) ed=el.closest('[contenteditable="true"]');
      }
    }catch(e){}
    var range=null;
    try{
      var s=window.getSelection();
      if(s && s.rangeCount){
        var r=s.getRangeAt(0);
        if(!ed || ed.contains(r.commonAncestorContainer)) range=r.cloneRange();
      }
    }catch(e){}
    return function restore(){
      try{
        if(ed && ed.focus) ed.focus();
        if(range){
          var s2=window.getSelection();
          s2.removeAllRanges(); s2.addRange(range);
        }
      }catch(e){}
      return !!ed;
    };
  };

  function shell(opts){
    var ov=document.createElement('div');
    ov.className='bga-ov nnd-ov';
    ov.innerHTML='<div class="bga-card nnd-card">'
      +'<div class="bga-head"><span class="bga-ic">'+(opts.icon||'\u270e')+'</span><div>'
      +'<div class="bga-title">'+esc(opts.title||'')+'</div>'
      +(opts.sub?'<div class="bga-sub">'+esc(opts.sub)+'</div>':'')
      +'</div></div>'
      + opts.body
      +'<div class="bga-btns"><button type="button" class="bga-btn bga-cancel">'+esc(opts.cancel||'\ucde8\uc18c')+'</button>'
      +'<button type="button" class="bga-btn bga-save'+(opts.danger?' nnd-danger':'')+'">'+esc(opts.ok||'\ud655\uc778')+'</button></div>'
      +'</div>';
    document.body.appendChild(ov);
    var closed=false;
    function close(){
      if(closed) return; closed=true;
      ov.classList.remove('show');
      setTimeout(function(){ if(ov.parentNode) ov.remove(); },220);
    }
    ov.querySelector('.bga-cancel').onclick=close;
    ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
    ov.addEventListener('keydown',function(e){ if(e.key==='Escape'){ e.preventDefault(); close(); } });
    requestAnimationFrame(function(){ ov.classList.add('show'); });
    return { ov:ov, close:close, ok:ov.querySelector('.bga-save') };
  }

  /* 한 줄 입력 — prompt() 대체 */
  window.__nnPrompt=function(o){
    o=o||{};
    var m=shell({
      icon:o.icon||'\u270e', title:o.title||'', sub:o.sub, ok:o.ok||'\uc800\uc7a5',
      body:'<label class="bga-lb">'+esc(o.label||'')+'</label>'
          +'<input class="bga-in" id="nndIn" autocomplete="off" spellcheck="false" placeholder="'+esc(o.placeholder||'')+'" value="'+esc(o.value||'')+'">'
    });
    var inp=m.ov.querySelector('#nndIn');
    function done(){
      var v=inp.value.trim();
      if(o.required && !v){ inp.focus(); return; }
      m.close();
      if(o.onOk) o.onOk(v);
    }
    m.ok.onclick=done;
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); done(); } });
    setTimeout(function(){ inp.focus(); inp.select(); },60);
  };

  /* 확인 — confirm() 대체 */
  window.__nnConfirm=function(o){
    o=o||{};
    var m=shell({
      icon:o.icon||'\u26a0', title:o.title||'', sub:o.sub, ok:o.ok||'\ud655\uc778', danger:o.danger!==false,
      body: o.msg ? '<div class="nnd-msg">'+esc(o.msg)+'</div>' : ''
    });
    m.ok.onclick=function(){ m.close(); if(o.onOk) o.onOk(); };
    setTimeout(function(){ m.ok.focus(); },60);
  };

  /* 링크 삽입 — URL + 표시 텍스트를 한 번에 */
  window.__nnLinkModal=function(o){
    o=o||{};
    var hasSel=!!o.text;
    var m=shell({
      icon:'\ud83d\udd17', title:'\ub9c1\ud06c \uc0bd\uc785', ok:'\uc0bd\uc785',
      sub: hasSel ? '\uc120\ud0dd\ud55c \uae00\uc790\uc5d0 \ub9c1\ud06c\ub97c \uac78\uc5b4\uc90d\ub2c8\ub2e4' : '\uc8fc\uc18c\uc640 \ud654\uba74\uc5d0 \ubcf4\uc77c \uae00\uc790\ub97c \uc785\ub825\ud558\uc138\uc694',
      body:'<label class="bga-lb">\uc8fc\uc18c (URL)</label>'
          +'<input class="bga-in" id="nndUrl" placeholder="https://" autocomplete="off" spellcheck="false" value="'+esc(o.url||'')+'">'
          +'<label class="bga-lb" style="margin-top:11px">\ud45c\uc2dc\ud560 \uae00\uc790</label>'
          +'<input class="bga-in" id="nndTxt" autocomplete="off" spellcheck="false" value="'+esc(o.text||'')+'"'+(hasSel?' disabled':'')+'>'
          +(hasSel?'<div class="nnd-note">\uc774\ubbf8 \uc120\ud0dd\ud55c \uae00\uc790\uac00 \uadf8\ub300\ub85c \uc0ac\uc6a9\ub429\ub2c8\ub2e4.</div>':'')
          +'<div class="nnd-prev" id="nndPrev"></div>'
    });
    var u=m.ov.querySelector('#nndUrl'), t=m.ov.querySelector('#nndTxt'), pv=m.ov.querySelector('#nndPrev');
    function norm(v){
      v=String(v||'').trim();
      if(!v) return '';
      if(!/^([a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(v)) v='https://'+v;
      return v;
    }
    function bad(v){ return /^\s*javascript:/i.test(v) || /^\s*data:/i.test(v); }
    function refresh(){
      var url=norm(u.value), txt=(hasSel? o.text : t.value.trim()) || url;
      if(!url){ pv.className='nnd-prev'; pv.textContent=''; m.ok.disabled=true; return; }
      if(bad(u.value)){ pv.className='nnd-prev err'; pv.textContent='\uc0ac\uc6a9\ud560 \uc218 \uc5c6\ub294 \uc8fc\uc18c\uc785\ub2c8\ub2e4'; m.ok.disabled=true; return; }
      m.ok.disabled=false;
      pv.className='nnd-prev on';
      pv.innerHTML='<span class="nnd-pv-lb">\ubbf8\ub9ac\ubcf4\uae30</span><a>'+esc(txt)+'</a><span class="nnd-pv-u">'+esc(url)+'</span>';
    }
    [u,t].forEach(function(el){ el.addEventListener('input', refresh); });
    function done(){
      var url=norm(u.value);
      if(!url || bad(u.value)) return;
      m.close();
      if(o.onOk) o.onOk(url, hasSel? o.text : (t.value.trim()||url));
    }
    m.ok.onclick=done;
    [u,t].forEach(function(el){ el.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); done(); } }); });
    refresh();
    setTimeout(function(){ u.focus(); u.select(); },60);
  };
})();

/* ══════════ 사진 삽입 모달 ══════════ */
(function(){
  var LAYOUTS=[
    ['grid',    '\uadf8\ub9ac\ub4dc',  '\uc815\uc0ac\uac01 \uaca9\uc790\ub85c \ubc30\uc5f4'],
    ['row',     '\uac00\ub85c',    '\ud55c \uc904\ub85c \ub098\ub780\ud788'],
    ['col',     '\uc138\ub85c',    '\uc704\uc5d0\uc11c \uc544\ub798\ub85c'],
    ['collage', '\ucf5c\ub77c\uc8fc', '\ud06c\uae30\ub97c \uc11e\uc5b4 \ubc30\uce58']
  ];
  var ov=null;

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function close(){
    if(!ov) return;
    var el=ov; ov=null;
    el.classList.remove('show');
    setTimeout(function(){ if(el&&el.parentNode) el.remove(); },220);
  }
  function parseUrls(raw){
    return String(raw||'').split(/[\n,\s]+/).map(function(u){ return u.trim(); }).filter(Boolean);
  }
  /* 안전장치 통과분만 반환 */
  function safeUrls(list, quiet){
    if(!window.__nnCheckImgUrl) return list;
    var out=[];
    list.forEach(function(u){
      var c=window.__nnCheckImgUrl(u, quiet?{quiet:true}:undefined);
      if(c && c.ok) out.push(c.url||u);
    });
    return out;
  }

  /* opts: {multi:Boolean, onInsert:function(html)} */
  window.__nnImgModal=function(opts){
    opts=opts||{};
    var multi=!!opts.multi;
    if(ov) close();
    var layout='grid';

    ov=document.createElement('div');
    ov.className='bga-ov nnim-ov';
    ov.innerHTML='<div class="bga-card nnim-card">'
      +'<div class="bga-head"><span class="bga-ic">\ud83d\uddbc</span><div>'
      +'<div class="bga-title">'+(multi?'\uc0ac\uc9c4 \uc5ec\ub7ec\uc7a5 \uc0bd\uc785':'\uc0ac\uc9c4 \uc0bd\uc785')+'</div>'
      +'<div class="bga-sub">'+(multi?'\uc8fc\uc18c\ub97c \uc904\ubc14\uafc8\uc73c\ub85c \uc5ec\ub7ec \uac1c \ub123\uc744 \uc218 \uc788\uc2b5\ub2c8\ub2e4':'\uc774\ubbf8\uc9c0 \uc8fc\uc18c\ub97c \ubd99\uc5ec\ub123\uc73c\uba74 \ubbf8\ub9ac\ubcf4\uae30\uac00 \ud45c\uc2dc\ub429\ub2c8\ub2e4')+'</div></div></div>'
      +'<label class="bga-lb">\uc774\ubbf8\uc9c0 \uc8fc\uc18c (URL)</label>'
      +(multi
        ? '<textarea class="bga-in nnim-ta" id="nnimUrls" rows="4" placeholder="https://i.postimg.cc/....jpg\nhttps://i.postimg.cc/....jpg" spellcheck="false"></textarea>'
        : '<input class="bga-in" id="nnimUrls" placeholder="https://i.postimg.cc/....jpg" autocomplete="off" spellcheck="false">')
      +'<div class="nnim-cnt" id="nnimCnt"></div>'
      +(multi ? '<div class="nnim-lay" id="nnimLay"><label class="bga-lb" style="margin:0 0 7px">\ubc30\uce58</label><div class="nnim-lays">'
          + LAYOUTS.map(function(l){ return '<button type="button" class="nnim-l'+(l[0]==='grid'?' on':'')+'" data-l="'+l[0]+'"><span class="nnim-l-ic nnim-ic-'+l[0]+'"><i></i><i></i><i></i><i></i></span><b>'+l[1]+'</b><em>'+l[2]+'</em></button>'; }).join('')
          + '</div></div>' : '')
      +'<div class="nnim-prev" id="nnimPrev"><span class="bga-prev-ph">\ubbf8\ub9ac\ubcf4\uae30</span></div>'
      +'<div class="bga-hint">\ucea1\ucc98 \uc774\ubbf8\uc9c0\ub294 <b>postimg.cc</b> \ub4f1\uc5d0 \uc62c\ub9b0 \ub4a4 <b>\uc9c1\uc811 \ub9c1\ud06c</b>\ub97c \ubd99\uc5ec\ub123\uc73c\uc138\uc694.</div>'
      +'<div class="bga-btns"><button type="button" class="bga-btn bga-cancel">\ucde8\uc18c</button>'
      +'<button type="button" class="bga-btn bga-save" disabled>\uc0bd\uc785</button></div>'
      +'</div>';
    document.body.appendChild(ov);

    var inp=ov.querySelector('#nnimUrls');
    var prev=ov.querySelector('#nnimPrev');
    var cnt=ov.querySelector('#nnimCnt');
    var layWrap=ov.querySelector('#nnimLay');
    var saveBtn=ov.querySelector('.bga-save');
    var tmr=null;

    function urls(){ return parseUrls(inp.value); }
    function refresh(){
      var list=urls();
      var n=list.length;
      saveBtn.disabled = (n===0);
      cnt.textContent = n ? (n+'\uc7a5') : '';
      if(layWrap) layWrap.style.display = (n>1) ? '' : 'none';
      if(!n){ prev.className='nnim-prev'; prev.innerHTML='<span class="bga-prev-ph">\ubbf8\ub9ac\ubcf4\uae30</span>'; return; }
      var lay = (n>1) ? layout : 'single';
      prev.className='nnim-prev on nn-gallery nn-gallery-'+lay;
      prev.innerHTML=list.slice(0,8).map(function(u){
        return '<img src="'+esc(u)+'" alt="" onerror="this.classList.add(\'nnim-bad\')">';
      }).join('') + (n>8 ? '<span class="nnim-more">+'+(n-8)+'</span>' : '');
    }
    inp.addEventListener('input', function(){ clearTimeout(tmr); tmr=setTimeout(refresh, 320); });
    inp.addEventListener('change', refresh);

    if(layWrap){
      layWrap.querySelectorAll('.nnim-l').forEach(function(b){
        b.onclick=function(){
          layout=b.getAttribute('data-l');
          layWrap.querySelectorAll('.nnim-l').forEach(function(x){ x.classList.toggle('on', x===b); });
          refresh();
        };
      });
    }
    ov.querySelector('.bga-cancel').onclick=close;
    ov.addEventListener('click', function(e){ if(e.target===ov) close(); });
    ov.addEventListener('keydown', function(e){
      if(e.key==='Escape'){ e.preventDefault(); close(); }
      if(e.key==='Enter' && (e.ctrlKey||e.metaKey||!multi)){ e.preventDefault(); saveBtn.click(); }
    });
    saveBtn.onclick=function(){
      var list=safeUrls(urls());
      if(!list.length){ close(); return; }
      var html;
      if(list.length===1 && !multi){
        html='<img src="'+esc(list[0])+'"><p><br></p>';
      } else {
        var lay = list.length>1 ? layout : 'single';
        html='<div class="nn-gallery nn-gallery-'+lay+'" contenteditable="false">'
           + list.map(function(u){ return '<img src="'+esc(u)+'">'; }).join('')
           + '</div><p><br></p>';
      }
      close();
      if(opts.onInsert) opts.onInsert(html);
      if(window.__nnToast) window.__nnToast('\u2713 \uc0ac\uc9c4 '+list.length+'\uc7a5\uc744 \uc0bd\uc785\ud588\uc2b5\ub2c8\ub2e4');
    };
    requestAnimationFrame(function(){ ov.classList.add('show'); inp.focus(); });
  };
})();

/* ══════════ 숫자 카운트업 ══════════ */
(function(){
  var prev={};           /* key → 직전 값 */
  var running={};        /* key → rAF id */
  var reduce=false;
  try{ reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

  /* el: 대상 · key: 식별자 · val: 새 값 · fmt: 숫자→문자 포맷 함수 */
  window.__nnCount=function(el, key, val, fmt){
    if(!el || val==null || isNaN(val)) return;
    var from=prev[key];
    prev[key]=val;
    if(reduce || from==null || from===val || !isFinite(from)){ el.textContent=fmt(val); return; }
    var diff=val-from;
    /* 변화가 0.01% 미만이면 애니메이션 생략 */
    if(Math.abs(diff) < Math.abs(val)*0.0001){ el.textContent=fmt(val); return; }
    if(running[key]) cancelAnimationFrame(running[key]);
    var t0=performance.now(), dur=620;
    el.classList.remove('nnc-up','nnc-dn');
    void el.offsetWidth;
    el.classList.add(diff>0?'nnc-up':'nnc-dn');
    (function tick(now){
      var p=Math.min(1,(now-t0)/dur);
      var e=1-Math.pow(1-p,3);            /* easeOutCubic */
      el.textContent=fmt(from+diff*e);
      if(p<1) running[key]=requestAnimationFrame(tick);
      else{
        delete running[key];
        el.textContent=fmt(val);
        setTimeout(function(){ el.classList.remove('nnc-up','nnc-dn'); }, 700);
      }
    })(t0);
  };
  window.__nnCountSeed=function(key,val){ if(val!=null&&!isNaN(val)) prev[key]=val; };
})();

/* ══════════ 노트 이미지 라이트박스 ══════════ */
(function(){
  var box=null, curImg=null, onResize=null;
  var SIZES=[['50%','50%'],['75%','75%'],['100%','100%']];

  function close(){
    if(!box) return;
    box.classList.remove('show');
    var el=box; box=null; curImg=null; onResize=null;
    document.removeEventListener('keydown', keyHandler, true);
    setTimeout(function(){ if(el&&el.parentNode) el.remove(); },240);
  }
  function keyHandler(e){
    if(!box) return;
    if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); close(); }
  }
  function applySize(w){
    if(!curImg) return;
    curImg.style.width=w;
    curImg.style.height='auto';
    if(onResize) onResize();
    if(box) box.querySelectorAll('.nl-sz').forEach(function(b){
      b.classList.toggle('on', b.getAttribute('data-w')===w);
    });
    if(window.__nnToast) window.__nnToast('\uc0ac\uc9c4 \ud06c\uae30 '+w);
  }
  /* img : 노트 안의 이미지 / save : 변경 후 저장 콜백 */
  window.__nnLightbox=function(img, save){
    if(box) close();
    curImg=img; onResize=save||null;
    var src=img.getAttribute('src')||'';
    var cw=(img.style.width||'100%');
    box=document.createElement('div');
    box.className='nn-lightbox';
    box.innerHTML='<button type="button" class="nl-x" aria-label="\ub2eb\uae30">\u2715</button>'
      +'<div class="nl-stage"><img class="nl-img" alt=""></div>'
      +'<div class="nl-bar">'
      +'<span class="nl-lb">\ub178\ud2b8 \uc548 \ud45c\uc2dc \ud06c\uae30</span>'
      + SIZES.map(function(s){ return '<button type="button" class="nl-sz'+(cw===s[0]?' on':'')+'" data-w="'+s[0]+'">'+s[1]+'</button>'; }).join('')
      +'<a class="nl-open" target="_blank" rel="noopener">\uc6d0\ubcf8 \uc5f4\uae30</a>'
      +'</div>';
    document.body.appendChild(box);
    var im=box.querySelector('.nl-img');
    im.src=src;
    var a=box.querySelector('.nl-open'); if(a) a.href=src;
    box.querySelector('.nl-x').onclick=close;
    box.addEventListener('click',function(e){
      if(e.target===box || e.target.classList.contains('nl-stage')) close();
    });
    box.querySelectorAll('.nl-sz').forEach(function(b){
      b.onclick=function(e){ e.stopPropagation(); applySize(b.getAttribute('data-w')); };
    });
    document.addEventListener('keydown', keyHandler, true);
    requestAnimationFrame(function(){ box.classList.add('show'); });
  };
})();

/* ══════════ 키보드 단축키 · 안내창 (?) ══════════ */
(function(){
  /* 입력 중에는 단축키를 막는다 — 오작동의 가장 큰 원인 */
  function typing(e){
    var t=e.target;
    if(!t) return false;
    if(t.isContentEditable) return true;
    var tag=(t.tagName||'').toUpperCase();
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return true;
    if(t.closest && t.closest('[contenteditable="true"]')) return true;
    return false;
  }
  function modalOpen(){
    /* 실제로 존재하는 오버레이만 검사 — 하나라도 열려 있으면 단축키를 넘긴다 */
    if(document.querySelector('.hub-modal-ov, .wd-ov, .nn-lightbox, .bga-ov, .cover-modal-ov, .lex-confirm')) return true;
    var c=document.getElementById('cmdkOv');
    if(c && c.classList.contains('show')) return true;
    return false;
  }

  var PAGES=[
    ['home','HOME'],['macro','MARKETS'],['assets','ASSETS'],
    ['portfolio','PORTFOLIO'],['research','RESEARCH'],
    ['books','BOOKS'],['lexicon','LEXICON'],['media','MEDIA'],['economics','ECONOMICS']
  ];

  var KEYS=[
    { g:'\uc774\ub3d9', rows:[
      ['1 ~ 9', '\ud398\uc774\uc9c0 \uc774\ub3d9 (HOME \u00b7 MARKETS \u00b7 ASSETS \u2026)'],
      ['H', 'HOME\uc73c\ub85c'],
      ['Ctrl / \u2318 + K', '\ucee4\ub9e8\ub4dc \ud314\ub808\ud2b8 \u2014 \ubaa8\ub4e0 \uae30\ub2a5 \uac80\uc0c9'],
    ]},
    { g:'\ubc30\uacbd', rows:[
      ['B', '\ub2e4\uc74c \ubc30\uacbd\uc73c\ub85c'],
      ['Shift + B', '\uc774\uc804 \ubc30\uacbd\uc73c\ub85c'],
    ]},
    { g:'\uae30\ud0c0', rows:[
      ['?', '\uc774 \uc548\ub0b4\ucc3d \uc5f4\uae30 / \ub2eb\uae30'],
      ['Esc', '\uc5f4\ub9b0 \ucc3d \u00b7 \ud328\ub110 \ub2eb\uae30'],
    ]}
  ];

  var ov=null;
  function close(){
    if(!ov) return;
    ov.classList.remove('show');
    var el=ov; ov=null;
    setTimeout(function(){ if(el&&el.parentNode) el.remove(); },240);
  }
  function open(){
    if(ov){ close(); return; }
    ov=document.createElement('div');
    ov.className='ks-ov';
    var body=KEYS.map(function(sec){
      return '<div class="ks-g"><div class="ks-gt">'+sec.g+'</div>'
        + sec.rows.map(function(r){
            var keys=r[0].split(' + ').map(function(k){ return '<kbd>'+k+'</kbd>'; }).join('<span class="ks-plus">+</span>');
            return '<div class="ks-r"><div class="ks-k">'+keys+'</div><div class="ks-d">'+r[1]+'</div></div>';
          }).join('')
        + '</div>';
    }).join('');
    ov.innerHTML='<div class="ks-panel" role="dialog" aria-label="\ud0a4\ubcf4\ub4dc \ub2e8\ucd95\ud0a4">'
      +'<button type="button" class="ks-x" aria-label="\ub2eb\uae30">\u2715</button>'
      +'<div class="ks-h">KEYBOARD SHORTCUTS</div>'
      +'<div class="ks-sub">\ud0a4\ubcf4\ub4dc\ub9cc\uc73c\ub85c \ube60\ub974\uac8c \uc6c0\uc9c1\uc774\uc138\uc694. \uae00\uc744 \uc4f0\ub294 \uc911\uc5d0\ub294 \ub3d9\uc791\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.</div>'
      +'<div class="ks-body">'+body+'</div></div>';
    document.body.appendChild(ov);
    ov.querySelector('.ks-x').onclick=close;
    ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
    requestAnimationFrame(function(){ ov.classList.add('show'); });
  }
  window.__ksOpen=open;

  document.addEventListener('keydown', function(e){
    if(e.defaultPrevented) return;
    /* ? 는 Shift 조합이므로 별도 처리 */
    if(e.key==='?' && !typing(e) && !e.ctrlKey && !e.metaKey && !e.altKey){
      e.preventDefault(); open(); return;
    }
    if(ov && e.key==='Escape'){ e.preventDefault(); close(); return; }
    if(typing(e) || modalOpen()) return;
    if(e.ctrlKey || e.metaKey || e.altKey) return;

    if(e.key>='1' && e.key<='9'){
      var idx=parseInt(e.key,10)-1, pg=PAGES[idx];
      if(pg && typeof switchPage==='function'){ e.preventDefault(); switchPage(pg[0]);
        if(window.__nnToast) window.__nnToast(pg[1]); }
      return;
    }
    if(e.key==='h'||e.key==='H'){ if(typeof switchPage==='function'){ e.preventDefault(); switchPage('home'); } return; }
    if(e.key==='b'){ if(window.__bgNext){ e.preventDefault(); window.__bgNext(); } return; }
    if(e.key==='B'){ if(window.__bgPrev){ e.preventDefault(); window.__bgPrev(); } return; }
  });
})();

/* ══════════ 관심종목 목표가 알림 ══════════ */
(function(){
  var AK='nn_wl_alert_v1', VK='nn_wl_view_v1', DK='nn_wl_alert_dismiss';
  function ld(k,d){ try{ var s=localStorage.getItem(k); if(s){ var o=JSON.parse(s); if(o&&typeof o==='object') return o; } }catch(e){} return d; }
  function sv(k,o){ try{ localStorage.setItem(k, JSON.stringify(o)); }catch(e){} }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function n(v){ var x=parseFloat(v); return (isNaN(x)||x<=0)?null:x; }

  function alerts(){ return ld(AK,{}); }
  function keyOf(it){ return it.market+':'+it.sym; }
  function getA(key){ var a=alerts()[key]; return a&&typeof a==='object' ? a : {}; }
  function setA(key, hi, lo){
    var all=alerts(), cur=all[key]||{};
    var o={};
    if(n(hi)!=null) o.hi=n(hi);
    if(n(lo)!=null) o.lo=n(lo);
    /* 목표가가 바뀌면 발동 이력 초기화 */
    if(cur.hi!==o.hi) delete cur.hiAt;
    if(cur.lo!==o.lo) delete cur.loAt;
    if(cur.hiAt) o.hiAt=cur.hiAt;
    if(cur.loAt) o.loAt=cur.loAt;
    if(o.hi==null && o.lo==null) delete all[key]; else all[key]=o;
    sv(AK, all);
  }
  window.__wlAlertGet=getA;
  window.__wlAlertSet=setA;

  /* 시세 대조 — 밴드를 벗어나면 발동, 안으로 돌아오면 재무장 */
  function evaluate(data, res){
    var all=alerts(), fired=[], changed=false;
    (data||[]).forEach(function(it){
      var key=keyOf(it), a=all[key]; if(!a) return;
      var o=((res||{})[it.market]||{})[it.sym]; if(!o || o.price==null || isNaN(o.price)) return;
      var p=o.price, cur=o.cur||(it.market==='kr'?'KRW':'USD');
      if(a.hi!=null){
        if(p>=a.hi){ if(!a.hiAt){ a.hiAt=Date.now(); changed=true; fired.push({it:it,dir:'hi',target:a.hi,price:p,cur:cur}); } }
        else if(a.hiAt){ delete a.hiAt; changed=true; }
      }
      if(a.lo!=null){
        if(p<=a.lo){ if(!a.loAt){ a.loAt=Date.now(); changed=true; fired.push({it:it,dir:'lo',target:a.lo,price:p,cur:cur}); } }
        else if(a.loAt){ delete a.loAt; changed=true; }
      }
    });
    if(changed) sv(AK, all);
    return fired;
  }

  /* 현재 발동 중인 항목 (배너용) */
  function active(data, res){
    var all=alerts(), out=[];
    (data||[]).forEach(function(it){
      var key=keyOf(it), a=all[key]; if(!a) return;
      var o=((res||{})[it.market]||{})[it.sym]; if(!o||o.price==null) return;
      var cur=o.cur||(it.market==='kr'?'KRW':'USD');
      if(a.hi!=null && o.price>=a.hi) out.push({it:it,dir:'hi',target:a.hi,price:o.price,cur:cur,at:a.hiAt});
      if(a.lo!=null && o.price<=a.lo) out.push({it:it,dir:'lo',target:a.lo,price:o.price,cur:cur,at:a.loAt});
    });
    return out;
  }

  function money(v,cur){
    if(v==null||isNaN(v)) return '—';
    if(cur==='KRW') return '\u20a9'+Math.round(v).toLocaleString('ko-KR');
    return '$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  window.__wlMoney=money;

  /* 브라우저 알림 */
  function notify(f){
    try{
      if(!('Notification' in window) || Notification.permission!=='granted') return;
      var t=f.it.sym.toUpperCase()+' '+(f.dir==='hi'?'\ubaa9\ud45c\uac00 \ub3c4\ub2ec':'\ud558\ub2e8\uac00 \uc774\ud0c8');
      new Notification(t, { body: money(f.price,f.cur)+' \u00b7 \ubaa9\ud45c '+money(f.target,f.cur), tag:'nnwl_'+keyOf(f.it)+'_'+f.dir });
    }catch(e){}
  }
  window.__wlNotifyAsk=function(){
    if(!('Notification' in window)){ if(window.__nnToast) window.__nnToast('\uc774 \ube0c\ub77c\uc6b0\uc800\ub294 \uc54c\ub9bc\uc744 \uc9c0\uc6d0\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4'); return; }
    if(Notification.permission==='granted'){ if(window.__nnToast) window.__nnToast('\u2713 \ube0c\ub77c\uc6b0\uc800 \uc54c\ub9bc\uc774 \uc774\ubbf8 \ucf1c\uc838 \uc788\uc2b5\ub2c8\ub2e4'); return; }
    if(Notification.permission==='denied'){ if(window.__nnToast) window.__nnToast('\ube0c\ub77c\uc6b0\uc800 \uc124\uc815\uc5d0\uc11c \uc54c\ub9bc\uc744 \ud5c8\uc6a9\ud574 \uc8fc\uc138\uc694'); return; }
    Notification.requestPermission().then(function(p){
      if(window.__nnToast) window.__nnToast(p==='granted' ? '\u2713 \ubaa9\ud45c\uac00 \ub3c4\ub2ec \uc2dc \uc54c\ub9bc\uc744 \ubcf4\ub0c5\ub2c8\ub2e4' : '\uc54c\ub9bc\uc774 \ud5c8\uc6a9\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4');
    }).catch(function(){});
  };

  /* 배너 렌더 */
  window.__wlAlertRender=function(data, res){
    /* 평가·알림은 배너 DOM 유무와 무관하게 항상 수행 */
    var fired=evaluate(data,res);
    fired.forEach(function(f){
      notify(f);
      if(window.__nnToast) window.__nnToast('\ud83c\udfaf '+esc(f.it.sym.toUpperCase())+' '+(f.dir==='hi'?'\ubaa9\ud45c\uac00 \ub3c4\ub2ec':'\ud558\ub2e8\uac00 \uc774\ud0c8')+' \u00b7 '+money(f.price,f.cur));
    });
    if(fired.length){ try{ localStorage.removeItem(DK); }catch(e){} }

    var host=document.getElementById('wlAlertBar'); if(!host) return;
    var act=active(data,res);
    var dis=''; try{ dis=localStorage.getItem(DK)||''; }catch(e){}
    var sig=act.map(function(x){ return keyOf(x.it)+x.dir; }).sort().join('|');
    if(!act.length || dis===sig){ host.innerHTML=''; host.style.display='none'; return; }
    host.style.display='';
    host.innerHTML='<div class="wla-bar"><span class="wla-ico">\ud83c\udfaf</span><div class="wla-list">'
      + act.map(function(x){
          return '<span class="wla-i '+(x.dir==='hi'?'up':'dn')+'"><b>'+esc(x.it.sym.toUpperCase())+'</b> '
            + (x.dir==='hi'?'\ubaa9\ud45c':'\ud558\ub2e8') + ' ' + money(x.target,x.cur)
            + ' <i>\u2192 ' + money(x.price,x.cur) + '</i></span>';
        }).join('')
      + '</div><button type="button" class="wla-x" title="\ub2eb\uae30">\u2715</button></div>';
    var xb=host.querySelector('.wla-x');
    if(xb) xb.onclick=function(){ try{ localStorage.setItem(DK, sig); }catch(e){} host.innerHTML=''; host.style.display='none'; };
  };

  /* 보기 설정 (시장 필터 · 정렬) */
  window.__wlView=function(){ var v=ld(VK,{}); return { mkt:v.mkt||'all', sort:v.sort||'added' }; };
  window.__wlViewSet=function(k,val){ var v=ld(VK,{}); v[k]=val; sv(VK,v); if(window.__wlRender) window.__wlRender(); };
})();

/* ══════════ MY WATCHLIST — 관심종목 (미국·한국·암호화폐, 시총·52주, 클라우드 동기화) ══════════ */
(function(){
  var WL_KEY='nn_watchlist_v1';
  function load(){ try{ var s=localStorage.getItem(WL_KEY); if(s){ var a=JSON.parse(s); if(Array.isArray(a)) return a; } }catch(e){} return []; }
  function save(a){ try{ localStorage.setItem(WL_KEY, JSON.stringify(a)); }catch(e){} }
  function wlWorker(){ try{ return (localStorage.getItem('nn_worker_url')||'').trim().replace(/\/+$/,''); }catch(e){ return ''; } }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* 숫자 포맷 */
  function fmtPrice(v,cur){ if(v==null||isNaN(v)) return '—';
    if(cur==='KRW') return '₩'+Math.round(v).toLocaleString('ko-KR');
    return '$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function fmtMcap(v,cur){ if(v==null||isNaN(v)||v<=0) return '—';
    if(cur==='KRW'){ // 원 단위
      if(v>=1e12) return '₩'+(v/1e12).toLocaleString('ko-KR',{maximumFractionDigits:1})+'조';
      return '₩'+Math.round(v/1e8).toLocaleString('ko-KR')+'억';
    }
    if(v>=1e12) return '$'+(v/1e12).toFixed(2)+'T';
    if(v>=1e9) return '$'+(v/1e9).toFixed(1)+'B';
    if(v>=1e6) return '$'+(v/1e6).toFixed(0)+'M';
    return '$'+v.toLocaleString('en-US');
  }
  function chgBadge(c){ if(c==null||isNaN(c)) return '<span class="t-chg-badge">—</span>';
    var cls=c>0?'t-up':c<0?'t-dn':'t-neu', ar=c>0?'▲':c<0?'▼':'';
    return '<span class="'+cls+'"><span class="t-chg-badge">'+(ar?ar+' ':'')+(c>0?'+':'')+c.toFixed(2)+'%</span></span>';
  }
  /* 스파크라인 — 최근 종가 배열을 얇은 선그래프로 */
  function sparkSvg(arr, up){
    if(!Array.isArray(arr) || arr.length<3) return '';
    var w=190, h=34, pad=2;
    var lo=Math.min.apply(null,arr), hi=Math.max.apply(null,arr);
    if(!isFinite(lo)||!isFinite(hi)) return '';
    var span=(hi-lo)||1;
    var pts=arr.map(function(v,i){
      var x=pad+(i/(arr.length-1))*(w-pad*2);
      var y=pad+(1-(v-lo)/span)*(h-pad*2);
      return x.toFixed(1)+','+y.toFixed(1);
    });
    var col=up?'#4ade80':'#ff5b5b';
    var id='sg'+Math.random().toString(36).slice(2,8);
    var last=pts[pts.length-1].split(',');
    return '<svg class="wl-spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" aria-hidden="true">'
      + '<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1">'
      +   '<stop offset="0%" stop-color="'+col+'" stop-opacity=".28"/>'
      +   '<stop offset="100%" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs>'
      + '<polygon points="'+pad+','+(h-pad)+' '+pts.join(' ')+' '+(w-pad)+','+(h-pad)+'" fill="url(#'+id+')"/>'
      + '<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+col+'" stroke-width="1.4" '
      +   'stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>'
      + '<circle cx="'+last[0]+'" cy="'+last[1]+'" r="2" fill="'+col+'"/>'
      + '</svg>';
  }
  function pct52(price,lo,hi){ if(price==null||lo==null||hi==null||hi<=lo) return null;
    var p=(price-lo)/(hi-lo)*100; return Math.max(0,Math.min(100,p));
  }

  /* 목표가 배지 — 현재가와 목표가의 거리 */
  function targetBadge(it,o,cur){
    if(!window.__wlAlertGet) return '';
    var a=window.__wlAlertGet(it.market+':'+it.sym);
    if(!a || (a.hi==null && a.lo==null)) return '';
    var p=(o&&o.price!=null&&!isNaN(o.price))?o.price:null;
    var parts=[];
    if(a.hi!=null){
      var d=(p!=null&&a.hi>0)?((a.hi-p)/p*100):null;
      var hit=(p!=null&&p>=a.hi);
      parts.push('<span class="wlt'+(hit?' hit':'')+'"><i>\u25b2</i>'+fmtPrice(a.hi,cur)
        +(d!=null?'<em>'+(hit?'\ub3c4\ub2ec':(d>0?'+':'')+d.toFixed(1)+'%')+'</em>':'')+'</span>');
    }
    if(a.lo!=null){
      var d2=(p!=null&&a.lo>0)?((a.lo-p)/p*100):null;
      var hit2=(p!=null&&p<=a.lo);
      parts.push('<span class="wlt lo'+(hit2?' hit':'')+'"><i>\u25bc</i>'+fmtPrice(a.lo,cur)
        +(d2!=null?'<em>'+(hit2?'\ub3c4\ub2ec':d2.toFixed(1)+'%')+'</em>':'')+'</span>');
    }
    return parts.length? '<div class="wlt-row">'+parts.join('')+'</div>' : '';
  }

  /* 필터·정렬 컨트롤 */
  var MKTS=[['all','\uc804\uccb4'],['us','\ubbf8\uad6d'],['kr','\ud55c\uad6d'],['crypto','\ucf54\uc778']];
  var SORTS=[['added','\ub4f1\ub85d\uc21c'],['chgdesc','\ub4f1\ub77d\ub960 \ub192\uc740\uc21c'],['chgasc','\ub4f1\ub77d\ub960 \ub0ae\uc740\uc21c'],['mcap','\uc2dc\uac00\ucd1d\uc561\uc21c'],['p52','52\uc8fc \uc704\uce58\uc21c'],['name','\uc774\ub984\uc21c']];
  function renderCtl(V, data, shown){
    var host=document.getElementById('wlCtl'); if(!host) return;
    var cnt={all:data.length,us:0,kr:0,crypto:0};
    data.forEach(function(x){ if(cnt[x.market]!=null) cnt[x.market]++; });
    var tabs=MKTS.filter(function(m){ return m[0]==='all' || cnt[m[0]]>0; }).map(function(m){
      return '<button type="button" class="wlc-tab'+(V.mkt===m[0]?' on':'')+'" data-mkt="'+m[0]+'">'+m[1]
        +'<span class="wlc-n">'+cnt[m[0]]+'</span></button>';
    }).join('');
    var opts=SORTS.map(function(o){ return '<option value="'+o[0]+'"'+(V.sort===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('');
    host.innerHTML='<div class="wlc-tabs">'+tabs+'</div>'
      +'<div class="wlc-right"><select class="wlc-sel" id="wlSortSel">'+opts+'</select>'
      +'<button type="button" class="wlc-bell" id="wlBell" title="\ubaa9\ud45c\uac00 \ub3c4\ub2ec \uc2dc \ube0c\ub77c\uc6b0\uc800 \uc54c\ub9bc">\ud83d\udd14</button></div>';
    host.querySelectorAll('.wlc-tab').forEach(function(b){
      b.onclick=function(){ if(window.__wlViewSet) window.__wlViewSet('mkt', b.getAttribute('data-mkt')); };
    });
    var sel=host.querySelector('#wlSortSel');
    if(sel) sel.onchange=function(){ if(window.__wlViewSet) window.__wlViewSet('sort', sel.value); };
    var bell=host.querySelector('#wlBell');
    if(bell){
      try{ if(('Notification' in window) && Notification.permission==='granted') bell.classList.add('on'); }catch(e){}
      bell.onclick=function(){ if(window.__wlNotifyAsk) window.__wlNotifyAsk(); };
    }
  }

  window.__wlRender=render;
  function render(){
    var host=document.getElementById('wlRows'), tag=document.getElementById('wlTag'); if(!host) return;
    var data=load();
    var ctl=document.getElementById('wlCtl'), abar=document.getElementById('wlAlertBar');
    if(!data.length){ host.innerHTML='<div class="wl-empty">＋ 종목 추가 버튼으로 미국·한국 주식이나 암호화폐를 등록해 보세요.</div>'; if(tag){tag.textContent='비어 있음';tag.className='sim-tag';} if(ctl) ctl.innerHTML=''; if(abar){abar.innerHTML='';abar.style.display='none';} return; }
    var W=wlWorker();
    if(!W){ 
      host.innerHTML='<div class="wl-empty">관심종목 시세는 프록시가 필요합니다. 위 통합 패널에 Worker 주소를 입력하세요.</div>';
      if(tag){tag.textContent='프록시 필요';tag.className='sim-tag';} if(ctl) ctl.innerHTML=''; return;
    }
    /* 로딩 표시 (기존 카드 유지하면서) */
    if(!host.querySelector('.wl-card')) host.innerHTML='<div class="t-loading">시세 불러오는 중...</div>';
    fetchAndRender(W,data,host,tag);
  }

  async function fetchAndRender(W,data,host,tag){
    var us=data.filter(function(x){return x.market==='us';}).map(function(x){return x.sym;});
    var kr=data.filter(function(x){return x.market==='kr';}).map(function(x){return x.sym;});
    var cr=data.filter(function(x){return x.market==='crypto';}).map(function(x){return x.sym;});
    var qs=[];
    if(us.length) qs.push('us='+encodeURIComponent(us.join(',')));
    if(kr.length) qs.push('kr='+encodeURIComponent(kr.join(',')));
    if(cr.length) qs.push('crypto='+encodeURIComponent(cr.join(',')));
    var res={us:{},kr:{},crypto:{}};
    try{
      var r=await fetch(W+'/quote?'+qs.join('&'));
      if(r.ok) res=await r.json();
      if(tag){tag.textContent='실시간';tag.className='live-tag';}
    }catch(e){ if(tag){tag.textContent='연결 실패';tag.className='sim-tag';} }
    /* 미국 종목 시총은 Yahoo v8에 없으므로 FMP로 보완 (키 있을 때) */
    try{
      var fk=''; try{ fk=(localStorage.getItem('nn_fmp_key')||'').trim(); }catch(_){}
      if(fk && us.length && typeof fmpQuote==='function'){
        var fm=await fmpQuote(us);
        if(fm){ for(var u=0;u<us.length;u++){ var sy=us[u]; if(res.us[sy] && fm[sy] && fm[sy].marketCap){ res.us[sy].mcap=fm[sy].marketCap; } } }
      }
    }catch(e){}

    window.__wlRes=res; window.__wlData=data;
    if(window.__wlAlertRender) try{ window.__wlAlertRender(data,res); }catch(e){}

    /* 필터·정렬 — data-i 는 반드시 원본 인덱스를 유지 (삭제·드로어가 이를 참조) */
    var V=(window.__wlView?window.__wlView():{mkt:'all',sort:'added'});
    var order=data.map(function(_,k){ return k; });
    if(V.mkt!=='all') order=order.filter(function(k){ return data[k].market===V.mkt; });
    function qo(k){ return (res[data[k].market]||{})[data[k].sym]||null; }
    function gv(o,f){ return (o && o[f]!=null && !isNaN(o[f])) ? o[f] : null; }
    function mcapUsd(o){
      var m=gv(o,'mcap'); if(m==null) return null;
      var c=(o&&o.cur)||'USD';
      if(c==='KRW'){ var r=(typeof krwRate==='number'&&krwRate>0)?krwRate:1390; return m/r; }
      return m;
    }
    if(V.sort!=='added'){
      order.sort(function(a,b){
        if(V.sort==='name') return String(data[a].sym).toUpperCase().localeCompare(String(data[b].sym).toUpperCase());
        var oa=qo(a), ob=qo(b), va, vb;
        if(V.sort==='mcap'){ va=mcapUsd(oa); vb=mcapUsd(ob); }
        else if(V.sort==='p52'){ va=oa?pct52(oa.price,oa.lo52,oa.hi52):null; vb=ob?pct52(ob.price,ob.lo52,ob.hi52):null; }
        else { va=gv(oa,'chg'); vb=gv(ob,'chg'); }
        if(va==null && vb==null) return 0;
        if(va==null) return 1;
        if(vb==null) return -1;
        return (V.sort==='chgasc') ? (va-vb) : (vb-va);
      });
    }
    renderCtl(V, data, order.length);
    if(!order.length){
      host.innerHTML='<div class="wl-empty">\uc774 \uc870\uac74\uc5d0 \ub9de\ub294 \uc885\ubaa9\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div>';
      return;
    }
    var h='';
    for(var oi=0;oi<order.length;oi++){
      var i=order[oi];
      var it=data[i];
      var o=(res[it.market]||{})[it.sym]||null;
      var name=o&&o.name?o.name:it.sym;
      var cur=o&&o.cur?o.cur:(it.market==='kr'?'KRW':'USD');
      var mktLabel=it.market==='us'?'US':it.market==='kr'?'KR':'CRYPTO';
      var mktCls=it.market;
      var p52=o?pct52(o.price,o.lo52,o.hi52):null;
      h+='<div class="wl-card wl-clickable" data-i="'+i+'" title="클릭하면 상세 정보가 열립니다">'
        +'<button class="wl-del" data-i="'+i+'" title="삭제">✕</button>'
        +'<div class="wl-card-top">'
        +'<span class="wl-mkt wl-mkt-'+mktCls+'">'+mktLabel+'</span>'
        +'<span class="wl-sym">'+esc(it.sym.toUpperCase())+'</span>'
        +'</div>'
        +'<div class="wl-name">'+esc(name)+'</div>'
        +'<div class="wl-price-row"><span class="wl-price"'+((o&&o.price!=null&&!isNaN(o.price))?(' data-ck="'+esc(it.market+':'+it.sym)+'" data-cv="'+o.price+'" data-cc="'+esc(cur)+'"'):'')+'>'+(o?fmtPrice(o.price,cur):'—')+'</span>'+(o?chgBadge(o.chg):'')+'</div>'
        +((o&&o.spark)?'<div class="wl-spark-wrap">'+sparkSvg(o.spark, (o.chg==null?true:o.chg>=0))+'</div>':'')
        +'<div class="wl-meta">'
        +'<div class="wl-meta-item"><span class="wl-meta-lb">시가총액</span><span class="wl-meta-v">'+(o?fmtMcap(o.mcap,cur):'—')+'</span></div>'
        +'</div>'
        +(p52!=null?(function(){ var rlb = it.market==='crypto' ? '24H' : '52주';
          return '<div class="wl-52"><div class="wl-52-bar"><div class="wl-52-fill" style="width:'+p52.toFixed(0)+'%"></div><div class="wl-52-dot" style="left:'+p52.toFixed(0)+'%"></div></div>'
          +'<div class="wl-52-lb"><span>'+rlb+' 저 '+fmtPrice(o.lo52,cur)+'</span><span>고 '+fmtPrice(o.hi52,cur)+'</span></div></div>'; })():'')
        +targetBadge(it,o,cur)
        +'</div>';
    }
    host.innerHTML=h;
    /* 시세 숫자 카운트업 — 갱신된 값만 굴러가게 */
    if(window.__nnCount){
      host.querySelectorAll('.wl-price[data-ck]').forEach(function(el){
        var ck=el.getAttribute('data-ck');
        var v=parseFloat(el.getAttribute('data-cv'));
        var c=el.getAttribute('data-cc')||'USD';
        if(isNaN(v)) return;
        window.__nnCount(el, ck, v, function(n){ return fmtPrice(n, c); });
      });
    }
    /* 카드 클릭 → 상세 드로어 */
    host.querySelectorAll('.wl-card').forEach(function(c){
      c.addEventListener('click', function(){
        var i=parseInt(c.getAttribute('data-i'),10);
        if(window.__wlDrawer) window.__wlDrawer(i);
      });
    });
    /* 삭제 바인딩 */
    host.querySelectorAll('.wl-del').forEach(function(b){
      b.onclick=function(e){ e.stopPropagation();
        var i=parseInt(b.getAttribute('data-i')); var d=load(); if(!d[i]) return;
        var removed=d[i], pos=i; d.splice(i,1); save(d); render();
        if(window.__nnToast) window.__nnToast('🗑 "'+removed.sym.toUpperCase()+'" 삭제됨',{kind:'del',undo:function(){ var dd=load(); dd.splice(pos,0,removed); save(dd); render(); if(window.__nnToast) window.__nnToast('↩ 복원되었습니다'); }});
      };
    });
  }

  /* 추가 모달 */
  window.__wlAdd=function(){
    var ov=document.getElementById('wlModal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='wlModal'; ov.className='hub-modal-ov';
    ov.innerHTML='<div class="hub-modal">'
      +'<div class="hm-title">관심종목 추가</div>'
      +'<label class="hm-lb">종목 검색 <span class="hm-hint">(기업명·티커·코드 — 미국·한국·코인 통합)</span></label>'
      +'<input class="hm-in" id="wlSearchIn" placeholder="예: 삼성전자, apple, NVDA, 비트코인" autocomplete="off">'
      +'<div class="wl-sr" id="wlSearchRes"></div>'
      +'<label class="hm-lb" style="margin-top:12px">시장 선택 <span class="hm-hint">(직접 입력 시)</span></label>'
      +'<div class="wl-mkt-pick" id="wlMktPick">'
      +  '<button type="button" class="wl-mkt-opt sel" data-m="us">미국 주식</button>'
      +  '<button type="button" class="wl-mkt-opt" data-m="kr">한국 주식</button>'
      +  '<button type="button" class="wl-mkt-opt" data-m="crypto">암호화폐</button>'
      +'</div>'
      +'<label class="hm-lb" id="wlSymLb">티커 <span class="hm-hint">(예: AAPL, NVDA, TSLA)</span></label>'
      +'<input class="hm-in" id="wlSymIn" placeholder="AAPL" autocomplete="off">'
      +'<div class="hm-btns"><button type="button" class="hm-btn hm-cancel">취소</button><button type="button" class="hm-btn hm-save">추가</button></div>'
      +'</div>';
    document.body.appendChild(ov);
    var market='us';
    var lb=ov.querySelector('#wlSymLb'), inp=ov.querySelector('#wlSymIn');
    ov.querySelectorAll('.wl-mkt-opt').forEach(function(b){
      b.onclick=function(){ market=b.getAttribute('data-m');
        ov.querySelectorAll('.wl-mkt-opt').forEach(function(x){x.classList.remove('sel');}); b.classList.add('sel');
        if(market==='us'){ lb.innerHTML='티커 <span class="hm-hint">(예: AAPL, NVDA, TSLA)</span>'; inp.placeholder='AAPL'; }
        else if(market==='kr'){ lb.innerHTML='종목코드 6자리 <span class="hm-hint">(예: 005930 삼성전자)</span>'; inp.placeholder='005930'; }
        else{ lb.innerHTML='코인 심볼 <span class="hm-hint">(예: BTC, ETH, SOL — bitcoin 같은 이름도 가능)</span>'; inp.placeholder='BTC'; }
      };
    });
    /* 통합 검색 (Worker /search — 미국·한국·코인) */
    var sIn=ov.querySelector('#wlSearchIn'), sRes=ov.querySelector('#wlSearchRes'), sTimer=null, sList=[];
    function setMarket(m){
      market=m;
      ov.querySelectorAll('.wl-mkt-opt').forEach(function(x){ x.classList.toggle('sel', x.getAttribute('data-m')===m); });
      if(m==='us'){ lb.innerHTML='티커 <span class="hm-hint">(예: AAPL, NVDA, TSLA)</span>'; inp.placeholder='AAPL'; }
      else if(m==='kr'){ lb.innerHTML='종목코드 6자리 <span class="hm-hint">(예: 005930 삼성전자)</span>'; inp.placeholder='005930'; }
      else{ lb.innerHTML='코인 심볼 <span class="hm-hint">(예: BTC, ETH, SOL)</span>'; inp.placeholder='BTC'; }
    }
    function doSearch(){
      var q=(sIn.value||'').trim();
      if(!q){ sRes.innerHTML=''; return; }
      var W=wlWorker();
      if(!W){ sRes.innerHTML='<div class="wl-sr-empty">검색은 프록시(Worker) 연결 후 사용할 수 있어요. 아래에서 직접 입력해 주세요.</div>'; return; }
      sRes.innerHTML='<div class="wl-sr-empty">검색 중...</div>';
      fetch(W+'/search?q='+encodeURIComponent(q))
        .then(function(r){ return r.ok?r.json():[]; })
        .then(function(list){
          if((sIn.value||'').trim()!==q) return;
          sList=Array.isArray(list)?list:[];
          if(!sList.length){ sRes.innerHTML='<div class="wl-sr-empty">결과가 없습니다 — 아래에서 직접 입력할 수도 있어요.</div>'; return; }
          sRes.innerHTML=sList.map(function(o,i){
            var mk=o.market==='us'?'US':o.market==='kr'?'KR':'CRYPTO';
            return '<button type="button" class="wl-sr-item" data-i="'+i+'">'
              +'<span class="wl-mkt wl-mkt-'+o.market+'">'+mk+'</span>'
              +'<span class="wl-sr-sym">'+esc(o.sym)+'</span>'
              +'<span class="wl-sr-name">'+esc(o.name)+(o.exch?' · '+esc(o.exch):'')+'</span></button>';
          }).join('');
          sRes.querySelectorAll('.wl-sr-item').forEach(function(b){
            b.onclick=function(){
              var o=sList[parseInt(b.getAttribute('data-i'),10)]; if(!o) return;
              setMarket(o.market);
              inp.value=o.sym;
              sRes.querySelectorAll('.wl-sr-item').forEach(function(x){x.classList.remove('on');});
              b.classList.add('on');
            };
          });
        })
        .catch(function(){ sRes.innerHTML='<div class="wl-sr-empty">검색 실패 — 직접 입력해 주세요.</div>'; });
    }
    sIn.addEventListener('input',function(){ clearTimeout(sTimer); sTimer=setTimeout(doSearch,450); });
    sIn.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); clearTimeout(sTimer); doSearch(); } });
    function close(){ ov.classList.remove('show'); setTimeout(function(){ if(ov.parentNode) ov.remove(); },200); }
    ov.querySelector('.hm-cancel').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    ov.querySelector('.hm-save').onclick=function(){
      var sym=(inp.value||'').trim();
      if(market!=='crypto') sym=sym.toUpperCase();
      else sym=sym.toLowerCase();
      if(!sym){ alert('티커/코드를 입력하세요.'); return; }
      var d=load();
      if(d.some(function(x){return x.market===market && x.sym.toLowerCase()===sym.toLowerCase();})){ alert('이미 추가된 종목입니다.'); close(); return; }
      d.push({market:market, sym:sym}); save(d); close(); render();
      if(window.__nnToast) window.__nnToast('✓ "'+sym.toUpperCase()+'" 추가됨');
    };
    requestAnimationFrame(function(){ ov.classList.add('show'); if(window.__nnRenderStorage) window.__nnRenderStorage(); sIn.focus(); });
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter') ov.querySelector('.hm-save').click(); });
  };

  function bind(){
    var btn=document.getElementById('wlAddBtn');
    if(btn) btn.onclick=window.__wlAdd;
    render();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
})();

