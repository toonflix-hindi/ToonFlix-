const firebaseConfig = {
  databaseURL: "https://toonflix-wed-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const animeRef = db.ref("anime");

let allAnime = [];
let currentEditId = null;

// Load all anime
animeRef.on("value", (snap) => {
  const data = snap.val() || {};
  allAnime = Object.entries(data).map(([id, val]) => ({ id, ...val }));
  renderAdminList(allAnime);
});

// --- Save / Update Anime ---
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
    });
  } else {
    anime.createdAt = Date.now();
    animeRef.push(anime).then(() => {
      alert("✅ Anime added successfully!");
      resetForm();
    });
  }
}

function resetForm() {
  ["aTitle","aPoster","aBanner","aYear","aRating","aGenres","aEpisodes","aDesc"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("aTop10").checked = false;
  currentEditId = null;
}

// --- Render Admin List ---
function renderAdminList(list) {
  const el = document.getElementById("adminList");
  if (!list.length) { el.innerHTML = '<p class="empty-msg">No anime yet.</p>'; return; }
  el.innerHTML = list.map(a => `
    <div class="admin-list-item">
      <img src="${a.poster||''}" onerror="this.src='https://via.placeholder.com/50x65'">
      <div class="info">
        <strong>${a.title}</strong>
        <small>${a.year||''} ${a.rating?'⭐'+a.rating:''} • ${a.episodes?Object.keys(a.episodes).length:0} eps</small>
      </div>
      <button class="btn-edit" onclick="editAnime('${a.id}')">Edit</button>
      <button class="btn-episodes" onclick="openEpisodes('${a.id}','${a.title.replace(/'/g,"\\'")}')">Episodes</button>
      <button class="btn-delete" onclick="deleteAnime('${a.id}','${a.title.replace(/'/g,"\\'")}')">Del</button>
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
  document.getElementById("aGenres").value = a.genres || "";
  document.getElementById("aEpisodes").value = a.totalEpisodes || "";
  document.getElementById("aDesc").value = a.description || "";
  document.getElementById("aTop10").checked = !!a.top10;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteAnime(id, title) {
  if (!confirm(`"${title}" delete karein?`)) return;
  animeRef.child(id).remove().then(() => alert("🗑️ Deleted"));
}

// --- Admin Search ---
const adminSearch = document.getElementById("adminSearch");
if (adminSearch) {
  adminSearch.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const results = document.getElementById("adminSearchResults");
    if (!q) { results.innerHTML = ""; return; }
    const filtered = allAnime.filter(a => a.title.toLowerCase().includes(q));
    if (!filtered.length) {
      results.innerHTML = '<p class="empty-msg">No match. Upar form se naya add karein.</p>';
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

// --- Episodes ---
function openEpisodes(id, title) {
  currentEditId = id;
  document.getElementById("currentAnimeName").textContent = title;
  document.getElementById("episodeSection").style.display = "block";
  window.scrollTo({ top: document.getElementById("episodeSection").offsetTop, behavior: "smooth" });
  loadEpisodes(id);
}

function loadEpisodes(id) {
  animeRef.child(id).child("episodes").on("value", (snap) => {
    const eps = snap.val() || {};
    const list = Object.entries(eps).sort((a,b) => a[1].number - b[1].number);
    const el = document.getElementById("episodeList");
    if (!list.length) { el.innerHTML = '<p class="empty-msg">No episodes yet.</p>'; return; }
    el.innerHTML = list.map(([eid, ep]) => `
      <div class="admin-list-item">
        <div class="info">
          <strong>EP ${ep.number}: ${ep.title||""}</strong>
          <small>${ep.link || ""}</small>
        </div>
        <button class="btn-delete" onclick="deleteEpisode('${eid}')">Del</button>
      </div>
    `).join("");
  });
}

function addEpisode() {
  if (!currentEditId) { alert("Pehle anime select karein."); return; }
  const num = document.getElementById("epNumber").value;
  const title = document.getElementById("epTitle").value.trim();
  const link = document.getElementById("epLink").value.trim();
  const thumb = document.getElementById("epThumb").value.trim();
  if (!num || !link) { alert("Episode number aur link zaroori hai."); return; }

  animeRef.child(currentEditId).child("episodes").push({
    number: parseInt(num),
    title, link, thumb
  }).then(() => {
    alert("✅ Episode added");
    document.getElementById("epNumber").value = "";
    document.getElementById("epTitle").value = "";
    document.getElementById("epLink").value = "";
    document.getElementById("epThumb").value = "";
  });
}

function deleteEpisode(eid) {
  if (!confirm("Episode delete karein?")) return;
  animeRef.child(currentEditId).child("episodes").child(eid).remove();
}