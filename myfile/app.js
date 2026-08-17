(() => {
  'use strict';

  const API = 'https://cybersabil-myfile-gateway.multi4u121.workers.dev';
  const FRONT_PATH = '/myfile/';
  const { startRegistration, startAuthentication } = SimpleWebAuthnBrowser;

  const q = (id) => document.getElementById(id);
  const authCard = q('authCard');
  const authText = q('authText');
  const authMsg = q('authMsg');
  const setupBox = q('setupBox');
  const setupCode = q('setupCode');
  const setupBtn = q('setupBtn');
  const loginBtn = q('loginBtn');
  const filesArea = q('filesArea');
  const tools = q('tools');
  const grid = q('grid');
  const empty = q('empty');
  const summary = q('summary');
  const search = q('search');
  const crumbs = q('crumbs');
  const previewModal = q('previewModal');
  const previewFrame = q('previewFrame');
  const previewTitle = q('previewTitle');
  const downloadFrame = q('downloadFrame');

  let currentPath = '';
  let currentItems = [];
  let listMode = localStorage.getItem('myfile_view') === 'list';
  let token = localStorage.getItem('myfile_session') || '';

  function setMsg(msg) { authMsg.textContent = msg || ''; }

  async function api(path, opts = {}, auth = true) {
    const headers = new Headers(opts.headers || {});
    if (opts.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (auth && token) headers.set('Authorization', 'Bearer ' + token);
    const r = await fetch(API + path, { ...opts, headers, cache: 'no-store' });
    let data = {};
    try { data = await r.json(); } catch {}
    if (!r.ok) {
      const err = new Error(data.error || ('HTTP_' + r.status));
      err.status = r.status;
      throw err;
    }
    return data;
  }

  function saveSession(t) {
    token = t || '';
    if (token) localStorage.setItem('myfile_session', token);
    else localStorage.removeItem('myfile_session');
  }

  function showAuth(initialized) {
    authCard.classList.remove('hidden');
    filesArea.classList.add('hidden');
    tools.classList.add('hidden');
    setupBox.classList.toggle('hidden', initialized);
    loginBtn.classList.toggle('hidden', !initialized);
    authText.textContent = initialized
      ? 'Unlock this portal with your registered passkey.'
      : 'First-time setup: enter the one-time code shown by the VM setup script.';
  }

  function showFiles() {
    authCard.classList.add('hidden');
    filesArea.classList.remove('hidden');
    tools.classList.remove('hidden');
  }

  async function status() {
    try {
      return await api('/auth/status', { method: 'GET' }, false);
    } catch (e) {
      setMsg('Backend unavailable: ' + e.message);
      throw e;
    }
  }

  setupBtn.addEventListener('click', async () => {
    setMsg('');
    const code = setupCode.value.trim();
    if (!code) return setMsg('Enter the one-time setup code.');
    setupBtn.disabled = true;
    try {
      const o = await api('/auth/register/options', {
        method: 'POST',
        headers: { 'X-Setup-Code': code },
        body: '{}',
      }, false);

      const response = await startRegistration({ optionsJSON: o.options });

      const v = await api('/auth/register/verify', {
        method: 'POST',
        headers: { 'X-Setup-Code': code },
        body: JSON.stringify({ challengeId: o.challengeId, response }),
      }, false);

      if (!v.verified || !v.sessionToken) throw new Error('REGISTRATION_FAILED');
      saveSession(v.sessionToken);
      setupCode.value = '';
      showFiles();
      await load('');
    } catch (e) {
      setMsg('Passkey setup failed: ' + e.message);
    } finally {
      setupBtn.disabled = false;
    }
  });

  loginBtn.addEventListener('click', async () => {
    setMsg('');
    loginBtn.disabled = true;
    try {
      const o = await api('/auth/login/options', { method: 'POST', body: '{}' }, false);
      const response = await startAuthentication({ optionsJSON: o.options });
      const v = await api('/auth/login/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId: o.challengeId, response }),
      }, false);
      if (!v.verified || !v.sessionToken) throw new Error('LOGIN_FAILED');
      saveSession(v.sessionToken);
      showFiles();
      await load(currentPath);
    } catch (e) {
      setMsg('Login failed: ' + e.message);
    } finally {
      loginBtn.disabled = false;
    }
  });

  q('logoutBtn').addEventListener('click', async () => {
    try { await api('/api/logout', { method: 'POST', body: '{}' }); } catch {}
    saveSession('');
    previewFrame.src = 'about:blank';
    previewModal.classList.add('hidden');
    const st = await status();
    showAuth(Boolean(st.initialized));
  });

  q('refreshBtn').addEventListener('click', () => load(currentPath));
  q('backBtn').addEventListener('click', () => {
    const a = currentPath.split('/').filter(Boolean);
    a.pop();
    load(a.join('/'));
  });

  q('viewBtn').addEventListener('click', () => {
    listMode = !listMode;
    localStorage.setItem('myfile_view', listMode ? 'list' : 'grid');
    render();
  });

  search.addEventListener('input', render);

  q('closePreview').addEventListener('click', () => {
    previewFrame.src = 'about:blank';
    previewModal.classList.add('hidden');
  });

  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
      previewFrame.src = 'about:blank';
      previewModal.classList.add('hidden');
    }
  });

  function joinPath(base, name) {
    const n = String(name).replace(/\/$/, '');
    return [base, n].filter(Boolean).join('/');
  }

  function formatSize(n) {
    n = Number(n || 0);
    if (n < 1024) return n + ' B';
    const u = ['KB','MB','GB','TB'];
    let i = -1;
    do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
    return n.toFixed(n >= 10 ? 1 : 2) + ' ' + u[i];
  }

  function renderCrumbs() {
    crumbs.textContent = '';
    const root = document.createElement('button');
    root.type = 'button';
    root.textContent = 'Public Downloads';
    root.addEventListener('click', () => load(''));
    crumbs.appendChild(root);

    let acc = '';
    for (const seg of currentPath.split('/').filter(Boolean)) {
      crumbs.appendChild(document.createTextNode(' / '));
      acc = joinPath(acc, seg);
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = seg;
      const p = acc;
      b.addEventListener('click', () => load(p));
      crumbs.appendChild(b);
    }
  }

  async function ticket(kind, path) {
    return await api('/api/ticket', {
      method: 'POST',
      body: JSON.stringify({ kind, path }),
    });
  }

  async function openFile(path, name) {
    try {
      const t = await ticket('open', path);
      previewTitle.textContent = name;
      previewFrame.src = API + '/stream?t=' + encodeURIComponent(t.ticket);
      previewModal.classList.remove('hidden');
    } catch (e) {
      alert('Open failed: ' + e.message);
    }
  }

  async function download(kind, path) {
    try {
      const t = await ticket(kind, path);
      downloadFrame.src = API + '/stream?t=' + encodeURIComponent(t.ticket);
    } catch (e) {
      alert('Download failed: ' + e.message);
    }
  }

  function addButton(container, label, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', fn);
    container.appendChild(b);
  }

  function render() {
    grid.textContent = '';
    grid.classList.toggle('list', listMode);
    q('viewBtn').textContent = listMode ? 'Grid' : 'List';

    const term = search.value.trim().toLowerCase();
    const items = currentItems.filter(x => !term || x.name.toLowerCase().includes(term));

    summary.textContent = currentItems.length + ' item' + (currentItems.length === 1 ? '' : 's');
    empty.classList.toggle('hidden', items.length !== 0);

    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'card';

      const left = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = (item.isDir ? '📁 ' : '📄 ') + item.name.replace(/\/$/, '');
      left.appendChild(name);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = item.isDir ? 'Folder' : formatSize(item.size);
      left.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'actions';

      const path = joinPath(currentPath, item.name);

      if (item.isDir) {
        addButton(actions, 'Open', () => load(path));
        addButton(actions, 'ZIP', () => download('folder', path));
      } else {
        addButton(actions, 'Open', () => openFile(path, item.name));
        addButton(actions, '↓', () => download('file', path));
      }

      card.appendChild(left);
      card.appendChild(actions);
      grid.appendChild(card);
    }

    renderCrumbs();
    q('backBtn').disabled = !currentPath;
  }

  async function load(path) {
    try {
      const d = await api('/api/list?path=' + encodeURIComponent(path || ''), { method: 'GET' });
      currentPath = d.path || '';
      currentItems = Array.isArray(d.items) ? d.items : [];
      render();
      showFiles();
    } catch (e) {
      if (e.status === 401) {
        saveSession('');
        const st = await status();
        showAuth(Boolean(st.initialized));
      } else {
        alert('Folder load failed: ' + e.message);
      }
    }
  }

  async function boot() {
    try {
      const st = await status();
      if (token) {
        try {
          await api('/api/me', { method: 'GET' });
          showFiles();
          await load('');
          return;
        } catch {
          saveSession('');
        }
      }
      showAuth(Boolean(st.initialized));
    } catch {
      showAuth(true);
    }
  }

  boot();
})();
