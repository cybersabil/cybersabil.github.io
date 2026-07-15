from __future__ import annotations
import copy, json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://cybersabil-portfolio-timeline.test/'
HTML = (ROOT/'index.html').read_text(encoding='utf-8').replace(
    '<head>',
    f'<head><base href="{BASE}"><style>*,*::before,*::after{{animation:none!important;transition:none!important}}</style>',
    1
)
DATA = {p.name: json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'data').glob('*.json')}
results=[]
def rec(name, passed, details=None):
    results.append({'test':name,'passed':bool(passed),'details':details or {}})

def open_case(browser, timeline, viewport=None, portfolio_settings=None):
    viewport = viewport or {'width':1366,'height':900}
    c = browser.new_context(viewport=viewport)
    p = c.new_page(); errs=[]
    p.on('pageerror', lambda e: errs.append(f'pageerror:{e}'))
    p.on('console', lambda m: errs.append(f'console:{m.text}') if m.type=='error' else None)
    settings=copy.deepcopy(DATA['site-settings.json'])
    settings.update({'gatewayEnabled':'no','defaultMode':'portfolio','websiteEnabled':'yes','portfolioEnabled':'yes','showModeSwitch':'no'})
    ps=copy.deepcopy(DATA['portfolio-settings.json'])
    ps.update({'showSkillsSection':'yes','showProjectsSection':'yes','showTimelineSection':'yes','showServicesSection':'yes','showContactSection':'yes'})
    if portfolio_settings: ps.update(portfolio_settings)
    overrides={'site-settings.json':settings,'portfolio-settings.json':ps,'portfolio-timeline.json':timeline}
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
      const list=document.getElementById('csPortfolioTimelineList');
      const section=document.getElementById('csPortfolioTimeline');
      const items=[...(list?.querySelectorAll('.cs-portfolio-timeline-item')||[])];
      const hidden=n=>!n || n.hidden || n.classList.contains('hide') || n.classList.contains('cs-mode-hidden') || getComputedStyle(n).display==='none';
      const rect=n=>n?({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height,right:n.getBoundingClientRect().right,bottom:n.getBoundingClientRect().bottom}):null;
      const before = list ? getComputedStyle(list,'::before') : null;
      return {
        bootReady:document.documentElement.classList.contains('cs-boot-ready'),
        bootFailed:document.documentElement.classList.contains('cs-boot-failed'),
        sectionHidden:hidden(section),
        emptyText:list?.textContent || '',
        listRect:rect(list),
        line:{left:before?.left,top:before?.top,bottom:before?.bottom,width:before?.width},
        items:items.map(n=>{
          const card=n.querySelector('.cs-portfolio-timeline-card');
          const marker=n.querySelector('.cs-portfolio-timeline-marker');
          const status=n.querySelector('.cs-portfolio-project-tech');
          const paras=[...card.querySelectorAll(':scope > p')];
          const description=paras.find(x=>!x.classList.contains('cs-portfolio-project-tech'));
          return {
            badge:card.querySelector('.cs-portfolio-card-label')?.textContent ?? null,
            title:card.querySelector('h3')?.textContent ?? null,
            status:status?.textContent ?? null,
            description:description?.textContent ?? null,
            paragraphCount:paras.length,
            itemRect:rect(n),cardRect:rect(card),markerRect:rect(marker),
            html:card.innerHTML
          };
        }),
        scrollWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        skillCount:document.querySelectorAll('#csPortfolioSkillsGrid .cs-portfolio-skill-card').length,
        projectCount:document.querySelectorAll('#csPortfolioProjectsGrid .cs-portfolio-project-card').length,
        scripts:list?.querySelectorAll('script').length || 0,
        images:list?.querySelectorAll('img').length || 0,
      };
    }''')

base=copy.deepcopy(DATA['portfolio-timeline.json'])
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    c,p,e=open_case(b,base);s=snap(p)
    rec('baseline_renders_all_entries',len(s['items'])==len(base),{'count':len(s['items']),'errors':e})
    rec('baseline_boot_no_errors',s['bootReady'] and not s['bootFailed'] and not e,{'errors':e})
    baseline_other=(s['skillCount'],s['projectCount']); c.close()

    # Each field applies and trims.
    for field in ['period','title','status','description']:
        items=copy.deepcopy(base); items[0][field]=f'  AUDIT {field}  '
        c,p,e=open_case(b,items);s=snap(p);card=s['items'][0]
        expected=f'AUDIT {field}'
        actual={'period':card['badge'],'title':card['title'],'status':(card['status'] or '').replace('Status: ','',1),'description':card['description']}[field]
        rec(f'{field}_applies_and_trims',actual==expected,{'actual':actual,'expected':expected,'card':card,'errors':e}); c.close()

    # Period and status must be independent and not duplicate.
    items=copy.deepcopy(base);items[0].update({'period':'Period Only','status':'Status Only'})
    c,p,e=open_case(b,items);s=snap(p);card=s['items'][0]
    rec('period_and_status_render_independently',card['badge']=='Period Only' and card['status']=='Status: Status Only',card);c.close()
    items=copy.deepcopy(base);items[0].update({'period':'   ','status':'Active'})
    c,p,e=open_case(b,items);s=snap(p);card=s['items'][0]
    rec('blank_period_uses_timeline_badge_not_duplicate_status',card['badge']=='Timeline' and card['status']=='Status: Active',card);c.close()

    # Blank/whitespace fields.
    cases=[
      ('title','Untitled timeline entry'),
      ('period','Timeline'),
    ]
    for field,expected in cases:
        items=copy.deepcopy(base);items[0][field]='   '
        c,p,e=open_case(b,items);s=snap(p);card=s['items'][0]
        actual=card['title'] if field=='title' else card['badge']
        rec(f'blank_{field}_uses_safe_fallback',actual==expected,{'actual':actual,'card':card});c.close()
    items=copy.deepcopy(base);items[0]['status']='   '
    c,p,e=open_case(b,items);s=snap(p);rec('blank_status_hides_status_line',s['items'][0]['status'] is None,s['items'][0]);c.close()
    items=copy.deepcopy(base);items[0]['description']='   '
    c,p,e=open_case(b,items);s=snap(p);rec('blank_description_hides_description_paragraph',s['items'][0]['description'] is None,s['items'][0]);c.close()
    items=copy.deepcopy(base);items[0].update({'status':' ','description':' '})
    c,p,e=open_case(b,items);s=snap(p);rec('both_optional_lines_blank_leave_no_paragraphs',s['items'][0]['paragraphCount']==0,s['items'][0]);c.close()

    # Missing and malformed items.
    c,p,e=open_case(b,[{}]);s=snap(p)
    rec('missing_fields_render_safe_entry',len(s['items'])==1 and s['items'][0]['badge']=='Timeline' and s['items'][0]['title']=='Untitled timeline entry' and s['items'][0]['paragraphCount']==0,{'snap':s,'errors':e});c.close()
    for label,item in [('null',None),('array',[]),('string','bad'),('number',7),('boolean',True)]:
        c,p,e=open_case(b,[item]);s=snap(p)
        rec(f'malformed_item_{label}_does_not_crash',s['bootReady'] and not s['bootFailed'] and len(s['items'])==1 and s['items'][0]['title']=='Untitled timeline entry' and not e,{'snap':s,'errors':e});c.close()
    items=[{'period':123,'title':False,'status':7,'description':True}]
    c,p,e=open_case(b,items);s=snap(p);card=s['items'][0]
    rec('primitive_values_stringify_safely',card['badge']=='123' and card['title']=='false' and card['status']=='Status: 7' and card['description']=='true',card);c.close()

    # HTML escaping.
    payload='<img src=x onerror="window.__pwn=1"><script>window.__pwn=1</script>'
    items=[{'period':payload,'title':payload,'status':payload,'description':payload}]
    c,p,e=open_case(b,items);s=snap(p)
    rec('all_timeline_fields_escape_html',s['images']==0 and s['scripts']==0 and not p.evaluate('()=>window.__pwn===1') and '<img' in s['items'][0]['title'],{'snap':s,'errors':e});c.close()

    # List operations.
    added=copy.deepcopy(base)+[{'period':'vNext','title':'Added Entry','status':'Planned','description':'Added Description'}]
    c,p,e=open_case(b,added);s=snap(p);rec('add_entry_renders_new_item',len(s['items'])==len(base)+1 and s['items'][-1]['title']=='Added Entry',{'last':s['items'][-1]});c.close()
    deleted=copy.deepcopy(base)[1:]
    c,p,e=open_case(b,deleted);s=snap(p);rec('delete_entry_removes_item',len(s['items'])==len(base)-1 and s['items'][0]['title']==base[1]['title'],{'first':s['items'][0]});c.close()
    reordered=list(reversed(copy.deepcopy(base)))
    c,p,e=open_case(b,reordered);s=snap(p);rec('reorder_entries_preserves_exact_order',[x['title'] for x in s['items']]==[x['title'] for x in reordered],{'titles':[x['title'] for x in s['items']]});c.close()
    duplicate=[copy.deepcopy(base[0]),copy.deepcopy(base[0])]
    c,p,e=open_case(b,duplicate);s=snap(p);rec('duplicate_entries_render_independently',len(s['items'])==2 and s['items'][0]['title']==s['items'][1]['title'],{'items':s['items']});c.close()

    # Empty/non-array roots.
    c,p,e=open_case(b,[]);s=snap(p);rec('empty_array_shows_empty_state',len(s['items'])==0 and 'No timeline entries found' in s['emptyText'],{'snap':s,'errors':e});c.close()
    for label,root in [('null',None),('object',{}),('string','bad'),('number',4),('boolean',False)]:
        c,p,e=open_case(b,root);s=snap(p)
        rec(f'non_array_root_{label}_shows_safe_empty_state',s['bootReady'] and not s['bootFailed'] and len(s['items'])==0 and 'No timeline entries found' in s['emptyText'] and not e,{'snap':s,'errors':e});c.close()

    # Section visibility and isolation.
    c,p,e=open_case(b,base,portfolio_settings={'showTimelineSection':'no'});s=snap(p);rec('portfolio_settings_can_hide_timeline_section',s['sectionHidden'],s);c.close()
    changed=copy.deepcopy(base);changed[0]['title']='Isolation Timeline'
    c,p,e=open_case(b,changed);s=snap(p);rec('timeline_changes_do_not_change_skills_or_projects',(s['skillCount'],s['projectCount'])==baseline_other,{'actual':(s['skillCount'],s['projectCount']),'baseline':baseline_other});c.close()

    # Responsive geometry and no overflow.
    for width,height in [(1366,900),(1024,768),(768,1024),(430,932),(360,800)]:
        c,p,e=open_case(b,base,viewport={'width':width,'height':height});s=snap(p)
        markers=s['items']
        centers=[round(x['markerRect']['x']+x['markerRect']['w']/2,1) for x in markers]
        consistent=max(centers)-min(centers)<=1 if centers else True
        rec(f'timeline_marker_column_consistent_{width}',consistent,{'centers':centers,'line':s['line'],'errors':e})
        rec(f'no_horizontal_overflow_{width}',s['scrollWidth']<=s['clientWidth'],{'scrollWidth':s['scrollWidth'],'clientWidth':s['clientWidth'],'errors':e});c.close()
    long='LONGUNBROKENVALUE'*250
    items=[{'period':long,'title':long,'status':long,'description':long}]
    for width,height in [(360,800),(430,932),(768,1024),(1366,900)]:
        c,p,e=open_case(b,items,viewport={'width':width,'height':height});s=snap(p)
        rec(f'long_content_no_horizontal_overflow_{width}',s['scrollWidth']<=s['clientWidth'],{'scrollWidth':s['scrollWidth'],'clientWidth':s['clientWidth'],'errors':e});c.close()

    # Timeline cards stay right of marker and vertically ordered.
    c,p,e=open_case(b,base,viewport={'width':1366,'height':1200});s=snap(p)
    rec('cards_stay_to_right_of_markers',all(x['cardRect']['x'] > x['markerRect']['right'] for x in s['items']),{'items':s['items']})
    ys=[x['itemRect']['y'] for x in s['items']]
    rec('timeline_order_is_visually_monotonic',ys==sorted(ys) and len(set(ys))==len(ys),{'ys':ys});c.close()

    # Large list stability.
    huge=[{'period':f'P{i}','title':f'Timeline {i}','status':f'Status {i%4}','description':f'Description {i}'} for i in range(200)]
    c,p,e=open_case(b,huge,viewport={'width':1366,'height':900});s=snap(p)
    rec('large_200_item_list_renders_without_error',len(s['items'])==200 and s['bootReady'] and not e,{'count':len(s['items']),'errors':e});c.close()

    b.close()

failed=[r for r in results if not r['passed']]
out=ROOT/'docs/PORTFOLIO_TIMELINE_FIELD_INDIVIDUAL_AUDIT.json'
out.write_text(json.dumps({'group':'Portfolio Timeline List','cms_fields':['period','title','status','description'],'targeted_checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'results':results},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'failed_tests':[r['test'] for r in failed]},indent=2))
