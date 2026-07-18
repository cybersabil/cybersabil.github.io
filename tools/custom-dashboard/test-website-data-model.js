"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..", "..");
const model = require(
  path.join(root, "admin1", "data-model.js"),
);
const schema = JSON.parse(
  fs.readFileSync(
    path.join(root, "admin1", "schema.generated.json"),
    "utf8",
  ),
);

const listPaths = [
  "data/tools.json",
  "data/downloads.json",
  "data/projects.json",
  "data/skills.json",
  "data/docs.json",
  "data/faq.json",
];

const fieldsForPath = (jsonPath) =>
  schema.fields.filter(
    (field) => field.jsonPath === jsonPath,
  );

for (const jsonPath of listPaths) {
  const list = JSON.parse(
    fs.readFileSync(
      path.join(root, jsonPath),
      "utf8",
    ),
  );

  const result = model.validateList(
    list,
    fieldsForPath(jsonPath),
  );

  assert.strictEqual(
    result.valid,
    true,
    `${jsonPath}: ${result.errors.join(" ")}`,
  );
}

console.log(
  "AUDIT PASS 2A - All six Website lists and stable IDs: PASS",
);

const toolsPath = "data/tools.json";
const toolFields = fieldsForPath(toolsPath);
const originalTools = JSON.parse(
  fs.readFileSync(
    path.join(root, toolsPath),
    "utf8",
  ),
);

const firstId = originalTools[0]._cmsResetId;
const withUnknown = model.clone(originalTools);
withUnknown[0].futurePagesCmsKey = {
  enabled: true,
};

const edited = model.setListField(
  withUnknown,
  firstId,
  "title",
  "Collision-safe test title",
);

assert.deepStrictEqual(
  edited[0].futurePagesCmsKey,
  { enabled: true },
  "Unknown key was not preserved.",
);

assert.deepStrictEqual(
  edited.slice(1),
  originalTools.slice(1),
  "Unrelated list items were modified.",
);

assert.strictEqual(
  withUnknown[0].title,
  originalTools[0].title,
  "Source array was mutated.",
);

const fixedUuid =
  "11111111-1111-4111-8111-111111111111";

const newItem = model.createListItem(
  toolFields,
  () => fixedUuid,
);

assert.strictEqual(
  newItem._cmsResetId,
  fixedUuid,
);

assert.strictEqual(
  model.validUuid(newItem._cmsResetId),
  true,
);

const withNew = [...edited, newItem];

const moved = model.moveItem(
  withNew,
  fixedUuid,
  "up",
);

assert.strictEqual(
  moved[moved.length - 2]._cmsResetId,
  fixedUuid,
  "Move operation failed.",
);

assert.deepStrictEqual(
  new Set(
    moved.map((item) => item._cmsResetId),
  ),
  new Set(
    withNew.map((item) => item._cmsResetId),
  ),
  "Move operation changed stable IDs.",
);

const deleted = model.deleteItem(
  moved,
  fixedUuid,
);

assert.strictEqual(
  deleted.some(
    (item) =>
      item._cmsResetId === fixedUuid,
  ),
  false,
  "Delete operation failed.",
);

assert.deepStrictEqual(
  deleted,
  edited,
  "Delete changed unrelated items/order.",
);

console.log(
  "AUDIT PASS 2B - Edit/add/delete/reorder/unknown-key preservation: PASS",
);

const broken = model.clone(originalTools);
delete broken[0]._cmsResetId;
broken[1]._cmsResetId =
  broken[2]._cmsResetId;

let generated = 0;
const normalized =
  model.normalizeListIdentities(
    broken,
    () => {
      generated += 1;
      return generated === 1
        ? "22222222-2222-4222-8222-222222222222"
        : "33333333-3333-4333-8333-333333333333";
    },
  );

assert.strictEqual(
  normalized.repairs.length,
  2,
  "Missing/duplicate identity repair count is wrong.",
);

assert.strictEqual(
  normalized.list[3]._cmsResetId,
  originalTools[3]._cmsResetId,
  "Unaffected valid original identity was regenerated.",
);

assert.strictEqual(
  normalized.list[1]._cmsResetId,
  originalTools[2]._cmsResetId,
  "First valid duplicate occurrence should be preserved.",
);

assert.strictEqual(
  model.validateList(
    normalized.list,
    toolFields,
  ).valid,
  true,
  "Normalized list is invalid.",
);

console.log(
  "AUDIT PASS 2C - Pages CMS missing/duplicate identity recovery: PASS",
);

const changed = model.setListField(
  originalTools,
  firstId,
  "status",
  "Test",
);
const addedList = [
  ...changed,
  model.createListItem(
    toolFields,
    () =>
      "44444444-4444-4444-8444-444444444444",
  ),
];
const existingLastId =
  originalTools[originalTools.length - 1]._cmsResetId;
const reordered = model.moveItem(
  addedList,
  existingLastId,
  "up",
);
const diff = model.listDiff(
  originalTools,
  reordered,
  toolFields,
);

assert.ok(
  diff.added.length >= 1,
  "Added item diff missing.",
);
assert.ok(
  diff.changed.some(
    (entry) =>
      entry.field === "status",
  ),
  "Field change diff missing.",
);
assert.ok(
  diff.moved.length >= 1,
  "Move diff missing.",
);

console.log(
  "AUDIT PASS 2D - Granular review diff: PASS",
);

const objectBefore = {
  title: "Before",
  futureKey: {
    preserved: true,
  },
};
const objectAfter = model.clone(objectBefore);
objectAfter.title = "After";

const objectDiff = model.objectDiff(
  objectBefore,
  objectAfter,
  [
    {
      name: "title",
    },
  ],
);

assert.strictEqual(
  objectDiff.length,
  1,
);
assert.deepStrictEqual(
  objectAfter.futureKey,
  {
    preserved: true,
  },
);

console.log(
  "AUDIT PASS 2E - Object unknown-key preservation and review: PASS",
);
console.log(
  "WEBSITE DATA MODEL COLLISION AUDIT: PASS",
);
