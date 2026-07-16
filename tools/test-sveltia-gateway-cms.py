#!/usr/bin/env python3
import json,yaml,pathlib,sys,re,copy,subprocess,tempfile,shutil
ROOT=pathlib.Path(__file__).resolve().parents[1]
config=yaml.safe_load((ROOT/'admin/config.yml').read_text(encoding='utf-8'))
assert config['backend']['repo']=='cybersabil/cybersabil.github.io'
assert config['backend']['branch']=='main'
assert len(config['singletons'])==3
paths={s['name']:s for s in config['singletons']}
expected={'site_settings':'data/site-settings.json','gateway':'data/gateway.json','gateway_appearance':'data/gateway-appearance.json'}
for name,path in expected.items():
    s=paths[name]; assert s['file']==path and s['format']=='json'
    data=json.loads((ROOT/path).read_text())
    names=[f['name'] for f in s['fields']]
    assert len(names)==len(set(names)),f'duplicate field {name}'
    assert set(names)==set(data),f'coverage mismatch {name}: {set(data)-set(names)} {set(names)-set(data)}'
    for f in s['fields']:
        value=data[f['name']]
        if f['widget']=='select':
            values=[o['value'] if isinstance(o,dict) else o for o in f['options']]
            assert value in values,(name,f['name'],value)
        if f['widget']=='number':
            assert isinstance(value,(int,float)) and not isinstance(value,bool)
            if 'min' in f: assert value>=f['min']
            if 'max' in f: assert value<=f['max']
            if isinstance(value,float): assert f.get('value_type')=='float'
            assert f.get('step',0)>0
# Hidden site settings protect unrelated keys.
site_fields={f['name']:f for f in paths['site_settings']['fields']}
for k in json.loads((ROOT/'data/site-settings.json').read_text()):
    if k not in {'gatewayEnabled','defaultMode','websiteEnabled','portfolioEnabled','showModeSwitch','rememberVisitorChoice','enableUrlModeOverride','allowGatewayCloseWithEscape','escapeFallbackMode'}:
        assert site_fields[k]['widget']=='hidden',k
# Admin boot and reset system.
idx=(ROOT/'admin/index.html').read_text(); boot=(ROOT/'admin/boot.js').read_text()
assert 'nc-root' in idx and '@sveltia/cms@0.171.0' in boot
reset_map=json.loads((ROOT/'.github/cms-defaults/gateway/reset-map.json').read_text())
for alias,m in reset_map['files'].items():
    current=json.loads((ROOT/m['current']).read_text()); default=json.loads((ROOT/m['default']).read_text())
    assert current==default,(alias,'initial defaults differ')
    assert set(m['allowedKeys'])<=set(default)
print('Sveltia Gateway CMS structural audit: PASS')
