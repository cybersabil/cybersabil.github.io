from __future__ import annotations
import copy, json, sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE='https://cybersabil-portfolio-projects-batch.test/'
HTML=(ROOT/'index.html').read_text(encoding='utf-8').replace('<head>',f'<head><base href="{BASE}"><style>*,*::before,*::after{{animation:none!important;transition:none!important}}</style>',1)
DATA={p.name:json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'data').glob('*.json')}
BATCH=sys.argv[1] if len(sys.argv)>1 else 'core'
results=[]
def rec(n,p,d=None):results.append({'test':n,'passed':bool(p),'details':d or {}})
class Harness:
 def __init__(self,browser): self.browser=browser;self.ctx=None;self.n=0
 def open(self,projects,viewport=None,portfolio_settings=None):
  self.n+=1
  if self.ctx is None or (self.n-1)%15==0:
   if self.ctx:self.ctx.close()
   self.ctx=self.browser.new_context()
  p=self.ctx.new_page();p.set_viewport_size(viewport or {'width':1366,'height':900});errs=[]
  p.on('pageerror',lambda e:errs.append(f'pageerror:{e}'))
  p.on('console',lambda m:errs.append(f'console:{m.text}') if m.type=='error' else None)
  settings=copy.deepcopy(DATA['site-settings.json']);settings.update({'gatewayEnabled':'no','defaultMode':'portfolio','websiteEnabled':'yes','portfolioEnabled':'yes','showModeSwitch':'no'})
  ps=copy.deepcopy(DATA['portfolio-settings.json']);ps.update({'showSkillsSection':'yes','showProjectsSection':'yes','showTimelineSection':'yes','showServicesSection':'yes','showContactSection':'yes','showProjectLinks':'yes'})
  if portfolio_settings:ps.update(portfolio_settings)
  overrides={'site-settings.json':settings,'portfolio-settings.json':ps,'portfolio-projects.json':projects}
  def route(r):
   u=urlparse(r.request.url)
   if u.netloc!=urlparse(BASE).netloc:
    if r.request.resource_type=='image':
     fp=ROOT/'media/social-preview.png';r.fulfill(status=200,body=fp.read_bytes(),content_type='image/png',headers={'Cache-Control':'no-store'});return
    r.abort();return
   rel=u.path.lstrip('/') or 'index.html'
   if rel.startswith('data/') and rel.split('/',1)[1] in overrides:
    r.fulfill(status=200,body=json.dumps(overrides[rel.split('/',1)[1]]),content_type='application/json',headers={'Cache-Control':'no-store'});return
   fp=ROOT/rel
   if fp.exists() and fp.is_file():
    ct={'.json':'application/json','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'}.get(fp.suffix,'application/octet-stream')
    r.fulfill(status=200,body=fp.read_bytes(),content_type=ct,headers={'Cache-Control':'no-store'})
   else:r.fulfill(status=404,body='not found')
  p.route('**/*',route);p.set_content(HTML,wait_until='domcontentloaded')
  try:p.wait_for_function("document.documentElement.classList.contains('cs-boot-ready') || document.documentElement.classList.contains('cs-boot-failed')",timeout=12000)
  except Exception as e:errs.append(f'boot-timeout:{e}')
  p.wait_for_timeout(120);return p,errs
 def close(self):
  if self.ctx:self.ctx.close()
def snap(p):
 return p.evaluate('''() => {const g=document.getElementById('csPortfolioProjectsGrid'),sec=document.getElementById('csPortfolioProjects'),cards=[...(g?.querySelectorAll('.cs-portfolio-project-card')||[])];const hid=n=>!n||n.hidden||n.classList.contains('hide')||n.classList.contains('cs-mode-hidden')||getComputedStyle(n).display==='none';const rect=n=>n?({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height,b:n.getBoundingClientRect().bottom}):null;return {ready:document.documentElement.classList.contains('cs-boot-ready'),failed:document.documentElement.classList.contains('cs-boot-failed'),sectionHidden:hid(sec),empty:g?.querySelector('.empty-state')?.textContent||g?.textContent||'',cols:g?getComputedStyle(g).gridTemplateColumns:null,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,skillCount:document.querySelectorAll('#csPortfolioSkillsGrid .cs-portfolio-skill-card').length,skillTitle:document.querySelector('#csPortfolioSkillsGrid h3')?.textContent||'',scripts:g?.querySelectorAll('script').length||0,images:g?.querySelectorAll('img').length||0,cards:cards.map(n=>{const img=n.querySelector('.cs-portfolio-project-image'),a=n.querySelector('.cs-portfolio-project-link'),tech=n.querySelector('.cs-portfolio-project-tech'),desc=[...n.children].find(x=>x.tagName==='P'&&!x.classList.contains('cs-portfolio-project-tech'));return {status:n.querySelector('.cs-portfolio-project-status')?.textContent??null,title:n.querySelector('h3')?.textContent??null,description:desc?.textContent??null,tech:tech?.textContent??null,linkText:a?.textContent??null,href:a?.getAttribute('href')??null,target:a?.getAttribute('target')??null,rel:a?.getAttribute('rel')??null,linkRect:rect(a),imgSrc:img?.getAttribute('src')??null,imgAlt:img?.getAttribute('alt')??null,imgHidden:img?hid(img):true,imgCount:n.querySelectorAll('img').length,pCount:n.querySelectorAll('p').length,rect:rect(n),html:n.innerHTML}})}}''')
base=copy.deepcopy(DATA['portfolio-projects.json'])
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox']);h=Harness(browser)
 if BATCH=='core':
  p,e=h.open(base);s=snap(p);rec('baseline_count',len(s['cards'])==len(base),{'s':s,'e':e});rec('baseline_no_errors',s['ready'] and not s['failed'] and not e,{'e':e});p.close()
  for f in ['title','category','status','description','tech','buttonText','imageAlt']:
   x=copy.deepcopy(base);v=f'  AUDIT {f}  ';x[0][f]=v
   if f=='imageAlt':x[0]['image']='media/social-preview.png'
   p,e=h.open(x);c=snap(p)['cards'][0];actual={'title':c['title'],'category':c['tech'],'status':c['status'],'description':c['description'],'tech':c['tech'],'buttonText':c['linkText'],'imageAlt':c['imgAlt']}[f]
   rec(f'{f}_trimmed',v.strip() in (actual or ''),{'card':c,'e':e});p.close()
  x=copy.deepcopy(base);x[0]['title']=' ';p,e=h.open(x);c=snap(p)['cards'][0];rec('blank_title_fallback',c['title']=='Untitled project',c);p.close()
  x=copy.deepcopy(base);x[0]['status']=' ';p,e=h.open(x);c=snap(p)['cards'][0];rec('blank_status_fallback',c['status']=='Project',c);p.close()
  for f in ['description','category','tech']:
   x=copy.deepcopy(base);x[0][f]=' '
   if f in ['category','tech']:x[0]['category']=' ';x[0]['tech']=' '
   p,e=h.open(x);c=snap(p)['cards'][0];rec(f'blank_{f}_hides',c['description'] is None if f=='description' else c['tech'] is None,c);p.close()
  p,e=h.open([{}]);c=snap(p)['cards'][0];rec('missing_fields_safe',c['title']=='Untitled project' and c['status']=='Project' and c['description'] is None and c['tech'] is None and c['href'] is None,c);p.close()
  for label,item in [('null',None),('array',[]),('string','bad'),('number',7),('boolean',True)]:
   p,e=h.open([item]);s=snap(p);rec(f'malformed_{label}_safe',s['ready'] and not s['failed'] and len(s['cards'])==1 and s['cards'][0]['title']=='Untitled project' and not e,{'s':s,'e':e});p.close()
  p,e=h.open([{'title':123,'category':False,'status':7,'description':True,'tech':9}]);c=snap(p)['cards'][0];rec('primitive_values_stringify',c['title']=='123' and c['status']=='7' and c['description']=='true' and '9' in (c['tech'] or ''),c);p.close()
  payload='<img src=x onerror="window.__pwn=1"><script>window.__pwn=1</script>';p,e=h.open([{'title':payload,'category':payload,'status':payload,'description':payload,'tech':payload,'link':'#contact','buttonText':payload}]);s=snap(p);rec('html_escaped',s['scripts']==0 and s['images']==0 and not p.evaluate('()=>window.__pwn===1') and '<img' in s['cards'][0]['title'],{'s':s,'e':e});p.close()
  for label,root in [('null',None),('object',{}),('string','bad'),('number',4),('boolean',False),('empty',[])]:
   p,e=h.open(root);s=snap(p);rec(f'root_{label}_empty_state',s['ready'] and not s['failed'] and not s['cards'] and 'No portfolio projects found' in s['empty'] and not e,{'s':s,'e':e});p.close()
 elif BATCH=='links_images':
  cases=[('https','https://example.com/p',1,'_blank'),('http','http://example.com/p',1,'_blank'),('hash','#contact',1,None),('relative','projects/demo.html',1,None),('mail','mailto:a@b.com',1,None),('tel','tel:+91123',1,None),('blank',' ',0,None),('hashonly','#',0,None),('js','javascript:alert(1)',0,None),('data','data:text/html,x',0,None),('vb','vbscript:x',0,None)]
  for n,u,vis,tgt in cases:
   x=copy.deepcopy(base);x[0]['link']=u;x[0]['buttonText']='Open';p,e=h.open(x);c=snap(p)['cards'][0];ok=(c['href'] is not None)==bool(vis)
   if vis:ok=ok and c['target']==tgt and (c['rel']=='noopener noreferrer' if tgt else c['rel'] is None)
   rec(f'link_{n}',ok,{'c':c,'e':e});p.close()
  x=copy.deepcopy(base);x[0]['buttonText']=' ';x[0]['link']='#contact';p,e=h.open(x,portfolio_settings={'projectLinkLabel':'  Global label  '});c=snap(p)['cards'][0];rec('button_global_fallback',c['linkText']=='Global label',c);p.close()
  p,e=h.open(base,portfolio_settings={'showProjectLinks':'no'});s=snap(p);rec('links_global_hide',all(c['href'] is None for c in s['cards']),s);p.close()
  for n,u,vis in [('relative','media/social-preview.png',1),('external','https://example.com/x.png',1),('blank',' ',0),('hash','#',0),('js','javascript:x',0),('data','data:image/png,x',0),('vb','vbscript:x',0)]:
   x=copy.deepcopy(base);x[0]['image']=u;x[0]['imageAlt']='  Alt  ';p,e=h.open(x);c=snap(p)['cards'][0];rec(f'image_{n}',(c['imgSrc'] is not None)==bool(vis) and (not vis or c['imgAlt']=='Alt'),{'c':c,'e':e});p.close()
  x=copy.deepcopy(base);x[0].update({'image':'media/social-preview.png','imageAlt':' ','title':'  Project title  '});p,e=h.open(x);c=snap(p)['cards'][0];rec('image_alt_title_fallback',c['imgAlt']=='Project title',c);p.close()
  x=copy.deepcopy(base);x[0]['image']='media/missing.png';p,e=h.open(x);p.wait_for_timeout(350);c=snap(p)['cards'][0];rec('broken_image_hidden',c['imgHidden'],{'c':c,'e':e});p.close()
 elif BATCH=='list_responsive':
  p,e=h.open(base);bs=snap(p);baseline=(bs['skillCount'],bs['skillTitle']);p.close()
  add=copy.deepcopy(base)+[{'title':'Added','category':'C','status':'S','description':'D','tech':'T','link':'#contact','buttonText':'Open'}];p,e=h.open(add);s=snap(p);rec('add',len(s['cards'])==len(base)+1 and s['cards'][-1]['title']=='Added',s);p.close()
  p,e=h.open(copy.deepcopy(base)[1:]);s=snap(p);rec('delete',len(s['cards'])==len(base)-1 and s['cards'][0]['title']==base[1]['title'],s);p.close()
  rev=list(reversed(copy.deepcopy(base)));p,e=h.open(rev);s=snap(p);rec('reorder',[c['title'] for c in s['cards']]==[x['title'] for x in rev],s);p.close()
  dup=[copy.deepcopy(base[0]),copy.deepcopy(base[0])];p,e=h.open(dup);s=snap(p);rec('duplicate',len(s['cards'])==2 and s['cards'][0]['title']==s['cards'][1]['title'],s);p.close()
  p,e=h.open(base,portfolio_settings={'showProjectsSection':'no'});s=snap(p);rec('section_hide',s['sectionHidden'],s);p.close()
  ch=copy.deepcopy(base);ch[0]['title']='Isolation';p,e=h.open(ch);s=snap(p);rec('skills_isolation',(s['skillCount'],s['skillTitle'])==baseline,{'s':s,'baseline':baseline});p.close()
  for w,ht,cols in [(1366,900,2),(1024,768,2),(768,1024,1),(430,932,1),(360,800,1)]:
   p,e=h.open(base,viewport={'width':w,'height':ht});s=snap(p);actual=len([x for x in (s['cols'] or '').split(' ') if x]);rec(f'cols_{w}',actual==cols,{'actual':actual,'css':s['cols'],'e':e});p.close()
  long='LONGUNBROKENVALUE'*250;x=[{'title':long,'category':long,'status':long,'description':long,'tech':long,'link':'#contact','buttonText':long}]
  for w,ht in [(360,800),(430,932),(768,1024),(1366,900)]:
   p,e=h.open(x,viewport={'width':w,'height':ht});s=snap(p);rec(f'overflow_{w}',s['sw']<=s['cw'],{'sw':s['sw'],'cw':s['cw'],'e':e});p.close()
  x=[{'title':'Short','category':'A','status':'Live','description':'Short','tech':'T','link':'#contact','buttonText':'Open'},{'title':'Long','category':'B','status':'Live','description':'Long '*100,'tech':'Tech '*20,'link':'#contact','buttonText':'Open'}]
  p,e=h.open(x,viewport={'width':1366,'height':1100});s=snap(p);heights=[round(c['rect']['h'],1) for c in s['cards']];bottoms=[round(c['linkRect']['b'],1) for c in s['cards']];rec('equal_heights',max(heights)-min(heights)<=1.5,heights);rec('links_bottom_align',max(bottoms)-min(bottoms)<=1.5,bottoms);p.close()
  huge=[{'title':f'P{i}','category':'C','status':'S','description':'D','tech':'T','link':'#contact','buttonText':'Open'} for i in range(200)];p,e=h.open(huge);s=snap(p);rec('large_200',len(s['cards'])==200 and s['ready'] and not e,{'count':len(s['cards']),'e':e});p.close()
 h.close();browser.close()
failed=[r for r in results if not r['passed']]
out=ROOT/f'docs/PORTFOLIO_PROJECTS_{BATCH.upper()}_AUDIT.json';out.write_text(json.dumps({'batch':BATCH,'checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'results':results},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'batch':BATCH,'checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'failed_tests':[r['test'] for r in failed]},indent=2))
