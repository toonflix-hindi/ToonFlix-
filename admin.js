// ═══════════════════════════════════════════
// TOONFLIX - ADMIN PANEL LOGIC
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
      resetForm();
    }).catch(e => alert("❌ Error: " + e.message));
  } else {
    anime.createdAt = Date.now();
    animeRef.push(anime).then(() => {
      alert("✅ Anime added successfully!");
      resetForm();
    }).catch(e => alert("❌ Error: " + e.message));
  }
}

function resetForm() {
  ["aTitle","aPoster","aBanner","aYear","aRating","aGenres","aEpisodes","aDesc"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const t10 = document.getElementById("aTop10");
  if (t10) t10.checked = false;
  currentEditId = null;
}

// ═══════════════════════════════════════════
// ADMIN LIST
// ═══════════════════════════════════════════
function renderAdminList(list) {
  const el = document.getElementById("adminList");
  if (!el) return;
  if (!list.length) { el.innerHTML = '<p class="empty-msg">No anime yet.</p>'; return; }
  el.innerHTML = list.map(a => `
    <div class="admin-list-item">
      <img src="${a.poster||''}" onerror="this.src='https://via.placeholder.com/50x65'">
      <div class="info">
        <strong>${a.title||'Untitled'}</strong>
        <small>${a.year||''} ${a.rating?'⭐'+a.rating:''} • ${a.episodes?Object.keys(a.episodes).length:0} eps</small>
      </div>
      <button class="btn-edit" onclick="editAnime('${a.id}')">Edit</button>
      <button class="btn-episodes" onclick="openEpisodes('${a.id}','${(a.title||'').replace(/'/g,"\\'")}')">Eps</button>
      <button class="btn-delete" onclick="deleteAnime('${a.id}','${(a.title||'').replace(/'/g,"\\'")}')">Del</button>
    </div>
  `).join("");
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
    if (!filtered.length) {
      results.innerHTML = '<p class="empty-msg">No match.</p>';
      return;
    }
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
    el.innerHTML = list.map(([eid, ep]) => {
      const tags = [];
      if (ep.telegram) tags.push('📱 TG');
      if (ep.streaming || ep.link) tags.push('🎬 Stream');
      if (ep.streaming2) tags.push('S2');
      if (ep.streaming3) tags.push('S3');
      if (ep.download) tags.push('⬇️ DL');
      return `
        <div class="admin-list-item">
          <div class="info">
            <strong>EP ${ep.number}: ${ep.title||""}</strong>
            <small>${tags.join(' • ') || 'No links'}</small>
          </div>
          <button class="btn-delete" onclick="deleteEpisode('${eid}')">Del</button>
        </div>
      `;
    }).join("");
  });
}

// ═══════════════════════════════════════════
// ADD EPISODE — FIXED VALIDATION
// ═══════════════════════════════════════════
function addEpisode() {
  if (!currentEditId) { alert("Pehle anime select karein."); return; }

  const num = document.getElementById("epNumber").value;
  const title = document.getElementById("epTitle").value.trim();

  // Ye fields optional hain — jo bhi mile
  const epLink = document.getElementById("epLink");
  const epLink2 = document.getElementById("epLink2");
  const epLink3 = document.getElementById("epLink3");
  const epTelegram = document.getElementById("epTelegram");
  const epDownload = document.getElementById("epDownload");
  const epThumb = document.getElementById("epThumb");

  const link = epLink ? epLink.value.trim() : "";
  const link2 = epLink2 ? epLink2.value.trim() : "";
  const link3 = epLink3 ? epLink3.value.trim() : "";
  const telegram = epTelegram ? epTelegram.value.trim() : "";
  const download = epDownload ? epDownload.value.trim() : "";
  const thumb = epThumb ? epThumb.value.trim() : "";

  // ⚠️ FIXED: Sirf episode number zaroori hai
  if (!num) {
    alert("Episode number zaroori hai!");
    return;
  }

  // ⚠️ FIXED: Kam se kam EK link hona chahiye (Telegram YA Streaming)
  if (!link && !link2 && !link3 && !telegram) {
    alert("Kam se kam ek link daalo:\n• 📱 Telegram Link\n• 🎬 Streaming Server 1\n• 🎬 Streaming Server 2\n• 🎬 Streaming Server 3");
    return;
  }

  const payload = {
    number: parseInt(num),
    title: title,
    link: link,
    link2: link2,
    link3: link3,
    streaming: link,
    streaming2: link2,
    streaming3: link3,
    telegram: telegram,
    download: download,
    thumb: thumb,
    createdAt: Date.now()
  };

  animeRef.child(currentEditId).child("episodes").push(payload).then(() => {
    alert("✅ Episode added!");
    ["epNumber","epTitle","epLink","epLink2","epLink3","epTelegram","epDownload","epThumb"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }).catch(e => alert("❌ Error: " + e.message));
}

function deleteEpisode(eid) {
  if (!confirm("Episode delete karein?")) return;
  animeRef.child(currentEditId).child("episodes").child(eid).remove();
}
