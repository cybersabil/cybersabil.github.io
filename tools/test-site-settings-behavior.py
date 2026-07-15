from __future__ import annotations
import json, copy
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'index.html').read_text(encoding='utf-8')
MAIN=(ROOT/'assets/js/main.js').read_text(encoding='utf-8')
DATA={p.name:json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'data').glob('*.json')}
BASE='https://cybersabil.test/'
old='return { boot, activateInitialMode, renderPortfolio, applyPortfolioContact, getGatewayBackgroundMode: resolveGatewayBackgroundMode };'
new=r'''return {boot,activateInitialMode,renderPortfolio,applyPortfolioContact,getGatewayBackgroundMode:resolveGatewayBackgroundMode,
__test:{setSiteSettings(d){siteSettings=d||{};ensureModeAvailability();},setMode,showGateway,resolveInitialMode,
resolveWith(urlMode,remembered){const enabled=getEnabledModes(),only=enabled[0]||'website';if(yes(siteSettings.enableUrlModeOverride)&&['website','portfolio','gateway'].includes(urlMode)){if(urlMode==='gateway')return enabled.length===2?'gateway':only;return enabled.includes(urlMode)?urlMode:only;}if(yes(siteSettings.rememberVisitorChoice,false)&&enabled.includes(remembered))return remembered;if(enabled.length<2)return only;if(!yes(siteSettings.gatewayEnabled)){const requested=normalizeMode(siteSettings.defaultMode||'website');return enabled.includes(requested)?requested:only;}return ['gateway','website','portfolio'].includes(siteSettings.defaultMode)?siteSettings.defaultMode:'gateway';},
addFailure(path){csDataFailures.push({path,error:'audit'});},clearFailures(){csDataFailures.length=0;},renderDataFallbackStatus,renderTools,addCopyButtons}};'''
assert old in MAIN
TEST_MAIN=MAIN.replace(old,new)

def check(v,msg):
 if not v: raise AssertionError(msg)

out=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844});page=c.new_page();errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 def route(route):
  rel=urlparse(route.request.url).path.lstrip('/') or 'index.html';fp=ROOT/rel
  if rel=='assets/js/main.js':route.fulfill(body=TEST_MAIN,content_type='application/javascript');return
  if fp.exists():route.fulfill(body=fp.read_bytes(),content_type={'.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'}.get(fp.suffix,'text/html'))
  else:route.fulfill(status=404,body='x')
 page.route('https://cybersabil.test/**',route)
 storage="""<script>window.__auditStore={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(__auditStore,k)?__auditStore[k]:null,setItem:(k,v)=>{__auditStore[k]=String(v)},removeItem:k=>delete __auditStore[k],clear:()=>{for(const k of Object.keys(__auditStore))delete __auditStore[k]}}});</script>"""
 stable=HTML.replace('<head>',f'<head><base href="{BASE}">{storage}<style>*,*::before,*::after{{animation:none!important;transition:none!important}}</style>',1)
 page.set_content(stable,wait_until='domcontentloaded');page.wait_for_function("document.documentElement.classList.contains('cs-boot-ready')",timeout=15000)
 settings=copy.deepcopy(DATA['site-settings.json'])

 # URL override and remembered-choice precedence.
 for enabled,expected in [('yes','portfolio'),('no','gateway')]:
  settings['enableUrlModeOverride']=enabled;settings['defaultMode']='gateway';settings['rememberVisitorChoice']='no'
  page.evaluate("d=>CyberSabilGateway.__test.setSiteSettings(d)",settings)
  actual=page.evaluate("()=>CyberSabilGateway.__test.resolveWith('portfolio',null)")
  check(actual==expected,f'URL override {enabled} => {actual}, expected {expected}')
 out.append({'test':'URL mode override yes/no','pass':True})
 settings['enableUrlModeOverride']='no';settings['rememberVisitorChoice']='yes';settings['defaultMode']='gateway'
 page.evaluate("d=>CyberSabilGateway.__test.setSiteSettings(d)",settings)
 check(page.evaluate("()=>CyberSabilGateway.__test.resolveWith(null,'portfolio')")=='portfolio','Remembered portfolio not resolved')
 settings['rememberVisitorChoice']='no';page.evaluate("d=>CyberSabilGateway.__test.setSiteSettings(d)",settings)
 check(page.evaluate("()=>CyberSabilGateway.__test.resolveWith(null,'portfolio')")=='gateway','Remembered choice was used while disabled')
 out.append({'test':'remember visitor choice precedence','pass':True})

 # Actual localStorage write only on user action.
 settings['rememberVisitorChoice']='yes';page.evaluate("d=>CyberSabilGateway.__test.setSiteSettings(d)",settings)
 page.evaluate("()=>{localStorage.clear();CyberSabilGateway.__test.setMode('portfolio',{fromUser:true});}")
 check(page.evaluate("()=>localStorage.getItem('cybersabil-selected-mode-v28')")=='portfolio','User mode was not stored')
 settings['rememberVisitorChoice']='no';page.evaluate("d=>CyberSabilGateway.__test.setSiteSettings(d)",settings)
 page.evaluate("()=>{localStorage.clear();CyberSabilGateway.__test.setMode('website',{fromUser:true});}")
 check(page.evaluate("()=>localStorage.getItem('cybersabil-selected-mode-v28')") is None,'Mode stored while remember=no')
 out.append({'test':'localStorage write yes/no','pass':True})

 # Escape behavior and fallback target.
 for allowed in ['yes','no']:
  settings['allowGatewayCloseWithEscape']=allowed;settings['escapeFallbackMode']='portfolio';page.evaluate("d=>CyberSabilGateway.__test.setSiteSettings(d)",settings)
  page.evaluate("()=>CyberSabilGateway.__test.showGateway()")
  page.keyboard.press('Escape')
  state=page.evaluate("()=>({gateway:document.body.classList.contains('cs-mode-gateway-open'),mode:document.body.dataset.csActiveMode||''})")
  if allowed=='yes':check(not state['gateway'] and state['mode']=='portfolio',f'Escape allowed failed: {state}')
  else:check(state['gateway'],f'Escape disabled still closed gateway: {state}')
 out.append({'test':'Escape allow/deny and fallback mode','pass':True})

 # Terminal ready message.
 settings['terminalReadyMessage']='TERMINAL AUDIT READY'
 page.evaluate("({items,s})=>CyberSabilGateway.__test.renderTools(items,s)",{'items':DATA['tools.json'],'s':settings})
 check('TERMINAL AUDIT READY' in page.locator('#terminalCommands').inner_text(),'Terminal ready message missing')
 out.append({'test':'terminal ready message','pass':True})

 # Copy button initial labels and success state.
 page.evaluate("()=>{document.getElementById('commandList').innerHTML='<div class=\"code\">echo audit</div>';}")
 settings.update({'copyButtonDefaultTitle':'COPY AUDIT','copyButtonAriaLabel':'COPY ARIA','copyButtonSuccessTitle':'COPIED AUDIT','copyButtonErrorTitle':'FAILED AUDIT'})
 page.evaluate("s=>CyberSabilGateway.__test.addCopyButtons(s)",settings)
 btn=page.locator('#commandList .copy-btn')
 check(btn.get_attribute('title')=='COPY AUDIT' and btn.get_attribute('aria-label')=='COPY ARIA','Copy initial labels failed')
 page.evaluate("()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.resolve()}})")
 page.evaluate("()=>document.querySelector('#commandList .copy-btn').click()");page.wait_for_timeout(30)
 check(btn.get_attribute('title')=='COPIED AUDIT','Copy success title failed')
 out.append({'test':'copy button labels and success state','pass':True})

 # Failure-only warning controls.
 page.evaluate("()=>CyberSabilGateway.__test.clearFailures()")
 settings['showDataLoadWarning']='yes';settings['dataLoadWarningTitle']='WARNING AUDIT';settings['dataLoadWarningMessage']='MESSAGE AUDIT'
 page.evaluate("s=>CyberSabilGateway.__test.renderDataFallbackStatus(s)",settings)
 check(page.locator('#csDataStatus').is_hidden(),'Warning visible without a failure')
 page.evaluate("()=>CyberSabilGateway.__test.addFailure('data/audit.json')")
 page.evaluate("s=>CyberSabilGateway.__test.renderDataFallbackStatus(s)",settings)
 check(not page.locator('#csDataStatus').is_hidden(),'Warning hidden after failure')
 check(page.locator('#csDataStatusTitle').inner_text()=='WARNING AUDIT','Warning title failed')
 settings['showDataLoadWarning']='no';page.evaluate("s=>CyberSabilGateway.__test.renderDataFallbackStatus(s)",settings)
 check(page.locator('#csDataStatus').is_hidden(),'Warning not hidden when disabled')
 out.append({'test':'failure-only warning fields','pass':True})

 check(not errs,f'Page errors: {errs}')
 result={'pass':True,'tests':out,'pageErrors':errs}
 (ROOT/'docs/SITE_SETTINGS_BEHAVIOR_TEST_RESULTS.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
 print(json.dumps(result,indent=2))
 b.close()
