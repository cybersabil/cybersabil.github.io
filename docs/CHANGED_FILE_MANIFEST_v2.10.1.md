# CyberSabil v2.10.1 Changed File Manifest

| File | Reason |
|---|---|
| `assets/css/style.css` | Fix invalid selector marker, transform/translate ownership, and tablet/mobile media-query collision |
| `assets/js/main.js` | Complete Gateway reset ownership, restore inherited baseline, reconcile switch position state, release bump |
| `.pages.yml` | Clarify basic/legacy/fallback field precedence labels |
| `data/site-settings.json` | Release version bump while preserving CMS choices |
| `index.html` | Regenerated critical snapshot, SEO/content and asset revision |
| `404.html` | Regenerated asset revision |
| `data/runtime-manifest.json` | Regenerated release/content/asset revision |
| `tools/generate-site.js` | Separate release version from schema version |
| `tools/validate-site.js` | Add collision, marker, reset and live-reconciliation checks |
| `tools/test-runtime-browser.py` | Correct live Website-first expectation and v2.10.1 output paths |
| `tools/test-cms-field-coverage.js` | New 417-field CMS/schema/consumer/collision validation |
| `tools/test-switch-collisions.py` | Position × animation/hover browser tests |
| `tools/test-group-isolation-reset.py` | Same-page custom → inherit reset tests |
| `tools/test-all-cms-files-runtime.py` | Browser mutation coverage for every CMS file |
| `tools/test-responsive-layouts.py` | Desktop/tablet/mobile Gateway layout tests |
| `tools/test-tablet-mode-switch.py` | Tablet portrait/landscape switch tests |
| `.github/workflows/build-pages.yml` | Run full CMS field/collision validation before deployment |
| `docs/*v2.10.1*` and JSON evidence | Audit, QA and machine-readable test evidence |
