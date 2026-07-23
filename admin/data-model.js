(function initCyberSabilDataModel(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.CyberSabilDataModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const equal = (left, right) =>
    JSON.stringify(left) === JSON.stringify(right);

  const isPlainObject = (value) =>
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);

  const validUuid = (value) =>
    typeof value === "string" && UUID_PATTERN.test(value);

  const fallbackUuid = () => {
    const bytes = new Uint8Array(16);

    if (
      typeof crypto !== "undefined" &&
      typeof crypto.getRandomValues === "function"
    ) {
      crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = [...bytes]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-");
  };

  const createUuid = () => {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return fallbackUuid();
  };

  const defaultValueForField = (field) => {
    if (field.default !== null && field.default !== undefined) {
      return clone(field.default);
    }

    if (field.type === "number") {
      return null;
    }

    if (field.type === "boolean" || field.type === "checkbox") {
      return false;
    }

    return "";
  };

  const createListItem = (fields, uuidFactory = createUuid) => {
    const item = {};

    fields.forEach((field) => {
      if (field.name === "_cmsResetId") {
        item[field.name] = uuidFactory();
        return;
      }

      if (!field.hidden) {
        item[field.name] = defaultValueForField(field);
      }
    });

    if (!validUuid(item._cmsResetId)) {
      throw new Error("A valid _cmsResetId could not be generated.");
    }

    return item;
  };


  const normalizeListIdentities = (
    list,
    uuidFactory = createUuid,
  ) => {
    if (!Array.isArray(list)) {
      return {
        list,
        repairs: [],
      };
    }

    const next = clone(list);
    const seen = new Set();
    const repairs = [];

    next.forEach((item, index) => {
      if (!isPlainObject(item)) {
        return;
      }

      const current = item._cmsResetId;

      if (!validUuid(current) || seen.has(current)) {
        const replacement = uuidFactory();
        item._cmsResetId = replacement;
        repairs.push({
          index,
          before: current,
          after: replacement,
        });
        seen.add(replacement);
      } else {
        seen.add(current);
      }
    });

    return {
      list: next,
      repairs,
    };
  };

  const validateList = (list, fields = []) => {
    const errors = [];

    if (!Array.isArray(list)) {
      return {
        valid: false,
        errors: ["Top-level JSON value must be an array."],
      };
    }

    const knownNames = new Set(fields.map((field) => field.name));
    const seenIds = new Set();

    list.forEach((item, index) => {
      if (!isPlainObject(item)) {
        errors.push(`Item ${index + 1} must be a JSON object.`);
        return;
      }

      const id = item._cmsResetId;

      if (!validUuid(id)) {
        errors.push(
          `Item ${index + 1} has a missing or invalid _cmsResetId.`,
        );
      } else if (seenIds.has(id)) {
        errors.push(`Duplicate _cmsResetId found: ${id}`);
      } else {
        seenIds.add(id);
      }

      fields.forEach((field) => {
        if (field.hidden && field.name !== "_cmsResetId") {
          return;
        }

        if (field.required && !(field.name in item)) {
          errors.push(
            `Item ${index + 1} is missing required field ${field.name}.`,
          );
        }
      });

      Object.keys(item).forEach((key) => {
        if (!knownNames.has(key)) {
          // Unknown keys are intentionally permitted and preserved.
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  const itemLabel = (item, index = 0) => {
    const candidates = [
      item?.title,
      item?.question,
      item?.name,
      item?.label,
      item?.status,
    ];

    const chosen = candidates.find(
      (value) =>
        typeof value === "string" && value.trim().length > 0,
    );

    return chosen ? chosen.trim() : `Item ${index + 1}`;
  };

  const moveItem = (list, itemId, direction) => {
    const next = clone(list);
    const index = next.findIndex(
      (item) => item._cmsResetId === itemId,
    );

    if (index < 0) {
      throw new Error("List item was not found.");
    }

    const target =
      direction === "up"
        ? index - 1
        : direction === "down"
          ? index + 1
          : Number(direction);

    if (
      !Number.isInteger(target) ||
      target < 0 ||
      target >= next.length ||
      target === index
    ) {
      return next;
    }

    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    return next;
  };

  const deleteItem = (list, itemId) =>
    clone(list).filter(
      (item) => item._cmsResetId !== itemId,
    );

  const setListField = (
    list,
    itemId,
    fieldName,
    value,
  ) => {
    const next = clone(list);
    const item = next.find(
      (candidate) =>
        candidate._cmsResetId === itemId,
    );

    if (!item) {
      throw new Error("List item was not found.");
    }

    item[fieldName] = value;
    return next;
  };

  const objectDiff = (before, after, fields = []) => {
    const knownOrder = fields.map((field) => field.name);
    const allKeys = [
      ...knownOrder,
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ];
    const uniqueKeys = [...new Set(allKeys)];

    return uniqueKeys
      .filter(
        (key) =>
          !equal(before?.[key], after?.[key]),
      )
      .map((key) => ({
        kind: "field",
        field: key,
        before: before?.[key],
        after: after?.[key],
      }));
  };

  const listDiff = (before, after, fields = []) => {
    const beforeList = Array.isArray(before) ? before : [];
    const afterList = Array.isArray(after) ? after : [];
    const beforeMap = new Map(
      beforeList.map((item, index) => [
        item._cmsResetId,
        { item, index },
      ]),
    );
    const afterMap = new Map(
      afterList.map((item, index) => [
        item._cmsResetId,
        { item, index },
      ]),
    );

    const added = [];
    const removed = [];
    const changed = [];

    afterList.forEach((item, index) => {
      if (!beforeMap.has(item._cmsResetId)) {
        added.push({
          kind: "added",
          id: item._cmsResetId,
          index,
          label: itemLabel(item, index),
          item,
        });
      }
    });

    beforeList.forEach((item, index) => {
      if (!afterMap.has(item._cmsResetId)) {
        removed.push({
          kind: "removed",
          id: item._cmsResetId,
          index,
          label: itemLabel(item, index),
          item,
        });
      }
    });

    const commonBeforeOrder = beforeList
      .filter((item) => afterMap.has(item._cmsResetId))
      .map((item) => item._cmsResetId);
    const commonAfterOrder = afterList
      .filter((item) => beforeMap.has(item._cmsResetId))
      .map((item) => item._cmsResetId);

    const beforeRanks = new Map(
      commonBeforeOrder.map((id, index) => [id, index]),
    );
    const afterRanks = new Map(
      commonAfterOrder.map((id, index) => [id, index]),
    );

    const moved = commonAfterOrder
      .filter(
        (id) =>
          beforeRanks.get(id) !== afterRanks.get(id),
      )
      .map((id) => ({
        kind: "moved",
        id,
        beforeIndex: beforeMap.get(id).index,
        afterIndex: afterMap.get(id).index,
        label: itemLabel(
          afterMap.get(id).item,
          afterMap.get(id).index,
        ),
      }));

    commonAfterOrder.forEach((id) => {
      const beforeEntry = beforeMap.get(id);
      const afterEntry = afterMap.get(id);
      const itemChanges = objectDiff(
        beforeEntry.item,
        afterEntry.item,
        fields,
      ).filter((change) => change.field !== "_cmsResetId");

      itemChanges.forEach((change) => {
        changed.push({
          kind: "changed",
          id,
          label: itemLabel(
            afterEntry.item,
            afterEntry.index,
          ),
          beforeIndex: beforeEntry.index,
          afterIndex: afterEntry.index,
          ...change,
        });
      });
    });

    return {
      added,
      removed,
      moved,
      changed,
      count:
        added.length +
        removed.length +
        moved.length +
        changed.length,
    };
  };

  const changedItemIds = (before, after, fields = []) => {
    const diff = listDiff(before, after, fields);
    return new Set([
      ...diff.added.map((item) => item.id),
      ...diff.removed.map((item) => item.id),
      ...diff.moved.map((item) => item.id),
      ...diff.changed.map((item) => item.id),
    ]);
  };

  return Object.freeze({
    UUID_PATTERN,
    clone,
    equal,
    isPlainObject,
    validUuid,
    createUuid,
    createListItem,
    normalizeListIdentities,
    validateList,
    itemLabel,
    moveItem,
    deleteItem,
    setListField,
    objectDiff,
    listDiff,
    changedItemIds,
  });
});
