(() => {
const BOARDS = [
  {id:"aqa", tag:"AQA", full:"AQA", c:"var(--pink)"},
  {id:"edexcel", tag:"EDEXCEL", full:"Pearson Edexcel", c:"var(--blue)"},
  {id:"ocr", tag:"OCR", full:"OCR", c:"var(--green)"},
  {id:"eduqas", tag:"EDUQAS", full:"WJEC Eduqas", c:"var(--purple)"},
  {id:"ccea", tag:"CCEA", full:"CCEA (N. Ireland)", c:"var(--teal)"},
  {id:"btec", tag:"BTEC", full:"Pearson BTEC", c:"var(--orange)"}
];
const SUBJECTS = [
  ["english-lang","English Language","Core"],["english-lit","English Literature","Core"],["maths","Maths","Core"],
  ["combined-science","Combined Science","Core"],["biology","Biology","Sciences"],["chemistry","Chemistry","Sciences"],["physics","Physics","Sciences"],
  ["pe","Physical Education","Options"],["computer-science","Computer Science","Options"],["history","History","Options"],["geography","Geography","Options"],
  ["religious-studies","Religious Studies","Options"],["business","Business","Options"],["psychology","Psychology","Options"],["sociology","Sociology","Options"],
  ["media","Media Studies","Options"],["citizenship","Citizenship","Options"],["statistics","Statistics","Options"],["food","Food Prep & Nutrition","Options"],["health-social-care","Health & Social Care","Options"],
  ["french","French","Languages"],["spanish","Spanish","Languages"],["german","German","Languages"],
  ["art","Art & Design","Creative"],["dt","Design & Technology","Creative"],["drama","Drama","Creative"],["music","Music","Creative"],["dance","Dance","Creative"]
].map(([id,name,group])=>({id,name,group}));
const PALETTE = ["var(--blue)","var(--pink)","var(--green)","var(--orange)","var(--purple)","var(--teal)"];
const SUBJ_C = {biology:"var(--green)", pe:"var(--blue)", "health-social-care":"var(--pink)", chemistry:"var(--orange)", physics:"var(--purple)", maths:"var(--pink)", "combined-science":"var(--teal)"};
const SUBJ_ICON = {biology:"🧬", pe:"🏃", chemistry:"⚗️", physics:"⚛️", maths:"➗", "combined-science":"🔬", "english-lang":"✍️", "english-lit":"📚", history:"🏛️", geography:"🌍", "computer-science":"💻", psychology:"🧠", business:"📈", "health-social-care":"🩺"};
const subjColor = id => SUBJ_C[id] || PALETTE[Math.abs([...id].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7))%6];
const mono = n => n.replace(/&/g,"").split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
const boardById = id => BOARDS.find(b=>b.id===id);
const subjById = id => SUBJECTS.find(s=>s.id===id) || {id, name:id, group:"Other"};
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60) || "x";
const $ = s => document.querySelector(s);

const store = (k,v) => { try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v);}catch(e){ return null; } };

const state = { view:"home", social:{}, board:store("htg-board")||null, subject:null, q:"", scope:"all", videos:[], loaded:false, dbOk:true, canEdit:false };

/* ---------- data ---------- */
const colorFor = v => PALETTE[((v.number||0)+5)%6];
const srcOf = v => v.file || null;
const ytId = u => { if(!u) return null; const m=String(u).match(/(?:shorts\/|youtu\.be\/|[?&]v=|embed\/)([A-Za-z0-9_-]{11})/); return m?m[1]:null; };
const isReady = v => !!(v.file||v.youtube||v.tiktok||v.link);
const inScope = (v,b,s) => (!b||v.board===b) && (!s||v.subject===s);
function sortVids(a,b){ return (a.paper||"").localeCompare(b.paper||"") || (a.order??999)-(b.order??999) || (a.title||"").localeCompare(b.title||""); }
const countFor = (b,s) => state.videos.filter(v=>inScope(v,b,s)).length;
const readyFor = (b,s) => state.videos.filter(v=>inScope(v,b,s) && (isReady(v))).length;

/* ---------- search ---------- */
const norm = s => String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
function search(q){
  const toks = norm(q).split(/[^a-z0-9%.]+/).filter(t=>t.length>0);
  if(!toks.length) return [];
  const pool = state.videos.filter(v => state.scope==="all" || inScope(v,state.board,state.scope==="subject"?state.subject:null));
  const out=[];
  for(const v of pool){
    const f = {
      title:norm(v.title), code:norm(v.code)+" "+norm(v.spec), kw:norm(v.keywords), sec:norm(v.section),
      quiz:norm((v.quiz||[]).map(x=>x.q+" "+x.a).join(" ")), meta:norm(subjById(v.subject).name+" "+(boardById(v.board)?.full||"")+" "+v.paper+" "+(v.mnemonic||""))
    };
    let score=0, ok=true;
    for(const t of toks){
      let s=0;
      if(f.title.includes(t)) s+= f.title.split(/\s+/).some(w=>w.startsWith(t))?12:6;
      if(f.code.includes(t)) s+=8;
      if(f.kw.includes(t)) s+= (" "+f.kw).includes(" "+t)?5:2;
      if(f.sec.includes(t)) s+=2;
      if(f.quiz.includes(t)) s+=2;
      if(f.meta.includes(t)) s+=1;
      if(!s){ok=false;break;}
      score+=s;
    }
    if(ok) out.push({v,score,toks});
  }
  return out.sort((a,b)=>b.score-a.score).slice(0,60);
}
function hilite(text,toks){
  let h=esc(text);
  for(const t of toks){ if(t.length<2) continue; h=h.replace(new RegExp("("+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig"),"<mark>$1</mark>"); }
  return h;
}
function hitWords(v,toks){
  const words = String(v.keywords||"").split(/\s+/);
  const hits = new Set();
  // rebuild multi-word phrases around matches
  words.forEach((w,i)=>{ if(toks.some(t=>t.length>1 && norm(w).includes(t))){ hits.add(w); } });
  const qh = (v.quiz||[]).filter(x=>toks.some(t=>t.length>2 && norm(x.q+" "+x.a).includes(t))).map(x=>"Quiz: "+x.q);
  return {kw:[...hits].slice(0,6), quiz:qh.slice(0,1)};
}

/* ---------- render ---------- */
function crumbs(){
  return `<nav class="crumbs" aria-label="Breadcrumb"><button data-go="home">All subjects</button><span>›</span><span>${esc(subjById(state.subject).name)}</span></nav>`;
}
function stepsHTML(n){ return `<div class="steps"><span class="step ${n===1?"on":""}">1 · Pick a subject</span><span class="step ${n===2?"on":""}">2 · Watch & quiz</span></div>`; }
const qualOf = vids => (vids.find(v=>v.qual)||{}).qual || "GCSE";
const papersLabel = vids => { const ps=[...new Set(vids.map(v=>v.paper).filter(Boolean))].sort(); return ps.length>1 ? "Papers "+ps.map(p=>p.replace(/^Paper\s*/i,"")).join(" & ") : (ps[0]||""); };
const boardLine = (boardId, vids) => [ (boardById(boardId)?.full||boardId)+" "+qualOf(vids), papersLabel(vids) ].filter(Boolean).join(" · ");

function homeGroups(){
  const g = {};
  state.videos.forEach(v=>{ const k=v.board+"|"+v.subject; (g[k] ||= {board:v.board, subject:v.subject, vids:[]}).vids.push(v); });
  return Object.values(g).map(x=>({...x, latest:Math.max(0,...x.vids.map(v=>Date.parse(v.added)||0))}))
    .sort((a,b)=> b.latest-a.latest || subjById(a.subject).name.localeCompare(subjById(b.subject).name));
}

function renderHome(){
  const groups = homeGroups(), total = state.videos.length;
  const week = 7*864e5;
  const cards = groups.map(g=>{ const s=subjById(g.subject), n=g.vids.length, r=g.vids.filter(isReady).length;
    const fresh = g.latest && Date.now()-g.latest < week;
    return `<button class="scard" data-subject="${esc(g.subject)}" data-sboard="${esc(g.board)}" style="--c:${subjColor(g.subject)}">
      ${fresh?`<span class="new">NEW</span>`:""}
      <span class="ic" aria-hidden="true">${SUBJ_ICON[g.subject]||esc(mono(s.name))}</span>
      <span class="nm">${esc(s.name)}</span>
      <span class="st">${esc(boardLine(g.board,g.vids))}</span>
      <span class="meta"><b>${n}</b> video${n===1?"":"s"}${r<n?` · ${r} ready`:""} · quiz with every one</span>
    </button>`; }).join("");
  const tt = state.social.tiktok;
  return `
  <section class="hero">
    <svg class="logo" viewBox="0 0 200 200" role="img" aria-label="Hack the GCSEs logo"><use href="#logo"/></svg>
    <div>
      <h1>HACK <span class="the">THE</span> GCSEs</h1>
      <p>Short videos. Quick quizzes. Make the <span class="max">MAX</span> of your time.</p>
      ${stepsHTML(1)}
    </div>
  </section>
  <section class="home-subjects" aria-labelledby="subjT">
    <h2 class="sec" id="subjT">Pick your subject</h2>
    <p class="sub">${total?`<b>${total}</b> videos so far, each with a quick quiz.`:"Videos on the way."}</p>
    ${groups.length?`<div class="scards">${cards}</div>`:""}
    <p class="more">More subjects on the way.${tt?` <a href="${esc(tt)}" target="_blank" rel="noopener">Follow @hackexams on TikTok</a> to see them first.`:""}</p>
  </section>`;
}

function vcard(v){
  const ready = isReady(v);
  return `<button class="vcard" data-vid="${esc(v._id)}">
    <div class="thumb ${ready?"":"pending"}" style="--c:${colorFor(v)}">
      <span class="no">${esc(v.code||"VIDEO")}</span>
      <span class="tt">${esc(v.title)}</span>
      ${ready?`<span class="play"><svg width="18" height="18"><use href="#i-play"/></svg></span>`:`<span class="soon">Coming soon</span>`}
    </div>
    <span class="cap"><span>${esc(v.spec||"")}</span><span>${v.youtube?"Shorts":v.tiktok?"TikTok":""}</span></span>
  </button>`;
}

function renderSubject(){
  const b=boardById(state.board), s=subjById(state.subject);
  const vids = state.videos.filter(v=>inScope(v,b.id,s.id)).sort(sortVids);
  const papers = {};
  vids.forEach(v=>{ const p=v.paper||"Videos"; const sec=v.section||"Videos"; ((papers[p] ||= {})[sec] ||= []).push(v); });
  return `${crumbs()}
  <div class="subjhead">
    <div><h2>${esc(s.name)}</h2><p class="subt">${esc(boardLine(b.id,vids))} · ${vids.length} video${vids.length===1?"":"s"}</p></div>
    <button class="btn small" id="shareSubj">Share this subject</button>
  </div>
  ${stepsHTML(2)}
  ${vids.length? Object.entries(papers).map(([p,secs])=>`
    <div class="grouphead">${esc(p)}</div>
    ${Object.entries(secs).map(([sec,list])=>`<div class="section-h"><h3>${esc(sec)}</h3><span class="ln"></span></div><div class="vgrid">${list.map(vcard).join("")}</div>`).join("")}
  `).join("") : `<div class="empty-note"><b>No videos yet</b>Check back soon, they're on the way.</div>`}`;
}

function renderSearch(){
  const res = search(state.q);
  const toks = norm(state.q).split(/[^a-z0-9%.]+/).filter(Boolean);
  const subjHits = SUBJECTS.filter(s=>toks.length && toks.every(t=>norm(s.name).includes(t)));
  const scopeBtns = (state.view==="subject" && state.subject) ? `<div class="scope" role="group" aria-label="Search in">
      <button data-scope="all" aria-pressed="${state.scope==="all"}">Everywhere</button>
      <button data-scope="subject" aria-pressed="${state.scope==="subject"}">${esc(subjById(state.subject).name)} only</button>
    </div>`:"";
  return `
  <h2 class="sec">Results for “${esc(state.q)}”</h2>
  <p class="sub">${res.length} video${res.length===1?"":"s"} found</p>
  ${scopeBtns}
  ${subjHits.length?`<div class="jump">${subjHits.map(s=>`<button class="btn small" data-jump="${s.id}">Go to ${esc(s.name)} →</button>`).join("")}</div>`:""}
  <div class="results">
    ${res.map(({v})=>{ const h=hitWords(v,toks); const b=boardById(v.board);
      return `<button class="res" data-vid="${esc(v._id)}">
        <span class="mini" style="--c:${colorFor(v)}">${esc((v.code||"").replace(/^P\d-/,"")||"▶")}</span>
        <span><span class="t">${hilite(v.title,toks)}</span><br>
          <span class="w">${esc(b?.tag||v.board)} · ${esc(subjById(v.subject).name)} · ${esc(v.paper||"")} · ${hilite((v.code||"")+" "+(v.spec||""),toks)}</span>
          ${(h.kw.length||h.quiz.length)?`<div class="hits">${h.kw.map(w=>hilite(w,toks)).join(", ")}${h.quiz.length?`${h.kw.length?" · ":""}${hilite(h.quiz[0],toks)}`:""}</div>`:""}
        </span>
        <span class="pill">${isReady(v)?"Watch":"Soon"}</span>
      </button>`}).join("")}
  </div>
  ${!res.length?`<div class="empty-note"><b>Nothing yet</b>Try a single key word like <i>osmosis</i>, <i>mitosis</i> or <i>femur</i>.</div>`:""}`;
}

function render(){
  const app=$("#app");
  if(state.q.trim()) app.innerHTML = renderSearch();
  else if(state.view==="subject" && state.board && state.subject) app.innerHTML = renderSubject();
  else { state.view="home"; app.innerHTML = renderHome(); }
  if(!state.loaded && state.dbOk) app.insertAdjacentHTML("beforeend",`<p class="loading">Loading the video library…</p>`);
  if(!state.dbOk) app.insertAdjacentHTML("beforeend",`<div class="empty-note" style="margin-top:20px"><b>Library offline</b>Couldn't load the video list. Check your connection and refresh.</div>`);
}

function go(view){ state.view=view; if(view==="home") state.scope="all"; state.q=""; $("#q").value=""; $("#qClear").hidden=true; render(); window.scrollTo({top:0}); }

/* ---------- player ---------- */
let currentVid=null;
function openPlayer(id){
  const v = state.videos.find(x=>x._id===id); if(!v) return;
  currentVid=v;
  const src=srcOf(v);
  const yt=ytId(v.youtube);
  const box = yt ? `<div class="vidbox"><iframe src="https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1&modestbranding=1" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen style="width:100%;height:100%;border:0"></iframe></div>`
    : src ? `<div class="vidbox"><video controls playsinline autoplay preload="metadata" src="${esc(src)}"></video></div>`
    : `<div class="vidbox none" style="--c:${colorFor(v)}"><div><div style="font-family:var(--display);font-size:28px;line-height:1">${esc(v.title)}</div><p>${(v.tiktok||v.link)?"Watch this one on TikTok.":"Video coming soon. Try the quiz below!"}</p>${(v.tiktok||v.link)?`<a class="btn yellow" href="${esc(v.tiktok||v.link)}" target="_blank" rel="noopener">Watch it ↗</a>`:""}</div></div>`;
  const kws = String(v.keywords||"").split(/\s+/).filter(w=>w.length>3).slice(0,14);
  $("#playerSheet").innerHTML = `
    ${box}
    <div class="info">
      <button class="x" data-close="playerOv" aria-label="Close">×</button>
      <div class="code">${esc(boardById(v.board)?.tag||"")} · ${esc(subjById(v.subject).name)} · ${esc(v.paper||"")} · ${esc(v.code||"")} ${esc(v.spec||"")}</div>
      <h4 id="pTitle">${esc(v.title)}</h4>
      ${(v.youtube||v.tiktok)?`<div class="admin-bar" style="margin:0 0 12px">${v.youtube?`<a class="btn small" href="${esc(v.youtube)}" target="_blank" rel="noopener">▶ YouTube Shorts ↗</a>`:""}${v.tiktok?`<a class="btn small" href="${esc(v.tiktok)}" target="_blank" rel="noopener">♪ TikTok ↗</a>`:""}</div>`:""}
      ${v.mnemonic?`<div><span class="mnem">Remember: ${esc(v.mnemonic)}</span></div>`:""}
      ${(v.quiz||[]).length?`<div class="quiz"><h5>Quick quiz</h5>${v.quiz.map((x,i)=>`<div class="q"><div class="qq">${i+1}. ${esc(x.q)}</div><button data-reveal="${i}">Show answer</button><div class="aa" hidden>${esc(x.a)}</div></div>`).join("")}</div>`:""}
      ${kws.length?`<div class="kw">${kws.map(k=>`<span>${esc(k)}</span>`).join("")}</div>`:""}
      <div class="admin-bar"><button class="btn small" id="shareVid">Copy link to this video</button></div>
    </div>`;
  $("#playerOv").hidden=false;
  history.replaceState(null,"","#"+v.id);
  document.title = v.title+" · Hack Exams";
}
function closePlayer(){ const vid=$("#playerSheet video"); if(vid) vid.pause(); if(location.hash) history.replaceState(null,"",location.pathname); document.title="Hack the GCSEs · Hack Exams"; $("#playerOv").hidden=true; $("#playerSheet").innerHTML=""; }

/* ---------- install prompt (phones) ---------- */
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); deferredPrompt=e; });
function maybeInstall(){
  const phone = matchMedia("(pointer:coarse)").matches && Math.min(screen.width,screen.height) < 820;
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if(!phone || standalone || store("htg-install")==="no") return;
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const steps = ios
    ? `<ol><li>Tap the <b>Share</b> button <span aria-hidden="true">⬆︎</span> in Safari</li><li>Choose <b>Add to Home Screen</b></li><li>Tap <b>Add</b></li></ol>`
    : `<ol><li>Tap the browser menu <b>⋮</b></li><li>Choose <b>Install app</b> or <b>Add to Home screen</b></li></ol>`;
  $("#installSlot").innerHTML = `<div class="install" role="dialog" aria-labelledby="insT">
    <svg viewBox="0 0 200 200" aria-hidden="true"><use href="#logo"/></svg>
    <div><h4 id="insT">Get the Hack the GCSEs app?</h4>
      <p>Add it to your home screen and revise in one tap.</p>
      <div id="insSteps" hidden>${steps}</div>
      <div class="acts"><button class="btn primary small" id="insYes">Download app</button><button class="btn small" id="insNo">Not now</button></div>
    </div></div>`;
  $("#insNo").onclick=()=>{ store("htg-install","no"); $("#installSlot").innerHTML=""; };
  $("#insYes").onclick=async()=>{
    if(deferredPrompt){ deferredPrompt.prompt(); try{ await deferredPrompt.userChoice; }catch(e){} deferredPrompt=null; $("#installSlot").innerHTML=""; store("htg-install","no"); }
    else { $("#insSteps").hidden=false; $("#insYes").hidden=true; $("#insNo").textContent="Done"; }
  };
}

function copy(t){ (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast("Link copied"),()=>toast(t)); }
/* ---------- toast ---------- */
let tt; function toast(m){ $("#toastSlot").innerHTML=`<div class="toast" role="status">${esc(m)}</div>`; clearTimeout(tt); tt=setTimeout(()=>$("#toastSlot").innerHTML="",2600); }

/* ---------- events ---------- */
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-subject],[data-vid],[data-go],[data-close],[data-reveal],[data-scope],[data-jump],#homeBtn,#shareVid,#shareSubj");
  if(!t) { if(e.target.classList.contains("overlay")){ if(e.target.id==="playerOv") closePlayer(); else e.target.hidden=true; } return; }
  if(t.dataset.subject){ state.subject=t.dataset.subject; if(t.dataset.sboard){ state.board=t.dataset.sboard; store("htg-board",state.board); } go("subject"); }
  else if(t.dataset.vid){ openPlayer(t.dataset.vid); }
  else if(t.dataset.go){ go(t.dataset.go); }
  else if(t.dataset.close){ if(t.dataset.close==="playerOv") closePlayer(); else $("#"+t.dataset.close).hidden=true; }
  else if(t.dataset.reveal!==undefined){ t.hidden=true; t.nextElementSibling.hidden=false; }
  else if(t.dataset.scope){ state.scope=t.dataset.scope; render(); }
  else if(t.dataset.jump){ const sj=t.dataset.jump; state.subject=sj; state.board = t.dataset.jboard || (countFor(state.board,sj) ? state.board : (state.videos.find(v=>v.subject===sj)||{}).board) || "aqa"; store("htg-board",state.board); go("subject"); }
  else if(t.id==="homeBtn"){ go("home"); }
  else if(t.id==="shareVid"){ copy(location.origin+location.pathname+"#"+currentVid.id); }
  else if(t.id==="shareSubj"){ const first=state.videos.find(v=>inScope(v,state.board,state.subject)); copy(location.origin+location.pathname+(first?"#"+first.id:"")); }
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && !$("#playerOv").hidden) closePlayer(); });
let qt; $("#q").addEventListener("input",e=>{ clearTimeout(qt); qt=setTimeout(()=>{ state.q=e.target.value; $("#qClear").hidden=!state.q; render(); },120); });
$("#qClear").onclick=()=>{ state.q=""; $("#q").value=""; $("#qClear").hidden=true; render(); $("#q").focus(); };
/* ---------- boot ---------- */
render();
setTimeout(maybeInstall,1500);
Promise.all([fetch("videos.json",{cache:"no-cache"}).then(r=>r.json()),fetch("links.json",{cache:"no-cache"}).then(r=>r.ok?r.json():{}).catch(()=>({}))]).then(([d,extra])=>{
  state.videos=(d.videos||[]).map(v=>({...v,...(extra[v.id]||{}),_id:v.id}));
  state.social=d.social||{}; state.loaded=true; render();
  const s=state.social, links=[["youtube","▶ YouTube"],["tiktok","♪ TikTok"],["instagram","◎ Instagram"]].filter(([k])=>s[k]);
  $("#social").innerHTML = links.map(([k,l])=>`<a class="btn small" href="${esc(s[k])}" target="_blank" rel="noopener">${l}</a>`).join("");
  const h=location.hash.slice(1); if(h){ const v=state.videos.find(x=>x.id===h); if(v){ state.board=v.board; state.subject=v.subject; state.view="subject"; render(); openPlayer(v.id);} }
}).catch(()=>{ state.dbOk=false; render(); });
if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{})); }
})();
