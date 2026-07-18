#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import json
import re
import yaml

ROOT = Path(__file__).resolve().parents[2]

WEBSITE_PATHS = {
    "data/site.json",
    "data/sections.json",
    "data/design.json",
    "data/tools.json",
    "data/downloads.json",
    "data/projects.json",
    "data/skills.json",
    "data/docs.json",
    "data/faq.json",
}

GATEWAY_PATHS = {
    "data/site-settings.json",
    "data/gateway.json",
    "data/gateway-appearance.json",
}

LIST_PATHS = {
    "data/tools.json",
    "data/downloads.json",
    "data/projects.json",
    "data/skills.json",
    "data/docs.json",
    "data/faq.json",
}

EXPECTED_PATHS = WEBSITE_PATHS | GATEWAY_PATHS


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def flatten_editors(content: list[dict]) -> list[dict]:
    editors: list[dict] = []

    for group in content:
        for item in group.get("items", []):
            candidates = (
                [item]
                if item.get("type") == "file"
                else item.get("items", [])
            )

            editors.extend(
                editor
                for editor in candidates
                if editor.get("type") == "file"
            )

    return editors


def main() -> None:
    pages = yaml.safe_load(
        (ROOT / ".pages.yml").read_text(encoding="utf-8-sig")
    )
    schema = json.loads(
        (ROOT / "admin1/schema.generated.json").read_text(
            encoding="utf-8-sig"
        )
    )
    runtime = (ROOT / "admin1/runtime-config.js").read_text(
        encoding="utf-8-sig"
    )
    app = (ROOT / "admin1/app.js").read_text(
        encoding="utf-8-sig"
    )
    index = (ROOT / "admin1/index.html").read_text(
        encoding="utf-8-sig"
    )
    worker = (ROOT / "worker-admin1/src/index.js").read_text(
        encoding="utf-8-sig"
    )

    editors = {
        editor["name"]: editor
        for editor in flatten_editors(pages["content"])
    }
    website_editors = [
        editor
        for editor in editors.values()
        if editor["path"] in WEBSITE_PATHS
    ]

    page_fields = {
        f'{editor["name"]}.{field["name"]}'
        for editor in website_editors
        for field in editor.get("fields", [])
    }
    schema_fields = {
        field["id"]
        for field in schema["fields"]
        if field["category"] == "website"
    }

    require(len(website_editors) == 9, "Expected 9 Website editors.")
    require(len(page_fields) == 79, "Expected 79 Pages CMS Website fields.")
    require(len(schema_fields) == 79, "Expected 79 Admin1 Website fields.")
    require(page_fields == schema_fields, "Pages CMS/Admin1 Website schema mismatch.")

    list_fields = [
        field
        for field in schema["fields"]
        if field["jsonPath"] in LIST_PATHS
    ]
    visible_list_fields = [
        field for field in list_fields if not field["hidden"]
    ]
    hidden_ids = [
        field
        for field in list_fields
        if field["name"] == "_cmsResetId" and field["hidden"]
    ]

    require(len(visible_list_fields) == 34, "Expected 34 visible list fields.")
    require(len(hidden_ids) == 6, "Expected 6 protected list identity fields.")

    print("AUDIT PASS 1 RECHECK - Pages CMS Website parity 79/79: PASS")

    runtime_categories = set(
        re.findall(
            r'"(site-gateway|website|portfolio|seo|navigation|system)"',
            runtime,
        )
    )
    require(
        runtime_categories == {"site-gateway", "website"},
        f"Wrong editable category set: {runtime_categories}",
    )
    require("editableCategories" in runtime, "Multi-category config missing.")
    require("data-model.js" in index, "Shared data model script missing.")

    app_paths = set(
        re.findall(r'"(data/[a-z-]+\.json)"', app)
    )
    worker_policy_block = worker.split(
        "const EDITABLE_PATHS", 1
    )[0]
    worker_paths = set(
        re.findall(r'"(data/[a-z-]+\.json)"\s*:', worker_policy_block)
    )

    require(
        app_paths >= EXPECTED_PATHS,
        f"Admin1 allowlist missing paths: {EXPECTED_PATHS - app_paths}",
    )
    require(
        worker_paths == EXPECTED_PATHS,
        f"Worker policy mismatch: {worker_paths ^ EXPECTED_PATHS}",
    )
    require("data/" + "*" not in app, "Wildcard path found in Admin1.")
    require("data/" + "*" not in worker, "Wildcard path found in Worker.")

    print("AUDIT PASS 2A - Exact 12-file audited allowlists: PASS")

    required_app_tokens = [
        "data-list-action=\"add\"",
        "data-list-action=\"delete\"",
        "data-list-action=\"up\"",
        "data-list-action=\"down\"",
        "normalizeListIdentities",
        "model.validateList",
        "model.listDiff",
        'api("/api/files"',
        "beforeunload",
        "Pages CMS",
    ]

    for token in required_app_tokens:
        require(token in app, f"Admin1 feature missing: {token}")

    required_worker_tokens = [
        "MAX_FILES_PER_COMMIT = 12",
        "validateListContent",
        "UUID_PATTERN",
        "duplicate _cmsResetId",
        "atomicCommit",
        "force: false",
        "Original GitHub SHA is required",
        "GitHub file or branch changed",
        "MAX_TOTAL_TEXT_LENGTH",
    ]

    for token in required_worker_tokens:
        require(token in worker, f"Worker protection missing: {token}")

    print("AUDIT PASS 2B - List manager and collision controls: PASS")

    reset_map = json.loads(
        (ROOT / ".github/cms-defaults/reset-map.json").read_text(
            encoding="utf-8-sig"
        )
    )
    reset_files = reset_map["files"]

    for editor in website_editors:
        name = editor["name"]
        path = editor["path"]
        require(path in reset_files, f"Reset-map file missing: {path}")
        require(
            reset_files[path].get("editor") == name,
            f"Reset-map editor mismatch for {path}",
        )

        current = json.loads(
            (ROOT / path).read_text(encoding="utf-8-sig")
        )
        default = json.loads(
            (
                ROOT
                / ".github/cms-defaults"
                / path
            ).read_text(encoding="utf-8-sig")
        )

        if editor.get("list"):
            for label, content in (
                ("current", current),
                ("default", default),
            ):
                ids = [
                    item.get("_cmsResetId")
                    for item in content
                ]
                require(
                    all(isinstance(item_id, str) for item_id in ids),
                    f"{name} {label}: missing stable ID.",
                )
                require(
                    len(ids) == len(set(ids)),
                    f"{name} {label}: duplicate stable ID.",
                )

    print("AUDIT PASS 2C - Reset identities/defaults remain compatible: PASS")
    print("WEBSITE PHASE 2 STATIC COLLISION AUDIT: PASS")


if __name__ == "__main__":
    main()
