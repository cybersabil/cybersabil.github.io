import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { FILE_POLICIES, EDITABLE_PATHS, MAX_FILES_PER_COMMIT } from '../../worker-admin1/src/file-policies.js';

const require=createRequire(import.meta.url);
const model=require('../../admin1/data-model.js');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const schema=JSON.parse(fs.readFileSync(path.join(ROOT,'admin1/schema.generated.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'admin1/full-audit-manifest.json'),'utf8'));
const fields=schema.fields;
const assert=(v,m)=>{if(!v) throw new Error(m)};
const load=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const byPath=p=>fields.filter(f=>f.jsonPath===p);

assert(EDITABLE_PATHS.length===21,'policy path count !=21');
assert(MAX_FILES_PER_COMMIT===21,'atomic max !=21');
assert(new Set(EDITABLE_PATHS).size===21,'duplicate policies');
assert(JSON.stringify([...EDITABLE_PATHS].sort())===JSON.stringify([...manifest.editablePaths].sort()),'policy/manifest path mismatch');

function alternate(field,value){
  if(field.type==='select'){
    const vals=(field.options?.values||[]).map(v=>typeof v==='object'?v.name:v);
    return vals.find(v=>v!==value) ?? value;
  }
  if(field.type==='number'){
    const step=field.step ?? 1;
    let next=(typeof value==='number'?value:0)+step;
    if(field.max!=null && next>field.max) next=(field.min!=null?field.min:value-step);
    if(field.min!=null && next<field.min) next=field.min;
    return next;
  }
  if(field.type==='image') return 'media/audit-test-image.png';
  if(field.type==='text') return `${value??''} AUDIT`;
  return `${value??''} AUDIT`;
}

let objectFields=0;
for(const p of manifest.objectPaths){
  const original=load(p);
  assert(model.isPlainObject(original),`${p} not object`);
  const policy=FILE_POLICIES[p];
  assert(policy?.kind==='object',`${p} policy kind`);
  const known=byPath(p);
  const visible=known.filter(f=>!f.hidden&&!f.readonly);
  for(const f of visible){
    const draft=model.clone(original);
    draft.__futurePagesCmsKey={keep:true};
    const next=alternate(f,draft[f.name]);
    draft[f.name]=next;
    const diff=model.objectDiff(original,draft,known);
    assert(diff.some(x=>x.field===f.name),`${f.id} diff missing`);
    assert(draft.__futurePagesCmsKey.keep===true,`${p} unknown key lost`);
    // restore exact value
    draft[f.name]=original[f.name];
    delete draft.__futurePagesCmsKey;
    assert(model.equal(draft,original),`${f.id} restore failed`);
    objectFields++;
  }
}
assert(objectFields===359,`object editable fields ${objectFields} !=359`);

let listFields=0, listFiles=0;
for(const p of manifest.listPaths){
  const original=load(p);
  const allFields=byPath(p);
  const visible=allFields.filter(f=>!f.hidden&&!f.readonly);
  assert(FILE_POLICIES[p]?.kind==='list',`${p} list policy missing`);
  const validation=model.validateList(original,allFields);
  assert(validation.valid,`${p} baseline invalid: ${validation.errors.join(';')}`);
  assert(original.length>0,`${p} empty baseline unsupported`);
  const baselineIds=original.map(x=>x._cmsResetId);
  assert(baselineIds.every(model.validUuid),`${p} invalid baseline ID`);
  assert(new Set(baselineIds).size===baselineIds.length,`${p} duplicate baseline ID`);
  const id=original[0]._cmsResetId;
  for(const f of visible){
    const nextValue=alternate(f,original[0][f.name]);
    let draft=model.setListField(original,id,f.name,nextValue);
    draft[0].__futurePagesCmsKey='preserve';
    const diff=model.listDiff(original,draft,allFields);
    assert(diff.changed.some(x=>x.id===id&&x.field===f.name),`${f.id} list diff missing`);
    assert(draft[0]._cmsResetId===id,`${f.id} identity changed`);
    assert(draft[0].__futurePagesCmsKey==='preserve',`${f.id} unknown key lost`);
    listFields++;
  }
  const newItem=model.createListItem(allFields,()=>`12345678-1234-4234-8234-${String(listFiles+1).padStart(12,'0')}`);
  assert(model.validUuid(newItem._cmsResetId),`${p} generated ID invalid`);
  let draft=[...model.clone(original),newItem];
  assert(model.listDiff(original,draft,allFields).added.length===1,`${p} add diff failed`);
  const beforeMoveIndex=draft.findIndex(x=>x._cmsResetId===newItem._cmsResetId);
  draft=model.moveItem(draft,newItem._cmsResetId,'up');
  const afterMoveIndex=draft.findIndex(x=>x._cmsResetId===newItem._cmsResetId);
  assert(afterMoveIndex===beforeMoveIndex-1,`${p} move operation failed`);
  draft=model.deleteItem(draft,newItem._cmsResetId);
  assert(model.equal(draft,original),`${p} add/move/delete roundtrip failed`);
  // Missing and duplicate identity recovery never mutates source.
  const broken=model.clone(original);
  broken[0]._cmsResetId='bad';
  if(broken.length>1) broken[1]._cmsResetId=broken[0]._cmsResetId;
  const repaired=model.normalizeListIdentities(broken);
  assert(repaired.repairs.length>=1,`${p} identity repair missing`);
  assert(model.validateList(repaired.list,allFields).valid,`${p} repaired list invalid`);
  assert(original[0]._cmsResetId===id,`${p} source mutated`);
  listFiles++;
}
assert(listFiles===10,`list files ${listFiles} !=10`);
assert(listFields===54,`list visible fields ${listFields} !=54`);

console.log('AUDIT PASS 2A - 359 object controls mutate/diff/restore: PASS');
console.log('AUDIT PASS 2B - 10 list editors / 54 card fields add-edit-delete-reorder: PASS');
console.log('AUDIT PASS 2C - unknown keys and stable UUID identities preserved: PASS');
console.log('AUDIT PASS 2D - exact 21-file atomic policy ownership: PASS');
console.log('FULL DATA MODEL COLLISION AUDIT: PASS');
