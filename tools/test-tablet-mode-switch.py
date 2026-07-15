import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]; BASE='https://cybersabil.test/'
HTML=(ROOT/'index.html').read_text().replace('<head>',f'<head><base href="{BASE}">',1)
def j(n): return json.loads((ROOT/'data'/n).read_text())
def run(browser,vp):
 c=browser.new_context(viewport=vp); p=c.new_page(); site=j('site-settings.json'); site.update({'gatewayEnabled':'no','defaultMode':'website','showModeSwitch':'yes'}); ov={'site-settings.json':site}
 def h(route):
  rel=urlparse(route.request.url).path.lstrip('/') or 'index.html'
  if rel=='data/site-settings.json': route.fulfill(status=200,body=json.dumps(site),content_type='application/json'); return
  fp=ROOT/rel
  if fp.exists() and fp.is_file():
   ct={'.json':'application/json','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'}.get(fp.suffix,'application/octet-stream'); route.fulfill(status=200,body=fp.read_bytes(),content_type=ct)
  else: route.fulfill(status=404,body='not found')
 p.route(BASE+'**',h); p.set_content(HTML,wait_until='domcontentloaded'); p.wait_for_function("document.documentElement.classList.contains('cs-boot-ready')",timeout=10000); p.wait_for_timeout(650)
 r=p.evaluate("""() => {const s=document.getElementById('csModeSwitch'),r=s.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,mobile:s.dataset.csMobilePosition,desktop:s.dataset.csDesktopPosition}}"""); c.close(); return r
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox']); a=run(b,{'width':768,'height':1024}); z=run(b,{'width':1024,'height':768}); b.close()
assert abs(a['cx']-384)<5,a
assert z['x']+z['w']>900,z
(ROOT/'docs'/'TABLET_MODE_SWITCH_TEST_RESULTS.json').write_text(json.dumps({'portrait768':a,'landscape1024':z},indent=2)); print('PASS tablet mode switch portrait/landscape')
