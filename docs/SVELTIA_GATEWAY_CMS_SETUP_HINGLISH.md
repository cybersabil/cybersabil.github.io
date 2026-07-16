# CyberSabil Gateway-only Sveltia CMS — Practical Setup

## Final structure

- Live site: `https://cybersabil.github.io/`
- Existing Pages CMS: remains unchanged
- New Gateway CMS: `https://cybersabil.github.io/admin/`
- Login: GitHub OAuth through the official Sveltia CMS Authenticator on Cloudflare Workers
- Content edited: `data/site-settings.json`, `data/gateway.json`, `data/gateway-appearance.json`

## What is already built

1. `admin/index.html` — branded Gateway CMS entry page.
2. `admin/config.yml` — only 3 Gateway editors.
3. Hidden field protection — non-Gateway keys in `site-settings.json` are preserved.
4. Decimal validation — darkness/opacity values use floating-point inputs and correct steps.
5. `admin/reset-center.html` — opens the safe GitHub reset workflow.
6. Protected approved defaults and an allowlisted reset engine.
7. Existing `.pages.yml`, website HTML/CSS/JS and current Pages CMS are not changed.

# One-time login setup

## Step 1 — Upload the add-on files

Copy the add-on ZIP contents into the repository root. Merge folders; do not put them inside an extra outer folder.

After upload, these paths must exist:

- `admin/index.html`
- `admin/config.yml`
- `.github/workflows/gateway-reset.yml`
- `.github/cms-defaults/gateway/reset-map.json`
- `tools/gateway-reset.js`

The admin page will show “OAuth setup pending” until the Worker URL is configured. This is intentional.

## Step 2 — Create a free Cloudflare account

Open Cloudflare Dashboard and sign in. No website DNS transfer is required. Cloudflare is used only for the small OAuth Worker.

## Step 3 — Deploy official Sveltia CMS Authenticator

Open the official GitHub repository `sveltia/sveltia-cms-auth` and use its “Deploy to Cloudflare Workers” button. After deployment, copy the Worker URL, for example:

`https://sveltia-cms-auth.YOUR-SUBDOMAIN.workers.dev`

## Step 4 — Create GitHub OAuth App

GitHub → profile picture → Settings → Developer settings → OAuth Apps → New OAuth App.

Use:

- Application name: `CyberSabil Gateway CMS`
- Homepage URL: `https://cybersabil.github.io/admin/`
- Authorization callback URL: `YOUR_WORKER_URL/callback`

Register the app, then generate a new client secret. Copy the Client ID and Client Secret.

## Step 5 — Add Worker variables

Cloudflare Dashboard → Workers & Pages → your Sveltia auth Worker → Settings → Variables and Secrets.

Add:

- `GITHUB_CLIENT_ID` = GitHub Client ID
- `GITHUB_CLIENT_SECRET` = GitHub Client Secret, save it as an encrypted secret
- `ALLOWED_DOMAINS` = `cybersabil.github.io`

Save and deploy the Worker again. Never put the Client Secret in GitHub files or `admin/config.yml`.

## Step 6 — Put Worker URL in CMS config

From the repository root, run PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\Configure_Sveltia_OAuth.ps1 -WorkerUrl "https://YOUR-WORKER.workers.dev"
```

Or manually edit `admin/config.yml`:

```yaml
backend:
  name: github
  repo: cybersabil/cybersabil.github.io
  branch: main
  base_url: https://YOUR-WORKER.workers.dev
```

Commit and push the changed `admin/config.yml`.

## Step 7 — Login test

1. Wait for GitHub Pages deployment to turn green.
2. Open `https://cybersabil.github.io/admin/`.
3. Click GitHub login.
4. Authorize the OAuth app.
5. The Gateway editor should open.

Only GitHub users with write access to `cybersabil/cybersabil.github.io` can save changes.

# Daily use

1. Open `/admin/`.
2. Choose one editor:
   - Gateway Basic Controls
   - Gateway Text, Cards & Basic Look
   - Gateway Advanced Design
3. Change a value.
4. Review the diff and Save/Publish.
5. Wait for the build action and hard-refresh the live site.

Do not edit the same Gateway JSON file simultaneously in Pages CMS and Sveltia CMS.

# Reset Center

Open `/admin/reset-center.html`, then open the GitHub reset workflow.

1. Click **Run workflow**.
2. Select one setting or Complete Gateway.
3. Type `RESET`.
4. Run the workflow.

The workflow restores only the allowlisted value, runs the existing site tests, rejects stale runs, commits the result and triggers deployment.

# Troubleshooting

- **OAuth setup pending:** `backend.base_url` still contains the placeholder.
- **redirect_uri_mismatch:** GitHub OAuth callback must exactly be `WORKER_URL/callback`.
- **Login succeeds but Save fails:** your GitHub account needs write permission.
- **Reset workflow cannot push:** Repository Settings → Actions → General → Workflow permissions → Read and write permissions.
- **Admin not visible after upload:** confirm `admin/index.html` is at repository root under `admin/`, then wait for Pages deployment.
