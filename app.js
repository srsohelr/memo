import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import{getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,createUserWithEmailAndPassword,sendPasswordResetEmail}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import{initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,doc,getDoc,setDoc,onSnapshot,writeBatch,increment}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import{I18N}from'./i18n.js';

const FB={apiKey:"AIzaSyAgdFETZbQl2ZtITMLXUNGqKLqHKPiaktc",authDomain:"memo-bb729.firebaseapp.com",projectId:"memo-bb729",storageBucket:"memo-bb729.firebasestorage.app",messagingSenderId:"189375964705",appId:"1:189375964705:web:756a542e63adaf3aac2560",measurementId:"G-C3XFE12SMH"};
const app=initializeApp(FB),auth2=getAuth(initializeApp(FB,"sec")); // auth2: নতুন ইউজার বানানোর সময় মালিক যাতে লগআউট না হন
const auth=getAuth(app),db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
const SHOP_M='01711472098',SHOP_E='jepdimla98@gmail.com';

/* ---------- ভাষা ও থিম ---------- */
let lang=localStorage.getItem('jp_lang')||'bn';
const t=(k,v)=>{let s=I18N[lang]?.[k]??I18N.bn[k]??k;if(v)for(const x in v)s=s.split('{'+x+'}').join(v[x]);return s};
const setTheme=d=>{document.documentElement.dataset.theme=d?'dark':'light';localStorage.setItem('jp_theme',d?'dark':'light');const m=document.querySelector('meta[name=theme-color]');if(m)m.content=d?'#1e1b4b':'#4f46e5'};
const isDark=()=>document.documentElement.dataset.theme==='dark';

/* ---------- অবস্থা ---------- */
let user,role,products=[],costs={},customers=[],memos=[],stockLogs=[],acct=[],users=[],tab='sale',pending=false,editId=null,unsubs=[];
let S={sellerPriceEdit:false,sellerMaxDiscount:0};
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r2=n=>Math.round(((+n||0)+Number.EPSILON)*100)/100,money=n=>r2(n).toFixed(2),isOwner=()=>role==='owner';
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const ymd=d=>{if(!d)return'';const s=String(d);if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);const p=Date.parse(s);return isNaN(p)?'':new Date(p-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const newNo=()=>today().slice(2).replace(/-/g,'')+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
const enc=encodeURIComponent,mref=no=>doc(db,'memos',enc(no)),uid8=()=>Date.now()+Math.random().toString(36).slice(2,6);
const toast=m=>{const e=document.createElement('div');e.className='toast';e.textContent=m;document.body.append(e);setTimeout(()=>e.remove(),2500)};
const findProd=(desc,pid)=>(pid&&products.find(x=>x.id===pid))||products.find(x=>norm(x.description)===norm(desc));
const dAmt=m=>m.discountAmount!=null?+m.discountAmount:r2((+m.subTotal||0)-(+m.grandTotal||0));
const inRange=(d,f,to)=>{if(!f&&!to)return true;const x=ymd(d);return!!x&&(!f||x>=f)&&(!to||x<=to)};
const shop=()=>({n:t('shopName'),a:t('shopAddr')});

/* ---------- সার্ভিস ওয়ার্কার ও আপডেট ---------- */
if('serviceWorker'in navigator){
  const had=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg=>{
    const chk=w=>{if(w&&navigator.serviceWorker.controller)showUpdate(w)};chk(reg.waiting);
    reg.addEventListener('updatefound',()=>{const w=reg.installing;w&&w.addEventListener('statechange',()=>{if(w.state==='installed')chk(w)})});
    setInterval(()=>reg.update().catch(()=>{}),36e5)});
  let rl=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(rl||!had)return;rl=true;location.reload()});
}
function showUpdate(w){if($('#upd'))return;const d=document.createElement('div');d.id='upd';d.innerHTML=`<span>${t('newVer')}</span> <button class=b1>${t('updateNow')}</button>`;document.body.prepend(d);d.querySelector('button').onclick=()=>w.postMessage({type:'SKIP_WAITING'})}

/* ---------- লগইন / শুরু ---------- */
onAuthStateChanged(auth,async u=>{
  unsubs.forEach(f=>f());unsubs=[];products=[];costs={};customers=[];memos=[];stockLogs=[];acct=[];users=[];
  user=u;if(!u)return loginView();
  try{const s=await getDoc(doc(db,'users',u.uid));role=s.exists()?s.data().role:null}catch(e){role=null}
  if(!['owner','seller'].includes(role))return noRole();
  listen();shell();show('sale');
});
function topTools(){return`<button id=lg title="${t('language')}">${lang==='bn'?'EN':'বাং'}</button><button id=th title="${t('theme')}">${isDark()?'☀️':'🌙'}</button>`}
function bindTools(){$('#lg').onclick=()=>{lang=lang==='bn'?'en':'bn';localStorage.setItem('jp_lang',lang);document.documentElement.lang=lang;user?(shell(),show(tab)):loginView()};$('#th').onclick=()=>{setTheme(!isDark());$('#th').textContent=isDark()?'☀️':'🌙'}}
function loginView(){document.title=t('shopName');$('#app').innerHTML=`<div class="login-tools">${topTools()}</div><div class="card login"><h2>${t('shopName')}</h2><label>${t('email')}<input id=em type=email></label><br><label>${t('password')}<input id=pw type=password></label><p id=er class=err></p><button class=b3 id=li>${t('login')}</button></div>`;bindTools();
  $('#li').onclick=()=>signInWithEmailAndPassword(auth,$('#em').value.trim(),$('#pw').value).catch(()=>$('#er').textContent=t('loginFail'))}
function noRole(){$('#app').innerHTML=`<div class="card login"><h3>${t('noRole')}</h3><p>${t('giveUid')}</p><input readonly value="${esc(user.uid)}"><br><br><button class=b2 id=out>${t('logout')}</button></div>`;$('#out').onclick=()=>signOut(auth)}
function listen(){
  const L=(q,f,o)=>unsubs.push(onSnapshot(q,o||{},f,e=>console.warn(e.message)));
  L(collection(db,'products'),s=>{products=s.docs.map(d=>({id:d.id,...d.data()}));pending=s.metadata.hasPendingWrites;changed()},{includeMetadataChanges:true});
  L(collection(db,'customers'),s=>{customers=s.docs.map(d=>d.data());changed()});
  L(doc(db,'settings','app'),s=>{S={sellerPriceEdit:false,sellerMaxDiscount:0,...(s.exists()?s.data():{})};changed(true)});
  if(isOwner()){
    L(collection(db,'memos'),s=>{memos=s.docs.map(d=>d.data());changed()});
    L(collection(db,'costs'),s=>{costs={};s.docs.forEach(d=>costs[d.id]=+d.data().purchaseRate||0)});
    L(collection(db,'stockLog'),s=>{stockLogs=s.docs.map(d=>d.data());changed()});
    L(collection(db,'accounting'),s=>{acct=s.docs.map(d=>({id:d.id,...d.data()}));changed()});
    L(collection(db,'users'),s=>{users=s.docs.map(d=>({id:d.id,...d.data()}));changed()});
  }
}
const LIGHT={prod:()=>plist(),hist:()=>hl(),dash:()=>dashView(),due:()=>dueList(),acct:()=>acctRep(),stock:()=>stockRes(),set:()=>empList()};
function changed(sale){fillLists();badge();if(tab==='sale'){if(sale&&!editingMemo)updRateLock();return}LIGHT[tab]&&LIGHT[tab]()}
function badge(){const e=$('#sync');if(e)e.textContent=!navigator.onLine?t('offline'):pending?t('syncWait'):t('synced')}
addEventListener('online',badge);addEventListener('offline',badge);
function fillLists(){const a=$('#pl'),b=$('#cl'),c=$('#catl');if(a)a.innerHTML=products.map(p=>`<option value="${esc(p.description)}">`).join('');if(b)b.innerHTML=customers.map(c=>`<option value="${esc(c.name)}">`).join('');
  if(c)c.innerHTML=[...new Set(acct.map(x=>String(x.expenseCategory||'').trim()).filter(Boolean))].map(x=>`<option value="${esc(x)}">`).join('')}
function shell(){document.title=t('shopName');
  const tb=[['sale','🧾',t('tSale')]];if(isOwner())tb.push(['prod','📦',t('tProd')],['hist','🗂',t('tHist')],['due','💰',t('tDue')],['acct','📒',t('tAcct')],['rep','📈',t('tRep')],['stock','📋',t('tStock')],['dash','📊',t('tDash')],['set','⚙️',t('tSet')],['data','💾',t('tData')]);
  $('#app').innerHTML=`<header><img src=logo.jpg alt=""><b>${t('shopName')}</b><span id=sync></span>${topTools()}<button id=out>${t('logout')}</button></header><nav>${tb.map(([k,i,l])=>`<button data-t=${k}>${i} ${l}</button>`).join('')}</nav><main id=main></main><datalist id=pl></datalist><datalist id=cl></datalist><datalist id=catl></datalist>`;
  $('#out').onclick=()=>signOut(auth);bindTools();badge();fillLists()}
document.addEventListener('click',e=>{const x=e.target.closest('[data-t]');if(x)show(x.dataset.t)});
let editingMemo=null;
function show(k){if(k!=='sale'&&!isOwner())k='sale';tab=k;editingMemo=null;
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===k));
  ({sale:()=>saleView(),prod:prodView,hist:histView,due:dueView,acct:acctView,rep:repView,stock:stockView,dash:dashView,set:setView,data:dataView})[k]();fillLists();
  const on=document.querySelector('nav button.on');on&&on.scrollIntoView?.({block:'nearest',inline:'center'})}

/* ---------- মডাল ---------- */
function modal(html){closeModal();const d=document.createElement('div');d.id='modal';d.innerHTML=`<div class=mbox>${html}<div class=act><button class=b2 id=mc>${t('close')}</button></div></div>`;document.body.append(d);$('#mc').onclick=closeModal;d.onclick=e=>{if(e.target===d)closeModal()};return d}
function closeModal(){$('#modal')?.remove()}

/* ---------- বিক্রয় / মেমো ফর্ম ---------- */
const maxDisc=()=>isOwner()?100:(+S.sellerMaxDiscount||0),canPrice=()=>isOwner()||!!S.sellerPriceEdit;
function saleView(m){const o=isOwner(),ed=!!m;editingMemo=m||null;
  const dty=m?(m.discountType||'pct'):'pct',dv=m?(m.discountValue??m.discount??0):0,md=maxDisc();
  $('#main').innerHTML=`${ed?`<div class="card warn">✏️ ${t('editing')}: <b>${esc(m.memoNo)}</b> <button class=b2 id=cx>${t('cancel')}</button></div>`:''}
  <div class=card><div class=g><label>${t('memoNo')}<input id=no readonly value="${esc(m?m.memoNo:newNo())}"></label><label>${t('date')}<input type=date id=dt value="${esc(m?(ymd(m.date)||today()):today())}"></label><label>${t('custName')}<input id=cn list=cl autocomplete=off value="${esc(m?.customerName||'')}"></label><label>${t('mobile')}<input id=cm type=tel value="${esc(m?.customerMobile||'')}"></label><label class=w>${t('address')}<input id=ca value="${esc(m?.customerAddress||'')}"></label></div></div>
  <div class=card><div id=rows></div><button class=b2 id=add>＋ ${t('addProd')}</button>
  <div class=g style="margin-top:12px">${md>0?`<label>${t('discType')}<select id=dty><option value=pct ${dty==='pct'?'selected':''}>% ${t('percent')}</option><option value=flat ${dty==='flat'?'selected':''}>৳ ${t('flat')}</option></select></label><label>${t('discount')}${o?'':` <small>(${t('max')} ${md}%)</small>`}<input id=ds type=number min=0 step=any value="${esc(dv)}"></label>`:''}<label>${t('paid')}<input id=pd type=number min=0 step=any value="${esc(m?m.paidAmount:0)}"></label></div>
  <p class=tot>${t('subTotal')}: <b id=st>0.00</b><br>${t('discount')}: <b id=da>0.00</b><br>${t('grandTotal')}: <b id=gt>0.00</b><br>${t('due')}: <b id=du>0.00</b> <span id=bk></span><br><span id=dw class=err></span></p>
  <div class=act><button class=b1 id=sv>${ed?t('saveChanges'):t('save')}</button><button class=b3 id=sp>${ed?t('saveChangesPrint'):t('saveprint')}</button><button class=b2 id=rs>${ed?t('cancel'):t('reset')}</button></div></div>`;
  if(m)(m.products||[]).forEach(i=>addRow(i,true));else addRow();
  $('#add').onclick=()=>addRow();$('#rs').onclick=()=>ed?show('hist'):saleView();$('#cx')&&($('#cx').onclick=()=>show('hist'));
  $('#sv').onclick=()=>save(false);$('#sp').onclick=()=>save(true);
  $('#pd').oninput=calc;$('#ds')&&($('#ds').oninput=calc);$('#dty')&&($('#dty').onchange=calc);
  $('#cn').onchange=()=>{const c=customers.find(x=>x.name===$('#cn').value.trim());if(c){$('#cm').value=c.mobile||'';$('#ca').value=c.address||''}};
  $('#rows').addEventListener('input',e=>{const d=e.target.closest('.row');if(!d)return;const pr=findProd(d.querySelector('.p').value,'');
    if(e.target.classList.contains('p')){d.dataset.pid=pr?pr.id:'';if(pr)d.querySelector('.r').value=pr.sellingRate||0}
    d.querySelector('.h').textContent=pr?t('stockIs',{n:pr.currentStock||0}):'';calc()});
  $('#rows').addEventListener('click',e=>{if(e.target.classList.contains('x')){e.target.closest('.row').remove();calc()}});
  calc()}
function updRateLock(){document.querySelectorAll('#rows .r').forEach(i=>i.readOnly=!canPrice())}
function addRow(it,orig){const d=document.createElement('div');d.className='row';
  if(it){d.dataset.pid=it.pid||'';if(orig){d.dataset.orig='1';d.dataset.od=it.description||''}}
  d.innerHTML=`<input class=p list=pl placeholder="${esc(t('pickProd'))}" value="${esc(it?.description||'')}"><input class=q type=number min=0 step=any value="${esc(it?.quantity??1)}"><input class=r type=number min=0 step=any value="${esc(it?.rate??0)}" ${canPrice()?'':'readonly'}><span class=a>0.00</span><button class=x>✕</button><small class=h></small>`;
  $('#rows').append(d);if(it){const pr=findProd(it.description,it.pid);d.querySelector('.h').textContent=pr?t('stockIs',{n:pr.currentStock||0}):''}}
function discOf(st,ty,dv){return ty==='pct'?r2(st*Math.min(100,Math.max(0,dv))/100):Math.min(r2(Math.max(0,dv)),r2(st))}
function calc(){let st=0;document.querySelectorAll('#rows .row').forEach(d=>{const a=r2((+d.querySelector('.q').value||0)*(+d.querySelector('.r').value||0));d.querySelector('.a').textContent=money(a);st+=a});st=r2(st);
  const ty=$('#dty')?.value||'pct',dv=+$('#ds')?.value||0,da=$('#ds')?discOf(st,ty,dv):0,gt=r2(st-da),pd=Math.max(0,+$('#pd').value||0);
  $('#st').textContent=money(st);$('#da').textContent=money(da);$('#gt').textContent=money(gt);$('#du').textContent=money(Math.max(0,gt-pd));$('#bk').textContent=pd>gt?`(${t('refund')} ${money(pd-gt)})`:'';
  const bad=!isOwner()&&st>0&&da>r2(st*maxDisc()/100)+0.005;$('#dw').textContent=bad?t('discOver',{n:maxDisc()}):'';
  return{st,ty,dv,da,gt,pd,bad}}
function gather(){
  const c=calc(),items=[],ed=editingMemo;
  if(c.bad)return alert(t('discOver',{n:maxDisc()})),null;
  for(const d of document.querySelectorAll('#rows .row')){const n=d.querySelector('.p').value.trim();if(!n)continue;
    const pr=findProd(n,d.dataset.pid),q=+d.querySelector('.q').value||0;let rt=+d.querySelector('.r').value||0;
    const keep=!pr&&ed&&d.dataset.orig==='1'&&d.dataset.od===n;
    if(!pr&&!keep)return alert(t('notInList',{n})),null;if(q<=0)return alert(t('qtyReq')),null;
    if(pr&&!canPrice())rt=+pr.sellingRate||0;
    const it={slNo:items.length+1,description:n,quantity:q,rate:rt,amount:r2(q*rt)};if(pr)it.pid=pr.id;items.push(it)}
  if(!items.length)return alert(t('oneProd')),null;
  const need={};items.forEach(i=>{if(i.pid)need[i.pid]=(need[i.pid]||0)+i.quantity});
  const old=ed?needOf(ed):{};
  for(const k in need){const p=products.find(x=>x.id===k),av=(p.currentStock||0)+(old[k]||0);if(need[k]>av)return alert(t('stockOnly',{n:p.description,s:av})),null}
  return{items,need,c}}
function needOf(m){const n={};(m.products||[]).forEach(i=>{const p=findProd(i.description,i.pid);if(p)n[p.id]=(n[p.id]||0)+(+i.quantity||0)});return n}
function save(print){
  const g=gather();if(!g)return;const{items,need,c}=g,ed=editingMemo,cn=$('#cn').value.trim(),no=$('#no').value,date=$('#dt').value||today(),now=Date.now();
  const gt=c.gt,paid=r2(Math.min(c.pd,gt)),f={memoNo:no,date,customerName:cn,customerAddress:$('#ca').value.trim(),customerMobile:$('#cm').value.trim(),products:items,subTotal:c.st,
    discount:c.ty==='pct'?r2(Math.min(100,c.dv)):(c.st?r2(c.da*100/c.st):0),discountType:c.ty,discountValue:r2(c.dv),discountAmount:c.da,grandTotal:gt,paidAmount:paid,dueAmount:Math.max(0,r2(gt-c.pd))};
  const b=writeBatch(db);let m;
  if(!ed){m={...f,createdBy:user.uid,createdAt:now};b.set(mref(no),m);
    for(const k in need){b.update(doc(db,'products',k),{currentStock:increment(-need[k])});b.set(doc(db,'stockLog',`out_${enc(no)}_${k}`),{productId:k,date,type:'out',quantity:need[k],memoNo:no,reason:'sale',by:user.uid,createdAt:now})}
  }else{
    m={...ed,...f,updatedAt:now,updatedBy:user.uid};b.set(mref(no),m);
    const old=needOf(ed),ids=new Set([...Object.keys(old),...Object.keys(need)]);
    ids.forEach(k=>{const df=(old[k]||0)-(need[k]||0);if(!df)return;b.update(doc(db,'products',k),{currentStock:increment(df)});
      b.set(doc(db,'stockLog',`edit${now}_${enc(no)}_${k}`),{productId:k,date:today(),type:df>0?'in':'out',quantity:Math.abs(df),memoNo:no,reason:'memo-edit',by:user.uid,createdAt:now})});
    b.set(doc(db,'memoLog',`edit${now}_${enc(no)}`),{action:'edit',memoNo:no,at:now,by:user.uid,byEmail:user.email||'',before:ed,after:m});
  }
  if(cn&&(isOwner()||!customers.some(x=>x.name===cn)))b.set(doc(db,'customers',enc(cn)),{name:cn,address:f.customerAddress,mobile:f.customerMobile},{merge:true});
  b.commit().catch(e=>alert(t('syncFail')+e.message));
  toast(ed?t('editSaved'):navigator.onLine?t('saved'):t('savedOffline'));
  if(print)printMemo(m,fmtPref());
  ed?show('hist'):saleView()}

/* ---------- প্রিন্ট ও PDF ---------- */
const fmtPref=()=>localStorage.getItem('jp_fmt')||'a4',PAGES={a4:'@page{size:A4;margin:10mm}',f80:'@page{size:80mm auto;margin:2mm}',f58:'@page{size:58mm auto;margin:1mm}'};
function memoHTML(m,fmt){const s=shop(),da=dAmt(m),pct=m.discountType==='flat'?'':(m.discount?` (${m.discount}%)`:'');
  return`<div class="mm ${fmt}"><div class=mh><img src=logo.jpg alt=""><h2>${esc(s.n)}</h2><div>${esc(s.a)}</div><div>${t('mobile')}: ${SHOP_M}${fmt==='f58'?'':' | '+SHOP_E}</div></div>
  <p>${t('memoNo')}: ${esc(m.memoNo)} &nbsp; ${t('date')}: ${esc(ymd(m.date)||m.date)}<br>${t('customer')}: ${esc(m.customerName)} ${esc(m.customerMobile)}<br>${esc(m.customerAddress)}</p>
  <table><tr><th>${t('sl')}<th>${t('desc')}<th>${t('qty')}<th>${t('rate')}<th>${t('amount')}</tr>${(m.products||[]).map((i,n)=>`<tr><td>${n+1}<td>${esc(i.description)}<td>${esc(i.quantity)}<td>${money(i.rate)}<td>${money(i.amount)}`).join('')}</table>
  <p class=tr>${t('subTotal')}: ${money(m.subTotal)}<br>${t('discount')}: ${money(da)}${pct}<br><b>${t('grandTotal')}: ${money(m.grandTotal)}</b><br>${t('paid')}: ${money(m.paidAmount)}<br>${t('due')}: ${money(m.dueAmount)}</p>
  <div class=sg><span>${t('custSign')}</span><span>${t('sellerSign')}</span></div></div>`}
function printHTML(html,fmt){$('#pgstyle').textContent=PAGES[fmt||'a4'];$('#print').innerHTML=html;setTimeout(()=>window.print(),250)}
function printMemo(m,fmt){printHTML(memoHTML(m,fmt),fmt)}
const libs={};function loadLib(src){return libs[src]||(libs[src]=new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>{delete libs[src];no(new Error('lib'))};document.head.append(s)}))}
async function memoPDF(m,fmt){
  try{await loadLib('lib/html2canvas.min.js');await loadLib('lib/jspdf.umd.min.js')}catch(e){return alert(t('pdfLibFail'))}
  const W={a4:794,f80:302,f58:219}[fmt],h=document.createElement('div');h.className='pdfhost';h.style.width=W+'px';h.innerHTML=memoHTML(m,fmt);document.body.append(h);
  try{await Promise.all([...h.querySelectorAll('img')].map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r})));
    const cv=await html2canvas(h,{scale:2,backgroundColor:'#fff'}),img=cv.toDataURL('image/jpeg',.92),{jsPDF}=window.jspdf,mm=fmt==='a4'?210:fmt==='f80'?80:58,ih=cv.height*mm/cv.width;let pdf;
    if(fmt==='a4'){pdf=new jsPDF({unit:'mm',format:'a4'});for(let p=0;p*297<ih;p++){if(p)pdf.addPage();pdf.addImage(img,'JPEG',0,-p*297,210,ih)}}
    else{pdf=new jsPDF({unit:'mm',format:[mm,Math.max(ih,20)],orientation:'p'});pdf.addImage(img,'JPEG',0,0,mm,ih)}
    pdf.save('memo-'+String(m.memoNo).replace(/[^\w-]/g,'_')+'.pdf')}catch(e){alert(t('pdfFail')+e.message)}finally{h.remove()}}
function memoOut(no){const m=memos.find(x=>x.memoNo===no);if(!m)return;
  const d=modal(`<h3>${t('printPdf')}: ${esc(no)}</h3><label>${t('paperSize')}<select id=pf><option value=a4>A4</option><option value=f80>${t('thermal')} 80mm</option><option value=f58>${t('thermal')} 58mm</option></select></label><div class=act><button class=b3 id=mp>🖨 ${t('print')}</button><button class=b1 id=md>⬇ ${t('pdfDl')}</button></div>`);
  $('#pf').value=fmtPref();$('#pf').onchange=()=>localStorage.setItem('jp_fmt',$('#pf').value);
  $('#mp').onclick=()=>{closeModal();printMemo(m,$('#pf').value)};$('#md').onclick=async()=>{$('#md').disabled=true;await memoPDF(m,$('#pf').value);closeModal()}}

/* ---------- পণ্য ---------- */
function prodView(){editId=null;
  $('#main').innerHTML=`<div class=card><h3>${t('prodAddEdit')}</h3><div class=g><label>${t('desc')}<input id=pn></label><label>${t('sellRate')}<input id=ps type=number step=any></label><label>${t('buyRateHint')}<input id=pb type=number step=any></label><label>${t('stockAdd')}<input id=pk type=number step=any value=0></label></div><div class=act><button class=b1 id=psv>${t('saveBtn')}</button><button class=b2 id=pcl>${t('newBtn')}</button></div></div>
  <div class=card><input id=q placeholder="${esc(t('search'))}"><div id=plist></div></div>`;
  $('#q').oninput=plist;$('#pcl').onclick=prodView;plist();
  $('#plist').onclick=e=>{const p=products.find(x=>x.id===e.target.dataset.e);if(!p)return;editId=p.id;$('#pn').value=p.description;$('#ps').value=p.sellingRate||0;$('#pk').value=0;$('#pb').value='';scrollTo(0,0)};
  $('#psv').onclick=()=>{const n=$('#pn').value.trim();if(!n)return alert(t('descReq'));const id=editId||'p'+Date.now(),add=+$('#pk').value||0;
    if(products.some(p=>norm(p.description)===norm(n)&&p.id!==id))return alert(t('prodExists'));
    const b=writeBatch(db);b.set(doc(db,'products',id),{description:n,sellingRate:+$('#ps').value||0,currentStock:increment(add)},{merge:true});
    if($('#pb').value!=='')b.set(doc(db,'costs',id),{purchaseRate:+$('#pb').value},{merge:true});
    if(add)b.set(doc(db,'stockLog',`adj${uid8()}_${id}`),{productId:id,date:today(),type:add>0?'in':'out',quantity:Math.abs(add),memoNo:null,reason:add>0?'stock-add':'adjust',by:user.uid,createdAt:Date.now()});
    b.commit().catch(e=>alert(e.message));toast(t('saved'));prodView()}}
function plist(){const e=$('#plist');if(!e)return;const q=($('#q')?.value||'').toLowerCase();
  e.innerHTML=`<table><tr><th>${t('desc')}<th>${t('rate')}<th>${t('stock')}<th></tr>`+products.filter(p=>(p.description||'').toLowerCase().includes(q)).map(p=>`<tr><td>${esc(p.description)}<td>${money(p.sellingRate)}<td class="${(p.currentStock||0)<10?'low':''}">${esc(p.currentStock||0)}<td><button class=x data-e="${esc(p.id)}">${t('edit')}</button>`).join('')+'</table>'}

/* ---------- মেমো তালিকা ---------- */
function histView(){$('#main').innerHTML=`<div class=card><input id=q placeholder="${esc(t('memoSearch'))}"><div id=hl></div></div>`;$('#q').oninput=hl;hl();
  $('#hl').onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const no=b.dataset.m,a=b.dataset.a;
    if(a==='p')memoOut(no);else if(a==='e'){const m=memos.find(x=>x.memoNo===no);m&&saleView(m);scrollTo(0,0)}else if(a==='d')delMemo(no)}}
function hl(){const e=$('#hl');if(!e)return;const q=($('#q')?.value||'').toLowerCase();
  const l=[...memos].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)||String(b.date).localeCompare(a.date)).filter(m=>[m.memoNo,m.customerName,m.customerMobile].join(' ').toLowerCase().includes(q)).slice(0,100);
  e.innerHTML=`<table><tr><th>${t('no')}<th>${t('date')}<th>${t('customer')}<th>${t('total')}<th>${t('due')}<th></tr>`+l.map(m=>`<tr><td>${esc(m.memoNo)}<td>${esc(ymd(m.date)||m.date)}<td>${esc(m.customerName)}<td>${money(m.grandTotal)}<td>${money(m.dueAmount)}<td class=nw><button class=x data-a=p data-m="${esc(m.memoNo)}">🖨</button> <button class=x data-a=e data-m="${esc(m.memoNo)}">✏️</button> <button class="x dl" data-a=d data-m="${esc(m.memoNo)}">🗑</button>`).join('')+'</table>'}
function delMemo(no){const m=memos.find(x=>x.memoNo===no);if(!m||!confirm(t('delConfirm',{n:no})))return;
  const b=writeBatch(db),now=Date.now(),need=needOf(m);
  for(const k in need){b.update(doc(db,'products',k),{currentStock:increment(need[k])});b.set(doc(db,'stockLog',`del${now}_${enc(no)}_${k}`),{productId:k,date:today(),type:'in',quantity:need[k],memoNo:no,reason:'memo-delete',by:user.uid,createdAt:now})}
  b.delete(mref(no));b.set(doc(db,'memoLog',`del${now}_${enc(no)}`),{action:'delete',memoNo:no,at:now,by:user.uid,byEmail:user.email||'',before:m});
  b.commit().catch(e=>alert(t('syncFail')+e.message));toast(t('deleted'))}

/* ---------- বাকি আদায় ---------- */
function dueView(){$('#main').innerHTML=`<div id=dp></div><div class=card><input id=q placeholder="${esc(t('custSearch'))}"><div id=dl></div></div>`;$('#q').oninput=dueList;dueList();
  $('#dl').onclick=e=>{const b=e.target.closest('[data-c]');if(b)duePanel(b.dataset.c)}}
const dueMemos=n=>memos.filter(m=>String(m.customerName||'').trim()===n&&(+m.dueAmount||0)>0.005).sort((a,b)=>(a.createdAt||Date.parse(a.date)||0)-(b.createdAt||Date.parse(b.date)||0));
function dueList(){const e=$('#dl');if(!e)return;const q=($('#q')?.value||'').toLowerCase(),g={};
  memos.forEach(m=>{const d=+m.dueAmount||0;if(d<=0.005)return;const n=String(m.customerName||'').trim(),x=g[n]||(g[n]={n,mob:'',d:0,c:0});x.d=r2(x.d+d);x.c++;if(!x.mob&&m.customerMobile)x.mob=m.customerMobile});
  const l=Object.values(g).filter(x=>(x.n+' '+x.mob).toLowerCase().includes(q)).sort((a,b)=>b.d-a.d),tot=r2(l.reduce((a,x)=>a+x.d,0));
  e.innerHTML=`<p>${t('totalDue')}: <b>${money(tot)}</b> (${l.length})</p><table><tr><th>${t('customer')}<th>${t('mobile')}<th>${t('memos')}<th>${t('due')}<th></tr>`+l.map(x=>`<tr><td>${esc(x.n||t('noName'))}<td>${esc(x.mob)}<td>${x.c}<td>${money(x.d)}<td><button class=x data-c="${esc(x.n)}">${t('collect')}</button>`).join('')+'</table>'}
function duePanel(n){const l=dueMemos(n),tot=r2(l.reduce((a,m)=>a+(+m.dueAmount||0),0));if(!l.length)return;
  $('#dp').innerHTML=`<div class="card warn"><h3>${esc(n||t('noName'))} — ${t('due')}: ${money(tot)}</h3><table>${l.map(m=>`<tr><td>${esc(m.memoNo)}<td>${esc(ymd(m.date)||m.date)}<td>${money(m.dueAmount)}`).join('')}</table>
  <div class=g style="margin-top:8px"><label>${t('collectAmt')}<input id=ca2 type=number min=0 step=any value="${tot}"></label><label>${t('date')}<input id=cd type=date value="${today()}"></label></div><p><small>${t('oldestFirst')}</small></p>
  <div class=act><button class=b1 id=cok>${t('collect')}</button><button class=b2 id=ccl>${t('cancel')}</button></div></div>`;scrollTo(0,0);
  $('#ccl').onclick=()=>$('#dp').innerHTML='';
  $('#cok').onclick=()=>{const l2=dueMemos(n),tt=r2(l2.reduce((a,m)=>a+(+m.dueAmount||0),0)),amt=r2(+$('#ca2').value);
    if(!(amt>0))return alert(t('amtReq'));if(amt>tt+0.005)return alert(t('exceedDue'));
    const b=writeBatch(db),nos=[];let rem=amt;
    for(const m of l2){if(rem<=0.004)break;const p=r2(Math.min(rem,+m.dueAmount||0));rem=r2(rem-p);nos.push(m.memoNo);
      b.update(mref(m.memoNo),{paidAmount:r2((+m.paidAmount||0)+p),dueAmount:r2((+m.dueAmount||0)-p)})}
    b.set(doc(db,'accounting','due'+uid8()),{date:$('#cd').value||today(),income:amt,expense:0,expenseCategory:'',comment:t('dueComment',{n:n||t('noName'),m:nos.join(', ')}),source:'due',customerName:n,memoNos:nos,timestamp:new Date().toISOString(),createdBy:user.uid});
    b.commit().catch(e=>alert(t('syncFail')+e.message));toast(t('collected'));$('#dp').innerHTML='';dueList()}}

/* ---------- হিসাবরক্ষণ ---------- */
function acctView(){
  $('#main').innerHTML=`<div class=card><h3>${t('addEntry')}</h3><div class=g><label>${t('date')}<input type=date id=ad value="${today()}"></label><label>${t('category')}<input id=ac list=catl></label><label>${t('income')}<input id=ai type=number min=0 step=any value=0></label><label>${t('expense')}<input id=ae type=number min=0 step=any value=0></label><label class=w>${t('comment')}<input id=am></label></div><div class=act><button class=b1 id=asv>${t('saveBtn')}</button></div></div>
  <div class=card><div class=g><label>${t('from')}<input type=date id=af value="${today().slice(0,8)}01"></label><label>${t('to')}<input type=date id=at value="${today()}"></label></div><div class=act><button class=b3 id=apr>🖨 ${t('print')}</button><button class=b2 id=aall>${t('allTime')}</button></div><div id=arep></div></div>`;
  $('#af').onchange=$('#at').onchange=acctRep;$('#aall').onclick=()=>{$('#af').value=$('#at').value='';acctRep()};
  $('#apr').onclick=()=>printHTML(`<h2>${t('acctReport')}</h2><p>${esc($('#af').value||'…')} → ${esc($('#at').value||'…')}</p>`+$('#arep').innerHTML.replace(/<button[^>]*>.*?<\/button>/g,''));
  $('#asv').onclick=()=>{const i=r2($('#ai').value),x=r2($('#ae').value);if(i<0||x<0||(i+x)<=0)return alert(t('entryReq'));
    setDoc(doc(db,'accounting','a'+uid8()),{date:$('#ad').value||today(),income:i,expense:x,expenseCategory:$('#ac').value.trim(),comment:$('#am').value.trim(),timestamp:new Date().toISOString(),createdBy:user.uid}).catch(e=>alert(e.message));
    $('#ai').value=$('#ae').value=0;$('#am').value='';toast(t('saved'))};
  $('#arep').onclick=e=>{const id=e.target.dataset.d;if(id&&confirm(t('entryDel'))){const w=writeBatch(db);w.delete(doc(db,'accounting',id));w.commit().catch(x=>alert(x.message));toast(t('deleted'))}};
  acctRep()}
function acctRep(){const e=$('#arep');if(!e)return;const f=$('#af').value,to=$('#at').value;
  const l=acct.filter(x=>inRange(x.date,f,to)).sort((a,b)=>String(ymd(b.date)).localeCompare(ymd(a.date))||String(b.timestamp||'').localeCompare(a.timestamp||''));
  const I=r2(l.reduce((a,x)=>a+(+x.income||0),0)),X=r2(l.reduce((a,x)=>a+(+x.expense||0),0)),mo={},cat={};
  l.forEach(x=>{const k=ymd(x.date).slice(0,7)||'—',o=mo[k]||(mo[k]={i:0,x:0});o.i+=+x.income||0;o.x+=+x.expense||0;const c=String(x.expenseCategory||'').trim();if(+x.expense>0){const n=c||t('noCat');cat[n]=r2((cat[n]||0)+(+x.expense))}});
  e.innerHTML=`<div class=stat><div>${t('income')}<b>${money(I)}</b></div><div>${t('expense')}<b>${money(X)}</b></div><div>${t('profit')}<b class="${I-X<0?'low':''}">${money(I-X)}</b></div></div>
  <h4>${t('monthWise')}</h4><div class=ov><table><tr><th>${t('month')}<th>${t('income')}<th>${t('expense')}<th>${t('profit')}</tr>${Object.keys(mo).sort().reverse().map(k=>`<tr><td>${esc(k)}<td>${money(mo[k].i)}<td>${money(mo[k].x)}<td>${money(mo[k].i-mo[k].x)}`).join('')}</table></div>
  <h4>${t('catWise')}</h4><div class=ov><table>${Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}<td>${money(v)}`).join('')||`<tr><td>—`}</table></div>
  <h4>${t('entries')} (${l.length})</h4><div class=ov><table><tr><th>${t('date')}<th>${t('income')}<th>${t('expense')}<th>${t('category')}<th>${t('comment')}<th></tr>${l.slice(0,300).map(x=>`<tr><td>${esc(ymd(x.date)||x.date||'—')}<td>${money(x.income)}<td>${money(x.expense)}<td>${esc(x.expenseCategory)}<td>${esc(x.comment)}<td><button class="x dl" data-d="${esc(x.id)}">🗑</button>`).join('')}</table></div>${l.length>300?`<small>${t('first300')}</small>`:''}`}

/* ---------- বিক্রয় রিপোর্ট ---------- */
function repView(){const mo=today().slice(0,8)+'01';
  $('#main').innerHTML=`<div class=card><div class=g><label>${t('from')}<input type=date id=rf value="${mo}"></label><label>${t('to')}<input type=date id=rt value="${today()}"></label></div><div class=act><button class=b3 id=rpr>🖨 ${t('print')}</button><button class=b2 id=rall>${t('allTime')}</button></div><div id=rrep></div></div>`;
  $('#rf').onchange=$('#rt').onchange=repRes;$('#rall').onclick=()=>{$('#rf').value=$('#rt').value='';repRes()};
  $('#rpr').onclick=()=>printHTML(`<h2>${t('salesReport')}</h2><p>${esc($('#rf').value||'…')} → ${esc($('#rt').value||'…')}</p>`+$('#rrep').innerHTML);repRes()}
function repRes(){const e=$('#rrep');if(!e)return;const l=memos.filter(m=>inRange(m.date,$('#rf').value,$('#rt').value));
  let sub=0,disc=0,gt=0,paid=0,due=0,cost=0,unk=0;const pm={};
  l.forEach(m=>{sub+=+m.subTotal||0;disc+=dAmt(m);gt+=+m.grandTotal||0;paid+=+m.paidAmount||0;due+=+m.dueAmount||0;
    (m.products||[]).forEach(i=>{const p=findProd(i.description,i.pid),q=+i.quantity||0,a=+i.amount||q*(+i.rate||0),has=p&&costs[p.id]!=null,c=has?q*costs[p.id]:0;if(!has)unk++;cost+=c;
      const k=p?p.id:'~'+norm(i.description),o=pm[k]||(pm[k]={n:p?p.description:i.description,q:0,a:0,c:0});o.q+=q;o.a+=a;o.c+=c})});
  const prof=r2(sub-disc-cost),rows=Object.values(pm).sort((a,b)=>b.a-a.a);
  e.innerHTML=`<div class=stat><div>${t('memos')}<b>${l.length}</b></div><div>${t('totalSale')}<b>${money(gt)}</b></div><div>${t('discount')}<b>${money(disc)}</b></div><div>${t('paid')}<b>${money(paid)}</b></div><div>${t('due')}<b>${money(due)}</b></div><div>${t('profit')}<b class="${prof<0?'low':''}">${money(prof)}</b></div></div>
  ${unk?`<p class=err><small>${t('costUnknown',{n:unk})}</small></p>`:''}<h4>${t('prodWise')}</h4><div class=ov><table><tr><th>${t('desc')}<th>${t('qty')}<th>${t('amount')}<th>${t('profitBeforeDisc')}</tr>${rows.map(o=>`<tr><td>${esc(o.n)}<td>${r2(o.q)}<td>${money(o.a)}<td>${money(o.a-o.c)}`).join('')||'<tr><td>—'}</table></div>`}

/* ---------- স্টক ইতিহাস ---------- */
function stockView(){$('#main').innerHTML=`<div class=card><label>${t('pickProd')}<input id=sq list=pl autocomplete=off></label><div id=sres></div></div>`;$('#sq').oninput=stockRes;stockRes()}
function stockRes(){const e=$('#sres');if(!e)return;const p=products.find(x=>norm(x.description)===norm($('#sq')?.value));if(!p){e.innerHTML=`<p><small>${t('pickProdHint')}</small></p>`;return}
  const l=stockLogs.filter(x=>String(x.productId)===p.id).sort((a,b)=>String(ymd(b.date)).localeCompare(ymd(a.date))||(b.createdAt||0)-(a.createdAt||0));
  const ti=r2(l.filter(x=>x.type==='in').reduce((a,x)=>a+(+x.quantity||0),0)),to=r2(l.filter(x=>x.type==='out').reduce((a,x)=>a+(+x.quantity||0),0));
  const why=x=>x.reason?t('rs_'+x.reason):x.memoNo?t('rs_sale'):t('rs_stock-add');
  e.innerHTML=`<div class=stat><div>${t('stock')}<b>${esc(p.currentStock||0)}</b></div><div>${t('stockIn')}<b>${ti}</b></div><div>${t('stockOut')}<b>${to}</b></div></div><div class=ov><table><tr><th>${t('date')}<th>${t('type')}<th>${t('qty')}<th>${t('reason')}</tr>${l.slice(0,300).map(x=>`<tr><td>${esc(ymd(x.date)||x.date)}<td class="${x.type==='in'?'gin':'low'}">${x.type==='in'?t('stockIn'):t('stockOut')}<td>${esc(x.quantity)}<td>${esc(why(x))}${x.memoNo?' #'+esc(x.memoNo):''}`).join('')||'<tr><td>—'}</table></div>`}

/* ---------- ড্যাশবোর্ড ---------- */
function dashView(){const s=memos.reduce((a,m)=>a+(+m.grandTotal||0),0),d=memos.reduce((a,m)=>a+(+m.dueAmount||0),0),low=products.filter(p=>(p.currentStock||0)<10),td=today(),ts=memos.filter(m=>ymd(m.date)===td).reduce((a,m)=>a+(+m.grandTotal||0),0);
  $('#main').innerHTML=`<div class="card stat"><div>${t('todaySale')}<b>${money(ts)}</b></div><div>${t('memos')}<b>${memos.length}</b></div><div>${t('totalSale')}<b>${money(s)}</b></div><div>${t('totalDue')}<b>${money(d)}</b></div><div>${t('customers')}<b>${customers.length}</b></div><div>${t('products')}<b>${products.length}</b></div></div>
  <div class=card><h3>${t('lowStock')}</h3><table>${low.map(p=>`<tr><td>${esc(p.description)}<td class=low>${esc(p.currentStock||0)}`).join('')||`<tr><td>${t('none')}`}</table></div>`}

/* ---------- সেটিং ---------- */
function setView(){
  $('#main').innerHTML=`<div class=card><h3>${t('sellerRules')}</h3><label class=chk><input type=checkbox id=sp1 ${S.sellerPriceEdit?'checked':''}> ${t('sellerPrice')}</label><br><label>${t('sellerMaxDisc')}<input id=sd type=number min=0 max=100 step=any value="${esc(S.sellerMaxDiscount||0)}"></label><p><small>${t('sellerMaxHint')}</small></p><div class=act><button class=b1 id=ssv>${t('saveBtn')}</button></div></div>
  <div class=card><h3>${t('defPaper')}</h3><select id=dpf><option value=a4>A4</option><option value=f80>${t('thermal')} 80mm</option><option value=f58>${t('thermal')} 58mm</option></select></div>
  <div class=card><h3>${t('newStaff')}</h3><div class=g><label>${t('name')}<input id=un></label><label>${t('role')}<select id=ur><option value=seller>${t('seller')}</option><option value=owner>${t('owner')}</option></select></label><label>${t('email')}<input id=ue type=email autocomplete=off></label><label>${t('password')}<input id=up type=text autocomplete=off></label></div><p><small>${t('passMin')}</small></p><div class=act><button class=b1 id=ucr>${t('create')}</button></div></div>
  <div class=card><h3>${t('employees')}</h3><div id=emp></div><p><small>${t('empHint')}</small></p></div>`;
  $('#dpf').value=fmtPref();$('#dpf').onchange=()=>localStorage.setItem('jp_fmt',$('#dpf').value);
  $('#ssv').onclick=()=>{const v=Math.min(100,Math.max(0,+$('#sd').value||0));setDoc(doc(db,'settings','app'),{sellerPriceEdit:$('#sp1').checked,sellerMaxDiscount:v},{merge:true}).catch(e=>alert(e.message));toast(t('saved'))};
  $('#ucr').onclick=createStaff;
  $('#emp').onclick=async e=>{const b=e.target.closest('[data-u]');if(!b)return;const u=users.find(x=>x.id===b.dataset.u);if(!u)return;
    if(b.dataset.a==='r'){if(!navigator.onLine)return alert(t('needNet'));try{await sendPasswordResetEmail(auth,u.email);toast(t('mailSent'))}catch(x){alert(x.message)}}
    else if(b.dataset.a==='d'&&confirm(t('removeConfirm',{n:u.name||u.email||u.id}))){const w=writeBatch(db);w.delete(doc(db,'users',u.id));w.commit().catch(x=>alert(x.message));toast(t('removed'))}};
  empList()}
async function createStaff(){
  const name=$('#un').value.trim(),email=$('#ue').value.trim(),pw=$('#up').value,r=$('#ur').value;
  if(!navigator.onLine)return alert(t('needNet'));
  if(!email||pw.length<6)return alert(t('passMin'));
  const bt=$('#ucr');bt.disabled=true;
  try{const c=await createUserWithEmailAndPassword(auth2,email,pw);const id=c.user.uid;await signOut(auth2);
    await setDoc(doc(db,'users',id),{role:r,name,email,createdBy:user.uid,createdAt:Date.now()});
    $('#un').value=$('#ue').value=$('#up').value='';alert(t('staffCreated',{e:email,p:pw}))}
  catch(e){alert(t('failed')+e.message)}finally{bt.disabled=false}}
function empList(){const e=$('#emp');if(!e)return;e.innerHTML=`<div class=ov><table><tr><th>${t('name')}<th>${t('email')}<th>${t('role')}<th></tr>${users.map(u=>`<tr><td>${esc(u.name||'—')}<td>${esc(u.email||'—')}<td>${esc(u.role==='owner'?t('owner'):u.role==='seller'?t('seller'):u.role)}<td class=nw>${u.email?`<button class=x data-a=r data-u="${esc(u.id)}">${t('resetMail')}</button> `:''}${u.id!==user.uid?`<button class="x dl" data-a=d data-u="${esc(u.id)}">${t('removeAccess')}</button>`:''}`).join('')}</table></div>`}

/* ---------- ডেটা ---------- */
function dataView(){$('#main').innerHTML=`<div class=card><h3>${t('importOld')}</h3><p>${t('importHint')}</p><input type=file id=f accept=".json"></div><div class=card><h3>${t('backup')}</h3><button class=b3 id=ex>${t('download')}</button></div>`;
  $('#f').onchange=e=>e.target.files[0]&&imp(e.target.files[0]);
  $('#ex').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({memoHistory:memos,customerDirectory:customers,productDirectory:products,costsBackup:costs,accountingBackup:acct,stockLogBackup:stockLogs},null,1)],{type:'application/json'}));a.download=`jewel-backup-${today()}.json`;a.click()}}
async function imp(f){
  if(!navigator.onLine)return alert(t('needNet'));
  let j;try{j=JSON.parse(await f.text())}catch(e){return alert(t('badFile'))}
  const P=j.productDirectory||[],C=j.customerDirectory||[],M=(j.memoHistory||[]).filter(m=>m.memoNo),SL=j.stockLog||[],A=j.accountingEntries||[];
  if(!confirm(t('importConfirm',{m:M.length,c:C.length,p:P.length,a:A.length})))return;
  const ops=[];
  P.forEach(p=>{const id=String(p.id),d={description:p.description||'',sellingRate:+p.sellingRate||0,code:p.code||'',imported:true};if(!products.some(x=>x.id===id))d.currentStock=+p.currentStock||0;ops.push([doc(db,'products',id),d],[doc(db,'costs',id),{purchaseRate:+p.purchaseRate||0}])});
  C.filter(c=>c.name).forEach(c=>ops.push([doc(db,'customers',enc(c.name)),{name:c.name,address:c.address||'',mobile:c.mobile||''}]));
  M.forEach(m=>ops.push([mref(m.memoNo),{...m,createdAt:Date.parse(m.timestamp)||Date.parse(m.date)||0,imported:true}]));
  SL.forEach((s,i)=>ops.push([doc(db,'stockLog','old'+i),s]));A.forEach((a,i)=>ops.push([doc(db,'accounting','old'+i),a]));
  try{for(let i=0;i<ops.length;i+=400){const b=writeBatch(db);ops.slice(i,i+400).forEach(([r,d])=>b.set(r,d,{merge:true}));await b.commit()}alert(t('importDone'))}catch(e){alert(t('failed')+e.message)}
}
