/**
 * VinylVault Application Logic
 * Handles UI interactions, search, marketplace rendering, and authentication.
 */

const API_BASE = window.location.origin;

// ── Auth Module ─────────────────────────────────────────
const Auth = (() => {
  const TOKEN_KEY = "vv_token";
  const USER_KEY = "vv_user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  async function parseResponse(res) {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { error: "Unexpected server response" };
    }
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getSavedUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  function saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  async function signup(username, email, password) {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await parseResponse(res);
    if (!res.ok) throw new Error(data.error || "Signup failed");
    setToken(data.token);
    saveUser(data.user);
    return data.user;
  }

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseResponse(res);
    if (!res.ok) throw new Error(data.error || "Login failed");
    setToken(data.token);
    saveUser(data.user);
    return data.user;
  }

  async function fetchCurrentUser() {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        removeToken();
        return null;
      }
      const data = await parseResponse(res);
      saveUser(data.user);
      return data.user;
    } catch {
      return getSavedUser();
    }
  }

  function logout() {
    removeToken();
  }

  function isLoggedIn() {
    return !!getToken();
  }

  return { getToken, signup, login, logout, fetchCurrentUser, isLoggedIn, getSavedUser };
})();

// ── Main App ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // ── DOM refs ────────────────────────────────────────────
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const searchResults = document.getElementById("searchResults");
  const searchStatus = document.getElementById("searchStatus");
  const marketGrid = document.getElementById("marketGrid");
  // Auth DOM refs
  const authButtons = document.getElementById("authButtons");
  const userMenu = document.getElementById("userMenu");
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userAvatarBtn = document.getElementById("userAvatarBtn");
  const userDropdown = document.getElementById("userDropdown");
  const userAvatarLetter = document.getElementById("userAvatarLetter");
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");

  // Modal DOM refs
  const modalOverlay = document.getElementById("modalOverlay");
  const loginModal = document.getElementById("loginModal");
  const signupModal = document.getElementById("signupModal");
  const loginClose = document.getElementById("loginClose");
  const signupClose = document.getElementById("signupClose");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const loginError = document.getElementById("loginError");
  const signupError = document.getElementById("signupError");
  const switchToSignup = document.getElementById("switchToSignup");
  const switchToLogin = document.getElementById("switchToLogin");

  let searchDebounce = null;

  // ── Mobile nav ──────────────────────────────────────────
  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navLinks.classList.remove("active"));
  });

  // ── Auth: modal open/close ──────────────────────────────
  function openModal(type) {
    modalOverlay.classList.remove("hidden");
    if (type === "login") {
      loginModal.classList.remove("hidden");
      signupModal.classList.add("hidden");
    } else {
      signupModal.classList.remove("hidden");
      loginModal.classList.add("hidden");
    }
    clearAuthErrors();
  }

  function closeModal() {
    modalOverlay.classList.add("hidden");
    loginModal.classList.add("hidden");
    signupModal.classList.add("hidden");
    clearAuthErrors();
    loginForm.reset();
    signupForm.reset();
  }

  function clearAuthErrors() {
    loginError.classList.add("hidden");
    loginError.textContent = "";
    signupError.classList.add("hidden");
    signupError.textContent = "";
  }

  function showFormLoading(form, loading) {
    const btn = form.querySelector(".auth-submit");
    const text = btn.querySelector(".btn-text");
    const spinner = btn.querySelector(".btn-spinner");
    if (loading) {
      btn.disabled = true;
      text.classList.add("hidden");
      spinner.classList.remove("hidden");
    } else {
      btn.disabled = false;
      text.classList.remove("hidden");
      spinner.classList.add("hidden");
    }
  }

  loginBtn.addEventListener("click", () => openModal("login"));
  signupBtn.addEventListener("click", () => openModal("signup"));
  loginClose.addEventListener("click", closeModal);
  signupClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  switchToSignup.addEventListener("click", () => openModal("signup"));
  switchToLogin.addEventListener("click", () => openModal("login"));

  // Close modal on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay.classList.contains("hidden")) {
      closeModal();
    }
  });

  // ── Auth: user dropdown toggle ──────────────────────────
  userAvatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!userDropdown.contains(e.target) && e.target !== userAvatarBtn) {
      userDropdown.classList.add("hidden");
    }
  });

  // ── Auth: login form submit ─────────────────────────────
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAuthErrors();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    showFormLoading(loginForm, true);

    try {
      const user = await Auth.login(email, password);
      updateAuthUI(user);
      closeModal();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove("hidden");
    } finally {
      showFormLoading(loginForm, false);
    }
  });

  // ── Auth: signup form submit ────────────────────────────
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAuthErrors();

    const username = document.getElementById("signupUsername").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirm").value;

    if (password !== confirm) {
      signupError.textContent = "Passwords do not match";
      signupError.classList.remove("hidden");
      return;
    }

    showFormLoading(signupForm, true);

    try {
      const user = await Auth.signup(username, email, password);
      updateAuthUI(user);
      closeModal();
    } catch (err) {
      signupError.textContent = err.message;
      signupError.classList.remove("hidden");
    } finally {
      showFormLoading(signupForm, false);
    }
  });

  // ── Auth: logout ────────────────────────────────────────
  logoutBtn.addEventListener("click", () => {
    Auth.logout();
    updateAuthUI(null);
    userDropdown.classList.add("hidden");
  });

  // ── Auth: update UI based on auth state ─────────────────
  function updateAuthUI(user) {
    if (user) {
      authButtons.classList.add("hidden");
      userMenu.classList.remove("hidden");
      const initial = (user.username || user.email || "U").charAt(0).toUpperCase();
      userAvatarLetter.textContent = initial;
      userName.textContent = user.username;
      userEmail.textContent = user.email;
    } else {
      authButtons.classList.remove("hidden");
      userMenu.classList.add("hidden");
      userDropdown.classList.add("hidden");
    }
  }

  // ── Auth: check session on load ─────────────────────────
  async function checkAuth() {
    if (Auth.isLoggedIn()) {
      const user = await Auth.fetchCurrentUser();
      updateAuthUI(user);
    }
  }

  // ── Search handlers ─────────────────────────────────────
  searchBtn.addEventListener("click", () => {
    const term = searchInput.value.trim();
    if (term) performSearch(term);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const term = searchInput.value.trim();
      if (term) performSearch(term);
    }
  });

  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    const term = searchInput.value.trim();
    if (term.length < 2) {
      searchResults.innerHTML = "";
      searchStatus.textContent = "";
      return;
    }
    searchDebounce = setTimeout(() => performSearch(term), 500);
  });

  // ── Search execution ────────────────────────────────────
  async function performSearch(term) {
    searchStatus.innerHTML =
      '<div class="status-loading"><div class="spinner"></div> Searching...</div>';
    searchResults.innerHTML = "";

    try {
      const { results, source } = await MusicAPI.search(term, 20);

      if (results.length === 0) {
        searchStatus.innerHTML = renderSourceBadge(source);
        searchResults.innerHTML =
          '<div class="no-results">No results found. Try a different search term.</div>';
        return;
      }

      searchStatus.innerHTML =
        renderSourceBadge(source) +
        `<span class="result-count">${results.length} result${results.length !== 1 ? "s" : ""}</span>`;

      searchResults.innerHTML = results.map(renderSearchCard).join("");
    } catch (err) {
      searchStatus.innerHTML = "";
      searchResults.innerHTML =
        '<div class="no-results">Something went wrong. Please try again.</div>';
      console.error("[App] Search error:", err);
    }
  }

  // ── Render: search card ─────────────────────────────────
  function renderSearchCard(item) {
    const hasArtwork = item.artwork && item.artwork.length > 0;
    const artworkStyle = hasArtwork
      ? `background-image: url('${item.artwork}'); background-size: cover; background-position: center;`
      : `background: linear-gradient(135deg, #e11d8e33, #8b5cf633);`;

    const priceHtml =
      item.price !== null && item.price > 0
        ? `<span class="card-price">$${item.price.toFixed(2)}</span>`
        : `<span class="card-price card-price-na">Price N/A</span>`;

    const sourceTag =
      item.source === "local"
        ? '<span class="source-tag source-local">Sample</span>'
        : item.source === "musicbrainz"
        ? '<span class="source-tag source-mb">MusicBrainz</span>'
        : '<span class="source-tag source-itunes">iTunes</span>';

    return `
      <div class="result-card" data-id="${item.id}">
        <div class="result-artwork" style="${artworkStyle}">
          ${sourceTag}
        </div>
        <div class="result-info">
          <h4 class="result-title">${escapeHtml(item.title)}</h4>
          <p class="result-artist">${escapeHtml(item.artist)}</p>
          <div class="result-meta">
            <span class="result-genre">${escapeHtml(item.genre)}</span>
            ${item.duration ? `<span class="result-duration">${item.duration}</span>` : ""}
          </div>
          <div class="result-bottom">
            <span class="result-format">${escapeHtml(item.format)}</span>
            ${priceHtml}
          </div>
        </div>
      </div>`;
  }

  // ── Render: source badge ────────────────────────────────
  function renderSourceBadge(source) {
    const labels = {
      itunes: "iTunes",
      musicbrainz: "MusicBrainz",
      local: "Local Data",
      none: "No Source",
    };
    const classes = {
      itunes: "source-itunes",
      musicbrainz: "source-mb",
      local: "source-local",
      none: "",
    };
    return `<span class="source-badge ${classes[source] || ""}">Source: ${labels[source] || source}</span>`;
  }

  // ── Marketplace: load popular releases ──────────────────
  async function loadMarketplace() {
    const queries = [
      "Dark Side of the Moon",
      "Rumours Fleetwood Mac",
      "Nevermind Nirvana",
      "Abbey Road Beatles",
      "Thriller Michael Jackson",
      "Back in Black AC DC",
      "The Wall Pink Floyd",
      "Led Zeppelin IV",
      "OK Computer Radiohead",
      "Born to Run Bruce Springsteen",
      "Purple Rain Prince",
      "Hotel California Eagles",
    ];

    // Shuffle and pick 10 queries to search in parallel
    const shuffled = queries.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 10);

    try {
      const searchResults = await Promise.allSettled(
        picked.map((q) => MusicAPI.searchAlbums(q, 3))
      );

      // Flatten all results, deduplicate by artist
      const seenArtists = new Set();
      const uniqueArtistAlbums = [];

      for (const r of searchResults) {
        if (r.status !== "fulfilled") continue;
        for (const item of r.value.results) {
          const artistKey = item.artist.toLowerCase().trim();
          if (!seenArtists.has(artistKey)) {
            seenArtists.add(artistKey);
            uniqueArtistAlbums.push(item);
          }
        }
      }

      if (uniqueArtistAlbums.length > 0) {
        renderMarketplace(uniqueArtistAlbums.slice(0, 12), "itunes");
        return;
      }
    } catch (err) {
      console.warn("[App] Marketplace API failed, using local data:", err);
    }

    const { results } = MusicAPI.getPopular();
    const seenLocal = new Set();
    const uniqueLocal = results.filter((item) => {
      const key = item.artist.toLowerCase().trim();
      if (seenLocal.has(key)) return false;
      seenLocal.add(key);
      return true;
    });
    renderMarketplace(uniqueLocal.slice(0, 12), "local");
  }

  function renderMarketplace(items, _source) {
    if (!items || items.length === 0) {
      marketGrid.innerHTML =
        '<div class="no-results">No releases available right now.</div>';
      return;
    }

    marketGrid.innerHTML = items
      .map((item) => {
        const hasArtwork = item.artwork && item.artwork.length > 0;
        const cardStyle = hasArtwork
          ? `background-image: url('${item.artwork}'); background-size: cover; background-position: center;`
          : `background: linear-gradient(135deg, #e11d8e44, #8b5cf644);`;

        const price =
          item.price !== null && item.price > 0
            ? `$${item.price.toFixed(2)}`
            : "N/A";

        const formatLabel =
          item.source === "local" ? item.format : item.format || "Audio";

        return `
        <div class="market-card">
          <div class="card-img" style="${cardStyle}">
            ${hasArtwork ? "" : `<div class="card-img-fallback">&#127925;</div>`}
          </div>
          <div class="card-body">
            <span class="card-format">${escapeHtml(formatLabel)}</span>
            <h4>${escapeHtml(item.title)}</h4>
            <p class="card-artist">${escapeHtml(item.artist)}</p>
            <div class="card-meta">
              <span class="card-condition">Various</span>
              <span class="card-price">${price}</span>
            </div>
          </div>
        </div>`;
      })
      .join("");
  }

  // ── Utility ─────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Hero Albums: perpetual pop / float / delete ─────────
  const HERO_ALBUM_POOL = [];
  const HERO_MAX_ON_SCREEN = 30;
  const HERO_SPAWN_INTERVAL = 1800;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function pickRandom(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  async function loadHeroAlbums() {
    const container = document.getElementById("heroAlbums");
    if (!container) return;

    const albumQueries = [
      "Dark Side of the Moon Pink Floyd",
      "Rumours Fleetwood Mac",
      "Nevermind Nirvana",
      "Abbey Road Beatles",
      "Thriller Michael Jackson",
      "Back in Black AC DC",
      "The Wall Pink Floyd",
      "Led Zeppelin IV Led Zeppelin",
      "OK Computer Radiohead",
      "Ziggy Stardust Bowie",
      "Songs in the Key of Life Stevie Wonder",
      "Born to Run Bruce Springsteen",
      "Rumours Fleetwood Mac",
      "Purple Rain Prince",
      "Hotel California Eagles",
      "Appetite for Destruction Guns Roses",
    ];

    try {
      const results = await Promise.allSettled(
        albumQueries.map((q) => MusicAPI.search(q, 1))
      );

      const artworkUrls = results
        .filter((r) => r.status === "fulfilled" && r.value.results.length > 0)
        .map((r) => r.value.results[0].artwork)
        .filter((url) => url && url.length > 0);

      HERO_ALBUM_POOL.push(...artworkUrls.slice(0, 16));
    } catch (err) {
      console.warn("[Hero] Failed to load album artwork:", err);
    }

    // If no API artwork, use gradient placeholders
    if (HERO_ALBUM_POOL.length === 0) {
      const gradients = [
        "linear-gradient(135deg, #e11d8e44, #8b5cf644)",
        "linear-gradient(135deg, #06b6d444, #3b82f644)",
        "linear-gradient(135deg, #f59e0b44, #ef444444)",
        "linear-gradient(135deg, #10b98144, #84cc1644)",
        "linear-gradient(135deg, #8b5cf644, #ec489944)",
        "linear-gradient(135deg, #f43f5e44, #f9731644)",
        "linear-gradient(135deg, #a855f744, #6366f144)",
        "linear-gradient(135deg, #14b8a644, #0ea5e944)",
      ];
      HERO_ALBUM_POOL.push(...gradients);
    }

    // Burst-spawn all 30 within the first 5 seconds
    const burstCount = Math.min(HERO_MAX_ON_SCREEN, HERO_ALBUM_POOL.length || 8);
    const burstInterval = 5000 / burstCount;
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => spawnHeroAlbum(container), i * burstInterval);
    }

    // Then keep spawning replacements
    setInterval(() => spawnHeroAlbum(container), HERO_SPAWN_INTERVAL);
  }

  function spawnHeroAlbum(container) {
    if (container.children.length >= HERO_MAX_ON_SCREEN) return;
    if (HERO_ALBUM_POOL.length === 0) return;

    const el = document.createElement("div");
    el.classList.add("hero-album");

    const size = rand(160, 300);
    const top = rand(2, 80);
    const left = rand(2, 85);
    const duration = rand(8, 16);
    const delay = rand(0, 0.5);
    const peakOpacity = rand(0.06, 0.17);
    const driftX = rand(-40, 40);
    const driftY = rand(-30, 30);
    const rot = rand(-8, 8);
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      top: ${top}%;
      left: ${left}%;
      --rot: ${rot}deg;
      --duration: ${duration}s;
      --delay: ${delay}s;
      --peak-opacity: ${peakOpacity};
      --drift-x: ${driftX}px;
      --drift-y: ${driftY}px;
    `;

    const src = pickRandom(HERO_ALBUM_POOL);
    if (src.startsWith("http")) {
      el.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
    } else {
      el.style.background = src;
    }

    container.appendChild(el);

    // Trigger animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.add("alive");
      });
    });

    // Remove after animation completes
    const totalTime = (duration + delay) * 1000 + 200;
    setTimeout(() => {
      el.remove();
    }, totalTime);
  }

  // ── Init ────────────────────────────────────────────────
  checkAuth();
  loadMarketplace();
  loadHeroAlbums();
});
