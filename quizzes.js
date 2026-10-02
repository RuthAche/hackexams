// "Take a quiz" on the front page: every video's quiz, grouped by subject and paper,
// each labelled with the video it belongs to. Plus a mixed quiz per subject.
// Deep links: hackexams.co.uk/#quiz-<video id>  or  #quiz-mix-<board>-<subject>
(() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ytId = u => { const m = String(u || "").match(/(?:shorts\/|youtu\.be\/|[?&]v=|embed\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : null; };
  const SUBJ = { pe: "Physical Education", biology: "Biology", "health-social-care": "Health & Social Care" };
  const ICON = { pe: "🏃", biology: "🧬", "health-social-care": "🩺" };
  const COL = { pe: "var(--blue)", biology: "var(--green)", "health-social-care": "var(--pink)" };
  const BOARD = { aqa: "AQA", edexcel: "Edexcel", ocr: "OCR", eduqas: "Eduqas", ccea: "CCEA", btec: "BTEC" };
  const MIX = 10;
  const $ = s => document.querySelector(s);
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  const best = store("htg-quiz-best") || {};
  let tab = store("htg-quiz-tab");

  const css = document.createElement("style");
  css.textContent = `
.quizzes{margin:4px 0 34px;scroll-margin-top:16px}
#subjT,#quizT{scroll-margin-top:16px}
button.step{cursor:pointer}
button.step.quizgo{background:var(--pink);color:#fff}
.qtabs{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 14px}
.qtabs button{border:2px solid var(--ink);border-radius:999px;padding:7px 14px;font-weight:600;background:var(--card);box-shadow:var(--shadow);font-size:15px}
.qtabs button[aria-selected="true"]{background:var(--c);color:#fff}
.qmix{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border:2.5px dashed var(--ink);border-radius:16px;padding:12px 14px;background:var(--card2);margin-bottom:6px}
.qmix p{margin:0;flex:1 1 220px;font-size:15px}
.qmix b{font-family:var(--display);font-weight:400;font-size:20px;letter-spacing:.5px}
.qgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr));gap:10px}
.qtile{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;text-align:left;border:2px solid var(--ink);border-radius:14px;background:var(--card);padding:8px 10px 8px 8px;box-shadow:var(--shadow);min-height:62px;transition:transform .08s}
.qtile:hover{transform:translateY(-1px)}
.qtile .cd{width:46px;height:46px;border-radius:10px;background:var(--c);border:2px solid var(--ink);color:#fff;font-family:var(--display);font-size:13px;display:grid;place-items:center;padding-top:2px;line-height:1;text-align:center}
.qtile .nm{font-weight:600;line-height:1.2;min-width:0;overflow-wrap:anywhere}
.qtile .nm small{display:block;font-weight:500;font-size:12px;color:var(--muted);margin-top:2px}
.qtile .sc{font-size:12px;font-weight:700;border:2px solid var(--ink);border-radius:999px;padding:1px 8px;background:var(--card2);white-space:nowrap}
.qtile .sc.done{background:var(--green);color:#fff}
.qz .vid{display:flex;gap:12px;align-items:center;border:2px solid var(--ink);border-radius:14px;padding:8px;background:var(--card2);margin:10px 0 14px}
.qz .vid .th{flex:none;width:52px;aspect-ratio:9/16;border-radius:8px;border:2px solid var(--ink);background:var(--c) center/cover no-repeat}
.qz .vid div{flex:1;min-width:0;font-size:14px;line-height:1.3}
.qz .vid b{display:block;font-size:15px}
.qz .lbl{font-size:13px;font-weight:700;color:var(--muted)}
.qz h3{margin:4px 0 0!important;line-height:1}
.qz .bar{height:10px;border:2px solid var(--ink);border-radius:999px;background:var(--card2);overflow:hidden;margin:4px 0 14px}
.qz .bar i{display:block;height:100%;background:var(--yellow);transition:width .25s}
.qz .qnum{font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.qz .from{font-size:12px;color:var(--muted);margin-top:2px}
.qz .qtext{font-family:var(--display);font-weight:400;font-size:clamp(22px,4.5vw,28px);line-height:1.08;letter-spacing:.3px;margin:6px 0 14px}
.qz .ans{font-family:var(--hand);font-size:24px;line-height:1.2;color:var(--green);background:var(--hl);border-radius:10px;padding:8px 12px;margin-bottom:14px}
.qz .acts{display:flex;gap:10px;flex-wrap:wrap}
.qz .acts .btn{flex:1 1 140px}
.qz .btn.good{background:var(--green);color:#fff}
.qz .btn.bad{background:var(--card2)}
.qz .score{font-family:var(--display);font-size:56px;line-height:1;margin:8px 0 2px}
.qz .verdict{font-family:var(--hand);font-size:24px;margin:0 0 14px;color:var(--muted)}
.qz .miss{margin:0 0 14px;padding-left:20px;font-size:15px}
.qz .miss li{margin-bottom:6px}
.qz .miss span{color:var(--green);font-family:var(--hand);font-size:19px}`;
  document.head.appendChild(css);
  document.body.insertAdjacentHTML("beforeend", `<div class="overlay" id="quizOv" hidden><div class="sheet qz" role="dialog" aria-modal="true" aria-labelledby="qzTitle" id="quizSheet"></div></div>`);

  let vids = [];
  const subjectsOf = () => {
    const g = {};
    vids.forEach(v => { const k = v.board + "|" + v.subject; (g[k] ||= { key: k, board: v.board, subject: v.subject, vids: [] }).vids.push(v); });
    return Object.values(g);
  };
  const order = (a, b) => (a.paper || "").localeCompare(b.paper || "") || (a.order ?? 999) - (b.order ?? 999) || (a.number ?? 999) - (b.number ?? 999);
  const subjName = s => SUBJ[s] || s;
  const tile = v => {
    const b = best[v.id], n = v.quiz.length;
    return `<button class="qtile" data-quiz="${esc(v.id)}" style="--c:${COL[v.subject] || "var(--purple)"}" aria-label="Quiz for video ${esc(v.code)}: ${esc(v.title)}">
      <span class="cd">${esc(v.code || "").replace(/^([A-Z]\d)-/, "$1<br>")}</span>
      <span class="nm">${esc(v.title)}<small>Video ${esc(v.code || "")} · ${n} question${n === 1 ? "" : "s"}</small></span>
      <span class="sc ${b != null && b === n ? "done" : ""}">${b != null ? `${b}/${n}` : "Start"}</span>
    </button>`;
  };

  const build = () => {
    const anchor = document.querySelector("#app .home-subjects");
    const old = document.querySelector("#app .quizzes");
    if (!anchor || !vids.length) { return; }
    const steps = document.querySelector("#app .hero .steps");
    if (steps && !steps.dataset.q) { steps.dataset.q = "1"; steps.innerHTML = `<button class="step on" data-quizjump="subjT">1 · Pick a subject ↓</button><button class="step quizgo" data-quizjump="quizT">2 · Take a quiz ↓</button>`; }
    const groups = subjectsOf();
    if (!groups.find(g => g.key === tab)) tab = groups[0].key;
    const g = groups.find(x => x.key === tab);
    const papers = {};
    g.vids.slice().sort(order).forEach(v => (papers[v.paper || "Quizzes"] ||= []).push(v));
    const total = vids.reduce((a, v) => a + v.quiz.length, 0);
    const html = `<section class="quizzes" aria-labelledby="quizT">
      <h2 class="sec" id="quizT">Take a quiz</h2>
      <p class="sub"><b>${vids.length}</b> quizzes, <b>${total}</b> questions. Each quiz goes with one video, so you can watch it first.</p>
      <div class="qtabs" role="tablist" aria-label="Quiz subject">${groups.map(x => `<button role="tab" data-qtab="${esc(x.key)}" aria-selected="${x.key === tab}" style="--c:${COL[x.subject] || "var(--purple)"}">${ICON[x.subject] || ""} ${esc(subjName(x.subject))} <small>(${esc(BOARD[x.board] || x.board)})</small></button>`).join("")}</div>
      <div class="qmix"><p><b>Mixed ${esc(subjName(g.subject))} quiz</b><br>${Math.min(MIX, g.vids.reduce((a, v) => a + v.quiz.length, 0))} random questions from all ${g.vids.length} videos.</p>
        <button class="btn primary" data-quizmix="${esc(g.key)}">Start mixed quiz →</button></div>
      ${Object.entries(papers).map(([p, list]) => `<div class="grouphead">${esc(BOARD[g.board] || g.board)} ${esc(subjName(g.subject))} · ${esc(p)}</div><div class="qgrid">${list.map(tile).join("")}</div>`).join("")}
    </section>`;
    if (old) { old.outerHTML = html; return; }
    const after = document.querySelector("#app .latest") || anchor;
    after.insertAdjacentHTML("afterend", html);
  };

  /* ---------- quiz player ---------- */
  let run = null; // {title, label, video, qs:[{q,a,v}], i, shown, got:[], key}
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function startVideo(id) {
    const v = vids.find(x => x.id === id); if (!v) return;
    run = { key: v.id, video: v, label: `${BOARD[v.board] || v.board} ${subjName(v.subject)} · ${v.paper || ""} · Video ${v.code || ""}`, title: v.title, qs: v.quiz.map(x => ({ ...x, v })), i: 0, shown: false, got: [] };
    show(); history.replaceState(null, "", "#quiz-" + v.id);
  }
  function startMix(key) {
    const g = subjectsOf().find(x => x.key === key); if (!g) return;
    const all = shuffle(g.vids.flatMap(v => v.quiz.map(x => ({ ...x, v })))).slice(0, MIX);
    run = { key: "mix-" + g.board + "-" + g.subject, video: null, label: `${BOARD[g.board] || g.board} ${subjName(g.subject)} · all videos`, title: `Mixed ${subjName(g.subject)} quiz`, qs: all, i: 0, shown: false, got: [], mix: key };
    show(); history.replaceState(null, "", "#quiz-" + run.key);
  }
  const vidBox = (v, note) => {
    const id = ytId(v.youtube);
    return `<div class="vid" style="--c:${COL[v.subject] || "var(--purple)"}"><span class="th" ${id ? `style="background-image:url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)"` : ""}></span>
      <div><b>Video ${esc(v.code || "")}: ${esc(v.title)}</b>${esc(note)}</div>
      <button class="btn small" data-quizwatch="${esc(v.id)}">▶ Watch</button></div>`;
  };
  function show() {
    const r = run, n = r.qs.length, sheet = $("#quizSheet");
    const head = `<button class="x" data-quizclose aria-label="Close">×</button>
      <div class="lbl">QUIZ · ${esc(r.label)}</div><h3 id="qzTitle">${esc(r.title)}</h3>`;
    if (r.i >= n) {
      const s = r.got.filter(Boolean).length, pct = s / n;
      if (r.video) { const prev = best[r.key]; if (prev == null || s > prev) { best[r.key] = s; store("htg-quiz-best", best); } }
      const missed = r.qs.filter((_, i) => !r.got[i]);
      const nextV = r.video ? vids.filter(v => v.board === r.video.board && v.subject === r.video.subject).sort(order) : [];
      const nx = r.video ? nextV[nextV.indexOf(r.video) + 1] : null;
      sheet.innerHTML = `${head}
        <div class="score">${s}/${n}</div>
        <p class="verdict">${pct === 1 ? "Full marks. Nailed it!" : pct >= .6 ? "Nice one. Nearly there." : "Keep going, you've got this."}</p>
        ${missed.length ? `<div class="lbl">GO OVER THESE</div><ul class="miss">${missed.map(x => `<li>${esc(x.q)}<br><span>${esc(x.a)}</span>${r.mix ? ` <small>(Video ${esc(x.v.code)}: ${esc(x.v.title)})</small>` : ""}</li>`).join("")}</ul>` : ""}
        ${r.video && missed.length ? vidBox(r.video, "Rewatch it, then try again.") : ""}
        <div class="acts">
          <button class="btn" data-quizagain>↻ Try again</button>
          ${nx ? `<button class="btn primary" data-quiz="${esc(nx.id)}">Next: ${esc(nx.code)} ${esc(nx.title)} →</button>` : r.mix ? `<button class="btn primary" data-quizmix="${esc(r.mix)}">New mixed quiz →</button>` : `<button class="btn primary" data-quizclose>All quizzes</button>`}
        </div>`;
    } else {
      const x = r.qs[r.i];
      sheet.innerHTML = `${head}
        ${r.video && r.i === 0 && !r.shown ? vidBox(r.video, "This quiz goes with this video.") : ""}
        <div class="bar" style="margin-top:${r.video && r.i === 0 && !r.shown ? 0 : 12}px"><i style="width:${(r.i / n) * 100}%"></i></div>
        <div class="qnum">Question ${r.i + 1} of ${n}</div>
        ${r.mix ? `<div class="from">From video ${esc(x.v.code)}: ${esc(x.v.title)}</div>` : ""}
        <div class="qtext">${esc(x.q)}</div>
        ${r.shown ? `<div class="ans">${esc(x.a)}</div>
          <div class="lbl" style="margin-bottom:8px">DID YOU GET IT?</div>
          <div class="acts"><button class="btn good" data-quizmark="1">✓ Got it</button><button class="btn bad" data-quizmark="0">✗ Not yet</button></div>`
        : `<div class="acts"><button class="btn yellow" data-quizreveal>Show answer</button></div>`}`;
    }
    $("#quizOv").hidden = false;
    sheet.scrollTop = 0;
  }
  function close() {
    $("#quizOv").hidden = true; $("#quizSheet").innerHTML = ""; run = null;
    if (/^#quiz-/.test(location.hash)) history.replaceState(null, "", location.pathname);
    build();
  }

  document.addEventListener("click", e => {
    const t = e.target.closest("[data-quiz],[data-quizmix],[data-qtab],[data-quizreveal],[data-quizmark],[data-quizagain],[data-quizclose],[data-quizwatch],[data-quizjump]");
    if (!t) { if (e.target.id === "quizOv") close(); return; }
    const d = t.dataset;
    if (d.quizjump) { const el = document.getElementById(d.quizjump); if (el) el.scrollIntoView({ behavior: "smooth" }); }
    else if (d.quiz) startVideo(d.quiz);
    else if (d.quizmix) startMix(d.quizmix);
    else if (d.qtab) { tab = d.qtab; store("htg-quiz-tab", tab); build(); }
    else if (d.quizreveal !== undefined) { run.shown = true; show(); }
    else if (d.quizmark !== undefined) { run.got[run.i] = d.quizmark === "1"; run.i++; run.shown = false; show(); }
    else if (d.quizagain !== undefined) { if (run.mix) startMix(run.mix); else startVideo(run.key); }
    else if (d.quizclose !== undefined) close();
    else if (d.quizwatch) {
      const id = d.quizwatch; close();
      // open the video using the main app's player
      const tmp = document.createElement("button"); tmp.dataset.vid = id; tmp.hidden = true; document.body.appendChild(tmp); tmp.click(); tmp.remove();
    }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#quizOv").hidden) close(); });

  Promise.all([fetch("videos.json", { cache: "no-cache" }).then(r => r.json()), fetch("links.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : {}).catch(() => ({}))]).then(([d, links]) => {
    vids = (d.videos || []).map(v => ({ ...v, ...(links[v.id] || {}) })).filter(v => (v.quiz || []).length);
    build();
    new MutationObserver(() => { if (!document.querySelector("#app .quizzes")) build(); }).observe(document.getElementById("app"), { childList: true });
    const h = location.hash.match(/^#quiz-(.+)$/);
    if (h) { if (h[1].startsWith("mix-")) { const [, b, ...s] = h[1].split("-"); startMix(b + "|" + s.join("-")); } else startVideo(h[1]); }
  }).catch(() => {});
})();
