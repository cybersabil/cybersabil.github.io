#!/usr/bin/env python3
from __future__ import annotations
import copy
import json
import os
import shutil
import socket
import subprocess
import tempfile
import threading
import time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CANONICAL = "https://cybersabil.github.io/"
DEFAULT_IMAGE = "https://cybersabil.github.io/media/social-preview.png"
DEFAULT_THEME = "#120821"
BASE_SITE = json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))
BASE_SEO = json.loads((ROOT / "data/seo.json").read_text(encoding="utf-8"))


def get_free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        return


def head_from_html(path: Path) -> dict[str, str]:
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    def meta_name(name: str) -> str:
        node = soup.find("meta", attrs={"name": name})
        return node.get("content", "") if node else ""
    def meta_prop(prop: str) -> str:
        node = soup.find("meta", attrs={"property": prop})
        return node.get("content", "") if node else ""
    canonical = soup.find("link", attrs={"rel": "canonical"})
    return {
        "title": soup.title.string if soup.title else "",
        "description": meta_name("description"),
        "canonical": canonical.get("href", "") if canonical else "",
        "og:type": meta_prop("og:type"),
        "og:url": meta_prop("og:url"),
        "og:title": meta_prop("og:title"),
        "og:description": meta_prop("og:description"),
        "og:image": meta_prop("og:image"),
        "twitter:card": meta_name("twitter:card"),
        "twitter:title": meta_name("twitter:title"),
        "twitter:description": meta_name("twitter:description"),
        "twitter:image": meta_name("twitter:image"),
        "theme-color": meta_name("theme-color"),
    }


def runtime_snapshot(page) -> dict[str, str]:
    return page.evaluate("""() => {
      const metaName = (name) => document.head.querySelector(`meta[name="${name}"]`)?.content || '';
      const metaProp = (name) => document.head.querySelector(`meta[property="${name}"]`)?.content || '';
      return {
        title: document.title,
        description: metaName('description'),
        canonical: document.head.querySelector('link[rel="canonical"]')?.href || '',
        'og:type': metaProp('og:type'),
        'og:url': metaProp('og:url'),
        'og:title': metaProp('og:title'),
        'og:description': metaProp('og:description'),
        'og:image': metaProp('og:image'),
        'twitter:card': metaName('twitter:card'),
        'twitter:title': metaName('twitter:title'),
        'twitter:description': metaName('twitter:description'),
        'twitter:image': metaName('twitter:image'),
        'theme-color': metaName('theme-color')
      };
    }""")


def expected_defaults() -> dict[str, str]:
    page_title = f"{BASE_SITE.get('brandName', 'CyberSabil').strip()} IT Tools"
    desc = BASE_SITE.get("heroDescription", "CyberSabil IT tools and portfolio.").strip()
    return {
        "title": page_title,
        "description": desc,
        "canonical": DEFAULT_CANONICAL,
        "og:type": "website",
        "og:url": DEFAULT_CANONICAL,
        "og:title": page_title,
        "og:description": desc,
        "og:image": DEFAULT_IMAGE,
        "twitter:card": "summary_large_image",
        "twitter:title": page_title,
        "twitter:description": desc,
        "twitter:image": DEFAULT_IMAGE,
        "theme-color": DEFAULT_THEME,
    }


def assert_subset(actual: dict[str, str], expected: dict[str, str], label: str, failures: list[str]) -> None:
    for key, value in expected.items():
        if actual.get(key) != value:
            failures.append(f"{label}: {key} expected {value!r}, got {actual.get(key)!r}")


def run() -> int:
    results: list[dict[str, Any]] = []
    failures: list[str] = []

    # Static CMS schema/help checks.
    pages_text = (ROOT / ".pages.yml").read_text(encoding="utf-8")
    schema_checks = {
        "twitter_card_description_not_portfolio_copy": "Is setting ka Portfolio theme se koi relation nahi hai." in pages_text,
        "canonical_absolute_guidance": "Canonical page URL" in pages_text and "absolute http/https" in pages_text,
        "image_1200x630_guidance": "1200×630" in pages_text,
        "theme_color_fallback_guidance": "safe default #120821" in pages_text,
        "no_hardcoded_social_image_dimensions": "og:image:width" not in (ROOT / "index.html").read_text(encoding="utf-8") and "og:image:height" not in (ROOT / "index.html").read_text(encoding="utf-8"),
    }
    for name, ok in schema_checks.items():
        results.append({"group": "schema", "test": name, "pass": ok})
        if not ok: failures.append(f"schema: {name}")

    # Build-time tests in isolated copy.
    with tempfile.TemporaryDirectory(prefix="cs-seo-build-") as tmp:
        project = Path(tmp) / "project"
        shutil.copytree(ROOT, project)
        seo_path = project / "data/seo.json"

        build_cases: list[tuple[str, Any, dict[str, str]]] = []
        custom = {
            "pageTitle": "  Custom & <Title>  ",
            "metaDescription": "  Custom description & details  ",
            "ogTitle": "  Social title  ",
            "ogDescription": "  Social description  ",
            "ogImage": "https://example.com/social.png",
            "canonicalUrl": "https://example.com/page",
            "ogType": "profile",
            "ogUrl": "https://example.com/share",
            "twitterCard": "summary",
            "twitterTitle": "  X title  ",
            "twitterDescription": "  X description  ",
            "twitterImage": "https://example.com/x.png",
            "themeColor": "#ABCDEF",
        }
        build_cases.append(("custom_values", custom, {
            "title": "Custom & <Title>",
            "description": "Custom description & details",
            "canonical": "https://example.com/page",
            "og:type": "profile",
            "og:url": "https://example.com/share",
            "og:title": "Social title",
            "og:description": "Social description",
            "og:image": "https://example.com/social.png",
            "twitter:card": "summary",
            "twitter:title": "X title",
            "twitter:description": "X description",
            "twitter:image": "https://example.com/x.png",
            "theme-color": "#abcdef",
        }))
        build_cases.append(("blank_fallbacks", {k: "   " for k in BASE_SEO}, expected_defaults()))
        build_cases.append(("unsafe_urls", {
            **BASE_SEO,
            "canonicalUrl": "javascript:alert(1)",
            "ogUrl": "mailto:test@example.com",
            "ogImage": "data:image/png;base64,AAAA",
            "twitterImage": "../relative.png",
            "themeColor": "red",
            "twitterCard": "giant_card",
            "ogType": "bad type <script>",
        }, {
            "canonical": DEFAULT_CANONICAL,
            "og:url": DEFAULT_CANONICAL,
            "og:image": DEFAULT_IMAGE,
            "twitter:image": DEFAULT_IMAGE,
            "twitter:card": "summary_large_image",
            "og:type": "website",
            "theme-color": DEFAULT_THEME,
        }))
        build_cases.append(("twitter_inherits_og_image", {**BASE_SEO, "ogImage": "https://example.com/og.png", "twitterImage": ""}, {
            "og:image": "https://example.com/og.png",
            "twitter:image": "https://example.com/og.png",
        }))
        build_cases.append(("og_does_not_inherit_twitter", {**BASE_SEO, "ogImage": "", "twitterImage": "https://example.com/x-only.png"}, {
            "og:image": DEFAULT_IMAGE,
            "twitter:image": "https://example.com/x-only.png",
        }))
        build_cases.append(("malformed_null_root", None, expected_defaults()))
        build_cases.append(("malformed_array_root", ["bad"], expected_defaults()))

        for label, value, expected in build_cases:
            seo_path.write_text(json.dumps(value, indent=2), encoding="utf-8")
            proc = subprocess.run(["node", "tools/generate-site.js"], cwd=project, text=True, capture_output=True)
            ok = proc.returncode == 0
            if not ok:
                failures.append(f"build {label}: generator failed: {proc.stderr}")
                results.append({"group": "build", "test": label, "pass": False, "error": proc.stderr})
                continue
            actual = head_from_html(project / "index.html")
            local_failures_before = len(failures)
            assert_subset(actual, expected, f"build {label}", failures)
            results.append({"group": "build", "test": label, "pass": len(failures) == local_failures_before, "actual": actual, "expected": expected})

    # Runtime tests on actual project, calling the real applySeo function.
    # A routed virtual origin avoids browser policies that block localhost in this environment.
    from urllib.parse import urlparse
    origin = "https://seo-field-audit.test/"
    html = (ROOT / "index.html").read_text(encoding="utf-8").replace("<head>", f'<head><base href="{origin}">', 1)
    console_errors: list[str] = []
    page_errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        context = browser.new_context()
        page = context.new_page()
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        def route_handler(route):
            rel = urlparse(route.request.url).path.lstrip('/') or 'index.html'
            fp = ROOT / rel
            if fp.exists() and fp.is_file():
                ct = {'.json':'application/json','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'}.get(fp.suffix,'application/octet-stream')
                route.fulfill(status=200, body=fp.read_bytes(), content_type=ct, headers={'Cache-Control':'no-store'})
            else:
                route.fulfill(status=404, body='not found')

        page.route(origin + "**", route_handler)
        page.set_content(html, wait_until="domcontentloaded")
        page.wait_for_function("typeof window.applySeo === 'function'")

        runtime_cases: list[tuple[str, Any, dict[str, str]]] = [
            ("trim_and_custom", custom, {
                "title": "Custom & <Title>", "description": "Custom description & details",
                "canonical": "https://example.com/page", "og:type": "profile", "og:url": "https://example.com/share",
                "og:title": "Social title", "og:description": "Social description", "og:image": "https://example.com/social.png",
                "twitter:card": "summary", "twitter:title": "X title", "twitter:description": "X description",
                "twitter:image": "https://example.com/x.png", "theme-color": "#abcdef",
            }),
            ("blank_fallbacks", {k: "  " for k in BASE_SEO}, expected_defaults()),
            ("unsafe_urls", {
                **BASE_SEO, "canonicalUrl": "javascript:alert(1)", "ogUrl": "mailto:test@example.com",
                "ogImage": "data:image/png;base64,AAAA", "twitterImage": "../relative.png",
                "themeColor": "transparent", "twitterCard": "invalid", "ogType": "bad type"
            }, {
                "canonical": DEFAULT_CANONICAL, "og:url": DEFAULT_CANONICAL, "og:image": DEFAULT_IMAGE,
                "twitter:image": DEFAULT_IMAGE, "theme-color": DEFAULT_THEME, "twitter:card": "summary_large_image", "og:type": "website"
            }),
            ("twitter_inherits_og_image", {**BASE_SEO, "ogImage": "https://example.com/og.png", "twitterImage": ""}, {
                "og:image": "https://example.com/og.png", "twitter:image": "https://example.com/og.png"
            }),
            ("og_does_not_inherit_twitter", {**BASE_SEO, "ogImage": "", "twitterImage": "https://example.com/x-only.png"}, {
                "og:image": DEFAULT_IMAGE, "twitter:image": "https://example.com/x-only.png"
            }),
            ("malformed_null", None, expected_defaults()),
            ("malformed_array", ["bad"], expected_defaults()),
        ]
        for label, value, expected in runtime_cases:
            page.evaluate("([seo, site]) => window.applySeo(seo, site)", [value, BASE_SITE])
            actual = runtime_snapshot(page)
            local_failures_before = len(failures)
            assert_subset(actual, expected, f"runtime {label}", failures)
            results.append({"group": "runtime", "test": label, "pass": len(failures) == local_failures_before, "actual": actual, "expected": expected})

        page.evaluate("([seo, site]) => window.applySeo(seo, site)", [custom, BASE_SITE])
        page.evaluate("([seo, site]) => window.applySeo(seo, site)", [{k: " " for k in BASE_SEO}, BASE_SITE])
        actual = runtime_snapshot(page)
        local_failures_before = len(failures)
        assert_subset(actual, expected_defaults(), "runtime stale_reset", failures)
        results.append({"group": "runtime", "test": "stale_reset", "pass": len(failures) == local_failures_before, "actual": actual})

        context.close()
        browser.close()

    if console_errors:
        failures.extend([f"console error: {x}" for x in console_errors])
    if page_errors:
        failures.extend([f"page error: {x}" for x in page_errors])

    report = {
        "group": "SEO and Social Sharing",
        "cms_fields": 13,
        "targeted_checks": len(results),
        "passed": sum(1 for r in results if r.get("pass")),
        "failed": sum(1 for r in results if not r.get("pass")),
        "console_errors": console_errors,
        "page_errors": page_errors,
        "failures": failures,
        "results": results,
    }
    out = ROOT / "docs/SEO_FIELD_INDIVIDUAL_AUDIT.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ["cms_fields", "targeted_checks", "passed", "failed"]}, indent=2))
    if failures:
        print("FAILURES:")
        for failure in failures:
            print("-", failure)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
