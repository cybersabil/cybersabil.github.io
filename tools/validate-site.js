#!/usr/bin/env node
/* CyberSabil v2.10.1 production validator
   Purpose: Validates atomic boot, grouped CMS authority, generated revision consistency, JSON/YAML references and static-site safety before GitHub Pages deployment. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));
const errors = [];
const warnings = [];
const requireText = (source, text, label) => { if (!source.includes(text)) errors.push(`${label}: missing ${text}`); };
const forbidText = (source, text, label) => { if (source.includes(text)) errors.push(`${label}: obsolete/conflicting text remains: ${text}`); };

const required = [
  'index.html', '404.html', '.pages.yml', 'assets/css/style.css', 'assets/js/main.js',
  'data/site-settings.json', 'data/design.json', 'data/visual-baseline.json',
  'data/gateway.json', 'data/gateway-appearance.json', 'data/navigation-style.json',
  'data/runtime-manifest.json', 'tools/generate-site.js', 'tools/test-config-isolation.js',
  'tools/test-cms-field-coverage.js', '.github/workflows/build-pages.yml'
];
required.forEach(file => { if (!exists(file)) errors.push(`Missing required file: ${file}`); });

const jsonData = {};
if (!errors.length) {
  for (const file of fs.readdirSync(path.join(ROOT, 'data')).filter(name => name.endsWith('.json'))) {
    try { jsonData[file] = JSON.parse(read(`data/${file}`)); }
    catch (error) { errors.push(`Invalid JSON data/${file}: ${error.message}`); }
  }
}

const index = exists('index.html') ? read('index.html') : '';
const css = exists('assets/css/style.css') ? read('assets/css/style.css') : '';
const js = exists('assets/js/main.js') ? read('assets/js/main.js') : '';
const pages = exists('.pages.yml') ? read('.pages.yml') : '';
const notFound = exists('404.html') ? read('404.html') : '';
const manifest = jsonData['runtime-manifest.json'] || {};
const settings = jsonData['site-settings.json'] || {};
const gatewayAppearance = jsonData['gateway-appearance.json'] || {};
const navigationStyle = jsonData['navigation-style.json'] || {};
const design = jsonData['design.json'] || {};
const workflow = exists('.github/workflows/build-pages.yml') ? read('.github/workflows/build-pages.yml') : '';

// JavaScript syntax.
try { new vm.Script(js, { filename: 'assets/js/main.js' }); }
catch (error) { errors.push(`main.js syntax error: ${error.message}`); }
try { new vm.Script(read('tools/generate-site.js'), { filename: 'tools/generate-site.js' }); }
catch (error) { errors.push(`generate-site.js syntax error: ${error.message}`); }

// Version/schema consistency.
if (settings.version !== 'v2.10.1') errors.push(`site-settings version must be v2.10.1, found ${settings.version}`);
if (settings.schemaVersion !== '2.10.0') errors.push(`site-settings schemaVersion must be 2.10.0, found ${settings.schemaVersion}`);
if (manifest.release !== 'v2.10.1' || manifest.schemaVersion !== '2.10.0') errors.push('runtime-manifest release/schema mismatch');
if (!/^[a-f0-9]{20}$/.test(String(manifest.revision || ''))) errors.push('runtime-manifest revision must be a generated 20-character hex value');

// Generated HTML and revision alignment.
requireText(index, '<html lang="en" class="cs-boot-preparing">', 'index atomic boot');
requireText(index, 'id="csBootStatus"', 'index atomic boot');
requireText(index, 'id="csAtomicBootGuard"', 'index inline pre-paint guard');
requireText(index, 'id="csCriticalConfig"', 'index critical snapshot');
requireText(index, `assets/css/style.css?v=${manifest.revision}`, 'index CSS revision');
requireText(index, `assets/js/main.js?v=${manifest.revision}`, 'index JS revision');
requireText(notFound, `/assets/css/style.css?v=${manifest.revision}`, '404 CSS revision');
const criticalMatch = index.match(/<script id="csCriticalConfig" type="application\/json">([\s\S]*?)<\/script>/);
if (!criticalMatch) errors.push('Generated critical snapshot is missing');
else {
  try {
    const critical = JSON.parse(criticalMatch[1]);
    if (critical.revision !== manifest.revision) errors.push('Critical snapshot revision does not match runtime-manifest');
    if (critical.schemaVersion !== manifest.schemaVersion) errors.push('Critical snapshot schema does not match runtime-manifest');
  } catch (error) { errors.push(`Critical snapshot JSON is invalid: ${error.message}`); }
}

// Atomic boot and phased data loading.
[
  'function setBootPhase(', 'function revealPreparedPage(', 'function revealFatalFallback(',
  'async function loadWebsiteContent(', 'function scheduleInactiveModeLoad(',
  'setBootPhase("applying"', 'await revealPreparedPage()', 'csInitPromise'
].forEach(text => requireText(js, text, 'main.js atomic boot'));
requireText(css, 'html.cs-boot-preparing body', 'style.css atomic boot');
requireText(css, 'html.cs-boot-applying *', 'style.css animation gate');
forbidText(js, 'setTimeout(() => showPage()', 'main.js unsafe timeout reveal');

// Gateway group isolation.
['layoutControlMode','appearanceControlMode','animationControlMode','interactionControlMode'].forEach(key => {
  if (!['inherit','custom'].includes(gatewayAppearance[key])) errors.push(`gateway-appearance ${key} must be inherit/custom`);
  requireText(pages, `- name: ${key}`, '.pages.yml Gateway groups');
});
[
  'useCustomGatewayLayout', 'useCustomGatewayAppearance', 'useCustomGatewayAnimation', 'useCustomGatewayInteraction',
  'resetGatewayAdvancedState', 'cs-gateway-layout-custom', 'cs-gateway-appearance-custom',
  'cs-gateway-animation-custom', 'cs-gateway-interaction-custom'
].forEach(text => requireText(js, text, 'main.js Gateway isolation'));
['.cs-gateway-layout-custom', '.cs-gateway-appearance-custom', '.cs-gateway-animation-custom', '.cs-gateway-interaction-custom']
  .forEach(text => requireText(css, text, 'style.css Gateway isolation'));
forbidText(css, '.cs-gateway-overlay.cs-gateway-advanced', 'style.css all-or-nothing Gateway selector');
forbidText(css, '.cs-gateway-advanced[data-cs-card-hover', 'style.css all-or-nothing interaction selector');

// Navigation group isolation.
[
  'websiteHeaderControlMode','portfolioHeaderControlMode','modeSwitchPositionControlMode',
  'modeSwitchAppearanceControlMode','modeSwitchAnimationControlMode'
].forEach(key => {
  if (!['inherit','custom'].includes(navigationStyle[key])) errors.push(`navigation-style ${key} must be inherit/custom`);
  requireText(pages, `- name: ${key}`, '.pages.yml navigation groups');
});
['useCustomWebsiteHeader','useCustomPortfolioHeader','useCustomModeSwitchPosition','useCustomModeSwitchAppearance','useCustomModeSwitchAnimation']
  .forEach(text => requireText(js, text, 'main.js navigation isolation'));
['.cs-mode-switch-position-custom','.cs-mode-switch-appearance-custom','.cs-mode-switch-animation-custom']
  .forEach(text => requireText(css, text, 'style.css mode-switch isolation'));
forbidText(css, '.cs-mode-switch.cs-mode-switch-advanced', 'style.css all-or-nothing switch selector');

// Single section visibility owner.
['showSkillsSection','showDocumentationSection','showFAQSection','showProjectSection'].forEach(key => {
  if (Object.prototype.hasOwnProperty.call(design, key)) errors.push(`design.json must not own Website section visibility: ${key}`);
});
forbidText(js, '&& yes(design.show', 'main.js duplicate visibility owner');
const designSection = pages.slice(0, pages.indexOf('- name: site_settings'));
['showSkillsSection','showDocumentationSection','showFAQSection','showProjectSection'].forEach(key => {
  if (designSection.includes(`- name: ${key}`)) errors.push(`.pages.yml design section still exposes duplicate visibility owner: ${key}`);
});

// Fallback and deterministic reset safety.
requireText(js, 'gatewayDataAttributes', 'Gateway deterministic reset');
requireText(js, 'gatewayVariables', 'Gateway deterministic reset');
requireText(js, 'navigationVariables', 'Navigation deterministic reset');
requireText(js, 'eventsBound', 'Idempotent event binding');
requireText(js, 'generation !== csBootGeneration', 'Stale async response guard');
requireText(css, '@media (prefers-reduced-motion: reduce)', 'Reduced-motion protection');



// CSS collision and accidental-edit protection.
forbidText(css, '********', 'style.css accidental edit marker');
forbidText(css, 'transform: translateX(-50%);', 'style.css position/animation transform collision');
requireText(css, 'translate: -50% 0;', 'style.css independent centered positioning');
['--cs-gateway-panel-width','--cs-gateway-blur','--cs-gateway-darkness'].forEach(variable => {
  requireText(js, `"${variable}"`, 'Gateway deterministic reset coverage');
});
requireText(js, 'applyGatewayDesign();', 'Gateway custom-to-inherit baseline restoration');
requireText(js, 'renderModeSwitchLabels(document.body.dataset.csActiveMode || "website", { animate: false });', 'Mode-switch live position reconciliation');

// GitHub Pages generated deployment workflow.
['actions/checkout@v6','actions/setup-node@v6','actions/configure-pages@v5','actions/upload-pages-artifact@v4','actions/deploy-pages@v4',
 'node tools/generate-site.js','node tools/test-config-isolation.js','node tools/test-cms-field-coverage.js','node tools/validate-site.js']
  .forEach(text => requireText(workflow, text, 'GitHub Pages workflow'));

// Pages CMS paths and local references.
for (const file of fs.readdirSync(path.join(ROOT, 'data')).filter(name => name.endsWith('.json') && name !== 'runtime-manifest.json')) {
  if (!pages.includes(`path: data/${file}`)) warnings.push(`Pages CMS does not expose data/${file}; confirm this is intentional`);
}
const localRefs = [...index.matchAll(/(?:src|href)="((?:assets|media)\/[^"?#]+)/g)].map(match => match[1]);
localRefs.forEach(ref => { if (!exists(ref)) errors.push(`Broken local reference in index.html: ${ref}`); });

// Generator idempotence check: running it twice must not change generated outputs or revision.
try {
  const tracked = ['index.html','404.html','data/runtime-manifest.json'];
  const before = Object.fromEntries(tracked.map(file => [file, read(file)]));
  execFileSync(process.execPath, [path.join(ROOT, 'tools/generate-site.js')], { cwd: ROOT, stdio: 'pipe' });
  const afterOne = Object.fromEntries(tracked.map(file => [file, read(file)]));
  execFileSync(process.execPath, [path.join(ROOT, 'tools/generate-site.js')], { cwd: ROOT, stdio: 'pipe' });
  const afterTwo = Object.fromEntries(tracked.map(file => [file, read(file)]));
  tracked.forEach(file => {
    if (afterOne[file] !== afterTwo[file]) errors.push(`Generator is not idempotent for ${file}`);
    if (before[file] !== afterOne[file]) warnings.push(`${file} was stale and was regenerated during validation`);
  });
} catch (error) { errors.push(`Generator execution failed: ${error.message}`); }

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach(message => console.log(`- ${message}`));
}
if (errors.length) {
  console.error('\nCyberSabil v2.10.1 validation failed:');
  errors.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}
console.log('\nCyberSabil v2.10.1 validation passed.');
console.log(`Revision: ${manifest.revision}`);
