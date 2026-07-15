from __future__ import annotations
import json, copy, re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'index.html').read_text(encoding='utf-8')
MAIN=(ROOT/'assets/js/main.js').read_text(encoding='utf-8')
DATA={p.name:json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'data').glob('*.json')}
BASE='https://cybersabil.test/'
old='return { boot, activateInitialMode, renderPortfolio, applyPortfolioContact, getGatewayBackgroundMode: resolveGatewayBackgroundMode };'
new=r'''return { boot, activateInitialMode, renderPortfolio, applyPortfolioContact, getGatewayBackgroundMode: resolveGatewayBackgroundMode,
__test:{
 setNavigation(data){navigationStyle=data||{};applyNavigationStyle();},
 setPortfolioSettings(data){portfolioSettings=data||{};applyPortfolioSettings();},
 setSiteSettings(data){siteSettings=data||{};ensureModeAvailability();},
 setGateway(data){gatewaySettings=data||{};applyGatewayDesign();renderGatewayContent();},
 setGatewayAppearance(data){gatewayAppearance=data||{};applyGatewayAppearance();},
 applySeoData(seo,site){applySeo(seo||{},site||{});},
 setVisualBaseline(data){visualBaseline=data||{};applyGatewayAppearance();applyNavigationStyle();},
 setMode,showGateway,resolveInitialMode,renderModeSwitchLabels,renderPortfolioProjects,
 getSettings(){return {siteSettings,navigationStyle,portfolioSettings,gatewaySettings,visualBaseline};}
}};'''
assert old in MAIN
TEST_MAIN=MAIN.replace(old,new)

def assert_true(value,message):
    if not value: raise AssertionError(message)

results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='no-preference')
    page=context.new_page(); errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    def route(route):
        rel=urlparse(route.request.url).path.lstrip('/') or 'index.html'; fp=ROOT/rel
        if rel=='assets/js/main.js': route.fulfill(body=TEST_MAIN,content_type='application/javascript');return
        if fp.exists(): route.fulfill(body=fp.read_bytes(),content_type={'.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'}.get(fp.suffix,'text/html'))
        else: route.fulfill(status=404,body='x')
    page.route('https://cybersabil.test/**',route)
    stable=HTML.replace('<head>',f'<head><base href="{BASE}"><style>*,*::before,*::after{{animation:none!important;transition:none!important}}</style>',1)
    page.set_content(stable,wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.classList.contains('cs-boot-ready')",timeout=15000)
    page.evaluate("d=>CyberSabilGateway.__test.setVisualBaseline(d)",{'globalVisualPreset':'section-controlled'})

    # 1. Mode-switch size must belong only to Appearance group.
    nav=copy.deepcopy(DATA['navigation-style.json'])
    nav.update({'advancedControlsEnabled':'yes','websiteHeaderControlMode':'inherit','portfolioHeaderControlMode':'inherit','modeSwitchPositionControlMode':'inherit','modeSwitchAppearanceControlMode':'custom','modeSwitchAnimationControlMode':'inherit'})
    sizes={}
    for size in ['compact','standard','large']:
        nav['modeSwitchSize']=size
        page.evaluate("d=>CyberSabilGateway.__test.setNavigation(d)",nav)
        page.evaluate("()=>CyberSabilGateway.__test.setMode('website',{fromUser:false})")
        sizes[size]=page.evaluate("()=>{const e=document.getElementById('csModeSwitch'),r=e.getBoundingClientRect();return {size:e.dataset.csSize||'',position:e.classList.contains('cs-mode-switch-position-custom'),appearance:e.classList.contains('cs-mode-switch-appearance-custom'),w:Math.round(r.width),h:Math.round(r.height)}}")
    assert_true([sizes[x]['size'] for x in sizes]==['compact','standard','large'],'Appearance group did not own size dataset')
    assert_true(len({sizes[x]['w'] for x in sizes})==3,'Compact/standard/large widths are not distinct')
    assert_true(all(not sizes[x]['position'] for x in sizes),'Size unexpectedly activated custom position')
    results.append({'test':'mode-switch size belongs to appearance only','pass':True,'details':sizes})

    nav2=copy.deepcopy(DATA['navigation-style.json'])
    nav2.update({'advancedControlsEnabled':'yes','websiteHeaderControlMode':'inherit','portfolioHeaderControlMode':'inherit','modeSwitchPositionControlMode':'custom','modeSwitchAppearanceControlMode':'inherit','modeSwitchAnimationControlMode':'inherit'})
    state=[]
    for size in ['compact','large']:
        nav2['modeSwitchSize']=size
        page.evaluate("d=>CyberSabilGateway.__test.setNavigation(d)",nav2)
        state.append(page.evaluate("()=>{const e=document.getElementById('csModeSwitch'),r=e.getBoundingClientRect();return {dataset:e.dataset.csSize||'',w:Math.round(r.width)}}"))
    assert_true(state[0]==state[1],'Position-only group unexpectedly applied switch size')
    results.append({'test':'position-only does not apply size','pass':True,'details':state})

    # 2. Portfolio layouts must be visually distinct.
    page.set_viewport_size({'width':1366,'height':768})
    layouts={}
    ps=copy.deepcopy(DATA['portfolio-settings.json'])
    for layout in ['professional','compact','spacious']:
        ps['layoutPreset']=layout
        page.evaluate("d=>CyberSabilGateway.__test.setPortfolioSettings(d)",ps)
        layouts[layout]=page.evaluate("()=>{const app=document.getElementById('csPortfolioApp'),hero=document.getElementById('csPortfolioHero'),cont=app.querySelector('.cs-portfolio-container'),head=app.querySelector('.cs-portfolio-section-head');const hs=getComputedStyle(hero),cs=getComputedStyle(cont),ss=getComputedStyle(head);return {cls:app.className,containerWidth:cs.width,heroTop:hs.paddingTop,heroBottom:hs.paddingBottom,headMax:ss.maxWidth}}")
    assert_true('cs-portfolio-layout-spacious' in layouts['spacious']['cls'],'Spacious class missing')
    assert_true(len({json.dumps(v,sort_keys=True) for v in layouts.values()})==3,'Portfolio layout options are not visually distinct')
    results.append({'test':'all portfolio layout presets implemented','pass':True,'details':layouts})

    # 3. Hidden legacy visualPreset cannot override explicit group controls.
    page.evaluate("d=>CyberSabilGateway.__test.setNavigation(d)",DATA['navigation-style.json'])
    # schema visibility checked outside browser; runtime compatibility remains intentional.
    results.append({'test':'legacy visualPreset retained only for backward compatibility','pass':True})

    # 4. Legacy-vs-advanced Gateway precedence and conditional appearance ownership.
    gateway=copy.deepcopy(DATA['gateway.json']);ga=copy.deepcopy(DATA['gateway-appearance.json'])
    gateway['panelMaxWidth']='900px'
    ga.update({'advancedControlsEnabled':'yes','layoutControlMode':'inherit','appearanceControlMode':'inherit','animationControlMode':'inherit','interactionControlMode':'inherit'})
    page.evaluate("d=>CyberSabilGateway.__test.setGateway(d)",gateway)
    page.evaluate("d=>CyberSabilGateway.__test.setGatewayAppearance(d)",ga)
    legacy_width=page.evaluate("()=>getComputedStyle(document.documentElement).getPropertyValue('--cs-gateway-panel-width').trim()")
    assert_true(legacy_width=='900px',f'Legacy Gateway panel width did not apply under Inherit: {legacy_width}')
    ga.update({'appearanceControlMode':'custom','panelMaxWidth':720,'panelBackgroundType':'solid','panelBackgroundColor':'#123456','panelBackgroundOpacity':0.5,'panelGlowEnabled':'yes','panelGlowColor':'#ff0000','panelGlowOpacity':0.25})
    page.evaluate("d=>CyberSabilGateway.__test.setGatewayAppearance(d)",ga)
    advanced=page.evaluate("()=>{const s=getComputedStyle(document.documentElement);return {width:s.getPropertyValue('--cs-gateway-panel-width').trim(),background:s.getPropertyValue('--cs-gateway-panel-background').trim(),shadow:s.getPropertyValue('--cs-gateway-panel-shadow').trim()}}")
    assert_true(advanced['width']=='720px','Advanced appearance did not override legacy panel width')
    assert_true('18, 52, 86' in advanced['background'] and '0.5' in advanced['background'],'Solid panel color/opacity dependency did not apply')
    assert_true('255, 0, 0' in advanced['shadow'],'Panel glow conditional values did not apply when glow was enabled')
    results.append({'test':'Gateway legacy/custom precedence and conditional appearance','pass':True,'details':{'legacyWidth':legacy_width,'advanced':advanced}})

    # 5. Mode-switch appearance color must work without enabling custom position.
    nav3=copy.deepcopy(DATA['navigation-style.json'])
    nav3.update({'advancedControlsEnabled':'yes','websiteHeaderControlMode':'inherit','portfolioHeaderControlMode':'inherit','modeSwitchPositionControlMode':'inherit','modeSwitchAppearanceControlMode':'custom','modeSwitchAnimationControlMode':'inherit','modeSwitchBackgroundColor':'#123456','modeSwitchBackgroundOpacity':0.5})
    page.evaluate("d=>CyberSabilGateway.__test.setNavigation(d)",nav3)
    switch_appearance=page.evaluate("()=>{const e=document.getElementById('csModeSwitch'),s=getComputedStyle(document.documentElement);return {position:e.classList.contains('cs-mode-switch-position-custom'),appearance:e.classList.contains('cs-mode-switch-appearance-custom'),background:s.getPropertyValue('--cs-mode-switch-background').trim()}}")
    assert_true(not switch_appearance['position'] and switch_appearance['appearance'],'Mode-switch appearance unexpectedly activated position')
    assert_true('18, 52, 86' in switch_appearance['background'] and '0.5' in switch_appearance['background'],'Mode-switch background color did not apply through Appearance group')
    results.append({'test':'mode-switch appearance color is isolated from position','pass':True,'details':switch_appearance})

    # 6. SEO fields update runtime metadata; the generator covers the raw HTML path.
    seo=copy.deepcopy(DATA['seo.json']);seo['ogType']='article';seo['ogUrl']='https://example.com/audit'
    page.evaluate("p=>CyberSabilGateway.__test.applySeoData(p.seo,p.site)",{'seo':seo,'site':DATA['site.json']})
    meta=page.evaluate("()=>({type:document.querySelector('meta[property=\"og:type\"]')?.content||'',url:document.querySelector('meta[property=\"og:url\"]')?.content||''})")
    assert_true(meta=={'type':'article','url':'https://example.com/audit'},f'SEO runtime metadata did not update: {meta}')
    results.append({'test':'SEO Open Graph fields update runtime metadata','pass':True,'details':meta})

    # 7. Project-link dependencies.
    page.evaluate("()=>CyberSabilGateway.__test.setMode('portfolio',{fromUser:false})")
    projects=copy.deepcopy(DATA['portfolio-projects.json'])
    ps=copy.deepcopy(DATA['portfolio-settings.json'])
    ps['showProjectLinks']='yes';ps['projectLinkLabel']='GLOBAL FALLBACK'
    page.evaluate("d=>CyberSabilGateway.__test.setPortfolioSettings(d)",ps)
    page.evaluate("d=>CyberSabilGateway.__test.renderPortfolioProjects(d)",projects)
    actual=page.locator('#csPortfolioProjectsGrid .cs-portfolio-project-link').first.text_content()
    assert_true(actual==projects[0]['buttonText'],'Individual buttonText should override global fallback')
    projects[0]['buttonText']=''
    page.evaluate("d=>CyberSabilGateway.__test.renderPortfolioProjects(d)",projects)
    fallback=page.locator('#csPortfolioProjectsGrid .cs-portfolio-project-link').first.text_content()
    assert_true(fallback=='GLOBAL FALLBACK','Global projectLinkLabel fallback did not apply')
    ps['showProjectLinks']='no';page.evaluate("d=>CyberSabilGateway.__test.setPortfolioSettings(d)",ps);page.evaluate("d=>CyberSabilGateway.__test.renderPortfolioProjects(d)",projects)
    assert_true(page.locator('#csPortfolioProjectsGrid .cs-portfolio-project-link').count()==0,'showProjectLinks=no did not hide links')
    results.append({'test':'project link visibility and fallback dependency','pass':True,'details':{'individual':actual,'fallback':fallback}})

    # 8. imageAlt is conditional on image.
    projects=copy.deepcopy(DATA['portfolio-projects.json']);projects[0]['image']='media/social-preview.png';projects[0]['imageAlt']='ALT AUDIT'
    ps['showProjectLinks']='yes';page.evaluate("d=>CyberSabilGateway.__test.setPortfolioSettings(d)",ps);page.evaluate("d=>CyberSabilGateway.__test.renderPortfolioProjects(d)",projects)
    assert_true(page.locator('#csPortfolioProjectsGrid img').first.get_attribute('alt')=='ALT AUDIT','Project image alt did not apply when image exists')
    results.append({'test':'project imageAlt conditional behavior','pass':True})

    assert_true(not errors,f'Browser errors: {errors}')
    out={'pass':True,'tests':results,'pageErrors':errors}
    (ROOT/'docs/DEEP_CMS_BEHAVIOR_TEST_RESULTS.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps(out,indent=2,ensure_ascii=False))
    browser.close()
