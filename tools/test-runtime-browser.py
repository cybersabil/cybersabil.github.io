#!/usr/bin/env python3
"""CyberSabil v2.10.1 Chromium runtime, no-flash and control-isolation tests.

The execution environment blocks direct navigation to local/custom domains, so this
harness loads the real generated HTML with Playwright set_content and intercepts all
CSS, JavaScript, JSON and media requests from an isolated test origin.
"""
from __future__ import annotations

import json
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://cybersabil.test/"
SCREENSHOT_DIR = ROOT / "docs" / "test-screenshots-v2.10.1"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

INSTRUMENT = r'''
<script>
window.__csTestEvents = [];
// Keep the runtime test focused on the critical/visible-mode boot path.
window.requestIdleCallback = () => 0;
const csRecord = (type, detail = {}) => {
  const website = document.querySelector('[data-cs-mode-choice="website"]');
  const portfolio = document.querySelector('[data-cs-mode-choice="portfolio"]');
  window.__csTestEvents.push({
    t: performance.now(), type, detail,
    htmlClass: document.documentElement.className,
    bodyVisibility: getComputedStyle(document.body).visibility,
    websiteOrder: website ? getComputedStyle(website).order : null,
    portfolioOrder: portfolio ? getComputedStyle(portfolio).order : null
  });
};
new MutationObserver(() => csRecord('html-class')).observe(document.documentElement, {attributes:true, attributeFilter:['class']});
document.addEventListener('animationstart', e => csRecord('animationstart', {name:e.animationName, target:e.target.className}), true);
document.addEventListener('DOMContentLoaded', () => csRecord('domcontentloaded'));
</script>
'''


def project_html() -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    marker = "    <!-- CyberSabil Main Script"
    return html.replace(marker, INSTRUMENT + "\n" + marker, 1)


def json_file(name: str) -> dict:
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def scenario_overrides(name: str) -> dict[str, dict]:
    if name in {"package_default", "json_failure", "mixed_revision"}:
        return {}
    visual = json_file("visual-baseline.json")
    if name == "baseline":
        visual["globalVisualPreset"] = "v2.8.3-exact"
        gateway = json_file("gateway-appearance.json")
        gateway.update({
            "visualPreset": "v2.8.3-exact",
            "layoutControlMode": "inherit",
            "appearanceControlMode": "inherit",
            "animationControlMode": "inherit",
            "interactionControlMode": "inherit",
            "cardOrder": "website-first",
        })
        return {"visual-baseline.json": visual, "gateway-appearance.json": gateway}
    visual["globalVisualPreset"] = "section-controlled"
    if name in {"layout_only", "layout_only_mobile"}:
        gateway = json_file("gateway-appearance.json")
        gateway.update({
            "visualPreset": "custom-advanced",
            "layoutControlMode": "custom",
            "appearanceControlMode": "inherit",
            "animationControlMode": "inherit",
            "interactionControlMode": "inherit",
            "cardOrder": "portfolio-first",
        })
        return {"visual-baseline.json": visual, "gateway-appearance.json": gateway}
    if name in {"animation_only", "reduced_motion_animation"}:
        gateway = json_file("gateway-appearance.json")
        gateway.update({
            "visualPreset": "custom-advanced",
            "layoutControlMode": "inherit",
            "appearanceControlMode": "inherit",
            "animationControlMode": "custom",
            "interactionControlMode": "inherit",
            "cardOrder": "portfolio-first",
            "panelAnimation": "slide-up",
            "websiteCardAnimation": "fade",
            "portfolioCardAnimation": "fade",
        })
        return {"visual-baseline.json": visual, "gateway-appearance.json": gateway}
    if name == "switch_position_only":
        nav = json_file("navigation-style.json")
        nav.update({
            "visualPreset": "custom-advanced",
            "websiteHeaderControlMode": "inherit",
            "portfolioHeaderControlMode": "inherit",
            "modeSwitchPositionControlMode": "custom",
            "modeSwitchAppearanceControlMode": "inherit",
            "modeSwitchAnimationControlMode": "inherit",
            "modeSwitchDesktopPosition": "bottom-left",
        })
        return {"visual-baseline.json": visual, "navigation-style.json": nav}
    raise ValueError(name)


def run_scenario(browser, name: str, *, viewport: dict | None = None, reduced_motion: str = "no-preference") -> dict:
    overrides = scenario_overrides(name)
    context = browser.new_context(viewport=viewport or {"width": 1366, "height": 768}, reduced_motion=reduced_motion)
    page = context.new_page()
    console_errors: list[str] = []
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    html = project_html()

    def route_handler(route):
        parsed = urlparse(route.request.url)
        rel = parsed.path.lstrip("/") or "index.html"
        if rel.startswith("data/"):
            filename = rel.split("/", 1)[1]
            if name == "json_failure" and filename == "gateway-appearance.json":
                route.fulfill(status=500, body="temporary CMS failure", content_type="text/plain")
                return
            if filename in overrides:
                route.fulfill(status=200, body=json.dumps(overrides[filename]), content_type="application/json")
                return
            if name == "mixed_revision" and filename == "runtime-manifest.json":
                manifest = json_file(filename)
                manifest["revision"] = "intentionally-mismatched-revision"
                route.fulfill(status=200, body=json.dumps(manifest), content_type="application/json")
                return
        file_path = ROOT / rel
        if file_path.exists() and file_path.is_file():
            ctype = {
                ".json": "application/json", ".css": "text/css", ".js": "application/javascript",
                ".html": "text/html", ".png": "image/png", ".svg": "image/svg+xml"
            }.get(file_path.suffix.lower(), "application/octet-stream")
            route.fulfill(status=200, body=file_path.read_bytes(), content_type=ctype)
        else:
            route.fulfill(status=404, body="not found")

    page.route("https://cybersabil.test/**", route_handler)
    html_with_base = html.replace("<head>", f'<head><base href="{BASE_URL}">', 1)
    page.set_content(html_with_base, wait_until="domcontentloaded")
    initial = page.evaluate("""() => ({
      htmlClass: document.documentElement.className,
      bodyVisibility: getComputedStyle(document.body).visibility,
      bodyOpacity: getComputedStyle(document.body).opacity,
      bootHidden: document.getElementById('csBootStatus').hidden
    })""")
    page.wait_for_function(
        "document.documentElement.classList.contains('cs-boot-ready') || document.documentElement.classList.contains('cs-boot-failed')",
        timeout=10000,
    )
    page.wait_for_timeout(550)
    result = page.evaluate("""() => {
      const overlay = document.getElementById('csGatewayOverlay');
      const website = document.querySelector('[data-cs-mode-choice="website"]');
      const portfolio = document.querySelector('[data-cs-mode-choice="portfolio"]');
      const switcher = document.getElementById('csModeSwitch');
      const panel = document.querySelector('.cs-gateway-panel');
      const choices = document.querySelector('.cs-gateway-choice-column');
      const dataStatus = document.getElementById('csDataStatus');
      return {
        htmlClass: document.documentElement.className,
        bodyClass: document.body.className,
        activeMode: document.body.dataset.csActiveMode || 'gateway',
        bodyVisibility: getComputedStyle(document.body).visibility,
        bodyOpacity: getComputedStyle(document.body).opacity,
        bootHidden: document.getElementById('csBootStatus').hidden,
        overlayHidden: overlay.hidden,
        overlayClass: overlay.className,
        choiceDisplay: getComputedStyle(choices).display,
        choiceGridColumns: getComputedStyle(choices).gridTemplateColumns,
        websiteRect: {x: website.getBoundingClientRect().x, y: website.getBoundingClientRect().y},
        portfolioRect: {x: portfolio.getBoundingClientRect().x, y: portfolio.getBoundingClientRect().y},
        websiteOrder: getComputedStyle(website).order,
        portfolioOrder: getComputedStyle(portfolio).order,
        panelAnimation: getComputedStyle(panel).animationName,
        websiteAnimation: getComputedStyle(website).animationName,
        switchClass: switcher.className,
        websiteHeaderAdvanced: document.getElementById('csWebsiteApp').classList.contains('cs-mode-website-header-advanced'),
        portfolioHeaderAdvanced: document.getElementById('csPortfolioApp').classList.contains('cs-portfolio-header-advanced'),
        dataStatusHidden: dataStatus.hidden,
        dataStatusTitle: document.getElementById('csDataStatusTitle').textContent,
        events: window.__csTestEvents
      };
    }""")
    result["initial"] = initial
    result["consoleErrors"] = console_errors
    result["pageErrors"] = page_errors
    result["viewport"] = viewport or {"width": 1366, "height": 768}
    result["reducedMotion"] = reduced_motion
    screenshot = SCREENSHOT_DIR / f"{name}.png"
    page.screenshot(path=str(screenshot), full_page=False)
    result["screenshot"] = str(screenshot.relative_to(ROOT))
    context.close()
    return result


def assert_no_stale_frame(name: str, result: dict) -> None:
    for event in result["events"]:
        if event["type"] == "animationstart":
            assert "cs-boot-ready" in event["htmlClass"], f"{name}: animation started before ready: {event}"
    for event in [e for e in result["events"] if e["type"] == "html-class"]:
        if "cs-boot-ready" not in event["htmlClass"] and "cs-boot-failed" not in event["htmlClass"]:
            assert event["bodyVisibility"] == "hidden", f"{name}: stale content visible during boot: {event}"


def assert_scenario(name: str, result: dict) -> None:
    assert_no_stale_frame(name, result)
    if name == "mixed_revision":
        assert result["htmlClass"] == "cs-boot-failed", result["htmlClass"]
        assert result["bodyVisibility"] == "visible"
        assert any("mixed-revision" in e or "revision mismatch" in e.lower() for e in result["consoleErrors"]), result["consoleErrors"]
        return

    assert not result["pageErrors"], f"{name}: page errors: {result['pageErrors']}"
    if name == "json_failure":
        unexpected_errors = [item for item in result["consoleErrors"] if "500 (Internal Server Error)" not in item]
        assert not unexpected_errors, f"{name}: unexpected console errors: {unexpected_errors}"
    else:
        assert not result["consoleErrors"], f"{name}: console errors: {result['consoleErrors']}"
    assert result["htmlClass"] == "cs-boot-ready", f"{name}: boot did not reach ready"
    assert result["bodyVisibility"] == "visible", f"{name}: body not visible after ready"
    assert result["bootHidden"] is True, f"{name}: boot status remains visible"

    if name == "baseline":
        assert "cs-gateway-layout-custom" not in result["overlayClass"]
        assert result["websiteOrder"] == "0" and result["portfolioOrder"] == "0"
    elif name in {"package_default", "layout_only", "layout_only_mobile"}:
        assert "cs-gateway-layout-custom" in result["overlayClass"]
        assert "cs-gateway-appearance-custom" not in result["overlayClass"]
        assert "cs-gateway-animation-custom" not in result["overlayClass"]
        assert "cs-gateway-interaction-custom" not in result["overlayClass"]
        expected_website_order = "1" if name == "package_default" else "2"
        expected_portfolio_order = "2" if name == "package_default" else "1"
        assert result["websiteOrder"] == expected_website_order and result["portfolioOrder"] == expected_portfolio_order
        assert not result["panelAnimation"].startswith("csGatewayAdvanced"), result["panelAnimation"]
        if name == "layout_only_mobile":
            assert abs(result["websiteRect"]["x"] - result["portfolioRect"]["x"]) < 3, result
            assert result["portfolioRect"]["y"] < result["websiteRect"]["y"], result
    elif name == "animation_only":
        assert "cs-gateway-layout-custom" not in result["overlayClass"]
        assert "cs-gateway-animation-custom" in result["overlayClass"]
        assert result["websiteOrder"] == "0" and result["portfolioOrder"] == "0"
        assert "csGatewayAdvancedSlideUp" in result["panelAnimation"]
    elif name == "switch_position_only":
        assert "cs-mode-switch-position-custom" in result["switchClass"]
        assert "cs-mode-switch-appearance-custom" not in result["switchClass"]
        assert "cs-mode-switch-animation-custom" not in result["switchClass"]
        assert result["websiteHeaderAdvanced"] is False
        assert result["portfolioHeaderAdvanced"] is False
    elif name == "reduced_motion_animation":
        animation_events = [e for e in result["events"] if e["type"] == "animationstart"]
        assert not animation_events, animation_events
        assert result["panelAnimation"] == "none", result["panelAnimation"]
    elif name == "json_failure":
        assert result["dataStatusHidden"] is False
        assert "fallback" in result["dataStatusTitle"].lower()


def main() -> None:
    scenarios = [
        ("baseline", {}),
        ("package_default", {}),
        ("layout_only_mobile", {"viewport": {"width": 390, "height": 844}}),
        ("animation_only", {}),
        ("switch_position_only", {}),
        ("reduced_motion_animation", {"reduced_motion": "reduce"}),
        ("json_failure", {}),
    ]
    output = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        for name, kwargs in scenarios:
            print(f"Running {name}...", flush=True)
            output[name] = run_scenario(browser, name, **kwargs)
            print(f"Completed {name}.", flush=True)
        browser.close()
    for name, result in output.items():
        assert_scenario(name, result)
    report = ROOT / "docs" / "RUNTIME_BROWSER_TEST_RESULTS_v2.10.1.json"
    report.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print("CyberSabil Chromium runtime tests passed (7 scenarios).")
    print(f"Results: {report}")


if __name__ == "__main__":
    main()
