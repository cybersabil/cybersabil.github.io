# CyberSabil v2.10.1 QA Report

## Automated checks passed

- JavaScript syntax: passed
- Python test syntax: passed
- JSON parsing: passed
- Generated output idempotence: passed
- Release/schema/revision alignment: passed
- Control-isolation static regression test: passed
- Full Pages CMS field coverage: 417/417 fields passed across 22 JSON files
- Full CMS file browser mutation: 22/22 scenarios passed
- Atomic boot/control-isolation Chromium test: 7/7 scenarios passed
- Mode-switch position/animation/hover collision test: 17/17 scenarios passed
- Gateway and Navigation same-page custom → inherit reset: passed
- Responsive Gateway layout: desktop, tablet portrait, tablet landscape and mobile passed
- Tablet mode-switch portrait/landscape positions: passed
- Reduced-motion runtime path: passed
- JSON failure fallback path: passed

## Confirmed current CMS state preserved

- Gateway card order: Website first
- Desktop layout: row
- Tablet layout: row
- Mobile layout: column
- Desktop mode switch: top-right
- Mobile/tablet portrait mode switch: bottom-center

## Not physically tested

- Brave
- Edge
- Firefox
- Android Chrome on a real phone/tablet
- Screen reader
- Actual GitHub Pages deployment from this environment

These items remain deployment QA, and are not represented as completed.
