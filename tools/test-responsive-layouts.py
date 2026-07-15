import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]; BASE='https://cybersabil.test/'
HTML=(ROOT/'index.html').read_text().replace('<head>',f'<head><base href="{BASE}">',1)
def run(browser,vp,mode='gateway'):
 c=browser.new_context(viewport=vp); p=c.new_page()
 def h(route):
  rel=urlparse(route.request.url).path.lstrip('/') or 'index.html'; fp=ROOT/rel
  if fp.exists() and fp.is_file():
   ct={'.json':'application/json','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'}.get(fp.suffix,'application/octet-stream'); route.fulfill(status=200,body=fp.read_bytes(),content_type=ct)
  else: route.fulfill(status=404,body='not found')
 p.route(BASE+'**',h); p.set_content(HTML,wait_until='domcontentloaded'); p.wait_for_function("document.documentElement.classList.contains('cs-boot-ready')",timeout=10000); p.wait_for_timeout(650)
 r=p.evaluate("""() => {const s=document.getElementById('csModeSwitch'),sr=s.getBoundingClientRect(),w=document.querySelector('[data-cs-mode-choice="website"]'),pr=document.querySelector('[data-cs-mode-choice="portfolio"]'),wr=w.getBoundingClientRect(),rr=pr.getBoundingClientRect(),col=getComputedStyle(document.querySelector('.cs-gateway-choice-column')).gridTemplateColumns;return {switchHidden:s.hidden,switch:{x:sr.x,y:sr.y,w:sr.width,h:sr.height,cx:sr.x+sr.width/2},website:{x:wr.x,y:wr.y},portfolio:{x:rr.x,y:rr.y},columns:col,mobilePos:s.dataset.csMobilePosition,desktopPos:s.dataset.csDesktopPosition}}""")
 c.close(); return r
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox']); out={}
 for name,vp in [('tablet_portrait',{'width':768,'height':1024}),('tablet_landscape',{'width':1024,'height':768}),('desktop',{'width':1366,'height':768}),('mobile',{'width':390,'height':844})]: out[name]=run(b,vp)
 b.close()
# Gateway: desktop/tablet row, mobile column, Website first.
assert abs(out['tablet_portrait']['website']['y']-out['tablet_portrait']['portfolio']['y'])<2,out
assert abs(out['tablet_landscape']['website']['y']-out['tablet_landscape']['portfolio']['y'])<2,out
assert abs(out['desktop']['website']['y']-out['desktop']['portfolio']['y'])<2,out
assert out['mobile']['website']['y']<out['mobile']['portfolio']['y'],out
(ROOT/'docs'/'TABLET_RESPONSIVE_TEST_RESULTS.json').write_text(json.dumps(out,indent=2)); print('PASS tablet/mobile/desktop responsive gateway scenarios')
