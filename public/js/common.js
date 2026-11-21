const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function loadFilters(){try{const r=await fetch('/api/filters');if(!r.ok)throw 0;return await r.json();}catch(e){return await (await fetch('/filters.json')).json();}}
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4e3);}
function qrObj(u){const q=qrcode(0,'H');q.addData(u);q.make();return q;}
const qrSVG=u=>qrObj(u).createSvgTag(10,4);
function qrPNG(u,px=2048){const q=qrObj(u),n=q.getModuleCount(),m=4,cell=Math.max(1,Math.floor(px/(n+2*m))),s=cell*(n+2*m),cv=document.createElement('canvas');cv.width=cv.height=s;const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,s,s);x.fillStyle='#0b1038';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))x.fillRect((c+m)*cell,(r+m)*cell,cell,cell);return cv;}
function qrPrint(u,title){const w=window.open('','_blank');if(!w)return alert('Allow pop-ups to print.');w.document.write('<title>'+esc(title)+'</title><body style="font-family:Georgia;text-align:center;padding:40px"><h1>'+esc(title)+'</h1><div style="width:420px;margin:auto">'+qrSVG(u)+'</div><p>Scan with your phone camera</p><p style="color:#555;word-break:break-all">'+esc(u)+'</p><script>onload=()=>print()<\/script>');w.document.close();}
function qrCard(el,u,name){
  el.innerHTML='<div class="qrbox">'+qrSVG(u)+'</div><div class="qrurl">'+esc(u)+'</div><div class="row"><button class="sm" data-a="png">PNG (hi-res)</button><button class="sm" data-a="svg">SVG</button><button class="sm alt" data-a="print">Print</button></div>';
  el.onclick=e=>{const a=e.target.dataset&&e.target.dataset.a;if(a==='png')qrPNG(u).toBlob(b=>dl(b,'qr-'+name+'.png'));if(a==='svg')dl(new Blob([qrSVG(u)],{type:'image/svg+xml'}),'qr-'+name+'.svg');if(a==='print')qrPrint(u,name);};
}
