import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]; BASE='https://cybersabil.test/'
HTML=(ROOT/'index.html').read_text().replace('<head>',f'<head><base href="{BASE}">',1)
JS=(ROOT/'assets/js/main.js').read_text()
needle='return { boot, activateInitialMode, renderPortfolio, applyPortfolioContact, getGatewayBackgroundMode: resolveGatewayBackgroundMode };'
replacement='''return { boot, activateInitialMode, renderPortfolio, applyPortfolioContact, getGatewayBackgroundMode: resolveGatewayBackgroundMode,
        __auditApplyGateway(nextVisual, nextAppearance) { visualBaseline = nextVisual; gatewayAppearance = nextAppearance; applyGatewayAppearance(); },
        __auditApplyNavigation(nextVisual, nextNavigation) { visualBaseline = nextVisual; navigationStyle = nextNavigation; applyNavigationStyle(); }
    };'''
assert needle in JS
TEST_JS=JS.replace(needle,replacement)
def j(n): return json.loads((ROOT/'data'/n).read_text())
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox']); c=b.new_context(viewport={'width':1366,'height':768}); page=c.new_page(); errs=[]
 page.on('pageerror',lambda e: errs.append(str(e)))
 def handler(route):
  rel=urlparse(route.request.url).path.lstrip('/') or 'index.html'; fp=ROOT/rel
  if rel=='assets/js/main.js': route.fulfill(status=200,body=TEST_JS,content_type='application/javascript'); return
  if fp.exists() and fp.is_file():
   ct={'.json':'application/json','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'}.get(fp.suffix,'application/octet-stream'); route.fulfill(status=200,body=fp.read_bytes(),content_type=ct)
  else: route.fulfill(status=404,body='not found')
 page.route(BASE+'**',handler); page.set_content(HTML,wait_until='domcontentloaded'); page.wait_for_function("document.documentElement.classList.contains('cs-boot-ready')",timeout=10000); page.wait_for_timeout(300)
 vis=j('visual-baseline.json'); vis['globalVisualPreset']='section-controlled'
 ga=j('gateway-appearance.json'); ga.update({'visualPreset':'custom-advanced','layoutControlMode':'custom','appearanceControlMode':'custom','animationControlMode':'custom','interactionControlMode':'custom','cardOrder':'portfolio-first','panelMaxWidth':777,'websiteBackgroundBlur':13})
 page.evaluate('(x)=>CyberSabilGateway.__auditApplyGateway(x.v,x.g)',{'v':vis,'g':ga})
 custom=page.evaluate("""() => {const o=document.getElementById('csGatewayOverlay'),w=document.querySelector('[data-cs-mode-choice="website"]');return {cls:o.className,order:getComputedStyle(w).order,panel:document.documentElement.style.getPropertyValue('--cs-gateway-panel-width'),blur:document.documentElement.style.getPropertyValue('--cs-gateway-blur'),attrs:[...o.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name)}}""")
 assert all(x in custom['cls'] for x in ['cs-gateway-layout-custom','cs-gateway-appearance-custom','cs-gateway-animation-custom','cs-gateway-interaction-custom']),custom
 assert custom['panel']=='777px' and custom['blur']=='13px',custom
 ga.update({'layoutControlMode':'inherit','appearanceControlMode':'inherit','animationControlMode':'inherit','interactionControlMode':'inherit'})
 page.evaluate('(x)=>CyberSabilGateway.__auditApplyGateway(x.v,x.g)',{'v':vis,'g':ga})
 reset=page.evaluate("""() => {const o=document.getElementById('csGatewayOverlay'),w=document.querySelector('[data-cs-mode-choice="website"]');return {cls:o.className,order:w.style.order,panel:document.documentElement.style.getPropertyValue('--cs-gateway-panel-width'),blur:document.documentElement.style.getPropertyValue('--cs-gateway-blur'),dark:document.documentElement.style.getPropertyValue('--cs-gateway-darkness'),attrs:[...o.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name)}}""")
 assert 'cs-gateway-layout-custom' not in reset['cls'] and not reset['order'] and reset['panel']=='680px' and reset['blur']=='7px' and reset['dark']=='0.5',reset
 nav=j('navigation-style.json'); nav.update({'visualPreset':'custom-advanced','websiteHeaderControlMode':'custom','portfolioHeaderControlMode':'custom','modeSwitchPositionControlMode':'custom','modeSwitchAppearanceControlMode':'custom','modeSwitchAnimationControlMode':'custom','modeSwitchDesktopPosition':'bottom-center'})
 page.evaluate('(x)=>CyberSabilGateway.__auditApplyNavigation(x.v,x.n)',{'v':vis,'n':nav})
 ncustom=page.evaluate("""() => ({w:document.getElementById('csWebsiteApp').className,p:document.getElementById('csPortfolioApp').className,s:document.getElementById('csModeSwitch').className,x:document.documentElement.style.getPropertyValue('--cs-mode-switch-x-offset')})""")
 assert 'cs-mode-website-header-advanced' in ncustom['w'] and 'cs-portfolio-header-advanced' in ncustom['p'] and 'cs-mode-switch-position-custom' in ncustom['s'],ncustom
 nav.update({'websiteHeaderControlMode':'inherit','portfolioHeaderControlMode':'inherit','modeSwitchPositionControlMode':'inherit','modeSwitchAppearanceControlMode':'inherit','modeSwitchAnimationControlMode':'inherit'})
 page.evaluate('(x)=>CyberSabilGateway.__auditApplyNavigation(x.v,x.n)',{'v':vis,'n':nav})
 nreset=page.evaluate("""() => ({w:document.getElementById('csWebsiteApp').className,p:document.getElementById('csPortfolioApp').className,s:document.getElementById('csModeSwitch').className,x:document.documentElement.style.getPropertyValue('--cs-mode-switch-x-offset'),attrs:[...document.getElementById('csModeSwitch').attributes].filter(a=>a.name.startsWith('data-cs-')).map(a=>a.name)})""")
 assert 'cs-mode-website-header-advanced' not in nreset['w'] and 'cs-portfolio-header-advanced' not in nreset['p'] and 'cs-mode-switch-position-custom' not in nreset['s'] and not nreset['x'],nreset
 assert not errs,errs
 out={'gatewayCustom':custom,'gatewayReset':reset,'navigationCustom':ncustom,'navigationReset':nreset}
 (ROOT/'docs'/'GROUP_ISOLATION_RESET_TEST_RESULTS.json').write_text(json.dumps(out,indent=2)); print('PASS group isolation and same-page reset')
 c.close(); b.close()
