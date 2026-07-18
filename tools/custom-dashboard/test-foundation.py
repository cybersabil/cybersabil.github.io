#!/usr/bin/env python3
"""Deep static audit for CyberSabil Custom Dashboard Phase 1."""

from pathlib import Path
import json
import re
import sys
import yaml

ROOT = Path(__file__).resolve().parents[2]

def require(condition, message):
    if not condition:
        raise AssertionError(message)

def main():
    pages = yaml.safe_load((ROOT / ".pages.yml").read_text(encoding="utf-8"))
    schema = json.loads((ROOT / "admin-v2/schema.generated.json").read_text(encoding="utf-8"))
    registry = json.loads((ROOT / "cms-schema/field-registry.json").read_text(encoding="utf-8"))
    categories = json.loads((ROOT / "cms-schema/categories.json").read_text(encoding="utf-8"))

    # Pass 1: schema parity
    source_fields = []
    source_editors = []
    for group in pages["content"]:
        for item in group.get("items", []):
            candidates = [item] if item.get("type") == "file" else item.get("items", [])
            for editor in candidates:
                if editor.get("type") == "file":
                    source_editors.append(editor)
                    source_fields.extend((editor["name"], f["name"]) for f in editor.get("fields", []))

    require(len(source_editors) == 22, f"Expected 22 editors, got {len(source_editors)}")
    require(len(source_fields) == 428, f"Expected 428 fields, got {len(source_fields)}")
    require(len(registry) == 428, f"Registry has {len(registry)} fields")
    require(len(schema["fields"]) == 428, "Dashboard schema field count mismatch")
    require(len({f["id"] for f in registry}) == 428, "Duplicate field IDs")
    require({f"{e}.{f}" for e, f in source_fields} == {f["id"] for f in registry}, "Source/registry field mismatch")
    require(sum(c["fieldCount"] for c in categories) == 428, "Category total mismatch")

    expected_counts = {
        "site-gateway": 178,
        "website": 79,
        "portfolio": 84,
        "seo": 13,
        "navigation": 73,
        "system": 1,
    }
    actual_counts = {c["id"]: c["fieldCount"] for c in categories}
    require(actual_counts == expected_counts, f"Category counts changed: {actual_counts}")
    print("AUDIT PASS 1 — Schema and category parity: PASS")

    # Pass 2: read-only/collision safety
    js = (ROOT / "admin-v2/app.js").read_text(encoding="utf-8")
    html = (ROOT / "admin-v2/index.html").read_text(encoding="utf-8")
    forbidden = [
        r"\bPUT\b", r"\bPOST\b", r"\bPATCH\b", r"\bDELETE\b",
        r"api\.github\.com", r"localStorage", r"sessionStorage",
        r"GITHUB_CLIENT_SECRET", r"Authorization\s*:",
    ]
    for pattern in forbidden:
        require(not re.search(pattern, js, re.I), f"Write/auth pattern found: {pattern}")
    require("Read-only" in html, "Read-only status missing")
    require('fetch(`../${path}`' in js, "Current JSON read path missing")
    require(".pages.yml" not in [str(p.relative_to(ROOT)) for p in (ROOT / "admin-v2").rglob("*")], "Unexpected existing-file copy")
    print("AUDIT PASS 2 — Read-only and collision safety: PASS")

    # Pass 3: responsive/accessibility static requirements
    css = (ROOT / "admin-v2/app.css").read_text(encoding="utf-8")
    for token in ["@media (max-width: 1100px)", "@media (max-width: 860px)", "@media (max-width: 620px)", "prefers-reduced-motion"]:
        require(token in css, f"Responsive token missing: {token}")
    for token in ['aria-label=', 'aria-live=', 'Skip to dashboard content', 'type="search"']:
        require(token in html, f"Accessibility token missing: {token}")
    require("min-width: 320px" in css, "320px minimum support declaration missing")
    print("AUDIT PASS 3 — Responsive/accessibility static audit: PASS")

    print("PHASE 1 FOUNDATION STATIC AUDIT: PASS")

if __name__ == "__main__":
    main()
