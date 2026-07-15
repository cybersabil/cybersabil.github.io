import json,re,yaml
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]; BASE='https://cybersabil.test/'
HTML=(ROOT/'index.html').read_text().replace('<head>',f'<head><base href="{BASE}">',1)
CFG=yaml.safe_load((ROOT/'.pages.yml').read_text())

def cms_file_entries(items):
 for entry in items:
  if entry.get('type') == 'group':
   yield from cms_file_entries(entry.get('items', []))
  elif entry.get('type') == 'file' and str(entry.get('path','')).startswith('data/'):
   yield entry

PORT={'data/portfolio-settings.json','data/profile.json','data/portfolio-skills.json','data/portfolio-projects.json','data/portfolio-timeline.json','data/services.json','data/contact.json'}
GATE={'data/gateway.json','data/visual-baseline.json','data/gateway-appearance.json','data/navigation-style.json'}
def mode(path): return 'portfolio' if path in PORT else 'gateway' if path in GATE else 'website'
def load(path): return json.loads((ROOT/path).read_text())
def alt(f,cur,tag):
 t=f.get('type'); n=f['name']
 if t=='select':
  raw=((f.get('options') or {}).get('values') or [])
  vals=[v.get('name') if isinstance(v,dict) else v for v in raw]
  return next((v for v in vals if v!=cur),cur)
 if t=='number':
  try:return cur+1
  except:return 1
 if t=='image': return f'https://example.com/{tag}.png'
 if t in ('string','text'):
  if 'color' in n.lower(): return '#123456'
  if any(x in n.lower() for x in ['link','url','canonical']): return f'https://example.com/{tag}'
  return f'CMSAUDIT_{tag}'
 return cur

def mutate(entry):
 p=entry['path']; d=load(p); src=d[0] if isinstance(d,list) and d else d
 sent=[]
 for f in entry.get('fields',[]):
  n=f['name']; cur=src.get(n); tag=re.sub(r'[^A-Za-z0-9]','_',Path(p).stem+'_'+n)
  v=alt(f,cur,tag); src[n]=v
  if f.get('type') in ('string','text','image') and isinstance(v,str) and ('CMSAUDIT_' in v or 'example.com/' in v): sent.append((n,v))
 return d,sent

def run(browser,entry):
 pth=entry['path']; target=mode(pth); d,sent=mutate(entry)
 site=load('data/site-settings.json'); site.update({'gatewayEnabled':'yes' if target=='gateway' else 'no','defaultMode':target,'showModeSwitch':'yes'})
 ov={pth:d,'data/site-settings.json':site}
 # Preserve mutation when testing site-settings itself, while forcing a visible mode.
 if pth=='data/site-settings.json':
  ov[pth].update({'gatewayEnabled':'no','defaultMode':'website','websiteEnabled':'yes'})
 ctx=browser.new_context(viewport={'width':390,'height':844} if target=='gateway' else {'width':1366,'height':768}); page=ctx.new_page(); errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 def handler(route):
  rel=urlparse(route.request.url).path.lstrip('/') or 'index.html'
  if rel in ov: route.fulfill(status=200,body=json.dumps(ov[rel]),content_type='application/json'); return
  fp=ROOT/rel
  if fp.exists() and fp.is_file():
   ct={'.json':'application/json','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'}.get(fp.suffix,'application/octet-stream'); route.fulfill(status=200,body=fp.read_bytes(),content_type=ct)
  else: route.fulfill(status=404,body='not found')
 page.route(BASE+'**',handler); page.set_content(HTML,wait_until='domcontentloaded'); page.wait_for_function("document.documentElement.classList.contains('cs-boot-ready') || document.documentElement.classList.contains('cs-boot-failed')",timeout=10000); page.wait_for_timeout(500)
 state=page.evaluate("""() => ({status:document.documentElement.className,html:document.documentElement.outerHTML,title:document.title,bodyClass:document.body.className})""")
 observed=[]; missing=[]
 for n,v in sent:
  (observed if v in state['html'] else missing).append(n)
 out={'file':pth,'mode':target,'status':state['status'],'errors':errs,'sentinelFields':len(sent),'observed':observed,'notObserved':missing,'bodyClass':state['bodyClass']}
 ctx.close(); return out
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox']); results=[]
 for e in cms_file_entries(CFG['content']):
  r=run(b,e); results.append(r); print(e['path'],r['status'],len(r['observed']),len(r['notObserved']))
 b.close()
(ROOT/'docs'/'CMS_ALL_FILES_RUNTIME_MUTATION_RESULTS.json').write_text(json.dumps(results,indent=2))
assert all(r['status']=='cs-boot-ready' and not r['errors'] for r in results),results
print('PASS',len(results),'CMS file mutation scenarios')
