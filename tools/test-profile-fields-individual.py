from __future__ import annotations
import copy, json, subprocess, tempfile, shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE='https://cybersabil-profile-fields.test/'
HTML=(ROOT/'index.html').read_text(encoding='utf-8').replace('<head>',f'<head><base href="{BASE}"><style>*,*::before,*::after{{animation:none!important;transition:none!important}}</style>',1)
DATA={p.name:json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'data').glob('*.json')}
results=[]
def rec(name,passed,details=None): results.append({'test':name,'passed':bool(passed),'details':details or {}})

def open_case(browser, profile, viewport=None):
    viewport=viewport or {'width':1366,'height':768}
    c=browser.new_context(viewport=viewport)
    p=c.new_page(); errs=[]
    p.on('pageerror',lambda e: errs.append(f'pageerror:{e}'))
    p.on('console',lambda m: errs.append(f'console:{m.text}') if m.type=='error' else None)
    settings=copy.deepcopy(DATA['site-settings.json']);settings.update({'gatewayEnabled':'no','defaultMode':'portfolio','websiteEnabled':'yes','portfolioEnabled':'yes','showModeSwitch':'no'})
    overrides={'site-settings.json':settings,'profile.json':profile}
    def route(route):
        rel=urlparse(route.request.url).path.lstrip('/') or 'index.html'
        if rel.startswith('data/'):
            name=rel.split('/',1)[1]
            if name in overrides:
                route.fulfill(status=200,body=json.dumps(overrides[name]),content_type='application/json');return
        fp=ROOT/rel
        if fp.exists() and fp.is_file():
            ct={'.json':'application/json','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'}.get(fp.suffix,'application/octet-stream')
            route.fulfill(status=200,body=fp.read_bytes(),content_type=ct)
        else: route.fulfill(status=404,body='not found')
    p.route(BASE+'**',route)
    p.set_content(HTML,wait_until='domcontentloaded')
    try:p.wait_for_function("document.documentElement.classList.contains('cs-boot-ready') || document.documentElement.classList.contains('cs-boot-failed')",timeout=15000)
    except Exception as e:errs.append(f'boot-timeout:{e}')
    p.wait_for_timeout(300)
    return c,p,errs

def snap(p):
    return p.evaluate('''() => {
      const el=id=>document.getElementById(id);
      const hidden=n=>!n || n.hidden || n.classList.contains('hide') || n.classList.contains('cs-mode-hidden') || getComputedStyle(n).display==='none';
      const rect=n=>n?({x:Math.round(n.getBoundingClientRect().x),y:Math.round(n.getBoundingClientRect().y),w:Math.round(n.getBoundingClientRect().width),h:Math.round(n.getBoundingClientRect().height)}):null;
      const attrs=id=>{const n=el(id);return n?{href:n.getAttribute('href'),target:n.getAttribute('target'),rel:n.getAttribute('rel'),text:n.textContent,hidden:hidden(n)}:null};
      const ids=['csPortfolioInitials','csPortfolioAvatar','csPortfolioName','csPortfolioCardName','csPortfolioRole','csPortfolioTagline','csPortfolioAvailability','csPortfolioLocation','csPortfolioExperience','csPortfolioBio','csPortfolioStatOneValue','csPortfolioStatOneLabel','csPortfolioStatTwoValue','csPortfolioStatTwoLabel'];
      return {
        bootReady:document.documentElement.classList.contains('cs-boot-ready'), bootFailed:document.documentElement.classList.contains('cs-boot-failed'),
        texts:Object.fromEntries(ids.map(id=>[id,el(id)?.textContent??null])),
        hidden:Object.fromEntries(ids.map(id=>[id,hidden(el(id))])),
        primary:attrs('csPortfolioPrimaryCta'), secondary:attrs('csPortfolioSecondaryCta'),
        actionsHidden:hidden(document.querySelector('.cs-portfolio-actions')),
        metaHidden:hidden(document.querySelector('.cs-portfolio-meta')),
        statsHidden:hidden(document.querySelector('.cs-portfolio-stats')),
        statCards:[...document.querySelectorAll('.cs-portfolio-stats > div')].map(n=>({hidden:hidden(n),text:n.textContent})),
        avatarRect:rect(el('csPortfolioAvatar')), profileRect:rect(el('csPortfolioProfileCard')),
        scrollWidth:document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth,
        navText:el('csPortfolioBrandText')?.textContent,
        sectionCount:document.querySelectorAll('.cs-portfolio-section').length
      };
    }''')

base=copy.deepcopy(DATA['profile.json'])
text_targets={
 'name':['csPortfolioName','csPortfolioCardName'], 'initials':['csPortfolioInitials','csPortfolioAvatar'],
 'role':['csPortfolioRole'], 'tagline':['csPortfolioTagline'], 'availability':['csPortfolioAvailability'],
 'location':['csPortfolioLocation'], 'experience':['csPortfolioExperience'], 'bio':['csPortfolioBio'],
 'statOneValue':['csPortfolioStatOneValue'], 'statOneLabel':['csPortfolioStatOneLabel'],
 'statTwoValue':['csPortfolioStatTwoValue'], 'statTwoLabel':['csPortfolioStatTwoLabel']
}
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    # Each text field applies and trims.
    for field,ids in text_targets.items():
        prof=copy.deepcopy(base);value=f'  AUDIT {field}  ';prof[field]=value
        c,p,e=open_case(b,prof);s=snap(p)
        rec(f'{field}_applies_and_trims',all(s['texts'][i]==value.strip() for i in ids),{'values':{i:s['texts'][i] for i in ids},'errors':e});c.close()
    # HTML should be text, not executable.
    prof=copy.deepcopy(base);prof['name']='<img src=x onerror="window.__pwn=1">Name'
    c,p,e=open_case(b,prof);s=snap(p);rec('profile_text_escaped','<img' in s['texts']['csPortfolioName'] and p.locator('#csPortfolioName img').count()==0 and not p.evaluate('()=>window.__pwn===1'),{'snap':s,'errors':e});c.close()
    # Blank optional text should hide cleanly, no empty pills/paragraphs/cards.
    optional=['tagline','availability','location','experience','bio']
    for field in optional:
        prof=copy.deepcopy(base);prof[field]='   '
        c,p,e=open_case(b,prof);s=snap(p);target=text_targets[field][0]
        rec(f'{field}_blank_hides_target',s['hidden'][target],{'hidden':s['hidden'][target],'text':s['texts'][target],'errors':e});c.close()
    prof=copy.deepcopy(base);prof['location']=' ';prof['experience']=' '
    c,p,e=open_case(b,prof);s=snap(p);rec('both_meta_blank_hides_meta_container',s['metaHidden'],s);c.close()
    # Required title identity fields receive safe fallbacks.
    for field in ['name','initials','role']:
        prof=copy.deepcopy(base);prof[field]='   '
        c,p,e=open_case(b,prof);s=snap(p)
        ids=text_targets[field]
        rec(f'{field}_blank_has_nonempty_fallback',all(bool(s['texts'][i].strip()) for i in ids),{i:s['texts'][i] for i in ids});c.close()
    # Stats hide individually when both value/label blank; whole container when both blank.
    prof=copy.deepcopy(base);prof['statOneValue']=' ';prof['statOneLabel']=' '
    c,p,e=open_case(b,prof);s=snap(p);rec('stat_one_blank_hides_first_card',s['statCards'][0]['hidden'],s);rec('stat_two_remains_visible',not s['statCards'][1]['hidden'],s);c.close()
    prof=copy.deepcopy(base);prof.update({'statOneValue':' ','statOneLabel':' ','statTwoValue':' ','statTwoLabel':' '})
    c,p,e=open_case(b,prof);s=snap(p);rec('all_stats_blank_hides_container',s['statsHidden'],s);c.close()
    # CTA URL behavior and unsafe/blank hiding.
    cases=[
      ('external','https://example.com/path','_blank','noopener noreferrer',False),
      ('internal','#csPortfolioProjects',None,None,False),
      ('relative','docs/page.html',None,None,False),
      ('mailto','mailto:test@example.com',None,None,False),
      ('tel','tel:+911234567890',None,None,False),
      ('unsafe','javascript:alert(1)',None,None,True),
      ('blank','   ',None,None,True),
    ]
    for label,link,target,rel,should_hide in cases:
        prof=copy.deepcopy(base);prof['primaryCtaLink']=link;prof['primaryCtaText']='Primary Audit'
        c,p,e=open_case(b,prof);s=snap(p);a=s['primary']
        rec(f'primary_cta_{label}',a['hidden']==should_hide and (should_hide or (a['target']==target and a['rel']==rel)),{'anchor':a,'errors':e});c.close()
    # Blank CTA text should hide its button rather than show href/default unexpectedly.
    prof=copy.deepcopy(base);prof['primaryCtaText']=' ';prof['primaryCtaLink']='https://example.com'
    c,p,e=open_case(b,prof);s=snap(p);rec('primary_cta_blank_text_hides_button',s['primary']['hidden'],s['primary']);c.close()
    # Both buttons absent hides actions row.
    prof=copy.deepcopy(base);prof.update({'primaryCtaText':' ','primaryCtaLink':' ','secondaryCtaText':' ','secondaryCtaLink':' '})
    c,p,e=open_case(b,prof);s=snap(p);rec('both_ctas_blank_hide_actions_row',s['actionsHidden'],s);c.close()
    # External -> internal live re-render must clear target/rel (invoke renderPortfolio twice through changed route not exposed; direct helper behavior via data swap/reload is covered by isolated contexts).
    # Malformed profile roots must not crash.
    for label,val in [('null',None),('array',[]),('string','bad'),('number',7),('boolean',True)]:
        c,p,e=open_case(b,val);s=snap(p);rec(f'malformed_profile_{label}_does_not_crash',s['bootReady'] and not s['bootFailed'] and not any(x.startswith('pageerror:') or 'boot-timeout' in x for x in e) and bool(s['texts']['csPortfolioName']),{'errors':e,'snap':s});c.close()
    # Long content and initials should not overflow at mobile widths.
    prof=copy.deepcopy(base);prof.update({'name':'N'*250,'initials':'INITIALS'*20,'role':'R'*300,'tagline':'T'*1000,'availability':'A'*300,'location':'L'*300,'experience':'E'*800,'bio':'B'*1500,'statOneValue':'V'*200,'statOneLabel':'S'*500,'statTwoValue':'W'*200,'statTwoLabel':'Q'*500,'primaryCtaText':'P'*200,'secondaryCtaText':'C'*200})
    c,p,e=open_case(b,prof,viewport={'width':360,'height':800});s=snap(p)
    rec('long_profile_content_no_horizontal_overflow',s['scrollWidth']<=s['clientWidth'],s)
    rec('long_profile_content_no_errors',not e,e)
    rec('long_initials_stay_inside_avatar',s['avatarRect']['w']<=110 and s['avatarRect']['h']<=110,s['avatarRect'])
    c.close()
    # Profile changes must not alter unrelated brand/section structure.
    prof=copy.deepcopy(base);prof['name']='Isolation Name';prof['role']='Isolation Role'
    c,p,e=open_case(b,prof);s=snap(p);rec('profile_fields_do_not_change_portfolio_brand',s['navText']==DATA['portfolio-settings.json']['brandText'],s);rec('profile_fields_do_not_remove_sections',s['sectionCount']>=4,s);c.close()
    b.close()

out=ROOT/'docs/PROFILE_FIELD_INDIVIDUAL_AUDIT.json'
failed=[r for r in results if not r['passed']]
out.write_text(json.dumps({'group':'Portfolio Profile and Hero','fields':list(base.keys()),'targeted_checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'results':results},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'failed_tests':[r['test'] for r in failed]},indent=2))
