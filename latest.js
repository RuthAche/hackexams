// "Latest uploads" strip on the front page, under the subject cards: every video with a YouTube link, in series order (1, 2, 3 …).
(() => {
  const ytId = u => { const m = String(u || "").match(/(?:shorts\/|youtu\.be\/|[?&]v=|embed\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : null; };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SUBJ = { pe: "Physical Education", biology: "Biology", "health-social-care": "Health & Social Care" }, BOARD = { aqa: "AQA", edexcel: "Edexcel", ocr: "OCR", eduqas: "Eduqas", ccea: "CCEA", btec: "BTEC" };
  const ago = iso => {
    const day = t => { const x = new Date(t); return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()); };
    const d = Math.round((day(Date.now()) - day(iso)) / 864e5);
    return d <= 0 ? "Today" : d === 1 ? "Yesterday" : d < 7 ? `${d} days ago` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  const css = document.createElement("style");
  css.textContent = `
.latest{margin:4px 0 30px}
.latest-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap}
.latest-head h2{margin:0}
.latest-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(138px,160px);gap:14px;overflow-x:auto;padding:12px 2px 10px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.latest-row .vcard{scroll-snap-align:start}
.latest-row .thumb{aspect-ratio:9/16}
.latest .new{display:inline-block;font-size:11px;font-weight:700;letter-spacing:1px;background:var(--pink);color:#fff;border:2px solid var(--ink);border-radius:999px;padding:1px 8px;margin-left:6px;vertical-align:middle}
.latest .meta{font-size:12px;color:var(--muted)}
.latest .meta b{color:var(--ink)}`;
  document.head.appendChild(css);
  let items = [];
  const build = () => {
    const anchor = document.querySelector("#app .home-subjects");
    if (!anchor || document.querySelector("#app .latest") || !items.length) return;
    const fresh = items.some(v => Date.now() - new Date(v.added) < 7 * 864e5);
    const cards = items.map(v => {
      const id = ytId(v.youtube);
      return `<button class="vcard" data-vid="${esc(v.id)}" data-thumbed="1">
        <div class="thumb has-img" style="--c:var(--blue)">
          <img class="ytimg" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" onerror="this.parentNode.classList.remove('has-img');this.remove()">
          <span class="no">${esc(v.code || "NEW")}</span><span class="tt">${esc(v.title)}</span>
          <span class="play"><svg width="18" height="18"><use href="#i-play"/></svg></span>
        </div>
        <span class="meta"><b>${esc(v.title)}</b><br>${esc(BOARD[v.board] || v.board)} ${esc(SUBJ[v.subject] || v.subject)} · ${ago(v.added)}</span>
      </button>`;
    }).join("");
    anchor.insertAdjacentHTML("afterend", `<section class="latest" aria-labelledby="latestT">
      <div class="latest-head"><h2 class="sec" id="latestT">Latest uploads${fresh ? '<span class="new">NEW</span>' : ""}</h2>
      <button class="btn small" data-jump="${esc(items[0].subject)}" data-jboard="${esc(items[0].board)}">See all ${esc(BOARD[items[0].board] || "")} ${esc(SUBJ[items[0].subject] || "")} videos →</button></div>
      <div class="latest-row">${cards}</div></section>`);
  };
  Promise.all([fetch("videos.json", { cache: "no-cache" }).then(r => r.json()), fetch("links.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : {}).catch(() => ({}))]).then(([d, links]) => {
    items = (d.videos || []).map(v => ({ ...v, ...(links[v.id] || {}) })).filter(v => v.added && ytId(v.youtube)).sort((a, b) => (a.paper || "").localeCompare(b.paper || "") || (a.order ?? 999) - (b.order ?? 999) || (a.number ?? 999) - (b.number ?? 999));
    build();
    new MutationObserver(build).observe(document.getElementById("app"), { childList: true });
  }).catch(() => {});
})();
