#!/usr/bin/env node
const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const MAP=JSON.parse(fs.readFileSync(path.join(ROOT,'.github/cms-defaults/gateway/reset-map.json'),'utf8'));
const raw=String(process.argv[2]||'').trim();
const target=raw.includes(' — ')?raw.split(' — ')[0].trim():raw;
const safeRead=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const safeWrite=(p,v)=>fs.writeFileSync(path.join(ROOT,p),JSON.stringify(v,null,2)+'\n','utf8');
function resetFile(alias){const m=MAP.files[alias];if(!m)throw new Error('Unknown reset file');safeWrite(m.current,safeRead(m.default));}
if(target==='complete'){Object.keys(MAP.files).forEach(resetFile);console.log('Complete Gateway reset applied.');process.exit(0);}
const match=target.match(/^([a-z-]+)\.([A-Za-z0-9_]+)$/);if(!match)throw new Error('Invalid reset target');
const [,alias,key]=match;const m=MAP.files[alias];if(!m||!m.allowedKeys.includes(key))throw new Error('Target is not allowlisted');
if(['__proto__','prototype','constructor'].includes(key))throw new Error('Unsafe key');
const current=safeRead(m.current),defaults=safeRead(m.default);
if(!Object.prototype.hasOwnProperty.call(defaults,key))throw new Error('Default key missing');
current[key]=defaults[key];safeWrite(m.current,current);console.log(`Reset ${alias}.${key}`);
