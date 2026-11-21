// AR Filter Platform server — zero dependencies, Node 18+
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
const ROOT=__dirname,PUB=path.join(ROOT,'public'),UP=path.join(PUB,'uploads'),DATA=path.join(ROOT,'data'),DB=path.join(DATA,'filters.json'),QR=path.join(DATA,'qr'),AF=path.join(DATA,'admin.json');
[UP,DATA,QR].forEach(d=>fs.mkdirSync(d,{recursive:true}));
const MIME={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.gltf':'model/gltf+json'};
// ---- admin password (env ADMIN_PASSWORD, or generated on first run) ----
const hash=pw=>{const salt=crypto.randomBytes(16).toString('hex');return{salt,h:crypto.scryptSync(pw,salt,32).toString('hex')};};
let admin;
if(process.env.ADMIN_PASSWORD)admin=hash(process.env.ADMIN_PASSWORD);
else if(fs.existsSync(AF))admin=JSON.parse(fs.readFileSync(AF));
else{const pw=crypto.randomBytes(6).toString('hex');admin=hash(pw);fs.writeFileSync(AF,JSON.stringify(admin));console.log('\n*** FIRST RUN — admin password: '+pw+'  (set ADMIN_PASSWORD to choose your own) ***\n');}
const check=pw=>crypto.timingSafeEqual(crypto.scryptSync(pw,admin.salt,32),Buffer.from(admin.h,'hex'));
const sess=new Map(),tries=new Map();
const cookie=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split('=')).filter(a=>a[0]));
const authed=req=>(sess.get(cookie(req).sid)||0)>Date.now();
// ---- database (JSON file) ----
const seed=[{id:'tanoura',slug:'tanoura-khayamiya',name:'Tanoura Khayamiya Dancer',description:'A spinning Egyptian Tanoura dancer in a Khayamiya costume dances behind you.',type:'tanoura',preview:'/assets/tanoura/preview.png',asset:'',settings:{scale:.75},active:true,builtin:true,created:Date.now()}];
let filters=fs.existsSync(DB)?JSON.parse(fs.readFileSync(DB)):seed;
const saveDB=()=>{fs.writeFileSync(DB,JSON.stringify(filters,null,1));fs.writeFileSync(path.join(PUB,'filters.json'),JSON.stringify(filters.filter(f=>f.active)));};
saveDB();
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'filter';
const url=v=>typeof v==='string'&&/^\/(uploads|assets)\/[\w.\-\/]+$/.test(v)&&!v.includes('..')?v:'';
function clean(b,old={}){
  const S={},s=b.settings||{};for(const k of['scale','y','speed','spin','clip'])if(s[k]!==''&&isFinite(+s[k]))S[k]=+s[k];
  if(['auto','none','float','spin','pulse','sway'].includes(s.anim))S.anim=s.anim;
  return{name:String(b.name||old.name||'Untitled').slice(0,80),description:String(b.description??'').slice(0,300),type:old.builtin?old.type:(['overlay','model'].includes(b.type)?b.type:'overlay'),preview:url(b.preview),asset:old.builtin?'':url(b.asset),settings:S,active:!!b.active};
}
// ---- helpers ----
const send=(res,code,body,type='application/json',extra={})=>{res.writeHead(code,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store',...extra});res.end(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body));};
const body=(req,max=60e6)=>new Promise((ok,no)=>{const a=[];let n=0;req.on('data',c=>{n+=c.length;if(n>max){no(new Error('File too large (max 60 MB)'));req.destroy();}else a.push(c);});req.on('end',()=>ok(Buffer.concat(a)));req.on('error',no);});
const jbody=async req=>JSON.parse((await body(req,1e6)).toString()||'{}');
function file(res,f){fs.stat(f,(e,s)=>{if(e||!s.isFile())return send(res,404,'Not found','text/plain');
  const cache=/[\\\/](uploads|assets)[\\\/]/.test(f)?'public,max-age=604800':'no-cache';
  res.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream','Content-Length':s.size,'Cache-Control':cache,'X-Content-Type-Options':'nosniff'});fs.createReadStream(f).pipe(res);});}
// ---- zip writer ----
const T=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});
const crc=b=>{let c=~0;for(let i=0;i<b.length;i++)c=T[(c^b[i])&255]^(c>>>8);return ~c>>>0;};
function zip(files){const parts=[],cd=[];let off=0;
  for(const f of files){const nm=Buffer.from(f.name),d=zlib.deflateRawSync(f.data),c=crc(f.data);
    const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(0x21,12);h.writeUInt32LE(c,14);h.writeUInt32LE(d.length,18);h.writeUInt32LE(f.data.length,22);h.writeUInt16LE(nm.length,26);parts.push(h,nm,d);
    const e=Buffer.alloc(46);e.writeUInt32LE(0x02014b50,0);e.writeUInt16LE(20,4);e.writeUInt16LE(20,6);e.writeUInt16LE(0x800,8);e.writeUInt16LE(8,10);e.writeUInt16LE(0x21,14);e.writeUInt32LE(c,16);e.writeUInt32LE(d.length,20);e.writeUInt32LE(f.data.length,24);e.writeUInt16LE(nm.length,28);e.writeUInt32LE(off,42);cd.push(e,nm);off+=30+nm.length+d.length;}
  const cb=Buffer.concat(cd),en=Buffer.alloc(22);en.writeUInt32LE(0x06054b50,0);en.writeUInt16LE(files.length,8);en.writeUInt16LE(files.length,10);en.writeUInt32LE(cb.length,12);en.writeUInt32LE(off,16);return Buffer.concat([...parts,cb,en]);}
const walk=(d,base)=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name),base):[{name:path.relative(base,path.join(d,e.name)).split(path.sep).join('/'),data:fs.readFileSync(path.join(d,e.name))}]):[];
// ---- API ----
async function api(req,res,u,p){
  const m=req.method;
  if(p==='/api/filters'&&m==='GET')return send(res,200,filters.filter(f=>f.active));
  let r=p.match(/^\/api\/filters\/([\w-]+)$/);
  if(r&&m==='GET'){const f=filters.find(x=>x.slug===r[1]&&(x.active||authed(req)));return f?send(res,200,f):send(res,404,{error:'Filter not found'});}
  if(p==='/api/me')return send(res,200,{admin:authed(req)});
  if(p==='/api/logout'){sess.delete(cookie(req).sid);return send(res,200,{ok:1},undefined,{'Set-Cookie':'sid=; Path=/; Max-Age=0'});}
  if(p==='/api/login'&&m==='POST'){const ip=req.socket.remoteAddress,t=(tries.get(ip)||[]).filter(x=>x>Date.now()-6e5);
    if(t.length>=8)return send(res,429,{error:'Too many attempts. Try again in 10 minutes.'});
    const{password=''}=await jbody(req);if(!check(String(password))){t.push(Date.now());tries.set(ip,t);return send(res,401,{error:'Wrong password'});}
    const sid=crypto.randomBytes(24).toString('hex');sess.set(sid,Date.now()+6048e5);
    return send(res,200,{ok:1},undefined,{'Set-Cookie':`sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${req.headers['x-forwarded-proto']==='https'?'; Secure':''}`});}
  if(!p.startsWith('/api/admin/'))return send(res,404,{error:'Not found'});
  if(!authed(req))return send(res,401,{error:'Please sign in'});
  if(p==='/api/admin/filters'&&m==='GET')return send(res,200,filters);
  if(p==='/api/admin/filters'&&m==='POST'){const b=await jbody(req),c=clean(b);let s=slugify(c.name),n=2;const base=s;while(filters.some(f=>f.slug===s))s=base+'-'+n++;
    const f={id:crypto.randomUUID(),slug:s,...c,created:Date.now()};filters.push(f);saveDB();return send(res,200,f);}
  r=p.match(/^\/api\/admin\/filters\/([\w-]+)$/);
  if(r){const i=filters.findIndex(f=>f.id===r[1]);if(i<0)return send(res,404,{error:'Not found'});
    if(m==='PUT'){const o=filters[i];filters[i]={...o,...clean(await jbody(req),o)};saveDB();return send(res,200,filters[i]);}
    if(m==='DELETE'){const o=filters[i];if(o.builtin)return send(res,400,{error:'The Tanoura filter can be deactivated but not deleted.'});
      [o.preview,o.asset].forEach(x=>{if(x&&x.startsWith('/uploads/')&&!filters.some((f,j)=>j!==i&&(f.preview===x||f.asset===x)))fs.unlink(path.join(PUB,x),()=>{});});
      filters.splice(i,1);saveDB();return send(res,200,{ok:1});}}
  if(p==='/api/admin/upload'&&m==='POST'){const ext=path.extname(u.searchParams.get('name')||'').toLowerCase();
    if(!['.png','.jpg','.jpeg','.webp','.glb','.gltf'].includes(ext))return send(res,400,{error:'Allowed files: PNG, JPG, WEBP, GLB, GLTF'});
    const d=await body(req),n=crypto.randomBytes(10).toString('hex')+ext;fs.writeFileSync(path.join(UP,n),d);return send(res,200,{url:'/uploads/'+n});}
  if(p==='/api/admin/qr'&&m==='POST'){const n=u.searchParams.get('name')||'';if(!/^[\w-]+\.(png|svg)$/.test(n))return send(res,400,{error:'bad name'});fs.writeFileSync(path.join(QR,n),await body(req,5e6));return send(res,200,{ok:1});}
  if(p==='/api/admin/export'){saveDB();const files=[...['server.js','package.json','README.md'].filter(f=>fs.existsSync(path.join(ROOT,f))).map(f=>({name:f,data:fs.readFileSync(path.join(ROOT,f))})),
      ...walk(PUB,ROOT),{name:'data/filters.json',data:fs.readFileSync(DB)},...walk(QR,ROOT)];
    return send(res,200,zip(files),'application/zip',{'Content-Disposition':'attachment; filename="ar-filter-platform-'+new Date().toISOString().slice(0,10)+'.zip"'});}
  return send(res,404,{error:'Not found'});
}
http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://x'),p=decodeURIComponent(u.pathname);
  if(p.startsWith('/api/'))return await api(req,res,u,p);
  if(p==='/admin')return file(res,path.join(PUB,'admin.html'));
  if(p.startsWith('/f/'))return file(res,path.join(PUB,'filter.html'));
  const f=path.normalize(path.join(PUB,p.endsWith('/')?p+'index.html':p));
  if(!f.startsWith(PUB+path.sep))return send(res,404,'Not found','text/plain');file(res,f);
}catch(e){send(res,500,{error:e.message});}}).listen(process.env.PORT||3000,()=>console.log('AR platform running on port '+(process.env.PORT||3000)));
