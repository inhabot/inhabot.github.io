/* Classroom shell, fittings and daylight in the same metre-based space as the actors. */
(() => {
  'use strict';

  function drawExamRoom(g, room) {
    const w=room.halfWidth, f=room.frontZ, b=room.backZ, h=room.height;
    const length=b-f, mid=(b+f)/2, B=(...args)=>g.box(...args), F=(p,c)=>g.poly(p,c);
    const wood='#a4794e', cream='#e6e2cb', mint='#a7b9a8', rail='#8b9f90';
    const wall='#e4e1c9', pine='#426b58', creamEdge='#eee6ce';
    const text=(x,y,z,t,ww,hh,col,face='back')=>{ if(g.text)g.text(x,y,z,t,ww,hh,col,face); };
    const floor=(x0,z0,x1,z1,y,c)=>F([[x0,y,z0],[x0,y,z1],[x1,y,z1],[x1,y,z0]],c);
    const back=(x0,y0,x1,y1,z,c)=>F([[x0,y0,z],[x0,y1,z],[x1,y1,z],[x1,y0,z]],c);
    const side=(x,y0,z0,y1,z1,c,dir=1)=>{
      const p=[[x,y0,z0],[x,y1,z0],[x,y1,z1],[x,y0,z1]];F(dir>0?p:p.reverse(),c);
    };
    const sideArt=(x,points,c,dir=1)=>{
      const p=points.map(([z,y])=>[x,y,z]);
      F(dir>0?p:p.reverse(),c);
    };
    const faceCircle=(x,y,z,rx,ry,c,n=24)=>{
      const points=[];for(let i=0;i<n;i++){const t=-i*2*Math.PI/n;points.push([x+Math.cos(t)*rx,y+Math.sin(t)*ry,z]);}
      F(points,c);
    };
    const plankColors=['#ceac80','#d8b78a','#d0aa7b','#d7b58a','#dbbb91','#d0af84','#d7b389'];
    const hash=(a,c)=>Math.abs(Math.imul(a+57,13331)^Math.imul(c+13,3049));

    // Recessed floor joints stay legible on the close approach to a desk.
    floor(-w,f,w,b,-.012,'#b49774');
    const widths=.46, pl=2.35, rows=Math.ceil(2*w/widths);
    for(let i=0;i<rows;i++){
      const x0=-w+i*widths,x1=Math.min(w,x0+widths),offset=(i%3)*pl/3;
      for(let k=-1;k<Math.ceil(length/pl)+1;k++){
        const z0=Math.max(f,f+k*pl+offset),z1=Math.min(b,f+(k+1)*pl+offset);
        if(z1-z0<.018)continue;
        floor(x0+.005,z0+.006,x1-.005,z1-.006,-.004,plankColors[hash(i,k)%plankColors.length]);
      }
    }

    // Single-piece plaster and painted lower dado. The camera can turn through a full circle.
    const dx=w-.85,dw=1.22,dh=2.28;
    const edges=[[-w-.1,dx-dw/2],[dx+dw/2,w+.1]];
    function rearSpans(y,z,height,depth,col){
      for(const [left,right] of edges)B((left+right)/2,y,z,right-left,height,depth,col);
    }
    rearSpans(h/2,b+.065,h,.13,wall);
    B(dx,(dh+h)/2,b+.065,dw,h-dh,.13,wall);
    // A short corridor gives entering officers real space behind the doorway.
    B(dx,-.055,b+1.5,4.1,.105,3.1,'#b2ac98');
    B(dx,1.6,b+3,4.1,3.2,.12,'#b5c5bd');
    B(dx,.56,b+2.92,4.1,1.12,.08,'#839b90');
    for(const side of [-1,1])B(dx+side*2.05,1.6,b+1.5,.12,3.2,3,'#b0bfb4');
    B(0,h/2,f-.065,2*w+.2,h,.13,'#e2e0ca');
    B(-w-.065,h/2,mid,.13,h,length,'#ece5cf');
    B(w+.065,h/2,mid,.13,h,length,'#dcddc7');
    B(0,h+.065,mid,2*w+.25,.13,length+.22,'#e5dfc9');
    for(const z of [f+.012]){
      B(0,.49,z,2*w,.98,.035,mint);B(0,.986,z,2*w,.052,.064,rail);
      B(0,.061,z,2*w,.122,.075,'#797e68');B(0,h-.065,z,2*w,.13,.06,'#d4cbb0');
    }
    for(const x of [-w+.012,w-.012]){
      B(x,.49,mid,.035,.98,length,mint);B(x,.986,mid,.064,.052,length,rail);
      B(x,.061,mid,.073,.122,length,'#797e68');B(x,h-.065,mid,.06,.13,length,'#d8d0b8');
    }
    // Warm window light cuts across the floor; thin intersecting mullion shadows add scale.
    const windowCount=Math.max(3,Math.min(5,Math.round(length/2.85)));
    const pitch=(length-.66)/windowCount,windowWidth=pitch-.36;
    for(let j=0;j<windowCount;j++){
      const z=f+.33+(j+.5)*pitch,lo=z-windowWidth/2,hi=z+windowWidth/2;
      const left=-w+.09,right=Math.min(w-.35,left+3.62);
      const light=(u,v)=>[left+(right-left)*u,.003,lo+v*(hi-lo)-1.13*u];
      const patch=(u0,v0,u1,v1,col)=>F([light(u0,v0),light(u0,v1),light(u1,v1),light(u1,v0)],col);
      for(const [u0,u1] of [[0,.59],[.605,1]])for(const [v0,v1] of [[0,.484],[.503,1]])patch(u0,v0,u1,v1,'#e7cea1');
      // Extend plank seams through the bright shape without requiring transparent materials.
      const divisions=10;
      for(let n=1;n<divisions;n++){
        const u=n/divisions;if(Math.abs(u-.60)<.03)continue;
        const a=light(u,0),bb=light(u,1),cc=light(u+.0018,1),dd=light(u+.0018,0);
        a[1]=bb[1]=cc[1]=dd[1]=.0045;F([a,bb,cc,dd],'#d9c092');
      }
    }

    // Real window mullions frame a painted exterior: hills, school across the yard and treetops.
    for(let j=0;j<windowCount;j++){
      const z=f+.33+(j+.5)*pitch, lo=z-windowWidth/2, hi=z+windowWidth/2;
      const lower=1.09,upper=h-.37,wx=-w+.04,top=upper-.08;
      side(wx,lower,lo,upper,hi,'#8b988a');
      side(wx+.011,lower+.055,lo+.045,upper-.055,hi-.045,'#bad6d7');
      sideArt(wx+.019,[[lo+.04,lower+.07],[lo+.04,1.66],[lo+windowWidth*.18,1.77],[lo+windowWidth*.48,1.90],[hi-.04,1.62],[hi-.04,lower+.07]],'#95ada8');
      sideArt(wx+.023,[[lo+.04,lower+.07],[lo+.04,1.54],[lo+windowWidth*.36,1.70],[lo+windowWidth*.70,1.90],[hi-.04,1.84],[hi-.04,lower+.07]],'#8fa99b');
      if(j===1||j===windowCount-1){
        const z0=lo+.14,z1=hi-.22,roof=1.67+(j%2)*.12;
        side(wx+.031,lower+.08,z0,roof,z1,'#bac1b1');side(wx+.034,roof-.04,z0-.045,roof+.015,z1+.04,'#8b9e98');
        for(let p=z0+.09;p<z1-.09;p+=.22)side(wx+.036,roof-.30,p,roof-.11,p+.13,'#92a9aa');
      }
      for(let k=0;k<5;k++){
        const zz=lo+.06+k*(windowWidth-.12)/5,dx=(windowWidth-.12)/5;
        const yy=1.48+((k+j)%3)*.056;
        sideArt(wx+.04,[[zz,lower+.06],[zz,yy],[zz+dx*.30,yy+.11],[zz+dx*.74,yy+.16],[zz+dx,yy+.026],[zz+dx,lower+.06]],k%2?'#83a493':'#789b85');
      }
      for(const zz of [lo+.033,hi-.033,z])B(wx+.057,(lower+upper)*.5,zz,.065,upper-lower,.057,'#efe6cd');
      for(const yy of [lower+.04,top,lower+(upper-lower)*.57])B(wx+.063,yy,z,.08,.052,windowWidth,'#ebe3cc');
      B(wx+.083,lower-.017,z,.17,.075,windowWidth+.11,'#b39470');
      B(wx+.091,upper+.024,z,.115,.086,windowWidth+.12,'#c3ad8d');
      for(let k=0;k<2;k++){
        const yy=upper-.085-k*.056;B(wx+.085,yy,z,.072,.045,windowWidth-.04,'#dbd0b5');
      }
      const handleZ=z+.038;B(wx+.102,1.98,handleZ,.079,.115,.033,'#879288');
    }

    // Rear teaching board has a narrow bevel and a projecting chalk ledge.
    const bw=Math.min(w*1.14,5.75),bx=-w*.105,by=2.10,bh=1.43;
    B(bx,by,b-.056,bw+.19,bh+.19,.11,wood);
    B(bx,by,b-.119,bw+.055,bh+.055,.042,'#364e43');
    back(bx-bw/2,by-bh/2,bx+bw/2,by+bh/2,b-.148,'#456a58');
    const bz=b-.153;
    for(let j=0;j<7;j++){
      const xx=bx-bw*.42+((j*17)%30)/33*bw*.58, yy=by-.54+(j%4)*.17;
      back(xx,yy,xx+.24+j%3*.09,yy+.007,bz,'#51735f');
    }
    text(bx-.16,by+.16,b-.168,room.level===1?'감독 실습':'모의고사',Math.min(2.18,bw*.48),.36,'#e5e5c9');
    // A modest chalk underline and a stack of chalk sticks anchor the writing.
    back(bx-1.12,by-.12,bx+.73,by-.110,b-.16,'#b4c4a1');
    B(bx,by-bh/2-.066,b-.163,bw+.24,.063,.23,'#ac875d');
    for(let i=0;i<3;i++)B(bx+bw*.27+i*.10,by-bh/2-.017,b-.211,.082,.023,.023,i===1?'#e4c684':'#e1e0c6');
    B(bx-bw*.37,by-bh/2-.006,b-.208,.22,.045,.078,'#c39d66');

    // Silent analogue wall clock, each tick rendered as geometry rather than a texture.
    const cx=w-.91,cy=h-.43,cz=b-.143;
    faceCircle(cx,cy,cz,.262,.262,'#52635b');faceCircle(cx,cy,cz-.008,.235,.235,'#ece6cf');
    for(let m=0;m<12;m++){
      const t=m*Math.PI/6,s=Math.sin(t),c=Math.cos(t),rr=m%3===0?.158:.179;
      g.rod([cx+s*rr,cy+c*rr,cz-.015],[cx+s*.206,cy+c*.206,cz-.015],m%3===0?.010:.006,'#667268',4);
    }
    g.rod([cx,cy,cz-.026],[cx-.083,cy+.061,cz-.026],.014,'#49574e',4);
    g.rod([cx,cy,cz-.028],[cx+.122,cy+.092,cz-.028],.009,'#49574e',4);
    faceCircle(cx,cy,cz-.036,.025,.025,'#b87859',10);

    rearSpans(.49,b-.012,.98,.035,mint);rearSpans(.986,b-.012,.052,.064,rail);
    rearSpans(.061,b-.012,.122,.075,'#797e68');
    B(0,h-.065,b-.012,2*w,.13,.06,'#d4cbb0');
    for(const side of [-1,1])B(dx+side*(dw/2+.036),dh/2,b-.048,.072,dh,.12,'#8a846d');
    B(dx,dh+.041,b-.048,dw+.15,.082,.12,'#8a846d');
    B(dx,2.53,b-.077,.67,.22,.09,'#647968');
    text(dx,2.53,b-.137,'시험 중',.50,.115,'#ece8ce');

    // A small cork noticeboard and a few pinned notices balance the board's other side.
    const noticeX=-w+.81,nz=b-.10;
    B(noticeX,2.06,nz,1.02,1.10,.085,'#977e5f');
    back(noticeX-.458,1.565,noticeX+.458,2.556,nz-.05,'#b99970');
    [[-.18,2.27,.39,.40,'#e4dfc4'],[.19,2.21,.30,.31,'#ccd7c8'],[.12,1.82,.40,.29,'#e5c9a0'],[-.23,1.79,.23,.18,'#d1ccac']].forEach(([ox,yy,pw,ph,col],i)=>{
      back(noticeX+ox-pw/2,yy-ph/2,noticeX+ox+pw/2,yy+ph/2,nz-.058-i*.002,col);
      for(let k=0;k<3;k++)back(noticeX+ox-pw*.33,yy+ph*.20-k*.04,noticeX+ox+pw*(k===1?.14:.26),yy+ph*.20+.009-k*.04,nz-.073,'#a4aa94');
      faceCircle(noticeX+ox,yy+ph*.40,nz-.078,.016,.016,'#a97557',8);
    });

    // Right wall: a shallow run of lockers, two timber shelves and a vent high on the wall.
    const shelfZ=b-2.40, shelfX=w-.20;
    B(shelfX,.482,shelfZ,.37,.83,2.53,'#9c9b7c');B(shelfX,.928,shelfZ,.425,.062,2.64,'#af9168');
    for(let i=0;i<3;i++){
      const zz=shelfZ-.83+i*.83;
      B(w-.395,.50,zz,.031,.745,.78,'#b8bea0');
      B(w-.422,.60,zz+.28,.048,.066,.085,'#777c67');
      for(let s=0;s<3;s++)B(w-.415,.746+s*.036,zz,.017,.012,.25,'#929a82');
    }
    const tz=shelfZ+.80;
    B(w-.206,1.095,tz,.23,.27,.23,'#b28665');B(w-.206,1.23,tz,.25,.04,.25,'#c19571');
    for(let i=0;i<8;i++){
      const a=i*2.397,hr=.14+(i%3)*.032,xx=w-.207,zz=tz;
      const top=[xx+Math.cos(a)*hr,1.43+(i%2)*.115,zz+Math.sin(a)*hr];
      g.rod([xx,1.22,zz],top,.010,'#738268',4);
      const vx=-Math.sin(a)*.056,vz=Math.cos(a)*.056;
      const m=[(xx+top[0])*.5,1.38+(i%2)*.065,(zz+top[2])*.5];
      const leaf=[[xx,1.27,zz],[m[0]+vx,m[1],m[2]+vz],top,[m[0]-vx,m[1]-.015,m[2]-vz]];
      F(leaf,i%2?'#587b5e':'#78916a');F(leaf.slice().reverse(),i%2?'#688564':'#80966f');
    }
    for(let i=0;i<6;i++){
      const zz=shelfZ-.96+i*.078,hh=.24+((i+1)%3)*.044;
      B(w-.213,.958+hh/2,zz,.23,hh,.065,[pine,'#ad8066','#d1b77b','#849991'][i%4]);
    }
    const vx=w-.068,vy=h-.43,vz=mid;
    B(vx,vy,vz,.10,.33,.92,'#abb2a0');
    for(let k=0;k<6;k++)B(vx-.061,vy-.099+k*.04,vz,.025,.014,.73,'#828f82');

    // Front wall becomes visible when the player looks back down the aisle.
    const ax=-w*.27,az=f+.097;
    B(ax,1.96,az,2.32,.95,.10,'#a8906c');
    B(ax,1.96,az+.064,2.22,.85,.04,'#b3b69b');
    for(let i=0;i<3;i++){
      const xx=ax-.66+i*.66;
      B(xx,1.97,az+.105,.48,.64,.012,i===1?'#e5cc9f':'#e8e0c7');
      for(let n=0;n<5;n++)B(xx-.01+(n%2)*.024,2.17-n*.084,az+.114,.30-(n%3)*.034,.014,.007,i===1?'#b69b74':'#abb09a');
    }
    B(w-1.24,1.54,f+.086,.77,.83,.11,'#a0a58e');
    for(let j=0;j<6;j++)B(w-1.24,1.25+j*.07,f+.154,.52,.022,.027,'#c1c4af');

    // Ceiling panel joints and compact fluorescent fixtures, visible on look-up.
    for(let z=f+1.52;z<b-.1;z+=1.52)B(0,h-.008,z,2*w,.012,.015,'#ccc9b5');
    for(let x=-w+1.6;x<w-.1;x+=1.6)B(x,h-.007,mid,.015,.012,length,'#cecbb7');
    const rowCount=Math.max(2,Math.round(length/3.3));
    for(let j=0;j<rowCount;j++)for(const xx of [-w*.47,w*.47]){
      const zz=f+(j+.5)*length/rowCount;
      B(xx,h-.065,zz,1.27,.095,.36,'#c9c9b6');
      B(xx,h-.124,zz,1.20,.047,.305,'#b0b7a7');
      for(const off of [-.077,.077])B(xx,h-.151,zz+off,1.095,.025,.054,'#f6f2d6');
    }
  }

  // All the fittings share the right-hand hinge. The glazed opening reveals the corridor.
  function drawExamDoor(g,room,angle){
    const hinge=room.halfWidth-.85+.60, z=room.backZ-.043,c=Math.cos(angle),s=Math.sin(angle);
    const point=(x,y,d)=>[hinge+x*c-d*s,y,z+x*s+d*c];
    function panel(x0,x1,y0,y1,d0,d1,col){
      const pts=[[x0,y0,d0],[x1,y0,d0],[x1,y1,d0],[x0,y1,d0],[x0,y0,d1],[x1,y0,d1],[x1,y1,d1],[x0,y1,d1]].map(p=>point(...p));
      for(const [indices,light] of [[[0,1,2,3],1],[[4,7,6,5],.90],[[0,3,7,4],.82],[[1,5,6,2],.88],[[3,2,6,7],1.06],[[0,4,5,1],.85]])
        g.poly(indices.map(i=>pts[i]),col,light);
    }
    const wood='#b69c72',trim='#887e64';
    panel(-1.195,0,.016,1.42,-.032,.032,wood);panel(-1.195,0,1.94,2.26,-.032,.032,wood);
    panel(-1.195,-.94,1.42,1.94,-.032,.032,wood);panel(-.26,0,1.42,1.94,-.032,.032,wood);
    for(const x of [-.94,-.274])panel(x,x+.014,1.42,1.94,-.039,.038,trim);
    for(const y of [1.416,1.675,1.936])panel(-.94,-.26,y,y+.011,-.038,.038,trim);
    panel(-1.10,-.096,.15,.42,-.039,-.031,'#a88e6b');
    panel(-1.053,-.985,.91,1.08,-.056,-.034,'#626e66');
    panel(-1.035,-.89,.997,1.027,-.087,-.052,'#b5b59e');
  }
  window.drawExamDoor=drawExamDoor;
  window.drawExamRoom=drawExamRoom;
})();
