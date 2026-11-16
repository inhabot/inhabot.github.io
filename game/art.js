(function () {
  'use strict';

  const gear=globalThis.ExamGear;
  const ink = '#253b3d';
  const light = '#f1f4dc';

  function polygon(ctx, points, fill, edge = ink, weight = 1.35) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = weight; ctx.stroke(); }
  }

  function line(ctx, points, color = ink, width = 2) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function dot(ctx, x, y, rx, ry, color, edge, weight = 1) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    if (edge) { ctx.lineWidth = weight; ctx.strokeStyle = edge; ctx.stroke(); }
  }

  function bevel(x, y, w, h, cut = 3) {
    return [[x+cut,y],[x+w-cut,y],[x+w,y+cut],[x+w,y+h-cut],
      [x+w-cut,y+h],[x+cut,y+h],[x,y+h-cut],[x,y+cut]];
  }

  function extrude(ctx, points, front, top, side, dx = 6, dy = -4) {
    const back = points.map(([x,y]) => [x+dx,y+dy]);
    polygon(ctx, back, side);
    points.forEach((a,i) => {
      const j = (i+1)%points.length, b = points[j];
      const ex = b[0]-a[0], ey = b[1]-a[1];
      if (ex*dy-ey*dx < 0) {
        polygon(ctx, [a,b,back[j],back[i]], ex > ey ? top : side, ink, 1);
      }
    });
    polygon(ctx, points, front);
  }

  function at(ctx, x, y, angle, fn) {
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle*Math.PI/180);
    fn();
    ctx.restore();
  }

  function ellipsePoints(x, y, rx, ry, n = 12) {
    return Array.from({length:n}, (_,i) => {
      const a = (i/n*2-.5)*Math.PI;
      return [x+Math.cos(a)*rx,y+Math.sin(a)*ry];
    });
  }

  function eraserUnderside(ctx,style,finish,positive){
    const spec=gear.eraser[style],color=gear.finishes.eraser[finish],scale=485;
    at(ctx,59,40,-17,()=>{
      const outline=spec.outline.map(([u,v])=>[spec.w*u*scale,spec.d*v*scale*.87]);
      extrude(ctx,outline,color,'#eee6d9','#a2988f',4,-spec.h*scale*.44);
      if(positive){
        const x=-.18*spec.w*scale,y=.03*spec.d*scale*.87;
        dot(ctx,x,y,7.8,6.8,'#39434b');
        dot(ctx,x,y,6.1,5.3,'#78919a');dot(ctx,x,y,4.95,4.3,'#192e3c');
        dot(ctx,x,y,2.7,2.4,'#294f63');dot(ctx,x-1.75,y+1.6,1.36,1.18,'#c1e6f1');
      }
    });
  }

  function whisper(ctx,x,y){
    at(ctx,x,y,0,()=>{
      polygon(ctx,[[-12,3],[-14,13],[-2,7]],'#fff3d3','#475b60',1.1);
      dot(ctx,0,0,15,9,'#fff3d3','#475b60',1.2);
      for(const [x,h] of [[-5,3],[0,5],[5,2]])line(ctx,[[x,-h],[x,h]],'#416672',1.8);
    });
  }

  const art = {
    glasses(ctx) {
      at(ctx,58,44,-7,() => {
        line(ctx,[[-38,-7],[-26,-20],[-9,-17],[-5,-12]],ink,4);
        line(ctx,[[34,-3],[42,-16],[23,-20],[17,-15]],ink,3.5);
        const left=[[-37,-10],[-7,-8],[-9,5],[-14,12],[-28,10],[-35,5]];
        const right=[[0,-7],[29,-8],[32,-6],[28,7],[21,12],[6,11],[2,6]];
        polygon(ctx,left,'rgba(210,227,220,.24)',ink,3);
        polygon(ctx,right,'rgba(210,227,220,.24)',ink,3);
        polygon(ctx,[[7,-5],[15,-5],[5,8],[3,4]],'#d9f4dd',null);
        polygon(ctx,[[-31,-6],[-23,-5],[-31,3],[-34,0]],'#f3f4dc',null);
        line(ctx,[[-8,-3],[-5,-5],[-2,-5],[2,-3]],ink,3.2);
        line(ctx,[[-38,-9],[-7,-8]],'#456365',2.4);
        line(ctx,[[1,-7],[30,-8]],'#456365',2.4);
      });
    },
    ear(ctx) {
      at(ctx,58,43,-23,() => {
        extrude(ctx,[[-8,-17],[3,-23],[13,-22],[21,-16],[23,-6],[18,5],[8,13],[-5,12],[-12,5],[-15,-6]],'#b7bb9f','#dee1c3','#7f9489',5,-4);
        polygon(ctx,[[0,-13],[8,-17],[16,-14],[18,-8],[15,-2],[8,3],[1,2],[-3,-4]],'#698b87',ink,1.2);
        [-2,2,6].forEach((s) => line(ctx,[[s+4,-11],[s+10,-8]],'#b6d0ba',1.1));
        extrude(ctx,bevel(-18,-1,13,14,3),'#91a59a','#c9d3b9','#587b78',2,-2);
        polygon(ctx,[[-21,-4],[-15,-5],[-12,0],[-12,10],[-15,15],[-21,15],[-26,11],[-27,2]],'#647a74');
        dot(ctx,-22,5,3,6,'#354f51','#93ae9b',1.2);
        dot(ctx,12,-16,2.2,1.3,light);
      });
      whisper(ctx,85,23);
    },
    button(ctx) {
      at(ctx,60,43,-12,() => {
        extrude(ctx,ellipsePoints(0,1,25,20),'#637472','#a2b2a0','#384e51',5,-4);
        polygon(ctx,ellipsePoints(0,1,20,15.5),'#84948a');
        polygon(ctx,ellipsePoints(2,1,12.5,10),'#3b5557');
        polygon(ctx,ellipsePoints(2,1,8.5,7),'#82b3ad',null);
        dot(ctx,3,1,4.6,3.7,ink);
        dot(ctx,5,-1,1.7,1.3,'#c6ecdc');
        [[-15,-5],[-14,7],[16,-4],[15,8]].forEach(([x,y])=>dot(ctx,x,y,1.35,1.1,'#334a4e'));
        line(ctx,[[-12,-13],[-4,-16],[3,-16]],'#c5d0b9',1.4);
      });
    },
    eraser(ctx) { eraserUnderside(ctx,0,0,true); },
    watch(ctx) {
      at(ctx,58,43,-23,() => {
        extrude(ctx,bevel(-10,-36,21,70,3),'#6a8380','#a1b6a5','#47645f',4,-2.5);
        for(let y=-31;y<32;y+=5) line(ctx,[[-7,y],[7,y]],'#4c6664',1.3);
        extrude(ctx,bevel(-17,-18,35,36,5),'#42585c','#a0b3a6','#344c50',5,-3.6);
        polygon(ctx,bevel(-13,-14,27,27,3),'#275a61');
        line(ctx,[[-8,-6],[2,-6]],'#98d4c3',1.6);
        line(ctx,[[-8,-2],[6,-2]],'#92beac',1.2);
        line(ctx,[[-8,4],[-3,4],[-1,7],[4,1],[8,1]],'#edbb68',1.8);
        line(ctx,[[21,-4],[21,1]],'#5a7471',3);
      });
    }
  };

  function draw(canvas, key, options = {}) {
    if (!canvas || !art[key]) return;
    const box = canvas.getBoundingClientRect();
    const width = options.width || box.width || canvas.width || 120;
    const height = options.height || box.height || canvas.height || 84;
    const dpr = Math.min(options.dpr || window.devicePixelRatio || 1, 3);
    const pxW = Math.max(1,Math.round(width*dpr)), pxH = Math.max(1,Math.round(height*dpr));
    if (canvas.width !== pxW || canvas.height !== pxH) {
      canvas.width = pxW;
      canvas.height = pxH;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,pxW,pxH);
    const scale = Math.min(pxW/100,pxH/82)*(options.scale || 1);
    ctx.setTransform(scale,0,0,scale,pxW/2-60*scale,pxH/2-42*scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    art[key](ctx);
    ctx.setTransform(1,0,0,1,0,0);
  }

  function answer(ctx, x, y, number, radius = 9) {
    dot(ctx,x,y,radius,radius,'#235052','#e3c678',1.5);
    ctx.font = 'bold '+(radius*1.63)+'px monospace';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffedac';
    ctx.fillText(number,x,y+.8);
  }

  function normalButton(ctx) {
    polygon(ctx,ellipsePoints(62,37,21,17),'#b5afa0');
    polygon(ctx,ellipsePoints(62,37,16.5,13),'#d6cdb7','#847e70',1);
    [[57,33],[66,33],[57,41],[66,41]].forEach(([x,y])=>dot(ctx,x,y,2,2,'#635f55'));
    line(ctx,[[57,32.5],[66,41]],'#eee1c5',2);
    line(ctx,[[66,32.5],[57,41]],'#eee1c5',2);
  }

  const evidence = {
    glasses(ctx,positive,style,number,finish) {
      // The evidence photo is from the wearer's side. Window lines carry through the text.
      polygon(ctx,[[0,0],[120,0],[120,72],[0,72]],'#a8bdb3',null);
      line(ctx,[[0,25],[120,20]],'#d4dcd0',3);line(ctx,[[37,0],[37,72]],'#d4dcd0',3);
      const spec=gear.glasses[style],metal=gear.finishes.glasses[finish];
      for(const [side,cx] of [[-1,30],[1,89]]){
        const shape=Array.from({length:40},(_,i)=>{
          const [x,y]=gear.lensPoint(spec,side,i*Math.PI/20);
          return [cx+x*350,35-y*350];
        });
        polygon(ctx,shape,'rgba(202,230,224,0.06)',metal,spec.rim*520);
      }
      line(ctx,[[30+350*spec.w,31],[60,27],[89-350*spec.w,31]],metal,2);
      if(style===3)line(ctx,[[47,23],[72,23]],metal,1.6);
      if(positive){
        ctx.font='600 4.8px sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
        ctx.fillStyle='#ecfff8';ctx.shadowColor='#52645f';ctx.shadowBlur=1;
        gear.lensLines.forEach((str,i)=>ctx.fillText(str,70,29+5.6*i,37));
      }
    },
    ear(ctx, positive, style) {
      if(positive) {
        polygon(ctx,[[0,43],[120,36],[120,72],[0,72]],'#d3bb91',null);
        line(ctx,[[0,56],[120,48]],'#c2a981',1);
        at(ctx,62,38,8,() => {
          ctx.scale(1.16,1.16);
          ctx.translate(-58,-43);
          const shape=ellipsePoints(58,43,18,16,[16,6,20][style]);
          polygon(ctx,shape,['#bca879','#535a66','#ddaf91'][style]);
          if(style)line(ctx,[[58,53],[60,64]],'#736c63',4);
        });
        whisper(ctx,90,19);
        return;
      }
      polygon(ctx,[[0,0],[66,0],[84,10],[85,47],[77,58],[63,64],[55,72],[0,72]],'#dbaa7d',null);
      polygon(ctx,[[0,0],[67,0],[82,7],[81,18],[66,14],[44,21],[34,46],[28,72],[0,72]],'#504d44',null);
      polygon(ctx,[[53,24],[61,17],[70,18],[76,24],[75,34],[68,43],[66,51],[59,54],[54,49],[55,40],[51,33]],'#e6bb91','#9b7258',1.7);
      line(ctx,[[57,31],[60,24],[67,23],[71,27],[69,33],[64,34],[62,40]],'#ad7c60',2.4);
    },
    button(ctx, positive, style) {
      polygon(ctx,[[0,0],[120,0],[120,72],[0,72]],'#8fa69b',null);
      polygon(ctx,[[37,0],[73,0],[85,72],[48,72]],'#aabdac',null);
      line(ctx,[[39,0],[50,72]],'#607c72',1.6);
      line(ctx,[[71,0],[82,72]],'#718a7c',1.1);
      if(positive) {
        polygon(ctx,ellipsePoints(61,36,26,23,[20,6,4][style]),['#d2bda2','#aab5ac','#a79987'][style]);
        dot(ctx,61,36,10,10,'#263c40');dot(ctx,72,26,3.6,3.6,'#ff604c');
        line(ctx,[[80,38],[91,32],[98,32]],'#f6d885',1.4);
      } else normalButton(ctx);
    },
    eraser(ctx,positive,style,number,finish) {
      eraserUnderside(ctx,style,finish,positive);
    },
    watch(ctx,positive,style,number,finish) {
      const spec=gear.watch[style],col=gear.finishes.watch[finish];
      at(ctx,60,36,-13,()=>{
        extrude(ctx,bevel(-9,-45,18,90,3),col,'#aab5aa','#4d615d',3,-2);
        const shape=scale=>Array.from({length:spec.n},(_,i)=>{
          const [x,y]=gear.dialPoint(spec,2*Math.PI*i/spec.n);return [x*scale,-y*scale];
        });
        extrude(ctx,shape(510),col,'#b8c6ae','#465954',3,-2);polygon(ctx,shape(420),'#243e43',null);
        if(positive)answer(ctx,0,1,number,8);
        else line(ctx,[[-6,-4],[0,0],[6,-5]],'#c8d2c7',1.5);
      });
    }
  };

  function drawEvidence(canvas, type, positive, style = 0, number = 4, finish = 0) {
    if(!canvas || !evidence[type]) return;
    const box=canvas.getBoundingClientRect();
    const width=box.width || 120, height=box.height || 72;
    const dpr=Math.min(window.devicePixelRatio || 1,3);
    const w=Math.max(1,Math.round(width*dpr)), h=Math.max(1,Math.round(height*dpr));
    if(canvas.width!==w || canvas.height!==h) { canvas.width=w; canvas.height=h; }
    const ctx=canvas.getContext('2d');
    if(!ctx) return;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle=positive?'#c2d6c9':'#dedbc7';ctx.fillRect(0,0,w,h);
    const scale=Math.min(w/120,h/72);
    ctx.setTransform(scale,0,0,scale,(w-120*scale)/2,(h-72*scale)/2);
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.save();
    ctx.beginPath();ctx.rect(0,0,120,72);ctx.clip();
    evidence[type](ctx,positive,style,number,finish);
    ctx.restore();
    [[4,4,1,1],[116,4,-1,1],[4,68,1,-1],[116,68,-1,-1]].forEach(([x,y,sx,sy])=>{
      line(ctx,[[x+sx*5,y],[x,y],[x,y+sy*5]],positive?'#2b6861':'#66786c',1.1);
    });
    ctx.setTransform(1,0,0,1,0,0);
  }

  window.ExamArt = {draw, drawEvidence};
})();
