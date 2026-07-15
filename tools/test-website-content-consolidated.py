#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://cybersabil-content.test/'
HTML = (ROOT/'index.html').read_text(encoding='utf-8').replace('<head>', f'<head><base href="{BASE}">', 1)

def read_json(name):
    return json.loads((ROOT/'data'/name).read_text(encoding='utf-8'))

def open_case(browser, overrides=None, viewport=None):
    overrides = overrides or {}
    site_settings = read_json('site-settings.json')
    site_settings.update({'gatewayEnabled':'no','defaultMode':'website','websiteEnabled':'yes','portfolioEnabled':'yes'})
    site_settings.update(overrides.get('site-settings.json', {}))
    merged = {'site-settings.json': site_settings, **{k:v for k,v in overrides.items() if k!='site-settings.json'}}
    context = browser.new_context(viewport=viewport or {'width':1366,'height':768})
    page = context.new_page(); errors=[]
    page.on('pageerror', lambda e: errors.append(f'pageerror:{e}'))
    page.on('console', lambda m: errors.append(f'console:{m.text}') if m.type=='error' else None)
    def route_handler(route):
        rel = urlparse(route.request.url).path.lstrip('/') or 'index.html'
        if rel.startswith('data/'):
            name=rel.split('/',1)[1]
            if name in merged:
                route.fulfill(status=200,body=json.dumps(merged[name]),content_type='application/json'); return
        fp=ROOT/rel
        if fp.exists() and fp.is_file():
            ctype={'.json':'application/json','.css':'text/css','.js':'application/javascript','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'}.get(fp.suffix,'application/octet-stream')
            route.fulfill(status=200,body=fp.read_bytes(),content_type=ctype)
        else: route.fulfill(status=404,body='not found')
    page.route(BASE+'**',route_handler)
    page.set_content(HTML,wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.classList.contains('cs-boot-ready') || document.documentElement.classList.contains('cs-boot-failed')",timeout=15000)
    page.wait_for_timeout(400)
    return context,page,errors

results=[]
def check(name, cond, details=None):
    results.append({'test':name,'passed':bool(cond),'details':details})
    assert cond, f'{name}: {details}'

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])

    # Tools fields, URL contract, command sentinel and malformed records.
    tools=[
      {'icon':'  🛠️  ','status':' Ready ','title':'  Tool A  ','description':' Desc ','problem':' Prob ','solution':' Sol ','technology':' JS ','command':'  echo ok  ','buttonText':' Docs ','buttonLink':'#about'},
      {'title':'   ','command':'  coming   SOON  ','buttonText':'Bad','buttonLink':'javascript:alert(1)'},
      None
    ]
    settings={'copyButtonDefaultTitle':'Copy now','copyButtonSuccessTitle':'Done','copyButtonErrorTitle':'Failed','copyButtonAriaLabel':'Copy command custom'}
    ctx,p,e=open_case(browser,{'tools.json':tools,'site-settings.json':settings})
    check('tools_count_and_malformed_safe',p.locator('#toolCards .cs-tool-card').count()==3,e)
    check('tools_trim_and_optional_render',p.locator('#toolCards .cs-tool-card').nth(0).inner_text().find('Tool A')>=0)
    check('tools_blank_title_fallback',p.locator('#toolCards h3').nth(1).inner_text()=='Untitled tool')
    check('tools_coming_soon_case_insensitive',p.locator('#toolCards .cs-tool-card').nth(1).locator('.code').count()==0)
    a=p.locator('#toolCards .cs-tool-card').nth(0).locator('a')
    check('tools_internal_link_same_tab',a.get_attribute('href')=='#about' and a.get_attribute('target') is None)
    check('tools_unsafe_link_hidden',p.locator('#toolCards .cs-tool-card').nth(1).locator('a').count()==0)
    check('tools_copy_labels_cms_owned',p.locator('#toolCards .copy-btn').first.get_attribute('title')=='Copy now' and p.locator('#toolCards .copy-btn').first.get_attribute('aria-label')=='Copy command custom')
    check('tools_no_errors',not e,e); ctx.close()

    # Downloads fields and URL contract.
    downloads=[
      {'title':'  Build  ','version':' 1.2 ','type':' ZIP ','description':' Package ','downloadLink':'files/a.zip','releaseLink':'https://example.com/r','checksum':'a'*128},
      {'title':' ','version':' ','type':' ','description':' ','downloadLink':'data:text/html,x','releaseLink':' '}
    ]
    ctx,p,e=open_case(browser,{'downloads.json':downloads},viewport={'width':390,'height':844})
    check('downloads_title_fallback',p.locator('#downloadsGrid h3').nth(1).inner_text()=='Untitled download')
    links=p.locator('#downloadsGrid .cs-download-card').nth(0).locator('a')
    check('downloads_relative_same_tab',links.nth(0).get_attribute('href')=='files/a.zip' and links.nth(0).get_attribute('target') is None)
    check('downloads_external_new_tab',links.nth(1).get_attribute('target')=='_blank' and links.nth(1).get_attribute('rel')=='noopener noreferrer')
    check('downloads_unsafe_hidden',p.locator('#downloadsGrid .cs-download-card').nth(1).locator('a').count()==0)
    check('downloads_blank_optional_hidden',p.locator('#downloadsGrid .cs-download-card').nth(1).locator('.status,p').count()==0)
    check('downloads_mobile_no_overflow',p.evaluate('document.documentElement.scrollWidth===document.documentElement.clientWidth'))
    check('downloads_no_errors',not e,e); ctx.close()

    # Website projects.
    projects=[
      {'icon':' P ','status':' Live ','title':'  Project A ','description':' D ','problemSolved':' P ','techUsed':' T ','repoLink':'https://github.com/x/y','liveLink':'#about'},
      {'title':' ','repoLink':'vbscript:x','liveLink':' '}, None
    ]
    ctx,p,e=open_case(browser,{'projects.json':projects},viewport={'width':390,'height':844})
    check('projects_malformed_safe',p.locator('#projectCards .cs-website-project-card').count()==3,e)
    check('projects_title_fallback',p.locator('#projectCards h3').nth(1).inner_text()=='Untitled project')
    plinks=p.locator('#projectCards .cs-website-project-card').nth(0).locator('a')
    check('projects_external_internal_targets',plinks.nth(0).get_attribute('target')=='_blank' and plinks.nth(1).get_attribute('target') is None)
    check('projects_unsafe_blank_hidden',p.locator('#projectCards .cs-website-project-card').nth(1).locator('a').count()==0)
    check('projects_mobile_no_overflow',p.evaluate('document.documentElement.scrollWidth===document.documentElement.clientWidth'))
    check('projects_no_errors',not e,e); ctx.close()

    # Website skills.
    skills=[{'title':'  PowerShell ','description':' Automation '},{'title':' ','description':' '},None]
    ctx,p,e=open_case(browser,{'skills.json':skills})
    check('skills_malformed_safe',p.locator('#skillsGrid .cs-website-skill-card').count()==3,e)
    check('skills_title_fallback',p.locator('#skillsGrid h3').nth(1).inner_text()=='Untitled skill')
    check('skills_blank_description_hidden',p.locator('#skillsGrid .cs-website-skill-card').nth(1).locator('p').count()==0)
    check('skills_no_errors',not e,e); ctx.close()

    # Site text/link and section/nav/CTA synchronization.
    site=read_json('site.json'); site.update({'brandName':'  Brand X ','primaryButtonLink':'#tools','secondaryButtonLink':'https://example.com/download','githubProfileLink':'#about'})
    ss={'showToolsSection':'no','showDownloadsSection':'no','showProjectsSection':'no','showDocsSection':'no'}
    ctx,p,e=open_case(browser,{'site.json':site,'site-settings.json':ss})
    check('site_brand_trim_and_footer_derived',p.locator('#brandName').inner_text()=='Brand X' and p.locator('#footerBrand').inner_text()=='Brand X IT Tools')
    check('hidden_sections_hide_nav_links',all(p.locator('#'+x).evaluate('e=>e.classList.contains("hide")') for x in ['navToolsLabel','navDownloadsLabel','navProjectsLabel','navDocsLabel']))
    check('hidden_tools_hides_matching_cta',p.locator('#primaryButton').evaluate('e=>e.classList.contains("hide")'))
    check('custom_external_cta_remains',not p.locator('#secondaryButton').evaluate('e=>e.classList.contains("hide")') and p.locator('#secondaryButton').get_attribute('target')=='_blank')
    check('internal_github_target_cleared',p.locator('#githubNav').get_attribute('target') is None)
    check('site_settings_no_errors',not e,e); ctx.close()

    # Both modes disabled must visibly recover.
    ctx,p,e=open_case(browser,{'site-settings.json':{'websiteEnabled':'no','portfolioEnabled':'no','gatewayEnabled':'yes','defaultMode':'gateway'}})
    check('both_modes_disabled_safe_recovery',p.locator('#csDataStatus').evaluate('e=>!e.hidden') and 'enabled automatically' in p.locator('#csDataStatusMessage').inner_text())
    check('fallback_warning_persists',p.locator('#csDataStatus').get_attribute('data-cs-persistent-warning')=='true')
    check('mode_fallback_no_errors',not e,e); ctx.close()

    # Design options: explicit cyan, plain background, terminal visibility.
    design=read_json('design.json'); design.update({'themeMode':'green','accentColor':'cyan','backgroundStyle':'plain','showTerminalPreview':'no'})
    ctx,p,e=open_case(browser,{'design.json':design})
    body=p.locator('body')
    accent=p.evaluate("getComputedStyle(document.body).getPropertyValue('--accent').trim()")
    bg=p.evaluate("getComputedStyle(document.body).backgroundImage")
    check('design_cyan_overrides_theme_accent',accent.lower()=='#35d7ff',accent)
    check('design_plain_has_no_image',bg=='none',bg)
    check('design_terminal_hidden',p.locator('#terminalBox').evaluate('e=>e.classList.contains("hide")'))
    check('design_no_errors',not e,e); ctx.close()

    browser.close()

summary={'pass':all(r['passed'] for r in results),'count':len(results),'tests':results}
(ROOT/'docs'/'WEBSITE_CONTENT_CONSOLIDATED_AUDIT.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps({'pass':summary['pass'],'count':summary['count']},indent=2))
