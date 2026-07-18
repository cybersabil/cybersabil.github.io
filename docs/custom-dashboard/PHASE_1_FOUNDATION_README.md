# CyberSabil Custom Dashboard v2 — Phase 1 Foundation

## Scope

This package adds only new files:

```text
admin-v2/
cms-schema/
tools/custom-dashboard/
docs/custom-dashboard/
```

It does not replace or modify:

```text
admin/
.pages.yml
data/
.github/
assets/
index.html
```

## Confirmed source

Generated from the uploaded current GitHub-main `.pages.yml`.

- Editors: **22**
- Fields: **428**
- Categories: **6**
- Site & Gateway: **178**
- Website: **79**
- Portfolio: **84**
- SEO & Sharing: **13**
- Navigation Design: **73**
- System: **1**

## Phase-1 functionality

- Premium dark/light responsive dashboard shell
- Dashboard metrics
- Category and subcategory hierarchy
- Search
- Basic/Expert/Internal filters
- Reads current JSON values
- List/card value summaries
- Mobile sidebar
- Keyboard focus and reduced-motion support
- No authentication
- No Save
- No GitHub write
- No reset execution

## Security status

This is deliberately read-only. `app.js` contains no GitHub API endpoint, token, OAuth secret, write method or automatic save.

## Test

```powershell
py -X utf8 .\tools\custom-dashboard\test-foundation.py
```

Expected:

```text
AUDIT PASS 1 — Schema and category parity: PASS
AUDIT PASS 2 — Read-only and collision safety: PASS
AUDIT PASS 3 — Responsive/accessibility static audit: PASS
PHASE 1 FOUNDATION STATIC AUDIT: PASS
```

## Local preview

```text
http://127.0.0.1:8000/admin-v2/index.html
```

## Next phase

After local and live UI proof:

1. Lock canonical decimal-step constraints.
2. Add separate custom-admin authentication Worker.
3. Add draft/preview state.
4. Enable Gateway editing only.
5. Run three Gateway deep-audit passes.
