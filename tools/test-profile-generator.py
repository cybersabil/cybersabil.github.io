from __future__ import annotations
import json, shutil, subprocess, tempfile, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=json.loads((ROOT/'data/profile.json').read_text(encoding='utf-8'))
results=[]
def rec(name,passed,details=None): results.append({'test':name,'passed':bool(passed),'details':details or {}})

def run_case(profile):
    td=Path(tempfile.mkdtemp(prefix='cybersabil-profile-gen-'))
    dst=td/'site';shutil.copytree(ROOT,dst)
    (dst/'data/profile.json').write_text(json.dumps(profile,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    cp=subprocess.run(['node','tools/generate-site.js'],cwd=dst,text=True,capture_output=True)
    html=(dst/'index.html').read_text(encoding='utf-8') if (dst/'index.html').exists() else ''
    shutil.rmtree(td,ignore_errors=True)
    return cp,html

def tag(html,id):
    m=re.search(rf'<[^>]+\bid=["\']{re.escape(id)}["\'][^>]*>',html)
    return m.group(0) if m else ''
def text(html,id):
    m=re.search(rf'<[^>]+\bid=["\']{re.escape(id)}["\'][^>]*>([\s\S]*?)</[^>]+>',html)
    return re.sub(r'<[^>]+>','',m.group(1)) if m else None

# Trim + escape
p=dict(BASE);p['name']='  Raw Name  ';p['role']='<img src=x onerror=1>Role'
cp,h=run_case(p);rec('generator_runs',cp.returncode==0,{'stdout':cp.stdout,'stderr':cp.stderr});rec('raw_name_trimmed',text(h,'csPortfolioName')=='Raw Name',text(h,'csPortfolioName'));rec('raw_role_escaped','&lt;img' in (text(h,'csPortfolioRole') or '') and '<img' not in (text(h,'csPortfolioRole') or ''),text(h,'csPortfolioRole'))
# Optional visibility
p=dict(BASE);p.update({'tagline':' ','availability':' ','location':' ','experience':' ','bio':' ','statOneValue':' ','statOneLabel':' ','statTwoValue':' ','statTwoLabel':' '})
cp,h=run_case(p)
for id in ['csPortfolioTagline','csPortfolioAvailability','csPortfolioLocation','csPortfolioExperience','csPortfolioBio','csPortfolioMeta','csPortfolioStatOne','csPortfolioStatTwo','csPortfolioStats']:
    rec(f'{id}_raw_hidden','cs-mode-hidden' in tag(h,id),tag(h,id))
# CTA links
for label,link,target,hidden in [('external','https://example.com','_blank',False),('internal','#csPortfolioProjects',None,False),('unsafe','javascript:alert(1)',None,True),('blank',' ',None,True)]:
    p=dict(BASE);p['primaryCtaText']='Primary';p['primaryCtaLink']=link
    cp,h=run_case(p);t=tag(h,'csPortfolioPrimaryCta')
    rec(f'raw_primary_{label}',(('cs-mode-hidden' in t)==hidden) and ((target is None and 'target=' not in t) or (target and f'target="{target}"' in t)),t)
# Both buttons blank hides action row
p=dict(BASE);p.update({'primaryCtaText':' ','primaryCtaLink':' ','secondaryCtaText':' ','secondaryCtaLink':' '})
cp,h=run_case(p);rec('raw_actions_hidden','cs-mode-hidden' in tag(h,'csPortfolioActions'),tag(h,'csPortfolioActions'))
# Malformed root safe
for label,val in [('null',None),('array',[]),('string','bad')]:
    cp,h=run_case(val);rec(f'generator_malformed_{label}_safe',cp.returncode==0 and text(h,'csPortfolioName')=='CyberSabil',{'returncode':cp.returncode,'stderr':cp.stderr,'name':text(h,'csPortfolioName')})

out=ROOT/'docs/PROFILE_GENERATOR_AUDIT.json'
failed=[r for r in results if not r['passed']]
out.write_text(json.dumps({'group':'Portfolio Profile Generator','checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'results':results},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'failed_tests':[r['test'] for r in failed]},indent=2))
