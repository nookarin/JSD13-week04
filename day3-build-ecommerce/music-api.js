/**
 * VinylVault Music API Module
 *
 * Primary:   iTunes Search API (no auth, JSONP-free, CORS-friendly)
 * Fallback:  MusicBrainz API (no auth, rate-limited)
 * Last resort: Local hardcoded sample data
 */

const MusicAPI = (() => {
  const ITUNES_BASE = "https://itunes.apple.com/search";
  const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
  const REQUEST_TIMEOUT = 8000;

  // ── Local fallback data ──────────────────────────────────
  const LOCAL_DATA = [
    {
      id: "local-1",
      title: "Dark Side of the Moon",
      artist: "Pink Floyd",
      album: "The Dark Side of the Moon",
      genre: "Rock",
      releaseDate: "1973-03-01",
      format: "Vinyl, LP, Album",
      price: 42.99,
      artwork: "",
      duration: "42:49",
      previewUrl: "",
      source: "local",
    },
    {
      id: "local-2",
      title: "Rumours",
      artist: "Fleetwood Mac",
      album: "Rumours",
      genre: "Rock",
      releaseDate: "1977-02-04",
      format: "Vinyl, LP, Album",
      price: 68.5,
      artwork: "",
      duration: "39:43",
      previewUrl: "",
      source: "local",
    },
    {
      id: "local-3",
      title: "Nevermind",
      artist: "Nirvana",
      album: "Nevermind",
      genre: "Alternative Rock",
      releaseDate: "1991-09-24",
      format: "CD, Album",
      price: 18.0,
      artwork: "",
      duration: "49:10",
      previewUrl: "",
      source: "local",
    },
    {
      id: "local-4",
      title: "Discovery",
      artist: "Daft Punk",
      album: "Discovery",
      genre: "Electronic",
      releaseDate: "2001-03-12",
      format: "Vinyl, LP, Album",
      price: 35.0,
      artwork: "",
      duration: "61:24",
      previewUrl: "",
      source: "local",
    },
    {
      id: "local-5",
      title: "Kind of Blue",
      artist: "Miles Davis",
      album: "Kind of Blue",
      genre: "Jazz",
      releaseDate: "1959-08-17",
      format: "Vinyl, LP, Album, Mono",
      price: 55.0,
      artwork: "",
      duration: "45:44",
      previewUrl: "",
      source: "local",
    },
    {
      id: "local-6",
      title: "Abbey Road",
      artist: "The Beatles",
      album: "Abbey Road",
      genre: "Rock",
      releaseDate: "1969-09-26",
      format: "Vinyl, LP, Album",
      price: 48.0,
      artwork: "",
      duration: "47:23",
      previewUrl: "",
      source: "local",
    },
  ];

  // ── Helpers ──────────────────────────────────────────────

  function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { ...options, signal: controller.signal }).finally(() =>
      clearTimeout(id)
    );
  }

  function normalizeITunesResult(item) {
    return {
      id: `itunes-${item.trackId}`,
      title: item.trackName || item.collectionName || "",
      artist: item.artistName || "",
      album: item.collectionName || "",
      genre: item.primaryGenreName || "",
      releaseDate: item.releaseDate || "",
      format: item.kind || item.wrapperType || "audio",
      price: item.trackPrice ?? item.collectionPrice ?? null,
      artwork: (item.artworkUrl100 || "").replace("100x100", "600x600"),
      duration: item.trackTimeMillis
        ? formatMillis(item.trackTimeMillis)
        : "",
      previewUrl: item.previewUrl || "",
      source: "itunes",
    };
  }

  function normalizeMusicBrainzResult(recording) {
    const release =
      recording.releases && recording.releases.length > 0
        ? recording.releases[0]
        : {};
    return {
      id: `mb-${recording.id}`,
      title: recording.title || "",
      artist:
        recording["artist-credit"] &&
        recording["artist-credit"].length > 0
          ? recording["artist-credit"]
              .map((ac) => ac.name)
              .join(", ")
          : "",
      album: release.title || "",
      genre:
        recording.tags && recording.tags.length > 0
          ? recording.tags.map((t) => t.name).join(", ")
          : "",
      releaseDate: release.date || "",
      format:
        release.media && release.media.length > 0
          ? release.media[0].format || "Unknown"
          : "Unknown",
      price: null,
      artwork: "",
      duration: recording.length
        ? formatMillis(recording.length)
        : "",
      previewUrl: "",
      source: "musicbrainz",
    };
  }

  function formatMillis(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  // ── API: iTunes ──────────────────────────────────────────

  async function searchiTunes(term, limit = 20) {
    const params = new URLSearchParams({
      term,
      media: "music",
      entity: "song",
      limit: String(limit),
      country: "US",
    });
    const url = `${ITUNES_BASE}?${params}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
    const data = await res.json();
    if (!data.results || data.results.length === 0) return [];
    return data.results.map(normalizeITunesResult);
  }

  async function searchiTunesAlbums(term, limit = 20) {
    const params = new URLSearchParams({
      term,
      media: "music",
      entity: "album",
      limit: String(limit),
      country: "US",
    });
    const url = `${ITUNES_BASE}?${params}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
    const data = await res.json();
    if (!data.results || data.results.length === 0) return [];
    return data.results.map(normalizeITunesAlbumResult);
  }

  function normalizeITunesAlbumResult(item) {
    return {
      id: `itunes-album-${item.collectionId}`,
      title: item.collectionName || item.trackName || "",
      artist: item.artistName || "",
      album: item.collectionName || "",
      genre: item.primaryGenreName || "",
      releaseDate: item.releaseDate || "",
      format: "Album",
      price: item.collectionPrice ?? item.trackPrice ?? null,
      artwork: (item.artworkUrl100 || "").replace("100x100", "600x600"),
      duration: "",
      previewUrl: item.collectionViewUrl || "",
      source: "itunes",
    };
  }

  async function lookupITunes(id) {
    const params = new URLSearchParams({ id: String(id) });
    const url = `${ITUNES_BASE}?${params}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    return normalizeITunesResult(data.results[0]);
  }

  // ── API: MusicBrainz ─────────────────────────────────────

  async function searchMusicBrainz(term, limit = 20) {
    const params = new URLSearchParams({
      query: term,
      fmt: "json",
      limit: String(limit),
    });
    const url = `${MUSICBRAINZ_BASE}/recording?${params}`;
    const res = await fetchWithTimeout(url, {
      headers: { "User-Agent": "VinylVault/1.0 (contact@vinylvault.dev)" },
    });
    if (!res.ok) throw new Error(`MusicBrainz HTTP ${res.status}`);
    const data = await res.json();
    if (!data.recordings || data.recordings.length === 0) return [];
    return data.recordings.map(normalizeMusicBrainzResult);
  }

  async function lookupMusicBrainz(mbid) {
    const url = `${MUSICBRAINZ_BASE}/recording/${mbid}?fmt=json`;
    const res = await fetchWithTimeout(url, {
      headers: { "User-Agent": "VinylVault/1.0 (contact@vinylvault.dev)" },
    });
    if (!res.ok) throw new Error(`MusicBrainz HTTP ${res.status}`);
    const data = await res.json();
    return normalizeMusicBrainzResult(data);
  }

  // ── Local fallback search ────────────────────────────────

  function searchLocal(term) {
    const lower = term.toLowerCase();
    return LOCAL_DATA.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        item.artist.toLowerCase().includes(lower) ||
        item.album.toLowerCase().includes(lower) ||
        item.genre.toLowerCase().includes(lower)
    );
  }

  // ── Public: search with fallback chain ───────────────────

  /**
   * Search music with automatic fallback:
   *   1. iTunes Search API
   *   2. MusicBrainz API
   *   3. Local sample data
   *
   * @param {string} term - Search query
   * @param {number} limit - Max results (default 20)
   * @returns {Promise<{results: Array, source: string}>}
   */
  async function search(term, limit = 20) {
    if (!term || term.trim().length === 0) {
      return { results: [], source: "none" };
    }

    // Try iTunes first
    try {
      console.log("[MusicAPI] Trying iTunes Search API...");
      const results = await searchiTunes(term, limit);
      if (results.length > 0) {
        console.log(`[MusicAPI] iTunes returned ${results.length} results`);
        return { results, source: "itunes" };
      }
    } catch (err) {
      console.warn("[MusicAPI] iTunes failed:", err.message);
    }

    // Fallback to MusicBrainz
    try {
      console.log("[MusicAPI] Falling back to MusicBrainz...");
      const results = await searchMusicBrainz(term, limit);
      if (results.length > 0) {
        console.log(`[MusicAPI] MusicBrainz returned ${results.length} results`);
        return { results, source: "musicbrainz" };
      }
    } catch (err) {
      console.warn("[MusicAPI] MusicBrainz failed:", err.message);
    }

    // Last resort: local data
    console.log("[MusicAPI] Using local fallback data");
    const results = searchLocal(term);
    return { results, source: "local" };
  }

  // ── Public: lookup single item with fallback ─────────────

  /**
   * Look up a single item by ID with fallback chain.
   *
   * @param {string} id - Item ID (itunes-12345, mb-uuid, local-1)
   * @returns {Promise<{result: object|null, source: string}>}
   */
  async function lookup(id) {
    if (!id) return { result: null, source: "none" };

    if (id.startsWith("itunes-")) {
      try {
        const numId = id.replace("itunes-", "");
        const result = await lookupITunes(numId);
        return { result, source: "itunes" };
      } catch (err) {
        console.warn("[MusicAPI] iTunes lookup failed:", err.message);
      }
    }

    if (id.startsWith("mb-")) {
      try {
        const mbid = id.replace("mb-", "");
        const result = await lookupMusicBrainz(mbid);
        return { result, source: "musicbrainz" };
      } catch (err) {
        console.warn("[MusicAPI] MusicBrainz lookup failed:", err.message);
      }
    }

    if (id.startsWith("local-")) {
      const numId = id.replace("local-", "");
      const result = LOCAL_DATA.find((item) => item.id === id) || null;
      return { result, source: "local" };
    }

    return { result: null, source: "none" };
  }

  // ── Public: get curated/popular data ─────────────────────

  /**
   * Returns curated popular albums as a seed for the homepage.
   * Uses local data — no network call needed.
   */
  function getPopular() {
    return { results: [...LOCAL_DATA], source: "local" };
  }

  // ── Public: album-specific search ────────────────────────

  async function searchAlbums(term, limit = 20) {
    if (!term || term.trim().length === 0) {
      return { results: [], source: "none" };
    }

    // Try iTunes album search first
    try {
      console.log("[MusicAPI] Trying iTunes album search...");
      const results = await searchiTunesAlbums(term, limit);
      if (results.length > 0) {
        console.log(`[MusicAPI] iTunes albums returned ${results.length} results`);
        return { results, source: "itunes" };
      }
    } catch (err) {
      console.warn("[MusicAPI] iTunes album search failed:", err.message);
    }

    // Fallback to regular search and filter
    try {
      console.log("[MusicAPI] Falling back to regular search...");
      const { results } = await search(term, limit);
      const albumResults = results.filter(
        (r) => r.format === "album" || r.format === "Audio" || r.source === "local"
      );
      if (albumResults.length > 0) {
        return { results: albumResults, source: "itunes" };
      }
    } catch (err) {
      console.warn("[MusicAPI] Regular search failed:", err.message);
    }

    // Last resort: local data
    console.log("[MusicAPI] Using local fallback data");
    return getPopular();
  }

  // ── Public API surface ───────────────────────────────────

  return {
    search,
    searchAlbums,
    lookup,
    getPopular,
    // Expose individual sources for advanced use
    _itunes: { search: searchiTunes, searchAlbums: searchiTunesAlbums, lookup: lookupITunes },
    _musicbrainz: { search: searchMusicBrainz, lookup: lookupMusicBrainz },
    _local: { search: searchLocal, data: LOCAL_DATA },
  };
})();
