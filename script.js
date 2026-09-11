// ═══════════════════════════════════════════
// TOONFLIX HINDI - MAIN SCRIPT (FIXED)
// ═══════════════════════════════════════════

const firebaseConfig = {
  databaseURL: "https://toonflix-wed-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const animeRef = db.ref("anime");

let allAnime = [];
let currentGenre = "All";

// ═══ Helper: Genres ko handle karo (genres ya genres2) ═══
function getGenres(a) {
  return (a.genres || a.genres2 || "Anime").toString();
}

// ═══ Helper: Year ko clean karo ═══
function getYear(a) {
  if (!a.year) return "";
  // Agar "October 2, 2018" jaisa hai toh sirf 2018 nikaalo
  const match = String(a.year).match(/\d{4}/);
  return match ? match[0] : a.year;
}

// ═══════════════════════════════════════════
// HOME PAGE LOAD
// ═══════════════════════════════════════════
if (document.getElementById("allAnime")) {
  animeRef.on("value", (snapshot) => {
    const data = snapshot.val() || {};
    allAnime = Object.entries(data).map(([id, val]) => ({ id, ...val }));

    console.log("✅ Loaded anime:", allAnime.length);

    const sorted = [...allAnime].sort((a,b) => (b.updatedAt||b.createdAt||0) - (a.updatedAt||a.createdAt||0));

    renderHero(sorted.slice(0, 5));
    renderNewlyUpdated(sorted.slice(0, 12));
    renderTop10(allAnime.filter(a => a.top10));
    renderGenres();
    renderAllAnime(allAnime);
  }, (error) => {
    console.error("❌ Firebase error:", error);
    document.getElementById("allAnime").innerHTML = 
      '<p class="empty-msg">Firebase error: ' + error.message + '</p>';
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

// ═══════════════════════════════════════════
// CARD HTML
// ═══════════════════════════════════════════
function cardHTML(anime, showNew=false, rank=null) {
  const poster = anime.poster || "https://via.placeholder.com/300x400?text=No+Image";
  const isNew = showNew && (Date.now() - (anime.createdAt||0) < 7*24*60*60*1000);
  const year = getYear(anime);
  const genre = getGenres(anime).split(",")[0].trim();
  
  return `
    <div class="anime-card ${rank?'top10-card':''}" onclick="location.href='anime.html?id=${anime.id}'">
      ${anime.rating ? `<span class="rating-badge">⭐ ${anime.rating}</span>` : ''}
      ${isNew ? '<span class="badge-new">NEW</span>' : ''}
      ${rank ? `<span class="top10-rank">${rank}</span>` : ''}
      <img src="${poster}" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'" alt="${anime.title||''}">
      <div class="card-info">
        <h3>${anime.title || "Untitled"}</h3>
        <p>${year} ${genre ? "• " + genre : ""}</p>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════
// HERO SLIDER
// ═══════════════════════════════════════════
function renderHero(list) {
  const el = document.getElementById("heroSlider");
  if (!el) return;
  if (!list.length) { 
    document.getElementById("heroSection").style.display = "none"; 
    return; 
  }
  el.innerHTML = list.map(a => {
    const year = getYear(a);
    const genre = getGenres(a).split(",")[0].trim();
    return `
    <div class="hero-card" onclick="location.href='anime.html?id=${a.id}'">
      <img src="${a.banner || a.poster || ''}" onerror="this.src='https://via.placeholder.com/800x400'">
      <div class="hero-overlay">
        <span class="hero-tag">🔥 TRENDING</span>
        <h3>${a.title || ''}</h3>
        <p>
          ${year ? `<span>📅 ${year}</span>` : ''}
          ${a.rating ? `<span>⭐ ${a.rating}</span>` : ''}
          ${genre ? `<span>🎭 ${genre}</span>` : ''}
        </p>
        <span class="hero-play">▶ Watch Now</span>
      </div>
    </div>
  `}).join("");
}

// ═══════════════════════════════════════════
// NEWLY UPDATED
// ═══════════════════════════════════════════
function renderNewlyUpdated(list) {
  const el = document.getElementById("newlyUpdated");
  if (!el) return;
  if (!list.length) { 
    el.innerHTML = '<p class="empty-msg" style="flex:0 0 100%">No anime added yet.</p>'; 
    return; 
  }
  el.innerHTML = list.map(a => cardHTML(a, true)).join("");
}

// ═══════════════════════════════════════════
// TOP 10
// ═══════════════════════════════════════════
function renderTop10(list) {
  const el = document.getElementById("top10Grid");
  if (!el) return;
  const sorted = list.sort((a,b) => (parseFloat(b.rating)||0) - (parseFloat(a.rating)||0)).slice(0,10);
  if (!sorted.length) { 
    el.innerHTML = '<p class="empty-msg" style="flex:0 0 100%">No Top 10 anime yet.</p>'; 
    return; 
  }
  el.innerHTML = sorted.map((a,i) => cardHTML(a, false, i+1)).join("");
}

// ═══════════════════════════════════════════
// GENRES
// ═══════════════════════════════════════════
function renderGenres() {
  const el = document.getElementById("genreBtns");
  if (!el) return;
  const set = new Set();
  allAnime.forEach(a => {
    const g = getGenres(a);
    if (g) g.split(",").forEach(x => {
      const t = x.trim();
      if (t) set.add(t);
    });
  });
  const genres = ["All", ...Array.from(set).sort()];
  el.innerHTML = genres.map(g => 
    `<button class="chip ${g===currentGenre?'active':''}" onclick="filterGenre('${g.replace(/'/g,"\\'")}', this)">${g}</button>`
  ).join("");
}

function filterGenre(g, btn) {
  currentGenre = g;
  document.querySelectorAll(".chip").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  const list = g === "All" ? allAnime : allAnime.filter(a => getGenres(a).includes(g));
  renderAllAnime(list);
}

// ═══════════════════════════════════════════
// ALL ANIME
// ═══════════════════════════════════════════
function renderAllAnime(list) {
  const el = document.getElementById("allAnime");
  if (!el) return;
  if (!list.length) { 
    el.innerHTML = '<p class="empty-msg">No anime found.</p>'; 
    return; 
  }
  el.innerHTML = list.map(a => cardHTML(a, false)).join("");
}

// ═══════════════════════════════════════════
// CONTINUE WATCHING
// ═══════════════════════════════════════════
function renderContinueWatching() {
  const section = document.getElementById("continueWatchingSection");
  const el = document.getElementById("continueWatching");
  if (!section || !el) return;

  try {
    const history = JSON.parse(localStorage.getItem("toonflix_history") || "[]");
    if (!history.length) { 
      section.style.display = "none"; 
      return; 
    }

    section.style.display = "block";
    el.innerHTML = history.slice(0, 10).map(h => `
      <div class="anime-card" onclick="location.href='anime.html?id=${h.animeId}'">
        <img src="${h.poster || 'https://via.placeholder.com/300x400'}" onerror="this.src='https://via.placeholder.com/300x400'">
        <div class="card-info">
          <h3>${h.title}</h3>
          <p>EP ${h.epNumber} ${h.epTitle ? "• " + h.epTitle : ""}</p>
        </div>
      </div>
    `).join("");
  } catch (e) { 
    console.error("Continue watching error:", e); 
  }
}

if (document.getElementById("continueWatching")) {
  renderContinueWatching();
  setInterval(renderContinueWatching, 3000);
}

// ═══════════════════════════════════════════
// ANIME DETAIL PAGE
// ═══════════════════════════════════════════
function loadAnimeDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const el = document.getElementById("detailContainer");
  if (!id || !el) return;

  animeRef.child(id).on("value", (snap) => {
    const a = snap.val();
    if (!a) { 
      el.innerHTML = "<p class='empty-msg'>Anime not found.</p>"; 
      return; 
    }

    const banner = a.banner || a.poster || "";
    const poster = a.poster || "https://via.placeholder.com/300x400";
    const year = getYear(a);
    const genreList = getGenres(a).split(",").map(g => g.trim()).filter(Boolean);

    // Episodes
    let episodesHTML = "";
    if (a.episodes) {
      const eps = Object.entries(a.episodes).sort((x,y) => x[1].number - y[1].number);
      episodesHTML = eps.map(([eid, ep]) => {
        // Priority: Telegram > link > link2 > link3
        const episodeLink = ep.telegram || ep.link || ep.link2 || ep.link3 || "#";
        const isExternal = episodeLink !== "#";
        
        return `
          <a href="${episodeLink}" 
             ${isExternal ? 'target="_blank" rel="noopener"' : ''}
             class="episode-btn ${!isExternal ? 'disabled' : ''}"
             ${!isExternal ? 'onclick="event.preventDefault();alert(\'Is episode ka link abhi add nahi hua\')"' : ''}>
            <strong>EP ${ep.number}: ${ep.title || "Episode " + ep.number}</strong>
            <small>${ep.telegram ? '📱 Telegram pe Watch' : (ep.link ? '▶ Watch Now' : '⚠️ Link pending')}</small>
          </a>
        `;
      }).join("");
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
            ${year ? `<span class="meta-tag">📅 ${year}</span>` : ""}
            ${a.rating ? `<span class="meta-tag">⭐ ${a.rating}</span>` : ""}
            ${a.episodes ? `<span class="meta-tag">🎬 ${Object.keys(a.episodes).length} Episodes</span>` : ""}
            ${genreList.map(g => `<span class="meta-tag">${g}</span>`).join("")}
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

if (document.getElementById("detailContainer")) {
  loadAnimeDetail();
}
