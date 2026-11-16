/* First-person patrol. The same world mesh feeds WebGL and the software fallback. */
(() => {
  'use strict';
  const TAU = Math.PI * 2, NEAR = .055, FAR = 48, REACH = 2.55;
  const clamp = (x,lo,hi) => Math.max(lo,Math.min(hi,x));
  const mix = (a,b,t) => a+(b-a)*t;
  const smooth = (lo,hi,x) => { const t=clamp((x-lo)/(hi-lo),0,1);return t*t*(3-2*t); };
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit = a => { const l=Math.hypot(...a)||1;return a.map(x=>x/l); };
  const rgbCache=new Map();
  function tint(source,light=1){
    const step=Math.round(light*100);
    let palette=rgbCache.get(source);
    if(!palette){palette=[];rgbCache.set(source,palette);}
    if(palette[step])return palette[step];
    light=step/100;
    let c;
    if(source[0]==='#'){
      let hex=source.slice(1);if(hex.length===3)hex=hex.split('').map(s=>s+s).join('');
      const n=parseInt(hex.slice(0,6),16);
      c=[n>>16,(n>>8)&255,n&255,hex.length===8?parseInt(hex.slice(6),16)/255:1];
    }else{
      const nums=source.match(/[\d.]+/g)||[];c=nums.length?[+nums[0],+nums[1],+nums[2],nums[3]==null?1:+nums[3]]:[175,175,150,1];
    }
    const out=c.slice(0,3).map((v,i)=>clamp((v*light+(light<1?(1-light)*[38,44,46][i]:0))/255,0,1));out.push(c[3]);
    out.css='rgba('+out.slice(0,3).map(v=>Math.round(v*255)).join(',')+','+out[3]+')';palette[step]=out;return out;
  }

  // A shared texture atlas makes wall lettering and numbered desk plaques part of the world.
  function lettering(){
    const surface=document.createElement('canvas');surface.width=1024;surface.height=1024;
    const c=surface.getContext('2d');const entries=new Map();let index=0,revision=0;
    function get(str,color){
      const key=str+'|'+color;if(entries.has(key))return entries.get(key);
      if(index>=64)return [0,0,0,0];
      const col=index%4,row=Math.floor(index/4), x=col*256,y=row*64;index++;
      c.clearRect(x,y,256,64);c.font='700 43px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
      c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(str,x+128,y+34,248);
      const measured=clamp(c.measureText(str).width,12,246),half=(measured+6)/2;
      const uv=[(x+128-half)/1024,(y+2)/1024,(x+128+half)/1024,(y+62)/1024];
      entries.set(key,uv);revision++;return uv;
    }
    return {get,surface,get revision(){return revision}};
  }

  const headPosePool=new WeakMap();
  function geometry(atlas){
    const faces=[],usedModels=new Map();
    function face(vertices,color,shade=1){
      if(vertices.length>=3)faces.push({v:vertices,c:tint(color,shade)});
    }
    function shaded(vertices, color, lights, sortBias=0) {
      const samples = lights.map(value => tint(color, value));
      const average = lights.reduce((sum, value) => sum + value, 0) / lights.length;
      faces.push({v:vertices, c:tint(color, average), colors:samples,sortBias});
    }
    function mesh(model, transform, blink) {
      // A model may appear twice in one frame (the two escorting officers).
      // Keep separate posed vertices for each live instance and reuse them on the next frame.
      const slot=usedModels.get(model)||0;
      usedModels.set(model,slot+1);
      let pool=headPosePool.get(model);
      if(!pool){pool=[];headPosePool.set(model,pool);}
      let pose=pool[slot];
      if(!pose){
        const vertices=model.points.map(()=>[0,0,0]),open=[],shut=[];
        for(const f of model.faces){
          const face={v:f.indices.map(i=>vertices[i]), colors:f.lights.map(value=>tint(f.color,value)),
            c:tint(f.color,f.lights.reduce((a,b)=>a+b,0)/f.lights.length),sortBias:f.bias};
          if(f.group!=='shut')open.push(face);
          if(f.group!=='open')shut.push(face);
        }
        pool[slot]=pose={vertices,open,shut};
      }
      const origin=transform([0,0,0]);
      const axisX=transform([1,0,0]).map((n,i)=>n-origin[i]);
      const axisY=transform([0,1,0]).map((n,i)=>n-origin[i]);
      const axisZ=transform([0,0,1]).map((n,i)=>n-origin[i]);
      for(let i=0;i<model.points.length;i++){
        const p=model.points[i],q=pose.vertices[i];
        for(let k=0;k<3;k++)q[k]=origin[k]+p[0]*axisX[k]+p[1]*axisY[k]+p[2]*axisZ[k];
      }
      for(const f of blink?pose.shut:pose.open)faces.push(f);
    }
    function box(x,y,z,w,h,d,color){
      const l=x-w/2,r=x+w/2,b=y-h/2,t=y+h/2,n=z-d/2,f=z+d/2;
      const q=[[l,b,n],[r,b,n],[r,t,n],[l,t,n],[l,b,f],[r,b,f],[r,t,f],[l,t,f]];
      face([q[0],q[3],q[2],q[1]],color,.99);face([q[4],q[5],q[6],q[7]],color,.89);
      face([q[0],q[4],q[7],q[3]],color,1.045);face([q[1],q[2],q[6],q[5]],color,.835);
      face([q[3],q[7],q[6],q[2]],color,1.085);face([q[0],q[1],q[5],q[4]],color,.79);
      const normals=[[0,0,-1],[0,0,1],[-1,0,0],[1,0,0],[0,1,0],[0,-1,0]], shell=(h>3.2&&(w>6||d>6))||(w>6&&d>6);
      for(let i=0;i<6;i++){const f=faces[faces.length-6+i];f.n=normals[i];if(shell)f.shell=true;}
    }
    function rod(a,b,r,color,n=6){
      const axis=unit(b.map((v,i)=>v-a[i])),u=unit(cross(axis,Math.abs(axis[1])<.85?[0,1,0]:[0,0,1])),v=cross(axis,u),aa=[],bb=[],norms=[];
      for(let i=0;i<n;i++){
        const ang=i*TAU/n,co=Math.cos(ang),si=Math.sin(ang),nn=u.map((s,j)=>s*co+v[j]*si);
        aa.push(a.map((s,j)=>s+r*nn[j]));bb.push(b.map((s,j)=>s+r*nn[j]));norms.push(nn);
      }
      for(let i=0;i<n;i++){const j=(i+1)%n,nn=norms[i];face([aa[i],aa[j],bb[j],bb[i]],color,.965-.09*nn[0]+.11*nn[1]-.035*nn[2]);}
      face(aa,color,.93);face(bb,color,1.03);
    }
    function ellipsoid(x,y,z,rx,ry,rz,col){
      const bands=4,segs=8,rings=[];
      for(let j=0;j<=bands;j++){
        const lat=-Math.PI/2+j*Math.PI/bands,yy=Math.sin(lat),rr=Math.cos(lat),ring=[];
        for(let i=0;i<segs;i++){const u=i*TAU/segs;ring.push([x+rx*rr*Math.cos(u),y+ry*yy,z+rz*rr*Math.sin(u)]);}rings.push(ring);
      }
      for(let j=0;j<bands;j++)for(let i=0;i<segs;i++){
        const next=(i+1)%segs,lat=-Math.PI/2+(j+.5)*Math.PI/bands,u=(i+.5)*TAU/segs;
        const color=.984+.105*Math.sin(lat)-.078*Math.cos(lat)*Math.cos(u)-.04*Math.cos(lat)*Math.sin(u);
        face([rings[j][i],rings[j+1][i],rings[j+1][next],rings[j][next]],col,color);
      }
    }
    function decal(vertices,str,color) {
      faces.push({v:vertices,c:tint('#ffffff'),uv:atlas.get(str,color),label:{str,color},sortBias:.004});
    }
    function text(x,y,z,str,w,h,color='#f6edd8',orientation='back'){
      const uv=atlas.get(str,color),a=w/2,b=h/2;
      const right={back:[1,0,0],front:[-1,0,0],left:[0,0,-1],right:[0,0,1]}[orientation]||[1,0,0];
      const xy=(sx,sy)=>[x+right[0]*sx,y+sy,z+right[2]*sx];
      faces.push({v:[xy(-a,b),xy(a,b),xy(a,-b),xy(-a,-b)],c:tint('#ffffff'),uv,
        label:{str,color}});
    }
    return {faces,box,rod,ellipsoid,poly:face,shaded,mesh,text,decal};
  }

  // GPU vertex coordinates remain in world space; hardware clipping works even inside a row.
  function makeGPU(canvas,atlas){
    let gl;
    try{gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,powerPreference:'low-power'})}catch{}
    if(!gl||!gl.createShader)return null;
    const vertex='attribute vec3 pos;attribute vec4 color;attribute vec2 uv;uniform vec3 eye;uniform vec4 ang;uniform vec2 lens;varying lowp vec4 tint;varying mediump vec2 tex;varying mediump float depth;void main(){vec3 d=pos-eye;float h=ang.x*d.x+ang.y*d.z;float z=ang.z*h+ang.w*d.y;float y=ang.z*d.y-ang.w*h;float x=ang.y*d.x-ang.x*d.z;gl_Position=vec4(x/lens.x,y/lens.y,1.002295*z-0.110126,z);tint=color;tex=uv;depth=z;}';
    const frag='precision mediump float;varying lowp vec4 tint;varying mediump vec2 tex;varying mediump float depth;uniform sampler2D font;void main(){vec4 col=tint;if(tex.x>=0.){col*=texture2D(font,tex);if(col.a<.15)discard;}col.rgb=mix(col.rgb,vec3(.85,.83,.72),clamp((depth-5.)*.012,0.,.11));gl_FragColor=col;}';
    function compile(kind,source){const sh=gl.createShader(kind);gl.shaderSource(sh,source);gl.compileShader(sh);return sh;}
    const pg=gl.createProgram();gl.attachShader(pg,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(pg,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(pg);if(!gl.getProgramParameter(pg,gl.LINK_STATUS))return null;
    const av=key=>gl.getAttribLocation(pg,key),u=key=>gl.getUniformLocation(pg,key);
    const ap=av('pos'),ac=av('color'),at=av('uv'),eyeLoc=u('eye'),angLoc=u('ang'),lensLoc=u('lens');
    const fixed=gl.createBuffer(),dynamic=gl.createBuffer(),texture=gl.createTexture();let rev=-1,fixedCount=0;
    gl.useProgram(pg);gl.uniform1i(u('font'),0);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const scratch={data:new Float32Array(131072)};
    function pack(faces){
      let off=0,cap=0;for(const f of faces)cap+=(f.v.length-2)*27;
      if(cap>scratch.data.length)scratch.data=new Float32Array(Math.ceil(cap/65536)*65536);const ar=scratch.data;
      function emit(f,i){const p=f.v[i],col=f.colors?f.colors[i]:f.c,uv=f.uv;ar[off++]=p[0];ar[off++]=p[1];ar[off++]=p[2];
        ar[off++]=col[0];ar[off++]=col[1];ar[off++]=col[2];ar[off++]=col[3];
        ar[off++]=uv?(i===0||i===3?uv[0]:uv[2]):-1;ar[off++]=uv?(i<2?uv[1]:uv[3]):-1;}
      for(const f of faces)for(let j=2;j<f.v.length;j++){emit(f,0);emit(f,j-1);emit(f,j);}
      return ar.subarray(0,off);
    }
    function bind(buf){
      gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,36,0);
      gl.enableVertexAttribArray(ac);gl.vertexAttribPointer(ac,4,gl.FLOAT,false,36,12);gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,36,28);
    }
    return {
      setFixed(faces){const data=pack(faces);fixedCount=data.length/9;gl.bindBuffer(gl.ARRAY_BUFFER,fixed);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW)},
      render(view,dyn){
        if(gl.isContextLost())return false;
        gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.84,.86,.80,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.useProgram(pg);gl.uniform3f(eyeLoc,view.x,view.y,view.z);gl.uniform4f(angLoc,view.sy,view.cy,view.cp,view.sp);gl.uniform2f(lensLoc,view.tx,view.ty);
        if(rev!==atlas.revision){gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas.surface);rev=atlas.revision;}
        bind(fixed);gl.drawArrays(gl.TRIANGLES,0,fixedCount);
        const opaque=[],glass=[];
        for(const f of dyn)(f.c[3]<1?glass:opaque).push(f);
        const upload=faces=>{const d=pack(faces);bind(dynamic);gl.bufferData(gl.ARRAY_BUFFER,d,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,d.length/9);};
        upload(opaque);
        if(glass.length){glass.sort((a,b)=>toCam(b.v[0],view)[2]-toCam(a.v[0],view)[2]);gl.depthMask(false);upload(glass);gl.depthMask(true);}
        return true;
      },
      destroy(){gl.deleteProgram(pg);gl.deleteBuffer(fixed);gl.deleteBuffer(dynamic);gl.deleteTexture(texture)}
    };
  }
  function toCam(p,v){const dx=p[0]-v.x,dy=p[1]-v.y,dz=p[2]-v.z,flat=v.sy*dx+v.cy*dz;
    return [v.cy*dx-v.sy*dz,v.cp*dy-v.sp*flat,v.cp*flat+v.sp*dy];}
  function screen(p,v){return [(1+p[0]/(p[2]*v.tx))*v.w/2,(1-p[1]/(p[2]*v.ty))*v.h/2];}
  // Rasterize the fallback with per-pixel depth, so a large desk face cannot
  // paint over a nearer pen, page, hand or glasses as the camera turns.
  function makeSoftware(canvas,atlas){
    const output=canvas.getContext('2d',{alpha:false});
    const surface=document.createElement('canvas'),ctx=surface.getContext('2d',{alpha:false});
    if(!output||!ctx)return null;
    let fixed=[],key='',frame,depth,background,baseDepth,tex,revision=-1;
    function raster(faces,v){
      const W=surface.width,H=surface.height,pixels=frame.data,transparent=[];
      for(const face of faces){
        if(face.c[3]<1){transparent.push(face);continue;}
        polygon(face);
      }
      transparent.sort((a,b)=>toCam(b.v[0],v)[2]-toCam(a.v[0],v)[2]);
      for(const f of transparent)polygon(f);
      function polygon(f){
        const [p]=f.v;
        if(f.n&&((v.x-p[0])*f.n[0]+(v.y-p[1])*f.n[1]+(v.z-p[2])*f.n[2])<=0)return;
        let vertices=f.v.map((q,i)=>{
          const cam=toCam(q,v);
          if(f.uv)cam.push(f.uv[i===0||i===3?0:2],f.uv[i<2?1:3]);
          return cam;
        });
        if(vertices.every(q=>q[2]<NEAR)||vertices.every(q=>q[2]>FAR))return;
        if(vertices.some(q=>q[2]<NEAR)){
          let prev=vertices[vertices.length-1],clipped=[];
          for(const q of vertices){
            if((q[2]<NEAR)!==(prev[2]<NEAR)){
              const t=(NEAR-prev[2])/(q[2]-prev[2]);clipped.push(q.map((value,i)=>mix(prev[i],value,t)));
            }
            if(q[2]>=NEAR)clipped.push(q);
            prev=q;
          }
          vertices=clipped;
        }
        const screen=vertices.map(q=>{
          const inv=1/q[2];
          return [(1+q[0]*inv/v.tx)*W*.5,(1-q[1]*inv/v.ty)*H*.5,inv,(q[3]||0)*inv,(q[4]||0)*inv];
        });
        const red=f.c[0]*255,green=f.c[1]*255,blue=f.c[2]*255;
        for(let j=2;j<screen.length;j++)triangle(screen[0],screen[j-1],screen[j]);
        function triangle(a,b,c){
          const xmin=Math.max(0,Math.ceil(Math.min(a[0],b[0],c[0])-.5));
          const xmax=Math.min(W-1,Math.floor(Math.max(a[0],b[0],c[0])-.5));
          const ymin=Math.max(0,Math.ceil(Math.min(a[1],b[1],c[1])-.5));
          const ymax=Math.min(H-1,Math.floor(Math.max(a[1],b[1],c[1])-.5));
          if(xmin>xmax||ymin>ymax)return;
          const bx=b[0]-a[0],by=b[1]-a[1],cx=c[0]-a[0],cy=c[1]-a[1],det=bx*cy-by*cx;
          if(Math.abs(det)<1e-8)return;
          const du=cy/det,dv=-by/det,sx=xmin+.5-a[0];
          for(let y=ymin;y<=ymax;y++){
            const sy=y+.5-a[1];
            let u=(sx*cy-sy*cx)/det,vv=(bx*sy-by*sx)/det;
            for(let x=xmin,k=y*W+x;x<=xmax;x++,k++,u+=du,vv+=dv){
              const w=1-u-vv;
              if(w<-.000001||u<-.000001||vv<-.000001)continue;
              const inv=w*a[2]+u*b[2]+vv*c[2];
              if(inv+1e-8<depth[k])continue;
              let r=red,g=green,bv=blue,alpha=f.c[3];
              if(f.uv){
                const tx=clamp(Math.floor((w*a[3]+u*b[3]+vv*c[3])*1024/inv),0,1023);
                const ty=clamp(Math.floor((w*a[4]+u*b[4]+vv*c[4])*1024/inv),0,1023);
                const t=4*(ty*1024+tx);alpha=tex[t+3]/255;
                if(alpha<.15)continue;
                r=tex[t];g=tex[t+1];bv=tex[t+2];
              }
              const i=k*4;
              if(alpha>=.995){pixels[i]=r;pixels[i+1]=g;pixels[i+2]=bv;}
              else{pixels[i]=mix(pixels[i],r,alpha);pixels[i+1]=mix(pixels[i+1],g,alpha);pixels[i+2]=mix(pixels[i+2],bv,alpha);}
              if(f.c[3]===1)depth[k]=inv;
            }
          }
        }
      }
    }
    return {
      setFixed(faces){fixed=faces;key='';},
      render(v,faces){
        const scale=Math.min(v.dpr,Math.sqrt(420000/(v.w*v.h)));
        const W=Math.max(1,Math.round(v.w*scale)),H=Math.max(1,Math.round(v.h*scale));
        if(!frame||W!==surface.width||H!==surface.height){
          surface.width=W;surface.height=H;frame=ctx.createImageData(W,H);
          if(!frame)return;
          background=new Uint8ClampedArray(W*H*4);depth=new Float32Array(W*H);baseDepth=new Float32Array(W*H);key='';
        }
        if(revision!==atlas.revision){
          tex=atlas.surface.getContext('2d').getImageData(0,0,1024,1024).data;revision=atlas.revision;
        }
        const next=[v.x,v.y,v.z,v.yaw,v.pitch,v.tx,v.ty].join('|');
        if(next!==key){
          const data=frame.data;for(let i=0;i<data.length;i+=4){data[i]=213;data[i+1]=219;data[i+2]=204;data[i+3]=255;}
          depth.fill(0);raster(fixed,v);background.set(data);baseDepth.set(depth);key=next;
        }else{frame.data.set(background);depth.set(baseDepth);}
        raster(faces,v);ctx.putImageData(frame,0,0);
        output.setTransform(1,0,0,1,0,0);output.drawImage(surface,0,0,canvas.width,canvas.height);
      },destroy(){}
    };
  }

  function layout(count,preset){
    const columns=count<=6?2:3,rows=Math.ceil(count/columns);
    const room={halfWidth:columns===2?3.86:4.80,frontZ:-3.55,backZ:2.12+(rows-1)*2.65+2.85,height:3.65,level:preset};
    const positions=[];
    for(let i=0;i<count;i++){
      const col=i%columns,row=Math.floor(i/columns);
      let x=(col-(columns-1)/2)*(columns===2?2.60:2.76);
      if(count>2&&i===count-1&&i%columns===0)x=0;
      positions.push({x,z:2.13+row*2.65+(preset===1&&i===1?.38:0)});
    }
    return {room,positions,start:{x:columns===3?-1.37:.69,z:count===2?-1.83:-1.93,yaw:columns===3?.12:-.16,pitch:-.095}};
  }
  function makeDesk(g,x,z,seat){
    const b=(dx,y,dz,w,h,d,c)=>g.box(x+dx,y,z+dz,w,h,d,c);
    const steel='#6b7770',feet='#4a5653',edge='#ad7850',wood=['#d6a16a','#d9a96d','#d5a673'][seat.id%3];
    const flat=(xa,xb,za,zb,yy,c)=>g.poly([[x+xa,yy,z+za],[x+xb,yy,z+za],[x+xb,yy,z+zb],[x+xa,yy,z+zb]],c);
    // Layered contact shadows preserve the plank seams under the furniture.
    const shade = (cx,cz,rx,rz,alpha) => {
      const pts=[];
      for(let i=0;i<20;i++){
        const a=TAU*i/20;
        pts.push([x+cx+rx*Math.cos(a),.010+alpha*.012,z+cz+rz*Math.sin(a)]);
      }
      g.poly(pts,'rgba(58,49,46,'+alpha+')');
    };
    shade(.06,-.32,.99,.93,.07);
    shade(.065,-.38,.81,.69,.09);
    shade(.04,.035,.44,.38,.13);
    for(const dx of [-.70,.70])for(const dz of [-.94,-.30]){
      b(dx,.462,dz,.043,.886,.043,steel);b(dx,.036,dz,.056,.067,.056,feet);
    }
    for(const dx of [-.70,.70])b(dx,.60,-.61,.038,.046,.64,steel);
    b(0,.73,-.35,1.44,.048,.049,steel);
    b(0,.838,-.55,1.46,.15,.55,'#b79368');
    b(0,.947,-.615,1.66,.075,.85,edge);b(0,.99,-.615,1.65,.028,.85,wood);
    for(const dx of [-.255,.255])for(const dz of [-.18,.23]){
      b(dx,.243,dz,.036,.45,.036,steel);b(dx,.035,dz,.048,.063,.048,feet);}
    b(0,.488,.027,.67,.065,.53,'#ba8b59');
    for(const dx of [-.259,.259])b(dx,.745,.25,.039,.53,.042,steel);
    b(0,.925,.27,.68,.28,.053,'#bb905f');
    // A backing sheet peeks out beneath the movable working sheet.
    flat(-.27,.235,-.889,-.418,1.009,'#e9dfc9');
    if(seat.id%3===2){g.rod([x+.40,1.022,z-.75],[x+.54,1.022,z-.52],.012,'#537d79',5);}
    b(-.55,.939,-1.045,.27,.105,.012,'#537c71');
    g.text(x-.55,.944,z-1.055,String(seat.id).padStart(2,'0'),.145,.077,'#fff3d7','back');
  }
  function escortRoute(room,p,columns){
    const doorX=room.halfWidth-.85;
    // In a two-column room the centre of the last row can contain a single desk.
    const aisle=columns===2?(p.x<0?-2.59:2.59):(p.x<0?-1.38:1.38);
    const raw=[[doorX,room.backZ+.85],[doorX,room.backZ-.82],[aisle,room.backZ-.82],[aisle,p.z+.87],[p.x,p.z+.87],[p.x,p.z+.48]];
    const points=[raw[0]];
    const along=(a,b,d)=>{const len=Math.hypot(b[0]-a[0],b[1]-a[1]);return [a[0]+(b[0]-a[0])*d/len,a[1]+(b[1]-a[1])*d/len];};
    for(let i=1;i<raw.length-1;i++){
      const a=raw[i-1],b=raw[i],c=raw[i+1];
      const r=Math.min(.32,Math.hypot(a[0]-b[0],a[1]-b[1])*.43,Math.hypot(c[0]-b[0],c[1]-b[1])*.43);
      const u=along(b,a,r),v=along(b,c,r);points.push(u);
      for(let j=1;j<=6;j++){const t=j/6,k=1-t;points.push([0,1].map(n=>k*k*u[n]+2*k*t*b[n]+t*t*v[n]));}
    }
    points.push(raw[raw.length-1]);
    const lengths=[0];
    for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
    const length=lengths[lengths.length-1];
    function sample(d){
      if(d<0){
        // Once outside, turn down the corridor and pass behind the solid wall.
        const radius=.34,travel=-d,angle=Math.min(Math.PI/2,travel/radius);
        return {x:doorX-radius*(1-Math.cos(angle))-Math.max(0,travel-radius*Math.PI/2),
          z:room.backZ+.85+radius*Math.sin(angle),facing:-angle};
      }
      d=clamp(d,0,length);
      let i=1;while(i+1<lengths.length&&lengths[i]<d)i++;
      const a=points[i-1],b=points[i],k=(d-lengths[i-1])/(lengths[i]-lengths[i-1]);
      return {x:mix(a[0],b[0],k),z:mix(a[1],b[1],k),facing:Math.atan2(a[0]-b[0],a[1]-b[1])};
    }
    return {length,sample};
  }
  function dispatchTeam(room,p,columns,start){
    const route=escortRoute(room,p,columns),arrival=.67+(route.length-.24)/3.85,depart=arrival+1.03;
    const end=depart+(route.length+2.20)/2.95;
    function pose(clock){
      const t=clock-start, returning=t>=depart;
      const d=returning?route.length-(t-depart)*2.95:t<.67?.24*smooth(.15,.49,t):Math.min(route.length,.24+(t-.67)*3.85);
      const pos=route.sample(d),rise=smooth(arrival,arrival+.80,t);
      const facing=pos.facing+(returning?Math.PI:Math.PI*smooth(arrival+.38,depart,t));
      const pupil={x:mix(p.x,pos.x,rise),z:mix(p.z,pos.z,rise),facing:facing*rise,rise};
      const grip=smooth(arrival-.20,arrival+.38,t);
      const kick=smooth(.08,.35,t)*(1-smooth(.54,.80,t));
      const officers=[-1,1].map(sign=>{
        const spread=mix(returning?.30:.09,.52,smooth(route.length-1.55,route.length-.12,d));
        const stagger=sign*(1-smooth(route.length-1.55,route.length-.12,d))*.36;
        // Follow the centreline in single file through the doorway and narrow aisles.
        const o=route.sample(d+stagger*(returning?-1:1));
        const yaw=o.facing+(returning?Math.PI:Math.PI*smooth(arrival+.38,depart,t));
        const lateral=sign*spread;
        return {x:o.x+Math.cos(yaw)*lateral,z:o.z-Math.sin(yaw)*lateral,facing:yaw,
          side:sign,kick:sign===1?kick:0,grip,stagger:returning?stagger:0};
      });
      return {t,pos,pupil,officers,grip,returning,kick};
    }
    return {start,arrival,depart,end,pose};
  }
  function createPatrol(canvas,events={}){
    const atlas=lettering(),surface=document.createElement('canvas'),output=canvas.getContext('2d',{alpha:false});
    // Isolate GPU setup so a lost or unavailable graphics context leaves the visible canvas usable.
    let gpu=null;
    try{gpu=makeGPU(surface,atlas)}catch{}
    const software=makeSoftware(canvas,atlas);
    const renderer={
      setFixed(faces,base){software?.setFixed(faces,base);gpu?.setFixed(faces,base);},
      render(v,faces){
        if(gpu&&output){
          if(surface.width!==canvas.width||surface.height!==canvas.height){surface.width=canvas.width;surface.height=canvas.height;}
          try{if(gpu.render(v,faces)){output.setTransform(1,0,0,1,0,0);output.drawImage(surface,0,0);return;}}catch{}
          gpu.destroy();gpu=null;
        }
        software?.render(v,faces);
      },
      destroy(){gpu?.destroy();software?.destroy();}
    };
    let seats=[],positions=[],room=null,level=1,camera={x:0,z:-1.83,yaw:0,pitch:-.076};
    let zoom=1,active=false,forward=0,strafe=0,last=0,clock=0,walkT=0,walkAmp=0,destroyed=false;
    let lastDraw=-1000,view=null,focus=null,lockedId=null,notified='',dirty=true,previousStatus=new Map(),escort=new Map();
    let finale=null;
    function getView(){
      const rec=canvas.getBoundingClientRect(),w=Math.max(1,rec.width),h=Math.max(1,rec.height);
      const raw=window.devicePixelRatio||1,dpr=Math.min(raw,1.65,Math.sqrt(1.25e6/(w*h)));
      const px=Math.max(1,Math.round(w*dpr)),py=Math.max(1,Math.round(h*dpr));
      if(canvas.width!==px||canvas.height!==py){canvas.width=px;canvas.height=py;dirty=true;}
      const ratio=w/h,ty=finale&&clock>=finale.exitAt?Math.max(.53,.28/ratio):Math.max(.51,.598/ratio)/zoom,tx=ty*ratio;
      return {...camera,y:1.60+.018*walkAmp*Math.sin(walkT*2),w,h,tx,ty,dpr,sy:Math.sin(camera.yaw),cy:Math.cos(camera.yaw),sp:Math.sin(camera.pitch),cp:Math.cos(camera.pitch)};
    }
    function setRound(newSeats,newLevel){
      seats=Array.isArray(newSeats)?newSeats:[];level=Number(newLevel)||1;
      zoom=1;window.resetCandidateModels?.(seats);
      const data=layout(seats.length,level);room=data.room;positions=data.positions;camera={...data.start};
      strafe=0;forward=0;walkAmp=0;walkT=0;clock=0;last=0;lastDraw=-1000;focus=null;lockedId=null;notified='';dirty=true;
      previousStatus=new Map(seats.map(s=>[s.id,s.status]));escort=new Map();finale=null;
      const g=geometry(atlas);
      if(typeof window.drawExamRoom==='function')window.drawExamRoom(g,room);
      const wallCount=g.faces.length;
      for(let i=0;i<seats.length;i++)makeDesk(g,positions[i].x,positions[i].z,seats[i]);
      renderer?.setFixed(g.faces,wallCount);view=getView();updateFocus();render();
    }
    function canStand(x,z){
      const radius=.20;
      if(x< -room.halfWidth+.54||x>room.halfWidth-.58||z<room.frontZ+.45||z>room.backZ-.60)return false;
      for(const p of positions){
        // Two shapes keep the little walking space beside a chair accessible.
        const collides=(cx,cz,hw,hd)=>Math.hypot(Math.max(Math.abs(x-cx)-hw,0),Math.max(Math.abs(z-cz)-hd,0))<radius;
        if(collides(p.x,p.z-.615,.82,.435)||collides(p.x,p.z+.055,.39,.35))return false;
      }
      return true;
    }
    function walk(dt){
      const magnitude=Math.hypot(strafe,forward),factor=2.08*dt/Math.max(1,magnitude);
      const dx=(Math.cos(camera.yaw)*strafe+Math.sin(camera.yaw)*forward)*factor;
      const dz=(Math.cos(camera.yaw)*forward-Math.sin(camera.yaw)*strafe)*factor;
      const x=camera.x,z=camera.z;
      if(canStand(x+dx,z))camera.x+=dx;
      if(canStand(camera.x,z+dz))camera.z+=dz;
      const delta=Math.hypot(camera.x-x,camera.z-z);walkAmp=mix(walkAmp,delta>.001?Math.min(1,magnitude):0,Math.min(1,dt*12));
      if(delta>.001){walkT+=delta*3.2;lockedId=null;events.onMove?.({x:camera.x,z:camera.z});dirty=true;}
    }
    function project(world){const v=toCam(world,view);if(v[2]<NEAR)return null;const s=screen(v,view);return {x:s[0],y:s[1],depth:v[2]};}
    // Students face -Z. The inside of either lens clears the head from a rear aisle.
    function rearLens(p) {
      const dz=camera.z-p.z, dx=Math.abs(camera.x-p.x);
      return dz>.045 && dx>.46*dz && dx>.20;
    }
    function targets(){
      const result=[];
      for(let i=0;i<seats.length;i++){
        const s=seats[i];if(s.status!=='open')continue;
        const p=positions[i],dist=Math.hypot(p.x-camera.x,p.z-camera.z);
        const body=project([p.x,1.27,p.z-.13]),head=project([p.x,1.63,p.z]),desk=project([p.x,.93,p.z-.85])||body;
        if(!body||!head||!desk)continue;
        const radius=Math.max(20,view.h/(2*view.ty)*.58/body.depth);
        if(body.x< -radius*.2||body.x>view.w+radius*.2||head.y>view.h+radius*.5||desk.y< -radius*.2)continue;
        const hx=Math.max(radius*.72,view.h/(2*view.ty)*.78/body.depth),top=Math.min(head.y,body.y)-radius*.28,bottom=Math.max(desk.y,body.y)+radius*.18;
        const cx=(body.x*3+desk.x)/4,bearing=Math.atan2(p.x-camera.x,p.z-camera.z)-camera.yaw;
        result.push({id:s.id,distance:dist,near:dist<=REACH,rearLens:rearLens(p),bearing:Math.atan2(Math.sin(bearing),Math.cos(bearing)),cx,cy:body.y,top,bottom,hx,depth:body.depth,x:p.x,z:p.z});
      }
      return result;
    }
    function visible(target,all){
      return !all.some(other=>other.id!==target.id&&other.depth+.42<target.depth&&Math.abs(other.cx-target.cx)<other.hx*.62&&target.cy>=other.top&&target.cy<other.bottom);
    }
    function publishFocus(next){
      focus=next?{id:next.id,distance:Math.round(next.distance*10)/10,near:next.near,rearLens:next.rearLens,bearing:next.bearing}:null;
      const sig=focus?focus.id+'|'+focus.near+'|'+focus.rearLens+'|'+Math.round(focus.distance*3):'none';
      if(sig!==notified){notified=sig;events.onFocus?.(focus);}
    }
    function updateFocus(){
      if(!view||!room)return;
      const all=targets();let best=null,bestScore=Infinity;
      for(const obj of all){
        if(!visible(obj,all))continue;
        const horizontal=Math.abs(obj.cx-view.w*.5)/(view.w*.5),vertical=Math.abs(obj.cy-view.h*.5)/(view.h*.5);
        if(horizontal>(obj.near?.98:.92)||vertical>.82||obj.distance>6)continue;
        const score=horizontal*.65+vertical*.22+obj.distance*.051+(obj.near?0:.55)-(obj.id===lockedId?.75:0);
        if(score<bestScore){bestScore=score;best=obj;}
      }
      publishFocus(best);
    }
    function tap(cssX,cssY){
      if(!active||!room)return null;view=getView();
      const all=targets(),hits=all.filter(o=>cssY>=o.top&&cssY<=o.bottom&&Math.abs(cssX-o.cx)<=o.hx&&visible(o,all));
      hits.sort((a,b)=>a.depth-b.depth);
      const t=hits[0];if(!t)return null;
      lockedId=t.id;publishFocus(t);if(t.near)events.onTap?.(t.id);dirty=true;return {...focus};
    }
    function directionToStudent(id){
      const index=seats.findIndex(seat=>seat.id===id&&seat.status==='open');
      if(index<0)return null;
      const p=positions[index];
      const delta=Math.atan2(p.x-camera.x,p.z-camera.z)-camera.yaw;
      const angle=Math.atan2(Math.sin(delta),Math.cos(delta));
      if(Math.abs(angle)>2.35)return '뒤쪽';
      if(angle<-.31)return '왼쪽';
      if(angle>.31)return '오른쪽';
      return '정면';
    }
    function sync(){
      for(const s of seats){
        if(s.status==='caught'&&previousStatus.get(s.id)!=='caught'){
          const lastTeam=Array.from(escort.values()).pop();
          const start=Math.max(clock,lastTeam?lastTeam.start+.52:clock);
          const team=dispatchTeam(room,positions[seats.indexOf(s)],seats.length<=6?2:3,start);
          team.caughtAt=clock;escort.set(s.id,team);
        }
        previousStatus.set(s.id,s.status);
      }
      dirty=true;if(view)updateFocus();
    }
    function beginFinale(){
      const teams=[...escort.values()];
      const lastTeam=teams.reduce((a,b)=>a.start+a.end>b.start+b.end?a:b);
      const exitAt=lastTeam.start+lastTeam.end;
      finale={lastTeam,exitAt,survivors:seats.filter(s=>!s.points.some(p=>p.positive)),announced:false,done:false};
      zoom=1;dirty=true;
    }
    function celebratingPlace(p,elapsed){
      const rise=smooth(0,.42,elapsed),step=smooth(.28,1.0,elapsed);
      const side=p.x<0?-1:1;
      return {x:p.x+side*1.04*step,z:p.z+.50*rise,side,rise,step};
    }
    function directCamera(){
      if(!finale)return;
      const {survivors,exitAt,lastTeam}=finale;
      let aim,eye;
      if(clock>=exitAt){
        const elapsed=clock-exitAt;
        if(!finale.announced){finale.announced=true;events.onCheer?.(survivors.length);}
        const seat=survivors[Math.min(survivors.length-1,Math.floor(Math.max(0,elapsed-.74)/2.20))];
        const p=positions[seats.indexOf(seat)];
        const pos=celebratingPlace(p,elapsed);
        aim={x:pos.x,y:1.08,z:pos.z};
        eye={x:clamp(pos.x+pos.side*.62,-room.halfWidth+.37,room.halfWidth-.37),z:p.z-2.07};
      }else{
        const {t,pos,pupil,returning}=lastTeam.pose(clock);
        if(t<1.22){aim={x:room.halfWidth-.85,y:1.13,z:room.backZ};eye={x:aim.x-.73,z:aim.z-2.55};}
        else{
          const subject=t<lastTeam.arrival?pos:pupil;
          aim={x:subject.x,z:subject.z,y:t<lastTeam.arrival?1.27:1.31};
          const angle=subject.facing, side=subject.x>0?-1:1;
          eye={x:clamp(aim.x-1.75*Math.sin(angle)+side*.91,-room.halfWidth+.48,room.halfWidth-.48),
            z:clamp(aim.z-1.75*Math.cos(angle),room.frontZ+.35,room.backZ-.42)};
          if(returning&&aim.z>room.backZ-1.5){eye.x=room.halfWidth-2.12;eye.z=room.backZ-2.10;}
        }
      }
      camera.x=eye.x;camera.z=eye.z;camera.yaw=Math.atan2(aim.x-eye.x,aim.z-eye.z);
      camera.pitch=Math.atan2(aim.y-1.60,Math.hypot(aim.x-eye.x,aim.z-eye.z));
    }
    function render(){
      if(!room||!renderer||!view)return;
      const g=geometry(atlas);
      let opening=0;
      for(const team of escort.values()){
        const t=clock-team.start;
        const swing=smooth(.32,.52,t)*(1-smooth(team.end-.45,team.end+.25,t));
        opening=Math.max(opening,swing*(1.49+.105*Math.sin((t-.50)*14)*Math.exp(-Math.max(0,t-.50)*4)));
      }
      window.drawExamDoor(g,room,opening);
      const detail=(x,z,limit=3.9)=>Math.hypot(x-camera.x,z-camera.z)<=limit?'near':'far';
      const visibleAt=(x,z)=>{const pt=toCam([x,1.2,z],view);return pt[2]>-.65&&Math.abs(pt[0])<(pt[2]+1)*view.tx+1.1&&Math.abs(pt[1])<(pt[2]+1)*view.ty+1.25;};
      for(let i=0;i<seats.length;i++){
        const s=seats[i],p=positions[i],team=escort.get(s.id);
        const cheer=finale&&clock>=finale.exitAt&&!team?clock-finale.exitAt:-1;
        const joy=celebratingPlace(p,cheer),rise=joy.rise;
        if(visibleAt(p.x,p.z))window.drawExamMaterials(g,s,p.x,p.z,clock,team?smooth(0,.40,clock-team.caughtAt):rise,team?.caughtAt,level);
        if(team){
          if(clock>team.start+team.end)continue;
          const a=team.pose(clock),{t,pupil}=a;
          if(visibleAt(pupil.x,pupil.z))window.drawCandidate(g,s,pupil.x,pupil.z,clock,{level,standing:pupil.rise,walk:(t-team.depart)*9, facing:pupil.facing,struggle:a.grip,caughtAt:team.caughtAt,detail:detail(pupil.x,pupil.z)});
          if(t>=0)for(const o of a.officers)if(visibleAt(o.x,o.z))window.drawOfficer(g,o.x,o.z,clock,{...o,walk:t<.67?0:(t-.67)*9,level,detail:detail(o.x,o.z,2.55)});
          continue;
        }
        if(!visibleAt(joy.x,joy.z))continue;
        if(cheer>=0){
          const footprint=[];
          const wave=Math.max(0,Math.sin(Math.max(0,cheer-.72)*8.4+s.id*.91))*joy.step;
          for(let j=0;j<22;j++){const a=j*TAU/22;footprint.push([joy.x+(.29-.055*wave)*Math.cos(a),.014,joy.z+(.17-.035*wave)*Math.sin(a)]);}
          g.poly(footprint,'rgba(58,49,46,'+(.16-.055*wave)+')');
        }
        window.drawCandidate(g,s,joy.x,joy.z,clock,{level,view,standing:rise,joy:rise,leap:joy.step,beat:Math.max(0,cheer-.72)*8.4+s.id*.91,walk:0,facing:0,rearLens:rearLens(p),lensSide:Math.sign(camera.x-p.x),detail:detail(p.x,p.z)});
      }
      renderer.render(view,g.faces);dirty=false;
      if(finale&&!finale.done&&clock>=finale.exitAt+.80+2.20*finale.survivors.length){finale.done=true;events.onComplete?.();}
    }
    function step(now){
      if(destroyed||!room)return false;
      const realDt=last?Math.max(0,(now-last)/1000):0,dt=Math.min(.065,realDt);last=now;
      if(document.hidden)return false;
      const moving=active&&(strafe||forward);if(moving)walk(dt);else walkAmp*=Math.exp(-dt*10);
      const previousClock=clock;
      clock+=active||finale ? realDt : dt;
      for(const team of escort.values()){
        const impact=team.start+.32;
        if(previousClock<impact&&clock>=impact&&!Array.from(escort.values()).some(other=>other.start<team.start&&other.start+other.end+.7>impact))events.onKick?.();
      }
      if(!dirty&&!moving&&now-lastDraw<(active?1000/28:1000/18))return false;
      if(moving&&now-lastDraw<1000/40)return false;
      directCamera();view=getView();if(!finale)updateFocus();render();lastDraw=now;return true;
    }
    function look(dx,dy){
      if(!active||!Number.isFinite(dx)||!Number.isFinite(dy))return;
      const mult=2.65/Math.max(390,Math.min(800,view?.w||520));
      camera.yaw=(camera.yaw+dx*mult)%TAU;camera.pitch=clamp(camera.pitch-dy*mult*.82,-.95,.84);lockedId=null;dirty=true;
      view=getView();updateFocus();
    }
    function setActive(v){active=!!v;if(!active){strafe=0;forward=0;}last=0;dirty=true;}
    return {setRound,setActive,beginFinale,resetFrameClock(){last=0;},setZoom(on){zoom=on?2:1;dirty=true;view=getView();updateFocus();},setInput(s,f){strafe=clamp(Number(s)||0,-1,1);forward=clamp(Number(f)||0,-1,1);},
      look,step,sync,tap,directionToStudent,getTarget:()=>focus?{...focus}:null,getPose:()=>({...camera,y:1.60}),
      destroy(){destroyed=true;renderer?.destroy();}};
  }
  window.createPatrol=createPatrol;
})();
