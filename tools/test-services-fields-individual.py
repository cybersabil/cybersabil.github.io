from __future__ import annotations
import copy, json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://cybersabil-portfolio-services.test/'
HTML = (ROOT/'index.html').read_text(encoding='utf-8').replace(
    '<head>',
    f'<head><base href="{BASE}"><style>*,*::before,*::after{{animation:none!important;transition:none!important}}</style>',
    1
)
DATA = {p.name: json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'data').glob('*.json')}
results=[]
def rec(name, passed, details=None): results.append({'test':name,'passed':bool(passed),'details':details or {}})

def open_case(browser, services, viewport=None, portfolio_settings=None):
    viewport=viewport or {'width':1366,'height':900}
    c=browser.new_context(viewport=viewport)
    p=c.new_page(); errs=[]
    p.on('pageerror', lambda e: errs.append(f'pageerror:{e}'))
    p.on('console', lambda m: errs.append(f'console:{m.text}') if m.type=='error' else None)
    settings=copy.deepcopy(DATA['site-settings.json'])
    settings.update({'gatewayEnabled':'no','defaultMode':'portfolio','websiteEnabled':'yes','portfolioEnabled':'yes','showModeSwitch':'no'})
    ps=copy.deepcopy(DATA['portfolio-settings.json'])
    ps.update({'showSkillsSection':'yes','showProjectsSection':'yes','showTimelineSection':'yes','showServicesSection':'yes','showContactSection':'yes'})
    if portfolio_settings: ps.update(portfolio_settings)
    overrides={'site-settings.json':settings,'portfolio-settings.json':ps,'services.json':services}
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
    try: p.wait_for_function("document.documentElement.classList.contains('cs-boot-ready') || document.documentElement.classList.contains('cs-boot-failed')",timeout=15000)
    except Exception as e: errs.append(f'boot-timeout:{e}')
    p.wait_for_timeout(200)
    return c,p,errs

def snap(p):
    return p.evaluate('''() => {
      const grid=document.getElementById('csPortfolioServicesGrid');
      const section=document.getElementById('csPortfolioServices');
      const cards=[...(grid?.querySelectorAll('.cs-portfolio-card')||[])];
      const hidden=n=>!n || n.hidden || n.classList.contains('hide') || n.classList.contains('cs-mode-hidden') || getComputedStyle(n).display==='none';
      const rect=n=>n?({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height,right:n.getBoundingClientRect().right,bottom:n.getBoundingClientRect().bottom}):null;
      return {
        bootReady:document.documentElement.classList.contains('cs-boot-ready'),
        bootFailed:document.documentElement.classList.contains('cs-boot-failed'),
        sectionHidden:hidden(section),
        gridText:grid?.textContent||'',
        gridRect:rect(grid),
        cards:cards.map(n=>({
          icon:n.querySelector('.cs-portfolio-card-label')?.textContent??null,
          title:n.querySelector('h3')?.textContent??null,
          description:n.querySelector('p')?.textContent??null,
          pCount:n.querySelectorAll(':scope > p').length,
          rect:rect(n),
          html:n.innerHTML
        })),
        scrollWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        scripts:grid?.querySelectorAll('script').length||0,
        images:grid?.querySelectorAll('img').length||0,
        skillCount:document.querySelectorAll('#csPortfolioSkillsGrid .cs-portfolio-skill-card').length,
        projectCount:document.querySelectorAll('#csPortfolioProjectsGrid .cs-portfolio-project-card').length,
        timelineCount:document.querySelectorAll('#csPortfolioTimelineList .cs-portfolio-timeline-item').length,
      };
    }''')

base=copy.deepcopy(DATA['services.json'])
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    c,p,e=open_case(b,base);s=snap(p)
    rec('baseline_renders_all_services',len(s['cards'])==len(base),{'count':len(s['cards']),'errors':e})
    rec('baseline_boot_no_errors',s['bootReady'] and not s['bootFailed'] and not e,{'errors':e})
    baseline_other=(s['skillCount'],s['projectCount'],s['timelineCount']);c.close()

    for field in ['icon','title','description']:
        items=copy.deepcopy(base);items[0][field]=f'  AUDIT {field}  '
        c,p,e=open_case(b,items);s=snap(p);card=s['cards'][0]
        actual={'icon':card['icon'],'title':card['title'],'description':card['description']}[field]
        rec(f'{field}_applies_and_trims',actual==f'AUDIT {field}',{'actual':actual,'card':card,'errors':e});c.close()

    # Blank and missing fields
    items=copy.deepcopy(base);items[0]['icon']='   '
    c,p,e=open_case(b,items);s=snap(p);rec('blank_icon_uses_service_fallback',s['cards'][0]['icon']=='Service',s['cards'][0]);c.close()
    items=copy.deepcopy(base);items[0]['title']='   '
    c,p,e=open_case(b,items);s=snap(p);rec('blank_title_uses_safe_fallback',s['cards'][0]['title']=='Untitled service',s['cards'][0]);c.close()
    items=copy.deepcopy(base);items[0]['description']='   '
    c,p,e=open_case(b,items);s=snap(p);rec('blank_description_hides_paragraph',s['cards'][0]['description'] is None and s['cards'][0]['pCount']==0,s['cards'][0]);c.close()
    c,p,e=open_case(b,[{}]);s=snap(p)
    rec('missing_fields_render_safe_service',len(s['cards'])==1 and s['cards'][0]['icon']=='Service' and s['cards'][0]['title']=='Untitled service' and s['cards'][0]['pCount']==0,{'snap':s,'errors':e});c.close()

    # Malformed entries/root
    for label,item in [('null',None),('array',[]),('string','bad'),('number',7),('boolean',True)]:
        c,p,e=open_case(b,[item]);s=snap(p)
        rec(f'malformed_item_{label}_does_not_crash',s['bootReady'] and not s['bootFailed'] and len(s['cards'])==1 and s['cards'][0]['title']=='Untitled service' and not e,{'snap':s,'errors':e});c.close()
    c,p,e=open_case(b,[{'icon':123,'title':False,'description':True}]);s=snap(p);card=s['cards'][0]
    rec('primitive_values_stringify_safely',card['icon']=='123' and card['title']=='false' and card['description']=='true',card);c.close()

    payload='<img src=x onerror="window.__pwn=1"><script>window.__pwn=1</script>'
    c,p,e=open_case(b,[{'icon':payload,'title':payload,'description':payload}]);s=snap(p)
    rec('all_service_fields_escape_html',s['images']==0 and s['scripts']==0 and not p.evaluate('()=>window.__pwn===1') and '<img' in s['cards'][0]['title'],{'snap':s,'errors':e});c.close()

    # List operations
    added=copy.deepcopy(base)+[{'icon':'Added','title':'Added Service','description':'Added Description'}]
    c,p,e=open_case(b,added);s=snap(p);rec('add_service_renders_new_card',len(s['cards'])==len(base)+1 and s['cards'][-1]['title']=='Added Service',s['cards'][-1]);c.close()
    deleted=copy.deepcopy(base)[1:]
    c,p,e=open_case(b,deleted);s=snap(p);rec('delete_service_removes_card',len(s['cards'])==len(base)-1 and s['cards'][0]['title']==base[1]['title'],s['cards'][0]);c.close()
    reordered=list(reversed(copy.deepcopy(base)))
    c,p,e=open_case(b,reordered);s=snap(p);rec('reorder_services_preserves_exact_order',[x['title'] for x in s['cards']]==[x['title'] for x in reordered],{'titles':[x['title'] for x in s['cards']]});c.close()
    duplicate=[copy.deepcopy(base[0]),copy.deepcopy(base[0])]
    c,p,e=open_case(b,duplicate);s=snap(p);rec('duplicate_services_render_independently',len(s['cards'])==2 and s['cards'][0]['title']==s['cards'][1]['title'],s['cards']);c.close()

    c,p,e=open_case(b,[]);s=snap(p);rec('empty_array_shows_empty_state',len(s['cards'])==0 and 'No portfolio services found' in s['gridText'],{'snap':s,'errors':e});c.close()
    for label,root in [('null',None),('object',{}),('string','bad'),('number',4),('boolean',False)]:
        c,p,e=open_case(b,root);s=snap(p)
        rec(f'non_array_root_{label}_shows_safe_empty_state',s['bootReady'] and not s['bootFailed'] and len(s['cards'])==0 and 'No portfolio services found' in s['gridText'] and not e,{'snap':s,'errors':e});c.close()

    # Section visibility and collateral isolation
    c,p,e=open_case(b,base,portfolio_settings={'showServicesSection':'no'});s=snap(p);rec('portfolio_settings_can_hide_services_section',s['sectionHidden'],s);c.close()
    changed=copy.deepcopy(base);changed[0]['title']='Isolation Service'
    c,p,e=open_case(b,changed);s=snap(p);rec('service_changes_do_not_change_other_portfolio_lists',(s['skillCount'],s['projectCount'],s['timelineCount'])==baseline_other,{'actual':(s['skillCount'],s['projectCount'],s['timelineCount']),'baseline':baseline_other});c.close()

    # Responsive layout/no overflow
    for width,height,expected_cols in [(1366,900,3),(1024,768,3),(768,1024,1),(430,932,1),(360,800,1)]:
        c,p,e=open_case(b,base,viewport={'width':width,'height':height});s=snap(p)
        ys=[round(x['rect']['y'],1) for x in s['cards']]
        first_y=ys[0] if ys else 0
        cols=sum(1 for y in ys if abs(y-first_y)<=1)
        rec(f'responsive_columns_{width}',cols==expected_cols,{'cols':cols,'expected':expected_cols,'ys':ys,'errors':e})
        rec(f'no_horizontal_overflow_{width}',s['scrollWidth']<=s['clientWidth'],{'scrollWidth':s['scrollWidth'],'clientWidth':s['clientWidth'],'errors':e});c.close()

    long='LONGUNBROKENVALUE'*250
    items=[{'icon':long,'title':long,'description':long}]
    for width,height in [(360,800),(430,932),(768,1024),(1366,900)]:
        c,p,e=open_case(b,items,viewport={'width':width,'height':height});s=snap(p)
        rec(f'long_content_no_horizontal_overflow_{width}',s['scrollWidth']<=s['clientWidth'],{'scrollWidth':s['scrollWidth'],'clientWidth':s['clientWidth'],'errors':e});c.close()

    # Equal heights for same row, repeated render, large list
    varied=[{'icon':'A','title':'Short','description':'Short'}, {'icon':'B','title':'Medium','description':'Long description '*12}, {'icon':'C','title':'Third','description':'Mid '*5}]
    c,p,e=open_case(b,varied,viewport={'width':1366,'height':900});s=snap(p);heights=[round(x['rect']['h'],1) for x in s['cards']]
    rec('desktop_grid_cards_equal_height',max(heights)-min(heights)<=1,{'heights':heights});c.close()
    huge=[{'icon':f'I{i}','title':f'Service {i}','description':f'Description {i}'} for i in range(200)]
    c,p,e=open_case(b,huge);s=snap(p);rec('large_200_item_list_renders_without_error',len(s['cards'])==200 and s['bootReady'] and not e,{'count':len(s['cards']),'errors':e});c.close()

    b.close()

failed=[r for r in results if not r['passed']]
out=ROOT/'docs/SERVICES_FIELD_INDIVIDUAL_AUDIT.json'
out.write_text(json.dumps({'group':'Portfolio Services List','cms_fields':['icon','title','description'],'targeted_checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'results':results},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'failed_tests':[r['test'] for r in failed]},indent=2))
