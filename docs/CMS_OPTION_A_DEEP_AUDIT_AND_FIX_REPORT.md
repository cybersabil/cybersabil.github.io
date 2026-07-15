# CyberSabil Pages CMS Option-by-Option Deep Audit and Fix Report

**Baseline:** CyberSabil v2.10.1 + Gateway Background Mode control + Option A Easy CMS UI  
**Audit scope:** Every Pages CMS field, every select option, runtime ownership, grouped-control isolation, reset behavior, responsive behavior, hardcoded fallback risks, CSS/JS collision risks, and generated output consistency.  
**Project data values changed:** No.  

## Executive result

- CMS fields audited: **418** across **22 JSON files**.
- Baseline + field mutation / select-option scenarios executed: **951**.
- Select option values statically traced to runtime/build implementations: **355/355** after the fixes.
- Fields producing an immediate distinct DOM/style/metadata output in the generic harness: **384**.
- Fields requiring an event, failure, build, dependency, or compatibility path: **34**; all are classified in `CMS_NON_IMMEDIATE_FIELD_CLASSIFICATION.json`.
- Browser page errors: **0**.
- Browser console errors: **0**.

## Confirmed defects found

### 1. Portfolio `Spacious` layout was a dead CMS option

The CMS exposed `professional`, `compact`, and `spacious`, but only the first two had runtime/CSS behavior. Selecting `spacious` produced no distinct layout.

**Fix:** Added validated runtime class `cs-portfolio-layout-spacious` and responsive CSS for wider container, larger hero spacing, section spacing, and grid gaps.

### 2. Mode Switch Size belonged to the wrong control group

The CMS described size as an Appearance setting, but JavaScript and CSS attached it to Position/Layout ownership.

Failure modes:

- Appearance = Custom + Position = Inherit: size selection did not work.
- Position = Custom + Appearance = Inherit: changing/retaining size could alter the switch without Appearance being enabled.

**Fix:** `modeSwitchSize` is now applied only by `modeSwitchAppearanceControlMode=custom`; CSS size selectors now depend on `.cs-mode-switch-appearance-custom`, not the position class.

Measured Chromium dimensions:

- Compact: 168 × 40 px
- Standard: 186 × 47 px
- Large: 244 × 59 px

Position-only testing kept the approved 186 px width and did not set the size dataset.

### 3. Two legacy preset fields were editable no-ops

`gateway-appearance.json.visualPreset` and `navigation-style.json.visualPreset` are retained only for backward compatibility. When explicit group-control keys exist, they do not own current behavior.

**Fix:** Both fields remain in JSON for migration compatibility but are hidden and readonly in Pages CMS. The validator now fails if they become exposed again.

### 4. Numeric CMS inputs allowed values that runtime silently clamped

All 73 number fields previously accepted unrestricted values in the CMS, while JavaScript applied min/max clamps. A user could enter a value and see no additional change because it had already hit a runtime boundary.

**Fix:** Added Pages CMS `options.min` and `options.max` to all 73 number controls, matching their runtime limits. The validator now requires bounds for every number field.

### 5. Conditional controls looked broken because dependencies were unclear

Examples:

- Solid panel color/opacity applies only when panel background type is Solid/Glass.
- Gradient colors apply only when Gradient is selected.
- Glow color/opacity applies only when Glow is enabled.
- Basic Gateway panel width applies only when Advanced Appearance inherits the baseline.
- Project link fallback label applies only when an item has a link and its own button text is blank.
- Image alt text applies only when an image exists.
- Failure warning fields apply only during a real JSON failure.

**Fix:** Added exact dependency descriptions and safe/advanced/system labels. Targeted tests now verify priority and dependency paths.

### 6. Gateway background effect labels were hardcoded to Website wording

The blur, brightness, and saturation fields apply to whichever background mode is active—Website or Portfolio—but CMS labels described them as Website-only.

**Fix:** Labels now say **Gateway active background** and explicitly describe both modes. Runtime behavior was already mode-independent.

### 7. Existing collision guards were incomplete

The previous validation did not enforce:

- selectable option implementation coverage,
- correct Mode Switch Size group ownership,
- the `Spacious` runtime/CSS contract,
- hidden legacy no-op fields,
- numeric CMS bounds,
- neutral active-background wording.

**Fix:** Extended `tools/test-cms-field-coverage.js` with all of these contracts.

## Hardcoded fallback audit

Several required display fields use approved fallback text when the stored value is empty or invalid. This is intentional failure safety, not a second visible owner during a successful valid edit. It means blanking some required text fields does **not** guarantee blank output.

Option A now explains dependencies and hides system/legacy fields, but the runtime fallback architecture has not been removed. Removing all fallback literals would be a separate structural migration and would weaken malformed/missing JSON recovery unless replaced with generated fallbacks.

## Non-immediate field classification

The generic field-mutation harness found 34 fields without an immediate visual snapshot difference:

- Event/reload/interaction-only: **9**
- Failure/boot-only: **4**
- System/build-only: **2**
- Conditional dependency: **15**
- Hidden legacy compatibility: **2**
- Metadata outside visual snapshot: **2**

All 34 are accounted for; unmatched fields: **0**.

## Targeted proof

- Mode Switch size works through Appearance only and does not activate Position.
- Gateway legacy panel width = 900 px applies when Appearance inherits.
- Advanced panel width = 720 px overrides legacy width only when Appearance is custom.
- Solid panel color/opacity and enabled panel glow apply with their selected dependencies.
- Mode Switch background color applies through Appearance while Position remains inherited.
- Portfolio professional/compact/spacious layouts are measurably distinct.
- URL override, remembered choice, localStorage, Escape rules, terminal/copy labels, and failure warning paths pass event-based tests.
- Project-link visibility/fallback and image-alt dependency pass.
- Open Graph type and URL update runtime metadata; generator tests cover raw HTML synchronization.

## Regression suite

Passed:

- Generator and synchronized output
- CMS control isolation
- 418-field CMS/schema/consumer coverage
- 355 select-option implementation-token coverage
- Site validator
- Atomic boot: 7 Chromium scenarios
- Mode-switch position/animation collision: 17 scenarios
- Group custom → inherit same-page reset
- Mobile/tablet/desktop Gateway responsiveness
- Tablet mode-switch portrait/landscape
- 22 CMS JSON mutation boot scenarios
- Deep conditional/ownership behavior tests
- Site-settings event/failure behavior tests
- Full 951 field/option mutation scenarios with zero page/console errors

## Files changed by the source patch

- `.pages.yml`
- `assets/js/main.js`
- `assets/css/style.css`
- `tools/test-cms-field-coverage.js`
- `tools/test-deep-cms-behavior.py` (new deep QA test)
- `tools/test-site-settings-behavior.py` (new event/failure QA test)
- Documentation and JSON evidence under `docs/`

No `data/*.json` file is included in the safe source patch, so current live CMS values are not overwritten. GitHub Actions will regenerate `index.html`, `404.html`, and `data/runtime-manifest.json` from the live repository data.

## Limitations

- Chromium was used for automated browser execution.
- Authenticated Pages CMS UI was not driven through the hosted login session in this environment.
- Firefox, Safari, physical Android Chrome, and screen-reader execution remain real-device/browser verification items.
