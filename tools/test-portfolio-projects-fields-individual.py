from __future__ import annotations
import copy, json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://cybersabil-portfolio-projects.test/'
HTML = (ROOT/'index.html').read_text(encoding='utf-8').replace(
    '<head>',
    f'<head><base href="{BASE}"><style>*,*::before,*::after{{animation:none!important;transition:none!important}}</style>',
    1
)
DATA = {p.name: json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'data').glob('*.json')}
results=[]
CASE_COUNTER=0
SHARED_CONTEXT=None
def rec(name, passed, details=None):
    results.append({'test':name,'passed':bool(passed),'details':details or {}})

def open_case(browser, projects, viewport=None, portfolio_settings=None):
    global CASE_COUNTER, SHARED_CONTEXT
    CASE_COUNTER += 1
    print(f"CASE {CASE_COUNTER}", flush=True)
    if SHARED_CONTEXT is None or (CASE_COUNTER - 1) % 20 == 0:
        if SHARED_CONTEXT is not None:
            SHARED_CONTEXT.close()
        SHARED_CONTEXT = browser.new_context()
    viewport = viewport or {'width':1366,'height':900}
    p = SHARED_CONTEXT.new_page(); p.set_viewport_size(viewport); errs=[]
    p.on('pageerror', lambda e: errs.append(f'pageerror:{e}'))
    p.on('console', lambda m: errs.append(f'console:{m.text}') if m.type=='error' else None)
    settings=copy.deepcopy(DATA['site-settings.json'])
    settings.update({'gatewayEnabled':'no','defaultMode':'portfolio','websiteEnabled':'yes','portfolioEnabled':'yes','showModeSwitch':'no'})
    ps=copy.deepcopy(DATA['portfolio-settings.json'])
    ps.update({'showSkillsSection':'yes','showProjectsSection':'yes','showTimelineSection':'yes','showServicesSection':'yes','showContactSection':'yes','showProjectLinks':'yes'})
    if portfolio_settings: ps.update(portfolio_settings)
    overrides={'site-settings.json':settings,'portfolio-settings.json':ps,'portfolio-projects.json':projects}
    def route(route):
        parsed=urlparse(route.request.url)
        if parsed.netloc != urlparse(BASE).netloc:
            if route.request.resource_type == 'image':
                fp=ROOT/'media/social-preview.png'
                route.fulfill(status=200,body=fp.read_bytes(),content_type='image/png',headers={'Cache-Control':'no-store'}); return
            route.abort(); return
        rel=parsed.path.lstrip('/') or 'index.html'
        if rel.startswith('data/'):
            name=rel.split('/',1)[1]
            if name in overrides:
                route.fulfill(status=200,body=json.dumps(overrides[name]),content_type='application/json',headers={'Cache-Control':'no-store'});return
        fp=ROOT/rel
        if fp.exists() and fp.is_file():
            ct={'.json':'application/json','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'}.get(fp.suffix,'application/octet-stream')
            route.fulfill(status=200,body=fp.read_bytes(),content_type=ct,headers={'Cache-Control':'no-store'})
        else: route.fulfill(status=404,body='not found')
    p.route('**/*',route)
    p.set_content(HTML,wait_until='domcontentloaded')
    try: p.wait_for_function("document.documentElement.classList.contains('cs-boot-ready') || document.documentElement.classList.contains('cs-boot-failed')",timeout=15000)
    except Exception as e: errs.append(f'boot-timeout:{e}')
    p.wait_for_timeout(350)
    return p,p,errs

def snap(p):
    return p.evaluate('''() => {
      const grid=document.getElementById('csPortfolioProjectsGrid');
      const section=document.getElementById('csPortfolioProjects');
      const cards=[...(grid?.querySelectorAll('.cs-portfolio-project-card')||[])];
      const hidden=n=>!n || n.hidden || n.classList.contains('hide') || n.classList.contains('cs-mode-hidden') || getComputedStyle(n).display==='none';
      const rect=n=>n?({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height,b:n.getBoundingClientRect().bottom}):null;
      return {
        bootReady:document.documentElement.classList.contains('cs-boot-ready'),
        bootFailed:document.documentElement.classList.contains('cs-boot-failed'),
        sectionHidden:hidden(section),
        emptyState:grid?.querySelector('.empty-state')?.textContent || grid?.textContent || '',
        cards:cards.map(n=>{
          const img=n.querySelector('.cs-portfolio-project-image');
          const link=n.querySelector('.cs-portfolio-project-link');
          const tech=n.querySelector('.cs-portfolio-project-tech');
          const paragraphs=[...n.children].filter(x=>x.tagName==='P' && !x.classList.contains('cs-portfolio-project-tech'));
          return {
            status:n.querySelector('.cs-portfolio-project-status')?.textContent ?? null,
            title:n.querySelector('h3')?.textContent ?? null,
            description:paragraphs[0]?.textContent ?? null,
            descriptionCount:paragraphs.length,
            tech:tech?.textContent ?? null,
            linkText:link?.textContent ?? null,
            linkHref:link?.getAttribute('href') ?? null,
            linkTarget:link?.getAttribute('target') ?? null,
            linkRel:link?.getAttribute('rel') ?? null,
            linkRect:rect(link),
            imageSrc:img?.getAttribute('src') ?? null,
            imageAlt:img?.getAttribute('alt') ?? null,
            imageHidden:img ? hidden(img) : True,
            imageNaturalWidth:img?.naturalWidth ?? 0,
            imageCount:n.querySelectorAll('img').length,
            paragraphCount:n.querySelectorAll('p').length,
            html:n.innerHTML,
            rect:rect(n)
          };
        }),
        gridColumns:grid?getComputedStyle(grid).gridTemplateColumns:null,
        scrollWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        skillCount:document.querySelectorAll('#csPortfolioSkillsGrid .cs-portfolio-skill-card').length,
        skillTitle:document.querySelector('#csPortfolioSkillsGrid h3')?.textContent || '',
        scripts:document.querySelectorAll('#csPortfolioProjectsGrid script').length,
        images:document.querySelectorAll('#csPortfolioProjectsGrid img').length
      };
    }'''.replace('True','true'))

base=copy.deepcopy(DATA['portfolio-projects.json'])
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    b=browser

    c,p,e=open_case(b,base);s=snap(p)
    rec('baseline_renders_all_projects',len(s['cards'])==len(base),{'cards':len(s['cards']),'errors':e})
    rec('baseline_boot_no_errors',s['bootReady'] and not s['bootFailed'] and not e,{'errors':e})
    baseline_skill=(s['skillCount'],s['skillTitle']);c.close()

    # Text fields apply and trim.
    checks={
      'title':lambda card,v:card['title']==v,
      'category':lambda card,v:v in (card['tech'] or ''),
      'status':lambda card,v:card['status']==v,
      'description':lambda card,v:card['description']==v,
      'tech':lambda card,v:v in (card['tech'] or ''),
      'buttonText':lambda card,v:card['linkText']==v,
      'imageAlt':lambda card,v:card['imageAlt']==v,
    }
    for field,check in checks.items():
        items=copy.deepcopy(base); value=f'  AUDIT {field}  ';items[0][field]=value
        if field=='imageAlt': items[0]['image']='media/social-preview.png'
        c,p,e=open_case(b,items);s=snap(p);card=s['cards'][0]
        rec(f'{field}_applies_and_trims',check(card,value.strip()),{'card':card,'errors':e});c.close()

    # Blank and missing fields.
    items=copy.deepcopy(base);items[0]['title']='   '
    c,p,e=open_case(b,items);s=snap(p);rec('blank_title_uses_safe_fallback',s['cards'][0]['title']=='Untitled project',s['cards'][0]);c.close()
    items=copy.deepcopy(base);items[0]['status']='   '
    c,p,e=open_case(b,items);s=snap(p);rec('blank_status_uses_project_fallback',s['cards'][0]['status']=='Project',s['cards'][0]);c.close()
    for field,key in [('description','description'),('category','tech'),('tech','tech')]:
        items=copy.deepcopy(base);items[0][field]='   '
        if field=='category': items[0]['tech']='   '
        if field=='tech': items[0]['category']='   '
        c,p,e=open_case(b,items);s=snap(p);card=s['cards'][0]
        if field=='description': passed=card['description'] is None and card['descriptionCount']==0
        else: passed=card['tech'] is None
        rec(f'blank_{field}_hides_empty_ui',passed,card);c.close()
    c,p,e=open_case(b,[{}]);s=snap(p)
    rec('missing_fields_render_safe_card',len(s['cards'])==1 and s['cards'][0]['title']=='Untitled project' and s['cards'][0]['status']=='Project' and s['cards'][0]['description'] is None and s['cards'][0]['tech'] is None and s['cards'][0]['linkHref'] is None,{'snap':s,'errors':e});c.close()

    # Malformed entries and root.
    for label,item in [('null',None),('array',[]),('string','bad'),('number',7),('boolean',True)]:
        c,p,e=open_case(b,[item]);s=snap(p)
        rec(f'malformed_item_{label}_does_not_crash',s['bootReady'] and not s['bootFailed'] and len(s['cards'])==1 and s['cards'][0]['title']=='Untitled project' and not e,{'snap':s,'errors':e});c.close()
    vals=[{'title':123,'category':False,'status':7,'description':True,'tech':9,'buttonText':3,'imageAlt':4}]
    c,p,e=open_case(b,vals);s=snap(p);card=s['cards'][0]
    rec('number_boolean_values_stringify_safely',card['title']=='123' and card['status']=='7' and card['description']=='true' and card['tech'] is not None,card);c.close()
    for label,root in [('null',None),('object',{}),('string','bad'),('number',4),('boolean',False)]:
        c,p,e=open_case(b,root);s=snap(p)
        rec(f'non_array_root_{label}_shows_safe_empty_state',s['bootReady'] and not s['bootFailed'] and len(s['cards'])==0 and 'No portfolio projects found' in s['emptyState'] and not e,{'snap':s,'errors':e});c.close()

    # HTML escaping.
    payload='<img src=x onerror="window.__pwn=1"><script>window.__pwn=1</script>'
    items=[{'title':payload,'category':payload,'status':payload,'description':payload,'tech':payload,'link':'#safe','buttonText':payload,'image':'','imageAlt':payload}]
    c,p,e=open_case(b,items);s=snap(p)
    rec('all_text_fields_escape_html',s['scripts']==0 and s['images']==0 and not p.evaluate('()=>window.__pwn===1') and '<img' in s['cards'][0]['title'],{'snap':s,'errors':e});c.close()

    # Link contracts.
    link_cases=[
      ('external_https','https://example.com/project',True,'_blank'),
      ('external_http','http://example.com/project',True,'_blank'),
      ('internal_hash','#contact',True,None),
      ('relative_path','projects/demo.html',True,None),
      ('mailto','mailto:test@example.com',True,None),
      ('tel','tel:+911234567890',True,None),
      ('blank','   ',False,None),
      ('hash_only','#',False,None),
      ('unsafe_javascript','javascript:alert(1)',False,None),
      ('unsafe_data','data:text/html,boom',False,None),
      ('unsafe_vbscript','vbscript:msgbox(1)',False,None),
    ]
    for name,url,visible,target in link_cases:
        items=copy.deepcopy(base);items[0]['link']=url;items[0]['buttonText']='Open project'
        c,p,e=open_case(b,items);s=snap(p);card=s['cards'][0]
        passed=(card['linkHref'] is not None)==visible
        if visible:
            passed=passed and card['linkTarget']==target and (card['linkRel']=='noopener noreferrer' if target=='_blank' else card['linkRel'] is None)
        rec(f'link_{name}_contract',passed,{'card':card,'errors':e});c.close()

    # Per-item and global button fallback.
    items=copy.deepcopy(base);items[0]['buttonText']='   ';items[0]['link']='#contact'
    c,p,e=open_case(b,items,portfolio_settings={'projectLinkLabel':'  Global project label  '});s=snap(p)
    rec('blank_button_text_uses_trimmed_global_fallback',s['cards'][0]['linkText']=='Global project label',s['cards'][0]);c.close()
    c,p,e=open_case(b,base,portfolio_settings={'showProjectLinks':'no'});s=snap(p)
    rec('show_project_links_no_hides_all_links',all(x['linkHref'] is None for x in s['cards']),{'cards':s['cards']});c.close()

    # Image contracts.
    img_cases=[
      ('relative','media/social-preview.png',True),
      ('external','https://example.com/preview.png',True),
      ('blank','   ',False),
      ('hash_only','#',False),
      ('unsafe_javascript','javascript:alert(1)',False),
      ('unsafe_data','data:image/png;base64,abc',False),
      ('unsafe_vbscript','vbscript:msgbox(1)',False),
    ]
    for name,url,visible in img_cases:
        items=copy.deepcopy(base);items[0]['image']=url;items[0]['imageAlt']='  Alt text  '
        c,p,e=open_case(b,items);s=snap(p);card=s['cards'][0]
        rec(f'image_{name}_contract',(card['imageSrc'] is not None)==visible and (not visible or card['imageAlt']=='Alt text'),{'card':card,'errors':e});c.close()
    items=copy.deepcopy(base);items[0]['image']='media/social-preview.png';items[0]['imageAlt']='   ';items[0]['title']='  Project title  '
    c,p,e=open_case(b,items);s=snap(p);rec('blank_image_alt_falls_back_to_title',s['cards'][0]['imageAlt']=='Project title',s['cards'][0]);c.close()
    items=copy.deepcopy(base);items[0]['image']='media/missing-image.png'
    c,p,e=open_case(b,items);p.wait_for_timeout(500);s=snap(p)
    rec('broken_image_is_hidden_without_breaking_card',s['cards'][0]['imageHidden'] or s['cards'][0]['imageCount']==0,{'card':s['cards'][0],'errors':e});c.close()

    # List operations.
    added=copy.deepcopy(base)+[{'title':'Added Project','category':'C','status':'S','description':'D','tech':'T','link':'#contact','buttonText':'Open','image':'','imageAlt':''}]
    c,p,e=open_case(b,added);s=snap(p);rec('add_project_renders_new_card',len(s['cards'])==len(base)+1 and s['cards'][-1]['title']=='Added Project',{'cards':s['cards'][-2:]});c.close()
    deleted=copy.deepcopy(base)[1:]
    c,p,e=open_case(b,deleted);s=snap(p);rec('delete_project_removes_card',len(s['cards'])==len(base)-1 and s['cards'][0]['title']==base[1]['title'],{'first':s['cards'][0]});c.close()
    reordered=list(reversed(copy.deepcopy(base)))
    c,p,e=open_case(b,reordered);s=snap(p);rec('reorder_projects_preserves_exact_order',[x['title'] for x in s['cards']]==[x['title'] for x in reordered],{'titles':[x['title'] for x in s['cards']]});c.close()
    duplicate=[copy.deepcopy(base[0]),copy.deepcopy(base[0])]
    c,p,e=open_case(b,duplicate);s=snap(p);rec('duplicate_projects_render_independently',len(s['cards'])==2 and s['cards'][0]['title']==s['cards'][1]['title'],{'cards':s['cards']});c.close()
    c,p,e=open_case(b,[]);s=snap(p);rec('empty_array_shows_empty_state',len(s['cards'])==0 and 'No portfolio projects found' in s['emptyState'],{'snap':s,'errors':e});c.close()

    # Section/isolation/re-render.
    c,p,e=open_case(b,base,portfolio_settings={'showProjectsSection':'no'});s=snap(p);rec('portfolio_settings_can_hide_projects_section',s['sectionHidden'],s);c.close()
    changed=copy.deepcopy(base);changed[0]['title']='Isolation Project'
    c,p,e=open_case(b,changed);s=snap(p);rec('project_changes_do_not_change_skills',(s['skillCount'],s['skillTitle'])==baseline_skill,{'skills':(s['skillCount'],s['skillTitle']),'baseline':baseline_skill});c.close()

    # Responsive, long content, equal card/link alignment.
    for width,height,expected_cols in [(1366,900,2),(1024,768,2),(768,1024,1),(430,932,1),(360,800,1)]:
        c,p,e=open_case(b,base,viewport={'width':width,'height':height});s=snap(p)
        cols=len([x for x in (s['gridColumns'] or '').split(' ') if x])
        rec(f'responsive_columns_{width}',cols==expected_cols,{'gridTemplateColumns':s['gridColumns'],'cols':cols,'expected':expected_cols,'errors':e});c.close()
    long='LONGUNBROKENVALUE'*250
    items=[{'title':long,'category':long,'status':long,'description':long,'tech':long,'link':'#contact','buttonText':long,'image':'','imageAlt':long}]
    for width,height in [(360,800),(430,932),(768,1024),(1366,900)]:
        c,p,e=open_case(b,items,viewport={'width':width,'height':height});s=snap(p)
        rec(f'long_content_no_horizontal_overflow_{width}',s['scrollWidth']<=s['clientWidth'],{'scrollWidth':s['scrollWidth'],'clientWidth':s['clientWidth'],'errors':e});c.close()
    items=[
      {'title':'Short','category':'A','status':'Live','description':'Short','tech':'T','link':'#contact','buttonText':'Open','image':'','imageAlt':''},
      {'title':'Long','category':'B','status':'Live','description':'Long '*100,'tech':'Technology '*20,'link':'#contact','buttonText':'Open','image':'','imageAlt':''},
    ]
    c,p,e=open_case(b,items,viewport={'width':1366,'height':1100});s=snap(p)
    heights=[round(x['rect']['h'],1) for x in s['cards']]
    bottoms=[round(x['linkRect']['b'],1) if x['linkRect'] else None for x in s['cards']]
    rec('desktop_same_row_cards_have_equal_heights',max(heights)-min(heights)<=1.5,{'heights':heights})
    rec('desktop_same_row_links_align_to_card_bottom',None not in bottoms and max(bottoms)-min(bottoms)<=1.5,{'linkBottoms':bottoms,'heights':heights});c.close()

    huge=[{'title':f'Project {i}','category':f'C{i%4}','status':f'S{i%3}','description':f'Description {i}','tech':f'Tech {i}','link':'#contact','buttonText':'Open','image':'','imageAlt':''} for i in range(200)]
    c,p,e=open_case(b,huge,viewport={'width':1366,'height':900});s=snap(p)
    rec('large_200_item_list_renders_without_error',len(s['cards'])==200 and s['bootReady'] and not e,{'count':len(s['cards']),'errors':e});c.close()

    if SHARED_CONTEXT is not None: SHARED_CONTEXT.close()
    browser.close()

failed=[r for r in results if not r['passed']]
out=ROOT/'docs/PORTFOLIO_PROJECTS_FIELD_INDIVIDUAL_AUDIT.json'
out.write_text(json.dumps({'group':'Portfolio Projects List','cms_fields':['title','category','status','description','tech','image','imageAlt','link','buttonText'],'targeted_checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'results':results},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'failed_tests':[r['test'] for r in failed]},indent=2))
