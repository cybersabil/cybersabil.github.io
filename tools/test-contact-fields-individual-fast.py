from __future__ import annotations
import copy, json, shutil, subprocess, tempfile
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DATA={p.name:json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'data').glob('*.json')}
BASE_HTML=(ROOT/'index.html').read_text(encoding='utf-8')
results=[]; counter=0

def rec(name,ok,details=None): results.append({'test':name,'passed':bool(ok),'details':details or {}})

def run_case(context, contact, portfolio_settings=None):
    global counter
    counter+=1
    base=f'https://contact-case-{counter}.test/'
    html=BASE_HTML.replace('<head>',f'<head><base href="{base}"><style>*,*::before,*::after{{animation:none!important;transition:none!important}}</style>',1)
    page=context.new_page(); errors=[]
    page.on('pageerror',lambda e:errors.append(f'pageerror:{e}'))
    page.on('console',lambda m:errors.append(f'console:{m.text}') if m.type=='error' else None)
    settings=copy.deepcopy(DATA['site-settings.json']); settings.update({'gatewayEnabled':'no','defaultMode':'portfolio','websiteEnabled':'yes','portfolioEnabled':'yes','showModeSwitch':'no'})
    ps=copy.deepcopy(DATA['portfolio-settings.json']); ps.update({'showContactSection':'yes','showServicesSection':'yes','showProjectsSection':'yes','showSkillsSection':'yes','showTimelineSection':'yes'})
    if portfolio_settings: ps.update(portfolio_settings)
    overrides={'site-settings.json':settings,'portfolio-settings.json':ps,'contact.json':contact}
    def route(route):
        rel=urlparse(route.request.url).path.lstrip('/') or 'index.html'
        if rel.startswith('data/'):
            name=rel.split('/',1)[1]
            if name in overrides:
                route.fulfill(status=200,body=json.dumps(overrides[name]),content_type='application/json'); return
        fp=ROOT/rel
        if fp.exists() and fp.is_file():
            ct={'.json':'application/json','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'}.get(fp.suffix,'application/octet-stream')
            route.fulfill(status=200,body=fp.read_bytes(),content_type=ct)
        else: route.fulfill(status=404,body='not found')
    page.route(base+'**',route)
    page.set_content(html,wait_until='domcontentloaded')
    try: page.wait_for_function("document.documentElement.classList.contains('cs-boot-ready') || document.documentElement.classList.contains('cs-boot-failed')",timeout=5000)
    except Exception as e: errors.append(f'boot-timeout:{e}')
    page.wait_for_timeout(100)
    snap=page.evaluate('''() => {
      const $=id=>document.getElementById(id); const hidden=n=>!n||n.hidden||n.classList.contains('hide')||n.classList.contains('cs-mode-hidden')||getComputedStyle(n).display==='none';
      const link=id=>{const n=$(id);return n?{text:n.textContent,href:n.getAttribute('href'),target:n.getAttribute('target'),rel:n.getAttribute('rel'),hidden:hidden(n)}:null};
      return {ready:document.documentElement.classList.contains('cs-boot-ready'),failed:document.documentElement.classList.contains('cs-boot-failed'),
        sectionHidden:hidden($('csPortfolioContact')), heading:$('csPortfolioContactHeading')?.textContent??null,
        description:$('csPortfolioContactDescription')?.textContent??null,descriptionHidden:hidden($('csPortfolioContactDescription')),
        emailLabel:$('csPortfolioEmailLabel')?.textContent??null,emailLabelHidden:hidden($('csPortfolioEmailLabel')),
        githubLabel:$('csPortfolioGithubLabel')?.textContent??null,githubLabelHidden:hidden($('csPortfolioGithubLabel')),
        websiteLabel:$('csPortfolioWebsiteLabel')?.textContent??null,websiteLabelHidden:hidden($('csPortfolioWebsiteLabel')),
        emailRowHidden:hidden($('csPortfolioEmailRow')),githubRowHidden:hidden($('csPortfolioGithubRow')||$('csPortfolioGithub')?.parentElement),websiteRowHidden:hidden($('csPortfolioWebsiteRow')||$('csPortfolioWebsite')?.parentElement),
        email:link('csPortfolioEmail'),github:link('csPortfolioGithub'),website:link('csPortfolioWebsite'),cta:link('csPortfolioContactCta'),ctaHidden:hidden($('csPortfolioContactCta')),
        images:$('csPortfolioContact')?.querySelectorAll('img').length||0,scripts:$('csPortfolioContact')?.querySelectorAll('script').length||0,
        scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,
        serviceCount:document.querySelectorAll('#csPortfolioServicesGrid .cs-portfolio-card').length,projectCount:document.querySelectorAll('#csPortfolioProjectsGrid .cs-portfolio-project-card').length,skillCount:document.querySelectorAll('#csPortfolioSkillsGrid .cs-portfolio-skill-card').length};
    }''')
    return page,snap,errors

base=copy.deepcopy(DATA['contact.json'])
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':1366,'height':900})
    p,s,e=run_case(ctx,base); rec('baseline_boot',s['ready'] and not s['failed'] and not e,{'snap':s,'errors':e}); baseline_other=(s['serviceCount'],s['projectCount'],s['skillCount']); p.close()

    # Text fields and trimming
    mapping={'heading':'heading','description':'description','emailLabel':'emailLabel','githubLabel':'githubLabel','websiteLabel':'websiteLabel'}
    for field,target in mapping.items():
        x=copy.deepcopy(base);x[field]=f'  AUDIT {field}  ';p,s,e=run_case(ctx,x);rec(f'{field}_trimmed',s[target]==f'AUDIT {field}',{'actual':s[target],'errors':e});p.close()
    for field,target in [('githubText','github'),('websiteText','website'),('ctaText','cta')]:
        x=copy.deepcopy(base);x[field]=f'  AUDIT {field}  ';p,s,e=run_case(ctx,x);rec(f'{field}_trimmed',s[target]['text']==f'AUDIT {field}',{'actual':s[target],'errors':e});p.close()

    # Email cases
    for email in ['name@example.com','first.last+tag@sub.example.co.in']:
        x=copy.deepcopy(base);x['email']=email;x['emailLabel']='  Reach me:  ';p,s,e=run_case(ctx,x);rec(f'valid_email_{email}',not s['emailRowHidden'] and s['email']['href']==f'mailto:{email}' and s['emailLabel']=='Reach me:',{'snap':s,'errors':e});p.close()
    for label,email in [('blank',''),('spaces','   '),('placeholder','Add your email here'),('bad','not-an-email'),('missingdomain','name@'),('spacesinside','a b@example.com'),('unsafe','javascript:alert(1)')]:
        x=copy.deepcopy(base);x['email']=email;p,s,e=run_case(ctx,x);rec(f'invalid_email_{label}_hidden',s['emailRowHidden'],{'snap':s,'errors':e});p.close()
    x=copy.deepcopy(base);x['email']='name@example.com';x['emailLabel']='   ';p,s,e=run_case(ctx,x);rec('blank_email_label_hides_label_only',not s['emailRowHidden'] and s['emailLabelHidden'],s);p.close()

    # Link behavior helper
    for prefix,rowkey in [('github','githubRowHidden'),('website','websiteRowHidden')]:
        lf=prefix+'Link';tf=prefix+'Text'
        for label,href,target in [('external','https://example.com/path','_blank'),('internal','#csPortfolioProjects',None),('relative','portfolio/info.html',None),('mail','mailto:test@example.com',None),('tel','tel:+911234567890',None)]:
            x=copy.deepcopy(base);x[lf]=href;x[tf]='Contact';p,s,e=run_case(ctx,x);L=s[prefix];rec(f'{prefix}_{label}_link',not s[rowkey] and L['href']==href and L['target']==target,{'link':L,'errors':e});p.close()
        for label,href in [('js','javascript:alert(1)'),('data','data:text/html,x'),('vb','vbscript:msgbox(1)'),('blank','   '),('hash','#')]:
            x=copy.deepcopy(base);x[lf]=href;x[tf]='Unsafe';p,s,e=run_case(ctx,x);rec(f'{prefix}_{label}_hidden',s[rowkey],{'snap':s,'errors':e});p.close()
        x=copy.deepcopy(base);x[lf]='https://example.com';x[tf]='   ';p,s,e=run_case(ctx,x);rec(f'{prefix}_blank_text_uses_href',not s[rowkey] and bool((s[prefix]['text'] or '').strip()),s[prefix]);p.close()

    # CTA
    for label,href,target in [('external','https://example.com','_blank'),('internal','#csPortfolioProjects',None),('relative','portfolio/info.html',None),('mail','mailto:test@example.com',None),('tel','tel:+911234567890',None)]:
        x=copy.deepcopy(base);x['ctaText']='Contact CTA';x['ctaLink']=href;p,s,e=run_case(ctx,x);L=s['cta'];rec(f'cta_{label}',not s['ctaHidden'] and L['href']==href and L['target']==target,{'link':L,'errors':e});p.close()
    for label,href in [('js','javascript:alert(1)'),('data','data:text/html,x'),('vb','vbscript:msgbox(1)'),('blank','   '),('hash','#')]:
        x=copy.deepcopy(base);x['ctaText']='CTA';x['ctaLink']=href;p,s,e=run_case(ctx,x);rec(f'cta_{label}_hidden',s['ctaHidden'],{'snap':s,'errors':e});p.close()
    x=copy.deepcopy(base);x['ctaText']='   ';x['ctaLink']='https://example.com';p,s,e=run_case(ctx,x);rec('cta_blank_text_hidden',s['ctaHidden'],s);p.close()

    # Optional/fallback/malformed/escaping
    x=copy.deepcopy(base);x['heading']='   ';p,s,e=run_case(ctx,x);rec('blank_heading_fallback',s['heading']=='Let’s build reliable IT support tools',s);p.close()
    x=copy.deepcopy(base);x['description']='   ';p,s,e=run_case(ctx,x);rec('blank_description_hidden',s['descriptionHidden'],s);p.close()
    for field,key,row in [('githubLabel','githubLabelHidden','githubRowHidden'),('websiteLabel','websiteLabelHidden','websiteRowHidden')]:
        x=copy.deepcopy(base);x[field]='   ';p,s,e=run_case(ctx,x);rec(f'{field}_blank_hides_label',s[key] and not s[row],s);p.close()
    for label,root in [('null',None),('array',[]),('string','bad'),('number',7),('bool',True)]:
        p,s,e=run_case(ctx,root);rec(f'malformed_{label}_safe',s['ready'] and not s['failed'] and not e and bool(s['heading']),{'snap':s,'errors':e});p.close()
    payload='<img src=x onerror="window.__pwn=1"><script>window.__pwn=1</script>'
    x={k:payload for k in base};x.update({'email':'safe@example.com','githubLink':'https://example.com','websiteLink':'https://example.com','ctaLink':'https://example.com'})
    p,s,e=run_case(ctx,x);rec('html_escaped',s['images']==0 and s['scripts']==0 and not p.evaluate('()=>window.__pwn===1') and '<img' in s['heading'],{'snap':s,'errors':e});p.close()
    p,s,e=run_case(ctx,base,{'showContactSection':'no'});rec('section_visibility',s['sectionHidden'],s);p.close()
    x=copy.deepcopy(base);x['heading']='Isolation';p,s,e=run_case(ctx,x);rec('collateral_isolation',(s['serviceCount'],s['projectCount'],s['skillCount'])==baseline_other,{'actual':(s['serviceCount'],s['projectCount'],s['skillCount']),'baseline':baseline_other});p.close()
    ctx.close()

    # Responsive contexts
    long='LONGUNBROKENVALUE'*300
    x=copy.deepcopy(base)
    for k in ['heading','description','emailLabel','githubLabel','githubText','websiteLabel','websiteText','ctaText']:x[k]=long
    x.update({'email':'long@example.com','githubLink':'https://example.com/'+long,'websiteLink':'https://example.com/'+long,'ctaLink':'https://example.com/'+long})
    for width,height in [(360,800),(430,932),(768,1024),(1366,900)]:
        c=browser.new_context(viewport={'width':width,'height':height});p,s,e=run_case(c,x);rec(f'no_overflow_{width}',s['scrollWidth']<=s['clientWidth'],{'snap':s,'errors':e});p.close();c.close()
    browser.close()

# Generator checks
with tempfile.TemporaryDirectory(prefix='contact-generator-') as td:
    temp=Path(td)/'project';shutil.copytree(ROOT,temp,ignore=shutil.ignore_patterns('.git','__pycache__','*.pyc'))
    def build(name,obj,predicate):
        (temp/'data/contact.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')
        proc=subprocess.run(['node','tools/generate-site.js'],cwd=temp,text=True,capture_output=True,timeout=30)
        html=(temp/'index.html').read_text(encoding='utf-8')
        ok,details=predicate(html,proc);rec('generator_'+name,ok,details)
    build('text_trim',{**base,'heading':'  Gen Heading  ','description':'  Gen Description  ','githubLabel':'  GH:  '},lambda h,p:('>Gen Heading<' in h and '>Gen Description<' in h and '>GH:<' in h and p.returncode==0,{'stderr':p.stderr}))
    build('email_visible',{**base,'email':'name@example.com','emailLabel':'Email me:'},lambda h,p:('mailto:name@example.com' in h and '>name@example.com<' in h and 'id="csPortfolioEmailRow" hidden' not in h,{}))
    build('email_invalid_hidden',{**base,'email':'not-an-email'},lambda h,p:('id="csPortfolioEmailRow" hidden' in h,{}))
    build('external_target',{**base,'githubLink':'https://example.com','githubText':'External'},lambda h,p:('id="csPortfolioGithub" href="https://example.com" target="_blank" rel="noopener noreferrer"' in h,{}))
    build('internal_no_target',{**base,'githubLink':'#csPortfolioProjects','githubText':'Internal'},lambda h,p:('id="csPortfolioGithub" href="#csPortfolioProjects"' in h and 'id="csPortfolioGithub" href="#csPortfolioProjects" target=' not in h,{}))
    build('unsafe_hidden',{**base,'githubLink':'javascript:alert(1)','websiteLink':'data:text/html,x','ctaLink':'vbscript:msgbox(1)'},lambda h,p:('javascript:' not in h and 'data:text/html' not in h and 'vbscript:' not in h and 'id="csPortfolioGithubRow" class="cs-mode-hidden"' in h and 'id="csPortfolioWebsiteRow" class="cs-mode-hidden"' in h,{}))
    build('malformed_safe',None,lambda h,p:(p.returncode==0 and 'id="csPortfolioContactHeading"' in h,{'stderr':p.stderr}))

failed=[r for r in results if not r['passed']]
out=ROOT/'docs/CONTACT_FIELD_INDIVIDUAL_AUDIT.json';out.write_text(json.dumps({'group':'Portfolio Contact','cms_fields':12,'targeted_checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'results':results},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'failed_tests':[r['test'] for r in failed]},indent=2,ensure_ascii=False))
