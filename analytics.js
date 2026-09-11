// ═══════════════════════════════════════════
// TOONFLIX ANALYTICS - USER TRACKING
// ═══════════════════════════════════════════

const firebaseConfig = {
  databaseURL: "https://toonflix-wed-default-rtdb.firebaseio.com/"
};

// Firebase ek baar initialize
if (!firebase.apps || !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const adb = firebase.database();
const analyticsRef = adb.ref("analytics");

// ═══════════════════════════════════════════
// UNIQUE VISITOR ID
// ═══════════════════════════════════════════
function getVisitorId() {
  let vid = localStorage.getItem("toonflix_visitor_id");
  if (!vid) {
    vid = "v_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("toonflix_visitor_id", vid);
  }
  return vid;
}

// ═══════════════════════════════════════════
// SESSION ID
// ═══════════════════════════════════════════
function getSessionId() {
  let sid = sessionStorage.getItem("toonflix_session_id");
  if (!sid) {
    sid = "s_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem("toonflix_session_id", sid);
  }
  return sid;
}

// ═══════════════════════════════════════════
// DEVICE DETECTION
// ═══════════════════════════════════════════
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "Mobile";
  return "Desktop";
}

// ═══════════════════════════════════════════
// TODAY'S DATE
// ═══════════════════════════════════════════
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ═══════════════════════════════════════════
// TRACK PAGE VIEW
// ═══════════════════════════════════════════
function trackPageView(pageName = "home", extraData = {}) {
  const visitorId = getVisitorId();
  const device = getDeviceType();
  const today = getTodayKey();
  const timestamp = Date.now();

  try {
    // Daily visitors (unique per day)
    analyticsRef.child("daily").child(today).child("visitors").child(visitorId).set(timestamp);

    // Daily page views
    analyticsRef.child("daily").child(today).child("pageviews").transaction(c => (c || 0) + 1);

    // Total page views
    analyticsRef.child("total").child("pageviews").transaction(c => (c || 0) + 1);

    // All-time users
    analyticsRef.child("users").child(visitorId).update({
      lastSeen: timestamp,
      device: device
    });

    // Page breakdown
    analyticsRef.child("pages").child(pageName).transaction(c => (c || 0) + 1);

    // Device breakdown
    analyticsRef.child("devices").child(device).transaction(c => (c || 0) + 1);

    // Recent visitors
    analyticsRef.child("recent").push({
      visitorId: visitorId.substr(0, 12) + "...",
      page: pageName,
      device: device,
      time: timestamp,
      ...extraData
    });

    // Cleanup old recent (max 50)
    analyticsRef.child("recent").once("value").then(snap => {
      const items = snap.val() || {};
      const keys = Object.keys(items);
      if (keys.length > 50) {
        const sorted = keys.sort((a,b) => (items[a].time||0) - (items[b].time||0));
        sorted.slice(0, keys.length - 50).forEach(k => analyticsRef.child("recent").child(k).remove());
      }
    });
  } catch (e) {
    console.error("Analytics error:", e);
  }
}

// ═══════════════════════════════════════════
// TRACK EPISODE PLAY
// ═══════════════════════════════════════════
function trackEpisodePlay(animeId, animeTitle, epNumber) {
  const today = getTodayKey();
  const timestamp = Date.now();

  try {
    analyticsRef.child("episodes").child(animeId).child("plays").transaction(c => (c || 0) + 1);
    analyticsRef.child("episodes").child(animeId).update({
      title: animeTitle,
      lastPlayed: timestamp
    });
    analyticsRef.child("daily").child(today).child("episodePlays").transaction(c => (c || 0) + 1);
    analyticsRef.child("episodes").child(animeId).child("eps").child(epNumber).transaction(c => (c || 0) + 1);
  } catch (e) {
    console.error("Episode track error:", e);
  }
}

// ═══════════════════════════════════════════
// AUTO-TRACK ON PAGE LOAD
// ═══════════════════════════════════════════
(function autoTrack() {
  const path = window.location.pathname;
  let pageName = "home";

  if (path.includes("anime.html")) pageName = "anime-detail";
  else if (path.includes("watch.html")) pageName = "watch";
  else if (path.includes("login.html")) pageName = "login";
  else if (path.includes("admin.html")) pageName = "admin";
  else if (path.includes("analytics.html")) pageName = "analytics";

  setTimeout(() => {
    try { trackPageView(pageName); } catch (e) { console.error(e); }
  }, 1500);
})();