#!/usr/bin/env node
/* CyberSabil local validation script v2.9.2
   Purpose: Performs dependency-free structural, syntax, CMS, fallback, SEO and deployment checks before GitHub Pages upload.
   Note: Browser interaction and visual responsive testing are still required because a static validator cannot measure rendered layouts. */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const releaseVersion = '2.9.2';
const expectedDomain = 'https://cybersabil.github.io/';
const errors = [];
const warnings = [];

function absolutePath(relativePath) {
  return path.join(root, relativePath);
}

function readFile(relativePath) {
  const filePath = absolutePath(relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function parseJson(relativePath) {
  const raw = readFile(relativePath);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    errors.push(`Invalid JSON in ${relativePath}: ${error.message}`);
    return null;
  }
}

function extractJavaScriptObject(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    errors.push(`JavaScript object marker not found: ${marker}`);
    return null;
  }
  const start = source.indexOf('{', markerIndex + marker.length);
  if (start < 0) {
    errors.push(`JavaScript object start not found after: ${marker}`);
    return null;
  }

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        const objectSource = source.slice(start, index + 1);
        try {
          return new Function(`"use strict"; return (${objectSource});`)();
        } catch (error) {
          errors.push(`Unable to parse JavaScript object after ${marker}: ${error.message}`);
          return null;
        }
      }
    }
  }
  errors.push(`JavaScript object after ${marker} is not balanced.`);
  return null;
}

function checkRequiredFiles() {
  const required = [
    'index.html', '.pages.yml', '404.html', 'robots.txt', 'sitemap.xml',
    'assets/css/style.css', 'assets/js/main.js',
    'data/site.json', 'data/design.json', 'data/site-settings.json', 'data/sections.json',
    'data/seo.json', 'data/gateway.json', 'data/visual-baseline.json', 'data/gateway-appearance.json', 'data/navigation-style.json', 'data/tools.json', 'data/downloads.json',
    'data/projects.json', 'data/skills.json', 'data/docs.json', 'data/faq.json',
    'data/profile.json', 'data/portfolio-settings.json', 'data/portfolio-skills.json',
    'data/portfolio-projects.json', 'data/portfolio-timeline.json', 'data/services.json',
    'data/contact.json', 'media/social-preview.svg', 'media/social-preview.png',
    'docs/CHANGELOG.md', 'docs/CMS_GUIDE.md', 'docs/VERSION_NOTES_v2.8.1.md', 'docs/AUDIT_REPORT_v2.8.1.md',
    'docs/VERSION_NOTES_v2.8.2.md', 'docs/MOBILE_QA_REPORT_v2.8.2.md',
    'docs/AI_HANDOVER_FIX_PROMPT_v2.8.2.md',
    'docs/VERSION_NOTES_v2.8.3.md', 'docs/VIDEO_QA_REPORT_v2.8.3.md',
    'docs/AI_HANDOVER_FIX_PROMPT_v2.8.3.md',
    'docs/VERSION_NOTES_v2.9.1.md', 'docs/ADVANCED_CMS_GUIDE_v2.9.0.md',
    'docs/AI_HANDOVER_ADVANCED_CMS_PROMPT_v2.9.0.md', 'docs/V2_8_3_DEFAULT_BASELINE_GUIDE_v2.9.1.md',
    'docs/ADVANCED_CMS_GUIDE_v2.9.1.md', 'docs/AI_HANDOVER_DEFAULT_BASELINE_v2.9.1.md',
    'docs/VERSION_NOTES_v2.9.2.md'
  ];
  required.forEach((file) => readFile(file));
}

function checkNoSplitFolders() {
  ['assets/css/modules', 'assets/js/modules'].forEach((relativePath) => {
    if (fs.existsSync(absolutePath(relativePath))) {
      errors.push(`${relativePath} should not exist in the v2.9.2 single-file build.`);
    }
  });
}

function checkJsonFiles() {
  const dataDir = absolutePath('data');
  if (!fs.existsSync(dataDir)) {
    errors.push('Missing data folder.');
    return;
  }
  fs.readdirSync(dataDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .forEach((file) => parseJson(`data/${file}`));
}

function checkIndex() {
  const html = readFile('index.html');
  [
    'csGatewayOverlay', 'csModeSwitch', 'csWebsiteApp', 'csPortfolioApp',
    'csDataStatus', 'csPortfolioTimeline', 'csPortfolioTimelineList',
    'websiteNavToggle', 'portfolioNavToggle', 'csPortfolioEmailRow', 'csDataStatusDismiss'
  ].forEach((id) => {
    if (!html.includes(`id="${id}"`)) errors.push(`index.html is missing required id: ${id}`);
  });

  if (!html.includes(`assets/css/style.css?v=${releaseVersion}`)) {
    errors.push(`index.html must load assets/css/style.css?v=${releaseVersion}.`);
  }
  if (!html.includes(`src="assets/js/main.js?v=${releaseVersion}"`)) {
    errors.push(`index.html must load assets/js/main.js?v=${releaseVersion}.`);
  }
  if (html.includes('type="module"')) errors.push('index.html must not use type="module" in the single-file build.');
  if (html.includes('<style>')) warnings.push('index.html contains inline CSS. Keep reusable styling in assets/css/style.css.');
  if (!html.includes('class="cs-gateway-panel"') || !html.includes('tabindex="-1"')) {
    errors.push('The gateway panel must be programmatically focusable with tabindex="-1".');
  }
  if (!html.includes('cs-mode-gateway-open')) {
    errors.push('index.html must start in the Gateway-ready body state.');
  }
  if (!html.includes('media/social-preview.png')) errors.push('index.html must use the PNG social preview fallback.');
  if (html.includes('Add your email in data/contact.json')) errors.push('index.html contains a live contact placeholder.');

  const forbiddenLegacyClasses = ['class="skip-link"', 'class="nav-toggle"', 'class="cs-data-status"'];
  forbiddenLegacyClasses.forEach((token) => {
    if (html.includes(token)) errors.push(`index.html still uses unprefixed/legacy class token: ${token}`);
  });
}

function checkJavaScript() {
  const main = readFile('assets/js/main.js');
  const yml = readFile('.pages.yml');
  [
    'function loadJson', 'function addCopyButtons', 'function renderTools',
    'function setupResponsiveNavigation', 'const CyberSabilGateway',
    'function ensureModeAvailability', 'renderPortfolioTimeline', 'async function init()'
  ].forEach((token) => {
    if (!main.includes(token)) errors.push(`main.js is missing expected logic: ${token}`);
  });

  try {
    // Constructing the function parses JavaScript without executing the browser-dependent initializer.
    new Function(main);
  } catch (error) {
    errors.push(`JavaScript syntax error in assets/js/main.js: ${error.message}`);
  }

  if (!main.includes(`const CS_ASSET_VERSION = "${releaseVersion}";`)) {
    errors.push(`main.js cache/data version must be ${releaseVersion}.`);
  }
  [
    'const CS_FALLBACK = {',
    'loadJson("data/site.json", CS_FALLBACK.site)',
    'loadJson("data/gateway.json", CS_FALLBACK.gateway)',
    'loadJson("data/profile.json", CS_FALLBACK.profile)',
    'versionedUrl.searchParams.set("v", CS_ASSET_VERSION)',
    'cache: "no-cache"',
    'prepareGatewaySnapshotForNavigation',
    'window.addEventListener("pagehide"',
    'window.addEventListener("pageshow"',
    'cs-mode-gateway-open',
    'cs-mode-switch-visible',
    'cs-mode-switch-top-right-visible',
    'modeContentTimers',
    'app.querySelector("main") || app',
    '--cs-mode-switch-header-reserve',
    'cs-mode-download-actions',
    'loadJson("data/visual-baseline.json", CS_FALLBACK.visualBaseline)',
    'loadJson("data/gateway-appearance.json", CS_FALLBACK.gatewayAppearance)',
    'loadJson("data/navigation-style.json", CS_FALLBACK.navigationStyle)',
    'function applyGatewayAppearance()',
    'function applyNavigationStyle()',
    'function safeHexColor',
    'function clampNumber',
    'function resolveSafeDesktopSwitchPosition',
    'function updateModeSwitchPositionState',
    '--cs-mode-switch-safe-space',
    '--cs-active-header-height',
    'cs-mode-switch-top-left-visible'
  ].forEach((token) => {
    if (!main.includes(token)) errors.push(`main.js is missing required runtime safety logic: ${token}`);
  });
  if (main.includes('Date.now()')) {
    errors.push('main.js must not use Date.now() for every JSON request.');
  }
  if (main.includes('Choose your experience') || main.includes('websiteTitle: "Tools Website"') || main.includes('portfolioTitle: "Professional Portfolio"')) {
    errors.push('main.js contains obsolete gateway title fallback text that can reappear when gateway.json fails.');
  }
  [
    'yes(gatewaySettings.showLogoRow, false)',
    'yes(gatewaySettings.showChoiceLabel, false)',
    'yes(gatewaySettings.showCardIcons, false)',
    'yes(gatewaySettings.showCardKickers, false)',
    'yes(gatewaySettings.showChips, false)',
    'yes(gatewaySettings.showFooterNote, false)'
  ].forEach((token) => {
    if (!main.includes(token)) errors.push(`main.js is missing safe minimal gateway fallback: ${token}`);
  });
  ['import ', 'export ', '<script'].forEach((token) => {
    if (main.includes(token)) errors.push(`main.js contains forbidden single-file token: ${token.trim()}`);
  });
}

function checkCss() {
  const css = readFile('assets/css/style.css');
  [
    'Gateway background layer', 'Gateway panel', 'Mode switch', 'Portfolio shell',
    'Responsive UX Hardening Patch', 'CMS, SEO and Portfolio Timeline Polish',
    'Persistent mode switch animation'
  ].forEach((token) => {
    if (!css.includes(token)) warnings.push(`style.css is missing expected section comment: ${token}`);
  });
  if (/^\s*@import\b/m.test(css)) errors.push('style.css must not contain active @import rules.');
  if (css.includes('<style')) errors.push('style.css must not contain <style> tags.');

  let balance = 0;
  for (const char of css) {
    if (char === '{') balance += 1;
    if (char === '}') balance -= 1;
    if (balance < 0) break;
  }
  if (balance !== 0) errors.push(`CSS brace mismatch detected in style.css. Balance: ${balance}`);

  ['.skip-link', '.cs-data-status', '.cs-empty-state', '.nav-toggle', '.nav.nav-open', '.cs-nav-open'].forEach((selector) => {
    if (css.includes(selector)) errors.push(`style.css still contains legacy/unapproved selector: ${selector}`);
  });
  [
    'CyberSabil v2.8.2 Mobile Runtime Stability and True Safe Fallback',
    'CyberSabil v2.8.3 Cross-Browser Alignment and Transition Polish',
    'body.cs-mode-gateway-open',
    'body.cs-mode-switch-visible .cs-mode-website-app',
    '.cs-mode-data-status-dismiss',
    '.cs-gateway-panel:focus',
    '#downloadsGrid > .download',
    '.cs-mode-download-actions',
    'body.cs-mode-switch-top-right-visible',
    '--cs-mode-switch-header-reserve',
    '--cs-mode-switch-safe-space',
    '--cs-active-header-height',
    '@media (max-height: 620px)',
    'CyberSabil v2.9.1 Advanced Safe CMS Visual Controls',
    'CyberSabil v2.9.2 Smooth Mode Switch Indicator Fix',
    'csModeSwitchIndicatorSettle',
    '.cs-mode-switch.cs-mode-switch-syncing::before',
    '@media (hover: hover) and (pointer: fine)',
    '.cs-gateway-overlay.cs-gateway-advanced',
    '[data-cs-desktop-card-layout=',
    '.cs-mode-switch.cs-mode-switch-advanced',
    '.cs-mode-website-header-advanced',
    '.cs-portfolio-header-advanced',
    '@media (prefers-reduced-motion: reduce)'
  ].forEach((token) => {
    if (!css.includes(token)) errors.push(`style.css is missing required v2.8.3 layout rule: ${token}`);
  });
  if (css.includes('from { opacity: .2; transform: translateY(10px); }')) {
    errors.push('style.css still contains the washed full-page mode transition start frame.');
  }
  if (!css.includes('from { opacity: .88; transform: translateY(4px); }')) {
    errors.push('style.css is missing the refined v2.8.3 mode transition keyframe.');
  }
}

function checkModeSwitchSynchronization() {
  const main = readFile('assets/js/main.js');
  const css = readFile('assets/css/style.css');
  [
    'function commitModeSwitchActiveState(switcher, activeMode)',
    'function syncModeSwitchPill(switcher, activeMode, options = {})',
    'window.cancelAnimationFrame(modeSwitchSyncFrame)',
    'renderModeSwitchLabels(selectedMode, { animate: options.fromUser === true })'
  ].forEach((token) => {
    if (!main.includes(token)) errors.push(`main.js is missing coordinated mode-switch token: ${token}`);
  });
  if (css.includes('@keyframes csModeSwitchPulse')) {
    errors.push('style.css still contains the old whole-switch transform pulse.');
  }
  if (css.includes('.cs-mode-switch.cs-mode-switch-just-changed {')) {
    errors.push('style.css still animates the complete mode-switch container after a mode change.');
  }
  if (!css.includes('.cs-mode-switch.cs-mode-switch-just-changed::before')) {
    errors.push('style.css is missing the indicator-only settle animation selector.');
  }
}

function checkPagesCmsReferences() {
  const yml = readFile('.pages.yml');
  const requiredPaths = fs.readdirSync(absolutePath('data'))
    .filter((file) => file.endsWith('.json'))
    .map((file) => `data/${file}`);
  requiredPaths.forEach((relativePath) => {
    if (!yml.includes(`path: ${relativePath}`)) errors.push(`.pages.yml is missing CMS path: ${relativePath}`);
  });
  ['type: select', 'type: image', 'values:', 'data/portfolio-timeline.json'].forEach((token) => {
    if (!yml.includes(token)) errors.push(`.pages.yml is missing guarded CMS configuration token: ${token}`);
  });
  if (/\t/.test(yml)) errors.push('.pages.yml contains tab indentation; use spaces only.');
}

function checkCriticalFallbackConsistency() {
  const main = readFile('assets/js/main.js');
  const criticalFiles = [
    ['site', 'data/site.json', ['brandName', 'badge', 'heroTitleBefore', 'heroTitleHighlight', 'heroDescription']],
    ['gateway', 'data/gateway.json', ['title', 'subtitle', 'websiteTitle', 'portfolioTitle']],
    ['profile', 'data/profile.json', ['name', 'role', 'tagline', 'bio']],
    ['contact', 'data/contact.json', ['heading', 'description', 'githubLink', 'websiteLink']]
  ];
  criticalFiles.forEach(([fallbackKey, relativePath, keys]) => {
    const value = parseJson(relativePath);
    if (!value) return;
    if (!main.includes(`${fallbackKey}: {`)) errors.push(`main.js is missing CS_FALLBACK.${fallbackKey}.`);
    keys.forEach((key) => {
      const text = String(value[key] || '');
      if (text && !main.includes(JSON.stringify(text))) {
        errors.push(`main.js critical fallback is out of sync with ${relativePath} field ${key}.`);
      }
    });
  });
}

function checkGatewayFallbackConsistency() {
  const html = readFile('index.html');
  const main = readFile('assets/js/main.js');
  const gateway = parseJson('data/gateway.json');
  if (!gateway) return;
  const pairs = [
    ['title', 'csGatewayTitle'], ['subtitle', 'csGatewaySubtitle'],
    ['websiteTitle', 'csGatewayWebsiteTitle'], ['websiteDescription', 'csGatewayWebsiteDescription'],
    ['portfolioTitle', 'csGatewayPortfolioTitle'], ['portfolioDescription', 'csGatewayPortfolioDescription']
  ];
  pairs.forEach(([key, id]) => {
    const value = String(gateway[key] || '');
    if (!html.includes(`id="${id}"`) || !html.includes(`>${value}<`)) {
      errors.push(`index.html fallback for ${id} does not match data/gateway.json ${key}.`);
    }
    if (!main.includes(JSON.stringify(value))) {
      errors.push(`main.js fallback does not contain current gateway value for ${key}: ${value}`);
    }
  });
}

function checkSeoAndDeploymentFiles() {
  const html = readFile('index.html');
  const seo = parseJson('data/seo.json');
  const robots = readFile('robots.txt');
  const sitemap = readFile('sitemap.xml');
  const page404 = readFile('404.html');
  const settings = parseJson('data/site-settings.json');
  const contact = parseJson('data/contact.json');

  if (settings?.version !== `v${releaseVersion}`) errors.push(`data/site-settings.json version must be v${releaseVersion}.`);
  if (contact && /add your email/i.test(String(contact.email || ''))) errors.push('data/contact.json contains a setup placeholder instead of a real or blank email.');

  const downloads = parseJson('data/downloads.json');
  if (Array.isArray(downloads)) {
    downloads.forEach((item, index) => {
      if (/add sha256|after release/i.test(String(item.checksum || ''))) {
        errors.push(`data/downloads.json item ${index + 1} contains a public checksum placeholder.`);
      }
      if (/cybersabil-it-tools/i.test(String(item.downloadLink || '')) || /cybersabil-it-tools/i.test(String(item.releaseLink || ''))) {
        errors.push(`data/downloads.json item ${index + 1} points to the unpublished CyberSabil IT Tools release.`);
      }
    });
  }

  if (seo) {
    const staticValues = [seo.pageTitle, seo.metaDescription, seo.ogTitle, seo.ogDescription, seo.ogImage, seo.canonicalUrl, seo.twitterTitle, seo.twitterDescription, seo.twitterImage];
    staticValues.filter(Boolean).forEach((value) => {
      if (!html.includes(String(value))) warnings.push(`Static index.html metadata may be out of sync with data/seo.json value: ${value}`);
    });
  }

  if (!robots.includes(`Sitemap: ${expectedDomain}sitemap.xml`)) errors.push('robots.txt sitemap URL does not match the expected live domain.');
  if (!sitemap.includes(`<loc>${expectedDomain}</loc>`)) errors.push('sitemap.xml homepage URL does not match the expected live domain.');
  if (!page404.includes(`/assets/css/style.css?v=${releaseVersion}`)) errors.push('404.html must use a root-relative, versioned stylesheet path.');
}

function checkAdvancedCmsControls() {
  const visualBaseline = parseJson('data/visual-baseline.json');
  const gateway = parseJson('data/gateway-appearance.json');
  const navigation = parseJson('data/navigation-style.json');
  if (visualBaseline?.globalVisualPreset !== 'v2.8.3-exact') errors.push('Global default visual baseline must be v2.8.3-exact.');
  if (gateway?.visualPreset !== 'v2.8.3-exact') errors.push('Gateway default visualPreset must be v2.8.3-exact.');
  if (navigation?.visualPreset !== 'v2.8.3-exact') errors.push('Navigation default visualPreset must be v2.8.3-exact.');
  const main = readFile('assets/js/main.js');
  const yml = readFile('.pages.yml');
  if (!main.includes('body.classList.add("cs-gateway-advanced-active")')) errors.push('Advanced Gateway body scope is missing.');
  if (!main.includes('function useCustomGatewayAppearance()')) errors.push('Gateway exact/custom baseline helper is missing.');
  if (!main.includes('function useExactGlobalVisualBaseline()')) errors.push('Global exact baseline helper is missing.');
  if (!yml.includes('path: data/visual-baseline.json')) errors.push('Pages CMS global visual baseline entry is missing.');
  if (!main.includes('function useCustomNavigationStyle()')) errors.push('Navigation exact/custom baseline helper is missing.');
  if (!gateway || !navigation) return;

  const fallback = extractJavaScriptObject(main, 'const CS_FALLBACK =');
  if (fallback) {
    if (JSON.stringify(fallback.visualBaseline) !== JSON.stringify(visualBaseline)) {
      errors.push('CS_FALLBACK.visualBaseline must exactly match data/visual-baseline.json.');
    }
    if (JSON.stringify(fallback.gatewayAppearance) !== JSON.stringify(gateway)) {
      errors.push('CS_FALLBACK.gatewayAppearance must exactly match data/gateway-appearance.json.');
    }
    if (JSON.stringify(fallback.navigationStyle) !== JSON.stringify(navigation)) {
      errors.push('CS_FALLBACK.navigationStyle must exactly match data/navigation-style.json.');
    }
  }

  const isHex = (value) => /^#[0-9a-f]{6}$/i.test(String(value || ''));
  const checkEnum = (source, key, allowed, file) => {
    if (!allowed.includes(String(source[key] || ''))) errors.push(`${file} field ${key} must be one of: ${allowed.join(', ')}.`);
  };
  const checkRange = (source, key, minimum, maximum, file) => {
    const number = Number(source[key]);
    if (!Number.isFinite(number) || number < minimum || number > maximum) errors.push(`${file} field ${key} must be between ${minimum} and ${maximum}.`);
  };
  const checkColors = (source, file) => {
    Object.entries(source).forEach(([key, value]) => {
      if (/color$/i.test(key) && !isHex(value)) errors.push(`${file} field ${key} must use a six-digit #RRGGBB color.`);
    });
  };
  checkColors(gateway, 'data/gateway-appearance.json');
  checkColors(navigation, 'data/navigation-style.json');

  const gatewayEnums = {
    advancedControlsEnabled: ['yes', 'no'], visualPreset: ['v2.8.3-exact', 'custom-advanced'], cardOrder: ['website-first', 'portfolio-first'],
    desktopCardLayout: ['row', 'column'], tabletCardLayout: ['row', 'column'], mobileCardLayout: ['row', 'column'],
    desktopPanelPosition: ['center', 'top-left', 'top-center', 'top-right', 'center-left', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'],
    tabletPanelPosition: ['center', 'top-left', 'top-center', 'top-right', 'center-left', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'],
    mobilePanelPosition: ['center', 'top-left', 'top-center', 'top-right', 'center-left', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'],
    panelContentLayout: ['stacked', 'brand-left', 'brand-right'], panelBackgroundType: ['glass', 'gradient', 'solid', 'transparent'],
    panelGradientDirection: ['top-to-bottom', 'left-to-right', 'diagonal-up', 'diagonal-down'],
    panelBorderEnabled: ['yes', 'no'], panelBorderStyle: ['solid', 'dashed', 'dotted'], panelShadowPreset: ['none', 'soft', 'medium', 'strong'],
    panelGlowEnabled: ['yes', 'no'], panelInsetHighlightEnabled: ['yes', 'no'], showAmbientLights: ['yes', 'no'],
    titleAlignment: ['left', 'center', 'right'], cardTextAlignment: ['left', 'center', 'right'], cardContentAlignment: ['start', 'center', 'end'],
    cardShadowPreset: ['none', 'soft', 'medium', 'strong'], cardInsetHighlightEnabled: ['yes', 'no'],
    websiteCardBackgroundType: ['gradient', 'solid', 'transparent'], portfolioCardBackgroundType: ['gradient', 'solid', 'transparent'],
    websiteButtonStyle: ['pill', 'solid', 'outline', 'soft', 'text'], portfolioButtonStyle: ['pill', 'solid', 'outline', 'soft', 'text'],
    panelAnimation: ['none', 'fade', 'soft-scale', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom', 'blur-in'],
    overlayAnimation: ['none', 'fade', 'fade-blur'],
    websiteCardAnimation: ['none', 'fade', 'soft-scale', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom'],
    portfolioCardAnimation: ['none', 'fade', 'soft-scale', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom'],
    animationEasing: ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'smooth', 'spring-soft'],
    cardHoverPreset: ['none', 'lift', 'scale', 'glow', 'border-glow', 'tilt-soft', 'lift-glow'], cardClickPreset: ['none', 'press', 'pulse']
  };
  Object.entries(gatewayEnums).forEach(([key, allowed]) => checkEnum(gateway, key, allowed, 'data/gateway-appearance.json'));

  const gatewayRanges = {
    panelMaxWidth: [320, 1400], panelMaxHeightVh: [50, 98], panelPadding: [8, 72], panelGap: [0, 64], panelBorderRadius: [0, 64],
    panelBackgroundOpacity: [0, 1], panelGradientStartOpacity: [0, 1], panelGradientEndOpacity: [0, 1], panelBackdropBlur: [0, 48], panelBackdropSaturation: [50, 220],
    panelBorderWidth: [0, 8], panelBorderOpacity: [0, 1], panelGlowOpacity: [0, 1], panelInsetHighlightOpacity: [0, 1],
    overlayDarkness: [0, .9], overlayBackdropBlur: [0, 24], websiteBackgroundBlur: [0, 24], websiteBackgroundBrightness: [20, 120], websiteBackgroundSaturation: [0, 200],
    ambientOpacity: [0, 1], ambientBlur: [0, 90], titleSize: [24, 72], titleWeight: [400, 950], subtitleOpacity: [0, 1], subtitleSize: [12, 28],
    choiceGap: [4, 48], cardMinHeight: [0, 320], cardPadding: [10, 48], cardBorderRadius: [0, 48], cardBorderWidth: [0, 8], cardInsetHighlightOpacity: [0, 1], cardDescriptionOpacity: [0, 1],
    websiteCardBackgroundOpacity: [0, 1], websiteCardGradientStartOpacity: [0, 1], websiteCardGradientEndOpacity: [0, 1], websiteCardBorderOpacity: [0, 1],
    portfolioCardBackgroundOpacity: [0, 1], portfolioCardGradientStartOpacity: [0, 1], portfolioCardGradientEndOpacity: [0, 1], portfolioCardBorderOpacity: [0, 1],
    buttonBorderRadius: [0, 999], animationDurationMs: [0, 2000], panelAnimationDelayMs: [0, 1500], websiteCardDelayMs: [0, 2000], portfolioCardDelayMs: [0, 2000],
    cardHoverStrength: [0, 12], cardHoverDurationMs: [0, 1000]
  };
  Object.entries(gatewayRanges).forEach(([key, range]) => checkRange(gateway, key, range[0], range[1], 'data/gateway-appearance.json'));

  const navigationEnums = {
    advancedControlsEnabled: ['yes', 'no'], visualPreset: ['v2.8.3-exact', 'custom-advanced'], websiteHeaderPosition: ['static', 'sticky'], portfolioHeaderPosition: ['static', 'sticky'],
    websiteDesktopLayout: ['brand-left-menu-right', 'menu-left-brand-right', 'stacked-centered'], portfolioDesktopLayout: ['brand-left-menu-right', 'menu-left-brand-right', 'stacked-centered'],
    websiteMenuAlignment: ['left', 'center', 'right'], portfolioMenuAlignment: ['left', 'center', 'right'],
    websiteHeaderBackgroundType: ['glass', 'solid', 'transparent'], portfolioHeaderBackgroundType: ['glass', 'solid', 'transparent'],
    websiteHeaderBorderEnabled: ['yes', 'no'], portfolioHeaderBorderEnabled: ['yes', 'no'],
    websiteHeaderShadowPreset: ['none', 'soft', 'medium', 'strong'], portfolioHeaderShadowPreset: ['none', 'soft', 'medium', 'strong'],
    websiteMenuLinkStyle: ['plain', 'pill', 'underline'], portfolioMenuLinkStyle: ['plain', 'pill', 'underline'],
    websiteMobileToggleSide: ['left', 'right'], portfolioMobileToggleSide: ['left', 'right'],
    websiteMobileMenuAlignment: ['left', 'center', 'right'], portfolioMobileMenuAlignment: ['left', 'center', 'right'],
    modeSwitchDesktopPosition: ['top-left', 'top-center', 'top-right', 'center-left', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'],
    modeSwitchMobilePosition: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'],
    modeSwitchOrientation: ['horizontal', 'vertical'], modeSwitchSize: ['compact', 'standard', 'large'],
    modeSwitchShadowPreset: ['none', 'soft', 'medium', 'strong'], modeSwitchAnimation: ['none', 'fade', 'pulse', 'soft-scale'], modeSwitchHoverPreset: ['none', 'lift', 'glow']
  };
  Object.entries(navigationEnums).forEach(([key, allowed]) => checkEnum(navigation, key, allowed, 'data/navigation-style.json'));

  const navigationRanges = {
    websiteHeaderMinHeight: [48, 140], websiteContainerMaxWidth: [720, 1800], websiteHeaderBackgroundOpacity: [0, 1], websiteHeaderBackdropBlur: [0, 40], websiteHeaderBorderOpacity: [0, 1], websiteMenuGap: [0, 48], websiteMenuFontSize: [11, 24],
    portfolioHeaderMinHeight: [48, 140], portfolioContainerMaxWidth: [720, 1800], portfolioHeaderBackgroundOpacity: [0, 1], portfolioHeaderBackdropBlur: [0, 40], portfolioHeaderBorderOpacity: [0, 1], portfolioMenuGap: [0, 48], portfolioMenuFontSize: [11, 24], portfolioMenuTextOpacity: [0, 1],
    modeSwitchHorizontalOffset: [4, 80], modeSwitchVerticalOffset: [4, 100], modeSwitchMobileOffset: [4, 60], modeSwitchBackgroundOpacity: [0, 1], modeSwitchBackdropBlur: [0, 40], modeSwitchBorderOpacity: [0, 1], modeSwitchBorderWidth: [0, 6], modeSwitchBorderRadius: [0, 999], modeSwitchInactiveTextOpacity: [0, 1]
  };
  Object.entries(navigationRanges).forEach(([key, range]) => checkRange(navigation, key, range[0], range[1], 'data/navigation-style.json'));

  [gateway, navigation].forEach((source) => {
    Object.keys(source).forEach((key) => {
      if (/css|styletext|html/i.test(key)) errors.push(`Advanced CMS file contains a forbidden raw-code key: ${key}.`);
      if (!main.includes(JSON.stringify(key))) errors.push(`main.js fallback/runtime does not reference advanced CMS field: ${key}.`);
      if (!yml.includes(`- name: ${key}`)) errors.push(`.pages.yml is missing advanced CMS field: ${key}.`);
    });
  });
}

function checkPngPreview() {
  const relativePath = 'media/social-preview.png';
  const filePath = absolutePath(relativePath);
  if (!fs.existsSync(filePath)) return;
  const buffer = fs.readFileSync(filePath);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    errors.push(`${relativePath} is not a valid PNG file.`);
    return;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== 1200 || height !== 630) warnings.push(`${relativePath} is ${width}x${height}; 1200x630 is recommended.`);
}

function checkKnownUnsafeSchemes(value, sourcePath) {
  if (typeof value === 'string' && /^\s*(javascript:|data:text\/html)/i.test(value)) {
    errors.push(`Unsafe URL-like value found in ${sourcePath}: ${value}`);
  }
  if (Array.isArray(value)) value.forEach((item) => checkKnownUnsafeSchemes(item, sourcePath));
  if (value && typeof value === 'object') Object.values(value).forEach((item) => checkKnownUnsafeSchemes(item, sourcePath));
}

function checkUnsafeJsonValues() {
  fs.readdirSync(absolutePath('data'))
    .filter((file) => file.endsWith('.json'))
    .sort()
    .forEach((file) => {
      const relativePath = `data/${file}`;
      const value = parseJson(relativePath);
      if (value !== null) checkKnownUnsafeSchemes(value, relativePath);
    });
}

function main() {
  checkRequiredFiles();
  checkNoSplitFolders();
  checkJsonFiles();
  checkIndex();
  checkJavaScript();
  checkCss();
  checkModeSwitchSynchronization();
checkPagesCmsReferences();
  checkCriticalFallbackConsistency();
  checkGatewayFallbackConsistency();
  checkSeoAndDeploymentFiles();
  checkAdvancedCmsControls();
  checkPngPreview();
  checkUnsafeJsonValues();

  if (warnings.length) {
    console.log('\nWarnings:');
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }
  if (errors.length) {
    console.error('\nCyberSabil validation failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  console.log(`CyberSabil v${releaseVersion} validation passed.`);
}

main();
