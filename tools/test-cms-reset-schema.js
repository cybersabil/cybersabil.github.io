#!/usr/bin/env node
/* Audit round 1: static schema, action configuration, default map and stable-ID validation. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = rel => JSON.parse(read(rel));
const pages = read('.pages.yml');
const map = json('.github/cms-defaults/reset-map.json');
const errors = [];
const results = [];
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function entryBlockFor(file) {
  const lines = pages.split(/\r?\n/);
  const pathIndex = lines.findIndex(line => line.trim() === `path: ${file}`);
  if (pathIndex < 0) return '';
  let start = pathIndex;
  while (start >= 0 && !/^\s*- name:\s*/.test(lines[start])) start -= 1;
  if (start < 0) return '';
  const indent = (lines[start].match(/^\s*/) || [''])[0].length;
  let end = start + 1;
  while (end < lines.length) {
    if (lines[end].trim() && /^\s*- name:\s*/.test(lines[end]) && (lines[end].match(/^\s*/) || [''])[0].length <= indent) break;
    end += 1;
  }
  return lines.slice(start, end).join('\n');
}

if (map.version !== 1) errors.push('reset-map version must be 1');
if (map.idKey !== '_cmsResetId') errors.push('reset-map idKey must be _cmsResetId');
const files = Object.keys(map.files || {});
if (files.length !== 22) errors.push(`reset-map must contain 22 editors, found ${files.length}`);
if (!fs.existsSync(path.join(ROOT, '.github/workflows/cms-reset.yml'))) errors.push('cms-reset.yml workflow is missing');
const workflow = read('.github/workflows/cms-reset.yml');
[
  'workflow_dispatch:', 'payload:', 'contents: write', 'pages: write', 'id-token: write',
  'node tools/verify-cms-reset-request.js', 'node tools/cms-reset.js', 'node tools/test-cms-reset-schema.js',
  'node tools/test-cms-reset-behavior.js', 'node tools/test-cms-reset-collisions.js',
  'git add -- "$TARGET_FILE"', 'actions/upload-pages-artifact@v4', 'actions/deploy-pages@v4'
].forEach(token => { if (!workflow.includes(token)) errors.push(`cms-reset.yml missing: ${token}`); });

for (const file of files) {
  const info = map.files[file];
  const current = json(file);
  const defaultsRel = `.github/cms-defaults/data/${path.basename(file)}`;
  if (!fs.existsSync(path.join(ROOT, defaultsRel))) {
    errors.push(`${file}: approved default file missing`);
    continue;
  }
  const defaults = json(defaultsRel);
  const block = entryBlockFor(file);
  if (!block) errors.push(`${file}: Pages CMS editor block missing`);
  if (!block.includes('workflow: cms-reset.yml')) errors.push(`${file}: reset workflow action missing`);
  if (!block.includes('ref: current')) errors.push(`${file}: reset action must use current branch`);
  if (!block.includes('cancelable: false')) errors.push(`${file}: reset action must not be cancelable mid-write`);
  for (const field of info.fields) {
    if (!block.includes(`value: ${field}`)) errors.push(`${file}: action dropdown missing field ${field}`);
  }
  if (info.kind === 'object') {
    if (Array.isArray(current) || Array.isArray(defaults)) errors.push(`${file}: object editor contains a list`);
    if (!block.includes('name: reset-one-setting')) errors.push(`${file}: Reset one setting action missing`);
    for (const field of info.fields) {
      if (!Object.prototype.hasOwnProperty.call(current, field)) errors.push(`${file}: current value missing ${field}`);
      if (!Object.prototype.hasOwnProperty.call(defaults, field)) errors.push(`${file}: approved default missing ${field}`);
    }
  } else if (info.kind === 'list') {
    if (!Array.isArray(current) || !Array.isArray(defaults)) errors.push(`${file}: list editor does not contain a list`);
    if (!block.includes('name: reset-one-list-setting')) errors.push(`${file}: card-setting reset action missing`);
    if (!block.includes('name: reset-list-order')) errors.push(`${file}: order reset action missing`);
    if (!block.includes('- name: _cmsResetId') || !block.includes('type: uuid') || !block.includes('hidden: true')) {
      errors.push(`${file}: hidden stable UUID field missing`);
    }
    const currentIds = current.map(item => item[map.idKey]);
    const defaultIds = defaults.map(item => item[map.idKey]);
    if (new Set(currentIds).size !== currentIds.length) errors.push(`${file}: duplicate current reset IDs`);
    if (new Set(defaultIds).size !== defaultIds.length) errors.push(`${file}: duplicate default reset IDs`);
    if (JSON.stringify(defaultIds) !== JSON.stringify(info.itemIds)) errors.push(`${file}: reset-map item order differs from approved defaults`);
    for (const id of info.itemIds) {
      if (!uuidRe.test(String(id))) errors.push(`${file}: invalid UUID ${id}`);
      if (!block.includes(`value: ${id}`)) errors.push(`${file}: action dropdown missing item ID ${id}`);
    }
    for (const item of defaults) {
      for (const field of info.fields) {
        if (!Object.prototype.hasOwnProperty.call(item, field)) errors.push(`${file}: default item ${item[map.idKey]} missing ${field}`);
      }
    }
  } else errors.push(`${file}: unknown reset-map kind ${info.kind}`);
  results.push({ file, kind: info.kind, fields: info.fields.length, items: info.itemIds?.length || 0 });
}

const report = {
  round: 1,
  name: 'schema-and-action-map',
  files: results.length,
  actions: (pages.match(/workflow: cms-reset\.yml/g) || []).length,
  mapSha256: crypto.createHash('sha256').update(JSON.stringify(map)).digest('hex'),
  errors,
  results,
};
fs.writeFileSync(path.join(ROOT, 'docs/CMS_RESET_AUDIT_ROUND_1_SCHEMA.json'), `${JSON.stringify(report, null, 2)}\n`);
if (errors.length) {
  console.error('CMS reset schema audit failed:');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`CMS reset schema audit passed: ${results.length} editors, ${report.actions} action bindings.`);
