#!/usr/bin/env node
/* Audit round 2: exhaustive individual reset behavior for every allowlisted object field and every default card field. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { applyReset } = require('./cms-reset.js');
const ROOT = path.resolve(__dirname, '..');
const map = JSON.parse(fs.readFileSync(path.join(ROOT, '.github/cms-defaults/reset-map.json'), 'utf8'));
const errors = [];
let scenarios = 0;

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function mutated(value) {
  if (typeof value === 'string') return value === '__RESET_MUTATION__' ? '__RESET_MUTATION_2__' : '__RESET_MUTATION__';
  if (typeof value === 'number') return value + 987.654;
  if (typeof value === 'boolean') return !value;
  if (value === null) return '__RESET_MUTATION__';
  if (Array.isArray(value)) return ['__RESET_MUTATION__'];
  if (typeof value === 'object') return { __resetMutation: true };
  return '__RESET_MUTATION__';
}
function payload(file, action, inputs = {}) {
  return { source: 'cms-reset-test', action: { name: action }, context: { type: 'file', path: file }, inputs };
}
function setupTemp() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cybersabil-reset-behavior-'));
  fs.cpSync(path.join(ROOT, 'data'), path.join(temp, 'data'), { recursive: true });
  fs.mkdirSync(path.join(temp, '.github/cms-defaults'), { recursive: true });
  fs.cpSync(path.join(ROOT, '.github/cms-defaults'), path.join(temp, '.github/cms-defaults'), { recursive: true });
  return temp;
}
function canonical(value) { return JSON.stringify(value); }

const temp = setupTemp();
try {
  for (const [file, info] of Object.entries(map.files)) {
    const target = path.join(temp, file);
    const defaults = readJson(path.join(temp, '.github/cms-defaults/data', path.basename(file)));
    if (info.kind === 'object') {
      for (const field of info.fields) {
        const before = clone(defaults);
        before[field] = mutated(defaults[field]);
        const expectedOthers = clone(before);
        writeJson(target, before);
        const result = applyReset({ root: temp, payload: payload(file, 'reset-one-setting', { setting: field }) });
        const after = readJson(target);
        if (!result.changed) errors.push(`${file}:${field} should report changed`);
        if (canonical(after[field]) !== canonical(defaults[field])) errors.push(`${file}:${field} did not restore approved default`);
        delete after[field]; delete expectedOthers[field];
        if (canonical(after) !== canonical(expectedOthers)) errors.push(`${file}:${field} changed unrelated settings`);
        scenarios += 1;
      }
    } else {
      for (const defaultItem of defaults) {
        const id = defaultItem[map.idKey];
        for (const field of info.fields) {
          const before = clone(defaults).reverse();
          const item = before.find(candidate => candidate[map.idKey] === id);
          item[field] = mutated(defaultItem[field]);
          const expected = clone(before);
          expected.find(candidate => candidate[map.idKey] === id)[field] = clone(defaultItem[field]);
          writeJson(target, before);
          const result = applyReset({ root: temp, payload: payload(file, 'reset-one-list-setting', { item_id: id, setting: field }) });
          const after = readJson(target);
          if (!result.changed) errors.push(`${file}:${id}:${field} should report changed`);
          if (canonical(after) !== canonical(expected)) errors.push(`${file}:${id}:${field} reset changed wrong card/field or order`);
          scenarios += 1;
        }
        const beforeComplete = clone(defaults);
        const completeIndex = beforeComplete.findIndex(candidate => candidate[map.idKey] === id);
        for (const field of info.fields) beforeComplete[completeIndex][field] = mutated(defaultItem[field]);
        writeJson(target, beforeComplete);
        applyReset({ root: temp, payload: payload(file, 'reset-one-list-setting', { item_id: id, setting: '__item__' }) });
        const afterComplete = readJson(target);
        if (canonical(afterComplete[completeIndex]) !== canonical(defaultItem)) errors.push(`${file}:${id} complete-item reset failed`);
        scenarios += 1;

        const deleted = clone(defaults).filter(candidate => candidate[map.idKey] !== id);
        writeJson(target, deleted);
        applyReset({ root: temp, payload: payload(file, 'reset-one-list-setting', { item_id: id, setting: '__item__' }) });
        const restored = readJson(target);
        const restoredItem = restored.find(candidate => candidate[map.idKey] === id);
        if (!restoredItem || canonical(restoredItem) !== canonical(defaultItem)) errors.push(`${file}:${id} deleted-item restore failed`);
        scenarios += 1;
      }

      const custom = { [map.idKey]: crypto.randomUUID(), title: 'Custom item preserved', customOnly: true };
      const shuffled = [...clone(defaults).reverse(), custom];
      writeJson(target, shuffled);
      applyReset({ root: temp, payload: payload(file, 'reset-list-order') });
      const ordered = readJson(target);
      const orderedIds = ordered.filter(item => info.itemIds.includes(item[map.idKey])).map(item => item[map.idKey]);
      if (canonical(orderedIds) !== canonical(info.itemIds)) errors.push(`${file}: original default order was not restored`);
      const customAfter = ordered.find(item => item[map.idKey] === custom[map.idKey]);
      if (canonical(customAfter) !== canonical(custom)) errors.push(`${file}: custom item changed/deleted during order reset`);
      scenarios += 1;
    }
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const report = { round: 2, name: 'exhaustive-reset-behavior', scenarios, errors };
fs.writeFileSync(path.join(ROOT, 'docs/CMS_RESET_AUDIT_ROUND_2_BEHAVIOR.json'), `${JSON.stringify(report, null, 2)}\n`);
if (errors.length) {
  console.error('CMS reset behavior audit failed:');
  errors.slice(0, 100).forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`CMS reset behavior audit passed: ${scenarios} individual/reset-order scenarios.`);
