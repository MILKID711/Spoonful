(function(){
'use strict';

const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));

/*PURE-START*/
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);

const FR8=[[0,''],[.125,'⅛'],[.25,'¼'],[1/3,'⅓'],[.375,'⅜'],[.5,'½'],[.625,'⅝'],[2/3,'⅔'],[.75,'¾'],[.875,'⅞'],[1,'']];
const FRC=[[0,''],[.25,'¼'],[1/3,'⅓'],[.5,'½'],[2/3,'⅔'],[.75,'¾'],[1,'']];
const FRQ=[[0,''],[.25,'¼'],[.5,'½'],[.75,'¾'],[1,'']];

function parseAmount(s){
  s=String(s||'').trim(); if(!s) return null;
  const uf={'½':.5,'¼':.25,'¾':.75,'⅓':1/3,'⅔':2/3,'⅛':.125,'⅜':.375,'⅝':.625,'⅞':.875};
  let total=0, ok=false;
  const parts=s.replace(/([0-9])([½¼¾⅓⅔⅛⅜⅝⅞])/g,'$1 $2').split(/\s+/);
  for(const p of parts){
    if(uf[p]!=null){ total+=uf[p]; ok=true; }
    else if(/^\d+\/\d+$/.test(p)){ const ab=p.split('/').map(Number); if(!ab[1]) return null; total+=ab[0]/ab[1]; ok=true; }
    else if(/^\d*\.?\d+$/.test(p)){ total+=parseFloat(p); ok=true; }
    else return null;
  }
  return ok?total:null;
}
function frac(n,steps){
  if(!(n>0)) return '0';
  let w=Math.floor(n+1e-9), f=n-w, best=steps[0], bd=9;
  for(const st of steps){ const d=Math.abs(f-st[0]); if(d<bd){ bd=d; best=st; } }
  let sym=best[1];
  if(best[0]===1){ w+=1; sym=''; }
  if(!w && !sym) sym=steps[1][1];
  return (w?String(w):'')+(w&&sym?'\u2009':'')+sym;
}
const UN={g:'g',gram:'g',grams:'g',gr:'g',kg:'kg',kilogram:'kg',kilograms:'kg',ml:'ml',milliliter:'ml',milliliters:'ml',millilitre:'ml',millilitres:'ml',l:'l',liter:'l',liters:'l',litre:'l',litres:'l',oz:'oz',ounce:'oz',ounces:'oz',lb:'lb',lbs:'lb',pound:'lb',pounds:'lb',cup:'cup',cups:'cup',tbsp:'tbsp',tbs:'tbsp',tablespoon:'tbsp',tablespoons:'tbsp',tsp:'tsp',teaspoon:'tsp',teaspoons:'tsp','fl oz':'floz','fluid ounce':'floz','fluid ounces':'floz'};
const canon=u=>UN[String(u||'').toLowerCase().replace(/\./g,'').trim()]||null;

function convert(a,unit,sys){
  const c=canon(unit);
  if(!c||a==null) return {a:a,u:unit};
  if(sys==='us'){
    if(c==='g'){ const oz=a/28.35; return oz>=16?{a:oz/16,u:'lb'}:{a:oz,u:'oz'}; }
    if(c==='kg') return {a:a*2.2046,u:'lb'};
    if(c==='ml'){ if(a>=60) return {a:a/240,u:'cup'}; if(a>=14) return {a:a/15,u:'tbsp'}; return {a:a/5,u:'tsp'}; }
    if(c==='l') return {a:a*4.2268,u:'cup'};
  }else{
    if(c==='oz') return {a:a*28.35,u:'g'};
    if(c==='lb'){ const g=a*453.6; return g>=1000?{a:g/1000,u:'kg'}:{a:g,u:'g'}; }
    if(c==='cup') return {a:a*240,u:'ml'};
    if(c==='floz') return {a:a*29.57,u:'ml'};
  }
  return {a:a,u:unit};
}
function roundMetric(a){ if(a>=100) return Math.round(a/5)*5; if(a>=10) return Math.round(a); return +a.toFixed(1); }

const CU={clove:'cloves',can:'cans',slice:'slices',piece:'pieces',sprig:'sprigs',stalk:'stalks',bunch:'bunches',pinch:'pinches',head:'heads',fillet:'fillets',stick:'sticks',leaf:'leaves',strip:'strips',handful:'handfuls',dash:'dashes',pod:'pods'};
const CU_REV=Object.keys(CU).reduce((o,k)=>{ o[CU[k]]=k; return o; },{});
function unitLabel(u,a){ const l=String(u||'').toLowerCase(); const sing=CU[l]?l:CU_REV[l]; if(sing) return a>1.001?CU[sing]:sing; return u||''; }

function fmtQty(it,factor,sys){
  if(it.amount==null) return [it.rawAmount,it.unit].filter(Boolean).join(' ');
  const cv=convert(it.amount*factor,it.unit,sys);
  const a=cv.a, u=cv.u, c=canon(u);
  let n;
  if(c==='g'||c==='ml') n=String(roundMetric(a));
  else if(c==='kg'||c==='l') n=String(+a.toFixed(2));
  else if(c==='oz'||c==='lb') n=frac(a,FRQ);
  else if(c==='cup') n=frac(a,FRC);
  else n=frac(a,FR8);
  let label;
  if(c==='cup') label=a>1.001?'cups':'cup';
  else if(c==='floz') label='fl oz';
  else if(c) label=c;
  else label=unitLabel(u,a);
  return [n,label].filter(Boolean).join(' ');
}

function toMin(s){
  s=String(s||'').toLowerCase(); let t=0, f=false;
  const h=s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  if(h){ t+=parseFloat(h[1])*60; f=true; }
  const m=s.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/);
  if(m){ t+=parseInt(m[1],10); f=true; }
  if(!f){ const n=s.match(/\d+/); if(n) t=parseInt(n[0],10); }
  return Math.round(t);
}
function fmtMin(n){ if(!n) return ''; if(n<60) return n+' min'; const h=Math.floor(n/60), m=n%60; return h+' hr'+(m?' '+m+' min':''); }

const LABELS='TITLE|ABOUT|CUISINE|PREP|COOK|SERVES|LEVEL|KCAL|TAGS|GROUP|ING|STEP|TIP|ERROR';
const LINE_RE=new RegExp('^('+LABELS+')\\s*:\\s*(.*)$','i');
function parseRecipe(text,final){
  const r={title:'',about:'',cuisine:'',prep:'',cook:'',serves:0,level:'',kcal:0,tags:[],ingredients:[],steps:[],tips:[],error:''};
  text=String(text||'').replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/<think>[\s\S]*$/i,'');
  let lines=text.replace(/\r/g,'').split('\n');
  if(!final) lines=lines.slice(0,-1);
  let group='';
  for(const raw of lines){
    const line=raw.trim().replace(/^[#>*\-\u2022\s]+/,'').replace(/\*\*/g,'').replace(/`/g,'');
    const m=line.match(LINE_RE); if(!m) continue;
    const k=m[1].toUpperCase(), v=m[2].trim();
    if(k==='TITLE') r.title=v;
    else if(k==='ABOUT') r.about=v;
    else if(k==='CUISINE') r.cuisine=v;
    else if(k==='PREP') r.prep=v;
    else if(k==='COOK') r.cook=v;
    else if(k==='SERVES') r.serves=parseInt(v,10)||0;
    else if(k==='LEVEL') r.level=v;
    else if(k==='KCAL') r.kcal=parseInt(v.replace(/[^0-9]/g,''),10)||0;
    else if(k==='TAGS') r.tags=v.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).slice(0,4);
    else if(k==='GROUP') group=v.replace(/:$/,'');
    else if(k==='STEP'){ if(v) r.steps.push(v); }
    else if(k==='TIP'){ if(v) r.tips.push(v); }
    else if(k==='ERROR') r.error=v||'That search doesn’t look like a recipe.';
    else if(k==='ING'){
      const p=v.split('|').map(s=>s.trim());
      if(p.length<2){ if(v) r.ingredients.push({group:group,amount:null,rawAmount:'',unit:'',name:v,note:''}); continue; }
      let a,u,n,note;
      if(p.length===2){ a=p[0]; u=''; n=p[1]; note=''; }
      else { a=p[0]; u=p[1]; n=p[2]; note=p.slice(3).join(' | '); }
      if(!n) continue;
      const amt=parseAmount(a);
      r.ingredients.push({group:group,amount:amt,rawAmount:amt==null?a:'',unit:u,name:n,note:note});
    }
  }
  return r;
}
/*PURE-END*/

/* ---------- storage ---------- */
const mem={};
const store={
  ok:true,
  get(k){ try{ const v=localStorage.getItem(k); if(v!==null) return JSON.parse(v); }catch(e){} return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null; },
  set(k,v){ mem[k]=v; try{ localStorage.setItem(k,JSON.stringify(v)); this.ok=true; }catch(e){ this.ok=false; } return this.ok; }
};
const KEY_BM='spoonful.bookmarks.v1', KEY_UN='spoonful.units.v1', KEY_EM='spoonful.email.v1';

/* ---------- data ---------- */
const IDEAS=[['🍛','Butter chicken'],['🍝','Creamy mushroom pasta'],['🥘','Shakshuka'],['🍫','Fudgy brownies'],['🥞','Fluffy pancakes'],['🍜','Chicken ramen'],['🌮','Fish tacos'],['🥗','Greek salad'],['🍲','Red lentil soup'],['🍪','Chocolate chip cookies'],['🥭','Mango lassi'],['🍕','Margherita pizza']];
const FILTERS=[['veg','Vegetarian','vegetarian'],['vegan','Vegan','vegan'],['gf','Gluten-free','gluten-free'],['quick','Under 30 min','ready in under 30 minutes in total'],['protein','High protein','high in protein'],['spicy','Spicy','spicy']];

const ICON={
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  bm:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>',
  bmFill:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>'
};

/* ---------- state ---------- */
const S={
  view:'home', lastSearchView:'home',
  q:'', rq:'', from:'search', lastKind:'search',
  filters:new Set(), units:'metric',
  recipe:null, raw:'', status:'idle', error:null, truncated:false,
  servings:0, ticked:new Set(), done:new Set(),
  more:[], moreStatus:'idle',
  bookmarks:[], savedFilter:'',
  runR:0, runM:0, ctl:{R:null,M:null},
  ideas:IDEAS.slice().sort(()=>Math.random()-.5).slice(0,8), toastFn:null,
  cfg:{email:false,grounded:false}, google:null, mail:null, mailBusy:false, mailPrefs:{to:'',auto:false}
};

function loadBM(){
  const raw=store.get(KEY_BM);
  if(!Array.isArray(raw)) return [];
  return raw.filter(b=>b&&b.id&&b.title&&Array.isArray(b.ingredients)&&Array.isArray(b.steps))
            .map(b=>Object.assign({},b,{tags:Array.isArray(b.tags)?b.tags:[],tips:Array.isArray(b.tips)?b.tips:[]}));
}
S.bookmarks=loadBM();
S.units=store.get(KEY_UN)==='us'?'us':'metric';
const persistBM=()=>store.set(KEY_BM,S.bookmarks);
/* The visitor's email address is remembered in this browser only, so the form is pre-filled next time. */
const EMAIL_OK=/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const validEmail=v=>typeof v==='string'&&v.trim().length<=254&&EMAIL_OK.test(v.trim());
(function(){ const v=store.get(KEY_EM); if(v&&typeof v==='object'&&validEmail(v.to)) S.mailPrefs={to:String(v.to).trim(),auto:!!v.auto}; })();

/* ---------- API client (talks to this site's own server) ---------- */
/*API-START*/
const CODE_BY_STATUS={400:'bad_request',429:'rate_limited',503:'capacity'};
async function httpError(res){
  let code=CODE_BY_STATUS[res.status]||'upstream_error';
  try{ const j=await res.json(); if(j&&j.error) code=j.error; }catch(e){}
  return {code:code};
}
function splitStream(raw){
  let text=raw, err='', trunc=false, meta=null;
  const m=text.indexOf('\u0000META:');
  if(m>=0){ try{ meta=JSON.parse(text.slice(m+6)); }catch(e){ meta=null; } text=text.slice(0,m); }
  const i=text.indexOf('\u0000ERR:');
  if(i>=0){ err=text.slice(i+5).trim()||'upstream_error'; text=text.slice(0,i); }
  const j=text.indexOf('\u0000TRUNC');
  if(j>=0){ trunc=true; text=text.slice(0,j); }
  return {text:text,err:err,trunc:trunc,meta:meta};
}
const isAbort=e=>!!e&&e.name==='AbortError';
async function apiRecipe(q,opts){
  let res;
  try{
    res=await fetch('/api/recipe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:q,prefs:Array.from(S.filters)}),signal:opts.signal});
  }catch(e){ throw {code:isAbort(e)?'cancelled':'upstream_error'}; }
  if(!res.ok) throw await httpError(res);
  let text='';
  try{
    if(res.body&&res.body.getReader){
      const rd=res.body.getReader(), dec=new TextDecoder();
      for(;;){
        const r=await rd.read(); if(r.done) break;
        text+=dec.decode(r.value,{stream:true});
        if(opts.onText) opts.onText({text:splitStream(text).text});
      }
      text+=dec.decode();
    }else{
      text=await res.text();
      if(opts.onText) opts.onText({text:splitStream(text).text});
    }
  }catch(e){
    throw {code:isAbort(e)?'cancelled':'upstream_error',text:splitStream(text).text};
  }
  const sp=splitStream(text);
  if(sp.err) throw {code:sp.err,text:sp.text};
  return {text:sp.text,truncated:sp.trunc,meta:sp.meta};
}
async function apiIdeas(q,opts){
  let res;
  try{
    res=await fetch('/api/ideas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:q,prefs:Array.from(S.filters)}),signal:opts.signal});
  }catch(e){ throw {code:isAbort(e)?'cancelled':'upstream_error'}; }
  if(!res.ok) throw await httpError(res);
  const j=await res.json();
  return Array.isArray(j.ideas)?j.ideas:[];
}
async function apiEmail(body){
  let res;
  try{
    res=await fetch('/api/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  }catch(e){ throw {code:'network'}; }
  let j=null; try{ j=await res.json(); }catch(e){}
  if(!res.ok||!j||j.ok!==true) throw {code:(j&&j.error)||'email_failed'};
  return j;
}
/*API-END*/

function abortCtl(k){ if(S.ctl[k]){ try{ S.ctl[k].abort(); }catch(e){} S.ctl[k]=null; } }

function errInfo(e){
  const M={
    rate_limited:['Slow down a moment','You’re searching very fast. Wait a few seconds and try again.',true],
    capacity:['We’re at capacity','The recipe service is busy right now. Try again in a minute.',true],
    bad_request:['Try a different search','That search couldn’t be read. Try a dish or an ingredient.',false]
  };
  const m=M[e&&e.code];
  if(m) return {title:m[0],msg:m[1],retry:m[2]};
  return {title:'That didn’t work',msg:'The recipe stopped before it finished. Check your connection and try again.',retry:true};
}

async function startRecipe(q){
  const run=++S.runR; abortCtl('R');
  S.rq=q; S.recipe=null; S.raw=''; S.status='loading'; S.error=null; S.servings=0; S.truncated=false;
  S.ticked.clear(); S.done.clear();
  S.google=null; S.mail=null;
  renderRecipe(); renderExtras(); announce('Finding a recipe for '+q);
  const ctl=new AbortController(); S.ctl.R=ctl;
  try{
    const res=await apiRecipe(q,{
      signal:ctl.signal,
      onText:function(u){ if(run!==S.runR) return; S.raw=u.text; if(S.status==='loading') S.status='streaming'; queueRender(); }
    });
    if(run!==S.runR) return;
    finish(res.text,res.truncated,res.meta);
  }catch(e){
    if(run!==S.runR||(e&&e.code==='cancelled')) return;
    const p=e&&e.text?parseRecipe(e.text,true):null;
    if(p&&!p.error&&p.title&&p.ingredients.length&&p.steps.length){
      S.recipe=p; S.status='done'; S.truncated=true; if(!S.servings) S.servings=p.serves||4;
      renderRecipe(); return;
    }
    S.status='error'; S.error=errInfo(e); renderRecipe();
  }
}
function finish(text,truncated,meta){
  const p=parseRecipe(text,true);
  if(p.error){ S.status='error'; S.error={title:'Try a different search',msg:p.error,retry:false}; }
  else if(!p.title||!p.ingredients.length||!p.steps.length){ S.status='error'; S.error={title:'The recipe came back incomplete',msg:'Try again, or make the search more specific.',retry:true}; }
  else{
    S.recipe=p; S.status='done'; S.truncated=!!truncated; if(!S.servings) S.servings=p.serves||4;
    S.google=googleInfo(meta);
    /* Only a recipe the server signed (complete, not cut short) can be emailed. */
    S.mail=(!truncated&&meta&&meta.sig&&meta.ts)?{recipe:text,ts:meta.ts,sig:meta.sig,sent:false}:null;
    announce('Recipe ready: '+p.title);
  }
  renderRecipe(); renderExtras();
  if(S.status==='done'){ renderMore(); autoMail(); }
}
function googleInfo(meta){
  if(!meta||typeof meta!=='object') return null;
  const src=(Array.isArray(meta.sources)?meta.sources:[]).filter(x=>x&&typeof x.uri==='string'&&/^https?:\/\//i.test(x.uri)).slice(0,6);
  const sug=typeof meta.suggest==='string'?meta.suggest:'';
  return (src.length||sug)?{sources:src,suggest:sug}:null;
}

async function startMore(q){
  const run=++S.runM; abortCtl('M');
  S.more=[]; S.moreStatus='loading'; renderMore();
  const ctl=new AbortController(); S.ctl.M=ctl;
  try{
    const arr=await apiIdeas(q,{signal:ctl.signal});
    if(run!==S.runM) return;
    S.more=arr.filter(x=>x&&typeof x.title==='string'&&x.title.trim()).slice(0,6);
    S.moreStatus=S.more.length?'done':'empty';
  }catch(e){
    if(run!==S.runM||(e&&e.code==='cancelled')) return;
    S.moreStatus='error';
  }
  renderMore();
}

let raf=0;
function queueRender(){ if(raf) return; raf=requestAnimationFrame(function(){ raf=0; if(S.status==='streaming'||S.status==='loading') renderRecipe(); }); }

/* ---------- actions ---------- */
function search(q){
  q=String(q||'').trim().slice(0,120);
  if(!q){ $('#q').focus(); return; }
  $('#q').value=q;
  S.q=q; S.from='search'; S.lastKind='search'; S.view='recipe'; S.lastSearchView='recipe';
  S.more=[]; S.moreStatus='loading';
  showView(); updateCounts();
  startRecipe(q); startMore(q);
  scrollToResults();
}
function openIdea(i){
  const it=S.more[i]; if(!it) return;
  S.from='search'; S.lastKind='idea'; S.view='recipe'; S.lastSearchView='recipe';
  showView(); startRecipe(it.title); renderMore(); scrollToResults(true);
}
function openBookmark(id){
  const b=S.bookmarks.find(x=>x.id===id); if(!b) return;
  S.runR++; S.runM++; abortCtl('R'); abortCtl('M');
  S.recipe=JSON.parse(JSON.stringify(b)); S.status='done'; S.error=null; S.truncated=false; S.google=null; S.mail=null;
  S.servings=b.serves||4; S.ticked.clear(); S.done.clear();
  S.from='saved'; S.more=[]; S.moreStatus='idle'; S.view='recipe';
  render(); window.scrollTo(0,0);
}
function pickForSave(r,id){
  return {id:id,title:r.title,about:r.about,cuisine:r.cuisine,prep:r.prep,cook:r.cook,serves:r.serves,level:r.level,kcal:r.kcal,tags:r.tags.slice(),ingredients:r.ingredients.map(i=>Object.assign({},i)),steps:r.steps.slice(),tips:r.tips.slice(),savedAt:Date.now()};
}
function toggleBookmark(){
  const r=S.recipe; if(!r||S.status!=='done') return;
  const id=slug(r.title)||'recipe';
  const i=S.bookmarks.findIndex(b=>b.id===id);
  if(i>=0) removeBookmark(id);
  else{ S.bookmarks.unshift(pickForSave(r,id)); persistBM(); toast('Bookmarked'); announce('Bookmarked '+r.title); refreshAfterBookmark(); }
}
function removeBookmark(id){
  const i=S.bookmarks.findIndex(b=>b.id===id); if(i<0) return;
  const removed=S.bookmarks.splice(i,1)[0];
  persistBM();
  toast('Bookmark removed','Undo',function(){
    if(S.bookmarks.some(b=>b.id===removed.id)) return;
    S.bookmarks.splice(Math.min(i,S.bookmarks.length),0,removed); persistBM(); refreshAfterBookmark();
  });
  refreshAfterBookmark();
}
function refreshAfterBookmark(){
  updateCounts();
  if(S.view==='recipe') renderRecipe();
  if(S.view==='saved') renderSaved();
  if(S.view==='home') renderHome();
}
function setServings(n){ S.servings=Math.max(1,Math.min(24,n)); renderRecipe(); }
function setUnits(u){ S.units=u; store.set(KEY_UN,u); renderRecipe(); }

function ingText(it){
  const q=fmtQty(it,factorNow(),S.units);
  return (q?q+' ':'')+it.name+(it.note?', '+it.note:'');
}
function factorNow(){ const r=S.recipe; return (r&&S.servings&&r.serves)?S.servings/r.serves:1; }
async function copyList(){
  const r=S.recipe; if(!r) return;
  const lines=[r.title+' (serves '+(S.servings||r.serves||'?')+')']; let g=null;
  r.ingredients.forEach(function(it){ if(it.group&&it.group!==g){ g=it.group; lines.push('',it.group+':'); } lines.push('- '+ingText(it)); });
  const txt=lines.join('\n');
  try{ await navigator.clipboard.writeText(txt); toast('Ingredients copied'); return; }catch(e){}
  try{
    const ta=document.createElement('textarea'); ta.value=txt; ta.setAttribute('readonly',''); ta.style.cssText='position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select(); const ok=document.execCommand('copy'); document.body.removeChild(ta);
    toast(ok?'Ingredients copied':'Couldn’t copy. Select the list and copy it.');
  }catch(e){ toast('Couldn’t copy. Select the list and copy it.'); }
}

let toastT;
function toast(msg,label,fn){
  const t=$('#toast');
  t.innerHTML='<span>'+esc(msg)+'</span>'+(label?'<button type="button" class="toast-btn" data-action="toast-act">'+esc(label)+'</button>':'');
  S.toastFn=fn||null; t.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(hideToast,label?6000:3000);
}
function hideToast(){ $('#toast').classList.remove('show'); }
function announce(msg){ const l=$('#live'); l.textContent=''; setTimeout(function(){ l.textContent=msg; },50); }
const reduceMotion=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function scrollToResults(force){
  const el=$('#results'); if(!el) return;
  const top=el.getBoundingClientRect().top;
  if(force||top<0||top>window.innerHeight*.6) el.scrollIntoView({block:'start',behavior:reduceMotion()?'auto':'smooth'});
}

/* ---------- rendering ---------- */
function updateCounts(){
  const n=S.bookmarks.length;
  $$('[data-count]').forEach(function(el){ el.textContent=n; el.hidden=!n; });
}
function showView(){
  $('#home').hidden=S.view!=='home';
  $('#results').hidden=S.view!=='recipe';
  $('#saved').hidden=S.view!=='saved';
  $('#filtersWrap').hidden=S.view==='saved';
  $$('[data-tab]').forEach(function(b){
    const on=b.dataset.tab==='saved'?S.view==='saved':S.view!=='saved';
    if(on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
}
function render(){
  showView(); updateCounts();
  if(S.view==='home') renderHome();
  if(S.view==='recipe'){ renderRecipe(); renderMore(); }
  if(S.view==='saved') renderSaved();
  renderExtras();
  const ft=$('#footResults'); if(ft) ft.textContent=footText();
}
function renderFilters(){
  $('#filters').innerHTML=FILTERS.map(function(f){
    return '<button type="button" class="chip" data-action="filter" data-key="'+f[0]+'" aria-pressed="'+S.filters.has(f[0])+'">'+f[1]+'</button>';
  }).join('');
}

function bmCard(b){
  const t=fmtMin(toMin(b.prep)+toMin(b.cook));
  const pills=[b.cuisine,t,b.kcal?b.kcal+' kcal':''].filter(Boolean).map(x=>'<span class="pill">'+esc(x)+'</span>').join('');
  return '<article class="bm-card">'+
    '<button type="button" class="bm-open" data-action="open-bm" data-id="'+esc(b.id)+'">'+
      '<span class="bm-title">'+esc(b.title)+'</span>'+
      (pills?'<span class="bm-pills">'+pills+'</span>':'')+
      (b.about?'<span class="bm-about">'+esc(b.about)+'</span>':'')+
    '</button>'+
    '<button type="button" class="bm-remove" data-action="unbookmark" data-id="'+esc(b.id)+'" aria-label="Remove bookmark: '+esc(b.title)+'">'+ICON.bmFill+'</button>'+
  '</article>';
}

function renderHome(){
  const el=$('#home');
  const recent=S.bookmarks.slice(0,3);
  el.innerHTML=
    '<section class="hero">'+
      '<h1>What are we cooking today?</h1>'+
      '<p>Search any dish, ingredient or craving. You get the full ingredient list and a step-by-step method, ready to cook from.</p>'+
      '<div class="ideas" role="group" aria-label="Recipe ideas">'+
        S.ideas.map(function(x){ return '<button type="button" class="idea" data-action="idea" data-q="'+esc(x[1])+'">'+x[0]+' '+esc(x[1])+'</button>'; }).join('')+
        '<button type="button" class="idea idea-surprise" data-action="surprise">Surprise me</button>'+
      '</div>'+
    '</section>'+
    (recent.length?
      '<div class="sec-head"><h2>Your bookmarks</h2><button type="button" class="link" data-action="tab-saved">See all '+S.bookmarks.length+'</button></div>'+
      '<div class="bm-grid">'+recent.map(bmCard).join('')+'</div>':'')+
    '<p class="foot">'+esc(footText())+'</p>';
}

function skLines(n){ let s=''; for(let i=0;i<n;i++) s+='<div class="sk sk-line" style="width:'+(62+((i*37)%34))+'%"></div>'; return s; }
function loadingHTML(){
  return '<div class="rhead rhead-load" aria-busy="true"><h1>Finding a recipe for “'+esc(S.rq||S.q)+'”</h1><p class="about">'+(S.cfg.grounded?'Checking Google, then writing out the ingredients and method…':'Writing the ingredients and method…')+'</p></div>'+
    '<div class="rbody"><div class="panel"><div class="sk sk-h"></div>'+skLines(6)+'</div><div class="panel"><div class="sk sk-h"></div>'+skLines(5)+'</div></div>';
}
function errorHTML(){
  const e=S.error||{title:'That didn’t work',msg:'Try again.',retry:true};
  return '<div class="err" role="alert"><h2>'+esc(e.title)+'</h2><p>'+esc(e.msg)+'</p>'+(e.retry?'<button type="button" class="btn btn-primary" data-action="retry">Try again</button>':'')+'</div>';
}

function recipeHTML(r,streaming){
  const id=slug(r.title)||'recipe';
  const saved=S.bookmarks.some(b=>b.id===id);
  const canSave=!streaming&&r.ingredients.length>0&&r.steps.length>0;
  const factor=factorNow();
  const seen={};
  const chips=[r.cuisine].concat(r.tags).filter(Boolean).map(s=>s.trim()).filter(function(s){ const k=s.toLowerCase(); if(seen[k]) return false; seen[k]=1; return true; }).slice(0,5);
  const stats=[['prep','Prep',r.prep],['cook','Cook',r.cook],['level','Difficulty',r.level],['kcal','Per serving',r.kcal?r.kcal+' kcal':'']].filter(x=>x[2]);

  let ingHTML='';
  if(r.ingredients.length){
    let last=null, open=false;
    r.ingredients.forEach(function(it,i){
      if(!open||it.group!==last){
        if(open) ingHTML+='</ul>';
        if(it.group) ingHTML+='<h3 class="ing-group">'+esc(it.group)+'</h3>';
        ingHTML+='<ul class="ing-list">'; open=true; last=it.group;
      }
      const q=fmtQty(it,factor,S.units);
      ingHTML+='<li><label class="ing"><input type="checkbox" data-ing="'+i+'"'+(S.ticked.has(i)?' checked':'')+'>'+
        '<span class="qty">'+esc(q)+'</span><span class="nm">'+esc(it.name)+(it.note?'<em>, '+esc(it.note)+'</em>':'')+'</span></label></li>';
    });
    if(open) ingHTML+='</ul>';
  }else{ ingHTML=skLines(5); }

  const stepsHTML=r.steps.length?
    '<ol class="steps">'+r.steps.map(function(s,i){
      return '<li><label class="step"><input class="vh" type="checkbox" data-step="'+i+'"'+(S.done.has(i)?' checked':'')+'><span class="n" aria-hidden="true">'+(i+1)+'</span><span class="t">'+esc(s)+'</span></label></li>';
    }).join('')+'</ol>'+(streaming?skLines(1):''):skLines(4);

  const serv=S.servings||r.serves||0;
  return '<article class="recipe" aria-busy="'+(streaming?'true':'false')+'">'+
    '<header class="rhead">'+
      '<div class="rhead-top">'+
        (S.from==='saved'?'<button type="button" class="back" data-action="back">'+ICON.left+'Bookmarks</button>':'')+
        chips.map(c=>'<span class="tag">'+esc(c)+'</span>').join('')+
      '</div>'+
      '<h1>'+esc(r.title)+'</h1>'+
      (r.about?'<p class="about">'+esc(r.about)+'</p>':'')+
      (stats.length?'<ul class="stats">'+stats.map(x=>'<li class="stat stat-'+x[0]+'"><b>'+esc(x[2])+'</b><span>'+x[1]+'</span></li>').join('')+'</ul>':'')+
      '<div class="rhead-actions"><button type="button" class="btn btn-primary" data-action="bookmark" aria-pressed="'+saved+'"'+(canSave?'':' disabled')+'>'+(saved?ICON.bmFill:ICON.bm)+'<span>'+(saved?'Bookmarked':'Bookmark')+'</span></button></div>'+
    '</header>'+
    '<div class="rbody">'+
      '<section class="panel ing-panel" aria-labelledby="ingH">'+
        '<h2 id="ingH">Ingredients</h2>'+
        (r.ingredients.length?
          '<div class="ctrl">'+
            '<div class="stepper" role="group" aria-label="Servings">'+
              '<button type="button" data-action="serv-dec" aria-label="Fewer servings"'+(serv<=1?' disabled':'')+'>−</button>'+
              '<span class="serv">'+serv+' serving'+(serv===1?'':'s')+'</span>'+
              '<button type="button" data-action="serv-inc" aria-label="More servings"'+(serv>=24?' disabled':'')+'>+</button>'+
            '</div>'+
            '<div class="seg" role="group" aria-label="Measurement units">'+
              '<button type="button" data-action="units-metric" aria-pressed="'+(S.units==='metric')+'">Metric</button>'+
              '<button type="button" data-action="units-us" aria-pressed="'+(S.units==='us')+'">US</button>'+
            '</div>'+
            '<button type="button" class="btn-ghost" data-action="copy">'+ICON.copy+'Copy list</button>'+
          '</div>':'')+
        ingHTML+
      '</section>'+
      '<div class="rcol">'+
        '<section class="panel" aria-labelledby="methH"><h2 id="methH">Method</h2>'+stepsHTML+
          (S.truncated?'<p class="cutoff">This recipe was cut short. Search again for the full version.</p>':'')+
        '</section>'+
        (r.tips.length?'<section class="tips" aria-labelledby="tipH"><h2 id="tipH">Good to know</h2><ul>'+r.tips.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></section>':'')+
      '</div>'+
    '</div>'+
  '</article>';
}

function focusKey(root){
  const a=document.activeElement; if(!a||!root.contains(a)||!a.dataset) return null;
  const ks=['action','ing','step'];
  for(let i=0;i<ks.length;i++){ if(a.dataset[ks[i]]!=null) return '[data-'+ks[i]+'="'+a.dataset[ks[i]]+'"]'; }
  return null;
}
function renderRecipe(){
  const m=$('#recipeMount'); if(!m) return;
  const fk=focusKey(m);
  let html;
  if(S.status==='loading') html=loadingHTML();
  else if(S.status==='error') html=errorHTML();
  else if(S.status==='streaming'){
    const p=parseRecipe(S.raw,false);
    if(p.error){
      S.status='error'; S.error={title:'Try a different search',msg:p.error,retry:false}; abortCtl('R');
      html=errorHTML();
    }else if(!p.title) html=loadingHTML();
    else{ S.recipe=p; if(!S.servings&&p.serves) S.servings=p.serves; html=recipeHTML(p,true); }
  }
  else if(S.status==='done'&&S.recipe) html=recipeHTML(S.recipe,false);
  else html='';
  m.innerHTML=html;
  if(fk){ const el=m.querySelector(fk); if(el&&!el.disabled) el.focus({preventScroll:true}); }
}

function renderMore(){
  const m=$('#moreMount'); if(!m) return;
  if(S.from!=='search'||S.view!=='recipe'){ m.innerHTML=''; return; }
  if(S.moreStatus==='loading'){
    let s=''; for(let i=0;i<6;i++) s+='<div class="sk sk-card"></div>';
    m.innerHTML='<div class="sec-head"><h2>More ideas</h2></div><div class="ideas-grid" aria-hidden="true">'+s+'</div>'; return;
  }
  if(S.moreStatus!=='done'){ m.innerHTML=''; return; }
  const cur=String(S.recipe&&S.recipe.title||'').toLowerCase();
  const items=S.more.map((x,i)=>({x:x,i:i})).filter(o=>o.x.title.toLowerCase()!==cur);
  if(!items.length){ m.innerHTML=''; return; }
  m.innerHTML='<div class="sec-head"><h2>More ideas for “'+esc(S.q)+'”</h2></div><div class="ideas-grid">'+
    items.map(function(o){
      return '<button type="button" class="idea-card" data-action="more" data-i="'+o.i+'">'+
        '<span class="em" aria-hidden="true">'+esc(String(o.x.emoji||'🍽️').slice(0,6))+'</span>'+
        '<span class="ti">'+esc(o.x.title)+'</span>'+
        '<span class="bl">'+esc(o.x.blurb||'')+'</span>'+
        '<span class="tm">'+esc(o.x.time||'')+'</span></button>';
    }).join('')+'</div>';
}

function renderSaved(){
  $('#savedCount').textContent=S.bookmarks.length?S.bookmarks.length+' saved':'';
  $('#savedFilter').hidden=S.bookmarks.length<5;
  renderSavedGrid();
}
function renderSavedGrid(){
  const m=$('#savedMount');
  if(!S.bookmarks.length){
    m.innerHTML='<div class="empty"><h2>No bookmarks yet</h2><p>Tap Bookmark on any recipe to keep it here. Bookmarked recipes open instantly.</p><button type="button" class="btn btn-primary" data-action="tab-search">Find a recipe</button></div>'+
      (store.ok?'':'<p class="note-warn">Your browser is blocking storage in this view, so bookmarks will be lost when you close the page.</p>');
    return;
  }
  const f=S.savedFilter.trim().toLowerCase();
  const list=f?S.bookmarks.filter(function(b){
    return (b.title+' '+(b.cuisine||'')+' '+b.tags.join(' ')+' '+b.ingredients.map(i=>i.name).join(' ')).toLowerCase().indexOf(f)>=0;
  }):S.bookmarks;
  if(!list.length){ m.innerHTML='<div class="empty"><h2>No matches</h2><p>Nothing in your bookmarks matches “'+esc(S.savedFilter)+'”.</p></div>'; return; }
  m.innerHTML='<div class="bm-grid">'+list.map(bmCard).join('')+'</div>'+
    (store.ok?'':'<p class="note-warn">Your browser is blocking storage in this view, so bookmarks will be lost when you close the page.</p>');
}

/* ---------- Google box and email ---------- */
const MAIL_HINT='Your servings and units are included.';
const saveMailPrefs=()=>store.set(KEY_EM,{to:S.mailPrefs.to,auto:!!S.mailPrefs.auto});
const footText=()=>(S.cfg.grounded?'Recipes are written by AI from Google Search results':'Recipes are generated by AI')+' and can contain mistakes. Always check ingredients for allergens and cook meat, poultry and fish to safe temperatures.';

function renderExtras(){ renderGoogle(); renderMail(); }

/* Shows the pages Google Search used, plus the search suggestions Google asks apps to display with
   a grounded answer. Google's HTML is shown untouched inside a sandboxed frame with scripts off. */
function renderGoogle(){
  const m=$('#googleMount'); if(!m) return;
  const g=S.google;
  if(S.view!=='recipe'||S.status!=='done'||S.from!=='search'||!g){ m.innerHTML=''; return; }
  const src=g.sources.slice(0,5);
  m.innerHTML='<section class="gbox" aria-labelledby="gH"><h2 id="gH">Found with Google</h2>'+
    '<p class="gnote">Google Search found these pages and Gemini wrote the recipe from them.</p>'+
    (src.length?'<ul class="gsrc" aria-label="Pages Google used">'+src.map(function(x){ return '<li><a href="'+esc(x.uri)+'" target="_blank" rel="noopener noreferrer">'+esc(x.title||'Source')+'</a></li>'; }).join('')+'</ul>':'')+
    (g.suggest?'<div class="gsug-wrap"></div>':'')+'</section>';
  const wrap=$('.gsug-wrap',m);
  if(!wrap) return;
  const fr=document.createElement('iframe');
  fr.className='gsug'; fr.title='Google Search suggestions';
  fr.setAttribute('sandbox','allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  fr.srcdoc='<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><base target="_blank"><style>html,body{margin:0;background:transparent}</style></head><body>'+g.suggest+'</body></html>';
  fr.addEventListener('load',function(){ try{ const h=fr.contentDocument.documentElement.scrollHeight; if(h>20) fr.style.height=Math.min(h,220)+'px'; }catch(e){} });
  wrap.appendChild(fr);
}

function renderMail(){
  const m=$('#mailMount'); if(!m) return;
  if(!S.cfg.email||S.view!=='recipe'||S.status!=='done'||S.from!=='search'||!S.mail){ m.innerHTML=''; return; }
  const p=S.mailPrefs;
  m.innerHTML='<section class="mailbox" aria-labelledby="mailH"><h2 id="mailH">Get this recipe by email</h2>'+
    '<form id="mailForm" novalidate>'+
      '<div class="mail-row">'+
        '<label class="sr-only" for="mailTo">Your email address</label>'+
        '<input id="mailTo" type="email" name="email" autocomplete="email" inputmode="email" enterkeyhint="send" placeholder="you@example.com" maxlength="254" value="'+esc(p.to)+'">'+
        '<button class="btn btn-primary" id="mailSend" type="submit">'+ICON.mail+'<span>Send recipe</span></button>'+
      '</div>'+
      '<label class="check"><input type="checkbox" id="mailAuto"'+(p.auto?' checked':'')+'><span>Send me every recipe I find</span></label>'+
      '<p class="mail-note" id="mailNote" role="status" aria-live="polite"></p>'+
    '</form></section>';
  if(S.mail.sent&&validEmail(p.to)) setMailStatus('sent','Sent to '+p.to+'.');
  else if(p.auto&&validEmail(p.to)) setMailStatus('','Every new recipe you find is sent to '+p.to+'.');
  else setMailStatus('',MAIL_HINT);
}
function setMailStatus(kind,msg){
  const n=$('#mailNote'), b=$('#mailSend');
  if(n){ n.textContent=msg||''; if(kind) n.dataset.kind=kind; else delete n.dataset.kind; }
  if(b){ b.disabled=kind==='sending'; const sp=b.querySelector('span'); if(sp) sp.textContent=kind==='sending'?'Sending…':(kind==='sent'?'Send again':'Send recipe'); }
}
function mailErrText(e){
  const M={
    bad_address:'That email address doesn’t look right. Check it and try again.',
    rate_limited:'That’s a lot of emails in an hour. Try again a little later.',
    address_limit:'That address has reached today’s email limit. Try again tomorrow.',
    email_capacity:'Email is at its limit for today. Try again tomorrow.',
    expired:'This recipe is too old to email. Search for it again to send it.',
    unavailable:'Email isn’t set up on this site.',
    network:'Couldn’t reach the site. Check your connection and try again.'
  };
  return M[e&&e.code]||'The email didn’t go out. Try again in a minute.';
}
async function sendMail(auto){
  const m=S.mail; if(!m||S.mailBusy||!S.cfg.email) return;
  const input=$('#mailTo');
  const to=String(auto?S.mailPrefs.to:(input?input.value:'')).trim();
  if(!validEmail(to)){
    if(!auto){ setMailStatus('error','Enter a valid email address, like name@example.com.'); if(input) input.focus(); }
    return;
  }
  S.mailBusy=true; setMailStatus('sending','Sending…');
  try{
    await apiEmail({to:to,recipe:m.recipe,ts:m.ts,sig:m.sig,servings:S.servings||0,units:S.units});
    m.sent=true;
    if(!auto){ const box=$('#mailAuto'); S.mailPrefs={to:to,auto:box?box.checked:S.mailPrefs.auto}; saveMailPrefs(); }
    if(S.mail===m) setMailStatus('sent','Sent to '+to+'. If it doesn’t show up soon, check your spam folder.');
    if(auto) toast('Recipe sent to '+to);
  }catch(e){
    const msg=mailErrText(e);
    if(S.mail===m) setMailStatus('error',msg);
    if(auto) toast(msg);
  }finally{ S.mailBusy=false; }
}
/* With "Send me every recipe I find" on, each new recipe goes out as soon as it is ready. */
function autoMail(){
  const p=S.mailPrefs;
  if(S.cfg.email&&p.auto&&validEmail(p.to)&&S.mail&&!S.mail.sent) sendMail(true);
}

/* ---------- events ---------- */
let filterT;
function filtersChanged(){
  if(S.view==='recipe'&&S.from==='search'&&S.q){ clearTimeout(filterT); filterT=setTimeout(function(){ search(S.q); },700); }
}
document.addEventListener('click',function(e){
  const t=e.target.closest('[data-action]'); if(!t||t.disabled) return;
  const a=t.dataset.action;
  if(a==='home'){ S.view='home'; S.lastSearchView='home'; render(); window.scrollTo(0,0); }
  else if(a==='tab-search'){ S.view=S.lastSearchView; render(); window.scrollTo(0,0); if(S.view==='home') $('#q').focus({preventScroll:true}); }
  else if(a==='tab-saved'){ S.view='saved'; render(); window.scrollTo(0,0); }
  else if(a==='idea'){ search(t.dataset.q); }
  else if(a==='surprise'){ const pick=IDEAS[Math.floor(Math.random()*IDEAS.length)]; search(pick[1]); }
  else if(a==='filter'){ const k=t.dataset.key; if(S.filters.has(k)) S.filters.delete(k); else S.filters.add(k); renderFilters(); filtersChanged(); }
  else if(a==='more'){ openIdea(+t.dataset.i); }
  else if(a==='retry'){ if(S.lastKind==='search') search(S.q); else startRecipe(S.rq); }
  else if(a==='bookmark'){ toggleBookmark(); }
  else if(a==='unbookmark'){ removeBookmark(t.dataset.id); }
  else if(a==='open-bm'){ openBookmark(t.dataset.id); }
  else if(a==='back'){ S.view='saved'; render(); window.scrollTo(0,0); }
  else if(a==='serv-dec'){ setServings((S.servings||1)-1); }
  else if(a==='serv-inc'){ setServings((S.servings||1)+1); }
  else if(a==='units-metric'){ setUnits('metric'); }
  else if(a==='units-us'){ setUnits('us'); }
  else if(a==='copy'){ copyList(); }
  else if(a==='toast-act'){ const fn=S.toastFn; S.toastFn=null; hideToast(); if(fn) fn(); }
});
document.addEventListener('change',function(e){
  const t=e.target; if(!t||!t.dataset) return;
  if(t.dataset.ing!=null){ const i=+t.dataset.ing; if(t.checked) S.ticked.add(i); else S.ticked.delete(i); }
  else if(t.dataset.step!=null){ const i=+t.dataset.step; if(t.checked) S.done.add(i); else S.done.delete(i); }
  else if(t.id==='mailAuto'){
    const input=$('#mailTo'), to=input?input.value.trim():'';
    if(t.checked){
      if(!validEmail(to)){ t.checked=false; setMailStatus('error','Add your email address first, then turn this on.'); if(input) input.focus(); return; }
      S.mailPrefs={to:to,auto:true}; saveMailPrefs();
      setMailStatus('','Every new recipe you find is sent to '+to+'.');
    }else{
      S.mailPrefs={to:S.mailPrefs.to,auto:false}; saveMailPrefs();
      setMailStatus('',MAIL_HINT);
    }
  }
  else if(t.id==='mailTo'){
    if(S.mailPrefs.auto&&validEmail(t.value)){
      S.mailPrefs={to:t.value.trim(),auto:true}; saveMailPrefs();
      setMailStatus('','Every new recipe you find is sent to '+S.mailPrefs.to+'.');
    }
  }
});
$('#searchForm').addEventListener('submit',function(e){
  e.preventDefault();
  search($('#q').value);
  if(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches) $('#q').blur();
});
$('#savedFilter').addEventListener('input',function(e){ S.savedFilter=e.target.value; renderSavedGrid(); });
document.addEventListener('submit',function(e){
  if(!e.target||e.target.id!=='mailForm') return;
  e.preventDefault();
  sendMail(false);
});

/* ---------- init ---------- */
renderFilters();
render();
/* Ask the server which optional features are switched on (email, Google Search). */
fetch('/api/config').then(function(r){ return r.ok?r.json():null; }).then(function(c){
  if(!c) return;
  S.cfg={email:!!c.email,grounded:!!c.grounded};
  render();
}).catch(function(){});
})();
