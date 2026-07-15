from __future__ import annotations
import copy, json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://cybersabil-portfolio-skills.test/'
HTML = (ROOT/'index.html').read_text(encoding='utf-8').replace(
    '<head>',
    f'<head><base href="{BASE}"><style>*,*::before,*::after{{animation:none!important;transition:none!important}}</style>',
    1
)
DATA = {p.name: json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'data').glob('*.json')}
results=[]
def rec(name, passed, details=None):
    results.append({'test':name,'passed':bool(passed),'details':details or {}})

def open_case(browser, skills, viewport=None, portfolio_settings=None):
    viewport = viewport or {'width':1366,'height':768}
    c = browser.new_context(viewport=viewport)
    p = c.new_page(); errs=[]
    p.on('pageerror', lambda e: errs.append(f'pageerror:{e}'))
    p.on('console', lambda m: errs.append(f'console:{m.text}') if m.type=='error' else None)
    settings=copy.deepcopy(DATA['site-settings.json'])
    settings.update({'gatewayEnabled':'no','defaultMode':'portfolio','websiteEnabled':'yes','portfolioEnabled':'yes','showModeSwitch':'no'})
    ps=copy.deepcopy(DATA['portfolio-settings.json'])
    ps.update({'showSkillsSection':'yes','showProjectsSection':'yes','showTimelineSection':'yes','showServicesSection':'yes','showContactSection':'yes'})
    if portfolio_settings: ps.update(portfolio_settings)
    overrides={'site-settings.json':settings,'portfolio-settings.json':ps,'portfolio-skills.json':skills}
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
    p.wait_for_timeout(250)
    return c,p,errs

def snap(p):
    return p.evaluate('''() => {
      const grid=document.getElementById('csPortfolioSkillsGrid');
      const section=document.getElementById('csPortfolioSkills');
      const cards=[...(grid?.querySelectorAll('.cs-portfolio-skill-card')||[])];
      const hidden=n=>!n || n.hidden || n.classList.contains('hide') || n.classList.contains('cs-mode-hidden') || getComputedStyle(n).display==='none';
      const rect=n=>n?({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height}):null;
      return {
        bootReady:document.documentElement.classList.contains('cs-boot-ready'),
        bootFailed:document.documentElement.classList.contains('cs-boot-failed'),
        sectionHidden:hidden(section),
        emptyState:grid?.querySelector('.empty-state')?.textContent || grid?.textContent || '',
        cards:cards.map(n=>({
          label:n.querySelector('.cs-portfolio-card-label')?.textContent ?? null,
          title:n.querySelector('h3')?.textContent ?? null,
          description:[...n.children].find(x=>x.tagName==='P' && !x.classList.contains('cs-portfolio-project-tech'))?.textContent ?? null,
          level:n.querySelector('.cs-portfolio-project-tech')?.textContent ?? null,
          paragraphCount:n.querySelectorAll('p').length,
          html:n.innerHTML,
          rect:rect(n)
        })),
        gridColumns:grid?getComputedStyle(grid).gridTemplateColumns:null,
        scrollWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        projectCount:document.querySelectorAll('#csPortfolioProjectsGrid .cs-portfolio-project-card').length,
        projectTitle:document.querySelector('#csPortfolioProjectsGrid h3')?.textContent || '',
        scripts:document.querySelectorAll('#csPortfolioSkillsGrid script').length,
        images:document.querySelectorAll('#csPortfolioSkillsGrid img').length
      };
    }''')

base=copy.deepcopy(DATA['portfolio-skills.json'])
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])

    # Baseline and each field apply/trim.
    c,p,e=open_case(b,base);s=snap(p)
    rec('baseline_renders_all_skills',len(s['cards'])==len(base),{'cards':len(s['cards']),'errors':e})
    rec('baseline_boot_no_errors',s['bootReady'] and not s['bootFailed'] and not e,{'errors':e})
    baseline_project=(s['projectCount'],s['projectTitle']);c.close()

    field_expect={
      'title':lambda card,v:card['title']==v,
      'category':lambda card,v:card['label']==v,
      'level':lambda card,v:card['level']==f'Level: {v}',
      'description':lambda card,v:card['description']==v,
    }
    for field,check in field_expect.items():
        items=copy.deepcopy(base); value=f'  AUDIT {field}  ';items[0][field]=value
        c,p,e=open_case(b,items);s=snap(p);card=s['cards'][0]
        rec(f'{field}_applies_and_trims',check(card,value.strip()),{'card':card,'errors':e})
        rec(f'{field}_does_not_change_card_count',len(s['cards'])==len(base),{'count':len(s['cards'])})
        c.close()

    # Field isolation: category and level must not overwrite each other.
    items=copy.deepcopy(base);items[0].update({'category':'Category Only','level':'Level Only'})
    c,p,e=open_case(b,items);s=snap(p);card=s['cards'][0]
    rec('category_and_level_render_independently',card['label']=='Category Only' and card['level']=='Level: Level Only',card);c.close()
    items=copy.deepcopy(base);items[0].update({'category':'   ','level':'Advanced'})
    c,p,e=open_case(b,items);s=snap(p);card=s['cards'][0]
    rec('blank_category_uses_skill_badge_not_duplicate_level',card['label']=='Skill' and card['level']=='Level: Advanced',card);c.close()

    # Blank values.
    blank_cases=[
      ('title','Untitled skill'),
      ('category','Skill'),
    ]
    for field,expected in blank_cases:
        items=copy.deepcopy(base);items[0][field]='   '
        c,p,e=open_case(b,items);s=snap(p);card=s['cards'][0]
        actual=card['title'] if field=='title' else card['label']
        rec(f'blank_{field}_uses_safe_fallback',actual==expected,{'actual':actual,'card':card});c.close()
    items=copy.deepcopy(base);items[0]['description']='   '
    c,p,e=open_case(b,items);s=snap(p);rec('blank_description_hides_paragraph',s['cards'][0]['description'] is None and s['cards'][0]['paragraphCount']==1,s['cards'][0]);c.close()
    items=copy.deepcopy(base);items[0]['level']='   '
    c,p,e=open_case(b,items);s=snap(p);rec('blank_level_hides_level_line',s['cards'][0]['level'] is None,s['cards'][0]);c.close()
    items=copy.deepcopy(base);items[0].update({'description':' ','level':' '})
    c,p,e=open_case(b,items);s=snap(p);rec('both_optional_lines_blank_leave_no_paragraphs',s['cards'][0]['paragraphCount']==0,s['cards'][0]);c.close()

    # Missing values and primitive conversion.
    c,p,e=open_case(b,[{}]);s=snap(p);rec('missing_fields_render_safe_card',len(s['cards'])==1 and s['cards'][0]['title']=='Untitled skill' and s['cards'][0]['label']=='Skill' and s['cards'][0]['paragraphCount']==0,{'snap':s,'errors':e});c.close()
    for label,item in [('null',None),('array',[]),('string','bad'),('number',7),('boolean',True)]:
        c,p,e=open_case(b,[item]);s=snap(p)
        rec(f'malformed_item_{label}_does_not_crash',s['bootReady'] and not s['bootFailed'] and len(s['cards'])==1 and s['cards'][0]['title']=='Untitled skill' and not e,{'snap':s,'errors':e});c.close()
    items=[{'title':123,'category':False,'level':7,'description':True}]
    c,p,e=open_case(b,items);s=snap(p);card=s['cards'][0]
    rec('number_boolean_values_stringify_safely',card['title']=='123' and card['label']=='false' and card['level']=='Level: 7' and card['description']=='true',card);c.close()

    # Escaping/non-execution across all fields.
    payload='<img src=x onerror="window.__pwn=1"><script>window.__pwn=1</script>'
    items=[{'title':payload,'category':payload,'level':payload,'description':payload}]
    c,p,e=open_case(b,items);s=snap(p)
    rec('all_skill_fields_escape_html',s['images']==0 and s['scripts']==0 and not p.evaluate('()=>window.__pwn===1') and '<img' in s['cards'][0]['title'],{'snap':s,'errors':e});c.close()

    # List operations.
    added=copy.deepcopy(base)+[{'title':'Added Skill','category':'Added Category','level':'Added Level','description':'Added Description'}]
    c,p,e=open_case(b,added);s=snap(p);rec('add_skill_renders_new_card',len(s['cards'])==len(base)+1 and s['cards'][-1]['title']=='Added Skill',{'cards':s['cards'][-2:]});c.close()
    deleted=copy.deepcopy(base)[1:]
    c,p,e=open_case(b,deleted);s=snap(p);rec('delete_skill_removes_card',len(s['cards'])==len(base)-1 and s['cards'][0]['title']==base[1]['title'],{'first':s['cards'][0]});c.close()
    reordered=list(reversed(copy.deepcopy(base)))
    c,p,e=open_case(b,reordered);s=snap(p);rec('reorder_skills_preserves_exact_order',[x['title'] for x in s['cards']]==[x['title'] for x in reordered],{'titles':[x['title'] for x in s['cards']]});c.close()
    duplicate=[copy.deepcopy(base[0]),copy.deepcopy(base[0])]
    c,p,e=open_case(b,duplicate);s=snap(p);rec('duplicate_skills_render_independently',len(s['cards'])==2 and s['cards'][0]['title']==s['cards'][1]['title'],{'cards':s['cards']});c.close()

    # Empty and invalid roots.
    c,p,e=open_case(b,[]);s=snap(p);rec('empty_array_shows_empty_state',len(s['cards'])==0 and 'No portfolio skills found' in s['emptyState'],{'snap':s,'errors':e});c.close()
    for label,root in [('null',None),('object',{}),('string','bad'),('number',4),('boolean',False)]:
        c,p,e=open_case(b,root);s=snap(p)
        rec(f'non_array_root_{label}_shows_safe_empty_state',s['bootReady'] and not s['bootFailed'] and len(s['cards'])==0 and 'No portfolio skills found' in s['emptyState'] and not e,{'snap':s,'errors':e});c.close()

    # Section visibility and unrelated-section isolation.
    c,p,e=open_case(b,base,portfolio_settings={'showSkillsSection':'no'});s=snap(p);rec('portfolio_settings_can_hide_skills_section',s['sectionHidden'],s);c.close()
    changed=copy.deepcopy(base);changed[0]['title']='Isolation Skill'
    c,p,e=open_case(b,changed);s=snap(p);rec('skill_changes_do_not_change_projects',(s['projectCount'],s['projectTitle'])==baseline_project,{'projects':(s['projectCount'],s['projectTitle']),'baseline':baseline_project});c.close()

    # Responsive columns and overflow.
    for width,height,expected_cols in [(1366,768,3),(1024,768,3),(768,1024,1),(430,932,1),(360,800,1)]:
        c,p,e=open_case(b,base,viewport={'width':width,'height':height});s=snap(p)
        cols=len([x for x in (s['gridColumns'] or '').split(' ') if x])
        rec(f'responsive_columns_{width}',cols==expected_cols,{'gridTemplateColumns':s['gridColumns'],'cols':cols,'expected':expected_cols,'errors':e});c.close()
    long='LONGUNBROKENVALUE'*250
    items=[{'title':long,'category':long,'level':long,'description':long}]
    for width,height in [(360,800),(430,932),(768,1024),(1366,768)]:
        c,p,e=open_case(b,items,viewport={'width':width,'height':height});s=snap(p)
        rec(f'long_content_no_horizontal_overflow_{width}',s['scrollWidth']<=s['clientWidth'],{'scrollWidth':s['scrollWidth'],'clientWidth':s['clientWidth'],'errors':e});c.close()

    # Equal height on same desktop row despite unequal content.
    items=[
      {'title':'Short','category':'A','level':'L','description':'Short'},
      {'title':'Medium','category':'B','level':'L','description':'Medium '*30},
      {'title':'Long','category':'C','level':'L','description':'Long '*120},
    ]
    c,p,e=open_case(b,items,viewport={'width':1366,'height':900});s=snap(p);heights=[round(x['rect']['h'],1) for x in s['cards']]
    rec('desktop_same_row_cards_have_equal_heights',max(heights)-min(heights)<=1.5,{'heights':heights});c.close()

    # Large-list stability.
    huge=[{'title':f'Skill {i}','category':f'Category {i%9}','level':f'Level {i%4}','description':f'Description {i}'} for i in range(200)]
    c,p,e=open_case(b,huge,viewport={'width':1366,'height':900});s=snap(p)
    rec('large_200_item_list_renders_without_error',len(s['cards'])==200 and s['bootReady'] and not e,{'count':len(s['cards']),'errors':e});c.close()

    b.close()

failed=[r for r in results if not r['passed']]
out=ROOT/'docs/PORTFOLIO_SKILLS_FIELD_INDIVIDUAL_AUDIT.json'
out.write_text(json.dumps({'group':'Portfolio Skills List','cms_fields':['title','category','level','description'],'targeted_checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'results':results},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'failed_tests':[r['test'] for r in failed]},indent=2))
