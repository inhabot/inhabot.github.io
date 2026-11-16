(() => {
  'use strict';

  const historyKey = 'pen-down.patrol.history.v3';
  const evidenceGuide = [
    ['glasses','안경 검사','바깥 통로에서 어깨 뒤 대각선으로 돌아보세요. 투명 렌즈에 작은 줄글이 잠깐 뜹니다. 확인 후 가까운 어느 방향에서든 검사하세요.'],
    ['ear','귀 검사','귀를 짚는 순간 귓가에 짧은 파형이 든 작은 말풍선이 뜹니다.'],
    ['watch','손목 검사','손목을 들어 올릴 때 시계 화면에 답안 번호가 뜹니다.'],
    ['button','옷 검사','시험지를 가슴에 맞추면 단추의 작은 촬영등이 빨갛게 두 번 깜빡입니다.'],
    ['eraser','지우개 검사','지우개를 들어 기울일 때 밑면을 보세요. 부정행위용에는 작은 원형 카메라 렌즈가 박혀 있습니다.']
  ];
  const paths = {
    book:'<path d="M3 5c4-1 6-1 9 1 3-2 5-2 9-1v14c-4-1-6-1-9 1-3-2-5-2-9-1zM12 6v14"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    pause:'<path d="M8 5v14m8-14v14" stroke-width="3.4"/>',
    play:'<path d="m7 4 13 8-13 8z"/>',
    restart:'<path d="M4 10a8 8 0 1 1 0 5m0-11v6h6"/>',
    report:'<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="2" width="6" height="5" rx="1.5"/><path d="M8.5 12h7m-7 4h5"/>',
    home:'<path d="m3 11 9-8 9 8M5 10v11h14V10m-10 11v-7h6v7"/>',
    share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.5 10.6 7.2-4.2m-7.2 7 7.2 4.2"/>',
    check:'<path d="m4 12 5 5 11-12"/>',
    clock:'<circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 1M9 2h6"/>',
    move:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
    look:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/>'
  };
  function icon(key) {
    return '<svg aria-hidden="true" class="ep-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+paths[key]+'</svg>';
  }
  const encode = value => String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const button = (key,label,picture,style='') => '<button type="button" class="ep-action '+style+'" data-action="'+key+'">'+(picture?icon(picture):'')+label+'</button>';
  let current = null;
  let memory = [];
  let storageFailed = false;
  const stamps = new WeakMap();

  function close(silent = false) {
    if (!current) return;
    const panel = current;
    current = null;
    if (panel.node.open && typeof panel.node.close === 'function') panel.node.close();
    panel.node.remove();
    if (!silent) panel.dismiss?.();
  }

  function open(type, title, illustration, contents, dismiss) {
    close(true);
    const node = document.createElement('dialog');
    node.className = 'ep-dialog';
    node.dataset.panel = type;
    node.setAttribute('aria-labelledby', 'ep-title');
    node.innerHTML = '<header class="ep-head"><div>'+icon(illustration)+'<h2 id="ep-title">'+title+'</h2></div>'+
      (dismiss?'<button type="button" class="ep-close" aria-label="닫기">'+icon('close')+'</button>':'')+
      '</header><div class="ep-content">'+contents+'</div>';
    current = { node, dismiss };
    document.body.appendChild(node);
    node.addEventListener('cancel', event => {
      event.preventDefault();
      if (dismiss && current?.node === node) close();
    });
    node.addEventListener('click', event => {
      if (event.target !== node || !dismiss) return;
      const box = node.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    });
    node.querySelector('.ep-close')?.addEventListener('click', () => close());
    node.showModal();
    const target = node.querySelector('.ep-primary') || node.querySelector('.ep-close');
    target?.focus({preventScroll:true});
    node.scrollTop = 0;
    return node;
  }

  function action(node, key, callback) {
    const control = node.querySelector('[data-action="'+key+'"]');
    if (!control) return;
    control.addEventListener('click', () => {
      if (current?.node !== node) return;
      close(true);
      callback?.();
    });
  }

  function help(onClose = () => {}) {
    const guide = evidenceGuide.map(([key,name,cue])=>'<li><canvas aria-hidden="true" data-art="'+key+'"></canvas><div><b>'+name+'</b><p>'+cue+'</p></div></li>').join('');
    const node = open('help','감독 수첩','book',
      '<div class="ep-controls"><div>'+icon('move')+'<b>왼쪽 조이스틱</b><span>교실 안 이동</span></div><div>'+icon('look')+'<b>오른쪽 화면 밀기</b><span>고개 돌리기</span></div></div>'+
      '<p class="ep-note">시험실마다 1~2명은 정직하게 시험을 봅니다. 나머지 수험생은 한 곳에만 부정행위 단서가 있습니다. 외형과 색은 매 판 달라집니다. 작동하는 순간을 관찰한 뒤 항목 하나를 눌러 적발하세요. 작은 단서는 2×로 확대할 수 있습니다.</p>'+
      '<details class="ep-guide"><summary>검사 항목별 단서</summary><ul>'+guide+'</ul></details>'+
      '<p class="ep-timing"><b>1단계</b> 2명 · 90초 연습<br><b>2단계부터</b> 단계마다 60초<br>모든 단계에서 오검사 한 번당 5초 차감</p>'+
      button('done','확인','check','ep-primary ep-wide'),onClose);
    const guideEl=node.querySelector('.ep-guide');
    function drawGuide() {
      if (!guideEl.open) return;
      node.querySelectorAll('[data-art]').forEach(can=>window.ExamArt?.draw(can,can.dataset.art));
    }
    guideEl.addEventListener('toggle',drawGuide);
    action(node,'done',onClose);
  }

  function pause(actions = {}) {
    const resume = actions.resume || (()=>{});
    const node = open('pause','잠시 멈춤','pause',
      '<p class="ep-note">시험 시간이 멈췄습니다.</p><div class="ep-menu">'+
      button('resume','순찰 계속하기','play','ep-primary')+
      button('help','감독 수첩','book')+
      (actions.restart?button('restart','이 단계 다시 시작','restart'):'')+
      (actions.home?button('home','시작 화면','home'):'')+'</div>', resume);
    action(node,'resume',resume);
    action(node,'help',()=>help(()=>pause(actions)));
    action(node,'restart',actions.restart);
    action(node,'home',actions.home);
  }

  function natural(value) {
    const n=Number(value);
    return Number.isFinite(n)?Math.max(0,Math.trunc(n)):0;
  }
  function records() {
    if (!storageFailed) {
      try {
        const stored = JSON.parse(localStorage.getItem(historyKey));
        if (Array.isArray(stored)) memory = stored.filter(row=>row && typeof row.seed==='string' && Number.isInteger(row.level) && row.level>0);
      } catch {}
    }
    return memory;
  }
  function record(data) {
    let stamp = data.stamp || stamps.get(data);
    if (!stamp) { stamp = new Date().toISOString(); stamps.set(data,stamp); }
    const row = {
      seed:String(data.seed||''),label:String(data.label||'시험장'),level:Math.max(1,natural(data.level)),
      targetCount:natural(data.targetCount), total:natural(data.total), caught:natural(data.caught),
      completed:natural(data.completed), inspected:natural(data.inspected), mistakes:natural(data.mistakes),
      elapsedMs:natural(data.elapsedMs), remainingMs:data.remainingMs==null?null:natural(data.remainingMs),
      success:!!(data.success ?? (data.reason==='clear')), stamp:String(stamp)
    };
    const prev = records();
    const prior = prev.find(r=>r.seed===row.seed && r.level===row.level && r.stamp===row.stamp);
    if (prior) return prior;
    memory = [row,...prev].slice(0,150);
    try { localStorage.setItem(historyKey,JSON.stringify(memory)); storageFailed=false; }
    catch { storageFailed=true; }
    return row;
  }
  const seconds = milliseconds => (natural(milliseconds)/1000).toFixed(1);
  function dateText(stamp) {
    const date = new Date(stamp);
    return Number.isNaN(+date)?'':new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
  }
  function history(onClose = ()=>{}) {
    const sorted = [...records()].sort((a,b)=>Number(b.success)-Number(a.success) || b.level-a.level || (b.caught/Math.max(b.targetCount,1)-a.caught/Math.max(a.targetCount,1)) || a.mistakes-b.mistakes || a.elapsedMs-b.elapsedMs);
    const best=sorted[0];
    const rows=sorted.map((r,i)=>'<tr><td>'+String(i+1).padStart(2,'0')+'</td><td><b>'+natural(r.level)+'단계</b><small>'+encode(dateText(r.stamp))+'</small></td><td>'+natural(r.caught)+'/'+natural(r.targetCount)+'명</td><td>'+seconds(r.elapsedMs)+'초</td></tr>').join('');
    const body=best?'<div class="ep-best"><span>최고 기록</span><strong>'+natural(best.level)+'단계 '+(best.success?'통과':'도전')+'</strong><small>'+natural(best.caught)+'명 적발 · '+seconds(best.elapsedMs)+'초</small></div>'+
      '<table class="ep-table"><thead><tr><th scope="col">순위</th><th scope="col">단계</th><th scope="col">적발</th><th scope="col">소요 시간</th></tr></thead><tbody>'+rows+'</tbody></table>':
      '<div class="ep-empty">'+icon('report')+'<h3>아직 순찰 기록이 없어요</h3><p>한 단계를 마치면 이 기기에 결과가 남습니다.</p></div>';
    const node = open('history','순찰 기록','report',body+button('done','돌아가기','arrow','ep-primary ep-wide'),onClose);
    action(node,'done',onClose);
  }

  function showShare(node,row) {
    let url='';
    if (/^https?:$/.test(location.protocol)) {
      const address=new URL(location.href);
      address.search='';address.hash='';
      address.searchParams.set('seed',row.seed);address.searchParams.set('level',row.level);
      url=address.href;
    }
    let section=node.querySelector('.ep-share');
    if (!section) {
      section=document.createElement('section');section.className='ep-share';
      section.innerHTML='<label for="ep-challenge">'+(url?'같은 시험장 링크':'같은 시험장 코드')+'</label><div><input id="ep-challenge" readonly><button type="button" class="ep-action">복사</button></div><p role="status"></p>';
      node.querySelector('.ep-results-actions').after(section);
      const input=section.querySelector('input');
      input.value=url||row.seed+'@'+row.level;
      input.addEventListener('focus',()=>input.select());
      const status=section.querySelector('p');
      if(!url)status.textContent='게임 파일과 이 코드를 함께 보내세요.';
      section.querySelector('button').onclick=async()=>{
        let copied=false;
        try { await navigator.clipboard.writeText(input.value);copied=true; }
        catch { input.focus();input.select();try { copied=document.execCommand('copy'); } catch {} }
        status.textContent=copied?'복사했습니다.':'내용을 선택한 뒤 복사해 주세요.';
      };
    }
    if(url&&typeof navigator.share==='function'){
      navigator.share({title:'펜 내려! · '+row.level+'단계',text:row.level+'단계에서 '+row.caught+'명을 적발했어요. 같은 시험장에 도전해 보세요!',url}).catch(()=>{});
    }else section.querySelector('input').focus({preventScroll:true});
  }

  function results(data,actions = {}) {
    const row=record(data);
    const finished=!!data.isFinal;
    const headline=row.success?(finished?'전 단계 통과!':row.level===1?'첫 순찰 완료!':row.level+'단계 통과!'):'시험 종료';
    const next=row.success&&!finished&&typeof actions.next==='function';
    const primary=next?button('next',(row.level+1)+'단계로 이동','arrow','ep-primary ep-wide'):
      (row.success&&finished&&actions.home?button('home','시작 화면으로','home','ep-primary ep-wide'):button('retry','이 단계 다시 도전','restart','ep-primary ep-wide'));
    const stats=[['남은 수험생',(row.total-row.caught)+'명'],['오검사',row.mistakes+'회'],['페널티 포함 시간',seconds(row.elapsedMs)+'초']];
    const node=open('results','순찰 결과','report',
      '<div class="ep-result '+(row.success?'ep-success':'ep-timeout')+'"><span class="ep-stage">'+row.level+'단계 · '+(row.level===1?'튜토리얼':'현장 순찰')+'</span><h3>'+headline+'</h3><div class="ep-score"><b>'+row.caught+'</b><span>/ '+row.targetCount+'명 적발</span></div><div class="ep-stamp" aria-hidden="true">'+icon(row.success?'check':'clock')+'</div></div>'+
      '<div class="ep-stats">'+stats.map(([label,value])=>'<div><span>'+label+'</span><b>'+value+'</b></div>').join('')+'</div>'+
      '<div class="ep-results-actions">'+primary+button('share','친구에게 도전장','share','ep-wide')+'</div>'+
      '<div class="ep-links">'+(actions.replay?button('replay','마지막 장면 보기',null,'ep-link'):'')+
      ((next||row.success&&finished)&&actions.retry?button('retry2','다시 도전',null,'ep-link'):'')+
      (!(row.success&&finished)&&actions.home?button('home','시작 화면',null,'ep-link'):'')+'</div>');
    action(node,'next',actions.next);action(node,'home',actions.home);action(node,'retry',actions.retry);action(node,'retry2',actions.retry);action(node,'replay',actions.replay);
    node.querySelector('[data-action="share"]').addEventListener('click',()=>showShare(node,row));
  }

  window.ExamPanels={help,pause,results,history,record,close,isOpen:()=>!!current?.node.open};
})();
