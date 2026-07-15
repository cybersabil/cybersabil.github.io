import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]; BASE='https://cybersabil.test/'
HTML=(ROOT/'index.html').read_text().replace('<head>',f'<head><base href="{BASE}">',1)
def j(n): return json.loads((ROOT/'data'/n).read_text())
def run(browser,pos,mobile=False,anim='inherit',hover='lift'):
    vp={'width':390,'height':844} if mobile else {'width':1366,'height':768}
    ctx=browser.new_context(viewport=vp); page=ctx.new_page(); errs=[]
    page.on('pageerror',lambda e: errs.append(str(e))); page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    nav=j('navigation-style.json'); vis=j('visual-baseline.json'); site=j('site-settings.json')
    vis['globalVisualPreset']='section-controlled'; site.update({'gatewayEnabled':'no','defaultMode':'website','showModeSwitch':'yes'})
    nav.update({'visualPreset':'custom-advanced','websiteHeaderControlMode':'inherit','portfolioHeaderControlMode':'inherit','modeSwitchPositionControlMode':'custom','modeSwitchAppearanceControlMode':'inherit','modeSwitchAnimationControlMode':anim})
    nav['modeSwitchMobilePosition' if mobile else 'modeSwitchDesktopPosition']=pos
    if anim=='custom': nav.update({'modeSwitchAnimation':'soft-scale','modeSwitchHoverPreset':hover})
    ov={'navigation-style.json':nav,'visual-baseline.json':vis,'site-settings.json':site}
    def handler(route):
        rel=urlparse(route.request.url).path.lstrip('/') or 'index.html'
        if rel.startswith('data/') and rel.split('/',1)[1] in ov:
            n=rel.split('/',1)[1]; route.fulfill(status=200,body=json.dumps(ov[n]),content_type='application/json'); return
        fp=ROOT/rel
        if fp.exists() and fp.is_file():
            ct={'.json':'application/json','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'}.get(fp.suffix,'application/octet-stream'); route.fulfill(status=200,body=fp.read_bytes(),content_type=ct)
        else: route.fulfill(status=404,body='not found')
    page.route(BASE+'**',handler)
    page.set_content(HTML,wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.classList.contains('cs-boot-ready') || document.documentElement.classList.contains('cs-boot-failed')",timeout=10000)
    page.wait_for_timeout(600)
    status=page.evaluate('document.documentElement.className')
    if status!='cs-boot-ready':
        print('FAILED BOOT',pos,mobile,status,errs); ctx.close(); raise AssertionError(status)
    r=page.evaluate("""() => {const s=document.getElementById('csModeSwitch'),r=s.getBoundingClientRect(),c=getComputedStyle(s);return {x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2,transform:c.transform,translate:c.translate,animation:c.animationName,desktop:s.dataset.csDesktopPosition,mobile:s.dataset.csMobilePosition,fallback:s.dataset.csPositionFallback}}""")
    ctx.close(); return r,vp
def check(r,vp,mobile):
    W,H=vp['width'],vp['height']; p=r['mobile'] if mobile else r['desktop']; tol=5
    if p.endswith('center'): assert abs(r['cx']-W/2)<tol,(p,r)
    if p.startswith('center'): assert abs(r['cy']-H/2)<tol,(p,r)
    if 'left' in p: assert r['x']<W/2,(p,r)
    if 'right' in p: assert r['x']+r['w']>W/2,(p,r)
    if p.startswith('top'): assert r['y']<H/2,(p,r)
    if p.startswith('bottom'): assert r['y']+r['h']>H/2,(p,r)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox']); out={}
    for mobile,positions in [(False,['top-left','top-center','top-right','center-left','center-right','bottom-left','bottom-center','bottom-right']),(True,['top-left','top-center','top-right','bottom-left','bottom-center','bottom-right'])]:
        for pos in positions:
            r,vp=run(b,pos,mobile); check(r,vp,mobile); out[('mobile_' if mobile else 'desktop_')+pos]=r
    for anim,hover in [('inherit','lift'),('custom','none'),('custom','glow')]:
        r,vp=run(b,'bottom-center',True,anim,hover); check(r,vp,True); out[f'mobile_bottom-center_{anim}_{hover}']=r
    b.close()
(ROOT/'docs'/'SWITCH_POSITION_COLLISION_TEST_RESULTS.json').write_text(json.dumps(out,indent=2)); print('PASS',len(out))
