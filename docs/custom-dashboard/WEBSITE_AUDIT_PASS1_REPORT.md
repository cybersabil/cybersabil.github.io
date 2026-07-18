# CyberSabil Admin1 — Website Category Triple Audit

## Snapshot audited

| Item | Value |
|---|---|
| Export time | 2026-07-18 15:12:01 +05:30 |
| Repository | `cybersabil/cybersabil.github.io` |
| Branch | `feature/chatgpt-custom-dashboard-v2` |
| Commit | `4b312bcb164d93c9cdefc81da8bb38ddad0ad153` |
| Exported project files | 196 |
| Pages CMS editors | 22 |
| Total Admin1 schema fields | 428 |

## Permanent safety requirement

`app.pagescms.org` remains the permanent safe parallel CMS.

The following rules are mandatory for every category:

1. Do not change or replace `.pages.yml` merely to suit Admin1.
2. Pages CMS must continue to edit the same canonical JSON files.
3. Admin1 must load the latest GitHub file SHA before saving.
4. A stale SHA or changed branch head must block the save.
5. Unknown JSON keys must be preserved.
6. Existing list-item `_cmsResetId` values must never be regenerated or removed.
7. No category becomes editable until all three audits pass.
8. Existing Sveltia `/admin/` remains untouched.

---

# Website category scope

## Editors and files

| Editor | JSON file | Kind | Schema fields |
|---|---|---:|---:|
| Brand & Hero | `data/site.json` | Object | 14 |
| Menu & Section Text | `data/sections.json` | Object | 19 |
| Basic Website Design | `data/design.json` | Object | 6 |
| Tools Cards | `data/tools.json` | List | 11 |
| Download Cards | `data/downloads.json` | List | 8 |
| Project Cards | `data/projects.json` | List | 9 |
| Website Skills | `data/skills.json` | List | 3 |
| Documentation Cards | `data/docs.json` | List | 6 |
| FAQ Cards | `data/faq.json` | List | 3 |
| **Total** | **9 files** |  | **79** |

Breakdown:

- Object/settings fields: **39**
- Visible list/card fields: **34**
- Hidden protected `_cmsResetId` fields: **6**
- Total Website fields: **79**
- Current Website list items: **24**

---

# Audit Pass 1 — Schema, data and Pages CMS parity

## Result: PASS

### 1. Pages CMS → Admin1 schema parity

Verified:

- **79/79** Website fields mapped
- **0** missing fields
- **0** extra fields
- **0** duplicate field IDs
- **0** wrong JSON paths
- **0** wrong editor ownership
- **0** field-order mismatches
- **0** field-type mismatches
- **0** label mismatches
- **0** hidden/readonly/required mismatches
- **0** select-option mismatches

Admin1 `schema.generated.json` exactly matches the Website definitions in `.pages.yml`.

### 2. Current JSON validation

All 9 current Website JSON files passed:

- correct top-level object/list type;
- exact expected field keys;
- correct value types;
- valid select values;
- no missing fields;
- no unexpected schema drift;
- no duplicate list identity values.

### 3. Approved reset-default validation

All 9 corresponding files under:

```text
.github/cms-defaults/data/
```

passed the same structural validation.

### 4. Stable list identity

Across Tools, Downloads, Projects, Skills, Docs and FAQ:

- **24/24 current items** have `_cmsResetId`;
- **24/24 approved default items** have `_cmsResetId`;
- UUID format is valid;
- IDs are unique inside each file;
- current/default/reset-map identity order agrees;
- the hidden IDs are intentionally not rendered by the public website.

### 5. Pages CMS reset integration

Verified for all 9 Website editors:

- reset-map entry exists;
- reset kind is correct;
- field allowlist is exact;
- editor mapping is exact;
- object reset dropdown covers every object field;
- list reset dropdown covers every visible card field;
- complete-item restore is present;
- original-order reset is present;
- reset selector IDs match approved default card IDs;
- `cms-reset.yml` runs all three existing reset audit suites.

### 6. Runtime consumer coverage

All **73 visible Website fields** are consumed by the published-site runtime.

The only fields not consumed visually are the six hidden:

```text
_cmsResetId
```

This is correct and intentional.

## Audit Pass 1 verdict

```text
WEBSITE AUDIT PASS 1: PASS
79/79 schema parity
73/73 visible runtime fields covered
6/6 hidden reset IDs protected
0 current/default/reset-map defects
```

---

# Problems found before Audit Pass 2

These are not data defects. They are implementation blockers in the current Gateway-only Admin1 code.

## Blocker 1 — Website paths are not allowlisted

Current Admin1 dashboard and Worker allow only:

```text
data/site-settings.json
data/gateway.json
data/gateway-appearance.json
```

The 9 Website files remain blocked, which is safe right now.

Before Website editing is enabled, both browser and Worker allowlists must add exactly:

```text
data/site.json
data/sections.json
data/design.json
data/tools.json
data/downloads.json
data/projects.json
data/skills.json
data/docs.json
data/faq.json
```

No wildcard path is acceptable.

## Blocker 2 — List/card editing is not implemented

Six Website editors are JSON arrays:

```text
Tools
Downloads
Projects
Skills
Docs
FAQ
```

Current Admin1 code explicitly excludes `listEditor` fields from:

- value retrieval;
- draft comparison;
- dirty-change detection;
- review diff;
- save payload construction.

Simply adding these paths to the allowlist would create an incomplete or unsafe editor.

Required list features:

- edit every visible field;
- add a card;
- delete a card;
- reorder cards;
- preserve unknown item keys;
- preserve existing `_cmsResetId`;
- generate a unique UUID for a genuinely new card;
- show item-level and field-level review diffs;
- save the whole list only after latest-SHA verification.

## Blocker 3 — Atomic save limit is too low

The Worker currently accepts at most **3 files** in one atomic commit.

Website spans **9 files**.

Gateway + Website together can affect **12 files**.

The limit must be safely raised using a strict path allowlist. Otherwise a cross-file Website draft cannot be committed atomically.

## Blocker 4 — Only one editable category is supported

Current runtime config uses one string:

```text
editableCategory
```

Adding Website through that property would either:

- keep only Gateway editable; or
- replace Gateway with Website.

It must become an audited allowlist such as:

```text
editableCategories:
- site-gateway
- website
```

This change must not make Portfolio, SEO, Navigation or System editable.

---

# Pages CMS collision analysis

## Current collision status

```text
NO ACTIVE COLLISION
```

Reason: Website is still read-only in Admin1.

## Collision risks that must be tested in Audit Pass 2

1. Pages CMS changes an object file after Admin1 loads it.
2. Pages CMS changes a list item after Admin1 loads the list.
3. Pages CMS adds a new card while Admin1 has an old draft.
4. Pages CMS deletes or reorders a card during an Admin1 draft.
5. Admin1 edits two Website files and one becomes stale.
6. Admin1 updates Gateway and Website files in one draft.
7. Hidden `_cmsResetId` is lost or regenerated.
8. Unknown keys inserted by Pages CMS or future code are removed.
9. Reset workflow changes the same file during an Admin1 draft.
10. Browser reload/session refresh silently discards an unsaved draft.

Every stale case must produce a blocked save—not a last-write-wins overwrite.

---

# Required Audit Pass 2 implementation

## Object editors

Enable normal field editing for:

- `data/site.json`
- `data/sections.json`
- `data/design.json`

Existing full-file clone behavior can preserve unknown keys, provided the latest SHA is checked.

## List/card manager

Build a dedicated card manager for each array file:

- item selector/card accordion;
- add;
- delete;
- move up/down;
- field editing;
- immutable identity display;
- granular review diff;
- protected UUID generation;
- exact file SHA conflict guard.

## Worker controls

- fixed 12-file audited allowlist for Gateway + Website;
- atomic one-commit save;
- per-file SHA checks;
- non-force branch-head update;
- reject duplicate paths;
- reject malformed arrays;
- reject duplicate/missing `_cmsResetId`;
- permit unknown keys without deleting them;
- continue restricting repository, branch and GitHub login.

---

# Audit Pass 2 acceptance tests

The category will not pass until all of these succeed:

## Object files

- single text save;
- multi-field save;
- select save;
- three-object-file atomic save;
- unknown-key preservation;
- stale SHA block;
- unrelated-file hash unchanged.

## Every list file

- edit each visible field;
- add one new card;
- new UUID generated once;
- edit newly added card;
- delete new card;
- delete existing card;
- reorder cards;
- preserve all existing UUIDs;
- preserve unknown item keys;
- Pages CMS stale conflict;
- reset-workflow stale conflict;
- exact before/after review;
- no unrelated list item mutation.

## Cross-CMS

- Pages CMS → Admin1 refresh;
- Admin1 → Pages CMS refresh;
- Pages CMS save during Admin1 draft;
- Admin1 save during another Admin1 tab;
- Gateway + Website combined atomic save;
- failed save leaves zero partial commits.

---

# Audit Pass 3 requirements

After Audit Pass 2 passes:

- 320 px mobile;
- regular mobile;
- tablet portrait/landscape;
- laptop;
- desktop;
- touch card reorder controls;
- keyboard navigation;
- long titles/descriptions;
- large card lists;
- slow network;
- Worker/API failure;
- GitHub conflict;
- OAuth expiry;
- reduced motion;
- no horizontal overflow;
- no inaccessible hidden controls.

---

# Final decision

## Website category status

```text
Audit Pass 1: PASS
Audit Pass 2: NOT STARTED — implementation blockers identified
Audit Pass 3: LOCKED until Pass 2 succeeds
Website editing: REMAINS DISABLED
Production promotion: REMAINS BLOCKED
```

## Safe next action

Implement the Website object editor and six list/card managers on the feature branch, while leaving:

```text
.pages.yml
/admin/
Pages CMS
main
```

untouched.

After implementation, run the exhaustive Pass 2 collision suite before any Website field becomes editable.
