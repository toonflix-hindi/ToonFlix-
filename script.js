const firebaseConfig = {
  databaseURL: "https://toonflix-wed-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const animeRef = db.ref("anime");

let allAnime = [];
let currentGenre = "All";

if (document.getElementById("allAnime")) {
  animeRef.on("value", (snapshot) => {
    const data = snapshot.val() || {};
    allAnime = Object.entries(data).map(([id, val]) => ({ id, ...val }));

    const sorted = [...allAnime].sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));

    renderHero(sorted.slice(0, 5));
    renderNewlyUpdated(sorted.slice(0, 12));
    renderTop10(allAnime.filter(a => a.top10));
    renderGenres();
    renderAllAnime(allAnime);
  });

  document.getElementById("searchBtn").addEventListener("click", doSearch);
  document.getElementById("searchInput").addEventListener("keyup", (e) => {
    if (e.key === "Enter") doSearch();
  });
}

function doSearch() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  if (!q) { renderAllAnime(allAnime); return; }
  const filtered = allAnime.filter(a => (a.title||"").toLowerCase().includes(q));
  renderAllAnime(filtered);
  document.getElementById("all").scrollIntoView({ behavior: "smooth" });
}

function cardHTML(anime, showNew=false, rank=null) {
  const poster = anime.poster || "https://via.placeholder.com/300x400?text=No+Image";
  const isNew = showNew && (Date.now() - (anime.createdAt||0) < 7*24*60*60*1000);
  return `
    <div class="anime-card ${rank?'top10-card':''}" onclick="location.href='anime.html?id=${anime.id}'">
      ${anime.rating ? `<span class="rating-badge">⭐ ${anime.rating}</span>` : ''}
      ${isNew ? '<span class="badge-new">NEW</span>' : ''}
      ${rank ? `<span class="top10-rank">${rank}</span>` : ''}
      <img src="${poster}" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'" alt="${anime.title||''}">
      <div class="card-info">
        <h3>${anime.title || "Untitled"}</h3>
        <p>${anime.year || ""} ${anime.genres ? "• " + anime.genres.split(",")[0].trim() : ""}</p>
      </div>
    </div>`;
}

function renderHero(list) {
  const el = document.getElementById("heroSlider");
  if (!el) return;
  if (!list.length) { document.getElementById("heroSection").style.display="none"; return; }
  el.innerHTML = list.map(a => `
    <div class="hero-card" onclick="location.href='anime.html?id=${a.id}'">
      <img src="${a.banner || a.poster || ''}" onerror="this.src='https://via.placeholder.com/800x400'">
      <div class="hero-overlay">
        <h3>${a.title || ''}</h3>
        <p>${a.year||''} ${a.rating?'• ⭐ '+a.rating:''} ${a.genres?'• '+a.genres.split(",")[0].trim():''}</p>
        <span class="hero-play">▶ Watch Now</span>
      </div>
    </div>
  `).join("");
}

function renderNewlyUpdated(list) {
  const el = document.getElementById("newlyUpdated");
  if (!el) return;
  if (!list.length) { el.innerHTML = '<p class="empty-msg" style="flex:0 0 100%">No anime added yet.</p>'; return; }
  el.innerHTML = list.map(a => cardHTML(a, true)).join("");
}

function renderTop10(list) {
  const el = document.getElementById("top10Grid");
  if (!el) return;
  const sorted = list.sort((a,b) => (b.rating||0) - (a.rating||0)).slice(0,10);
  if (!sorted.length) { el.innerHTML = '<p class="empty-msg" style="flex:0 0 100%">No Top 10 anime yet.</p>'; return; }
  el.innerHTML = sorted.map((a,i) => cardHTML(a, false, i+1)).join("");
}

function renderGenres() {
  const el = document.getElementById("genreBtns");
  if (!el) return;
  const set = new Set();
  allAnime.forEach(a => {
    if (a.genres) a.genres.split(",").forEach(g => set.add(g.trim()));
  });
  const genres = ["All", ...Array.from(set).filter(Boolean)];
  el.innerHTML = genres.map(g => 
    `<button class="chip ${g===currentGenre?'active':''}" onclick="filterGenre('${g}', this)">${g}</button>`
  ).join("");
}

function filterGenre(g, btn) {
  currentGenre = g;
  document.querySelectorAll(".chip").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  const list = g === "All" ? allAnime : allAnime.filter(a => a.genres && a.genres.includes(g));
  renderAllAnime(list);
}

function renderAllAnime(list) {
  const el = document.getElementById("allAnime");
  if (!el) return;
  if (!list.length) { el.innerHTML = '<p class="empty-msg">No anime found.</p>'; return; }
  el.innerHTML = list.map(a => cardHTML(a, false)).join("");
}

// -------- Detail Page --------
function loadAnimeDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const el = document.getElementById("detailContainer");
  if (!id || !el) return;

  animeRef.child(id).on("value", (snap) => {
    const a = snap.val();
    if (!a) { el.innerHTML = "<p class='empty-msg'>Anime not found.</p>"; return; }

    const banner = a.banner || a.poster || "";
    const poster = a.poster || "https://via.placeholder.com/300x400";

    let episodesHTML = "";
    if (a.episodes) {
      const eps = Object.entries(a.episodes).sort((x,y) => x[1].number - y[1].number);
      episodesHTML = eps.map(([eid, ep]) => `
        <a href="${ep.link}" target="_blank" class="episode-btn">
          <strong>EP ${ep.number}: ${ep.title || "Episode " + ep.number}</strong>
          <small>▶ Watch Now</small>
        </a>
      `).join("");
    } else {
      episodesHTML = "<p class='empty-msg'>No episodes added yet.</p>";
    }

    el.innerHTML = `
      ${banner ? `<img class="detail-banner" src="${banner}" onerror="this.style.display='none'">` : ""}
      <div class="detail-header">
        <img class="detail-poster" src="${poster}" onerror="this.src='https://via.placeholder.com/300x400'">
        <div class="detail-info">
          <h1>${a.title || "Untitled"}</h1>
          <div class="detail-meta">
            ${a.year ? `<span class="meta-tag">📅 ${a.year}</span>` : ""}
            ${a.rating ? `<span class="meta-tag">⭐ ${a.rating}</span>` : ""}
            ${a.episodes ? `<span class="meta-tag">🎬 ${Object.keys(a.episodes).length} Episodes</span>` : ""}
            ${a.genres ? a.genres.split(",").map(g => `<span class="meta-tag">${g.trim()}</span>`).join("") : ""}
          </div>
          <p class="detail-desc">${a.description || "No description available."}</p>
        </div>
      </div>
      <div class="episodes-section">
        <h2>📺 Episodes</h2>
        <div class="episode-grid">${episodesHTML}</div>
      </div>
    `;
  });
}
