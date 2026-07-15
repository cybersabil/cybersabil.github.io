#!/usr/bin/env node
/* CyberSabil CMS field coverage and collision validator
   Option A update: supports nested Pages CMS groups and human-readable named select options
   without changing stored JSON values or runtime behavior. */
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

const indentOf = (line) => (line.match(/^\s*/) || [''])[0].length;
const unquote = (value) => {
  const v = String(value || '').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
};

/* Parse only the stable Pages CMS subset used by this repository.
   It intentionally follows indentation so nested `type: group` navigation remains testable
   without adding a YAML package dependency to the GitHub Pages build. */
function parseCmsFileEntries(source) {
  const lines = source.split(/\r?\n/);
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    const entryMatch = lines[i].match(/^(\s*)- name:\s*(.+?)\s*$/);
    if (!entryMatch) continue;
    const entryIndent = entryMatch[1].length;
    let end = i + 1;
    while (end < lines.length) {
      const candidate = lines[end];
      if (candidate.trim() && indentOf(candidate) <= entryIndent && /^\s*- name:/.test(candidate)) break;
      end++;
    }
    const block = lines.slice(i, end);
    const exactProperty = (key) => {
      const re = new RegExp(`^\\s{${entryIndent + 2}}${key}:\\s*(.+?)\\s*$`);
      for (const line of block) {
        const m = line.match(re);
        if (m) return unquote(m[1]);
      }
      return null;
    };
    if (exactProperty('type') !== 'file') continue;
    const file = exactProperty('path');
    if (!file || !/^data\/[^\s]+\.json$/.test(file)) continue;

    const fields = [];
    for (let k = 1; k < block.length; k++) {
      const fieldMatch = block[k].match(new RegExp(`^\\s{${entryIndent + 2}}- name:\\s*(.+?)\\s*$`));
      if (!fieldMatch) continue;
      const name = unquote(fieldMatch[1]);
      let fieldEnd = k + 1;
      while (fieldEnd < block.length && !new RegExp(`^\\s{${entryIndent + 2}}- name:`).test(block[fieldEnd])) fieldEnd++;
      const fieldLines = block.slice(k, fieldEnd);
      let type = 'unknown';
      let label = '';
      let description = '';
      let hidden = false;
      let readonly = false;
      let min = null;
      let max = null;
      const options = [];
      for (let q = 1; q < fieldLines.length; q++) {
        const typeMatch = fieldLines[q].match(new RegExp(`^\\s{${entryIndent + 4}}type:\\s*(.+?)\\s*$`));
        if (typeMatch) type = unquote(typeMatch[1]);
        const labelMatch = fieldLines[q].match(new RegExp(`^\\s{${entryIndent + 4}}label:\\s*(.+?)\\s*$`));
        if (labelMatch) label = unquote(labelMatch[1]);
        const descriptionMatch = fieldLines[q].match(new RegExp(`^\\s{${entryIndent + 4}}description:\\s*(.+?)\\s*$`));
        if (descriptionMatch) description = unquote(descriptionMatch[1]);
        const hiddenMatch = fieldLines[q].match(new RegExp(`^\\s{${entryIndent + 4}}hidden:\\s*(.+?)\\s*$`));
        if (hiddenMatch) hidden = unquote(hiddenMatch[1]) === 'true';
        const readonlyMatch = fieldLines[q].match(new RegExp(`^\\s{${entryIndent + 4}}readonly:\\s*(.+?)\\s*$`));
        if (readonlyMatch) readonly = unquote(readonlyMatch[1]) === 'true';
        const minMatch = fieldLines[q].match(/^\s*min:\s*(-?(?:\d+\.?\d*|\.\d+))\s*$/);
        if (minMatch) min = Number(minMatch[1]);
        const maxMatch = fieldLines[q].match(/^\s*max:\s*(-?(?:\d+\.?\d*|\.\d+))\s*$/);
        if (maxMatch) max = Number(maxMatch[1]);
        if (/^\s*values:\s*$/.test(fieldLines[q])) {
          const valuesIndent = indentOf(fieldLines[q]);
          for (let r = q + 1; r < fieldLines.length; r++) {
            const line = fieldLines[r];
            if (line.trim() && indentOf(line) < valuesIndent) break;
            const named = line.match(new RegExp(`^\\s{${valuesIndent}}- name:\\s*(.+?)\\s*$`));
            if (named) { options.push(unquote(named[1])); continue; }
            const plain = line.match(new RegExp(`^\\s{${valuesIndent}}-\\s*(?!label:)(.+?)\\s*$`));
            if (plain) options.push(unquote(plain[1]));
          }
        }
      }
      fields.push({ name, type, options, label, description, hidden, readonly, min, max });
      k = fieldEnd - 1;
    }
    entries.push({ file, fields });
    i = end - 1;
  }
  return entries;
}

const cmsEntries = parseCmsFileEntries(pages);
for (const entry of cmsEntries) {
  const file = entry.file;
  const data = JSON.parse(read(file));
  const source = Array.isArray(data) ? (data[0] || {}) : data;
  for (const field of entry.fields) {
    const { name, type, options, label, description, hidden, readonly, min, max } = field;
    const exists = Object.prototype.hasOwnProperty.call(source, name);
    if (!exists) errors.push(`${file}: CMS field ${name} is missing from JSON`);
    const current = source[name];
    if (type === 'select' && options.length && !options.includes(String(current))) {
      errors.push(`${file}: ${name}=${JSON.stringify(current)} is outside CMS options ${options.join(', ')}`);
    }
    if (type === 'number' && (!Number.isFinite(min) || !Number.isFinite(max) || min > max)) {
      errors.push(`${file}: number field ${name} must declare valid Pages CMS options.min and options.max bounds`);
    }
    const token = new RegExp(`(^|[^A-Za-z0-9_$])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_$]|$)`);
    const refs = { js: token.test(js), generator: token.test(generator), html: token.test(html), css: token.test(css) };
    if (!Object.values(refs).some(Boolean)) errors.push(`${file}: CMS field ${name} has no runtime/build consumer token`);
    rows.push({ file, name, type, current, options, label, description, hidden, readonly, min, max, refs });
  }
}
if (!cmsEntries.length) errors.push('.pages.yml: no editable JSON file entries were discovered');

// The usability layer must preserve the exact 22 runtime JSON editors and expose helpful metadata.
if (cmsEntries.length !== 22) errors.push(`.pages.yml must expose 22 editable JSON files, found ${cmsEntries.length}`);
if (!pages.includes('type: group')) errors.push('.pages.yml Option A navigation groups are missing');
if (!pages.includes('description:')) errors.push('.pages.yml field helper descriptions are missing');
if (!pages.includes('readonly: true')) errors.push('.pages.yml developer-managed readonly protection is missing');
if (!pages.includes('00. START HERE')) errors.push('.pages.yml Start Here group is missing');


// Every selectable value must have a literal implementation token outside the CMS schema/JSON.
// This catches exposed but dead options such as the previously unimplemented Portfolio `spacious` preset.
const implementationText = [js, css, html, generator].join('\n');
for (const row of rows.filter(row => row.type === 'select')) {
  for (const value of row.options) {
    const valueToken = new RegExp(`(^|[^A-Za-z0-9_$])${String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_$]|$)`);
    if (!valueToken.test(implementationText)) errors.push(`${row.file}: select option ${row.name}=${value} has no runtime/build implementation token`);
  }
}

// Legacy preset compatibility fields remain in JSON for migration, but explicit group controls now own behavior.
// They must not be shown as live controls because selecting them would appear to do nothing.
for (const row of rows.filter(row => row.name === 'visualPreset' && ['data/gateway-appearance.json', 'data/navigation-style.json'].includes(row.file))) {
  if (!row.hidden || !row.readonly) errors.push(`${row.file}: legacy visualPreset must remain hidden and readonly when explicit group controls are present`);
}

// Mode-switch size is appearance, not position. Enforce both JavaScript ownership and CSS selector ownership.
const positionBranch = js.match(/if \(useCustomModeSwitchPosition\(\)\) \{([\s\S]*?)\n\s*\}\n\s*if \(useCustomModeSwitchAppearance\(\)\)/);
const appearanceBranch = js.match(/if \(useCustomModeSwitchAppearance\(\)\) \{([\s\S]*?)\n\s*\}\n\s*if \(useCustomModeSwitchAnimation\(\)\)/);
if (!positionBranch) errors.push('main.js: could not locate the isolated mode-switch position branch');
if (!appearanceBranch) errors.push('main.js: could not locate the isolated mode-switch appearance branch');
if (positionBranch && /dataset\.csSize\s*=/.test(positionBranch[1])) errors.push('main.js: modeSwitchSize is incorrectly owned by the position group');
if (appearanceBranch && !/dataset\.csSize\s*=/.test(appearanceBranch[1])) errors.push('main.js: modeSwitchSize is not applied by the appearance group');
if (/\.cs-mode-switch-position-custom\[data-cs-size=/.test(css)) errors.push('style.css: mode-switch size selectors still depend on the position group');
for (const size of ['compact', 'large']) {
  if (!css.includes(`.cs-mode-switch-appearance-custom[data-cs-size="${size}"]`)) errors.push(`style.css: missing appearance-owned mode-switch size selector for ${size}`);
}
// `standard` intentionally uses the component's approved baseline dimensions, so it needs no override selector.

// Portfolio layout presets exposed in CMS must all create distinct runtime classes and CSS behavior.
if (!js.includes('cs-portfolio-layout-spacious')) errors.push('main.js: Portfolio spacious layout option is exposed but has no runtime class');
if (!css.includes('.cs-portfolio-layout-spacious')) errors.push('style.css: Portfolio spacious layout option is exposed but has no CSS implementation');

// Gateway background effects apply to whichever mode is active; user-facing labels must not hardcode Website.
for (const row of rows.filter(row => row.file === 'data/gateway.json' && ['websiteBackgroundBlur', 'websiteBackgroundBrightness', 'websiteBackgroundSaturation'].includes(row.name))) {
  if (/website background/i.test(row.label) || /website background/i.test(row.description)) errors.push(`.pages.yml: ${row.name} misleadingly describes a Website-only background`);
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
const behavioralDatasetAllow = new Set(['csActiveMode','csHeaderBackground','csPillInitialized','csPositionFallback','csRequestedDesktopPosition','csResponsiveNavigationBound','csPersistentWarning']);
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
  cmsGroups: (pages.match(/^\s*- name:\s*(?:start_here|website_content|portfolio_content|seo_sharing|system_controls)\s*$/gm) || []).length,
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
console.log(`CMS field coverage passed: ${rows.length} fields across ${report.files} JSON files in nested usability groups.`);
