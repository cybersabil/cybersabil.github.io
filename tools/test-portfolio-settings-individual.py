from __future__ import annotations
import copy, json, subprocess
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE='https://cybersabil-portfolio-settings.test/'
HTML=(ROOT/'index.html').read_text(encoding='utf-8').replace('<head>',f'<head><base href="{BASE}"><style>*,*::before,*::after{{animation:none!important;transition:none!important}}</style>',1)
DATA={p.name:json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'data').glob('*.json')}
results=[]
def rec(name,passed,details=None): results.append({'test':name,'passed':bool(passed),'details':details or {}})

def open_case(browser, ps=None, projects=None, viewport=None):
    viewport=viewport or {'width':1366,'height':768}
    c=browser.new_context(viewport=viewport)
    p=c.new_page(); errs=[]
    p.on('pageerror',lambda e: errs.append(f'pageerror:{e}'))
    p.on('console',lambda m: errs.append(f'console:{m.text}') if m.type=='error' else None)
    settings=copy.deepcopy(DATA['site-settings.json']);settings.update({'gatewayEnabled':'no','defaultMode':'portfolio','websiteEnabled':'yes','portfolioEnabled':'yes','showModeSwitch':'no'})
    overrides={'site-settings.json':settings,'portfolio-settings.json':ps or copy.deepcopy(DATA['portfolio-settings.json'])}
    if projects is not None: overrides['portfolio-projects.json']=projects
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
    p.wait_for_timeout(400)
    return c,p,errs

def snap(p):
    return p.evaluate('''() => {
      const app=document.getElementById('csPortfolioApp');
      const hero=document.getElementById('csPortfolioHero');
      const profile=document.getElementById('csPortfolioProfileCard');
      const heroCopy=document.querySelector('.cs-portfolio-hero-copy');
      const nav=document.getElementById('csPortfolioNav');
      const toggle=document.getElementById('portfolioNavToggle');
      const el=id=>document.getElementById(id);
      const rect=n=>n?({x:Math.round(n.getBoundingClientRect().x),y:Math.round(n.getBoundingClientRect().y),w:Math.round(n.getBoundingClientRect().width),h:Math.round(n.getBoundingClientRect().height)}):null;
      const style=n=>n?getComputedStyle(n):null;
      const ids=['csPortfolioSkills','csPortfolioProjects','csPortfolioTimeline','csPortfolioServices','csPortfolioContact'];
      return {
        appClasses:[...app.classList], background:style(app).backgroundImage,
        brand:el('csPortfolioBrandText').textContent,
        navHidden:nav.classList.contains('cs-mode-hidden'),navDisplay:style(nav).display,
        toggleHidden:toggle.classList.contains('cs-mode-hidden')||toggle.hidden,toggleDisplay:style(toggle).display,
        labels:['csPortfolioNavSkills','csPortfolioNavProjects','csPortfolioNavTimeline','csPortfolioNavServices','csPortfolioNavContact'].map(id=>el(id).textContent),
        navLinkDisplay:['csPortfolioNavSkills','csPortfolioNavProjects','csPortfolioNavTimeline','csPortfolioNavServices','csPortfolioNavContact'].map(id=>style(el(id)).display),
        heroHidden:el('csPortfolioHero').classList.contains('cs-mode-hidden'),profileHidden:profile.classList.contains('cs-mode-hidden'),
        heroRect:rect(hero),profileRect:rect(profile),heroCopyRect:rect(heroCopy),heroColumns:style(hero).gridTemplateColumns,
        sectionHidden:ids.map(id=>el(id).classList.contains('cs-mode-hidden')),sectionDisplay:ids.map(id=>style(el(id)).display),
        texts:{
          skills:[el('csPortfolioSkillsEyebrow').textContent,el('csPortfolioSkillsTitle').textContent,el('csPortfolioSkillsSubtitle').textContent],
          projects:[el('csPortfolioProjectsEyebrow').textContent,el('csPortfolioProjectsTitle').textContent,el('csPortfolioProjectsSubtitle').textContent],
          timeline:[el('csPortfolioTimelineEyebrow').textContent,el('csPortfolioTimelineTitle').textContent,el('csPortfolioTimelineSubtitle').textContent],
          services:[el('csPortfolioServicesEyebrow').textContent,el('csPortfolioServicesTitle').textContent,el('csPortfolioServicesSubtitle').textContent],
          contact:el('csPortfolioContactEyebrow').textContent,
          footer:el('csPortfolioFooterText').textContent
        },
        projectLinks:[...document.querySelectorAll('#csPortfolioProjectsGrid .cs-portfolio-project-link')].map(a=>({text:a.textContent,href:a.getAttribute('href'),target:a.getAttribute('target')})),
        containerWidth:Math.round(document.querySelector('.cs-portfolio-container').getBoundingClientRect().width),
        sectionPadding:style(el('csPortfolioSkills')).paddingTop,
        scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth
      };
    }''')

base=copy.deepcopy(DATA['portfolio-settings.json'])
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    # Theme distinct + reset
    snaps={}
    for v in ['purple-gold','midnight']:
        ps=copy.deepcopy(base);ps['themePreset']=v
        c,p,e=open_case(b,ps);snaps[v]=snap(p);rec(f'theme_{v}_no_errors',not e,e);c.close()
    rec('theme_options_distinct',snaps['purple-gold']['background']!=snaps['midnight']['background'],snaps)
    rec('theme_classes_exclusive',('cs-portfolio-theme-midnight' not in snaps['purple-gold']['appClasses']) and ('cs-portfolio-theme-midnight' in snaps['midnight']['appClasses']),snaps)
    # Layout distinct
    layouts={}
    for v in ['professional','compact','spacious']:
        ps=copy.deepcopy(base);ps['layoutPreset']=v
        c,p,e=open_case(b,ps);layouts[v]=snap(p);rec(f'layout_{v}_no_errors',not e,e);c.close()
    signatures={v:(s['containerWidth'],s['heroRect']['y'],s['heroRect']['h'],s['sectionPadding']) for v,s in layouts.items()}
    rec('layout_options_distinct',len(set(signatures.values()))==3,signatures)
    rec('layout_class_exclusive',all(sum(cls in s['appClasses'] for cls in ['cs-portfolio-layout-professional','cs-portfolio-layout-compact','cs-portfolio-layout-spacious'])==1 for s in layouts.values()),layouts)
    # Text fields normal and hostile/whitespace
    text_fields={
      'brandText':('brand','BRAND AUDIT'),
      'navSkillsLabel':('labels',0,'SKILLS AUDIT'),'navProjectsLabel':('labels',1,'PROJECTS AUDIT'),'navTimelineLabel':('labels',2,'TIMELINE AUDIT'),'navServicesLabel':('labels',3,'SERVICES AUDIT'),'navContactLabel':('labels',4,'CONTACT AUDIT'),
      'skillsEyebrow':('texts','skills',0,'SK EYEBROW'),'skillsTitle':('texts','skills',1,'SK TITLE'),'skillsSubtitle':('texts','skills',2,'SK SUBTITLE'),
      'projectsEyebrow':('texts','projects',0,'PR EYEBROW'),'projectsTitle':('texts','projects',1,'PR TITLE'),'projectsSubtitle':('texts','projects',2,'PR SUBTITLE'),
      'timelineEyebrow':('texts','timeline',0,'TL EYEBROW'),'timelineTitle':('texts','timeline',1,'TL TITLE'),'timelineSubtitle':('texts','timeline',2,'TL SUBTITLE'),
      'servicesEyebrow':('texts','services',0,'SV EYEBROW'),'servicesTitle':('texts','services',1,'SV TITLE'),'servicesSubtitle':('texts','services',2,'SV SUBTITLE'),
      'contactEyebrow':('texts','contact','CONTACT EYEBROW'),'footerText':('texts','footer','FOOTER AUDIT')}
    for field,spec in text_fields.items():
        ps=copy.deepcopy(base); val=spec[-1];ps[field]=f'  {val}  '
        c,p,e=open_case(b,ps);s=snap(p)
        if spec[0]=='brand':actual=s['brand']
        elif spec[0]=='labels':actual=s['labels'][spec[1]]
        elif len(spec)==4:actual=s['texts'][spec[1]][spec[2]]
        else:actual=s['texts'][spec[1]]
        rec(f'{field}_applies_and_trims',actual==val,{'actual':actual,'errors':e});c.close()
    # hostile text should be text only
    ps=copy.deepcopy(base);ps['skillsTitle']='<img src=x onerror="window.__pwn=1">Title'
    c,p,e=open_case(b,ps);s=snap(p);rec('portfolio_setting_text_escaped','<img' in s['texts']['skills'][1] and p.locator('#csPortfolioSkillsTitle img').count()==0 and not p.evaluate('()=>window.__pwn===1'),s);c.close()
    # navigation visibility mobile
    for v in ['yes','no']:
        ps=copy.deepcopy(base);ps['showNavigation']=v
        c,p,e=open_case(b,ps,viewport={'width':390,'height':844});s=snap(p)
        expected=(v=='no')
        rec(f'showNavigation_{v}_links',s['navHidden']==expected,s)
        rec(f'showNavigation_{v}_toggle',s['toggleHidden']==expected,s)
        c.close()
    # section visibility and corresponding nav link
    vis_fields=[('showSkillsSection',0),('showProjectsSection',1),('showTimelineSection',2),('showServicesSection',3),('showContactSection',4)]
    for field,idx in vis_fields:
        ps=copy.deepcopy(base);ps[field]='no'
        c,p,e=open_case(b,ps);s=snap(p)
        rec(f'{field}_hides_section',s['sectionHidden'][idx] and s['sectionDisplay'][idx]=='none',s)
        rec(f'{field}_hides_nav_link',s['navLinkDisplay'][idx]=='none',s)
        # other sections remain visible
        rec(f'{field}_isolated',all((j==idx) or (not s['sectionHidden'][j]) for j in range(5)),s)
        c.close()
    # hero/profile visibility and geometry
    ps=copy.deepcopy(base);ps['showHero']='no'
    c,p,e=open_case(b,ps);s=snap(p);rec('showHero_no_hides_hero',s['heroHidden'] and s['heroRect']['h']==0,s);c.close()
    ps=copy.deepcopy(base);ps['showProfileCard']='no';ps['showHero']='yes'
    c,p,e=open_case(b,ps);s=snap(p)
    rec('showProfileCard_no_hides_card',s['profileHidden'],s)
    rec('profile_hidden_hero_reflows_single_column',len(s['heroColumns'].split())==1 and s['heroCopyRect']['w']>850, s)
    c.close()
    # project link show/hide and fallback label
    projects=[{'title':'P','category':'C','status':'Live','description':'D','tech':'T','link':'https://example.com','buttonText':''}]
    for v in ['yes','no']:
        ps=copy.deepcopy(base);ps['showProjectLinks']=v;ps['projectLinkLabel']='  DEFAULT LINK  '
        c,p,e=open_case(b,ps,projects);s=snap(p)
        rec(f'showProjectLinks_{v}',len(s['projectLinks'])==(1 if v=='yes' else 0),s['projectLinks'])
        if v=='yes':rec('projectLinkLabel_fallback_trims',s['projectLinks'][0]['text']=='DEFAULT LINK',s['projectLinks'])
        c.close()
    projects=[{'title':'P','category':'C','status':'Live','description':'D','tech':'T','link':'https://example.com','buttonText':'CUSTOM'}]
    ps=copy.deepcopy(base);ps['showProjectLinks']='yes';ps['projectLinkLabel']='DEFAULT'
    c,p,e=open_case(b,ps,projects);s=snap(p);rec('individual_project_button_overrides_default',s['projectLinks'][0]['text']=='CUSTOM',s['projectLinks']);c.close()
    # mobile no overflow with long labels/text
    ps=copy.deepcopy(base);ps.update({'brandText':'B'*180,'navSkillsLabel':'S'*120,'skillsTitle':'T'*150,'skillsSubtitle':'U'*500,'footerText':'F'*500})
    c,p,e=open_case(b,ps,viewport={'width':360,'height':800});s=snap(p);rec('long_portfolio_settings_no_horizontal_overflow',s['scrollWidth']<=s['clientWidth'],s);rec('long_portfolio_settings_no_errors',not e,e);c.close()
    b.close()

out=ROOT/'docs/PORTFOLIO_SETTINGS_FIELD_INDIVIDUAL_AUDIT.json'
failed=[r for r in results if not r['passed']]
out.write_text(json.dumps({'group':'Portfolio Settings and Navigation','fields':list(base.keys()),'targeted_checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'results':results},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'failed_tests':[r['test'] for r in failed]},indent=2))
