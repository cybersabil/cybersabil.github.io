/* CyberSabil Single JavaScript File v2.10.1
   Purpose: Keeps all website, CMS, gateway, portfolio, navigation and animation logic in one file.
   Note: Split JS modules were merged back into this file to avoid module import/path/load-order issues on GitHub Pages. */


/* ==============================
   Merged from: assets/js/modules/core.js
   ============================== */

/* CyberSabil Core Utilities v2.8.0
   Purpose: Shared helpers, JSON loading, safe text/link setters, empty states and SEO rendering. */

/* CyberSabil Website + Gateway Controller
   Purpose: Loads CMS JSON data, renders the existing tools website, controls copy buttons, and manages the Website/Portfolio gateway. */
const $ = (id) => document.getElementById(id);

/* Asset and CMS version constants
   Purpose: Keeps cache-busting and localStorage keys aligned with the current release without adding any build tool. */
const CS_ASSET_VERSION = "2.10.1";
const CS_SCHEMA_VERSION = "2.10.0";
const csDataFailures = [];

/* Critical CMS fallback data
   Purpose: Keeps the Website hero, Gateway, Portfolio profile, visibility settings and SEO meaningful even when a preview server or network request cannot load JSON.
   Maintenance rule: When these critical JSON defaults change, update this block and run tools/validate-site.js. */
const CS_FALLBACK = {
    site: {
        "brandName": "CyberSabil",
        "logoText": "CS",
        "badge": "Windows IT Support Toolkit",
        "heroTitleBefore": "Practical IT tools for",
        "heroTitleHighlight": "real Windows problems.",
        "heroDescription": "CyberSabil is a practical IT support portfolio and tools hub for Windows automation, troubleshooting, monitoring, cleanup, and system administration utilities.",
        "primaryButtonText": "View Tools",
        "primaryButtonLink": "#tools",
        "secondaryButtonText": "Download",
        "secondaryButtonLink": "#downloads",
        "githubProfileLink": "https://github.com/cybersabil",
        "aboutTitle": "About CyberSabil",
        "aboutDescription": "CyberSabil builds practical Windows and IT support utilities focused on real-world troubleshooting, automation, monitoring, cleanup, and support workflows.",
        "footerText": "Windows automation, IT support utilities, monitoring tools, troubleshooting workflows, and practical GitHub projects."
    },
    design: {
        "themeMode": "dark",
        "accentColor": "cyan",
        "backgroundStyle": "gradient",
        "cardStyle": "glass",
        "heroLayout": "split",
        "showTerminalPreview": "yes",
    },
    siteSettings: {
        "version": "v2.10.1",
        "schemaVersion": "2.10.0",
        "bootStatusMessage": "Loading current CyberSabil configuration…",
        "gatewayEnabled": "yes",
        "defaultMode": "gateway",
        "websiteEnabled": "yes",
        "portfolioEnabled": "yes",
        "showModeSwitch": "yes",
        "modeSwitchWebsiteLabel": "Website",
        "modeSwitchPortfolioLabel": "Portfolio",
        "modeSwitchPosition": "top-right",
        "rememberVisitorChoice": "no",
        "enableUrlModeOverride": "yes",
        "allowGatewayCloseWithEscape": "yes",
        "escapeFallbackMode": "website",
        "showToolsSection": "yes",
        "showDownloadsSection": "yes",
        "showProjectsSection": "yes",
        "showDocsSection": "yes",
        "showFaqSection": "yes",
        "showAboutSection": "yes",
        "showQuickCommands": "yes",
        "terminalReadyMessage": "CyberSabil tools ready.",
        "copyButtonDefaultTitle": "Copy",
        "copyButtonSuccessTitle": "Copied",
        "copyButtonErrorTitle": "Copy failed",
        "copyButtonAriaLabel": "Copy command",
        "showDataLoadWarning": "yes",
        "dataLoadWarningTitle": "Content fallback active",
        "dataLoadWarningMessage": "Some editable CMS files could not load. Safe fallback content is being shown so the page remains usable."
    },
    sections: {
        "navToolsLabel": "Tools",
        "navDownloadsLabel": "Downloads",
        "navProjectsLabel": "Projects",
        "navDocsLabel": "Docs",
        "toolsTitle": "Featured IT tools",
        "toolsSubtitle": "Problem-solving utilities built for real Windows support workflows.",
        "downloadsTitle": "Downloads",
        "downloadsSubtitle": "Official CyberSabil downloads, live scripts and release links.",
        "downloadsWarning": "Safety note: Download tools only from official CyberSabil GitHub links. Do not run unknown scripts or EXE files from untrusted sources.",
        "projectsTitle": "Projects portfolio",
        "projectsSubtitle": "A portfolio of practical IT tools, scripts and GitHub-based deployments.",
        "skillsTitle": "Skills and focus areas",
        "skillsSubtitle": "Core areas behind CyberSabil tools and support workflows.",
        "quickCommandsTitle": "Quick commands",
        "quickCommandsSubtitle": "Copy commonly used support commands directly from the page.",
        "docsTitle": "Documentation and guides",
        "docsSubtitle": "Simple how-to guides for users and support engineers.",
        "faqTitle": "FAQ",
        "faqSubtitle": "Common questions about CyberSabil tools and scripts."
    },
    seo: {
        "pageTitle": "CyberSabil IT Tools and Portfolio",
        "metaDescription": "CyberSabil is a CMS-controlled tools website and professional portfolio for Windows automation, PowerShell scripts, troubleshooting utilities and GitHub Pages deployment.",
        "ogTitle": "CyberSabil IT Tools and Portfolio",
        "ogDescription": "Practical Windows support tools, commands, downloads, documentation and professional portfolio on one GitHub Pages homepage.",
        "ogImage": "https://cybersabil.github.io/media/social-preview.png",
        "themeColor": "#120821",
        "canonicalUrl": "https://cybersabil.github.io/",
        "ogType": "website",
        "ogUrl": "https://cybersabil.github.io/",
        "twitterCard": "summary_large_image",
        "twitterTitle": "CyberSabil IT Tools and Portfolio",
        "twitterDescription": "Practical Windows support tools, commands, downloads, documentation and professional portfolio on one GitHub Pages homepage.",
        "twitterImage": "https://cybersabil.github.io/media/social-preview.png"
    },
    gateway: {
        "logoText": "CS",
        "eyebrow": "CyberSabil",
        "showLogoRow": "no",
        "title": "Choose your mode",
        "subtitle": "Open the tools website or view the portfolio.",
        "showSubtitle": "yes",
        "choiceLabel": "Select a mode",
        "showChoiceLabel": "no",
        "chipOne": "Windows IT Tools",
        "chipTwo": "PowerShell Automation",
        "chipThree": "Professional Portfolio",
        "showChips": "no",
        "footerNote": "Same homepage. No extra pages.",
        "showFooterNote": "no",
        "showCardIcons": "no",
        "showCardKickers": "no",
        "showCardDescriptions": "yes",
        "showCardButtons": "yes",
        "websiteIcon": "🛠️",
        "websiteKicker": "Website mode",
        "websiteTitle": "Website",
        "websiteDescription": "Tools, downloads, docs and commands.",
        "websiteButtonText": "Open Website",
        "portfolioIcon": "✨",
        "portfolioKicker": "Portfolio mode",
        "portfolioTitle": "Portfolio",
        "portfolioDescription": "Profile, skills, projects and contact.",
        "portfolioButtonText": "View Portfolio",
        "stylePreset": "minimal-selector",
        "animationStyle": "soft-scale",
        "backgroundBlur": 7,
        "backgroundDarkness": 0.5,
        "panelMaxWidth": "680px"
    },
    visualBaseline: {
        "globalVisualPreset": "v2.8.3-exact"
    },
    gatewayAppearance: {
            "advancedControlsEnabled": "yes",
            "visualPreset": "v2.8.3-exact",
            "layoutControlMode": "inherit",
            "appearanceControlMode": "inherit",
            "animationControlMode": "inherit",
            "interactionControlMode": "inherit",
            "cardOrder": "website-first",
            "desktopCardLayout": "row",
            "tabletCardLayout": "row",
            "mobileCardLayout": "column",
            "desktopPanelPosition": "center",
            "tabletPanelPosition": "center",
            "mobilePanelPosition": "center",
            "panelContentLayout": "stacked",
            "panelMaxWidth": 680,
            "panelMaxHeightVh": 92,
            "panelPadding": 28,
            "panelGap": 18,
            "panelBorderRadius": 28,
            "panelBackgroundType": "gradient",
            "panelBackgroundColor": "#121f2f",
            "panelBackgroundOpacity": 0.86,
            "panelGradientStartColor": "#121f2f",
            "panelGradientStartOpacity": 0.86,
            "panelGradientEndColor": "#0a101f",
            "panelGradientEndOpacity": 0.78,
            "panelGradientDirection": "diagonal-down",
            "panelBackdropBlur": 22,
            "panelBackdropSaturation": 135,
            "panelBorderEnabled": "yes",
            "panelBorderWidth": 1,
            "panelBorderStyle": "solid",
            "panelBorderColor": "#ffffff",
            "panelBorderOpacity": 0.16,
            "panelShadowPreset": "strong",
            "panelGlowEnabled": "no",
            "panelGlowColor": "#35d7ff",
            "panelGlowOpacity": 0.12,
            "panelInsetHighlightEnabled": "yes",
            "panelInsetHighlightOpacity": 0.14,
            "overlayColor": "#030812",
            "overlayDarkness": 0.5,
            "overlayBackdropBlur": 4,
            "websiteBackgroundBlur": 7,
            "websiteBackgroundBrightness": 81,
            "websiteBackgroundSaturation": 100,
            "showAmbientLights": "yes",
            "ambientOneColor": "#8b5cf6",
            "ambientTwoColor": "#f7d88a",
            "ambientOpacity": 0.32,
            "ambientBlur": 34,
            "titleAlignment": "center",
            "titleColor": "#fff8e8",
            "titleSize": 42,
            "titleWeight": 800,
            "subtitleColor": "#ffffff",
            "subtitleOpacity": 0.7,
            "subtitleSize": 15,
            "choiceGap": 12,
            "cardMinHeight": 0,
            "cardPadding": 18,
            "cardBorderRadius": 22,
            "cardBorderWidth": 1,
            "cardTextAlignment": "left",
            "cardContentAlignment": "start",
            "cardShadowPreset": "medium",
            "cardInsetHighlightEnabled": "yes",
            "cardInsetHighlightOpacity": 0.12,
            "cardTitleColor": "#fff8e8",
            "cardDescriptionColor": "#ffffff",
            "cardDescriptionOpacity": 0.66,
            "websiteCardBackgroundType": "gradient",
            "websiteCardBackgroundColor": "#102033",
            "websiteCardBackgroundOpacity": 0.72,
            "websiteCardGradientStartColor": "#ffffff",
            "websiteCardGradientStartOpacity": 0.105,
            "websiteCardGradientEndColor": "#ffffff",
            "websiteCardGradientEndOpacity": 0.04,
            "websiteCardBorderColor": "#35d7ff",
            "websiteCardBorderOpacity": 0.24,
            "websiteCardAccentColor": "#35d7ff",
            "portfolioCardBackgroundType": "gradient",
            "portfolioCardBackgroundColor": "#21152f",
            "portfolioCardBackgroundOpacity": 0.72,
            "portfolioCardGradientStartColor": "#ffffff",
            "portfolioCardGradientStartOpacity": 0.105,
            "portfolioCardGradientEndColor": "#ffffff",
            "portfolioCardGradientEndOpacity": 0.04,
            "portfolioCardBorderColor": "#f7d88a",
            "portfolioCardBorderOpacity": 0.24,
            "portfolioCardAccentColor": "#f7d88a",
            "websiteButtonStyle": "pill",
            "websiteButtonStartColor": "#95f1ff",
            "websiteButtonEndColor": "#35d7ff",
            "websiteButtonTextColor": "#07111f",
            "portfolioButtonStyle": "pill",
            "portfolioButtonStartColor": "#fff2b5",
            "portfolioButtonEndColor": "#c98b2d",
            "portfolioButtonTextColor": "#1a1005",
            "buttonBorderRadius": 999,
            "panelAnimation": "soft-scale",
            "overlayAnimation": "fade-blur",
            "websiteCardAnimation": "soft-scale",
            "portfolioCardAnimation": "soft-scale",
            "animationDurationMs": 420,
            "panelAnimationDelayMs": 0,
            "websiteCardDelayMs": 120,
            "portfolioCardDelayMs": 180,
            "animationEasing": "smooth",
            "cardHoverPreset": "lift-glow",
            "cardHoverStrength": 2,
            "cardHoverDurationMs": 200,
            "cardClickPreset": "press"
    },
    navigationStyle: {
            "advancedControlsEnabled": "yes",
            "visualPreset": "v2.8.3-exact",
            "websiteHeaderControlMode": "inherit",
            "portfolioHeaderControlMode": "inherit",
            "modeSwitchPositionControlMode": "inherit",
            "modeSwitchAppearanceControlMode": "inherit",
            "modeSwitchAnimationControlMode": "inherit",
            "websiteHeaderPosition": "sticky",
            "websiteDesktopLayout": "brand-left-menu-right",
            "websiteMenuAlignment": "right",
            "websiteHeaderMinHeight": 72,
            "websiteContainerMaxWidth": 1160,
            "websiteHeaderBackgroundType": "glass",
            "websiteHeaderBackgroundColor": "#07111f",
            "websiteHeaderBackgroundOpacity": 0.84,
            "websiteHeaderBackdropBlur": 14,
            "websiteHeaderBorderEnabled": "yes",
            "websiteHeaderBorderColor": "#ffffff",
            "websiteHeaderBorderOpacity": 0.14,
            "websiteHeaderShadowPreset": "none",
            "websiteMenuGap": 18,
            "websiteMenuFontSize": 14,
            "websiteMenuLinkStyle": "plain",
            "websiteMenuTextColor": "#aebed4",
            "websiteMenuHoverColor": "#eaf2ff",
            "websiteMobileToggleSide": "right",
            "websiteMobileMenuAlignment": "left",
            "portfolioHeaderPosition": "sticky",
            "portfolioDesktopLayout": "brand-left-menu-right",
            "portfolioMenuAlignment": "right",
            "portfolioHeaderMinHeight": 76,
            "portfolioContainerMaxWidth": 1160,
            "portfolioHeaderBackgroundType": "glass",
            "portfolioHeaderBackgroundColor": "#0d0818",
            "portfolioHeaderBackgroundOpacity": 0.82,
            "portfolioHeaderBackdropBlur": 18,
            "portfolioHeaderBorderEnabled": "yes",
            "portfolioHeaderBorderColor": "#f5c55c",
            "portfolioHeaderBorderOpacity": 0.16,
            "portfolioHeaderShadowPreset": "none",
            "portfolioMenuGap": 8,
            "portfolioMenuFontSize": 14,
            "portfolioMenuLinkStyle": "pill",
            "portfolioMenuTextColor": "#fff7e8",
            "portfolioMenuTextOpacity": 0.72,
            "portfolioMenuHoverColor": "#f8df98",
            "portfolioMobileToggleSide": "right",
            "portfolioMobileMenuAlignment": "left",
            "modeSwitchDesktopPosition": "top-right",
            "modeSwitchMobilePosition": "bottom-center",
            "modeSwitchHorizontalOffset": 18,
            "modeSwitchVerticalOffset": 18,
            "modeSwitchMobileOffset": 12,
            "modeSwitchOrientation": "horizontal",
            "modeSwitchSize": "standard",
            "modeSwitchBackgroundColor": "#0a0e1d",
            "modeSwitchBackgroundOpacity": 0.72,
            "modeSwitchBackdropBlur": 16,
            "modeSwitchBorderColor": "#ffffff",
            "modeSwitchBorderOpacity": 0.14,
            "modeSwitchBorderWidth": 1,
            "modeSwitchBorderRadius": 999,
            "modeSwitchShadowPreset": "medium",
            "modeSwitchWebsiteStartColor": "#95f1ff",
            "modeSwitchWebsiteEndColor": "#35d7ff",
            "modeSwitchWebsiteTextColor": "#06121d",
            "modeSwitchPortfolioStartColor": "#f8df98",
            "modeSwitchPortfolioEndColor": "#c58b2c",
            "modeSwitchPortfolioTextColor": "#211606",
            "modeSwitchInactiveTextColor": "#ffffff",
            "modeSwitchInactiveTextOpacity": 0.74,
            "modeSwitchAnimation": "pulse",
            "modeSwitchHoverPreset": "lift"
    },
    portfolioSettings: {
        "themePreset": "purple-gold",
        "layoutPreset": "professional",
        "brandText": "CyberSabil Portfolio",
        "showNavigation": "yes",
        "navSkillsLabel": "Skills",
        "navProjectsLabel": "Projects",
        "navTimelineLabel": "Timeline",
        "navServicesLabel": "Services",
        "navContactLabel": "Contact",
        "showHero": "yes",
        "showProfileCard": "yes",
        "showProjectsSection": "yes",
        "showTimelineSection": "yes",
        "showServicesSection": "yes",
        "showContactSection": "yes",
        "skillsEyebrow": "Technical focus",
        "skillsTitle": "Practical IT skills",
        "skillsSubtitle": "Support-focused skills for Windows troubleshooting, automation, documentation and lightweight web deployment.",
        "projectsEyebrow": "Selected systems",
        "projectsTitle": "Project portfolio",
        "projectsSubtitle": "Tools and workflows designed around repeatable IT support problems, deployment clarity and user-safe execution.",
        "timelineEyebrow": "Progress path",
        "timelineTitle": "Build timeline",
        "timelineSubtitle": "A short view of how the CyberSabil website, tools and portfolio system are improving version by version.",
        "servicesEyebrow": "Support areas",
        "servicesTitle": "Services",
        "servicesSubtitle": "Clear, practical help for Windows support operations, small dashboards, automation scripts and technical documentation.",
        "contactEyebrow": "Contact",
        "showProjectLinks": "yes",
        "projectLinkLabel": "Open project →",
        "footerText": "CyberSabil Portfolio • Practical Windows automation, support utilities and GitHub Pages deployments"
    },
    profile: {
        "name": "CyberSabil",
        "initials": "CS",
        "role": "IT Support Automation and Tools Builder",
        "tagline": "I build practical Windows support tools, PowerShell workflows, GitHub Pages utilities and documentation that make repeated troubleshooting tasks easier to run and maintain.",
        "availability": "Focused on practical IT support systems",
        "location": "India",
        "experience": "Windows Support • PowerShell • GitHub Pages • CMS-controlled sites",
        "bio": "CyberSabil is focused on reliable, easy-to-update support systems: command launchers, cleanup workflows, monitoring utilities, documentation hubs and small dashboards for real Windows support needs.",
        "primaryCtaText": "View projects",
        "primaryCtaLink": "#csPortfolioProjects",
        "secondaryCtaText": "Contact",
        "secondaryCtaLink": "#csPortfolioContact",
        "statOneValue": "Tools",
        "statOneLabel": "Built for real support tasks",
        "statTwoValue": "CMS",
        "statTwoLabel": "Easy content updates"
    },
    contact: {
        "heading": "Let’s build practical IT support systems",
        "description": "Connect for Windows automation, support utilities, CMS-controlled GitHub Pages sites, cleanup workflows and technical documentation.",
        "email": "",
        "githubText": "github.com/cybersabil",
        "githubLink": "https://github.com/cybersabil",
        "websiteText": "cybersabil.github.io",
        "websiteLink": "https://cybersabil.github.io/",
        "ctaText": "Open GitHub",
        "ctaLink": "https://github.com/cybersabil",
        "emailLabel": "Email:",
        "githubLabel": "GitHub:",
        "websiteLabel": "Website:"
    }
};

/* Fallback cloning helper
   Purpose: Returns a writable copy because mode safety logic may normalize invalid CMS combinations at runtime. */
function cloneFallback(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
}

/* Short retry delay helper
   Purpose: Gives lightweight mobile preview servers a moment to recover without delaying successful GitHub Pages loads. */
const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

/* HTML escaping helper
   Purpose: Prevents CMS-entered text from being inserted as executable HTML. */
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
}[char]));

/* URL safety helper
   Purpose: Allows normal internal, relative, HTTP(S), mail and phone links while blocking unsafe CMS-entered schemes. */
function safeUrl(href) {
    const value = String(href || "#").trim();
    if (!value) return "#";
    if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "#";
    return value;
}

/* Yes/no helper
   Purpose: Allows Pages CMS fields to use yes/no, true/false, on/off or enabled/disabled values safely. */
const yes = (value, fallback = true) => {
    if (value === undefined || value === null || value === "") return fallback;
    const normalized = String(value).trim().toLowerCase();
    return !["no", "false", "0", "off", "disabled", "hide"].includes(normalized);
};

/* Safe visual value helpers
   Purpose: Converts CMS values into bounded CSS variables/classes without allowing raw CSS injection or out-of-range layouts. */
function clampNumber(value, minimum, maximum, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function safeChoice(value, allowedValues, fallback) {
    const normalized = String(value || "").trim().toLowerCase();
    return allowedValues.includes(normalized) ? normalized : fallback;
}

function safeHexColor(value, fallback) {
    const color = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

function hexToRgba(value, opacity = 1, fallback = "#000000") {
    const color = safeHexColor(value, fallback).slice(1);
    const red = parseInt(color.slice(0, 2), 16);
    const green = parseInt(color.slice(2, 4), 16);
    const blue = parseInt(color.slice(4, 6), 16);
    const alpha = clampNumber(opacity, 0, 1, 1);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function shadowValue(preset, family = "panel") {
    const safePreset = safeChoice(preset, ["none", "soft", "medium", "strong"], "none");
    const shadows = family === "switch"
        ? {
            none: "none",
            soft: "0 10px 28px rgba(0, 0, 0, .18)",
            medium: "0 18px 50px rgba(0, 0, 0, .28)",
            strong: "0 24px 70px rgba(0, 0, 0, .38)"
        }
        : family === "card"
            ? {
                none: "none",
                soft: "0 10px 28px rgba(0, 0, 0, .16)",
                medium: "0 16px 45px rgba(0, 0, 0, .22)",
                strong: "0 22px 64px rgba(0, 0, 0, .32)"
            }
            : {
                none: "none",
                soft: "0 18px 52px rgba(0, 0, 0, .24)",
                medium: "0 24px 72px rgba(0, 0, 0, .34)",
                strong: "0 28px 90px rgba(0, 0, 0, .44)"
            };
    return shadows[safePreset];
}

function gradientDirection(value) {
    return {
        "top-to-bottom": "180deg",
        "left-to-right": "90deg",
        "diagonal-up": "45deg",
        "diagonal-down": "145deg"
    }[safeChoice(value, ["top-to-bottom", "left-to-right", "diagonal-up", "diagonal-down"], "diagonal-down")];
}

/* Atomic boot controller
   Purpose: Keeps obsolete static values non-renderable until the current CMS state or a detected fallback state is fully prepared. */
let csInitPromise = null;
let csBootGeneration = 0;

function readInlineCriticalConfig() {
    const node = $("csCriticalConfig");
    if (!node) return {};
    try { return JSON.parse(node.textContent || "{}"); }
    catch (error) { console.warn("CyberSabil inline critical snapshot is invalid:", error); return {}; }
}

function setBootPhase(phase, message = "") {
    const root = document.documentElement;
    ["preparing", "applying", "ready", "failed"].forEach((name) => root.classList.remove(`cs-boot-${name}`));
    root.classList.add(`cs-boot-${phase}`);
    document.body?.setAttribute("aria-busy", String(phase === "preparing" || phase === "applying"));
    const status = $("csBootStatus");
    const statusText = $("csBootStatusText");
    if (statusText && message) statusText.textContent = message;
    if (status) status.hidden = phase === "ready" || phase === "failed";
}

function revealPreparedPage() {
    return new Promise((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
            setBootPhase("ready");
            resolve();
        }));
    });
}

function revealFatalFallback(error, settings = {}) {
    console.error("CyberSabil boot failed:", error);
    const banner = $("csDataStatus");
    setText("csDataStatusTitle", "Site recovery mode");
    setText("csDataStatusMessage", "The current configuration could not be fully initialized. A safe generated fallback is visible; refresh after the deployment completes.");
    if (banner) banner.hidden = false;
    setBootPhase("failed");
    document.body?.removeAttribute("aria-busy");
}

/* JSON loader
   Purpose: Loads CMS JSON with stable release versioning, retries once without a query string for limited mobile preview servers, and returns a real fallback if both attempts fail. */
async function loadJson(path, fallback) {
    const rawUrl = new URL(path, document.baseURI);
    const versionedUrl = new URL(rawUrl.href);
    const inlineRevision = readInlineCriticalConfig().revision;
    versionedUrl.searchParams.set("v", inlineRevision || CS_ASSET_VERSION);
    const candidates = [versionedUrl.href, rawUrl.href];
    let lastError = null;

    for (let attempt = 0; attempt < candidates.length; attempt += 1) {
        try {
            const response = await fetch(candidates[attempt], {
                cache: "no-cache",
                headers: { "Accept": "application/json" }
            });
            if (!response.ok) throw new Error(`${path} returned ${response.status}`);
            return await response.json();
        } catch (error) {
            lastError = error;
            if (attempt < candidates.length - 1) {
                await wait(140 + (path.length % 90));
            }
        }
    }

    if (!csDataFailures.some((item) => item.path === path)) {
        csDataFailures.push({ path, message: lastError?.message || "Unable to load CMS file" });
    }
    console.warn("CyberSabil JSON fallback:", path, lastError);
    return cloneFallback(fallback);
}

/* DOM text helper
   Purpose: Updates a text node only when the target element exists. */
function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value ?? "";
}

/* DOM link helper
   Purpose: Updates an anchor link and optional visible label safely from CMS data. */
function setLink(id, href, text) {
    const node = $(id);
    if (!node) return;
    const nextHref = safeUrl(href);
    node.href = nextHref;
    if (/^https?:\/\//i.test(nextHref)) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
    }
    if (text !== undefined) node.textContent = text || href || "";
}

/* Visibility helper
   Purpose: Shows or hides a section/card without removing it from the HTML. */
function setVisible(id, visible) {
    const node = $(id);
    if (node) node.classList.toggle("hide", !visible);
}

/* Empty-state renderer
   Purpose: Keeps sections readable when a CMS list is empty or a JSON file fails instead of leaving a blank grid. */
function renderEmptyState(container, title, message) {
    if (!container) return;
    container.innerHTML = `
        <div class="cs-mode-empty-state">
            <strong>${escapeHtml(title || "Content coming soon")}</strong>
            <span>${escapeHtml(message || "Update the matching JSON file from Pages CMS to show content here.")}</span>
        </div>
    `;
}

/* CMS data status renderer
   Purpose: Shows a compact warning only when a JSON/CMS file fails, while allowing the site to continue with fallback data. */
function renderDataFallbackStatus(settings = {}) {
    const banner = $("csDataStatus");
    if (!banner) return;
    if (!csDataFailures.length || !yes(settings.showDataLoadWarning)) {
        banner.hidden = true;
        return;
    }

    const title = settings.dataLoadWarningTitle || "Content fallback active";
    const fileList = csDataFailures.map((item) => item.path).join(", ");
    const message = settings.dataLoadWarningMessage || "Some editable CMS files could not load. Safe fallback content is being shown.";
    setText("csDataStatusTitle", title);
    setText("csDataStatusMessage", message);
    banner.title = `Files using fallback: ${fileList}`;
    banner.hidden = false;

    const dismissButton = $("csDataStatusDismiss");
    if (dismissButton) {
        dismissButton.onclick = () => { banner.hidden = true; };
    }
}

/* SEO renderer
   Purpose: Allows page title, meta description and social preview text to be controlled from data/seo.json. */
function applySeo(seo, site) {
    const pageTitle = seo.pageTitle || `${site.brandName || "CyberSabil"} IT Tools`;
    const description = seo.metaDescription || site.heroDescription || "CyberSabil IT tools and portfolio.";
    const canonicalUrl = safeUrl(seo.canonicalUrl || seo.ogUrl || "https://cybersabil.github.io/");
    const previewImage = safeUrl(seo.ogImage || seo.twitterImage || "https://cybersabil.github.io/media/social-preview.svg");
    document.title = pageTitle;

    const upsertMeta = (selector, attr, value) => {
        let node = document.head.querySelector(selector);
        if (!node) {
            node = document.createElement("meta");
            const nameMatch = selector.match(/name="([^"]+)"/);
            const propertyMatch = selector.match(/property="([^"]+)"/);
            if (nameMatch) node.setAttribute("name", nameMatch[1]);
            if (propertyMatch) node.setAttribute("property", propertyMatch[1]);
            document.head.appendChild(node);
        }
        node.setAttribute(attr, value || "");
    };

    const upsertLink = (selector, relValue, hrefValue) => {
        let node = document.head.querySelector(selector);
        if (!node) {
            node = document.createElement("link");
            node.setAttribute("rel", relValue);
            document.head.appendChild(node);
        }
        node.setAttribute("href", hrefValue || "https://cybersabil.github.io/");
    };

    upsertLink('link[rel="canonical"]', "canonical", canonicalUrl);
    upsertMeta('meta[name="description"]', "content", description);
    upsertMeta('meta[property="og:type"]', "content", seo.ogType || "website");
    upsertMeta('meta[property="og:url"]', "content", seo.ogUrl || canonicalUrl);
    upsertMeta('meta[property="og:title"]', "content", seo.ogTitle || pageTitle);
    upsertMeta('meta[property="og:description"]', "content", seo.ogDescription || description);
    upsertMeta('meta[property="og:image"]', "content", previewImage);
    upsertMeta('meta[name="twitter:card"]', "content", seo.twitterCard || "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "content", seo.twitterTitle || seo.ogTitle || pageTitle);
    upsertMeta('meta[name="twitter:description"]', "content", seo.twitterDescription || seo.ogDescription || description);
    upsertMeta('meta[name="twitter:image"]', "content", seo.twitterImage || previewImage);
    if (seo.themeColor) upsertMeta('meta[name="theme-color"]', "content", seo.themeColor);
}


/* ==============================
   Merged from: assets/js/modules/copy-buttons.js
   ============================== */

/* CyberSabil Copy Button Module v2.8.0
   Purpose: Adds copy buttons to rendered command/code blocks after dynamic content is loaded. */

/* Copy icon SVG
   Purpose: Keeps the existing command-copy feature working for every .code block. */
function copyIconSvg() {
    return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 9.5C9 8.67 9.67 8 10.5 8H18.5C19.33 8 20 8.67 20 9.5V18.5C20 19.33 19.33 20 18.5 20H10.5C9.67 20 9 19.33 9 18.5V9.5Z" stroke="currentColor" stroke-width="1.8"/>
            <path d="M6 16H5.5C4.67 16 4 15.33 4 14.5V5.5C4 4.67 4.67 4 5.5 4H14.5C15.33 4 16 4.67 16 5.5V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
    `;
}

/* Clipboard writer
   Purpose: Copies a command to the clipboard and shows CMS-controlled status text. */
async function copyTextToClipboard(text, button, settings = {}) {
    const copiedText = settings.copyButtonSuccessTitle || "Copied";
    const copyText = settings.copyButtonDefaultTitle || "Copy";
    const failedText = settings.copyButtonErrorTitle || "Copy failed";

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            document.execCommand("copy");
            textarea.remove();
        }

        button.classList.add("copied");
        button.setAttribute("title", copiedText);
        button.setAttribute("aria-label", copiedText);

        setTimeout(() => {
            button.classList.remove("copied");
            button.setAttribute("title", copyText);
            button.setAttribute("aria-label", copyText);
        }, 1400);
    } catch (error) {
        console.warn("Copy failed", error);
        button.setAttribute("title", failedText);
        button.setAttribute("aria-label", failedText);
    }
}

/* Copy button installer
   Purpose: Wraps command blocks and attaches copy buttons after dynamic CMS content has rendered. */
function addCopyButtons(settings = {}) {
    const copyText = settings.copyButtonDefaultTitle || "Copy";
    const ariaText = settings.copyButtonAriaLabel || "Copy command";

    document.querySelectorAll(".code").forEach((codeBlock) => {
        if (codeBlock.closest(".copy-wrap")) return;

        const wrapper = document.createElement("div");
        wrapper.className = "copy-wrap";

        codeBlock.parentNode.insertBefore(wrapper, codeBlock);
        wrapper.appendChild(codeBlock);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "copy-btn";
        button.setAttribute("aria-label", ariaText);
        button.setAttribute("title", copyText);
        button.innerHTML = copyIconSvg();

        button.addEventListener("click", () => {
            copyTextToClipboard(codeBlock.textContent.trim(), button, settings);
        });

        wrapper.appendChild(button);
    });
}


/* ==============================
   Merged from: assets/js/modules/website-render.js
   ============================== */

/* CyberSabil Website Renderer Module v2.8.0
   Purpose: Renders the original tools website sections from JSON without touching gateway/portfolio logic. */

/* Existing website design renderer
   Purpose: Preserves the original tools website theme system while adding safer null checks. */
function applyDesign(design) {
    const body = document.body;
    const runtimeClasses = Array.from(body.classList).filter((className) => className.startsWith("cs-"));
    body.className = "";
    body.classList.add("theme-" + (design.themeMode || "dark"));
    body.classList.add("accent-" + (design.accentColor || "cyan"));
    body.classList.add("bg-" + (design.backgroundStyle || "gradient"));
    body.classList.add("card-" + (design.cardStyle || "glass"));
    runtimeClasses.forEach((className) => body.classList.add(className));
    if ((design.heroLayout || "split").toLowerCase() === "center") body.classList.add("hero-center");

    const terminalBox = $("terminalBox");
    if (terminalBox) terminalBox.classList.toggle("hide", !yes(design.showTerminalPreview));
}

/* Existing website site-data renderer
   Purpose: Renders brand, hero, buttons, GitHub link, about text and footer from data/site.json. */
function renderSite(site) {
    setText("brandName", site.brandName || "CyberSabil");
    setText("logoText", site.logoText || "CS");
    setText("footerBrand", `${site.brandName || "CyberSabil"} IT Tools`);
    setText("badge", site.badge || "");
    setText("heroTitleBefore", site.heroTitleBefore || "");
    setText("heroTitleHighlight", site.heroTitleHighlight || "");
    setText("heroDescription", site.heroDescription || "");
    setLink("primaryButton", site.primaryButtonLink || "#tools", site.primaryButtonText || "View Tools");
    setLink("secondaryButton", site.secondaryButtonLink || "#downloads", site.secondaryButtonText || "Download");
    setLink("githubNav", site.githubProfileLink || "https://github.com/cybersabil", site.githubNavText || "GitHub");
    setText("aboutTitle", site.aboutTitle || "About");
    setText("aboutDescription", site.aboutDescription || "");
    setText("footerText", site.footerText || "");
}

/* Website section renderer
   Purpose: Gives CMS control over navigation labels, section headings, subtitles, warning text and quick command labels. */
function renderSections(sections) {
    setText("navToolsLabel", sections.navToolsLabel || "Tools");
    setText("navDownloadsLabel", sections.navDownloadsLabel || "Downloads");
    setText("navProjectsLabel", sections.navProjectsLabel || "Projects");
    setText("navDocsLabel", sections.navDocsLabel || "Docs");

    setText("toolsSectionTitle", sections.toolsTitle || "Featured IT tools");
    setText("toolsSectionSubtitle", sections.toolsSubtitle || "Problem-solving utilities built for real Windows support workflows.");
    setText("downloadsSectionTitle", sections.downloadsTitle || "Downloads");
    setText("downloadsSectionSubtitle", sections.downloadsSubtitle || "Official CyberSabil downloads, live scripts and release links.");
    setText("downloadsWarning", sections.downloadsWarning || "Safety note: Download tools only from official CyberSabil GitHub links. Do not run unknown scripts or EXE files from untrusted sources.");
    setText("projectsSectionTitle", sections.projectsTitle || "Projects portfolio");
    setText("projectsSectionSubtitle", sections.projectsSubtitle || "A portfolio of practical IT tools, scripts and GitHub-based deployments.");
    setText("skillsSectionTitle", sections.skillsTitle || "Skills and focus areas");
    setText("skillsSectionSubtitle", sections.skillsSubtitle || "Core areas behind CyberSabil tools and support workflows.");
    setText("quickCommandsTitle", sections.quickCommandsTitle || "Quick commands");
    setText("quickCommandsSubtitle", sections.quickCommandsSubtitle || "Copy commonly used support commands directly from the page.");
    setText("docsSectionTitle", sections.docsTitle || "Documentation and guides");
    setText("docsSectionSubtitle", sections.docsSubtitle || "Simple how-to guides for users and support engineers.");
    setText("faqSectionTitle", sections.faqTitle || "FAQ");
    setText("faqSectionSubtitle", sections.faqSubtitle || "Common questions about CyberSabil tools and scripts.");
}

/* Existing website section visibility renderer
   Purpose: Adds CMS show/hide control for all major website sections without deleting their HTML. */
function applySiteSettings(settings) {
    setVisible("tools", yes(settings.showToolsSection));
    setVisible("downloads", yes(settings.showDownloadsSection));
    setVisible("projects", yes(settings.showProjectsSection));
    setVisible("skills", yes(settings.showSkillsSection));
    setVisible("docs", yes(settings.showDocsSection));
    setVisible("faq", yes(settings.showFaqSection));
    setVisible("about", yes(settings.showAboutSection));
    setVisible("quickCommandsCard", yes(settings.showQuickCommands));
}

/* Tool card renderer
   Purpose: Builds the existing tools cards, terminal preview and quick command list from data/tools.json. */
function renderTools(items, settings = {}) {
    const toolCards = $("toolCards");
    const terminalCommands = $("terminalCommands");
    const commandList = $("commandList");
    const readyMessage = settings.terminalReadyMessage || "CyberSabil tools ready.";

    if (toolCards) {
        if (!items.length) {
            renderEmptyState(toolCards, "No tools found", "Add tools in data/tools.json from Pages CMS.");
        } else {
            toolCards.innerHTML = items.map((tool) => `<div class="card"><div class="icon">${escapeHtml(tool.icon)}</div><span class="status">${escapeHtml(tool.status)}</span><h3>${escapeHtml(tool.title)}</h3><p>${escapeHtml(tool.description)}</p><br><p><strong>Problem:</strong> ${escapeHtml(tool.problem)}</p><p><strong>Solution:</strong> ${escapeHtml(tool.solution)}</p><p class="small"><strong>Tech:</strong> ${escapeHtml(tool.technology)}</p>${tool.command && tool.command !== "Coming soon" ? `<div class="code">${escapeHtml(tool.command)}</div>` : ""}${tool.buttonLink ? `<br><a class="btn secondary" href="${escapeHtml(safeUrl(tool.buttonLink))}" target="_blank" rel="noopener noreferrer">${escapeHtml(tool.buttonText || "Open")}</a>` : ""}</div>`).join("");
        }
    }

    const commandItems = items.filter((tool) => tool.command && tool.command !== "Coming soon");
    if (terminalCommands) {
        terminalCommands.innerHTML = commandItems.map((tool) => `<div><span class="prompt">PS&gt;</span> <span class="cmd">${escapeHtml(tool.command)}</span></div><div>${escapeHtml(tool.title)}</div><br>`).join("") + `<div style="color:var(--accent2)">${escapeHtml(readyMessage)}</div>`;
    }
    if (commandList) {
        if (!commandItems.length) {
            renderEmptyState(commandList, "No commands available", "Add a command field in data/tools.json to show quick commands.");
        } else {
            commandList.innerHTML = commandItems.map((tool) => `<p class="small"><strong>${escapeHtml(tool.title)}</strong></p><div class="code">${escapeHtml(tool.command)}</div>`).join("");
        }
    }
}

/* Downloads renderer
   Purpose: Builds download cards from data/downloads.json. */
function renderDownloads(items) {
    const grid = $("downloadsGrid");
    if (!grid) return;
    if (!items.length) {
        renderEmptyState(grid, "No downloads found", "Add downloads in data/downloads.json from Pages CMS.");
        return;
    }
    grid.innerHTML = items.map((download) => {
        const actions = [
            download.downloadLink ? `<a class="btn primary" href="${escapeHtml(safeUrl(download.downloadLink))}" target="_blank" rel="noopener noreferrer">Download</a>` : "",
            download.releaseLink ? `<a class="btn secondary" href="${escapeHtml(safeUrl(download.releaseLink))}" target="_blank" rel="noopener noreferrer">Release</a>` : ""
        ].filter(Boolean).join("");
        return `<div class="download"><span class="status">${escapeHtml(download.type)}</span><h3>${escapeHtml(download.title)}</h3><p>${escapeHtml(download.description)}</p><p class="small"><strong>Version:</strong> ${escapeHtml(download.version)}</p><p class="small"><strong>Checksum:</strong> ${escapeHtml(download.checksum)}</p>${actions ? `<div class="actions cs-mode-download-actions">${actions}</div>` : ""}</div>`;
    }).join("");
}

/* Existing projects renderer
   Purpose: Builds original tools-website project cards from data/projects.json. */
function renderProjects(items) {
    const grid = $("projectCards");
    if (!grid) return;
    if (!items.length) {
        renderEmptyState(grid, "No projects found", "Add projects in data/projects.json from Pages CMS.");
        return;
    }
    grid.innerHTML = items.map((project) => `<div class="card"><div class="icon">${escapeHtml(project.icon)}</div><span class="status">${escapeHtml(project.status)}</span><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.description)}</p><br><p><strong>Problem solved:</strong> ${escapeHtml(project.problemSolved)}</p><p class="small"><strong>Tech:</strong> ${escapeHtml(project.techUsed)}</p><br><div class="actions"><a class="btn secondary" href="${escapeHtml(safeUrl(project.repoLink))}" target="_blank" rel="noopener noreferrer">GitHub</a><a class="btn secondary" href="${escapeHtml(safeUrl(project.liveLink))}" target="_blank" rel="noopener noreferrer">Open</a></div></div>`).join("");
}

/* Existing skills renderer
   Purpose: Builds original tools-website skill cards from data/skills.json. */
function renderSkills(items) {
    const grid = $("skillsGrid");
    if (!grid) return;
    if (!items.length) {
        renderEmptyState(grid, "No skills found", "Add skills in data/skills.json from Pages CMS.");
        return;
    }
    grid.innerHTML = items.map((skill) => `<div class="card"><h3>${escapeHtml(skill.title)}</h3><p>${escapeHtml(skill.description)}</p></div>`).join("");
}

/* Documentation renderer
   Purpose: Builds documentation rows and keeps command copy buttons available for guide commands. */
function renderDocs(items) {
    const list = $("docsList");
    if (!list) return;
    if (!items.length) {
        renderEmptyState(list, "No docs found", "Add documentation in data/docs.json from Pages CMS.");
        return;
    }
    list.innerHTML = items.map((doc) => `<div class="tool"><div><span class="status">${escapeHtml(doc.category)}</span><h3>${escapeHtml(doc.title)}</h3><p>${escapeHtml(doc.description)}</p>${doc.command ? `<div class="code">${escapeHtml(doc.command)}</div>` : ""}</div><a class="btn secondary" href="${escapeHtml(safeUrl(doc.link))}" target="_blank" rel="noopener noreferrer">Open</a></div>`).join("");
}

/* FAQ renderer
   Purpose: Builds FAQ cards from data/faq.json. */
function renderFAQ(items) {
    const grid = $("faqGrid");
    if (!grid) return;
    if (!items.length) {
        renderEmptyState(grid, "No FAQ found", "Add FAQ entries in data/faq.json from Pages CMS.");
        return;
    }
    grid.innerHTML = items.map((faq) => `<div class="faq-item"><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p></div>`).join("");
}


/* ==============================
   Merged from: assets/js/modules/responsive-navigation.js
   ============================== */

/* CyberSabil Responsive Navigation Module v2.8.0
   Purpose: Controls mobile menu toggles for Website and Portfolio headers. */

/* Responsive navigation controller
   Purpose: Adds small-screen menu buttons for Website and Portfolio headers so links never overlap the logo or brand text. */
function setupResponsiveNavigation() {
    if (document.documentElement.dataset.csResponsiveNavigationBound === "true") return;
    document.documentElement.dataset.csResponsiveNavigationBound = "true";
    const navigationSets = [
        { barId: "websiteNavBar", toggleId: "websiteNavToggle", linksSelector: "#websiteNavLinks a", openClass: "cs-mode-website-nav-open" },
        { parentSelector: ".cs-portfolio-nav", toggleId: "portfolioNavToggle", linksSelector: "#csPortfolioNav a", openClass: "cs-portfolio-nav-open" }
    ];

    const closeMenu = (bar, toggle, openClass) => {
        bar?.classList.remove(openClass);
        toggle?.setAttribute("aria-expanded", "false");
    };

    navigationSets.forEach((config) => {
        const bar = config.parentSelector ? document.querySelector(config.parentSelector) : $(config.barId);
        const toggle = $(config.toggleId);
        if (!bar || !toggle) return;
        toggle.addEventListener("click", () => {
            const isOpen = bar.classList.toggle(config.openClass);
            toggle.setAttribute("aria-expanded", String(isOpen));
        });
        document.querySelectorAll(config.linksSelector).forEach((link) => link.addEventListener("click", () => {
            if (window.matchMedia("(max-width: 900px)").matches) closeMenu(bar, toggle, config.openClass);
        }));
        document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(bar, toggle, config.openClass); });
        window.addEventListener("resize", () => { if (window.innerWidth > 900) closeMenu(bar, toggle, config.openClass); });
    });
}


/* ==============================
   Merged from: assets/js/modules/gateway-portfolio.js
   ============================== */

/* CyberSabil Gateway + Portfolio Module v2.8.0
   Purpose: Owns Website/Portfolio mode selection, gateway overlay, portfolio settings and portfolio rendering. */

/* Gateway and portfolio controller
   Purpose: Contains all same-page Website/Portfolio mode logic and all portfolio CMS rendering. */
const CyberSabilGateway = (() => {
    const storageKey = "cybersabil-selected-mode-v28";
    let siteSettings = {};
    let gatewaySettings = {};
    let visualBaseline = {};
    let gatewayAppearance = {};
    let navigationStyle = {};
    let portfolioSettings = {};
    let eventsBound = false;

    /* Group-isolated visual policy
       Purpose: Preserves legacy custom files while allowing layout, appearance, animation and interaction to inherit independently. */
    function useExactGlobalVisualBaseline() {
        return safeChoice(visualBaseline.globalVisualPreset, ["v2.8.3-exact", "section-controlled"], "v2.8.3-exact") === "v2.8.3-exact";
    }

    function legacyGatewayCustom() {
        return !useExactGlobalVisualBaseline()
            && yes(gatewayAppearance.advancedControlsEnabled, true)
            && safeChoice(gatewayAppearance.visualPreset, ["v2.8.3-exact", "custom-advanced"], "v2.8.3-exact") === "custom-advanced";
    }

    function gatewayGroupCustom(groupName) {
        if (useExactGlobalVisualBaseline() || !yes(gatewayAppearance.advancedControlsEnabled, true)) return false;
        const key = `${groupName}ControlMode`;
        if (Object.prototype.hasOwnProperty.call(gatewayAppearance, key)) {
            return safeChoice(gatewayAppearance[key], ["inherit", "custom"], "inherit") === "custom";
        }
        return legacyGatewayCustom();
    }

    function legacyNavigationCustom() {
        return !useExactGlobalVisualBaseline()
            && yes(navigationStyle.advancedControlsEnabled, true)
            && safeChoice(navigationStyle.visualPreset, ["v2.8.3-exact", "custom-advanced"], "v2.8.3-exact") === "custom-advanced";
    }

    function navigationGroupCustom(key) {
        if (useExactGlobalVisualBaseline() || !yes(navigationStyle.advancedControlsEnabled, true)) return false;
        if (Object.prototype.hasOwnProperty.call(navigationStyle, key)) {
            return safeChoice(navigationStyle[key], ["inherit", "custom"], "inherit") === "custom";
        }
        return legacyNavigationCustom();
    }

    const useCustomGatewayLayout = () => gatewayGroupCustom("layout");
    const useCustomGatewayAppearance = () => gatewayGroupCustom("appearance");
    const useCustomGatewayAnimation = () => gatewayGroupCustom("animation");
    const useCustomGatewayInteraction = () => gatewayGroupCustom("interaction");
    const useCustomWebsiteHeader = () => navigationGroupCustom("websiteHeaderControlMode");
    const useCustomPortfolioHeader = () => navigationGroupCustom("portfolioHeaderControlMode");
    const useCustomModeSwitchPosition = () => navigationGroupCustom("modeSwitchPositionControlMode");
    const useCustomModeSwitchAppearance = () => navigationGroupCustom("modeSwitchAppearanceControlMode");
    const useCustomModeSwitchAnimation = () => navigationGroupCustom("modeSwitchAnimationControlMode");
    const useCustomNavigationStyle = () => useCustomWebsiteHeader() || useCustomPortfolioHeader() || useCustomModeSwitchPosition() || useCustomModeSwitchAppearance() || useCustomModeSwitchAnimation();

    function activeGatewayAnimationStyle() {
        return useCustomGatewayAnimation()
            ? (gatewayAppearance.panelAnimation || gatewaySettings.animationStyle || "soft-scale")
            : (gatewaySettings.animationStyle || "soft-scale");
    }
    let modeSwitchPulseTimer = 0;
    let modeSwitchSyncFrame = 0;
    const modeContentTimers = new WeakMap();

    const normalizeMode = (mode) => mode === "portfolio" ? "portfolio" : "website";

    /* Mode availability helper
       Purpose: Centralizes Website/Portfolio enablement checks so invalid CMS combinations cannot produce a blank gateway or empty mode switch. */
    function getEnabledModes() {
        return [
            yes(siteSettings.websiteEnabled) ? "website" : null,
            yes(siteSettings.portfolioEnabled) ? "portfolio" : null
        ].filter(Boolean);
    }

    /* Safe mode fallback
       Purpose: Automatically restores Website mode and shows a visible warning if CMS disables both Website and Portfolio. */
    function ensureModeAvailability() {
        if (getEnabledModes().length) return;
        siteSettings.websiteEnabled = "yes";
        console.warn("CyberSabil mode fallback: both Website and Portfolio were disabled, so Website mode was enabled automatically.");
        const banner = $("csDataStatus");
        if (banner) {
            setText("csDataStatusTitle", "Mode fallback active");
            setText("csDataStatusMessage", "Website mode was enabled automatically because both Website and Portfolio were disabled in CMS settings.");
            banner.hidden = false;
        }
    }


    /* Interaction animation helper
       Purpose: Gives both gateway choices the same click animation before the overlay closes. */
    function animateGatewayChoice(button, mode) {
        if (!button) {
            setMode(mode, { fromUser: true });
            return;
        }
        document.querySelectorAll("[data-cs-mode-choice]").forEach((choice) => choice.classList.remove("cs-gateway-choice-activating"));
        button.classList.add("cs-gateway-choice-activating");
        button.setAttribute("aria-busy", "true");
        window.setTimeout(() => setMode(mode, { fromUser: true }), (activeGatewayAnimationStyle() === "none") ? 0 : 170);
    }

    /* Mode-switch position safety helper
       Purpose: Preserves the requested CMS position when space exists and moves a side switch to the matching bottom corner when a narrow desktop gutter would overlap page content. */
    function resolveSafeDesktopSwitchPosition(switcher) {
        if (!switcher) return "top-right";
        const requested = safeChoice(
            switcher.dataset.csRequestedDesktopPosition || switcher.dataset.csDesktopPosition,
            ["top-left", "top-center", "top-right", "center-left", "center-right", "bottom-left", "bottom-center", "bottom-right"],
            "top-right"
        );
        let effective = requested;

        if (window.innerWidth > 900 && ["center-left", "center-right"].includes(requested) && !switcher.hidden) {
            const activeMode = document.body.dataset.csActiveMode === "portfolio" ? "portfolio" : "website";
            const activeContainer = activeMode === "portfolio"
                ? document.querySelector("#csPortfolioApp .cs-portfolio-nav")
                : document.querySelector("#csWebsiteApp .nav");
            const switchWidth = switcher.getBoundingClientRect().width;
            const offset = clampNumber(navigationStyle.modeSwitchHorizontalOffset, 4, 80, 18);
            if (activeContainer && switchWidth > 0) {
                const containerRect = activeContainer.getBoundingClientRect();
                const gutter = requested === "center-left" ? containerRect.left : window.innerWidth - containerRect.right;
                if (switchWidth + offset + 12 > gutter) {
                    effective = requested === "center-left" ? "bottom-left" : "bottom-right";
                }
            }
        }

        switcher.dataset.csDesktopPosition = effective;
        switcher.dataset.csPositionFallback = effective === requested ? "none" : effective;
        return effective;
    }

    /* Mode-switch body-state helper
       Purpose: Keeps header reserve, side-state and bottom-content spacing synchronized with the effective responsive switch position. */
    function updateModeSwitchPositionState(switcher, desktopPosition = resolveSafeDesktopSwitchPosition(switcher)) {
        const visible = Boolean(switcher && !switcher.hidden);
        document.body.classList.toggle("cs-mode-switch-top-right-visible", visible && desktopPosition === "top-right");
        document.body.classList.toggle("cs-mode-switch-top-left-visible", visible && desktopPosition === "top-left");
        document.body.classList.toggle("cs-mode-switch-bottom-visible", visible && desktopPosition.startsWith("bottom"));
        document.body.classList.toggle("cs-mode-switch-side-left-visible", visible && desktopPosition === "center-left");
        document.body.classList.toggle("cs-mode-switch-side-right-visible", visible && desktopPosition === "center-right");
    }

    /* Mode switch active-state helper
       Purpose: Commits indicator color, button text state and accessibility state in the same animation frame. */
    function commitModeSwitchActiveState(switcher, activeMode) {
        switcher.classList.toggle("cs-mode-switch-active-website", activeMode === "website");
        switcher.classList.toggle("cs-mode-switch-active-portfolio", activeMode === "portfolio");
        switcher.querySelectorAll("[data-cs-mode-switch]").forEach((button) => {
            const isActive = button.getAttribute("data-cs-mode-switch") === activeMode;
            button.classList.toggle("cs-mode-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    /* Mode switch pill position helper
       Purpose: Measures the target button first, then updates indicator position, color and active text together to avoid the one-frame mismatch seen on phones. */
    function syncModeSwitchPill(switcher, activeMode, options = {}) {
        if (!switcher || switcher.hidden) return;
        window.cancelAnimationFrame(modeSwitchSyncFrame);
        modeSwitchSyncFrame = window.requestAnimationFrame(() => {
            const targetButton = switcher.querySelector(`[data-cs-mode-switch="${activeMode}"]:not(.cs-mode-hidden)`);
            if (!targetButton) return;

            const initialized = switcher.dataset.csPillInitialized === "true";
            if (!initialized) switcher.classList.add("cs-mode-switch-syncing");

            switcher.style.setProperty("--cs-switch-pill-left", `${targetButton.offsetLeft}px`);
            switcher.style.setProperty("--cs-switch-pill-width", `${targetButton.offsetWidth}px`);
            commitModeSwitchActiveState(switcher, activeMode);

            /* Exact v2.8.3 branch
               Purpose: Uses the original v2.8.3 pill/header-reserve behavior until custom advanced navigation is explicitly selected. */
            if (!(useCustomModeSwitchPosition() || useCustomModeSwitchAppearance())) {
                const reserveWidth = Math.ceil(switcher.getBoundingClientRect().width + 42);
                document.documentElement.style.setProperty("--cs-mode-switch-header-reserve", `${reserveWidth}px`);
            } else {
                switcher.style.setProperty("--cs-switch-pill-top", `${targetButton.offsetTop}px`);
                switcher.style.setProperty("--cs-switch-pill-height", `${targetButton.offsetHeight}px`);
                const switchRect = switcher.getBoundingClientRect();
                const reserveWidth = Math.ceil(switchRect.width + 42);
                const horizontalOffset = clampNumber(navigationStyle.modeSwitchHorizontalOffset, 4, 80, 18);
                const verticalOffset = clampNumber(navigationStyle.modeSwitchVerticalOffset, 4, 100, 18);
                document.documentElement.style.setProperty("--cs-mode-switch-header-reserve", `${reserveWidth}px`);
                document.documentElement.style.setProperty("--cs-mode-switch-side-safe-space", `${Math.ceil(switchRect.width + horizontalOffset + 20)}px`);
                document.documentElement.style.setProperty("--cs-mode-switch-safe-space", `${Math.ceil(switchRect.height + verticalOffset + 20)}px`);
                updateModeSwitchPositionState(switcher, resolveSafeDesktopSwitchPosition(switcher));
            }

            if (!initialized) {
                switcher.dataset.csPillInitialized = "true";
                window.requestAnimationFrame(() => switcher.classList.remove("cs-mode-switch-syncing"));
            } else if (options.animate) {
                pulseModeSwitch(switcher);
            }
        });
    }

    /* Mode switch settle helper
       Purpose: Replays only a subtle indicator-brightness settle effect; it never translates or scales the complete switch container. */
    function pulseModeSwitch(switcher) {
        if (!switcher) return;
        window.clearTimeout(modeSwitchPulseTimer);
        switcher.classList.remove("cs-mode-switch-just-changed");
        if ((switcher.dataset.csAnimation || "pulse") !== "pulse") return;
        void switcher.offsetWidth;
        switcher.classList.add("cs-mode-switch-just-changed");
        modeSwitchPulseTimer = window.setTimeout(() => switcher.classList.remove("cs-mode-switch-just-changed"), 320);
    }

    /* App transition helper
       Purpose: Animates only the newly visible main content, keeping the header and target background fully opaque to prevent the washed color flash seen on phones. */
    function animateVisibleApp(app) {
        if (!app) return;
        const target = app.querySelector("main") || app;
        const previousTimer = modeContentTimers.get(target);
        if (previousTimer) window.clearTimeout(previousTimer);
        target.classList.remove("cs-mode-animate-in");
        void target.offsetWidth;
        target.classList.add("cs-mode-animate-in");
        const timer = window.setTimeout(() => {
            target.classList.remove("cs-mode-animate-in");
            modeContentTimers.delete(target);
        }, 320);
        modeContentTimers.set(target, timer);
    }

    /* Gateway CSS variable renderer
       Purpose: Applies CMS-controlled blur, darkness and panel width safely. */
    function applyGatewayDesign() {
        const root = document.documentElement;
        const blur = Number(gatewaySettings.backgroundBlur ?? 7);
        const darkness = Number(gatewaySettings.backgroundDarkness ?? .5);
        const legacyWidth = String(gatewaySettings.panelMaxWidth || "680px");
        const panelWidth = /^\d+(\.\d+)?(px|rem|em|vw)$/i.test(legacyWidth) ? legacyWidth : "680px";
        root.style.setProperty("--cs-gateway-blur", `${Math.max(0, Math.min(18, blur))}px`);
        root.style.setProperty("--cs-gateway-darkness", String(Math.max(0, Math.min(.9, darkness))));
        root.style.setProperty("--cs-gateway-panel-width", panelWidth);

        const overlay = $("csGatewayOverlay");
        if (!overlay) return;
        overlay.classList.toggle("cs-gateway-style-solid", (gatewaySettings.stylePreset || "premium-glass") === "solid");
        overlay.classList.toggle("cs-gateway-style-minimal", (gatewaySettings.stylePreset || "premium-glass") === "minimal");
        overlay.classList.toggle("cs-gateway-style-selector", (gatewaySettings.stylePreset || "minimal-selector") === "minimal-selector");
        overlay.classList.toggle("cs-gateway-animation-none", (gatewaySettings.animationStyle || "soft-scale") === "none");
    }

    const gatewayDataAttributes = [
        "csDesktopCardLayout", "csTabletCardLayout", "csMobileCardLayout", "csPanelContentLayout",
        "csPanelAnimation", "csOverlayAnimation", "csWebsiteCardAnimation", "csPortfolioCardAnimation",
        "csCardHover", "csCardClick"
    ];
    const gatewayVariables = [
        "--cs-gateway-desktop-justify", "--cs-gateway-desktop-align", "--cs-gateway-tablet-justify", "--cs-gateway-tablet-align",
        "--cs-gateway-mobile-justify", "--cs-gateway-mobile-align", "--cs-gateway-panel-width", "--cs-gateway-panel-max-height",
        "--cs-gateway-panel-padding", "--cs-gateway-panel-gap", "--cs-gateway-panel-radius", "--cs-gateway-panel-background",
        "--cs-gateway-panel-border", "--cs-gateway-panel-shadow", "--cs-gateway-panel-backdrop", "--cs-gateway-overlay-background",
        "--cs-gateway-overlay-backdrop", "--cs-gateway-blur", "--cs-gateway-darkness", "--cs-gateway-background-brightness", "--cs-gateway-background-saturation", "--cs-gateway-ambient-one",
        "--cs-gateway-ambient-two", "--cs-gateway-ambient-opacity", "--cs-gateway-ambient-blur", "--cs-gateway-title-align",
        "--cs-gateway-title-flex-align", "--cs-gateway-title-grid-align", "--cs-gateway-title-color", "--cs-gateway-title-size",
        "--cs-gateway-title-weight", "--cs-gateway-subtitle-color", "--cs-gateway-subtitle-size", "--cs-gateway-choice-gap",
        "--cs-gateway-card-min-height", "--cs-gateway-card-padding", "--cs-gateway-card-radius", "--cs-gateway-card-border-width",
        "--cs-gateway-card-text-align", "--cs-gateway-card-grid-align", "--cs-gateway-card-content-align", "--cs-gateway-card-shadow",
        "--cs-gateway-card-title-color", "--cs-gateway-card-description-color", "--cs-gateway-website-card-background",
        "--cs-gateway-portfolio-card-background", "--cs-gateway-website-card-border", "--cs-gateway-portfolio-card-border",
        "--cs-gateway-website-accent", "--cs-gateway-portfolio-accent", "--cs-gateway-website-button-start",
        "--cs-gateway-website-button-end", "--cs-gateway-website-button-text", "--cs-gateway-portfolio-button-start",
        "--cs-gateway-portfolio-button-end", "--cs-gateway-portfolio-button-text", "--cs-gateway-button-radius",
        "--cs-gateway-animation-duration", "--cs-gateway-panel-delay", "--cs-gateway-website-delay", "--cs-gateway-portfolio-delay",
        "--cs-gateway-animation-easing", "--cs-gateway-hover-strength", "--cs-gateway-hover-duration"
    ];

    function resetGatewayAdvancedState(overlay, websiteCard, portfolioCard) {
        overlay.classList.remove("cs-gateway-advanced", "cs-gateway-layout-custom", "cs-gateway-appearance-custom", "cs-gateway-animation-custom", "cs-gateway-interaction-custom");
        document.body.classList.remove("cs-gateway-advanced-active", "cs-gateway-appearance-active");
        gatewayDataAttributes.forEach((name) => { delete overlay.dataset[name]; });
        gatewayVariables.forEach((name) => document.documentElement.style.removeProperty(name));
        [websiteCard, portfolioCard].forEach((card) => {
            card?.style.removeProperty("order");
            if (card) delete card.dataset.csButtonStyle;
        });
    }

    /* Advanced Gateway visual renderer
       Purpose: Applies deeply configurable but bounded CMS settings through prefixed classes and CSS variables. Invalid values fall back to the approved v2.8.3 appearance. */
function applyGatewayAppearance() {
        const overlay = $("csGatewayOverlay");
        if (!overlay) return;
        const root = document.documentElement;
        const websiteCard = document.querySelector('[data-cs-mode-choice="website"]');
        const portfolioCard = document.querySelector('[data-cs-mode-choice="portfolio"]');
        resetGatewayAdvancedState(overlay, websiteCard, portfolioCard);
        // Re-apply the legacy Gateway baseline after clearing advanced ownership.
        // This keeps custom → inherit transitions deterministic during live reapplication, not only after a full reload.
        applyGatewayDesign();

        const customLayout = useCustomGatewayLayout();
        const customAppearance = useCustomGatewayAppearance();
        const customAnimation = useCustomGatewayAnimation();
        const customInteraction = useCustomGatewayInteraction();
        if (!(customLayout || customAppearance || customAnimation || customInteraction)) return;
        overlay.classList.add("cs-gateway-advanced");

        if (customLayout) {
            overlay.classList.add("cs-gateway-layout-custom");
            const layouts = ["row", "column"];
            overlay.dataset.csDesktopCardLayout = safeChoice(gatewayAppearance.desktopCardLayout, layouts, "row");
            overlay.dataset.csTabletCardLayout = safeChoice(gatewayAppearance.tabletCardLayout, layouts, "row");
            overlay.dataset.csMobileCardLayout = safeChoice(gatewayAppearance.mobileCardLayout, layouts, "column");
            overlay.dataset.csPanelContentLayout = safeChoice(gatewayAppearance.panelContentLayout, ["stacked", "brand-left", "brand-right"], "stacked");
            const positionToAxes = (value) => {
                const position = safeChoice(value, ["center", "top-left", "top-center", "top-right", "center-left", "center-right", "bottom-left", "bottom-center", "bottom-right"], "center");
                return {
                    vertical: position.startsWith("top") ? "start" : position.startsWith("bottom") ? "end" : "center",
                    horizontal: position.endsWith("left") ? "start" : position.endsWith("right") ? "end" : "center"
                };
            };
            [["desktop", gatewayAppearance.desktopPanelPosition], ["tablet", gatewayAppearance.tabletPanelPosition], ["mobile", gatewayAppearance.mobilePanelPosition]].forEach(([name, value]) => {
                const axes = positionToAxes(value);
                root.style.setProperty(`--cs-gateway-${name}-justify`, axes.horizontal);
                root.style.setProperty(`--cs-gateway-${name}-align`, axes.vertical);
            });
            const websiteFirst = safeChoice(gatewayAppearance.cardOrder, ["website-first", "portfolio-first"], "website-first") === "website-first";
            if (websiteCard) websiteCard.style.order = websiteFirst ? "1" : "2";
            if (portfolioCard) portfolioCard.style.order = websiteFirst ? "2" : "1";
        }

        if (customAppearance) {
            overlay.classList.add("cs-gateway-appearance-custom");
            document.body.classList.add("cs-gateway-appearance-active");
            const panelType = safeChoice(gatewayAppearance.panelBackgroundType, ["glass", "gradient", "solid", "transparent"], "gradient");
            const panelColor = hexToRgba(gatewayAppearance.panelBackgroundColor, gatewayAppearance.panelBackgroundOpacity, "#121f2f");
            const panelGradient = `linear-gradient(${gradientDirection(gatewayAppearance.panelGradientDirection)}, ${hexToRgba(gatewayAppearance.panelGradientStartColor, gatewayAppearance.panelGradientStartOpacity, "#121f2f")}, ${hexToRgba(gatewayAppearance.panelGradientEndColor, gatewayAppearance.panelGradientEndOpacity, "#0a101f")})`;
            const panelBackground = panelType === "transparent" ? "transparent" : panelType === "solid" ? panelColor : panelType === "glass" ? panelColor : panelGradient;
            const panelBorder = yes(gatewayAppearance.panelBorderEnabled, true)
                ? `${clampNumber(gatewayAppearance.panelBorderWidth, 0, 8, 1)}px ${safeChoice(gatewayAppearance.panelBorderStyle, ["solid", "dashed", "dotted"], "solid")} ${hexToRgba(gatewayAppearance.panelBorderColor, gatewayAppearance.panelBorderOpacity, "#ffffff")}`
                : "0 solid transparent";
            const panelShadowParts = shadowValue(gatewayAppearance.panelShadowPreset, "panel") === "none" ? [] : [shadowValue(gatewayAppearance.panelShadowPreset, "panel")];
            if (yes(gatewayAppearance.panelGlowEnabled, false)) panelShadowParts.push(`0 0 48px ${hexToRgba(gatewayAppearance.panelGlowColor, gatewayAppearance.panelGlowOpacity, "#35d7ff")}`);
            if (yes(gatewayAppearance.panelInsetHighlightEnabled, true)) panelShadowParts.push(`inset 0 1px 0 ${hexToRgba("#ffffff", gatewayAppearance.panelInsetHighlightOpacity, "#ffffff")}`);
            root.style.setProperty("--cs-gateway-panel-width", `${clampNumber(gatewayAppearance.panelMaxWidth, 320, 1400, 680)}px`);
            root.style.setProperty("--cs-gateway-panel-max-height", `${clampNumber(gatewayAppearance.panelMaxHeightVh, 50, 98, 92)}dvh`);
            root.style.setProperty("--cs-gateway-panel-padding", `${clampNumber(gatewayAppearance.panelPadding, 8, 72, 28)}px`);
            root.style.setProperty("--cs-gateway-panel-gap", `${clampNumber(gatewayAppearance.panelGap, 0, 64, 18)}px`);
            root.style.setProperty("--cs-gateway-panel-radius", `${clampNumber(gatewayAppearance.panelBorderRadius, 0, 64, 28)}px`);
            root.style.setProperty("--cs-gateway-panel-background", panelBackground);
            root.style.setProperty("--cs-gateway-panel-border", panelBorder);
            root.style.setProperty("--cs-gateway-panel-shadow", panelShadowParts.length ? panelShadowParts.join(", ") : "none");
            root.style.setProperty("--cs-gateway-panel-backdrop", `blur(${clampNumber(gatewayAppearance.panelBackdropBlur, 0, 48, 22)}px) saturate(${clampNumber(gatewayAppearance.panelBackdropSaturation, 50, 220, 135)}%)`);
            root.style.setProperty("--cs-gateway-overlay-background", hexToRgba(gatewayAppearance.overlayColor, gatewayAppearance.overlayDarkness, "#030812"));
            root.style.setProperty("--cs-gateway-overlay-backdrop", `blur(${clampNumber(gatewayAppearance.overlayBackdropBlur, 0, 24, 4)}px)`);
            root.style.setProperty("--cs-gateway-blur", `${clampNumber(gatewayAppearance.websiteBackgroundBlur, 0, 24, 7)}px`);
            root.style.setProperty("--cs-gateway-background-brightness", `${clampNumber(gatewayAppearance.websiteBackgroundBrightness, 20, 120, 81)}%`);
            root.style.setProperty("--cs-gateway-background-saturation", `${clampNumber(gatewayAppearance.websiteBackgroundSaturation, 0, 200, 100)}%`);
            root.style.setProperty("--cs-gateway-ambient-one", safeHexColor(gatewayAppearance.ambientOneColor, "#8b5cf6"));
            root.style.setProperty("--cs-gateway-ambient-two", safeHexColor(gatewayAppearance.ambientTwoColor, "#f7d88a"));
            root.style.setProperty("--cs-gateway-ambient-opacity", yes(gatewayAppearance.showAmbientLights, true) ? String(clampNumber(gatewayAppearance.ambientOpacity, 0, 1, .32)) : "0");
            root.style.setProperty("--cs-gateway-ambient-blur", `${clampNumber(gatewayAppearance.ambientBlur, 0, 80, 34)}px`);
            const titleAlign = safeChoice(gatewayAppearance.titleAlignment, ["left", "center", "right"], "center");
            root.style.setProperty("--cs-gateway-title-align", titleAlign);
            root.style.setProperty("--cs-gateway-title-flex-align", titleAlign === "left" ? "flex-start" : titleAlign === "right" ? "flex-end" : "center");
            root.style.setProperty("--cs-gateway-title-grid-align", titleAlign === "left" ? "start" : titleAlign === "right" ? "end" : "center");
            root.style.setProperty("--cs-gateway-title-color", safeHexColor(gatewayAppearance.titleColor, "#fff8e8"));
            root.style.setProperty("--cs-gateway-title-size", `${clampNumber(gatewayAppearance.titleSize, 20, 72, 42)}px`);
            root.style.setProperty("--cs-gateway-title-weight", String(clampNumber(gatewayAppearance.titleWeight, 400, 950, 800)));
            root.style.setProperty("--cs-gateway-subtitle-color", hexToRgba(gatewayAppearance.subtitleColor, gatewayAppearance.subtitleOpacity, "#ffffff"));
            root.style.setProperty("--cs-gateway-subtitle-size", `${clampNumber(gatewayAppearance.subtitleSize, 11, 30, 15)}px`);
            root.style.setProperty("--cs-gateway-choice-gap", `${clampNumber(gatewayAppearance.choiceGap, 0, 48, 12)}px`);
            root.style.setProperty("--cs-gateway-card-min-height", `${clampNumber(gatewayAppearance.cardMinHeight, 0, 520, 0)}px`);
            root.style.setProperty("--cs-gateway-card-padding", `${clampNumber(gatewayAppearance.cardPadding, 8, 60, 18)}px`);
            root.style.setProperty("--cs-gateway-card-radius", `${clampNumber(gatewayAppearance.cardBorderRadius, 0, 48, 22)}px`);
            root.style.setProperty("--cs-gateway-card-border-width", `${clampNumber(gatewayAppearance.cardBorderWidth, 0, 8, 1)}px`);
            const cardTextAlign = safeChoice(gatewayAppearance.cardTextAlignment, ["left", "center", "right"], "left");
            root.style.setProperty("--cs-gateway-card-text-align", cardTextAlign);
            root.style.setProperty("--cs-gateway-card-grid-align", cardTextAlign === "left" ? "start" : cardTextAlign === "right" ? "end" : "center");
            root.style.setProperty("--cs-gateway-card-content-align", safeChoice(gatewayAppearance.cardContentAlignment, ["start", "center", "end"], "start"));
            const cardShadowParts = shadowValue(gatewayAppearance.cardShadowPreset, "card") === "none" ? [] : [shadowValue(gatewayAppearance.cardShadowPreset, "card")];
            if (yes(gatewayAppearance.cardInsetHighlightEnabled, true)) cardShadowParts.push(`inset 0 1px 0 ${hexToRgba("#ffffff", gatewayAppearance.cardInsetHighlightOpacity, "#ffffff")}`);
            root.style.setProperty("--cs-gateway-card-shadow", cardShadowParts.length ? cardShadowParts.join(", ") : "none");
            root.style.setProperty("--cs-gateway-card-title-color", safeHexColor(gatewayAppearance.cardTitleColor, "#fff8e8"));
            root.style.setProperty("--cs-gateway-card-description-color", hexToRgba(gatewayAppearance.cardDescriptionColor, gatewayAppearance.cardDescriptionOpacity, "#ffffff"));
            const cardBackground = (prefix, fallbackColor) => {
                const type = safeChoice(gatewayAppearance[`${prefix}CardBackgroundType`], ["gradient", "solid", "transparent"], "gradient");
                if (type === "transparent") return "transparent";
                if (type === "solid") return hexToRgba(gatewayAppearance[`${prefix}CardBackgroundColor`], gatewayAppearance[`${prefix}CardBackgroundOpacity`], fallbackColor);
                return `linear-gradient(145deg, ${hexToRgba(gatewayAppearance[`${prefix}CardGradientStartColor`], gatewayAppearance[`${prefix}CardGradientStartOpacity`], "#ffffff")}, ${hexToRgba(gatewayAppearance[`${prefix}CardGradientEndColor`], gatewayAppearance[`${prefix}CardGradientEndOpacity`], "#ffffff")})`;
            };
            root.style.setProperty("--cs-gateway-website-card-background", cardBackground("website", "#102033"));
            root.style.setProperty("--cs-gateway-website-card-border", hexToRgba(gatewayAppearance.websiteCardBorderColor, gatewayAppearance.websiteCardBorderOpacity, "#35d7ff"));
            root.style.setProperty("--cs-gateway-website-accent", safeHexColor(gatewayAppearance.websiteCardAccentColor, "#35d7ff"));
            root.style.setProperty("--cs-gateway-portfolio-card-background", cardBackground("portfolio", "#21152f"));
            root.style.setProperty("--cs-gateway-portfolio-card-border", hexToRgba(gatewayAppearance.portfolioCardBorderColor, gatewayAppearance.portfolioCardBorderOpacity, "#f7d88a"));
            root.style.setProperty("--cs-gateway-portfolio-accent", safeHexColor(gatewayAppearance.portfolioCardAccentColor, "#f7d88a"));
            const setButton = (prefix, fallbackStart, fallbackEnd, fallbackText) => {
                root.style.setProperty(`--cs-gateway-${prefix}-button-start`, safeHexColor(gatewayAppearance[`${prefix}ButtonStartColor`], fallbackStart));
                root.style.setProperty(`--cs-gateway-${prefix}-button-end`, safeHexColor(gatewayAppearance[`${prefix}ButtonEndColor`], fallbackEnd));
                root.style.setProperty(`--cs-gateway-${prefix}-button-text`, safeHexColor(gatewayAppearance[`${prefix}ButtonTextColor`], fallbackText));
                const card = document.querySelector(`[data-cs-mode-choice="${prefix}"]`);
                if (card) card.dataset.csButtonStyle = safeChoice(gatewayAppearance[`${prefix}ButtonStyle`], ["pill", "solid", "outline", "soft", "text"], "pill");
            };
            setButton("website", "#95f1ff", "#35d7ff", "#07111f");
            setButton("portfolio", "#fff2b5", "#c98b2d", "#1a1005");
            root.style.setProperty("--cs-gateway-button-radius", `${clampNumber(gatewayAppearance.buttonBorderRadius, 0, 999, 999)}px`);
        }

        if (customAnimation) {
            overlay.classList.add("cs-gateway-animation-custom");
            overlay.dataset.csPanelAnimation = safeChoice(gatewayAppearance.panelAnimation, ["none", "fade", "soft-scale", "slide-up", "slide-down", "slide-left", "slide-right", "zoom", "blur-in"], "soft-scale");
            overlay.dataset.csOverlayAnimation = safeChoice(gatewayAppearance.overlayAnimation, ["none", "fade", "fade-blur"], "fade-blur");
            overlay.dataset.csWebsiteCardAnimation = safeChoice(gatewayAppearance.websiteCardAnimation, ["none", "fade", "soft-scale", "slide-up", "slide-down", "slide-left", "slide-right", "zoom"], "soft-scale");
            overlay.dataset.csPortfolioCardAnimation = safeChoice(gatewayAppearance.portfolioCardAnimation, ["none", "fade", "soft-scale", "slide-up", "slide-down", "slide-left", "slide-right", "zoom"], "soft-scale");
            root.style.setProperty("--cs-gateway-animation-duration", `${clampNumber(gatewayAppearance.animationDurationMs, 0, 2000, 420)}ms`);
            root.style.setProperty("--cs-gateway-panel-delay", `${clampNumber(gatewayAppearance.panelAnimationDelayMs, 0, 1500, 0)}ms`);
            root.style.setProperty("--cs-gateway-website-delay", `${clampNumber(gatewayAppearance.websiteCardDelayMs, 0, 2000, 120)}ms`);
            root.style.setProperty("--cs-gateway-portfolio-delay", `${clampNumber(gatewayAppearance.portfolioCardDelayMs, 0, 2000, 180)}ms`);
            root.style.setProperty("--cs-gateway-animation-easing", {
                linear: "linear", ease: "ease", "ease-in": "ease-in", "ease-out": "ease-out", "ease-in-out": "ease-in-out",
                smooth: "cubic-bezier(.16, 1, .3, 1)", "spring-soft": "cubic-bezier(.2, 1.25, .35, 1)"
            }[safeChoice(gatewayAppearance.animationEasing, ["linear", "ease", "ease-in", "ease-out", "ease-in-out", "smooth", "spring-soft"], "smooth")]);
        }

        if (customInteraction) {
            overlay.classList.add("cs-gateway-interaction-custom");
            overlay.dataset.csCardHover = safeChoice(gatewayAppearance.cardHoverPreset, ["none", "lift", "scale", "glow", "border-glow", "tilt-soft", "lift-glow"], "lift-glow");
            overlay.dataset.csCardClick = safeChoice(gatewayAppearance.cardClickPreset, ["none", "press", "pulse"], "press");
            root.style.setProperty("--cs-gateway-hover-strength", `${clampNumber(gatewayAppearance.cardHoverStrength, 0, 12, 2)}px`);
            root.style.setProperty("--cs-gateway-hover-duration", `${clampNumber(gatewayAppearance.cardHoverDurationMs, 0, 1000, 200)}ms`);
        }
    }

    const navigationVariables = [
        "--cs-website-header-min-height", "--cs-website-container-width", "--cs-website-header-background", "--cs-website-header-blur",
        "--cs-website-header-border", "--cs-website-header-shadow", "--cs-website-menu-gap", "--cs-website-menu-font-size",
        "--cs-website-menu-text", "--cs-website-menu-hover", "--cs-portfolio-header-min-height", "--cs-portfolio-container-width",
        "--cs-portfolio-header-background", "--cs-portfolio-header-blur", "--cs-portfolio-header-border", "--cs-portfolio-header-shadow",
        "--cs-portfolio-menu-gap", "--cs-portfolio-menu-font-size", "--cs-portfolio-menu-text", "--cs-portfolio-menu-hover",
        "--cs-mode-switch-x-offset", "--cs-mode-switch-y-offset", "--cs-mode-switch-mobile-offset", "--cs-mode-switch-background",
        "--cs-mode-switch-blur", "--cs-mode-switch-border", "--cs-mode-switch-radius", "--cs-mode-switch-shadow",
        "--cs-mode-switch-website-start", "--cs-mode-switch-website-end", "--cs-mode-switch-website-text",
        "--cs-mode-switch-portfolio-start", "--cs-mode-switch-portfolio-end", "--cs-mode-switch-portfolio-text",
        "--cs-mode-switch-inactive-text", "--cs-active-header-height"
    ];

    function clearDataset(node, keys) { if (node) keys.forEach((key) => { delete node.dataset[key]; }); }

    /* Advanced header, navigation and mode-switch renderer
       Purpose: Gives Website and Portfolio independent safe layout controls while preventing raw CSS, invalid colors and unsupported fixed-header behavior. */
function applyNavigationStyle() {
        const root = document.documentElement;
        const websiteApp = $("csWebsiteApp");
        const portfolioApp = $("csPortfolioApp");
        const switcher = $("csModeSwitch");
        websiteApp?.classList.remove("cs-mode-website-header-advanced");
        portfolioApp?.classList.remove("cs-portfolio-header-advanced");
        switcher?.classList.remove("cs-mode-switch-advanced", "cs-mode-switch-position-custom", "cs-mode-switch-appearance-custom", "cs-mode-switch-animation-custom");
        clearDataset(websiteApp, ["csHeaderPosition", "csDesktopLayout", "csMenuAlignment", "csHeaderBackground", "csMenuLinkStyle", "csMobileToggleSide", "csMobileMenuAlignment"]);
        clearDataset(portfolioApp, ["csHeaderPosition", "csDesktopLayout", "csMenuAlignment", "csHeaderBackground", "csMenuLinkStyle", "csMobileToggleSide", "csMobileMenuAlignment"]);
        clearDataset(switcher, ["csRequestedDesktopPosition", "csDesktopPosition", "csMobilePosition", "csOrientation", "csSize", "csAnimation", "csHover", "csPositionFallback"]);
        navigationVariables.forEach((name) => root.style.removeProperty(name));
        document.body.classList.remove("cs-mode-switch-top-left-visible", "cs-mode-switch-bottom-visible", "cs-mode-switch-side-left-visible", "cs-mode-switch-side-right-visible");

        const applyHeader = (prefix, app, defaults) => {
            if (!app) return;
            app.classList.add(prefix === "portfolio" ? "cs-portfolio-header-advanced" : "cs-mode-website-header-advanced");
            app.dataset.csHeaderPosition = safeChoice(navigationStyle[`${prefix}HeaderPosition`], ["static", "sticky"], "sticky");
            app.dataset.csDesktopLayout = safeChoice(navigationStyle[`${prefix}DesktopLayout`], ["brand-left-menu-right", "menu-left-brand-right", "stacked-centered"], "brand-left-menu-right");
            app.dataset.csMenuAlignment = safeChoice(navigationStyle[`${prefix}MenuAlignment`], ["left", "center", "right"], "right");
            app.dataset.csHeaderBackground = safeChoice(navigationStyle[`${prefix}HeaderBackgroundType`], ["glass", "solid", "transparent"], "glass");
            app.dataset.csMenuLinkStyle = safeChoice(navigationStyle[`${prefix}MenuLinkStyle`], ["plain", "pill", "underline"], defaults.linkStyle);
            app.dataset.csMobileToggleSide = safeChoice(navigationStyle[`${prefix}MobileToggleSide`], ["left", "right"], "right");
            app.dataset.csMobileMenuAlignment = safeChoice(navigationStyle[`${prefix}MobileMenuAlignment`], ["left", "center", "right"], "left");
            const backgroundType = app.dataset.csHeaderBackground;
            const background = backgroundType === "transparent" ? "transparent" : hexToRgba(navigationStyle[`${prefix}HeaderBackgroundColor`], backgroundType === "solid" ? 1 : navigationStyle[`${prefix}HeaderBackgroundOpacity`], defaults.background);
            const border = yes(navigationStyle[`${prefix}HeaderBorderEnabled`], true)
                ? `1px solid ${hexToRgba(navigationStyle[`${prefix}HeaderBorderColor`], navigationStyle[`${prefix}HeaderBorderOpacity`], defaults.border)}`
                : "0 solid transparent";
            root.style.setProperty(`--cs-${prefix}-header-min-height`, `${clampNumber(navigationStyle[`${prefix}HeaderMinHeight`], 48, 140, defaults.height)}px`);
            root.style.setProperty(`--cs-${prefix}-container-width`, `${clampNumber(navigationStyle[`${prefix}ContainerMaxWidth`], 720, 1800, 1160)}px`);
            root.style.setProperty(`--cs-${prefix}-header-background`, background);
            root.style.setProperty(`--cs-${prefix}-header-blur`, `${backgroundType === "glass" ? clampNumber(navigationStyle[`${prefix}HeaderBackdropBlur`], 0, 40, defaults.blur) : 0}px`);
            root.style.setProperty(`--cs-${prefix}-header-border`, border);
            root.style.setProperty(`--cs-${prefix}-header-shadow`, shadowValue(navigationStyle[`${prefix}HeaderShadowPreset`], "switch"));
            root.style.setProperty(`--cs-${prefix}-menu-gap`, `${clampNumber(navigationStyle[`${prefix}MenuGap`], 0, 48, defaults.gap)}px`);
            root.style.setProperty(`--cs-${prefix}-menu-font-size`, `${clampNumber(navigationStyle[`${prefix}MenuFontSize`], 11, 24, 14)}px`);
            root.style.setProperty(`--cs-${prefix}-menu-text`, prefix === "portfolio"
                ? hexToRgba(navigationStyle.portfolioMenuTextColor, navigationStyle.portfolioMenuTextOpacity, defaults.text)
                : safeHexColor(navigationStyle.websiteMenuTextColor, defaults.text));
            root.style.setProperty(`--cs-${prefix}-menu-hover`, safeHexColor(navigationStyle[`${prefix}MenuHoverColor`], defaults.hover));
        };
        if (useCustomWebsiteHeader()) applyHeader("website", websiteApp, { background: "#07111f", border: "#ffffff", text: "#aebed4", hover: "#eaf2ff", height: 72, blur: 14, gap: 18, linkStyle: "plain" });
        if (useCustomPortfolioHeader()) applyHeader("portfolio", portfolioApp, { background: "#0d0818", border: "#f5c55c", text: "#fff7e8", hover: "#f8df98", height: 76, blur: 18, gap: 8, linkStyle: "pill" });
        if (!switcher) return;

        if (useCustomModeSwitchPosition()) {
            switcher.classList.add("cs-mode-switch-position-custom");
            switcher.dataset.csRequestedDesktopPosition = safeChoice(navigationStyle.modeSwitchDesktopPosition, ["top-left", "top-center", "top-right", "center-left", "center-right", "bottom-left", "bottom-center", "bottom-right"], "top-right");
            switcher.dataset.csDesktopPosition = switcher.dataset.csRequestedDesktopPosition;
            switcher.dataset.csMobilePosition = safeChoice(navigationStyle.modeSwitchMobilePosition, ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"], "bottom-center");
            switcher.dataset.csOrientation = safeChoice(navigationStyle.modeSwitchOrientation, ["horizontal", "vertical"], "horizontal");
            switcher.dataset.csSize = safeChoice(navigationStyle.modeSwitchSize, ["compact", "standard", "large"], "standard");
            root.style.setProperty("--cs-mode-switch-x-offset", `${clampNumber(navigationStyle.modeSwitchHorizontalOffset, 4, 80, 18)}px`);
            root.style.setProperty("--cs-mode-switch-y-offset", `${clampNumber(navigationStyle.modeSwitchVerticalOffset, 4, 100, 18)}px`);
            root.style.setProperty("--cs-mode-switch-mobile-offset", `${clampNumber(navigationStyle.modeSwitchMobileOffset, 4, 60, 12)}px`);
        }
        if (useCustomModeSwitchAppearance()) {
            switcher.classList.add("cs-mode-switch-appearance-custom");
            root.style.setProperty("--cs-mode-switch-background", hexToRgba(navigationStyle.modeSwitchBackgroundColor, navigationStyle.modeSwitchBackgroundOpacity, "#0a0e1d"));
            root.style.setProperty("--cs-mode-switch-blur", `${clampNumber(navigationStyle.modeSwitchBackdropBlur, 0, 40, 16)}px`);
            root.style.setProperty("--cs-mode-switch-border", `${clampNumber(navigationStyle.modeSwitchBorderWidth, 0, 6, 1)}px solid ${hexToRgba(navigationStyle.modeSwitchBorderColor, navigationStyle.modeSwitchBorderOpacity, "#ffffff")}`);
            root.style.setProperty("--cs-mode-switch-radius", `${clampNumber(navigationStyle.modeSwitchBorderRadius, 0, 999, 999)}px`);
            root.style.setProperty("--cs-mode-switch-shadow", shadowValue(navigationStyle.modeSwitchShadowPreset, "switch"));
            root.style.setProperty("--cs-mode-switch-website-start", safeHexColor(navigationStyle.modeSwitchWebsiteStartColor, "#95f1ff"));
            root.style.setProperty("--cs-mode-switch-website-end", safeHexColor(navigationStyle.modeSwitchWebsiteEndColor, "#35d7ff"));
            root.style.setProperty("--cs-mode-switch-website-text", safeHexColor(navigationStyle.modeSwitchWebsiteTextColor, "#06121d"));
            root.style.setProperty("--cs-mode-switch-portfolio-start", safeHexColor(navigationStyle.modeSwitchPortfolioStartColor, "#f8df98"));
            root.style.setProperty("--cs-mode-switch-portfolio-end", safeHexColor(navigationStyle.modeSwitchPortfolioEndColor, "#c58b2c"));
            root.style.setProperty("--cs-mode-switch-portfolio-text", safeHexColor(navigationStyle.modeSwitchPortfolioTextColor, "#211606"));
            root.style.setProperty("--cs-mode-switch-inactive-text", hexToRgba(navigationStyle.modeSwitchInactiveTextColor, navigationStyle.modeSwitchInactiveTextOpacity, "#ffffff"));
        }
        if (useCustomModeSwitchAnimation()) {
            switcher.classList.add("cs-mode-switch-animation-custom");
            switcher.dataset.csAnimation = safeChoice(navigationStyle.modeSwitchAnimation, ["none", "fade", "soft-scale", "pulse"], "pulse");
            switcher.dataset.csHover = safeChoice(navigationStyle.modeSwitchHoverPreset, ["none", "lift", "glow"], "lift");
        }
        // Reconcile effective position classes and body collision reserves after any live control-group change.
        // This makes custom → inherit and inherit → custom deterministic without requiring a page reload.
        if (!switcher.hidden) renderModeSwitchLabels(document.body.dataset.csActiveMode || "website", { animate: false });
    }

    /* Gateway content renderer
       Purpose: Loads all overlay labels, buttons, chips and notes from data/gateway.json. */
    function renderGatewayContent() {
        setText("csGatewayLogoText", gatewaySettings.logoText || "CS");
        setText("csGatewayEyebrow", gatewaySettings.eyebrow || "CyberSabil");
        setText("csGatewayTitle", gatewaySettings.title || "Choose your mode");
        setText("csGatewaySubtitle", gatewaySettings.subtitle || "Open the tools website or view the portfolio.");
        setText("csGatewayChoiceLabel", gatewaySettings.choiceLabel || "Select a mode");
        setText("csGatewayChipOne", gatewaySettings.chipOne || "IT Tools");
        setText("csGatewayChipTwo", gatewaySettings.chipTwo || "PowerShell");
        setText("csGatewayChipThree", gatewaySettings.chipThree || "Portfolio");
        setText("csGatewayFooterNote", gatewaySettings.footerNote || "Same homepage. No extra pages.");

        setText("csGatewayWebsiteIcon", gatewaySettings.websiteIcon || "🛠️");
        setText("csGatewayWebsiteKicker", gatewaySettings.websiteKicker || "Website mode");
        setText("csGatewayWebsiteTitle", gatewaySettings.websiteTitle || "Website");
        setText("csGatewayWebsiteDescription", gatewaySettings.websiteDescription || "Tools, downloads, docs and commands.");
        setText("csGatewayWebsiteButtonText", gatewaySettings.websiteButtonText || "Open Website");

        setText("csGatewayPortfolioIcon", gatewaySettings.portfolioIcon || "✨");
        setText("csGatewayPortfolioKicker", gatewaySettings.portfolioKicker || "Portfolio mode");
        setText("csGatewayPortfolioTitle", gatewaySettings.portfolioTitle || "Portfolio");
        setText("csGatewayPortfolioDescription", gatewaySettings.portfolioDescription || "Profile, skills, projects and contact.");
        setText("csGatewayPortfolioButtonText", gatewaySettings.portfolioButtonText || "View Portfolio");

        const overlay = $("csGatewayOverlay");
        overlay?.classList.toggle("cs-gateway-show-logo-row", yes(gatewaySettings.showLogoRow, false));
        overlay?.classList.toggle("cs-gateway-show-choice-label", yes(gatewaySettings.showChoiceLabel, false));
        overlay?.classList.toggle("cs-gateway-show-card-icons", yes(gatewaySettings.showCardIcons, false));
        overlay?.classList.toggle("cs-gateway-show-card-kickers", yes(gatewaySettings.showCardKickers, false));

        $("csGatewaySubtitle")?.classList.toggle("cs-mode-hidden", !yes(gatewaySettings.showSubtitle, true));
        $("csGatewayChips")?.classList.toggle("cs-mode-hidden", !yes(gatewaySettings.showChips, false));
        $("csGatewayFooterNote")?.classList.toggle("cs-mode-hidden", !yes(gatewaySettings.showFooterNote, false));
        $("csGatewayWebsiteDescription")?.classList.toggle("cs-mode-hidden", !yes(gatewaySettings.showCardDescriptions, true));
        $("csGatewayPortfolioDescription")?.classList.toggle("cs-mode-hidden", !yes(gatewaySettings.showCardDescriptions, true));
        $("csGatewayWebsiteButtonText")?.classList.toggle("cs-mode-hidden", !yes(gatewaySettings.showCardButtons, true));
        $("csGatewayPortfolioButtonText")?.classList.toggle("cs-mode-hidden", !yes(gatewaySettings.showCardButtons, true));

        document.querySelectorAll("[data-cs-mode-choice='website']").forEach((button) => button.classList.toggle("cs-mode-hidden", !yes(siteSettings.websiteEnabled)));
        document.querySelectorAll("[data-cs-mode-choice='portfolio']").forEach((button) => button.classList.toggle("cs-mode-hidden", !yes(siteSettings.portfolioEnabled)));
    }

    /* Mode switch renderer
       Purpose: Applies CMS labels and top-right/bottom-right position to the persistent switch. */
    function renderModeSwitchLabels(activeMode, options = {}) {
        const switcher = $("csModeSwitch");
        if (!switcher) return;
        const customNavigation = useCustomModeSwitchPosition() && switcher.classList.contains("cs-mode-switch-position-custom");
        const desktopPosition = customNavigation
            ? resolveSafeDesktopSwitchPosition(switcher)
            : ((siteSettings.modeSwitchPosition || "top-right") === "bottom-right" ? "bottom-right" : "top-right");
        const usesTopRightPosition = desktopPosition === "top-right";
        switcher.classList.toggle("cs-mode-switch-top-right", usesTopRightPosition);
        switcher.classList.toggle("cs-mode-switch-bottom-right", desktopPosition === "bottom-right");
        if (customNavigation) {
            updateModeSwitchPositionState(switcher, desktopPosition);
        } else {
            document.body.classList.toggle("cs-mode-switch-top-right-visible", !switcher.hidden && usesTopRightPosition);
            document.body.classList.remove("cs-mode-switch-top-left-visible", "cs-mode-switch-bottom-visible", "cs-mode-switch-side-left-visible", "cs-mode-switch-side-right-visible");
        }

        switcher.querySelectorAll("[data-cs-mode-switch]").forEach((button) => {
            const mode = button.getAttribute("data-cs-mode-switch");
            button.textContent = mode === "portfolio" ? (siteSettings.modeSwitchPortfolioLabel || "Portfolio") : (siteSettings.modeSwitchWebsiteLabel || "Website");
            button.classList.toggle("cs-mode-hidden", mode === "portfolio" ? !yes(siteSettings.portfolioEnabled) : !yes(siteSettings.websiteEnabled));
        });

        syncModeSwitchPill(switcher, activeMode, { animate: options.animate === true });
    }

    /* Mode setter
       Purpose: Shows Website or Portfolio, removes overlay blur, updates switch state and optionally remembers visitor choice. */
    function setMode(mode, options = {}) {
        let selectedMode = normalizeMode(mode);
        if (selectedMode === "portfolio" && !yes(siteSettings.portfolioEnabled)) selectedMode = "website";
        if (selectedMode === "website" && !yes(siteSettings.websiteEnabled) && yes(siteSettings.portfolioEnabled)) selectedMode = "portfolio";

        const websiteApp = $("csWebsiteApp");
        const portfolioApp = $("csPortfolioApp");
        const overlay = $("csGatewayOverlay");
        const switcher = $("csModeSwitch");
        if (!websiteApp || !portfolioApp) return;

        document.body.classList.remove("cs-mode-gateway-open");
        document.body.dataset.csActiveMode = selectedMode;
        if (useCustomWebsiteHeader() || useCustomPortfolioHeader() || useCustomModeSwitchPosition()) {
            document.documentElement.style.setProperty(
                "--cs-active-header-height",
                `${selectedMode === "portfolio"
                    ? clampNumber(navigationStyle.portfolioHeaderMinHeight, 48, 140, 76)
                    : clampNumber(navigationStyle.websiteHeaderMinHeight, 48, 140, 72)}px`
            );
        } else {
            document.documentElement.style.removeProperty("--cs-active-header-height");
        }
        websiteApp.classList.remove("cs-mode-background-blur");

        /* Stable mode transition order
           Purpose: Resets scroll before the target content animation so deep-page switches do not show an intermediate offset frame. */
        document.documentElement.style.scrollBehavior = "auto";
        websiteApp.hidden = selectedMode === "portfolio";
        portfolioApp.hidden = selectedMode !== "portfolio";
        window.scrollTo({ top: 0, left: 0 });
        animateVisibleApp(selectedMode === "portfolio" ? portfolioApp : websiteApp);

        if (overlay && !overlay.hidden) {
            overlay.classList.add("cs-gateway-hide");
            window.setTimeout(() => {
                overlay.hidden = true;
                overlay.setAttribute("aria-hidden", "true");
            }, (activeGatewayAnimationStyle() === "none") ? 0 : 280);
        }

        if (switcher) {
            const showSwitch = yes(siteSettings.showModeSwitch) && getEnabledModes().length >= 2;
            switcher.hidden = !showSwitch;
            document.body.classList.toggle("cs-mode-switch-visible", showSwitch);
            renderModeSwitchLabels(selectedMode, { animate: options.fromUser === true });
        } else {
            document.body.classList.remove("cs-mode-switch-visible", "cs-mode-switch-top-right-visible", "cs-mode-switch-top-left-visible", "cs-mode-switch-bottom-visible", "cs-mode-switch-side-left-visible", "cs-mode-switch-side-right-visible");
        }

        if (options.fromUser && yes(siteSettings.rememberVisitorChoice, false)) {
            try { localStorage.setItem(storageKey, selectedMode); } catch (error) { console.warn("Mode storage failed", error); }
        }

        window.setTimeout(() => { document.documentElement.style.scrollBehavior = "smooth"; }, 0);
    }

    /* Gateway shower
       Purpose: Displays the overlay only when CMS settings say it should be shown. */
    function showGateway() {
        const websiteApp = $("csWebsiteApp");
        const portfolioApp = $("csPortfolioApp");
        const overlay = $("csGatewayOverlay");
        const switcher = $("csModeSwitch");

        document.body.classList.add("cs-mode-gateway-open");
        document.body.classList.remove("cs-mode-switch-visible", "cs-mode-switch-top-right-visible", "cs-mode-switch-top-left-visible", "cs-mode-switch-bottom-visible", "cs-mode-switch-side-left-visible", "cs-mode-switch-side-right-visible");
        if (websiteApp) {
            websiteApp.hidden = false;
            websiteApp.classList.add("cs-mode-background-blur");
        }
        if (portfolioApp) portfolioApp.hidden = true;
        if (overlay) {
            overlay.hidden = false;
            overlay.classList.remove("cs-gateway-hide", "cs-gateway-navigation-snapshot");
            overlay.setAttribute("aria-hidden", "false");
            window.setTimeout(() => overlay.querySelector(".cs-gateway-panel")?.focus({ preventScroll: true }), 80);
        }
        if (switcher) switcher.hidden = true;
    }

    /* Initial mode resolver
       Purpose: Decides whether to show the gateway or directly open Website/Portfolio based on CMS, URL and localStorage. */
    function resolveInitialMode() {
        const enabledModes = getEnabledModes();
        const onlyEnabledMode = enabledModes[0] || "website";
        const params = new URLSearchParams(window.location.search);
        const urlMode = params.get("mode");

        if (yes(siteSettings.enableUrlModeOverride) && ["website", "portfolio", "gateway"].includes(urlMode)) {
            if (urlMode === "gateway") return enabledModes.length === 2 ? "gateway" : onlyEnabledMode;
            return enabledModes.includes(urlMode) ? urlMode : onlyEnabledMode;
        }

        if (yes(siteSettings.rememberVisitorChoice, false)) {
            try {
                const remembered = localStorage.getItem(storageKey);
                if (enabledModes.includes(remembered)) return remembered;
            } catch (error) {
                console.warn("Mode storage read failed", error);
            }
        }

        if (enabledModes.length < 2) return onlyEnabledMode;
        if (!yes(siteSettings.gatewayEnabled)) {
            const requestedMode = normalizeMode(siteSettings.defaultMode || "website");
            return enabledModes.includes(requestedMode) ? requestedMode : onlyEnabledMode;
        }
        return ["gateway", "website", "portfolio"].includes(siteSettings.defaultMode) ? siteSettings.defaultMode : "gateway";
    }

    /* Portfolio settings renderer
       Purpose: Applies CMS-controlled portfolio labels, theme, navigation, section visibility and footer text. */
    function applyPortfolioSettings() {
        const app = $("csPortfolioApp");
        if (app) {
            app.classList.toggle("cs-portfolio-theme-midnight", (portfolioSettings.themePreset || "purple-gold") === "midnight");
            app.classList.toggle("cs-portfolio-layout-compact", (portfolioSettings.layoutPreset || "professional") === "compact");
            app.classList.toggle("cs-portfolio-layout-professional", (portfolioSettings.layoutPreset || "professional") === "professional");
        }

        setText("csPortfolioBrandText", portfolioSettings.brandText || "CyberSabil Portfolio");
        setText("csPortfolioNavSkills", portfolioSettings.navSkillsLabel || "Skills");
        setText("csPortfolioNavProjects", portfolioSettings.navProjectsLabel || "Projects");
        setText("csPortfolioNavTimeline", portfolioSettings.navTimelineLabel || "Timeline");
        setText("csPortfolioNavServices", portfolioSettings.navServicesLabel || "Services");
        setText("csPortfolioNavContact", portfolioSettings.navContactLabel || "Contact");

        setText("csPortfolioSkillsEyebrow", portfolioSettings.skillsEyebrow || "Core strengths");
        setText("csPortfolioSkillsTitle", portfolioSettings.skillsTitle || "Skills");
        setText("csPortfolioSkillsSubtitle", portfolioSettings.skillsSubtitle || "Focused capabilities for Windows support automation and practical deployment workflows.");
        setText("csPortfolioProjectsEyebrow", portfolioSettings.projectsEyebrow || "Selected work");
        setText("csPortfolioProjectsTitle", portfolioSettings.projectsTitle || "Projects");
        setText("csPortfolioProjectsSubtitle", portfolioSettings.projectsSubtitle || "Production-ready and planned tools built around real Windows support problems.");
        setText("csPortfolioTimelineEyebrow", portfolioSettings.timelineEyebrow || "Progress path");
        setText("csPortfolioTimelineTitle", portfolioSettings.timelineTitle || "Timeline");
        setText("csPortfolioTimelineSubtitle", portfolioSettings.timelineSubtitle || "A short view of how CyberSabil systems are growing over time.");
        setText("csPortfolioServicesEyebrow", portfolioSettings.servicesEyebrow || "How I can help");
        setText("csPortfolioServicesTitle", portfolioSettings.servicesTitle || "Services");
        setText("csPortfolioServicesSubtitle", portfolioSettings.servicesSubtitle || "Clear support areas for automation, troubleshooting, documentation and web deployment.");
        setText("csPortfolioContactEyebrow", portfolioSettings.contactEyebrow || "Contact");
        setText("csPortfolioFooterText", portfolioSettings.footerText || "CyberSabil Portfolio • Windows automation and IT support utilities");

        $("csPortfolioNav")?.classList.toggle("cs-mode-hidden", !yes(portfolioSettings.showNavigation));
        $("csPortfolioHero")?.classList.toggle("cs-mode-hidden", !yes(portfolioSettings.showHero));
        $("csPortfolioProfileCard")?.classList.toggle("cs-mode-hidden", !yes(portfolioSettings.showProfileCard));
        $("csPortfolioSkills")?.classList.toggle("cs-mode-hidden", !yes(portfolioSettings.showSkillsSection));
        $("csPortfolioProjects")?.classList.toggle("cs-mode-hidden", !yes(portfolioSettings.showProjectsSection));
        $("csPortfolioTimeline")?.classList.toggle("cs-mode-hidden", !yes(portfolioSettings.showTimelineSection));
        $("csPortfolioServices")?.classList.toggle("cs-mode-hidden", !yes(portfolioSettings.showServicesSection));
        $("csPortfolioContact")?.classList.toggle("cs-mode-hidden", !yes(portfolioSettings.showContactSection));
    }

    /* Portfolio card renderers
       Purpose: Build skill, project and service cards from their CMS JSON files. */
    function renderPortfolioSkills(items) {
        const grid = $("csPortfolioSkillsGrid");
        if (!grid) return;
        if (!items.length) {
            renderEmptyState(grid, "No portfolio skills found", "Add portfolio skills in data/portfolio-skills.json from Pages CMS.");
            return;
        }
        grid.innerHTML = items.map((item) => `
            <article class="cs-portfolio-card">
                <span class="cs-portfolio-card-label">${escapeHtml(item.category || item.level || "Skill")}</span>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description)}</p>
                ${item.level ? `<p class="cs-portfolio-project-tech"><strong>Level:</strong> ${escapeHtml(item.level)}</p>` : ""}
            </article>
        `).join("");
    }

    function renderPortfolioProjects(items) {
        const grid = $("csPortfolioProjectsGrid");
        if (!grid) return;
        if (!items.length) {
            renderEmptyState(grid, "No portfolio projects found", "Add portfolio projects in data/portfolio-projects.json from Pages CMS.");
            return;
        }
        grid.innerHTML = items.map((item) => `
            <article class="cs-portfolio-project-card">
                ${item.image ? `<img class="cs-portfolio-project-image" src="${escapeHtml(safeUrl(item.image))}" alt="${escapeHtml(item.imageAlt || item.title || "Project preview")}" loading="lazy">` : ""}
                <span class="cs-portfolio-project-status">${escapeHtml(item.status || "Project")}</span>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description)}</p>
                <p class="cs-portfolio-project-tech"><strong>${escapeHtml(item.category || "Tech")}</strong> · ${escapeHtml(item.tech)}</p>
                ${item.link && yes(portfolioSettings.showProjectLinks) ? `<a class="cs-portfolio-project-link" href="${escapeHtml(safeUrl(item.link))}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.buttonText || portfolioSettings.projectLinkLabel || "View project →")}</a>` : ""}
            </article>
        `).join("");
    }

    function renderPortfolioServices(items) {
        const grid = $("csPortfolioServicesGrid");
        if (!grid) return;
        if (!items.length) {
            renderEmptyState(grid, "No portfolio services found", "Add services in data/services.json from Pages CMS.");
            return;
        }
        grid.innerHTML = items.map((item) => `
            <article class="cs-portfolio-card">
                <span class="cs-portfolio-card-label">${escapeHtml(item.icon || "Service")}</span>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description)}</p>
            </article>
        `).join("");
    }

    /* Portfolio timeline renderer
       Purpose: Builds the new CMS-controlled timeline section from data/portfolio-timeline.json without adding a framework. */
    function renderPortfolioTimeline(items) {
        const list = $("csPortfolioTimelineList");
        if (!list) return;
        if (!items.length) {
            renderEmptyState(list, "No timeline entries found", "Add timeline entries in data/portfolio-timeline.json from Pages CMS.");
            return;
        }
        list.innerHTML = items.map((item) => `
            <article class="cs-portfolio-timeline-item">
                <div class="cs-portfolio-timeline-marker" aria-hidden="true"></div>
                <div class="cs-portfolio-timeline-card">
                    <span class="cs-portfolio-card-label">${escapeHtml(item.period || item.status || "Timeline")}</span>
                    <h3>${escapeHtml(item.title)}</h3>
                    ${item.status ? `<p class="cs-portfolio-project-tech"><strong>Status:</strong> ${escapeHtml(item.status)}</p>` : ""}
                    <p>${escapeHtml(item.description)}</p>
                </div>
            </article>
        `).join("");
    }

    /* Portfolio renderer
       Purpose: Loads profile, skills, projects, services and contact data and paints the portfolio mode. */
    async function renderPortfolio() {
        const [profile, skills, projects, timeline, services, contact] = await Promise.all([
            loadJson("data/profile.json", CS_FALLBACK.profile),
            loadJson("data/portfolio-skills.json", []),
            loadJson("data/portfolio-projects.json", []),
            loadJson("data/portfolio-timeline.json", []),
            loadJson("data/services.json", []),
            loadJson("data/contact.json", CS_FALLBACK.contact)
        ]);

        setText("csPortfolioInitials", profile.initials || "CS");
        setText("csPortfolioAvatar", profile.initials || "CS");
        setText("csPortfolioName", profile.name || "CyberSabil");
        setText("csPortfolioCardName", profile.name || "CyberSabil");
        setText("csPortfolioRole", profile.role || "Windows IT Support Automation Specialist");
        setText("csPortfolioTagline", profile.tagline || "");
        setText("csPortfolioAvailability", profile.availability || "Available for IT support automation");
        setText("csPortfolioLocation", profile.location || "");
        setText("csPortfolioExperience", profile.experience || "");
        setText("csPortfolioBio", profile.bio || "");
        setText("csPortfolioStatOneValue", profile.statOneValue || "24/7");
        setText("csPortfolioStatOneLabel", profile.statOneLabel || "Support mindset");
        setText("csPortfolioStatTwoValue", profile.statTwoValue || "100%");
        setText("csPortfolioStatTwoLabel", profile.statTwoLabel || "Practical tools");
        setLink("csPortfolioPrimaryCta", profile.primaryCtaLink || "#csPortfolioProjects", profile.primaryCtaText || "View projects");
        setLink("csPortfolioSecondaryCta", profile.secondaryCtaLink || "#csPortfolioContact", profile.secondaryCtaText || "Contact");

        renderPortfolioSkills(Array.isArray(skills) ? skills : []);
        renderPortfolioProjects(Array.isArray(projects) ? projects : []);
        renderPortfolioTimeline(Array.isArray(timeline) ? timeline : []);
        renderPortfolioServices(Array.isArray(services) ? services : []);

        setText("csPortfolioContactHeading", contact.heading || "Let’s build reliable IT support tools");
        setText("csPortfolioContactDescription", contact.description || "");
        setText("csPortfolioEmailLabel", contact.emailLabel || "Email:");
        setText("csPortfolioGithubLabel", contact.githubLabel || "GitHub:");
        setText("csPortfolioWebsiteLabel", contact.websiteLabel || "Website:");
        const email = String(contact.email || "").trim();
        const hasPublicEmail = Boolean(email) && !/add your email/i.test(email);
        const emailRow = $("csPortfolioEmailRow");
        if (emailRow) emailRow.hidden = !hasPublicEmail;
        if (hasPublicEmail) setLink("csPortfolioEmail", `mailto:${email}`, email);
        setLink("csPortfolioGithub", contact.githubLink || "https://github.com/cybersabil", contact.githubText || "github.com/cybersabil");
        setLink("csPortfolioWebsite", contact.websiteLink || "https://cybersabil.github.io/", contact.websiteText || "cybersabil.github.io");
        setLink("csPortfolioContactCta", contact.ctaLink || "https://github.com/cybersabil", contact.ctaText || "Open GitHub");
    }

    /* Reload snapshot preparation
       Purpose: Restores the same blurred Gateway frame just before a reload/navigation when the next load is expected to open the Gateway, reducing the clear-Website flash seen on mobile Chrome. */
    function prepareGatewaySnapshotForNavigation() {
        if (resolveInitialMode() !== "gateway") return;
        const websiteApp = $("csWebsiteApp");
        const portfolioApp = $("csPortfolioApp");
        const overlay = $("csGatewayOverlay");
        const switcher = $("csModeSwitch");

        document.body.classList.add("cs-mode-gateway-open");
        document.body.classList.remove("cs-mode-switch-visible", "cs-mode-switch-top-right-visible", "cs-mode-switch-top-left-visible", "cs-mode-switch-bottom-visible", "cs-mode-switch-side-left-visible", "cs-mode-switch-side-right-visible");
        if (websiteApp) {
            websiteApp.hidden = false;
            websiteApp.classList.add("cs-mode-background-blur");
        }
        if (portfolioApp) portfolioApp.hidden = true;
        if (switcher) switcher.hidden = true;
        if (overlay) {
            overlay.hidden = false;
            overlay.classList.remove("cs-gateway-hide");
            overlay.classList.add("cs-gateway-navigation-snapshot");
            overlay.setAttribute("aria-hidden", "false");
        }
    }

    /* Back-forward cache recovery
       Purpose: Removes the temporary no-animation snapshot class when a browser restores the page from memory. */
    function restoreFromPageCache(event) {
        const overlay = $("csGatewayOverlay");
        overlay?.classList.remove("cs-gateway-navigation-snapshot");
        if (!event.persisted) return;
        const nextMode = resolveInitialMode();
        if (nextMode === "gateway") showGateway();
        else setMode(nextMode, { fromUser: false });
    }

    /* Event binder
       Purpose: Connects overlay choice buttons, persistent switch buttons and optional Escape-key behavior. */
function bindEvents() {
        if (eventsBound) return;
        eventsBound = true;
        document.querySelectorAll("[data-cs-mode-choice]").forEach((button) => {
            button.addEventListener("click", () => animateGatewayChoice(button, button.getAttribute("data-cs-mode-choice")));
        });
        document.querySelectorAll("[data-cs-mode-switch]").forEach((button) => {
            button.addEventListener("click", () => setMode(button.getAttribute("data-cs-mode-switch"), { fromUser: true }));
        });
        window.addEventListener("resize", () => {
            const switcher = $("csModeSwitch");
            if (!switcher || switcher.hidden) return;
            renderModeSwitchLabels(document.body.dataset.csActiveMode || "website", { animate: false });
        });
        window.addEventListener("beforeunload", prepareGatewaySnapshotForNavigation);
        window.addEventListener("pagehide", prepareGatewaySnapshotForNavigation);
        window.addEventListener("pageshow", restoreFromPageCache);
        document.addEventListener("keydown", (event) => {
            const overlay = $("csGatewayOverlay");
            if (event.key === "Escape" && overlay && !overlay.hidden && yes(siteSettings.allowGatewayCloseWithEscape)) {
                setMode(siteSettings.escapeFallbackMode || "website", { fromUser: true });
            }
        });
    }

    /* Boot function
       Purpose: Runs after the existing website has rendered and then starts the CMS-controlled gateway experience. */
function boot(settingsData, gatewayData, visualBaselineData, gatewayAppearanceData, navigationStyleData, portfolioData) {
        siteSettings = settingsData || {};
        gatewaySettings = gatewayData || {};
        visualBaseline = visualBaselineData || {};
        gatewayAppearance = gatewayAppearanceData || {};
        navigationStyle = navigationStyleData || {};
        portfolioSettings = portfolioData || {};
        ensureModeAvailability();
        applyGatewayDesign();
        applyGatewayAppearance();
        applyNavigationStyle();
        renderGatewayContent();
        applyPortfolioSettings();
        bindEvents();
        return resolveInitialMode();
    }

    function activateInitialMode(initialMode) {
        if (initialMode === "gateway") showGateway();
        else setMode(initialMode, { fromUser: false });
    }

    return { boot, activateInitialMode, renderPortfolio };
})();


/* ==============================
   App initializer
   ============================== */

async function loadWebsiteContent(siteSettings, generation) {
    const [tools, downloads, projects, skills, docs, faq] = await Promise.all([
        loadJson("data/tools.json", []), loadJson("data/downloads.json", []), loadJson("data/projects.json", []),
        loadJson("data/skills.json", []), loadJson("data/docs.json", []), loadJson("data/faq.json", [])
    ]);
    if (generation !== csBootGeneration) return;
    renderTools(Array.isArray(tools) ? tools : [], siteSettings);
    renderDownloads(Array.isArray(downloads) ? downloads : []);
    renderProjects(Array.isArray(projects) ? projects : []);
    renderSkills(Array.isArray(skills) ? skills : []);
    renderDocs(Array.isArray(docs) ? docs : []);
    renderFAQ(Array.isArray(faq) ? faq : []);
    addCopyButtons(siteSettings);
}

function scheduleInactiveModeLoad(initialMode, siteSettings, generation) {
    const run = async () => {
        if (generation !== csBootGeneration) return;
        try {
            if (initialMode === "portfolio") await loadWebsiteContent(siteSettings, generation);
            else await CyberSabilGateway.renderPortfolio();
            renderDataFallbackStatus(siteSettings);
        } catch (error) {
            console.warn("CyberSabil background content load failed:", error);
            renderDataFallbackStatus(siteSettings);
        }
    };
    if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 1800 });
    else window.setTimeout(run, 0);
}

async function init() {
    if (csInitPromise) return csInitPromise;
    const generation = ++csBootGeneration;
    csInitPromise = (async () => {
        const inline = readInlineCriticalConfig();
        setBootPhase("applying", "Applying the current CyberSabil configuration…");
        const inlineConfig = inline.config || {};
        const [site, design, siteSettings, sections, seo, gateway, visualBaseline, gatewayAppearance, navigationStyle, portfolioSettings, runtimeManifest] = await Promise.all([
            loadJson("data/site.json", inlineConfig.site || CS_FALLBACK.site),
            loadJson("data/design.json", inlineConfig.design || CS_FALLBACK.design),
            loadJson("data/site-settings.json", inlineConfig.siteSettings || CS_FALLBACK.siteSettings),
            loadJson("data/sections.json", inlineConfig.sections || CS_FALLBACK.sections),
            loadJson("data/seo.json", inlineConfig.seo || CS_FALLBACK.seo),
            loadJson("data/gateway.json", inlineConfig.gateway || CS_FALLBACK.gateway),
            loadJson("data/visual-baseline.json", inlineConfig.visualBaseline || CS_FALLBACK.visualBaseline),
            loadJson("data/gateway-appearance.json", inlineConfig.gatewayAppearance || CS_FALLBACK.gatewayAppearance),
            loadJson("data/navigation-style.json", inlineConfig.navigationStyle || CS_FALLBACK.navigationStyle),
            loadJson("data/portfolio-settings.json", inlineConfig.portfolioSettings || CS_FALLBACK.portfolioSettings),
            loadJson("data/runtime-manifest.json", { release: `v${CS_ASSET_VERSION}`, schemaVersion: CS_SCHEMA_VERSION, revision: inline.revision || "runtime" })
        ]);
        if (generation !== csBootGeneration) return;
        if (runtimeManifest.schemaVersion && runtimeManifest.schemaVersion !== CS_SCHEMA_VERSION) {
            throw new Error(`Incompatible CMS schema ${runtimeManifest.schemaVersion}; expected ${CS_SCHEMA_VERSION}`);
        }
        if (inline.revision && runtimeManifest.revision && inline.revision !== runtimeManifest.revision) {
            const revisionError = new Error(`Deployment revision mismatch: HTML ${inline.revision}, runtime ${runtimeManifest.revision}`);
            console.error("CyberSabil mixed-revision deployment blocked before reveal.", revisionError);
            throw revisionError;
        }
        applySeo(seo, site);
        applyDesign(design);
        renderSite(site);
        renderSections(sections);
        applySiteSettings(siteSettings);
        setupResponsiveNavigation();
        const initialMode = CyberSabilGateway.boot(siteSettings, gateway, visualBaseline, gatewayAppearance, navigationStyle, portfolioSettings);
        if (initialMode === "portfolio") await CyberSabilGateway.renderPortfolio();
        else await loadWebsiteContent(siteSettings, generation);
        if (generation !== csBootGeneration) return;
        CyberSabilGateway.activateInitialMode(initialMode);
        renderDataFallbackStatus(siteSettings);
        await revealPreparedPage();
        scheduleInactiveModeLoad(initialMode, siteSettings, generation);
    })().catch((error) => {
        revealFatalFallback(error);
        throw error;
    });
    return csInitPromise;
}

init().catch(() => {});

