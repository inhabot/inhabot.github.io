// All poses use the same seated skeleton. Distances are in metres and time is in seconds.
(() => {
  'use strict';
  const gear=globalThis.ExamGear;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a,b,t) => a + (b-a)*t;
  const blend = (a,b,t) => a.map((v,i)=>mix(v,b[i],t));
  const smooth = (a,b,v) => { const t=clamp((v-a)/(b-a)); return t*t*(3-2*t); };
  const envelope = (t,start,peak,release,end) => smooth(start,peak,t)*(1-smooth(release,end,t));
  const tones = new Map();
  function tint(hex,light) {
    if(light===1)return hex;
    const key=hex+':'+Math.round(light*100);
    if(tones.has(key))return tones.get(key);
    const n=parseInt(hex.slice(1),16), channels=[n>>16,(n>>8)&255,n&255];
    const out='#'+channels.map(v=>Math.round(clamp(v*light,0,255)).toString(16).padStart(2,'0')).join('');
    tones.set(key,out);return out;
  }
  // Jacket, shirt, trousers, skin, hair, haircut. Hair silhouettes differentiate seats at a glance.
  const people = [
    ['#508786','#e9ddc3','#344853','#e6af89','#332f32','part'],
    ['#d79464','#fff0d1','#46505c','#e4b190','#45332e','pony'],
    ['#839774','#ede3c9','#3b4d51','#c99478','#302d34','bob'],
    ['#ab6a64','#eedcc5','#494d64','#eab38f','#513b31','crop'],
    ['#8995b8','#f2e8d2','#474357','#dba681','#342b2c','bun'],
    ['#d5be86','#f8efd4','#455465','#bd8b6e','#3b3430','wave'],
    ['#648a9e','#e7e8d5','#3e4b51','#ebba99','#40302c','bob'],
    ['#b27e90','#f4e4c9','#4e5551','#ca9579','#342e32','part'],
    ['#8ba98e','#f0e8ce','#3c4f51','#e4ad8b','#302e31','pony'],
    ['#b17b51','#f5e4cb','#465461','#cf9979','#393239','crop'],
    ['#7d829a','#ecdfc8','#534b4f','#dea884','#3e312a','wave'],
    ['#a7ad76','#efe1bf','#46535c','#e6b494','#47342e','bun']
  ];
  const idle={type:'idle',positive:false,power:0,light:0,phase:0,flinch:0,swipe:0,hands:0};
  function actionFor(seat,t,caughtAt) {
    if(!seat.points.length||seat.status!=='open'&&caughtAt==null)return idle;
    const settle=caughtAt==null?1:1-smooth(caughtAt,caughtAt+.40,t);
    if(!settle)return idle;
    if(caughtAt!=null)t=Math.min(t,caughtAt);
    const period=seat.cuePeriod||gear.cueBase, time=t+(seat.cueOffset||0);
    const turn=Math.floor(time/period),phase=(time-turn*period)/gear.cueBase;
    if(phase>=.74)return idle;
    const evidence=seat.points.find(p=>p.positive);
    let item=evidence||seat.points[turn%seat.points.length];
    // Give each evidence type the same cadence. Ordinary gear shares the same gestures.
    const beat=turn+seat.id;
    if(evidence&&beat%4===3){
      const ordinary=seat.points.filter(p=>!p.positive);
      if(ordinary.length){
        const start=Math.max(0,ordinary.findIndex(p=>p.type==='eraser'));
        item=ordinary[(start+Math.floor(beat/4))%ordinary.length];
      }
    }
    const power=settle*envelope(phase,.04,.24,.60,.74);
    return {type:item.type,positive:item.positive,power,phase,turn,hands:power,
      light:item.positive?settle*envelope(phase,.26,.31,.58,.64):0,
      swipe:envelope(phase,.12,.27,.56,.68),
      flinch:item.type==='ear'?envelope(phase,.04,.10,.13,.22):0};
  }

  function putsPenDown(act,id,level){
    return ['ear','button'].includes(act.type)||act.type==='glasses'&&level!==1&&(act.turn+id)%3===0;
  }
  function penRelease(act,id,level,released){
    return Math.max(released,putsPenDown(act,id,level)?smooth(0,.55,act.power):0);
  }
  // One pose is shared by the desk prop and the fingers through pickup and set-down.
  function eraserPose(spec,power){
    const reach=smooth(0,.31,power),lift=smooth(.31,1,power),angle=lift*1.99;
    const c=Math.cos(angle),sn=Math.sin(angle);
    const x=.355-.095*lift,y=1.005+spec.h/2+.248*lift,z=-.574+.024*lift;
    const point=(dx,dy,dz)=>[x+dx,y+dy*c-dz*sn,z+dy*sn+dz*c];
    const hand=[x+spec.w*.75, y+.039-.027*lift, z+.055];
    return {reach,lift,point,hand};
  }
  function drawEraser(g,item,x,z,power){
    const spec=gear.eraser[item.style],color=gear.finishes.eraser[item.finish||0];
    const pose=eraserPose(spec,power);
    const point=(dx,dy,dz)=>{
      const p=pose.point(dx,dy,dz);return [x+p[0],p[1],z+p[2]];
    };
    const rim=(scale,y)=>spec.outline.map(([u,v])=>point(spec.w*u*scale,y,spec.d*v*scale));
    const h=spec.h/2,rows=[rim(.92,-h),rim(1,-h+.004),rim(1,h-.004),rim(.91,h)];
    g.poly(rows[0],color,.93);g.poly(rows[3],color,1.06);
    for(let j=1;j<rows.length;j++){
      const lo=rows[j-1],hi=rows[j];
      for(let k=0;k<lo.length;k++){
        const next=(k+1)%lo.length,dir=spec.outline[k];
        g.poly([lo[k],lo[next],hi[next],hi[k]],color,.91-.065*dir[0]-.055*dir[1]+(j===3?.08:0));
      }
    }
    for(const u of [-.28,-.16]){
      const stripe=(a,b)=>point(a*spec.w,h+.0005,b*spec.d);
      g.poly([stripe(u,-.43),stripe(u+.045,-.43),stripe(u+.045,.43),stripe(u,.43)],'#f4ecd9');
    }
    if(!item.positive||pose.lift<.008)return;
    // Inset optical assembly on the underside. The opaque rubber hides it from above.
    function disc(cx,cz,r,depth,color){
      const ring=[];
      for(let i=0;i<20;i++){const a=i*TAU/20;ring.push(point(cx+r*Math.cos(a),-h-depth,cz+r*Math.sin(a)));}
      g.poly(ring,color);
    }
    const cx=-.18*spec.w,cz=.03*spec.d;
    disc(cx,cz,.016,.00045,'#39434b');disc(cx,cz,.0125,.0008,'#78919a');
    disc(cx,cz,.0102,.0012,'#192e3c');disc(cx,cz,.0056,.0015,'#294f63');
    disc(cx-.0036,cz+.0038,.0028,.0018,'#c1e6f1');
  }
  // The same pen and page stay at the desk through writing, fidgeting and an empty seat.
  function drawMaterials(g,seat,x,z,t,released,caughtAt,level){
    const act=actionFor(seat,t,caughtAt), cue=type=>act.type===type?act.power:0;
    const eraser=seat.points.find(p=>p.type==='eraser');
    if(eraser)drawEraser(g,eraser,x,z,cue('eraser')*(1-released));
    const rest=penRelease(act,seat.id,level,released);
    const phase=t*4.6+seat.id*.79;
    const shift=(Math.sin(phase)*.022+Math.sin(phase*.37)*.016)*(1-Math.max(rest,cue('watch')*.89));
    const tip=[x-.050+shift,1.021,z-.631],tail=[x-.107+shift,1.127,z-.523];
    const nib=blend(tip,[x-.315,1.016,z-.526],rest),end=blend(tail,[x-.389,1.018,z-.392],rest);
    const ink=blend(nib,end,.12),cap=blend(nib,end,.83);
    g.rod(nib,ink,.0043,'#635e50',6);g.rod(ink,cap,.009,'#304856',8);g.rod(cap,end,.010,'#63898f',8);
    const lift=cue('button')*(1-released),angle=lift*.60;
    const point=(dx,fromHinge,above=0)=>[x+dx+.12*lift,1.016+fromHinge*Math.sin(angle)+above*Math.cos(angle),z-.864+fromHinge*Math.cos(angle)-above*Math.sin(angle)];
    const patch=(a,b,c,d,col,above)=>g.poly([point(a,c,above),point(b,c,above),point(b,d,above),point(a,d,above)],col);
    patch(-.25,.22,0,.44,'#fbf4e3',0);
    patch(-.218,.114,.037,.051,'#867d69',.0016);
    for(let i=0;i<5;i++){
      const j=.09+i*.061;
      patch(-.214,-.09+(i%2)*.037,j,j+.006,'#ada994',.0016);
      for(let k=0;k<3;k++)patch(.018+k*.047,.037+k*.047,j,j+.012,'#a6a08c',.0016);
    }
  }
  // A slightly flattened oval preserves the facial plane while rounding the temples.
  const profiles = new Map();
  function profile(count, exponent) {
    const key=count+'|'+exponent;
    if(profiles.has(key))return profiles.get(key);
    const curve=[];
    for(let i=0;i<count;i++){
      const a=TAU*i/count, sn=Math.sin(a), cs=Math.cos(a);
      const bend=x=>Math.sign(x)*Math.pow(Math.abs(x),exponent);
      curve.push({x:bend(sn),z:-bend(cs),light:.91-.17*sn+.105*cs});
    }
    profiles.set(key,curve);return curve;
  }
  const animalCoats={
    cat:['#d19c68','#9aa5a4','#c89371'],
    dog:['#d9b785','#e8c9a2','#c99262'],
    bear:['#ae805e','#c6956d','#956c55']
  };
  const earSockets={cat:[-.152,.163,-.047],dog:[-.201,.045,-.027],bear:[-.152,.160,-.049]};
  function animalHead(surface,species,fur,close,expression){
    const cat=species==='cat',dog=species==='dog',bear=species==='bear';
    const width=cat?.181:dog?.167:.183,height=dog?.180:.166,depth=cat?.149:.155;
    const cream=cat?'#f1d9b5':dog?'#f1d8b1':'#daba91',dark=tint(fur,.68);
    const ink='#322e30',eye=cat?'#94ae83':'#6f5745';
    function oval(x,y,z,rx,ry,rz,color,cols=14,rows=8,group='base'){
      surface(close?cols:Math.max(7,Math.ceil(cols*.55)),close?rows:Math.max(4,Math.ceil(rows*.55)),(u,v)=>{
        const a=TAU*u,b=(v-.5)*Math.PI,r=Math.cos(b);
        return [x+rx*r*Math.sin(a),y+ry*Math.sin(b),z-rz*r*Math.cos(a)];
      },color,-1,0,group);
    }
    function onFace(x,y,out=0){
      return [x,y,.012-depth*Math.sqrt(Math.max(.012,1-(x/width)**2-((y-.010)/height)**2))-out];
    }
    function marking(path,color,thickness,group='base'){
      surface(close?16:9,2,(u,v)=>{
        const [x,y,bulge]=path(u);
        return onFace(x,y+(v-.5)*thickness,bulge||.004);
      },color,-1,.002,group);
    }
    oval(0,.010,.012,width,height,depth,fur,30,17);
    for(const side of [-1,1]){
      if(cat){
        // Rounded triangular pinnae with a recessed pink front.
        const ear=(u,v,inner)=>{
          const a=TAU*u,r=(1-v)**.78,base=inner?.140:.134,w=inner?.037:.063;
          return [side*(base+.023*v+w*r*Math.cos(a)),(inner?.126:.097)+(inner?.085:.140)*v,
            (inner?-.036:.001)+.009*v+(inner?.015:.044)*r*Math.sin(a)];
        };
        surface(close?22:12,close?9:5,(u,v)=>ear(u,v,false),fur,-side);
        surface(close?16:10,close?7:4,(u,v)=>ear(u,v,true),'#ca9390',-side);
        for(let j=0;j<2;j++)
          surface(close?14:8,2,(u,v)=>{
            const x=side*(.014+j*.022+.009*u+(v-.5)*(.003+.014*u));
            return onFace(x,.080+j*.013+.057*u,.006);
          },dark,-1);
      }else if(dog){
        oval(side*.166,.019,.030,.052,.123,.060,dark,20,12);
        oval(side*.178,-.045,.006,.037,.052,.047,dark);
      }else{
        oval(side*.136,.142,.020,.060,.058,.043,fur,21,12);
        oval(side*.141,.147,-.011,.040,.037,.023,'#b58770');
      }
      const ex=side*.074,ey=.030,ez=onFace(ex,ey,0)[2];
      if(dog&&side===1)oval(ex,ey+.006,ez+.009,.050,.059,.013,dark);
      oval(ex,ey,ez-.004,cat?.023:.019,cat?.018:.022,.010,ink,16,9,'open');
      oval(ex,ey+.001,ez-.009,.014,.016,.008,eye,14,8,'open');
      oval(ex,ey+.001,ez-.014,cat?.005:.009,.013,.006,ink,12,7,'open');
      oval(ex-.005,ey+.008,ez-.018,.0048,.0048,.0026,'#fff8df',10,5,'open');
      marking(u=>[side*(.054+.039*u),ey+.012*Math.sin(Math.PI*u),.019],ink,.006,'shut');
      const brow=expression==='cry'?.015:0;
      marking(u=>[side*(.051+.044*u),.073+.007*Math.sin(Math.PI*u)+brow*(1-u),.004],dark,.006);
    }
    if(dog){
      surface(close?18:10,3,(u,v)=>{
        const x=(v-.5)*(.021+.017*Math.sin(Math.PI*u));
        return onFace(x,.015+.120*u,.004);
      },cream,-1);
    }
    if(bear){
      for(let j=0;j<5;j++){
        const y=.076+j*.014;
        marking(u=>[-.005+u*.009,y+u*.004,.004],tint(fur,.80),.003);
      }
    }
    const muzzleZ=dog?-.153:-.140,tipZ=dog?-.202:-.184;
    const smile=expression==='smile',cry=expression==='cry';
    if(smile){
      oval(0,-.101,muzzleZ-.014,.039,.021,.025,'#593b39');
      oval(0,-.111,muzzleZ-.031,.024,.008,.010,'#d48c83');
    }
    for(const side of [-1,1]){
      oval(side*.031,-.067,muzzleZ,cat?.046:.050,.035,dog?.049:.037,cream,20,11);
      if(cat){
        for(let j=0;j<3;j++){
          surface(close?12:6,1,(u,v)=>[side*(.060+.124*u),-.064-j*.014+u*(.014-j*.011)+(v-.5)*.0034,
            -.167+.061*u*u],'#6c594b',side);
        }
      }
    }
    oval(0,-.047,tipZ,cat?.019:.027,cat?.012:.018,.014,cat?'#b57973':ink,18,10);
    oval(-.006,-.042,tipZ-.012,.006,.003,.002,cat?'#dfaaa3':'#72696a',9,5);
    if(!smile){
      surface(close?18:9,2,(u,v)=>{
        const x=(u-.5)*.053;
        return [x,-.085+(cry?-.011:.007)*(Math.abs(x)/.026)**1.5+(v-.5)*.0035,muzzleZ-.028];
      },ink,-1);
    }
    return onFace;
  }

  // Billboard uses the same depth-tested world geometry as the earpiece.
  function whisperBubble(geo,ear,headCenter,view,t,strength){
    const right=[view.cy,0,-view.sy],up=[-view.sy*view.sp,view.cp,-view.cy*view.sp];
    const normal=[-view.sy*view.cp,-view.sp,-view.cy*view.cp];
    const side=(ear[0]-headCenter[0])*right[0]+(ear[2]-headCenter[2])*right[2]>0?1:-1;
    const size=.86+.14*strength, bob=.003*Math.sin(t*10);
    const p=(x,y,z)=>ear.map((a,i)=>a+right[i]*(side*.083+x*size)+up[i]*(.093+bob+y*size)+normal[i]*z);
    const layer=(scale,depth,color)=>{
      const rim=[];
      for(let i=0;i<28;i++){const a=i*TAU/28;rim.push(p(Math.cos(a)*.066*scale,Math.sin(a)*.039*scale,depth));}
      geo.poly(rim,color);
      geo.poly([p(-side*.036*scale,-.017*scale,depth),p(-side*.066*scale,-.057*scale,depth),p(-side*.002*scale,-.028*scale,depth)],color);
    };
    layer(1,.072,'#475b60');layer(.88,.073,'#fff3d3');
    for(let j=-1;j<=1;j++){
      const x=j*.016,h=.007+.012*(.5+.5*Math.sin(t*13+j*1.8));
      geo.poly([p(x-.003,-h,.074),p(x+.003,-h,.074),p(x+.003,h,.074),p(x-.003,h,.074)],'#416672');
    }
  }

  const headModels=new Map();
  function sculptHead(id, skin, hair, cut, glasses, frame, close, expression, species) {
    const key=[id,skin,hair,cut,glasses,frame,close,expression,species].join('|');
    if(headModels.has(key))return headModels.get(key);
    const points=[],faces=[];
    const tau=Math.PI*2;
    const add=(p)=>{points.push(p);return points.length-1;};
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const unit=v=>{const length=Math.hypot(...v)||1;return v.map(x=>x/length);};
    const sub=(a,b)=>a.map((x,i)=>x-b[i]);
    // Sample a continuous surface and its tangents once, in head space.
    function surface(cols,rows,fn,color,orientation=1,bias=0,group='base',gloss=0) {
      if(close){cols=Math.ceil(cols*1.55);if(rows>=3)rows=Math.ceil(rows*1.36);}
      const grid=[],lights=[];
      for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){
        const u=c/cols,v=r/rows,p=fn(u,v),delta=.0003;
        const dx=sub(fn(u+delta,v),fn(u-delta,v));
        const dy=sub(fn(u,Math.min(1,v+delta)),fn(u,Math.max(0,v-delta)));
        const normal=unit(cross(dx,dy)).map(n=>n*orientation);
        const lit=-.49*normal[0]+.72*normal[1]-.49*normal[2];
        const spec=Math.max(0,-.39*normal[0]+.51*normal[1]-.76*normal[2]);
        grid.push(add(p));lights.push(.90+.21*lit+gloss*Math.pow(spec,9));
      }
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
        const i=r*(cols+1)+c,order=[i,i+1,i+cols+2,i+cols+1];
        faces.push({indices:order.map(j=>grid[j]),lights:order.map(j=>lights[j]),color,bias,group});
      }
    }
    function finishModel(onFace){
      if(glasses){
        const spec=gear.glasses[glasses-1];
        for(const side of [-1,1]){
          surface(close?28:16,close?6:4,(u,v)=>{
            const a=u*tau,b=v*tau,[dx,dy]=gear.lensPoint(spec,side,a);
            const x=side*.078+dx+spec.rim*Math.cos(b)*Math.cos(a);
            const y=.003+dy+spec.rim*Math.cos(b)*Math.sin(a);
            return [x,y,-.215+.017*(Math.abs(x)/.151)**2-spec.rim*Math.sin(b)];
          },frame,1,.009,'base',.42);
        }
      }
      const model={points,faces,onFace};headModels.set(key,model);return model;
    }
    if(species)return finishModel(animalHead(surface,species,skin,close,expression));
    const exp=(x,w)=>Math.exp(-x*x/(w*w));
    const widths=[[-.218,.013,.021,-.060],[-.206,.061,.066,-.052],[-.176,.108,.101,-.029],
      [-.141,.137,.122,-.012],[-.092,.156,.139,0],[-.045,.172,.147,.004],
      [.012,.178,.153,.008],[.080,.178,.158,.011],[.143,.162,.147,.017],
      [.185,.128,.119,.022],[.215,.080,.079,.024],[.231,.009,.012,.025]];
    function section(y) {
      let i=0;while(i+2<widths.length&&y>widths[i+1][0])i++;
      const a=widths[Math.max(0,i-1)],b=widths[i],c=widths[i+1],d=widths[Math.min(i+2,widths.length-1)];
      const h=c[0]-b[0],t=clamp((y-b[0])/h),t2=t*t,t3=t2*t;
      return [1,2,3].map(k=>(2*t3-3*t2+1)*b[k]+(t3-2*t2+t)*h*(c[k]-a[k])/(c[0]-a[0])
        +(-2*t3+3*t2)*c[k]+(t3-t2)*h*(d[k]-b[k])/(d[0]-b[0]));
    }
    function relief(x,y) {
      const ax=Math.abs(x);
      return .022*exp(x,.025)*exp(y+.020,.069)+.049*exp(x,.023)*exp(y+.061,.026)
        +.014*exp(ax-.022,.014)*exp(y+.070,.014)
        +.012*exp(ax-.099,.049)*exp(y+.045,.032)
        -.012*exp(ax-.070,.041)*exp(y-.014,.026)
        +.009*exp(ax-.069,.052)*exp(y-.049,.024)
        +.009*exp(x,.056)*exp(y+.122,.037);
    }
    const signed=(n,e)=>Math.sign(n)*Math.pow(Math.abs(n),e);
    function frontZ(x,y) {
      const [w,d,cz]=section(y), q=Math.min(.9999,Math.abs(x)/w);
      const co=Math.sqrt(Math.max(0,1-Math.pow(q,2/.86)));
      return cz-d*Math.pow(co,.86)-relief(x,y)*co*co;
    }
    // A denser angular sampling across the face describes the bridge, cheeks and eye sockets.
    surface(close?40:16,close?18:8,(u,v)=>{
      const angle=(u-.5)*tau-.52*Math.sin((u-.5)*tau);
      const y=mix(-.218,.231,v),[w,d,cz]=section(y),sn=Math.sin(angle),cs=Math.cos(angle);
      const x=w*signed(sn,.86);
      return [x,y,cz-d*signed(cs,.86)-relief(x,y)*Math.max(0,cs)**2];
    },skin,-1);
    surface(close?24:12,1,(u,v)=>[.013*v*Math.sin(tau*u),-.218,-.060-.021*v*Math.cos(tau*u)],skin,1);
    const onFace=(x,y,out)=>[x,y,frontZ(x,y)-out];
    for(const side of [-1,1]){
      const eye=(u)=>{const x=(u-.5)*.072;return {x:side*(.068+x),y:.009+.004*(u-.5),arc:Math.sin(Math.PI*clamp(u))};};
      surface(close?12:6,2,(u,v)=>{
        const {x,y,arc}=eye(u);return onFace(x,y+arc*mix(-.010,.013,v),.003+.004*arc*Math.sin(v*Math.PI));
      },'#f5e5d4',-side,.011,'open');
      // The iris follows the curvature of the sclera and sits behind the upper lid.
      for(const [rx,ry,offset,ink,out] of [[.0128,.011,0,'#775442',.009],[.0074,.008,0,'#322c2c',.010],[.0026,.0025,-.003,'#fcf0df',.011]]){
        surface(close?12:8,1,(u,v)=>{
          const a=tau*u, x=side*.067+offset+rx*v*Math.cos(a),y=.009-offset+ry*v*Math.sin(a);
          return onFace(x,y,out);
        },ink,1,.013,'open');
      }
      for(const group of ['open','shut']){
        surface(close?12:6,1,(u,v)=>{
          const {x,y,arc}=eye(u);
          return onFace(x,y+arc*((group==='open'?.013:expression==='smile'?.010:0)+.0036*v),.010);
        },'#61443e',-side,.016,group);
      }
      surface(close?12:6,2,(u,v)=>{
        const {x,y,arc}=eye(u);
        return onFace(x,y+.034+.010*arc+v*(.003+.008*arc),.003+.002*Math.sin(v*Math.PI));
      },tint(hair,1.21),-side,.010);
      surface(close?10:6,1,(u,v)=>{
        const a=u*tau;return onFace(side*(.017+.005*v*Math.cos(a)),-.073+.0024*v*Math.sin(a),.0023);
      },tint(skin,.66),1,.005);
      // Helix, concha and lobe form a single cupped pinna, with the opening facing outwards.
      surface(close?18:8,close?5:3,(u,v)=>{
        const a=u*tau, rim=.017*exp(v-.80,.14);
        return [side*(.179+.018*Math.sin(Math.PI*v)+rim-.013*v**5),-.036+.049*v*Math.cos(a),
          .005+.032*v*Math.sin(a)+.010*v*Math.cos(a)];
      },tint(skin,.94),-side,.008);
      surface(close?12:7,2,(u,v)=>{
        const a=(u*.78+.10)*tau;
        return [side*(.201+.003*Math.sin(Math.PI*v)),-.035+(.029+.005*v)*Math.cos(a),
          .005+(.014+.004*v)*Math.sin(a)];
      },skin,side,.011);
    }
    for(const upper of [false,true]){
      if(expression==='smile'){
        const section=(u,v)=>{
          const arc=Math.sin(Math.PI*clamp(u)), x=(u-.5)*.095;
          return onFace(x,-.108-.014*arc-.030*arc*v,.007);
        };
        if(upper)surface(close?22:10,3,section,'#713e3b',1,.011);
        else surface(close?22:10,2,(u,v)=>section(u,.04+.26*v).map((n,i)=>i===2?n-.001:n),'#fff1da',1,.014);
        continue;
      }
      surface(close?16:8,3,(u,v)=>{
        const x=(u-.5)*.068,arc=Math.sin(clamp(u)*Math.PI),seam=-.123+(expression==='cry'?-.016*(1-arc):.002*(u-.5));
        const height=upper?.007+.004*exp(Math.abs(x)-.010,.006):-.009;
        return onFace(x,seam+height*v*arc,.003+(.002+.004*Math.sin(v*Math.PI))*arc);
      },upper?'#b87869':'#cd9081',upper?-1:1,.008);
    }
    const part=(cut==='part'?.43:-.42);
    function hairPoint(u,v){
      const a=u*tau,front=Math.max(0,Math.cos(a)), swept=a+part*Math.sin(v*Math.PI*.80);
      const fringe=front**3,lock=Math.cos(9*swept+.8*Math.sin(2*swept));
      const atEar=Math.pow(Math.abs(Math.sin(a)),8);
      const bottom=-.085-.042*(1-front)+fringe*(.169+.024*Math.sin(2*a+part*3))+.005*lock+.091*atEar;
      const y=bottom+(.247-bottom)*Math.sin(v*Math.PI*.5);
      // Ellipsoidal crown radius at each height, measured from the temples.
      const dome=Math.sqrt(Math.max(.0015,1-Math.max(0,(y-.069)/.179)**2));
      const rib=.003*lock*(.20+.8*Math.sin(Math.PI*v))+.0017*Math.cos(16*swept);
      const [skullW,skullD,centerZ]=section(y);
      const insideSkull=y<.231, w=Math.max(.194*dome,insideSkull?skullW+.012:0);
      const d=Math.max(.175*dome,insideSkull?skullD+.013:0);
      return [signed(Math.sin(a),.84)*(w+rib)-.004*v*Math.sin(Math.PI*v),
        y,centerZ-signed(Math.cos(a),.84)*(d+rib)];
    }
    surface(close?40:16,close?8:3,hairPoint,hair,-1,.016,'base',.34);
    surface(close?24:12,1,(u,v)=>{
      const [x,y,z]=hairPoint(u,1);
      return [x*v,y+.001*(1-v),mix(.025,z,v)];
    },hair,1,.016);
    // Tapered locks sweep over the crown and turn into the part.
    for(let k=0;k<(close?11:4);k++){
      const total=close?11:4,center=k/total+.013*Math.sin(k*2.7);
      surface(close?4:2,close?5:2,(u,v)=>{
        const w=.014*(.13+Math.sin(v*Math.PI)**.66);
        const theta=center-part*(.12*v)+w*(2*u-1),t=.025+v*(.78+.06*Math.sin(k));
        const [x,y,z]=hairPoint(theta,t),lift=.001+.004*Math.sin(u*Math.PI)*Math.sin(v*Math.PI);
        return [x+lift*Math.sin(theta*tau),y+lift*t,z-lift*Math.cos(theta*tau)];
      },tint(hair,1.05+(k%3)*.045),-1,.019,'base',.25);
    }
    return finishModel(onFace);
  }

  function draw(geo,seat,worldX,worldZ,time,opt,officer) {
    const t=Number(time)||0, id=officer?1:seat.id, look=people[seat.appearance??((id-1)%people.length)];
    const clothes=people[seat.wardrobe??((id-1)%people.length)];
    const species=officer?null:seat.species;
    const bare=!officer&&seat.outfit==='runner';
    const [jacket,shirt,pants,complexion,hairColor,haircut]=officer?['#3d566b','#d5ddca','#364455','#d8a481','#403536','crop']:[...clothes.slice(0,3),...look.slice(3)];
    const skin=species?animalCoats[species][(seat.appearance??id)%3]:complexion;
    const cut=bare?'crop':haircut,hair=bare?'#56514a':hairColor;
    const armColor=bare?skin:jacket;
    const isStanding=officer?1:clamp(Number(opt.standing)||0), stride=Number(opt.walk)||0;
    const facing=Number(opt.facing)||0, cs=Math.cos(facing),sn=Math.sin(facing);
    const joy=Number(opt.joy)||0, struggle=Number(opt.struggle)||0, kick=Number(opt.kick)||0;
    const beat=opt.beat||0, hop=.34*(opt.leap||0)*Math.max(0,Math.sin(beat)), shake=struggle*Math.sin(t*11+id);
    const wp=([x,y,z])=>[worldX+x*cs+z*sn,y+hop,worldZ+z*cs-x*sn];
    const poly=(points,col)=>geo.poly(points.map(wp),col);
    const rod=(a,b,r,col,n=5)=>geo.rod(wp(a),wp(b),r,col,detailed?Math.ceil(n*1.5):n);
    const item=type=>!officer&&seat.points.find(p=>p.type===type);
    const has=type=>!!item(type);
    const style=type=>item(type)?.style??0;
    const finish=type=>gear.finishes[type][item(type)?.finish||0];
    const answer=String(seat.answer||4);
    const label=(vertices,str,color)=>geo.decal(vertices.map(wp),str,color);
    const signal=type=>act.positive&&act.type===type&&act.light>.15;
    const act=officer||isStanding ? {type:'idle',power:0,light:0,flinch:0,swipe:0,hands:0} : actionFor(seat,t,opt.caughtAt);
    const cue=type=>act.type===type?act.power:0;
    const ear=cue('ear'),wrist=cue('watch'),lens=cue('glasses'),button=cue('button'),lifting=cue('eraser');
    const stationary=isStanding<.01, breathing=.007*Math.sin(t*1.65+id*.7);
    const swing=Math.sin(stride)*isStanding, bodyUp=.212*isStanding+breathing;
    const lean=stationary?-.037:.039*shake, shY=1.154+bodyUp+act.flinch*.048;
    const detailed=opt.detail!=='far';
    // Reuse the world-space ring in its two adjacent bands. Varying the actual
    // cross-section shapes the silhouette; vertex lighting rounds each band.
    function shell(rows,col,tx=null,cap=true,count=detailed?12:8,exponent=.78) {
      if(detailed)count*=2;
      const curve=profile(count,exponent);
      const rings=rows.map(([x,y,z,w,d])=>curve.map(p=>{
        const v=[x+p.x*w,y,z+p.z*d];
        return wp(tx?tx(v):v);
      }));
      const light=rows.map((row,r)=>{
        const before=rows[Math.max(0,r-1)], after=rows[Math.min(rows.length-1,r+1)];
        const slope=(before[3]-after[3])/Math.max(.008,after[1]-before[1]);
        const up=Math.sin(Math.atan(slope));
        return curve.map(p=>p.light+.19*up);
      });
      for(let r=1;r<rings.length;r++)for(let i=0;i<count;i++){
        const j=(i+1)%count;
        geo.shaded([rings[r-1][i],rings[r][i],rings[r][j],rings[r-1][j]],col,
          [light[r-1][i],light[r][i],light[r][j],light[r-1][j]]);
      }
      if(cap){geo.poly(rings[rings.length-1],col,1.08);geo.poly(rings[0],col,.77);}
    }
    function tapered(a,b,stops,col,segments) {
      if(detailed)segments*=2;
      const dir=b.map((v,i)=>v-a[i]),len=Math.hypot(...dir)||1;
      const [dx,dy,dz]=dir.map(v=>v/len);
      const basis=Math.abs(dy)<.94?[dz,0,-dx]:[0,-dz,dy];
      const l=Math.hypot(...basis)||1,[ux,uy,uz]=basis.map(v=>v/l);
      const vx=dy*uz-dz*uy,vy=dz*ux-dx*uz,vz=dx*uy-dy*ux;
      const curve=profile(segments,1);
      const rings=stops.map(([t,r])=>curve.map(({x,z})=>wp([
        a[0]+t*dir[0]+r*(x*ux+z*vx),a[1]+t*dir[1]+r*(x*uy+z*vy),a[2]+t*dir[2]+r*(x*uz+z*vz)])));
      const lights=curve.map(({x,z})=>.94+.16*(x*uy+z*vy)-.12*(x*ux+z*vx)-.07*(x*uz+z*vz));
      for(let r=1;r<rings.length;r++)for(let i=0;i<segments;i++){
        const j=(i+1)%segments;
        geo.shaded([rings[r-1][i],rings[r][i],rings[r][j],rings[r-1][j]],col,[lights[i],lights[i],lights[j],lights[j]]);
      }
      geo.poly(rings[0],col,.88);geo.poly(rings[rings.length-1],col,1.01);
    }
    const prism=(x,y,z,w,h,d,col,tx)=>shell([[x,y-h/2,z,w/2,d/2],[x,y+h/2,z,w/2,d/2]],col,tx,true,8,.49);
    const clothTrim=tint(jacket,.76), boot=officer?'#292f33':'#454346';
    // Thighs lead under the desk. The knees unfold as a detected candidate gets up.
    for(const s of [-1,1]){
      const hip=[s*.106,.565+.33*isStanding,.03];
      const knee=[s*.111,mix(.50,.49,isStanding),mix(-.33,-.025-swing*s*.079,isStanding)];
      const foot=[s*.117,.113,mix(-.31,s*swing*.18,isStanding)];
      const liftLeg=(s===-1?kick*1.16:0)+struggle*Math.max(0,s*shake)*.35+(officer&&stride ? .14*Math.max(0,s*swing) : 0);
      knee[1]+=.23*liftLeg; knee[2]-=.22*liftLeg;
      foot[1]+=.62*liftLeg;foot[2]-=.49*liftLeg;
      foot[1]+=.05*joy*(1+s*Math.sin(beat));foot[2]+=.045*joy*s;
      if(bare){
        const hem=blend(hip,knee,.77),sock=blend(knee,foot,.75);
        tapered(hip,hem,[[0,.097],[.47,.11],[1,.099]],pants,detailed?10:6);
        tapered(blend(hip,knee,.70),knee,[[0,.086],[1,.072]],skin,8);
        tapered(knee,foot,[[0,.070],[.32,.081],[.80,.049],[1,.042]],skin,8);
        tapered(sock,foot,[[0,.052],[.18,.054],[1,.047]],'#e7dfcb',8);
        rod(blend(knee,foot,.785),blend(knee,foot,.805),.054,jacket,10);
      }else{
        rod(hip,knee,.102,pants,5);rod(knee,foot,.079,pants,5);
      }
      prism(foot[0],foot[1]-.037,foot[2]-.049,.169,.12,.245,boot);
      poly([[foot[0]-.068,foot[1]-.077,foot[2]-.15],[foot[0]+.066,foot[1]-.077,foot[2]-.15],[foot[0]+.060,foot[1]-.058,foot[2]-.173],[foot[0]-.062,foot[1]-.058,foot[2]-.173]],'#c3b5a0');
    }
    const hips=.555+.31*isStanding, chest=shY-.117, torsoZ=lean;
    if(species){
      const wag=(joy?.038:.012)*Math.sin(t*(joy?8:2.8)+id);
      if(species==='bear'){
        shell([[0,hips+.008,.139,.019,.022],[0,hips+.041,.155,.046,.051],
          [0,hips+.085,.153,.033,.036],[0,hips+.098,.147,.011,.012]],skin);
      }else{
        const cat=species==='cat',outer=cat?.37:.24;
        const tail=[[.063,hips+.065,.096,.048,.044],[.150,hips+.066,.185,.044,.044],
          [.215,hips+.098,.265,.042,.040],[outer-.040,hips+.145,.318,.040,.037],
          [outer+wag,hips+(cat?.245:.192),.328,.032,.032],[outer-.017+wag,hips+(cat?.296:.212),.317,.011,.014]];
        shell(tail.slice(0,4),skin,null,false);shell(tail.slice(3),cat?tint(skin,.78):'#e8d2ad');
      }
    }
    const torso=[[0,hips,torsoZ,.174,.122],[0,hips+.045,torsoZ,.192,.134],
      [0,chest-.10,torsoZ,.241,.148],[0,chest,torsoZ,.264,.16],
      [0,shY-.023,torsoZ+.009,.241,.145],[0,shY+.019,torsoZ+.012,.165,.116],
      [0,shY+.032,torsoZ,.093,.089]];
    if(bare){
      torso[1][3]=.17;torso[2][3]=.202;torso[3][3]=.231;torso[4][3]=.229;
      shell(torso,skin);
      shell([[0,hips-.076,.022,.180,.116],[0,hips+.025,torsoZ,.189,.137],
        [0,hips+.084,torsoZ,.179,.142]],pants);
      shell([[0,hips+.062,torsoZ,.183,.145],[0,hips+.085,torsoZ,.181,.145]],jacket);
      for(const side of [-1,1])rod([side*.008,hips+.079,torsoZ-.146],
        [side*.021,hips+.034,torsoZ-.146],.0033,'#e1dbc3',5);
    }else shell(torso,jacket);
    const front=torsoZ-.164;
    function chestPoint(x,y,lift) {
      let i=0;while(i+2<torso.length&&torso[i+1][1]<y)i++;
      const a=torso[i],b=torso[i+1],t=clamp((y-a[1])/(b[1]-a[1]));
      const width=mix(a[3],b[3],t),depth=mix(a[4],b[4],t);
      const z=mix(a[2],b[2],t)-depth*Math.pow(1-Math.min(1,Math.abs(x)/width)**(2/.78),.78/2);
      return [x,y,z-lift];
    }
    function clothPanel(side,rows,ink,lift) {
      for(let i=1;i<rows.length;i++) {
        const a=rows[i-1],b=rows[i];
        // Split the width so the fabric follows the curved chest around the neck.
        const cols=detailed?3:1;
        for(let j=0;j<cols;j++){
          const v=(r,t)=>chestPoint(side*mix(r[1],r[2],t),shY+r[0],lift);
          poly([v(a,j/cols),v(a,(j+1)/cols),v(b,(j+1)/cols),v(b,j/cols)],ink);
        }
      }
    }
    for(const side of [-1,1]){
      if(bare){
        const edge=[chestPoint(side*.025,shY-.041,.002),chestPoint(side*.071,shY-.030,.002),
          chestPoint(side*.129,shY-.031,.002),chestPoint(side*.157,shY-.035,.002)];
        for(let j=1;j<edge.length;j++)rod(edge[j-1],edge[j],.0027,tint(skin,.89),5);
        continue;
      }
      const opening=[[.031,0,.066],[.018,0,.084],[-.023,0,.097],[-.075,0,.065],
        [-.117,0,.039],[-.161,0,.004]];
      clothPanel(side,opening,shirt,.006);
      clothPanel(side,opening.map(([y,_,w])=>[y,w,w+.012]),clothTrim,.008);
      clothPanel(side,[[.030,.047,.067],[.017,.024,.084],[-.022,.016,.089],[-.055,.049,.066]],
        tint(shirt,side===-1?1.05:.93),.015);
    }
    if(officer)poly([[-.018,shY-.047,front-.012],[.018,shY-.047,front-.012],
      [.026,chest-.054,front-.013],[0,chest-.080,front-.014],[-.023,chest-.05,front-.014]],'#2f3b47');
    if(!bare&&has('button')){
      const v=style('button'),x=-.069,y=shY-.018;
      for(const offset of [0,-.066]){
        const cy=y+offset,z=chestPoint(x,cy,.014)[2],r=[.025,.031,.028][v],n=[16,6,4][v];
        rod([x,cy,z],[x,cy,z-.011],r,['#5f5146','#886e54','#687478'][v],n);
        rod([x,cy,z-.012],[x,cy,z-.016],r*.82,['#d2bda2','#aab5ac','#a79987'][v],n);
        for(const side of [-1,1])rod([x+side*.007,cy,z-.017],[x+side*.007,cy,z-.019],.004,'#574d47',6);
        if(offset===0&&signal('button')){
          rod([x,cy,z-.020],[x,cy,z-.024],.014,'#213138',12);
          const lit=act.phase<.415||act.phase>.48;
          if(lit)rod([x+.014,cy+.011,z-.023],[x+.014,cy+.011,z-.028],.0075,'#ff604c',8);
        }
      }
    }
    if(officer){
      poly([[.102,chest+.047,front-.004],[.146,chest+.049,front-.004],[.144,chest+.019,front-.006],[.124,chest+.001,front-.006],[.104,chest+.020,front-.006]],'#ecc271');
      poly([[-.171,chest+.04,front],[-.103,chest+.04,front],[-.103,chest+.018,front-.004],[-.171,chest+.018,front-.004]],'#aac2c2');
    }

    const headBob=stationary?.004*Math.sin(t*3+id):Math.abs(swing)*.013;
    const hy=1.428+bodyUp+headBob+act.flinch*.050-(species?.043:0);
    const headZ=torsoZ-.014-(stationary?.015:0);
    const headYaw=stationary?(.045*Math.sin(t*.77+id)+ear*.12+lifting*.09+wrist*.13):.19*shake;
    const pitch=stationary?(-.19 + lens*.205 + ear*.15 + button*.11-lifting*.055+wrist*.085 + act.flinch*.06):.018;
    const tilt=stationary?ear*.135+wrist*.042:.12*shake+.048*joy*Math.sin(beat);
    const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(headYaw),sy=Math.sin(headYaw),ct=Math.cos(tilt),st=Math.sin(tilt);
    function head([x,y,z]){
      const yy=y*cp-z*sp,zz=z*cp+y*sp;
      const x1=x*cy+zz*sy;
      return [x1*ct-yy*st,hy+yy*ct+x1*st,headZ+zz*cy-x*sy];
    }
    const hpoly=(pts,c)=>poly(pts.map(head),c), hrod=(a,b,r,c,n)=>rod(head(a),head(b),r,c,n);
    if(species)shell([[0,shY+.015,torsoZ,.082,.069],[0,shY+.052,torsoZ,.080,.070],
      [0,shY+.109,torsoZ,.075,.069],[0,shY+.143,torsoZ,.083,.077]],skin,null,true,detailed?12:7);
    else prism(0,shY+.060,torsoZ,.126,.164,.119,skin);
    const model=sculptHead(seat.appearance??id,skin,hair,cut,has('glasses')?style('glasses')+1:0,finish('glasses'),detailed,joy?'smile':struggle?'cry':'neutral',species);
    geo.mesh(model,p=>wp(head(p)),joy>.4||((t+id*.683)%3.87)<.12);
    if(bare){
      // Salt-and-pepper moustache follows the adult runner's upper lip.
      for(const side of [-1,1]){
        const cheek=(x,y)=>model.onFace(side*x,y,.009);
        hpoly([cheek(.001,-.098),cheek(.020,-.093),cheek(.042,-.101),cheek(.049,-.113),
          cheek(.028,-.108),cheek(.008,-.104)],'#575047');
      }
    }
    if(struggle>.05){
      for(const side of [-1,1]){
        const fall=(t*1.55+id*.37+(side===1?.47:0))%1, y=-.010-.192*fall;
        const [x,yy,z]=model.onFace(side*(.087+.012*fall),Math.max(-.187,y),.013);
        const pt=[x,yy-.033*Math.max(0,fall-.79),z-.012*fall];
        const r=.011+.009*Math.sin(Math.PI*fall);
        shell([[x,pt[1]-r,pt[2],.003,.003],[x,pt[1]-.002,pt[2],r,r*.61],
          [x,pt[1]+r*1.65,pt[2],.002,.002]],'#73cce8',head,true,8);
        hrod([x-.004,pt[1],pt[2]-r*.60],[x-.003,pt[1]+r*.5,pt[2]-r*.47],.0025,'#e2faff',5);
      }
    }
    const hairShade=tint(hair,.87),hairHigh=tint(hair,1.14);
    if(!species&&(cut==='pony'||cut==='bob'||cut==='bun')){
      shell([[0,-.173,.115,.170,.066],[0,-.025,.078,.19,.100],[0,.108,.068,.188,.113]],hairShade,head);
      const sweep=ear*.036;
      for(const s of [-1,1]){
        const side=s===-1;
        shell([[s*.157,cut==='bob'?-.140:-.092,.010+(side?sweep:0),.044,.051],[s*.171,.022,.004+(side?sweep:0),.037,.069],[s*.162,.119,.015,.042,.095]],hair,head);
      }
      if(cut==='pony')shell([[.012,-.202,.186,.049,.046],[.008,-.050,.205,.071,.075],[0,.100,.152,.060,.061]],hair,head);
      if(cut==='bun')shell([[.002,.130,.129,.066,.071],[.002,.221,.132,.102,.098],[.002,.278,.131,.064,.060]],hairHigh,head);
    }else if(!species){
      for(const s of [-1,1])hpoly([[s*.161,.122,-.061],[s*.185,.106,.048],[s*.181,.006,.030],[s*.169,.013,-.051]],hairShade);
      if(cut==='wave')shell([[-.040,.176,.032,.108,.086],[-.038,.215,.060,.108,.087],[.002,.252,.083,.052,.051]],hairHigh,head);
    }
    if(officer){
      shell([[0,.106,.012,.202,.156],[0,.181,.025,.213,.171],[0,.207,.044,.149,.122]],'#3c5365',head);
      hpoly([[-.161,.132,-.144],[.161,.132,-.144],[.128,.112,-.237],[-.121,.112,-.237]],'#273845');
      hpoly([[-.018,.177,-.154],[.018,.177,-.154],[.016,.147,-.154],[0,.138,-.154],[-.016,.147,-.154]],'#f1c778');
    }
    if(has('glasses')){
      const spec=gear.glasses[style('glasses')],frame=finish('glasses');
      for(const side of [-1,1]){
        const x=side*.078;
        const lens=[];
        for(let i=0;i<24;i++){
          const [dx,dy]=gear.lensPoint(spec,side,i*TAU/24);
          lens.push([x+dx,.003+dy,-.214+.017*(Math.abs(x+dx)/.151)**2]);
        }
        hpoly(lens,'rgba(193,224,227,0.045)');
        hrod([side*(.078+spec.w*.92),.029,-.199],[side*.190,.036,.028],spec.rim,frame,detailed?8:4);
        hrod([x+.012,.022,-.211],[x+.039,.018,-.206],.0017,'#b8c5c4',4);
        if(signal('glasses')&&opt.rearLens&&side===opt.lensSide){
          // Three separate transparent glyph decals preserve the view between the lines.
          const cx=side*.105;
          const inner=(dx,y)=>head([cx+dx,y,-.185-.18*side*dx]);
          gear.lensLines.forEach((str,i)=>{
            const y=.013-i*.012, w=.036+(i===2?.002:0);
            label([inner(w,y+.0053),inner(-w,y+.0053),inner(-w,y-.0053),inner(w,y-.0053)],str,'#cefff0');
          });
        }
      }
      hrod([-.078+spec.w,.018,-.214],[.078-spec.w,.018,-.214],spec.rim,frame,8);
      if(style('glasses')===3)hrod([-.032,.034,-.213],[.032,.034,-.213],.0028,frame,8);
    }
    const socket=earSockets[species]||[-.211,-.048,.002];
    const earTip=head([socket[0]-.008,socket[1],socket[2]]);
    if(has('ear')){
      const v=style('ear'),[x,y,z]=socket;
      hrod([x+.014,y,z],[x-.006,y,z],[.019,.024,.016][v],['#bca879','#535a66','#ddaf91'][v],[12,6,16][v]);
      if(v===1)hrod([x,y-.009,z],[x-.002,y-.037,z],.008,'#9ca2ac',8);
      if(v===2)hrod([x,y-.004,z+.013],[x,y-.026,z+.019],.011,'#b77668',10);
      if(signal('ear')&&ear>.96&&seat.status==='open'&&opt.view){
        whisperBubble(geo,wp(earTip),wp(head([0,0,0])),opt.view,t,act.light);
      }
    }
    // Two-joint arm poses travel in a smooth arc so students visibly return to the same line of writing.
    const writePhase=t*4.6+id*.79;
    const writing=stationary?(1-Math.max(ear*.95,wrist*.89,lens*.78,button)):0;
    const penShift=(Math.sin(writePhase)*.022+Math.sin(writePhase*.37)*.016)*writing;
    const heldEraser=lifting?eraserPose(gear.eraser[style('eraser')],lifting*(1-(opt.caughtAt==null?0:smooth(opt.caughtAt,opt.caughtAt+.40,t)))):null;
    for(const s of [-1,1]){
      const shoulder=[s*.207,shY-.040,torsoZ+.004];
      const main=s===-1;
      let elbow=[s*.313,1.03+breathing*.4,-.130], hand=[s*(main?.040:.215)+penShift*(main?1:0),1.034+(main?Math.abs(Math.sin(writePhase))*.004:0),main?-.568:-.458];
      const restElbow=elbow,restHand=hand;
      const move=(amt,e,h)=>{elbow=blend(elbow,e,amt);hand=blend(hand,h,amt);};
      if(stationary){
        if(main){
          const release=penRelease(act,id,opt.level,opt.caughtAt==null?0:smooth(opt.caughtAt,opt.caughtAt+.40,t));
          move(release,[-.325,1.028,-.128],[-.332,1.043,-.445]);
          if(ear)move(smooth(.47,1,ear),[-.386,1.187,-.134],[earTip[0]-.035,earTip[1]-.049,earTip[2]+.023]);
          if(lens&&opt.level!==1&&(act.turn+id)%3===0)move(smooth(.47,1,lens)*.92,[-.301,1.143,-.288],[-.042,hy+.002,-.226]);
        }else{
          if(wrist)move(wrist,[.360,1.065,-.163],[-.035,1.271,-.360]);
          if(heldEraser)move(heldEraser.reach,[.357,1.054+.104*heldEraser.lift,-.19],heldEraser.hand);
        }
        if(button){
          const offset=.150*button;
          move(main?smooth(.47,1,button):button,[s*.344+offset,1.051,-.159],[s*.171+offset,1.145,-.484]);
        }
      }else if(joy){
        elbow=[s*(.35+.028*Math.cos(beat)),1.48+.047*Math.sin(beat),-.035];
        hand=[s*(.40+.075*Math.sin(beat)),1.72+.065*Math.cos(beat),-.035];
      }else if(officer){
        elbow=[s*.278,1.086,-.031+s*swing*.068];hand=[s*.276,.927,-.026+s*swing*.121];
        if(s===-opt.side&&opt.grip)move(opt.grip,[s*.30,1.14,-.11],[s*(opt.stagger ? .12 : .27),1.18,-.12+(opt.stagger||0)]);
      }else if(struggle){
        elbow=[s*.31,1.16+.055*s*shake,-.083];
        hand=[s*.24,1.18+.037*s*shake,-.17-.055*s*shake];
      }else{
        elbow=[s*.254,1.096,-.075];hand=[s*.063,1.056,-.225];
      }
      if(!officer&&!stationary&&isStanding<1){elbow=blend(restElbow,elbow,isStanding);hand=blend(restHand,hand,isStanding);}
      if(detailed)tapered(shoulder,elbow,[[0,.064],[.17,.082],[.56,.078],[.86,.067],[1,.065]],armColor,12);
      else rod(shoulder,elbow,.082,armColor,6);
      // A rounded shoulder and elbow overlap the sleeves through the full animation.
      const joint=(at,r,col)=>shell([
        [at[0],at[1]-r*.94,at[2],r*.32,r*.32],[at[0],at[1]-r*.54,at[2],r*.84,r*.84],
        [at[0],at[1]+r*.12,at[2],r,r],[at[0],at[1]+r*.69,at[2],r*.72,r*.72],
        [at[0],at[1]+r*.96,at[2],r*.29,r*.29]],col,null,true,detailed?8:5,1);
      joint(shoulder,.073,armColor);
      if(detailed)joint(elbow,.068,armColor);
      if(bare){
        tapered(elbow,hand,[[0,.060],[.22,.065],[.48,.058],[.83,.041],[1,.037]],skin,detailed?12:6);
      }else{
        const cuff=blend(elbow,hand,.77);
        if(detailed)tapered(elbow,cuff,[[0,.062],[.21,.071],[.67,.061],[.82,.057],[.92,.059],[1,.053]],jacket,12);
        else rod(elbow,cuff,.065,jacket,6);
        rod(blend(elbow,hand,.71),cuff,detailed?.054:.066,clothTrim,detailed?12:6);
        rod(cuff,hand,.043,skin,5);
      }
      const [hx,palmY,hz]=hand;
      shell([[hx,palmY-.029,hz-.007,.033,.037],[hx,palmY-.016,hz-.010,.050,.052],
        [hx,palmY+.010,hz-.008,.052,.053],[hx,palmY+.029,hz,.036,.043]],skin,null,true,detailed?10:6);
      if(detailed){
        for(let f=0;f<4;f++){
          const fx=hx+(f-1.5)*.020,reach=.063-.006*Math.abs(f-1.4);
          const pointing=main&&f===0?ear*act.hands:0;
          let tip=[fx+s*.004,palmY-.013+.063*pointing,hz-reach-.015+.043*pointing];
          if(pointing)tip=blend(tip,earTip,smooth(.72,1,pointing));
          if(heldEraser&&!main){
            const grip=heldEraser.point((.16+f*.19)*gear.eraser[style('eraser')].w,.013,-.006);
            tip=blend(tip,grip,heldEraser.reach);
          }
          tapered([fx,palmY+.008,hz-.021],tip,[[0,.0108],[.43,.0115],[.72,.0095],[.89,.009],[1,.0045]],skin,7);
          const nail=blend([fx,palmY+.008,hz-.021],tip,.84);
          poly([[nail[0]-.004,nail[1]+.008,nail[2]+.004],[nail[0]+.004,nail[1]+.008,nail[2]+.004],
            [nail[0]+.003,nail[1]+.007,nail[2]-.004],[nail[0]-.003,nail[1]+.007,nail[2]-.004]],tint(skin,1.065));
        }
        rod([hx-s*.032,palmY+.01,hz+.008],[hx-s*.057,palmY-.003,hz-.029],.015,skin,7);
      }
      if(!detailed&&ear>.20&&main&&act.hands>.2){
        rod([hand[0]-.008,hand[1]+.004,hand[2]-.008],blend([hand[0]+.009,hand[1]+.047,hand[2]+.014],earTip,smooth(.72,1,ear)),.0155,skin,5);
      }
      if(has('watch')&&!main){
        const v=style('watch'),spec=gear.watch[v],col=finish('watch'),c=blend(elbow,hand,.83);
        rod(blend(elbow,hand,.77),blend(elbow,hand,.89),.047,col,12);
        const dial=(dx,dz,h)=>[c[0]+dx,c[1]+.047+dz*.46+h,c[2]+dz];
        const outline=(scale,h)=>Array.from({length:spec.n},(_,i)=>{
          const [x,z]=gear.dialPoint(spec,i*TAU/spec.n);return dial(x*scale,z*scale,h);
        });
        const rim=outline(1,.017),base=outline(.97,.002);
        for(let i=0;i<spec.n;i++){const j=(i+1)%spec.n;poly([rim[i],rim[j],base[j],base[i]],tint(col,.79));}
        poly(rim,tint(col,1.18));poly(outline(.83,.0185),'#243e43');
        if(v===1||v===4)rod(dial(spec.w-.002,0,.01),dial(spec.w+.008,0,.01),.005,col,8);
        if(signal('watch')){
          const w=spec.w*.65,h=spec.h*.49;
          label([dial(-w,h,.020),dial(w,h,.020),dial(w,-h,.020),dial(-w,-h,.020)],'답 '+answer,'#d2ffdc');
        }else{
          rod(dial(-.010,.009,.021),dial(0,0,.021),.0023,'#c8d2c7',5);
          rod(dial(0,0,.021),dial(.012,.002,.021),.0022,'#c8d2c7',5);
        }
      }
    }
  }
  window.drawExamMaterials=drawMaterials;
  let lastSeats=null;
  window.resetCandidateModels=seats=>{
    if(seats!==lastSeats){headModels.clear();lastSeats=seats;}
  };
  window.drawCandidate=(geo,seat,x,z,time,opts={})=>draw(geo,seat,x,z,time,opts,false);
  window.drawOfficer=(geo,x,z,time,opts={})=>draw(geo,{id:1,points:[],status:'clear'},x,z,time,opts,true);
})();
