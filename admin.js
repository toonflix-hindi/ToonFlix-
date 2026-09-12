// ═══════════════════════════════════════════
// TOONFLIX ADMIN - SMART EPISODE MANAGER
// ═══════════════════════════════════════════

const firebaseConfig = {
  databaseURL: "https://toonflix-wed-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const animeRef = db.ref("anime");

let allAnime = [];
let currentEditId = null;

// ═══════════════════════════════════════════
// LOAD ALL ANIME
// ═══════════════════════════════════════════
animeRef.on("value", (snap) => {
  const data = snap.val() || {};
  allAnime = Object.entries(data).map(([id, val]) => ({ id, ...val }));
  renderAdminList(allAnime);
});

// ═══════════════════════════════════════════
// SAVE ANIME
// ═══════════════════════════════════════════
function saveAnime() {
  const title = document.getElementById("aTitle").value.trim();
  const poster = document.getElementById("aPoster").value.trim();
  if (!title || !poster) { alert("Title aur Poster URL zaroori hai!"); return; }

  const anime = {
    title,
    poster,
    banner: document.getElementById("aBanner").value.trim(),
    year: document.getElementById("aYear").value.trim(),
    rating: document.getElementById("aRating").value.trim(),
    genres: document.getElementById("aGenres").value.trim(),
    totalEpisodes: document.getElementById("aEpisodes").value.trim(),
    description: document.getElementById("aDesc").value.trim(),
    top10: document.getElementById("aTop10").checked,
    updatedAt: Date.now()
  };

  if (currentEditId) {
    animeRef.child(currentEditId).update(anime).then(() => {
      alert("✅ Updated successfully!");
      resetAnimeForm();
    });
  } else {
    anime.createdAt = Date.now();
    animeRef.push(anime).then(() => {
      alert("✅ Anime added successfully!");
      resetAnimeForm();
    });
  }
}

function resetAnimeForm() {
  ["aTitle","aPoster","aBanner","aYear","aRating","aGenres","aEpisodes","aDesc"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const t = document.getElementById("aTop10");
  if (t) t.checked = false;
  currentEditId = null;
}

// ═══════════════════════════════════════════
// ADMIN LIST
// ═══════════════════════════════════════════
function renderAdminList(list) {
  const el = document.getElementById("adminList");
  if (!el) return;
  if (!list.length) { el.innerHTML = '<p class="empty-msg">No anime yet.</p>'; return; }
  el.innerHTML = list.map(a => {
    const epCount = a.episodes ? Object.keys(a.episodes).length : 0;
    return `
      <div class="admin-list-item">
        <img src="${a.poster||''}" onerror="this.src='https://via.placeholder.com/50x65'">
        <div class="info">
          <strong>${a.title||'Untitled'}</strong>
          <small>${a.year||''} ${a.rating?'⭐'+a.rating:''} • ${epCount} eps</small>
        </div>
        <button class="btn-edit" onclick="editAnime('${a.id}')">Edit</button>
        <button class="btn-episodes" onclick="openEpisodes('${a.id}','${(a.title||'').replace(/'/g,"\\'")}')">Eps</button>
        <button class="btn-delete" onclick="deleteAnime('${a.id}','${(a.title||'').replace(/'/g,"\\'")}')">Del</button>
      </div>
    `;
  }).join("");
}

function editAnime(id) {
  const a = allAnime.find(x => x.id === id);
  if (!a) return;
  currentEditId = id;
  document.getElementById("aTitle").value = a.title || "";
  document.getElementById("aPoster").value = a.poster || "";
  document.getElementById("aBanner").value = a.banner || "";
  document.getElementById("aYear").value = a.year || "";
  document.getElementById("aRating").value = a.rating || "";
  document.getElementById("aGenres").value = a.genres || a.genres2 || "";
  document.getElementById("aEpisodes").value = a.totalEpisodes || "";
  document.getElementById("aDesc").value = a.description || "";
  document.getElementById("aTop10").checked = !!a.top10;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteAnime(id, title) {
  if (!confirm(`"${title}" delete karein?`)) return;
  animeRef.child(id).remove().then(() => alert("🗑️ Deleted"));
}

// ═══════════════════════════════════════════
// ADMIN SEARCH
// ═══════════════════════════════════════════
const adminSearchInput = document.getElementById("adminSearch");
if (adminSearchInput) {
  adminSearchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const results = document.getElementById("adminSearchResults");
    if (!q) { results.innerHTML = ""; return; }
    const filtered = allAnime.filter(a => (a.title||"").toLowerCase().includes(q));
    if (!filtered.length) { results.innerHTML = '<p class="empty-msg">No match.</p>'; return; }
    results.innerHTML = filtered.map(a => `
      <div class="anime-card" onclick="editAnime('${a.id}')">
        <img src="${a.poster||''}" onerror="this.src='https://via.placeholder.com/300x400'">
        <div class="card-info"><h3>${a.title}</h3><p>Click to edit</p></div>
      </div>
    `).join("");
  });
}

// ═══════════════════════════════════════════
// EPISODES
// ═══════════════════════════════════════════
function openEpisodes(id, title) {
  currentEditId = id;
  document.getElementById("currentAnimeName").textContent = title;
  document.getElementById("episodeSection").style.display = "block";
  window.scrollTo({ top: document.getElementById("episodeSection").offsetTop, behavior: "smooth" });
  loadEpisodes(id);
}

function loadEpisodes(id) {
  animeRef.child(id).child("episodes").off();
  animeRef.child(id).child("episodes").on("value", (snap) => {
    const eps = snap.val() || {};
    const list = Object.entries(eps).sort((a,b) => a[1].number - b[1].number);
    const el = document.getElementById("episodeList");
    if (!list.length) { el.innerHTML = '<p class="empty-msg">No episodes yet.</p>'; return; }
    
    el.innerHTML = `
      <div style="margin-top:20px;">
        <h3 style="color:#d8b4fe;font-size:1rem;margin-bottom:12px;">📺 Episodes (${list.length})</h3>
        ${list.map(([eid, ep]) => {
          const qualities = [];
          if (ep.q480) qualities.push('480p');
          if (ep.q720) qualities.push('720p');
          if (ep.q1080) qualities.push('1080p');
          if (ep.q4k) qualities.push('4K');
          if (ep.streaming) qualities.push('S1');
          if (ep.telegram) qualities.push('📱');
          if (ep.download) qualities.push('⬇️');
          return `
            <div class="admin-list-item">
              <div class="info">
                <strong>EP ${ep.number}: ${ep.title || ''}</strong>
                <small>${qualities.join(' • ') || 'No links'}</small>
              </div>
              <button class="btn-delete" onclick="deleteEpisode('${eid}')">Del</button>
            </div>
          `;
        }).join("")}
      </div>
    `;
  });
}

// ═══════════════════════════════════════════
// MULTI-QUALITY EPISODE ADD (MAIN FEATURE)
// ═══════════════════════════════════════════
function addMultiQualityEpisode() {
  if (!currentEditId) { alert("Pehle anime select karein."); return; }

  const num = document.getElementById("mqNumber").value;
  const title = document.getElementById("mqTitle").value.trim();
  const q480 = document.getElementById("mq480").value.trim();
  const q720 = document.getElementById("mq720").value.trim();
  const q1080 = document.getElementById("mq1080").value.trim();
  const q4k = document.getElementById("mq4k").value.trim();
  const telegram = document.getElementById("mqTelegram").value.trim();
  const download = document.getElementById("mqDownload").value.trim();
  const thumb = document.getElementById("mqThumb").value.trim();

  if (!num) {
    alert("Episode Number zaroori hai!");
    return;
  }

  if (!q480 && !q720 && !q1080 && !q4k && !telegram) {
    alert("Kam se kam ek link daalo (480p, 720p, 1080p, 4K ya Telegram)!");
    return;
  }

  const payload = {
    number: parseInt(num),
    title: title,
    
    // Multi-quality links
    q480: q480,
    q720: q720,
    q1080: q1080,
    q4k: q4k,
    
    // Legacy fields (first available quality as default)
    streaming: q480 || q720 || q1080 || q4k || "",
    streaming2: q720 && q480 ? q720 : "",
    streaming3: q1080 && q480 ? q1080 : "",
    
    // Extras
    telegram: telegram,
    download: download,
    thumb: thumb,
    
    createdAt: Date.now()
  };

  animeRef.child(currentEditId).child("episodes").push(payload).then(() => {
    showToast("✅ Episode added with all qualities!");
    
    // Clear form
    ["mqNumber","mqTitle","mq480","mq720","mq1080","mq4k","mqTelegram","mqDownload","mqThumb"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }).catch(e => alert("❌ Error: " + e.message));
}

// ═══════════════════════════════════════════
// SINGLE EPISODE ADD
// ═══════════════════════════════════════════
function addSingleEpisode() {
  if (!currentEditId) { alert("Pehle anime select karein."); return; }

  const num = document.getElementById("slNumber").value;
  const title = document.getElementById("slTitle").value.trim();
  const link = document.getElementById("slLink").value.trim();
  const thumb = document.getElementById("slThumb").value.trim();

  if (!num) { alert("Episode Number zaroori hai!"); return; }
  if (!link) { alert("Link zaroori hai!"); return; }

  // Auto-detect link type
  const isTelegram = link.includes("t.me");
  const isDownload = link.includes("download") || link.includes("drive");

  const payload = {
    number: parseInt(num),
    title: title,
    telegram: isTelegram ? link : "",
    download: isDownload ? link : "",
    streaming: !isTelegram && !isDownload ? link : "",
    thumb: thumb,
    createdAt: Date.now()
  };

  animeRef.child(currentEditId).child("episodes").push(payload).then(() => {
    showToast("✅ Episode added!");
    ["slNumber","slTitle","slLink","slThumb"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  });
}

// ═══════════════════════════════════════════
// BATCH EPISODE ADD
// ═══════════════════════════════════════════
function addBatchEpisodes() {
  if (!currentEditId) { alert("Pehle anime select karein."); return; }

  const input = document.getElementById("batchInput").value.trim();
  if (!input) { alert("Episodes data daalo!"); return; }

  const lines = input.split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) { alert("Koi valid line nahi mili!"); return; }

  let added = 0;
  let errors = 0;

  lines.forEach((line, idx) => {
    const parts = line.split("|").map(p => p.trim());
    const num = parts[0];
    
    if (!num) { errors++; return; }

    const payload = {
      number: parseInt(num),
      title: parts[5] || "",
      q480: parts[1] || "",
      q720: parts[2] || "",
      q1080: parts[3] || "",
      telegram: parts[4] || "",
      streaming: parts[1] || "",
      streaming2: parts[2] || "",
      streaming3: parts[3] || "",
      createdAt: Date.now() + idx
    };

    animeRef.child(currentEditId).child("episodes").push(payload)
      .then(() => { added++; })
      .catch(() => { errors++; });
  });

  setTimeout(() => {
    showToast(`✅ ${added} episodes added! ${errors ? `(${errors} failed)` : ""}`);
    document.getElementById("batchInput").value = "";
  }, 1500);
}

// ═══════════════════════════════════════════
function deleteEpisode(eid) {
  if (!confirm("Episode delete karein?")) return;
  animeRef.child(currentEditId).child("episodes").child(eid).remove().then(() => {
    showToast("🗑️ Episode deleted");
  });
}

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════
function showToast(msg) {
  let toast = document.getElementById("toonToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toonToast";
    toast.className = "toon-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}
