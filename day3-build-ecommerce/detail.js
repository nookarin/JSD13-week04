/**
 * VinylVault Detail Page
 * Shows item info with links to YouTube, Spotify, iTunes, Tidal, etc.
 */
(() => {
  "use strict";

  const container = document.getElementById("detailContainer");

  function readParams() {
    const p = new URLSearchParams(window.location.search);
    return {
      title: p.get("title") || "",
      artist: p.get("artist") || "",
      album: p.get("album") || "",
      genre: p.get("genre") || "",
      artwork: p.get("artwork") || "",
      price: p.get("price") || "",
      format: p.get("format") || "",
      duration: p.get("duration") || "",
      source: p.get("source") || "",
      previewUrl: p.get("previewUrl") || "",
    };
  }

  function esc(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function query(term) {
    return encodeURIComponent(term);
  }

  function buildLinks(title, artist) {
    const q = `${artist} ${title}`;
    return [
      {
        name: "YouTube",
        url: `https://www.youtube.com/results?search_query=${query(q)}`,
        color: "#ff0000",
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>`,
      },
      {
        name: "Spotify",
        url: `https://open.spotify.com/search/${query(q)}`,
        color: "#1db954",
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.3-.6.4-1 .2-2.7-1.6-6-2-10-1.1-.4.1-.8-.2-.9-.6-.1-.4.2-.8.6-.9 4.3-1 8.1-.6 11.2 1.2.4.2.5.7.3 1.2zm1.5-3.3c-.3.4-.8.5-1.2.3-3-1.9-7.7-2.4-11.3-1.3-.5.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 4.2-1.3 9.4-.7 12.9 1.5.4.2.5.8.3 1.2zm.1-3.4C15.7 8.3 9.4 8.1 5.8 9.2c-.6.2-1.2-.2-1.3-.7-.2-.6.2-1.2.7-1.3 4.2-1.3 11.2-1.1 15.7 1.6.5.3.7 1 .4 1.5-.2.5-.9.7-1.4.4z"/></svg>`,
      },
      {
        name: "Apple Music",
        url: `https://music.apple.com/us/search?term=${query(q)}`,
        color: "#fc3c44",
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M23.997 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0 0 19.2.177a10.193 10.193 0 0 0-1.84-.152C16.477.005 15.858 0 15.01 0H8.99C8.14 0 7.52.005 6.64.025a10.19 10.19 0 0 0-1.84.153A5.02 5.02 0 0 0 2.423.89C1.305 1.624.56 2.623.243 3.934a9.23 9.23 0 0 0-.24 2.19C.003 6.99 0 7.81 0 8.66v6.68c0 .85.003 1.67.003 2.19a9.23 9.23 0 0 0 .24 2.19c.317 1.31 1.062 2.31 2.18 3.043a5.022 5.022 0 0 0 1.836.714c.596.086 1.2.133 1.84.153.88.02 1.5.025 2.35.025h6.02c.85 0 1.47-.005 2.35-.025a10.19 10.19 0 0 0 1.84-.153 5.02 5.02 0 0 0 1.836-.714c1.117-.733 1.862-1.733 2.18-3.043a9.23 9.23 0 0 0 .24-2.19c.002-.52.003-1.34.003-2.19V8.66c0-.85-.002-1.67-.003-2.19zM17.99 15.26c0 .73-.008 1.01-.02 1.32-.09 2.16-1.04 3.6-3.08 4.06-.65.148-1.32.2-2.88.21H12c-1.57-.01-2.23-.062-2.88-.21-2.04-.46-2.99-1.9-3.08-4.06-.012-.31-.02-.59-.02-1.32V9.43c0-.73.008-1.01.02-1.32.09-2.16 1.04-3.6 3.08-4.06.65-.148 1.32-.2 2.88-.21h.02c1.57.01 2.23.062 2.88.21 2.04.46 2.99 1.9 3.08 4.06.012.31.02.59.02 1.32v5.83zm-3.17-8.06c-1.5-.88-3.05-1.37-4.67-1.53-.44-.043-.87-.058-1.15-.058v6.5c.28 0 .71.015 1.15.058 1.62.16 3.17.65 4.67 1.53.7.5 1.08 1.1 1.08 1.73 0 .63-.38 1.23-1.08 1.73-1.5.88-3.05 1.37-4.67 1.53-.44.043-.87.058-1.15.058V16.4c.28 0 .71-.015 1.15-.058 1.62-.16 3.17-.65 4.67-1.53.7-.5 1.08-1.1 1.08-1.73 0-.63-.38-1.23-1.08-1.73z"/></svg>`,
      },
      {
        name: "Tidal",
        url: `https://tidal.com/search?q=${query(q)}`,
        color: "#000000",
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12.012 3.992L8.008 7.996 12.012 12l4.004-4.004L12.012 3.992zM4.004 3.992L0 7.996l4.004 4.004L8.008 7.996 4.004 3.992zM12.012 12.004L8.008 16.008l4.004 4.004 4.004-4.004-4.004-4.004zM20.02 3.992L16.016 7.996l4.004 4.004 4.004-4.004-4.004-4.004z"/></svg>`,
      },
      {
        name: "Deezer",
        url: `https://www.deezer.com/search/${query(q)}`,
        color: "#a238ff",
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><rect x="0" y="18" width="4" height="4"/><rect x="5" y="14" width="4" height="8"/><rect x="10" y="10" width="4" height="12"/><rect x="15" y="6" width="4" height="16"/><rect x="20" y="2" width="4" height="20"/></svg>`,
      },
      {
        name: "SoundCloud",
        url: `https://soundcloud.com/search?q=${query(q)}`,
        color: "#ff5500",
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.057-.05-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.09.094s.089-.037.099-.094l.21-1.308-.21-1.334c-.01-.057-.05-.094-.09-.094m1.83-1.229c-.065 0-.105.049-.116.104l-.22 2.534.22 2.455c.011.055.051.104.116.104.064 0 .104-.049.115-.104l.253-2.455-.253-2.534c-.011-.055-.051-.104-.115-.104m.945-.089c-.075 0-.12.058-.12.115l-.205 2.623.205 2.545c0 .065.045.115.12.115.074 0 .12-.05.12-.115l.231-2.545-.23-2.623c-.001-.065-.046-.115-.12-.115m.958-.235c-.085 0-.135.065-.135.13l-.195 2.858.195 2.77c.001.07.05.13.135.13.084 0 .134-.06.135-.13l.218-2.77-.219-2.858c-.001-.07-.05-.13-.135-.13m.965-.18c-.095 0-.15.07-.15.145l-.18 3.038.18 2.93c.001.08.055.145.15.145.094 0 .15-.065.15-.145l.203-2.93-.204-3.038c0-.075-.056-.145-.15-.145m1.005-.175c-.105 0-.165.08-.165.16l-.165 3.213.165 3.09c.001.09.06.16.165.16.105 0 .165-.07.165-.16l.187-3.09-.188-3.213c0-.08-.06-.16-.165-.16m1.014-.18c-.115 0-.18.09-.18.175l-.15 3.393.15 3.245c.001.09.065.175.18.175.114 0 .18-.085.18-.175l.169-3.245-.169-3.393c0-.085-.066-.175-.18-.175m1.03-.12c-.125 0-.195.095-.195.19l-.14 3.513.14 3.34c.001.1.07.19.195.19.124 0 .195-.09.195-.19l.155-3.34-.155-3.513c0-.095-.07-.19-.195-.19m1.045-.08c-.135 0-.21.105-.21.205l-.125 3.593.125 3.42c.001.1.075.205.21.205.134 0 .21-.105.21-.205l.14-3.42-.14-3.593c0-.1-.076-.205-.21-.205m1.065-.04c-.15 0-.225.115-.225.22l-.11 3.633.11 3.49c.001.11.075.22.225.22.149 0 .225-.11.225-.22l.123-3.49-.123-3.633c0-.105-.076-.22-.225-.22m1.075.04c-.16 0-.24.125-.24.235l-.1 3.593.1 3.54c.001.12.08.235.24.235.159 0 .24-.115.24-.235l.11-3.54-.11-3.593c0-.11-.081-.235-.24-.235m2.16-2.39c-.17 0-.335.03-.49.085-.15.055-.28.13-.395.225-.115.095-.215.21-.295.345-.08.13-.14.28-.18.445-.04.165-.055.34-.055.52l.005 2.22-3.665-.005-.005-3.54c0-.28-.03-.55-.09-.81a2.1 2.1 0 0 0-.27-.63c-.12-.16-.27-.3-.44-.42-.17-.12-.37-.22-.59-.3-.22-.08-.47-.14-.73-.17-.26-.03-.54-.04-.83-.02l-.36.025c.06-.645.285-1.235.67-1.755.39-.51.89-.92 1.5-1.22.61-.3 1.3-.48 2.06-.53.76-.05 1.53.02 2.27.21.74.19 1.42.49 2 89.31.58.4 1.06.88 1.42 1.42.36.54.6 1.13.72 1.76.12.63.11 1.28-.01 1.92"/></svg>`,
      },
      {
        name: "Bandcamp",
        url: `https://bandcamp.com/search?q=${query(q)}&item_type=a`,
        color: "#629aa9",
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M0 18.75l7.437-13.5H24l-7.438 13.5z"/></svg>`,
      },
      {
        name: "Amazon Music",
        url: `https://music.amazon.com/search?keywords=${query(q)}`,
        color: "#25d1da",
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M.045 18.02c.071-.116.185-.124.31-.024 4.463 3.637 9.293 5.46 14.476 5.46 3.616 0 7.103-.89 10.447-2.67.156-.082.274-.156.224-.372-.16-.69-.623-.566-.963-.473-3.792 1.036-7.672 1.557-11.664 1.557-5.255 0-10.18-1.057-14.768-3.171-.192-.088-.287-.151-.062-.35zM1.68 16.38c.09-.128.235-.135.378-.038 3.87 2.534 8.244 3.82 13.13 3.82 3.198 0 6.342-.61 9.407-1.818.182-.072.315-.123.253-.371-.192-.777-.727-.577-1.066-.474-3.526 1.068-7.172 1.605-10.95 1.605-5.01 0-9.622-1.103-13.877-3.29-.177-.091-.27-.16-.275-.434zm-.57-1.73c.113-.139.282-.14.434-.043 4.4 2.176 9.328 3.27 14.755 3.27 3.43 0 6.73-.533 9.883-1.59.204-.069.355-.123.3-.424-.155-.945-.773-.654-1.148-.522-3.52 1.128-7.19 1.696-11.015 1.696-5.45 0-10.45-1.174-14.973-3.49-.184-.093-.29-.18-.236-.387z"/></svg>`,
      },
    ];
  }

  function render(params) {
    const hasArtwork = params.artwork && params.artwork.length > 0;
    const artworkStyle = hasArtwork
      ? `background-image: url('${params.artwork}'); background-size: cover; background-position: center;`
      : `background: linear-gradient(135deg, #e11d8e44, #8b5cf644);`;

    const priceHtml =
      params.price && parseFloat(params.price) > 0
        ? `<span class="detail-price">$${parseFloat(params.price).toFixed(2)}</span>`
        : "";

    const links = buildLinks(params.title, params.artist);
    const linksHtml = links
      .map(
        (l) => `
      <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="service-link" style="--link-color: ${l.color}">
        <span class="service-icon">${l.icon}</span>
        <span class="service-name">${l.name}</span>
      </a>`
      )
      .join("");

    const previewHtml = params.previewUrl
      ? `<a href="${params.previewUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary detail-preview-btn">Listen Preview</a>`
      : "";

    const token = localStorage.getItem("vv_token");
    const commentFormHtml = token
      ? `<form class="comment-form" id="commentForm">
           <textarea id="commentInput" class="comment-textarea" placeholder="Leave a comment..." rows="3" maxlength="1000"></textarea>
           <div class="comment-form-footer">
             <span class="comment-char-count" id="commentCharCount">0 / 1000</span>
             <button type="submit" class="btn btn-primary comment-submit-btn" id="commentSubmitBtn">Post Comment</button>
           </div>
         </form>`
      : `<p class="comment-login-hint"><a href="index.html" class="comment-login-link">Sign in</a> to leave a comment.</p>`;

    container.innerHTML = `
      <a href="javascript:history.back()" class="detail-back">&larr; Back</a>
      <div class="detail-card">
        <div class="detail-artwork" style="${artworkStyle}"></div>
        <div class="detail-info">
          <h1 class="detail-title">${esc(params.title)}</h1>
          <p class="detail-artist">${esc(params.artist)}</p>
          <div class="detail-meta">
            ${params.genre ? `<span class="detail-genre">${esc(params.genre)}</span>` : ""}
            ${params.duration ? `<span class="detail-duration">${esc(params.duration)}</span>` : ""}
            ${params.format ? `<span class="detail-format">${esc(params.format)}</span>` : ""}
            ${priceHtml}
          </div>
          ${previewHtml}
          <hr class="detail-divider">
          <div class="detail-links">
            <h3>Listen on</h3>
            <div class="service-grid">${linksHtml}</div>
          </div>
        </div>
      </div>

      <section class="comment-section">
        <h3 class="comment-section-title">Comments <span class="comment-count" id="commentCount"></span></h3>
        ${commentFormHtml}
        <div class="comment-list" id="commentList">
          <div class="comment-loading">Loading comments...</div>
        </div>
      </section>
    `;

    initCommentSection(params);
  }

  // ── Comments ──────────────────────────────────────────
  function initCommentSection(params) {
    const form = document.getElementById("commentForm");
    const input = document.getElementById("commentInput");
    const charCount = document.getElementById("commentCharCount");
    const submitBtn = document.getElementById("commentSubmitBtn");

    if (input && charCount) {
      input.addEventListener("input", () => {
        charCount.textContent = `${input.value.length} / 1000`;
      });
    }

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        const token = localStorage.getItem("vv_token");
        if (!token) return;

        submitBtn.disabled = true;
        submitBtn.textContent = "Posting...";

        try {
          const res = await fetch(`${API_BASE}/api/comments`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: params.title,
              artist: params.artist,
              text,
            }),
          });
          const data = await parseResponse(res);
          if (!res.ok) throw new Error(data.error || "Failed to post comment");

          input.value = "";
          charCount.textContent = "0 / 1000";
          await loadComments(params);
        } catch (err) {
          alert(err.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = "Post Comment";
        }
      });
    }

    loadComments(params);
  }

  async function loadComments(params) {
    const list = document.getElementById("commentList");
    const count = document.getElementById("commentCount");
    if (!list) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/comments?title=${encodeURIComponent(params.title)}&artist=${encodeURIComponent(params.artist)}`
      );
      const data = await parseResponse(res);
      const comments = data.comments || [];

      if (count) {
        count.textContent = comments.length > 0 ? `(${comments.length})` : "";
      }

      if (comments.length === 0) {
        list.innerHTML = `<p class="comment-empty">No comments yet. Be the first!</p>`;
        return;
      }

      list.innerHTML = comments
        .map((c) => {
          const date = new Date(c.createdAt);
          const timeAgo = formatTimeAgo(date);
          return `
          <div class="comment-item">
            <div class="comment-header">
              <span class="comment-avatar">${esc(c.username.charAt(0).toUpperCase())}</span>
              <span class="comment-username">${esc(c.username)}</span>
              <span class="comment-time" title="${date.toLocaleString()}">${timeAgo}</span>
            </div>
            <p class="comment-text">${esc(c.text)}</p>
          </div>`;
        })
        .join("");
    } catch {
      list.innerHTML = `<p class="comment-empty">Could not load comments.</p>`;
    }
  }

  function formatTimeAgo(date) {
    const now = Date.now();
    const diff = Math.floor((now - date.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  async function parseResponse(res) {
    const text = await res.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return {}; }
  }

  // ── Init ─────────────────────────────────────────────────
  const params = readParams();
  if (!params.title) {
    container.innerHTML = `
      <div class="detail-empty">
        <p>No item specified.</p>
        <a href="browse.html" class="btn btn-primary">Browse Music</a>
      </div>`;
    return;
  }

  document.title = `${params.title} — ${params.artist || "VinylVault"}`;
  render(params);
})();
