// Adds YouTube thumbnails to video cards and search results once a video has a YouTube link.
(() => {
  const ytId = u => { const m = String(u || "").match(/(?:shorts\/|youtu\.be\/|[?&]v=|embed\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : null; };
  const css = document.createElement("style");
  css.textContent = `
.thumb .ytimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0}
.thumb.has-img::before{display:none}
.thumb.has-img .tt{display:none}
.thumb.has-img::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.25),transparent 30%,transparent 70%,rgba(0,0,0,.35));z-index:0}
.thumb.has-img>span{z-index:1}
.vcard .cap b{color:var(--ink);font-weight:600}
.thumb .soon{left:auto;right:10px;top:10px;bottom:auto}
.res .mini.has-img{background-size:cover;background-position:center;color:transparent}`;
  document.head.appendChild(css);
  let map = {};
  const apply = () => {
    document.querySelectorAll("[data-vid]").forEach(el => {
      const v = map[el.dataset.vid]; if (!v || el.dataset.thumbed) return;
      const id = ytId(v.youtube); if (!id) return;
      el.dataset.thumbed = "1";
      const src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      const t = el.querySelector(".thumb");
      if (t) {
        const img = new Image(); img.className = "ytimg"; img.alt = ""; img.loading = "lazy"; img.src = src;
        img.onerror = () => { t.classList.remove("has-img"); img.remove(); };
        t.classList.add("has-img"); t.prepend(img);
        const cap = el.querySelector(".cap span");
        if (cap) cap.insertAdjacentHTML("afterbegin", "<b></b> · "), cap.querySelector("b").textContent = v.title;
      }
      const mini = el.querySelector(".mini");
      if (mini) { mini.classList.add("has-img"); mini.style.backgroundImage = `url(${src})`; }
    });
  };
  fetch("videos.json", { cache: "no-cache" }).then(r => r.json()).then(d => {
    (d.videos || []).forEach(v => map[v.id] = v); apply();
    new MutationObserver(apply).observe(document.getElementById("app"), { childList: true, subtree: true });
  }).catch(() => {});
})();
