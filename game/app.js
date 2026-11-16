(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const icons = {
    badge:'<path d="m12 2 8 3v6c0 5-3.7 8.2-8 10.5C7.7 19.2 4 16 4 11V5z"/><path d="m6.7 11 3.2-3h4.2l3.2 3-3.2 3H9.9z"/><circle cx="12" cy="11" r="1.3"/>',
    book:'<path d="M3 5c3-1.2 6-.8 9 1 3-1.8 6-2.2 9-1v14c-3-1.2-6-.8-9 1-3-1.8-6-2.2-9-1zM12 6v14"/>',
    history:'<path d="M4 11a8 8 0 1 1 .6 5M3 4v6h6M12 7v5l3 2"/>',
    sound:'<path d="M3 9h4l5-4v14l-5-4H3zM15.5 8.6a5 5 0 0 1 0 6.8M18.5 5.5a9 9 0 0 1 0 13"/>',
    mute:'<path d="M3 9h4l5-4v14l-5-4H3zM16 9l6 6m0-6-6 6"/>',
    eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    people:'<circle cx="9" cy="8" r="3"/><path d="M2 19v-2a6 6 0 0 1 12 0v2M15 5a3 3 0 0 1 0 6m1 2a5 5 0 0 1 5 5v1"/>',
    person:'<circle cx="12" cy="7" r="3"/><path d="M4 20v-2a8 8 0 0 1 16 0v2z"/>',
    arrow:'<path d="M3 12h16m-6-6 6 6-6 6"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    flag:'<path d="M5 21V4c6-4 8 4 15 0v9c-7 4-9-4-15 0"/>',tick:'<path d="m4 12 5 5L20 6"/>',
    pause:'<rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/>',
    swipe:'<path d="M10 18 7 14c-1-2 1-3 2-2l2 2V7c0-2 3-2 3 0v4l3 .5 2 1V17l-2 4h-5zM2 7l2-2m-2 2 2 2M2 7h6m10-2 2 2-2 2"/>',
    focus:'<path d="M7 3H3v4m14-4h4v4M3 17v4h4m14-4v4h-4"/><circle cx="12" cy="12" r="3"/>',
    ticket:'<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM15 7v2m0 2v2m0 2v2"/>',
    glasses:'<path d="M2 10 4 6h2m16 4-2-4h-2M2 10h8v3a4 4 0 0 1-8 0zm12 0h8v3a4 4 0 0 1-8 0zM10 11q2-2 4 0"/>',
    ear:'<path d="M6 11C4 1 19 0 19 10c0 4-4 5-5 8-1 4-6 4-7 0m2-8a3.7 3.7 0 0 1 7 0c0 3-3 3-4 5m-3-4 2 1"/>',
    watch:'<rect x="5.5" y="6.5" width="13" height="11" rx="3"/><path d="m8 7 1-5h6l1 5m-8 10 1 5h6l1-5m-4-8v3l2 1"/>',
    button:'<path d="m7 3-5 4 3 5 2-1v10h10V11l2 1 3-5-5-4-5 3zM10 5l2 2 2-2m-2 3v10"/>',
    eraser:'<path d="m3.6 13.1 9.3-9.3a2 2 0 0 1 2.8 0l4.5 4.5a2 2 0 0 1 0 2.8l-8.5 8.5H8.4l-4.8-4.8a1.2 1.2 0 0 1 0-1.7ZM8.1 8.6l7.2 7.2M11.8 19.6H21"/>'
  };
  function icon(key){return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+icons[key]+'</svg>'}
  document.querySelectorAll('[data-i]').forEach(el=>{el.innerHTML=icon(el.dataset.i)});
  const stages=[
    ['첫 순찰','두 명 중 한 명만 부정행위를 합니다. 두 사람을 관찰하고, 단서가 보인 항목 하나를 검사하세요.',2],
    ['첫 실전','세 사람 중에는 평범하게 시험을 보는 학생도 있습니다. 소품이 실제로 작동하는 순간을 보세요.',3],
    ['가까이 관찰','다섯 자리를 순찰하세요. 안경 안쪽은 바깥 통로에서 수험생 어깨 뒤로 돌아가면 보입니다.',5],
    ['빽빽한 교실','일곱 명이 시험을 보고 있습니다. 작은 표시는 가까이에서 확대해 보세요.',7],
    ['마지막 교시','아홉 자리 중 부정행위자만 찾아내세요. 오검사 한 번마다 남은 시간이 5초 줄어듭니다.',9]
  ];
  const parts={
    glasses:['안경 검사','투명 렌즈 안쪽에서 작은 문장 세 줄을 확인했습니다','일반 안경 · 창문 반사 확인'],
    ear:['귀 검사','귀를 짚는 순간 수신기 옆에 작은 소리 말풍선이 떴습니다','귓가 확인 · 이상 없음'],
    watch:['손목 검사','시계 화면에서 답안 메시지 발견','아날로그시계 확인'],
    button:['옷 검사','셔츠 단추에서 촬영 렌즈 발견','평범한 단추 확인'],
    eraser:['지우개 검사','지우개 밑면에서 작은 카메라 렌즈를 확인했습니다','일반 지우개 · 밑면 확인']
  };
  const types=Object.keys(parts), panels=window.ExamPanels;
  const room=$('#room'),arena=$('#arena'),pad=$('#joystick'),stick=$('#stick');
  const now=()=>performance.now(), pad2=n=>String(n).padStart(2,'0');
  const read=(k,d)=>{try{return localStorage.getItem(k)??d}catch{return d}};
  const save=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}};
  const seedOK=s=>typeof s==='string'&&/^[\p{L}\p{N}._-]{1,64}$/u.test(s);
  const safeLevel=v=>Math.min(5,Math.max(1,Math.trunc(Number(v))||1));
  const query=new URLSearchParams(location.search);
  const incoming=seedOK(query.get('seed'));
  let seed=incoming?query.get('seed'):ExamGame.newSeed(), unlocked=safeLevel(read('patrol.unlocked','1'));
  let level=incoming?safeLevel(query.get('level')):unlocked, game=new ExamGame(seed,level),inGame=false,result=null;
  let currentFocus=null, focusShown='', noticeTimer=null, evidenceTimer=null, finishTimer=null;
  let audioOn=read('patrol.sound','on')!=='off', context=null;
  let clips=[],lastClip=-Infinity,lastSecond=null, replayId=null, gen=0, toastText='';
  let padPointer=null, lookPointer=null,padX=0,padZ=0, lastLook=null, keyState=new Set(),rotateLast=null;
  const getPhase=()=>game.phase==='playing';
  function tone(action){
    if(!audioOn)return;
    try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;context ||= new AC();
      if(context.state==='suspended')context.resume().catch(()=>{});
      if(action==='door'){
        const o=context.createOscillator(),g=context.createGain(),t=context.currentTime;
        o.type='triangle';o.frequency.setValueAtTime(148,t);o.frequency.exponentialRampToValueAtTime(41,t+.19);
        g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.0001,t+.24);
        o.connect(g);g.connect(context.destination);o.start(t);o.stop(t+.24);return;
      }
      const pattern={start:[392,523,659],normal:[494,587],evidence:[523,784,988],caught:[523,659,784,1047],wrong:[247,196],end:[587,440],tap:[440],bell:[784,659,523],tick:[520]}[action]||[440];
      pattern.forEach((hz,i)=>{const osc=context.createOscillator(),g=context.createGain(),t=context.currentTime+i*.075;osc.type='sine';osc.frequency.value=hz;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(action==='tick'?.02:.068,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+.145);osc.connect(g);g.connect(context.destination);osc.start(t);osc.stop(t+.15)});
    }catch{}
  }
  function soundUI(){const el=$('#audio');el.innerHTML=icon(audioOn?'sound':'mute');el.title=audioOn?'효과음 끄기':'효과음 켜기';el.setAttribute('aria-label',el.title);el.setAttribute('aria-pressed',String(audioOn))}
  $('#audio').onclick=()=>{audioOn=!audioOn;save('patrol.sound',audioOn?'on':'off');soundUI();tone('tap')};soundUI();
  
  let patrol=null;
  function near(){
    const target=patrol?.getTarget();
    return getPhase()&&target?.near?target:null;
  }
  function fields(target=currentFocus){
    const seat=target?.near&&getPhase()&&inGame?game.seats.find(s=>s.id===target.id&&s.status==='open'):null;
    const sig=[game.phase,level,seat?.id||'-',seat?.points.filter(p=>p.checked).map(p=>p.type).join('.'),target?.id,game.caught,game.mistakes].join('|');
    if(sig===focusShown)return;
    focusShown=sig;
    $('#inspect').hidden=!seat;arena.classList.toggle('has-target',!!seat);$('#crosshair').classList.toggle('near',!!seat);
    if(seat){
      $('#candidate').textContent=seat.id+'번 수험생';
      $('#inspect-progress').textContent='한 곳 검사 · 오검사 −5초';
    }
    let hint='';
    if(level===1){
      if(seat)hint=seat.points.some(p=>p.type==='glasses')?'어깨 뒤에서 안경 속 줄글을 찾아보세요. 검사는 가까운 어느 쪽에서든 됩니다.':'얼굴과 손목, 책상 위 소품을 살펴보고 단서가 보인 항목을 누르세요.';
      else hint='두 자리를 번갈아 관찰하세요. 한 명만 부정행위를 합니다.';
    }else if(seat){hint='단서가 보인 항목 하나를 검사하세요.'}
    else hint='남은 부정행위자 '+Math.max(0,game.targetCount-game.caught)+'명 · 수험생 가까이에서 행동을 관찰하세요.';
    $('#objective-text').textContent=hint;
  }
  patrol=createPatrol(room,{
    onFocus(info){currentFocus=info;fields(info)},
    onKick(){tone('door');},
    onCheer(count){$('#objective-text').textContent='끝났다! 남은 수험생 '+count+'명이 환호합니다.';tone('caught');},
    onComplete(){if(result?.success)showResult();}
  });
  $('#zoom').onclick=()=>{
    const on=$('#zoom').getAttribute('aria-pressed')!=='true';
    patrol.setZoom(on);$('#zoom').setAttribute('aria-pressed',String(on));$('#zoom').textContent=on?'1× 복귀':'2× 확대';
  };
  for(const [idx,type] of types.entries()){
    const b=document.createElement('button');b.type='button';b.className='part';b.dataset.part=type;b.title=parts[type][0]+' ('+(idx+1)+')';
    b.innerHTML='<i data-i="'+type+'">'+icon(type)+'</i><span>'+parts[type][0]+'</span>';
    let pressedId=null;
    b.addEventListener('pointerdown',()=>{pressedId=near()?.id??null});
    b.addEventListener('pointercancel',()=>{pressedId=null});
    b.addEventListener('click',e=>{const id=e.detail?pressedId:null;pressedId=null;if(!e.detail||id!=null)inspect(type,id)});
    $('#parts').appendChild(b);
  }
  function markChapters(){
    const list=$('#chapter-list');list.replaceChildren();
    stages.forEach(([label,,n],i)=>{const nLevel=i+1,b=document.createElement('button');b.className='chapter'+(nLevel===level?' active':'');b.type='button';b.disabled=nLevel>unlocked&&nLevel!==level;
      b.setAttribute('aria-pressed',String(nLevel===level));b.title=b.disabled?'앞 단계를 통과하면 열립니다':label;
      b.innerHTML='<b>'+pad2(nLevel)+'</b><span class="ch-name">'+label+'<small>수험생 '+n+'명</small></span><i data-i="flag">'+icon(b.disabled?'lock':nLevel<unlocked?'tick':'flag')+'</i>';
      b.onclick=()=>{if(!inGame)prepare(nLevel)};list.appendChild(b);
    });$('#unlocked-label').textContent=unlocked+' / 5단계 개방';
  }
  function welcome(){
    const [label,desc,count]=stages[level-1];
    $('#stage-label').textContent='STAGE '+pad2(level);$('#folio').textContent=pad2(level)+' / 05';$('#preview-room').textContent='제'+level+'시험실';
    $('#brief-name').textContent=label;$('#brief-desc').textContent=desc;$('#brief-seats').textContent=count+'명';$('#brief-time').textContent=(game.duration/1000)+'초';
    $('#start-copy').textContent=level===1?'첫 순찰 시작':level+'단계 순찰 시작';$('#hud-stage').textContent=pad2(level);$('#hud-name').textContent=label;markChapters();
  }
  function resetInputs(){
    keyState.clear();padPointer=null;lookPointer=null;padX=0;padZ=0;rotateLast=null;lastLook=null;
    stick.style.transform='';pad.classList.remove('engaged');patrol?.setInput(0,0);
  }
  function clearEffects(){
    clearTimeout(noticeTimer);clearTimeout(evidenceTimer);clearTimeout(finishTimer);
    $('#notice').classList.remove('show');$('#evidence').hidden=true;toastText='';if(replayId!=null)clearInterval(replayId);replayId=null;$('#replay').hidden=true;
  }
  function prepare(nextLevel=level,nextSeed=ExamGame.newSeed()){
    gen++;clearEffects();resetInputs();panels.close(true);inGame=false;level=safeLevel(nextLevel);seed=seedOK(nextSeed)?nextSeed:ExamGame.newSeed();
    game=new ExamGame(seed,level);result=null;clips=[];lastClip=-Infinity;lastSecond=null;currentFocus=null;focusShown='';
    document.body.classList.remove('in-game');arena.classList.remove('has-target','looked','finale');
    $('#zoom').setAttribute('aria-pressed','false');$('#zoom').textContent='2× 확대';
    $('#inspect').hidden=true;$('#start').disabled=false;patrol.setActive(false);patrol.setRound(game.seats,level);welcome();refreshClock();fields();
  }
  function start(){
    if(inGame||game.phase!=='ready')return;
    inGame=true;document.body.classList.add('in-game');currentFocus=null;focusShown='';
    game.start(now());patrol.setRound(game.seats,level);patrol.setActive(true);fields();refreshClock();room.focus({preventScroll:true});tone('start');
  }
  function refreshClock(){
    const ms=game.remaining(now()),sec=ms===null?null:Math.ceil(ms/1000);
    const text=sec===null?'연습':Math.floor(sec/60)+':'+pad2(sec%60);
    if($('#hud-time').textContent!==text)$('#hud-time').textContent=text;
    document.querySelector('.htime').classList.toggle('urgent',sec!==null&&sec<=10);
    if(getPhase()&&sec!==null&&sec<6&&sec>0&&lastSecond!=null&&lastSecond>sec)tone('tick');
    lastSecond=sec;const v=game.caught+' / '+game.targetCount;if($('#hud-count').textContent!==v)$('#hud-count').textContent=v;
  }
  function notice(text,duration=1250){
    clearTimeout(noticeTimer);const n=$('#notice');toastText=text;n.textContent=text;n.classList.add('show');
    noticeTimer=setTimeout(()=>{n.classList.remove('show');if(toastText===text)toastText=''},duration);
  }
  function reveal(type,hit,seatId,status){
    clearTimeout(evidenceTimer);const panel=$('#evidence');panel.hidden=false;panel.classList.toggle('found',hit);
    $('#evidence-title').textContent=seatId+'번 · '+(status==='caught'?'검거 · 경찰 호송':status==='clear'?'검사 완료 · 정상':hit?'증거 확보':'정상 확인');
    $('#evidence-copy').textContent=parts[type][hit?1:2];toastText=$('#evidence-title').textContent;
    const seat=game.seats.find(s=>s.id===seatId);
    const item=seat.points.find(p=>p.type===type);
    ExamArt.drawEvidence($('#detail'),type,hit,item.style,seat.answer,item.finish);
    evidenceTimer=setTimeout(()=>{panel.hidden=true},1850);
  }
  function inspect(type,pinId=null){
    if(!getPhase()||panels.isOpen())return;
    const focus=near();
    if(!focus||pinId!=null&&pinId!==focus.id){notice('검사할 수험생 가까이에서 확인하세요.');return}
    const res=game.inspect(focus.id,type,now(),focus.id);
    if(res.kind==='inactive'){if(game.phase==='ended')finish();return}
    if(res.kind==='wrong'){
      tone('wrong');notice('오검사 −5초 · 다른 단서를 살펴보세요.',1450);
      refreshClock();fields(focus);if(game.phase==='ended')finish();return;
    }
    if(res.kind!=='evidence')return;
    reveal(type,true,focus.id,res.status);tone('caught');
    try{navigator.vibrate?.([30,25,40])}catch{}
    patrol.sync();focusShown='';fields(patrol.getTarget());refreshClock();
    if(game.phase==='ended')finish();
  }
  function pause(){
    if(!inGame||!game.pause(now())){if(game.phase==='ended')finish();return}
    resetInputs();patrol.setActive(false);focusShown='';fields();panels.pause({resume:resume,restart:()=>{prepare();start()},home:()=>prepare()});
  }
  function resume(){
    if(document.hidden||!inGame||!game.resume(now()))return;
    resetInputs();patrol.setActive(true);focusShown='';fields(patrol.getTarget());room.focus({preventScroll:true});
  }
  function finish(){
    if(result||game.phase!=='ended')return;
    resetInputs();patrol.setActive(false);$('#inspect').hidden=true;arena.classList.remove('has-target');
    result={...game.summarize(now()),total:game.seats.length,success:game.endReason==='clear',reason:game.endReason,label:stages[level-1][0],isFinal:level===5,stamp:new Date().toISOString()};
    if(result.success&&level===unlocked){unlocked=Math.min(5,unlocked+1);save('patrol.unlocked',unlocked)}
    panels.record(result);refreshClock();tone(result.success?'bell':'end');const epoch=gen;
    if(result.success){
      arena.classList.add('finale');
      $('#objective-text').textContent='경찰이 마지막 부정행위자를 데리러 왔습니다.';
      patrol.beginFinale();
    }else finishTimer=setTimeout(()=>{if(epoch===gen&&result)showResult()},280);
  }
  function showResult(){
    if(!result)return;
    panels.results(result,{next:()=>{if(level<5){prepare(level+1);start()}},retry:()=>{prepare();start()},home:()=>prepare(result.success&&level<5?level+1:level), replay:clips.length>1?playFilm:null});
  }
  function capture(t){
    if(t-lastClip<310)return;lastClip=t;
    const shot=document.createElement('canvas'),ratio=Math.min(320/room.width,380/room.height,1);
    shot.width=Math.max(1,Math.round(room.width*ratio));shot.height=Math.max(1,Math.round(room.height*ratio));
    const c=shot.getContext('2d',{alpha:false});if(!c)return;
    c.drawImage(room,0,0,shot.width,shot.height);c.fillStyle='rgba(29,48,36,.85)';c.fillRect(0,shot.height-23,shot.width,23);
    c.fillStyle='#ffdf91';c.font='bold 10px sans-serif';c.fillText('REPLAY  '+level+'교시  ·  '+game.caught+'/'+game.targetCount+'명 검거'+(toastText?'  ·  '+toastText:''),6,shot.height-8,shot.width-12);
    clips.push({t,shot});while(clips.length&&t-clips[0].t>5000)clips.shift();
  }
  function endFilm(){clearInterval(replayId);replayId=null;$('#replay').hidden=true;showResult()}
  function playFilm(){
    if(!clips.length)return showResult();const dest=$('#film'),startTime=now(),zero=clips[0].t;let i=0;
    $('#replay').hidden=false;function step(){const elapsed=now()-startTime;while(i+1<clips.length&&clips[i+1].t-zero<=elapsed)i++;
      const s=clips[i].shot;if(dest.width!==s.width||dest.height!==s.height){dest.width=s.width;dest.height=s.height}dest.getContext('2d').drawImage(s,0,0);
      if(elapsed>clips[clips.length-1].t-zero+600)endFilm()}
    replayId=setInterval(step,70);step();
  }
  function blendInput(){
    const x=padX+Number(keyState.has('KeyD'))-Number(keyState.has('KeyA'));
    const z=padZ+Number(keyState.has('KeyW')||keyState.has('ArrowUp'))-Number(keyState.has('KeyS')||keyState.has('ArrowDown'));
    patrol.setInput(x,z);
  }
  function padMove(e){
    if(e.pointerId!==padPointer)return;
    const r=pad.getBoundingClientRect(),limit=r.width*.36,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
    const length=Math.hypot(dx,dy),fac=length>limit?limit/length:1;
    padX=dx*fac/limit;padZ=-dy*fac/limit;stick.style.transform='translate('+dx*fac+'px,'+dy*fac+'px)';blendInput();
  }
  pad.addEventListener('pointerdown',e=>{if(!getPhase()||padPointer!==null||e.button!==0)return;e.preventDefault();padPointer=e.pointerId;pad.setPointerCapture?.(e.pointerId);pad.classList.add('engaged');padMove(e)});
  pad.addEventListener('pointermove',padMove);
  function lift(e){if(e.pointerId!==padPointer)return;padPointer=null;padX=padZ=0;stick.style.transform='';pad.classList.remove('engaged');blendInput()}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,lift);
  room.addEventListener('pointerdown',e=>{if(!getPhase()||lookPointer!=null||e.button!==0)return;e.preventDefault();lookPointer=e.pointerId;lastLook={x:e.clientX,y:e.clientY,length:0};room.setPointerCapture?.(e.pointerId)});
  room.addEventListener('pointermove',e=>{if(lookPointer!==e.pointerId||!lastLook||!getPhase())return;const dx=e.clientX-lastLook.x,dy=e.clientY-lastLook.y;lastLook.length+=Math.hypot(dx,dy);lastLook.x=e.clientX;lastLook.y=e.clientY;
    if(lastLook.length>3){patrol.look(dx,dy);arena.classList.add('looked')}});
  room.addEventListener('pointerup',e=>{if(lookPointer!==e.pointerId||!lastLook)return;const tap=lastLook.length<8;lookPointer=null;lastLook=null;
    if(tap&&getPhase()){const r=room.getBoundingClientRect(),item=patrol.tap(e.clientX-r.left,e.clientY-r.top);if(item&&!item.near)notice(item.id+'번 자리로 조금 더 다가가세요.',1050)}});
  function cancelLook(e){if(e.pointerId===lookPointer){lastLook=null;lookPointer=null}}
  room.addEventListener('pointercancel',cancelLook);room.addEventListener('lostpointercapture',cancelLook);
  const movement=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
  document.addEventListener('keydown',e=>{
    if(e.metaKey||e.altKey||e.ctrlKey||panels.isOpen()||$('#codebox').open)return;
    if(getPhase()){
      if(movement.includes(e.code)){e.preventDefault();keyState.add(e.code);blendInput();return}
      if(e.repeat)return;if(e.key==='Escape'||e.code==='KeyP'){e.preventDefault();pause();return}
      if(/^[1-5]$/.test(e.key)){e.preventDefault();inspect(types[Number(e.key)-1]);return}
    }else if(!inGame&&!e.repeat&&e.code==='Space'&&(!e.target.closest('button')||e.target===$('#start'))){e.preventDefault();start()}
  });
  document.addEventListener('keyup',e=>{if(keyState.delete(e.code))blendInput()});
  document.addEventListener('visibilitychange',()=>{patrol.resetFrameClock();if(document.hidden&&getPhase())pause()});
  window.addEventListener('blur',()=>{if(getPhase())pause();else resetInputs()});
  $('#start').onclick=start;$('#help').onclick=()=>panels.help();$('#history').onclick=()=>panels.history();
  $('#pause').onclick=pause;$('#close-film').onclick=endFilm;
  const codebox=$('#codebox'),code=$('#code');
  $('#challenge').onclick=()=>{code.value='';$('#code-error').textContent='';codebox.showModal();code.focus()};
  $('#code-close').onclick=()=>codebox.close();
  function decode(input){
    const value=input.trim();
    if(/^https?:\/\//i.test(value)){try{const u=new URL(value),s=u.searchParams.get('seed'),l=u.searchParams.get('level')||'1';return seedOK(s)&&/^[1-5]$/.test(l)?[s,Number(l)]:null}catch{return null}}
    const match=value.match(/^([\p{L}\p{N}._-]{1,64})(?:@([1-5]))?$/u);return match?[match[1],Number(match[2]||1)]:null;
  }
  $('#codeform').onsubmit=e=>{e.preventDefault();const parsed=decode(code.value);if(!parsed){$('#code-error').textContent='받은 코드와 단계 번호를 확인하세요. 예: room-123@2';return}codebox.close();prepare(parsed[1],parsed[0])};
  function loop(t){
    if(!document.hidden){
      if(getPhase()){
        const dt=rotateLast==null?0:Math.min(.07,(t-rotateLast)/1000);rotateLast=t;
        const direction=Number(keyState.has('ArrowRight'))-Number(keyState.has('ArrowLeft'));
        if(direction){const fac=Math.max(390,Math.min(800,room.clientWidth||520));patrol.look(direction*dt*1.78*fac/2.65,0);arena.classList.add('looked')}
        game.tick(t);if(game.phase==='ended')finish();refreshClock();
      }
      if(game.phase!=='paused'&&!panels.isOpen()&&replayId==null){
        const drawn=patrol.step(t);
        if(drawn&&getPhase()&&level===1&&!currentFocus?.near)fields();
        if(drawn&&inGame&&(getPhase()||game.phase==='ended'&&result?.success))capture(t);
      }
    }
    requestAnimationFrame(loop);
  }
  prepare(level,seed);requestAnimationFrame(loop);
})();
