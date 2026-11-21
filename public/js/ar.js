/* AR engine: Tanoura (original build), 2D transparent overlays, GLB/GLTF models. Usage: AR.start(filter) */
window.AR=(()=>{
const $=id=>document.getElementById(id);let st=null;
const loadTex=u=>new Promise((ok,no)=>new THREE.TextureLoader().load(u,t=>{t.encoding=THREE.sRGBEncoding;t.anisotropy=4;ok(t);},undefined,()=>no(new Error('Could not load image '+u))));
// ---- Tanoura dancer: unchanged from the original filter ----
async function tanoura(G,S){
  const sc=document.createElement('canvas');sc.width=sc.height=128;const sx=sc.getContext('2d'),gr=sx.createRadialGradient(64,64,4,64,64,64);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(.6,'rgba(0,0,0,.3)');gr.addColorStop(1,'rgba(0,0,0,0)');sx.fillStyle=gr;sx.fillRect(0,0,128,128);
  const sh=new THREE.Mesh(new THREE.PlaneGeometry(3.6,3.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.y=.01;G.add(sh);
  const base=await loadTex('/assets/tanoura/skirt.jpg'),tt=await loadTex('/assets/tanoura/torso.png');
  const sk=new THREE.Group();sk.position.y=.78;G.add(sk),skirts=[],rings=[];
  const prof=[[.26,.06],[.32,0],[.5,-.03],[.8,-.09],[1.1,-.19],[1.3,-.34],[1.36,-.5],[1.26,-.64]].map(p=>new THREE.Vector2(p[0],p[1]));
  [[1,0,1.4],[.76,.07,-2.1],[.52,.13,2.8]].forEach((l,i)=>{const t=base.clone();t.needsUpdate=true;t.wrapS=THREE.MirroredRepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;t.repeat.set(2,1);t.offset.x=i*.31;
    const g=new THREE.LatheGeometry(prof,96),m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({map:t,side:THREE.DoubleSide}));m.scale.setScalar(l[0]);m.position.y=l[1];m.userData={sp:l[2],orig:g.attributes.position.array.slice(),k:l[0]};sk.add(m);skirts.push(m);});
  const torso=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.24),new THREE.MeshBasicMaterial({map:tt,transparent:true,alphaTest:.04,side:THREE.DoubleSide}));G.add(torso);
  [[1.15,.86,0xff4fd8,2.6,.3],[1.45,.6,0xffc23a,2.2,-.4],[.95,1.1,0xffc23a,2,.6],[1.6,.45,0xff4fd8,2.8,-.7],[1.3,.95,0xff4fd8,1.8,.9],[1.05,.72,0xffd36a,2.4,-1.1]].forEach(r=>{
    const m=new THREE.Mesh(new THREE.TorusGeometry(r[0],.018,8,80,r[3]),new THREE.MeshBasicMaterial({color:r[2],transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));
    m.rotation.x=Math.PI/2+.12*Math.sign(r[4]);m.position.y=.78+r[1]*.35-.15;m.userData={sp:r[4]};G.add(m);rings.push(m);});
  return{basic:[torso.material],tick(t,X){const sp=t*5,bob=Math.sin(t*3.2)*.025;
    skirts.forEach((m,i)=>{m.rotation.y=t*m.userData.sp;const br=1+.05*Math.sin(t*2.4+i);m.scale.set(m.userData.k*br,1+.04*Math.sin(t*4.8+i),m.userData.k*br);
      if(i===0){const p=m.geometry.attributes.position,o=m.userData.orig;for(let v=0;v<p.count;v++){const x=o[v*3],y=o[v*3+1],z=o[v*3+2],w=Math.max(0,-y-.15)*1.6,a=Math.atan2(z,x),f=1+.07*w*Math.sin(6*a+sp);p.array[v*3]=x*f;p.array[v*3+2]=z*f;p.array[v*3+1]=y+.03*w*Math.sin(5*a-sp);}p.needsUpdate=true;}});
    rings.forEach(r=>{r.rotation.z=t*r.userData.sp*2.2;});
    torso.position.y=.84+.6+bob;torso.rotation.y=Math.atan2(X.cam.position.x-G.position.x,X.cam.position.z-G.position.z);torso.rotation.z=Math.sin(t*1.7)*.05;}};
}
let skirts=[],rings=[];
// ---- 2D transparent PNG/WEBP overlay ----
async function overlay(G,f,S){
  const t=await loadTex(f.asset),a=t.image.width/t.image.height,h=2.2,m=new THREE.Mesh(new THREE.PlaneGeometry(h*a,h),new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  const w=new THREE.Group();w.add(m);G.add(w);const sp=S.speed,an=S.anim==='auto'?'none':S.anim;
  return{basic:[m.material],tick(t,X){w.position.y=1.2+(an==='float'?.12*Math.sin(t*2*sp):0);const s=an==='pulse'?1+.08*Math.sin(t*3*sp):1;w.scale.set(s,s,s);
    w.rotation.y=Math.atan2(X.cam.position.x-G.position.x,X.cam.position.z-G.position.z)+(an==='spin'?t*sp*2:0);w.rotation.z=an==='sway'?.14*Math.sin(t*2*sp):0;}};
}
// ---- GLB / GLTF 3D model ----
async function model(G,f,S){
  if(!THREE.GLTFLoader)throw new Error('3D model loader failed to load. Check your connection.');
  const g=await new Promise((ok,no)=>new THREE.GLTFLoader().load(f.asset,ok,undefined,()=>no(new Error('Could not load the 3D model. Use a single-file .glb for best results.'))));
  const root=g.scene,box=new THREE.Box3().setFromObject(root),sz=box.getSize(new THREE.Vector3()),ct=box.getCenter(new THREE.Vector3()),k=2/Math.max(sz.x,sz.y,sz.z,1e-3);
  root.position.set(-ct.x,-box.min.y,-ct.z);const w=new THREE.Group();w.scale.setScalar(k);w.add(root);G.add(w);
  let mx=null;if(g.animations.length&&S.anim!=='none'){mx=new THREE.AnimationMixer(root);const c=S.clip>0&&g.animations[S.clip-1];(c?[c]:g.animations).forEach(a=>mx.clipAction(a).play());}
  const bob=S.anim==='float';
  return{basic:[],tick(t,X){if(mx)mx.update(X.dt);w.rotation.y=t*(S.spin||0)*Math.PI/180;w.position.y=bob?.1*Math.sin(t*2*S.speed):0;}};
}
async function start(f){
  if(st)return;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Camera is not available here. Open this page over HTTPS in Safari (iPhone) or Chrome (Android).');
  if(typeof THREE==='undefined')throw new Error('3D engine failed to load. Check your connection and reload.');
  try{if(window.DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission)await DeviceOrientationEvent.requestPermission();}catch(e){}
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});}
  catch(e){throw new Error(e.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser settings, then try again.':e.name==='NotFoundError'?'No camera was found on this device.':'Could not open the camera. Close other apps using it, and open this page directly in Safari or Chrome.');}
  const S=Object.assign({scale:.75,y:0,speed:1,spin:0,anim:f.type==='model'?'auto':'none',clip:0},f.settings||{});
  const video=$('vid'),out=$('out');video.srcObject=stream;
  const X=st={stream,video,out,raf:0,dt:0,yaw:0,cy:0,baseA:null,pos:{x:0,y:0},scl:S.scale,bright:1,rec:null,L:[]};
  const on=(t,e,fn,o)=>{t.addEventListener(e,fn,o);X.L.push([t,e,fn,o]);};
  try{await video.play();
    const r=X.r=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});r.outputEncoding=THREE.sRGBEncoding;
    const scene=new THREE.Scene(),cam=X.cam=new THREE.PerspectiveCamera(50,1,.1,50);cam.position.set(0,1.35,0);cam.rotation.order='YXZ';
    X.amb=new THREE.AmbientLight(0xffffff,.9);X.dir=new THREE.DirectionalLight(0xfff0dd,.8);X.dir.position.set(2,4,2);scene.add(X.amb,X.dir);
    const G=X.G=new THREE.Group();scene.add(G);skirts=[];rings=[];
    X.c=await(f.type==='tanoura'?tanoura(G,S):f.type==='model'?model(G,f,S):overlay(G,f,S));
    $('size').value=Math.round(S.scale*100);$('hint').hidden=false;$('ar').hidden=false;
    const P=document.createElement('canvas');P.width=P.height=8;const px=P.getContext('2d');let lastL=0,t0=performance.now(),last=t0;
    const resize=()=>{const d=Math.min(devicePixelRatio||1,2),s=Math.min(d,1080/innerWidth);X.W=(innerWidth*s)&~1;X.H=(innerHeight*s)&~1;out.width=X.W;out.height=X.H;X.ctx=out.getContext('2d');r.setPixelRatio(1);r.setSize(X.W,X.H,false);cam.aspect=X.W/X.H;cam.updateProjectionMatrix();};
    resize();on(window,'resize',resize);
    on(window,'deviceorientation',e=>{if(e.alpha==null)return;if(X.baseA==null)X.baseA=e.alpha;X.yaw=((e.alpha-X.baseA+540)%360)-180;});
    const ptr=new Map();let pd=0;
    on(out,'pointerdown',e=>{out.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});$('hint').hidden=true;});
    on(out,'pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;
      if(ptr.size===2){ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});const [a,b]=[...ptr.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pd)X.scl=Math.max(.3,Math.min(1.6,X.scl*d/pd));pd=d;$('size').value=Math.round(X.scl*100);return;}
      X.pos.x+=(e.clientX-p.x)/innerWidth*3;X.pos.y-=(e.clientY-p.y)/innerHeight*3;ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});});
    const up=e=>{ptr.delete(e.pointerId);pd=0;};on(out,'pointerup',up);on(out,'pointercancel',up);
    on($('size'),'input',e=>X.scl=e.target.value/100);
    on($('close'),'click',()=>stop());on($('home'),'click',()=>{stop();location.href='/';});on(window,'pagehide',()=>stop());
    on(document,'visibilitychange',()=>{if(document.hidden&&X.rec)stopRec();});
    on($('snap'),'click',()=>out.toBlob(b=>preview(b,'ar-selfie.png',false),'image/png'));on($('rec'),'click',toggleRec);
    on($('pclose'),'click',closePrev);on($('psave'),'click',()=>dl(X.pb,X.pn));on($('pshare'),'click',share);
    const loop=ms=>{X.raf=requestAnimationFrame(loop);const t=(ms-t0)/1e3;X.dt=Math.min((ms-last)/1e3,.1);last=ms;
      if(t-lastL>.4&&video.readyState>1){lastL=t;px.drawImage(video,0,0,8,8);const d=px.getImageData(0,0,8,8).data;let R=0,Gc=0,B=0;for(let i=0;i<d.length;i+=4){R+=d[i];Gc+=d[i+1];B+=d[i+2];}const n=d.length/4*255;R/=n;Gc/=n;B/=n;const b=Math.max((R+Gc+B)/3,.05),c=new THREE.Color(.6+.4*R/b,.6+.4*Gc/b,.6+.4*B/b);
        X.amb.color.copy(c);X.amb.intensity=.45+.9*b;X.dir.intensity=.3+.7*b;const k=.55+.45*b;X.c.basic.forEach(m=>m.color.setRGB(k*c.r,k*c.g,k*c.b));}
      X.cy+=(Math.max(-40,Math.min(40,X.yaw))-X.cy)*.1;cam.rotation.set(-.12,-X.cy*Math.PI/180,0);
      G.position.set(X.pos.x,X.pos.y-.2+S.y*.5,-4.6);G.scale.setScalar(X.scl);X.c.tick(t,X);r.render(scene,cam);
      const vw=video.videoWidth||1280,vh=video.videoHeight||720,s=Math.max(X.W/vw,X.H/vh),c2=X.ctx;
      c2.save();c2.translate(X.W,0);c2.scale(-1,1);c2.drawImage(video,(X.W-vw*s)/2,(X.H-vh*s)/2,vw*s,vh*s);c2.restore();c2.drawImage(r.domElement,0,0,X.W,X.H);};
    X.raf=requestAnimationFrame(loop);
  }catch(e){stop();throw e;}
}
function preview(b,n,vid){const X=st;if(!X)return;X.pb=b;X.pn=n;const u=URL.createObjectURL(b);$('pbox').innerHTML=vid?'<video controls autoplay loop muted playsinline src="'+u+'"></video>':'<img alt="Your result" src="'+u+'">';$('prev').hidden=false;}
function closePrev(){$('prev').hidden=true;$('pbox').innerHTML='';}
async function share(){const X=st;if(!X)return;const fl=new File([X.pb],X.pn,{type:X.pb.type});try{if(navigator.canShare&&navigator.canShare({files:[fl]}))await navigator.share({files:[fl]});else dl(X.pb,X.pn);}catch(e){}}
function stopRec(){const X=st;if(X&&X.rec&&X.rec.state==='recording')X.rec.stop();}
function toggleRec(){const X=st,btn=$('rec');if(X.rec&&X.rec.state==='recording')return X.rec.stop();
  if(!window.MediaRecorder||!X.out.captureStream)return alert('Video recording is not supported on this browser. Please update iOS/Android or use Chrome/Safari.');
  const mt=['video/mp4','video/webm;codecs=vp9','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))||'',ch=[];
  const rc=X.rec=new MediaRecorder(X.out.captureStream(30),mt?{mimeType:mt,videoBitsPerSecond:5e6}:{});
  rc.ondataavailable=e=>e.data.size&&ch.push(e.data);
  rc.onstop=()=>{clearTimeout(X.rt);btn.classList.remove('on');btn.textContent='●';const type=rc.mimeType||'video/webm';if(st)preview(new Blob(ch,{type}),'ar-video.'+(type.includes('mp4')?'mp4':'webm'),true);};
  rc.start();btn.classList.add('on');btn.textContent='■';X.rt=setTimeout(stopRec,30000);}
function stop(){const X=st;if(!X)return;st=null;cancelAnimationFrame(X.raf);clearTimeout(X.rt);
  try{if(X.rec&&X.rec.state==='recording')X.rec.stop();}catch(e){}
  X.stream.getTracks().forEach(t=>t.stop());X.video.srcObject=null;X.L.forEach(([t,e,fn,o])=>t.removeEventListener(e,fn,o));
  if(X.r){X.r.dispose();X.r.forceContextLoss();}closePrev();$('ar').hidden=true;}
return{start,stop};
})();
