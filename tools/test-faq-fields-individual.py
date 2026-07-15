import json
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://cybersabil-faq.test/"
HTML = (ROOT / "index.html").read_text(encoding="utf-8").replace("<head>", f'<head><base href="{BASE}">', 1)


def read_json(name):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def open_case(browser, faq, viewport=None, faq_visible=True):
    viewport = viewport or {"width": 1366, "height": 768}
    context = browser.new_context(viewport=viewport)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
    page.on("console", lambda message: errors.append(f"console: {message.text}") if message.type == "error" else None)

    settings = read_json("site-settings.json")
    settings.update({
        "gatewayEnabled": "no",
        "defaultMode": "website",
        "showFaqSection": "yes" if faq_visible else "no",
    })
    overrides = {"faq.json": faq, "site-settings.json": settings}

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
    try:
        page.wait_for_function(
            "document.documentElement.classList.contains('cs-boot-ready') || document.documentElement.classList.contains('cs-boot-failed')",
            timeout=10000,
        )
    except Exception as exc:
        errors.append(f"boot-timeout: {exc}")
    page.wait_for_timeout(400)
    return context, page, errors


def snapshot(page):
    return page.evaluate(
        """() => {
            const grid = document.getElementById('faqGrid');
            const section = document.getElementById('faq');
            const items = [...grid.querySelectorAll('.faq-item')];
            const rects = items.map(e => e.getBoundingClientRect());
            const columns = [...new Set(rects.map(r => Math.round(r.left)))].length;
            return {
                itemCount: items.length,
                emptyStates: grid.querySelectorAll('.cs-mode-empty-state').length,
                questions: [...grid.querySelectorAll('.faq-item h3')].map(e => e.textContent),
                answers: [...grid.querySelectorAll('.faq-item p')].map(e => e.textContent),
                paragraphsPerItem: items.map(e => e.querySelectorAll('p').length),
                text: grid.innerText,
                html: grid.innerHTML,
                sectionHidden: section.classList.contains('hide') || section.hidden,
                sectionDisplay: getComputedStyle(section).display,
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
                gridWidth: grid.getBoundingClientRect().width,
                minLeft: rects.length ? Math.min(...rects.map(r => r.left)) : 0,
                maxRight: rects.length ? Math.max(...rects.map(r => r.right)) : 0,
                columns,
                heights: rects.map(r => Math.round(r.height)),
                docsCount: document.querySelectorAll('#docsList .cs-doc-item').length,
                toolsCount: document.querySelectorAll('#toolCards .card').length,
                faqTitle: document.getElementById('faqSectionTitle')?.textContent,
                faqSubtitle: document.getElementById('faqSectionSubtitle')?.textContent,
            };
        }"""
    )


results = []

def record(name, passed, details=None):
    results.append({"test": name, "passed": bool(passed), "details": details or {}})


def no_errors(errors):
    return len(errors) == 0


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    # 1-5 normal rendering, trimming, escaping.
    ctx, page, errors = open_case(browser, [{"question": "  What is this?  ", "answer": "  A safe answer.  "}])
    s = snapshot(page)
    record("normal_question_trimmed", s["questions"] == ["What is this?"], s)
    record("normal_answer_trimmed", s["answers"] == ["A safe answer."], s)
    record("normal_single_card", s["itemCount"] == 1, s)
    record("normal_no_browser_errors", no_errors(errors), errors)
    record("faq_does_not_change_section_heading", s["faqTitle"] == "FAQ" and bool(s["faqSubtitle"]), s)
    ctx.close()

    hostile = [{"question": '<img src=x onerror="window.__faqX=1">Question', "answer": '<script>window.__faqY=1</script><b>Answer</b>'}]
    ctx, page, errors = open_case(browser, hostile)
    s = snapshot(page)
    record("question_and_answer_html_escaped", "<img" in s["text"] and "<script>" in s["text"] and "<b>Answer</b>" in s["text"], s["html"])
    record("hostile_markup_not_created", page.locator("#faqGrid img, #faqGrid script, #faqGrid b").count() == 0 and page.evaluate("() => !window.__faqX && !window.__faqY"), s["html"])
    record("hostile_case_no_errors", no_errors(errors), errors)
    ctx.close()

    # 9-16 blank, missing, primitive, malformed entries.
    ctx, page, errors = open_case(browser, [{"question": "   ", "answer": "   "}])
    s = snapshot(page)
    record("blank_question_safe_fallback", s["questions"] == ["Untitled question"], s)
    record("blank_answer_hides_paragraph", s["answers"] == [] and s["paragraphsPerItem"] == [0], s)
    record("blank_case_no_errors", no_errors(errors), errors)
    ctx.close()

    ctx, page, errors = open_case(browser, [{}, {"question": 123, "answer": 456}, {"question": False, "answer": True}])
    s = snapshot(page)
    record("missing_fields_safe", s["itemCount"] == 3 and s["questions"][0] == "Untitled question" and s["paragraphsPerItem"][0] == 0, s)
    record("numeric_boolean_fields_normalized", s["questions"][1:] == ["123", "False"] or s["questions"][1:] == ["123", "false"], s)
    record("primitive_answer_normalized", s["answers"][-2:] in (["456", "True"], ["456", "true"]), s)
    record("missing_primitive_case_no_errors", no_errors(errors), errors)
    ctx.close()

    malformed = [None, 7, True, "bad", [], {"question": "Valid", "answer": "Yes"}]
    ctx, page, errors = open_case(browser, malformed)
    s = snapshot(page)
    record("malformed_entries_do_not_crash", s["itemCount"] == 6 and no_errors(errors), {"snapshot": s, "errors": errors})
    record("malformed_entries_use_fallback", s["questions"][:5] == ["Untitled question"] * 5, s["questions"])
    ctx.close()

    # 18-26 CRUD/order/duplicates/empty/non-array/re-render.
    faq = [
        {"question": "A", "answer": "First"},
        {"question": "B", "answer": "Second"},
        {"question": "C", "answer": "Third"},
    ]
    ctx, page, errors = open_case(browser, faq)
    s = snapshot(page)
    record("add_multiple_entries", s["itemCount"] == 3, s)
    record("list_order_preserved", s["questions"] == ["A", "B", "C"], s["questions"])
    record("all_answers_correspond", s["answers"] == ["First", "Second", "Third"], s["answers"])
    record("multiple_entries_no_errors", no_errors(errors), errors)
    # Re-render same payload should replace rather than duplicate.
    page.evaluate("payload => renderFAQ(payload)", faq)
    s2 = snapshot(page)
    record("repeated_render_no_duplicate_accumulation", s2["itemCount"] == 3 and s2["questions"] == ["A", "B", "C"], s2)
    # Re-render reordered/deleted.
    page.evaluate("payload => renderFAQ(payload)", [faq[2], faq[0]])
    s3 = snapshot(page)
    record("delete_and_reorder_entries", s3["questions"] == ["C", "A"], s3["questions"])
    ctx.close()

    ctx, page, errors = open_case(browser, [faq[0], faq[0]])
    s = snapshot(page)
    record("duplicate_entries_preserved", s["questions"] == ["A", "A"], s["questions"])
    record("duplicates_no_errors", no_errors(errors), errors)
    ctx.close()

    for payload, name in [([], "empty_array"), ({"bad": True}, "non_array")]:
        ctx, page, errors = open_case(browser, payload)
        s = snapshot(page)
        record(f"{name}_safe_empty_state", s["itemCount"] == 0 and s["emptyStates"] == 1 and "No FAQ found" in s["text"], s)
        record(f"{name}_no_errors", no_errors(errors), errors)
        ctx.close()

    # 31-38 section visibility and isolation.
    ctx, page, errors = open_case(browser, faq, faq_visible=False)
    s = snapshot(page)
    record("faq_section_visibility_control", s["sectionDisplay"] == "none" or s["sectionHidden"], s)
    record("hidden_section_data_can_render_without_error", s["itemCount"] == 3 and no_errors(errors), {"snapshot": s, "errors": errors})
    ctx.close()

    ctx, page, errors = open_case(browser, faq)
    before = snapshot(page)
    page.evaluate("() => renderFAQ([{question:'Changed', answer:'Only FAQ'}])")
    after = snapshot(page)
    record("faq_render_isolated_from_docs", before["docsCount"] == after["docsCount"], {"before": before["docsCount"], "after": after["docsCount"]})
    record("faq_render_isolated_from_tools", before["toolsCount"] == after["toolsCount"], {"before": before["toolsCount"], "after": after["toolsCount"]})
    record("faq_render_updates_only_faq_content", after["questions"] == ["Changed"] and after["answers"] == ["Only FAQ"], after)
    record("isolation_no_errors", no_errors(errors), errors)
    ctx.close()

    # 39-47 responsive and long-content safety.
    long_token = "Q" * 1200
    long_answer = "A" * 4000
    for viewport, expected_min_cols, expected_max_cols, label in [
        ({"width": 1366, "height": 768}, 2, 2, "desktop"),
        ({"width": 768, "height": 1024}, 1, 1, "tablet"),
        ({"width": 430, "height": 932}, 1, 1, "mobile430"),
        ({"width": 360, "height": 800}, 1, 1, "mobile360"),
    ]:
        payload = [{"question": long_token, "answer": long_answer}, {"question": "Short", "answer": "Short answer"}]
        ctx, page, errors = open_case(browser, payload, viewport=viewport)
        s = snapshot(page)
        record(f"{label}_expected_columns", expected_min_cols <= s["columns"] <= expected_max_cols, s)
        record(f"{label}_no_horizontal_overflow", s["scrollWidth"] <= s["clientWidth"] and s["maxRight"] <= s["clientWidth"] + 1 and s["minLeft"] >= -1, s)
        record(f"{label}_long_text_preserved", s["questions"][0] == long_token and s["answers"][0] == long_answer, {"q_len": len(s["questions"][0]), "a_len": len(s["answers"][0])})
        record(f"{label}_no_errors", no_errors(errors), errors)
        ctx.close()

    # 55-59 equal row height and large-list stability.
    ctx, page, errors = open_case(browser, [
        {"question": "Short", "answer": "One"},
        {"question": "Long", "answer": "Sentence " * 50},
        {"question": "Third", "answer": "Three"},
        {"question": "Fourth", "answer": "Four"},
    ])
    s = snapshot(page)
    first_row = s["heights"][:2]
    record("desktop_grid_cards_stretch_per_row", len(first_row) == 2 and abs(first_row[0] - first_row[1]) <= 1, s["heights"])
    record("mixed_length_content_no_errors", no_errors(errors), errors)
    ctx.close()

    large = [{"question": f"Question {i}", "answer": f"Answer {i}"} for i in range(200)]
    start = time.perf_counter()
    ctx, page, errors = open_case(browser, large)
    elapsed = time.perf_counter() - start
    s = snapshot(page)
    record("large_200_item_list_renders", s["itemCount"] == 200 and s["questions"][0] == "Question 0" and s["questions"][-1] == "Question 199", {"count": s["itemCount"], "elapsed": elapsed})
    record("large_list_no_errors", no_errors(errors), errors)
    record("large_list_reasonable_boot_time", elapsed < 10, {"elapsed": elapsed})
    ctx.close()

    browser.close()

out = ROOT / "docs" / "FAQ_FIELD_INDIVIDUAL_AUDIT.json"
out.write_text(json.dumps({
    "group": "Website FAQ List",
    "fields": ["question", "answer"],
    "targeted_checks": len(results),
    "passed": sum(1 for r in results if r["passed"]),
    "failed": sum(1 for r in results if not r["passed"]),
    "results": results,
}, indent=2, ensure_ascii=False), encoding="utf-8")

failed = [r for r in results if not r["passed"]]
print(json.dumps({"targeted_checks": len(results), "passed": len(results)-len(failed), "failed": len(failed), "failed_tests": [r["test"] for r in failed]}, indent=2))
if failed:
    raise SystemExit(1)
