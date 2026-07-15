# CyberSabil v2.10.1 — Full CMS Collision Audit and Fix Release

## Baseline

This release was built from the user's latest uploaded live-repository ZIP, not from the older v2.9.2 or earlier v2.10.0 package.

Preserved live CMS choices:

- Gateway card order: `website-first`
- Desktop Gateway layout: `row`
- Tablet Gateway layout: `row`
- Mobile Gateway layout: `column`
- Mobile mode-switch position: `bottom-center`
- Desktop mode-switch position: `top-right`

## Confirmed defects fixed

1. Removed accidental `********` text that invalidated the mobile `top-left` switch selector.
2. Isolated base mobile switch centering from animation/hover transforms by moving centering to the CSS `translate` longhand.
3. Verified all custom centered switch positions use `translate`, while animations continue using `transform`.
4. Fixed tablet Gateway controls being overwritten by later mobile selectors at widths 621–900px.
5. Added missing Gateway reset ownership for `--cs-gateway-panel-width`, `--cs-gateway-blur`, and `--cs-gateway-darkness`.
6. Re-applied the legacy Gateway baseline after advanced controls are cleared, so custom → inherit works without requiring a reload.
7. Reconciled mode-switch position/body collision-reserve classes after live navigation-control changes.
8. Corrected the runtime regression test's outdated Portfolio-first expectation; the live baseline is Website-first.
9. Regenerated stale `index.html`, `404.html`, and `data/runtime-manifest.json` from the latest source data.
10. Added a validator covering every Pages CMS field, select-value validity, runtime/build consumers, reset coverage, and transform-collision guards.
11. Clarified CMS labels where legacy/advanced or global/item-level precedence could otherwise appear ambiguous.

## Audit coverage

- 417 Pages CMS fields across 22 JSON files: schema/value/consumer coverage passed.
- 22 full-file browser mutation scenarios: passed.
- 7 atomic-boot/control-isolation browser scenarios: passed.
- 17 switch position × animation/hover collision scenarios: passed.
- Same-page Gateway and Navigation custom → inherit reset scenario: passed.
- Tablet portrait, tablet landscape, desktop, and mobile Gateway layout scenarios: passed.
- Tablet portrait/landscape mode-switch position scenarios: passed.

## Important interpretation

The 417-field coverage test proves that every CMS field exists, has a valid current value, and has a runtime/build consumer. Content-bearing files were also mutated in browser scenarios. Complex visual controls were validated through group-isolation, geometry, reset, animation and responsive tests.

This does not claim physical testing on every real browser/device. Chromium automation was completed. Brave, Firefox, Edge, Android Chrome and screen-reader runs remain release-environment QA items.
