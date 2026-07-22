/**
 * VinylVault Browse Page
 * Dedicated search/browse with filters and sorting.
 */
(() => {
  "use strict";

  // ── DOM refs ─────────────────────────────────────────────
  const searchForm = document.getElementById("browseSearchForm");
  const searchInput = document.getElementById("browseSearchInput");
  const browseStatus = document.getElementById("browseStatus");
  const browseResults = document.getElementById("browseResults");
  const sortSelect = document.getElementById("sortSelect");
  const genreSelect = document.getElementById("genreSelect");
  const typeRadios = document.querySelectorAll('input[name="type"]');
  const sourceRadios = document.querySelectorAll('input[name="source"]');
  const priceRadios = document.querySelectorAll('input[name="price"]');

  // ── Auth DOM refs ────────────────────────────────────────
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

  let currentResults = [];
  let debounceTimer = null;

  // ── URL Params ───────────────────────────────────────────
  function readParams() {
    const p = new URLSearchParams(window.location.search);
    return {
      q: p.get("q") || "",
      type: p.get("type") || "all",
      sort: p.get("sort") || "relevance",
      genre: p.get("genre") || "all",
      source: p.get("source") || "all",
      price: p.get("price") || "all",
    };
  }

  function writeParams(params) {
    const p = new URLSearchParams();
    if (params.q) p.set("q", params.q);
    if (params.type !== "all") p.set("type", params.type);
    if (params.sort !== "relevance") p.set("sort", params.sort);
    if (params.genre !== "all") p.set("genre", params.genre);
    if (params.source !== "all") p.set("source", params.source);
    if (params.price !== "all") p.set("price", params.price);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  function getFilters() {
    const type = document.querySelector('input[name="type"]:checked')?.value || "all";
    const source = document.querySelector('input[name="source"]:checked')?.value || "all";
    const price = document.querySelector('input[name="price"]:checked')?.value || "all";
    return {
      q: searchInput.value.trim(),
      type,
      sort: sortSelect.value,
      genre: genreSelect.value,
      source,
      price,
    };
  }

  function applyFiltersToUI(params) {
    searchInput.value = params.q;
    sortSelect.value = params.sort;
    genreSelect.value = params.genre;
    typeRadios.forEach((r) => (r.checked = r.value === params.type));
    sourceRadios.forEach((r) => (r.checked = r.value === params.source));
    priceRadios.forEach((r) => (r.checked = r.value === params.price));
  }

  // ── Search ───────────────────────────────────────────────
  async function doSearch() {
    const filters = getFilters();
    writeParams(filters);

    if (!filters.q) {
      browseStatus.innerHTML = '<span class="browse-hint">Enter a search term to find songs, artists, and albums.</span>';
      browseResults.innerHTML = "";
      currentResults = [];
      return;
    }

    browseStatus.innerHTML = '<div class="status-loading"><div class="spinner"></div> Searching...</div>';
    browseResults.innerHTML = "";

    try {
      const { results, source } = await MusicAPI.search(filters.q, 200);

      // Fetch album results if type is album
      let allResults = [...results];
      if (filters.type === "album") {
        try {
          const { results: albumResults } = await MusicAPI.searchAlbums(filters.q, 200);
          // Merge, deduplicate by id
          const ids = new Set(allResults.map((r) => r.id));
          for (const a of albumResults) {
            if (!ids.has(a.id)) {
              allResults.push(a);
              ids.add(a.id);
            }
          }
        } catch (_) {}
      }

      // Apply type filter
      if (filters.type !== "all") {
        allResults = allResults.filter((r) => {
          if (filters.type === "album") {
            return r.format?.toLowerCase().includes("album") || r.format === "Album";
          }
          if (filters.type === "song") {
            return r.format?.toLowerCase().includes("song") || r.format === "Audio" || r.format === "audio" || r.format === "local";
          }
          if (filters.type === "musicArtist") {
            return r.format?.toLowerCase().includes("artist") || r.format === "artist";
          }
          return true;
        });
      }

      // Apply genre filter
      if (filters.genre !== "all") {
        allResults = allResults.filter((r) =>
          r.genre?.toLowerCase().includes(filters.genre.toLowerCase())
        );
      }

      // Apply source filter
      if (filters.source !== "all") {
        allResults = allResults.filter((r) => r.source === filters.source);
      }

      // Apply price filter
      if (filters.price !== "all") {
        allResults = allResults.filter((r) => {
          const p = r.price;
          switch (filters.price) {
            case "has-price": return p !== null && p > 0;
            case "under-10": return p !== null && p < 10;
            case "under-25": return p !== null && p < 25;
            case "under-50": return p !== null && p < 50;
            case "over-50": return p !== null && p >= 50;
            default: return true;
          }
        });
      }

      // Apply sort
      allResults = sortResults(allResults, filters.sort);

      currentResults = allResults;

      if (allResults.length === 0) {
        browseStatus.innerHTML = `<span class="browse-hint">No results found for "${escapeHtml(filters.q)}". Try a different search.</span>`;
        browseResults.innerHTML = "";
        return;
      }

      browseStatus.innerHTML =
        `<span class="browse-hint">${allResults.length} result${allResults.length !== 1 ? "s" : ""} for "${escapeHtml(filters.q)}"</span>`;
      browseResults.innerHTML = allResults.map(renderCard).join("");
    } catch (err) {
      console.error("[Browse] Search error:", err);
      browseStatus.innerHTML = "";
      browseResults.innerHTML = '<div class="no-results">Something went wrong. Please try again.</div>';
    }
  }

  // ── Sort ─────────────────────────────────────────────────
  function sortResults(items, sortKey) {
    const sorted = [...items];
    switch (sortKey) {
      case "name-asc":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case "name-desc":
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      case "price-asc":
        return sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      case "price-desc":
        return sorted.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
      case "date-desc":
        return sorted.sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""));
      case "date-asc":
        return sorted.sort((a, b) => (a.releaseDate || "").localeCompare(b.releaseDate || ""));
      default:
        return sorted;
    }
  }

  // ── Render ───────────────────────────────────────────────
  function renderCard(item) {
    const hasArtwork = item.artwork && item.artwork.length > 0;
    const artworkStyle = hasArtwork
      ? `background-image: url('${item.artwork}'); background-size: cover; background-position: center;`
      : `background: linear-gradient(135deg, #e11d8e33, #8b5cf633);`;

    const priceHtml =
      item.price !== null && item.price > 0
        ? `<span class="card-price">$${item.price.toFixed(2)}</span>`
        : `<span class="card-price card-price-na">N/A</span>`;

    const sourceClass =
      item.source === "musicbrainz" ? "source-mb"
      : item.source === "local" ? "source-local"
      : "source-itunes";

    const sourceLabel =
      item.source === "musicbrainz" ? "MusicBrainz"
      : item.source === "local" ? "Local"
      : "iTunes";

    return `
      <div class="browse-card" role="button" tabindex="0" onclick="window.location.href='${buildDetailUrl(item)}'" onkeydown="if(event.key==='Enter')this.click()">
        <div class="browse-card-art" style="${artworkStyle}">
          <span class="source-tag ${sourceClass}">${sourceLabel}</span>
        </div>
        <div class="browse-card-body">
          <h4 class="browse-card-title">${escapeHtml(item.title)}</h4>
          <p class="browse-card-artist">${escapeHtml(item.artist)}</p>
          <div class="browse-card-meta">
            ${item.genre ? `<span class="browse-card-genre">${escapeHtml(item.genre)}</span>` : ""}
            ${item.duration ? `<span class="browse-card-duration">${escapeHtml(item.duration)}</span>` : ""}
          </div>
          <div class="browse-card-footer">
            <span class="browse-card-format">${escapeHtml(item.format || "")}</span>
            ${priceHtml}
          </div>
        </div>
      </div>`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

  // ── Event listeners ──────────────────────────────────────
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (searchInput.value.trim()) doSearch();
  });

  sortSelect.addEventListener("change", doSearch);
  genreSelect.addEventListener("change", doSearch);
  typeRadios.forEach((r) => r.addEventListener("change", doSearch));
  sourceRadios.forEach((r) => r.addEventListener("change", doSearch));
  priceRadios.forEach((r) => r.addEventListener("change", doSearch));

  // ── Auth (simplified from app.js) ────────────────────────
  function updateAuthUI(user) {
    if (user) {
      authButtons.classList.add("hidden");
      userMenu.classList.remove("hidden");
      userAvatarLetter.textContent = (user.username || user.email || "U")[0].toUpperCase();
      userName.textContent = user.username || "";
      userEmail.textContent = user.email || "";
    } else {
      authButtons.classList.remove("hidden");
      userMenu.classList.add("hidden");
    }
  }

  loginBtn.addEventListener("click", () => {
    modalOverlay.classList.remove("hidden");
    loginModal.classList.remove("hidden");
    signupModal.classList.add("hidden");
    loginError.classList.add("hidden");
  });

  signupBtn.addEventListener("click", () => {
    modalOverlay.classList.remove("hidden");
    signupModal.classList.remove("hidden");
    loginModal.classList.add("hidden");
    signupError.classList.add("hidden");
  });

  loginClose.addEventListener("click", () => modalOverlay.classList.add("hidden"));
  signupClose.addEventListener("click", () => modalOverlay.classList.add("hidden"));
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.add("hidden");
  });

  switchToSignup.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    signupModal.classList.remove("hidden");
    signupError.classList.add("hidden");
  });

  switchToLogin.addEventListener("click", () => {
    signupModal.classList.add("hidden");
    loginModal.classList.remove("hidden");
    loginError.classList.add("hidden");
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("vv_token", data.token);
      localStorage.setItem("vv_user", JSON.stringify(data.user));
      modalOverlay.classList.add("hidden");
      updateAuthUI(data.user);
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove("hidden");
    }
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    signupError.classList.add("hidden");
    const username = document.getElementById("signupUsername").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirm").value;
    if (password !== confirm) {
      signupError.textContent = "Passwords do not match.";
      signupError.classList.remove("hidden");
      return;
    }
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      localStorage.setItem("vv_token", data.token);
      localStorage.setItem("vv_user", JSON.stringify(data.user));
      modalOverlay.classList.add("hidden");
      updateAuthUI(data.user);
    } catch (err) {
      signupError.textContent = err.message;
      signupError.classList.remove("hidden");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch (_) {}
    localStorage.removeItem("vv_token");
    localStorage.removeItem("vv_user");
    updateAuthUI(null);
    userDropdown.classList.add("hidden");
  });

  userAvatarBtn.addEventListener("click", () => {
    userDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!userAvatarBtn.contains(e.target) && !userDropdown.contains(e.target)) {
      userDropdown.classList.add("hidden");
    }
  });

  // ── Init ─────────────────────────────────────────────────
  // Check for saved auth
  try {
    const savedUser = JSON.parse(localStorage.getItem("vv_user"));
    if (savedUser) updateAuthUI(savedUser);
  } catch (_) {}

  // Mobile nav toggle
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));

  // Read URL params and populate UI
  const params = readParams();
  applyFiltersToUI(params);

  // Auto-search if query param exists
  if (params.q) {
    doSearch();
  }
})();
