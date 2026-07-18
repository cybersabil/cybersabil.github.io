(() => {
  "use strict";

  const config = window.CYBERSABIL_ADMIN1_CONFIG || {};
  const editablePaths = new Set([
    "data/site-settings.json",
    "data/gateway.json",
    "data/gateway-appearance.json",
  ]);

  const state = {
    schema: null,
    files: new Map(),
    drafts: new Map(),
    session: sessionStorage.getItem("cybersabil_admin1_session") || "",
    user: null,
    activeCategory: null,
    mode: "all",
    query: "",
    saving: false,
  };

  const e = {
    nav: document.getElementById("category-nav"), grid: document.getElementById("category-grid"),
    metrics: document.getElementById("metrics-grid"), categoryTotal: document.getElementById("category-total"),
    home: document.getElementById("dashboard-home"), browser: document.getElementById("field-browser"),
    fieldGroups: document.getElementById("field-groups"), empty: document.getElementById("empty-state"),
    search: document.getElementById("search-input"), pageTitle: document.getElementById("page-title"),
    categoryEyebrow: document.getElementById("category-eyebrow"), categoryTitle: document.getElementById("category-title"),
    categoryDescription: document.getElementById("category-description"), loadStatus: document.getElementById("load-status"),
    backHome: document.getElementById("back-home"), themeToggle: document.getElementById("theme-toggle"),
    menu: document.getElementById("mobile-menu"), sidebar: document.getElementById("sidebar"),
    scrim: document.getElementById("scrim"), login: document.getElementById("login-button"),
    logout: document.getElementById("logout-button"), refreshSession: document.getElementById("refresh-session"),
    authTitle: document.getElementById("auth-title"), authDetail: document.getElementById("auth-detail"),
    connectionBadge: document.getElementById("connection-badge"), saveDock: document.getElementById("save-dock"),
    dirtyTitle: document.getElementById("dirty-title"), dirtyDetail: document.getElementById("dirty-detail"),
    discardDraft: document.getElementById("discard-draft"), reviewChanges: document.getElementById("review-changes"),
    reviewDialog: document.getElementById("review-dialog"), reviewBody: document.getElementById("review-body"),
    closeReview: document.getElementById("close-review"), cancelReview: document.getElementById("cancel-review"),
    confirmSave: document.getElementById("confirm-save"), toastStack: document.getElementById("toast-stack"),
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const safeText = (value) => value === null || value === undefined || value === "" ? "—" :
    typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
  const escapeHtml = (value) => safeText(value).replace(/[&<>"']/g, (char) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[char]));

  const toast = (message, type = "") => {
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    e.toastStack.appendChild(node);
    setTimeout(() => node.remove(), 5200);
  };

  const api = async (path, options = {}) => {
    if (!config.apiBase || config.apiBase.includes("__ADMIN1_API_BASE__")) {
      throw new Error("Admin1 API URL is not configured.");
    }
    const headers = new Headers(options.headers || {});
    if (state.session) headers.set("Authorization", `Bearer ${state.session}`);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(`${config.apiBase}${path}`, { ...options, headers, cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  };

  const captureAuthFragment = () => {
    const match = location.hash.match(/^#auth=([^&]+)/);
    if (!match) return;
    state.session = decodeURIComponent(match[1]);
    sessionStorage.setItem("cybersabil_admin1_session", state.session);
    history.replaceState(null, "", `${location.pathname}${location.search}#/`);
  };

  const login = () => {
    const returnTo = `${location.origin}${location.pathname}`;
    location.href = `${config.apiBase}/auth?return_to=${encodeURIComponent(returnTo)}`;
  };

  const logout = () => {
    sessionStorage.removeItem("cybersabil_admin1_session");
    state.session = ""; state.user = null; state.files.clear(); state.drafts.clear();
    updateAuthUI(); renderFieldBrowser(); toast("Signed out.");
  };

  const updateAuthUI = () => {
    const signedIn = Boolean(state.user);
    e.login.hidden = signedIn; e.logout.hidden = !signedIn;
    e.authTitle.textContent = signedIn ? `Signed in as ${state.user.login}` : "GitHub login required";
    e.authDetail.textContent = signedIn
      ? `${config.repository} · ${config.branch} · stale SHA protection active`
      : "Sign in karke latest GitHub values aur SHA load karein.";
    e.connectionBadge.textContent = signedIn ? "🟢 GitHub connected" : "🔒 Sign in required";
    e.saveDock.hidden = !(signedIn && state.activeCategory === config.editableCategory);
  };

  const refreshSession = async () => {
    if (!state.session) { updateAuthUI(); return; }
    try {
      const result = await api("/api/session");
      state.user = result.user;
      await loadEditableFiles();
      updateAuthUI();
      toast("Latest GitHub data loaded.", "success");
    } catch (error) {
      if (error.status === 401) logout();
      else toast(error.message, "error");
    }
  };

  const loadEditableFiles = async () => {
    const paths = [...editablePaths];
    const results = await Promise.all(paths.map(async (path) => {
      const result = await api(`/api/file?path=${encodeURIComponent(path)}`);
      return [path, result];
    }));
    results.forEach(([path, result]) => {
      state.files.set(path, { sha: result.sha, content: result.content });
      state.drafts.set(path, clone(result.content));
    });
    updateDirtyUI();
    if (state.activeCategory) renderFieldBrowser();
  };

  const getFieldValue = (field) => {
    const draft = state.drafts.get(field.jsonPath);
    if (draft && !field.listEditor) return draft[field.name];
    const file = state.files.get(field.jsonPath);
    if (file && !field.listEditor) return file.content[field.name];
    return undefined;
  };

  const isEditable = (field) =>
    Boolean(state.user) && field.category === config.editableCategory &&
    editablePaths.has(field.jsonPath) && !field.hidden && !field.readonly &&
    ["string","text","number","select"].includes(field.type);

  const selectOptions = (field) => {
    const values = field.options?.values || [];
    return values.map((option) => {
      const name = typeof option === "object" ? option.name : option;
      const label = typeof option === "object" ? option.label : option;
      return `<option value="${escapeHtml(name)}">${escapeHtml(label)}</option>`;
    }).join("");
  };

  const inputControl = (field, value) => {
    if (!isEditable(field)) return `
      <div class="field-value">
        <div class="value-label"><span>Current value</span><span>${escapeHtml(field.jsonPath)}</span></div>
        <div class="value-text">${escapeHtml(value)}</div>
        ${field.category !== config.editableCategory ? '<div class="lock-note">🔒 Category audit pending</div>' :
          !state.user ? '<div class="lock-note">🔒 Sign in to edit</div>' :
          '<div class="lock-note">🔒 Internal/read-only field</div>'}
      </div>`;

    const common = `data-field-id="${escapeHtml(field.id)}" data-path="${escapeHtml(field.jsonPath)}" data-name="${escapeHtml(field.name)}"`;
    let control = "";
    if (field.type === "select") {
      control = `<select ${common}>${selectOptions(field)}</select>`;
    } else if (field.type === "number") {
      control = `<input type="number" ${common}
        ${field.min !== null && field.min !== undefined ? `min="${field.min}"` : ""}
        ${field.max !== null && field.max !== undefined ? `max="${field.max}"` : ""}
        ${field.step !== null && field.step !== undefined ? `step="${field.step}"` : 'step="any"'}
        value="${escapeHtml(value)}">`;
    } else if (field.type === "text") {
      control = `<textarea ${common}>${escapeHtml(value)}</textarea>`;
    } else {
      control = `<input type="text" ${common} value="${escapeHtml(value)}">`;
    }
    return `<label class="editable-control"><span class="value-label"><span>Draft value</span><span>${escapeHtml(field.jsonPath)}</span></span>${control}</label>`;
  };

  const metric = (label, value, detail) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong><small>${detail}</small></article>`;
  const renderMetrics = () => {
    const m = state.schema.manifest;
    e.metrics.innerHTML = [
      metric("Total schema", m.fields, `${m.editors} JSON editors`),
      metric("Gateway mapped", 178, "175 editable · 3 protected"),
      metric("Read-only pending", m.fields - 178, "Category-by-category audits"),
      metric("Conflict protection", "SHA", "Stale save blocked"),
    ].join("");
  };

  const categoryCard = (category) => `
    <button class="category-card" type="button" data-category="${category.id}">
      <span class="category-icon">${category.emoji}</span><h3>${category.label}</h3><p>${category.description}</p>
      <div class="category-stats"><span>${category.fieldCount} fields</span><span>${category.subcategories.length} groups</span>
      <span>${category.id === config.editableCategory ? "Editable after login" : "Read-only"}</span></div>
    </button>`;

  const navButton = (category) => `
    <button class="nav-button" type="button" data-category="${category.id}">
      <span class="nav-emoji">${category.emoji}</span><span>${category.label}</span><small>${category.fieldCount}</small>
    </button>`;

  const renderCategories = () => {
    const categories = state.schema.categories;
    e.grid.innerHTML = categories.map(categoryCard).join("");
    e.nav.innerHTML = `<button class="nav-button is-active" type="button" data-home="true"><span class="nav-emoji">⌂</span><span>Dashboard Home</span><small>${state.schema.manifest.fields}</small></button>${categories.map(navButton).join("")}`;
    e.categoryTotal.textContent = `${categories.length} categories · ${state.schema.manifest.fields} fields`;
  };

  const closeMenu = () => { e.sidebar.classList.remove("is-open"); e.scrim.hidden = true; e.menu.setAttribute("aria-expanded","false"); };
  const setActiveNav = () => document.querySelectorAll(".nav-button").forEach((button) => {
    const active = state.activeCategory ? button.dataset.category === state.activeCategory : button.hasAttribute("data-home");
    button.classList.toggle("is-active", active);
  });

  const showHome = () => {
    state.activeCategory = null; e.home.hidden = false; e.browser.hidden = true;
    e.pageTitle.textContent = "Dashboard overview"; e.saveDock.hidden = true;
    setActiveNav(); history.replaceState(null, "", "#/"); closeMenu();
  };

  const matchesField = (field) => {
    if (state.mode !== "all" && field.mode !== state.mode) return false;
    if (!state.query) return true;
    return [field.label,field.name,field.description,field.jsonPath,field.editorLabel,field.subcategory,field.categoryLabel]
      .join(" ").toLowerCase().includes(state.query);
  };

  const originalValue = (field) => state.files.get(field.jsonPath)?.content?.[field.name];
  const draftValue = (field) => state.drafts.get(field.jsonPath)?.[field.name];
  const fieldDirty = (field) => JSON.stringify(originalValue(field)) !== JSON.stringify(draftValue(field));

  const fieldRow = (field) => {
    const value = getFieldValue(field);
    return `<article class="field-row ${field.mode === "internal" ? "is-internal" : ""} ${fieldDirty(field) ? "is-dirty" : ""} ${isEditable(field) ? "" : "is-locked"}">
      <div class="field-emoji">${field.emoji}</div>
      <div class="field-title"><strong>${escapeHtml(field.label)}</strong><code class="field-key">${escapeHtml(field.name)}</code>
        <div class="field-badges"><span class="field-badge ${field.mode}">${field.mode}</span><span class="field-badge">${field.type}</span>${fieldDirty(field) ? '<span class="field-badge">changed</span>' : ""}</div>
      </div>
      <div class="field-description">${escapeHtml(field.description)}</div>
      ${inputControl(field, value)}
    </article>`;
  };

  const groupBlock = (name, fields, open) => `<details class="field-group" ${open ? "open" : ""}><summary>
    <span class="group-icon">${fields[0]?.editorEmoji || "⚙️"}</span><span class="group-copy"><strong>${escapeHtml(name)}</strong><span>${escapeHtml([...new Set(fields.map((f) => f.editorLabel))].join(" · "))}</span></span>
    <span class="group-count">${fields.length} fields</span></summary><div class="field-list">${fields.map(fieldRow).join("")}</div></details>`;

  const renderFieldBrowser = () => {
    const category = state.schema.categories.find((item) => item.id === state.activeCategory);
    if (!category) return showHome();
    const fields = state.schema.fields.filter((field) => field.category === category.id && matchesField(field));
    e.categoryEyebrow.textContent = `${category.emoji} ${category.label.toUpperCase()}`;
    e.categoryTitle.textContent = `${category.fieldCount} mapped settings`;
    e.categoryDescription.textContent = category.description;
    e.pageTitle.textContent = category.label;
    const grouped = new Map();
    fields.forEach((field) => { if (!grouped.has(field.subcategory)) grouped.set(field.subcategory, []); grouped.get(field.subcategory).push(field); });
    e.fieldGroups.innerHTML = [...grouped.entries()].map(([name, groupFields], index) => groupBlock(name, groupFields, index < 2 || Boolean(state.query))).join("");
    e.empty.hidden = fields.length !== 0;
    e.loadStatus.textContent = `${fields.length} matching fields · ${category.fieldCount} total · ${category.id === config.editableCategory ? (state.user ? "write-enabled" : "sign in required") : "read-only until category audits pass"}`;
    e.home.hidden = true; e.browser.hidden = false; setActiveNav(); updateAuthUI(); updateDirtyUI(); bindDynamicInputs();
  };

  const openCategory = (id) => {
    state.activeCategory = id; history.replaceState(null, "", `#/category/${id}`); renderFieldBrowser(); closeMenu();
  };

  const bindDynamicInputs = () => {
    e.fieldGroups.querySelectorAll("[data-field-id]").forEach((input) => {
      const field = state.schema.fields.find((item) => item.id === input.dataset.fieldId);
      const value = getFieldValue(field);
      if (field.type === "select") input.value = value ?? "";
      input.addEventListener("input", () => {
        const draft = state.drafts.get(field.jsonPath);
        if (!draft) return;
        let next = input.value;
        if (field.type === "number") {
          next = input.value === "" ? null : Number(input.value);
          if (!Number.isFinite(next)) return;
        }
        draft[field.name] = next;
        input.closest(".field-row")?.classList.toggle("is-dirty", fieldDirty(field));
        updateDirtyUI();
      });
    });
  };

  const dirtyChanges = () => {
    const changes = [];
    state.schema.fields.filter((field) => editablePaths.has(field.jsonPath) && !field.listEditor).forEach((field) => {
      const before = originalValue(field), after = draftValue(field);
      if (JSON.stringify(before) !== JSON.stringify(after)) changes.push({ field, before, after });
    });
    return changes;
  };

  const updateDirtyUI = () => {
    const changes = dirtyChanges();
    e.dirtyTitle.textContent = changes.length ? `${changes.length} pending change${changes.length === 1 ? "" : "s"}` : "No pending changes";
    e.dirtyDetail.textContent = changes.length ? `${new Set(changes.map((item) => item.field.jsonPath)).size} GitHub file(s) affected` : "Latest GitHub SHA protected.";
    e.reviewChanges.disabled = changes.length === 0 || state.saving;
    e.discardDraft.disabled = changes.length === 0 || state.saving;
  };

  const discardDraft = () => {
    state.files.forEach((file, path) => state.drafts.set(path, clone(file.content)));
    renderFieldBrowser(); toast("Draft discarded.");
  };

  const openReview = () => {
    const changes = dirtyChanges();
    if (!changes.length) return;
    const byFile = new Map();
    changes.forEach((change) => { if (!byFile.has(change.field.jsonPath)) byFile.set(change.field.jsonPath, []); byFile.get(change.field.jsonPath).push(change); });
    e.reviewBody.innerHTML = [...byFile.entries()].map(([path, items]) => `<section class="diff-file"><h4>${escapeHtml(path)} · ${items.length} changes</h4>
      ${items.map((item) => `<div class="diff-row"><code>${escapeHtml(item.field.name)}</code><div class="diff-old">Before: ${escapeHtml(item.before)}</div><div class="diff-new">After: ${escapeHtml(item.after)}</div></div>`).join("")}</section>`).join("");
    e.reviewDialog.showModal();
  };

  const saveAll = async () => {
    if (state.saving) return;
    const changes = dirtyChanges();
    if (!changes.length) return;

    state.saving = true;
    updateDirtyUI();
    e.confirmSave.disabled = true;

    try {
      const paths = [...new Set(changes.map((item) => item.field.jsonPath))];
      const files = paths.map((path) => {
        const file = state.files.get(path);
        const draft = state.drafts.get(path);
        return {
          path,
          sha: file.sha,
          content: draft,
        };
      });

      const result = await api("/api/files", {
        method: "PUT",
        body: JSON.stringify({
          files,
          message: `Admin1: update ${paths.length} Gateway file${paths.length === 1 ? "" : "s"}`,
        }),
      });

      result.files.forEach((saved) => {
        const draft = state.drafts.get(saved.path);
        state.files.set(saved.path, {
          sha: saved.sha,
          content: clone(draft),
        });
      });

      e.reviewDialog.close();
      toast(`Atomic GitHub save complete: ${result.commit.slice(0, 7)}.`, "success");
      renderFieldBrowser();
    } catch (error) {
      if (error.status === 409) {
        toast("Save blocked: Pages CMS, Sveltia ya another editor ne file/branch change ki. Latest values reload karein.", "error");
      } else {
        toast(`Save failed: ${error.message}`, "error");
      }
    } finally {
      state.saving = false;
      e.confirmSave.disabled = false;
      updateDirtyUI();
    }
  };

  const loadStaticFilesForReadOnly = async () => {
    const paths = [...new Set(state.schema.fields.map((field) => field.jsonPath))];
    const results = await Promise.all(paths.map(async (path) => {
      try {
        const response = await fetch(`../${path}`, { cache: "no-store" });
        if (!response.ok) throw new Error();
        return [path, await response.json()];
      } catch { return [path, null]; }
    }));
    results.forEach(([path, content]) => {
      if (content && !state.files.has(path)) {
        state.files.set(path, { sha: "", content });
        state.drafts.set(path, clone(content));
      }
    });
  };

  const applyHash = () => {
    const match = location.hash.match(/^#\/category\/([a-z0-9-]+)$/);
    if (match && state.schema.categories.some((category) => category.id === match[1])) openCategory(match[1]);
    else showHome();
  };

  const bindEvents = () => {
    document.addEventListener("click", (event) => {
      const categoryButton = event.target.closest("[data-category]");
      if (categoryButton) openCategory(categoryButton.dataset.category);
      if (event.target.closest("[data-home]")) showHome();
    });
    e.login.addEventListener("click", login); e.logout.addEventListener("click", logout);
    e.refreshSession.addEventListener("click", refreshSession); e.backHome.addEventListener("click", showHome);
    e.discardDraft.addEventListener("click", discardDraft); e.reviewChanges.addEventListener("click", openReview);
    e.closeReview.addEventListener("click", () => e.reviewDialog.close());
    e.cancelReview.addEventListener("click", () => e.reviewDialog.close());
    e.confirmSave.addEventListener("click", saveAll);
    e.search.addEventListener("input", (event) => { state.query = event.target.value.trim().toLowerCase(); if (state.activeCategory) renderFieldBrowser(); });
    document.querySelector(".segmented").addEventListener("click", (event) => {
      const button = event.target.closest("[data-mode]"); if (!button) return;
      state.mode = button.dataset.mode; document.querySelectorAll("[data-mode]").forEach((item) => item.classList.toggle("is-active", item === button));
      if (state.activeCategory) renderFieldBrowser();
    });
    e.themeToggle.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next; e.themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
    });
    e.menu.addEventListener("click", () => {
      const open = !e.sidebar.classList.contains("is-open"); e.sidebar.classList.toggle("is-open", open); e.scrim.hidden = !open; e.menu.setAttribute("aria-expanded", String(open));
    });
    e.scrim.addEventListener("click", closeMenu); window.addEventListener("hashchange", applyHash);
  };

  const init = async () => {
    try {
      captureAuthFragment();
      const response = await fetch("./schema.generated.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Schema HTTP ${response.status}`);
      state.schema = await response.json();
      renderMetrics(); renderCategories(); bindEvents();
      await loadStaticFilesForReadOnly();
      if (state.session) await refreshSession(); else updateAuthUI();
      applyHash();
    } catch (error) {
      document.getElementById("main-content").innerHTML = `<section class="empty-state"><strong>Admin1 could not load</strong><span>${escapeHtml(error.message)}</span></section>`;
    }
  };

  init();
})();
