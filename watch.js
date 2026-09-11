// ═══════════════════════════════════════════
// TOONFLIX - WATCH PAGE LOGIC
// ═══════════════════════════════════════════

const firebaseConfig = {
  databaseURL: "https://toonflix-wed-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const animeRef = db.ref("anime");

let currentAnime = null;
let currentEpNum = 0;
let allEpisodes = [];

// ═══ BACK BUTTON ═══
function goBack() {
  const params = new URLSearchParams(window.location.search);
  const animeId = params.get("anime");
  if (animeId) {
    window.location.href = `anime.html?id=${animeId}`;
  } else {
    window.location.href = "index.html";
  }
}

// ═══════════════════════════════════════════
// LOAD WATCH PAGE
// ═══════════════════════════════════════════
function loadWatchPage() {
  const params = new URLSearchParams(window.location.search);
  const animeId = params.get("anime");
  const epNum = parseInt(params.get("ep") || "1");
  const el = document.getElementById("watchContainer");

  if (!animeId) {
    el.innerHTML = "<p class='empty-msg'>Anime not found.</p>";
    return;
  }

  animeRef.child(animeId).on("value", (snap) => {
    const a = snap.val();
    if (!a) {
      el.innerHTML = "<p class='empty-msg'>Anime not found.</p>";
      return;
    }
    currentAnime = { id: animeId, ...a };
    currentEpNum = epNum;

    // Track episode play
    if (typeof trackEpisodePlay === "function") {
      const ep = a.episodes ? Object.values(a.episodes).find(e => e.number === epNum) : null;
      if (ep) {
        trackEpisodePlay(animeId, a.title || "Untitled", epNum);
      }
    }

    // Episodes sort karo
    allEpisodes = [];
    if (a.episodes) {
      allEpisodes = Object.entries(a.episodes)
        .map(([eid, ep]) => ({ eid, ...ep }))
        .sort((x, y) => x.number - y.number);
    }

    const currentEp = allEpisodes.find(e => e.number === epNum);

    if (!currentEp) {
      el.innerHTML = `
        <div style="padding:40px 20px;text-align:center;">
          <h2 style="margin-bottom:12px;">${a.title}</h2>
          <p class="empty-msg" style="margin-bottom:20px;">Episode ${epNum} nahi mila.</p>
          <a href="anime.html?id=${animeId}" class="primary-btn" style="display:inline-block;padding:12px 24px;text-decoration:none;max-width:250px;">← Wapas</a>
        </div>
      `;
      return;
    }

    // Progress save
    saveProgress(currentAnime, currentEp);

    // Nav
    const idx = allEpisodes.findIndex(e => e.number === epNum);
    const prevEp = idx > 0 ? allEpisodes[idx - 1] : null;
    const nextEp = idx < allEpisodes.length - 1 ? allEpisodes[idx + 1] : null;

    // Servers
    const servers = [];
    if (currentEp.streaming) servers.push({ name: "Server 1", link: currentEp.streaming });
    if (currentEp.streaming2) servers.push({ name: "Server 2", link: currentEp.streaming2 });
    if (currentEp.streaming3) servers.push({ name: "Server 3", link: currentEp.streaming3 });
    // Fallback agar purane episode me `link` field ho
    if (!servers.length && currentEp.link && !currentEp.telegram) {
      servers.push({ name: "Server 1", link: currentEp.link });
    }

    renderPlayer(a, currentEp, servers, prevEp, nextEp, idx);
  });
}

// ═══════════════════════════════════════════
// RENDER PLAYER
// ═══════════════════════════════════════════
function renderPlayer(anime, ep, servers, prevEp, nextEp, idx) {
  const el = document.getElementById("watchContainer");
  const embedUrl = servers[0]?.link || "";

  // Comments
  const comments = JSON.parse(localStorage.getItem(`comments_${anime.id}_${ep.number}`) || "[]");

  el.innerHTML = `
    <!-- Player Header -->
    <div class="watch-header">
      <h1>${anime.title || "Untitled"}</h1>
      <p class="watch-ep-title">Episode ${ep.number}${ep.title ? ": " + ep.title : ""}</p>
    </div>

    <!-- Video Player -->
    <div class="video-wrapper">
      ${embedUrl
        ? `<iframe src="${embedUrl}" allowfullscreen frameborder="0" allow="autoplay; encrypted-media; picture-in-picture"></iframe>`
        : `<div class="video-placeholder">⚠️ Is episode ka video link nahi hai</div>`
      }
    </div>

    <!-- Server Selector -->
    ${servers.length > 1 ? `
      <div class="server-selector">
        <p class="server-label">🎬 Streaming Servers:</p>
        <div class="server-btns">
          ${servers.map((s, i) => `
            <button class="server-btn ${i === 0 ? 'active' : ''}" onclick="switchServer('${s.link}', this)">
              ${s.name}
            </button>
          `).join("")}
        </div>
      </div>
    ` : ""}

    <!-- Action Bar -->
    <div class="watch-actions">
      ${ep.telegram ? `
        <a href="${ep.telegram}" target="_blank" rel="noopener" class="watch-action-btn telegram">
          📱 Telegram
        </a>
      ` : ""}
      ${ep.download ? `
        <a href="${ep.download}" target="_blank" rel="noopener" class="watch-action-btn download">
          ⬇️ Download
        </a>
      ` : ""}
      <button class="watch-action-btn comment" onclick="toggleComments()">
        💬 Comments (${comments.length})
      </button>
    </div>

    <!-- Comments Section -->
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

    <!-- Next/Prev -->
    <div class="ep-nav">
      ${prevEp
        ? `<a href="watch.html?anime=${anime.id}&ep=${prevEp.number}" class="ep-nav-btn">⏮️ EP ${prevEp.number}</a>`
        : `<button class="ep-nav-btn disabled" disabled>⏮️ No Previous</button>`
      }
      ${nextEp
        ? `<a href="watch.html?anime=${anime.id}&ep=${nextEp.number}" class="ep-nav-btn next">EP ${nextEp.number} ⏭️</a>`
        : `<button class="ep-nav-btn disabled" disabled>No Next ⏭️</button>`
      }
    </div>

    <!-- All Episodes -->
    <div class="all-episodes-list">
      <h3>📺 Saare Episodes (${allEpisodes.length})</h3>
      <div class="ep-list-grid">
        ${allEpisodes.map(e => `
          <a href="watch.html?anime=${anime.id}&ep=${e.number}"
             class="ep-list-btn ${e.number === ep.number ? 'active' : ''}">
            <span class="ep-num">${e.number}</span>
            <span class="ep-name">${e.title || "Episode " + e.number}</span>
            ${e.telegram ? '<span class="ep-tg">📱</span>' : ''}
          </a>
        `).join("")}
      </div>
    </div>

    <!-- Back to anime -->
    <div class="back-to-anime">
      <a href="anime.html?id=${anime.id}" class="primary-btn" style="display:block;text-align:center;text-decoration:none;">
        ← ${anime.title} - Full Details
      </a>
    </div>
  `;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ═══ SWITCH SERVER ═══
function switchServer(link, btn) {
  document.querySelectorAll(".server-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const iframe = document.querySelector(".video-wrapper iframe");
  if (iframe) iframe.src = link;
}

// ═══ COMMENTS ═══
function toggleComments() {
  const s = document.getElementById("commentsSection");
  s.style.display = s.style.display === "none" ? "block" : "none";
  if (s.style.display === "block") s.scrollIntoView({ behavior: "smooth" });
}

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

// ═══ SAVE PROGRESS ═══
function saveProgress(anime, ep) {
  try {
    const history = JSON.parse(localStorage.getItem("toonflix_history") || "[]");
    const filtered = history.filter(h => h.animeId !== anime.id);
    filtered.unshift({
      animeId: anime.id,
      title: anime.title,
      poster: anime.poster,
      epNumber: ep.number,
      epTitle: ep.title || "",
      timestamp: Date.now()
    });
    localStorage.setItem("toonflix_history", JSON.stringify(filtered.slice(0, 20)));
  } catch (e) { console.error(e); }
}

// ═══ TIME AGO ═══
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

// ═══ INIT ═══
loadWatchPage();