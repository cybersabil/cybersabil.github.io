# CyberSabil Admin1 — Website Phase 2 Implementation Candidate

## Status

This package enables the **Website** category only on:

```text
feature/chatgpt-custom-dashboard-v2
```

It does not merge or promote anything to `main`.

Permanent parallel systems remain:

- `app.pagescms.org` — primary safe Pages CMS
- `/admin/` — existing Sveltia Gateway CMS
- `/admin1/` — custom audited dashboard on the feature branch

## Category scope

| Category | Mapped | Editable after login | Protected |
|---|---:|---:|---:|
| Site & Gateway | 178 | 175 | 3 |
| Website | 79 | 73 visible fields | 6 hidden `_cmsResetId` fields |
| Remaining categories | 171 | 0 | Read-only |

Website uses:

- 3 object files
- 6 list/card files
- 9 total Website files
- 12 total atomic files when combined with Gateway

## Implemented controls

### Object editors

Enabled:

```text
data/site.json
data/sections.json
data/design.json
```

Unknown object keys remain preserved because Admin1 clones the complete GitHub JSON object and changes only the selected field.

### List/card managers

Enabled:

```text
data/tools.json
data/downloads.json
data/projects.json
data/skills.json
data/docs.json
data/faq.json
```

Each manager supports:

- edit every visible field;
- add a card;
- delete a card;
- move up/down;
- protected stable identity display;
- exact field/item review;
- one atomic Git commit.

### Stable identity behavior

- Existing valid `_cmsResetId` values are never regenerated.
- New Admin1 cards receive a UUID once.
- A Pages CMS card with a missing/duplicate identity receives a draft-only repair.
- The repair is visible as a pending list change and is saved only after review.
- Unknown list-item keys are preserved.

### Collision controls

The Worker now has an exact 12-path allowlist.

It rejects:

- unlisted files;
- duplicate paths;
- more than 12 files;
- invalid top-level object/list types;
- malformed list items;
- missing/duplicate `_cmsResetId` values;
- invalid Website select values;
- oversized payloads;
- stale file SHAs;
- non-fast-forward branch updates.

All affected files are written through one Git tree/commit/ref update. A failure produces no partial file commit.

## Automated tests completed

```text
AUDIT PASS 1 RECHECK - Pages CMS Website parity 79/79: PASS
AUDIT PASS 2A - Exact 12-file audited allowlists: PASS
AUDIT PASS 2B - List manager and collision controls: PASS
AUDIT PASS 2C - Reset identities/defaults remain compatible: PASS
WEBSITE PHASE 2 STATIC COLLISION AUDIT: PASS

AUDIT PASS 2A - All six Website lists and stable IDs: PASS
AUDIT PASS 2B - Edit/add/delete/reorder/unknown-key preservation: PASS
AUDIT PASS 2C - Pages CMS missing/duplicate identity recovery: PASS
AUDIT PASS 2D - Granular review diff: PASS
AUDIT PASS 2E - Object unknown-key preservation and review: PASS
WEBSITE DATA MODEL COLLISION AUDIT: PASS
```

JavaScript syntax checks pass for:

```text
admin1/data-model.js
admin1/app.js
worker-admin1/src/index.js
```

## Files deliberately untouched

```text
.pages.yml
admin/
data/
.github/cms-defaults/
.github/workflows/
assets/
index.html
```

The installer records hashes before and after installation and stops if any protected file changes.

## Pass 2 manual tests still required

The implementation remains a feature-branch candidate until these are demonstrated:

1. Website object text save and automatic local preview.
2. Website design select save.
3. Add/edit/delete/reorder a temporary card.
4. Verify all existing `_cmsResetId` values remain unchanged.
5. Two-tab stale-SHA conflict block.
6. Failed conflict leaves no partial commit.
7. Refresh Admin1 and confirm exact saved values.
8. Compare the resulting JSON shape with Pages CMS.
9. Restore/delete all temporary test content.

## Pass 3 remains locked

After Pass 2 manual proof:

- 320 px mobile;
- phone;
- tablet;
- laptop;
- desktop;
- long content;
- touch/keyboard;
- slow network;
- OAuth expiry;
- GitHub API failure;
- no horizontal overflow.

Website is not approved for production until Pass 2 and Pass 3 are both marked PASS.
