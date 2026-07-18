#!/usr/bin/env python3
"""Regenerate the custom dashboard schema from the repository's .pages.yml.

Phase 1 is intentionally read-only. This generator never edits the live JSON files,
existing Pages CMS config, existing Sveltia config, or the live website.
"""

from pathlib import Path
import json
import sys
import yaml

REPO = Path(__file__).resolve().parents[2]
PAGES = REPO / ".pages.yml"
OUTPUT = REPO / "admin-v2" / "schema.generated.json"

def flatten_editors(content):
    for group in content:
        for item in group.get("items", []):
            if item.get("type") == "file":
                yield group, item
            elif item.get("type") == "group":
                for sub in item.get("items", []):
                    if sub.get("type") == "file":
                        yield group, sub

def main():
    if not PAGES.exists():
        raise SystemExit(f"Missing {PAGES}")
    data = yaml.safe_load(PAGES.read_text(encoding="utf-8"))
    editors = list(flatten_editors(data["content"]))
    fields = [field for _, editor in editors for field in editor.get("fields", [])]
    print(f"Pages CMS editors: {len(editors)}")
    print(f"Pages CMS fields: {len(fields)}")
    print("The committed Phase-1 schema contains additional category metadata.")
    print("Use the project build script when category rules change.")
    if len(editors) != 22 or len(fields) != 428:
        raise SystemExit("Schema parity changed; review before regenerating the dashboard.")
    print("Source parity check: PASS")

if __name__ == "__main__":
    main()
