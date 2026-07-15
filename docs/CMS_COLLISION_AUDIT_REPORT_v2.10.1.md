# CyberSabil v2.10.1 CMS Collision Audit Report

## Executive verdict

The latest repository contained real unresolved defects beyond the original Gateway issue. The previous v2.10.0 package was not fully collision-safe. This release corrects the confirmed defects found through a fresh audit of the latest live-repository baseline.

## Issues found

| ID | Area | Defect | Severity | Status |
|---|---|---|---|---|
| C-01 | Mobile switch | Accidental `********` made the mobile top-left selector invalid | High | Fixed |
| C-02 | Base mobile switch | Centering and entry/hover animation both owned `transform` | High | Fixed |
| C-03 | Custom centered switch | Position and animation transform collision risk | High | Fixed and verified |
| C-04 | Tablet Gateway | Later `max-width:900px` mobile selectors overrode 621–900px tablet controls | High | Fixed |
| C-05 | Gateway reset | Panel width, blur and darkness were set but omitted from the advanced reset list | High | Fixed |
| C-06 | Gateway inherit transition | Clearing advanced appearance removed values but did not restore the legacy baseline until reload | High | Fixed |
| C-07 | Navigation inherit transition | Effective switch/body reserve state was not reconciled immediately after live group changes | Medium–High | Fixed |
| C-08 | Generated output | `index.html`, `404.html` and runtime manifest were stale relative to sources | High | Regenerated |
| C-09 | Regression test | Package-default test still expected Portfolio-first after CMS had changed to Website-first | Medium | Fixed |
| C-10 | Validator | Existing validator did not catch invalid CSS markers, transform collisions or complete reset ownership | High | Fixed |
| C-11 | CMS wording | Legacy/basic and fallback fields could look like equal competing owners | Medium | Clarified |

## Collision findings

### Mode-switch positioning

Position now uses independent `translate`:

```css
translate: -50% 0;
```

Animation and hover remain on `transform`. Therefore, `bottom-center`, `top-center`, side positions, entry animation, glow and lift no longer overwrite one another.

### Tablet/mobile Gateway media collision

The original ordering applied both tablet and later mobile rules at 768px. Mobile won by cascade order. Mobile-only Gateway rules are now scoped to `max-width:620px`; tablet rules remain authoritative from 621px through 900px.

### Gateway custom/inherit ownership

Advanced reset now clears every literal Gateway variable that advanced rendering owns. Immediately afterward, the legacy Gateway renderer restores inherited values. Advanced custom groups then override only their owned properties.

## CMS coverage result

- Total fields: 417
- JSON files: 22
- Missing JSON fields: 0
- Invalid current select values: 0
- Fields without a runtime/build consumer: 0

Detailed machine-readable evidence:

- `CMS_FIELD_COVERAGE_REPORT_v2.10.1.json`
- `CMS_ALL_FILES_RUNTIME_MUTATION_RESULTS.json`
- `RUNTIME_BROWSER_TEST_RESULTS_v2.10.1.json`
- `SWITCH_POSITION_COLLISION_TEST_RESULTS.json`
- `GROUP_ISOLATION_RESET_TEST_RESULTS.json`
- `TABLET_RESPONSIVE_TEST_RESULTS.json`
- `TABLET_MODE_SWITCH_TEST_RESULTS.json`

## Remaining limitations

- Automated runtime testing used Chromium.
- Real-device Android Chrome, Brave, Edge, Firefox and assistive-technology testing were not available in this environment.
- GitHub Pages deployment itself was not performed from this environment.
