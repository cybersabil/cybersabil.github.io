#!/usr/bin/env python3
from pathlib import Path
import json, copy, re
from urllib.parse import urlparse, parse_qs, unquote
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
BASE='https://audit.invalid'; WORKER='https://cybersabil-admin1-api.multi4u121.workers.dev'
manifest=json.loads((ROOT/'admin1/full-audit-manifest.json').read_text(encoding='utf-8-sig'))
schema=json.loads((ROOT/'admin1/schema.generated.json').read_text(encoding='utf-8-sig'))
base_files={p:json.loads((ROOT/p).read_text(encoding='utf-8-sig')) for p in manifest['editablePaths']}

def req(v,m):
    if not v: raise AssertionError(m)

def make_backend():
    files=copy.deepcopy(base_files); shas={p:f'sha-{i}' for i,p in enumerate(manifest['editablePaths'])}; state={'commit':1,'last_payload':None,'conflict_next':False}
    def cb(url,init):
        parsed=urlparse(url); body=(init or {}).get('body')
        if parsed.netloc=='audit.invalid':
            rel=unquote(parsed.path).lstrip('/')
            if rel=='admin1/schema.generated.json': return {'status':200,'headers':{'content-type':'application/json'},'body':json.dumps(schema)}
            if rel.startswith('data/'):
                if rel in files: return {'status':200,'headers':{'content-type':'application/json'},'body':json.dumps(files[rel])}
                f=ROOT/rel
                return {'status':200 if f.exists() else 404,'headers':{'content-type':'application/json'},'body':f.read_text(encoding='utf-8-sig') if f.exists() else '{}'}
        if url.startswith(WORKER+'/api/session'):
            return {'status':200,'headers':{'content-type':'application/json'},'body':json.dumps({'user':{'login':'cybersabil'},'repository':'cybersabil/cybersabil.github.io','branch':'feature/chatgpt-custom-dashboard-v2','editablePaths':21})}
        if url.startswith(WORKER+'/api/file?'):
            p=parse_qs(parsed.query)['path'][0]; return {'status':200,'headers':{'content-type':'application/json'},'body':json.dumps({'path':p,'sha':shas[p],'content':files[p]})}
        if url.startswith(WORKER+'/api/files'):
            payload=json.loads(body or '{}'); state['last_payload']=copy.deepcopy(payload)
            if state['conflict_next']:
                state['conflict_next']=False; return {'status':409,'headers':{'content-type':'application/json'},'body':'{"error":"GitHub file or branch changed since it was loaded.","conflict":true}'}
            result=[]
            for i,f in enumerate(payload['files']):
                req(f['path'] in files,'unsafe path'); req(f['sha']==shas[f['path']],'wrong SHA')
                files[f['path']]=copy.deepcopy(f['content']); shas[f['path']]=f'new-{state["commit"]}-{i}'; result.append({'path':f['path'],'sha':shas[f['path']]})
            state['commit']+=1
            return {'status':200,'headers':{'content-type':'application/json'},'body':json.dumps({'commit':'abcdef12','files':result})}
        return {'status':404,'headers':{'content-type':'application/json'},'body':'{}'}
    return state,cb

FETCH_SHIM="""history.replaceState=()=>{}; window.fetch=async(input,init={})=>{const url=new URL(String(input),document.baseURI).toString();const r=await window.__audit_fetch(url,{method:init.method||'GET',body:init.body||null});return new Response(r.body,{status:r.status,headers:r.headers});};"""

def admin_html():
    h=(ROOT/'admin1/index.html').read_text(encoding='utf-8-sig'); css=(ROOT/'admin1/app.css').read_text(encoding='utf-8-sig'); rt=(ROOT/'admin1/runtime-config.js').read_text(encoding='utf-8-sig'); dm=(ROOT/'admin1/data-model.js').read_text(encoding='utf-8-sig'); app=(ROOT/'admin1/app.js').read_text(encoding='utf-8-sig')
    app=app.replace('session:\n      sessionStorage.getItem(\n        "cybersabil_admin1_session",\n      ) || "",','session: "audit-session",')
    return h.replace('<head>','<head><base href="https://audit.invalid/admin1/">',1).replace('<link rel="stylesheet" href="./app.css">',f'<style>{css}</style>').replace('<script src="./runtime-config.js"></script>',f'<script>{FETCH_SHIM}</script><script>{rt}</script>').replace('<script src="./data-model.js"></script>',f'<script>{dm}</script>').replace('<script src="./app.js" defer></script>',f'<script>{app}</script>')

def public_html():
    h=(ROOT/'index.html').read_text(encoding='utf-8-sig'); css=(ROOT/'assets/css/style.css').read_text(encoding='utf-8-sig')
    h=h.replace('<head>','<head><base href="https://audit.invalid/">',1)
    h=re.sub(r'<link[^>]+href="assets/css/style\.css[^"]*"[^>]*>',f'<style>{css}</style>',h,count=1)
    h=re.sub(r'<script[^>]+src="assets/js/main\.js[^"]*"[^>]*></script>','',h,count=1)
    return h

def setup_page(ctx,backend):
    p=ctx.new_page(); p.set_default_timeout(8000); p.expose_function('__audit_fetch',backend); return p

def load_admin(p):
    p.set_content(admin_html(),wait_until='domcontentloaded'); p.wait_for_selector('text=Signed in as cybersabil'); p.wait_for_selector('.category-card')

def cat(p,c):
    p.evaluate('(c)=>{location.hash=`#/category/${c}`;window.dispatchEvent(new HashChangeEvent("hashchange"));}',c); p.wait_for_selector('#field-browser:not([hidden])'); p.wait_for_timeout(50)

def change(loc):
    loc.evaluate("""e => {
      if (e.tagName === 'SELECT') {
        const option = [...e.options].find(o => o.value !== e.value);
        if (option) e.value = option.value;
      } else if (e.type === 'number') {
        const current = Number(e.value);
        const step = e.step && e.step !== 'any' ? Number(e.step) : 1;
        let next = current + step;
        if (e.max !== '' && next > Number(e.max)) next = e.min !== '' ? Number(e.min) : current - step;
        e.value = String(next);
      } else {
        e.value = e.value + ' AUDIT';
      }
      e.dispatchEvent(new Event('input',{bubbles:true}));
      e.dispatchEvent(new Event('change',{bubbles:true}));
    }""")

def no_overflow(p,label):
    d=p.evaluate('({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bw:document.body.scrollWidth})'); req(d['sw']<=d['cw']+2 and d['bw']<=d['cw']+2,f'{label} overflow {d}')

with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    state,backend=make_backend(); ctx=b.new_context(viewport={'width':1440,'height':1000}); p=setup_page(ctx,backend); load_admin(p)
    req('427' in p.locator('.metric-card').nth(1).inner_text(),'427 metric missing')
    for c in manifest['editableCategories']: cat(p,c); req('write-enabled' in p.locator('#load-status').inner_text(),c+' not editable')
    cat(p,'system'); req('read-only' in p.locator('#load-status').inner_text(),'system not locked')
    targets=[('site-gateway','data/gateway.json'),('website','data/site.json'),('portfolio','data/profile.json'),('seo','data/seo.json'),('navigation','data/navigation-style.json')]
    for c,path in targets: cat(p,c); loc=p.locator(f'[data-input-scope="object"][data-path="{path}"]').first; req(loc.count()==1,path+' input missing'); change(loc)
    p.locator('#review-changes').click(); p.wait_for_selector('#review-dialog[open]'); txt=p.locator('#review-body').inner_text(); [req(path in txt,path+' review missing') for _,path in targets]; p.locator('#confirm-save').click(); p.wait_for_function("!document.querySelector('#review-dialog').open"); req(len(state['last_payload']['files'])==5,'not 5 files')
    # one Website and one Portfolio list UI smoke; all 10 are model-tested separately
    for c,path in [('website','data/tools.json'),('portfolio','data/portfolio-projects.json')]:
        cat(p,c); add=p.locator(f'button[data-list-action="add"][data-path="{path}"]'); before=p.locator(f'button[data-list-action="delete"][data-path="{path}"]').count(); add.click(); after=p.locator(f'button[data-list-action="delete"][data-path="{path}"]').count(); req(after==before+1,path+' add fail'); iid=p.locator(f'button[data-list-action="delete"][data-path="{path}"]').nth(after-1).get_attribute('data-item-id'); req(iid and len(iid)==36,path+' uuid fail')
    p.once('dialog',lambda d:d.accept()); p.locator('#discard-draft').click(); req(p.locator('#dirty-title').inner_text()=='No pending changes','discard fail')
    cat(p,'seo'); change(p.locator('[data-input-scope="object"][data-path="data/seo.json"]').first); p.locator('#review-changes').click(); state['conflict_next']=True; p.locator('#confirm-save').click(); p.wait_for_timeout(200); req(p.locator('.toast.error').count()>0,'conflict toast missing'); req(p.locator('#dirty-title').inner_text()!='No pending changes','conflict cleared draft')
    print('AUDIT PASS 2I - browser category/edit/review/atomic-save smoke: PASS')
    print('AUDIT PASS 2J - Website and Portfolio list-manager UI smoke: PASS')
    print('AUDIT PASS 2K - conflict keeps unsaved draft: PASS')
    ctx.close()
    for w,h in [(320,800),(390,844),(768,1024),(1024,768),(1440,1000)]:
        _,be=make_backend(); c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce'); q=setup_page(c,be); load_admin(q); no_overflow(q,f'admin {w}'); cat(q,'navigation'); no_overflow(q,f'nav {w}');
        if w<=620: req(q.locator('#mobile-menu').is_visible(),'mobile menu hidden'); q.locator('#mobile-menu').click(); req(q.locator('#sidebar').evaluate('(e)=>e.classList.contains("is-open")'),'menu open fail')
        q.close(); pub=setup_page(c,be); pub.set_content(public_html(),wait_until='domcontentloaded'); pub.wait_for_timeout(100); no_overflow(pub,f'public {w}'); c.close()
    print('AUDIT PASS 3A - five responsive widths no horizontal overflow: PASS')
    print('AUDIT PASS 3B - mobile menu and reduced-motion render: PASS')
    print('AUDIT PASS 3C - public site runtime smoke: PASS')
    b.close()
