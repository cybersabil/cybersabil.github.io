(async () => {
  const root = document.getElementById('nc-root');
  const showSetup = (message) => {
    root.className = 'cs-setup-block';
    root.innerHTML = `<section class="cs-setup-card"><h1>OAuth setup pending</h1><p>${message}</p><ol class="cs-steps"><li>Deploy the official Sveltia CMS Authenticator on Cloudflare Workers.</li><li>Create a GitHub OAuth App with callback <code>YOUR_WORKER_URL/callback</code>.</li><li>Add GitHub Client ID, encrypted Client Secret and <code>ALLOWED_DOMAINS=cybersabil.github.io</code> to the Worker.</li><li>Run <code>Configure_Sveltia_OAuth.ps1</code> or replace <code>backend.base_url</code> in <code>admin/config.yml</code>.</li></ol><p>Detailed steps: <a href="../docs/SVELTIA_GATEWAY_CMS_SETUP_HINGLISH.md">open setup guide</a>.</p></section>`;
  };
  try {
    const configText = await fetch('./config.yml', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(`config.yml HTTP ${r.status}`); return r.text(); });
    if (configText.includes('REPLACE-WITH-YOUR-WORKER')) { showSetup('Admin files are installed correctly. Complete the one-time GitHub OAuth setup before login.'); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@sveltia/cms@0.171.0/dist/sveltia-cms.js';
    script.async = true;
    script.onerror = () => showSetup('Sveltia CMS could not load from the CDN. Check internet access and reload.');
    document.body.appendChild(script);
  } catch (error) { showSetup(`CMS configuration could not load: ${String(error.message || error)}`); }
})();