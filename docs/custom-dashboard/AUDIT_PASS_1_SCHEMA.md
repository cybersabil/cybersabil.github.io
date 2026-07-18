# Phase 1 Audit Pass 1 — Schema and Category Parity

Automated acceptance rules:

- 22/22 Pages CMS editors
- 428/428 schema fields
- no duplicate field IDs
- exact editor + field-name parity with `.pages.yml`
- category totals equal 428
- category distribution:
  - Site & Gateway 178
  - Website 79
  - Portfolio 84
  - SEO 13
  - Navigation 73
  - System 1

Run `tools/custom-dashboard/test-foundation.py`.
