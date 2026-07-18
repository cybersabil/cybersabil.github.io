(() => {
  "use strict";

  const config = window.CYBERSABIL_ADMIN1_CONFIG || {};
  const model = window.CyberSabilDataModel;

  if (!model) {
    throw new Error("CyberSabil data model could not load.");
  }

  const editableCategories = new Set(
    config.editableCategories ||
      [config.editableCategory].filter(Boolean),
  );

  const objectPaths = new Set([
    "data/site-settings.json",
    "data/gateway.json",
    "data/gateway-appearance.json",
    "data/site.json",
    "data/sections.json",
    "data/design.json",
  ]);

  const listPaths = new Set([
    "data/tools.json",
    "data/downloads.json",
    "data/projects.json",
    "data/skills.json",
    "data/docs.json",
    "data/faq.json",
  ]);

  const editablePaths = new Set([
    ...objectPaths,
    ...listPaths,
  ]);

  const state = {
    schema: null,
    files: new Map(),
    drafts: new Map(),
    session:
      sessionStorage.getItem(
        "cybersabil_admin1_session",
      ) || "",
    user: null,
    activeCategory: null,
    mode: "all",
    query: "",
    saving: false,
  };

  const e = {
    nav: document.getElementById("category-nav"),
    grid: document.getElementById("category-grid"),
    metrics: document.getElementById("metrics-grid"),
    categoryTotal:
      document.getElementById("category-total"),
    home: document.getElementById("dashboard-home"),
    browser: document.getElementById("field-browser"),
    fieldGroups:
      document.getElementById("field-groups"),
    empty: document.getElementById("empty-state"),
    search: document.getElementById("search-input"),
    pageTitle: document.getElementById("page-title"),
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
    scrim: document.getElementById("scrim"),
    login: document.getElementById("login-button"),
    logout: document.getElementById("logout-button"),
    refreshSession:
      document.getElementById("refresh-session"),
    authTitle: document.getElementById("auth-title"),
    authDetail: document.getElementById("auth-detail"),
    connectionBadge:
      document.getElementById("connection-badge"),
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

  const toast = (message, type = "") => {
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    e.toastStack.appendChild(node);

    setTimeout(() => {
      node.remove();
    }, 5200);
  };

  const api = async (path, options = {}) => {
    if (
      !config.apiBase ||
      config.apiBase.includes("__ADMIN1_API_BASE__")
    ) {
      throw new Error(
        "Admin1 API URL is not configured.",
      );
    }

    const headers = new Headers(
      options.headers || {},
    );

    if (state.session) {
      headers.set(
        "Authorization",
        `Bearer ${state.session}`,
      );
    }

    if (
      options.body &&
      !headers.has("Content-Type")
    ) {
      headers.set(
        "Content-Type",
        "application/json",
      );
    }

    const response = await fetch(
      `${config.apiBase}${path}`,
      {
        ...options,
        headers,
        cache: "no-store",
      },
    );

    const payload = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
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

  const captureAuthFragment = () => {
    const match = location.hash.match(
      /^#auth=([^&]+)/,
    );

    if (!match) {
      return;
    }

    state.session = decodeURIComponent(match[1]);

    sessionStorage.setItem(
      "cybersabil_admin1_session",
      state.session,
    );

    history.replaceState(
      null,
      "",
      `${location.pathname}${location.search}#/`,
    );
  };

  const login = () => {
    const returnTo =
      `${location.origin}${location.pathname}`;

    location.href =
      `${config.apiBase}/auth?return_to=` +
      encodeURIComponent(returnTo);
  };

  const logout = () => {
    if (
      hasDirtyDraft() &&
      !window.confirm(
        "Unsaved draft discard karke sign out karna hai?",
      )
    ) {
      return;
    }

    sessionStorage.removeItem(
      "cybersabil_admin1_session",
    );

    state.session = "";
    state.user = null;
    state.files.clear();
    state.drafts.clear();

    updateAuthUI();
    renderFieldBrowser();
    toast("Signed out.");
  };

  const isCategoryEditable = (categoryId) =>
    editableCategories.has(categoryId);

  const categoryEditableStatus = (category) => {
    if (!isCategoryEditable(category.id)) {
      return "Read-only";
    }

    return state.user
      ? "Editable"
      : "Editable after login";
  };

  const updateAuthUI = () => {
    const signedIn = Boolean(state.user);

    e.login.hidden = signedIn;
    e.logout.hidden = !signedIn;

    e.authTitle.textContent = signedIn
      ? `Signed in as ${state.user.login}`
      : "GitHub login required";

    e.authDetail.textContent = signedIn
      ? `${config.repository} · ${config.branch} · Pages CMS-safe stale SHA protection active`
      : "Sign in karke latest GitHub values aur SHA load karein.";

    e.connectionBadge.textContent = signedIn
      ? "🟢 GitHub connected"
      : "🔒 Sign in required";

    e.saveDock.hidden = !(
      signedIn &&
      isCategoryEditable(state.activeCategory)
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

    if (!state.session) {
      updateAuthUI();
      return;
    }

    try {
      const result = await api("/api/session");
      state.user = result.user;
      await loadEditableFiles();
      updateAuthUI();
      toast(
        "Latest GitHub data and file SHAs loaded.",
        "success",
      );
    } catch (error) {
      if (error.status === 401) {
        logout();
      } else {
        toast(error.message, "error");
      }
    }
  };

  const loadEditableFiles = async () => {
    const paths = [...editablePaths];
    const results = [];

    for (const path of paths) {
      const result = await api(
        `/api/file?path=${encodeURIComponent(path)}`,
      );
      results.push([path, result]);
    }

    let identityRepairs = 0;

    results.forEach(([path, result]) => {
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

    if (state.activeCategory) {
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
    ].includes(field.type);

  const isListPathEditable = (path, category) =>
    Boolean(state.user) &&
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
      control =
        `<input type="number" ${common} ` +
        `${
          field.min !== null &&
          field.min !== undefined
            ? `min="${field.min}"`
            : ""
        } ` +
        `${
          field.max !== null &&
          field.max !== undefined
            ? `max="${field.max}"`
            : ""
        } ` +
        `${
          field.step !== null &&
          field.step !== undefined
            ? `step="${field.step}"`
            : 'step="any"'
        } ` +
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
      } else if (!state.user) {
        note =
          '<div class="lock-note">🔒 Sign in to edit</div>';
      }

      return `
        <div class="field-value">
          <div class="value-label">
            <span>Current value</span>
            <span>${escapeHtml(field.jsonPath)}</span>
          </div>
          <div class="value-text">${escapeHtml(value)}</div>
          ${note}
        </div>`;
    }

    return `
      <label class="editable-control">
        <span class="value-label">
          <span>Draft value</span>
          <span>${escapeHtml(field.jsonPath)}</span>
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
    const manifest = state.schema.manifest;

    e.metrics.innerHTML = [
      metric(
        "Total schema",
        manifest.fields,
        `${manifest.editors} JSON editors`,
      ),
      metric(
        "Audited editable",
        257,
        "Gateway 178 + Website 79",
      ),
      metric(
        "Read-only pending",
        manifest.fields - 257,
        "Portfolio, SEO, Navigation, System",
      ),
      metric(
        "Collision protection",
        "SHA",
        "Pages CMS stale save blocked",
      ),
    ].join("");
  };

  const categoryCard = (category) => `
    <button
      class="category-card"
      type="button"
      data-category="${category.id}"
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

  const navButton = (category) => `
    <button
      class="nav-button"
      type="button"
      data-category="${category.id}"
    >
      <span class="nav-emoji">${category.emoji}</span>
      <span>${escapeHtml(category.label)}</span>
      <small>${category.fieldCount}</small>
    </button>`;

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
      >
        <span class="nav-emoji">⌂</span>
        <span>Dashboard Home</span>
        <small>${state.schema.manifest.fields}</small>
      </button>
      ${categories.map(navButton).join("")}`;

    e.categoryTotal.textContent =
      `${categories.length} categories · ` +
      `${state.schema.manifest.fields} fields`;
  };

  const closeMenu = () => {
    e.sidebar.classList.remove("is-open");
    e.scrim.hidden = true;
    e.menu.setAttribute("aria-expanded", "false");
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
    state.activeCategory = null;
    e.home.hidden = false;
    e.browser.hidden = true;
    e.pageTitle.textContent = "Dashboard overview";
    e.saveDock.hidden = true;
    setActiveNav();
    history.replaceState(null, "", "#/");
    closeMenu();
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
          <code class="field-key">${escapeHtml(field.name)}</code>
          <div class="field-badges">
            <span class="field-badge ${field.mode}">
              ${field.mode}
            </span>
            <span class="field-badge">${field.type}</span>
            ${
              objectFieldDirty(field)
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

    return `
      <label class="list-field-control">
        <span>${escapeHtml(field.label)}</span>
        <small>${escapeHtml(field.name)}</small>
        ${fieldInput({
          field,
          value,
          scope: "list",
          itemId: item._cmsResetId,
        })}
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
            <code>${escapeHtml(item._cmsResetId)}</code>
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
            <div>
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
            ${
              pathDirty(path)
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

        ${
          !validation.valid
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

        ${
          !editable
            ? `
              <div class="list-lock-banner">
                ${
                  !isCategoryEditable(category)
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
          ${
            list.length
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
      `${category.fieldCount} mapped settings`;

    e.categoryDescription.textContent =
      category.description;

    e.pageTitle.textContent = category.label;

    const grouped = new Map();

    filteredFields.forEach((field) => {
      if (!grouped.has(field.subcategory)) {
        grouped.set(field.subcategory, []);
      }

      grouped.get(field.subcategory).push(field);
    });

    e.fieldGroups.innerHTML =
      [...grouped.entries()]
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

    e.empty.hidden =
      filteredFields.length !== 0;

    const status = isCategoryEditable(
      category.id,
    )
      ? state.user
        ? "write-enabled on audited feature branch"
        : "sign in required"
      : "read-only until triple audits pass";

    e.loadStatus.textContent =
      `${filteredFields.length} matching fields · ` +
      `${category.fieldCount} total · ${status}`;

    e.home.hidden = true;
    e.browser.hidden = false;

    setActiveNav();
    updateAuthUI();
    updateDirtyUI();
    bindDynamicInputs();
  };

  const openCategory = (id) => {
    state.activeCategory = id;

    history.replaceState(
      null,
      "",
      `#/category/${id}`,
    );

    renderFieldBrowser();
    closeMenu();
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
        "Saare unsaved Gateway/Website drafts discard karne hain?",
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
        ${escapeHtml(path)} ·
        ${diff.length} field changes
      </h4>
      ${diff
        .map(
          (item) => `
            <div class="diff-row">
              <code>${escapeHtml(item.field)}</code>
              <div class="diff-old">
                Before: ${escapeHtml(item.before)}
              </div>
              <div class="diff-new">
                After: ${escapeHtml(item.after)}
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
          <code>Added · ${escapeHtml(item.label)}</code>
          <div class="diff-old">Before: not present</div>
          <div class="diff-new">
            After position: ${item.index + 1}
            <br>
            ID: ${escapeHtml(item.id)}
          </div>
        </div>`);
    });

    diff.removed.forEach((item) => {
      rows.push(`
        <div class="diff-row">
          <code>Deleted · ${escapeHtml(item.label)}</code>
          <div class="diff-old">
            Before position: ${item.index + 1}
            <br>
            ID: ${escapeHtml(item.id)}
          </div>
          <div class="diff-new">After: removed</div>
        </div>`);
    });

    diff.moved.forEach((item) => {
      rows.push(`
        <div class="diff-row">
          <code>Moved · ${escapeHtml(item.label)}</code>
          <div class="diff-old">
            Before position: ${item.beforeIndex + 1}
          </div>
          <div class="diff-new">
            After position: ${item.afterIndex + 1}
          </div>
        </div>`);
    });

    diff.changed.forEach((item) => {
      rows.push(`
        <div class="diff-row">
          <code>
            ${escapeHtml(item.label)}
            <br>
            ${escapeHtml(item.field)}
          </code>
          <div class="diff-old">
            Before: ${escapeHtml(item.before)}
          </div>
          <div class="diff-new">
            After: ${escapeHtml(item.after)}
          </div>
        </div>`);
    });

    return `
      <section class="diff-file">
        <h4>
          ${escapeHtml(path)} ·
          ${diff.count} card/list changes
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

  const bindEvents = () => {
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

          document
            .querySelectorAll("[data-mode]")
            .forEach((item) => {
              item.classList.toggle(
                "is-active",
                item === button,
              );
            });

          if (state.activeCategory) {
            renderFieldBrowser();
          }
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
      applyHash,
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

  const init = async () => {
    try {
      captureAuthFragment();

      const response = await fetch(
        "./schema.generated.json",
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          `Schema HTTP ${response.status}`,
        );
      }

      state.schema = await response.json();

      renderMetrics();
      renderCategories();
      bindEvents();

      await loadStaticFilesForReadOnly();

      if (state.session) {
        await refreshSession();
      } else {
        updateAuthUI();
      }

      applyHash();
    } catch (error) {
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
