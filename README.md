# CyberSabil

Production repository for the CyberSabil GitHub Pages website, Pages CMS configuration, and the secure R13 admin frontend.

## Live applications

- Public website: `https://cybersabil.github.io/`
- Secure admin dashboard: `https://cybersabil.github.io/admin/`
- Pages CMS: edit this repository through Pages CMS using `.pages.yml`

The R13 admin frontend is hosted from `/admin/`. Authentication, sessions, validation, and GitHub write operations are handled by the separately deployed Cloudflare Worker API. Worker secrets and backend source are intentionally not stored in this public website repository.

## Repository structure

- `.github/workflows/` — GitHub Pages build/deploy and Pages CMS reset workflow
- `.github/cms-defaults/` — approved defaults used by individual Pages CMS resets
- `admin/` — current R13 admin production frontend
- `assets/` — public website CSS and JavaScript
- `data/` — CMS-controlled website and portfolio JSON data
- `media/` — social-sharing preview image
- `tools/` — build, validation, field-coverage, collision, and reset safeguards
- `.pages.yml` — Pages CMS schema for the 22 editable JSON files

## Production safeguards

Every push to `main` runs the current CMS reset audits, regenerates synchronized static output, validates field coverage and configuration isolation, and then deploys GitHub Pages. Pages CMS individual reset requests are repository-, branch-, SHA-, path-, and action-allowlisted before any data file is changed.

## Local validation

With Node.js 24 or a compatible current Node.js release:

```bash
node tools/test-cms-reset-schema.js
node tools/test-cms-reset-behavior.js
node tools/test-cms-reset-collisions.js
node tools/generate-site.js
node tools/test-config-isolation.js
node tools/test-cms-field-coverage.js
node tools/validate-site.js
```

Do not place OAuth client secrets, GitHub tokens, Cloudflare secrets, local backups, or generated audit archives in this repository.
