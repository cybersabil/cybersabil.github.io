#!/usr/bin/env node
/* CyberSabil Pages CMS individual reset engine.
   Resets exactly one approved setting/card field or restores the approved order.
   Security: fixed allowlist, fixed data paths, stable hidden UUIDs, atomic JSON writes. */
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const MAP_REL = '.github/cms-defaults/reset-map.json';
const DEFAULT_DATA_REL = '.github/cms-defaults/data';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function atomicWriteJson(file, value) {
  const dir = path.dirname(file);
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, stableJson(value), 'utf8');
  fs.renameSync(tmp, file);
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function normalizeAllowedPath(rawPath, resetMap) {
  const normalized = path.posix.normalize(String(rawPath || '').replace(/\\/g, '/'));
  if (!/^data\/[A-Za-z0-9._-]+\.json$/.test(normalized)) {
    throw new Error(`Unsafe or unsupported CMS data path: ${rawPath}`);
  }
  if (!Object.prototype.hasOwnProperty.call(resetMap.files, normalized)) {
    throw new Error(`CMS reset is not allowed for: ${normalized}`);
  }
  return normalized;
}

function validateUniqueIds(list, idKey, label) {
  const seen = new Set();
  for (const [index, item] of list.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`${label} item ${index + 1} must be an object`);
    }
    const id = String(item[idKey] || '');
    if (!id) throw new Error(`${label} item ${index + 1} is missing ${idKey}`);
    if (seen.has(id)) throw new Error(`${label} contains duplicate ${idKey}: ${id}`);
    seen.add(id);
  }
  return seen;
}

function validatePayload(payload, resetMap) {
  requireObject(payload, 'Payload');
  if (payload.source !== 'pages-cms' && payload.source !== 'cms-reset-test') {
    throw new Error('Reset request source is not trusted');
  }
  const action = requireObject(payload.action, 'Payload action');
  const context = requireObject(payload.context, 'Payload context');
  const inputs = requireObject(payload.inputs || {}, 'Payload inputs');
  const file = normalizeAllowedPath(context.path, resetMap);
  const fileMap = resetMap.files[file];
  const actionName = String(action.name || '');
  const allowedByKind = fileMap.kind === 'list'
    ? new Set(['reset-one-list-setting', 'reset-list-order'])
    : new Set(['reset-one-setting']);
  if (!allowedByKind.has(actionName)) {
    throw new Error(`Action ${actionName || '(missing)'} is not valid for ${file}`);
  }
  return { actionName, file, fileMap, inputs };
}

function resetObjectSetting(current, defaults, fileMap, setting) {
  if (!fileMap.fields.includes(setting)) throw new Error(`Unknown reset setting: ${setting}`);
  if (!Object.prototype.hasOwnProperty.call(defaults, setting)) {
    throw new Error(`Approved default is missing setting: ${setting}`);
  }
  const next = clone(current);
  next[setting] = clone(defaults[setting]);
  return { next, detail: setting };
}

function resetListSetting(current, defaults, fileMap, inputs, idKey) {
  const itemId = String(inputs.item_id || '');
  const setting = String(inputs.setting || '');
  if (!fileMap.itemIds.includes(itemId)) throw new Error(`Unknown approved item ID: ${itemId}`);
  if (setting !== '__item__' && !fileMap.fields.includes(setting)) {
    throw new Error(`Unknown reset card setting: ${setting}`);
  }
  validateUniqueIds(current, idKey, 'Current list');
  validateUniqueIds(defaults, idKey, 'Approved default list');
  const defaultItem = defaults.find(item => String(item[idKey]) === itemId);
  if (!defaultItem) throw new Error(`Approved default item is missing: ${itemId}`);
  const next = clone(current);
  const index = next.findIndex(item => String(item[idKey]) === itemId);
  if (setting === '__item__') {
    if (index >= 0) next[index] = clone(defaultItem);
    else next.push(clone(defaultItem));
    return { next, detail: `${itemId}:complete-item` };
  }
  if (index < 0) {
    throw new Error('Selected original item was deleted. Choose “Complete item” to restore it first.');
  }
  if (!Object.prototype.hasOwnProperty.call(defaultItem, setting)) {
    throw new Error(`Approved item default is missing setting: ${setting}`);
  }
  next[index][setting] = clone(defaultItem[setting]);
  return { next, detail: `${itemId}:${setting}` };
}

function resetListOrder(current, defaults, fileMap, idKey) {
  validateUniqueIds(current, idKey, 'Current list');
  validateUniqueIds(defaults, idKey, 'Approved default list');
  const approvedIds = new Set(fileMap.itemIds);
  const currentById = new Map(current.map(item => [String(item[idKey]), item]));
  const orderedDefaults = fileMap.itemIds
    .filter(id => currentById.has(id))
    .map(id => clone(currentById.get(id)));
  const customItems = current.filter(item => !approvedIds.has(String(item[idKey]))).map(clone);
  return { next: [...orderedDefaults, ...customItems], detail: 'original-order' };
}

function applyReset({ root = DEFAULT_ROOT, payload, write = true, outputFile = null } = {}) {
  const repoRoot = path.resolve(root);
  const resetMap = readJson(path.join(repoRoot, MAP_REL));
  requireObject(resetMap.files, 'Reset map files');
  const { actionName, file, fileMap, inputs } = validatePayload(payload, resetMap);
  const target = path.resolve(repoRoot, file);
  const expectedPrefix = `${repoRoot}${path.sep}`;
  if (!target.startsWith(expectedPrefix)) throw new Error('Resolved reset target escaped repository root');
  const defaultFile = path.join(repoRoot, DEFAULT_DATA_REL, path.basename(file));
  if (!fs.existsSync(target)) throw new Error(`Current CMS data file is missing: ${file}`);
  if (!fs.existsSync(defaultFile)) throw new Error(`Approved default file is missing: ${defaultFile}`);
  const current = readJson(target);
  const defaults = readJson(defaultFile);
  let result;
  if (fileMap.kind === 'object') {
    if (Array.isArray(current) || Array.isArray(defaults)) throw new Error(`${file} must contain an object`);
    result = resetObjectSetting(current, defaults, fileMap, String(inputs.setting || ''));
  } else {
    if (!Array.isArray(current) || !Array.isArray(defaults)) throw new Error(`${file} must contain a list`);
    const idKey = String(resetMap.idKey || '_cmsResetId');
    result = actionName === 'reset-list-order'
      ? resetListOrder(current, defaults, fileMap, idKey)
      : resetListSetting(current, defaults, fileMap, inputs, idKey);
  }
  const beforeText = stableJson(current);
  const afterText = stableJson(result.next);
  const changed = beforeText !== afterText;
  if (write && changed) atomicWriteJson(target, result.next);
  const summary = {
    ok: true,
    changed,
    file,
    action: actionName,
    detail: result.detail,
    message: changed ? `Reset applied: ${file} → ${result.detail}` : `Already at approved default: ${file} → ${result.detail}`,
  };
  if (outputFile) fs.writeFileSync(outputFile, `${JSON.stringify(summary)}\n`, 'utf8');
  return summary;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--payload-file') out.payloadFile = argv[++i];
    else if (arg === '--root') out.root = argv[++i];
    else if (arg === '--github-output') out.githubOutput = argv[++i];
    else if (arg === '--dry-run') out.dryRun = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    let raw;
    if (args.payloadFile) raw = fs.readFileSync(args.payloadFile, 'utf8');
    else raw = process.env.PAGES_CMS_PAYLOAD;
    if (!raw) throw new Error('Pages CMS payload was not provided');
    const payload = JSON.parse(raw);
    const summary = applyReset({ root: args.root || DEFAULT_ROOT, payload, write: !args.dryRun });
    console.log(summary.message);
    if (args.githubOutput) {
      fs.appendFileSync(args.githubOutput, `target_file=${summary.file}\nchanged=${summary.changed}\nreset_message=${summary.message.replace(/\r?\n/g, ' ')}\n`, 'utf8');
    }
  } catch (error) {
    console.error(`CMS reset failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  applyReset,
  atomicWriteJson,
  normalizeAllowedPath,
  resetListOrder,
  resetListSetting,
  resetObjectSetting,
  stableJson,
  validatePayload,
  validateUniqueIds,
};
