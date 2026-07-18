#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
ADMIN = ROOT / "admin1"
WORKER = ROOT / "worker-admin1"
EXPECTED_BRANCH = "feature/chatgpt-custom-dashboard-v2"

def require(value, message):
    if not value:
        raise AssertionError(message)

def main():
    schema = json.loads(
        (ADMIN / "schema.generated.json").read_text(encoding="utf-8-sig")
    )
    fields = schema["fields"]
    gateway = [
        field for field in fields
        if field["category"] == "site-gateway"
    ]
    editable = [
        field for field in gateway
        if not field["hidden"] and not field["readonly"]
    ]

    require(len(fields) == 428, f"Expected 428 fields, got {len(fields)}")
    require(len(gateway) == 178, f"Expected 178 Gateway fields, got {len(gateway)}")
    require(len(editable) == 175, f"Expected 175 editable Gateway fields, got {len(editable)}")
    require(
        {field["jsonPath"] for field in gateway} == {
            "data/site-settings.json",
            "data/gateway.json",
            "data/gateway-appearance.json",
        },
        "Gateway path ownership changed",
    )
    print("AUDIT PASS 1 - 428 schema / 178 mapped / 175 editable: PASS")

    app = (ADMIN / "app.js").read_text(encoding="utf-8-sig")
    worker = (WORKER / "src/index.js").read_text(encoding="utf-8-sig")
    wrangler = (WORKER / "wrangler.toml").read_text(encoding="utf-8-sig")
    runtime = (ADMIN / "runtime-config.js").read_text(encoding="utf-8-sig")

    for path in [
        "data/site-settings.json",
        "data/gateway.json",
        "data/gateway-appearance.json",
    ]:
        require(path in app and path in worker, f"Missing editable path: {path}")

    require('api("/api/files"' in app, "Atomic dashboard save endpoint missing")
    require("atomicCommit" in worker, "Atomic Git commit function missing")
    require("/git/refs/heads/" in worker, "Atomic ref update missing")
    require("force: false" in worker, "Non-force ref protection missing")
    require("file.sha" in worker, "Original SHA requirement missing")
    require("Path not allowed" in worker, "Worker path allowlist missing")
    require("GitHub file or branch changed" in worker, "Conflict response missing")
    require('{ name: "HMAC", hash: "SHA-256" }' in worker, "Correct HMAC import missing")
    require("GITHUB_CLIENT_SECRET" in worker, "OAuth secret reference missing")
    require("SESSION_SECRET" in worker, "Session secret reference missing")
    require("localStorage" not in app, "Persistent localStorage token is forbidden")
    require("sessionStorage" in app, "Session-scoped token storage missing")
    require(
        f'GITHUB_BRANCH = "{EXPECTED_BRANCH}"' in wrangler,
        "Worker is not targeting the feature branch",
    )
    require(
        f'branch: "{EXPECTED_BRANCH}"' in runtime,
        "Dashboard is not displaying the feature branch",
    )
    print("AUDIT PASS 2 - OAuth, atomic commit and feature-branch protection: PASS")

    html = (ADMIN / "index.html").read_text(encoding="utf-8-sig")
    require("Draft" in html and "Review" in html and "GitHub" in html, "Review workflow label missing")
    require("review-dialog" in html and "confirm-save" in html, "Review/save UI missing")
    require("175 editable" in html, "Accurate editable count missing")
    require("Pages CMS" in html and "Sveltia" in html, "Parallel CMS notice missing")
    require((WORKER / ".gitignore").exists(), "Worker .gitignore missing")
    print("AUDIT PASS 3 - UI accuracy and dependency isolation: PASS")
    print("ADMIN1 GATEWAY AUTH PHASE 2 RESUME AUDIT: PASS")

if __name__ == "__main__":
    main()
