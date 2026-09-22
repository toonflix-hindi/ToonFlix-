// ═══════════════════════════════════════════
// TOONFLIX - WATCH.JS (DEBUG VERSION)
// Screen pe debug info dikhega
// ═══════════════════════════════════════════

const firebaseConfig = {
  databaseURL: "https://toonflix-wed-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const animeRef = db.ref("anime");

function goBack() {
  const params = new URLSearchParams(window.location.search);
  const animeId = params.get("anime");
  if (animeId) window.location.href = `anime.html?id=${animeId}`;
  else window.location.href = "index.html";
}
window.goBack = goBack;

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

  animeRef.child(animeId).on("value", (snap) => {
    const a = snap.val();
    if (!a) {
      el.innerHTML = "<p class='empty-msg'>Anime not found.</p>";
      return;
    }

    // ═══════════════════════════════════════════
    // DEBUG INFO
    // ═══════════════════════════════════════════
    let debugHTML = `
      <div style="background:#1a1a2e;padding:16px;border-radius:12px;margin-bottom:16px;border:1px solid #22d3ee;">
        <h3 style="color:#22d3ee;margin-bottom:10px;font-size:0.9rem;">🔍 DEBUG INFO — Screenshot Bhejo</h3>
        <div style="font-size:0.75rem;color:#94a3b8;line-height:1.8;font-family:monospace;">
          <div><b>Anime:</b> ${a.title || "Untitled"}</div>
          <div><b>Anime ID:</b> ${animeId}</div>
          <div><b>Has "seasons"?</b> ${a.seasons ? "✅ YES" : "❌ NO"}</div>
          <div><b>Has "episodes"?</b> ${a.episodes ? "✅ YES" : "❌ NO"}</div>
          ${a.seasons ? `<div><b>Seasons:</b> ${Object.keys(a.seasons).join(", ")}</div>` : ""}
          ${a.episodes ? `<div><b>Episodes count:</b> ${Object.keys(a.episodes).length}</div>` : ""}
          <div><b>URL Season:</b> ${seasonParam}</div>
          <div><b>URL Episode:</b> ${epNum}</div>
        </div>
      </div>
    `;

    // ═══════════════════════════════════════════
    // FIND EPISODES — Try everything
    // ═══════════════════════════════════════════
    let workingEpisodes = null;
    let workingSeason = null;

    // Try 1: seasons[seasonParam]
    if (a.seasons && a.seasons[seasonParam]) {
      const eps = Object.keys(a.seasons[seasonParam]).filter(k => !k.startsWith("_"));
      if (eps.length > 0) {
        workingEpisodes = a.seasons[seasonParam];
        workingSeason = seasonParam;
        debugHTML += `<div style="color:#10b981;font-size:0.75rem;margin-top:8px;">✅ Found in seasons.${seasonParam} — ${eps.length} eps</div>`;
      }
    }

    // Try 2: seasons.Season_1
    if (!workingEpisodes && a.seasons && a.seasons.Season_1) {
      const eps = Object.keys(a.seasons.Season_1).filter(k => !k.startsWith("_"));
      if (eps.length > 0) {
        workingEpisodes = a.seasons.Season_1;
        workingSeason = "Season_1";
        debugHTML += `<div style="color:#10b981;font-size:0.75rem;margin-top:8px;">✅ Found in seasons.Season_1 — ${eps.length} eps</div>`;
      }
    }

    // Try 3: any season
    if (!workingEpisodes && a.seasons) {
      for (const sk of Object.keys(a.seasons)) {
        if (sk.startsWith("_")) continue;
        const eps = Object.keys(a.seasons[sk]).filter(k => !k.startsWith("_"));
        if (eps.length > 0) {
          workingEpisodes = a.seasons[sk];
          workingSeason = sk;
          debugHTML += `<div style="color:#10b981;font-size:0.75rem;margin-top:8px;">✅ Found in seasons.${sk} — ${eps.length} eps</div>`;
          break;
        }
      }
    }

    // Try 4: legacy episodes
    if (!workingEpisodes && a.episodes) {
      const eps = Object.keys(a.episodes);
      if (eps.length > 0) {
        workingEpisodes = a.episodes;
        workingSeason = "Season_1";
        debugHTML += `<div style="color:#fbbf24;font-size:0.75rem;margin-top:8px;">✅ Found in episodes (legacy) — ${eps.length} eps</div>`;
      }
    }

    // Nothing found
    if (!workingEpisodes) {
      el.innerHTML = debugHTML + `
        <p class="empty-msg" style="text-align:center;padding:40px 20px;color:#fbbf24;">
          ⚠️ Koi episode nahi mila. Upar debug info screenshot bhejo.
        </p>
        <div style="text-align:center;">
          <a href="anime.html?id=${encodeURIComponent(animeId)}" class="primary-btn" style="display:inline-block;padding:12px 24px;text-decoration:none;">
            ← Wapas
          </a>
        </div>
      `;
      return;
    }

    // ═══════════════════════════════════════════
    // BUILD EPISODES LIST
    // ═══════════════════════════════════════════
    const allEpisodes = Object.entries(workingEpisodes)
      .filter(([k, v]) => !k.startsWith("_") && v && typeof v === "object")
      .map(([eid, ep]) => ({ eid, ...ep }))
      .sort((x, y) => (parseInt(x.number) || 0) - (parseInt(y.number) || 0));

    debugHTML += `<div style="color:#10b981;font-size:0.75rem;margin-top:8px;">📺 Total episodes: ${allEpisodes.length}</div>`;
    debugHTML += `<div style="color:#10b981;font-size:0.75rem;">🔢 Numbers: ${allEpisodes.map(e => e.number).join(", ") || "None"}</div>`;

    // ═══════════════════════════════════════════
    // FIND CURRENT EPISODE
    // ═══════════════════════════════════════════
    let currentEp = allEpisodes.find(e => parseInt(e.number) === epNum);

    // Fallback: first episode
    if (!currentEp && allEpisodes.length > 0) {
      currentEp = allEpisodes[0];
      debugHTML += `<div style="color:#fbbf24;font-size:0.75rem;margin-top:8px;">⚠️ EP ${epNum} nahi mila — EP ${currentEp.number} dikha rahe hain</div>`;
    }

    if (!currentEp) {
      el.innerHTML = debugHTML + `<p class="empty-msg">No episodes available.</p>`;
      return;
    }

    // ═══ RENDER PLAYER ═══
    const idx = allEpisodes.findIndex(e => e.number === currentEp.number);
    const prevEp = idx > 0 ? allEpisodes[idx - 1] : null;
    const nextEp = idx < allEpisodes.length - 1 ? allEpisodes[idx + 1] : null;

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

    const embedUrl = servers[0]?.link || "";
    const safeAnimeId = encodeURIComponent(animeId);
    const safeSeason = encodeURIComponent(workingSeason);

    el.innerHTML = debugHTML + `
      <div class="watch-header">
        <h1>${a.title || "Untitled"}</h1>
        <p class="watch-ep-title">Episode ${currentEp.number}${currentEp.title ? ": " + currentEp.title : ""} • ${workingSeason.replace(/_/g, " ")}</p>
      </div>

      <div class="video-wrapper">
        ${embedUrl
          ? `<iframe src="${embedUrl}" allowfullscreen frameborder="0" allow="autoplay; encrypted-media; picture-in-picture"></iframe>`
          : `<div class="video-placeholder">⚠️ Video link nahi hai. Servers: ${servers.length}, Link: ${embedUrl || "empty"}</div>`
        }
      </div>

      ${servers.length > 1 ? `
        <div class="server-selector">
          <p class="server-label">🎬 Servers:</p>
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
        ${currentEp.telegram ? `<a href="${currentEp.telegram}" target="_blank" rel="noopener" class="watch-action-btn telegram">📱 Telegram</a>` : ""}
        ${currentEp.download ? `<a href="${currentEp.download}" target="_blank" rel="noopener" class="watch-action-btn download">⬇️ Download</a>` : ""}
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
        <h3>📺 ${workingSeason.replace(/_/g, " ")} — Episodes (${allEpisodes.length})</h3>
        <div class="ep-list-grid">
          ${allEpisodes.map(e => `
            <a href="watch.html?anime=${safeAnimeId}&season=${safeSeason}&ep=${e.number}"
               class="ep-list-btn ${e.number === currentEp.number ? 'active' : ''}">
              <span class="ep-num">${e.number}</span>
              <span class="ep-name">${e.title || "Episode " + e.number}</span>
            </a>
          `).join("")}
        </div>
      </div>

      <div class="back-to-anime">
        <a href="anime.html?id=${safeAnimeId}" class="primary-btn" style="display:block;text-align:center;text-decoration:none;">
          ← ${a.title} - Full Details
        </a>
      </div>
    `;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function switchServer(link, btn) {
  document.querySelectorAll(".server-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const iframe = document.querySelector(".video-wrapper iframe");
  if (iframe) iframe.src = link;
}
window.switchServer = switchServer;

loadWatchPage();
console.log("✅ watch.js DEBUG loaded");
