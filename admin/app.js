(() => {
  "use strict";

  // ADMIN1_V2_AUTH_COMPONENT_ISOLATION_V3
  // ADMIN1_V2_AUTH_UX_STABILITY_V5
  // ADMIN1_V2_AUTH_UX_STABILITY_V6_DEEP_AUDITED
  // ADMIN1_V2_AUTH_UX_STABILITY_V7_ONE_CLICK
  // ADMIN1_V2_RESPONSIVE_EDITOR_V8
  // ADMIN1_V8_BASIC_READABILITY_R4
  // ADMIN1_V8_FULLSCREEN_EDITOR_R6
  // ADMIN1_V8_FINAL_UI_CLEANUP_R8
  // ADMIN1_V8_PRO_SAVE_REVIEW_R9
  // ADMIN1_V8_CATEGORY_VERTICAL_STABILITY_R12

  // ADMIN1_V2_LOGIN_CARD_STABLE_V1

  const config = window.CYBERSABIL_ADMIN1_CONFIG || {};
  const sessionTokenKey =
    config.sessionTokenKey || "cybersabil_admin_r13_session_token";
  const clientBindingKey =
    config.clientBindingKey || "cybersabil_admin_r13_client_binding";
  const csrfTokenKey =
    config.csrfTokenKey || "cybersabil_admin_r13_csrf_token";

  const readSessionValue = (key) => {
    try {
      return sessionStorage.getItem(key) || "";
    } catch {
      return "";
    }
  };

  const writeSessionValue = (key, value) => {
    try {
      if (value) sessionStorage.setItem(key, value);
      else sessionStorage.removeItem(key);
    } catch {
      // Session storage failure falls back to a new login.
    }
  };

  const clearSessionCredentials = () => {
    writeSessionValue(sessionTokenKey, "");
    writeSessionValue(clientBindingKey, "");
    writeSessionValue(csrfTokenKey, "");
  };

  const randomBrowserToken = (bytes = 32) => {
    const values = crypto.getRandomValues(new Uint8Array(bytes));
    let binary = "";
    values.forEach((value) => { binary += String.fromCharCode(value); });
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  };

  const model = window.CyberSabilDataModel;
  const serverAuth =
    document.documentElement.dataset.serverAuth ||
    "pending";
  const preboot =
    window.__CYBERSABIL_PREBOOT__ || {};

  if (!model) {
    throw new Error("CyberSabil data model could not load.");
  }

  const editableCategories = new Set(
    config.editableCategories ||
    [config.editableCategory].filter(Boolean),
  );

  const categoryUi = {
    home: {
      accent: "#55d8ff",
      accent2: "#a88cff",
      subtitle: "Choose a category to manage the live main branch safely.",
    },
    "site-gateway": {
      accent: "#22c7b8",
      accent2: "#38bdf8",
      subtitle: "Gateway state, mode switch, cards, appearance and responsive behaviour.",
    },
    website: {
      accent: "#4f8cff",
      accent2: "#22d3ee",
      subtitle: "Website brand, sections, tools, downloads, projects and support content.",
    },
    portfolio: {
      accent: "#a66cff",
      accent2: "#f472b6",
      subtitle: "Portfolio profile, skills, projects, timeline, services and contact content.",
    },
    seo: {
      accent: "#f2b84b",
      accent2: "#fb7185",
      subtitle: "Search metadata and social sharing information.",
    },
    navigation: {
      accent: "#ff7b68",
      accent2: "#f59e0b",
      subtitle: "Desktop, mobile and mode-switch navigation design controls.",
    },
    system: {
      accent: "#45d6a4",
      accent2: "#22c55e",
      subtitle: "Protected read-only diagnostics and visual baseline information.",
    },
  };

  const groupPalettes = {
    "site-gateway": [
      "#22c7b8", "#31b7e8", "#4f8cff", "#7c79ff",
      "#a66cff", "#d66bd3", "#f06f9c", "#f38b62",
    ],
    website: [
      "#4f8cff", "#3da9f5", "#22b8cf", "#22c7a9",
      "#5cc56f", "#9bc64b", "#d0b84b", "#ee9360",
    ],
    portfolio: [
      "#a66cff", "#c067e8", "#dc68c7", "#f06fa2",
      "#f38582", "#ef9e5d", "#d0b84b", "#85c65a",
    ],
    seo: ["#f2b84b", "#f59e0b", "#fb7185"],
    navigation: [
      "#ff7b68", "#f58b4b", "#e6a83f", "#b7bd42",
      "#71c55d", "#39c59b", "#2fb9c7", "#4f8cff",
    ],
    system: ["#45d6a4", "#22c55e", "#38bdf8"],
  };

  const slugify = (value) =>
    String(value || "section")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";

  const currentCategoryUi = (id) =>
    categoryUi[id] || categoryUi.home;

  const groupAccent = (categoryId, index) => {
    const palette =
      groupPalettes[categoryId] ||
      [currentCategoryUi(categoryId).accent];

    return palette[index % palette.length];
  };

  const applyCategoryTheme = (categoryId = "home") => {
    const ui = currentCategoryUi(categoryId);
    const isHome = categoryId === "home";

    document.body.dataset.view =
      isHome ? "home" : "category";
    document.body.dataset.categoryTheme = categoryId;
    document.body.style.setProperty(
      "--category-accent",
      ui.accent,
    );
    document.body.style.setProperty(
      "--category-accent-2",
      ui.accent2,
    );

    if (e?.pageSubtitle) {
      e.pageSubtitle.textContent = ui.subtitle;
    }
  };

  const objectPaths = new Set([
    "data/site-settings.json",
    "data/gateway.json",
    "data/site.json",
    "data/sections.json",
    "data/design.json",
    "data/portfolio-settings.json",
    "data/profile.json",
    "data/contact.json",
    "data/seo.json",
    "data/gateway-appearance.json",
    "data/navigation-style.json"
  ]);

  const listPaths = new Set([
    "data/tools.json",
    "data/downloads.json",
    "data/projects.json",
    "data/skills.json",
    "data/docs.json",
    "data/faq.json",
    "data/portfolio-skills.json",
    "data/portfolio-projects.json",
    "data/portfolio-timeline.json",
    "data/services.json"
  ]);

  const editablePaths = new Set([
    ...objectPaths,
    ...listPaths,
  ]);

  // ADMIN1_V8_REFRESH_CONTINUITY_R2
  // The readable hint mirrors the HttpOnly session lifetime. It is not used
  // for authorization; /api/bootstrap remains the authority before editing.
  const hasSessionHint = () =>
    Boolean(
      readSessionValue(sessionTokenKey) &&
      readSessionValue(clientBindingKey),
    );

  const state = {
    schema: null,
    files: new Map(),
    drafts: new Map(),
    csrfToken: "",
    user: null,
    activeCategory: null,
    mode: "all",
    query: "",
    saving: false,
    checkingSession:
      serverAuth === "authenticated" ||
      (
        serverAuth === "pending" &&
        hasSessionHint()
      ),
    dataReady: false,
    authJustCaptured: false,
    cacheRestored: false,
    bootCompleted: false,
    notifications: [],
    workspaceFullscreen: false,
    sectionsPinned: true,
    sectionsPanelOpen: false,
    topbarRevealed: false,
    sectionsLauncherEdge: "left",
    sectionsLauncherRatio: 0.5,
  };

  /*
   * V8 refresh continuity can restore an older cached shell before this
   * script runs. Normalize that shell in-place so the approved compact
   * topbar appears without invalidating the authenticated snapshot.
   */
  const normalizeCompactTopbar = () => {
    const shell = document.getElementById("app-shell");
    const workspace = shell?.querySelector(".workspace");
    const topbar = shell?.querySelector(".topbar");
    const copy = topbar?.querySelector(".topbar-copy");
    const actions = topbar?.querySelector(".topbar-actions");
    const authPanel = shell?.querySelector(".auth-panel");
    const dashboardHome = shell?.querySelector("#dashboard-home");

    if (!workspace || !topbar || !copy || !actions) {
      return;
    }

    // ADMIN1_V8_CLEAN_WORKSPACE_R7
    // The verbose environment strip is diagnostic metadata, not navigation.
    // Remove it from both the current document and restored R6 shell snapshots.
    shell.querySelector(".phase-chip")?.remove();

    topbar.dataset.layout = "compact-utility";
    copy.querySelector(".eyebrow")?.remove();
    copy.querySelector("#page-subtitle")?.remove();

    const pageTitle = copy.querySelector("#page-title");
    if (pageTitle?.textContent.trim() === "Dashboard overview") {
      pageTitle.textContent = "Dashboard";
    }

    const brandTitle = shell.querySelector(".brand-block h1");
    if (brandTitle?.textContent.trim() === "Admin1") {
      brandTitle.textContent = "Admin";
    }

    let searchToggle =
      topbar.querySelector("#topbar-search-toggle");
    if (!searchToggle) {
      searchToggle = document.createElement("button");
      searchToggle.className =
        "icon-button topbar-search-toggle";
      searchToggle.id = "topbar-search-toggle";
      searchToggle.type = "button";
      searchToggle.textContent = "⌕";
      searchToggle.setAttribute(
        "aria-controls",
        "topbar-controls",
      );
      searchToggle.setAttribute(
        "aria-expanded",
        "false",
      );
      searchToggle.setAttribute(
        "aria-label",
        "Open search and filters",
      );
      copy.after(searchToggle);
    }

    const controls =
      shell.querySelector(".control-bar");
    if (controls) {
      controls.id = "topbar-controls";
      controls.classList.add("topbar-controls");
      controls.setAttribute(
        "aria-label",
        "Search and filter settings",
      );
      topbar.insertBefore(controls, actions);

      let resultCount =
        controls.querySelector("#search-result-count");
      if (!resultCount) {
        resultCount = document.createElement("span");
        resultCount.id = "search-result-count";
        resultCount.className = "search-result-count";
        resultCount.hidden = true;
        resultCount.setAttribute("aria-live", "polite");
        controls
          .querySelector(".search-box")
          ?.after(resultCount);
      }
    }

    const connectionBadge =
      shell.querySelector("#connection-badge");
    const refresh =
      shell.querySelector("#refresh-session");
    const theme =
      shell.querySelector("#theme-toggle");
    const logout =
      shell.querySelector("#logout-button");

    let stagingBadge =
      topbar.querySelector("#staging-badge");
    if (!stagingBadge) {
      stagingBadge = document.createElement("span");
      stagingBadge.id = "staging-badge";
      stagingBadge.className =
        "staging-badge icon-tooltip";
      stagingBadge.tabIndex = 0;
      stagingBadge.setAttribute(
        "aria-label",
        "Staging workspace — feature branch, write enabled",
      );
      stagingBadge.setAttribute(
        "data-tooltip",
        "Staging workspace · feature branch · write enabled",
      );
      stagingBadge.innerHTML =
        '<span class="status-dot" aria-hidden="true"></span><span>Staging</span>';
    }
    actions.prepend(stagingBadge);

    if (connectionBadge) {
      actions.appendChild(connectionBadge);
    }

    let notificationToggle =
      shell.querySelector("#notification-toggle");
    if (!notificationToggle) {
      notificationToggle = document.createElement("button");
      notificationToggle.className =
        "icon-button notification-toggle";
      notificationToggle.id = "notification-toggle";
      notificationToggle.type = "button";
      notificationToggle.textContent = "🔔";
      notificationToggle.setAttribute(
        "aria-controls",
        "notification-panel",
      );
      notificationToggle.setAttribute(
        "aria-expanded",
        "false",
      );
      notificationToggle.setAttribute(
        "aria-label",
        "Open notifications",
      );
    }
    actions.appendChild(notificationToggle);

    if (refresh) {
      refresh.classList.add(
        "auth-refresh-button",
        "topbar-action-button",
      );
      actions.appendChild(refresh);
    }

    if (theme) {
      actions.appendChild(theme);
    }

    if (logout) {
      logout.classList.add("topbar-action-button");
      actions.appendChild(logout);
    }

    let utilityToggle =
      topbar.querySelector("#utility-menu-toggle");
    if (!utilityToggle) {
      utilityToggle = document.createElement("button");
      utilityToggle.className =
        "icon-button utility-menu-toggle";
      utilityToggle.id = "utility-menu-toggle";
      utilityToggle.type = "button";
      utilityToggle.textContent = "•••";
      utilityToggle.setAttribute(
        "aria-controls",
        "topbar-actions",
      );
      utilityToggle.setAttribute(
        "aria-expanded",
        "false",
      );
      utilityToggle.setAttribute(
        "aria-label",
        "Open utility controls",
      );
      actions.after(utilityToggle);
    }

    actions.id = "topbar-actions";

    let notificationPanel =
      workspace.querySelector("#notification-panel");
    if (!notificationPanel) {
      notificationPanel = document.createElement("aside");
      notificationPanel.className = "notification-panel";
      notificationPanel.id = "notification-panel";
      notificationPanel.hidden = true;
      notificationPanel.setAttribute(
        "aria-label",
        "Notifications",
      );
      notificationPanel.innerHTML = `
        <div class="notification-panel-head">
          <strong>Notifications</strong>
          <button class="icon-button notification-close" id="notification-close" type="button" aria-label="Close notifications">×</button>
        </div>
        <div class="notification-list" id="notification-list">
          <p class="notification-empty">No new notifications.</p>
        </div>`;
      topbar.after(notificationPanel);
    }

    const dashboardHeading =
      dashboardHome?.querySelector(":scope > .section-heading");
    if (dashboardHeading) {
      const categoryTotal =
        dashboardHeading.querySelector("#category-total");
      categoryTotal?.remove();
      dashboardHeading.remove();
    }
    dashboardHome?.querySelector("#category-total")?.remove();

    if (
      dashboardHome &&
      !dashboardHome.querySelector("#dashboard-empty")
    ) {
      const dashboardEmpty = document.createElement("div");
      dashboardEmpty.id = "dashboard-empty";
      dashboardEmpty.className =
        "empty-state dashboard-empty";
      dashboardEmpty.hidden = true;
      dashboardEmpty.innerHTML =
        "<strong>No matching work areas</strong><span>Search ya level filter change karke dekhein.</span>";
      dashboardHome.appendChild(dashboardEmpty);
    }

    if (authPanel) {
      const login = authPanel.querySelector("#login-button");
      const saveActions =
        authPanel.querySelector(".save-actions");
      if (login && saveActions) {
        saveActions.appendChild(login);
      }
    }
  };

  /*
   * R6 is intentionally an additive workspace layer. Older R5 shell
   * snapshots can be restored before this JavaScript loads, so create the
   * new controls in-place when they are absent instead of invalidating the
   * authenticated first-paint cache.
   */
  const normalizeFullscreenWorkspace = () => {
    const shell = document.getElementById("app-shell");
    const workspace = shell?.querySelector(".workspace");
    const topbar = workspace?.querySelector(".topbar");
    const sidebarNote = shell?.querySelector(".sidebar-note");
    const workbench = shell?.querySelector(".editor-workbench");
    const rail = workbench?.querySelector(".subcategory-rail");
    const railHead = rail?.querySelector(".subcategory-rail-head");
    const canvas = workbench?.querySelector(".editor-canvas");
    const loadStatus = canvas?.querySelector("#load-status");

    sidebarNote?.remove();

    if (!workspace || !topbar || !workbench || !rail || !railHead || !canvas || !loadStatus) {
      return;
    }

    // Remove the old routine branch diagnostic from restored R7 snapshots.
    if (/write-enabled\s+on\s+audited\s+feature\s+branch/i.test(loadStatus.textContent || "")) {
      loadStatus.textContent = "";
      loadStatus.dataset.fullscreenState = "hidden";
    }

    if (!workspace.querySelector("#fullscreen-top-reveal")) {
      const topReveal = document.createElement("div");
      topReveal.id = "fullscreen-top-reveal";
      topReveal.className = "fullscreen-top-reveal";
      topReveal.setAttribute("aria-hidden", "true");
      workspace.insertBefore(topReveal, topbar);
    }

    if (!railHead.querySelector(".subcategory-rail-title")) {
      const title = document.createElement("span");
      title.className = "subcategory-rail-title";

      const label = railHead.querySelector(":scope > span");
      const count = railHead.querySelector(":scope > small");

      if (label) title.appendChild(label);
      if (count) title.appendChild(count);
      railHead.prepend(title);
    }

    if (!railHead.querySelector("#sections-pin")) {
      const pin = document.createElement("button");
      pin.id = "sections-pin";
      pin.type = "button";
      pin.className = "sections-pin icon-tooltip";
      pin.setAttribute("aria-pressed", "true");
      pin.setAttribute("aria-label", "Unpin Sections panel — auto-hide it");
      pin.setAttribute("data-tooltip", "Unpin Sections panel — auto-hide it");
      pin.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M14.8 3.5 20.5 9.2l-2.1 2.1-1.2-.3-3.7 3.7.3 3.2-1.4 1.4-3.3-4-3.4 3.4-1.4-1.4 3.4-3.4-4-3.3 1.4-1.4 3.2.3 3.7-3.7-.3-1.2 2.1-2.1Z"/>
        </svg>`;
      railHead.appendChild(pin);
    }

    if (!workbench.querySelector("#sections-reveal")) {
      const reveal = document.createElement("button");
      reveal.id = "sections-reveal";
      reveal.type = "button";
      reveal.className = "sections-reveal";
      reveal.setAttribute("aria-controls", "subcategory-nav");
      reveal.setAttribute("aria-expanded", "false");
      reveal.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 5.5h16M4 12h16M4 18.5h16"/>
        </svg>
        <span>Sections</span>`;
      workbench.insertBefore(reveal, rail);
    }

    if (!canvas.querySelector(".editor-context-bar")) {
      const contextBar = document.createElement("div");
      contextBar.className = "editor-context-bar";
      loadStatus.before(contextBar);
      contextBar.appendChild(loadStatus);

      const toggle = document.createElement("button");
      toggle.id = "fullscreen-toggle";
      toggle.type = "button";
      toggle.className = "fullscreen-toggle secondary-button";
      toggle.setAttribute("aria-pressed", "false");
      toggle.setAttribute("aria-label", "Open full screen editing");
      toggle.innerHTML = `
        <svg class="fullscreen-enter-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>
        </svg>
        <svg class="fullscreen-exit-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9 3v6H3M15 3v6h6M21 15h-6v6M3 15h6v6"/>
        </svg>
        <span>Full screen</span>`;
      contextBar.appendChild(toggle);
    }
  };

  normalizeCompactTopbar();
  normalizeFullscreenWorkspace();

  const e = {
    appShell: document.getElementById("app-shell"),
    bootStage: document.getElementById("boot-stage"),
    nav: document.getElementById("category-nav"),
    grid: document.getElementById("category-grid"),
    metrics: document.getElementById("metrics-grid"),
    categoryTotal:
      document.getElementById("category-total"),
    dashboardEmpty:
      document.getElementById("dashboard-empty"),
    home: document.getElementById("dashboard-home"),
    browser: document.getElementById("field-browser"),
    fieldGroups:
      document.getElementById("field-groups"),
    empty: document.getElementById("empty-state"),
    search: document.getElementById("search-input"),
    searchResultCount:
      document.getElementById("search-result-count"),
    pageTitle: document.getElementById("page-title"),
    pageSubtitle: document.getElementById("page-subtitle"),
    subcategoryNav:
      document.getElementById("subcategory-nav"),
    subcategoryCount:
      document.getElementById("subcategory-count"),
    categoryEyebrow:
      document.getElementById("category-eyebrow"),
    categoryTitle:
      document.getElementById("category-title"),
    categoryDescription:
      document.getElementById(
        "category-description",
      ),
    loadStatus: document.getElementById("load-status"),
    backHome: document.getElementById("back-home"),
    themeToggle:
      document.getElementById("theme-toggle"),
    menu: document.getElementById("mobile-menu"),
    sidebar: document.getElementById("sidebar"),
    workspace: document.querySelector(".workspace"),
    topbar: document.querySelector(".topbar"),
    editorWorkbench:
      document.querySelector(".editor-workbench"),
    subcategoryRail:
      document.querySelector(".subcategory-rail"),
    fullscreenToggle:
      document.getElementById("fullscreen-toggle"),
    sectionsPin:
      document.getElementById("sections-pin"),
    sectionsReveal:
      document.getElementById("sections-reveal"),
    fullscreenTopReveal:
      document.getElementById("fullscreen-top-reveal"),
    scrim: document.getElementById("scrim"),
    login: document.getElementById("login-button"),
    authIdle: document.getElementById("auth-idle"),
    authIdleLabel: document.getElementById("auth-idle-label"),
    loginProgress: document.getElementById("login-progress"),
    loginProgressLabel: document.getElementById("login-progress-label"),
    loginProgressValue: document.getElementById("login-progress-value"),
    loginProgressTrack: document.getElementById("login-progress-track"),
    loginProgressBar: document.getElementById("login-progress-bar"),
    logout: document.getElementById("logout-button"),
    refreshSession:
      document.getElementById("refresh-session"),
    authPanel:
      document.querySelector(".auth-panel"),
    authTitle: document.getElementById("auth-title"),
    authDetail: document.getElementById("auth-detail"),
    connectionBadge:
      document.getElementById("connection-badge"),
    topbarControls:
      document.getElementById("topbar-controls"),
    topbarActions:
      document.getElementById("topbar-actions"),
    searchToggle:
      document.getElementById("topbar-search-toggle"),
    utilityToggle:
      document.getElementById("utility-menu-toggle"),
    notificationToggle:
      document.getElementById("notification-toggle"),
    notificationPanel:
      document.getElementById("notification-panel"),
    notificationClose:
      document.getElementById("notification-close"),
    notificationList:
      document.getElementById("notification-list"),
    saveDock: document.getElementById("save-dock"),
    dirtyTitle:
      document.getElementById("dirty-title"),
    dirtyDetail:
      document.getElementById("dirty-detail"),
    discardDraft:
      document.getElementById("discard-draft"),
    reviewChanges:
      document.getElementById("review-changes"),
    reviewDialog:
      document.getElementById("review-dialog"),
    reviewBody:
      document.getElementById("review-body"),
    closeReview:
      document.getElementById("close-review"),
    cancelReview:
      document.getElementById("cancel-review"),
    confirmSave:
      document.getElementById("confirm-save"),
    toastStack:
      document.getElementById("toast-stack"),
  };

  const safeText = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  };

  const escapeHtml = (value) =>
    safeText(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character],
    );

  const renderNotifications = () => {
    if (!e.notificationList) {
      return;
    }

    if (!state.notifications.length) {
      e.notificationList.innerHTML =
        '<p class="notification-empty">No new notifications.</p>';
      return;
    }

    e.notificationList.innerHTML =
      state.notifications
        .map(
          (item) => `
            <article class="notification-item ${item.type || "info"}">
              <span>${escapeHtml(item.message)}</span>
              <time>${escapeHtml(item.time)}</time>
            </article>`,
        )
        .join("");
  };

  const recordNotification = (
    message,
    type = "",
  ) => {
    state.notifications.unshift({
      message: safeText(message),
      type: type || "info",
      time: new Intl.DateTimeFormat(
        undefined,
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      ).format(new Date()),
    });

    state.notifications =
      state.notifications.slice(0, 12);

    e.notificationToggle?.classList.add(
      "has-unread",
    );
    renderNotifications();
  };

  const toast = (message, type = "") => {
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.setAttribute("role", type === "error" ? "alert" : "status");
    node.textContent = message;
    e.toastStack.appendChild(node);
    recordNotification(message, type);

    setTimeout(() => {
      node.remove();
    }, 5200);
  };

  const api = async (path, options = {}) => {
    const headers = new Headers(
      options.headers || {},
    );

    if (
      options.body &&
      !headers.has("Content-Type")
    ) {
      headers.set(
        "Content-Type",
        "application/json",
      );
    }

    const method = String(
      options.method || "GET",
    ).toUpperCase();
    const authRequired = options.auth !== false;
    const sessionToken = readSessionValue(sessionTokenKey);
    const clientBinding = readSessionValue(clientBindingKey);

    headers.set("X-CyberSabil-Admin", "r13-exact-url");

    if (authRequired && sessionToken) {
      headers.set("Authorization", `Bearer ${sessionToken}`);
    }

    if (authRequired && clientBinding) {
      headers.set("X-Client-Binding", clientBinding);
    }

    if (
      authRequired &&
      state.csrfToken &&
      !["GET", "HEAD", "OPTIONS"].includes(method)
    ) {
      headers.set(
        "X-CSRF-Token",
        state.csrfToken,
      );
    }

    const response = await fetch(
      `${config.apiBase || ""}${path}`,
      {
        ...options,
        method,
        headers,
        credentials: "omit",
        cache: "no-store",
      },
    );

    const payload = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && authRequired) {
        clearSessionCredentials();
      }

      const error = new Error(
        payload.error || `HTTP ${response.status}`,
      );

      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  };

  const hasDirtyDraft = () =>
    [...editablePaths].some((path) => {
      const original = state.files.get(path)?.content;
      const draft = state.drafts.get(path);
      return (
        original !== undefined &&
        draft !== undefined &&
        !model.equal(original, draft)
      );
    });

  const captureLoginResult = async () => {
    const url = new URL(location.href);
    const status = url.searchParams.get("login");
    const authCode = url.searchParams.get("auth_code") || "";
    const message = url.searchParams.get("message") || "";

    if (!status && !authCode) {
      return;
    }

    url.searchParams.delete("login");
    url.searchParams.delete("auth_code");
    url.searchParams.delete("message");

    history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash || "#/"}`,
    );

    if (status === "success" && authCode) {
      clearBootstrapCache();
      state.authJustCaptured = true;

      e.login.disabled = true;
      e.login.textContent = "Verifying session…";
      e.authTitle.textContent =
        "Verifying secure session";
      e.authDetail.textContent =
        "GitHub authorization complete. One-time session exchange ho rahi hai.";

      setLoginProgress(
        82,
        "GitHub authorization received. Creating secure session…",
      );

      const clientBinding = readSessionValue(clientBindingKey);
      if (!clientBinding) {
        clearSessionCredentials();
        throw new Error(
          "Secure browser binding missing. Please sign in again.",
        );
      }

      const exchanged = await api(
        "/api/session/exchange",
        {
          method: "POST",
          auth: false,
          headers: {
            "X-Client-Binding": clientBinding,
          },
          body: JSON.stringify({ authCode }),
        },
      );

      writeSessionValue(
        sessionTokenKey,
        exchanged.sessionToken,
      );
      writeSessionValue(
        csrfTokenKey,
        exchanged.csrfToken,
      );
      state.csrfToken = exchanged.csrfToken || "";
      return;
    }

    clearSessionCredentials();
    toast(
      message ||
      "GitHub login could not be completed.",
      "error",
    );
  };

  const setLoginProgress = (value, label) => {
    if (
      !e.loginProgress ||
      !e.loginProgressLabel ||
      !e.loginProgressValue ||
      !e.loginProgressTrack ||
      !e.loginProgressBar
    ) {
      return;
    }

    const safeValue = Math.max(
      0,
      Math.min(100, Math.round(value)),
    );

    if (e.authPanel) {
      e.authPanel.dataset.authPhase = "progress";
    }
    if (e.authIdle) {
      e.authIdle.hidden = true;
    }

    e.loginProgress.hidden = false;
    e.loginProgressLabel.textContent = label;
    e.loginProgressValue.textContent = `${safeValue}%`;
    e.loginProgressTrack.setAttribute(
      "aria-valuenow",
      String(safeValue),
    );
    e.loginProgressBar.style.width = `${safeValue}%`;
  };

  const hideLoginProgress = () => {
    if (!e.loginProgress) {
      return;
    }

    e.loginProgress.hidden = true;
    if (e.authPanel) {
      e.authPanel.dataset.authPhase = "idle";
    }
    if (e.authIdle) {
      e.authIdle.hidden = false;
    }
    if (e.authIdleLabel) {
      e.authIdleLabel.textContent =
        "Protected by GitHub OAuth";
    }
    e.loginProgressLabel.textContent =
      "Preparing secure login…";
    e.loginProgressValue.textContent = "0%";
    e.loginProgressTrack.setAttribute(
      "aria-valuenow",
      "0",
    );
    e.loginProgressBar.style.width = "0%";
  };

  const setAuthPresentation = (mode) => {
    if (!e.authPanel) {
      return;
    }

    e.authPanel.dataset.authPresentation = mode;

    if (mode === "dashboard") {
      e.authPanel.dataset.authPhase = "dashboard";

      if (e.authIdle) {
        e.authIdle.hidden = true;
      }

      if (e.loginProgress) {
        e.loginProgress.hidden = true;
      }

      return;
    }

    if (
      !e.authPanel.dataset.authPhase ||
      e.authPanel.dataset.authPhase === "dashboard"
    ) {
      e.authPanel.dataset.authPhase = "idle";
    }
  };

  const CACHE_VERSION = 3;
  const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  const cacheKey =
    config.cacheKey ||
    "cybersabil_admin1_v2_bootstrap_cache";

  const uiStateKey =
    config.uiStateKey ||
    "cybersabil_admin1_v2_ui_state";

  const shellSnapshotKey =
    "cybersabil_admin1_v2_shell_snapshot_v2";
  const legacyShellSnapshotKey =
    "cybersabil_admin1_v2_shell_snapshot_v1";
  const SHELL_SNAPSHOT_VERSION = 2;
  const SHELL_SNAPSHOT_MAX_BYTES = 3_500_000;

  let eventsBound = false;
  let uiSaveTimer = 0;
  let sectionsCloseTimer = 0;
  let sectionsOpenTimer = 0;
  let topbarCloseTimer = 0;
  let topbarRevealTimer = 0;
  let workspaceTransitionTimer = 0;
  let sectionsLauncherDrag = null;
  let suppressSectionsLauncherClick = false;

  const readStoredJson = (key) => {
    try {
      return JSON.parse(
        localStorage.getItem(key) || "null",
      );
    } catch {
      return null;
    }
  };

  const currentUiState = () => ({
    version: 1,
    savedAt: Date.now(),
    theme:
      document.documentElement.dataset.theme ||
      "dark",
    hash: location.hash || "#/",
    scrollY: Math.max(
      0,
      Math.round(window.scrollY || 0),
    ),
    mode: state.mode,
    workspaceFullscreen:
      Boolean(
        state.workspaceFullscreen &&
        state.activeCategory,
      ),
    sectionsPinned: state.sectionsPinned,
    sectionsLauncherEdge:
      state.sectionsLauncherEdge,
    sectionsLauncherRatio:
      state.sectionsLauncherRatio,
  });

  const saveUiState = () => {
    try {
      localStorage.setItem(
        uiStateKey,
        JSON.stringify(currentUiState()),
      );
    } catch {
      // UI state persistence is optional.
    }
  };

  const scheduleUiStateSave = () => {
    if (!state.bootCompleted) {
      return;
    }

    window.clearTimeout(uiSaveTimer);
    uiSaveTimer = window.setTimeout(
      saveUiState,
      120,
    );
  };

  const syncWorkspaceFullscreenUI = () => {
    const active = Boolean(
      state.workspaceFullscreen &&
      state.activeCategory,
    );
    const pinned = Boolean(state.sectionsPinned);
    const compactDrawer = window.matchMedia(
      "(max-width: 860px)",
    ).matches;
    const panelOpen = Boolean(
      active &&
      (!pinned || compactDrawer) &&
      state.sectionsPanelOpen,
    );
    const topbarOpen = Boolean(
      active && state.topbarRevealed,
    );

    document.documentElement.dataset.workspaceFullscreen =
      String(active);
    document.documentElement.dataset.sectionsPinned =
      String(pinned);
    document.documentElement.dataset.sectionsLauncherEdge =
      state.sectionsLauncherEdge === "right"
        ? "right"
        : "left";
    document.documentElement.style.setProperty(
      "--sections-launcher-y",
      `${Math.min(0.9, Math.max(0.1, Number(state.sectionsLauncherRatio) || 0.5)) * 100}dvh`,
    );

    document.body.classList.toggle(
      "workspace-fullscreen",
      active,
    );
    document.body.classList.toggle(
      "sections-panel-pinned",
      active && pinned,
    );
    document.body.classList.toggle(
      "sections-panel-open",
      panelOpen,
    );
    document.body.classList.toggle(
      "fullscreen-topbar-revealed",
      topbarOpen,
    );

    if (e.fullscreenToggle) {
      e.fullscreenToggle.classList.toggle(
        "is-active",
        active,
      );
      e.fullscreenToggle.setAttribute(
        "aria-pressed",
        String(active),
      );
      e.fullscreenToggle.setAttribute(
        "aria-label",
        active
          ? "Exit full screen editing"
          : "Open full screen editing",
      );
      const label =
        e.fullscreenToggle.querySelector("span");
      if (label) {
        label.textContent = active
          ? "Exit full screen"
          : "Full screen";
      }
    }

    if (e.sectionsPin) {
      const tooltip = pinned
        ? "Unpin Sections panel — auto-hide it"
        : "Pin Sections panel — keep it visible";
      e.sectionsPin.classList.toggle(
        "is-pinned",
        pinned,
      );
      e.sectionsPin.setAttribute(
        "aria-pressed",
        String(pinned),
      );
      e.sectionsPin.setAttribute(
        "aria-label",
        tooltip,
      );
      e.sectionsPin.setAttribute(
        "data-tooltip",
        tooltip,
      );
      e.sectionsPin.title = tooltip;
    }

    if (e.sectionsReveal) {
      e.sectionsReveal.setAttribute(
        "aria-expanded",
        String(panelOpen),
      );
      e.sectionsReveal.hidden =
        !active || (pinned && !compactDrawer);
    }
  };

  const setWorkspaceFullscreen = (
    enabled,
    { persist = true } = {},
  ) => {
    const next = Boolean(
      enabled && state.activeCategory,
    );

    const commit = () => {
      state.workspaceFullscreen = next;
      state.sectionsPanelOpen = false;
      state.topbarRevealed = false;
      window.clearTimeout(sectionsCloseTimer);
      window.clearTimeout(sectionsOpenTimer);
      window.clearTimeout(topbarCloseTimer);
      window.clearTimeout(topbarRevealTimer);
      closeTopbarOverlays();
      syncWorkspaceFullscreenUI();

      if (persist) {
        saveUiState();
        window.setTimeout(saveShellSnapshot, 0);
      }
    };

    window.clearTimeout(workspaceTransitionTimer);
    const animate =
      !window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches &&
      document.body.dataset.view === "category";

    if (!animate) {
      document.body.classList.remove(
        "workspace-transitioning",
      );
      commit();
      return;
    }

    document.body.classList.add(
      "workspace-transitioning",
    );
    requestAnimationFrame(() => {
      commit();
      workspaceTransitionTimer = window.setTimeout(
        () => document.body.classList.remove(
          "workspace-transitioning",
        ),
        280,
      );
    });
  };

  const setSectionsPinned = (
    pinned,
    { persist = true } = {},
  ) => {
    state.sectionsPinned = Boolean(pinned);
    state.sectionsPanelOpen = false;
    window.clearTimeout(sectionsCloseTimer);
    window.clearTimeout(sectionsOpenTimer);
    syncWorkspaceFullscreenUI();

    if (persist) {
      saveUiState();
      window.setTimeout(saveShellSnapshot, 0);
    }
  };

  const setSectionsPanelOpen = (open) => {
    window.clearTimeout(sectionsOpenTimer);
    if (
      !state.workspaceFullscreen ||
      (
        state.sectionsPinned &&
        !window.matchMedia("(max-width: 860px)").matches
      )
    ) {
      state.sectionsPanelOpen = false;
    } else {
      state.sectionsPanelOpen = Boolean(open);
    }
    syncWorkspaceFullscreenUI();
  };

  const scheduleSectionsPanelClose = () => {
    if (
      state.sectionsPinned &&
      !window.matchMedia("(max-width: 860px)").matches
    ) {
      return;
    }

    window.clearTimeout(sectionsCloseTimer);
    sectionsCloseTimer = window.setTimeout(
      () => setSectionsPanelOpen(false),
      380,
    );
  };

  const scheduleSectionsPanelOpen = () => {
    if (
      !state.workspaceFullscreen ||
      state.sectionsPinned ||
      !window.matchMedia("(hover: hover)").matches
    ) {
      return;
    }

    window.clearTimeout(sectionsCloseTimer);
    window.clearTimeout(sectionsOpenTimer);
    sectionsOpenTimer = window.setTimeout(
      () => setSectionsPanelOpen(true),
      130,
    );
  };

  const setTopbarRevealed = (revealed) => {
    window.clearTimeout(topbarRevealTimer);
    state.topbarRevealed = Boolean(
      revealed && state.workspaceFullscreen,
    );
    syncWorkspaceFullscreenUI();
  };

  const scheduleTopbarReveal = () => {
    if (!state.workspaceFullscreen) {
      return;
    }

    window.clearTimeout(topbarCloseTimer);
    window.clearTimeout(topbarRevealTimer);
    topbarRevealTimer = window.setTimeout(
      () => setTopbarRevealed(true),
      120,
    );
  };

  const scheduleTopbarHide = () => {
    window.clearTimeout(topbarCloseTimer);
    topbarCloseTimer = window.setTimeout(
      () => setTopbarRevealed(false),
      460,
    );
  };

  const canDragSectionsLauncher = () =>
    Boolean(
      state.workspaceFullscreen &&
      !state.sectionsPinned &&
      !window.matchMedia("(max-width: 860px)").matches,
    );

  const updateSectionsLauncherPlacement = (
    clientX,
    clientY,
  ) => {
    const height = Math.max(1, window.innerHeight);
    state.sectionsLauncherEdge =
      clientX >= window.innerWidth / 2
        ? "right"
        : "left";
    state.sectionsLauncherRatio = Math.min(
      0.9,
      Math.max(0.1, clientY / height),
    );
    syncWorkspaceFullscreenUI();
  };

  const finishSectionsLauncherDrag = (
    event,
    { cancelled = false } = {},
  ) => {
    if (
      !sectionsLauncherDrag ||
      event.pointerId !== sectionsLauncherDrag.pointerId
    ) {
      return;
    }

    const moved = sectionsLauncherDrag.moved;
    sectionsLauncherDrag = null;
    e.sectionsReveal?.classList.remove("is-dragging");

    if (
      e.sectionsReveal?.hasPointerCapture?.(
        event.pointerId,
      )
    ) {
      e.sectionsReveal.releasePointerCapture(
        event.pointerId,
      );
    }

    if (moved && !cancelled) {
      suppressSectionsLauncherClick = true;
      saveUiState();
      window.setTimeout(saveShellSnapshot, 0);
      window.setTimeout(() => {
        suppressSectionsLauncherClick = false;
      }, 0);
    }
  };

  const readUiState = () => {
    const ui = readStoredJson(uiStateKey);

    if (!ui || ui.version !== 1) {
      return null;
    }

    return ui;
  };

  const applyStoredUiPreferences = () => {
    const ui = readUiState();

    if (!ui) {
      return;
    }

    if (
      ui.theme === "dark" ||
      ui.theme === "light"
    ) {
      document.documentElement.dataset.theme =
        ui.theme;

      e.themeToggle.textContent =
        ui.theme === "dark" ? "☀️" : "🌙";
    }

    if (
      ["all", "basic", "expert", "internal"]
        .includes(ui.mode)
    ) {
      state.mode = ui.mode;
    }

    state.sectionsPinned =
      ui.sectionsPinned !== false;
    state.sectionsLauncherEdge =
      ui.sectionsLauncherEdge === "right"
        ? "right"
        : "left";
    state.sectionsLauncherRatio =
      Number.isFinite(ui.sectionsLauncherRatio)
        ? Math.min(
            0.9,
            Math.max(0.1, ui.sectionsLauncherRatio),
          )
        : 0.5;
    state.workspaceFullscreen = Boolean(
      ui.workspaceFullscreen &&
      /^#\/category\/[a-z0-9-]+$/.test(
        location.hash || "",
      ),
    );
    syncWorkspaceFullscreenUI();
  };

  const applyModeButtonState = () => {
    document.documentElement.dataset.fieldMode =
      state.mode;

    document
      .querySelectorAll("[data-mode]")
      .forEach((button) => {
        button.classList.toggle(
          "is-active",
          button.dataset.mode === state.mode,
        );
      });
  };

  const restoreScrollPosition = () => {
    const ui = readUiState();

    if (
      !ui ||
      ui.hash !== (location.hash || "#/") ||
      !Number.isFinite(ui.scrollY)
    ) {
      return;
    }

    const target = Math.max(0, ui.scrollY);
    const apply = () => window.scrollTo(0, target);

    apply();

    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(apply);
    });
  };

  const captureViewContinuity = () => ({
    hash: location.hash || "#/",
    scrollY: Math.max(
      0,
      Math.round(window.scrollY || 0),
    ),
    activeSectionId:
      e.subcategoryNav
        ?.querySelector(
          "[data-group-target].is-active",
        )
        ?.dataset.groupTarget || "",
    openSectionIds: [
      ...e.fieldGroups.querySelectorAll(
        "details.field-group[open][id]",
      ),
    ].map((section) => section.id),
  });

  const restoreViewContinuity = async (view) => {
    if (
      !view ||
      view.hash !== (location.hash || "#/")
    ) {
      return;
    }

    if (state.activeCategory) {
      const openIds = new Set(
        view.openSectionIds || [],
      );

      e.fieldGroups
        .querySelectorAll("details.field-group[id]")
        .forEach((section) => {
          section.open = openIds.has(section.id);
        });

      if (
        view.activeSectionId &&
        document.getElementById(
          view.activeSectionId,
        )
      ) {
        setActiveSectionButton(
          view.activeSectionId,
        );
      }
    }

    const target = Math.max(
      0,
      Number(view.scrollY) || 0,
    );
    const apply = () => window.scrollTo(0, target);

    apply();
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        apply();
        requestAnimationFrame(() => {
          apply();
          resolve();
        });
      });
    });
  };

  const finishBoot = () => {
    if (state.bootCompleted) {
      return;
    }

    state.bootCompleted = true;

    document.documentElement.classList.remove(
      "boot-pending",
      "preboot-unresolved",
      "preboot-restored",
      "preboot-anonymous",
      "preboot-authenticated-no-cache",
    );

    document.body.classList.add("app-ready");

    if (e.bootStage) {
      e.bootStage.hidden = true;
    }
  };

  const clearBootstrapCache = () => {
    try {
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(uiStateKey);
      localStorage.removeItem(shellSnapshotKey);
      localStorage.removeItem(legacyShellSnapshotKey);
    } catch {
      // Browser storage may be disabled.
    }
  };

  const saveShellSnapshot = () => {
    if (
      !state.bootCompleted ||
      !state.dataReady ||
      !state.user ||
      !e.appShell ||
      hasDirtyDraft()
    ) {
      return;
    }

    try {
      const clone = e.appShell.cloneNode(true);

      /*
       * Cached first paint remains read-only until fresh GitHub SHAs arrive.
       * Lock only editing/save controls. Navigation, logout, theme, search,
       * and other dashboard chrome must remain visually stable and enabled.
       */
      clone
        .querySelectorAll(
          [
            "[data-field-id]",
            "[data-list-action]",
            "#review-changes",
            "#discard-draft",
            "#confirm-save",
          ].join(","),
        )
        .forEach((control) => {
          control.disabled = true;
          control.setAttribute(
            "data-preboot-edit-lock",
            "true",
          );
        });

      const cachedRefresh =
        clone.querySelector("#refresh-session");
      const cachedLogout =
        clone.querySelector("#logout-button");

      if (cachedRefresh) {
        cachedRefresh.hidden = false;
        cachedRefresh.disabled = true;
        cachedRefresh.classList.remove(
          "secondarys-button",
        );
        cachedRefresh.classList.add(
          "secondary-button",
          "auth-refresh-button",
        );
        cachedRefresh.setAttribute(
          "aria-busy",
          "true",
        );
      }

      if (cachedLogout) {
        cachedLogout.hidden = false;
        cachedLogout.disabled = false;
      }

      clone
        .querySelectorAll(".is-dirty")
        .forEach((node) => {
          node.classList.remove("is-dirty");
        });

      const saveDock =
        clone.querySelector("#save-dock");
      const authDetail =
        clone.querySelector("#auth-detail");
      const scrim =
        clone.querySelector("#scrim");
      const sidebar =
        clone.querySelector("#sidebar");

      if (saveDock) saveDock.hidden = true;
      if (scrim) scrim.hidden = true;
      if (sidebar) {
        sidebar.classList.remove("is-open");
      }
      if (authDetail) {
        authDetail.textContent =
          "Cached dashboard ready hai. Latest GitHub values aur SHA background mein sync ho rahe hain.";
      }

      const html = clone.innerHTML;

      if (
        new TextEncoder().encode(html).byteLength >
        SHELL_SNAPSHOT_MAX_BYTES
      ) {
        return;
      }

      localStorage.setItem(
        shellSnapshotKey,
        JSON.stringify({
          version: SHELL_SNAPSHOT_VERSION,
          savedAt: Date.now(),
          repository: config.repository,
          branch: config.branch,
          hash: location.hash || "#/",
          scrollY: Math.max(
            0,
            Math.round(window.scrollY || 0),
          ),
          html,
        }),
      );
    } catch {
      // Snapshot is a visual optimization only.
    }
  };

  const saveBootstrapCache = () => {
    if (
      !state.schema ||
      !state.user ||
      !state.files.size
    ) {
      return;
    }

    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          version: CACHE_VERSION,
          repository: config.repository,
          branch: config.branch,
          savedAt: Date.now(),
          user: state.user,
          schema: state.schema,
          files: [...state.files.entries()].map(
            ([path, file]) => ({
              path,
              sha: file.sha,
              content: file.content,
            }),
          ),
        }),
      );

      saveUiState();
    } catch {
      // Cache failure must never block the dashboard.
    }
  };

  const readBootstrapCache = () => {
    const authenticatedCacheAllowed =
      serverAuth === "authenticated" ||
      (
        serverAuth === "pending" &&
        hasSessionHint()
      );

    if (
      !authenticatedCacheAllowed ||
      state.authJustCaptured
    ) {
      return null;
    }

    const cached = readStoredJson(cacheKey);

    if (
      !cached ||
      cached.version !== CACHE_VERSION ||
      cached.repository !== config.repository ||
      cached.branch !== config.branch ||
      !cached.user ||
      !cached.schema ||
      !Array.isArray(cached.schema.fields) ||
      !Array.isArray(cached.files) ||
      !Number.isFinite(cached.savedAt) ||
      Date.now() - cached.savedAt >
        CACHE_MAX_AGE_MS
    ) {
      return null;
    }

    const cachedPaths = new Set(
      cached.files.map((file) => file.path),
    );

    if (
      [...editablePaths].some(
        (path) => !cachedPaths.has(path),
      )
    ) {
      return null;
    }

    return cached;
  };

  const restoreBootstrapCache = () => {
    const cached = readBootstrapCache();

    if (!cached) {
      return false;
    }

    state.schema = cached.schema;
    loadEditableFiles(cached.files);
    state.user = cached.user;
    state.dataReady = false;
    state.checkingSession = true;
    state.cacheRestored = true;

    return true;
  };

  /* ADMIN1_V2_LOGIN_CARD_PRO_V2 */
  const login = () => {
    e.login.disabled = true;
    e.login.textContent = "Connecting to GitHub…";
    e.authTitle.textContent =
      "Secure GitHub sign-in";
    e.authDetail.textContent =
      "Authentication process start ho rahi hai. Please wait.";

    setLoginProgress(
      10,
      "Preparing secure login…",
    );

    const returnTo =
      `${location.origin}${location.pathname}${location.search}${location.hash || "#/"}`;
    const clientBinding = randomBrowserToken(32);
    writeSessionValue(clientBindingKey, clientBinding);

    window.setTimeout(() => {
      setLoginProgress(
        35,
        "Connecting to GitHub…",
      );
    }, 200);

    window.setTimeout(() => {
      setLoginProgress(
        60,
        "Opening GitHub authorization…",
      );

      location.href =
        `${config.apiBase || ""}/auth?return_to=` +
        encodeURIComponent(returnTo) +
        "&client_binding=" +
        encodeURIComponent(clientBinding);
    }, 550);
  };

  const logout = async () => {
    if (
      hasDirtyDraft() &&
      !window.confirm(
        "Unsaved draft discard karke sign out karna hai?",
      )
    ) {
      return;
    }

    try {
      await api("/api/logout", {
        method: "POST",
      });
    } catch {
      // Client state is still cleared if the network is unavailable.
    }

    clearBootstrapCache();
    clearSessionCredentials();

    state.csrfToken = "";
    state.user = null;
    state.checkingSession = false;
    state.dataReady = false;
    state.authJustCaptured = false;
    state.files.clear();
    state.drafts.clear();

    updateAuthUI();

    if (state.schema) {
      renderFieldBrowser();
    }

    toast("Signed out.");
  };

  const isCategoryEditable = (categoryId) =>
    editableCategories.has(categoryId);

  const categoryEditableStatus = (category) => {
    if (!isCategoryEditable(category.id)) {
      return "Read-only";
    }

    if (
      state.checkingSession ||
      (state.user && !state.dataReady)
    ) {
      return "Syncing latest SHA";
    }

    return state.user
      ? "Editable"
      : "Editable after login";
  };

  const updateAuthUI = () => {
    const signedIn = Boolean(state.user);

    setAuthPresentation(
      signedIn ? "dashboard" : "login",
    );

    const checkingWithoutCache = Boolean(
      state.checkingSession &&
      !signedIn,
    );

    const syncingData = Boolean(
      signedIn &&
      (
        state.checkingSession ||
        !state.dataReady
      ),
    );

    document.body.classList.toggle(
      "is-background-syncing",
      syncingData,
    );

    document.body.classList.remove(
      "auth-pending",
    );

    document.body.classList.toggle(
      "auth-required",
      !signedIn,
    );

    if (e.authPanel) {
      // Login card remains available only for a genuinely anonymous session.
      // Signed-in controls live in the compact utility bar.
      e.authPanel.hidden = signedIn;
    }

    // Cached first paint must never preserve disabled static controls.
    [
      e.logout,
      e.refreshSession,
      e.themeToggle,
      e.search,
      e.menu,
      e.backHome,
      e.searchToggle,
      e.utilityToggle,
      e.notificationToggle,
    ].forEach((control) => {
      if (control) {
        control.disabled = false;
        control.removeAttribute(
          "data-preboot-disabled",
        );
      }
    });

    document
      .querySelectorAll(
        "[data-category], [data-home], [data-mode]",
      )
      .forEach((control) => {
        control.disabled = false;
        control.removeAttribute(
          "data-preboot-disabled",
        );
      });

    if (checkingWithoutCache) {
      e.login.hidden = true;
      e.logout.hidden = true;
      e.refreshSession.hidden = true;

      e.authTitle.textContent =
        state.authJustCaptured
          ? "Verifying secure session"
          : "Checking secure session…";

      e.authDetail.textContent =
        state.authJustCaptured
          ? "GitHub authorization complete. Dashboard securely load ho raha hai."
          : "Saved secure session verify ho rahi hai.";

      e.connectionBadge.textContent =
        "🟡 Checking secure session";

      e.saveDock.hidden = true;

      if (!state.authJustCaptured) {
        hideLoginProgress();
        if (e.authPanel) {
          e.authPanel.dataset.authPhase = "loading";
        }
        if (e.authIdleLabel) {
          e.authIdleLabel.textContent =
            "Secure session check in progress";
        }
      }

      return;
    }

    e.login.hidden = signedIn;
    e.logout.hidden = !signedIn;

    if (e.refreshSession) {
      e.refreshSession.classList.remove(
        "secondarys-button",
      );
      e.refreshSession.classList.add(
        "secondary-button",
        "auth-refresh-button",
      );
      e.refreshSession.hidden = !signedIn;
      e.refreshSession.disabled = syncingData;
      e.refreshSession.setAttribute(
        "aria-busy",
        syncingData ? "true" : "false",
      );
      e.refreshSession.textContent = "↻ Refresh";
    }

    if (!signedIn) {
      e.login.disabled = false;
      e.login.textContent =
        "Sign in with GitHub";

      e.authTitle.textContent =
        "GitHub login required";

      e.authDetail.textContent =
        "Sign in karke latest GitHub values aur SHA load karein.";

      e.connectionBadge.textContent =
        "🔒 Sign in required";

      e.saveDock.hidden = true;
      hideLoginProgress();
      if (e.authIdleLabel) {
        e.authIdleLabel.textContent =
          "Protected by GitHub OAuth";
      }
      return;
    }

    e.authTitle.textContent =
      `Signed in as ${state.user.login}`;

    e.authDetail.textContent =
      syncingData
        ? "Cached dashboard ready hai. Latest GitHub values aur SHA background mein sync ho rahe hain."
        : `${config.repository} · ${config.branch} · Pages CMS-safe stale SHA protection active`;

    // Keep the approved signed-in topbar visually frozen. The two-pixel
    // top-edge line is the sole background-sync indicator.
    e.connectionBadge.textContent =
      "🟢 GitHub connected";

    e.saveDock.hidden = !(
      state.dataReady &&
      isCategoryEditable(
        state.activeCategory,
      )
    );
  };

  const fieldsForPath = (path) =>
    state.schema.fields.filter(
      (field) => field.jsonPath === path,
    );

  const refreshSession = async () => {
    if (
      hasDirtyDraft() &&
      !window.confirm(
        "Latest GitHub values reload karne par unsaved draft discard ho jayega. Continue?",
      )
    ) {
      return;
    }

    const continuity = captureViewContinuity();

    state.checkingSession = true;

    if (!state.user) {
      state.dataReady = false;
    }

    updateAuthUI();

    try {
      const result =
        await api("/api/bootstrap");

      loadEditableFiles(
        result.files,
        { render: false },
      );

      state.user = result.user;
      state.csrfToken = result.csrfToken;
      writeSessionValue(csrfTokenKey, result.csrfToken || "");
      state.dataReady = true;
      state.checkingSession = false;

      saveBootstrapCache();

      if (state.authJustCaptured) {
        setLoginProgress(
          100,
          "Session verified. Opening dashboard…",
        );

        await new Promise((resolve) => {
          window.setTimeout(resolve, 220);
        });
      }

      state.authJustCaptured = false;

      updateAuthUI();
      hideLoginProgress();

      if (state.activeCategory) {
        renderFieldBrowser();
      }

      await restoreViewContinuity(continuity);
      saveUiState();

      toast(
        "Latest GitHub data and file SHAs loaded.",
        "success",
      );

      saveShellSnapshot();
    } catch (error) {
      state.checkingSession = false;
      state.authJustCaptured = false;
      state.csrfToken = "";

      if (error.status === 401) {
        clearBootstrapCache();
        clearSessionCredentials();
        state.user = null;
        state.dataReady = false;
        state.files.clear();
        state.drafts.clear();

        updateAuthUI();

        if (state.activeCategory) {
          renderFieldBrowser();
        }

        return;
      }

      state.dataReady = false;
      updateAuthUI();

      e.connectionBadge.textContent =
        state.user
          ? "🔴 GitHub sync failed · read-only"
          : "🔴 Session check failed";

      toast(error.message, "error");
    }
  };

  const loadEditableFiles = (
    files,
    { render = true } = {},
  ) => {
    if (!Array.isArray(files)) {
      throw new Error(
        "Bootstrap files payload is invalid.",
      );
    }

    const resultByPath = new Map(
      files.map((file) => [
        file.path,
        file,
      ]),
    );

    const missing = [...editablePaths].filter(
      (path) => !resultByPath.has(path),
    );

    if (missing.length) {
      throw new Error(
        `Bootstrap missing ${missing.length} required file(s).`,
      );
    }

    state.files.clear();
    state.drafts.clear();

    let identityRepairs = 0;

    [...editablePaths].forEach((path) => {
      const result = resultByPath.get(path);

      if (
        !result.sha ||
        typeof result.sha !== "string"
      ) {
        throw new Error(
          `Bootstrap SHA missing: ${path}`,
        );
      }

      state.files.set(path, {
        sha: result.sha,
        content: result.content,
      });

      if (listPaths.has(path)) {
        const normalized =
          model.normalizeListIdentities(
            result.content,
          );

        identityRepairs +=
          normalized.repairs.length;

        state.drafts.set(
          path,
          normalized.list,
        );
      } else {
        state.drafts.set(
          path,
          model.clone(result.content),
        );
      }
    });

    if (identityRepairs > 0) {
      toast(
        `${identityRepairs} Pages CMS card identity value(s) missing/duplicate the. Draft mein safe UUID repair add hua; review karke save karein.`,
        "error",
      );
    }

    updateDirtyUI();

    if (
      render &&
      state.activeCategory
    ) {
      renderFieldBrowser();
    }
  };

  const getObjectFieldValue = (field) => {
    const draft = state.drafts.get(field.jsonPath);

    if (
      draft &&
      !field.listEditor &&
      model.isPlainObject(draft)
    ) {
      return draft[field.name];
    }

    const file = state.files.get(field.jsonPath);

    if (
      file &&
      !field.listEditor &&
      model.isPlainObject(file.content)
    ) {
      return file.content[field.name];
    }

    return undefined;
  };

  const isObjectFieldEditable = (field) =>
    Boolean(state.user) &&
    state.dataReady &&
    isCategoryEditable(field.category) &&
    objectPaths.has(field.jsonPath) &&
    !field.listEditor &&
    !field.hidden &&
    !field.readonly &&
    [
      "string",
      "text",
      "number",
      "select",
      "image",
    ].includes(field.type);

  const isListPathEditable = (path, category) =>
    Boolean(state.user) &&
    state.dataReady &&
    isCategoryEditable(category) &&
    listPaths.has(path);

  const selectOptions = (field) => {
    const values = field.options?.values || [];

    return values
      .map((option) => {
        const name =
          typeof option === "object"
            ? option.name
            : option;
        const label =
          typeof option === "object"
            ? option.label
            : option;

        return (
          `<option value="${escapeHtml(name)}">` +
          `${escapeHtml(label)}</option>`
        );
      })
      .join("");
  };

  const fieldInput = ({
    field,
    value,
    scope,
    itemId = "",
  }) => {
    const attributes = [
      `data-input-scope="${scope}"`,
      `data-field-id="${escapeHtml(field.id)}"`,
      `data-path="${escapeHtml(field.jsonPath)}"`,
      `data-name="${escapeHtml(field.name)}"`,
    ];

    if (itemId) {
      attributes.push(
        `data-item-id="${escapeHtml(itemId)}"`,
      );
    }

    const common = attributes.join(" ");
    let control = "";

    if (field.type === "select") {
      control =
        `<select ${common}>` +
        `${selectOptions(field)}</select>`;
    } else if (field.type === "number") {
      const minimum =
        field.min ?? field.options?.min;
      const maximum =
        field.max ?? field.options?.max;
      const stepValue =
        field.step ?? field.options?.step;

      control =
        `<input type="number" ${common} ` +
        `${minimum !== null && minimum !== undefined ? `min="${minimum}"` : ""} ` +
        `${maximum !== null && maximum !== undefined ? `max="${maximum}"` : ""} ` +
        `${stepValue !== null && stepValue !== undefined ? `step="${stepValue}"` : 'step="any"'} ` +
        `value="${escapeHtml(value)}">`;
    } else if (field.type === "text") {
      control =
        `<textarea ${common}>` +
        `${escapeHtml(value)}</textarea>`;
    } else {
      control =
        `<input type="text" ${common} ` +
        `value="${escapeHtml(value)}">`;
    }

    return control;
  };

  const objectInputControl = (field, value) => {
    if (!isObjectFieldEditable(field)) {
      let note =
        '<div class="lock-note">🔒 Internal/read-only field</div>';

      if (!isCategoryEditable(field.category)) {
        note =
          '<div class="lock-note">🔒 Category audit pending</div>';
      } else if (
        state.checkingSession ||
        (state.user && !state.dataReady)
      ) {
        note =
          '<div class="lock-note">⏳ Latest SHA sync ho raha hai</div>';
      } else if (!state.user) {
        note =
          '<div class="lock-note">🔒 Sign in to edit</div>';
      }

      return `
        <div class="field-value">
          <div class="value-label">
            <span>Current value</span>
            <span class="technical-path">${escapeHtml(field.jsonPath)}</span>
          </div>
          <div class="value-text">${escapeHtml(value)}</div>
          ${note}
        </div>`;
    }

    return `
      <label class="editable-control">
        <span class="value-label">
          <span>Draft value</span>
          <span class="technical-path">${escapeHtml(field.jsonPath)}</span>
        </span>
        ${fieldInput({
      field,
      value,
      scope: "object",
    })}
      </label>`;
  };

  const metric = (label, value, detail) => `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${detail}</small>
    </article>`;

  const renderMetrics = () => {
    const auditedCategories = state.schema.categories.filter((category) =>
      editableCategories.has(category.id),
    );
    const auditedMapped = auditedCategories.reduce(
      (total, category) => total + category.fieldCount,
      0,
    );
    const editableControls = state.schema.fields.filter(
      (field) =>
        editableCategories.has(field.category) &&
        !field.hidden &&
        !field.readonly,
    ).length;
    const protectedMapped =
      state.schema.manifest.fields - editableControls;

    e.metrics.innerHTML = [
      metric(
        "Editable settings",
        editableControls,
        "Available on the protected main branch",
      ),
      metric(
        "Work areas",
        auditedCategories.length,
        "Focused content categories",
      ),
      metric(
        "Protected settings",
        protectedMapped,
        "Hidden, internal or read-only",
      ),
      metric(
        "Save protection",
        "SHA",
        "Stale writes are blocked",
      ),
    ].join("");
  };

  const categoryCard = (category) => {
    const ui = currentCategoryUi(category.id);

    return `
    <button
      class="category-card"
      type="button"
      data-category="${category.id}"
      style="--card-accent:${ui.accent};--card-accent-2:${ui.accent2}"
    >
      <span class="category-icon">${category.emoji}</span>
      <h3>${escapeHtml(category.label)}</h3>
      <p>${escapeHtml(category.description)}</p>
      <div class="category-stats">
        <span>${category.fieldCount} fields</span>
        <span>${category.subcategories.length} groups</span>
        <span>${categoryEditableStatus(category)}</span>
      </div>
    </button>`;
  };

  const navButton = (category) => {
    const ui = currentCategoryUi(category.id);

    return `
    <button
      class="nav-button"
      type="button"
      data-category="${category.id}"
      style="--nav-accent:${ui.accent}"
    >
      <span class="nav-emoji">${category.emoji}</span>
      <span>${escapeHtml(category.label)}</span>
      <small>${category.fieldCount}</small>
    </button>`;
  };

  const renderCategories = () => {
    const categories = state.schema.categories;

    e.grid.innerHTML = categories
      .map(categoryCard)
      .join("");

    e.nav.innerHTML = `
      <button
        class="nav-button is-active"
        type="button"
        data-home="true"
        style="--nav-accent:${currentCategoryUi("home").accent}"
      >
        <span class="nav-emoji">⌂</span>
        <span>Dashboard Home</span>
        <small>${state.schema.manifest.fields}</small>
      </button>
      ${categories.map(navButton).join("")}`;

    applyDashboardFilters();
  };

  const closeMenu = () => {
    e.sidebar.classList.remove("is-open");
    e.scrim.hidden = true;
    e.menu.setAttribute("aria-expanded", "false");
    closeTopbarOverlays();
  };

  const setActiveNav = () => {
    document
      .querySelectorAll(".nav-button")
      .forEach((button) => {
        const active = state.activeCategory
          ? button.dataset.category ===
          state.activeCategory
          : button.hasAttribute("data-home");

        button.classList.toggle(
          "is-active",
          active,
        );
      });
  };

  const showHome = () => {
    if (state.workspaceFullscreen) {
      setWorkspaceFullscreen(false, {
        persist: false,
      });
    }
    state.activeCategory = null;
    applyCategoryTheme("home");
    e.home.hidden = false;
    e.browser.hidden = true;
    e.pageTitle.textContent = "Dashboard";
    if (e.pageSubtitle) {
      e.pageSubtitle.textContent =
        currentCategoryUi("home").subtitle;
    }
    if (e.subcategoryNav) {
      e.subcategoryNav.innerHTML = "";
    }
    if (e.subcategoryCount) {
      e.subcategoryCount.textContent = "";
    }
    e.saveDock.hidden = true;
    if (e.loadStatus) {
      e.loadStatus.textContent = "";
      e.loadStatus.dataset.fullscreenState = "hidden";
    }
    setActiveNav();
    history.replaceState(null, "", "#/");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    closeMenu();
    applyDashboardFilters();
    // Route and visual snapshot are one continuity transaction. R7 saved
    // the hash but could leave the previous category DOM in the snapshot.
    saveUiState();
    saveShellSnapshot();
  };

  const matchesField = (field) => {
    if (
      state.mode !== "all" &&
      field.mode !== state.mode
    ) {
      return false;
    }

    if (!state.query) {
      return true;
    }

    return [
      field.label,
      field.name,
      field.description,
      field.jsonPath,
      field.editorLabel,
      field.subcategory,
      field.categoryLabel,
    ]
      .join(" ")
      .toLowerCase()
      .includes(state.query);
  };

  const applyDashboardFilters = () => {
    if (
      state.activeCategory ||
      !state.schema ||
      !e.grid
    ) {
      return;
    }

    const filtering = Boolean(
      state.query || state.mode !== "all",
    );
    let visible = 0;

    e.grid
      .querySelectorAll("[data-category]")
      .forEach((card) => {
        const categoryId = card.dataset.category;
        const matches = !filtering ||
          state.schema.fields.some(
            (field) =>
              field.category === categoryId &&
              matchesField(field),
          );

        card.hidden = !matches;
        if (matches) {
          visible += 1;
        }
      });

    if (e.dashboardEmpty) {
      e.dashboardEmpty.hidden =
        !filtering || visible !== 0;
    }

    if (e.searchResultCount) {
      e.searchResultCount.hidden = !state.query;
      e.searchResultCount.textContent =
        `${visible} result${visible === 1 ? "" : "s"}`;
    }
  };

  const originalObjectValue = (field) =>
    state.files.get(field.jsonPath)?.content?.[
    field.name
    ];

  const draftObjectValue = (field) =>
    state.drafts.get(field.jsonPath)?.[
    field.name
    ];

  const objectFieldDirty = (field) =>
    !model.equal(
      originalObjectValue(field),
      draftObjectValue(field),
    );

  const pathDirty = (path) =>
    !model.equal(
      state.files.get(path)?.content,
      state.drafts.get(path),
    );

  const objectFieldRow = (field) => {
    const value = getObjectFieldValue(field);

    return `
      <article class="field-row
        ${field.mode === "internal" ? "is-internal" : ""}
        ${objectFieldDirty(field) ? "is-dirty" : ""}
        ${isObjectFieldEditable(field) ? "" : "is-locked"}"
      >
        <div class="field-emoji">${field.emoji}</div>
        <div class="field-title">
          <strong>${escapeHtml(field.label)}</strong>
          <code class="field-key technical-detail">${escapeHtml(field.name)}</code>
          <div class="field-badges">
            <span class="field-badge technical-detail ${field.mode}">
              ${field.mode}
            </span>
            <span class="field-badge technical-detail">${field.type}</span>
            ${objectFieldDirty(field)
        ? '<span class="field-badge">changed</span>'
        : ""
      }
          </div>
        </div>
        <div class="field-description">
          ${escapeHtml(field.description)}
        </div>
        ${objectInputControl(field, value)}
      </article>`;
  };

  const objectGroupBlock = (
    name,
    fields,
    open,
  ) => `
    <details class="field-group" ${open ? "open" : ""}>
      <summary>
        <span class="group-icon">
          ${fields[0]?.editorEmoji || "⚙️"}
        </span>
        <span class="group-copy">
          <strong>${escapeHtml(name)}</strong>
          <span>
            ${escapeHtml(
    [
      ...new Set(
        fields.map(
          (field) => field.editorLabel,
        ),
      ),
    ].join(" · "),
  )}
          </span>
        </span>
        <span class="group-count">
          ${fields.length} fields
        </span>
      </summary>
      <div class="field-list">
        ${fields.map(objectFieldRow).join("")}
      </div>
    </details>`;

  const listItemDirtyIds = (path, fields) =>
    model.changedItemIds(
      state.files.get(path)?.content || [],
      state.drafts.get(path) || [],
      fields,
    );

  const listFieldControl = (
    field,
    item,
    editable,
  ) => {
    const value = item[field.name];

    if (!editable) {
      return `
        <div class="list-readonly-value">
          <span>${escapeHtml(field.label)}</span>
          <pre>${escapeHtml(value)}</pre>
        </div>`;
    }

    const preview =
      field.type === "image" && value
        ? `<img class="list-image-preview" src="${escapeHtml(value)}" alt="Image preview" loading="lazy">`
        : "";

    return `
      <label class="list-field-control">
        <span>${escapeHtml(field.label)}</span>
        <small class="technical-detail">${escapeHtml(field.name)}</small>
        ${fieldInput({
      field,
      value,
      scope: "list",
      itemId: item._cmsResetId,
    })}
        ${preview}
      </label>`;
  };

  const renderListItem = ({
    item,
    index,
    total,
    path,
    fields,
    editable,
    dirtyIds,
  }) => {
    const visibleFields = fields.filter(
      (field) => !field.hidden,
    );
    const dirty = dirtyIds.has(item._cmsResetId);

    return `
      <details
        class="list-item-card ${dirty ? "is-dirty" : ""}"
        ${index === 0 ? "open" : ""}
      >
        <summary>
          <span class="list-item-index">
            ${index + 1}
          </span>
          <span class="list-item-heading">
            <strong>
              ${escapeHtml(model.itemLabel(item, index))}
            </strong>
            <code class="technical-detail">${escapeHtml(item._cmsResetId)}</code>
          </span>
          <span class="list-item-summary-actions">
            ${dirty ? '<span class="field-badge">changed</span>' : ""}
            <span class="field-badge">
              ${visibleFields.length} fields
            </span>
          </span>
        </summary>

        <div class="list-item-body">
          <div class="list-item-toolbar">
            <div class="list-item-identity technical-detail">
              <strong>Stable card identity</strong>
              <code>${escapeHtml(item._cmsResetId)}</code>
            </div>

            <div class="list-item-actions">
              <button
                class="secondary-button compact-button"
                type="button"
                data-list-action="up"
                data-path="${escapeHtml(path)}"
                data-item-id="${escapeHtml(item._cmsResetId)}"
                ${!editable || index === 0 ? "disabled" : ""}
              >
                ↑ Move up
              </button>

              <button
                class="secondary-button compact-button"
                type="button"
                data-list-action="down"
                data-path="${escapeHtml(path)}"
                data-item-id="${escapeHtml(item._cmsResetId)}"
                ${!editable || index === total - 1 ? "disabled" : ""}
              >
                ↓ Move down
              </button>

              <button
                class="danger-button compact-button"
                type="button"
                data-list-action="delete"
                data-path="${escapeHtml(path)}"
                data-item-id="${escapeHtml(item._cmsResetId)}"
                ${!editable ? "disabled" : ""}
              >
                Delete card
              </button>
            </div>
          </div>

          <div class="list-fields-grid">
            ${visibleFields
        .map((field) =>
          listFieldControl(
            field,
            item,
            editable,
          ),
        )
        .join("")}
          </div>
        </div>
      </details>`;
  };

  const listGroupBlock = (
    name,
    fields,
    open,
  ) => {
    const path = fields[0].jsonPath;
    const category = fields[0].category;
    const list = state.drafts.get(path);
    const editable = isListPathEditable(
      path,
      category,
    );

    if (!Array.isArray(list)) {
      return `
        <section class="field-group list-manager">
          <div class="list-manager-error">
            <strong>${escapeHtml(name)}</strong>
            <span>
              Top-level JSON array load nahi hui.
              Editing blocked.
            </span>
          </div>
        </section>`;
    }

    const validation = model.validateList(
      list,
      fieldsForPath(path),
    );
    const dirtyIds = listItemDirtyIds(
      path,
      fieldsForPath(path),
    );

    return `
      <section class="field-group list-manager">
        <div class="list-manager-header">
          <div class="list-manager-title">
            <span class="group-icon">
              ${fields[0]?.editorEmoji || "🗂️"}
            </span>
            <div>
              <strong>${escapeHtml(name)}</strong>
              <span>
                ${escapeHtml(fields[0].editorLabel)}
                · ${list.length} cards
              </span>
            </div>
          </div>

          <div class="list-manager-actions">
            ${pathDirty(path)
        ? '<span class="field-badge">list changed</span>'
        : ""
      }
            <button
              class="primary-button compact-button"
              type="button"
              data-list-action="add"
              data-path="${escapeHtml(path)}"
              ${!editable ? "disabled" : ""}
            >
              ＋ Add new card
            </button>
          </div>
        </div>

        ${!validation.valid
        ? `
              <div class="list-validation-error">
                <strong>Editing blocked: list validation failed</strong>
                <ul>
                  ${validation.errors
          .map(
            (error) =>
              `<li>${escapeHtml(error)}</li>`,
          )
          .join("")}
                </ul>
              </div>`
        : ""
      }

        ${!editable
        ? `
              <div class="list-lock-banner">
                ${!isCategoryEditable(category)
          ? "🔒 Category audit pending"
          : "🔒 Sign in to add, edit, delete or reorder cards"
        }
              </div>`
        : `
              <div class="list-safety-banner">
                🛡️ Existing <code>_cmsResetId</code> values protected.
                Pages CMS stale SHA changes will block save.
              </div>`
      }

        <div class="list-items">
          ${list.length
        ? list
          .map((item, index) =>
            renderListItem({
              item,
              index,
              total: list.length,
              path,
              fields: fieldsForPath(path),
              editable:
                editable && validation.valid,
              dirtyIds,
            }),
          )
          .join("")
        : `
                <div class="empty-state">
                  <strong>No cards</strong>
                  <span>
                    Add new card button se pehla item banayein.
                  </span>
                </div>`
      }
        </div>
      </section>`;
  };

  const setActiveSectionButton = (targetId) => {
    if (!e.subcategoryNav) {
      return;
    }

    e.subcategoryNav
      .querySelectorAll("[data-group-target]")
      .forEach((button) => {
        button.classList.toggle(
          "is-active",
          button.dataset.groupTarget === targetId,
        );
      });
  };

  const syncActiveSection = () => {
    if (
      !state.activeCategory ||
      !e.subcategoryNav ||
      window.innerWidth < 720
    ) {
      return;
    }

    const groups = [
      ...e.fieldGroups.querySelectorAll(".field-group[id]"),
    ];

    if (!groups.length) {
      return;
    }

    const offset = state.workspaceFullscreen
      ? 92
      : 150;
    let active = groups[0];

    groups.forEach((group) => {
      if (group.getBoundingClientRect().top <= offset) {
        active = group;
      }
    });

    setActiveSectionButton(active.id);
  };

  const renderSubcategoryNavigation = (
    category,
    entries,
  ) => {
    if (!e.subcategoryNav) {
      return;
    }

    const groups = [
      ...e.fieldGroups.children,
    ];

    e.subcategoryNav.innerHTML = entries
      .map(([name, fields], index) => {
        const id =
          `group-${category.id}-${slugify(name)}-${index + 1}`;
        const accent = groupAccent(category.id, index);

        return `
          <button
            type="button"
            class="subcategory-button ${index === 0 ? "is-active" : ""}"
            data-group-target="${id}"
            style="--group-accent:${accent}"
          >
            <span class="subcategory-dot"></span>
            <span>${escapeHtml(name)}</span>
            <small>${fields.length}</small>
          </button>`;
      })
      .join("");

    groups.forEach((group, index) => {
      const [name] = entries[index] || ["Section"];
      const id =
        `group-${category.id}-${slugify(name)}-${index + 1}`;
      const accent = groupAccent(category.id, index);

      group.id = id;
      group.dataset.groupIndex = String(index);
      group.style.setProperty("--group-accent", accent);
      group.style.setProperty(
        "--group-accent-soft",
        `${accent}22`,
      );
    });

    if (e.subcategoryCount) {
      e.subcategoryCount.textContent =
        `${entries.length} sections`;
    }

    window.setTimeout(syncActiveSection, 0);
  };

  const renderFieldBrowser = () => {
    const category =
      state.schema.categories.find(
        (item) =>
          item.id === state.activeCategory,
      );

    if (!category) {
      showHome();
      return;
    }

    applyCategoryTheme(category.id);

    const allCategoryFields =
      state.schema.fields.filter(
        (field) =>
          field.category === category.id,
      );

    const filteredFields =
      allCategoryFields.filter(matchesField);

    e.categoryEyebrow.textContent =
      `${category.emoji} ` +
      category.label.toUpperCase();

    e.categoryTitle.textContent =
      category.label;

    e.categoryDescription.textContent =
      `${category.fieldCount} settings · ${category.subcategories.length} sections`;

    e.pageTitle.textContent = category.label;
    if (e.pageSubtitle) {
      e.pageSubtitle.textContent =
        currentCategoryUi(category.id).subtitle;
    }

    const grouped = new Map();

    filteredFields.forEach((field) => {
      if (!grouped.has(field.subcategory)) {
        grouped.set(field.subcategory, []);
      }

      grouped.get(field.subcategory).push(field);
    });

    const groupedEntries = [...grouped.entries()];

    e.fieldGroups.innerHTML =
      groupedEntries
        .map(([name, groupFields], index) => {
          const isListGroup =
            groupFields.some(
              (field) => field.listEditor,
            );

          if (isListGroup) {
            const completeFields =
              allCategoryFields.filter(
                (field) =>
                  field.subcategory === name,
              );

            return listGroupBlock(
              name,
              completeFields,
              index < 2 ||
              Boolean(state.query),
            );
          }

          return objectGroupBlock(
            name,
            groupFields,
            index < 2 ||
            Boolean(state.query),
          );
        })
        .join("");

    renderSubcategoryNavigation(
      category,
      groupedEntries,
    );

    e.empty.hidden =
      filteredFields.length !== 0;

    const status = isCategoryEditable(
      category.id,
    )
      ? (
          state.checkingSession ||
          (state.user && !state.dataReady)
        )
        ? "syncing latest GitHub SHA"
        : state.user
          ? ""
          : "sign in required"
      : "read-only until triple audits pass";

    const resultLabel =
      `${filteredFields.length} result` +
      `${filteredFields.length === 1 ? "" : "s"}`;

    e.loadStatus.textContent = state.query
      ? resultLabel
      : status;
    e.loadStatus.dataset.fullscreenState =
      state.query
        ? "results"
        : (
          isCategoryEditable(category.id) &&
          state.user &&
          state.dataReady &&
          !state.checkingSession
        )
          ? "hidden"
          : "status";
    e.loadStatus.dataset.resultLabel =
      resultLabel;

    if (e.searchResultCount) {
      e.searchResultCount.hidden = !state.query;
      e.searchResultCount.textContent = resultLabel;
    }

    e.home.hidden = true;
    e.browser.hidden = false;

    setActiveNav();
    syncWorkspaceFullscreenUI();
    updateAuthUI();
    updateDirtyUI();
    bindDynamicInputs();

    window.setTimeout(
      saveShellSnapshot,
      0,
    );
  };

  /* ADMIN1_V8_CATEGORY_SWITCH_STABILITY_R10
   * Category navigation must not inherit the global smooth-scroll rule. The
   * temporary inline override is restored in the same task, so section-level
   * smooth scrolling keeps its existing behaviour.
   */
  const resetCategoryViewport = () => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;

    root.style.scrollBehavior = "auto";
    root.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);

    if (previous) {
      root.style.scrollBehavior = previous;
    } else {
      root.style.removeProperty("scroll-behavior");
    }
  };

  const openCategory = (id) => {
    state.activeCategory = id;

    resetCategoryViewport();

    history.replaceState(
      null,
      "",
      `#/category/${id}`,
    );

    renderFieldBrowser();
    resetCategoryViewport();
    closeMenu();
    scheduleUiStateSave();
  };

  const parseInputValue = (field, input) => {
    if (field.type === "number") {
      if (input.value === "") {
        return null;
      }

      const numeric = Number(input.value);

      if (!Number.isFinite(numeric)) {
        throw new Error(
          `${field.label}: valid number required.`,
        );
      }

      return numeric;
    }

    return input.value;
  };

  const bindDynamicInputs = () => {
    e.fieldGroups
      .querySelectorAll("[data-field-id]")
      .forEach((input) => {
        const field =
          state.schema.fields.find(
            (item) =>
              item.id === input.dataset.fieldId,
          );

        if (!field) {
          return;
        }

        if (field.type === "select") {
          if (
            input.dataset.inputScope === "object"
          ) {
            input.value =
              getObjectFieldValue(field) ?? "";
          } else {
            const list = state.drafts.get(
              field.jsonPath,
            );
            const item = list?.find(
              (candidate) =>
                candidate._cmsResetId ===
                input.dataset.itemId,
            );
            input.value =
              item?.[field.name] ?? "";
          }
        }

        input.addEventListener(
          "input",
          () => {
            try {
              const next = parseInputValue(
                field,
                input,
              );

              if (
                input.dataset.inputScope ===
                "object"
              ) {
                const draft =
                  state.drafts.get(
                    field.jsonPath,
                  );

                if (!model.isPlainObject(draft)) {
                  return;
                }

                draft[field.name] = next;

                input
                  .closest(".field-row")
                  ?.classList.toggle(
                    "is-dirty",
                    objectFieldDirty(field),
                  );
              } else {
                const list =
                  state.drafts.get(
                    field.jsonPath,
                  );

                state.drafts.set(
                  field.jsonPath,
                  model.setListField(
                    list,
                    input.dataset.itemId,
                    field.name,
                    next,
                  ),
                );

                input
                  .closest(".list-item-card")
                  ?.classList.add("is-dirty");

                if (
                  [
                    "title",
                    "question",
                    "name",
                    "label",
                  ].includes(field.name)
                ) {
                  const heading =
                    input
                      .closest(
                        ".list-item-card",
                      )
                      ?.querySelector(
                        ".list-item-heading strong",
                      );

                  if (heading) {
                    heading.textContent =
                      next || "Untitled item";
                  }
                }
              }

              updateDirtyUI();
            } catch (error) {
              toast(error.message, "error");
            }
          },
        );
      });
  };

  const listAction = (button) => {
    const action = button.dataset.listAction;
    const path = button.dataset.path;
    const itemId = button.dataset.itemId;
    const fields = fieldsForPath(path);
    const draft = state.drafts.get(path);

    if (!listPaths.has(path)) {
      toast(
        "List action blocked: path is not audited.",
        "error",
      );
      return;
    }

    if (!Array.isArray(draft)) {
      toast(
        "List action blocked: draft is not an array.",
        "error",
      );
      return;
    }

    if (action === "add") {
      const item = model.createListItem(fields);
      state.drafts.set(path, [
        ...model.clone(draft),
        item,
      ]);
      renderFieldBrowser();
      toast(
        "New card added to draft. Save se pehle details fill karein.",
        "success",
      );
      return;
    }

    if (action === "delete") {
      const item = draft.find(
        (candidate) =>
          candidate._cmsResetId === itemId,
      );

      if (!item) {
        toast("Card not found.", "error");
        return;
      }

      if (
        !window.confirm(
          `"${model.itemLabel(item)}" ko draft se delete karna hai?`,
        )
      ) {
        return;
      }

      state.drafts.set(
        path,
        model.deleteItem(draft, itemId),
      );
      renderFieldBrowser();
      toast("Card deleted from draft.");
      return;
    }

    if (action === "up" || action === "down") {
      state.drafts.set(
        path,
        model.moveItem(
          draft,
          itemId,
          action,
        ),
      );
      renderFieldBrowser();
      toast(
        `Card moved ${action}.`,
        "success",
      );
    }
  };

  const dirtyPaths = () =>
    [...editablePaths].filter(pathDirty);

  const validateDraftPath = (path) => {
    const draft = state.drafts.get(path);

    if (listPaths.has(path)) {
      const validation = model.validateList(
        draft,
        fieldsForPath(path),
      );

      if (!validation.valid) {
        throw new Error(
          `${path}: ${validation.errors.join(" ")}`,
        );
      }

      return;
    }

    if (
      objectPaths.has(path) &&
      !model.isPlainObject(draft)
    ) {
      throw new Error(
        `${path}: top-level JSON object required.`,
      );
    }
  };

  const allReviewChanges = () => {
    const changes = [];

    dirtyPaths().forEach((path) => {
      const before =
        state.files.get(path)?.content;
      const after = state.drafts.get(path);
      const fields = fieldsForPath(path);

      validateDraftPath(path);

      if (listPaths.has(path)) {
        changes.push({
          path,
          kind: "list",
          diff: model.listDiff(
            before,
            after,
            fields,
          ),
        });
      } else {
        changes.push({
          path,
          kind: "object",
          diff: model.objectDiff(
            before,
            after,
            fields,
          ),
        });
      }
    });

    return changes;
  };

  const changeCount = (change) => {
    if (change.kind === "object") {
      return change.diff.length;
    }

    return change.diff.count;
  };

  const updateDirtyUI = () => {
    const paths = dirtyPaths();
    let count = 0;

    try {
      count = allReviewChanges().reduce(
        (total, change) =>
          total + changeCount(change),
        0,
      );
    } catch {
      count = paths.length;
    }

    e.saveDock.classList.toggle(
      "has-pending",
      count > 0,
    );
    document.body.classList.toggle(
      "has-pending-changes",
      count > 0,
    );

    e.dirtyTitle.textContent = count
      ? `${count} pending change${count === 1 ? "" : "s"}`
      : "No pending changes";

    e.dirtyDetail.textContent = paths.length
      ? `${paths.length} GitHub file(s) affected · atomic save`
      : "Latest GitHub SHA protected.";

    e.reviewChanges.disabled =
      paths.length === 0 || state.saving;

    e.discardDraft.disabled =
      paths.length === 0 || state.saving;
  };

  const discardDraft = () => {
    if (
      hasDirtyDraft() &&
      !window.confirm(
        "Saare unsaved Admin1 drafts discard karne hain?",
      )
    ) {
      return;
    }

    state.files.forEach((file, path) => {
      state.drafts.set(
        path,
        model.clone(file.content),
      );
    });

    renderFieldBrowser();
    toast("All drafts discarded.");
  };

  const renderObjectReview = (
    path,
    diff,
  ) => `
    <section class="diff-file">
      <h4>
        <span class="diff-file-path">${escapeHtml(path)}</span>
        <span class="diff-count">
          ${diff.length} field change${diff.length === 1 ? "" : "s"}
        </span>
      </h4>
      ${diff
      .map(
        (item) => `
            <div class="diff-row">
              <div class="diff-field">
                <span class="diff-label">Field</span>
                <code>${escapeHtml(item.field)}</code>
              </div>
              <div class="diff-value diff-old">
                <span class="diff-label">Before</span>
                <span class="diff-content">${escapeHtml(item.before)}</span>
              </div>
              <div class="diff-value diff-new">
                <span class="diff-label">After</span>
                <span class="diff-content">${escapeHtml(item.after)}</span>
              </div>
            </div>`,
      )
      .join("")}
    </section>`;

  const renderListReview = (
    path,
    diff,
  ) => {
    const rows = [];

    diff.added.forEach((item) => {
      rows.push(`
        <div class="diff-row">
          <div class="diff-field">
            <span class="diff-label">Added card</span>
            <code>${escapeHtml(item.label)}</code>
          </div>
          <div class="diff-value diff-old">
            <span class="diff-label">Before</span>
            <span class="diff-content">Not present</span>
          </div>
          <div class="diff-value diff-new">
            <span class="diff-label">After</span>
            <span class="diff-content">Position ${item.index + 1}<br><small>ID: ${escapeHtml(item.id)}</small></span>
          </div>
        </div>`);
    });

    diff.removed.forEach((item) => {
      rows.push(`
        <div class="diff-row">
          <div class="diff-field">
            <span class="diff-label">Removed card</span>
            <code>${escapeHtml(item.label)}</code>
          </div>
          <div class="diff-value diff-old">
            <span class="diff-label">Before</span>
            <span class="diff-content">Position ${item.index + 1}<br><small>ID: ${escapeHtml(item.id)}</small></span>
          </div>
          <div class="diff-value diff-new">
            <span class="diff-label">After</span>
            <span class="diff-content">Removed</span>
          </div>
        </div>`);
    });

    diff.moved.forEach((item) => {
      rows.push(`
        <div class="diff-row">
          <div class="diff-field">
            <span class="diff-label">Moved card</span>
            <code>${escapeHtml(item.label)}</code>
          </div>
          <div class="diff-value diff-old">
            <span class="diff-label">Before</span>
            <span class="diff-content">Position ${item.beforeIndex + 1}</span>
          </div>
          <div class="diff-value diff-new">
            <span class="diff-label">After</span>
            <span class="diff-content">Position ${item.afterIndex + 1}</span>
          </div>
        </div>`);
    });

    diff.changed.forEach((item) => {
      rows.push(`
        <div class="diff-row">
          <div class="diff-field">
            <span class="diff-label">Card field</span>
            <code>${escapeHtml(item.label)}</code>
            <span class="diff-field-path">${escapeHtml(item.field)}</span>
          </div>
          <div class="diff-value diff-old">
            <span class="diff-label">Before</span>
            <span class="diff-content">${escapeHtml(item.before)}</span>
          </div>
          <div class="diff-value diff-new">
            <span class="diff-label">After</span>
            <span class="diff-content">${escapeHtml(item.after)}</span>
          </div>
        </div>`);
    });

    return `
      <section class="diff-file">
        <h4>
          <span class="diff-file-path">${escapeHtml(path)}</span>
          <span class="diff-count">
            ${diff.count} card/list change${diff.count === 1 ? "" : "s"}
          </span>
        </h4>
        ${rows.join("")}
      </section>`;
  };

  const openReview = () => {
    let changes;

    try {
      changes = allReviewChanges();
    } catch (error) {
      toast(
        `Review blocked: ${error.message}`,
        "error",
      );
      return;
    }

    if (!changes.length) {
      return;
    }

    e.reviewBody.innerHTML = changes
      .map((change) =>
        change.kind === "object"
          ? renderObjectReview(
            change.path,
            change.diff,
          )
          : renderListReview(
            change.path,
            change.diff,
          ),
      )
      .join("");

    e.reviewDialog.showModal();
  };

  const saveAll = async () => {
    if (state.saving) {
      return;
    }

    let reviewChanges;

    try {
      reviewChanges = allReviewChanges();
    } catch (error) {
      toast(
        `Save blocked: ${error.message}`,
        "error",
      );
      return;
    }

    if (!reviewChanges.length) {
      return;
    }

    state.saving = true;
    updateDirtyUI();
    e.confirmSave.disabled = true;

    try {
      const paths = reviewChanges.map(
        (change) => change.path,
      );

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
          message:
            `Admin1: update ${paths.length} ` +
            `audited CMS file${paths.length === 1 ? "" : "s"}`,
        }),
      });

      result.files.forEach((saved) => {
        const draft =
          state.drafts.get(saved.path);

        state.files.set(saved.path, {
          sha: saved.sha,
          content: model.clone(draft),
        });
      });

      saveBootstrapCache();

      e.reviewDialog.close();

      toast(
        `Atomic GitHub save complete: ` +
        `${result.commit.slice(0, 7)}. ` +
        `Pages CMS refresh par same values milengi.`,
        "success",
      );

      renderFieldBrowser();
    } catch (error) {
      if (error.status === 409) {
        toast(
          "Save blocked: Pages CMS, Sveltia, reset workflow ya another editor ne file/branch change ki. Refresh karke latest values load karein.",
          "error",
        );
      } else {
        toast(
          `Save failed: ${error.message}`,
          "error",
        );
      }
    } finally {
      state.saving = false;
      e.confirmSave.disabled = false;
      updateDirtyUI();
    }
  };

  const loadStaticFilesForReadOnly = async () => {
    const paths = [
      ...new Set(
        state.schema.fields.map(
          (field) => field.jsonPath,
        ),
      ),
    ];

    const results = await Promise.all(
      paths.map(async (path) => {
        try {
          const response = await fetch(
            `../${path}`,
            { cache: "no-store" },
          );

          if (!response.ok) {
            throw new Error();
          }

          return [path, await response.json()];
        } catch {
          return [path, null];
        }
      }),
    );

    results.forEach(([path, content]) => {
      if (
        content &&
        !state.files.has(path)
      ) {
        state.files.set(path, {
          sha: "",
          content,
        });

        state.drafts.set(
          path,
          model.clone(content),
        );
      }
    });
  };

  const applyHash = () => {
    const match = location.hash.match(
      /^#\/category\/([a-z0-9-]+)$/,
    );

    if (
      match &&
      state.schema.categories.some(
        (category) =>
          category.id === match[1],
      )
    ) {
      openCategory(match[1]);
    } else {
      showHome();
    }
  };

  const closeTopbarOverlays = (
    except = "",
  ) => {
    if (except !== "search") {
      e.topbarControls?.classList.remove("is-open");
      e.searchToggle?.setAttribute(
        "aria-expanded",
        "false",
      );
    }

    if (except !== "utilities") {
      e.topbarActions?.classList.remove("is-open");
      e.utilityToggle?.setAttribute(
        "aria-expanded",
        "false",
      );
    }

    if (except !== "notifications") {
      if (e.notificationPanel) {
        e.notificationPanel.hidden = true;
      }
      e.notificationToggle?.setAttribute(
        "aria-expanded",
        "false",
      );
    }
  };

  const bindEvents = () => {
    if (eventsBound) {
      return;
    }

    eventsBound = true;

    document.addEventListener(
      "click",
      (event) => {
        const categoryButton =
          event.target.closest(
            "[data-category]",
          );

        if (categoryButton) {
          openCategory(
            categoryButton.dataset.category,
          );
        }

        if (
          event.target.closest("[data-home]")
        ) {
          showHome();
        }

        const sectionButton =
          event.target.closest(
            "[data-group-target]",
          );

        if (sectionButton) {
          const target = document.getElementById(
            sectionButton.dataset.groupTarget,
          );

          if (target) {
            if (target.tagName === "DETAILS") {
              target.open = true;
            }

            setActiveSectionButton(target.id);
            target.scrollIntoView({
              behavior: window.matchMedia(
                "(prefers-reduced-motion: reduce)",
              ).matches
                ? "auto"
                : "smooth",
              block: "start",
            });

            if (
              state.workspaceFullscreen &&
              (
                !state.sectionsPinned ||
                window.matchMedia("(max-width: 860px)").matches
              )
            ) {
              scheduleSectionsPanelClose();
            }
          }
        }

        const listButton =
          event.target.closest(
            "[data-list-action]",
          );

        if (listButton) {
          listAction(listButton);
        }
      },
    );

    e.login.addEventListener("click", login);
    e.logout.addEventListener(
      "click",
      logout,
    );
    e.refreshSession.addEventListener(
      "click",
      refreshSession,
    );

    e.fullscreenToggle?.addEventListener(
      "click",
      () => {
        setWorkspaceFullscreen(
          !state.workspaceFullscreen,
        );
      },
    );

    e.sectionsPin?.addEventListener(
      "click",
      () => {
        setSectionsPinned(
          !state.sectionsPinned,
        );
      },
    );

    e.sectionsReveal?.addEventListener(
      "click",
      (event) => {
        if (suppressSectionsLauncherClick) {
          suppressSectionsLauncherClick = false;
          event.preventDefault();
          return;
        }

        const pointerClick =
          event.detail > 0 &&
          window.matchMedia("(hover: hover)").matches;
        setSectionsPanelOpen(
          pointerClick
            ? true
            : !state.sectionsPanelOpen,
        );
      },
    );

    e.sectionsReveal?.addEventListener(
      "pointerenter",
      () => {
        if (window.matchMedia("(hover: hover)").matches) {
          scheduleSectionsPanelOpen();
        }
      },
    );

    e.sectionsReveal?.addEventListener(
      "pointerleave",
      () => {
        window.clearTimeout(sectionsOpenTimer);
        if (state.sectionsPanelOpen) {
          scheduleSectionsPanelClose();
        }
      },
    );

    e.sectionsReveal?.addEventListener(
      "pointerdown",
      (event) => {
        if (
          !canDragSectionsLauncher() ||
          (event.pointerType === "mouse" && event.button !== 0)
        ) {
          return;
        }

        window.clearTimeout(sectionsOpenTimer);
        sectionsLauncherDrag = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
        };
        e.sectionsReveal.setPointerCapture(
          event.pointerId,
        );
      },
    );

    e.sectionsReveal?.addEventListener(
      "pointermove",
      (event) => {
        if (
          !sectionsLauncherDrag ||
          event.pointerId !== sectionsLauncherDrag.pointerId
        ) {
          return;
        }

        const distance = Math.hypot(
          event.clientX - sectionsLauncherDrag.startX,
          event.clientY - sectionsLauncherDrag.startY,
        );

        if (!sectionsLauncherDrag.moved && distance < 6) {
          return;
        }

        sectionsLauncherDrag.moved = true;
        e.sectionsReveal.classList.add("is-dragging");
        setSectionsPanelOpen(false);
        updateSectionsLauncherPlacement(
          event.clientX,
          event.clientY,
        );
        event.preventDefault();
      },
    );

    e.sectionsReveal?.addEventListener(
      "pointerup",
      (event) => finishSectionsLauncherDrag(event),
    );

    e.sectionsReveal?.addEventListener(
      "pointercancel",
      (event) => finishSectionsLauncherDrag(
        event,
        { cancelled: true },
      ),
    );

    e.subcategoryRail?.addEventListener(
      "pointerenter",
      () => window.clearTimeout(sectionsCloseTimer),
    );

    e.subcategoryRail?.addEventListener(
      "pointerleave",
      scheduleSectionsPanelClose,
    );

    e.fullscreenTopReveal?.addEventListener(
      "pointerenter",
      () => {
        scheduleTopbarReveal();
      },
    );

    e.fullscreenTopReveal?.addEventListener(
      "pointerleave",
      () => {
        if (!state.topbarRevealed) {
          window.clearTimeout(topbarRevealTimer);
        }
      },
    );

    e.topbar?.addEventListener(
      "pointerenter",
      () => {
        if (state.workspaceFullscreen) {
          window.clearTimeout(topbarRevealTimer);
          window.clearTimeout(topbarCloseTimer);
        }
      },
    );

    e.topbar?.addEventListener(
      "pointerleave",
      () => {
        if (state.workspaceFullscreen) {
          scheduleTopbarHide();
        }
      },
    );

    document.addEventListener(
      "pointermove",
      (event) => {
        if (
          !state.workspaceFullscreen ||
          !state.topbarRevealed ||
          !e.topbar
        ) {
          return;
        }

        const bottom =
          e.topbar.getBoundingClientRect().bottom;
        if (event.clientY > bottom + 18) {
          scheduleTopbarHide();
        } else {
          window.clearTimeout(topbarCloseTimer);
        }
      },
      { passive: true },
    );

    e.searchToggle?.addEventListener(
      "click",
      () => {
        const open =
          !e.topbarControls.classList.contains(
            "is-open",
          );
        closeTopbarOverlays(
          open ? "search" : "",
        );
        e.topbarControls.classList.toggle(
          "is-open",
          open,
        );
        e.searchToggle.setAttribute(
          "aria-expanded",
          String(open),
        );
        if (open) {
          window.setTimeout(
            () => e.search?.focus(),
            0,
          );
        }
      },
    );

    e.utilityToggle?.addEventListener(
      "click",
      () => {
        const open =
          !e.topbarActions.classList.contains(
            "is-open",
          );
        closeTopbarOverlays(
          open ? "utilities" : "",
        );
        e.topbarActions.classList.toggle(
          "is-open",
          open,
        );
        e.utilityToggle.setAttribute(
          "aria-expanded",
          String(open),
        );
      },
    );

    e.notificationToggle?.addEventListener(
      "click",
      () => {
        const open = e.notificationPanel.hidden;
        closeTopbarOverlays(
          open ? "notifications" : "",
        );
        e.notificationPanel.hidden = !open;
        e.notificationToggle.setAttribute(
          "aria-expanded",
          String(open),
        );
        if (open) {
          e.notificationToggle.classList.remove(
            "has-unread",
          );
        }
      },
    );

    e.notificationClose?.addEventListener(
      "click",
      () => closeTopbarOverlays(),
    );

    document.addEventListener(
      "click",
      (event) => {
        if (
          event.target.closest(
            [
              "#topbar-controls",
              "#topbar-search-toggle",
              "#topbar-actions",
              "#utility-menu-toggle",
              "#notification-panel",
              "#notification-toggle",
            ].join(","),
          )
        ) {
          return;
        }

        closeTopbarOverlays();

        if (
          state.workspaceFullscreen &&
          (
            !state.sectionsPinned ||
            window.matchMedia("(max-width: 860px)").matches
          ) &&
          !event.target.closest(
            "#sections-reveal, .subcategory-rail",
          )
        ) {
          setSectionsPanelOpen(false);
        }
      },
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          if (
            state.workspaceFullscreen &&
            !e.reviewDialog?.open
          ) {
            setWorkspaceFullscreen(false);
            return;
          }
          closeTopbarOverlays();
        }
      },
    );
    e.backHome.addEventListener(
      "click",
      showHome,
    );
    e.discardDraft.addEventListener(
      "click",
      discardDraft,
    );
    e.reviewChanges.addEventListener(
      "click",
      openReview,
    );
    e.closeReview.addEventListener(
      "click",
      () => e.reviewDialog.close(),
    );
    e.cancelReview.addEventListener(
      "click",
      () => e.reviewDialog.close(),
    );
    e.confirmSave.addEventListener(
      "click",
      saveAll,
    );

    e.search.addEventListener(
      "input",
      (event) => {
        state.query =
          event.target.value
            .trim()
            .toLowerCase();

        if (state.activeCategory) {
          renderFieldBrowser();
        } else {
          applyDashboardFilters();
        }
      },
    );

    document
      .querySelector(".segmented")
      .addEventListener(
        "click",
        (event) => {
          const button =
            event.target.closest(
              "[data-mode]",
            );

          if (!button) {
            return;
          }

          state.mode =
            button.dataset.mode;

          applyModeButtonState();

          if (state.activeCategory) {
            renderFieldBrowser();
          } else {
            applyDashboardFilters();
          }

          scheduleUiStateSave();
        },
      );

    e.themeToggle.addEventListener(
      "click",
      () => {
        const next =
          document.documentElement
            .dataset.theme === "dark"
            ? "light"
            : "dark";

        document.documentElement.dataset.theme =
          next;

        e.themeToggle.textContent =
          next === "dark" ? "☀️" : "🌙";

        scheduleUiStateSave();
      },
    );

    e.menu.addEventListener(
      "click",
      () => {
        const open =
          !e.sidebar.classList.contains(
            "is-open",
          );

        e.sidebar.classList.toggle(
          "is-open",
          open,
        );

        e.scrim.hidden = !open;

        e.menu.setAttribute(
          "aria-expanded",
          String(open),
        );
      },
    );

    e.scrim.addEventListener(
      "click",
      closeMenu,
    );

    window.addEventListener(
      "hashchange",
      () => {
        applyHash();
        scheduleUiStateSave();
      },
    );

    window.addEventListener(
      "scroll",
      scheduleUiStateSave,
      { passive: true },
    );

    window.addEventListener(
      "scroll",
      syncActiveSection,
      { passive: true },
    );

    window.addEventListener(
      "pagehide",
      saveUiState,
    );

    window.addEventListener(
      "resize",
      () => {
        window.clearTimeout(sectionsOpenTimer);
        if (state.sectionsPanelOpen) {
          state.sectionsPanelOpen = false;
        }
        syncWorkspaceFullscreenUI();
      },
      { passive: true },
    );

    window.addEventListener(
      "beforeunload",
      (event) => {
        if (!hasDirtyDraft()) {
          return;
        }

        event.preventDefault();
        event.returnValue = "";
      },
    );
  };

  const fetchSchema = async () => {
    const response = await fetch(
      "./schema.generated.json",
      {
        cache: "no-store",
        credentials: "same-origin",
      },
    );

    if (!response.ok) {
      throw new Error(
        `Schema HTTP ${response.status}`,
      );
    }

    return response.json();
  };

  const renderInitialInterface = async ({
    fromCache,
  }) => {
    /*
     * When the server-authenticated shell was restored before app.js,
     * hydrate that exact DOM instead of rebuilding the sidebar and home
     * cards. This prevents the one-frame left-panel dim/jump on refresh.
     */
    if (fromCache && preboot.restored) {
      const match = location.hash.match(
        /^#\/category\/([a-z0-9-]+)$/,
      );

      state.activeCategory =
        match &&
        state.schema.categories.some(
          (category) =>
            category.id === match[1],
        )
          ? match[1]
          : null;

      applyCategoryTheme(
        state.activeCategory || "home",
      );
      bindEvents();
      applyStoredUiPreferences();
      applyModeButtonState();
      updateAuthUI();
      updateDirtyUI();
      bindDynamicInputs();
      finishBoot();
      restoreScrollPosition();
      return;
    }

    applyCategoryTheme("home");
    renderMetrics();
    renderCategories();
    bindEvents();
    applyStoredUiPreferences();
    applyModeButtonState();

    if (!fromCache) {
      await loadStaticFilesForReadOnly();
    }

    applyHash();
    updateAuthUI();
    finishBoot();
    restoreScrollPosition();
  };

  const refreshSchemaInBackground = async () => {
    try {
      const latestSchema = await fetchSchema();

      if (
        !latestSchema ||
        !Array.isArray(latestSchema.fields)
      ) {
        return;
      }

      const changed =
        JSON.stringify(latestSchema.manifest) !==
        JSON.stringify(state.schema?.manifest);

      state.schema = latestSchema;

      if (changed) {
        renderMetrics();
        renderCategories();
        applyHash();
      }
    } catch {
      // Cached schema remains safe for read-only first paint.
    }
  };

  const init = async () => {
    try {
      await captureLoginResult();
      applyStoredUiPreferences();

      if (
        serverAuth === "anonymous" &&
        !state.authJustCaptured
      ) {
        clearBootstrapCache();
        state.checkingSession = false;
        state.dataReady = false;
        state.user = null;
        state.schema = await fetchSchema();

        renderMetrics();
        renderCategories();
        bindEvents();
        applyStoredUiPreferences();
        applyModeButtonState();
        applyHash();
        updateAuthUI();
        finishBoot();
        return;
      }

      const restored = restoreBootstrapCache();

      if (restored) {
        await renderInitialInterface({
          fromCache: true,
        });

        saveShellSnapshot();
        void refreshSchemaInBackground();
        void refreshSession();
        return;
      }

      state.schema = await fetchSchema();

      await renderInitialInterface({
        fromCache: false,
      });

      await refreshSession();
    } catch (error) {
      finishBoot();

      document.getElementById(
        "main-content",
      ).innerHTML = `
        <section class="empty-state">
          <strong>Admin1 could not load</strong>
          <span>${escapeHtml(error.message)}</span>
        </section>`;
    }
  };

  init();
})();
