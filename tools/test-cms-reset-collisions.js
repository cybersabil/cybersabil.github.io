#!/usr/bin/env node
/* Audit round 3: file isolation, stable-ID collision guards, malicious payload rejection and sequential reset safety. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { applyReset } = require('./cms-reset.js');
const { verifyRequest } = require('./verify-cms-reset-request.js');
const ROOT = path.resolve(__dirname, '..');
const map = JSON.parse(fs.readFileSync(path.join(ROOT, '.github/cms-defaults/reset-map.json'), 'utf8'));
const errors = [];
let scenarios = 0;
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function readJson(f) { return JSON.parse(fs.readFileSync(f, 'utf8')); }
function writeJson(f, v) { fs.writeFileSync(f, `${JSON.stringify(v, null, 2)}\n`); }
function hash(f) { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); }
function payload(file, action, inputs = {}, source = 'cms-reset-test') { return { source, action: { name: action }, context: { type: 'file', path: file }, inputs }; }
function expectReject(label, fn) {
  try { fn(); errors.push(`${label}: unsafe request was accepted`); }
  catch (_) { scenarios += 1; }
}
function tempRoot() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cybersabil-reset-collision-'));
  fs.cpSync(path.join(ROOT, 'data'), path.join(temp, 'data'), { recursive: true });
  fs.mkdirSync(path.join(temp, '.github/cms-defaults'), { recursive: true });
  fs.cpSync(path.join(ROOT, '.github/cms-defaults'), path.join(temp, '.github/cms-defaults'), { recursive: true });
  return temp;
}
const temp = tempRoot();
try {
  const dataFiles = Object.keys(map.files);
  const defaultHashesBefore = Object.fromEntries(dataFiles.map(file => [file, hash(path.join(temp, '.github/cms-defaults/data', path.basename(file)))]));

  // One representative reset per editor: only the selected JSON file may change.
  for (const [file, info] of Object.entries(map.files)) {
    const target = path.join(temp, file);
    const defaults = readJson(path.join(temp, '.github/cms-defaults/data', path.basename(file)));
    const beforeHashes = Object.fromEntries(dataFiles.map(candidate => [candidate, hash(path.join(temp, candidate))]));
    if (info.kind === 'object') {
      const field = info.fields[0];
      const current = clone(defaults);
      current[field] = `__COLLISION_${field}__`;
      writeJson(target, current);
      applyReset({ root: temp, payload: payload(file, 'reset-one-setting', { setting: field }) });
    } else {
      const id = info.itemIds[0];
      const field = info.fields[0];
      const current = clone(defaults);
      current.find(item => item[map.idKey] === id)[field] = `__COLLISION_${field}__`;
      writeJson(target, current);
      applyReset({ root: temp, payload: payload(file, 'reset-one-list-setting', { item_id: id, setting: field }) });
    }
    for (const other of dataFiles) {
      if (other === file) continue;
      const afterHash = hash(path.join(temp, other));
      if (afterHash !== beforeHashes[other]) errors.push(`${file}: reset modified unrelated file ${other}`);
    }
    scenarios += 1;
  }

  // Stable ID test: title and order can both change, then title reset must target the same card.
  for (const [file, info] of Object.entries(map.files).filter(([, value]) => value.kind === 'list')) {
    const defaults = readJson(path.join(temp, '.github/cms-defaults/data', path.basename(file)));
    const id = info.itemIds[0];
    const titleField = info.fields.includes('title') ? 'title' : info.fields[0];
    const current = clone(defaults).reverse();
    const targetItem = current.find(item => item[map.idKey] === id);
    targetItem[titleField] = '__RENAMED_AND_REORDERED__';
    writeJson(path.join(temp, file), current);
    applyReset({ root: temp, payload: payload(file, 'reset-one-list-setting', { item_id: id, setting: titleField }) });
    const after = readJson(path.join(temp, file));
    const resetItem = after.find(item => item[map.idKey] === id);
    const defaultItem = defaults.find(item => item[map.idKey] === id);
    if (JSON.stringify(resetItem[titleField]) !== JSON.stringify(defaultItem[titleField])) errors.push(`${file}: stable ID did not survive rename/reorder`);
    scenarios += 1;
  }

  // Sequential resets in the same file must not overwrite each other.
  for (const [file, info] of Object.entries(map.files)) {
    if (info.fields.length < 2) continue;
    const defaults = readJson(path.join(temp, '.github/cms-defaults/data', path.basename(file)));
    if (info.kind === 'object') {
      const [a, b] = info.fields;
      const current = clone(defaults); current[a] = '__A__'; current[b] = '__B__'; writeJson(path.join(temp, file), current);
      applyReset({ root: temp, payload: payload(file, 'reset-one-setting', { setting: a }) });
      applyReset({ root: temp, payload: payload(file, 'reset-one-setting', { setting: b }) });
      const after = readJson(path.join(temp, file));
      if (JSON.stringify(after[a]) !== JSON.stringify(defaults[a]) || JSON.stringify(after[b]) !== JSON.stringify(defaults[b])) errors.push(`${file}: sequential object resets collided`);
    } else {
      const [a, b] = info.fields; const id = info.itemIds[0]; const current = clone(defaults); const item = current.find(x => x[map.idKey] === id); item[a] = '__A__'; item[b] = '__B__'; writeJson(path.join(temp, file), current);
      applyReset({ root: temp, payload: payload(file, 'reset-one-list-setting', { item_id: id, setting: a }) });
      applyReset({ root: temp, payload: payload(file, 'reset-one-list-setting', { item_id: id, setting: b }) });
      const afterItem = readJson(path.join(temp, file)).find(x => x[map.idKey] === id); const defaultItem = defaults.find(x => x[map.idKey] === id);
      if (JSON.stringify(afterItem[a]) !== JSON.stringify(defaultItem[a]) || JSON.stringify(afterItem[b]) !== JSON.stringify(defaultItem[b])) errors.push(`${file}: sequential card resets collided`);
    }
    scenarios += 1;
  }

  const objectFile = Object.entries(map.files).find(([, v]) => v.kind === 'object');
  const listFile = Object.entries(map.files).find(([, v]) => v.kind === 'list');
  const [objPath, objInfo] = objectFile;
  const [listPath, listInfo] = listFile;
  expectReject('untrusted source', () => applyReset({ root: temp, payload: payload(objPath, 'reset-one-setting', { setting: objInfo.fields[0] }, 'unknown-source') }));
  expectReject('path traversal', () => applyReset({ root: temp, payload: payload('../data/site.json', 'reset-one-setting', { setting: objInfo.fields[0] }) }));
  expectReject('unknown file', () => applyReset({ root: temp, payload: payload('data/not-allowed.json', 'reset-one-setting', { setting: objInfo.fields[0] }) }));
  expectReject('wrong action for object', () => applyReset({ root: temp, payload: payload(objPath, 'reset-list-order') }));
  expectReject('unknown object setting', () => applyReset({ root: temp, payload: payload(objPath, 'reset-one-setting', { setting: '__UNKNOWN__' }) }));
  expectReject('wrong action for list', () => applyReset({ root: temp, payload: payload(listPath, 'reset-one-setting', { setting: listInfo.fields[0] }) }));
  expectReject('unknown list item', () => applyReset({ root: temp, payload: payload(listPath, 'reset-one-list-setting', { item_id: crypto.randomUUID(), setting: listInfo.fields[0] }) }));
  expectReject('unknown list field', () => applyReset({ root: temp, payload: payload(listPath, 'reset-one-list-setting', { item_id: listInfo.itemIds[0], setting: '__UNKNOWN__' }) }));

  const duplicate = readJson(path.join(temp, listPath));
  if (duplicate.length > 1) duplicate[1][map.idKey] = duplicate[0][map.idKey];
  else duplicate.push(clone(duplicate[0]));
  writeJson(path.join(temp, listPath), duplicate);
  expectReject('duplicate stable ID', () => applyReset({ root: temp, payload: payload(listPath, 'reset-list-order') }));

  const validRequest = {
    source: 'pages-cms',
    repository: { owner: 'cybersabil', repo: 'cybersabil.github.io', ref: 'main', sha: 'a'.repeat(40) }
  };
  try {
    verifyRequest({ payload: validRequest, currentSha: 'a'.repeat(40), repository: 'cybersabil/cybersabil.github.io', refName: 'main' });
    scenarios += 1;
  } catch (error) { errors.push(`fresh request was rejected: ${error.message}`); }
  expectReject('stale request SHA', () => verifyRequest({ payload: validRequest, currentSha: 'b'.repeat(40), repository: 'cybersabil/cybersabil.github.io', refName: 'main' }));
  expectReject('wrong request repository', () => verifyRequest({ payload: validRequest, currentSha: 'a'.repeat(40), repository: 'other/repo', refName: 'main' }));
  expectReject('wrong request branch', () => verifyRequest({ payload: validRequest, currentSha: 'a'.repeat(40), repository: 'cybersabil/cybersabil.github.io', refName: 'dev' }));

  for (const [file, before] of Object.entries(defaultHashesBefore)) {
    const after = hash(path.join(temp, '.github/cms-defaults/data', path.basename(file)));
    if (before !== after) errors.push(`${file}: approved defaults were modified by reset tests`);
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const report = { round: 3, name: 'collision-security-isolation', scenarios, errors };
fs.writeFileSync(path.join(ROOT, 'docs/CMS_RESET_AUDIT_ROUND_3_COLLISIONS.json'), `${JSON.stringify(report, null, 2)}\n`);
if (errors.length) {
  console.error('CMS reset collision audit failed:');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`CMS reset collision/security audit passed: ${scenarios} scenarios.`);
