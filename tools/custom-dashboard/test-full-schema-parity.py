#!/usr/bin/env python3
from pathlib import Path
import json, yaml, re, sys
from collections import Counter

ROOT=Path(__file__).resolve().parents[2]
SCHEMA=json.loads((ROOT/'admin1/schema.generated.json').read_text(encoding='utf-8-sig'))
FIELDS=SCHEMA['fields']; EDITORS=SCHEMA['editors']; CATEGORIES=SCHEMA['categories']
PAGES=yaml.safe_load((ROOT/'.pages.yml').read_text(encoding='utf-8-sig'))
RESET=json.loads((ROOT/'.github/cms-defaults/reset-map.json').read_text(encoding='utf-8-sig'))
MANIFEST=json.loads((ROOT/'admin1/full-audit-manifest.json').read_text(encoding='utf-8-sig'))
UUID=re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',re.I)

def req(x,msg):
    if not x: raise AssertionError(msg)

def flatten(items):
    out=[]
    for item in items:
        if item.get('type')=='group': out += flatten(item.get('items',[]))
        elif item.get('type')=='file': out.append(item)
    return out

pages_editors=flatten(PAGES['content'])
req(len(pages_editors)==22,f'Pages editors {len(pages_editors)} !=22')
by_name={e['name']:e for e in pages_editors}
req(set(by_name)=={e['name'] for e in EDITORS},'Editor name parity failed')

field_by_id={f['id']:f for f in FIELDS}
req(len(FIELDS)==428,'Schema field count !=428')
req(len(field_by_id)==428,'Duplicate schema field IDs')

for editor in EDITORS:
    pe=by_name[editor['name']]
    req(pe['path']==editor['jsonPath'],f"{editor['name']} path mismatch")
    is_list=pe.get('list',False) is not False or pe.get('type')=='list'
    # Pages CMS represents list files with list:true and fields are item fields.
    req(bool(pe.get('list'))==bool(editor['listEditor']),f"{editor['name']} list kind mismatch")
    pfields=pe.get('fields',[])
    sfields=[field_by_id[x] for x in editor['fieldIds']]
    req(len(pfields)==len(sfields),f"{editor['name']} field count mismatch")
    for pf,sf in zip(pfields,sfields):
        for key in ('name','label','type'):
            req(pf.get(key)==sf.get(key),f"{editor['name']}.{sf['name']} {key} mismatch")
        req(bool(pf.get('hidden',False))==bool(sf['hidden']),f"{sf['id']} hidden mismatch")
        req(bool(pf.get('readonly',False))==bool(sf['readonly']),f"{sf['id']} readonly mismatch")
        req(bool(pf.get('required',False))==bool(sf['required']),f"{sf['id']} required mismatch")
        pvals=(pf.get('options') or {}).get('values',[])
        svals=(sf.get('options') or {}).get('values',[])
        def norm(vals): return [(v.get('name'),v.get('label')) if isinstance(v,dict) else (v,v) for v in vals]
        req(norm(pvals)==norm(svals),f"{sf['id']} select values mismatch")

editable=set(MANIFEST['editableCategories'])
req(editable=={'site-gateway','website','portfolio','seo','navigation'},'Editable category set wrong')
req(MANIFEST['mappedFields']==427,'Audited mapped count wrong')
req(MANIFEST['editableControls']==413,'Editable controls count wrong')
req([c['id'] for c in CATEGORIES if c['id'] not in editable]==['system'],'Only system must remain locked')

reset_files=RESET['files']
for editor in EDITORS:
    path=editor['jsonPath']; fields=[field_by_id[x] for x in editor['fieldIds']]
    current=json.loads((ROOT/path).read_text(encoding='utf-8-sig'))
    default=json.loads((ROOT/'.github/cms-defaults'/path).read_text(encoding='utf-8-sig'))
    req(path in reset_files,f'{path} missing reset map')
    rm=reset_files[path]
    req(rm['editor']==editor['name'],f'{path} reset editor mismatch')
    req(rm['kind']==('list' if editor['listEditor'] else 'object'),f'{path} reset kind mismatch')
    visible=[f['name'] for f in fields if not f['hidden']]
    req(rm['fields']==visible,f'{path} reset field order mismatch')
    if editor['listEditor']:
        for label,data in [('current',current),('default',default)]:
            req(isinstance(data,list),f'{path} {label} not list')
            ids=[]
            for i,item in enumerate(data):
                req(isinstance(item,dict),f'{path} {label} item {i} not object')
                rid=item.get('_cmsResetId')
                req(isinstance(rid,str) and UUID.match(rid),f'{path} {label} item {i} invalid ID')
                ids.append(rid)
                for f in fields:
                    if f['required']: req(f['name'] in item,f'{path} {label} missing required {f["name"]}')
            req(len(ids)==len(set(ids)),f'{path} {label} duplicate IDs')
        req(rm.get('itemIds')==[x['_cmsResetId'] for x in default],f'{path} reset itemIds mismatch')
    else:
        req(isinstance(current,dict) and isinstance(default,dict),f'{path} object kind mismatch')

# Exact path ownership and no duplicates.
paths=[e['jsonPath'] for e in EDITORS]
req(len(paths)==len(set(paths))==22,'Duplicate JSON editor path')
req(set(MANIFEST['editablePaths'])=={e['jsonPath'] for e in EDITORS if e['category'] in editable},'Editable path ownership mismatch')

print('AUDIT PASS 1A - Pages CMS 22/22 editors and 428/428 fields: PASS')
print('AUDIT PASS 1B - Current/default/reset-map parity for all 22 JSON files: PASS')
print('AUDIT PASS 1C - 427 mapped / 413 editable / System-only lock: PASS')
print('FULL SCHEMA PARITY AUDIT: PASS')
