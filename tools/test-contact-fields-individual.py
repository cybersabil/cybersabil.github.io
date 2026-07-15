from __future__ import annotations
import copy, json, shutil, subprocess, tempfile
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DATA={p.name:json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'data').glob('*.json')}
BASE=copy.deepcopy(DATA['contact.json'])
ORIGIN='https://contact-field-audit.test/'
HTML=(ROOT/'index.html').read_text(encoding='utf-8').replace('<head>',f'<head><base href="{ORIGIN}"><style>*,*::before,*::after{{animation:none!important;transition:none!important}}</style>',1)
RESULTS=[]
def rec(name,passed,details=None): RESULTS.append({'test':name,'passed':bool(passed),'details':details or {}})

def snapshot(page):
    return page.evaluate('''() => {const $=id=>document.getElementById(id);const hidden=n=>!n||n.hidden||n.classList.contains('hide')||n.classList.contains('cs-mode-hidden')||getComputedStyle(n).display==='none';const link=id=>{const n=$(id);return n?{text:n.textContent,href:n.getAttribute('href'),target:n.getAttribute('target'),rel:n.getAttribute('rel'),hidden:hidden(n)}:null};return {ready:document.documentElement.classList.contains('cs-boot-ready'),failed:document.documentElement.classList.contains('cs-boot-failed'),heading:$('csPortfolioContactHeading')?.textContent??null,description:$('csPortfolioContactDescription')?.textContent??null,descriptionHidden:hidden($('csPortfolioContactDescription')),emailLabel:$('csPortfolioEmailLabel')?.textContent??null,emailLabelHidden:hidden($('csPortfolioEmailLabel')),githubLabel:$('csPortfolioGithubLabel')?.textContent??null,githubLabelHidden:hidden($('csPortfolioGithubLabel')),websiteLabel:$('csPortfolioWebsiteLabel')?.textContent??null,websiteLabelHidden:hidden($('csPortfolioWebsiteLabel')),emailRowHidden:hidden($('csPortfolioEmailRow')),githubRowHidden:hidden($('csPortfolioGithubRow')||$('csPortfolioGithub')?.parentElement),websiteRowHidden:hidden($('csPortfolioWebsiteRow')||$('csPortfolioWebsite')?.parentElement),email:link('csPortfolioEmail'),github:link('csPortfolioGithub'),website:link('csPortfolioWebsite'),cta:link('csPortfolioContactCta'),ctaHidden:hidden($('csPortfolioContactCta')),images:$('csPortfolioContact')?.querySelectorAll('img').length||0,scripts:$('csPortfolioContact')?.querySelectorAll('script').length||0,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,serviceCount:document.querySelectorAll('#csPortfolioServicesGrid .cs-portfolio-card').length,projectCount:document.querySelectorAll('#csPortfolioProjectsGrid .cs-portfolio-project-card').length,skillCount:document.querySelectorAll('#csPortfolioSkillsGrid .cs-portfolio-skill-card').length};}''')

def apply(page,obj):
    page.evaluate('(value)=>CyberSabilGateway.applyPortfolioContact(value)',obj)
    page.wait_for_timeout(20)
    return snapshot(page)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1366,'height':900})
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(f'pageerror:{e}'))
    page.on('console',lambda m:errors.append(f'console:{m.text}') if m.type=='error' else None)
    settings=copy.deepcopy(DATA['site-settings.json']);settings.update({'gatewayEnabled':'no','defaultMode':'portfolio','websiteEnabled':'yes','portfolioEnabled':'yes','showModeSwitch':'no'})
    overrides={'site-settings.json':settings}
    def route(route):
        rel=urlparse(route.request.url).path.lstrip('/') or 'index.html'
        if rel.startswith('data/'):
            n=rel.split('/',1)[1]
            if n in overrides:
                route.fulfill(status=200,body=json.dumps(overrides[n]),content_type='application/json',headers={'Cache-Control':'no-store'});return
        fp=ROOT/rel
        if fp.exists() and fp.is_file():
            ct={'.json':'application/json','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'}.get(fp.suffix,'application/octet-stream')
            route.fulfill(status=200,body=fp.read_bytes(),content_type=ct,headers={'Cache-Control':'no-store'})
        else: route.fulfill(status=404,body='not found')
    page.route(ORIGIN+'**',route)
    page.set_content(HTML,wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.classList.contains('cs-boot-ready')",timeout=15000)
    base_snap=snapshot(page);base_counts=(base_snap['serviceCount'],base_snap['projectCount'],base_snap['skillCount'])
    rec('baseline_boot',base_snap['ready'] and not base_snap['failed'] and not errors,{'snapshot':base_snap,'errors':errors})

    # Every text field trims.
    for field,target in [('heading','heading'),('description','description'),('emailLabel','emailLabel'),('githubLabel','githubLabel'),('websiteLabel','websiteLabel')]:
        x=copy.deepcopy(BASE);x[field]=f'  AUDIT {field}  ';s=apply(page,x);rec(field+'_trims',s[target]==f'AUDIT {field}',s);apply(page,BASE)
    for field,target in [('githubText','github'),('websiteText','website'),('ctaText','cta')]:
        x=copy.deepcopy(BASE);x[field]=f'  AUDIT {field}  ';s=apply(page,x);rec(field+'_trims',s[target]['text']==f'AUDIT {field}',s);apply(page,BASE)

    # Email contract.
    for email in ['name@example.com','first.last+tag@sub.example.co.in']:
        x=copy.deepcopy(BASE);x.update(email=email,emailLabel='  Reach me:  ');s=apply(page,x);rec('valid_email_'+email,not s['emailRowHidden'] and s['email']['href']==f'mailto:{email}' and s['emailLabel']=='Reach me:',s);apply(page,BASE)
    for label,email in [('blank',''),('spaces','   '),('placeholder','Add your email here'),('bad','not-an-email'),('missingdomain','name@'),('spacesinside','a b@example.com'),('unsafe','javascript:alert(1)')]:
        x=copy.deepcopy(BASE);x['email']=email;s=apply(page,x);rec('invalid_email_'+label,s['emailRowHidden'],s);apply(page,BASE)
    x=copy.deepcopy(BASE);x.update(email='name@example.com',emailLabel='   ');s=apply(page,x);rec('blank_email_label_hides_label_only',not s['emailRowHidden'] and s['emailLabelHidden'],s);apply(page,BASE)

    # GitHub/Website link contract and same-page stale target reset.
    for prefix,rowkey in [('github','githubRowHidden'),('website','websiteRowHidden')]:
        lf,tf=prefix+'Link',prefix+'Text'
        x=copy.deepcopy(BASE);x.update({lf:'https://example.com/path',tf:'External'});s=apply(page,x);rec(prefix+'_external',not s[rowkey] and s[prefix]['target']=='_blank' and 'noopener' in (s[prefix]['rel'] or ''),s)
        x=copy.deepcopy(BASE);x.update({lf:'#csPortfolioProjects',tf:'Internal'});s=apply(page,x);rec(prefix+'_external_to_internal_clears_target',not s[rowkey] and s[prefix]['href']=='#csPortfolioProjects' and s[prefix]['target'] is None and s[prefix]['rel'] is None,s)
        for label,href,target in [('relative','portfolio/info.html',None),('mail','mailto:test@example.com',None),('tel','tel:+911234567890',None)]:
            x=copy.deepcopy(BASE);x.update({lf:href,tf:'Contact'});s=apply(page,x);rec(f'{prefix}_{label}',not s[rowkey] and s[prefix]['href']==href and s[prefix]['target']==target,s)
        for label,href in [('js','javascript:alert(1)'),('data','data:text/html,x'),('vb','vbscript:msgbox(1)'),('blank','   '),('hash','#')]:
            x=copy.deepcopy(BASE);x.update({lf:href,tf:'Unsafe'});s=apply(page,x);rec(f'{prefix}_{label}_hidden',s[rowkey],s)
        x=copy.deepcopy(BASE);x.update({lf:'https://example.com',tf:'   '});s=apply(page,x);rec(prefix+'_blank_text_uses_href',not s[rowkey] and bool((s[prefix]['text'] or '').strip()),s);apply(page,BASE)

    # CTA contract.
    for label,href,target in [('external','https://example.com','_blank'),('internal','#csPortfolioProjects',None),('relative','portfolio/info.html',None),('mail','mailto:test@example.com',None),('tel','tel:+911234567890',None)]:
        x=copy.deepcopy(BASE);x.update(ctaText='Contact CTA',ctaLink=href);s=apply(page,x);rec('cta_'+label,not s['ctaHidden'] and s['cta']['href']==href and s['cta']['target']==target,s)
    for label,href in [('js','javascript:alert(1)'),('data','data:text/html,x'),('vb','vbscript:msgbox(1)'),('blank','   '),('hash','#')]:
        x=copy.deepcopy(BASE);x.update(ctaText='CTA',ctaLink=href);s=apply(page,x);rec('cta_'+label+'_hidden',s['ctaHidden'],s)
    x=copy.deepcopy(BASE);x.update(ctaText='   ',ctaLink='https://example.com');s=apply(page,x);rec('cta_blank_text_hidden',s['ctaHidden'],s);apply(page,BASE)

    # Optional/fallback/malformed/escaping.
    x=copy.deepcopy(BASE);x['heading']='   ';s=apply(page,x);rec('blank_heading_fallback',s['heading']=='Let’s build reliable IT support tools',s)
    x=copy.deepcopy(BASE);x['description']='   ';s=apply(page,x);rec('blank_description_hidden',s['descriptionHidden'],s)
    for field,key,row in [('githubLabel','githubLabelHidden','githubRowHidden'),('websiteLabel','websiteLabelHidden','websiteRowHidden')]:
        x=copy.deepcopy(BASE);x[field]='   ';s=apply(page,x);rec(field+'_blank_hides_label',s[key] and not s[row],s)
    for label,root in [('null',None),('array',[]),('string','bad'),('number',7),('bool',True)]:
        s=apply(page,root);rec('malformed_'+label,s['ready'] and not s['failed'] and bool(s['heading']),s)
    payload='<img src=x onerror="window.__pwn=1"><script>window.__pwn=1</script>'
    x={k:payload for k in BASE};x.update(email='safe@example.com',githubLink='https://example.com',websiteLink='https://example.com',ctaLink='https://example.com');s=apply(page,x);rec('html_escape',s['images']==0 and s['scripts']==0 and not page.evaluate('()=>window.__pwn===1') and '<img' in s['heading'],s)
    s=apply(page,{**BASE,'heading':'Isolation'});rec('collateral_isolation',(s['serviceCount'],s['projectCount'],s['skillCount'])==base_counts,{'snapshot':s,'baseline':base_counts})

    # Responsive long-content behavior.
    long='LONGUNBROKENVALUE'*300;x=copy.deepcopy(BASE)
    for k in ['heading','description','emailLabel','githubLabel','githubText','websiteLabel','websiteText','ctaText']:x[k]=long
    x.update(email='long@example.com',githubLink='https://example.com/'+long,websiteLink='https://example.com/'+long,ctaLink='https://example.com/'+long)
    for w,h in [(360,800),(430,932),(768,1024),(1366,900)]:
        page.set_viewport_size({'width':w,'height':h});s=apply(page,x);rec('no_overflow_'+str(w),s['scrollWidth']<=s['clientWidth'],s)
    context.close();browser.close()

# Generator/raw HTML checks.
with tempfile.TemporaryDirectory(prefix='contact-generator-') as td:
    temp=Path(td)/'project';shutil.copytree(ROOT,temp,ignore=shutil.ignore_patterns('.git','__pycache__','*.pyc'))
    def build(name,obj,predicate):
        (temp/'data/contact.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')
        proc=subprocess.run(['node','tools/generate-site.js'],cwd=temp,text=True,capture_output=True,timeout=30)
        h=(temp/'index.html').read_text(encoding='utf-8');rec('generator_'+name,predicate(h,proc),{'returncode':proc.returncode,'stderr':proc.stderr})
    build('text_trim',{**BASE,'heading':'  Gen Heading  ','description':'  Gen Description  ','githubLabel':'  GH:  '},lambda h,p:'>Gen Heading<' in h and '>Gen Description<' in h and '>GH:<' in h and p.returncode==0)
    build('email_visible',{**BASE,'email':'name@example.com','emailLabel':'Email me:'},lambda h,p:'mailto:name@example.com' in h and '>name@example.com<' in h and 'id="csPortfolioEmailRow" hidden' not in h)
    build('email_invalid_hidden',{**BASE,'email':'not-an-email'},lambda h,p:'id="csPortfolioEmailRow" hidden' in h)
    build('external_target',{**BASE,'githubLink':'https://example.com','githubText':'External'},lambda h,p:'id="csPortfolioGithub" href="https://example.com" target="_blank" rel="noopener noreferrer"' in h)
    build('internal_no_target',{**BASE,'githubLink':'#csPortfolioProjects','githubText':'Internal'},lambda h,p:'id="csPortfolioGithub" href="#csPortfolioProjects"' in h and 'id="csPortfolioGithub" href="#csPortfolioProjects" target=' not in h)
    build('unsafe_hidden',{**BASE,'githubLink':'javascript:alert(1)','websiteLink':'data:text/html,x','ctaLink':'vbscript:msgbox(1)'},lambda h,p:'javascript:' not in h and 'data:text/html' not in h and 'vbscript:' not in h and 'id="csPortfolioGithubRow" class="cs-mode-hidden"' in h and 'id="csPortfolioWebsiteRow" class="cs-mode-hidden"' in h)
    build('malformed_safe',None,lambda h,p:p.returncode==0 and 'id="csPortfolioContactHeading"' in h)

failed=[r for r in RESULTS if not r['passed']]
out=ROOT/'docs/CONTACT_FIELD_INDIVIDUAL_AUDIT.json';out.write_text(json.dumps({'group':'Portfolio Contact','cms_fields':12,'targeted_checks':len(RESULTS),'passed':len(RESULTS)-len(failed),'failed':len(failed),'results':RESULTS},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'checks':len(RESULTS),'passed':len(RESULTS)-len(failed),'failed':len(failed),'failed_tests':[r['test'] for r in failed]},indent=2,ensure_ascii=False))
