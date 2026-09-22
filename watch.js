// ═══════════════════════════════════════════
// TOONFLIX - WATCH.JS (BULLETPROOF v2)
// Auto-detects episodes from anywhere
// ═══════════════════════════════════════════

const firebaseConfig = {
  databaseURL: "https://toonflix-wed-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const animeRef = db.ref("anime");

let currentAnime = null;
let currentEpNum = 0;
let currentSeason = "Season_1";
let allEpisodes = [];
let allSeasons = [];

console.log("🔥 watch.js v2 INIT");

function goBack() {
  const params = new URLSearchParams(window.location.search);
  const animeId = params.get("anime");
  if (animeId) window.location.href = `anime.html?id=${animeId}`;
  else window.location.href = "index.html";
}
window.goBack = goBack;

// ═══ HELPER: Check if season has real episodes ═══
function hasRealEpisodes(seasonObj) {
  if (!seasonObj || typeof seasonObj !== "object") return false;
  const realEps = Object.keys(seasonObj).filter(k => !k.startsWith("_"));
  return realEps.length > 0;
}

// ═══════════════════════════════════════════
// LOAD WATCH PAGE
// ═══════════════════════════════════════════
function loadWatchPage() {
  const params = new URLSearchParams(window.location.search);
  const animeId = params.get("anime");
  const seasonParam = params.get("season") || "Season_1";
  const epNum = parseInt(params.get("ep") || "1");
  const el = document.getElementById("watchContainer");

  if (!animeId) {
    el.innerHTML = "<p class='empty-msg'>Anime not found.</p>";
    return;
  }

  console.log("🎬 Loading anime:", animeId);
  console.log("📍 URL Params — Season:", seasonParam, "EP:", epNum);

  animeRef.child(animeId).on("value", (snap) => {
    const a = snap.val();
    if (!a) {
      el.innerHTML = "<p class='empty-msg'>Anime not found.</p>";
      return;
    }

    currentAnime = { id: animeId, ...a };
    currentEpNum = epNum;

    // ═══════════════════════════════════════════
    // PRINT FULL DATA STRUCTURE (Debug)
    // ═══════════════════════════════════════════
    console.log("📦 Anime data keys:", Object.keys(a));
    console.log("📦 Has 'seasons'?", !!a.seasons);
    console.log("📦 Has 'episodes'?", !!a.episodes);
    
    if (a.seasons) {
      console.log("📦 Seasons found:", Object.keys(a.seasons));
      Object.keys(a.seasons).forEach(sk => {
        const epsCount = hasRealEpisodes(a.seasons[sk]) ? Object.keys(a.seasons[sk]).filter(k => !k.startsWith("_")).length : 0;
        console.log(`   └─ ${sk}: ${epsCount} episodes`);
      });
    }
    
    if (a.episodes) {
      console.log("📦 Legacy episodes:", Object.keys(a.episodes).length);
    }

    // ═══════════════════════════════════════════
    // FIND WHICH SEASON HAS EPISODES
    // ═══════════════════════════════════════════
    let workingSeason = null;
    let workingEpisodes = null;

    // Priority 1: Seasons structure
    if (a.seasons && Object.keys(a.seasons).filter(k => !k.startsWith("_")).length > 0) {
      allSeasons = Object.keys(a.seasons)
        .filter(k => !k.startsWith("_"))
        .sort((x, y) => (parseInt(x.replace(/\D/g, "")) || 0) - (parseInt(y.replace(/\D/g, "")) || 0));

      // Try URL param season first
      if (a.seasons[seasonParam] && hasRealEpisodes(a.seasons[seasonParam])) {
        workingSeason = seasonParam;
        workingEpisodes = a.seasons[seasonParam];
        console.log("✅ Found episodes in URL param season:", seasonParam);
      } else {
        // Find FIRST season with episodes
        for (const sk of allSeasons) {
          if (hasRealEpisodes(a.seasons[sk])) {
            workingSeason = sk;
            workingEpisodes = a.seasons[sk];
            console.log("✅ Auto-detected season with episodes:", sk);
            break;
          }
        }
        // If still none, use first season even if empty
        if (!workingSeason && allSeasons.length > 0) {
          workingSeason = allSeasons[0];
          workingEpisodes = a.seasons[workingSeason] || {};
          console.log("⚠️ No season has episodes, using first:", workingSeason);
        }
      }
    }
    // Priority 2: Legacy flat episodes
    else if (a.episodes && Object.keys(a.episodes).length > 0) {
      workingSeason = "Season_1";
      workingEpisodes = a.episodes;
      allSeasons = ["Season_1"];
      console.log("✅ Using legacy episodes:", Object.keys(a.episodes).length);
    }

    // ═══════════════════════════════════════════
    // BUILD EPISODES LIST
    // ═══════════════════════════════════════════
    if (workingSeason && workingEpisodes) {
      currentSeason = workingSeason;
      allEpisodes = Object.entries(workingEpisodes)
        .filter(([k, v]) => !k.startsWith("_") && v && typeof v === "object" && v.number !== undefined)
        .map(([eid, ep]) => ({ eid, ...ep }))
        .sort((x, y) => (parseInt(x.number) || 0) - (parseInt(y.number) || 0));
      
      console.log("📺 Final Episodes loaded:", allEpisodes.length, "from", currentSeason);
    } else {
      allEpisodes = [];
      console.log("❌ No episodes found anywhere");
    }

    // ═══ Current Episode dhundho ═══
    const currentEp = allEpisodes.find(e => parseInt(e.number) === epNum);

    if (!currentEp) {
      // Error message with detailed info
      el.innerHTML = `
        <div style="padding:40px 20px;text-align:center;">
          <h2 style="font-size:1.4rem;font-weight:800;color:#67e8f9;margin-bottom:12px;">
            ${a.title || "Untitled"}
          </h2>
          <div class="empty-msg" style="display:inline-block;padding:20px 30px;margin-bottom:20px;text-align:left;max-width:400px;">
            <p style="font-weight:700;color:#fbbf24;margin-bottom:10px;">⚠️ Episode ${epNum} nahi mila</p>
            <p style="font-size:0.75rem;color:#94a3b8;line-height:1.8;">
              <b>Debug Info:</b><br>
              • Total Seasons: ${allSeasons.length}<br>
              • Total Episodes: ${allEpisodes.length}<br>
              • Looking in: ${currentSeason.replace(/_/g, " ")}<br>
              • Available EP numbers: ${allEpisodes.map(e => e.number).join(", ") || "None"}
            </p>
          </div>
          <div>
            <a href="anime.html?id=${encodeURIComponent(animeId)}" 
               class="primary-btn" 
               style="display:inline-block;padding:12px 24px;text-decoration:none;max-width:250px;">
              ← Wapas Anime Page
            </a>
          </div>
        </div>
      `;
      return;
    }

    // ═══ Progress Save ═══
    saveProgress(currentAnime, currentEp, currentSeason);

    // ═══ Next/Prev ═══
    const idx = allEpisodes.findIndex(e => parseInt(e.number) === epNum);
    const prevEp = idx > 0 ? allEpisodes[idx - 1] : null;
    const nextEp = idx < allEpisodes.length - 1 ? allEpisodes[idx + 1] : null;

    // ═══ Servers ═══
    const servers = [];
    if (currentEp.q480) servers.push({ name: "480p", link: currentEp.q480, icon: "📺" });
    if (currentEp.q720) servers.push({ name: "720p", link: currentEp.q720, icon: "🎬" });
    if (currentEp.q1080) servers.push({ name: "1080p", link: currentEp.q1080, icon: "💎" });
    if (currentEp.q4k) servers.push({ name: "4K", link: currentEp.q4k, icon: "🎥" });
    if (!servers.length) {
      if (currentEp.streaming) servers.push({ name: "Server 1", link: currentEp.streaming });
      if (currentEp.streaming2) servers.push({ name: "Server 2", link: currentEp.streaming2 });
      if (currentEp.streaming3) servers.push({ name: "Server 3", link: currentEp.streaming3 });
      if (currentEp.link) servers.push({ name: "Server 1", link: currentEp.link });
    }

    renderPlayer(a, currentEp, servers, prevEp, nextEp);
  });
}

// ═══════════════════════════════════════════
// RENDER PLAYER
// ═══════════════════════════════════════════
function renderPlayer(anime, ep, servers, prevEp, nextEp) {
  const el = document.getElementById("watchContainer");
  const embedUrl = servers[0]?.link || "";
  const comments = JSON.parse(localStorage.getItem(`comments_${anime.id}_${ep.number}`) || "[]");
  const safeAnimeId = encodeURIComponent(anime.id);
  const safeSeason = encodeURIComponent(currentSeason);

  let seasonTabsHTML = "";
  if (allSeasons.length > 1) {
    seasonTabsHTML = `
      <div class="season-tabs">
        ${allSeasons.map(sk => `
          <button class="season-tab ${sk === currentSeason ? 'active' : ''}" 
                  onclick="switchSeasonWatch('${safeAnimeId}','${encodeURIComponent(sk)}')">
            📺 ${sk.replace(/_/g, " ")}
          </button>
        `).join("")}
      </div>
    `;
  }

  el.innerHTML = `
    <div class="watch-header">
      <h1>${anime.title || "Untitled"}</h1>
      <p class="watch-ep-title">
        Episode ${ep.number}${ep.title ? ": " + ep.title : ""} 
        • ${currentSeason.replace(/_/g, " ")}
      </p>
    </div>

    ${seasonTabsHTML}

    <div class="video-wrapper">
      ${embedUrl
        ? `<iframe src="${embedUrl}" allowfullscreen frameborder="0" allow="autoplay; encrypted-media; picture-in-picture"></iframe>`
        : `<div class="video-placeholder">⚠️ Is episode ka video link nahi hai</div>`
      }
    </div>

    ${servers.length > 1 ? `
      <div class="server-selector">
        <p class="server-label">🎬 Quality / Servers:</p>
        <div class="server-btns">
          ${servers.map((s, i) => `
            <button class="server-btn ${i === 0 ? 'active' : ''}" onclick="switchServer('${s.link}', this)">
              ${s.icon || "🎬"} ${s.name}
            </button>
          `).join("")}
        </div>
      </div>
    ` : ""}

    <div class="watch-actions">
      ${ep.telegram ? `<a href="${ep.telegram}" target="_blank" rel="noopener" class="watch-action-btn telegram">📱 Telegram</a>` : ""}
      ${ep.download ? `<a href="${ep.download}" target="_blank" rel="noopener" class="watch-action-btn download">⬇️ Download</a>` : ""}
      <button class="watch-action-btn comment" onclick="toggleComments()">💬 Comments (${comments.length})</button>
    </div>

    <div class="comments-section" id="commentsSection" style="display:none;">
      <h3>💬 Comments</h3>
      <div class="comment-form">
        <input id="commentName" placeholder="Aapka naam..." maxlength="30">
        <textarea id="commentText" placeholder="Comment likhein..." maxlength="300"></textarea>
        <button onclick="addComment()" class="comment-post-btn">Post Comment</button>
      </div>
      <div class="comments-list" id="commentsList">
        ${comments.length ? comments.map(c => `
          <div class="comment-item">
            <div class="comment-header">
              <strong>${c.name}</strong>
              <small>${timeAgo(c.time)}</small>
            </div>
            <p>${c.text}</p>
          </div>
        `).join("") : '<p class="empty-msg">Abhi koi comment nahi hai.</p>'}
      </div>
    </div>

    <div class="ep-nav">
      ${prevEp
        ? `<a href="watch.html?anime=${safeAnimeId}&season=${safeSeason}&ep=${prevEp.number}" class="ep-nav-btn">⏮️ EP ${prevEp.number}</a>`
        : `<button class="ep-nav-btn disabled" disabled>⏮️ No Previous</button>`
      }
      ${nextEp
        ? `<a href="watch.html?anime=${safeAnimeId}&season=${safeSeason}&ep=${nextEp.number}" class="ep-nav-btn next">EP ${nextEp.number} ⏭️</a>`
        : `<button class="ep-nav-btn disabled" disabled>No Next ⏭️</button>`
      }
    </div>

    <div class="all-episodes-list">
      <h3>📺 ${currentSeason.replace(/_/g, " ")} — Episodes (${allEpisodes.length})</h3>
      <div class="ep-list-grid">
        ${allEpisodes.map(e => `
          <a href="watch.html?anime=${safeAnimeId}&season=${safeSeason}&ep=${e.number}"
             class="ep-list-btn ${e.number === ep.number ? 'active' : ''}">
            <span class="ep-num">${e.number}</span>
            <span class="ep-name">${e.title || "Episode " + e.number}</span>
            ${e.telegram ? '<span class="ep-tg">📱</span>' : ''}
          </a>
        `).join("")}
      </div>
    </div>

    <div class="back-to-anime">
      <a href="anime.html?id=${safeAnimeId}" class="primary-btn" style="display:block;text-align:center;text-decoration:none;">
        ← ${anime.title} - Full Details
      </a>
    </div>
  `;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.switchSeasonWatch = function(encodedAnimeId, encodedSeason) {
  const animeId = decodeURIComponent(encodedAnimeId);
  const season = decodeURIComponent(encodedSeason);
  window.location.href = `watch.html?anime=${encodeURIComponent(animeId)}&season=${encodeURIComponent(season)}&ep=1`;
};

function switchServer(link, btn) {
  document.querySelectorAll(".server-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const iframe = document.querySelector(".video-wrapper iframe");
  if (iframe) iframe.src = link;
}
window.switchServer = switchServer;

function toggleComments() {
  const s = document.getElementById("commentsSection");
  s.style.display = s.style.display === "none" ? "block" : "none";
  if (s.style.display === "block") s.scrollIntoView({ behavior: "smooth" });
}
window.toggleComments = toggleComments;

function addComment() {
  const name = document.getElementById("commentName").value.trim() || "Anonymous";
  const text = document.getElementById("commentText").value.trim();
  if (!text) { alert("Comment likho!"); return; }
  const key = `comments_${currentAnime.id}_${currentEpNum}`;
  const comments = JSON.parse(localStorage.getItem(key) || "[]");
  comments.unshift({ name, text, time: Date.now() });
  localStorage.setItem(key, JSON.stringify(comments.slice(0, 50)));
  document.getElementById("commentText").value = "";
  loadWatchPage();
}
window.addComment = addComment;

function saveProgress(anime, ep, season) {
  try {
    const history = JSON.parse(localStorage.getItem("toonflix_history") || "[]");
    const filtered = history.filter(h => h.animeId !== anime.id);
    filtered.unshift({
      animeId: anime.id,
      title: anime.title,
      poster: anime.poster,
      epNumber: ep.number,
      epTitle: ep.title || "",
      season: season || "Season_1",
      timestamp: Date.now()
    });
    localStorage.setItem("toonflix_history", JSON.stringify(filtered.slice(0, 20)));
  } catch (e) {}
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

loadWatchPage();
console.log("✅ watch.js v2 loaded");
