#!/usr/bin/env node
/* CyberSabil CMS field coverage and collision validator
   Purpose: Verifies every Pages CMS field has a JSON value and a runtime/build consumer,
   validates select values, checks CSS-variable reset coverage, and blocks known transform collisions. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const pages = read('.pages.yml');
const js = read('assets/js/main.js');
const css = read('assets/css/style.css');
const html = read('index.html');
const generator = read('tools/generate-site.js');
const errors = [];
const warnings = [];
const rows = [];

const entryBlocks = pages.split(/\n(?=- name: )/g);
for (const block of entryBlocks) {
  const pathMatch = block.match(/^\s*path:\s*(data\/[^\s]+\.json)\s*$/m);
  if (!pathMatch) continue;
  const file = pathMatch[1];
  const data = JSON.parse(read(file));
  const source = Array.isArray(data) ? (data[0] || {}) : data;
  const fieldMatches = [...block.matchAll(/^  - name:\s*([^\s]+)\s*$/gm)];
  for (let i = 0; i < fieldMatches.length; i++) {
    const name = fieldMatches[i][1];
    const start = fieldMatches[i].index;
    const end = i + 1 < fieldMatches.length ? fieldMatches[i + 1].index : block.length;
    const fieldBlock = block.slice(start, end);
    const type = (fieldBlock.match(/^    type:\s*([^\s]+)\s*$/m) || [,'unknown'])[1];
    const exists = Object.prototype.hasOwnProperty.call(source, name);
    if (!exists) errors.push(`${file}: CMS field ${name} is missing from JSON`);
    const current = source[name];
    const options = [...fieldBlock.matchAll(/^      -\s+"?([^"\n]+?)"?\s*$/gm)].map(m => m[1]);
    if (type === 'select' && options.length && !options.includes(String(current))) {
      errors.push(`${file}: ${name}=${JSON.stringify(current)} is outside CMS options ${options.join(', ')}`);
    }
    const token = new RegExp(`(^|[^A-Za-z0-9_$])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_$]|$)`);
    const refs = { js: token.test(js), generator: token.test(generator), html: token.test(html), css: token.test(css) };
    if (!Object.values(refs).some(Boolean)) errors.push(`${file}: CMS field ${name} has no runtime/build consumer token`);
    rows.push({ file, name, type, current, options, refs });
  }
}

// Detect accidental editing markers and legacy centering collisions.
if (/\*{8}|\*{8}/.test(css)) errors.push('style.css contains an accidental ******** editing marker');
if (/\.cs-mode-switch\s*\{[\s\S]*?transform:\s*translateX\(-50%\)/.test(css)) {
  errors.push('Base mobile mode-switch centering still uses transform: translateX(-50%) and can collide with animation/hover transform');
}
for (const attr of ['desktop','mobile']) {
  const centerRules = [...css.matchAll(new RegExp(`\\.cs-mode-switch-position-custom\\[data-cs-${attr}-position="[^"]*center"\\]\\s*\\{([\\s\\S]*?)\\}`, 'g'))];
  for (const match of centerRules) {
    if (/transform:\s*translate[XY]\(-50%\)/.test(match[1])) errors.push(`Centered ${attr} switch selector still uses transform for positioning`);
    if (!/translate:\s*(?:-50%\s+0|0\s+-50%)/.test(match[1])) warnings.push(`Centered ${attr} switch selector does not visibly use independent translate longhand`);
  }
}

// All literal root CSS variables set by the Gateway or Navigation renderers must be reset.
function extractArray(name) {
  const m = js.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  return new Set(m ? [...m[1].matchAll(/"(--[\w-]+)"/g)].map(x => x[1]) : []);
}
const gatewayReset = extractArray('gatewayVariables');
const navigationReset = extractArray('navigationVariables');
const literalSets = new Set([...js.matchAll(/root\.style\.setProperty\("(--[\w-]+)"/g)].map(x => x[1]));
for (const variable of literalSets) {
  if (variable.startsWith('--cs-gateway-') && !gatewayReset.has(variable)) errors.push(`Gateway variable is set but not reset: ${variable}`);
  if ((variable.startsWith('--cs-website-') || variable.startsWith('--cs-portfolio-') || variable.startsWith('--cs-mode-switch-') || variable === '--cs-active-header-height') && !navigationReset.has(variable)) {
    errors.push(`Navigation variable is set but not reset: ${variable}`);
  }
}

// Data attributes that are intended for CSS must have selector consumers.
const behavioralDatasetAllow = new Set(['csActiveMode','csHeaderBackground','csPillInitialized','csPositionFallback','csRequestedDesktopPosition','csResponsiveNavigationBound']);
const assignedDataset = new Set([...js.matchAll(/dataset\.([A-Za-z0-9_]+)\s*=/g)].map(x => x[1]));
const kebab = s => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
for (const key of assignedDataset) {
  if (behavioralDatasetAllow.has(key)) continue;
  const attr = `data-${kebab(key)}`;
  if (!css.includes(attr) && !html.includes(attr)) warnings.push(`Dataset ${attr} has no CSS/HTML selector consumer`);
}

const report = {
  totalFields: rows.length,
  files: [...new Set(rows.map(r => r.file))].length,
  fieldsWithJsonValue: rows.filter(r => r.current !== undefined).length,
  selectFields: rows.filter(r => r.type === 'select').length,
  errors,
  warnings,
  rows
};
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/CMS_FIELD_COVERAGE_REPORT_v2.10.1.json'), JSON.stringify(report, null, 2));
if (warnings.length) {
  console.log('CMS field coverage warnings:'); warnings.forEach(x => console.log(`- ${x}`));
}
if (errors.length) {
  console.error('CMS field coverage failed:'); errors.forEach(x => console.error(`- ${x}`)); process.exit(1);
}
console.log(`CMS field coverage passed: ${rows.length} fields across ${report.files} JSON files.`);
