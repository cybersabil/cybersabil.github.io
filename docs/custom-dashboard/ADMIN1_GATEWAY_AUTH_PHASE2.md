# CyberSabil Admin1 — Gateway Auth Phase 2

## URL plan

- Existing Sveltia remains at `/admin/`
- New custom dashboard deploys at `/admin1/`
- Phase 2 makes only Site & Gateway editable: 178 fields
- Remaining 250 fields stay read-only until their category audits pass

## Security model

- Separate GitHub OAuth App; do not alter the existing Sveltia OAuth App
- Separate Cloudflare Worker: `cybersabil-admin1-api`
- GitHub Client Secret and session secret stored only as Worker secrets
- Browser receives an encrypted, short-lived session token in sessionStorage
- Worker restricts user, repository, branch and three editable JSON paths
- Save requires the original GitHub SHA
- A Pages CMS/Sveltia change causes a 409 conflict instead of silent overwrite

## Save model

Draft → Review exact fields → During local testing, saves go only to the dedicated feature branch. Promotion switches the Worker to `main`, then production saves trigger the GitHub Pages build.

## Important

GitHub OAuth Apps support one callback URL. A second OAuth App is required so the existing `/admin/` Sveltia callback remains unchanged.


## V2 corrections

- Test Worker writes only to the feature branch.
- 178 mapped fields include 175 editable and 3 protected fields.
- Multi-file saves use one atomic Git commit/ref update.
- Promotion switches the Worker to `main` and redeploys.
