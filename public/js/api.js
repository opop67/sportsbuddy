async function apiJson(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || res.statusText || "Fejl");
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// ---------------------------
// Fælles hjælpefunktioner
// ---------------------------

// Logisk funktion: skifter menuens synlighed (aaben/lukket).
function toggleMenu(mainMenu, btnMenu, forceOpen) {
  const open = typeof forceOpen === "boolean" ? forceOpen : mainMenu.hidden;
  mainMenu.hidden = !open;
  btnMenu.setAttribute("aria-expanded", String(open));
}

// Logisk funktion: binder standard header-menu events til en side.
function bindHeaderMenu() {
  // Finder menu-knappen i headeren.
  const btnMenu = document.getElementById("btn-menu");
  // Finder selve dropdown-menuen i headeren.
  const mainMenu = document.getElementById("main-menu");
  // If-kontrol: stopper funktionen hvis en af DOM-delene mangler.
  if (!btnMenu || !mainMenu) return;

  // lytter globalt efter klik, så vi kan lukke menuen ved klik udenfor.
  document.addEventListener("click", (event) => {
    // If-betingelse: hvis menu er aaben OG klik er udenfor menu-wrapper.
    if (!mainMenu.hidden && !event.target.closest(".menu-wrap")) {
      // Logisk funktion: tvinger menuens state til "lukket".
      toggleMenu(mainMenu, btnMenu, false);
    }
  });

  // Lytter efter klik paa menu-knappen.
  btnMenu.addEventListener("click", () => {
    // Logisk funktion: toggler mellem aaben/lukket menu.
    toggleMenu(mainMenu, btnMenu);
  });
}

// Logisk funktion: viser/skjuler notifikationspanel fra klokken i headeren.
function bindNotifications() {
  const btnBell = document.querySelector('.header-actions .icon-btn[aria-label="Notifikationer"]');
  const headerActions = document.querySelector(".header-actions");
  if (!btnBell || !headerActions) return;

  let panel = document.getElementById("notification-panel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "notification-panel";
    panel.className = "notification-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Notifikationer");
    panel.innerHTML =
      '<p class="notification-item">95% match og din perfekte makker</p>' +
      '<p class="notification-item">Du går glip af en kamp</p>';
    headerActions.appendChild(panel);
  }

  btnBell.setAttribute("aria-expanded", "false");

  btnBell.addEventListener("click", (event) => {
    event.stopPropagation();
    panel.hidden = !panel.hidden;
    btnBell.setAttribute("aria-expanded", String(!panel.hidden));
  });

  document.addEventListener("click", (event) => {
    const clickedInPanel = !!event.target.closest("#notification-panel");
    if (!clickedInPanel && event.target !== btnBell && !btnBell.contains(event.target)) {
      panel.hidden = true;
      btnBell.setAttribute("aria-expanded", "false");
    }
  });
}

// Logisk funktion: validerer og renser tal-input.
function toPositiveInt(value) {
  const cleaned = String(value).replace(/[^\d]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Hjælper til sikker rendering af tekst i HTML-strenge.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Fælles logout-flow.
function bindLogout() {
  const btnLogout = document.getElementById("btn-logout");
  if (!btnLogout) return;

  btnLogout.addEventListener("click", async () => {
    btnLogout.disabled = true;
    try {
      await apiJson("/api/logout", { method: "POST" });
    } catch {
      /* redirect anyway */
    }
    window.location.href = "/login.html";
  });
}

// Standard level-data til sider med niveauer.
function getDefaultLevels() {
  return {
    sports: {
      Padel: {
        level: 7,
        points: 1240,
        matches: [
          { date: "2026-05-01", opponent: "Lucas", opponentRating: 1310, result: "win" },
          { date: "2026-04-28", opponent: "Emil", opponentRating: 1180, result: "win" },
          { date: "2026-04-25", opponent: "Noah", opponentRating: 1260, result: "loss" },
        ],
      },
      Football: { level: 5, points: 990, matches: [] },
      Badminton: { level: 6, points: 1080, matches: [] },
      Basketball: { level: null, points: 0, matches: [] },
      Tennis: { level: null, points: 0, matches: [] },
      Volleyball: { level: null, points: 0, matches: [] },
    },
  };
}

// ---------------------------
// Side: login
// ---------------------------
async function initLoginPage() {
  const form = document.getElementById("form");
  const msg = document.getElementById("msg");
  const btnLogin = document.getElementById("btn-login");
  if (!form || !msg || !btnLogin) return;

  try {
    await apiJson("/api/me");
    window.location.href = "/home.html";
    return;
  } catch {
    /* stay */
  }

  function setBusy(busy) {
    btnLogin.disabled = busy;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    if (!username || !password) {
      msg.textContent = "Udfyld navn og adgangskode.";
      return;
    }
    setBusy(true);
    try {
      await apiJson("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      window.location.href = "/home.html";
    } catch (err) {
      msg.textContent = err.message || "Kunne ikke logge ind.";
    } finally {
      setBusy(false);
    }
  });
}

// ---------------------------
// Side: register
// ---------------------------
async function initRegisterPage() {
  const form = document.getElementById("form");
  const msg = document.getElementById("msg");
  const btnSubmit = document.getElementById("btn-submit");
  if (!form || !msg || !btnSubmit) return;

  try {
    await apiJson("/api/me");
    window.location.href = "/home.html";
    return;
  } catch {
    /* stay */
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    if (username.length < 2) {
      msg.textContent = "Navn skal være mindst 2 tegn.";
      return;
    }
    if (password.length < 6) {
      msg.textContent = "Adgangskode skal være mindst 6 tegn.";
      return;
    }
    btnSubmit.disabled = true;
    try {
      await apiJson("/api/register", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      window.location.href = "/home.html";
    } catch (err) {
      msg.textContent = err.message || "Kunne ikke oprette konto.";
    } finally {
      btnSubmit.disabled = false;
    }
  });
}

// ---------------------------
// Side: home
// ---------------------------
async function initHomePage() {
  bindHeaderMenu();
  bindNotifications();
  bindLogout();

  const homeProfileAvatar = document.getElementById("home-profile-avatar");
  const homeProfileWelcome = document.getElementById("home-profile-welcome");
  const homeProfileSport = document.getElementById("home-profile-sport");
  const arrangementsPreview = document.getElementById("arrangements-preview");
  const homeLevelText = document.getElementById("home-level-text");
  const homeLevelFill = document.getElementById("home-level-fill");
  if (!homeProfileAvatar) return;

  let u = null;
  try {
    const data = await apiJson("/api/me");
    u = data.user;
    const key = "sportsbuddy_profile_" + u.id;
    const profile = JSON.parse(localStorage.getItem(key) || "{}");
    const name = String(profile.name || u.username || "").trim();
    const first = name.charAt(0).toUpperCase() || "S";
    const preferredSport = String(profile.prioritySport || "").trim();
    const levelsKey = "sportsbuddy_levels_" + u.id;
    const levelsData = JSON.parse(localStorage.getItem(levelsKey) || "null") || getDefaultLevels();
    localStorage.setItem(levelsKey, JSON.stringify(levelsData));
    const preferredData = levelsData.sports[preferredSport] || { level: null };
    const level = Number(preferredData.level);

    homeProfileAvatar.textContent = first;
    homeProfileWelcome.textContent = "Welcome back, " + name;
    homeProfileSport.textContent = preferredSport
      ? "Preferred sport: " + preferredSport
      : "Preferred sport: Not set";

    if (preferredSport && Number.isFinite(level) && level > 0) {
      homeLevelText.textContent = preferredSport + " level: " + level + " / 10";
      homeLevelFill.style.width = level * 10 + "%";
    } else {
      homeLevelText.textContent = "Play 3 beginner matches to get your level";
      homeLevelFill.style.width = "10%";
    }

    const { arrangements } = await apiJson("/api/arrangements");
    const mine = (arrangements || []).filter((a) => a.user_id === u.id);
    if (mine.length === 0) {
      arrangementsPreview.textContent = "Ingen kommende arrangements endnu.";
      return;
    }
    const next = mine[0];
    const fee = Number(next.fee || 0);
    const players = Number(next.players || 0);
    const split = fee > 0 && players > 0 ? (fee / players).toFixed(0) : "0";
    arrangementsPreview.textContent =
      next.sport + " i " + next.location + " - " + players + " spillere. Split: " + split + " kr.";
  } catch {
    if (!u) {
      window.location.href = "/login.html";
      return;
    }
    arrangementsPreview.textContent = "Ingen kommende arrangements endnu.";
  }
}

// ---------------------------
// Side: arrangements
// ---------------------------
async function initArrangementsPage() {
  bindHeaderMenu();
  bindNotifications();
  bindLogout();

  const form = document.getElementById("arrange-form");
  const msg = document.getElementById("arrange-msg");
  const btnOpenArrange = document.getElementById("btn-open-arrange");
  const btnCloseArrange = document.getElementById("btn-close-arrange");
  const arrangeModal = document.getElementById("arrange-modal");
  const arrangementsList = document.getElementById("arrangements-list");
  if (!form) return;

  function getSportIcon(sport) {
    const key = String(sport || "").toLowerCase();
    if (key.includes("padel")) return "🎾";
    if (key.includes("football") || key.includes("fodbold") || key.includes("soccer")) return "⚽";
    if (key.includes("basket")) return "🏀";
    if (key.includes("tennis")) return "🎾";
    if (key.includes("badminton")) return "🏸";
    if (key.includes("volley")) return "🏐";
    return "🏅";
  }

  async function getAllArrangements() {
    const data = await apiJson("/api/arrangements");
    return Array.isArray(data.arrangements) ? data.arrangements : [];
  }

  // Loekke: map() gennemloeber alle arrangements for at bygge UI-kort.
  async function renderArrangements() {
    const list = await getAllArrangements();
    arrangementsList.innerHTML = list
      .map((item) => {
        const fee = Number(item.fee || 0);
        const players = Number(item.players || 0);
        const split = fee > 0 && players > 0 ? Math.round(fee / players) : 0;
        const level = Math.min(10, Math.max(1, Number(item.level || 5)));
        return (
          '<article class="arrangement-item">' +
          '<div class="arrangement-icon" aria-hidden="true">' +
          getSportIcon(item.sport) +
          "</div>" +
          '<div class="arrangement-content">' +
          "<h3>" +
          escapeHtml(item.sport) +
          "</h3>" +
          "<p>" +
          escapeHtml(item.location) +
          " · " +
          players +
          " players · " +
          (fee > 0 ? "Split " + split + " kr/person" : "No fee") +
          "</p>" +
          '<div class="arrangement-level">' +
          '<span class="arrangement-level-label">Level: ' +
          level +
          '/10</span>' +
          '<div class="arrangement-level-track" role="progressbar" aria-valuemin="1" aria-valuemax="10" aria-valuenow="' +
          level +
          '" aria-label="Participant level">' +
          '<span class="arrangement-level-fill" style="width:' +
          level * 10 +
          '%"></span>' +
          "</div>" +
          "</div>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function setArrangeModal(open) {
    arrangeModal.hidden = !open;
  }

  btnOpenArrange.addEventListener("click", () => setArrangeModal(true));
  btnCloseArrange.addEventListener("click", () => setArrangeModal(false));
  arrangeModal.addEventListener("click", (event) => {
    if (event.target === arrangeModal) setArrangeModal(false);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    msg.textContent = "";

    const sport = document.getElementById("sport").value.trim();
    const players = toPositiveInt(document.getElementById("players").value);
    const location = document.getElementById("location").value.trim();
    const fee = toPositiveInt(document.getElementById("fee").value);

    if (!sport || !players || !location) {
      msg.textContent = "Please fill sport, people and where.";
      return;
    }

    try {
      await apiJson("/api/arrangements", {
        method: "POST",
        body: JSON.stringify({ sport, players, location, fee }),
      });
    } catch (err) {
      msg.textContent = err.message || "Could not save arrangement.";
      return;
    }
    form.reset();
    setArrangeModal(false);
    await renderArrangements();
  });

  try {
    await apiJson("/api/me");
  } catch {
    window.location.href = "/login.html";
    return;
  }
  await renderArrangements();
}

// ---------------------------
// Side: profile
// ---------------------------
async function initProfilePage() {
  bindHeaderMenu();
  bindNotifications();
  bindLogout();

  const profileForm = document.getElementById("profile-form");
  const profileMsg = document.getElementById("profile-msg");
  const profileAvatar = document.getElementById("profile-avatar");
  if (!profileForm) return;

  let profileStorageKey = "sportsbuddy_profile_guest";

  function setAvatarFromName(name) {
    const first = String(name || "").trim().charAt(0).toUpperCase();
    profileAvatar.textContent = first || "S";
  }

  function loadProfile(defaultName) {
    const saved = JSON.parse(localStorage.getItem(profileStorageKey) || "{}");
    const name = saved.name || defaultName || "";
    document.getElementById("profile-name").value = name;
    document.getElementById("profile-age").value = saved.age || "";
    document.getElementById("profile-bio").value = saved.bio || "";
    document.getElementById("profile-sport").value = saved.prioritySport || "";
    setAvatarFromName(name);
  }

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    profileMsg.textContent = "";

    const name = document.getElementById("profile-name").value.trim();
    const age = toPositiveInt(document.getElementById("profile-age").value);
    const bio = document.getElementById("profile-bio").value.trim();
    const prioritySport = document.getElementById("profile-sport").value;

    if (!name || !age || !bio || !prioritySport) {
      profileMsg.textContent = "Please fill name, age, bio and priority sport.";
      return;
    }

    const payload = { name, age, bio, prioritySport };
    localStorage.setItem(profileStorageKey, JSON.stringify(payload));
    setAvatarFromName(name);
    profileMsg.textContent = "Profile saved.";
  });

  try {
    const data = await apiJson("/api/me");
    const user = data.user;
    profileStorageKey = "sportsbuddy_profile_" + user.id;
    loadProfile(user.username);
  } catch {
    window.location.href = "/login.html";
  }
}

// ---------------------------
// Side: levels
// ---------------------------
async function initLevelsPage() {
  bindHeaderMenu();
  bindNotifications();
  bindLogout();

  const levelsGrid = document.getElementById("levels-grid");
  const overallScoreValue = document.getElementById("overall-score-value");
  const levelDetailTitle = document.getElementById("level-detail-title");
  const levelDetailPoints = document.getElementById("level-detail-points");
  const matchHistory = document.getElementById("match-history");
  if (!levelsGrid) return;

  let levelData = null;
  let selectedSport = "Padel";

  function pointsFromMatch(currentPoints, match) {
    const diff = Number(match.opponentRating || currentPoints) - currentPoints;
    const swing = Math.max(-12, Math.min(16, Math.round(diff / 40)));
    if (match.result === "win") return 20 + swing;
    return -15 + Math.round(swing / 2);
  }

  function renderOverall() {
    const sports = Object.values(levelData.sports);
    const withLevel = sports.filter((s) => Number.isFinite(Number(s.level)) && Number(s.level) > 0);
    if (withLevel.length === 0) {
      overallScoreValue.textContent = "-";
      return;
    }
    const avg = withLevel.reduce((sum, item) => sum + Number(item.level), 0) / withLevel.length;
    overallScoreValue.textContent = avg.toFixed(1) + " / 10";
  }

  // Loekke: map() bygger sportskortene ud fra alle sportsgrene i data.
  function renderSportCards() {
    levelsGrid.innerHTML = Object.entries(levelData.sports)
      .map(([sport, data]) => {
        const lvl = Number(data.level);
        const hasLevel = Number.isFinite(lvl) && lvl > 0;
        return (
          '<button type="button" class="sport-level-card' +
          (sport === selectedSport ? " active" : "") +
          '" data-sport="' +
          escapeHtml(sport) +
          '">' +
          "<h3>" +
          escapeHtml(sport) +
          "</h3>" +
          (hasLevel
            ? '<p class="sport-level-value">Level ' + lvl + " / 10</p>"
            : '<p class="sport-level-missing">Play 3 beginner matches to get your level.</p>') +
          "</button>"
        );
      })
      .join("");

    levelsGrid.querySelectorAll("[data-sport]").forEach((el) => {
      el.addEventListener("click", () => {
        selectedSport = el.getAttribute("data-sport");
        renderSportCards();
        renderDetail();
      });
    });
  }

  function renderDetail() {
    const sport = selectedSport;
    const data = levelData.sports[sport] || { level: null, points: 0, matches: [] };
    const points = Number(data.points || 0);
    const matches = Array.isArray(data.matches) ? data.matches : [];

    levelDetailTitle.textContent = sport + " details";
    levelDetailPoints.textContent = "Points: " + points;

    if (matches.length === 0) {
      matchHistory.innerHTML =
        '<p class="sport-level-missing">No match history yet. Play 3 beginner matches to get your level.</p>';
      return;
    }

    matchHistory.innerHTML = matches
      .map((match) => {
        const delta = pointsFromMatch(points, match);
        const prefix = delta >= 0 ? "+" : "";
        return (
          '<article class="match-row">' +
          "<p><strong>" +
          escapeHtml(match.date) +
          "</strong> · vs " +
          escapeHtml(match.opponent) +
          " (" +
          Number(match.opponentRating || 0) +
          ") · " +
          escapeHtml(match.result.toUpperCase()) +
          "</p>" +
          '<p class="match-points">' +
          prefix +
          delta +
          " points</p>" +
          "</article>"
        );
      })
      .join("");
  }

  try {
    const data = await apiJson("/api/me");
    const user = data.user;
    const profile = JSON.parse(localStorage.getItem("sportsbuddy_profile_" + user.id) || "{}");
    const key = "sportsbuddy_levels_" + user.id;
    levelData = JSON.parse(localStorage.getItem(key) || "null") || getDefaultLevels();
    localStorage.setItem(key, JSON.stringify(levelData));
    if (profile.prioritySport && levelData.sports[profile.prioritySport]) {
      selectedSport = profile.prioritySport;
    }
  } catch {
    window.location.href = "/login.html";
    return;
  }

  renderOverall();
  renderSportCards();
  renderDetail();
}

// ---------------------------
// Side: badges
// ---------------------------
async function initBadgesPage() {
  bindHeaderMenu();
  bindNotifications();
  bindLogout();
  const badgesGrid = document.getElementById("badges-grid");
  if (!badgesGrid) return;

  function getTier(score) {
    if (score >= 90) return { name: "Gold", css: "gold" };
    if (score >= 60) return { name: "Silver", css: "silver" };
    return { name: "Copper", css: "copper" };
  }

  function pct(value, max) {
    return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  }

  // Loekke: map() gennemgaar badge-kategorier og renderer dem dynamisk.
  function renderBadges(metrics) {
    const categories = [
      {
        title: "Arrangement Host",
        subtitle: "How many times you arranged a session",
        value: metrics.arrangedCount,
        suffix: "arrangements",
        score: pct(metrics.arrangedCount, 20),
      },
      {
        title: "Active Participant",
        subtitle: "How many arrangements you joined",
        value: metrics.participatedCount,
        suffix: "joined",
        score: pct(metrics.participatedCount, 30),
      },
      {
        title: "Team Player Rating",
        subtitle: "Rating from other players",
        value: metrics.teamPlayerRating,
        suffix: "/5",
        score: pct(metrics.teamPlayerRating, 5),
      },
      {
        title: "Motivator",
        subtitle: "How many people you motivated",
        value: metrics.motivatedCount,
        suffix: "players",
        score: pct(metrics.motivatedCount, 25),
      },
    ];

    badgesGrid.innerHTML = categories
      .map((cat) => {
        const tier = getTier(cat.score);
        return (
          '<article class="badge-card">' +
          '<div class="badge-top">' +
          '<div class="badge-medal ' +
          tier.css +
          '">' +
          escapeHtml(tier.name) +
          "</div>" +
          '<div class="badge-title-wrap">' +
          "<h2>" +
          escapeHtml(cat.title) +
          "</h2>" +
          "<p>" +
          escapeHtml(cat.subtitle) +
          "</p>" +
          "</div>" +
          "</div>" +
          '<p class="badge-value">' +
          cat.value +
          " " +
          escapeHtml(cat.suffix) +
          "</p>" +
          '<div class="badge-progress-track">' +
          '<span class="badge-progress-fill" style="width:' +
          cat.score +
          '%"></span>' +
          "</div>" +
          '<p class="badge-tier-text">' +
          escapeHtml(tier.name) +
          " tier · " +
          cat.score +
          "%</p>" +
          "</article>"
        );
      })
      .join("");
  }

  try {
    const data = await apiJson("/api/me");
    const user = data.user;
    const { arrangements } = await apiJson("/api/arrangements");
    const arrangedCount = (arrangements || []).filter((a) => a.user_id === user.id).length;
    const key = "sportsbuddy_badges_" + user.id;
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    const metrics =
      stored || {
        arrangedCount,
        participatedCount: 9,
        teamPlayerRating: 4.4,
        motivatedCount: 12,
      };
    metrics.arrangedCount = arrangedCount;
    localStorage.setItem(key, JSON.stringify(metrics));
    renderBadges(metrics);
  } catch {
    window.location.href = "/login.html";
  }
}

// ---------------------------
// Side-router: vaelger korrekt init
// ---------------------------
function initPageScripts() {
  const page = document.body.dataset.page;
  if (page === "login") return initLoginPage();
  if (page === "register") return initRegisterPage();
  if (page === "home") return initHomePage();
  if (page === "arrangements") return initArrangementsPage();
  if (page === "profile") return initProfilePage();
  if (page === "levels") return initLevelsPage();
  if (page === "badges") return initBadgesPage();
}

document.addEventListener("DOMContentLoaded", initPageScripts);
