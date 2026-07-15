from __future__ import annotations
import json, re, shutil, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
results=[]
def rec(name,passed,details=None):results.append({'test':name,'passed':bool(passed),'details':details or {}})
with tempfile.TemporaryDirectory(prefix='cs_portfolio_generator_') as td:
    project=Path(td)/'project';shutil.copytree(ROOT,project)
    path=project/'data/portfolio-settings.json';ps=json.loads(path.read_text(encoding='utf-8'))
    ps.update({'themePreset':'midnight','layoutPreset':'spacious','brandText':'  RAW BRAND  ','showNavigation':'no','navSkillsLabel':' RAW SKILLS ','showHero':'no','showProfileCard':'no','showSkillsSection':'no','showProjectsSection':'yes','showTimelineSection':'no','showServicesSection':'yes','showContactSection':'no','skillsTitle':' RAW SK TITLE ','footerText':' RAW FOOTER '})
    path.write_text(json.dumps(ps,indent=2)+'\n',encoding='utf-8')
    run=subprocess.run(['node','tools/generate-site.js'],cwd=project,text=True,capture_output=True)
    rec('generator_runs',run.returncode==0,{'stdout':run.stdout,'stderr':run.stderr})
    html=(project/'index.html').read_text(encoding='utf-8')
    def tag(id_):
        m=re.search(r'<[^>]+\bid="'+re.escape(id_)+r'"[^>]*>',html);return m.group(0) if m else ''
    def has_class(id_,cls):return bool(re.search(r'\b'+re.escape(cls)+r'\b',tag(id_)))
    rec('raw_brand_trimmed','>RAW BRAND</span>' in html)
    rec('raw_nav_label_trimmed','>RAW SKILLS</a>' in html)
    rec('raw_section_title_trimmed','>RAW SK TITLE</h2>' in html)
    rec('raw_footer_trimmed','>RAW FOOTER</div>' in html)
    rec('raw_midnight_class',has_class('csPortfolioApp','cs-portfolio-theme-midnight'),tag('csPortfolioApp'))
    rec('raw_purple_class_removed',not has_class('csPortfolioApp','cs-portfolio-theme-purple-gold'),tag('csPortfolioApp'))
    rec('raw_spacious_class',has_class('csPortfolioApp','cs-portfolio-layout-spacious'),tag('csPortfolioApp'))
    rec('raw_navigation_hidden',has_class('csPortfolioNav','cs-mode-hidden'),tag('csPortfolioNav'))
    rec('raw_mobile_toggle_hidden',has_class('portfolioNavToggle','cs-mode-hidden'),tag('portfolioNavToggle'))
    rec('raw_hero_hidden',has_class('csPortfolioHero','cs-mode-hidden'),tag('csPortfolioHero'))
    rec('raw_profile_hidden',has_class('csPortfolioProfileCard','cs-mode-hidden'),tag('csPortfolioProfileCard'))
    rec('raw_profile_layout_class',has_class('csPortfolioApp','cs-portfolio-profile-hidden'),tag('csPortfolioApp'))
    rec('raw_skills_hidden',has_class('csPortfolioSkills','cs-mode-hidden'),tag('csPortfolioSkills'))
    rec('raw_projects_visible',not has_class('csPortfolioProjects','cs-mode-hidden'),tag('csPortfolioProjects'))
    rec('raw_timeline_hidden',has_class('csPortfolioTimeline','cs-mode-hidden'),tag('csPortfolioTimeline'))
    rec('raw_contact_hidden',has_class('csPortfolioContact','cs-mode-hidden'),tag('csPortfolioContact'))
    rec('raw_nav_links_follow_navigation',has_class('csPortfolioNavProjects','cs-mode-hidden'),tag('csPortfolioNavProjects'))
failed=[r for r in results if not r['passed']]
out=ROOT/'docs/PORTFOLIO_SETTINGS_GENERATOR_AUDIT.json'
out.write_text(json.dumps({'group':'Portfolio Settings Build-time Synchronization','targeted_checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'results':results},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'checks':len(results),'passed':len(results)-len(failed),'failed':len(failed),'failed_tests':[r['test'] for r in failed]},indent=2))
raise SystemExit(1 if failed else 0)
