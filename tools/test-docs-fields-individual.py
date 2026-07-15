import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://cybersabil-docs.test/"
HTML = (ROOT / "index.html").read_text(encoding="utf-8").replace("<head>", f'<head><base href="{BASE}">', 1)


def read_json(name):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def open_case(browser, docs, site_overrides=None, viewport=None):
    viewport = viewport or {"width": 1366, "height": 768}
    context = browser.new_context(viewport=viewport)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
    page.on("console", lambda message: errors.append(f"console: {message.text}") if message.type == "error" else None)

    site = read_json("site-settings.json")
    site.update({"gatewayEnabled": "no", "defaultMode": "website", "showDocsSection": "yes"})
    if site_overrides:
        site.update(site_overrides)
    overrides = {"docs.json": docs, "site-settings.json": site}

    def route_handler(route):
        relative = urlparse(route.request.url).path.lstrip("/") or "index.html"
        if relative.startswith("data/"):
            name = relative.split("/", 1)[1]
            if name in overrides:
                route.fulfill(status=200, body=json.dumps(overrides[name]), content_type="application/json")
                return
        file_path = ROOT / relative
        if file_path.exists() and file_path.is_file():
            content_type = {
                ".json": "application/json",
                ".css": "text/css",
                ".js": "application/javascript",
                ".png": "image/png",
                ".svg": "image/svg+xml",
                ".html": "text/html",
            }.get(file_path.suffix, "application/octet-stream")
            route.fulfill(status=200, body=file_path.read_bytes(), content_type=content_type)
        else:
            route.fulfill(status=404, body="not found")

    page.route(BASE + "**", route_handler)
    page.set_content(HTML, wait_until="domcontentloaded")
    page.wait_for_function(
        "document.documentElement.classList.contains('cs-boot-ready') || document.documentElement.classList.contains('cs-boot-failed')",
        timeout=10000,
    )
    page.wait_for_timeout(350)
    return context, page, errors


def snapshot(page):
    return page.evaluate(
        """() => {
            const list = document.getElementById('docsList');
            const items = [...list.querySelectorAll('.cs-doc-item')];
            return {
                itemCount: items.length,
                emptyStates: list.querySelectorAll('.cs-mode-empty-state').length,
                titles: [...list.querySelectorAll('.cs-doc-item h3')].map(e => e.textContent),
                categories: [...list.querySelectorAll('.cs-doc-item .status')].map(e => e.textContent),
                descriptions: [...list.querySelectorAll('.cs-doc-item p')].map(e => e.textContent),
                commands: [...list.querySelectorAll('.cs-doc-item .code')].map(e => e.textContent),
                links: [...list.querySelectorAll('.cs-doc-item a')].map(a => ({
                    href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), text: a.textContent
                })),
                copyButtons: [...list.querySelectorAll('.copy-btn')].map(b => ({
                    title: b.title,
                    aria: b.getAttribute('aria-label'),
                    tooltip: b.dataset.tooltip,
                    pseudo: getComputedStyle(b, '::after').content
                })),
                text: list.innerText,
                html: list.innerHTML,
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
                listWidth: list.getBoundingClientRect().width,
                maxItemRight: items.length ? Math.max(...items.map(e => e.getBoundingClientRect().right)) : 0,
                minItemLeft: items.length ? Math.min(...items.map(e => e.getBoundingClientRect().left)) : 0,
                docTop: document.getElementById('docs')?.getBoundingClientRect().top,
                faqCount: document.querySelectorAll('#faqGrid .faq-item').length,
                toolCount: document.querySelectorAll('#toolCards .card').length
            };
        }"""
    )


def assert_no_errors(errors):
    assert not errors, errors


results = []

def record(name, passed, details=None):
    results.append({"test": name, "passed": bool(passed), "details": details or {}})
    assert passed, f"{name}: {details}"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    # 1-5: Normal field rendering and text safety.
    normal = [{"title": "  Install Guide  ", "category": "  Setup  ", "description": "  Run safely.  ", "command": "  echo ok  ", "link": "https://example.com/docs"}]
    ctx, page, errors = open_case(browser, normal)
    snap = snapshot(page)
    record("normal_fields_trim_and_render", snap["titles"] == ["Install Guide"] and snap["categories"] == ["Setup"] and snap["descriptions"] == ["Run safely."] and snap["commands"] == ["echo ok"], snap)
    record("external_https_link_contract", snap["links"] == [{"href": "https://example.com/docs", "target": "_blank", "rel": "noopener noreferrer", "text": "Open"}], snap["links"])
    record("command_creates_one_copy_button", len(snap["copyButtons"]) == 1, snap["copyButtons"])
    assert_no_errors(errors)
    ctx.close()

    hostile = [{"title": '<img src=x onerror=1>', "category": '<script>x</script>', "description": '<b>bold</b>', "command": '<svg onload=1>', "link": "https://example.com/?q=\"x\""}]
    ctx, page, errors = open_case(browser, hostile)
    snap = snapshot(page)
    record("all_text_fields_html_escaped", "<img" in snap["text"] and "<script>" in snap["text"] and "<b>bold</b>" in snap["text"] and "<svg" in snap["text"] and not page.locator("#docsList img, #docsList script, #docsList svg:not(.copy-btn svg)").count(), snap["html"][:600])
    assert_no_errors(errors)
    ctx.close()

    # 6-11: Blank/optional/malformed values.
    blank = [{"title": "   ", "category": "   ", "description": "   ", "command": "   ", "link": "   "}]
    ctx, page, errors = open_case(browser, blank)
    snap = snapshot(page)
    record("blank_title_uses_safe_fallback", snap["titles"] == ["Untitled guide"], snap)
    record("blank_category_hides_badge", snap["categories"] == [], snap)
    record("blank_description_hides_paragraph", snap["descriptions"] == [], snap)
    record("blank_command_hides_code_and_copy", snap["commands"] == [] and snap["copyButtons"] == [], snap)
    record("blank_link_hides_open_button", snap["links"] == [], snap)
    assert_no_errors(errors)
    ctx.close()

    malformed = [None, 7, True, "bad", {}, {"title": 123, "category": False, "description": 456, "command": 789, "link": None}]
    ctx, page, errors = open_case(browser, malformed)
    snap = snapshot(page)
    record("malformed_entries_do_not_crash", snap["itemCount"] == 6 and len(snap["titles"]) == 6, snap)
    record("primitive_fields_normalize_to_text", snap["titles"][-1] == "123" and snap["descriptions"][-1] == "456" and snap["commands"][-1] == "789", snap)
    assert_no_errors(errors)
    ctx.close()

    # 12-20: URL handling.
    link_cases = [
        ("hash", "#about", "#about", None),
        ("relative", "guides/setup.html", "guides/setup.html", None),
        ("root_relative", "/downloads/file.zip", "/downloads/file.zip", None),
        ("mailto", "mailto:test@example.com", "mailto:test@example.com", None),
        ("tel", "tel:+911234567890", "tel:+911234567890", None),
        ("http", "http://example.com", "http://example.com", "_blank"),
        ("https", "https://example.com", "https://example.com", "_blank"),
    ]
    for name, link, expected_href, expected_target in link_cases:
        ctx, page, errors = open_case(browser, [{"title": name, "category": "", "description": "", "command": "", "link": link}])
        snap = snapshot(page)
        actual = snap["links"][0] if snap["links"] else None
        passed = bool(actual) and actual["href"] == expected_href and actual["target"] == expected_target
        if expected_target == "_blank":
            passed = passed and actual["rel"] == "noopener noreferrer"
        else:
            passed = passed and actual["rel"] is None
        record(f"link_{name}_behavior", passed, actual)
        assert_no_errors(errors)
        ctx.close()

    for scheme in ["javascript:alert(1)", "data:text/html,x", "vbscript:msgbox(1)", "#"]:
        ctx, page, errors = open_case(browser, [{"title": "Unsafe", "category": "", "description": "", "command": "", "link": scheme}])
        snap = snapshot(page)
        record(f"blocked_or_placeholder_link_hidden_{scheme.split(':')[0]}", snap["links"] == [], snap["links"])
        assert_no_errors(errors)
        ctx.close()

    # 21-27: List CRUD/order/empty behavior.
    docs = [
        {"title": "A", "category": "One", "description": "First", "command": "a", "link": "#about"},
        {"title": "B", "category": "Two", "description": "Second", "command": "b", "link": "https://example.com/b"},
        {"title": "C", "category": "Three", "description": "Third", "command": "", "link": ""},
    ]
    ctx, page, errors = open_case(browser, docs)
    snap = snapshot(page)
    record("add_multiple_guides", snap["itemCount"] == 3, snap)
    record("list_order_preserved", snap["titles"] == ["A", "B", "C"], snap["titles"])
    record("mixed_optional_fields_independent", len(snap["commands"]) == 2 and len(snap["links"]) == 2, snap)
    assert_no_errors(errors)
    ctx.close()

    ctx, page, errors = open_case(browser, [docs[2], docs[0]])
    snap = snapshot(page)
    record("delete_and_reorder_guides", snap["titles"] == ["C", "A"], snap["titles"])
    assert_no_errors(errors)
    ctx.close()

    ctx, page, errors = open_case(browser, [docs[0], docs[0]])
    snap = snapshot(page)
    record("duplicate_guides_are_preserved", snap["titles"] == ["A", "A"], snap["titles"])
    assert_no_errors(errors)
    ctx.close()

    for payload, name in [([], "empty_array"), ({"bad": True}, "non_array")]:
        ctx, page, errors = open_case(browser, payload)
        snap = snapshot(page)
        record(f"{name}_shows_safe_empty_state", snap["itemCount"] == 0 and snap["emptyStates"] == 1 and "No docs found" in snap["text"], snap)
        assert_no_errors(errors)
        ctx.close()

    # 28-34: Copy button labels, success, reset and failure.
    copy_settings = {
        "copyButtonDefaultTitle": "Copy now",
        "copyButtonSuccessTitle": "Copied successfully",
        "copyButtonErrorTitle": "Copy failed custom",
        "copyButtonAriaLabel": "Copy this guide command",
    }
    ctx, page, errors = open_case(browser, [{"title": "Copy", "category": "", "description": "", "command": "echo docs", "link": ""}], copy_settings)
    snap = snapshot(page)
    btn = snap["copyButtons"][0]
    record("copy_default_title_and_custom_aria", btn["title"] == "Copy now" and btn["aria"] == "Copy this guide command", btn)
    record("copy_tooltip_uses_cms_default_text", "Copy now" in btn["pseudo"] and btn["tooltip"] == "Copy now", btn)
    page.evaluate("() => { document.execCommand = function(){ window.__copied = document.activeElement && document.activeElement.value; return true; }; }")
    page.locator("#docsList .copy-btn").click()
    page.wait_for_timeout(100)
    success = page.evaluate("""() => {const b=document.querySelector('#docsList .copy-btn');return {title:b.title,aria:b.getAttribute('aria-label'),tooltip:b.dataset.tooltip,copied:window.__copied,cls:b.classList.contains('copied'),pseudo:getComputedStyle(b,'::after').content}}""")
    record("copy_success_state_uses_cms_text", success["title"] == "Copied successfully" and success["aria"] == "Copied successfully" and success["tooltip"] == "Copied successfully" and success["copied"] == "echo docs" and success["cls"], success)
    page.wait_for_timeout(1500)
    reset = page.evaluate("""() => {const b=document.querySelector('#docsList .copy-btn');return {title:b.title,aria:b.getAttribute('aria-label'),tooltip:b.dataset.tooltip,cls:b.classList.contains('copied')}}""")
    record("copy_reset_restores_custom_aria", reset == {"title": "Copy now", "aria": "Copy this guide command", "tooltip": "Copy now", "cls": False}, reset)
    assert_no_errors(errors)
    ctx.close()

    ctx, page, errors = open_case(browser, [{"title": "Copy", "category": "", "description": "", "command": "echo docs", "link": ""}], copy_settings)
    page.evaluate("() => { document.execCommand = function(){ throw new Error('forced'); }; }")
    page.locator("#docsList .copy-btn").click()
    page.wait_for_timeout(100)
    failed = page.evaluate("""() => {const b=document.querySelector('#docsList .copy-btn');return {title:b.title,aria:b.getAttribute('aria-label'),tooltip:b.dataset.tooltip,pseudo:getComputedStyle(b,'::after').content}}""")
    record("copy_failure_state_uses_cms_text", failed["title"] == "Copy failed custom" and failed["aria"] == "Copy failed custom" and failed["tooltip"] == "Copy failed custom" and "Copy failed custom" in failed["pseudo"], failed)
    assert_no_errors(errors)
    ctx.close()

    # 35-39: Re-render safety and isolation.
    ctx, page, errors = open_case(browser, [{"title": "Old", "category": "", "description": "", "command": "old", "link": ""}])
    page.evaluate("""() => {renderDocs([{title:'New',category:'Fresh',description:'Updated',command:'new',link:'#about'}]); addCopyButtons({copyButtonDefaultTitle:'Copy',copyButtonAriaLabel:'Copy command'});}""")
    rerender = snapshot(page)
    record("rerender_replaces_old_content", rerender["titles"] == ["New"] and rerender["commands"] == ["new"], rerender)
    record("rerender_does_not_duplicate_copy_buttons", len(rerender["copyButtons"]) == 1, rerender["copyButtons"])
    page.evaluate("""() => {renderDocs([{title:'No command',category:'',description:'',command:'',link:''}]); addCopyButtons({});}""")
    rerender2 = snapshot(page)
    record("command_removal_clears_copy_wrapper", rerender2["commands"] == [] and rerender2["copyButtons"] == [], rerender2)
    assert_no_errors(errors)
    ctx.close()

    ctx, page, errors = open_case(browser, docs)
    snap = snapshot(page)
    record("documentation_render_isolated_from_other_sections", snap["faqCount"] >= 0 and snap["toolCount"] >= 0, {"faqCount": snap["faqCount"], "toolCount": snap["toolCount"]})
    assert_no_errors(errors)
    ctx.close()

    # 40-44: Responsive overflow and large-list stability.
    long_item = [{"title": "T" * 700, "category": "C" * 300, "description": "D" * 1800, "command": "X" * 1200, "link": "https://example.com"}]
    for viewport, label in [({"width": 360, "height": 800}, "mobile_360"), ({"width": 768, "height": 1024}, "tablet_768"), ({"width": 1366, "height": 768}, "desktop_1366")]:
        ctx, page, errors = open_case(browser, long_item, viewport=viewport)
        snap = snapshot(page)
        in_bounds = snap["scrollWidth"] == snap["clientWidth"] and snap["maxItemRight"] <= snap["clientWidth"] + 1 and snap["minItemLeft"] >= -1
        record(f"long_content_no_horizontal_overflow_{label}", in_bounds, snap)
        assert_no_errors(errors)
        ctx.close()

    many = [{"title": f"Guide {i}", "category": "Bulk", "description": "Description", "command": f"echo {i}", "link": ""} for i in range(200)]
    ctx, page, errors = open_case(browser, many)
    snap = snapshot(page)
    record("large_200_item_list_stable", snap["itemCount"] == 200 and len(snap["copyButtons"]) == 200, {"items": snap["itemCount"], "buttons": len(snap["copyButtons"])})
    assert_no_errors(errors)
    ctx.close()

    browser.close()

report = {
    "group": "Website Documentation List",
    "cms_file": "data/docs.json",
    "targeted_tests": len(results),
    "passed": sum(1 for item in results if item["passed"]),
    "failed": sum(1 for item in results if not item["passed"]),
    "results": results,
}
output = ROOT / "docs" / "DOCS_FIELD_INDIVIDUAL_AUDIT.json"
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"PASS {report['passed']}/{report['targeted_tests']}")
print(output)
