# CMS Individual Reset — Changed File Manifest

## CMS configuration

- `.pages.yml` — added per-editor reset actions and hidden stable UUID schema for 10 list editors.

## Reset defaults and mapping

- `.github/cms-defaults/reset-map.json`
- `.github/cms-defaults/data/` — approved copies of all 22 editable JSON files.

## GitHub Actions

- `.github/workflows/cms-reset.yml` — secure reset, validation, commit and deployment workflow.
- `.github/workflows/build-pages.yml` — includes the three reset-system audit rounds in normal deployments.

## Reset engine and verification

- `tools/cms-reset.js`
- `tools/verify-cms-reset-request.js`
- `tools/test-cms-reset-schema.js`
- `tools/test-cms-reset-behavior.js`
- `tools/test-cms-reset-collisions.js`

## Existing test compatibility updates

- `tools/test-cms-field-coverage.js` — distinguishes CMS actions from editor fields and recognizes hidden reset metadata.
- `tools/test-all-cms-files-runtime.py` — skips hidden/readonly reset metadata during visible-field mutation tests.

## Data files

The following list files received hidden `_cmsResetId` UUID values only; visible content is unchanged:

- `data/tools.json`
- `data/downloads.json`
- `data/projects.json`
- `data/skills.json`
- `data/docs.json`
- `data/faq.json`
- `data/portfolio-skills.json`
- `data/portfolio-projects.json`
- `data/portfolio-timeline.json`
- `data/services.json`

## Generated output

- `data/runtime-manifest.json`
- `index.html`
- `404.html`

These were regenerated because hidden UUID metadata changes the content revision hash. Visible HTML content and runtime assets remain unchanged.
