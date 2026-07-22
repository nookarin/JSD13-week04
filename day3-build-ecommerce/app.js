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
  const heroSearchForm = document.getElementById("heroSearchForm");
  const heroSuggestions = document.getElementById("heroSuggestions");
  const marketGrid = document.getElementById("marketGrid");
  const recommendedGrid = document.getElementById("recommendedGrid");
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

  // ── Mobile nav ──────────────────────────────────────────
  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navLinks.classList.remove("active"));
  });

  // ── Hero scroll collapse + sticky search ────────────────
  const hero = document.getElementById("home");
  const stickySearch = document.getElementById("stickySearch");
  const stickySearchForm = document.getElementById("stickySearchForm");
  const stickySearchInput = document.getElementById("stickySearchInput");
  const stickySuggestions = document.getElementById("stickySuggestions");
  const SCROLL_THRESHOLD = 120;
  let ticking = false;

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > SCROLL_THRESHOLD) {
          hero.classList.add("hero-collapsed");
          stickySearch.classList.add("visible");
        } else {
          hero.classList.remove("hero-collapsed");
          stickySearch.classList.remove("visible");
        }
        ticking = false;
      });
      ticking = true;
    }
  });

  // Sync hero search input <-> sticky search input
  searchInput.addEventListener("input", () => {
    stickySearchInput.value = searchInput.value;
    fetchSuggestions(searchInput.value, heroSuggestions);
  });
  stickySearchInput.addEventListener("input", () => {
    searchInput.value = stickySearchInput.value;
    fetchSuggestions(stickySearchInput.value, stickySuggestions);
  });

  // ── Search suggestions ──────────────────────────────────
  let suggestTimer = null;
  let activeSuggestionIndex = -1;
  let currentSuggestions = [];

  async function fetchSuggestions(term, container) {
    clearTimeout(suggestTimer);
    activeSuggestionIndex = -1;

    if (!term || term.trim().length < 2) {
      container.classList.remove("open");
      container.innerHTML = "";
      currentSuggestions = [];
      return;
    }

    suggestTimer = setTimeout(async () => {
      try {
        const { results } = await MusicAPI.search(term.trim(), 8);
        if (results.length === 0) {
          container.classList.remove("open");
          container.innerHTML = "";
          currentSuggestions = [];
          return;
        }
        currentSuggestions = results;
        renderSuggestions(results, container);
      } catch (_) {
        container.classList.remove("open");
      }
    }, 300);
  }

  function renderSuggestions(items, container) {
    container.innerHTML = items
      .map((item, i) => {
        const hasArt = item.artwork && item.artwork.length > 0;
        const artHtml = hasArt
          ? `<img src="${item.artwork}" alt="">`
          : "";
        const type = item.format?.toLowerCase().includes("album")
          ? "Album"
          : item.format?.toLowerCase().includes("artist")
          ? "Artist"
          : "Song";
        return `
          <div class="suggestion-item" data-index="${i}" data-title="${escapeAttr(item.title)}">
            <div class="suggestion-art">${artHtml}</div>
            <div class="suggestion-info">
              <div class="suggestion-title">${escapeHtml(item.title)}</div>
              <div class="suggestion-artist">${escapeHtml(item.artist)}</div>
            </div>
            <span class="suggestion-type">${type}</span>
          </div>`;
      })
      .join("");
    container.classList.add("open");

    container.querySelectorAll(".suggestion-item").forEach((el) => {
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const title = el.dataset.title;
        redirectToBrowse(title);
      });
    });
  }

  function handleSuggestionKeys(input, container) {
    const items = container.querySelectorAll(".suggestion-item");
    if (!items.length) return false;

    if (activeSuggestionIndex >= 0 && activeSuggestionIndex < items.length) {
      items[activeSuggestionIndex].classList.remove("active");
    }

    if (input.key === "ArrowDown") {
      input.preventDefault();
      activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, items.length - 1);
      items[activeSuggestionIndex].classList.add("active");
      return true;
    }
    if (input.key === "ArrowUp") {
      input.preventDefault();
      activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
      items[activeSuggestionIndex].classList.add("active");
      return true;
    }
    if (input.key === "Enter" && activeSuggestionIndex >= 0) {
      input.preventDefault();
      const title = items[activeSuggestionIndex].dataset.title;
      redirectToBrowse(title);
      return true;
    }
    return false;
  }

  searchInput.addEventListener("keydown", (e) => {
    if (handleSuggestionKeys(e, heroSuggestions)) return;
  });

  stickySearchInput.addEventListener("keydown", (e) => {
    if (handleSuggestionKeys(e, stickySuggestions)) return;
  });

  // Close suggestions on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-input-wrap")) {
      heroSuggestions.classList.remove("open");
      stickySuggestions.classList.remove("open");
    }
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

  // ── Search: redirect to browse page ────────────────────
  function redirectToBrowse(term) {
    window.location.href = `browse.html?q=${encodeURIComponent(term)}`;
  }

  heroSearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const term = searchInput.value.trim();
    if (term) redirectToBrowse(term);
  });

  stickySearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const term = stickySearchInput.value.trim();
    if (term) redirectToBrowse(term);
  });

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

  // ── Recommended: load curated picks ───────────────────
  async function loadRecommended() {
    const queries = [
      "Adele 25",
      "Daft Punk Random Access Memories",
      "Radiohead In Rainboards",
      "Kendrick Lamar DAMN",
      "Billie Eilish Happier Than Ever",
      "Arctic Monkeys AM",
      "Tame Impala Currents",
      "Frank Ocean Blonde",
      "The Weeknd After Hours",
      "SZA SOS",
      "Tyler the Creator Call Me",
      "Dua Lipa Future Nostalgia",
    ];

    const shuffled = queries.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 10);

    try {
      const searchResults = await Promise.allSettled(
        picked.map((q) => MusicAPI.searchAlbums(q, 3))
      );

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
        renderRecommended(uniqueArtistAlbums.slice(0, 12), "itunes");
        return;
      }
    } catch (err) {
      console.warn("[App] Recommended API failed, using local data:", err);
    }

    const { results } = MusicAPI.getPopular();
    const seenLocal = new Set();
    const uniqueLocal = results.filter((item) => {
      const key = item.artist.toLowerCase().trim();
      if (seenLocal.has(key)) return false;
      seenLocal.add(key);
      return true;
    });
    renderRecommended(uniqueLocal.slice(0, 12), "local");
  }

  function renderMarketplace(items, _source) {
    renderCards(items, marketGrid, "No releases available right now.");
  }

  function renderRecommended(items, _source) {
    renderCards(items, recommendedGrid, "No recommendations available right now.");
  }

  function renderCards(items, container, emptyMsg) {
    if (!items || items.length === 0) {
      container.innerHTML = `<div class="no-results">${emptyMsg}</div>`;
      return;
    }

    container.innerHTML = items
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

        const detailUrl = buildDetailUrl(item);
        return `
        <div class="market-card" role="button" tabindex="0" onclick="window.location.href='${detailUrl}'" onkeydown="if(event.key==='Enter')this.click()">
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

  function buildDetailUrl(item) {
    const p = new URLSearchParams();
    if (item.title)  p.set("title", item.title);
    if (item.artist) p.set("artist", item.artist);
    if (item.album)  p.set("album", item.album);
    if (item.genre)  p.set("genre", item.genre);
    if (item.artwork) p.set("artwork", item.artwork);
    if (item.price != null) p.set("price", item.price);
    if (item.format) p.set("format", item.format);
    if (item.duration) p.set("duration", item.duration);
    if (item.source) p.set("source", item.source);
    if (item.previewUrl) p.set("previewUrl", item.previewUrl);
    return "detail.html?" + p.toString();
  }

  function escapeAttr(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ── Hero Slideshow ─────────────────────────────────────

  async function loadHeroAlbums() {
    const container = document.getElementById("heroSlideshow");
    if (!container) return;

    const initialQueries = [
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
      "Purple Rain Prince",
      "Hotel California Eagles",
      "Appetite for Destruction Guns Roses",
      "Kind of Blue Miles Davis",
    ];

    const moreQuerySets = [
      ["In Rainbows Radiohead", "Blonde Frank Ocean", "To Pimp a Kendrick Lamar", "DAMN Kendrick Lamar", "Igor Tyler the Creator", "In the Aeroplane Over the Sea Neutral Milk Hotel", "Funeral Arcade Fire", "Lemonade Beyonce"],
      ["Random Access Memories Daft Punk", "Discovery Daft Punk", "Homework Daft Punk", "Currents Tame Impala", "The Slow Rush Tame Impala", "AM Arctic Monkeys", "Tranquility Base Hotel Arctic Monkeys", "Whatever People Say I Am Arctic Monkeys"],
      ["The Miseducation Lauryn Hill", "Channel Orange Frank Ocean", "Ctrl SZA", "SOS SZA", "Blonde Frank Ocean", "Take Care Drake", "Nothing Was the Same Drake", "Take Off Your Pants Blink-182"],
      ["A Night at the Opera Queen", "The Stone Roses The Stone Roses", "Definitely Maybe Oasis", "(Whats the Story) Morning Glory Oasis", "Parallel Lines Blondie", "Remain in Light Talking Heads", "Power Corruption and Lies New Order", "Disintegration Cure"],
      ["Illmatic Nas", "Ready to Die Notorious BIG", "The Blueprint Jay Z", "My Beautiful Dark Twisted Fantasy Kanye West", "Section.80 Kendrick Lamar", "good kid m.A.A.d city Kendrick Lamar", "Madvillainy Madvillain", "Enter the Wu-Tang Wu-Tang Clan"],
      ["Blue Train John Coltrane", "A Love Supreme John Coltrane", "Head Hunters Herbie Hancock", "Time Out Dave Brubeck", "Waltz for Debby Bill Evans", "Clifford Brown Max Roach", "Saxophone Colossus Sonny Rollins", "The Black Saint and the Sinner Lady Charles Mingus"],
    ];

    const heroSlides = [];
    const seenUrls = new Set();

    function addSlide(src) {
      if (seenUrls.has(src)) return;
      seenUrls.add(src);
      const slide = document.createElement("div");
      slide.classList.add("hero-slide");
      if (src.startsWith("http")) {
        slide.style.backgroundImage = `url('${src}')`;
      } else {
        slide.style.background = src;
      }
      container.appendChild(slide);
      heroSlides.push(slide);
    }

    // Fetch artwork from a query set
    async function fetchArtwork(queries) {
      try {
        const results = await Promise.allSettled(
          queries.map((q) => MusicAPI.search(q, 1))
        );
        results
          .filter((r) => r.status === "fulfilled" && r.value.results.length > 0)
          .map((r) => r.value.results[0].artwork)
          .filter((url) => url && url.length > 0)
          .forEach((url) => addSlide(url));
      } catch (err) {
        console.warn("[Hero] Failed to fetch artwork:", err);
      }
    }

    // Initial load
    await fetchArtwork(initialQueries);

    if (heroSlides.length === 0) {
      const gradients = [
        "linear-gradient(135deg, #1a1a2e, #16213e)",
        "linear-gradient(135deg, #0f3460, #533483)",
        "linear-gradient(135deg, #1a1a2e, #e94560)",
        "linear-gradient(135deg, #2d132c, #801336)",
        "linear-gradient(135deg, #1b1b2f, #162447)",
        "linear-gradient(135deg, #1f1f38, #4834d4)",
      ];
      gradients.forEach((g) => addSlide(g));
    }

    if (heroSlides.length === 0) return;

    // Show first slide
    heroSlides[0].classList.add("active");
    let current = 0;

    // Cycle slides
    setInterval(() => {
      heroSlides[current].classList.remove("active");
      current = (current + 1) % heroSlides.length;
      const slide = heroSlides[current];
      slide.style.animation = "none";
      slide.offsetHeight;
      slide.style.animation = "";
      slide.classList.add("active");
    }, 5000);

    // Keep fetching more artwork in the background
    let fetchIndex = 0;
    async function fetchMore() {
      if (fetchIndex >= moreQuerySets.length) {
        fetchIndex = 0; // loop back to reuse query sets
      }
      await fetchArtwork(moreQuerySets[fetchIndex]);
      fetchIndex++;
      setTimeout(fetchMore, 30000);
    }
    setTimeout(fetchMore, 15000);
  }

  // ── Genre browser ──────────────────────────────────────
  const genreGrid = document.getElementById("genreGrid");
  const genreStatus = document.getElementById("genreStatus");
  const genreBtns = document.querySelectorAll(".genre-btn");
  const genreSentinel = document.getElementById("genreSentinel");
  const genreBrowseMore = document.getElementById("genreBrowseMore");
  const genreBrowseMoreBtn = document.getElementById("genreBrowseMoreBtn");

  const GENRE_QUERIES = {
    all: { artists: ["Taylor Swift", "The Weeknd", "Drake", "Kendrick Lamar", "Billie Eilish", "Arctic Monkeys", "Metallica", "Miles Davis", "Frank Ocean", "Hans Zimmer", "Bad Bunny", "BTS"], search: "top hits" },
    rock: { artists: ["Led Zeppelin", "Pink Floyd", "AC DC", "Queen", "The Rolling Stones", "Guns N Roses", "Nirvana", "The Who", "Aerosmith", "Foo Fighters", "Deep Purple", "Cream"], search: "rock hits" },
    pop: { artists: ["Taylor Swift", "Adele", "Ed Sheeran", "Billie Eilish", "Dua Lipa", "Ariana Grande", "The Weeknd", "Bruno Mars", "Olivia Rodrigo", "Harry Styles", "Doja Cat", "Post Malone"], search: "pop hits" },
    electronic: { artists: ["Daft Punk", "Deadmau5", "Aphex Twin", "The Chemical Brothers", "Kraftwerk", "Boards of Canada", "Disclosure", "Skrillex", "Calvin Harris", "Flume", "ODESZA", "Kygo"], search: "electronic dance" },
    "hip-hop": { artists: ["Kendrick Lamar", "Kanye West", "J Cole", "Drake", "Travis Scott", "Tyler the Creator", "ASAP Rocky", "Chance the Rapper", "Lil Wayne", "Nas", "Metro Boomin", "Future"], search: "hip hop" },
    jazz: { artists: ["Miles Davis", "John Coltrane", "Thelonious Monk", "Bill Evans", "Charles Mingus", "Dave Brubeck", "Herbie Hancock", "Chet Baker", "Oscar Peterson", "Duke Ellington", "Ella Fitzgerald", "Louis Armstrong"], search: "jazz classics" },
    "r&b": { artists: ["Frank Ocean", "SZA", "Daniel Caesar", "Summer Walker", "The Weeknd", "Solange", "Erykah Badu", "D'Angelo", "Anderson Paak", "Brent Faiyaz", "Jhené Aiko", "H.E.R."], search: "r&b" },
    metal: { artists: ["Metallica", "Iron Maiden", "Black Sabbath", "Slayer", "Megadeth", "Pantera", "Tool", "Rammstein", "Judas Priest", "Slipknot", "System of a Down", "Mastodon"], search: "metal" },
    classical: { artists: ["Ludovico Einaudi", "Hans Zimmer", "Max Richter", "Yiruma", "Philip Glass", "Vivaldi", "Debussy", "Chopin", "Beethoven", "Mozart", "Erik Satie", "Yo-Yo Ma"], search: "classical" },
    alternative: { artists: ["Radiohead", "Arctic Monkeys", "Tame Impala", "The Strokes", "Interpol", "Muse", "Coldplay", "Gorillaz", "Weezer", "Red Hot Chili Peppers", "Blur", "The Killers"], search: "alternative" },
    country: { artists: ["Johnny Cash", "Dolly Parton", "Willie Nelson", "Luke Combs", "Morgan Wallen", "Chris Stapleton", "Kacey Musgraves", "Sturgill Simpson", "Tyler Childers", "Zach Bryan", "Cody Jinks", "Turnpike Troubadours"], search: "country" },
    folk: { artists: ["Bob Dylan", "Joni Mitchell", "Neil Young", "Nick Drake", "Sufjan Stevens", "Bon Iver", "Fleet Foxes", "Iron & Wine", "The Decemberists", "Phoebe Bridgers", "Adrianne Lenker", "First Aid Kit"], search: "folk" },
    blues: { artists: ["B.B. King", "Muddy Waters", "John Lee Hooker", "Stevie Ray Vaughan", "Eric Clapton", "Robert Johnson", "Howlin' Wolf", "Buddy Guy", "Taj Mahal", "Joe Bonamassa", "Keb' Mo'", "Gary Clark Jr."], search: "blues" },
    reggae: { artists: ["Bob Marley", "Peter Tosh", "Jimmy Cliff", "Toots and the Maytals", "Steel Pulse", "Black Uhuru", "Gregory Isaacs", "Burning Spear", "Sean Paul", "Damian Marley", "Chronixx", "Koffee"], search: "reggae" },
    punk: { artists: ["The Ramones", "Sex Pistols", "The Clash", "Green Day", "Blink-182", "NOFX", "Dead Kennedys", "The Misfits", "Bad Religion", "Pennywise", "Rancid", "The Offspring"], search: "punk rock" },
    indie: { artists: ["The National", "Arcade Fire", "Sufjan Stevens", "Bon Iver", "Phoebe Bridgers", "Japanese Breakfast", "Mitski", "Snail Mail", "Alex G", "Big Thief", "Alvvays", "Beach House"], search: "indie" },
    soul: { artists: ["Aretha Franklin", "Marvin Gaye", "Stevie Wonder", "Otis Redding", "Sam Cooke", "Al Green", "Etta James", "Bill Withers", "Curtis Mayfield", "Donny Hathaway", "Leon Bridges", "Brittany Howard"], search: "soul" },
    latin: { artists: ["Bad Bunny", "J Balvin", "Rosalía", "Daddy Yankee", "Shakira", "Luis Fonsi", "Ozuna", "Karol G", "Rauw Alejandro", "Sebastian Yatra", "Nicky Jam", "Maluma"], search: "latin" },
    "k-pop": { artists: ["BTS", "BLACKPINK", "Stray Kids", "TWICE", "aespa", "NewJeans", "SEVENTEEN", "ITZY", "ATEEZ", "EXO", "Red Velvet", "NCT"], search: "k-pop" },
  };

  const GENRE_PAGE_SIZE = 24;
  const GENRE_MAX_ALBUMS = 24;
  let genreAllAlbums = [];
  let genreShown = 0;
  let genreCurrent = "all";
  let genreLoading = false;

  async function loadGenre(genre) {
    genreCurrent = genre;
    genreAllAlbums = [];
    genreShown = 0;
    genreLoading = false;
    genreGrid.innerHTML = "";
    genreStatus.innerHTML = '<div class="status-loading"><div class="spinner"></div></div>';
    genreBrowseMore.style.display = "none";

    const genreData = GENRE_QUERIES[genre] || GENRE_QUERIES.all;
    const artists = [...genreData.artists].sort(() => Math.random() - 0.5);
    const pickedArtists = artists.slice(0, 12);

    try {
      const searches = [
        ...pickedArtists.map((q) => MusicAPI.searchAlbums(q, 5)),
        MusicAPI.searchAlbums(genreData.search, 20),
      ];
      const searchResults = await Promise.allSettled(searches);

      const seenArtists = new Set();
      for (const r of searchResults) {
        if (r.status !== "fulfilled") continue;
        for (const item of r.value.results) {
          const artistKey = item.artist.toLowerCase().trim();
          if (!seenArtists.has(artistKey)) {
            seenArtists.add(artistKey);
            genreAllAlbums.push(item);
          }
        }
      }
    } catch (err) {
      console.warn("[App] Genre search failed:", err);
    }

    if (genreAllAlbums.length === 0) {
      genreStatus.innerHTML = "";
      genreGrid.innerHTML = '<div class="no-results">Could not load albums for this genre.</div>';
      return;
    }

    const cap = Math.min(genreAllAlbums.length, GENRE_MAX_ALBUMS);
    genreAllAlbums = genreAllAlbums.slice(0, cap);
    genreStatus.innerHTML = `<span>${cap} top ${genre.replace(/-/g, " ")} albums</span>`;

    showGenrePage();
  }

  function showGenrePage() {
    const end = Math.min(genreShown + GENRE_PAGE_SIZE, genreAllAlbums.length);
    const slice = genreAllAlbums.slice(genreShown, end);
    const html = slice.map((item) => renderCardHTML(item)).join("");
    genreGrid.insertAdjacentHTML("beforeend", html);
    genreShown = end;

    if (genreShown >= genreAllAlbums.length) {
      genreBrowseMore.style.display = "block";
    } else {
      genreBrowseMore.style.display = "none";
    }
  }

  // IntersectionObserver for infinite scroll
  const genreObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !genreLoading && genreShown < genreAllAlbums.length) {
          genreLoading = true;
          showGenrePage();
          genreLoading = false;
        }
      }
    },
    { rootMargin: "200px" }
  );
  genreObserver.observe(genreSentinel);

  // Browse More button -> go to browse page with genre query
  genreBrowseMoreBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = `browse.html?q=${encodeURIComponent(genreCurrent)}&genre=${genreCurrent}`;
  });

  genreBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      genreBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      loadGenre(btn.dataset.genre);
    });
  });

  // Shared card HTML generator (used by genre browser)
  function renderCardHTML(item) {
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
    const detailUrl = buildDetailUrl(item);
    return `
      <div class="market-card" role="button" tabindex="0" onclick="window.location.href='${detailUrl}'" onkeydown="if(event.key==='Enter')this.click()">
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
  }

  // ── Init ────────────────────────────────────────────────
  checkAuth();
  loadMarketplace();
  loadRecommended();
  loadGenre("all");
  loadHeroAlbums();
});
